import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import api from '@/services/api';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';
import './ProductSearchBox.css';

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

  return <div ref={root} className={`product-search ${className}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <form onSubmit={submit} className="product-search-form" role="search">
      <input ref={input} type="search" role="combobox" autoComplete="off" maxLength={80}
        aria-label="Tìm kiếm sản phẩm" aria-autocomplete="list" aria-expanded={visible}
        aria-controls={visible ? listId : undefined} aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Tìm kiếm sản phẩm, thương hiệu..." value={value}
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
      {value && <button type="button" className="product-search-clear" aria-label="Xóa nội dung tìm kiếm" onClick={() => {
        onChange(''); onClear(); setOpen(false); setActive(-1); input.current?.focus();
      }}><X size={15} /></button>}
      {onFilter && <button type="button" className="product-search-filter" onClick={onFilter} aria-label="Bộ lọc"><SlidersHorizontal size={15} /></button>}
      <button type="submit" className="product-search-submit" aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={17} /></button>
    </form>
    {visible && <div className="product-search-popup">
      <div className="product-search-heading">{items.some(item => item.matchKind === 'related') ? 'Sản phẩm liên quan' : 'Sản phẩm gợi ý'}</div>
      <div role="status" aria-live="polite" className="product-search-status">
        {loading ? <><Loader2 size={15} className="animate-spin" />Đang tìm sản phẩm…</>
          : result.status === 'error' ? 'Chưa tải được gợi ý. Nhấn Enter để tìm kiếm.'
            : !items.length ? 'Chưa có sản phẩm phù hợp. Thử từ khóa khác.'
              : items.some(item => item.matchKind === 'related') ? 'Gợi ý chăm sóc da liên quan. Xem công dụng của từng sản phẩm.' : ''}
      </div>
      <div id={listId} role="listbox" aria-label="Gợi ý sản phẩm" className="product-search-options">
        {items.map((item, index) => <a href={`/products/${encodeURIComponent(item.sku || item.id)}`} key={item.id}
          role="option" aria-selected={active === index} id={`${listId}-${index}`} tabIndex={-1}
          className="product-search-option" onMouseDown={event => event.preventDefault()}
          onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); choose(item); }}>
          <img loading="lazy" src={getSafeProductImageUrl(item.imageUrl, item.title)} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/scanms-placeholder.svg'; }} />
          <span className="product-search-info"><span className="product-search-title">{item.title}</span>
            <span className="product-search-store">{item.storeName}{!item.inStock ? ' · Tạm hết hàng' : ''}</span>
            <span className="product-search-price">{item.hasVariants ? 'Từ ' : ''}{formatMoney(item.price)}</span>
          </span><ArrowUpRight size={15} aria-hidden="true" />
        </a>)}
        <button type="button" role="option" aria-selected={active === items.length} id={`${listId}-${items.length}`}
          tabIndex={-1} className="product-search-all" onMouseDown={event => event.preventDefault()} onClick={search}>
          <Search size={15} /><span>Tìm tất cả kết quả cho “{query}”</span>
        </button>
      </div>
    </div>}
  </div>;
}
