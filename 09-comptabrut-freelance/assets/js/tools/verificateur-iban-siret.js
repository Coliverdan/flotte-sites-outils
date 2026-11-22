/* ==========================================================================
   COMPTABRUT.FR — Outil 06 : Validateur IBAN / SIREN / SIRET & TVA Intra
   ISO 7064 Mod 97-10 + Clé RIB + Luhn officiel + Formule TVA intracommunautaire
   ========================================================================== */
(function () {
  'use strict';

  const CB = window.ComptaBrut;

  const IBAN_LENGTHS = {
    FR: 27, BE: 16, CH: 21, DE: 22, ES: 24, IT: 27, LU: 20, NL: 18,
    PT: 25, GB: 22, IE: 22, AT: 20, DK: 18, FI: 18, NO: 15, SE: 24,
    PL: 28, MC: 27, GR: 27, CZ: 24, SK: 24, HU: 28, RO: 24, BG: 22
  };

  const COUNTRY_NAMES = {
    FR: 'France', BE: 'Belgique', CH: 'Suisse', DE: 'Allemagne', ES: 'Espagne',
    IT: 'Italie', LU: 'Luxembourg', NL: 'Pays-Bas', PT: 'Portugal', GB: 'Royaume-Uni',
    IE: 'Irlande', AT: 'Autriche', DK: 'Danemark', FI: 'Finlande', NO: 'Norvège',
    SE: 'Suède', PL: 'Pologne', MC: 'Monaco', GR: 'Grèce'
  };

  function mod97(numericString) {
    let remainder = 0;
    for (let i = 0; i < numericString.length; i += 1) {
      remainder = (remainder * 10 + Number(numericString[i])) % 97;
    }
    return remainder;
  }

  function ribLetterToDigit(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) return ch;
    const map = {
      A: '1', J: '1', B: '2', K: '2', S: '2', C: '3', L: '3', T: '3',
      D: '4', M: '4', U: '4', E: '5', N: '5', V: '5', F: '6', O: '6', W: '6',
      G: '7', P: '7', X: '7', H: '8', Q: '8', Y: '8', I: '9', R: '9', Z: '9'
    };
    return map[ch] || '0';
  }

  function validateFrenchRIB(bban) {
    if (!/^[A-Z0-9]{23}$/.test(bban)) return null;
    const banque = bban.slice(0, 5);
    const guichet = bban.slice(5, 10);
    const compteRaw = bban.slice(10, 21);
    const cle = bban.slice(21, 23);

    const compteNum = compteRaw.split('').map(ribLetterToDigit).join('');
    // Calcul modulo 97 sur la concaténation banque + guichet + compte + 00
    const fullStr = banque + guichet + compteNum + '00';
    const expectedCle = 97 - mod97(fullStr);
    const expectedStr = String(expectedCle).padStart(2, '0');

    return {
      banque,
      guichet,
      compte: compteRaw,
      cle,
      expectedCle: expectedStr,
      valid: cle === expectedStr
    };
  }

  function validateIBAN(raw) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 15 || clean.length > 34) {
      return { valid: false, clean, reason: `Longueur invalide (${clean.length} caractères, attendu entre 15 et 34).` };
    }
    const country = clean.slice(0, 2);
    const checkDigits = clean.slice(2, 4);
    const bban = clean.slice(4);

    if (!/^[A-Z]{2}$/.test(country) || !/^\d{2}$/.test(checkDigits)) {
      return { valid: false, clean, country, reason: 'Un IBAN doit commencer par 2 lettres pays suivies de 2 chiffres de contrôle.' };
    }

    const expectedLen = IBAN_LENGTHS[country];
    if (expectedLen && clean.length !== expectedLen) {
      return { valid: false, clean, country, reason: `Un IBAN ${COUNTRY_NAMES[country] || country} doit comporter exactement ${expectedLen} caractères (actuellement ${clean.length}).` };
    }

    // Réarrangement ISO 7064 : BBAN + pays + clé -> conversion lettres A=10..Z=35
    const rearranged = bban + country + checkDigits;
    let numeric = '';
    for (let i = 0; i < rearranged.length; i += 1) {
      const code = rearranged.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        numeric += String(code - 55);
      } else {
        numeric += rearranged[i];
      }
    }

    const rem = mod97(numeric);
    const isValid = rem === 1;
    const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
    const rib = (country === 'FR' || country === 'MC') ? validateFrenchRIB(bban) : null;

    return {
      valid: isValid,
      clean,
      formatted,
      country,
      countryName: COUNTRY_NAMES[country] || country,
      checkDigits,
      bban,
      mod97Result: rem,
      rib,
      reason: isValid ? 'Clé de contrôle ISO 7064 Mod 97-10 exacte (reste = 1).' : `Clé de contrôle invalide (reste Mod 97 = ${rem}, attendu = 1). Vérifiez une éventuelle faute de frappe.`
    };
  }

  /**
   * Algorithme officiel de Luhn pour SIREN (9) et SIRET (14)
   * Gère également l'exception historique La Poste (SIREN 356000000)
   */
  function checkLuhnSirenSiret(digits) {
    if (!/^\d{9}$/.test(digits) && !/^\d{14}$/.test(digits)) return false;

    // Exception officielle INSEE pour les SIRET de La Poste (SIREN 356000000)
    if (digits.length === 14 && digits.startsWith('356000000')) {
      const sum = digits.split('').reduce((acc, d) => acc + Number(d), 0);
      return sum % 5 === 0;
    }

    let sum = 0;
    const len = digits.length;
    for (let i = 0; i < len; i += 1) {
      let n = Number(digits[len - 1 - i]);
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    return sum % 10 === 0;
  }

  function computeFrenchVAT(siren9) {
    const sirenNum = Number(siren9);
    const key = (12 + 3 * (sirenNum % 97)) % 97;
    const keyStr = String(key).padStart(2, '0');
    return {
      key: keyStr,
      compact: `FR${keyStr}${siren9}`,
      spaced: `FR ${keyStr} ${siren9.slice(0, 3)} ${siren9.slice(3, 6)} ${siren9.slice(6, 9)}`
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // --- MODULE 1 : IBAN ---
    const ibanInput = document.getElementById('vk-iban-input');
    const ibanStatus = document.getElementById('vk-iban-status');
    const ibanDetails = document.getElementById('vk-iban-details');
    const ibanCopyBtn = document.getElementById('vk-iban-copy');

    let lastValidIban = '';

    function runIbanCheck() {
      const val = ibanInput.value.trim();
      if (!val) {
        ibanStatus.className = 'callout';
        ibanStatus.innerHTML = 'Saisissez un IBAN ci-dessus (espaces acceptés) pour lancer la vérification locale ISO 7064.';
        ibanDetails.innerHTML = '';
        lastValidIban = '';
        return;
      }

      const res = validateIBAN(val);
      if (res.valid) {
        lastValidIban = res.formatted;
        ibanStatus.className = 'callout callout-ok';
        ibanStatus.innerHTML = `<strong>IBAN VALIDE (${CB.escapeHTML(res.countryName)})</strong> — ${CB.escapeHTML(res.reason)}<br><span class="mono" style="font-size:1.05rem;display:inline-block;margin-top:6px;">${CB.escapeHTML(res.formatted)}</span>`;
      } else {
        lastValidIban = '';
        ibanStatus.className = 'callout callout-danger';
        ibanStatus.innerHTML = `<strong>IBAN INVALIDE</strong> — ${CB.escapeHTML(res.reason)}`;
      }

      let rows = `
        <tr><td>Pays détecté</td><td class="mono">${CB.escapeHTML(res.country || '—')} (${CB.escapeHTML(res.countryName || 'Inconnu')})</td></tr>
        <tr><td>Longueur</td><td class="mono">${res.clean.length} caractères</td></tr>
        <tr><td>Clé contrôle IBAN</td><td class="mono">${CB.escapeHTML(res.checkDigits || '—')} (Mod 97 = ${res.mod97Result ?? '—'})</td></tr>
        <tr><td>BBAN</td><td class="mono">${CB.escapeHTML(res.bban || '—')}</td></tr>
      `;
      if (res.rib) {
        rows += `
          <tr><td>Code banque (FR)</td><td class="mono">${CB.escapeHTML(res.rib.banque)}</td></tr>
          <tr><td>Code guichet</td><td class="mono">${CB.escapeHTML(res.rib.guichet)}</td></tr>
          <tr><td>Numéro de compte</td><td class="mono">${CB.escapeHTML(res.rib.compte)}</td></tr>
          <tr><td>Clé RIB vérifiée</td><td class="mono">${CB.escapeHTML(res.rib.cle)} ${res.rib.valid ? '✓ Valide' : `✕ Attendu ${res.rib.expectedCle}`}</td></tr>
        `;
      }
      ibanDetails.innerHTML = `<div class="table-wrap" style="margin-top:16px;"><table class="data-table"><tbody>${rows}</tbody></table></div>`;
    }

    if (ibanInput) {
      ibanInput.addEventListener('input', runIbanCheck);
      document.getElementById('vk-iban-sample-ok').addEventListener('click', () => {
        ibanInput.value = 'FR76 3000 6000 0112 3456 7890 189';
        runIbanCheck();
      });
      document.getElementById('vk-iban-sample-bad').addEventListener('click', () => {
        ibanInput.value = 'FR76 3000 6000 0112 3456 7890 188';
        runIbanCheck();
      });
      ibanCopyBtn.addEventListener('click', () => {
        if (lastValidIban) CB.copyText(lastValidIban, 'IBAN formaté copié');
        else CB.toast('Aucun IBAN valide à copier');
      });
      runIbanCheck();
    }

    // --- MODULE 2 : SIREN / SIRET & TVA INTRA ---
    const sirenInput = document.getElementById('vk-siren-input');
    const sirenStatus = document.getElementById('vk-siren-status');
    const vatOutput = document.getElementById('vk-vat-output');
    const vatFormula = document.getElementById('vk-vat-formula');
    const sirenDetails = document.getElementById('vk-siren-details');
    const copyVatBtn = document.getElementById('vk-copy-vat');

    let lastVatCompact = '';

    function runSirenCheck() {
      const raw = sirenInput.value.trim();
      const digits = raw.replace(/\D/g, '');

      if (!digits) {
        sirenStatus.className = 'callout';
        sirenStatus.innerHTML = 'Saisissez un SIREN (9 chiffres) ou un SIRET (14 chiffres) pour vérifier sa validité Luhn et générer le numéro de TVA intracommunautaire.';
        vatOutput.textContent = 'FR —';
        vatFormula.textContent = 'Formule : [12 + 3 × (SIREN mod 97)] mod 97';
        sirenDetails.innerHTML = '';
        lastVatCompact = '';
        return;
      }

      if (digits.length !== 9 && digits.length !== 14) {
        sirenStatus.className = 'callout callout-warn';
        sirenStatus.innerHTML = `<strong>Format en cours (${digits.length} chiffres) :</strong> un SIREN comporte exactement 9 chiffres et un SIRET 14 chiffres.`;
        vatOutput.textContent = '—';
        lastVatCompact = '';
        return;
      }

      const isSiret = digits.length === 14;
      const siren9 = digits.slice(0, 9);
      const nic5 = isSiret ? digits.slice(9, 14) : null;

      const sirenValid = checkLuhnSirenSiret(siren9);
      const fullValid = checkLuhnSirenSiret(digits);
      const vat = computeFrenchVAT(siren9);

      if (fullValid && sirenValid) {
        lastVatCompact = vat.compact;
        sirenStatus.className = 'callout callout-ok';
        sirenStatus.innerHTML = `<strong>${isSiret ? 'SIRET' : 'SIREN'} VALIDE (Algorithme de Luhn vérifié)</strong> — Numéro mathématiquement conforme pour facturation B2B / Factur-X 2026.`;
      } else {
        lastVatCompact = '';
        sirenStatus.className = 'callout callout-danger';
        sirenStatus.innerHTML = `<strong>${isSiret ? 'SIRET' : 'SIREN'} INVALIDE</strong> — La clé de contrôle de Luhn échoue${isSiret && !sirenValid ? ' (le SIREN racine de 9 chiffres est également invalide)' : ''}. Ne pas inscrire sur une facture Factur-X.`;
      }

      vatOutput.textContent = vat.spaced;
      vatFormula.textContent = `[12 + 3 × (${siren9} mod 97 = ${Number(siren9) % 97})] mod 97 = clé ${vat.key}`;

      sirenDetails.innerHTML = `
        <div class="table-wrap" style="margin-top:16px;">
          <table class="data-table">
            <tbody>
              <tr><td>Type d’identifiant</td><td class="mono">${isSiret ? 'SIRET (14 chiffres)' : 'SIREN (9 chiffres)'}</td></tr>
              <tr><td>SIREN (Unité légale)</td><td class="mono">${siren9.slice(0, 3)} ${siren9.slice(3, 6)} ${siren9.slice(6, 9)} ${sirenValid ? '✓ Luhn OK' : '✕ Invalide'}</td></tr>
              ${nic5 ? `<tr><td>NIC (Établissement)</td><td class="mono">${nic5}</td></tr>` : ''}
              <tr><td>N° TVA Intracommunautaire (compact)</td><td class="mono"><strong>${vat.compact}</strong></td></tr>
            </tbody>
          </table>
        </div>
      `;
    }

    if (sirenInput) {
      sirenInput.addEventListener('input', runSirenCheck);
      document.getElementById('vk-siren-sample-1').addEventListener('click', () => {
        sirenInput.value = '552 081 317';
        runSirenCheck();
      });
      document.getElementById('vk-siren-sample-2').addEventListener('click', () => {
        sirenInput.value = '732 829 320 00074';
        runSirenCheck();
      });
      copyVatBtn.addEventListener('click', () => {
        if (lastVatCompact) CB.copyText(lastVatCompact, `N° TVA ${lastVatCompact} copié`);
        else CB.toast('Saisissez d’abord un SIREN/SIRET valide');
      });
      runSirenCheck();
    }
  });
})();
