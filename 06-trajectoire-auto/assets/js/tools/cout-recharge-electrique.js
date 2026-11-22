/* ==========================================================================
   TRAJECTOIRE — Outil 3 : Coût & Temps de Recharge Voiture Électrique
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const data = window.TRAJECTOIRE_DATA;
    const T = window.Trajectoire;
    if (!data || !T) return;

    const presetSel = document.getElementById('r-preset');
    const chargerSel = document.getElementById('r-charger');
    const tariffSel = document.getElementById('r-tariff-preset');
    if (!chargerSel || !tariffSel) return;

    const el = {
      battery: document.getElementById('r-battery'),
      conso: document.getElementById('r-conso'),
      maxDc: document.getElementById('r-max-dc'),
      socStart: document.getElementById('r-soc-start'),
      socEnd: document.getElementById('r-soc-end'),
      socStartVal: document.getElementById('r-soc-start-val'),
      socEndVal: document.getElementById('r-soc-end-val'),
      kwhPrice: document.getElementById('r-kwh-price'),
      // Sorties
      verdictVal: document.getElementById('r-verdict-val'),
      verdictSub: document.getElementById('r-verdict-sub'),
      kpiCost: document.getElementById('r-kpi-cost'),
      kpi100: document.getElementById('r-kpi-100'),
      kpiEnergy: document.getElementById('r-kpi-energy'),
      kpiRange: document.getElementById('r-kpi-range'),
      tableBody: document.getElementById('r-table-body'),
      canvas: document.getElementById('r-chart'),
      exportBtn: document.getElementById('r-export-png')
    };

    const CHARGERS = [
      { id: 'prise-23', label: 'Prise domestique standard (2,3 kW)', kw: 2.3, type: 'AC', loss: 1.12 },
      { id: 'greenup-37', label: 'Prise renforcée Green\'Up (3,7 kW)', kw: 3.7, type: 'AC', loss: 1.10 },
      { id: 'wallbox-74', label: 'Wallbox monophasée (7,4 kW)', kw: 7.4, type: 'AC', loss: 1.08 },
      { id: 'wallbox-11', label: 'Wallbox triphasée (11 kW)', kw: 11.0, type: 'AC', loss: 1.08 },
      { id: 'publique-22', label: 'Borne publique AC (22 kW — bridée à 11 kW AC)', kw: 11.0, nominalKw: 22, type: 'AC', loss: 1.08 },
      { id: 'dc-150', label: 'Superchargeur rapide DC (150 kW)', kw: 150, type: 'DC', loss: 1.06 },
      { id: 'dc-250', label: 'Superchargeur ultra-rapide DC (250 kW)', kw: 250, type: 'DC', loss: 1.06 }
    ];

    const TARIFFS = [
      { id: 'tempo-hc', label: 'EDF Tempo — Heures Creuses Bleu (0,1296 €/kWh)', price: 0.1296 },
      { id: 'bleu-hc', label: 'EDF Tarif Bleu — Heures Creuses (0,1696 €/kWh)', price: 0.1696 },
      { id: 'bleu-base', label: 'EDF Tarif Bleu — Option Base (0,2016 €/kWh)', price: 0.2016 },
      { id: 'tesla-abo', label: 'Superchargeur Tesla / Ionity Passport (0,36 €/kWh)', price: 0.36 },
      { id: 'publique-ac', label: 'Borne publique AC voirie (0,42 €/kWh)', price: 0.42 },
      { id: 'ionity-raw', label: 'Ionity / Fastned autoroute sans abo (0,59 €/kWh)', price: 0.59 }
    ];

    // Peupler presets EV
    if (presetSel) {
      const evs = data.cars.filter((c) => c.fuel === 'electrique');
      presetSel.innerHTML = '<option value="">— Batterie personnalisée —</option>';
      evs.forEach((car) => {
        const opt = document.createElement('option');
        opt.value = car.id;
        opt.textContent = `${car.name} (${car.batteryKwh} kWh · ${car.maxChargeKw} kW DC)`;
        if (car.id === 'renault-5-etech-150') opt.selected = true;
        presetSel.appendChild(opt);
      });
      presetSel.addEventListener('change', () => {
        const car = evs.find((c) => c.id === presetSel.value);
        if (!car) return;
        el.battery.value = car.batteryKwh;
        el.conso.value = car.conso;
        el.maxDc.value = car.maxChargeKw;
        calculate();
      });
    }

    chargerSel.innerHTML = '';
    CHARGERS.forEach((ch) => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = ch.label;
      if (ch.id === 'wallbox-74') opt.selected = true;
      chargerSel.appendChild(opt);
    });

    tariffSel.innerHTML = '';
    TARIFFS.forEach((tf) => {
      const opt = document.createElement('option');
      opt.value = tf.id;
      opt.textContent = tf.label;
      if (tf.id === 'bleu-hc') opt.selected = true;
      tariffSel.appendChild(opt);
    });

    tariffSel.addEventListener('change', () => {
      const tf = TARIFFS.find((t) => t.id === tariffSel.value);
      if (tf) el.kwhPrice.value = tf.price;
      calculate();
    });

    /**
     * Calcule la durée réaliste en minutes pour une session de charge donnée
     * Modélise le ralentissement de courbe (tapering) au-delà de 80 % en DC
     */
    function computeSessionMinutes(charger, batteryKwh, socStart, socEnd, vehicleMaxDc) {
      const deltaPct = Math.max(0, socEnd - socStart);
      if (deltaPct === 0) return 0;

      if (charger.type === 'AC') {
        const effKw = charger.kw;
        const kwhInBattery = batteryKwh * (deltaPct / 100);
        // Légère phase d'équilibrage au-delà de 90 %
        const highPct = Math.max(0, socEnd - Math.max(90, socStart));
        const normalPct = deltaPct - highPct;
        const normalHours = (batteryKwh * (normalPct / 100)) / effKw;
        const highHours = (batteryKwh * (highPct / 100)) / (effKw * 0.72);
        return (normalHours + highHours) * 60;
      }

      // Charge rapide DC : découpe en 3 zones (0-80 %, 80-90 %, 90-100 %)
      const peakKw = Math.min(charger.kw, Math.max(30, vehicleMaxDc));
      function zoneOverlap(a, b, z1, z2) {
        return Math.max(0, Math.min(b, z2) - Math.max(a, z1));
      }
      const pLow = zoneOverlap(socStart, socEnd, 0, 80);
      const pMid = zoneOverlap(socStart, socEnd, 80, 90);
      const pHigh = zoneOverlap(socStart, socEnd, 90, 100);

      const kwLow = peakKw * 0.68;   // Puissance moyenne réaliste 10-80 %
      const kwMid = peakKw * 0.34;   // Ralentissement 80-90 %
      const kwHigh = peakKw * 0.16;  // Équilibrage final 90-100 %

      const hours =
        (batteryKwh * (pLow / 100)) / kwLow +
        (batteryKwh * (pMid / 100)) / kwMid +
        (batteryKwh * (pHigh / 100)) / kwHigh;

      return hours * 60;
    }

    let lastRes = null;

    function calculate() {
      let start = parseInt(el.socStart.value, 10) || 0;
      let end = parseInt(el.socEnd.value, 10) || 80;
      if (end <= start) {
        end = Math.min(100, start + 5);
        el.socEnd.value = end;
      }
      el.socStartVal.textContent = `${start} %`;
      el.socEndVal.textContent = `${end} %`;

      const battery = Math.max(10, parseFloat(el.battery.value) || 52);
      const conso = Math.max(8, parseFloat(el.conso.value) || 15.6);
      const maxDc = Math.max(25, parseFloat(el.maxDc.value) || 100);
      const kwhPrice = Math.max(0.01, parseFloat(el.kwhPrice.value) || 0.1696);
      const charger = CHARGERS.find((c) => c.id === chargerSel.value) || CHARGERS[2];

      const kwhStored = battery * ((end - start) / 100);
      const kwhBilled = kwhStored * charger.loss;
      const sessionCost = kwhBilled * kwhPrice;
      const fullCost = battery * charger.loss * kwhPrice;
      const cost100 = conso * charger.loss * kwhPrice;
      const rangeGained = (kwhStored / conso) * 100;
      const minutes = computeSessionMinutes(charger, battery, start, end, maxDc);

      el.verdictVal.textContent = `${T.fmtDuration(minutes)} · ${T.fmtEURDec(sessionCost)}`;
      el.verdictSub.textContent = `Recharge de ${start} % à ${end} % sur ${charger.label} (${T.fmtDec(kwhBilled, 1)} kWh facturés incluant ${Math.round((charger.loss - 1) * 100)} % de pertes de conversion). Plein complet 0-100 % : ${T.fmtEURDec(fullCost)}.`;

      el.kpiCost.textContent = T.fmtEURDec(sessionCost);
      el.kpi100.textContent = T.fmtEURDec(cost100);
      el.kpiEnergy.textContent = `${T.fmtDec(kwhBilled, 1)} kWh`;
      el.kpiRange.textContent = `+${T.fmtNum(rangeGained)} km`;

      // Tableau comparatif des bornes
      const comparisons = CHARGERS.map((ch) => {
        const mins = computeSessionMinutes(ch, battery, start, end, maxDc);
        const billed = kwhStored * ch.loss;
        const refPrice = ch.type === 'DC' ? 0.59 : ch.id === 'publique-22' ? 0.42 : kwhPrice;
        return {
          ch,
          mins,
          billed,
          costSelectedTariff: billed * kwhPrice,
          costTypical: billed * refPrice
        };
      });

      el.tableBody.innerHTML = comparisons.map((row) => {
        const isCurrent = row.ch.id === charger.id;
        return `
          <tr class="${isCurrent ? 'row-highlight' : ''}">
            <td>${row.ch.label}${isCurrent ? ' <span class="badge badge-accent" style="margin-left:6px;">Sélectionné</span>' : ''}</td>
            <td class="num">${T.fmtDuration(row.mins)}</td>
            <td class="num">${T.fmtEURDec(row.costSelectedTariff)}</td>
            <td class="num">${T.fmtEURDec(row.costTypical)}</td>
          </tr>
        `;
      }).join('');

      lastRes = { comparisons, charger, battery, start, end, minutes, sessionCost, cost100, rangeGained, kwhBilled };
      drawChart(lastRes);
    }

    function drawChart(r) {
      if (!el.canvas || !r) return;
      const { ctx, width, height } = T.setupCanvas(el.canvas);
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const items = r.comparisons.map((c) => ({
        label: c.ch.id === 'prise-23' ? 'Prise 2,3 kW' :
               c.ch.id === 'greenup-37' ? 'Green\'Up 3,7 kW' :
               c.ch.id === 'wallbox-74' ? 'Wallbox 7,4 kW' :
               c.ch.id === 'wallbox-11' ? 'Wallbox 11 kW' :
               c.ch.id === 'publique-22' ? 'Publique 22 kW' :
               c.ch.id === 'dc-150' ? 'DC 150 kW' : 'DC 250 kW',
        mins: c.mins,
        active: c.ch.id === r.charger.id
      }));

      const maxMins = Math.max(30, ...items.map((i) => i.mins));
      const pad = { top: 16, right: 86, bottom: 16, left: 124 };
      const plotW = Math.max(80, width - pad.left - pad.right);
      const rowH = (height - pad.top - pad.bottom) / items.length;

      items.forEach((it, idx) => {
        const y = pad.top + idx * rowH;
        const barH = Math.min(20, rowH * 0.56);
        const barY = y + (rowH - barH) / 2;
        const barW = Math.max(4, (it.mins / maxMins) * plotW);

        ctx.fillStyle = it.active ? '#F2F2EE' : '#9BA3AE';
        ctx.font = `${it.active ? '700' : '500'} 12px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(it.label, pad.left - 10, barY + barH * 0.72);

        ctx.fillStyle = '#16191D';
        ctx.fillRect(pad.left, barY, plotW, barH);

        ctx.fillStyle = it.active ? '#E85D04' : '#3A424D';
        ctx.fillRect(pad.left, barY, barW, barH);

        ctx.fillStyle = it.active ? '#E85D04' : '#F2F2EE';
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(T.fmtDuration(it.mins), pad.left + plotW + 10, barY + barH * 0.72);
      });
    }

    document.querySelectorAll('#recharge-form input, #recharge-form select').forEach((node) => {
      if (node !== presetSel && node !== tariffSel) {
        node.addEventListener('input', calculate);
        node.addEventListener('change', calculate);
      }
    });

    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', () => {
        if (!lastRes) return;
        T.exportSummaryCardPNG({
          title: `Simulation Recharge Électrique (${lastRes.start} % → ${lastRes.end} %)`,
          subtitle: `Batterie ${lastRes.battery} kWh · ${lastRes.charger.label}`,
          verdictLabel: 'Durée & Coût de la session',
          verdictValue: `${T.fmtDuration(lastRes.minutes)} · ${T.fmtEURDec(lastRes.sessionCost)}`,
          kpis: [
            { label: 'Coût session', value: T.fmtEURDec(lastRes.sessionCost), color: '#E85D04' },
            { label: 'Coût aux 100 km', value: T.fmtEURDec(lastRes.cost100), color: '#22C55E' },
            { label: 'Énergie facturée', value: `${T.fmtDec(lastRes.kwhBilled, 1)} kWh`, color: '#F2F2EE' },
            { label: 'Autonomie gagnée', value: `+${T.fmtNum(lastRes.rangeGained)} km`, color: '#38BDF8' }
          ],
          filename: 'trajectoire-recharge-ve.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastRes) drawChart(lastRes);
    });

    calculate();
  });
})();
