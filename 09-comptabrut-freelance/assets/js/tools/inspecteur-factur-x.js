/* ==========================================================================
   COMPTABRUT.FR — Outil 01 : Inspecteur & Validateur Factur-X 2026
   Analyse 100 % locale dans le navigateur (PDF embarqué + XML CII / UBL)
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  const SAMPLE_COMPLIANT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>FA-2026-0042</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260915</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>Catégorie d'opération : Prestation de services (PS). Option pour le paiement de la TVA d'après les débits : Non.</ram:Content>
      <ram:SubjectCode>REG</ram:SubjectCode>
    </ram:IncludedNote>
    <ram:IncludedNote>
      <ram:Content>En cas de retard de paiement : pénalités au taux annuel de 12 % et indemnité forfaitaire de recouvrement de 40,00 EUR (art. L441-10 du Code de commerce).</ram:Content>
      <ram:SubjectCode>PMD</ram:SubjectCode>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Audit architecture front-end &amp; optimisation Core Web Vitals</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>650.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="DAY">4.00</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>2600.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>2</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Atelier mise en conformité Factur-X / PDP (demi-journée)</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>400.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">1.00</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>400.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>BON-2026-881</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>Atelier Brumaire EI — Camille Laurent</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">882419305</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>69002</ram:PostcodeCode>
          <ram:LineOne>18 Rue de la République</ram:LineOne>
          <ram:CityName>Lyon</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR47882419305</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>NordicOps SAS</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">542107651</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>75009</ram:PostcodeCode>
          <ram:LineOne>42 Rue La Bruyère</ram:LineOne>
          <ram:CityName>Paris</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR34542107651</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ShipToTradeParty>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>75009</ram:PostcodeCode>
          <ram:LineOne>42 Rue La Bruyère</ram:LineOne>
          <ram:CityName>Paris</ram:CityName>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:ShipToTradeParty>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>30</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>FR7630006000011234567890189</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>600.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>3000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Paiement par virement bancaire à 30 jours fin de mois</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">20261015</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>3000.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>3000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">600.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>3600.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>3600.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  const SAMPLE_INCOMPLETE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>F-2026-109</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20260922</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Studio Graphique Nova</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">901234567</ram:ID>
        </ram:SpecifiedLegalOrganization>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Client B2B Sans SIREN</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>1200.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">240.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1440.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>1440.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  let lastRawXML = '';

  function getByLocalName(parent, name) {
    if (!parent) return null;
    const all = parent.getElementsByTagName('*');
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].localName === name) return all[i];
    }
    return null;
  }

  function getAllByLocalName(parent, name) {
    if (!parent) return [];
    const res = [];
    const all = parent.getElementsByTagName('*');
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].localName === name) res.push(all[i]);
    }
    return res;
  }

  function getText(parent, name) {
    const el = getByLocalName(parent, name);
    return el ? el.textContent.trim() : '';
  }

  function formatRawDate(str) {
    if (!str) return '—';
    const clean = str.trim();
    if (/^\d{8}$/.test(clean)) {
      return `${clean.slice(6, 8)}/${clean.slice(4, 6)}/${clean.slice(0, 4)}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return clean;
  }

  function detectProfile(guideline) {
    const g = (guideline || '').toLowerCase();
    if (g.includes('extended')) return { label: 'EXTENDED', level: 'Complet étendu', ok2026: true };
    if (g.includes('en16931') || g.includes('comfort')) return { label: 'EN 16931 (COMFORT)', level: 'Standard européen B2B', ok2026: true };
    if (g.includes('basicwl')) return { label: 'BASIC WL', level: 'Sans lignes de détail', ok2026: false };
    if (g.includes('basic')) return { label: 'BASIC', level: 'Simplifié avec lignes', ok2026: true };
    if (g.includes('minimum')) return { label: 'MINIMUM', level: 'Métadonnées uniquement (insuffisant B2B)', ok2026: false };
    if (g.includes('ubl')) return { label: 'UBL 2.1 EN 16931', level: 'Standard UBL européen', ok2026: true };
    return { label: guideline ? 'Personnalisé / Non standard' : 'Non déclaré', level: 'Profil non identifié', ok2026: false };
  }

  function extractXMLFromText(text) {
    const patterns = [
      /<[a-zA-Z0-9_-]*:?CrossIndustryInvoice[\s\S]*?<\/[a-zA-Z0-9_-]*:?CrossIndustryInvoice>/,
      /<[a-zA-Z0-9_-]*:?Invoice[\s\S]*?<\/[a-zA-Z0-9_-]*:?Invoice>/,
      /<[a-zA-Z0-9_-]*:?CreditNote[\s\S]*?<\/[a-zA-Z0-9_-]*:?CreditNote>/
    ];
    for (const regex of patterns) {
      const m = text.match(regex);
      if (m) return '<?xml version="1.0" encoding="UTF-8"?>\n' + m[0];
    }
    return null;
  }

  async function tryDecompressDeflate(bytes) {
    if (typeof DecompressionStream === 'undefined') return null;
    for (const algo of ['deflate', 'deflate-raw']) {
      try {
        const ds = new DecompressionStream(algo);
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const out = await new Response(ds.readable).text();
        if (out && out.includes('Invoice')) return out;
      } catch (_e) {
        // Essai suivant
      }
    }
    return null;
  }

  /**
   * Extraction locale d'un flux XML Factur-X depuis un fichier binaire PDF
   */
  async function extractXMLFromPDF(arrayBuffer) {
    const uint8 = new Uint8Array(arrayBuffer);
    const latin1 = new TextDecoder('latin1').decode(uint8);

    // 1. Recherche directe en clair (non compressé)
    const direct = extractXMLFromText(latin1);
    if (direct) return direct;

    // 2. Recherche dans les objets stream compressés (FlateDecode)
    const streamRegex = /stream\r?\n/g;
    let match;
    let attempts = 0;
    while ((match = streamRegex.exec(latin1)) !== null && attempts < 60) {
      attempts += 1;
      const start = match.index + match[0].length;
      const endIdx = latin1.indexOf('endstream', start);
      if (endIdx === -1) break;
      let end = endIdx;
      while (end > start && (uint8[end - 1] === 10 || uint8[end - 1] === 13)) {
        end -= 1;
      }
      const slice = uint8.slice(start, end);
      if (slice.length > 40 && slice.length < 4 * 1024 * 1024) {
        const inflated = await tryDecompressDeflate(slice);
        if (inflated) {
          const found = extractXMLFromText(inflated);
          if (found) return found;
        }
      }
    }
    return null;
  }

  function parseCII(doc) {
    const root = doc.documentElement;
    const guideline = getText(getByLocalName(root, 'ExchangedDocumentContext'), 'ID');
    const exchangedDoc = getByLocalName(root, 'ExchangedDocument');
    const tx = getByLocalName(root, 'SupplyChainTradeTransaction');
    const headerAgree = getByLocalName(tx, 'ApplicableHeaderTradeAgreement');
    const headerDeliv = getByLocalName(tx, 'ApplicableHeaderTradeDelivery');
    const headerSettle = getByLocalName(tx, 'ApplicableHeaderTradeSettlement');

    const seller = getByLocalName(headerAgree, 'SellerTradeParty');
    const buyer = getByLocalName(headerAgree, 'BuyerTradeParty');
    const sellerAddr = getByLocalName(seller, 'PostalTradeAddress');
    const buyerAddr = getByLocalName(buyer, 'PostalTradeAddress');
    const shipTo = getByLocalName(headerDeliv, 'ShipToTradeParty');
    const shipAddr = getByLocalName(shipTo, 'PostalTradeAddress');

    const notes = getAllByLocalName(exchangedDoc, 'IncludedNote').map((n) => getText(n, 'Content')).filter(Boolean);
    const paymentTerms = getByLocalName(headerSettle, 'SpecifiedTradePaymentTerms');
    const summation = getByLocalName(headerSettle, 'SpecifiedTradeSettlementHeaderMonetarySummation');

    const lines = getAllByLocalName(tx, 'IncludedSupplyChainTradeLineItem').map((item, idx) => {
      const product = getByLocalName(item, 'SpecifiedTradeProduct');
      const agreement = getByLocalName(item, 'SpecifiedLineTradeAgreement');
      const delivery = getByLocalName(item, 'SpecifiedLineTradeDelivery');
      const settlement = getByLocalName(item, 'SpecifiedLineTradeSettlement');
      const tax = getByLocalName(settlement, 'ApplicableTradeTax');
      return {
        id: getText(item, 'LineID') || String(idx + 1),
        name: getText(product, 'Name') || 'Ligne sans libellé',
        qty: parseFloat(getText(delivery, 'BilledQuantity') || '1') || 0,
        unitPrice: parseFloat(getText(agreement, 'ChargeAmount') || '0') || 0,
        vatRate: parseFloat(getText(tax, 'RateApplicablePercent') || '0') || 0,
        lineTotal: parseFloat(getText(settlement, 'LineTotalAmount') || '0') || 0
      };
    });

    const sellerOrg = getByLocalName(seller, 'SpecifiedLegalOrganization');
    const buyerOrg = getByLocalName(buyer, 'SpecifiedLegalOrganization');
    const sellerTax = getByLocalName(seller, 'SpecifiedTaxRegistration');
    const buyerTax = getByLocalName(buyer, 'SpecifiedTaxRegistration');

    return {
      syntax: 'CII (UN/CEFACT CrossIndustryInvoice)',
      guideline,
      profile: detectProfile(guideline),
      invoiceNumber: getText(exchangedDoc, 'ID'),
      typeCode: getText(exchangedDoc, 'TypeCode') || '380',
      issueDate: formatRawDate(getText(getByLocalName(exchangedDoc, 'IssueDateTime'), 'DateTimeString')),
      dueDate: formatRawDate(getText(getByLocalName(paymentTerms, 'DueDateDateTime'), 'DateTimeString')),
      currency: getText(headerSettle, 'InvoiceCurrencyCode') || 'EUR',
      seller: {
        name: getText(seller, 'Name'),
        siren: getText(sellerOrg, 'ID') || getText(seller, 'GlobalID'),
        vat: getText(sellerTax, 'ID'),
        address: [getText(sellerAddr, 'LineOne'), getText(sellerAddr, 'PostcodeCode'), getText(sellerAddr, 'CityName'), getText(sellerAddr, 'CountryID')].filter(Boolean).join(' ')
      },
      buyer: {
        name: getText(buyer, 'Name'),
        siren: getText(buyerOrg, 'ID') || getText(buyer, 'GlobalID'),
        vat: getText(buyerTax, 'ID'),
        address: [getText(buyerAddr, 'LineOne'), getText(buyerAddr, 'PostcodeCode'), getText(buyerAddr, 'CityName'), getText(buyerAddr, 'CountryID')].filter(Boolean).join(' ')
      },
      deliveryAddress: shipAddr ? [getText(shipAddr, 'LineOne'), getText(shipAddr, 'PostcodeCode'), getText(shipAddr, 'CityName'), getText(shipAddr, 'CountryID')].filter(Boolean).join(' ') : '',
      iban: getText(headerSettle, 'IBANID'),
      paymentTerms: getText(paymentTerms, 'Description'),
      notes,
      lines,
      totals: {
        ht: parseFloat(getText(summation, 'TaxBasisTotalAmount') || getText(summation, 'LineTotalAmount') || '0') || 0,
        tva: parseFloat(getText(summation, 'TaxTotalAmount') || '0') || 0,
        ttc: parseFloat(getText(summation, 'GrandTotalAmount') || '0') || 0,
        due: parseFloat(getText(summation, 'DuePayableAmount') || getText(summation, 'GrandTotalAmount') || '0') || 0
      }
    };
  }

  function parseUBL(doc) {
    const root = doc.documentElement;
    const guideline = getText(root, 'CustomizationID') || getText(root, 'ProfileID');
    const sellerParty = getByLocalName(root, 'AccountingSupplierParty');
    const buyerParty = getByLocalName(root, 'AccountingCustomerParty');
    const monetary = getByLocalName(root, 'LegalMonetaryTotal');
    const taxTotal = getByLocalName(root, 'TaxTotal');
    const delivery = getByLocalName(root, 'Delivery');

    const lines = getAllByLocalName(root, 'InvoiceLine').map((line, idx) => ({
      id: getText(line, 'ID') || String(idx + 1),
      name: getText(getByLocalName(line, 'Item'), 'Name') || 'Ligne',
      qty: parseFloat(getText(line, 'InvoicedQuantity') || '1') || 0,
      unitPrice: parseFloat(getText(getByLocalName(line, 'Price'), 'PriceAmount') || '0') || 0,
      vatRate: parseFloat(getText(getByLocalName(line, 'ClassifiedTaxCategory'), 'Percent') || '0') || 0,
      lineTotal: parseFloat(getText(line, 'LineExtensionAmount') || '0') || 0
    }));

    const notes = getAllByLocalName(root, 'Note').map((n) => n.textContent.trim()).filter(Boolean);

    return {
      syntax: 'UBL 2.1 (OASIS Invoice)',
      guideline,
      profile: detectProfile(guideline || 'ubl'),
      invoiceNumber: getText(root, 'ID'),
      typeCode: getText(root, 'InvoiceTypeCode') || '380',
      issueDate: formatRawDate(getText(root, 'IssueDate')),
      dueDate: formatRawDate(getText(root, 'DueDate')),
      currency: getText(root, 'DocumentCurrencyCode') || 'EUR',
      seller: {
        name: getText(getByLocalName(sellerParty, 'PartyLegalEntity'), 'RegistrationName') || getText(getByLocalName(sellerParty, 'PartyName'), 'Name'),
        siren: getText(getByLocalName(sellerParty, 'PartyLegalEntity'), 'CompanyID'),
        vat: getText(getByLocalName(sellerParty, 'PartyTaxScheme'), 'CompanyID'),
        address: [getText(sellerParty, 'StreetName'), getText(sellerParty, 'PostalZone'), getText(sellerParty, 'CityName')].filter(Boolean).join(' ')
      },
      buyer: {
        name: getText(getByLocalName(buyerParty, 'PartyLegalEntity'), 'RegistrationName') || getText(getByLocalName(buyerParty, 'PartyName'), 'Name'),
        siren: getText(getByLocalName(buyerParty, 'PartyLegalEntity'), 'CompanyID'),
        vat: getText(getByLocalName(buyerParty, 'PartyTaxScheme'), 'CompanyID'),
        address: [getText(buyerParty, 'StreetName'), getText(buyerParty, 'PostalZone'), getText(buyerParty, 'CityName')].filter(Boolean).join(' ')
      },
      deliveryAddress: delivery ? [getText(delivery, 'StreetName'), getText(delivery, 'PostalZone'), getText(delivery, 'CityName')].filter(Boolean).join(' ') : '',
      iban: getText(getByLocalName(root, 'PayeeFinancialAccount'), 'ID'),
      paymentTerms: getText(getByLocalName(root, 'PaymentTerms'), 'Note'),
      notes,
      lines,
      totals: {
        ht: parseFloat(getText(monetary, 'TaxExclusiveAmount') || '0') || 0,
        tva: parseFloat(getText(taxTotal, 'TaxAmount') || '0') || 0,
        ttc: parseFloat(getText(monetary, 'TaxInclusiveAmount') || '0') || 0,
        due: parseFloat(getText(monetary, 'PayableAmount') || '0') || 0
      }
    };
  }

  function buildComplianceChecklist(data) {
    const notesJoined = (data.notes.join(' ') + ' ' + data.paymentTerms).toLowerCase();
    const cleanSiren = (s) => (s || '').replace(/\D/g, '');
    const sellerSirenClean = cleanSiren(data.seller.siren);
    const buyerSirenClean = cleanSiren(data.buyer.siren);

    const calcDiff = Math.abs((data.totals.ht + data.totals.tva) - data.totals.ttc);
    const hasCategoryMention = /catégorie|prestation de services|livraison de biens|mixte|\bps\b|\blb\b/.test(notesJoined);
    const hasDebitOrPenalties = /débit|pénalité|recouvrement|l441|293 b|retard/.test(notesJoined);

    return [
      {
        title: 'Profil Factur-X / EN 16931 compatible B2B',
        detail: `Profil détecté : ${data.profile.label} (${data.profile.level})`,
        status: data.profile.ok2026 ? 'ok' : 'fail',
        badge: data.profile.ok2026 ? 'CONFORME' : 'INSUFFISANT'
      },
      {
        title: 'Numéro de facture et date d’émission',
        detail: data.invoiceNumber ? `N° ${data.invoiceNumber} — émise le ${data.issueDate}` : 'Numéro ou date manquant dans ExchangedDocument',
        status: data.invoiceNumber && data.issueDate !== '—' ? 'ok' : 'fail',
        badge: data.invoiceNumber && data.issueDate !== '—' ? 'CONFORME' : 'MANQUANT'
      },
      {
        title: 'Identification du vendeur (Raison sociale + SIREN/SIRET)',
        detail: data.seller.name && sellerSirenClean.length >= 9 ? `${data.seller.name} — ID ${data.seller.siren}` : 'SIREN (9 chiffres) ou raison sociale vendeur incomplet',
        status: data.seller.name && sellerSirenClean.length >= 9 ? 'ok' : 'fail',
        badge: data.seller.name && sellerSirenClean.length >= 9 ? 'CONFORME' : 'INCOMPLET'
      },
      {
        title: 'SIREN de l’acheteur (Nouvelle mention obligatoire 2026)',
        detail: buyerSirenClean.length >= 9 ? `SIREN/SIRET acheteur présent : ${data.buyer.siren}` : 'SIREN acheteur absent : rejeté par les PDP dès septembre 2026 pour les opérations B2B domestiques.',
        status: buyerSirenClean.length >= 9 ? 'ok' : 'fail',
        badge: buyerSirenClean.length >= 9 ? 'CONFORME 2026' : 'REJET PDP'
      },
      {
        title: 'Adresse de livraison ou d’exécution (Mention 2026)',
        detail: data.deliveryAddress ? `Adresse renseignée : ${data.deliveryAddress}` : 'Balise ShipToTradeParty absente (obligatoire si différente de l’adresse de facturation).',
        status: data.deliveryAddress ? 'ok' : 'warn',
        badge: data.deliveryAddress ? 'PRÉSENTE' : 'À VÉRIFIER'
      },
      {
        title: 'Catégorie d’opération : Biens / Services / Mixte (Mention 2026)',
        detail: hasCategoryMention ? 'Mention de catégorie d’opération détectée dans les notes réglementaires.' : 'Aucune mention explicite de nature d’opération (biens / services / mixte) détectée dans IncludedNote.',
        status: hasCategoryMention ? 'ok' : 'warn',
        badge: hasCategoryMention ? 'DÉTECTÉE' : 'ABSENTE'
      },
      {
        title: 'Détail des lignes de facturation (HT, Qté, TVA)',
        detail: data.lines.length > 0 ? `${data.lines.length} ligne(s) structurée(s) extraite(s).` : 'Aucune ligne de détail (profil MINIMUM ou BASIC WL non recevable en B2B 2026).',
        status: data.lines.length > 0 ? 'ok' : 'fail',
        badge: data.lines.length > 0 ? `${data.lines.length} LIGNE(S)` : 'ABSENT'
      },
      {
        title: 'Cohérence arithmétique HT + TVA = TTC',
        detail: `HT ${CB.formatEUR(data.totals.ht)} + TVA ${CB.formatEUR(data.totals.tva)} = ${CB.formatEUR(data.totals.ht + data.totals.tva)} (TTC déclaré : ${CB.formatEUR(data.totals.ttc)}).`,
        status: calcDiff <= 0.02 && data.totals.ttc > 0 ? 'ok' : 'fail',
        badge: calcDiff <= 0.02 && data.totals.ttc > 0 ? 'EXACT' : 'ÉCART'
      },
      {
        title: 'Conditions de règlement, pénalités & option TVA débits',
        detail: hasDebitOrPenalties || data.dueDate !== '—' ? `Échéance : ${data.dueDate}${data.paymentTerms ? ' — ' + data.paymentTerms : ''}` : 'Échéance ou mentions de pénalités / TVA débits non détectées.',
        status: hasDebitOrPenalties && data.dueDate !== '—' ? 'ok' : 'warn',
        badge: hasDebitOrPenalties && data.dueDate !== '—' ? 'PRÉSENT' : 'PARTIEL'
      }
    ];
  }

  function renderResult(xmlString, sourceLabel) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    const errorBox = document.getElementById('fx-error');
    const resultsWrap = document.getElementById('fx-results');

    if (parseErr) {
      errorBox.style.display = 'block';
      errorBox.innerHTML = `<strong>XML invalide :</strong> Le flux XML extrait contient une erreur de syntaxe et ne peut pas être parsé par une plateforme PDP.`;
      resultsWrap.style.display = 'none';
      return;
    }

    errorBox.style.display = 'none';
    resultsWrap.style.display = 'block';
    lastRawXML = CB.formatXML(xmlString);

    const rootName = doc.documentElement.localName;
    const data = rootName === 'Invoice' || rootName === 'CreditNote' ? parseUBL(doc) : parseCII(doc);
    const checks = buildComplianceChecklist(data);

    const okCount = checks.filter((c) => c.status === 'ok').length;
    const failCount = checks.filter((c) => c.status === 'fail').length;

    document.getElementById('fx-source-badge').textContent = sourceLabel;
    document.getElementById('fx-profile-val').textContent = data.profile.label;
    document.getElementById('fx-profile-sub').textContent = data.syntax;
    document.getElementById('fx-ttc-val').textContent = CB.formatEUR(data.totals.ttc);
    document.getElementById('fx-ttc-sub').textContent = `HT ${CB.formatEUR(data.totals.ht)} · TVA ${CB.formatEUR(data.totals.tva)}`;

    const scoreBox = document.getElementById('fx-score-box');
    scoreBox.className = 'kpi-box ' + (failCount === 0 ? 'kpi-accent' : failCount >= 2 ? 'kpi-danger' : 'kpi-warn');
    document.getElementById('fx-score-val').textContent = `${okCount} / ${checks.length}`;
    document.getElementById('fx-score-sub').textContent = failCount === 0 ? 'Prête pour transmission PDP' : `${failCount} point(s) bloquant(s) détecté(s)`;

    // Métadonnées
    document.getElementById('fx-meta-tbody').innerHTML = `
      <tr><td><strong>Numéro de facture</strong></td><td class="mono">${CB.escapeHTML(data.invoiceNumber || '—')}</td><td><strong>Date d’émission</strong></td><td class="mono">${CB.escapeHTML(data.issueDate)}</td></tr>
      <tr><td><strong>Code document</strong></td><td class="mono">${CB.escapeHTML(data.typeCode)} (${data.typeCode === '381' ? 'Avoir' : 'Facture commerciale'})</td><td><strong>Échéance</strong></td><td class="mono">${CB.escapeHTML(data.dueDate)}</td></tr>
      <tr><td><strong>Vendeur</strong></td><td>${CB.escapeHTML(data.seller.name || '—')}<br><span class="mono" style="font-size:0.82rem;color:#68727E">SIREN/ID : ${CB.escapeHTML(data.seller.siren || 'Absent')} · TVA : ${CB.escapeHTML(data.seller.vat || '—')}</span></td><td><strong>Acheteur</strong></td><td>${CB.escapeHTML(data.buyer.name || '—')}<br><span class="mono" style="font-size:0.82rem;color:#68727E">SIREN/ID : ${CB.escapeHTML(data.buyer.siren || 'Absent')} · TVA : ${CB.escapeHTML(data.buyer.vat || '—')}</span></td></tr>
      <tr><td><strong>Adresse vendeur</strong></td><td>${CB.escapeHTML(data.seller.address || '—')}</td><td><strong>Adresse acheteur</strong></td><td>${CB.escapeHTML(data.buyer.address || '—')}</td></tr>
      <tr><td><strong>IBAN règlement</strong></td><td class="mono">${CB.escapeHTML(data.iban || 'Non précisé')}</td><td><strong>Devise</strong></td><td class="mono">${CB.escapeHTML(data.currency)}</td></tr>
    `;

    // Lignes
    const linesTbody = document.getElementById('fx-lines-tbody');
    if (data.lines.length === 0) {
      linesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#C81E1E;font-weight:600;">Aucune ligne de détail trouvée dans ce fichier XML.</td></tr>`;
    } else {
      linesTbody.innerHTML = data.lines.map((l) => `
        <tr>
          <td class="mono">${CB.escapeHTML(l.id)}</td>
          <td>${CB.escapeHTML(l.name)}</td>
          <td class="num">${CB.formatNumber(l.qty, 2)}</td>
          <td class="num">${CB.formatEUR(l.unitPrice)}</td>
          <td class="num">${CB.formatPct(l.vatRate, 1)}</td>
          <td class="num"><strong>${CB.formatEUR(l.lineTotal)}</strong></td>
        </tr>
      `).join('');
    }

    // Checklist 2026
    const checklistEl = document.getElementById('fx-checklist');
    checklistEl.innerHTML = checks.map((c) => {
      const badgeClass = c.status === 'ok' ? 'badge-ok' : c.status === 'warn' ? 'badge-warn' : 'badge-danger';
      return `
        <li class="check-item is-${c.status}">
          <div>
            <strong>${CB.escapeHTML(c.title)}</strong>
            <div style="font-size:0.88rem;color:#4E5660;margin-top:2px;">${CB.escapeHTML(c.detail)}</div>
          </div>
          <span class="check-status ${badgeClass}">${CB.escapeHTML(c.badge)}</span>
        </li>
      `;
    }).join('');

    // Notes extraites
    const notesBox = document.getElementById('fx-notes');
    notesBox.innerHTML = data.notes.length
      ? data.notes.map((n) => `<p style="font-size:0.9rem;margin-bottom:8px;">• ${CB.escapeHTML(n)}</p>`).join('')
      : '<p style="font-size:0.9rem;color:#68727E;">Aucune note réglementaire (<code>IncludedNote</code>) déclarée dans l’en-tête.</p>';

    // Vue XML formaté
    document.getElementById('fx-xml-code').textContent = lastRawXML;
  }

  async function handleFile(file) {
    if (!file) return;
    const errorBox = document.getElementById('fx-error');
    const resultsWrap = document.getElementById('fx-results');
    const ext = file.name.toLowerCase().split('.').pop();

    try {
      if (ext === 'xml') {
        const text = await file.text();
        renderResult(text, `XML · ${file.name}`);
        CB.toast('Fichier XML Factur-X analysé localement');
      } else if (ext === 'pdf') {
        const buf = await file.arrayBuffer();
        const extracted = await extractXMLFromPDF(buf);
        if (!extracted) {
          errorBox.style.display = 'block';
          errorBox.innerHTML = `<strong>Aucun flux XML Factur-X trouvé dans « ${CB.escapeHTML(file.name)} » :</strong> ce fichier semble être un PDF simple (image ou texte sans pièce jointe XML CII/UBL embarquée). Pour être conforme à la réforme 2026–2027, la facture doit embarquer un fichier <code>factur-x.xml</code> normé EN 16931.`;
          resultsWrap.style.display = 'none';
          return;
        }
        renderResult(extracted, `PDF Factur-X · ${file.name}`);
        CB.toast('Flux XML extrait du PDF avec succès');
      } else {
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<strong>Format non pris en charge :</strong> déposez un fichier <code>.pdf</code> Factur-X ou un fichier <code>.xml</code> (CII / UBL).`;
        resultsWrap.style.display = 'none';
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorBox.innerHTML = `<strong>Erreur de lecture locale :</strong> ${CB.escapeHTML(err.message)}`;
      resultsWrap.style.display = 'none';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('fx-dropzone');
    const fileInput = document.getElementById('fx-file-input');
    const sampleOkBtn = document.getElementById('fx-load-sample');
    const sampleErrBtn = document.getElementById('fx-load-incomplete');
    const copyXmlBtn = document.getElementById('fx-copy-xml');
    const downloadXmlBtn = document.getElementById('fx-download-xml');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    sampleOkBtn.addEventListener('click', () => {
      renderResult(SAMPLE_COMPLIANT_XML, 'Exemple · Factur-X EN 16931');
      CB.toast('Facture Factur-X exemple chargée');
    });

    sampleErrBtn.addEventListener('click', () => {
      renderResult(SAMPLE_INCOMPLETE_XML, 'Exemple · Profil MINIMUM incomplet');
      CB.toast('Facture incomplète chargée pour test');
    });

    // Tabs
    document.querySelectorAll('[data-fx-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-fx-tab');
        document.querySelectorAll('[data-fx-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));
        document.querySelectorAll('[data-fx-panel]').forEach((p) => {
          p.classList.toggle('is-active', p.getAttribute('data-fx-panel') === target);
        });
      });
    });

    if (copyXmlBtn) {
      copyXmlBtn.addEventListener('click', () => {
        if (lastRawXML) CB.copyText(lastRawXML, 'XML Factur-X copié');
      });
    }

    if (downloadXmlBtn) {
      downloadXmlBtn.addEventListener('click', () => {
        if (!lastRawXML) return;
        const blob = new Blob([lastRawXML], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'factur-x-extrait.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        CB.toast('XML téléchargé');
      });
    }

    // Charger directement l'exemple conforme à l'ouverture pour démonstration immédiate
    renderResult(SAMPLE_COMPLIANT_XML, 'Exemple · Factur-X EN 16931');
  });
})();
