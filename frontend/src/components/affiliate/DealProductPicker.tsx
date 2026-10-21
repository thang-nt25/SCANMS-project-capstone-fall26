import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import api from '@/services/api';

interface DealProduct {
  id: string;
  title: string;
  price?: number | string;
  imageUrl?: string | null;
  storeId?: string;
  isAffiliateEnabled?: boolean;
}

export function DealProductPicker({ storeId, storeName, onSelect, onClose }: {
  storeId: string; storeName: string;
  onSelect: (product: DealProduct) => void; onClose: () => void;
}) {
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError('');
    void api.get('/products', { params: { storeId, page, limit: 50 }, signal: controller.signal, headers: { 'x-skip-cache': '1' } })
      .then((response: any) => {
        if (controller.signal.aborted) return;
        const payload = response?.data ?? response;
        const list = Array.isArray(payload) ? payload : payload?.items;
        if (!Array.isArray(list)) throw new Error('Invalid product response');
        const eligible = list.filter((product: DealProduct) => product.isAffiliateEnabled !== false && (!product.storeId || product.storeId === storeId));
        setProducts((old) => [...new Map((page === 1 ? eligible : [...old, ...eligible]).map((product: DealProduct) => [product.id, product])).values()]);
        setHasMore(typeof payload?.pagination?.totalPages === 'number' ? page < payload.pagination.totalPages : list.length === 50);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được sản phẩm. Hãy thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [storeId, page, retry]);
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#231D15]/40 p-4" onClick={onClose}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="deal-product-picker-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] shadow-xl outline-none">
      <header className="flex items-center justify-between gap-3 border-b border-[#EAE4D7] p-4"><div><h2 id="deal-product-picker-title" className="font-bold text-[#1A1612]">Đề xuất Deal VIP với {storeName}</h2><p className="mt-1 text-xs text-[#7D715E]">Chọn sản phẩm để mở form cam kết và phần demo.</p></div><button type="button" aria-label="Đóng chọn sản phẩm" onClick={onClose} className="rounded-lg p-2 hover:bg-[#F3EFE6]"><X size={20} /></button></header>
      <div className="space-y-2 overflow-y-auto p-4" aria-busy={busy}>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Thử lại</button></p>}
        {products.map((product) => <button type="button" key={product.id} onClick={() => onSelect(product)} className="flex w-full items-center gap-3 rounded-xl border border-[#EAE4D7] bg-white p-3 text-left hover:border-[#C59B58] hover:bg-[#FBF5EB]">
          {product.imageUrl && <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
          <span className="min-w-0 flex-1"><strong className="block text-sm text-[#1A1612]">{product.title}</strong><span className="text-xs text-[#7D715E]">{Number(product.price || 0).toLocaleString('vi-VN')} ₫</span></span><span className="text-xs font-semibold text-[#B88E4F]">Đề xuất →</span>
        </button>)}
        {busy && <p role="status" className="flex items-center justify-center gap-2 py-4 text-sm text-[#7D715E]"><Loader2 size={16} className="animate-spin" />Đang tải sản phẩm...</p>}
        {!busy && !error && !products.length && <p className="py-4 text-sm text-[#7D715E]">Shop chưa có sản phẩm nhận tiếp thị liên kết để đề xuất Deal.</p>}
        {hasMore && !error && <button type="button" disabled={busy} onClick={() => setPage((value) => value + 1)} className="w-full rounded-lg border border-[#EEDFC6] p-2 text-sm text-[#B88E4F] disabled:opacity-50">Xem thêm sản phẩm</button>}
      </div>
    </div>
  </div>;
}
