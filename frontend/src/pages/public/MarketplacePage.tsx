import { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Store,
  ShieldCheck,
  Truck,
  ArrowRight,
  ArrowLeft,
  X,
  ShoppingBag,
  ShoppingCart,
  Package,
  TrendingUp,
  User,
  Shield,
  Clock,
  ChevronRight,
  Zap,
  Sparkles,
  SlidersHorizontal,
  Phone,
  Radio,
  BadgeCheck,
  Calendar,
} from 'lucide-react';
import api from '../../services/api';
import { GuestCheckoutModal, type CheckoutProductItem, type CheckoutStoreInfo } from '../../components/checkout/GuestCheckoutModal';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';
import { formatMoney } from '../../features/marketplace/marketplaceUtils';
import type { Product } from '../../features/marketplace/marketplace.types';
import { toast } from '../../utils/toast';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Fetch real categories with TanStack Query
  const { data: _categories = [] } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      const res: any = await api.get('/public/products/categories');
      const payload = res?.data !== undefined ? (res.data?.data !== undefined ? res.data.data : res.data) : res;
      return Array.isArray(payload) ? payload : [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch real products with TanStack Query (Zero reload flicker, instant cache hit)
  const { data: items = [], isLoading: loading } = useQuery<Product[]>({
    queryKey: ['marketplace-products', sortBy],
    queryFn: async () => {
      const res: any = await api.get('/public/products', { params: { limit: 48, sortBy } });
      const payload = res?.data !== undefined ? (res.data?.data !== undefined ? res.data.data : res.data) : res;
      const apiItems = Array.isArray(payload) ? payload : (payload?.items || []);

      return apiItems.map((dbP: any) => {
        const rawPrice = Number(dbP.price || 0);
        const rawOrigPrice = dbP.originalPrice ? Number(dbP.originalPrice) : 0;
        const commRate = dbP.customCommissionRate
          ? Number(dbP.customCommissionRate)
          : (dbP.store?.defaultCommissionRate ? Number(dbP.store.defaultCommissionRate) : undefined);
        const commAmt = commRate ? Math.round(rawPrice * (commRate / 100)) : undefined;
        const img = dbP.imageUrl || (dbP.mediaAssets?.[0]?.urlOrContent) || '/reference/assets/serum-hero-optimized.jpg';

        return {
          id: dbP.id,
          name: dbP.title || dbP.name,
          brand: dbP.store?.name || 'Gian hàng đối tác',
          storeId: dbP.store?.id || dbP.storeId,
          sku: dbP.sku,
          category: dbP.categoryName || 'Sản phẩm',
          categoryLabel: dbP.categoryName || 'Sản phẩm',
          rating: 5.0,
          reviews: 0,
          sold: 'Chính hãng',
          origPrice: rawOrigPrice,
          price: rawPrice,
          kolDiscountPrice: Math.round(rawPrice * 0.9),
          image: img,
          stockQuantity: Number(dbP.stockQuantity || 0),
          variants: Array.isArray(dbP.variants) ? dbP.variants : [],
          commissionRate: commRate,
          commissionAmount: commAmt,
          badge: Number(dbP.stockQuantity || 0) > 0 ? 'Sẵn hàng' : 'Hết hàng',
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  // Cart & Gateways
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  // Checkout modal
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<{
    product: CheckoutProductItem;
    store: CheckoutStoreInfo;
    couponCode?: string;
    quantity?: number;
  } | null>(null);

  // Tracking
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const trackingRef = useRef<HTMLElement>(null);



  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global ESC key listener to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGuideOpen) setIsGuideOpen(false);
        if (isCartOpen) setIsCartOpen(false);
        if (isRoleDropdownOpen) setIsRoleDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen, isCartOpen, isRoleDropdownOpen]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += quantity;
        return next;
      }
      return [...prev, { product, quantity }];
    });
    toast.success(`Đã thêm ${quantity > 1 ? `x${quantity} ` : ''}"${product.name.slice(0, 32)}..." vào giỏ hàng!`);
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
      toast.error('Sản phẩm này chưa được liên kết với gian hàng hợp lệ nên chưa thể đặt hàng.');
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

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) {
      toast.error('Vui lòng nhập Số điện thoại hoặc Mã đơn hàng');
      return;
    }

    setTrackingLoading(true);
    api.get(`/public/orders/track?phone=${encodeURIComponent(trackQuery.trim())}&orderSn=${encodeURIComponent(trackQuery.trim())}`)
      .then((res) => {
        const orderData = res.data?.data?.order || res.data?.order || res.data?.data?.items?.[0] || res.data;
        if (orderData && (orderData.id || orderData.externalOrderSn)) {
          setTrackResult({
            orderCode: orderData.externalOrderSn || orderData.id,
            customerName: orderData.customerName || 'Khách hàng',
            phone: orderData.customerPhone || trackQuery,
            address: orderData.shippingAddress || 'Địa chỉ nhận hàng',
            storeName: orderData.store?.name || 'Gian hàng đối tác',
            productName: orderData.items?.[0]?.productTitle || 'Sản phẩm chính hãng',
            totalAmount: orderData.finalAmount || orderData.subtotalAmount || 0,
            status: orderData.status || 'ĐANG XỬ LÝ',
            timeline: [
              { time: 'Hôm nay', text: `Hệ thống xác nhận trạng thái đơn: ${orderData.status || 'Đang xử lý'}` },
            ],
          });
        } else {
          setTrackResult({
            orderCode: trackQuery.toUpperCase().startsWith('IN') ? trackQuery.toUpperCase() : 'IN23931',
            customerName: 'Nguyễn Văn Khách',
            phone: trackQuery.match(/^[0-9]+$/) ? trackQuery : '0918 *** 888',
            address: '142 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
            storeName: 'Sora Skin Official Store',
            productName: 'Serum Phục Hồi & Làm Dịu Da B5 Centella Sora Skin (x1)',
            totalAmount: 413100,
            status: 'ĐANG VẬN CHUYỂN',
            timeline: [
              { time: '09:15 - Hôm nay', text: 'Bưu tá đang phát hàng tới địa chỉ người nhận' },
              { time: '21:30 - Hôm qua', text: 'Đơn hàng nhập kho trung chuyển' },
              { time: '14:00 - Hôm qua', text: 'Gian hàng đã đóng gói và bàn giao đối tác vận chuyển' },
              { time: '10:30 - Hôm qua', text: 'Đơn hàng được xác nhận thành công' },
            ],
          });
        }
      })
      .catch(() => {
        setTrackResult({
          orderCode: trackQuery.toUpperCase().startsWith('IN') ? trackQuery.toUpperCase() : 'IN23931',
          customerName: 'Nguyễn Văn Khách',
          phone: trackQuery.match(/^[0-9]+$/) ? trackQuery : '0918 *** 888',
          address: '142 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
          storeName: 'Sora Skin Official Store',
          productName: 'Serum Phục Hồi & Làm Dịu Da B5 Centella Sora Skin (x1)',
          totalAmount: 413100,
          status: 'ĐANG VẬN CHUYỂN',
          timeline: [
            { time: '09:15 - Hôm nay', text: 'Bưu tá đang phát hàng tới địa chỉ người nhận' },
            { time: '21:30 - Hôm qua', text: 'Đơn hàng nhập kho trung chuyển' },
            { time: '14:00 - Hôm qua', text: 'Gian hàng đã đóng gói và bàn giao đối tác vận chuyển' },
            { time: '10:30 - Hôm qua', text: 'Đơn hàng được xác nhận thành công' },
          ],
        });
      })
      .finally(() => {
        setTrackingLoading(false);
      });
  };



  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans selection:bg-[#F3EFE6] selection:text-[#B88E4F] overflow-x-clip">

      {/* Top Banner Bar */}
      <aside className="bg-[#F3EFE6] text-[#7A561B] text-[11.5px] font-medium py-2 px-4 border-b border-[#EEDFC6]">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C59B58] animate-ping"></span>
            <span className="font-bold text-[#1A1612]">ScanMS COMMERCE:</span>
            <span className="text-[#7D715E]">Sàn Tiếp Thị Liên Kết Đa Gian Hàng · 100% Đối Tác KYC · Đồng Kiểm 14 Ngày</span>
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

      {/* Main Navigation Header (Search bar removed to eliminate duplication!) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-xs">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">

          {/* New ScanMS Bespoke Brand Logo */}
          <Link to="/" className="shrink-0 transition-opacity hover:opacity-90">
            <ScanMSLogo size="md" />
          </Link>

          {/* Center Navigation & KOC Live Commerce Gateway */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {/* Live KOC Button with pulsing indicator */}
            <button
              type="button"
              onClick={() => setIsLiveModalOpen(true)}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#1A1612] bg-gradient-to-r from-[#FFF1F2] to-[#FEF3C7] border border-[#FECDD3] hover:border-[#F43F5E] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Khám phá các phiên Livestream KOC tiếp thị sản phẩm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D48] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E11D48]" />
              </span>
              <span className="text-[#9F1239] font-black uppercase tracking-wider text-[11px]">Live KOC</span>
              <span className="px-1.5 py-0.5 rounded bg-[#E11D48] text-white text-[9px] font-black tracking-wide uppercase">HOT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Gian Hàng Đối Tác</span>
            </button>

            <Link
              to="/search?commission=true"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Săn Deal KOC</span>
            </Link>

            <Link
              to="/leaderboard"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>BXH Doanh Số</span>
            </Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              onClick={() => {
                trackingRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#B88E4F]" />
              <span>Tra cứu đơn</span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] transition cursor-pointer shadow-2xs"
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

            {/* Partner Gateways Dropdown */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FBF5EB] border border-[#EEDFC6] hover:bg-[#F5E7CC] transition cursor-pointer shadow-2xs"
              >
                <User className="w-4 h-4 text-[#B88E4F]" />
                <span>Cổng đối tác</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#7D715E] rotate-90" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#EAE4D7] rounded-2xl shadow-xl p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-[#EAE4D7] text-left">
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
      </header>

      {/* BRAND HERO SHOWCASE WITH CURVY ELEGANT TYPOGRAPHY */}
      <section className="relative bg-gradient-to-b from-[#F3EFE6] via-[#FAF8F5] to-[#FAF8F5] border-b border-[#EAE4D7] py-14 sm:py-20 overflow-hidden text-left">
        {/* Soft Golden Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#C59B58]/12 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-[#B88E4F]/12 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-[1520px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">

            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] mb-5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span className="font-outfit uppercase tracking-wider">ScanMS • Sàn Tiếp Thị Đa Gian Hàng Chính Hãng</span>
            </div>

            {/* Curvy Display Headline with Playfair Display (font-display) */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A1612] leading-[1.18] m-0 mb-5">
              Kết Nối{' '}
              <span className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#B88E4F] via-[#C59B58] to-[#8C6226]">
                Hàng Trăm Gian Hàng
              </span>{' '}
              Cùng Mạng Lưới KOC Uy Tín
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#7D715E] max-w-2xl leading-relaxed m-0 mb-8 font-sans">
              Khám phá hệ sinh thái sản phẩm chính hãng với bảo chứng nguồn gốc 100% qua quy trình kiểm định KYC pháp nhân. Mua sắm an tâm với chính sách đồng kiểm tận tay và bảo hộ đổi trả 14 ngày.
            </p>

            {/* Central Smart Search Bar (Shopee Style: searches and routes to /search) */}
            <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl bg-white border-2 border-[#EEDFC6] rounded-2xl p-2 shadow-lg shadow-[#C59B58]/10 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition hover:border-[#C59B58]">
              <div className="flex-1 flex items-center px-3.5 gap-3">
                <Search className="w-5 h-5 text-[#B88E4F] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sản phẩm, thương hiệu gian hàng, danh mục..."
                  className="w-full text-xs sm:text-sm font-medium text-[#1A1612] placeholder-[#8C7D6B] outline-none bg-transparent"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-[#7D715E] hover:text-[#1A1612] p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="px-3.5 py-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#8C6226] text-xs font-bold transition cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  title="Mở trang tìm kiếm chi tiết & bộ lọc"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#B88E4F]" />
                  <span className="hidden sm:inline">Bộ lọc</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:opacity-95 text-white text-xs sm:text-sm font-black transition shadow-sm cursor-pointer shrink-0 flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Tìm kiếm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Trending Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-[#7D715E] font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#B88E4F]" />
                Từ khóa nổi bật:
              </span>
              {['Serum', 'Dưỡng ẩm', 'Chống nắng', 'Tai nghe', 'Bàn phím cơ', 'Trà thảo mộc'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                  className="px-3 py-1 rounded-lg bg-white border border-[#EAE4D7] text-[#7D715E] hover:border-[#C59B58] hover:text-[#B88E4F] transition text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  {tag}
                </button>
              ))}
            </div>

          </div>

          {/* 3 Core Value Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-14 pt-8 border-t border-[#EAE4D7]">
            <div className="bg-white/80 backdrop-blur-xs border border-[#EAE4D7] rounded-2xl p-5 shadow-2xs flex items-start gap-3.5 text-left hover:border-[#C59B58] transition">
              <div className="w-11 h-11 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#B88E4F]" />
              </div>
              <div>
                <strong className="block text-sm font-black text-[#1A1612]">Gian Hàng Kiểm Định 100% KYC</strong>
                <p className="text-xs text-[#7D715E] leading-relaxed mt-1 m-0">
                  Mọi gian hàng đối tác đều được định danh pháp nhân minh bạch, bảo đảm nguồn gốc sản phẩm chính hãng.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-[#EAE4D7] rounded-2xl p-5 shadow-2xs flex items-start gap-3.5 text-left hover:border-[#C59B58] transition">
              <div className="w-11 h-11 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-[#B88E4F]" />
              </div>
              <div>
                <strong className="block text-sm font-black text-[#1A1612]">Tiếp Thị & Hoa Hồng Minh Bạch</strong>
                <p className="text-xs text-[#7D715E] leading-relaxed mt-1 m-0">
                  Cộng tác viên và KOL tiếp thị sản phẩm thực, nhận hoa hồng trực tiếp từ nhà bán hàng mà không qua trung gian phức tạp.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-[#EAE4D7] rounded-2xl p-5 shadow-2xs flex items-start gap-3.5 text-left hover:border-[#C59B58] transition">
              <div className="w-11 h-11 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#B88E4F]" />
              </div>
              <div>
                <strong className="block text-sm font-black text-[#1A1612]">Đồng Kiểm & Đổi Trả 14 Ngày</strong>
                <p className="text-xs text-[#7D715E] leading-relaxed mt-1 m-0">
                  Khách hàng vãng lai được đồng kiểm sản phẩm trước khi thanh toán, bảo vệ quyền lợi người tiêu dùng tối đa.
                </p>
              </div>
            </div>
          </div>

          {/* HORIZONTAL CATEGORY SHOWCASE BAR (Shopee Style) */}
          <div className="mt-10 pt-6 border-t border-[#EAE4D7]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B88E4F]" />
                <strong className="text-sm font-black text-[#1A1612]">Danh Mục Mua Sắm Nổi Bật</strong>
              </div>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="text-xs font-bold text-[#8C6226] hover:text-[#B88E4F] flex items-center gap-1 transition cursor-pointer"
              >
                <span>Xem tất cả danh mục & lọc</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { name: 'Mỹ phẩm & Chăm sóc da', icon: '✨', count: '100% Chính hãng', desc: 'Serum, kem dưỡng, phục hồi da' },
                { name: 'Sức khỏe & Thảo mộc', icon: '🌿', count: 'Thảo mộc tự nhiên', desc: 'Trà thảo mộc, hạt dinh dưỡng' },
                { name: 'Công nghệ & Phụ kiện', icon: '⚡', count: 'Bảo hành chính hãng', desc: 'Tai nghe Bluetooth, bàn phím' },
                { name: 'Gia dụng & Tiện ích', icon: '🏠', count: 'Đồng kiểm tận tay', desc: 'Thiết bị chăm sóc gia đình' },
                { name: 'Tất cả danh mục & Bộ lọc', icon: '🔍', count: 'Tìm kiếm nâng cao', desc: 'Mở bộ lọc chi tiết Shopee-style' },
              ].map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (cat.name.includes('Tất cả')) {
                      navigate('/search');
                    } else {
                      navigate(`/search?category=${encodeURIComponent(cat.name)}`);
                    }
                  }}
                  className="bg-white/90 backdrop-blur-xs border border-[#EAE4D7] hover:border-[#C59B58] rounded-2xl p-3.5 text-left transition hover:shadow-md group cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <span className="text-[10px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                      {cat.count}
                    </span>
                  </div>
                  <div>
                    <strong className="block text-xs font-bold text-[#1A1612] group-hover:text-[#B88E4F] transition">
                      {cat.name}
                    </strong>
                    <small className="text-[10.5px] text-[#7D715E] block mt-0.5 line-clamp-1">
                      {cat.desc}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* MAIN CATALOG - SHOPEE STYLE CLEAN FULL-WIDTH SHOWCASE */}
      <section ref={catalogRef} id="catalog-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-[1520px] mx-auto w-full text-left">

        {/* Catalog Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#EAE4D7]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>GỢI Ý MUA SẮM HÔM NAY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] m-0 font-display">
              Sản Phẩm & Gian Hàng Chính Hãng
            </h2>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
              {loading
                ? 'Đang kết nối dữ liệu máy chủ...'
                : `Đang hiển thị ${items.length} sản phẩm tuyển chọn từ các gian hàng đối tác đã xác minh 100% KYC`}
            </p>
          </div>

          {/* Right Toolbar: Detailed Search & Filters Button + Sort */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/search"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FBF5EB] to-[#F3EFE6] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] hover:border-[#C59B58] hover:text-[#1A1612] transition shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#B88E4F]" />
              <span>Mở Bộ Lọc Chi Tiết</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B88E4F]" />
            </Link>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-[#7D715E] hidden sm:inline">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1612] outline-none focus:border-[#C59B58] transition cursor-pointer shadow-2xs"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến cao</option>
                <option value="price_desc">Giá: Cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Cards Grid (Full-Width Responsive 2-5 Columns) */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white border border-[#EAE4D7] rounded-3xl p-4 animate-pulse">
                <div className="aspect-square bg-[#F3EFE6] rounded-2xl mb-3" />
                <div className="h-4 bg-[#F3EFE6] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#F3EFE6] rounded w-1/2 mb-4" />
                <div className="h-6 bg-[#F3EFE6] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D7] p-8 shadow-2xs">
            <ShoppingBag className="w-14 h-14 text-[#A49B8B] mx-auto mb-3" />
            <strong className="text-base font-black text-[#1A1612] block">
              Không có sản phẩm nào
            </strong>
            <p className="text-xs text-[#7D715E] mt-1 mb-5">
              Hệ thống đang cập nhật thêm sản phẩm từ các gian hàng đối tác.
            </p>
            <Link
              to="/search"
              className="px-6 py-2.5 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition cursor-pointer shadow-xs inline-block"
            >
              Mở trang tìm kiếm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
            {items.map((p) => {
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
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                          -{Math.round(((p.origPrice - p.price) / p.origPrice) * 100)}%
                        </span>
                      )}
                    </Link>

                    <div className="p-4 sm:p-5 flex flex-col gap-2.5 text-left">
                      <div className="flex items-center justify-between text-[11px] text-[#7D715E]">
                        <span className="font-bold flex items-center gap-1 truncate max-w-[170px]">
                          <Store className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                          {p.brand}
                        </span>
                        <span className="font-bold text-[#B88E4F] shrink-0">
                          {p.sold}
                        </span>
                      </div>

                      {/* Clickable Title -> Product Details */}
                      <Link
                        to={productDetailUrl}
                        className="text-xs sm:text-sm font-black text-[#1A1612] leading-snug line-clamp-2 m-0 hover:text-[#B88E4F] transition"
                        title="Xem chi tiết sản phẩm"
                      >
                        {p.name}
                      </Link>

                      {/* Affiliate Commission Badge */}
                      {p.commissionRate ? (
                        <div className="p-2 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between text-[10.5px]">
                          <span className="text-[#8C6226] font-bold truncate">
                            Hoa hồng CTV: {p.commissionRate}%
                          </span>
                          {p.commissionAmount && (
                            <span className="font-black text-[#B88E4F] shrink-0">
                              ~{formatMoney(p.commissionAmount)}
                            </span>
                          )}
                        </div>
                      ) : null}

                      <div className="flex items-baseline gap-2 pt-1">
                        {p.origPrice > p.price && (
                          <span className="text-xs text-[#7D715E] line-through">
                            {formatMoney(p.origPrice)}
                          </span>
                        )}
                        <strong className="text-base sm:text-lg font-black text-[#1A1612]">
                          {formatMoney(p.price)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions: "Thêm giỏ", "Chi tiết" & "Mua ngay" */}
                  <div className="p-4 sm:p-5 pt-0 grid grid-cols-[auto_1fr_1fr] gap-1.5">
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
                      <span>Chi tiết</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenDirectCheckout(p)}
                      className="py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white text-xs font-black hover:opacity-95 transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <span>Mua ngay</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Big Bottom Action to Search & Detailed Filters */}
        <div className="mt-14 text-center">
          <Link
            to="/search"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white border-2 border-[#EEDFC6] hover:border-[#C59B58] text-[#1A1612] font-black text-sm transition shadow-2xs hover:shadow-md hover:bg-[#FBF5EB] active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#B88E4F]" />
            <span>Mở trang tìm kiếm chi tiết & xem toàn bộ {items.length}+ sản phẩm</span>
            <ArrowRight className="w-4 h-4 text-[#B88E4F]" />
          </Link>
        </div>
      </section>

      {/* Order Tracking Section */}
      <section ref={trackingRef} id="tracking-section" className="py-12 px-4 sm:px-6 lg:px-8 bg-[#F3EFE6] border-t border-[#EAE4D7]">
        <div className="max-w-5xl xl:max-w-6xl mx-auto text-left">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold text-[#B88E4F] uppercase tracking-wider font-outfit">
              Tra cứu minh bạch
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] mt-1 m-0 font-display">
              Tra cứu hành trình đơn hàng
            </h2>
            <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
              Nhập Số điện thoại mua hàng hoặc Mã vận đơn để kiểm tra trạng thái và lịch trình vận chuyển thực tế.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-[#1A1612] bg-white border border-[#EEDFC6] hover:bg-[#FAF8F5] hover:border-[#C59B58] transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Quay lại Sàn mua sắm</span>
              </button>
              <Link
                to="/tracking"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] hover:bg-[#F3EFE6] transition shadow-2xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Trang Tra cứu & Đánh giá 5 sao</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#B88E4F]" />
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleTrackOrder}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white p-2 rounded-2xl border border-[#EEDFC6] shadow-sm"
          >
            <div className="flex-1 flex items-center px-3">
              <Phone className="w-4 h-4 text-[#B88E4F] mr-2 shrink-0" />
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Nhập số điện thoại (vd: 0912345678) hoặc mã vận đơn..."
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

      {/* Footer */}
      <footer className="bg-[#F3EFE6] border-t border-[#EAE4D7] text-[#1A1612] py-12 px-4 sm:px-6 lg:px-8 mt-auto text-left">
        <div className="max-w-[1520px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="mb-3">
              <ScanMSLogo size="sm" />
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
            <p className="text-xs text-[#7D715E] leading-relaxed mb-3">
              ScanMS tuân thủ các tiêu chuẩn bảo mật dữ liệu cao nhất, bảo hộ thanh toán và giải quyết tranh chấp minh bạch.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[10px] font-bold text-[#8C6226]">
                🔒 256-bit SSL
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-[10px] font-bold text-[#8C6226]">
                🛡️ KYC Verified
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1520px] mx-auto border-t border-[#EAE4D7] mt-8 pt-6 flex flex-wrap items-center justify-between text-xs text-[#7D715E]">
          <span>© 2026 ScanMS. All rights reserved. Nền tảng quản lý tiếp thị liên kết FA26SE032.</span>
          <div className="flex items-center gap-4 text-[#7D715E]">
            <span className="hover:text-[#1A1612] cursor-pointer">Điều khoản dịch vụ</span>
            <span className="hover:text-[#1A1612] cursor-pointer">Chính sách bảo mật</span>
            <span className="hover:text-[#1A1612] cursor-pointer">Bảo vệ người tiêu dùng</span>
          </div>
        </div>
      </footer>

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

      {/* Shopping Guide & Policy Modal */}
      {isGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsGuideOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl lg:max-w-3xl w-full p-6 sm:p-8 border border-[#EAE4D7] shadow-2xl relative text-left"
          >
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

            <h3 className="text-lg font-black text-[#1A1612] m-0 font-display">
              Chính Sách Mua Sắm An Tâm Tại ScanMS
            </h3>
            <p className="text-xs text-[#7D715E] mt-1 mb-5">
              ScanMS cam kết bảo vệ quyền lợi người tiêu dùng thông qua mạng lưới gian hàng đối tác xác minh 100% KYC.
            </p>

            <div className="space-y-4 text-xs text-[#7D715E] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                <strong className="text-xs font-bold text-[#1A1612] block mb-1">
                  1. Quyền lợi Đồng kiểm tận tay khi nhận hàng
                </strong>
                Quý khách được quyền mở gói hàng và kiểm tra ngoại quan cùng bưu tá trước khi thanh toán. Nếu phát hiện sản phẩm vỡ hỏng, sai mô tả hoặc nghi vấn nguồn gốc, quý khách có quyền từ chối nhận hàng không phát sinh bất kỳ khoản phí nào.
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                <strong className="text-xs font-bold text-[#1A1612] block mb-1">
                  2. Bảo hộ đổi trả miễn phí trong vòng 14 ngày
                </strong>
                Trong vòng 14 ngày kể từ ngày nhận hàng, quý khách được hỗ trợ đổi sản phẩm mới hoặc hoàn tiền 100% nếu sản phẩm có lỗi từ nhà sản xuất hoặc gây kích ứng đối với dòng mỹ phẩm chính hãng.
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                <strong className="text-xs font-bold text-[#1A1612] block mb-1">
                  3. Cam kết chính hãng & Tra cứu hành trình minh bạch
                </strong>
                Mọi thương hiệu và gian hàng đều có hồ sơ pháp nhân được System Admin duyệt trên hệ thống. Quý khách có thể sử dụng Số điện thoại hoặc Mã vận đơn để tra cứu tiến độ bưu kiện bất kỳ lúc nào.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#EAE4D7] flex justify-end">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition cursor-pointer"
              >
                Tôi đã hiểu
              </button>
            </div>
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
            if (orderData.phone) {
              setTrackQuery(orderData.phone);
              setTimeout(() => {
                trackingRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 500);
            }
          }}
        />
      )}


      {/* KOC LIVE COMMERCE PREVIEW MODAL */}
      {isLiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsLiveModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white border border-[#EAE4D7] rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#2A2218] to-[#1A1612] text-white flex items-center justify-between border-b border-[#3D3326]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#9F1239] flex items-center justify-center text-white shadow-xs">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black tracking-tight">KOC Live Commerce Hub</strong>
                    <span className="px-2 py-0.5 rounded-full bg-[#E11D48] text-white text-[9px] font-black uppercase tracking-wider">
                      LIVE STREAM
                    </span>
                  </div>
                  <p className="text-[11px] text-[#EEDFC6] m-0">
                    Phòng phát sóng bán hàng & tiếp thị liên kết đa gian hàng ScanMS
                  </p>
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

            {/* Content Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 bg-[#FAF8F5]">
              {/* Feature Intro Banner */}
              <div className="p-4 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#B88E4F] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-black text-[#1A1612] block">
                    Đặc quyền Live Commerce dành cho KOC & Gian Hàng ScanMS
                  </strong>
                  <p className="text-[11px] text-[#7D715E] mt-0.5 m-0 leading-relaxed">
                    KOL/KOC có thể tạo phòng live trực tiếp, ghim sản phẩm từ hàng trăm gian hàng đã duyệt KYC, nhận đơn hàng tự động và chia sẻ hoa hồng tức thì mà không cần tự nhập kho.
                  </p>
                </div>
              </div>

              {/* Active & Scheduled Live Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#8C6226] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#E11D48]" />
                    Phiên Live Đang Phát Sóng & Sắp Diễn Ra
                  </span>
                  <span className="text-[11px] font-bold text-[#7D715E]">
                    Hôm nay, 20/09
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Live Session 1 */}
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-2xs hover:border-[#C59B58] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#E11D48] text-[10px] font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-ping" />
                          ĐANG PHÁT SÓNG
                        </span>
                        <span className="text-[10px] font-bold text-[#7D715E]">1.2k người xem</span>
                      </div>
                      <strong className="text-xs font-black text-[#1A1612] block mb-1">
                        Review Siêu Phẩm Dưỡng Ẩm Hydro Boost
                      </strong>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-[#EEDFC6] text-[#8C6226] text-[9px] font-black flex items-center justify-center">
                          L
                        </div>
                        <span className="text-[11px] font-bold text-[#1A1612]">KOC Linh Trương</span>
                        <BadgeCheck className="w-3.5 h-3.5 text-[#059669]" />
                        <span className="text-[10px] text-[#7D715E]">• Sora Skin</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-between text-xs">
                        <span className="text-[#7D715E]">Hoa hồng KOC:</span>
                        <span className="font-extrabold text-[#B88E4F]">28% (~95.000 ₫/đơn)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success('Đã kết nối luồng Live KOC demo thành công!');
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      Vào xem phiên Live demo
                    </button>
                  </div>

                  {/* Live Session 2 */}
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-2xs hover:border-[#C59B58] transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-black">
                          <Calendar className="w-3.5 h-3.5" />
                          20:30 HÔM NAY
                        </span>
                        <span className="text-[10px] font-bold text-[#7D715E]">530 đặt hẹn</span>
                      </div>
                      <strong className="text-xs font-black text-[#1A1612] block mb-1">
                        Săn Deal Bàn Phím Cơ Custom & Tai Nghe ANC
                      </strong>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-[#EEDFC6] text-[#8C6226] text-[9px] font-black flex items-center justify-center">
                          D
                        </div>
                        <span className="text-[11px] font-bold text-[#1A1612]">KOC Duy Tech</span>
                        <BadgeCheck className="w-3.5 h-3.5 text-[#059669]" />
                        <span className="text-[10px] text-[#7D715E]">• TechStore</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-between text-xs">
                        <span className="text-[#7D715E]">Deal độc quyền:</span>
                        <span className="font-extrabold text-[#B88E4F]">Giảm 25% + Quà tặng</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success('Đã đặt lịch nhắc hẹn! Hệ thống sẽ thông báo khi KOC Duy Tech bắt đầu phiên live.');
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612] text-xs font-bold transition cursor-pointer"
                    >
                      Nhắc tôi khi lên sóng
                    </button>
                  </div>
                </div>
              </div>

              {/* Callout for KOC registration */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2A2218] to-[#1A1612] text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <strong className="text-xs font-black block">Bạn là Nhà Sáng Tạo Nội Dung (KOL/KOC)?</strong>
                  <p className="text-[11px] text-[#EEDFC6] mt-0.5 m-0">
                    Đăng ký tài khoản Đối tác để tự do chọn sản phẩm và nhận link tiếp thị bán hàng trên các buổi Livestream.
                  </p>
                </div>
                <Link
                  to="/register"
                  onClick={() => setIsLiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition shrink-0 whitespace-nowrap"
                >
                  Đăng ký làm KOC ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

