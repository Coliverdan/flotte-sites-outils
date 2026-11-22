/* ==========================================================================
   WATTCLAIR — Outil 4 : Calculateur Dimensionnement & Coût Chauffage par Pièce
   Volume, isolation, zone climatique H1/H2/H3, impact -1 °C (-7 % ADEME)
   ========================================================================== */

(function () {
  'use strict';

  /* Besoin de puissance de référence à 19 °C en W/m³ selon l'isolation */
  const INSULATION_WM3 = {
    re2020: { wm3: 24, label: 'RT 2012 / RE 2020 (très bien isolé)', effHours: 950 },
    rt2005: { wm3: 34, label: 'Années 2000–2011 (isolation correcte)', effHours: 1120 },
    a1990: { wm3: 46, label: 'Années 1980–1999 (isolation moyenne)', effHours: 1280 },
    passoire: { wm3: 66, label: 'Avant 1975 / Passoire thermique', effHours: 1480 }
  };

  /* Zone climatique France */
  const ZONES = {
    H1: { mult: 1.12, winterMonths: 5.5, label: 'H1 — Nord, Est, Île-de-France, Montagne' },
    H2: { mult: 1.00, winterMonths: 5.0, label: 'H2 — Ouest, Centre, Sud-Ouest' },
    H3: { mult: 0.82, winterMonths: 4.0, label: 'H3 — Pourtour méditerranéen & Corse' }
  };

  function suggestRadiators(watts) {
    if (watts <= 750) return '1 radiateur de 750 W (ou 1 000 W)';
    if (watts <= 1050) return '1 radiateur de 1 000 W';
    if (watts <= 1550) return '1 radiateur de 1 500 W';
    if (watts <= 2050) return '1 radiateur de 2 000 W (ou 2 × 1 000 W)';
    if (watts <= 3050) return '2 radiateurs de 1 500 W';
    const count = Math.ceil(watts / 1500);
    return `${count} radiateurs de 1 500 W (répartis dans la pièce)`;
  }

  function init() {
    const elSurf = document.getElementById('ch-surface');
    if (!elSurf) return;

    const state = {
      surface: 22,
      height: 2.5,
      insulation: 'a1990',
      zone: 'H1',
      temp: 20,
      tariff: 0.2016
    };

    const elSurfVal = document.getElementById('ch-surface-val');
    const elHeight = document.getElementById('ch-height');
    const elHeightVal = document.getElementById('ch-height-val');
    const elTemp = document.getElementById('ch-temp');
    const elTempVal = document.getElementById('ch-temp-val');
    const elTariff = document.getElementById('ch-tariff');
    const canvas = document.getElementById('ch-chart');

    function syncBtns(sel, attr, val) {
      document.querySelectorAll(sel).forEach((b) => {
        const act = b.getAttribute(attr) === String(val);
        b.classList.toggle('is-active', act);
        b.setAttribute('aria-pressed', act ? 'true' : 'false');
      });
    }

    elSurf.addEventListener('input', () => {
      state.surface = Number(elSurf.value);
      elSurfVal.textContent = `${state.surface} m²`;
      compute();
    });

    elHeight.addEventListener('input', () => {
      state.height = Number(elHeight.value);
      elHeightVal.textContent = `${state.height.toFixed(1).replace('.', ',')} m`;
      compute();
    });

    elTemp.addEventListener('input', () => {
      state.temp = Number(elTemp.value);
      elTempVal.textContent = `${state.temp} °C`;
      compute();
    });

    elTariff.addEventListener('input', () => {
      state.tariff = Math.max(0.05, Number(elTariff.value) || 0.2016);
      compute();
    });

    document.querySelectorAll('[data-insul]').forEach((b) => {
      b.addEventListener('click', () => {
        state.insulation = b.getAttribute('data-insul');
        syncBtns('[data-insul]', 'data-insul', state.insulation);
        compute();
      });
    });

    document.querySelectorAll('[data-zone]').forEach((b) => {
      b.addEventListener('click', () => {
        state.zone = b.getAttribute('data-zone');
        syncBtns('[data-zone]', 'data-zone', state.zone);
        compute();
      });
    });

    function calcSeasonCostForTemp(powerBaseW, insulObj, zoneObj, tempC, tariff) {
      /* Puissance moyenne appelée en hiver : ~42% de la puissance de pointe sur les heures de chauffe, modulée de 7% par °C */
      const tempFactor = Math.pow(1.07, tempC - 19);
      const kwhSeason = (powerBaseW / 1000) * 0.42 * insulObj.effHours * zoneObj.mult * tempFactor;
      const costSeason = kwhSeason * tariff;
      const costMonth = costSeason / zoneObj.winterMonths;
      return { kwhSeason, costSeason, costMonth };
    }

    function compute() {
      const { fmtEur, fmtEurRound, fmtNum } = window.WattClair;
      const ins = INSULATION_WM3[state.insulation];
      const zn = ZONES[state.zone];

      const volume = state.surface * state.height;
      /* Puissance de dimensionnement à température de consigne (+5 % par °C au-dessus de 19 °C pour la pointe de froid) */
      const powerBase19 = volume * ins.wm3 * zn.mult;
      const neededWatts = Math.round((powerBase19 * (1 + (state.temp - 19) * 0.05)) / 50) * 50;

      const res = calcSeasonCostForTemp(powerBase19, ins, zn, state.temp, state.tariff);
      const resMinus1 = calcSeasonCostForTemp(powerBase19, ins, zn, state.temp - 1, state.tariff);
      const save1DegMonth = res.costMonth - resMinus1.costMonth;
      const save1DegSeason = res.costSeason - resMinus1.costSeason;

      document.getElementById('ch-out-watts').textContent = `${fmtNum(neededWatts)} W`;
      document.getElementById('ch-out-equip').textContent = `${suggestRadiators(neededWatts)} · Volume : ${fmtNum(volume, 1)} m³`;

      document.getElementById('ch-out-month').textContent = fmtEur(res.costMonth, 0);
      document.getElementById('ch-out-month-note').textContent = `moyenne sur ${zn.winterMonths} mois d'hiver`;

      document.getElementById('ch-out-season').textContent = fmtEurRound(res.costSeason);
      document.getElementById('ch-out-season-note').textContent = `${fmtNum(res.kwhSeason, 0)} kWh / hiver`;

      document.getElementById('ch-out-save1').textContent = `-${fmtEur(save1DegSeason, 0)} / an`;
      document.getElementById('ch-out-save1-note').textContent = `soit -${fmtEur(save1DegMonth, 1)} / mois (-7 %)`;

      const verdictBox = document.getElementById('ch-verdict');
      const vTitle = document.getElementById('ch-verdict-title');
      const vText = document.getElementById('ch-verdict-text');
      verdictBox.classList.remove('is-positive', 'is-accent', 'is-warning');

      if (state.temp <= 19) {
        verdictBox.classList.add('is-positive');
        vTitle.textContent = `Consigne sobre (${state.temp} °C) conforme aux recommandations ADEME`;
        vText.textContent = `À ${state.temp} °C, vous maîtrisez la dépense énergétique de cette pièce (${fmtEur(res.costMonth, 0)}/mois en hiver). Un programmateur abaissant la température à 16 °C la nuit ou en absence permet de gagner 10 à 15 % supplémentaires.`;
      } else {
        verdictBox.classList.add(state.temp >= 21 ? 'is-warning' : 'is-accent');
        const res19 = calcSeasonCostForTemp(powerBase19, ins, zn, 19, state.tariff);
        const diff19 = res.costSeason - res19.costSeason;
        vTitle.textContent = `Passer de ${state.temp} °C à 19 °C économise ${fmtEurRound(diff19)} sur cette seule pièce`;
        vText.textContent = `Chaque degré supplémentaire au-delà de 19 °C alourdit la facture de chauffage d'environ +7 %. Pour cette pièce de ${state.surface} m², l'écart représente ${fmtEur(save1DegSeason, 0)} par degré et par hiver.`;
      }

      /* Données pour le graphique 18° -> 22° */
      const temps = [18, 19, 20, 21, 22];
      const series = temps.map((t) => ({
        t,
        month: calcSeasonCostForTemp(powerBase19, ins, zn, t, state.tariff).costMonth
      }));
      drawChart(canvas, series, state.temp);
    }

    function drawChart(cvs, series, activeTemp) {
      if (!cvs) return;
      const W = 640;
      const H = 240;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);
      const maxVal = Math.max(...series.map((s) => s.month), 10) * 1.22;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const padL = 56;
      const padR = 20;
      const padT = 26;
      const padB = 42;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      ctx.strokeStyle = '#E2DDD2';
      ctx.lineWidth = 1;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#525C57';
      ctx.textAlign = 'right';

      for (let i = 0; i <= 4; i++) {
        const y = padT + plotH - (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.fillText(`${Math.round((maxVal * i) / 4)} €`, padL - 8, y + 4);
      }

      const slotW = plotW / series.length;
      const barW = Math.min(64, slotW * 0.56);

      series.forEach((item, idx) => {
        const barH = (item.month / maxVal) * plotH;
        const x = padL + idx * slotW + (slotW - barW) / 2;
        const y = padT + plotH - barH;
        const isCurrent = item.t === activeTemp;

        ctx.fillStyle = isCurrent ? '#C86D0A' : item.t <= 19 ? '#15803D' : '#1A211E';
        ctx.fillRect(x, y, barW, barH);

        ctx.fillStyle = isCurrent ? '#C86D0A' : '#1A211E';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(item.month)} €/m`, x + barW / 2, y - 8);

        ctx.fillStyle = isCurrent ? '#C86D0A' : '#525C57';
        ctx.font = isCurrent ? '700 12px "DM Sans", sans-serif' : '500 12px "DM Sans", sans-serif';
        ctx.fillText(`${item.t} °C`, x + barW / 2, padT + plotH + 22);
      });
    }

    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
