/* ==========================================================================
   VN-01 — Coupe-Silence Automatique pour Notes Vocales & Cours
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const fileInput = document.getElementById('cs-file-input');
    const dropzone = document.getElementById('cs-dropzone');
    const demoBtn = document.getElementById('cs-demo-btn');
    const statusBanner = document.getElementById('cs-status');
    const fileMeta = document.getElementById('cs-file-meta');

    const canvasOriginal = document.getElementById('cs-waveform-original');
    const canvasCleaned = document.getElementById('cs-waveform-cleaned');

    const thresholdSlider = document.getElementById('cs-threshold');
    const minDurSlider = document.getElementById('cs-min-duration');
    const paddingSlider = document.getElementById('cs-padding');

    const thresholdVal = document.getElementById('cs-threshold-val');
    const minDurVal = document.getElementById('cs-min-duration-val');
    const paddingVal = document.getElementById('cs-padding-val');

    const previewStats = document.getElementById('cs-preview-stats');
    const processBtn = document.getElementById('cs-process-btn');
    const resetBtn = document.getElementById('cs-reset-btn');

    const resultsPanel = document.getElementById('cs-results-panel');
    const kpiInitial = document.getElementById('cs-kpi-initial');
    const kpiCleaned = document.getElementById('cs-kpi-cleaned');
    const kpiSaved = document.getElementById('cs-kpi-saved');
    const kpiCount = document.getElementById('cs-kpi-count');

    const playerOriginal = document.getElementById('cs-player-original');
    const playerCleaned = document.getElementById('cs-player-cleaned');
    const downloadBtn = document.getElementById('cs-download-btn');
    const downloadMeta = document.getElementById('cs-download-meta');

    let sourceBuffer = null;
    let sourceName = 'note-vocale';
    let lastDetection = null;
    let cleanedBlob = null;
    let origUrl = null;
    let cleanedUrl = null;

    function setStatus(message, type) {
      if (!statusBanner) return;
      statusBanner.textContent = message;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function revokeUrls() {
      if (origUrl) {
        URL.revokeObjectURL(origUrl);
        origUrl = null;
      }
      if (cleanedUrl) {
        URL.revokeObjectURL(cleanedUrl);
        cleanedUrl = null;
      }
    }

    function updateControlLabels() {
      thresholdVal.textContent = thresholdSlider.value + ' dB';
      minDurVal.textContent = UI.formatNumber(parseFloat(minDurSlider.value), 2) + ' s';
      paddingVal.textContent = paddingSlider.value + ' ms';
    }

    function analyzeAndPreview() {
      if (!sourceBuffer) return;
      const thresholdDb = parseFloat(thresholdSlider.value);
      const minSilenceSec = parseFloat(minDurSlider.value);
      const paddingMs = parseInt(paddingSlider.value, 10);

      lastDetection = AudioEngine.detectSilences(sourceBuffer, thresholdDb, minSilenceSec, paddingMs);

      AudioEngine.drawWaveform(canvasOriginal, sourceBuffer, {
        silenceRegions: lastDetection.silenceRegions,
        thresholdDb: thresholdDb,
        waveColor: '#F3F1EC'
      });

      previewStats.textContent =
        lastDetection.silenceCount + ' silence(s) détecté(s) · Gain estimé : -' +
        UI.formatNumber(lastDetection.savedPercent, 0) + ' % (' +
        UI.formatDurationCompact(lastDetection.originalDuration) + ' → ' +
        UI.formatDurationCompact(lastDetection.keptDuration) + ')';
    }

    function loadAudioBuffer(buffer, name) {
      revokeUrls();
      sourceBuffer = buffer;
      sourceName = name.replace(/\.[^/.]+$/, '');
      cleanedBlob = null;

      if (resultsPanel) resultsPanel.classList.add('hidden');
      if (processBtn) processBtn.disabled = false;
      if (resetBtn) resetBtn.disabled = false;

      if (fileMeta) {
        fileMeta.textContent =
          name + ' · ' + UI.formatTimecode(buffer.duration, false) + ' · ' +
          (buffer.sampleRate / 1000).toFixed(1) + ' kHz · ' +
          (buffer.numberOfChannels === 1 ? 'Mono' : 'Stéréo');
      }

      // Préparer lecteur original immédiatement
      const origWav = AudioEngine.encodeWav(buffer);
      origUrl = URL.createObjectURL(origWav);
      if (playerOriginal) playerOriginal.src = origUrl;

      analyzeAndPreview();
      setStatus('Audio décodé localement. Ajustez les faders puis cliquez sur « Supprimer les silences ».', 'ready');
    }

    async function handleFile(file) {
      if (!file) return;
      setStatus('Décodage WebAudio en cours dans votre navigateur...', 'warning');
      try {
        const buffer = await AudioEngine.decodeFile(file);
        loadAudioBuffer(buffer, file.name);
      } catch (err) {
        setStatus('Impossible de décoder ce fichier audio. Essayez un MP3, WAV, OGG/OPUS ou M4A valide.', 'error');
      }
    }

    // Événements import fichier + drag & drop
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) {
          handleFile(fileInput.files[0]);
        }
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          dropzone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          dropzone.classList.remove('is-dragover');
        });
      });
      dropzone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Bouton audio démo synthétisé 1 clic
    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        const demoBuf = AudioEngine.generateDemoVoiceBuffer('normal');
        loadAudioBuffer(demoBuf, 'demo-note-vocale-silences.wav');
      });
    }

    // Mise à jour temps réel des faders
    [thresholdSlider, minDurSlider, paddingSlider].forEach(function (slider) {
      if (!slider) return;
      slider.addEventListener('input', function () {
        updateControlLabels();
        analyzeAndPreview();
      });
    });

    // Traitement réel : suppression des silences & reconstruction WAV
    if (processBtn) {
      processBtn.addEventListener('click', function () {
        if (!sourceBuffer || !lastDetection) return;
        setStatus('Reconstruction de la piste audio nettoyée (micro-fondus 5 ms anti-clic)...', 'warning');

        setTimeout(function () {
          const cleanedBuffer = AudioEngine.removeSilences(sourceBuffer, lastDetection.keepRegions);
          cleanedBlob = AudioEngine.encodeWav(cleanedBuffer);

          if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
          cleanedUrl = URL.createObjectURL(cleanedBlob);
          if (playerCleaned) playerCleaned.src = cleanedUrl;

          const realSavedPct = sourceBuffer.duration > 0
            ? ((sourceBuffer.duration - cleanedBuffer.duration) / sourceBuffer.duration) * 100
            : 0;

          kpiInitial.textContent = UI.formatDurationCompact(sourceBuffer.duration);
          kpiCleaned.textContent = UI.formatDurationCompact(cleanedBuffer.duration);
          kpiSaved.textContent = '-' + UI.formatNumber(Math.max(0, realSavedPct), 0) + ' %';
          kpiCount.textContent = String(lastDetection.silenceCount);

          if (downloadMeta) {
            downloadMeta.textContent = 'WAV PCM 16-bit · ' + UI.formatBytes(cleanedBlob.size);
          }

          if (resultsPanel) {
            resultsPanel.classList.remove('hidden');
            AudioEngine.drawWaveform(canvasCleaned, cleanedBuffer, {
              waveColor: '#22C55E'
            });
          }

          setStatus(
            'Nettoyage terminé : ' + UI.formatDurationCompact(sourceBuffer.duration) + ' → ' +
            UI.formatDurationCompact(cleanedBuffer.duration) + ' (temps gagné : -' +
            UI.formatNumber(Math.max(0, realSavedPct), 0) + ' %).',
            'ready'
          );
        }, 30);
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!cleanedBlob) return;
        UI.downloadBlob(cleanedBlob, sourceName + '-sans-silences.wav');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        thresholdSlider.value = '-34';
        minDurSlider.value = '0.50';
        paddingSlider.value = '80';
        updateControlLabels();
        analyzeAndPreview();
      });
    }

    window.addEventListener('resize', function () {
      if (sourceBuffer) analyzeAndPreview();
    });

    updateControlLabels();
    // Charger automatiquement la démo au premier affichage pour rendre le studio vivant dès l'ouverture
    const initialDemo = AudioEngine.generateDemoVoiceBuffer('normal');
    loadAudioBuffer(initialDemo, 'demo-note-vocale-silences.wav');
  });
})();
