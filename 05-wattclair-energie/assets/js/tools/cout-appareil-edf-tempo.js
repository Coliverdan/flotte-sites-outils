/* ==========================================================================
   WATTCLAIR — Outil 2 : Coût Réel d'un Appareil (Base vs HC/HP vs EDF Tempo)
   Bibliothèque interactive de 36 appareils + mode puissance libre en Watts
   ========================================================================== */

(function () {
  'use strict';

  const APPLIANCES = [
    /* Lavage & Entretien (9) */
    { id: 'sl-pac', name: 'Sèche-linge pompe à chaleur', cat: 'lavage', watts: 850, minutes: 150, perWeek: 3 },
    { id: 'sl-cond', name: 'Sèche-linge à condensation', cat: 'lavage', watts: 2200, minutes: 110, perWeek: 3 },
    { id: 'll-40', name: 'Lave-linge cycle 40 °C', cat: 'lavage', watts: 950, minutes: 120, perWeek: 4 },
    { id: 'll-60', name: 'Lave-linge cycle 60 °C', cat: 'lavage', watts: 1400, minutes: 120, perWeek: 2 },
    { id: 'll-eco', name: 'Lave-linge cycle Éco 30 °C', cat: 'lavage', watts: 550, minutes: 150, perWeek: 4 },
    { id: 'lv-eco', name: 'Lave-vaisselle programme Éco', cat: 'lavage', watts: 750, minutes: 180, perWeek: 5 },
    { id: 'lv-int', name: 'Lave-vaisselle intensif 70 °C', cat: 'lavage', watts: 1250, minutes: 120, perWeek: 3 },
    { id: 'fer', name: 'Centrale vapeur / Fer', cat: 'lavage', watts: 2200, minutes: 45, perWeek: 2 },
    { id: 'aspi', name: 'Aspirateur traîneau', cat: 'lavage', watts: 750, minutes: 30, perWeek: 3 },

    /* Cuisine (11) */
    { id: 'four', name: 'Four électrique (200 °C)', cat: 'cuisine', watts: 2100, minutes: 45, perWeek: 4 },
    { id: 'pyrolyse', name: 'Four nettoyage pyrolyse', cat: 'cuisine', watts: 2800, minutes: 120, perWeek: 0.25 },
    { id: 'induction', name: 'Plaque induction (2 feux)', cat: 'cuisine', watts: 2600, minutes: 30, perWeek: 7 },
    { id: 'vitro', name: 'Plaque vitrocéramique', cat: 'cuisine', watts: 3000, minutes: 35, perWeek: 7 },
    { id: 'airfryer', name: 'Airfryer / Friteuse sans huile', cat: 'cuisine', watts: 1600, minutes: 25, perWeek: 5 },
    { id: 'micro', name: 'Micro-ondes', cat: 'cuisine', watts: 1200, minutes: 10, perWeek: 7 },
    { id: 'bouilloire', name: 'Bouilloire électrique', cat: 'cuisine', watts: 2200, minutes: 5, perWeek: 14 },
    { id: 'cafe', name: 'Machine à café broyeur', cat: 'cuisine', watts: 1450, minutes: 10, perWeek: 14 },
    { id: 'raclette', name: 'Appareil à raclette', cat: 'cuisine', watts: 1350, minutes: 90, perWeek: 0.5 },
    { id: 'frigo', name: 'Réfrigérateur combiné (24 h)', cat: 'cuisine', watts: 42, minutes: 1440, perWeek: 7 },
    { id: 'congel', name: 'Congélateur coffre (24 h)', cat: 'cuisine', watts: 35, minutes: 1440, perWeek: 7 },

    /* Chauffage, Eau chaude & Clim (8) */
    { id: 'rad-2000', name: 'Radiateur électrique 2000 W', cat: 'chauffage', watts: 1400, minutes: 360, perWeek: 7 },
    { id: 'rad-conv', name: 'Convecteur grille-pain 1500 W', cat: 'chauffage', watts: 1200, minutes: 360, perWeek: 7 },
    { id: 'soufflant', name: 'Radiateur soufflant SdB', cat: 'chauffage', watts: 2000, minutes: 20, perWeek: 7 },
    { id: 'seche-serv', name: 'Sèche-serviettes électrique', cat: 'chauffage', watts: 750, minutes: 90, perWeek: 7 },
    { id: 'clim-mob', name: 'Climatiseur mobile monobloc', cat: 'chauffage', watts: 1100, minutes: 240, perWeek: 5 },
    { id: 'clim-pac', name: 'Clim réversible split (PAC)', cat: 'chauffage', watts: 650, minutes: 300, perWeek: 7 },
    { id: 'ballon-200', name: 'Ballon eau chaude 200 L', cat: 'chauffage', watts: 2400, minutes: 240, perWeek: 7 },
    { id: 'cet-200', name: 'Chauffe-eau thermodynamique', cat: 'chauffage', watts: 700, minutes: 240, perWeek: 7 },

    /* Multimédia, Mobilité & Loisirs (8) */
    { id: 'pc-game', name: 'PC Gaming + écran (500 W)', cat: 'tech', watts: 500, minutes: 180, perWeek: 5 },
    { id: 'laptop', name: 'PC portable bureautique', cat: 'tech', watts: 45, minutes: 480, perWeek: 5 },
    { id: 'tv-oled', name: 'TV OLED 55 pouces', cat: 'tech', watts: 125, minutes: 240, perWeek: 7 },
    { id: 'console', name: 'Console PS5 / Xbox Series X', cat: 'tech', watts: 190, minutes: 150, perWeek: 5 },
    { id: 'box-tv', name: 'Box Fibre + Décodeur (24 h)', cat: 'tech', watts: 22, minutes: 1440, perWeek: 7 },
    { id: 've-74', name: 'Recharge VE borne 7,4 kW', cat: 'tech', watts: 7400, minutes: 240, perWeek: 2 },
    { id: 've-32', name: 'Recharge VE prise 3,2 kW', cat: 'tech', watts: 3200, minutes: 360, perWeek: 2 },
    { id: 'spa', name: 'Spa gonflable (chauffe)', cat: 'tech', watts: 2000, minutes: 240, perWeek: 5 }
  ];

  function init() {
    const grid = document.getElementById('app-grid');
    if (!grid) return;

    const elWatts = document.getElementById('app-watts');
    const elMinutes = document.getElementById('app-minutes');
    const elFreq = document.getElementById('app-freq');
    const elSelectedName = document.getElementById('app-selected-name');
    const elSearch = document.getElementById('app-search');
    const canvas = document.getElementById('app-chart');

    const state = {
      cat: 'all',
      query: '',
      activeId: 'sl-cond',
      name: 'Sèche-linge à condensation',
      watts: 2200,
      minutes: 110,
      perWeek: 3
    };

    function renderGrid() {
      const q = state.query.trim().toLowerCase();
      const filtered = APPLIANCES.filter((a) => {
        const matchCat = state.cat === 'all' || a.cat === state.cat;
        const matchQ = !q || a.name.toLowerCase().includes(q);
        return matchCat && matchQ;
      });

      grid.innerHTML = '';
      filtered.forEach((a) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'appliance-item' + (a.id === state.activeId ? ' is-active' : '');
        btn.innerHTML =
          `<span class="appliance-item-name">${a.name}</span>` +
          `<span class="appliance-item-watt">${a.watts} W · ${a.minutes >= 120 ? (a.minutes / 60).toFixed(1).replace('.0', '') + ' h' : a.minutes + ' min'}</span>`;
        btn.addEventListener('click', () => {
          state.activeId = a.id;
          state.name = a.name;
          state.watts = a.watts;
          state.minutes = a.minutes;
          state.perWeek = a.perWeek;
          elWatts.value = a.watts;
          elMinutes.value = a.minutes;
          elFreq.value = a.perWeek;
          renderGrid();
          compute();
        });
        grid.appendChild(btn);
      });
    }

    document.querySelectorAll('[data-app-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.cat = btn.getAttribute('data-app-cat');
        document.querySelectorAll('[data-app-cat]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        renderGrid();
      });
    });

    if (elSearch) {
      elSearch.addEventListener('input', () => {
        state.query = elSearch.value;
        renderGrid();
      });
    }

    function onCustomChange() {
      state.activeId = 'custom';
      state.name = 'Appareil personnalisé';
      state.watts = Math.max(1, Number(elWatts.value) || 0);
      state.minutes = Math.max(1, Number(elMinutes.value) || 0);
      state.perWeek = Math.max(0.1, Number(elFreq.value) || 0);
      grid.querySelectorAll('.appliance-item.is-active').forEach((el) => el.classList.remove('is-active'));
      compute();
    }

    elWatts.addEventListener('input', onCustomChange);
    elMinutes.addEventListener('input', onCustomChange);
    elFreq.addEventListener('input', onCustomChange);

    function compute() {
      const { EDF_TARIFS, fmtEur, fmtNum } = window.WattClair;
      const kwhCycle = (state.watts / 1000) * (state.minutes / 60);
      const cyclesMonth = state.perWeek * 4.333;
      const cyclesYear = state.perWeek * 52;
      const kwhYear = kwhCycle * cyclesYear;

      elSelectedName.textContent = `${state.name} — ${fmtNum(kwhCycle, 2)} kWh / cycle (${fmtNum(kwhYear, 0)} kWh / an)`;

      const rows = [
        { key: 'tempo-bleu-hc', label: 'Tempo Jour Bleu — HC (22h–6h)', badge: 'tempo-blue', rate: EDF_TARIFS.tempo.bleuHC, color: '#1D4ED8' },
        { key: 'tempo-bleu-hp', label: 'Tempo Jour Bleu — HP (6h–22h)', badge: 'tempo-blue', rate: EDF_TARIFS.tempo.bleuHP, color: '#3B82F6' },
        { key: 'tempo-blanc-hc', label: 'Tempo Jour Blanc — HC', badge: 'tempo-white', rate: EDF_TARIFS.tempo.blancHC, color: '#64748B' },
        { key: 'hchp-hc', label: 'Option HC / HP — Heures Creuses', badge: '', rate: EDF_TARIFS.hchp.hc, color: '#525C57' },
        { key: 'tempo-blanc-hp', label: 'Tempo Jour Blanc — HP', badge: 'tempo-white', rate: EDF_TARIFS.tempo.blancHP, color: '#475569' },
        { key: 'base', label: 'Tarif Bleu — Option Base', badge: '', rate: EDF_TARIFS.base.kwh, color: '#1A211E' },
        { key: 'hchp-hp', label: 'Option HC / HP — Heures Pleines', badge: '', rate: EDF_TARIFS.hchp.hp, color: '#3F4944' },
        { key: 'tempo-rouge-hc', label: 'Tempo Jour Rouge — HC (nuit)', badge: 'tempo-red', rate: EDF_TARIFS.tempo.rougeHC, color: '#DC2626' },
        { key: 'tempo-rouge-hp', label: 'Tempo Jour Rouge — HP (6h–22h)', badge: 'tempo-red', rate: EDF_TARIFS.tempo.rougeHP, color: '#B91C1C' }
      ];

      const costBaseCycle = kwhCycle * EDF_TARIFS.base.kwh;
      const costBleuHcCycle = kwhCycle * EDF_TARIFS.tempo.bleuHC;
      const costRougeHpCycle = kwhCycle * EDF_TARIFS.tempo.rougeHP;
      const shockRatio = EDF_TARIFS.tempo.rougeHP / EDF_TARIFS.tempo.bleuHC;
      const extraRougeVsBase = costRougeHpCycle - costBaseCycle;

      document.getElementById('app-kpi-base').textContent = fmtEur(costBaseCycle, 2);
      document.getElementById('app-kpi-base-yr').textContent = `${fmtEur(costBaseCycle * cyclesYear, 0)} / an`;

      document.getElementById('app-kpi-bleu').textContent = fmtEur(costBleuHcCycle, 2);
      document.getElementById('app-kpi-bleu-yr').textContent = `${fmtEur(costBleuHcCycle * cyclesYear, 0)} / an`;

      document.getElementById('app-kpi-rouge').textContent = fmtEur(costRougeHpCycle, 2);
      document.getElementById('app-kpi-rouge-diff').textContent = `×${fmtNum(shockRatio, 1)} vs Bleu HC (+${fmtEur(extraRougeVsBase, 2)} / cycle vs Base)`;

      const tbody = document.getElementById('app-table-body');
      tbody.innerHTML = '';
      rows.forEach((r) => {
        const cCycle = kwhCycle * r.rate;
        const cMonth = cCycle * cyclesMonth;
        const cYear = cCycle * cyclesYear;
        const tr = document.createElement('tr');
        if (r.key === 'tempo-rouge-hp') tr.className = 'row-danger';
        if (r.key === 'tempo-bleu-hc') tr.className = 'row-positive';

        const dotHtml = r.badge
          ? `<span class="tempo-badge ${r.badge}"><span class="tempo-dot"></span>${r.label}</span>`
          : `<strong>${r.label}</strong>`;

        tr.innerHTML =
          `<td>${dotHtml}</td>` +
          `<td class="num">${fmtNum(r.rate, 4)} €</td>` +
          `<td class="num"><strong>${fmtEur(cCycle, 2)}</strong></td>` +
          `<td class="num">${fmtEur(cMonth, 2)}</td>` +
          `<td class="num">${fmtEur(cYear, 0)}</td>`;
        tbody.appendChild(tr);
      });

      drawChart(canvas, rows, kwhCycle);
    }

    function drawChart(cvs, rows, kwhCycle) {
      if (!cvs) return;
      const W = 680;
      const H = 260;
      const ctx = window.WattClair.setupCanvas(cvs, W, H);
      const selected = [rows[0], rows[3], rows[5], rows[4], rows[7], rows[8]];
      const vals = selected.map((r) => kwhCycle * r.rate);
      const maxVal = Math.max(...vals, 0.01) * 1.22;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const padL = 190;
      const padR = 72;
      const padT = 20;
      const rowH = 38;

      selected.forEach((r, i) => {
        const val = vals[i];
        const y = padT + i * rowH;
        const barW = Math.max(4, (val / maxVal) * (W - padL - padR));

        /* Libellé */
        ctx.fillStyle = '#1A211E';
        ctx.font = i === 5 ? '700 12px "DM Sans", sans-serif' : '500 12px "DM Sans", sans-serif';
        ctx.textAlign = 'right';
        const shortLabel = r.label.replace('Option ', '').replace('Tarif Bleu — ', '');
        ctx.fillText(shortLabel, padL - 12, y + 17);

        /* Piste fond */
        ctx.fillStyle = '#EFECE4';
        ctx.fillRect(padL, y + 4, W - padL - padR, 20);

        /* Barre pleine */
        ctx.fillStyle = r.color;
        ctx.fillRect(padL, y + 4, barW, 20);

        /* Valeur */
        ctx.fillStyle = i === 5 ? '#B91C1C' : '#1A211E';
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(window.WattClair.fmtEur(val, 2), padL + barW + 8, y + 18);
      });
    }

    renderGrid();
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
