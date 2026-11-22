/* ==========================================================================
   WATTCLAIR — Outil 5 : Audit « Consommation Fantôme » (Appareils en Veille)
   Quantités interactives, coût 1 an / 10 ans, carte bilan PNG téléchargeable
   ========================================================================== */

(function () {
  'use strict';

  const STANDBY_DEVICES = [
    { id: 'box', name: 'Box Fibre + Décodeur TV', watts: 18, hoursDay: 24, defaultQty: 1, tip: 'Couper le décodeur TV seul fait économiser ~10 W.' },
    { id: 'tv', name: 'Téléviseur OLED / QLED connecté', watts: 3.5, hoursDay: 20, defaultQty: 1, tip: 'Désactiver le « démarrage rapide ».' },
    { id: 'console', name: 'Console PS5 / Xbox (démarrage rapide)', watts: 11, hoursDay: 22, defaultQty: 1, tip: 'Passer en mode économie d\'énergie (< 0,5 W).' },
    { id: 'pc', name: 'PC fixe + écrans en veille', watts: 9, hoursDay: 18, defaultQty: 1, tip: 'Multiprise à interrupteur sur le bureau.' },
    { id: 'imprimante', name: 'Imprimante Wi-Fi allumée', watts: 4.5, hoursDay: 24, defaultQty: 1, tip: 'Éteindre hors impression.' },
    { id: 'micro', name: 'Micro-ondes & Four (horloges)', watts: 3, hoursDay: 23, defaultQty: 2, tip: 'Veille électronique permanente.' },
    { id: 'cafe', name: 'Machine à café expresso / broyeur', watts: 2.5, hoursDay: 23, defaultQty: 1, tip: 'Débrancher ou prise connectée.' },
    { id: 'chargeurs', name: 'Chargeurs (smartphone / PC) branchés à vide', watts: 1.5, hoursDay: 20, defaultQty: 3, tip: 'Faible unitairement, cumulé sur l\'année.' },
    { id: 'enceinte', name: 'Enceintes connectées / Barre de son', watts: 5, hoursDay: 22, defaultQty: 2, tip: 'Écoute vocale 24h/24.' },
    { id: 'wifi', name: 'Répéteur Wi-Fi ou boîtier CPL', watts: 5.5, hoursDay: 24, defaultQty: 1, tip: 'Privilégier le câble Ethernet si possible.' },
    { id: 'nas', name: 'Serveur NAS / Disque réseau', watts: 14, hoursDay: 24, defaultQty: 0, tip: 'Programmer la mise en veille nocturne.' },
    { id: 'lave', name: 'Lave-linge / Sèche-linge (écran veille)', watts: 2, hoursDay: 22, defaultQty: 2, tip: 'Remettre le sélecteur sur Arrêt.' }
  ];

  function init() {
    const listEl = document.getElementById('veille-list');
    if (!listEl) return;

    const state = {
      tariff: 0.2016,
      qty: {}
    };

    STANDBY_DEVICES.forEach((d) => {
      state.qty[d.id] = d.defaultQty;
    });

    const elTariff = document.getElementById('veille-tariff');
    const canvas = document.getElementById('veille-card-canvas');
    const btnDownload = document.getElementById('veille-download-png');
    const btnReset = document.getElementById('veille-reset');
    const btnPresetAvg = document.getElementById('veille-preset-avg');

    function renderRows() {
      const { fmtEur } = window.WattClair;
      listEl.innerHTML = '';

      STANDBY_DEVICES.forEach((d) => {
        const q = state.qty[d.id] || 0;
        const kwhYr = ((d.watts * d.hoursDay * 365) / 1000) * q;
        const costYr = kwhYr * state.tariff;

        const row = document.createElement('div');
        row.className = 'standby-row' + (q > 0 ? ' is-active' : '');
        row.innerHTML =
          `<div class="standby-meta">` +
          `<strong>${d.name}</strong>` +
          `<span>${d.watts} W · ${d.hoursDay} h/j · ${d.tip}</span>` +
          `</div>` +
          `<div class="stepper" role="group" aria-label="Quantité pour ${d.name}">` +
          `<button type="button" data-dec="${d.id}" aria-label="Retirer un ${d.name}">−</button>` +
          `<span class="stepper-val">${q}</span>` +
          `<button type="button" data-inc="${d.id}" aria-label="Ajouter un ${d.name}">+</button>` +
          `</div>` +
          `<div class="standby-cost">${fmtEur(costYr, 1)}/an</div>`;

        listEl.appendChild(row);
      });

      listEl.querySelectorAll('[data-dec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-dec');
          state.qty[id] = Math.max(0, (state.qty[id] || 0) - 1);
          renderRows();
          compute();
        });
      });

      listEl.querySelectorAll('[data-inc]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-inc');
          state.qty[id] = Math.min(20, (state.qty[id] || 0) + 1);
          renderRows();
          compute();
        });
      });
    }

    if (elTariff) {
      elTariff.addEventListener('input', () => {
        state.tariff = Math.max(0.05, Number(elTariff.value) || 0.2016);
        renderRows();
        compute();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        STANDBY_DEVICES.forEach((d) => { state.qty[d.id] = 0; });
        renderRows();
        compute();
      });
    }

    if (btnPresetAvg) {
      btnPresetAvg.addEventListener('click', () => {
        STANDBY_DEVICES.forEach((d) => { state.qty[d.id] = d.defaultQty; });
        renderRows();
        compute();
      });
    }

    if (btnDownload && canvas) {
      btnDownload.addEventListener('click', () => {
        window.WattClair.exportCanvasPNG(canvas, 'wattclair-bilan-veilles-fantomes.png');
      });
    }

    function compute() {
      const { fmtEur, fmtEurRound, fmtNum, fmtKwh } = window.WattClair;

      let totalWatts = 0;
      let totalKwhYr = 0;
      let totalDevices = 0;
      const breakdown = [];

      STANDBY_DEVICES.forEach((d) => {
        const q = state.qty[d.id] || 0;
        if (q > 0) {
          const w = d.watts * q;
          const kwh = ((d.watts * d.hoursDay * 365) / 1000) * q;
          totalWatts += w;
          totalKwhYr += kwh;
          totalDevices += q;
          breakdown.push({ name: d.name, qty: q, kwh, cost: kwh * state.tariff });
        }
      });

      breakdown.sort((a, b) => b.cost - a.cost);

      const costYr1 = totalKwhYr * state.tariff;
      /* Coût cumulé 10 ans avec inflation électricité +3%/an */
      let cost10Yr = 0;
      for (let yr = 0; yr < 10; yr++) {
        cost10Yr += costYr1 * Math.pow(1.03, yr);
      }

      /* Mix électrique français ~52 g CO2/kWh */
      const co2KgYr = (totalKwhYr * 0.052);
      const washCyclesEq = Math.round(totalKwhYr / 1.15);

      document.getElementById('veille-out-cost1').textContent = fmtEurRound(costYr1);
      document.getElementById('veille-out-sub').textContent =
        `${totalDevices} appareil${totalDevices > 1 ? 's' : ''} en veille · Puissance continue : ${fmtNum(totalWatts, 1)} W`;

      document.getElementById('veille-out-kwh').textContent = fmtKwh(totalKwhYr, 0);
      document.getElementById('veille-out-kwh-note').textContent = `soit ${fmtNum(washCyclesEq)} cycles de lave-vaisselle`;

      document.getElementById('veille-out-cost10').textContent = fmtEurRound(cost10Yr);
      document.getElementById('veille-out-cost10-note').textContent = 'avec +3 %/an d\'évolution tarifaire';

      document.getElementById('veille-out-co2').textContent = `${fmtNum(co2KgYr, 1)} kg CO₂`;
      document.getElementById('veille-out-co2-note').textContent = 'empreinte annuelle (mix FR)';

      drawSummaryCard(canvas, {
        totalDevices,
        totalWatts,
        totalKwhYr,
        costYr1,
        cost10Yr,
        topItems: breakdown.slice(0, 4)
      });
    }

    function drawSummaryCard(cvs, d) {
      if (!cvs) return;
      const { fmtEurRound, fmtNum } = window.WattClair;
      const W = 800;
      const H = 440;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);

      /* Fond lin naturel + bordure sobre */
      ctx.fillStyle = '#F7F5F0';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#1A211E';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, W - 32, H - 32);

      /* Bandeau supérieur sombre plat */
      ctx.fillStyle = '#1A211E';
      ctx.fillRect(16, 16, W - 32, 68);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 22px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('WattClair.', 40, 58);

      ctx.fillStyle = '#C86D0A';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('AUDIT CONSOMMATION FANTÔME · WATTCLAIR.FR', W - 40, 56);

      /* Bloc KPI gauche */
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(40, 108, 336, 168);
      ctx.strokeStyle = '#E2DDD2';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 108, 336, 168);

      ctx.fillStyle = '#C86D0A';
      ctx.fillRect(40, 108, 336, 4);

      ctx.fillStyle = '#525C57';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('GASPILLAGE ANNUEL ESTIMÉ', 60, 138);

      ctx.fillStyle = '#C86D0A';
      ctx.font = '700 44px "JetBrains Mono", monospace';
      ctx.fillText(fmtEurRound(d.costYr1), 60, 192);

      ctx.fillStyle = '#1A211E';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.fillText(`${fmtNum(d.totalKwhYr, 0)} kWh / an  ·  ${fmtNum(d.totalWatts, 0)} W continus`, 60, 228);

      ctx.fillStyle = '#525C57';
      ctx.font = '500 13px "DM Sans", sans-serif';
      ctx.fillText(`Sur 10 ans (+3 %/an) : ${fmtEurRound(d.cost10Yr)} perdus`, 60, 256);

      /* Bloc Top postes droite */
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(396, 108, 364, 168);
      ctx.strokeStyle = '#E2DDD2';
      ctx.strokeRect(396, 108, 364, 168);

      ctx.fillStyle = '#525C57';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('PRINCIPAUX POSTES EN VEILLE', 416, 138);

      if (d.topItems.length === 0) {
        ctx.fillStyle = '#525C57';
        ctx.font = '500 14px "DM Sans", sans-serif';
        ctx.fillText('Aucun appareil sélectionné.', 416, 178);
      } else {
        d.topItems.forEach((item, i) => {
          const y = 166 + i * 26;
          ctx.fillStyle = '#1A211E';
          ctx.font = '500 13px "DM Sans", sans-serif';
          ctx.textAlign = 'left';
          const shortName = item.name.length > 26 ? item.name.slice(0, 25) + '…' : item.name;
          ctx.fillText(`${item.qty}× ${shortName}`, 416, y);

          ctx.fillStyle = '#C86D0A';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(item.cost)} €/an`, 740, y);
        });
      }

      /* Bandeau conseil bas */
      ctx.fillStyle = '#EFECE4';
      ctx.fillRect(40, 296, 720, 100);
      ctx.strokeStyle = '#E2DDD2';
      ctx.strokeRect(40, 296, 720, 100);

      ctx.fillStyle = '#1A211E';
      ctx.font = '700 14px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Plan d\'action rapide (multiprises à interrupteur & réglages éco)', 60, 326);

      ctx.fillStyle = '#525C57';
      ctx.font = '400 13px "DM Sans", sans-serif';
      const savePot = Math.round(d.costYr1 * 0.65);
      ctx.fillText(`• Couper le décodeur TV, la console (mode éco) et le bloc bureau permet de récupérer ~${savePot} €/an sans perte de confort.`, 60, 354);
      ctx.fillText(`• Barème utilisé : ${state.tariff.toFixed(4).replace('.', ',')} €/kWh TTC (EDF TRVE de référence) — Généré sur wattclair.fr`, 60, 378);
    }

    renderRows();
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
