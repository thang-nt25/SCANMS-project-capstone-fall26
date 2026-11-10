import { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
  Percent,
} from 'lucide-react';
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

export function CreateExclusiveDealModal({
  collaboratorId,
  collaboratorName,
  storeId,
  onClose,
  onSuccess,
}: Props) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commissionRate, setCommissionRate] = useState<number | ''>(14);
  const [targetOrders, setTargetOrders] = useState<number | ''>(30);
  const [commitmentDays, setCommitmentDays] = useState<number | ''>(14);
  const [salesCommitment, setSalesCommitment] = useState<string>(
    'Đề xuất thỏa thuận phân phối độc quyền với mức thù lao ưu đãi.'
  );

  const [showHelpPopover, setShowHelpPopover] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Load products with real-time deal & lock status
  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    referralLinksService
      .getCollaboratorDealProducts(collaboratorId, storeId)
      .then((items: ProductItem[]) => {
        if (cancelled) return;
        const storeItems = storeId ? items.filter((p) => p.storeId === storeId) : items;
        setProducts(storeItems);
        // Pre-select the first available (unlocked) product
        const firstUnlocked = storeItems.find((p) => !p.activeDeal?.isLocked);
        if (firstUnlocked) {
          setSelectedProductIds([firstUnlocked.id]);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collaboratorId, storeId]);

  // Filter products by search and store
  const filteredProducts = products
    .filter((p) => (storeId ? p.storeId === storeId : true))
    .filter((p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

  const selectableProducts = products.filter((p) => !p.activeDeal?.isLocked);

  const toggleProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product?.activeDeal?.isLocked) return;

    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const unlockedIds = selectableProducts.map((p) => p.id);
    setSelectedProductIds(unlockedIds);
  };

  const handleClearAll = () => {
    setSelectedProductIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      setError('Vui lòng chọn ít nhất một sản phẩm áp dụng thỏa thuận.');
      return;
    }
    const numRate = Number(commissionRate) || 0;
    const numOrders = Number(targetOrders) || 0;
    const numDays = Number(commitmentDays) || 0;

    if (numRate < 11 || numRate > 25) {
      setError(
        'Mức thù lao độc quyền phải từ 11% đến 25% (trần toàn hệ thống).'
      );
      return;
    }
    if (numOrders < 1) {
      setError('Cam kết số đơn hàng (KPI) phải từ 1 trở lên.');
      return;
    }
    if (numDays < 7) {
      setError('Thời hạn cam kết KPI tối thiểu là 7 ngày.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await referralLinksService.createShopDealOffer({
        collaboratorId,
        productId: selectedProductIds[0],
        productIds: selectedProductIds,
        proposedCommissionRate: numRate,
        targetOrders: numOrders,
        commitmentDays: numDays,
        salesCommitment:
          salesCommitment.trim() || 'Thỏa thuận thù lao độc quyền',
      });
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể gửi đề xuất thỏa thuận lúc này.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProducts = products.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  const isEscalation = (Number(commissionRate) || 0) > 16;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-[#1A1612]/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-5xl h-[92vh] max-h-[720px] flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#EAE4D7] shadow-2xl overflow-hidden text-[#1A1612]"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h2
                id="deal-modal-title"
                className="text-base font-bold text-[#1A1612]"
              >
                Đề xuất Thỏa thuận Độc quyền VIP
              </h2>
              <p className="text-xs text-[#7D715E]">
                Ký kết thỏa thuận hợp tác 1-1 với nhà sáng tạo{' '}
                <strong className="text-[#1A1612] font-semibold">
                  {collaboratorName}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Body: 2 Columns */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Chọn sản phẩm áp dụng */}
          <section className="md:col-span-6 flex flex-col border-b md:border-b-0 md:border-r border-[#EAE4D7] bg-[#FAF8F5] min-h-0">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-[#EAE4D7] bg-white space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#B88E4F]" />
                  Sản phẩm áp dụng{' '}
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                    Đã chọn: {selectedProductIds.length} / {selectableProducts.length}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={selectableProducts.length === 0}
                    className="text-[11px] font-semibold text-[#B88E4F] hover:text-[#8C6226] hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-xs text-[#EAE4D7]">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={selectedProductIds.length === 0}
                    className="text-[11px] font-medium text-[#7D715E] hover:text-[#1A1612] hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7D715E] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm theo tên..."
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none placeholder-[#7D715E]/60 transition"
                />
              </div>
            </div>

            {/* Scrollable Product List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-16 text-xs text-[#7D715E]">
                  <Loader2 className="w-5 h-5 animate-spin mb-2 text-[#B88E4F]" />
                  Đang tải danh mục sản phẩm của Nhãn hàng...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-xs text-[#7D715E] text-center">
                  Không tìm thấy sản phẩm nào phù hợp.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isLocked = Boolean(p.activeDeal?.isLocked);
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isLocked && toggleProduct(p.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                        isLocked
                          ? 'border-[#EAE4D7] bg-[#F3EFE6]/70 opacity-70 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#C59B58] bg-[#FFFFFF] shadow-2xs ring-1 ring-[#C59B58]/30 cursor-pointer'
                          : 'border-[#EAE4D7] bg-[#FFFFFF] hover:border-[#C59B58]/60 cursor-pointer'
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <div className="shrink-0">
                        {isLocked ? (
                          <div
                            className="w-5 h-5 rounded-md bg-[#EAE4D7] text-[#7D715E] flex items-center justify-center"
                            title="Sản phẩm đang trong cam kết KPI độc quyền trước đó"
                          >
                            <Lock className="w-3 h-3" />
                          </div>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-[#C59B58] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-[#EAE4D7] bg-white" />
                        )}
                      </div>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[#7D715E]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#1A1612] truncate">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-[#7D715E] mt-0.5">
                          Giá niêm yết:{' '}
                          <strong className="text-[#1A1612] font-semibold">
                            {formatMoney(p.price)}
                          </strong>
                        </div>

                        {/* Rate Badge Indicator */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                              <Lock className="w-2.5 h-2.5" />
                              Đang có deal {p.activeDeal?.effectiveRate}% (
                              {p.activeDeal?.remainingDays
                                ? `còn ${p.activeDeal.remainingDays} ngày`
                                : 'chờ duyệt'}
                              )
                            </span>
                          ) : p.activeDeal ? (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226]">
                              Deal cũ: {p.activeDeal.effectiveRate}% (hết KPI)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]">
                              Thù lao cơ sở: 10%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Điều khoản thỏa thuận */}
          <section className="md:col-span-6 flex flex-col bg-white overflow-y-auto p-5 space-y-3.5 min-h-0">
            {/* 1. Mức thù lao độc quyền đề xuất */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                    1. Mức thù lao độc quyền *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpPopover((prev) => !prev)}
                    className="w-4 h-4 rounded-full text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#F3EFE6] flex items-center justify-center cursor-pointer transition"
                    title="Xem quy định hạn mức phê duyệt"
                    aria-label="Xem quy định hạn mức"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-xs font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-md tabular-nums whitespace-nowrap">
                  {commissionRate}% {Number(commissionRate) > 10 ? `(+${Number(commissionRate) - 10}% so với gốc)` : ''}
                </span>
              </div>

              {/* Collapsible Info Popover */}
              {showHelpPopover && (
                <div className="mb-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] text-xs text-[#7D715E] leading-relaxed animate-in fade-in space-y-1">
                  <div className="font-bold text-[#1A1612] flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-[#B88E4F]" />
                    Quy tắc hạn mức thẩm quyền (Governance):
                  </div>
                  <p>
                    • <strong>11% – 16%:</strong> Khung tự trị của Quản lý Cửa hàng. Kích hoạt ngay khi Đối tác (KOC) chấp thuận.
                  </p>
                  <p>
                    • <strong>Trên 16% (17% – 25%):</strong> Cơ chế leo thang thẩm duyệt. Yêu cầu Tổng Giám Đốc (System Admin) phê duyệt ngân sách ngoại lệ trước khi kích hoạt.
                  </p>
                </div>
              )}

              {/* Rate Input & Quick Presets on the SAME ROW */}
              <div className="flex items-center gap-2">
                <div className="relative w-28 shrink-0">
                  <input
                    type="number"
                    step="0.5"
                    min={11}
                    max={25}
                    value={commissionRate}
                    onChange={(e) =>
                      setCommissionRate(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    onBlur={() =>
                      setCommissionRate((prev) =>
                        prev === '' ? 14 : Math.min(25, Math.max(11, Number(prev)))
                      )
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-sm font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                    placeholder="11 - 25%"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">
                    %
                  </span>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                  <span className="text-xs text-[#7D715E] font-medium whitespace-nowrap">Gợi ý:</span>
                  {[12, 14, 16, 18].map((rate) => {
                    const isActive = commissionRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setCommissionRate(rate)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer tabular-nums ${
                          isActive
                            ? 'border-[#C59B58] bg-[#C59B58] text-white shadow-xs'
                            : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        {rate}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Governance Alert Pill */}
              {isEscalation && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Vượt hạn mức tự trị (<strong>{commissionRate}%</strong> &gt; 16%): Cần Tổng Giám Đốc (Admin) duyệt ngoại lệ.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Cam kết KPI & Thời hạn */}
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                      2. KPI cam kết *
                    </label>
                    <span className="text-xs font-semibold text-[#1A1612] tabular-nums whitespace-nowrap">
                      {targetOrders || 0} đơn
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={targetOrders}
                      onChange={(e) =>
                        setTargetOrders(
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      onBlur={() =>
                        setTargetOrders((prev) =>
                          prev === '' ? 30 : Math.max(1, Number(prev))
                        )
                      }
                      className="w-full pl-3 pr-12 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                      placeholder="Ví dụ: 30"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">
                      đơn
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7D715E] whitespace-nowrap">
                      3. Thời hạn *
                    </label>
                    <span className="text-xs font-semibold text-[#1A1612] tabular-nums whitespace-nowrap">
                      {commitmentDays || 0} ngày
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={7}
                      max={90}
                      value={commitmentDays}
                      onChange={(e) =>
                        setCommitmentDays(
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      onBlur={() =>
                        setCommitmentDays((prev) =>
                          prev === '' ? 14 : Math.max(7, Math.min(90, Number(prev)))
                        )
                      }
                      className="w-full pl-3 pr-12 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-bold text-[#1A1612] tabular-nums focus:border-[#C59B58] focus:outline-none shadow-2xs"
                      placeholder="Ví dụ: 14"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">
                      ngày
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Ghi chú điều khoản hợp tác */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7D715E] mb-1">
                4. Ghi chú điều khoản
              </label>
              <textarea
                rows={2}
                value={salesCommitment}
                onChange={(e) => setSalesCommitment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none resize-none shadow-2xs placeholder-[#7D715E]"
                placeholder="Ghi chú về video review, livestream hoặc kênh truyền thông..."
              />
            </div>

            {/* 5. Tóm tắt hợp đồng thỏa thuận (Compact 1-Line Metrics) */}
            <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs text-[#1A1612] flex items-center justify-between mt-auto">
              <div className="font-bold text-[#8C6226] flex items-center gap-1.5 shrink-0">
                <Handshake className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Tóm tắt:</span>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
                <span>Thù lao: <strong className="text-[#8C6226] font-bold tabular-nums">{commissionRate}%</strong></span>
                <span className="text-[#EEDFC6]">•</span>
                <span>SP: <strong className="text-[#1A1612] font-bold tabular-nums">{selectedProducts.length}</strong></span>
                <span className="text-[#EEDFC6]">•</span>
                <span>KPI: <strong className="text-[#1A1612] font-bold tabular-nums">{targetOrders} đơn</strong></span>
                <span className="text-[#EEDFC6]">•</span>
                <span>Thời hạn: <strong className="text-[#1A1612] font-bold tabular-nums">{commitmentDays} ngày</strong></span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between px-6 py-3.5 border-t border-[#EAE4D7] bg-[#FAF8F5] shrink-0">
          <div className="text-xs text-[#7D715E]">
            {selectedProductIds.length > 0 ? (
              <span>
                Đang áp dụng cho{' '}
                <strong className="text-[#1A1612] font-bold">
                  {selectedProductIds.length}
                </strong>{' '}
                sản phẩm
              </span>
            ) : (
              <span className="text-[#DC2626]">Chưa chọn sản phẩm</span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
              disabled={submitting || selectedProductIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi thỏa thuận...</span>
                </>
              ) : (
                <>
                  <Handshake className="w-4 h-4 stroke-[2]" />
                  <span>
                    {isEscalation
                      ? `Đề Xuất Ban Giám Đốc (${selectedProductIds.length} SP)`
                      : `Gửi Thỏa Thuận Độc Quyền (${selectedProductIds.length} SP)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
