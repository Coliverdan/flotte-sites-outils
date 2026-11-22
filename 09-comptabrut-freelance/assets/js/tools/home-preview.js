/* ==========================================================================
   COMPTABRUT.FR — Aperçu interactif temps réel sur la page d'accueil
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  const RATES = {
    bnc: { urssaf: 0.261, cfp: 0.002, vfl: 0.022, label: 'BNC Services (26,1 %)' },
    bic_s: { urssaf: 0.212, cfp: 0.003, vfl: 0.017, label: 'BIC Services (21,2 %)' },
    bic_v: { urssaf: 0.123, cfp: 0.001, vfl: 0.010, label: 'Achat-Revente (12,3 %)' }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('hp-ca');
    const act = document.getElementById('hp-act');
    if (!slider || !act) return;

    function update() {
      const ca = Number(slider.value) || 0;
      const cfg = RATES[act.value] || RATES.bnc;
      const urssaf = ca * (cfg.urssaf + cfg.cfp);
      const ir = ca * cfg.vfl;
      const net = ca - urssaf - ir;

      document.getElementById('hp-ca-val').textContent = CB.formatEUR(ca, 0) + ' / mois';
      document.getElementById('hp-net').textContent = CB.formatEUR(net, 0);
      document.getElementById('hp-urssaf').textContent = CB.formatEUR(urssaf, 0);
      document.getElementById('hp-ir').textContent = CB.formatEUR(ir, 0);
      document.getElementById('hp-annual').textContent = CB.formatEUR(ca * 12, 0) + ' / an';
    }

    slider.addEventListener('input', update);
    act.addEventListener('change', update);
    update();
  });
})();
