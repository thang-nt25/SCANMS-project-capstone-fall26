import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Search, Store } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { LiveNowSection } from '@/components/marketplace/LiveNowSection';
import { LiveCommerceHubModal } from '@/components/marketplace/LiveCommerceHubModal';
import api from '@/services/api';
import type { MarketplaceStore } from '@/types/marketplace-home.types';

function ShopLogo({ store }: { store: MarketplaceStore }) {
  const [failed, setFailed] = useState(false);
  return <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]">
    {store.logoUrl && !failed ? <img src={store.logoUrl} alt="" onError={() => setFailed(true)} className="size-full object-contain" /> : <Store size={24} />}
  </span>;
}

export default function ShoppingDiscoverPage() {
  const live = useLocation().pathname === '/discover/live';
  const [search, setSearch] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { data: stores = [], isPending, isError, refetch } = useQuery<MarketplaceStore[]>({
    queryKey: ['marketplace-featured-stores'],
    enabled: !live,
    queryFn: async () => {
      const response = await api.get('/stores/marketplace');
      const payload = response?.data?.data ?? response?.data ?? response;
      return Array.isArray(payload) ? payload : [];
    },
    staleTime: 60_000,
  });
  const filtered = stores.filter(store => `${store.name} ${store.category || ''}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  return <div className="min-h-dvh bg-[#FAF8F5] text-[#1A1612]">
    <PublicHeader />
    <main className="mx-auto max-w-4xl space-y-3 px-3 py-4" aria-label={live ? 'Khám phá Live' : 'Danh sách gian hàng'}>
      {live ? <LiveNowSection onOpenHub={() => setScheduleOpen(true)} /> : <>
        <header className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
          <h1 className="m-0 text-lg font-semibold">Gian hàng trên SCANMS</h1>
          <label className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-[#EAE4D7] px-3 text-[#7D715E]">
            <Search size={18} /><input aria-label="Tìm gian hàng" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên shop, ngành hàng…" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
          </label>
        </header>
        {isPending ? <p role="status" className="p-4 text-sm text-[#7D715E]">Đang tải gian hàng…</p> : isError ?
          <div role="alert" className="rounded-xl border border-[#EAE4D7] bg-white p-4 text-sm">Chưa tải được gian hàng. <button onClick={() => void refetch()} className="ml-2 min-h-11 px-3 font-semibold text-[#8C6226]">Thử lại</button></div> :
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Các shop để mua sắm">
            {filtered.map(store => <Link key={store.id} to={`/shops/${store.id}`} className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 no-underline hover:border-[#C59B58]">
              <ShopLogo store={store} /><span className="min-w-0 flex-1"><strong className="flex items-center gap-1 text-sm"><span className="line-clamp-2">{store.name}</span>{store.isVerified && <BadgeCheck size={16} aria-label="Đã xác minh" className="shrink-0 text-[#B88E4F]" />}</strong><span className="mt-1 block text-xs text-[#7D715E]">{store.category || 'Gian hàng đối tác'} · {store.totalProducts ?? 0} sản phẩm</span></span><ChevronRight size={18} className="shrink-0 text-[#B88E4F]" />
            </Link>)}
            {!filtered.length && <p className="p-4 text-sm text-[#7D715E]">{search ? 'Không tìm thấy gian hàng phù hợp.' : 'Chưa có gian hàng được công bố.'}</p>}
          </section>}
      </>}
    </main>
    <LiveCommerceHubModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} />
  </div>;
}
