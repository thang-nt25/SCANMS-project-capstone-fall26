import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Handshake,
  X,
  Loader2,
  Check,
  Package,
  AlertCircle,
  HelpCircle,
  Search,
  Lock,
  AlertTriangle,
  Percent,
} from 'lucide-react';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { referralLinksService } from '../../services/referral-links.service';
import { formatMoney } from '../../utils/marketplace.utils';

type Choice = { id: string; fullName: string };

interface Props {
  collaborator?: Choice;
  productId?: string;
  storeId?: string;
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
  mode?: 'offer' | 'proposal';
  initialProductIds?: string[];
}

interface ProductItem {
  id: string;
  title: string;
  imageUrl?: string;
  price: number;
  storeId: string;
  storeName: string;
  baseRate: number;
  activeDeal?: {
    id: string;
    status: string;
    proposedRate: number;
    approvedRate: number | null;
    effectiveRate: number;
    commitmentEndsAt: string | null;
    isLocked: boolean;
    remainingDays: number | null;
  } | null;
}

export function ExclusiveOfferModal({
  collaborator,
  productId,
  storeId,
  onClose,
  onSuccess,
  mode = 'proposal',
  initialProductIds = [],
}: Props) {
  const currentUser = authService.getCurrentUser();
  const collaboratorId =
    collaborator?.id || (currentUser?.role === 'COLLABORATOR' ? currentUser.id : '');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialProductIds.length > 0 ? initialProductIds : productId ? [productId] : []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [rate, setRate] = useState<number | ''>(14);
  const [targetRevenue, setTargetRevenue] = useState<number | ''>(10000000);
  const [days, setDays] = useState<number | ''>(14);
  const [plan, setPlan] = useState<string>(
    'Thực hiện video review chuyên sâu giới thiệu sản phẩm và hướng dẫn khách mua qua link tiếp thị độc quyền.'
  );
  const [showHelpPopover, setShowHelpPopover] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);

  // Load products with lock status
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const targetCollabId = collaboratorId || currentUser?.id || '';
    referralLinksService
      .getCollaboratorDealProducts(targetCollabId, storeId)
      .then((items: ProductItem[]) => {
        if (!active) return;
        setProducts(items);
        if (selectedProductIds.length === 0 && items.length > 0) {
          const firstUnlocked = items.find((p) => !p.activeDeal?.isLocked) || items[0];
          setSelectedProductIds([firstUnlocked.id]);
        }
      })
      .catch(() => {
        if (active) setError('Không tải được danh sách sản phẩm. Vui lòng đóng và thử lại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collaboratorId, storeId]);

  // Handle escape & outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const toggleProduct = (p: ProductItem) => {
    if (p.activeDeal?.isLocked) return;
    setSelectedProductIds((prev) => {
      if (prev.includes(p.id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== p.id);
      } else {
        return [...prev, p.id];
      }
    });
  };

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
  const primaryProduct = selectedProducts[0] || products[0];

  const handleRatePreset = (preset: number) => {
    setRate(preset);
  };

  const handleRateChange = (val: string) => {
    if (val === '') {
      setRate('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setRate(num);
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || selectedProductIds.length === 0 || !primaryProduct) return;
    lock.current = true;
    setBusy(true);
    setError(null);

    const numRate = Number(rate) || 14;
    const numTargetRev = Number(targetRevenue) || 10000000;
    const numDays = Number(days) || 14;

    try {
      const isMulti = selectedProductIds.length > 1;
      const scopeType = isMulti ? 'SELECTED_PRODUCTS' : 'SINGLE_PRODUCT';

      const response: any = await api.post(
        mode === 'proposal' ? '/affiliate-deals/proposals' : '/affiliate-deals/offers',
        {
          ...(mode === 'offer' ? { collaboratorId } : {}),
          productId: primaryProduct.id,
          proposedCommissionRate: numRate,
          scopeType,
          ...(isMulti ? { productIds: selectedProductIds } : {}),
          targetRevenue: numTargetRev,
          commitmentDays: numDays,
          videoReviewCommitment: true,
          salesCommitment: plan.trim(),
        },
        { timeout: 95000 }
      );

      const offer = response?.data?.data || response?.data || response;
      if (!offer?.conversationId) {
        throw new Error('Phản hồi chưa có mã cuộc hội thoại.');
      }
      onSuccess(offer.conversationId);
    } catch (caught: any) {
      const message = caught?.response?.data?.message || caught?.message;
      setError(
        Array.isArray(message) ? message.join('. ') : message || 'Không gửi được đề xuất thỏa thuận.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const presetPills = [12, 14, 16, 18];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="koc-deal-title"
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#1A1612] shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D7] px-6 py-4 bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#231D15] text-[#C59B58] shadow-xs">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h2 id="koc-deal-title" className="text-base font-bold text-[#1A1612] sm:text-lg">
                {mode === 'proposal'
                  ? 'Đề xuất Thỏa thuận Thù lao VIP'
                  : 'Đề nghị Thỏa thuận Độc quyền'}
              </h2>
              <p className="text-xs text-[#7D715E]">
                {mode === 'proposal'
                  ? 'Gửi đề xuất mức thù lao ưu đãi kèm cam kết doanh số tới Giám đốc Nhãn hàng'
                  : 'Ký kết thỏa thuận hợp tác 1–1 với nhà sáng tạo nội dung'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Body */}
        <form onSubmit={submit} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT COLUMN: Product Catalog & Multi-Select */}
          <div className="w-full md:w-1/2 p-6 bg-[#F3EFE6]/40 flex flex-col border-b md:border-b-0 md:border-r border-[#EAE4D7]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#1A1612]">
                1. Chọn sản phẩm áp dụng thù lao *
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#C59B58]/15 text-[#8C6226]">
                Đã chọn: {selectedProductIds.length} sản phẩm
              </span>
            </div>
            <p className="text-xs text-[#7D715E] mb-3">
              Chọn một hoặc nhiều sản phẩm bạn muốn đề xuất thù lao ưu đãi. Sản phẩm đang có hợp đồng KPI còn hạn sẽ bị khóa chống trùng lặp.
            </p>

            {/* Search Box */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7D715E]" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#EAE4D7] bg-white pl-9 pr-3 py-2 text-xs text-[#1A1612] placeholder-[#7D715E] focus:border-[#C59B58] focus:outline-none"
              />
            </div>

            {/* Product List */}
            <div className="flex-1 max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#7D715E]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B88E4F] mb-2" />
                  <span className="text-xs">Đang tải danh sách sản phẩm...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#7D715E] bg-white rounded-xl border border-dashed border-[#EAE4D7] p-4 text-center">
                  <Package className="w-8 h-8 text-[#7D715E]/50 mb-2" />
                  <span className="text-xs">Không tìm thấy sản phẩm phù hợp</span>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isLocked = Boolean(p.activeDeal?.isLocked);

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isLocked && toggleProduct(p)}
                      className={`relative flex items-center gap-3 p-2.5 rounded-xl border transition-all select-none ${
                        isLocked
                          ? 'bg-[#FAF8F5] border-[#EAE4D7] opacity-65 cursor-not-allowed'
                          : isSelected
                          ? 'bg-white border-[#B88E4F] ring-1 ring-[#C59B58] shadow-xs cursor-pointer'
                          : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/60 cursor-pointer'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isLocked
                            ? 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
                            : isSelected
                            ? 'bg-[#C59B58] border-[#B88E4F] text-white'
                            : 'bg-white border-[#EAE4D7]'
                        }`}
                      >
                        {isLocked ? <Lock size={11} /> : isSelected ? <Check size={13} strokeWidth={3} /> : null}
                      </div>

                      {/* Thumbnail Image */}
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-11 w-11 rounded-lg border border-[#EAE4D7] object-cover bg-white shrink-0"
                        />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F] shrink-0">
                          <Package size={18} />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#1A1612] truncate leading-tight">
                          {p.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#7D715E]">
                          <span className="font-semibold text-[#1A1612]">
                            {formatMoney(p.price)}
                          </span>
                          <span>•</span>
                          <span>Thù lao cơ sở: <strong>{p.baseRate ?? 10}%</strong></span>
                        </div>

                        {/* Deal Lock / Status Badge */}
                        {p.activeDeal && (
                          <div className="mt-1.5 flex items-center gap-1">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-1.5 py-0.5 rounded">
                                <Lock size={9} />
                                Đang có deal {p.activeDeal.effectiveRate}% (còn {p.activeDeal.remainingDays ?? 'vài'} ngày)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 rounded">
                                Đang áp dụng: {p.activeDeal.effectiveRate}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Deal Terms & Pitch Form */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[75vh]">
            <div className="space-y-4">
              {/* Section 2: Commission Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-bold text-[#1A1612]">
                      2. Mức thù lao độc quyền đề xuất *
                    </label>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setShowHelpPopover(!showHelpPopover)}
                        className="text-[#7D715E] hover:text-[#B88E4F] transition-colors p-0.5"
                        title="Xem quy định thẩm quyền phê duyệt"
                        aria-label="Xem quy định thẩm quyền phê duyệt"
                      >
                        <HelpCircle size={15} />
                      </button>
                      {showHelpPopover && (
                        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-3 bg-white border border-[#EAE4D7] rounded-xl shadow-xl text-xs text-[#1A1612] animate-in fade-in zoom-in-95">
                          <div className="font-bold text-[#8C6226] mb-1 flex items-center gap-1">
                            <Percent size={13} /> Quy định thẩm quyền thù lao:
                          </div>
                          <ul className="space-y-1 text-[#7D715E] list-disc pl-4 text-[11px] leading-relaxed">
                            <li>
                              <strong className="text-[#1A1612]">Từ 11% đến 16%:</strong> Giám đốc Nhãn hàng có thẩm quyền tự trị phê duyệt trực tiếp.
                            </li>
                            <li>
                              <strong className="text-[#1A1612]">Trên 16% (17% – 25%):</strong> Sau khi Nhãn hàng đồng ý, đề xuất sẽ được chuyển lên <strong>Tổng Giám Đốc (Admin)</strong> phê duyệt ngoại lệ ngân sách.
                            </li>
                          </ul>
                          <button
                            type="button"
                            onClick={() => setShowHelpPopover(false)}
                            className="mt-2 text-[10px] text-[#B88E4F] font-semibold hover:underline block text-right w-full"
                          >
                            Đã hiểu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#8C6226]">
                    Đang chọn: <strong className="text-sm text-[#1A1612]">{rate}%</strong>
                    {(Number(rate) || 0) > 10 ? ` (+${(Number(rate) || 0) - 10}% so với gốc)` : ''}
                  </span>
                </div>

                {/* Rate Input + Stepper */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="10"
                      max="25"
                      step="0.5"
                      value={rate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      onBlur={() =>
                        setRate((prev) =>
                          prev === '' ? 14 : Math.min(25, Math.max(10, Number(prev)))
                        )
                      }
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm font-bold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-sm font-bold text-[#7D715E]">%</span>
                  </div>
                </div>

                {/* Quick Preset Pills */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7D715E] font-medium whitespace-nowrap">Gợi ý nhanh:</span>
                  <div className="flex items-center gap-1.5">
                    {presetPills.map((p) => {
                      const isSelected = rate === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleRatePreset(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]'
                              : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          {p}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Warning Banner if Rate > 16% */}
                {(Number(rate) || 0) > 16 && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-2.5 text-left">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                    <div className="text-[11px] leading-relaxed text-[#8C6226]">
                      <strong className="block font-bold">Thù lao {rate}% vượt trần tự trị (16%)</strong>
                      Mức này cần <strong>Tổng Giám Đốc (Admin)</strong> phê duyệt ngoại lệ ngân sách sau khi Nhãn hàng đồng ý trước khi chính thức kích hoạt.
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Target KPI & Commitment Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1612] mb-1">
                    3. Mục tiêu doanh số (đ) *
                  </label>
                  <input
                    type="number"
                    min="1000000"
                    step="500000"
                    value={targetRevenue}
                    onChange={(e) =>
                      setTargetRevenue(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    onBlur={() =>
                      setTargetRevenue((prev) =>
                        prev === '' ? 10000000 : Math.max(1000000, Number(prev))
                      )
                    }
                    className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                  />
                  <span className="block mt-1 text-[10px] text-[#7D715E]">
                    {Number(targetRevenue || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1A1612] mb-1">
                    4. Thời hạn cam kết (ngày) *
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={days}
                    onChange={(e) =>
                      setDays(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    onBlur={() =>
                      setDays((prev) =>
                        prev === '' ? 14 : Math.max(7, Math.min(90, Number(prev)))
                      )
                    }
                    className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                  />
                  <span className="block mt-1 text-[10px] text-[#7D715E]">
                    Hoàn thành trong {days || 0} ngày
                  </span>
                </div>
              </div>

              {/* Section 5: Plan & Content Pitch */}
              <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1">
                  5. Kế hoạch truyền thông & Cam kết nội dung
                </label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] placeholder-[#7D715E] focus:border-[#C59B58] focus:outline-none resize-none"
                  placeholder="Mô tả định dạng video review, kênh phát sóng (TikTok/FB/YouTube) và cam kết đơn hàng..."
                />
              </div>

              {/* Summary Card */}
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs leading-relaxed text-[#7D715E]">
                <strong className="block text-[#8C6226] font-bold mb-1">
                  📜 Tóm tắt đề xuất thỏa thuận:
                </strong>
                Nhà sáng tạo đề xuất mức thù lao{' '}
                <strong className="text-[#1A1612]">{rate}%</strong> cho{' '}
                <strong className="text-[#1A1612]">{selectedProducts.length} sản phẩm</strong> đã chọn.
                Cam kết đạt mục tiêu doanh số{' '}
                <strong className="text-[#1A1612]">{Number(targetRevenue).toLocaleString('vi-VN')} đ</strong> trong vòng{' '}
                <strong className="text-[#1A1612]">{days} ngày</strong>.
                {(Number(rate) || 0) > 16 && (
                  <span className="block mt-1 text-[11px] text-[#B88E4F] font-semibold">
                    * Lưu ý: Do thù lao &gt;16%, thỏa thuận cần sự phê duyệt ngoại lệ từ Tổng Giám Đốc.
                  </span>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-2.5 text-xs text-[#DC2626] flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE4D7] mt-4">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy || loading || selectedProductIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-xs font-bold text-[#1A1612] transition-colors disabled:opacity-50 shadow-xs"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi đề xuất...</span>
                  </>
                ) : (
                  <>
                    <Handshake size={15} />
                    <span>Gửi Đề Xuất Thỏa Thuận ({selectedProductIds.length} SP)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
