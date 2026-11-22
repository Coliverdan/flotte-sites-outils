/* ==========================================================================
   PattesClaires — Scripts Communs (Navigation, RGPD, FAQ, Formatage, Export PNG)
   ========================================================================== */
(function () {
  'use strict';

  const nfEUR = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });

  const nfEURCents = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const nfInt = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  });

  const nfDec = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  window.PattesUI = {
    formatEUR: function (val, withCents) {
      if (!Number.isFinite(val)) return '0 €';
      return withCents ? nfEURCents.format(val) : nfEUR.format(Math.round(val));
    },

    formatInt: function (val) {
      if (!Number.isFinite(val)) return '0';
      return nfInt.format(Math.round(val));
    },

    formatDecimal: function (val, digits) {
      if (!Number.isFinite(val)) return '0';
      if (typeof digits === 'number') {
        return new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(val);
      }
      return nfDec.format(val);
    },

    setupCanvas: function (canvas, logicalWidth, logicalHeight) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(logicalWidth * dpr);
      canvas.height = Math.round(logicalHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.maxWidth = logicalWidth + 'px';
      canvas.style.aspectRatio = logicalWidth + ' / ' + logicalHeight;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    },

    downloadCanvasPNG: function (canvas, filename) {
      try {
        const link = document.createElement('a');
        link.download = filename || 'pattesclaires-fiche.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toast('Image PNG téléchargée avec succès.');
      } catch (err) {
        this.toast('Impossible de générer le téléchargement sur ce navigateur.');
      }
    },

    toast: function (message) {
      let el = document.getElementById('pc-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pc-toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      el.textContent = message;
      el.classList.add('is-visible');
      clearTimeout(el._timer);
      el._timer = setTimeout(function () {
        el.classList.remove('is-visible');
      }, 3200);
    }
  };

  /* 1. Navigation Mobile */
  function initMobileNav() {
    const btn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    if (!btn || !drawer) return;

    btn.addEventListener('click', function () {
      const isOpen = drawer.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        drawer.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* 2. Accordéons FAQ */
  function initFaqAccordions() {
    const triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        const panelId = trigger.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : trigger.nextElementSibling;
        if (!panel) return;
        const expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        panel.classList.toggle('is-open', !expanded);
      });
    });
  }

  /* 3. Bandeau Cookies RGPD conforme AdSense */
  function initCookieConsent() {
    const KEY = 'pattesclaires_consent_v1';
    const basePrefix = document.body.getAttribute('data-base') || '';

    function createBanner() {
      let banner = document.getElementById('pc-cookie-banner');
      if (banner) return banner;

      banner = document.createElement('div');
      banner.id = 'pc-cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Préférences de confidentialité et cookies');
      banner.innerHTML =
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">' +
        '<div>' +
        '<p style="font-family:var(--font-display);font-weight:700;font-size:1.05rem;margin:0 0 6px;">Respect de votre vie privée</p>' +
        '<p style="font-size:0.9rem;color:var(--text-secondary);margin:0;">PattesClaires fonctionne localement dans votre navigateur. Avec votre accord, nous utilisons des cookies de mesure d’audience et de publicité (Google AdSense) afin de maintenir nos calculateurs gratuits. ' +
        '<a href="' + basePrefix + 'confidentialite.html">Politique de confidentialité</a>.</p>' +
        '</div>' +
        '</div>' +
        '<div class="cookie-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-consent="accepted">Tout accepter</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-consent="essential">Refuser (essentiels uniquement)</button>' +
        '</div>';

      document.body.appendChild(banner);

      banner.querySelectorAll('[data-consent]').forEach(function (b) {
        b.addEventListener('click', function () {
          const choice = b.getAttribute('data-consent');
          try {
            localStorage.setItem(KEY, JSON.stringify({
              status: choice,
              updatedAt: new Date().toISOString()
            }));
          } catch (e) {
            /* Mode navigation privée strict */
          }
          banner.classList.remove('is-visible');
          window.PattesUI.toast(
            choice === 'accepted'
              ? 'Préférences cookies enregistrées (tout accepté).'
              : 'Préférences enregistrées : cookies essentiels uniquement.'
          );
        });
      });

      return banner;
    }

    let stored = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {
      stored = null;
    }

    if (!stored) {
      const banner = createBanner();
      setTimeout(function () {
        banner.classList.add('is-visible');
      }, 400);
    }

    document.querySelectorAll('[data-cookie-settings]').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        const banner = createBanner();
        banner.classList.add('is-visible');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initFaqAccordions();
    initCookieConsent();
  });
})();
