/* ==========================================================================
   Outil 01 — Simulateur Budget Annuel & Vie Entière par Race (42 Races)
   Calculs réels + Graphique Canvas + Export viral Fiche Budget PNG (1200x675)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const breeds = window.PATTES_BREEDS || [];
    const UI = window.PattesUI;
    if (!breeds.length || !UI) return;

    const elSpeciesBtns = document.querySelectorAll('[data-species-filter]');
    const elSearch = document.getElementById('breed-search');
    const elSelect = document.getElementById('breed-select');
    const elFoodTier = document.getElementById('food-tier');
    const elInsurance = document.getElementById('insurance-tier');
    const elGrooming = document.getElementById('grooming-freq');
    const elBoarding = document.getElementById('boarding-days');
    const elBoardingVal = document.getElementById('boarding-days-val');
    const elAdoptionMode = document.getElementById('adoption-mode');
    const elExportBtn = document.getElementById('export-budget-png');

    /* Sorties */
    const outBreedName = document.getElementById('out-breed-name');
    const outBreedSpecs = document.getElementById('out-breed-specs');
    const outBreedNote = document.getElementById('out-breed-note');
    const outRiskBadge = document.getElementById('out-risk-badge');
    const outMonthly = document.getElementById('out-monthly');
    const outAnnual = document.getElementById('out-annual');
    const outLifetime = document.getElementById('out-lifetime');
    const outLifetimeYears = document.getElementById('out-lifetime-years');
    const outFirstYear = document.getElementById('out-first-year');
    const outBreakdownBody = document.getElementById('out-breakdown-body');
    const chartCanvas = document.getElementById('budget-chart');

    let currentSpecies = 'tous';
    let lastResult = null;

    const FOOD_MULT = {
      standard: { label: 'Standard', mult: 1.0 },
      premium: { label: 'Premium vétérinaire', mult: 1.38 },
      sans_cereales: { label: 'Sans céréales haute protéine', mult: 1.62 },
      barf: { label: 'BARF / Ration ménagère', mult: 2.15 }
    };

    const GROOMING_MULT = {
      maison: 0.25,
      faible: 0.75,
      regulier: 1.25,
      intensif: 1.85
    };

    function getFilteredBreeds() {
      const q = (elSearch.value || '').trim().toLowerCase();
      return breeds.filter(function (b) {
        const matchSpecies = currentSpecies === 'tous' || b.species === currentSpecies;
        const matchQuery = !q || b.name.toLowerCase().includes(q) || b.origin.toLowerCase().includes(q);
        return matchSpecies && matchQuery;
      });
    }

    function populateSelect(preferredId) {
      const list = getFilteredBreeds();
      const prev = preferredId || elSelect.value;
      elSelect.innerHTML = '';

      if (!list.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Aucune race trouvée pour cette recherche';
        elSelect.appendChild(opt);
        return;
      }

      list.forEach(function (b) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name + ' (' + (b.species === 'chien' ? 'Chien' : 'Chat') + ' — ' + b.weightKg + ' kg)';
        elSelect.appendChild(opt);
      });

      const exists = list.some(function (b) { return b.id === prev; });
      if (exists) {
        elSelect.value = prev;
      } else {
        elSelect.value = list[0].id;
      }
    }

    function computeBudget(breed) {
      const foodKey = elFoodTier.value;
      const foodInfo = FOOD_MULT[foodKey] || FOOD_MULT.premium;
      const insKey = elInsurance.value;
      const groomKey = elGrooming.value;
      const boardingDays = Number(elBoarding.value) || 0;
      const adoptMode = elAdoptionMode.value;

      const isDog = breed.species === 'chien';

      /* 1. Alimentation + friandises + litière si chat */
      const foodMonth = breed.kibbleMonthBase * foodInfo.mult;
      const litterMonth = isDog ? 0 : 18;
      const treatsMonth = isDog ? (breed.weightKg > 20 ? 14 : 9) : 6;
      const foodYear = (foodMonth + litterMonth + treatsMonth) * 12;

      /* 2. Santé : prévention (vaccins, antiparasitaires) + soins vétérinaires / mutuelle */
      const preventionYear = isDog
        ? (breed.weightKg > 25 ? 240 : 190)
        : 155;

      /* Risque vétérinaire imprévu annuel lissé (selon indice 1..5) */
      const riskCurve = [0, 140, 210, 320, 460, 650];
      const expectedUninsuredVet = riskCurve[breed.vetRisk] || 280;

      let insuranceYear = 0;
      let outOfPocketVetYear = expectedUninsuredVet;

      if (insKey === 'essentielle') {
        insuranceYear = (isDog ? 260 : 195) * (0.85 + breed.vetRisk * 0.12);
        outOfPocketVetYear = expectedUninsuredVet * 0.45;
      } else if (insKey === 'confort') {
        insuranceYear = (isDog ? 420 : 310) * (0.85 + breed.vetRisk * 0.14);
        outOfPocketVetYear = expectedUninsuredVet * 0.22;
      } else if (insKey === 'integrale') {
        insuranceYear = (isDog ? 640 : 460) * (0.85 + breed.vetRisk * 0.15);
        outOfPocketVetYear = expectedUninsuredVet * 0.08;
      }

      const healthYear = preventionYear + insuranceYear + outOfPocketVetYear;

      /* 3. Toilettage & hygiène */
      const groomingYear = breed.groomingYear * (GROOMING_MULT[groomKey] || 1);

      /* 4. Garde vacances & accessoires renouvelés */
      const dayRate = isDog ? 26 : 16;
      const boardingYear = boardingDays * dayRate;
      const accessoriesYear = isDog ? 110 : 85;
      const lifestyleYear = boardingYear + accessoriesYear;

      /* 5. Adoption + mise en route 1re année (stérilisation, puce/équipement initial) */
      const adoptionCost = adoptMode === 'refuge'
        ? (isDog ? 300 : 180)
        : breed.adoptionCost;
      const setupCost = isDog ? 480 : 310; /* matériel + stérilisation si élevage */
      const initialTotal = adoptionCost + (adoptMode === 'refuge' ? (isDog ? 260 : 170) : setupCost);

      /* Totaux */
      const annualTotal = foodYear + healthYear + groomingYear + lifestyleYear;
      const monthlyTotal = annualTotal / 12;
      const firstYearTotal = initialTotal + annualTotal;

      /* Majoration santé senior (3 dernières années de vie) */
      const seniorExtra = insKey === 'aucune'
        ? (breed.vetRisk * 260)
        : (breed.vetRisk * 95);

      const lifetimeFood = foodYear * breed.lifespan;
      const lifetimeHealth = healthYear * breed.lifespan + seniorExtra;
      const lifetimeGrooming = groomingYear * breed.lifespan;
      const lifetimeLifestyle = lifestyleYear * breed.lifespan;
      const lifetimeTotal = initialTotal + lifetimeFood + lifetimeHealth + lifetimeGrooming + lifetimeLifestyle;

      return {
        breed: breed,
        foodLabel: foodInfo.label,
        insKey: insKey,
        monthlyTotal: monthlyTotal,
        annualTotal: annualTotal,
        firstYearTotal: firstYearTotal,
        lifetimeTotal: lifetimeTotal,
        categories: [
          {
            name: isDog ? 'Alimentation & friandises' : 'Alimentation & litière',
            annual: foodYear,
            lifetime: lifetimeFood,
            color: '#B84A27'
          },
          {
            name: insKey === 'aucune' ? 'Santé, vaccins & soins vétérinaires' : 'Santé, prévention & mutuelle',
            annual: healthYear,
            lifetime: lifetimeHealth,
            color: '#231B15'
          },
          {
            name: 'Garde vacances & accessoires',
            annual: lifestyleYear,
            lifetime: lifetimeLifestyle,
            color: '#63564B'
          },
          {
            name: 'Toilettage & hygiène',
            annual: groomingYear,
            lifetime: lifetimeGrooming,
            color: '#C78A5B'
          },
          {
            name: 'Adoption & équipement initial',
            annual: 0,
            lifetime: initialTotal,
            color: '#1E6B45'
          }
        ]
      };
    }

    function drawChart(result) {
      if (!chartCanvas) return;
      const W = 640;
      const H = 260;
      const ctx = UI.setupCanvas(chartCanvas, W, H);

      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      const cats = result.categories;
      const maxVal = Math.max.apply(null, cats.map(function (c) { return c.lifetime; })) || 1;
      const padLeft = 16;
      const padRight = 16;
      const startY = 24;
      const rowH = 46;
      const barH = 14;
      const barMaxW = W - padLeft - padRight;

      cats.forEach(function (cat, idx) {
        const y = startY + idx * rowH;
        const pct = Math.round((cat.lifetime / result.lifetimeTotal) * 100);
        const barW = Math.max(8, (cat.lifetime / maxVal) * barMaxW);

        /* Libellé à gauche */
        ctx.fillStyle = '#231B15';
        ctx.font = '600 13px "Nunito Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(cat.name, padLeft, y);

        /* Montant à droite */
        ctx.fillStyle = '#63564B';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(UI.formatEUR(cat.lifetime) + ' (' + pct + ' %)', W - padRight, y);

        /* Piste de barre */
        ctx.fillStyle = '#E8DFD3';
        ctx.fillRect(padLeft, y + 8, barMaxW, barH);

        /* Valeur barre */
        ctx.fillStyle = cat.color;
        ctx.fillRect(padLeft, y + 8, barW, barH);
      });
    }

    function render() {
      const selectedId = elSelect.value;
      const breed = breeds.find(function (b) { return b.id === selectedId; }) || breeds[0];
      if (!breed) return;

      elBoardingVal.textContent = elBoarding.value + ' j/an';

      const res = computeBudget(breed);
      lastResult = res;

      outBreedName.textContent = breed.name;
      outBreedSpecs.textContent =
        (breed.species === 'chien' ? 'Chien' : 'Chat') + ' · ' +
        breed.weightKg + ' kg · Espérance de vie ~' + breed.lifespan + ' ans · ' + breed.origin;
      outBreedNote.textContent = breed.note;

      const riskLabels = ['', 'Risque véto 1/5 (Très robuste)', 'Risque véto 2/5 (Robuste)', 'Risque véto 3/5 (Modéré)', 'Risque véto 4/5 (Sensible)', 'Risque véto 5/5 (Élevé)'];
      outRiskBadge.textContent = riskLabels[breed.vetRisk] || 'Risque véto modéré';
      outRiskBadge.className = 'badge ' + (breed.vetRisk >= 4 ? 'badge-danger' : breed.vetRisk === 3 ? 'badge-caution' : 'badge-safe');

      outMonthly.textContent = UI.formatEUR(res.monthlyTotal);
      outAnnual.textContent = UI.formatEUR(res.annualTotal);
      outLifetime.textContent = UI.formatEUR(res.lifetimeTotal);
      outLifetimeYears.textContent = 'Sur ' + breed.lifespan + ' ans (adoption incluse)';
      outFirstYear.textContent = UI.formatEUR(res.firstYearTotal);

      outBreakdownBody.innerHTML = res.categories.map(function (c) {
        const pct = ((c.lifetime / res.lifetimeTotal) * 100).toFixed(1).replace('.', ',');
        return '<tr>' +
          '<td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + c.color + ';margin-right:8px;"></span>' + c.name + '</td>' +
          '<td class="td-num">' + (c.annual > 0 ? UI.formatEUR(c.annual) + '/an' : 'Ponctuel') + '</td>' +
          '<td class="td-num"><strong>' + UI.formatEUR(c.lifetime) + '</strong></td>' +
          '<td class="td-num">' + pct + ' %</td>' +
          '</tr>';
      }).join('');

      drawChart(res);
    }

    /* Export Viral PNG 1200x675 style Kinfolk */
    function exportSummaryPNG() {
      if (!lastResult) return;
      const r = lastResult;
      const b = r.breed;
      const canvas = document.createElement('canvas');
      const W = 1200;
      const H = 675;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      /* Fond crème uni (zéro dégradé) */
      ctx.fillStyle = '#FBF8F3';
      ctx.fillRect(0, 0, W, H);

      /* Bordure cadre éditorial */
      ctx.strokeStyle = '#E8DFD3';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      /* Bandeau supérieur terracotta */
      ctx.fillStyle = '#B84A27';
      ctx.fillRect(24, 24, W - 48, 8);

      /* En-tête marque */
      ctx.fillStyle = '#B84A27';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PATTESCLAIRES.FR  ·  FICHE BUDGET VÉTÉRINAIRE 2026', 64, 78);

      ctx.fillStyle = '#63564B';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText((b.species === 'chien' ? 'CHIEN' : 'CHAT') + ' · ' + b.weightKg + ' KG · ~' + b.lifespan + ' ANS', W - 64, 78);

      /* Titre Race */
      ctx.fillStyle = '#231B15';
      ctx.font = '700 46px "Fraunces", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(b.name, 64, 144);

      ctx.fillStyle = '#63564B';
      ctx.font = '400 19px "Nunito Sans", sans-serif';
      ctx.fillText('Alimentation : ' + r.foodLabel + '  |  Risque vétérinaire : ' + b.vetRisk + '/5', 64, 178);

      /* 3 Blocs KPI */
      const cardY = 212;
      const cardH = 132;
      const cardW = 340;
      const gap = 26;

      const kpis = [
        { label: 'BUDGET MENSUEL MOYEN', val: UI.formatEUR(r.monthlyTotal) + ' / mois', sub: 'Hors frais d’adoption', dark: false },
        { label: 'COÛT ANNUEL RÉCURRENT', val: UI.formatEUR(r.annualTotal) + ' / an', sub: 'Alimentation, santé, garde', dark: false },
        { label: 'FACTURE VIE ENTIÈRE', val: UI.formatEUR(r.lifetimeTotal), sub: 'Sur ' + b.lifespan + ' ans (adoption incluse)', dark: true }
      ];

      kpis.forEach(function (k, i) {
        const x = 64 + i * (cardW + gap);
        ctx.fillStyle = k.dark ? '#231B15' : '#FFFFFF';
        ctx.fillRect(x, cardY, cardW, cardH);
        ctx.strokeStyle = k.dark ? '#231B15' : '#E8DFD3';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, cardY, cardW, cardH);

        ctx.fillStyle = k.dark ? '#C8BCB0' : '#63564B';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(k.label, x + 24, cardY + 34);

        ctx.fillStyle = k.dark ? '#FFFFFF' : '#B84A27';
        ctx.font = '700 34px "JetBrains Mono", monospace';
        ctx.fillText(k.val, x + 24, cardY + 82);

        ctx.fillStyle = k.dark ? '#C8BCB0' : '#63564B';
        ctx.font = '400 14px "Nunito Sans", sans-serif';
        ctx.fillText(k.sub, x + 24, cardY + 110);
      });

      /* Ventilation horizontale */
      ctx.fillStyle = '#231B15';
      ctx.font = '700 18px "Fraunces", Georgia, serif';
      ctx.fillText('Ventilation du budget sur toute la vie', 64, 392);

      const barStartY = 418;
      const barTotalW = W - 128;
      const maxCat = Math.max.apply(null, r.categories.map(function (c) { return c.lifetime; })) || 1;

      r.categories.forEach(function (cat, i) {
        const y = barStartY + i * 38;
        const pct = Math.round((cat.lifetime / r.lifetimeTotal) * 100);
        const bw = Math.max(12, (cat.lifetime / maxCat) * (barTotalW - 420));

        ctx.fillStyle = '#231B15';
        ctx.font = '600 15px "Nunito Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(cat.name, 64, y + 14);

        ctx.fillStyle = '#E8DFD3';
        ctx.fillRect(360, y + 2, barTotalW - 420, 14);

        ctx.fillStyle = cat.color;
        ctx.fillRect(360, y + 2, bw, 14);

        ctx.fillStyle = '#231B15';
        ctx.font = '600 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(UI.formatEUR(cat.lifetime) + ' (' + pct + '%)', W - 64, y + 14);
      });

      /* Pied de carte */
      ctx.strokeStyle = '#E8DFD3';
      ctx.beginPath();
      ctx.moveTo(64, 616);
      ctx.lineTo(W - 64, 616);
      ctx.stroke();

      ctx.fillStyle = '#63564B';
      ctx.font = '400 14px "Nunito Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Estimation indicative basée sur les tarifs moyens constatés en France — Simulez votre race sur pattesclaires.fr', 64, 640);

      UI.downloadCanvasPNG(canvas, 'fiche-budget-' + b.id + '-pattesclaires.png');
    }

    /* Événements */
    elSpeciesBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        elSpeciesBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        currentSpecies = btn.getAttribute('data-species-filter') || 'tous';
        populateSelect();
        render();
      });
    });

    elSearch.addEventListener('input', function () {
      populateSelect();
      render();
    });

    [elSelect, elFoodTier, elInsurance, elGrooming, elBoarding, elAdoptionMode].forEach(function (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });

    if (elExportBtn) {
      elExportBtn.addEventListener('click', exportSummaryPNG);
    }

    /* Pré-sélection URL ?race=... */
    const params = new URLSearchParams(window.location.search);
    const raceParam = params.get('race');
    populateSelect(raceParam || 'berger-australien');
    render();
  });
})();
