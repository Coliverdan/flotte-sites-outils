/* ==========================================================================
   Outil 3 — Assembleur de Dossier Locatif PDF (PDF + Photos + Page de garde)
   100 % Local Navigateur : pdf-lib + Canvas haute definition pour page de garde
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  let items = []; // { id, file, type: 'pdf'|'image', pages, label, bytes, thumbUrl }
  let nextId = 1;
  let mergedBlob = null;

  const el = {};

  function bindElements() {
    el.dropzone = document.getElementById('merge-dropzone');
    el.fileInput = document.getElementById('merge-file-input');
    el.sampleBtn = document.getElementById('merge-sample-btn');
    el.clearBtn = document.getElementById('merge-clear-btn');
    el.list = document.getElementById('merge-file-list');
    el.emptyState = document.getElementById('merge-empty-state');
    el.summaryBadge = document.getElementById('merge-summary-badge');
    el.coverToggle = document.getElementById('merge-cover-toggle');
    el.coverFields = document.getElementById('merge-cover-fields');
    el.candName = document.getElementById('cover-name');
    el.candContact = document.getElementById('cover-contact');
    el.candRent = document.getElementById('cover-rent');
    el.candIncome = document.getElementById('cover-income');
    el.candNote = document.getElementById('cover-note');
    el.runBtn = document.getElementById('merge-run-btn');
    el.statusBox = document.getElementById('merge-status');
    el.resultBox = document.getElementById('merge-result-box');
    el.resPages = document.getElementById('merge-res-pages');
    el.resSize = document.getElementById('merge-res-size');
    el.resDocs = document.getElementById('merge-res-docs');
    el.downloadBtn = document.getElementById('merge-download-btn');
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

  function guessDocLabel(filename) {
    const n = filename.toLowerCase();
    if (/cni|identit|passeport|carte/.test(n)) return 'Piece d\'identite';
    if (/impot|imposition|fiscal/.test(n)) return 'Avis d\'imposition';
    if (/paie|salaire|bulletin/.test(n)) return 'Bulletins de salaire';
    if (/domicile|edf|facture|quittance|loyer/.test(n)) return 'Justificatif de domicile / quittance';
    if (/contrat|employeur|attestation/.test(n)) return 'Contrat de travail / attestation';
    if (/garant|caution/.test(n)) return 'Pieces du garant';
    return filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
  }

  async function addFiles(fileList) {
    if (!fileList || !fileList.length) return;
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(lower);

      if (!isPdf && !isImg) {
        skipped++;
        continue;
      }

      try {
        const ab = await file.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let pages = 1;
        let thumbUrl = null;

        if (isPdf) {
          const doc = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          pages = doc.getPageCount();
        } else {
          thumbUrl = URL.createObjectURL(file);
        }

        items.push({
          id: nextId++,
          file: file,
          type: isPdf ? 'pdf' : 'image',
          pages: pages,
          label: guessDocLabel(file.name),
          bytes: bytes,
          thumbUrl: thumbUrl
        });
        added++;
      } catch (err) {
        skipped++;
      }
    }

    renderList();
    if (added > 0) {
      setStatus('success',
        '<div><strong>' + added + ' piece' + (added > 1 ? 's' : '') + ' ajoutee' + (added > 1 ? 's' : '') + ' en memoire locale.</strong>' +
        (skipped > 0 ? ' (' + skipped + ' fichier(s) ignore(s) car non pris en charge.)' : '') +
        ' Reordonnez vos justificatifs ci-dessous puis generez le PDF unique.</div>'
      );
    } else if (skipped > 0) {
      setStatus('error', '<strong>Aucun fichier valide ajoute.</strong> Formats acceptes : PDF, JPG, PNG.');
    }
  }

  function renderList() {
    el.list.innerHTML = '';
    const hasItems = items.length > 0;
    el.emptyState.style.display = hasItems ? 'none' : 'block';
    el.runBtn.disabled = !hasItems;
    el.clearBtn.disabled = !hasItems;
    el.resultBox.style.display = 'none';
    mergedBlob = null;

    let totalBytes = 0;
    let totalPages = el.coverToggle.checked ? 1 : 0;

    items.forEach(function (item, index) {
      totalBytes += item.file.size;
      totalPages += item.pages;

      const row = document.createElement('div');
      row.className = 'file-item';
      row.innerHTML =
        '<div class="file-item__thumb">' +
          (item.thumbUrl ? '<img src="' + item.thumbUrl + '" alt="Miniature" style="width:100%;height:100%;object-fit:cover">' : 'PDF') +
        '</div>' +
        '<div class="file-item__meta">' +
          '<div class="file-item__name">' + (index + 1) + '. ' + escapeHtml(item.file.name) + '</div>' +
          '<div class="file-item__sub">' +
            '<span class="mono">' + DP.formatBytes(item.file.size) + '</span>' +
            '<span>•</span>' +
            '<span class="mono">' + item.pages + ' page' + (item.pages > 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div style="margin-top:8px">' +
            '<input type="text" class="input-text" style="padding:6px 10px;font-size:13px" data-label-id="' + item.id + '" value="' + escapeHtml(item.label) + '" placeholder="Intitule dans le sommaire">' +
          '</div>' +
        '</div>' +
        '<div class="file-item__actions">' +
          '<button type="button" class="icon-btn" data-move-up="' + index + '" title="Monter" aria-label="Monter" ' + (index === 0 ? 'disabled' : '') + '>↑</button>' +
          '<button type="button" class="icon-btn" data-move-down="' + index + '" title="Descendre" aria-label="Descendre" ' + (index === items.length - 1 ? 'disabled' : '') + '>↓</button>' +
          '<button type="button" class="icon-btn icon-btn--danger" data-remove-id="' + item.id + '" title="Supprimer" aria-label="Supprimer">×</button>' +
        '</div>';

      el.list.appendChild(row);
    });

    el.summaryBadge.textContent = items.length + ' piece(s) • ' + totalPages + ' page(s) • ' + DP.formatBytes(totalBytes);

    // Events dynamiques
    el.list.querySelectorAll('[data-label-id]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        const id = parseInt(inp.dataset.labelId, 10);
        const found = items.find(function (x) { return x.id === id; });
        if (found) found.label = inp.value;
      });
    });

    el.list.querySelectorAll('[data-move-up]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(btn.dataset.moveUp, 10);
        if (idx > 0) {
          const tmp = items[idx - 1];
          items[idx - 1] = items[idx];
          items[idx] = tmp;
          renderList();
        }
      });
    });

    el.list.querySelectorAll('[data-move-down]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(btn.dataset.moveDown, 10);
        if (idx < items.length - 1) {
          const tmp = items[idx + 1];
          items[idx + 1] = items[idx];
          items[idx] = tmp;
          renderList();
        }
      });
    });

    el.list.querySelectorAll('[data-remove-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = parseInt(btn.dataset.removeId, 10);
        const found = items.find(function (x) { return x.id === id; });
        if (found && found.thumbUrl) URL.revokeObjectURL(found.thumbUrl);
        items = items.filter(function (x) { return x.id !== id; });
        renderList();
      });
    });
  }

  async function renderCoverPagePng(indexEntries, totalPages) {
    const canvas = document.createElement('canvas');
    // A4 haute netteté 1654 x 2339 (200 DPI)
    canvas.width = 1654;
    canvas.height = 2339;
    const ctx = canvas.getContext('2d');

    // Fond blanc pur
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Barre institutionnelle gauche (accent suisse)
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, 44, canvas.height);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(44, 0, 12, 420);

    // En-tete
    ctx.fillStyle = '#475569';
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.fillText('DOSSIER DE CANDIDATURE LOCATIVE', 132, 148);

    ctx.fillStyle = '#0D1B2A';
    ctx.font = '700 68px "Space Grotesk", "Segoe UI", sans-serif';
    const candidate = (el.candName.value || 'Candidat Locataire').trim();
    ctx.fillText(candidate.slice(0, 34), 132, 240);

    ctx.fillStyle = '#475569';
    ctx.font = '400 30px "Source Sans 3", "Segoe UI", sans-serif';
    const contact = (el.candContact.value || 'Coordonnees communiquees sur demande').trim();
    ctx.fillText(contact.slice(0, 62), 132, 298);

    // Ligne de separation
    ctx.strokeStyle = '#D8DCE3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(132, 360);
    ctx.lineTo(1530, 360);
    ctx.stroke();

    // Fiche synthese 2 colonnes
    ctx.fillStyle = '#F4F5F7';
    ctx.fillRect(132, 412, 1398, 250);
    ctx.strokeStyle = '#D8DCE3';
    ctx.lineWidth = 2;
    ctx.strokeRect(132, 412, 1398, 250);

    ctx.fillStyle = '#64748B';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('LOGEMENT / LOYER VISE', 176, 470);
    ctx.fillText('SITUATION & RESSOURCES', 840, 470);

    ctx.fillStyle = '#0D1B2A';
    ctx.font = '700 32px "Source Sans 3", "Segoe UI", sans-serif';
    const rentTxt = (el.candRent.value || 'Non precise').trim();
    const incTxt = (el.candIncome.value || 'Non precise').trim();
    ctx.fillText(rentTxt.slice(0, 36), 176, 524);
    ctx.fillText(incTxt.slice(0, 36), 840, 524);

    ctx.fillStyle = '#475569';
    ctx.font = '400 24px "JetBrains Mono", monospace';
    ctx.fillText('Date de constitution : ' + DP.formatDateFR(new Date()), 176, 610);
    ctx.fillText('Volume total : ' + indexEntries.length + ' piece(s) • ' + totalPages + ' page(s)', 840, 610);

    // Message de presentation optionnel
    let nextY = 740;
    const note = (el.candNote.value || '').trim();
    if (note) {
      ctx.fillStyle = '#0D1B2A';
      ctx.font = '700 26px "Space Grotesk", sans-serif';
      ctx.fillText('Note au proprietaire / agence', 132, nextY);
      nextY += 44;

      ctx.fillStyle = '#334155';
      ctx.font = '400 27px "Source Sans 3", sans-serif';
      const words = note.split(/\s+/);
      let line = '';
      let linesDrawn = 0;
      for (let w = 0; w < words.length; w++) {
        const test = line ? line + ' ' + words[w] : words[w];
        if (ctx.measureText(test).width > 1360 && line) {
          ctx.fillText(line, 132, nextY);
          nextY += 40;
          line = words[w];
          linesDrawn++;
          if (linesDrawn >= 4) break;
        } else {
          line = test;
        }
      }
      if (line && linesDrawn < 4) {
        ctx.fillText(line, 132, nextY);
        nextY += 56;
      }
    }

    // Sommaire auto-indexe des pieces jointes
    nextY += 20;
    ctx.fillStyle = '#0D1B2A';
    ctx.font = '700 36px "Space Grotesk", sans-serif';
    ctx.fillText('Sommaire des pieces justificatives', 132, nextY);
    nextY += 42;

    // En-tete tableau sommaire
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(132, nextY, 1398, 62);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('N°', 162, nextY + 39);
    ctx.fillText('INTITULE DE LA PIECE', 248, nextY + 39);
    ctx.fillText('PAGES', 1330, nextY + 39);
    nextY += 62;

    const maxRows = Math.min(indexEntries.length, 15);
    for (let i = 0; i < maxRows; i++) {
      const entry = indexEntries[i];
      const rowH = 68;
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F8F9FB';
      ctx.fillRect(132, nextY, 1398, rowH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(132, nextY, 1398, rowH);

      ctx.fillStyle = '#1D4ED8';
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText(String(i + 1).padStart(2, '0'), 162, nextY + 43);

      ctx.fillStyle = '#0D1B2A';
      ctx.font = '600 26px "Source Sans 3", sans-serif';
      ctx.fillText(entry.label.slice(0, 56), 248, nextY + 43);

      ctx.fillStyle = '#475569';
      ctx.font = '600 23px "JetBrains Mono", monospace';
      const pageLabel = entry.startPage === entry.endPage
        ? 'p. ' + entry.startPage
        : 'p. ' + entry.startPage + '–' + entry.endPage;
      ctx.fillText(pageLabel, 1330, nextY + 43);

      nextY += rowH;
    }

    if (indexEntries.length > maxRows) {
      ctx.fillStyle = '#64748B';
      ctx.font = 'italic 22px "Source Sans 3", sans-serif';
      ctx.fillText('+ ' + (indexEntries.length - maxRows) + ' autre(s) piece(s) jointe(s) dans le document.', 162, nextY + 42);
    }

    // Pied de page discret
    ctx.strokeStyle = '#D8DCE3';
    ctx.beginPath();
    ctx.moveTo(132, 2210);
    ctx.lineTo(1530, 2210);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '500 21px "JetBrains Mono", monospace';
    ctx.fillText('Assemble localement avec DossierPur.fr — 0 octet transmis sur serveur', 132, 2258);
    ctx.fillText('Page 1 / ' + totalPages, 1360, 2258);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('Generation page de garde impossible'));
        blob.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
      }, 'image/png');
    });
  }

  async function imageBytesToJpeg(file) {
    const url = URL.createObjectURL(file);
    const img = await new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Image illisible : ' + file.name)); };
      image.src = url;
    });
    URL.revokeObjectURL(url);

    const maxSide = 2000;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);

    const bytes = await new Promise(function (resolve, reject) {
      c.toBlob(function (b) {
        if (!b) return reject(new Error('Encodage image echoue'));
        b.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
      }, 'image/jpeg', 0.88);
    });
    return { bytes: bytes, width: c.width, height: c.height };
  }

  async function buildMergedPdf() {
    if (!items.length || !window.PDFLib) return;

    el.runBtn.disabled = true;
    setStatus('', 'Assemblage du dossier PDF unique en cours dans votre navigateur...');

    try {
      const includeCover = Boolean(el.coverToggle.checked);
      const outPdf = await window.PDFLib.PDFDocument.create();

      // Calcul des plages de pages pour le sommaire
      let cursorPage = includeCover ? 2 : 1;
      const indexEntries = items.map(function (item) {
        const entry = {
          label: (item.label || item.file.name).trim(),
          startPage: cursorPage,
          endPage: cursorPage + item.pages - 1
        };
        cursorPage += item.pages;
        return entry;
      });
      const totalPages = cursorPage - 1;

      if (includeCover) {
        const coverPng = await renderCoverPagePng(indexEntries, totalPages);
        const coverImg = await outPdf.embedPng(coverPng);
        const coverPage = outPdf.addPage([595.28, 841.89]);
        coverPage.drawImage(coverImg, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'pdf') {
          const srcPdf = await window.PDFLib.PDFDocument.load(item.bytes, { ignoreEncryption: true });
          const copied = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          copied.forEach(function (pg) { outPdf.addPage(pg); });
        } else {
          const imgData = await imageBytesToJpeg(item.file);
          const jpg = await outPdf.embedJpg(imgData.bytes);
          const landscape = imgData.width > imgData.height;
          const pageW = landscape ? 841.89 : 595.28;
          const pageH = landscape ? 595.28 : 841.89;
          const margin = 28;
          const fit = Math.min((pageW - margin * 2) / imgData.width, (pageH - margin * 2) / imgData.height);
          const drawW = imgData.width * fit;
          const drawH = imgData.height * fit;
          const pg = outPdf.addPage([pageW, pageH]);
          pg.drawImage(jpg, {
            x: (pageW - drawW) / 2,
            y: (pageH - drawH) / 2,
            width: drawW,
            height: drawH
          });
        }
      }

      const finalBytes = await outPdf.save({ useObjectStreams: true });
      mergedBlob = new Blob([finalBytes], { type: 'application/pdf' });

      el.resPages.textContent = String(totalPages);
      el.resSize.textContent = DP.formatBytes(mergedBlob.size);
      el.resDocs.textContent = String(items.length) + (includeCover ? ' + garde' : '');
      el.resultBox.style.display = 'block';

      if (mergedBlob.size > 5 * 1024 * 1024) {
        setStatus('warn',
          '<div><strong>Dossier assemble (' + DP.formatBytes(mergedBlob.size) + ').</strong> Ce fichier depasse 5 Mo : certaines plateformes immobilieres plafonnent a 5 Mo. Vous pouvez le reduire en 1 clic avec notre <a href="compresser-pdf-ants.html">compresseur PDF a taille cible</a>.</div>'
        );
      } else {
        setStatus('success',
          '<div><strong>Dossier locatif pret (' + totalPages + ' pages, ' + DP.formatBytes(mergedBlob.size) + ').</strong> Cliquez sur « Telecharger le dossier PDF » ci-dessous.</div>'
        );
      }
    } catch (err) {
      setStatus('error', '<strong>Erreur pendant l\'assemblage :</strong> ' + escapeHtml(err.message));
    } finally {
      el.runBtn.disabled = false;
    }
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    el.coverToggle.addEventListener('change', function () {
      el.coverFields.style.display = el.coverToggle.checked ? 'block' : 'none';
      renderList();
    });

    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files.length) {
        addFiles(el.fileInput.files);
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
        addFiles(e.dataTransfer.files);
      }
    });

    el.sampleBtn.addEventListener('click', async function () {
      el.sampleBtn.disabled = true;
      setStatus('', 'Generation locale de 3 pieces locatives specimens (2 PDF + 1 photo)...');
      try {
        const files = await DP.samples.createSampleRentalFiles();
        await addFiles(files);
      } finally {
        el.sampleBtn.disabled = false;
      }
    });

    el.clearBtn.addEventListener('click', function () {
      items.forEach(function (x) { if (x.thumbUrl) URL.revokeObjectURL(x.thumbUrl); });
      items = [];
      renderList();
      setStatus('', 'Liste videe. Deposez de nouveaux documents pour commencer.');
    });

    el.runBtn.addEventListener('click', buildMergedPdf);

    el.downloadBtn.addEventListener('click', function () {
      if (!mergedBlob) return;
      const slug = DP.sanitizeFilename(el.candName.value || 'dossier-locatif');
      DP.downloadBlob(mergedBlob, 'dossier-locatif-' + slug + '.pdf');
    });

    renderList();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
