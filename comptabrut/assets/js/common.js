/* ==========================================================================
   COMPTABRUT.FR — Utilitaires communs (100 % Local Navigateur)
   ========================================================================== */
(function () {
  'use strict';

  const CB = {
    /**
     * Formate un montant en euros au standard français
     */
    formatEUR(value, decimals = 2) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '0,00 €';
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n);
    },

    /**
     * Formate un nombre simple au standard français
     */
    formatNumber(value, decimals = 2) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '0';
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n);
    },

    /**
     * Formate un pourcentage
     */
    formatPct(value, decimals = 1) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '0 %';
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(n) + ' %';
    },

    /**
     * Échappe le HTML pour affichage sécurisé
     */
    escapeHTML(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * Affiche une notification toast discrète
     */
    toast(message) {
      let el = document.getElementById('cb-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cb-toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      el.textContent = message;
      el.classList.add('is-visible');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => {
        el.classList.remove('is-visible');
      }, 2600);
    },

    /**
     * Copie un texte dans le presse-papiers
     */
    async copyText(text, label = 'Copié dans le presse-papiers') {
      try {
        await navigator.clipboard.writeText(text);
        CB.toast(label);
      } catch (_err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        CB.toast(label);
      }
    },

    /**
     * Exporte un élément Canvas HTML5 en fichier PNG téléchargeable
     */
    exportCanvasPNG(canvas, filename = 'comptabrut-graphique.png') {
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      CB.toast('Graphique exporté en PNG');
    },

    /**
     * Formate un texte XML avec indentation propre
     */
    formatXML(xmlStr) {
      const cleaned = xmlStr.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
      let pad = 0;
      return cleaned
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          let indent = 0;
          if (/^<\/\w/.test(trimmed)) {
            if (pad > 0) pad -= 1;
          } else if (/^<\w[^>]*[^/]>.*$/.test(trimmed) && !/<\/\w[^>]*>$/.test(trimmed)) {
            indent = 1;
          }
          const out = '  '.repeat(pad) + trimmed;
          pad += indent;
          return out;
        })
        .filter(Boolean)
        .join('\n');
    }
  };

  window.ComptaBrut = CB;

  /**
   * Initialise le tiroir de navigation mobile
   */
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

  /**
   * Initialise les accordéons FAQ accessibles
   */
  function initFAQ() {
    document.querySelectorAll('.faq-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq-item');
        if (!item) return;
        const isOpen = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  /**
   * Initialise le bandeau cookies RGPD conforme AdSense
   */
  function initCookieBanner() {
    const STORAGE_KEY = 'comptabrut_cookie_consent_v1';
    const saved = localStorage.getItem(STORAGE_KEY);

    let banner = document.getElementById('cookie-banner');
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner no-print';
      banner.setAttribute('aria-label', 'Gestion des cookies');
      const isSubdir = /\/(outils|guides)\//.test(window.location.pathname);
      const privacyHref = isSubdir ? '../confidentialite.html' : 'confidentialite.html';
      banner.innerHTML = `
        <h4>Confidentialité &amp; calcul 100 % local</h4>
        <p>Tous vos calculs, factures, fichiers PDF/XML Factur-X, IBAN et SIREN restent exclusivement dans votre navigateur. Ce site utilise uniquement un stockage local technique et des emplacements publicitaires AdSense soumis à votre choix. <a href="${privacyHref}">En savoir plus</a>.</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary btn-sm" id="cookie-accept">Accepter</button>
          <button type="button" class="btn btn-secondary btn-sm" id="cookie-decline">Refuser les cookies pub</button>
        </div>
      `;
      document.body.appendChild(banner);
    }

    if (!saved) {
      banner.classList.add('is-visible');
    }

    const acceptBtn = document.getElementById('cookie-accept');
    const declineBtn = document.getElementById('cookie-decline');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ads: true, date: new Date().toISOString() }));
        banner.classList.remove('is-visible');
        CB.toast('Préférences enregistrées');
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ads: false, date: new Date().toISOString() }));
        banner.classList.remove('is-visible');
        CB.toast('Cookies publicitaires refusés');
      });
    }

    document.querySelectorAll('[data-open-cookies]').forEach((el) => {
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
