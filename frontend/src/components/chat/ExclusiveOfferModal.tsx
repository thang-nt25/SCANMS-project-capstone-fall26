import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
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

  // Load products with lock status (khóa chặt theo cửa hàng được chọn)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const targetCollabId = collaboratorId || currentUser?.id || '';
    referralLinksService
      .getCollaboratorDealProducts(targetCollabId, storeId)
      .then((items: ProductItem[]) => {
        if (!active) return;

        // Xác định chính xác storeId mục tiêu:
        // 1. Ưu tiên storeId được truyền trực tiếp từ tab Shop
        // 2. Nếu không có, suy ra từ productId hoặc initialProductIds
        const effectiveStoreId =
          storeId ||
          (productId ? items.find((p) => p.id === productId)?.storeId : undefined) ||
          (initialProductIds.length > 0
            ? items.find((p) => initialProductIds.includes(p.id))?.storeId
            : undefined);

        // Khóa chặt: chỉ hiển thị sản phẩm của đúng 1 cửa hàng đó
        const storeItems = effectiveStoreId
          ? items.filter((p) => p.storeId === effectiveStoreId)
          : items;

        setProducts(storeItems);

        // Giữ lại các ID hợp lệ thuộc cửa hàng này
        const validSelectedIds = selectedProductIds.filter((id) =>
          storeItems.some((p) => p.id === id)
        );

        if (validSelectedIds.length > 0) {
          setSelectedProductIds(validSelectedIds);
        } else if (storeItems.length > 0) {
          const firstUnlocked = storeItems.find((p) => !p.activeDeal?.isLocked) || storeItems[0];
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
  }, [collaboratorId, storeId, productId]);

  // Handle escape & outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  const targetStoreId =
    storeId ||
    (productId ? products.find((p) => p.id === productId)?.storeId : undefined) ||
    (selectedProductIds.length > 0
      ? products.find((p) => selectedProductIds.includes(p.id))?.storeId
      : undefined);

  const filteredProducts = products.filter((p) => {
    const matchesStore = targetStoreId ? p.storeId === targetStoreId : true;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesStore && matchesSearch;
  });

  const toggleProduct = (p: ProductItem) => {
    if (p.activeDeal?.isLocked) return;
    // Chặn chọn sản phẩm của cửa hàng khác
    if (targetStoreId && p.storeId !== targetStoreId) return;
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
  const primaryProduct = selectedProducts[0] || filteredProducts[0] || products[0];

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
      const storeScopeId = primaryProduct.storeId || targetStoreId;
      const validProductIds = selectedProductIds.filter((id) => {
        const item = products.find((p) => p.id === id);
        return item && (!storeScopeId || item.storeId === storeScopeId);
      });
      const finalProductIds = validProductIds.length > 0 ? validProductIds : [primaryProduct.id];
      const isMulti = finalProductIds.length > 1;
      const scopeType = isMulti ? 'SELECTED_PRODUCTS' : 'SINGLE_PRODUCT';

      const response: any = await api.post(
        mode === 'proposal' ? '/affiliate-deals/proposals' : '/affiliate-deals/offers',
        {
          ...(mode === 'offer' ? { collaboratorId } : {}),
          productId: primaryProduct.id,
          proposedCommissionRate: numRate,
          scopeType,
          ...(isMulti ? { productIds: finalProductIds } : {}),
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
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
        <div className="flex items-center justify-between border-b border-[#EAE4D7] px-6 py-3.5 bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#231D15] text-[#C59B58] shadow-xs">
              <Handshake className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="koc-deal-title" className="text-base font-bold text-[#1A1612]">
                {mode === 'proposal'
                  ? 'Đề xuất Thỏa thuận Thù lao VIP'
                  : 'Đề nghị Thỏa thuận Độc quyền'}
              </h2>
              {primaryProduct?.storeName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-semibold text-[#8C6226]">
                  {primaryProduct.storeName}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Body */}
        <form onSubmit={submit} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT COLUMN: Product Catalog & Multi-Select */}
          <div className="w-full md:w-1/2 p-5 bg-[#FAF8F5]/60 flex flex-col border-b md:border-b-0 md:border-r border-[#EAE4D7]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                1. Sản phẩm áp dụng *
              </label>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226] tabular-nums whitespace-nowrap">
                Đã chọn: {selectedProductIds.length}
              </span>
            </div>

            {/* Search Box */}
            <div className="relative mb-2.5">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7D715E]" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#EAE4D7] bg-white pl-9 pr-3 py-1.5 text-xs text-[#1A1612] placeholder-[#7D715E] focus:border-[#C59B58] focus:outline-none transition shadow-2xs"
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
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#7D715E] flex-wrap">
                          <span className="font-bold text-[#1A1612] tabular-nums">
                            {formatMoney(p.price)}
                          </span>
                          <span>•</span>
                          <span>Thù lao gốc: <strong className="text-[#1A1612] tabular-nums">{p.baseRate ?? 10}%</strong></span>
                          {p.activeDeal && (
                            <>
                              <span>•</span>
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-1.5 py-0.5 rounded">
                                  <Lock size={9} />
                                  Deal {p.activeDeal.effectiveRate}% (còn {p.activeDeal.remainingDays ?? 'vài'} ngày)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 rounded">
                                  Deal: {p.activeDeal.effectiveRate}%
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Deal Terms & Pitch Form */}
          <div className="w-full md:w-1/2 p-5 flex flex-col justify-between overflow-y-auto max-h-[75vh] bg-white">
            <div className="space-y-3.5">
              {/* Section 2: Commission Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                      2. Mức thù lao đề xuất *
                    </label>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setShowHelpPopover(!showHelpPopover)}
                        className="text-[#7D715E] hover:text-[#B88E4F] transition-colors p-0.5 cursor-pointer"
                        title="Xem quy định thẩm quyền phê duyệt"
                        aria-label="Xem quy định thẩm quyền phê duyệt"
                      >
                        <HelpCircle size={14} />
                      </button>
                      {showHelpPopover && (
                        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-3 bg-white border border-[#EAE4D7] rounded-xl shadow-xl text-xs text-[#1A1612] animate-in fade-in zoom-in-95">
                          <div className="font-bold text-[#8C6226] mb-1 flex items-center gap-1">
                            <Percent size={13} /> Quy định thẩm quyền thù lao:
                          </div>
                          <ul className="space-y-1 text-[#7D715E] list-disc pl-4 text-[11px] leading-relaxed">
                            <li>
                              <strong className="text-[#1A1612]">Từ 11% đến 16%:</strong> Quản lý Cửa hàng có thẩm quyền tự trị phê duyệt trực tiếp.
                            </li>
                            <li>
                              <strong className="text-[#1A1612]">Trên 16% (17% – 25%):</strong> Cần chuyển lên <strong>Tổng Giám Đốc (Admin)</strong> phê duyệt ngoại lệ ngân sách.
                            </li>
                          </ul>
                          <button
                            type="button"
                            onClick={() => setShowHelpPopover(false)}
                            className="mt-2 text-[10px] text-[#B88E4F] font-semibold hover:underline block text-right w-full cursor-pointer"
                          >
                            Đã hiểu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-md tabular-nums whitespace-nowrap">
                    {rate}% {Number(rate) > 10 ? `(+${Number(rate) - 10}% so với gốc)` : ''}
                  </span>
                </div>

                {/* Rate Input + Quick Presets on the SAME ROW */}
                <div className="flex items-center gap-2">
                  <div className="relative w-28 shrink-0">
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
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white pl-3 pr-7 py-1.5 text-sm font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-[#7D715E]">%</span>
                  </div>

                  {/* Quick Preset Pills */}
                  <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                    <span className="text-xs text-[#7D715E] font-medium whitespace-nowrap">Gợi ý:</span>
                    {presetPills.map((p) => {
                      const isSelected = rate === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleRatePreset(p)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer tabular-nums ${
                            isSelected
                              ? 'border-[#C59B58] bg-[#C59B58] text-white shadow-xs'
                              : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#F3EFE6]'
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
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs text-[#8C6226]">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#B88E4F]" />
                    <span>Thù lao <strong>{rate}%</strong> &gt; 16%: Cần Tổng Giám Đốc (Admin) duyệt ngoại lệ ngân sách.</span>
                  </div>
                )}
              </div>

              {/* Section 3: Target KPI & Commitment Duration in 2 Columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                      3. Mục tiêu doanh số *
                    </label>
                    <span className="text-xs font-semibold text-[#1A1612] tabular-nums whitespace-nowrap">
                      {Number(targetRevenue || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="relative">
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
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white pl-3 pr-8 py-2 text-xs font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">₫</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                      4. Thời hạn cam kết *
                    </label>
                    <span className="text-xs font-semibold text-[#1A1612] tabular-nums whitespace-nowrap">
                      {days || 0} ngày
                    </span>
                  </div>
                  <div className="relative">
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
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white pl-3 pr-12 py-2 text-xs font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">ngày</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Plan & Content Pitch */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7D715E] mb-1">
                  5. Kế hoạch nội dung
                </label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] placeholder-[#7D715E] focus:border-[#C59B58] focus:outline-none resize-none shadow-2xs"
                  placeholder="Mô tả định dạng video review, kênh phát sóng..."
                />
              </div>

              {/* Summary Strip (Compact 1-Line Metrics) */}
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 py-2.5 flex items-center justify-between text-xs text-[#1A1612]">
                <div className="flex items-center gap-1.5 text-[#8C6226] font-bold shrink-0">
                  <Handshake size={14} className="text-[#B88E4F]" />
                  <span>Tóm tắt:</span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
                  <span>Thù lao: <strong className="text-[#8C6226] font-bold tabular-nums">{rate}%</strong></span>
                  <span className="text-[#EEDFC6]">•</span>
                  <span>Mục tiêu: <strong className="text-[#1A1612] font-bold tabular-nums">{Number(targetRevenue || 0).toLocaleString('vi-VN')} ₫</strong></span>
                  <span className="text-[#EEDFC6]">•</span>
                  <span>Thời hạn: <strong className="text-[#1A1612] font-bold tabular-nums">{days} ngày</strong></span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-2.5 text-xs text-[#DC2626] flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-[#EAE4D7] mt-3">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy || loading || selectedProductIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-xs font-bold text-[#1A1612] transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
