/* ==========================================================================
   CABINEOK — Scripts Communs (Navigation, RGPD, FAQ, Formatage, Export PNG)
   ========================================================================== */
(function () {
  'use strict';

  const COOKIE_KEY = 'cabineok_consent_v1';

  const CabineOK = {
    formatNum(val, decimals = 0) {
      if (Number.isNaN(Number(val))) return '0';
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(Number(val));
    },

    formatEur(val, decimals = 0) {
      if (Number.isNaN(Number(val))) return '0 €';
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(Number(val));
    },

    showToast(message) {
      let toast = document.getElementById('cabineok-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cabineok-toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('is-visible');
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 2800);
    },

    async copyText(text, successMsg = 'Copié dans le presse-papiers.') {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        this.showToast(successMsg);
        return true;
      } catch (err) {
        this.showToast('Impossible de copier automatiquement. Sélectionnez le texte manuellement.');
        return false;
      }
    },

    exportCanvasPNG(canvas, filename) {
      const link = document.createElement('a');
      link.download = filename || 'bilan-cabineok.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Bilan PNG téléchargé.');
    },

    openCookieSettings() {
      const banner = document.getElementById('cookie-banner');
      if (banner) {
        banner.classList.add('is-visible');
      }
    }
  };

  window.CabineOK = CabineOK;

  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const drawer = document.getElementById('mobile-nav');
    if (!toggle || !drawer) return;

    const closeDrawer = () => {
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  function initFaqAccordions() {
    const triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const isOpen = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  function initCookieBanner() {
    const saved = localStorage.getItem(COOKIE_KEY);
    let banner = document.getElementById('cookie-banner');

    if (!banner) {
      const isNested = window.location.pathname.includes('/outils/') || window.location.pathname.includes('/guides/');
      const privacyHref = isNested ? '../confidentialite.html' : 'confidentialite.html';
      banner = document.createElement('aside');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('aria-label', 'Gestion des cookies');
      banner.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px;">' +
        '<strong style="font-family:var(--font-display);font-size:1rem;color:#FFFFFF;">Respect de votre vie privée (RGPD)</strong>' +
        '<span class="iata-pill" style="background:#0047AB;">RGPD</span>' +
        '</div>' +
        '<p>CabineOK utilise des traceurs strictement nécessaires au fonctionnement local de vos calculs et, avec votre accord, des cookies de mesure d’audience et de publicité (Google AdSense) afin de maintenir nos outils gratuits. ' +
        '<a href="' + privacyHref + '" style="color:#FFFFFF;text-decoration:underline;">En savoir plus</a>.</p>' +
        '<div class="cookie-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-cookie-action="accept">Tout accepter</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cookie-action="essential">Continuer sans accepter</button>' +
        '</div>';
      document.body.appendChild(banner);
    }

    if (!saved) {
      banner.classList.add('is-visible');
    }

    banner.querySelectorAll('[data-cookie-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-cookie-action');
        localStorage.setItem(COOKIE_KEY, JSON.stringify({
          choice: choice,
          updatedAt: new Date().toISOString()
        }));
        banner.classList.remove('is-visible');
        CabineOK.showToast(
          choice === 'accept'
            ? 'Préférences cookies enregistrées (tous acceptés).'
            : 'Préférences enregistrées (cookies essentiels uniquement).'
        );
      });
    });

    document.querySelectorAll('[data-open-cookies]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        CabineOK.openCookieSettings();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initFaqAccordions();
    initCookieBanner();
  });
})();
