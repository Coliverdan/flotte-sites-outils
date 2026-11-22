/* ==========================================================================
   DossierPur — Utilitaires communs, RGPD, Navigation & Generateurs d'exemples
   100 % Local Navigateur — Zero envoi reseau de documents
   ========================================================================== */

(function (window, document) {
  'use strict';

  const CONSENT_KEY = 'dossierpur_rgpd_consent_v1';

  /* ---------- Formatage FR & Fichiers ---------- */
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 o';
    if (bytes < 1024) return Math.round(bytes) + ' o';
    const kb = bytes / 1024;
    if (kb < 1024) {
      return kb.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' Ko';
    }
    const mb = kb / 1024;
    return mb.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mo';
  }

  function formatPercent(ratio) {
    if (!Number.isFinite(ratio)) return '0 %';
    return ratio.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' %';
  }

  function formatDateFR(date) {
    const d = date instanceof Date ? date : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  }

  function sanitizeFilename(name) {
    return String(name || 'document')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'document';
  }

  /* ---------- Telechargements locaux ---------- */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function exportCanvasPNG(canvas, filename) {
    return new Promise(function (resolve, reject) {
      if (!canvas || typeof canvas.toBlob !== 'function') {
        reject(new Error('Canvas invalide'));
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Echec export PNG'));
          return;
        }
        downloadBlob(blob, filename || 'dossierpur-export.png');
        resolve(blob);
      }, 'image/png');
    });
  }

  /* ---------- Configuration PDF.js ---------- */
  function ensurePdfJsWorker() {
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return true;
    }
    return false;
  }

  /* ---------- Navigation Mobile ---------- */
  function initNavigation() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-main-nav]');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', function (evt) {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(evt.target) && !toggle.contains(evt.target)) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Accordeons FAQ ---------- */
  function initFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(function (item) {
      const btn = item.querySelector('.faq-question');
      if (!btn) return;
      btn.addEventListener('click', function () {
        const isOpen = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  /* ---------- Bandeau Cookies RGPD conforme AdSense ---------- */
  function getConsent() {
    try {
      const raw = window.localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(acceptedAds) {
    const payload = {
      essential: true,
      advertising: Boolean(acceptedAds),
      timestamp: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignore storage errors in private mode
    }
    document.documentElement.dataset.adConsent = acceptedAds ? 'granted' : 'denied';
  }

  function initCookieBanner() {
    const existing = getConsent();
    if (existing) {
      document.documentElement.dataset.adConsent = existing.advertising ? 'granted' : 'denied';
    }

    const prefix = document.body.dataset.rootPrefix || '';
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferences de confidentialite et cookies');
    banner.innerHTML =
      '<div class="cookie-banner__grid">' +
        '<div class="cookie-banner__text">' +
          '<strong>Vos PDF restent 100 % sur votre appareil — Gestion des cookies</strong>' +
          'Aucun fichier traite sur DossierPur n\'est transmis a un serveur. Nous utilisons uniquement le stockage local pour vos checklists et, avec votre accord, des cookies publicitaires (Google AdSense) afin de maintenir ce service gratuit. ' +
          '<a href="' + prefix + 'confidentialite.html">Politique de confidentialite</a>.' +
        '</div>' +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-cookie-refuse>Continuer sans accepter</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-cookie-accept>Accepter les cookies</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    function hideBanner() {
      banner.classList.remove('is-visible');
    }

    function showBanner() {
      banner.classList.add('is-visible');
    }

    if (!existing) {
      showBanner();
    }

    banner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
      saveConsent(true);
      hideBanner();
    });

    banner.querySelector('[data-cookie-refuse]').addEventListener('click', function () {
      saveConsent(false);
      hideBanner();
    });

    document.querySelectorAll('[data-open-cookie-prefs]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        showBanner();
      });
    });
  }

  /* ---------- Inspecteur 0-Octet sur la page d'accueil ---------- */
  function initHomeInspector() {
    const btn = document.getElementById('home-test-local-btn');
    const out = document.getElementById('home-test-output');
    if (!btn || !out) return;

    btn.addEventListener('click', function () {
      const start = performance.now();
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 400, 120);
      ctx.fillStyle = '#0D1B2A';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('TEST LOCAL DOSSIERPUR', 20, 50);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const elapsed = Math.max(1, Math.round(performance.now() - start));

      out.innerHTML =
        '<div class="status-banner is-success" style="margin-top:16px;margin-bottom:0">' +
          '<div><strong>Diagnostic local valide (' + elapsed + ' ms)</strong><br>' +
          'Traitement Canvas/PDF disponible dans votre navigateur (' + formatBytes(dataUrl.length) + ' traites en memoire RAM, <strong>0 octet envoye</strong> sur le reseau).</div>' +
        '</div>';
    });
  }

  /* ==========================================================================
     Generateurs de Documents Exemples 100 % Locaux (Canvas + pdf-lib)
     ========================================================================== */
  function drawAdminPageCanvas(pageIndex, title, subtitle, lines, addNoiseTexture) {
    const canvas = document.createElement('canvas');
    // Resolution A4 elevee (~160 DPI) pour generer un PDF realiste et assez lourd
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext('2d');

    // Fond papier blanc legerement casse
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texture subtile si demande (augmente le poids reel du fichier pour tester la compression ANTS)
    if (addNoiseTexture) {
      ctx.fillStyle = '#F7F8FA';
      for (let y = 0; y < canvas.height; y += 6) {
        for (let x = 0; x < canvas.width; x += 6) {
          if (((x * 13 + y * 7 + pageIndex * 31) % 19) === 0) {
            ctx.fillRect(x, y, 3, 3);
          }
        }
      }
    }

    // Bandeau superieur institutionnel
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(72, 72, canvas.width - 144, 120);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('DOCUMENT SPECIMEN — DOSSIERPUR', 108, 130);
    ctx.font = '22px monospace';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('PIECE FACTICE DE DEMONSTRATION • PAGE ' + (pageIndex + 1), 108, 168);

    // Titre de la piece
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(title, 72, 268);

    ctx.fillStyle = '#475569';
    ctx.font = '24px sans-serif';
    ctx.fillText(subtitle, 72, 312);

    // Trait de separation
    ctx.strokeStyle = '#D8DCE3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(72, 344);
    ctx.lineTo(canvas.width - 72, 344);
    ctx.stroke();

    // Encadre identite factice
    ctx.fillStyle = '#F4F5F7';
    ctx.fillRect(72, 380, canvas.width - 144, 180);
    ctx.strokeStyle = '#B4BCC8';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, 380, canvas.width - 144, 180);

    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Titulaire : Camille MARTIN (Exemple fictif)', 104, 430);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Adresse : 14 rue de la Republique, 69002 Lyon', 104, 474);
    ctx.fillText('Reference dossier : DP-2026-00' + (pageIndex + 1) + ' • Date : ' + formatDateFR(new Date()), 104, 518);

    // Tableau de donnees factices
    let y = 630;
    ctx.fillStyle = '#EAECEF';
    ctx.fillRect(72, y - 38, canvas.width - 144, 54);
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('RUBRIQUE ADMINISTRATIVE', 100, y - 4);
    ctx.fillText('VALEUR DECLAREE', 820, y - 4);

    y += 56;
    lines.forEach(function (pair, idx) {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#F8F9FB';
        ctx.fillRect(72, y - 34, canvas.width - 144, 52);
      }
      ctx.fillStyle = '#0D1B2A';
      ctx.font = '22px sans-serif';
      ctx.fillText(pair[0], 100, y);
      ctx.font = 'bold 22px monospace';
      ctx.fillText(pair[1], 820, y);
      y += 58;
    });

    // Graphique / bloc visuel riche (pour tester nettete & compression)
    const chartY = 1220;
    ctx.strokeStyle = '#D8DCE3';
    ctx.strokeRect(72, chartY, canvas.width - 144, 300);
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Synthese annuelle de reference (donnees fictives)', 104, chartY + 46);

    const bars = [140, 175, 160, 190, 210, 185, 205, 195];
    bars.forEach(function (h, i) {
      const bx = 110 + i * 126;
      const by = chartY + 260 - h;
      ctx.fillStyle = i % 2 === 0 ? '#1D4ED8' : '#0D1B2A';
      ctx.fillRect(bx, by, 72, h);
    });

    // Pied de page
    ctx.fillStyle = '#64748B';
    ctx.font = '18px monospace';
    ctx.fillText('SPECIMEN GENERE LOCALEMENT PAR DOSSIERPUR.FR — AUCUNE VALEUR LEGALE', 72, 1670);

    return canvas;
  }

  async function canvasToUint8Array(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Conversion canvas impossible'));
          return;
        }
        blob.arrayBuffer().then(function (buf) {
          resolve(new Uint8Array(buf));
        }, reject);
      }, mime, quality);
    });
  }

  async function createSampleHeavyPdf(pageCount) {
    if (!window.PDFLib) {
      throw new Error('La bibliotheque pdf-lib n\'est pas chargee.');
    }
    const count = Math.max(1, Math.min(pageCount || 4, 6));
    const docsMeta = [
      {
        title: 'Avis d\'imposition sur le revenu (Specimen)',
        sub: 'Direction fictive des finances publiques — Revenus 2025',
        rows: [
          ['Revenu fiscal de reference', '34 820 EUR'],
          ['Nombre de parts fiscales', '1,00 part'],
          ['Impot sur le revenu net', '2 140 EUR'],
          ['Taux de prelevement a la source', '6,1 %'],
          ['Situation declarée', 'Celibataire'],
          ['Statut verification', 'SPECIMEN LOCAL']
        ]
      },
      {
        title: 'Bulletin de paie mensuel (Specimen)',
        sub: 'Entreprise Exemple SAS — Periode : Octobre 2026',
        rows: [
          ['Salaire de base brut', '3 250,00 EUR'],
          ['Cotisations sociales salariales', '- 715,00 EUR'],
          ['Net a payer avant impot', '2 535,00 EUR'],
          ['Prelevement a la source', '- 154,60 EUR'],
          ['Net paye en euros', '2 380,40 EUR'],
          ['Contrat de travail', 'CDI Temps plein']
        ]
      },
      {
        title: 'Justificatif de domicile (Specimen)',
        sub: 'Fournisseur Energie Exemple — Facture bimestrielle',
        rows: [
          ['Numero de contrat', 'CTR-99284710'],
          ['Periode de facturation', '01/09/2026 - 31/10/2026'],
          ['Consommation relevee', '412 kWh'],
          ['Montant TTC facture', '98,40 EUR'],
          ['Statut reglement', 'ACQUITTE'],
          ['Adresse desservie', '14 rue Republique, Lyon']
        ]
      },
      {
        title: 'Attestation d\'hebergement / Employeur',
        sub: 'Document complementaire de demonstration administrative',
        rows: [
          ['Type de justificatif', 'Attestation sur l\'honneur'],
          ['Date d\'anciennete', '15/03/2022'],
          ['Poste occupe', 'Charge de projet'],
          ['Lieu de redaction', 'Lyon (69002)'],
          ['Validite administrative', '3 mois'],
          ['Origine fichier', 'Genere 100 % local']
        ]
      }
    ];

    const pdfDoc = await window.PDFLib.PDFDocument.create();
    for (let i = 0; i < count; i++) {
      const meta = docsMeta[i % docsMeta.length];
      const canvas = drawAdminPageCanvas(i, meta.title, meta.sub, meta.rows, true);
      // Utilise PNG sur les 2 premieres pages pour obtenir un poids realiste (> 2.4 Mo) pour tester la compression ANTS
      const bytes = await canvasToUint8Array(canvas, i < 2 ? 'image/png' : 'image/jpeg', 0.96);
      const img = i < 2 ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 points
      page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
    }
    const pdfBytes = await pdfDoc.save();
    return new File([pdfBytes], 'dossier-administratif-specimen.pdf', { type: 'application/pdf' });
  }

  async function createSampleIdentityImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#F0F4F8';
    ctx.fillRect(0, 0, 1080, 680);

    // Bordure securitaire style carte officielle factice
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 1040, 640);

    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(20, 20, 1040, 88);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('SPECIMEN — PIECE D\'IDENTITE DE DEMONSTRATION', 56, 75);

    // Cadre photo silhouette
    ctx.fillStyle = '#D8DCE3';
    ctx.fillRect(64, 150, 240, 310);
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(184, 260, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(184, 420, 86, Math.PI, 0);
    ctx.fill();

    // Informations fictives
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('NOM / SURNAME', 350, 185);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('MARTIN', 350, 224);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('PRENOMS / GIVEN NAMES', 350, 285);
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Camille, Jeanne', 350, 322);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('NE(E) LE / DATE OF BIRTH          NATIONALITE', 350, 386);
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('14 05 1994                        FRA', 350, 424);

    // Bande MRZ factice
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(48, 518, 984, 114);
    ctx.fillStyle = '#0D1B2A';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('IDFRA0000000000SPECIMEN<<<<<<<<<<<<<<<', 72, 566);
    ctx.fillText('9405148F3505142FRA<<<<<<<<<<<0MARTIN<<', 72, 608);

    const bytes = await canvasToUint8Array(canvas, 'image/png', 1);
    return new File([bytes], 'cni-specimen-factice.png', { type: 'image/png' });
  }

  async function createSampleScanPhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 1520;
    const ctx = canvas.getContext('2d');

    // Simule une photo smartphone un peu sombre / grisatre prise sur un bureau
    ctx.fillStyle = '#C9C4BA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Feuille legerement ombree
    ctx.fillStyle = '#DFDCD4';
    ctx.fillRect(54, 62, 992, 1396);

    ctx.fillStyle = '#2B2B2B';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('FACTURE JUSTIFICATIVE (PHOTO TEST)', 110, 160);

    ctx.fillStyle = '#4A4843';
    ctx.font = '24px sans-serif';
    ctx.fillText('Reference client : 8842-1190-DP   •   Date : ' + formatDateFR(new Date()), 110, 214);

    ctx.strokeStyle = '#7A766E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 248);
    ctx.lineTo(990, 248);
    ctx.stroke();

    const lines = [
      'Titulaire : Camille MARTIN',
      'Adresse : 14 rue de la Republique, 69002 Lyon',
      'Objet : Justificatif de domicile de moins de 3 mois',
      'Periode : Septembre - Octobre 2026',
      'Montant total TTC : 84,60 EUR (Regle par prelevement)',
      ' ',
      'Note : Cette image simule une prise de vue smartphone',
      'a faible contraste afin de tester le filtre',
      'Mode Scan N&B haute lisibilite de DossierPur.'
    ];

    let y = 330;
    ctx.font = '26px sans-serif';
    lines.forEach(function (line) {
      ctx.fillStyle = '#33312E';
      ctx.fillText(line, 110, y);
      y += 66;
    });

    // Tableau simule
    ctx.strokeRect(110, 960, 880, 280);
    ctx.fillStyle = '#3B3935';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ABONNEMENT MENSUEL              18,20 EUR', 140, 1020);
    ctx.fillText('CONSOMMATION PERIODE            52,30 EUR', 140, 1085);
    ctx.fillText('TAXES ET CONTRIBUTIONS          14,10 EUR', 140, 1150);
    ctx.fillText('TOTAL TTC PAYE                  84,60 EUR', 140, 1215);

    const bytes = await canvasToUint8Array(canvas, 'image/jpeg', 0.88);
    return new File([bytes], 'photo-facture-smartphone.jpg', { type: 'image/jpeg' });
  }

  async function createSampleRentalFiles() {
    const pdf1 = await createSampleHeavyPdf(1);
    const pdf2Raw = await createSampleHeavyPdf(2);
    const pdf2 = new File([await pdf2Raw.arrayBuffer()], 'bulletins-paie-specimen.pdf', { type: 'application/pdf' });
    const img1 = await createSampleScanPhoto();
    return [
      new File([await pdf1.arrayBuffer()], 'avis-imposition-specimen.pdf', { type: 'application/pdf' }),
      pdf2,
      img1
    ];
  }

  /* ---------- Export global ---------- */
  window.DossierPur = {
    formatBytes: formatBytes,
    formatPercent: formatPercent,
    formatDateFR: formatDateFR,
    sanitizeFilename: sanitizeFilename,
    downloadBlob: downloadBlob,
    exportCanvasPNG: exportCanvasPNG,
    ensurePdfJsWorker: ensurePdfJsWorker,
    samples: {
      createSampleHeavyPdf: createSampleHeavyPdf,
      createSampleIdentityImage: createSampleIdentityImage,
      createSampleScanPhoto: createSampleScanPhoto,
      createSampleRentalFiles: createSampleRentalFiles
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initFaq();
    initCookieBanner();
    initHomeInspector();
  });
})(window, document);
