/* ==========================================================================
   VN-06 — Testeur de Micro, Décibelmètre & Qualité Acoustique en Direct
   WebAudio AnalyserNode FFT + VU-mètre hardware + Enregistrement 10 s WAV
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const startMicBtn = document.getElementById('mc-start-btn');
    const simBtn = document.getElementById('mc-sim-btn');
    const stopBtn = document.getElementById('mc-stop-btn');
    const recBtn = document.getElementById('mc-rec-btn');
    const statusBanner = document.getElementById('mc-status');
    const modeMeta = document.getElementById('mc-mode-meta');

    const vuContainer = document.getElementById('mc-vu-segments');
    const dbNowEl = document.getElementById('mc-db-now');
    const dbPeakEl = document.getElementById('mc-db-peak');
    const splEstEl = document.getElementById('mc-spl-est');
    const diagBadgeEl = document.getElementById('mc-diag-badge');
    const diagDescEl = document.getElementById('mc-diag-desc');
    const fftCanvas = document.getElementById('mc-fft-canvas');

    const recProgressEl = document.getElementById('mc-rec-progress');
    const recResultsPanel = document.getElementById('mc-results-panel');
    const recPlayer = document.getElementById('mc-rec-player');
    const recDownloadBtn = document.getElementById('mc-download-btn');
    const recDownloadMeta = document.getElementById('mc-download-meta');

    // Construire les 24 segments du VU-mètre
    const NUM_SEGS = 24;
    const vuSegs = [];
    if (vuContainer) {
      vuContainer.innerHTML = '';
      for (let i = 0; i < NUM_SEGS; i++) {
        const seg = document.createElement('div');
        seg.className = 'vu-seg';
        vuContainer.appendChild(seg);
        vuSegs.push(seg);
      }
    }

    let mediaStream = null;
    let analyser = null;
    let sourceNode = null;
    let rafId = null;
    let isRunning = false;
    let isSimMode = false;
    let simPhase = 0;

    let peakHoldDb = -96;
    let peakDecayTime = 0;
    const recentDbHistory = [];

    // Enregistrement 10 secondes
    let isRecording = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recTimerId = null;
    let recRemaining = 10;
    let recordedWavBlob = null;
    let recordedUrl = null;

    function setStatus(msg, type) {
      if (!statusBanner) return;
      statusBanner.textContent = msg;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function updateVuMeter(dbValue) {
      // Mapper [-60 dBFS .. 0 dBFS] sur [0 .. 24] segments
      const clamped = Math.max(-60, Math.min(0, dbValue));
      const ratio = (clamped + 60) / 60;
      const activeCount = Math.round(ratio * NUM_SEGS);

      for (let i = 0; i < vuSegs.length; i++) {
        const seg = vuSegs[i];
        seg.className = 'vu-seg';
        if (i < activeCount) {
          if (i >= 20) seg.classList.add('is-on-red');
          else if (i >= 15) seg.classList.add('is-on-amber');
          else seg.classList.add('is-on-green');
        }
      }
    }

    function updateRoomDiagnostic(currentDb) {
      recentDbHistory.push(currentDb);
      if (recentDbHistory.length > 90) recentDbHistory.shift();

      // Estimer le plancher de bruit (25e percentile sur ~1,5 s)
      const sorted = recentDbHistory.slice().sort(function (a, b) { return a - b; });
      const floorDb = sorted[Math.floor(sorted.length * 0.25)] || currentDb;

      if (floorDb <= -48) {
        diagBadgeEl.textContent = 'SILENCIEUX · STUDIO';
        diagBadgeEl.className = 'hardware-badge is-green';
        diagDescEl.textContent = 'Plancher de bruit bas (' + UI.formatDb(floorDb) + '). Pièce idéale pour podcast, voix-off ou prise de cours.';
      } else if (floorDb <= -35) {
        diagBadgeEl.textContent = 'CORRECT · VOIX CLAIRE';
        diagBadgeEl.className = 'hardware-badge is-amber';
        diagDescEl.textContent = 'Bruit ambiant modéré (' + UI.formatDb(floorDb) + '). Parlez à 15 cm du micro pour un bon rapport signal/bruit.';
      } else {
        diagBadgeEl.textContent = 'BRUYANT · TRAITEMENT REQUIS';
        diagBadgeEl.className = 'hardware-badge is-rec';
        diagDescEl.textContent = 'Bruit de fond élevé (' + UI.formatDb(floorDb) + '). Fermez les fenêtres, éloignez les ventilateurs ou baissez le gain d’entrée.';
      }
    }

    function drawSpectrum(freqData, sampleRate) {
      if (!fftCanvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = fftCanvas.getBoundingClientRect();
      const width = Math.max(300, Math.floor(rect.width || 800));
      const height = Math.max(160, Math.floor(rect.height || 220));

      if (fftCanvas.width !== width * dpr || fftCanvas.height !== height * dpr) {
        fftCanvas.width = width * dpr;
        fftCanvas.height = height * dpr;
      }

      const ctx = fftCanvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);

      // Fond studio pur
      ctx.fillStyle = '#14161A';
      ctx.fillRect(0, 0, width, height);

      // Grille horizontale
      ctx.strokeStyle = '#22252B';
      ctx.lineWidth = 1;
      for (let g = 1; g < 4; g++) {
        const gy = Math.round((height / 4) * g) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 48 bandes logarithmiques (60 Hz -> 16 kHz)
      const numBars = 48;
      const minFreq = 60;
      const maxFreq = Math.min(16000, sampleRate / 2);
      const binHz = sampleRate / (freqData.length * 2);
      const barGap = 3;
      const barW = Math.max(3, (width - 24 - barGap * (numBars - 1)) / numBars);
      const plotH = height - 34;

      for (let b = 0; b < numBars; b++) {
        const f1 = minFreq * Math.pow(maxFreq / minFreq, b / numBars);
        const f2 = minFreq * Math.pow(maxFreq / minFreq, (b + 1) / numBars);
        const idx1 = Math.max(0, Math.floor(f1 / binHz));
        const idx2 = Math.min(freqData.length - 1, Math.max(idx1, Math.ceil(f2 / binHz)));

        let maxBin = 0;
        for (let k = idx1; k <= idx2; k++) {
          if (freqData[k] > maxBin) maxBin = freqData[k];
        }

        const norm = maxBin / 255;
        const barH = Math.max(2, norm * plotH);
        const x = 12 + b * (barW + barGap);
        const y = plotH - barH + 8;

        if (norm > 0.82) ctx.fillStyle = '#E12D39';
        else if (norm > 0.6) ctx.fillStyle = '#F59E0B';
        else ctx.fillStyle = '#22C55E';

        ctx.fillRect(x, y, barW, barH);
      }

      // Repères fréquentiels en bas
      ctx.fillStyle = '#9DA3AE';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      const markers = [
        { hz: 100, label: '100 Hz' },
        { hz: 300, label: '300 Hz' },
        { hz: 1000, label: '1 kHz' },
        { hz: 4000, label: '4 kHz' },
        { hz: 12000, label: '12 kHz' }
      ];
      for (let m = 0; m < markers.length; m++) {
        const ratio = Math.log(markers[m].hz / minFreq) / Math.log(maxFreq / minFreq);
        const mx = 12 + ratio * (width - 24);
        ctx.fillText(markers[m].label, Math.max(8, Math.min(width - 48, mx - 14)), height - 8);
      }

      ctx.restore();
    }

    function renderIdleSpectrum() {
      const empty = new Uint8Array(512);
      drawSpectrum(empty, 44100);
      updateVuMeter(-60);
    }

    function stopAll() {
      isRunning = false;
      isSimMode = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (isRecording) {
        stopRecording(false);
      }
      if (sourceNode) {
        try { sourceNode.disconnect(); } catch (e) {}
        sourceNode = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(function (t) { t.stop(); });
        mediaStream = null;
      }
      if (stopBtn) stopBtn.disabled = true;
      if (recBtn) recBtn.disabled = true;
      if (modeMeta) modeMeta.textContent = 'EN VEILLE · AUCUN FLUX ACTIF';
      renderIdleSpectrum();
    }

    function runAnalysisLoop() {
      if (!isRunning) return;
      const now = performance.now();
      let rmsDb = -60;
      let freqData;
      let sampleRate = 44100;

      if (isSimMode) {
        simPhase += 0.06;
        // Simuler une voix naturelle + respiration + bruit de pièce léger (~-49 dB)
        const talkingWave = Math.sin(simPhase * 0.45) > -0.15 ? 1 : 0;
        const syllable = talkingWave * (0.5 + 0.5 * Math.sin(simPhase * 2.4)) * (0.7 + 0.3 * Math.cos(simPhase * 1.1));
        rmsDb = talkingWave ? (-30 + syllable * 22 + (Math.random() * 2 - 1)) : (-51 + Math.random() * 2.5);
        freqData = new Uint8Array(512);
        for (let i = 0; i < freqData.length; i++) {
          const f = (i * sampleRate) / (freqData.length * 2);
          let val = 18 + Math.random() * 14;
          if (talkingWave && f >= 110 && f <= 3800) {
            const bell = Math.exp(-Math.pow((Math.log(f) - Math.log(480)) / 1.15, 2));
            val += bell * syllable * 200 + Math.random() * 24;
          }
          freqData[i] = Math.min(255, Math.max(0, Math.round(val)));
        }
      } else if (analyser) {
        const timeBuf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(timeBuf);
        let sumSq = 0;
        for (let i = 0; i < timeBuf.length; i++) {
          sumSq += timeBuf[i] * timeBuf[i];
        }
        const rms = Math.sqrt(sumSq / timeBuf.length);
        rmsDb = AudioEngine.ampToDb(rms);

        freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        sampleRate = analyser.context.sampleRate;
      }

      if (rmsDb > peakHoldDb || now - peakDecayTime > 2000) {
        peakHoldDb = rmsDb;
        peakDecayTime = now;
      }

      // Estimation indicative dB SPL (calibration typique micro bureau : 0 dBFS ≈ 94 dB SPL)
      const splApprox = Math.max(25, Math.min(105, Math.round(rmsDb + 94)));

      dbNowEl.textContent = UI.formatDb(rmsDb);
      dbPeakEl.textContent = UI.formatDb(peakHoldDb);
      splEstEl.textContent = splApprox + ' dB(A)';

      updateVuMeter(rmsDb);
      updateRoomDiagnostic(rmsDb);
      drawSpectrum(freqData, sampleRate);

      rafId = requestAnimationFrame(runAnalysisLoop);
    }

    async function startLiveMic() {
      stopAll();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Accès micro non supporté par ce navigateur. Utilisez le Mode Simulation pour tester la console.', 'error');
        return;
      }

      setStatus('Demande d’autorisation microphone en cours...', 'warning');
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        const ctx = AudioEngine.getAudioContext();
        sourceNode = ctx.createMediaStreamSource(mediaStream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        sourceNode.connect(analyser);

        isRunning = true;
        isSimMode = false;
        peakHoldDb = -96;
        recentDbHistory.length = 0;

        if (stopBtn) stopBtn.disabled = false;
        if (recBtn) recBtn.disabled = false;
        if (modeMeta) modeMeta.textContent = 'MICRO EN DIRECT · ' + (ctx.sampleRate / 1000).toFixed(1) + ' kHz';
        setStatus('Microphone actif en local (aucun flux transmis sur Internet). Parlez puis restez silencieux 2 secondes pour le diagnostic.', 'ready');
        runAnalysisLoop();
      } catch (err) {
        setStatus('Permission microphone refusée ou micro absent. Activez le Mode Simulation ou vérifiez les autorisations du navigateur.', 'error');
      }
    }

    function startSimulation() {
      stopAll();
      isRunning = true;
      isSimMode = true;
      peakHoldDb = -96;
      recentDbHistory.length = 0;

      if (stopBtn) stopBtn.disabled = false;
      if (recBtn) recBtn.disabled = false;
      if (modeMeta) modeMeta.textContent = 'MODE SIMULATION STUDIO · 44.1 kHz';
      setStatus('Mode simulation actif : VU-mètre, spectre FFT et enregistrement 10 s simulés localement.', 'ready');
      runAnalysisLoop();
    }

    function finalizeRecordingBlob(wavBlob, label) {
      recordedWavBlob = wavBlob;
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      recordedUrl = URL.createObjectURL(wavBlob);
      if (recPlayer) recPlayer.src = recordedUrl;
      if (recDownloadMeta) {
        recDownloadMeta.textContent = label + ' · WAV PCM 16-bit · ' + UI.formatBytes(wavBlob.size);
      }
      if (recResultsPanel) recResultsPanel.classList.remove('hidden');
      setStatus('Test d’enregistrement terminé. Réécoutez votre prise ou téléchargez le WAV.', 'ready');
    }

    function stopRecording(finalize) {
      isRecording = false;
      if (recTimerId) {
        clearInterval(recTimerId);
        recTimerId = null;
      }
      if (recBtn) recBtn.textContent = 'Enregistrer 10 s & Réécouter';
      if (recProgressEl) recProgressEl.textContent = '';

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else if (finalize && isSimMode) {
        const simBuf = AudioEngine.trimBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 0, 10, 0.05, 0.1);
        finalizeRecordingBlob(AudioEngine.encodeWav(simBuf), 'Simulation 10,0 s');
      }
    }

    function startRecording10s() {
      if (!isRunning) return;
      if (isRecording) {
        stopRecording(true);
        return;
      }

      isRecording = true;
      recRemaining = 10;
      if (recBtn) recBtn.textContent = 'Arrêter l’enregistrement';
      if (recProgressEl) recProgressEl.textContent = 'REC · 10 s restantes...';

      if (!isSimMode && mediaStream && typeof MediaRecorder !== 'undefined') {
        recordedChunks = [];
        try {
          mediaRecorder = new MediaRecorder(mediaStream);
          mediaRecorder.ondataavailable = function (ev) {
            if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
          };
          mediaRecorder.onstop = async function () {
            if (recordedChunks.length === 0) return;
            const rawBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            try {
              const ctx = AudioEngine.getAudioContext();
              const arr = await rawBlob.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arr.slice(0));
              const wav = AudioEngine.encodeWav(decoded);
              finalizeRecordingBlob(wav, 'Prise micro ' + UI.formatNumber(decoded.duration, 1) + ' s');
            } catch (e) {
              // Secours si le navigateur ne décode pas son propre conteneur
              finalizeRecordingBlob(rawBlob, 'Prise micro brute');
            }
          };
          mediaRecorder.start();
        } catch (err) {
          setStatus('Enregistrement MediaRecorder indisponible sur ce navigateur.', 'error');
          isRecording = false;
          return;
        }
      }

      recTimerId = setInterval(function () {
        recRemaining--;
        if (recRemaining <= 0) {
          stopRecording(true);
        } else if (recProgressEl) {
          recProgressEl.textContent = 'REC · ' + recRemaining + ' s restantes...';
        }
      }, 1000);
    }

    if (startMicBtn) startMicBtn.addEventListener('click', startLiveMic);
    if (simBtn) simBtn.addEventListener('click', startSimulation);
    if (stopBtn) stopBtn.addEventListener('click', stopAll);
    if (recBtn) recBtn.addEventListener('click', startRecording10s);
    if (recDownloadBtn) {
      recDownloadBtn.addEventListener('click', function () {
        if (!recordedWavBlob) return;
        UI.downloadBlob(recordedWavBlob, 'voixnette-test-micro-10s.wav');
      });
    }

    window.addEventListener('resize', function () {
      if (!isRunning) renderIdleSpectrum();
    });

    renderIdleSpectrum();
  });
})();
