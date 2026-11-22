/* ==========================================================================
   OUTIL 2 — Comparateur Multi-Escales (Plus Petit Dénominateur Commun)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-multi-escales');
    if (!root || !window.CABINEOK_DATA) return;

    const { AIRLINES, FAMOUS_BAGS, evaluateBagFit } = window.CABINEOK_DATA;

    const state = {
      legs: ['ryanair', 'vueling', 'air-france'],
      mode: 'cabin' // 'cabin' | 'underSeat'
    };

    const PRESET_ROUTES = {
      lowcost: ['ryanair', 'vueling', 'easyjet'],
      japon: ['air-france', 'swiss', 'ana'],
      usa: ['transavia', 'air-france', 'delta'],
      gulf: ['air-france', 'qatar-airways', 'singapore-airlines']
    };

    const legsContainer = document.getElementById('multi-legs-list');
    const addLegBtn = document.getElementById('btn-add-leg');
    const modeBtns = document.querySelectorAll('[data-multi-mode]');
    const routeBtns = document.querySelectorAll('[data-preset-route]');

    const lcdDimsEl = document.getElementById('lcd-dims');
    const lcdWeightEl = document.getElementById('lcd-weight');
    const lcdVolumeEl = document.getElementById('lcd-volume');
    const bottleneckAlert = document.getElementById('bottleneck-alert');
    const comparisonTbody = document.getElementById('multi-comparison-tbody');
    const multiSvgWrap = document.getElementById('multi-svg-wrap');
    const compatibleBagsWrap = document.getElementById('multi-compatible-bags');

    function buildAirlineOptions(selectedId) {
      return AIRLINES
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((a) => {
          const sel = a.id === selectedId ? ' selected' : '';
          return '<option value="' + a.id + '"' + sel + '>' + a.iata + ' — ' + a.name + ' (' + a.country + ')</option>';
        })
        .join('');
    }

    function renderLegsInputs() {
      legsContainer.innerHTML = '';
      state.legs.forEach((airlineId, idx) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML =
          '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">' +
            '<span class="iata-pill" style="background:#0047AB;">VOL ' + (idx + 1) + '</span>' +
            '<select class="form-select" data-leg-index="' + idx + '" aria-label="Compagnie du tronçon ' + (idx + 1) + '">' +
              buildAirlineOptions(airlineId) +
            '</select>' +
          '</div>' +
          (state.legs.length > 2
            ? '<button type="button" class="btn btn-danger-outline btn-sm" data-remove-leg="' + idx + '" aria-label="Retirer le tronçon ' + (idx + 1) + '">Retirer</button>'
            : '');
        legsContainer.appendChild(row);
      });

      legsContainer.querySelectorAll('select[data-leg-index]').forEach((sel) => {
        sel.addEventListener('change', () => {
          const idx = Number(sel.getAttribute('data-leg-index'));
          state.legs[idx] = sel.value;
          computeAndRender();
        });
      });

      legsContainer.querySelectorAll('button[data-remove-leg]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-remove-leg'));
          if (state.legs.length > 2) {
            state.legs.splice(idx, 1);
            renderLegsInputs();
            computeAndRender();
          }
        });
      });

      addLegBtn.disabled = state.legs.length >= 6;
      addLegBtn.style.opacity = state.legs.length >= 6 ? '0.5' : '1';
    }

    function renderOverlaySVG(selectedAirlines, lcd) {
      const svgW = 620;
      const svgH = 250;
      const baseY = 216;
      const scale = 3.0;
      const frontX = 48;
      const sideX = 368;

      let frontOutlines = '';
      let sideOutlines = '';

      selectedAirlines.forEach((item) => {
        const r = item.rule;
        frontOutlines += '<rect x="' + frontX + '" y="' + (baseY - r.h * scale) + '" width="' + (r.w * scale) + '" height="' + (r.h * scale) + '" fill="none" stroke="#8C8980" stroke-width="1.3" stroke-dasharray="4 3" />';
        sideOutlines += '<rect x="' + sideX + '" y="' + (baseY - r.h * scale) + '" width="' + (r.d * scale) + '" height="' + (r.h * scale) + '" fill="none" stroke="#8C8980" stroke-width="1.3" stroke-dasharray="4 3" />';
      });

      const lcdFw = lcd.w * scale;
      const lcdFh = lcd.h * scale;
      const lcdSw = lcd.d * scale;
      const lcdSh = lcd.h * scale;

      multiSvgWrap.innerHTML =
        '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" role="img" aria-label="Superposition des gabarits et zone commune autorisée">' +
          '<rect x="0" y="0" width="' + svgW + '" height="' + svgH + '" fill="#FFFFFF" rx="4" />' +
          '<line x1="20" y1="' + baseY + '" x2="' + (svgW - 20) + '" y2="' + baseY + '" stroke="#D9D5CC" stroke-width="1.5" />' +
          '<text x="' + frontX + '" y="24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#52545C">ZONE SÛRE FACE (H × L)</text>' +
          '<text x="' + sideX + '" y="24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#52545C">ZONE SÛRE PROFIL (H × P)</text>' +
          frontOutlines +
          sideOutlines +
          '<rect x="' + frontX + '" y="' + (baseY - lcdFh) + '" width="' + lcdFw + '" height="' + lcdFh + '" fill="rgba(0,71,171,0.16)" stroke="#0047AB" stroke-width="2.5" rx="2" />' +
          '<rect x="' + sideX + '" y="' + (baseY - lcdSh) + '" width="' + lcdSw + '" height="' + lcdSh + '" fill="rgba(0,71,171,0.16)" stroke="#0047AB" stroke-width="2.5" rx="2" />' +
          '<text x="' + (frontX + lcdFw / 2) + '" y="' + (baseY + 18) + '" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#0047AB">Max sûr : ' + lcd.h + '×' + lcd.w + ' cm</text>' +
          '<text x="' + (sideX + lcdSw / 2) + '" y="' + (baseY + 18) + '" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#0047AB">Prof. : ' + lcd.d + ' cm</text>' +
        '</svg>';
    }

    function computeAndRender() {
      const selectedAirlines = state.legs.map((id, i) => {
        const airline = AIRLINES.find((a) => a.id === id) || AIRLINES[0];
        const rule = state.mode === 'underSeat' ? airline.underSeat : airline.cabin;
        return { legNum: i + 1, airline, rule };
      });

      const minH = Math.min(...selectedAirlines.map((x) => x.rule.h));
      const minW = Math.min(...selectedAirlines.map((x) => x.rule.w));
      const minD = Math.min(...selectedAirlines.map((x) => x.rule.d));
      const finiteWeights = selectedAirlines.map((x) => x.rule.weight).filter((w) => w !== null);
      const minWeight = finiteWeights.length ? Math.min(...finiteWeights) : null;

      const lcd = { h: minH, w: minW, d: minD, weight: minWeight };
      const approxLitres = Math.round((minH * minW * minD) / 1000);

      lcdDimsEl.textContent = minH + ' × ' + minW + ' × ' + minD + ' cm';
      lcdWeightEl.textContent = minWeight !== null ? (minWeight + ' kg') : 'Libre';
      lcdVolumeEl.textContent = approxLitres + ' L';

      // Identify bottleneck airlines per axis
      const limitersH = selectedAirlines.filter((x) => x.rule.h === minH).map((x) => x.airline.name);
      const limitersW = selectedAirlines.filter((x) => x.rule.w === minW).map((x) => x.airline.name);
      const limitersD = selectedAirlines.filter((x) => x.rule.d === minD).map((x) => x.airline.name);
      const limitersKg = minWeight !== null
        ? selectedAirlines.filter((x) => x.rule.weight === minWeight).map((x) => x.airline.name)
        : [];

      // Find single most restrictive volume airline
      const smallestVolLeg = selectedAirlines.slice().sort((a, b) => (a.rule.h * a.rule.w * a.rule.d) - (b.rule.h * b.rule.w * b.rule.d))[0];
      const unique = (arr) => Array.from(new Set(arr)).join(', ');

      bottleneckAlert.innerHTML =
        '<strong>Compagnie la plus restrictive : ' + smallestVolLeg.airline.name + ' (' + smallestVolLeg.airline.iata + ')</strong><br>' +
        'Contraintes critiques de votre itinéraire : ' +
        'Hauteur <span class="mono">' + minH + ' cm</span> (' + unique(limitersH) + ') · ' +
        'Largeur <span class="mono">' + minW + ' cm</span> (' + unique(limitersW) + ') · ' +
        'Profondeur <span class="mono">' + minD + ' cm</span> (' + unique(limitersD) + ')' +
        (minWeight !== null ? ' · Poids <span class="mono">' + minWeight + ' kg</span> (' + unique(limitersKg) + ')' : '') + '.';

      // Render comparison table
      comparisonTbody.innerHTML = '';
      selectedAirlines.forEach(({ legNum, airline, rule }) => {
        const tr = document.createElement('tr');
        const hFlag = rule.h === minH ? ' style="color:var(--status-fail);font-weight:700;"' : '';
        const wFlag = rule.w === minW ? ' style="color:var(--status-fail);font-weight:700;"' : '';
        const dFlag = rule.d === minD ? ' style="color:var(--status-fail);font-weight:700;"' : '';
        const kgFlag = (minWeight !== null && rule.weight === minWeight) ? ' style="color:var(--status-fail);font-weight:700;"' : '';

        tr.innerHTML =
          '<td class="mono">Vol ' + legNum + '</td>' +
          '<td><span class="iata-pill" style="margin-right:6px;">' + airline.iata + '</span><strong>' + airline.name + '</strong></td>' +
          '<td class="mono"' + hFlag + '>' + rule.h + ' cm</td>' +
          '<td class="mono"' + wFlag + '>' + rule.w + ' cm</td>' +
          '<td class="mono"' + dFlag + '>' + rule.d + ' cm</td>' +
          '<td class="mono"' + kgFlag + '>' + (rule.weight !== null ? rule.weight + ' kg' : 'Non fixé') + '</td>' +
          '<td class="mono" style="color:var(--status-fail);">~' + airline.gateFeeEur + ' €</td>';
        comparisonTbody.appendChild(tr);
      });

      renderOverlaySVG(selectedAirlines, lcd);

      // Compatible famous bags for ALL legs
      const okBags = FAMOUS_BAGS.filter((bag) => {
        return selectedAirlines.every(({ rule }) => {
          const check = evaluateBagFit({ h: bag.h, w: bag.w, d: bag.d }, bag.emptyWeight + 3, rule);
          return check.dimsOk;
        });
      });

      if (okBags.length === 0) {
        compatibleBagsWrap.innerHTML = '<div class="callout callout-warn">Aucun des 16 modèles standards de notre catalogue ne respecte simultanément toutes les contraintes de cet itinéraire en mode « ' + (state.mode === 'underSeat' ? 'Sous le siège' : 'Compartiment cabine') + ' ». Privilégiez un sac souple compressible aux dimensions maximales de <span class="mono">' + minH + '×' + minW + '×' + minD + ' cm</span>.</div>';
      } else {
        compatibleBagsWrap.innerHTML =
          '<div class="grid-2">' +
          okBags.slice(0, 6).map((b) =>
            '<div class="card" style="padding:16px;">' +
              '<div class="flex-between"><strong>' + b.brand + ' ' + b.model + '</strong><span class="status-badge status-ok">100% OK</span></div>' +
              '<div class="mono" style="font-size:0.8125rem;color:var(--text-secondary);margin-top:6px;">' + b.h + '×' + b.w + '×' + b.d + ' cm · ' + b.volume + ' L · ' + b.emptyWeight + ' kg à vide</div>' +
            '</div>'
          ).join('') +
          '</div>';
      }
    }

    addLegBtn.addEventListener('click', () => {
      if (state.legs.length >= 6) return;
      const unused = AIRLINES.find((a) => !state.legs.includes(a.id)) || AIRLINES[0];
      state.legs.push(unused.id);
      renderLegsInputs();
      computeAndRender();
    });

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.getAttribute('data-multi-mode');
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        computeAndRender();
      });
    });

    routeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset-route');
        if (PRESET_ROUTES[key]) {
          state.legs = PRESET_ROUTES[key].slice();
          renderLegsInputs();
          computeAndRender();
        }
      });
    });

    renderLegsInputs();
    computeAndRender();
  });
})();
