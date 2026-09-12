// =====================================================================
// SCANMS - Kho Nội Dung Bán Hàng (Media Hub) - FR-08
// Dành cho KOL / Cộng Tác Viên: Tìm kiếm, lọc, xem trước, tải tệp & caption
// =====================================================================

const productImage = "./assets/serum-hero-optimized.jpg";
const sunscreenImage = "./assets/sunscreen-product.jpg";
const tonerImage = "./assets/toner-bha-product.jpg";
const cleanserImage = "./assets/cleanser-product.jpg";
const cicaMaskImage = "./assets/cica-mask-product.jpg";
const sampleVideoUrl = "./assets/sample-video.mp4";

// Danh mục 5 sản phẩm chuẩn
export const products = [
  {
    id: "ALL",
    name: "Tất cả sản phẩm",
    sku: "ALL",
    price: 0,
    rate: 0,
    category: "Tất cả",
  },
  {
    id: "SKIN-C15",
    name: "Serum vitamin C 15%",
    sku: "SKIN-C15",
    price: 459000,
    rate: 8,
    category: "Chăm sóc da",
    description: "Serum dưỡng sáng mờ thâm, chống oxy hóa với vitamin C tinh khiết 15%.",
  },
  {
    id: "SUN-AQUA",
    name: "Kem chống nắng SPF50+",
    sku: "SUN-AQUA",
    price: 389000,
    rate: 10,
    category: "Bảo vệ da",
    description: "Màng lọc phổ rộng 5 tia, kiềm dầu 8 giờ, kháng nước mồ hôi.",
  },
  {
    id: "TONER-BHA",
    name: "Nước hoa hồng BHA 2%",
    sku: "TONER-BHA",
    price: 320000,
    rate: 9,
    category: "Tẩy tế bào chết",
    description: "Làm sạch sâu bã nhờn, se khít lỗ chân lông, cân bằng pH 3.8.",
  },
  {
    id: "CLEANSER-02",
    name: "Gel rửa mặt dịu nhẹ",
    sku: "CLEANSER-02",
    price: 279000,
    rate: 7,
    category: "Làm sạch",
    description: "Độ pH 5.5 chuẩn da liễu, chiết xuất rau má làm dịu kích ứng.",
  },
  {
    id: "MASK-CICA",
    name: "Mặt nạ phục hồi Cica",
    sku: "MASK-CICA",
    price: 69000,
    rate: 12,
    category: "Chăm sóc da",
    description: "Chiết xuất rau má cô đặc, làm dịu da cấp tốc sau mụn và treatment.",
  },
];

// Kho tài nguyên đa phương tiện
export const mediaAssets = [
  {
    id: "ASSET-01",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Ảnh sản phẩm nền studio 4K",
    type: "photo",
    format: "PNG",
    ratio: "4:3",
    ratioClass: "ratio-4-3",
    resolution: "2400 x 1800 px",
    fileSize: "2.4 MB",
    sizeBytes: 2516582,
    downloads: 412,
    isApproved: true,
    isBroken: false,
    image: productImage,
    recommendedChannels: "Facebook Feed, Website, Bài đăng chi tiết",
    tags: ["Studio", "4K", "Nền trắng", "Routine"],
    updatedAt: "08/09/2026",
  },
  {
    id: "ASSET-02",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Video review routine buổi sáng (Shorts / TikTok)",
    type: "video",
    format: "MP4",
    ratio: "9:16",
    ratioClass: "ratio-9-16",
    resolution: "1080 x 1920 px",
    duration: "00:42",
    durationSec: 42,
    fps: "60 fps",
    bitrate: "8.5 Mbps",
    fileSize: "18.2 MB",
    sizeBytes: 19084083,
    downloads: 856,
    isApproved: true,
    isBroken: false,
    image: productImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "TikTok, Reels, YouTube Shorts",
    tags: ["TikTok", "9:16", "Routine", "Trải nghiệm"],
    updatedAt: "07/09/2026",
  },
  {
    id: "ASSET-03",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Banner ưu đãi Flash Sale Tháng 9 (Vuông)",
    type: "banner",
    format: "PNG",
    ratio: "1:1",
    ratioClass: "ratio-1-1",
    resolution: "1200 x 1200 px",
    fileSize: "1.8 MB",
    sizeBytes: 1887436,
    downloads: 274,
    isApproved: true,
    isBroken: false,
    image: productImage,
    recommendedChannels: "Facebook Feed, Instagram Square, Zalo OA",
    tags: ["Banner", "FlashSale", "1:1", "Giảm 20%"],
    updatedAt: "05/09/2026",
  },
  {
    id: "ASSET-04",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Video hướng dẫn 3 bước kết hợp Serum Vitamin C",
    type: "video",
    format: "MP4",
    ratio: "16:9",
    ratioClass: "ratio-16-9",
    resolution: "1920 x 1080 px",
    duration: "01:15",
    durationSec: 75,
    fps: "60 fps",
    bitrate: "10.2 Mbps",
    fileSize: "24.5 MB",
    sizeBytes: 25690112,
    downloads: 319,
    isApproved: true,
    isBroken: false,
    image: productImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "YouTube Landscape, Facebook Video",
    tags: ["Tutorial", "16:9", "Chuyên sâu", "Da liễu"],
    updatedAt: "03/09/2026",
  },
  {
    id: "ASSET-05",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Banner Story quà tặng kèm độc quyền",
    type: "banner",
    format: "PNG",
    ratio: "9:16",
    ratioClass: "ratio-9-16",
    resolution: "1080 x 1920 px",
    fileSize: "2.1 MB",
    sizeBytes: 2202009,
    downloads: 188,
    isApproved: true,
    isBroken: false,
    image: productImage,
    recommendedChannels: "Instagram Story, Facebook Story, TikTok Photo",
    tags: ["Story", "9:16", "Quà tặng"],
    updatedAt: "02/09/2026",
  },
  {
    id: "ASSET-06",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Ảnh cận cảnh Texture serum thẩm thấu nhanh",
    type: "photo",
    format: "JPG",
    ratio: "1:1",
    ratioClass: "ratio-1-1",
    resolution: "2048 x 2048 px",
    fileSize: "2.8 MB",
    sizeBytes: 2936012,
    downloads: 520,
    isApproved: true,
    isBroken: false,
    image: productImage,
    recommendedChannels: "Instagram Post, Carousel Feed",
    tags: ["Texture", "Macro", "Thẩm thấu"],
    updatedAt: "01/09/2026",
  },
  {
    id: "ASSET-07",
    productId: "SUN-AQUA",
    productName: "Kem chống nắng SPF50+",
    title: "Ảnh chụp ngoại cảnh cùng Kem Chống Nắng SPF50+",
    type: "photo",
    format: "PNG",
    ratio: "4:3",
    ratioClass: "ratio-4-3",
    resolution: "2400 x 1800 px",
    fileSize: "2.1 MB",
    sizeBytes: 2202009,
    downloads: 642,
    isApproved: true,
    isBroken: false,
    image: sunscreenImage,
    recommendedChannels: "Facebook Post, Review Blog",
    tags: ["Outdoor", "Nắng hè", "Lifestyle"],
    updatedAt: "06/09/2026",
  },
  {
    id: "ASSET-08",
    productId: "SUN-AQUA",
    productName: "Kem chống nắng SPF50+",
    title: "Video test kiềm dầu 8 tiếng đi biển thực tế",
    type: "video",
    format: "MP4",
    ratio: "9:16",
    ratioClass: "ratio-9-16",
    resolution: "1080 x 1920 px",
    duration: "00:35",
    durationSec: 35,
    fps: "60 fps",
    bitrate: "8.2 Mbps",
    fileSize: "21.0 MB",
    sizeBytes: 22020096,
    downloads: 914,
    isApproved: true,
    isBroken: false,
    image: sunscreenImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "TikTok, Reels, Shorts",
    tags: ["Kiềm dầu", "Kháng nước", "Test thực tế"],
    updatedAt: "05/09/2026",
  },
  {
    id: "ASSET-09",
    productId: "SUN-AQUA",
    productName: "Kem chống nắng SPF50+",
    title: "Banner so sánh màng lọc chống nắng thế hệ mới",
    type: "banner",
    format: "PNG",
    ratio: "16:9",
    ratioClass: "ratio-16-9",
    resolution: "1920 x 1080 px",
    fileSize: "1.9 MB",
    sizeBytes: 1992294,
    downloads: 388,
    isApproved: true,
    isBroken: false,
    image: sunscreenImage,
    recommendedChannels: "Website, Bài viết chuyên sâu",
    tags: ["Infographic", "SPF50+", "16:9"],
    updatedAt: "04/09/2026",
  },
  {
    id: "ASSET-10",
    productId: "TONER-BHA",
    productName: "Nước hoa hồng BHA 2%",
    title: "Ảnh bộ đôi làm sạch sâu Toner BHA và Bông tẩy trang",
    type: "photo",
    format: "JPG",
    ratio: "1:1",
    ratioClass: "ratio-1-1",
    resolution: "2048 x 2048 px",
    fileSize: "2.2 MB",
    sizeBytes: 2306867,
    downloads: 405,
    isApproved: true,
    isBroken: false,
    image: tonerImage,
    recommendedChannels: "Instagram Feed, Shopee Feed",
    tags: ["Flatlay", "BHA 2%", "Skincare"],
    updatedAt: "04/09/2026",
  },
  {
    id: "ASSET-11",
    productId: "TONER-BHA",
    productName: "Nước hoa hồng BHA 2%",
    title: "Video hướng dẫn đẩy mụn ẩn đúng cách cùng BHA",
    type: "video",
    format: "MP4",
    ratio: "9:16",
    ratioClass: "ratio-9-16",
    resolution: "1080 x 1920 px",
    duration: "00:45",
    durationSec: 45,
    fps: "60 fps",
    bitrate: "8.8 Mbps",
    fileSize: "16.4 MB",
    sizeBytes: 17196646,
    downloads: 720,
    isApproved: true,
    isBroken: false,
    image: tonerImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "TikTok, Instagram Reels",
    tags: ["Mụn ẩn", "Lỗ chân lông", "9:16"],
    updatedAt: "03/09/2026",
  },
  {
    id: "ASSET-12",
    productId: "CLEANSER-02",
    productName: "Gel rửa mặt dịu nhẹ",
    title: "Ảnh bọt rửa mặt pH 5.5 dịu nhẹ không căng rát",
    type: "photo",
    format: "JPG",
    ratio: "4:3",
    ratioClass: "ratio-4-3",
    resolution: "2400 x 1800 px",
    fileSize: "1.7 MB",
    sizeBytes: 1782579,
    downloads: 260,
    isApproved: true,
    isBroken: false,
    image: cleanserImage,
    recommendedChannels: "Facebook, Shopee Feed",
    tags: ["pH 5.5", "Dịu nhẹ", "Làm sạch"],
    updatedAt: "02/09/2026",
  },
  {
    id: "ASSET-13",
    productId: "MASK-CICA",
    productName: "Mặt nạ phục hồi Cica",
    title: "Video ASMR đắp mặt nạ làm dịu da cấp tốc",
    type: "video",
    format: "MP4",
    ratio: "9:16",
    ratioClass: "ratio-9-16",
    resolution: "1080 x 1920 px",
    duration: "00:40",
    durationSec: 40,
    fps: "60 fps",
    bitrate: "7.9 Mbps",
    fileSize: "19.2 MB",
    sizeBytes: 20132659,
    downloads: 580,
    isApproved: true,
    isBroken: false,
    image: cicaMaskImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "TikTok ASMR, Reels",
    tags: ["ASMR", "Rau má", "Cica", "Phục hồi"],
    updatedAt: "01/09/2026",
  },
  {
    id: "ASSET-14",
    productId: "SKIN-C15",
    productName: "Serum vitamin C 15%",
    title: "Video TVC Chiến dịch Mùa hè (Tệp mô phỏng hết hạn)",
    type: "video",
    format: "MP4",
    ratio: "16:9",
    ratioClass: "ratio-16-9",
    resolution: "1920 x 1080 px",
    duration: "00:50",
    durationSec: 50,
    fps: "30 fps",
    bitrate: "6.0 Mbps",
    fileSize: "32.0 MB",
    sizeBytes: 33554432,
    downloads: 14,
    isApproved: false,
    isBroken: true,
    image: productImage,
    videoUrl: sampleVideoUrl,
    recommendedChannels: "Chiến dịch đã kết thúc",
    tags: ["Mô phỏng lỗi", "Hết hạn", "CDN Timeout"],
    updatedAt: "15/08/2026",
  },
];

