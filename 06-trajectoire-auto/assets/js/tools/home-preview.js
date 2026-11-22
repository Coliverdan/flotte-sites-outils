/* ==========================================================================
   TRAJECTOIRE — Widget Télémétrie Interactif du Hero (index.html)
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const data = window.TRAJECTOIRE_DATA;
    const T = window.Trajectoire;
    const widget = document.getElementById('hero-telemetry-widget');
    if (!data || !T || !widget) return;

    const PRESET_DUELS = [
      { id: 'r5-clio', label: 'R5 E-Tech vs Clio', a: 'renault-5-etech-150', b: 'renault-clio-v-tce-90' },
      { id: 'e208-208', label: 'e-208 vs 208', a: 'peugeot-e208-156', b: 'peugeot-208-puretech-100' },
      { id: 'm3-bmw', label: 'Model 3 vs Série 3', a: 'tesla-model-3-prop', b: 'bmw-serie-3-320i' },
      { id: 'ec3-c3', label: 'ë-C3 vs C3', a: 'citroen-ec3-44', b: 'citroen-c3-turbo-100' }
    ];

    const tabs = widget.querySelectorAll('[data-duel-preset]');
    const kmRange = document.getElementById('hero-km');
    const kmVal = document.getElementById('hero-km-val');
    const outVerdict = document.getElementById('hero-verdict');
    const outAName = document.getElementById('hero-a-name');
    const outBName = document.getElementById('hero-b-name');
    const outACost = document.getElementById('hero-a-cost');
    const outBCost = document.getElementById('hero-b-cost');
    const outSave5 = document.getElementById('hero-save-5');
    const outMalusB = document.getElementById('hero-malus-b');

    let currentDuel = PRESET_DUELS[0];

    function update() {
      const km = parseInt(kmRange.value, 10) || 15000;
      kmVal.textContent = `${T.fmtNum(km)} km/an`;

      const carA = data.cars.find((c) => c.id === currentDuel.a);
      const carB = data.cars.find((c) => c.id === currentDuel.b);
      if (!carA || !carB) return;

      const malusB = data.getMalusCO2_2026(carB.co2);
      const initA = carA.price;
      const initB = carB.price + malusB;

      // 80 % recharge domicile (0.2016 €/kWh) / 20 % rapide (0.59 €/kWh), pertes 8 %
      const kwhPrice = 0.8 * 0.2016 + 0.2 * 0.59;
      const annualA = (km / 100) * carA.conso * 1.08 * kwhPrice + carA.maintenanceYear + carA.insuranceYear;
      const annualB = (km / 100) * carB.conso * 1.78 + carB.maintenanceYear + carB.insuranceYear;

      const tco5A = initA + annualA * 5;
      const tco5B = initB + annualB * 5;
      const diffInit = initA - initB;
      const annualSaving = annualB - annualA;

      let verdict = '';
      if (diffInit <= 0 && annualSaving >= 0) {
        verdict = 'Rentable dès le jour 1';
      } else if (annualSaving > 0) {
        const months = (diffInit / annualSaving) * 12;
        if (months <= 120) {
          const y = Math.floor(months / 12);
          const m = Math.round(months % 12);
          const adjY = m === 12 ? y + 1 : y;
          const adjM = m === 12 ? 0 : m;
          verdict = adjY > 0
            ? `Bascule en ${adjY} an${adjY > 1 ? 's' : ''}${adjM > 0 ? ` et ${adjM} mois` : ''}`
            : `Bascule en ${adjM} mois`;
        } else {
          verdict = 'Au-delà de 10 ans';
        }
      } else {
        verdict = 'Thermique plus économique';
      }

      outVerdict.textContent = verdict;
      outAName.textContent = carA.name;
      outBName.textContent = carB.name;
      outACost.textContent = `${T.fmtEUR(annualA)}/an`;
      outBCost.textContent = `${T.fmtEUR(annualB)}/an`;
      const save5 = tco5B - tco5A;
      outSave5.textContent = `${save5 >= 0 ? '+' : ''}${T.fmtEUR(save5)}`;
      outSave5.className = `mono ${save5 >= 0 ? 'text-positive' : 'text-accent'}`;
      outMalusB.textContent = T.fmtEUR(malusB);
    }

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const id = btn.getAttribute('data-duel-preset');
        currentDuel = PRESET_DUELS.find((d) => d.id === id) || PRESET_DUELS[0];
        update();
      });
    });

    kmRange.addEventListener('input', update);
    update();
  });
})();
