/* ==========================================================================
   WATTCLAIR — Outil 3 : Comparateur EDF Tarif Base vs HC/HP vs EDF Tempo
   Modèle saisonnier réaliste (300 Bleu / 43 Blanc / 22 Rouge) + graphique Canvas
   ========================================================================== */

(function () {
  'use strict';

  function init() {
    const form = document.getElementById('cmp-form');
    if (!form) return;

    const state = {
      kva: 9,
      conso: 8500,
      heating: 'pac',
      hcShare: 42,
      redShedding: 35
    };

    const elConso = document.getElementById('cmp-conso');
    const elConsoVal = document.getElementById('cmp-conso-val');
    const elHc = document.getElementById('cmp-hc');
    const elHcVal = document.getElementById('cmp-hc-val');
    const elRed = document.getElementById('cmp-red');
    const elRedVal = document.getElementById('cmp-red-val');
    const canvas = document.getElementById('cmp-chart');

    function syncBtn(selector, attr, val) {
      document.querySelectorAll(selector).forEach((b) => {
        const act = b.getAttribute(attr) === String(val);
        b.classList.toggle('is-active', act);
        b.setAttribute('aria-pressed', act ? 'true' : 'false');
      });
    }

    document.querySelectorAll('[data-kva]').forEach((b) => {
      b.addEventListener('click', () => {
        state.kva = Number(b.getAttribute('data-kva'));
        syncBtn('[data-kva]', 'data-kva', state.kva);
        compute();
      });
    });

    document.querySelectorAll('[data-heat]').forEach((b) => {
      b.addEventListener('click', () => {
        state.heating = b.getAttribute('data-heat');
        syncBtn('[data-heat]', 'data-heat', state.heating);
        compute();
      });
    });

    elConso.addEventListener('input', () => {
      state.conso = Number(elConso.value);
      elConsoVal.textContent = `${window.WattClair.fmtNum(state.conso)} kWh`;
      compute();
    });

    elHc.addEventListener('input', () => {
      state.hcShare = Number(elHc.value);
      elHcVal.textContent = `${state.hcShare} %`;
      compute();
    });

    elRed.addEventListener('input', () => {
      state.redShedding = Number(elRed.value);
      elRedVal.textContent = `${state.redShedding} %`;
      compute();
    });

    function compute() {
      const { EDF_TARIFS, fmtEurRound, fmtNum } = window.WattClair;
      const kva = state.kva;
      const conso = state.conso;
      const hcFrac = state.hcShare / 100;
      const hpFrac = 1 - hcFrac;

      /* 1. Option Base */
      const baseAbo = EDF_TARIFS.base.abo[kva];
      const baseEnergy = conso * EDF_TARIFS.base.kwh;
      const baseTotal = baseAbo + baseEnergy;

      /* 2. Option Heures Creuses / Heures Pleines */
      const hchpAbo = EDF_TARIFS.hchp.abo[kva];
      const hchpEnergy = conso * (hcFrac * EDF_TARIFS.hchp.hc + hpFrac * EDF_TARIFS.hchp.hp);
      const hchpTotal = hchpAbo + hchpEnergy;

      /* 3. Option EDF Tempo — pondération hivernale réaliste selon chauffage */
      /* Jours : 300 Bleu, 43 Blanc (nov-mars), 22 Rouge (pointes de froid nov-mars) */
      const weights = {
        gaz_bois: { bleu: 1.0, blanc: 1.12, rouge: 1.15 },
        pac: { bleu: 1.0, blanc: 1.55, rouge: 1.85 },
        elec: { bleu: 1.0, blanc: 1.90, rouge: 2.35 }
      }[state.heating];

      const totalWeight = 300 * weights.bleu + 43 * weights.blanc + 22 * weights.rouge;
      const kwhBleu = conso * ((300 * weights.bleu) / totalWeight);
      const kwhBlanc = conso * ((43 * weights.blanc) / totalWeight);
      const kwhRougeBrut = conso * ((22 * weights.rouge) / totalWeight);

      /* Effacement les jours rouges : réduit la conso HP rouge (reportée partiellement en HC ou effacée au poêle/sobriété) */
      const shedFrac = state.redShedding / 100;
      const rougeHpRaw = kwhRougeBrut * hpFrac;
      const rougeHpReduced = rougeHpRaw * (1 - shedFrac);
      /* On suppose 35 % de l'effacement est reporté en HC nuit (ex: ballon/lave-linge), 65 % réellement effacé */
      const rougeHcAdjusted = kwhRougeBrut * hcFrac + rougeHpRaw * shedFrac * 0.35;

      const tempoAbo = EDF_TARIFS.tempo.abo[kva];
      const costBleu = kwhBleu * (hcFrac * EDF_TARIFS.tempo.bleuHC + hpFrac * EDF_TARIFS.tempo.bleuHP);
      const costBlanc = kwhBlanc * (hcFrac * EDF_TARIFS.tempo.blancHC + hpFrac * EDF_TARIFS.tempo.blancHP);
      const costRouge = rougeHcAdjusted * EDF_TARIFS.tempo.rougeHC + rougeHpReduced * EDF_TARIFS.tempo.rougeHP;

      const tempoEnergy = costBleu + costBlanc + costRouge;
      const tempoTotal = tempoAbo + tempoEnergy;

      /* Tri des 3 offres */
      const offers = [
        { id: 'base', name: 'Tarif Bleu Base', abo: baseAbo, energy: baseEnergy, total: baseTotal, color: '#1A211E' },
        { id: 'hchp', name: 'Heures Creuses / Pleines', abo: hchpAbo, energy: hchpEnergy, total: hchpTotal, color: '#64748B' },
        { id: 'tempo', name: 'EDF Tempo', abo: tempoAbo, energy: tempoEnergy, total: tempoTotal, color: '#C86D0A' }
      ];
      const sorted = [...offers].sort((a, b) => a.total - b.total);
      const winner = sorted[0];
      const runnerUp = sorted[1];
      const worst = sorted[2];
      const savingVsRunner = runnerUp.total - winner.total;
      const savingVsWorst = worst.total - winner.total;

      /* KPI DOM */
      document.getElementById('cmp-winner-name').textContent = winner.name;
      document.getElementById('cmp-winner-total').textContent = `${fmtEurRound(winner.total)} / an`;
      document.getElementById('cmp-winner-sub').textContent =
        `Économie de ${fmtEurRound(savingVsRunner)}/an face à ${runnerUp.name} et jusqu'à ${fmtEurRound(savingVsWorst)}/an face à ${worst.name}.`;

      document.getElementById('cmp-base-total').textContent = fmtEurRound(baseTotal);
      document.getElementById('cmp-base-detail').textContent = `Abo ${fmtEurRound(baseAbo)} + Conso ${fmtEurRound(baseEnergy)}`;

      document.getElementById('cmp-hchp-total').textContent = fmtEurRound(hchpTotal);
      document.getElementById('cmp-hchp-detail').textContent = `Abo ${fmtEurRound(hchpAbo)} + Conso ${fmtEurRound(hchpEnergy)}`;

      document.getElementById('cmp-tempo-total').textContent = fmtEurRound(tempoTotal);
      document.getElementById('cmp-tempo-detail').textContent = `Dont Jours Rouges : ${fmtEurRound(costRouge)} (${fmtNum(rougeHpReduced + rougeHcAdjusted, 0)} kWh)`;

      /* Verdict détaillé */
      const vBox = document.getElementById('cmp-verdict');
      const vTitle = document.getElementById('cmp-verdict-title');
      const vText = document.getElementById('cmp-verdict-text');
      vBox.classList.remove('is-positive', 'is-accent', 'is-warning');

      if (winner.id === 'tempo') {
        vBox.classList.add('is-positive');
        vTitle.textContent = 'EDF Tempo est nettement le plus avantageux pour votre profil';
        vText.textContent = `Même en tenant compte de la surconsommation hivernale, vos 300 jours Bleus compensent largement les 22 jours Rouges. Sur 5 ans, l'écart représente environ ${fmtEurRound(savingVsRunner * 5)}.`;
      } else if (winner.id === 'hchp') {
        vBox.classList.add('is-accent');
        vTitle.textContent = 'L\'option Heures Creuses / Pleines s\'impose sans contrainte de jours rouges';
        vText.textContent = `Avec ${state.hcShare} % de consommation en heures creuses, vous dépassez le seuil de rentabilité de l'option HC/HP (environ 30–32 %) tout en évitant le risque des pics rouges.`;
      } else {
        vBox.classList.add('is-warning');
        vTitle.textContent = 'Le Tarif Bleu Base reste plus sûr et plus économique';
        vText.textContent = `Votre part d'heures creuses (${state.hcShare} %) ou votre chauffage électrique sans effacement les jours rouges rend les options à tarification variable moins intéressantes.`;
      }

      /* Détail Tempo Bleu / Blanc / Rouge */
      document.getElementById('cmp-t-bleu').textContent = `${fmtEurRound(costBleu)} (${fmtNum(kwhBleu, 0)} kWh)`;
      document.getElementById('cmp-t-blanc').textContent = `${fmtEurRound(costBlanc)} (${fmtNum(kwhBlanc, 0)} kWh)`;
      document.getElementById('cmp-t-rouge').textContent = `${fmtEurRound(costRouge)} (${fmtNum(rougeHpReduced + rougeHcAdjusted, 0)} kWh)`;

      drawChart(canvas, offers, winner.id);
    }

    function drawChart(cvs, offers, winnerId) {
      if (!cvs) return;
      const W = 640;
      const H = 260;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);
      const maxVal = Math.max(...offers.map((o) => o.total), 100) * 1.18;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const padL = 62;
      const padR = 24;
      const padT = 30;
      const padB = 48;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      /* Lignes horizontales */
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

      const slotW = plotW / 3;
      const barW = Math.min(96, slotW * 0.52);

      offers.forEach((o, idx) => {
        const x = padL + idx * slotW + (slotW - barW) / 2;
        const aboH = (o.abo / maxVal) * plotH;
        const eneH = (o.energy / maxVal) * plotH;
        const totalH = aboH + eneH;
        const topY = padT + plotH - totalH;

        /* Part consommation (bas) */
        ctx.fillStyle = o.id === winnerId ? '#C86D0A' : '#1A211E';
        ctx.fillRect(x, padT + plotH - eneH, barW, eneH);

        /* Part abonnement (haut empilé) */
        ctx.fillStyle = '#C9C1B0';
        ctx.fillRect(x, topY, barW, aboH);

        /* Total en haut */
        ctx.fillStyle = o.id === winnerId ? '#C86D0A' : '#1A211E';
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(o.total)} €`, x + barW / 2, topY - 8);

        /* Nom de l'offre */
        ctx.fillStyle = '#1A211E';
        ctx.font = '600 12px "DM Sans", sans-serif';
        ctx.fillText(o.name, x + barW / 2, padT + plotH + 22);

        if (o.id === winnerId) {
          ctx.fillStyle = '#15803D';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText('MEILLEUR CHOIX', x + barW / 2, padT + plotH + 38);
        }
      });
    }

    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
