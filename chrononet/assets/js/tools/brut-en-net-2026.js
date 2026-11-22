/* ==========================================================================
   CHRONONET — Outil 04 : Convertisseur Salaire Brut <-> Net <-> Super-Brut 2026
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const STATUTS = {
    'non-cadre': { label: 'Salarié Non-cadre', sal: 0.22, pat: 0.42 },
    'cadre': { label: 'Salarié Cadre', sal: 0.25, pat: 0.45 },
    'fonction-publique': { label: 'Fonction publique', sal: 0.15, pat: 0.35 },
    'liberale': { label: 'Profession libérale', sal: 0.44, pat: 0.0 },
    'portage': { label: 'Portage salarial', sal: 0.48, pat: 0.0 }
  };

  // Barème progressif IR 2026 (1 part fiscale, seuils indexés)
  const TRANCHES_IR_2026 = [
    { max: 11497, rate: 0 },
    { max: 29315, rate: 0.11 },
    { max: 83823, rate: 0.30 },
    { max: 180294, rate: 0.41 },
    { max: Infinity, rate: 0.45 }
  ];

  const els = {
    statutBtns: document.querySelectorAll('[data-statut]'),
    heuresSem: document.getElementById('bn-heures-sem'),
    nbMois: document.getElementById('bn-nb-mois'),
    pasMode: document.getElementById('bn-pas-mode'),
    pasCustom: document.getElementById('bn-pas-custom'),
    pasCustomWrap: document.getElementById('bn-pas-custom-wrap'),

    brutHoraire: document.getElementById('bn-brut-horaire'),
    brutMensuel: document.getElementById('bn-brut-mensuel'),
    brutAnnuel: document.getElementById('bn-brut-annuel'),
    netMensuel: document.getElementById('bn-net-mensuel'),
    netAnnuel: document.getElementById('bn-net-annuel'),

    outNetApresIR: document.getElementById('bn-out-net-apres-ir'),
    outNetApresIRAn: document.getElementById('bn-out-net-apres-ir-an'),
    outSuperBrutMois: document.getElementById('bn-out-superbrut-mois'),
    outSuperBrutAn: document.getElementById('bn-out-superbrut-an'),
    outCotSal: document.getElementById('bn-out-cot-sal'),
    outCotPat: document.getElementById('bn-out-cot-pat'),
    outImpotMois: document.getElementById('bn-out-impot-mois'),
    outTauxPAS: document.getElementById('bn-out-taux-pas'),
    outTauxNetSuper: document.getElementById('bn-out-ratio'),

    segNet: document.getElementById('bn-seg-net'),
    segIR: document.getElementById('bn-seg-ir'),
    segSal: document.getElementById('bn-seg-sal'),
    segPat: document.getElementById('bn-seg-pat'),

    canvas: document.getElementById('bn-chart')
  };

  if (!els.brutAnnuel) return;

  let currentStatut = 'cadre';
  let brutAnnuelRef = 42000;

  function computeIR2026(netImposableAnnuel) {
    // Abattement forfaitaire 10% (min 495 €, max 14 426 €)
    const abattement = Math.min(14426, Math.max(495, netImposableAnnuel * 0.10));
    const rfr = Math.max(0, netImposableAnnuel - abattement);
    let impot = 0;
    let prev = 0;

    for (let i = 0; i < TRANCHES_IR_2026.length; i++) {
      const t = TRANCHES_IR_2026[i];
      if (rfr > prev) {
        const taxable = Math.min(rfr, t.max) - prev;
        impot += taxable * t.rate;
      }
      prev = t.max;
    }

    // Décote simplifiée célibataire 2026
    if (impot > 0 && impot < 1965) {
      const decote = 889 - impot * 0.4525;
      impot = Math.max(0, impot - Math.max(0, decote));
    }

    return impot;
  }

  function drawChart(d) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const items = [
      { label: 'Super-brut employeur', val: d.superBrutMois, color: '#8C8C84' },
      { label: 'Salaire brut mensuel', val: d.brutMois, color: '#55554F' },
      { label: 'Net avant impôt', val: d.netAvantIRMois, color: '#141413' },
      { label: 'Net après impôt (en poche)', val: d.netApresIRMois, color: '#D9381E' }
    ];

    const maxV = Math.max(d.superBrutMois, d.brutMois, 1) * 1.15;
    const padL = 16;
    const padR = 96;
    const padT = 16;
    const step = (height - padT - 12) / items.length;

    items.forEach(function (it, idx) {
      const y = padT + idx * step;
      const maxW = Math.max(40, width - padL - padR);
      const w = Math.max(3, (it.val / maxV) * maxW);

      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = (idx === 3 ? '600 ' : '500 ') + '12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(it.label, padL, y);

      const barY = y + 17;
      const barH = 18;
      ctx.fillStyle = '#ECECE7';
      ctx.fillRect(padL, barY, maxW, barH);
      ctx.fillStyle = it.color;
      ctx.fillRect(padL, barY, w, barH);

      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN.fmtEUR(it.val, 0), width - 12, barY + barH / 2);
    });
  }

  function syncInputs(skipField) {
    const st = STATUTS[currentStatut] || STATUTS.cadre;
    const hSem = CN.clamp(els.heuresSem.value, 10, 60);
    const nbMois = CN.clamp(els.nbMois.value, 12, 15);
    const heuresAn = hSem * 52;

    const brutAn = Math.max(0, brutAnnuelRef);
    const brutMois = brutAn / nbMois;
    const brutHoraire = brutAn / heuresAn;

    const netAvantIRAn = brutAn * (1 - st.sal);
    const netAvantIRMois = netAvantIRAn / nbMois;

    if (skipField !== 'brutHoraire') els.brutHoraire.value = brutHoraire.toFixed(2);
    if (skipField !== 'brutMensuel') els.brutMensuel.value = Math.round(brutMois);
    if (skipField !== 'brutAnnuel') els.brutAnnuel.value = Math.round(brutAn);
    if (skipField !== 'netMensuel') els.netMensuel.value = Math.round(netAvantIRMois);
    if (skipField !== 'netAnnuel') els.netAnnuel.value = Math.round(netAvantIRAn);

    // CSG/CRDS non déductible ~2.9% ajoutée au net imposable sur salariés classiques
    const netImposableAn = (currentStatut === 'liberale' || currentStatut === 'portage')
      ? netAvantIRAn
      : netAvantIRAn * 1.035;

    let impotAn = 0;
    let tauxPAS = 0;

    if (els.pasMode.value === 'custom') {
      tauxPAS = CN.clamp(els.pasCustom.value, 0, 45);
      impotAn = netAvantIRAn * (tauxPAS / 100);
    } else {
      impotAn = computeIR2026(netImposableAn);
      tauxPAS = netAvantIRAn > 0 ? (impotAn / netAvantIRAn) * 100 : 0;
    }

    const netApresIRAn = Math.max(0, netAvantIRAn - impotAn);
    const netApresIRMois = netApresIRAn / nbMois;
    const impotMois = impotAn / nbMois;

    const cotSalMois = brutMois * st.sal;
    const cotPatMois = brutMois * st.pat;
    const superBrutMois = brutMois + cotPatMois;
    const superBrutAn = brutAn * (1 + st.pat);

    els.outNetApresIR.textContent = CN.fmtEUR(netApresIRMois, 0) + ' / mois';
    els.outNetApresIRAn.textContent = CN.fmtEUR(netApresIRAn, 0) + ' / an (' + nbMois + ' mois)';
    els.outSuperBrutMois.textContent = CN.fmtEUR(superBrutMois, 0) + ' / mois';
    els.outSuperBrutAn.textContent = CN.fmtEUR(superBrutAn, 0) + ' / an';
    els.outCotSal.textContent = CN.fmtEUR(cotSalMois, 0) + ' / mois (' + Math.round(st.sal * 100) + ' %)';
    els.outCotPat.textContent = CN.fmtEUR(cotPatMois, 0) + ' / mois (' + Math.round(st.pat * 100) + ' %)';
    els.outImpotMois.textContent = CN.fmtEUR(impotMois, 0) + ' / mois';
    els.outTauxPAS.textContent = CN.fmtPct(tauxPAS, 1);

    const ratioPocket = superBrutMois > 0 ? (netApresIRMois / superBrutMois) * 100 : 0;
    els.outTauxNetSuper.textContent = CN.fmtPct(ratioPocket, 1) + ' du super-brut';

    // Barre empilée
    if (superBrutMois > 0) {
      els.segNet.style.width = ((netApresIRMois / superBrutMois) * 100).toFixed(2) + '%';
      els.segIR.style.width = ((impotMois / superBrutMois) * 100).toFixed(2) + '%';
      els.segSal.style.width = ((cotSalMois / superBrutMois) * 100).toFixed(2) + '%';
      els.segPat.style.width = ((cotPatMois / superBrutMois) * 100).toFixed(2) + '%';
    }

    drawChart({
      superBrutMois,
      brutMois,
      netAvantIRMois,
      netApresIRMois
    });
  }

  // Événements bidirectionnels
  els.brutHoraire.addEventListener('input', function () {
    const hSem = CN.clamp(els.heuresSem.value, 10, 60);
    brutAnnuelRef = CN.clamp(els.brutHoraire.value, 0, 500) * hSem * 52;
    syncInputs('brutHoraire');
  });

  els.brutMensuel.addEventListener('input', function () {
    const nbMois = CN.clamp(els.nbMois.value, 12, 15);
    brutAnnuelRef = CN.clamp(els.brutMensuel.value, 0, 50000) * nbMois;
    syncInputs('brutMensuel');
  });

  els.brutAnnuel.addEventListener('input', function () {
    brutAnnuelRef = CN.clamp(els.brutAnnuel.value, 0, 600000);
    syncInputs('brutAnnuel');
  });

  els.netMensuel.addEventListener('input', function () {
    const st = STATUTS[currentStatut] || STATUTS.cadre;
    const nbMois = CN.clamp(els.nbMois.value, 12, 15);
    const netAn = CN.clamp(els.netMensuel.value, 0, 40000) * nbMois;
    brutAnnuelRef = netAn / (1 - st.sal);
    syncInputs('netMensuel');
  });

  els.netAnnuel.addEventListener('input', function () {
    const st = STATUTS[currentStatut] || STATUTS.cadre;
    const netAn = CN.clamp(els.netAnnuel.value, 0, 500000);
    brutAnnuelRef = netAn / (1 - st.sal);
    syncInputs('netAnnuel');
  });

  els.statutBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentStatut = btn.getAttribute('data-statut');
      els.statutBtns.forEach(function (b) {
        const active = b.getAttribute('data-statut') === currentStatut;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      syncInputs(null);
    });
  });

  els.pasMode.addEventListener('change', function () {
    els.pasCustomWrap.style.display = els.pasMode.value === 'custom' ? 'block' : 'none';
    syncInputs(null);
  });

  [els.heuresSem, els.nbMois, els.pasCustom].forEach(function (el) {
    if (el) el.addEventListener('input', function () { syncInputs(null); });
  });

  window.addEventListener('resize', function () { syncInputs(null); });
  syncInputs(null);
})();
