import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone } from 'lucide-react';
import api from '@/services/api';
import { StoreLogo } from './FeaturedStores';
import type { MarketplaceStore } from '@/types/marketplace-home.types';

interface Placement { store: MarketplaceStore; headline: string; endsAt: string }

export function SponsoredStores() {
  const { data = [] } = useQuery<Placement[]>({
    queryKey: ['marketplace-sponsored-placements'],
    queryFn: async () => {
      const response = await api.get('/stores/public/placements');
      const payload = response?.data?.data ?? response?.data ?? response;
      return Array.isArray(payload) ? payload : [];
    },
    staleTime: 30_000, refetchInterval: 30_000,
  });
  const placements = data.filter((placement) => Date.parse(placement.endsAt) > Date.now());
  if (!placements.length) return null;

  return (
    <section aria-label="Gian hàng tài trợ nổi bật" className="bg-[#FAF8F5] pb-8 text-left">
      <div className="mx-auto grid max-w-[1200px] gap-4 px-3 sm:px-4 lg:px-6">
        {placements.map(({ store, headline }) => (
          <article key={store.id} className="relative overflow-hidden rounded-3xl border border-[#EEDFC6] bg-[#231D15] p-6 text-white sm:p-8">
            <div aria-hidden="true" className="absolute -right-8 -top-16 h-52 w-52 rounded-full border-[30px] border-[#C59B58]/15" />
            <div className="relative grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <StoreLogo store={store} className="h-20 w-20" />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C59B58] px-3 py-1 text-[11px] font-black text-[#231D15]"><Megaphone size={13} />Được tài trợ</span>
                <p className="mb-1 mt-3 text-xs font-semibold text-[#EEDFC6]">{store.name}</p>
                <h2 className="m-0 max-w-xl text-xl font-black tracking-tight sm:text-2xl">{headline}</h2>
                <p className="mb-0 mt-2 max-w-xl text-xs leading-5 text-[#EAE4D7]">{store.description || 'Khám phá sản phẩm và chương trình đang áp dụng tại gian hàng.'}</p>
              </div>
              <Link to={`/shops/${store.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C59B58] px-5 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F]">Ghé thăm gian hàng<ArrowRight size={16} /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
