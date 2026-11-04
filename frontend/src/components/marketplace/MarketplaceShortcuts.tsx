import { Link, useLocation } from 'react-router-dom';
import { Radio, Tag, Store } from 'lucide-react';

export function MarketplaceShortcuts({ onOpenLive }: { onOpenLive: () => void; compact?: boolean }) {
  const location = useLocation();
  const storesActive = location.hash === '#featured-stores';
  const discountsActive = location.pathname === '/search' && new URLSearchParams(location.search).get('discount') === 'true';

  return (
    <nav aria-label="Khám phá SCANMS" className="navigation">
      <Link
        to="/marketplace#featured-stores"
        aria-current={storesActive ? 'location' : undefined}
        onClick={() => document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className={`nav-tab ${storesActive ? 'active' : ''}`}
      >
        <Store size={14} className={storesActive ? 'text-[#94621f]' : 'text-[#85735f]'} aria-hidden="true" />
        <span>Gian hàng</span>
        {storesActive && <span className="nav-active-bar" />}
      </Link>

      <span className="nav-divider" aria-hidden="true">|</span>

      <button
        type="button"
        onClick={onOpenLive}
        className="nav-tab"
      >
        <Radio size={14} className="text-[#85735f]" aria-hidden="true" />
        <span>Live KOC</span>
      </button>

      <span className="nav-divider" aria-hidden="true">|</span>

      <Link
        to="/search?discount=true&inStock=true"
        aria-current={discountsActive ? 'page' : undefined}
        className={`nav-tab ${discountsActive ? 'active' : ''}`}
      >
        <Tag size={14} className={discountsActive ? 'text-[#94621f]' : 'text-[#85735f]'} aria-hidden="true" />
        <span>Giảm giá</span>
        {discountsActive && <span className="nav-active-bar" />}
      </Link>
    </nav>
  );
}
