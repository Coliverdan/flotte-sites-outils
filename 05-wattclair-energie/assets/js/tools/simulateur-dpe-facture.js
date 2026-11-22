/* ==========================================================================
   WATTCLAIR — Outil 6 : Estimateur Facture Énergétique par Classe DPE (A à G)
   Conversion officielle Énergie Primaire (EP) -> Énergie Finale (EF) par énergie
   Comparaison Classe Actuelle vs Classe Cible après rénovation + économie 10 ans
   ========================================================================== */

(function () {
  'use strict';

  /* Valeurs médianes représentatives en kWh d'énergie primaire / m² / an (DPE 2021+) */
  const DPE_CLASSES = [
    { code: 'A', epMid: 55, range: '< 70', color: '#009C6D', label: 'Très performant' },
    { code: 'B', epMid: 90, range: '70 – 110', color: '#52B153', label: 'Performant' },
    { code: 'C', epMid: 145, range: '111 – 180', color: '#78BD76', label: 'Bon niveau' },
    { code: 'D', epMid: 215, range: '181 – 250', color: '#E5D300', label: 'Moyen' },
    { code: 'E', epMid: 290, range: '251 – 330', color: '#F0B50F', label: 'Énergivore' },
    { code: 'F', epMid: 375, range: '331 – 420', color: '#EB8235', label: 'Passoire thermique' },
    { code: 'G', epMid: 480, range: '> 420', color: '#D7221F', label: 'Passoire sévère' }
  ];

  /* Énergies : prix €/kWh EF TTC, coefficient énergie primaire officiel (2,3 élec, 1,0 combustibles), part chauffage+ECS */
  const ENERGIES = {
    elec: { name: 'Électricité (radiateurs)', priceKwh: 0.2016, coefEP: 2.3, fixedAbo: 207, note: 'Tarif Bleu Base (0,2016 €/kWh) · Coef. EP 2,3' },
    pac: { name: 'Pompe à chaleur (PAC)', priceKwh: 0.2016, coefEP: 2.3, fixedAbo: 207, note: 'Électricité consommée par la PAC (déjà intégrée dans le DPE) · Coef. EP 2,3' },
    gaz: { name: 'Gaz naturel', priceKwh: 0.1180, coefEP: 1.0, fixedAbo: 277, note: 'Prix repère CRE gaz chauffage (0,118 €/kWh) · Coef. EP 1,0' },
    fioul: { name: 'Fioul domestique', priceKwh: 0.1320, coefEP: 1.0, fixedAbo: 140, note: 'Fioul (~1,32 €/L ≈ 0,132 €/kWh + entretien) · Coef. EP 1,0' },
    bois: { name: 'Bois / Granulés (pellets)', priceKwh: 0.0820, coefEP: 1.0, fixedAbo: 160, note: 'Granulés (~0,082 €/kWh PCI + ramonage) · Coef. EP 1,0' }
  };

  function init() {
    const elSurf = document.getElementById('dpe-surface');
    if (!elSurf) return;

    const state = {
      surface: 85,
      currentClass: 'F',
      targetClass: 'C',
      energy: 'elec'
    };

    const elSurfVal = document.getElementById('dpe-surface-val');
    const elTarget = document.getElementById('dpe-target');
    const canvas = document.getElementById('dpe-chart');

    function syncScale() {
      document.querySelectorAll('[data-dpe-cur]').forEach((btn) => {
        const act = btn.getAttribute('data-dpe-cur') === state.currentClass;
        btn.classList.toggle('is-selected', act);
        btn.setAttribute('aria-pressed', act ? 'true' : 'false');
      });
    }

    function syncEnergy() {
      document.querySelectorAll('[data-dpe-energy]').forEach((btn) => {
        const act = btn.getAttribute('data-dpe-energy') === state.energy;
        btn.classList.toggle('is-active', act);
        btn.setAttribute('aria-pressed', act ? 'true' : 'false');
      });
    }

    elSurf.addEventListener('input', () => {
      state.surface = Number(elSurf.value);
      elSurfVal.textContent = `${state.surface} m²`;
      compute();
    });

    document.querySelectorAll('[data-dpe-cur]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentClass = btn.getAttribute('data-dpe-cur');
        syncScale();
        compute();
      });
    });

    elTarget.addEventListener('change', () => {
      state.targetClass = elTarget.value;
      compute();
    });

    document.querySelectorAll('[data-dpe-energy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.energy = btn.getAttribute('data-dpe-energy');
        syncEnergy();
        compute();
      });
    });

    function estimateBill(dpeCode) {
      const cls = DPE_CLASSES.find((c) => c.code === dpeCode) || DPE_CLASSES[5];
      const en = ENERGIES[state.energy];
      /* Le DPE couvre les 5 usages conventionnels (chauffage, ECS, refroidissement, éclairage, auxiliaires) ~ 88 % chauffage+ECS */
      const totalEpKwh = cls.epMid * state.surface;
      const totalEfKwh = totalEpKwh / en.coefEP;
      const energyCost = totalEfKwh * en.priceKwh;
      const totalBill = energyCost + en.fixedAbo;
      return { cls, totalEpKwh, totalEfKwh, energyCost, totalBill };
    }

    function compute() {
      const { fmtEurRound, fmtNum } = window.WattClair;
      const en = ENERGIES[state.energy];
      const cur = estimateBill(state.currentClass);
      const tgt = estimateBill(state.targetClass);

      const annualSaving = Math.max(0, cur.totalBill - tgt.totalBill);
      /* Économies cumulées sur 10 ans (+3%/an inflation énergie) */
      let saving10Yr = 0;
      for (let yr = 0; yr < 10; yr++) {
        saving10Yr += annualSaving * Math.pow(1.03, yr);
      }

      document.getElementById('dpe-out-bill').textContent = `${fmtEurRound(cur.totalBill)} / an`;
      document.getElementById('dpe-out-sub').textContent =
        `Classe ${cur.cls.code} (${cur.cls.label}) · ${fmtNum(cur.totalEfKwh, 0)} kWh d'énergie finale / an · ${en.note}`;

      document.getElementById('dpe-out-month').textContent = `${fmtEurRound(cur.totalBill / 12)} / mois`;
      document.getElementById('dpe-out-month-note').textContent = `soit ${fmtEurRound(cur.totalBill / state.surface)} / m² / an`;

      document.getElementById('dpe-out-target').textContent = `${fmtEurRound(tgt.totalBill)} / an`;
      document.getElementById('dpe-out-target-note').textContent = `en passant en classe ${tgt.cls.code}`;

      document.getElementById('dpe-out-save10').textContent = fmtEurRound(saving10Yr);
      document.getElementById('dpe-out-save10-note').textContent = `-${fmtEurRound(annualSaving)} / an (+3 %/an sur 10 ans)`;

      const vBox = document.getElementById('dpe-verdict');
      const vTitle = document.getElementById('dpe-verdict-title');
      const vText = document.getElementById('dpe-verdict-text');
      vBox.classList.remove('is-positive', 'is-accent', 'is-warning');

      if (cur.cls.code === 'F' || cur.cls.code === 'G') {
        vBox.classList.add('is-warning');
        vTitle.textContent = `Passoire thermique (${cur.cls.code}) : calendrier d'interdiction locative & fort levier d'économie`;
        vText.textContent = `Les logements classés G sont interdits à la location depuis janvier 2025, et les classes F le seront en 2028. Passer de ${cur.cls.code} à ${tgt.cls.code} réduit la facture d'environ ${fmtEurRound(annualSaving)} par an (${fmtEurRound(saving10Yr)} sur 10 ans).`;
      } else if (annualSaving > 0) {
        vBox.classList.add('is-positive');
        vTitle.textContent = `Gain énergétique estimé de ${cur.cls.code} vers ${tgt.cls.code} : ${fmtEurRound(annualSaving)} / an`;
        vText.textContent = `Une rénovation ciblée (isolation combles/murs, ventilation VMC, régulation ou pompe à chaleur) permet d'économiser environ ${fmtEurRound(saving10Yr)} en 10 ans tout en valorisant le bien.`;
      } else {
        vBox.classList.add('is-accent');
        vTitle.textContent = `Votre logement en classe ${cur.cls.code} est déjà égal ou meilleur que la cible ${tgt.cls.code}`;
        vText.textContent = `Sélectionnez une classe cible plus performante (par exemple A ou B) pour évaluer un scénario d'amélioration complémentaire.`;
      }

      const allBills = DPE_CLASSES.map((c) => ({
        code: c.code,
        color: c.color,
        bill: estimateBill(c.code).totalBill
      }));
      drawChart(canvas, allBills, state.currentClass, state.targetClass);
    }

    function drawChart(cvs, items, curCode, tgtCode) {
      if (!cvs) return;
      const W = 640;
      const H = 260;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);
      const maxVal = Math.max(...items.map((i) => i.bill), 500) * 1.18;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const padL = 62;
      const padR = 20;
      const padT = 30;
      const padB = 46;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      ctx.strokeStyle = '#E2DDD2';
      ctx.lineWidth = 1;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#525C57';
      ctx.textAlign = 'right';

      for (let i = 0; i <= 4; i++) {
        const y = padT + plotH - (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.fillText(`${Math.round((maxVal * i) / 4)} €`, padL - 8, y + 4);
      }

      const slotW = plotW / items.length;
      const barW = Math.min(54, slotW * 0.62);

      items.forEach((item, idx) => {
        const barH = (item.bill / maxVal) * plotH;
        const x = padL + idx * slotW + (slotW - barW) / 2;
        const y = padT + plotH - barH;
        const isCur = item.code === curCode;
        const isTgt = item.code === tgtCode;

        ctx.fillStyle = isCur || isTgt ? item.color : '#D8D2C5';
        ctx.fillRect(x, y, barW, barH);

        if (isCur || isTgt) {
          ctx.strokeStyle = '#1A211E';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, barW, barH);
        }

        ctx.fillStyle = '#1A211E';
        ctx.font = isCur || isTgt ? '700 11px "JetBrains Mono", monospace' : '500 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(item.bill)} €`, x + barW / 2, y - 7);

        ctx.fillStyle = '#1A211E';
        ctx.font = '700 13px "Outfit", sans-serif';
        ctx.fillText(`DPE ${item.code}`, x + barW / 2, padT + plotH + 20);

        if (isCur) {
          ctx.fillStyle = '#B91C1C';
          ctx.font = '600 9px "JetBrains Mono", monospace';
          ctx.fillText('ACTUEL', x + barW / 2, padT + plotH + 36);
        } else if (isTgt) {
          ctx.fillStyle = '#15803D';
          ctx.font = '600 9px "JetBrains Mono", monospace';
          ctx.fillText('CIBLE', x + barW / 2, padT + plotH + 36);
        }
      });
    }

    syncScale();
    syncEnergy();
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
