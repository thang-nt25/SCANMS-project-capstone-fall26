import { Link, useLocation } from 'react-router-dom';
import { Radio, Tag, Store } from 'lucide-react';

export function MarketplaceShortcuts({ onOpenLive }: { onOpenLive: () => void; compact?: boolean }) {
  const location = useLocation();
  const storesActive = location.hash === '#featured-stores';
  const discountsActive = location.pathname === '/search' && new URLSearchParams(location.search).get('discount') === 'true';

  return (
    <nav aria-label="Khám phá SCANMS" className="inline-flex shrink-0 items-center gap-0 py-[3px] px-2 bg-[#FAF5EC] rounded-full border border-[#E6D8C2] shadow-[0_4px_14px_rgba(70,45,15,0.06),0_1px_3px_rgba(0,0,0,0.02)]">
      <Link
        to="/marketplace#featured-stores"
        aria-current={storesActive ? 'location' : undefined}
        onClick={() => document.getElementById('featured-stores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className={`relative inline-flex items-center gap-1.5 py-1.5 px-3.5 no-underline rounded-full text-[13px] border-0 bg-transparent cursor-pointer transition-colors duration-200 whitespace-nowrap ${
          storesActive ? 'text-[#94621f] font-semibold' : 'text-[#63523e] font-medium hover:text-[#94621f]'
        }`}
      >
        <Store size={14} className={storesActive ? 'text-[#94621f]' : 'text-[#85735f]'} aria-hidden="true" />
        <span>Gian hàng</span>
        {storesActive && <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[26px] h-[2.5px] bg-[#B8862F] rounded-full" />}
      </Link>

      <span className="text-[#DEC9B0] text-[11px] font-light select-none px-0.5" aria-hidden="true">|</span>

      <button
        type="button"
        onClick={onOpenLive}
        className="relative inline-flex items-center gap-1.5 py-1.5 px-3.5 no-underline rounded-full text-[13px] font-medium text-[#63523e] border-0 bg-transparent cursor-pointer transition-colors duration-200 hover:text-[#94621f] whitespace-nowrap"
      >
        <Radio size={14} className="text-[#85735f]" aria-hidden="true" />
        <span>Live KOC</span>
      </button>

      <span className="text-[#DEC9B0] text-[11px] font-light select-none px-0.5" aria-hidden="true">|</span>

      <Link
        to="/search?discount=true&inStock=true"
        aria-current={discountsActive ? 'page' : undefined}
        className={`relative inline-flex items-center gap-1.5 py-1.5 px-3.5 no-underline rounded-full text-[13px] border-0 bg-transparent cursor-pointer transition-colors duration-200 whitespace-nowrap ${
          discountsActive ? 'text-[#94621f] font-semibold' : 'text-[#63523e] font-medium hover:text-[#94621f]'
        }`}
      >
        <Tag size={14} className={discountsActive ? 'text-[#94621f]' : 'text-[#85735f]'} aria-hidden="true" />
        <span>Giảm giá</span>
        {discountsActive && <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[26px] h-[2.5px] bg-[#B8862F] rounded-full" />}
      </Link>
    </nav>
  );
}
