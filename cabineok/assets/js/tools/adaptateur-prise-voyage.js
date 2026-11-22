/* ==========================================================================
   OUTIL 4 — Vérificateur Prises Électriques & Voltage (76 Pays + SVG A à N)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-plug-checker');
    if (!root) return;

    const PLUG_INFO = {
      A: { name: 'Type A', desc: '2 fiches plates parallèles (non mises à la terre)' },
      B: { name: 'Type B', desc: '2 fiches plates + 1 broche ronde de terre' },
      C: { name: 'Type C (Europlug)', desc: '2 broches rondes 4 mm (standard européen sans terre)' },
      D: { name: 'Type D', desc: '3 grosses broches rondes en triangle (Inde)' },
      E: { name: 'Type E (France)', desc: '2 broches rondes + trou pour broche de terre mâle' },
      F: { name: 'Type F (Schuko)', desc: '2 broches rondes + 2 clips latéraux de terre' },
      G: { name: 'Type G (UK)', desc: '3 broches rectangulaires en triangle (avec fusible)' },
      H: { name: 'Type H', desc: '3 broches rondes ou plates en V (Israël)' },
      I: { name: 'Type I', desc: '2 fiches plates inclinées en V + broche terre' },
      J: { name: 'Type J (Suisse)', desc: '3 broches rondes (broche terre centrale décalée)' },
      K: { name: 'Type K (Danemark)', desc: '2 broches rondes + 1 broche terre demi-ronde' },
      L: { name: 'Type L (Italie)', desc: '3 broches rondes alignées en ligne droite' },
      M: { name: 'Type M', desc: '3 très grosses broches rondes en triangle (Afrique du Sud)' },
      N: { name: 'Type N (Brésil)', desc: '3 broches rondes (terre centrale légèrement décalée)' }
    };

    const COUNTRIES = [
      { code: 'FR', name: 'France', region: 'Europe', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'BE', name: 'Belgique', region: 'Europe', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'CH', name: 'Suisse', region: 'Europe', plugs: ['C', 'J'], voltage: 230, freq: 50, note: 'Les chargeurs plats Type C (2 broches) entrent, mais les fiches rondes épaisses Type E/F nécessitent un adaptateur Type J.' },
      { code: 'DE', name: 'Allemagne', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'ES', name: 'Espagne', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'IT', name: 'Italie', region: 'Europe', plugs: ['C', 'F', 'L'], voltage: 230, freq: 50, note: 'Prises Type L très répandues dans les bâtiments anciens : un adaptateur est utile pour les fiches avec terre Type E/F.' },
      { code: 'PT', name: 'Portugal', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'GB', name: 'Royaume-Uni', region: 'Europe', plugs: ['G'], voltage: 230, freq: 50, note: 'Prises Type G à 3 broches rectangulaires obligatoires (y compris pour les chargeurs européens plats).' },
      { code: 'IE', name: 'Irlande', region: 'Europe', plugs: ['G'], voltage: 230, freq: 50 },
      { code: 'NL', name: 'Pays-Bas', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'LU', name: 'Luxembourg', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'AT', name: 'Autriche', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'GR', name: 'Grèce', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'HR', name: 'Croatie', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'PL', name: 'Pologne', region: 'Europe', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'CZ', name: 'République tchèque', region: 'Europe', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'HU', name: 'Hongrie', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'RO', name: 'Roumanie', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'SE', name: 'Suède', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'NO', name: 'Norvège', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'FI', name: 'Finlande', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'DK', name: 'Danemark', region: 'Europe', plugs: ['C', 'E', 'F', 'K'], voltage: 230, freq: 50 },
      { code: 'IS', name: 'Islande', region: 'Europe', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'MT', name: 'Malte', region: 'Europe', plugs: ['G'], voltage: 230, freq: 50 },
      { code: 'CY', name: 'Chypre', region: 'Europe', plugs: ['G'], voltage: 230, freq: 50 },
      { code: 'TR', name: 'Turquie', region: 'Europe / Asie', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'US', name: 'États-Unis', region: 'Amérique du Nord', plugs: ['A', 'B'], voltage: 120, freq: 60, note: 'Tension 120 V / 60 Hz : chargeurs USB/PC (100-240 V) compatibles avec adaptateur, mais appareils chauffants 230 V inopérants sans convertisseur.' },
      { code: 'CA', name: 'Canada', region: 'Amérique du Nord', plugs: ['A', 'B'], voltage: 120, freq: 60 },
      { code: 'MX', name: 'Mexique', region: 'Amérique du Nord', plugs: ['A', 'B'], voltage: 127, freq: 60 },
      { code: 'CR', name: 'Costa Rica', region: 'Amérique centrale', plugs: ['A', 'B'], voltage: 120, freq: 60 },
      { code: 'DO', name: 'République dominicaine', region: 'Caraïbes', plugs: ['A', 'B'], voltage: 120, freq: 60 },
      { code: 'CU', name: 'Cuba', region: 'Caraïbes', plugs: ['A', 'B', 'C', 'L'], voltage: 110, freq: 60, note: '110 V majoritaire (parfois 220 V dans les hôtels récents). Vérifiez toujours avant de brancher.' },
      { code: 'BR', name: 'Brésil', region: 'Amérique du Sud', plugs: ['C', 'N'], voltage: 127, freq: 60, note: 'Tension variable selon les États (127 V à Rio/São Paulo, 220 V à Brasília/Recife).' },
      { code: 'AR', name: 'Argentine', region: 'Amérique du Sud', plugs: ['C', 'I'], voltage: 220, freq: 50 },
      { code: 'CL', name: 'Chili', region: 'Amérique du Sud', plugs: ['C', 'L'], voltage: 220, freq: 50 },
      { code: 'PE', name: 'Pérou', region: 'Amérique du Sud', plugs: ['A', 'B', 'C'], voltage: 220, freq: 60 },
      { code: 'CO', name: 'Colombie', region: 'Amérique du Sud', plugs: ['A', 'B'], voltage: 110, freq: 60 },
      { code: 'JP', name: 'Japon', region: 'Asie', plugs: ['A', 'B'], voltage: 100, freq: 50, note: 'Tension la plus basse au monde (100 V ; 50 Hz à Tokyo/Est, 60 Hz à Osaka/Ouest). Prises Type A sans terre majoritaires.' },
      { code: 'KR', name: 'Corée du Sud', region: 'Asie', plugs: ['C', 'F'], voltage: 220, freq: 60 },
      { code: 'CN', name: 'Chine', region: 'Asie', plugs: ['A', 'C', 'I'], voltage: 220, freq: 50 },
      { code: 'HK', name: 'Hong Kong', region: 'Asie', plugs: ['G'], voltage: 220, freq: 50 },
      { code: 'TW', name: 'Taïwan', region: 'Asie', plugs: ['A', 'B'], voltage: 110, freq: 60 },
      { code: 'TH', name: 'Thaïlande', region: 'Asie', plugs: ['A', 'B', 'C', 'F'], voltage: 230, freq: 50, note: 'Prises hybrides très répandues acceptant les fiches européennes Type C et américaines Type A.' },
      { code: 'VN', name: 'Viêt Nam', region: 'Asie', plugs: ['A', 'C', 'F'], voltage: 220, freq: 50 },
      { code: 'ID', name: 'Indonésie (Bali)', region: 'Asie', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'MY', name: 'Malaisie', region: 'Asie', plugs: ['G'], voltage: 240, freq: 50 },
      { code: 'SG', name: 'Singapour', region: 'Asie', plugs: ['G'], voltage: 230, freq: 50 },
      { code: 'PH', name: 'Philippines', region: 'Asie', plugs: ['A', 'B', 'C'], voltage: 220, freq: 60 },
      { code: 'IN', name: 'Inde', region: 'Asie', plugs: ['C', 'D', 'M'], voltage: 230, freq: 50 },
      { code: 'LK', name: 'Sri Lanka', region: 'Asie', plugs: ['D', 'G', 'M'], voltage: 230, freq: 50 },
      { code: 'KH', name: 'Cambodge', region: 'Asie', plugs: ['A', 'C', 'G'], voltage: 230, freq: 50 },
      { code: 'MV', name: 'Maldives', region: 'Asie', plugs: ['D', 'G', 'J', 'K', 'L'], voltage: 230, freq: 50, note: 'Type G majoritaire dans les resorts, prévoyez un adaptateur universel.' },
      { code: 'AE', name: 'Émirats Arabes Unis (Dubaï)', region: 'Moyen-Orient', plugs: ['G'], voltage: 230, freq: 50 },
      { code: 'QA', name: 'Qatar', region: 'Moyen-Orient', plugs: ['G'], voltage: 240, freq: 50 },
      { code: 'SA', name: 'Arabie saoudite', region: 'Moyen-Orient', plugs: ['G'], voltage: 230, freq: 60 },
      { code: 'IL', name: 'Israël', region: 'Moyen-Orient', plugs: ['C', 'H'], voltage: 230, freq: 50 },
      { code: 'JO', name: 'Jordanie', region: 'Moyen-Orient', plugs: ['C', 'D', 'F', 'G', 'J'], voltage: 230, freq: 50 },
      { code: 'OM', name: 'Oman', region: 'Moyen-Orient', plugs: ['G'], voltage: 240, freq: 50 },
      { code: 'MA', name: 'Maroc', region: 'Afrique', plugs: ['C', 'E'], voltage: 220, freq: 50 },
      { code: 'TN', name: 'Tunisie', region: 'Afrique', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'DZ', name: 'Algérie', region: 'Afrique', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'EG', name: 'Égypte', region: 'Afrique', plugs: ['C', 'F'], voltage: 220, freq: 50 },
      { code: 'SN', name: 'Sénégal', region: 'Afrique', plugs: ['C', 'D', 'E', 'K'], voltage: 230, freq: 50 },
      { code: 'CI', name: 'Côte d’Ivoire', region: 'Afrique', plugs: ['C', 'E'], voltage: 230, freq: 50 },
      { code: 'CM', name: 'Cameroun', region: 'Afrique', plugs: ['C', 'E'], voltage: 220, freq: 50 },
      { code: 'MU', name: 'Île Maurice', region: 'Afrique', plugs: ['C', 'G'], voltage: 230, freq: 50 },
      { code: 'SC', name: 'Seychelles', region: 'Afrique', plugs: ['G'], voltage: 240, freq: 50 },
      { code: 'MG', name: 'Madagascar', region: 'Afrique', plugs: ['C', 'E'], voltage: 220, freq: 50 },
      { code: 'ZA', name: 'Afrique du Sud', region: 'Afrique', plugs: ['C', 'D', 'M', 'N'], voltage: 230, freq: 50, note: 'Les prises Type M (très grosses broches) ne sont pas couvertes par tous les adaptateurs universels : achetez un adaptateur dédié Type M.' },
      { code: 'KE', name: 'Kenya', region: 'Afrique', plugs: ['G'], voltage: 240, freq: 50 },
      { code: 'TZ', name: 'Tanzanie (Zanzibar)', region: 'Afrique', plugs: ['D', 'G'], voltage: 230, freq: 50 },
      { code: 'CV', name: 'Cap-Vert', region: 'Afrique', plugs: ['C', 'F'], voltage: 230, freq: 50 },
      { code: 'AU', name: 'Australie', region: 'Océanie', plugs: ['I'], voltage: 230, freq: 50 },
      { code: 'NZ', name: 'Nouvelle-Zélande', region: 'Océanie', plugs: ['I'], voltage: 230, freq: 50 },
      { code: 'PF', name: 'Polynésie française', region: 'Océanie', plugs: ['A', 'B', 'C', 'E'], voltage: 220, freq: 60 },
      { code: 'GP', name: 'Guadeloupe / Martinique / Réunion', region: 'Outre-mer', plugs: ['C', 'E'], voltage: 230, freq: 50 }
    ];

    function renderPlugSVG(type) {
      let holes = '';
      switch (type) {
        case 'A':
          holes = '<rect x="28" y="34" width="6" height="24" rx="1" fill="#121316" /><rect x="66" y="34" width="6" height="24" rx="1" fill="#121316" />';
          break;
        case 'B':
          holes = '<rect x="28" y="28" width="6" height="22" rx="1" fill="#121316" /><rect x="66" y="28" width="6" height="22" rx="1" fill="#121316" /><path d="M44 66 A6 6 0 0 1 56 66 L56 74 L44 74 Z" fill="#0047AB" />';
          break;
        case 'C':
          holes = '<circle cx="32" cy="50" r="6" fill="#121316" /><circle cx="68" cy="50" r="6" fill="#121316" />';
          break;
        case 'D':
          holes = '<circle cx="50" cy="28" r="8" fill="#0047AB" /><circle cx="30" cy="66" r="6.5" fill="#121316" /><circle cx="70" cy="66" r="6.5" fill="#121316" />';
          break;
        case 'E':
          holes = '<circle cx="32" cy="54" r="6" fill="#121316" /><circle cx="68" cy="54" r="6" fill="#121316" /><circle cx="50" cy="30" r="5" fill="#0047AB" stroke="#FFFFFF" stroke-width="1.5" />';
          break;
        case 'F':
          holes = '<circle cx="32" cy="50" r="6" fill="#121316" /><circle cx="68" cy="50" r="6" fill="#121316" /><rect x="46" y="14" width="8" height="10" fill="#0047AB" /><rect x="46" y="76" width="8" height="10" fill="#0047AB" />';
          break;
        case 'G':
          holes = '<rect x="46" y="22" width="8" height="18" rx="1" fill="#0047AB" /><rect x="22" y="58" width="18" height="8" rx="1" fill="#121316" /><rect x="60" y="58" width="18" height="8" rx="1" fill="#121316" />';
          break;
        case 'H':
          holes = '<circle cx="30" cy="38" r="5.5" fill="#121316" /><circle cx="70" cy="38" r="5.5" fill="#121316" /><circle cx="50" cy="68" r="5.5" fill="#0047AB" />';
          break;
        case 'I':
          holes = '<rect x="28" y="28" width="6" height="22" rx="1" fill="#121316" transform="rotate(30 31 39)" /><rect x="66" y="28" width="6" height="22" rx="1" fill="#121316" transform="rotate(-30 69 39)" /><rect x="47" y="60" width="6" height="18" rx="1" fill="#0047AB" />';
          break;
        case 'J':
          holes = '<circle cx="30" cy="48" r="5.5" fill="#121316" /><circle cx="70" cy="48" r="5.5" fill="#121316" /><circle cx="50" cy="62" r="5.5" fill="#0047AB" />';
          break;
        case 'K':
          holes = '<circle cx="32" cy="44" r="6" fill="#121316" /><circle cx="68" cy="44" r="6" fill="#121316" /><path d="M44 64 L56 64 A6 6 0 0 1 44 64 Z" fill="#0047AB" /><circle cx="50" cy="68" r="5.5" fill="#0047AB" />';
          break;
        case 'L':
          holes = '<circle cx="24" cy="50" r="5.5" fill="#121316" /><circle cx="50" cy="50" r="5.5" fill="#0047AB" /><circle cx="76" cy="50" r="5.5" fill="#121316" />';
          break;
        case 'M':
          holes = '<circle cx="50" cy="26" r="9.5" fill="#0047AB" /><circle cx="28" cy="68" r="8" fill="#121316" /><circle cx="72" cy="68" r="8" fill="#121316" />';
          break;
        case 'N':
          holes = '<circle cx="30" cy="50" r="5.5" fill="#121316" /><circle cx="70" cy="50" r="5.5" fill="#121316" /><circle cx="50" cy="59" r="5.5" fill="#0047AB" />';
          break;
        default:
          holes = '<circle cx="34" cy="50" r="6" fill="#121316" /><circle cx="66" cy="50" r="6" fill="#121316" />';
      }
      return (
        '<svg viewBox="0 0 100 100" width="84" height="84" role="img" aria-label="Schéma prise ' + PLUG_INFO[type].name + '">' +
          '<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#121316" stroke-width="2.5" />' +
          '<circle cx="50" cy="50" r="36" fill="#F5F3EE" stroke="#D9D5CC" stroke-width="1" />' +
          holes +
        '</svg>'
      );
    }

    const originSel = document.getElementById('plug-origin');
    const destSel = document.getElementById('plug-dest');
    const swapBtn = document.getElementById('btn-swap-countries');
    const quickDestBtns = document.querySelectorAll('[data-quick-dest]');

    const verdictBox = document.getElementById('plug-verdict-box');
    const destVoltageEl = document.getElementById('plug-dest-voltage');
    const destFreqEl = document.getElementById('plug-dest-freq');
    const destTypesEl = document.getElementById('plug-dest-types');
    const destPlugsGrid = document.getElementById('plug-diagrams-grid');
    const destNoteBox = document.getElementById('plug-extra-note');
    const applianceBody = document.getElementById('plug-appliances-tbody');

    const sortedCountries = COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    sortedCountries.forEach((c) => {
      const opt1 = document.createElement('option');
      opt1.value = c.code;
      opt1.textContent = c.name + ' (' + c.voltage + ' V · Type ' + c.plugs.join('/') + ')';
      originSel.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = c.code;
      opt2.textContent = c.name + ' (' + c.voltage + ' V · Type ' + c.plugs.join('/') + ')';
      destSel.appendChild(opt2);
    });

    originSel.value = 'FR';
    destSel.value = 'JP';

    function checkCompatibility(orig, dest) {
      // Type E and F plugs (CEE 7/7 hybrid) are mutually compatible with C, E, F sockets
      const origEffective = new Set(orig.plugs);
      if (origEffective.has('E') || origEffective.has('F')) {
        origEffective.add('C');
        origEffective.add('E');
        origEffective.add('F');
      }

      const shared = dest.plugs.filter((p) => origEffective.has(p));
      const allCompatible = dest.plugs.every((p) => origEffective.has(p));
      const hasPartial = shared.length > 0 && !allCompatible;

      const voltageDiff = Math.abs(orig.voltage - dest.voltage);
      const voltageMismatch = voltageDiff >= 50; // e.g., 230V vs 120V or 100V

      return { shared, allCompatible, hasPartial, voltageMismatch, voltageDiff };
    }

    function render() {
      const orig = COUNTRIES.find((c) => c.code === originSel.value) || COUNTRIES[0];
      const dest = COUNTRIES.find((c) => c.code === destSel.value) || COUNTRIES[0];
      const cmp = checkCompatibility(orig, dest);

      destVoltageEl.textContent = dest.voltage + ' V';
      destFreqEl.textContent = dest.freq + ' Hz';
      destTypesEl.textContent = dest.plugs.join(' / ');

      let calloutClass = 'callout-ok';
      let headline = 'Compatible direct — Aucun adaptateur requis';
      let bodyText = 'Vos prises (' + orig.name + ' : Type ' + orig.plugs.join(', ') + ' · ' + orig.voltage + ' V) fonctionnent directement dans les prises de ' + dest.name + ' (' + dest.voltage + ' V).';

      if (cmp.voltageMismatch) {
        calloutClass = 'callout-fail';
        headline = cmp.allCompatible
          ? 'Attention : tension différente (' + dest.voltage + ' V) — Vérifiez vos appareils'
          : 'Adaptateur obligatoire + Attention au voltage (' + dest.voltage + ' V)';
        bodyText = 'En ' + dest.name + ', le réseau est en ' + dest.voltage + ' V / ' + dest.freq + ' Hz contre ' + orig.voltage + ' V en ' + orig.name + '. Vos chargeurs USB, smartphones et ordinateurs (inscrits « INPUT 100-240V ») fonctionnent avec un simple adaptateur Type ' + dest.plugs.join('/') + '. En revanche, un sèche-cheveux, lisseur ou fer à repasser 230 V nécessite un convertisseur de tension (ou un appareil bi-voltage).';
      } else if (!cmp.allCompatible && !cmp.hasPartial) {
        calloutClass = 'callout-warn';
        headline = 'Simple adaptateur requis (même tension ' + dest.voltage + ' V)';
        bodyText = 'Les fiches de ' + orig.name + ' ne rentrent pas dans les prises de ' + dest.name + ' (Type ' + dest.plugs.join(', ') + '). Un simple adaptateur passif suffit ; aucun convertisseur électrique n’est nécessaire car la tension est compatible.';
      } else if (cmp.hasPartial) {
        calloutClass = 'callout-warn';
        headline = 'Compatibilité partielle — Adaptateur conseillé pour les grosses fiches';
        bodyText = 'Vos chargeurs fins Type ' + cmp.shared.join('/') + ' passent généralement sans adaptateur en ' + dest.name + ', mais certaines prises locales (Type ' + dest.plugs.filter((p) => !cmp.shared.includes(p)).join(', ') + ') exigent un adaptateur pour les fiches avec terre (PC portable, multiprise).';
      }

      verdictBox.className = 'callout ' + calloutClass;
      verdictBox.innerHTML =
        '<div style="font-family:var(--font-display);font-weight:800;font-size:1.1875rem;color:var(--text-primary);margin-bottom:6px;">' + headline + '</div>' +
        '<p style="margin:0;color:var(--text-primary);">' + bodyText + '</p>';

      // Render Plug SVGs
      destPlugsGrid.innerHTML = dest.plugs.map((p) =>
        '<div class="plug-card">' +
          renderPlugSVG(p) +
          '<div class="plug-type-title">' + PLUG_INFO[p].name + '</div>' +
          '<div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.35;">' + PLUG_INFO[p].desc + '</div>' +
        '</div>'
      ).join('');

      if (dest.note) {
        destNoteBox.style.display = 'block';
        destNoteBox.innerHTML = '<strong>Spécificité terrain (' + dest.name + ') :</strong> ' + dest.note;
      } else {
        destNoteBox.style.display = 'none';
      }

      // Appliance table
      const needAdapter = !cmp.allCompatible;
      const adapterLabel = needAdapter ? ('Adaptateur Type ' + dest.plugs[0]) : 'Branchement direct';
      const rows = [
        {
          name: 'Smartphone, tablette, liseuse, appareil photo (USB / USB-C)',
          spec: 'Bi-voltage 100–240 V',
          status: needAdapter ? 'status-warn' : 'status-ok',
          verdict: needAdapter ? adapterLabel + ' uniquement' : 'Direct sans adaptateur'
        },
        {
          name: 'Ordinateur portable & console (Switch, Steam Deck)',
          spec: 'Bi-voltage 100–240 V',
          status: needAdapter ? 'status-warn' : 'status-ok',
          verdict: needAdapter ? adapterLabel + ' (avec terre si 3 broches)' : 'Direct sans adaptateur'
        },
        {
          name: 'Sèche-cheveux, lisseur, boucleur, bouilloire, fer (230 V seul)',
          spec: 'Mono-tension ' + orig.voltage + ' V',
          status: cmp.voltageMismatch ? 'status-fail' : (needAdapter ? 'status-warn' : 'status-ok'),
          verdict: cmp.voltageMismatch
            ? 'Convertisseur requis (ou laisser à la maison)'
            : (needAdapter ? adapterLabel + ' (vérifier puissance max)' : 'Direct sans adaptateur')
        },
        {
          name: 'Rasoir électrique / brosse à dents rechargeable',
          spec: 'Souvent 100–240 V (vérifier socle)',
          status: cmp.voltageMismatch ? 'status-warn' : (needAdapter ? 'status-warn' : 'status-ok'),
          verdict: cmp.voltageMismatch
            ? 'Vérifier mention 100–240 V + ' + adapterLabel
            : (needAdapter ? adapterLabel : 'Direct sans adaptateur')
        }
      ];

      applianceBody.innerHTML = rows.map((r) =>
        '<tr>' +
          '<td><strong>' + r.name + '</strong></td>' +
          '<td class="mono" style="font-size:0.8125rem;">' + r.spec + '</td>' +
          '<td><span class="status-badge ' + r.status + '">' + r.verdict + '</span></td>' +
        '</tr>'
      ).join('');
    }

    originSel.addEventListener('change', render);
    destSel.addEventListener('change', render);

    swapBtn.addEventListener('click', () => {
      const tmp = originSel.value;
      originSel.value = destSel.value;
      destSel.value = tmp;
      render();
    });

    quickDestBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        destSel.value = btn.getAttribute('data-quick-dest');
        render();
      });
    });

    render();
  });
})();
