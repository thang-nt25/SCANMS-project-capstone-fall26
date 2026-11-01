import { useState, useEffect, useRef } from 'react';
import { Handshake, X, Loader2, Check, Package, Sparkles, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { referralLinksService } from '../../services/referral-links.service';
import { formatMoney } from '../../utils/marketplace.utils';

interface Props {
  collaboratorId: string;
  collaboratorName: string;
  storeId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductItem {
  id: string;
  title: string;
  imageUrl?: string;
  price: number;
  isAffiliateEnabled?: boolean;
}

export function CreateExclusiveDealModal({
  collaboratorId,
  collaboratorName,
  storeId,
  onClose,
  onSuccess,
}: Props) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [commissionRate, setCommissionRate] = useState<number>(14);
  const [targetOrders, setTargetOrders] = useState<number>(30);
  const [commitmentDays, setCommitmentDays] = useState<number>(14);
  const [salesCommitment, setSalesCommitment] = useState<string>(
    'Đề xuất thỏa thuận phân phối độc quyền với mức thù lao ưu đãi.'
  );

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const params: Record<string, any> = { limit: 50 };
    if (storeId && UUID_REGEX.test(storeId)) {
      params.storeId = storeId;
    }
    api
      .get('/products', {
        params,
        headers: { 'x-skip-cache': '1' },
      })
      .then((res: any) => {
        if (cancelled) return;
        const payload = res?.data ?? res;
        const list = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
        const eligible = list.filter((p: any) => p.isAffiliateEnabled !== false);
        setProducts(eligible);
        if (eligible.length > 0) {
          setSelectedProductId(eligible[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Vui lòng chọn một sản phẩm áp dụng thỏa thuận.');
      return;
    }
    if (commissionRate < 11 || commissionRate > 16) {
      setError('Mức thù lao độc quyền phải từ 11% đến 16% (khung tự trị của Nhãn hàng).');
      return;
    }
    if (targetOrders < 1) {
      setError('Cam kết số đơn hàng phải từ 1 trở lên.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await referralLinksService.createShopDealOffer({
        collaboratorId,
        productId: selectedProductId,
        proposedCommissionRate: commissionRate,
        targetOrders,
        commitmentDays,
        salesCommitment: salesCommitment.trim() || 'Thỏa thuận thù lao độc quyền',
      });
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Không thể gửi đề xuất thỏa thuận lúc này.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1612]/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#EAE4D7] shadow-xl overflow-hidden text-[#1A1612]"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
              <Handshake className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h2 id="deal-modal-title" className="text-sm font-bold text-[#1A1612]">
                Đề xuất Thỏa thuận Độc quyền
              </h2>
              <p className="text-[11px] text-[#7D715E]">
                Ký kết thỏa thuận hợp tác 1-1 với nhà sáng tạo{' '}
                <strong className="text-[#1A1612] font-semibold">{collaboratorName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Chọn sản phẩm */}
          <div>
            <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
              1. Chọn sản phẩm áp dụng thỏa thuận <span className="text-[#DC2626]">*</span>
            </label>
            {loadingProducts ? (
              <div className="flex items-center justify-center py-6 text-xs text-[#7D715E] bg-[#FAF8F5] rounded-xl border border-[#EAE4D7]">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#B88E4F]" />
                Đang tải danh mục sản phẩm của Nhãn hàng...
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 text-xs text-[#7D715E] bg-[#FAF8F5] rounded-xl border border-[#EAE4D7] text-center">
                Nhãn hàng chưa có sản phẩm nào mở tiếp thị liên kết.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto p-1 border border-[#EAE4D7] rounded-xl bg-[#FAF8F5]">
                {products.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProductId(p.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg text-left transition cursor-pointer border ${
                        isSelected
                          ? 'border-[#C59B58] bg-[#FFFFFF] shadow-2xs'
                          : 'border-transparent bg-transparent hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-md border border-[#EAE4D7] bg-[#FFFFFF] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-[#7D715E]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1A1612] truncate">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-[#7D715E]">
                          Giá niêm yết: <strong className="text-[#1A1612]">{formatMoney(p.price)}</strong> · Thù lao cơ sở: 10%
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#C59B58] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Mức thù lao độc quyền đề xuất (11% - 16%) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1A1612]">
                2. Mức thù lao độc quyền đề xuất <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-[11px] font-semibold text-[#B88E4F]">
                Đang chọn: <strong className="text-sm font-black">{commissionRate}%</strong> (Tăng +{commissionRate - 10}% so với chuẩn)
              </span>
            </div>
            <p className="text-[11px] text-[#7D715E] mb-2">
              Khung tự trị của Giám đốc Nhãn hàng từ <strong>11%</strong> đến tối đa <strong>16%</strong> (vượt trên 16% cần Tổng Giám đốc phê duyệt).
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {[11, 12, 13, 14, 15, 16].map((rate) => {
                const isActive = commissionRate === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setCommissionRate(rate)}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition cursor-pointer ${
                      isActive
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]'
                        : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <div>{rate}%</div>
                    <div className="text-[9px] font-normal text-[#7D715E]">+{rate - 10}%</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Cam kết KPI & Thời hạn */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                3. Cam kết số đơn hàng (KPI) <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={targetOrders}
                  onChange={(e) => setTargetOrders(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none"
                  placeholder="Ví dụ: 30"
                />
                <span className="absolute right-3 top-2 text-xs text-[#7D715E]">đơn</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                4. Thời hạn cam kết <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={7}
                  max={90}
                  value={commitmentDays}
                  onChange={(e) => setCommitmentDays(Math.max(7, Number(e.target.value) || 7))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none"
                  placeholder="Ví dụ: 14"
                />
                <span className="absolute right-3 top-2 text-xs text-[#7D715E]">ngày</span>
              </div>
            </div>
          </div>

          {/* 4. Nội dung cam kết / Ghi chú thỏa thuận */}
          <div>
            <label className="block text-xs font-bold text-[#1A1612] mb-1">
              5. Ghi chú điều khoản hợp tác
            </label>
            <textarea
              rows={2}
              value={salesCommitment}
              onChange={(e) => setSalesCommitment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none resize-none"
              placeholder="Ghi chú thêm về video review, livestream hoặc kênh truyền thông dự kiến..."
            />
          </div>

          {/* Tóm tắt thỏa thuận */}
          {selectedProduct && (
            <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs text-[#1A1612] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#8C6226]">
                <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
                Tóm tắt hợp đồng thỏa thuận:
              </div>
              <div className="text-[11px] text-[#7D715E] leading-relaxed">
                Nhãn hàng đề xuất mức thù lao <strong>{commissionRate}%</strong> cho sản phẩm <strong>{selectedProduct.title}</strong>. Đối tác <strong>{collaboratorName}</strong> cam kết hoàn thành tối thiểu <strong>{targetOrders} đơn hàng</strong> trong vòng <strong>{commitmentDays} ngày</strong>. Sau khi đối tác bấm đồng ý trong khung chat, hệ thống sẽ tự động kích hoạt mã định danh và link phân phối độc quyền.
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EAE4D7] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedProductId}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gửi đề xuất...</span>
              </>
            ) : (
              <>
                <Handshake className="w-3.5 h-3.5 stroke-[2]" />
                <span>Gửi Thỏa Thuận Độc Quyền</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
