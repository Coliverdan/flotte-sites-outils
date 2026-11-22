/* ==========================================================================
   Outil 1 — Compresseur PDF a Taille Cible Exacte (ANTS, Parcoursup, CAF)
   100 % Local Navigateur : PDF.js (rendu pages) + pdf-lib (reconstruction PDF)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  const PRESETS = {
    ants: { label: 'ANTS (< 2 Mo)', targetMB: 1.88, officialMB: 2.0 },
    parcoursup: { label: 'Parcoursup (< 2 Mo)', targetMB: 1.88, officialMB: 2.0 },
    caf: { label: 'CAF / Ameli (< 4 Mo)', targetMB: 3.82, officialMB: 4.0 },
    locatif: { label: 'Dossier Locatif (< 5 Mo)', targetMB: 4.8, officialMB: 5.0 }
  };

  let currentFile = null;
  let currentPdfBytes = null;
  let currentPageCount = 0;
  let compressedBlob = null;
  let activePreset = 'ants';
  let targetMB = PRESETS.ants.targetMB;

  const el = {};

  function bindElements() {
    el.dropzone = document.getElementById('compress-dropzone');
    el.fileInput = document.getElementById('compress-file-input');
    el.sampleBtn = document.getElementById('compress-sample-btn');
    el.fileInfo = document.getElementById('compress-file-info');
    el.presetBtns = document.querySelectorAll('[data-compress-preset]');
    el.customInput = document.getElementById('compress-custom-mb');
    el.grayscaleCheck = document.getElementById('compress-grayscale');
    el.runBtn = document.getElementById('compress-run-btn');
    el.progressWrap = document.getElementById('compress-progress-wrap');
    el.progressFill = document.getElementById('compress-progress-fill');
    el.progressText = document.getElementById('compress-progress-text');
    el.statusBox = document.getElementById('compress-status');
    el.resultSection = document.getElementById('compress-result-panel');
    el.metricBefore = document.getElementById('metric-before');
    el.metricAfter = document.getElementById('metric-after');
    el.metricGain = document.getElementById('metric-gain');
    el.metricDetails = document.getElementById('metric-details');
    el.barBefore = document.getElementById('bar-before-fill');
    el.barAfter = document.getElementById('bar-after-fill');
    el.barBeforeLbl = document.getElementById('bar-before-label');
    el.barAfterLbl = document.getElementById('bar-after-label');
    el.previewCanvas = document.getElementById('compress-preview-canvas');
    el.previewEmpty = document.getElementById('compress-preview-empty');
    el.downloadBtn = document.getElementById('compress-download-btn');
  }

  function setStatus(type, html) {
    if (!el.statusBox) return;
    el.statusBox.className = 'status-banner' + (type ? ' is-' + type : '');
    el.statusBox.innerHTML = html;
    el.statusBox.style.display = 'flex';
  }

  function setProgress(pct, label) {
    if (!el.progressWrap) return;
    el.progressWrap.style.display = 'block';
    el.progressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    el.progressText.textContent = label || '';
  }

  function hideProgress() {
    if (el.progressWrap) el.progressWrap.style.display = 'none';
  }

  async function loadPdfFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('error', '<strong>Format non supporte</strong> : veuillez selectionner un fichier PDF (.pdf).');
      return;
    }

    try {
      setStatus('', 'Lecture locale du document en cours...');
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      DP.ensurePdfJsWorker();

      const loadingTask = window.pdfjsLib.getDocument({ data: bytes.slice() });
      const pdf = await loadingTask.promise;

      currentFile = file;
      currentPdfBytes = bytes;
      currentPageCount = pdf.numPages;
      compressedBlob = null;

      el.fileInfo.innerHTML =
        '<div class="file-item">' +
          '<div class="file-item__thumb">PDF</div>' +
          '<div class="file-item__meta">' +
            '<div class="file-item__name">' + escapeHtml(file.name) + '</div>' +
            '<div class="file-item__sub">' +
              '<span class="mono">' + DP.formatBytes(file.size) + '</span>' +
              '<span>•</span>' +
              '<span class="mono">' + currentPageCount + ' page' + (currentPageCount > 1 ? 's' : '') + '</span>' +
              '<span>•</span>' +
              '<span class="badge badge-trust">Charge en RAM locale</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      el.runBtn.disabled = false;
      el.resultSection.style.display = 'none';

      // Rendu apercu page 1 original
      await renderFirstPagePreview(pdf);

      const targetBytes = targetMB * 1024 * 1024;
      if (file.size <= targetBytes) {
        setStatus('success',
          '<div><strong>Deja sous la limite !</strong> Votre fichier pese <span class="mono">' + DP.formatBytes(file.size) +
          '</span> (limite choisie : <span class="mono">' + targetMB.toFixed(2).replace('.', ',') +
          ' Mo</span>). Vous pouvez quand meme lancer l\'optimisation pour alleger davantage le dossier.</div>'
        );
      } else {
        setStatus('',
          '<div><strong>Pret pour la compression ciblee.</strong> Poids actuel : <span class="mono">' + DP.formatBytes(file.size) +
          '</span> → Objectif : <strong>&lt; ' + targetMB.toFixed(2).replace('.', ',') + ' Mo</strong>.</div>'
        );
      }
    } catch (err) {
      setStatus('error', '<strong>Impossible de lire ce PDF</strong> : fichier protege par mot de passe ou corrompu (' + escapeHtml(err.message) + ').');
    }
  }

  async function renderFirstPagePreview(pdfDoc) {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 0.9 });
    el.previewCanvas.width = Math.round(viewport.width);
    el.previewCanvas.height = Math.round(viewport.height);
    const ctx = el.previewCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    el.previewCanvas.style.display = 'block';
    if (el.previewEmpty) el.previewEmpty.style.display = 'none';
  }

  function applyGrayscaleToCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  async function renderPagesAtScale(pdf, scale, grayscale) {
    const canvases = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const baseVp = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(vp.width));
      c.height = Math.max(1, Math.round(vp.height));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      if (grayscale) applyGrayscaleToCanvas(c);
      canvases.push({
        canvas: c,
        widthPt: baseVp.width,
        heightPt: baseVp.height
      });
    }
    return canvases;
  }

  async function buildPdfFromCanvases(renderedPages, jpegQuality) {
    const outPdf = await window.PDFLib.PDFDocument.create();
    for (let i = 0; i < renderedPages.length; i++) {
      const item = renderedPages[i];
      const jpegBytes = await new Promise(function (resolve, reject) {
        item.canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error('Encodage JPEG echoue'));
          blob.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
        }, 'image/jpeg', jpegQuality);
      });
      const jpgImg = await outPdf.embedJpg(jpegBytes);
      const page = outPdf.addPage([item.widthPt, item.heightPt]);
      page.drawImage(jpgImg, {
        x: 0,
        y: 0,
        width: item.widthPt,
        height: item.heightPt
      });
    }
    return await outPdf.save({ useObjectStreams: true });
  }

  async function runCompression() {
    if (!currentPdfBytes || !window.PDFLib || !window.pdfjsLib) return;

    const targetBytes = Math.round(targetMB * 1024 * 1024);
    const grayscale = Boolean(el.grayscaleCheck && el.grayscaleCheck.checked);

    el.runBtn.disabled = true;
    el.sampleBtn.disabled = true;
    setStatus('', 'Compression dichotomique locale en cours sur votre processeur...');
    setProgress(8, 'Chargement des pages PDF dans le navigateur...');

    try {
      DP.ensurePdfJsWorker();
      const pdf = await window.pdfjsLib.getDocument({ data: currentPdfBytes.slice() }).promise;

      // Paliers de resolution DPI (scale 1.0 = 72 DPI, 1.5 = 108 DPI, 2.0 = 144 DPI)
      const scaleTiers = [1.85, 1.5, 1.25, 1.0, 0.82, 0.65];
      let bestResult = null;
      let fallbackResult = null;

      for (let tIdx = 0; tIdx < scaleTiers.length; tIdx++) {
        const scale = scaleTiers[tIdx];
        const dpi = Math.round(scale * 72);
        const basePct = 12 + Math.round((tIdx / scaleTiers.length) * 78);
        setProgress(basePct, 'Rendu local a ' + dpi + ' DPI (' + pdf.numPages + ' pages)...');

        const rendered = await renderPagesAtScale(pdf, scale, grayscale);

        // Test rapide a qualite maximale du palier (0.86)
        const hiBytes = await buildPdfFromCanvases(rendered, 0.86);
        if (!fallbackResult || hiBytes.byteLength < fallbackResult.bytes.byteLength) {
          fallbackResult = { bytes: hiBytes, scale: scale, dpi: dpi, quality: 0.86, previewCanvas: rendered[0].canvas };
        }

        if (hiBytes.byteLength <= targetBytes) {
          bestResult = { bytes: hiBytes, scale: scale, dpi: dpi, quality: 0.86, previewCanvas: rendered[0].canvas };
          break;
        }

        // Test rapide a qualite plancher du palier (0.42) pour savoir si la cible est atteignable a ce DPI
        const loBytes = await buildPdfFromCanvases(rendered, 0.42);
        if (!fallbackResult || loBytes.byteLength < fallbackResult.bytes.byteLength) {
          fallbackResult = { bytes: loBytes, scale: scale, dpi: dpi, quality: 0.42, previewCanvas: rendered[0].canvas };
        }

        if (loBytes.byteLength <= targetBytes) {
          // Recherche dichotomique exacte de la meilleure qualite JPEG dans [0.42, 0.86]
          let low = 0.42;
          let high = 0.86;
          bestResult = { bytes: loBytes, scale: scale, dpi: dpi, quality: low, previewCanvas: rendered[0].canvas };

          for (let iter = 0; iter < 5; iter++) {
            const mid = (low + high) / 2;
            setProgress(Math.min(95, basePct + (iter + 1) * 3), 'Ajustement dichotomique qualite JPEG (' + Math.round(mid * 100) + ' %) a ' + dpi + ' DPI...');
            const candidate = await buildPdfFromCanvases(rendered, mid);
            if (candidate.byteLength <= targetBytes) {
              bestResult = { bytes: candidate, scale: scale, dpi: dpi, quality: mid, previewCanvas: rendered[0].canvas };
              low = mid;
            } else {
              high = mid;
            }
          }
          break;
        }
      }

      // Dernier recours extreme si le fichier a enormement de pages
      let finalRes = bestResult || fallbackResult;
      if (!bestResult && finalRes.bytes.byteLength > targetBytes) {
        setProgress(92, 'Optimisation extreme pour fichier tres volumineux...');
        const renderedMin = await renderPagesAtScale(pdf, 0.55, true);
        const minBytes = await buildPdfFromCanvases(renderedMin, 0.34);
        if (minBytes.byteLength < finalRes.bytes.byteLength) {
          finalRes = { bytes: minBytes, scale: 0.55, dpi: 40, quality: 0.34, previewCanvas: renderedMin[0].canvas };
        }
      }

      setProgress(100, 'Compression terminee localement.');
      compressedBlob = new Blob([finalRes.bytes], { type: 'application/pdf' });

      // Apercu page 1 compressee
      el.previewCanvas.width = finalRes.previewCanvas.width;
      el.previewCanvas.height = finalRes.previewCanvas.height;
      const pCtx = el.previewCanvas.getContext('2d');
      pCtx.drawImage(finalRes.previewCanvas, 0, 0);

      // Metriques avant / apres
      const beforeSize = currentFile.size;
      const afterSize = compressedBlob.size;
      const diffPct = beforeSize > 0 ? ((beforeSize - afterSize) / beforeSize) * 100 : 0;

      el.metricBefore.textContent = DP.formatBytes(beforeSize);
      el.metricAfter.textContent = DP.formatBytes(afterSize);
      el.metricGain.textContent = (diffPct >= 0 ? '-' : '+') + DP.formatPercent(Math.abs(diffPct));
      el.metricDetails.textContent =
        'Resolution retenue : ' + finalRes.dpi + ' DPI • Qualite JPEG : ' + Math.round(finalRes.quality * 100) +
        ' % • ' + (grayscale ? 'Niveaux de gris' : 'Couleur conservee') + ' • ' + currentPageCount + ' pages';

      const maxBar = Math.max(beforeSize, afterSize, targetBytes);
      el.barBefore.style.width = Math.max(4, Math.round((beforeSize / maxBar) * 100)) + '%';
      el.barAfter.style.width = Math.max(4, Math.round((afterSize / maxBar) * 100)) + '%';
      el.barBeforeLbl.textContent = DP.formatBytes(beforeSize);
      el.barAfterLbl.textContent = DP.formatBytes(afterSize);

      el.resultSection.style.display = 'block';

      if (afterSize <= targetBytes) {
        setStatus('success',
          '<div><strong>Objectif atteint (' + DP.formatBytes(beforeSize) + ' → ' + DP.formatBytes(afterSize) + ', ' +
          (diffPct >= 0 ? '-' : '+') + DP.formatPercent(Math.abs(diffPct)) + ').</strong> ' +
          'Votre PDF respecte la limite cible (&lt; ' + targetMB.toFixed(2).replace('.', ',') + ' Mo) et est pret pour depot administratif.</div>'
        );
      } else {
        setStatus('warn',
          '<div><strong>Plancher de lisibilite atteint (' + DP.formatBytes(afterSize) + ').</strong> ' +
          'Ce PDF comporte beaucoup de pages pour la limite demandee. Activez le mode Noir &amp; Blanc ou decoupez le dossier en 2 fichiers avec notre <a href="decouper-extraire-pdf.html">decoupeur PDF</a>.</div>'
        );
      }
    } catch (err) {
      setStatus('error', '<strong>Erreur lors de la compression locale :</strong> ' + escapeHtml(err.message));
    } finally {
      el.runBtn.disabled = false;
      el.sampleBtn.disabled = false;
      setTimeout(hideProgress, 600);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    // Presets
    el.presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        activePreset = btn.dataset.compressPreset;
        if (PRESETS[activePreset]) {
          targetMB = PRESETS[activePreset].targetMB;
          el.customInput.value = targetMB.toFixed(2);
        }
      });
    });

    el.customInput.addEventListener('input', function () {
      const v = parseFloat(el.customInput.value);
      if (Number.isFinite(v) && v >= 0.2 && v <= 50) {
        targetMB = v;
        el.presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
        activePreset = 'custom';
      }
    });

    // Dropzone
    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });

    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files[0]) {
        loadPdfFile(el.fileInput.files[0]);
      }
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
        loadPdfFile(e.dataTransfer.files[0]);
      }
    });

    // Bouton document exemple local
    el.sampleBtn.addEventListener('click', async function () {
      el.sampleBtn.disabled = true;
      setStatus('', 'Generation locale d\'un dossier PDF specimen (~3 Mo, 4 pages)...');
      try {
        const sampleFile = await DP.samples.createSampleHeavyPdf(4);
        await loadPdfFile(sampleFile);
      } catch (err) {
        setStatus('error', 'Impossible de generer l\'exemple local : ' + escapeHtml(err.message));
      } finally {
        el.sampleBtn.disabled = false;
      }
    });

    el.runBtn.addEventListener('click', runCompression);

    el.downloadBtn.addEventListener('click', function () {
      if (!compressedBlob || !currentFile) return;
      const base = DP.sanitizeFilename(currentFile.name);
      const suffix = activePreset === 'custom' ? Math.round(targetMB * 10) + 'mo' : activePreset;
      DP.downloadBlob(compressedBlob, base + '-compresse-' + suffix + '.pdf');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
