/**
 * TableLibre — Utilitaires communs
 * Navigation mobile, RGPD cookies, FAQ accordéon, formatage FR/EUR, toast, export PNG
 */
(function () {
  'use strict';

  const COOKIE_KEY = 'tablelibre_cookie_consent_v1';

  const TableLibre = {
    formatEuro(value, decimals = 0) {
      const n = Number.isFinite(Number(value)) ? Number(value) : 0;
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n);
    },

    formatNumber(value, decimals = 0) {
      const n = Number.isFinite(Number(value)) ? Number(value) : 0;
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n);
    },

    formatDateFR(date) {
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    },

    escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    showToast(message) {
      let toast = document.getElementById('tl-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'tl-toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('is-visible');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 2800);
    },

    downloadCanvasPNG(canvas, filename) {
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = filename || 'tablelibre-export.png';
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Image PNG haute résolution téléchargée.');
    },

    copyText(text, successMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast(successMsg || 'Copié dans le presse-papiers.');
        }).catch(() => {
          this._fallbackCopy(text, successMsg);
        });
      } else {
        this._fallbackCopy(text, successMsg);
      }
    },

    _fallbackCopy(text, successMsg) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        this.showToast(successMsg || 'Copié dans le presse-papiers.');
      } catch (e) {
        this.showToast('Impossible de copier automatiquement.');
      }
      document.body.removeChild(ta);
    },

    openCookieSettings() {
      const banner = document.getElementById('tl-cookie-banner');
      if (banner) {
        banner.classList.add('is-visible');
      }
    }
  };

  window.TableLibre = TableLibre;

  function initMobileMenu() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function initFAQ() {
    const triggers = document.querySelectorAll('.faq-item__trigger');
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const isOpen = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(isOpen));
      });
    });
  }

  function initCookieBanner() {
    const existing = localStorage.getItem(COOKIE_KEY);
    let banner = document.getElementById('tl-cookie-banner');
    if (!banner) {
      const rootPrefix = document.body.dataset.root || '';
      banner = document.createElement('aside');
      banner.id = 'tl-cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Préférences de confidentialité');
      banner.innerHTML = `
        <div class="cookie-banner__title">Confidentialité &amp; cookies</div>
        <p class="cookie-banner__text">
          Vos plans de table, budgets et listes restent enregistrés <strong>uniquement sur votre navigateur</strong>.
          Nous utilisons des cookies techniques et, avec votre accord, des cookies de mesure d'audience et publicitaires (Google AdSense) pour financer la gratuité totale de TableLibre.
          <a href="${rootPrefix}confidentialite.html">En savoir plus</a>.
        </p>
        <div class="cookie-banner__actions">
          <button type="button" class="btn btn--primary btn--sm" data-cookie-choice="accepted">Tout accepter</button>
          <button type="button" class="btn btn--secondary btn--sm" data-cookie-choice="essential">Essentiels uniquement</button>
        </div>
      `;
      document.body.appendChild(banner);
    }

    if (!existing) {
      banner.classList.add('is-visible');
    }

    banner.querySelectorAll('[data-cookie-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-cookie-choice');
        localStorage.setItem(COOKIE_KEY, JSON.stringify({
          choice,
          date: new Date().toISOString()
        }));
        banner.classList.remove('is-visible');
        TableLibre.showToast(choice === 'accepted'
          ? 'Préférences enregistrées (cookies acceptés).'
          : 'Préférences enregistrées (cookies essentiels uniquement).');
      });
    });

    document.querySelectorAll('[data-open-cookies]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        TableLibre.openCookieSettings();
      });
    });
  }

  function initYear() {
    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initFAQ();
    initCookieBanner();
    initYear();
  });
})();
