import { DateTimePicker } from '../common/DateTimePicker';
import { Select } from '../ui/Select';
import { handleProductImageError } from '@/utils/image-fallback.utils';
import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import {
  AlertCircle,
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
import {
  calculateMinSafePrice,
  estimateMaxLossPerUnit,
} from '../../utils/pricing-math';

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

const VIETNAM_OFFSET = '+07:00';
const toVietnamDateTime = (date: Date) =>
  new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16);
const parseVietnamDateTime = (value: string) => Date.parse(`${value}${VIETNAM_OFFSET}`);
const vietnamPickerNow = () => new Date(toVietnamDateTime(new Date()));

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
    toVietnamDateTime(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState<string>(
    toVietnamDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMakerCheckerInfo, setShowMakerCheckerInfo] = useState<boolean>(false);

  const submitLock = useRef(false);
  const schedulePopoverRoot = useRef<HTMLDivElement>(null);

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
    setReason('');
    const start = new Date(Date.now() + 15 * 60000);
    setStartsAt(toVietnamDateTime(start));
    setEndsAt(toVietnamDateTime(new Date(start.getTime() + 7 * 86400000)));
  }, [initialProduct, initialSelected, availableCatalog, isOpen]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

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

  const affectedVariants = selectedVariant ? [selectedVariant] : variants.length ? variants : [activeProduct];
  const affectedFloors = affectedVariants.map((item: any) => item?.floorPrice ?? activeProduct?.floorPrice);
  const floorPrice = affectedFloors.length && affectedFloors.every((value: any) => value != null && Number.isFinite(Number(value)))
    ? Math.max(...affectedFloors.map(Number)) : null;

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

  const minSafePrice = floorPrice != null ? calculateMinSafePrice(floorPrice) : null;
  const singleBelowFloor = minSafePrice != null && computedProposedPrice < minSafePrice;
  const singleMaxLoss =
    floorPrice != null && singleBelowFloor
      ? estimateMaxLossPerUnit(computedProposedPrice, floorPrice)
      : 0;
  const singleAboveOrEqualList = affectedVariants.some((item: any) => {
    const price = Number(item?.listPrice ?? item?.price ?? listPrice);
    return price > 0 && computedProposedPrice >= price;
  });
  const singlePriceValid = computedProposedPrice > 0 && !singleAboveOrEqualList;
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
      const isValid = pFloor != null && finalPrice > 0 && !isBelow && !isAbove;
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
    const start = parseVietnamDateTime(startsAt) || Date.now();
    setEndsAt(toVietnamDateTime(new Date(start + days * 24 * 60 * 60 * 1000)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submitLock.current) return;
    setErrorMessage(null);
    const startTime = parseVietnamDateTime(startsAt), endTime = parseVietnamDateTime(endsAt);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime || endTime <= Date.now() || startTime < Date.now() - 60000 || endTime - startTime > 366 * 86400000) {
      setErrorMessage('Chọn thời gian hợp lệ: kết thúc sau bắt đầu, tối đa 366 ngày.');
      return;
    }

    if (reason.trim().length < 10) {
      setErrorMessage('Vui lòng nhập lý do từ 10 đến 1.000 ký tự.');
      return;
    }

    submitLock.current = true;
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
        if (singleAboveOrEqualList) {
          setErrorMessage(`Mức giá đề xuất phải thấp hơn giá niêm yết hiện tại (${money(listPrice)}).`);
          setSubmitting(false);
          return;
        }

        await pricingApi.create({
          productId: activeProduct.id,
          variantId: selectedVariantId || undefined,
          proposedPrice: computedProposedPrice,
          startsAt: new Date(startTime).toISOString(),
          endsAt: new Date(endTime).toISOString(),
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
          startsAt: new Date(startTime).toISOString(),
          endsAt: new Date(endTime).toISOString(),
          reason: reason.trim(),
        });

        toast.success(`Đã gửi thành công đề xuất giảm giá cho ${totalBatchSelected} sản phẩm. Đang chờ phê duyệt.`);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(requestError(err));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const range = (values: number[]) => {
    if (!values.length) return 'Chưa cấu hình';
    const low = Math.min(...values), high = Math.max(...values);
    return low === high ? money(low) : `${money(low)} – ${money(high)}`;
  };
  const previewTargets = selectedVariant ? [selectedVariant] : variants.length ? variants : [activeProduct];
  const previewPrices: number[] = previewTargets.filter(Boolean).map((item: any) => Number(item.listPrice ?? item.price ?? listPrice));
  const previewFloors: number[] = previewTargets.filter(Boolean).map((item: any) => item.floorPrice ?? activeProduct?.floorPrice).filter((value: any) => value != null).map(Number);
  const belowActualFloor = floorPrice != null && computedProposedPrice < floorPrice;
  const belowFloorVariants = computedProposedPrice > 0 ? (selectedVariant ? [selectedVariant] : variants)
    .filter((variant: any) => {
      const floor = variant.floorPrice ?? activeProduct?.floorPrice;
      return floor != null && Number.isFinite(Number(floor)) && computedProposedPrice < Number(floor);
    })
    .map((variant: any) => variant.name || variant.sku)
    .filter(Boolean) : [];
  const inputClass = 'w-full min-w-0 border border-[#EAE4D7] bg-white px-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58]';
  const productContent = (item: any) => <span className="flex min-w-0 items-center gap-2"><img src={getSafeProductImageUrl(item.imageUrl, item.title, '')} onError={handleProductImageError} alt="" className="size-8! shrink-0 rounded-md border border-[#EAE4D7] bg-white object-contain"/><span className="min-w-0 text-left"><strong className="line-clamp-2 text-xs font-semibold">{item.title}</strong><span className="block text-[11px] text-[#7D715E] tabular-nums">{money(item.listPrice ?? item.price)}{item.sku ? ` · SKU ${item.sku}` : ''}</span></span></span>;
  return <div ref={schedulePopoverRoot} role="dialog" aria-modal="true" aria-labelledby="promo-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/40 p-3 backdrop-blur-xs">
    <div className="promotion-light-dialog">
      <header className="promotion-light-header">
        <div className="flex items-center gap-2"><h2 id="promo-modal-title">Đề xuất giảm giá</h2><div className="relative"><button type="button" aria-label="Cơ chế duyệt" aria-expanded={showMakerCheckerInfo} onClick={() => setShowMakerCheckerInfo(value => !value)} className="grid size-7 place-items-center text-[#7D715E]"><HelpCircle size={16}/></button>
          {showMakerCheckerInfo && <p className="absolute left-0 top-full z-50 mt-1 w-60 rounded-lg border border-[#EAE4D7] bg-white p-3 text-xs leading-relaxed shadow-lg">Đề xuất chờ Vận hành duyệt. Trường hợp dưới ngưỡng bảo toàn thu cần Admin duyệt ngoại lệ.</p>}
        </div></div>
        <div className="flex items-center gap-3">{!initialProduct && availableCatalog.length > 1 && <div className="promotion-mode-switch" role="group" aria-label="Phạm vi giảm giá">{(['single', 'batch'] as const).map(value => <button type="button" key={value} disabled={submitting} aria-pressed={mode === value} onClick={() => { setMode(value); setErrorMessage(null); }} className="border border-transparent px-3 text-xs font-semibold aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:text-[#79592C]">{value === 'single' ? 'Một sản phẩm' : 'Nhiều sản phẩm'}</button>)}</div>}
          <button type="button" aria-label="Đóng cửa sổ" disabled={submitting} onClick={onClose} className="grid size-8 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB]"><X size={18}/></button>
        </div>
      </header>
      <form id="promotion-proposal-form" onSubmit={handleSubmit} className="promotion-light-body" data-mode={mode}>
        <fieldset disabled={submitting} className="contents">
          <section className="promotion-light-products space-y-3">
            <h3 className="text-sm font-semibold">Sản phẩm</h3>
            {mode === 'single' ? <>
              <Select aria-label="Sản phẩm giảm giá" portal value={activeProduct?.id || ''} disabled={!!initialProduct || availableCatalog.length < 2}
                triggerContent={activeProduct ? productContent(activeProduct) : undefined}
                options={availableCatalog.map(item => ({ value: item.id, label: `${item.title} ${item.sku || ''}`, content: productContent(item) }))}
                onChange={event => { setSelectedProductId(event.target.value); setSelectedVariantId(''); setIsManualPriceOverride(false); setErrorMessage(null); }} className="promotion-product-select w-full" />
              {variants.length > 0 && <Select aria-label="Biến thể giảm giá" portal value={selectedVariantId} onChange={event => setSelectedVariantId(event.target.value)}
                options={[{ value: '', label: `Tất cả biến thể (${variants.length} SKU)` }, ...variants.map((variant: any) => ({ value: variant.id, label: `${variant.name}${variant.sku ? ` · ${variant.sku}` : ''} · ${money(variant.listPrice ?? variant.price ?? listPrice)}` }))]} className="w-full" />}
            </> : <>
              <div className="flex items-center justify-between gap-2 text-xs"><span className="text-[#7D715E]">Đã chọn {totalBatchSelected}/{availableCatalog.length}</span><div className="flex gap-3"><button type="button" onClick={handleSelectAllBatch} className="text-[#90682F]">Chọn tất cả</button><button type="button" onClick={handleClearAllBatch} className="text-[#7D715E]">Bỏ chọn</button></div></div>
              <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]"/><input aria-label="Tìm sản phẩm giảm giá" value={batchSearchQuery} onChange={event => setBatchSearchQuery(event.target.value)} placeholder="Tìm tên, SKU…" className={`${inputClass} pl-9`}/></label>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE4D7]">{filteredBatchCatalog.map(item => {
                const calculated = batchItemsWithCalculations.find(value => value.product.id === item.id);
                return <label key={item.id} className="flex min-h-16 cursor-pointer items-center gap-2 py-2"><input type="checkbox" checked={batchSelectedIds.includes(item.id)} onChange={() => handleToggleBatchProduct(item.id)} aria-label={`Chọn ${item.title}`}/><span className="min-w-0 flex-1">{productContent(item)}</span>{calculated && <span className={`shrink-0 text-right text-[11px] tabular-nums ${calculated.isValid ? 'text-[#90682F]' : 'text-[#DC2626]'}`}>{money(calculated.proposedPrice)}{!calculated.isValid && <small className="mt-1 block">Cần điều chỉnh</small>}</span>}</label>;
              })}{!filteredBatchCatalog.length && <p className="py-6 text-center text-xs text-[#7D715E]">Không có sản phẩm phù hợp.</p>}</div>
            </>}
          </section>
          <section className="promotion-light-settings space-y-3">
            <h3 className="text-sm font-semibold">Mức giảm</h3>
            <div className="promotion-discount-tabs grid grid-cols-2 gap-2" role="group" aria-label="Cách giảm giá">{(['PERCENTAGE','FIXED_AMOUNT'] as const).map(value => <button type="button" key={value} aria-pressed={discountType === value} onClick={() => { setDiscountType(value); setIsManualPriceOverride(false); }} className="h-10 border border-transparent bg-white text-xs font-semibold text-[#655A49] aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:text-[#79592C]">{value === 'PERCENTAGE' ? 'Theo %' : 'Theo số tiền'}</button>)}</div>
            <div className="grid items-center gap-2 sm:grid-cols-[minmax(100px,1fr)_minmax(0,2fr)]"><label htmlFor="promotion-discount" className="sr-only">Mức giảm {discountType === 'PERCENTAGE' ? '(%)' : '(₫)'}</label>
              <input id="promotion-discount" type="number" min={discountType === 'PERCENTAGE' ? 1 : 1000} max={discountType === 'PERCENTAGE' ? 90 : undefined} step={discountType === 'PERCENTAGE' ? 1 : 1000} required
                value={discountType === 'PERCENTAGE' ? discountPercent : fixedDiscountAmount} onChange={event => { const value = event.target.value === '' ? '' : Number(event.target.value); if (discountType === 'PERCENTAGE') setDiscountPercent(value); else setFixedDiscountAmount(value); setIsManualPriceOverride(false); }} className={`${inputClass} font-semibold tabular-nums`}/>
              <div className="grid grid-cols-4 gap-2">{(discountType === 'PERCENTAGE' ? [10,15,20,25] : [30000,50000,100000,150000]).map(value => <button type="button" key={value} aria-pressed={Number(discountType === 'PERCENTAGE' ? discountPercent : fixedDiscountAmount) === value} onClick={() => { if (discountType === 'PERCENTAGE') handlePresetPercent(value); else { setFixedDiscountAmount(value); setIsManualPriceOverride(false); } }} className="h-8 border border-[#EAE4D7] text-xs tabular-nums aria-pressed:border-[#C59B58] aria-pressed:bg-[#FBF5EB]">{discountType === 'PERCENTAGE' ? `${value}%` : `${value/1000}K`}</button>)}</div>
            </div>
          </section>
          {mode === 'single' && (
              <section className="promotion-light-preview" aria-label="Xem trước giá"><h3 className="mb-2 text-sm font-semibold">Xem trước giá</h3>
                <dl className="space-y-3 text-xs">
                  <div className="promotion-proposed-price">
                    <dt className="font-semibold">Giá sau giảm</dt>
                    <dd className={`text-2xl font-bold tabular-nums ${belowActualFloor ? 'text-[#DC2626]' : 'text-[#231D15]'}`}>{computedProposedPrice > 0 ? money(computedProposedPrice) : '—'}</dd>
                    {!selectedVariantId && variants.length > 1 && <dd className="text-[11px] text-[#7D715E]">Cùng một giá cho cả {variants.length} biến thể</dd>}
                  </div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#7D715E]">Giá niêm yết</dt><dd className="text-right font-medium tabular-nums">{range(previewPrices)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="inline-flex items-center gap-1 text-[#7D715E]">Giá sàn <span title={`Ngưỡng bảo toàn thu: ${money(minSafePrice)}. Công thức: giá sàn / (90% × 75%), giả định voucher 10% và thù lao 25%; không phải giá sàn gốc.`} className="cursor-help"><HelpCircle size={13}/></span></dt><dd className="text-right font-medium tabular-nums">{range(previewFloors)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#7D715E]">Khách tiết kiệm</dt><dd className="text-right tabular-nums">{range(previewPrices.map(value => Math.max(0, value - computedProposedPrice)))}{previewPrices.every(value => value === listPrice) ? ` (${singleEffectivePercent}%)` : ''}</dd></div>
                </dl>
                {belowFloorVariants.length > 0 && <p className="mt-3 text-xs leading-relaxed text-[#715126]">Dưới giá sàn: {belowFloorVariants.join(', ')}.</p>}
                {(floorPrice == null || !singlePriceValid || singleBelowFloor) && <p className={`mt-3 border-t border-[#EAE4D7] pt-3 text-xs ${!singlePriceValid || floorPrice == null ? 'text-[#DC2626]' : 'text-[#90682F]'}`}>
                  {floorPrice == null ? 'Thiếu giá sàn; cần bổ sung trước khi gửi.' : singleAboveOrEqualList ? 'Giá sau giảm phải thấp hơn giá hiện tại của các biến thể.' : singleBelowFloor ? 'Cần Admin duyệt ngoại lệ.' : 'Nhập mức giảm hợp lệ.'}
                  {singleBelowFloor && singleMaxLoss > 0 && <span className="mt-1 block text-[11px]" title="Ước tính theo kịch bản voucher 10% và thù lao 25%">Thiếu hụt tối đa dự kiến: {money(singleMaxLoss)}/sản phẩm.</span>}
                </p>}
              </section>
          )}
          <section className="promotion-light-schedule space-y-3">
            <div className="space-y-2"><h4 className="text-xs font-medium">Thời gian áp dụng <span className="ml-1 text-[11px] font-normal text-[#7D715E]">· Giờ Việt Nam</span></h4><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateTimePicker label="Bắt đầu" popoverTitle="Chọn thời điểm bắt đầu" compact required
                value={startsAt} onChange={setStartsAt} disabled={submitting}
                getCurrentDate={vietnamPickerNow} popoverPortalRef={schedulePopoverRoot} />
              <DateTimePicker label="Kết thúc" popoverTitle="Chọn thời điểm kết thúc" compact required
                value={endsAt} onChange={setEndsAt} disabled={submitting} minDateTime={startsAt}
                getCurrentDate={vietnamPickerNow} popoverPortalRef={schedulePopoverRoot} />
            </div><div className="grid grid-cols-4 gap-2">{[3,7,14,30].map(days => <button type="button" key={days} onClick={() => handleApplyDuration(days)} className="h-8 border border-[#EAE4D7] text-[11px] hover:bg-[#FBF5EB]">{days} ngày</button>)}</div></div>
            <div><label htmlFor="promotion-reason" className="mb-1 block text-xs font-medium">Lý do đề xuất <span className="text-[#DC2626]">*</span></label><textarea id="promotion-reason" value={reason} onChange={event => setReason(event.target.value)} required minLength={10} maxLength={1000} placeholder="Nhập lý do…" className={`${inputClass} h-[72px]! resize-none py-2`}/><p className="mt-1 text-right text-[10px] text-[#7D715E]">{reason.length}/1.000 · Tối thiểu 10 ký tự</p></div>
            {errorMessage && <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-[#DC2626]"><AlertCircle size={15} className="shrink-0"/>{errorMessage}</p>}
          </section>
        </fieldset>
      </form>
      <footer className="promotion-light-footer"><span className="text-xs text-[#7D715E]">{mode === 'single' ? `1 sản phẩm${selectedVariantId ? ' · 1 biến thể' : variants.length ? ` · ${variants.length} biến thể` : ''}` : `${totalBatchSelected} sản phẩm`}</span><div className="flex gap-2"><button type="button" disabled={submitting} onClick={onClose} className="border border-[#EAE4D7] bg-white px-4 text-xs">Hủy</button><button type="submit" form="promotion-proposal-form" disabled={submitting || (mode === 'single' ? !singlePriceValid || floorPrice == null : totalBatchSelected === 0 || anyBatchViolating)} className="inline-flex items-center gap-2 border border-[#B88E4F] bg-[#C59B58] px-4 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">{submitting && <Loader2 size={15} className="animate-spin"/>}{submitting ? 'Đang gửi…' : 'Gửi đề xuất'}</button></div></footer>
    </div>
  </div>;
}
