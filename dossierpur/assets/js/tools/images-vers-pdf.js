/* ==========================================================================
   Outil 4 — Photos Smartphone (JPG/PNG) -> PDF A4 Propre (Mode Scan N&B)
   100 % Local Navigateur : Traitement Canvas (contraste/scanner) + pdf-lib
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  let photos = []; // { id, file, img, url, rotation }
  let activeId = null;
  let nextId = 1;

  const opts = {
    orientation: 'portrait', // 'portrait' | 'landscape' | 'auto'
    marginMm: 12,
    filter: 'scan_bw', // 'original' | 'scan_bw' | 'scan_color'
    contrast: 32,
    brightness: 16
  };

  const el = {};

  function bindElements() {
    el.dropzone = document.getElementById('imgpdf-dropzone');
    el.fileInput = document.getElementById('imgpdf-file-input');
    el.sampleBtn = document.getElementById('imgpdf-sample-btn');
    el.clearBtn = document.getElementById('imgpdf-clear-btn');
    el.list = document.getElementById('imgpdf-list');
    el.emptyList = document.getElementById('imgpdf-empty-list');
    el.countBadge = document.getElementById('imgpdf-count-badge');
    el.orientBtns = document.querySelectorAll('[data-orient]');
    el.marginBtns = document.querySelectorAll('[data-margin]');
    el.filterBtns = document.querySelectorAll('[data-filter]');
    el.contrastRange = document.getElementById('imgpdf-contrast');
    el.contrastVal = document.getElementById('imgpdf-contrast-val');
    el.brightRange = document.getElementById('imgpdf-brightness');
    el.brightVal = document.getElementById('imgpdf-brightness-val');
    el.previewCanvas = document.getElementById('imgpdf-preview-canvas');
    el.previewEmpty = document.getElementById('imgpdf-preview-empty');
    el.previewCaption = document.getElementById('imgpdf-preview-caption');
    el.exportBtn = document.getElementById('imgpdf-export-btn');
    el.statusBox = document.getElementById('imgpdf-status');
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

  function clampByte(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : Math.round(v));
  }

  function processImageToCanvas(photo, maxSide) {
    const img = photo.img;
    const rot = ((photo.rotation % 360) + 360) % 360;
    const swapped = rot === 90 || rot === 270;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));

    const c = document.createElement('canvas');
    c.width = swapped ? drawH : drawW;
    c.height = swapped ? drawW : drawH;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if (opts.filter === 'original' && opts.contrast === 0 && opts.brightness === 0) {
      return c;
    }

    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;

    // Facteur de contraste standard
    const cVal = opts.contrast * 2.1;
    const factor = (259 * (cVal + 255)) / (255 * (259 - cVal));
    const bShift = opts.brightness * 1.6;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      if (opts.filter === 'scan_bw') {
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Blanchiment du fond papier grisatre + renforcement de l'encre noire
        lum = factor * (lum - 128) + 128 + bShift;
        if (lum > 205) lum = 255;
        else if (lum < 58) lum = Math.max(0, lum * 0.65);
        const out = clampByte(lum);
        d[i] = out;
        d[i + 1] = out;
        d[i + 2] = out;
      } else if (opts.filter === 'scan_color') {
        r = factor * (r - 128) + 128 + bShift;
        g = factor * (g - 128) + 128 + bShift;
        b = factor * (b - 128) + 128 + bShift;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Eclaircit les fonds gris clair en conservant les tampons/signatures colores
        const maxCh = Math.max(r, g, b);
        const minCh = Math.min(r, g, b);
        if (lum > 202 && (maxCh - minCh) < 28) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
        } else {
          d[i] = clampByte(r);
          d[i + 1] = clampByte(g);
          d[i + 2] = clampByte(b);
        }
      } else {
        d[i] = clampByte(factor * (r - 128) + 128 + bShift);
        d[i + 1] = clampByte(factor * (g - 128) + 128 + bShift);
        d[i + 2] = clampByte(factor * (b - 128) + 128 + bShift);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  function renderPreview() {
    const active = photos.find(function (p) { return p.id === activeId; }) || photos[0];
    if (!active) {
      el.previewCanvas.style.display = 'none';
      el.previewEmpty.style.display = 'block';
      el.previewCaption.textContent = 'Aucune image selectionnee';
      return;
    }
    activeId = active.id;

    const processed = processImageToCanvas(active, 900);
    el.previewCanvas.width = processed.width;
    el.previewCanvas.height = processed.height;
    el.previewCanvas.getContext('2d').drawImage(processed, 0, 0);
    el.previewCanvas.style.display = 'block';
    el.previewEmpty.style.display = 'none';

    const modeNames = {
      original: 'Photo originale',
      scan_bw: 'Mode Scan N&B haute lisibilite',
      scan_color: 'Mode Scan Couleur net'
    };
    el.previewCaption.textContent = active.file.name + ' — ' + modeNames[opts.filter];
  }

  function renderList() {
    el.list.innerHTML = '';
    const has = photos.length > 0;
    el.emptyList.style.display = has ? 'none' : 'block';
    el.exportBtn.disabled = !has;
    el.clearBtn.disabled = !has;
    el.countBadge.textContent = photos.length + ' photo' + (photos.length > 1 ? 's' : '');

    photos.forEach(function (photo, idx) {
      const item = document.createElement('div');
      item.className = 'file-item';
      if (photo.id === activeId) {
        item.style.borderColor = '#1D4ED8';
        item.style.backgroundColor = '#E8EFFD';
      }
      item.innerHTML =
        '<div class="file-item__thumb" style="cursor:pointer" data-select-id="' + photo.id + '">' +
          '<img src="' + photo.url + '" alt="Photo" style="width:100%;height:100%;object-fit:cover">' +
        '</div>' +
        '<div class="file-item__meta" style="cursor:pointer" data-select-id="' + photo.id + '">' +
          '<div class="file-item__name">' + (idx + 1) + '. ' + escapeHtml(photo.file.name) + '</div>' +
          '<div class="file-item__sub">' +
            '<span class="mono">' + DP.formatBytes(photo.file.size) + '</span>' +
            '<span>•</span>' +
            '<span class="mono">' + photo.img.naturalWidth + '×' + photo.img.naturalHeight + ' px</span>' +
            (photo.rotation ? '<span>•</span><span class="mono">' + photo.rotation + '°</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="file-item__actions">' +
          '<button type="button" class="icon-btn" data-rot-id="' + photo.id + '" title="Pivoter 90°" aria-label="Pivoter 90 degres">↻</button>' +
          '<button type="button" class="icon-btn" data-up-idx="' + idx + '" title="Monter" aria-label="Monter" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="icon-btn" data-dn-idx="' + idx + '" title="Descendre" aria-label="Descendre" ' + (idx === photos.length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="icon-btn icon-btn--danger" data-del-id="' + photo.id + '" title="Supprimer" aria-label="Supprimer">×</button>' +
        '</div>';
      el.list.appendChild(item);
    });

    el.list.querySelectorAll('[data-select-id]').forEach(function (node) {
      node.addEventListener('click', function () {
        activeId = parseInt(node.dataset.selectId, 10);
        renderList();
        renderPreview();
      });
    });

    el.list.querySelectorAll('[data-rot-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = parseInt(btn.dataset.rotId, 10);
        const p = photos.find(function (x) { return x.id === id; });
        if (p) {
          p.rotation = (p.rotation + 90) % 360;
          activeId = p.id;
          renderList();
          renderPreview();
        }
      });
    });

    el.list.querySelectorAll('[data-up-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = parseInt(btn.dataset.upIdx, 10);
        if (i > 0) {
          const t = photos[i - 1];
          photos[i - 1] = photos[i];
          photos[i] = t;
          renderList();
        }
      });
    });

    el.list.querySelectorAll('[data-dn-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = parseInt(btn.dataset.dnIdx, 10);
        if (i < photos.length - 1) {
          const t = photos[i + 1];
          photos[i + 1] = photos[i];
          photos[i] = t;
          renderList();
        }
      });
    });

    el.list.querySelectorAll('[data-del-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = parseInt(btn.dataset.delId, 10);
        const found = photos.find(function (x) { return x.id === id; });
        if (found) URL.revokeObjectURL(found.url);
        photos = photos.filter(function (x) { return x.id !== id; });
        if (activeId === id) activeId = photos.length ? photos[0].id : null;
        renderList();
        renderPreview();
      });
    });
  }

  async function addImageFiles(fileList) {
    let added = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
        continue;
      }
      try {
        const url = URL.createObjectURL(file);
        const img = await new Promise(function (resolve, reject) {
          const im = new Image();
          im.onload = function () { resolve(im); };
          im.onerror = function () { reject(new Error('Image invalide')); };
          im.src = url;
        });
        const item = { id: nextId++, file: file, img: img, url: url, rotation: 0 };
        photos.push(item);
        if (!activeId) activeId = item.id;
        added++;
      } catch (e) {
        // Ignore unreadable image
      }
    }

    if (added > 0) {
      renderList();
      renderPreview();
      setStatus('success',
        '<div><strong>' + added + ' photo' + (added > 1 ? 's' : '') + ' ajoutee' + (added > 1 ? 's' : '') + '.</strong> ' +
        'Comparez le rendu « Mode Scan N&amp;B » dans l\'apercu en direct avant de generer votre PDF A4.</div>'
      );
    } else {
      setStatus('error', '<strong>Aucune image valide detectee.</strong> Deposez des photos JPG, PNG ou WebP.');
    }
  }

  async function exportA4Pdf() {
    if (!photos.length || !window.PDFLib) return;
    el.exportBtn.disabled = true;
    setStatus('', 'Generation du PDF A4 propre (Mode Scan) dans votre navigateur...');

    try {
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const mmToPt = 72 / 25.4;
      const marginPt = opts.marginMm * mmToPt;

      for (let i = 0; i < photos.length; i++) {
        const processed = processImageToCanvas(photos[i], 1950);
        const jpgBytes = await new Promise(function (resolve, reject) {
          processed.toBlob(function (blob) {
            if (!blob) return reject(new Error('Encodage JPEG echoue'));
            blob.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
          }, 'image/jpeg', 0.86);
        });
        const img = await pdfDoc.embedJpg(jpgBytes);

        let isLandscape = false;
        if (opts.orientation === 'landscape') isLandscape = true;
        else if (opts.orientation === 'auto') isLandscape = processed.width > processed.height;

        const pageW = isLandscape ? 841.89 : 595.28;
        const pageH = isLandscape ? 595.28 : 841.89;
        const availW = Math.max(10, pageW - marginPt * 2);
        const availH = Math.max(10, pageH - marginPt * 2);
        const fit = Math.min(availW / processed.width, availH / processed.height);
        const drawW = processed.width * fit;
        const drawH = processed.height * fit;

        const page = pdfDoc.addPage([pageW, pageH]);
        page.drawImage(img, {
          x: (pageW - drawW) / 2,
          y: (pageH - drawH) / 2,
          width: drawW,
          height: drawH
        });
      }

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const suffix = opts.filter === 'scan_bw' ? 'scan-nb' : (opts.filter === 'scan_color' ? 'scan-couleur' : 'a4');
      DP.downloadBlob(blob, 'dossierpur-' + suffix + '.pdf');

      setStatus('success',
        '<div><strong>PDF A4 genere et telecharge (' + photos.length + ' page' + (photos.length > 1 ? 's' : '') + ', ' +
        DP.formatBytes(blob.size) + ').</strong> Besoin de passer sous 2 Mo pour l\'ANTS ? <a href="compresser-pdf-ants.html">Compresser ce PDF</a>.</div>'
      );
    } catch (err) {
      setStatus('error', '<strong>Erreur creation PDF :</strong> ' + escapeHtml(err.message));
    } finally {
      el.exportBtn.disabled = false;
    }
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    el.orientBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.orientBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        opts.orientation = btn.dataset.orient;
      });
    });

    el.marginBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.marginBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        opts.marginMm = parseInt(btn.dataset.margin, 10);
      });
    });

    el.filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.filterBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        opts.filter = btn.dataset.filter;
        if (opts.filter === 'original') {
          opts.contrast = 0;
          opts.brightness = 0;
        } else if (opts.filter === 'scan_bw') {
          opts.contrast = 32;
          opts.brightness = 16;
        } else {
          opts.contrast = 20;
          opts.brightness = 10;
        }
        el.contrastRange.value = String(opts.contrast);
        el.contrastVal.textContent = (opts.contrast >= 0 ? '+' : '') + opts.contrast;
        el.brightRange.value = String(opts.brightness);
        el.brightVal.textContent = (opts.brightness >= 0 ? '+' : '') + opts.brightness;
        renderPreview();
      });
    });

    el.contrastRange.addEventListener('input', function () {
      opts.contrast = parseInt(el.contrastRange.value, 10);
      el.contrastVal.textContent = (opts.contrast >= 0 ? '+' : '') + opts.contrast;
      renderPreview();
    });

    el.brightRange.addEventListener('input', function () {
      opts.brightness = parseInt(el.brightRange.value, 10);
      el.brightVal.textContent = (opts.brightness >= 0 ? '+' : '') + opts.brightness;
      renderPreview();
    });

    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files.length) {
        addImageFiles(el.fileInput.files);
        el.fileInput.value = '';
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
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        addImageFiles(e.dataTransfer.files);
      }
    });

    el.sampleBtn.addEventListener('click', async function () {
      el.sampleBtn.disabled = true;
      try {
        const sample = await DP.samples.createSampleScanPhoto();
        await addImageFiles([sample]);
      } finally {
        el.sampleBtn.disabled = false;
      }
    });

    el.clearBtn.addEventListener('click', function () {
      photos.forEach(function (p) { URL.revokeObjectURL(p.url); });
      photos = [];
      activeId = null;
      renderList();
      renderPreview();
      setStatus('', 'Photos retirees. Deposez de nouvelles images.');
    });

    el.exportBtn.addEventListener('click', exportA4Pdf);
    renderList();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
