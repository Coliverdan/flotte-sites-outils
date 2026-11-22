/* ==========================================================================
   VN-04 — Accélérateur de Notes Vocales & Cours (0,5× à 3,0×)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const fileInput = document.getElementById('vp-file-input');
    const dropzone = document.getElementById('vp-dropzone');
    const demoBtn = document.getElementById('vp-demo-btn');
    const statusBanner = document.getElementById('vp-status');
    const fileMeta = document.getElementById('vp-file-meta');
    const canvas = document.getElementById('vp-waveform');

    const audioEl = document.getElementById('vp-audio-player');
    const rateSlider = document.getElementById('vp-rate-slider');
    const rateVal = document.getElementById('vp-rate-val');
    const pitchToggle = document.getElementById('vp-preserve-pitch');
    const presetBtns = document.querySelectorAll('[data-vp-rate]');

    const playPauseBtn = document.getElementById('vp-play-btn');
    const back5Btn = document.getElementById('vp-back-5');
    const fwd5Btn = document.getElementById('vp-fwd-5');
    const timecodeDisplay = document.getElementById('vp-timecode');

    const kpiOrigDur = document.getElementById('vp-kpi-orig');
    const kpiNewDur = document.getElementById('vp-kpi-new');
    const kpiSaved = document.getElementById('vp-kpi-saved');
    const kpiRate = document.getElementById('vp-kpi-rate');

    const exportBtn = document.getElementById('vp-export-btn');
    const exportStatus = document.getElementById('vp-export-status');

    let sourceBuffer = null;
    let sourceName = 'cours-audio';
    let sourceUrl = null;
    let rafId = null;

    function setStatus(msg, type) {
      if (!statusBanner) return;
      statusBanner.textContent = msg;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function applyPlaybackRate() {
      const rate = parseFloat(rateSlider.value) || 1.0;
      rateVal.textContent = UI.formatNumber(rate, 2) + '×';
      kpiRate.textContent = UI.formatNumber(rate, 2) + '×';

      if (audioEl) {
        audioEl.playbackRate = rate;
        const preserve = pitchToggle ? pitchToggle.checked : true;
        if ('preservesPitch' in audioEl) audioEl.preservesPitch = preserve;
        else if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = preserve;
        else if ('webkitPreservesPitch' in audioEl) audioEl.webkitPreservesPitch = preserve;
      }

      presetBtns.forEach(function (btn) {
        const r = parseFloat(btn.getAttribute('data-vp-rate'));
        btn.classList.toggle('is-active', Math.abs(r - rate) < 0.01);
      });

      if (sourceBuffer) {
        const origDur = sourceBuffer.duration;
        const effDur = origDur / rate;
        const diff = origDur - effDur;
        kpiOrigDur.textContent = UI.formatDurationCompact(origDur);
        kpiNewDur.textContent = UI.formatDurationCompact(effDur);
        if (diff >= 0) {
          kpiSaved.textContent = '-' + UI.formatDurationCompact(diff);
        } else {
          kpiSaved.textContent = '+' + UI.formatDurationCompact(-diff);
        }
      }
    }

    function drawPlayhead() {
      if (!sourceBuffer) return;
      const cur = audioEl ? audioEl.currentTime : 0;
      AudioEngine.drawWaveform(canvas, sourceBuffer, {
        playheadSec: cur,
        waveColor: '#F3F1EC'
      });
      if (timecodeDisplay) {
        timecodeDisplay.textContent =
          UI.formatTimecode(cur, false) + ' / ' + UI.formatTimecode(sourceBuffer.duration, false);
      }
    }

    function startLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      function tick() {
        drawPlayhead();
        if (audioEl && !audioEl.paused) {
          rafId = requestAnimationFrame(tick);
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    function loadBuffer(buffer, name, originalFile) {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
        sourceUrl = null;
      }
      sourceBuffer = buffer;
      sourceName = name.replace(/\.[^/.]+$/, '');

      if (originalFile) {
        sourceUrl = URL.createObjectURL(originalFile);
      } else {
        const wav = AudioEngine.encodeWav(buffer);
        sourceUrl = URL.createObjectURL(wav);
      }

      if (audioEl) {
        audioEl.src = sourceUrl;
        audioEl.load();
      }

      if (fileMeta) {
        fileMeta.textContent =
          name + ' · ' + UI.formatTimecode(buffer.duration, false) + ' · ' +
          (buffer.sampleRate / 1000).toFixed(1) + ' kHz';
      }

      if (exportBtn) exportBtn.disabled = false;
      applyPlaybackRate();
      drawPlayhead();
      setStatus('Piste prête. Réglez la vitesse (0,5× à 3,0×), cliquez sur la forme d’onde pour naviguer ou exportez en WAV.', 'ready');
    }

    async function handleFile(file) {
      if (!file) return;
      setStatus('Décodage de la piste vocale...', 'warning');
      try {
        const buf = await AudioEngine.decodeFile(file);
        loadBuffer(buf, file.name, file);
      } catch (err) {
        setStatus('Impossible de lire ce fichier audio. Utilisez MP3, WAV, OGG/OPUS ou M4A.', 'error');
      }
    }

    if (rateSlider) {
      rateSlider.addEventListener('input', applyPlaybackRate);
    }

    if (pitchToggle) {
      pitchToggle.addEventListener('change', applyPlaybackRate);
    }

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        rateSlider.value = btn.getAttribute('data-vp-rate');
        applyPlaybackRate();
      });
    });

    if (playPauseBtn && audioEl) {
      playPauseBtn.addEventListener('click', function () {
        if (audioEl.paused) {
          applyPlaybackRate();
          audioEl.play().catch(function () {});
        } else {
          audioEl.pause();
        }
      });

      audioEl.addEventListener('play', function () {
        playPauseBtn.textContent = 'Mettre en pause';
        applyPlaybackRate();
        startLoop();
      });

      audioEl.addEventListener('pause', function () {
        playPauseBtn.textContent = 'Lire la piste';
        drawPlayhead();
      });

      audioEl.addEventListener('ended', function () {
        playPauseBtn.textContent = 'Lire la piste';
        drawPlayhead();
      });

      audioEl.addEventListener('seeked', drawPlayhead);
    }

    if (back5Btn && audioEl) {
      back5Btn.addEventListener('click', function () {
        audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
        drawPlayhead();
      });
    }

    if (fwd5Btn && audioEl) {
      fwd5Btn.addEventListener('click', function () {
        if (!sourceBuffer) return;
        audioEl.currentTime = Math.min(sourceBuffer.duration, audioEl.currentTime + 5);
        drawPlayhead();
      });
    }

    // Clic sur la forme d'onde pour déplacer instantanément la lecture
    if (canvas && audioEl) {
      canvas.addEventListener('click', function (e) {
        if (!sourceBuffer) return;
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioEl.currentTime = ratio * sourceBuffer.duration;
        drawPlayhead();
      });
    }

    // Export WAV ré-échantillonné localement
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        if (!sourceBuffer) return;
        const rate = parseFloat(rateSlider.value) || 1.0;
        if (exportStatus) exportStatus.textContent = 'Ré-échantillonnage local en cours...';

        setTimeout(function () {
          const resampled = AudioEngine.resampleSpeedBuffer(sourceBuffer, rate);
          const wavBlob = AudioEngine.encodeWav(resampled);
          const rateTag = String(rate.toFixed(2)).replace('.', '_') + 'x';
          UI.downloadBlob(wavBlob, sourceName + '-' + rateTag + '.wav');
          if (exportStatus) {
            exportStatus.textContent =
              'WAV généré (' + UI.formatDurationCompact(resampled.duration) + ' · ' + UI.formatBytes(wavBlob.size) + ')';
          }
        }, 30);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('is-dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('is-dragover'); });
      });
      dropzone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        loadBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 'demo-cours-magistral.wav', null);
      });
    }

    window.addEventListener('resize', drawPlayhead);

    loadBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 'demo-cours-magistral.wav', null);
  });
})();
