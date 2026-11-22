/* ==========================================================================
   VOIXNETTE — Utilitaires Communs UI, RGPD, Formatage FR & Export
   ========================================================================== */

(function () {
  'use strict';

  const CONSENT_KEY = 'voixnette_consent_v1';

  /**
   * Formate un nombre selon les conventions françaises
   */
  function formatNumber(value, decimals) {
    const d = typeof decimals === 'number' ? decimals : 1;
    if (!Number.isFinite(value)) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    }).format(value);
  }

  /**
   * Formate une valeur en décibels (dBFS)
   */
  function formatDb(dbValue) {
    if (!Number.isFinite(dbValue) || dbValue <= -96) return '-∞ dB';
    const sign = dbValue > 0 ? '+' : '';
    return sign + formatNumber(dbValue, 1) + ' dB';
  }

  /**
   * Formate une durée en secondes vers MM:SS.cc (ou MM:SS)
   */
  function formatTimecode(seconds, withCentiseconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return withCentiseconds ? '00:00.00' : '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    if (withCentiseconds) {
      return mm + ':' + ss + '.' + String(cs).padStart(2, '0');
    }
    return mm + ':' + ss;
  }

  /**
   * Formate une durée lisible en français (ex: 2m 28s ou 14,5 s)
   */
  function formatDurationCompact(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0s';
    if (seconds < 60) {
      return formatNumber(seconds, 1) + ' s';
    }
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m + 'm' + String(s).padStart(2, '0') + 's';
  }

  /**
   * Formate une taille en octets (Ko / Mo)
   */
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return formatNumber(bytes / 1024, 1) + ' Ko';
    return formatNumber(bytes / (1024 * 1024), 2) + ' Mo';
  }

  /**
   * Déclenche le téléchargement immédiat d'un Blob
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 3000);
  }

  /**
   * Exporte un élément Canvas en image PNG HD
   */
  function exportCanvasToPng(canvas, filename) {
    if (!canvas) return;
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (blob) downloadBlob(blob, filename || 'voixnette-export.png');
      }, 'image/png', 1.0);
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename || 'voixnette-export.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Navigation mobile & menu déroulant des outils
   */
  function initNavigation() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mobileDrawer = document.getElementById('mobile-drawer');

    if (menuToggle && mobileDrawer) {
      menuToggle.addEventListener('click', function () {
        const isOpen = mobileDrawer.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }

    const dropdownBtn = document.querySelector('.nav-dropdown-btn');
    const dropdownMenu = document.querySelector('.nav-dropdown-menu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = dropdownMenu.classList.toggle('is-open');
        dropdownBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', function (e) {
        if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
          dropdownMenu.classList.remove('is-open');
          dropdownBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          dropdownMenu.classList.remove('is-open');
          dropdownBtn.setAttribute('aria-expanded', 'false');
          if (mobileDrawer && mobileDrawer.classList.contains('is-open')) {
            mobileDrawer.classList.remove('is-open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          }
        }
      });
    }
  }

  /**
   * Accordéons FAQ accessibles
   */
  function initFaqAccordions() {
    const triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        const item = trigger.closest('.faq-item');
        if (!item) return;
        const willOpen = !item.classList.contains('is-open');
        item.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
    });
  }

  /**
   * Bandeau Cookies RGPD conforme Google AdSense
   */
  function initCookieConsent() {
    const existing = localStorage.getItem(CONSENT_KEY);
    let banner = document.getElementById('cookie-banner');

    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Préférences de confidentialité et cookies');
      banner.innerHTML =
        '<div class="cookie-banner-title">Respect de votre vie privée &amp; cookies</div>' +
        '<p class="cookie-banner-text">' +
        'Tous vos fichiers audio sont traités <strong>100 % localement dans votre navigateur</strong> et ne quittent jamais votre appareil. ' +
        'Ce site utilise des cookies techniques et, avec votre accord, des cookies publicitaires (Google AdSense) pour financer la gratuité des outils.' +
        '</p>' +
        '<div class="cookie-banner-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" id="cookie-accept-all">Tout accepter</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" id="cookie-refuse-all">Continuer sans accepter</button>' +
        '<a class="btn btn-ghost btn-sm" id="cookie-policy-link" href="#">Politique de confidentialité</a>' +
        '</div>';
      document.body.appendChild(banner);
    }

    // Résoudre le chemin relatif vers confidentialite.html selon la profondeur de page
    const isSubdir = /\/(outils|guides)\//.test(window.location.pathname);
    const policyLink = document.getElementById('cookie-policy-link');
    if (policyLink) {
      policyLink.setAttribute('href', isSubdir ? '../confidentialite.html' : 'confidentialite.html');
    }

    function saveChoice(choice) {
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({
          choice: choice,
          updatedAt: new Date().toISOString()
        }));
      } catch (err) {
        // Ignorer si le stockage local est bloqué
      }
      banner.classList.remove('is-visible');
    }

    const acceptBtn = document.getElementById('cookie-accept-all');
    const refuseBtn = document.getElementById('cookie-refuse-all');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        saveChoice('accepted');
      });
    }
    if (refuseBtn) {
      refuseBtn.addEventListener('click', function () {
        saveChoice('essential-only');
      });
    }

    if (!existing) {
      banner.classList.add('is-visible');
    }

    // Boutons "Gérer mes cookies" dans le footer
    const manageBtns = document.querySelectorAll('[data-open-cookie-banner]');
    manageBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        banner.classList.add('is-visible');
      });
    });
  }

  // Exposer l'API globale VoixNetteUI
  window.VoixNetteUI = {
    formatNumber: formatNumber,
    formatDb: formatDb,
    formatTimecode: formatTimecode,
    formatDurationCompact: formatDurationCompact,
    formatBytes: formatBytes,
    downloadBlob: downloadBlob,
    exportCanvasToPng: exportCanvasToPng
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initFaqAccordions();
    initCookieConsent();
  });
})();
