import { Link } from 'react-router-dom';
import { Radio, ShoppingBag, Sparkles, Store } from 'lucide-react';

const shortcutBaseClassName =
  'inline-flex min-w-0 items-center justify-center gap-2 rounded-lg text-center transition-[padding,min-height,background-color] duration-[180ms] ease-[ease] hover:bg-[#FBF5EB] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] motion-reduce:transition-none [&>svg]:shrink-0';

export function MarketplaceShortcuts({
  onOpenLive,
  compact = false,
}: {
  onOpenLive: () => void;
  compact?: boolean;
}) {
  const shortcutClassName = `${shortcutBaseClassName} ${compact ? 'min-h-10 flex-[0_0_auto] whitespace-nowrap px-2.5 py-1 sm:min-h-8 sm:px-2' : 'min-h-11 px-2 py-2.5'}`;
  return (
    <nav
      aria-label="Khám phá SCANMS"
      className="border-b border-[#EAE4D7] bg-white"
    >
      <div
        className={`mx-auto max-w-[1200px] items-stretch px-3 text-[11px] font-semibold text-[#7D715E] transition-[padding,gap] duration-[180ms] ease-[ease] motion-reduce:transition-none sm:px-4 lg:px-6 ${compact ? 'flex gap-1 overflow-x-auto overscroll-x-contain py-[3px] [scrollbar-width:thin] sm:grid sm:grid-cols-4' : 'grid grid-cols-2 gap-2 py-2 sm:grid-cols-4 sm:gap-3'}`}
      >
        <Link
          to="/"
          aria-current="page"
          className={`${shortcutClassName} bg-[#FBF5EB] text-[#1A1612]`}
        >
          <ShoppingBag size={15} />
          Kho sản phẩm & Chiến dịch
        </Link>
        <Link to="#featured-stores" className={shortcutClassName}>
          <Store size={15} />
          Nhãn hàng trực thuộc
        </Link>
        <button
          type="button"
          onClick={onOpenLive}
          className={shortcutClassName}
        >
          <Radio size={15} className="text-[#B88E4F]" />
          Khám phá Live KOC
        </button>
        <Link to="/search?commission=true" className={shortcutClassName}>
          <Sparkles size={15} />
          Sản phẩm tiếp thị KOC
        </Link>
      </div>
    </nav>
  );
}