// 4 Mẫu nội dung Caption chuẩn hóa (không khẳng định chưa kiểm chứng)
export const captionPresets = {
  short: {
    id: "short",
    label: "Giới thiệu ngắn",
    template: `Gợi ý chăm sóc da sáng khỏe mỗi ngày cùng {PRODUCT_NAME} ✨

Tinh chất mỏng nhẹ, thẩm thấu nhanh, hỗ trợ cấp ẩm và cải thiện bề mặt da mềm mịn.

👉 Đặt mua chính hãng qua link định danh: {AFFILIATE_LINK}
🎁 Nhập ngay mã ưu đãi {COUPON_CODE} để được giảm thêm 10% khi đặt hàng!

{HASHTAGS}`,
  },
  review: {
    id: "review",
    label: "Review chi tiết",
    template: `[GÓC REVIEW TỪ {KOL_NAME}]
Trải nghiệm thực tế khi sử dụng {PRODUCT_NAME}:

💧 Cảm quan kết cấu: Tinh chất mỏng nhẹ, thấm nhanh trong khoảng 15 giây, không gây bết dính hay bóng nhờn.
🔬 Bảng thành phần: Nồng độ hoạt chất cân bằng kết hợp dưỡng chất làm dịu, phù hợp cho chu trình dưỡng da hàng ngày.
🎯 Cảm nhận sau 3 tuần: Bề mặt da trông tươi sáng, ẩm mịn và rạng rỡ hơn khi duy trì đều đặn sáng tối.

💰 Giá tham khảo: {PRODUCT_PRICE}
🛒 Link mua hàng chính hãng từ Shop: {AFFILIATE_LINK}
🏷️ Mã ưu đãi dành riêng: {COUPON_CODE}

{HASHTAGS}`,
  },
  offer: {
    id: "offer",
    label: "Ưu đãi",
    template: `🎁 ƯU ĐÃI ĐẶC BIỆT DÀNH CHO CỘNG ĐỒNG CỦA {KOL_NAME}!

Chương trình ưu đãi tháng cho sản phẩm {PRODUCT_NAME} chính hãng:
⚡ Giá ưu đãi chỉ: {PRODUCT_PRICE}
⚡ Tặng kèm quà tặng sample dùng thử độc quyền cho đơn hàng sớm
⚡ Áp dụng mã {COUPON_CODE} tại bước thanh toán để nhận thêm giảm giá 10%!

👉 Đặt mua ngay qua link: {AFFILIATE_LINK}

{HASHTAGS}`,
  },
  livestream: {
    id: "livestream",
    label: "Kịch bản livestream",
    template: `🌟 GỢI Ý KỊCH BẢN CHIA SẺ TRÊN LIVESTREAM:

1. Mở đầu: Cầm sản phẩm {PRODUCT_NAME}, zoom cận chất tinh chất lên camera để người xem thấy độ sánh nhẹ tự nhiên.
2. Trải nghiệm: Thoa thử lên mu bàn tay, chia sẻ cảm giác mát mịn và thấm nhanh không nhờn dính.
3. Kêu gọi: Hướng dẫn người xem bấm vào link ghim {AFFILIATE_LINK}, nhập mã {COUPON_CODE} để nhận hàng chính hãng từ Shop Sora Skin!

👉 Link ghim: {AFFILIATE_LINK}
🏷️ Mã ưu đãi: {COUPON_CODE}

{HASHTAGS}`,
  },
};

// State nội bộ của Media Hub
export const mediaState = {
  // Bộ lọc tài nguyên
  selectedProduct: "ALL",
  selectedType: "all", // all, photo, video, banner, caption
  selectedRatio: "all", // all, 9:16, 1:1, 16:9, 4:3
  searchQuery: "",
  sortBy: "latest", // latest, downloads, size
  uiMode: "normal", // normal, loading, empty, error

  // Dropdowns & Popovers
  isProductDropdownOpen: false,
  productSearchQuery: "",
  isRatioPopoverOpen: false,
  isMobileFilterDrawerOpen: false,

  // Soạn Caption Studio
  activeCaptionPreset: "short", // short, review, offer, livestream
  customCaptionText: null, // null khi dùng mẫu gốc, chuỗi khi người dùng gõ sửa
  isCaptionModified: false,
  includeLink: true,
  includeCoupon: true,
  includeHashtags: true,
  customLink: "",
  customCoupon: "NHATXINH10",
  customHashtags: "#SoraSkin #ReviewMyPham #Affiliate",
  isInsertPopoverOpen: false,
  isPreviewDrawerOpen: false,
  socialPreviewPlatform: "tiktok", // tiktok, facebook, threads

  // Modals
  activeModal: null, // preview-image, preview-video, guidelines, download-progress
  selectedAsset: null,
  downloadProgress: 0,
  zoomLevel: 100,
  rotation: 0,
  videoPlaying: false,
  videoCurrentTime: 0,
  videoDuration: 42,
  videoVolume: 1,
  videoPlaybackRate: 1,
};

// Định dạng tiền tệ VND
function money(val) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

// Xử lý Escape HTML an toàn
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Lấy tên hiển thị của loại tài nguyên
function getTypeName(type) {
  switch (type) {
    case "photo": return "Ảnh";
    case "video": return "Video";
    case "banner": return "Banner";
    case "caption": return "Caption";
    default: return "Tất cả";
  }
}

