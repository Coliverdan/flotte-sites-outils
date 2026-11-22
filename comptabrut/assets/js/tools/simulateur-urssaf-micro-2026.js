/* ==========================================================================
   COMPTABRUT.FR — Outil 02 : Simulateur URSSAF, ACRE & Impôt Micro 2026
   Barèmes officiels 2026 | Calcul 100 % local + Graphique Canvas HD
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  // Barèmes officiels 2026 (Micro-entrepreneur France)
  const ACTIVITIES = {
    bnc_ssi: {
      label: 'Prestations de services BNC (SSI)',
      urssaf: 0.261,   // Hausse progressive 2024 (23.1%) -> 2025 (24.6%) -> 2026 (26.1%)
      cfp: 0.002,
      vfl: 0.022,
      abattement: 0.34,
      plafond: 77700
    },
    bic_service: {
      label: 'Prestations de services commerciales / artisanales (BIC)',
      urssaf: 0.212,
      cfp: 0.003,
      vfl: 0.017,
      abattement: 0.50,
      plafond: 77700
    },
    bic_vente: {
      label: 'Achat-revente de marchandises / Hébergement (BIC)',
      urssaf: 0.123,
      cfp: 0.001,
      vfl: 0.010,
      abattement: 0.71,
      plafond: 188700
    },
    cipav: {
      label: 'Profession libérale réglementée (CIPAV)',
      urssaf: 0.232,
      cfp: 0.002,
      vfl: 0.022,
      abattement: 0.34,
      plafond: 77700
    }
  };

  // Tranches barème progressif IR (revenus 2025/2026 par part)
  const IR_BRACKETS = [
    { limit: 11497, rate: 0.00 },
    { limit: 29315, rate: 0.11 },
    { limit: 83823, rate: 0.30 },
    { limit: 180294, rate: 0.41 },
    { limit: Infinity, rate: 0.45 }
  ];

  function computeIRBareme(taxableIncome, parts) {
    if (taxableIncome <= 0) return 0;
    const quotient = taxableIncome / Math.max(parts, 1);
    let taxPerPart = 0;
    let prev = 0;
    for (const b of IR_BRACKETS) {
      if (quotient > prev) {
        const slice = Math.min(quotient, b.limit) - prev;
        taxPerPart += slice * b.rate;
        prev = b.limit;
      } else {
        break;
      }
    }
    return Math.max(0, taxPerPart * Math.max(parts, 1));
  }

  function drawChart(canvas, data) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = 280;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Fond blanc pur
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const items = [
      { label: 'Net en poche', value: Math.max(0, data.netAnnuel), color: '#047857' },
      { label: 'URSSAF + CFP', value: data.urssafAnnuel + data.cfpAnnuel, color: '#0B0D0E' },
      { label: 'Impôt revenu', value: data.irAnnuel, color: '#4E5660' },
      { label: 'CFE + Frais pro', value: data.cfeAnnuel + data.fraisAnnuel, color: '#B45309' }
    ];

    const total = Math.max(1, data.caAnnuel);
    const padX = 16;
    const barY = 36;
    const barH = 44;
    const barW = width - padX * 2;

    // Titre interne
    ctx.fillStyle = '#4E5660';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`RÉPARTITION DE ${CB.formatEUR(data.caAnnuel, 0)} DE CA ANNUEL`, padX, 22);

    // Barre empilée
    let cursorX = padX;
    items.forEach((it) => {
      const segW = (it.value / total) * barW;
      if (segW > 0.5) {
        ctx.fillStyle = it.color;
        ctx.fillRect(cursorX, barY, segW, barH);
        cursorX += segW;
      }
    });

    // Contour net
    ctx.strokeStyle = '#E2E5E9';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, barY, barW, barH);

    // Barres horizontales détaillées en dessous
    let rowY = 112;
    const rowH = 38;
    const labelW = 140;
    const valW = 110;
    const trackW = Math.max(80, width - padX * 2 - labelW - valW);

    items.forEach((it) => {
      const pct = (it.value / total) * 100;
      // Pastille couleur
      ctx.fillStyle = it.color;
      ctx.fillRect(padX, rowY + 4, 10, 10);

      // Libellé
      ctx.fillStyle = '#0B0D0E';
      ctx.font = '600 13px "Source Sans 3", sans-serif';
      ctx.fillText(it.label, padX + 18, rowY + 13);

      // Piste
      ctx.fillStyle = '#F1F3F5';
      ctx.fillRect(padX + labelW, rowY + 3, trackW, 12);

      // Remplissage
      ctx.fillStyle = it.color;
      ctx.fillRect(padX + labelW, rowY + 3, Math.min(trackW, (it.value / total) * trackW), 12);

      // Valeur alignée à droite
      ctx.fillStyle = '#0B0D0E';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${CB.formatEUR(it.value, 0)} (${pct.toFixed(1)}%)`, width - padX, rowY + 13);
      ctx.textAlign = 'left';

      rowY += rowH;
    });
  }

  function init() {
    const modeBtns = document.querySelectorAll('[data-period-mode]');
    const caInput = document.getElementById('ur-ca');
    const caRange = document.getElementById('ur-ca-range');
    const caLabel = document.getElementById('ur-ca-label');
    const activitySelect = document.getElementById('ur-activity');
    const acreToggle = document.getElementById('ur-acre');
    const taxBtns = document.querySelectorAll('[data-tax-mode]');
    const partsSelect = document.getElementById('ur-parts');
    const baremeExtras = document.getElementById('ur-bareme-extras');
    const otherIncomeInput = document.getElementById('ur-other-income');
    const cfeInput = document.getElementById('ur-cfe');
    const fraisInput = document.getElementById('ur-frais');
    const canvas = document.getElementById('ur-chart');
    const exportBtn = document.getElementById('ur-export-png');

    if (!caInput || !activitySelect) return;

    let periodMode = 'mensuel';
    let taxMode = 'vfl';

    function calculate() {
      const rawCA = Math.max(0, parseFloat(caInput.value) || 0);
      const caAnnuel = periodMode === 'mensuel' ? rawCA * 12 : rawCA;
      const caMensuel = caAnnuel / 12;

      const act = ACTIVITIES[activitySelect.value] || ACTIVITIES.bnc_ssi;
      const hasAcre = acreToggle.checked;

      const urssafRate = hasAcre ? act.urssaf * 0.5 : act.urssaf;
      const urssafAnnuel = caAnnuel * urssafRate;
      const cfpAnnuel = caAnnuel * act.cfp;

      // Calcul Impôt VFL vs Barème
      const irVflAnnuel = caAnnuel * act.vfl;

      const parts = parseFloat(partsSelect.value) || 1;
      const otherIncome = Math.max(0, parseFloat(otherIncomeInput.value) || 0);
      const abattementMontant = Math.max(305, caAnnuel * act.abattement);
      const revenuMicroImposable = Math.max(0, caAnnuel - abattementMontant);
      const irWithMicro = computeIRBareme(otherIncome + revenuMicroImposable, parts);
      const irWithoutMicro = computeIRBareme(otherIncome, parts);
      const irBaremeAnnuel = Math.max(0, irWithMicro - irWithoutMicro);

      const irAnnuel = taxMode === 'vfl' ? irVflAnnuel : irBaremeAnnuel;

      const cfeAnnuel = Math.max(0, parseFloat(cfeInput.value) || 0);
      const fraisMensuel = Math.max(0, parseFloat(fraisInput.value) || 0);
      const fraisAnnuel = fraisMensuel * 12;

      const totalChargesAnnuel = urssafAnnuel + cfpAnnuel + irAnnuel + cfeAnnuel + fraisAnnuel;
      const netAnnuel = caAnnuel - totalChargesAnnuel;
      const netMensuel = netAnnuel / 12;
      const tauxPrelevement = caAnnuel > 0 ? ((urssafAnnuel + cfpAnnuel + irAnnuel + cfeAnnuel) / caAnnuel) * 100 : 0;

      // Mise à jour KPI
      document.getElementById('ur-net-mensuel').textContent = CB.formatEUR(netMensuel, 0);
      document.getElementById('ur-net-annuel').textContent = `${CB.formatEUR(netAnnuel, 0)} / an net en poche`;

      document.getElementById('ur-charges-mensuel').textContent = CB.formatEUR((urssafAnnuel + cfpAnnuel) / 12, 0);
      document.getElementById('ur-charges-sub').textContent = `${CB.formatPct((urssafRate + act.cfp) * 100, 2)} (${hasAcre ? 'ACRE -50 % incl.' : 'taux plein 2026'})`;

      document.getElementById('ur-ir-mensuel').textContent = CB.formatEUR(irAnnuel / 12, 0);
      document.getElementById('ur-ir-sub').textContent = taxMode === 'vfl'
        ? `Versement libératoire (${CB.formatPct(act.vfl * 100, 1)})`
        : `Barème progressif (abattement ${Math.round(act.abattement * 100)} %)`;

      // Alerte plafond micro
      const alertBox = document.getElementById('ur-plafond-alert');
      if (caAnnuel > act.plafond) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `<strong>Attention plafond micro-entreprise dépassé :</strong> votre CA annuel projeté (${CB.formatEUR(caAnnuel, 0)}) dépasse le plafond de ${CB.formatEUR(act.plafond, 0)} pour cette activité. En cas de dépassement 2 années consécutives, vous basculez au régime réel.`;
      } else {
        alertBox.style.display = 'none';
      }

      // Tableau détaillé
      document.getElementById('ur-detail-tbody').innerHTML = `
        <tr><td>Chiffre d’affaires brut encaissé</td><td class="num">${CB.formatEUR(caMensuel)}</td><td class="num"><strong>${CB.formatEUR(caAnnuel)}</strong></td><td class="num">100,0 %</td></tr>
        <tr><td>Cotisations sociales URSSAF (${CB.formatPct(urssafRate * 100, 2)})</td><td class="num">- ${CB.formatEUR(urssafAnnuel / 12)}</td><td class="num">- ${CB.formatEUR(urssafAnnuel)}</td><td class="num">${CB.formatPct(urssafRate * 100, 1)}</td></tr>
        <tr><td>Formation professionnelle CFP (${CB.formatPct(act.cfp * 100, 1)})</td><td class="num">- ${CB.formatEUR(cfpAnnuel / 12)}</td><td class="num">- ${CB.formatEUR(cfpAnnuel)}</td><td class="num">${CB.formatPct(act.cfp * 100, 1)}</td></tr>
        <tr><td>Impôt sur le revenu (${taxMode === 'vfl' ? 'Versement Libératoire' : 'Barème progressif'})</td><td class="num">- ${CB.formatEUR(irAnnuel / 12)}</td><td class="num">- ${CB.formatEUR(irAnnuel)}</td><td class="num">${caAnnuel > 0 ? CB.formatPct((irAnnuel / caAnnuel) * 100, 1) : '0,0 %'}</td></tr>
        <tr><td>Cotisation Foncière des Entreprises (CFE)</td><td class="num">- ${CB.formatEUR(cfeAnnuel / 12)}</td><td class="num">- ${CB.formatEUR(cfeAnnuel)}</td><td class="num">${caAnnuel > 0 ? CB.formatPct((cfeAnnuel / caAnnuel) * 100, 1) : '0,0 %'}</td></tr>
        <tr><td>Frais professionnels réels (non déductibles)</td><td class="num">- ${CB.formatEUR(fraisMensuel)}</td><td class="num">- ${CB.formatEUR(fraisAnnuel)}</td><td class="num">${caAnnuel > 0 ? CB.formatPct((fraisAnnuel / caAnnuel) * 100, 1) : '0,0 %'}</td></tr>
        <tr style="background:#ECFDF5;"><td><strong>Revenu net disponible dans la poche</strong></td><td class="num"><strong style="color:#047857;">${CB.formatEUR(netMensuel)}</strong></td><td class="num"><strong style="color:#047857;">${CB.formatEUR(netAnnuel)}</strong></td><td class="num"><strong style="color:#047857;">${caAnnuel > 0 ? CB.formatPct((netAnnuel / caAnnuel) * 100, 1) : '0,0 %'}</strong></td></tr>
      `;

      // Comparatif VFL vs Barème
      const diff = irBaremeAnnuel - irVflAnnuel;
      const cmpEl = document.getElementById('ur-tax-compare');
      if (Math.abs(diff) < 10) {
        cmpEl.innerHTML = `<strong>Match nul fiscal :</strong> Versement libératoire (${CB.formatEUR(irVflAnnuel, 0)}/an) et Barème progressif (${CB.formatEUR(irBaremeAnnuel, 0)}/an) sont quasi équivalents sur votre profil. Taux global obligatoire : <strong>${CB.formatPct(tauxPrelevement, 1)}</strong>.`;
      } else if (diff > 0) {
        cmpEl.innerHTML = `<strong>Avantage Versement Libératoire :</strong> vous économisez environ <strong>${CB.formatEUR(diff, 0)} / an</strong> par rapport au barème progressif (${CB.formatEUR(irVflAnnuel, 0)} vs ${CB.formatEUR(irBaremeAnnuel, 0)}), sous réserve de respecter le plafond RFR N-2 (28 797 € / part).`;
      } else {
        cmpEl.innerHTML = `<strong>Avantage Barème Progressif :</strong> le barème classique vous fait économiser environ <strong>${CB.formatEUR(Math.abs(diff), 0)} / an</strong> par rapport au versement libératoire (${CB.formatEUR(irBaremeAnnuel, 0)} vs ${CB.formatEUR(irVflAnnuel, 0)}).`;
      }

      drawChart(canvas, { caAnnuel, netAnnuel, urssafAnnuel, cfpAnnuel, irAnnuel, cfeAnnuel, fraisAnnuel });
    }

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.getAttribute('data-period-mode');
        if (nextMode === periodMode) return;
        const currentVal = parseFloat(caInput.value) || 0;
        periodMode = nextMode;
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));

        if (periodMode === 'annuel') {
          caLabel.textContent = 'Chiffre d’affaires annuel encaissé (€)';
          caRange.max = '190000';
          caRange.step = '500';
          const converted = Math.round(currentVal * 12);
          caInput.value = converted;
          caRange.value = Math.min(190000, converted);
        } else {
          caLabel.textContent = 'Chiffre d’affaires mensuel encaissé (€)';
          caRange.max = '15000';
          caRange.step = '100';
          const converted = Math.round(currentVal / 12);
          caInput.value = converted;
          caRange.value = Math.min(15000, converted);
        }
        calculate();
      });
    });

    taxBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        taxMode = btn.getAttribute('data-tax-mode');
        taxBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        baremeExtras.style.display = taxMode === 'bareme' ? 'block' : 'none';
        calculate();
      });
    });

    caInput.addEventListener('input', () => {
      caRange.value = Math.min(Number(caRange.max), Math.max(0, Number(caInput.value) || 0));
      calculate();
    });

    caRange.addEventListener('input', () => {
      caInput.value = caRange.value;
      calculate();
    });

    [activitySelect, acreToggle, partsSelect, otherIncomeInput, cfeInput, fraisInput].forEach((el) => {
      el.addEventListener('input', calculate);
      el.addEventListener('change', calculate);
    });

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        CB.exportCanvasPNG(canvas, 'comptabrut-simulation-urssaf-2026.png');
      });
    }

    window.addEventListener('resize', calculate);
    calculate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
