/**
 * TableLibre — Outil 01 : Éditeur Visuel de Plan de Table (Version 2.0 Ultra-Intuitive)
 * - Vraies tables rondes (chaises disposées en cercle à 360°) & tables rectangulaires / honneur
 * - Clic direct sur n'importe quelle chaise (vide ou occupée) pour placer, déplacer ou créer un invité
 * - Sélecteur direct de table sur chaque invité + Glisser-déposer fluide
 * - Algorithme 1-clic « Placement Automatique Intelligent » (regroupe par affinité + évite 100 % des conflits)
 * - Double vue : Plan de Salle Visuel (Tables & Chaises) OU Affiche d'Entrée / Chevalets de Table
 * - Export PNG Haute Définition dessinant les vraies tables rondes et leurs chaises autour
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tablelibre_seating_plan_v2';

  const TABLE_PRESETS = {
    'round-8': { label: 'Table ronde — 8 places', shape: 'round', capacity: 8 },
    'round-10': { label: 'Table ronde — 10 places', shape: 'round', capacity: 10 },
    'rect-6': { label: 'Table rectangulaire — 6 places', shape: 'rect', capacity: 6 },
    'rect-8': { label: 'Table rectangulaire — 8 places', shape: 'rect', capacity: 8 },
    'rect-12': { label: 'Table banquet — 12 places', shape: 'rect', capacity: 12 },
    'honor-8': { label: "Table d'honneur — 8 places", shape: 'honor', capacity: 8 }
  };

  const GROUPS = {
    'famille-mariee': { label: 'Famille Mariée', color: '#2D5A43', bg: '#E6F0EB' },
    'famille-marie': { label: 'Famille Marié', color: '#8C5A2B', bg: '#F5ECE2' },
    'amis': { label: 'Amis', color: '#1E4E79', bg: '#E6EFF8' },
    'enfants': { label: 'Enfants', color: '#9A3412', bg: '#FCECE6' },
    'collegues': { label: 'Collègues', color: '#5B4B8A', bg: '#EFEBF7' }
  };

  const DIETS = {
    'standard': { label: '', badge: '' },
    'vege': { label: 'Végétarien', badge: 'Végé' },
    'sans-gluten': { label: 'Sans gluten', badge: 'S.Gluten' },
    'allergie': { label: 'Allergie', badge: 'Allergie' }
  };

  let state = {
    eventTitle: 'Mariage de Camille & Thomas',
    viewMode: 'visual', // 'visual' | 'cards'
    tables: [],
    guests: [],
    conflicts: []
  };

  let filterGroup = 'all';
  let searchQuery = '';
  // État de la modale de clic sur une chaise { tableId, seatIndex }
  let activeSeatModal = null;

  const els = {};

  function uid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(str) {
    if (window.TableLibre && window.TableLibre.escapeHTML) {
      return window.TableLibre.escapeHTML(String(str || ''));
    }
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg) {
    if (window.TableLibre && window.TableLibre.showToast) {
      window.TableLibre.showToast(msg);
    }
  }

  function getInitials(name) {
    const parts = String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getShortName(name) {
    const clean = String(name || '').replace(/\(.*?\)/g, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length <= 1) return clean;
    return `${parts[0]} ${parts[1][0]}.`;
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

  function normalizeGuestsSeats() {
    // S'assure que chaque invité placé sur une table possède un seatIndex unique (0 .. capacity-1)
    state.tables.forEach((t) => {
      const seated = state.guests.filter((g) => g.tableId === t.id);
      const taken = new Set();
      seated.forEach((g) => {
        if (typeof g.seatIndex === 'number' && g.seatIndex >= 0 && g.seatIndex < t.capacity && !taken.has(g.seatIndex)) {
          taken.add(g.seatIndex);
        } else {
          g.seatIndex = null;
        }
      });
      seated.forEach((g) => {
        if (g.seatIndex === null) {
          for (let i = 0; i < t.capacity; i++) {
            if (!taken.has(i)) {
              g.seatIndex = i;
              taken.add(i);
              break;
            }
          }
        }
      });
    });
  }

  function loadInitialState() {
    const fromHash = decodeStateFromHash(window.location.hash);
    if (fromHash) {
      state = {
        eventTitle: fromHash.eventTitle || 'Mon plan de table',
        viewMode: fromHash.viewMode || 'visual',
        tables: fromHash.tables || [],
        guests: fromHash.guests || [],
        conflicts: fromHash.conflicts || []
      };
      normalizeGuestsSeats();
      saveState();
      toast('Plan de table chargé depuis votre lien de partage.');
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tables) && parsed.tables.length > 0) {
          state = {
            eventTitle: parsed.eventTitle || 'Mon plan de table',
            viewMode: parsed.viewMode || 'visual',
            tables: parsed.tables || [],
            guests: parsed.guests || [],
            conflicts: parsed.conflicts || []
          };
          normalizeGuestsSeats();
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    loadSampleWedding(false);
  }

  function loadSampleWedding(notify = true) {
    const tables = [
      { id: 't_h', name: "Table d'Honneur — Les Mariés", shape: 'honor', capacity: 8 },
      { id: 't_1', name: 'Table 1 — Lavande (Famille Mariée)', shape: 'round', capacity: 8 },
      { id: 't_2', name: 'Table 2 — Romarin (Famille Marié)', shape: 'round', capacity: 8 },
      { id: 't_3', name: 'Table 3 — Olivier (Amis proches)', shape: 'round', capacity: 8 },
      { id: 't_4', name: 'Table 4 — Figuier (Amis & Collègues)', shape: 'rect', capacity: 8 },
      { id: 't_5', name: 'Table 5 — Enfants & Cousins', shape: 'round', capacity: 8 }
    ];

    const rawGuests = [
      // Table d'honneur (8/8)
      ['Camille Laurent (Mariée)', 'famille-mariee', 'standard', 't_h', 0],
      ['Thomas Moreau (Marié)', 'famille-marie', 'standard', 't_h', 1],
      ['Sophie Laurent (Témoin)', 'famille-mariee', 'vege', 't_h', 2],
      ['Julien Fabre (Témoin)', 'amis', 'standard', 't_h', 3],
      ['Claire Mercier (Témoin)', 'amis', 'standard', 't_h', 4],
      ['Antoine Moreau (Témoin)', 'famille-marie', 'standard', 't_h', 5],
      ['Léa Girard', 'amis', 'sans-gluten', 't_h', 6],
      ['Maxime Perrin', 'amis', 'standard', 't_h', 7],
      // Table 1 Lavande (6/8 -> 2 chaises libres pour tester en 1 clic !)
      ['Hélène Laurent', 'famille-mariee', 'standard', 't_1', 0],
      ['Pierre Laurent', 'famille-mariee', 'standard', 't_1', 1],
      ['Oncle Jean', 'famille-mariee', 'standard', 't_1', 2],
      ['Colette Bernard', 'famille-mariee', 'standard', 't_1', 3],
      ['Michel Bernard', 'famille-mariee', 'standard', 't_1', 4],
      ['Nadine Roussel', 'famille-mariee', 'vege', 't_1', 5],
      // Table 2 Romarin (7/8)
      ['Martine Moreau', 'famille-marie', 'standard', 't_2', 0],
      ['Alain Moreau', 'famille-marie', 'standard', 't_2', 1],
      ['Tante Marie', 'famille-marie', 'standard', 't_2', 2],
      ['Patrick Chevalier', 'famille-marie', 'standard', 't_2', 3],
      ['Françoise Chevalier', 'famille-marie', 'sans-gluten', 't_2', 4],
      ['Jacques Lemaire', 'famille-marie', 'standard', 't_2', 5],
      ['Odile Lemaire', 'famille-marie', 'standard', 't_2', 6],
      // Table 3 Olivier (6/8)
      ['Manon Lefèvre', 'amis', 'vege', 't_3', 0],
      ['Hugo Lefèvre', 'amis', 'standard', 't_3', 1],
      ['Chloé Gauthier', 'amis', 'standard', 't_3', 2],
      ['Romain Blanc', 'amis', 'standard', 't_3', 3],
      ['Inès Benali', 'amis', 'vege', 't_3', 4],
      ['Élodie Boyer', 'amis', 'allergie', 't_3', 5],
      // Table 4 Figuier (6/8)
      ['Pauline Simon', 'collegues', 'standard', 't_4', 0],
      ['Matthieu Faure', 'collegues', 'standard', 't_4', 1],
      ['Céline André', 'collegues', 'vege', 't_4', 2],
      ['Guillaume Denis', 'collegues', 'standard', 't_4', 3],
      ['Audrey Lacroix', 'amis', 'standard', 't_4', 4],
      ['Vincent Barbier', 'amis', 'standard', 't_4', 5],
      // Table 5 Enfants (3/8)
      ['Lucas Moreau (10 ans)', 'enfants', 'standard', 't_5', 0],
      ['Zoé Laurent (9 ans)', 'enfants', 'standard', 't_5', 1],
      ['Noah Lefèvre (11 ans)', 'enfants', 'standard', 't_5', 2],
      // Invités en attente dans la colonne de gauche (6 invités prêts à être placés en 1 clic !)
      ['Gérard Roussel', 'famille-mariee', 'standard', null, null],
      ['Lucie Fontaine', 'famille-mariee', 'standard', null, null],
      ['Sébastien Moreau', 'famille-marie', 'standard', null, null],
      ['Nicolas Garnier', 'amis', 'standard', null, null],
      ['Sarah Vidal', 'amis', 'vege', null, null],
      ['Emma Bernard (8 ans)', 'enfants', 'allergie', null, null]
    ];

    const guests = rawGuests.map((g, idx) => ({
      id: 'g_' + (idx + 1),
      name: g[0],
      group: g[1],
      diet: g[2],
      tableId: g[3],
      seatIndex: g[4]
    }));

    state = {
      eventTitle: 'Mariage de Camille & Thomas',
      viewMode: 'visual',
      tables,
      guests,
      conflicts: [
        { id: 'c_1', guestA: 'g_11', guestB: 'g_17' } // Oncle Jean ≠ Tante Marie
      ]
    };

    saveState();
    renderAll();
    if (notify) {
      toast('Exemple chargé : cliquez sur une chaise « + Place libre » ou sur « Placement Auto » !');
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

  function wouldCreateConflict(guestId, tableId) {
    const seatedIds = new Set(
      state.guests.filter((g) => g.tableId === tableId && g.id !== guestId).map((g) => g.id)
    );
    return state.conflicts.some(
      (c) =>
        (c.guestA === guestId && seatedIds.has(c.guestB)) ||
        (c.guestB === guestId && seatedIds.has(c.guestA))
    );
  }

  function assignGuestToSeat(guestId, tableId, preferredSeatIndex = null) {
    const guest = state.guests.find((g) => g.id === guestId);
    if (!guest) return;

    if (!tableId) {
      guest.tableId = null;
      guest.seatIndex = null;
      saveState();
      renderAll();
      return;
    }

    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;

    // Si une chaise précise est demandée et déjà occupée par quelqu'un d'autre, on échange leurs places !
    if (typeof preferredSeatIndex === 'number') {
      const occupant = state.guests.find(
        (g) => g.tableId === tableId && g.seatIndex === preferredSeatIndex && g.id !== guestId
      );
      if (occupant) {
        occupant.tableId = guest.tableId;
        occupant.seatIndex = guest.seatIndex;
      }
      guest.tableId = tableId;
      guest.seatIndex = preferredSeatIndex;
    } else {
      // Trouver la première chaise libre sur cette table
      const seated = state.guests.filter((g) => g.tableId === tableId && g.id !== guestId);
      if (seated.length >= table.capacity) {
        toast(`La table « ${table.name} » est déjà complète (${table.capacity}/${table.capacity}).`);
        return;
      }
      const taken = new Set(seated.map((g) => g.seatIndex));
      let freeIdx = 0;
      for (let i = 0; i < table.capacity; i++) {
        if (!taken.has(i)) {
          freeIdx = i;
          break;
        }
      }
      guest.tableId = tableId;
      guest.seatIndex = freeIdx;
    }

    saveState();
    renderAll();

    const activeConflicts = getActiveConflicts();
    const hit = activeConflicts.find((c) => c.guestA.id === guestId || c.guestB.id === guestId);
    if (hit) {
      toast(`⚠️ Attention conflit sur ${hit.tableName} : ${hit.guestA.name} ≠ ${hit.guestB.name}`);
    }
  }

  function autoSeatGuestsSmart(resetAll = false) {
    if (resetAll) {
      state.guests.forEach((g) => {
        g.tableId = null;
        g.seatIndex = null;
      });
    }

    const unseated = state.guests.filter((g) => !g.tableId);
    if (unseated.length === 0) {
      // Si tout le monde est déjà placé, proposer de réorganiser
      toast('Tous les invités sont déjà placés ! Cliquez sur « Réinitialiser les places » si vous voulez tout recalculer.');
      return;
    }

    // Trier les invités non placés par groupe pour les garder ensemble
    const groupOrder = ['famille-mariee', 'famille-marie', 'amis', 'collegues', 'enfants'];
    unseated.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

    let placedCount = 0;

    unseated.forEach((guest) => {
      // Chercher la meilleure table :
      // 1) Qui a au moins 1 chaise libre
      // 2) Qui ne crée AUCUN conflit avec les invités déjà assis
      // 3) Qui contient déjà le plus d'invités du MÊME groupe (affinité)
      let bestTable = null;
      let bestScore = -9999;

      state.tables.forEach((table) => {
        const seated = state.guests.filter((g) => g.tableId === table.id);
        if (seated.length >= table.capacity) return;

        const hasConflict = wouldCreateConflict(guest.id, table.id);
        const sameGroupCount = seated.filter((g) => g.group === guest.group).length;
        const nameLower = table.name.toLowerCase();
        const bonusChildTable =
          guest.group === 'enfants' && (nameLower.includes('enfant') || nameLower.includes('cousin'))
            ? 20
            : 0;

        // Score d'affinité
        const score =
          (hasConflict ? -500 : 100) +
          sameGroupCount * 15 +
          bonusChildTable -
          seated.length; // préférer remplir harmonieusement

        if (score > bestScore) {
          bestScore = score;
          bestTable = table;
        }
      });

      if (bestTable) {
        const seated = state.guests.filter((g) => g.tableId === bestTable.id);
        const taken = new Set(seated.map((g) => g.seatIndex));
        for (let i = 0; i < bestTable.capacity; i++) {
          if (!taken.has(i)) {
            guest.tableId = bestTable.id;
            guest.seatIndex = i;
            placedCount++;
            break;
          }
        }
      }
    });

    saveState();
    renderAll();

    if (placedCount > 0) {
      toast(`✨ ${placedCount} invité(s) placé(s) automatiquement par affinités et sans conflit !`);
    } else {
      toast('Capacité maximale atteinte : ajoutez une nouvelle table pour placer les invités restants.');
    }
  }

  function unseatAllGuests() {
    state.guests.forEach((g) => {
      g.tableId = null;
      g.seatIndex = null;
    });
    saveState();
    renderAll();
    toast('Toutes les chaises ont été libérées. Vos invités sont dans la colonne de gauche.');
  }

  function addTable(presetKey, customName) {
    const preset = TABLE_PRESETS[presetKey] || TABLE_PRESETS['round-8'];
    const idx = state.tables.length + 1;
    const table = {
      id: uid('t'),
      name: (customName || '').trim() || `Table ${idx}`,
      shape: preset.shape,
      capacity: preset.capacity
    };
    state.tables.push(table);
    saveState();
    renderAll();
    toast(`Table « ${table.name} » (${preset.capacity} places) ajoutée au plan.`);
  }

  function deleteTable(tableId) {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;
    state.guests.forEach((g) => {
      if (g.tableId === tableId) {
        g.tableId = null;
        g.seatIndex = null;
      }
    });
    state.tables = state.tables.filter((t) => t.id !== tableId);
    saveState();
    renderAll();
    toast(`Table « ${table.name} » supprimée.`);
  }

  function addSingleGuest(name, group, diet, targetTableId = null, targetSeatIndex = null) {
    const clean = (name || '').trim();
    if (!clean) return null;
    const newGuest = {
      id: uid('g'),
      name: clean,
      group: group || 'amis',
      diet: diet || 'standard',
      tableId: null,
      seatIndex: null
    };
    state.guests.push(newGuest);
    if (targetTableId) {
      assignGuestToSeat(newGuest.id, targetTableId, targetSeatIndex);
    } else {
      saveState();
      renderAll();
      toast(`Invité « ${clean} » ajouté.`);
    }
    return newGuest;
  }

  function importBulkGuests(rawText, group) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (!lines.length) return;
    lines.forEach((line) => {
      let diet = 'standard';
      if (/\(v[eé]g[eé]/i.test(line)) diet = 'vege';
      else if (/allerg/i.test(line)) diet = 'allergie';
      else if (/gluten/i.test(line)) diet = 'sans-gluten';
      state.guests.push({
        id: uid('g'),
        name: line,
        group: group || 'amis',
        diet,
        tableId: null,
        seatIndex: null
      });
    });
    saveState();
    renderAll();
    toast(`${lines.length} invité(s) ajouté(s) ! Cliquez sur « Placement Auto » pour les asseoir.`);
  }

  function deleteGuest(guestId) {
    state.guests = state.guests.filter((g) => g.id !== guestId);
    state.conflicts = state.conflicts.filter((c) => c.guestA !== guestId && c.guestB !== guestId);
    saveState();
    renderAll();
  }

  function addConflict(guestA, guestB) {
    if (!guestA || !guestB || guestA === guestB) {
      toast('Choisissez deux invités différents à séparer.');
      return;
    }
    const exists = state.conflicts.some(
      (c) => (c.guestA === guestA && c.guestB === guestB) || (c.guestA === guestB && c.guestB === guestA)
    );
    if (exists) {
      toast('Cette règle de séparation existe déjà.');
      return;
    }
    state.conflicts.push({ id: uid('c'), guestA, guestB });
    saveState();
    renderAll();
    toast('Règle « Ne pas placer ensemble » enregistrée.');
  }

  function removeConflict(conflictId) {
    state.conflicts = state.conflicts.filter((c) => c.id !== conflictId);
    saveState();
    renderAll();
  }

  function renderKPIs(activeConflicts) {
    const totalGuests = state.guests.length;
    const seatedGuests = state.guests.filter((g) => g.tableId !== null).length;
    const unseatedGuests = totalGuests - seatedGuests;
    const totalSeats = state.tables.reduce((acc, t) => acc + t.capacity, 0);
    const specialDiets = state.guests.filter((g) => g.diet && g.diet !== 'standard').length;

    els.kpiSeated.textContent = `${seatedGuests} / ${totalGuests}`;
    els.kpiCapacity.textContent = `${totalSeats} places (${Math.max(0, totalSeats - seatedGuests)} libres)`;
    els.kpiTables.textContent = `${state.tables.length} tables`;
    els.kpiConflicts.textContent = String(activeConflicts.length);
    els.kpiDietsNote.textContent = `${unseatedGuests} en attente • ${specialDiets} régime(s)`;

    if (activeConflicts.length > 0) {
      els.kpiConflictBox.classList.add('kpi-box--alert');
      els.conflictBanner.classList.add('is-visible');
      els.conflictBanner.innerHTML =
        `<strong>⚠️ Conflit détecté (${activeConflicts.length}) :</strong> ` +
        activeConflicts
          .map((c) => `${esc(c.guestA.name)} et ${esc(c.guestB.name)} sont sur la même table (${esc(c.tableName)})`)
          .join(' • ');
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
      els.guestList.innerHTML = `
        <div style="padding:16px 12px;text-align:center;background:var(--bg-parchment);border:1px dashed var(--border-strong);border-radius:6px;font-size:0.9rem;color:var(--ink-secondary);">
          ${unseated.length === 0
            ? '🎉 <strong>Tous vos invités sont assis !</strong><br><span style="font-size:0.82rem;">Cliquez sur n’importe quelle chaise du plan à droite pour modifier une place.</span>'
            : 'Aucun invité en attente ne correspond à ce filtre.'}
        </div>`;
      return;
    }

    const tableOptions =
      '<option value="">Placer à la table… ▾</option>' +
      state.tables
        .map((t) => {
          const count = state.guests.filter((g) => g.tableId === t.id).length;
          const full = count >= t.capacity;
          return `<option value="${t.id}" ${full ? 'disabled' : ''}>${esc(t.name)} (${count}/${t.capacity})</option>`;
        })
        .join('');

    els.guestList.innerHTML = filtered
      .map((g) => {
        const grp = GROUPS[g.group] || GROUPS.amis;
        const dietObj = DIETS[g.diet] || DIETS.standard;
        return `
        <div class="guest-chip" draggable="true" data-guest-id="${g.id}" style="display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <span style="width:10px;height:10px;border-radius:50%;background:${grp.color};flex-shrink:0;"></span>
              <span class="guest-chip__name" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(g.name)}</span>
            </div>
            <button type="button" class="icon-btn icon-btn--danger" data-delete-guest="${g.id}" title="Supprimer cet invité">×</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-size:0.76rem;padding:2px 8px;border-radius:99px;background:${grp.bg};color:${grp.color};font-weight:600;">
              ${esc(grp.label)}${dietObj.badge ? ' • ' + esc(dietObj.badge) : ''}
            </span>
            <select class="select" data-direct-assign="${g.id}" aria-label="Choisir la table pour ${esc(g.name)}" style="padding:4px 8px;font-size:0.8rem;max-width:175px;height:auto;">
              ${tableOptions}
            </select>
          </div>
        </div>
      `;
      })
      .join('');

    els.guestList.querySelectorAll('.guest-chip').forEach((chip) => {
      const id = chip.getAttribute('data-guest-id');
      chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    els.guestList.querySelectorAll('[data-direct-assign]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const gid = sel.getAttribute('data-direct-assign');
        if (sel.value) {
          assignGuestToSeat(gid, sel.value, null);
        }
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
    const options =
      '<option value="">— Choisir un invité —</option>' +
      state.guests
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((g) => `<option value="${g.id}">${esc(g.name)}</option>`)
        .join('');

    const prevA = els.conflictA.value;
    const prevB = els.conflictB.value;
    els.conflictA.innerHTML = options;
    els.conflictB.innerHTML = options;
    els.conflictA.value = prevA;
    els.conflictB.value = prevB;

    if (state.conflicts.length === 0) {
      els.conflictList.innerHTML = '<div class="field__hint">Aucune règle de séparation définie.</div>';
      return;
    }

    els.conflictList.innerHTML = state.conflicts
      .map((c) => {
        const gA = state.guests.find((g) => g.id === c.guestA);
        const gB = state.guests.find((g) => g.id === c.guestB);
        if (!gA || !gB) return '';
        const triggered = activeIds.has(c.id);
        return `
        <div class="conflict-pill ${triggered ? 'is-triggered' : ''}">
          <span>${esc(gA.name)} ≠ ${esc(gB.name)}</span>
          <button type="button" class="icon-btn icon-btn--danger" data-remove-conflict="${c.id}" title="Supprimer la règle">×</button>
        </div>
      `;
      })
      .join('');

    els.conflictList.querySelectorAll('[data-remove-conflict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeConflict(btn.getAttribute('data-remove-conflict'));
      });
    });
  }

  function buildRoundTableVisualHTML(table, seatedMap, conflictingGuestIds, tableConflicts) {
    // Plateau circulaire avec vraies chaises disposées en cercle à 360° autour !
    const cap = table.capacity;
    const stageSize = 336;
    const center = stageSize / 2;
    const radius = 122;

    let chairsHTML = '';
    for (let i = 0; i < cap; i++) {
      const angle = (2 * Math.PI * i) / cap - Math.PI / 2;
      const cx = Math.round(center + radius * Math.cos(angle));
      const cy = Math.round(center + radius * Math.sin(angle));
      const guest = seatedMap.get(i);

      if (guest) {
        const grp = GROUPS[guest.group] || GROUPS.amis;
        const isConf = conflictingGuestIds.has(guest.id);
        const dietObj = DIETS[guest.diet] || DIETS.standard;
        chairsHTML += `
          <button type="button"
            class="tl-seat tl-seat--occupied ${isConf ? 'tl-seat--conflict' : ''}"
            style="left:${cx}px;top:${cy}px;border-color:${isConf ? '#B4342D' : grp.color};"
            data-seat-click="${table.id}:${i}"
            draggable="true"
            data-guest-id="${guest.id}"
            title="Chaise n°${i + 1} : ${esc(guest.name)} (${esc(grp.label)}) — Cliquez pour modifier ou glissez vers une autre chaise">
            <span class="tl-seat__avatar" style="background:${isConf ? '#B4342D' : grp.color};">${esc(getInitials(guest.name))}</span>
            <span class="tl-seat__label">${esc(getShortName(guest.name))}</span>
            ${dietObj.badge ? `<span class="tl-seat__diet">${esc(dietObj.badge)}</span>` : ''}
          </button>`;
      } else {
        chairsHTML += `
          <button type="button"
            class="tl-seat tl-seat--empty"
            style="left:${cx}px;top:${cy}px;"
            data-seat-click="${table.id}:${i}"
            data-seat-drop="${table.id}:${i}"
            title="Chaise libre n°${i + 1} — Cliquez pour asseoir un invité ici">
            <span class="tl-seat__plus">+</span>
            <span class="tl-seat__label">Place ${i + 1}</span>
          </button>`;
      }
    }

    const seatedCount = seatedMap.size;
    return `
      <div class="tl-table-card ${tableConflicts.length ? 'has-conflict' : ''}" data-table-drop="${table.id}">
        <div class="tl-table-card__header">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span class="tl-shape-badge">● Ronde ${cap} pl.</span>
            <input type="text" class="tl-table-title-input" value="${esc(table.name)}" data-rename-table="${table.id}" aria-label="Renommer la table">
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tl-cap-pill ${seatedCount === cap ? 'is-full' : ''}">${seatedCount}/${cap}</span>
            <button type="button" class="icon-btn icon-btn--danger" data-delete-table="${table.id}" title="Supprimer cette table">×</button>
          </div>
        </div>

        <div class="tl-round-stage" style="width:${stageSize}px;height:${stageSize}px;">
          <div class="tl-round-surface">
            <span class="tl-round-surface__title">${esc(table.name)}</span>
            <span class="tl-round-surface__sub">${seatedCount} / ${cap} convives</span>
          </div>
          ${chairsHTML}
        </div>

        ${tableConflicts.length ? `<div class="tl-conflict-alert">⚠️ Conflit : ${esc(tableConflicts.join(' • '))}</div>` : ''}
      </div>
    `;
  }

  function buildRectTableVisualHTML(table, seatedMap, conflictingGuestIds, tableConflicts) {
    const cap = table.capacity;
    const isHonor = table.shape === 'honor';
    const topCount = Math.ceil(cap / 2);
    const bottomCount = cap - topCount;

    function renderRowSeats(startIndex, count) {
      let html = '';
      for (let k = 0; k < count; k++) {
        const i = startIndex + k;
        const guest = seatedMap.get(i);
        if (guest) {
          const grp = GROUPS[guest.group] || GROUPS.amis;
          const isConf = conflictingGuestIds.has(guest.id);
          const dietObj = DIETS[guest.diet] || DIETS.standard;
          html += `
            <button type="button"
              class="tl-seat tl-seat--rect tl-seat--occupied ${isConf ? 'tl-seat--conflict' : ''}"
              style="border-color:${isConf ? '#B4342D' : grp.color};"
              data-seat-click="${table.id}:${i}"
              draggable="true"
              data-guest-id="${guest.id}"
              title="Chaise n°${i + 1} : ${esc(guest.name)} — Cliquez pour modifier">
              <span class="tl-seat__avatar" style="background:${isConf ? '#B4342D' : grp.color};">${esc(getInitials(guest.name))}</span>
              <span class="tl-seat__label">${esc(getShortName(guest.name))}</span>
              ${dietObj.badge ? `<span class="tl-seat__diet">${esc(dietObj.badge)}</span>` : ''}
            </button>`;
        } else {
          html += `
            <button type="button"
              class="tl-seat tl-seat--rect tl-seat--empty"
              data-seat-click="${table.id}:${i}"
              data-seat-drop="${table.id}:${i}"
              title="Chaise libre n°${i + 1} — Cliquez pour asseoir un invité">
              <span class="tl-seat__plus">+</span>
              <span class="tl-seat__label">Place ${i + 1}</span>
            </button>`;
        }
      }
      return html;
    }

    const seatedCount = seatedMap.size;
    return `
      <div class="tl-table-card ${isHonor ? 'tl-table-card--honor' : ''} ${tableConflicts.length ? 'has-conflict' : ''}" data-table-drop="${table.id}">
        <div class="tl-table-card__header">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span class="tl-shape-badge">${isHonor ? '★ Honneur' : '▬ Banquet'} ${cap} pl.</span>
            <input type="text" class="tl-table-title-input" value="${esc(table.name)}" data-rename-table="${table.id}" aria-label="Renommer la table">
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tl-cap-pill ${seatedCount === cap ? 'is-full' : ''}">${seatedCount}/${cap}</span>
            <button type="button" class="icon-btn icon-btn--danger" data-delete-table="${table.id}" title="Supprimer cette table">×</button>
          </div>
        </div>

        <div class="tl-rect-stage">
          <div class="tl-rect-row">${renderRowSeats(0, topCount)}</div>
          <div class="tl-rect-surface ${isHonor ? 'is-honor' : ''}">
            <span class="tl-round-surface__title">${esc(table.name)}</span>
            <span class="tl-round-surface__sub">${isHonor ? "Table d'Honneur" : 'Table Rectangulaire'} • ${seatedCount}/${cap} places</span>
          </div>
          <div class="tl-rect-row">${renderRowSeats(topCount, bottomCount)}</div>
        </div>

        ${tableConflicts.length ? `<div class="tl-conflict-alert">⚠️ Conflit : ${esc(tableConflicts.join(' • '))}</div>` : ''}
      </div>
    `;
  }

  function buildCardsViewHTML(conflictByTable, conflictingGuestIds) {
    // Vue « Chevalets / Affiche d'entrée de salle » ultra-lisible pour l'accueil des invités
    return `
      <div class="tl-cards-grid">
        ${state.tables
          .map((t) => {
            const seated = state.guests
              .filter((g) => g.tableId === t.id)
              .sort((a, b) => (a.seatIndex ?? 99) - (b.seatIndex ?? 99));
            const tableConflicts = conflictByTable[t.id] || [];
            const rows = [];
            for (let i = 0; i < t.capacity; i++) {
              const g = seated.find((x) => x.seatIndex === i);
              if (g) {
                const grp = GROUPS[g.group] || GROUPS.amis;
                const dietObj = DIETS[g.diet] || DIETS.standard;
                const isConf = conflictingGuestIds.has(g.id);
                rows.push(`
                  <div class="tl-card-seat-row ${isConf ? 'is-conflict' : ''}" data-seat-click="${t.id}:${i}" style="cursor:pointer;">
                    <span class="mono" style="font-size:0.78rem;color:var(--ink-tertiary);width:22px;">#${i + 1}</span>
                    <span style="width:8px;height:8px;border-radius:50%;background:${grp.color};flex-shrink:0;"></span>
                    <span style="font-weight:600;flex:1;">${esc(g.name)}</span>
                    ${dietObj.badge ? `<span style="font-size:0.74rem;padding:1px 6px;border-radius:4px;background:#F3ECE1;color:#8C5A2B;">${esc(dietObj.badge)}</span>` : ''}
                    <button type="button" class="icon-btn" data-unseat-guest="${g.id}" title="Retirer de la table">×</button>
                  </div>
                `);
              } else {
                rows.push(`
                  <button type="button" class="tl-card-seat-row tl-card-seat-row--empty" data-seat-click="${t.id}:${i}">
                    <span class="mono" style="font-size:0.78rem;width:22px;">#${i + 1}</span>
                    <span>+ Cliquez pour assigner la place n°${i + 1}</span>
                  </button>
                `);
              }
            }

            return `
              <div class="tl-easel-card ${t.shape === 'honor' ? 'is-honor' : ''}">
                <div class="tl-easel-card__head">
                  <div>
                    <div class="mono" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent-sage);">
                      ${t.shape === 'honor' ? "★ Table d'Honneur" : t.shape === 'round' ? '● Table Ronde' : '▬ Table Banquet'}
                    </div>
                    <h3 style="font-size:1.35rem;margin:2px 0 0;">${esc(t.name)}</h3>
                  </div>
                  <span class="tl-cap-pill">${seated.length}/${t.capacity}</span>
                </div>
                <div class="tl-easel-card__body">
                  ${rows.join('')}
                </div>
                ${tableConflicts.length ? `<div class="tl-conflict-alert">⚠️ ${esc(tableConflicts.join(' • '))}</div>` : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderRoom() {
    normalizeGuestsSeats();
    const activeConflicts = getActiveConflicts();
    const conflictByTable = {};
    const conflictingGuestIds = new Set();

    activeConflicts.forEach((c) => {
      if (!conflictByTable[c.tableId]) conflictByTable[c.tableId] = [];
      conflictByTable[c.tableId].push(`${c.guestA.name} ≠ ${c.guestB.name}`);
      conflictingGuestIds.add(c.guestA.id);
      conflictingGuestIds.add(c.guestB.id);
    });

    if (state.viewMode === 'cards') {
      els.roomGrid.innerHTML = buildCardsViewHTML(conflictByTable, conflictingGuestIds);
    } else {
      els.roomGrid.innerHTML = `
        <div class="tl-visual-hall">
          ${state.tables
            .map((t) => {
              const seated = state.guests.filter((g) => g.tableId === t.id);
              const seatedMap = new Map();
              seated.forEach((g) => {
                if (typeof g.seatIndex === 'number') seatedMap.set(g.seatIndex, g);
              });
              const tableConflicts = conflictByTable[t.id] || [];
              if (t.shape === 'round') {
                return buildRoundTableVisualHTML(t, seatedMap, conflictingGuestIds, tableConflicts);
              }
              return buildRectTableVisualHTML(t, seatedMap, conflictingGuestIds, tableConflicts);
            })
            .join('')}
        </div>
      `;
    }

    // Événements : clic sur n'importe quelle chaise (vide ou occupée) -> ouvre la modale de sélection
    els.roomGrid.querySelectorAll('[data-seat-click]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('[data-unseat-guest]')) return;
        const [tableId, seatStr] = btn.getAttribute('data-seat-click').split(':');
        openSeatPickerModal(tableId, parseInt(seatStr, 10));
      });
    });

    // Drag & drop d'un invité déjà assis vers une autre chaise
    els.roomGrid.querySelectorAll('[draggable="true"][data-guest-id]').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', el.getAttribute('data-guest-id'));
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    // Drop sur une chaise précise
    els.roomGrid.querySelectorAll('[data-seat-drop]').forEach((el) => {
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('is-dragover');
      });
      el.addEventListener('dragleave', () => {
        el.classList.remove('is-dragover');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('is-dragover');
        const guestId = e.dataTransfer.getData('text/plain');
        const [tableId, seatStr] = el.getAttribute('data-seat-drop').split(':');
        if (guestId) {
          assignGuestToSeat(guestId, tableId, parseInt(seatStr, 10));
        }
      });
    });

    // Drop global sur une carte de table
    els.roomGrid.querySelectorAll('[data-table-drop]').forEach((card) => {
      const tableId = card.getAttribute('data-table-drop');
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('is-dragover');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('is-dragover');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('is-dragover');
        const guestId = e.dataTransfer.getData('text/plain');
        if (guestId) {
          assignGuestToSeat(guestId, tableId, null);
        }
      });
    });

    // Retirer un invité en 1 clic
    els.roomGrid.querySelectorAll('[data-unseat-guest]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        assignGuestToSeat(btn.getAttribute('data-unseat-guest'), null);
      });
    });

    // Supprimer une table
    els.roomGrid.querySelectorAll('[data-delete-table]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteTable(btn.getAttribute('data-delete-table'));
      });
    });

    // Renommer une table
    els.roomGrid.querySelectorAll('[data-rename-table]').forEach((input) => {
      input.addEventListener('change', () => {
        const tid = input.getAttribute('data-rename-table');
        const table = state.tables.find((t) => t.id === tid);
        if (table && input.value.trim()) {
          table.name = input.value.trim();
          saveState();
          renderGuestList();
        }
      });
    });
  }

  function openSeatPickerModal(tableId, seatIndex) {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;
    activeSeatModal = { tableId, seatIndex };

    const currentOccupant = state.guests.find((g) => g.tableId === tableId && g.seatIndex === seatIndex);
    const unseated = state.guests.filter((g) => !g.tableId);
    const seatedElsewhere = state.guests.filter((g) => g.tableId && (!currentOccupant || g.id !== currentOccupant.id));

    let modalEl = document.getElementById('tl-seat-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'tl-seat-modal';
      modalEl.className = 'tl-modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const occupantHTML = currentOccupant
      ? `
        <div style="padding:12px 14px;background:#F3ECE1;border:1px solid #D8CEBE;border-radius:6px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-size:0.78rem;color:var(--ink-secondary);text-transform:uppercase;letter-spacing:0.05em;">Actuellement assis sur la chaise n°${seatIndex + 1}</div>
            <div style="font-weight:700;font-size:1.05rem;">${esc(currentOccupant.name)}</div>
          </div>
          <button type="button" class="btn btn--danger btn--sm" id="tl-modal-unseat-btn">Libérer cette chaise</button>
        </div>`
      : '';

    const unseatedListHTML = unseated.length
      ? unseated
          .map((g) => {
            const grp = GROUPS[g.group] || GROUPS.amis;
            const conflictWarn = wouldCreateConflict(g.id, tableId);
            return `
              <button type="button" class="tl-modal-guest-btn" data-pick-guest="${g.id}">
                <span style="display:flex;align-items:center;gap:8px;">
                  <span style="width:10px;height:10px;border-radius:50%;background:${grp.color};"></span>
                  <strong>${esc(g.name)}</strong>
                  <small style="color:var(--ink-secondary);">(${esc(grp.label)})</small>
                </span>
                <span style="font-size:0.8rem;font-weight:700;color:${conflictWarn ? '#B4342D' : 'var(--accent-sage)'};">
                  ${conflictWarn ? '⚠️ Conflit sur cette table' : 'Asseoir ici →'}
                </span>
              </button>`;
          })
          .join('')
      : `<div style="padding:10px;color:var(--ink-secondary);font-size:0.88rem;">Aucun invité en attente — vous pouvez créer un nouvel invité ci-dessous ou déplacer quelqu'un d'une autre table.</div>`;

    const swapOptionsHTML = seatedElsewhere.length
      ? `
        <details style="margin-top:12px;">
          <summary style="cursor:pointer;font-size:0.86rem;font-weight:600;color:var(--ink-secondary);">Ou déplacer / échanger avec un invité déjà assis (${seatedElsewhere.length})</summary>
          <div style="max-height:150px;overflow-y:auto;margin-top:8px;display:grid;gap:6px;">
            ${seatedElsewhere
              .map((g) => {
                const t = state.tables.find((x) => x.id === g.tableId);
                return `
                  <button type="button" class="tl-modal-guest-btn" data-pick-guest="${g.id}">
                    <span><strong>${esc(g.name)}</strong> <small style="color:var(--ink-tertiary);">(${esc(t ? t.name : '')})</small></span>
                    <span style="font-size:0.78rem;color:var(--accent-sage);">Déplacer ici →</span>
                  </button>`;
              })
              .join('')}
          </div>
        </details>`
      : '';

    modalEl.innerHTML = `
      <div class="tl-modal-box" role="dialog" aria-modal="true" aria-label="Choisir l'invité pour cette chaise">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-fine);">
          <div>
            <div class="mono" style="font-size:0.75rem;text-transform:uppercase;color:var(--accent-sage);">${esc(table.name)}</div>
            <h3 style="font-size:1.4rem;margin:2px 0 0;">Chaise n°${seatIndex + 1} sur ${table.capacity}</h3>
          </div>
          <button type="button" class="icon-btn" id="tl-modal-close-btn" aria-label="Fermer">✕</button>
        </div>

        ${occupantHTML}

        <div style="margin-bottom:14px;">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:8px;">Choisir parmi les invités à placer (${unseated.length}) :</div>
          <div style="max-height:210px;overflow-y:auto;display:grid;gap:6px;">
            ${unseatedListHTML}
          </div>
          ${swapOptionsHTML}
        </div>

        <form id="tl-modal-new-guest-form" style="padding-top:12px;border-top:1px solid var(--border-fine);">
          <div style="font-weight:700;font-size:0.88rem;margin-bottom:8px;">Ou créer directement un nouvel invité sur cette chaise :</div>
          <div style="display:grid;grid-template-columns:1.4fr 1fr auto;gap:8px;">
            <input type="text" id="tl-modal-guest-name" class="input" placeholder="Prénom Nom..." required>
            <select id="tl-modal-guest-group" class="select">
              <option value="amis">Amis</option>
              <option value="famille-mariee">Famille Mariée</option>
              <option value="famille-marie">Famille Marié</option>
              <option value="enfants">Enfants</option>
              <option value="collegues">Collègues</option>
            </select>
            <button type="submit" class="btn btn--primary btn--sm">Créer &amp; Asseoir</button>
          </div>
        </form>
      </div>
    `;

    modalEl.style.display = 'flex';

    document.getElementById('tl-modal-close-btn').addEventListener('click', closeSeatModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeSeatModal();
    });

    const unseatBtn = document.getElementById('tl-modal-unseat-btn');
    if (unseatBtn && currentOccupant) {
      unseatBtn.addEventListener('click', () => {
        assignGuestToSeat(currentOccupant.id, null);
        closeSeatModal();
      });
    }

    modalEl.querySelectorAll('[data-pick-guest]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.getAttribute('data-pick-guest');
        assignGuestToSeat(gid, tableId, seatIndex);
        closeSeatModal();
      });
    });

    document.getElementById('tl-modal-new-guest-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('tl-modal-guest-name').value;
      const grpVal = document.getElementById('tl-modal-guest-group').value;
      if (nameVal.trim()) {
        addSingleGuest(nameVal, grpVal, 'standard', tableId, seatIndex);
        closeSeatModal();
      }
    });
  }

  function closeSeatModal() {
    const modalEl = document.getElementById('tl-seat-modal');
    if (modalEl) modalEl.style.display = 'none';
    activeSeatModal = null;
  }

  function renderAll() {
    if (els.eventTitleInput) els.eventTitleInput.value = state.eventTitle;
    const activeConflicts = getActiveConflicts();
    renderKPIs(activeConflicts);
    renderGuestList();
    renderConflictControls(activeConflicts);
    renderRoom();

    // Mettre à jour l'état visuel des boutons de vue
    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-view-mode') === state.viewMode);
    });
  }

  function exportHighResPNG() {
    normalizeGuestsSeats();
    const cols = 3;
    const rows = Math.max(1, Math.ceil(state.tables.length / cols));
    const W = 2400;
    const H = Math.max(1600, 360 + rows * 640);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fond parchemin
    ctx.fillStyle = '#F8F6F1';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#C9C0B1';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // En-tête
    ctx.fillStyle = '#2D5A43';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('PLAN DE TABLE OFFICIEL • TABLELIBRE.FR', 88, 108);

    ctx.fillStyle = '#181715';
    ctx.font = '700 60px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(state.eventTitle || 'Plan de Table', 88, 174);

    const seatedCount = state.guests.filter((g) => g.tableId !== null).length;
    ctx.fillStyle = '#5C5852';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${state.tables.length} tables • ${seatedCount} convives placés / ${state.guests.length} invités`, 88, 218);

    ctx.strokeStyle = '#E3DDD2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(88, 248);
    ctx.lineTo(W - 88, 248);
    ctx.stroke();

    const cellW = (W - 176) / cols;
    const cellH = 600;

    state.tables.forEach((t, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = 88 + col * cellW + cellW / 2;
      const cy = 280 + row * cellH + 250;

      const seated = state.guests.filter((g) => g.tableId === t.id);
      const seatedMap = new Map();
      seated.forEach((g) => {
        if (typeof g.seatIndex === 'number') seatedMap.set(g.seatIndex, g);
      });

      // Cadre de zone table
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - cellW / 2 + 18, cy - 220, cellW - 36, 540);
      ctx.strokeStyle = t.shape === 'honor' ? '#2D5A43' : '#DCD4C6';
      ctx.lineWidth = t.shape === 'honor' ? 4 : 2;
      ctx.strokeRect(cx - cellW / 2 + 18, cy - 220, cellW - 36, 540);

      // Titre de la table
      ctx.fillStyle = '#181715';
      ctx.font = '700 28px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.name, cx, cy - 174);

      ctx.fillStyle = '#2D5A43';
      ctx.font = '600 16px "JetBrains Mono", monospace';
      ctx.fillText(`${seated.length} / ${t.capacity} places`, cx, cy - 146);

      // Dessin du plateau central circulaire + chaises autour
      const tableR = 88;
      const orbitR = 165;

      ctx.beginPath();
      ctx.arc(cx, cy + 40, tableR, 0, Math.PI * 2);
      ctx.fillStyle = t.shape === 'honor' ? '#E6F0EB' : '#F8F6F1';
      ctx.fill();
      ctx.strokeStyle = '#2D5A43';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#181715';
      ctx.font = '700 20px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(t.shape === 'honor' ? 'HONNEUR' : `TABLE ${idx + 1}`, cx, cy + 46);

      for (let i = 0; i < t.capacity; i++) {
        const angle = (2 * Math.PI * i) / t.capacity - Math.PI / 2;
        const sx = cx + orbitR * Math.cos(angle);
        const sy = cy + 40 + orbitR * Math.sin(angle);
        const guest = seatedMap.get(i);

        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.fillStyle = guest ? '#2D5A43' : '#EFECE4';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = guest ? '#FFFFFF' : '#7D7870';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.fillText(guest ? getInitials(guest.name) : String(i + 1), sx, sy + 5);

        if (guest) {
          ctx.fillStyle = '#181715';
          ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(getShortName(guest.name), sx, sy + 38);
        }
      }
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#7D7870';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('Généré gratuitement sur tablelibre.fr', 88, H - 64);

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

    if (els.autoSeatBtn) {
      els.autoSeatBtn.addEventListener('click', () => {
        autoSeatGuestsSmart(false);
      });
    }

    if (els.unseatAllBtn) {
      els.unseatAllBtn.addEventListener('click', unseatAllGuests);
    }

    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.viewMode = btn.getAttribute('data-view-mode') || 'visual';
        saveState();
        renderAll();
      });
    });

    els.clearPlanBtn.addEventListener('click', () => {
      state = {
        eventTitle: 'Nouvelle Réception',
        viewMode: 'visual',
        tables: [
          { id: uid('t'), name: "Table d'Honneur", shape: 'honor', capacity: 8 },
          { id: uid('t'), name: 'Table 1', shape: 'round', capacity: 8 },
          { id: uid('t'), name: 'Table 2', shape: 'round', capacity: 8 }
        ],
        guests: [],
        conflicts: []
      };
      saveState();
      renderAll();
      toast('Plan vierge prêt : ajoutez vos invités ou cliquez sur une chaise !');
    });

    els.shareUrlBtn.addEventListener('click', () => {
      const hash = encodeStateToHash(state);
      const url = window.location.origin + window.location.pathname + hash;
      try {
        window.history.replaceState(null, '', hash);
      } catch (e) {
        // Ignore
      }
      window.TableLibre.copyText(url, 'Lien de partage copié dans le presse-papiers !');
    });

    els.exportPngBtn.addEventListener('click', exportHighResPNG);
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
    els.autoSeatBtn = document.getElementById('auto-seat-btn');
    els.unseatAllBtn = document.getElementById('unseat-all-btn');
    els.clearPlanBtn = document.getElementById('clear-plan-btn');
    els.shareUrlBtn = document.getElementById('share-url-btn');
    els.exportPngBtn = document.getElementById('export-png-btn');

    loadInitialState();
    bindEvents();
    renderAll();
  });
})();
