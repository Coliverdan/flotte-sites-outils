/* ==========================================================================
   WATTCLAIR — Mini-simulateur interactif dans le Hero asymétrique (index.html)
   ========================================================================== */

(function () {
  'use strict';

  function init() {
    const slider = document.getElementById('hero-kwh');
    if (!slider) return;

    const elKwhVal = document.getElementById('hero-kwh-val');
    const elBase = document.getElementById('hero-out-base');
    const elTempo = document.getElementById('hero-out-tempo');
    const elSave = document.getElementById('hero-out-save');
    const elSolar = document.getElementById('hero-out-solar');

    function update() {
      const { EDF_TARIFS, fmtEurRound, fmtNum } = window.WattClair;
      const kwh = Number(slider.value);
      elKwhVal.textContent = `${fmtNum(kwh)} kWh / an`;

      /* Estimation rapide (9 kVA, 40% HC, effacement modéré 30%) */
      const base = EDF_TARIFS.base.abo[9] + kwh * EDF_TARIFS.base.kwh;
      const tempoAvgRate = 0.78 * (0.4 * EDF_TARIFS.tempo.bleuHC + 0.6 * EDF_TARIFS.tempo.bleuHP) +
        0.14 * (0.4 * EDF_TARIFS.tempo.blancHC + 0.6 * EDF_TARIFS.tempo.blancHP) +
        0.08 * (0.55 * EDF_TARIFS.tempo.rougeHC + 0.45 * EDF_TARIFS.tempo.rougeHP);
      const tempo = EDF_TARIFS.tempo.abo[9] + kwh * tempoAvgRate;
      const diff = Math.max(0, base - tempo);

      /* Gain indicatif kit solaire 800 Wc (1200 kWh/kWc, 75% autoconsommation) */
      const solarGain = 0.8 * 1200 * 0.75 * EDF_TARIFS.base.kwh;

      elBase.textContent = fmtEurRound(base);
      elTempo.textContent = fmtEurRound(tempo);
      elSave.textContent = `−${fmtEurRound(diff)} / an`;
      elSolar.textContent = `−${fmtEurRound(solarGain)} / an`;
    }

    slider.addEventListener('input', update);
    update();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
