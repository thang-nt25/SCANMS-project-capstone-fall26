const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const isRemote =
  connectionString?.includes('supabase') ||
  connectionString?.includes('pooler') ||
  connectionString?.includes('sslmode=require');

const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('🌱 Bắt đầu nạp dữ liệu thật 100% vào Database SCANMS...');

  // 1. Tìm hoặc tạo tài khoản Nguyễn Thành Thắng (Top KOL)
  let thangUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'demo@scanms.vn' },
        { id: '237a7208-1c74-4322-96b2-51d810660723' },
      ],
    },
  });

  if (!thangUser) {
    thangUser = await prisma.user.create({
      data: {
        id: '237a7208-1c74-4322-96b2-51d810660723',
        email: 'demo@scanms.vn',
        fullName: 'Nguyễn Thành Thắng (Top KOL)',
        role: 'COLLABORATOR',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehashforseed$fakehashforseed',
        isActive: true,
      },
    });
  }
  console.log('✅ User KOL Thắng:', thangUser.id, thangUser.fullName);

  // Cập nhật Profile & Kênh Mạng Xã Hội cho Thắng
  await prisma.collaboratorProfile.upsert({
    where: { userId: thangUser.id },
    create: {
      userId: thangUser.id,
      bio: 'Chuyên gia sáng tạo nội dung Lifestyle, Mỹ phẩm & Công nghệ. Top 1 Creator tháng 8/2026 với hơn 1.2 tỷ doanh số tiếp thị.',
      bankName: 'MBBank (Ngân hàng Quân Đội)',
      bankAccountNumber: '999988882026',
      bankAccountName: 'NGUYEN THANH THANG',
      idCardNumber: '001202008899',
      taxCode: '882026001',
      kycStatus: 'VERIFIED',
      totalFollowers: 280000,
      totalOrdersReferred: 185,
      totalEarnedCommission: 48500000,
    },
    update: {
      kycStatus: 'VERIFIED',
      totalFollowers: 280000,
      bankName: 'MBBank (Ngân hàng Quân Đội)',
      bankAccountNumber: '999988882026',
      bankAccountName: 'NGUYEN THANH THANG',
      totalOrdersReferred: 185,
    },
  });

  // Kênh mạng xã hội TikTok & YouTube của Thắng
  await prisma.collaboratorSocialChannel.deleteMany({
    where: { collaboratorId: thangUser.id },
  });
  await prisma.collaboratorSocialChannel.createMany({
    data: [
      {
        collaboratorId: thangUser.id,
        platformName: 'TIKTOK',
        channelName: 'Thắng Review (@thang_review)',
        channelUrl: 'https://tiktok.com/@thang_review',
        followerCount: 185000,
        isPrimary: true,
      },
      {
        collaboratorId: thangUser.id,
        platformName: 'YOUTUBE',
        channelName: 'Thắng Tech & Lifestyle',
        channelUrl: 'https://youtube.com/@thangtechlifestyle',
        followerCount: 95000,
        isPrimary: false,
      },
    ],
  });
  console.log('✅ Cập nhật Profile & Social Channels cho Thắng');

  // 1.1 KOL Lê Thùy Linh (Linh Skincare Daily)
  const linhUser = await prisma.user.upsert({
    where: { email: 'linh.beauty@scanms.vn' },
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'linh.beauty@scanms.vn',
      fullName: 'Lê Thùy Linh (Linh Skincare)',
      role: 'COLLABORATOR',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehashforseed$fakehashforseed',
      isActive: true,
    },
    update: {
      fullName: 'Lê Thùy Linh (Linh Skincare)',
    },
  });
  await prisma.collaboratorProfile.upsert({
    where: { userId: linhUser.id },
    create: {
      userId: linhUser.id,
      bio: 'Beauty Blogger chuyên dòng Dược mỹ phẩm & Skincare khoa học. Đã thực hiện hơn 50 video review triệu views.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bankName: 'Techcombank',
      bankAccountNumber: '190388829101',
      bankAccountName: 'LE THUY LINH',
      kycStatus: 'VERIFIED',
      totalFollowers: 360000,
      totalOrdersReferred: 240,
      totalEarnedCommission: 64500000,
    },
    update: {
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      kycStatus: 'VERIFIED',
      totalFollowers: 360000,
      totalOrdersReferred: 240,
      totalEarnedCommission: 64500000,
    },
  });
  await prisma.collaboratorSocialChannel.deleteMany({ where: { collaboratorId: linhUser.id } });
  await prisma.collaboratorSocialChannel.createMany({
    data: [
      {
        collaboratorId: linhUser.id,
        platformName: 'TIKTOK',
        channelName: 'Linh Skincare Daily (@linh.beauty)',
        channelUrl: 'https://tiktok.com/@linh.beauty',
        followerCount: 240000,
        isPrimary: true,
      },
      {
        collaboratorId: linhUser.id,
        platformName: 'INSTAGRAM',
        channelName: 'Linh Official (@linh.beauty.official)',
        channelUrl: 'https://instagram.com/linh.beauty.official',
        followerCount: 120000,
        isPrimary: false,
      },
    ],
  });

  // 1.2 KOL Trần Hoàng Nam (Nam Skincare)
  const namUser = await prisma.user.upsert({
    where: { email: 'nam.skincare@scanms.vn' },
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'nam.skincare@scanms.vn',
      fullName: 'Trần Hoàng Nam (Nam Skincare)',
      role: 'COLLABORATOR',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehashforseed$fakehashforseed',
      isActive: true,
    },
    update: {
      fullName: 'Trần Hoàng Nam (Nam Skincare)',
    },
  });
  await prisma.collaboratorProfile.upsert({
    where: { userId: namUser.id },
    create: {
      userId: namUser.id,
      bio: 'Sáng tạo nội dung chăm sóc da cho nam giới & lối sống lành mạnh. Tỷ lệ chuyển đổi đơn hàng trung bình 6.8%.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bankName: 'Vietcombank',
      bankAccountNumber: '007100829188',
      bankAccountName: 'TRAN HOANG NAM',
      kycStatus: 'VERIFIED',
      totalFollowers: 240000,
      totalOrdersReferred: 142,
      totalEarnedCommission: 38200000,
    },
    update: {
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      kycStatus: 'VERIFIED',
      totalFollowers: 240000,
      totalOrdersReferred: 142,
      totalEarnedCommission: 38200000,
    },
  });
  await prisma.collaboratorSocialChannel.deleteMany({ where: { collaboratorId: namUser.id } });
  await prisma.collaboratorSocialChannel.createMany({
    data: [
      {
        collaboratorId: namUser.id,
        platformName: 'TIKTOK',
        channelName: 'Nam Men Skincare (@nam.skincare)',
        channelUrl: 'https://tiktok.com/@nam.skincare',
        followerCount: 160000,
        isPrimary: true,
      },
      {
        collaboratorId: namUser.id,
        platformName: 'YOUTUBE',
        channelName: 'Nam Skincare Channel',
        channelUrl: 'https://youtube.com/@namskincare',
        followerCount: 80000,
        isPrimary: false,
      },
    ],
  });
  console.log('✅ Đã tạo/cập nhật thêm 2 Top KOLs trong DB: Lê Thùy Linh & Trần Hoàng Nam');

  // 2. Tìm hoặc tạo tài khoản Chủ Shop đại diện
  let shopOwner = await prisma.user.findFirst({
    where: { role: 'SHOP_MANAGER' },
  });
  if (!shopOwner) {
    shopOwner = await prisma.user.create({
      data: {
        email: 'merchant.partner@scanms.vn',
        fullName: 'Trần Minh Đức (Chủ Shop Đối Tác)',
        role: 'SHOP_MANAGER',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehashforseed$fakehashforseed',
        isActive: true,
      },
    });
  }

  // 3. Danh sách 5 Gian hàng đối tác chuẩn mực (UUID cố định để đồng bộ)
  const STORES_DATA = [
    {
      id: 'a7e7bd20-bebc-44c9-a98b-004de44cf773',
      name: 'Sora Skin Official Store',
      slug: 'sora-skin',
      logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150&auto=format&fit=crop&q=80',
      description: 'Gian hàng chính hãng phân phối dòng dược mỹ phẩm phục hồi da và kem chống nắng thế hệ mới.',
      websiteUrl: 'https://soraskin.vn',
      defaultCommissionRate: 25.0,
      isVerified: true,
      policyShipping: 'Giao hàng hỏa tốc 2h tại TP.HCM & Hà Nội. Miễn phí vận chuyển toàn quốc cho đơn từ 299k.',
      policyReturn: 'Đổi trả miễn phí trong 15 ngày nếu có kích ứng hoặc lỗi đóng gói.',
      products: [
        {
          id: '11111111-1111-4111-8111-111111111101',
          title: 'Serum Phục Hồi & Làm Dịu Da B5 Centella Sora Skin 50ml',
          sku: 'SS-B5-50ML',
          price: 385000,
          originalPrice: 480000,
          commissionRate: 25,
          imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 450,
          description: 'Tinh chất rau má phục hồi da kích ứng, củng cố hàng rào bảo vệ da sau treatment.',
        },
        {
          id: '11111111-1111-4111-8111-111111111102',
          title: 'Kem Chống Nắng Phổ Rộng Kiềm Dầu Sora Skin Invisible Shield SPF50+',
          sku: 'SS-SUN-60ML',
          price: 420000,
          originalPrice: 520000,
          commissionRate: 28,
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 320,
          description: 'Màng lọc chống nắng thế hệ mới, kiềm dầu 8 tiếng, nâng tone nhẹ nhàng tự nhiên.',
        },
        {
          id: '11111111-1111-4111-8111-111111111103',
          title: 'Sữa Rửa Mặt Tạo Bọt Dịu Nhẹ pH 5.5 Amino Acid Sora Skin 150ml',
          sku: 'SS-CLEAN-150',
          price: 245000,
          originalPrice: 310000,
          commissionRate: 22,
          imageUrl: 'https://images.unsplash.com/photo-1556228722-d0b5ed7cd88c?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 580,
          description: 'Làm sạch sâu bã nhờn mà không gây khô căng, phù hợp cho mọi loại da kể cả da nhạy cảm.',
        },
      ],
    },
    {
      id: '8ca136c3-9202-4254-bd4c-3704a840fa7b',
      name: 'TechStore Flagship Store',
      slug: 'techstore-flagship',
      logoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=150&auto=format&fit=crop&q=80',
      description: 'Hệ thống phân phối thiết bị âm thanh, phụ kiện công nghệ gaming và thiết bị setup bàn làm việc.',
      websiteUrl: 'https://techstore.scanms.vn',
      defaultCommissionRate: 18.0,
      isVerified: true,
      policyShipping: 'Bảo hành 1 đổi 1 trong 12 tháng tại 14 chi nhánh toàn quốc.',
      policyReturn: '7 ngày đổi trả nếu sản phẩm có lỗi từ nhà sản xuất.',
      products: [
        {
          id: '22222222-2222-4222-8222-222222222201',
          title: 'Tai nghe Bluetooth True Wireless Chống Ồn ANC Pro X',
          sku: 'TS-ANC-PROX',
          price: 1290000,
          originalPrice: 1690000,
          commissionRate: 18,
          imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 180,
          description: 'Chống ồn chủ động 42dB, pin 36 tiếng kèm hộp sạc không dây.',
        },
        {
          id: '22222222-2222-4222-8222-222222222202',
          title: 'Bàn phím cơ Không dây 3 Modes Hotswap RGB Custom TechStore',
          sku: 'TS-KB-CUSTOM',
          price: 1850000,
          originalPrice: 2200000,
          commissionRate: 20,
          imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 95,
          description: 'Gasket mount êm ái, switch prelube mượt mà, LED RGB 16.8 triệu màu.',
        },
      ],
    },
    {
      id: '461bdfe3-2260-4ac7-b93b-6a6da5c45535',
      name: 'Aura Bio Cosmetics Vietnam',
      slug: 'aura-bio-cosmetics',
      logoUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=150&auto=format&fit=crop&q=80',
      description: 'Thương hiệu dược mỹ phẩm thuần chay hữu cơ đạt chứng nhận ECOCERT Châu Âu.',
      websiteUrl: 'https://aurabio.vn',
      defaultCommissionRate: 22.0,
      isVerified: true,
      policyShipping: 'Giao hàng tiêu chuẩn 2-3 ngày, đóng gói hộp carton sinh học bảo vệ môi trường.',
      policyReturn: 'Cam kết 100% thành phần hữu cơ an toàn cho phụ nữ mang thai.',
      products: [
        {
          id: '33333333-3333-4333-8333-333333333301',
          title: 'Dầu Tẩy Trang Hữu Cơ Chiết Xuất Hoa Cúc Aura Bio 180ml',
          sku: 'AB-CLEAN-OIL',
          price: 360000,
          originalPrice: 450000,
          commissionRate: 24,
          imageUrl: 'https://images.unsplash.com/photo-1608248597359-00f7fc8eb726?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 210,
          description: 'Nhũ hóa tức thì, hòa tan lớp makeup chống nước cứng đầu mà không gây bít tắc lỗ chân lông.',
        },
        {
          id: '33333333-3333-4333-8333-333333333302',
          title: 'Kem Dưỡng Ẩm Trắng Da Ban Đêm Niacinamide 10% Aura Bio 50g',
          sku: 'AB-CREAM-NIA',
          price: 490000,
          originalPrice: 620000,
          commissionRate: 26,
          imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 160,
          description: 'Làm mờ thâm mụn, đều màu da và nuôi dưỡng làn da căng bóng mịn màng.',
        },
      ],
    },
    {
      id: 'c4444444-4444-4444-8444-444444444444',
      name: 'GreenBio Health & Herbs',
      slug: 'greenbio-health-herbs',
      logoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=150&auto=format&fit=crop&q=80',
      description: 'Thực phẩm dinh dưỡng, trà thảo mộc organic và thực phẩm bổ sung bảo vệ sức khỏe gia đình.',
      websiteUrl: 'https://greenbio.vn',
      defaultCommissionRate: 20.0,
      isVerified: true,
      policyShipping: 'Giao nhanh toàn quốc, đóng gói túi giữ nhiệt đối với sản phẩm men vi sinh.',
      policyReturn: 'Đổi mới miễn phí nếu tem niêm phong có dấu hiệu cạy mở.',
      products: [
        {
          id: '44444444-4444-4444-8444-444444444401',
          title: 'Trà Thảo Mộc Thanh Nhiệt Ngủ Ngon Hoa Cúc & Đông Trùng GreenBio',
          sku: 'GB-TEA-CHAMOMILE',
          price: 195000,
          originalPrice: 260000,
          commissionRate: 20,
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 400,
          description: 'Hỗ trợ thư giãn tinh thần, dễ ngủ và tăng cường hệ miễn dịch tự nhiên.',
        },
        {
          id: '44444444-4444-4444-8444-444444444402',
          title: 'Hạt Dinh Dưỡng Granola Siêu Hạt Nướng Mật Ong Nguyên Chất 500g',
          sku: 'GB-GRANOLA-500',
          price: 165000,
          originalPrice: 220000,
          commissionRate: 22,
          imageUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 350,
          description: 'Bữa sáng healthy giàu chất xơ và protein thực vật cho người tập luyện và giảm cân.',
        },
      ],
    },
    {
      id: 'd5555555-5555-4555-8555-555555555555',
      name: 'Lumière Lab Vietnam',
      slug: 'lumiere-lab-vietnam',
      logoUrl: 'https://images.unsplash.com/photo-1532413992378-f169ac26fff0?w=150&auto=format&fit=crop&q=80',
      description: 'Phòng thí nghiệm ứng dụng công nghệ Nano Peptide trong chống lão hóa và trẻ hóa làn da.',
      websiteUrl: 'https://lumierelab.vn',
      defaultCommissionRate: 30.0,
      isVerified: true,
      policyShipping: 'Được kiểm tra hàng trước khi thanh toán, có mã QR truy xuất nguồn gốc từng lô hàng.',
      policyReturn: 'Cam kết hoàn tiền 200% nếu phát hiện hàng không chuẩn chính ngạch.',
      products: [
        {
          id: '55555555-5555-4555-8555-555555555501',
          title: 'Ampoule Chống Lão Hóa Chuyên Sâu Multi-Peptide Lumière 30ml',
          sku: 'LL-AMPOULE-PEP',
          price: 680000,
          originalPrice: 890000,
          commissionRate: 30,
          imageUrl: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=300&auto=format&fit=crop&q=80',
          stockQuantity: 120,
          description: 'Kích thích tăng sinh collagen gấp 3 lần, xóa mờ nếp nhăn đuôi mắt và rãnh cười.',
        },
      ],
    },
  ];

  for (const sData of STORES_DATA) {
    const { products, ...storeProps } = sData;
    const store = await prisma.store.upsert({
      where: { id: storeProps.id },
      create: {
        ...storeProps,
        ownerId: shopOwner.id,
        isActive: true,
      },
      update: {
        name: storeProps.name,
        slug: storeProps.slug,
        logoUrl: storeProps.logoUrl,
        description: storeProps.description,
        defaultCommissionRate: storeProps.defaultCommissionRate,
        isVerified: true,
        isActive: true,
      },
    });

    console.log(`🏪 Đã cập nhật Store: ${store.name} (${store.id})`);

    // Tạo các sản phẩm thật
    for (const prod of products) {
      const { commissionRate, ...prodFields } = prod;
      const rate = commissionRate || 20;
      await prisma.product.upsert({
        where: { id: prod.id },
        create: {
          ...prodFields,
          customCommissionRate: rate,
          storeId: store.id,
          isActive: true,
        },
        update: {
          title: prod.title,
          sku: prod.sku,
          price: prod.price,
          customCommissionRate: rate,
          imageUrl: prod.imageUrl,
          isActive: true,
        },
      });
    }

    const targetUserIds = [thangUser.id, '237a7208-1c74-4322-96b2-51d810660723'];
    for (const uId of targetUserIds) {
      // Đảm bảo user tồn tại
      const uExists = await prisma.user.findUnique({ where: { id: uId } });
      if (!uExists) continue;

      // Tạo StoreCollaborator liên kết với Store này
      await prisma.storeCollaborator.upsert({
        where: {
          storeId_collaboratorId: {
            storeId: store.id,
            collaboratorId: uId,
          },
        },
        create: {
          storeId: store.id,
          collaboratorId: uId,
          status: 'APPROVED',
          approvedAt: new Date(),
          note: 'Đối tác chiến lược Creator hạng Vàng',
        },
        update: {
          status: 'APPROVED',
        },
      });

      // Tạo cuộc trò chuyện thật (Conversation)
      let conv = await prisma.conversation.findFirst({
        where: {
          storeId: store.id,
          collaboratorId: uId,
        },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            storeId: store.id,
            collaboratorId: uId,
            lastMessageAt: new Date(),
          },
        });
      }

      // Nạp tin nhắn mẫu thật vào Conversation nếu chưa có tin nhắn
      const msgCount = await prisma.chatMessage.count({
        where: { conversationId: conv.id },
      });

      if (msgCount === 0) {
        await prisma.chatMessage.createMany({
          data: [
            {
              conversationId: conv.id,
              senderId: shopOwner.id,
              messageText: `Chào bạn ${uExists.fullName}! ${store.name} rất vui mừng được kết nối hợp tác cùng bạn trên sàn SCANMS. Bên mình đã duyệt mức hoa hồng ưu đãi ${storeProps.defaultCommissionRate}% cho bạn nhé! ✨`,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
              isRead: true,
            },
            {
              conversationId: conv.id,
              senderId: uId,
              messageText: `Dạ em chào ${store.name} ạ! Em vừa xem qua các dòng sản phẩm của bên mình và thấy rất tiềm năng cho tệp khán giả kênh của em. Em xin phép đăng ký nhận mẫu dùng thử để chuẩn bị lên bài review nhé shop!`,
              createdAt: new Date(Date.now() - 1000 * 60 * 45),
              isRead: true,
            },
            {
              conversationId: conv.id,
              senderId: shopOwner.id,
              messageText: `Tuyệt vời bạn ơi! Bạn bấm vào tab "Hàng Mẫu Dùng Thử" chọn sản phẩm bạn muốn test nhé, kho bên mình sẽ xuất đơn gửi bưu tá giao tận nhà cho bạn trong ngày hôm nay! 🚚📦`,
              createdAt: new Date(Date.now() - 1000 * 60 * 15),
              isRead: true,
            },
          ],
        });
      }
      console.log(`💬 Hội thoại sẵn sàng cho User ${uExists.fullName}: Conv ID ${conv.id} với ${store.name}`);
    }
  }

  console.log('🎉 Nạp dữ liệu thật 100% vào Database SCANMS hoàn tất mỹ mãn!');
}

seed()
  .catch((err) => {
    console.error('❌ Lỗi nạp seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
