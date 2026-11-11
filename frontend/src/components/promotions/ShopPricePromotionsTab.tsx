import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  RefreshCw,
  Clock3,
  CheckCircle2,
  ShieldCheck,
  Ban,
  Calendar,
} from 'lucide-react';
import { pricingApi, requestError } from '../../services/enterprise-pricing.service';
import { ProposePromotionModal } from './ProposePromotionModal';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { toast } from '../../utils/toast';

const money = (val: unknown) =>
  val == null ? '0 đ' : `${Number(val).toLocaleString('vi-VN')} đ`;

let lastPricePromotionsSnapshot: { promotions: any[]; catalog: any[] } | null = null;
registerPrivateCacheReset(() => { lastPricePromotionsSnapshot = null; });

export function ShopPricePromotionsTab() {
  const [promotions, setPromotions] = useState<any[]>(() => lastPricePromotionsSnapshot?.promotions || []);
  const [catalog, setCatalog] = useState<any[]>(() => lastPricePromotionsSnapshot?.catalog || []);
  const [loading, setLoading] = useState<boolean>(() => !lastPricePromotionsSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'FINISHED'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setError(null);
    try {
      const [promotionsRes, catalogRes] = await Promise.all([
        pricingApi.promotions(),
        pricingApi.catalog(),
      ]);
      setPromotions(Array.isArray(promotionsRes) ? promotionsRes : []);
      setCatalog(Array.isArray(catalogRes) ? catalogRes : []);
      lastPricePromotionsSnapshot = { promotions: Array.isArray(promotionsRes) ? promotionsRes : [], catalog: Array.isArray(catalogRes) ? catalogRes : [] };
    } catch (err) {
      setError(requestError(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleCancelPromotion = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy chương trình giảm giá này không? Đơn hàng đã đặt giữ nguyên giá ưu đãi.')) {
      return;
    }
    setCancellingId(id);
    try {
      await pricingApi.cancel(id);
      toast.success('Đã hủy chương trình giảm giá.');
      await loadData(false);
    } catch (err) {
      toast.error(requestError(err));
    } finally {
      setCancellingId(null);
    }
  };

  // Filtered promotions
  const filteredPromotions = promotions.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return p.status === 'PENDING';
    if (activeFilter === 'APPROVED') return p.status === 'APPROVED';
    if (activeFilter === 'ACTIVE') return p.status === 'ACTIVE';
    if (activeFilter === 'FINISHED') return ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(p.status);
    return true;
  });

  // KPI Metrics
  const totalCount = promotions.length;
  const pendingCount = promotions.filter((p) => p.status === 'PENDING').length;
  const activeCount = promotions.filter((p) => p.status === 'ACTIVE').length;
  const totalBudgetUsed = promotions.reduce((sum, p) => sum + Number(p.budgetUsed || 0), 0);
  const totalBudgetPlanned = promotions.reduce((sum, p) => sum + Number(p.budgetTotal || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#B45309]">
            <Clock3 className="h-3 w-3" />
            Chờ Ban Quản Trị duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#EEDFC6] bg-[#F3EFE6] px-2 py-0.5 text-xs font-semibold text-[#8C6226]">
            <ShieldCheck className="h-3 w-3" />
            Đã duyệt · Chờ bắt đầu
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#059669]">
            <CheckCircle2 className="h-3 w-3" />
            Đang áp dụng
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-semibold text-[#DC2626]">
            <Ban className="h-3 w-3" />
            Bị từ chối
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#64748B]">
            Đã hủy
          </span>
        );
      case 'EXPIRED':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#64748B]">
            Đã kết thúc
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls & KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#7D715E]">Tổng đợt ưu đãi</span>
          <p className="mt-1 text-xl font-bold text-[#1A1612]">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#7D715E]">Đang chờ duyệt</span>
          <p className="mt-1 text-xl font-bold text-[#D97706]">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#7D715E]">Đang kích hoạt</span>
          <p className="mt-1 text-xl font-bold text-[#059669]">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-[#7D715E]">Ngân sách đã dùng</span>
          <p className="mt-1 text-lg font-bold text-[#1A1612] truncate">
            {money(totalBudgetUsed)}
          </p>
          <span className="text-[10px] text-[#7D715E]">Kế hoạch: {money(totalBudgetPlanned)}</span>
        </div>
      </div>

      {/* Toolbar: Filter tabs + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Tất cả (${totalCount})` },
            { id: 'PENDING', label: `Chờ duyệt (${pendingCount})` },
            { id: 'ACTIVE', label: `Đang chạy (${activeCount})` },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'FINISHED', label: 'Lịch sử' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === tab.id
                  ? 'bg-[#231D15] text-[#FAF8F5] shadow-xs'
                  : 'bg-[#FAF8F5] text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAE4D7] text-[#7D715E] transition hover:bg-[#FAF8F5] hover:text-[#1A1612]"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#C59B58] px-4 text-xs font-bold text-[#1A1612] shadow-2xs transition hover:bg-[#B88E4F]"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo đề xuất giảm giá</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-xs text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Promotion List */}
      {loading ? (
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center text-xs text-[#7D715E]">
          Đang tải danh sách chương trình giảm giá...
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center">
          <Tag className="mx-auto h-8 w-8 text-[#7D715E]/40" />
          <h4 className="mt-2 text-sm font-semibold text-[#1A1612]">
            Chưa có chương trình giảm giá nào
          </h4>
          <p className="mt-1 text-xs text-[#7D715E]">
            {activeFilter === 'ALL'
              ? 'Tạo đề xuất giảm giá sản phẩm để xúc tiến thương mại có kiểm soát biên lợi nhuận.'
              : 'Không có chương trình nào thuộc bộ lọc này.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#C59B58] px-4 py-2 text-xs font-bold text-[#1A1612] shadow-2xs hover:bg-[#B88E4F]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo đề xuất ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredPromotions.map((item) => {
            const product = item.product;
            const variant = item.variant;
            const listPrice = Number(variant?.listPrice ?? variant?.price ?? product?.listPrice ?? product?.price ?? 0);
            const proposedPrice = Number(item.proposedPrice);
            const discountPct = listPrice > 0 ? Math.round(((listPrice - proposedPrice) / listPrice) * 100) : 0;
            const floorPrice = Number(variant?.floorPrice ?? product?.floorPrice ?? 0);
            const budgetUsed = Number(item.budgetUsed || 0);
            const budgetTotal = Number(item.budgetTotal || 1);
            const budgetPct = Math.min(100, Math.round((budgetUsed / budgetTotal) * 100));

            const imgUrl = getSafeProductImageUrl(
              product?.imageUrl || variant?.imageUrl,
              product?.title,
            );

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs transition hover:border-[#C59B58]/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Product & Info */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={imgUrl}
                      alt={product?.title || 'Sản phẩm'}
                      className="h-14 w-14 shrink-0 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1A1612]">
                          {product?.title || 'Sản phẩm'}
                        </h4>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7D715E]">
                        <span className="font-mono">
                          SKU: {variant?.sku || product?.sku || 'N/A'}
                        </span>
                        <span>·</span>
                        <span>
                          {variant ? `Phân loại: ${variant.name}` : 'Áp dụng: Toàn bộ phân loại'}
                        </span>
                      </div>

                      {/* Pricing block */}
                      <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                        <span className="text-xs text-[#7D715E] line-through">
                          {money(listPrice)}
                        </span>
                        <span className="text-base font-extrabold text-[#B88E4F]">
                          {money(proposedPrice)}
                        </span>
                        {discountPct > 0 && (
                          <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-1.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
                            -{discountPct}%
                          </span>
                        )}
                        {floorPrice > 0 && (
                          <span className="text-xs text-[#7D715E]">
                            (Giá sàn MAP: {money(floorPrice)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                    {['PENDING', 'APPROVED', 'ACTIVE'].includes(item.status) && (
                      <button
                        onClick={() => handleCancelPromotion(item.id)}
                        disabled={cancellingId === item.id}
                        className="rounded-xl border border-[#DC2626]/30 px-3 py-1.5 text-xs font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:opacity-50"
                      >
                        {cancellingId === item.id ? 'Đang hủy...' : 'Hủy ưu đãi'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub details: Timeline + Budget + Reason */}
                <div className="mt-3.5 grid grid-cols-1 gap-2.5 border-t border-[#EAE4D7]/60 pt-3 text-xs sm:grid-cols-3">
                  <div>
                    <span className="flex items-center gap-1 font-medium text-[#7D715E]">
                      <Calendar className="h-3.5 w-3.5" />
                      Thời gian áp dụng:
                    </span>
                    <p className="mt-0.5 font-semibold text-[#1A1612]">
                      {new Date(item.startsAt).toLocaleDateString('vi-VN')} →{' '}
                      {new Date(item.endsAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-[#7D715E]">Tiến độ ngân sách:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAE4D7]">
                        <div
                          className="h-full rounded-full bg-[#C59B58]"
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#1A1612]">
                        {budgetPct}%
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7D715E]">
                      Đã dùng: {money(budgetUsed)} / {money(budgetTotal)}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium text-[#7D715E]">Căn cứ kinh doanh:</span>
                    <p className="mt-0.5 line-clamp-2 italic text-[#1A1612]">
                      "{item.reason}"
                    </p>
                  </div>
                </div>

                {/* Admin review note if rejected or noted */}
                {item.reviewNote && (
                  <div className="mt-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-2.5 text-xs text-[#8C6226]">
                    <span className="font-bold">Ghi chú từ Ban Quản Trị:</span> {item.reviewNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Propose Promotion Modal */}
      {isCreateOpen && (
        <ProposePromotionModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          catalog={catalog}
          onSuccess={() => void loadData(false)}
        />
      )}
    </div>
  );
}
