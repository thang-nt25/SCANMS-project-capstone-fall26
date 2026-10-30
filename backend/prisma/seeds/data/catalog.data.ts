export const SHOPS = [
  {
    name: 'Sora Skincare & Cosmetics',
    slug: 'sora-skin',
    category: 'Mỹ phẩm & Chăm sóc da',
    logo: 'shop-sora-skin.png',
  },
  {
    name: 'Aura Activewear & Apparel',
    slug: 'aura-apparel',
    category: 'Thời trang & Phụ kiện',
    logo: 'shop-aura-bio.png',
  },
  {
    name: 'GreenBio Health & Nutrition',
    slug: 'greenbio',
    category: 'Thực phẩm chức năng & Sức khỏe',
    logo: 'shop-greenbio.png',
  },
  {
    name: 'Lumière Smart Living',
    slug: 'lumiere-living',
    category: 'Thiết bị điện tử & Phụ kiện',
    logo: 'shop-lumiere-lab.png',
  },
] as const;

export const SHOP_DESCRIPTIONS: Record<string, string> = {
  'sora-skin':
    'Thương hiệu mỹ phẩm dưỡng da sinh học chuyên sâu; cung cấp giải pháp phục hồi hàng rào ẩm và chống lão hóa đa tầng đạt chuẩn kiểm nghiệm da liễu.',
  'aura-apparel':
    'Thương hiệu thời trang thể thao & trang phục năng động ứng dụng sợi co giãn 4 chiều thoáng khí kháng khuẩn, phong cách tối giản sang trọng.',
  greenbio:
    'Chuỗi cung ứng thực phẩm dinh dưỡng, hạt ngũ cốc cao cấp & trà thảo mộc hữu cơ đạt chuẩn kiểm nghiệm an toàn thực phẩm quốc tế.',
  'lumiere-living':
    'Hệ sinh thái thiết bị điện tử gia dụng thông minh & phụ kiện số cao cấp nâng tầm chất lượng sống tiện nghi cho gia đình trẻ.',
};

