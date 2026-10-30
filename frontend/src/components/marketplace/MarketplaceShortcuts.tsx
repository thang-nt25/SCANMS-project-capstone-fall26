import { Link, useLocation } from 'react-router-dom';
import { Radio, Tag, Store } from 'lucide-react';
import './MarketplaceShortcuts.css';


const shortcutBaseClassName = 'marketplace-shortcuts__item';

export function MarketplaceShortcuts({ onOpenLive, compact = false }: { onOpenLive: () => void; compact?: boolean }) {
  const location = useLocation();
  const storesActive = location.hash === '#featured-stores';
  const discountsActive = location.pathname === '/search' && new URLSearchParams(location.search).get('discount') === 'true';
  const shortcutClassName = shortcutBaseClassName;
  return (
    <nav aria-label="Khám phá SCANMS" className="marketplace-shortcuts" data-compact={compact}>
      <div className="marketplace-shortcuts__items">
        <Link to="/marketplace#featured-stores" aria-current={storesActive ? 'location' : undefined} onClick={() => document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={shortcutClassName}><Store size={16} aria-hidden="true" />Gian hàng</Link>
        <button type="button" onClick={onOpenLive} className={shortcutClassName}><Radio size={16} aria-hidden="true" />Live KOC</button>
        <Link to="/search?discount=true&inStock=true" aria-current={discountsActive ? 'page' : undefined} className={shortcutClassName}><Tag size={16} aria-hidden="true" />Giảm giá</Link>

      </div>
    </nav>
  );
}
