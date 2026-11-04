const fs = require('fs');
const path = require('path');

console.log('=== STARTING SCANMS LUXURY SAND GOLD THEME TRANSFORMATION ===');

// -----------------------------------------------------------------------------
// 1. Update ProductSearchBox.tsx (Pill shape, Search icon left, Circular Gold Button right)
// -----------------------------------------------------------------------------
const searchBoxPath = path.join(__dirname, '../frontend/src/components/layout/ProductSearchBox.tsx');
let searchBoxContent = fs.readFileSync(searchBoxPath, 'utf8');

// Replace form styling to rounded-full
searchBoxContent = searchBoxContent.replace(
  'className={`product-search-form flex w-full items-center gap-1 rounded-xl border p-[3px] focus-within:border-[#C59B58] ${darkMode ? "border-[#443828] bg-[#2E271E] shadow-inner" : "border-[#DFD6C5] bg-white shadow-xs"}`}',
  'className={`product-search-form flex w-full items-center gap-2 rounded-full border px-3 py-1 focus-within:border-[#B88E4F] ${darkMode ? "border-[#443828] bg-[#2E271E] shadow-inner" : "border-[#E5D8C5] bg-white shadow-[0_2px_10px_rgba(35,29,21,0.04)]"}`}'
);

// Add leading Search icon inside input form
if (!searchBoxContent.includes('product-search-lead-icon')) {
  searchBoxContent = searchBoxContent.replace(
    '<form onSubmit={submit}',
    '<form onSubmit={submit}'
  ).replace(
    '<input ref={input}',
    '<Search size={17} className="product-search-lead-icon text-[#7D715E] shrink-0 ml-1" aria-hidden="true" />\n      <input ref={input}'
  );
}

// Replace submit button with circular metallic gold button
searchBoxContent = searchBoxContent.replace(
  /className=\{`product-search-submit inline-flex h-9 w-\[52px\][^`]+`\}/,
  'className={`product-search-submit inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#B88E4F] to-[#9E7738] text-white hover:scale-105 active:scale-95 transition-all shadow-xs`}'
);

fs.writeFileSync(searchBoxPath, searchBoxContent, 'utf8');
console.log('✓ Updated ProductSearchBox.tsx');

// -----------------------------------------------------------------------------
// 2. Update HeaderCartPreview.tsx (Pill shape with chevron right)
// -----------------------------------------------------------------------------
const cartPreviewPath = path.join(__dirname, '../frontend/src/components/cart/HeaderCartPreview.tsx');
let cartPreviewContent = fs.readFileSync(cartPreviewPath, 'utf8');

// Ensure ChevronRight is imported
if (!cartPreviewContent.includes('ChevronRight')) {
  cartPreviewContent = cartPreviewContent.replace(
    "import { ShoppingBag, ShoppingCart } from 'lucide-react';",
    "import { ShoppingBag, ShoppingCart, ChevronRight } from 'lucide-react';"
  );
}

