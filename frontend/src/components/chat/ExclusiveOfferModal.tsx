import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Handshake,
  X,
  Loader2,
  Check,
  AlertCircle,
  Search,
  Lock,
} from 'lucide-react';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { referralLinksService } from '../../services/referral-links.service';
import { formatMoney, getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

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
  const [targetOrders, setTargetOrders] = useState<number | ''>(30);
  const [days, setDays] = useState<number | ''>(14);
  const [plan, setPlan] = useState<string>(
    'Thực hiện video review chuyên sâu giới thiệu sản phẩm và hướng dẫn khách mua qua link tiếp thị độc quyền.'
  );
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

        // Giữ lại các ID hợp lệ thuộc cửa hàng này và CHƯA bị khóa Deal
        const validSelectedIds = selectedProductIds.filter((id) =>
          storeItems.some((p) => p.id === id && !p.activeDeal?.isLocked)
        );

        if (validSelectedIds.length > 0) {
          setSelectedProductIds(validSelectedIds);
        } else if (storeItems.length > 0) {
          const firstUnlocked = storeItems.find((p) => !p.activeDeal?.isLocked);
          setSelectedProductIds(firstUnlocked ? [firstUnlocked.id] : []);
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
    const numTargetOrders = Math.max(1, Math.min(10000, Math.round(Number(targetOrders) || 30)));
    const numDays = Number(days) || 14;

    try {
      const storeScopeId = primaryProduct.storeId || targetStoreId;
      const validProductIds = selectedProductIds.filter((id) => {
        const item = products.find((p) => p.id === id);
        return item && !item.activeDeal?.isLocked && (!storeScopeId || item.storeId === storeScopeId);
      });
      if (validProductIds.length === 0) {
        setError('Sản phẩm đã chọn đang có thỏa thuận độc quyền. Vui lòng chọn sản phẩm khác.');
        lock.current = false;
        setBusy(false);
        return;
      }
      const finalProductIds = validProductIds;
      const isMulti = finalProductIds.length > 1;
      const scopeType = isMulti ? 'SELECTED_PRODUCTS' : 'SINGLE_PRODUCT';

      const response: any = await api.post(
        mode === 'proposal' ? '/affiliate-deals/proposals' : '/affiliate-deals/offers',
        {
          ...(mode === 'offer' ? { collaboratorId } : {}),
          productId: finalProductIds[0],
          proposedCommissionRate: numRate,
          scopeType,
          ...(isMulti ? { productIds: finalProductIds } : {}),
          targetOrders: numTargetOrders,
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

  const modalContent = <div className="exclusive-deal-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="koc-deal-title" className="exclusive-deal-dialog">
      <header className="exclusive-deal-header"><div><h2 id="koc-deal-title">{mode === 'proposal' ? 'Đề xuất Deal' : 'Đề nghị Deal'}</h2><p>{primaryProduct?.storeName}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng đề xuất Deal"><X size={20} /></button></header>
      <form onSubmit={submit} className="exclusive-deal-form">
        <div className="exclusive-deal-columns">
          <section className="exclusive-deal-catalog" aria-label="Sản phẩm áp dụng">
            <div className="exclusive-deal-section-heading"><h3>Chọn sản phẩm</h3><span>Đã chọn {selectedProductIds.length}</span></div>
            <div className="exclusive-deal-search"><Search size={17} /><input aria-label="Tìm sản phẩm trong cửa hàng" placeholder="Tìm sản phẩm…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <div className="exclusive-deal-products">
              {loading ? <p className="exclusive-deal-empty" role="status"><Loader2 size={20} className="animate-spin" />Đang tải sản phẩm…</p> : !filteredProducts.length ? <p className="exclusive-deal-empty">Không có sản phẩm phù hợp.</p> : filteredProducts.map(p => {
                const selected = selectedProductIds.includes(p.id);
                const locked = Boolean(p.activeDeal?.isLocked);
                return <button key={p.id} type="button" disabled={locked || busy} aria-pressed={selected} className="exclusive-deal-product" onClick={() => toggleProduct(p)}>
                  <img src={getSafeProductImageUrl(p.imageUrl)} onError={handleProductImageError} alt={p.title} />
                  <span className="exclusive-deal-product-info"><strong>{p.title}</strong><span>{formatMoney(p.price)}<span className="exclusive-deal-base"> · Theo bậc {p.baseRate ?? 10}%</span></span>{p.activeDeal && <small>Đang có Deal {p.activeDeal.effectiveRate}%{locked && p.activeDeal.remainingDays != null ? ` · Còn ${p.activeDeal.remainingDays} ngày` : ''}</small>}</span>
                  <span className="exclusive-deal-check" aria-hidden="true">{locked ? <Lock size={13} /> : selected ? <Check size={14} /> : null}</span>
                </button>;
              })}
            </div>
          </section>
          <section className="exclusive-deal-terms" aria-label="Điều kiện Deal">
            <h3>Điều kiện Deal</h3>
            <div className="exclusive-deal-field"><label htmlFor="deal-rate">Thù lao đề xuất *</label><div className="exclusive-deal-unit"><input id="deal-rate" type="number" min="10" max="25" step="0.5" value={rate} onChange={e => handleRateChange(e.target.value)} onBlur={() => setRate(prev => prev === '' ? 14 : Math.min(25, Math.max(10, Number(prev))))} required /><span>%</span></div>
              <div className="exclusive-deal-presets" role="group" aria-label="Mức thù lao gợi ý">{presetPills.map(value => <button key={value} type="button" aria-pressed={rate === value} onClick={() => handleRatePreset(value)}>{value}%</button>)}</div>
              {Number(rate) > 16 && <p className="exclusive-deal-admin-note">Cần Admin phê duyệt</p>}
            </div>
            <div className="exclusive-deal-targets">
              <div className="exclusive-deal-field"><label htmlFor="deal-orders">KPI đơn hàng *</label><div className="exclusive-deal-unit"><input id="deal-orders" type="number" min="1" max="10000" step="1" value={targetOrders} onChange={e => setTargetOrders(e.target.value === '' ? '' : Math.max(1, Math.min(10000, Math.round(Number(e.target.value)))))} onBlur={() => setTargetOrders(prev => prev === '' ? 30 : Math.max(1, Math.min(10000, Math.round(Number(prev)))))} required /><span>đơn</span></div></div>
              <div className="exclusive-deal-field"><label htmlFor="deal-days">Thời hạn *</label><div className="exclusive-deal-unit"><input id="deal-days" type="number" min="7" max="90" value={days} onChange={e => setDays(e.target.value === '' ? '' : Number(e.target.value))} onBlur={() => setDays(prev => prev === '' ? 14 : Math.max(7, Math.min(90, Number(prev))))} required /><span>ngày</span></div></div>
            </div>
            <div className="exclusive-deal-field"><label htmlFor="deal-plan">Kế hoạch nội dung *</label><textarea id="deal-plan" value={plan} onChange={e => setPlan(e.target.value)} placeholder="Nội dung review và kênh chia sẻ (tối thiểu 5 ký tự)…" rows={3} minLength={5} maxLength={1000} required /></div>
            {error && <p className="exclusive-deal-error" role="alert"><AlertCircle size={16} />{error}</p>}
          </section>
        </div>
        <footer className="exclusive-deal-footer"><span>{selectedProductIds.length} sản phẩm đã chọn</span><div><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button type="submit" disabled={busy || loading || !selectedProductIds.length}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}{busy ? 'Đang gửi…' : 'Gửi đề xuất'}</button></div></footer>
      </form>
    </div>
  </div>;

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
