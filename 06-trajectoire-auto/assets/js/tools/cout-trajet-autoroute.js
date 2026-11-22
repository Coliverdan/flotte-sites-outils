/* ==========================================================================
   TRAJECTOIRE — Outil 6 : Coût Trajet Autoroute, Covoiturage & Comparatif Train
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const T = window.Trajectoire;
    const form = document.getElementById('trip-form');
    if (!T || !form) return;

    const ROUTES = [
      { id: 'custom', label: '— Trajet personnalisé —', km: 465, toll: 39.90, train: 68 },
      { id: 'paris-lyon', label: 'Paris → Lyon (A6 · 465 km)', km: 465, toll: 39.90, train: 65 },
      { id: 'paris-marseille', label: 'Paris → Marseille (A6/A7 · 775 km)', km: 775, toll: 65.40, train: 89 },
      { id: 'paris-bordeaux', label: 'Paris → Bordeaux (A10 · 585 km)', km: 585, toll: 59.80, train: 74 },
      { id: 'lyon-marseille', label: 'Lyon → Marseille (A7 · 315 km)', km: 315, toll: 27.80, train: 42 },
      { id: 'paris-nantes', label: 'Paris → Nantes (A11 · 385 km)', km: 385, toll: 39.50, train: 56 },
      { id: 'paris-strasbourg', label: 'Paris → Strasbourg (A4 · 490 km)', km: 490, toll: 43.20, train: 64 },
      { id: 'paris-lille', label: 'Paris → Lille (A1 · 225 km)', km: 225, toll: 18.40, train: 38 },
      { id: 'toulouse-bordeaux', label: 'Toulouse → Bordeaux (A62 · 245 km)', km: 245, toll: 21.60, train: 32 }
    ];

    const FUEL_DEFAULTS = {
      essence: { conso: 6.8, price: 1.78, unit: 'L/100', priceUnit: '€/L', co2PerUnit: 2.28 },
      diesel: { conso: 5.6, price: 1.69, unit: 'L/100', priceUnit: '€/L', co2PerUnit: 2.65 },
      hybride: { conso: 5.8, price: 1.78, unit: 'L/100', priceUnit: '€/L', co2PerUnit: 2.28 },
      electrique: { conso: 19.5, price: 0.59, unit: 'kWh/100', priceUnit: '€/kWh', co2PerUnit: 0.052 }
    };

    const el = {
      routePreset: document.getElementById('t-route'),
      distance: document.getElementById('t-distance'),
      roundTrip: document.getElementById('t-roundtrip'),
      fuel: document.getElementById('t-fuel'),
      conso: document.getElementById('t-conso'),
      consoUnit: document.getElementById('t-conso-unit'),
      unitPrice: document.getElementById('t-unit-price'),
      priceUnit: document.getElementById('t-price-unit'),
      toll: document.getElementById('t-toll'),
      passengers: document.getElementById('t-passengers'),
      passengersVal: document.getElementById('t-passengers-val'),
      includeWear: document.getElementById('t-wear'),
      trainTicket: document.getElementById('t-train-ticket'),
      // Sorties
      verdictBanner: document.getElementById('t-verdict-banner'),
      verdictVal: document.getElementById('t-verdict-val'),
      verdictSub: document.getElementById('t-verdict-sub'),
      kpiTotal: document.getElementById('t-kpi-total'),
      kpiEnergy: document.getElementById('t-kpi-energy'),
      kpiCo2: document.getElementById('t-kpi-co2'),
      kpiTrain: document.getElementById('t-kpi-train'),
      tableBody: document.getElementById('t-table-body'),
      canvas: document.getElementById('t-chart'),
      exportBtn: document.getElementById('t-export-png')
    };

    if (el.routePreset) {
      el.routePreset.innerHTML = '';
      ROUTES.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label;
        if (r.id === 'paris-lyon') opt.selected = true;
        el.routePreset.appendChild(opt);
      });
      el.routePreset.addEventListener('change', () => {
        const r = ROUTES.find((item) => item.id === el.routePreset.value);
        if (!r || r.id === 'custom') return;
        el.distance.value = r.km;
        el.toll.value = r.toll;
        el.trainTicket.value = r.train;
        calculate();
      });
    }

    el.fuel.addEventListener('change', () => {
      const def = FUEL_DEFAULTS[el.fuel.value] || FUEL_DEFAULTS.essence;
      el.conso.value = def.conso;
      el.unitPrice.value = def.price;
      if (el.consoUnit) el.consoUnit.textContent = def.unit;
      if (el.priceUnit) el.priceUnit.textContent = def.priceUnit;
      calculate();
    });

    let lastRes = null;

    function calculate() {
      const baseKm = Math.max(10, parseFloat(el.distance.value) || 465);
      const mult = el.roundTrip.checked ? 2 : 1;
      const totalKm = baseKm * mult;

      const fuelType = el.fuel.value;
      const def = FUEL_DEFAULTS[fuelType] || FUEL_DEFAULTS.essence;
      const conso = Math.max(1, parseFloat(el.conso.value) || def.conso);
      const unitPrice = Math.max(0.05, parseFloat(el.unitPrice.value) || def.price);
      const baseToll = Math.max(0, parseFloat(el.toll.value) || 0);
      const totalToll = baseToll * mult;
      const pax = Math.min(7, Math.max(1, parseInt(el.passengers.value, 10) || 1));
      const includeWear = el.includeWear.checked;
      const trainPerPax = Math.max(0, parseFloat(el.trainTicket.value) || 65) * mult;

      el.passengersVal.textContent = `${pax} personne${pax > 1 ? 's' : ''}`;

      // Calcul énergie (pour EV on ajoute 6% pertes DC autoroute)
      const lossMult = fuelType === 'electrique' ? 1.06 : 1.0;
      const energyUnits = (totalKm / 100) * conso * lossMult;
      const energyCost = energyUnits * unitPrice;
      const wearCost = includeWear ? totalKm * 0.08 : 0;

      const totalCarCost = energyCost + totalToll + wearCost;
      const costPerPax = totalCarCost / pax;

      // CO2 (ADEME)
      const carCo2Kg = ((totalKm / 100) * conso) * def.co2PerUnit;
      const carCo2PerPax = carCo2Kg / pax;
      const trainCo2Total = totalKm * 0.0029 * pax; // TGV France ADEME ~2,9 g CO2/km/voyageur
      const trainTotalCost = trainPerPax * pax;

      const carCheaper = totalCarCost <= trainTotalCost;
      const diffTrain = Math.abs(trainTotalCost - totalCarCost);

      el.verdictBanner.classList.toggle('is-positive', carCheaper);
      el.verdictVal.textContent = `${T.fmtEURDec(costPerPax)} / personne`;
      el.verdictSub.textContent = `Coût total voiture (${mult === 2 ? 'aller-retour' : 'aller simple'}, ${T.fmtNum(totalKm)} km) : ${T.fmtEURDec(totalCarCost)}. ${carCheaper ? `La voiture est ${T.fmtEURDec(diffTrain)} moins chère que le train pour ${pax} pers.` : `Le train reste ${T.fmtEURDec(diffTrain)} moins cher que la voiture pour ${pax} pers.`}`;

      el.kpiTotal.textContent = T.fmtEURDec(totalCarCost);
      el.kpiEnergy.textContent = T.fmtEURDec(energyCost);
      el.kpiCo2.textContent = `${T.fmtDec(carCo2PerPax, 1)} kg`;
      el.kpiTrain.textContent = T.fmtEURDec(trainTotalCost);

      const rows = [
        { label: `Énergie (${T.fmtDec(energyUnits, 1)} ${fuelType === 'electrique' ? 'kWh' : 'L'})`, total: energyCost, perPax: energyCost / pax },
        { label: `Péages autoroute (${mult === 2 ? 'A/R' : 'Aller'})`, total: totalToll, perPax: totalToll / pax }
      ];
      if (includeWear) {
        rows.push({ label: 'Usure entretien & pneus (0,08 €/km)', total: wearCost, perPax: wearCost / pax });
      }

      el.tableBody.innerHTML = rows.map((r) => `
        <tr>
          <td>${r.label}</td>
          <td class="num">${T.fmtEURDec(r.total)}</td>
          <td class="num">${T.fmtEURDec(r.perPax)}</td>
        </tr>
      `).join('') + `
        <tr class="row-highlight">
          <td>TOTAL VOITURE (${pax} pers.)</td>
          <td class="num text-accent">${T.fmtEURDec(totalCarCost)}</td>
          <td class="num text-accent">${T.fmtEURDec(costPerPax)}</td>
        </tr>
        <tr>
          <td>Équivalent Train TGV (${pax} pers. · ${T.fmtDec(trainCo2Total, 1)} kg CO₂)</td>
          <td class="num">${T.fmtEURDec(trainTotalCost)}</td>
          <td class="num">${T.fmtEURDec(trainPerPax)}</td>
        </tr>
      `;

      lastRes = {
        totalKm, mult, pax, totalCarCost, costPerPax, energyCost, totalToll,
        carCo2Kg, carCo2PerPax, trainTotalCost, trainPerPax, trainCo2Total
      };
      drawChart(lastRes);
    }

    function drawChart(r) {
      if (!el.canvas || !r) return;
      const { ctx, width, height } = T.setupCanvas(el.canvas);
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const bars = [
        { label: 'Voiture (1 pers.)', val: r.totalCarCost, color: '#E85D04' },
        { label: `Voiture / pers. (÷${r.pax})`, val: r.costPerPax, color: '#22C55E' },
        { label: `Train (${r.pax} pers.)`, val: r.trainTotalCost, color: '#38BDF8' },
        { label: 'Train / pers.', val: r.trainPerPax, color: '#9BA3AE' }
      ];

      const maxVal = Math.max(20, ...bars.map((b) => b.val)) * 1.15;
      const pad = { top: 28, right: 20, bottom: 48, left: 56 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      ctx.strokeStyle = '#22272E';
      ctx.lineWidth = 1;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      for (let i = 0; i <= 4; i++) {
        const v = (maxVal * i) / 4;
        const y = pad.top + plotH - (v / maxVal) * plotH;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = '#6C7582';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(v)} €`, pad.left - 8, y + 4);
      }

      const slot = plotW / bars.length;
      const barW = Math.min(68, slot * 0.56);

      bars.forEach((b, idx) => {
        const cx = pad.left + slot * idx + slot / 2;
        const bh = Math.max(4, (b.val / maxVal) * plotH);
        const y = pad.top + plotH - bh;

        ctx.fillStyle = b.color;
        ctx.fillRect(cx - barW / 2, y, barW, bh);

        ctx.fillStyle = '#F2F2EE';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(T.fmtEURDec(b.val), cx, y - 8);

        ctx.fillStyle = '#9BA3AE';
        ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(b.label, cx, height - 16);
      });
    }

    form.querySelectorAll('input, select').forEach((node) => {
      if (node !== el.routePreset && node !== el.fuel) {
        node.addEventListener('input', calculate);
        node.addEventListener('change', calculate);
      }
    });

    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', () => {
        if (!lastRes) return;
        T.exportSummaryCardPNG({
          title: `Bilan Trajet Autoroute (${T.fmtNum(lastRes.totalKm)} km)`,
          subtitle: `${lastRes.mult === 2 ? 'Aller-retour' : 'Aller simple'} · ${lastRes.pax} passager${lastRes.pax > 1 ? 's' : ''}`,
          verdictLabel: 'Coût par personne (covoiturage)',
          verdictValue: `${T.fmtEURDec(lastRes.costPerPax)} / pers.`,
          kpis: [
            { label: 'Total voiture', value: T.fmtEURDec(lastRes.totalCarCost), color: '#E85D04' },
            { label: 'Énergie + Péages', value: `${T.fmtEUR(lastRes.energyCost)} + ${T.fmtEUR(lastRes.totalToll)}`, color: '#F2F2EE' },
            { label: 'CO₂ / personne', value: `${T.fmtDec(lastRes.carCo2PerPax, 1)} kg`, color: '#22C55E' },
            { label: `Train (${lastRes.pax} pers.)`, value: T.fmtEURDec(lastRes.trainTotalCost), color: '#38BDF8' }
          ],
          filename: 'trajectoire-cout-trajet.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastRes) drawChart(lastRes);
    });

    calculate();
  });
})();
