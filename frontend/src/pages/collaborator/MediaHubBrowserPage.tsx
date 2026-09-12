import { useState, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Play,
  Search,
  Upload,
  Eye,
  X,
  Sparkles,
  FileCheck,
  ChevronDown,
  Tag,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { couponService, type CouponItem } from '../../services/coupon.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function MediaHubBrowserPage() {
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.fullName || 'Nguyễn Thành Thắng';
  const isShopOrAdmin =
    currentUser?.role === 'SHOP_MANAGER' ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.role === 'SYSTEM_MANAGER';

  const [activeCoupons, setActiveCoupons] = useState<CouponItem[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');

  useEffect(() => {
    if (!isShopOrAdmin) {
      couponService
        .getKolCoupons({ status: 'ACTIVE' })
        .then((res) => {
          const list = res.coupons || [];
          setActiveCoupons(list);
          if (list.length > 0) {
            setSelectedCouponId(list[0].id);
          }
        })
        .catch(() => {
          setActiveCoupons([]);
        });
    }
  }, [isShopOrAdmin]);

  const selectedCoupon = activeCoupons.find((c) => c.id === selectedCouponId) || activeCoupons[0];
  const couponCode = selectedCoupon?.displayCode;
  const discountText = selectedCoupon
    ? selectedCoupon.discountType === 'PERCENTAGE'
      ? `giảm thêm ${selectedCoupon.discountValue}%`
      : `giảm thêm ${Number(selectedCoupon.discountValue).toLocaleString('vi-VN')} ₫`
    : '';

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);
  const [activeCaptionTab, setActiveCaptionTab] = useState<'short' | 'review' | 'offer' | 'livestream'>('review');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Caption Templates generated dynamically without hardcoded coupons or 10% fallbacks
  const captionTemplates = {
    short: couponCode
      ? `Gợi ý chăm sóc da sáng khỏe mỗi ngày cùng Serum Vitamin C 15% ✨\n\nTinh chất mỏng nhẹ, thẩm thấu nhanh, hỗ trợ cấp ẩm và cải thiện bề mặt da mềm mịn.\n\n👉 Đặt mua chính hãng qua link: https://scanms.vn/l/skin-c15\n🎁 Nhập ngay mã ${couponCode} để ${discountText}!\n\n#SCANMS #SerumVitaminC #SkincareRoutine #Affiliate`
      : `Gợi ý chăm sóc da sáng khỏe mỗi ngày cùng Serum Vitamin C 15% ✨\n\nTinh chất mỏng nhẹ, thẩm thấu nhanh, hỗ trợ cấp ẩm và cải thiện bề mặt da mềm mịn.\n\n👉 Đặt mua chính hãng qua link giới thiệu: https://scanms.vn/l/skin-c15\n\n#SCANMS #SerumVitaminC #SkincareRoutine #Affiliate`,
    review: couponCode
      ? `[GÓC REVIEW TỪ ${userName.toUpperCase()}]\nTrải nghiệm thực tế khi sử dụng Serum Vitamin C 15%:\n\n💧 Cảm quan kết cấu: Tinh chất mỏng nhẹ, thấm nhanh trong 15s, không gây bóng nhờn.\n🔬 Thành phần: 15% Vitamin C tinh khiết kết hợp Hyaluronic Acid cấp ẩm sâu.\n🎯 Cảm nhận sau 3 tuần: Da trông tươi sáng, ẩm mịn và rạng rỡ rõ rệt.\n\n💰 Giá tham khảo: 459.000 ₫\n🛒 Link mua hàng chính hãng: https://scanms.vn/l/skin-c15\n🏷️ Mã ưu đãi độc quyền: ${couponCode} (${selectedCoupon.discountType === 'PERCENTAGE' ? `-${selectedCoupon.discountValue}%` : `-${Number(selectedCoupon.discountValue).toLocaleString('vi-VN')} ₫`})\n\n#SCANMS #SerumC #BeautyReview #SkincareTips`
      : `[GÓC REVIEW TỪ ${userName.toUpperCase()}]\nTrải nghiệm thực tế khi sử dụng Serum Vitamin C 15%:\n\n💧 Cảm quan kết cấu: Tinh chất mỏng nhẹ, thấm nhanh trong 15s, không gây bóng nhờn.\n🔬 Thành phần: 15% Vitamin C tinh khiết kết hợp Hyaluronic Acid cấp ẩm sâu.\n🎯 Cảm nhận sau 3 tuần: Da trông tươi sáng, ẩm mịn và rạng rỡ rõ rệt.\n\n💰 Giá tham khảo: 459.000 ₫\n🛒 Link mua hàng chính hãng: https://scanms.vn/l/skin-c15\n\n#SCANMS #SerumC #BeautyReview #SkincareTips`,
    offer: couponCode
      ? `🎁 ƯU ĐÃI ĐẶC BIỆT DÀNH CHO CỘNG ĐỒNG ${userName.toUpperCase()}!\n\nChương trình Flash Sale độc quyền cho Serum Vitamin C 15%:\n⚡ Giá ưu đãi chỉ: 459.000 ₫\n⚡ Tặng kèm quà tặng sample dùng thử độc quyền cho 50 đơn đầu tiên\n⚡ Nhập mã ${couponCode} tại bước thanh toán để ${discountText}!\n\n👉 Mua ngay tại: https://scanms.vn/l/skin-c15`
      : `🎁 ƯU ĐÃI ĐẶC BIỆT DÀNH CHO CỘNG ĐỒNG ${userName.toUpperCase()}!\n\nChương trình Flash Sale độc quyền cho Serum Vitamin C 15%:\n⚡ Giá ưu đãi chỉ: 459.000 ₫\n⚡ Tặng kèm quà tặng sample dùng thử độc quyền cho 50 đơn đầu tiên\n\n👉 Mua ngay tại: https://scanms.vn/l/skin-c15`,
    livestream: couponCode
      ? `🌟 GỢI Ý KỊCH BẢN CHIA SẺ TRÊN LIVESTREAM:\n\n1. Mở đầu: Cầm sản phẩm Serum Vitamin C 15%, zoom cận cảnh kết cấu tinh chất lên camera.\n2. Trải nghiệm: Thoa thử lên mu bàn tay, chia sẻ cảm giác mát mịn và thấm nhanh không nhờn dính.\n3. Kêu gọi: Hướng dẫn người xem bấm vào link ghim, nhập mã ${couponCode} để nhận ưu đãi (${discountText}) từ Shop Sora Skin!`
      : `🌟 GỢI Ý KỊCH BẢN CHIA SẺ TRÊN LIVESTREAM:\n\n1. Mở đầu: Cầm sản phẩm Serum Vitamin C 15%, zoom cận cảnh kết cấu tinh chất lên camera.\n2. Trải nghiệm: Thoa thử lên mu bàn tay, chia sẻ cảm giác mát mịn và thấm nhanh không nhờn dính.\n3. Kêu gọi: Hướng dẫn người xem bấm vào link ghim để nhận ưu đãi chính hãng từ Shop Sora Skin!`,
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionTemplates[activeCaptionTab]);
    setCopiedCaption(true);
    showToast('Đã sao chép kịch bản tiếp thị vào Clipboard!');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Mock list matching prototype 05_Kho_Noi_Dung_Media_Hub.png
  const mockMedia = [
    {
      id: 'm1',
      title: 'Ảnh sản phẩm nền studio 4K',
      productName: 'Serum vitamin C 15%',
      type: 'PNG',
      typeBadge: 'Ảnh PNG',
      badgeBg: 'bg-[#B88E4F]',
      ratio: '4:3 • 2.4 MB',
      resolution: '2400 x 1800 px',
      downloads: 412,
      image: '/assets/serum-hero-optimized.jpg',
      isVideo: false,
    },
    {
      id: 'm2',
      title: 'Video review routine buổi sáng (Shorts / TikTok)',
      productName: 'Serum vitamin C 15%',
      type: 'MP4',
      typeBadge: 'Video MP4',
      badgeBg: 'bg-rose-600',
      ratio: '9:16 • 18.2 MB',
      resolution: '1080 x 1920 px • 60 fps',
      downloads: 856,
      image: '/assets/serum-hero-optimized.jpg',
      isVideo: true,
      duration: '00:42',
    },
    {
      id: 'm3',
      title: 'Banner ưu đãi Flash Sale Tháng 9 (Vuông)',
      productName: 'Serum vitamin C 15%',
      type: 'JPG',
      typeBadge: 'Banner',
      badgeBg: 'bg-blue-600',
      ratio: '1:1 • 1.8 MB',
      resolution: '1200 x 1200 px',
      downloads: 274,
      image: '/assets/serum-hero-optimized.jpg',
      isVideo: false,
    },
    {
      id: 'm4',
      title: 'Video hướng dẫn 3 bước kết hợp Serum Vitamin C',
      productName: 'Serum vitamin C 15%',
      type: 'MP4',
      typeBadge: 'Video MP4',
      badgeBg: 'bg-rose-600',
      ratio: '16:9 • 24.5 MB',
      resolution: '1920 x 1080 px • 60 fps',
      downloads: 319,
      image: '/assets/serum-hero-optimized.jpg',
      isVideo: true,
      duration: '01:15',
    },
    {
      id: 'm5',
      title: 'Banner ngang Website Hero Cover',
      productName: 'Kem chống nắng SPF50+',
      type: 'JPG',
      typeBadge: 'Banner',
      badgeBg: 'bg-blue-600',
      ratio: '9:16 • 2.1 MB',
      resolution: '1920 x 800 px',
      downloads: 180,
      image: '/assets/sunscreen-product.jpg',
      isVideo: false,
    },
    {
      id: 'm6',
      title: 'Bộ ảnh chụp Macro giọt tinh chất BHA',
      productName: 'Nước hoa hồng BHA 2%',
      type: 'PNG',
      typeBadge: 'Ảnh PNG',
      badgeBg: 'bg-[#B88E4F]',
      ratio: '1:1 • 2.8 MB',
      resolution: '2000 x 2000 px',
      downloads: 145,
      image: '/assets/toner-bha-product.jpg',
      isVideo: false,
    },
    {
      id: 'm7',
      title: 'Ảnh cận bọt rửa mặt chuẩn da liễu',
      productName: 'Gel rửa mặt dịu nhẹ',
      type: 'PNG',
      typeBadge: 'Ảnh PNG',
      badgeBg: 'bg-[#B88E4F]',
      ratio: '4:3 • 2.1 MB',
      resolution: '2400 x 1800 px',
      downloads: 98,
      image: '/assets/cleanser-product.jpg',
      isVideo: false,
    },
    {
      id: 'm8',
      title: 'Video Unbox & Trải nghiệm thực tế Cica Mask',
      productName: 'Mặt nạ phục hồi Cica',
      type: 'MP4',
      typeBadge: 'Video MP4',
      badgeBg: 'bg-rose-600',
      ratio: '9:16 • 21.0 MB',
      resolution: '1080 x 1920 px',
      downloads: 512,
      image: '/assets/cica-mask-product.jpg',
      isVideo: true,
      duration: '00:38',
    },
  ];

  const filteredMedia = mockMedia.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.productName.toLowerCase().includes(search.toLowerCase());
    const matchType =
      selectedType === 'ALL' ||
      (selectedType === 'PHOTO' && m.typeBadge.includes('Ảnh')) ||
      (selectedType === 'VIDEO' && m.isVideo) ||
      (selectedType === 'BANNER' && m.typeBadge.includes('Banner'));
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col gap-6 text-left">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#231D15] text-white px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1612] tracking-tight m-0">
            Kho nội dung bán hàng (Media Hub)
          </h1>
          <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0 max-w-3xl">
            Tài nguyên hình ảnh, video review và caption do Shop cung cấp, sẵn sàng quảng bá trên mạng xã hội chỉ với 1 cú click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isShopOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => alert('Mở form tải lên ảnh 4K, video 9:16 và kịch bản mẫu cho sản phẩm')}
            >
              Tải tài nguyên mới
            </Button>
          )}
          <Button
            variant="gold"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => showToast('Đang tải trọn bộ Pack tài nguyên 14 tệp (.zip)...')}
          >
            Tải trọn bộ Pack
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              alert(
                'Quy định sử dụng: Tài nguyên được cấp quyền thương mại cho các KOL/CTV thuộc mạng lưới SCANMS để quảng bá sản phẩm của Shop.'
              )
            }
          >
            Quy định sử dụng
          </Button>
        </div>
      </header>

      {/* 2. STORE BANNER BADGE */}
      <Card className="p-4 bg-[#FAF8F5] border border-[#EAE4D7] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEDFC6] text-[#B88E4F] font-black flex items-center justify-center text-lg">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm sm:text-base font-extrabold text-[#1A1612]">
                Sora Skin Official Store
              </strong>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                Tài nguyên Shop cung cấp
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#7D715E]">
          <span>Cập nhật: <strong className="text-[#1A1612]">08/09/2026</strong></span>
          <span>•</span>
          <span>Tổng số: <strong className="text-[#B88E4F]">{filteredMedia.length} tài nguyên</strong></span>
        </div>
      </Card>

      {/* 3. FILTERS ROW */}
      <Card className="p-3.5 bg-white border border-[#EAE4D7] flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-[#A49B8B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, định dạng (.mp4), routine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
          />
        </div>

        <div className="relative">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-[#F3EFE6] border border-[#EAE4D7] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#1A1612] appearance-none outline-none cursor-pointer hover:bg-[#EAE4D7] transition"
          >
            <option value="ALL">Tất cả sản phẩm (14)</option>
            <option value="SKIN-C15">Serum vitamin C 15%</option>
            <option value="SUN-AQUA">Kem chống nắng SPF50+</option>
            <option value="TONER-BHA">Nước hoa hồng BHA 2%</option>
            <option value="CLEANSER-02">Gel rửa mặt dịu nhẹ</option>
            <option value="MASK-CICA">Mặt nạ phục hồi Cica</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#7D715E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F3EFE6] border border-[#EAE4D7] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#1A1612] appearance-none outline-none cursor-pointer hover:bg-[#EAE4D7] transition"
          >
            <option value="ALL">Tất cả loại (14)</option>
            <option value="PHOTO">Ảnh chụp studio</option>
            <option value="VIDEO">Video TikTok / Shorts</option>
            <option value="BANNER">Banner tiếp thị</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#7D715E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </Card>

      {/* 4. MEDIA CARDS GRID (4 COLUMNS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMedia.map((m) => (
          <Card
            key={m.id}
            className="bg-white border border-[#EAE4D7] overflow-hidden flex flex-col justify-between"
          >
            {/* THUMBNAIL */}
            <div
              className="relative h-52 bg-[#EAE4D7] cursor-pointer overflow-hidden group"
              onClick={() => setPreviewAsset(m)}
            >
              <img
                src={m.image}
                alt={m.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />

              {/* BADGES TOP */}
              <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${m.badgeBg}`}>
                  {m.typeBadge}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs">
                  {m.ratio}
                </span>
              </div>

              {/* VIDEO PLAY OVERLAY */}
              {m.isVideo && (
                <>
                  <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30 transition">
                    <div className="w-12 h-12 rounded-full bg-white/90 text-[#1A1612] grid place-items-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-white">
                    {m.duration}
                  </span>
                </>
              )}
            </div>

            {/* CONTENT */}
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-[#1A1612] m-0 line-clamp-2 leading-snug">
                {m.title}
              </h3>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#B88E4F] border border-[#EAE4D7]">
                  {m.productName}
                </span>
              </div>

              <div className="text-[11px] text-[#7D715E]">
                {m.resolution}
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#7D715E] pt-2 border-t border-[#EAE4D7] mt-auto">
                <span>{m.downloads} lượt tải</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> Shop đã duyệt
                </span>
              </div>

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Eye className="w-3 h-3" />}
                  onClick={() => setPreviewAsset(m)}
                >
                  Xem trước
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  icon={<Download className="w-3 h-3" />}
                  onClick={() => showToast(`Đang tải tệp: ${m.title}`)}
                >
                  Tải xuống
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 5. PREVIEW & CAPTION MODAL */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#EAE4D7] shadow-2xl">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#EAE4D7]">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">
                  {previewAsset.title}
                </h3>
                <span className="text-xs text-[#7D715E]">
                  {previewAsset.productName} • {previewAsset.ratio}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 sm:p-6">
              {/* Image Preview */}
              <div className="md:col-span-5 rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-80">
                <img
                  src={previewAsset.image}
                  alt={previewAsset.title}
                  className="max-h-80 object-contain"
                />
              </div>

              {/* Caption Studio */}
              <div className="md:col-span-7 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <strong className="text-xs font-bold text-[#1A1612]">
                    Mẫu Caption Tiếp Thị Chuẩn SEO
                  </strong>
                  <Button
                    variant="gold"
                    size="sm"
                    icon={copiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    onClick={handleCopyCaption}
                  >
                    {copiedCaption ? 'Đã sao chép' : 'Sao chép Caption'}
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
                  {[
                    { id: 'review', label: 'Review chi tiết' },
                    { id: 'short', label: 'Ngắn gọn' },
                    { id: 'offer', label: 'Ưu đãi Sale' },
                    { id: 'livestream', label: 'Kịch bản Live' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCaptionTab(tab.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeCaptionTab === tab.id
                          ? 'bg-white text-[#B88E4F] shadow-2xs border border-[#EAE4D7]'
                          : 'text-[#7D715E] hover:text-[#1A1612]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Coupon selector in caption studio */}
                {activeCoupons.length > 0 ? (
                  <div className="flex items-center justify-between text-xs bg-[#FAF8F5] px-3 py-2 rounded-xl border border-[#EAE4D7]">
                    <span className="flex items-center gap-1.5 font-bold text-[#1A1612]">
                      <Tag className="w-3.5 h-3.5 text-[#B88E4F]" />
                      Mã ưu đãi áp dụng trong kịch bản:
                    </span>
                    <select
                      value={selectedCouponId}
                      onChange={(e) => setSelectedCouponId(e.target.value)}
                      className="bg-white border border-[#EAE4D7] rounded-lg px-2 py-1 text-xs font-bold text-[#B88E4F] outline-none cursor-pointer"
                    >
                      {activeCoupons.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayCode} ({c.discountType === 'PERCENTAGE' ? `-${c.discountValue}%` : `-${Number(c.discountValue).toLocaleString('vi-VN')} ₫`})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#7D715E] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#EAE4D7]">
                    ℹ️ Chưa có mã giảm giá đang kích hoạt. Kịch bản đang tạo sẵn theo link tiếp thị chuẩn.
                  </div>
                )}

                {/* Caption Textarea */}
                <textarea
                  readOnly
                  value={captionTemplates[activeCaptionTab]}
                  rows={8}
                  className="w-full p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] leading-relaxed resize-none outline-none font-sans"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewAsset(null)}
                  >
                    Đóng
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      showToast(`Đã tải xuống: ${previewAsset.title}`);
                      setPreviewAsset(null);
                    }}
                  >
                    Tải tài nguyên
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
