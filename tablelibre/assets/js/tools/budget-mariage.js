/**
 * TableLibre — Outil 03 : Simulateur & Suivi de Budget Mariage (Réel vs Prévu)
 * Ventilation automatique sur 12 postes réalistes, suivi réel engagé, graphique Canvas, localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tablelibre_budget_v1';

  const DEFAULT_CATEGORIES = [
    { id: 'traiteur', name: 'Traiteur & boissons', pct: 38, color: '#2D5A43', status: 'Devis reçu' },
    { id: 'lieu', name: 'Lieu de réception & location', pct: 15, color: '#4E7D63', status: 'Acompte versé' },
    { id: 'photo', name: 'Photographe & vidéaste', pct: 10, color: '#181715', status: 'Devis reçu' },
    { id: 'tenues', name: 'Tenues, mise en beauté & accessoires', pct: 9, color: '#6E5A4F', status: 'À chiffrer' },
    { id: 'musique', name: 'DJ, groupe & sonorisation', pct: 7, color: '#8C6D46', status: 'À chiffrer' },
    { id: 'fleurs', name: 'Fleurs & scénographie', pct: 7, color: '#7D8E71', status: 'À chiffrer' },
    { id: 'imprevus', name: 'Réserve & imprévus', pct: 5, color: '#A59D90', status: 'Réserve' },
    { id: 'alliances', name: 'Alliances & joaillerie', pct: 3, color: '#B48853', status: 'À chiffrer' },
    { id: 'papeterie', name: 'Papeterie, faire-part & menus', pct: 2, color: '#5C7C89', status: 'À chiffrer' },
    { id: 'ceremonie', name: 'Cérémonie & officiant', pct: 1.5, color: '#7B6D8D', status: 'À chiffrer' },
    { id: 'cadeaux', name: 'Cadeaux invités', pct: 1.5, color: '#9C6A64', status: 'À chiffrer' },
    { id: 'logistique', name: 'Transport, baby-sitter & divers', pct: 1, color: '#C1B9AC', status: 'À chiffrer' }
  ];

  const STATUS_OPTIONS = ['À chiffrer', 'Devis reçu', 'Acompte versé', 'Soldé', 'Réserve'];

  let state = {
    totalBudget: 18000,
    guests: 90,
    items: []
  };

  function buildDefaultItems(totalBudget) {
    return DEFAULT_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      pct: c.pct,
      color: c.color,
      planned: Math.round((totalBudget * c.pct) / 100),
      actual: 0,
      status: c.status
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          state = parsed;
          return;
        }
      }
    } catch (e) {
      // Fallback
    }
    state.items = buildDefaultItems(state.totalBudget);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore
    }
  }

  function drawDonut(canvas, items, mode) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#F8F6F1';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const outerR = Math.min(W, H) * 0.42;
    const innerR = outerR * 0.58;

    const values = items.map((it) => Math.max(0, mode === 'actual' ? it.actual : it.planned));
    const total = values.reduce((a, b) => a + b, 0);

    if (total <= 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = '#E3DDD2';
      ctx.fill();
    } else {
      let startAngle = -Math.PI / 2;
      items.forEach((it, idx) => {
        const val = values[idx];
        if (val <= 0) return;
        const slice = (val / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
        ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = it.color || '#2D5A43';
        ctx.fill();
        startAngle += slice;
      });
    }

    // Centre
    ctx.fillStyle = '#5C5852';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mode === 'actual' ? 'ENGAGÉ RÉEL' : 'BUDGET PRÉVU', cx, cy - 10);

    ctx.fillStyle = '#181715';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(window.TableLibre.formatEuro(total, 0), cx, cy + 18);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('budget-app')) return;

    const totalInput = document.getElementById('budget-total');
    const guestsInput = document.getElementById('budget-guests');
    const recalcBtn = document.getElementById('budget-recalc-btn');
    const resetBtn = document.getElementById('budget-reset-btn');
    const exportPngBtn = document.getElementById('budget-png-btn');
    const tbody = document.getElementById('budget-tbody');
    const chartCanvas = document.getElementById('budget-chart');
    const legendEl = document.getElementById('budget-legend');

    const kpiPlanned = document.getElementById('kpi-planned');
    const kpiActual = document.getElementById('kpi-actual');
    const kpiRemaining = document.getElementById('kpi-remaining');
    const kpiRemainingBox = document.getElementById('kpi-remaining-box');
    const kpiPerGuest = document.getElementById('kpi-budget-guest');
    const progressFill = document.getElementById('budget-progress-fill');
    const progressLabel = document.getElementById('budget-progress-label');

    let chartMode = 'planned';

    loadState();
    totalInput.value = state.totalBudget;
    guestsInput.value = state.guests;

    function render() {
      const totalPlanned = state.items.reduce((s, it) => s + (Number(it.planned) || 0), 0);
      const totalActual = state.items.reduce((s, it) => s + (Number(it.actual) || 0), 0);
      const remaining = state.totalBudget - totalActual;
      const guests = Math.max(1, Number(state.guests) || 1);

      kpiPlanned.textContent = window.TableLibre.formatEuro(totalPlanned, 0);
      kpiActual.textContent = window.TableLibre.formatEuro(totalActual, 0);
      kpiRemaining.textContent = window.TableLibre.formatEuro(remaining, 0);
      kpiPerGuest.textContent = window.TableLibre.formatEuro(state.totalBudget / guests, 0);

      if (remaining < 0) {
        kpiRemainingBox.classList.add('kpi-box--alert');
      } else {
        kpiRemainingBox.classList.remove('kpi-box--alert');
      }

      const pctUsed = state.totalBudget > 0 ? Math.min(100, Math.round((totalActual / state.totalBudget) * 100)) : 0;
      progressFill.style.width = pctUsed + '%';
      progressFill.classList.toggle('progress-fill--alert', totalActual > state.totalBudget);
      progressLabel.textContent = `${pctUsed} % du budget cible engagé (${window.TableLibre.formatEuro(totalActual, 0)} / ${window.TableLibre.formatEuro(state.totalBudget, 0)})`;

      tbody.innerHTML = state.items.map((it) => {
        const diff = (Number(it.planned) || 0) - (Number(it.actual) || 0);
        const share = totalPlanned > 0 ? ((it.planned / totalPlanned) * 100).toFixed(1).replace('.', ',') : '0';
        const diffColor = diff < 0 ? 'color:var(--alert-conflict);font-weight:600;' : 'color:var(--accent-sage);';
        return `
          <tr>
            <td>
              <span style="display:inline-block;width:10px;height:10px;background:${it.color};border-radius:2px;margin-right:8px;"></span>
              <strong>${window.TableLibre.escapeHTML(it.name)}</strong>
              <span class="field__hint">(${share} %)</span>
            </td>
            <td class="num">
              <input type="number" min="0" step="50" class="input input--mono" style="width:110px;padding:6px 8px;text-align:right;" value="${it.planned}" data-field="planned" data-id="${it.id}" aria-label="Prévu ${window.TableLibre.escapeHTML(it.name)}">
            </td>
            <td class="num">
              <input type="number" min="0" step="50" class="input input--mono" style="width:110px;padding:6px 8px;text-align:right;" value="${it.actual}" data-field="actual" data-id="${it.id}" aria-label="Réel ${window.TableLibre.escapeHTML(it.name)}">
            </td>
            <td class="num" style="${diffColor}">${diff >= 0 ? '+' : ''}${window.TableLibre.formatEuro(diff, 0)}</td>
            <td>
              <select class="select" style="padding:6px 8px;font-size:0.84rem;" data-field="status" data-id="${it.id}" aria-label="Statut ${window.TableLibre.escapeHTML(it.name)}">
                ${STATUS_OPTIONS.map((opt) => `<option value="${opt}" ${it.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('change', () => {
          const id = el.getAttribute('data-id');
          const field = el.getAttribute('data-field');
          const item = state.items.find((x) => x.id === id);
          if (!item) return;
          if (field === 'status') {
            item.status = el.value;
          } else {
            const n = parseFloat(el.value);
            item[field] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
          }
          saveState();
          render();
        });
      });

      drawDonut(chartCanvas, state.items, chartMode);

      legendEl.innerHTML = state.items.map((it) => {
        const val = chartMode === 'actual' ? it.actual : it.planned;
        return `
          <div class="chart-legend__item">
            <span class="chart-legend__swatch" style="background:${it.color};"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window.TableLibre.escapeHTML(it.name)}</span>
            <span class="mono">${window.TableLibre.formatEuro(val, 0)}</span>
          </div>
        `;
      }).join('');
    }

    totalInput.addEventListener('change', () => {
      const val = parseInt(totalInput.value, 10);
      state.totalBudget = Number.isFinite(val) && val > 0 ? val : 15000;
      saveState();
      render();
    });

    guestsInput.addEventListener('change', () => {
      const val = parseInt(guestsInput.value, 10);
      state.guests = Number.isFinite(val) && val > 0 ? val : 80;
      saveState();
      render();
    });

    recalcBtn.addEventListener('click', () => {
      const val = parseInt(totalInput.value, 10);
      state.totalBudget = Number.isFinite(val) && val > 0 ? val : 18000;
      state.items.forEach((it) => {
        const def = DEFAULT_CATEGORIES.find((d) => d.id === it.id);
        if (def) {
          it.planned = Math.round((state.totalBudget * def.pct) / 100);
        }
      });
      saveState();
      render();
      window.TableLibre.showToast('Postes ventilés selon les ratios moyens d’un mariage français.');
    });

    resetBtn.addEventListener('click', () => {
      state.totalBudget = 18000;
      state.guests = 90;
      state.items = buildDefaultItems(18000);
      totalInput.value = 18000;
      guestsInput.value = 90;
      saveState();
      render();
      window.TableLibre.showToast('Simulateur remis à zéro.');
    });

    document.querySelectorAll('[data-chart-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chartMode = btn.getAttribute('data-chart-mode');
        document.querySelectorAll('[data-chart-mode]').forEach((b) => b.classList.toggle('is-active', b === btn));
        render();
      });
    });

    exportPngBtn.addEventListener('click', () => {
      window.TableLibre.downloadCanvasPNG(chartCanvas, 'repartition-budget-mariage.png');
    });

    render();
  });
})();
