/* ==========================================================================
   OUTIL 02 — Mon Inflation Personnelle (2018-2026) & Négociation Salariale
   Indices calibrés sur les séries historiques INSEE (Base 100 = 2018)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const INDICES = {
    ipc:          { 2018: 100.0, 2019: 101.1, 2020: 101.6, 2021: 103.3, 2022: 108.7, 2023: 114.0, 2024: 116.3, 2025: 118.2, 2026: 120.2 },
    logement:     { 2018: 100.0, 2019: 100.8, 2020: 101.4, 2021: 102.3, 2022: 105.0, 2023: 108.7, 2024: 112.1, 2025: 114.3, 2026: 116.4 },
    alimentation: { 2018: 100.0, 2019: 102.5, 2020: 104.4, 2021: 105.0, 2022: 112.1, 2023: 125.4, 2024: 127.2, 2025: 129.1, 2026: 131.7 },
    energie:      { 2018: 100.0, 2019: 101.9, 2020: 95.7,  2021: 105.8, 2022: 130.2, 2023: 137.5, 2024: 148.5, 2025: 145.8, 2026: 149.0 },
    transports:   { 2018: 100.0, 2019: 101.2, 2020: 99.8,  2021: 104.5, 2022: 115.6, 2023: 120.2, 2024: 122.4, 2025: 124.2, 2026: 126.5 },
    loisirs:      { 2018: 100.0, 2019: 101.0, 2020: 101.6, 2021: 102.9, 2022: 107.6, 2023: 113.1, 2024: 116.0, 2025: 118.4, 2026: 120.8 },
    autres:       { 2018: 100.0, 2019: 100.4, 2020: 100.8, 2021: 101.5, 2022: 104.2, 2023: 107.6, 2024: 109.2, 2025: 110.5, 2026: 111.9 }
  };

  const CATEGORIES = [
    { key: 'logement', label: 'Logement (loyer, charges)', color: '#0F5132' },
    { key: 'alimentation', label: 'Alimentation & courses', color: '#A62C2B' },
    { key: 'energie', label: 'Énergie (électricité, gaz)', color: '#8A6116' },
    { key: 'transports', label: 'Transports & carburant', color: '#2F4858' },
    { key: 'loisirs', label: 'Loisirs & restauration', color: '#4B554E' },
    { key: 'autres', label: 'Autres (santé, télécoms)', color: '#7D8780' }
  ];

  const baseYearEl = document.getElementById('inf-base-year');
  const salBaseEl = document.getElementById('inf-sal-base');
  const salNowEl = document.getElementById('inf-sal-now');
  const weightSumEl = document.getElementById('inf-weight-sum');
  const canvasEl = document.getElementById('inf-chart');
  const pitchEl = document.getElementById('inf-pitch');

  if (!baseYearEl || !canvasEl) return;

  let tone = 'rh'; // 'rh' | 'manager'

  const weightInputs = {};
  const weightDisplays = {};
  CATEGORIES.forEach(function (cat) {
    weightInputs[cat.key] = document.getElementById('w-' + cat.key);
    weightDisplays[cat.key] = document.getElementById('w-val-' + cat.key);
  });

  function getWeights() {
    const raw = {};
    let sum = 0;
    CATEGORIES.forEach(function (cat) {
      const v = parseFloat(weightInputs[cat.key].value) || 0;
      raw[cat.key] = v;
      sum += v;
    });
    const norm = {};
    CATEGORIES.forEach(function (cat) {
      norm[cat.key] = sum > 0 ? raw[cat.key] / sum : 1 / CATEGORIES.length;
    });
    return { raw: raw, norm: norm, sum: sum };
  }

  function recalc() {
    const baseYear = parseInt(baseYearEl.value, 10) || 2019;
    const salBase = Math.max(0, parseFloat(salBaseEl.value) || 0);
    const salNow = Math.max(0, parseFloat(salNowEl.value) || 0);
    const weights = getWeights();

    CATEGORIES.forEach(function (cat) {
      const pct = weights.norm[cat.key] * 100;
      if (weightDisplays[cat.key]) {
        weightDisplays[cat.key].textContent = Math.round(weights.raw[cat.key]) + ' %' + (Math.round(weights.sum) !== 100 ? ' (' + pct.toFixed(0) + ' % norm.)' : '');
      }
    });

    if (weightSumEl) {
      weightSumEl.textContent = 'Somme des pondérations : ' + Math.round(weights.sum) + ' %' + (Math.round(weights.sum) === 100 ? ' (équilibré)' : ' — normalisé automatiquement sur 100 %');
    }

    const officialInf = (INDICES.ipc[2026] / INDICES.ipc[baseYear] - 1) * 100;

    let personalInf = 0;
    const catStats = CATEGORIES.map(function (cat) {
      const catRate = (INDICES[cat.key][2026] / INDICES[cat.key][baseYear] - 1) * 100;
      const contrib = catRate * weights.norm[cat.key];
      personalInf += contrib;
      return {
        key: cat.key,
        label: cat.label,
        color: cat.color,
        rate: catRate,
        weight: weights.norm[cat.key] * 100,
        contrib: contrib
      };
    });

    const equivalentSal = salBase * (1 + personalInf / 100);
    const deltaMonth = salNow - equivalentSal;
    const deltaYear = deltaMonth * 12;
    const nominalGrowth = salBase > 0 ? ((salNow / salBase) - 1) * 100 : 0;
    const realGrowth = salBase > 0 ? (((salNow / salBase) / (1 + personalInf / 100)) - 1) * 100 : 0;
    const neededRaisePct = salNow > 0 && deltaMonth < 0 ? ((equivalentSal / salNow) - 1) * 100 : 0;

    /* Mise à jour KPIs */
    document.getElementById('kpi-inf-perso').textContent = '+' + Valora.formatPercent(personalInf, 1);
    document.getElementById('kpi-inf-ipc').textContent = 'IPC INSEE : +' + Valora.formatPercent(officialInf, 1);

    const kpiDeltaCard = document.getElementById('kpi-delta-card');
    const kpiDeltaVal = document.getElementById('kpi-delta-month');
    const kpiDeltaSub = document.getElementById('kpi-delta-year');
    kpiDeltaVal.textContent = Valora.formatSignedEUR(deltaMonth) + ' / mois';
    kpiDeltaSub.textContent = Valora.formatSignedEUR(deltaYear) + ' / an (' + (realGrowth >= 0 ? '+' : '') + Valora.formatPercent(realGrowth, 1) + ' réel)';
    kpiDeltaCard.className = 'kpi-card ' + (deltaMonth < 0 ? 'kpi-card-danger' : 'kpi-card-accent');

    document.getElementById('kpi-sal-equiv').textContent = Valora.formatEUR(equivalentSal);
    document.getElementById('kpi-sal-sub').textContent =
      deltaMonth < 0
        ? 'Rattrapage nécessaire : +' + Valora.formatPercent(neededRaisePct, 1)
        : 'Pouvoir d\'achat préservé (nominal : ' + (nominalGrowth >= 0 ? '+' : '') + Valora.formatPercent(nominalGrowth, 1) + ')';

    /* Mise à jour du tableau détaillé */
    const tbody = document.getElementById('inf-table-body');
    if (tbody) {
      tbody.innerHTML = catStats.map(function (c) {
        return '<tr>' +
          '<td><strong>' + c.label + '</strong></td>' +
          '<td class="num">' + Valora.formatPercent(c.weight, 0) + '</td>' +
          '<td class="num">+' + Valora.formatPercent(c.rate, 1) + '</td>' +
          '<td class="num">+' + Valora.formatPercent(c.contrib, 2) + ' pts</td>' +
          '</tr>';
      }).join('');
    }

    drawChart(catStats, personalInf, officialInf);
    updatePitch({
      baseYear: baseYear,
      salBase: salBase,
      salNow: salNow,
      personalInf: personalInf,
      officialInf: officialInf,
      equivalentSal: equivalentSal,
      deltaMonth: deltaMonth,
      deltaYear: deltaYear,
      neededRaisePct: neededRaisePct,
      nominalGrowth: nominalGrowth,
      topPost: catStats.slice().sort(function (a, b) { return b.contrib - a.contrib; })[0]
    });
  }

  function drawChart(catStats, personalInf, officialInf) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const rows = [
      { label: 'Mon inflation perso', val: personalInf, color: '#A62C2B', bold: true },
      { label: 'IPC officiel INSEE', val: officialInf, color: '#0F5132', bold: true }
    ].concat(catStats.map(function (c) {
      return { label: c.label.split(' ')[0], val: c.rate, color: '#4B554E', bold: false };
    }));

    const pad = { top: 16, right: 64, bottom: 20, left: 156 };
    const cw = Math.max(80, w - pad.left - pad.right);
    const ch = h - pad.top - pad.bottom;
    const maxVal = Math.max(10, ...rows.map(function (r) { return r.val; })) * 1.12;
    const rowH = ch / rows.length;

    rows.forEach(function (r, idx) {
      const y = pad.top + idx * rowH;
      const barH = Math.min(20, rowH * 0.56);
      const barY = y + (rowH - barH) / 2;
      const barW = Math.max(2, (r.val / maxVal) * cw);

      /* Séparateur après les 2 barres globales */
      if (idx === 2) {
        ctx.strokeStyle = '#E4DFD3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, y - 2);
        ctx.lineTo(w - 12, y - 2);
        ctx.stroke();
      }

      ctx.font = (r.bold ? '700' : '500') + ' 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = r.bold ? '#111814' : '#4B554E';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, pad.left - 12, barY + barH / 2);

      /* Piste fond */
      ctx.fillStyle = '#F1EDE4';
      ctx.fillRect(pad.left, barY, cw, barH);

      /* Barre pleine */
      ctx.fillStyle = r.color;
      ctx.fillRect(pad.left, barY, barW, barH);

      /* Valeur */
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = r.bold ? r.color : '#111814';
      ctx.textAlign = 'left';
      ctx.fillText('+' + Valora.formatPercent(r.val, 1), pad.left + barW + 8, barY + barH / 2);
    });
  }

  function updatePitch(d) {
    if (!pitchEl) return;
    let text = '';
    if (d.deltaMonth < 0) {
      const perteM = Valora.formatEUR(Math.abs(d.deltaMonth));
      const perteA = Valora.formatEUR(Math.abs(d.deltaYear));
      const equiv = Valora.formatEUR(d.equivalentSal);
      const rattrapage = Valora.formatPercent(d.neededRaisePct, 1);

      if (tone === 'rh') {
        text =
          'Objet : Demande de réévaluation salariale — Ajustement pouvoir d\'achat ' + d.baseYear + '–2026\n\n' +
          'Dans le cadre de notre prochain entretien annuel, je souhaite aborder l\'évolution de ma rémunération de manière factuelle. ' +
          'Entre ' + d.baseYear + ' et 2026, l\'inflation cumulée officielle (IPC INSEE) atteint +' + Valora.formatPercent(d.officialInf, 1) + ', et mon inflation personnelle pondérée par ma structure de budget s\'élève à +' + Valora.formatPercent(d.personalInf, 1) + ' (tirée notamment par le poste « ' + d.topPost.label + ' » à +' + Valora.formatPercent(d.topPost.rate, 1) + ').\n\n' +
          'Sur la même période, mon salaire net mensuel est passé de ' + Valora.formatEUR(d.salBase) + ' à ' + Valora.formatEUR(d.salNow) + ' (' + (d.nominalGrowth >= 0 ? '+' : '') + Valora.formatPercent(d.nominalGrowth, 1) + '), alors qu\'un simple maintien de mon pouvoir d\'achat de ' + d.baseYear + ' exigerait ' + equiv + ' nets mensuels. Cela représente un écart réel de -' + perteM + '/mois (-' + perteA + '/an).\n\n' +
          'Compte tenu de mes résultats et de la montée en responsabilités sur le poste, je sollicite une revalorisation minimale de +' + rattrapage + ' afin de rétablir mon pouvoir d\'achat réel, complétée d\'une reconnaissance de ma performance.';
      } else {
        text =
          'Point rémunération — Synthèse chiffrée pour notre échange :\n\n' +
          '• Salaire net en ' + d.baseYear + ' : ' + Valora.formatEUR(d.salBase) + '/mois → actuel : ' + Valora.formatEUR(d.salNow) + '/mois.\n' +
          '• Inflation cumulée sur la période : +' + Valora.formatPercent(d.officialInf, 1) + ' (IPC INSEE) et +' + Valora.formatPercent(d.personalInf, 1) + ' sur mon panier réel.\n' +
          '• Salaire nécessaire aujourd\'hui à pouvoir d\'achat constant : ' + equiv + ' nets/mois (écart actuel : -' + perteM + '/mois).\n\n' +
          'Je te propose qu\'on vise une revalorisation d\'au moins +' + rattrapage + ' pour revenir à l\'équilibre ' + d.baseYear + ', et qu\'on discute ensemble de la part liée à mes objectifs dépassés cette année.';
      }
    } else {
      text =
        'Synthèse de votre pouvoir d\'achat (' + d.baseYear + '–2026) :\n\n' +
        'Votre salaire net a progressé de +' + Valora.formatPercent(d.nominalGrowth, 1) + ', soit plus vite que votre inflation personnelle (+' + Valora.formatPercent(d.personalInf, 1) + '). ' +
        'Vous enregistrez un gain réel de pouvoir d\'achat de +' + Valora.formatEUR(d.deltaMonth) + '/mois (+' + Valora.formatEUR(d.deltaYear) + '/an).\n\n' +
        'Conseil de négociation : appuyez votre prochaine demande non pas sur l\'inflation, mais sur votre valeur marché, vos résultats mesurables et vos nouvelles responsabilités.';
    }
    pitchEl.textContent = text;
  }

  /* Presets de profils budgétaires */
  const PROFILES = {
    moyen:    { logement: 30, alimentation: 20, energie: 10, transports: 15, loisirs: 12, autres: 13 },
    urbain:   { logement: 38, alimentation: 20, energie: 8,  transports: 7,  loisirs: 15, autres: 12 },
    famille:  { logement: 26, alimentation: 26, energie: 14, transports: 18, loisirs: 8,  autres: 8 }
  };

  document.querySelectorAll('[data-profile]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const p = PROFILES[btn.getAttribute('data-profile')];
      if (!p) return;
      Object.keys(p).forEach(function (k) {
        if (weightInputs[k]) weightInputs[k].value = p[k];
      });
      recalc();
    });
  });

  const btnNorm = document.getElementById('btn-normalize-weights');
  if (btnNorm) {
    btnNorm.addEventListener('click', function () {
      const w = getWeights();
      let remaining = 100;
      CATEGORIES.forEach(function (cat, idx) {
        if (idx === CATEGORIES.length - 1) {
          weightInputs[cat.key].value = Math.max(0, remaining);
        } else {
          const val = Math.round(w.norm[cat.key] * 100);
          weightInputs[cat.key].value = val;
          remaining -= val;
        }
      });
      recalc();
      Valora.toast('Pondérations rééquilibrées à 100 %.');
    });
  }

  document.querySelectorAll('[data-tone]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      tone = btn.getAttribute('data-tone');
      document.querySelectorAll('[data-tone]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      recalc();
    });
  });

  const btnCopy = document.getElementById('btn-copy-pitch');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      Valora.copyText(pitchEl.textContent, 'Argumentaire de négociation copié.');
    });
  }

  [baseYearEl, salBaseEl, salNowEl].forEach(function (el) {
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });
  CATEGORIES.forEach(function (cat) {
    weightInputs[cat.key].addEventListener('input', recalc);
  });

  window.addEventListener('resize', recalc);
  recalc();
})(window, document);
