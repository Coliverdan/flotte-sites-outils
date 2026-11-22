/* ==========================================================================
   CHRONONET — Utilitaires communs, Navigation, RGPD AdSense, FAQ & Export PNG
   ========================================================================== */

(function (global) {
  'use strict';

  const ChronoNet = {};

  /* Formatage monétaire & numérique français */
  ChronoNet.fmtEUR = function (value, decimals = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n);
  };

  ChronoNet.fmtNum = function (value, decimals = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n);
  };

  ChronoNet.fmtPct = function (value, decimals = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0 %';
    return ChronoNet.fmtNum(n, decimals) + ' %';
  };

  ChronoNet.clamp = function (val, min, max) {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  };

  /* Préparation Canvas HiDPI */
  ChronoNet.setupCanvas = function (canvas) {
    if (!canvas) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(260, Math.round(rect.width || 520));
    const height = Math.max(180, Math.round(rect.height || 240));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  };

  /* Helper export PNG depuis un Canvas */
  ChronoNet.downloadCanvasPNG = function (canvas, filename) {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename || 'chrononet-bilan.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* Toast de confirmation */
  ChronoNet.toast = function (message) {
    let el = document.getElementById('cn-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cn-toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove('show');
    }, 2800);
  };

  /* Navigation mobile */
  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const drawer = document.querySelector('[data-nav-mobile]');
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', function () {
      const isOpen = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* Accordéons FAQ */
  function initFAQ() {
    const triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const willOpen = !item.classList.contains('open');
        item.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });
  }

  /* Bandeau Cookies RGPD conforme Google AdSense / Consent Mode v2 */
  const CONSENT_KEY = 'chrononet_rgpd_consent_v1';

  function getConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(accepted) {
    const payload = {
      ad_storage: accepted ? 'granted' : 'denied',
      analytics_storage: accepted ? 'granted' : 'denied',
      ad_user_data: accepted ? 'granted' : 'denied',
      ad_personalization: accepted ? 'granted' : 'denied',
      updated_at: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    } catch (e) {
      /* stockage indisponible */
    }
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', payload);
    }
    return payload;
  }

  function resolvePrivacyPath() {
    const path = window.location.pathname || '';
    if (path.indexOf('/outils/') !== -1 || path.indexOf('/guides/') !== -1) {
      return '../confidentialite.html';
    }
    return 'confidentialite.html';
  }

  function buildCookieBanner() {
    if (document.getElementById('cn-cookie-banner')) return document.getElementById('cn-cookie-banner');
    const banner = document.createElement('aside');
    banner.id = 'cn-cookie-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Préférences de confidentialité et cookies');

    const privacyHref = resolvePrivacyPath();
    banner.innerHTML =
      '<div class="cookie-title">RGPD &amp; Gestion des cookies — ChronoNet</div>' +
      '<p class="cookie-text">ChronoNet effectue 100 % des calculs localement dans votre navigateur. Avec votre accord, nous utilisons des traceurs publicitaires (Google AdSense) et de mesure d\'audience pour financer la gratuité des simulateurs. ' +
      '<a href="' + privacyHref + '">Politique de confidentialité</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cookie-accept>Tout accepter</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cookie-reject>Refuser tout</button>' +
      '</div>';

    document.body.appendChild(banner);

    banner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
      saveConsent(true);
      banner.classList.remove('visible');
      ChronoNet.toast('Préférences enregistrées : cookies autorisés.');
    });

    banner.querySelector('[data-cookie-reject]').addEventListener('click', function () {
      saveConsent(false);
      banner.classList.remove('visible');
      ChronoNet.toast('Préférences enregistrées : cookies non essentiels refusés.');
    });

    return banner;
  }

  function initCookies() {
    const banner = buildCookieBanner();
    if (!getConsent()) {
      banner.classList.add('visible');
    }
    document.querySelectorAll('[data-open-cookies]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        banner.classList.add('visible');
      });
    });
  }

  /* Synchronisation input nombre + range slider */
  ChronoNet.bindPair = function (rangeEl, numEl, onChange) {
    if (!rangeEl || !numEl) return;
    rangeEl.addEventListener('input', function () {
      numEl.value = rangeEl.value;
      if (typeof onChange === 'function') onChange();
    });
    numEl.addEventListener('input', function () {
      const v = ChronoNet.clamp(numEl.value, Number(rangeEl.min), Number(rangeEl.max));
      rangeEl.value = String(v);
      if (typeof onChange === 'function') onChange();
    });
  };

  /* Initialisation globale */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initFAQ();
    initCookies();
  });

  global.ChronoNet = ChronoNet;
})(window);
