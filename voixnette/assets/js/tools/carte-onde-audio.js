/* ==========================================================================
   VN-05 — Générateur d'Audiogramme / Carte Waveform HD Partageable
   Zéro dégradé : compositions éditoriales studio haute définition sur Canvas
   ========================================================================== */

(function () {
  'use strict';

  const FORMATS = {
    '1:1': { w: 1080, h: 1080, label: 'Carré 1:1 (1080×1080)' },
    '9:16': { w: 1080, h: 1920, label: 'Story 9:16 (1080×1920)' },
    '16:9': { w: 1920, h: 1080, label: 'Paysage 16:9 (1920×1080)' }
  };

  const THEMES = {
    anthracite: {
      bg: '#111214',
      panel: '#1A1C20',
      border: '#2C3038',
      text: '#F3F1EC',
      muted: '#9DA3AE',
      accent: '#E12D39',
      wavePlayed: '#E12D39',
      waveRest: '#F3F1EC'
    },
    ivoire: {
      bg: '#F3F1EC',
      panel: '#E8E4DA',
      border: '#CFC9BC',
      text: '#111214',
      muted: '#525760',
      accent: '#E12D39',
      wavePlayed: '#E12D39',
      waveRest: '#1A1C20'
    },
    broadcast: {
      bg: '#11161B',
      panel: '#192027',
      border: '#2A3540',
      text: '#F3F1EC',
      muted: '#95A2B0',
      accent: '#22C55E',
      wavePlayed: '#22C55E',
      waveRest: '#D8E0E8'
    },
    ambre: {
      bg: '#161411',
      panel: '#201D18',
      border: '#353027',
      text: '#F3F1EC',
      muted: '#A89F91',
      accent: '#F59E0B',
      wavePlayed: '#F59E0B',
      waveRest: '#EFEAE0'
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const AudioEngine = window.VoixNetteAudio;
    const UI = window.VoixNetteUI;
    if (!AudioEngine || !UI) return;

    const fileInput = document.getElementById('ag-file-input');
    const dropzone = document.getElementById('ag-dropzone');
    const demoBtn = document.getElementById('ag-demo-btn');
    const statusBanner = document.getElementById('ag-status');
    const fileMeta = document.getElementById('ag-file-meta');

    const badgeInput = document.getElementById('ag-badge');
    const titleInput = document.getElementById('ag-title');
    const authorInput = document.getElementById('ag-author');
    const progressSlider = document.getElementById('ag-progress');
    const progressVal = document.getElementById('ag-progress-val');
    const densitySlider = document.getElementById('ag-density');
    const densityVal = document.getElementById('ag-density-val');

    const formatBtns = document.querySelectorAll('[data-ag-format]');
    const themeBtns = document.querySelectorAll('[data-ag-theme]');
    const canvas = document.getElementById('ag-canvas');
    const canvasSpec = document.getElementById('ag-canvas-spec');
    const downloadBtn = document.getElementById('ag-download-btn');

    let sourceBuffer = null;
    let currentFormat = '1:1';
    let currentTheme = 'anthracite';

    function setStatus(msg, type) {
      if (!statusBanner) return;
      statusBanner.textContent = msg;
      statusBanner.className = 'status-banner' + (type ? ' is-' + type : '');
    }

    function wrapText(ctx, text, maxWidth, maxLines) {
      const words = String(text || '').trim().split(/\s+/);
      const lines = [];
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = words[i];
          if (lines.length >= maxLines - 1) {
            // Finir la dernière ligne avec le reste tronqué si nécessaire
            const remaining = words.slice(i).join(' ');
            let clipped = remaining;
            while (ctx.measureText(clipped + '…').width > maxWidth && clipped.length > 4) {
              clipped = clipped.slice(0, -1);
            }
            lines.push(clipped === remaining ? clipped : clipped.trim() + '…');
            return lines;
          }
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    function renderCard() {
      if (!canvas || !sourceBuffer) return;
      const fmt = FORMATS[currentFormat] || FORMATS['1:1'];
      const theme = THEMES[currentTheme] || THEMES.anthracite;

      canvas.width = fmt.w;
      canvas.height = fmt.h;

      const ctx = canvas.getContext('2d');
      const W = fmt.w;
      const H = fmt.h;
      const pad = Math.round(Math.min(W, H) * 0.075);

      // 1. Fond plein uni (zéro dégradé)
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      // 2. Cadre intérieur éditorial 2px
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad * 0.55, pad * 0.55, W - pad * 1.1, H - pad * 1.1);

      // 3. Barre supérieure : Badge REC + Durée
      const topY = pad + 24;
      const badgeText = (badgeInput && badgeInput.value.trim()) || 'EXTRAIT AUDIO · PODCAST';
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(pad + 12, topY - 8, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.muted;
      ctx.font = '600 24px "JetBrains Mono", monospace';
      ctx.fillText(badgeText.toUpperCase(), pad + 34, topY);

      const durLabel = UI.formatTimecode(sourceBuffer.duration, false);
      const durW = ctx.measureText(durLabel).width;
      ctx.fillStyle = theme.text;
      ctx.fillText(durLabel, W - pad - durW, topY);

      // Ligne séparatrice fine
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, topY + 28);
      ctx.lineTo(W - pad, topY + 28);
      ctx.stroke();

      // 4. Titre éditorial principal (aligné à gauche, Space Grotesk)
      const isVertical = currentFormat === '9:16';
      const isWide = currentFormat === '16:9';
      const titleFontSize = isWide ? 72 : isVertical ? 74 : 62;
      const titleText = (titleInput && titleInput.value.trim()) || 'Un son net change la perception de votre message dès les 3 premières secondes.';

      ctx.fillStyle = theme.text;
      ctx.font = '700 ' + titleFontSize + 'px "Space Grotesk", sans-serif';
      const maxTextW = W - pad * 2;
      const lines = wrapText(ctx, titleText, maxTextW, isVertical ? 5 : 4);

      const titleStartY = isVertical ? topY + 180 : topY + 125;
      const lineH = Math.round(titleFontSize * 1.16);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], pad, titleStartY + i * lineH);
      }

      // 5. Boîte Waveform haute densité extraite du vrai AudioBuffer
      const waveBoxH = isVertical ? 420 : isWide ? 280 : 270;
      const waveBoxY = isVertical
        ? Math.round(H * 0.56)
        : Math.max(titleStartY + lines.length * lineH + 44, H - pad - waveBoxH - 120);
      const waveBoxW = W - pad * 2;

      ctx.fillStyle = theme.panel;
      ctx.fillRect(pad, waveBoxY, waveBoxW, waveBoxH);
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, waveBoxY, waveBoxW, waveBoxH);

      // Repère central discret
      const waveMidY = waveBoxY + waveBoxH / 2;
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 24, waveMidY);
      ctx.lineTo(pad + waveBoxW - 24, waveMidY);
      ctx.stroke();

      // Extraction des crêtes réelles du fichier audio
      const mono = AudioEngine.getMonoData(sourceBuffer);
      const barCount = parseInt(densitySlider ? densitySlider.value : '72', 10);
      const progressPct = parseInt(progressSlider ? progressSlider.value : '42', 10) / 100;
      const innerPad = 36;
      const innerW = waveBoxW - innerPad * 2;
      const slotW = innerW / barCount;
      const barW = Math.max(4, Math.floor(slotW * 0.62));
      const samplesPerBar = Math.max(1, Math.floor(mono.length / barCount));

      // Trouver crête globale pour normaliser visuellement la forme d'onde sur la carte
      let globalPeak = 0.05;
      const peaks = new Float32Array(barCount);
      for (let b = 0; b < barCount; b++) {
        const start = b * samplesPerBar;
        const end = Math.min(mono.length, start + samplesPerBar);
        let p = 0;
        const step = Math.max(1, Math.floor((end - start) / 128));
        for (let s = start; s < end; s += step) {
          const v = mono[s] < 0 ? -mono[s] : mono[s];
          if (v > p) p = v;
        }
        peaks[b] = p;
        if (p > globalPeak) globalPeak = p;
      }

      const maxBarH = waveBoxH * 0.74;
      const playedBars = Math.floor(barCount * progressPct);

      for (let b = 0; b < barCount; b++) {
        const norm = peaks[b] / globalPeak;
        const h = Math.max(10, norm * maxBarH);
        const x = pad + innerPad + b * slotW + (slotW - barW) / 2;
        const y = waveMidY - h / 2;
        ctx.fillStyle = b <= playedBars ? theme.wavePlayed : theme.waveRest;
        ctx.fillRect(x, y, barW, h);
      }

      // 6. Barre de temps & Pied éditorial (Auteur + signature discrète)
      const footerY = H - pad - 16;
      const playedSec = sourceBuffer.duration * progressPct;
      const tcText = UI.formatTimecode(playedSec, false) + ' / ' + durLabel;

      const authorText = (authorInput && authorInput.value.trim()) || 'VoixNette Studio · Épisode 12';
      ctx.fillStyle = theme.text;
      ctx.font = '600 30px "DM Sans", sans-serif';
      ctx.fillText(authorText, pad, footerY);

      ctx.fillStyle = theme.muted;
      ctx.font = '600 24px "JetBrains Mono", monospace';
      const tcW = ctx.measureText(tcText).width;
      ctx.fillText(tcText, W - pad - tcW, footerY);

      if (canvasSpec) {
        canvasSpec.textContent = fmt.label + ' · PNG Haute Définition';
      }
    }

    function loadBuffer(buffer, name) {
      sourceBuffer = buffer;
      if (fileMeta) {
        fileMeta.textContent = name + ' · ' + UI.formatTimecode(buffer.duration, false);
      }
      renderCard();
      setStatus('Forme d’onde extraite en HD. Personnalisez le texte, le format et le thème puis exportez en PNG.', 'ready');
    }

    async function handleFile(file) {
      if (!file) return;
      setStatus('Extraction de la forme d’onde...', 'warning');
      try {
        const buf = await AudioEngine.decodeFile(file);
        loadBuffer(buf, file.name);
      } catch (err) {
        setStatus('Fichier audio non lisible. Essayez MP3, WAV, OGG ou M4A.', 'error');
      }
    }

    formatBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        formatBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        currentFormat = btn.getAttribute('data-ag-format');
        renderCard();
      });
    });

    themeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        themeBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        currentTheme = btn.getAttribute('data-ag-theme');
        renderCard();
      });
    });

    [badgeInput, titleInput, authorInput].forEach(function (inp) {
      if (!inp) return;
      inp.addEventListener('input', renderCard);
    });

    if (progressSlider) {
      progressSlider.addEventListener('input', function () {
        if (progressVal) progressVal.textContent = progressSlider.value + ' %';
        renderCard();
      });
    }

    if (densitySlider) {
      densitySlider.addEventListener('input', function () {
        if (densityVal) densityVal.textContent = densitySlider.value + ' barres';
        renderCard();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        const fmtTag = currentFormat.replace(':', 'x');
        UI.exportCanvasToPng(canvas, 'voixnette-audiogramme-' + fmtTag + '.png');
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
        loadBuffer(AudioEngine.generateDemoVoiceBuffer('normal'), 'demo-extrait-podcast.wav');
      });
    }

    // Attendre que les polices Google soient prêtes si disponible pour un rendu net
    const initBuf = AudioEngine.generateDemoVoiceBuffer('normal');
    loadBuffer(initBuf, 'demo-extrait-podcast.wav');
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(renderCard);
    }
  });
})();
