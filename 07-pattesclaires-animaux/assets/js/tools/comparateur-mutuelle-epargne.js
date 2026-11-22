/* ==========================================================================
   Outil 05 — Comparateur Mutuelle Animale vs Auto-Assurance (Cagnotte Santé)
   Modélisation année par année sur 6 à 16 ans (3 scénarios vétérinaires)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const UI = window.PattesUI;
    if (!UI) return;

    const elPremium = document.getElementById('ins-premium');
    const elInflation = document.getElementById('ins-inflation');
    const elFranchise = document.getElementById('ins-franchise');
    const elRate = document.getElementById('ins-rate');
    const elCeiling = document.getElementById('ins-ceiling');
    const elSaveMonth = document.getElementById('save-month');
    const elSaveYield = document.getElementById('save-yield');
    const elHorizon = document.getElementById('horizon-years');
    const elHorizonVal = document.getElementById('horizon-years-val');
    const elSyncBtn = document.getElementById('sync-save-btn');

    const outTotalPremiums = document.getElementById('out-total-premiums');
    const outSaveCapital = document.getElementById('out-save-capital');
    const outVerdict = document.getElementById('out-verdict-summary');
    const outTableBody = document.getElementById('out-scenarios-body');
    const chartCanvas = document.getElementById('mutuelle-chart');

    function buildYearlyExpenses(years, type) {
      const arr = [];
      for (let y = 1; y <= years; y++) {
        /* Frais vétérinaires éligibles maladie/accident (hors prévention de base ou inclus selon sinistres) */
        let bill = (y % 3 === 0) ? 160 : 75;
        if (type === 'robuste') {
          if (y === 4) bill += 380;
          if (y === Math.min(9, years)) bill += 320;
        } else if (type === 'chirurgie') {
          if (y === Math.min(5, years)) bill += 2850;
          if (y === Math.min(6, years)) bill += 450;
          if (y === Math.min(10, years)) bill += 380;
        } else if (type === 'chronique') {
          const onset = Math.max(3, Math.floor(years / 2));
          if (y === onset) bill += 1750;
          else if (y > onset) bill += 1180;
        }
        arr.push(bill);
      }
      return arr;
    }

    function simulateScenario(cfg, name, key, desc) {
      const expenses = buildYearlyExpenses(cfg.years, key);
      let totalVet = 0;
      let totalPremiums = 0;
      let totalReimbursed = 0;

      /* Simulation Auto-Assurance (Livret dédié) */
      let kitty = 0;
      let totalDeposits = 0;
      let totalInterest = 0;
      let extraOutOfPocket = 0;

      for (let i = 0; i < cfg.years; i++) {
        const bill = expenses[i];
        totalVet += bill;

        /* Mutuelle année i (cotisation qui progresse avec l'inflation / âge) */
        const yearPrem = cfg.premium * 12 * Math.pow(1 + cfg.inflation, i);
        totalPremiums += yearPrem;

        const eligible = Math.max(0, bill - cfg.franchise);
        const reimb = Math.min(cfg.ceiling, eligible * cfg.reimbRate);
        totalReimbursed += reimb;

        /* Auto-assurance année i */
        const annualDeposit = cfg.saveMonth * 12;
        totalDeposits += annualDeposit;
        kitty += annualDeposit;
        const interest = Math.max(0, kitty) * cfg.saveYield;
        totalInterest += interest;
        kitty += interest;

        if (kitty >= bill) {
          kitty -= bill;
        } else {
          extraOutOfPocket += (bill - kitty);
          kitty = 0;
        }
      }

      /* Coût net réel :
         - Mutuelle = cotisations versées à fonds perdus + reste à charge vétérinaire
         - Auto-assurance = factures vétérinaires payées - intérêts générés par le livret
           (équivalent à : dépôts + extraOutOfPocket - capital restant récupéré) */
      const mutuelleResteACharge = totalVet - totalReimbursed;
      const mutuelleNetCost = totalPremiums + mutuelleResteACharge;
      const epargneNetCost = totalVet - totalInterest;
      const diff = mutuelleNetCost - epargneNetCost; /* >0 => Auto-assurance gagnante */

      return {
        name: name,
        desc: desc,
        totalVet: totalVet,
        totalPremiums: totalPremiums,
        totalReimbursed: totalReimbursed,
        mutuelleNetCost: mutuelleNetCost,
        epargneNetCost: epargneNetCost,
        kittyEnd: kitty,
        extraOutOfPocket: extraOutOfPocket,
        totalInterest: totalInterest,
        diff: diff,
        winner: diff >= 0 ? 'Auto-assurance' : 'Mutuelle'
      };
    }

    function drawChart(results) {
      if (!chartCanvas) return;
      const W = 660;
      const H = 290;
      const ctx = UI.setupCanvas(chartCanvas, W, H);

      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      const padL = 62;
      const padR = 24;
      const padT = 44;
      const padB = 54;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const maxVal = Math.max.apply(null, results.reduce(function (acc, r) {
        acc.push(r.mutuelleNetCost, r.epargneNetCost);
        return acc;
      }, [1000])) * 1.15;

      /* Grille */
      ctx.strokeStyle = '#E8DFD3';
      ctx.lineWidth = 1;
      for (let step = 0; step <= 4; step++) {
        const val = (maxVal / 4) * step;
        const y = padT + plotH - (val / maxVal) * plotH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();

        ctx.fillStyle = '#63564B';
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(UI.formatInt(val) + ' €', padL - 8, y + 4);
      }

      /* Barres groupées par scénario */
      const groupW = plotW / results.length;
      const barW = Math.min(54, groupW * 0.3);
      const gap = 12;

      results.forEach(function (r, idx) {
        const centerX = padL + groupW * idx + groupW / 2;

        const hMut = (r.mutuelleNetCost / maxVal) * plotH;
        const hEpa = (r.epargneNetCost / maxVal) * plotH;

        const xMut = centerX - barW - gap / 2;
        const xEpa = centerX + gap / 2;

        /* Barre Mutuelle */
        ctx.fillStyle = '#231B15';
        ctx.fillRect(xMut, padT + plotH - hMut, barW, hMut);

        /* Barre Auto-assurance */
        ctx.fillStyle = '#B84A27';
        ctx.fillRect(xEpa, padT + plotH - hEpa, barW, hEpa);

        /* Étiquettes montants */
        ctx.fillStyle = '#231B15';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(UI.formatEUR(r.mutuelleNetCost), xMut + barW / 2, padT + plotH - hMut - 6);
        ctx.fillStyle = '#B84A27';
        ctx.fillText(UI.formatEUR(r.epargneNetCost), xEpa + barW / 2, padT + plotH - hEpa - 6);

        /* Nom du scénario */
        ctx.fillStyle = '#231B15';
        ctx.font = '700 12px "Nunito Sans", sans-serif';
        ctx.fillText(r.name, centerX, H - 24);
      });

      /* Légende haut */
      ctx.fillStyle = '#231B15';
      ctx.fillRect(padL, 12, 12, 12);
      ctx.font = '600 12px "Nunito Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Coût net Mutuelle (cotisations + reste à charge)', padL + 18, 22);

      ctx.fillStyle = '#B84A27';
      ctx.fillRect(padL + 335, 12, 12, 12);
      ctx.fillStyle = '#231B15';
      ctx.fillText('Coût net Cagnotte Santé (factures − intérêts)', padL + 353, 22);
    }

    function render() {
      const cfg = {
        premium: Math.max(5, Number(elPremium.value) || 36),
        inflation: Math.max(0, Number(elInflation.value) || 0) / 100,
        franchise: Math.max(0, Number(elFranchise.value) || 0),
        reimbRate: Math.min(100, Math.max(30, Number(elRate.value) || 80)) / 100,
        ceiling: Math.max(300, Number(elCeiling.value) || 1800),
        saveMonth: Math.max(5, Number(elSaveMonth.value) || 36),
        saveYield: Math.max(0, Number(elSaveYield.value) || 0) / 100,
        years: Math.max(6, Math.min(16, Number(elHorizon.value) || 12))
      };

      elHorizonVal.textContent = cfg.years + ' ans';

      const s1 = simulateScenario(cfg, 'Animal robuste', 'robuste', 'Soins courants + 2 petits sinistres ponctuels');
      const s2 = simulateScenario(cfg, '1 chirurgie majeure', 'chirurgie', 'Ligament croisé ou corps étranger (2 850 €)');
      const s3 = simulateScenario(cfg, 'Maladie chronique', 'chronique', 'Suivi long cours (~1 180 €/an dès mi-vie)');
      const all = [s1, s2, s3];

      /* Capital théorique si aucun sinistre */
      let capNoClaim = 0;
      for (let i = 0; i < cfg.years; i++) {
        capNoClaim = (capNoClaim + cfg.saveMonth * 12) * (1 + cfg.saveYield);
      }

      outTotalPremiums.textContent = UI.formatEUR(s1.totalPremiums);
      outSaveCapital.textContent = UI.formatEUR(capNoClaim);

      if (s3.winner === 'Mutuelle' && s2.winner === 'Auto-assurance') {
        outVerdict.textContent =
          'Sur ' + cfg.years + ' ans, la cagnotte santé reste gagnante en cas d’animal robuste (+' + UI.formatEUR(s1.diff) + ') ou d’accident isolé (+' + UI.formatEUR(s2.diff) + '). En revanche, la mutuelle devient rentable face à une maladie chronique (économie nette de ' + UI.formatEUR(Math.abs(s3.diff)) + ').';
      } else if (s3.winner === 'Mutuelle' && s2.winner === 'Mutuelle') {
        outVerdict.textContent =
          'Avec ces paramètres, la mutuelle protège efficacement dès une chirurgie majeure (gain de ' + UI.formatEUR(Math.abs(s2.diff)) + ') et s’impose nettement sur une maladie chronique (gain de ' + UI.formatEUR(Math.abs(s3.diff)) + ').';
      } else {
        outVerdict.textContent =
          'Avec une cotisation élevée ou un plafond bas, l’auto-assurance surpasse financièrement la mutuelle dans les 3 scénarios. Attention toutefois au risque de trésorerie si une opération lourde survient dès la 1re ou 2e année !';
      }

      outTableBody.innerHTML = all.map(function (r) {
        const badgeClass = r.winner === 'Mutuelle' ? 'badge-accent' : 'badge-safe';
        return '<tr>' +
          '<td><strong>' + r.name + '</strong><br><span style="font-size:0.82rem;color:var(--text-secondary);">' + r.desc + '</span></td>' +
          '<td class="td-num">' + UI.formatEUR(r.totalVet) + '</td>' +
          '<td class="td-num">' + UI.formatEUR(r.mutuelleNetCost) + '<br><span style="font-size:0.78rem;color:var(--text-secondary);">remb. ' + UI.formatEUR(r.totalReimbursed) + '</span></td>' +
          '<td class="td-num">' + UI.formatEUR(r.epargneNetCost) + '<br><span style="font-size:0.78rem;color:var(--text-secondary);">solde livret ' + UI.formatEUR(r.kittyEnd) + '</span></td>' +
          '<td><span class="badge ' + badgeClass + '">' + r.winner + ' (' + UI.formatEUR(Math.abs(r.diff)) + ')</span></td>' +
          '</tr>';
      }).join('');

      drawChart(all);
    }

    if (elSyncBtn) {
      elSyncBtn.addEventListener('click', function () {
        elSaveMonth.value = elPremium.value;
        render();
        UI.toast('Épargne mensuelle alignée sur la cotisation mutuelle.');
      });
    }

    [elPremium, elInflation, elFranchise, elRate, elCeiling, elSaveMonth, elSaveYield, elHorizon].forEach(function (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });

    render();
  });
})();
