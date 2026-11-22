/* ==========================================================================
   COMPTABRUT.FR — Outil 04 : Générateur de Facture & Devis Conforme 2026
   Aperçu A4 temps réel + Sauvegarde localStorage + Export PDF & XML Factur-X
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;
  const STORAGE_KEY = 'comptabrut_invoice_draft_v1';

  const DEFAULT_STATE = {
    docType: 'FACTURE',
    docNumber: 'FA-2026-0012',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    operationCat: 'Prestation de services',
    tvaDebits: false,
    franchise293B: true,
    sellerName: 'Camille Laurent — Entrepreneur Individuel (EI)',
    sellerSiren: '882419305',
    sellerTva: '',
    sellerAddress: '18 Rue de la République\n69002 Lyon — France',
    sellerContact: 'camille@atelier-brumaire.fr · 06 12 34 56 78',
    sellerIban: 'FR76 3000 6000 0112 3456 7890 189',
    sellerBic: 'AGRIFRPP',
    buyerName: 'NordicOps SAS',
    buyerSiren: '542107651',
    buyerAddress: '42 Rue La Bruyère\n75009 Paris — France',
    deliveryAddress: '',
    paymentTerms: 'Virement bancaire à 30 jours date de facture. Pas d’escompte en cas de paiement anticipé.',
    penalties: 'Pénalités de retard au taux annuel de 12 % + indemnité forfaitaire de recouvrement de 40,00 € (art. L441-10 du Code de commerce).',
    lines: [
      { desc: 'Conception maquette & intégration front-end', qty: 3, pu: 550, tva: 20 },
      { desc: 'Recette technique & mise en conformité accessibilité', qty: 1, pu: 450, tva: 20 }
    ]
  };

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
    } catch (_e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_e) {
      // Ignore quota
    }
  }

  function formatDateFR(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatSirenDisplay(s) {
    const d = (s || '').replace(/\D/g, '');
    if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    if (d.length === 14) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
    return s || '—';
  }

  function computeTotals() {
    let totalHT = 0;
    const vatMap = {};
    state.lines.forEach((line) => {
      const qty = Math.max(0, parseFloat(line.qty) || 0);
      const pu = Math.max(0, parseFloat(line.pu) || 0);
      const rate = state.franchise293B ? 0 : (parseFloat(line.tva) || 0);
      const lineHT = qty * pu;
      const lineTVA = lineHT * (rate / 100);
      totalHT += lineHT;
      if (rate > 0) {
        vatMap[rate] = (vatMap[rate] || 0) + lineTVA;
      }
    });
    const totalTVA = Object.values(vatMap).reduce((a, b) => a + b, 0);
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA, vatMap };
  }

  function renderLinesEditor() {
    const container = document.getElementById('inv-lines-editor');
    if (!container) return;

    container.innerHTML = state.lines.map((line, idx) => `
      <div class="line-editor-item" data-line-idx="${idx}">
        <div class="line-editor-grid">
          <div>
            <label class="form-label" style="font-size:0.78rem;margin-bottom:4px;">Description</label>
            <input type="text" class="input" data-field="desc" value="${CB.escapeHTML(line.desc)}" placeholder="Libellé prestation ou produit">
          </div>
          <div>
            <label class="form-label" style="font-size:0.78rem;margin-bottom:4px;">Qté</label>
            <input type="number" step="0.25" min="0" class="input input-mono" data-field="qty" value="${line.qty}">
          </div>
          <div>
            <label class="form-label" style="font-size:0.78rem;margin-bottom:4px;">PU HT (€)</label>
            <input type="number" step="0.01" min="0" class="input input-mono" data-field="pu" value="${line.pu}">
          </div>
          <div>
            <label class="form-label" style="font-size:0.78rem;margin-bottom:4px;">TVA</label>
            <select class="select input-mono" data-field="tva" ${state.franchise293B ? 'disabled' : ''}>
              ${[20, 10, 5.5, 2.1, 0].map((r) => `<option value="${r}" ${Number(line.tva) === r ? 'selected' : ''}>${r} %</option>`).join('')}
            </select>
          </div>
          <div>
            <button type="button" class="btn btn-danger-ghost btn-sm" data-remove-line="${idx}" title="Supprimer cette ligne" aria-label="Supprimer la ligne ${idx + 1}">✕</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.line-editor-item').forEach((row) => {
      const idx = Number(row.getAttribute('data-line-idx'));
      row.querySelectorAll('[data-field]').forEach((input) => {
        input.addEventListener('input', () => {
          const field = input.getAttribute('data-field');
          state.lines[idx][field] = field === 'desc' ? input.value : (parseFloat(input.value) || 0);
          saveState();
          renderPreview();
        });
      });
    });

    container.querySelectorAll('[data-remove-line]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-remove-line'));
        if (state.lines.length <= 1) {
          CB.toast('Conservez au moins une ligne de facturation');
          return;
        }
        state.lines.splice(idx, 1);
        saveState();
        renderLinesEditor();
        renderPreview();
      });
    });
  }

  function renderPreview() {
    const totals = computeTotals();
    const isDevis = state.docType === 'DEVIS';

    document.getElementById('pv-doc-type').textContent = state.docType;
    document.getElementById('pv-doc-number').textContent = state.docNumber || '—';
    document.getElementById('pv-issue-date').textContent = formatDateFR(state.issueDate);
    document.getElementById('pv-due-label').textContent = isDevis ? 'Valable jusqu’au' : 'Échéance';
    document.getElementById('pv-due-date').textContent = formatDateFR(state.dueDate);
    document.getElementById('pv-op-cat').textContent = state.operationCat;

    // Émetteur
    document.getElementById('pv-seller-name').textContent = state.sellerName || '—';
    document.getElementById('pv-seller-address').innerHTML = CB.escapeHTML(state.sellerAddress).replace(/\n/g, '<br>');
    document.getElementById('pv-seller-siren').textContent = formatSirenDisplay(state.sellerSiren);
    const sellerTvaRow = document.getElementById('pv-seller-tva-row');
    if (!state.franchise293B && state.sellerTva.trim()) {
      sellerTvaRow.style.display = 'block';
      document.getElementById('pv-seller-tva').textContent = state.sellerTva.trim();
    } else {
      sellerTvaRow.style.display = 'none';
    }
    document.getElementById('pv-seller-contact').textContent = state.sellerContact || '';

    // Client
    document.getElementById('pv-buyer-name').textContent = state.buyerName || '—';
    document.getElementById('pv-buyer-address').innerHTML = CB.escapeHTML(state.buyerAddress).replace(/\n/g, '<br>');
    document.getElementById('pv-buyer-siren').textContent = formatSirenDisplay(state.buyerSiren);

    const deliveryBlock = document.getElementById('pv-delivery-block');
    if (state.deliveryAddress.trim()) {
      deliveryBlock.style.display = 'block';
      document.getElementById('pv-delivery-address').textContent = state.deliveryAddress.trim();
    } else {
      deliveryBlock.style.display = 'none';
    }

    // Lignes tableau
    const tbody = document.getElementById('pv-lines-tbody');
    tbody.innerHTML = state.lines.map((line) => {
      const qty = Math.max(0, parseFloat(line.qty) || 0);
      const pu = Math.max(0, parseFloat(line.pu) || 0);
      const rate = state.franchise293B ? 0 : (parseFloat(line.tva) || 0);
      const total = qty * pu;
      return `
        <tr>
          <td>${CB.escapeHTML(line.desc || 'Prestation')}</td>
          <td class="num-col">${CB.formatNumber(qty, 2)}</td>
          <td class="num-col">${CB.formatEUR(pu)}</td>
          <td class="num-col">${state.franchise293B ? 'N/A' : CB.formatPct(rate, 1)}</td>
          <td class="num-col"><strong>${CB.formatEUR(total)}</strong></td>
        </tr>
      `;
    }).join('');

    // Totaux
    const totalsBox = document.getElementById('pv-totals');
    let rowsHTML = `<div class="inv-total-row"><span>Total HT</span><span class="mono">${CB.formatEUR(totals.totalHT)}</span></div>`;
    if (state.franchise293B) {
      rowsHTML += `<div class="inv-total-row"><span>TVA (art. 293 B CGI)</span><span class="mono">0,00 €</span></div>`;
    } else {
      const rates = Object.keys(totals.vatMap).sort((a, b) => Number(b) - Number(a));
      if (rates.length === 0) {
        rowsHTML += `<div class="inv-total-row"><span>Total TVA</span><span class="mono">0,00 €</span></div>`;
      } else {
        rates.forEach((r) => {
          rowsHTML += `<div class="inv-total-row"><span>TVA ${r} %</span><span class="mono">${CB.formatEUR(totals.vatMap[r])}</span></div>`;
        });
      }
    }
    rowsHTML += `<div class="inv-total-row"><span>${isDevis ? 'Net à payer TTC' : 'Total TTC à payer'}</span><span class="mono">${CB.formatEUR(totals.totalTTC)}</span></div>`;
    totalsBox.innerHTML = rowsHTML;

    // Mentions légales 2026
    const legalParts = [];
    if (state.franchise293B) {
      legalParts.push('<strong>TVA non applicable, art. 293 B du CGI.</strong>');
    } else if (state.tvaDebits) {
      legalParts.push('<strong>Option pour le paiement de la TVA d’après les débits.</strong>');
    }
    legalParts.push(`Catégorie d’opération : ${CB.escapeHTML(state.operationCat)}.`);
    if (state.sellerIban.trim()) {
      legalParts.push(`Règlement par virement — IBAN : <span class="mono">${CB.escapeHTML(state.sellerIban)}</span>${state.sellerBic.trim() ? ` · BIC : <span class="mono">${CB.escapeHTML(state.sellerBic)}</span>` : ''}.`);
    }
    if (state.paymentTerms.trim()) {
      legalParts.push(CB.escapeHTML(state.paymentTerms));
    }
    if (!isDevis && state.penalties.trim()) {
      legalParts.push(CB.escapeHTML(state.penalties));
    }
    if (isDevis) {
      legalParts.push('<strong>Bon pour accord :</strong> Date, signature et mention manuscrite « Lu et approuvé, bon pour accord ».');
    }

    document.getElementById('pv-legal-footer').innerHTML = legalParts.map((p) => `<p style="margin:0 0 4px 0;color:#4E5660;">${p}</p>`).join('');
  }

  function exportFacturXXML() {
    const totals = computeTotals();
    const issueCompact = (state.issueDate || '2026-01-01').replace(/-/g, '');
    const dueCompact = (state.dueDate || '2026-01-31').replace(/-/g, '');
    const sellerSirenClean = (state.sellerSiren || '').replace(/\D/g, '').slice(0, 9);
    const buyerSirenClean = (state.buyerSiren || '').replace(/\D/g, '').slice(0, 9);
    const ibanClean = (state.sellerIban || '').replace(/\s+/g, '');

    const linesXML = state.lines.map((l, i) => {
      const qty = Math.max(0, parseFloat(l.qty) || 0);
      const pu = Math.max(0, parseFloat(l.pu) || 0);
      const rate = state.franchise293B ? 0 : (parseFloat(l.tva) || 0);
      const cat = state.franchise293B ? 'E' : (rate === 0 ? 'Z' : 'S');
      return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${CB.escapeHTML(l.desc)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${pu.toFixed(2)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${qty.toFixed(2)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${cat}</ram:CategoryCode><ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${(qty * pu).toFixed(2)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${CB.escapeHTML(state.docNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issueCompact}</udt:DateTimeString></ram:IssueDateTime>
    <ram:IncludedNote><ram:Content>Catégorie d'opération : ${CB.escapeHTML(state.operationCat)}. ${state.franchise293B ? 'TVA non applicable, art. 293 B du CGI.' : ''}</ram:Content><ram:SubjectCode>REG</ram:SubjectCode></ram:IncludedNote>
    <ram:IncludedNote><ram:Content>${CB.escapeHTML(state.penalties)}</ram:Content><ram:SubjectCode>PMD</ram:SubjectCode></ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${linesXML}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${CB.escapeHTML(state.sellerName)}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${CB.escapeHTML(sellerSirenClean)}</ram:ID></ram:SpecifiedLegalOrganization>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${CB.escapeHTML(state.buyerName)}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${CB.escapeHTML(buyerSirenClean)}</ram:ID></ram:SpecifiedLegalOrganization>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>30</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${CB.escapeHTML(ibanClean)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${CB.escapeHTML(state.paymentTerms)}</ram:Description>
        <ram:DueDateDateTime><udt:DateTimeString format="102">${dueCompact}</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totals.totalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${totals.totalHT.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totals.totalTVA.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totals.totalTTC.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totals.totalTTC.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.docNumber || 'facture').replace(/[^a-zA-Z0-9_-]/g, '_')}-factur-x.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    CB.toast('XML Factur-X EN 16931 téléchargé');
  }

  function bindField(id, prop, isCheckbox = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isCheckbox) {
      el.checked = Boolean(state[prop]);
      el.addEventListener('change', () => {
        state[prop] = el.checked;
        saveState();
        if (prop === 'franchise293B') {
          document.getElementById('inv-tva-fields').style.display = state.franchise293B ? 'none' : 'block';
          renderLinesEditor();
        }
        renderPreview();
      });
    } else {
      el.value = state[prop] || '';
      el.addEventListener('input', () => {
        state[prop] = el.value;
        saveState();
        renderPreview();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('inv-lines-editor')) return;

    // Boutons type Facture / Devis
    document.querySelectorAll('[data-doc-type]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-doc-type') === state.docType);
      btn.addEventListener('click', () => {
        state.docType = btn.getAttribute('data-doc-type');
        document.querySelectorAll('[data-doc-type]').forEach((b) => b.classList.toggle('is-active', b === btn));
        if (state.docType === 'DEVIS' && state.docNumber.startsWith('FA-')) {
          state.docNumber = state.docNumber.replace(/^FA-/, 'DV-');
          document.getElementById('inv-number').value = state.docNumber;
        } else if (state.docType === 'FACTURE' && state.docNumber.startsWith('DV-')) {
          state.docNumber = state.docNumber.replace(/^DV-/, 'FA-');
          document.getElementById('inv-number').value = state.docNumber;
        }
        saveState();
        renderPreview();
      });
    });

    bindField('inv-number', 'docNumber');
    bindField('inv-issue-date', 'issueDate');
    bindField('inv-due-date', 'dueDate');
    bindField('inv-op-cat', 'operationCat');
    bindField('inv-franchise', 'franchise293B', true);
    bindField('inv-tva-debits', 'tvaDebits', true);
    bindField('inv-seller-name', 'sellerName');
    bindField('inv-seller-siren', 'sellerSiren');
    bindField('inv-seller-tva', 'sellerTva');
    bindField('inv-seller-address', 'sellerAddress');
    bindField('inv-seller-contact', 'sellerContact');
    bindField('inv-seller-iban', 'sellerIban');
    bindField('inv-seller-bic', 'sellerBic');
    bindField('inv-buyer-name', 'buyerName');
    bindField('inv-buyer-siren', 'buyerSiren');
    bindField('inv-buyer-address', 'buyerAddress');
    bindField('inv-delivery-address', 'deliveryAddress');
    bindField('inv-payment-terms', 'paymentTerms');
    bindField('inv-penalties', 'penalties');

    document.getElementById('inv-tva-fields').style.display = state.franchise293B ? 'none' : 'block';

    document.getElementById('inv-add-line').addEventListener('click', () => {
      state.lines.push({ desc: 'Nouvelle prestation', qty: 1, pu: 250, tva: 20 });
      saveState();
      renderLinesEditor();
      renderPreview();
    });

    document.getElementById('inv-print-btn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('inv-xml-btn').addEventListener('click', exportFacturXXML);

    document.getElementById('inv-reset-btn').addEventListener('click', () => {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState();
      location.reload();
    });

    renderLinesEditor();
    renderPreview();
  });
})();
