/* ==========================================================================
   COMPTABRUT.FR — Outil 03 : Prorata & Seuils TVA / Plafonds Micro-Entreprise
   Calcul prorata temporis exact + jauges + simulateur impact tarifaire TVA
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  const THRESHOLDS = {
    services: {
      label: 'Prestations de services (BNC / BIC)',
      microMax: 77700,
      tvaBase: 37500,
      tvaMajore: 41250
    },
    vente: {
      label: 'Achat-revente / Vente de marchandises (BIC)',
      microMax: 188700,
      tvaBase: 85000,
      tvaMajore: 93500
    }
  };

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function calcProrata(startDateStr) {
    if (!startDateStr) return { activeDays: 365, totalDays: 365, ratio: 1, year: new Date().getFullYear() };
    const parts = startDateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return { activeDays: 365, totalDays: 365, ratio: 1, year: new Date().getFullYear() };
    }
    const [y, m, d] = parts;
    const totalDays = isLeapYear(y) ? 366 : 365;
    const startUTC = Date.UTC(y, m - 1, d);
    const endUTC = Date.UTC(y, 11, 31);
    const diffDays = Math.floor((endUTC - startUTC) / 86400000) + 1;
    const activeDays = Math.min(totalDays, Math.max(1, diffDays));
    return { activeDays, totalDays, ratio: activeDays / totalDays, year: y };
  }

  function init() {
    const actSelect = document.getElementById('tv-activity');
    const firstYearToggle = document.getElementById('tv-first-year');
    const startDateWrap = document.getElementById('tv-start-wrap');
    const startDateInput = document.getElementById('tv-start-date');
    const caActuelInput = document.getElementById('tv-ca-actuel');
    const caRange = document.getElementById('tv-ca-range');

    // Simulateur d'impact tarifaire
    const tjmInput = document.getElementById('tv-prix-actuel');
    const clientTypeSelect = document.getElementById('tv-client-type');
    const vatRateSelect = document.getElementById('tv-rate');
    const achatsInput = document.getElementById('tv-achats');

    if (!actSelect || !caActuelInput) return;

    function update() {
      const cfg = THRESHOLDS[actSelect.value] || THRESHOLDS.services;
      const isFirstYear = firstYearToggle.checked;
      startDateWrap.style.display = isFirstYear ? 'block' : 'none';

      const prorata = isFirstYear ? calcProrata(startDateInput.value) : { activeDays: 365, totalDays: 365, ratio: 1, year: 2026 };
      const microLimit = Math.round(cfg.microMax * prorata.ratio);

      // Depuis 2025 (CGI art. 293 B), les seuils de franchise TVA ne sont plus proratisés la 1ère année
      const tvaBase = cfg.tvaBase;
      const tvaMajore = cfg.tvaMajore;

      const ca = Math.max(0, parseFloat(caActuelInput.value) || 0);

      // Marges restantes
      const resteTvaBase = tvaBase - ca;
      const resteTvaMajore = tvaMajore - ca;
      const resteMicro = microLimit - ca;

      // Statut TVA
      const statusBox = document.getElementById('tv-status-box');
      const statusTitle = document.getElementById('tv-status-title');
      const statusDesc = document.getElementById('tv-status-desc');

      if (ca > tvaMajore) {
        statusBox.className = 'callout callout-danger';
        statusTitle.textContent = 'Dépassement du seuil majoré — Assujettissement TVA immédiat';
        statusDesc.textContent = `Votre CA (${CB.formatEUR(ca, 0)}) dépasse le seuil majoré (${CB.formatEUR(tvaMajore, 0)}). Vous devez facturer la TVA dès le jour de l’opération qui déclenche le dépassement et demander votre numéro de TVA intracommunautaire au SIE.`;
      } else if (ca > tvaBase) {
        statusBox.className = 'callout callout-warn';
        statusTitle.textContent = 'Zone de tolérance TVA — Assujettissement au 1er janvier N+1';
        statusDesc.textContent = `Votre CA est compris entre ${CB.formatEUR(tvaBase, 0)} et ${CB.formatEUR(tvaMajore, 0)}. Vous restez en franchise jusqu’au 31 décembre si vous ne franchissez pas ${CB.formatEUR(tvaMajore, 0)} (marge avant bascule immédiate : ${CB.formatEUR(resteTvaMajore, 0)}), puis facturerez la TVA dès le 1er janvier suivant.`;
      } else {
        statusBox.className = 'callout callout-ok';
        statusTitle.textContent = 'Franchise en base de TVA active (Art. 293 B du CGI)';
        statusDesc.textContent = `Vous facturez sans TVA. Il vous reste ${CB.formatEUR(resteTvaBase, 0)} de marge avant le seuil de base et ${CB.formatEUR(resteTvaMajore, 0)} avant la bascule immédiate.`;
      }

      // KPIs
      document.getElementById('tv-kpi-marge-tva').textContent = resteTvaBase >= 0 ? CB.formatEUR(resteTvaBase, 0) : `+ ${CB.formatEUR(Math.abs(resteTvaBase), 0)}`;
      document.getElementById('tv-kpi-marge-tva-sub').textContent = resteTvaBase >= 0 ? `Avant seuil base (${CB.formatEUR(tvaBase, 0)})` : `Seuil base dépassé`;

      const kpiMajoreBox = document.getElementById('tv-kpi-majore-box');
      kpiMajoreBox.className = 'kpi-box ' + (resteTvaMajore < 0 ? 'kpi-danger' : resteTvaMajore < 5000 ? 'kpi-warn' : '');
      document.getElementById('tv-kpi-majore').textContent = resteTvaMajore >= 0 ? CB.formatEUR(resteTvaMajore, 0) : 'DÉPASSÉ';
      document.getElementById('tv-kpi-majore-sub').textContent = `Avant seuil majoré (${CB.formatEUR(tvaMajore, 0)})`;

      document.getElementById('tv-kpi-micro').textContent = CB.formatEUR(microLimit, 0);
      document.getElementById('tv-kpi-micro-sub').textContent = isFirstYear
        ? `Proratisé sur ${prorata.activeDays} / ${prorata.totalDays} jours (${(prorata.ratio * 100).toFixed(1)} %)`
        : `Plafond annuel plein (reste ${CB.formatEUR(Math.max(0, resteMicro), 0)})`;

      // Jauge TVA
      const tvaPct = Math.min(100, (ca / tvaMajore) * 100);
      const tvaMarkerPos = (tvaBase / tvaMajore) * 100;
      const tvaFill = document.getElementById('tv-gauge-tva-fill');
      tvaFill.style.width = `${tvaPct.toFixed(1)}%`;
      tvaFill.className = 'gauge-fill ' + (ca > tvaMajore ? 'is-danger' : ca > tvaBase ? 'is-warn' : '');
      document.getElementById('tv-gauge-tva-marker').style.left = `${tvaMarkerPos.toFixed(1)}%`;
      document.getElementById('tv-gauge-tva-pct').textContent = `${CB.formatEUR(ca, 0)} / ${CB.formatEUR(tvaMajore, 0)}`;
      document.getElementById('tv-gauge-tva-legend-mid').textContent = `Base : ${CB.formatEUR(tvaBase, 0)}`;
      document.getElementById('tv-gauge-tva-legend-max').textContent = `Majoré : ${CB.formatEUR(tvaMajore, 0)}`;

      // Jauge Micro
      const microPct = Math.min(100, (ca / Math.max(1, microLimit)) * 100);
      const microFill = document.getElementById('tv-gauge-micro-fill');
      microFill.style.width = `${microPct.toFixed(1)}%`;
      microFill.className = 'gauge-fill ' + (ca > microLimit ? 'is-danger' : microPct > 85 ? 'is-warn' : '');
      document.getElementById('tv-gauge-micro-pct').textContent = `${CB.formatEUR(ca, 0)} / ${CB.formatEUR(microLimit, 0)} (${microPct.toFixed(1)} %)`;
      document.getElementById('tv-gauge-micro-legend-max').textContent = `Plafond : ${CB.formatEUR(microLimit, 0)}`;

      // Simulateur d'impact tarifaire au passage à la TVA
      const prixActuel = Math.max(0, parseFloat(tjmInput.value) || 0);
      const rate = (parseFloat(vatRateSelect.value) || 20) / 100;
      const clientType = clientTypeSelect.value;
      const achatsTTC = Math.max(0, parseFloat(achatsInput.value) || 0);
      const tvaDeductible = achatsTTC - (achatsTTC / (1 + rate));

      let nouveauHT = prixActuel;
      let nouveauTTC = prixActuel * (1 + rate);
      let impactUnitaire = 0;
      let comment = '';

      if (clientType === 'b2b') {
        nouveauHT = prixActuel;
        nouveauTTC = prixActuel * (1 + rate);
        impactUnitaire = 0;
        comment = `En B2B, vos clients assujettis récupèrent la TVA : vous ajoutez +${Math.round(rate * 100)} % sur votre facture sans perdre de marge, et vous récupérez ${CB.formatEUR(tvaDeductible, 0)}/an de TVA sur vos achats professionnels !`;
      } else {
        // B2C : si on garde le même prix TTC affiché au client
        nouveauTTC = prixActuel;
        nouveauHT = prixActuel / (1 + rate);
        impactUnitaire = nouveauHT - prixActuel;
        comment = `En B2C, si vous maintenez votre tarif TTC inchangé à ${CB.formatEUR(nouveauTTC)} pour rester compétitif, votre revenu HT baisse de ${CB.formatEUR(Math.abs(impactUnitaire))} par unité (${CB.formatPct((impactUnitaire / Math.max(1, prixActuel)) * 100, 1)}), partiellement compensé par ${CB.formatEUR(tvaDeductible, 0)}/an de TVA récupérable sur vos achats.`;
      }

      document.getElementById('tv-sim-ht').textContent = CB.formatEUR(nouveauHT);
      document.getElementById('tv-sim-ttc').textContent = CB.formatEUR(nouveauTTC);
      document.getElementById('tv-sim-deduct').textContent = `+ ${CB.formatEUR(tvaDeductible, 0)} / an`;
      document.getElementById('tv-sim-comment').textContent = comment;
    }

    actSelect.addEventListener('change', () => {
      const cfg = THRESHOLDS[actSelect.value];
      caRange.max = String(cfg.microMax);
      update();
    });

    caActuelInput.addEventListener('input', () => {
      caRange.value = Math.min(Number(caRange.max), Math.max(0, Number(caActuelInput.value) || 0));
      update();
    });

    caRange.addEventListener('input', () => {
      caActuelInput.value = caRange.value;
      update();
    });

    [firstYearToggle, startDateInput, tjmInput, clientTypeSelect, vatRateSelect, achatsInput].forEach((el) => {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });

    update();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
