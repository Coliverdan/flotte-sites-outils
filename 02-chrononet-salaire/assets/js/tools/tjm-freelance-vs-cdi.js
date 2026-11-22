/* ==========================================================================
   CHRONONET — Outil 06 : Convertisseur TJM Freelance <-> Équivalent CDI
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  // Taux effectifs sur résultat avant rémunération / CA
  const STATUTS_FREE = {
    'micro': {
      label: 'Micro-entreprise BNC',
      // 2026 : cotisations sociales BNC ~25,6% (réhaussement progressif 2024-2026) + CFP 0.2%
      // En micro, les frais pro ne sont pas déductibles de l'assiette URSSAF
      cotisRateOnCA: 0.258,
      plafondCA: 77700,
      deductFrais: false
    },
    'eurl': {
      label: 'EURL (Gérant TNS)',
      // Charges TNS ~44% du net => net = resultat / 1.44
      tnsMultiplier: 1.44,
      deductFrais: true
    },
    'sasu': {
      label: 'SASU (Assimilé salarié)',
      // Charges patronales + salariales ~82% du net => net = resultat / 1.82
      tnsMultiplier: 1.82,
      deductFrais: true
    }
  };

  const els = {
    dirBtns: document.querySelectorAll('[data-tjm-dir]'),
    boxCdi: document.getElementById('tjm-box-cdi'),
    boxFree: document.getElementById('tjm-box-free'),
    statutBtns: document.querySelectorAll('[data-tjm-statut]'),

    cdiBrut: document.getElementById('tjm-cdi-brut'),
    cdiBrutRange: document.getElementById('tjm-cdi-brut-range'),
    tjmInput: document.getElementById('tjm-input'),
    tjmRange: document.getElementById('tjm-range'),

    joursAn: document.getElementById('tjm-jours-an'),
    joursAnRange: document.getElementById('tjm-jours-an-range'),
    fraisMois: document.getElementById('tjm-frais-mois'),
    mutuelleMois: document.getElementById('tjm-mutuelle-mois'),
    avantagesCdiAn: document.getElementById('tjm-avantages-cdi'),

    outMainLabel: document.getElementById('tjm-out-main-label'),
    outMainVal: document.getElementById('tjm-out-main-val'),
    outMainSub: document.getElementById('tjm-out-main-sub'),
    outSecondaryVal: document.getElementById('tjm-out-sec-val'),
    outCaAn: document.getElementById('tjm-out-ca-an'),
    outNetMois: document.getElementById('tjm-out-net-mois'),
    outChargesAn: document.getElementById('tjm-out-charges-an'),
    outRatio: document.getElementById('tjm-out-ratio'),
    outWarning: document.getElementById('tjm-out-warning'),
    canvas: document.getElementById('tjm-chart')
  };

  if (!els.cdiBrut) return;

  let direction = 'cdi-to-tjm'; // ou 'tjm-to-cdi'
  let statut = 'eurl';

  function computeFromCA(caAn, fraisAn, mutuelleAn, stKey) {
    const st = STATUTS_FREE[stKey] || STATUTS_FREE.eurl;
    let chargesSociales = 0;
    let netAvantIRAn = 0;

    if (!st.deductFrais) {
      // Micro-entreprise : cotisations sur le CA brut, frais + mutuelle sortent du reste
      chargesSociales = caAn * st.cotisRateOnCA;
      netAvantIRAn = Math.max(0, caAn - chargesSociales - fraisAn - mutuelleAn);
    } else {
      // EURL / SASU : frais pro déduits du CA, puis charges sociales sur rémunération
      const resultatDispo = Math.max(0, caAn - fraisAn - mutuelleAn);
      netAvantIRAn = resultatDispo / st.tnsMultiplier;
      chargesSociales = resultatDispo - netAvantIRAn;
    }

    return { caAn, chargesSociales, netAvantIRAn };
  }

  function caNeededForNet(targetNetAn, fraisAn, mutuelleAn, stKey) {
    const st = STATUTS_FREE[stKey] || STATUTS_FREE.eurl;
    if (!st.deductFrais) {
      // net = ca * (1 - r) - frais - mutuelle  => ca = (net + frais + mutuelle) / (1 - r)
      return (targetNetAn + fraisAn + mutuelleAn) / (1 - st.cotisRateOnCA);
    }
    return (targetNetAn * st.tnsMultiplier) + fraisAn + mutuelleAn;
  }

  function drawChart(d) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const bars = [
      { label: 'CA annuel HT facturé', val: d.caAn, color: '#141413' },
      { label: 'Cotisations sociales / an', val: d.chargesSociales, color: '#8C8C84' },
      { label: 'Frais pro + prévoyance / an', val: d.fraisTotAn, color: '#55554F' },
      { label: 'Net avant impôt / an', val: d.netAvantIRAn, color: '#D9381E' }
    ];

    const maxV = Math.max(d.caAn, 10000) * 1.16;
    const padL = 16;
    const padR = 100;
    const padT = 16;
    const step = (height - padT - 12) / bars.length;

    bars.forEach(function (b, idx) {
      const y = padT + idx * step;
      const maxW = Math.max(40, width - padL - padR);
      const w = Math.max(3, (b.val / maxV) * maxW);

      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = (idx === 3 ? '600 ' : '500 ') + '12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, padL, y);

      const barY = y + 17;
      const barH = 18;
      ctx.fillStyle = '#ECECE7';
      ctx.fillRect(padL, barY, maxW, barH);
      ctx.fillStyle = b.color;
      ctx.fillRect(padL, barY, w, barH);

      ctx.fillStyle = idx === 3 ? '#D9381E' : '#141413';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN.fmtEUR(b.val, 0), width - 12, barY + barH / 2);
    });
  }

  function render() {
    const joursAn = CN.clamp(els.joursAn.value, 60, 240);
    const fraisAn = CN.clamp(els.fraisMois.value, 0, 5000) * 12;
    const mutuelleAn = CN.clamp(els.mutuelleMois.value, 0, 1500) * 12;
    const avantagesCdiAn = CN.clamp(els.avantagesCdiAn.value, 0, 15000);
    const fraisTotAn = fraisAn + mutuelleAn;

    let tjm = 0;
    let cdiBrutEq = 0;
    let sim = null;

    if (direction === 'cdi-to-tjm') {
      cdiBrutEq = CN.clamp(els.cdiBrut.value, 18000, 250000);
      // Net avant IR CDI cadre moyen (~75% du brut) + avantages perdus (mutuelle employeur, TR, intéressement)
      const targetNetAn = (cdiBrutEq * 0.75) + avantagesCdiAn;
      const caAn = caNeededForNet(targetNetAn, fraisAn, mutuelleAn, statut);
      tjm = caAn / joursAn;
      sim = computeFromCA(caAn, fraisAn, mutuelleAn, statut);

      els.outMainLabel.textContent = 'TJM MINIMUM À FACTURER (HT)';
      els.outMainVal.textContent = CN.fmtEUR(tjm, 0) + ' / j';
      els.outMainSub.textContent = 'Sur ' + joursAn + ' jours facturés / an en ' + STATUTS_FREE[statut].label;
      els.outSecondaryVal.textContent = CN.fmtEUR(cdiBrutEq, 0) + ' brut/an';
    } else {
      tjm = CN.clamp(els.tjmInput.value, 150, 2500);
      const caAn = tjm * joursAn;
      sim = computeFromCA(caAn, fraisAn, mutuelleAn, statut);
      // Équivalent CDI brut après déduction des avantages CDI
      const netComparableCdi = Math.max(0, sim.netAvantIRAn - avantagesCdiAn);
      cdiBrutEq = netComparableCdi / 0.75;

      els.outMainLabel.textContent = 'ÉQUIVALENT SALAIRE CDI BRUT';
      els.outMainVal.textContent = CN.fmtEUR(cdiBrutEq, 0) + ' / an';
      els.outMainSub.textContent = 'Soit ' + CN.fmtEUR(cdiBrutEq / 12, 0) + ' brut/mois (à niveau de vie égal)';
      els.outSecondaryVal.textContent = CN.fmtEUR(tjm, 0) + ' HT / jour';
    }

    const ratio = sim.caAn > 0 ? (sim.netAvantIRAn / sim.caAn) * 100 : 0;

    els.outCaAn.textContent = CN.fmtEUR(sim.caAn, 0) + ' HT / an';
    els.outNetMois.textContent = CN.fmtEUR(sim.netAvantIRAn / 12, 0) + ' / mois';
    els.outChargesAn.textContent = CN.fmtEUR(sim.chargesSociales, 0) + ' / an';
    els.outRatio.textContent = CN.fmtPct(ratio, 1) + ' du CA';

    if (statut === 'micro' && sim.caAn > STATUTS_FREE.micro.plafondCA) {
      els.outWarning.style.display = 'block';
      els.outWarning.textContent =
        'Attention plafond Micro-BNC : votre CA annuel (' + CN.fmtEUR(sim.caAn, 0) +
        ') dépasse le seuil légal de 77 700 € HT. Envisagez le passage en EURL ou SASU.';
    } else {
      els.outWarning.style.display = 'none';
    }

    drawChart({
      caAn: sim.caAn,
      chargesSociales: sim.chargesSociales,
      fraisTotAn,
      netAvantIRAn: sim.netAvantIRAn
    });
  }

  els.dirBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      direction = btn.getAttribute('data-tjm-dir');
      els.dirBtns.forEach(function (b) {
        const active = b.getAttribute('data-tjm-dir') === direction;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      els.boxCdi.style.display = direction === 'cdi-to-tjm' ? 'block' : 'none';
      els.boxFree.style.display = direction === 'tjm-to-cdi' ? 'block' : 'none';
      render();
    });
  });

  els.statutBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      statut = btn.getAttribute('data-tjm-statut');
      els.statutBtns.forEach(function (b) {
        const active = b.getAttribute('data-tjm-statut') === statut;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      render();
    });
  });

  CN.bindPair(els.cdiBrutRange, els.cdiBrut, render);
  CN.bindPair(els.tjmRange, els.tjmInput, render);
  CN.bindPair(els.joursAnRange, els.joursAn, render);

  [els.fraisMois, els.mutuelleMois, els.avantagesCdiAn].forEach(function (el) {
    if (el) el.addEventListener('input', render);
  });

  window.addEventListener('resize', render);
  render();
})();
