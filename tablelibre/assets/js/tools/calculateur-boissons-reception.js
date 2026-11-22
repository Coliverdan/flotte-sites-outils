/**
 * TableLibre — Outil 02 : Calculateur Quantités Boissons, Vin & Champagne
 * Calcul réaliste par tranche horaire, profil des convives et saison + budget modifiable + Canvas.
 */
(function () {
  'use strict';

  const DEFAULT_PRICES = {
    champagne: 24,
    vinBlanc: 11,
    vinRouge: 13,
    rose: 9,
    biere: 2.2,
    softs: 2.0,
    eauPlate: 0.7,
    eauPetillante: 0.9,
    glacons: 2.5
  };

  let prices = Object.assign({}, DEFAULT_PRICES);
  let profile = 'festif'; // modere | festif | tres-festif
  let season = 'ete';     // ete | mi-saison | hiver

  const PROFILE_MULT = {
    'modere': 0.80,
    'festif': 1.00,
    'tres-festif': 1.25
  };

  const SEASON_MULT = {
    'ete': { soft: 1.30, water: 1.35, rose: 1.45, red: 0.80, beer: 1.25, ice: 1.50 },
    'mi-saison': { soft: 1.00, water: 1.00, rose: 1.00, red: 1.00, beer: 1.00, ice: 1.00 },
    'hiver': { soft: 0.85, water: 0.85, rose: 0.40, red: 1.25, beer: 0.85, ice: 0.65 }
  };

  function calculate(inputs) {
    const adults = Math.max(1, inputs.adults);
    const children = Math.max(0, inputs.children);
    const vhHours = Math.max(0, inputs.vhHours);
    const hasMeal = inputs.hasMeal;
    const partyHours = Math.max(0, inputs.partyHours);

    const pMult = PROFILE_MULT[profile] || 1.0;
    const sMult = SEASON_MULT[season] || SEASON_MULT['mi-saison'];

    // 1. Champagne (75cl = 6 coupes)
    // Vin d'honneur : 1.1 coupe/h/adulte ; Dessert si repas : 1.3 coupe/adulte
    const champagneGlasses = (adults * vhHours * 1.05 * pMult) + (hasMeal ? adults * 1.3 * pMult : 0);
    const champagneBtl = Math.ceil(champagneGlasses / 6);

    // 2. Vin blanc (75cl = 6 verres) : VH (0.35 verre/h) + entrée/poisson repas (1.5 verre)
    const whiteGlasses = (adults * vhHours * 0.35 * pMult) + (hasMeal ? adults * 1.45 * pMult : 0);
    const whiteBtl = Math.ceil(whiteGlasses / 6);

    // 3. Vin rouge (75cl = 6 verres) : plat + fromage repas (2.1 verres * saison)
    const redGlasses = hasMeal ? (adults * 2.1 * pMult * sMult.red) : (adults * vhHours * 0.2 * pMult * sMult.red);
    const redBtl = Math.ceil(redGlasses / 6);

    // 4. Rosé (75cl = 6 verres) : surtout au VH et en été
    const roseGlasses = (adults * vhHours * 0.45 * pMult * sMult.rose) + (hasMeal && season === 'ete' ? adults * 0.6 * pMult : 0);
    const roseBtl = Math.ceil(roseGlasses / 6);

    // 5. Bières (33cl) : VH + soirée dansante
    const beerUnits = Math.ceil(((adults * vhHours * 0.35) + (adults * partyHours * 0.55)) * pMult * sMult.beer);
    const beerLiters = beerUnits * 0.33;
    const kegs20L = Math.ceil(beerLiters / 20);

    // 6. Softs & jus (bouteilles 1,5 L = ~7 verres)
    const totalHours = vhHours + (hasMeal ? 2.5 : 0) + partyHours;
    const softLiters = ((adults * totalHours * 0.14) + (children * totalHours * 0.25)) * sMult.soft;
    const softBtl = Math.ceil(softLiters / 1.5);

    // 7. Eau plate (1 L) & Eau pétillante (1 L)
    const waterPlateL = Math.ceil(((adults * 0.65) + (children * 0.45)) * (1 + totalHours * 0.08) * sMult.water);
    const waterSparkL = Math.ceil((adults * 0.35) * (1 + totalHours * 0.06) * sMult.water);

    // 8. Glaçons (kg) : refroidissement + verres
    const iceKg = Math.ceil(((adults + children * 0.5) * 0.38 * (1 + partyHours * 0.12)) * sMult.ice);

    return [
      { key: 'champagne', name: 'Champagne / Crémant', unit: 'bouteilles (75 cl)', qty: champagneBtl, note: `${Math.ceil(champagneBtl / 6)} carton(s) de 6`, color: '#2D5A43' },
      { key: 'vinBlanc', name: 'Vin blanc sec', unit: 'bouteilles (75 cl)', qty: whiteBtl, note: `${Math.ceil(whiteBtl / 6)} carton(s) de 6`, color: '#4E7D63' },
      { key: 'vinRouge', name: 'Vin rouge', unit: 'bouteilles (75 cl)', qty: redBtl, note: `${Math.ceil(redBtl / 6)} carton(s) de 6`, color: '#7A3E3A' },
      { key: 'rose', name: 'Vin rosé', unit: 'bouteilles (75 cl)', qty: roseBtl, note: `${Math.ceil(roseBtl / 6)} carton(s) de 6`, color: '#B87A72' },
      { key: 'biere', name: 'Bières (33 cl)', unit: 'bouteilles (33 cl)', qty: beerUnits, note: `ou ~${kegs20L} fût(s) de 20 L (${Math.round(beerLiters)} L)`, color: '#9C7B44' },
      { key: 'softs', name: 'Softs & jus de fruits', unit: 'bouteilles (1,5 L)', qty: softBtl, note: `${Math.round(softBtl * 1.5)} litres au total`, color: '#5C7C89' },
      { key: 'eauPlate', name: 'Eau plate', unit: 'bouteilles (1 L)', qty: waterPlateL, note: 'Tables + buffet boissons', color: '#6E8894' },
      { key: 'eauPetillante', name: 'Eau pétillante', unit: 'bouteilles (1 L)', qty: waterSparkL, note: 'Tables + apéritif', color: '#8CA3AD' },
      { key: 'glacons', name: 'Glaçons alimentaires', unit: 'kg', qty: iceKg, note: `${Math.ceil(iceKg / 5)} sacs de 5 kg`, color: '#A59D90' }
    ];
  }

  function drawChart(canvas, rows) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#F8F6F1';
    ctx.fillRect(0, 0, W, H);

    const budgetRows = rows.map((r) => ({
      name: r.name,
      cost: r.qty * (prices[r.key] || 0),
      color: r.color
    }));
    const maxCost = Math.max(1, ...budgetRows.map((r) => r.cost));

    const padLeft = 175;
    const padRight = 90;
    const padTop = 20;
    const barH = 22;
    const gap = 14;

    budgetRows.forEach((row, i) => {
      const y = padTop + i * (barH + gap);
      ctx.fillStyle = '#181715';
      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row.name, padLeft - 14, y + 15);

      const barW = Math.max(4, ((W - padLeft - padRight) * row.cost) / maxCost);
      ctx.fillStyle = row.color;
      ctx.fillRect(padLeft, y, barW, barH);

      ctx.fillStyle = '#181715';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(window.TableLibre.formatEuro(row.cost, 0), padLeft + barW + 10, y + 15);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('drinks-app')) return;

    const adultsEl = document.getElementById('drinks-adults');
    const childrenEl = document.getElementById('drinks-children');
    const vhEl = document.getElementById('drinks-vh');
    const mealEl = document.getElementById('drinks-meal');
    const partyEl = document.getElementById('drinks-party');

    const adultsVal = document.getElementById('drinks-adults-val');
    const childrenVal = document.getElementById('drinks-children-val');
    const vhVal = document.getElementById('drinks-vh-val');
    const partyVal = document.getElementById('drinks-party-val');

    const tbody = document.getElementById('drinks-tbody');
    const kpiBottles = document.getElementById('kpi-bottles');
    const kpiBudget = document.getElementById('kpi-budget');
    const kpiPerGuest = document.getElementById('kpi-per-guest');
    const kpiIce = document.getElementById('kpi-ice');
    const chartCanvas = document.getElementById('drinks-chart');
    const copyBtn = document.getElementById('drinks-copy-btn');
    const printBtn = document.getElementById('drinks-print-btn');

    let lastRows = [];

    function update() {
      const adults = parseInt(adultsEl.value, 10) || 80;
      const children = parseInt(childrenEl.value, 10) || 0;
      const vhHours = parseFloat(vhEl.value) || 0;
      const hasMeal = mealEl.checked;
      const partyHours = parseFloat(partyEl.value) || 0;

      adultsVal.textContent = `${adults} adultes`;
      childrenVal.textContent = `${children} enfants`;
      vhVal.textContent = `${vhHours.toString().replace('.', ',')} h`;
      partyVal.textContent = `${partyHours.toString().replace('.', ',')} h`;

      const rows = calculate({ adults, children, vhHours, hasMeal, partyHours });
      lastRows = rows;

      let totalBottles = 0;
      let totalCost = 0;

      tbody.innerHTML = rows.map((r) => {
        const unitPrice = prices[r.key] || 0;
        const lineCost = r.qty * unitPrice;
        totalCost += lineCost;
        if (r.key !== 'glacons') totalBottles += r.qty;

        return `
          <tr>
            <td>
              <strong>${window.TableLibre.escapeHTML(r.name)}</strong><br>
              <span class="field__hint">${window.TableLibre.escapeHTML(r.note)}</span>
            </td>
            <td class="num"><strong>${window.TableLibre.formatNumber(r.qty)}</strong> <span class="field__hint">${window.TableLibre.escapeHTML(r.unit)}</span></td>
            <td class="num">
              <input type="number" step="0.1" min="0" class="input input--mono" style="width:92px;padding:6px 8px;text-align:right;" value="${unitPrice}" data-price-key="${r.key}" aria-label="Prix unitaire ${window.TableLibre.escapeHTML(r.name)}">
            </td>
            <td class="num"><strong>${window.TableLibre.formatEuro(lineCost, 0)}</strong></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-price-key]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const k = inp.getAttribute('data-price-key');
          const v = parseFloat(inp.value);
          prices[k] = Number.isFinite(v) && v >= 0 ? v : 0;
          update();
        });
      });

      const totalGuests = Math.max(1, adults + children);
      kpiBottles.textContent = window.TableLibre.formatNumber(totalBottles);
      kpiBudget.textContent = window.TableLibre.formatEuro(totalCost, 0);
      kpiPerGuest.textContent = window.TableLibre.formatEuro(totalCost / totalGuests, 2);
      const iceRow = rows.find((r) => r.key === 'glacons');
      kpiIce.textContent = `${iceRow ? iceRow.qty : 0} kg`;

      drawChart(chartCanvas, rows);
    }

    document.querySelectorAll('[data-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        profile = btn.getAttribute('data-profile');
        document.querySelectorAll('[data-profile]').forEach((b) => b.classList.toggle('is-active', b === btn));
        update();
      });
    });

    document.querySelectorAll('[data-season]').forEach((btn) => {
      btn.addEventListener('click', () => {
        season = btn.getAttribute('data-season');
        document.querySelectorAll('[data-season]').forEach((b) => b.classList.toggle('is-active', b === btn));
        update();
      });
    });

    [adultsEl, childrenEl, vhEl, mealEl, partyEl].forEach((el) => {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });

    copyBtn.addEventListener('click', () => {
      const totalCost = lastRows.reduce((s, r) => s + r.qty * (prices[r.key] || 0), 0);
      const lines = [
        `LISTE BOISSONS RÉCEPTION (${adultsEl.value} adultes, ${childrenEl.value} enfants)`,
        '----------------------------------------',
        ...lastRows.map((r) => `• ${r.name} : ${r.qty} ${r.unit} (${r.note}) — ~${window.TableLibre.formatEuro(r.qty * (prices[r.key] || 0), 0)}`),
        '----------------------------------------',
        `Budget estimé : ${window.TableLibre.formatEuro(totalCost, 0)} (généré sur tablelibre.fr)`
      ];
      window.TableLibre.copyText(lines.join('\n'), 'Liste de courses boissons copiée !');
    });

    printBtn.addEventListener('click', () => window.print());

    update();
  });
})();
