import { Radio, Video, ShoppingBag, Store, Calendar, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import type { LiveSessionSummaryItem } from '../../services/analytics.service';

interface Props {
  sessions: LiveSessionSummaryItem[];
  totals: {
    totalLiveRevenue: number;
    totalLiveCommission: number;
    totalLiveOrders: number;
  };
  loading?: boolean;
}

export default function KolLivePerformanceCard({ sessions, totals, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1612]">Hiệu suất bán hàng qua Livestream</h3>
            <p className="text-[11px] text-[#7D715E]">Doanh số và hoa hồng thưởng từ các phiên live</p>
          </div>
        </div>
        <div className="py-10 text-center text-xs text-[#7D715E] flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin" />
          <span>Đang tải số liệu Livestream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#EAE4D7] bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#EAE4D7] bg-[#FAF8F5]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1A1612] m-0">Doanh số & Hoa hồng Livestream</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[10px] font-bold text-[#8A642C]">
                +2% thưởng Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EAE4D7] border-b border-[#EAE4D7] bg-white">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E] block">
              Tổng doanh số Live (GMV)
            </span>
            <strong className="text-sm sm:text-base font-black text-[#1A1612] font-mono block">
              {totals.totalLiveRevenue.toLocaleString('vi-VN')} ₫
            </strong>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E] block">
              Hoa hồng kiếm từ Live
            </span>
            <strong className="text-sm sm:text-base font-black text-[#B88E4F] font-mono block">
              +{totals.totalLiveCommission.toLocaleString('vi-VN')} ₫
            </strong>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D715E] block">
              Đơn chốt trong phiên
            </span>
            <strong className="text-sm sm:text-base font-black text-[#1A1612] block">
              {totals.totalLiveOrders} đơn hàng
            </strong>
          </div>
        </div>
      </div>

      {/* List of Sessions */}
      {sessions.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center mb-2.5">
            <Video className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-[#1A1612]">Chưa phát sinh phiên Livestream</h4>
          <p className="text-[11px] text-[#7D715E] max-w-sm mt-1">
            Khi bạn tham gia phiên Livestream gắn giỏ hàng sản phẩm cùng gian hàng, số liệu đơn chốt và thưởng Live +2% sẽ được tổng kết tại đây.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE4D7]">
          {sessions.map((sess) => {
            const isLive = sess.status === 'LIVE';
            const m = sess.metrics;

            return (
              <div key={sess.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5]/80 transition">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden shrink-0 flex items-center justify-center relative">
                    {sess.coverImageUrl ? (
                      <img src={sess.coverImageUrl} alt={sess.title} className="w-full h-full object-cover" />
                    ) : (
                      <Radio className="w-5 h-5 text-[#B88E4F]" />
                    )}
                    {isLive && (
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs font-bold text-[#1A1612] truncate max-w-[260px] block" title={sess.title}>
                        {sess.title}
                      </strong>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isLive
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-[#FBF5EB] text-[#8A642C] border-[#EEDFC6]'
                        }`}
                      >
                        {isLive ? '🔴 Đang diễn ra' : '✓ Đã kết thúc'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#7D715E] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Store className="w-2.5 h-2.5 text-[#B88E4F]" />
                        <span>{sess.storeName}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-[#B88E4F]" />
                        <span>
                          {new Date(sess.startsAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-[#1A1612]">{sess.pinnedProductsCount} sản phẩm ghim</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EAE4D7] w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] text-[#7D715E]">Đơn chốt / SL</span>
                    <strong className="text-xs font-bold text-[#1A1612]">
                      {m.ordersCount} đơn ({m.unitsSold} món)
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-[#7D715E]">Doanh số</span>
                    <strong className="text-xs font-mono font-bold text-[#1A1612]">
                      {m.grossRevenue.toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-[#7D715E]">Hoa hồng Live (+{sess.liveBonusRate}%)</span>
                    <strong className="text-xs font-mono font-bold text-[#B88E4F]">
                      +{m.commissionEarned.toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
