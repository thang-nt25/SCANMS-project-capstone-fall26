import { handleProductImageError } from '@/utils/image-fallback.utils';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
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
    void api.get('/products', { params: { storeId, page, limit: 50, search: search || undefined }, signal: controller.signal, headers: { 'x-skip-cache': '1' } })
      .then((response: any) => {
        if (controller.signal.aborted) return;
        const payload = response?.data?.data ?? response?.data ?? response;
        const list = Array.isArray(payload) ? payload : payload?.items;
        if (!Array.isArray(list)) throw new Error('Invalid product response');
        const eligible = list.filter((product: DealProduct) => product.isAffiliateEnabled !== false && (!storeId || product.storeId === storeId));
        setProducts((old) => [...new Map((page === 1 ? eligible : [...old, ...eligible]).map((product: DealProduct) => [product.id, product])).values()]);
        setHasMore(typeof payload?.pagination?.totalPages === 'number' ? page < payload.pagination.totalPages : list.length === 50);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được sản phẩm. Hãy thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [storeId, page, retry, search]);
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#231D15]/40 p-4" onClick={onClose}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="deal-product-picker-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} className="flex h-[min(760px,85dvh)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-xl outline-none">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EAE4D7] px-5 py-5 sm:px-6"><div className="min-w-0"><h2 id="deal-product-picker-title" className="text-lg sm:text-xl font-semibold text-[#1A1612]">Chọn sản phẩm đề xuất Deal</h2><p className="mt-1 text-sm text-[#7D715E] truncate">{storeName}</p></div><button type="button" aria-label="Đóng chọn sản phẩm" onClick={onClose} className="shrink-0 rounded-lg p-2 text-[#7D715E] hover:bg-[#F3EFE6]"><X size={20} /></button></header>
      <div className="shrink-0 px-5 py-4 sm:px-6"><label className="relative block"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" /><input aria-label="Tìm sản phẩm, SKU" placeholder="Tìm sản phẩm, SKU…" value={query} onChange={event => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white pl-10 pr-3 text-sm text-[#1A1612] outline-none focus:border-[#C59B58]" /></label></div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6" aria-busy={busy}>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Thử lại</button></p>}
        {products.map((product) => <button type="button" key={product.id} onClick={() => onSelect(product)} className="flex min-h-[104px] w-full items-center gap-3 rounded-xl border border-[#EAE4D7] bg-white px-3 py-4 text-left transition hover:border-[#EEDFC6] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]">
          <img src={product.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="h-[60px] w-[60px] shrink-0 rounded-xl border border-[#EAE4D7] bg-white object-contain" />
          <span className="min-w-0 flex-1"><strong className="block line-clamp-2 text-sm font-semibold leading-5 text-[#1A1612]">{product.title}</strong><span className="mt-1 block text-sm tabular-nums text-[#7D715E]">{Number(product.price || 0).toLocaleString('vi-VN')} ₫</span></span><span className="inline-flex h-10 w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[13px] font-medium text-[#855F2D] max-sm:w-[64px]">Chọn <ArrowRight size={14} /></span>
        </button>)}
        {busy && <p role="status" className="flex items-center justify-center gap-2 py-4 text-sm text-[#7D715E]"><Loader2 size={16} className="animate-spin" />Đang tải sản phẩm...</p>}
        {!busy && !error && !products.length && <p className="py-8 text-center text-sm text-[#7D715E]">{search ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm để đề xuất Deal.'}</p>}
        {hasMore && !error && <button type="button" disabled={busy} onClick={() => setPage((value) => value + 1)} className="w-full rounded-lg border border-[#EEDFC6] p-2 text-sm text-[#B88E4F] disabled:opacity-50">Xem thêm sản phẩm</button>}
      </div>
      <footer className="shrink-0 border-t border-[#EAE4D7] px-5 py-4 text-xs text-[#7D715E] sm:px-6" aria-live="polite">{busy ? 'Đang tải…' : `${products.length}${hasMore ? '+' : ''} sản phẩm`}</footer>
    </div>
  </div>;
}
