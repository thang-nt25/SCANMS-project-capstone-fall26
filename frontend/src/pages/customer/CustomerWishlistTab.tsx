import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Loader2, Search, Store, X } from 'lucide-react';
import { formatMoney, getSafeProductImageUrl, handleProductImageError, normalizeSearch } from '@/utils/marketplace.utils';
import type { CustomerWishlistItem } from '../../services/customer.service';
import { toast } from '../../utils/toast';

interface CustomerWishlistTabProps {
  items: CustomerWishlistItem[];
  loading: boolean;
  onRemove: (productId: string) => Promise<void>;
  onBuy: (product: CustomerWishlistItem['product']) => void;
}

export function CustomerWishlistTab({ items, loading, onRemove }: CustomerWishlistTabProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<string[]>([]);
  const search = normalizeSearch(query.trim());
  const filtered = items.filter(({ product }) => normalizeSearch(`${product.title} ${product.store?.name || ''}`).includes(search));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * 10;
  const visible = filtered.slice(start, start + 10);
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };
  const changePage = (value: number) => {
    setPage(value);
    document.querySelector('.workspace-page-column')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const removeItem = async (productId: string) => {
    if (removing.includes(productId)) return;
    setRemoving(ids => [...ids, productId]);
    try { await onRemove(productId); }
    catch { toast.error('Chưa bỏ lưu được sản phẩm. Vui lòng thử lại.'); }
    finally { setRemoving(ids => ids.filter(id => id !== productId)); }
  };

  return <section className="customer-wishlist" aria-label="Sản phẩm yêu thích">
    <header className="customer-wishlist-heading">
      <span className="customer-wishlist-count" aria-live="polite">{loading ? 'Đang tải…' : `${items.length} sản phẩm`}</span>
      <div className="customer-wishlist-search"><Search size={17} aria-hidden="true"/><input aria-label="Tìm trong sản phẩm yêu thích" placeholder="Tìm sản phẩm, cửa hàng…" value={query} onChange={event => changeQuery(event.target.value)}/>{query && <button type="button" aria-label="Xóa từ khóa" onClick={() => changeQuery('')}><X size={15}/></button>}</div>
    </header>
    <div className="customer-wishlist-list" aria-labelledby="wishlist-list-heading">
      <h3 className="sr-only" id="wishlist-list-heading">Danh sách sản phẩm đã lưu</h3>
      {loading ? <div className="customer-wishlist-empty" role="status"><Loader2 size={24} className="animate-spin"/><p>Đang tải sản phẩm đã lưu…</p></div>
        : !visible.length ? <div className="customer-wishlist-empty">{items.length ? <Search size={25}/> : <Heart size={25}/>}<h3>{items.length ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm đã lưu'}</h3>{items.length ? <button type="button" onClick={() => changeQuery('')}>Xem tất cả sản phẩm</button> : <Link to="/marketplace">Khám phá sản phẩm <ArrowRight size={14}/></Link>}</div>
        : visible.map(({ wishlistId, product }) => {
          const price = Number(product.price);
          const original = Number(product.originalPrice);
          const discount = original > price ? Math.round((1 - price / original) * 100) : 0;
          const unavailable = !product.isActive || product.stockQuantity <= 0;
          const busy = removing.includes(product.id);
          const productUrl = `/products/${product.sku || product.id}`;
          return <article key={wishlistId} className="customer-wishlist-row">
            <Link to={productUrl} className="customer-wishlist-photo" aria-label={`Xem ${product.title}`}><img src={getSafeProductImageUrl(product.imageUrl, product.title)} alt={product.title} loading="lazy" onError={handleProductImageError}/></Link>
            <div className="customer-wishlist-info"><Link className="customer-wishlist-product" to={productUrl} title={product.title}>{product.title}</Link><Link className="customer-wishlist-store" to={product.store?.id ? `/shops/${product.store.id}` : '/marketplace'}><Store size={13}/><span>{product.store?.name || 'Cửa hàng'}</span></Link>{unavailable && <span className="customer-wishlist-availability">{product.isActive ? 'Tạm hết hàng' : 'Ngừng bán'}</span>}</div>
            <div className="customer-wishlist-price"><strong>{formatMoney(product.price)}</strong>{discount > 0 && <div><del>{formatMoney(product.originalPrice!)}</del><span>−{discount}%</span></div>}</div>
            <div className="customer-wishlist-actions"><Link to={productUrl}>Xem sản phẩm <ArrowRight size={14}/></Link><button type="button" disabled={busy} onClick={() => void removeItem(product.id)} aria-label={`Bỏ lưu ${product.title}`} title="Bỏ lưu">{busy ? <Loader2 size={16} className="animate-spin"/> : <Heart size={16} fill="currentColor"/>}</button></div>
          </article>;
        })}
      {!loading && filtered.length > 0 && <footer className="customer-wishlist-pagination"><span>{start + 1}–{Math.min(start + 10, filtered.length)} / {filtered.length} sản phẩm</span>{filtered.length > 10 && <nav aria-label="Phân trang sản phẩm đã lưu"><button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Trước</button><span>Trang {currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>Sau</button></nav>}</footer>}
    </div>
  </section>;
}
