import { Link, useLocation } from 'react-router-dom';
import { Store, Tag, Truck } from 'lucide-react';

const shortcuts = [
  { label: 'Gian hàng', icon: Store, to: '/marketplace#featured-stores' },
  { label: 'Giảm giá', icon: Tag, to: '/search?discount=true&inStock=true' },
  { label: 'Tra cứu đơn', icon: Truck, to: '/marketplace#tracking-section' },
] as const;

export function MarketplaceShortcuts({ compact: _compact }: { compact?: boolean }) {
  const { hash, pathname, search } = useLocation();
  const discountsActive = pathname === '/search' && new URLSearchParams(search).get('discount') === 'true';

  return (
    <nav aria-label="Khám phá SCANMS" className="grid w-[min(100%,23rem)] grid-cols-3 rounded-full border border-[#E6D8C2] bg-[#FAF5EC] px-1.5 py-[3px] shadow-[0_4px_14px_rgba(70,45,15,0.06),0_1px_3px_rgba(0,0,0,0.02)] sm:w-[25rem]">
      {shortcuts.map(({ label, icon: Icon, to }, index) => {
        const anchor = to.split('#')[1];
        const active = anchor ? pathname === '/marketplace' && hash === `#${anchor}` : discountsActive;

        return (
          <div key={to} className="relative min-w-0 px-0.5">
            {index > 0 && <span aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-px -translate-y-1/2 bg-[#DEC9B0]" />}
            <Link
              to={to}
              aria-current={active ? (anchor ? 'location' : 'page') : undefined}
              className={`flex min-h-9 w-full items-center justify-center gap-1 rounded-full px-1 text-center text-[11px] leading-tight no-underline transition-colors focus-visible:outline-2 focus-visible:outline-[#B88E4F] sm:gap-1.5 sm:text-[13px] ${
                active ? 'bg-[#F3E8D6] font-semibold text-[#795A2D]' : 'font-medium text-[#63523e] hover:bg-white hover:text-[#795A2D]'
              }`}
            >
              <Icon size={14} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
