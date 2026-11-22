/* ==========================================================================
   CHRONONET — Cadran horloger interactif du Hero (Page d'accueil)
   ========================================================================== */

(function () {
  'use strict';

  const CN = window.ChronoNet;
  if (!CN) return;

  const salRange = document.getElementById('hero-sal-range');
  const trajetRange = document.getElementById('hero-trajet-range');
  const outSal = document.getElementById('hero-sal-val');
  const outTrajet = document.getElementById('hero-trajet-val');
  const outAffiche = document.getElementById('hero-taux-affiche');
  const outVrai = document.getElementById('hero-taux-vrai');
  const outPerte = document.getElementById('hero-perte-pct');
  const dialCanvas = document.getElementById('hero-dial-canvas');

  if (!salRange || !dialCanvas) return;

  function drawDial(ratio) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 144;
    dialCanvas.width = size * dpr;
    dialCanvas.height = size * dpr;
    const ctx = dialCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const r = 62;

    ctx.clearRect(0, 0, size, size);

    // Cadran extérieur Braun
    ctx.fillStyle = '#F6F6F4';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#141413';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 12 graduations d'horlogerie
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 - Math.PI / 2;
      const inner = i % 3 === 0 ? r - 11 : r - 7;
      ctx.strokeStyle = i % 3 === 0 ? '#141413' : '#8C8C84';
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.stroke();
    }

    // Arc d'efficacité réelle (vermillon)
    const clamped = Math.max(0.15, Math.min(1, ratio));
    ctx.strokeStyle = '#D9381E';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 18, -Math.PI / 2, -Math.PI / 2 + clamped * Math.PI * 2);
    ctx.stroke();

    // Aiguille de précision
    const angle = -Math.PI / 2 + clamped * Math.PI * 2;
    ctx.strokeStyle = '#141413';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (r - 22), cy + Math.sin(angle) * (r - 22));
    ctx.stroke();

    // Pivot vermillon central
    ctx.fillStyle = '#D9381E';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Valeur centrale %
    ctx.fillStyle = '#141413';
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(clamped * 100) + '%', cx, cy + 20);
  }

  function update() {
    const sal = Number(salRange.value);
    const trajet = Number(trajetRange.value);

    outSal.textContent = CN.fmtEUR(sal, 0);
    outTrajet.textContent = trajet + ' min/j';

    // Base rapide : 35h contrat, 39h réelles, 4j sur site, 250 € frais mensuels estimés
    const tauxAffiche = sal / 151.67;
    const fraisEstimes = 150 + trajet * 1.4;
    const revenuReelAn = Math.max(0, (sal - fraisEstimes) * 12);
    const heuresAn = (39 + (trajet / 60) * 4 + 1.5) * 47;
    const vraiTaux = revenuReelAn / heuresAn;
    const ratio = vraiTaux / tauxAffiche;
    const pertePct = (1 - ratio) * 100;

    outAffiche.textContent = CN.fmtEUR(tauxAffiche, 2) + '/h';
    outVrai.textContent = CN.fmtEUR(vraiTaux, 2) + '/h';
    outPerte.textContent = '-' + CN.fmtNum(Math.max(0, pertePct), 1) + ' %';

    drawDial(ratio);
  }

  salRange.addEventListener('input', update);
  trajetRange.addEventListener('input', update);
  update();
})();
