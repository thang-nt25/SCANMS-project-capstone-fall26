import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Heart, MessageSquare, Search, Store, Ticket, Check, Star, Clock } from 'lucide-react';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { couponService, type PublicStoreCoupon } from '../../services/coupon.service';
import { toast } from '../../utils/toast';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { StoreActivityStatus } from '../../components/store/StoreActivityStatus';
import { useScanmsChat } from '../../context/ScanmsChatContext';
import { LiveSessionDealBadge, useLiveSessionDeals } from '../../components/product/LiveSessionDealBadge';
import { Select } from '../../components/ui/Select';

function formatVoucherRemainingTime(expiresAt?: string | null): { text: string; isUrgent: boolean } {
  if (!expiresAt) return { text: 'Vô thời hạn', isUrgent: false };
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diffMs = exp - now;
  if (diffMs <= 0) return { text: 'Đã hết hạn', isUrgent: false };

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    const hours = Math.max(1, diffHours);
    return { text: `Hết hạn sau ${hours} giờ`, isUrgent: true };
  }
  if (diffDays <= 3) {
    return { text: `Còn ${diffDays} ngày`, isUrgent: true };
  }
  const d = new Date(expiresAt);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return { text: `HSD: ${day}.${month}.${year}`, isUrgent: false };
}

type Shop = {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  isVerified: boolean;
  productCount: number;
  followerCount: number;
  rating?: number | null;
  reviewCount?: number;
  categories: string[];
};

type Product = {
  id: string;
  sku: string;
  title: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  categoryName?: string;
};

type ProductResult = {
  items: Product[];
  pagination: { page: number; totalPages: number; total: number };
};

const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;
const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;

