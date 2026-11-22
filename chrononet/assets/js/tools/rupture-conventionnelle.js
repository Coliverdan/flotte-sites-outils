/* ==========================================================================
   CHRONONET — Outil 05 : Simulateur Indemnité Rupture Conventionnelle 2026
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const PASS_2026 = 47100; // Plafond annuel Sécurité sociale de référence
  const DIVISEUR_DIFFERE_FT = 109.6; // Diviseur France Travail indexé 2026

  const els = {
    typeBtns: document.querySelectorAll('[data-rc-type]'),
    moy12: document.getElementById('rc-moy-12'),
    moy3: document.getElementById('rc-moy-3'),
    annees: document.getElementById('rc-annees'),
    anneesRange: document.getElementById('rc-annees-range'),
    mois: document.getElementById('rc-mois'),
    supraLegale: document.getElementById('rc-supra'),
    cpRestants: document.getElementById('rc-cp-restants'),

    outSalRef: document.getElementById('rc-out-salref'),
    outLegale: document.getElementById('rc-out-legale'),
    outTotalBrut: document.getElementById('rc-out-total-brut'),
    outNetPercu: document.getElementById('rc-out-net-percu'),
    outCsg: document.getElementById('rc-out-csg'),
    outForfaitEmp: document.getElementById('rc-out-forfait-emp'),
    outDiffereTotal: document.getElementById('rc-out-differe-total'),
    outDiffereDetail: document.getElementById('rc-out-differe-detail'),
    outFormuleDetail: document.getElementById('rc-out-formule'),
    canvas: document.getElementById('rc-chart')
  };

  if (!els.moy12) return;

  let ruptureType = 'rupture'; // 'rupture' ou 'licenciement'

  function drawChart(d) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const bars = [
      { label: 'Indemnité légale minimale', val: d.indemniteLegale, color: '#141413' },
      { label: 'Indemnité totale brute', val: d.totalBrut, color: '#55554F' },
      { label: 'Net perçu par le salarié', val: d.netPercu, color: '#1E6B45' },
      { label: 'Coût total employeur', val: d.coutEmployeur, color: '#D9381E' }
    ];

    const maxV = Math.max.apply(null, bars.map(function (b) { return b.val; }).concat([1000])) * 1.18;
    const padL = 16;
    const padR = 100;
    const padT = 16;
    const step = (height - padT - 12) / bars.length;

    bars.forEach(function (b, idx) {
      const y = padT + idx * step;
      const maxW = Math.max(40, width - padL - padR);
      const w = Math.max(3, (b.val / maxV) * maxW);

      ctx.fillStyle = idx === 2 ? '#1E6B45' : (idx === 3 ? '#D9381E' : '#141413');
      ctx.font = (idx >= 2 ? '600 ' : '500 ') + '12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, padL, y);

      const barY = y + 17;
      const barH = 18;
      ctx.fillStyle = '#ECECE7';
      ctx.fillRect(padL, barY, maxW, barH);
      ctx.fillStyle = b.color;
      ctx.fillRect(padL, barY, w, barH);

      ctx.fillStyle = b.color;
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN.fmtEUR(b.val, 0), width - 12, barY + barH / 2);
    });
  }

  function render() {
    const moy12 = CN.clamp(els.moy12.value, 500, 35000);
    const moy3 = CN.clamp(els.moy3.value, 0, 35000);
    const salRef = Math.max(moy12, moy3);

    const annees = CN.clamp(els.annees.value, 0, 45);
    const mois = CN.clamp(els.mois.value, 0, 11);
    const anciennete = annees + mois / 12;

    const supraLegale = CN.clamp(els.supraLegale.value, 0, 250000);
    const cpRestants = CN.clamp(els.cpRestants.value, 0, 60);

    // Formule légale exacte (art. R1234-2 Code du travail)
    const tranche1 = Math.min(anciennete, 10);
    const tranche2 = Math.max(0, anciennete - 10);
    const indemniteLegale = (salRef * 0.25 * tranche1) + (salRef * (1 / 3) * tranche2);
    const totalBrut = indemniteLegale + supraLegale;

    // CSG/CRDS salarié (9,7% sur la fraction dépassant le minimum légal)
    // Plafond exonération cotisations sociales : 2 PASS
    const baseExonereeCotis = Math.min(totalBrut, 2 * PASS_2026);
    const cotisSupra = Math.max(0, totalBrut - 2 * PASS_2026) * 0.22;
    const csgCrds = supraLegale * 0.097;
    const netPercu = Math.max(0, totalBrut - csgCrds - cotisSupra);

    // Contribution patronale spécifique 30 % sur rupture conventionnelle (part exonérée de cotisations)
    const forfaitEmp = ruptureType === 'rupture' ? (baseExonereeCotis * 0.30) : 0;
    const coutEmployeur = totalBrut + forfaitEmp;

    // Différé France Travail
    const delaiAttente = 7;
    const differeSpecifique = Math.min(150, Math.floor(supraLegale / DIVISEUR_DIFFERE_FT));
    const differeCP = Math.round(cpRestants);
    const differeTotal = delaiAttente + differeSpecifique + differeCP;

    els.outSalRef.textContent =
      CN.fmtEUR(salRef, 0) + ' / mois (' + (moy3 > moy12 ? 'moyenne 3 mois retenue' : 'moyenne 12 mois retenue') + ')';
    els.outLegale.textContent = CN.fmtEUR(indemniteLegale, 0);
    els.outTotalBrut.textContent = CN.fmtEUR(totalBrut, 0);
    els.outNetPercu.textContent = CN.fmtEUR(netPercu, 0);
    els.outCsg.textContent = CN.fmtEUR(csgCrds + cotisSupra, 0);
    els.outForfaitEmp.textContent =
      ruptureType === 'rupture'
        ? CN.fmtEUR(forfaitEmp, 0) + ' (30 % employeur)'
        : '0 € (licenciement)';
    els.outDiffereTotal.textContent = differeTotal + ' jours calendaires';
    els.outDiffereDetail.textContent =
      '7 j d\'attente + ' + differeSpecifique + ' j supra-légal + ' + differeCP + ' j congés payés';

    els.outFormuleDetail.textContent =
      'Tranche 0–10 ans : ' + CN.fmtNum(tranche1, 2) + ' ans × 1/4 × ' + CN.fmtEUR(salRef, 0) +
      (tranche2 > 0
        ? '  +  Au-delà de 10 ans : ' + CN.fmtNum(tranche2, 2) + ' ans × 1/3 × ' + CN.fmtEUR(salRef, 0)
        : '');

    drawChart({
      indemniteLegale,
      totalBrut,
      netPercu,
      coutEmployeur
    });
  }

  els.typeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      ruptureType = btn.getAttribute('data-rc-type');
      els.typeBtns.forEach(function (b) {
        const active = b.getAttribute('data-rc-type') === ruptureType;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      render();
    });
  });

  CN.bindPair(els.anneesRange, els.annees, render);

  [els.moy12, els.moy3, els.mois, els.supraLegale, els.cpRestants].forEach(function (el) {
    if (el) el.addEventListener('input', render);
  });

  window.addEventListener('resize', render);
  render();
})();
