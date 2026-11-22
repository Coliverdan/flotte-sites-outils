import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITES = [
  'valora',
  'chrononet',
  'dossierpur',
  'cabineok',
  'wattclair',
  'trajectoire',
  'pattesclaires',
  'tablelibre',
  'comptabrut',
  'voixnette',
];

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

let totalHtml = 0;
let totalTools = 0;
let totalJs = 0;
let totalErrors = 0;

for (const site of SITES) {
  const siteDir = path.join(__dirname, site);
  const issues = [];
  if (!fs.existsSync(siteDir)) {
    console.log(`[MISSING] ${site}`);
    totalErrors++;
    continue;
  }

  const files = walk(siteDir);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const toolPages = htmlFiles.filter((f) => f.includes(`${path.sep}outils${path.sep}`));
  const guidePages = htmlFiles.filter((f) => f.includes(`${path.sep}guides${path.sep}`));

  totalHtml += htmlFiles.length;
  totalTools += toolPages.length;
  totalJs += jsFiles.length;

  // Required root files
  for (const req of ['index.html', 'a-propos.html', 'mentions-legales.html', 'confidentialite.html', 'contact.html', 'sitemap.xml', 'robots.txt']) {
    if (!fs.existsSync(path.join(siteDir, req))) {
      issues.push(`Missing required file: ${req}`);
    }
  }

  // CSS design rules check (no Inter, no gradient)
  for (const css of cssFiles) {
    const content = fs.readFileSync(css, 'utf8');
    if (/\bInter\b/i.test(content)) issues.push(`CSS contains forbidden 'Inter' font: ${path.relative(siteDir, css)}`);
    if (/(linear|radial|conic)-gradient\s*\(/i.test(content)) {
      issues.push(`CSS contains forbidden gradient: ${path.relative(siteDir, css)}`);
    }
  }

  // JS syntax check
  for (const js of jsFiles) {
    try {
      execFileSync(process.execPath, ['--check', js], { stdio: 'pipe' });
    } catch (err) {
      issues.push(`JS syntax error in ${path.relative(siteDir, js)}: ${err.stderr?.toString().trim()}`);
    }
  }

  // HTML links, JSON-LD, Inter font check
  for (const html of htmlFiles) {
    const content = fs.readFileSync(html, 'utf8');
    const relHtml = path.relative(siteDir, html);

    if (/family=Inter/i.test(content)) {
      issues.push(`HTML loads forbidden Google Font 'Inter': ${relHtml}`);
    }

    // Validate JSON-LD blocks
    const ldMatches = [...content.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      try {
        JSON.parse(m[1]);
      } catch (e) {
        issues.push(`Invalid JSON-LD in ${relHtml}: ${e.message}`);
      }
    }

    // Check local href/src links
    const attrMatches = [...content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)];
    for (const m of attrMatches) {
      const target = m[1].trim();
      if (
        !target ||
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.startsWith('tel:') ||
        target.startsWith('#') ||
        target.startsWith('data:') ||
        target.startsWith('javascript:')
      ) {
        continue;
      }
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      const resolved = cleanTarget.startsWith('/')
        ? path.join(siteDir, cleanTarget)
        : path.resolve(path.dirname(html), cleanTarget);
      if (!fs.existsSync(resolved)) {
        issues.push(`Broken link in ${relHtml} -> ${target}`);
      }
    }
  }

  const status = issues.length === 0 ? 'OK' : `WARN (${issues.length})`;
  console.log(`[${status}] ${site} | ${htmlFiles.length} HTML (${toolPages.length} outils, ${guidePages.length} guides) | ${jsFiles.length} JS | ${cssFiles.length} CSS`);
  for (const i of issues) {
    console.log(`   - ${i}`);
    totalErrors++;
  }
}

console.log(`\n=== RÉSUMÉ FLOTTE : ${SITES.length} sites | ${totalHtml} pages HTML | ${totalTools} pages outils | ${totalJs} scripts JS | ${totalErrors} problème(s) ===`);
process.exit(totalErrors > 0 ? 1 : 0);
