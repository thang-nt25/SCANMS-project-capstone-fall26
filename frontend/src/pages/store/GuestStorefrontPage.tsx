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
  Package,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface ProductItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountRate: number;
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
    setTimeout(() => setToastMsg(null), 3000);
  };

  const PRODUCTS: ProductItem[] = [
    {
      id: 'p-1',
      sku: 'SR-VTC-15',
      title: 'Serum Vitamin C 15% Dưỡng Sáng Mờ Thâm Sora Skin',
      category: 'Serum',
      originalPrice: 520000,
      salePrice: 413100,
      discountRate: 21,
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
      category: 'Chống nắng',
      originalPrice: 450000,
      salePrice: 350100,
      discountRate: 22,
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
      category: 'Toner',
      originalPrice: 420000,
      salePrice: 314100,
      discountRate: 25,
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
      category: 'Làm sạch',
      originalPrice: 280000,
      salePrice: 197100,
      discountRate: 30,
      stock: 82,
      rating: 4.8,
      soldCount: 1100,
      image: '/assets/cleanser-product.jpg',
      description:
        'Gel rửa mặt tạo bọt mịn với chiết xuất tràm trà hữu cơ và tinh chất rau má lên men. Làm sạch bụi mịn PM2.5 mà vẫn giữ nguyên màng ẩm tự nhiên của da.',
    },
    {
      id: 'p-5',
      sku: 'MSK-CICA-5X',
      title: 'Mặt Nạ Phục Hồi Làm Dịu Khẩn Cấp Cica Hyaluronic 5X',
      category: 'Mặt nạ',
      originalPrice: 250000,
      salePrice: 179100,
      discountRate: 28,
      stock: 94,
      rating: 4.9,
      soldCount: 2300,
      image: '/assets/cica-mask-product.jpg',
      description:
        'Chất liệu sợi tơ tằm sinh học ngậm 30ml tinh chất phục hồi Cica B5. Giảm đỏ rát tức thì sau khi đi nắng, nặn mụn hoặc peel da hóa học.',
    },
  ];

  // Set default selected product to Hero product
  useEffect(() => {
    setSelectedProduct(PRODUCTS[0]);
  }, []);

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenBuyNow = (prod: ProductItem, qty: number = 1) => {
    setCheckoutProduct(prod);
    setCheckoutQty(qty);
    setShowCheckoutModal(true);
    setOrderSuccess(null);
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      showToast('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng!');
      return;
    }

    setSubmittingOrder(true);
    setTimeout(() => {
      setSubmittingOrder(false);
      const generatedOrderId = `DH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      setOrderSuccess({
        orderId: generatedOrderId,
        productName: checkoutProduct?.title,
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
    }, 800);
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

      {/* 1. PUBLIC GUEST HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#B88E4F] text-white font-black text-lg flex items-center justify-center shadow-xs">
            S
          </span>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-base font-extrabold text-[#1A1612]">Sora Skin Official</strong>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                ✓ Gian Hàng D2C
              </span>
            </div>
            <span className="text-[11px] text-[#7D715E] hidden sm:block">
              Mỹ phẩm phục hồi da sinh học chính hãng
            </span>
          </div>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md bg-[#FAF8F5] border border-[#EAE4D7] rounded-full px-3.5 py-1.5">
          <Search className="w-4 h-4 text-[#A49B8B]" />
          <input
            type="text"
            placeholder="Tìm theo tên serum, kem chống nắng, toner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-[#1A1612] w-full"
          />
        </div>

        {/* Right Actions for Guest */}
        <div className="flex items-center gap-2.5">
          {/* Cart Pill */}
          <button
            type="button"
            onClick={() => handleOpenBuyNow(selectedProduct || PRODUCTS[0], quantity)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
            <span>Giỏ hàng</span>
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
            <span>Đăng nhập Đối tác / KOL</span>
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
              Bạn đang mua qua liên kết tiếp thị chính thức từ <strong>{kolName}</strong> (KOL Hạng Vàng)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white border border-[#EEDFC6] text-[#B88E4F] font-mono font-bold text-[11px]">
              Mã độc quyền: {kolCoupon} (-10%)
            </span>
            <span className="text-emerald-700 font-bold hidden sm:inline">✓ Đã kích hoạt</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex flex-col gap-8">
        {/* HERO PRODUCT SHOWCASE (Matching 21_Storefront_Mua_Hang.png) */}
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
              {/* KOL Review Card Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#EEDFC6] text-[#B88E4F] font-bold text-xs flex items-center justify-center">
                    {kolName.charAt(0)}
                  </span>
                  <div>
                    <strong className="text-xs font-extrabold text-[#1A1612] block">{kolName}</strong>
                    <span className="text-[11px] text-[#7D715E]">KOL Hạng Vàng • TikTok 185k followers</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#B88E4F] bg-white px-2.5 py-1 rounded-full border border-[#EAE4D7]">
                  ✓ Đã trải nghiệm thật
                </span>
              </div>

              {/* Title & Stats */}
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1612] tracking-tight leading-snug m-0">
                  {selectedProduct.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#7D715E] mt-2">
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" /> {selectedProduct.rating}
                  </span>
                  <span>•</span>
                  <span>Đã bán: <strong>{selectedProduct.soldCount.toLocaleString('vi-VN')}</strong> chai</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">✓ Sẵn hàng tại kho TP.HCM</span>
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
                <span className="text-xs font-bold text-[#B88E4F] flex items-center gap-1">
                  ↳ Đã áp dụng mã ưu đãi KOL: {kolCoupon}
                </span>
              </div>

              {/* Volume Option */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-2">
                  Chọn dung tích sản phẩm:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVolume('30ml')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedVolume === '30ml'
                        ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#1A1612] ring-2 ring-[#B88E4F]/30'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span>Dung tích 30ml</span>
                    <span className="text-[#B88E4F]">{selectedProduct.salePrice.toLocaleString('vi-VN')} ₫</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVolume('50ml')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedVolume === '50ml'
                        ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#1A1612] ring-2 ring-[#B88E4F]/30'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span>Dung tích 50ml</span>
                    <span className="text-[#B88E4F]">{Math.round(selectedProduct.salePrice * 1.5).toLocaleString('vi-VN')} ₫</span>
                  </button>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-[#1A1612]">Số lượng mua:</span>
                <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-xs font-bold hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-[#1A1612]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-xs font-bold hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons for Guest */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCartCount(cartCount + quantity);
                    showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
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
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
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

        {/* 4. ALL PRODUCTS CATALOG GRID */}
        <div className="flex flex-col gap-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1612] m-0">
                Danh Mục Mỹ Phẩm Sora Skin
              </h2>
              <p className="text-xs text-[#7D715E] m-0 mt-0.5">
                Các sản phẩm chăm sóc da sinh học độc quyền phân phối qua mạng lưới SCANMS.
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
                      ? 'bg-[#B88E4F] text-white shadow-2xs'
                      : 'bg-white border border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((prod) => (
              <Card
                key={prod.id}
                className="bg-white border border-[#EAE4D7] overflow-hidden flex flex-col justify-between group hover:shadow-md transition"
              >
                {/* Image */}
                <div
                  className="relative aspect-square bg-[#FAF8F5] p-4 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => {
                    setSelectedProduct(prod);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                >
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#B88E4F] text-white text-[10px] font-black">
                    -{prod.discountRate}%
                  </span>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[#7D715E] text-[10px] font-bold border border-[#EAE4D7]">
                    {prod.category}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3
                    onClick={() => {
                      setSelectedProduct(prod);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    className="text-xs sm:text-sm font-bold text-[#1A1612] m-0 line-clamp-2 leading-snug cursor-pointer hover:text-[#B88E4F] transition"
                  >
                    {prod.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-[#7D715E]">
                    <span className="flex items-center text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-current mr-0.5" /> {prod.rating}
                    </span>
                    <span>•</span>
                    <span>Đã bán {prod.soldCount}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-auto pt-1">
                    <strong className="text-base font-extrabold text-[#1A1612]">
                      {prod.salePrice.toLocaleString('vi-VN')} ₫
                    </strong>
                    <span className="text-xs text-[#7D715E] line-through">
                      {prod.originalPrice.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  {/* Buy Button */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE4D7]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="py-1.5 px-2 rounded-lg border border-[#EAE4D7] text-[11px] font-bold text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBuyNow(prod, 1)}
                      className="py-1.5 px-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[11px] font-extrabold transition cursor-pointer shadow-2xs"
                    >
                      Mua ngay
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* 5. GUEST 1-STEP CHECKOUT MODAL (NO LOGIN REQUIRED) */}
      {showCheckoutModal && checkoutProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#EAE4D7] shadow-2xl p-6 sm:p-7 flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#EAE4D7] pb-4">
              <div>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                  MUA HÀNG KHÔNG CẦN TÀI KHOẢN
                </span>
                <h2 className="text-lg sm:text-xl font-black text-[#1A1612] m-0 mt-1">
                  {orderSuccess ? 'Đặt Hàng Thành Công' : 'Xác Nhận Đơn Hàng & Giao Hàng'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ORDER SUCCESS STATE */}
            {orderSuccess ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1A1612] m-0">Cảm ơn bạn đã đặt hàng!</h3>
                  <p className="text-xs text-[#7D715E] mt-1 m-0">
                    Đơn hàng của bạn đã được tiếp nhận và đang được đóng gói chuyển sang đơn vị vận chuyển GHN.
                  </p>
                </div>

                <div className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-2xl p-4 text-left flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between border-b border-[#EAE4D7] pb-2">
                    <span className="text-[#7D715E]">Mã đơn hàng:</span>
                    <strong className="font-mono text-[#B88E4F] font-bold text-sm">{orderSuccess.orderId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Sản phẩm:</span>
                    <span className="font-semibold text-[#1A1612] truncate max-w-[240px]">
                      {orderSuccess.productName} (x{orderSuccess.quantity})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Người nhận:</span>
                    <span className="font-bold text-[#1A1612]">{orderSuccess.recipient} ({orderSuccess.phone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Địa chỉ giao:</span>
                    <span className="font-medium text-[#1A1612] max-w-[240px] text-right truncate">
                      {orderSuccess.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Thanh toán:</span>
                    <span className="font-bold text-[#1A1612]">{orderSuccess.payment}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#EAE4D7] pt-2 text-sm">
                    <span className="font-bold text-[#1A1612]">Tổng thanh toán:</span>
                    <strong className="font-black text-[#B88E4F]">
                      {orderSuccess.totalAmount.toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Tiếp tục mua sắm
                  </Button>
                  <Button
                    variant="gold"
                    className="flex-1"
                    onClick={() => {
                      setShowCheckoutModal(false);
                      showToast(`Đang mở trang tra cứu vận đơn ${orderSuccess.orderId}...`);
                    }}
                  >
                    Tra cứu đơn hàng
                  </Button>
                </div>
              </div>
            ) : (
              /* CHECKOUT FORM FOR GUEST */
              <form onSubmit={handleConfirmOrder} className="flex flex-col gap-4">
                {/* Item Summary Bar */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                  <img
                    src={checkoutProduct.image}
                    alt={checkoutProduct.title}
                    className="w-12 h-12 rounded-xl object-contain border border-[#EAE4D7] bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="text-xs font-bold text-[#1A1612] block truncate">
                      {checkoutProduct.title}
                    </strong>
                    <span className="text-[11px] text-[#7D715E]">
                      Đơn giá: {checkoutProduct.salePrice.toLocaleString('vi-VN')} ₫ • Số lượng: {checkoutQty}
                    </span>
                  </div>
                  <strong className="text-sm font-black text-[#B88E4F]">
                    {(checkoutProduct.salePrice * checkoutQty).toLocaleString('vi-VN')} ₫
                  </strong>
                </div>

                {/* Receiver Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">
                      Họ và tên người nhận *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn An"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">
                      Số điện thoại nhận hàng *
                    </label>
                    <input
                      type="tel"
                      placeholder="VD: 0912345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58]"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">Tỉnh / Thành phố *</label>
                    <select
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none"
                    >
                      <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1A1612] block mb-1">Quận / Huyện *</label>
                    <input
                      type="text"
                      placeholder="VD: Quận 1 / Cầu Giấy"
                      value={customerDistrict}
                      onChange={(e) => setCustomerDistrict(e.target.value)}
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58]"
                    />
                  </div>
                </div>

                {/* Specific Address */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 123 Nguyễn Thị Minh Khai, Phường Bến Thành"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Ghi chú giao hàng (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Giao giờ hành chính, gọi trước khi giao..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Phương thức thanh toán:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        paymentMethod === 'COD'
                          ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#1A1612]'
                          : 'border-[#EAE4D7] bg-white text-[#7D715E]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="text-[#B88E4F] focus:ring-[#B88E4F]"
                      />
                      <div>
                        <strong className="text-xs block">Tiền mặt (COD)</strong>
                        <span className="text-[10px] text-[#7D715E]">Thanh toán khi nhận hàng</span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        paymentMethod === 'VIETQR'
                          ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#1A1612]'
                          : 'border-[#EAE4D7] bg-white text-[#7D715E]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'VIETQR'}
                        onChange={() => setPaymentMethod('VIETQR')}
                        className="text-[#B88E4F] focus:ring-[#B88E4F]"
                      />
                      <div>
                        <strong className="text-xs block">VietQR Napas 24/7</strong>
                        <span className="text-[10px] text-[#7D715E]">Quét mã ngân hàng</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE4D7] flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#7D715E]">Tạm tính:</span>
                    <span>{(checkoutProduct.salePrice * checkoutQty).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-[#B88E4F]">
                    <span>Ưu đãi KOL ({kolCoupon}):</span>
                    <span>-10% (Đã trừ)</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Phí vận chuyển:</span>
                    <span className="font-bold">Miễn phí toàn quốc</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#EAE4D7] text-sm">
                    <strong className="text-[#1A1612]">Tổng thanh toán:</strong>
                    <strong className="text-lg font-black text-[#B88E4F]">
                      {(checkoutProduct.salePrice * checkoutQty).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3.5 px-4 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-black text-sm rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                >
                  <Package className="w-4 h-4" />
                  <span>{submittingOrder ? 'Đang gửi đơn hàng...' : 'Xác Nhận Đặt Hàng Ngay'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. GUEST FOOTER */}
      <footer className="mt-auto bg-white border-t border-[#EAE4D7] py-8 px-4 sm:px-8 text-xs text-[#7D715E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#B88E4F] text-white font-bold text-xs flex items-center justify-center">
              S
            </span>
            <strong className="text-[#1A1612]">Sora Skin Vietnam</strong> — Phân phối độc quyền trên nền tảng SCANMS
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="font-bold text-[#B88E4F] hover:underline">
              Cổng Quản Trị Đối Tác / KOL
            </Link>
            <span>•</span>
            <span>Hotline: 1900 6868</span>
            <span>•</span>
            <span>Bảo mật 100% theo tiêu chuẩn Bộ Công Thương</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
