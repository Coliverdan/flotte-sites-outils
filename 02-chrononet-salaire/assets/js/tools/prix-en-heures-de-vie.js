/* ==========================================================================
   CHRONONET — Outil 02 : Convertisseur Prix -> Heures & Jours de Vie
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const STORAGE_KEY = 'chrononet_prix_heures_liste_v1';

  const els = {
    modeBtns: document.querySelectorAll('[data-mode-btn]'),
    boxTaux: document.getElementById('pv-box-taux'),
    boxMensuel: document.getElementById('pv-box-mensuel'),
    tauxHoraire: document.getElementById('pv-taux-horaire'),
    salaireMensuel: document.getElementById('pv-salaire-mensuel'),
    heuresSemaine: document.getElementById('pv-heures-semaine'),
    heuresJour: document.getElementById('pv-heures-jour'),

    itemLabel: document.getElementById('pv-item-label'),
    itemPrice: document.getElementById('pv-item-price'),
    presets: document.querySelectorAll('[data-preset]'),
    btnAddList: document.getElementById('pv-add-list'),
    btnClearList: document.getElementById('pv-clear-list'),

    outHeures: document.getElementById('pv-out-heures'),
    outJours: document.getElementById('pv-out-jours'),
    outSemaines: document.getElementById('pv-out-semaines'),
    outPctMois: document.getElementById('pv-out-pct-mois'),
    outTauxEffectif: document.getElementById('pv-out-taux-effectif'),
    outItemSummary: document.getElementById('pv-out-summary'),

    savedContainer: document.getElementById('pv-saved-list'),
    savedTotal: document.getElementById('pv-saved-total'),
    canvas: document.getElementById('pv-chart')
  };

  if (!els.itemPrice) return;

  let mode = 'taux'; // 'taux' ou 'mensuel'
  let savedItems = loadSaved();

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [
          { id: 1, label: 'Smartphone neuf', price: 1200 },
          { id: 2, label: 'Loyer mensuel', price: 950 },
          { id: 3, label: 'Semaine de vacances', price: 1800 }
        ];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveList() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
    } catch (e) {
      /* stockage indisponible */
    }
  }

  function getHourlyRate() {
    if (mode === 'taux') {
      return CN.clamp(els.tauxHoraire.value, 1, 500);
    }
    const mensuel = CN.clamp(els.salaireMensuel.value, 300, 30000);
    const hSem = CN.clamp(els.heuresSemaine.value, 5, 70);
    return mensuel / ((hSem * 52) / 12);
  }

  function getMonthlyNet(rate) {
    if (mode === 'mensuel') {
      return CN.clamp(els.salaireMensuel.value, 300, 30000);
    }
    const hSem = CN.clamp(els.heuresSemaine.value, 5, 70);
    return rate * ((hSem * 52) / 12);
  }

  function formatDuration(hours) {
    if (hours < 1) {
      return Math.round(hours * 60) + ' min';
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return CN.fmtNum(h, 0) + ' h';
    if (m === 60) return CN.fmtNum(h + 1, 0) + ' h';
    return CN.fmtNum(h, 0) + ' h ' + String(m).padStart(2, '0') + ' min';
  }

  function drawChart(rate) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const currentPrice = CN.clamp(els.itemPrice.value, 0, 500000);
    const currentLabel = (els.itemLabel.value || 'Achat actuel').trim();

    const rows = [{ label: currentLabel + ' (actuel)', hours: currentPrice / rate, active: true }];
    savedItems.slice(0, 4).forEach(function (item) {
      rows.push({ label: item.label, hours: item.price / rate, active: false });
    });

    const maxH = Math.max.apply(null, rows.map(function (r) { return r.hours; }).concat([1])) * 1.15;
    const padL = 16;
    const padR = 92;
    const padT = 16;
    const step = (height - padT - 12) / Math.max(rows.length, 1);

    rows.forEach(function (r, idx) {
      const y = padT + idx * step;
      const maxW = Math.max(40, width - padL - padR);
      const w = Math.max(3, (r.hours / maxH) * maxW);

      ctx.fillStyle = r.active ? '#D9381E' : '#141413';
      ctx.font = (r.active ? '600 ' : '500 ') + '12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(r.label.slice(0, 34), padL, y);

      const barY = y + 17;
      const barH = Math.min(18, Math.max(12, step - 24));
      ctx.fillStyle = '#ECECE7';
      ctx.fillRect(padL, barY, maxW, barH);

      ctx.fillStyle = r.active ? '#D9381E' : '#141413';
      ctx.fillRect(padL, barY, w, barH);

      ctx.fillStyle = r.active ? '#D9381E' : '#141413';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN.fmtNum(r.hours, 1) + ' h', width - 12, barY + barH / 2);
    });
  }

  function renderSavedList(rate, hJour) {
    if (!els.savedContainer) return;
    if (savedItems.length === 0) {
      els.savedContainer.innerHTML =
        '<p class="field-hint">Aucun achat enregistré. Cliquez sur « Ajouter à ma liste » pour comparer plusieurs dépenses.</p>';
      els.savedTotal.textContent = '0 € • 0 h';
      return;
    }

    let totalPrice = 0;
    let html = '';
    savedItems.forEach(function (item) {
      totalPrice += item.price;
      const hrs = item.price / rate;
      const days = hrs / hJour;
      html +=
        '<div class="saved-row">' +
        '<strong>' + escapeHtml(item.label) + '</strong>' +
        '<span class="mono">' + CN.fmtEUR(item.price, 0) + '</span>' +
        '<span class="mono" style="color:var(--accent)">' + CN.fmtNum(hrs, 1) + ' h (' + CN.fmtNum(days, 1) + ' j)</span>' +
        '<button type="button" class="saved-del" data-del-id="' + item.id + '" aria-label="Supprimer ' + escapeHtml(item.label) + '">×</button>' +
        '</div>';
    });

    els.savedContainer.innerHTML = html;
    const totalH = totalPrice / rate;
    const totalDays = totalH / hJour;
    els.savedTotal.textContent =
      CN.fmtEUR(totalPrice, 0) + ' • ' + CN.fmtNum(totalH, 1) + ' h (' + CN.fmtNum(totalDays, 1) + ' j)';

    els.savedContainer.querySelectorAll('[data-del-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = Number(btn.getAttribute('data-del-id'));
        savedItems = savedItems.filter(function (it) { return it.id !== id; });
        saveList();
        render();
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render() {
    const rate = getHourlyRate();
    const hSem = CN.clamp(els.heuresSemaine.value, 5, 70);
    const hJour = CN.clamp(els.heuresJour.value, 1, 14);
    const price = CN.clamp(els.itemPrice.value, 0, 500000);
    const label = (els.itemLabel.value || 'Cet achat').trim();

    const hours = price / rate;
    const days = hours / hJour;
    const weeks = hours / hSem;
    const monthlyNet = getMonthlyNet(rate);
    const pctMois = (price / Math.max(1, monthlyNet)) * 100;

    els.outHeures.textContent = formatDuration(hours);
    els.outJours.textContent = CN.fmtNum(days, 1) + ' j';
    els.outSemaines.textContent = CN.fmtNum(weeks, 2) + ' sem.';
    els.outPctMois.textContent = CN.fmtPct(pctMois, 1);
    els.outTauxEffectif.textContent = CN.fmtEUR(rate, 2) + ' / h';
    els.outItemSummary.textContent =
      label + ' (' + CN.fmtEUR(price, 0) + ') représente ' + formatDuration(hours) +
      ' de travail net, soit ' + CN.fmtNum(days, 1) + ' journées de ' + hJour + 'h.';

    renderSavedList(rate, hJour);
    drawChart(rate);
  }

  els.modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.getAttribute('data-mode-btn');
      els.modeBtns.forEach(function (b) {
        const active = b.getAttribute('data-mode-btn') === mode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      els.boxTaux.style.display = mode === 'taux' ? 'block' : 'none';
      els.boxMensuel.style.display = mode === 'mensuel' ? 'block' : 'none';
      render();
    });
  });

  els.presets.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const label = btn.getAttribute('data-label');
      const price = btn.getAttribute('data-price');
      els.itemLabel.value = label;
      els.itemPrice.value = price;
      els.presets.forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      render();
    });
  });

  if (els.btnAddList) {
    els.btnAddList.addEventListener('click', function () {
      const price = CN.clamp(els.itemPrice.value, 1, 500000);
      const label = (els.itemLabel.value || 'Achat sans nom').trim();
      savedItems.unshift({ id: Date.now(), label: label, price: price });
      savedItems = savedItems.slice(0, 12);
      saveList();
      render();
      CN.toast('Ajouté à votre liste comparative.');
    });
  }

  if (els.btnClearList) {
    els.btnClearList.addEventListener('click', function () {
      savedItems = [];
      saveList();
      render();
      CN.toast('Liste comparative vidée.');
    });
  }

  [els.tauxHoraire, els.salaireMensuel, els.heuresSemaine, els.heuresJour, els.itemLabel, els.itemPrice].forEach(function (el) {
    if (el) el.addEventListener('input', render);
  });

  window.addEventListener('resize', render);
  render();
})();
