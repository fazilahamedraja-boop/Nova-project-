/**
 * Generates local SVG product images for all catalog items.
 * Run: npm run generate:images
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'products');

const CATEGORY_STYLES = {
  Electronics: { from: '#4f46e5', to: '#7c3aed', accent: '#a5b4fc' },
  Clothing: { from: '#db2777', to: '#e11d48', accent: '#fbcfe8' },
  Home: { from: '#d97706', to: '#ea580c', accent: '#fde68a' },
  Sports: { from: '#059669', to: '#0d9488', accent: '#a7f3d0' },
  Accessories: { from: '#0891b2', to: '#2563eb', accent: '#bae6fd' },
};

const PRODUCT_ICONS = {
  'nova-wireless-headphones': '🎧',
  'smart-fitness-watch-pro': '⌚',
  'organic-cotton-tshirt': '👕',
  'classic-denim-jacket': '🧥',
  'stainless-steel-water-bottle': '🍶',
  'ceramic-coffee-mug-set': '☕',
  'yoga-mat-premium': '🧘',
  'running-shoes-elite': '👟',
  'leather-crossbody-bag': '👜',
  'polarized-sunglasses': '🕶️',
  'bluetooth-speaker-mini': '🔊',
  'laptop-stand-aluminum': '💻',
  'winter-puffer-jacket': '🧥',
  'resistance-bands-set': '🏋️',
  'scented-candle-collection': '🕯️',
  'wireless-charging-pad': '🔋',
  'canvas-sneakers': '👟',
  'leather-wallet-slim': '👛',
  'desk-organizer-set': '🗂️',
  'protein-shaker-bottle': '🥤',
  'mechanical-keyboard-rgb': '⌨️',
  '4k-webcam-pro': '📷',
  'memory-foam-pillow': '🛏️',
  'travel-backpack-40l': '🎒',
  'smart-led-bulb-pack': '💡',
  'mens-running-shorts': '🩳',
  'womens-hiking-boots': '🥾',
  'portable-ssd-1tb': '💾',
  'electric-kettle-glass': '🫖',
  'fitness-jump-rope': '🪢',
  'silk-scarf': '🧣',
  'gaming-mouse-pad-xxl': '🖱️',
  'insulated-lunch-box': '🍱',
  'trail-running-cap': '🧢',
};

function wrapText(text, maxChars = 22) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function generateSvg({ name, slug, category, brand }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Electronics;
  const icon = PRODUCT_ICONS[slug] || '📦';
  const lines = wrapText(name);
  const line1 = lines[0] || name;
  const line2 = lines[1] || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="bg-${slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.from}"/>
      <stop offset="100%" stop-color="${style.to}"/>
    </linearGradient>
    <filter id="shadow-${slug}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="url(#bg-${slug})"/>
  <circle cx="200" cy="155" r="88" fill="${style.accent}" opacity="0.22"/>
  <rect x="72" y="72" width="256" height="256" rx="28" fill="#ffffff" opacity="0.12"/>
  <text x="200" y="175" text-anchor="middle" font-size="88">${icon}</text>
  <text x="200" y="285" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700">${line1}</text>
  ${line2 ? `<text x="200" y="310" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="15" opacity="0.92">${line2}</text>` : ''}
  <text x="200" y="350" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="12" opacity="0.75" letter-spacing="2">${brand.toUpperCase()}</text>
  <rect x="24" y="24" width="72" height="28" rx="14" fill="#ffffff" opacity="0.18"/>
  <text x="60" y="43" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="700">NOVA</text>
</svg>`;
}

function generatePlaceholder() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Product image unavailable">
  <rect width="400" height="400" fill="#e2e8f0"/>
  <text x="200" y="190" text-anchor="middle" font-size="64">📦</text>
  <text x="200" y="250" text-anchor="middle" fill="#64748b" font-family="Segoe UI, Arial, sans-serif" font-size="16">No Image</text>
</svg>`;
}

function main() {
  const seedProducts = require('../server/db/product-catalog');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let count = 0;
  for (const product of seedProducts) {
    const svg = generateSvg(product);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${product.slug}.svg`), svg, 'utf8');
    count++;
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'placeholder.svg'), generatePlaceholder(), 'utf8');
  console.log(`Generated ${count} product images in public/images/products/`);
}

main();
