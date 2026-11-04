const fs = require('fs');
const path = require('path');

console.log('=== APPLYING USER EXACT CSS SPECIFICATION ===');

// 1. Update frontend/src/index.css to define the exact CSS variables
const indexCssPath = path.join(__dirname, '../frontend/src/index.css');
let indexCss = fs.readFileSync(indexCssPath, 'utf8');

const userTokens = `
:root {
  /* ScanMS Premium Gold Palette (From User Exact Spec) */
  --color-primary: #b8862f;
  --color-primary-dark: #8b682f;
  --color-primary-light: #d4af70;

  --color-header: #3a2a12;
  --color-background: #f7f1e8;
  --color-surface: #fffaf3;
  --color-card: #fffdf9;

  --color-text: #302317;
  --color-text-secondary: #897761;
  --color-border: #eadbc5;

  --shadow-soft: 0 8px 24px rgba(82, 53, 20, 0.08);

  --radius-sm: 10px;
  --radius-md: 18px;
  --radius-lg: 26px;
}
`;

if (!indexCss.includes('--color-header: #3a2a12;')) {
  indexCss = userTokens + '\n' + indexCss;
  fs.writeFileSync(indexCssPath, indexCss, 'utf8');
  console.log('✓ Injected exact CSS tokens into index.css');
}

// 2. Update PublicHeader.css with exact classes matching user CSS
const publicHeaderCssPath = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.css');
const publicHeaderCss = `@reference "../../index.css";

/* Top Header */
.top-header {
  height: 48px;
  background: linear-gradient(
    90deg,
    #3a2a12,
    #5a3d19,
    #3a2a12
  );
  color: #fff8ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  font-size: 13px;
  border-bottom: 1px solid rgba(212, 175, 112, 0.3);
  position: relative;
  z-index: 50;
}

.top-header a, .top-header button {
  color: #fff8ed;
  text-decoration: none;
  transition: color 0.2s ease;
}
.top-header a:hover, .top-header button:hover {
  color: var(--color-primary-light);
}

/* Main Header */
.main-header {
  background: rgba(255, 250, 243, 0.96);
  border-bottom: 1px solid var(--color-border);
  padding: 20px 40px 16px 40px;
  box-shadow: 0 4px 16px rgba(80, 50, 20, 0.04);
  position: relative;
  z-index: 40;
}

.header-container {
  display: grid;
  grid-template-columns: 280px 1fr 180px;
  align-items: center;
  gap: 28px;
  max-width: 1600px;
  margin: 0 auto;
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  height: 54px;
  background: #fffdf9;
  border: 1px solid #e5d3b9;
  border-radius: 999px;
  padding: 5px 8px 5px 20px;
  box-shadow: var(--shadow-soft);
  transition: border-color 0.2s ease;
  width: 100%;
}

.search-box:focus-within {
  border-color: var(--color-primary);
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text);
}

.search-box button {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.search-box button:hover {
  background: var(--color-primary-dark);
  transform: scale(1.05);
}

/* Navigation */
.navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.navigation a, .navigation button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  text-decoration: none;
  color: var(--color-text);
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.navigation a:hover,
.navigation button:hover,
.navigation a.active,
.navigation a[aria-current] {
  background: #f2e4ce;
  color: var(--color-primary-dark);
}

/* Cart Button */
.cart-button {
  background: #f5e8d5;
  border: 1px solid #e9d5b6;
  border-radius: 999px;
  padding: 12px 22px;
  color: var(--color-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13.5px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(82, 53, 20, 0.04);
}

.cart-button:hover {
  background: #eedfc6;
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

/* Header Account trigger in Top Header */
.top-header .header-account-trigger {
  height: 36px;
  background: transparent;
  border: none;
  color: #fff8ed;
  cursor: pointer;
}
.top-header .header-account-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}
.top-header .header-account-trigger strong {
  color: #fff8ed;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .header-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .top-header {
    padding: 0 16px;
  }
  .main-header {
    padding: 16px;
  }
  .navigation {
    flex-wrap: wrap;
  }
}

/* Fallback for workspace backoffice */
html:has(.public-commerce-header--workspace) {
  background: #FAF8F5;
}
`;
fs.writeFileSync(publicHeaderCssPath, publicHeaderCss, 'utf8');
console.log('✓ Updated PublicHeader.css with exact user CSS rules');

