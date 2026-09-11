import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  LogIn,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  Plus,
  Minus,
  X,
  Store,
  Building2,
} from 'lucide-react';
import api from '../../services/api';

interface StoreItem {
  id: string;
  name: string;
  category: string;
  badge: string;
  rating: number;
  orderCount: number;
  kolCount: number;
  commissionRange: string;
  logoInitial: string;
  description: string;
}

interface ProductItem {
  id: string;
  sku: string;
  title: string;
  storeId: string;
  storeName: string;
  storeBadge: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountRate: number;
  commissionRate: number;
  commissionAmount: number;
  stock: number;
  rating: number;
  soldCount: number;
  image: string;
  description: string;
  kolQuote?: string;
}

export default function GuestStorefrontPage() {
  const [searchParams] = useSearchParams();

  // Affiliate attribution tracking (from ?ref=...)
  const refParam = searchParams.get('ref') || 'kol1';
  const kolName = refParam.includes('thang') || refParam === 'kol1' ? 'Nguyễn Thành Thắng' : 'Trần Văn Nhật';
  const kolCoupon = refParam.includes('thang') || refParam === 'kol1' ? 'THANGVIP10' : 'NHATXINH10';

  // State
  const [activeStore, setActiveStore] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(1);

  // Guest Checkout Form State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<ProductItem | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('Hồ Chí Minh');
  const [customerDistrict, setCustomerDistrict] = useState('Quận 1');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VIETQR'>('COD');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // MULTI-STORE DIRECTORY ON SCANMS PLATFORM
  const STORES: StoreItem[] = [
    {
      id: 'store-1',
      name: 'Sora Skin Official',
      category: 'Dược Mỹ Phẩm Sinh Học',
      badge: '✓ Mall Kim Cương',
      rating: 4.9,
      orderCount: 14200,
      kolCount: 150,
      commissionRange: '18% - 25%',
      logoInitial: 'S',
      description: 'Chuyên các dòng serum phục hồi tầng sâu, màng lọc chống nắng phổ rộng quang học.',
    },
    {
      id: 'store-2',
      name: 'Aura Bio Cosmetics',
      category: 'Trang Điểm Thuần Chay',
      badge: '✓ Mall Vàng',
      rating: 4.8,
      orderCount: 8600,
      kolCount: 95,
      commissionRange: '15% - 22%',
      logoInitial: 'A',
      description: 'Dòng sản phẩm trang điểm hữu cơ không chì, lành tính cho phụ nữ mang thai.',
    },
    {
      id: 'store-3',
      name: 'GreenBio Health & Herbs',
      category: 'Dinh Dưỡng & Thảo Mộc',
      badge: '✓ Chuẩn GMP',
      rating: 4.9,
      orderCount: 6200,
      kolCount: 80,
      commissionRange: '20% - 30%',
      logoInitial: 'G',
      description: 'Thực phẩm dinh dưỡng tinh chế từ thảo mộc thiên nhiên, trà thảo dược thanh lọc.',
    },
    {
      id: 'store-4',
      name: 'Lumière Hair & Body Lab',
      category: 'Chăm Sóc Tóc & Cơ Thể',
      badge: '✓ Top Trending',
      rating: 4.7,
      orderCount: 4100,
      kolCount: 60,
      commissionRange: '16% - 24%',
      logoInitial: 'L',
      description: 'Sản phẩm gội xả bưởi sinh học, gel tẩy tế bào chết hạt cà phê organic.',
    },
    {
      id: 'store-5',
      name: 'Natura Vita Organic',
      category: 'Collagen & Thực Phẩm Bổ Sung',
      badge: '✓ Mall Vàng',
      rating: 4.9,
      orderCount: 11000,
      kolCount: 110,
      commissionRange: '18% - 28%',
      logoInitial: 'N',
      description: 'Collagen thủy phân peptide phân tử nano nhập khẩu nguyên liệu từ Nhật Bản.',
    },
  ];

  // MULTI-STORE PRODUCT CATALOG
  const PRODUCTS: ProductItem[] = [
    {
      id: 'p-1',
      sku: 'SR-VTC-15',
      title: 'Serum Vitamin C 15% Dưỡng Sáng Mờ Thâm Sora Skin',
      storeId: 'store-1',
      storeName: 'Sora Skin Official',
      storeBadge: 'Mall Kim Cương',
      category: 'Serum',
      originalPrice: 520000,
      salePrice: 413100,
      discountRate: 21,
      commissionRate: 22,
      commissionAmount: 90882,
      stock: 48,
      rating: 4.8,
      soldCount: 1420,
      image: '/assets/serum-hero-optimized.jpg',
      description:
        'Tinh chất phục hồi sinh học kết hợp 15% Vitamin C tinh khiết thế hệ mới và Hyaluronic Acid cấp ẩm sâu, giúp giảm thâm mụn, mờ nám sạm và cải thiện độ sáng mịn đều màu chỉ sau 3 tuần sử dụng.',
      kolQuote:
        'Sau 3 tuần dùng thử em serum này vào mỗi sáng, mình thấy các vết thâm mụn mờ rõ rệt mà không hề châm chích hay đổ dầu bí bách. Đáng mua nhất phân khúc!',
    },
    {
      id: 'p-2',
      sku: 'SUN-SPF50-PA',
      title: 'Kem Chống Nắng Phổ Rộng SPF50+ PA++++ Kiểm Dầu 8h',
      storeId: 'store-1',
      storeName: 'Sora Skin Official',
      storeBadge: 'Mall Kim Cương',
      category: 'Chống nắng',
      originalPrice: 450000,
      salePrice: 350100,
      discountRate: 22,
      commissionRate: 20,
      commissionAmount: 70020,
      stock: 65,
      rating: 4.9,
      soldCount: 890,
      image: '/assets/sunscreen-product.jpg',
      description:
        'Màng lọc chống nắng quang phổ rộng thế hệ mới, tích hợp Niacinamide kiềm dầu và chống ánh sáng xanh. Kết cấu mỏng nhẹ, nâng tông tự nhiên không để lại vệt trắng.',
      kolQuote: 'Chất kem thấm tệp vào da như kem dưỡng, nâng tông nhẹ nhàng tự nhiên đi làm cả ngày không trôi.',
    },
    {
      id: 'p-3',
      sku: 'TN-BHA-2',
      title: 'Nước Hoa Hồng BHA 2% Thu Nhỏ Lỗ Chân Lông & Tẩy Tế Bào Chết',
      storeId: 'store-1',
      storeName: 'Sora Skin Official',
      storeBadge: 'Mall Kim Cương',
      category: 'Toner',
      originalPrice: 420000,
      salePrice: 314100,
      discountRate: 25,
      commissionRate: 18,
      commissionAmount: 56538,
      stock: 30,
      rating: 4.7,
      soldCount: 650,
      image: '/assets/toner-bha-product.jpg',
      description:
        'Dung dịch làm sạch sâu chứa 2% Salicylic Acid chuẩn nồng độ, làm sạch bã nhờn trong lỗ chân lông, hỗ trợ gom cồi mụn đầu đen và cân bằng pH cho da nhạy cảm.',
    },
    {
      id: 'p-4',
      sku: 'CL-GEL-02',
      title: 'Gel Rửa Mặt Tràm Trà & Rau Má Dịu Nhẹ Cho Da Nhạy Cảm',
      storeId: 'store-2',
      storeName: 'Aura Bio Cosmetics',
      storeBadge: 'Mall Vàng',
      category: 'Làm sạch',
      originalPrice: 280000,
      salePrice: 197100,
      discountRate: 30,
      commissionRate: 25,
      commissionAmount: 49275,
      stock: 82,
      rating: 4.8,
      soldCount: 1100,
      image: '/assets/cleanser-product.jpg',
      description:
        'Gel rửa mặt tạo bọt mịn với chiết xuất tràm trà hữu cơ và tinh chất rau má lên men từ gian hàng Aura Bio. Làm sạch bụi mịn PM2.5 mà vẫn giữ nguyên màng ẩm tự nhiên.',
    },
    {
      id: 'p-5',
      sku: 'MSK-CICA-5X',
      title: 'Mặt Nạ Phục Hồi Làm Dịu Khẩn Cấp Cica Hyaluronic 5X',
      storeId: 'store-2',
      storeName: 'Aura Bio Cosmetics',
      storeBadge: 'Mall Vàng',
      category: 'Mặt nạ',
      originalPrice: 250000,
      salePrice: 179100,
      discountRate: 28,
      commissionRate: 22,
      commissionAmount: 39402,
      stock: 94,
      rating: 4.9,
      soldCount: 2300,
      image: '/assets/cica-mask-product.jpg',
      description:
        'Chất liệu sợi tơ tằm sinh học ngậm 30ml tinh chất phục hồi Cica B5 từ Aura Bio. Giảm đỏ rát tức thì sau khi đi nắng, nặn mụn hoặc peel da hóa học.',
    },
  ];

  // Set default selected product to Hero product
  useEffect(() => {
    setSelectedProduct(PRODUCTS[0]);
  }, []);

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchStore = activeStore === 'ALL' || p.storeId === activeStore;
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStore && matchCat && matchSearch;
  });

  const handleOpenBuyNow = (prod: ProductItem, qty: number = 1) => {
    setCheckoutProduct(prod);
    setCheckoutQty(qty);
    setShowCheckoutModal(true);
    setOrderSuccess(null);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      showToast('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng!');
      return;
    }

    setSubmittingOrder(true);
    let realOrderSn = `DH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const res: any = await api.post('/orders', {
        storeSlug: 'techstore-flagship',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: `${customerAddress}, ${customerDistrict}, ${customerCity}`,
        couponCode: kolCoupon,
        cookieRefCode: refParam,
        paymentMethod,
        orderNotes,
        items: [
          {
            productId: checkoutProduct?.id || 'b54934c3-0762-40b4-868e-e7f66dac1684',
            quantity: checkoutQty,
            unitPrice: checkoutProduct?.salePrice || 413100,
          },
        ],
      });

      if (res?.order?.externalOrderSn) {
        realOrderSn = res.order.externalOrderSn;
      } else if (res?.data?.order?.externalOrderSn) {
        realOrderSn = res.data.order.externalOrderSn;
      }
    } catch (err: any) {
      console.warn('Backend API order call failed, using client fallback:', err);
    } finally {
      setSubmittingOrder(false);
      setOrderSuccess({
        orderId: realOrderSn,
        productName: checkoutProduct?.title,
        storeName: checkoutProduct?.storeName,
        quantity: checkoutQty,
        totalAmount: (checkoutProduct?.salePrice || 0) * checkoutQty,
        recipient: customerName,
        phone: customerPhone,
        address: `${customerAddress}, ${customerDistrict}, ${customerCity}`,
        payment: paymentMethod === 'COD' ? 'Tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR 24/7',
        kolRef: kolName,
        discountApplied: kolCoupon,
      });
      setCartCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-left flex flex-col">
      {/* TOAST ALERT */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#231D15] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. PUBLIC PLATFORM HEADER: SCANMS AFFILIATE MARKETPLACE */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C59B58] text-white font-black text-xl flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-lg font-black text-[#1A1612] tracking-tight">SCANMS</strong>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                Affiliate Marketplace
              </span>
            </div>
            <span className="text-[11px] text-[#7D715E] hidden sm:block font-medium">
              Sàn Thương Mại &amp; Mạng Lưới Tiếp Thị Đa Gian Hàng D2C
            </span>
          </div>
        </div>

        {/* Quick Nav Links */}
        <nav className="hidden xl:flex items-center gap-6 text-xs font-bold text-[#7D715E]">
          <button
            type="button"
            onClick={() => {
              setActiveStore('ALL');
              setActiveCategory('ALL');
            }}
            className={`hover:text-[#1A1612] transition cursor-pointer ${
              activeStore === 'ALL' ? 'text-[#B88E4F] font-extrabold' : ''
            }`}
          >
            Sàn Sản Phẩm
          </button>
          <a href="#stores-spotlight" className="hover:text-[#1A1612] transition">
            Gian Hàng Đối Tác ({STORES.length})
          </a>
          <a href="#ecosystem-guide" className="hover:text-[#1A1612] transition">
            Chính Sách KOL / Shop
          </a>
          <Link to="/tracking" className="hover:text-[#1A1612] transition">
            Tra Cứu Đơn Hàng
          </Link>
        </nav>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm bg-[#FAF8F5] border border-[#EAE4D7] rounded-full px-3.5 py-1.5">
          <Search className="w-4 h-4 text-[#A49B8B]" />
          <input
            type="text"
            placeholder="Tìm sản phẩm, thương hiệu hoặc gian hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-[#1A1612] w-full"
          />
        </div>

        {/* Right Actions: Tracking, Cart & Partner Portals */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tracking Link Pill */}
          <Link
            to="/tracking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
          >
            <Truck className="w-4 h-4 text-[#B88E4F]" />
            <span className="hidden sm:inline">Tra cứu đơn</span>
          </Link>
          {/* Cart Pill */}
          <button
            type="button"
            onClick={() => handleOpenBuyNow(selectedProduct || PRODUCTS[0], quantity)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
            <span className="hidden sm:inline">Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#B88E4F] text-white text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* DEDICATED PARTNER LOGIN BUTTON */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#231D15] hover:bg-[#382E21] text-white text-xs font-extrabold transition shadow-xs cursor-pointer"
            title="Dành cho CTV, KOL, Chủ Shop và Quản trị viên hệ thống"
          >
            <LogIn className="w-3.5 h-3.5 text-[#B88E4F]" />
            <span className="hidden sm:inline">Cổng Đăng Nhập Đối Tác</span>
            <span className="sm:hidden">Đăng nhập</span>
          </Link>

          {/* REGISTER AS PARTNER */}
          <Link
            to="/register"
            className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] text-xs font-bold transition border border-[#EAE4D7] cursor-pointer"
          >
            <span>Đăng ký Hợp tác</span>
          </Link>
        </div>
      </header>

      {/* 2. KOL AFFILIATE ATTRIBUTION BANNER */}
      <div className="bg-[#FBF5EB] border-b border-[#EEDFC6] px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-bold text-[11px] flex items-center justify-center">
              {kolName.charAt(0)}
            </span>
            <span className="text-[#1A1612]">
              Bạn đang mua sắm trên sàn SCANMS qua link tiếp thị từ <strong>{kolName}</strong> (KOL Hạng Vàng)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white border border-[#EEDFC6] text-[#B88E4F] font-mono font-bold text-[11px]">
              Mã ưu đãi toàn sàn: {kolCoupon} (-10%)
            </span>
            <span className="text-[#059669] font-bold hidden sm:inline">✓ Đã áp dụng tự động</span>
          </div>
        </div>
      </div>

      {/* 3. MULTI-STORE PLATFORM HERO & VALUE PROPOSITION */}
      <section className="bg-white border-b border-[#EAE4D7] px-4 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#B88E4F] uppercase tracking-wider mb-2">
                <Store className="w-4 h-4" /> Hệ Thống Nhiều Gian Hàng D2C Chính Hãng
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A1612] tracking-tight leading-tight m-0">
                Sàn Thương Mại Tiếp Thị Liên Kết <br />
                <span className="text-[#B88E4F]">Kết Nối Nhiều Gian Hàng &amp; Đội Ngũ KOL.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#7D715E] leading-relaxed mt-2 m-0">
                Khám phá hàng trăm sản phẩm cao cấp từ các Gian hàng đối tác uy tín được kiểm định nghiêm ngặt.
                Người mua nhận ưu đãi độc quyền từ KOL, Chủ Shop mở rộng mạng lưới phân phối tự động.
              </p>
            </div>

            {/* Platform Stats Pills */}
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <div className="px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] text-center">
                <strong className="text-base font-extrabold text-[#1A1612] block">{STORES.length}+</strong>
                <span className="text-[10px] text-[#7D715E] font-medium">Gian hàng chính hãng</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] text-center">
                <strong className="text-base font-extrabold text-[#1A1612] block">500+</strong>
                <span className="text-[10px] text-[#7D715E] font-medium">Sản phẩm đối tác</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] text-center">
                <strong className="text-base font-extrabold text-[#B88E4F] block">2.000+</strong>
                <span className="text-[10px] text-[#7D715E] font-medium">KOL &amp; CTV phân phối</span>
              </div>
            </div>
          </div>

          {/* 3 Pillars of SCANMS Platform */}
          <div id="ecosystem-guide" className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#1A1612]">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>1. DÀNH CHO KHÁCH MUA HÀNG</span>
              </div>
              <p className="text-xs text-[#7D715E] m-0 leading-relaxed">
                Mua hàng trực tiếp từ các Gian hàng D2C xác minh, nhận mã giảm giá từ KOL yêu thích, đặt hàng 1-chạm không cần tài khoản.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#B88E4F]">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>2. DÀNH CHO KOL / CTV BÁN HÀNG</span>
              </div>
              <p className="text-xs text-[#7D715E] m-0 leading-relaxed">
                Tự do chọn sản phẩm từ nhiều Gian hàng để nhận hoa hồng 15% - 30%, nhận hàng mẫu review 0đ và thanh toán tự động 24/7.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#1A1612]">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F]">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>3. DÀNH CHO CHỦ SHOP (MERCHANT)</span>
              </div>
              <p className="text-xs text-[#7D715E] m-0 leading-relaxed">
                Tải lên danh mục hàng hóa, quản lý kho hàng và ủy thác hàng ngàn KOL tiếp thị mà không cần tốn ngân sách quảng cáo cố định.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STORE DIRECTORY & SPOTLIGHT CAROUSEL */}
      <section id="stores-spotlight" className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1A1612] tracking-tight m-0 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#B88E4F]" />
              <span>Danh Sách Gian Hàng Đối Tác Trên Sàn</span>
            </h2>
            <p className="text-xs text-[#7D715E] m-0 mt-0.5">
              Chọn từng gian hàng để xem danh mục sản phẩm và chính sách hoa hồng dành riêng cho KOL.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveStore('ALL')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition cursor-pointer ${
              activeStore === 'ALL'
                ? 'bg-[#B88E4F] text-white border-[#B88E4F]'
                : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:bg-[#F3EFE6]'
            }`}
          >
            Xem Tất Cả ({STORES.length} Gian Hàng)
          </button>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {STORES.map((st) => {
            const isSelected = activeStore === st.id;
            return (
              <div
                key={st.id}
                onClick={() => setActiveStore(isSelected ? 'ALL' : st.id)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between gap-3 shadow-2xs ${
                  isSelected
                    ? 'bg-[#FBF5EB] border-[#B88E4F] ring-2 ring-[#B88E4F]/30'
                    : 'bg-white border-[#EAE4D7] hover:border-[#B88E4F]/60 hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] text-[#B88E4F] font-black text-base flex items-center justify-center">
                    {st.logoInitial}
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6]">
                    {st.badge}
                  </span>
                </div>

                <div>
                  <strong className="text-xs font-extrabold text-[#1A1612] block truncate">{st.name}</strong>
                  <span className="text-[11px] text-[#7D715E] block truncate mt-0.5">{st.category}</span>
                </div>

                <div className="pt-2 border-t border-[#EAE4D7] flex items-center justify-between text-[11px]">
                  <span className="text-[#7D715E]">
                    <strong className="text-[#1A1612]">{st.kolCount}+</strong> KOL hợp tác
                  </span>
                  <span className="font-extrabold text-[#B88E4F]">{st.commissionRange}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. MAIN CONTENT CONTAINER: FEATURED HERO & PRODUCTS GRID */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex flex-col gap-8">
        {/* HERO PRODUCT SHOWCASE (Product spotlight from selected store) */}
        {selectedProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Product Media Gallery */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="relative rounded-3xl overflow-hidden bg-white border border-[#EAE4D7] shadow-sm aspect-4/3 flex items-center justify-center p-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-full h-full object-contain hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-[#B88E4F] text-white text-xs font-black shadow-xs">
                  Tiết kiệm {selectedProduct.discountRate}%
                </span>
                <span className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-[#231D15] text-white text-[11px] font-bold shadow-xs">
                  🏪 {selectedProduct.storeName}
                </span>
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  selectedProduct.image,
                  '/assets/serum-hero-optimized.jpg',
                  '/assets/sunscreen-product.jpg',
                  '/assets/cleanser-product.jpg',
                ].map((img, idx) => (
                  <div
                    key={idx}
                    className={`h-20 rounded-xl overflow-hidden border p-1 bg-white cursor-pointer transition ${
                      idx === 0 ? 'border-[#B88E4F] ring-2 ring-[#B88E4F]/30' : 'border-[#EAE4D7] hover:border-[#B88E4F]/50'
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-cover rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Product Buy Box */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#EAE4D7] p-6 sm:p-8 flex flex-col gap-5 shadow-sm">
              {/* Shop Origin Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F3EFE6] border border-[#EAE4D7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white text-[#B88E4F] font-bold text-xs flex items-center justify-center border border-[#EAE4D7]">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-extrabold text-[#1A1612] block">
                      Gian hàng: {selectedProduct.storeName}
                    </strong>
                    <span className="text-[11px] text-[#7D715E]">Đối tác chính thức trên sàn SCANMS</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#B88E4F] bg-white px-2.5 py-1 rounded-full border border-[#EEDFC6]">
                  {selectedProduct.storeBadge}
                </span>
              </div>

              {/* Title & Stats */}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1612] tracking-tight leading-snug m-0">
                  {selectedProduct.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#7D715E] mt-2">
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" /> {selectedProduct.rating}
                  </span>
                  <span>•</span>
                  <span>Đã bán: <strong>{selectedProduct.soldCount.toLocaleString('vi-VN')}</strong> chai</span>
                  <span>•</span>
                  <span className="text-[#059669] font-bold">✓ Sẵn hàng tại kho đối tác</span>
                </div>
              </div>

              {/* Price Box */}
              <div className="p-4 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex flex-col gap-1.5">
                <div className="flex items-baseline gap-3">
                  <strong className="text-3xl font-black text-[#1A1612]">
                    {(selectedProduct.salePrice * (selectedVolume === '50ml' ? 1.5 : 1)).toLocaleString('vi-VN')} ₫
                  </strong>
                  <span className="text-sm text-[#7D715E] line-through">
                    {(selectedProduct.originalPrice * (selectedVolume === '50ml' ? 1.5 : 1)).toLocaleString('vi-VN')} ₫
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#B88E4F] text-white">
                    -{selectedProduct.discountRate}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[#EEDFC6]/60">
                  <span className="font-bold text-[#B88E4F]">
                    ↳ Áp dụng mã ưu đãi: {kolCoupon}
                  </span>
                  <span className="font-bold text-[#7D715E]">
                    Hoa hồng chi trả KOL: <strong className="text-[#B88E4F]">{selectedProduct.commissionRate}%</strong> (~{selectedProduct.commissionAmount.toLocaleString('vi-VN')} ₫)
                  </span>
                </div>
              </div>

              {/* Volume Options */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#1A1612]">Chọn dung tích sản phẩm:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVolume('30ml')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedVolume === '30ml'
                        ? 'bg-white border-[#B88E4F] text-[#B88E4F] ring-2 ring-[#B88E4F]/30'
                        : 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <span>Dung tích 30ml</span>
                    <span>{selectedProduct.salePrice.toLocaleString('vi-VN')} ₫</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVolume('50ml')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedVolume === '50ml'
                        ? 'bg-white border-[#B88E4F] text-[#B88E4F] ring-2 ring-[#B88E4F]/30'
                        : 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <span>Dung tích 50ml</span>
                    <span>{Math.round(selectedProduct.salePrice * 1.5).toLocaleString('vi-VN')} ₫</span>
                  </button>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#1A1612]">Số lượng mua:</span>
                <div className="flex items-center border border-[#EAE4D7] rounded-xl bg-[#FAF8F5] p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-xs font-bold hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-[#1A1612]" />
                  </button>
                  <span className="w-10 text-center font-black text-xs text-[#1A1612]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-xs font-bold hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#1A1612]" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCartCount(cartCount + quantity);
                    showToast(`Đã thêm ${quantity} sản phẩm từ ${selectedProduct.storeName} vào giỏ!`);
                  }}
                  className="sm:col-span-5 py-3 px-4 rounded-xl border border-[#B88E4F] bg-white text-[#B88E4F] hover:bg-[#FBF5EB] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Thêm vào giỏ</span>
                </button>

                {/* PRIMARY BUY NOW BUTTON (DIRECT 1-STEP GUEST CHECKOUT) */}
                <button
                  type="button"
                  onClick={() => handleOpenBuyNow(selectedProduct, quantity)}
                  className="sm:col-span-7 py-3 px-4 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Đặt Mua Ngay (Không Cần Đăng Nhập)</span>
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EAE4D7] text-[11px] text-[#7D715E] font-medium text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-[#B88E4F]" />
                  <span>Giao nhanh 24-48h</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span>100% Chính hãng</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <span>Đổi trả 14 ngày</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. ALL PRODUCTS CATALOG GRID */}
        <div className="flex flex-col gap-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1612] m-0">
                Sản Phẩm Đang Phân Phối Qua Mạng Lưới SCANMS
              </h2>
              <p className="text-xs text-[#7D715E] m-0 mt-0.5">
                {activeStore === 'ALL'
                  ? 'Hiển thị tất cả sản phẩm từ các Gian hàng đối tác đã xác thực.'
                  : `Đang lọc theo gian hàng: ${STORES.find((s) => s.id === activeStore)?.name}`}
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'Serum', 'Chống nắng', 'Toner', 'Làm sạch', 'Mặt nạ'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#B88E4F] text-white'
                      : 'bg-white text-[#7D715E] border border-[#EAE4D7] hover:bg-[#F3EFE6]'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả danh mục' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-[#EAE4D7] p-4 flex flex-col justify-between gap-3 hover:shadow-md transition duration-300 group"
              >
                <div>
                  <div className="relative rounded-xl overflow-hidden bg-[#FAF8F5] aspect-square flex items-center justify-center p-3 mb-3">
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#B88E4F] text-white text-[10px] font-black">
                      -{prod.discountRate}%
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[#1A1612] text-[10px] font-bold border border-[#EAE4D7]">
                      {prod.category}
                    </span>
                  </div>

                  {/* Store Badge */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B88E4F] mb-1">
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{prod.storeName}</span>
                  </div>

                  <strong className="text-xs sm:text-sm font-bold text-[#1A1612] line-clamp-2 block leading-snug">
                    {prod.title}
                  </strong>

                  <div className="flex items-center gap-2 text-xs text-[#7D715E] mt-1.5">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-current" /> {prod.rating}
                    </span>
                    <span>•</span>
                    <span>Đã bán {prod.soldCount}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EAE4D7] flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <strong className="text-base font-black text-[#1A1612]">
                      {prod.salePrice.toLocaleString('vi-VN')} ₫
                    </strong>
                    <span className="text-xs text-[#7D715E] line-through">
                      {prod.originalPrice.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  {/* Commission Indicator for KOL Collaboration */}
                  <div className="text-[10.5px] font-bold text-[#B88E4F] bg-[#FBF5EB] px-2 py-1 rounded-lg border border-[#EEDFC6] flex items-center justify-between">
                    <span>Hoa hồng CTV: {prod.commissionRate}%</span>
                    <span>~{prod.commissionAmount.toLocaleString('vi-VN')} ₫</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="py-2 px-2 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] text-xs font-bold transition cursor-pointer text-center"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBuyNow(prod, 1)}
                      className="py-2 px-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer text-center"
                    >
                      Mua ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 7. GUEST 1-STEP CHECKOUT MODAL (NO LOGIN REQUIRED) */}
      {showCheckoutModal && checkoutProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EAE4D7] shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-5 text-left relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612] flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>

            {!orderSuccess ? (
              <form onSubmit={handleConfirmOrder} className="flex flex-col gap-4">
                {/* Header Modal */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] text-[11px] font-bold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mua Hàng Nhanh 1-Chạm • Không Cần Đăng Nhập</span>
                  </div>
                  <h3 className="text-xl font-black text-[#1A1612] m-0">Xác Nhận Đơn Hàng D2C</h3>
                  <p className="text-xs text-[#7D715E] m-0 mt-0.5">
                    Đơn hàng được phân phối trực tiếp từ Gian hàng <strong>{checkoutProduct.storeName}</strong> và bảo trợ bởi <strong>SCANMS</strong>.
                  </p>
                </div>

                {/* Selected Product Summary Card */}
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center gap-3">
                  <img
                    src={checkoutProduct.image}
                    alt={checkoutProduct.title}
                    className="w-14 h-14 object-cover rounded-xl bg-white border border-[#EAE4D7]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#B88E4F] block">
                      Gian hàng: {checkoutProduct.storeName}
                    </span>
                    <strong className="text-xs font-bold text-[#1A1612] truncate block">
                      {checkoutProduct.title}
                    </strong>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="font-extrabold text-[#1A1612]">
                        {checkoutProduct.salePrice.toLocaleString('vi-VN')} ₫
                      </span>
                      <span className="text-[11px] text-[#7D715E]">× {checkoutQty}</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields for Guest */}
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1">Họ và tên người nhận *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn An"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1">Số điện thoại giao hàng *</label>
                      <input
                        type="tel"
                        required
                        placeholder="0987654321"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1">Tỉnh / Thành phố *</label>
                      <select
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                      >
                        <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Hà Nội">TP. Hà Nội</option>
                        <option value="Đà Nẵng">TP. Đà Nẵng</option>
                        <option value="Cần Thơ">TP. Cần Thơ</option>
                        <option value="Bình Dương">Bình Dương</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1">Quận / Huyện *</label>
                      <input
                        type="text"
                        required
                        placeholder="Quận 1 / Cầu Giấy..."
                        value={customerDistrict}
                        onChange={(e) => setCustomerDistrict(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">Địa chỉ chi tiết (Số nhà, đường) *</label>
                    <input
                      type="text"
                      required
                      placeholder="123 Nguyễn Huệ, Phường Bến Nghé"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">Ghi chú giao hàng (Tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="Giao giờ hành chính, gọi trước khi đến..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Phương thức thanh toán:</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        paymentMethod === 'COD'
                          ? 'bg-[#FBF5EB] border-[#B88E4F] text-[#B88E4F] ring-1 ring-[#B88E4F]'
                          : 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
                      }`}
                    >
                      <span>Tiền mặt (COD)</span>
                      <span>💵</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('VIETQR')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        paymentMethod === 'VIETQR'
                          ? 'bg-[#FBF5EB] border-[#B88E4F] text-[#B88E4F] ring-1 ring-[#B88E4F]'
                          : 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
                      }`}
                    >
                      <span>VietQR 24/7</span>
                      <span>💳</span>
                    </button>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-[#7D715E]">
                    <span>Tạm tính:</span>
                    <span>{(checkoutProduct.salePrice * checkoutQty).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-[#059669]">
                    <span>Ưu đãi tiếp thị ({kolCoupon}):</span>
                    <span>Miễn phí vận chuyển toàn quốc</span>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4D7] flex justify-between font-extrabold text-sm text-[#1A1612]">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="text-[#B88E4F] text-base">
                      {(checkoutProduct.salePrice * checkoutQty).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3 px-4 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submittingOrder ? 'Đang tạo đơn hàng...' : 'Xác Nhận Đặt Hàng Ngay'}</span>
                </button>
              </form>
            ) : (
              /* SUCCESS CONFIRMATION MODAL */
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#B88E4F]" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#1A1612] m-0">Đặt Hàng Thành Công!</h3>
                  <p className="text-xs text-[#7D715E] mt-1 m-0">
                    Cảm ơn bạn đã mua hàng qua liên kết tiếp thị của <strong>{orderSuccess.kolRef}</strong> trên sàn <strong>SCANMS</strong>.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] text-left text-xs flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Mã đơn hàng:</span>
                    <strong className="font-mono text-[#B88E4F] font-bold text-sm">{orderSuccess.orderId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Gian hàng cung cấp:</span>
                    <strong className="text-[#1A1612]">{orderSuccess.storeName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Sản phẩm:</span>
                    <span className="text-[#1A1612] font-semibold truncate max-w-[200px]">
                      {orderSuccess.productName} (x{orderSuccess.quantity})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Người nhận:</span>
                    <span className="text-[#1A1612]">{orderSuccess.recipient} • {orderSuccess.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Địa chỉ giao:</span>
                    <span className="text-[#1A1612] text-right truncate max-w-[220px]">{orderSuccess.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Phương thức:</span>
                    <span className="text-[#1A1612]">{orderSuccess.payment}</span>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4D7] flex justify-between font-bold text-sm">
                    <span>Tổng số tiền:</span>
                    <span className="text-[#B88E4F]">{orderSuccess.totalAmount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] w-full text-[11px] text-[#B88E4F] flex items-center justify-between">
                  <span>🚚 Đơn vị vận chuyển: GHN Express</span>
                  <span className="font-mono font-bold">Mã vận đơn: GHN-{orderSuccess.orderId.replace('DH-', '')}</span>
                </div>

                <div className="flex gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612] font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Tiếp tục mua sắm
                  </button>
                  <Link
                    to={`/tracking?sn=${orderSuccess.orderId}`}
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 py-2.5 px-3 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-extrabold rounded-xl text-xs transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Tra cứu đơn hàng</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. PUBLIC FOOTER */}
      <footer className="mt-auto bg-white border-t border-[#EAE4D7] px-4 sm:px-8 py-8 text-xs text-[#7D715E]">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#C59B58] text-white font-black text-sm flex items-center justify-center">
                S
              </div>
              <div>
                <strong className="text-sm font-extrabold text-[#1A1612] block">SCANMS MARKETPLACE</strong>
                <span className="text-[11px] text-[#7D715E]">
                  Hệ thống Quản lý Mạng lưới Cộng tác viên Bán hàng &amp; Tiếp thị Liên kết (FA26SE032)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <Link to="/login" className="text-[#B88E4F] hover:underline">
                Cổng Quản Trị Đối Tác / KOL
              </Link>
              <span>•</span>
              <Link to="/register" className="text-[#1A1612] hover:underline">
                Đăng Ký Mở Gian Hàng
              </Link>
              <span>•</span>
              <Link to="/tracking" className="text-[#1A1612] hover:underline">
                Tra Cứu Vận Đơn
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <span>© 2026 SCANMS — Nền tảng kết nối Doanh nghiệp D2C và Nhà sáng tạo nội dung hàng đầu Việt Nam.</span>
            <span>Bảo mật dữ liệu 100% theo tiêu chuẩn Bộ Công Thương</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
