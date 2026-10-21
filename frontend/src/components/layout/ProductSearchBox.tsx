import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import api from '@/services/api';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';

interface Suggestion {
  id: string; sku: string; title: string; imageUrl?: string | null;
  price: number; storeName: string; hasVariants: boolean; inStock: boolean;
  matchKind?: 'direct' | 'related';
}
interface Props {
  value: string; onChange: (value: string) => void; onSearch: (value: string) => void;
  onClear: () => void; onFilter?: () => void; className?: string;
}

// Public suggestions only; short TTL keeps prices/availability reasonably fresh.
const suggestionCache = new Map<string, { items: Suggestion[]; expires: number }>();
const CACHE_TTL = 30_000;
const CACHE_LIMIT = 40;
const smallButtonClass = 'inline-flex min-h-8 min-w-[30px] shrink-0 cursor-pointer items-center justify-center rounded text-[#7D715E] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58]';

export function ProductSearchBox({ value, onChange, onSearch, onClear, onFilter, className = '' }: Props) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const composing = useRef(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ query: string; items: Suggestion[]; status: 'loading' | 'ready' | 'error' }>({ query: '', items: [], status: 'ready' });
  const query = value.trim().replace(/\s+/g, ' ');
  // Vietnamese IMEs may keep a word composing until a click or space. Show
  // suggestions for that text too; debounce/abort already handle intermediate edits.
  const visible = open && query.length >= 2;
  const items = result.query === query ? result.items : [];
  const loading = visible && (result.query !== query || result.status === 'loading');

  useEffect(() => {
    setActive(-1);
    if (!visible) return;
    const cacheKey = query.normalize('NFC').toLowerCase();
    const cached = suggestionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      setResult({ query, items: cached.items, status: 'ready' });
      return;
    }
    suggestionCache.delete(cacheKey);
    let current = true;
    const controller = new AbortController();
    setResult({ query, items: [], status: 'loading' });
    const timer = window.setTimeout(() => {
      api.get('/public/products/suggestions', { params: { search: query }, signal: controller.signal,
        headers: { 'x-skip-cache': 'true' } }).then((response: any) => {
        const payload = response?.data?.data ?? response?.data ?? response;
        if (current) {
          const items = Array.isArray(payload) ? payload.slice(0, 6) : [];
          if (suggestionCache.size >= CACHE_LIMIT) suggestionCache.delete(suggestionCache.keys().next().value!);
          suggestionCache.set(cacheKey, { items, expires: Date.now() + CACHE_TTL });
          setResult({ query, items, status: 'ready' });
        }
      }).catch(() => { if (current) setResult({ query, items: [], status: 'error' }); });
    }, 120);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [query, visible]);

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  useEffect(() => {
    if (visible && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [visible, active, listId]);

  const search = () => { setOpen(false); setActive(-1); onSearch(query); };
  const choose = (item: Suggestion) => {
    setOpen(false); setActive(-1);
    navigate(`/products/${encodeURIComponent(item.sku || item.id)}`);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!composing.current) search(); };

  return <div ref={root} className={`product-search relative min-w-0 ${className}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <form onSubmit={submit} className="product-search-form flex w-full items-center gap-1 rounded border border-[#EAE4D7] bg-white p-[3px] focus-within:border-[#C59B58]" role="search">
      <input ref={input} type="search" role="combobox" autoComplete="off" maxLength={80}
        aria-label="Tìm kiếm sản phẩm" aria-autocomplete="list" aria-expanded={visible}
        aria-controls={visible ? listId : undefined} aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Tìm kiếm sản phẩm, thương hiệu..." value={value}
        className="min-w-0 w-full flex-1 border-0 bg-transparent px-2.5 py-[7px] text-[13px] leading-normal text-[#1A1612] outline-none placeholder:text-[#7D715E] [&::-webkit-search-cancel-button]:appearance-none max-[480px]:px-[7px] max-[480px]:text-[12px]"
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
        onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={event => {
          composing.current = false;
          onChange(event.currentTarget.value);
        }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || composing.current) return;
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive(index => event.key === 'ArrowDown' ? Math.min(index + 1, items.length) : Math.max(index - 1, -1));
          }
          if (event.key === 'Enter' && visible && active >= 0) {
            event.preventDefault(); if (active < items.length) choose(items[active]); else search();
          }
        }} />
      {value && <button type="button" className={`product-search-clear ${smallButtonClass}`} aria-label="Xóa nội dung tìm kiếm" onClick={() => {
        onChange(''); onClear(); setOpen(false); setActive(-1); input.current?.focus();
      }}><X size={15} /></button>}
      {onFilter && <button type="button" className={`product-search-filter ${smallButtonClass}`} onClick={onFilter} aria-label="Bộ lọc"><SlidersHorizontal size={15} /></button>}
      <button type="submit" className="product-search-submit inline-flex h-9 w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58] max-[480px]:h-8 max-[480px]:w-10" aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={17} /></button>
    </form>
    {visible && <div className="product-search-popup absolute inset-x-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-xl border border-[#EAE4D7] bg-white text-left shadow-[0_12px_32px_rgb(35_29_21/14%)]">
      <div className="product-search-heading px-3.5 pt-3 pb-[7px] text-[11px] font-[650] text-[#7D715E]">{items.some(item => item.matchKind === 'related') ? 'Sản phẩm liên quan' : 'Sản phẩm gợi ý'}</div>
      <div role="status" aria-live="polite" className="product-search-status flex items-center gap-2 px-3.5 py-2 text-[12px] text-[#7D715E] empty:hidden">
        {loading ? <><Loader2 size={15} className="animate-spin" />Đang tìm sản phẩm…</>
          : result.status === 'error' ? 'Chưa tải được gợi ý. Nhấn Enter để tìm kiếm.'
            : !items.length ? 'Chưa có sản phẩm phù hợp. Thử từ khóa khác.'
              : items.some(item => item.matchKind === 'related') ? 'Gợi ý chăm sóc da liên quan. Xem công dụng của từng sản phẩm.' : ''}
      </div>
      <div id={listId} role="listbox" aria-label="Gợi ý sản phẩm" className="product-search-options max-h-[min(440px,52dvh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {items.map((item, index) => <a href={`/products/${encodeURIComponent(item.sku || item.id)}`} key={item.id}
          role="option" aria-selected={active === index} id={`${listId}-${index}`} tabIndex={-1}
          className="product-search-option flex items-center gap-[11px] px-3.5 py-2.5 text-[#1A1612] no-underline hover:bg-[#FBF5EB] aria-selected:bg-[#FBF5EB] max-[480px]:px-2.5" onMouseDown={event => event.preventDefault()}
          onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); choose(item); }}>
          <img className="h-[46px] w-[46px] shrink-0 rounded-[7px] border border-[#EAE4D7] object-contain" loading="lazy" src={getSafeProductImageUrl(item.imageUrl, item.title)} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/scanms-placeholder.svg'; }} />
          <span className="product-search-info flex min-w-0 flex-1 flex-col gap-[3px]"><span className="product-search-title truncate text-[12px] font-semibold">{item.title}</span>
            <span className="product-search-store truncate text-[10px] text-[#7D715E]">{item.storeName}{!item.inStock ? ' · Tạm hết hàng' : ''}</span>
            <span className="product-search-price text-[12px] font-[650] text-[#8C6B32]">{item.hasVariants ? 'Từ ' : ''}{formatMoney(item.price)}</span>
          </span><ArrowUpRight className="shrink-0 text-[#B88E4F]" size={15} aria-hidden="true" />
        </a>)}
        <button type="button" role="option" aria-selected={active === items.length} id={`${listId}-${items.length}`}
          tabIndex={-1} className="product-search-all flex min-h-11 w-full cursor-pointer items-center gap-[9px] border-t border-[#EAE4D7] px-3.5 py-[11px] text-left text-[12px] text-[#8C6B32] aria-selected:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58]" onMouseDown={event => event.preventDefault()} onClick={search}>
          <Search size={15} /><span className="[overflow-wrap:anywhere]">Tìm tất cả kết quả cho “{query}”</span>
        </button>
      </div>
    </div>}
  </div>;
}
