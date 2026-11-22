/* ==========================================================================
   TRAJECTOIRE — Outil 5 : Comparateur LOA / LLD vs Crédit Auto vs Comptant
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const T = window.Trajectoire;
    const form = document.getElementById('fin-form');
    if (!T || !form) return;

    const durationBtns = document.querySelectorAll('[data-fin-months]');
    let months = 48;

    const el = {
      price: document.getElementById('f-price'),
      apport: document.getElementById('f-apport'),
      resale: document.getElementById('f-resale'),
      loaMonth: document.getElementById('f-loa-month'),
      loaOption: document.getElementById('f-loa-option'),
      lldMonth: document.getElementById('f-lld-month'),
      restitutionFees: document.getElementById('f-restitution-fees'),
      creditTaeg: document.getElementById('f-taeg'),
      savingsRate: document.getElementById('f-savings-rate'),
      kmContract: document.getElementById('f-km-contract'),
      kmReal: document.getElementById('f-km-real'),
      kmPenaltyRate: document.getElementById('f-km-penalty'),
      // Sorties
      verdictBanner: document.getElementById('f-verdict-banner'),
      verdictVal: document.getElementById('f-verdict-val'),
      verdictSub: document.getElementById('f-verdict-sub'),
      warningBox: document.getElementById('f-km-warning'),
      warningText: document.getElementById('f-km-warning-text'),
      kpiCash: document.getElementById('f-kpi-cash'),
      kpiCredit: document.getElementById('f-kpi-credit'),
      kpiLoa: document.getElementById('f-kpi-loa'),
      kpiLld: document.getElementById('f-kpi-lld'),
      tableBody: document.getElementById('f-table-body'),
      canvas: document.getElementById('f-chart'),
      exportBtn: document.getElementById('f-export-png')
    };

    durationBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        durationBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        months = parseInt(btn.getAttribute('data-fin-months'), 10) || 48;
        calculate();
      });
    });

    function computeMonthlyLoan(principal, annualTaegPct, nMonths) {
      if (principal <= 0) return 0;
      const r = (annualTaegPct / 100) / 12;
      if (r <= 0) return principal / nMonths;
      return (principal * r) / (1 - Math.pow(1 + r, -nMonths));
    }

    let lastRes = null;

    function calculate() {
      const price = Math.max(2000, parseFloat(el.price.value) || 32000);
      const apport = Math.max(0, Math.min(price, parseFloat(el.apport.value) || 0));
      const resale = Math.max(0, parseFloat(el.resale.value) || 0);
      const loaMonth = Math.max(0, parseFloat(el.loaMonth.value) || 0);
      const loaOption = Math.max(0, parseFloat(el.loaOption.value) || 0);
      const lldMonth = Math.max(0, parseFloat(el.lldMonth.value) || 0);
      const restFees = Math.max(0, parseFloat(el.restitutionFees.value) || 0);
      const taeg = Math.max(0, parseFloat(el.creditTaeg.value) || 0);
      const savRate = Math.max(0, parseFloat(el.savingsRate.value) || 0);

      const kmContract = Math.max(1000, parseInt(el.kmContract.value, 10) || 10000);
      const kmReal = Math.max(1000, parseInt(el.kmReal.value, 10) || 15000);
      const kmPenRate = Math.max(0, parseFloat(el.kmPenaltyRate.value) || 0.12);

      const years = months / 12;
      const excessKmTotal = Math.max(0, (kmReal - kmContract) * years);
      const excessPenalty = excessKmTotal * kmPenRate;

      // Alerte km excédentaires
      if (el.warningBox && el.warningText) {
        if (excessKmTotal > 0) {
          el.warningBox.style.display = 'block';
          el.warningText.textContent = `Dépassement détecté : +${T.fmtNum(excessKmTotal)} km sur ${months} mois × ${T.fmtEURDec(kmPenRate)}/km = ${T.fmtEUR(excessPenalty)} de pénalité facturée en fin de LOA (restitution) ou LLD, plus ${T.fmtEUR(restFees)} de frais de remise en état estimés.`;
        } else {
          el.warningBox.style.display = 'none';
        }
      }

      // 1. Achat Comptant
      const oppCost = savRate > 0 ? price * (Math.pow(1 + savRate / 100, years) - 1) : 0;
      const cashOut = price;
      const cashNet = price - resale + oppCost;

      // 2. Crédit Auto Classique
      const loanAmount = Math.max(0, price - apport);
      const creditMonthly = computeMonthlyLoan(loanAmount, taeg, months);
      const creditTotalPaid = apport + creditMonthly * months;
      const creditInterests = Math.max(0, creditTotalPaid - price);
      const creditNet = creditTotalPaid - resale;

      // 3. LOA — Scénario Restitution
      const loaRestOut = apport + loaMonth * (months - 1) + excessPenalty + restFees;
      // Note : dans une LOA avec 1er loyer majoré (apport), il reste (months - 1) loyers mensuels courants
      const loaRestNet = loaRestOut;

      // 4. LOA — Scénario Rachat (levée d'option d'achat puis revente)
      const loaBuyOut = apport + loaMonth * (months - 1) + loaOption;
      const loaBuyNet = loaBuyOut - resale;

      // 5. LLD (Location Longue Durée)
      const lldOut = apport + lldMonth * (months - 1) + excessPenalty + restFees;
      const lldNet = lldOut;

      const scenarios = [
        { key: 'cash', name: 'Achat Comptant', monthly: 0, totalOut: cashOut, resaleVal: resale, net: cashNet, note: oppCost > 0 ? `Incl. ${T.fmtEUR(oppCost)} coût d'opportunité` : 'Propriétaire · 0 intérêt', color: '#22C55E' },
        { key: 'credit', name: 'Crédit Auto Classique', monthly: creditMonthly, totalOut: creditTotalPaid, resaleVal: resale, net: creditNet, note: `${T.fmtEUR(creditInterests)} d'intérêts (TAEG ${T.fmtDec(taeg, 1)} %)`, color: '#38BDF8' },
        { key: 'loaBuy', name: 'LOA (avec rachat final)', monthly: loaMonth, totalOut: loaBuyOut, resaleVal: resale, net: loaBuyNet, note: `Option d'achat ${T.fmtEUR(loaOption)} levée`, color: '#F59E0B' },
        { key: 'loaRest', name: 'LOA (avec restitution)', monthly: loaMonth, totalOut: loaRestOut, resaleVal: 0, net: loaRestNet, note: excessPenalty > 0 ? `Dont ${T.fmtEUR(excessPenalty)} pénalité km` : 'Véhicule restitué', color: '#E85D04' },
        { key: 'lld', name: 'LLD (Location Longue Durée)', monthly: lldMonth, totalOut: lldOut, resaleVal: 0, net: lldNet, note: excessPenalty > 0 ? `Dont ${T.fmtEUR(excessPenalty)} pénalité km` : 'Restitution obligatoire', color: '#9BA3AE' }
      ];

      const sorted = [...scenarios].sort((a, b) => a.net - b.net);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const spread = worst.net - best.net;

      el.verdictBanner.classList.add('is-positive');
      el.verdictVal.textContent = `${best.name} : ${T.fmtEUR(best.net)} net`;
      el.verdictSub.textContent = `Option la plus économique sur ${months} mois : jusqu'à ${T.fmtEUR(spread)} d'écart face à ${worst.name} (${T.fmtEUR(worst.net)} net).`;

      el.kpiCash.textContent = T.fmtEUR(cashNet);
      el.kpiCredit.textContent = T.fmtEUR(creditNet);
      el.kpiLoa.textContent = T.fmtEUR(Math.min(loaBuyNet, loaRestNet));
      el.kpiLld.textContent = T.fmtEUR(lldNet);

      el.tableBody.innerHTML = scenarios.map((s) => {
        const isBest = s.key === best.key;
        return `
          <tr class="${isBest ? 'row-highlight' : ''}">
            <td><strong>${s.name}</strong>${isBest ? ' <span class="badge badge-positive" style="margin-left:6px;">Optimal</span>' : ''}<br><span class="text-muted" style="font-size:12px;">${s.note}</span></td>
            <td class="num">${s.monthly > 0 ? `${T.fmtEUR(s.monthly)}/m` : '—'}</td>
            <td class="num">${T.fmtEUR(s.totalOut)}</td>
            <td class="num">${s.resaleVal > 0 ? `-${T.fmtEUR(s.resaleVal)}` : '0 €'}</td>
            <td class="num ${isBest ? 'text-positive' : ''}">${T.fmtEUR(s.net)}</td>
          </tr>
        `;
      }).join('');

      lastRes = { scenarios, best, worst, spread, months, price, excessPenalty };
      drawChart(lastRes);
    }

    function drawChart(r) {
      if (!el.canvas || !r) return;
      const { ctx, width, height } = T.setupCanvas(el.canvas);
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const maxNet = Math.max(2000, ...r.scenarios.map((s) => s.net)) * 1.12;
      const pad = { top: 28, right: 20, bottom: 52, left: 60 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      // Grille horizontale
      ctx.strokeStyle = '#22272E';
      ctx.lineWidth = 1;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      for (let i = 0; i <= 4; i++) {
        const val = (maxNet * i) / 4;
        const y = pad.top + plotH - (val / maxNet) * plotH;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = '#6C7582';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(val / 1000)} k€`, pad.left - 8, y + 4);
      }

      const barSlot = plotW / r.scenarios.length;
      const barW = Math.min(64, barSlot * 0.58);
      const shortLabels = ['Comptant', 'Crédit', 'LOA Rachat', 'LOA Restit.', 'LLD'];

      r.scenarios.forEach((s, idx) => {
        const cx = pad.left + barSlot * idx + barSlot / 2;
        const barH = Math.max(4, (s.net / maxNet) * plotH);
        const y = pad.top + plotH - barH;

        ctx.fillStyle = s.color;
        ctx.fillRect(cx - barW / 2, y, barW, barH);

        // Valeur au-dessus
        ctx.fillStyle = '#F2F2EE';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(T.fmtEUR(s.net), cx, y - 8);

        // Label dessous
        ctx.fillStyle = '#9BA3AE';
        ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(shortLabels[idx], cx, height - 18);
      });
    }

    form.querySelectorAll('input, select').forEach((node) => {
      node.addEventListener('input', calculate);
      node.addEventListener('change', calculate);
    });

    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', () => {
        if (!lastRes) return;
        T.exportSummaryCardPNG({
          title: `Comparatif Financement Auto (${lastRes.months} mois)`,
          subtitle: `Véhicule ${T.fmtEUR(lastRes.price)} · Écart maximal de ${T.fmtEUR(lastRes.spread)} entre options`,
          verdictLabel: 'Financement le plus rentable',
          verdictValue: `${lastRes.best.name} : ${T.fmtEUR(lastRes.best.net)} net`,
          kpis: lastRes.scenarios.slice(0, 4).map((s) => ({
            label: s.name.split(' (')[0],
            value: T.fmtEUR(s.net),
            note: s.monthly > 0 ? `${T.fmtEUR(s.monthly)}/mois` : 'Paiement comptant',
            color: s.color
          })),
          filename: 'trajectoire-loa-credit.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastRes) drawChart(lastRes);
    });

    calculate();
  });
})();
