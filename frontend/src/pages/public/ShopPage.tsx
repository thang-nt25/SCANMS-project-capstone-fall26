import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { ShopProfileHeader } from '../../components/store/ShopProfileHeader';
import { ShopProductCard } from '../../components/store/ShopProductCard';
import type {
  PublicShop as Shop,
  ShopProduct as Product,
} from '../../types/storefront.types';
import { useScanmsChat } from '../../context/ScanmsChatContext';
import { useLiveSessionDeals } from '../../components/product/LiveSessionDealBadge';
import { Select } from '../../components/ui/Select';


type ProductResult = {
  items: Product[];
  pagination: { page: number; totalPages: number; total: number };
};

const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;

export default function ShopPage() {
  const { shopId, slug } = useParams();
  const identifier = shopId || slug;
  const navigate = useNavigate();
  const { openChat } = useScanmsChat();

  const [shop, setShop] = useState<Shop | null>(null);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [highlights, setHighlights] = useState<Product[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState('');
  const [highlightsRevision, setHighlightsRevision] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsRevision, setProductsRevision] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Follow & Search states
  const [following, setFollowing] = useState(false);
  const [savingFollow, setSavingFollow] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const { deals: liveDeals, now: liveDealsNow } = useLiveSessionDeals([
    ...new Set([
      ...(result?.items || []).map((product) => product.id),
      ...highlights.map((product) => product.id),
    ]),
  ]);

  // 1. Fetch Store Profile
  useEffect(() => {
    if (!identifier) return;
    let active = true;
    setLoading(true);
    setShop(null);
    setResult(null);
    setActiveTab('home');
    setHighlights([]);
    setHighlightsError('');
    setSearchInput('');
    setSearch('');
    setCategory('all');
    setSortBy('newest');
    setPage(1);
    setError('');
    setFollowing(false);

    api
      .get(`/stores/public/id/${identifier}`)
      .then((res) => {
        if (active) {
          const data = unwrap(res);
          setShop(data);
          setError('');
        }
      })
      .catch(() => {
        if (active)
          setError('Không tìm thấy Shop hoặc Shop đã ngừng hoạt động.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (authService.getCurrentUser()) {
      api
        .get(`/stores/public/id/${identifier}/follow`)
        .then((res) => {
          if (active) setFollowing(Boolean(unwrap(res)?.following));
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [identifier]);

  // Catalogue filters and home recommendations have independent request states.
  useEffect(() => {
    if (!shop?.id || activeTab === 'home') return;
    let active = true;
    setProductsLoading(true);
    setError('');
    setResult(null);
    api
      .get('/public/products', {
        params: { storeId: shop.id, search, category, sortBy, page, limit: 16 },
      })
      .then((res) => {
        if (active) setResult(unwrap(res));
      })
      .catch(() => {
        if (active) setError('Không tải được sản phẩm của Shop.');
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shop?.id, activeTab, search, category, sortBy, page, productsRevision]);

  useEffect(() => {
    if (!shop?.id) return;
    let active = true;
    setHighlightsLoading(true);
    setHighlightsError('');
    api
      .get('/public/products', {
        params: { storeId: shop.id, sortBy: 'sales', page: 1, limit: 6 },
        headers: { 'x-skip-cache': '1' },
      })
      .then((res) => {
        if (active) setHighlights(unwrap(res).items || []);
      })
      .catch(() => {
        if (active) setHighlightsError('Chưa tải được sản phẩm gợi ý.');
      })
      .finally(() => {
        if (active) setHighlightsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shop?.id, highlightsRevision]);

  const selectTab = (tab: string, nextCategory = 'all') => {
    setActiveTab(tab);
    setCategory(nextCategory);
    setPage(1);
    setSearch('');
    setSearchInput('');
    setSortBy('newest');
    setError('');
  };

  // Open Chat
  const chat = () => {
    if (!shop) return;
    openChat({
      id: shop.id,
      name: shop.name,
      logoUrl: shop.logoUrl || undefined,
      isVerified: Boolean(shop.isVerified),
    });
  };

  // Toggle Follow
  const toggleFollow = async () => {
    if (!authService.getCurrentUser()) {
      navigate(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    if (!shop?.id || savingFollow) return;
    setSavingFollow(true);
    try {
      await (following
        ? api.delete(`/stores/public/id/${shop.id}/follow`)
        : api.post(`/stores/public/id/${shop.id}/follow`));
      setFollowing(!following);
      setShop((current) =>
        current
          ? {
              ...current,
              followerCount: Math.max(
                0,
                current.followerCount + (following ? -1 : 1),
              ),
            }
          : current,
      );
      toast.success(
        following
          ? 'Đã hủy theo dõi gian hàng'
          : 'Đã theo dõi gian hàng thành công!',
      );
    } catch {
      toast.error('Chưa thể cập nhật theo dõi. Vui lòng thử lại.');
    } finally {
      setSavingFollow(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612]">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        {loading ? (
          <div className="py-20 text-center text-[#7D715E]">
            Đang tải thông tin gian hàng...
          </div>
        ) : error && !shop ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700"
          >
            {error}
          </div>
        ) : (
          shop && (
            <>
              <ShopProfileHeader
                key={shop.id}
                shop={shop}
                following={following}
                savingFollow={savingFollow}
                onFollow={() => void toggleFollow()}
                onChat={chat}
              />
              <nav
                aria-label="Điều hướng gian hàng"
                className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white px-3 shadow-xs sm:gap-5 sm:px-5"
              >
                {[
                  { key: 'home', label: 'Trang chủ', category: 'all' },
                  {
                    key: 'products',
                    label: 'Tất cả sản phẩm',
                    category: 'all',
                  },
                  ...(shop.categories || []).map((name) => ({
                    key: 'category:' + name,
                    label: name,
                    category: name,
                  })),
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    aria-current={activeTab === tab.key ? 'page' : undefined}
                    onClick={() => selectTab(tab.key, tab.category)}
                    className={
                      'shrink-0 border-b-2 px-3 py-4 text-sm font-semibold transition ' +
                      (activeTab === tab.key
                        ? 'border-[#C59B58] text-[#B88E4F]'
                        : 'border-transparent text-[#7D715E] hover:text-[#B88E4F]')
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              {activeTab === 'home' && (
                <section
                  aria-labelledby="shop-highlights-title"
                  className="mt-6 rounded-3xl border border-[#EAE4D7] bg-white p-4 shadow-xs sm:p-6"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2
                        id="shop-highlights-title"
                        className="text-lg font-bold sm:text-xl"
                      >
                        Shop gợi ý cho bạn
                      </h2>
                      <p className="mt-1 text-xs text-[#7D715E]">
                        Sản phẩm bán chạy trong gian hàng
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab('products')}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-[#B88E4F] hover:bg-[#FBF5EB]"
                    >
                      Xem tất cả <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {highlightsLoading ? (
                    <p
                      role="status"
                      className="py-8 text-center text-sm text-[#7D715E]"
                    >
                      Đang tải sản phẩm…
                    </p>
                  ) : highlightsError ? (
                    <div className="py-6 text-center">
                      <p role="alert" className="text-sm text-[#DC2626]">
                        {highlightsError}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setHighlightsRevision((value) => value + 1)
                        }
                        className="mt-3 rounded-xl border border-[#EAE4D7] px-4 py-2 text-sm"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : !highlights.length ? (
                    <p className="py-8 text-center text-sm text-[#7D715E]">
                      Shop chưa có sản phẩm đang bán.
                    </p>
                  ) : (
                    <div
                      className={
                        'grid grid-cols-2 gap-3 sm:grid-cols-3 ' +
                        (highlights.length > 3 ? 'xl:grid-cols-6' : '')
                      }
                    >
                      {highlights.map((product) => (
                        <ShopProductCard
                          key={product.id}
                          product={product}
                          deal={liveDeals[product.id]}
                          now={liveDealsNow}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Danh Sách Sản Phẩm */}
              {activeTab !== 'home' && (
                <section
                  id="shop-products"
                  className="mt-6 rounded-3xl border border-[#EAE4D7] bg-white p-4 sm:p-6 shadow-xs"
                >
                  <h2 className="text-xl font-bold">
                    Sản phẩm của {shop.name}
                  </h2>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      setPage(1);
                      setSearch(searchInput.trim());
                    }}
                    className="mt-4 flex flex-wrap gap-2"
                  >
                    <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-[#EAE4D7] px-3 bg-[#FAF8F5] focus-within:bg-white focus-within:border-[#C59B58] transition">
                      <Search size={16} className="text-[#7D715E]" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Tìm trong Shop"
                        className="w-full py-2.5 outline-none bg-transparent text-sm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-4 py-2 font-semibold text-[#231D15] transition cursor-pointer"
                    >
                      Tìm
                    </button>
                    <Select
                      aria-label="Danh mục"
                      value={category}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        setActiveTab(
                          event.target.value === 'all'
                            ? 'products'
                            : 'category:' + event.target.value,
                        );
                        setPage(1);
                      }}
                      className="min-w-[160px]"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {(shop.categories || []).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      aria-label="Sắp xếp"
                      value={sortBy}
                      onChange={(event) => {
                        setSortBy(event.target.value);
                        setPage(1);
                      }}
                      className="min-w-[140px]"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="price_asc">Giá tăng dần</option>
                      <option value="price_desc">Giá giảm dần</option>
                    </Select>
                  </form>

                  {error && (
                    <div className="mt-3 text-sm">
                      <p role="alert" className="text-[#DC2626]">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setProductsRevision((value) => value + 1)
                        }
                        className="mt-2 rounded-lg border border-[#EAE4D7] px-3 py-2"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                  {result?.items.length === 0 && (
                    <p className="py-12 text-center text-[#7D715E]">
                      Chưa có sản phẩm phù hợp.
                    </p>
                  )}

                  {productsLoading && (
                    <p
                      role="status"
                      className="py-8 text-center text-sm text-[#7D715E]"
                    >
                      Đang tải sản phẩm…
                    </p>
                  )}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {result?.items.map((product) => (
                      <ShopProductCard
                        key={product.id}
                        product={product}
                        deal={liveDeals[product.id]}
                        now={liveDealsNow}
                      />
                    ))}
                  </div>

                  {(result?.pagination.totalPages || 0) > 1 && (
                    <nav
                      aria-label="Phân trang sản phẩm"
                      className="mt-6 flex items-center justify-center gap-3"
                    >
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40 hover:bg-[#F3EFE6] transition"
                      >
                        Trước
                      </button>
                      <span className="text-sm font-medium text-[#7D715E]">
                        {page} / {result?.pagination.totalPages}
                      </span>
                      <button
                        disabled={page >= (result?.pagination.totalPages || 1)}
                        onClick={() => setPage(page + 1)}
                        className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40 hover:bg-[#F3EFE6] transition"
                      >
                        Sau
                      </button>
                    </nav>
                  )}
                </section>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