export default function ShopPage() {
  const { shopId, slug } = useParams();
  const identifier = shopId || slug;
  const navigate = useNavigate();
  const { openChat } = useScanmsChat();

  const [shop, setShop] = useState<Shop | null>(null);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Shop coupons & Saved coupons state
  const [shopCoupons, setShopCoupons] = useState<PublicStoreCoupon[]>([]);
  const [savedCouponIds, setSavedCouponIds] = useState<string[]>([]);
  const [savingCouponId, setSavingCouponId] = useState<string | null>(null);

  // Follow & Search states
  const [following, setFollowing] = useState(false);
  const [savingFollow, setSavingFollow] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const { deals: liveDeals, now: liveDealsNow } = useLiveSessionDeals((result?.items || []).map((product) => product.id));

  // 1. Fetch Store Profile
  useEffect(() => {
    if (!identifier) return;
    let active = true;
    setLoading(true);
    setShop(null);
    setResult(null);
    setFollowing(false);
    setShopCoupons([]);

    api.get(`/stores/public/id/${identifier}`)
      .then((res) => {
        if (active) {
          const data = unwrap(res);
          setShop(data);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Không tìm thấy Shop hoặc Shop đã ngừng hoạt động.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (authService.getCurrentUser()) {
      api.get(`/stores/public/id/${identifier}/follow`)
        .then((res) => {
          if (active) setFollowing(Boolean(unwrap(res)?.following));
        })
        .catch(() => undefined);

      api.get('/coupons/saved')
        .then((res) => {
          const raw = unwrap(res);
          if (active && Array.isArray(raw)) {
            setSavedCouponIds(raw);
          }
        })
        .catch(() => undefined);
    }

    return () => { active = false; };
  }, [identifier]);

  // 2. Fetch Shop Products & Shop Coupons when shop is loaded
  useEffect(() => {
    if (!shop?.id) return;
    let active = true;

    // Fetch Products
    api.get('/public/products', { params: { storeId: shop.id, search, category, sortBy, page, limit: 16 } })
      .then((res) => { if (active) setResult(unwrap(res)); })
      .catch(() => { if (active) setError('Không tải được sản phẩm của Shop.'); });

    // Fetch Public Coupons of this Store
    couponService.getPublicStoreCoupons(shop.id)
      .then((coupons) => {
        if (active) {
          const filtered = coupons.filter(
            (c) =>
              c.benefitType !== 'SHIPPING' &&
              c.fundingSource !== 'PLATFORM_FUNDED' &&
              !c.code.toUpperCase().startsWith('KOL') &&
              !c.code.toUpperCase().startsWith('PHANHAIY')
          );
          setShopCoupons(filtered);
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [shop?.id, search, category, sortBy, page]);

  // Open Chat
  const chat = () => {
    if (!shop) return;
    openChat({
      id: shop.id,
      name: shop.name,
      logoUrl: shop.logoUrl,
      isVerified: Boolean(shop.isVerified),
    });
  };

  // Toggle Follow
  const toggleFollow = async () => {
    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!shop?.id || savingFollow) return;
    setSavingFollow(true);
    try {
      await (following ? api.delete(`/stores/public/id/${shop.id}/follow`) : api.post(`/stores/public/id/${shop.id}/follow`));
      setFollowing(!following);
      setShop((current) => current ? { ...current, followerCount: current.followerCount + (following ? -1 : 1) } : current);
      toast.success(following ? 'Đã hủy theo dõi gian hàng' : 'Đã theo dõi gian hàng thành công!');
    } catch {
      setError('Chưa thể cập nhật theo dõi. Vui lòng thử lại.');
    } finally {
      setSavingFollow(false);
    }
  };

  // Save / Claim Voucher into Customer Wallet
  const handleSaveCoupon = async (voucher: PublicStoreCoupon) => {
    if (!authService.getCurrentUser()) {
      toast.info('Vui lòng đăng nhập để lưu mã giảm giá vào Ví Voucher');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      setSavingCouponId(voucher.id);
      await api.post(`/coupons/saved/${voucher.id}`);
      setSavedCouponIds((prev) => [...new Set([...prev, voucher.id])]);
      toast.success(`Đã lưu mã “${voucher.code}” vào Ví Voucher của bạn!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể lưu mã giảm giá lúc này');
    } finally {
      setSavingCouponId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612]">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        {loading ? (
          <div className="py-20 text-center text-[#7D715E]">Đang tải thông tin gian hàng...</div>
        ) : error && !shop ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            {error}
          </div>
        ) : shop && (
          <>
            {/* Header Thẻ Gian Hàng Chuẩn TMĐT */}
            <section className="rounded-3xl border border-[#EAE4D7] bg-white p-5 shadow-xs sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#EAE4D7] bg-[#F3EFE6] text-3xl font-bold text-[#B88E4F] sm:h-28 sm:w-28">
                  {shop.logoUrl ? (
                    <img
                      src={shop.logoUrl}
                      alt={`Logo ${shop.name}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/shops/shop-sora-skin.png';
                      }}
                    />
                  ) : (
                    <Store size={36} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                    {shop.name}
                    {shop.isVerified && (
                      <BadgeCheck size={22} className="text-[#B88E4F]" aria-label="Shop đã xác minh" />
                    )}
                  </h1>
                  <StoreActivityStatus storeId={shop.id} className="mt-1" />
                  {shop.description && (
                    <p className="mt-2 max-w-2xl text-sm text-[#7D715E] leading-relaxed">
                      {shop.description}
                    </p>
                  )}
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-[#7D715E]">
                    <span className="font-medium text-[#1A1612]">
                      {shop.isActive ? 'Shop đang hoạt động' : 'Shop ngừng hoạt động'}
                    </span>
                    <span>·</span>
                    <span>{shop.productCount} sản phẩm</span>
                    <span>·</span>
                    <span>{Number(shop.followerCount).toLocaleString('vi-VN')} người theo dõi</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#1A1612]">
                      <Star size={13} className="fill-[#C59B58] text-[#C59B58]" />
                      {shop.rating ? Number(shop.rating).toFixed(1) : '4.9'}
                      <span className="font-normal text-[#7D715E]">
                        ({shop.reviewCount ? Number(shop.reviewCount).toLocaleString('vi-VN') : 18} đánh giá)
                      </span>
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-col shrink-0">
                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={savingFollow}
                    className="flex-1 rounded-xl border border-[#C59B58] px-5 py-2.5 font-semibold text-[#B88E4F] hover:bg-[#FBF5EB] disabled:opacity-50 transition cursor-pointer"
                  >
                    <Heart size={16} className={`mr-2 inline ${following ? 'fill-[#C59B58]' : ''}`} />
                    {following ? 'Đang theo dõi' : 'Theo dõi'}
                  </button>
                  <button
                    type="button"
                    onClick={chat}
                    className="flex-1 rounded-xl bg-[#C59B58] px-5 py-2.5 font-semibold text-[#231D15] hover:bg-[#B88E4F] transition cursor-pointer"
                  >
                    <MessageSquare size={16} className="mr-2 inline" />
                    Chat ngay
                  </button>
                </div>
              </div>
            </section>

            {/* Khối Mã Giảm Giá Của Shop (Thu Thập / Sưu Tập Voucher) */}
            {shopCoupons.length > 0 && (
              <section className="mt-6 rounded-3xl border border-[#EAE4D7] bg-white p-4 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#C59B58]" />
                    <h2 className="text-base sm:text-lg font-bold text-[#1A1612]">
                      Mã Giảm Giá Của Shop
                    </h2>
                  </div>
                  <span className="text-xs text-[#7D715E]">
                    Lưu mã vào ví để áp dụng khi thanh toán
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {shopCoupons.map((voucher) => {
                    const isSaved = savedCouponIds.includes(voucher.id);
                    const isPercentage = voucher.discountType === 'PERCENTAGE';
                    const isSaving = savingCouponId === voucher.id;
                    const expiry = formatVoucherRemainingTime(voucher.expiresAt);

                    return (
                      <div
                        key={voucher.id}
                        className="flex items-stretch rounded-2xl border border-[#EEDFC6] bg-[#FAF8F5] overflow-hidden hover:border-[#C59B58] transition shadow-xs"
                      >
                        {/* Cuống vé */}
                        <div className="w-20 bg-[#F3EFE6] border-r border-dashed border-[#EEDFC6] p-2 flex flex-col items-center justify-center text-center shrink-0">
                          <Ticket className="w-5 h-5 text-[#B88E4F] mb-1" />
                          <span className="text-[10px] font-bold text-[#B88E4F] uppercase tracking-wide">
                            VOUCHER
                          </span>
                        </div>

                        {/* Thân vé */}
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div>
                            <p className="text-sm font-bold text-[#1A1612] truncate">
                              {isPercentage
                                ? `Giảm ${voucher.discountValue}%`
                                : `Giảm ${Number(voucher.discountValue).toLocaleString('vi-VN')} ₫`}
                              {voucher.maximumDiscountAmount
                                ? ` (Tối đa ${Number(voucher.maximumDiscountAmount).toLocaleString('vi-VN')} ₫)`
                                : ''}
                            </p>
                            <p className="text-xs text-[#7D715E] mt-0.5">
                              Đơn từ {Number(voucher.minimumOrderAmount || 0).toLocaleString('vi-VN')} ₫
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="inline-block font-mono text-[10px] font-semibold text-[#8A642C] bg-[#FBF5EB] border border-[#EEDFC6] px-1.5 py-0.5 rounded">
                                {voucher.code}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                expiry.isUrgent
                                  ? 'bg-amber-100/80 text-amber-800 font-bold border border-amber-300'
                                  : 'bg-[#F3EFE6] text-[#7D715E]'
                              }`}>
                                <Clock size={10} className={expiry.isUrgent ? 'text-amber-700' : 'text-[#8A642C]'} />
                                <span>{expiry.text}</span>
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#EAE4D7] flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[#7D715E]">
                              {voucher.remainingUses !== null ? `Còn ${voucher.remainingUses} lượt` : 'Số lượng có hạn'}
                            </span>
                            <button
                              type="button"
                              disabled={isSaved || isSaving}
                              onClick={() => handleSaveCoupon(voucher)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                isSaved
                                  ? 'bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7] cursor-default'
                                  : 'bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] cursor-pointer'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check size={12} className="text-emerald-700" />
                                  <span>Đã lưu</span>
                                </>
                              ) : isSaving ? (
                                'Đang lưu...'
                              ) : (
                                'Lưu mã'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Danh Sách Sản Phẩm */}
            <section className="mt-6 rounded-3xl border border-[#EAE4D7] bg-white p-4 sm:p-6 shadow-xs">
              <h2 className="text-xl font-bold">Sản phẩm của {shop.name}</h2>
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
                <button type="submit" className="rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-4 py-2 font-semibold text-[#231D15] transition cursor-pointer">
                  Tìm
                </button>
                <Select
                  aria-label="Danh mục"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
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

              {error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">{error}</p>}
              {result?.items.length === 0 && (
                <p className="py-12 text-center text-[#7D715E]">Chưa có sản phẩm phù hợp.</p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {result?.items.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.sku || product.id}`}
                    className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white transition hover:border-[#C59B58] hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square bg-[#F3EFE6]">
                        <LiveSessionDealBadge deal={liveDeals[product.id]} now={liveDealsNow} />
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 min-h-10 text-sm font-semibold text-[#1A1612]">
                          {product.title}
                        </p>
                        <p className="mt-2 font-bold text-[#B88E4F]">{money(product.price)}</p>
                        {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                          <p className="text-xs text-[#7D715E] line-through">{money(product.originalPrice)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {(result?.pagination.totalPages || 0) > 1 && (
                <nav aria-label="Phân trang sản phẩm" className="mt-6 flex items-center justify-center gap-3">
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
          </>
        )}
      </main>
    </div>
  );
}
