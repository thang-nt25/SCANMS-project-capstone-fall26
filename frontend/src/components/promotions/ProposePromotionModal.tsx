import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import {
  AlertCircle,
  ShieldCheck,
  Tag,
  Boxes,
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
  // Mode: 'single' | 'batch'
  const isMultiPreselected = initialSelected.length > 1;
  const [mode, setMode] = useState<'single' | 'batch'>(
    isMultiPreselected ? 'batch' : initialProduct ? 'single' : 'single',
  );

  // Single mode states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [proposedPrice, setProposedPrice] = useState<string>('');

  // Batch mode states
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchDiscountPercent, setBatchDiscountPercent] = useState<number>(10);
  const [batchCustomPrices, setBatchCustomPrices] = useState<
    Record<string, number>
  >({});

  // Common states
  const [budgetTotal, setBudgetTotal] = useState<string>('5000000');
  const [startsAt, setStartsAt] = useState<string>(
    toLocalDateTimeString(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState<string>(
    toLocalDateTimeString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available catalog list
  const availableCatalog =
    catalog.length > 0
      ? catalog
      : initialProduct
        ? [initialProduct]
        : initialSelected;

  useEffect(() => {
    if (!isOpen) return;
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
      setMode('single');
    } else if (initialSelected.length > 0) {
      setBatchSelectedIds(initialSelected.map((p) => p.id));
      setMode(initialSelected.length > 1 ? 'batch' : 'single');
      if (initialSelected[0]?.id) setSelectedProductId(initialSelected[0].id);
    } else if (catalog.length > 0) {
      setSelectedProductId(catalog[0].id);
      setBatchSelectedIds(catalog.slice(0, 3).map((p) => p.id));
    }
    setSelectedVariantId('');
    setProposedPrice('');
    setReason('');
    setErrorMessage(null);
  }, [initialProduct, initialSelected, catalog, isOpen]);

  if (!isOpen) return null;

  // Single product calculations
  const activeProduct =
    initialProduct ||
    availableCatalog.find((p) => p.id === selectedProductId) ||
    availableCatalog[0] ||
    null;

  const variants = activeProduct?.variants || [];
  const selectedVariant = variants.find(
    (v: any) => v.id === selectedVariantId,
  );

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

  const numPrice = Number(proposedPrice);
  const isBelowFloor =
    floorPrice != null && numPrice > 0 && numPrice < floorPrice;
  const isAboveOrEqualList = listPrice > 0 && numPrice >= listPrice;

  // Batch calculations
  const selectedBatchProducts = availableCatalog.filter((p) =>
    batchSelectedIds.includes(p.id),
  );

  const batchItemsWithCalculations = selectedBatchProducts.map((p) => {
    const pList = Number(p.listPrice ?? p.price ?? 0);
    const pFloor = p.floorPrice != null ? Number(p.floorPrice) : null;
    const custom = batchCustomPrices[p.id];
    const computedPrice =
      custom !== undefined
        ? custom
        : Math.round((pList * (1 - batchDiscountPercent / 100)) / 1000) * 1000;
    const itemBelowFloor = pFloor != null && computedPrice < pFloor;
    const itemAboveList = pList > 0 && computedPrice >= pList;
    return {
      product: p,
      listPrice: pList,
      floorPrice: pFloor,
      proposedPrice: computedPrice,
      isBelowFloor: itemBelowFloor,
      isAboveList: itemAboveList,
      isValid: computedPrice > 0 && !itemBelowFloor && !itemAboveList,
    };
  });

  const anyBatchViolating = batchItemsWithCalculations.some(
    (item) => !item.isValid,
  );

  const handleApplyPresetDiscount = (percent: number) => {
    setBatchDiscountPercent(percent);
    setBatchCustomPrices({});
  };

  const handleToggleBatchProduct = (id: string) => {
    setBatchSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (reason.trim().length < 5) {
      setErrorMessage(
        'Vui lòng nhập lý do/căn cứ thương mại tối thiểu 5 ký tự.',
      );
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
          setErrorMessage(
            'Sản phẩm chưa có giá sàn MAP. Vui lòng cấu hình MAP trước.',
          );
          setSubmitting(false);
          return;
        }
        if (isBelowFloor) {
          setErrorMessage(
            `Giá đề xuất (${money(numPrice)}) không được thấp hơn giá sàn MAP (${money(floorPrice)}).`,
          );
          setSubmitting(false);
          return;
        }
        if (isAboveOrEqualList) {
          setErrorMessage(
            `Giá đề xuất phải thấp hơn giá niêm yết hiện tại (${money(listPrice)}).`,
          );
          setSubmitting(false);
          return;
        }

        await pricingApi.create({
          productId: activeProduct.id,
          variantId: selectedVariantId || undefined,
          proposedPrice: numPrice,
          budgetTotal: Number(budgetTotal),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: reason.trim(),
        });
        toast.success(
          'Đã gửi đề xuất giảm giá thành công. Chờ thẩm định Maker-Checker.',
        );
      } else {
        // Batch mode
        if (batchSelectedIds.length === 0) {
          setErrorMessage(
            'Vui lòng tích chọn ít nhất 1 sản phẩm để giảm giá hàng loạt.',
          );
          setSubmitting(false);
          return;
        }
        if (anyBatchViolating) {
          setErrorMessage(
            'Có sản phẩm có mức giá sau giảm vi phạm Giá sàn bảo vệ (MAP). Vui lòng điều chỉnh lại mức giảm.',
          );
          setSubmitting(false);
          return;
        }

        await pricingApi.batchCreate({
          items: batchItemsWithCalculations.map((item) => ({
            productId: item.product.id,
            proposedPrice: item.proposedPrice,
          })),
          budgetTotal: Number(budgetTotal),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          reason: reason.trim(),
        });
        toast.success(
          `Đã gửi thành công đề xuất giảm giá hàng loạt cho ${batchItemsWithCalculations.length} sản phẩm.`,
        );
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đề xuất Chương trình Giảm giá Sản phẩm"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector */}
        {!initialProduct && availableCatalog.length > 1 && (
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'single'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Giảm giá 1 sản phẩm</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'batch'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Giảm giá hàng loạt nhiều sản phẩm</span>
            </button>
          </div>
        )}

        {/* SINGLE MODE */}
        {mode === 'single' && (
          <>
            {/* Product info card */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
              {activeProduct ? (
                <img
                  src={getSafeProductImageUrl(
                    activeProduct.imageUrl,
                    activeProduct.title,
                    '',
                  )}
                  alt={activeProduct.title}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EAE4D7] bg-white shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl border border-[#EAE4D7] bg-white text-[#A79B89] flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span
                  className="font-bold text-xs text-[#1A1612] block truncate"
                  title={activeProduct?.title}
                >
                  {activeProduct?.title || 'Chưa chọn sản phẩm'}
                </span>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="text-[#7D715E]">
                    Niêm yết:{' '}
                    <strong className="text-[#1A1612] font-mono">
                      {money(listPrice)}
                    </strong>
                  </span>
                  <span className="text-[#8C6226] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                    Sàn MAP:{' '}
                    <strong className="font-mono">{money(floorPrice)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* If opening from catalog without initialProduct */}
            {!initialProduct && availableCatalog.length > 0 && (
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Chọn sản phẩm áp dụng ưu đãi{' '}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedVariantId('');
                  }}
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                >
                  {availableCatalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · Niêm yết: {money(p.price)} · MAP:{' '}
                      {money(p.floorPrice)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Variant selector */}
            {variants.length > 0 && (
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Phạm vi phân loại SKU
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
                >
                  <option value="">
                    Tất cả phân loại ({variants.length} SKU)
                  </option>
                  {variants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · Niêm yết:{' '}
                      {money(v.listPrice ?? v.price ?? listPrice)} · MAP:{' '}
                      {money(v.floorPrice ?? floorPrice)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Proposed price input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1A1612]">
                  Mức giá sau giảm đề xuất (₫){' '}
                  <span className="text-[#DC2626]">*</span>
                </label>
                {floorPrice && (
                  <span className="text-[11px] text-[#8C6226] font-medium">
                    Tối thiểu MAP: {money(floorPrice)}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={floorPrice || 1000}
                max={listPrice > 1000 ? listPrice - 1000 : undefined}
                step="1000"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder={`Nhập mức giá sau giảm (≥ ${money(floorPrice)})`}
                className={`w-full rounded-xl border p-2.5 text-xs font-mono font-bold outline-none transition ${
                  isBelowFloor
                    ? 'border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] ring-2 ring-[#DC2626]/20'
                    : 'border-[#EAE4D7] bg-white text-[#1A1612] focus:border-[#C59B58]'
                }`}
                required
              />
              {isBelowFloor && (
                <p className="mt-1 text-[11px] text-[#DC2626] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Mức giá giảm vi phạm Giá sàn bảo vệ (tối thiểu{' '}
                  {money(floorPrice)}).
                </p>
              )}
            </div>
          </>
        )}

        {/* BATCH MODE */}
        {mode === 'batch' && (
          <div className="space-y-3">
            {/* Quick preset discount pills */}
            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                Mức chiết khấu đồng loạt
              </label>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyPresetDiscount(pct)}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      batchDiscountPercent === pct &&
                      Object.keys(batchCustomPrices).length === 0
                        ? 'bg-[#FBF5EB] border-[#C59B58] text-[#8C6226]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    Giảm -{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Product selection list */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1A1612]">
                  Danh sách sản phẩm áp dụng ({batchSelectedIds.length} đã chọn)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setBatchSelectedIds(availableCatalog.map((p) => p.id))
                  }
                  className="text-[11px] text-[#8C6226] font-semibold hover:underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-[#EAE4D7] p-2 bg-white">
                {availableCatalog.map((p) => {
                  const isChecked = batchSelectedIds.includes(p.id);
                  const pList = Number(p.listPrice ?? p.price ?? 0);
                  const pFloor =
                    p.floorPrice != null ? Number(p.floorPrice) : null;
                  const itemCal = batchItemsWithCalculations.find(
                    (it) => it.product.id === p.id,
                  );

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleBatchProduct(p.id)}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition cursor-pointer text-xs ${
                        isChecked
                          ? itemCal && !itemCal.isValid
                            ? 'bg-[#FEF2F2] border-[#FECACA]'
                            : 'bg-[#FBF5EB] border-[#EEDFC6]'
                          : 'bg-[#FAF8F5] border-[#EAE4D7] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#C59B58] pointer-events-none"
                        />
                        <img
                          src={getSafeProductImageUrl(p.imageUrl, p.title, '')}
                          alt={p.title}
                          className="w-8 h-8 rounded-lg object-cover border border-[#EAE4D7] bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <span
                            className="font-semibold text-[#1A1612] block truncate"
                            title={p.title}
                          >
                            {p.title}
                          </span>
                          <span className="text-[10px] text-[#7D715E] block">
                            Niêm yết: {money(pList)} · MAP: {money(pFloor)}
                          </span>
                        </div>
                      </div>

                      {isChecked && itemCal && (
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-bold text-xs ${
                              itemCal.isValid
                                ? 'text-[#065F46]'
                                : 'text-[#DC2626]'
                            }`}
                          >
                            {money(itemCal.proposedPrice)}
                          </span>
                          <span className="text-[10px] text-[#7D715E] block">
                            {itemCal.isValid ? 'Hợp lệ' : 'Chạm sàn MAP'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Timeline & Budget (Common) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#1A1612] block mb-1">
              Thời gian bắt đầu <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#1A1612] block mb-1">
              Thời gian kết thúc <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              min={startsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[#1A1612] block mb-1">
            Hạn mức ngân sách trợ giá (₫){' '}
            <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="number"
            min="100000"
            step="100000"
            value={budgetTotal}
            onChange={(e) => setBudgetTotal(e.target.value)}
            className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none font-mono"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#1A1612] block mb-1">
            Căn cứ thương mại / Mục đích chiến dịch{' '}
            <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Chiến dịch Flash Sale cuối tuần phối hợp Top KOC kích cầu..."
            className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-[#1A1612] focus:border-[#C59B58] focus:outline-none"
            required
          />
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] font-medium flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE4D7]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || (mode === 'single' && isBelowFloor)}
            className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Đang gửi…' : 'Gửi Đề Xuất (Chờ Duyệt)'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
