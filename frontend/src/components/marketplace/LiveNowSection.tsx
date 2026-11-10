import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, Radio, RotateCcw, Play, User } from 'lucide-react';
import api from '@/services/api';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';

interface LiveProduct { id: string; title: string; imageUrl?: string; price?: number | string }
interface LiveSession {
  id: string;
  title: string;
  status: string;
  endsAt: string;
  platform: string;
  liveUrl?: string;
  coverImageUrl?: string;
  viewerCount: number | null;
  pinnedProduct?: LiveProduct | null;
  creator?: { fullName?: string; avatarUrl?: string };
  store?: { name?: string };
  coupon?: { displayCode: string; status: string };
}

function StreamerAvatar({ name, url }: { name: string; url?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">{url && !failed ? <img src={url} alt={name} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <User size={20} aria-label={name} />}</span>;
}

export function LiveNowSection({ onOpenHub }: { onOpenHub: () => void }) {
  const [now, setNow] = useState(Date.now);
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<LiveSession[]>({
    queryKey: ['marketplace-live-sessions'],
    queryFn: async () => {
      const response = await api.get('/live-sessions/public/list');
      const payload = response?.data?.data ?? response?.data ?? response;
      return Array.isArray(payload) ? payload : [];
    },
    refetchInterval: 15_000, staleTime: 10_000,
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const sessions = data.filter((session) => session.status === 'LIVE' && Date.parse(session.endsAt) > now);

  return (
    <section id="live" aria-labelledby="live-now-title" className="scroll-mt-36 bg-[#faf8f5] py-3.5 sm:py-5 text-[#1a1612] text-left">
      <div className="w-full max-w-[1248px] mx-auto px-3 sm:px-4 md:px-6">
        <div className="p-4 sm:p-5 md:p-[20px_24px_22px] border border-[#eae4d7] rounded-[14px] sm:rounded-[16px] bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 flex-wrap min-[381px]:flex-nowrap">
            <span className="grid w-[34px] sm:w-[38px] h-[34px] sm:h-[38px] shrink-0 place-items-center rounded-[10px] bg-[#fbf5eb] text-[#b88e4f]" aria-hidden="true"><Radio size={19} /></span>
            <h2 id="live-now-title" className="m-0 text-[16px] sm:text-[19px] font-semibold leading-[1.4] tracking-[-0.3px]">Live cùng nhà sáng tạo</h2>
            {sessions.length > 0 && <span className="whitespace-nowrap rounded-[6px] bg-[#fbf5eb] px-[7px] py-1 text-[#8c6226] text-[10px] sm:text-[11px] font-semibold max-[380px]:ml-[42px]">{sessions.length} đang phát</span>}
          </div>
          <button type="button" onClick={onOpenHub} className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 sm:gap-1.5 border-0 bg-transparent p-0 text-[#7d715e] text-[11px] sm:text-[12px] font-semibold cursor-pointer hover:text-[#9b6f32] focus-visible:outline-2 focus-visible:outline-[#b88e4f] focus-visible:outline-offset-2 focus-visible:rounded-[6px]">Xem lịch Live<ArrowRight size={15} aria-hidden="true" /></button>
        </div>
        {isLoading ? (
          <div aria-label="Đang tải phiên Live" className="mt-4 border-t border-[#f0ebe3] pt-4" role="status"><span className="block w-[min(250px,75%)] h-7 rounded-[6px] bg-[#f3efe6] animate-pulse" /></div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-between gap-4 mt-3 sm:mt-4 border-t border-[#f0ebe3] pt-3.5 sm:pt-[18px] pb-0.5" role={isError ? 'alert' : undefined}>
            <div>
              <p className="m-0 text-[#1a1612] text-[14px] font-semibold leading-[1.5]">{isError ? 'Chưa tải được phiên Live' : 'Hiện chưa có phiên Live nào'}</p>
              <p className="mt-1 mb-0 text-[#7d715e] text-[12px] leading-[1.5]">{isError ? 'Vui lòng thử tải lại.' : 'Theo dõi lịch để đón xem những phiên tiếp theo.'}</p>
            </div>
            {isError && <button type="button" disabled={isFetching} onClick={() => void refetch()} className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 border-0 bg-transparent p-0 text-[#7d715e] text-[12px] font-semibold cursor-pointer hover:text-[#9b6f32] disabled:cursor-wait disabled:opacity-60"><RotateCcw size={15} aria-hidden="true" />Thử lại</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 mt-4">
            {sessions.slice(0, 6).map((session) => {
              const external = session.platform !== 'SCANMS';
              const safeExternal = session.liveUrl && /^https?:\/\//i.test(session.liveUrl) ? session.liveUrl : null;
              const href = external && safeExternal ? safeExternal : `/live/${session.id}`;
              const name = session.creator?.fullName || 'Nhà sáng tạo SCANMS';
              return (
                <article key={session.id} className="group overflow-hidden rounded-xl border border-[#EAE4D7] bg-white transition hover:border-[#C59B58]">
                  <Link to={href} target={external && safeExternal ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} aria-label={`Xem Live: ${session.title}`} className="block focus-visible:outline-[#C59B58]">
                    <div className="relative aspect-video overflow-hidden bg-[#F3EFE6]">
                      <img src={getSafeProductImageUrl(session.coverImageUrl || session.creator?.avatarUrl, session.title)} alt={`Phiên Live của ${name}`} loading="lazy" className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#231D15]/50 to-transparent" />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-[#DC2626] px-2 py-1 text-[10px] font-black text-white"><span className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" />LIVE</span>
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-[#231D15]/80 px-2 py-1 text-[10px] text-white"><Eye size={13} />{session.viewerCount === null ? 'Live ngoài sàn' : `${Number(session.viewerCount ?? 0).toLocaleString('vi-VN')} đang xem`}</span>
                      <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#B88E4F]"><Play size={16} className="ml-0.5 fill-current" /></span>
                    </div>
                    <div className="p-4">
                      <h3 className="m-0 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{session.title}</h3>
                      <div className="mt-3 flex items-center gap-2.5"><StreamerAvatar name={name} url={session.creator?.avatarUrl} /><div className="min-w-0"><p className="m-0 truncate text-xs font-semibold">{name}</p><p className="mb-0 mt-1 truncate text-[10px] text-[#7D715E]">{session.store?.name}</p></div></div>
                      {session.pinnedProduct && <div className="mt-3 flex items-center gap-2 border-t border-[#EAE4D7] pt-3">
                        <img src={getSafeProductImageUrl(session.pinnedProduct.imageUrl, session.pinnedProduct.title)} alt="" className="h-9 w-9 rounded-md bg-[#FAF8F5] object-contain" />
                        <div className="min-w-0 flex-1"><span className="block truncate text-[11px] text-[#7D715E]">{session.pinnedProduct.title}</span>{session.pinnedProduct.price != null && <span className="text-xs font-semibold text-[#B88E4F]">{formatMoney(Number(session.pinnedProduct.price))}</span>}</div>
                      </div>}
                      {!session.pinnedProduct && session.coupon?.status === 'ACTIVE' && <p className="mb-0 mt-3 border-t border-[#EAE4D7] pt-3 text-[11px] text-[#8C6226]">Voucher: {session.coupon.displayCode}</p>}
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
