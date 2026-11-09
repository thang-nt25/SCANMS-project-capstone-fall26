import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  Clock,
  Info,
  CheckCircle2,
  TrendingUp,
  Award,
  X,
} from 'lucide-react';
import type { WalletSummary } from '../../types/wallet.types';

interface WalletFinancialBreakdownProps {
  wallet: WalletSummary | null;
  onSelectStoreForWithdraw?: (storeId: string) => void;
  formatMoney: (val: string) => string;
}

const STORE_CATEGORY_MAPPING: Record<string, string> = {
  'sora skincare & cosmetics': 'Mỹ phẩm & Chăm sóc da chuyên sâu',
  'aura activewear & apparel': 'Thời trang & May mặc thể thao',
  'greenbio health & nutrition': 'Dinh dưỡng, Thảo mộc & Sức khỏe',
  'lumière smart living': 'Thiết bị & Gia dụng thông minh',
};

export const WalletFinancialBreakdown: React.FC<WalletFinancialBreakdownProps> = ({
  wallet,
  formatMoney,
}) => {
  const [showDealModal, setShowDealModal] = useState(false);

  if (!wallet) return null;

  const totalWalletAvailable = Number(wallet.availableBalance || 0);
  const totalWalletPending = Number(wallet.pendingBalance || 0);

  // Group all known cooperation stores or fallback to wallet stores
  const storeRows = (wallet.cooperationStores && wallet.cooperationStores.length > 0
    ? wallet.cooperationStores
    : wallet.stores.map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        logoUrl: null,
        availableBalance: s.availableBalance,
        pendingBalance: s.pendingBalance,
        hasWallet: true,
        status: 'APPROVED' as const,
        requestedByKol: false,
      }))
  ).map((store) => {
    const rawAvail = Number(store.availableBalance || 0);
    // Capped by wallet.availableBalance to prevent any desync display
    const cappedAvail = Math.min(rawAvail, totalWalletAvailable);
    const pending = Number(store.pendingBalance || 0);
    const category =
      STORE_CATEGORY_MAPPING[store.storeName.toLowerCase()] ||
      'Nhãn hàng trực thuộc SCANMS';

    // Check for active deal matching this store
    const storeDeal = wallet.activeDeals?.find(
      (deal) => deal.storeId === store.storeId,
    );

    return {
      ...store,
      cappedAvail,
      pending,
      category,
      storeDeal,
    };
  });

  return (
    <>
      <section
        aria-label="Bảng phân bổ thu nhập theo nhãn hàng"
        className="rounded-2xl border border-[#DFD6C5] bg-white p-4 sm:p-5 shadow-xs"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4D7]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
              <Store className="w-4 h-4 text-[#B88E4F]" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">
              Bảng Phân Bổ Thu Nhập Theo Nhãn Hàng
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-[11px] font-semibold text-[#8C6226]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Sổ cái Đối soát Minh bạch</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setShowDealModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[11px] font-bold text-[#1A1612] transition cursor-pointer select-none"
            >
              <Info className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Quy chế thưởng 4% Deal</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="mt-3.5 overflow-x-auto rounded-xl border border-[#EAE4D7]">
          <table className="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead className="bg-[#FAF8F5] text-[10.5px] font-bold uppercase tracking-wider text-[#7D715E] border-b border-[#EAE4D7]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5">
                  Nhãn hàng trực thuộc
                </th>
                <th scope="col" className="px-3.5 py-2.5 text-right">
                  Khả dụng rút
                </th>
                <th scope="col" className="px-3.5 py-2.5 text-right">
                  Bảo chứng 14 ngày
                </th>
                <th scope="col" className="px-3.5 py-2.5 text-center">
                  Thưởng Deal VIP
                </th>
                <th scope="col" className="px-3.5 py-2.5 text-center">
                  Trạng thái đối soát
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {storeRows.map((row) => (
                <tr
                  key={row.storeId}
                  className="hover:bg-[#FAF8F5]/80 transition-colors"
                >
                  {/* Nhãn hàng */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EEDFC6] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {row.logoUrl ? (
                          <img
                            src={row.logoUrl}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Store className="w-4 h-4 text-[#B88E4F]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-[#1A1612] block truncate">
                          {row.storeName}
                        </span>
                        <span className="text-[10px] text-[#7D715E] block truncate mt-0.5">
                          {row.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Khả dụng rút ngay */}
                  <td className="px-3.5 py-3 text-right">
                    <span className="font-mono text-xs sm:text-[13px] font-bold text-[#1A1612] tabular-nums block">
                      {formatMoney(row.cappedAvail.toString())}
                    </span>
                  </td>

                  {/* Bảo chứng 14 ngày */}
                  <td className="px-3.5 py-3 text-right">
                    <span className="font-mono text-xs sm:text-[13px] font-semibold text-[#8C6226] tabular-nums block">
                      {formatMoney(row.pending.toString())}
                    </span>
                  </td>

                  {/* Thưởng Deal VIP */}
                  <td className="px-3.5 py-3 text-center">
                    {row.storeDeal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowDealModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[10.5px] font-bold text-[#8C6226] transition cursor-pointer"
                        title="Bấm để xem chi tiết điều kiện giải tỏa"
                      >
                        <TrendingUp size={11} className="text-[#B88E4F]" />
                        <span>
                          +{row.storeDeal.bonusRate || 4}% Deal (
                          {row.storeDeal.targetOrders
                            ? `${row.storeDeal.targetOrders} đơn`
                            : 'Doanh thu'}
                          )
                        </span>
                      </button>
                    ) : (
                      <span className="text-[#7D715E] text-xs">—</span>
                    )}
                  </td>

                  {/* Trạng thái đối soát */}
                  <td className="px-3.5 py-3 text-center">
                    {row.cappedAvail > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] text-[10px] font-semibold text-[#059669]">
                        <CheckCircle2 size={11} />
                        <span>Đã đối soát an toàn</span>
                      </span>
                    ) : row.pending > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] text-[10px] font-semibold text-[#D97706]">
                        <Clock size={11} />
                        <span>Đang bảo chứng GHN</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-[#7D715E]">
                        Chưa phát sinh
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Dòng Tổng Kết Sổ Cái */}
              <tr className="bg-[#FAF8F5]/90 font-bold border-t-2 border-[#EAE4D7]">
                <td className="px-3.5 py-3 text-[#1A1612]">
                  <div className="flex items-center gap-1.5">
                    <span>Tổng cộng toàn hệ thống</span>
                    <span className="text-[10px] font-normal text-[#7D715E]">
                      ({storeRows.length} nhãn hàng)
                    </span>
                  </div>
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-xs sm:text-[13px] text-[#1A1612] tabular-nums">
                  {formatMoney(totalWalletAvailable.toString())}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-xs sm:text-[13px] text-[#8C6226] tabular-nums">
                  {formatMoney(totalWalletPending.toString())}
                </td>
                <td className="px-3.5 py-3 text-center text-[11px] text-[#7D715E] font-normal">
                  <span className="font-mono font-semibold text-[#8C6226]">
                    {formatMoney(wallet.conditionalDealEscrowBalance || '0')}
                  </span>
                  <span className="block text-[10px] text-[#7D715E]">Quỹ Escrow Deal</span>
                </td>
                <td className="px-3.5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#059669] font-bold">
                    <CheckCircle2 size={12} />
                    <span>Khớp 100% ví tổng</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Chi Tiết Tiền 4% Deal VIP & Thưởng Mốc FR-09 */}
      {showDealModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#DFD6C5] bg-white p-5 sm:p-6 shadow-xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
                  <Award size={16} />
                </div>
                <div>
                  <h3
                    id="deal-modal-title"
                    className="text-base font-bold text-[#1A1612] m-0"
                  >
                    Chi Tiết Tiền Thưởng Deal VIP & Thưởng Mốc
                  </h3>
                  <span className="text-[11px] text-[#7D715E]">
                    Cơ chế ký quỹ chênh lệch KPI [Deal% − (10% + Bậc%)] & Điều kiện giải tỏa thù lao
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDealModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer"
                aria-label="Đóng modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nội dung giải thích công thức */}
            <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3.5 space-y-2">
              <span className="font-bold text-xs text-[#8C6226] block">
                📐 Cơ chế tính thù lao 2 giai đoạn (Nguyên tắc KHÔNG cộng dồn Deal & Bậc):
              </span>
              <div className="p-2.5 rounded-lg bg-white border border-[#EEDFC6] font-mono text-xs text-[#1A1612] leading-relaxed">
                <strong>Tổng thù lao thỏa thuận (Deal%)</strong> ={' '}
                <span className="text-[#059669]">Tiêu chuẩn (10% Gốc + Bậc%)</span> +{' '}
                <span className="text-[#B88E4F]">Ký quỹ KPI [Deal% − (10% + Bậc%)]</span>
              </div>
              <ul className="text-[11.5px] text-[#7D715E] space-y-1.5 pl-4 list-disc m-0">
                <li>
                  <strong className="text-[#1A1612]">Khoản 1 (Tiêu chuẩn 10% + Bậc):</strong> Được
                  ghi nhận vào giỏ đối soát 14 ngày khi giao thành công. Hết 14 ngày không đổi trả
                  sẽ tự động mở khóa 100% sang <strong>Khả dụng rút tiền</strong>, bảo toàn quyền lợi tối thiểu của KOL.
                </li>
                <li>
                  <strong className="text-[#1A1612]">Khoản 2 (Chênh lệch KPI Deal):</strong>{' '}
                  Được bảo lưu an toàn trong giỏ <strong>Escrow Deal</strong>{' '}
                  cho đến khi KOC hoàn thành đủ 100% KPI cam kết và đơn hàng đã vượt mốc 14 ngày sạch.
                  Không cộng dồn trùng với bậc xếp hạng.
                </li>
              </ul>
            </div>

            {/* Danh sách Deal VIP đang chạy */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-[#1A1612] block">
                Hợp đồng Deal VIP đang có hiệu lực trên tài khoản:
              </span>

              {wallet.activeDeals && wallet.activeDeals.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {wallet.activeDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] hover:border-[#C59B58] transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-[#1A1612] block truncate">
                            {deal.store.name}
                          </span>
                          <span className="text-[11px] text-[#7D715E] block mt-0.5">
                            Mức thù lao: <strong>{deal.approvedCommissionRate || deal.proposedCommissionRate}%</strong>{' '}
                            (Cơ sở 10% + Thưởng Deal {deal.bonusRate}%)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] text-[10px] font-bold text-[#059669] shrink-0">
                          Đang kích hoạt
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#EAE4D7] flex items-center justify-between text-[10.5px]">
                        <span className="text-[#7D715E]">Điều kiện giải tỏa:</span>
                        <span className="font-bold text-[#8C6226]">
                          {deal.targetOrders
                            ? `Đạt ${deal.targetOrders} đơn hàng hoàn tất`
                            : `Đạt doanh số ${formatMoney(deal.targetRevenue?.toString() || '0')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[#EAE4D7] text-center text-xs text-[#7D715E]">
                  Hiện tại bạn đang áp dụng mức thù lao tiêu chuẩn 10%. Hãy thảo luận với Giám đốc Nhãn hàng để nhận Deal VIP độc quyền!
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDealModal(false)}
                className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Đã hiểu quy chế
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
