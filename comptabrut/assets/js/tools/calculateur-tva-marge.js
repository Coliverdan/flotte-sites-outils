/* ==========================================================================
   COMPTABRUT.FR — Outil 05 : Calculateur HT / TTC / TVA & Marge vs Marque
   Bidirectionnel instantané + Module commercial complet + Graphique Canvas
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  function drawMarginChart(canvas, paHT, margeBrute, tvaVal) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const pvTTC = Math.max(0.01, paHT + Math.max(0, margeBrute) + Math.max(0, tvaVal));
    const padX = 16;
    const barW = width - padX * 2;
    const barY = 38;
    const barH = 40;

    ctx.fillStyle = '#4E5660';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`DÉCOMPOSITION DU PRIX DE VENTE TTC (${CB.formatEUR(paHT + margeBrute + tvaVal)})`, padX, 22);

    const segments = [
      { label: 'Coût d’achat HT', val: Math.max(0, paHT), color: '#0B0D0E' },
      { label: 'Marge brute HT', val: Math.max(0, margeBrute), color: '#047857' },
      { label: 'TVA collectée', val: Math.max(0, tvaVal), color: '#9CA3AF' }
    ];

    let x = padX;
    segments.forEach((seg) => {
      const w = (seg.val / pvTTC) * barW;
      if (w > 0.5) {
        ctx.fillStyle = seg.color;
        ctx.fillRect(x, barY, w, barH);
        x += w;
      }
    });

    ctx.strokeStyle = '#E2E5E9';
    ctx.strokeRect(padX, barY, barW, barH);

    // Légendes en lignes
    let y = 110;
    segments.forEach((seg) => {
      const pct = (seg.val / pvTTC) * 100;
      ctx.fillStyle = seg.color;
      ctx.fillRect(padX, y, 12, 12);
      ctx.fillStyle = '#0B0D0E';
      ctx.font = '600 13px "Source Sans 3", sans-serif';
      ctx.fillText(seg.label, padX + 20, y + 10);
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${CB.formatEUR(seg.val)} (${pct.toFixed(1)} %)`, width - padX, y + 10);
      ctx.textAlign = 'left';
      y += 32;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const htInput = document.getElementById('tm-ht');
    const ttcInput = document.getElementById('tm-ttc');
    const tvaInput = document.getElementById('tm-tva');
    const customRateInput = document.getElementById('tm-custom-rate');
    const rateBtns = document.querySelectorAll('[data-vat-rate]');
    const multiTbody = document.getElementById('tm-multi-tbody');

    // Module marge
    const paInput = document.getElementById('mg-pa');
    const pvInput = document.getElementById('mg-pv');
    const mgVatSelect = document.getElementById('mg-vat');
    const targetMarqueInput = document.getElementById('mg-target-marque');
    const applyTargetBtn = document.getElementById('mg-apply-target');
    const chartCanvas = document.getElementById('mg-chart');
    const exportBtn = document.getElementById('mg-export-png');

    if (!htInput || !ttcInput) return;

    let currentRate = 20;
    let lastEdited = 'ht';

    function renderMultiTable(htVal) {
      const rates = [20, 10, 5.5, 2.1];
      multiTbody.innerHTML = rates.map((r) => {
        const tva = htVal * (r / 100);
        const ttc = htVal + tva;
        return `
          <tr ${Math.abs(r - currentRate) < 0.01 ? 'style="background:#ECFDF5;"' : ''}>
            <td><strong>TVA ${r} %</strong></td>
            <td class="num">${CB.formatEUR(htVal)}</td>
            <td class="num">${CB.formatEUR(tva)}</td>
            <td class="num"><strong>${CB.formatEUR(ttc)}</strong></td>
          </tr>
        `;
      }).join('');
    }

    function recalcTVA(source) {
      lastEdited = source;
      const r = Math.max(0, currentRate) / 100;
      let ht = parseFloat(htInput.value) || 0;
      let ttc = parseFloat(ttcInput.value) || 0;
      let tva = parseFloat(tvaInput.value) || 0;

      if (source === 'ht') {
        tva = ht * r;
        ttc = ht + tva;
        tvaInput.value = tva.toFixed(2);
        ttcInput.value = ttc.toFixed(2);
      } else if (source === 'ttc') {
        ht = r > 0 ? ttc / (1 + r) : ttc;
        tva = ttc - ht;
        htInput.value = ht.toFixed(2);
        tvaInput.value = tva.toFixed(2);
      } else if (source === 'tva') {
        ht = r > 0 ? tva / r : 0;
        ttc = ht + tva;
        htInput.value = ht.toFixed(2);
        ttcInput.value = ttc.toFixed(2);
      }

      document.getElementById('tm-kpi-ht').textContent = CB.formatEUR(ht);
      document.getElementById('tm-kpi-tva').textContent = CB.formatEUR(tva);
      document.getElementById('tm-kpi-ttc').textContent = CB.formatEUR(ttc);
      document.getElementById('tm-kpi-rate').textContent = `Taux appliqué : ${CB.formatPct(currentRate, 2)}`;

      renderMultiTable(ht);
    }

    rateBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        currentRate = parseFloat(btn.getAttribute('data-vat-rate')) || 0;
        customRateInput.value = currentRate;
        rateBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        recalcTVA(lastEdited === 'tva' ? 'ht' : lastEdited);
      });
    });

    customRateInput.addEventListener('input', () => {
      currentRate = Math.max(0, parseFloat(customRateInput.value) || 0);
      rateBtns.forEach((b) => b.classList.toggle('is-active', Math.abs(parseFloat(b.getAttribute('data-vat-rate')) - currentRate) < 0.01));
      recalcTVA(lastEdited === 'tva' ? 'ht' : lastEdited);
    });

    htInput.addEventListener('input', () => recalcTVA('ht'));
    ttcInput.addEventListener('input', () => recalcTVA('ttc'));
    tvaInput.addEventListener('input', () => recalcTVA('tva'));

    document.getElementById('tm-copy-summary').addEventListener('click', () => {
      const txt = `HT : ${document.getElementById('tm-kpi-ht').textContent} | TVA (${currentRate} %) : ${document.getElementById('tm-kpi-tva').textContent} | TTC : ${document.getElementById('tm-kpi-ttc').textContent}`;
      CB.copyText(txt, 'Calcul HT/TVA/TTC copié');
    });

    // Module Marge commerciale
    function recalcMargin() {
      const pa = Math.max(0, parseFloat(paInput.value) || 0);
      const pv = Math.max(0, parseFloat(pvInput.value) || 0);
      const vatRate = (parseFloat(mgVatSelect.value) || 20) / 100;

      const marge = pv - pa;
      const tauxMarge = pa > 0 ? (marge / pa) * 100 : 0;
      const tauxMarque = pv > 0 ? (marge / pv) * 100 : 0;
      const pvTTC = pv * (1 + vatRate);
      const tvaVal = pvTTC - pv;
      const coeffTTC = pa > 0 ? pvTTC / pa : 0;
      const coeffHT = pa > 0 ? pv / pa : 0;

      const margeBox = document.getElementById('mg-kpi-marge-box');
      margeBox.className = 'kpi-box ' + (marge < 0 ? 'kpi-danger' : 'kpi-accent');
      document.getElementById('mg-kpi-marge').textContent = CB.formatEUR(marge);
      document.getElementById('mg-kpi-marge-sub').textContent = marge < 0 ? 'Vente à perte !' : `PV TTC : ${CB.formatEUR(pvTTC)}`;

      document.getElementById('mg-kpi-taux-marge').textContent = CB.formatPct(tauxMarge, 2);
      document.getElementById('mg-kpi-taux-marque').textContent = CB.formatPct(tauxMarque, 2);
      document.getElementById('mg-kpi-coeff').textContent = `× ${CB.formatNumber(coeffTTC, 3)}`;
      document.getElementById('mg-kpi-coeff-sub').textContent = `Coeff HT : × ${CB.formatNumber(coeffHT, 3)}`;

      drawMarginChart(chartCanvas, pa, marge, tvaVal);
    }

    [paInput, pvInput, mgVatSelect].forEach((el) => {
      el.addEventListener('input', recalcMargin);
      el.addEventListener('change', recalcMargin);
    });

    applyTargetBtn.addEventListener('click', () => {
      const pa = Math.max(0, parseFloat(paInput.value) || 0);
      const target = Math.min(95, Math.max(1, parseFloat(targetMarqueInput.value) || 35));
      const pvNeeded = pa / (1 - target / 100);
      pvInput.value = pvNeeded.toFixed(2);
      recalcMargin();
      CB.toast(`Prix de vente HT ajusté pour ${target} % de taux de marque`);
    });

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        CB.exportCanvasPNG(chartCanvas, 'comptabrut-marge-commerciale.png');
      });
    }

    window.addEventListener('resize', recalcMargin);
    recalcTVA('ht');
    recalcMargin();
  });
})();
