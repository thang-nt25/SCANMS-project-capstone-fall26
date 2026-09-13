import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Store,
  PackageSearch,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import api from '../../services/api';
import { GuestCheckoutModal } from '../../components/checkout/GuestCheckoutModal';

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<any | null>(null);


  const load = async (term = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/public/products', {
        params: { search: term, limit: 48 },
      });
      setItems(res.data?.items || []);
    } catch {
      setError('Không thể kết nối đến hệ thống SCANMS lúc này. Vui lòng thử lại.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Extract unique stores and categories for filtering
  const availableStores = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of items) {
      if (p.store?.id && p.store?.name) {
        map.set(p.store.id, p.store.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) {
      if (p.categoryName?.trim()) {
        set.add(p.categoryName.trim());
      }
    }
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      const matchStore =
        selectedStore === 'ALL' || p.store?.id === selectedStore;
      const matchCategory =
        selectedCategory === 'ALL' || p.categoryName === selectedCategory;
      return matchStore && matchCategory;
    });
  }, [items, selectedStore, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans">
      {/* 1. TOPBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link to="/marketplace" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C59B58] to-[#B88E4F] text-white font-black text-base flex items-center justify-center shadow-xs">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#1A1612] group-hover:text-[#B88E4F] transition">
                SCANMS
              </span>
              <span className="text-[10px] text-[#7D715E] tracking-wider uppercase font-semibold hidden sm:inline">
                Sàn Tiếp Thị Đa Gian Hàng
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/tracking"
              className="text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] px-3 py-2 rounded-xl hover:bg-[#F3EFE6] transition hidden md:inline-flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-[#B88E4F]" />
              Tra cứu đơn hàng
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-[#231D15] text-white px-4 py-2 text-xs sm:text-sm font-bold hover:bg-black transition shadow-xs"
            >
              Cổng đối tác
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO BANNER */}
      <section className="bg-gradient-to-b from-[#F3EFE6] to-[#FAF8F5] border-b border-[#EAE4D7] py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nền Tảng Thương Mại Tiếp Thị Liên Kết Đối Tác (SCANMS)</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1A1612] leading-tight m-0">
              Khám phá sản phẩm chính hãng từ các gian hàng đối tác
            </h1>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-3 mb-6 max-w-2xl leading-relaxed">
              Toàn bộ dữ liệu giá bán, tồn kho thực tế và video review của các Nhà sáng tạo (KOL) được đồng bộ trực tiếp từ hệ thống sàn SCANMS. Mua sắm an toàn, minh bạch nguồn gốc.
            </p>

            {/* Platform Highlights */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#1A1612]">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE4D7] shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                100% Hàng chính hãng
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE4D7] shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#B88E4F]" />
                Video review thực tế
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAE4D7] shadow-2xs">
                <Truck className="w-4 h-4 text-[#B88E4F]" />
                Đồng kiểm khi nhận
              </span>
            </div>
          </div>

          {/* Search Bar Form */}
          <form
            className="mt-8 flex max-w-2xl rounded-2xl border border-[#EEDFC6] bg-white p-2 shadow-sm focus-within:border-[#B88E4F] transition"
            onSubmit={(e) => {
              e.preventDefault();
              void load(search);
            }}
          >
            <Search className="m-3 h-5 w-5 text-[#B88E4F] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 outline-none text-xs sm:text-sm text-[#1A1612] placeholder-[#A49B8B]"
              placeholder="Tìm theo tên sản phẩm, mã SKU, danh mục hoặc thương hiệu..."
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  void load('');
                }}
                className="p-2 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="rounded-xl bg-[#C59B58] px-5 py-2.5 font-bold text-xs sm:text-sm text-white hover:bg-[#B88E4F] transition cursor-pointer shadow-xs"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {/* 3. FILTERS & CATALOG */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EAE4D7]">
          {/* Store selector filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7D715E] flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
              Gian hàng:
            </span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-[#F3EFE6] border border-[#EAE4D7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1612] outline-none cursor-pointer hover:bg-[#EAE4D7] transition"
            >
              <option value="ALL">Tất cả gian hàng ({availableStores.length})</option>
              {availableStores.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Pills */}
          {availableCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#C59B58] text-white shadow-xs'
                    : 'bg-white border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Tất cả ({items.length})
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#C59B58] text-white shadow-xs'
                      : 'bg-white border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-[#7D715E]">
            Hiển thị: <strong className="text-[#1A1612]">{filteredItems.length} sản phẩm</strong>
          </div>
        </div>

        {/* 4. PRODUCT GRID */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#B88E4F]" />
            <p className="text-sm font-semibold text-[#7D715E]">Đang tải danh mục sản phẩm từ sàn SCANMS...</p>
          </div>
        ) : error ? (
          <div className="my-10 rounded-2xl border border-red-200 bg-white p-8 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-red-600 mb-3">{error}</p>
            <button
              onClick={() => void load(search)}
              className="rounded-xl bg-[#C59B58] text-white px-4 py-2 text-xs font-bold hover:bg-[#B88E4F] transition cursor-pointer"
            >
              Thử tải lại
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="my-12 text-center rounded-2xl border border-dashed border-[#EEDFC6] bg-white p-14 max-w-lg mx-auto">
            <PackageSearch className="mx-auto mb-3 h-10 w-10 text-[#C59B58]" />
            <h3 className="text-base font-bold text-[#1A1612]">Không tìm thấy sản phẩm phù hợp</h3>
            <p className="text-xs text-[#7D715E] mt-1 mb-4">
              Hãy thử tìm kiếm bằng từ khóa khác hoặc bỏ các bộ lọc gian hàng / danh mục.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedStore('ALL');
                setSelectedCategory('ALL');
                void load('');
              }}
              className="rounded-xl bg-[#F3EFE6] text-[#1A1612] border border-[#EAE4D7] px-4 py-2 text-xs font-bold hover:bg-[#EAE4D7] transition cursor-pointer"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredItems.map((p) => {
              const inStock = p.stockQuantity > 0;
              const hasDiscount =
                p.originalPrice && Number(p.originalPrice) > Number(p.price);
              const discountPercent = hasDiscount
                ? Math.round(
                    ((Number(p.originalPrice) - Number(p.price)) /
                      Number(p.originalPrice)) *
                      100,
                  )
                : 0;

              return (
                <Link
                  key={p.id}
                  to={`/products/${encodeURIComponent(p.sku)}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-2xs hover:-translate-y-1 hover:shadow-lg transition duration-200"
                >
                  {/* Image Container */}
                  <div className="aspect-square bg-[#F3EFE6] relative overflow-hidden">
                    <img
                      src={p.imageUrl || '/assets/product-placeholder.svg'}
                      alt={p.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/product-placeholder.svg';
                      }}
                    />
                    {hasDiscount && (
                      <span className="absolute top-2.5 right-2.5 rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                        -{discountPercent}%
                      </span>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs grid place-items-center">
                        <span className="bg-white/90 text-[#1A1612] px-3 py-1 rounded-full text-xs font-bold">
                          Tạm hết hàng
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    {/* Store Name Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-[#7D715E]">
                      <Store className="h-3.5 w-3.5 text-[#B88E4F]" />
                      <span className="font-semibold text-[#1A1612] line-clamp-1">
                        {p.store?.name || 'Gian hàng đối tác'}
                      </span>
                      {p.store?.isVerified && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      )}
                    </div>

                    {/* Product Title */}
                    <h2 className="font-bold text-sm text-[#1A1612] line-clamp-2 min-h-10 group-hover:text-[#B88E4F] transition leading-snug m-0">
                      {p.title}
                    </h2>

                    {/* Pricing */}
                    <div className="mt-auto pt-2">
                      <div className="flex items-baseline gap-2">
                        <p className="text-base sm:text-lg font-black text-[#1A1612] m-0">
                          {Number(p.price).toLocaleString('vi-VN')} ₫
                        </p>
                        {hasDiscount && (
                          <span className="text-xs text-[#7D715E] line-through">
                            {Number(p.originalPrice).toLocaleString('vi-VN')} ₫
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EAE4D7] text-[11px] text-[#7D715E]">
                        <span>{inStock ? `Còn ${p.stockQuantity} món` : 'Hết hàng'}</span>
                        <div className="flex items-center gap-1.5">
                          {inStock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveCheckoutProduct(p);
                              }}
                              className="px-2.5 py-1 bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
                              title="Mua nhanh không cần tài khoản"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Mua ngay</span>
                            </button>
                          )}
                          <span className="font-bold text-[#7D715E] group-hover:text-[#B88E4F] flex items-center gap-0.5 transition ml-1">
                            Chi tiết <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. FOOTER */}
      <footer className="mt-auto border-t border-[#EAE4D7] bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D715E]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1A1612]">SCANMS</span>
            <span>•</span>
            <span>Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/tracking" className="hover:text-[#1A1612]">
              Tra cứu đơn hàng
            </Link>
            <Link to="/login" className="hover:text-[#1A1612]">
              Cổng đối tác
            </Link>
            <Link to="/register" className="hover:text-[#1A1612]">
              Đăng ký gian hàng & CTV
            </Link>
          </div>
        </div>
      </footer>

      {/* 6. GUEST CHECKOUT MODAL (FR-16) */}
      {activeCheckoutProduct && (
        <GuestCheckoutModal
          isOpen={!!activeCheckoutProduct}
          onClose={() => setActiveCheckoutProduct(null)}
          product={{
            id: activeCheckoutProduct.id,
            title: activeCheckoutProduct.title,
            sku: activeCheckoutProduct.sku,
            price: activeCheckoutProduct.price,
            originalPrice: activeCheckoutProduct.originalPrice,
            imageUrl: activeCheckoutProduct.imageUrl,
            stockQuantity: activeCheckoutProduct.stockQuantity ?? 0,
            variants: activeCheckoutProduct.variants,
          }}
          store={{
            id: activeCheckoutProduct.store?.id || '',
            name: activeCheckoutProduct.store?.name || 'Gian hàng đối tác',
            slug: activeCheckoutProduct.store?.slug,
          }}
          onOrderPlaced={() => {
            void load(); // Tự động làm mới tồn kho sau khi mua thành công
          }}
        />
      )}
    </main>
  );

}