// Update cart trigger button
const oldCartTriggerRegex = /<button ref=\{trigger\} type="button" className="public-commerce-header__cart"[\s\S]*?<\/button>/;
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
        <ShoppingCart size={19} aria-hidden="true" className="text-[#1A1612]" />
        {count > 0 && <span className="header-cart-count">{count > 99 ? '99+' : count}</span>}
      </span>
      <span className="hidden sm:inline text-xs font-bold text-[#1A1612]">Giỏ hàng</span>
      <ChevronRight size={14} className="text-[#7D715E] hidden sm:inline" />
    </button>`;

cartPreviewContent = cartPreviewContent.replace(oldCartTriggerRegex, newCartTrigger);
fs.writeFileSync(cartPreviewPath, cartPreviewContent, 'utf8');
console.log('✓ Updated HeaderCartPreview.tsx');

// -----------------------------------------------------------------------------
// 3. Update HeaderCartPreview.css
// -----------------------------------------------------------------------------
const cartCssPath = path.join(__dirname, '../frontend/src/components/cart/HeaderCartPreview.css');
let cartCss = fs.readFileSync(cartCssPath, 'utf8');

cartCss = cartCss.replace(
  /\.header-cart-count\s*\{[^}]+\}/,
  `.header-cart-count { @apply absolute; @apply [top:-7px]; @apply [right:-9px]; @apply grid; @apply [min-width:18px]; @apply [height:18px]; @apply place-items-center; @apply [padding:0_4px]; @apply [border:1.5px_solid_#ffffff]; @apply [border-radius:9999px]; @apply [background:#C59B58]!; @apply [color:#ffffff]!; @apply [font-size:10px]; @apply [font-weight:700]; @apply [box-shadow:0_1px_3px_rgba(0,0,0,0.18)]; }`
);
fs.writeFileSync(cartCssPath, cartCss, 'utf8');
console.log('✓ Updated HeaderCartPreview.css');

// -----------------------------------------------------------------------------
// 4. Update MarketplaceShortcuts.tsx & MarketplaceShortcuts.css (4 Tabs with Home)
// -----------------------------------------------------------------------------
const shortcutsPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceShortcuts.tsx');
const shortcutsContent = `import { Link, useLocation } from 'react-router-dom';
import { Home, Radio, Tag, Store } from 'lucide-react';
import './MarketplaceShortcuts.css';

export function MarketplaceShortcuts({ onOpenLive, compact = false }: { onOpenLive: () => void; compact?: boolean }) {
  const location = useLocation();
  const isHome = location.pathname === '/marketplace' && !location.hash;
  const storesActive = location.hash === '#featured-stores';
  const discountsActive = location.pathname === '/search' && new URLSearchParams(location.search).get('discount') === 'true';

  return (
    <nav aria-label="Khám phá SCANMS" className="marketplace-shortcuts" data-compact={compact}>
      <div className="marketplace-shortcuts__items">
        <Link
          to="/marketplace"
          aria-current={isHome ? 'page' : undefined}
          className="marketplace-shortcuts__item"
        >
          <Home size={15} aria-hidden="true" />
          <span>Trang chủ</span>
        </Link>
        <Link
          to="/marketplace#featured-stores"
          aria-current={storesActive ? 'location' : undefined}
          onClick={() => document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="marketplace-shortcuts__item"
        >
          <Store size={15} aria-hidden="true" />
          <span>Gian hàng</span>
        </Link>
        <button
          type="button"
          onClick={onOpenLive}
          className="marketplace-shortcuts__item"
        >
          <Radio size={15} aria-hidden="true" />
          <span>Live KOC</span>
        </button>
        <Link
          to="/search?discount=true&inStock=true"
          aria-current={discountsActive ? 'page' : undefined}
          className="marketplace-shortcuts__item"
        >
          <Tag size={15} aria-hidden="true" />
          <span>Giảm giá</span>
        </Link>
      </div>
    </nav>
  );
}
`;
fs.writeFileSync(shortcutsPath, shortcutsContent, 'utf8');

const shortcutsCssPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceShortcuts.css');
const shortcutsCssContent = `@reference "../../index.css";
.marketplace-shortcuts {
  @apply [border:0]!;
  @apply [background:transparent]!;
}
.marketplace-shortcuts__items {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:2px];
  @apply [background:#FAF5EC];
  @apply [border:1px_solid_#EBDDC8];
  @apply [border-radius:9999px];
  @apply [padding:3px_6px];
  @apply [box-shadow:0_2px_10px_rgba(35,29,21,0.04)];
}
.marketplace-shortcuts__item {
  @apply relative;
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:6px];
  @apply [border:0];
  @apply [background:transparent];
  @apply [padding:4px_14px];
  @apply [color:#7D715E];
  @apply [font-size:12px];
  @apply [font-weight:600];
  @apply [border-radius:9999px];
  @apply transition-all;
  @apply cursor-pointer;
  @apply no-underline;
}
.marketplace-shortcuts__item:hover {
  @apply [color:#1A1612];
  @apply [background:rgba(238,223,198,0.5)];
}
.marketplace-shortcuts__item[aria-current] {
  @apply [color:#1A1612];
  @apply [font-weight:700];
  @apply [background:#FFFFFF];
  @apply [box-shadow:0_1px_4px_rgba(35,29,21,0.08)];
}
.marketplace-shortcuts__item[aria-current]::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 14px;
  right: 14px;
  height: 2px;
  background: #B88E4F;
  border-radius: 2px;
}
.marketplace-shortcuts__item svg {
  @apply [flex-shrink:0];
  @apply [stroke-width:1.8];
}
@media (max-width: 640px) {
  .marketplace-shortcuts__items {
    @apply [gap:1px];
    @apply [padding:2px_4px];
  }
  .marketplace-shortcuts__item {
    @apply [padding:3px_8px];
    @apply [font-size:11px];
  }
  .marketplace-shortcuts__item svg {
    @apply [width:13px];
    @apply [height:13px];
  }
}
`;
fs.writeFileSync(shortcutsCssPath, shortcutsCssContent, 'utf8');
console.log('✓ Updated MarketplaceShortcuts.tsx & MarketplaceShortcuts.css');

// -----------------------------------------------------------------------------
// 5. Update PublicHeader.tsx (Dark Topbar, Divider, Pill Cart)
// -----------------------------------------------------------------------------
const publicHeaderPath = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.tsx');
let publicHeaderContent = fs.readFileSync(publicHeaderPath, 'utf8');

// Ensure Shield, Headphones are imported
if (!publicHeaderContent.includes('Headphones')) {
  publicHeaderContent = publicHeaderContent.replace(
    "import {\n  Package,\n  User,\n} from 'lucide-react';",
    "import {\n  Package,\n  User,\n  Shield,\n  Headphones,\n} from 'lucide-react';"
  );
}

// Replace the Top Bar markup with Dark Obsidian Espresso style
const oldTopBarRegex = /{\/\* TẦNG 1: THANH TIỆN ÍCH THƯỢNG TẦNG[\s\S]*?{\/\* TẦNG 2: THANH TRUNG TÂM THƯƠNG MẠI/;
const newTopBar = `{/* TẦNG 1: THANH TIỆN ÍCH THƯỢNG TẦNG (TOP UTILITY STRIP - DARK OBSIDIAN) */}
      <div className="public-commerce-header__top-bar bg-gradient-to-r from-[#1A130E] via-[#241A13] to-[#2B1E16] border-b border-[#C59B58]/20 text-[#FAF8F5] hidden sm:block relative overflow-hidden">
        {/* Subtle ambient golden wave highlight in top right */}
        <div className="absolute top-0 right-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(197,155,88,0.18)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-[34px] flex items-center justify-between text-xs relative z-10">
          {/* Cụm Bên Trái: Cổng chuyển đổi hệ sinh thái */}
          <div className="flex items-center gap-3 sm:gap-4 font-medium">
            <Link to="/kol/workspace" className="text-[#FAF8F5] hover:text-[#C59B58] transition-colors flex items-center gap-1.5" title="Dành cho Nhà sáng tạo KOC / Đối tác tiếp thị">
              <Shield size={13} className="text-[#C59B58]" />
              <span>Kênh Tiếp Thị KOL</span>
            </Link>
            <span className="text-[#5C4D3C] select-none">|</span>
            <Link to="/shop/dashboard" className="text-[#FAF8F5] hover:text-[#C59B58] transition-colors flex items-center gap-1.5" title="Dành cho Giám đốc Nhãn hàng">
              <span>Cộng Nhãn Hàng Trực Thuộc</span>
            </Link>
          </div>

          {/* Cụm Bên Phải: Tra cứu đơn GHN, Thông báo, Tài khoản/Đăng nhập */}
          <div className="flex items-center gap-3">
            {/* Tra cứu đơn GHN */}
            {showShoppingActions && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenTracking) onOpenTracking();
                  else navigate('/tracking');
                }}
                className="public-commerce-header__tracking-top inline-flex items-center gap-1.5 text-[#FAF8F5] hover:text-[#C59B58] transition-colors cursor-pointer text-xs font-medium"
                title="Tra cứu lộ trình đơn hàng & vận chuyển GHN"
                aria-label="Tra cứu đơn hàng"
              >
                <Headphones size={13} className="text-[#C59B58]" />
                <span>Tra cứu đơn</span>
              </button>
            )}

            <span className="text-[#5C4D3C] select-none">|</span>

            {/* Trung tâm thông báo */}
            <div className="flex items-center">
              <NotificationDropdown />
            </div>

            <span className="text-[#5C4D3C] select-none">|</span>

            {/* Tài khoản hoặc Đăng nhập */}
            {currentUser ? (
              <div
                className="relative z-50 flex items-center"
                ref={userMenuRef}
                onPointerEnter={accountHover.enterTrigger}
                onPointerLeave={accountHover.closeSoon}
                onFocusCapture={accountHover.cancelClose}
                onBlurCapture={event => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) accountHover.closeSoon();
                }}
              >
                <HeaderAccountButton
                  user={currentUser}
                  role={currentUser.role}
                  expanded={isUserMenuOpen}
                  menuId="public-account-menu"
                  detail={isShop ? storeName : undefined}
                  darkMode={true}
                  onClick={accountHover.toggle}
                />
                {isUserMenuOpen && (
                  <AccountMenu
                    id="public-account-menu"
                    user={currentUser}
                    role={currentUser.role}
                    onClose={() => setIsUserMenuOpen(false)}
                    onLogout={handleLogout}
                    inputRef={avatarInputRef}
                    onAvatarUpload={handleAvatarUpload}
                    uploading={uploadingAvatar}
                  />
                )}
              </div>
            ) : (
              <Link
                to={loginUrl}
                className="inline-flex items-center gap-1.5 font-bold text-[#FAF8F5] hover:text-[#C59B58] transition-colors text-xs"
                title="Đăng nhập hoặc đăng ký"
              >
                <User size={13} className="text-[#C59B58]" />
                <span>Đăng nhập / Đăng ký</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* TẦNG 2: THANH TRUNG TÂM THƯƠNG MẠI`;

publicHeaderContent = publicHeaderContent.replace(oldTopBarRegex, newTopBar);

// Update Brand logo block to include vertical gold divider
publicHeaderContent = publicHeaderContent.replace(
  '<div className="public-commerce-header__brand flex items-center gap-3 shrink-0">',
  '<div className="public-commerce-header__brand flex items-center gap-3 shrink-0">\n            <div className="hidden sm:block h-7 w-[1px] bg-[#C59B58]/35 order-last ml-1" />'
);

fs.writeFileSync(publicHeaderPath, publicHeaderContent, 'utf8');
console.log('✓ Updated PublicHeader.tsx');

// -----------------------------------------------------------------------------
// 6. Update PublicHeader.css (Pill-First geometry & Silk colors)
// -----------------------------------------------------------------------------
const publicHeaderCssPath = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.css');
let publicHeaderCss = fs.readFileSync(publicHeaderCssPath, 'utf8');

// Update .public-commerce-header__cart to rounded-full pill
publicHeaderCss = publicHeaderCss.replace(
  /\.public-commerce-header__cart\s*\{[^}]+\}/,
  `.public-commerce-header__cart {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply [gap:7px];
  @apply [height:42px];
  @apply [min-width:42px];
  @apply [padding:0_16px];
  @apply [border-radius:9999px];
  @apply [background:#F6EFE5];
  @apply [border:1px_solid_#E5D8C5];
  @apply [color:#1A1612];
  @apply cursor-pointer;
  @apply transition-all;
  @apply [box-shadow:0_1px_3px_rgba(35,29,21,0.04)];
}`
);

fs.writeFileSync(publicHeaderCssPath, publicHeaderCss, 'utf8');
console.log('✓ Updated PublicHeader.css');

// -----------------------------------------------------------------------------
// 7. Update MarketplaceHero.tsx (rounded-3xl, Pill CTAs, 4-Column Trust Bar)
// -----------------------------------------------------------------------------
const heroPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHero.tsx');
let heroContent = fs.readFileSync(heroPath, 'utf8');

// Ensure Zap, Headphones, Gift are imported
if (!heroContent.includes('Headphones')) {
  heroContent = heroContent.replace(
    "import { ArrowLeft, ArrowRight, Store, ShieldCheck, Radio } from 'lucide-react';",
    "import { ArrowLeft, ArrowRight, Store, ShieldCheck, Radio, Zap, Headphones, Gift } from 'lucide-react';"
  );
}

// Replace rounded-2xl with rounded-3xl
heroContent = heroContent.replace(
  'className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_8px_32px_rgba(35,29,21,0.06)]"',
  'className="relative overflow-hidden rounded-3xl border border-[#E5D8C5] bg-white shadow-[0_12px_40px_rgba(35,29,21,0.08)]"'
);

// Replace CTA buttons with Pill rounded-full
heroContent = heroContent.replace(
  /className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-\[#C49B5B\] px-5 text-xs font-bold text-white hover:bg-\[#B88E4F\] shadow-xs transition-all active:scale-\[0\.98\]"/g,
  'className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#B88E4F] to-[#8C662D] px-6 text-xs font-bold text-white hover:from-[#A77D3E] hover:to-[#7A5724] shadow-sm transition-all active:scale-[0.98]"'
);

heroContent = heroContent.replace(
  'className="inline-flex min-h-11 items-center rounded-xl border border-[#EAE4D7] bg-white/90 px-5 text-xs font-bold hover:border-[#C59B58]"',
  'className="inline-flex min-h-11 items-center rounded-full border border-[#DFD6C5] bg-white/95 px-6 text-xs font-bold text-[#1A1612] hover:bg-[#FAF8F5] transition-all shadow-2xs"'
);

// Replace the bottom strip with 4 Trụ Cột Uy Tín
const oldHeroBottomRegex = /<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-\[#EAE4D7\] bg-white\/90 px-4 py-3 sm:px-6">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/;

const newHeroBottom = `<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-[#EAE4D7] bg-white/90 px-4 py-3 sm:px-6">
            <div className="hidden gap-4 text-[11px] font-semibold text-[#7D715E] md:flex">
              <span className="flex items-center gap-1.5"><Store size={15} /> Nhãn hàng trực thuộc</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} /> Đối tác eKYC xác minh</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(-1)} aria-label="Banner trước" className="rounded-full p-2.5 hover:bg-[#F3EFE6]"><ArrowLeft size={16} /></button>
              {slides.map((slide, index) => <button type="button" key={slide.image} onClick={() => setActive(index)} aria-label={\`Xem banner \${index + 1}\`} aria-current={index === active ? 'true' : undefined} className="flex h-10 w-8 items-center justify-center"><span className={\`h-1.5 rounded-full \${index === active ? 'w-6 bg-[#C59B58]' : 'w-2 bg-[#EAE4D7]'}\`} /></button>)}
              <button type="button" onClick={() => move(1)} aria-label="Banner sau" className="rounded-full p-2.5 hover:bg-[#F3EFE6]"><ArrowRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* 4 Trụ Cột Uy Tín Toàn Hệ Thống (Trust Bar) theo đúng ảnh mẫu */}
        <div className="mt-4 w-full rounded-2xl border border-[#E8DCB] bg-[#F6EFE5] px-4 sm:px-6 py-3.5 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5D8C5] gap-3 md:gap-0">
            <div className="flex items-center justify-center gap-2 px-3 text-xs font-semibold text-[#1A1612]">
              <ShieldCheck size={16} className="text-[#B88E4F] shrink-0" />
              <span>Nhãn hàng trực thuộc</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 pt-2 md:pt-0 text-xs font-semibold text-[#1A1612]">
              <Zap size={16} className="text-[#B88E4F] shrink-0" />
              <span>Đối tác eKYC xác minh</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 pt-2 md:pt-0 text-xs font-semibold text-[#1A1612]">
              <Headphones size={16} className="text-[#B88E4F] shrink-0" />
              <span>Hỗ trợ 24/7</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 pt-2 md:pt-0 text-xs font-semibold text-[#1A1612]">
              <Gift size={16} className="text-[#B88E4F] shrink-0" />
              <span>Ưu đãi độc quyền</span>
            </div>
          </div>
        </div>
      </div>
    </section>`;

heroContent = heroContent.replace(oldHeroBottomRegex, newHeroBottom);
fs.writeFileSync(heroPath, heroContent, 'utf8');
console.log('✓ Updated MarketplaceHero.tsx');

// -----------------------------------------------------------------------------
// 8. Update CategoryQuickNav.css (Thanh gạch dọc vàng thương hiệu | DANH MỤC)
// -----------------------------------------------------------------------------
const categoryNavCssPath = path.join(__dirname, '../frontend/src/components/marketplace/CategoryQuickNav.css');
let categoryNavCss = fs.readFileSync(categoryNavCssPath, 'utf8');

categoryNavCss = categoryNavCss.replace(
  '.category-quick-nav__heading h2 {\n  @apply m-0 text-sm font-bold uppercase tracking-wider text-[#1A1612];\n}',
  `.category-quick-nav__heading h2 {
  @apply m-0 text-sm font-black uppercase tracking-wider text-[#1A1612];
  border-left: 4px solid #C59B58;
  padding-left: 10px;
}`
);
fs.writeFileSync(categoryNavCssPath, categoryNavCss, 'utf8');
console.log('✓ Updated CategoryQuickNav.css');

console.log('=== ALL FILES SUCCESSFULLY UPDATED ===');
