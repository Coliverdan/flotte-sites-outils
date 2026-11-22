/* ==========================================================================
   WATTCLAIR — Outil 1 : Simulateur Rentabilité Kit Solaire Balcon Plug & Play
   96 départements métropolitains (irradiation kWh/kWc/an), graphique mensuel
   Canvas, amortissement exact & bilan 20 ans avec inflation électricité (+3%/an)
   ========================================================================== */

(function () {
  'use strict';

  /* Base d'irradiation annuelle moyenne (kWh/kWc/an, inclinaison optimale 30° Sud, PR 0,80) — 96 départements */
  const DEPARTEMENTS = [
    ['01', 'Ain', 1200], ['02', 'Aisne', 1030], ['03', 'Allier', 1170], ['04', 'Alpes-de-Haute-Provence', 1430],
    ['05', 'Hautes-Alpes', 1410], ['06', 'Alpes-Maritimes', 1460], ['07', 'Ardèche', 1320], ['08', 'Ardennes', 1010],
    ['09', 'Ariège', 1280], ['10', 'Aube', 1110], ['11', 'Aude', 1410], ['12', 'Aveyron', 1280],
    ['13', 'Bouches-du-Rhône', 1480], ['14', 'Calvados', 1060], ['15', 'Cantal', 1220], ['16', 'Charente', 1230],
    ['17', 'Charente-Maritime', 1270], ['18', 'Cher', 1150], ['19', 'Corrèze', 1210], ['2A', 'Corse-du-Sud', 1490],
    ['2B', 'Haute-Corse', 1470], ['21', 'Côte-d\'Or', 1150], ['22', 'Côtes-d\'Armor', 1080], ['23', 'Creuse', 1170],
    ['24', 'Dordogne', 1240], ['25', 'Doubs', 1130], ['26', 'Drôme', 1360], ['27', 'Eure', 1050],
    ['28', 'Eure-et-Loir', 1100], ['29', 'Finistère', 1090], ['30', 'Gard', 1440], ['31', 'Haute-Garonne', 1310],
    ['32', 'Gers', 1290], ['33', 'Gironde', 1270], ['34', 'Hérault', 1450], ['35', 'Ille-et-Vilaine', 1110],
    ['36', 'Indre', 1160], ['37', 'Indre-et-Loire', 1170], ['38', 'Isère', 1240], ['39', 'Jura', 1150],
    ['40', 'Landes', 1280], ['41', 'Loir-et-Cher', 1150], ['42', 'Loire', 1210], ['43', 'Haute-Loire', 1250],
    ['44', 'Loire-Atlantique', 1180], ['45', 'Loiret', 1130], ['46', 'Lot', 1270], ['47', 'Lot-et-Garonne', 1280],
    ['48', 'Lozère', 1310], ['49', 'Maine-et-Loire', 1170], ['50', 'Manche', 1070], ['51', 'Marne', 1080],
    ['52', 'Haute-Marne', 1110], ['53', 'Mayenne', 1120], ['54', 'Meurthe-et-Moselle', 1070], ['55', 'Meuse', 1060],
    ['56', 'Morbihan', 1150], ['57', 'Moselle', 1060], ['58', 'Nièvre', 1150], ['59', 'Nord', 980],
    ['60', 'Oise', 1040], ['61', 'Orne', 1070], ['62', 'Pas-de-Calais', 990], ['63', 'Puy-de-Dôme', 1200],
    ['64', 'Pyrénées-Atlantiques', 1260], ['65', 'Hautes-Pyrénées', 1270], ['66', 'Pyrénées-Orientales', 1470], ['67', 'Bas-Rhin', 1090],
    ['68', 'Haut-Rhin', 1130], ['69', 'Rhône', 1230], ['70', 'Haute-Saône', 1120], ['71', 'Saône-et-Loire', 1170],
    ['72', 'Sarthe', 1130], ['73', 'Savoie', 1230], ['74', 'Haute-Savoie', 1200], ['75', 'Paris', 1080],
    ['76', 'Seine-Maritime', 1020], ['77', 'Seine-et-Marne', 1090], ['78', 'Yvelines', 1080], ['79', 'Deux-Sèvres', 1200],
    ['80', 'Somme', 1010], ['81', 'Tarn', 1310], ['82', 'Tarn-et-Garonne', 1300], ['83', 'Var', 1480],
    ['84', 'Vaucluse', 1450], ['85', 'Vendée', 1220], ['86', 'Vienne', 1200], ['87', 'Haute-Vienne', 1180],
    ['88', 'Vosges', 1090], ['89', 'Yonne', 1130], ['90', 'Territoire de Belfort', 1110], ['91', 'Essonne', 1085],
    ['92', 'Hauts-de-Seine', 1080], ['93', 'Seine-Saint-Denis', 1075], ['94', 'Val-de-Marne', 1085], ['95', 'Val-d\'Oise', 1065]
  ];

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  /* Répartition mensuelle selon l'inclinaison (somme = 1.00) */
  const MONTHLY_SHARES = {
    '30': [0.036, 0.052, 0.084, 0.106, 0.123, 0.132, 0.138, 0.122, 0.092, 0.058, 0.033, 0.024],
    '45': [0.042, 0.058, 0.088, 0.105, 0.118, 0.124, 0.130, 0.118, 0.094, 0.062, 0.035, 0.026],
    '90': [0.064, 0.076, 0.096, 0.095, 0.093, 0.090, 0.096, 0.101, 0.099, 0.081, 0.058, 0.051]
  };

  const ORIENTATION_FACTORS = {
    sud: { factor: 1.0, label: 'Plein Sud' },
    se_so: { factor: 0.94, label: 'Sud-Est / Sud-Ouest' },
    est_ouest: { factor: 0.81, label: 'Est / Ouest' }
  };

  const TILT_FACTORS = {
    '30': { factor: 1.0, label: '30° (jardin / terrasse)' },
    '45': { factor: 0.96, label: '45° (support incliné)' },
    '90': { factor: 0.72, label: '90° (garde-corps vertical)' }
  };

  const KIT_PRESET_PRICES = {
    400: 420,
    800: 690,
    1200: 1050,
    1600: 1390
  };

  function init() {
    const deptSelect = document.getElementById('sol-dept');
    if (!deptSelect) return;

    /* Peupler les 96 départements */
    DEPARTEMENTS.forEach(([code, name, yieldKwh]) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code} — ${name} (${yieldKwh} kWh/kWc)`;
      if (code === '69') opt.selected = true;
      deptSelect.appendChild(opt);
    });

    const state = {
      dept: '69',
      powerW: 800,
      orientation: 'sud',
      tilt: '30',
      shading: 5,
      price: 690,
      tariff: 0.2016,
      selfCons: 75,
      chartMode: 'kwh'
    };

    const elPrice = document.getElementById('sol-price');
    const elTariff = document.getElementById('sol-tariff');
    const elShading = document.getElementById('sol-shading');
    const elShadingVal = document.getElementById('sol-shading-val');
    const elSelfCons = document.getElementById('sol-selfcons');
    const elSelfConsVal = document.getElementById('sol-selfcons-val');
    const canvas = document.getElementById('sol-chart');

    function syncSegmented(groupSelector, attr, activeVal) {
      document.querySelectorAll(groupSelector).forEach((btn) => {
        const isAct = btn.getAttribute(attr) === String(activeVal);
        btn.classList.toggle('is-active', isAct);
        btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
      });
    }

    deptSelect.addEventListener('change', () => {
      state.dept = deptSelect.value;
      compute();
    });

    document.querySelectorAll('[data-power]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const w = Number(btn.getAttribute('data-power'));
        state.powerW = w;
        if (KIT_PRESET_PRICES[w]) {
          state.price = KIT_PRESET_PRICES[w];
          elPrice.value = state.price;
        }
        /* Ajuster l'autoconsommation indicative si kit plus grand */
        const suggestedSC = w <= 400 ? 85 : w <= 800 ? 75 : w <= 1200 ? 62 : 52;
        state.selfCons = suggestedSC;
        elSelfCons.value = suggestedSC;
        elSelfConsVal.textContent = `${suggestedSC} %`;
        syncSegmented('[data-power]', 'data-power', w);
        compute();
      });
    });

    document.querySelectorAll('[data-orient]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.orientation = btn.getAttribute('data-orient');
        syncSegmented('[data-orient]', 'data-orient', state.orientation);
        compute();
      });
    });

    document.querySelectorAll('[data-tilt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tilt = btn.getAttribute('data-tilt');
        syncSegmented('[data-tilt]', 'data-tilt', state.tilt);
        compute();
      });
    });

    document.querySelectorAll('[data-chart-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.chartMode = btn.getAttribute('data-chart-mode');
        syncSegmented('[data-chart-mode]', 'data-chart-mode', state.chartMode);
        compute();
      });
    });

    elShading.addEventListener('input', () => {
      state.shading = Number(elShading.value);
      elShadingVal.textContent = `${state.shading} %`;
      compute();
    });

    elSelfCons.addEventListener('input', () => {
      state.selfCons = Number(elSelfCons.value);
      elSelfConsVal.textContent = `${state.selfCons} %`;
      compute();
    });

    elPrice.addEventListener('input', () => {
      state.price = Math.max(50, Number(elPrice.value) || 0);
      compute();
    });

    elTariff.addEventListener('input', () => {
      state.tariff = Math.max(0.05, Number(elTariff.value) || 0.2016);
      compute();
    });

    const exportBtn = document.getElementById('sol-export-png');
    if (exportBtn && canvas) {
      exportBtn.addEventListener('click', () => {
        window.WattClair.exportCanvasPNG(canvas, `wattclair-solaire-${state.dept}-${state.powerW}W.png`);
      });
    }

    function compute() {
      const { fmtEur, fmtEurRound, fmtNum, fmtKwh } = window.WattClair;
      const deptEntry = DEPARTEMENTS.find((d) => d[0] === state.dept) || DEPARTEMENTS[68];
      const baseYield = deptEntry[2];
      const kwc = state.powerW / 1000;

      const orientFactor = ORIENTATION_FACTORS[state.orientation].factor;
      const tiltFactor = TILT_FACTORS[state.tilt].factor;
      const shadeFactor = 1 - state.shading / 100;

      const annualProdKwh = kwc * baseYield * orientFactor * tiltFactor * shadeFactor;
      const autoConsKwh = annualProdKwh * (state.selfCons / 100);
      const surplusKwh = annualProdKwh - autoConsKwh;
      const year1Savings = autoConsKwh * state.tariff;

      /* Calcul sur 20 ans avec inflation électricité +3%/an et vieillissement panneaux -0,5%/an */
      const inflation = 0.03;
      const degradation = 0.005;
      let cumulative = 0;
      let paybackYears = null;

      for (let yr = 1; yr <= 20; yr++) {
        const prevCum = cumulative;
        const yrKwh = autoConsKwh * Math.pow(1 - degradation, yr - 1);
        const yrTariff = state.tariff * Math.pow(1 + inflation, yr - 1);
        const yrGain = yrKwh * yrTariff;
        cumulative += yrGain;

        if (paybackYears === null && cumulative >= state.price) {
          const fraction = (state.price - prevCum) / yrGain;
          paybackYears = (yr - 1) + fraction;
        }
      }

      const net20Years = cumulative - state.price;
      const roiPct = state.price > 0 ? (net20Years / state.price) * 100 : 0;

      /* Mise à jour DOM */
      document.getElementById('sol-out-payback').textContent =
        paybackYears !== null
          ? `${Math.floor(paybackYears)} ans ${Math.round((paybackYears % 1) * 12)} mois`
          : '> 20 ans';

      document.getElementById('sol-out-sub').textContent =
        `${deptEntry[1]} (${deptEntry[0]}) · Kit ${state.powerW} Wc ${ORIENTATION_FACTORS[state.orientation].label}, inclinaison ${state.tilt}°`;

      document.getElementById('sol-out-prod').textContent = fmtKwh(annualProdKwh, 0);
      document.getElementById('sol-out-autocons').textContent = `${fmtKwh(autoConsKwh, 0)} consommés`;
      document.getElementById('sol-out-yr1').textContent = fmtEurRound(year1Savings);
      document.getElementById('sol-out-yr1-note').textContent = `soit ${fmtEur(year1Savings / 12, 1)} / mois`;
      document.getElementById('sol-out-20y').textContent = fmtEurRound(net20Years);
      document.getElementById('sol-out-20y-note').textContent = `Gain net (+${fmtNum(roiPct, 0)} % ROI)`;

      /* Verdict dynamique */
      const verdictEl = document.getElementById('sol-verdict');
      const verdictTitle = document.getElementById('sol-verdict-title');
      const verdictText = document.getElementById('sol-verdict-text');
      verdictEl.classList.remove('is-positive', 'is-accent', 'is-warning');

      if (paybackYears !== null && paybackYears <= 5.5) {
        verdictEl.classList.add('is-positive');
        verdictTitle.textContent = 'Rentabilité rapide et très solide';
        verdictText.textContent = `Avec un amortissement en ${paybackYears.toFixed(1).replace('.', ',')} ans, votre kit ${state.powerW} Wc génère plus de 14 années d'électricité gratuite (net ${fmtEurRound(net20Years)} sur 20 ans).`;
      } else if (paybackYears !== null && paybackYears <= 9) {
        verdictEl.classList.add('is-accent');
        verdictTitle.textContent = 'Rentabilité équilibrée sur le moyen terme';
        verdictText.textContent = `Le kit est amorti en ${paybackYears.toFixed(1).replace('.', ',')} ans. Pour accélérer le retour sur investissement, visez un taux d'autoconsommation supérieur en programmant lave-linge ou ballon vers 12h–15h (${fmtKwh(surplusKwh, 0)} actuellement injectés gratuitement).`;
      } else {
        verdictEl.classList.add('is-warning');
        verdictTitle.textContent = 'Configuration pénalisée par l\'ombrage, le prix ou l\'inclinaison';
        verdictText.textContent = `L'amortissement dépasse 9 ans. Réduisez l'ombrage, inclinez les panneaux à 30°–45° si possible, ou comparez un kit 800 Wc mieux dimensionné à votre talon de consommation.`;
      }

      /* Répartition mensuelle & Canvas */
      const shares = MONTHLY_SHARES[state.tilt];
      const monthlyKwh = shares.map((s) => annualProdKwh * s);
      const monthlyEur = shares.map((s) => autoConsKwh * s * state.tariff);

      drawMonthlyChart(canvas, monthlyKwh, monthlyEur, state.chartMode);
    }

    function drawMonthlyChart(cvs, kwhData, eurData, mode) {
      if (!cvs) return;
      const W = 680;
      const H = 300;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);
      const data = mode === 'eur' ? eurData : kwhData;
      const maxVal = Math.max(...data, 1) * 1.18;

      /* Fond plat */
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const padL = 52;
      const padR = 16;
      const padT = 28;
      const padB = 42;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      /* Grille horizontale 4 lignes */
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

        const tickVal = (maxVal * i) / 4;
        const label = mode === 'eur' ? `${Math.round(tickVal)} €` : `${Math.round(tickVal)}`;
        ctx.fillText(label, padL - 8, y + 4);
      }

      /* Barres mensuelles */
      const slotW = plotW / 12;
      const barW = Math.min(32, slotW * 0.62);

      data.forEach((val, idx) => {
        const barH = (val / maxVal) * plotH;
        const x = padL + idx * slotW + (slotW - barW) / 2;
        const y = padT + plotH - barH;

        /* Accent sur les mois d'été (Mai-Août), ardoise sur les autres */
        ctx.fillStyle = idx >= 4 && idx <= 7 ? '#C86D0A' : '#1A211E';
        ctx.fillRect(x, y, barW, barH);

        /* Valeur au sommet */
        ctx.fillStyle = '#1A211E';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const topLabel = mode === 'eur' ? `${val.toFixed(0)}€` : `${Math.round(val)}`;
        ctx.fillText(topLabel, x + barW / 2, y - 6);

        /* Mois en abscisse */
        ctx.fillStyle = '#525C57';
        ctx.font = '500 11px "DM Sans", sans-serif';
        ctx.fillText(MONTHS[idx], x + barW / 2, padT + plotH + 20);
      });

      /* Unité axe Y */
      ctx.fillStyle = '#6E7873';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(mode === 'eur' ? 'ÉCONOMIE MENSUELLE (€)' : 'PRODUCTION TOTALE (kWh)', padL, 14);
    }

    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
