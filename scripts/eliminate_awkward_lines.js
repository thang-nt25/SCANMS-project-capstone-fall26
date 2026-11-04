const fs = require('fs');

// 1. Update MarketplaceShortcuts.css
const shortcutsCss = `@reference "../../index.css";
.marketplace-shortcuts {
  @apply [border:0]!;
  @apply [background:transparent]!;
}
.marketplace-shortcuts__items {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:12px];
  @apply [max-width:1200px];
  @apply [margin:0_auto];
  @apply [padding:0];
}
.marketplace-shortcuts__item {
  @apply relative;
  @apply flex;
  @apply [min-width:0];
  @apply [min-height:30px];
  @apply items-center;
  @apply justify-center;
  @apply [gap:6px];
  @apply [border:0];
  @apply [background:transparent];
  @apply [padding:4px_12px];
  @apply [color:#6B5E4B];
  @apply [font-size:12px];
  @apply [font-weight:550];
  @apply [line-height:1.4];
  @apply [text-decoration:none];
  @apply [border-radius:8px];
  @apply transition-colors;
  @apply cursor-pointer;
}
.marketplace-shortcuts__item:hover {
  @apply [color:#1A1612];
  @apply [background:rgba(215,202,185,0.45)];
}
.marketplace-shortcuts__item[aria-current] {
  @apply [color:#8C6226];
  @apply [font-weight:650];
  @apply [background:rgba(215,202,185,0.6)];
}
.marketplace-shortcuts__item svg {
  @apply [flex-shrink:0];
  @apply [color:#B88E4F];
  @apply [stroke-width:1.7];
}
.marketplace-shortcuts__item::after {
  @apply hidden;
}
.marketplace-shortcuts[data-compact="true"] .marketplace-shortcuts__item {
  @apply [min-height:28px];
}
@media (max-width: 640px) {
  .marketplace-shortcuts__items {
    @apply [gap:6px];
  }
  .marketplace-shortcuts__item {
    @apply [min-height:28px];
    @apply [padding:4px_8px];
    @apply [font-size:11px];
  }
  .marketplace-shortcuts__item svg {
    @apply [width:14px];
    @apply [height:14px];
  }
}
`;
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', shortcutsCss, 'utf8');

// 2. Update PublicHeader.css to ensure inner header has no borders in marketplace layout and navigation top: 0
let publicHeaderCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');
publicHeaderCss = publicHeaderCss.replace(
  '.public-commerce-header--marketplace { @apply [background:#ECE5D8]!; }',
  '.public-commerce-header--marketplace { @apply [background:#ECE5D8]!; @apply [border-bottom:0]!; @apply [box-shadow:none]!; }'
);
publicHeaderCss = publicHeaderCss.replace(
  '.public-commerce-header--marketplace .public-commerce-header__navigation { @apply [grid-column:2]; @apply [grid-row:3]; @apply [min-width:0]; @apply relative; @apply [top:6px]; }',
  '.public-commerce-header--marketplace .public-commerce-header__navigation { @apply [grid-column:2]; @apply [grid-row:3]; @apply [min-width:0]; @apply relative; @apply [top:0]; }'
);
publicHeaderCss = publicHeaderCss.replace(
  '.public-commerce-header--marketplace .marketplace-shortcuts { @apply [border:0]; @apply [background:transparent]; }',
  '.public-commerce-header--marketplace .marketplace-shortcuts { @apply [border:0]!; @apply [background:transparent]!; @apply [box-shadow:none]!; }'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', publicHeaderCss, 'utf8');

// 3. Update PublicHeader.tsx: When isMarketplace is true, do not add border-b-2 or shadow
let publicHeader = fs.readFileSync('frontend/src/components/layout/PublicHeader.tsx', 'utf8');
publicHeader = publicHeader.replace(
  '${isMarketplace ? \'public-commerce-header--marketplace\' : \'\'}',
  '${isMarketplace ? \'public-commerce-header--marketplace !border-b-0 !shadow-none\' : \'\'}'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.tsx', publicHeader, 'utf8');

// 4. Update MarketplaceProductCard.tsx: Remove border-t above price
let productCard = fs.readFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', 'utf8');
productCard = productCard.replace(
  'className="mt-auto flex flex-wrap items-baseline gap-x-2 border-t border-[#DFD6C5] pt-3"',
  'className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2"'
);
productCard = productCard.replace(
  'className="mt-auto flex flex-wrap items-baseline gap-x-2 border-t border-[#EAE4D7] pt-3"',
  'className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2"'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', productCard, 'utf8');

// 5. Update MarketplacePage.tsx: Remove border-t on catalog section
let page = fs.readFileSync('frontend/src/pages/public/MarketplacePage.tsx', 'utf8');
page = page.replace('lg:py-9 border-t border-[#DFD6C5]"', 'lg:py-9"');
fs.writeFileSync('frontend/src/pages/public/MarketplacePage.tsx', page, 'utf8');

console.log('Successfully eliminated all awkward horizontal lines and border clashes!');
