/* ==========================================================================
   OUTIL 03 — Simulateur Intérêts Composés : PEA vs Assurance-Vie vs CTO
   Fiscalité française exacte (Art. 150-0 A / 125-0 A CGI)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const initEl = document.getElementById('ic-initial');
  const monthlyEl = document.getElementById('ic-monthly');
  const rateEl = document.getElementById('ic-rate');
  const yearsEl = document.getElementById('ic-years');
  const avFeeEl = document.getElementById('ic-av-fee');
  const canvasEl = document.getElementById('ic-chart');
  const tbodyEl = document.getElementById('ic-table-body');

  if (!initEl || !canvasEl) return;

  let status = 'single'; // 'single' (4600) | 'couple' (9200)
  let showAllYears = false;

  function computeAVTax(gain, totalDeposits, year, allowance) {
    if (gain <= 0) return 0;
    if (year < 8) {
      return gain * 0.30;
    }
    const ps = gain * 0.172;
    const taxableIR = Math.max(0, gain - allowance);
    if (taxableIR <= 0) return ps;
    const ratioUnder150 = totalDeposits > 0 ? Math.min(1, 150000 / totalDeposits) : 1;
    const ir = taxableIR * (ratioUnder150 * 0.075 + (1 - ratioUnder150) * 0.128);
    return ps + ir;
  }

  function simulate() {
    const initial = Math.max(0, parseFloat(initEl.value) || 0);
    const monthly = Math.max(0, parseFloat(monthlyEl.value) || 0);
    const annualRate = Math.max(0, parseFloat(rateEl.value) || 0);
    const years = Math.max(1, Math.min(40, parseInt(yearsEl.value, 10) || 20));
    const avFee = Math.max(0, parseFloat(avFeeEl.value) || 0);
    const allowance = status === 'couple' ? 9200 : 4600;

    document.getElementById('ic-rate-val').textContent = Valora.formatPercent(annualRate, 1);
    document.getElementById('ic-years-val').textContent = years + (years > 1 ? ' ans' : ' an');
    document.getElementById('ic-av-fee-val').textContent = Valora.formatPercent(avFee, 2);

    const rBase = annualRate / 100 / 12;
    const rAV = Math.max(0, (annualRate - avFee) / 100) / 12;

    let balBase = initial;
    let balAV = initial;
    let totalInvested = initial;

    const rows = [{
      year: 0,
      invested: initial,
      grossBase: initial,
      gainBase: 0,
      peaTax: 0,
      peaNet: initial,
      avNet: initial,
      ctoNet: initial
    }];

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balBase = balBase * (1 + rBase) + monthly;
        balAV = balAV * (1 + rAV) + monthly;
        totalInvested += monthly;
      }
      const gainBase = Math.max(0, balBase - totalInvested);
      const gainAV = Math.max(0, balAV - totalInvested);

      const peaTaxRate = y >= 5 ? 0.172 : 0.30;
      const peaTax = gainBase * peaTaxRate;
      const peaNet = totalInvested + gainBase - peaTax;

      const ctoTax = gainBase * 0.30;
      const ctoNet = totalInvested + gainBase - ctoTax;

      const avTax = computeAVTax(gainAV, totalInvested, y, allowance);
      const avNet = totalInvested + gainAV - avTax;

      rows.push({
        year: y,
        invested: totalInvested,
        grossBase: balBase,
        gainBase: gainBase,
        peaTax: peaTax,
        peaNet: peaNet,
        avTax: avTax,
        avNet: avNet,
        ctoTax: ctoTax,
        ctoNet: ctoNet
      });
    }

    const last = rows[rows.length - 1];

    /* KPIs */
    document.getElementById('kpi-pea-net').textContent = Valora.formatEUR(last.peaNet);
    document.getElementById('kpi-pea-sub').textContent =
      'Impôt : ' + Valora.formatEUR(last.peaTax) + ' (' + (years >= 5 ? '17,2 % PS' : '30 % < 5 ans') + ')';

    document.getElementById('kpi-av-net').textContent = Valora.formatEUR(last.avNet);
    document.getElementById('kpi-av-sub').textContent =
      'Frais ' + Valora.formatPercent(avFee, 2) + '/an • Impôt : ' + Valora.formatEUR(last.avTax || 0);

    document.getElementById('kpi-cto-net').textContent = Valora.formatEUR(last.ctoNet);
    document.getElementById('kpi-cto-sub').textContent =
      'PFU 30 % : ' + Valora.formatEUR(last.ctoTax || 0);

    const advantage = last.peaNet - last.ctoNet;
    const summaryEl = document.getElementById('ic-summary-line');
    if (summaryEl) {
      let msg = 'Versements cumulés : ' + Valora.formatEUR(last.invested) +
        ' • Intérêts composés bruts : +' + Valora.formatEUR(last.gainBase) +
        ' • Économie fiscale PEA vs CTO : +' + Valora.formatEUR(advantage) + '.';
      if (last.invested > 150000) {
        msg += ' Note : les versements dépassent le plafond individuel du PEA (150 000 € ; 300 000 € pour un couple).';
      }
      summaryEl.textContent = msg;
    }

    drawChart(rows);
    renderTable(rows);
  }

  function drawChart(rows) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 24, right: 24, bottom: 40, left: 72 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const last = rows[rows.length - 1];
    const maxVal = Math.max(1000, last.peaNet, last.avNet, last.ctoNet, last.invested) * 1.1;
    const maxYear = Math.max(1, last.year);

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

    /* Séries */
    drawSeries(ctx, rows, xPos, yPos, 'invested', '#7D8780', 2, [5, 5]);
    drawSeries(ctx, rows, xPos, yPos, 'ctoNet', '#A62C2B', 2.4, []);
    drawSeries(ctx, rows, xPos, yPos, 'avNet', '#8A6116', 2.4, []);
    drawSeries(ctx, rows, xPos, yPos, 'peaNet', '#0F5132', 3.2, []);

    /* Points finaux */
    [
      { k: 'invested', c: '#7D8780' },
      { k: 'ctoNet', c: '#A62C2B' },
      { k: 'avNet', c: '#8A6116' },
      { k: 'peaNet', c: '#0F5132' }
    ].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(xPos(last.year), yPos(last[s.k]), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = s.c;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    });
  }

  function drawSeries(ctx, rows, xPos, yPos, key, color, width, dash) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    rows.forEach(function (r, idx) {
      if (idx === 0) ctx.moveTo(xPos(r.year), yPos(r[key]));
      else ctx.lineTo(xPos(r.year), yPos(r[key]));
    });
    ctx.stroke();
    ctx.restore();
  }

  function renderTable(rows) {
    if (!tbodyEl) return;
    const totalYears = rows[rows.length - 1].year;
    const filtered = rows.filter(function (r) {
      if (r.year === 0) return false;
      if (showAllYears || totalYears <= 10) return true;
      return r.year === 1 || r.year === 5 || r.year === 8 || r.year % 5 === 0 || r.year === totalYears;
    });

    tbodyEl.innerHTML = filtered.map(function (r) {
      return '<tr>' +
        '<td class="num"><strong>An ' + r.year + '</strong></td>' +
        '<td class="num">' + Valora.formatEUR(r.invested) + '</td>' +
        '<td class="num">+' + Valora.formatEUR(r.gainBase) + '</td>' +
        '<td class="num">' + Valora.formatEUR(r.peaTax) + '</td>' +
        '<td class="num text-accent"><strong>' + Valora.formatEUR(r.peaNet) + '</strong></td>' +
        '<td class="num">' + Valora.formatEUR(r.avNet) + '</td>' +
        '<td class="num">' + Valora.formatEUR(r.ctoNet) + '</td>' +
        '</tr>';
    }).join('');
  }

  function shortEur(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' M€';
    if (v >= 1000) return Math.round(v / 1000) + ' k€';
    return Math.round(v) + ' €';
  }

  [initEl, monthlyEl, rateEl, yearsEl, avFeeEl].forEach(function (el) {
    el.addEventListener('input', simulate);
  });

  document.querySelectorAll('[data-status]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      status = btn.getAttribute('data-status');
      document.querySelectorAll('[data-status]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      simulate();
    });
  });

  const toggleTableBtn = document.getElementById('btn-toggle-table');
  if (toggleTableBtn) {
    toggleTableBtn.addEventListener('click', function () {
      showAllYears = !showAllYears;
      toggleTableBtn.textContent = showAllYears ? 'Vue synthétique (jalons)' : 'Afficher toutes les années';
      simulate();
    });
  }

  window.addEventListener('resize', simulate);
  simulate();
})(window, document);
