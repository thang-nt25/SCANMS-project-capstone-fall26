export const SHOPS = [
  { name: 'Sora Skin', slug: 'sora-skin', logo: 'shop-sora-skin.png' },
  { name: 'Aura Bio', slug: 'aura-bio', logo: 'shop-aura-bio.png' },
  { name: 'GreenBio', slug: 'greenbio', logo: 'shop-greenbio.png' },
  { name: 'Lumière Lab', slug: 'lumiere-lab', logo: 'shop-lumiere-lab.png' },
  { name: 'Oribe', slug: 'oribe' },
  { name: 'Cỏ Mềm', slug: 'co-mem' },
  { name: 'Cocoon', slug: 'cocoon' },
  { name: 'Nature Queen', slug: 'nature-queen' },
  { name: 'Sao Thái Dương', slug: 'sao-thai-duong' },
  { name: 'Bách Hóa Sống Xanh', slug: 'bach-hoa-song-xanh' },
  { name: 'Dermedic VN', slug: 'dermedic-vn' },
  { name: 'BioCosmetics', slug: 'biocosmetics' },
  { name: 'An An', slug: 'an-an' },
  { name: 'Medimix', slug: 'medimix' },
  { name: 'Herbal Spa', slug: 'herbal-spa' },
] as const;

export const SHOP_DESCRIPTIONS: Record<string, string> = {
  'sora-skin':
    'Thương hiệu mỹ phẩm dưỡng da ứng dụng hoạt chất sinh học nồng độ cao, chuyên sâu điều trị & phục hồi hàng rào bảo vệ da.',
  'aura-bio':
    'Dược mỹ phẩm sinh học thuần chay, chiết xuất thảo mộc hữu cơ lành tính cho làn da nhạy cảm.',
  'greenbio':
    'Chuỗi cung ứng thực phẩm dinh dưỡng, hạt ngũ cốc cao cấp & nông sản hữu cơ sấy lạnh đạt chuẩn quốc tế.',
  'lumiere-lab':
    'Viện nghiên cứu & phát triển giải pháp chăm sóc tóc & cơ thể sinh học cao cấp theo công nghệ châu Âu.',
  oribe:
    'Mỹ phẩm thảo dược thiên nhiên an toàn, giải pháp chăm sóc da dịu nhẹ cho mọi thành viên trong gia đình.',
  'co-mem':
    'Mỹ phẩm thiên nhiên Lành và Thật, không hương liệu tổng hợp, an toàn tuyệt đối cho mẹ bầu và trẻ nhỏ.',
  cocoon:
    'Mỹ phẩm thuần chay 100% từ thực vật Việt Nam như cà phê Đắk Lắk, hoa hồng Cao Bằng, bưởi Bến Tre.',
  'nature-queen':
    'Dầu gội & sản phẩm thảo dược hữu cơ chất lượng cao xuất khẩu Mỹ và châu Âu từ thảo mộc truyền thống.',
  'sao-thai-duong':
    'Thương hiệu dược liệu hàng đầu Việt Nam với hơn 20 năm nghiên cứu phát triển tinh hoa y học cổ truyền.',
  'bach-hoa-song-xanh':
    'Hệ sinh thái sản phẩm tiêu dùng xanh, thân thiện môi trường và an toàn cho sức khỏe gia đình.',
  'dermedic-vn':
    'Dược mỹ phẩm điều trị chuyên sâu từ nguồn khoáng Ba Lan dành riêng cho các vấn đề da liễu.',
  biocosmetics:
    'Mỹ phẩm công nghệ sinh học tiên tiến, tăng cường hấp thu dưỡng chất và nuôi dưỡng tế bào da.',
  'an-an':
    'Nhang trầm & các sản phẩm thảo mộc organic sạch 100%, bảo tồn giá trị văn hóa và an toàn hô hấp.',
  medimix:
    'Xà bông & thảo dược trị liệu Ayurvedic truyền thống của Ấn Độ với công thức 18 loại thảo mộc quý.',
  'herbal-spa':
    'Liệu pháp chăm sóc cơ thể & thư giãn từ tinh dầu tự nhiên và thảo dược quý nguồn gốc bản địa.',
};

