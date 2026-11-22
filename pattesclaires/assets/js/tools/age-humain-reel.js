/* ==========================================================================
   Outil 03 — Calculateur Âge Chien/Chat en Âge Humain (Formule Scientifique)
   Étude UCSD (16 × ln(âge) + 31) calibrée par gabarit + Courbe féline ISFM
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const UI = window.PattesUI;
    if (!UI) return;

    const speciesBtns = document.querySelectorAll('[data-age-species]');
    const sizeGroup = document.getElementById('dog-size-group');
    const sizeBtns = document.querySelectorAll('[data-dog-size]');
    const elYears = document.getElementById('age-years');
    const elMonths = document.getElementById('age-months');
    const elYearsVal = document.getElementById('age-years-val');
    const elMonthsVal = document.getElementById('age-months-val');

    const outHumanAge = document.getElementById('out-human-age');
    const outMythDiff = document.getElementById('out-myth-diff');
    const outMythAge = document.getElementById('out-myth-age');
    const outStageName = document.getElementById('out-stage-name');
    const outStageAdvice = document.getElementById('out-stage-advice');
    const outFormulaReadout = document.getElementById('out-age-formula');
    const stageSteps = document.querySelectorAll('[data-stage-step]');
    const chartCanvas = document.getElementById('age-chart');

    let species = 'chien';
    let dogSize = 'grand';

    function calcDogHumanAge(ageYears, size) {
      if (ageYears <= 0) return 0;

      /* Courbe UCSD de référence (Labrador — Grand gabarit) */
      let ucsd;
      if (ageYears < 0.5) {
        const atHalf = 16 * Math.log(0.5) + 31; /* ~19.91 */
        ucsd = (ageYears / 0.5) * atHalf;
      } else {
        ucsd = 16 * Math.log(ageYears) + 31;
      }

      if (size === 'grand') {
        return ucsd;
      }
      if (size === 'petit') {
        return ucsd * 0.88 + 0.45 * Math.max(0, ageYears - 6);
      }
      if (size === 'moyen') {
        return ucsd * 0.95 + 0.15 * Math.max(0, ageYears - 6);
      }
      /* Géant (> 45 kg) : vieillissement accéléré après 2 ans */
      return ucsd + 1.85 * Math.max(0, ageYears - 2);
    }

    function calcCatHumanAge(ageYears) {
      if (ageYears <= 0) return 0;
      if (ageYears <= 1) return ageYears * 15;
      if (ageYears <= 2) return 15 + (ageYears - 1) * 9;
      return 24 + (ageYears - 2) * 4;
    }

    function getAge(ageYears) {
      return species === 'chien'
        ? calcDogHumanAge(ageYears, dogSize)
        : calcCatHumanAge(ageYears);
    }

    function getLifeStage(ageYears, humanAge) {
      if (species === 'chat') {
        if (ageYears < 1) {
          return {
            idx: 0,
            name: 'Chaton (Croissance)',
            advice: 'Phase d’apprentissage intense, primo-vaccination, identification I-CAD et stérilisation recommandée autour de 6 mois.'
          };
        }
        if (ageYears < 3) {
          return {
            idx: 1,
            name: 'Jeune adulte',
            advice: 'Pic d’énergie et de jeu. Stabilisez la ration sur des croquettes chat stérilisé et surveillez son hydratation (fontaine à eau).'
          };
        }
        if (ageYears < 10) {
          return {
            idx: 2,
            name: 'Adulte mature',
            advice: 'Bilan vétérinaire annuel recommandé. Surveillez le poids de forme et l’apparition de tartre ou de gingivite.'
          };
        }
        if (ageYears < 14) {
          return {
            idx: 3,
            name: 'Chat Senior',
            advice: 'Réalisez une prise de sang annuelle (fonction rénale urée/créatinine/SDMA et thyroïde T4). Adaptez l’accès aux litières.'
          };
        }
        return {
          idx: 4,
          name: 'Super-Senior (Gériatrique)',
          advice: 'Visite vétérinaire tous les 6 mois conseillée. Surveillez l’arthrose discrète (hésitation à sauter), la tension artérielle et l’appétit.'
        };
      }

      /* Chien */
      if (ageYears < 1) {
        return {
          idx: 0,
          name: 'Chiot (Croissance rapide)',
          advice: 'Socialisation cruciale et développement osseux rapide. Respectez le calendrier vaccinal et évitez les sauts violents sur articulations immatures.'
        };
      }
      if (humanAge < 44) {
        return {
          idx: 1,
          name: 'Jeune adulte',
          advice: 'Maturité physique atteinte (un peu plus tardive chez les géants). C’est le moment d’ancrer l’éducation et la ration adulte.'
        };
      }
      if (humanAge < 63) {
        return {
          idx: 2,
          name: 'Adulte mature',
          advice: 'Pleine force de l’âge. Bilan annuel, détartrage préventif si besoin et maintien d’une activité physique régulière sans surpoids.'
        };
      }
      if (humanAge < 74) {
        return {
          idx: 3,
          name: 'Chien Senior',
          advice: 'Bilan sanguin annuel conseillé + soutien articulaire (oméga-3, chondroprotecteurs). Privilégiez des promenades plus courtes mais fréquentes.'
        };
      }
      return {
        idx: 4,
        name: 'Super-Senior',
        advice: 'Suivi vétérinaire semestriel, couchage orthopédique à mémoire de forme et alimentation senior digeste adaptée au cœur et aux reins.'
      };
    }

    function drawCurve(currentAge, currentHuman) {
      if (!chartCanvas) return;
      const W = 640;
      const H = 290;
      const ctx = UI.setupCanvas(chartCanvas, W, H);

      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      const padL = 52;
      const padR = 24;
      const padT = 32;
      const padB = 44;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const maxX = species === 'chat' ? 20 : 16;
      const maxY = 115;

      function xToPx(x) { return padL + (x / maxX) * plotW; }
      function yToPx(y) { return padT + plotH - (Math.min(y, maxY) / maxY) * plotH; }

      /* Grille horizontale */
      ctx.strokeStyle = '#E8DFD3';
      ctx.lineWidth = 1;
      [20, 40, 60, 80, 100].forEach(function (val) {
        const py = yToPx(val);
        ctx.beginPath();
        ctx.moveTo(padL, py);
        ctx.lineTo(W - padR, py);
        ctx.stroke();

        ctx.fillStyle = '#63564B';
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val + ' ans', padL - 8, py + 4);
      });

      /* Axe X */
      const stepX = species === 'chat' ? 4 : 2;
      for (let x = 0; x <= maxX; x += stepX) {
        const px = xToPx(x);
        ctx.fillStyle = '#63564B';
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(x + ' a', px, H - 18);
      }

      /* Courbe Mythe ×7 (ligne pointillée) */
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#8A7B6D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a <= maxX; a += 0.25) {
        const px = xToPx(a);
        const py = yToPx(a * 7);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      /* Courbe Scientifique (terracotta) */
      ctx.strokeStyle = '#B84A27';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0.05; a <= maxX; a += 0.15) {
        const px = xToPx(a);
        const py = yToPx(getAge(a));
        if (a === 0.05) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      /* Point actuel */
      const clampedX = Math.min(currentAge, maxX);
      const cx = xToPx(clampedX);
      const cy = yToPx(currentHuman);

      ctx.strokeStyle = '#231B15';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B84A27';
      ctx.lineWidth = 3;
      ctx.stroke();

      /* Légende en haut */
      ctx.fillStyle = '#B84A27';
      ctx.fillRect(padL, 10, 14, 4);
      ctx.fillStyle = '#231B15';
      ctx.font = '600 12px "Nunito Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(species === 'chien' ? 'Courbe scientifique UCSD calibrée' : 'Courbe féline ISFM / AAFP', padL + 20, 16);

      ctx.strokeStyle = '#8A7B6D';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padL + 260, 12);
      ctx.lineTo(padL + 278, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#63564B';
      ctx.fillText('Mythe « âge × 7 » (erroné)', padL + 284, 16);
    }

    function render() {
      const y = Number(elYears.value) || 0;
      const m = Number(elMonths.value) || 0;
      const totalYears = Math.max(0.25, y + m / 12);

      elYearsVal.textContent = y + (y > 1 ? ' ans' : ' an');
      elMonthsVal.textContent = m + ' mois';

      const humanAge = getAge(totalYears);
      const mythAge = totalYears * 7;
      const diff = humanAge - mythAge;

      outHumanAge.textContent = Math.round(humanAge) + ' ans humains';
      outMythAge.textContent = Math.round(mythAge) + ' ans';

      const sign = diff >= 0 ? '+' : '';
      outMythDiff.textContent =
        'Écart avec le mythe ×7 : ' + sign + Math.round(diff) + ' ans (' +
        (Math.abs(diff) < 3 ? 'proche à cet âge précis' : (diff > 0 ? 'plus mûr que ×7' : 'plus jeune que ×7')) + ')';

      const stage = getLifeStage(totalYears, humanAge);
      outStageName.textContent = stage.name;
      outStageAdvice.textContent = stage.advice;

      stageSteps.forEach(function (step, idx) {
        step.classList.toggle('is-active', idx === stage.idx);
      });

      if (species === 'chien') {
        const sizeNames = {
          petit: 'Petit (< 10 kg)',
          moyen: 'Moyen (10–25 kg)',
          grand: 'Grand (25–45 kg — Réf. UCSD)',
          geant: 'Géant (> 45 kg)'
        };
        outFormulaReadout.textContent =
          'UCSD : 16 × ln(' + UI.formatDecimal(totalYears, 2) + ') + 31 = ' +
          UI.formatDecimal(totalYears >= 0.5 ? 16 * Math.log(totalYears) + 31 : (totalYears / 0.5) * (16 * Math.log(0.5) + 31), 1) +
          ' ans  →  Calibré ' + sizeNames[dogSize] + ' = ' + UI.formatDecimal(humanAge, 1) + ' ans humains';
      } else {
        outFormulaReadout.textContent =
          totalYears <= 1
            ? 'Courbe féline ISFM : ' + UI.formatDecimal(totalYears, 2) + ' × 15 = ' + UI.formatDecimal(humanAge, 1) + ' ans humains'
            : (totalYears <= 2
              ? 'Courbe féline ISFM : 15 + (' + UI.formatDecimal(totalYears - 1, 2) + ' × 9) = ' + UI.formatDecimal(humanAge, 1) + ' ans humains'
              : 'Courbe féline ISFM : 24 + (' + UI.formatDecimal(totalYears - 2, 2) + ' × 4) = ' + UI.formatDecimal(humanAge, 1) + ' ans humains');
      }

      drawCurve(totalYears, humanAge);
    }

    speciesBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        speciesBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        species = btn.getAttribute('data-age-species') || 'chien';
        if (sizeGroup) {
          sizeGroup.style.display = species === 'chien' ? '' : 'none';
        }
        elYears.max = species === 'chat' ? '20' : '16';
        if (Number(elYears.value) > Number(elYears.max)) {
          elYears.value = elYears.max;
        }
        render();
      });
    });

    sizeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sizeBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        dogSize = btn.getAttribute('data-dog-size') || 'grand';
        render();
      });
    });

    elYears.addEventListener('input', render);
    elMonths.addEventListener('input', render);

    render();
  });
})();