// 3. Update PublicHeader.tsx to use .top-header, .main-header, .header-container
const publicHeaderTsxPath = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.tsx');
let publicHeaderTsx = fs.readFileSync(publicHeaderTsxPath, 'utf8');

// Replace top bar structure to use .top-header
const oldHeaderRegex = /<header[\s\S]*?className=\{`scanms-site-header public-commerce-header[\s\S]*?<\/header>/;

const newHeaderJsx = `<header
      className={\`scanms-site-header public-commerce-header \${cartPage ? 'public-commerce-header--cart' : ''} \${isMarketplace ? 'public-commerce-header--marketplace' : ''} \${sticky ? 'sticky top-0' : 'relative'} z-40\`}
      data-shortcuts={hasShortcuts}
      data-shopping-actions={showShoppingActions}
    >
      {/* Top Header matching user CSS spec */}
      <div className="top-header hidden sm:flex">
        {/* Left: Ecosystem links */}
        <div className="flex items-center gap-4 font-medium">
          <Link to="/kol/workspace" className="flex items-center gap-1.5" title="Dành cho Nhà sáng tạo KOC">
            <Shield size={14} className="text-[#d4af70]" />
            <span>Kênh Tiếp Thị KOL</span>
          </Link>
          <span className="text-[#d4af70]/40 select-none">|</span>
          <Link to="/shop/dashboard" className="flex items-center gap-1.5" title="Dành cho Giám đốc Nhãn hàng">
            <span>Cộng Nhãn Hàng Trực Thuộc</span>
          </Link>
        </div>

        {/* Right: Utilities */}
        <div className="flex items-center gap-3.5">
          {showShoppingActions && (
            <button
              type="button"
              onClick={() => {
                if (onOpenTracking) onOpenTracking();
                else navigate('/tracking');
              }}
              className="inline-flex items-center gap-1.5 cursor-pointer font-medium"
              title="Tra cứu lộ trình đơn hàng & vận chuyển GHN"
            >
              <Headphones size={14} className="text-[#d4af70]" />
              <span>Tra cứu đơn</span>
            </button>
          )}

          <span className="text-[#d4af70]/40 select-none">|</span>

          {/* Notifications */}
          <div className="flex items-center">
            <NotificationDropdown />
          </div>

          <span className="text-[#d4af70]/40 select-none">|</span>

          {/* Account */}
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
              className="inline-flex items-center gap-1.5 font-bold text-[#fff8ed] hover:text-[#d4af70] transition-colors"
            >
              <User size={14} className="text-[#d4af70]" />
              <span>Đăng nhập / Đăng ký</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Header matching user CSS spec */}
      <div className="main-header">
        <div className="header-container">
          {/* Column 1 (280px): Logo Brand */}
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
              <ScanMSLogo size="md" darkMode={false} className="scanms-header-logo [&_.scanms-logo-subtitle]:hidden sm:[&_.scanms-logo-subtitle]:block" showSubtitle={!cartPage} />
            </Link>
            <div className="hidden sm:block h-8 w-[1px] bg-[#d4af70]/40 order-last ml-1" />
            {cartPage && <h1 className="text-xl font-bold ml-2 text-[#302317]">Giỏ hàng</h1>}
          </div>

          {/* Column 2 (1fr): Search Box & Navigation Ribbon */}
          <div className="hidden lg:flex flex-col items-center w-full">
            <ProductSearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              className="w-full"
            />
            {navigation && (
              <div className="w-full flex justify-center">
                {navigation}
              </div>
            )}
          </div>

          {/* Column 3 (180px): Cart Button */}
          {showShoppingActions && !cartPage && (
            <div className="hidden lg:flex justify-end items-center">
              <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
            </div>
          )}

          {/* Mobile cluster */}
          <div className="flex lg:hidden items-center justify-end gap-2">
            <NotificationDropdown />
            {showShoppingActions && !cartPage && (
              <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
            )}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <HeaderAccountButton
                  user={currentUser}
                  role={currentUser.role}
                  expanded={isUserMenuOpen}
                  menuId="public-account-menu-mobile"
                  onClick={accountHover.toggle}
                />
              </div>
            ) : (
              <Link to={loginUrl} className="p-2 text-[#302317]" aria-label="Đăng nhập">
                <User size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="lg:hidden px-4 pb-3 pt-2 bg-[#fffaf3] border-b border-[#eadbc5] relative z-10">
        <ProductSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onFilter={onOpenFilter || location.pathname !== '/search' ? handleFilterClick : undefined}
        />
        {navigation && <div className="mt-2 flex justify-center">{navigation}</div>}
      </div>
    </header>`;

publicHeaderTsx = publicHeaderTsx.replace(oldHeaderRegex, newHeaderJsx);
fs.writeFileSync(publicHeaderTsxPath, publicHeaderTsx, 'utf8');
console.log('✓ Updated PublicHeader.tsx with .top-header, .main-header, .header-container');

// 4. Update ProductSearchBox.tsx to match exact .search-box rules
const searchBoxPath = path.join(__dirname, '../frontend/src/components/layout/ProductSearchBox.tsx');
let searchBoxContent = fs.readFileSync(searchBoxPath, 'utf8');

searchBoxContent = searchBoxContent.replace(
  /className=\{`product-search-form flex w-full[^`]+`\}/,
  'className="search-box"'
);

searchBoxContent = searchBoxContent.replace(
  /<button type="submit" className="product-search-submit[^>]+>[\s\S]*?<\/button>/,
  '<button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={18} color="#ffffff" /></button>'
);

fs.writeFileSync(searchBoxPath, searchBoxContent, 'utf8');
console.log('✓ Updated ProductSearchBox.tsx with .search-box');

// 5. Update HeaderCartPreview.tsx & HeaderCartPreview.css to match .cart-button
const headerCartPath = path.join(__dirname, '../frontend/src/components/cart/HeaderCartPreview.tsx');
let headerCartContent = fs.readFileSync(headerCartPath, 'utf8');

headerCartContent = headerCartContent.replace(
  /className="public-commerce-header__cart"/g,
  'className="cart-button"'
);

fs.writeFileSync(headerCartPath, headerCartContent, 'utf8');
console.log('✓ Updated HeaderCartPreview.tsx with .cart-button');

// 6. Update MarketplaceShortcuts.tsx & MarketplaceShortcuts.css to match .navigation
const shortcutsTsxPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceShortcuts.tsx');
const shortcutsTsx = `import { Link, useLocation } from 'react-router-dom';
import { Home, Radio, Tag, Store } from 'lucide-react';

export function MarketplaceShortcuts({ onOpenLive }: { onOpenLive: () => void; compact?: boolean }) {
  const location = useLocation();
  const isHome = location.pathname === '/marketplace' && !location.hash;
  const storesActive = location.hash === '#featured-stores';
  const discountsActive = location.pathname === '/search' && new URLSearchParams(location.search).get('discount') === 'true';

  return (
    <nav aria-label="Khám phá SCANMS" className="navigation">
      <Link
        to="/marketplace"
        aria-current={isHome ? 'page' : undefined}
        className={isHome ? 'active' : ''}
      >
        <Home size={15} aria-hidden="true" />
        <span>Trang chủ</span>
      </Link>
      <Link
        to="/marketplace#featured-stores"
        aria-current={storesActive ? 'location' : undefined}
        onClick={() => document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className={storesActive ? 'active' : ''}
      >
        <Store size={15} aria-hidden="true" />
        <span>Gian hàng</span>
      </Link>
      <button
        type="button"
        onClick={onOpenLive}
      >
        <Radio size={15} aria-hidden="true" />
        <span>Live KOC</span>
      </button>
      <Link
        to="/search?discount=true&inStock=true"
        aria-current={discountsActive ? 'page' : undefined}
        className={discountsActive ? 'active' : ''}
      >
        <Tag size={15} aria-hidden="true" />
        <span>Giảm giá</span>
      </Link>
    </nav>
  );
}
`;
fs.writeFileSync(shortcutsTsxPath, shortcutsTsx, 'utf8');
console.log('✓ Updated MarketplaceShortcuts.tsx with .navigation');

// 7. Update MarketplaceHero.tsx with exact .hero-banner, .hero-content, .btn-primary, .btn-secondary, .benefit-bar, .benefit-item
const heroPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHero.tsx');
const heroTsx = `import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Store, ShieldCheck, Radio, Zap, Headphones, Gift } from 'lucide-react';
import './MarketplaceHero.css';

interface BannerStore {
  id: string;
  name: string;
  activeCampaign?: { name: string; endsAt: string } | null;
}

export function MarketplaceHero({ stores, onOpenLive }: { stores: BannerStore[]; onOpenLive: () => void }) {
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const partner = stores.find((store) => store.activeCampaign && Date.parse(store.activeCampaign.endsAt) > Date.now());
  const slides = [
    {
      image: '/assets/marketplace/scanms-marketplace-banner-v3.png',
      eyebrow: 'SCANMS · MẠNG LƯỚI TIẾP THỊ & CỘNG TÁC VIÊN',
      title: partner ? partner.activeCampaign!.name : 'Chiến Dịch Siêu Thưởng Thời Trang Thiết Kế 2026',
      description: partner ? \`Khám phá chương trình đang diễn ra tại \${partner.name} và lấy liên kết tiếp thị.\` : 'Khám phá chương trình đang diễn ra tại Aura Fashion Studio và lấy liên kết tiếp thị.',
      label: partner ? \`Ghé thăm \${partner.name} ->\` : 'Ghé thăm Aura Fashion Studio ->',
      href: partner ? \`/shops/\${partner.id}\` : '#featured-stores',
    },
    {
      image: '/assets/marketplace/scanms-affiliate-banner-v2.png',
      eyebrow: 'KHÁM PHÁ CÙNG NHÀ SÁNG TẠO',
      title: 'Chọn sản phẩm hay, cùng KOC bạn thích.',
      description: 'Xem KOC giới thiệu sản phẩm trong các phiên Live và khám phá thêm nhiều gian hàng đối tác.',
      label: 'Khám phá Live cùng KOC ->',
      href: null,
    },
    {
      image: '/assets/marketplace/scanms-live-banner-v2.png',
      eyebrow: 'SCANMS LIVE COMMERCE',
      title: 'Xem trực tiếp. Hỏi ngay. Chọn đúng.',
      description: 'Gặp gỡ KOC, khám phá sản phẩm đang được giới thiệu và ưu đãi còn hiệu lực trong phiên Live.',
      label: 'Khám phá KOC Live ->',
      href: null,
    },
  ];
  const move = (offset: number) => setActive((previous) => (previous + offset + slides.length) % slides.length);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (interacting || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((previous) => (previous + 1) % 3);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [interacting, reducedMotion]);

  return (
    <section className="hero-section">
      <div className="hero-banner"
        onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        {slides.map((slide, index) => (
          <div key={slide.image} hidden={index !== active} className="hero-slide">
            <img src={slide.image} alt="" fetchPriority={index === 0 ? 'high' : 'auto'} className="hero-bg-image" />
            <div className="hero-bg-overlay" />
            
            <div className="hero-content">
              <span className="hero-eyebrow">{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>
              
              <div className="hero-actions">
                {slide.href ? (
                  <Link to={slide.href} className="btn-primary">{slide.label}</Link>
                ) : (
                  <button type="button" onClick={onOpenLive} className="btn-primary">{slide.label}</button>
                )}
                <Link to="/search" className="btn-secondary">Tất cả sản phẩm</Link>
              </div>
            </div>
          </div>
        ))}

        <div className="hero-carousel-controls">
          <div className="hidden gap-4 text-xs font-semibold text-[#80694d] md:flex">
            <span className="flex items-center gap-1.5"><Store size={15} /> Nhãn hàng trực thuộc</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} /> Đối tác eKYC xác minh</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => move(-1)} aria-label="Banner trước" className="rounded-full p-2.5 hover:bg-black/5"><ArrowLeft size={16} /></button>
            {slides.map((slide, index) => (
              <button type="button" key={slide.image} onClick={() => setActive(index)} aria-label={\`Xem banner \${index + 1}\`} className="flex h-8 w-6 items-center justify-center">
                <span className={\`h-1.5 rounded-full transition-all \${index === active ? 'w-6 bg-[#b8862f]' : 'w-2 bg-[#ead2ae]'}\`} />
              </button>
            ))}
            <button type="button" onClick={() => move(1)} aria-label="Banner sau" className="rounded-full p-2.5 hover:bg-black/5"><ArrowRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Benefit Bar matching user spec */}
      <div className="benefit-bar">
        <div className="benefit-item">
          <ShieldCheck size={18} className="text-[#b8862f] shrink-0" />
          <span>Nhãn hàng trực thuộc</span>
        </div>
        <div className="benefit-item">
          <Zap size={18} className="text-[#b8862f] shrink-0" />
          <span>Đối tác eKYC xác minh</span>
        </div>
        <div className="benefit-item">
          <Headphones size={18} className="text-[#b8862f] shrink-0" />
          <span>Hỗ trợ 24/7</span>
        </div>
        <div className="benefit-item">
          <Gift size={18} className="text-[#b8862f] shrink-0" />
          <span>Ưu đãi độc quyền</span>
        </div>
      </div>
    </section>
  );
}
`;
fs.writeFileSync(heroPath, heroTsx, 'utf8');

// Update MarketplaceHero.css with exact rules
const heroCssPath = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHero.css');
const heroCss = `@reference "../../index.css";

.hero-section {
  width: 100%;
}

.hero-banner {
  position: relative;
  overflow: hidden;
  margin: 32px auto;
  width: calc(100% - 80px);
  max-width: 1600px;
  min-height: 440px;
  border-radius: var(--radius-lg, 26px);
  border: 1px solid #ead2ae;
  background: linear-gradient(
    110deg,
    #fff7e9 0%,
    #f5dfbd 55%,
    #c99a55 100%
  );
  box-shadow: var(--shadow-soft, 0 8px 24px rgba(82, 53, 20, 0.08));
}

.hero-slide {
  position: relative;
  min-height: 440px;
  display: flex;
  align-items: center;
}

.hero-bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 70% center;
}

.hero-bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #fff7e9 0%,
    rgba(255, 247, 233, 0.96) 35%,
    rgba(255, 247, 233, 0.75) 55%,
    rgba(255, 247, 233, 0.15) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 650px;
  padding: 60px;
  text-align: left;
}

.hero-eyebrow {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #ead2ae;
  color: #8b682f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.hero-content h1 {
  font-size: clamp(32px, 3.5vw, 52px);
  line-height: 1.15;
  font-weight: 800;
  color: #352313;
  margin: 0 0 16px 0;
}

.hero-content p {
  color: #80694d;
  font-size: 15px;
  line-height: 1.7;
  margin: 0 0 26px 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.btn-primary {
  background: linear-gradient(
    135deg,
    #c99545,
    #94621f
  );
  color: white;
  border: none;
  border-radius: 999px;
  padding: 14px 28px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(160, 105, 35, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(160, 105, 35, 0.25);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text, #302317);
  border: 1px solid var(--color-primary, #b8862f);
  border-radius: 999px;
  padding: 14px 28px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #ffffff;
  border-color: #8b682f;
}

.hero-carousel-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 40px;
  border-top: 1px solid rgba(234, 210, 174, 0.6);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
}

/* Benefit Bar */
.benefit-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 24px auto;
  width: calc(100% - 80px);
  max-width: 1600px;
  padding: 20px;
  background: var(--color-surface, #fffaf3);
  border: 1px solid var(--color-border, #eadbc5);
  border-radius: var(--radius-md, 18px);
  box-shadow: var(--shadow-soft, 0 8px 24px rgba(82, 53, 20, 0.08));
}

.benefit-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-secondary, #897761);
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .hero-content {
    padding: 36px;
  }
  .benefit-bar {
    grid-template-columns: repeat(2, 1fr);
    margin: 20px auto;
  }
}

@media (max-width: 768px) {
  .hero-banner {
    width: calc(100% - 32px);
    margin: 16px auto;
  }
  .hero-content {
    padding: 24px;
  }
  .hero-content h1 {
    font-size: 30px;
  }
  .benefit-bar {
    width: calc(100% - 32px);
    margin: 16px auto;
    grid-template-columns: 1fr;
  }
}
`;
fs.writeFileSync(heroCssPath, heroCss, 'utf8');
console.log('✓ Updated MarketplaceHero.tsx and MarketplaceHero.css with exact user CSS rules');

// 8. Update CategoryQuickNav.css with exact .category-section rules
const categoryNavCssPath = path.join(__dirname, '../frontend/src/components/marketplace/CategoryQuickNav.css');
const categoryNavCss = `@reference "../../index.css";

.category-quick-nav {
  padding: 0;
  background: transparent;
}

.category-quick-nav__container {
  width: calc(100% - 80px);
  max-width: 1600px;
  margin: 32px auto;
  padding: 0;
}

.category-quick-nav__panel {
  background: var(--color-card, #fffdf9);
  border: 1px solid var(--color-border, #eadbc5);
  border-radius: var(--radius-md, 18px);
  padding: 24px;
  box-shadow: var(--shadow-soft, 0 8px 24px rgba(82, 53, 20, 0.08));
  overflow: hidden;
}

.category-quick-nav__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.category-quick-nav__heading h2 {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text, #302317);
  margin: 0;
  border-left: 4px solid var(--color-primary, #b8862f);
  padding-left: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.category-quick-nav__all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary, #897761);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.category-quick-nav__all:hover {
  color: var(--color-primary, #b8862f);
}

.category-quick-nav__categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.category-quick-nav__category {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 16px;
  text-decoration: none;
  border-radius: 14px;
  background: var(--color-surface, #fffaf3);
  border: 1px solid var(--color-border, #eadbc5);
  transition: all 0.2s ease;
  cursor: pointer;
}

.category-quick-nav__category:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary, #b8862f);
  box-shadow: 0 6px 16px rgba(82, 53, 20, 0.08);
}

.category-quick-nav__category:hover .category-quick-nav__name {
  color: var(--color-primary, #b8862f);
}

.category-quick-nav__image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--color-border, #eadbc5);
  padding: 8px;
}

.category-quick-nav__image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.category-quick-nav__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text, #302317);
  transition: color 0.2s ease;
}

@media (max-width: 1024px) {
  .category-quick-nav__categories {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .category-quick-nav__container {
    width: calc(100% - 32px);
    margin: 16px auto;
  }
}
`;
fs.writeFileSync(categoryNavCssPath, categoryNavCss, 'utf8');
console.log('✓ Updated CategoryQuickNav.css with exact user CSS rules');

// 9. Update MarketplacePage.tsx background to var(--color-background) #f7f1e8
const marketplacePagePath = path.join(__dirname, '../frontend/src/pages/public/MarketplacePage.tsx');
let marketplacePageContent = fs.readFileSync(marketplacePagePath, 'utf8');

marketplacePageContent = marketplacePageContent.replace(
  'className="min-h-screen bg-[#FAF7F2] text-[#1A1612]',
  'className="min-h-screen bg-[#f7f1e8] text-[#302317]'
);
fs.writeFileSync(marketplacePagePath, marketplacePageContent, 'utf8');
console.log('✓ Updated MarketplacePage.tsx background to #f7f1e8');

console.log('=== EXACT USER SPECIFICATION APPLIED SUCCESSFULLY ===');
