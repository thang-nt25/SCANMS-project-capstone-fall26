import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  SlidersHorizontal,
  Check,
  Filter,
  BadgeCheck,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { authService } from '../../services/auth.service';
import { customerService } from '../../services/customer.service';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { sortCatalogProducts } from '@/utils/product-sort.utils';
import type { Product } from '@/types/marketplace.types';
import { HOME_CATEGORY_GROUPS, matchesHomeCategory } from '@/utils/marketplace-category.utils';
import { toast } from '../../utils/toast';
import { useCart } from '../../context/CartContext';
import { MarketplaceProductCard } from '../../components/marketplace/MarketplaceProductCard';
import { QuickCustomerAuth } from '../../components/marketplace/QuickCustomerAuth';

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
  const categoryGroup = searchParams.get('categoryGroup') || '';
  const discountedOnly = searchParams.get('discount') === 'true';
  const categoryGroupLabel = HOME_CATEGORY_GROUPS.find((group) => group.id === categoryGroup)?.label;
  const storeParam = searchParams.get('store') || 'all';

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsFailed, setProductsFailed] = useState(false);
  const [productAttempt, setProductAttempt] = useState(0);
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
  const sortParam = searchParams.get('sort');
  const [sortBy, setSortBy] = useState<string>(sortParam || (queryParam ? 'relevance' : 'popular'));
  useEffect(() => { setSortBy(sortParam || (queryParam ? 'relevance' : 'popular')); }, [sortParam, queryParam]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const priceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(e.target as Node)) {
        setIsPriceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cart & Modals
  const { openCart, addItem, buyNow, cart, startCheckout } = useCart();
  const [pendingPurchase, setPendingPurchase] = useState<{ productId: string; variantId?: string; intent: 'cart' | 'buy' } | null>(null);

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const isKolUser = currentUser?.role === 'COLLABORATOR';
  const commissionFilterActive = isKolUser && onlyHasCommission;
  const [choosingProductId, setChoosingProductId] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Load customer wishlist & sync events
  useEffect(() => {
    const loadWishlist = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user?.role === 'CUSTOMER') {
        customerService
          .getWishlist()
          .then((items) => {
            if (Array.isArray(items)) {
              setWishlistIds(new Set(items.map((it) => it.product?.id).filter(Boolean) as string[]));
            }
          })
          .catch(() => {});
      } else {
        setWishlistIds(new Set());
      }
    };

    loadWishlist();

    const handleWishlistUpdated = (e: any) => {
      const { productId, wishlisted } = e.detail || {};
      if (!productId) return;
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (wishlisted) next.add(productId);
        else next.delete(productId);
        return next;
      });
    };

    window.addEventListener('auth-user-updated', loadWishlist);
    window.addEventListener('wishlist-updated', handleWishlistUpdated as EventListener);
    return () => {
      window.removeEventListener('auth-user-updated', loadWishlist);
      window.removeEventListener('wishlist-updated', handleWishlistUpdated as EventListener);
    };
  }, []);

  const handleToggleWishlist = async (productId: string) => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích!');
      navigate('/login?role=CUSTOMER');
      return;
    }
    if (currentUser.role !== 'CUSTOMER') {
      toast.error('Chức năng Yêu thích sản phẩm dành cho tài khoản Khách hàng mua sắm.');
      return;
    }

    try {
      const res = await customerService.toggleWishlist(productId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (res.wishlisted) {
          next.add(productId);
          toast.success('Đã lưu vào danh sách yêu thích!');
        } else {
          next.delete(productId);
          toast.info('Đã bỏ lưu sản phẩm');
        }
        return next;
      });
      window.dispatchEvent(
        new CustomEvent('wishlist-updated', {
          detail: { productId, wishlisted: res.wishlisted },
        })
      );
    } catch {
      toast.error('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    const syncUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('auth-user-updated', syncUser);
    return () => window.removeEventListener('auth-user-updated', syncUser);
  }, []);

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

  const handlePurchase = (product: Product, intent: 'cart' | 'buy', variantId?: string, quantity = 1) => {
    if (!product.storeId) {
      toast.error('Chưa xác định được gian hàng. Vui lòng mở chi tiết sản phẩm.');
      return;
    }
    const payload = {
      product: { ...product, variants: product.variants?.filter((variant) => variant.isActive !== false) },
      store: { id: product.storeId, name: product.brand },
      variantId, quantity, openCartAfterAdd: false,
    };
    if (!authService.getCurrentUser() || !localStorage.getItem('token')) {
      addItem(payload);
      setPendingPurchase({ productId: product.id, variantId, intent });
    } else if (intent === 'buy') {
      buyNow(payload);
    } else {
      addItem(payload);
    }
  };

  const finishAuthentication = () => {
    if (!pendingPurchase) return;
    const matching = cart.filter((item) => item.productId === pendingPurchase.productId
      && (!pendingPurchase.variantId || item.variantId === pendingPurchase.variantId));
    const intent = pendingPurchase.intent;
    setPendingPurchase(null);
    if (intent === 'buy' && matching.length) startCheckout(matching);
  };

  // Sync state when URL params change
  useEffect(() => {
    setSearchInput(queryParam);
    setSelectedCategory(categoryParam);
    setSelectedStore(storeParam);
  }, [queryParam, categoryParam, storeParam]);

  useEffect(() => {
    setPricePreset(searchParams.get('preset') || (searchParams.has('min') || searchParams.has('max') ? 'custom' : 'all'));
    setMinPrice(searchParams.get('min') || '');
    setMaxPrice(searchParams.get('max') || '');
    setOnlyHasCommission(searchParams.get('commission') === 'true');
    setOnlyInStock(searchParams.get('inStock') === 'true');
  }, [searchParams]);

  // Update URL search parameters when filters change
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    if ('category' in updates) newParams.delete('categoryGroup');
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
    const controller = new AbortController();
    setLoading(true);
    setProductsFailed(false);
    setItems([]);

    const loadProducts = async () => {
      const products: any[] = [];
      let page = 1, totalPages = 1;
      do {
        const res = await api.get('/public/products', {
          params: { limit: 48, page, search: queryParam || undefined, sortBy: queryParam ? 'relevance' : 'newest' },
          signal: controller.signal, headers: { 'x-skip-cache': 'true' },
        });
        const payload = res.data?.data !== undefined ? res.data.data : res.data;
        const batch = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
        if (!mounted) return [];
        products.push(...batch);
        if (!batch.length) break;
        totalPages = Number(payload?.pagination?.totalPages) || 1;
        page++;
      } while (mounted && page <= totalPages);
      return products;
    };
    loadProducts().then((productList) => {
        if (!mounted) return;

        if (productList.length > 0) {
          const mapped: Product[] = productList.map((item: any) => {
            const commissionValue = item.customCommissionRate ?? item.commissionRate ?? item.store?.defaultCommissionRate;
            const parsedRate = commissionValue == null ? 0 : Number(commissionValue);
            const rawRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 0;
            const priceNum = Number(item.price) || 0;
            const origNum = Number(item.originalPrice) || 0;

            let badge = '';
            if (rawRate > 0) badge = `Thù lao ${rawRate}%`;
            else if (item.stockQuantity > 0) badge = 'Sẵn hàng';

            const resolvedBrand = item.store?.name || item.brand || 'Gian hàng đối tác';

            return {
              id: item.id,
              sku: item.sku || item.id,
              name: item.title || item.name,
              brand: resolvedBrand,
              category: item.categoryName || 'Khác',
              categoryLabel: item.categoryName || 'Khác',
              price: priceNum,
              origPrice: origNum,
              image: getSafeProductImageUrl(item.imageUrl || item.mediaAssets?.[0]?.urlOrContent, item.title || item.name, item.categoryName),
              rating: Number(item.rating || 0),
              reviews: Number(item.reviewCount || 0),
              sold: String(Number(item.soldCount ?? 0)),
              soldCount: Number(item.soldCount ?? 0),
              viewCount: Number(item.viewCount ?? 0),
              matchKind: item.matchKind === 'related' ? 'related' : 'direct',
              createdAt: item.createdAt,
              commissionRate: rawRate || undefined,
              commissionAmount: rawRate > 0 ? Math.round(priceNum * (rawRate / 100)) : undefined,
              seller: resolvedBrand,
              storeId: item.store?.id || item.storeId || '',
              stock: item.stockQuantity !== undefined ? item.stockQuantity : 100,
              stockQuantity: Number(item.stockQuantity || 0),
              variants: Array.isArray(item.variants) ? item.variants : [],
              badge,
              features: ['Chính hãng 100%', 'Đồng kiểm tận tay', 'Bảo hộ 14 ngày'],
            };
          });

          setItems(mapped);
        }
      })
      .catch((err) => {
        if (mounted) {
          setProductsFailed(true);
          console.error('Lỗi khi tải sản phẩm:', err);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [queryParam, productAttempt]);


  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    return items.filter((p) => {
      if (!matchesHomeCategory(p.category, categoryGroup)) return false;
      if (discountedOnly && p.origPrice <= p.price) return false;
      // Keyword relevance, accents, aliases and typos use the same backend
      // matcher as autocomplete; don't discard those matches with includes().

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
      if (commissionFilterActive && (!p.commissionRate || p.commissionRate <= 0)) {
        return false;
      }

      // 7. Only in stock
      const variants = (p.variants || []).filter((variant) => variant.isActive !== false);
      const inStock = variants.length ? variants.some((variant) => variant.stockQuantity > 0) : (p.stockQuantity ?? 0) > 0;
      if (onlyInStock && !inStock) return false;

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
    commissionFilterActive,
    onlyInStock,
    categoryGroup,
    discountedOnly,
  ]);

  // Sort
  const displayedProducts = useMemo(() => {
    return sortBy === 'relevance' ? filteredProducts : sortCatalogProducts(filteredProducts, sortBy);
  }, [filteredProducts, sortBy]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryGroupLabel) count++;
    if (discountedOnly) count++;
    if (searchInput.trim()) count++;
    if (selectedCategory !== 'all') count++;
    if (selectedStore !== 'all') count++;
    if (pricePreset !== 'all' || minPrice || maxPrice) count++;
    if (commissionFilterActive) count++;
    if (onlyInStock) count++;
    return count;
  }, [searchInput, selectedCategory, selectedStore, pricePreset, minPrice, maxPrice, commissionFilterActive, onlyInStock, categoryGroupLabel, discountedOnly]);

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


  // Filter content renderer (shared by Desktop Sidebar and Mobile Drawer) - SCANMS E-Commerce Layout
  const renderFilterContent = (section?: string) => (
    <div className="space-y-3.5 text-left">
      {/* Category Section - SCANMS Standard */}
      {!section && (categoryGroupLabel || discountedOnly) && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs">
          {categoryGroupLabel && <button type="button" onClick={() => updateUrlParams({ categoryGroup: null })} className="inline-flex items-center gap-2 text-[#1A1612]">{categoryGroupLabel}<X size={14} aria-label="Bỏ lọc ngành hàng" /></button>}
          {discountedOnly && <button type="button" onClick={() => updateUrlParams({ discount: null })} className="inline-flex items-center gap-2 text-[#1A1612]">Sản phẩm giảm giá<X size={14} aria-label="Bỏ lọc giảm giá" /></button>}
        </div>
      )}
      {(!section || section === 'category') && <div>
        <div className="space-y-1">
          <h2 className="mb-2 text-xs font-semibold text-[#7D715E]">Ngành hàng</h2>
          {/* Tất cả sản phẩm (Toàn sàn & Mọi gian hàng) */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedStore('all');
              updateUrlParams({ category: null, store: null });
            }}
            className={`search-filter-choice w-full text-left text-xs transition-colors cursor-pointer flex items-start gap-1.5 ${
              selectedCategory === 'all' && selectedStore === 'all'
                ? 'font-semibold text-[#B88E4F] bg-[#FBF5EB]'
                : 'font-normal text-[#231D15] hover:text-[#B88E4F] pl-3'
            }`}
          >
            {selectedCategory === 'all' && selectedStore === 'all' && (
              <span className="text-[#B88E4F] text-[9px] mt-0.5 shrink-0 select-none"><Check size={13} /></span>
            )}
            <span className="leading-snug">Tất cả sản phẩm</span>
          </button>

          {/* Category List */}
          {categories.filter((cat, index, list) => list.findIndex(item => item.name.trim().normalize('NFC').toLocaleLowerCase('vi') === cat.name.trim().normalize('NFC').toLocaleLowerCase('vi')) === index).map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  updateUrlParams({ category: cat.name });
                }}
                className={`search-filter-choice w-full text-left text-xs transition-colors cursor-pointer flex items-start gap-1.5 ${
                  isSelected
                    ? 'font-semibold text-[#B88E4F] bg-[#FBF5EB]'
                    : 'font-normal text-[#231D15] hover:text-[#B88E4F] pl-3'
                }`}
              >
                {isSelected && (
                  <span className="text-[#B88E4F] text-[9px] mt-0.5 shrink-0 select-none"><Check size={13} /></span>
                )}
                <span className="leading-snug">{cat.name}</span>
              </button>
            );
          })}


        </div>
      </div>}

      {/* Partner Store Section - SCANMS Standard */}
      {(!section || section === 'store') && <div className="pt-3 border-t border-[#EAE4D7]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[#1A1612]">
            Cửa hàng
          </label>
        </div>

        <div className="space-y-1">
          {/* Toàn bộ gian hàng */}
          <button
            type="button"
            onClick={() => {
              setSelectedStore('all');
              updateUrlParams({ store: null });
            }}
            className={`search-filter-choice w-full text-left text-xs transition-colors cursor-pointer flex items-start gap-1.5 ${
              selectedStore === 'all'
                ? 'font-semibold text-[#B88E4F] bg-[#FBF5EB]'
                : 'font-normal text-[#231D15] hover:text-[#B88E4F] pl-3'
            }`}
          >
            {selectedStore === 'all' && (
              <span className="text-[#B88E4F] text-[9px] mt-0.5 shrink-0 select-none"><Check size={13} /></span>
            )}
            <span className="leading-snug">Tất cả cửa hàng</span>
          </button>

          {/* Store List */}
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
                className={`search-filter-choice w-full text-left text-xs transition-colors cursor-pointer flex items-start gap-1.5 ${
                  isSelected
                    ? 'font-semibold text-[#B88E4F] bg-[#FBF5EB]'
                    : 'font-normal text-[#231D15] hover:text-[#B88E4F] pl-3'
                }`}
              >
                {isSelected && (
                  <span className="text-[#B88E4F] text-[9px] mt-0.5 shrink-0 select-none"><Check size={13} /></span>
                )}
                <span className="leading-snug">
                  <span title={st.name}>{st.name.replace(/^Aura Activewear & Apparel$/i, 'Aura Activewear').replace(/^GreenBio Health & Nutrition$/i, 'GreenBio Health').replace(/^Lumière Smart Living$/i, 'Lumière').replace(/^Sora Skincare & Cosmetics$/i, 'Sora Skincare')}</span>{' '}
                  {st.isVerified && <BadgeCheck className="w-3 h-3 text-[#B88E4F] shrink-0 inline-block align-middle" />}
                </span>
              </button>
            );
          })}


        </div>
      </div>}

      {/* Price Range Section - SCANMS Standard */}
      {(!section || section === 'price') && <div className="pt-3 border-t border-[#EAE4D7]">
        <label className="block text-xs font-semibold text-[#1A1612] mb-2">
          Khoảng giá
        </label>

        {/* SCANMS Price Inputs: Từ ₫ - Đến ₫ & Áp Dụng Button */}
        <div className="mb-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 mb-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPricePreset('custom');
              }}
              placeholder="₫ TỪ"
              className="h-9 min-w-0 w-full bg-white border border-[#EAE4D7] rounded-lg px-2 text-xs text-[#1A1612] placeholder-[#8C7D6B] outline-none focus:border-[#C59B58] focus:bg-white font-medium text-center"
            />
            <span className="text-[#8C7D6B] text-xs font-bold">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPricePreset('custom');
              }}
              placeholder="₫ ĐẾN"
              className="h-9 min-w-0 w-full bg-white border border-[#EAE4D7] rounded-lg px-2 text-xs text-[#1A1612] placeholder-[#8C7D6B] outline-none focus:border-[#C59B58] focus:bg-white font-medium text-center"
            />
          </div>
          <button
            type="button"
            disabled={!minPrice && !maxPrice}
            onClick={() => updateUrlParams({ preset: null, min: minPrice || null, max: maxPrice || null })}
            className="w-full h-9 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-xs font-bold text-[#1A1612] transition shadow-2xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Áp dụng
          </button>
        </div>

        <div className="search-price-preset-wrap">
          <select aria-label="Mức giá" value={pricePreset === 'custom' ? 'all' : pricePreset} onChange={event => { const value = event.target.value; setPricePreset(value); setMinPrice(''); setMaxPrice(''); updateUrlParams({ preset: value === 'all' ? null : value, min: null, max: null }); }} className="search-price-preset">
          <option value="all">Mọi mức giá</option><option value="under500">Dưới 500.000 đ</option><option value="500to1000">500.000 đ - 1 triệu</option><option value="1000to3000">1 - 3 triệu</option><option value="above3000">Trên 3 triệu</option>
        </select>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      </div>}

      {/* Buyer filters shared by the sidebar and mobile drawer. */}
      {(!section || section === 'status') && <div className="pt-3 border-t border-[#EAE4D7] space-y-1.5">
        <h3 className="text-xs font-semibold text-[#1A1612] mb-1 pb-1 border-b border-[#EAE4D7]/70">
          Tình trạng
        </h3>
        <label className={`search-status-choice ${discountedOnly ? 'is-selected' : ''}`}>
          <input type="checkbox" checked={discountedOnly} onChange={(event) => updateUrlParams({ discount: event.target.checked ? 'true' : null })}
            className="h-4 w-4 shrink-0 accent-[#C59B58] focus-visible:outline-[#C59B58]" />
          <span >Đang giảm giá</span>
        </label>
        <label className={`search-status-choice ${onlyInStock ? 'is-selected' : ''}`}>
          <input type="checkbox" checked={onlyInStock} onChange={(event) => {
            setOnlyInStock(event.target.checked);
            updateUrlParams({ inStock: event.target.checked ? 'true' : null });
          }} className="h-4 w-4 shrink-0 accent-[#C59B58] focus-visible:outline-[#C59B58]" />
          <span >Còn hàng</span>
        </label>
        {isKolUser && <label className={`search-status-choice ${onlyHasCommission ? 'is-selected' : ''}`}>
          <input type="checkbox" checked={onlyHasCommission} onChange={(event) => {
            setOnlyHasCommission(event.target.checked);
            updateUrlParams({ commission: event.target.checked ? 'true' : null });
          }} className="h-4 w-4 shrink-0 accent-[#C59B58] focus-visible:outline-[#C59B58]" />
          <span >Có thù lao CTV/KOL</span>
        </label>}
      </div>}


    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans selection:bg-[#F3EFE6] selection:text-[#B88E4F] overflow-x-clip">

      {/* Unified Public Header */}
      <PublicHeader
        onOpenCart={openCart}
        defaultSearchQuery={searchInput}
        onSearchSubmit={(q) => {
          setSearchInput(q);
          updateUrlParams({ q: q || null });
        }}
        onOpenFilter={() => {
          if (window.innerWidth < 1024) {
            setIsMobileFilterOpen(true);
          } else {
            const filterEl = document.getElementById('search-filter-sidebar');
            if (filterEl) {
              filterEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }}
      />

      {/* Main Content Area - 1200px Centered SCANMS Standard Container */}
      <main className="flex-1 max-w-[1248px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
          <aside id="search-filter-sidebar" className="search-filter-panel hidden lg:flex flex-col rounded-[14px] border border-[#EAE4D7] bg-white p-3.5">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#EAE4D7] mb-3">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <strong className="text-sm font-semibold">Bộ lọc</strong>
              {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-md bg-[#FBF5EB] px-1 text-xs text-[#B88E4F]">{activeFilterCount}</span>}
              <button type="button" onClick={handleResetFilters} disabled={activeFilterCount === 0} className="ml-auto text-xs text-[#7D715E] hover:text-[#B88E4F] disabled:opacity-40">Đặt lại</button>
            </div>
            <div className="search-filter-options">{renderFilterContent()}</div>
          </aside>
          {/* RIGHT PRODUCT GRID COLUMN */}
          <div className="flex-1 min-w-0 space-y-3.5">
            {!loading && displayedProducts.some(product => product.matchKind === 'related') && <p role="status" data-search-related-note
              className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-3 text-sm text-[#7D715E]">
              Sản phẩm chăm sóc da liên quan đến “{queryParam}”. Xem công dụng của từng sản phẩm để lựa chọn phù hợp.
            </p>}
            
            {/* SCANMS Standard Sort Bar: Exact matching 52px height and alignment with Bộ lọc sản phẩm */}
            <div data-search-sort-bar className="search-sort-bar min-h-[60px] bg-white border border-[#EAE4D7] rounded-xl px-4 py-2 max-sm:p-2.5 flex flex-wrap items-center justify-between gap-3 ">
              <button type="button" onClick={() => setIsMobileFilterOpen(true)} className="lg:hidden inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-3 text-xs text-[#1A1612]"><Filter size={14} />Bộ lọc{activeFilterCount > 0 && <span className="text-[#B88E4F]">{activeFilterCount}</span>}</button>
              <div className={`search-sort-options ${queryParam ? 'has-relevance' : ''}`}>
                {/* Phổ Biến Button */}
                {queryParam && <button type="button" onClick={() => { setSortBy('relevance'); updateUrlParams({ sort: 'relevance' }); }}
                  className={`h-10 max-sm:order-2 max-sm:h-10 max-sm:min-w-0 max-sm:px-1 max-sm:whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer border ${sortBy === 'relevance' ? 'bg-[#FBF5EB] text-[#8C6226] border-[#EEDFC6]' : 'bg-white text-[#1A1612] border-[#EAE4D7] hover:bg-[#FAF8F5]'}`}
                  aria-pressed={sortBy === 'relevance'}>Liên quan</button>}
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('popular');
                    updateUrlParams({ sort: 'popular' });
                  }}
                  className={`h-10 max-sm:order-2 max-sm:h-10 max-sm:min-w-0 max-sm:px-1 max-sm:whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-98 ${
                    sortBy === 'popular'
                      ? 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]'
                      : 'bg-white text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F] border border-[#EAE4D7]'
                  }`}
                  aria-pressed={sortBy === 'popular'}
                >
                  Phổ biến
                </button>

                {/* Mới Nhất Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('newest');
                    updateUrlParams({ sort: 'newest' });
                  }}
                  className={`h-10 max-sm:order-2 max-sm:h-10 max-sm:min-w-0 max-sm:px-1 max-sm:whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-98 ${
                    sortBy === 'newest'
                      ? 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]'
                      : 'bg-white text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F] border border-[#EAE4D7]'
                  }`}
                  aria-pressed={sortBy === 'newest'}
                >
                  Mới nhất
                </button>

                {/* Bán Chạy Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('sales');
                    updateUrlParams({ sort: 'sales' });
                  }}
                  className={`h-10 max-sm:order-2 max-sm:h-10 max-sm:min-w-0 max-sm:px-1 max-sm:whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-98 ${
                    sortBy === 'sales'
                      ? 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]'
                      : 'bg-white text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F] border border-[#EAE4D7]'
                  }`}
                  aria-pressed={sortBy === 'sales'}
                >
                  Bán chạy
                </button>

                {/* SCANMS Standard Giá Dropdown */}
                <div
                  ref={priceDropdownRef}
                  className="relative"
                  onMouseEnter={() => setIsPriceDropdownOpen(true)}
                  onMouseLeave={() => setIsPriceDropdownOpen(false)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setIsPriceDropdownOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsPriceDropdownOpen(false);
                      event.currentTarget.querySelector('button')?.focus();
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsPriceDropdownOpen(true)}
                    className={`max-sm:w-full max-sm:min-w-0 max-sm:h-10 min-w-[145px] sm:min-w-[165px] px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-98 flex items-center justify-between gap-2 ${
                      sortBy === 'price_asc' || sortBy === 'price_desc'
                        ? 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]'
                        : 'bg-white text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F] border border-[#EAE4D7]'
                    }`}
                    aria-expanded={isPriceDropdownOpen}
                    aria-controls="price-sort-options"
                  >
                    <span className="truncate">
                      {sortBy === 'price_asc'
                        ? 'Giá tăng dần'
                        : sortBy === 'price_desc'
                        ? 'Giá giảm dần'
                        : 'Giá'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                        isPriceDropdownOpen ? 'rotate-180' : ''
                      } ${sortBy === 'price_asc' || sortBy === 'price_desc' ? 'text-[#8C6226]' : 'text-[#7D715E]'}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isPriceDropdownOpen && (
                    <div id="price-sort-options" className="absolute left-0 top-full z-30 w-full pt-1">
                    <div className="w-full bg-white border border-[#EAE4D7] rounded-lg shadow-lg py-1 overflow-hidden text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('price_asc');
                          updateUrlParams({ sort: 'price_asc' });
                          setIsPriceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                          sortBy === 'price_asc'
                            ? 'bg-[#FBF5EB] text-[#B88E4F] font-bold'
                            : 'text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F]'
                        }`}
                      >
                        <span>Giá tăng dần</span>
                        {sortBy === 'price_asc' && <Check className="w-3.5 h-3.5 text-[#B88E4F]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('price_desc');
                          updateUrlParams({ sort: 'price_desc' });
                          setIsPriceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                          sortBy === 'price_desc'
                            ? 'bg-[#FBF5EB] text-[#B88E4F] font-bold'
                            : 'text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F]'
                        }`}
                      >
                        <span>Giá giảm dần</span>
                        {sortBy === 'price_desc' && <Check className="w-3.5 h-3.5 text-[#B88E4F]" />}
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-[#7D715E] font-medium search-result-count flex items-center gap-1.5 shrink-0">
                <span className="tabular-nums font-bold text-[#1A1612]">{displayedProducts.length}</span>
                <span>sản phẩm</span>
              </div>
            </div>

            {/* Active Filter Chips Bar */}
            {activeFilterCount > 0 && (
              <div className="search-active-filters flex flex-wrap items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs">
                <span className="search-active-filters-label font-medium text-[#7D715E] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Bộ lọc đã chọn
                </span>

                {searchInput && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    Từ khóa: <strong>"{searchInput}"</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        updateUrlParams({ q: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedCategory !== 'all' && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    Ngành hàng: <strong>{selectedCategory}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        updateUrlParams({ category: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedStore !== 'all' && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    Gian hàng: <strong>{stores.find((s) => s.id === selectedStore)?.name || selectedStore}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStore('all');
                        updateUrlParams({ store: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {pricePreset !== 'all' && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    Giá: <strong>{pricePreset}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setPricePreset('all');
                        updateUrlParams({ preset: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {commissionFilterActive && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    <strong>Có thù lao CTV</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyHasCommission(false);
                        updateUrlParams({ commission: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {discountedOnly && <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                  Đang giảm giá
                  <button type="button" aria-label="Bỏ lọc giảm giá" onClick={() => updateUrlParams({ discount: null })} className="grid size-7 place-items-center rounded-md text-[#7D715E] hover:bg-white"><X size={12} /></button>
                </span>}
                {onlyInStock && (
                  <span className="search-active-filter-chip inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] pl-2.5 pr-1 text-[#1A1612] font-medium">
                    <strong>Còn hàng</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyInStock(false);
                        updateUrlParams({ inStock: null });
                      }}
                      aria-label="Bỏ bộ lọc này" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7D715E] hover:bg-white hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="search-active-filters-reset ml-auto h-8 shrink-0 rounded-lg border border-[#EAE4D7] bg-white px-3 text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#B88E4F] cursor-pointer"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* Product Cards Grid - SCANMS 5-Column Grid on Desktop */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-stretch gap-3 sm:gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white border border-[#EAE4D7] rounded-xl p-2.5 animate-pulse">
                    <div className="aspect-square bg-[#F3EFE6] rounded-lg mb-2.5" />
                    <div className="h-3.5 bg-[#F3EFE6] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#F3EFE6] rounded w-1/2 mb-3" />
                    <div className="h-5 bg-[#F3EFE6] rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : productsFailed ? (
              <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center" role="alert">
                <strong className="block text-base text-[#1A1612]">Chưa tải được sản phẩm</strong>
                <p className="mt-2 text-xs text-[#7D715E]">Vui lòng thử lại. Các bộ lọc của bạn vẫn được giữ.</p>
                <button type="button" onClick={() => setProductAttempt(value => value + 1)} className="mt-4 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-xs font-semibold text-[#1A1612]">Thử lại</button>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D7] p-8 shadow-2xs">
                <ShoppingBag className="w-14 h-14 text-[#7D715E] mx-auto mb-3" />
                <strong className="text-base font-black text-[#1A1612] block">
                  Không tìm thấy sản phẩm phù hợp với bộ lọc
                </strong>
                <p className="text-xs text-[#7D715E] mt-1 mb-5">
                  Thử nới lỏng mức giá, chọn ngành hàng khác hoặc xóa bộ lọc để tìm lại.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 rounded-xl bg-[#EBD08C] text-white text-xs font-bold hover:bg-[#DEC07A] transition cursor-pointer shadow-xs"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-stretch gap-3 sm:gap-4">
                {displayedProducts.map((p) => (
                  <div key={p.id} className="flex h-full min-w-0 flex-col">
                    <MarketplaceProductCard
                      product={p}
                      wished={wishlistIds.has(p.id)}
                      onWishlist={() => void handleToggleWishlist(p.id)}
                choosing={choosingProductId === p.id}
                onChoosingChange={open => setChoosingProductId(open ? p.id : null)}
                      onPurchase={(intent, variantId, quantity) => handlePurchase(p, intent, variantId, quantity)}
                    />
                      {/* Optional discreet Chat Shop for KOL partners */}
                      {isKolUser && (
                        <div className="space-y-1 px-2.5 pb-2 pt-2">
                          {(p.commissionRate || 0) > 0 && <span className="block text-center text-[10px] font-semibold text-[#B88E4F]">Thù lao {p.commissionRate}%</span>}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleContactShopFromCard(p);
                            }}
                            className="w-full py-1 px-2 rounded-md bg-[#FBF5EB] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-[10px] font-bold text-[#B88E4F] flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs active:scale-98"
                            title="Nhắn tin trực tiếp với Shop về mẫu thử và chính sách thù lao"
                          >
                            <MessageSquare className="w-3 h-3 text-[#B88E4F]" />
                            <span>Liên hệ Shop</span>
                          </button>
                        </div>
                      )}
                  </div>
                ))}
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
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between z-10 text-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE4D7] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-[#B88E4F]" />
                  </div>
                  <strong className="text-base font-black text-[#1A1612]">Bộ Lọc Chi Tiết</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#7D715E] cursor-pointer"
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
                className="w-full py-3 rounded-2xl bg-[#C59B58] text-[#1A1612] hover:bg-[#B88E4F] text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
              >
                Xem {displayedProducts.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPurchase && <QuickCustomerAuth onClose={() => setPendingPurchase(null)} onSuccess={finishAuthentication} />}
    </div>
  );
}
