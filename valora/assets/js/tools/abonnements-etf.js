/* ==========================================================================
   OUTIL 01 — Simulateur Abonnements -> Capital ETF / PEA + Ticket PNG 1080x1920
   ========================================================================== */

(function (window, document) {
  'use strict';

  const DEFAULT_SUBS = [
    { id: 'netflix', name: 'Netflix Standard', cat: 'Streaming', price: 13.49, selected: true },
    { id: 'spotify', name: 'Spotify Premium', cat: 'Audio', price: 11.12, selected: true },
    { id: 'basicfit', name: 'Basic-Fit / Sport', cat: 'Sport', price: 29.99, selected: true },
    { id: 'chatgpt', name: 'ChatGPT Plus', cat: 'IA & Tech', price: 22.00, selected: true },
    { id: 'prime', name: 'Amazon Prime', cat: 'E-commerce', price: 6.99, selected: true },
    { id: 'disney', name: 'Disney+', cat: 'Streaming', price: 9.99, selected: false },
    { id: 'canal', name: 'Canal+', cat: 'TV & Sport', price: 27.99, selected: false },
    { id: 'icloud', name: 'iCloud+ (200 Go)', cat: 'Cloud', price: 2.99, selected: true },
    { id: 'uber', name: 'Uber One', cat: 'Mobilité', price: 5.99, selected: false },
    { id: 'escalade', name: 'Salle d\'escalade', cat: 'Sport', price: 59.00, selected: false },
    { id: 'fibre', name: 'Surplus Box Fibre', cat: 'Télécom', price: 15.00, selected: false },
    { id: 'youtube', name: 'YouTube Premium', cat: 'Streaming', price: 12.99, selected: false },
    { id: 'applemusic', name: 'Apple Music / Deezer', cat: 'Audio', price: 10.99, selected: false },
    { id: 'presse', name: 'Presse numérique', cat: 'Média', price: 14.90, selected: false },
    { id: 'gaming', name: 'PS Plus / Game Pass', cat: 'Jeux', price: 14.99, selected: false },
    { id: 'cafe', name: 'Cafés à emporter', cat: 'Quotidien', price: 32.00, selected: false },
    { id: 'livraison', name: 'Frais livraison repas', cat: 'Quotidien', price: 24.00, selected: false },
    { id: 'vpn', name: 'VPN & Stockage Cloud', cat: 'Tech', price: 8.99, selected: false }
  ];

  let subs = DEFAULT_SUBS.map(function (s) { return Object.assign({}, s); });
  let envelope = 'pea'; // 'pea' | 'cto'
  let customCounter = 1;

  const gridEl = document.getElementById('subs-grid');
  const horizonEl = document.getElementById('sub-horizon');
  const rateEl = document.getElementById('sub-rate');
  const horizonValEl = document.getElementById('sub-horizon-val');
  const rateValEl = document.getElementById('sub-rate-val');
  const taxNoteEl = document.getElementById('sub-tax-note');

  const kpiMonthlyEl = document.getElementById('kpi-monthly');
  const kpiAnnualEl = document.getElementById('kpi-annual');
  const kpiCashEl = document.getElementById('kpi-cash');
  const kpiEtfEl = document.getElementById('kpi-etf');
  const kpiGainEl = document.getElementById('kpi-gain');
  const kpiCountEl = document.getElementById('kpi-count');
  const canvasEl = document.getElementById('subs-chart');

  if (!gridEl || !canvasEl) return;

  function renderSubsGrid() {
    gridEl.innerHTML = '';
    subs.forEach(function (sub) {
      const card = document.createElement('div');
      card.className = 'sub-card' + (sub.selected ? ' selected' : '');
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', sub.selected ? 'true' : 'false');
      card.setAttribute('tabindex', '0');

      card.innerHTML =
        '<div class="sub-card-head">' +
          '<div>' +
            '<div class="sub-cat">' + escapeHtml(sub.cat) + '</div>' +
            '<div class="sub-name">' + escapeHtml(sub.name) + '</div>' +
          '</div>' +
          '<span class="sub-check" aria-hidden="true">' + (sub.selected ? '✓' : '') + '</span>' +
        '</div>' +
        '<div class="sub-price-row">' +
          '<input type="number" class="sub-price-input" min="0" max="500" step="0.01" value="' + sub.price.toFixed(2) + '" aria-label="Tarif mensuel ' + escapeHtml(sub.name) + '">' +
          '<span class="sub-price-unit">€/mois</span>' +
        '</div>';

      const input = card.querySelector('.sub-price-input');
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      input.addEventListener('input', function () {
        const val = parseFloat(input.value);
        sub.price = Number.isFinite(val) && val >= 0 ? val : 0;
        if (!sub.selected && sub.price > 0) {
          sub.selected = true;
          card.classList.add('selected');
          card.setAttribute('aria-checked', 'true');
          card.querySelector('.sub-check').textContent = '✓';
        }
        recalc();
      });

      function toggle() {
        sub.selected = !sub.selected;
        card.classList.toggle('selected', sub.selected);
        card.setAttribute('aria-checked', sub.selected ? 'true' : 'false');
        card.querySelector('.sub-check').textContent = sub.selected ? '✓' : '';
        recalc();
      }

      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function (e) {
        if (e.target === input) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      });

      gridEl.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function computeProjection(monthly, years, annualRate, env) {
    const r = annualRate / 100 / 12;
    const taxRate = (env === 'pea' && years >= 5) ? 0.172 : 0.30;
    const series = [];
    for (let y = 0; y <= years; y++) {
      const n = y * 12;
      const cash = monthly * n;
      const gross = n === 0 ? 0 : (r === 0 ? cash : monthly * ((Math.pow(1 + r, n) - 1) / r));
      const gain = Math.max(0, gross - cash);
      const yTax = (env === 'pea' && y >= 5) ? 0.172 : 0.30;
      const net = cash + gain * (1 - yTax);
      series.push({ year: y, cash: cash, gross: gross, net: net, gainNet: net - cash });
    }
    const last = series[series.length - 1];
    return {
      series: series,
      cash: last.cash,
      gross: last.gross,
      net: last.net,
      gainNet: last.gainNet,
      taxRate: taxRate
    };
  }

  function getSelectedSubs() {
    return subs.filter(function (s) { return s.selected && s.price > 0; });
  }

  function recalc() {
    const selected = getSelectedSubs();
    const monthly = selected.reduce(function (acc, s) { return acc + s.price; }, 0);
    const years = parseInt(horizonEl.value, 10) || 10;
    const rate = parseFloat(rateEl.value) || 8;

    horizonValEl.textContent = years + (years > 1 ? ' ans' : ' an');
    rateValEl.textContent = Valora.formatPercent(rate, 1);

    const res = computeProjection(monthly, years, rate, envelope);

    if (envelope === 'pea' && years < 5) {
      taxNoteEl.textContent = 'Retrait PEA avant 5 ans : fiscalité PFU 30 % appliquée automatiquement.';
    } else if (envelope === 'pea') {
      taxNoteEl.textContent = 'PEA détenu 5 ans ou plus : seuls les 17,2 % de prélèvements sociaux s\'appliquent sur les gains.';
    } else {
      taxNoteEl.textContent = 'Compte-Titres Ordinaire (CTO) : Prélèvement Forfaitaire Unique (PFU / Flat Tax) de 30 % sur les gains.';
    }

    kpiCountEl.textContent = selected.length + ' abonnement' + (selected.length > 1 ? 's' : '') + ' actif' + (selected.length > 1 ? 's' : '');
    kpiMonthlyEl.textContent = Valora.formatEURDec(monthly);
    kpiAnnualEl.textContent = Valora.formatEUR(monthly * 12) + ' / an';
    kpiCashEl.textContent = Valora.formatEUR(res.cash);
    kpiEtfEl.textContent = Valora.formatEUR(res.net);
    kpiGainEl.textContent = '+' + Valora.formatEUR(res.gainNet);

    drawChart(res.series);
  }

  function drawChart(series) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 24, right: 24, bottom: 40, left: 68 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxVal = Math.max(1000, series[series.length - 1].net * 1.12);
    const maxYear = Math.max(1, series[series.length - 1].year);

    function xPos(y) { return pad.left + (y / maxYear) * cw; }
    function yPos(v) { return pad.top + ch - (v / maxVal) * ch; }

    /* Grille horizontale */
    ctx.strokeStyle = '#E4DFD3';
    ctx.lineWidth = 1;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#667069';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = (maxVal / steps) * i;
      const yy = yPos(val);
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(w - pad.right, yy);
      ctx.stroke();
      ctx.fillText(shortEur(val), pad.left - 10, yy);
    }

    /* Axe X */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = Math.min(maxYear, 6);
    for (let i = 0; i <= xTicks; i++) {
      const yr = Math.round((maxYear / xTicks) * i);
      const xx = xPos(yr);
      ctx.fillText('An ' + yr, xx, h - pad.bottom + 12);
    }

    /* Aire sous courbe ETF (aplat léger sans dégradé) */
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(0));
    series.forEach(function (pt) { ctx.lineTo(xPos(pt.year), yPos(pt.net)); });
    ctx.lineTo(xPos(maxYear), yPos(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 81, 50, 0.08)';
    ctx.fill();

    /* Courbe Cash dépensé */
    ctx.beginPath();
    ctx.strokeStyle = '#A62C2B';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    series.forEach(function (pt, idx) {
      if (idx === 0) ctx.moveTo(xPos(pt.year), yPos(pt.cash));
      else ctx.lineTo(xPos(pt.year), yPos(pt.cash));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    /* Courbe Capital ETF Net */
    ctx.beginPath();
    ctx.strokeStyle = '#0F5132';
    ctx.lineWidth = 3;
    series.forEach(function (pt, idx) {
      if (idx === 0) ctx.moveTo(xPos(pt.year), yPos(pt.net));
      else ctx.lineTo(xPos(pt.year), yPos(pt.net));
    });
    ctx.stroke();

    /* Points finaux */
    const last = series[series.length - 1];
    drawDot(ctx, xPos(last.year), yPos(last.cash), '#A62C2B');
    drawDot(ctx, xPos(last.year), yPos(last.net), '#0F5132');
  }

  function drawDot(ctx, x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }

  function shortEur(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' M€';
    if (v >= 1000) return Math.round(v / 1000) + ' k€';
    return Math.round(v) + ' €';
  }

  /* ========================================================================
     GÉNÉRATEUR VIRAL : TICKET DE CAISSE PATRIMONIAL (PNG STORY 1080 x 1920)
     ======================================================================== */
  function generateReceiptPNG() {
    const selected = getSelectedSubs();
    if (selected.length === 0) {
      Valora.toast('Sélectionnez au moins un abonnement avant de générer le ticket.');
      return;
    }

    const monthly = selected.reduce(function (acc, s) { return acc + s.price; }, 0);
    const years = parseInt(horizonEl.value, 10) || 10;
    const rate = parseFloat(rateEl.value) || 8;
    const resHorizon = computeProjection(monthly, years, rate, envelope);
    const res10 = computeProjection(monthly, 10, rate, envelope);

    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext('2d');

    /* Fond papier extérieur vert sapin sombre éditorial */
    ctx.fillStyle = '#111814';
    ctx.fillRect(0, 0, 1080, 1920);

    /* Bandeau titre supérieur hors ticket */
    ctx.fillStyle = '#F9F7F2';
    ctx.font = '700 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('VALORA — AUDIT DES ABONNEMENTS', 540, 88);

    ctx.fillStyle = '#97A39B';
    ctx.font = '500 22px "Courier New", monospace';
    ctx.fillText('CE QUE VOS PRÉLÈVEMENTS COÛTENT EN CAPITAL ETF', 540, 128);

    /* Forme du ticket de caisse avec dents de scie haut et bas */
    const rx = 90;
    const rw = 900;
    const ryTop = 180;
    const ryBot = 1750;
    const toothW = 30;
    const toothH = 18;

    ctx.fillStyle = '#F9F7F2';
    ctx.beginPath();
    ctx.moveTo(rx, ryTop);
    for (let x = rx; x < rx + rw; x += toothW) {
      ctx.lineTo(x + toothW / 2, ryTop - toothH);
      ctx.lineTo(x + toothW, ryTop);
    }
    ctx.lineTo(rx + rw, ryBot);
    for (let x = rx + rw; x > rx; x -= toothW) {
      ctx.lineTo(x - toothW / 2, ryBot + toothH);
      ctx.lineTo(x - toothW, ryBot);
    }
    ctx.closePath();
    ctx.fill();

    /* En-tête du ticket */
    let y = 260;
    ctx.fillStyle = '#111814';
    ctx.font = '800 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('VALORA FINANCE', 540, y);

    y += 42;
    ctx.fillStyle = '#4B554E';
    ctx.font = '600 22px "Courier New", monospace';
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText('TICKET PATRIMONIAL N° ' + Math.floor(100000 + Math.random() * 899999) + '  •  ' + today, 540, y);

    y += 38;
    drawDashedLine(ctx, rx + 56, y, rx + rw - 56);

    /* Liste des abonnements cochés (max 11 lignes lisibles + regroupement si plus) */
    y += 46;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#667069';
    ctx.font = '700 20px "Courier New", monospace';
    ctx.fillText('ABONNEMENT', rx + 56, y);
    ctx.textAlign = 'right';
    ctx.fillText('MENSUEL', rx + rw - 56, y);

    y += 22;
    const maxVisible = 10;
    const sorted = selected.slice().sort(function (a, b) { return b.price - a.price; });
    const shown = sorted.slice(0, maxVisible);
    const hidden = sorted.slice(maxVisible);

    ctx.font = '600 26px "Courier New", monospace';
    shown.forEach(function (item) {
      y += 46;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111814';
      const label = item.name.length > 26 ? item.name.slice(0, 25) + '…' : item.name;
      ctx.fillText(label.toUpperCase(), rx + 56, y);
      ctx.textAlign = 'right';
      ctx.fillText(Valora.formatEURDec(item.price), rx + rw - 56, y);
    });

    if (hidden.length > 0) {
      const restSum = hidden.reduce(function (a, s) { return a + s.price; }, 0);
      y += 46;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B554E';
      ctx.fillText('+ ' + hidden.length + ' AUTRE(S) POSTE(S)', rx + 56, y);
      ctx.textAlign = 'right';
      ctx.fillText(Valora.formatEURDec(restSum), rx + rw - 56, y);
    }

    y = Math.max(y + 52, 920);
    drawDashedLine(ctx, rx + 56, y, rx + rw - 56);

    /* Sous-totaux */
    y += 54;
    ctx.font = '700 28px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111814';
    ctx.fillText('TOTAL PRÉLEVÉ / MOIS', rx + 56, y);
    ctx.textAlign = 'right';
    ctx.fillText(Valora.formatEURDec(monthly), rx + rw - 56, y);

    y += 48;
    ctx.font = '600 25px "Courier New", monospace';
    ctx.fillStyle = '#4B554E';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL DÉPENSÉ SUR 10 ANS', rx + 56, y);
    ctx.textAlign = 'right';
    ctx.fillText(Valora.formatEUR(res10.cash), rx + rw - 56, y);

    if (years !== 10) {
      y += 44;
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL DÉPENSÉ SUR ' + years + ' ANS', rx + 56, y);
      ctx.textAlign = 'right';
      ctx.fillText(Valora.formatEUR(resHorizon.cash), rx + rw - 56, y);
    }

    /* Encadré choc : Capital potentiel ETF */
    y += 56;
    ctx.fillStyle = '#E6F0EB';
    ctx.fillRect(rx + 48, y, rw - 96, 196);
    ctx.strokeStyle = '#0F5132';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx + 48, y, rw - 96, 196);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F5132';
    ctx.font = '700 22px "Courier New", monospace';
    ctx.fillText('CAPITAL POTENTIEL EN ETF SUR ' + years + ' ANS (' + Valora.formatPercent(rate, 1) + '/AN)', 540, y + 48);

    ctx.font = '800 76px "Courier New", monospace';
    ctx.fillText(Valora.formatEUR(resHorizon.net), 540, y + 132);

    ctx.fillStyle = '#111814';
    ctx.font = '600 22px "Courier New", monospace';
    const envLabel = envelope === 'pea' ? 'NET D\'IMPÔT EN PEA' : 'NET D\'IMPÔT EN CTO (PFU 30 %)';
    ctx.fillText(envLabel, 540, y + 172);

    /* Encadré alerte : Manque à gagner intérêts composés */
    y += 230;
    ctx.fillStyle = '#F8EAE9';
    ctx.fillRect(rx + 48, y, rw - 96, 128);
    ctx.strokeStyle = '#A62C2B';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 48, y, rw - 96, 128);

    ctx.fillStyle = '#A62C2B';
    ctx.font = '700 21px "Courier New", monospace';
    ctx.fillText('MANQUE À GAGNER EN INTÉRÊTS COMPOSÉS (10 ANS : ' + Valora.formatEUR(res10.net) + ')', 540, y + 44);
    ctx.font = '800 48px "Courier New", monospace';
    ctx.fillText('+' + Valora.formatEUR(resHorizon.gainNet) + ' PERDUS', 540, y + 102);

    /* Code-barres éditorial */
    const barY = 1565;
    const barStartX = rx + 130;
    const barEndX = rx + rw - 130;
    ctx.fillStyle = '#111814';
    let bx = barStartX;
    let seed = Math.round(monthly * 100) + years * 17;
    while (bx < barEndX) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const bw = 3 + (seed % 8);
      if (bx + bw <= barEndX) {
        ctx.fillRect(bx, barY, bw, 86);
      }
      bx += bw + 4 + ((seed >> 4) % 6);
    }

    ctx.fillStyle = '#4B554E';
    ctx.font = '600 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIMULEZ VOTRE TICKET SUR VALORA-FINANCE.FR', 540, 1700);

    /* Pied hors ticket */
    ctx.fillStyle = '#B9C2BC';
    ctx.font = '500 20px "Courier New", monospace';
    ctx.fillText('Simulation pédagogique — Les performances passées ne préjugent pas des performances futures.', 540, 1845);

    Valora.downloadCanvasPNG(c, 'ticket-abonnements-valora.png');
    Valora.toast('Ticket de caisse PNG (1080×1920) téléchargé.');
  }

  function drawDashedLine(ctx, x1, y, x2) {
    ctx.save();
    ctx.strokeStyle = '#CCC5B5';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  /* Événements */
  horizonEl.addEventListener('input', recalc);
  rateEl.addEventListener('input', recalc);

  document.querySelectorAll('[data-env]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      envelope = btn.getAttribute('data-env');
      document.querySelectorAll('[data-env]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      recalc();
    });
  });

  /* Ajout d'un abonnement personnalisé */
  const customForm = document.getElementById('custom-sub-form');
  if (customForm) {
    customForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nameInput = document.getElementById('custom-sub-name');
      const priceInput = document.getElementById('custom-sub-price');
      const name = (nameInput.value || '').trim();
      const price = parseFloat(priceInput.value);
      if (!name || !Number.isFinite(price) || price <= 0) {
        Valora.toast('Indiquez un nom et un montant mensuel valide.');
        return;
      }
      subs.unshift({
        id: 'custom-' + (customCounter++),
        name: name,
        cat: 'Personnalisé',
        price: price,
        selected: true
      });
      nameInput.value = '';
      priceInput.value = '';
      renderSubsGrid();
      recalc();
      Valora.toast('Abonnement « ' + name + ' » ajouté.');
    });
  }

  /* Presets rapides */
  document.querySelectorAll('[data-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const p = btn.getAttribute('data-preset');
      if (p === 'clear') {
        subs.forEach(function (s) { s.selected = false; });
      } else if (p === 'streaming') {
        const ids = ['netflix', 'spotify', 'disney', 'canal', 'youtube', 'prime'];
        subs.forEach(function (s) { s.selected = ids.indexOf(s.id) !== -1; });
      } else if (p === 'urbain') {
        const ids = ['netflix', 'spotify', 'basicfit', 'chatgpt', 'uber', 'cafe', 'livraison', 'icloud'];
        subs.forEach(function (s) { s.selected = ids.indexOf(s.id) !== -1; });
      } else if (p === 'reset') {
        subs = DEFAULT_SUBS.map(function (s) { return Object.assign({}, s); });
      }
      renderSubsGrid();
      recalc();
    });
  });

  const btnReceipt = document.getElementById('btn-download-receipt');
  if (btnReceipt) {
    btnReceipt.addEventListener('click', generateReceiptPNG);
  }

  window.addEventListener('resize', recalc);
  renderSubsGrid();
  recalc();
})(window, document);
