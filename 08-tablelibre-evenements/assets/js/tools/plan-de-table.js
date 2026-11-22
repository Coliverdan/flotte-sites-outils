/**
 * TableLibre — Outil 01 : Éditeur Visuel de Plan de Table Drag-and-Drop
 * 100 % client-side, localStorage, partage URL encodé, détecteur de conflits, export PNG haute résolution.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tablelibre_seating_plan_v1';

  const TABLE_PRESETS = {
    'round-8': { label: 'Ronde 8 pl.', shape: 'round', capacity: 8 },
    'round-10': { label: 'Ronde 10 pl.', shape: 'round', capacity: 10 },
    'rect-6': { label: 'Rectangulaire 6 pl.', shape: 'rect', capacity: 6 },
    'rect-8': { label: 'Rectangulaire 8 pl.', shape: 'rect', capacity: 8 },
    'rect-12': { label: 'Rectangulaire 12 pl.', shape: 'rect', capacity: 12 },
    'honor-8': { label: "Table d'honneur (8 pl.)", shape: 'honor', capacity: 8 }
  };

  const GROUPS = {
    'famille-mariee': 'Famille Mariée',
    'famille-marie': 'Famille Marié',
    'amis': 'Amis',
    'enfants': 'Enfants',
    'collegues': 'Collègues'
  };

  const DIETS = {
    'standard': '',
    'vege': 'Végétarien',
    'sans-gluten': 'Sans gluten',
    'allergie': 'Allergie'
  };

  let state = {
    eventTitle: 'Mariage de Camille & Thomas',
    tables: [],
    guests: [],
    conflicts: []
  };

  let selectedGuestId = null;
  let filterGroup = 'all';
  let searchQuery = '';

  const els = {};

  function uid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 9);
  }

  function encodeStateToHash(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return '#plan=' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeStateFromHash(hash) {
    if (!hash || !hash.startsWith('#plan=')) return null;
    try {
      let b64 = hash.slice(6).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const json = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(json);
      if (parsed && Array.isArray(parsed.tables) && Array.isArray(parsed.guests)) {
        return parsed;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore quota errors
    }
  }

  function loadInitialState() {
    const fromHash = decodeStateFromHash(window.location.hash);
    if (fromHash) {
      state = {
        eventTitle: fromHash.eventTitle || 'Mon plan de table',
        tables: fromHash.tables || [],
        guests: fromHash.guests || [],
        conflicts: fromHash.conflicts || []
      };
      saveState();
      if (window.TableLibre) {
        window.TableLibre.showToast('Plan de table chargé depuis le lien partagé.');
      }
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tables)) {
          state = {
            eventTitle: parsed.eventTitle || 'Mon plan de table',
            tables: parsed.tables || [],
            guests: parsed.guests || [],
            conflicts: parsed.conflicts || []
          };
          return;
        }
      }
    } catch (e) {
      // Fallback to default
    }

    loadSampleWedding(false);
  }

  function loadSampleWedding(notify = true) {
    const tHonor = { id: 't_h', name: "Table d'Honneur — Olivier", shape: 'honor', capacity: 8, x: 250, y: 24 };
    const t1 = { id: 't_1', name: 'Table Lavande', shape: 'round', capacity: 8, x: 24, y: 210 };
    const t2 = { id: 't_2', name: 'Table Romarin', shape: 'round', capacity: 8, x: 280, y: 210 };
    const t3 = { id: 't_3', name: 'Table Sauge', shape: 'round', capacity: 8, x: 536, y: 210 };
    const t4 = { id: 't_4', name: 'Table Verveine', shape: 'rect', capacity: 8, x: 24, y: 470 };
    const t5 = { id: 't_5', name: 'Table Figuier', shape: 'rect', capacity: 8, x: 280, y: 470 };
    const t6 = { id: 't_6', name: 'Table Enfants & Ados', shape: 'rect', capacity: 8, x: 536, y: 470 };

    const rawGuests = [
      // Table d'honneur (8)
      ['Camille Laurent', 'famille-mariee', 'standard', 't_h'],
      ['Thomas Moreau', 'famille-marie', 'standard', 't_h'],
      ['Sophie Laurent (Témoin)', 'famille-mariee', 'vege', 't_h'],
      ['Julien Fabre (Témoin)', 'amis', 'standard', 't_h'],
      ['Claire Mercier (Témoin)', 'amis', 'standard', 't_h'],
      ['Antoine Moreau (Témoin)', 'famille-marie', 'standard', 't_h'],
      ['Léa Girard', 'amis', 'sans-gluten', 't_h'],
      ['Maxime Perrin', 'amis', 'standard', 't_h'],
      // Table Lavande (8)
      ['Hélène Laurent', 'famille-mariee', 'standard', 't_1'],
      ['Pierre Laurent', 'famille-mariee', 'standard', 't_1'],
      ['Oncle Jean', 'famille-mariee', 'standard', 't_1'],
      ['Colette Bernard', 'famille-mariee', 'standard', 't_1'],
      ['Michel Bernard', 'famille-mariee', 'standard', 't_1'],
      ['Nadine Roussel', 'famille-mariee', 'vege', 't_1'],
      ['Gérard Roussel', 'famille-mariee', 'standard', 't_1'],
      ['Lucie Fontaine', 'famille-mariee', 'standard', 't_1'],
      // Table Romarin (8)
      ['Martine Moreau', 'famille-marie', 'standard', 't_2'],
      ['Alain Moreau', 'famille-marie', 'standard', 't_2'],
      ['Tante Marie', 'famille-marie', 'standard', 't_2'],
      ['Patrick Chevalier', 'famille-marie', 'standard', 't_2'],
      ['Françoise Chevalier', 'famille-marie', 'sans-gluten', 't_2'],
      ['Jacques Lemaire', 'famille-marie', 'standard', 't_2'],
      ['Odile Lemaire', 'famille-marie', 'standard', 't_2'],
      ['Sébastien Moreau', 'famille-marie', 'standard', 't_2'],
      // Table Sauge (8)
      ['Manon Lefèvre', 'amis', 'vege', 't_3'],
      ['Hugo Lefèvre', 'amis', 'standard', 't_3'],
      ['Chloé Gauthier', 'amis', 'standard', 't_3'],
      ['Romain Blanc', 'amis', 'standard', 't_3'],
      ['Inès Benali', 'amis', 'vege', 't_3'],
      ['Nicolas Garnier', 'amis', 'standard', 't_3'],
      ['Élodie Boyer', 'amis', 'allergie', 't_3'],
      ['Kévin Roche', 'amis', 'standard', 't_3'],
      // Table Verveine (8)
      ['Pauline Simon', 'collegues', 'standard', 't_4'],
      ['Matthieu Faure', 'collegues', 'standard', 't_4'],
      ['Céline André', 'collegues', 'vege', 't_4'],
      ['Guillaume Denis', 'collegues', 'standard', 't_4'],
      ['Audrey Lacroix', 'amis', 'standard', 't_4'],
      ['Vincent Barbier', 'amis', 'standard', 't_4'],
      ['Amélie Brun', 'collegues', 'standard', 't_4'],
      ['Benoît Arnaud', 'collegues', 'standard', 't_4'],
      // Table Figuier (4 placés, 4 invités à placer pour tester le drag & drop)
      ['Mathilde Renaud', 'amis', 'standard', 't_5'],
      ['Florian Guerin', 'amis', 'standard', 't_5'],
      ['Sarah Vidal', 'amis', 'vege', 't_5'],
      ['Damien Carpentier', 'amis', 'standard', 't_5'],
      // Non placés (4)
      ['Léo Laurent', 'enfants', 'standard', null],
      ['Emma Moreau', 'enfants', 'allergie', null],
      ['Jules Lefèvre', 'enfants', 'standard', null],
      ['Chloé Bernard', 'enfants', 'standard', null]
    ];

    const guests = rawGuests.map((g, idx) => ({
      id: 'g_' + (idx + 1),
      name: g[0],
      group: g[1],
      diet: g[2],
      tableId: g[3]
    }));

    state = {
      eventTitle: 'Mariage de Camille & Thomas',
      tables: [tHonor, t1, t2, t3, t4, t5, t6],
      guests,
      conflicts: [
        { id: 'c_1', guestA: 'g_11', guestB: 'g_19' }, // Oncle Jean ≠ Tante Marie
        { id: 'c_2', guestA: 'g_28', guestB: 'g_32' }  // Romain Blanc ≠ Kévin Roche (volontairement à la même table pour illustrer l'alerte ou distinct)
      ]
    };
    // Ajustons le conflit c_2 sur deux personnes de tables différentes afin que l'exemple démarre propre
    state.conflicts[1] = { id: 'c_2', guestA: 'g_28', guestB: 'g_38' };

    selectedGuestId = null;
    saveState();
    renderAll();
    if (notify && window.TableLibre) {
      window.TableLibre.showToast('Mariage exemple chargé (48 invités, 7 tables, 2 règles de conflit).');
    }
  }

  function getActiveConflicts() {
    const active = [];
    state.conflicts.forEach((c) => {
      const gA = state.guests.find((g) => g.id === c.guestA);
      const gB = state.guests.find((g) => g.id === c.guestB);
      if (gA && gB && gA.tableId && gA.tableId === gB.tableId) {
        const table = state.tables.find((t) => t.id === gA.tableId);
        active.push({
          conflictId: c.id,
          tableId: gA.tableId,
          tableName: table ? table.name : 'Table',
          guestA: gA,
          guestB: gB
        });
      }
    });
    return active;
  }

  function assignGuestToTable(guestId, tableId) {
    const guest = state.guests.find((g) => g.id === guestId);
    if (!guest) return;

    if (tableId !== null) {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      const seated = state.guests.filter((g) => g.tableId === tableId && g.id !== guestId);
      if (seated.length >= table.capacity) {
        window.TableLibre.showToast(`La table « ${table.name} » est complète (${table.capacity} places).`);
        return;
      }
    }

    guest.tableId = tableId;
    selectedGuestId = null;
    saveState();
    renderAll();

    const activeConflicts = getActiveConflicts();
    const hit = activeConflicts.find((c) => c.guestA.id === guestId || c.guestB.id === guestId);
    if (hit) {
      window.TableLibre.showToast(`Conflit détecté sur ${hit.tableName} : ${hit.guestA.name} ≠ ${hit.guestB.name}`);
    }
  }

  function addTable(presetKey, customName) {
    const preset = TABLE_PRESETS[presetKey] || TABLE_PRESETS['round-8'];
    const idx = state.tables.length + 1;
    const col = (state.tables.length) % 3;
    const row = Math.floor(state.tables.length / 3);
    const table = {
      id: uid('t'),
      name: (customName || '').trim() || `Table n°${idx}`,
      shape: preset.shape,
      capacity: preset.capacity,
      x: 24 + col * 256,
      y: 24 + row * 240
    };
    state.tables.push(table);
    saveState();
    renderAll();
    window.TableLibre.showToast(`Table « ${table.name} » ajoutée.`);
  }

  function deleteTable(tableId) {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;
    state.guests.forEach((g) => {
      if (g.tableId === tableId) g.tableId = null;
    });
    state.tables = state.tables.filter((t) => t.id !== tableId);
    saveState();
    renderAll();
    window.TableLibre.showToast(`Table « ${table.name} » supprimée (invités replacés en attente).`);
  }

  function addSingleGuest(name, group, diet) {
    const clean = name.trim();
    if (!clean) return;
    state.guests.push({
      id: uid('g'),
      name: clean,
      group: group || 'amis',
      diet: diet || 'standard',
      tableId: null
    });
    saveState();
    renderAll();
  }

  function importBulkGuests(rawText, group) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (!lines.length) return;
    lines.forEach((line) => {
      let diet = 'standard';
      let cleanName = line;
      if (/\(v[eé]g[eé]/i.test(line)) {
        diet = 'vege';
      } else if (/allerg/i.test(line)) {
        diet = 'allergie';
      } else if (/gluten/i.test(line)) {
        diet = 'sans-gluten';
      }
      state.guests.push({
        id: uid('g'),
        name: cleanName,
        group: group || 'amis',
        diet,
        tableId: null
      });
    });
    saveState();
    renderAll();
    window.TableLibre.showToast(`${lines.length} invité(s) importé(s) dans la liste.`);
  }

  function deleteGuest(guestId) {
    state.guests = state.guests.filter((g) => g.id !== guestId);
    state.conflicts = state.conflicts.filter((c) => c.guestA !== guestId && c.guestB !== guestId);
    if (selectedGuestId === guestId) selectedGuestId = null;
    saveState();
    renderAll();
  }

  function addConflict(guestA, guestB) {
    if (!guestA || !guestB || guestA === guestB) {
      window.TableLibre.showToast('Sélectionnez deux invités différents.');
      return;
    }
    const exists = state.conflicts.some(
      (c) => (c.guestA === guestA && c.guestB === guestB) || (c.guestA === guestB && c.guestB === guestA)
    );
    if (exists) {
      window.TableLibre.showToast('Cette règle de séparation existe déjà.');
      return;
    }
    state.conflicts.push({ id: uid('c'), guestA, guestB });
    saveState();
    renderAll();
    window.TableLibre.showToast('Règle de séparation ajoutée.');
  }

  function removeConflict(conflictId) {
    state.conflicts = state.conflicts.filter((c) => c.id !== conflictId);
    saveState();
    renderAll();
  }

  function autoArrangeTables() {
    const honorTables = state.tables.filter((t) => t.shape === 'honor');
    const others = state.tables.filter((t) => t.shape !== 'honor');
    let yOffset = 24;
    honorTables.forEach((t, i) => {
      t.x = 240 + i * 300;
      t.y = yOffset;
    });
    if (honorTables.length) yOffset = 220;
    others.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      t.x = 24 + col * 256;
      t.y = yOffset + row * 260;
    });
    saveState();
    renderRoom();
    window.TableLibre.showToast('Tables réalignées sur la grille.');
  }

  function renderKPIs(activeConflicts) {
    const totalGuests = state.guests.length;
    const seatedGuests = state.guests.filter((g) => g.tableId !== null).length;
    const totalSeats = state.tables.reduce((acc, t) => acc + t.capacity, 0);
    const specialDiets = state.guests.filter((g) => g.diet && g.diet !== 'standard').length;

    els.kpiSeated.textContent = `${seatedGuests} / ${totalGuests}`;
    els.kpiCapacity.textContent = `${totalSeats} places`;
    els.kpiTables.textContent = String(state.tables.length);
    els.kpiConflicts.textContent = String(activeConflicts.length);
    els.kpiDietsNote.textContent = `${specialDiets} régime(s) spécifique(s)`;

    if (activeConflicts.length > 0) {
      els.kpiConflictBox.classList.add('kpi-box--alert');
      els.conflictBanner.classList.add('is-visible');
      els.conflictBanner.innerHTML =
        `<strong>Alerte conflit (${activeConflicts.length}) :</strong> ` +
        activeConflicts.map((c) => `${window.TableLibre.escapeHTML(c.guestA.name)} ≠ ${window.TableLibre.escapeHTML(c.guestB.name)} (${window.TableLibre.escapeHTML(c.tableName)})`).join(' • ');
    } else {
      els.kpiConflictBox.classList.remove('kpi-box--alert');
      els.conflictBanner.classList.remove('is-visible');
      els.conflictBanner.innerHTML = '';
    }
  }

  function renderGuestList() {
    const unseated = state.guests.filter((g) => g.tableId === null);
    const filtered = unseated.filter((g) => {
      const matchGroup = filterGroup === 'all' || g.group === filterGroup;
      const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });

    els.unseatedCount.textContent = String(unseated.length);

    if (filtered.length === 0) {
      els.guestList.innerHTML = `<div class="field__hint" style="padding:12px 4px;">${unseated.length === 0 ? 'Tous vos invités sont placés à table.' : 'Aucun invité en attente ne correspond à ce filtre.'}</div>`;
      return;
    }

    els.guestList.innerHTML = filtered.map((g) => {
      const isSel = selectedGuestId === g.id;
      const dietTag = DIETS[g.diet] ? ` • ${DIETS[g.diet]}` : '';
      return `
        <div class="guest-chip ${isSel ? 'is-selected' : ''}" draggable="true" data-guest-id="${g.id}">
          <div class="guest-chip__info">
            <span class="guest-chip__name">${window.TableLibre.escapeHTML(g.name)}</span>
            <span class="guest-chip__meta">${window.TableLibre.escapeHTML(GROUPS[g.group] || g.group)}${window.TableLibre.escapeHTML(dietTag)}</span>
          </div>
          <div class="guest-chip__actions">
            <button type="button" class="icon-btn" data-select-guest="${g.id}" title="Sélectionner pour placement rapide">${isSel ? '✓' : '+'}</button>
            <button type="button" class="icon-btn icon-btn--danger" data-delete-guest="${g.id}" title="Supprimer">×</button>
          </div>
        </div>
      `;
    }).join('');

    els.guestList.querySelectorAll('.guest-chip').forEach((chip) => {
      const id = chip.getAttribute('data-guest-id');
      chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    els.guestList.querySelectorAll('[data-select-guest]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-select-guest');
        selectedGuestId = selectedGuestId === id ? null : id;
        renderGuestList();
        renderRoom();
      });
    });

    els.guestList.querySelectorAll('[data-delete-guest]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteGuest(btn.getAttribute('data-delete-guest'));
      });
    });
  }

  function renderConflictControls(activeConflicts) {
    const activeIds = new Set(activeConflicts.map((c) => c.conflictId));
    const options = '<option value="">— Choisir un invité —</option>' +
      state.guests
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((g) => `<option value="${g.id}">${window.TableLibre.escapeHTML(g.name)}</option>`)
        .join('');

    const prevA = els.conflictA.value;
    const prevB = els.conflictB.value;
    els.conflictA.innerHTML = options;
    els.conflictB.innerHTML = options;
    els.conflictA.value = prevA;
    els.conflictB.value = prevB;

    if (state.conflicts.length === 0) {
      els.conflictList.innerHTML = '<div class="field__hint">Aucune incompatibilité définie.</div>';
      return;
    }

    els.conflictList.innerHTML = state.conflicts.map((c) => {
      const gA = state.guests.find((g) => g.id === c.guestA);
      const gB = state.guests.find((g) => g.id === c.guestB);
      if (!gA || !gB) return '';
      const triggered = activeIds.has(c.id);
      return `
        <div class="conflict-pill ${triggered ? 'is-triggered' : ''}">
          <span>${window.TableLibre.escapeHTML(gA.name)} ≠ ${window.TableLibre.escapeHTML(gB.name)}</span>
          <button type="button" class="icon-btn icon-btn--danger" data-remove-conflict="${c.id}" title="Supprimer la règle">×</button>
        </div>
      `;
    }).join('');

    els.conflictList.querySelectorAll('[data-remove-conflict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeConflict(btn.getAttribute('data-remove-conflict'));
      });
    });
  }

  function renderRoom() {
    const activeConflicts = getActiveConflicts();
    const conflictByTable = {};
    const conflictingGuestIds = new Set();
    activeConflicts.forEach((c) => {
      if (!conflictByTable[c.tableId]) conflictByTable[c.tableId] = [];
      conflictByTable[c.tableId].push(`${c.guestA.name} ≠ ${c.guestB.name}`);
      conflictingGuestIds.add(c.guestA.id);
      conflictingGuestIds.add(c.guestB.id);
    });

    // Ajuster la hauteur de la salle dynamiquement
    let maxY = 580;
    let maxX = 760;
    state.tables.forEach((t) => {
      if (t.y + 300 > maxY) maxY = t.y + 300;
      if (t.x + 280 > maxX) maxX = t.x + 280;
    });
    els.roomGrid.style.minHeight = maxY + 'px';
    els.roomGrid.style.minWidth = maxX + 'px';

    els.roomGrid.innerHTML = state.tables.map((t) => {
      const seated = state.guests.filter((g) => g.tableId === t.id);
      const tableConflicts = conflictByTable[t.id] || [];
      const classes = ['table-node'];
      if (t.shape === 'round') classes.push('is-round');
      if (t.shape === 'honor') classes.push('is-honor');
      if (tableConflicts.length > 0) classes.push('has-conflict');

      const seatsHTML = seated.length > 0
        ? seated.map((g) => {
            const isConf = conflictingGuestIds.has(g.id);
            const dietBadge = DIETS[g.diet] ? ` (${DIETS[g.diet]})` : '';
            return `
              <div class="table-seat-item ${isConf ? 'is-conflict' : ''}" draggable="true" data-guest-id="${g.id}">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window.TableLibre.escapeHTML(g.name)}<small style="color:var(--ink-tertiary);">${window.TableLibre.escapeHTML(dietBadge)}</small></span>
                <button type="button" class="icon-btn" data-unseat-guest="${g.id}" title="Retirer de cette table">×</button>
              </div>
            `;
          }).join('')
        : '<div class="field__hint" style="padding:14px 4px;text-align:center;">Glissez un invité ici</div>';

      const quickPlaceBtn = selectedGuestId && seated.length < t.capacity
        ? `<button type="button" class="btn btn--primary btn--sm" style="width:100%;margin-top:4px;" data-quick-place="${t.id}">+ Placer ici</button>`
        : '';

      const alertHTML = tableConflicts.length > 0
        ? `<div class="table-node__alert">Conflit : ${window.TableLibre.escapeHTML(tableConflicts.join(', '))}</div>`
        : '';

      return `
        <div class="${classes.join(' ')}" data-table-id="${t.id}" style="left:${t.x}px;top:${t.y}px;">
          <div class="table-node__head" data-drag-table="${t.id}" title="Maintenir et glisser pour déplacer la table">
            <input type="text" class="table-node__name" value="${window.TableLibre.escapeHTML(t.name)}" data-rename-table="${t.id}" aria-label="Nom de la table">
            <span class="table-node__cap">${seated.length}/${t.capacity}</span>
          </div>
          <div class="table-node__body">
            ${seatsHTML}
            ${quickPlaceBtn}
            ${alertHTML}
          </div>
          <div class="table-node__foot">
            <span>${t.shape === 'honor' ? "Table d'honneur" : (t.shape === 'round' ? 'Table ronde' : 'Table rectangulaire')}</span>
            <button type="button" class="icon-btn icon-btn--danger" data-delete-table="${t.id}" title="Supprimer cette table">Suppr.</button>
          </div>
        </div>
      `;
    }).join('');

    // Drop zones & guest drag from tables
    els.roomGrid.querySelectorAll('.table-node').forEach((node) => {
      const tableId = node.getAttribute('data-table-id');

      node.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        node.classList.add('is-dragover');
      });

      node.addEventListener('dragleave', () => {
        node.classList.remove('is-dragover');
      });

      node.addEventListener('drop', (e) => {
        e.preventDefault();
        node.classList.remove('is-dragover');
        const guestId = e.dataTransfer.getData('text/plain');
        if (guestId) {
          assignGuestToTable(guestId, tableId);
        }
      });
    });

    els.roomGrid.querySelectorAll('.table-seat-item').forEach((seat) => {
      const gid = seat.getAttribute('data-guest-id');
      seat.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', gid);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    els.roomGrid.querySelectorAll('[data-unseat-guest]').forEach((btn) => {
      btn.addEventListener('click', () => {
        assignGuestToTable(btn.getAttribute('data-unseat-guest'), null);
      });
    });

    els.roomGrid.querySelectorAll('[data-quick-place]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (selectedGuestId) {
          assignGuestToTable(selectedGuestId, btn.getAttribute('data-quick-place'));
        }
      });
    });

    els.roomGrid.querySelectorAll('[data-delete-table]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteTable(btn.getAttribute('data-delete-table'));
      });
    });

    els.roomGrid.querySelectorAll('[data-rename-table]').forEach((input) => {
      input.addEventListener('mousedown', (e) => e.stopPropagation());
      input.addEventListener('change', () => {
        const tid = input.getAttribute('data-rename-table');
        const table = state.tables.find((t) => t.id === tid);
        if (table && input.value.trim()) {
          table.name = input.value.trim();
          saveState();
        }
      });
    });

    // Déplacement libre des tables sur le plan de salle
    els.roomGrid.querySelectorAll('[data-drag-table]').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        e.preventDefault();
        const tid = handle.getAttribute('data-drag-table');
        const node = handle.closest('.table-node');
        const table = state.tables.find((t) => t.id === tid);
        if (!node || !table) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const origX = table.x;
        const origY = table.y;
        node.style.zIndex = '20';

        function onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          table.x = Math.max(8, Math.round((origX + dx) / 8) * 8);
          table.y = Math.max(8, Math.round((origY + dy) / 8) * 8);
          node.style.left = table.x + 'px';
          node.style.top = table.y + 'px';
        }

        function onUp() {
          node.style.zIndex = '2';
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          saveState();
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    });
  }

  function renderAll() {
    els.eventTitleInput.value = state.eventTitle;
    const activeConflicts = getActiveConflicts();
    renderKPIs(activeConflicts);
    renderGuestList();
    renderConflictControls(activeConflicts);
    renderRoom();
  }

  function exportHighResPNG() {
    const canvas = document.createElement('canvas');
    const W = 2400;
    const H = 1680;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fond parchemin papeterie
    ctx.fillStyle = '#F8F6F1';
    ctx.fillRect(0, 0, W, H);

    // Cadre éditorial fin
    ctx.strokeStyle = '#C9C0B1';
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // En-tête
    ctx.fillStyle = '#2D5A43';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('PLAN DE TABLE • ATELIER TABLELIBRE.FR', 96, 118);

    ctx.fillStyle = '#181715';
    ctx.font = '700 64px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(state.eventTitle || 'Plan de Table', 96, 188);

    const seatedCount = state.guests.filter((g) => g.tableId !== null).length;
    ctx.fillStyle = '#5C5852';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${state.tables.length} tables • ${seatedCount} invités placés / ${state.guests.length} au total`, 96, 232);

    ctx.strokeStyle = '#E3DDD2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 260);
    ctx.lineTo(W - 96, 260);
    ctx.stroke();

    // Calcul échelle pour mapper les positions des tables dans la zone imprimable
    const areaX = 96;
    const areaY = 296;
    const areaW = W - 192;
    const areaH = H - 392;

    let maxX = 820;
    let maxY = 660;
    state.tables.forEach((t) => {
      maxX = Math.max(maxX, t.x + 280);
      maxY = Math.max(maxY, t.y + 260);
    });
    const scaleX = areaW / maxX;
    const scaleY = areaH / maxY;
    const scale = Math.min(scaleX, scaleY, 2.2);

    state.tables.forEach((t) => {
      const seated = state.guests.filter((g) => g.tableId === t.id);
      const bx = areaX + t.x * scale;
      const by = areaY + t.y * scale;
      const bw = (t.shape === 'honor' ? 270 : 228) * scale;
      const bh = Math.max(210, 64 + seated.length * 24) * scale;

      // Carte table
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = t.shape === 'honor' ? '#2D5A43' : '#C9C0B1';
      ctx.lineWidth = t.shape === 'honor' ? 4 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Bandeau nom table
      ctx.fillStyle = t.shape === 'honor' ? '#E8F0EC' : '#EFECE4';
      ctx.fillRect(bx + 2, by + 2, bw - 4, 42 * scale);

      ctx.fillStyle = '#181715';
      ctx.font = `700 ${Math.round(20 * scale)}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillText(t.name, bx + 14 * scale, by + 28 * scale);

      ctx.fillStyle = '#5C5852';
      ctx.font = `600 ${Math.round(12 * scale)}px "JetBrains Mono", monospace`;
      ctx.fillText(`${seated.length}/${t.capacity}`, bx + bw - 48 * scale, by + 27 * scale);

      // Liste des invités
      ctx.fillStyle = '#181715';
      ctx.font = `500 ${Math.round(13.5 * scale)}px "Plus Jakarta Sans", sans-serif`;
      seated.forEach((g, idx) => {
        const dietStr = DIETS[g.diet] ? ` [${DIETS[g.diet]}]` : '';
        const text = `${idx + 1}. ${g.name}${dietStr}`;
        ctx.fillText(text.slice(0, 34), bx + 14 * scale, by + (66 + idx * 22) * scale);
      });
    });

    // Pied de page
    ctx.fillStyle = '#7D7870';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('Généré gratuitement sans inscription sur tablelibre.fr', 96, H - 72);

    const slug = (state.eventTitle || 'plan-de-table').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    window.TableLibre.downloadCanvasPNG(canvas, `${slug || 'plan-de-table'}-hd.png`);
  }

  function bindEvents() {
    els.eventTitleInput.addEventListener('input', () => {
      state.eventTitle = els.eventTitleInput.value;
      saveState();
    });

    els.addTableForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTable(els.tablePreset.value, els.tableNameInput.value);
      els.tableNameInput.value = '';
    });

    els.addGuestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addSingleGuest(els.guestNameInput.value, els.guestGroupInput.value, els.guestDietInput.value);
      els.guestNameInput.value = '';
      els.guestNameInput.focus();
    });

    els.bulkImportBtn.addEventListener('click', () => {
      importBulkGuests(els.bulkGuestsInput.value, els.bulkGroupInput.value);
      els.bulkGuestsInput.value = '';
    });

    els.addConflictBtn.addEventListener('click', () => {
      addConflict(els.conflictA.value, els.conflictB.value);
    });

    els.filterGroup.addEventListener('change', () => {
      filterGroup = els.filterGroup.value;
      renderGuestList();
    });

    els.searchGuest.addEventListener('input', () => {
      searchQuery = els.searchGuest.value;
      renderGuestList();
    });

    els.loadSampleBtn.addEventListener('click', () => {
      loadSampleWedding(true);
    });

    els.clearPlanBtn.addEventListener('click', () => {
      state = {
        eventTitle: 'Nouvelle Réception',
        tables: [{ id: uid('t'), name: "Table d'Honneur", shape: 'honor', capacity: 8, x: 240, y: 24 }],
        guests: [],
        conflicts: []
      };
      selectedGuestId = null;
      saveState();
      renderAll();
      window.TableLibre.showToast('Plan réinitialisé.');
    });

    els.arrangeBtn.addEventListener('click', autoArrangeTables);

    els.shareUrlBtn.addEventListener('click', () => {
      const hash = encodeStateToHash(state);
      const url = window.location.origin + window.location.pathname + hash;
      try {
        window.history.replaceState(null, '', hash);
      } catch (e) {
        // Ignore on file:// protocol
      }
      window.TableLibre.copyText(url, 'Lien de partage du plan copié dans le presse-papiers !');
    });

    els.exportPngBtn.addEventListener('click', exportHighResPNG);

    // Drop zone pour retirer un invité vers la liste d'attente
    els.guestList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    els.guestList.addEventListener('drop', (e) => {
      e.preventDefault();
      const guestId = e.dataTransfer.getData('text/plain');
      if (guestId) {
        assignGuestToTable(guestId, null);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('seating-app')) return;

    els.eventTitleInput = document.getElementById('event-title');
    els.kpiSeated = document.getElementById('kpi-seated');
    els.kpiCapacity = document.getElementById('kpi-capacity');
    els.kpiTables = document.getElementById('kpi-tables');
    els.kpiConflicts = document.getElementById('kpi-conflicts');
    els.kpiConflictBox = document.getElementById('kpi-conflict-box');
    els.kpiDietsNote = document.getElementById('kpi-diets-note');
    els.conflictBanner = document.getElementById('conflict-banner');

    els.addTableForm = document.getElementById('add-table-form');
    els.tablePreset = document.getElementById('table-preset');
    els.tableNameInput = document.getElementById('table-name');

    els.addGuestForm = document.getElementById('add-guest-form');
    els.guestNameInput = document.getElementById('guest-name');
    els.guestGroupInput = document.getElementById('guest-group');
    els.guestDietInput = document.getElementById('guest-diet');

    els.bulkGuestsInput = document.getElementById('bulk-guests');
    els.bulkGroupInput = document.getElementById('bulk-group');
    els.bulkImportBtn = document.getElementById('bulk-import-btn');

    els.guestList = document.getElementById('unseated-guest-list');
    els.unseatedCount = document.getElementById('unseated-count');
    els.filterGroup = document.getElementById('filter-group');
    els.searchGuest = document.getElementById('search-guest');

    els.conflictA = document.getElementById('conflict-a');
    els.conflictB = document.getElementById('conflict-b');
    els.addConflictBtn = document.getElementById('add-conflict-btn');
    els.conflictList = document.getElementById('conflict-list');

    els.roomGrid = document.getElementById('room-grid');
    els.loadSampleBtn = document.getElementById('load-sample-btn');
    els.clearPlanBtn = document.getElementById('clear-plan-btn');
    els.arrangeBtn = document.getElementById('arrange-tables-btn');
    els.shareUrlBtn = document.getElementById('share-url-btn');
    els.exportPngBtn = document.getElementById('export-png-btn');

    loadInitialState();
    bindEvents();
    renderAll();
  });
})();
