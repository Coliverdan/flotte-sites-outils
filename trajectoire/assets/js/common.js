/* ==========================================================================
   TRAJECTOIRE — Scripts communs (Navigation, RGPD, FAQ, Formatage, Canvas PNG)
   ========================================================================== */

(function () {
  'use strict';

  const nfEUR = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });

  const nfEURDec = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const nfNum = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  });

  const nfDec1 = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const nfDec2 = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const Trajectoire = {
    fmtEUR(val) {
      if (!Number.isFinite(val)) return '0 €';
      return nfEUR.format(Math.round(val));
    },

    fmtEURDec(val) {
      if (!Number.isFinite(val)) return '0,00 €';
      return nfEURDec.format(val);
    },

    fmtNum(val) {
      if (!Number.isFinite(val)) return '0';
      return nfNum.format(Math.round(val));
    },

    fmtDec(val, digits = 1) {
      if (!Number.isFinite(val)) return '0';
      return digits === 2 ? nfDec2.format(val) : nfDec1.format(val);
    },

    fmtPct(val, digits = 1) {
      if (!Number.isFinite(val)) return '0 %';
      return `${Trajectoire.fmtDec(val, digits)} %`;
    },

    fmtDuration(totalMinutes) {
      if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min';
      const mins = Math.round(totalMinutes);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m} min`;
      return `${h} h ${String(m).padStart(2, '0')} min`;
    },

    /**
     * Prépare un Canvas net (HiDPI) dans son conteneur
     */
    setupCanvas(canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(280, Math.round(rect.width));
      const height = Math.max(200, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, width, height };
    },

    /**
     * Exporte un élément Canvas existant en PNG
     */
    exportCanvasPNG(canvas, filename) {
      const link = document.createElement('a');
      link.download = filename || 'trajectoire-graphique.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /**
     * Génère une carte bilan PNG éditoriale (fond #0E1012, bordure #282D34, accent #E85D04)
     */
    exportSummaryCardPNG(options) {
      const W = 1200;
      const H = 680;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');

      // Fond minéral pur
      ctx.fillStyle = '#0E1012';
      ctx.fillRect(0, 0, W, H);

      // Cadre principal
      ctx.strokeStyle = '#282D34';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      // Bandeau supérieur
      ctx.fillStyle = '#E85D04';
      ctx.fillRect(56, 56, 12, 40);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '800 28px Archivo, Arial, sans-serif';
      ctx.fillText('TRAJECTOIRE', 84, 80);

      ctx.fillStyle = '#9BA3AE';
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText('TRAJECTOIRE-AUTO.FR — LABORATOIRE DU COÛT RÉEL', 84, 102);

      // Date
      const dateStr = new Date().toLocaleDateString('fr-FR');
      ctx.textAlign = 'right';
      ctx.fillStyle = '#6C7582';
      ctx.fillText(`SIMULATION DU ${dateStr}`, W - 56, 84);
      ctx.textAlign = 'left';

      // Titre de la carte
      ctx.fillStyle = '#F2F2EE';
      ctx.font = '800 34px Archivo, Arial, sans-serif';
      ctx.fillText(options.title || 'Bilan Automobile', 56, 162);

      if (options.subtitle) {
        ctx.fillStyle = '#9BA3AE';
        ctx.font = '400 18px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillText(options.subtitle, 56, 194);
      }

      // Verdict principal
      ctx.fillStyle = '#16191D';
      ctx.fillRect(56, 224, W - 112, 108);
      ctx.strokeStyle = '#282D34';
      ctx.strokeRect(56, 224, W - 112, 108);
      ctx.fillStyle = '#E85D04';
      ctx.fillRect(56, 224, 6, 108);

      ctx.fillStyle = '#9BA3AE';
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.fillText((options.verdictLabel || 'VERDICT').toUpperCase(), 84, 258);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.fillText(options.verdictValue || '', 84, 304);

      // Grille KPI (jusqu'à 4 cartes)
      const kpis = options.kpis || [];
      const count = Math.min(kpis.length, 4);
      if (count > 0) {
        const gap = 20;
        const cardW = (W - 112 - gap * (count - 1)) / count;
        kpis.slice(0, 4).forEach((kpi, idx) => {
          const x = 56 + idx * (cardW + gap);
          const y = 360;
          ctx.fillStyle = '#16191D';
          ctx.fillRect(x, y, cardW, 130);
          ctx.strokeStyle = '#282D34';
          ctx.strokeRect(x, y, cardW, 130);

          ctx.fillStyle = '#9BA3AE';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText((kpi.label || '').toUpperCase(), x + 20, y + 36);

          ctx.fillStyle = kpi.color || '#F2F2EE';
          ctx.font = '700 26px "JetBrains Mono", monospace';
          ctx.fillText(kpi.value || '', x + 20, y + 80);

          if (kpi.note) {
            ctx.fillStyle = '#6C7582';
            ctx.font = '400 13px "Plus Jakarta Sans", Arial, sans-serif';
            ctx.fillText(kpi.note, x + 20, y + 108);
          }
        });
      }

      // Note pied de page
      ctx.strokeStyle = '#282D34';
      ctx.beginPath();
      ctx.moveTo(56, 540);
      ctx.lineTo(W - 56, 540);
      ctx.stroke();

      ctx.fillStyle = '#9BA3AE';
      ctx.font = '400 15px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(options.footnote || 'Calcul indépendant réalisé sur trajectoire-auto.fr — Barèmes & tarifs France 2026.', 56, 585);

      ctx.fillStyle = '#E85D04';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.fillText('trajectoire-auto.fr', W - 245, 585);

      Trajectoire.exportCanvasPNG(c, options.filename || 'bilan-trajectoire.png');
    }
  };

  window.Trajectoire = Trajectoire;

  /* ---------------- Navigation Mobile ---------------- */
  function initMobileNav() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const drawer = document.querySelector('[data-nav-mobile]');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', () => {
      setOpen(!drawer.classList.contains('is-open'));
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  }

  /* ---------------- Accordéons FAQ ---------------- */
  function initFAQ() {
    document.querySelectorAll('.faq-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const isOpen = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  /* ---------------- Bandeau Cookies RGPD ---------------- */
  function initCookieBanner() {
    const STORAGE_KEY = 'trajectoire_rgpd_consent_v1';

    let banner = document.getElementById('cookie-banner');
    if (!banner) {
      // Détermine le chemin relatif vers confidentialite.html
      const path = window.location.pathname;
      const inSubdir = /\/(outils|guides)\//.test(path);
      const privacyHref = inSubdir ? '../confidentialite.html' : 'confidentialite.html';

      banner = document.createElement('aside');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Gestion des cookies et de la confidentialité');
      banner.innerHTML = `
        <h4>Confidentialité &amp; Cookies (RGPD)</h4>
        <p>
          Trajectoire utilise des cookies techniques essentiels (mémorisation de vos préférences) ainsi que, avec votre accord, des cookies de mesure d'audience et de publicité Google AdSense pour financer nos calculateurs gratuits.
          <a href="${privacyHref}" style="color:#E85D04;text-decoration:underline;">En savoir plus</a>.
        </p>
        <div class="cookie-actions">
          <button type="button" class="btn btn-primary btn-sm" data-cookie-accept>Tout accepter</button>
          <button type="button" class="btn btn-secondary btn-sm" data-cookie-refuse>Continuer sans accepter</button>
        </div>
      `;
      document.body.appendChild(banner);
    }

    function saveChoice(status) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          status,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // Ignorer si stockage bloqué
      }
      banner.classList.remove('is-visible');
    }

    let existing = null;
    try {
      existing = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      existing = null;
    }

    if (!existing) {
      banner.classList.add('is-visible');
    }

    const acceptBtn = banner.querySelector('[data-cookie-accept]');
    const refuseBtn = banner.querySelector('[data-cookie-refuse]');
    if (acceptBtn) acceptBtn.addEventListener('click', () => saveChoice('accepted'));
    if (refuseBtn) refuseBtn.addEventListener('click', () => saveChoice('refused'));

    // Bouton réouverture depuis le footer
    document.querySelectorAll('[data-open-cookie-settings]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        banner.classList.add('is-visible');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initFAQ();
    initCookieBanner();
  });
})();
