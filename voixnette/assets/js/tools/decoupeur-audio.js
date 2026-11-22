/* ==========================================================================
   VN-03 — Découpeur & Rognage Audio Visuel sur Forme d'Onde (Fade-In / Out)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const fileInput = document.getElementById('dc-file-input');
    const dropzone = document.getElementById('dc-dropzone');
    const demoBtn = document.getElementById('dc-demo-btn');
    const statusBanner = document.getElementById('dc-status');
    const fileMeta = document.getElementById('dc-file-meta');
    const canvas = document.getElementById('dc-waveform');

    const startSlider = document.getElementById('dc-start');
    const endSlider = document.getElementById('dc-end');
    const fadeInSlider = document.getElementById('dc-fade-in');
    const fadeOutSlider = document.getElementById('dc-fade-out');

    const startVal = document.getElementById('dc-start-val');
    const endVal = document.getElementById('dc-end-val');
    const fadeInVal = document.getElementById('dc-fade-in-val');
    const fadeOutVal = document.getElementById('dc-fade-out-val');
    const selDurationLabel = document.getElementById('dc-selection-duration');

    const playSelBtn = document.getElementById('dc-play-btn');
    const stopSelBtn = document.getElementById('dc-stop-btn');
    const trimBtn = document.getElementById('dc-trim-btn');

    const resultsPanel = document.getElementById('dc-results-panel');
    const kpiStart = document.getElementById('dc-kpi-start');
    const kpiEnd = document.getElementById('dc-kpi-end');
    const kpiDuration = document.getElementById('dc-kpi-duration');
    const kpiFades = document.getElementById('dc-kpi-fades');
    const playerTrimmed = document.getElementById('dc-player-trimmed');
    const downloadBtn = document.getElementById('dc-download-btn');
    const downloadMeta = document.getElementById('dc-download-meta');

    let sourceBuffer = null;
    let sourceName = 'extrait-audio';
    let trimmedBlob = null;
    let trimmedUrl = null;

    let activeSourceNode = null;
    let playStartCtxTime = 0;
    let playOffsetSec = 0;
    let playEndSec = 0;
    let rafId = null;
    let draggingHandle = null;

    function setStatus(msg, type) {
      if (!statusBanner) return;
      statusBanner.textContent = msg;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function stopPlayback() {
      if (activeSourceNode) {
        try { activeSourceNode.stop(); } catch (e) {}
        activeSourceNode = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      redraw(null);
    }

    function getBounds() {
      const dur = sourceBuffer ? sourceBuffer.duration : 16;
      let s = parseFloat(startSlider.value) || 0;
      let e = parseFloat(endSlider.value) || dur;
      if (s < 0) s = 0;
      if (e > dur) e = dur;
      if (e - s < 0.1) {
        if (draggingHandle === 'start') s = Math.max(0, e - 0.1);
        else e = Math.min(dur, s + 0.1);
      }
      return { start: s, end: e, duration: Math.max(0.1, e - s) };
    }

    function syncLabels() {
      const b = getBounds();
      startVal.textContent = UI.formatTimecode(b.start, true);
      endVal.textContent = UI.formatTimecode(b.end, true);
      fadeInVal.textContent = UI.formatNumber(parseFloat(fadeInSlider.value), 1) + ' s';
      fadeOutVal.textContent = UI.formatNumber(parseFloat(fadeOutSlider.value), 1) + ' s';
      if (selDurationLabel) {
        selDurationLabel.textContent = 'Sélection : ' + UI.formatTimecode(b.duration, true) + ' (' + UI.formatNumber(b.duration, 2) + ' s)';
      }
    }

    function redraw(playheadSec) {
      if (!sourceBuffer) return;
      const b = getBounds();
      AudioEngine.drawWaveform(canvas, sourceBuffer, {
        selectionStart: b.start,
        selectionEnd: b.end,
        playheadSec: playheadSec,
        waveColor: '#F3F1EC'
      });
    }

    function loadBuffer(buffer, name) {
      stopPlayback();
      sourceBuffer = buffer;
      sourceName = name.replace(/\.[^/.]+$/, '');
      trimmedBlob = null;
      if (trimmedUrl) {
        URL.revokeObjectURL(trimmedUrl);
        trimmedUrl = null;
      }

      const dur = buffer.duration;
      startSlider.max = dur.toFixed(2);
      endSlider.max = dur.toFixed(2);
      startSlider.step = '0.01';
      endSlider.step = '0.01';

      // Pré-sélectionner une zone parlée cohérente (ex: 10 % à 85 %)
      startSlider.value = (dur * 0.08).toFixed(2);
      endSlider.value = (dur * 0.88).toFixed(2);

      if (fileMeta) {
        fileMeta.textContent =
          name + ' · ' + UI.formatTimecode(dur, true) + ' · ' +
          (buffer.sampleRate / 1000).toFixed(1) + ' kHz';
      }

      if (resultsPanel) resultsPanel.classList.add('hidden');
      if (playSelBtn) playSelBtn.disabled = false;
      if (trimBtn) trimBtn.disabled = false;

      syncLabels();
      redraw(null);
      setStatus('Glissez les poignées rouges sur la forme d’onde ou ajustez les curseurs au centième de seconde.', 'ready');
    }

    async function handleFile(file) {
      if (!file) return;
      setStatus('Décodage de la piste audio...', 'warning');
      try {
        const buf = await AudioEngine.decodeFile(file);
        loadBuffer(buf, file.name);
      } catch (err) {
        setStatus('Format audio non reconnu. Utilisez MP3, WAV, OGG/OPUS ou M4A.', 'error');
      }
    }

    // Interaction directe souris / tactile sur la forme d'onde
    function getPointerTime(clientX) {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * (sourceBuffer ? sourceBuffer.duration : 1);
    }

    if (canvas) {
      canvas.addEventListener('pointerdown', function (e) {
        if (!sourceBuffer) return;
        const t = getPointerTime(e.clientX);
        const b = getBounds();
        const distStart = Math.abs(t - b.start);
        const distEnd = Math.abs(t - b.end);
        draggingHandle = distStart <= distEnd ? 'start' : 'end';
        canvas.setPointerCapture(e.pointerId);
        updateDrag(t);
      });

      canvas.addEventListener('pointermove', function (e) {
        if (!draggingHandle || !sourceBuffer) return;
        updateDrag(getPointerTime(e.clientX));
      });

      canvas.addEventListener('pointerup', function () {
        draggingHandle = null;
      });
    }

    function updateDrag(t) {
      const dur = sourceBuffer.duration;
      const s = parseFloat(startSlider.value);
      const e = parseFloat(endSlider.value);
      if (draggingHandle === 'start') {
        startSlider.value = Math.max(0, Math.min(e - 0.1, t)).toFixed(2);
      } else if (draggingHandle === 'end') {
        endSlider.value = Math.min(dur, Math.max(s + 0.1, t)).toFixed(2);
      }
      syncLabels();
      redraw(null);
    }

    // Pré-écoute en direct de la sélection avec Fade-In / Fade-Out
    function playSelection() {
      if (!sourceBuffer) return;
      stopPlayback();

      const ctx = AudioEngine.getAudioContext();
      const b = getBounds();
      const fadeIn = Math.min(parseFloat(fadeInSlider.value), b.duration * 0.5);
      const fadeOut = Math.min(parseFloat(fadeOutSlider.value), b.duration * 0.5);

      const src = ctx.createBufferSource();
      src.buffer = sourceBuffer;
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      if (fadeIn > 0.01) {
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(1.0, now + fadeIn);
      } else {
        gain.gain.setValueAtTime(1.0, now);
      }

      if (fadeOut > 0.01) {
        gain.gain.setValueAtTime(1.0, now + Math.max(0, b.duration - fadeOut));
        gain.gain.linearRampToValueAtTime(0.001, now + b.duration);
      }

      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now, b.start, b.duration);

      activeSourceNode = src;
      playStartCtxTime = now;
      playOffsetSec = b.start;
      playEndSec = b.end;

      src.onended = function () {
        if (activeSourceNode === src) {
          activeSourceNode = null;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          redraw(null);
        }
      };

      function tick() {
        if (!activeSourceNode) return;
        const elapsed = ctx.currentTime - playStartCtxTime;
        const pos = playOffsetSec + elapsed;
        if (pos <= playEndSec) {
          redraw(pos);
          rafId = requestAnimationFrame(tick);
        } else {
          redraw(null);
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    if (playSelBtn) playSelBtn.addEventListener('click', playSelection);
    if (stopSelBtn) stopSelBtn.addEventListener('click', stopPlayback);

    // Export du rognage en WAV
    if (trimBtn) {
      trimBtn.addEventListener('click', function () {
        if (!sourceBuffer) return;
        stopPlayback();
        const b = getBounds();
        const fIn = parseFloat(fadeInSlider.value);
        const fOut = parseFloat(fadeOutSlider.value);

        const trimmed = AudioEngine.trimBuffer(sourceBuffer, b.start, b.end, fIn, fOut);
        trimmedBlob = AudioEngine.encodeWav(trimmed);
        if (trimmedUrl) URL.revokeObjectURL(trimmedUrl);
        trimmedUrl = URL.createObjectURL(trimmedBlob);

        if (playerTrimmed) playerTrimmed.src = trimmedUrl;
        kpiStart.textContent = UI.formatTimecode(b.start, true);
        kpiEnd.textContent = UI.formatTimecode(b.end, true);
        kpiDuration.textContent = UI.formatTimecode(trimmed.duration, true);
        kpiFades.textContent = UI.formatNumber(fIn, 1) + 's / ' + UI.formatNumber(fOut, 1) + 's';

        if (downloadMeta) {
          downloadMeta.textContent = 'WAV PCM 16-bit · ' + UI.formatBytes(trimmedBlob.size);
        }

        if (resultsPanel) resultsPanel.classList.remove('hidden');
        setStatus('Extrait découpé (' + UI.formatTimecode(trimmed.duration, true) + ') prêt au téléchargement WAV.', 'ready');
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!trimmedBlob) return;
        UI.downloadBlob(trimmedBlob, sourceName + '-extrait.wav');
      });
    }

    [startSlider, endSlider, fadeInSlider, fadeOutSlider].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () {
        const s = parseFloat(startSlider.value);
        const e = parseFloat(endSlider.value);
        if (el === startSlider && s >= e - 0.1) {
          startSlider.value = Math.max(0, e - 0.1).toFixed(2);
        } else if (el === endSlider && e <= s + 0.1) {
          endSlider.value = Math.min(sourceBuffer ? sourceBuffer.duration : 16, s + 0.1).toFixed(2);
        }
        syncLabels();
        redraw(null);
      });
    });

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
        loadBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 'demo-extrait-podcast.wav');
      });
    }

    window.addEventListener('resize', function () { redraw(null); });

    loadBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 'demo-extrait-podcast.wav');
  });
})();
