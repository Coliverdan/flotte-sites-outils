/**
 * TableLibre — Outil 05 : Générateur de Rétroplanning Mariage Personnalisé
 * 7 jalons calculés à la date exacte (J-12 mois au Jour J), 38 tâches cochables, ajout libre, localStorage, print.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tablelibre_retroplanning_v1';

  const MILESTONES = [
    {
      id: 'm12',
      label: 'J - 12 mois',
      title: 'Fondations, lieu & date officielle',
      offsetDays: -365,
      tasks: [
        { id: 't1', text: 'Fixer la date, le style de réception et le nombre approximatif d’invités', cat: 'Organisation' },
        { id: 't2', text: 'Définir l’enveloppe budgétaire globale et la répartition par poste', cat: 'Budget' },
        { id: 't3', text: 'Visiter et réserver le lieu de réception (domaine, salle, château)', cat: 'Lieu' },
        { id: 't4', text: 'Réserver le traiteur et planifier une première dégustation', cat: 'Traiteur' },
        { id: 't5', text: 'Réserver le photographe et, si souhaité, le vidéaste', cat: 'Image' },
        { id: 't6', text: 'Retirer le dossier de mariage en mairie et réserver la date civile', cat: 'Administratif' }
      ]
    },
    {
      id: 'm9',
      label: 'J - 9 mois',
      title: 'Prestataires clés & tenues',
      offsetDays: -270,
      tasks: [
        { id: 't7', text: 'Réserver le DJ, l’orchestre ou les musiciens du vin d’honneur', cat: 'Musique' },
        { id: 't8', text: 'Choisir le fleuriste et définir la palette végétale et florale', cat: 'Décoration' },
        { id: 't9', text: 'Commencer les essayages de la robe de mariée ou du costume sur mesure', cat: 'Tenues' },
        { id: 't10', text: 'Désigner officiellement vos témoins et organiser leur annonce', cat: 'Proches' },
        { id: 't11', text: 'Envoyer les « Save the Date » (surtout pour un mariage estival ou lointain)', cat: 'Papeterie' },
        { id: 't12', text: 'Réserver les hébergements à proximité pour les invités venant de loin', cat: 'Logistique' }
      ]
    },
    {
      id: 'm6',
      label: 'J - 6 mois',
      title: 'Papeterie, cérémonie & logistique',
      offsetDays: -180,
      tasks: [
        { id: 't13', text: 'Commander et imprimer les faire-part (avec carton réponse RSVP et régimes)', cat: 'Papeterie' },
        { id: 't14', text: 'Choisir et commander les alliances (prévoir le délai de gravure)', cat: 'Bijoux' },
        { id: 't15', text: 'Réserver la mise en beauté (coiffure, maquillage) et fixer la date d’essai', cat: 'Beauté' },
        { id: 't16', text: 'Valider le menu définitif et les vins lors de la dégustation traiteur', cat: 'Traiteur' },
        { id: 't17', text: 'Préparer la cérémonie (laïque ou religieuse) et contacter l’officiant', cat: 'Cérémonie' },
        { id: 't18', text: 'Réserver le véhicule des mariés ou les navettes retour pour les invités', cat: 'Logistique' }
      ]
    },
    {
      id: 'm3',
      label: 'J - 3 mois',
      title: 'Invitations, boissons & détails',
      offsetDays: -90,
      tasks: [
        { id: 't19', text: 'Envoyer les faire-part (date limite de réponse fixée à J-45)', cat: 'Papeterie' },
        { id: 't20', text: 'Estimer les quantités et commander les boissons (champagne, vins, softs)', cat: 'Boissons' },
        { id: 't21', text: 'Déposer le dossier complet en mairie (actes de naissance, justificatifs, témoins)', cat: 'Administratif' },
        { id: 't22', text: 'Commander les cadeaux invités, le livre d’or et les éléments de signalétique', cat: 'Décoration' },
        { id: 't23', text: 'Réaliser l’essai coiffure et maquillage', cat: 'Beauté' },
        { id: 't24', text: 'Choisir la playlist d’entrée, d’ouverture de bal et la liste noire pour le DJ', cat: 'Musique' }
      ]
    },
    {
      id: 'm1',
      label: 'J - 1 mois',
      title: 'Plan de table & confirmations finales',
      offsetDays: -30,
      tasks: [
        { id: 't25', text: 'Relancer les derniers invités sans réponse et clôturer la liste définitive', cat: 'Organisation' },
        { id: 't26', text: 'Finaliser le plan de table et recenser tous les régimes et allergies', cat: 'Plan de table' },
        { id: 't27', text: 'Transmettre au traiteur le nombre exact d’adultes, d’enfants et de prestataires', cat: 'Traiteur' },
        { id: 't28', text: 'Imprimer les menus, marque-places et le grand panneau du plan de table', cat: 'Papeterie' },
        { id: 't29', text: 'Effectuer le dernier essayage et récupérer les tenues et chaussures', cat: 'Tenues' },
        { id: 't30', text: 'Rédiger le déroulé minuté du Jour J et le partager à tous les prestataires', cat: 'Logistique' }
      ]
    },
    {
      id: 'm7d',
      label: 'J - 7 jours',
      title: 'Dernière ligne droite & sérénité',
      offsetDays: -7,
      tasks: [
        { id: 't31', text: 'Confirmer les horaires d’arrivée et de livraison de chaque prestataire', cat: 'Logistique' },
        { id: 't32', text: 'Préparer les enveloppes de soldes et pourboires confiées à un témoin', cat: 'Budget' },
        { id: 't33', text: 'Préparer la trousse d’urgence (épingles, pansements, détachant, mouchoirs)', cat: 'Organisation' },
        { id: 't34', text: 'Faire les valises pour la nuit de noces et le lendemain (brunch)', cat: 'Personnel' },
        { id: 't35', text: 'Installer la salle et déposer les boissons au frais la veille si le lieu l’autorise', cat: 'Lieu' }
      ]
    },
    {
      id: 'm0',
      label: 'Jour J',
      title: 'Profiter pleinement de chaque instant',
      offsetDays: 0,
      tasks: [
        { id: 't36', text: 'Prendre un vrai petit-déjeuner et déléguer le téléphone aux témoins', cat: 'Sérénité' },
        { id: 't37', text: 'Vérifier que les alliances et livrets de cérémonie sont bien entre les mains du témoin', cat: 'Cérémonie' },
        { id: 't38', text: 'Profiter de vos proches et savourer votre journée sans regarder la montre', cat: 'Essentiel' }
      ]
    }
  ];

  function defaultWeddingDateStr() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    // Choisir le samedi le plus proche
    const day = d.getDay();
    const diff = (6 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  let state = {
    weddingDate: defaultWeddingDateStr(),
    doneIds: [],
    customTasks: [] // { id, milestoneId, text }
  };

  let filterStatus = 'all'; // all | todo | done

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.weddingDate) {
          state = {
            weddingDate: parsed.weddingDate,
            doneIds: Array.isArray(parsed.doneIds) ? parsed.doneIds : [],
            customTasks: Array.isArray(parsed.customTasks) ? parsed.customTasks : []
          };
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore
    }
  }

  function addDays(baseDateStr, offsetDays) {
    const parts = baseDateStr.split('-').map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('retro-app')) return;

    const dateInput = document.getElementById('retro-date');
    const timelineEl = document.getElementById('retro-timeline');
    const kpiDays = document.getElementById('kpi-days-left');
    const kpiDone = document.getElementById('kpi-tasks-done');
    const kpiPct = document.getElementById('kpi-tasks-pct');
    const progressFill = document.getElementById('retro-progress-fill');
    const addForm = document.getElementById('retro-add-form');
    const customText = document.getElementById('retro-custom-text');
    const customMilestone = document.getElementById('retro-custom-milestone');
    const printBtn = document.getElementById('retro-print-btn');
    const resetBtn = document.getElementById('retro-reset-btn');

    loadState();
    dateInput.value = state.weddingDate;

    function render() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const weddingDate = addDays(state.weddingDate, 0);
      const diffDays = Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      kpiDays.textContent = diffDays >= 0 ? `J - ${diffDays}` : `Passé (${Math.abs(diffDays)} j)`;

      const allTasks = [];
      MILESTONES.forEach((m) => {
        m.tasks.forEach((t) => allTasks.push(t.id));
      });
      state.customTasks.forEach((ct) => allTasks.push(ct.id));

      const doneSet = new Set(state.doneIds);
      const doneCount = allTasks.filter((id) => doneSet.has(id)).length;
      const pct = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

      kpiDone.textContent = `${doneCount} / ${allTasks.length}`;
      kpiPct.textContent = `${pct} %`;
      progressFill.style.width = `${pct}%`;

      timelineEl.innerHTML = MILESTONES.map((m) => {
        const milestoneDate = addDays(state.weddingDate, m.offsetDays);
        const isPast = milestoneDate < now;
        const customForM = state.customTasks.filter((ct) => ct.milestoneId === m.id);
        const combined = m.tasks.concat(customForM.map((ct) => ({ id: ct.id, text: ct.text, cat: 'Perso', custom: true })));

        const visible = combined.filter((t) => {
          const isDone = doneSet.has(t.id);
          if (filterStatus === 'todo') return !isDone;
          if (filterStatus === 'done') return isDone;
          return true;
        });

        const mDone = combined.filter((t) => doneSet.has(t.id)).length;

        const tasksHTML = visible.length > 0
          ? visible.map((t) => {
              const checked = doneSet.has(t.id);
              return `
                <li class="timeline-task ${checked ? 'is-done' : ''}">
                  <label>
                    <input type="checkbox" data-task-id="${t.id}" ${checked ? 'checked' : ''}>
                    <span>${window.TableLibre.escapeHTML(t.text)}</span>
                  </label>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="badge">${window.TableLibre.escapeHTML(t.cat)}</span>
                    ${t.custom ? `<button type="button" class="icon-btn icon-btn--danger no-print" data-delete-custom="${t.id}" title="Supprimer">×</button>` : ''}
                  </div>
                </li>
              `;
            }).join('')
          : '<li class="timeline-task"><span class="field__hint">Aucune tâche à afficher pour ce filtre.</span></li>';

        return `
          <section class="timeline-milestone">
            <div class="timeline-milestone__head">
              <div>
                <span class="badge badge--sage">${window.TableLibre.escapeHTML(m.label)}</span>
                <h3 class="timeline-milestone__title" style="margin-top:6px;">${window.TableLibre.escapeHTML(m.title)}</h3>
              </div>
              <div style="text-align:right;">
                <div class="timeline-milestone__date">Cible : ${window.TableLibre.formatDateFR(milestoneDate)}</div>
                <div class="field__hint">${mDone}/${combined.length} cochées${isPast && mDone < combined.length ? ' • À rattraper' : ''}</div>
              </div>
            </div>
            <ul class="timeline-tasks">${tasksHTML}</ul>
          </section>
        `;
      }).join('');

      timelineEl.querySelectorAll('[data-task-id]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const id = cb.getAttribute('data-task-id');
          if (cb.checked) {
            if (!state.doneIds.includes(id)) state.doneIds.push(id);
          } else {
            state.doneIds = state.doneIds.filter((x) => x !== id);
          }
          saveState();
          render();
        });
      });

      timelineEl.querySelectorAll('[data-delete-custom]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-delete-custom');
          state.customTasks = state.customTasks.filter((x) => x.id !== id);
          state.doneIds = state.doneIds.filter((x) => x !== id);
          saveState();
          render();
        });
      });
    }

    dateInput.addEventListener('change', () => {
      if (dateInput.value) {
        state.weddingDate = dateInput.value;
        saveState();
        render();
        window.TableLibre.showToast('Toutes les dates du rétroplanning ont été recalculées.');
      }
    });

    document.querySelectorAll('[data-retro-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterStatus = btn.getAttribute('data-retro-filter');
        document.querySelectorAll('[data-retro-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
        render();
      });
    });

    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = customText.value.trim();
      if (!text) return;
      state.customTasks.push({
        id: 'ct_' + Math.random().toString(36).slice(2, 8),
        milestoneId: customMilestone.value,
        text
      });
      customText.value = '';
      saveState();
      render();
      window.TableLibre.showToast('Tâche ajoutée à votre rétroplanning.');
    });

    printBtn.addEventListener('click', () => window.print());

    resetBtn.addEventListener('click', () => {
      state.doneIds = [];
      state.customTasks = [];
      saveState();
      render();
      window.TableLibre.showToast('Toutes les cases ont été décochées.');
    });

    render();
  });
})();
