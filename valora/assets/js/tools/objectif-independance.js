/* ==========================================================================
   OUTIL 06 — Calculateur FIRE / Indépendance Financière (Adaptation France)
   Taux de retrait sûr (3,0 % - 4,5 %) & fiscalité réelle sur la part de gains
   ========================================================================== */

(function (window, document) {
  'use strict';

  const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const incomeEl = document.getElementById('fire-income');
  const expensesEl = document.getElementById('fire-expenses');
  const currentEl = document.getElementById('fire-current');
  const returnEl = document.getElementById('fire-return');
  const swrEl = document.getElementById('fire-swr');
  const canvasEl = document.getElementById('fire-chart');

  if (!incomeEl || !canvasEl) return;

  let exitTaxRate = 0.172; // PEA (17.2 %) par défaut

  function simulateFire(income, expenses, current, realReturnPct, swrPct, taxRate) {
    const monthlySavings = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;
    const annualExpenses = expenses * 12;
    const swr = swrPct / 100;
    const rMonthly = Math.pow(1 + realReturnPct / 100, 1 / 12) - 1;

    /* Capital cible théorique hors fiscalité de sortie */
    const targetBrut = swr > 0 ? annualExpenses / swr : 0;

    /* Simulation mois par mois (max 60 ans = 720 mois) */
    let bal = current;
    let contributed = current;
    let reachedMonth = null;
    let targetAtReach = targetBrut;

    const yearlyPoints = [{ year: 0, balance: bal, target: targetBrut }];

    function requiredCapital(balance, contrib) {
      if (annualExpenses <= 0 || swr <= 0) return 0;
      const gainRatio = balance > 0 ? Math.max(0, Math.min(0.85, (balance - contrib) / balance)) : 0.5;
      const effectiveTaxOnWithdrawal = gainRatio * taxRate;
      const grossAnnualNeed = annualExpenses / Math.max(0.5, 1 - effectiveTaxOnWithdrawal);
      return grossAnnualNeed / swr;
    }

    if (bal >= requiredCapital(bal, contributed) && annualExpenses > 0) {
      reachedMonth = 0;
      targetAtReach = requiredCapital(bal, contributed);
    }

    const maxMonths = 600; // 50 ans
    for (let m = 1; m <= maxMonths; m++) {
      bal = bal * (1 + rMonthly) + monthlySavings;
      contributed += monthlySavings;

      const req = requiredCapital(bal, contributed);
      if (reachedMonth === null && bal >= req && annualExpenses > 0) {
        reachedMonth = m;
        targetAtReach = req;
      }

      if (m % 12 === 0) {
        yearlyPoints.push({
          year: m / 12,
          balance: bal,
          target: req
        });
        if (reachedMonth !== null && (m / 12) >= Math.min(40, Math.ceil(reachedMonth / 12) + 4)) {
          break;
        }
      }
    }

    if (reachedMonth === null) {
      targetAtReach = requiredCapital(bal, contributed);
    }

    return {
      monthlySavings: monthlySavings,
      savingsRate: savingsRate,
      targetBrut: targetBrut,
      targetNetFR: targetAtReach,
      reachedMonth: reachedMonth,
      yearlyPoints: yearlyPoints
    };
  }

  function formatDuration(months) {
    if (months === null) return '> 50 ans';
    if (months === 0) return 'Déjà atteint';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return m + ' mois';
    if (m === 0) return y + (y > 1 ? ' ans' : ' an');
    return y + ' ans et ' + m + ' mois';
  }

  function formatTargetDate(months) {
    if (months === null) return 'Hors horizon (> 50 ans)';
    if (months === 0) return 'Objectif atteint aujourd\'hui';
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear();
  }

  function recalc() {
    const income = Math.max(0, parseFloat(incomeEl.value) || 0);
    const expenses = Math.max(100, parseFloat(expensesEl.value) || 100);
    const current = Math.max(0, parseFloat(currentEl.value) || 0);
    const realReturn = parseFloat(returnEl.value) || 5.5;
    const swr = parseFloat(swrEl.value) || 3.5;

    document.getElementById('fire-return-val').textContent = Valora.formatPercent(realReturn, 1) + ' réel';
    document.getElementById('fire-swr-val').textContent = Valora.formatPercent(swr, 2);

    const res = simulateFire(income, expenses, current, realReturn, swr, exitTaxRate);

    /* KPIs */
    document.getElementById('kpi-savings-rate').textContent = Valora.formatPercent(res.savingsRate, 1);
    document.getElementById('kpi-savings-sub').textContent = Valora.formatEUR(res.monthlySavings) + ' épargnés / mois';

    document.getElementById('kpi-target-fire').textContent = Valora.formatEUR(res.targetNetFR);
    document.getElementById('kpi-target-sub').textContent =
      'Dont friction fiscale FR (+' + Valora.formatEUR(Math.max(0, res.targetNetFR - res.targetBrut)) + ' vs règle brute ' + Valora.formatEUR(res.targetBrut) + ')';

    const kpiTimeCard = document.getElementById('kpi-time-card');
    document.getElementById('kpi-time').textContent = formatDuration(res.reachedMonth);
    document.getElementById('kpi-date').textContent = formatTargetDate(res.reachedMonth);
    kpiTimeCard.className = 'kpi-card ' + (res.reachedMonth !== null ? 'kpi-card-accent' : 'kpi-card-danger');

    /* Matrice de sensibilité */
    const scen1 = simulateFire(income + 200, expenses, current, realReturn, swr, exitTaxRate);
    const scen2 = simulateFire(income, Math.max(200, expenses - 150), current, realReturn, swr, exitTaxRate);
    const scen3 = simulateFire(income, expenses, current, realReturn, 4.0, exitTaxRate);

    const sensBody = document.getElementById('fire-sens-body');
    if (sensBody) {
      const scenarios = [
        { label: 'Scénario actuel', r: res },
        { label: '+200 € / mois de revenus investis', r: scen1 },
        { label: '-150 € / mois de dépenses structurelles', r: scen2 },
        { label: 'Taux de retrait sûr porté à 4,0 %', r: scen3 }
      ];
      sensBody.innerHTML = scenarios.map(function (s, idx) {
        const diff = (res.reachedMonth !== null && s.r.reachedMonth !== null)
          ? res.reachedMonth - s.r.reachedMonth
          : null;
        let diffTxt = '—';
        if (idx > 0 && diff !== null) {
          if (diff > 0) diffTxt = '−' + formatDuration(diff);
          else if (diff < 0) diffTxt = '+' + formatDuration(Math.abs(diff));
          else diffTxt = 'Identique';
        }
        return '<tr>' +
          '<td>' + (idx === 0 ? '<strong>' + s.label + '</strong>' : s.label) + '</td>' +
          '<td class="num">' + Valora.formatEUR(s.r.targetNetFR) + '</td>' +
          '<td class="num">' + formatDuration(s.r.reachedMonth) + '</td>' +
          '<td class="num text-accent"><strong>' + diffTxt + '</strong></td>' +
          '</tr>';
      }).join('');
    }

    drawChart(res);
  }

  function drawChart(res) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const pts = res.yearlyPoints;
    const pad = { top: 28, right: 24, bottom: 40, left: 74 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxYear = Math.max(5, pts[pts.length - 1].year);
    const maxVal = Math.max(
      res.targetNetFR * 1.18,
      pts[pts.length - 1].balance * 1.1
    );

    function xPos(y) { return pad.left + (y / maxYear) * cw; }
    function yPos(v) { return pad.top + ch - (v / maxVal) * ch; }

    /* Grille */
    ctx.strokeStyle = '#E4DFD3';
    ctx.lineWidth = 1;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#667069';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const yy = yPos(val);
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(w - pad.right, yy);
      ctx.stroke();
      ctx.fillText(shortEur(val), pad.left - 10, yy);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = Math.min(maxYear, 8);
    for (let i = 0; i <= xTicks; i++) {
      const yr = Math.round((maxYear / xTicks) * i);
      ctx.fillText('An ' + yr, xPos(yr), h - pad.bottom + 12);
    }

    /* Aire sous courbe patrimoine */
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(0));
    pts.forEach(function (p) { ctx.lineTo(xPos(p.year), yPos(p.balance)); });
    ctx.lineTo(xPos(pts[pts.length - 1].year), yPos(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 81, 50, 0.08)';
    ctx.fill();

    /* Ligne Objectif FIRE */
    const ty = yPos(res.targetNetFR);
    ctx.save();
    ctx.strokeStyle = '#A62C2B';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(pad.left, ty);
    ctx.lineTo(w - pad.right, ty);
    ctx.stroke();
    ctx.restore();

    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#A62C2B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Cible FIRE : ' + Valora.formatEUR(res.targetNetFR), pad.left + 8, ty - 6);

    /* Courbe Patrimoine */
    ctx.beginPath();
    ctx.strokeStyle = '#0F5132';
    ctx.lineWidth = 3;
    pts.forEach(function (p, idx) {
      if (idx === 0) ctx.moveTo(xPos(p.year), yPos(p.balance));
      else ctx.lineTo(xPos(p.year), yPos(p.balance));
    });
    ctx.stroke();

    /* Point d'intersection FIRE */
    if (res.reachedMonth !== null) {
      const ry = res.reachedMonth / 12;
      if (ry <= maxYear) {
        const ix = xPos(ry);
        const iy = yPos(res.targetNetFR);
        ctx.beginPath();
        ctx.arc(ix, iy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0F5132';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      }
    }
  }

  function shortEur(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(2).replace('.', ',') + ' M€';
    if (v >= 1000) return Math.round(v / 1000) + ' k€';
    return Math.round(v) + ' €';
  }

  document.querySelectorAll('[data-exit-tax]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      exitTaxRate = parseFloat(btn.getAttribute('data-exit-tax')) || 0.172;
      document.querySelectorAll('[data-exit-tax]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      recalc();
    });
  });

  [incomeEl, expensesEl, currentEl, returnEl, swrEl].forEach(function (el) {
    el.addEventListener('input', recalc);
  });

  window.addEventListener('resize', recalc);
  recalc();
})(window, document);
