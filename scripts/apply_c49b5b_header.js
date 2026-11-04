const fs = require('fs');

const GOLD_COLOR = '#C49B5B';
const BORDER_COLOR = '#B88E4F';

// 1. MarketplaceHeader.tsx
let mh = fs.readFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', 'utf8');
mh = mh.replace(/bg-\[#ECE5D8\]/g, `bg-[${GOLD_COLOR}]`);
mh = mh.replace(/border-\[#DFD6C5\]/g, `border-[${BORDER_COLOR}]`);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', mh, 'utf8');

// 2. PublicHeader.tsx
let ph = fs.readFileSync('frontend/src/components/layout/PublicHeader.tsx', 'utf8');
ph = ph.replace(/bg-\[#ECE5D8\]/g, `bg-[${GOLD_COLOR}]`);
ph = ph.replace(/border-\[#DFD6C5\]/g, `border-[${BORDER_COLOR}]`);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.tsx', ph, 'utf8');

// 3. Topbar.tsx
let tb = fs.readFileSync('frontend/src/components/layout/Topbar.tsx', 'utf8');
tb = tb.replace(/bg-\[#ECE5D8\]/g, `bg-[${GOLD_COLOR}]`);
tb = tb.replace(/border-\[#DFD6C5\]/g, `border-[${BORDER_COLOR}]`);
fs.writeFileSync('frontend/src/components/layout/Topbar.tsx', tb, 'utf8');

// 4. PublicHeader.css
let phCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');
phCss = phCss.replace(/\[background:#ECE5D8\]!/g, `[background:${GOLD_COLOR}]!`);
phCss = phCss.replace(/\.public-commerce-header__tracking:hover, \.public-commerce-header__cart:hover \{ @apply \[background:#E2D9C8\]; \}/g,
  `.public-commerce-header__tracking:hover, .public-commerce-header__cart:hover { @apply [background:rgba(0,0,0,0.08)]; }`
);
phCss = phCss.replace(/\.public-commerce-header__tracking svg, \.public-commerce-header__cart svg \{ @apply \[color:#b88e4f\]; @apply \[stroke-width:1.7\]; \}/g,
  `.public-commerce-header__tracking svg, .public-commerce-header__cart svg { @apply [color:#1A1612]; @apply [stroke-width:1.7]; }`
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', phCss, 'utf8');

// 5. MarketplaceShortcuts.css
let scCss = fs.readFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', 'utf8');
scCss = scCss.replace(/@apply \[color:#6B5E4B\];/g, '@apply [color:#1A1612]; @apply [font-weight:600];');
scCss = scCss.replace(/@apply \[background:rgba\(215,202,185,0\.45\)\];/g, '@apply [background:rgba(255,255,255,0.22)];');
scCss = scCss.replace(/@apply \[color:#8C6226\];\s*@apply \[font-weight:650\];\s*@apply \[background:rgba\(215,202,185,0\.6\)\];/g,
  '@apply [color:#1A1612]; @apply [font-weight:700]; @apply [background:rgba(255,255,255,0.35)];'
);
scCss = scCss.replace(/@apply \[color:#B88E4F\];\s*@apply \[stroke-width:1.7\];/g,
  '@apply [color:#1A1612]; @apply [stroke-width:1.7];'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', scCss, 'utf8');

console.log('Applied exact color #C49B5B to header and fine-tuned contrast elements!');
