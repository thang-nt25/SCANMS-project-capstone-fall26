import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Store,
  X,
  ShoppingBag,
  ShoppingCart,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Filter,
  BadgeCheck,
  Radio,
  Coins,
  Sparkles,
  Package,
  MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import { GuestCheckoutModal, type CheckoutProductItem, type CheckoutStoreInfo } from '../../components/checkout/GuestCheckoutModal';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { authService } from '../../services/auth.service';
import { formatMoney } from '../../features/marketplace/marketplaceUtils';
import type { Product } from '../../features/marketplace/marketplace.types';
import { toast } from '../../utils/toast';

interface CategoryItem {
  name: string;
  count: number;
}

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isVerified?: boolean;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const storeParam = searchParams.get('store') || 'all';

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);

  // Search & Filter state synced with URL params
  const [searchInput, setSearchInput] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedStore, setSelectedStore] = useState<string>(storeParam);
  const [pricePreset, setPricePreset] = useState<string>(searchParams.get('preset') || 'all');
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('max') || '');
  const [onlyHasCommission, setOnlyHasCommission] = useState(searchParams.get('commission') === 'true');
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'newest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Cart & Modals
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  // Checkout modal
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<{
    product: CheckoutProductItem;
    store: CheckoutStoreInfo;
    couponCode?: string;
    quantity?: number;
  } | null>(null);

  const currentUser = authService.getCurrentUser();
  const isKolUser = currentUser?.role === 'COLLABORATOR';

  const handleContactShopFromCard = (product: Product) => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập tài khoản KOL để trao đổi hợp tác cùng Shop');
      navigate(`/login?redirect=/products/${product.sku || product.id}`);
      return;
    }
    if (!isKolUser) {
      toast.info('Tính năng liên hệ shop trực tiếp dành riêng cho tài khoản KOL/Creator.');
      return;
    }
    const storeId = product.storeId || 'a7e7bd20-bebc-44c9-a98b-004de44cf773';
    navigate(
      `/collaborator/collaboration?tab=messages&storeId=${storeId}&productId=${product.id}&productTitle=${encodeURIComponent(product.name)}&productImage=${encodeURIComponent(product.image)}&productPrice=${product.price}&productSku=${product.sku || ''}&commissionRate=${product.commissionRate || 15}`
    );
  };

  // Sync state when URL params change
  useEffect(() => {
    setSearchInput(queryParam);
    setSelectedCategory(categoryParam);
    setSelectedStore(storeParam);
  }, [queryParam, categoryParam, storeParam]);

  // Update URL search parameters when filters change
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || value === 'false') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  // Fetch real categories and stores
  useEffect(() => {
    let mounted = true;

    api.get('/public/products/categories')
      .then((res) => {
        if (!mounted) return;
        const payload = res.data?.data !== undefined ? res.data.data : res.data;
        if (Array.isArray(payload)) {
          setCategories(payload);
        }
      })
      .catch(() => {});

    api.get('/public/products/stores')
      .then((res) => {
        if (!mounted) return;
        const payload = res.data?.data !== undefined ? res.data.data : res.data;
        if (Array.isArray(payload)) {
          setStores(payload);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real products from backend
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api.get('/public/products?limit=100')
      .then((res) => {
        if (!mounted) return;
        const payload = res.data?.data !== undefined ? res.data.data : res.data;
        const productList = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

        if (productList.length > 0) {
          const mapped: Product[] = productList.map((item: any) => {
            const rawRate = Number(item.customCommissionRate || item.commissionRate || 15);
            const priceNum = Number(item.price) || 0;
            const origNum = Number(item.originalPrice) || 0;

            let badge = '';
            if (rawRate >= 25) badge = `Hoa hồng ${rawRate}%`;
            else if (origNum > priceNum) badge = `Giảm ${Math.round(((origNum - priceNum) / origNum) * 100)}%`;
            else if (item.stockQuantity > 0) badge = 'Sẵn hàng';

            return {
              id: item.id,
              sku: item.sku || item.id,
              name: item.title || item.name,
              category: item.categoryName || 'Khác',
              price: priceNum,
              origPrice: origNum,
              image: item.imageUrl || '/reference/assets/serum-hero-optimized.jpg',
              rating: 5.0,
              sold: 50 + (item.stockQuantity % 120),
              commissionRate: rawRate,
              seller: item.store?.name || 'ScanMS Partner Shop',
              storeId: item.store?.id || '',
              stock: item.stockQuantity !== undefined ? item.stockQuantity : 100,
              badge,
              features: ['Chính hãng 100%', 'Đồng kiểm tận tay', 'Bảo hộ 14 ngày'],
            };
          });

          setItems(mapped);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải sản phẩm:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);


  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    return items.filter((p) => {
      // 1. Search keyword
      if (searchInput.trim()) {
        const q = searchInput.toLowerCase().trim();
        const matchTitle = p.name.toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchCategory = (p.category || '').toLowerCase().includes(q);
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchBrand && !matchCategory && !matchSku) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'all') {
        if (p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Store
      if (selectedStore !== 'all') {
        if (p.storeId !== selectedStore && p.brand !== selectedStore) {
          return false;
        }
      }

      // 4. Price presets
      if (pricePreset === 'under500' && p.price >= 500000) return false;
      if (pricePreset === '500to1000' && (p.price < 500000 || p.price > 1000000)) return false;
      if (pricePreset === '1000to3000' && (p.price < 1000000 || p.price > 3000000)) return false;
      if (pricePreset === 'above3000' && p.price <= 3000000) return false;

      // 5. Custom price bounds
      if (minPrice && p.price < Number(minPrice)) return false;
      if (maxPrice && p.price > Number(maxPrice)) return false;

      // 6. Only with commission
      if (onlyHasCommission && (!p.commissionRate || p.commissionRate <= 0)) {
        return false;
      }

      // 7. Only in stock
      if (onlyInStock && (p.stockQuantity ?? 0) <= 0) {
        return false;
      }

      return true;
    });
  }, [
    items,
    searchInput,
    selectedCategory,
    selectedStore,
    pricePreset,
    minPrice,
    maxPrice,
    onlyHasCommission,
    onlyInStock,
  ]);

  // Sort
  const displayedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchInput.trim()) count++;
    if (selectedCategory !== 'all') count++;
    if (selectedStore !== 'all') count++;
    if (pricePreset !== 'all' || minPrice || maxPrice) count++;
    if (onlyHasCommission) count++;
    if (onlyInStock) count++;
    return count;
  }, [searchInput, selectedCategory, selectedStore, pricePreset, minPrice, maxPrice, onlyHasCommission, onlyInStock]);

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedCategory('all');
    setSelectedStore('all');
    setPricePreset('all');
    setMinPrice('');
    setMaxPrice('');
    setOnlyHasCommission(false);
    setOnlyInStock(false);
    navigate('/search', { replace: true });
  };

  const getCategoryVisual = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('mỹ phẩm') || lower.includes('da') || lower.includes('skin')) return { icon: '✨', label: name };
    if (lower.includes('gia dụng')) return { icon: '🏠', label: name };
    if (lower.includes('máy tính') || lower.includes('công nghệ') || lower.includes('tai nghe') || lower.includes('bàn phím')) return { icon: '⚡', label: name };
    if (lower.includes('sức khỏe') || lower.includes('thảo mộc') || lower.includes('trà') || lower.includes('hạt')) return { icon: '🌿', label: name };
    return { icon: '📦', label: name };
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += quantity;
        return next;
      }
      return [...prev, { product, quantity }];
    });
    toast.success(`Đã thêm "${product.name.slice(0, 32)}..." vào giỏ hàng!`);
  };

  // Filter content renderer (shared by Desktop Sidebar and Mobile Drawer)
  const renderFilterContent = () => (
    <div className="space-y-6 text-left">
      {/* Category Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-[#8C6226] flex items-center gap-1.5">
            <span>Ngành Hàng</span>
          </label>
          <span className="text-[10px] text-[#7D715E] font-bold">
            {categories.length} danh mục
          </span>
        </div>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              updateUrlParams({ category: null });
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#FBF5EB] text-[#8C6226] font-bold border border-[#EEDFC6] shadow-2xs'
                : 'text-[#1A1612] hover:bg-[#FAF8F5] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🌟</span>
              <span>Tất cả ngành hàng</span>
            </span>
            {selectedCategory === 'all' && <Check className="w-3.5 h-3.5 text-[#B88E4F]" />}
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const visual = getCategoryVisual(cat.name);
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  updateUrlParams({ category: cat.name });
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF5EB] text-[#8C6226] font-bold border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#1A1612] hover:bg-[#FAF8F5] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2 truncate pr-2">
                  <span>{visual.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="text-[10px] font-bold text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EAE4D7] shrink-0">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Partner Store Section */}
      <div className="pt-4 border-t border-[#EAE4D7]">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-[#8C6226]">
            Gian Hàng Đối Tác
          </label>
          <span className="text-[10px] text-[#7D715E] font-bold">
            {stores.length} gian hàng
          </span>
        </div>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => {
              setSelectedStore('all');
              updateUrlParams({ store: null });
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
              selectedStore === 'all'
                ? 'bg-[#FBF5EB] text-[#8C6226] font-bold border border-[#EEDFC6] shadow-2xs'
                : 'text-[#1A1612] hover:bg-[#FAF8F5] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Toàn bộ gian hàng</span>
            </span>
            {selectedStore === 'all' && <Check className="w-3.5 h-3.5 text-[#B88E4F]" />}
          </button>

          {stores.map((st) => {
            const isSelected = selectedStore === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setSelectedStore(st.id);
                  updateUrlParams({ store: st.id });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF5EB] text-[#8C6226] font-bold border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#1A1612] hover:bg-[#FAF8F5] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-6 h-6 rounded-full bg-[#FAF8F5] border border-[#EEDFC6] text-[#8C6226] text-[10px] font-black flex items-center justify-center shrink-0">
                    {st.name.charAt(0)}
                  </div>
                  <span className="truncate text-left">{st.name}</span>
                  <span title="Gian hàng đã xác minh 100% KYC">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Section */}
      <div className="pt-4 border-t border-[#EAE4D7]">
        <label className="block text-xs font-black uppercase tracking-wider text-[#8C6226] mb-2.5">
          Khoảng Giá
        </label>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { id: 'all', label: 'Tất cả giá' },
            { id: 'under500', label: '< 500k' },
            { id: '500to1000', label: '500k - 1Tr' },
            { id: '1000to3000', label: '1Tr - 3Tr' },
            { id: 'above3000', label: '> 3 Triệu' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPricePreset(p.id);
                updateUrlParams({ preset: p.id === 'all' ? null : p.id });
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer text-center ${
                pricePreset === p.id
                  ? 'bg-[#C59B58] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:border-[#C59B58] hover:text-[#1A1612]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Min / Max Inputs */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#7D715E] block">Tùy chỉnh khoảng giá (₫):</span>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPricePreset('custom');
                }}
                placeholder="Từ ₫"
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-2.5 py-1.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] font-medium"
              />
            </div>
            <span className="text-[#7D715E] font-bold text-xs">-</span>
            <div className="relative flex-1">
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPricePreset('custom');
                }}
                placeholder="Đến ₫"
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-2.5 py-1.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] font-medium"
              />
            </div>
          </div>
          {(minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => updateUrlParams({ min: minPrice || null, max: maxPrice || null })}
              className="w-full mt-1.5 py-1.5 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] hover:bg-[#F3EFE6] transition"
            >
              Áp dụng mức giá
            </button>
          )}
        </div>
      </div>

      {/* Partner Privilege Toggles */}
      <div className="pt-4 border-t border-[#EAE4D7] space-y-2.5">
        <label className="block text-xs font-black uppercase tracking-wider text-[#8C6226] mb-1">
          Đặc Quyền Đối Tác & Trạng Thái
        </label>

        {/* Toggle 1: Commission */}
        <div
          onClick={() => {
            const next = !onlyHasCommission;
            setOnlyHasCommission(next);
            updateUrlParams({ commission: next ? 'true' : null });
          }}
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF8F5] transition cursor-pointer border border-transparent hover:border-[#EAE4D7]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-[#1A1612]">Hoa hồng CTV/KOL</span>
              <small className="text-[10px] text-[#7D715E] block truncate">Sản phẩm có mức chia sẻ</small>
            </div>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${onlyHasCommission ? 'bg-[#C59B58]' : 'bg-[#EAE4D7]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${onlyHasCommission ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Toggle 2: In Stock */}
        <div
          onClick={() => {
            const next = !onlyInStock;
            setOnlyInStock(next);
            updateUrlParams({ inStock: next ? 'true' : null });
          }}
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF8F5] transition cursor-pointer border border-transparent hover:border-[#EAE4D7]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F3EFE6] text-[#7A561B] border border-[#EEDFC6] flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-[#1A1612]">Sẵn hàng đóng gói</span>
              <small className="text-[10px] text-[#7D715E] block truncate">Giao ngay trong 24-48h</small>
            </div>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${onlyInStock ? 'bg-[#C59B58]' : 'bg-[#EAE4D7]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${onlyInStock ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans selection:bg-[#F3EFE6] selection:text-[#B88E4F] overflow-x-clip">

      {/* Unified Public Header */}
      <PublicHeader
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        defaultSearchQuery={searchInput}
        onSearchSubmit={(q) => {
          setSearchInput(q);
          updateUrlParams({ q: q || null });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left">
        
        {/* Breadcrumb & Search Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#EAE4D7]">
          <div>
            <div className="text-xs text-[#7D715E] flex items-center gap-1.5 mb-1">
              <Link to="/" className="hover:text-[#C59B58]">Trang chủ</Link>
              <span>/</span>
              <span>Tìm kiếm & Bộ lọc</span>
              {searchInput && (
                <>
                  <span>/</span>
                  <span className="text-[#1A1612] font-semibold">"{searchInput}"</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display">
              {searchInput ? (
                <>Kết quả tìm kiếm cho: <span className="italic text-[#B88E4F]">"{searchInput}"</span></>
              ) : selectedCategory !== 'all' ? (
                <>Danh mục: <span className="italic text-[#B88E4F]">{selectedCategory}</span></>
              ) : (
                <>Tất cả sản phẩm & Bộ lọc chi tiết</>
              )}
            </h1>
            <p className="text-xs text-[#7D715E] mt-1 m-0">
              {loading ? 'Đang kết nối dữ liệu...' : `Tìm thấy ${displayedProducts.length} sản phẩm phù hợp`}
            </p>
          </div>

          {/* Right Controls: Mobile Filter Button & Sort */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EAE4D7] text-xs font-bold text-[#1A1612] hover:border-[#C59B58] transition cursor-pointer shadow-2xs"
            >
              <Filter className="w-4 h-4 text-[#B88E4F]" />
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C59B58] text-white text-[10px] font-black grid place-items-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-[#7D715E] hidden sm:inline">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  updateUrlParams({ sort: e.target.value });
                }}
                className="bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58] transition cursor-pointer shadow-2xs"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến cao</option>
                <option value="price_desc">Giá: Cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Sidebar Filters + Right Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-8 items-start">
          
          {/* DESKTOP FILTER SIDEBAR */}
          <aside className="hidden lg:block bg-white border border-[#EAE4D7] rounded-3xl p-5 shadow-xs text-left sticky top-24">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE4D7] mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#B88E4F]" />
                <strong className="text-sm font-black text-[#1A1612]">Bộ Lọc Chi Tiết</strong>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[10px] font-black grid place-items-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#B88E4F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {renderFilterContent()}
          </aside>

          {/* RIGHT PRODUCT GRID COLUMN */}
          <div className="flex-1 min-w-0">
            
            {/* Active Filter Chips Bar */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-2xl bg-[#F3EFE6]/60 border border-[#EEDFC6] text-xs">
                <span className="font-bold text-[#8C6226] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Đang lọc:
                </span>

                {searchInput && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    Từ khóa: <strong>"{searchInput}"</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        updateUrlParams({ q: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    Ngành hàng: <strong>{selectedCategory}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        updateUrlParams({ category: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedStore !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    Gian hàng: <strong>{stores.find((s) => s.id === selectedStore)?.name || selectedStore}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStore('all');
                        updateUrlParams({ store: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {pricePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    Giá: <strong>{pricePreset}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setPricePreset('all');
                        updateUrlParams({ preset: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {onlyHasCommission && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    <strong>Có hoa hồng CTV</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyHasCommission(false);
                        updateUrlParams({ commission: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {onlyInStock && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-medium">
                    <strong>Còn hàng</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyInStock(false);
                        updateUrlParams({ inStock: null });
                      }}
                      className="hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#DC2626] hover:underline ml-auto cursor-pointer"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-[#EAE4D7] rounded-3xl p-4 animate-pulse">
                    <div className="aspect-square bg-[#F3EFE6] rounded-2xl mb-3" />
                    <div className="h-4 bg-[#F3EFE6] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#F3EFE6] rounded w-1/2 mb-4" />
                    <div className="h-6 bg-[#F3EFE6] rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D7] p-8 shadow-2xs">
                <ShoppingBag className="w-14 h-14 text-[#A49B8B] mx-auto mb-3" />
                <strong className="text-base font-black text-[#1A1612] block">
                  Không tìm thấy sản phẩm phù hợp với bộ lọc
                </strong>
                <p className="text-xs text-[#7D715E] mt-1 mb-5">
                  Thử nới lỏng mức giá, chọn ngành hàng khác hoặc xóa bộ lọc để tìm lại.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition cursor-pointer shadow-xs"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {displayedProducts.map((p) => {
                  const productDetailUrl = `/products/${p.sku || p.id}`;
                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-[#EAE4D7] rounded-3xl overflow-hidden shadow-2xs hover:shadow-md hover:border-[#C59B58]/80 transition duration-200 flex flex-col justify-between group text-left"
                    >
                      <div>
                        {/* Clickable Image -> Product Details */}
                        <Link
                          to={productDetailUrl}
                          className="block relative aspect-square bg-[#FAF8F5] overflow-hidden group-hover:opacity-95 transition cursor-pointer"
                          title="Xem chi tiết sản phẩm"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/reference/assets/serum-hero-optimized.jpg';
                            }}
                          />
                          {p.badge && (
                            <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#C59B58] text-white text-[10px] font-black shadow-xs">
                              {p.badge}
                            </span>
                          )}
                          {p.origPrice > p.price && (
                            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-black shadow-xs">
                              -{Math.round(((p.origPrice - p.price) / p.origPrice) * 100)}%
                            </span>
                          )}
                        </Link>

                        <div className="p-4 sm:p-5">
                          {/* Store Name with Badge */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[11px] font-bold text-[#7D715E] flex items-center gap-1 truncate">
                              <Store className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                              <span className="truncate">{p.brand}</span>
                            </span>
                            <span className="text-[10px] text-[#059669] font-bold shrink-0">
                              Chính hãng
                            </span>
                          </div>

                          {/* Product Title */}
                          <Link to={productDetailUrl} className="block group-hover:text-[#B88E4F] transition">
                            <h3 className="text-xs sm:text-sm font-bold text-[#1A1612] line-clamp-2 min-h-[38px] mb-2 leading-snug">
                              {p.name}
                            </h3>
                          </Link>

                          {/* KOC Commission Pill */}
                          {(p.commissionRate || 0) > 0 && (
                            <div className="mb-3 px-2.5 py-1 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[10.5px] text-[#8C6226] font-bold flex items-center justify-between">
                              <span>Hoa hồng CTV: {p.commissionRate}%</span>
                              <span className="text-[#B88E4F]">
                                ~{p.commissionAmount ? formatMoney(p.commissionAmount) : formatMoney((p.price * (p.commissionRate || 0)) / 100)}
                              </span>
                            </div>
                          )}

                          {/* Price Display */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-base sm:text-lg font-black text-[#1A1612]">
                              {formatMoney(p.price)}
                            </span>
                            {p.origPrice > p.price && (
                              <span className="text-xs text-[#7D715E] line-through font-medium">
                                {formatMoney(p.origPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex flex-col gap-1.5">
                        <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(p)}
                            className="py-2.5 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] hover:bg-[#F3EFE6] hover:border-[#C59B58] transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                            title="Thêm vào giỏ hàng"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-[#B88E4F]" />
                          </button>
                          <Link
                            to={productDetailUrl}
                            className="py-2.5 px-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] hover:border-[#C59B58] transition flex items-center justify-center text-center"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCheckoutProduct({
                                product: {
                                  id: p.id,
                                  sku: p.sku,
                                  title: p.name,
                                  price: p.price,
                                  originalPrice: p.origPrice,
                                  imageUrl: p.image,
                                  stockQuantity: p.stockQuantity || 0,
                                  variants: p.variants,
                                },
                                store: {
                                  id: p.storeId || 'store-default',
                                  name: p.brand,
                                },
                                couponCode: p.kol?.coupon || '',
                              });
                            }}
                            className="py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white text-xs font-black hover:opacity-95 transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          >
                            Mua ngay
                          </button>
                        </div>

                        {isKolUser && (
                          <button
                            type="button"
                            onClick={() => handleContactShopFromCard(p)}
                            className="w-full py-2 px-3 rounded-xl bg-[#FBF5EB] hover:bg-[#F5E7CC] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-98"
                            title="Nhắn tin trực tiếp với Shop về mẫu thử và chính sách hoa hồng cho sản phẩm này"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#B88E4F]" />
                            <span>Liên hệ Shop</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Slide-Over Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE4D7] mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#B88E4F]" />
                  <strong className="text-base font-black text-[#1A1612]">Bộ Lọc Chi Tiết</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-xl hover:bg-[#FAF8F5] text-[#7D715E] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderFilterContent()}
            </div>

            <div className="pt-4 border-t border-[#EAE4D7] mt-6">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 rounded-2xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
              >
                Xem {displayedProducts.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOC LIVE COMMERCE PREVIEW MODAL */}
      {isLiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsLiveModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white border border-[#EAE4D7] rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 bg-gradient-to-r from-[#2A2218] to-[#1A1612] text-white flex items-center justify-between border-b border-[#3D3326]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#9F1239] flex items-center justify-center text-white shadow-xs">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <strong className="text-sm font-black tracking-tight">KOC Live Commerce Hub</strong>
                  <p className="text-[11px] text-[#EEDFC6] m-0">Phòng phát sóng bán hàng & tiếp thị liên kết đa gian hàng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEDFC6] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 bg-[#FAF8F5]">
              <div className="p-4 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#B88E4F] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-black text-[#1A1612] block">
                    Đặc quyền Live Commerce dành cho KOC & Gian Hàng ScanMS
                  </strong>
                  <p className="text-[11px] text-[#7D715E] mt-0.5 m-0 leading-relaxed">
                    KOC có thể ghim sản phẩm trực tiếp từ các gian hàng đối tác đã kiểm duyệt KYC, khách mua ngay trong lúc xem live với chiết khấu độc quyền.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#E11D48] text-[10px] font-black animate-pulse">
                      ĐANG PHÁT
                    </span>
                    <strong className="text-xs font-bold text-[#1A1612]">KOC Linh Trương • Review Mỹ Phẩm Sora Skin</strong>
                  </div>
                  <span className="text-[11px] text-[#7D715E]">1.2k người đang xem • Hoa hồng CTV 28%</span>
                </div>
                <button
                  type="button"
                  onClick={() => toast.success('Đã kết nối luồng Live KOC demo!')}
                  className="px-4 py-2 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition"
                >
                  Xem Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 text-left animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#B88E4F]" />
                <strong className="text-base font-black text-[#1A1612]">
                  Giỏ hàng của bạn ({cart.reduce((s, i) => s + i.quantity, 0)})
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-[#7D715E] hover:text-[#1A1612] rounded-full hover:bg-[#F3EFE6] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#7D715E]">
                  <ShoppingCart className="w-12 h-12 text-[#EAE4D7] mx-auto mb-2" />
                  <p className="text-xs">Giỏ hàng của bạn đang trống</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-2xl"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <strong className="text-xs font-bold text-[#1A1612] block truncate">
                        {item.product.name}
                      </strong>
                      <span className="text-xs font-black text-[#B88E4F] block mt-0.5">
                        {formatMoney(item.product.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCart((prev) =>
                            prev
                              .map((i) => (i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i))
                              .filter((i) => i.quantity > 0)
                          );
                        }}
                        className="w-6 h-6 rounded-md bg-white border border-[#EAE4D7] text-xs font-bold flex items-center justify-center hover:bg-[#F3EFE6] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-[#1A1612] w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCart((prev) =>
                            prev.map((i) => (i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))
                          );
                        }}
                        className="w-6 h-6 rounded-md bg-white border border-[#EAE4D7] text-xs font-bold flex items-center justify-center hover:bg-[#F3EFE6] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#EAE4D7] flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#7D715E] font-medium">Tạm tính:</span>
                  <strong className="text-xl font-black text-[#1A1612]">
                    {formatMoney(cart.reduce((s, i) => s + i.product.price * i.quantity, 0))}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    const p = cart[0].product;
                    setActiveCheckoutProduct({
                      product: {
                        id: p.id,
                        sku: p.sku,
                        title: p.name,
                        price: p.price,
                        originalPrice: p.origPrice,
                        imageUrl: p.image,
                        stockQuantity: p.stockQuantity || 0,
                        variants: p.variants,
                      },
                      store: {
                        id: p.storeId || 'store-default',
                        name: p.brand,
                      },
                      couponCode: p.kol?.coupon || '',
                    });
                  }}
                  className="w-full py-3 rounded-xl bg-[#C59B58] text-white text-xs sm:text-sm font-black hover:bg-[#B88E4F] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Tiến hành đặt hàng ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest Checkout Modal */}
      {activeCheckoutProduct && (
        <GuestCheckoutModal
          isOpen={true}
          onClose={() => setActiveCheckoutProduct(null)}
          product={activeCheckoutProduct.product}
          store={activeCheckoutProduct.store}
          initialCouponCode={activeCheckoutProduct.couponCode}
          initialQuantity={activeCheckoutProduct.quantity}
          onOrderPlaced={(orderData: any) => {
            setActiveCheckoutProduct(null);
            toast.success(`Đặt hàng thành công! Mã đơn: ${orderData.orderCode || orderData.id}`);
          }}
        />
      )}

    </div>
  );
}
