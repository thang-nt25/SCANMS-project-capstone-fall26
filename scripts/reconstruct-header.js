const fs = require('fs');
const path = require('path');

// 1. Update frontend/src/components/marketplace/MarketplaceHeader.tsx
const marketplaceHeaderPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHeader.tsx');
let marketplaceHeaderContent = fs.readFileSync(marketplaceHeaderPath, 'utf8');

marketplaceHeaderContent = marketplaceHeaderContent.replace(
  'className="marketplace-header sticky top-0 z-40 bg-[#C49B5B] border-b border-[#B88E4F] shadow-[0_2px_12px_rgba(35,29,21,0.06)]"',
  'className="marketplace-header sticky top-0 z-40"'
);
fs.writeFileSync(marketplaceHeaderPath, marketplaceHeaderContent, 'utf8');
console.log('Updated MarketplaceHeader.tsx');

// 2. Update frontend/src/components/cart/HeaderCartPreview.tsx
const headerCartPreviewPath = path.join(__dirname, '../frontend/src/components/cart/HeaderCartPreview.tsx');
let headerCartPreviewContent = fs.readFileSync(headerCartPreviewPath, 'utf8');

const oldCartTriggerRegex = /<button ref=\{trigger\} type="button" className="public-commerce-header__cart"[\s\S]*?<ShoppingCart size=\{24\} aria-hidden="true" \/>\s*\{count > 0 && <span className="header-cart-count">\{count > 99 \? '99\+' : count\}<\/span>\}\s*<\/button>/;

const newCartTrigger = `<button ref={trigger} type="button" className="public-commerce-header__cart" aria-label="Giỏ hàng"
      aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog"
      onPointerEnter={event => { if (event.pointerType === 'mouse') show(); }}
      onPointerLeave={closeSoon}
      onFocus={() => { if (!restoringFocus.current) show(); }}
      onBlur={closeSoon}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); hide(); }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          show();
          requestAnimationFrame(() => panel.current?.querySelector<HTMLAnchorElement>('a')?.focus());
        }
      }}
      onClick={() => { hide(); onOpenCart(); }}>
      <span className="relative inline-flex items-center justify-center">
        <ShoppingCart size={20} aria-hidden="true" className="text-[#1A1612]" />
        {count > 0 && <span className="header-cart-count">{count > 99 ? '99+' : count}</span>}
      </span>
      <span className="hidden sm:inline text-[13px] font-semibold text-[#1A1612]">Giỏ hàng</span>
    </button>`;

headerCartPreviewContent = headerCartPreviewContent.replace(oldCartTriggerRegex, newCartTrigger);
fs.writeFileSync(headerCartPreviewPath, headerCartPreviewContent, 'utf8');
console.log('Updated HeaderCartPreview.tsx');

// 3. Update frontend/src/components/cart/HeaderCartPreview.css
const headerCartPreviewCssPath = path.join(__dirname, '../frontend/src/components/cart/HeaderCartPreview.css');
let headerCartPreviewCssContent = fs.readFileSync(headerCartPreviewCssPath, 'utf8');

headerCartPreviewCssContent = headerCartPreviewCssContent.replace(
  /\.header-cart-count\s*\{[^}]+\}/,
  `.header-cart-count { @apply absolute; @apply [top:-8px]; @apply [right:-10px]; @apply grid; @apply [min-width:18px]; @apply [height:18px]; @apply place-items-center; @apply [padding:0_4px]; @apply [border:1.5px_solid_#ffffff]; @apply [border-radius:9999px]; @apply [background:#C59B58]!; @apply [color:#ffffff]!; @apply [font-size:10px]; @apply [font-weight:700]; @apply [box-shadow:0_1px_3px_rgba(0,0,0,0.15)]; }`
);
fs.writeFileSync(headerCartPreviewCssPath, headerCartPreviewCssContent, 'utf8');
console.log('Updated HeaderCartPreview.css');

// 4. Update frontend/src/components/marketplace/MarketplaceShortcuts.css
const shortcutsCssPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceShortcuts.css');
const newShortcutsCss = `@reference "../../index.css";
.marketplace-shortcuts {
  @apply [border:0]!;
  @apply [background:transparent]!;
}
.marketplace-shortcuts__items {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:8px];
  @apply [max-width:1200px];
  @apply [margin:0_auto];
  @apply [padding:2px_0];
}
.marketplace-shortcuts__item {
  @apply relative;
  @apply flex;
  @apply [min-width:0];
  @apply [min-height:28px];
  @apply items-center;
  @apply justify-center;
  @apply [gap:6px];
  @apply [border:0];
  @apply [background:transparent];
  @apply [padding:4px_12px];
  @apply [color:#7D715E];
  @apply [font-size:12px];
  @apply [font-weight:600];
  @apply [line-height:1.4];
  @apply [text-decoration:none];
  @apply [border-radius:8px];
  @apply transition-all;
  @apply cursor-pointer;
}
.marketplace-shortcuts__item:hover {
  @apply [color:#1A1612];
  @apply [background:#F3EFE6];
}
.marketplace-shortcuts__item[aria-current] {
  @apply [color:#B88E4F];
  @apply [font-weight:700];
  @apply [background:#FBF5EB];
  @apply [box-shadow:0_1px_2px_rgba(184,142,79,0.08)];
}
.marketplace-shortcuts__item svg {
  @apply [flex-shrink:0];
  @apply [stroke-width:1.8];
}
.marketplace-shortcuts__item::after {
  @apply hidden;
}
.marketplace-shortcuts[data-compact="true"] .marketplace-shortcuts__item {
  @apply [min-height:26px];
  @apply [padding:3px_10px];
}
@media (max-width: 640px) {
  .marketplace-shortcuts__items {
    @apply [gap:4px];
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
fs.writeFileSync(shortcutsCssPath, newShortcutsCss, 'utf8');
console.log('Updated MarketplaceShortcuts.css');
