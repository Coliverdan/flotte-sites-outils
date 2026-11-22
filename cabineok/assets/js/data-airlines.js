/* ==========================================================================
   CABINEOK — Base de données vérifiée (42 Compagnies Aériennes + 16 Bagages)
   Dernière révision éditoriale : 2026
   ========================================================================== */
(function (global) {
  'use strict';

  const AIRLINES = [
    {
      id: 'air-france',
      iata: 'AF',
      name: 'Air France',
      country: 'France',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Accessoire personnel inclus' },
      cabin: { h: 55, w: 35, d: 25, weight: 12, freeIncluded: true, label: '12 kg cumulés (cabine + accessoire)' },
      gateFeeEur: 65,
      note: 'Poids cumulé de 12 kg en classe Economy (18 kg en Premium/Business). Soute obligatoire si hors-gabarit.'
    },
    {
      id: 'transavia',
      iata: 'TO',
      name: 'Transavia',
      country: 'France / Pays-Bas',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 20, weight: 10, label: 'Petit bagage gratuit garanti sous le siège' },
      cabin: { h: 55, w: 35, d: 25, weight: 10, freeIncluded: false, label: 'Payant (tarif Basic) — 10 kg cumulés' },
      gateFeeEur: 65,
      note: 'Depuis 2024, le bagage cabine 55×35×25 cm est payant sur le tarif Basic ; seul le sac 40×30×20 cm est inclus.'
    },
    {
      id: 'ryanair',
      iata: 'FR',
      name: 'Ryanair',
      country: 'Irlande',
      type: 'lowcost',
      underSeat: { h: 40, w: 25, d: 20, weight: null, label: 'Petit sac gratuit sous le siège' },
      cabin: { h: 55, w: 40, d: 20, weight: 10, freeIncluded: false, label: 'Option Priorité & 2 Bagages Cabine' },
      gateFeeEur: 70,
      note: 'Contrôle strict en porte d’embarquement. Roues et poignées comprises dans le gabarit métal.'
    },
    {
      id: 'easyjet',
      iata: 'U2',
      name: 'easyJet',
      country: 'Royaume-Uni / UE',
      type: 'lowcost',
      underSeat: { h: 45, w: 36, d: 20, weight: 15, label: 'Petit bagage cabine gratuit (généreux)' },
      cabin: { h: 56, w: 45, d: 25, weight: 15, freeIncluded: false, label: 'Option Grand Bagage Cabine / Speedy Boarding' },
      gateFeeEur: 58,
      note: 'L’un des formats sous-siège gratuits les plus généreux d’Europe (45×36×20 cm). Poids max 15 kg.'
    },
    {
      id: 'vueling',
      iata: 'VY',
      name: 'Vueling',
      country: 'Espagne',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 20, weight: null, label: 'Sac sous le siège gratuit' },
      cabin: { h: 55, w: 40, d: 20, weight: 10, freeIncluded: false, label: 'Payant sur tarif Basic (inclus TimeFlex)' },
      gateFeeEur: 75,
      note: 'Amende porte parmi les plus élevées (jusqu’à 75 €). Prévoyez l’option en ligne avant le départ.'
    },
    {
      id: 'volotea',
      iata: 'V7',
      name: 'Volotea',
      country: 'Espagne',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 20, weight: null, label: 'Petit sac gratuit sous le siège' },
      cabin: { h: 55, w: 40, d: 20, weight: 10, freeIncluded: false, label: 'Option Embarquement Prioritaire / Megavolotea' },
      gateFeeEur: 65,
      note: 'Sans option Prioritaire, seule la sacoche 40×30×20 cm est acceptée en cabine.'
    },
    {
      id: 'wizz-air',
      iata: 'W6',
      name: 'Wizz Air',
      country: 'Hongrie',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 20, weight: 10, label: 'Sac gratuit sous le siège (10 kg)' },
      cabin: { h: 55, w: 40, d: 23, weight: 10, freeIncluded: false, label: 'Option WIZZ Priority obligatoire' },
      gateFeeEur: 65,
      note: 'Profondeur 23 cm autorisée pour le trolley avec WIZZ Priority. Contrôle gabarit très fréquent.'
    },
    {
      id: 'lufthansa',
      iata: 'LH',
      name: 'Lufthansa',
      country: 'Allemagne',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 10, weight: null, label: 'Objet personnel plat (40×30×10 cm)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus Economy Light (8 kg max)' },
      gateFeeEur: 60,
      note: 'Attention au poids strict de 8 kg en cabine et à l’épaisseur de 10 cm pour le petit sac.'
    },
    {
      id: 'swiss',
      iata: 'LX',
      name: 'SWISS',
      country: 'Suisse',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 10, weight: null, label: 'Accessoire personnel (40×30×10 cm)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus tous tarifs (8 kg max)' },
      gateFeeEur: 65,
      note: 'Règles alignées sur le groupe Lufthansa : 8 kg stricts sur les vols européens.'
    },
    {
      id: 'british-airways',
      iata: 'BA',
      name: 'British Airways',
      country: 'Royaume-Uni',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: 23, label: 'Sac à main / sacoche garanti en cabine' },
      cabin: { h: 56, w: 45, d: 25, weight: 23, freeIncluded: true, label: 'Inclus (23 kg — doit être soulevable seul)' },
      gateFeeEur: 75,
      note: 'L’une des politiques cabine les plus généreuses au monde : 56×45×25 cm et jusqu’à 23 kg.'
    },
    {
      id: 'iberia',
      iata: 'IB',
      name: 'Iberia',
      country: 'Espagne',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Accessoire personnel inclus' },
      cabin: { h: 56, w: 40, d: 25, weight: 10, freeIncluded: true, label: 'Inclus Economy (10 kg max)' },
      gateFeeEur: 60,
      note: 'Profondeur 25 cm et hauteur 56 cm très confortables pour les valises cabines rigides.'
    },
    {
      id: 'tap-portugal',
      iata: 'TP',
      name: 'TAP Air Portugal',
      country: 'Portugal',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: 2, label: 'Article personnel (2 kg max)' },
      cabin: { h: 55, w: 40, d: 25, weight: 10, freeIncluded: true, label: 'Inclus Discount/Basic (10 kg max)' },
      gateFeeEur: 70,
      note: 'Contrôle du poids fréquent au départ de Lisbonne et Porto (10 kg pour la valise, 2 kg pour l’accessoire).'
    },
    {
      id: 'klm',
      iata: 'KL',
      name: 'KLM Royal Dutch Airlines',
      country: 'Pays-Bas',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Accessoire personnel inclus' },
      cabin: { h: 55, w: 35, d: 25, weight: 12, freeIncluded: true, label: 'Inclus (12 kg cumulés)' },
      gateFeeEur: 65,
      note: 'Mêmes dimensions qu’Air France : largeur 35 cm (attention aux valises 40 cm de large).'
    },
    {
      id: 'emirates',
      iata: 'EK',
      name: 'Emirates',
      country: 'Émirats Arabes Unis',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Non séparé en Economy (1 seul bagage)' },
      cabin: { h: 55, w: 38, d: 22, weight: 7, freeIncluded: true, label: '1 pièce unique en Economy (7 kg max)' },
      gateFeeEur: 85,
      note: 'En Economy, 1 seul bagage cabine de 7 kg (55×38×22 cm). Vérification stricte du poids à l’enregistrement.'
    },
    {
      id: 'qatar-airways',
      iata: 'QR',
      name: 'Qatar Airways',
      country: 'Qatar',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac à main / manteau toléré' },
      cabin: { h: 50, w: 37, d: 25, weight: 7, freeIncluded: true, label: 'Inclus Economy (50 cm hauteur, 7 kg)' },
      gateFeeEur: 80,
      note: 'Attention à la hauteur maximale officielle de 50 cm (plus courte que le standard 55 cm) et aux 7 kg.'
    },
    {
      id: 'turkish-airlines',
      iata: 'TK',
      name: 'Turkish Airlines',
      country: 'Turquie',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: 4, label: 'Article personnel (4 kg max)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus Economy (8 kg max)' },
      gateFeeEur: 60,
      note: 'Tolérance correcte sur le gabarit mais pesée fréquente à Istanbul (8 kg cabine + 4 kg personnel).'
    },
    {
      id: 'corsair',
      iata: 'SS',
      name: 'Corsair',
      country: 'France',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: '1 accessoire personnel inclus' },
      cabin: { h: 55, w: 40, d: 20, weight: 12, freeIncluded: true, label: 'Inclus tous tarifs (12 kg max)' },
      gateFeeEur: 70,
      note: 'Poids confortable de 12 kg en Economy vers les Antilles, la Réunion, l’Afrique et le Canada.'
    },
    {
      id: 'french-bee',
      iata: 'BF',
      name: 'French bee',
      country: 'France',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac personnel inclus' },
      cabin: { h: 55, w: 40, d: 20, weight: 12, freeIncluded: true, label: 'Inclus même sur tarif Bee Light (12 kg)' },
      gateFeeEur: 75,
      note: 'Contrairement aux low-cost court-courriers, la valise cabine 12 kg est incluse dès le tarif Bee Light.'
    },
    {
      id: 'air-transat',
      iata: 'TS',
      name: 'Air Transat',
      country: 'Canada',
      type: 'longhaul',
      underSeat: { h: 43, w: 31, d: 13, weight: null, label: 'Article personnel (43×31×13 cm)' },
      cabin: { h: 51, w: 40, d: 23, weight: null, label: 'Payant sur Eco Budget (inclus Eco Standard)' },
      gateFeeEur: 65,
      note: 'Hauteur limitée à 51 cm (20 pouces). Depuis 2025, le tarif Eco Budget n’inclut plus le bagage cabine.'
    },
    {
      id: 'air-canada',
      iata: 'AC',
      name: 'Air Canada',
      country: 'Canada',
      type: 'longhaul',
      underSeat: { h: 43, w: 33, d: 16, weight: null, label: 'Article personnel inclus' },
      cabin: { h: 55, w: 40, d: 23, weight: null, label: 'Inclus transatlantique (payant Basic Amérique du Nord)' },
      gateFeeEur: 70,
      note: 'Pas de limite de poids fixe officielle, mais le bagage doit être rangé sans aide dans le coffre.'
    },
    {
      id: 'delta',
      iata: 'DL',
      name: 'Delta Air Lines',
      country: 'États-Unis',
      type: 'longhaul',
      underSeat: { h: 45, w: 35, d: 20, weight: null, label: 'Sac sous le siège inclus' },
      cabin: { h: 56, w: 35, d: 23, weight: null, label: 'Inclus même en Basic Economy' },
      gateFeeEur: 65,
      note: 'Gabarit américain standard (22×14×9 pouces = 56×35×23 cm). Pas de limite de poids sur la majorité des lignes.'
    },
    {
      id: 'united',
      iata: 'UA',
      name: 'United Airlines',
      country: 'États-Unis',
      type: 'longhaul',
      underSeat: { h: 43, w: 25, d: 22, weight: null, label: 'Article personnel (43×25×22 cm)' },
      cabin: { h: 56, w: 35, d: 23, weight: null, label: 'Inclus transatlantique (exclu Basic vols US)' },
      gateFeeEur: 65,
      note: 'Inclus sur les vols transatlantiques ; attention sur les correspondances intérieures US en Basic Economy.'
    },
    {
      id: 'american-airlines',
      iata: 'AA',
      name: 'American Airlines',
      country: 'États-Unis',
      type: 'longhaul',
      underSeat: { h: 45, w: 35, d: 20, weight: null, label: 'Article personnel inclus' },
      cabin: { h: 56, w: 36, d: 23, weight: null, label: 'Inclus tous tarifs (y compris Basic)' },
      gateFeeEur: 65,
      note: 'Gabarit 56×36×23 cm roues comprises. Pas de pesée systématique au départ des États-Unis.'
    },
    {
      id: 'ana',
      iata: 'NH',
      name: 'ANA (All Nippon Airways)',
      country: 'Japon',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Objet personnel inclus' },
      cabin: { h: 55, w: 40, d: 25, weight: 10, freeIncluded: true, label: 'Inclus (10 kg cumulés, max 115 cm linéaires)' },
      gateFeeEur: 80,
      note: 'Somme H+L+P ≤ 115 cm (55×40×25 cm toléré). Poids total cabine 10 kg.'
    },
    {
      id: 'jal',
      iata: 'JL',
      name: 'Japan Airlines (JAL)',
      country: 'Japon',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Sac personnel inclus' },
      cabin: { h: 55, w: 40, d: 25, weight: 10, freeIncluded: true, label: 'Inclus (10 kg cumulés, max 115 cm)' },
      gateFeeEur: 80,
      note: 'Mêmes standards rigoureux et limpides qu’ANA : 55×40×25 cm (somme ≤ 115 cm) et 10 kg.'
    },
    {
      id: 'singapore-airlines',
      iata: 'SQ',
      name: 'Singapore Airlines',
      country: 'Singapour',
      type: 'longhaul',
      underSeat: { h: 40, w: 30, d: 10, weight: null, label: 'Sac à main / ordinateur (40×30×10 cm)' },
      cabin: { h: 55, w: 40, d: 20, weight: 7, freeIncluded: true, label: 'Inclus Economy (7 kg max, somme ≤ 115 cm)' },
      gateFeeEur: 85,
      note: 'Limite de poids de 7 kg strictement appliquée en Economy (2 pièces de 7 kg en Business).'
    },
    {
      id: 'norwegian',
      iata: 'DY',
      name: 'Norwegian',
      country: 'Norvège',
      type: 'lowcost',
      underSeat: { h: 38, w: 30, d: 20, weight: 10, label: 'Sac sous le siège (38 cm hauteur max)' },
      cabin: { h: 55, w: 40, d: 23, weight: 10, freeIncluded: false, label: 'Payant sur LowFare (inclus LowFare+)' },
      gateFeeEur: 65,
      note: 'Attention : le sac gratuit sous le siège mesure 38×30×20 cm (2 cm plus court que Ryanair/Transavia).'
    },
    {
      id: 'sas',
      iata: 'SK',
      name: 'SAS Scandinavian Airlines',
      country: 'Suède / Danemark / Norvège',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac sous le siège inclus' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: false, label: 'Payant sur Go Light (inclus Go Smart, 8 kg)' },
      gateFeeEur: 65,
      note: 'Le tarif SAS Go Light n’inclut que le sac sous le siège 40×30×15 cm.'
    },
    {
      id: 'aer-lingus',
      iata: 'EI',
      name: 'Aer Lingus',
      country: 'Irlande',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 20, weight: null, label: 'Petit sac personnel inclus' },
      cabin: { h: 55, w: 40, d: 24, weight: 10, freeIncluded: false, label: 'Payant en cabine sur Saver Europe (dépôt soute gratuit possible)' },
      gateFeeEur: 55,
      note: 'Sur vols européens Saver, la valise 10 kg est payante en cabine mais souvent enregistrable gratuitement en soute.'
    },
    {
      id: 'brussels-airlines',
      iata: 'SN',
      name: 'Brussels Airlines',
      country: 'Belgique',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 10, weight: null, label: 'Accessoire personnel (40×30×10 cm)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus Economy Light (8 kg max)' },
      gateFeeEur: 60,
      note: 'Standards groupe Lufthansa : 55×40×23 cm, 8 kg max en cabine.'
    },
    {
      id: 'ita-airways',
      iata: 'AZ',
      name: 'ITA Airways',
      country: 'Italie',
      type: 'legacy',
      underSeat: { h: 45, w: 36, d: 20, weight: null, label: 'Accessoire personnel généreux' },
      cabin: { h: 55, w: 35, d: 25, weight: 8, freeIncluded: true, label: 'Inclus tous tarifs (8 kg max)' },
      gateFeeEur: 60,
      note: 'Largeur valise limitée à 35 cm (comme Air France/KLM) et poids limité à 8 kg.'
    },
    {
      id: 'royal-air-maroc',
      iata: 'AT',
      name: 'Royal Air Maroc',
      country: 'Maroc',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Accessoire personnel inclus' },
      cabin: { h: 55, w: 40, d: 20, weight: 10, freeIncluded: true, label: 'Inclus (10 kg max, somme ≤ 115 cm)' },
      gateFeeEur: 60,
      note: 'Somme H+L+P maximale de 115 cm, poids maximal de 10 kg.'
    },
    {
      id: 'air-algerie',
      iata: 'AH',
      name: 'Air Algérie',
      country: 'Algérie',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac à main toléré' },
      cabin: { h: 55, w: 35, d: 25, weight: 10, freeIncluded: true, label: 'Inclus (10 kg max sur Boeing/Airbus)' },
      gateFeeEur: 55,
      note: 'Sur vols régionaux ATR, les dimensions sont réduites à 40×30×20 cm et 5 kg.'
    },
    {
      id: 'tunisair',
      iata: 'TU',
      name: 'Tunisair',
      country: 'Tunisie',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Accessoire personnel inclus' },
      cabin: { h: 55, w: 40, d: 20, weight: 8, freeIncluded: true, label: 'Inclus Economy (8 kg, somme ≤ 115 cm)' },
      gateFeeEur: 55,
      note: '8 kg en Economy (10 kg en classe Privilège). Somme des 3 côtés ≤ 115 cm.'
    },
    {
      id: 'aegean',
      iata: 'A3',
      name: 'Aegean Airlines',
      country: 'Grèce',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Sac personnel (alternatif sur Light)' },
      cabin: { h: 56, w: 45, d: 25, weight: 8, freeIncluded: true, label: '1 pièce cabine 8 kg OU 1 sac personnel en Light' },
      gateFeeEur: 60,
      note: 'Sur tarif Light, vous avez droit à 1 seule pièce (soit la valise 56×45×25 cm de 8 kg, soit le sac personnel).'
    },
    {
      id: 'finnair',
      iata: 'AY',
      name: 'Finnair',
      country: 'Finlande',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac gratuit Superlight' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: false, label: 'Exclu Superlight (inclus Light/Classic, 8 kg cumulés)' },
      gateFeeEur: 65,
      note: 'Le tarif Superlight n’inclut que le sac sous le siège 40×30×15 cm.'
    },
    {
      id: 'lot-polish',
      iata: 'LO',
      name: 'LOT Polish Airlines',
      country: 'Pologne',
      type: 'legacy',
      underSeat: { h: 40, w: 35, d: 12, weight: 2, label: 'Article personnel (40×35×12 cm, 2 kg)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus Economy (8 kg max)' },
      gateFeeEur: 60,
      note: '8 kg stricts sur les vols intra-européens, plus un article personnel de 2 kg.'
    },
    {
      id: 'austrian',
      iata: 'OS',
      name: 'Austrian Airlines',
      country: 'Autriche',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 10, weight: null, label: 'Accessoire personnel (40×30×10 cm)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: true, label: 'Inclus Economy Light (8 kg max)' },
      gateFeeEur: 60,
      note: 'Politique harmonisée Lufthansa Group : 55×40×23 cm et 8 kg.'
    },
    {
      id: 'eurowings',
      iata: 'EW',
      name: 'Eurowings',
      country: 'Allemagne',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 25, weight: null, label: 'Petit sac gratuit (profondeur 25 cm)' },
      cabin: { h: 55, w: 40, d: 23, weight: 8, freeIncluded: false, label: 'Payant sur BASIC (inclus SMART, 8 kg)' },
      gateFeeEur: 60,
      note: 'Le sac gratuit sous le siège accepte 25 cm de profondeur (40×30×25 cm), idéal pour les sacs souples.'
    },
    {
      id: 'jet2',
      iata: 'LS',
      name: 'Jet2.com',
      country: 'Royaume-Uni',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Petit sac personnel inclus' },
      cabin: { h: 56, w: 45, d: 25, weight: 10, freeIncluded: true, label: 'Valise 10 kg incluse gratuitement !' },
      gateFeeEur: 55,
      note: 'Exception notable chez les low-cost : la valise cabine 56×45×25 cm (10 kg) est incluse sur tous les billets.'
    },
    {
      id: 'air-europa',
      iata: 'UX',
      name: 'Air Europa',
      country: 'Espagne',
      type: 'legacy',
      underSeat: { h: 40, w: 30, d: 15, weight: null, label: 'Article personnel inclus' },
      cabin: { h: 55, w: 35, d: 25, weight: 10, freeIncluded: true, label: 'Inclus Economy (10 kg max)' },
      gateFeeEur: 60,
      note: 'Format largeur 35 cm (identique Air France / KLM) pour un poids de 10 kg.'
    },
    {
      id: 'condor',
      iata: 'DE',
      name: 'Condor',
      country: 'Allemagne',
      type: 'lowcost',
      underSeat: { h: 40, w: 30, d: 10, weight: 8, label: 'Petit sac gratuit sur Economy Zero' },
      cabin: { h: 55, w: 40, d: 20, weight: 8, freeIncluded: false, label: 'Exclu Economy Zero (inclus Classic, 8 kg cumulés)' },
      gateFeeEur: 70,
      note: 'Sur le tarif Economy Zero, seul un petit sac plat 40×30×10 cm est inclus.'
    }
  ];

  const FAMOUS_BAGS = [
    { id: 'eastpak-padded', brand: 'Eastpak', model: "Padded Pak'r (24 L)", category: 'Sac à dos', h: 40, w: 30, d: 18, emptyWeight: 0.4, volume: 24 },
    { id: 'quechua-nh500-23', brand: 'Decathlon Quechua', model: 'NH Escape 500 23 L', category: 'Sac à dos', h: 46, w: 28, d: 22, emptyWeight: 0.9, volume: 23 },
    { id: 'quechua-nh500-32', brand: 'Decathlon Quechua', model: 'NH Escape 500 32 L', category: 'Sac à dos', h: 50, w: 28, d: 25, emptyWeight: 1.1, volume: 32 },
    { id: 'forclaz-40', brand: 'Decathlon Forclaz', model: 'Travel 500 Organizer 40 L', category: 'Sac à dos cabine', h: 55, w: 32, d: 27, emptyWeight: 1.3, volume: 40 },
    { id: 'cabinzero-28', brand: 'CabinZero', model: 'Classic 28 L (Ultra Low-Cost)', category: 'Sac sous-siège', h: 39, w: 29.5, d: 20, emptyWeight: 0.6, volume: 28 },
    { id: 'cabinzero-36', brand: 'CabinZero', model: 'Classic 36 L', category: 'Sac à dos cabine', h: 45, w: 31, d: 20, emptyWeight: 0.7, volume: 36 },
    { id: 'cabinzero-44', brand: 'CabinZero', model: 'Classic 44 L', category: 'Sac à dos cabine', h: 51, w: 37, d: 20, emptyWeight: 0.76, volume: 44 },
    { id: 'cabaia-m', brand: 'Cabaïa', model: 'Adventurer Medium (23 L)', category: 'Sac à dos', h: 41, w: 27, d: 16, emptyWeight: 0.85, volume: 23 },
    { id: 'cabaia-l', brand: 'Cabaïa', model: 'Adventurer Large (25 L)', category: 'Sac à dos', h: 48, w: 29, d: 17, emptyWeight: 0.95, volume: 25 },
    { id: 'fjallraven-kanken', brand: 'Fjällräven', model: 'Kånken Classic (16 L)', category: 'Sac sous-siège', h: 38, w: 27, d: 13, emptyWeight: 0.3, volume: 16 },
    { id: 'samsonite-scure-55', brand: 'Samsonite', model: "S'Cure Spinner 55 cm", category: 'Valise rigide', h: 55, w: 40, d: 20, emptyWeight: 2.9, volume: 34 },
    { id: 'samsonite-c-lite-55', brand: 'Samsonite', model: 'C-Lite Spinner 55 cm', category: 'Valise rigide', h: 55, w: 40, d: 20, emptyWeight: 1.9, volume: 36 },
    { id: 'delsey-chatelet-55', brand: 'Delsey Paris', model: 'Chatelet Air 2.0 55 cm', category: 'Valise rigide', h: 55, w: 35, d: 25, emptyWeight: 2.9, volume: 38 },
    { id: 'rimowa-essential', brand: 'Rimowa', model: 'Essential Cabin 55 cm', category: 'Valise rigide', h: 55, w: 39, d: 23, emptyWeight: 3.2, volume: 36 },
    { id: 'american-tourister-55', brand: 'American Tourister', model: 'Soundbox Spinner 55 cm', category: 'Valise rigide', h: 55, w: 40, d: 20, emptyWeight: 2.6, volume: 35.5 },
    { id: 'patagonia-mlc-30', brand: 'Patagonia', model: 'Black Hole Mini MLC 30 L', category: 'Sac à dos cabine', h: 51, w: 30, d: 18, emptyWeight: 1.29, volume: 30 }
  ];

  /**
   * Évalue la conformité d'un bagage face à un gabarit (avec rotation 3D optimale automatique).
   */
  function evaluateBagFit(bagDims, bagWeight, rule) {
    const bSorted = [Number(bagDims.h), Number(bagDims.w), Number(bagDims.d)].sort((a, b) => b - a);
    const rSorted = [Number(rule.h), Number(rule.w), Number(rule.d)].sort((a, b) => b - a);

    const deltas = [
      Number((bSorted[0] - rSorted[0]).toFixed(1)),
      Number((bSorted[1] - rSorted[1]).toFixed(1)),
      Number((bSorted[2] - rSorted[2]).toFixed(1))
    ];

    const dimsOk = deltas[0] <= 0 && deltas[1] <= 0 && deltas[2] <= 0;
    const maxExcess = Math.max(0, deltas[0], deltas[1], deltas[2]);
    const weightLimit = rule.weight;
    const weightOk = weightLimit === null || Number(bagWeight) <= weightLimit;
    const weightExcess = weightLimit === null ? 0 : Math.max(0, Number((Number(bagWeight) - weightLimit).toFixed(1)));

    const rotated = !(
      Number(bagDims.h) <= Number(rule.h) &&
      Number(bagDims.w) <= Number(rule.w) &&
      Number(bagDims.d) <= Number(rule.d)
    ) && dimsOk;

    let status = 'ok';
    let reason = 'Conforme';
    if (!dimsOk && !weightOk) {
      status = 'fail';
      reason = 'Dimensions (+' + maxExcess + ' cm) et poids (+' + weightExcess + ' kg) dépassés';
    } else if (!dimsOk) {
      status = 'fail';
      reason = 'Hors-gabarit (+' + maxExcess + ' cm)';
    } else if (!weightOk) {
      status = 'warn';
      reason = 'Gabarit OK mais trop lourd (+' + weightExcess + ' kg)';
    } else if (rotated) {
      reason = 'Conforme (rotation du sac)';
    }

    return {
      status,
      dimsOk,
      weightOk,
      rotated,
      deltas,
      maxExcess,
      weightExcess,
      bSorted,
      rSorted,
      reason
    };
  }

  global.CABINEOK_DATA = {
    AIRLINES,
    FAMOUS_BAGS,
    evaluateBagFit
  };
})(window);
