/* ==========================================================================
   TRAJECTOIRE — Outil 4 : Calculateur PRK (Vrai Coût Réel au Kilomètre)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const data = window.TRAJECTOIRE_DATA;
    const T = window.Trajectoire;
    if (!data || !T) return;

    const presetSel = document.getElementById('p-preset');
    const form = document.getElementById('prk-form');
    if (!form) return;

    const el = {
      buyPrice: document.getElementById('p-buy'),
      resalePrice: document.getElementById('p-resale'),
      years: document.getElementById('p-years'),
      yearsVal: document.getElementById('p-years-val'),
      kmYear: document.getElementById('p-km'),
      kmVal: document.getElementById('p-km-val'),
      conso: document.getElementById('p-conso'),
      unitPrice: document.getElementById('p-unit-price'),
      insurance: document.getElementById('p-insurance'),
      maint: document.getElementById('p-maint'),
      parkingMonth: document.getElementById('p-parking'),
      financeYear: document.getElementById('p-finance'),
      // Sorties
      verdictVal: document.getElementById('p-verdict-val'),
      verdictSub: document.getElementById('p-verdict-sub'),
      kpiPrk: document.getElementById('p-kpi-prk'),
      kpiAnnual: document.getElementById('p-kpi-annual'),
      kpiTotal: document.getElementById('p-kpi-total'),
      kpiHidden: document.getElementById('p-kpi-hidden'),
      tableBody: document.getElementById('p-table-body'),
      canvas: document.getElementById('p-chart'),
      exportBtn: document.getElementById('p-export-png')
    };

    if (presetSel) {
      presetSel.innerHTML = '<option value="">— Saisie libre (ma voiture) —</option>';
      data.cars.forEach((car) => {
        const opt = document.createElement('option');
        opt.value = car.id;
        opt.textContent = `${car.name} (${T.fmtEUR(car.price)})`;
        presetSel.appendChild(opt);
      });
      presetSel.addEventListener('change', () => {
        const car = data.cars.find((c) => c.id === presetSel.value);
        if (!car) return;
        const malus = car.fuel === 'electrique' ? 0 : data.getMalusCO2_2026(car.co2);
        const totalBuy = car.price + malus + car.cv * 55;
        el.buyPrice.value = Math.round(totalBuy);
        el.years.value = 5;
        el.resalePrice.value = Math.round(car.price * (1 - car.depreciation5y / 100));
        el.conso.value = car.conso;
        el.unitPrice.value = car.fuel === 'electrique' ? 0.21 : car.fuel === 'diesel' ? 1.69 : 1.78;
        el.insurance.value = car.insuranceYear;
        el.maint.value = car.maintenanceYear + 180; // inclut provision pneus
        calculate();
      });
    }

    let lastRes = null;

    function calculate() {
      const buy = Math.max(0, parseFloat(el.buyPrice.value) || 0);
      const resale = Math.max(0, Math.min(buy, parseFloat(el.resalePrice.value) || 0));
      const years = Math.max(1, parseInt(el.years.value, 10) || 5);
      const kmYear = Math.max(1000, parseInt(el.kmYear.value, 10) || 15000);
      const conso = Math.max(0, parseFloat(el.conso.value) || 0);
      const unitPrice = Math.max(0, parseFloat(el.unitPrice.value) || 0);
      const insYear = Math.max(0, parseFloat(el.insurance.value) || 0);
      const maintYear = Math.max(0, parseFloat(el.maint.value) || 0);
      const parkingYear = Math.max(0, parseFloat(el.parkingMonth.value) || 0) * 12;
      const financeYear = Math.max(0, parseFloat(el.financeYear.value) || 0);

      el.yearsVal.textContent = `${years} an${years > 1 ? 's' : ''}`;
      el.kmVal.textContent = `${T.fmtNum(kmYear)} km/an`;

      const depYear = (buy - resale) / years;
      const energyYear = (kmYear / 100) * conso * unitPrice;
      const otherYear = parkingYear + financeYear;

      const totalAnnual = depYear + energyYear + insYear + maintYear + otherYear;
      const totalMonthly = totalAnnual / 12;
      const totalPeriod = totalAnnual * years;
      const totalKm = kmYear * years;
      const prk = totalAnnual / kmYear;

      // Coût visible (carburant + assurance) vs coût caché (décote + entretien + annexes)
      const visibleMonthly = (energyYear + insYear) / 12;
      const hiddenMonthly = totalMonthly - visibleMonthly;

      el.verdictVal.textContent = `${T.fmtEUR(totalMonthly)} / mois · ${T.fmtEURDec(prk)} / km`;
      el.verdictSub.textContent = `Votre voiture vous coûte réellement ${T.fmtEUR(totalMonthly)} par mois, dont ${T.fmtEUR(hiddenMonthly)}/mois de coûts invisibles (décote de ${T.fmtEUR(depYear / 12)}/mois, entretien, stationnement).`;

      el.kpiPrk.textContent = `${T.fmtEURDec(prk)} / km`;
      el.kpiAnnual.textContent = T.fmtEUR(totalAnnual);
      el.kpiTotal.textContent = T.fmtEUR(totalPeriod);
      el.kpiHidden.textContent = `${T.fmtEUR(hiddenMonthly)} / mois`;

      const slices = [
        { label: 'Décote (perte de valeur)', annual: depYear, color: '#E85D04' },
        { label: 'Énergie (carburant / élec.)', annual: energyYear, color: '#38BDF8' },
        { label: 'Assurance automobile', annual: insYear, color: '#22C55E' },
        { label: 'Entretien, révisions & pneus', annual: maintYear, color: '#F59E0B' },
        { label: 'Parking, péages & financement', annual: otherYear, color: '#9BA3AE' }
      ];

      el.tableBody.innerHTML = slices.map((s) => {
        const pct = totalAnnual > 0 ? (s.annual / totalAnnual) * 100 : 0;
        return `
          <tr>
            <td><span class="legend-dot" style="background:${s.color};margin-right:8px;"></span>${s.label}</td>
            <td class="num">${T.fmtEUR(s.annual / 12)}</td>
            <td class="num">${T.fmtEUR(s.annual)}</td>
            <td class="num">${T.fmtEURDec(s.annual / kmYear)}</td>
            <td class="num">${T.fmtPct(pct, 1)}</td>
          </tr>
        `;
      }).join('') + `
        <tr class="row-highlight">
          <td>TOTAL RÉEL (PRK)</td>
          <td class="num text-accent">${T.fmtEUR(totalMonthly)}</td>
          <td class="num">${T.fmtEUR(totalAnnual)}</td>
          <td class="num text-accent">${T.fmtEURDec(prk)}</td>
          <td class="num">100,0 %</td>
        </tr>
      `;

      lastRes = { slices, totalAnnual, totalMonthly, totalPeriod, totalKm, prk, hiddenMonthly, years, kmYear };
      drawDonut(lastRes);
    }

    function drawDonut(r) {
      if (!el.canvas || !r) return;
      const { ctx, width, height } = T.setupCanvas(el.canvas);
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const isWide = width >= 460;
      const cx = isWide ? width * 0.30 : width * 0.5;
      const cy = isWide ? height * 0.5 : height * 0.42;
      const outerR = Math.min(isWide ? width * 0.24 : width * 0.32, height * 0.38);
      const innerR = outerR * 0.62;

      let startAngle = -Math.PI / 2;
      r.slices.forEach((s) => {
        if (s.annual <= 0 || r.totalAnnual <= 0) return;
        const angle = (s.annual / r.totalAnnual) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
        ctx.arc(cx, cy, innerR, startAngle + angle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.strokeStyle = '#0E1012';
        ctx.lineWidth = 2;
        ctx.stroke();
        startAngle += angle;
      });

      // Centre du donut
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9BA3AE';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('PRK RÉEL', cx, cy - 10);
      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(`${T.fmtEURDec(r.prk)}`, cx, cy + 14);
      ctx.fillStyle = '#6C7582';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText('par kilomètre', cx, cy + 32);

      // Légende à droite si assez large
      if (isWide) {
        const lx = width * 0.56;
        let ly = height * 0.5 - (r.slices.length * 32) / 2 + 12;
        r.slices.forEach((s) => {
          const pct = r.totalAnnual > 0 ? (s.annual / r.totalAnnual) * 100 : 0;
          ctx.fillStyle = s.color;
          ctx.fillRect(lx, ly - 10, 12, 12);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#F2F2EE';
          ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(s.label.split(' (')[0], lx + 20, ly);
          ctx.fillStyle = '#9BA3AE';
          ctx.font = '500 12px "JetBrains Mono", monospace';
          ctx.fillText(`${T.fmtEUR(s.annual / 12)}/m · ${T.fmtPct(pct, 0)}`, lx + 20, ly + 15);
          ly += 38;
        });
      }
    }

    form.querySelectorAll('input, select').forEach((node) => {
      if (node !== presetSel) {
        node.addEventListener('input', calculate);
        node.addEventListener('change', calculate);
      }
    });

    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', () => {
        if (!lastRes) return;
        T.exportSummaryCardPNG({
          title: 'Bilan PRK — Vrai Coût Réel Automobile',
          subtitle: `${T.fmtNum(lastRes.kmYear)} km/an sur ${lastRes.years} ans (${T.fmtNum(lastRes.totalKm)} km parcourus)`,
          verdictLabel: 'Coût mensuel réel & PRK',
          verdictValue: `${T.fmtEUR(lastRes.totalMonthly)} / mois · ${T.fmtEURDec(lastRes.prk)} / km`,
          kpis: [
            { label: 'PRK exact', value: `${T.fmtEURDec(lastRes.prk)}/km`, color: '#E85D04' },
            { label: 'Coût annuel', value: T.fmtEUR(lastRes.totalAnnual), color: '#F2F2EE' },
            { label: 'Coût caché/mois', value: T.fmtEUR(lastRes.hiddenMonthly), note: 'Décote + entretien + annexes', color: '#F59E0B' },
            { label: `Total ${lastRes.years} ans`, value: T.fmtEUR(lastRes.totalPeriod), color: '#38BDF8' }
          ],
          filename: 'trajectoire-prk-reel.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastRes) drawChartOrDonut();
    });

    function drawChartOrDonut() {
      if (lastRes) drawDonut(lastRes);
    }

    calculate();
  });
})();
