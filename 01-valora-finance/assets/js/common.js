/* ==========================================================================
   VALORA FINANCE — Utilitaires communs, Navigation, FAQ, RGPD Cookies & Canvas
   ========================================================================== */

(function (window, document) {
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

  const nfInt = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  });

  function formatEUR(value) {
    if (!Number.isFinite(value)) return '0 €';
    return nfEUR.format(Math.round(value));
  }

  function formatEURDec(value) {
    if (!Number.isFinite(value)) return '0,00 €';
    return nfEURDec.format(value);
  }

  function formatSignedEUR(value) {
    if (!Number.isFinite(value)) return '0 €';
    const sign = value > 0 ? '+' : '';
    return sign + nfEUR.format(Math.round(value));
  }

  function formatPercent(value, decimals) {
    const d = typeof decimals === 'number' ? decimals : 1;
    if (!Number.isFinite(value)) return '0,0 %';
    return value.toFixed(d).replace('.', ',') + ' %';
  }

  function formatInt(value) {
    if (!Number.isFinite(value)) return '0';
    return nfInt.format(Math.round(value));
  }

  /* Toast visuel */
  let toastTimer = null;
  function toast(message) {
    let el = document.getElementById('valora-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'valora-toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2800);
  }

  /* Copie presse-papiers avec fallback */
  function copyText(text, successMsg) {
    const msg = successMsg || 'Texte copié dans le presse-papiers.';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(msg);
      }).catch(function () {
        fallbackCopy(text, msg);
      });
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(msg);
    } catch (e) {
      toast('Impossible de copier automatiquement.');
    }
    document.body.removeChild(ta);
  }

  /* Initialisation Canvas Haute Densité (Retina / HD) */
  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: width, height: height };
  }

  /* Téléchargement PNG depuis un élément Canvas */
  function downloadCanvasPNG(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename || 'valora-simulation.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* Navigation mobile */
  function initMobileNav() {
    const btn = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      const isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  /* Accordéons FAQ */
  function initFAQ() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(function (item) {
      const btn = item.querySelector('.faq-q');
      const icon = item.querySelector('.faq-icon');
      if (!btn) return;
      btn.addEventListener('click', function () {
        const open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (icon) icon.textContent = open ? '−' : '+';
      });
    });
  }

  /* Bandeau Cookies RGPD conforme Google AdSense */
  const CONSENT_KEY = 'valora_consent_v1';

  function getConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(prefs) {
    const payload = {
      essential: true,
      analytics: !!prefs.analytics,
      ads: !!prefs.ads,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    } catch (e) {
      /* stockage bloqué */
    }
    document.documentElement.dataset.adConsent = payload.ads ? 'granted' : 'denied';
  }

  function buildCookieBanner() {
    if (document.getElementById('valora-cookie-banner')) return;
    const isSubdir = window.location.pathname.indexOf('/outils/') !== -1 || window.location.pathname.indexOf('/guides/') !== -1;
    const privPath = isSubdir ? '../confidentialite.html' : 'confidentialite.html';

    const banner = document.createElement('aside');
    banner.id = 'valora-cookie-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Gestion des cookies et de la confidentialité');
    banner.innerHTML =
      '<div class="cookie-title">Respect de votre vie privée</div>' +
      '<p class="cookie-text">Valora effectue tous les calculs financiers localement dans votre navigateur. Avec votre accord, des cookies de mesure d\'audience et de publicité non-intrusive (Google AdSense) financent la gratuité des outils. <a href="' + privPath + '">Politique de confidentialité</a>.</p>' +
      '<div class="cookie-prefs" id="valora-cookie-prefs">' +
        '<div class="cookie-check-row"><span><strong>Cookies strictement nécessaires</strong> (préférences)</span><input type="checkbox" checked disabled aria-label="Cookies nécessaires"></div>' +
        '<div class="cookie-check-row"><label for="ck-analytics">Mesure d\'audience agrégée</label><input type="checkbox" id="ck-analytics"></div>' +
        '<div class="cookie-check-row"><label for="ck-ads">Publicité contextuelle / AdSense</label><input type="checkbox" id="ck-ads"></div>' +
      '</div>' +
      '<div class="cookie-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" id="ck-accept">Tout accepter</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" id="ck-refuse">Continuer sans accepter</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="ck-custom">Personnaliser</button>' +
        '<button type="button" class="btn btn-primary btn-sm" id="ck-save" style="display:none;">Enregistrer mes choix</button>' +
      '</div>';

    document.body.appendChild(banner);

    const prefsBox = banner.querySelector('#valora-cookie-prefs');
    const btnCustom = banner.querySelector('#ck-custom');
    const btnSave = banner.querySelector('#ck-save');

    banner.querySelector('#ck-accept').addEventListener('click', function () {
      saveConsent({ analytics: true, ads: true });
      banner.classList.remove('visible');
      toast('Préférences enregistrées.');
    });

    banner.querySelector('#ck-refuse').addEventListener('click', function () {
      saveConsent({ analytics: false, ads: false });
      banner.classList.remove('visible');
      toast('Seuls les cookies essentiels sont actifs.');
    });

    btnCustom.addEventListener('click', function () {
      prefsBox.classList.toggle('open');
      btnSave.style.display = prefsBox.classList.contains('open') ? 'inline-flex' : 'none';
    });

    btnSave.addEventListener('click', function () {
      saveConsent({
        analytics: banner.querySelector('#ck-analytics').checked,
        ads: banner.querySelector('#ck-ads').checked
      });
      banner.classList.remove('visible');
      toast('Vos choix de confidentialité ont été sauvegardés.');
    });
  }

  function initCookies() {
    buildCookieBanner();
    const consent = getConsent();
    const banner = document.getElementById('valora-cookie-banner');
    if (!consent && banner) {
      banner.classList.add('visible');
    } else if (consent) {
      document.documentElement.dataset.adConsent = consent.ads ? 'granted' : 'denied';
    }

    document.querySelectorAll('.js-open-cookies').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (banner) {
          banner.classList.add('visible');
        }
      });
    });
  }

  /* Mini-simulateur interactif du Hero (page d'accueil) */
  function initHeroPreview() {
    const rangeMonthly = document.getElementById('hero-monthly');
    const rangeYears = document.getElementById('hero-years');
    if (!rangeMonthly || !rangeYears) return;

    const outMonthly = document.getElementById('hero-monthly-val');
    const outYears = document.getElementById('hero-years-val');
    const outCash = document.getElementById('hero-cash');
    const outEtf = document.getElementById('hero-etf');
    const outDelta = document.getElementById('hero-delta');

    function update() {
      const m = parseFloat(rangeMonthly.value) || 50;
      const y = parseInt(rangeYears.value, 10) || 10;
      const annualRate = 0.08;
      const r = annualRate / 12;
      const n = y * 12;
      const cash = m * n;
      const grossFV = m * ((Math.pow(1 + r, n) - 1) / r);
      const gain = grossFV - cash;
      const netFV = cash + gain * (1 - 0.172); // PEA > 5 ans (17,2 % PS)
      const delta = netFV - cash;

      outMonthly.textContent = formatEUR(m) + '/mois';
      outYears.textContent = y + ' ans';
      outCash.textContent = formatEUR(cash);
      outEtf.textContent = formatEUR(netFV);
      outDelta.textContent = '+' + formatEUR(delta) + ' d\'intérêts nets (PEA)';
    }

    rangeMonthly.addEventListener('input', update);
    rangeYears.addEventListener('input', update);
    update();
  }

  window.Valora = {
    formatEUR: formatEUR,
    formatEURDec: formatEURDec,
    formatSignedEUR: formatSignedEUR,
    formatPercent: formatPercent,
    formatInt: formatInt,
    toast: toast,
    copyText: copyText,
    setupCanvas: setupCanvas,
    downloadCanvasPNG: downloadCanvasPNG
  };

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initFAQ();
    initCookies();
    initHeroPreview();
  });
})(window, document);
