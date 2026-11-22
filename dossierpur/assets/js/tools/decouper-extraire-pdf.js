/* ==========================================================================
   Outil 5 — Decoupeur, Extracteur & Rotation de Pages PDF
   100 % Local Navigateur : Miniatures PDF.js + Extraction sans perte pdf-lib
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  let sourceFile = null;
  let sourceBytes = null;
  let pagesState = []; // { index (0-based), selected, rotation (0|90|180|270), canvas }

  const el = {};

  function bindElements() {
    el.dropzone = document.getElementById('split-dropzone');
    el.fileInput = document.getElementById('split-file-input');
    el.sampleBtn = document.getElementById('split-sample-btn');
    el.fileInfo = document.getElementById('split-file-info');
    el.toolbar = document.getElementById('split-toolbar');
    el.rangeInput = document.getElementById('split-range-input');
    el.rangeApplyBtn = document.getElementById('split-range-apply');
    el.selectAllBtn = document.getElementById('split-select-all');
    el.selectNoneBtn = document.getElementById('split-select-none');
    el.invertBtn = document.getElementById('split-invert');
    el.rotateAllBtn = document.getElementById('split-rotate-all');
    el.selectedCounter = document.getElementById('split-selected-counter');
    el.grid = document.getElementById('split-page-grid');
    el.emptyGrid = document.getElementById('split-empty-grid');
    el.exportBtn = document.getElementById('split-export-btn');
    el.statusBox = document.getElementById('split-status');
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

  function updateSummary() {
    const selectedCount = pagesState.filter(function (p) { return p.selected; }).length;
    el.selectedCounter.textContent = selectedCount + ' / ' + pagesState.length + ' page(s) selectionnee(s)';
    el.exportBtn.disabled = selectedCount === 0;
  }

  function renderGrid() {
    el.grid.innerHTML = '';
    if (!pagesState.length) {
      el.emptyGrid.style.display = 'block';
      el.toolbar.style.display = 'none';
      updateSummary();
      return;
    }

    el.emptyGrid.style.display = 'none';
    el.toolbar.style.display = 'block';

    pagesState.forEach(function (pg) {
      const card = document.createElement('div');
      card.className = 'page-card' + (pg.selected ? ' is-selected' : '');

      const preview = document.createElement('div');
      preview.className = 'page-card__preview';
      preview.title = 'Cliquer pour selectionner / deselectionner la page ' + (pg.index + 1);

      pg.canvas.style.transform = 'rotate(' + pg.rotation + 'deg)';
      preview.appendChild(pg.canvas);

      preview.addEventListener('click', function () {
        pg.selected = !pg.selected;
        renderGrid();
      });

      const foot = document.createElement('div');
      foot.className = 'page-card__foot';

      const lbl = document.createElement('label');
      lbl.className = 'page-card__check';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = pg.selected;
      chk.addEventListener('change', function () {
        pg.selected = chk.checked;
        renderGrid();
      });
      const txt = document.createElement('span');
      txt.className = 'mono';
      txt.textContent = 'P.' + (pg.index + 1) + (pg.rotation ? ' (' + pg.rotation + '°)' : '');
      lbl.appendChild(chk);
      lbl.appendChild(txt);

      const rotBtn = document.createElement('button');
      rotBtn.type = 'button';
      rotBtn.className = 'icon-btn';
      rotBtn.title = 'Pivoter cette page de +90°';
      rotBtn.setAttribute('aria-label', 'Pivoter page ' + (pg.index + 1) + ' de 90 degres');
      rotBtn.textContent = '↻';
      rotBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        pg.rotation = (pg.rotation + 90) % 360;
        renderGrid();
      });

      foot.appendChild(lbl);
      foot.appendChild(rotBtn);

      card.appendChild(preview);
      card.appendChild(foot);
      el.grid.appendChild(card);
    });

    updateSummary();
  }

  async function loadPdf(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('error', '<strong>Format non supporte.</strong> Selectionnez un fichier PDF (.pdf).');
      return;
    }

    try {
      setStatus('', 'Generation des miniatures locales avec PDF.js...');
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      DP.ensurePdfJsWorker();

      const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      sourceFile = file;
      sourceBytes = bytes;
      pagesState = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.42 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vp.width));
        canvas.height = Math.max(1, Math.round(vp.height));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        pagesState.push({
          index: i - 1,
          selected: true,
          rotation: 0,
          canvas: canvas
        });
      }

      el.fileInfo.innerHTML =
        '<div class="file-item">' +
          '<div class="file-item__thumb">PDF</div>' +
          '<div class="file-item__meta">' +
            '<div class="file-item__name">' + escapeHtml(file.name) + '</div>' +
            '<div class="file-item__sub">' +
              '<span class="mono">' + DP.formatBytes(file.size) + '</span>' +
              '<span>•</span>' +
              '<span class="mono">' + pdf.numPages + ' page(s)</span>' +
              '<span>•</span>' +
              '<span class="badge badge-trust">Extraction sans perte</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      renderGrid();
      setStatus('success',
        '<div><strong>' + pdf.numPages + ' miniatures pretes.</strong> Cochez uniquement les pages a conserver, pivotez celles a l\'envers (↻), puis exportez votre nouveau PDF propre.</div>'
      );
    } catch (err) {
      setStatus('error', '<strong>Lecture PDF impossible :</strong> ' + escapeHtml(err.message));
    }
  }

  function applyRangeSelection() {
    const raw = (el.rangeInput.value || '').trim();
    if (!raw || !pagesState.length) return;

    const chosen = new Set();
    const parts = raw.split(',');
    parts.forEach(function (part) {
      const token = part.trim();
      if (!token) return;
      if (token.indexOf('-') !== -1) {
        const bounds = token.split('-').map(function (s) { return parseInt(s.trim(), 10); });
        if (Number.isFinite(bounds[0]) && Number.isFinite(bounds[1])) {
          const start = Math.max(1, Math.min(bounds[0], bounds[1]));
          const end = Math.min(pagesState.length, Math.max(bounds[0], bounds[1]));
          for (let n = start; n <= end; n++) chosen.add(n - 1);
        }
      } else {
        const num = parseInt(token, 10);
        if (Number.isFinite(num) && num >= 1 && num <= pagesState.length) {
          chosen.add(num - 1);
        }
      }
    });

    if (chosen.size === 0) {
      setStatus('warn', '<strong>Plage invalide.</strong> Exemple valide : <span class="mono">1-2, 4</span> (entre 1 et ' + pagesState.length + ').');
      return;
    }

    pagesState.forEach(function (pg) {
      pg.selected = chosen.has(pg.index);
    });
    renderGrid();
    setStatus('success', '<div><strong>Selection mise a jour :</strong> ' + chosen.size + ' page(s) cochee(s).</div>');
  }

  async function exportExtractedPdf() {
    if (!sourceBytes || !window.PDFLib) return;
    const selected = pagesState.filter(function (p) { return p.selected; });
    if (!selected.length) return;

    el.exportBtn.disabled = true;
    setStatus('', 'Extraction vectorielle sans perte dans votre navigateur...');

    try {
      const srcDoc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const outDoc = await window.PDFLib.PDFDocument.create();

      const indices = selected.map(function (p) { return p.index; });
      const copied = await outDoc.copyPages(srcDoc, indices);

      copied.forEach(function (page, i) {
        const extraRot = selected[i].rotation;
        if (extraRot !== 0) {
          const existing = page.getRotation().angle || 0;
          page.setRotation(window.PDFLib.degrees((existing + extraRot) % 360));
        }
        outDoc.addPage(page);
      });

      const outBytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const base = DP.sanitizeFilename(sourceFile.name);
      DP.downloadBlob(blob, base + '-extrait-' + selected.length + 'p.pdf');

      setStatus('success',
        '<div><strong>Nouveau PDF telecharge (' + selected.length + ' page(s), ' + DP.formatBytes(blob.size) + ').</strong> La qualite vectorielle d\'origine a ete 100 % preservee.</div>'
      );
    } catch (err) {
      setStatus('error', '<strong>Erreur export PDF :</strong> ' + escapeHtml(err.message));
    } finally {
      el.exportBtn.disabled = false;
    }
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files[0]) loadPdf(el.fileInput.files[0]);
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
        loadPdf(e.dataTransfer.files[0]);
      }
    });

    el.sampleBtn.addEventListener('click', async function () {
      el.sampleBtn.disabled = true;
      try {
        const f = await DP.samples.createSampleHeavyPdf(4);
        await loadPdf(f);
      } finally {
        el.sampleBtn.disabled = false;
      }
    });

    el.rangeApplyBtn.addEventListener('click', applyRangeSelection);
    el.rangeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyRangeSelection();
      }
    });

    el.selectAllBtn.addEventListener('click', function () {
      pagesState.forEach(function (p) { p.selected = true; });
      renderGrid();
    });

    el.selectNoneBtn.addEventListener('click', function () {
      pagesState.forEach(function (p) { p.selected = false; });
      renderGrid();
    });

    el.invertBtn.addEventListener('click', function () {
      pagesState.forEach(function (p) { p.selected = !p.selected; });
      renderGrid();
    });

    el.rotateAllBtn.addEventListener('click', function () {
      pagesState.forEach(function (p) { p.rotation = (p.rotation + 90) % 360; });
      renderGrid();
    });

    el.exportBtn.addEventListener('click', exportExtractedPdf);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
