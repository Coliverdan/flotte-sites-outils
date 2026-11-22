/* ==========================================================================
   TRAJECTOIRE — Outil 1 : Duel Électrique vs Thermique / Hybride (TCO 10 ans)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const data = window.TRAJECTOIRE_DATA;
    const T = window.Trajectoire;
    if (!data || !T) return;

    const selectA = document.getElementById('car-a-select');
    const selectB = document.getElementById('car-b-select');
    if (!selectA || !selectB) return;

    const fieldsA = {
      name: document.getElementById('a-name'),
      fuel: document.getElementById('a-fuel'),
      price: document.getElementById('a-price'),
      conso: document.getElementById('a-conso'),
      consoUnit: document.getElementById('a-conso-unit'),
      maint: document.getElementById('a-maint'),
      ins: document.getElementById('a-ins'),
      dep5: document.getElementById('a-dep5')
    };

    const fieldsB = {
      name: document.getElementById('b-name'),
      fuel: document.getElementById('b-fuel'),
      price: document.getElementById('b-price'),
      conso: document.getElementById('b-conso'),
      consoUnit: document.getElementById('b-conso-unit'),
      maint: document.getElementById('b-maint'),
      ins: document.getElementById('b-ins'),
      dep5: document.getElementById('b-dep5')
    };

    const usage = {
      kmYear: document.getElementById('u-km'),
      kmLabel: document.getElementById('u-km-val'),
      homeShare: document.getElementById('u-home-share'),
      homeShareLabel: document.getElementById('u-home-share-val'),
      priceElecHome: document.getElementById('u-elec-home'),
      priceElecFast: document.getElementById('u-elec-fast'),
      priceEssence: document.getElementById('u-essence'),
      priceDiesel: document.getElementById('u-diesel')
    };

    const out = {
      verdictBanner: document.getElementById('duel-verdict-banner'),
      verdictLabel: document.getElementById('duel-verdict-label'),
      verdictValue: document.getElementById('duel-verdict-value'),
      verdictSub: document.getElementById('duel-verdict-sub'),
      kpiA5: document.getElementById('kpi-a-5y'),
      kpiB5: document.getElementById('kpi-b-5y'),
      kpiDiff5: document.getElementById('kpi-diff-5y'),
      kpiDiff10: document.getElementById('kpi-diff-10y'),
      kpiAAnnual: document.getElementById('kpi-a-annual'),
      kpiBAnnual: document.getElementById('kpi-b-annual'),
      legendA: document.getElementById('legend-a-name'),
      legendB: document.getElementById('legend-b-name'),
      tableBody: document.getElementById('duel-table-body'),
      canvas: document.getElementById('duel-chart'),
      exportBtn: document.getElementById('duel-export-png'),
      swapBtn: document.getElementById('duel-swap')
    };

    // Remplissage des selects groupés par catégorie
    const categories = [...new Set(data.cars.map((c) => c.category))];
    function populateSelect(sel, defaultId) {
      sel.innerHTML = '';
      categories.forEach((cat) => {
        const group = document.createElement('optgroup');
        group.label = cat;
        data.cars
          .filter((c) => c.category === cat)
          .forEach((car) => {
            const opt = document.createElement('option');
            opt.value = car.id;
            const fuelTag = car.fuel === 'electrique' ? 'Élec' : car.fuel === 'hybride' ? 'Hyb' : car.fuel === 'diesel' ? 'Diesel' : 'Ess';
            opt.textContent = `${car.name} (${fuelTag} · ${T.fmtEUR(car.price)})`;
            if (car.id === defaultId) opt.selected = true;
            group.appendChild(opt);
          });
        sel.appendChild(group);
      });
    }

    function applyCarToFields(carId, f) {
      const car = data.cars.find((c) => c.id === carId);
      if (!car) return;
      const malus = car.fuel === 'electrique' ? 0 : data.getMalusCO2_2026(car.co2);
      f.name.value = car.name;
      f.fuel.value = car.fuel;
      f.price.value = car.price + malus;
      f.conso.value = car.conso;
      f.maint.value = car.maintenanceYear;
      f.ins.value = car.insuranceYear;
      f.dep5.value = car.depreciation5y;
      updateConsoUnit(f);
    }

    function updateConsoUnit(f) {
      if (f.consoUnit) {
        f.consoUnit.textContent = f.fuel.value === 'electrique' ? 'kWh/100' : 'L/100';
      }
    }

    populateSelect(selectA, 'peugeot-e208-156');
    populateSelect(selectB, 'peugeot-208-puretech-100');
    applyCarToFields(selectA.value, fieldsA);
    applyCarToFields(selectB.value, fieldsB);

    let lastState = null;

    function getVehicleConfig(f) {
      return {
        name: f.name.value.trim() || 'Véhicule',
        fuel: f.fuel.value,
        price: Math.max(0, parseFloat(f.price.value) || 0),
        conso: Math.max(0, parseFloat(f.conso.value) || 0),
        maint: Math.max(0, parseFloat(f.maint.value) || 0),
        ins: Math.max(0, parseFloat(f.ins.value) || 0),
        dep5: Math.min(90, Math.max(10, parseFloat(f.dep5.value) || 45))
      };
    }

    function getEnergyCostPer100(veh, u) {
      if (veh.fuel === 'electrique') {
        const homeRatio = u.homeShare / 100;
        const avgKwhPrice = homeRatio * u.elecHome + (1 - homeRatio) * u.elecFast;
        // Pertes de charge réalistes de 8 % incluses dans le coût à la prise
        return veh.conso * 1.08 * avgKwhPrice;
      }
      if (veh.fuel === 'diesel') {
        return veh.conso * u.diesel;
      }
      return veh.conso * u.essence;
    }

    function calculate() {
      const km = Math.max(1000, parseFloat(usage.kmYear.value) || 15000);
      const homeShare = Math.min(100, Math.max(0, parseFloat(usage.homeShare.value) || 80));
      usage.kmLabel.textContent = `${T.fmtNum(km)} km/an`;
      usage.homeShareLabel.textContent = `${Math.round(homeShare)} % dom. / ${Math.round(100 - homeShare)} % rapide`;

      const u = {
        km,
        homeShare,
        elecHome: Math.max(0.05, parseFloat(usage.priceElecHome.value) || 0.2016),
        elecFast: Math.max(0.10, parseFloat(usage.priceElecFast.value) || 0.59),
        essence: Math.max(0.50, parseFloat(usage.priceEssence.value) || 1.78),
        diesel: Math.max(0.50, parseFloat(usage.priceDiesel.value) || 1.69)
      };

      const vA = getVehicleConfig(fieldsA);
      const vB = getVehicleConfig(fieldsB);

      const energyA = (km / 100) * getEnergyCostPer100(vA, u);
      const energyB = (km / 100) * getEnergyCostPer100(vB, u);

      const annualA = energyA + vA.maint + vA.ins;
      const annualB = energyB + vB.maint + vB.ins;

      // Séries annuelles 0..10 ans (coût cumulé décaissé hors revente)
      const seriesA = [];
      const seriesB = [];
      for (let y = 0; y <= 10; y++) {
        seriesA.push(vA.price + annualA * y);
        seriesB.push(vB.price + annualB * y);
      }

      // Recherche du point de bascule exact (en mois)
      const diffInit = vA.price - vB.price; // >0 si A plus cher au départ
      const diffAnnual = annualA - annualB; // <0 si A moins cher à l'usage
      let breakEvenMonths = null;
      let verdictTitle = '';
      let verdictSub = '';
      let isPositive = false;

      if (Math.abs(diffInit) < 1 && Math.abs(diffAnnual) < 1) {
        verdictTitle = 'Égalité parfaite sur 10 ans';
        verdictSub = 'Les deux configurations présentent un coût d\'achat et d\'usage identique.';
      } else if (diffInit > 0 && diffAnnual < 0) {
        breakEvenMonths = (diffInit / (-diffAnnual)) * 12;
        const years = Math.floor(breakEvenMonths / 12);
        const months = Math.round(breakEvenMonths % 12);
        const adjYears = months === 12 ? years + 1 : years;
        const adjMonths = months === 12 ? 0 : months;
        if (breakEvenMonths <= 120) {
          isPositive = true;
          const timeText = adjYears > 0
            ? `${adjYears} an${adjYears > 1 ? 's' : ''}${adjMonths > 0 ? ` et ${adjMonths} mois` : ''}`
            : `${adjMonths} mois`;
          verdictTitle = `Véhicule A rentable au bout de ${timeText}`;
          verdictSub = `Le surcoût initial de ${T.fmtEUR(diffInit)} est effacé grâce à ${T.fmtEUR(-diffAnnual)}/an d'économies d'usage (${T.fmtNum(Math.round((breakEvenMonths / 12) * km))} km parcourus).`;
        } else {
          verdictTitle = 'Surcoût non amorti sur 10 ans';
          verdictSub = `Le Véhicule A économise ${T.fmtEUR(-diffAnnual)}/an, mais il faudrait ${T.fmtDec(breakEvenMonths / 12, 1)} ans pour compenser l'écart de prix initial (${T.fmtEUR(diffInit)}).`;
        }
      } else if (diffInit < 0 && diffAnnual > 0) {
        breakEvenMonths = ((-diffInit) / diffAnnual) * 12;
        const years = Math.floor(breakEvenMonths / 12);
        const months = Math.round(breakEvenMonths % 12);
        if (breakEvenMonths <= 120) {
          const timeText = years > 0
            ? `${years} an${years > 1 ? 's' : ''}${months > 0 ? ` et ${months} mois` : ''}`
            : `${months} mois`;
          verdictTitle = `Véhicule B rentable au bout de ${timeText}`;
          verdictSub = `Le Véhicule B compense son surcoût initial de ${T.fmtEUR(-diffInit)} grâce à ${T.fmtEUR(diffAnnual)}/an d'économies d'usage.`;
        } else {
          isPositive = true;
          verdictTitle = 'Véhicule A gagnant sur toute la période (10 ans)';
          verdictSub = `Le Véhicule A reste plus économique de ${T.fmtEUR(seriesB[10] - seriesA[10])} au bout de 10 ans.`;
        }
      } else if (diffInit <= 0 && diffAnnual <= 0) {
        isPositive = true;
        verdictTitle = 'Véhicule A gagnant dès le premier kilomètre';
        verdictSub = `Moins cher à l'achat (${T.fmtEUR(-diffInit)}) ET moins cher à l'usage (${T.fmtEUR(-diffAnnual)}/an).`;
      } else {
        verdictTitle = 'Véhicule B gagnant dès le premier kilomètre';
        verdictSub = `Le Véhicule B est moins cher à l'achat (${T.fmtEUR(diffInit)}) et à l'usage (${T.fmtEUR(diffAnnual)}/an).`;
      }

      // Mise à jour DOM
      out.verdictBanner.classList.toggle('is-positive', isPositive);
      out.verdictLabel.textContent = 'Point de bascule TCO (Achat + Usage)';
      out.verdictValue.textContent = verdictTitle;
      out.verdictSub.textContent = verdictSub;

      // Revente estimée à 5 ans
      const resaleA5 = vA.price * (1 - vA.dep5 / 100);
      const resaleB5 = vB.price * (1 - vB.dep5 / 100);
      const netTcoA5 = seriesA[5] - resaleA5;
      const netTcoB5 = seriesB[5] - resaleB5;

      out.kpiA5.textContent = T.fmtEUR(seriesA[5]);
      out.kpiB5.textContent = T.fmtEUR(seriesB[5]);

      const save5 = seriesB[5] - seriesA[5];
      out.kpiDiff5.textContent = `${save5 >= 0 ? '+' : ''}${T.fmtEUR(save5)}`;
      out.kpiDiff5.className = `kpi-val ${save5 >= 0 ? 'positive' : 'accent'}`;

      const save10 = seriesB[10] - seriesA[10];
      out.kpiDiff10.textContent = `${save10 >= 0 ? '+' : ''}${T.fmtEUR(save10)}`;
      out.kpiDiff10.className = `kpi-val ${save10 >= 0 ? 'positive' : 'accent'}`;

      out.kpiAAnnual.textContent = `${T.fmtEUR(annualA)} / an`;
      out.kpiBAnnual.textContent = `${T.fmtEUR(annualB)} / an`;
      out.legendA.textContent = vA.name;
      out.legendB.textContent = vB.name;

      // Tableau détaillé
      const milestones = [1, 2, 3, 5, 7, 10];
      out.tableBody.innerHTML = milestones.map((y) => {
        const cA = seriesA[y];
        const cB = seriesB[y];
        const diff = cB - cA;
        const diffCls = diff > 0 ? 'text-positive' : diff < 0 ? 'text-accent' : '';
        return `
          <tr>
            <td class="mono">Année ${y} (${T.fmtNum(y * km)} km)</td>
            <td class="num">${T.fmtEUR(cA)}</td>
            <td class="num">${T.fmtEUR(cB)}</td>
            <td class="num ${diffCls}">${diff >= 0 ? '+' : ''}${T.fmtEUR(diff)}</td>
          </tr>
        `;
      }).join('') + `
        <tr class="row-highlight">
          <td>TCO Net à 5 ans (revente déduite)</td>
          <td class="num">${T.fmtEUR(netTcoA5)}</td>
          <td class="num">${T.fmtEUR(netTcoB5)}</td>
          <td class="num ${netTcoB5 - netTcoA5 >= 0 ? 'text-positive' : 'text-accent'}">${netTcoB5 - netTcoA5 >= 0 ? '+' : ''}${T.fmtEUR(netTcoB5 - netTcoA5)}</td>
        </tr>
      `;

      lastState = {
        vA, vB, seriesA, seriesB, breakEvenMonths, verdictTitle, annualA, annualB, km, save5, save10
      };

      drawChart(lastState);
    }

    function drawChart(state) {
      if (!out.canvas || !state) return;
      const { ctx, width, height } = T.setupCanvas(out.canvas);
      const pad = { top: 24, right: 24, bottom: 38, left: 68 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      // Fond
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const maxVal = Math.max(...state.seriesA, ...state.seriesB) * 1.08;
      const minVal = Math.min(state.seriesA[0], state.seriesB[0]) * 0.85;
      const range = Math.max(1000, maxVal - minVal);

      const xOf = (year) => pad.left + (year / 10) * plotW;
      const yOf = (val) => pad.top + plotH - ((val - minVal) / range) * plotH;

      // Grille horizontale
      ctx.strokeStyle = '#22272E';
      ctx.lineWidth = 1;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#6C7582';
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const val = minVal + (range * i) / steps;
        const y = yOf(val);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(val / 1000)} k€`, pad.left - 10, y + 4);
      }

      // Axe X (Années 0..10)
      ctx.textAlign = 'center';
      for (let yr = 0; yr <= 10; yr += 2) {
        const x = xOf(yr);
        ctx.strokeStyle = '#1D2128';
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + plotH);
        ctx.stroke();
        ctx.fillStyle = '#9BA3AE';
        ctx.fillText(`An ${yr}`, x, height - 12);
      }

      // Courbe B (Craie / Gris bleuté)
      ctx.strokeStyle = '#9BA3AE';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      state.seriesB.forEach((v, idx) => {
        const x = xOf(idx);
        const y = yOf(v);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Courbe A (Orange Circuit #E85D04)
      ctx.strokeStyle = '#E85D04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      state.seriesA.forEach((v, idx) => {
        const x = xOf(idx);
        const y = yOf(v);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points clés années 0, 5, 10
      [0, 5, 10].forEach((yr) => {
        ctx.fillStyle = '#E85D04';
        ctx.beginPath();
        ctx.arc(xOf(yr), yOf(state.seriesA[yr]), 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#9BA3AE';
        ctx.beginPath();
        ctx.arc(xOf(yr), yOf(state.seriesB[yr]), 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Marqueur point de bascule
      if (state.breakEvenMonths !== null && state.breakEvenMonths > 0 && state.breakEvenMonths <= 120) {
        const yr = state.breakEvenMonths / 12;
        const val = state.vA.price + state.annualA * yr;
        const bx = xOf(yr);
        const by = yOf(val);

        ctx.strokeStyle = '#22C55E';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(bx, pad.top);
        ctx.lineTo(bx, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0E1012';
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();

        const label = `Bascule : ${T.fmtDec(yr, 1)} ans`;
        ctx.font = '600 11px "JetBrains Mono", monospace';
        const tw = ctx.measureText(label).width + 14;
        const lx = Math.min(Math.max(bx - tw / 2, pad.left + 4), width - pad.right - tw - 4);
        const ly = pad.top + 6;
        ctx.fillStyle = '#0E2216';
        ctx.fillRect(lx, ly, tw, 22);
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 1;
        ctx.strokeRect(lx, ly, tw, 22);
        ctx.fillStyle = '#22C55E';
        ctx.textAlign = 'left';
        ctx.fillText(label, lx + 7, ly + 15);
      }
    }

    // Écouteurs d'événements
    selectA.addEventListener('change', () => {
      applyCarToFields(selectA.value, fieldsA);
      calculate();
    });

    selectB.addEventListener('change', () => {
      applyCarToFields(selectB.value, fieldsB);
      calculate();
    });

    fieldsA.fuel.addEventListener('change', () => { updateConsoUnit(fieldsA); calculate(); });
    fieldsB.fuel.addEventListener('change', () => { updateConsoUnit(fieldsB); calculate(); });

    document.querySelectorAll('#duel-form input, #duel-form select').forEach((el) => {
      if (el !== selectA && el !== selectB) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    if (out.swapBtn) {
      out.swapBtn.addEventListener('click', () => {
        const tmp = selectA.value;
        selectA.value = selectB.value;
        selectB.value = tmp;
        applyCarToFields(selectA.value, fieldsA);
        applyCarToFields(selectB.value, fieldsB);
        calculate();
      });
    }

    if (out.exportBtn) {
      out.exportBtn.addEventListener('click', () => {
        if (!lastState) return;
        T.exportSummaryCardPNG({
          title: `${lastState.vA.name} vs ${lastState.vB.name}`,
          subtitle: `Comparatif TCO sur 10 ans · ${T.fmtNum(lastState.km)} km/an`,
          verdictLabel: 'Point de bascule',
          verdictValue: lastState.verdictTitle,
          kpis: [
            { label: 'Coût A à 5 ans', value: T.fmtEUR(lastState.seriesA[5]), note: `${T.fmtEUR(lastState.annualA)}/an d'usage`, color: '#E85D04' },
            { label: 'Coût B à 5 ans', value: T.fmtEUR(lastState.seriesB[5]), note: `${T.fmtEUR(lastState.annualB)}/an d'usage`, color: '#F2F2EE' },
            { label: 'Écart à 5 ans', value: `${lastState.save5 >= 0 ? '+' : ''}${T.fmtEUR(lastState.save5)}`, note: 'Avantage Véhicule A', color: lastState.save5 >= 0 ? '#22C55E' : '#E85D04' },
            { label: 'Écart à 10 ans', value: `${lastState.save10 >= 0 ? '+' : ''}${T.fmtEUR(lastState.save10)}`, note: 'Bilan cumulé', color: lastState.save10 >= 0 ? '#22C55E' : '#E85D04' }
          ],
          filename: 'trajectoire-duel-tco.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastState) drawChart(lastState);
    });

    calculate();
  });
})();
