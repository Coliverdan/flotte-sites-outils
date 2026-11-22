/* ==========================================================================
   OUTIL 04 — Calculateur Matelas de Sécurité & Allocation Livrets Réglementés
   LEP (10 000 €), Livret A (22 950 €), LDDS (12 000 €)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const PROFILES = {
    fonctionnaire: { months: 3, label: 'Fonctionnaire / Statut protégé', rationale: 'Revenus très stables : 3 mois de dépenses incompressibles suffisent à couvrir les imprévus courants (voiture, santé, équipement).' },
    cdi:           { months: 4, label: 'Salarié en CDI', rationale: 'Un coussin de 4 à 5 mois sécurise une transition professionnelle, un délai de carence ou une dépense lourde imprévue.' },
    famille:       { months: 6, label: 'Famille avec enfants', rationale: 'Avec des charges fixes familiales élevées, 6 mois constituent le standard patrimonial pour absorber tout aléa sans liquider vos placements.' },
    freelance:     { months: 8, label: 'Freelance / Indépendant', rationale: 'Activité cyclique, retards de paiement clients et régularisations URSSAF : 7 à 9 mois d\'avance garantissent votre sérénité.' }
  };

  /* Plafonds et taux réglementés France */
  const RATES = {
    lep: 3.5,
    livretA: 2.4,
    ldds: 2.4,
    monetaireNet: 1.96 /* ~2,8 % brut après PFU 30 % */
  };

  const CAPS = {
    lep: 10000,
    livretA: 22950,
    ldds: 12000
  };

  const expensesEl = document.getElementById('es-expenses');
  const monthsEl = document.getElementById('es-months');
  const rfrEl = document.getElementById('es-rfr');
  const partsEl = document.getElementById('es-parts');
  const currentEl = document.getElementById('es-current');
  const saveMonthEl = document.getElementById('es-save-month');
  const canvasEl = document.getElementById('es-chart');

  if (!expensesEl || !canvasEl) return;

  let currentProfile = 'cdi';

  function getLepLimit(parts) {
    /* Barème France métropolitaine : 22 823 € pour 1 part + 6 096 € par demi-part supplémentaire */
    const extraHalfParts = Math.max(0, (parts - 1) * 2);
    return Math.round(22823 + extraHalfParts * 6096);
  }

  function recalc() {
    const expenses = Math.max(0, parseFloat(expensesEl.value) || 0);
    const months = Math.max(2, Math.min(12, parseInt(monthsEl.value, 10) || 4));
    const rfr = Math.max(0, parseFloat(rfrEl.value) || 0);
    const parts = Math.max(1, parseFloat(partsEl.value) || 1);
    const current = Math.max(0, parseFloat(currentEl.value) || 0);
    const saveMonthly = Math.max(0, parseFloat(saveMonthEl.value) || 0);

    document.getElementById('es-months-val').textContent = months + ' mois';

    const lepLimit = getLepLimit(parts);
    const lepEligible = rfr <= lepLimit;

    const lepBadge = document.getElementById('es-lep-status');
    if (lepBadge) {
      lepBadge.className = 'badge ' + (lepEligible ? 'badge-accent' : '');
      lepBadge.textContent = lepEligible
        ? 'Éligible au LEP (plafond RFR : ' + Valora.formatEUR(lepLimit) + ')'
        : 'Non éligible au LEP (RFR > ' + Valora.formatEUR(lepLimit) + ')';
    }

    const profileInfo = PROFILES[currentProfile] || PROFILES.cdi;
    const rationaleEl = document.getElementById('es-rationale');
    if (rationaleEl) {
      rationaleEl.textContent = profileInfo.rationale;
    }

    const target = expenses * months;
    let rem = target;

    const allocLep = lepEligible ? Math.min(rem, CAPS.lep) : 0;
    rem -= allocLep;

    const allocLA = Math.min(rem, CAPS.livretA);
    rem -= allocLA;

    const allocLDDS = Math.min(rem, CAPS.ldds);
    rem -= allocLDDS;

    const allocExtra = Math.max(0, rem);

    const intLep = allocLep * (RATES.lep / 100);
    const intLA = allocLA * (RATES.livretA / 100);
    const intLDDS = allocLDDS * (RATES.ldds / 100);
    const intExtra = allocExtra * (RATES.monetaireNet / 100);
    const totalInterest = intLep + intLA + intLDDS + intExtra;
    const avgRate = target > 0 ? (totalInterest / target) * 100 : 0;

    const gap = Math.max(0, target - current);
    const surplus = Math.max(0, current - target);
    const monthsToGoal = gap > 0 && saveMonthly > 0 ? Math.ceil(gap / saveMonthly) : 0;

    /* KPIs */
    document.getElementById('kpi-target').textContent = Valora.formatEUR(target);
    document.getElementById('kpi-target-sub').textContent = months + ' mois × ' + Valora.formatEUR(expenses) + '/mois';

    document.getElementById('kpi-interest').textContent = '+' + Valora.formatEUR(totalInterest) + ' / an';
    document.getElementById('kpi-interest-sub').textContent = 'Rendement moyen net d\'impôt : ' + Valora.formatPercent(avgRate, 2);

    const kpiGapCard = document.getElementById('kpi-gap-card');
    const kpiGapVal = document.getElementById('kpi-gap-val');
    const kpiGapSub = document.getElementById('kpi-gap-sub');
    if (gap > 0) {
      kpiGapCard.className = 'kpi-card kpi-card-danger';
      kpiGapVal.textContent = Valora.formatEUR(gap);
      kpiGapSub.textContent = saveMonthly > 0
        ? 'Atteint dans ' + monthsToGoal + ' mois à ' + Valora.formatEUR(saveMonthly) + '/mois'
        : 'Renseignez une épargne mensuelle pour estimer le délai';
    } else {
      kpiGapCard.className = 'kpi-card kpi-card-accent';
      kpiGapVal.textContent = 'Objectif atteint';
      kpiGapSub.textContent = surplus > 0
        ? 'Excédent investissable en PEA / long terme : ' + Valora.formatEUR(surplus)
        : 'Votre matelas de sécurité est parfaitement constitué.';
    }

    /* Barre de répartition */
    const items = [
      { name: 'LEP', amount: allocLep, cap: CAPS.lep, rate: RATES.lep, interest: intLep, color: '#0F5132', eligible: lepEligible },
      { name: 'Livret A', amount: allocLA, cap: CAPS.livretA, rate: RATES.livretA, interest: intLA, color: '#2F6E4E', eligible: true },
      { name: 'LDDS', amount: allocLDDS, cap: CAPS.ldds, rate: RATES.ldds, interest: intLDDS, color: '#8A6116', eligible: true },
      { name: 'Compte à terme / Monétaire', amount: allocExtra, cap: null, rate: RATES.monetaireNet, interest: intExtra, color: '#4B554E', eligible: allocExtra > 0 }
    ];

    const barEl = document.getElementById('es-alloc-bar');
    if (barEl) {
      barEl.innerHTML = items.filter(function (i) { return i.amount > 0; }).map(function (i) {
        const pct = target > 0 ? (i.amount / target) * 100 : 0;
        return '<div class="alloc-segment" style="width:' + pct.toFixed(2) + '%;background-color:' + i.color + ';" title="' + i.name + ' : ' + Valora.formatEUR(i.amount) + '"></div>';
      }).join('');
    }

    /* Tableau détaillé */
    const tbody = document.getElementById('es-table-body');
    if (tbody) {
      tbody.innerHTML = items.map(function (i) {
        const capTxt = i.cap ? Valora.formatEUR(i.cap) : 'Illimité';
        const statusTxt = !i.eligible ? 'Non éligible' : (i.amount > 0 ? 'Prioritaire' : 'Non requis');
        return '<tr>' +
          '<td><span class="legend-dot" style="background:' + i.color + ';margin-right:8px;vertical-align:middle;"></span><strong>' + i.name + '</strong></td>' +
          '<td class="num">' + Valora.formatPercent(i.rate, 2) + ' net</td>' +
          '<td class="num">' + capTxt + '</td>' +
          '<td class="num"><strong>' + Valora.formatEUR(i.amount) + '</strong></td>' +
          '<td class="num text-accent">+' + Valora.formatEUR(i.interest) + '</td>' +
          '<td>' + statusTxt + '</td>' +
          '</tr>';
      }).join('');
    }

    drawChart(items, target);
  }

  function drawChart(items, target) {
    const setup = Valora.setupCanvas(canvasEl);
    const ctx = setup.ctx;
    const w = setup.width;
    const h = setup.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const active = items.filter(function (i) { return i.amount > 0 || i.name !== 'Compte à terme / Monétaire'; });
    const pad = { top: 24, right: 24, bottom: 48, left: 68 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxVal = Math.max(5000, ...active.map(function (i) { return Math.max(i.amount, i.cap || i.amount); })) * 1.12;

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
      ctx.fillText(Math.round(val / 1000) + ' k€', pad.left - 10, yy);
    }

    const colW = cw / active.length;
    const barW = Math.min(72, colW * 0.54);

    active.forEach(function (item, idx) {
      const cx = pad.left + idx * colW + colW / 2;
      const bx = cx - barW / 2;

      /* Plafond en fond fantôme */
      if (item.cap) {
        const capY = yPos(item.cap);
        ctx.fillStyle = '#F1EDE4';
        ctx.fillRect(bx, capY, barW, yPos(0) - capY);
        ctx.strokeStyle = '#CCC5B5';
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(bx, capY, barW, yPos(0) - capY);
        ctx.setLineDash([]);
      }

      /* Montant alloué */
      const valY = yPos(item.amount);
      ctx.fillStyle = item.color;
      ctx.fillRect(bx, valY, barW, yPos(0) - valY);

      /* Valeur au-dessus */
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#111814';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(Valora.formatEUR(item.amount), cx, valY - 6);

      /* Label bas */
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#4B554E';
      ctx.textBaseline = 'top';
      const shortName = item.name.length > 14 ? 'Monétaire' : item.name;
      ctx.fillText(shortName, cx, h - pad.bottom + 12);
    });
  }

  document.querySelectorAll('[data-status-prof]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentProfile = btn.getAttribute('data-status-prof');
      document.querySelectorAll('[data-status-prof]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      if (PROFILES[currentProfile]) {
        monthsEl.value = PROFILES[currentProfile].months;
      }
      recalc();
    });
  });

  [expensesEl, monthsEl, rfrEl, partsEl, currentEl, saveMonthEl].forEach(function (el) {
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });

  window.addEventListener('resize', recalc);
  recalc();
})(window, document);
