/* ==========================================================================
   PattesClaires — Aperçu Interactif Hero & Tableau Repère 42 Races (Accueil)
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const breeds = window.PATTES_BREEDS || [];
    const UI = window.PattesUI;
    if (!breeds.length || !UI) return;

    const elSelect = document.getElementById('hero-breed-select');
    const outMonthly = document.getElementById('hero-out-monthly');
    const outAnnual = document.getElementById('hero-out-annual');
    const outLifetime = document.getElementById('hero-out-lifetime');
    const outMeta = document.getElementById('hero-out-meta');
    const outCta = document.getElementById('hero-out-cta');

    if (elSelect) {
      breeds.forEach(function (b) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name + ' (' + (b.species === 'chien' ? 'Chien' : 'Chat') + ')';
        elSelect.appendChild(opt);
      });
      elSelect.value = 'berger-australien';

      function updateHeroPreview() {
        const b = breeds.find(function (x) { return x.id === elSelect.value; }) || breeds[0];
        const isDog = b.species === 'chien';
        /* Estimation repère alimentation Premium + prévention + risque véto moyen */
        const foodYear = (b.kibbleMonthBase * 1.38 + (isDog ? 11 : 24)) * 12;
        const riskCurve = [0, 140, 210, 320, 460, 650];
        const healthYear = (isDog ? 215 : 155) + (riskCurve[b.vetRisk] || 280);
        const lifestyleYear = b.groomingYear * 0.75 + (isDog ? 240 : 165);
        const annual = foodYear + healthYear + lifestyleYear;
        const monthly = annual / 12;
        const setup = b.adoptionCost + (isDog ? 480 : 310);
        const lifetime = setup + annual * b.lifespan + b.vetRisk * 220;

        outMonthly.textContent = UI.formatEUR(monthly) + ' / mois';
        outAnnual.textContent = UI.formatEUR(annual) + ' / an';
        outLifetime.textContent = UI.formatEUR(lifetime);
        outMeta.textContent = b.weightKg + ' kg · Espérance ~' + b.lifespan + ' ans · Risque véto ' + b.vetRisk + '/5';
        if (outCta) {
          outCta.href = 'outils/budget-chien-chat-race.html?race=' + encodeURIComponent(b.id);
        }
      }

      elSelect.addEventListener('change', updateHeroPreview);
      updateHeroPreview();
    }

    /* Tableau comparatif rapide sur la page d'accueil */
    const benchBody = document.getElementById('home-benchmark-body');
    const benchBtns = document.querySelectorAll('[data-bench-filter]');
    let benchFilter = 'tous';

    function renderBench() {
      if (!benchBody) return;
      const featuredIds = [
        'berger-australien', 'golden-retriever', 'bouledogue-francais',
        'chihuahua', 'border-collie', 'saint-bernard',
        'chat-europeen', 'maine-coon', 'ragdoll', 'persan'
      ];
      const list = breeds.filter(function (b) {
        if (benchFilter === 'tous') return featuredIds.indexOf(b.id) !== -1;
        return b.species === benchFilter;
      }).slice(0, 10);

      benchBody.innerHTML = list.map(function (b) {
        const isDog = b.species === 'chien';
        const annual = Math.round((b.kibbleMonthBase * 1.38 + (isDog ? 11 : 24)) * 12 + (isDog ? 215 : 155) + [0, 140, 210, 320, 460, 650][b.vetRisk] + b.groomingYear * 0.75 + (isDog ? 240 : 165));
        const life = Math.round(b.adoptionCost + (isDog ? 480 : 310) + annual * b.lifespan + b.vetRisk * 220);
        const badgeCls = b.vetRisk >= 4 ? 'badge-danger' : (b.vetRisk === 3 ? 'badge-caution' : 'badge-safe');
        return '<tr>' +
          '<td><strong><a href="outils/budget-chien-chat-race.html?race=' + b.id + '">' + b.name + '</a></strong></td>' +
          '<td>' + (isDog ? 'Chien' : 'Chat') + '</td>' +
          '<td class="td-num">' + b.weightKg + ' kg</td>' +
          '<td class="td-num">' + b.lifespan + ' ans</td>' +
          '<td><span class="badge ' + badgeCls + '">' + b.vetRisk + '/5</span></td>' +
          '<td class="td-num">' + UI.formatEUR(annual / 12) + '/mois</td>' +
          '<td class="td-num"><strong>' + UI.formatEUR(life) + '</strong></td>' +
          '</tr>';
      }).join('');
    }

    benchBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        benchBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        benchFilter = btn.getAttribute('data-bench-filter') || 'tous';
        renderBench();
      });
    });

    renderBench();
  });
})();
