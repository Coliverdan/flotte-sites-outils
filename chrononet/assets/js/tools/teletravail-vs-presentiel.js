/* ==========================================================================
   CHRONONET — Outil 03 : Simulateur Économies du Télétravail (0 à 5 j/sem)
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const els = {
    modeBtns: document.querySelectorAll('[data-tt-mode]'),
    boxVoiture: document.getElementById('tt-box-voiture'),
    boxTransport: document.getElementById('tt-box-transport'),

    distanceAller: document.getElementById('tt-distance'),
    distanceRange: document.getElementById('tt-distance-range'),
    conso: document.getElementById('tt-conso'),
    prixCarburant: document.getElementById('tt-prix-carburant'),
    usureKm: document.getElementById('tt-usure-km'),
    aboMensuel: document.getElementById('tt-abo-mensuel'),

    coutRepasSite: document.getElementById('tt-repas-site'),
    coutRepasMaison: document.getElementById('tt-repas-maison'),
    coutEnergieJour: document.getElementById('tt-energie-jour'),
    trajetMin: document.getElementById('tt-trajet-min'),
    trajetMinRange: document.getElementById('tt-trajet-min-range'),
    joursTT: document.getElementById('tt-jours'),
    joursTTRange: document.getElementById('tt-jours-range'),
    joursTTReadout: document.getElementById('tt-jours-readout'),

    outEcoAn: document.getElementById('tt-out-eco-an'),
    outEcoMois: document.getElementById('tt-out-eco-mois'),
    outAugBrut: document.getElementById('tt-out-aug-brut'),
    outHeures: document.getElementById('tt-out-heures'),
    outJours24: document.getElementById('tt-out-jours24'),
    outCo2: document.getElementById('tt-out-co2'),
    outKmEvites: document.getElementById('tt-out-km'),
    canvas: document.getElementById('tt-chart')
  };

  if (!els.joursTT) return;

  const SEMAINES_AN = 47;
  const TAUX_PRELEVEMENT_MARGINAL = 0.34; // ~23% cotisations + ~11% IR marginal standard
  let transportMode = 'voiture';

  function computeForDays(daysTT) {
    const distanceAR = CN.clamp(els.distanceAller.value, 0, 250) * 2;
    const conso = CN.clamp(els.conso.value, 0, 20);
    const prixCarburant = CN.clamp(els.prixCarburant.value, 0.5, 4);
    const usureKm = CN.clamp(els.usureKm.value, 0, 0.6);
    const aboMensuel = CN.clamp(els.aboMensuel.value, 0, 600);

    const repasSite = CN.clamp(els.coutRepasSite.value, 0, 40);
    const repasMaison = CN.clamp(els.coutRepasMaison.value, 0, 25);
    const energieJour = CN.clamp(els.coutEnergieJour.value, 0, 15);
    const trajetMin = CN.clamp(els.trajetMin.value, 0, 300);

    const joursTTAn = daysTT * SEMAINES_AN;
    const kmEvitesAn = distanceAR * joursTTAn;

    let ecoTransportAn = 0;
    let co2KgAn = 0;

    if (transportMode === 'voiture') {
      const coutCarburantKm = (conso / 100) * prixCarburant;
      ecoTransportAn = kmEvitesAn * (coutCarburantKm + usureKm);
      // 1L essence/diesel moyen ~ 2.4 kg CO2
      co2KgAn = (kmEvitesAn * (conso / 100)) * 2.4;
    } else {
      // Si 5 jours de télétravail, l'abonnement peut être résilié (reste 50 % à charge salarié)
      // Si partiel (1-4j), l'abonnement mensuel reste généralement fixe, seuls les tickets ponctuels baissent
      if (daysTT === 5) {
        ecoTransportAn = (aboMensuel * 0.5) * 12;
      } else {
        ecoTransportAn = 0;
      }
      // Empreinte transport en commun ~ 0.025 kg CO2 / km
      co2KgAn = kmEvitesAn * 0.025;
    }

    const ecoRepasAn = Math.max(0, repasSite - repasMaison) * joursTTAn;
    const surcoutEnergieAn = energieJour * joursTTAn;
    const ecoNetteAn = ecoTransportAn + ecoRepasAn - surcoutEnergieAn;
    const augBrutAn = ecoNetteAn > 0 ? ecoNetteAn / (1 - TAUX_PRELEVEMENT_MARGINAL) : 0;
    const heuresRecupAn = (trajetMin / 60) * joursTTAn;

    return {
      daysTT,
      ecoNetteAn,
      ecoNetteMois: ecoNetteAn / 12,
      augBrutAn,
      heuresRecupAn,
      jours24h: heuresRecupAn / 24,
      co2KgAn,
      kmEvitesAn
    };
  }

  function drawChart(activeDays) {
    const setup = CN.setupCanvas(els.canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F6F6F4';
    ctx.fillRect(0, 0, width, height);

    const series = [0, 1, 2, 3, 4, 5].map(function (d) {
      return computeForDays(d);
    });

    const maxVal = Math.max.apply(null, series.map(function (s) { return Math.max(0, s.ecoNetteAn); }).concat([500])) * 1.2;
    const padL = 24;
    const padR = 24;
    const padT = 32;
    const padB = 38;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const colW = chartW / series.length;
    const barW = Math.min(48, colW * 0.56);

    // Ligne de base
    ctx.strokeStyle = '#B8B8B0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + chartH);
    ctx.lineTo(width - padR, padT + chartH);
    ctx.stroke();

    series.forEach(function (item, idx) {
      const cx = padL + idx * colW + colW / 2;
      const val = Math.max(0, item.ecoNetteAn);
      const h = Math.max(2, (val / maxVal) * chartH);
      const x = cx - barW / 2;
      const y = padT + chartH - h;
      const isSelected = item.daysTT === activeDays;

      ctx.fillStyle = isSelected ? '#D9381E' : '#141413';
      ctx.fillRect(x, y, barW, h);

      // Valeur au-dessus
      ctx.fillStyle = isSelected ? '#D9381E' : '#55554F';
      ctx.font = (isSelected ? '600 ' : '500 ') + '11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(CN.fmtEUR(val, 0), cx, y - 6);

      // Axe X
      ctx.fillStyle = isSelected ? '#141413' : '#55554F';
      ctx.font = (isSelected ? '700 ' : '500 ') + '12px "IBM Plex Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(item.daysTT + ' j/s', cx, padT + chartH + 12);
    });
  }

  function render() {
    const days = Math.round(CN.clamp(els.joursTT.value, 0, 5));
    if (els.joursTTReadout) {
      els.joursTTReadout.textContent = days + (days > 1 ? ' jours / semaine' : ' jour / semaine');
    }

    const res = computeForDays(days);
    els.outEcoAn.textContent = CN.fmtEUR(res.ecoNetteAn, 0) + ' / an';
    els.outEcoMois.textContent = CN.fmtEUR(res.ecoNetteMois, 0) + ' / mois';
    els.outAugBrut.textContent = '+ ' + CN.fmtEUR(res.augBrutAn, 0) + ' brut/an';
    els.outHeures.textContent = CN.fmtNum(res.heuresRecupAn, 0) + ' h / an';
    els.outJours24.textContent = CN.fmtNum(res.jours24h, 1) + ' jours de 24h';
    els.outCo2.textContent = CN.fmtNum(res.co2KgAn, 0) + ' kg CO₂';
    els.outKmEvites.textContent = CN.fmtNum(res.kmEvitesAn, 0) + ' km / an';

    drawChart(days);
  }

  els.modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      transportMode = btn.getAttribute('data-tt-mode');
      els.modeBtns.forEach(function (b) {
        const active = b.getAttribute('data-tt-mode') === transportMode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      els.boxVoiture.style.display = transportMode === 'voiture' ? 'block' : 'none';
      els.boxTransport.style.display = transportMode === 'transport' ? 'block' : 'none';
      render();
    });
  });

  CN.bindPair(els.distanceRange, els.distanceAller, render);
  CN.bindPair(els.trajetMinRange, els.trajetMin, render);
  CN.bindPair(els.joursTTRange, els.joursTT, render);

  [els.conso, els.prixCarburant, els.usureKm, els.aboMensuel, els.coutRepasSite, els.coutRepasMaison, els.coutEnergieJour].forEach(function (el) {
    if (el) el.addEventListener('input', render);
  });

  window.addEventListener('resize', render);
  render();
})();
