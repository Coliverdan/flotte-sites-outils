/* ==========================================================================
   TRAJECTOIRE — Outil 2 : Simulateur Malus CO₂ + Masse + Carte Grise 2026
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const data = window.TRAJECTOIRE_DATA;
    const T = window.Trajectoire;
    if (!data || !T) return;

    const presetSel = document.getElementById('m-preset');
    const deptSel = document.getElementById('m-dept');
    if (!deptSel) return;

    const el = {
      fuel: document.getElementById('m-fuel'),
      co2: document.getElementById('m-co2'),
      mass: document.getElementById('m-mass'),
      cv: document.getElementById('m-cv'),
      children: document.getElementById('m-children'),
      origin: document.getElementById('m-origin'),
      ageMonthsWrap: document.getElementById('m-age-wrap'),
      ageMonths: document.getElementById('m-age-months'),
      ageLabel: document.getElementById('m-age-val'),
      handicap: document.getElementById('m-handicap'),
      // Sorties
      totalBanner: document.getElementById('m-total-banner'),
      totalVal: document.getElementById('m-total-val'),
      totalSub: document.getElementById('m-total-sub'),
      kpiCo2: document.getElementById('m-kpi-co2'),
      kpiMass: document.getElementById('m-kpi-mass'),
      kpiRegion: document.getElementById('m-kpi-region'),
      kpiCo2Note: document.getElementById('m-kpi-co2-note'),
      kpiMassNote: document.getElementById('m-kpi-mass-note'),
      kpiRegionNote: document.getElementById('m-kpi-region-note'),
      tableBody: document.getElementById('m-table-body'),
      canvas: document.getElementById('m-chart'),
      exportBtn: document.getElementById('m-export-png')
    };

    // Peupler les 101 départements
    deptSel.innerHTML = '';
    data.departments.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = `${d.code} — ${d.name} (${T.fmtEURDec(d.rate)}/CV · ${d.region})`;
      if (d.code === '75') opt.selected = true;
      deptSel.appendChild(opt);
    });

    // Peupler les presets modèles
    if (presetSel) {
      presetSel.innerHTML = '<option value="">— Saisie manuelle libre —</option>';
      data.cars.forEach((car) => {
        const opt = document.createElement('option');
        opt.value = car.id;
        opt.textContent = `${car.name} (${car.co2} g · ${car.massKg} kg · ${car.cv} CV)`;
        presetSel.appendChild(opt);
      });
      presetSel.addEventListener('change', () => {
        const car = data.cars.find((c) => c.id === presetSel.value);
        if (!car) return;
        el.co2.value = car.co2;
        el.mass.value = car.massKg;
        el.cv.value = car.cv;
        el.fuel.value = car.fuel === 'electrique' ? 'electrique' : car.fuel === 'hybride' ? 'hev' : 'thermique';
        calculate();
      });
    }

    /**
     * Barème de décote véhicules importés d'occasion (réforme 2025/2026)
     * Retourne le pourcentage d'abattement (0 à 100) selon l'âge en mois
     */
    function getImportDiscountPct(months) {
      if (months <= 0) return 0;
      if (months < 3) return 3;
      if (months < 6) return 6;
      if (months < 9) return 9;
      if (months < 12) return 12;
      if (months < 18) return 16;
      if (months < 24) return 22;
      if (months < 36) return 28;
      if (months < 48) return 38;
      if (months < 60) return 46;
      if (months < 72) return 53;
      if (months < 84) return 59;
      if (months < 96) return 64;
      if (months < 108) return 69;
      if (months < 120) return 74;
      if (months < 132) return 79;
      if (months < 144) return 84;
      if (months < 156) return 89;
      if (months < 168) return 94;
      if (months < 180) return 97;
      return 100;
    }

    let lastRes = null;

    function calculate() {
      const fuel = el.fuel.value;
      const rawCo2 = Math.max(0, parseInt(el.co2.value, 10) || 0);
      const rawMass = Math.max(500, parseInt(el.mass.value, 10) || 1400);
      const cv = Math.max(1, parseInt(el.cv.value, 10) || 6);
      const children = Math.max(0, parseInt(el.children.value, 10) || 0);
      const origin = el.origin.value; // 'neuf' | 'import' | 'occasion_fr'
      const ageMonths = Math.max(0, parseInt(el.ageMonths.value, 10) || 0);
      const isHandicap = el.handicap.checked;
      const dept = data.departments.find((d) => d.code === deptSel.value) || data.departments[74];

      if (el.ageMonthsWrap) {
        el.ageMonthsWrap.style.display = origin === 'neuf' ? 'none' : 'block';
      }
      if (el.ageLabel) {
        const yrs = Math.floor(ageMonths / 12);
        const rem = ageMonths % 12;
        el.ageLabel.textContent = yrs > 0 ? `${yrs} an${yrs > 1 ? 's' : ''}${rem > 0 ? ` ${rem} mois` : ''}` : `${ageMonths} mois`;
      }

      // 1. Calcul Taxe Régionale Y1
      let y1 = cv * dept.rate;
      let y1Note = `${cv} CV × ${T.fmtEURDec(dept.rate)} (${dept.region})`;
      if (fuel === 'electrique' && dept.evExempt) {
        y1 = 0;
        y1Note = `Exonéré 100 % en ${dept.region}`;
      } else if (origin !== 'neuf' && ageMonths >= 120) {
        y1 = y1 * 0.5;
        y1Note = `Demi-tarif (+10 ans) · ${dept.region}`;
      }
      y1 = Math.round(y1);

      // 2. Calcul Malus CO₂ et Malus Masse (uniquement neuf ou 1re immatriculation importée)
      let malusCo2 = 0;
      let malusMass = 0;
      let co2Used = rawCo2;
      let massUsed = rawMass;
      const notesCo2 = [];
      const notesMass = [];
      let capped = false;

      if (origin === 'occasion_fr') {
        notesCo2.push('Déjà immatriculé en France : 0 €');
        notesMass.push('Déjà immatriculé en France : 0 €');
      } else if (isHandicap) {
        notesCo2.push('Exonération CMI Invalidité');
        notesMass.push('Exonération CMI Invalidité');
      } else if (fuel === 'electrique') {
        notesCo2.push('Zéro émission WLTP');
        notesMass.push('Véhicule électrique éco-scoré exonéré');
      } else {
        // Abattement E85 d'origine (40 % si < 250 g/km)
        if (fuel === 'e85' && rawCo2 < 250) {
          co2Used = Math.round(rawCo2 * 0.6);
          notesCo2.push(`-40 % E85 (${co2Used} g)`);
        }

        // Abattement hybride sur la masse
        if (fuel === 'hev') {
          massUsed = Math.max(0, massUsed - 100);
          notesMass.push('-100 kg hybride HEV');
        } else if (fuel === 'phev50') {
          const phevReduction = Math.min(200, Math.round(rawMass * 0.15));
          massUsed = Math.max(0, massUsed - phevReduction);
          notesMass.push(`-${phevReduction} kg PHEV (>50 km)`);
        }

        // Abattement Famille Nombreuse (>= 3 enfants à charge)
        if (children >= 3) {
          const co2Red = children * 20;
          const massRed = children * 200;
          co2Used = Math.max(0, co2Used - co2Red);
          massUsed = Math.max(0, massUsed - massRed);
          notesCo2.push(`-${co2Red} g (${children} enfants)`);
          notesMass.push(`-${massRed} kg (${children} enfants)`);
        }

        malusCo2 = data.getMalusCO2_2026(co2Used);
        malusMass = data.getMalusPoids_2026(massUsed);

        // Plafond légal cumulé CO2 + Poids = 80 000 €
        if (malusCo2 + malusMass > 80000) {
          malusMass = Math.max(0, 80000 - malusCo2);
          capped = true;
          notesMass.push('Plafonné à 80 000 € cumulé');
        }

        // Décote occasion importée
        if (origin === 'import' && ageMonths > 0) {
          const disc = getImportDiscountPct(ageMonths);
          const factor = (100 - disc) / 100;
          malusCo2 = Math.round(malusCo2 * factor);
          malusMass = Math.round(malusMass * factor);
          notesCo2.push(`-${disc} % âge import`);
          notesMass.push(`-${disc} % âge import`);
        }
      }

      const y4 = 11.00;
      const y5 = 2.76;
      const totalMalus = malusCo2 + malusMass;
      const grandTotal = y1 + totalMalus + y4 + y5;

      // Mise à jour DOM
      el.totalVal.textContent = T.fmtEURDec(grandTotal);
      el.totalBanner.classList.toggle('is-positive', totalMalus === 0);
      el.totalSub.textContent = totalMalus === 0
        ? `Aucun malus écologique applicable. Seules les taxes d'immatriculation (${T.fmtEURDec(y1 + y4 + y5)}) sont dues.`
        : `Dont ${T.fmtEUR(totalMalus)} de malus écologique (CO₂ + Masse) et ${T.fmtEURDec(y1 + y4 + y5)} de carte grise.${capped ? ' Plafond légal 2026 de 80 000 € atteint.' : ''}`;

      el.kpiCo2.textContent = T.fmtEUR(malusCo2);
      el.kpiCo2.className = `kpi-val ${malusCo2 > 0 ? 'accent' : 'positive'}`;
      el.kpiCo2Note.textContent = notesCo2.length ? notesCo2.join(' · ') : `Base retenue : ${co2Used} g/km`;

      el.kpiMass.textContent = T.fmtEUR(malusMass);
      el.kpiMass.className = `kpi-val ${malusMass > 0 ? 'accent' : 'positive'}`;
      el.kpiMassNote.textContent = notesMass.length ? notesMass.join(' · ') : `Masse taxable : ${T.fmtNum(massUsed)} kg`;

      el.kpiRegion.textContent = T.fmtEUR(y1);
      el.kpiRegionNote.textContent = y1Note;

      // Tableau ligne par ligne (champs officiels certificat d'immatriculation)
      const rows = [
        { code: 'Y.1', label: `Taxe régionale (${dept.code} — ${dept.name})`, detail: y1Note, val: y1 },
        { code: 'Y.3a', label: 'Malus CO₂ (barème 2026 dès 108 g/km)', detail: `${co2Used} g/km retenus${notesCo2.length ? ` (${notesCo2.join(', ')})` : ''}`, val: malusCo2 },
        { code: 'Y.3b', label: 'Malus au poids (barème 2026 dès 1 500 kg)', detail: `${T.fmtNum(massUsed)} kg retenus${notesMass.length ? ` (${notesMass.join(', ')})` : ''}`, val: malusMass },
        { code: 'Y.4', label: 'Taxe fixe de gestion', detail: 'Forfait national ANTS', val: y4 },
        { code: 'Y.5', label: 'Redevance d\'acheminement', detail: 'Envoi sécurisé titre', val: y5 }
      ];

      el.tableBody.innerHTML = rows.map((r) => `
        <tr>
          <td class="mono">${r.code}</td>
          <td><strong>${r.label}</strong><br><span class="text-muted" style="font-size:12px;">${r.detail}</span></td>
          <td class="num">${T.fmtEURDec(r.val)}</td>
        </tr>
      `).join('') + `
        <tr class="row-highlight">
          <td class="mono">Y.6</td>
          <td>TOTAL À PAYER À L'IMMATRICULATION</td>
          <td class="num text-accent">${T.fmtEURDec(grandTotal)}</td>
        </tr>
      `;

      lastRes = { grandTotal, y1, malusCo2, malusMass, y4, y5, dept, rawCo2, rawMass, cv };
      drawChart(lastRes);
    }

    function drawChart(r) {
      if (!el.canvas || !r) return;
      const { ctx, width, height } = T.setupCanvas(el.canvas);
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, width, height);

      const items = [
        { label: 'Malus CO₂', val: r.malusCo2, color: '#E85D04' },
        { label: 'Malus Masse', val: r.malusMass, color: '#F59E0B' },
        { label: 'Taxe Régionale (Y.1)', val: r.y1, color: '#38BDF8' },
        { label: 'Frais fixes (Y.4+Y.5)', val: r.y4 + r.y5, color: '#9BA3AE' }
      ];

      const maxVal = Math.max(500, ...items.map((i) => i.val));
      const pad = { top: 20, right: 92, bottom: 20, left: 158 };
      const plotW = Math.max(80, width - pad.left - pad.right);
      const rowH = (height - pad.top - pad.bottom) / items.length;

      items.forEach((item, idx) => {
        const y = pad.top + idx * rowH;
        const barH = Math.min(26, rowH * 0.52);
        const barY = y + (rowH - barH) / 2;
        const barW = Math.max(item.val > 0 ? 4 : 0, (item.val / maxVal) * plotW);

        // Label gauche
        ctx.fillStyle = '#9BA3AE';
        ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(item.label, pad.left - 12, barY + barH * 0.68);

        // Piste fond
        ctx.fillStyle = '#16191D';
        ctx.fillRect(pad.left, barY, plotW, barH);
        ctx.strokeStyle = '#282D34';
        ctx.strokeRect(pad.left, barY, plotW, barH);

        // Barre valeur
        if (barW > 0) {
          ctx.fillStyle = item.color;
          ctx.fillRect(pad.left, barY, barW, barH);
        }

        // Valeur droite
        ctx.fillStyle = '#F2F2EE';
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(T.fmtEURDec(item.val), pad.left + plotW + 10, barY + barH * 0.68);
      });
    }

    document.querySelectorAll('#malus-form input, #malus-form select').forEach((node) => {
      if (node !== presetSel) {
        node.addEventListener('input', calculate);
        node.addEventListener('change', calculate);
      }
    });

    if (el.exportBtn) {
      el.exportBtn.addEventListener('click', () => {
        if (!lastRes) return;
        T.exportSummaryCardPNG({
          title: `Simulation Malus & Carte Grise 2026`,
          subtitle: `${lastRes.rawCo2} g/km WLTP · ${T.fmtNum(lastRes.rawMass)} kg · ${lastRes.cv} CV · Dép. ${lastRes.dept.code} (${lastRes.dept.name})`,
          verdictLabel: 'Total immatriculation (Y.6)',
          verdictValue: T.fmtEURDec(lastRes.grandTotal),
          kpis: [
            { label: 'Malus CO₂', value: T.fmtEUR(lastRes.malusCo2), note: 'Seuil 108 g/km', color: '#E85D04' },
            { label: 'Malus Masse', value: T.fmtEUR(lastRes.malusMass), note: 'Seuil 1 500 kg', color: '#F59E0B' },
            { label: 'Taxe Régionale', value: T.fmtEUR(lastRes.y1), note: `${T.fmtEURDec(lastRes.dept.rate)}/CV`, color: '#38BDF8' },
            { label: 'Frais ANTS', value: T.fmtEURDec(lastRes.y4 + lastRes.y5), note: 'Y.4 + Y.5', color: '#F2F2EE' }
          ],
          filename: 'trajectoire-malus-2026.png'
        });
      });
    }

    window.addEventListener('resize', () => {
      if (lastRes) drawChart(lastRes);
    });

    calculate();
  });
})();