/** Catalogue fixtures use existing repository photos, whose sources are documented in assets/products/real/README.md. */
export const PRODUCT_TEMPLATES = [
  {
    name: 'Serum Vitamin C',
    category: 'Chăm sóc da',
    image: 'vitamin-c-15-serum.jpg',
    price: 250_000,
    size: '30 ml',
    largeSize: '50 ml',
  },
  {
    name: 'Sữa rửa mặt dịu nhẹ pH 5.5',
    category: 'Chăm sóc da',
    image: 'amino-cleanser-ph55.jpg',
    price: 160_000,
    size: '100 ml',
    largeSize: '150 ml',
  },
  {
    name: 'Dầu tẩy trang hoa cúc',
    category: 'Chăm sóc da',
    image: 'aura-cleansing-oil.jpg',
    price: 220_000,
    size: '100 ml',
    largeSize: '150 ml',
  },
  {
    name: 'Kem dưỡng Niacinamide ban đêm',
    category: 'Chăm sóc da',
    image: 'niacinamide-night-cream.webp',
    price: 240_000,
    size: '30 g',
    largeSize: '50 g',
  },
  {
    name: 'Trà hoa cúc',
    category: 'Thực phẩm sức khỏe',
    image: 'chamomile-tea-50g.webp',
    price: 120_000,
    size: '50 g',
    largeSize: '100 g',
  },
  {
    name: 'Granola hạt dinh dưỡng',
    category: 'Thực phẩm sức khỏe',
    image: 'granola-500g.jpg',
    price: 180_000,
    size: '250 g',
    largeSize: '500 g',
  },
  {
    name: 'Serum phục hồi B5',
    category: 'Chăm sóc da',
    image: 'centella-b5-serum.jpg',
    price: 260_000,
    size: '30 ml',
    largeSize: '50 ml',
  },
  {
    name: 'Ampoule Multi Peptide',
    category: 'Chăm sóc da',
    image: 'multi-peptide-ampoule.png',
    price: 290_000,
    size: '30 ml',
    largeSize: '50 ml',
  },
  {
    name: 'Sữa rửa mặt tràm trà',
    category: 'Chăm sóc cơ thể',
    image: 'tea-tree-cleanser.jpg',
    price: 140_000,
    size: '100 ml',
    largeSize: '200 ml',
  },
  {
    name: 'Kem dưỡng cấp ẩm',
    category: 'Chăm sóc da',
    image: 'hydro-boost-50g.jpg',
    price: 230_000,
    size: '30 g',
    largeSize: '50 g',
  },
  {
    name: 'Toner BHA 2%',
    category: 'Chăm sóc da',
    image: 'bha-toner-2pct.png',
    price: 210_000,
    size: '100 ml',
    largeSize: '150 ml',
  },
  {
    name: 'Kem chống nắng SPF50',
    category: 'Chăm sóc da',
    image: 'spf50-oil-control.jpg',
    price: 270_000,
    size: '30 ml',
    largeSize: '50 ml',
  },
  {
    name: 'Mặt nạ rau má',
    category: 'Chăm sóc da',
    image: 'centella-sheet-mask.jpg',
    price: 90_000,
    size: '5 miếng',
    largeSize: '10 miếng',
  },
  {
    name: 'Serum rau má B5',
    category: 'Chăm sóc da',
    image: 'one-thing-centella-b5.jpg',
    price: 200_000,
    size: '30 ml',
    largeSize: '50 ml',
  },
] as const;

export const RETURN_POLICY =
  'Yêu cầu đổi trả trong 14 ngày kể từ khi giao hàng; cung cấp ảnh và video mở hộp. Shop kiểm tra hồ sơ trước khi xử lý đổi sản phẩm hoặc hoàn tiền.';
export const WARRANTY_POLICY =
  'Tiếp nhận phản ánh về chất lượng, bao bì và nguồn gốc theo chính sách gian hàng.';
