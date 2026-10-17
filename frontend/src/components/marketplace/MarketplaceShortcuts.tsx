import { Link } from 'react-router-dom';
import { Radio, ShoppingBag, Sparkles, Store } from 'lucide-react';

export function MarketplaceShortcuts({ onOpenLive }: { onOpenLive: () => void }) {
  return (
    <nav aria-label="Khám phá SCANMS" className="border-b border-[#EAE4D7] bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-3 py-2 text-[11px] font-semibold text-[#7D715E] sm:gap-3 sm:px-4 lg:px-6">
        <Link to="/" aria-current="page" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FBF5EB] px-3 py-2.5 text-[#1A1612]"><ShoppingBag size={15} />Trang mua sắm</Link>
        <Link to="#featured-stores" className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-[#FBF5EB] hover:text-[#1A1612]"><Store size={15} />Gian hàng đối tác</Link>
        <button type="button" onClick={onOpenLive} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-[#FBF5EB] hover:text-[#1A1612]"><Radio size={15} className="text-[#B88E4F]" />Khám phá Live KOC</button>
        <Link to="/search?commission=true" className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-[#FBF5EB] hover:text-[#1A1612]"><Sparkles size={15} />Khám phá cùng KOC</Link>
        <Link to="/login" className="ml-auto shrink-0 px-3 py-2.5 text-[#1A1612] hover:text-[#B88E4F]">Cổng đối tác</Link>
      </div>
    </nav>
  );
}
