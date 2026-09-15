import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Store,
  ShieldCheck,
  Truck,
  ArrowRight,
  X,
  ShoppingBag,
  ShoppingCart,
  Play,
  Star,
  ChevronDown,
  Phone,
  Package,
  TrendingUp,
  User,
  Shield,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Sparkles,
  Copy,
} from 'lucide-react';
import api from '../../services/api';
import { GuestCheckoutModal, type CheckoutProductItem, type CheckoutStoreInfo } from '../../components/checkout/GuestCheckoutModal';
import {
  marketplaceProducts,
  marketplaceKOLs,
  marketplaceVideos,
} from '../../features/marketplace/marketplaceData';
import { formatMoney, normalizeSearch } from '../../features/marketplace/marketplaceUtils';
import type { Product, ReviewVideo } from '../../features/marketplace/marketplace.types';
import { toast } from '../../utils/toast';

export default function MarketplacePage() {
  const [items, setItems] = useState<Product[]>(marketplaceProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<ReviewVideo | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<{
    product: CheckoutProductItem;
    store: CheckoutStoreInfo;
    couponCode?: string;
  } | null>(null);

  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const trackingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/public/products', { params: { limit: 48 } })
      .then((res) => {
        if (!mounted) return;
        const apiItems = res.data?.items || [];
        if (apiItems.length > 0) {
          const mappedApiItems: Product[] = apiItems.map((dbP: any) => ({
            id: dbP.id,
            name: dbP.title || dbP.name,
            brand: dbP.store?.name || 'Sora Skin Official',
            category: (dbP.category?.slug || 'skincare') as any,
            categoryLabel: dbP.category?.name || 'Chăm sóc da & Serum',
            rating: 4.9,
            reviews: 42,
            sold: '320',
            origPrice: Number(dbP.originalPrice || dbP.price * 1.15 || 500000),
            price: Number(dbP.price || 420000),
            kolDiscountPrice: Math.round(Number(dbP.price || 420000) * 0.9),
            image: dbP.imageUrl || '/reference/assets/serum-hero-optimized.jpg',
            storeId: dbP.store?.id,
            sku: dbP.sku,
            stockQuantity: Number(dbP.stockQuantity || 0),
            variants: Array.isArray(dbP.variants) ? dbP.variants : [],
            kol: {
              name: 'Trần Văn Nhật',
              handle: '@nhatbeauty',
              coupon: 'NHATXINH10',
              tier: 'KOL Vàng',
            },
            badge: 'Mới lên sàn',
          }));

          const existingIds = new Set(mappedApiItems.map((p) => p.id));
          const combined = [
            ...mappedApiItems,
            ...marketplaceProducts.filter((p) => !existingIds.has(p.id)),
          ];
          setItems(combined);
        }
      })
      .catch(() => {
        setItems(marketplaceProducts);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
      if (
        storeDropdownRef.current &&
        !storeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableStores = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) {
      if (p.brand?.trim()) set.add(p.brand.trim());
    }
    return Array.from(set);
  }, [items]);

  const filteredProducts = useMemo(() => {
    const q = normalizeSearch(search);
    return items.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.categoryLabel.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchStore =
        selectedStore === 'all' || p.brand === selectedStore;

      if (!matchCat || !matchStore) return false;
      if (!q) return true;

      const nName = normalizeSearch(p.name);
      const nBrand = normalizeSearch(p.brand);
      const nKol = normalizeSearch(p.kol?.name || '');
      const nCoupon = normalizeSearch(p.kol?.coupon || '');
      return (
        nName.includes(q) ||
        nBrand.includes(q) ||
        nKol.includes(q) ||
        nCoupon.includes(q)
      );
    });
  }, [items, search, selectedCategory, selectedStore]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }, [cart]);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`Đã thêm "${product.name.slice(0, 32)}..." vào giỏ hàng!`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const handleOpenDirectCheckout = (product: Product) => {
    if (!product.storeId) {
      toast.error('Sản phẩm mẫu này chưa được liên kết với gian hàng thật nên chưa thể đặt hàng.');
      return;
    }
    setActiveCheckoutProduct({
      product: {
        id: product.id,
        title: product.name,
        sku: product.sku,
        price: product.price,
        originalPrice: product.origPrice,
        imageUrl: product.image,
        stockQuantity: product.stockQuantity || 0,
        variants: product.variants,
      },
      store: {
        id: product.storeId,
        name: product.brand,
      },
      couponCode: product.kol?.coupon || '',
    });
  };

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) {
      toast.error('Vui lòng nhập Số điện thoại hoặc Mã đơn hàng');
      return;
    }

    setTrackingLoading(true);
    setTimeout(() => {
      setTrackingLoading(false);
      setTrackResult({
        orderCode: trackQuery.toUpperCase().startsWith('IN')
          ? trackQuery.toUpperCase()
          : 'IN23931',
        customerName: 'Nguyễn Văn Khách',
        phone: trackQuery.match(/^[0-9]+$/) ? trackQuery : '0918 *** 888',
        address: '142 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
        storeName: 'Sora Skin Official',
        productName: 'Serum Vitamin C 15% Dưỡng Sáng Mờ Thâm Sora Skin (x1)',
        totalAmount: 413100,
        carrier: 'ViettelPost Nhanh',
        status: 'ĐANG VẬN CHUYỂN',
        statusNote: 'Kiện hàng đã rời trung tâm khai thác TP.HCM, dự kiến giao trong ngày.',
        timeline: [
          { time: '09:15 - Hôm nay', text: 'Bưu tá ViettelPost đang phát hàng tới địa chỉ người nhận' },
          { time: '21:30 - Hôm qua', text: 'Đơn hàng nhập kho trung chuyển Tân Bình' },
          { time: '14:00 - Hôm qua', text: 'Gian hàng Sora Skin Official đã đóng gói và bàn giao đối tác vận chuyển' },
          { time: '10:30 - Hôm qua', text: 'Đơn hàng được xác nhận thành công qua mã ưu đãi NHATXINH10' },
        ],
      });
    }, 600);
  };

  const [currentSpotlightIndex, setCurrentSpotlightIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 45, seconds: 18 });
  const [isVoucherSaved, setIsVoucherSaved] = useState(false);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const [isScrubbingSlider, setIsScrubbingSlider] = useState(false);

  useEffect(() => {
    const container = thumbnailContainerRef.current;
    if (container) {
      const activeThumb = container.children[currentSpotlightIndex] as HTMLElement;
      if (activeThumb) {
        const targetScroll =
          activeThumb.offsetLeft - (container.clientWidth - activeThumb.clientWidth) / 2;
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      }
    }
  }, [currentSpotlightIndex]);

  const handleSliderScrub = (clientX: number) => {
    if (!sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetIdx = Math.min(
      spotlightList.length - 1,
      Math.floor(ratio * spotlightList.length)
    );
    setCurrentSpotlightIndex(targetIdx);
  };

  const REVIEW_QUOTES = useMemo(
    () => [
      'Chất serum thẩm thấu cực nhanh, da sáng đều màu và mờ thâm mụn chỉ sau 10 ngày trải nghiệm!',
      'Bảo vệ da quang phổ rộng SPF50+, nâng tông nhẹ tự nhiên và không hề nhờn rít hay vệt trắng.',
      'Chiên nướng chuẩn vị giòn rụm không cần dầu, dung tích 6.5L nướng nguyên con gà cực tiện lợi.',
      'Giữ nhiệt nóng lạnh suốt 24h, chất liệu Inox 316 chuẩn y tế chống gỉ sét và cực kỳ an toàn.',
      'Gõ êm tay chuẩn cơ học, pin trâu dùng 2 tuần và led RGB đổi màu cực chill khi làm việc.',
    ],
    []
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 3, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const spotlightList = useMemo(() => {
    const pool = items.length > 0 ? items : marketplaceProducts;
    return pool.slice(0, 5).map((p, idx) => {
      const creator = p.kol
        ? {
            name: p.kol.name,
            tier: p.kol.tier || 'KOL Vàng',
            avatarImg:
              marketplaceKOLs[idx % marketplaceKOLs.length]?.avatarImg ||
              '/reference/assets/creator-nhat.jpg',
            coupon: p.kol.coupon,
          }
        : {
            name: marketplaceKOLs[idx % marketplaceKOLs.length]?.name || 'Trần Văn Nhật',
            tier: marketplaceKOLs[idx % marketplaceKOLs.length]?.tier || 'KOL Vàng',
            avatarImg:
              marketplaceKOLs[idx % marketplaceKOLs.length]?.avatarImg ||
              '/reference/assets/creator-nhat.jpg',
            coupon: 'SCANMSVIP10',
          };

      const discountPercent =
        p.origPrice && p.kolDiscountPrice
          ? Math.round(((p.origPrice - p.kolDiscountPrice) / p.origPrice) * 100)
          : 20;

      const soldRatios = [88, 92, 74, 82, 95];
      const caps = [180, 200, 160, 220, 150];
      const soldRatio = soldRatios[idx % soldRatios.length];
      const totalCap = caps[idx % caps.length];
      const soldCount = Math.round((soldRatio / 100) * totalCap);

      const dealBadges = [
        '⚡ FLASH SALE GIỜ VÀNG',
        '🔥 TOP 1 CHỐNG NẮNG HÈ',
        '💎 GIA DỤNG THÔNG MINH',
        '⭐ TOP 1 XU HƯỚNG BẮC ÂU',
        '🚀 TECH DEAL CÔNG NGHỆ',
      ];

      return {
        product: p,
        creator,
        discountPercent,
        soldRatio,
        soldCount,
        totalCap,
        dealBadge: dealBadges[idx % dealBadges.length],
        reviewQuote: REVIEW_QUOTES[idx % REVIEW_QUOTES.length],
      };
    });
  }, [items, REVIEW_QUOTES]);

  useEffect(() => {
    if (isCarouselHovered || spotlightList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSpotlightIndex((prev) => (prev + 1) % spotlightList.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isCarouselHovered, spotlightList.length]);

  const activeSpotlight = spotlightList[currentSpotlightIndex] || spotlightList[0];

  const handleSaveVoucher = () => {
    setIsVoucherSaved(true);
    toast.success('🎉 Đã lưu mã voucher SCANMS50K (-50.000₫) vào ví của bạn!');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans selection:bg-[#F3EFE6] selection:text-[#B88E4F] overflow-x-clip">

      <aside className="bg-[#F3EFE6] text-[#7A561B] text-[11.5px] font-medium py-2 px-4 border-b border-[#EEDFC6]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C59B58] animate-ping"></span>
            <span className="font-bold text-[#1A1612]">SCANMS COMMERCE:</span>
            <span className="text-[#7D715E]">Sàn Mua Sắm & Tiếp Thị Liên Kết Đa Gian Hàng · 100% Chính Hãng · Bảo Hộ Đổi Trả 14 Ngày</span>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-xs text-[#7A561B]">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-[#B88E4F] transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#C59B58]" />
              Chính sách an tâm
            </button>
            <button
              type="button"
              onClick={() => {
                trackingRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#B88E4F] transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Truck className="w-3.5 h-3.5 text-[#C59B58]" />
              Tra cứu đơn
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6">

          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C59B58] to-[#B88E4F] text-white font-black text-lg flex items-center justify-center shadow-xs">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-lg tracking-tight text-[#1A1612] group-hover:text-[#B88E4F] transition">
                SCANMS
              </span>
              <span className="text-[10px] text-[#7D715E] tracking-wider uppercase font-bold leading-none hidden sm:inline">
                Sàn Tiếp Thị Đa Gian Hàng
              </span>
            </div>
          </Link>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm sản phẩm, thương hiệu, Creator hoặc mã voucher..."
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-[#1A1612] placeholder-[#8C7D6B] focus:bg-white focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58] outline-none transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 text-[#7D715E] hover:text-[#1A1612] p-0.5"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                trackingRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#B88E4F]" />
              <span>Tra cứu đơn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] transition cursor-pointer shadow-2xs"
              title="Giỏ hàng của bạn"
            >
              <ShoppingCart className="w-4 h-4 text-[#B88E4F]" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {totalCartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[10px] font-black flex items-center justify-center -mr-1">
                  {totalCartCount}
                </span>
              )}
            </button>

            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FBF5EB] border border-[#EEDFC6] hover:bg-[#F5E7CC] transition cursor-pointer shadow-2xs"
              >
                <User className="w-4 h-4 text-[#B88E4F]" />
                <span>Cổng đối tác</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#7D715E]" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#EAE4D7] rounded-2xl shadow-xl p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-[#EAE4D7]">
                    <strong className="block text-xs font-black text-[#1A1612]">
                      Cổng đăng nhập đối tác
                    </strong>
                    <small className="text-[11px] text-[#7D715E] block mt-0.5">
                      Truy cập không gian làm việc chuyên biệt theo vai trò
                    </small>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Link
                      to="/collaborator/dashboard"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FBF5EB] transition text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#1A1612]">Cộng Tác Viên / KOL</span>
                        <small className="text-[10px] text-[#7D715E] block truncate">Lấy link tiếp thị & rút hoa hồng</small>
                      </div>
                    </Link>

                    <Link
                      to="/merchant/dashboard"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FBF5EB] transition text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F5E7CC] text-[#7A561B] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#1A1612]">Chủ Gian Hàng (Shop)</span>
                        <small className="text-[10px] text-[#7D715E] block truncate">Quản lý sản phẩm & đối soát</small>
                      </div>
                    </Link>

                    <Link
                      to="/admin/users"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FBF5EB] transition text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#1A1612]">Quản Trị Hệ Thống</span>
                        <small className="text-[10px] text-[#7D715E] block truncate">Duyệt KYC, an ninh & cấu hình</small>
                      </div>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-[#EAE4D7] grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="text-center py-2 px-3 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="text-center py-2 px-3 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition"
                    >
                      Đăng ký
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#F3EFE6]/60 border-t border-[#EAE4D7] px-4 sm:px-6 py-2 relative z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div
              className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto py-1 flex-1 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#C59B58] text-white shadow-xs'
                    : 'bg-white text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58]/40'
                }`}
              >
                Tất cả sản phẩm ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('skincare')}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  selectedCategory === 'skincare'
                    ? 'bg-[#C59B58] text-white shadow-xs'
                    : 'bg-white text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58]/40'
                }`}
              >
                Chăm sóc da & Serum
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('home')}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  selectedCategory === 'home'
                    ? 'bg-[#C59B58] text-white shadow-xs'
                    : 'bg-white text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58]/40'
                }`}
              >
                Gia dụng & Đời sống
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('tech')}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  selectedCategory === 'tech'
                    ? 'bg-[#C59B58] text-white shadow-xs'
                    : 'bg-white text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58]/40'
                }`}
              >
                Công nghệ & Phụ kiện
              </button>
            </div>

            {/* Custom Warm Sand Gold Store Dropdown (Replaces native select to eliminate dark/black OS popup) */}
            <div ref={storeDropdownRef} className="relative flex items-center gap-2 text-xs shrink-0">
              <span className="text-[#7D715E] font-bold flex items-center gap-1 shrink-0">
                <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
                Gian hàng:
              </span>

              <button
                type="button"
                onClick={() => setIsStoreDropdownOpen((prev) => !prev)}
                className="bg-white hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1612] flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <span className="truncate max-w-[150px]">
                  {selectedStore === 'all'
                    ? `Tất cả gian hàng (${availableStores.length})`
                    : selectedStore}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#B88E4F] transition-transform duration-200 ${
                    isStoreDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isStoreDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#EEDFC6] rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10.5px] font-black uppercase text-[#8C6226] tracking-wider border-b border-[#EAE4D7] mb-1 bg-[#FAF8F5]/80">
                    Chọn gian hàng đối tác
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStore('all');
                      setIsStoreDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                      selectedStore === 'all'
                        ? 'bg-[#FBF5EB] text-[#B88E4F] font-black border-l-2 border-[#C59B58]'
                        : 'text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F]'
                    }`}
                  >
                    <span>Tất cả gian hàng ({availableStores.length})</span>
                    {selectedStore === 'all' && (
                      <Check className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                    )}
                  </button>

                  {availableStores.map((st) => {
                    const isSelected = selectedStore === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setSelectedStore(st);
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#FBF5EB] text-[#B88E4F] font-black border-l-2 border-[#C59B58]'
                            : 'text-[#1A1612] hover:bg-[#FAF8F5] hover:text-[#B88E4F]'
                        }`}
                      >
                        <span className="truncate">{st}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-b from-[#F3EFE6] via-[#FAF8F5] to-[#FAF8F5] border-b border-[#EAE4D7] py-8 sm:py-12 overflow-hidden">
        {/* Subtle Luxury Golden Ambient Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#C59B58]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-[#B88E4F]/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

          {/* MAIN STAGE: Left Wing Campaign Hub & Right Wing Shopee Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

            {/* LEFT WING: Flagship Campaign, Interactive Voucher Ticket & Trust Props (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-5 text-left bg-gradient-to-br from-white via-white to-[#FBF5EB] border-2 border-[#EEDFC6] rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-[#C59B58]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col gap-4 relative z-10">
                {/* Brand Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#8C6226] text-[11px] font-black w-max shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
                  <span>SCANMS MALL · 100% CHÍNH HÃNG</span>
                </div>

                {/* Big Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1A1612] leading-[1.2] m-0">
                  Đại Hội Săn Deal.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B88E4F] via-[#C59B58] to-[#92400E]">
                    Ưu Đãi Độc Quyền Cùng Top Creator.
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-[#7D715E] leading-relaxed m-0">
                  Khám phá hàng ngàn sản phẩm uy tín từ các thương hiệu chính hãng. Nhập mã voucher từ Creator để được giảm giá trực tiếp, đồng kiểm tận tay và đổi trả bảo hộ 14 ngày.
                </p>

                {/* Interactive Shopee-Style Voucher Ticket */}
                <div className="rounded-2xl border-2 border-dashed border-[#C59B58] bg-[#FBF5EB] p-3.5 relative overflow-hidden flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#C59B58] text-white flex flex-col items-center justify-center shrink-0 font-black shadow-xs">
                      <span className="text-[10px] leading-none">GIẢM</span>
                      <span className="text-sm font-black leading-tight">50K</span>
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-xs font-black text-[#1A1612] truncate">
                        Voucher Toàn Sàn SCANMS50K
                      </strong>
                      <span className="text-[11px] text-[#7D715E] block truncate">
                        Đơn từ 250k khi mua qua link Creator
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveVoucher}
                    className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${
                      isVoucherSaved
                        ? 'bg-[#FBF5EB] text-[#059669] border border-[#059669]/40 font-black'
                        : 'bg-[#C59B58] text-white hover:bg-[#B88E4F] active:scale-95'
                    }`}
                  >
                    {isVoucherSaved ? '✓ Đã lưu' : 'Lưu mã'}
                  </button>
                </div>
              </div>

              {/* Bottom Actions & Trust Guarantees */}
              <div className="flex flex-col gap-3 relative z-10 pt-2 border-t border-[#EAE4D7]">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => catalogRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-black transition cursor-pointer shadow-sm active:scale-98"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Lướt Kho Sản Phẩm</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-white border border-[#EAE4D7] hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#B88E4F]" />
                    <span>An tâm 100%</span>
                  </button>
                </div>

                {/* 3 Micro Guarantees */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-[#EAE4D7]">
                    <strong className="block text-[11px] font-black text-[#1A1612]">Chính Hãng</strong>
                    <span className="text-[10px] text-[#7D715E] block">Kiểm định 100%</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-[#EAE4D7]">
                    <strong className="block text-[11px] font-black text-[#1A1612]">Đổi Trả 14N</strong>
                    <span className="text-[10px] text-[#7D715E] block">Đồng kiểm tận tay</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-[#EAE4D7]">
                    <strong className="block text-[11px] font-black text-[#1A1612]">Voucher KOL</strong>
                    <span className="text-[10px] text-[#7D715E] block">Tự động giảm giá</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT WING: Shopee-Style Flagship Showcase & Gallery Rail (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <div
                onMouseEnter={() => setIsCarouselHovered(true)}
                onMouseLeave={() => setIsCarouselHovered(false)}
                className="bg-white border-2 border-[#EEDFC6] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-left flex flex-col justify-between gap-4 h-full group"
              >
                {/* Stage Header: Flash Sale Header + Countdown + Nav Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#EAE4D7] pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#B88E4F] to-[#C59B58] text-white text-xs font-black shadow-xs">
                      <Zap className="w-3.5 h-3.5 fill-white text-white" />
                      <span>{activeSpotlight.dealBadge}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
                      -{activeSpotlight.discountPercent}% GIẢM
                    </span>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-2.5 py-1 text-xs font-black text-[#1A1612]">
                    <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
                    <span className="text-[10.5px] text-[#7D715E] font-bold">KẾT THÚC TRONG</span>
                    <span className="bg-[#F3EFE6] text-[#7A561B] border border-[#EEDFC6] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shadow-2xs">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[#B88E4F] font-bold">:</span>
                    <span className="bg-[#F3EFE6] text-[#7A561B] border border-[#EEDFC6] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shadow-2xs">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[#B88E4F] font-bold">:</span>
                    <span className="bg-[#F3EFE6] text-[#7A561B] border border-[#EEDFC6] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shadow-2xs">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Hero Product Spotlight Card */}
                <div
                  key={activeSpotlight.product.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center animate-in fade-in zoom-in-95 duration-200"
                >
                  {/* Left Column: Image with badges */}
                  <div className="sm:col-span-5 relative group/img overflow-hidden rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] aspect-square flex items-center justify-center shadow-inner">
                    <img
                      src={activeSpotlight.product.image}
                      alt={activeSpotlight.product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      loading="eager"
                    />
                    {/* Official Store Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs border border-[#EAE4D7] px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px] font-bold text-[#1A1612] shadow-2xs">
                      <Store className="w-3 h-3 text-[#B88E4F]" />
                      <span className="truncate max-w-[130px]">{activeSpotlight.product.brand}</span>
                    </div>

                    {/* Verified Mall Tag */}
                    <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs border border-[#EEDFC6] text-[#1A1612] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-black shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C59B58] animate-ping" />
                      <span>Đang mở bán Flash Deal</span>
                    </div>
                  </div>

                  {/* Right Column: Info, Review Quote, Price, Flame progress, Buttons */}
                  <div className="sm:col-span-7 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#B88E4F] flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[#B88E4F]" />
                        {activeSpotlight.product.rating}
                      </span>
                      <span className="text-[#EAE4D7]">|</span>
                      <span className="text-[#7D715E] font-medium">
                        {activeSpotlight.product.sold || `${activeSpotlight.soldCount}`} đã bán
                      </span>
                      <span className="text-[#EAE4D7]">|</span>
                      <span className="text-[#7D715E] font-medium truncate">
                        {activeSpotlight.product.categoryLabel}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[#1A1612] leading-snug m-0 line-clamp-2">
                      {activeSpotlight.product.name}
                    </h3>

                    {/* Creator Endorsement with Review Quote */}
                    <div className="p-3 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={activeSpotlight.creator.avatarImg}
                            alt={activeSpotlight.creator.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-[#C59B58] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-black text-[#1A1612] truncate">
                                {activeSpotlight.creator.name}
                              </strong>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#C59B58] text-white shrink-0">
                                {activeSpotlight.creator.tier}
                              </span>
                            </div>
                            <span className="text-[10.5px] text-[#7D715E] block truncate">
                              Reviewer chính hãng
                            </span>
                          </div>
                        </div>

                        {/* Copy Code button */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeSpotlight.creator.coupon);
                            toast.success(`Đã sao chép mã voucher ${activeSpotlight.creator.coupon}!`);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EEDFC6] text-[11px] font-bold text-[#B88E4F] shrink-0 transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{activeSpotlight.creator.coupon}</span>
                        </button>
                      </div>

                      {/* Review quote */}
                      <p className="text-[11.5px] text-[#7D715E] italic m-0 line-clamp-2 border-t border-[#EEDFC6]/60 pt-1.5">
                        "{activeSpotlight.reviewQuote}"
                      </p>
                    </div>

                    {/* Price and Savings */}
                    <div className="flex items-baseline gap-2.5 pt-0.5 flex-wrap">
                      <span className="text-xs text-[#7D715E] line-through">
                        {formatMoney(activeSpotlight.product.origPrice)}
                      </span>
                      <strong className="text-2xl font-black text-[#1A1612]">
                        {formatMoney(activeSpotlight.product.kolDiscountPrice)}
                      </strong>
                      <span className="text-[11px] font-extrabold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-md border border-[#EEDFC6]">
                        Tiết kiệm {formatMoney(activeSpotlight.product.origPrice - activeSpotlight.product.kolDiscountPrice)}
                      </span>
                    </div>

                    {/* Shopee Flame Flash Sale Progress Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-[#B88E4F] flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-[#C59B58] text-[#C59B58]" />
                          ĐÃ BÁN {activeSpotlight.soldCount}/{activeSpotlight.totalCap}
                        </span>
                        <span className="text-[#7D715E]">{activeSpotlight.soldRatio}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F3EFE6] rounded-full overflow-hidden border border-[#EAE4D7] relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#C59B58] to-[#B88E4F] rounded-full transition-all duration-500 relative"
                          style={{ width: `${activeSpotlight.soldRatio}%` }}
                        >
                          <div className="absolute inset-0 bg-white/25 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(activeSpotlight.product)}
                        className="py-2.5 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <ShoppingCart className="w-4 h-4 text-[#B88E4F]" />
                        <span>Thêm giỏ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDirectCheckout(activeSpotlight.product)}
                        className="py-2.5 px-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                      >
                        <span>Mua ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Rail: Shopee Flash Sale Mini-Card Gallery with Custom Slider Bar */}
                <div className="pt-3 border-t border-[#EAE4D7] space-y-2.5">
                  {/* Thumbnail cards row (completely hides native Windows scrollbar) */}
                  <div
                    ref={thumbnailContainerRef}
                    className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth select-none [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {spotlightList.map((item, idx) => {
                      const isActive = idx === currentSpotlightIndex;
                      return (
                        <button
                          key={item.product.id}
                          type="button"
                          onClick={() => setCurrentSpotlightIndex(idx)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer shrink-0 relative overflow-hidden group ${
                            isActive
                              ? 'bg-[#FBF5EB] border-[#C59B58] shadow-xs ring-2 ring-[#C59B58]/30 scale-[1.02]'
                              : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/60 hover:bg-[#FAF8F5] opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#EAE4D7]"
                          />
                          <div className="hidden sm:block min-w-0 max-w-[105px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-black text-[#1A1612]">
                                {formatMoney(item.product.kolDiscountPrice)}
                              </span>
                            </div>
                            <span className="block text-[10px] text-[#7D715E] truncate">
                              {item.product.name}
                            </span>
                          </div>

                          {/* Active auto-rotate indicator bar */}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C59B58]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Shopee-Style Drag / Scrub Slider Bar & Controls */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#F3EFE6]">
                    {/* Left: Indicator label */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D715E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C59B58] animate-pulse" />
                      <span className="hidden xs:inline">Kéo hoặc bấm thanh trượt để xem {spotlightList.length} deal</span>
                      <span className="xs:hidden">Thanh trượt deal</span>
                    </div>

                    {/* Center: Custom Shopee Draggable Track & Gold Thumb */}
                    <div className="flex items-center gap-2 flex-1 max-w-[200px] sm:max-w-[260px] mx-auto">
                      <div
                        ref={sliderTrackRef}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setIsScrubbingSlider(true);
                          handleSliderScrub(e.clientX);
                        }}
                        onPointerMove={(e) => {
                          if (isScrubbingSlider) {
                            handleSliderScrub(e.clientX);
                          }
                        }}
                        onPointerUp={(e) => {
                          if (isScrubbingSlider) {
                            try {
                              e.currentTarget.releasePointerCapture(e.pointerId);
                            } catch {}
                            setIsScrubbingSlider(false);
                          }
                        }}
                        className="w-full h-2 bg-[#EAE4D7] hover:bg-[#DDD5C5] rounded-full relative cursor-pointer select-none overflow-hidden transition-colors"
                        title="Kéo hoặc bấm để chuyển deal sản phẩm"
                      >
                        <div
                          className="h-full bg-gradient-to-r from-[#C59B58] via-[#D8AD6A] to-[#B88E4F] rounded-full shadow-xs transition-all ease-out"
                          style={{
                            width: `${100 / spotlightList.length}%`,
                            transform: `translateX(${currentSpotlightIndex * 100}%)`,
                            transitionDuration: isScrubbingSlider ? '75ms' : '300ms',
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Counter & Quick Arrow Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono font-bold text-[#1A1612] bg-[#F3EFE6] px-2 py-0.5 rounded-md border border-[#EAE4D7]">
                        <span className="text-[#C59B58]">{currentSpotlightIndex + 1}</span>
                        <span className="text-[#7D715E]">/{spotlightList.length}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentSpotlightIndex(
                            (prev) => (prev - 1 + spotlightList.length) % spotlightList.length
                          )
                        }
                        className="w-6 h-6 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-[#1A1612] flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                        title="Sản phẩm trước"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentSpotlightIndex(
                            (prev) => (prev + 1) % spotlightList.length
                          )
                        }
                        className="w-6 h-6 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-[#1A1612] flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                        title="Sản phẩm tiếp theo"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B88E4F] uppercase tracking-wider mb-1">
              <Play className="w-3.5 h-3.5 fill-[#B88E4F]" />
              <span>Video Review Thực Tế</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0">
              Trải nghiệm chân thực từ Creator
            </h2>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
              Bấm vào từng video clip để xem review thực tế và lấy mã giảm giá áp dụng trực tiếp khi mua sắm.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketplaceVideos.map((v) => (
            <div
              key={v.id}
              onClick={() => setActiveVideo(v)}
              className="group cursor-pointer rounded-2xl border border-[#EAE4D7] bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-[#C59B58] transition flex flex-col"
            >
              <div className="relative aspect-[9/13] bg-[#231D15] overflow-hidden">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                    {v.views} views
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#C59B58] text-white text-[10px] font-black">
                    Mã: {v.coupon}
                  </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 text-[#C59B58] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#C59B58] group-hover:text-white transition shadow-lg">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 z-10 text-white">
                  <span className="text-[11px] font-extrabold text-[#EEDFC6] block">
                    {v.kol} ({v.handle})
                  </span>
                  <p className="text-xs font-bold leading-snug line-clamp-2 mt-0.5 mb-0 text-white">
                    {v.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section ref={catalogRef} id="catalog-section" className="py-10 px-4 sm:px-6 max-w-7xl mx-auto w-full text-left border-t border-[#EAE4D7]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0">
              Danh mục sản phẩm đối tác
            </h2>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
              Đang hiển thị {filteredProducts.length} sản phẩm chính hãng với bảo hộ nguồn gốc minh bạch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7D715E]">Bộ lọc:</span>
            <span className="px-3 py-1 rounded-lg bg-[#F3EFE6] text-xs font-bold text-[#1A1612]">
              {selectedCategory === 'all' ? 'Tất cả danh mục' : selectedCategory} · {selectedStore === 'all' ? 'Tất cả gian hàng' : selectedStore}
            </span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D7] p-8">
            <ShoppingBag className="w-12 h-12 text-[#A49B8B] mx-auto mb-3" />
            <strong className="text-base font-bold text-[#1A1612] block">
              Không tìm thấy sản phẩm phù hợp
            </strong>
            <p className="text-xs text-[#7D715E] mt-1 mb-4">
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedStore('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-[#C59B58]/80 transition duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-square bg-[#FAF8F5] overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {p.badge && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#C59B58] text-white text-[10px] font-black shadow-xs">
                        {p.badge}
                      </span>
                    )}
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                      -15%
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-2 text-left">
                    <div className="flex items-center justify-between text-[11px] text-[#7D715E]">
                      <span className="font-bold flex items-center gap-1 truncate max-w-[150px]">
                        <Store className="w-3 h-3 text-[#B88E4F] shrink-0" />
                        {p.brand}
                      </span>
                      <span className="font-bold text-[#B88E4F] shrink-0">
                        ⭐ {p.rating}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-black text-[#1A1612] leading-snug line-clamp-2 m-0 group-hover:text-[#B88E4F] transition">
                      {p.name}
                    </h3>

                    {p.kol && (
                      <div className="p-2 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between text-[11px]">
                        <span className="text-[#7D715E] font-medium truncate">
                          {p.kol.name}
                        </span>
                        <span className="font-black text-[#B88E4F] shrink-0">
                          Mã: {p.kol.coupon}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-xs text-[#7D715E] line-through">
                        {formatMoney(p.origPrice)}
                      </span>
                      <strong className="text-base font-black text-[#1A1612]">
                        {formatMoney(p.price)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(p)}
                    className="py-2 px-2.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-[#B88E4F]" />
                    <span>Thêm giỏ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDirectCheckout(p)}
                    className="py-2 px-2.5 rounded-xl bg-[#C59B58] text-white text-xs font-black hover:bg-[#B88E4F] transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>Mua ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section ref={trackingRef} id="tracking-section" className="py-12 px-4 sm:px-6 bg-[#F3EFE6] border-t border-[#EAE4D7]">
        <div className="max-w-4xl mx-auto text-left">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold text-[#B88E4F] uppercase tracking-wider">
              Tra cứu minh bạch
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] mt-1 m-0">
              Tra cứu hành trình đơn hàng
            </h2>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
              Nhập Số điện thoại mua hàng hoặc Mã vận đơn để kiểm tra trạng thái và lịch trình vận chuyển thực tế.
            </p>
          </div>

          <form
            onSubmit={handleTrackOrder}
            className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto bg-white p-2 rounded-2xl border border-[#EEDFC6] shadow-sm"
          >
            <div className="flex-1 flex items-center px-3">
              <Phone className="w-4 h-4 text-[#B88E4F] mr-2 shrink-0" />
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Nhập số điện thoại (vd: 0912345678) hoặc mã IN23931..."
                className="w-full text-xs sm:text-sm outline-none text-[#1A1612] placeholder-[#A49B8B]"
              />
            </div>
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-6 py-2.5 rounded-xl bg-[#C59B58] text-white text-xs sm:text-sm font-bold hover:bg-[#B88E4F] transition shadow-xs cursor-pointer shrink-0"
            >
              {trackingLoading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
            </button>
          </form>

          {trackResult && (
            <div className="mt-8 bg-white border border-[#EAE4D7] rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAE4D7]">
                <div>
                  <span className="text-xs text-[#7D715E] font-medium">Mã đơn hàng:</span>
                  <strong className="text-base font-black text-[#1A1612] ml-2">
                    {trackResult.orderCode}
                  </strong>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {trackResult.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-[#EAE4D7] text-xs">
                <div>
                  <span className="text-[#7D715E] block">Người nhận hàng:</span>
                  <strong className="text-[#1A1612] text-sm block mt-0.5">
                    {trackResult.customerName} ({trackResult.phone})
                  </strong>
                  <span className="text-[#7D715E] block mt-1">{trackResult.address}</span>
                </div>
                <div>
                  <span className="text-[#7D715E] block">Sản phẩm & Gian hàng:</span>
                  <strong className="text-[#1A1612] text-sm block mt-0.5">
                    {trackResult.productName}
                  </strong>
                  <span className="text-[#B88E4F] font-bold block mt-1">
                    Gian hàng: {trackResult.storeName} · {formatMoney(trackResult.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <strong className="text-xs font-black text-[#1A1612] block mb-3">
                  Lịch trình vận chuyển:
                </strong>
                <div className="space-y-3">
                  {trackResult.timeline.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-[#C59B58] mt-1.5 shrink-0"></div>
                      <div>
                        <span className="text-[#7D715E] font-mono text-[11px] block">
                          {step.time}
                        </span>
                        <span className="font-semibold text-[#1A1612] block">
                          {step.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#F3EFE6] border-t border-[#EAE4D7] text-[#1A1612] py-12 px-4 sm:px-6 mt-auto text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl bg-[#C59B58] text-white font-black text-base flex items-center justify-center shadow-xs">
                S
              </span>
              <strong className="text-[#1A1612] text-lg font-black tracking-tight">SCANMS</strong>
            </div>
            <p className="text-xs text-[#7D715E] leading-relaxed">
              Hệ thống sàn thương mại tiếp thị liên kết đa gian hàng, kết nối hàng nghìn Creator với các thương hiệu chính hãng hàng đầu.
            </p>
          </div>

          <div>
            <strong className="text-[#1A1612] text-xs font-bold uppercase tracking-wider block mb-3">
              Dành cho Người Mua
            </strong>
            <ul className="space-y-2 text-xs text-[#7D715E] list-none p-0 m-0">
              <li>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="hover:text-[#B88E4F] transition cursor-pointer font-medium"
                >
                  Chính sách bảo hộ 14 ngày
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => trackingRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-[#B88E4F] transition cursor-pointer font-medium"
                >
                  Tra cứu tình trạng vận đơn
                </button>
              </li>
              <li>Quy chuẩn hàng chính hãng 100%</li>
              <li>Quy trình giải quyết khiếu nại</li>
            </ul>
          </div>

          <div>
            <strong className="text-[#1A1612] text-xs font-bold uppercase tracking-wider block mb-3">
              Cổng Dành Cho Đối Tác
            </strong>
            <ul className="space-y-2 text-xs text-[#7D715E] list-none p-0 m-0">
              <li>
                <Link to="/collaborator/dashboard" className="hover:text-[#B88E4F] transition font-medium">
                  Cộng Tác Viên & KOL Bán Hàng
                </Link>
              </li>
              <li>
                <Link to="/merchant/dashboard" className="hover:text-[#B88E4F] transition font-medium">
                  Chủ Gian Hàng & Doanh Nghiệp
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#B88E4F] transition font-medium">
                  Đăng nhập tài khoản
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#B88E4F] transition font-medium">
                  Đăng ký mở gian hàng / CTV mới
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <strong className="text-[#1A1612] text-xs font-bold uppercase tracking-wider block mb-3">
              Chứng Nhận & Bảo Mật
            </strong>
            <p className="text-xs text-[#7D715E] leading-relaxed">
              Mọi giao dịch trên sàn SCANMS đều được bảo vệ bởi mã hóa SSL 256-bit, đối soát thanh toán an toàn và hỗ trợ đồng kiểm trực tiếp khi nhận hàng.
            </p>
            <span className="text-[11px] text-[#B88E4F] font-bold block mt-2">
              Hotline hỗ trợ: 1900 8888 (8h00 - 21h00)
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-[#EAE4D7] mt-8 pt-6 flex flex-wrap items-center justify-between text-xs text-[#7D715E]">
          <span>© 2026 SCANMS. All rights reserved. Nền tảng quản lý tiếp thị liên kết FA26SE032.</span>
          <div className="flex items-center gap-4 text-[#7D715E]">
            <span className="hover:text-[#1A1612] cursor-pointer">Điều khoản dịch vụ</span>
            <span className="hover:text-[#1A1612] cursor-pointer">Chính sách bảo mật</span>
            <span className="hover:text-[#1A1612] cursor-pointer">Bảo vệ người tiêu dùng</span>
          </div>
        </div>
      </footer>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 text-left animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#B88E4F]" />
                <strong className="text-base font-black text-[#1A1612]">
                  Giỏ hàng của bạn ({totalCartCount})
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
                        onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-white border border-[#EAE4D7] text-xs font-bold flex items-center justify-center hover:bg-[#F3EFE6] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-[#1A1612] w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
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
                    {formatMoney(cartSubtotal)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    handleOpenDirectCheckout(cart[0].product);
                  }}
                  className="w-full py-3 rounded-xl bg-[#C59B58] text-white text-xs sm:text-sm font-black hover:bg-[#B88E4F] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Tiến hành đặt hàng ({totalCartCount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-black text-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-[9/14] bg-neutral-900">
              <video
                src="/reference/assets/sample-video.mp4"
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              ></video>
            </div>

            <div className="p-4 bg-white text-[#1A1612] text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10.5px]">
                  {activeVideo.kol}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] font-bold text-[10.5px] border border-[#EEDFC6]">
                  Mã: {activeVideo.coupon} (-10%)
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 m-0 mb-3">
                {activeVideo.title}
              </h4>
              <button
                type="button"
                onClick={() => {
                  const prod = items.find((p) => p.id === activeVideo.productId) || items[0];
                  setActiveVideo(null);
                  handleOpenDirectCheckout(prod);
                }}
                className="w-full py-2.5 rounded-xl bg-[#C59B58] text-white text-xs font-black hover:bg-[#B88E4F] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Mua theo gợi ý clip</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#EAE4D7] shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="absolute top-4 right-4 text-[#7D715E] hover:text-[#1A1612] p-1.5 rounded-full hover:bg-[#F3EFE6] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-[#1A1612] m-0">
              Chính Sách Mua Sắm An Tâm Tại SCANMS
            </h3>
            <p className="text-xs text-[#7D715E] mt-1 mb-5">
              Quyền lợi bảo vệ tối đa cho khách hàng mua sắm qua liên kết tiếp thị Creator.
            </p>

            <div className="space-y-3.5 text-xs text-[#1A1612]">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-bold">100% Hàng Chính Hãng & Kiểm Định Nguồn Gốc</strong>
                  <span className="text-[#7D715E] mt-0.5 block leading-relaxed">
                    Tất cả gian hàng hợp tác trên SCANMS đều phải nộp giấy phép kinh doanh và chứng nhận công bố sản phẩm trước khi phân phối.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-bold">Đồng Kiểm & Bảo Hộ Đổi Trả 14 Ngày</strong>
                  <span className="text-[#7D715E] mt-0.5 block leading-relaxed">
                    Khách hàng được quyền mở hộp kiểm tra ngoại quan cùng bưu tá khi nhận hàng và đổi trả miễn phí trong 14 ngày nếu có lỗi từ nhà sản xuất.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-bold">Ưu Đãi Độc Quyền Trừ Thẳng Vào Đơn</strong>
                  <span className="text-[#7D715E] mt-0.5 block leading-relaxed">
                    Mã voucher từ các Nhà sáng tạo (KOL) được trừ trực tiếp vào hóa đơn thanh toán COD hoặc VietQR, minh bạch và không phát sinh phụ phí.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
            >
              Tôi đã hiểu
            </button>
          </div>
        </div>
      )}

      {activeCheckoutProduct && (
        <GuestCheckoutModal
          isOpen={true}
          onClose={() => setActiveCheckoutProduct(null)}
          product={activeCheckoutProduct.product}
          store={activeCheckoutProduct.store}
          initialCouponCode={activeCheckoutProduct.couponCode}
          onOrderPlaced={(order) => {
            toast.success(`Đặt hàng thành công! Mã đơn: ${order?.publicOrderCode || order?.orderId}`);
          }}
        />
      )}
    </div>
  );
}
