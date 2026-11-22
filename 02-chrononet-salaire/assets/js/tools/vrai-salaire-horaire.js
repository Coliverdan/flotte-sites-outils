/* ==========================================================================
   CHRONONET — Outil 01 : Calculateur du Vrai Salaire Horaire + Carte PNG
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const els = {
    salaireNet: document.getElementById('vsh-salaire-net'),
    salaireNetRange: document.getElementById('vsh-salaire-net-range'),
    heuresContrat: document.getElementById('vsh-heures-contrat'),
    heuresReelles: document.getElementById('vsh-heures-reelles'),
    heuresReellesRange: document.getElementById('vsh-heures-reelles-range'),
    trajetMin: document.getElementById('vsh-trajet-min'),
    trajetMinRange: document.getElementById('vsh-trajet-min-range'),
    prepMin: document.getElementById('vsh-prep-min'),
    joursSite: document.getElementById('vsh-jours-site'),
    joursSiteRange: document.getElementById('vsh-jours-site-range'),
    fraisTransport: document.getElementById('vsh-frais-transport'),
    fraisRepas: document.getElementById('vsh-frais-repas'),
    fraisAutres: document.getElementById('vsh-frais-autres'),

    outAffiche: document.getElementById('out-taux-affiche'),
    outVrai: document.getElementById('out-taux-vrai'),
    outEcart: document.getElementById('out-ecart-pct'),
    outTrajetHeures: document.getElementById('out-trajet-heures'),
    outTrajetJours: document.getElementById('out-trajet-jours'),
    outFraisAn: document.getElementById('out-frais-an'),
    outRevenuReelMois: document.getElementById('out-revenu-reel-mois'),
    outHeuresTotMois: document.getElementById('out-heures-tot-mois'),
    outVerdict: document.getElementById('out-verdict'),

    canvas: document.getElementById('vsh-chart'),
    btnExport: document.getElementById('vsh-export-png'),
    btnReset: document.getElementById('vsh-reset')
  };

  if (!els.salaireNet) return;

  const SEMAINES_TRAVAILLEES = 47; // 52 semaines - 5 semaines CP légaux
  let lastState = null;

  function readState() {
    const salaireNet = CN.clamp(els.salaireNet.value, 500, 25000);
    const heuresContrat = CN.clamp(els.heuresContrat.value, 10, 60);
    const heuresReelles = CN.clamp(els.heuresReelles.value, 10, 80);
    const trajetMin = CN.clamp(els.trajetMin.value, 0, 300);
    const prepMin = CN.clamp(els.prepMin.value, 0, 120);
    const joursSite = CN.clamp(els.joursSite.value, 0, 6);
    const fraisTransport = CN.clamp(els.fraisTransport.value, 0, 2000);
    const fraisRepas = CN.clamp(els.fraisRepas.value, 0, 1500);
    const fraisAutres = CN.clamp(els.fraisAutres.value, 0, 2500);

    const heuresContratMois = (heuresContrat * 52) / 12;
    const tauxAffiche = salaireNet / heuresContratMois;

    const salaireAnnuelNet = salaireNet * 12;
    const fraisMensuels = fraisTransport + fraisRepas + fraisAutres;
    const fraisAnnuels = fraisMensuels * 12;
    const revenuReelAnnuel = Math.max(0, salaireAnnuelNet - fraisAnnuels);
    const revenuReelMensuel = revenuReelAnnuel / 12;

    const heuresTravailAn = heuresReelles * SEMAINES_TRAVAILLEES;
    const heuresTrajetAn = (trajetMin / 60) * joursSite * SEMAINES_TRAVAILLEES;
    const joursTravailSem = Math.max(joursSite, 5);
    const heuresPrepAn = (prepMin / 60) * joursTravailSem * SEMAINES_TRAVAILLEES;
    const heuresTotalesAn = Math.max(1, heuresTravailAn + heuresTrajetAn + heuresPrepAn);

    const vraiTaux = revenuReelAnnuel / heuresTotalesAn;
    const ecartPct = ((vraiTaux - tauxAffiche) / tauxAffiche) * 100;
    const jours24hTrajet = heuresTrajetAn / 24;

    // Étapes intermédiaires pour la cascade explicative
    const tauxApresHeuresSup = salaireAnnuelNet / Math.max(1, heuresTravailAn);
    const tauxApresTempsInvisible = salaireAnnuelNet / heuresTotalesAn;

    return {
      salaireNet,
      heuresContrat,
      heuresReelles,
      trajetMin,
      prepMin,
      joursSite,
      fraisMensuels,
      fraisAnnuels,
      revenuReelMensuel,
      revenuReelAnnuel,
      tauxAffiche,
      tauxApresHeuresSup,
      tauxApresTempsInvisible,
      vraiTaux,
      ecartPct,
      heuresTravailAn,
      heuresTrajetAn,
      heuresPrepAn,
      heuresTotalesAn,
      heuresTotalesMois: heuresTotalesAn / 12,
      jours24hTrajet
    };
  }

  function drawChart(s) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const bars = [
      { label: 'Taux affiché (contrat)', value: s.tauxAffiche, color: '#141413' },
      { label: 'Après heures réelles', value: s.tauxApresHeuresSup, color: '#55554F' },
      { label: 'Après trajets + prép.', value: s.tauxApresTempsInvisible, color: '#8C8C84' },
      { label: 'Vrai taux horaire net', value: s.vraiTaux, color: '#D9381E' }
    ];

    const maxVal = Math.max(s.tauxAffiche, s.vraiTaux, 1) * 1.18;
    const padLeft = 16;
    const padRight = 84;
    const padTop = 18;
    const rowH = (height - padTop - 14) / bars.length;

    bars.forEach(function (b, idx) {
      const y = padTop + idx * rowH;
      const barMaxW = Math.max(40, width - padLeft - padRight);
      const barW = Math.max(2, (b.value / maxVal) * barMaxW);

      // Libellé au-dessus de la barre
      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = (idx === 3 ? '600 ' : '500 ') + '12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, padLeft, y);

      // Rail de fond
      const trackY = y + 18;
      const trackH = 18;
      ctx.fillStyle = '#ECECE7';
      ctx.fillRect(padLeft, trackY, barMaxW, trackH);

      // Barre pleine (aplat strict)
      ctx.fillStyle = b.color;
      ctx.fillRect(padLeft, trackY, barW, trackH);

      // Valeur chiffrée à droite
      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN.fmtEUR(b.value, 2) + '/h', width - 12, trackY + trackH / 2);
    });
  }

  function render() {
    const s = readState();
    lastState = s;

    els.outAffiche.textContent = CN.fmtEUR(s.tauxAffiche, 2) + ' / h';
    els.outVrai.textContent = CN.fmtEUR(s.vraiTaux, 2) + ' / h';
    els.outEcart.textContent =
      (s.ecartPct <= 0 ? '' : '+') + CN.fmtNum(s.ecartPct, 1) + ' % par rapport au taux affiché';
    els.outTrajetHeures.textContent = CN.fmtNum(s.heuresTrajetAn, 0) + ' h / an';
    els.outTrajetJours.textContent = 'Soit ' + CN.fmtNum(s.jours24hTrajet, 1) + ' jours de 24h';
    els.outFraisAn.textContent = CN.fmtEUR(s.fraisAnnuels, 0) + ' / an';
    els.outRevenuReelMois.textContent = CN.fmtEUR(s.revenuReelMensuel, 0) + ' / mois';
    els.outHeuresTotMois.textContent = CN.fmtNum(s.heuresTotalesMois, 0) + ' h / mois';

    const perteAbs = Math.max(0, s.tauxAffiche - s.vraiTaux);
    if (s.ecartPct <= -30) {
      els.outVerdict.textContent =
        'Érosion critique : vous perdez ' + CN.fmtEUR(perteAbs, 2) +
        ' par heure entre le temps invisible et les frais professionnels. Le télétravail ou une renégociation est prioritaire.';
    } else if (s.ecartPct <= -15) {
      els.outVerdict.textContent =
        'Érosion significative : vos trajets et frais amputent votre taux horaire de ' +
        CN.fmtNum(Math.abs(s.ecartPct), 1) + ' %. Chaque journée télétravaillée améliore nettement ce ratio.';
    } else {
      els.outVerdict.textContent =
        'Ratio maîtrisé : votre vrai taux horaire reste proche de votre rémunération contractuelle (' +
        CN.fmtNum(s.ecartPct, 1) + ' %).';
    }

    drawChart(s);
  }

  /* Génération Carte Bilan PNG 1080x1350 (Format LinkedIn / X / TikTok — Design Braun) */
  function generateShareCardPNG() {
    if (!lastState) render();
    const s = lastState;

    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1350;
    const ctx = c.getContext('2d');

    // Fond studio mat
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, 1080, 1350);

    // Cadre architectural extérieur
    ctx.strokeStyle = '#DCDCD6';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 984, 1254);

    // Bandeau supérieur
    ctx.fillStyle = '#141413';
    ctx.fillRect(48, 48, 984, 104);

    // Point vermillon marque
    ctx.fillStyle = '#D9381E';
    ctx.beginPath();
    ctx.arc(108, 100, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 34px "Syne", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHRONONET', 140, 100);

    ctx.fillStyle = '#A8A8A0';
    ctx.font = '500 22px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BILAN SALAIRE RÉEL • 2026', 984, 100);

    // Titre principal
    ctx.fillStyle = '#55554F';
    ctx.font = '600 22px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('01 / CONTRASTE HORAIRE', 96, 224);

    ctx.fillStyle = '#141413';
    ctx.font = '800 58px "Syne", sans-serif';
    ctx.fillText('Mon vrai salaire horaire', 96, 294);

    // Deux grands blocs comparatifs
    // Bloc gauche : Affiché
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(96, 360, 428, 260);
    ctx.strokeStyle = '#DCDCD6';
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 360, 428, 260);

    ctx.fillStyle = '#55554F';
    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillText('TAUX AFFICHÉ (CONTRAT)', 128, 412);

    ctx.fillStyle = '#141413';
    ctx.font = '600 72px "IBM Plex Mono", monospace';
    ctx.fillText(CN.fmtEUR(s.tauxAffiche, 2), 128, 505);

    ctx.fillStyle = '#55554F';
    ctx.font = '500 22px "DM Sans", sans-serif';
    ctx.fillText('par heure sur ' + CN.fmtNum(s.heuresContrat, 0) + 'h / sem.', 128, 575);

    // Bloc droit : Vrai taux (accent vermillon)
    ctx.fillStyle = '#141413';
    ctx.fillRect(556, 360, 428, 260);
    ctx.fillStyle = '#D9381E';
    ctx.fillRect(556, 360, 428, 12);

    ctx.fillStyle = '#B8B8B0';
    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillText('VRAI TAUX HORAIRE NET', 588, 412);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 72px "IBM Plex Mono", monospace';
    ctx.fillText(CN.fmtEUR(s.vraiTaux, 2), 588, 505);

    ctx.fillStyle = '#D9381E';
    ctx.font = '600 24px "IBM Plex Mono", monospace';
    ctx.fillText(CN.fmtNum(s.ecartPct, 1) + ' % réel', 588, 575);

    // Bloc central : 3 indicateurs chiffrés
    const metrics = [
      {
        label: 'TEMPS PERDU EN TRANSPORT / AN',
        val: CN.fmtNum(s.heuresTrajetAn, 0) + ' h',
        sub: 'Soit ' + CN.fmtNum(s.jours24hTrajet, 1) + ' jours complets de 24h'
      },
      {
        label: 'FRAIS LIÉS AU TRAVAIL / AN',
        val: CN.fmtEUR(s.fraisAnnuels, 0),
        sub: CN.fmtEUR(s.fraisMensuels, 0) + ' / mois (transport, repas, divers)'
      },
      {
        label: 'TEMPS DE VIE ENGAGÉ / MOIS',
        val: CN.fmtNum(s.heuresTotalesMois, 0) + ' h',
        sub: 'Travail réel + trajets + préparation'
      }
    ];

    metrics.forEach(function (m, i) {
      const y = 668 + i * 150;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(96, y, 888, 126);
      ctx.strokeStyle = '#DCDCD6';
      ctx.lineWidth = 2;
      ctx.strokeRect(96, y, 888, 126);

      ctx.fillStyle = '#D9381E';
      ctx.fillRect(96, y, 8, 126);

      ctx.fillStyle = '#55554F';
      ctx.font = '600 18px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(m.label, 132, y + 40);

      ctx.fillStyle = '#55554F';
      ctx.font = '400 22px "DM Sans", sans-serif';
      ctx.fillText(m.sub, 132, y + 84);

      ctx.fillStyle = '#141413';
      ctx.font = '600 44px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(m.val, 952, y + 66);
    });

    // Pied de carte
    ctx.strokeStyle = '#141413';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 1156);
    ctx.lineTo(984, 1156);
    ctx.stroke();

    ctx.fillStyle = '#141413';
    ctx.font = '700 28px "Syne", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Calculez le vôtre gratuitement sur chrononet.fr', 96, 1218);

    ctx.fillStyle = '#55554F';
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.fillText('BASE : ' + CN.fmtEUR(s.salaireNet, 0) + ' NET/MOIS • ' + s.joursSite + ' J/SEM SUR SITE • 47 SEM/AN', 96, 1260);

    CN.downloadCanvasPNG(c, 'chrononet-vrai-salaire-horaire.png');
    CN.toast('Carte Bilan 1080×1350 PNG téléchargée.');
  }

  // Liaisons
  CN.bindPair(els.salaireNetRange, els.salaireNet, render);
  CN.bindPair(els.heuresReellesRange, els.heuresReelles, render);
  CN.bindPair(els.trajetMinRange, els.trajetMin, render);
  CN.bindPair(els.joursSiteRange, els.joursSite, render);

  [els.heuresContrat, els.prepMin, els.fraisTransport, els.fraisRepas, els.fraisAutres].forEach(function (el) {
    if (el) el.addEventListener('input', render);
  });

  if (els.btnExport) {
    els.btnExport.addEventListener('click', generateShareCardPNG);
  }

  if (els.btnReset) {
    els.btnReset.addEventListener('click', function () {
      els.salaireNet.value = '2600';
      els.salaireNetRange.value = '2600';
      els.heuresContrat.value = '35';
      els.heuresReelles.value = '42';
      els.heuresReellesRange.value = '42';
      els.trajetMin.value = '70';
      els.trajetMinRange.value = '70';
      els.prepMin.value = '25';
      els.joursSite.value = '4';
      els.joursSiteRange.value = '4';
      els.fraisTransport.value = '160';
      els.fraisRepas.value = '140';
      els.fraisAutres.value = '60';
      render();
      CN.toast('Paramètres réinitialisés.');
    });
  }

  window.addEventListener('resize', function () {
    if (lastState) drawChart(lastState);
  });

  render();
})();