// Biên dịch caption dựa trên preset hoặc nội dung tùy chỉnh
function compileCaptionText(currentProduct) {
  if (mediaState.isCaptionModified && mediaState.customCaptionText !== null) {
    return mediaState.customCaptionText;
  }

  const activePreset = captionPresets[mediaState.activeCaptionPreset] || captionPresets.short;
  const kolName = "Trần Văn Nhật";
  const couponCode = mediaState.customCoupon || "NHATXINH10";
  const defaultAffiliate = `https://scanms.vn/r/ref_nhat_${currentProduct.id.toLowerCase() === "all" ? "skinc15" : currentProduct.id.toLowerCase()}`;
  const affiliateLink = mediaState.customLink || defaultAffiliate;
  const productPrice = money(currentProduct.price || 459000);
  const hashtags = mediaState.customHashtags || "#SoraSkin #ReviewMyPham #Affiliate";

  let text = activePreset.template
    .replace(/\{PRODUCT_NAME\}/g, currentProduct.id !== "ALL" ? currentProduct.name : "Serum vitamin C 15%")
    .replace(/\{KOL_NAME\}/g, kolName)
    .replace(/\{COUPON_CODE\}/g, couponCode)
    .replace(/\{AFFILIATE_LINK\}/g, affiliateLink)
    .replace(/\{PRODUCT_PRICE\}/g, productPrice)
    .replace(/\{HASHTAGS\}/g, hashtags);

  if (!mediaState.includeLink) {
    text = text.replace(new RegExp(escapeRegex(affiliateLink), "g"), "[Link tại bio]");
  }
  if (!mediaState.includeCoupon) {
    text = text.replace(new RegExp(escapeRegex(couponCode), "g"), "Ưu đãi Shop");
  }
  if (!mediaState.includeHashtags) {
    text = text.replace(new RegExp(escapeRegex(hashtags), "g"), "").trim();
  }

  return text;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =====================================================================
// 1. RENDER GIAO DIỆN CHÍNH (mediaPage)
// =====================================================================
export function mediaPage(globalState = {}) {
  const currentProduct = products.find((p) => p.id === mediaState.selectedProduct) || products[0];

  // Lọc danh sách tài nguyên
  let filtered = mediaAssets.filter((asset) => {
    // Lọc theo sản phẩm
    if (mediaState.selectedProduct !== "ALL" && asset.productId !== mediaState.selectedProduct) {
      return false;
    }
    // Lọc theo loại
    if (mediaState.selectedType !== "all" && asset.type !== mediaState.selectedType) {
      return false;
    }
    // Lọc theo tỷ lệ
    if (mediaState.selectedRatio !== "all" && asset.ratio !== mediaState.selectedRatio) {
      return false;
    }
    // Lọc theo tìm kiếm
    if (mediaState.searchQuery.trim()) {
      const q = mediaState.searchQuery.toLowerCase().trim();
      const matchTitle = asset.title.toLowerCase().includes(q);
      const matchProd = asset.productName.toLowerCase().includes(q);
      const matchTag = asset.tags.some((t) => t.toLowerCase().includes(q));
      const matchExt = asset.format.toLowerCase().includes(q);
      if (!matchTitle && !matchProd && !matchTag && !matchExt) return false;
    }
    return true;
  });

  // Sắp xếp
  if (mediaState.sortBy === "downloads") {
    filtered = [...filtered].sort((a, b) => b.downloads - a.downloads);
  } else if (mediaState.sortBy === "size") {
    filtered = [...filtered].sort((a, b) => a.sizeBytes - b.sizeBytes);
  }

  // Đếm số lượng theo loại
  const photoCount = mediaAssets.filter((a) => a.type === "photo").length;
  const videoCount = mediaAssets.filter((a) => a.type === "video").length;
  const bannerCount = mediaAssets.filter((a) => a.type === "banner").length;

  // Lọc danh sách sản phẩm trong dropdown tìm kiếm sản phẩm
  const pQuery = mediaState.productSearchQuery.toLowerCase().trim();
  const searchFilteredProducts = products.filter((p) => {
    if (!pQuery) return true;
    return p.name.toLowerCase().includes(pQuery) || p.sku.toLowerCase().includes(pQuery);
  });

  // Kiểm tra xem có bất kỳ điều kiện lọc nào đang áp dụng không
  const hasActiveFilters =
    mediaState.searchQuery.trim() !== "" ||
    mediaState.selectedProduct !== "ALL" ||
    mediaState.selectedType !== "all" ||
    mediaState.selectedRatio !== "all";

  // Số lượng tài nguyên của sản phẩm đang chọn
  const currentProdAssetCount =
    mediaState.selectedProduct === "ALL"
      ? mediaAssets.length
      : mediaAssets.filter((a) => a.productId === mediaState.selectedProduct).length;

  return `
    <div class="media-workspace">
      <!-- HEADER CHÍNH -->
      <header class="page-head media-page-head">
        <div class="media-head-col">
          <div class="crumb"><span>Tiếp thị liên kết / </span><strong>Kho nội dung bán hàng</strong></div>
          <h1>Kho nội dung bán hàng</h1>
          <p>Tài nguyên hình ảnh, video review và caption do Shop cung cấp, sẵn sàng quảng bá trên mạng xã hội.</p>

          <!-- 2 Nút Chuyển Sang Bên Trái & Thiết Kế Lại Cao Cấp -->
          <div class="media-header-left-controls">
            <!-- Chế độ kiểm thử UI/UX Capsule -->
            <div class="media-state-capsule" title="Chuyển đổi trạng thái trải nghiệm để kiểm thử UI/UX">
              <span class="media-capsule-icon-wrap"><i class="ph ph-sliders"></i></span>
              <select class="media-state-select" id="media-mode-select" aria-label="Chọn chế độ hiển thị UI/UX">
                <option value="normal" ${mediaState.uiMode === "normal" ? "selected" : ""}>Chế độ: Bình thường</option>
                <option value="loading" ${mediaState.uiMode === "loading" ? "selected" : ""}>Chế độ: Đang tải (Skeleton)</option>
                <option value="empty" ${mediaState.uiMode === "empty" ? "selected" : ""}>Chế độ: Kho trống (Empty)</option>
                <option value="error" ${mediaState.uiMode === "error" ? "selected" : ""}>Chế độ: Lỗi CDN (Error)</option>
              </select>
            </div>

            <!-- Nút Mở Hướng dẫn & Quy định -->
            <button class="media-guidelines-btn" id="btn-open-guidelines" title="Xem quy định bản quyền và khuyến nghị đăng bài">
              <i class="ph ph-book-open"></i> <span>Quy định sử dụng</span>
            </button>
          </div>
        </div>
      </header>

      <!-- BANNER SHOP THU GỌN 1 DÒNG DUY NHẤT -->
      <section class="media-compact-banner">
        <div class="media-banner-brand">
          <div class="media-banner-icon" title="Cửa hàng chính hãng Sora Skin">
            <i class="ph ph-storefront"></i>
          </div>
          <div class="media-banner-info">
            <span class="media-banner-name">Sora Skin Official Store</span>
            <span class="media-banner-badge"><i class="ph ph-shield-check"></i> Tài nguyên Shop cung cấp</span>
          </div>
        </div>
        <div class="media-banner-meta">
          <span class="media-banner-meta-item"><i class="ph ph-clock-counter-clockwise"></i> Cập nhật: <strong>08/09/2026</strong></span>
          <span class="media-banner-meta-item"><i class="ph ph-files"></i> Tổng số: <strong>${mediaAssets.length} tài nguyên</strong></span>
        </div>
      </section>

      <!-- THANH LỌC CHÍNH (ĐÚNG THỨ TỰ: TÌM KIẾM -> SP -> LOẠI -> BỘ LỌC TỶ LỆ -> SẮP XẾP) -->
      <section class="media-filter-bar-container">
        <div class="media-main-filter-bar">
          <!-- 1. Ô tìm kiếm tài nguyên -->
          <div class="media-search-input-wrap">
            <i class="ph ph-magnifying-glass"></i>
            <input 
              type="text" 
              class="media-search-input" 
              id="media-search-input" 
              placeholder="Tìm theo tên, định dạng (.mp4), routine..."
              value="${escapeHtml(mediaState.searchQuery)}"
            />
            ${mediaState.searchQuery ? `<button class="media-search-clear" id="btn-clear-search-input"><i class="ph ph-x"></i></button>` : ""}
          </div>

          <!-- 2. Dropdown sản phẩm kèm tìm kiếm bên trong -->
          <div class="media-dropdown-relative" id="prod-dropdown-wrap">
            <button class="media-filter-trigger ${mediaState.selectedProduct !== "ALL" ? "is-active" : ""}" id="btn-product-dropdown-trigger" type="button">
              <i class="ph ph-package"></i>
              <span class="trigger-label">${escapeHtml(currentProduct.name)}</span>
              <span class="trigger-count">(${currentProdAssetCount})</span>
              <i class="ph ph-caret-down"></i>
            </button>

            <!-- Menu popover sản phẩm -->
            <div class="media-product-dropdown-menu ${mediaState.isProductDropdownOpen ? "open" : ""}" id="prod-dropdown-menu">
              <div class="product-dropdown-search-box">
                <i class="ph ph-magnifying-glass"></i>
                <input 
                  type="text" 
                  id="input-search-product" 
                  placeholder="Tìm sản phẩm..." 
                  value="${escapeHtml(mediaState.productSearchQuery)}"
                />
              </div>
              <div class="product-dropdown-list">
                ${searchFilteredProducts.map((p) => {
                  const count = p.id === "ALL" ? mediaAssets.length : mediaAssets.filter((a) => a.productId === p.id).length;
                  const isSelected = mediaState.selectedProduct === p.id;
                  return `
                    <div class="product-dropdown-item ${isSelected ? "selected" : ""}" data-product-id="${p.id}">
                      <div class="product-item-name">
                        ${isSelected ? `<i class="ph ph-check" style="color:var(--brand)"></i>` : `<i class="ph ph-circle" style="opacity:0.25"></i>`}
                        <span>${escapeHtml(p.name)}</span>
                      </div>
                      <span class="product-item-count">${count} tệp</span>
                    </div>
                  `;
                }).join("")}
                ${searchFilteredProducts.length === 0 ? `<div class="product-dropdown-empty">Không tìm thấy sản phẩm</div>` : ""}
              </div>
            </div>
          </div>

          <!-- 3. Dropdown Loại nội dung -->
          <div class="media-type-select-wrap">
            <select class="media-native-select" id="media-type-select">
              <option value="all" ${mediaState.selectedType === "all" ? "selected" : ""}>Tất cả loại (${mediaAssets.length})</option>
              <option value="photo" ${mediaState.selectedType === "photo" ? "selected" : ""}>Ảnh (${photoCount})</option>
              <option value="video" ${mediaState.selectedType === "video" ? "selected" : ""}>Video (${videoCount})</option>
              <option value="banner" ${mediaState.selectedType === "banner" ? "selected" : ""}>Banner (${bannerCount})</option>
              <option value="caption" ${mediaState.selectedType === "caption" ? "selected" : ""}>Caption</option>
            </select>
          </div>

          <!-- 4. Nút Bộ lọc (Mở Popover tỷ lệ khung hình) -->
          <div class="media-dropdown-relative" id="ratio-popover-wrap">
            <button class="media-filter-trigger ${mediaState.selectedRatio !== "all" ? "has-badge" : ""}" id="btn-ratio-popover-trigger" type="button">
              <i class="ph ph-sliders-horizontal"></i>
              <span>Bộ lọc</span>
              ${mediaState.selectedRatio !== "all" ? `<span class="filter-active-pill">${mediaState.selectedRatio}</span>` : ""}
              <i class="ph ph-caret-down"></i>
            </button>

            <!-- Popover Bộ lọc tỷ lệ khung hình -->
            <div class="media-ratio-popover ${mediaState.isRatioPopoverOpen ? "open" : ""}" id="ratio-popover-menu">
              <div class="ratio-popover-header">
                <strong>Tỷ lệ khung hình</strong>
                <button class="text-btn" id="btn-reset-ratio" style="font-size:11.5px">Mặc định</button>
              </div>
              <div class="ratio-popover-options">
                <label class="ratio-option ${mediaState.selectedRatio === "all" ? "active" : ""}">
                  <input type="radio" name="ratio-opt" value="all" ${mediaState.selectedRatio === "all" ? "checked" : ""} />
                  <span>Tất cả tỷ lệ</span>
                </label>
                <label class="ratio-option ${mediaState.selectedRatio === "9:16" ? "active" : ""}">
                  <input type="radio" name="ratio-opt" value="9:16" ${mediaState.selectedRatio === "9:16" ? "checked" : ""} />
                  <span><i class="ph ph-device-mobile"></i> 9:16 (Dọc TikTok/Reels)</span>
                </label>
                <label class="ratio-option ${mediaState.selectedRatio === "1:1" ? "active" : ""}">
                  <input type="radio" name="ratio-opt" value="1:1" ${mediaState.selectedRatio === "1:1" ? "checked" : ""} />
                  <span><i class="ph ph-bounding-box"></i> 1:1 (Vuông Feed)</span>
                </label>
                <label class="ratio-option ${mediaState.selectedRatio === "16:9" ? "active" : ""}">
                  <input type="radio" name="ratio-opt" value="16:9" ${mediaState.selectedRatio === "16:9" ? "checked" : ""} />
                  <span><i class="ph ph-monitor"></i> 16:9 (Ngang Web/YT)</span>
                </label>
                <label class="ratio-option ${mediaState.selectedRatio === "4:3" ? "active" : ""}">
                  <input type="radio" name="ratio-opt" value="4:3" ${mediaState.selectedRatio === "4:3" ? "checked" : ""} />
                  <span><i class="ph ph-frame-corners"></i> 4:3 (Tiêu chuẩn)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 5. Dropdown Sắp xếp -->
          <div class="media-sort-select-wrap">
            <select class="media-native-select" id="media-sort-select">
              <option value="latest" ${mediaState.sortBy === "latest" ? "selected" : ""}>Mới nhất</option>
              <option value="downloads" ${mediaState.sortBy === "downloads" ? "selected" : ""}>Lượt tải nhiều nhất</option>
              <option value="size" ${mediaState.sortBy === "size" ? "selected" : ""}>Dung lượng file</option>
            </select>
          </div>
        </div>

        <!-- HÀNG NHÃN LỌC ĐÃ ÁP DỤNG (ACTIVE FILTERS ROW) -->
        <div class="media-active-filters-row ${hasActiveFilters ? "active" : ""}">
          <div class="active-tags-list">
            ${hasActiveFilters ? `<span class="active-tags-title">Đang lọc:</span>` : ""}

            ${mediaState.searchQuery ? `
              <span class="active-tag-chip">
                <span>Từ khóa: <strong>"${escapeHtml(mediaState.searchQuery)}"</strong></span>
                <button type="button" class="btn-remove-tag" data-remove-filter="search" title="Xóa từ khóa"><i class="ph ph-x"></i></button>
              </span>
            ` : ""}

            ${mediaState.selectedProduct !== "ALL" ? `
              <span class="active-tag-chip">
                <span>Sản phẩm: <strong>${escapeHtml(currentProduct.name)}</strong></span>
                <button type="button" class="btn-remove-tag" data-remove-filter="product" title="Bỏ lọc sản phẩm"><i class="ph ph-x"></i></button>
              </span>
            ` : ""}

            ${mediaState.selectedType !== "all" ? `
              <span class="active-tag-chip">
                <span>Loại: <strong>${getTypeName(mediaState.selectedType)}</strong></span>
                <button type="button" class="btn-remove-tag" data-remove-filter="type" title="Bỏ lọc loại"><i class="ph ph-x"></i></button>
              </span>
            ` : ""}

            ${mediaState.selectedRatio !== "all" ? `
              <span class="active-tag-chip">
                <span>Tỷ lệ: <strong>${mediaState.selectedRatio}</strong></span>
                <button type="button" class="btn-remove-tag" data-remove-filter="ratio" title="Bỏ lọc tỷ lệ"><i class="ph ph-x"></i></button>
              </span>
            ` : ""}

            ${hasActiveFilters ? `
              <button class="btn-clear-all-filters" id="btn-clear-all-filters" type="button">
                <i class="ph ph-arrows-counter-clockwise"></i> Xóa tất cả bộ lọc
              </button>
            ` : ""}
          </div>

          <div class="active-results-summary">
            Hiển thị <strong>${filtered.length}</strong> / ${mediaAssets.length} tài nguyên phù hợp
          </div>
        </div>
      </section>

      <!-- PHẦN HIỂN THỊ KHO NỘI DUNG (DỰA THEO CHẾ ĐỘ UI MODE) -->
      ${renderContentBody(filtered, globalState)}

      <!-- KHU VỰC SOẠN CAPTION TIẾP THỊ (CHỈ HIỂN THỊ KHI Ở CHẾ ĐỘ NORMAL HOẶC TYPE LÀ CAPTION/ALL) -->
      ${
        mediaState.uiMode === "normal" && (mediaState.selectedType === "all" || mediaState.selectedType === "caption")
          ? renderCaptionStudio(currentProduct, globalState)
          : ""
      }

      <!-- MODAL XEM TRƯỚC VÀ TIẾN TRÌNH TẢI -->
      <div id="media-modal-container">
        ${renderActiveModal(globalState)}
      </div>

      <!-- MOBILE BOTTOM SHEET CHO BỘ LỌC -->
      ${renderMobileFilterDrawer(currentProduct)}
    </div>
  `;
}

// ---------------------------------------------------------------------
// 2. RENDER KHỐI NỘI DUNG CHÍNH (BODY)
// ---------------------------------------------------------------------
function renderContentBody(filtered, globalState) {
  // 1. Trạng thái Đang tải Skeleton
  if (mediaState.uiMode === "loading") {
    return `
      <div class="media-skeleton-grid">
        ${Array.from({ length: 8 })
          .map(
            () => `
          <div class="media-skeleton-card">
            <div class="media-skeleton-visual"></div>
            <div class="media-skeleton-body">
              <div class="media-skeleton-line" style="width: 75%;"></div>
              <div class="media-skeleton-line" style="width: 50%;"></div>
              <div class="media-skeleton-line" style="width: 90%; height: 32px; margin-top: 6px;"></div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // 2. Trạng thái Lỗi máy chủ / CDN
  if (mediaState.uiMode === "error") {
    return `
      <div class="media-error-card">
        <div class="media-state-icon">
          <i class="ph ph-warning-octagon"></i>
        </div>
        <h3>Không thể kết nối đến máy chủ lưu trữ tài nguyên CDN</h3>
        <p>Đã xảy ra lỗi mạng hoặc máy chủ phân phối tệp tạm thời không phản hồi. Bạn có thể thử kết nối lại hoặc liên hệ hỗ trợ từ Shop.</p>
        <div style="display: flex; gap: 10px;">
          <button class="btn" id="btn-retry-cdn"><i class="ph ph-arrow-clockwise"></i> Thử lại kết nối</button>
          <button class="btn secondary" data-go="chat"><i class="ph ph-chats"></i> Báo lỗi cho Shop</button>
        </div>
      </div>
    `;
  }

  // 3. Trạng thái Không có kết quả hoặc Kho trống
  if (mediaState.uiMode === "empty" || filtered.length === 0) {
    return `
      <div class="media-empty-card">
        <div class="media-state-icon">
          <i class="ph ph-folder-notch-open"></i>
        </div>
        <h3>Không tìm thấy tài nguyên phù hợp</h3>
        <p>Không có hình ảnh hoặc video nào khớp với điều kiện lọc hiện tại.</p>
        <button class="btn secondary" id="btn-empty-reset"><i class="ph ph-arrows-counter-clockwise"></i> Xóa bộ lọc & Xem tất cả</button>
      </div>
    `;
  }

  // 4. Trạng thái Bình thường: Render Grid các thẻ Card
  return `
    <div class="media-asset-grid">
      ${filtered.map((asset) => renderAssetCard(asset)).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------
// 3. RENDER TỪNG THẺ TÀI NGUYÊN (renderAssetCard)
// ---------------------------------------------------------------------
function renderAssetCard(asset) {
  const isVideo = asset.type === "video";
  const isBanner = asset.type === "banner";

  let tagClass = "tag-photo";
  let typeLabel = "Ảnh PNG";
  let typeIcon = "ph-image";

  if (isVideo) {
    tagClass = "tag-video";
    typeLabel = "Video MP4";
    typeIcon = "ph-video-camera";
  } else if (isBanner) {
    tagClass = "tag-banner";
    typeLabel = "Banner";
    typeIcon = "ph-megaphone";
  }

  return `
    <article class="media-card" data-asset-id="${asset.id}">
      <!-- KHUNG HÌNH PREVIEW -->
      <div class="media-card-visual ${asset.ratioClass} action-preview" data-asset-id="${asset.id}" title="Bấm xem chi tiết">
        <img src="${asset.image}" alt="${escapeHtml(asset.title)}" class="media-card-img" loading="lazy" />

        <!-- BADGE NHÃN TRÊN ẢNH (GÓC TRÊN TRÁI) -->
        <div class="media-badge-group">
          <span class="media-tag-pill ${tagClass}">
            <i class="ph ${typeIcon}"></i> ${typeLabel}
          </span>
          <span class="media-tag-pill tag-ratio">
            ${asset.ratio} • ${asset.fileSize}
          </span>
        </div>

        ${
          isVideo
            ? `
          <div class="media-video-play-hint action-preview" data-asset-id="${asset.id}" title="Bấm phát video">
            <i class="ph ph-play"></i>
          </div>
          <span class="media-video-duration">${asset.duration}</span>
        `
            : ""
        }

        ${
          asset.isBroken
            ? `
          <div style="position:absolute;inset:0;background:rgba(184,58,66,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:12px;text-align:center;z-index:4">
            <i class="ph ph-warning" style="font-size:28px;margin-bottom:6px"></i>
            <strong style="font-size:13px">Tệp không còn khả dụng</strong>
            <small style="font-size:11px;opacity:0.9">Chiến dịch đã hết hạn</small>
          </div>
        `
            : ""
        }

        <!-- NÚT HOVER NHANH (GÓC TRÊN PHẢI) -->
        <div class="media-card-quick-actions">
          <button class="media-quick-btn action-preview" data-asset-id="${asset.id}" title="Xem trước phóng to" aria-label="Xem trước phóng to">
            <i class="ph ph-eye"></i>
          </button>
          ${
            !asset.isBroken
              ? `
            <button class="media-quick-btn action-download" data-asset-id="${asset.id}" title="Tải tệp về máy tính" aria-label="Tải tệp về máy">
              <i class="ph ph-download-simple"></i>
            </button>
          `
              : ""
          }
        </div>
      </div>

      <!-- NỘI DUNG THÔNG TIN -->
      <div class="media-card-body">
        <div class="media-card-title-row">
          <h3 class="media-card-title" title="${escapeHtml(asset.title)}">${escapeHtml(asset.title)}</h3>
        </div>

        <span class="media-card-product-tag">
          <i class="ph ph-tag"></i> ${escapeHtml(asset.productName)}
        </span>

        <div class="media-card-meta-list">
          <span class="media-card-meta-item" title="Độ phân giải thực">
            <i class="ph ph-arrows-out"></i> ${asset.resolution}
          </span>
          ${
            isVideo
              ? `<span class="media-card-meta-item" title="Tốc độ khung hình"><i class="ph ph-film-strip"></i> ${asset.fps}</span>`
              : ""
          }
        </div>

        <div class="media-card-stats">
          <span class="media-card-downloads">
            <i class="ph ph-download"></i> ${asset.downloads} lượt tải
          </span>
          <span style="color:var(--brand);font-weight:600;display:flex;align-items:center;gap:3px">
            <i class="ph ph-check-circle"></i> Shop đã duyệt
          </span>
        </div>

        <!-- CỤM NÚT HÀNH ĐỘNG -->
        <div class="media-card-actions">
          <button class="btn small secondary action-preview" data-asset-id="${asset.id}">
            <i class="ph ph-eye"></i> Xem trước
          </button>
          ${
            asset.isBroken
              ? `
            <button class="btn small danger action-retry-file" data-asset-id="${asset.id}">
              <i class="ph ph-arrow-clockwise"></i> Thử lại
            </button>
          `
              : `
            <button class="btn small action-download" data-asset-id="${asset.id}">
              <i class="ph ph-download-simple"></i> Tải xuống
            </button>
          `
          }
        </div>
      </div>
    </article>
  `;
}

// ---------------------------------------------------------------------
// 4. RENDER SOẠN CAPTION (CAPTION STUDIO - 1 CỘT GỌN & DRAWER XEM TRƯỚC)
// ---------------------------------------------------------------------
function renderCaptionStudio(currentProduct, globalState) {
  const kolName = "Trần Văn Nhật";
  const defaultAffiliate = `https://scanms.vn/r/ref_nhat_${currentProduct.id.toLowerCase() === "all" ? "skinc15" : currentProduct.id.toLowerCase()}`;
  const affiliateLink = mediaState.customLink || defaultAffiliate;
  const couponCode = mediaState.customCoupon || "NHATXINH10";
  const productPrice = money(currentProduct.price || 459000);
  const currentText = compileCaptionText(currentProduct);

  return `
    <section class="media-caption-studio" id="caption-studio-section">
      <!-- HEADER GỌN 1 HÀNG: TIÊU ĐỀ + TRẠNG THÁI + NÚT XEM TRƯỚC -->
      <div class="media-caption-header-v2">
        <div class="caption-header-left">
          <h2 class="caption-title">Soạn caption</h2>
          ${
            mediaState.isCaptionModified
              ? `<span class="caption-badge edited" id="caption-status-badge"><i class="ph ph-pencil-simple-line"></i> Đã chỉnh sửa từ mẫu Shop</span>`
              : `<span class="caption-badge verified" id="caption-status-badge"><i class="ph ph-shield-check"></i> Đã duyệt bởi Shop</span>`
          }
        </div>
        <div class="caption-header-right">
          <button class="btn secondary small btn-preview-trigger" id="btn-open-caption-drawer" type="button" aria-label="Mở xem trước bài đăng">
            <i class="ph ph-eye"></i>
            <span>Xem trước</span>
          </button>
        </div>
      </div>

      <!-- THANH CÔNG CỤ: DROPDOWN MẪU + 3 CHECKBOX + POPOVER THÔNG TIN CHÈN -->
      <div class="caption-toolbar-v2">
        <div class="caption-toolbar-preset">
          <label for="caption-preset-select" class="caption-field-label">Mẫu nội dung:</label>
          <select class="media-native-select caption-select" id="caption-preset-select">
            <option value="short" ${mediaState.activeCaptionPreset === "short" ? "selected" : ""}>Giới thiệu ngắn</option>
            <option value="review" ${mediaState.activeCaptionPreset === "review" ? "selected" : ""}>Review chi tiết</option>
            <option value="offer" ${mediaState.activeCaptionPreset === "offer" ? "selected" : ""}>Ưu đãi</option>
            <option value="livestream" ${mediaState.activeCaptionPreset === "livestream" ? "selected" : ""}>Kịch bản livestream</option>
          </select>
        </div>

        <div class="caption-toolbar-inserts">
          <div class="caption-checkbox-group">
            <label class="caption-checkbox-label" title="Bật/tắt link tiếp thị">
              <input type="checkbox" id="switch-link" ${mediaState.includeLink ? "checked" : ""} />
              <span>Link</span>
            </label>
            <label class="caption-checkbox-label" title="Bật/tắt mã ưu đãi">
              <input type="checkbox" id="switch-coupon" ${mediaState.includeCoupon ? "checked" : ""} />
              <span>Coupon</span>
            </label>
            <label class="caption-checkbox-label" title="Bật/tắt hashtag">
              <input type="checkbox" id="switch-hashtags" ${mediaState.includeHashtags ? "checked" : ""} />
              <span>Hashtag</span>
            </label>
          </div>

          <!-- Popover Thông tin chèn -->
          <div class="caption-popover-anchor">
            <button class="btn-popover-trigger ${mediaState.isInsertPopoverOpen ? "active" : ""}" id="btn-toggle-insert-info" type="button" aria-expanded="${mediaState.isInsertPopoverOpen}" title="Tùy chỉnh link, coupon, hashtag">
              <i class="ph ph-sliders-horizontal"></i>
              <span>Thông tin chèn</span>
              <i class="ph ph-caret-down"></i>
            </button>

            <div class="caption-insert-popover ${mediaState.isInsertPopoverOpen ? "open" : ""}" id="insert-details-popover" role="dialog" aria-label="Tùy chỉnh thông tin chèn">
              <div class="popover-header">
                <strong>Thông tin chèn</strong>
                <button class="popover-close-btn" id="btn-close-insert-popover" type="button" title="Đóng popover">
                  <i class="ph ph-x"></i>
                </button>
              </div>
              <div class="popover-body">
                <div class="popover-field">
                  <label for="input-custom-link" class="popover-label">Link tiếp thị định danh:</label>
                  <input type="text" class="insert-info-input" id="input-custom-link" value="${escapeHtml(affiliateLink)}" placeholder="https://scanms.vn/r/..." />
                </div>
                <div class="popover-field">
                  <label for="input-custom-coupon" class="popover-label">Mã ưu đãi độc quyền:</label>
                  <input type="text" class="insert-info-input" id="input-custom-coupon" value="${escapeHtml(couponCode)}" placeholder="Mã ưu đãi" />
                </div>
                <div class="popover-field">
                  <label for="input-custom-hashtags" class="popover-label">Hashtag đề xuất:</label>
                  <input type="text" class="insert-info-input" id="input-custom-hashtags" value="${escapeHtml(mediaState.customHashtags)}" placeholder="#Hashtag" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ô SOẠN THẢO 1 CỘT (CAO 180-220px, KÉO GIÃN DỌC) -->
      <div class="caption-textarea-wrapper-v2">
        <textarea 
          class="caption-editor-textarea-v2" 
          id="media-caption-box" 
          placeholder="Nhập hoặc tùy chỉnh nội dung caption..."
          spellcheck="false"
        >${escapeHtml(currentText)}</textarea>
      </div>

      <!-- FOOTER NGAY DƯỚI Ô SOẠN (KHÔNG KHOẢNG TRẮNG DƯ THỪA) -->
      <div class="caption-footer-v2">
        <div class="caption-char-counter" id="caption-char-count">
          <span>${currentText.length} ký tự</span>
        </div>
        <div class="caption-action-buttons">
          <button class="btn secondary small" id="btn-reset-caption" type="button" title="Khôi phục lại mẫu nguyên bản từ Shop">
            <i class="ph ph-arrow-counter-clockwise"></i>
            <span>Khôi phục mẫu</span>
          </button>
          <button class="btn small" id="btn-copy-caption" type="button" title="Sao chép caption vào bộ nhớ tạm">
            <i class="ph ph-copy"></i>
            <span>Sao chép</span>
          </button>
        </div>
      </div>
    </section>

    <!-- DRAWER XEM TRƯỚC BÊN PHẢI (CHỈ MỞ KHI BẤM XEM TRƯỚC) -->
    <div class="caption-drawer-backdrop ${mediaState.isPreviewDrawerOpen ? "active" : ""}" id="caption-drawer-backdrop"></div>
    <aside class="caption-preview-drawer ${mediaState.isPreviewDrawerOpen ? "active" : ""}" id="caption-preview-drawer" role="dialog" aria-modal="true" aria-label="Xem trước bài đăng mạng xã hội">
      <div class="caption-drawer-header">
        <div class="drawer-header-titles">
          <h3 class="drawer-title">Xem trước</h3>
          <span class="preview-disclaimer"><i class="ph ph-info"></i> Mô phỏng, không phải bài đăng thật</span>
        </div>
        <button class="btn-drawer-close" id="btn-close-caption-drawer" type="button" title="Đóng xem trước (Escape)" aria-label="Đóng xem trước">
          <i class="ph ph-x"></i>
        </button>
      </div>

      <!-- CHỈ CÓ MỘT VÙNG CUỘN TRONG DRAWER -->
      <div class="caption-drawer-body" id="caption-drawer-body">
        <!-- Bộ chọn nền tảng TikTok / Facebook / Threads -->
        <div class="caption-platform-bar">
          <span class="caption-platform-label">Nền tảng:</span>
          <div class="preview-platform-selector">
            <button class="preview-plat-btn ${mediaState.socialPreviewPlatform === "tiktok" ? "active" : ""}" data-plat="tiktok" type="button">
              <i class="ph ph-tiktok-logo"></i> TikTok
            </button>
            <button class="preview-plat-btn ${mediaState.socialPreviewPlatform === "facebook" ? "active" : ""}" data-plat="facebook" type="button">
              <i class="ph ph-facebook-logo"></i> Facebook
            </button>
            <button class="preview-plat-btn ${mediaState.socialPreviewPlatform === "threads" ? "active" : ""}" data-plat="threads" type="button">
              <i class="ph ph-threads-logo"></i> Threads
            </button>
          </div>
        </div>

        <!-- Khung bài đăng mô phỏng -->
        <div class="preview-post-card">
          <div class="post-card-author">
            <div class="post-author-avatar">N</div>
            <div class="post-author-meta">
              <div class="author-name-row">
                <strong>${kolName}</strong>
                <i class="ph ph-check-circle" style="color:var(--brand)"></i>
              </div>
              <small id="preview-post-plat-label">@nhat_skincare • ${mediaState.socialPreviewPlatform === "tiktok" ? "TikTok" : mediaState.socialPreviewPlatform === "facebook" ? "Facebook" : "Threads"} • Vừa xong • <i class="ph ph-globe"></i></small>
            </div>
          </div>

          <div class="post-card-content" id="social-preview-body">
            ${escapeHtml(currentText).replace(/\n/g, "<br>")}
          </div>

          <!-- Thẻ sản phẩm gắn kèm gọn gàng -->
          <div class="preview-attached-product">
            <img src="${productImage}" alt="Thumb" class="attached-prod-thumb" />
            <div class="attached-prod-info">
              <strong class="attached-prod-name">${escapeHtml(currentProduct.id !== "ALL" ? currentProduct.name : "Serum vitamin C 15%")}</strong>
              <span class="attached-prod-price">${productPrice} • Giảm 10% với mã ${escapeHtml(couponCode)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="caption-drawer-footer">
        <button class="btn secondary small" id="btn-drawer-close-action" type="button">
          Đóng
        </button>
        <button class="btn small" id="btn-drawer-copy-action" type="button">
          <i class="ph ph-copy"></i> Sao chép
        </button>
      </div>
    </aside>
  `;
}

// ---------------------------------------------------------------------
// 5. RENDER MODAL XEM TRƯỚC VÀ TIẾN TRÌNH TẢI
// ---------------------------------------------------------------------
function renderActiveModal(globalState) {
  if (!mediaState.activeModal) return "";

  // 1. Modal Hướng dẫn & Quy định
  if (mediaState.activeModal === "guidelines") {
    return `
      <div class="media-modal-backdrop" id="modal-backdrop">
        <div class="media-modal-window" style="max-width: 800px;">
          <div class="media-modal-header">
            <h3><i class="ph ph-book-open"></i> Quy định & Hướng dẫn Sử dụng Tài nguyên</h3>
            <button class="media-modal-close-btn" id="modal-close"><i class="ph ph-x"></i></button>
          </div>
          <div style="padding: 24px; overflow-y: auto;">
            <div class="media-guidelines-grid">
              <div class="media-guide-item">
                <strong><i class="ph ph-tag" style="color:var(--brand)"></i> 1. Gắn nhãn tiếp thị</strong>
                <p>Luôn gắn kèm hashtag <code>#Affiliate</code> hoặc <code>#HopTac</code> trong nội dung bài đăng theo đúng quy định pháp luật và chính sách minh bạch của sàn.</p>
              </div>
              <div class="media-guide-item">
                <strong><i class="ph ph-shield-check" style="color:var(--brand)"></i> 2. Cam kết thông tin khách quan</strong>
                <p>Không chỉnh sửa nội dung gây hiểu nhầm về công dụng. Sử dụng đúng thông tin và đặc tính khoa học do Shop cung cấp.</p>
              </div>
              <div class="media-guide-item">
                <strong><i class="ph ph-device-mobile" style="color:var(--brand)"></i> 3. Chuẩn tỷ lệ đăng</strong>
                <p>Khuyến khích dùng tỷ lệ 9:16 cho TikTok / Reels / Shorts để hiển thị trọn vẹn khung hình. Dùng tỷ lệ 1:1 hoặc 4:3 cho bài viết Feed.</p>
              </div>
            </div>

            <div class="card soft" style="margin-top: 20px; padding: 16px;">
              <strong>Bản quyền & Giấy phép sử dụng:</strong>
              <p style="margin: 6px 0 0; font-size: 13px; color: var(--muted); line-height: 1.5;">
                Tài nguyên thuộc quyền sở hữu của Sora Skin. Thành viên thuộc mạng lưới CTV và KOL của SCANMS được cấp quyền tải về, tùy chỉnh kịch bản cá nhân và đăng tải nhằm mục đích tiếp thị liên kết.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Modal Tiến trình Tải tệp (Download Progress)
  if (mediaState.activeModal === "download-progress") {
    return `
      <div class="media-modal-backdrop" id="modal-backdrop">
        <div class="media-modal-window" style="max-width: 480px; text-align: center;">
          <div class="media-modal-header">
            <h3>Đang tải tài nguyên</h3>
            <button class="media-modal-close-btn" id="modal-close"><i class="ph ph-x"></i></button>
          </div>
          <div style="padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--brand-soft); color: var(--brand-strong); display: grid; place-items: center; font-size: 32px;">
              ${mediaState.downloadProgress >= 100 ? `<i class="ph ph-check"></i>` : `<i class="ph ph-cloud-arrow-down"></i>`}
            </div>
            <div>
              <h4 style="margin: 0 0 6px; font-size: 16px;">${mediaState.downloadProgress >= 100 ? "Tải xuống thành công!" : "Đang nén và chuẩn bị tệp..."}</h4>
              <p style="margin: 0; color: var(--muted); font-size: 13px;">${mediaState.downloadProgress >= 100 ? "Tệp đã được lưu vào thư mục Downloads của bạn." : `Tiến độ: ${mediaState.downloadProgress}% • Tốc độ: 4.8 MB/s`}</p>
            </div>
            <div style="width: 100%; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${mediaState.downloadProgress}%; background: var(--brand); transition: width 0.2s ease;"></div>
            </div>
            ${
              mediaState.downloadProgress >= 100
                ? `<button class="btn" id="modal-close-done" style="width: 100%;"><i class="ph ph-check"></i> Đóng cửa sổ</button>`
                : `<button class="btn secondary" id="modal-cancel-download">Hủy bỏ</button>`
            }
          </div>
        </div>
      </div>
    `;
  }

  const asset = mediaState.selectedAsset;
  if (!asset) return "";

  const isVideo = asset.type === "video";

  // 3. Modal Xem trước Lightbox Ảnh hoặc Video Player
  return `
    <div class="media-modal-backdrop" id="modal-backdrop">
      <div class="media-modal-window">
        <div class="media-modal-header">
          <h3>
            ${isVideo ? `<i class="ph ph-video-camera"></i> Trình phát Video Review` : `<i class="ph ph-image"></i> Xem trước Hình ảnh gốc`}
            - ${escapeHtml(asset.title)}
          </h3>
          <button class="media-modal-close-btn" id="modal-close" title="Đóng cửa sổ"><i class="ph ph-x"></i></button>
        </div>

        <div class="media-modal-content">
          <div class="media-modal-stage">
            ${
              isVideo
                ? `
              <div class="media-video-container">
                <div class="media-video-player-wrap">
                  <video id="html5-video-player" poster="${asset.image}" src="${asset.videoUrl || sampleVideoUrl}" playsinline style="width:100%;height:100%;object-fit:contain;cursor:pointer;">
                    <source src="${asset.videoUrl || sampleVideoUrl}" type="video/mp4" />
                  </video>
                </div>

                <div class="media-video-controls">
                  <div class="media-video-timeline-wrap">
                    <div class="media-video-timeline" id="video-scrub-bar">
                      <div class="media-video-progress" id="video-progress-bar" style="width: ${mediaState.videoPlaying ? "45%" : "0%"}"></div>
                    </div>
                    <span class="media-video-time" id="video-time-display">00:18 / ${asset.duration}</span>
                  </div>

                  <div class="media-video-buttons">
                    <div class="media-video-btn-group">
                      <button class="media-v-btn" id="v-btn-play" title="Phát / Tạm dừng">
                        <i class="ph ${mediaState.videoPlaying ? "ph-pause" : "ph-play"}"></i>
                      </button>
                      <button class="media-v-btn" id="v-btn-mute" title="Bật / Tắt âm thanh">
                        <i class="ph ph-speaker-high"></i>
                      </button>
                      <input type="range" class="media-v-slider" id="v-volume-slider" min="0" max="1" step="0.05" value="1" title="Âm lượng" />
                    </div>

                    <div class="media-video-btn-group">
                      <select class="media-v-speed" id="v-speed-select" title="Tốc độ phát">
                        <option value="0.75">0.75x</option>
                        <option value="1" selected>1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                      </select>
                      <button class="media-v-btn" id="v-btn-fullscreen" title="Toàn màn hình">
                        <i class="ph ph-corners-out"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `
                : `
              <div class="media-image-lightbox-wrap">
                <div class="media-lightbox-toolbar">
                  <button class="media-lb-tool-btn" id="btn-zoom-in" title="Phóng to (Zoom In)"><i class="ph ph-magnifying-glass-plus"></i></button>
                  <button class="media-lb-tool-btn" id="btn-zoom-out" title="Thu nhỏ (Zoom Out)"><i class="ph ph-magnifying-glass-minus"></i></button>
                  <button class="media-lb-tool-btn" id="btn-rotate" title="Xoay 90 độ"><i class="ph ph-arrow-clockwise"></i></button>
                  <span class="media-zoom-indicator">${mediaState.zoomLevel}%</span>
                </div>
                <div class="media-lightbox-viewport">
                  <img 
                    src="${asset.image}" 
                    alt="${escapeHtml(asset.title)}" 
                    class="media-lightbox-img" 
                    id="lightbox-target-img"
                    style="transform: scale(${mediaState.zoomLevel / 100}) rotate(${mediaState.rotation}deg);"
                  />
                </div>
              </div>
            `
            }
          </div>

          <div class="media-modal-sidebar">
            <div class="media-sidebar-section">
              <h4>${escapeHtml(asset.title)}</h4>
              <p style="font-size: 13px; color: var(--muted); margin: 4px 0 12px;">Sản phẩm: <strong>${escapeHtml(asset.productName)}</strong></p>
            </div>

            <div class="media-sidebar-specs">
              <div class="spec-row">
                <span>Loại tài nguyên:</span>
                <strong>${asset.type.toUpperCase()} (${asset.format})</strong>
              </div>
              <div class="spec-row">
                <span>Tỷ lệ hiển thị:</span>
                <strong>${asset.ratio}</strong>
              </div>
              <div class="spec-row">
                <span>Độ phân giải:</span>
                <strong>${asset.resolution}</strong>
              </div>
              <div class="spec-row">
                <span>Dung lượng gốc:</span>
                <strong>${asset.fileSize}</strong>
              </div>
              ${
                isVideo
                  ? `
                <div class="spec-row">
                  <span>Thời lượng:</span>
                  <strong>${asset.duration}</strong>
                </div>
                <div class="spec-row">
                  <span>Khung hình / giây:</span>
                  <strong>${asset.fps}</strong>
                </div>
              `
                  : ""
              }
              <div class="spec-row">
                <span>Lượt tải về:</span>
                <strong>${asset.downloads} lượt</strong>
              </div>
              <div class="spec-row">
                <span>Kênh đề xuất:</span>
                <strong style="text-align: right; max-width: 60%;">${asset.recommendedChannels}</strong>
              </div>
            </div>

            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">
              <button class="btn action-download" data-asset-id="${asset.id}" style="width: 100%;">
                <i class="ph ph-download-simple"></i> Tải file gốc về máy (${asset.fileSize})
              </button>
              <button class="btn secondary" id="btn-copy-asset-cdn" data-asset-id="${asset.id}" style="width: 100%;">
                <i class="ph ph-link"></i> Sao chép liên kết CDN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 6. RENDER MOBILE FILTER DRAWER (BOTTOM SHEET CHO MOBILE)
// ---------------------------------------------------------------------
function renderMobileFilterDrawer(currentProduct) {
  if (!mediaState.isMobileFilterDrawerOpen) return "";

  return `
    <div class="media-bottom-sheet-backdrop" id="mobile-filter-backdrop">
      <div class="media-bottom-sheet">
        <div class="bottom-sheet-header">
          <h3><i class="ph ph-sliders-horizontal"></i> Bộ lọc tài nguyên</h3>
          <button class="btn-sheet-close" id="btn-close-mobile-drawer"><i class="ph ph-x"></i></button>
        </div>

        <div class="bottom-sheet-body">
          <div class="sheet-field">
            <label class="sheet-label">Sản phẩm:</label>
            <select class="media-native-select sheet-select" id="mobile-product-select">
              ${products.map((p) => `
                <option value="${p.id}" ${mediaState.selectedProduct === p.id ? "selected" : ""}>
                  ${escapeHtml(p.name)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="sheet-field">
            <label class="sheet-label">Loại nội dung:</label>
            <select class="media-native-select sheet-select" id="mobile-type-select">
              <option value="all" ${mediaState.selectedType === "all" ? "selected" : ""}>Tất cả loại</option>
              <option value="photo" ${mediaState.selectedType === "photo" ? "selected" : ""}>Ảnh</option>
              <option value="video" ${mediaState.selectedType === "video" ? "selected" : ""}>Video</option>
              <option value="banner" ${mediaState.selectedType === "banner" ? "selected" : ""}>Banner</option>
              <option value="caption" ${mediaState.selectedType === "caption" ? "selected" : ""}>Caption</option>
            </select>
          </div>

          <div class="sheet-field">
            <label class="sheet-label">Tỷ lệ khung hình:</label>
            <div class="sheet-ratio-pills">
              <button class="sheet-ratio-btn ${mediaState.selectedRatio === "all" ? "active" : ""}" data-sheet-ratio="all">Tất cả</button>
              <button class="sheet-ratio-btn ${mediaState.selectedRatio === "9:16" ? "active" : ""}" data-sheet-ratio="9:16">9:16</button>
              <button class="sheet-ratio-btn ${mediaState.selectedRatio === "1:1" ? "active" : ""}" data-sheet-ratio="1:1">1:1</button>
              <button class="sheet-ratio-btn ${mediaState.selectedRatio === "16:9" ? "active" : ""}" data-sheet-ratio="16:9">16:9</button>
              <button class="sheet-ratio-btn ${mediaState.selectedRatio === "4:3" ? "active" : ""}" data-sheet-ratio="4:3">4:3</button>
            </div>
          </div>
        </div>

        <div class="bottom-sheet-footer">
          <button class="btn secondary" id="btn-mobile-sheet-reset">Đặt lại</button>
          <button class="btn" id="btn-mobile-sheet-apply">Áp dụng</button>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// 7. XỬ LÝ SỰ KIỆN TƯƠNG TÁC (bindMedia)
// =====================================================================
export function bindMedia(root = document, context = {}) {
  const container = root.querySelector(".media-workspace");
  if (!container) return;

  const { refresh = () => {}, toast = () => {}, state = {}, go = () => {} } = context;

  // 1. Chuyển đổi trạng thái UI Mode (Bình thường, Skeleton, Empty, Error)
  const modeSelect = container.querySelector("#media-mode-select");
  if (modeSelect) {
    modeSelect.onchange = (e) => {
      mediaState.uiMode = e.target.value;
      refresh();
      toast(`Đã chuyển sang chế độ: ${e.target.options[e.target.selectedIndex].text}`);
    };
  }

  // 2. Ô tìm kiếm thời gian thực
  const searchInput = container.querySelector("#media-search-input");
  if (searchInput) {
    searchInput.oninput = (e) => {
      mediaState.searchQuery = e.target.value;
      clearTimeout(searchInput._timer);
      searchInput._timer = setTimeout(() => {
        refresh();
        const newSearch = root.querySelector("#media-search-input");
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      }, 200);
    };
  }

  const btnClearSearch = container.querySelector("#btn-clear-search-input");
  if (btnClearSearch) {
    btnClearSearch.onclick = () => {
      mediaState.searchQuery = "";
      refresh();
    };
  }

  // 3. Dropdown sản phẩm kèm tìm kiếm bên trong
  const btnProdTrigger = container.querySelector("#btn-product-dropdown-trigger");
  if (btnProdTrigger) {
    btnProdTrigger.onclick = (e) => {
      e.stopPropagation();
      mediaState.isProductDropdownOpen = !mediaState.isProductDropdownOpen;
      mediaState.isRatioPopoverOpen = false;
      refresh();
      if (mediaState.isProductDropdownOpen) {
        setTimeout(() => {
          const input = root.querySelector("#input-search-product");
          if (input) input.focus();
        }, 50);
      }
    };
  }

  const inputSearchProd = container.querySelector("#input-search-product");
  if (inputSearchProd) {
    inputSearchProd.onclick = (e) => e.stopPropagation();
    inputSearchProd.oninput = (e) => {
      mediaState.productSearchQuery = e.target.value;
      clearTimeout(inputSearchProd._timer);
      inputSearchProd._timer = setTimeout(() => {
        refresh();
        const newInput = root.querySelector("#input-search-product");
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      }, 150);
    };
  }

  container.querySelectorAll(".product-dropdown-item").forEach((item) => {
    item.onclick = (e) => {
      e.stopPropagation();
      const pId = item.dataset.productId;
      mediaState.selectedProduct = pId;
      mediaState.isProductDropdownOpen = false;
      mediaState.productSearchQuery = "";
      refresh();
      const p = products.find((x) => x.id === pId);
      toast(`Đã chọn: ${p ? p.name : "Tất cả sản phẩm"}`);
    };
  });

  // 4. Dropdown Loại nội dung
  const typeSelect = container.querySelector("#media-type-select");
  if (typeSelect) {
    typeSelect.onchange = (e) => {
      mediaState.selectedType = e.target.value;
      refresh();
    };
  }

  // 5. Popover Bộ lọc tỷ lệ khung hình
  const btnRatioTrigger = container.querySelector("#btn-ratio-popover-trigger");
  if (btnRatioTrigger) {
    btnRatioTrigger.onclick = (e) => {
      e.stopPropagation();
      // Nếu màn hình nhỏ (<= 768px), mở mobile filter drawer
      if (window.innerWidth <= 768) {
        mediaState.isMobileFilterDrawerOpen = true;
        mediaState.isRatioPopoverOpen = false;
        refresh();
        return;
      }
      mediaState.isRatioPopoverOpen = !mediaState.isRatioPopoverOpen;
      mediaState.isProductDropdownOpen = false;
      refresh();
    };
  }

  container.querySelectorAll("input[name='ratio-opt']").forEach((radio) => {
    radio.onchange = (e) => {
      mediaState.selectedRatio = e.target.value;
      mediaState.isRatioPopoverOpen = false;
      refresh();
      toast(`Đã lọc tỷ lệ: ${e.target.value}`);
    };
  });

  const btnResetRatio = container.querySelector("#btn-reset-ratio");
  if (btnResetRatio) {
    btnResetRatio.onclick = (e) => {
      e.stopPropagation();
      mediaState.selectedRatio = "all";
      mediaState.isRatioPopoverOpen = false;
      refresh();
    };
  }

  // 6. Sắp xếp danh sách
  const sortSelect = container.querySelector("#media-sort-select");
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      mediaState.sortBy = e.target.value;
      refresh();
    };
  }

  // 7. Hàng nhãn lọc đã áp dụng: Xóa từng tag
  container.querySelectorAll(".btn-remove-tag").forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.removeFilter;
      if (type === "search") mediaState.searchQuery = "";
      if (type === "product") mediaState.selectedProduct = "ALL";
      if (type === "type") mediaState.selectedType = "all";
      if (type === "ratio") mediaState.selectedRatio = "all";
      refresh();
    };
  });

  // 8. Nút Xóa tất cả bộ lọc
  const btnClearAll = container.querySelector("#btn-clear-all-filters");
  if (btnClearAll) {
    btnClearAll.onclick = () => {
      mediaState.selectedProduct = "ALL";
      mediaState.selectedType = "all";
      mediaState.selectedRatio = "all";
      mediaState.searchQuery = "";
      refresh();
      toast("Đã đặt lại toàn bộ bộ lọc về mặc định.");
    };
  }

  const emptyReset = container.querySelector("#btn-empty-reset");
  if (emptyReset) {
    emptyReset.onclick = () => {
      mediaState.selectedProduct = "ALL";
      mediaState.selectedType = "all";
      mediaState.selectedRatio = "all";
      mediaState.searchQuery = "";
      mediaState.uiMode = "normal";
      refresh();
      toast("Đã hiển thị lại toàn bộ tài nguyên.");
    };
  }

  // 9. Đóng dropdown và popover khi click ra ngoài
  const handleOutsideClick = (e) => {
    const prodWrap = root.querySelector("#prod-dropdown-wrap");
    const ratioWrap = root.querySelector("#ratio-popover-wrap");

    let changed = false;
    if (mediaState.isProductDropdownOpen && prodWrap && !prodWrap.contains(e.target)) {
      mediaState.isProductDropdownOpen = false;
      changed = true;
    }
    if (mediaState.isRatioPopoverOpen && ratioWrap && !ratioWrap.contains(e.target)) {
      mediaState.isRatioPopoverOpen = false;
      changed = true;
    }
    if (changed) refresh();
  };
  document.addEventListener("click", handleOutsideClick);

  // 10. Mobile Bottom Sheet Handlers
  const btnCloseDrawer = container.querySelector("#btn-close-mobile-drawer");
  if (btnCloseDrawer) {
    btnCloseDrawer.onclick = () => {
      mediaState.isMobileFilterDrawerOpen = false;
      refresh();
    };
  }

  const mobileBackdrop = container.querySelector("#mobile-filter-backdrop");
  if (mobileBackdrop) {
    mobileBackdrop.onclick = (e) => {
      if (e.target === mobileBackdrop) {
        mediaState.isMobileFilterDrawerOpen = false;
        refresh();
      }
    };
  }

  container.querySelectorAll(".sheet-ratio-btn").forEach((btn) => {
    btn.onclick = () => {
      container.querySelectorAll(".sheet-ratio-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });

  const btnMobileApply = container.querySelector("#btn-mobile-sheet-apply");
  if (btnMobileApply) {
    btnMobileApply.onclick = () => {
      const pSel = container.querySelector("#mobile-product-select");
      const tSel = container.querySelector("#mobile-type-select");
      const activeRatioBtn = container.querySelector(".sheet-ratio-btn.active");

      if (pSel) mediaState.selectedProduct = pSel.value;
      if (tSel) mediaState.selectedType = tSel.value;
      if (activeRatioBtn) mediaState.selectedRatio = activeRatioBtn.dataset.sheetRatio;

      mediaState.isMobileFilterDrawerOpen = false;
      refresh();
      toast("Đã áp dụng bộ lọc.");
    };
  }

  const btnMobileReset = container.querySelector("#btn-mobile-sheet-reset");
  if (btnMobileReset) {
    btnMobileReset.onclick = () => {
      mediaState.selectedProduct = "ALL";
      mediaState.selectedType = "all";
      mediaState.selectedRatio = "all";
      mediaState.isMobileFilterDrawerOpen = false;
      refresh();
      toast("Đã đặt lại bộ lọc.");
    };
  }

  // 11. XỬ LÝ CAPTION STUDIO
  const currentProduct = products.find((p) => p.id === mediaState.selectedProduct) || products[0];
  const captionTextarea = container.querySelector("#media-caption-box");
  const drawer = container.querySelector("#caption-preview-drawer");
  const drawerBackdrop = container.querySelector("#caption-drawer-backdrop");
  const btnOpenDrawer = container.querySelector("#btn-open-caption-drawer");
  const btnCloseCaptionDrawer = container.querySelector("#btn-close-caption-drawer");
  const btnDrawerCloseAction = container.querySelector("#btn-drawer-close-action");

  // Đồng bộ nhanh giao diện văn bản, số ký tự & bài đăng mô phỏng
  const updateLiveCaptionSync = (text) => {
    const counterEl = container.querySelector("#caption-char-count");
    if (counterEl) {
      counterEl.innerHTML = `<span>${text.length} ký tự</span>`;
    }
    const previewBody = container.querySelector("#social-preview-body");
    if (previewBody) {
      previewBody.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
    }
  };

  // Mở/Đóng Drawer xem trước mượt mà, không render lại DOM để không mất con trỏ/nội dung
  const openCaptionDrawer = () => {
    mediaState.isPreviewDrawerOpen = true;
    if (drawer) drawer.classList.add("active");
    if (drawerBackdrop) drawerBackdrop.classList.add("active");
    if (captionTextarea) updateLiveCaptionSync(captionTextarea.value);
  };

  const closeCaptionDrawer = () => {
    mediaState.isPreviewDrawerOpen = false;
    if (drawer) drawer.classList.remove("active");
    if (drawerBackdrop) drawerBackdrop.classList.remove("active");
  };

  if (btnOpenDrawer) btnOpenDrawer.onclick = openCaptionDrawer;
  if (btnCloseCaptionDrawer) btnCloseCaptionDrawer.onclick = closeCaptionDrawer;
  if (btnDrawerCloseAction) btnDrawerCloseAction.onclick = closeCaptionDrawer;
  if (drawerBackdrop) drawerBackdrop.onclick = closeCaptionDrawer;

  // Popover Thông tin chèn
  const btnToggleInsert = container.querySelector("#btn-toggle-insert-info");
  const insertPopover = container.querySelector("#insert-details-popover");
  const btnCloseInsert = container.querySelector("#btn-close-insert-popover");

  const toggleInsertPopover = (forceState) => {
    const nextState = typeof forceState === "boolean" ? forceState : !mediaState.isInsertPopoverOpen;
    mediaState.isInsertPopoverOpen = nextState;
    if (insertPopover) insertPopover.classList.toggle("open", nextState);
    if (btnToggleInsert) {
      btnToggleInsert.classList.toggle("active", nextState);
      btnToggleInsert.setAttribute("aria-expanded", String(nextState));
    }
  };

  if (btnToggleInsert) {
    btnToggleInsert.onclick = (e) => {
      e.stopPropagation();
      toggleInsertPopover();
    };
  }
  if (btnCloseInsert) {
    btnCloseInsert.onclick = (e) => {
      e.stopPropagation();
      toggleInsertPopover(false);
    };
  }

  // Đóng Drawer và Popover bằng phím Escape hoặc click ngoài
  const handleCaptionKeydown = (e) => {
    if (e.key === "Escape") {
      if (mediaState.isPreviewDrawerOpen) {
        closeCaptionDrawer();
        if (btnOpenDrawer) btnOpenDrawer.focus();
      } else if (mediaState.isInsertPopoverOpen) {
        toggleInsertPopover(false);
        if (btnToggleInsert) btnToggleInsert.focus();
      }
    }
  };
  window.addEventListener("keydown", handleCaptionKeydown);

  const handleCaptionOutsideClick = (e) => {
    if (mediaState.isInsertPopoverOpen) {
      if (!e.target.closest(".caption-popover-anchor")) {
        toggleInsertPopover(false);
      }
    }
  };
  document.addEventListener("click", handleCaptionOutsideClick);

  // Đổi Mẫu nội dung (với xác nhận nếu đã chỉnh sửa)
  const presetSelect = container.querySelector("#caption-preset-select");
  if (presetSelect) {
    presetSelect.onchange = (e) => {
      const newPreset = e.target.value;
      if (mediaState.isCaptionModified) {
        const confirmed = window.confirm(
          "Nội dung bạn đang chỉnh sửa sẽ bị thay thế bằng mẫu mới. Bạn có chắc chắn muốn thay đổi không?"
        );
        if (!confirmed) {
          presetSelect.value = mediaState.activeCaptionPreset;
          return;
        }
      }
      mediaState.activeCaptionPreset = newPreset;
      mediaState.isCaptionModified = false;
      mediaState.customCaptionText = null;
      refresh();
      toast(`Đã áp dụng mẫu: ${captionPresets[newPreset]?.label || newPreset}`);
    };
  }

  // Chỉnh sửa các trường trong Popover Thông tin chèn
  const inputCustomLink = container.querySelector("#input-custom-link");
  if (inputCustomLink) {
    inputCustomLink.oninput = (e) => {
      mediaState.customLink = e.target.value.trim();
      if (!mediaState.isCaptionModified) {
        const newText = compileCaptionText(currentProduct);
        if (captionTextarea) captionTextarea.value = newText;
        updateLiveCaptionSync(newText);
      }
    };
  }

  const inputCustomCoupon = container.querySelector("#input-custom-coupon");
  if (inputCustomCoupon) {
    inputCustomCoupon.oninput = (e) => {
      mediaState.customCoupon = e.target.value.trim();
      if (!mediaState.isCaptionModified) {
        const newText = compileCaptionText(currentProduct);
        if (captionTextarea) captionTextarea.value = newText;
        updateLiveCaptionSync(newText);
      }
    };
  }

  const inputCustomHashtags = container.querySelector("#input-custom-hashtags");
  if (inputCustomHashtags) {
    inputCustomHashtags.oninput = (e) => {
      mediaState.customHashtags = e.target.value.trim();
      if (!mediaState.isCaptionModified) {
        const newText = compileCaptionText(currentProduct);
        if (captionTextarea) captionTextarea.value = newText;
        updateLiveCaptionSync(newText);
      }
    };
  }

  // Tùy chọn chèn/gỡ Link, Coupon, Hashtag thông minh không trùng lặp & không đè bài viết
  const handleInsertToggle = (type, isChecked) => {
    const defaultAffiliate = `https://scanms.vn/r/ref_nhat_${currentProduct.id.toLowerCase() === "all" ? "skinc15" : currentProduct.id.toLowerCase()}`;
    const affiliateLink = mediaState.customLink || defaultAffiliate;
    const couponCode = mediaState.customCoupon || "NHATXINH10";
    const hashtags = mediaState.customHashtags || "#SoraSkin #ReviewMyPham #Affiliate";

    if (!mediaState.isCaptionModified) {
      if (type === "link") mediaState.includeLink = isChecked;
      if (type === "coupon") mediaState.includeCoupon = isChecked;
      if (type === "hashtags") mediaState.includeHashtags = isChecked;
      const newText = compileCaptionText(currentProduct);
      if (captionTextarea) captionTextarea.value = newText;
      updateLiveCaptionSync(newText);
    } else {
      let text = captionTextarea ? captionTextarea.value : (mediaState.customCaptionText || "");
      if (type === "link") {
        mediaState.includeLink = isChecked;
        if (isChecked) {
          if (!text.includes(affiliateLink)) {
            text = text.trim() + `\n\n👉 Link mua hàng: ${affiliateLink}`;
          }
        } else {
          text = text.replace(new RegExp(`(\\n)?(👉\\s*)?(Link mua hàng:?\\s*)?${escapeRegex(affiliateLink)}`, "g"), "").trim();
        }
      } else if (type === "coupon") {
        mediaState.includeCoupon = isChecked;
        if (isChecked) {
          if (!text.includes(couponCode)) {
            text = text.trim() + `\n🏷️ Mã ưu đãi: ${couponCode}`;
          }
        } else {
          text = text.replace(new RegExp(`(\\n)?(🏷️\\s*)?(Mã ưu đãi:?\\s*)?${escapeRegex(couponCode)}`, "g"), "").trim();
        }
      } else if (type === "hashtags") {
        mediaState.includeHashtags = isChecked;
        if (isChecked) {
          if (!text.includes(hashtags)) {
            text = text.trim() + `\n\n${hashtags}`;
          }
        } else {
          text = text.replace(new RegExp(`(\\n)*${escapeRegex(hashtags)}`, "g"), "").trim();
        }
      }
      mediaState.customCaptionText = text;
      if (captionTextarea) captionTextarea.value = text;
      updateLiveCaptionSync(text);
    }
  };

  const switchLink = container.querySelector("#switch-link");
  if (switchLink) switchLink.onchange = (e) => handleInsertToggle("link", e.target.checked);

  const switchCoupon = container.querySelector("#switch-coupon");
  if (switchCoupon) switchCoupon.onchange = (e) => handleInsertToggle("coupon", e.target.checked);

  const switchHashtags = container.querySelector("#switch-hashtags");
  if (switchHashtags) switchHashtags.onchange = (e) => handleInsertToggle("hashtags", e.target.checked);

  // Vùng soạn văn bản (Textarea) - Cập nhật live & đổi nhãn sang "Đã chỉnh sửa từ mẫu Shop"
  if (captionTextarea) {
    captionTextarea.oninput = (e) => {
      const val = e.target.value;
      mediaState.customCaptionText = val;
      mediaState.isCaptionModified = true;

      updateLiveCaptionSync(val);

      const badgeEl = container.querySelector("#caption-status-badge");
      if (badgeEl && !badgeEl.classList.contains("edited")) {
        badgeEl.className = "caption-badge edited";
        badgeEl.innerHTML = `<i class="ph ph-pencil-simple-line"></i> Đã chỉnh sửa từ mẫu Shop`;
      }
    };
  }

  // Nút Khôi phục mẫu (có xác nhận nếu đã chỉnh sửa)
  const btnResetCaption = container.querySelector("#btn-reset-caption");
  if (btnResetCaption) {
    btnResetCaption.onclick = () => {
      if (mediaState.isCaptionModified) {
        const confirmed = window.confirm(
          "Bạn có chắc muốn khôi phục lại mẫu nguyên bản? Mọi nội dung đã chỉnh sửa sẽ bị hủy."
        );
        if (!confirmed) return;
      }
      mediaState.isCaptionModified = false;
      mediaState.customCaptionText = null;
      refresh();
      toast("Đã khôi phục lại mẫu nguyên bản do Shop cung cấp.");
    };
  }

  // Sao chép caption (ở footer và trong drawer)
  const setupCopyButton = (btn) => {
    if (!btn) return;
    btn.onclick = () => {
      const textToCopy = captionTextarea ? captionTextarea.value : compileCaptionText(currentProduct);
      if (!textToCopy) {
        toast("Nội dung caption đang trống.", "warning");
        return;
      }

      const originalHtml = btn.innerHTML;
      const markSuccess = () => {
        btn.innerHTML = `<i class="ph ph-check"></i> Đã sao chép!`;
        btn.classList.add("btn-copied-success");
        toast("Đã sao chép caption vào bộ nhớ tạm!", "success");
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.remove("btn-copied-success");
        }, 2200);
      };

      const markError = () => {
        toast("Không thể truy cập bộ nhớ tạm. Vui lòng bôi đen và nhấn Ctrl + C để sao chép.", "warning");
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(markSuccess).catch(() => {
          fallbackCopyText(textToCopy, markSuccess, markError);
        });
      } else {
        fallbackCopyText(textToCopy, markSuccess, markError);
      }
    };
  };

  setupCopyButton(container.querySelector("#btn-copy-caption"));
  setupCopyButton(container.querySelector("#btn-drawer-copy-action"));

  // Chuyển tab Social Preview (TikTok, Facebook, Threads) trong Drawer
  container.querySelectorAll(".preview-plat-btn").forEach((btn) => {
    btn.onclick = () => {
      const plat = btn.dataset.plat;
      mediaState.socialPreviewPlatform = plat;
      container.querySelectorAll(".preview-plat-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.plat === plat);
      });
      const labelEl = container.querySelector("#preview-post-plat-label");
      if (labelEl) {
        const platName = plat === "tiktok" ? "TikTok" : plat === "facebook" ? "Facebook" : "Threads";
        labelEl.innerHTML = `@nhat_skincare • ${platName} • Vừa xong • <i class="ph ph-globe"></i>`;
      }
    };
  });

  // 19. Bấm Xem trước (Lightbox hoặc Video Player)
  container.querySelectorAll(".action-preview").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.assetId;
      const asset = mediaAssets.find((a) => a.id === id);
      if (!asset) return;

      mediaState.selectedAsset = asset;
      mediaState.zoomLevel = 100;
      mediaState.rotation = 0;
      mediaState.videoPlaying = false;
      mediaState.activeModal = asset.type === "video" ? "preview-video" : "preview-image";
      refresh();
    };
  });

  // 20. Bấm Tải xuống tệp thực tế (Real File Download)
  container.querySelectorAll(".action-download").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.assetId;
      const asset = mediaAssets.find((a) => a.id === id);
      if (!asset) return;

      if (asset.isBroken) {
        toast("Lỗi: Tệp này không còn khả dụng trên hệ thống.", "danger");
        return;
      }

      const ext = asset.format.toLowerCase();
      const cleanProd = asset.productName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `SCANMS_SoraSkin_${cleanProd}_${asset.id}.${ext}`;

      startRealDownloadProcess(filename, asset.title, refresh, toast);
    };
  });

  // 21. Thử lại tệp lỗi (Simulated error file)
  container.querySelectorAll(".action-retry-file").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      toast("Đang thử kết nối lại với kho lưu trữ cũ...", "warning");
      setTimeout(() => {
        toast("Thông báo: Chiến dịch này đã hết thời hạn bản quyền. Vui lòng sử dụng tài nguyên mới.", "danger");
      }, 1200);
    };
  });

  // 22. Thử lại kết nối CDN khi gặp lỗi
  const retryCdn = container.querySelector("#btn-retry-cdn");
  if (retryCdn) {
    retryCdn.onclick = () => {
      mediaState.uiMode = "loading";
      refresh();
      setTimeout(() => {
        mediaState.uiMode = "normal";
        refresh();
        toast("Kết nối lại máy chủ CDN thành công!");
      }, 1000);
    };
  }

  // 23. Nút mở Hướng dẫn sử dụng & Quy định
  const guidelinesBtn = container.querySelector("#btn-open-guidelines");
  if (guidelinesBtn) {
    guidelinesBtn.onclick = () => {
      mediaState.activeModal = "guidelines";
      refresh();
    };
  }

  // 24. Tải trọn bộ Pack tài nguyên
  const bulkBtn = container.querySelector("#btn-bulk-download");
  if (bulkBtn) {
    bulkBtn.onclick = () => {
      startRealDownloadProcess(
        "SCANMS_SoraSkin_Creative_Pack_2026.zip",
        "Bộ tài nguyên tiếp thị trọn gói",
        refresh,
        toast
      );
    };
  }

  // 25. Xử lý đóng Modal
  const modalBackdrop = container.querySelector("#modal-backdrop");
  if (modalBackdrop) {
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) {
        mediaState.activeModal = null;
        refresh();
      }
    };
  }

  const modalClose = container.querySelector("#modal-close");
  if (modalClose) {
    modalClose.onclick = () => {
      mediaState.activeModal = null;
      refresh();
    };
  }

  const modalCloseDone = container.querySelector("#modal-close-done");
  if (modalCloseDone) {
    modalCloseDone.onclick = () => {
      mediaState.activeModal = null;
      refresh();
    };
  }

  const modalCancel = container.querySelector("#modal-cancel-download");
  if (modalCancel) {
    modalCancel.onclick = () => {
      mediaState.activeModal = null;
      refresh();
      toast("Đã hủy quá trình tải tệp.");
    };
  }

  // 26. Điều khiển Zoom & Xoay trong Lightbox
  const btnZoomIn = container.querySelector("#btn-zoom-in");
  if (btnZoomIn) {
    btnZoomIn.onclick = () => {
      if (mediaState.zoomLevel < 250) {
        mediaState.zoomLevel += 25;
        refresh();
      }
    };
  }

  const btnZoomOut = container.querySelector("#btn-zoom-out");
  if (btnZoomOut) {
    btnZoomOut.onclick = () => {
      if (mediaState.zoomLevel > 50) {
        mediaState.zoomLevel -= 25;
        refresh();
      }
    };
  }

  const btnRotate = container.querySelector("#btn-rotate");
  if (btnRotate) {
    btnRotate.onclick = () => {
      mediaState.rotation = (mediaState.rotation + 90) % 360;
      refresh();
    };
  }

  // 27. Điều khiển Video Player
  const videoEl = container.querySelector("#html5-video-player");
  const vBtnPlay = container.querySelector("#v-btn-play");
  const vProgress = container.querySelector("#video-progress-bar");
  const vTimeDisplay = container.querySelector("#video-time-display");
  const vScrubBar = container.querySelector("#video-scrub-bar");
  const vBtnMute = container.querySelector("#v-btn-mute");
  const vVolumeSlider = container.querySelector("#v-volume-slider");
  const vSpeedSelect = container.querySelector("#v-speed-select");

  if (videoEl) {
    videoEl.volume = mediaState.videoVolume;
    videoEl.playbackRate = mediaState.videoPlaybackRate || 1;

    const togglePlay = () => {
      if (videoEl.paused) {
        videoEl.play().then(() => {
          mediaState.videoPlaying = true;
          if (vBtnPlay) vBtnPlay.innerHTML = '<i class="ph ph-pause"></i>';
          toast("Đang phát video review...");
        }).catch(() => {});
      } else {
        videoEl.pause();
        mediaState.videoPlaying = false;
        if (vBtnPlay) vBtnPlay.innerHTML = '<i class="ph ph-play"></i>';
        toast("Đã tạm dừng video");
      }
    };

    videoEl.onclick = togglePlay;
    if (vBtnPlay) vBtnPlay.onclick = togglePlay;

    videoEl.ontimeupdate = () => {
      if (videoEl.duration) {
        const pct = (videoEl.currentTime / videoEl.duration) * 100;
        if (vProgress) vProgress.style.width = pct + "%";
        if (vTimeDisplay) {
          const curM = String(Math.floor(videoEl.currentTime / 60)).padStart(2, "0");
          const curS = String(Math.floor(videoEl.currentTime % 60)).padStart(2, "0");
          vTimeDisplay.textContent = `${curM}:${curS} / ${mediaState.selectedAsset?.duration || "00:42"}`;
        }
      }
    };

    videoEl.onended = () => {
      mediaState.videoPlaying = false;
      if (vBtnPlay) vBtnPlay.innerHTML = '<i class="ph ph-play"></i>';
      if (vProgress) vProgress.style.width = "0%";
    };

    if (vScrubBar) {
      vScrubBar.onclick = (e) => {
        const rect = vScrubBar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (videoEl.duration) {
          videoEl.currentTime = pos * videoEl.duration;
        }
      };
    }

    if (vBtnMute) {
      vBtnMute.onclick = () => {
        videoEl.muted = !videoEl.muted;
        const icon = vBtnMute.querySelector("i");
        if (icon) {
          icon.className = videoEl.muted ? "ph ph-speaker-slash" : "ph ph-speaker-high";
        }
      };
    }

    if (vVolumeSlider) {
      vVolumeSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        videoEl.volume = val;
        videoEl.muted = val === 0;
        mediaState.videoVolume = val;
        const icon = container.querySelector("#v-btn-mute i");
        if (icon) {
          icon.className = val > 0 ? "ph ph-speaker-high" : "ph ph-speaker-slash";
        }
      };
    }

    if (vSpeedSelect) {
      vSpeedSelect.onchange = (e) => {
        const rate = parseFloat(e.target.value);
        videoEl.playbackRate = rate;
        mediaState.videoPlaybackRate = rate;
        toast(`Tốc độ phát: ${rate}x`);
      };
    }
  }

  // 28. Sao chép liên kết CDN
  const copyCdnBtn = container.querySelector("#btn-copy-asset-cdn");
  if (copyCdnBtn) {
    copyCdnBtn.onclick = () => {
      const cdnUrl = `https://cdn.scanms.vn/assets/soraskin/${copyCdnBtn.dataset.assetId}`;
      navigator.clipboard.writeText(cdnUrl).then(() => {
        toast("Đã sao chép link CDN tốc độ cao!");
      });
    };
  }
}

