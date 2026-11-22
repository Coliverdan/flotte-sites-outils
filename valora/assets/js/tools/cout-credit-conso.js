/* ==========================================================================
   OUTIL 05 — Vrai Coût d'un Crédit Conso & Paiement en 4x / 10x / 24x
   Amortissement actuariel (Art. R.314-3 Code de la consommation)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const PRESETS = {
    '4x':      { amount: 1200,  months: 4,  taeg: 19.8, fees: 0,   ins: 0.00 },
    '10x':     { amount: 2500,  months: 10, taeg: 17.5, fees: 0,   ins: 0.00 },
    '24x':     { amount: 4500,  months: 24, taeg: 11.9, fees: 45,  ins: 0.35 },
    'auto':    { amount: 15000, months: 48, taeg: 6.4,  fees: 150, ins: 0.40 },
    'travaux': { amount: 25000, months: 60, taeg: 5.8,  fees: 200, ins: 0.35 }
  };

  const amountEl = document.getElementById('cc-amount');
  const monthsEl = document.getElementById('cc-months');
  const taegEl = document.getElementById('cc-taeg');
  const feesEl = document.getElementById('cc-fees');
  const insEl = document.getElementById('cc-ins');
  const incomeEl = document.getElementById('cc-income');
  const altRateEl = document.getElementById('cc-alt-rate');
  const canvasEl = document.getElementById('cc-chart');
  const tbodyEl = document.getElementById('cc-table-body');

  if (!amountEl || !canvasEl) return;

  let showAllMonths = false;

  function recalc() {
    const amount = Math.max(100, parseFloat(amountEl.value) || 0);
    const months = Math.max(2, Math.min(84, parseInt(monthsEl.value, 10) || 24));
    const taeg = Math.max(0, parseFloat(taegEl.value) || 0);
    const fees = Math.max(0, parseFloat(feesEl.value) || 0);
    const insRate = Math.max(0, parseFloat(insEl.value) || 0);
    const income = Math.max(0, parseFloat(incomeEl.value) || 0);
    const altRate = Math.max(0, parseFloat(altRateEl.value) || 0);

    document.getElementById('cc-months-val').textContent = months + ' mois';
    document.getElementById('cc-taeg-val').textContent = Valora.formatPercent(taeg, 1);

    /* Taux mensuel équivalent (méthode actuarielle française TAEG) */
    const i = taeg > 0 ? Math.pow(1 + taeg / 100, 1 / 12) - 1 : 0;
    const baseMonthly = i === 0 ? amount / months : (amount * i) / (1 - Math.pow(1 + i, -months));
    const insMonthly = (amount * (insRate / 100)) / 12;
    const totalMonthly = baseMonthly + insMonthly;

    /* Tableau d'amortissement mensuel */
    let remaining = amount;
    let totalInterest = 0;
    let totalInsurance = 0;
    const schedule = [];

    for (let m = 1; m <= months; m++) {
      const interest = remaining * i;
      let principal = baseMonthly - interest;
      if (m === months) {
        principal = remaining;
      }
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;
      totalInsurance += insMonthly;

      schedule.push({
        month: m,
        payment: principal + interest + insMonthly,
        principal: principal,
        interest: interest,
        insurance: insMonthly,
        remaining: remaining
      });
    }

    const totalCostCredit = totalInterest + totalInsurance + fees;
    const totalPaid = amount + totalCostCredit;
    const overcostPct = amount > 0 ? (totalCostCredit / amount) * 100 : 0;
    const debtRatio = income > 0 ? (totalMonthly / income) * 100 : 0;

    /* Coût d'opportunité : si l'on épargnait la même mensualité à altRate % avant d'acheter */
    const rSave = altRate / 100 / 12;
    let saveBal = 0;
    let saveMonths = 0;
    let saveDeposits = 0;
    while (saveBal < amount && saveMonths < 600) {
      saveMonths++;
      saveBal = saveBal * (1 + rSave) + totalMonthly;
      saveDeposits += totalMonthly;
    }
    const interestEarnedSaving = Math.max(0, saveBal - saveDeposits);
    /* Si on épargne exactement 'months' mois à la même mensualité, capital final obtenu */
    const fvSameDuration = rSave === 0
      ? totalMonthly * months
      : totalMonthly * ((Math.pow(1 + rSave, months) - 1) / rSave);
    const totalGapOpportunity = Math.max(0, fvSameDuration - amount + fees);

    /* KPIs */
    document.getElementById('kpi-monthly').textContent = Valora.formatEURDec(totalMonthly);
    document.getElementById('kpi-monthly-sub').textContent =
      insMonthly > 0
        ? 'Dont ' + Valora.formatEURDec(insMonthly) + '/mois d\'assurance'
        : 'Hors frais de dossier (' + Valora.formatEUR(fees) + ')';

    document.getElementById('kpi-cost').textContent = '+' + Valora.formatEUR(totalCostCredit);
    document.getElementById('kpi-cost-sub').textContent =
      'Surcoût de +' + Valora.formatPercent(overcostPct, 1) + ' (Total payé : ' + Valora.formatEUR(totalPaid) + ')';

    const kpiDebtCard = document.getElementById('kpi-debt-card');
    document.getElementById('kpi-debt').textContent = Valora.formatPercent(debtRatio, 1);
    document.getElementById('kpi-debt-sub').textContent =
      debtRatio > 35
        ? 'Alerte : dépasse seul le plafond HCSF de 35 %'
        : 'Part du crédit sur votre revenu mensuel net';
    kpiDebtCard.className = 'kpi-card ' + (debtRatio > 25 ? 'kpi-card-danger' : '');

    document.getElementById('kpi-opp').textContent = Valora.formatEUR(totalGapOpportunity);
    document.getElementById('kpi-opp-sub').textContent =
      'Épargne préalable atteinte en ' + saveMonths + ' mois (vs ' + months + ' mois à crédit), dont +' + Valora.formatEUR(interestEarnedSaving) + ' d\'intérêts gagnés.';

    drawChart(amount, totalInterest, totalInsurance + fees, totalGapOpportunity);
    renderTable(schedule);
  }

  function drawChart(amount, interest, extraFees, oppGain) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const bars = [
      { label: 'Prix cash', parts: [{ v: amount, c: '#0F5132' }], total: amount },
      { label: 'Achat à crédit', parts: [{ v: amount, c: '#4B554E' }, { v: interest, c: '#A62C2B' }, { v: extraFees, c: '#8A6116' }], total: amount + interest + extraFees },
      { label: 'Épargne équiv.', parts: [{ v: amount, c: '#0F5132' }, { v: oppGain, c: '#2F6E4E' }], total: amount + oppGain }
    ];

    const pad = { top: 28, right: 24, bottom: 44, left: 72 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;
    const maxVal = Math.max(500, ...bars.map(function (b) { return b.total; })) * 1.15;

    function yPos(v) { return pad.top + ch - (v / maxVal) * ch; }

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

    const colW = cw / bars.length;
    const barW = Math.min(84, colW * 0.5);

    bars.forEach(function (bar, idx) {
      const cx = pad.left + idx * colW + colW / 2;
      const bx = cx - barW / 2;
      let acc = 0;

      bar.parts.forEach(function (p) {
        if (p.v <= 0) return;
        const yBottom = yPos(acc);
        const yTop = yPos(acc + p.v);
        ctx.fillStyle = p.c;
        ctx.fillRect(bx, yTop, barW, Math.max(1, yBottom - yTop));
        acc += p.v;
      });

      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#111814';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(Valora.formatEUR(bar.total), cx, yPos(bar.total) - 8);

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#4B554E';
      ctx.textBaseline = 'top';
      ctx.fillText(bar.label, cx, h - pad.bottom + 12);
    });
  }

  function renderTable(schedule) {
    if (!tbodyEl) return;
    const filtered = (showAllMonths || schedule.length <= 12)
      ? schedule
      : schedule.slice(0, 10).concat([{ divider: true }]).concat(schedule.slice(-2));

    tbodyEl.innerHTML = filtered.map(function (r) {
      if (r.divider) {
        return '<tr><td colspan="6" style="text-align:center;color:#667069;font-style:italic;">… ' + (schedule.length - 12) + ' mensualités intermédiaires masquées …</td></tr>';
      }
      return '<tr>' +
        '<td class="num"><strong>Mois ' + r.month + '</strong></td>' +
        '<td class="num">' + Valora.formatEURDec(r.payment) + '</td>' +
        '<td class="num">' + Valora.formatEURDec(r.principal) + '</td>' +
        '<td class="num text-danger">' + Valora.formatEURDec(r.interest) + '</td>' +
        '<td class="num">' + Valora.formatEURDec(r.insurance) + '</td>' +
        '<td class="num">' + Valora.formatEURDec(r.remaining) + '</td>' +
        '</tr>';
    }).join('');
  }

  function shortEur(v) {
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + ' k€';
    return Math.round(v) + ' €';
  }

  document.querySelectorAll('[data-credit-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-credit-preset');
      const p = PRESETS[key];
      if (!p) return;
      amountEl.value = p.amount;
      monthsEl.value = p.months;
      taegEl.value = p.taeg;
      feesEl.value = p.fees;
      insEl.value = p.ins;
      document.querySelectorAll('[data-credit-preset]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      recalc();
    });
  });

  const btnToggle = document.getElementById('btn-toggle-schedule');
  if (btnToggle) {
    btnToggle.addEventListener('click', function () {
      showAllMonths = !showAllMonths;
      btnToggle.textContent = showAllMonths ? 'Condenser le tableau' : 'Afficher toutes les mensualités';
      recalc();
    });
  }

  [amountEl, monthsEl, taegEl, feesEl, insEl, incomeEl, altRateEl].forEach(function (el) {
    el.addEventListener('input', recalc);
  });

  window.addEventListener('resize', recalc);
  recalc();
})(window, document);
