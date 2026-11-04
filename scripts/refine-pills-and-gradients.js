const fs = require('fs');
const path = require('path');

// 1. Update PublicHeader.css
const publicHeaderCssPath = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.css');
let headerCss = fs.readFileSync(publicHeaderCssPath, 'utf8');

const oldSearchFormRules = /\/\* Base Search Box adjustments \*\/[\s\S]*?\.public-commerce-header \.product-search-submit \{[\s\S]*?\}/;
const newSearchFormRules = `/* Base Search Box adjustments - Pill-First & Metallic Gold Circle */
.public-commerce-header .product-search-form {
  @apply [min-height:46px];
  @apply [border-radius:9999px]!;
  @apply [border-color:#E5D8C5]!;
  @apply [background:#FFFFFF];
  @apply [padding:4px_6px_4px_14px]!;
  @apply [box-shadow:0_2px_12px_rgba(35,29,21,0.04)];
}
.public-commerce-header .product-search-form:focus-within {
  @apply [border-color:#B88E4F]!;
  @apply [box-shadow:0_0_0_3px_rgba(184,142,79,0.16)]!;
}
.public-commerce-header .product-search-submit {
  @apply [width:38px]!;
  @apply [height:38px]!;
  @apply [border-radius:9999px]!;
  background: linear-gradient(135deg, #B88E4F 0%, #9E7738 100%) !important;
  @apply [border:0]!;
  @apply [color:#FFFFFF]!;
  @apply [box-shadow:0_2px_6px_rgba(184,142,79,0.35)]!;
  @apply transition-transform;
}
.public-commerce-header .product-search-submit:hover {
  transform: scale(1.05);
}
.public-commerce-header .product-search-submit:active {
  transform: scale(0.96);
}
.public-commerce-header .product-search-submit svg {
  @apply [color:#FFFFFF]!;
}`;

headerCss = headerCss.replace(oldSearchFormRules, newSearchFormRules);

// Refine cart button in PublicHeader.css
headerCss = headerCss.replace(
  /\.public-commerce-header__cart\s*\{[\s\S]*?\}/,
  `.public-commerce-header__cart {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:8px];
  @apply [height:44px];
  @apply [min-width:44px];
  @apply [padding:0_18px];
  @apply [border-radius:9999px]!;
  @apply [background:#F6EFE5];
  @apply [border:1px_solid_#E5D8C5];
  @apply [color:#1A1612];
  @apply cursor-pointer;
  @apply transition-all;
  @apply [box-shadow:0_1px_3px_rgba(35,29,21,0.04)];
}`
);

fs.writeFileSync(publicHeaderCssPath, headerCss, 'utf8');
console.log('✓ Updated PublicHeader.css with precise Pill search and submit button');

// 2. Update MarketplaceHero.tsx to use inline style gradient for primary CTA button
const heroPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHero.tsx');
let heroContent = fs.readFileSync(heroPath, 'utf8');

heroContent = heroContent.replace(
  'className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#B88E4F] to-[#8C662D] px-6 text-xs font-bold text-white hover:from-[#A77D3E] hover:to-[#7A5724] shadow-sm transition-all active:scale-[0.98]"',
  'className="inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #B88E4F 0%, #8C662D 100%)" }}'
);

fs.writeFileSync(heroPath, heroContent, 'utf8');
console.log('✓ Updated MarketplaceHero.tsx CTA gradient');
