/**
 * TableLibre — Outil 06 : Répartiteur de Dépenses Groupe (EVJF / EVG / Anniversaire)
 * Exclusions par dépense, algorithme de minimisation des virements, export WhatsApp, localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tablelibre_evjf_split_v1';

  let state = {
    eventTitle: 'EVJF de Camille — Week-end Annecy',
    participants: [],
    expenses: []
  };

  function uid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 8);
  }

  function loadSample() {
    state = {
      eventTitle: 'EVJF de Camille — Week-end Annecy',
      participants: [
        { id: 'p1', name: 'Sophie (Témoin)' },
        { id: 'p2', name: 'Claire' },
        { id: 'p3', name: 'Léa' },
        { id: 'p4', name: 'Manon' },
        { id: 'p5', name: 'Chloé' },
        { id: 'p6', name: 'Camille (Mariée)' }
      ],
      expenses: [
        {
          id: 'e1',
          title: 'Gîte 2 nuits (offert à la mariée)',
          amount: 750,
          payerId: 'p1',
          beneficiaryIds: ['p1', 'p2', 'p3', 'p4', 'p5'] // Mariée exclue (on lui offre)
        },
        {
          id: 'e2',
          title: 'Cours de poterie & brunch samedi',
          amount: 330,
          payerId: 'p2',
          beneficiaryIds: ['p1', 'p2', 'p3', 'p4', 'p5']
        },
        {
          id: 'e3',
          title: 'Courses apéro, champagne & déco',
          amount: 165,
          payerId: 'p3',
          beneficiaryIds: ['p1', 'p2', 'p3', 'p4', 'p5']
        },
        {
          id: 'e4',
          title: 'Dîner restaurant vendredi (hors Chloé arrivée samedi)',
          amount: 180,
          payerId: 'p4',
          beneficiaryIds: ['p1', 'p2', 'p3', 'p4']
        }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.participants)) {
          state = parsed;
          return;
        }
      }
    } catch (e) {
      // Fallback
    }
    loadSample();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore
    }
  }

  function computeBalancesAndTransfers() {
    const paid = {};
    const share = {};
    state.participants.forEach((p) => {
      paid[p.id] = 0;
      share[p.id] = 0;
    });

    let totalSpent = 0;
    state.expenses.forEach((exp) => {
      const amount = Number(exp.amount) || 0;
      if (amount <= 0) return;
      const validBenefs = exp.beneficiaryIds.filter((id) => paid.hasOwnProperty(id));
      if (validBenefs.length === 0) return;
      totalSpent += amount;
      if (paid.hasOwnProperty(exp.payerId)) {
        paid[exp.payerId] += amount;
      }
      const perHead = amount / validBenefs.length;
      validBenefs.forEach((id) => {
        share[id] += perHead;
      });
    });

    const balances = state.participants.map((p) => {
      const net = Math.round((paid[p.id] - share[p.id]) * 100) / 100;
      return {
        id: p.id,
        name: p.name,
        paid: Math.round(paid[p.id] * 100) / 100,
        share: Math.round(share[p.id] * 100) / 100,
        net
      };
    });

    // Algorithme glouton de minimisation du nombre de virements
    const debtors = balances
      .filter((b) => b.net < -0.01)
      .map((b) => ({ id: b.id, name: b.name, amount: Math.abs(b.net) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = balances
      .filter((b) => b.net > 0.01)
      .map((b) => ({ id: b.id, name: b.name, amount: b.net }))
      .sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const settled = Math.min(d.amount, c.amount);
      const rounded = Math.round(settled * 100) / 100;
      if (rounded >= 0.01) {
        transfers.push({ from: d.name, to: c.name, amount: rounded });
      }
      d.amount = Math.round((d.amount - settled) * 100) / 100;
      c.amount = Math.round((c.amount - settled) * 100) / 100;
      if (d.amount < 0.01) i++;
      if (c.amount < 0.01) j++;
    }

    return { totalSpent, balances, transfers };
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('split-app')) return;

    const titleInput = document.getElementById('split-title');
    const addPartForm = document.getElementById('add-participant-form');
    const partNameInput = document.getElementById('participant-name');
    const partListEl = document.getElementById('participants-list');

    const addExpForm = document.getElementById('add-expense-form');
    const expTitleInput = document.getElementById('expense-title');
    const expAmountInput = document.getElementById('expense-amount');
    const expPayerSelect = document.getElementById('expense-payer');
    const expBenefsContainer = document.getElementById('expense-beneficiaries');
    const expensesTbody = document.getElementById('expenses-tbody');

    const kpiTotal = document.getElementById('kpi-split-total');
    const kpiCount = document.getElementById('kpi-split-count');
    const kpiTransfers = document.getElementById('kpi-split-transfers');
    const balancesTbody = document.getElementById('balances-tbody');
    const transfersList = document.getElementById('transfers-list');
    const copyWaBtn = document.getElementById('copy-whatsapp-btn');
    const loadSampleBtn = document.getElementById('split-sample-btn');
    const clearBtn = document.getElementById('split-clear-btn');

    loadState();

    function renderParticipantsUI() {
      partListEl.innerHTML = state.participants.map((p) => `
        <span class="badge" style="padding:6px 10px;">
          ${window.TableLibre.escapeHTML(p.name)}
          <button type="button" class="icon-btn icon-btn--danger" style="width:18px;height:18px;margin-left:4px;" data-remove-part="${p.id}" title="Retirer">×</button>
        </span>
      `).join('');

      partListEl.querySelectorAll('[data-remove-part]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-remove-part');
          state.participants = state.participants.filter((p) => p.id !== id);
          state.expenses = state.expenses
            .filter((e) => e.payerId !== id)
            .map((e) => ({ ...e, beneficiaryIds: e.beneficiaryIds.filter((bid) => bid !== id) }));
          saveState();
          renderAll();
        });
      });

      const prevPayer = expPayerSelect.value;
      expPayerSelect.innerHTML = state.participants
        .map((p) => `<option value="${p.id}">${window.TableLibre.escapeHTML(p.name)}</option>`)
        .join('');
      if (state.participants.some((p) => p.id === prevPayer)) {
        expPayerSelect.value = prevPayer;
      }

      expBenefsContainer.innerHTML = state.participants.map((p) => `
        <label class="check-row" style="font-size:0.86rem;">
          <input type="checkbox" name="beneficiary" value="${p.id}" checked>
          <span>${window.TableLibre.escapeHTML(p.name)}</span>
        </label>
      `).join('');
    }

    function renderExpensesAndResults() {
      const { totalSpent, balances, transfers } = computeBalancesAndTransfers();

      kpiTotal.textContent = window.TableLibre.formatEuro(totalSpent, 2);
      kpiCount.textContent = `${state.expenses.length} dépense(s)`;
      kpiTransfers.textContent = `${transfers.length} virement(s)`;

      if (state.expenses.length === 0) {
        expensesTbody.innerHTML = '<tr><td colspan="4" class="field__hint">Aucune dépense enregistrée pour le moment.</td></tr>';
      } else {
        expensesTbody.innerHTML = state.expenses.map((exp) => {
          const payer = state.participants.find((p) => p.id === exp.payerId);
          const excluded = state.participants.filter((p) => !exp.beneficiaryIds.includes(p.id));
          const exclNote = excluded.length > 0
            ? `Hors ${excluded.map((x) => x.name).join(', ')}`
            : 'Tous les participants';
          return `
            <tr>
              <td>
                <strong>${window.TableLibre.escapeHTML(exp.title)}</strong><br>
                <span class="field__hint">${window.TableLibre.escapeHTML(exclNote)}</span>
              </td>
              <td>${window.TableLibre.escapeHTML(payer ? payer.name : '—')}</td>
              <td class="num"><strong>${window.TableLibre.formatEuro(exp.amount, 2)}</strong></td>
              <td class="num"><button type="button" class="icon-btn icon-btn--danger" data-del-exp="${exp.id}" title="Supprimer">×</button></td>
            </tr>
          `;
        }).join('');

        expensesTbody.querySelectorAll('[data-del-exp]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-del-exp');
            state.expenses = state.expenses.filter((e) => e.id !== id);
            saveState();
            renderExpensesAndResults();
          });
        });
      }

      balancesTbody.innerHTML = balances.map((b) => {
        const netColor = b.net > 0.01 ? 'color:var(--accent-sage);font-weight:600;' : (b.net < -0.01 ? 'color:var(--alert-conflict);font-weight:600;' : '');
        const prefix = b.net > 0.01 ? '+' : '';
        return `
          <tr>
            <td><strong>${window.TableLibre.escapeHTML(b.name)}</strong></td>
            <td class="num">${window.TableLibre.formatEuro(b.paid, 2)}</td>
            <td class="num">${window.TableLibre.formatEuro(b.share, 2)}</td>
            <td class="num" style="${netColor}">${prefix}${window.TableLibre.formatEuro(b.net, 2)}</td>
          </tr>
        `;
      }).join('');

      if (transfers.length === 0) {
        transfersList.innerHTML = '<div class="field__hint" style="padding:12px 0;">Tout le monde est à l’équilibre, aucun virement nécessaire.</div>';
      } else {
        transfersList.innerHTML = transfers.map((t) => `
          <div class="transfer-card">
            <div>
              <strong>${window.TableLibre.escapeHTML(t.from)}</strong>
              <span class="transfer-card__arrow"> → rembourse → </span>
              <strong>${window.TableLibre.escapeHTML(t.to)}</strong>
            </div>
            <div class="transfer-card__amount">${window.TableLibre.formatEuro(t.amount, 2)}</div>
          </div>
        `).join('');
      }
    }

    function renderAll() {
      titleInput.value = state.eventTitle;
      renderParticipantsUI();
      renderExpensesAndResults();
    }

    titleInput.addEventListener('input', () => {
      state.eventTitle = titleInput.value;
      saveState();
    });

    addPartForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = partNameInput.value.trim();
      if (!name) return;
      state.participants.push({ id: uid('p'), name });
      partNameInput.value = '';
      saveState();
      renderAll();
    });

    addExpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = expTitleInput.value.trim();
      const amount = parseFloat(expAmountInput.value);
      const payerId = expPayerSelect.value;
      const benefIds = Array.from(expBenefsContainer.querySelectorAll('input[name="beneficiary"]:checked')).map((i) => i.value);

      if (!title || !Number.isFinite(amount) || amount <= 0 || !payerId) {
        window.TableLibre.showToast('Veuillez renseigner un libellé, un montant positif et un payeur.');
        return;
      }
      if (benefIds.length === 0) {
        window.TableLibre.showToast('Cochez au moins un participant concerné par cette dépense.');
        return;
      }

      state.expenses.push({
        id: uid('e'),
        title,
        amount: Math.round(amount * 100) / 100,
        payerId,
        beneficiaryIds: benefIds
      });

      expTitleInput.value = '';
      expAmountInput.value = '';
      saveState();
      renderExpensesAndResults();
      window.TableLibre.showToast('Dépense ajoutée et remboursements recalculés.');
    });

    copyWaBtn.addEventListener('click', () => {
      const { totalSpent, transfers } = computeBalancesAndTransfers();
      const lines = [
        `*${state.eventTitle || 'Comptes du groupe'}*`,
        `Total des dépenses : ${window.TableLibre.formatEuro(totalSpent, 2)}`,
        '',
        '*Virements à effectuer (optimisés) :*'
      ];
      if (transfers.length === 0) {
        lines.push('Tout est équilibré, aucun virement à faire !');
      } else {
        transfers.forEach((t) => {
          lines.push(`• ${t.from} → ${t.to} : *${window.TableLibre.formatEuro(t.amount, 2)}*`);
        });
      }
      lines.push('', '_Calculé gratuitement sur tablelibre.fr_');
      window.TableLibre.copyText(lines.join('\n'), 'Récapitulatif WhatsApp copié !');
    });

    loadSampleBtn.addEventListener('click', () => {
      loadSample();
      saveState();
      renderAll();
      window.TableLibre.showToast('Exemple EVJF chargé.');
    });

    clearBtn.addEventListener('click', () => {
      state = { eventTitle: 'Nouvelle sortie de groupe', participants: [], expenses: [] };
      saveState();
      renderAll();
      window.TableLibre.showToast('Liste réinitialisée.');
    });

    renderAll();
  });
})();
