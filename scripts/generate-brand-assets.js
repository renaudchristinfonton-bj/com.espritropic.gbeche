/**
 * GBECHE — Générateur des assets de marque.
 *
 * Le logo est dessiné en géométrie vectorielle pure (aucune génération
 * d'image) : un blason (défense de sa vie), une pulsation ECG (la vie,
 * « GBECHE » = ma vie en fon), et une étoile de grade (progression,
 * victoires). Le script émet les sources SVG dans assets/brand puis
 * rasterise tous les PNG requis par Expo (icône, adaptive Android,
 * favicon, splash, monochrome) via @resvg/resvg-js.
 *
 * Recette : node scripts/generate-brand-assets.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.resolve(__dirname, '..');
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');
const IMG_DIR = path.join(ROOT, 'assets', 'images');

const NAVY = '#070911';
const NAVY_2 = '#111525';
const CYAN = '#00E5FF';
const GREEN = '#00FF88';
const GOLD = '#FFD700';

// ─── Géométrie partagée (viewBox 1024) ────────────────────
const SHIELD_PATH =
  'M262 214 H762 Q782 214 782 234 V520 ' +
  'C782 642 700 738 540 806 Q512 818 484 806 ' +
  'C324 738 242 642 242 520 V234 Q242 214 262 214 Z';

const PULSE_PATH = 'M332 524 H402 L438 434 L488 614 L538 464 L568 524 H692';

function starPoints(cx, cy, outerR, innerR, points = 5) {
  const coords = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    coords.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return coords.join(' ');
}

const GRADIENT_DEFS = `
  <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${CYAN}"/>
    <stop offset="1" stop-color="${GREEN}"/>
  </linearGradient>
  <radialGradient id="bg" cx="0.5" cy="0.32" r="0.92">
    <stop offset="0" stop-color="${NAVY_2}"/>
    <stop offset="1" stop-color="${NAVY}"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE45C"/>
    <stop offset="1" stop-color="${GOLD}"/>
  </linearGradient>`;

// Blason seul (fond transparent) — utilisé par toutes les variantes.
function emblemXml({ monochrome = false, scale = 1 } = {}) {
  const stroke = monochrome ? '#FFFFFF' : 'url(#neonStroke)';
  const starFill = monochrome ? '#FFFFFF' : 'url(#gold)';
  return `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="${SHIELD_PATH}" fill="${monochrome ? 'none' : 'rgba(0,229,255,0.06)'}"
      stroke="${stroke}" stroke-width="34" stroke-linejoin="round"/>
    <path d="${SHIELD_PATH}" fill="none"
      stroke="${monochrome ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.16)'}"
      stroke-width="10" stroke-linejoin="round"
      transform="translate(512 512) scale(0.84) translate(-512 -512)"/>
    <polygon points="${starPoints(512, 330, 54, 23)}" fill="${starFill}"/>
    <path d="${PULSE_PATH}" fill="none" stroke="${stroke}"
      stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function svgXml(body, defs = GRADIENT_DEFS, size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs>${defs}</defs>${body}
</svg>`;
}

// ─── Sources SVG livrées dans le dépôt ─────────────────────
const iconMaster = svgXml(`
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${emblemXml({ scale: 0.94 })}
`);

const emblemOnly = svgXml(emblemXml({ scale: 0.94 }));

const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" width="1280" height="400">
  <defs>${GRADIENT_DEFS}</defs>
  <g transform="translate(200 200) scale(0.34) translate(-512 -512)">${emblemXml({ scale: 0.94 })}</g>
  <text x="430" y="218" font-family="Arial, Helvetica, sans-serif" font-size="118"
    font-weight="800" letter-spacing="10" fill="#EEF0FF">GBECHE</text>
  <text x="434" y="292" font-family="Arial, Helvetica, sans-serif" font-size="40"
    font-weight="600" letter-spacing="6" fill="${CYAN}">MA VIE · MON COMBAT</text>
</svg>`;

// ─── Variantes adaptatives ─────────────────────────────────
// Avant-plan Android : contenu dans la zone sûre des 66 % centraux.
const foreground = svgXml(emblemXml({ scale: 0.7 }));
const background = svgXml(`<rect width="1024" height="1024" fill="url(#bg)"/>`);
const monochrome = svgXml(emblemXml({ monochrome: true, scale: 0.92 }));
// Splash : emblème sur fond transparent (le splash fournit déjà le fond navy).
const splash = svgXml(emblemXml({ scale: 0.62 }));

fs.mkdirSync(BRAND_DIR, { recursive: true });
fs.writeFileSync(path.join(BRAND_DIR, 'icon-master.svg'), iconMaster);
fs.writeFileSync(path.join(BRAND_DIR, 'emblem.svg'), emblemOnly);
fs.writeFileSync(path.join(BRAND_DIR, 'wordmark.svg'), wordmark);
fs.writeFileSync(path.join(BRAND_DIR, 'android-foreground.svg'), foreground);
fs.writeFileSync(path.join(BRAND_DIR, 'android-background.svg'), background);
fs.writeFileSync(path.join(BRAND_DIR, 'android-monochrome.svg'), monochrome);

// ─── Rasterisation ─────────────────────────────────────────
function render(svg, file, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: undefined,
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(IMG_DIR, file), png);
  console.log(`✓ assets/images/${file} (${size}px, ${png.length} octets)`);
}

render(iconMaster, 'icon.png', 1024);
render(iconMaster, 'favicon.png', 48);
render(background, 'android-icon-background.png', 512);
render(foreground, 'android-icon-foreground.png', 512);
render(monochrome, 'android-icon-monochrome.png', 432);
render(splash, 'splash-icon.png', 1024);

console.log('Génération des assets de marque terminée.');
