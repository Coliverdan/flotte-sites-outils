/**
 * TableLibre — Outil 04 : Calculateur Quantités Buffet, Pièces Cocktail & Gâteau
 * Formats : Cocktail dînatoire, Vin d'honneur + Repas assis, Buffet froid, Brunch lendemain.
 */
(function () {
  'use strict';

  let format = 'vh-repas';
  let appetite = 'standard'; // modere | standard | genereux
  let dessertType = 'wedding-cake'; // wedding-cake | piece-montee

  const APPETITE_MULT = {
    'modere': 0.88,
    'standard': 1.0,
    'genereux': 1.18
  };

  function computePortions(adults, children) {
    const mult = APPETITE_MULT[appetite] || 1.0;
    const eqGuests = adults + children * 0.55;
    const totalHeads = adults + children;

    let savoryPerGuest = 0;
    let sweetPerGuest = 0;
    let mainGramsPerGuest = 0;
    let saladGramsPerGuest = 0;
    let cheeseGramsPerGuest = 0;
    let breadGramsPerGuest = 0;
    let coffeeCupsPerAdult = 0;

    if (format === 'cocktail-dinatoire') {
      savoryPerGuest = 15 * mult;
      sweetPerGuest = 5 * mult;
      mainGramsPerGuest = 0;
      saladGramsPerGuest = 0;
      cheeseGramsPerGuest = 45 * mult;
      breadGramsPerGuest = 70 * mult;
      coffeeCupsPerAdult = 1.1;
    } else if (format === 'vh-repas') {
      savoryPerGuest = 8 * mult;
      sweetPerGuest = 2.5 * mult;
      mainGramsPerGuest = 175 * mult; // Viande ou poisson
      saladGramsPerGuest = 150 * mult; // Garnitures + entrée
      cheeseGramsPerGuest = 55 * mult;
      breadGramsPerGuest = 110 * mult;
      coffeeCupsPerAdult = 1.4;
    } else if (format === 'buffet-froid') {
      savoryPerGuest = 5 * mult;
      sweetPerGuest = 3 * mult;
      mainGramsPerGuest = 220 * mult; // Viandes froides, charcuteries, poissons
      saladGramsPerGuest = 210 * mult; // Salades composées & légumes
      cheeseGramsPerGuest = 65 * mult;
      breadGramsPerGuest = 120 * mult;
      coffeeCupsPerAdult = 1.2;
    } else {
      // Brunch lendemain
      savoryPerGuest = 4 * mult; // Mini-viennoiseries / œufs / quiches
      sweetPerGuest = 4 * mult; // Viennoiseries sucrées & pancakes
      mainGramsPerGuest = 130 * mult; // Charcuterie, saumon, œufs
      saladGramsPerGuest = 120 * mult; // Fruits frais & salades
      cheeseGramsPerGuest = 50 * mult;
      breadGramsPerGuest = 115 * mult;
      coffeeCupsPerAdult = 1.8;
    }

    const savoryTotal = Math.ceil(eqGuests * savoryPerGuest);
    const sweetTotal = Math.ceil(eqGuests * sweetPerGuest);
    const mainKg = Math.round(((eqGuests * mainGramsPerGuest) / 1000) * 10) / 10;
    const saladKg = Math.round(((eqGuests * saladGramsPerGuest) / 1000) * 10) / 10;
    const cheeseKg = Math.round(((eqGuests * cheeseGramsPerGuest) / 1000) * 10) / 10;
    const breadKg = Math.round(((eqGuests * breadGramsPerGuest) / 1000) * 10) / 10;
    const baguettes = Math.ceil((eqGuests * breadGramsPerGuest) / 250);
    const coffeeCups = Math.ceil(adults * coffeeCupsPerAdult);
    const coffeeGrams = Math.ceil(coffeeCups * 8); // 8g par tasse

    // Gâteau / Pièce montée
    const cakeParts = Math.ceil(totalHeads * 1.05); // +5 % marge découpe
    const chouxTotal = Math.ceil((adults * 3 + children * 2) * mult);

    const rows = [
      {
        label: format === 'brunch' ? 'Pièces salées & bouchées brunch' : 'Pièces cocktail salées',
        perGuest: `${savoryPerGuest.toFixed(1).replace('.', ',')} pcs / pers.`,
        total: `${window.TableLibre.formatNumber(savoryTotal)} pièces`,
        detail: `${Math.ceil(savoryTotal / 24)} plateaux de 24 pièces`,
        weight: savoryTotal
      },
      {
        label: format === 'brunch' ? 'Viennoiseries & pièces sucrées' : 'Mignardises & pièces sucrées',
        perGuest: `${sweetPerGuest.toFixed(1).replace('.', ',')} pcs / pers.`,
        total: `${window.TableLibre.formatNumber(sweetTotal)} pièces`,
        detail: `Café gourmand ou buffet sucré`,
        weight: sweetTotal
      }
    ];

    if (mainKg > 0) {
      rows.push({
        label: format === 'buffet-froid' ? 'Viandes froides, poissons & charcuteries' : 'Protéines plat principal (viande / poisson)',
        perGuest: `${Math.round(mainGramsPerGuest)} g / pers.`,
        total: `${mainKg.toFixed(1).replace('.', ',')} kg`,
        detail: 'Poids net servi',
        weight: mainKg * 10
      });
    }

    if (saladKg > 0) {
      rows.push({
        label: format === 'brunch' ? 'Fruits frais & salades' : 'Accompagnements & salades composées',
        perGuest: `${Math.round(saladGramsPerGuest)} g / pers.`,
        total: `${saladKg.toFixed(1).replace('.', ',')} kg`,
        detail: 'Prévoir 3 à 4 variétés distinctes',
        weight: saladKg * 10
      });
    }

    rows.push(
      {
        label: 'Plateau de fromages affinés',
        perGuest: `${Math.round(cheeseGramsPerGuest)} g / pers.`,
        total: `${cheeseKg.toFixed(1).replace('.', ',')} kg`,
        detail: 'Idéalement 4 à 5 variétés (pâte molle, pressée, persillée, chèvre)',
        weight: cheeseKg * 15
      },
      {
        label: 'Pain artisanal (baguettes / boules)',
        perGuest: `${Math.round(breadGramsPerGuest)} g / pers.`,
        total: `${breadKg.toFixed(1).replace('.', ',')} kg (~${baguettes} baguettes)`,
        detail: 'Inclut pain de campagne pour le fromage',
        weight: breadKg * 12
      },
      {
        label: dessertType === 'wedding-cake' ? 'Wedding cake / Gâteau à étages' : 'Pièce montée en choux',
        perGuest: dessertType === 'wedding-cake' ? '1 part (~110 g) + 5 % marge' : '3 choux / adulte, 2 / enfant',
        total: dessertType === 'wedding-cake' ? `${cakeParts} parts` : `${chouxTotal} choux`,
        detail: dessertType === 'wedding-cake' ? 'Soit environ ' + Math.round((cakeParts * 0.11) * 10) / 10 + ' kg de gâteau' : 'Nougatine ~' + Math.round(totalHeads * 0.02 * 10) / 10 + ' kg',
        weight: dessertType === 'wedding-cake' ? cakeParts : chouxTotal
      },
      {
        label: 'Café & infusions',
        perGuest: `${coffeeCupsPerAdult.toFixed(1).replace('.', ',')} tasse / adulte`,
        total: `${coffeeCups} tasses`,
        detail: `Soit ~${coffeeGrams} g de café (grain ou moulu) + 25 % sachets thé/tisane`,
        weight: coffeeCups
      }
    );

    return {
      rows,
      savoryTotal,
      sweetTotal,
      cheeseKg,
      dessertSummary: dessertType === 'wedding-cake' ? `${cakeParts} parts` : `${chouxTotal} choux`
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('catering-app')) return;

    const adultsEl = document.getElementById('cat-adults');
    const childrenEl = document.getElementById('cat-children');
    const adultsVal = document.getElementById('cat-adults-val');
    const childrenVal = document.getElementById('cat-children-val');
    const tbody = document.getElementById('cat-tbody');

    const kpiSavory = document.getElementById('kpi-savory');
    const kpiSweet = document.getElementById('kpi-sweet');
    const kpiCheese = document.getElementById('kpi-cheese');
    const kpiDessert = document.getElementById('kpi-dessert');
    const copyBtn = document.getElementById('cat-copy-btn');
    const printBtn = document.getElementById('cat-print-btn');

    let lastResult = null;

    function update() {
      const adults = parseInt(adultsEl.value, 10) || 80;
      const children = parseInt(childrenEl.value, 10) || 0;
      adultsVal.textContent = `${adults} adultes`;
      childrenVal.textContent = `${children} enfants`;

      const res = computePortions(adults, children);
      lastResult = res;

      kpiSavory.textContent = window.TableLibre.formatNumber(res.savoryTotal);
      kpiSweet.textContent = window.TableLibre.formatNumber(res.sweetTotal);
      kpiCheese.textContent = `${res.cheeseKg.toFixed(1).replace('.', ',')} kg`;
      kpiDessert.textContent = res.dessertSummary;

      tbody.innerHTML = res.rows.map((r) => `
        <tr>
          <td>
            <strong>${window.TableLibre.escapeHTML(r.label)}</strong><br>
            <span class="field__hint">${window.TableLibre.escapeHTML(r.detail)}</span>
          </td>
          <td class="num">${window.TableLibre.escapeHTML(r.perGuest)}</td>
          <td class="num"><strong>${window.TableLibre.escapeHTML(r.total)}</strong></td>
        </tr>
      `).join('');
    }

    document.querySelectorAll('[data-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        format = btn.getAttribute('data-format');
        document.querySelectorAll('[data-format]').forEach((b) => b.classList.toggle('is-active', b === btn));
        update();
      });
    });

    document.querySelectorAll('[data-appetite]').forEach((btn) => {
      btn.addEventListener('click', () => {
        appetite = btn.getAttribute('data-appetite');
        document.querySelectorAll('[data-appetite]').forEach((b) => b.classList.toggle('is-active', b === btn));
        update();
      });
    });

    document.querySelectorAll('[data-dessert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dessertType = btn.getAttribute('data-dessert');
        document.querySelectorAll('[data-dessert]').forEach((b) => b.classList.toggle('is-active', b === btn));
        update();
      });
    });

    [adultsEl, childrenEl].forEach((el) => el.addEventListener('input', update));

    copyBtn.addEventListener('click', () => {
      if (!lastResult) return;
      const lines = [
        `QUANTITÉS TRAITEUR & BUFFET (${adultsEl.value} adultes, ${childrenEl.value} enfants)`,
        '----------------------------------------',
        ...lastResult.rows.map((r) => `• ${r.label} : ${r.total} (${r.perGuest})`),
        '----------------------------------------',
        'Calculé gratuitement sur tablelibre.fr'
      ];
      window.TableLibre.copyText(lines.join('\n'), 'Récapitulatif traiteur copié dans le presse-papiers !');
    });

    printBtn.addEventListener('click', () => window.print());

    update();
  });
})();
