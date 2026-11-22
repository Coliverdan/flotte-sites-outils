/* ==========================================================================
   Outil 6 — Verificateur de Poids & Checklist Dossier Administratif
   100 % Local Navigateur : Inspection PDF/Images + Sauvegarde localStorage
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DP = window.DossierPur;
  if (!DP) return;

  const STORAGE_KEY = 'dossierpur_checklist_state_v1';

  const PROCEDURES = {
    location: {
      id: 'location',
      title: 'Location appartement (Loi ALUR)',
      maxFileMB: 5.0,
      recommendedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      preferPdf: true,
      watermarkRecommended: true,
      limitNote: 'Plafond courant : 5 Mo par piece (DossierFacile & portails agences). Filigrane anti-usurpation vivement conseille.',
      checklist: [
        { id: 'loc_id', title: 'Piece d\'identite en cours de validite (CNI ou Passeport)', desc: 'Recto-verso lisible. Ajoutez imperativement un filigrane date.' },
        { id: 'loc_dom', title: 'Justificatif de domicile actuel', desc: '3 dernieres quittances de loyer, attestation d\'hebergement ou derniere taxe fonciere.' },
        { id: 'loc_pro', title: 'Justificatif de situation professionnelle', desc: 'Contrat de travail, attestation employeur de moins de 3 mois, carte etudiante ou Kbis.' },
        { id: 'loc_sal', title: '3 derniers bulletins de salaire', desc: 'Regroupes dans un seul PDF propre pour faciliter la lecture par le proprietaire.' },
        { id: 'loc_imp', title: 'Dernier avis d\'imposition (ou de non-imposition)', desc: 'Document complet telecharge depuis impots.gouv.fr (toutes les pages).' },
        { id: 'loc_gar', title: 'Dossier du garant ou attestation Visale (si applicable)', desc: 'Meme jeu de pieces filigranees pour la caution physique ou visa Visale.' }
      ]
    },
    ants: {
      id: 'ants',
      title: 'Passeport / CNI (ANTS)',
      maxFileMB: 2.0,
      recommendedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      preferPdf: false,
      watermarkRecommended: false,
      limitNote: 'Plafond strict ANTS : 2 Mo maximum par justificatif numerique. Formats PDF, JPG ou PNG acceptes.',
      checklist: [
        { id: 'ants_pre', title: 'Numero de pre-demande ANTS imprime ou en PDF', desc: 'Recapitulatif avec QR code genere sur passeport.ants.gouv.fr.' },
        { id: 'ants_dom', title: 'Justificatif de domicile de moins d\'un an', desc: 'Facture eau/electricite/box, avis d\'imposition ou quittance de loyer non manuscrite.' },
        { id: 'ants_anc', title: 'Ancien titre d\'identite (ou declaration de perte/vol)', desc: 'Original + copie numerique si renouvellement.' },
        { id: 'ants_tim', title: 'Timbre fiscal dematerialise (si passeport ou perte CNI)', desc: '86 EUR pour un passeport majeur, 25 EUR pour perte/vol de CNI.' },
        { id: 'ants_pho', title: 'Photo d\'identite conforme (moins de 6 mois)', desc: 'Realisee en cabine agreee ou chez un photographe (norme ISO/IEC 19794-5).' }
      ]
    },
    credit: {
      id: 'credit',
      title: 'Credit Immobilier (Banque / Courtier)',
      maxFileMB: 4.0,
      recommendedFormats: ['pdf'],
      preferPdf: true,
      watermarkRecommended: true,
      limitNote: 'Plafond courant des portails bancaires : 4 Mo par fichier. Format PDF complet exige (pas de capture d\'ecran tronquee).',
      checklist: [
        { id: 'crd_id', title: 'Pieces d\'identite des emprunteurs + livret de famille', desc: 'CNI/Passeport en cours de validite (filigrane « Reserve organisme bancaire »).' },
        { id: 'crd_imp', title: '2 derniers avis d\'imposition complets', desc: 'Indispensables pour verifier la stabilite des revenus fiscaux.' },
        { id: 'crd_sal', title: '3 derniers bulletins de paie + bulletin de decembre N-1', desc: 'Permet de calculer le cumul net imposable annuel.' },
        { id: 'crd_bq', title: '3 derniers releves de tous les comptes bancaires', desc: 'Releves mensuels officiels complets (comptes courants + epargne/apport).' },
        { id: 'crd_pro', title: 'Compromis de vente ou contrat de reservation signe', desc: 'Ainsi que les tableaux d\'amortissement des credits en cours.' },
        { id: 'crd_dom', title: 'Justificatif de domicile de moins de 3 mois', desc: 'Facture d\'energie, telecom ou derniere quittance.' }
      ]
    },
    universite: {
      id: 'universite',
      title: 'Inscription Universite / Parcoursup',
      maxFileMB: 2.0,
      recommendedFormats: ['pdf'],
      preferPdf: true,
      watermarkRecommended: false,
      limitNote: 'Plafond strict sur la majorite des ENT / Parcoursup / MonMaster : 2 Mo par piece, format PDF vivement conseille.',
      checklist: [
        { id: 'uni_cvec', title: 'Attestation d\'acquittement CVEC (CROUS)', desc: 'PDF officiel avec numero CVEC a 12 caracteres.' },
        { id: 'uni_bac', title: 'Releve de notes du Baccalaureat / Diplomes anterieurs', desc: 'Scanne proprement en A4 N&B pour rester leger (< 2 Mo).' },
        { id: 'uni_id', title: 'Piece d\'identite recto-verso', desc: 'Format PDF ou JPG clair, bords non coupes.' },
        { id: 'uni_jdc', title: 'Certificat individuel de participation a la JDC', desc: 'Obligatoire pour les etudiants de nationalite francaise de moins de 25 ans.' },
        { id: 'uni_rc', title: 'Attestation d\'assurance Responsabilite Civile', desc: 'Couvrant l\'annee universitaire en cours (stage / vie etudiante).' },
        { id: 'uni_brs', title: 'Notification conditionnelle de bourse CROUS (si boursier)', desc: 'Permet l\'exoneration des droits d\'inscription.' }
      ]
    }
  };

  let activeProcId = 'location';
  let inspectedFiles = []; // { id, file, ext, pages, sizeBytes }
  let nextFileId = 1;
  let checkedMap = loadChecklistState();

  const el = {};

  function bindElements() {
    el.procBtns = document.querySelectorAll('[data-proc-id]');
    el.procTitle = document.getElementById('chk-proc-title');
    el.procNote = document.getElementById('chk-proc-note');
    el.procLimitVal = document.getElementById('chk-proc-limit');
    el.dropzone = document.getElementById('chk-dropzone');
    el.fileInput = document.getElementById('chk-file-input');
    el.sampleBtn = document.getElementById('chk-sample-btn');
    el.clearFilesBtn = document.getElementById('chk-clear-files');
    el.filesList = document.getElementById('chk-files-list');
    el.filesEmpty = document.getElementById('chk-files-empty');
    el.filesSummary = document.getElementById('chk-files-summary');
    el.checklistWrap = document.getElementById('chk-list');
    el.progressFill = document.getElementById('chk-progress-fill');
    el.progressLabel = document.getElementById('chk-progress-label');
    el.resetChkBtn = document.getElementById('chk-reset-btn');
    el.printBtn = document.getElementById('chk-print-btn');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadChecklistState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveChecklistState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedMap));
    } catch (e) {
      // Ignore storage error
    }
  }

  function getActiveProc() {
    return PROCEDURES[activeProcId] || PROCEDURES.location;
  }

  function renderProcedureHeader() {
    const proc = getActiveProc();
    el.procTitle.textContent = proc.title;
    el.procNote.textContent = proc.limitNote;
    el.procLimitVal.textContent = proc.maxFileMB.toFixed(1).replace('.', ',') + ' Mo max / piece';
  }

  function renderChecklist() {
    const proc = getActiveProc();
    el.checklistWrap.innerHTML = '';
    let done = 0;

    proc.checklist.forEach(function (item) {
      const isChecked = Boolean(checkedMap[item.id]);
      if (isChecked) done++;

      const label = document.createElement('label');
      label.className = 'checklist-item' + (isChecked ? ' is-checked' : '');
      label.innerHTML =
        '<input type="checkbox" data-chk-item="' + item.id + '" ' + (isChecked ? 'checked' : '') + '>' +
        '<div>' +
          '<span class="checklist-item__title">' + escapeHtml(item.title) + '</span>' +
          '<span class="checklist-item__desc">' + escapeHtml(item.desc) + '</span>' +
        '</div>';
      el.checklistWrap.appendChild(label);
    });

    const total = proc.checklist.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    el.progressFill.style.width = pct + '%';
    el.progressLabel.textContent = done + ' / ' + total + ' pieces pretes (' + pct + ' %)';

    el.checklistWrap.querySelectorAll('[data-chk-item]').forEach(function (box) {
      box.addEventListener('change', function () {
        checkedMap[box.dataset.chkItem] = box.checked;
        saveChecklistState();
        renderChecklist();
      });
    });
  }

  function renderFilesInspection() {
    const proc = getActiveProc();
    const maxBytes = proc.maxFileMB * 1024 * 1024;
    el.filesList.innerHTML = '';

    const has = inspectedFiles.length > 0;
    el.filesEmpty.style.display = has ? 'none' : 'block';
    el.clearFilesBtn.disabled = !has;

    let okCount = 0;
    let warnCount = 0;
    let totalBytes = 0;

    inspectedFiles.forEach(function (entry) {
      totalBytes += entry.sizeBytes;
      const tooHeavy = entry.sizeBytes > maxBytes;
      const formatOk = proc.recommendedFormats.indexOf(entry.ext) !== -1;
      const preferConvert = proc.preferPdf && entry.ext !== 'pdf' && /^(jpe?g|png|webp)$/.test(entry.ext);

      let badgeHtml = '';
      const actions = [];

      if (tooHeavy) {
        warnCount++;
        badgeHtml = '<span class="badge badge-danger">Trop lourd (&gt; ' + proc.maxFileMB.toFixed(0) + ' Mo)</span>';
        actions.push('<a class="btn btn-primary btn-sm" href="compresser-pdf-ants.html">Compresser &lt; ' + proc.maxFileMB.toFixed(0) + ' Mo</a>');
      } else if (!formatOk) {
        warnCount++;
        badgeHtml = '<span class="badge badge-warn">Format .' + escapeHtml(entry.ext) + ' a convertir</span>';
        actions.push('<a class="btn btn-secondary btn-sm" href="images-vers-pdf.html">Convertir en PDF A4</a>');
      } else {
        okCount++;
        badgeHtml = '<span class="badge badge-trust">Conforme (' + DP.formatBytes(entry.sizeBytes) + ')</span>';
        if (preferConvert) {
          actions.push('<a class="btn btn-ghost btn-sm" href="images-vers-pdf.html">Convertir en PDF</a>');
        }
      }

      if (proc.watermarkRecommended) {
        actions.push('<a class="btn btn-ghost btn-sm" href="filigrane-securise.html">Filigraner</a>');
      }

      const row = document.createElement('div');
      row.className = 'file-item';
      row.style.flexWrap = 'wrap';
      row.innerHTML =
        '<div class="file-item__thumb">' + escapeHtml(entry.ext.toUpperCase().slice(0, 4)) + '</div>' +
        '<div class="file-item__meta">' +
          '<div class="file-item__name">' + escapeHtml(entry.file.name) + '</div>' +
          '<div class="file-item__sub">' +
            '<span class="mono">' + DP.formatBytes(entry.sizeBytes) + ' / ' + proc.maxFileMB.toFixed(1).replace('.', ',') + ' Mo</span>' +
            (entry.pages ? '<span>•</span><span class="mono">' + entry.pages + ' page(s)</span>' : '') +
            '<span>•</span>' +
            badgeHtml +
          '</div>' +
        '</div>' +
        '<div class="file-item__actions" style="flex-wrap:wrap">' +
          actions.join('') +
          '<button type="button" class="icon-btn icon-btn--danger" data-rm-file="' + entry.id + '" title="Retirer" aria-label="Retirer">×</button>' +
        '</div>';

      el.filesList.appendChild(row);
    });

    if (has) {
      el.filesSummary.innerHTML =
        '<span class="mono">' + inspectedFiles.length + ' fichier(s)</span> • ' +
        '<span class="mono">' + DP.formatBytes(totalBytes) + ' total</span> • ' +
        '<strong style="color:' + (warnCount ? '#B91C1C' : '#15803D') + '">' +
          (warnCount ? warnCount + ' anomalie(s) detectee(s)' : okCount + ' / ' + inspectedFiles.length + ' conformes') +
        '</strong>';
    } else {
      el.filesSummary.textContent = 'En attente de fichiers a inspecter';
    }

    el.filesList.querySelectorAll('[data-rm-file]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = parseInt(btn.dataset.rmFile, 10);
        inspectedFiles = inspectedFiles.filter(function (f) { return f.id !== id; });
        renderFilesInspection();
      });
    });
  }

  async function inspectFiles(fileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const extMatch = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : 'bin';
      let pages = null;

      if (ext === 'pdf' && window.PDFLib) {
        try {
          const ab = await file.arrayBuffer();
          const doc = await window.PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
          pages = doc.getPageCount();
        } catch (e) {
          pages = null;
        }
      }

      inspectedFiles.push({
        id: nextFileId++,
        file: file,
        ext: ext,
        pages: pages,
        sizeBytes: file.size
      });
    }
    renderFilesInspection();
  }

  function init() {
    bindElements();
    if (!el.dropzone) return;

    el.procBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.procBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        activeProcId = btn.dataset.procId;
        renderProcedureHeader();
        renderChecklist();
        renderFilesInspection();
      });
    });

    el.dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () {
      if (el.fileInput.files && el.fileInput.files.length) {
        inspectFiles(el.fileInput.files);
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
        inspectFiles(e.dataTransfer.files);
      }
    });

    el.sampleBtn.addEventListener('click', async function () {
      el.sampleBtn.disabled = true;
      try {
        const heavyPdf = await DP.samples.createSampleHeavyPdf(4);
        const photo = await DP.samples.createSampleScanPhoto();
        const smallPdf = await DP.samples.createSampleHeavyPdf(1);
        await inspectFiles([
          new File([await heavyPdf.arrayBuffer()], 'avis-imposition-lourd-specimen.pdf', { type: 'application/pdf' }),
          new File([await smallPdf.arrayBuffer()], 'quittance-loyer-conforme.pdf', { type: 'application/pdf' }),
          photo
        ]);
      } finally {
        el.sampleBtn.disabled = false;
      }
    });

    el.clearFilesBtn.addEventListener('click', function () {
      inspectedFiles = [];
      renderFilesInspection();
    });

    el.resetChkBtn.addEventListener('click', function () {
      const proc = getActiveProc();
      proc.checklist.forEach(function (item) {
        delete checkedMap[item.id];
      });
      saveChecklistState();
      renderChecklist();
    });

    if (el.printBtn) {
      el.printBtn.addEventListener('click', function () {
        window.print();
      });
    }

    renderProcedureHeader();
    renderChecklist();
    renderFilesInspection();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
