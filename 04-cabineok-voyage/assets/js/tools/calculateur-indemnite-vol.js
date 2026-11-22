/* ==========================================================================
   OUTIL 5 — Simulateur Indemnité Vol CE 261/2004 + Haversine 56 Aéroports + Lettre
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('tool-ec261');
    if (!root) return;

    const AIRPORTS = [
      { iata: 'CDG', city: 'Paris Charles-de-Gaulle', country: 'France', eu: true, lat: 49.0097, lon: 2.5479 },
      { iata: 'ORY', city: 'Paris Orly', country: 'France', eu: true, lat: 48.7262, lon: 2.3652 },
      { iata: 'BVA', city: 'Paris Beauvais', country: 'France', eu: true, lat: 49.4544, lon: 2.1128 },
      { iata: 'LYS', city: 'Lyon Saint-Exupéry', country: 'France', eu: true, lat: 45.7256, lon: 5.0811 },
      { iata: 'MRS', city: 'Marseille Provence', country: 'France', eu: true, lat: 43.4393, lon: 5.2214 },
      { iata: 'NCE', city: 'Nice Côte d’Azur', country: 'France', eu: true, lat: 43.6584, lon: 7.2159 },
      { iata: 'TLS', city: 'Toulouse Blagnac', country: 'France', eu: true, lat: 43.6293, lon: 1.3638 },
      { iata: 'BOD', city: 'Bordeaux Mérignac', country: 'France', eu: true, lat: 44.8283, lon: -0.7156 },
      { iata: 'NTE', city: 'Nantes Atlantique', country: 'France', eu: true, lat: 47.1532, lon: -1.6107 },
      { iata: 'LIL', city: 'Lille Lesquin', country: 'France', eu: true, lat: 50.5619, lon: 3.0894 },
      { iata: 'BSL', city: 'Bâle-Mulhouse EuroAirport', country: 'France / Suisse', eu: true, lat: 47.5900, lon: 7.5299 },
      { iata: 'PTP', city: 'Pointe-à-Pitre (Guadeloupe)', country: 'France (UE)', eu: true, lat: 16.2653, lon: -61.5318 },
      { iata: 'FDF', city: 'Fort-de-France (Martinique)', country: 'France (UE)', eu: true, lat: 14.5910, lon: -61.0032 },
      { iata: 'RUN', city: 'Saint-Denis Roland-Garros (Réunion)', country: 'France (UE)', eu: true, lat: -20.8871, lon: 55.5103 },
      { iata: 'BRU', city: 'Bruxelles National', country: 'Belgique', eu: true, lat: 50.9014, lon: 4.4844 },
      { iata: 'CRL', city: 'Bruxelles Charleroi', country: 'Belgique', eu: true, lat: 50.4592, lon: 4.4538 },
      { iata: 'GVA', city: 'Genève Cointrin', country: 'Suisse', eu: true, lat: 46.2381, lon: 6.1089 },
      { iata: 'ZRH', city: 'Zurich Kloten', country: 'Suisse', eu: true, lat: 47.4647, lon: 8.5492 },
      { iata: 'LHR', city: 'Londres Heathrow', country: 'Royaume-Uni', eu: true, lat: 51.4700, lon: -0.4543 },
      { iata: 'LGW', city: 'Londres Gatwick', country: 'Royaume-Uni', eu: true, lat: 51.1537, lon: -0.1821 },
      { iata: 'DUB', city: 'Dublin', country: 'Irlande', eu: true, lat: 53.4213, lon: -6.2701 },
      { iata: 'AMS', city: 'Amsterdam Schiphol', country: 'Pays-Bas', eu: true, lat: 52.3105, lon: 4.7683 },
      { iata: 'FRA', city: 'Francfort', country: 'Allemagne', eu: true, lat: 50.0379, lon: 8.5622 },
      { iata: 'MUC', city: 'Munich', country: 'Allemagne', eu: true, lat: 48.3537, lon: 11.7750 },
      { iata: 'BER', city: 'Berlin Brandenburg', country: 'Allemagne', eu: true, lat: 52.3667, lon: 13.5033 },
      { iata: 'MAD', city: 'Madrid Barajas', country: 'Espagne', eu: true, lat: 40.4983, lon: -3.5676 },
      { iata: 'BCN', city: 'Barcelone El Prat', country: 'Espagne', eu: true, lat: 41.2974, lon: 2.0833 },
      { iata: 'PMI', city: 'Palma de Majorque', country: 'Espagne', eu: true, lat: 39.5517, lon: 2.7388 },
      { iata: 'TFS', city: 'Tenerife Sud (Canaries)', country: 'Espagne', eu: true, lat: 28.0445, lon: -16.5725 },
      { iata: 'LIS', city: 'Lisbonne Humberto Delgado', country: 'Portugal', eu: true, lat: 38.7742, lon: -9.1342 },
      { iata: 'OPO', city: 'Porto Francisco Sá Carneiro', country: 'Portugal', eu: true, lat: 41.2481, lon: -8.6814 },
      { iata: 'FCO', city: 'Rome Fiumicino', country: 'Italie', eu: true, lat: 41.8003, lon: 12.2389 },
      { iata: 'MXP', city: 'Milan Malpensa', country: 'Italie', eu: true, lat: 45.6306, lon: 8.7281 },
      { iata: 'VCE', city: 'Venise Marco Polo', country: 'Italie', eu: true, lat: 45.5053, lon: 12.3519 },
      { iata: 'ATH', city: 'Athènes Eleftherios-Venizelos', country: 'Grèce', eu: true, lat: 37.9364, lon: 23.9445 },
      { iata: 'HER', city: 'Héraklion (Crète)', country: 'Grèce', eu: true, lat: 35.3397, lon: 25.1803 },
      { iata: 'VIE', city: 'Vienne Schwechat', country: 'Autriche', eu: true, lat: 48.1103, lon: 16.5697 },
      { iata: 'PRG', city: 'Prague Václav Havel', country: 'République tchèque', eu: true, lat: 50.1008, lon: 14.2600 },
      { iata: 'WAW', city: 'Varsovie Chopin', country: 'Pologne', eu: true, lat: 52.1657, lon: 20.9671 },
      { iata: 'CPH', city: 'Copenhague Kastrup', country: 'Danemark', eu: true, lat: 55.6180, lon: 12.6508 },
      { iata: 'ARN', city: 'Stockholm Arlanda', country: 'Suède', eu: true, lat: 59.6519, lon: 17.9186 },
      { iata: 'OSL', city: 'Oslo Gardermoen', country: 'Norvège', eu: true, lat: 60.1939, lon: 11.1004 },
      { iata: 'KEF', city: 'Reykjavik Keflavík', country: 'Islande', eu: true, lat: 63.9850, lon: -22.6056 },
      { iata: 'IST', city: 'Istanbul Airport', country: 'Turquie', eu: false, lat: 41.2753, lon: 28.7519 },
      { iata: 'RAK', city: 'Marrakech Menara', country: 'Maroc', eu: false, lat: 31.6069, lon: -8.0363 },
      { iata: 'CMN', city: 'Casablanca Mohammed V', country: 'Maroc', eu: false, lat: 33.3675, lon: -7.5899 },
      { iata: 'TUN', city: 'Tunis Carthage', country: 'Tunisie', eu: false, lat: 36.8510, lon: 10.2272 },
      { iata: 'ALG', city: 'Alger Houari-Boumédiène', country: 'Algérie', eu: false, lat: 36.6910, lon: 3.2154 },
      { iata: 'JFK', city: 'New York JFK', country: 'États-Unis', eu: false, lat: 40.6413, lon: -73.7781 },
      { iata: 'LAX', city: 'Los Angeles', country: 'États-Unis', eu: false, lat: 33.9416, lon: -118.4085 },
      { iata: 'MIA', city: 'Miami', country: 'États-Unis', eu: false, lat: 25.7959, lon: -80.2870 },
      { iata: 'YUL', city: 'Montréal Trudeau', country: 'Canada', eu: false, lat: 45.4706, lon: -73.7408 },
      { iata: 'DXB', city: 'Dubaï International', country: 'Émirats Arabes Unis', eu: false, lat: 25.2532, lon: 55.3657 },
      { iata: 'DOH', city: 'Doha Hamad', country: 'Qatar', eu: false, lat: 25.2731, lon: 51.6081 },
      { iata: 'HND', city: 'Tokyo Haneda', country: 'Japon', eu: false, lat: 35.5494, lon: 139.7798 },
      { iata: 'BKK', city: 'Bangkok Suvarnabhumi', country: 'Thaïlande', eu: false, lat: 13.6900, lon: 100.7501 },
      { iata: 'SIN', city: 'Singapour Changi', country: 'Singapour', eu: false, lat: 1.3644, lon: 103.9915 },
      { iata: 'DKR', city: 'Dakar Blaise-Diagne', country: 'Sénégal', eu: false, lat: 14.6700, lon: -17.0733 }
    ];

    function haversineKm(a, b) {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const sinLat = Math.sin(dLat / 2);
      const sinLon = Math.sin(dLon / 2);
      const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
      return Math.round(2 * R * Math.asin(Math.sqrt(h)));
    }

    const depSel = document.getElementById('ec-dep');
    const arrSel = document.getElementById('ec-arr');
    const airlineEuSel = document.getElementById('ec-airline-eu');
    const incidentSel = document.getElementById('ec-incident');
    const delayGroup = document.getElementById('ec-delay-group');
    const delaySel = document.getElementById('ec-delay');
    const cancelGroup = document.getElementById('ec-cancel-group');
    const cancelSel = document.getElementById('ec-cancel-notice');
    const causeSel = document.getElementById('ec-cause');
    const paxInput = document.getElementById('ec-pax');

    const distOut = document.getElementById('ec-distance-km');
    const perPaxOut = document.getElementById('ec-amount-per-pax');
    const totalOut = document.getElementById('ec-amount-total');
    const verdictBox = document.getElementById('ec-verdict-box');
    const rightsList = document.getElementById('ec-care-rights');

    // Letter generator inputs
    const letterName = document.getElementById('letter-name');
    const letterAirline = document.getElementById('letter-airline');
    const letterFlight = document.getElementById('letter-flight');
    const letterDate = document.getElementById('letter-date');
    const letterPnr = document.getElementById('letter-pnr');
    const letterPreview = document.getElementById('letter-preview');
    const copyLetterBtn = document.getElementById('btn-copy-letter');
    const printLetterBtn = document.getElementById('btn-print-letter');
    const quickRoutes = document.querySelectorAll('[data-ec-route]');

    AIRPORTS.forEach((ap) => {
      const label = ap.iata + ' — ' + ap.city + ' (' + ap.country + ')';
      const o1 = document.createElement('option');
      o1.value = ap.iata;
      o1.textContent = label;
      depSel.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = ap.iata;
      o2.textContent = label;
      arrSel.appendChild(o2);
    });

    depSel.value = 'CDG';
    arrSel.value = 'BCN';

    function compute() {
      const dep = AIRPORTS.find((a) => a.iata === depSel.value) || AIRPORTS[0];
      const arr = AIRPORTS.find((a) => a.iata === arrSel.value) || AIRPORTS[1];
      const distKm = dep.iata === arr.iata ? 0 : haversineKm(dep, arr);
      const isAirlineEU = airlineEuSel.value === 'eu';
      const incident = incidentSel.value; // delay | cancel | overbook
      const delayVal = delaySel.value; // lt2 | 2to3 | 3to4 | gte4
      const cancelVal = cancelSel.value; // lt7 | 7to14 | gt14
      const causeVal = causeSel.value; // airline | extraordinary
      const paxCount = Math.max(1, Math.min(20, Number(paxInput.value) || 1));

      delayGroup.style.display = incident === 'delay' ? 'block' : 'none';
      cancelGroup.style.display = incident === 'cancel' ? 'block' : 'none';

      distOut.textContent = CabineOK.formatNum(distKm) + ' km';

      // Territorial scope (Art. 3.1 EC 261/2004)
      const inScope = dep.eu || (arr.eu && isAirlineEU);
      const intraEU = dep.eu && arr.eu;

      let eligible = true;
      let reason = '';
      let baseAmount = 0;

      if (distKm === 0) {
        eligible = false;
        reason = 'Sélectionnez deux aéroports distincts pour calculer la distance orthodromique.';
      } else if (!inScope) {
        eligible = false;
        reason = 'Hors champ du Règlement CE 261/2004 : un vol au départ d’un pays hors-UE opéré par une compagnie non européenne n’est pas couvert par le règlement européen.';
      } else if (causeVal === 'extraordinary' && incident !== 'overbook') {
        eligible = false;
        reason = 'Circonstance extraordinaire exonératoire (météo sévère, fermeture espace aérien, grève contrôle aérien externe) : pas d’indemnité forfaitaire, mais la compagnie reste tenue au droit à la prise en charge (repas, hôtel, réacheminement).';
      } else if (incident === 'delay' && (delayVal === 'lt2' || delayVal === '2to3')) {
        eligible = false;
        reason = 'Retard à l’arrivée inférieur à 3 heures : le seuil légal d’indemnisation financière (jurisprudence CJUE Sturgeon) est fixé à 3 heures révolues à l’ouverture des portes de l’avion.';
      } else if (incident === 'cancel' && cancelVal === 'gt14') {
        eligible = false;
        reason = 'Annulation notifiée plus de 14 jours avant le départ : aucune indemnité forfaitaire n’est due (remboursement intégral ou réacheminement gratuit obligatoire).';
      }

      if (eligible) {
        if (distKm <= 1500) {
          baseAmount = 250;
        } else if (intraEU || distKm <= 3500) {
          baseAmount = 400;
        } else {
          // > 3500 km extra-EU: 600 EUR, reduced by 50% (300 EUR) if delay 3h-4h
          if (incident === 'delay' && delayVal === '3to4') {
            baseAmount = 300;
            reason = 'Vol long-courrier (> 3 500 km) avec retard entre 3 h et 4 h : l’article 7.2 prévoit une réduction de 50 % de l’indemnité de 600 €, soit 300 € par passager.';
          } else {
            baseAmount = 600;
          }
        }

        if (!reason) {
          const bracket = distKm <= 1500
            ? '≤ 1 500 km (palier 250 €)'
            : (intraEU ? 'vol intra-UE > 1 500 km (plafond 400 €)' : (distKm <= 3500 ? '1 500 à 3 500 km (palier 400 €)' : '> 3 500 km hors intra-UE (palier 600 €)'));
          reason = 'Éligible à l’indemnité forfaitaire au titre du Règlement (CE) n° 261/2004 — Distance orthodromique ' + CabineOK.formatNum(distKm) + ' km (' + bracket + ').';
        }
      }

      const totalAmount = baseAmount * paxCount;
      perPaxOut.textContent = CabineOK.formatEur(baseAmount);
      totalOut.textContent = CabineOK.formatEur(totalAmount);

      verdictBox.className = 'callout ' + (eligible ? 'callout-ok' : 'callout-warn');
      verdictBox.innerHTML =
        '<div style="font-family:var(--font-display);font-weight:800;font-size:1.1875rem;color:var(--text-primary);margin-bottom:6px;">' +
          (eligible
            ? 'Indemnité estimée : ' + CabineOK.formatEur(totalAmount) + ' (' + paxCount + ' passager' + (paxCount > 1 ? 's' : '') + ')'
            : 'Indemnité forfaitaire non due dans ce scénario') +
        '</div>' +
        '<p style="margin:0;color:var(--text-primary);">' + reason + '</p>';

      // Assistance / Care rights (Art. 9)
      rightsList.innerHTML =
        '<li><strong>Droit à la prise en charge (Art. 9) :</strong> rafraîchissements, repas et 2 communications gratuits dès 2 h d’attente (≤ 1 500 km), 3 h (1 500–3 500 km) ou 4 h (> 3 500 km), même en cas de circonstance extraordinaire.</li>' +
        '<li><strong>Nuit d’hôtel & transferts :</strong> pris en charge par la compagnie si le vol de remplacement part le lendemain. Conservez tous vos reçus originaux.</li>' +
        '<li><strong>Remboursement intégral (Art. 8) :</strong> exigible sous 7 jours si le retard au départ dépasse 5 heures et que vous renoncez au voyage, ou en cas d’annulation.</li>';

      renderLetter(dep, arr, distKm, baseAmount, totalAmount, paxCount, incident, eligible);
    }

    function renderLetter(dep, arr, distKm, baseAmount, totalAmount, paxCount, incident, eligible) {
      const nom = (letterName.value || '').trim() || '[Votre Prénom NOM]';
      const cie = (letterAirline.value || '').trim() || '[Nom de la Compagnie Aérienne]';
      const vol = (letterFlight.value || '').trim() || '[Numéro de vol, ex. AF1248]';
      const dateVol = (letterDate.value || '').trim() || '[Date du vol]';
      const pnr = (letterPnr.value || '').trim() || '[Référence réservation / PNR]';

      const incidentLabel = incident === 'delay'
        ? 'un retard important à l’arrivée (supérieur ou égal à 3 heures)'
        : (incident === 'cancel' ? 'une annulation tardive' : 'un refus d’embarquement involontaire (surbooking)');

      const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      const text =
        'Objet : Demande d’indemnisation forfaitaire — Règlement (CE) n° 261/2004\n' +
        'Vol : ' + vol + ' du ' + dateVol + ' (' + dep.iata + ' → ' + arr.iata + ')\n' +
        'Référence de réservation (PNR) : ' + pnr + '\n' +
        'Date : ' + todayStr + '\n\n' +
        'À l’attention du Service Relations Clientèle de ' + cie + ',\n\n' +
        'Madame, Monsieur,\n\n' +
        'Je me permets de vous contacter suite à la perturbation survenue sur le vol ' + vol + ' prévu le ' + dateVol + ' au départ de ' + dep.city + ' (' + dep.iata + ') et à destination de ' + arr.city + ' (' + arr.iata + '), réservé sous le dossier ' + pnr + ' pour ' + paxCount + ' passager' + (paxCount > 1 ? 's' : '') + '.\n\n' +
        'Ce vol a subi ' + incidentLabel + ', ne relevant pas de circonstances extraordinaires exonératoires au sens de l’article 5 paragraphe 3 du Règlement (CE) n° 261/2004.\n\n' +
        'Conformément aux articles 5, 6 et 7 du Règlement (CE) n° 261/2004 du Parlement européen et du Conseil du 11 février 2004 (ainsi qu’à la jurisprudence constante de la CJUE, arrêt Sturgeon C-402/07), la distance orthodromique de ce trajet étant de ' + CabineOK.formatNum(distKm) + ' km, je vous demande le versement de l’indemnité forfaitaire de ' +
        (eligible ? (CabineOK.formatEur(baseAmount) + ' par passager, soit un montant total de ' + CabineOK.formatEur(totalAmount)) : '[montant applicable / remboursement des frais engagés]') +
        '.\n\n' +
        'Je vous remercie de bien vouloir procéder au règlement par virement bancaire (RIB / IBAN joint) dans un délai de 14 jours à compter de la réception de la présente, sans quoi je me verrai contraint(e) de saisir la Médiation Tourisme et Voyage (MTV) ou la Direction Générale de l’Aviation Civile (DGAC).\n\n' +
        'Vous trouverez ci-joint la copie de ma confirmation de réservation et de ma carte d’embarquement.\n\n' +
        'Dans l’attente de votre retour rapide, je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.\n\n' +
        nom + '\n' +
        '[Votre adresse e-mail & téléphone]\n' +
        '[Votre IBAN / BIC]';

      letterPreview.textContent = text;
    }

    [depSel, arrSel, airlineEuSel, incidentSel, delaySel, cancelSel, causeSel, paxInput, letterName, letterAirline, letterFlight, letterDate, letterPnr].forEach((el) => {
      el.addEventListener('input', compute);
      el.addEventListener('change', compute);
    });

    quickRoutes.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pair = btn.getAttribute('data-ec-route').split('-');
        depSel.value = pair[0];
        arrSel.value = pair[1];
        compute();
      });
    });

    copyLetterBtn.addEventListener('click', () => {
      CabineOK.copyText(letterPreview.textContent, 'Lettre de réclamation copiée dans le presse-papiers.');
    });

    printLetterBtn.addEventListener('click', () => {
      window.print();
    });

    compute();
  });
})();
