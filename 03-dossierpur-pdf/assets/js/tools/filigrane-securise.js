/* ==========================================================================
   Outil 2 — Filigrane Anti-Usurpation d'Identite 100 % Local (PDF, JPG, PNG)
   Incrustation permanente en pixels (Canvas + pdf-lib), zero upload serveur
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  const state = {
    mode: null, // 'image' | 'pdf'
    file: null,
    sourceImage: null,
    pdfDoc: null,
    pageCount: 0,
    currentPage: 1,
    pageBaseCanvas: null,
    text: 'Document exclusivement destine a la location immobiliere - ' + DP.formatDateFR(new Date()),
    opacity: 0.28,
    fontSize: 26,
    angle: -32,
    density: 'standard', // 'low' | 'standard' | 'high'
    color: '#1D4ED8'
  };

  const el = {};

  function bindElements() {
    el.dropzone = document.getElementById('wm-dropzone');
    el.fileInput = document.getElementById('wm-file-input');
    el.sampleImgBtn = document.getElementById('wm-sample-img-btn');
    el.samplePdfBtn = document.getElementById('wm-sample-pdf-btn');
    el.fileInfo = document.getElementById('wm-file-info');
    el.textInput = document.getElementById('wm-text');
    el.presetBtns = document.querySelectorAll('[data-wm-preset]');
    el.opacityRange = document.getElementById('wm-opacity');
    el.opacityVal = document.getElementById('wm-opacity-val');
    el.sizeRange = document.getElementById('wm-size');
    el.sizeVal = document.getElementById('wm-size-val');
    el.angleRange = document.getElementById('wm-angle');
    el.angleVal = document.getElementById('wm-angle-val');
    el.densityBtns = document.querySelectorAll('[data-wm-density]');
    el.colorBtns = document.querySelectorAll('[data-wm-color]');
    el.canvas = document.getElementById('wm-preview-canvas');
    el.canvasEmpty = document.getElementById('wm-preview-empty');
    el.pageNav = document.getElementById('wm-page-nav');
    el.prevPageBtn = document.getElementById('wm-prev-page');
    el.nextPageBtn = document.getElementById('wm-next-page');
    el.pageIndicator = document.getElementById('wm-page-indicator');
    el.statusBox = document.getElementById('wm-status');
    el.downloadPdfBtn = document.getElementById('wm-download-pdf');
    el.downloadPngBtn = document.getElementById('wm-download-png');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setStatus(type, html) {
    if (!el.statusBox) return;
    el.statusBox.className = 'status-banner' + (type ? ' is-' + type : '');
    el.statusBox.innerHTML = html;
    el.statusBox.style.display = 'flex';
  }

  function drawWatermarkLayer(ctx, width, height, opts) {
    const text = (opts.text || '').trim();
    if (!text) return;

    ctx.save();
    ctx.globalAlpha = opts.opacity;
    ctx.fillStyle = opts.color;

    // Echelle proportionnelle a la largeur du document pour garder une lisibilite constante
    const scaleFactor = Math.max(0.65, width / 1000);
    const pxSize = Math.round(opts.fontSize * scaleFactor);
    ctx.font = '700 ' + pxSize + 'px "Space Grotesk", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const densityMap = {
      low: { xPad: 220 * scaleFactor, yStep: 210 * scaleFactor },
      standard: { xPad: 130 * scaleFactor, yStep: 135 * scaleFactor },
      high: { xPad: 75 * scaleFactor, yStep: 86 * scaleFactor }
    };
    const cfg = densityMap[opts.density] || densityMap.standard;
    const stepX = Math.max(textWidth + cfg.xPad, 220 * scaleFactor);
    const stepY = Math.max(pxSize * 2.2, cfg.yStep);

    const rad = (opts.angle * Math.PI) / 180;
    const diag = Math.hypot(width, height);

    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);

    let rowIndex = 0;
    for (let y = -diag; y <= diag; y += stepY) {
      const xOffset = (rowIndex % 2 === 0) ? 0 : stepX / 2;
      for (let x = -diag - stepX; x <= diag + stepX; x += stepX) {
        ctx.fillText(text, x + xOffset, y);
      }
      rowIndex++;
    }

    ctx.restore();
  }

  function renderPreview() {
    if (!state.pageBaseCanvas) return;

    const base = state.pageBaseCanvas;
    el.canvas.width = base.width;
    el.canvas.height = base.height;
    const ctx = el.canvas.getContext('2d');
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.drawImage(base, 0, 0);
    drawWatermarkLayer(ctx, el.canvas.width, el.canvas.height, state);

    el.canvas.style.display = 'block';
    if (el.canvasEmpty) el.canvasEmpty.style.display = 'none';
  }

  async function renderPdfPageToBase(pageNum) {
    if (!state.pdfDoc) return;
    const page = await state.pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.5 });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    state.pageBaseCanvas = c;
    state.currentPage = pageNum;
    updatePageNav();
    renderPreview();
  }

  function updatePageNav() {
    if (!el.pageNav) return;
    if (state.mode === 'pdf' && state.pageCount > 1) {
      el.pageNav.style.display = 'flex';
      el.pageIndicator.textContent = 'Page ' + state.currentPage + ' / ' + state.pageCount;
      el.prevPageBtn.disabled = state.currentPage <= 1;
      el.nextPageBtn.disabled = state.currentPage >= state.pageCount;
    } else {
      el.pageNav.style.display = 'none';
    }
  }

  async function loadFile(file) {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || nameLower.endsWith('.pdf');
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(nameLower);

    if (!isPdf && !isImg) {
      setStatus('error', '<strong>Format non reconnu.</strong> Deposez un fichier PDF, JPG ou PNG.');
      return;
    }

    try {
      setStatus('', 'Chargement securise du document en memoire locale...');
      state.file = file;

      if (isPdf) {
        DP.ensurePdfJsWorker();
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        state.mode = 'pdf';
        state.pdfDoc = pdf;
        state.pageCount = pdf.numPages;
        state.sourceImage = null;
        await renderPdfPageToBase(1);
      } else {
        const imgUrl = URL.createObjectURL(file);
        const img = await new Promise(function (resolve, reject) {
          const image = new Image();
          image.onload = function () { resolve(image); };
          image.onerror = function () { reject(new Error('Image illisible')); };
          image.src = imgUrl;
        });
        URL.revokeObjectURL(imgUrl);

        const c = document.createElement('canvas');
        // Limite raisonnable 2200px pour rester fluide et net
        const maxSide = 2200;
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        c.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);

        state.mode = 'image';
        state.pdfDoc = null;
        state.pageCount = 1;
        state.sourceImage = img;
        state.pageBaseCanvas = c;
        updatePageNav();
        renderPreview();
      }

      el.fileInfo.innerHTML =
        '<div class="file-item">' +
          '<div class="file-item__thumb">' + (isPdf ? 'PDF' : 'IMG') + '</div>' +
          '<div class="file-item__meta">' +
            '<div class="file-item__name">' + escapeHtml(file.name) + '</div>' +
            '<div class="file-item__sub">' +
              '<span class="mono">' + DP.formatBytes(file.size) + '</span>' +
              '<span>•</span>' +
              '<span class="mono">' + (isPdf ? state.pageCount + ' page(s)' : state.pageBaseCanvas.width + '×' + state.pageBaseCanvas.height + ' px') + '</span>' +
              '<span>•</span>' +
              '<span class="badge badge-trust">Filigrane actif en temps reel</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      el.downloadPdfBtn.disabled = false;
      el.downloadPngBtn.disabled = false;
      setStatus('success',
        '<div><strong>Document charge localement.</strong> Ajustez le texte, l\'opacite et la densite ci-dessous : le filigrane est fusionne directement dans l\'image pour empecher sa suppression.</div>'
      );
    } catch (err) {
      setStatus('error', '<strong>Erreur de chargement :</strong> ' + escapeHtml(err.message));
    }
  }

  async function exportWatermarkedPdf() {
    if (!state.file || !window.PDFLib) return;
    el.downloadPdfBtn.disabled = true;
    setStatus('', 'Generation du PDF filigrane en local (fusion definitive des pixels)...');

    try {
      const outPdf = await window.PDFLib.PDFDocument.create();

      if (state.mode === 'pdf' && state.pdfDoc) {
        for (let p = 1; p <= state.pageCount; p++) {
          const page = await state.pdfDoc.getPage(p);
          const baseVp = page.getViewport({ scale: 1 });
          const renderVp = page.getViewport({ scale: 1.75 });
          const c = document.createElement('canvas');
          c.width = Math.round(renderVp.width);
          c.height = Math.round(renderVp.height);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
          drawWatermarkLayer(ctx, c.width, c.height, state);

          const jpgBytes = await new Promise(function (resolve, reject) {
            c.toBlob(function (b) {
              if (!b) return reject(new Error('Export page echoue'));
              b.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
            }, 'image/jpeg', 0.88);
          });
          const embedded = await outPdf.embedJpg(jpgBytes);
          const pdfPage = outPdf.addPage([baseVp.width, baseVp.height]);
          pdfPage.drawImage(embedded, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
        }
      } else if (state.pageBaseCanvas) {
        const c = document.createElement('canvas');
        c.width = state.pageBaseCanvas.width;
        c.height = state.pageBaseCanvas.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(state.pageBaseCanvas, 0, 0);
        drawWatermarkLayer(ctx, c.width, c.height, state);

        const jpgBytes = await new Promise(function (resolve, reject) {
          c.toBlob(function (b) {
            if (!b) return reject(new Error('Export image echoue'));
            b.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
          }, 'image/jpeg', 0.92);
        });
        const embedded = await outPdf.embedJpg(jpgBytes);
        // Ajuste sur A4 en conservant le ratio
        const isLandscape = c.width > c.height;
        const pageW = isLandscape ? 841.89 : 595.28;
        const pageH = isLandscape ? 595.28 : 841.89;
        const margin = 24;
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;
        const fit = Math.min(availW / c.width, availH / c.height);
        const drawW = c.width * fit;
        const drawH = c.height * fit;

        const pdfPage = outPdf.addPage([pageW, pageH]);
        pdfPage.drawImage(embedded, {
          x: (pageW - drawW) / 2,
          y: (pageH - drawH) / 2,
          width: drawW,
          height: drawH
        });
      }

      const pdfBytes = await outPdf.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const filename = DP.sanitizeFilename(state.file.name) + '-filigrane.pdf';
      DP.downloadBlob(blob, filename);

      setStatus('success',
        '<div><strong>PDF filigrane telecharge (' + DP.formatBytes(blob.size) + ').</strong> Le filigrane a ete integre de maniere irreversible sur chaque page, sans aucun envoi reseau.</div>'
      );
    } catch (err) {
      setStatus('error', '<strong>Erreur export PDF :</strong> ' + escapeHtml(err.message));
    } finally {
      el.downloadPdfBtn.disabled = false;
    }
  }

  async function exportWatermarkedPng() {
    if (!state.pageBaseCanvas || !state.file) return;
    try {
      const suffix = state.mode === 'pdf' ? '-page-' + state.currentPage : '';
      const filename = DP.sanitizeFilename(state.file.name) + suffix + '-filigrane.png';
      await DP.exportCanvasPNG(el.canvas, filename);
      setStatus('success', '<div><strong>Image PNG filigranee telechargee</strong> (' + escapeHtml(filename) + ').</div>');
    } catch (err) {
      setStatus('error', '<strong>Erreur export PNG :</strong> ' + escapeHtml(err.message));
    }
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    const today = DP.formatDateFR(new Date());
    el.textInput.value = 'Document exclusivement destine a la location immobiliere - ' + today;
    state.text = el.textInput.value;

    // Presets texte
    el.presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        const tpl = btn.dataset.wmPreset.replace('[DATE]', today);
        el.textInput.value = tpl;
        state.text = tpl;
        renderPreview();
      });
    });

    el.textInput.addEventListener('input', function () {
      state.text = el.textInput.value;
      renderPreview();
    });

    el.opacityRange.addEventListener('input', function () {
      const pct = parseInt(el.opacityRange.value, 10);
      state.opacity = pct / 100;
      el.opacityVal.textContent = pct + ' %';
      renderPreview();
    });

    el.sizeRange.addEventListener('input', function () {
      const px = parseInt(el.sizeRange.value, 10);
      state.fontSize = px;
      el.sizeVal.textContent = px + ' px';
      renderPreview();
    });

    el.angleRange.addEventListener('input', function () {
      const deg = parseInt(el.angleRange.value, 10);
      state.angle = deg;
      el.angleVal.textContent = deg + '°';
      renderPreview();
    });

    el.densityBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.densityBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.density = btn.dataset.wmDensity;
        renderPreview();
      });
    });

    el.colorBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.colorBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.color = btn.dataset.wmColor;
        renderPreview();
      });
    });

    // Dropzone
    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files[0]) loadFile(el.fileInput.files[0]);
    });
    el.dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      el.dropzone.classList.add('is-dragover');
    });
    el.dropzone.addEventListener('dragleave', function () {
      el.dropzone.classList.remove('is-dragover');
    });
    el.dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      el.dropzone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });

    // Boutons exemples locaux
    el.sampleImgBtn.addEventListener('click', async function () {
      el.sampleImgBtn.disabled = true;
      try {
        const f = await DP.samples.createSampleIdentityImage();
        await loadFile(f);
      } finally {
        el.sampleImgBtn.disabled = false;
      }
    });

    if (el.samplePdfBtn) {
      el.samplePdfBtn.addEventListener('click', async function () {
        el.samplePdfBtn.disabled = true;
        try {
          const f = await DP.samples.createSampleHeavyPdf(2);
          await loadFile(f);
        } finally {
          el.samplePdfBtn.disabled = false;
        }
      });
    }

    // Navigation pages PDF
    el.prevPageBtn.addEventListener('click', function () {
      if (state.currentPage > 1) renderPdfPageToBase(state.currentPage - 1);
    });
    el.nextPageBtn.addEventListener('click', function () {
      if (state.currentPage < state.pageCount) renderPdfPageToBase(state.currentPage + 1);
    });

    el.downloadPdfBtn.addEventListener('click', exportWatermarkedPdf);
    el.downloadPngBtn.addEventListener('click', exportWatermarkedPng);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
