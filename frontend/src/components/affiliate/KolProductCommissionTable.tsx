import { useState } from 'react';
import { ShoppingBag, Store, Info, Sparkles, Award } from 'lucide-react';
import type { ProductCommissionBreakdownItem } from '../../services/analytics.service';

interface Props {
  items: ProductCommissionBreakdownItem[];
  loading?: boolean;
}

export default function KolProductCommissionTable({ items, loading }: Props) {
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#EAE4D7] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1612]">Sản phẩm tiếp thị & Nguồn hoa hồng</h3>
            <p className="text-[11px] text-[#7D715E]">Chi tiết doanh số và công thức cộng dồn hoa hồng theo từng sản phẩm</p>
          </div>
        </div>
        <div className="py-10 text-center text-xs text-[#7D715E] flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin" />
          <span>Đang tải số liệu sản phẩm...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#EAE4D7] bg-white shadow-xs overflow-hidden">
      {items.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center mb-2.5">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-[#1A1612]">Chưa có đơn hàng tiếp thị theo sản phẩm</h4>
          <p className="text-[11px] text-[#7D715E] max-w-sm mt-1">
            Khi khách hàng chốt đơn qua link hoặc giỏ Livestream của bạn, toàn bộ sản phẩm và công thức bóc tách hoa hồng sẽ hiển thị chi tiết tại đây.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] font-bold text-[11px] uppercase tracking-wider">
                <th className="p-3.5 pl-5">Sản phẩm & Gian hàng</th>
                <th className="p-3.5 text-center">Đã bán</th>
                <th className="p-3.5 text-right">Doanh số (GMV)</th>
                <th className="p-3.5 text-center">Tỷ lệ hoa hồng & Nguồn</th>
                <th className="p-3.5 text-right pr-5">Hoa hồng tích lũy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {items.map((prod) => {
                const b = prod.rateBreakdown;
                const isPopoverOpen = activePopoverId === prod.productId;

                return (
                  <tr key={prod.productId} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    {/* Sản phẩm & Shop */}
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.productImage ? (
                            <img src={prod.productImage} alt={prod.productTitle} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <strong className="text-xs font-bold text-[#1A1612] truncate max-w-[240px] block" title={prod.productTitle}>
                            {prod.productTitle}
                          </strong>
                          <span className="flex items-center gap-1 text-[11px] text-[#7D715E] mt-0.5">
                            <Store className="w-2.5 h-2.5 text-[#B88E4F] shrink-0" />
                            <span className="truncate max-w-[180px]">{prod.storeName}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Số lượng đã bán */}
                    <td className="p-3.5 text-center">
                      <strong className="font-mono font-bold text-xs text-[#1A1612]">
                        {prod.unitsSold} món
                      </strong>
                      <span className="block text-[11px] text-[#7D715E] mt-0.5">({prod.ordersCount} đơn)</span>
                    </td>

                    {/* Doanh số */}
                    <td className="p-3.5 text-right font-mono font-bold text-xs text-[#1A1612]">
                      {prod.grossRevenue.toLocaleString('vi-VN')} ₫
                    </td>

                    {/* Tỷ lệ hoa hồng & Popover bóc tách nguồn */}
                    <td className="p-3.5 text-center relative">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePopoverId(isPopoverOpen ? null : prod.productId)}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FBF5EB] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-[#8A642C] text-xs font-bold transition cursor-pointer shadow-2xs"
                          title="Bấm để xem bóc tách chi tiết nguồn hoa hồng"
                        >
                          <Sparkles className="w-3 h-3 text-[#B88E4F]" />
                          <span>{b.finalRate}%</span>
                          <Info className="w-3 h-3 text-[#B88E4F] group-hover:scale-110 transition" />
                        </button>

                        {/* Interactive Popover Breakdown */}
                        {isPopoverOpen && (
                          <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 p-3 bg-white border border-[#EEDFC6] rounded-xl shadow-lg text-left text-xs animate-in fade-in-50 zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D7]">
                              <span className="font-bold text-[#1A1612] text-[11px] uppercase tracking-wider">
                                Nguồn cấu thành hoa hồng
                              </span>
                              <button
                                type="button"
                                onClick={() => setActivePopoverId(null)}
                                className="text-[#7D715E] hover:text-[#1A1612] text-xs font-bold px-1"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="py-2 space-y-1.5 text-[11px]">
                              <div className="flex justify-between items-center text-[#7D715E]">
                                <span>1. Gốc chuẩn sàn SCANMS:</span>
                                <strong className="text-[#1A1612]">{b.baseRate}%</strong>
                              </div>
                              {b.tierBonus > 0 && (
                                <div className="flex justify-between items-center text-[#7D715E]">
                                  <span>2. Hạng {b.tierName}:</span>
                                  <strong className="text-[#B88E4F]">+{b.tierBonus}%</strong>
                                </div>
                              )}
                              {b.dealBonus > 0 && (
                                <div className="flex justify-between items-center text-[#7D715E]">
                                  <span>3. Deal VIP đàm phán Shop:</span>
                                  <strong className="text-[#B88E4F]">+{b.dealBonus}%</strong>
                                </div>
                              )}
                              {b.liveBonus > 0 && (
                                <div className="flex justify-between items-center text-[#7D715E]">
                                  <span>4. Thưởng phiên Livestream:</span>
                                  <strong className="text-[#B88E4F]">+{b.liveBonus}%</strong>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-1.5 border-t border-[#EAE4D7] font-bold text-[#1A1612]">
                                <span>Tổng tỷ lệ thực nhận:</span>
                                <span className="text-[#B88E4F] font-mono text-xs">{b.finalRate}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Hoa hồng tích lũy */}
                    <td className="p-3.5 pr-5 text-right">
                      <strong className="text-xs font-bold text-[#B88E4F] font-mono block">
                        +{prod.commissionEarned.toLocaleString('vi-VN')} ₫
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
