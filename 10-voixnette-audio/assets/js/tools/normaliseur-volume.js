/* ==========================================================================
   VN-02 — Normaliseur de Volume & Gain Audio (Anti-Saturation)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const fileInput = document.getElementById('nv-file-input');
    const dropzone = document.getElementById('nv-dropzone');
    const demoBtn = document.getElementById('nv-demo-btn');
    const statusBanner = document.getElementById('nv-status');
    const fileMeta = document.getElementById('nv-file-meta');

    const canvasBefore = document.getElementById('nv-waveform-before');
    const canvasAfter = document.getElementById('nv-waveform-after');

    const peakBeforeEl = document.getElementById('nv-peak-before');
    const rmsBeforeEl = document.getElementById('nv-rms-before');
    const lufsBeforeEl = document.getElementById('nv-lufs-before');
    const crestBeforeEl = document.getElementById('nv-crest-before');

    const presetBtns = document.querySelectorAll('[data-nv-preset]');
    const manualGainSlider = document.getElementById('nv-manual-gain');
    const manualGainVal = document.getElementById('nv-manual-gain-val');
    const limiterToggle = document.getElementById('nv-limiter');

    const processBtn = document.getElementById('nv-process-btn');
    const resultsPanel = document.getElementById('nv-results-panel');

    const kpiGainApplied = document.getElementById('nv-kpi-gain');
    const kpiPeakAfter = document.getElementById('nv-kpi-peak-after');
    const kpiLufsAfter = document.getElementById('nv-kpi-lufs-after');
    const kpiProtected = document.getElementById('nv-kpi-protected');

    const playerOrig = document.getElementById('nv-player-original');
    const playerNorm = document.getElementById('nv-player-normalized');
    const downloadBtn = document.getElementById('nv-download-btn');
    const downloadMeta = document.getElementById('nv-download-meta');

    let sourceBuffer = null;
    let sourceName = 'audio-normalise';
    let currentMode = 'lufs';
    let currentTargetDb = -14;
    let normalizedBlob = null;
    let origUrl = null;
    let normUrl = null;

    function setStatus(msg, type) {
      if (!statusBanner) return;
      statusBanner.textContent = msg;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function revokeUrls() {
      if (origUrl) {
        URL.revokeObjectURL(origUrl);
        origUrl = null;
      }
      if (normUrl) {
        URL.revokeObjectURL(normUrl);
        normUrl = null;
      }
    }

    function updateManualLabel() {
      const val = parseFloat(manualGainSlider.value);
      manualGainVal.textContent = (val > 0 ? '+' : '') + UI.formatNumber(val, 1) + ' dB';
    }

    function loadBuffer(buffer, name) {
      revokeUrls();
      sourceBuffer = buffer;
      sourceName = name.replace(/\.[^/.]+$/, '');
      normalizedBlob = null;

      const stats = AudioEngine.analyzeBuffer(buffer);
      peakBeforeEl.textContent = UI.formatDb(stats.peakDb);
      rmsBeforeEl.textContent = UI.formatDb(stats.rmsDb);
      lufsBeforeEl.textContent = UI.formatNumber(stats.lufsApprox, 1) + ' LUFS';
      crestBeforeEl.textContent = UI.formatNumber(stats.crestFactorDb, 1) + ' dB';

      if (fileMeta) {
        fileMeta.textContent =
          name + ' · ' + UI.formatTimecode(buffer.duration, false) + ' · ' +
          (buffer.sampleRate / 1000).toFixed(1) + ' kHz';
      }

      AudioEngine.drawWaveform(canvasBefore, buffer, { waveColor: '#9DA3AE' });

      const origBlob = AudioEngine.encodeWav(buffer);
      origUrl = URL.createObjectURL(origBlob);
      if (playerOrig) playerOrig.src = origUrl;

      if (resultsPanel) resultsPanel.classList.add('hidden');
      if (processBtn) processBtn.disabled = false;

      setStatus(
        'Analyse terminée : crête actuelle à ' + UI.formatDb(stats.peakDb) +
        ' et sonie estimée à ' + UI.formatNumber(stats.lufsApprox, 1) + ' LUFS. Choisissez une cible puis normalisez.',
        'ready'
      );
    }

    async function handleFile(file) {
      if (!file) return;
      setStatus('Décodage et analyse dBFS / LUFS en cours...', 'warning');
      try {
        const buf = await AudioEngine.decodeFile(file);
        loadBuffer(buf, file.name);
      } catch (err) {
        setStatus('Erreur de décodage : vérifiez que le fichier est un audio valide (MP3, WAV, OGG, M4A).', 'error');
      }
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
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

    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        const buf = AudioEngine.generateDemoVoiceBuffer('quiet');
        loadBuffer(buf, 'demo-voix-faible-volume.wav');
      });
    }

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');

        const preset = btn.getAttribute('data-nv-preset');
        if (preset === 'peak-1') {
          currentMode = 'peak';
          currentTargetDb = -1.0;
        } else if (preset === 'peak-3') {
          currentMode = 'peak';
          currentTargetDb = -3.0;
        } else if (preset === 'lufs-14') {
          currentMode = 'lufs';
          currentTargetDb = -14.0;
        } else if (preset === 'lufs-16') {
          currentMode = 'lufs';
          currentTargetDb = -16.0;
        } else {
          currentMode = 'manual';
        }
      });
    });

    if (manualGainSlider) {
      manualGainSlider.addEventListener('input', function () {
        updateManualLabel();
        presetBtns.forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-nv-preset') === 'manual');
        });
        currentMode = 'manual';
      });
    }

    if (processBtn) {
      processBtn.addEventListener('click', function () {
        if (!sourceBuffer) return;
        setStatus('Normalisation et protection anti-saturation en cours...', 'warning');

        setTimeout(function () {
          const result = AudioEngine.normalizeBuffer(sourceBuffer, {
            mode: currentMode,
            targetDb: currentTargetDb,
            manualGainDb: parseFloat(manualGainSlider.value),
            limiter: limiterToggle ? limiterToggle.checked : true,
            ceilingDb: -0.5
          });

          normalizedBlob = AudioEngine.encodeWav(result.buffer);
          if (normUrl) URL.revokeObjectURL(normUrl);
          normUrl = URL.createObjectURL(normalizedBlob);
          if (playerNorm) playerNorm.src = normUrl;

          kpiGainApplied.textContent = UI.formatDb(result.appliedGainDb);
          kpiPeakAfter.textContent = UI.formatDb(result.afterStats.peakDb);
          kpiLufsAfter.textContent = UI.formatNumber(result.afterStats.lufsApprox, 1) + ' LUFS';
          kpiProtected.textContent = new Intl.NumberFormat('fr-FR').format(result.limitedSamples);

          if (downloadMeta) {
            downloadMeta.textContent = 'WAV PCM 16-bit · ' + UI.formatBytes(normalizedBlob.size);
          }

          if (resultsPanel) {
            resultsPanel.classList.remove('hidden');
            AudioEngine.drawWaveform(canvasAfter, result.buffer, { waveColor: '#22C55E' });
          }

          setStatus(
            'Normalisation réussie : gain appliqué ' + UI.formatDb(result.appliedGainDb) +
            ', nouveau niveau crête à ' + UI.formatDb(result.afterStats.peakDb) + '.',
            'ready'
          );
        }, 30);
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!normalizedBlob) return;
        UI.downloadBlob(normalizedBlob, sourceName + '-normalise.wav');
      });
    }

    window.addEventListener('resize', function () {
      if (sourceBuffer) AudioEngine.drawWaveform(canvasBefore, sourceBuffer, { waveColor: '#9DA3AE' });
    });

    updateManualLabel();
    // Charger la démo faible volume par défaut pour démonstration immédiate
    loadBuffer(AudioEngine.generateDemoVoiceBuffer('quiet'), 'demo-voix-faible-volume.wav');
  });
})();
