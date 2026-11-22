/* ==========================================================================
   Outil 02 — Calculateur Ration Journalière de Croquettes (g/jour)
   Formule vétérinaire RER = 70 × poids^0.75 ; DER = RER × k (WSAVA / FEDIAF)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const UI = window.PattesUI;
    if (!UI) return;

    const speciesBtns = document.querySelectorAll('[data-ration-species]');
    const elWeightRange = document.getElementById('weight-range');
    const elWeightInput = document.getElementById('weight-input');
    const elStage = document.getElementById('life-stage');
    const elNeutered = document.getElementById('is-neutered');
    const elActivity = document.getElementById('activity-level');
    const elGoal = document.getElementById('weight-goal');
    const elKcalKg = document.getElementById('kibble-kcal');
    const elBagKg = document.getElementById('bag-kg');
    const elBagPrice = document.getElementById('bag-price');

    /* Sorties */
    const outGramsDay = document.getElementById('out-grams-day');
    const outMealsSub = document.getElementById('out-meals-sub');
    const outDerKcal = document.getElementById('out-der-kcal');
    const outRerSub = document.getElementById('out-rer-sub');
    const outBagDays = document.getElementById('out-bag-days');
    const outBagWeeks = document.getElementById('out-bag-weeks');
    const outMonthCost = document.getElementById('out-month-cost');
    const outDayCost = document.getElementById('out-day-cost');
    const outFormulaLive = document.getElementById('out-formula-live');
    const outVetNote = document.getElementById('out-vet-note');
    const chartCanvas = document.getElementById('ration-chart');

    let species = 'chien';

    function getFactorK(sp, stage, neutered, activity, goal) {
      let k = 1.6;

      if (sp === 'chien') {
        if (stage === 'jeune') {
          k = 2.6;
        } else if (stage === 'croissance') {
          k = 2.0;
        } else if (stage === 'senior') {
          k = neutered ? 1.25 : 1.4;
          if (activity === 'calme') k -= 0.1;
          if (activity === 'sportif') k += 0.2;
        } else {
          /* Adulte */
          k = neutered ? 1.5 : 1.8;
          if (activity === 'calme') k -= 0.25;
          if (activity === 'sportif') k += 0.45;
        }
      } else {
        /* Chat */
        if (stage === 'jeune') {
          k = 2.5;
        } else if (stage === 'croissance') {
          k = 2.0;
        } else if (stage === 'senior') {
          k = neutered ? 1.05 : 1.2;
          if (activity === 'calme') k -= 0.08;
          if (activity === 'sportif') k += 0.15;
        } else {
          k = neutered ? 1.15 : 1.4;
          if (activity === 'calme') k -= 0.15;
          if (activity === 'sportif') k += 0.25;
        }
      }

      if (goal === 'perte' && stage !== 'jeune' && stage !== 'croissance') {
        k *= 0.82;
      } else if (goal === 'prise') {
        k *= 1.15;
      }

      return Math.max(0.85, Number(k.toFixed(2)));
    }

    function drawRationChart(gramsDay, bagKg, bagPrice) {
      if (!chartCanvas) return;
      const W = 640;
      const H = 220;
      const ctx = UI.setupCanvas(chartCanvas, W, H);

      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      const bags = species === 'chien'
        ? [3, 7, 12, 15]
        : [1.5, 3, 7, 10];

      if (bags.indexOf(bagKg) === -1 && bagKg > 0) {
        bags[bags.length - 1] = bagKg;
        bags.sort(function (a, b) { return a - b; });
      }

      const durations = bags.map(function (kg) {
        return Math.max(1, Math.round((kg * 1000) / Math.max(gramsDay, 1)));
      });
      const maxDays = Math.max.apply(null, durations) || 1;

      ctx.fillStyle = '#231B15';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('AUTONOMIE SELON LE FORMAT DE SAC (EN JOURS)', 16, 26);

      const padL = 86;
      const padR = 96;
      const barMaxW = W - padL - padR;

      bags.forEach(function (kg, i) {
        const y = 50 + i * 40;
        const days = durations[i];
        const barW = Math.max(12, (days / maxDays) * barMaxW);
        const isCurrent = Math.abs(kg - bagKg) < 0.05;

        ctx.fillStyle = isCurrent ? '#B84A27' : '#231B15';
        ctx.font = (isCurrent ? '700' : '600') + ' 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Sac ' + UI.formatDecimal(kg, kg % 1 === 0 ? 0 : 1) + ' kg', 16, y + 15);

        ctx.fillStyle = '#E8DFD3';
        ctx.fillRect(padL, y + 2, barMaxW, 18);

        ctx.fillStyle = isCurrent ? '#B84A27' : '#63564B';
        ctx.fillRect(padL, y + 2, barW, 18);

        ctx.fillStyle = '#231B15';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(days + ' jours', W - 16, y + 15);
      });
    }

    function render() {
      const weight = Math.max(0.5, Math.min(90, Number(elWeightInput.value) || 1));
      const stage = elStage.value;
      const neutered = elNeutered.checked;
      const activity = elActivity.value;
      const goal = elGoal.value;
      const kcalKg = Math.max(2400, Math.min(5200, Number(elKcalKg.value) || 3700));
      const bagKg = Math.max(0.5, Number(elBagKg.value) || 12);
      const bagPrice = Math.max(1, Number(elBagPrice.value) || 64);

      const rer = 70 * Math.pow(weight, 0.75);
      const k = getFactorK(species, stage, neutered, activity, goal);
      const der = rer * k;

      /* Conversion en grammes/jour */
      const kcalPerGram = kcalKg / 1000;
      const gramsDay = der / kcalPerGram;

      /* Repas conseillés */
      const meals = (stage === 'jeune') ? 3 : (species === 'chat' ? 3 : 2);
      const gramsMeal = gramsDay / meals;

      /* Durée sac & coût */
      const bagDays = (bagKg * 1000) / Math.max(gramsDay, 1);
      const pricePerGram = bagPrice / (bagKg * 1000);
      const dayCost = gramsDay * pricePerGram;
      const monthCost = dayCost * 30.4375;

      outGramsDay.textContent = UI.formatInt(gramsDay) + ' g / jour';
      outMealsSub.textContent = meals + ' repas de ~' + UI.formatInt(gramsMeal) + ' g' + (species === 'chat' ? ' (ou fractionné / pipolino)' : '');

      outDerKcal.textContent = UI.formatInt(der) + ' kcal/j';
      outRerSub.textContent = 'Métabolisme de repos (RER) : ' + UI.formatInt(rer) + ' kcal · facteur k = ' + UI.formatDecimal(k, 2);

      outBagDays.textContent = UI.formatInt(bagDays) + ' jours';
      outBagWeeks.textContent = 'Soit ' + UI.formatDecimal(bagDays / 7, 1) + ' semaines pour un sac de ' + UI.formatDecimal(bagKg, bagKg % 1 === 0 ? 0 : 1) + ' kg';

      outMonthCost.textContent = UI.formatEUR(monthCost, true) + ' / mois';
      outDayCost.textContent = UI.formatEUR(dayCost, true) + ' par jour (' + UI.formatEUR(bagPrice / bagKg, true) + '/kg)';

      outFormulaLive.textContent =
        'RER = 70 × (' + UI.formatDecimal(weight, 1) + ')^0,75 = ' + UI.formatInt(rer) + ' kcal  →  ' +
        'DER = ' + UI.formatInt(rer) + ' × ' + UI.formatDecimal(k, 2) + ' = ' + UI.formatInt(der) + ' kcal  →  ' +
        'Ration = ' + UI.formatInt(der) + ' / (' + UI.formatInt(kcalKg) + ' / 1 000) = ' + UI.formatInt(gramsDay) + ' g/jour';

      if (goal === 'perte') {
        outVetNote.textContent = 'Objectif perte de poids : la ration est réduite à 82 % du besoin d’entretien. Ajoutez des courgettes cuites à l’eau pour maintenir la satiété et pesez votre animal toutes les 2 semaines.';
      } else if (stage === 'jeune' || stage === 'croissance') {
        outVetNote.textContent = 'En croissance, les besoins évoluent chaque mois : recalculez la ration à chaque pesée et utilisez exclusivement des croquettes « Chiot / Chaton » adaptées au rapport phospho-calcique.';
      } else if (species === 'chat') {
        outVetNote.textContent = 'Chez le chat, privilégiez la bi-nutrition (croquettes + 1 sachet de pâtée/jour) pour protéger les reins. Déduisez ~20 g de croquettes par sachet de 85 g de pâtée.';
      } else {
        outVetNote.textContent = 'Pesez toujours la ration avec une balance de cuisine (le verre doseur génère jusqu’à +25 % d’erreur). Ajustez de ±10 % si les côtes deviennent trop saillantes ou difficiles à palper.';
      }

      drawRationChart(gramsDay, bagKg, bagPrice);
    }

    /* Switch espèce */
    speciesBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        speciesBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        species = btn.getAttribute('data-ration-species') || 'chien';

        if (species === 'chat') {
          elWeightRange.min = '1';
          elWeightRange.max = '12';
          elWeightRange.step = '0.2';
          elWeightRange.value = '4.5';
          elWeightInput.value = '4.5';
          elBagKg.value = '4';
          elBagPrice.value = '34';
          elKcalKg.value = '3800';
        } else {
          elWeightRange.min = '1';
          elWeightRange.max = '75';
          elWeightRange.step = '0.5';
          elWeightRange.value = '20';
          elWeightInput.value = '20';
          elBagKg.value = '12';
          elBagPrice.value = '64';
          elKcalKg.value = '3700';
        }
        render();
      });
    });

    elWeightRange.addEventListener('input', function () {
      elWeightInput.value = elWeightRange.value;
      render();
    });

    elWeightInput.addEventListener('input', function () {
      const v = Number(elWeightInput.value);
      if (Number.isFinite(v)) {
        elWeightRange.value = String(Math.min(Number(elWeightRange.max), Math.max(Number(elWeightRange.min), v)));
      }
      render();
    });

    [elStage, elNeutered, elActivity, elGoal, elKcalKg, elBagKg, elBagPrice].forEach(function (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });

    render();
  });
})();
