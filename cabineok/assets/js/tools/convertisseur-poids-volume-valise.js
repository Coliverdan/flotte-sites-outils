/* ==========================================================================
   OUTIL 6 — Convertisseur Litres ↔ Dimensions Valise, Règle 158 cm & Poids
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-volume-weight');
    if (!root) return;

    // Part A: Dimensions <-> Volume + 158 cm Rule
    const dimH = document.getElementById('vol-h');
    const dimW = document.getElementById('vol-w');
    const dimD = document.getElementById('vol-d');
    const shellType = document.getElementById('vol-shell');
    const quickSizes = document.querySelectorAll('[data-valise-size]');

    const outGrossL = document.getElementById('out-gross-litres');
    const outNetL = document.getElementById('out-net-litres');
    const outLinear = document.getElementById('out-linear-cm');
    const outCat = document.getElementById('out-suitcase-cat');
    const rule158Callout = document.getElementById('rule-158-callout');

    // Reverse volume slider
    const targetLitresInput = document.getElementById('target-litres');
    const targetLitresVal = document.getElementById('target-litres-val');
    const reverseSuggestion = document.getElementById('reverse-dims-suggestion');

    // Part B: kg <-> lbs
    const kgInput = document.getElementById('conv-kg');
    const lbsInput = document.getElementById('conv-lbs');
    const weightQuickBtns = document.querySelectorAll('[data-quick-kg]');

    // Part C: Stay weight estimator
    const daysInput = document.getElementById('pack-days');
    const daysVal = document.getElementById('pack-days-val');
    const seasonSel = document.getElementById('pack-season');
    const emptyBagSel = document.getElementById('pack-empty-bag');
    const gearChecks = document.querySelectorAll('[data-gear-kg]');

    const estTotalKgEl = document.getElementById('est-total-kg');
    const estTotalLbsEl = document.getElementById('est-total-lbs');
    const estVerdictEl = document.getElementById('est-verdict-badge');
    const estBreakdownEl = document.getElementById('est-breakdown');
    const estMeterFill = document.getElementById('est-meter-fill');

    function updateVolumeCalc() {
      const h = Math.max(10, Number(dimH.value) || 0);
      const w = Math.max(10, Number(dimW.value) || 0);
      const d = Math.max(5, Number(dimD.value) || 0);
      const factor = shellType.value === 'hard' ? 0.86 : 0.94;

      const grossL = (h * w * d) / 1000;
      const netL = grossL * factor;
      const linear = h + w + d;

      outGrossL.textContent = CabineOK.formatNum(grossL, 1) + ' L';
      outNetL.textContent = CabineOK.formatNum(netL, 1) + ' L';
      outLinear.textContent = CabineOK.formatNum(linear, 1) + ' cm';

      let category = 'Sac personnel / Mini';
      if (h >= 75 || grossL >= 95) category = 'Très grande valise soute (XL)';
      else if (h >= 66 || grossL >= 68) category = 'Grande valise soute (L)';
      else if (h >= 58 || grossL >= 48) category = 'Valise moyenne soute (M)';
      else if (h >= 46 || grossL >= 28) category = 'Valise / Sac Cabine (S)';

      outCat.textContent = category;

      if (linear <= 115) {
        rule158Callout.className = 'callout callout-ok';
        rule158Callout.innerHTML = '<strong>Format Cabine (≤ 115 cm linéaires) & Soute OK :</strong> la somme H + L + P est de <span class="mono">' + CabineOK.formatNum(linear, 1) + ' cm</span>. Compatible avec la règle internationale des 115 cm (cabine) et 158 cm (soute).';
      } else if (linear <= 158) {
        rule158Callout.className = 'callout callout-ok';
        rule158Callout.innerHTML = '<strong>Conforme Soute Internationale (≤ 158 cm linéaires) :</strong> somme H + L + P = <span class="mono">' + CabineOK.formatNum(linear, 1) + ' cm</span> (marge de <span class="mono">' + CabineOK.formatNum(158 - linear, 1) + ' cm</span> avant supplément bagage hors-format). Trop grand pour la cabine.';
      } else {
        rule158Callout.className = 'callout callout-fail';
        rule158Callout.innerHTML = '<strong>Hors-format Soute (> 158 cm linéaires) :</strong> somme H + L + P = <span class="mono">' + CabineOK.formatNum(linear, 1) + ' cm</span> (+<span class="mono">' + CabineOK.formatNum(linear - 158, 1) + ' cm</span>). La majorité des compagnies facturent un supplément bagage hors-gabarit (75 € à 200 € par trajet).';
      }
    }

    function updateReverseLitres() {
      const targetL = Number(targetLitresInput.value) || 40;
      targetLitresVal.textContent = targetL + ' L';
      // Standard suitcase aspect ratio roughly 1 : 0.68 : 0.42 => volume = 0.2856 * h^3
      const grossNeed = targetL / 0.88;
      const h = Math.round(Math.cbrt((grossNeed * 1000) / (1 * 0.68 * 0.42)));
      const w = Math.round(h * 0.68);
      const d = Math.round(h * 0.42);
      const lin = h + w + d;
      const stay = targetL <= 38 ? '2 à 4 jours (cabine)' : (targetL <= 65 ? '5 à 10 jours (soute M)' : (targetL <= 95 ? '2 semaines (soute L)' : '3 semaines+ ou famille (XL)'));

      reverseSuggestion.innerHTML =
        'Dimensions extérieures typiques pour <strong>' + targetL + ' L utiles</strong> : ' +
        '<span class="mono" style="font-weight:700;color:var(--accent);">' + h + ' × ' + w + ' × ' + d + ' cm</span> ' +
        '(somme <span class="mono">' + lin + ' cm</span>) · Séjour conseillé : <strong>' + stay + '</strong>.';
    }

    function updateFromKg() {
      const kg = Number(kgInput.value);
      if (Number.isNaN(kg)) return;
      lbsInput.value = Number((kg * 2.20462).toFixed(2));
    }

    function updateFromLbs() {
      const lbs = Number(lbsInput.value);
      if (Number.isNaN(lbs)) return;
      kgInput.value = Number((lbs / 2.20462).toFixed(2));
    }

    function updatePackingEstimator() {
      const days = Number(daysInput.value) || 5;
      daysVal.textContent = days + ' jour' + (days > 1 ? 's' : '');

      const emptyKg = Number(emptyBagSel.value) || 2.8;
      const season = seasonSel.value; // summer | mid | winter

      // Realistic clothing weight curve (logarithmic taper after 7 days assuming laundry/reuse)
      const effectiveDays = days <= 7 ? days : 7 + (days - 7) * 0.55;
      const clothesPerDay = season === 'summer' ? 0.55 : (season === 'mid' ? 0.82 : 1.15);
      const baseClothes = season === 'summer' ? 1.2 : (season === 'mid' ? 2.1 : 3.4);
      const clothesKg = Number((baseClothes + effectiveDays * clothesPerDay).toFixed(1));

      let gearKg = 0;
      const checkedNames = [];
      gearChecks.forEach((chk) => {
        if (chk.checked) {
          gearKg += Number(chk.getAttribute('data-gear-kg')) || 0;
          checkedNames.push(chk.getAttribute('data-gear-name'));
        }
      });
      gearKg = Number(gearKg.toFixed(1));

      const totalKg = Number((emptyKg + clothesKg + gearKg).toFixed(1));
      const totalLbs = Number((totalKg * 2.20462).toFixed(1));

      estTotalKgEl.textContent = CabineOK.formatNum(totalKg, 1) + ' kg';
      estTotalLbsEl.textContent = CabineOK.formatNum(totalLbs, 1) + ' lbs';

      let badgeClass = 'status-ok';
      let badgeText = 'OK CABINE (≤ 10 KG)';
      let fillClass = 'is-ok';

      if (totalKg <= 8) {
        badgeClass = 'status-ok';
        badgeText = 'OK CABINE STRICT (≤ 8 KG)';
      } else if (totalKg <= 10) {
        badgeClass = 'status-ok';
        badgeText = 'OK CABINE STANDARD (≤ 10 KG)';
      } else if (totalKg <= 12) {
        badgeClass = 'status-warn';
        badgeText = 'CABINE AIR FRANCE (≤ 12 KG) / TROP LOURD LOW-COST';
        fillClass = 'is-warn';
      } else if (totalKg <= 23) {
        badgeClass = 'status-info';
        badgeText = 'SOUTE STANDARD (≤ 23 KG)';
        fillClass = 'is-ok';
      } else if (totalKg <= 32) {
        badgeClass = 'status-fail';
        badgeText = 'EXCÉDENT SOUTE (> 23 KG)';
        fillClass = 'is-fail';
      } else {
        badgeClass = 'status-fail';
        badgeText = 'REFUSÉ SOUTE (> 32 KG MAX ABSOLU)';
        fillClass = 'is-fail';
      }

      estVerdictEl.className = 'status-badge ' + badgeClass;
      estVerdictEl.textContent = badgeText;

      estMeterFill.style.width = Math.min(100, (totalKg / 23) * 100) + '%';
      estMeterFill.className = 'meter-fill ' + fillClass;

      estBreakdownEl.innerHTML =
        '<div><strong>Valise / sac à vide :</strong> <span class="mono">' + CabineOK.formatNum(emptyKg, 1) + ' kg</span></div>' +
        '<div><strong>Vêtements & linge (' + days + ' j · ' + (season === 'summer' ? 'Été' : (season === 'mid' ? 'Mi-saison' : 'Hiver')) + ') :</strong> <span class="mono">' + CabineOK.formatNum(clothesKg, 1) + ' kg</span></div>' +
        '<div><strong>Équipements sélectionnés (' + checkedNames.length + ') :</strong> <span class="mono">' + CabineOK.formatNum(gearKg, 1) + ' kg</span></div>';
    }

    [dimH, dimW, dimD, shellType].forEach((el) => el.addEventListener('input', updateVolumeCalc));
    quickSizes.forEach((btn) => {
      btn.addEventListener('click', () => {
        const [h, w, d] = btn.getAttribute('data-valise-size').split('x');
        dimH.value = h;
        dimW.value = w;
        dimD.value = d;
        updateVolumeCalc();
      });
    });

    targetLitresInput.addEventListener('input', updateReverseLitres);
    kgInput.addEventListener('input', updateFromKg);
    lbsInput.addEventListener('input', updateFromLbs);

    weightQuickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        kgInput.value = btn.getAttribute('data-quick-kg');
        updateFromKg();
      });
    });

    [daysInput, seasonSel, emptyBagSel].forEach((el) => {
      el.addEventListener('input', updatePackingEstimator);
      el.addEventListener('change', updatePackingEstimator);
    });
    gearChecks.forEach((chk) => chk.addEventListener('change', updatePackingEstimator));

    updateVolumeCalc();
    updateReverseLitres();
    updateFromKg();
    updatePackingEstimator();
  });
})();
