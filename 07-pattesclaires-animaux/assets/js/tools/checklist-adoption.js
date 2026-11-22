/* ==========================================================================
   Outil 06 — Budget Premier Mois & Checklist Adoption Chiot / Chaton
   Prix modifiables, ajout d'articles, sauvegarde localStorage & impression
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'pattesclaires_checklist_v1';

  const DEFAULT_DATA = {
    chiot: [
      { id: 'c1', cat: 'Couchage & Territoire', title: 'Panier ou coussin déhoussable lavable', price: 48, priority: 'Indispensable', tip: 'Évitez l’osier avec un chiot qui fait ses dents.', checked: false },
      { id: 'c2', cat: 'Couchage & Territoire', title: 'Plaid ou tapis d’appoint', price: 18, priority: 'Recommandé', tip: 'Utile pour lui apprendre sa place au salon ou en voiture.', checked: false },
      { id: 'c3', cat: 'Couchage & Territoire', title: 'Parc à chiot ou barrière d’escalier', price: 65, priority: 'Confort', tip: 'Sécurise le domicile pendant vos courtes absences.', checked: false },

      { id: 'r1', cat: 'Repas & Hydratation', title: '2 gamelles inox ou céramique antidérapantes', price: 24, priority: 'Indispensable', tip: 'Le plastique se raye et retient les bactéries.', checked: false },
      { id: 'r2', cat: 'Repas & Hydratation', title: 'Premier sac de croquettes Chiot (3 à 7 kg)', price: 38, priority: 'Indispensable', tip: 'Conservez la marque de l’éleveur/refuge 15 jours avant toute transition.', checked: false },
      { id: 'r3', cat: 'Repas & Hydratation', title: 'Friandises naturelles d’éducation & mastication', price: 22, priority: 'Recommandé', tip: 'Indispensables pour le rappel et calmer le besoin de mâcher.', checked: false },

      { id: 'p1', cat: 'Promenade & Transport', title: 'Harnais en Y réglable + collier léger', price: 34, priority: 'Indispensable', tip: 'Le harnais en Y préserve la trachée et les épaules en croissance.', checked: false },
      { id: 'p2', cat: 'Promenade & Transport', title: 'Laisse classique (2 m) + longe (5 m)', price: 28, priority: 'Indispensable', tip: 'Évitez les laisses à enrouleur qui apprennent à tirer.', checked: false },
      { id: 'p3', cat: 'Promenade & Transport', title: 'Caisse de transport ou harnais voiture homologué', price: 58, priority: 'Indispensable', tip: 'Obligatoire pour la sécurité dès le trajet retour.', checked: false },
      { id: 'p4', cat: 'Promenade & Transport', title: 'Médaille gravée (nom + téléphone)', price: 12, priority: 'Indispensable', tip: 'Complément immédiat à la puce électronique.', checked: false },

      { id: 's1', cat: 'Santé, Vaccins & Identification', title: 'Visite vétérinaire d’adoption + rappels vaccins', price: 85, priority: 'Indispensable', tip: 'Contrôle complet + rappel CHPPiL à 12 et 16 semaines.', checked: false },
      { id: 's2', cat: 'Santé, Vaccins & Identification', title: 'Vermifuge + antiparasitaire (puces/tiques)', price: 36, priority: 'Indispensable', tip: 'Vermifugation mensuelle jusqu’aux 6 mois du chiot.', checked: false },
      { id: 's3', cat: 'Santé, Vaccins & Identification', title: 'Trousse bobologie (tire-tique, sérum phy, antiseptique)', price: 20, priority: 'Recommandé', tip: 'Biseptine ou chlorhexidine diluée + crochet à tiques.', checked: false },

      { id: 'h1', cat: 'Sécurité, Hygiène & Éveil', title: 'Sacs à déjections + distributeur', price: 10, priority: 'Indispensable', tip: 'Toujours 2 rouleaux d’avance dans le manteau.', checked: false },
      { id: 'h2', cat: 'Sécurité, Hygiène & Éveil', title: 'Brosse adaptée au poil + shampoing doux chiot', price: 24, priority: 'Recommandé', tip: 'Habituez-le dès 2 mois à la manipulation des pattes et oreilles.', checked: false },
      { id: 'h3', cat: 'Sécurité, Hygiène & Éveil', title: 'Jouets d’occupation (Kong, corde, tapis de léchage)', price: 32, priority: 'Recommandé', tip: 'Canalise l’énergie mentale et prévient la destruction.', checked: false }
    ],
    chaton: [
      { id: 'kc1', cat: 'Couchage & Territoire', title: 'Arbre à chat stable avec griffoir sisal', price: 68, priority: 'Indispensable', tip: 'Protège votre canapé et offre un poste d’observation en hauteur.', checked: false },
      { id: 'kc2', cat: 'Couchage & Territoire', title: 'Panier douillet ou igloo lavable', price: 32, priority: 'Recommandé', tip: 'À placer dans un coin calme et légèrement surélevé.', checked: false },

      { id: 'kr1', cat: 'Repas & Hydratation', title: 'Gamelles céramique peu profondes (moustaches)', price: 20, priority: 'Indispensable', tip: 'Les bols larges évitent la fatigue des vibrisses.', checked: false },
      { id: 'kr2', cat: 'Repas & Hydratation', title: 'Fontaine à eau filtrante', price: 35, priority: 'Recommandé', tip: 'Encourage fortement l’hydratation et préserve les reins.', checked: false },
      { id: 'kr3', cat: 'Repas & Hydratation', title: 'Croquettes Chaton (2 kg) + pâtée bi-nutrition', price: 36, priority: 'Indispensable', tip: 'Variez les textures tôt pour éviter un chat difficile.', checked: false },

      { id: 'kp1', cat: 'Promenade & Transport', title: 'Caisse de transport rigide ouverture par le haut', price: 38, priority: 'Indispensable', tip: 'L’ouverture supérieure réduit drastiquement le stress chez le vétérinaire.', checked: false },
      { id: 'kp2', cat: 'Promenade & Transport', title: 'Filet de protection balcon / entrebâilleur fenêtre', price: 34, priority: 'Indispensable', tip: 'Prévient le syndrome du « chat parachutiste » (première cause d’accident).', checked: false },

      { id: 'ks1', cat: 'Santé, Vaccins & Identification', title: 'Visite vétérinaire + rappel typhus / coryza (TC)', price: 78, priority: 'Indispensable', tip: 'Ajoutez la leucose (FeLV) si le chat aura accès à l’extérieur.', checked: false },
      { id: 'ks2', cat: 'Santé, Vaccins & Identification', title: 'Identification puce électronique (si non faite)', price: 70, priority: 'Indispensable', tip: 'Obligatoire en France pour tout chat de plus de 7 mois.', checked: false },
      { id: 'ks3', cat: 'Santé, Vaccins & Identification', title: 'Vermifuge + pipette antipuces', price: 28, priority: 'Indispensable', tip: 'Ne jamais utiliser de perméthrine (antipuce chien mortel pour le chat !).', checked: false },

      { id: 'kh1', cat: 'Sécurité, Hygiène & Éveil', title: 'Bac à litière grand format + pelle + tapis', price: 34, priority: 'Indispensable', tip: 'Règle vétérinaire : 1 bac par chat + 1 supplémentaire si possible.', checked: false },
      { id: 'kh2', cat: 'Sécurité, Hygiène & Éveil', title: 'Litière végétale ou agglomérante sans parfum (1er mois)', price: 18, priority: 'Indispensable', tip: 'Évitez les litières parfumées qui rebutent certains chatons.', checked: false },
      { id: 'kh3', cat: 'Sécurité, Hygiène & Éveil', title: 'Canne à pêche, balles, brosse douce & coupe-griffes', price: 24, priority: 'Recommandé', tip: '15 minutes de jeu de prédation chaque soir régulent son sommeil.', checked: false }
    ]
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  document.addEventListener('DOMContentLoaded', function () {
    const UI = window.PattesUI;
    if (!UI) return;

    const speciesBtns = document.querySelectorAll('[data-check-species]');
    const elContainer = document.getElementById('checklist-container');
    const outTotal = document.getElementById('out-check-total');
    const outSpent = document.getElementById('out-check-spent');
    const outRemaining = document.getElementById('out-check-remaining');
    const outProgressText = document.getElementById('out-check-progress-text');
    const outProgressBar = document.getElementById('out-check-progress-bar');
    const outCatSummary = document.getElementById('out-check-cats');
    const btnPrint = document.getElementById('btn-print-checklist');
    const btnReset = document.getElementById('btn-reset-checklist');
    const formAdd = document.getElementById('form-add-item');

    let species = 'chiot';
    let state = loadState();

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.chiot) && Array.isArray(parsed.chaton)) {
            return parsed;
          }
        }
      } catch (e) {
        /* ignore */
      }
      return cloneDefaults();
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        /* ignore */
      }
    }

    function priorityBadge(p) {
      if (p === 'Indispensable') return '<span class="badge badge-accent">Indispensable</span>';
      if (p === 'Recommandé') return '<span class="badge badge-safe">Recommandé</span>';
      return '<span class="badge">Confort</span>';
    }

    function updateTotals() {
      const items = state[species];
      let total = 0;
      let spent = 0;
      let checkedCount = 0;
      const catTotals = {};

      items.forEach(function (it) {
        const p = Math.max(0, Number(it.price) || 0);
        total += p;
        if (it.checked) {
          spent += p;
          checkedCount += 1;
        }
        catTotals[it.cat] = (catTotals[it.cat] || 0) + p;
      });

      const remaining = Math.max(0, total - spent);
      const pct = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

      outTotal.textContent = UI.formatEUR(total);
      outSpent.textContent = UI.formatEUR(spent);
      outRemaining.textContent = UI.formatEUR(remaining);
      outProgressText.textContent = checkedCount + ' / ' + items.length + ' articles prêts (' + pct + ' %)';
      outProgressBar.style.width = pct + '%';

      outCatSummary.innerHTML = Object.keys(catTotals).map(function (cat) {
        return '<div class="tool-hero-meta-row">' +
          '<span>' + cat + '</span>' +
          '<span>' + UI.formatEUR(catTotals[cat]) + '</span>' +
          '</div>';
      }).join('');
    }

    function renderChecklist() {
      const items = state[species];
      const groups = {};
      const order = [];

      items.forEach(function (it) {
        if (!groups[it.cat]) {
          groups[it.cat] = [];
          order.push(it.cat);
        }
        groups[it.cat].push(it);
      });

      elContainer.innerHTML = order.map(function (cat) {
        const list = groups[cat];
        const catSum = list.reduce(function (s, x) { return s + (Number(x.price) || 0); }, 0);
        const rows = list.map(function (it) {
          return '<div class="checklist-item' + (it.checked ? ' is-checked' : '') + '" data-item-id="' + it.id + '">' +
            '<input type="checkbox" class="checklist-check" aria-label="Marquer ' + it.title.replace(/"/g, '') + ' comme acheté"' + (it.checked ? ' checked' : '') + '>' +
            '<div>' +
            '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">' +
            '<span class="checklist-item-title" style="font-weight:700;">' + it.title + '</span>' +
            priorityBadge(it.priority) +
            '</div>' +
            (it.tip ? '<div style="font-size:0.84rem;color:var(--text-secondary);margin-top:4px;">' + it.tip + '</div>' : '') +
            '</div>' +
            '<div class="checklist-price-wrap">' +
            '<input type="number" class="checklist-price-input" min="0" max="5000" step="1" value="' + it.price + '" aria-label="Prix en euros pour ' + it.title.replace(/"/g, '') + '">' +
            '<span class="mono" style="font-size:0.9rem;color:var(--text-secondary);">€</span>' +
            '</div>' +
            '</div>';
        }).join('');

        return '<section class="checklist-cat">' +
          '<div class="checklist-cat-head">' +
          '<h3 style="margin:0;font-size:1.08rem;">' + cat + '</h3>' +
          '<span class="mono" style="font-weight:600;font-size:0.92rem;color:var(--accent);" data-cat-sum="' + cat + '">' + UI.formatEUR(catSum) + '</span>' +
          '</div>' +
          rows +
          '</section>';
      }).join('');

      elContainer.querySelectorAll('.checklist-item').forEach(function (row) {
        const id = row.getAttribute('data-item-id');
        const checkbox = row.querySelector('.checklist-check');
        const priceInput = row.querySelector('.checklist-price-input');

        checkbox.addEventListener('change', function () {
          const item = state[species].find(function (x) { return x.id === id; });
          if (item) {
            item.checked = checkbox.checked;
            row.classList.toggle('is-checked', item.checked);
            saveState();
            updateTotals();
          }
        });

        priceInput.addEventListener('input', function () {
          const item = state[species].find(function (x) { return x.id === id; });
          if (item) {
            item.price = Math.max(0, Number(priceInput.value) || 0);
            saveState();
            updateTotals();
            /* Met à jour le sous-total de catégorie */
            const catEl = elContainer.querySelector('[data-cat-sum="' + item.cat + '"]');
            if (catEl) {
              const catSum = state[species]
                .filter(function (x) { return x.cat === item.cat; })
                .reduce(function (s, x) { return s + (Number(x.price) || 0); }, 0);
              catEl.textContent = UI.formatEUR(catSum);
            }
          }
        });
      });

      updateTotals();
    }

    speciesBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        speciesBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        species = btn.getAttribute('data-check-species') || 'chiot';
        renderChecklist();
      });
    });

    if (formAdd) {
      formAdd.addEventListener('submit', function (e) {
        e.preventDefault();
        const titleEl = document.getElementById('custom-item-title');
        const catEl = document.getElementById('custom-item-cat');
        const priceEl = document.getElementById('custom-item-price');
        const title = (titleEl.value || '').trim();
        if (!title) return;

        state[species].push({
          id: 'custom-' + Date.now(),
          cat: catEl.value,
          title: title,
          price: Math.max(0, Number(priceEl.value) || 0),
          priority: 'Confort',
          tip: 'Article personnalisé ajouté par vos soins.',
          checked: false
        });
        saveState();
        titleEl.value = '';
        priceEl.value = '25';
        renderChecklist();
        UI.toast('Article ajouté à votre checklist.');
      });
    }

    if (btnPrint) {
      btnPrint.addEventListener('click', function () {
        window.print();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        state[species] = cloneDefaults()[species];
        saveState();
        renderChecklist();
        UI.toast('Checklist réinitialisée aux tarifs moyens 2026.');
      });
    }

    renderChecklist();
  });
})();
