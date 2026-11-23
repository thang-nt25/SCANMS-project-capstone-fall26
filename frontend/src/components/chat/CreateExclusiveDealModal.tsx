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
  sku?: string;
  code?: string;
  productCode?: string;
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
  const [salesCommitment, setSalesCommitment] = useState('');

  const [showHelpPopover, setShowHelpPopover] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const submitInFlight = useRef(false);

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
      [p.title, p.sku, p.code, p.productCode, p.id].filter(Boolean).join(' ').toLocaleLowerCase('vi').includes(searchQuery.toLocaleLowerCase('vi').trim())
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
    if (submitInFlight.current) return;
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

    submitInFlight.current = true;
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
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  const numRate = commissionRate === '' ? NaN : Number(commissionRate);
  const numOrders = targetOrders === '' ? NaN : Number(targetOrders);
  const numDays = commitmentDays === '' ? NaN : Number(commitmentDays);

  const isRateInvalid = !Number.isFinite(numRate) || numRate < 11 || numRate > 25;
  const isOrdersInvalid = !Number.isFinite(numOrders) || numOrders < 1 || numOrders > 10000;
  const isDaysInvalid = !Number.isFinite(numDays) || numDays < 7 || numDays > 90;
  const isEscalation = !isRateInvalid && numRate > 16;

  const inputClass = 'h-[42px] w-full rounded-lg border border-[#EAE4D7] bg-white px-3 pr-12 text-sm font-semibold tabular-nums outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10';
  const modalContent = (
    <div role="dialog" aria-modal="true" aria-labelledby="deal-modal-title" className="fixed inset-0 z-[120] flex items-center justify-center bg-[#231D15]/50 p-3 backdrop-blur-xs sm:p-4">
      <div ref={dialogRef} className="shop-deal-offer-dialog flex w-full max-w-[960px] max-h-[90dvh] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-[#1A1612] shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><Handshake size={20}/></span>
            <div className="min-w-0"><h2 id="deal-modal-title" className="text-base font-semibold">Đề xuất thỏa thuận độc quyền</h2><p className="mt-0.5 truncate text-xs text-[#7D715E]">{collaboratorName}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FAF8F5] disabled:opacity-40"><X size={20}/></button>
        </header>
        {error && <div role="alert" className="mx-5 mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#DC2626]"><AlertCircle size={16} className="shrink-0"/><span>{error}</span></div>}
        <div className="deal-offer-body grid min-h-0 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
          <section className="deal-offer-catalog flex min-h-0 min-w-0 flex-col border-b border-[#EAE4D7] md:border-r md:border-b-0">
            <div className="shrink-0 space-y-3 p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold">Sản phẩm</h3><span className="text-xs tabular-nums text-[#7D715E]">Đã chọn {selectedProductIds.length}/{selectableProducts.length}</span></div>
              <div className="relative"><Search size={15} className="absolute top-3.5 left-3 text-[#7D715E]"/><input aria-label="Tìm sản phẩm" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Tìm tên hoặc mã sản phẩm…" className="h-[42px] w-full rounded-lg border border-[#EAE4D7] bg-white pr-3 pl-9 text-xs outline-none focus:border-[#C59B58]"/></div>
              <div className="flex items-center gap-3 text-xs"><button type="button" onClick={handleSelectAll} disabled={submitting || !selectableProducts.length} className="font-semibold text-[#90682F] hover:underline disabled:opacity-40">Chọn tất cả</button><span className="h-3 w-px bg-[#EAE4D7]"/><button type="button" onClick={handleClearAll} disabled={submitting || !selectedProductIds.length} className="text-[#7D715E] hover:underline disabled:opacity-40">Bỏ chọn</button></div>
            </div>
            <div className="deal-offer-products min-h-0 space-y-2 overflow-y-auto px-4 pb-4">
              {loadingProducts ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-xs text-[#7D715E]"><Loader2 size={16} className="animate-spin"/>Đang tải sản phẩm…</p> : !filteredProducts.length ? <p className="py-8 text-center text-xs text-[#7D715E]">Không có sản phẩm phù hợp</p> : filteredProducts.map(product=>{
                const locked = Boolean(product.activeDeal?.isLocked);
                const selected = selectedProductIds.includes(product.id);
                return <button key={product.id} type="button" aria-pressed={selected} disabled={locked || submitting} onClick={()=>toggleProduct(product.id)} className={`deal-offer-product flex min-h-[72px] w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58] ${locked ? 'cursor-not-allowed border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]' : selected ? 'border-[#C59B58] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'}`}>
                  <span aria-hidden="true" className={`grid size-4 shrink-0 place-items-center rounded border ${selected ? 'border-[#C59B58] bg-[#C59B58] text-[#231D15]' : 'border-[#EAE4D7]'}`}>{locked ? <Lock size={11}/> : selected ? <Check size={12}/> : null}</span>
                  <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EAE4D7] bg-white">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-contain"/> : <Package size={20} className="text-[#B88E4F]"/>}</span>
                  <span className="min-w-0 flex-1"><strong title={product.title} className="line-clamp-2 text-xs leading-[18px] font-semibold">{product.title}</strong><span className="mt-0.5 block text-xs font-semibold tabular-nums">{formatMoney(product.price)}</span>
                    {product.activeDeal && <span className="mt-1 block text-[10px] leading-4 text-[#90682F]">{locked ? `Đang có Deal ${product.activeDeal.effectiveRate}% · ${product.activeDeal.remainingDays != null ? `Còn ${product.activeDeal.remainingDays} ngày` : 'Chờ duyệt'}` : `Deal trước: ${product.activeDeal.effectiveRate}% · Đã hết KPI`}</span>}
                  </span>
                </button>;
              })}
            </div>
          </section>
          <section className="deal-offer-terms min-w-0 space-y-4 p-4 md:p-5">
            <h3 className="text-xs font-semibold">Điều khoản</h3>
            <div>
              <div className="mb-2 flex items-center gap-1.5"><label htmlFor="deal-offer-rate" className="text-[13px] font-medium">Thù lao tổng <span className="text-[#DC2626]">*</span></label><button type="button" aria-label="Quy định thù lao" aria-expanded={showHelpPopover} aria-controls="deal-offer-help" onClick={()=>setShowHelpPopover(value=>!value)} className="text-[#7D715E] hover:text-[#B88E4F]"><HelpCircle size={14}/></button></div>
              {showHelpPopover && <p id="deal-offer-help" className="mb-2 rounded-lg bg-[#FBF5EB] p-2.5 text-xs leading-5 text-[#7D715E]">Mức Deal không cộng thêm bậc KOL. Trên 16% cần Admin phê duyệt; tối đa 25%.</p>}
              <div className="relative"><input id="deal-offer-rate" type="number" min={11} max={25} step="0.5" value={commissionRate} disabled={submitting} onChange={e=>setCommissionRate(e.target.value===''?'':Number(e.target.value))} onBlur={()=>setCommissionRate(value=>value===''?14:Math.min(25,Math.max(11,Number(value))))} className={inputClass}/><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#7D715E]">%</span></div>
              <div className="mt-2 grid grid-cols-4 gap-2">{[12,14,16,18].map(rate=><button key={rate} type="button" aria-pressed={commissionRate===rate} disabled={submitting} onClick={()=>setCommissionRate(rate)} className={`h-8 rounded-lg border text-xs font-semibold tabular-nums ${commissionRate===rate?'border-[#C59B58] bg-[#FBF5EB] text-[#79592C]':'border-[#EAE4D7] hover:bg-[#FAF8F5]'}`}>{rate}%</button>)}</div>
              {isEscalation && <p className="mt-2 flex items-center gap-1.5 text-xs text-[#90682F]"><ShieldAlert size={14}/>Cần Admin phê duyệt.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="mb-2 flex items-center gap-1.5"><label htmlFor="deal-offer-orders" className="text-[13px] font-medium">KPI đơn hàng <span className="text-[#DC2626]">*</span></label><span tabIndex={0} title="KPI cho nhóm sản phẩm đã chọn" aria-label="KPI cho nhóm sản phẩm đã chọn" className="text-[#7D715E]"><HelpCircle size={13}/></span></div><div className="relative"><input id="deal-offer-orders" type="number" min={1} value={targetOrders} disabled={submitting} onChange={e=>setTargetOrders(e.target.value===''?'':Number(e.target.value))} onBlur={()=>setTargetOrders(value=>value===''?30:Math.max(1,Number(value)))} className={inputClass}/><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#7D715E]">đơn</span></div></div>
              <div><label htmlFor="deal-offer-days" className="mb-2 block text-[13px] font-medium">Thời hạn <span className="text-[#DC2626]">*</span></label><div className="relative"><input id="deal-offer-days" type="number" min={7} max={90} value={commitmentDays} disabled={submitting} onChange={e=>setCommitmentDays(e.target.value===''?'':Number(e.target.value))} onBlur={()=>setCommitmentDays(value=>value===''?14:Math.max(7,Math.min(90,Number(value))))} className={inputClass}/><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#7D715E]">ngày</span></div></div>
            </div>
            <div><label htmlFor="deal-offer-note" className="mb-2 block text-[13px] font-medium">Ghi chú điều khoản <span className="font-normal text-[#7D715E]">· Không bắt buộc</span></label><textarea id="deal-offer-note" value={salesCommitment} disabled={submitting} onChange={e=>setSalesCommitment(e.target.value)} placeholder="Nhập điều khoản bổ sung…" className="h-20 w-full resize-none rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-[#C59B58]"/></div>
          </section>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] bg-white px-5 py-4">
          <div className="exclusive-deal-summary text-xs tabular-nums text-[#7D715E]">{selectedProductIds.length} sản phẩm · {commissionRate || 0}% · {targetOrders || 0} đơn · {commitmentDays || 0} ngày</div>
          <div className="flex items-center gap-2"><button type="button" onClick={onClose} disabled={submitting} className="h-[42px] rounded-lg border border-[#EAE4D7] bg-white px-4 text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-40">Quay lại</button><button type="button" onClick={handleSubmit} disabled={submitting || !selectedProductIds.length || loadingProducts || isRateInvalid || isOrdersInvalid || isDaysInvalid} className="flex h-[42px] items-center justify-center gap-2 rounded-lg border border-[#B88E4F] bg-[#C59B58] px-5 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <Loader2 size={15} className="animate-spin"/> : <Handshake size={16}/>}<span>{submitting?'Đang gửi…':'Gửi đề xuất'}</span></button></div>
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
