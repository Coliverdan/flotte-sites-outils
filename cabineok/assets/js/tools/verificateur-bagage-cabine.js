/* ==========================================================================
   OUTIL 1 — Vérificateur Bagage Cabine (42 Compagnies + Gabarit SVG + PNG)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-bag-checker');
    if (!root || !window.CABINEOK_DATA) return;

    const { AIRLINES, FAMOUS_BAGS, evaluateBagFit } = window.CABINEOK_DATA;

    const state = {
      unit: 'cm', // 'cm' | 'in'
      hCm: 55,
      wCm: 40,
      dCm: 20,
      weightKg: 8,
      mode: 'cabin', // 'underSeat' | 'cabin'
      filterType: 'all',
      search: '',
      selectedAirlineId: 'ryanair',
      activePresetId: 'samsonite-scure-55'
    };

    // URL query pre-fill (from homepage quick check)
    const params = new URLSearchParams(window.location.search);
    if (params.get('h')) state.hCm = Math.max(10, Math.min(90, Number(params.get('h')) || 55));
    if (params.get('w')) state.wCm = Math.max(10, Math.min(70, Number(params.get('w')) || 40));
    if (params.get('d')) state.dCm = Math.max(5, Math.min(50, Number(params.get('d')) || 20));
    if (params.get('kg')) state.weightKg = Math.max(0.5, Math.min(35, Number(params.get('kg')) || 8));
    if (params.get('mode') === 'underSeat' || params.get('mode') === 'cabin') state.mode = params.get('mode');
    if (params.get('airline') && AIRLINES.some((a) => a.id === params.get('airline'))) {
      state.selectedAirlineId = params.get('airline');
    }

    // DOM elements
    const presetSelect = document.getElementById('bag-preset');
    const inputH = document.getElementById('dim-h');
    const inputW = document.getElementById('dim-w');
    const inputD = document.getElementById('dim-d');
    const inputWeight = document.getElementById('bag-weight');
    const weightLabel = document.getElementById('bag-weight-val');
    const unitButtons = document.querySelectorAll('[data-unit-btn]');
    const modeButtons = document.querySelectorAll('[data-mode-btn]');
    const typeChips = document.querySelectorAll('[data-type-filter]');
    const searchInput = document.getElementById('airline-search');
    const unitLabels = document.querySelectorAll('[data-unit-label]');

    const statOk = document.getElementById('stat-ok-count');
    const statWarn = document.getElementById('stat-warn-count');
    const statFail = document.getElementById('stat-fail-count');
    const statLinear = document.getElementById('stat-linear-cm');

    const sizerTitle = document.getElementById('sizer-airline-title');
    const sizerVerdict = document.getElementById('sizer-verdict-badge');
    const sizerDetails = document.getElementById('sizer-airline-details');
    const sizerSvgWrap = document.getElementById('sizer-svg-wrap');
    const airlineGrid = document.getElementById('airline-matrix-grid');
    const exportPngBtn = document.getElementById('btn-export-png');

    // Populate bag presets
    FAMOUS_BAGS.forEach((bag) => {
      const opt = document.createElement('option');
      opt.value = bag.id;
      opt.textContent = bag.brand + ' — ' + bag.model + ' (' + bag.h + '×' + bag.w + '×' + bag.d + ' cm)';
      presetSelect.appendChild(opt);
    });

    function toDisplayUnit(cm) {
      if (state.unit === 'in') {
        return Number((cm / 2.54).toFixed(1));
      }
      return Number(cm.toFixed(1));
    }

    function fromDisplayUnit(val) {
      const n = Number(val);
      if (Number.isNaN(n) || n <= 0) return 0;
      return state.unit === 'in' ? Number((n * 2.54).toFixed(1)) : Number(n.toFixed(1));
    }

    function syncInputsFromState() {
      inputH.value = toDisplayUnit(state.hCm);
      inputW.value = toDisplayUnit(state.wCm);
      inputD.value = toDisplayUnit(state.dCm);
      inputWeight.value = state.weightKg;
      weightLabel.textContent = CabineOK.formatNum(state.weightKg, 1) + ' kg';
      unitLabels.forEach((el) => {
        el.textContent = state.unit === 'cm' ? 'cm' : 'po';
      });
      unitButtons.forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-unit-btn') === state.unit);
      });
      modeButtons.forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-mode-btn') === state.mode);
      });
    }

    function renderSizerSVG(airline, evalResult) {
      const rule = state.mode === 'underSeat' ? airline.underSeat : airline.cabin;
      // Use sorted dimensions so optimal rotation is cleanly visualised
      const rH = evalResult.rSorted[0];
      const rW = evalResult.rSorted[1];
      const rD = evalResult.rSorted[2];
      const bH = evalResult.bSorted[0];
      const bW = evalResult.bSorted[1];
      const bD = evalResult.bSorted[2];

      const maxH = Math.max(rH, bH, 55);
      const scale = 2.95; // pixels per cm

      const svgW = 620;
      const svgH = 260;
      const baselineY = 222;

      // Front view origin (H x W)
      const frontX = 48;
      const rFrontW = rW * scale;
      const rFrontH = rH * scale;
      const bFrontW = bW * scale;
      const bFrontH = bH * scale;

      // Side view origin (H x D)
      const sideX = 360;
      const rSideW = rD * scale;
      const rSideH = rH * scale;
      const bSideW = bD * scale;
      const bSideH = bH * scale;

      const bagColor = evalResult.status === 'ok'
        ? '#146C43'
        : (evalResult.status === 'warn' ? '#B45309' : '#B91C1C');
      const bagFill = evalResult.status === 'ok'
        ? 'rgba(20, 108, 67, 0.16)'
        : (evalResult.status === 'warn' ? 'rgba(180, 83, 9, 0.16)' : 'rgba(185, 28, 28, 0.16)');

      // Adjust scale if tall bag overflows canvas
      const dynScale = Math.min(scale, 175 / maxH);
      const rfW = rW * dynScale;
      const rfH = rH * dynScale;
      const bfW = bW * dynScale;
      const bfH = bH * dynScale;
      const rsW = rD * dynScale;
      const rsH = rH * dynScale;
      const bsW = bD * dynScale;
      const bsH = bH * dynScale;

      const svg = `
        <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" role="img" aria-label="Comparaison visuelle du gabarit ${airline.name} et de votre bagage">
          <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#FFFFFF" rx="4" />
          <!-- Baseline floor -->
          <line x1="20" y1="${baselineY}" x2="${svgW - 20}" y2="${baselineY}" stroke="#D9D5CC" stroke-width="1.5" />

          <!-- Titles -->
          <text x="${frontX}" y="24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#52545C">VUE FACE (H × L)</text>
          <text x="${sideX}" y="24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#52545C">VUE PROFIL (H × P)</text>

          <!-- FRONT: Airline metal sizer -->
          <rect x="${frontX}" y="${baselineY - rfH}" width="${rfW}" height="${rfH}" fill="none" stroke="#121316" stroke-width="2.2" stroke-dasharray="6 4" />
          <!-- FRONT: User bag -->
          <rect x="${frontX}" y="${baselineY - bfH}" width="${bfW}" height="${bfH}" fill="${bagFill}" stroke="${bagColor}" stroke-width="2.2" rx="3" />
          <!-- Handle icon on bag -->
          <rect x="${frontX + Math.max(4, bfW / 2 - 14)}" y="${baselineY - bfH - 6}" width="${Math.min(28, bfW * 0.5)}" height="6" fill="none" stroke="${bagColor}" stroke-width="1.8" rx="2" />

          <!-- FRONT Dimensions labels -->
          <text x="${frontX + rfW / 2}" y="${baselineY + 18}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#121316">Gabarit: ${rH}×${rW} cm</text>
          <text x="${frontX + Math.max(rfW, bfW) + 10}" y="${baselineY - bfH / 2}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="${bagColor}">Sac: ${bH}×${bW}</text>

          <!-- SIDE: Airline metal sizer -->
          <rect x="${sideX}" y="${baselineY - rsH}" width="${rsW}" height="${rsH}" fill="none" stroke="#121316" stroke-width="2.2" stroke-dasharray="6 4" />
          <!-- SIDE: User bag -->
          <rect x="${sideX}" y="${baselineY - bsH}" width="${bsW}" height="${bsH}" fill="${bagFill}" stroke="${bagColor}" stroke-width="2.2" rx="3" />

          <!-- SIDE Dimensions labels -->
          <text x="${sideX + rsW / 2}" y="${baselineY + 18}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#121316">Prof. max: ${rD} cm</text>
          <text x="${sideX + Math.max(rsW, bsW) + 12}" y="${baselineY - bsH / 2}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="${bagColor}">Sac: ${bD} cm</text>
          <text x="${sideX + Math.max(rsW, bsW) + 12}" y="${baselineY - bsH / 2 + 16}" font-family="JetBrains Mono, monospace" font-size="11" fill="#52545C">${evalResult.deltas[2] > 0 ? '+' + evalResult.deltas[2] + ' cm' : 'Marge ' + Math.abs(evalResult.deltas[2]) + ' cm'}</text>
        </svg>
      `;

      sizerSvgWrap.innerHTML = svg;
    }

    function render() {
      const bagDims = { h: state.hCm, w: state.wCm, d: state.dCm };
      const linearSum = Number((state.hCm + state.wCm + state.dCm).toFixed(1));
      statLinear.textContent = CabineOK.formatNum(linearSum, 1) + ' cm';

      let okCount = 0;
      let warnCount = 0;
      let failCount = 0;

      const evaluated = AIRLINES.map((airline) => {
        const rule = state.mode === 'underSeat' ? airline.underSeat : airline.cabin;
        const result = evaluateBagFit(bagDims, state.weightKg, rule);
        if (result.status === 'ok') okCount++;
        else if (result.status === 'warn') warnCount++;
        else failCount++;
        return { airline, rule, result };
      });

      statOk.textContent = okCount + ' / ' + AIRLINES.length;
      statWarn.textContent = String(warnCount);
      statFail.textContent = String(failCount);

      // Selected airline blueprint
      const current = evaluated.find((e) => e.airline.id === state.selectedAirlineId) || evaluated[0];
      const { airline, rule, result } = current;

      sizerTitle.innerHTML = '<span class="iata-pill">' + airline.iata + '</span> ' + airline.name + ' <span style="font-weight:400;color:var(--text-muted);font-size:0.875rem;">(' + (state.mode === 'underSeat' ? 'Sous le siège' : 'Compartiment cabine') + ')</span>';

      sizerVerdict.className = 'status-badge ' + (result.status === 'ok' ? 'status-ok' : (result.status === 'warn' ? 'status-warn' : 'status-fail'));
      sizerVerdict.textContent = result.reason;

      const weightText = rule.weight ? (rule.weight + ' kg max') : 'Sans limite poids fixe';
      const tarifText = state.mode === 'cabin'
        ? (rule.freeIncluded ? 'Inclus dans le billet standard' : 'Option payante sur tarif Basic')
        : 'Gratuit garanti sous le siège';

      sizerDetails.innerHTML =
        '<div><strong>Gabarit officiel :</strong> <span class="mono">' + rule.h + ' × ' + rule.w + ' × ' + rule.d + ' cm</span> · <strong>Poids :</strong> <span class="mono">' + weightText + '</span></div>' +
        '<div style="margin-top:4px;"><strong>Conditions :</strong> ' + tarifText + ' · <strong>Amende porte indicative :</strong> <span class="mono" style="color:var(--status-fail);font-weight:600;">~' + airline.gateFeeEur + ' €</span></div>' +
        '<div style="margin-top:4px;color:var(--text-muted);">' + airline.note + (result.rotated ? ' <strong>Note :</strong> votre sac passe en l’orientant différemment dans le gabarit.' : '') + '</div>';

      renderSizerSVG(airline, result);

      // Filter list
      const q = state.search.trim().toLowerCase();
      const filtered = evaluated.filter(({ airline: a }) => {
        if (state.filterType !== 'all' && a.type !== state.filterType) return false;
        if (!q) return true;
        return a.name.toLowerCase().includes(q) || a.iata.toLowerCase().includes(q) || a.country.toLowerCase().includes(q);
      });

      // Sort: OK first, then WARN, then FAIL
      const order = { ok: 0, warn: 1, fail: 2 };
      filtered.sort((a, b) => order[a.result.status] - order[b.result.status] || a.airline.name.localeCompare(b.airline.name, 'fr'));

      airlineGrid.innerHTML = '';
      if (filtered.length === 0) {
        airlineGrid.innerHTML = '<div class="callout" style="grid-column:1/-1;">Aucune compagnie ne correspond à votre recherche « ' + state.search.replace(/</g, '&lt;') + ' ».</div>';
        return;
      }

      filtered.forEach(({ airline: a, rule: r, result: res }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'airline-tile is-' + res.status + (a.id === state.selectedAirlineId ? ' is-selected' : '');
        const badgeClass = res.status === 'ok' ? 'status-ok' : (res.status === 'warn' ? 'status-warn' : 'status-fail');
        const badgeText = res.status === 'ok' ? 'OK' : (res.status === 'warn' ? 'POIDS' : 'NON');
        const wtStr = r.weight ? (' · ' + r.weight + ' kg') : '';
        const includedTag = state.mode === 'cabin'
          ? (r.freeIncluded ? 'Inclus' : 'Payant Basic')
          : 'Gratuit';

        btn.innerHTML =
          '<div class="airline-tile-head">' +
            '<span class="airline-tile-name"><span class="iata-pill" style="margin-right:6px;">' + a.iata + '</span>' + a.name + '</span>' +
            '<span class="status-badge ' + badgeClass + '">' + badgeText + '</span>' +
          '</div>' +
          '<div class="airline-tile-dims">Max ' + r.h + '×' + r.w + '×' + r.d + ' cm' + wtStr + '</div>' +
          '<div class="airline-tile-note">' + res.reason + ' · ' + includedTag + '</div>';

        btn.addEventListener('click', () => {
          state.selectedAirlineId = a.id;
          render();
          sizerSvgWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        airlineGrid.appendChild(btn);
      });
    }

    function exportPNG() {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#F5F3EE';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tarmac Header
      ctx.fillStyle = '#121316';
      ctx.fillRect(0, 0, canvas.width, 108);
      ctx.fillStyle = '#0047AB';
      ctx.fillRect(48, 34, 44, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 18px monospace';
      ctx.fillText('OK', 58, 60);
      ctx.font = '800 30px sans-serif';
      ctx.fillText('CABINEOK — BILAN DE CONFORMITÉ BAGAGE', 108, 60);
      ctx.fillStyle = '#B6B9C2';
      ctx.font = '500 15px monospace';
      ctx.fillText('cabineok.fr  |  Mode : ' + (state.mode === 'underSeat' ? 'SOUS LE SIÈGE (GRATUIT)' : 'COMPARTIMENT CABINE') + '  |  42 COMPAGNIES VÉRIFIÉES', 108, 86);

      // Bag summary box
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(48, 136, 1104, 108);
      ctx.strokeStyle = '#D9D5CC';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 136, 1104, 108);

      ctx.fillStyle = '#121316';
      ctx.font = '700 22px monospace';
      ctx.fillText('VOTRE BAGAGE : ' + state.hCm + ' × ' + state.wCm + ' × ' + state.dCm + ' cm  |  POIDS : ' + state.weightKg + ' kg', 74, 180);

      const bagDims = { h: state.hCm, w: state.wCm, d: state.dCm };
      const results = AIRLINES.map((a) => ({
        airline: a,
        res: evaluateBagFit(bagDims, state.weightKg, state.mode === 'underSeat' ? a.underSeat : a.cabin)
      }));
      const okTotal = results.filter((r) => r.res.status === 'ok').length;
      const failTotal = results.filter((r) => r.res.status === 'fail').length;
      const warnTotal = results.filter((r) => r.res.status === 'warn').length;

      ctx.fillStyle = '#146C43';
      ctx.font = '700 18px monospace';
      ctx.fillText('CONFORME : ' + okTotal + ' compagnies', 74, 218);
      ctx.fillStyle = '#B45309';
      ctx.fillText('POIDS DÉPASSÉ : ' + warnTotal, 410, 218);
      ctx.fillStyle = '#B91C1C';
      ctx.fillText('HORS-GABARIT : ' + failTotal, 690, 218);

      // Grid of top 24 airlines
      const top24 = results.slice(0, 24);
      const cols = 3;
      const cellW = 352;
      const cellH = 48;
      const startX = 48;
      const startY = 272;

      top24.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = startX + col * (cellW + 24);
        const y = startY + row * (cellH + 10);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#D9D5CC';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        const stripColor = item.res.status === 'ok' ? '#146C43' : (item.res.status === 'warn' ? '#B45309' : '#B91C1C');
        ctx.fillStyle = stripColor;
        ctx.fillRect(x, y, 6, cellH);

        ctx.fillStyle = '#121316';
        ctx.font = '700 14px sans-serif';
        ctx.fillText(item.airline.iata + ' · ' + item.airline.name, x + 16, y + 21);

        const rule = state.mode === 'underSeat' ? item.airline.underSeat : item.airline.cabin;
        ctx.fillStyle = '#52545C';
        ctx.font = '500 12px monospace';
        ctx.fillText('Max ' + rule.h + '×' + rule.w + '×' + rule.d + ' cm', x + 16, y + 39);

        ctx.fillStyle = stripColor;
        ctx.font = '700 13px monospace';
        const tag = item.res.status === 'ok' ? 'OK' : (item.res.status === 'warn' ? 'POIDS' : 'NON');
        ctx.fillText(tag, x + cellW - 56, y + 29);
      });

      ctx.fillStyle = '#6C6F78';
      ctx.font = '500 13px monospace';
      ctx.fillText('Généré gratuitement sur cabineok.fr — Vérifiez toujours votre billet avant le départ.', 48, 738);

      CabineOK.exportCanvasPNG(canvas, 'bilan-bagage-cabineok-' + state.hCm + 'x' + state.wCm + 'x' + state.dCm + '.png');
    }

    // Event bindings
    presetSelect.addEventListener('change', () => {
      const found = FAMOUS_BAGS.find((b) => b.id === presetSelect.value);
      if (!found) return;
      state.activePresetId = found.id;
      state.hCm = found.h;
      state.wCm = found.w;
      state.dCm = found.d;
      state.weightKg = Number((found.emptyWeight + 5).toFixed(1));
      syncInputsFromState();
      render();
    });

    [inputH, inputW, inputD].forEach((inp) => {
      inp.addEventListener('input', () => {
        const h = fromDisplayUnit(inputH.value);
        const w = fromDisplayUnit(inputW.value);
        const d = fromDisplayUnit(inputD.value);
        if (h > 0 && w > 0 && d > 0) {
          state.hCm = h;
          state.wCm = w;
          state.dCm = d;
          presetSelect.value = '';
          render();
        }
      });
    });

    inputWeight.addEventListener('input', () => {
      state.weightKg = Number(inputWeight.value) || 0;
      weightLabel.textContent = CabineOK.formatNum(state.weightKg, 1) + ' kg';
      render();
    });

    unitButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.unit = btn.getAttribute('data-unit-btn');
        syncInputsFromState();
        render();
      });
    });

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.getAttribute('data-mode-btn');
        syncInputsFromState();
        render();
      });
    });

    typeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        state.filterType = chip.getAttribute('data-type-filter');
        typeChips.forEach((c) => c.classList.toggle('is-active', c === chip));
        render();
      });
    });

    searchInput.addEventListener('input', () => {
      state.search = searchInput.value;
      render();
    });

    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', exportPNG);
    }

    syncInputsFromState();
    render();
  });
})();