/** Catalogue fixtures use existing repository photos, whose sources are documented in assets/products/real/README.md. */
export const PRODUCT_TEMPLATES = [
  // 1. Sora Skincare & Cosmetics (Mỹ phẩm & Chăm sóc da)
  {
    name: 'Serum Dưỡng Trắng Mờ Thâm Vitamin C 15%',
    category: 'Mỹ phẩm & Chăm sóc da',
    image: 'vitamin-c-15-serum.jpg',
    price: 280_000,
    size: '30 ml',
    largeSize: '50 ml',
    attrName: 'Dung tích',
    sku: 'SKIN-VTC15',
    ingredients: 'Pure Vitamin C 15% (3-O-Ethyl Ascorbic Acid), Hyaluronic Acid đa phân tử, Niacinamide 2%, Chiết xuất mận Kakadu hữu cơ.',
    origin: 'Hàn Quốc (Nhập khẩu & Phân phối độc quyền)',
    description: '<h2>Serum Dưỡng Trắng Mờ Thâm Vitamin C 15% — Sora Skin</h2><p>Công thức chống oxy hóa chuyên sâu giúp làm mờ đốm nâu, sạm nám và kích thích tổng hợp collagen tự nhiên. Kết cấu mỏng nhẹ, thẩm thấu nhanh không gây bết dính.</p><p>Sản phẩm đạt chuẩn phân phối chính hãng trên sàn SCANMS, cam kết 100% nguồn gốc xuất xứ và kiểm định an toàn da liễu.</p>',
  },
  {
    name: 'Kem Chống Nắng Phổ Rộng Kiềm Dầu SPF50+ PA++++',
    category: 'Mỹ phẩm & Chăm sóc da',
    image: 'spf50-oil-control.jpg',
    price: 320_000,
    size: '50 ml',
    largeSize: '100 ml',
    attrName: 'Dung tích',
    sku: 'SKIN-SUN50',
    ingredients: 'Zinc Oxide 12%, Titanium Dioxide 5%, Niacinamide, Chiết xuất rau má Centella Asiatica, Trà xanh đảo Jeju.',
    origin: 'Hàn Quốc',
    description: '<h2>Kem Chống Nắng Phổ Rộng Kiềm Dầu SPF50+ PA++++ — Sora Skin</h2><p>Bảo vệ toàn diện trước tia UVA/UVB và ánh sáng xanh HEV. Màng lọc khoáng lai hữu cơ thông minh nâng tông tự nhiên và kiềm dầu suốt 8 giờ liên tục.</p>',
  },
  {
    name: 'Sữa Rửa Mặt Tạo Bọt Dịu Nhẹ Cấp Ẩm pH 5.5',
    category: 'Mỹ phẩm & Chăm sóc da',
    image: 'amino-cleanser-ph55.jpg',
    price: 180_000,
    size: '100 ml',
    largeSize: '150 ml',
    attrName: 'Dung tích',
    sku: 'SKIN-GEL55',
    ingredients: 'Amino Acid Complex, Ceramide NP, Chiết xuất hoa cúc La Mã, Glycerin thực vật.',
    origin: 'Nhật Bản',
    description: '<h2>Sữa Rửa Mặt Dịu Nhẹ Amino pH 5.5 — Sora Skin</h2><p>Làm sạch sâu bã nhờn và bụi mịn PM2.5 mà không gây khô căng hay tổn thương hàng rào bảo vệ sinh học của da.</p>',
  },

  // 2. Aura Activewear & Apparel (Thời trang & Phụ kiện)
  {
    name: 'Váy Đầm Linen Tự Nhiên Cao Cấp Thoáng Khí',
    category: 'Thời trang & Phụ kiện',
    image: 'linen-dress.jpg',
    price: 450_000,
    size: 'Size S/M',
    largeSize: 'Size L/XL',
    attrName: 'Kích cỡ',
    sku: 'FASH-DRS01',
    ingredients: '100% Sợi đũi tự nhiên (Organic French Linen), Cúc xà cừ khắc logo thương hiệu.',
    origin: 'Việt Nam (Gia công xuất khẩu)',
    description: '<h2>Váy Đầm Linen Tự Nhiên Cao Cấp — Aura Apparel</h2><p>Thiết kế thanh lịch phong cách French Minimalist, thấm hút mồ hôi tối đa và thoáng mát tuyệt đối dưới thời tiết nhiệt đới.</p>',
  },
  {
    name: 'Bộ Quần Áo Tập Gym Nữ Co Giãn 4 Chiều Thoáng Mát',
    category: 'Thời trang & Phụ kiện',
    image: 'linen-dress.jpg',
    price: 380_000,
    size: 'Size S/M',
    largeSize: 'Size L/XL',
    attrName: 'Kích cỡ',
    sku: 'FASH-GYM02',
    ingredients: '80% Polyamide cao cấp, 20% Elastane Spandex dệt sợi 4 chiều kháng khuẩn Ion Bạc.',
    origin: 'Việt Nam',
    description: '<h2>Bộ Tập Gym Co Giãn 4 Chiều — Aura Activewear</h2><p>Form ôm tôn dáng thể thao, đường may phẳng Flatlock không ma sát cọ xát vào da trong quá trình vận động cường độ cao.</p>',
  },
  {
    name: 'Áo Khoác Chạy Bộ Gió Siêu Nhẹ Kháng Nước UV Cut',
    category: 'Thời trang & Phụ kiện',
    image: 'linen-dress.jpg',
    price: 320_000,
    size: 'Size M',
    largeSize: 'Size L',
    attrName: 'Kích cỡ',
    sku: 'FASH-WND03',
    ingredients: 'Vải dù Microfiber siêu nhẹ 45g/m², Lớp phủ chống thấm DWR, Chỉ số chống tia cực tím UPF 50+.',
    origin: 'Việt Nam',
    description: '<h2>Áo Khoác Gió Thể Thao Siêu Nhẹ — Aura Apparel</h2><p>Trọng lượng siêu nhẹ chỉ 120g có thể gấp gọn trong lòng bàn tay. Kháng nước nhẹ và cản gió hiệu quả cho người chạy bộ.</p>',
  },

  // 3. GreenBio Health & Nutrition (Thực phẩm chức năng & Sức khỏe)
  {
    name: 'Granola Hạt Dinh Dưỡng Hữu Cơ Sấy Lạnh',
    category: 'Thực phẩm chức năng & Sức khỏe',
    image: 'granola-500g.jpg',
    price: 185_000,
    size: '250 g',
    largeSize: '500 g',
    attrName: 'Khối lượng',
    sku: 'HLTH-GRN01',
    ingredients: 'Yến mạch Úc nguyên cám, Hạt điều Bình Phước, Hạnh nhân Mỹ, Hạt óc chó Chile, Nho khô, Mật ong hoa nhãn nguyên chất.',
    origin: 'Việt Nam (Nguyên liệu nhập khẩu)',
    description: '<h2>Granola Hạt Dinh Dưỡng Hữu Cơ Sấy Lạnh — GreenBio</h2><p>Bữa sáng lành mạnh giàu chất xơ hòa tan và axit béo Omega-3 tự nhiên. Không đường tinh luyện, không chất bảo quản.</p>',
  },
  {
    name: 'Trà Hoa Cúc Thảo Mộc Hữu Cơ Thanh Nhiệt',
    category: 'Thực phẩm chức năng & Sức khỏe',
    image: 'chamomile-tea-50g.webp',
    price: 135_000,
    size: '50 g',
    largeSize: '100 g',
    attrName: 'Khối lượng',
    sku: 'HLTH-TEA02',
    ingredients: '100% Hoa cúc kim cúc hữu cơ sấy thăng hoa, Kỷ tử đỏ Ninh Hạ, Táo đỏ Tân Cương.',
    origin: 'Việt Nam',
    description: '<h2>Trà Hoa Cúc Thảo Mộc Thanh Nhiệt — GreenBio</h2><p>Giúp an thần, thanh lọc cơ thể và mang lại giấc ngủ sâu tự nhiên. Hương thơm thảo mộc dịu nhẹ thanh tao.</p>',
  },
  {
    name: 'Viên Uống Cấp Nước Đẹp Da Hydro Boost',
    category: 'Thực phẩm chức năng & Sức khỏe',
    image: 'hydro-boost-50g.jpg',
    price: 340_000,
    size: 'Hộp 30 viên',
    largeSize: 'Hộp 60 viên',
    attrName: 'Quy cách',
    sku: 'HLTH-HYD03',
    ingredients: 'Hyaluronic Acid 120mg, Collagen Peptide cá tuyết biển sâu 500mg, Vitamin E, Coenzyme Q10.',
    origin: 'Nhật Bản',
    description: '<h2>Viên Uống Cấp Nước Đẹp Da Hydro Boost — GreenBio</h2><p>Bổ sung độ ẩm sâu từ bên trong tế bào, ngăn ngừa lão hóa sớm và cải thiện độ đàn hồi căng mịn của làn da.</p>',
  },

  // 4. Lumière Smart Living (Thiết bị điện tử & Phụ kiện)
  {
    name: 'Nồi Chiên Không Dầu Điện Tử Dung Tích 6.5L',
    category: 'Thiết bị điện tử & Phụ kiện',
    image: 'air-fryer-65l.jpg',
    price: 1_450_000,
    size: 'Bản Tiêu Chuẩn 6.5L',
    largeSize: 'Bản Full Phụ Kiện',
    attrName: 'Phiên bản',
    sku: 'TECH-AFY01',
    ingredients: 'Vỏ thép không gỉ SUS304, Lòng nồi tráng men gốm chống dính Ceramic sinh học an toàn thực phẩm.',
    origin: 'Đức (Công nghệ sản xuất)',
    description: '<h2>Nồi Chiên Không Dầu Điện Tử 6.5L — Lumière Smart Living</h2><p>Công nghệ đối lưu Rapid Air 360 độ giảm đến 85% lượng dầu mỡ thừa. Bảng điều khiển cảm ứng LED hiển thị 12 chương trình nấu nướng tự động.</p>',
  },
  {
    name: 'Tai Nghe Bluetooth True Wireless Chống Ồn ANC',
    category: 'Thiết bị điện tử & Phụ kiện',
    image: 'wireless-earbuds.jpg',
    price: 650_000,
    size: 'Trắng Ceramic',
    largeSize: 'Đen Nhám',
    attrName: 'Màu sắc',
    sku: 'TECH-EAR02',
    ingredients: 'Chip Bluetooth 5.4 Low-Latency, Driver màng Titanium 13mm, Micro khử ồn ENC 4-mic.',
    origin: 'Việt Nam (Lắp ráp công nghệ cao)',
    description: '<h2>Tai Nghe Không Dây Chống Ồn Chủ Động ANC — Lumière</h2><p>Khả năng triệt tiêu tiếng ồn môi trường lên đến 38dB. Thời lượng pin trâu 36 giờ kèm dock sạc không dây Type-C chuẩn Qi.</p>',
  },
  {
    name: 'Bàn Phím Cơ Không Dây Tri-Mode RGB Hotswap',
    category: 'Thiết bị điện tử & Phụ kiện',
    image: 'keyboard-tri-mode.webp',
    price: 890_000,
    size: 'Red Switch (Êm ái)',
    largeSize: 'Brown Switch (Tactile)',
    attrName: 'Loại Switch',
    sku: 'TECH-KEY03',
    ingredients: 'Khung nhôm CNC Anode hóa, Keycap PBT Doubleshot xuyên LED, Mạch xuôi Hotswap 5-pin.',
    origin: 'Việt Nam',
    description: '<h2>Bàn Phím Cơ Không Dây Tri-Mode RGB — Lumière</h2><p>Hỗ trợ 3 chế độ kết nối: Type-C, Bluetooth 5.0 và Wireless 2.4GHz siêu tốc 1000Hz. Pin sạc dung lượng cao 4000mAh dùng bền bỉ 2 tuần.</p>',
  },
] as const;

export const RETURN_POLICY =
  'Yêu cầu đổi trả trong 14 ngày kể từ khi giao hàng; cung cấp ảnh và video mở hộp. Shop kiểm tra hồ sơ trước khi xử lý đổi sản phẩm hoặc hoàn tiền.';
export const WARRANTY_POLICY =
  'Tiếp nhận phản ánh về chất lượng, bao bì và nguồn gốc theo chính sách gian hàng.';
