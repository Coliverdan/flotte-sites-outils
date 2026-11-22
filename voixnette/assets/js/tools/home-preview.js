/* ==========================================================================
   VOIXNETTE — Banc d'Essai Interactif Hero (Page d'Accueil)
   Aperçu temps réel WebAudio du Coupe-Silence VN-01 sur piste démo locale
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const canvas = document.getElementById('hero-demo-canvas');
    const slider = document.getElementById('hero-gate-slider');
    const gateVal = document.getElementById('hero-gate-val');
    const statOrig = document.getElementById('hero-stat-orig');
    const statClean = document.getElementById('hero-stat-clean');
    const statSaved = document.getElementById('hero-stat-saved');
    const playOrigBtn = document.getElementById('hero-play-orig');
    const playCleanBtn = document.getElementById('hero-play-clean');
    const stopBtn = document.getElementById('hero-stop-btn');

    if (!canvas || !slider) return;

    const demoBuffer = AudioEngine.generateDemoVoiceBuffer('normal');
    let lastDetection = null;
    let activeSrc = null;

    function stopAudio() {
      if (activeSrc) {
        try { activeSrc.stop(); } catch (e) {}
        activeSrc = null;
      }
    }

    function updatePreview() {
      const th = parseFloat(slider.value);
      gateVal.textContent = th + ' dB';
      lastDetection = AudioEngine.detectSilences(demoBuffer, th, 0.45, 70);

      AudioEngine.drawWaveform(canvas, demoBuffer, {
        silenceRegions: lastDetection.silenceRegions,
        thresholdDb: th,
        waveColor: '#F3F1EC'
      });

      statOrig.textContent = UI.formatDurationCompact(lastDetection.originalDuration);
      statClean.textContent = UI.formatDurationCompact(lastDetection.keptDuration);
      statSaved.textContent = '-' + UI.formatNumber(lastDetection.savedPercent, 0) + ' %';
    }

    function playBuf(buf) {
      stopAudio();
      const ctx = AudioEngine.getAudioContext();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      activeSrc = src;
      src.onended = function () {
        if (activeSrc === src) activeSrc = null;
      };
    }

    slider.addEventListener('input', updatePreview);

    if (playOrigBtn) {
      playOrigBtn.addEventListener('click', function () {
        playBuf(demoBuffer);
      });
    }

    if (playCleanBtn) {
      playCleanBtn.addEventListener('click', function () {
        if (!lastDetection) updatePreview();
        const cleaned = AudioEngine.removeSilences(demoBuffer, lastDetection.keepRegions);
        playBuf(cleaned);
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', stopAudio);
    }

    window.addEventListener('resize', updatePreview);
    updatePreview();
  });
})();
