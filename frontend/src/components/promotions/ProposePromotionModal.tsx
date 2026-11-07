import { useState, useEffect, useMemo, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {
  pricingApi,
  requestError,
} from '../../services/enterprise-pricing.service';
import { toast } from '../../utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';

interface ProposePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any | null;
  selectedProducts?: any[];
  catalog?: any[];
  onSuccess?: () => void;
}

const money = (val: unknown) =>
  val == null ? 'Chưa cấu hình' : `${Number(val).toLocaleString('vi-VN')} ₫`;

const toLocalDateTimeString = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const EMPTY_ARRAY: any[] = [];

export function ProposePromotionModal({
  isOpen,
  onClose,
  product: initialProduct,
  selectedProducts: initialSelected = EMPTY_ARRAY,
  catalog = EMPTY_ARRAY,
  onSuccess,
}: ProposePromotionModalProps) {
  // Mode: 'single' (1 sản phẩm) | 'batch' (Hàng loạt)
  const isMultiPreselected = initialSelected.length > 1;
  const [mode, setMode] = useState<'single' | 'batch'>(
    isMultiPreselected ? 'batch' : initialProduct ? 'single' : 'single',
  );

  // Discount Mechanism: 'PERCENTAGE' (%) | 'FIXED_AMOUNT' (₫)
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountPercent, setDiscountPercent] = useState<number | ''>(15);
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<number | ''>(50000);

  // Single mode states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [customProposedPrice, setCustomProposedPrice] = useState<string>('');
  const [isManualPriceOverride, setIsManualPriceOverride] = useState<boolean>(false);

  // Batch mode states
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');

  // Schedule & Reason (Common)
  const [startsAt, setStartsAt] = useState<string>(
    toLocalDateTimeString(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState<string>(
    toLocalDateTimeString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [reason, setReason] = useState<string>('Chiến dịch kích cầu thúc đẩy doanh số cùng Đối tác Tiếp thị.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMakerCheckerInfo, setShowMakerCheckerInfo] = useState<boolean>(false);

  // Catalog list normalization
  const availableCatalog = useMemo(() => {
    if (catalog.length > 0) return catalog;
    if (initialProduct) return [initialProduct];
    if (initialSelected.length > 0) return initialSelected;
    return [];
  }, [catalog, initialProduct, initialSelected]);

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
      setMode('single');
    } else if (initialSelected.length > 0) {
      setBatchSelectedIds(initialSelected.map((p) => p.id));
      setMode(initialSelected.length > 1 ? 'batch' : 'single');
      if (initialSelected[0]?.id) setSelectedProductId(initialSelected[0].id);
    } else if (availableCatalog.length > 0) {
      setSelectedProductId(availableCatalog[0].id);
      setBatchSelectedIds(availableCatalog.slice(0, 5).map((p) => p.id));
    }
    setSelectedVariantId('');
    setIsManualPriceOverride(false);
    setCustomProposedPrice('');
    setErrorMessage(null);
  }, [initialProduct, initialSelected, availableCatalog, isOpen]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  if (!isOpen) return null;

  // Single Product Calculation
  const activeProduct =
    initialProduct ||
    availableCatalog.find((p) => p.id === selectedProductId) ||
    availableCatalog[0] ||
    null;

  const variants = activeProduct?.variants || [];
  const selectedVariant = variants.find((v: any) => v.id === selectedVariantId);

  const listPrice = Number(
    selectedVariant?.listPrice ??
      selectedVariant?.price ??
      activeProduct?.listPrice ??
      activeProduct?.price ??
      0,
  );

  const floorPrice =
    selectedVariant?.floorPrice != null
      ? Number(selectedVariant.floorPrice)
      : activeProduct?.floorPrice != null
        ? Number(activeProduct.floorPrice)
        : null;

  // Compute calculated proposed price for Single Mode
  const computedProposedPrice = useMemo(() => {
    if (isManualPriceOverride && customProposedPrice) {
      return Number(customProposedPrice);
    }
    const numDiscount = Number(discountPercent) || 0;
    const numFixed = Number(fixedDiscountAmount) || 0;
    if (discountType === 'PERCENTAGE') {
      const discounted = listPrice * (1 - numDiscount / 100);
      return Math.max(1000, Math.round(discounted / 1000) * 1000);
    } else {
      return Math.max(1000, Math.round((listPrice - numFixed) / 1000) * 1000);
    }
  }, [isManualPriceOverride, customProposedPrice, discountType, discountPercent, fixedDiscountAmount, listPrice]);

  const singleBelowFloor = floorPrice != null && computedProposedPrice < floorPrice;
  const singleAboveOrEqualList = listPrice > 0 && computedProposedPrice >= listPrice;
  const singlePriceValid = computedProposedPrice > 0 && !singleBelowFloor && !singleAboveOrEqualList;
  const singleSavings = Math.max(0, listPrice - computedProposedPrice);
  const singleEffectivePercent = listPrice > 0 ? Math.round((singleSavings / listPrice) * 100) : 0;

  // Batch Mode Calculations
  const filteredBatchCatalog = availableCatalog.filter((p) =>
    `${p.title || ''} ${p.sku || ''}`.toLowerCase().includes(batchSearchQuery.toLowerCase().trim()),
  );

  const batchItemsWithCalculations = availableCatalog
    .filter((p) => batchSelectedIds.includes(p.id))
    .map((p) => {
      const pList = Number(p.listPrice ?? p.price ?? 0);
      const pFloor = p.floorPrice != null ? Number(p.floorPrice) : null;
      let finalPrice = pList;
      const numDiscount = Number(discountPercent) || 0;
      const numFixed = Number(fixedDiscountAmount) || 0;
      if (discountType === 'PERCENTAGE') {
        finalPrice = Math.max(1000, Math.round((pList * (1 - numDiscount / 100)) / 1000) * 1000);
      } else {
        finalPrice = Math.max(1000, Math.round((pList - numFixed) / 1000) * 1000);
      }

      const isBelow = pFloor != null && finalPrice < pFloor;
      const isAbove = pList > 0 && finalPrice >= pList;
      const isValid = finalPrice > 0 && !isBelow && !isAbove;
      const shortfall = isBelow && pFloor != null ? pFloor - finalPrice : 0;

      return {
        product: p,
        listPrice: pList,
        floorPrice: pFloor,
        proposedPrice: finalPrice,
        isBelowFloor: isBelow,
        isAboveList: isAbove,
        isValid,
        shortfall,
      };
    });

  const anyBatchViolating = batchItemsWithCalculations.some((item) => !item.isValid);
  const totalBatchSelected = batchItemsWithCalculations.length;

  // Handlers
  const handlePresetPercent = (pct: number) => {
    setDiscountType('PERCENTAGE');
    setDiscountPercent(pct);
    setIsManualPriceOverride(false);
  };

  const handleSelectAllBatch = () => {
    setBatchSelectedIds(availableCatalog.map((p) => p.id));
  };

  const handleClearAllBatch = () => {
    setBatchSelectedIds([]);
  };

  const handleToggleBatchProduct = (id: string) => {
    setBatchSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleApplyDuration = (days: number) => {
    const start = new Date(startsAt).getTime() || Date.now();
    setEndsAt(toLocalDateTimeString(new Date(start + days * 24 * 60 * 60 * 1000)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (reason.trim().length < 5) {
      setErrorMessage('Vui lòng nhập căn cứ thương mại / lý do tối thiểu 5 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'single') {
        if (!activeProduct?.id) {
          setErrorMessage('Vui lòng chọn sản phẩm cần áp dụng ưu đãi.');
          setSubmitting(false);
          return;
        }
        if (floorPrice == null) {
          setErrorMessage('Sản phẩm chưa có giá sàn MAP. Vui lòng cấu hình MAP trước khi gửi ưu đãi.');
          setSubmitting(false);
          return;
        }
        if (singleBelowFloor) {
          setErrorMessage(`Mức giá đề xuất (${money(computedProposedPrice)}) không được thấp hơn giá sàn MAP (${money(floorPrice)}).`);
          setSubmitting(false);
          return;
        }
        if (singleAboveOrEqualList) {
          setErrorMessage(`Mức giá đề xuất phải thấp hơn giá niêm yết hiện tại (${money(listPrice)}).`);
          setSubmitting(false);
          return;
        }

        await pricingApi.create({
          productId: activeProduct.id,
          variantId: selectedVariantId || undefined,
          proposedPrice: computedProposedPrice,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: reason.trim(),
        });

        toast.success('Đã gửi đề xuất giảm giá thành công. Yêu cầu đang chờ Ban Quản Trị phê duyệt.');
      } else {
        // Batch mode
        if (totalBatchSelected === 0) {
          setErrorMessage('Vui lòng tích chọn ít nhất 1 sản phẩm để giảm giá hàng loạt.');
          setSubmitting(false);
          return;
        }
        if (anyBatchViolating) {
          setErrorMessage('Có sản phẩm sau khi giảm bị vi phạm Giá sàn bảo vệ (MAP). Vui lòng điều chỉnh lại mức chiết khấu.');
          setSubmitting(false);
          return;
        }

        await pricingApi.batchCreate({
          items: batchItemsWithCalculations.map((item) => ({
            productId: item.product.id,
            proposedPrice: item.proposedPrice,
          })),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: reason.trim(),
        });

        toast.success(`Đã gửi thành công đề xuất giảm giá cho ${totalBatchSelected} sản phẩm. Đang chờ phê duyệt.`);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(requestError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1612]/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-5xl h-[92vh] max-h-[730px] flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#EAE4D7] shadow-2xl overflow-hidden text-[#1A1612]">
        {/* HEADER: LUXURY VÀNG CAM NÂU GRADIENT (LIKE KOL HEADER) */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#D4AF70]/30 bg-gradient-to-r from-[#2A1E11] via-[#4A3418] to-[#2A1E11] text-[#FFF8ED] shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="promo-modal-title" className="text-base font-bold !text-[#FFFDF9] tracking-tight flex items-center gap-2.5">
              <span className="!text-[#FFFDF9]">Đề Xuất Chương Trình Giảm Giá</span>
            </h2>

            {/* Maker-Checker Popover Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMakerCheckerInfo((prev) => !prev)}
                className="px-2.5 py-1 rounded-full bg-[#D4AF70]/20 hover:bg-[#D4AF70]/30 text-[#D4AF70] text-[11px] font-semibold border border-[#D4AF70]/40 inline-flex items-center gap-1 cursor-pointer transition"
                title="Xem quy chế thẩm duyệt Maker-Checker"
              >
                <span>Cơ chế duyệt</span>
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {showMakerCheckerInfo && (
                <div className="absolute left-0 top-full mt-2 w-80 p-3.5 rounded-2xl bg-[#231A10] border border-[#D4AF70]/40 text-[#FAF5EB] shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 space-y-1">
                  <div className="font-bold text-[#D4AF70] flex items-center gap-1.5 text-xs">
                    Quy chế Thẩm Duyệt Maker-Checker
                  </div>
                  <p className="text-[11px] text-[#EEDFC6] leading-relaxed">
                    Đề xuất sẽ được gửi tới <strong>Chuyên viên Vận hành / Ban Quản Trị</strong> phê duyệt. Khi duyệt thành công, mức giá ưu đãi sẽ tự động kích hoạt đồng bộ trên toàn sàn đúng thời gian đã thiết lập.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher Tabs */}
            {!initialProduct && availableCatalog.length > 1 && (
              <div className="flex items-center p-1 rounded-xl bg-black/25 border border-[#D4AF70]/30">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'single'
                      ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                      : 'text-[#FFF8ED]/75 hover:text-white'
                  }`}
                >
                  Đơn lẻ (1 SP)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'batch'
                      ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                      : 'text-[#FFF8ED]/75 hover:text-white'
                  }`}
                >
                  Hàng loạt (${availableCatalog.length} SP)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-xl text-[#FFF8ED]/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Đóng cửa sổ"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 2-COLUMN BODY */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Products & MAP Compliance Visualizer (5 Cols) */}
          <section className="md:col-span-5 border-r border-[#EAE4D7] bg-[#FAF8F5] flex flex-col min-h-0">
            {mode === 'single' ? (
              /* SINGLE MODE LEFT PANE */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">
                  Sản phẩm áp dụng
                </div>

                {/* If multiple products available in catalog */}
                {!initialProduct && availableCatalog.length > 1 && (
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">
                      Chọn sản phẩm trong kho
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        setSelectedVariantId('');
                        setIsManualPriceOverride(false);
                      }}
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                    >
                      {availableCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} · Niêm yết: {money(p.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Product Detail Card */}
                {activeProduct && (
                  <div className="p-4 rounded-2xl bg-white border border-[#EAE4D7] shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={getSafeProductImageUrl(activeProduct.imageUrl, activeProduct.title, '')}
                        alt={activeProduct.title}
                        className="w-16 h-16 rounded-xl object-cover border border-[#EAE4D7] bg-[#FAF8F5] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-[#1A1612] line-clamp-2" title={activeProduct.title}>
                          {activeProduct.title}
                        </span>
                        <div className="text-[11px] text-[#7D715E] mt-1 flex items-center gap-2">
                          <span>SKU: <strong className="font-mono text-[#1A1612]">{activeProduct.sku || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Variant Selector */}
                    {variants.length > 0 && (
                      <div className="pt-2 border-t border-[#EAE4D7]">
                        <label className="text-[11px] font-bold text-[#7D715E] block mb-1">
                          Phân loại SKU ({variants.length} biến thể)
                        </label>
                        <select
                          value={selectedVariantId}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                        >
                          <option value="">Tất cả biến thể ({variants.length} SKU)</option>
                          {variants.map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {v.name} · {money(v.price ?? listPrice)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 3-Tier Price Breakdown Box */}
                <div className="p-4 rounded-2xl bg-white border border-[#EAE4D7] shadow-xs space-y-3">
                  <div className="text-xs font-bold text-[#1A1612] flex items-center justify-between">
                    <span>Cấu trúc giá & Giá sàn</span>
                    <span className="text-[11px] text-[#7D715E]">Đơn vị: VNĐ</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#FAF8F5]">
                      <span className="text-[#7D715E]">1. Giá niêm yết (Gốc):</span>
                      <strong className="text-[#1A1612] font-mono text-sm">{money(listPrice)}</strong>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#FAF8F5]">
                      <span className="text-[#8C6226] font-semibold">2. Giá sàn bảo vệ (MAP):</span>
                      <strong className="text-[#8C6226] font-mono text-sm">{money(floorPrice)}</strong>
                    </div>

                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#FBF5EB] to-[#F5ECE0] border border-[#C59B58]/50 shadow-xs">
                      <span className="font-bold text-[#2A1E11]">3. Giá sau giảm đề xuất:</span>
                      <strong className={`font-mono text-base font-bold ${singleBelowFloor ? 'text-[#DC2626]' : 'text-[#8C6226]'}`}>
                        {money(computedProposedPrice)}
                      </strong>
                    </div>
                  </div>

                  {/* Savings / Discount Summary */}
                  <div className="flex items-center justify-between text-xs text-[#7D715E] pt-0.5">
                    <span>Khách tiết kiệm:</span>
                    <span className="font-semibold text-[#1A1612] font-mono">
                      {money(singleSavings)} (-{singleEffectivePercent}%)
                    </span>
                  </div>

                  {/* Realtime Compliance Alert & KOL Commission Buffer Note */}
                  {singleBelowFloor ? (
                    <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="block font-bold">Thấp hơn Giá Sàn MAP ({money(floorPrice)})!</strong>
                        Mức giá đề xuất vi phạm biên độ bảo vệ vốn. Vui lòng giảm ít hơn để không bán dưới giá vốn.
                      </div>
                    </div>
                  ) : singleAboveOrEqualList ? (
                    <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="block font-bold">Giá sau giảm không hợp lệ!</strong>
                        Mức giá đề xuất phải thấp hơn giá niêm yết hiện tại ({money(listPrice)}).
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[11px] text-[#6B4B1B] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#8C6226]">
                        <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                        <span>Hợp lệ · Cao hơn sàn MAP <strong>{money(computedProposedPrice - (floorPrice || 0))}</strong></span>
                      </div>
                      <p className="text-[10px] text-[#7D715E] leading-normal pl-5">
                        Giá sàn MAP đã bao gồm dự phòng tối đa 16% thù lao KOC tự trị. Doanh nghiệp bảo toàn biên lợi nhuận ròng.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* BATCH MODE LEFT PANE */
              <div className="flex-1 flex flex-col min-h-0 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#1A1612]">
                    Danh sách sản phẩm ({totalBatchSelected}/{availableCatalog.length} đã chọn)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllBatch}
                      className="text-[#8C6226] font-semibold hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-[#EAE4D7]">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllBatch}
                      className="text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7D715E]" />
                  <input
                    type="text"
                    value={batchSearchQuery}
                    onChange={(e) => setBatchSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên sản phẩm hoặc SKU..."
                    className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] placeholder-[#7D715E]/60 focus:border-[#C59B58] focus:outline-none"
                  />
                </div>

                {/* Scrollable Products List */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                  {filteredBatchCatalog.map((p) => {
                    const isChecked = batchSelectedIds.includes(p.id);
                    const itemCal = batchItemsWithCalculations.find((it) => it.product.id === p.id);
                    const pList = Number(p.listPrice ?? p.price ?? 0);
                    const pFloor = p.floorPrice != null ? Number(p.floorPrice) : null;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleBatchProduct(p.id)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                          isChecked
                            ? itemCal && !itemCal.isValid
                              ? 'bg-[#FEF2F2] border-[#FECACA]'
                              : 'bg-white border-[#C59B58] shadow-xs'
                            : 'bg-white/60 border-[#EAE4D7] opacity-60 hover:opacity-100 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-[#C59B58] pointer-events-none accent-[#C59B58]"
                          />
                          <img
                            src={getSafeProductImageUrl(p.imageUrl, p.title, '')}
                            alt={p.title}
                            className="w-9 h-9 rounded-lg object-cover border border-[#EAE4D7] bg-[#FAF8F5] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-xs text-[#1A1612] block truncate" title={p.title}>
                              {p.title}
                            </span>
                            <div className="text-[10px] text-[#7D715E] mt-0.5 flex items-center gap-2">
                              <span>Gốc: <strong className="font-mono text-[#1A1612]">{money(pList)}</strong></span>
                              <span>· MAP: <strong className="font-mono text-[#8C6226]">{money(pFloor)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {isChecked && itemCal && (
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold text-xs block ${itemCal.isValid ? 'text-[#8C6226]' : 'text-[#DC2626]'}`}>
                              {money(itemCal.proposedPrice)}
                            </span>
                            <span className="text-[10px] font-semibold mt-0.5 block">
                              {itemCal.isValid ? (
                                <span className="text-[#059669]">Hợp lệ</span>
                              ) : (
                                <span className="text-[#DC2626]">Vi phạm MAP (-{money(itemCal.shortfall)})</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: Configuration & Dual Discount Controls (7 Cols) */}
          <section className="md:col-span-7 bg-[#FFFDF9] p-5 overflow-y-auto flex flex-col justify-between min-h-0 space-y-3">
            <div className="space-y-3">
              {/* SECTION 1: DISCOUNT MECHANISM SWITCHER */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Phương thức tính giảm giá
                </label>

                {/* Tabs: % vs ₫ */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7]">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('PERCENTAGE');
                      setIsManualPriceOverride(false);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      discountType === 'PERCENTAGE'
                        ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                        : 'text-[#7D715E] hover:text-[#1A1612]'
                    }`}
                  >
                    <span>Giảm theo phần trăm (%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('FIXED_AMOUNT');
                      setIsManualPriceOverride(false);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      discountType === 'FIXED_AMOUNT'
                        ? 'bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                        : 'text-[#7D715E] hover:text-[#1A1612]'
                    }`}
                  >
                    <span>Giảm số tiền cố định (₫)</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: INPUT CONTROLS ACCORDING TO TYPE */}
              {discountType === 'PERCENTAGE' ? (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1612]">Tỷ lệ chiết khấu (%)</span>
                    <span className="text-[11px] text-[#7D715E]">Áp dụng tự động tính giá sau giảm</span>
                  </div>

                  {/* Quick Preset Pills */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7D715E] font-medium whitespace-nowrap">Gợi ý nhanh:</span>
                    <div className="flex items-center gap-1.5">
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handlePresetPercent(pct)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            discountPercent === pct && !isManualPriceOverride
                              ? 'border-[#B88E4F] bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                              : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Percent Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        step="1"
                        value={discountPercent}
                        onChange={(e) => {
                          setDiscountPercent(e.target.value === '' ? '' : Number(e.target.value));
                          setIsManualPriceOverride(false);
                        }}
                        onBlur={() =>
                          setDiscountPercent((prev) =>
                            prev === '' ? 15 : Math.max(1, Math.min(90, Number(prev)))
                          )
                        }
                        className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-1.5 text-sm font-bold text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">%</span>
                    </div>
                    <span className="text-xs text-[#7D715E]">Tự do điều chỉnh (1% – 90%)</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1612]">Mức giảm tiền cố định (₫)</span>
                    <span className="text-[11px] text-[#7D715E]">Trừ trực tiếp vào giá niêm yết</span>
                  </div>

                  {/* Quick Preset Pills for Fixed Amount */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7D715E] font-medium whitespace-nowrap">Mức giảm:</span>
                    <div className="flex items-center gap-1.5">
                      {[30000, 50000, 100000, 150000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setFixedDiscountAmount(amt);
                            setIsManualPriceOverride(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            fixedDiscountAmount === amt && !isManualPriceOverride
                              ? 'border-[#B88E4F] bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white shadow-xs'
                              : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          -{Number(amt / 1000)}K
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fixed Amount Input */}
                  <div className="relative">
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={fixedDiscountAmount}
                      onChange={(e) => {
                        setFixedDiscountAmount(e.target.value === '' ? '' : Number(e.target.value));
                        setIsManualPriceOverride(false);
                      }}
                      onBlur={() =>
                        setFixedDiscountAmount((prev) =>
                          prev === '' ? 50000 : Math.max(1000, Number(prev))
                        )
                      }
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3 py-1.5 text-sm font-bold font-mono text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7D715E]">VNĐ</span>
                  </div>
                </div>
              )}

              {/* SECTION 3: CAMPAIGN DURATION (SCHEDULE) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Thời gian áp dụng chiến dịch
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-[#7D715E]">Gợi ý:</span>
                    {[3, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleApplyDuration(days)}
                        className="px-1.5 py-0.5 rounded border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] hover:bg-[#F3EFE6] cursor-pointer"
                      >
                        {days} ngày
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-[#7D715E] block mb-0.5">Bắt đầu từ</label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-1 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7D715E] block mb-0.5">Kết thúc vào</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      min={startsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-1 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: COMMERCIAL BASIS & PURPOSE */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-0.5">
                  Căn cứ thương mại & Lý do đề xuất <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Chiến dịch Flash Sale cuối tuần, xả kho định kỳ hoặc kết hợp KOL Live đẩy mạnh doanh số..."
                  className="w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:outline-none resize-none"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </section>
        </form>

        {/* FIXED FOOTER */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#EAE4D7] bg-[#FAF8F5] shrink-0">
          <div className="text-xs text-[#7D715E]">
            {mode === 'single' ? (
              <span>
                Áp dụng cho <strong className="text-[#1A1612] font-bold">1 sản phẩm</strong> ({activeProduct?.title || ''})
              </span>
            ) : (
              <span>
                Áp dụng cho <strong className="text-[#1A1612] font-bold">{totalBatchSelected}</strong> sản phẩm đã chọn
              </span>
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
              disabled={
                submitting ||
                (mode === 'single' ? !singlePriceValid : totalBatchSelected === 0 || anyBatchViolating)
              }
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#A47C3B] hover:brightness-105 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi đề xuất...</span>
                </>
              ) : (
                <span>
                  {mode === 'single'
                    ? 'Gửi Đề Xuất Giảm Giá'
                    : `Gửi Đề Xuất Hàng Loạt (${totalBatchSelected} SP)`}
                </span>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
