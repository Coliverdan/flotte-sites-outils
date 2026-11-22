/* ==========================================================================
   WATTCLAIR — Utilitaires globaux, Navigation, RGPD, FAQ, Formatage & Export
   ========================================================================== */

(function () {
  'use strict';

  /* Barèmes officiels de référence TRVE EDF (TTC — Base février 2025 / réf. 2026) */
  const EDF_TARIFS = {
    label: 'TRVE EDF TTC (réf. 2025–2026)',
    base: {
      kwh: 0.2016,
      abo: { 6: 164.64, 9: 207.48, 12: 250.44 }
    },
    hchp: {
      hc: 0.1696,
      hp: 0.2146,
      abo: { 6: 168.48, 9: 214.68, 12: 258.72 }
    },
    tempo: {
      bleuHC: 0.1288,
      bleuHP: 0.1552,
      blancHC: 0.1447,
      blancHP: 0.1792,
      rougeHC: 0.1518,
      rougeHP: 0.6586,
      abo: { 6: 167.88, 9: 209.52, 12: 252.12 }
    }
  };

  /* Formatage nombres FR / EUR / kWh */
  const fmtEur = (n, decimals = 2) => {
    if (!Number.isFinite(n)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n);
  };

  const fmtEurRound = (n) => fmtEur(Math.round(n), 0);

  const fmtNum = (n, decimals = 0) => {
    if (!Number.isFinite(n)) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n);
  };

  const fmtKwh = (n, decimals = 0) => `${fmtNum(n, decimals)} kWh`;

  /* Helper Canvas HiDPI */
  function setupCanvas(canvas, logicalWidth, logicalHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(logicalWidth * dpr);
    canvas.height = Math.round(logicalHeight * dpr);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* Export PNG d'un Canvas */
  function exportCanvasPNG(canvas, filename) {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename || 'wattclair-bilan.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* Menu mobile */
  function initMobileNav() {
    const btn = document.getElementById('menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    if (!btn || !drawer) return;

    btn.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        drawer.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* Accordéons FAQ */
  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const trigger = item.querySelector('.faq-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        item.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });
  }

  /* Bandeau Cookies RGPD conforme AdSense */
  const CONSENT_KEY = 'wattclair_rgpd_consent_v1';

  function getConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (_) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (_) {
      /* stockage indisponible */
    }
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('is-visible');
    document.documentElement.dataset.consent = value;
  }

  function initCookies() {
    let banner = document.getElementById('cookie-banner');
    if (!banner) {
      const prefix = document.documentElement.dataset.rootPrefix || '';
      banner = document.createElement('div');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-live', 'polite');
      banner.setAttribute('aria-label', 'Préférences de confidentialité et cookies');
      banner.innerHTML =
        '<h3>Respect de votre vie privée</h3>' +
        '<p>WattClair effectue tous les calculs localement dans votre navigateur. Avec votre accord, des cookies publicitaires (Google AdSense) et de mesure d\'audience agrégée peuvent être déposés pour financer la gratuité des simulateurs. <a href="' + prefix + 'confidentialite.html">En savoir plus</a>.</p>' +
        '<div class="cookie-actions">' +
        '<button type="button" class="btn btn-primary" data-consent="accepted">Accepter</button>' +
        '<button type="button" class="btn btn-secondary" data-consent="refused">Continuer sans accepter</button>' +
        '</div>';
      document.body.appendChild(banner);
    }

    banner.querySelectorAll('[data-consent]').forEach((btn) => {
      btn.addEventListener('click', () => setConsent(btn.getAttribute('data-consent')));
    });

    const saved = getConsent();
    if (!saved) {
      banner.classList.add('is-visible');
    } else {
      document.documentElement.dataset.consent = saved;
    }

    document.querySelectorAll('[data-open-consent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        banner.classList.add('is-visible');
      });
    });
  }

  /* Initialisation globale */
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initFAQ();
    initCookies();
  });

  window.WattClair = {
    EDF_TARIFS,
    fmtEur,
    fmtEurRound,
    fmtNum,
    fmtKwh,
    setupCanvas,
    exportCanvasPNG
  };
})();
