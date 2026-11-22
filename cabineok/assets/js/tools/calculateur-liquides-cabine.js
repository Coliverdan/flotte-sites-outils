/* ==========================================================================
   OUTIL 3 — Calculateur Trousse Liquides Cabine (Règle 100 ml / Sac 1 L)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-liquids');
    if (!root) return;

    const CATALOG = [
      { id: 'shampoing', name: 'Shampoing format voyage', ml: 100, category: 'Hygiène' },
      { id: 'gel-douche', name: 'Gel douche', ml: 100, category: 'Hygiène' },
      { id: 'dentifrice', name: 'Dentifrice tube', ml: 75, category: 'Hygiène' },
      { id: 'parfum', name: 'Flacon de parfum', ml: 50, category: 'Beauté' },
      { id: 'creme-solaire', name: 'Crème solaire', ml: 100, category: 'Soin' },
      { id: 'lentilles', name: 'Solution lentilles', ml: 100, category: 'Optique' },
      { id: 'gel-hydro', name: 'Gel hydroalcoolique', ml: 50, category: 'Hygiène' },
      { id: 'deo-bille', name: 'Déodorant bille / roll-on', ml: 50, category: 'Hygiène' },
      { id: 'eau-micellaire', name: 'Eau micellaire', ml: 100, category: 'Beauté' },
      { id: 'creme-visage', name: 'Crème hydratante visage', ml: 50, category: 'Soin' },
      { id: 'mascara', name: 'Mascara / gloss', ml: 15, category: 'Beauté' },
      { id: 'mousse-raser', name: 'Mousse / gel à raser', ml: 100, category: 'Hygiène' },
      { id: 'serum', name: 'Sérum / huile visage', ml: 30, category: 'Soin' },
      { id: 'parfum-150', name: 'Flacon standard 150 ml (Test piège)', ml: 150, category: 'Piège' }
    ];

    let nextUid = 100;
    const state = {
      items: [
        { uid: 1, name: 'Shampoing format voyage', ml: 100, exempt: false },
        { uid: 2, name: 'Dentifrice tube', ml: 75, exempt: false },
        { uid: 3, name: 'Flacon de parfum', ml: 50, exempt: false },
        { uid: 4, name: 'Crème solaire', ml: 100, exempt: false },
        { uid: 5, name: 'Gel hydroalcoolique', ml: 50, exempt: false }
      ]
    };

    const catalogWrap = document.getElementById('liquids-catalog');
    const customNameInput = document.getElementById('custom-liquid-name');
    const customMlInput = document.getElementById('custom-liquid-ml');
    const customExemptInput = document.getElementById('custom-liquid-exempt');
    const addCustomForm = document.getElementById('custom-liquid-form');
    const resetBtn = document.getElementById('btn-reset-liquids');
    const clearBtn = document.getElementById('btn-clear-liquids');

    const totalMlEl = document.getElementById('liquids-total-ml');
    const remainingMlEl = document.getElementById('liquids-remaining-ml');
    const countItemsEl = document.getElementById('liquids-count');
    const verdictBadge = document.getElementById('liquids-verdict-badge');
    const alertsWrap = document.getElementById('liquids-alerts');
    const meterFill = document.getElementById('liquids-meter-fill');
    const bagSvgWrap = document.getElementById('liquids-bag-svg');
    const itemsListEl = document.getElementById('liquids-items-list');

    function renderCatalog() {
      catalogWrap.innerHTML = '';
      CATALOG.forEach((prod) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.innerHTML = '+ ' + prod.name + ' <span class="mono" style="opacity:0.75;">(' + prod.ml + ' ml)</span>';
        btn.addEventListener('click', () => {
          state.items.push({
            uid: nextUid++,
            name: prod.name,
            ml: prod.ml,
            exempt: false
          });
          render();
        });
        catalogWrap.appendChild(btn);
      });
    }

    function renderZipBagSVG(standardItems, totalStandardMl, hasOver100) {
      const svgW = 360;
      const svgH = 290;
      const bagX = 48;
      const bagY = 44;
      const bagW = 264;
      const bagH = 210;

      const fillPct = Math.min(1, totalStandardMl / 1000);
      const fillH = Math.round(fillPct * (bagH - 22));
      const fillColor = (totalStandardMl > 1000 || hasOver100)
        ? 'rgba(185, 28, 28, 0.16)'
        : (totalStandardMl >= 850 ? 'rgba(180, 83, 9, 0.16)' : 'rgba(0, 71, 171, 0.14)');
      const strokeColor = (totalStandardMl > 1000 || hasOver100)
        ? '#B91C1C'
        : (totalStandardMl >= 850 ? '#B45309' : '#0047AB');

      // Render small bottle blocks inside the bag
      let bottlesMarkup = '';
      const visibleItems = standardItems.slice(0, 12);
      const cols = 4;
      const slotW = 54;
      const slotH = 52;
      visibleItems.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const bx = bagX + 14 + col * (slotW + 8);
        const by = bagY + bagH - 12 - (row + 1) * (slotH + 8);
        const isBad = item.ml > 100;
        const bStroke = isBad ? '#B91C1C' : '#121316';
        const bFill = isBad ? '#FCEAEA' : '#FFFFFF';
        const hRatio = Math.max(0.45, Math.min(1, item.ml / 100));
        const bottleH = Math.round((slotH - 12) * hRatio);
        const topY = by + (slotH - bottleH);

        bottlesMarkup +=
          '<rect x="' + (bx + 18) + '" y="' + (topY - 7) + '" width="18" height="7" fill="' + bStroke + '" rx="1" />' +
          '<rect x="' + bx + '" y="' + topY + '" width="' + slotW + '" height="' + bottleH + '" fill="' + bFill + '" stroke="' + bStroke + '" stroke-width="1.5" rx="3" />' +
          '<text x="' + (bx + slotW / 2) + '" y="' + (topY + bottleH / 2 + 4) + '" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="' + bStroke + '">' + item.ml + 'ml</text>';
      });

      bagSvgWrap.innerHTML =
        '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" role="img" aria-label="Sac zip transparent 1 litre rempli à ' + totalStandardMl + ' ml">' +
          '<rect x="0" y="0" width="' + svgW + '" height="' + svgH + '" fill="#FFFFFF" rx="4" />' +
          '<text x="' + (svgW / 2) + '" y="22" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#52545C">SAC ZIP TRANSPARENT 20 × 20 CM (MAX 1 000 ML)</text>' +
          // Zip top track
          '<rect x="' + bagX + '" y="' + (bagY - 10) + '" width="' + bagW + '" height="10" fill="#ECE9E1" stroke="#121316" stroke-width="1.5" />' +
          '<line x1="' + (bagX + 6) + '" y1="' + (bagY - 5) + '" x2="' + (bagX + bagW - 6) + '" y2="' + (bagY - 5) + '" stroke="#0047AB" stroke-width="2" />' +
          // Main bag body
          '<rect x="' + bagX + '" y="' + bagY + '" width="' + bagW + '" height="' + bagH + '" fill="#FAF9F6" stroke="#121316" stroke-width="2" rx="4" />' +
          // Volume fill backdrop
          '<rect x="' + (bagX + 2) + '" y="' + (bagY + bagH - fillH - 2) + '" width="' + (bagW - 4) + '" height="' + fillH + '" fill="' + fillColor + '" />' +
          '<line x1="' + (bagX + 2) + '" y1="' + (bagY + bagH - fillH - 2) + '" x2="' + (bagX + bagW - 2) + '" y2="' + (bagY + bagH - fillH - 2) + '" stroke="' + strokeColor + '" stroke-width="1.5" stroke-dasharray="4 3" />' +
          bottlesMarkup +
          '<text x="' + (svgW / 2) + '" y="' + (bagY + bagH + 22) + '" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" fill="' + strokeColor + '">' +
            CabineOK.formatNum(totalStandardMl) + ' ml / 1 000 ml (' + Math.round((totalStandardMl / 1000) * 100) + ' %)' +
          '</text>' +
        '</svg>';
    }

    function render() {
      const standardItems = state.items.filter((i) => !i.exempt);
      const exemptItems = state.items.filter((i) => i.exempt);

      const totalStandardMl = standardItems.reduce((acc, i) => acc + Number(i.ml), 0);
      const over100Items = standardItems.filter((i) => Number(i.ml) > 100);
      const remaining = Math.max(0, 1000 - totalStandardMl);

      totalMlEl.textContent = CabineOK.formatNum(totalStandardMl) + ' ml';
      remainingMlEl.textContent = totalStandardMl <= 1000
        ? CabineOK.formatNum(remaining) + ' ml'
        : '-' + CabineOK.formatNum(totalStandardMl - 1000) + ' ml';
      countItemsEl.textContent = standardItems.length + (exemptItems.length ? ' (+' + exemptItems.length + ' ex.)' : '');

      const pct = Math.min(100, (totalStandardMl / 1000) * 100);
      meterFill.style.width = pct + '%';
      meterFill.className = 'meter-fill ' + (
        (totalStandardMl > 1000 || over100Items.length > 0)
          ? 'is-fail'
          : (totalStandardMl >= 850 ? 'is-warn' : 'is-ok')
      );

      // Verdict & alerts
      const alerts = [];
      if (over100Items.length > 0) {
        alerts.push(
          '<div class="callout callout-fail"><strong>Confiscation garantie au contrôle sûreté :</strong> ' +
          over100Items.map((i) => i.name + ' (' + i.ml + ' ml)').join(', ') +
          ' dépasse la limite absolue de <span class="mono">100 ml</span> par contenant. Même à moitié vide, un flacon gradué à plus de 100 ml est refusé !</div>'
        );
      }
      if (totalStandardMl > 1000) {
        alerts.push(
          '<div class="callout callout-fail"><strong>Capacité du sac 1 litre dépassée (+' + CabineOK.formatNum(totalStandardMl - 1000) + ' ml) :</strong> un seul sac plastique refermable d’un litre par passager est autorisé. Retirez ou transférez le surplus en soute.</div>'
        );
      }
      if (exemptItems.length > 0) {
        alerts.push(
          '<div class="callout"><strong>Produits dérogatoires déclarés (' + exemptItems.length + ') :</strong> les médicaments liquides (avec ordonnance) et aliments pour bébé passent hors du sac 1 litre, mais doivent être présentés séparément aux agents de sûreté.</div>'
        );
      }
      if (over100Items.length === 0 && totalStandardMl <= 1000) {
        alerts.push(
          '<div class="callout callout-ok"><strong>Trousse 100 % conforme sûreté aéroport :</strong> tous vos flacons respectent la limite individuelle de 100 ml et tiennent dans votre sac zip transparent de 1 litre (20×20 cm).</div>'
        );
      }

      if (over100Items.length > 0 || totalStandardMl > 1000) {
        verdictBadge.className = 'status-badge status-fail';
        verdictBadge.textContent = 'NON CONFORME';
      } else if (totalStandardMl >= 850) {
        verdictBadge.className = 'status-badge status-warn';
        verdictBadge.textContent = 'CONFORME (QUASI PLEIN)';
      } else {
        verdictBadge.className = 'status-badge status-ok';
        verdictBadge.textContent = 'CONFORME SÛRETÉ';
      }

      alertsWrap.innerHTML = alerts.join('');
      renderZipBagSVG(standardItems, totalStandardMl, over100Items.length > 0);

      // Render item rows
      itemsListEl.innerHTML = '';
      if (state.items.length === 0) {
        itemsListEl.innerHTML = '<div class="callout">Votre trousse est vide. Ajoutez des produits depuis la liste rapide ci-dessus ou via le formulaire personnalisé.</div>';
        return;
      }

      state.items.forEach((item) => {
        const isOver = !item.exempt && item.ml > 100;
        const row = document.createElement('div');
        row.className = 'item-row';
        if (isOver) {
          row.style.borderColor = 'var(--status-fail-border)';
          row.style.backgroundColor = 'var(--status-fail-bg)';
        }

        const badge = item.exempt
          ? '<span class="status-badge status-info">Dérogatoire</span>'
          : (isOver ? '<span class="status-badge status-fail">&gt; 100 ml</span>' : '<span class="status-badge status-ok">OK</span>');

        row.innerHTML =
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:700;color:var(--text-primary);">' + item.name.replace(/</g, '&lt;') + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">' + badge + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<input type="number" min="5" max="500" step="5" value="' + item.ml + '" class="form-input mono-input" style="width:92px;padding:6px 8px;" data-item-ml="' + item.uid + '" aria-label="Contenance en ml pour ' + item.name.replace(/"/g, '') + '">' +
            '<span class="mono" style="font-size:0.8125rem;color:var(--text-muted);">ml</span>' +
            '<button type="button" class="btn btn-danger-outline btn-sm" data-del-item="' + item.uid + '" aria-label="Supprimer">×</button>' +
          '</div>';
        itemsListEl.appendChild(row);
      });

      itemsListEl.querySelectorAll('input[data-item-ml]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const uid = Number(inp.getAttribute('data-item-ml'));
          const found = state.items.find((i) => i.uid === uid);
          if (found) {
            found.ml = Math.max(1, Math.min(1000, Number(inp.value) || 1));
            render();
          }
        });
      });

      itemsListEl.querySelectorAll('button[data-del-item]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uid = Number(btn.getAttribute('data-del-item'));
          state.items = state.items.filter((i) => i.uid !== uid);
          render();
        });
      });
    }

    addCustomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = customNameInput.value.trim() || 'Flacon personnalisé';
      const ml = Math.max(1, Math.min(1000, Number(customMlInput.value) || 50));
      const exempt = Boolean(customExemptInput.checked);
      state.items.push({ uid: nextUid++, name, ml, exempt });
      customNameInput.value = '';
      customMlInput.value = '50';
      customExemptInput.checked = false;
      render();
      CabineOK.showToast('Produit ajouté à la trousse (' + ml + ' ml).');
    });

    resetBtn.addEventListener('click', () => {
      state.items = [
        { uid: nextUid++, name: 'Shampoing format voyage', ml: 100, exempt: false },
        { uid: nextUid++, name: 'Dentifrice tube', ml: 75, exempt: false },
        { uid: nextUid++, name: 'Flacon de parfum', ml: 50, exempt: false },
        { uid: nextUid++, name: 'Crème solaire', ml: 100, exempt: false }
      ];
      render();
    });

    clearBtn.addEventListener('click', () => {
      state.items = [];
      render();
    });

    renderCatalog();
    render();
  });
})();
