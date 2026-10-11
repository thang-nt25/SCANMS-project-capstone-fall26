import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  ExternalLink,
  Heart,
  Loader2,
  Search,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import {
  formatMoney,
  getSafeProductImageUrl,
  normalizeSearch,
} from '@/utils/marketplace.utils';
import type { CustomerWishlistItem } from '../../services/customer.service';
import './CustomerWishlistTab.css';

interface CustomerWishlistTabProps {
  items: CustomerWishlistItem[];
  loading: boolean;
  onRemove: (productId: string) => Promise<void>;
  onBuy: (product: CustomerWishlistItem['product']) => void;
}

export function CustomerWishlistTab({
  items,
  loading,
  onRemove,
  onBuy,
}: CustomerWishlistTabProps) {
  const [query, setQuery] = useState('');
  const [removing, setRemoving] = useState<string[]>([]);
  const search = normalizeSearch(query.trim());
  const filteredItems = items.filter(({ product }) =>
    normalizeSearch(`${product.title} ${product.store?.name || ''}`).includes(
      search,
    ),
  );

  const removeItem = async (productId: string) => {
    setRemoving((ids) => [...ids, productId]);
    try {
      await onRemove(productId);
    } finally {
      setRemoving((ids) => ids.filter((id) => id !== productId));
    }
  };

  return (
    <section className="customer-wishlist" aria-labelledby="customer-wishlist-title">
      <header className="wishlist-heading">
        <span className="wishlist-heading-icon" aria-hidden="true"><Heart size={18} /></span>
        <div>
          <h1 id="customer-wishlist-title">Sản phẩm yêu thích</h1>
          <p>Những sản phẩm bạn đã lưu để mua khi cần.</p>
        </div>
      </header>
      <div className="wishlist-toolbar">
        <div className="wishlist-list-summary" aria-live="polite" aria-atomic="true">
          <span className="wishlist-list-icon" aria-hidden="true"><Bookmark size={16} /></span>
          <h2 className="wishlist-result-count" id="wishlist-list-heading">Danh sách đã lưu</h2>
          <span className="wishlist-count">
            {loading ? 'Đang tải…' : `${items.length} sản phẩm`}
          </span>
          {!loading && search && (
            <span className="wishlist-filter-count">{filteredItems.length} kết quả</span>
          )}
        </div>
        <div className="wishlist-toolbar-actions">
          <div className="wishlist-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Tìm trong sản phẩm yêu thích"
              placeholder="Tìm sản phẩm, gian hàng…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Xóa từ khóa"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <Link to="/marketplace" className="wishlist-browse wishlist-toolbar-browse">
            Tiếp tục mua sắm <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="wishlist-state" role="status">
          <Loader2 className="animate-spin" size={26} />
          <p>Đang tải sản phẩm yêu thích…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="wishlist-state">
          <span className="wishlist-empty-icon">
            <Heart size={28} />
          </span>
          <h2>Chưa có sản phẩm yêu thích</h2>
          <p>Nhấn biểu tượng trái tim trên sản phẩm để lưu vào đây.</p>
          <Link to="/marketplace" className="wishlist-primary">
            Khám phá sản phẩm <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {filteredItems.length === 0 ? (
            <div className="wishlist-state">
              <Search size={26} />
              <h2>Không tìm thấy sản phẩm</h2>
              <p>Thử tên sản phẩm hoặc gian hàng khác.</p>
              <button
                type="button"
                className="wishlist-browse"
                onClick={() => setQuery('')}
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          ) : (
            <div className="wishlist-grid">
              {filteredItems.map(({ wishlistId, product: p }) => {
                const discount =
                  p.originalPrice && Number(p.originalPrice) > Number(p.price)
                    ? Math.round(
                        (1 - Number(p.price) / Number(p.originalPrice)) * 100,
                      )
                    : 0;
                const unavailable = !p.isActive || p.stockQuantity <= 0;
                const busy = removing.includes(p.id);
                const productUrl = `/products/${p.sku || p.id}`;
                return (
                  <article className="wishlist-card" key={wishlistId}>
                    <div className="wishlist-media">
                      <Link
                        to={productUrl}
                        className="wishlist-image-link"
                        aria-label={`Xem ${p.title}`}
                      >
                        <img
                          src={getSafeProductImageUrl(p.imageUrl, p.title)}
                          alt={p.title}
                          loading="lazy"
                          onError={(event) => {
                            if (!event.currentTarget.dataset.hasFallback) {
                              event.currentTarget.dataset.hasFallback = 'true';
                              event.currentTarget.src = getSafeProductImageUrl(
                                null,
                                p.title,
                              );
                            }
                          }}
                        />
                      </Link>
                      {discount > 0 && (
                        <span className="wishlist-discount">−{discount}%</span>
                      )}
                      <button
                        type="button"
                        className="wishlist-remove"
                        disabled={busy}
                        onClick={() => void removeItem(p.id)}
                        aria-label={`Bỏ yêu thích ${p.title}`}
                        title="Bỏ yêu thích"
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Heart size={16} fill="currentColor" />
                        )}
                      </button>
                      {unavailable && (
                        <span className="wishlist-unavailable">
                          {p.isActive ? 'Tạm hết hàng' : 'Ngừng bán'}
                        </span>
                      )}
                    </div>
                    <div className="wishlist-card-body">
                      <Link
                        to={
                          p.store?.id ? `/shops/${p.store.id}` : '/marketplace'
                        }
                        className="wishlist-store"
                      >
                        <Store size={13} />
                        <span>{p.store?.name || 'Gian hàng đối tác'}</span>
                      </Link>
                      <Link
                        to={productUrl}
                        className="wishlist-product-title"
                        title={p.title}
                      >
                        {p.title}
                      </Link>
                      <div className="wishlist-card-bottom">
                      <div className="wishlist-prices">
                        <strong>{formatMoney(p.price)}</strong>
                        {discount > 0 && (
                          <del>{formatMoney(p.originalPrice!)}</del>
                        )}
                      </div>
                      <div className="wishlist-card-actions">
                        <button
                          type="button"
                          className="wishlist-primary"
                          disabled={unavailable}
                          onClick={() => onBuy(p)}
                        >
                          <ShoppingBag size={15} />
                          {unavailable ? 'Chưa thể mua' : 'Mua ngay'}
                        </button>
                        <Link
                          to={productUrl}
                          className="wishlist-detail"
                          aria-label={`Xem chi tiết ${p.title}`}
                          title="Xem chi tiết"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
