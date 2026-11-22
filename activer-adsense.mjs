/**
 * Script d'activation globale Google AdSense + ads.txt sur les 10 sites de la flotte
 *
 * Usage :
 *   node activer-adsense.mjs ca-pub-1234567890123456
 */
import fs from 'node:fs';
import path from 'node:path';
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

const rawId = (process.argv[2] || '').trim();
if (!/^ca-pub-\d{10,20}$/.test(rawId)) {
  console.log('\nUsage : node activer-adsense.mjs ca-pub-XXXXXXXXXXXXXXXX');
  console.log('Exemple : node activer-adsense.mjs ca-pub-9876543210987654\n');
  process.exit(1);
}

const pubNum = rawId.replace(/^ca-/, ''); // pub-XXXXXXXXXXXXXXXX
const adsenseHeadTag = `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${rawId}" crossorigin="anonymous"></script>`;
const adsTxtContent = `google.com, ${pubNum}, DIRECT, f08c47fec0942fa0\n`;

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

let updatedPages = 0;

for (const site of SITES) {
  const siteDir = path.join(__dirname, site);
  if (!fs.existsSync(siteDir)) continue;

  // 1. Créer ads.txt à la racine du site
  fs.writeFileSync(path.join(siteDir, 'ads.txt'), adsTxtContent, 'utf8');

  // 2. Injecter la balise officielle Google AdSense dans le <head> de chaque page HTML
  const htmlFiles = walk(siteDir).filter((f) => f.endsWith('.html'));
  for (const htmlFile of htmlFiles) {
    let html = fs.readFileSync(htmlFile, 'utf8');
    // Supprimer une ancienne balise AdSense si déjà présente
    html = html.replace(/\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
    html = html.replace('</head>', `${adsenseHeadTag}\n</head>`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    updatedPages++;
  }
}

console.log(`\n✅ Google AdSense (${rawId}) activé sur les 10 sites (${updatedPages} pages HTML mises à jour + 10 fichiers ads.txt générés).\n`);
