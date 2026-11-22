/* ==========================================================================
   Outil 04 — Vérificateur Express d'Aliments Toxiques (64 Aliments)
   + Calculateur d'Urgence Chocolat (Dose de Théobromine en mg/kg)
   ========================================================================== */
(function () {
  'use strict';

  function normalizeText(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/œ/g, 'oe');
  }

  document.addEventListener('DOMContentLoaded', function () {
    const foods = window.PATTES_FOODS || [];
    const UI = window.PattesUI;
    if (!foods.length || !UI) return;

    /* --- Partie 1 : Moteur de recherche Aliments --- */
    const elSearch = document.getElementById('food-search');
    const elCatSelect = document.getElementById('food-category');
    const statusBtns = document.querySelectorAll('[data-food-status]');
    const elResultsGrid = document.getElementById('food-results');
    const elCount = document.getElementById('food-count');

    let currentStatus = 'tous';

    const STATUS_META = {
      mortel: { label: 'Mortel / Urgence', badge: 'badge-fatal' },
      toxique: { label: 'Toxique', badge: 'badge-danger' },
      prudence: { label: 'Prudence', badge: 'badge-caution' },
      sur: { label: 'Sûr', badge: 'badge-safe' }
    };

    function renderFoodList() {
      const q = normalizeText(elSearch.value.trim());
      const cat = elCatSelect.value;

      const filtered = foods.filter(function (f) {
        const matchStatus = currentStatus === 'tous' || f.status === currentStatus;
        const matchCat = cat === 'toutes' || f.category === cat;
        const haystack = normalizeText(f.name + ' ' + f.category + ' ' + f.toxicCompound + ' ' + f.advice);
        const matchQuery = !q || haystack.indexOf(q) !== -1;
        return matchStatus && matchCat && matchQuery;
      });

      elCount.textContent = filtered.length + ' aliment' + (filtered.length > 1 ? 's' : '') + ' affiché' + (filtered.length > 1 ? 's' : '') + ' sur ' + foods.length;

      if (!filtered.length) {
        elResultsGrid.innerHTML =
          '<div class="callout" style="grid-column:1 / -1;">' +
          '<div class="callout-title">Aucun aliment trouvé</div>' +
          '<p style="margin:0;">Essayez un mot plus simple (ex. « raisin », « chocolat », « pomme », « fromage ») ou réinitialisez les filtres. En cas de doute après ingestion, appelez le CNITV (04 78 87 10 40).</p>' +
          '</div>';
        return;
      }

      elResultsGrid.innerHTML = filtered.map(function (f) {
        const meta = STATUS_META[f.status] || STATUS_META.prudence;
        const targets = (f.dog && f.cat) ? 'Chien & Chat' : (f.dog ? 'Chien' : 'Chat');
        return '<article class="food-card" data-status="' + f.status + '">' +
          '<div class="food-card-head">' +
          '<h3 class="food-card-name">' + f.name + '</h3>' +
          '<span class="badge ' + meta.badge + '">' + meta.label + '</span>' +
          '</div>' +
          '<div class="food-meta">' +
          '<span>' + f.category + '</span>' +
          '<span>·</span>' +
          '<span>' + targets + '</span>' +
          '</div>' +
          '<p style="font-size:0.9rem;margin:0;"><strong>Composé :</strong> ' + f.toxicCompound + '</p>' +
          '<p style="font-size:0.9rem;color:var(--text-secondary);margin:0;"><strong>Effets :</strong> ' + f.symptoms + '</p>' +
          '<p style="font-size:0.9rem;margin:4px 0 0;padding-top:8px;border-top:1px solid var(--border);">' + f.advice + '</p>' +
          '</article>';
      }).join('');
    }

    statusBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        statusBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        currentStatus = btn.getAttribute('data-food-status') || 'tous';
        renderFoodList();
      });
    });

    elSearch.addEventListener('input', renderFoodList);
    elCatSelect.addEventListener('change', renderFoodList);
    renderFoodList();

    /* --- Partie 2 : Calculateur d'Urgence Chocolat (Théobromine) --- */
    const elDogWeight = document.getElementById('choc-dog-weight');
    const elGrams = document.getElementById('choc-grams');
    const elChocType = document.getElementById('choc-type');

    const outDoseMgKg = document.getElementById('out-choc-mgkg');
    const outTotalMg = document.getElementById('out-choc-total');
    const outRiskBox = document.getElementById('out-choc-risk-box');
    const outRiskTitle = document.getElementById('out-choc-risk-title');
    const outRiskAction = document.getElementById('out-choc-risk-action');
    const gaugeCanvas = document.getElementById('choc-gauge');

    /* Concentration moyenne en théobromine (mg par gramme de produit) — Sources Merck Vet / CNITV */
    const CHOC_CONC = {
      cacao: { label: 'Cacao en poudre non sucré', mgPerG: 26.0 },
      noir85: { label: 'Chocolat noir 80–90 %', mgPerG: 16.0 },
      noir70: { label: 'Chocolat noir pâtissier 70 %', mgPerG: 13.5 },
      noir50: { label: 'Chocolat noir 50–55 %', mgPerG: 8.0 },
      lait: { label: 'Chocolat au lait', mgPerG: 2.1 },
      pate: { label: 'Pâte à tartiner chocolat-noisette', mgPerG: 1.4 },
      blanc: { label: 'Chocolat blanc', mgPerG: 0.05 }
    };

    function drawGauge(mgPerKg) {
      if (!gaugeCanvas) return;
      const W = 560;
      const H = 92;
      const ctx = UI.setupCanvas(gaugeCanvas, W, H);

      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      const pad = 16;
      const barW = W - pad * 2;
      const barY = 34;
      const barH = 22;
      const maxScale = 80;

      /* 4 zones fixes : 0-20 Sûr/Faible, 20-40 Modéré, 40-60 Sévère, 60-80+ Mortel */
      const zones = [
        { from: 0, to: 20, color: '#1E6B45', label: '0–20' },
        { from: 20, to: 40, color: '#9A5B13', label: '20–40' },
        { from: 40, to: 60, color: '#B91C1C', label: '40–60' },
        { from: 60, to: 80, color: '#7F1D1D', label: '60+ mg/kg' }
      ];

      zones.forEach(function (z) {
        const x0 = pad + (z.from / maxScale) * barW;
        const zw = ((z.to - z.from) / maxScale) * barW;
        ctx.fillStyle = z.color;
        ctx.fillRect(x0, barY, zw - 2, barH);

        ctx.fillStyle = '#63564B';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(z.label, x0 + zw / 2, barY + barH + 18);
      });

      /* Marqueur position actuelle */
      const clamped = Math.min(maxScale, Math.max(0, mgPerKg));
      const mx = pad + (clamped / maxScale) * barW;

      ctx.fillStyle = '#231B15';
      ctx.beginPath();
      ctx.moveTo(mx, barY - 2);
      ctx.lineTo(mx - 8, barY - 14);
      ctx.lineTo(mx + 8, barY - 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#231B15';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = mx > W - 90 ? 'right' : (mx < 90 ? 'left' : 'center');
      ctx.fillText(UI.formatDecimal(mgPerKg, 1) + ' mg/kg', mx, 14);
    }

    function renderChocolate() {
      const weight = Math.max(1, Number(elDogWeight.value) || 10);
      const grams = Math.max(0, Number(elGrams.value) || 0);
      const choc = CHOC_CONC[elChocType.value] || CHOC_CONC.noir70;

      const totalMg = grams * choc.mgPerG;
      const mgPerKg = totalMg / weight;

      outDoseMgKg.textContent = UI.formatDecimal(mgPerKg, 1) + ' mg/kg';
      outTotalMg.textContent = 'Total ingéré : ' + UI.formatInt(totalMg) + ' mg de théobromine (' + choc.label + ')';

      if (mgPerKg < 15) {
        outRiskBox.className = 'callout callout-safe';
        outRiskTitle.textContent = 'Risque toxique faible (< 20 mg/kg)';
        outRiskAction.textContent = 'En dessous de 20 mg/kg, une intoxication sévère est improbable. Surveillez tout de même les selles et le comportement pendant 24 h (le gras du chocolat peut provoquer une légère diarrhée).';
      } else if (mgPerKg < 20) {
        outRiskBox.className = 'callout callout-caution';
        outRiskTitle.textContent = 'Seuil limite (15–20 mg/kg) — Surveillance étroite';
        outRiskAction.textContent = 'Des vomissements ou une légère agitation peuvent apparaître chez les chiens sensibles. Appelez votre vétérinaire par précaution pour confirmer la conduite à tenir.';
      } else if (mgPerKg < 40) {
        outRiskBox.className = 'callout callout-caution';
        outRiskTitle.textContent = 'Risque modéré (20–40 mg/kg) — Appelez un vétérinaire';
        outRiskAction.textContent = 'Troubles digestifs probables (vomissements, diarrhée, agitation, soif accrue). Contactez votre clinique vétérinaire ou le CNITV (04 78 87 10 40) sans attendre : un vomissement provoqué dans les 2 h limite l’absorption.';
      } else if (mgPerKg < 60) {
        outRiskBox.className = 'callout callout-danger';
        outRiskTitle.textContent = 'Risque élevé (40–60 mg/kg) — Consultation vétérinaire urgente';
        outRiskAction.textContent = 'Danger de toxicité cardiaque (tachycardie, arythmie) et neurologique (tremblements). Rendez-vous en urgence chez un vétérinaire avec l’emballage du chocolat.';
      } else {
        outRiskBox.className = 'callout callout-danger';
        outRiskTitle.textContent = 'URGENCE VITALE (≥ 60 mg/kg) — Clinique de garde immédiate';
        outRiskAction.textContent = 'Dose potentiellement mortelle (convulsions, troubles cardiaques graves). Ne tentez pas de remèdes maison (pas de lait, pas de sel) : partez immédiatement aux urgences vétérinaires.';
      }

      drawGauge(mgPerKg);
    }

    [elDogWeight, elGrams, elChocType].forEach(function (el) {
      el.addEventListener('input', renderChocolate);
      el.addEventListener('change', renderChocolate);
    });

    renderChocolate();
  });
})();
