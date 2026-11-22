/* ==========================================================================
   HOME — Vérificateur Rapide Interactif (Hero Telemetry Panel)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('home-quick-form');
    if (!form || !window.CABINEOK_DATA) return;

    const { AIRLINES, evaluateBagFit } = window.CABINEOK_DATA;
    const hInput = document.getElementById('hq-h');
    const wInput = document.getElementById('hq-w');
    const dInput = document.getElementById('hq-d');
    const modeSel = document.getElementById('hq-mode');
    const summaryEl = document.getElementById('hq-summary');
    const listEl = document.getElementById('hq-preview-list');
    const deepLink = document.getElementById('hq-deep-link');

    const FEATURED_IDS = ['ryanair', 'easyjet', 'transavia', 'air-france', 'vueling', 'lufthansa'];

    function update() {
      const h = Math.max(10, Number(hInput.value) || 40);
      const w = Math.max(10, Number(wInput.value) || 30);
      const d = Math.max(5, Number(dInput.value) || 20);
      const mode = modeSel.value;

      let okAll = 0;
      AIRLINES.forEach((a) => {
        const res = evaluateBagFit({ h, w, d }, 7, mode === 'underSeat' ? a.underSeat : a.cabin);
        if (res.dimsOk) okAll++;
      });

      summaryEl.innerHTML =
        '<strong>' + okAll + ' / ' + AIRLINES.length + ' compagnies</strong> acceptent le gabarit <span class="mono">' + h + '×' + w + '×' + d + ' cm</span> (' +
        (mode === 'underSeat' ? 'sous le siège' : 'coffre cabine') + ').';

      listEl.innerHTML = FEATURED_IDS.map((id) => {
        const a = AIRLINES.find((x) => x.id === id);
        if (!a) return '';
        const rule = mode === 'underSeat' ? a.underSeat : a.cabin;
        const res = evaluateBagFit({ h, w, d }, 7, rule);
        const cls = res.dimsOk ? 'status-ok' : 'status-fail';
        const txt = res.dimsOk ? 'PASSE' : '+' + res.maxExcess + ' CM';
        return (
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2C2F36;">' +
            '<span style="font-size:0.875rem;color:#F5F3EE;"><span class="iata-pill" style="background:#0047AB;margin-right:8px;">' + a.iata + '</span>' + a.name + '</span>' +
            '<span class="status-badge ' + cls + '">' + txt + '</span>' +
          '</div>'
        );
      }).join('');

      deepLink.href = 'outils/verificateur-bagage-cabine.html?h=' + h + '&w=' + w + '&d=' + d + '&mode=' + mode;
    }

    [hInput, wInput, dInput, modeSel].forEach((el) => {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });

    update();
  });
})();