// Fallback sao chép bộ nhớ tạm không dùng navigator.clipboard
function fallbackCopyText(text, onSuccess, onError) {
  try {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    tempInput.style.position = "fixed";
    tempInput.style.top = "-9999px";
    tempInput.style.left = "-9999px";
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    const success = document.execCommand("copy");
    document.body.removeChild(tempInput);
    if (success) {
      onSuccess();
    } else {
      onError();
    }
  } catch (err) {
    onError();
  }
}

// ---------------------------------------------------------------------
// 8. TIẾN TRÌNH TẢI TỆP THỰC TẾ (REAL DOWNLOAD ENGINE)
// ---------------------------------------------------------------------
function startRealDownloadProcess(filename, label, refresh, toast) {
  mediaState.activeModal = "download-progress";
  mediaState.downloadProgress = 15;
  refresh();

  const timer = setInterval(() => {
    if (mediaState.downloadProgress < 90) {
      mediaState.downloadProgress += 25;
      refresh();
    } else {
      clearInterval(timer);
      mediaState.downloadProgress = 100;
      refresh();
      triggerActualFileDownload(filename);
      toast(`Tải xuống thành công: ${filename}`);
    }
  }, 250);
}

// Sinh và tải file nhị phân/văn bản thực về ổ cứng người dùng
function triggerActualFileDownload(filename) {
  try {
    let blob;
    if (filename.endsWith(".txt")) {
      const content = `SCANMS Media Hub Export\nSora Skin Official Brand Asset\nTên tệp: ${filename}\nNgày tải: ${new Date().toLocaleString("vi-VN")}\nBản quyền được chứng nhận bởi SCANMS.`;
      blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, 1200, 800);
      grad.addColorStop(0, "#8C6524");
      grad.addColorStop(1, "#C9A363");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 800);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText("SCANMS - SORA SKIN OFFICIAL ASSET", 60, 120);

      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#F5E7CC";
      ctx.fillText(`Tệp: ${filename}`, 60, 180);
      ctx.fillText("Đã được xác thực bản quyền tiếp thị liên kết", 60, 220);
      ctx.fillText("Ngày cấp quyền: " + new Date().toLocaleDateString("vi-VN"), 60, 260);

      canvas.toBlob((b) => {
        if (!b) return;
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
  }
}
