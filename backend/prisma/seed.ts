import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  KycStatus,
  SocialPlatform,
  AssetType,
  OrderStatus,
  CommissionStatus,
  TransactionType,
  PayoutStatus,
  AttributionMethod,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu gieo mầm dữ liệu (Database Seeding)...');

  // Mật khẩu chung cho tất cả tài khoản test: Password@123
  const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

  // ==========================================
  // 1. TẠO TÀI KHOẢN NGƯỜI DÙNG (USERS)
  // ==========================================
  console.log('👤 Đang tạo tài khoản mẫu...');

  // 1.1 Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scanms.vn' },
    update: {},
    create: {
      email: 'admin@scanms.vn',
      passwordHash: defaultPasswordHash,
      role: UserRole.SYSTEM_ADMIN,
      fullName: 'Nguyễn Quản Trị (Super Admin)',
      phoneNumber: '0901000001',
    },
  });

  // 1.2 Chủ Cửa hàng (Shop Manager)
  const shopOwner = await prisma.user.upsert({
    where: { email: 'shop@techstore.vn' },
    update: {},
    create: {
      email: 'shop@techstore.vn',
      passwordHash: defaultPasswordHash,
      role: UserRole.SHOP_MANAGER,
      fullName: 'Trần Văn Chủ Shop',
      phoneNumber: '0902000002',
    },
  });

  // 1.3 KOL 1: Nguyễn Thành Thắng (Tier Vàng)
  const kol1 = await prisma.user.upsert({
    where: { email: 'kol1@scanms.vn' },
    update: {},
    create: {
      email: 'kol1@scanms.vn',
      passwordHash: defaultPasswordHash,
      role: UserRole.COLLABORATOR,
      fullName: 'Nguyễn Thành Thắng (Top KOL)',
      phoneNumber: '0987654321',
    },
  });

  // 1.4 KOL 2: Lê Thu Hà (Tier Bạc)
  const kol2 = await prisma.user.upsert({
    where: { email: 'kol2@scanms.vn' },
    update: {},
    create: {
      email: 'kol2@scanms.vn',
      passwordHash: defaultPasswordHash,
      role: UserRole.COLLABORATOR,
      fullName: 'Lê Thu Hà (KOL Lifestyle)',
      phoneNumber: '0912345678',
    },
  });

  // ==========================================
  // 2. CẤP BẬC KOL (COLLABORATOR TIERS) - Idempotent
  // ==========================================
  console.log('🎖️ Đang kiểm tra & tạo bảng cấp bậc KOL (Tiers)...');

  let bronzeTier = await prisma.collaboratorTier.findFirst({ where: { name: 'Đồng (Bronze)' } });
  if (!bronzeTier) {
    bronzeTier = await prisma.collaboratorTier.create({
      data: {
        name: 'Đồng (Bronze)',
        minRevenueThreshold: 0,
        extraBonusPercentage: 0.0,
      },
    });
  }

  let silverTier = await prisma.collaboratorTier.findFirst({ where: { name: 'Bạc (Silver)' } });
  if (!silverTier) {
    silverTier = await prisma.collaboratorTier.create({
      data: {
        name: 'Bạc (Silver)',
        minRevenueThreshold: 20000000,
        extraBonusPercentage: 1.0,
      },
    });
  }

  let goldTier = await prisma.collaboratorTier.findFirst({ where: { name: 'Vàng (Gold)' } });
  if (!goldTier) {
    goldTier = await prisma.collaboratorTier.create({
      data: {
        name: 'Vàng (Gold)',
        minRevenueThreshold: 50000000,
        extraBonusPercentage: 3.0,
      },
    });
  }

  let diamondTier = await prisma.collaboratorTier.findFirst({ where: { name: 'Kim Cương (Diamond)' } });
  if (!diamondTier) {
    diamondTier = await prisma.collaboratorTier.create({
      data: {
        name: 'Kim Cương (Diamond)',
        minRevenueThreshold: 100000000,
        extraBonusPercentage: 5.0,
      },
    });
  }

  // ==========================================
  // 3. HỒ SƠ KYC & KÊNH MẠNG XÃ HỘI CỦA KOL - Idempotent
  // ==========================================
  console.log('📝 Đang tạo hồ sơ KYC & kênh MXH...');

  await prisma.collaboratorProfile.upsert({
    where: { userId: kol1.id },
    update: {},
    create: {
      userId: kol1.id,
      tierId: goldTier.id,
      bio: 'Chuyên gia review đồ công nghệ & setup góc làm việc',
      idCardNumber: '001201012345',
      taxCode: '8012345678',
      bankName: 'MBBank (Ngân hàng Quân Đội)',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN THANH THANG',
      kycStatus: KycStatus.VERIFIED,
      totalFollowers: 150000,
      totalOrdersReferred: 142,
      totalEarnedCommission: 28500000,
    },
  });

  await prisma.collaboratorProfile.upsert({
    where: { userId: kol2.id },
    update: {},
    create: {
      userId: kol2.id,
      tierId: silverTier.id,
      bio: 'Reviewer phong cách sống, tai nghe và phụ kiện thời trang',
      idCardNumber: '001202056789',
      taxCode: '8098765432',
      bankName: 'Vietcombank',
      bankAccountNumber: '1019283746',
      bankAccountName: 'LE THU HA',
      kycStatus: KycStatus.VERIFIED,
      totalFollowers: 75000,
      totalOrdersReferred: 45,
      totalEarnedCommission: 8200000,
    },
  });

  // Kênh MXH (Kiểm tra tránh trùng lặp)
  const existingChannels = await prisma.collaboratorSocialChannel.findMany({
    where: { collaboratorId: { in: [kol1.id, kol2.id] } },
  });
  if (existingChannels.length === 0) {
    await prisma.collaboratorSocialChannel.createMany({
      data: [
        {
          collaboratorId: kol1.id,
          platformName: SocialPlatform.TIKTOK,
          channelName: '@thangtechreview',
          channelUrl: 'https://tiktok.com/@thangtechreview',
          followerCount: 120000,
          isPrimary: true,
        },
        {
          collaboratorId: kol1.id,
          platformName: SocialPlatform.YOUTUBE,
          channelName: 'Thắng Tech Setup',
          channelUrl: 'https://youtube.com/@thangtechsetup',
          followerCount: 30000,
          isPrimary: false,
        },
        {
          collaboratorId: kol2.id,
          platformName: SocialPlatform.TIKTOK,
          channelName: '@hakatabeauty',
          channelUrl: 'https://tiktok.com/@hakatabeauty',
          followerCount: 60000,
          isPrimary: true,
        },
        {
          collaboratorId: kol2.id,
          platformName: SocialPlatform.INSTAGRAM,
          channelName: '@haka.lifestyle',
          channelUrl: 'https://instagram.com/haka.lifestyle',
          followerCount: 15000,
          isPrimary: false,
        },
      ],
    });
  }

  // ==========================================
  // 4. GIAN HÀNG & CẤU HÌNH (STORES) - Idempotent
  // ==========================================
  console.log('🏪 Đang tạo Gian hàng & Cấu hình...');

  const store = await prisma.store.upsert({
    where: { slug: 'techstore-flagship' },
    update: {},
    create: {
      ownerId: shopOwner.id,
      name: 'TechStore Flagship Store',
      slug: 'techstore-flagship',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
      description: 'Cửa hàng chính hãng chuyên phụ kiện âm thanh và thiết bị công nghệ cao cấp.',
      websiteUrl: 'https://techstore.vn',
      defaultCommissionRate: 10.0,
      attributionWindowDays: 30,
      minPayoutAmount: 200000,
    },
  });

  // Mốc thưởng doanh số của Shop (Kiểm tra tránh trùng ngưỡng theo partial unique index)
  const existingRule = await prisma.commissionRule.findFirst({
    where: {
      storeId: store.id,
      minMonthlyRevenue: 50000000,
      isDeleted: false,
    },
  });
  if (!existingRule) {
    await prisma.commissionRule.create({
      data: {
        storeId: store.id,
        name: 'Thưởng Doanh Số Vàng (> 50 Triệu)',
        minMonthlyRevenue: 50000000,
        bonusPercentage: 2.0,
      },
    });
  }

  // 4.1 Gian hàng Sora Skin Official (Khớp ID nguyên mẫu UI/UX)
  const soraStoreId = '8ca136c3-9202-4254-bd4c-3704a840fa7b';
  const soraStore = await prisma.store.upsert({
    where: { id: soraStoreId },
    update: {
      ownerId: shopOwner.id,
    },
    create: {
      id: soraStoreId,
      ownerId: shopOwner.id,
      name: 'Sora Skin Official',
      slug: 'sora-skin-official',
      logoUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200',
      description: 'Gian hàng phân phối chính hãng dòng sản phẩm chăm sóc da chuyên sâu Sora Skin Flagship.',
      websiteUrl: 'https://soraskin.vn',
      defaultCommissionRate: 15.0,
      attributionWindowDays: 30,
      minPayoutAmount: 200000,
    },
  });

  const soraExistingRule1 = await prisma.commissionRule.findFirst({
    where: { storeId: soraStoreId, minMonthlyRevenue: 50000000, isDeleted: false },
  });
  if (!soraExistingRule1) {
    await prisma.commissionRule.create({
      data: {
        storeId: soraStoreId,
        name: 'Thưởng Doanh Số Sora Skin Vàng (> 50 Triệu)',
        minMonthlyRevenue: 50000000,
        bonusPercentage: 2.5,
        achievementBonus: 1000000,
      },
    });
  }
  const soraExistingRule2 = await prisma.commissionRule.findFirst({
    where: { storeId: soraStoreId, minMonthlyRevenue: 100000000, isDeleted: false },
  });
  if (!soraExistingRule2) {
    await prisma.commissionRule.create({
      data: {
        storeId: soraStoreId,
        name: 'Thưởng Doanh Số Sora Skin Kim Cương (> 100 Triệu)',
        minMonthlyRevenue: 100000000,
        bonusPercentage: 4.0,
        achievementBonus: 3000000,
      },
    });
  }

  // ==========================================
  // 5. SẢN PHẨM & KHO MEDIA MARKETING - Idempotent
  // ==========================================
  console.log('🎧 Đang tạo Danh mục Sản phẩm & Media Assets...');

  let product1 = await prisma.product.findFirst({
    where: { storeId: store.id, sku: 'TECH-ANC-001' },
  });
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        storeId: store.id,
        sku: 'TECH-ANC-001',
        title: 'Tai nghe Bluetooth True Wireless Chống Ồn ANC Pro X',
        categoryName: 'Phụ kiện Âm thanh',
        description: 'Chống ồn chủ động 42dB, pin 36 tiếng, màng loa titan âm trầm uy lực.',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
        originalPrice: 1590000,
        price: 1290000,
        customCommissionRate: 12.0,
        stockQuantity: 150,
        isActive: true,
      },
    });
  }

  let product2 = await prisma.product.findFirst({
    where: { storeId: store.id, sku: 'TECH-KB-002' },
  });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        storeId: store.id,
        sku: 'TECH-KB-002',
        title: 'Bàn phím cơ Không dây 3 Modes Hotswap RGB Custom',
        categoryName: 'Phụ kiện Máy tính',
        description: 'Switch Gateron Pro êm ái, kết nối Bluetooth/2.4G/Type-C, pin 4000mAh.',
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600',
        originalPrice: 2200000,
        price: 1850000,
        customCommissionRate: 15.0,
        stockQuantity: 80,
        isActive: true,
      },
    });
  }

  // Kho Media Marketing
  const existingMedia = await prisma.mediaAsset.findFirst({
    where: { storeId: store.id, title: 'Banner Quảng Cáo HD 1200x628 - Tai Nghe ANC Pro X' },
  });
  if (!existingMedia) {
    await prisma.mediaAsset.createMany({
      data: [
        {
          storeId: store.id,
          productId: product1.id,
          title: 'Banner Quảng Cáo HD 1200x628 - Tai Nghe ANC Pro X',
          assetType: AssetType.IMAGE,
          urlOrContent: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
        },
        {
          storeId: store.id,
          productId: product1.id,
          title: 'Kịch bản Video Review TikTok 60s Chốt Sale',
          assetType: AssetType.COPYWRITE_TEXT,
          urlOrContent:
            'Mở đầu: "Bỏ ngay 4 triệu mua tai nghe Táo, chiếc tai nghe 1 triệu này chống ồn ngang ngửa mà bass đập rung màng nhĩ..."',
        },
      ],
    });
  }

  // ==========================================
  // 6. CÔNG CỤ TIẾP THỊ CỦA KOL (LINKS, QR, COUPON) - Idempotent
  // ==========================================
  console.log('🔗 Đang tạo Link tiếp thị, QR Code & Coupon...');

  let refLink1 = await prisma.referralLink.findFirst({
    where: { shortCode: 'anc-pro-thang' },
  });
  if (!refLink1) {
    refLink1 = await prisma.referralLink.create({
      data: {
        collaboratorId: kol1.id,
        storeId: store.id,
        productId: product1.id,
        shortCode: 'anc-pro-thang',
        customCouponCode: 'THANGVIP10',
        qrCodeUrl:
          'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://scanms.vn/r/anc-pro-thang',
        totalClicks: 1450,
        totalOrders: 32,
      },
    });
  }

  // Log lượt click mẫu
  const existingClick = await prisma.clickTrafficLog.findFirst({
    where: { referralLinkId: refLink1.id },
  });
  if (!existingClick) {
    await prisma.clickTrafficLog.create({
      data: {
        referralLinkId: refLink1.id,
        ipAddress: '113.161.45.89',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        deviceFingerprint: 'fp_ios_safari_a9f82d1b',
      },
    });
  }

  // ==========================================
  // 7. VÍ TIỀN & SỔ CÁI TÀI CHÍNH - Idempotent
  // ==========================================
  console.log('💰 Đang tạo Ví tiền & Sổ cái tài chính...');

  const wallet1 = await prisma.wallet.upsert({
    where: { collaboratorId: kol1.id },
    update: {},
    create: {
      collaboratorId: kol1.id,
      availableBalance: 3500000,
      pendingBalance: 1250000,
      version: 1,
    },
  });

  await prisma.wallet.upsert({
    where: { collaboratorId: kol2.id },
    update: {},
    create: {
      collaboratorId: kol2.id,
      availableBalance: 800000,
      pendingBalance: 450000,
      version: 1,
    },
  });

  // Sổ cái tài chính
  const existingLedger = await prisma.financialLedger.findFirst({
    where: { walletId: wallet1.id, transactionType: TransactionType.COMMISSION_APPROVED },
  });
  if (!existingLedger) {
    await prisma.financialLedger.create({
      data: {
        walletId: wallet1.id,
        transactionType: TransactionType.COMMISSION_APPROVED,
        amount: 154800,
        balanceBefore: 3345200,
        balanceAfter: 3500000,
      },
    });
  }

  // ==========================================
  // 8. ĐƠN HÀNG MẪU & HOA HỒNG - Idempotent
  // ==========================================
  console.log('📦 Đang tạo Đơn hàng mẫu & Tính hoa hồng...');

  const sampleOrder = await prisma.order.upsert({
    where: {
      storeId_externalOrderSn: {
        storeId: store.id,
        externalOrderSn: 'ORD-20260909-001',
      },
    },
    update: {},
    create: {
      storeId: store.id,
      externalOrderSn: 'ORD-20260909-001',
      attributedCollaboratorId: kol1.id,
      attributionMethod: AttributionMethod.COUPON,
      customerName: 'Hoàng Minh Tuấn',
      customerPhone: '0933888999',
      shippingAddress: 'Tòa Landmark 81, Phường 22, Quận Bình Thạnh, TP.HCM',
      subtotalAmount: 1290000,
      discountAmount: 129000,
      shippingFee: 0,
      finalAmount: 1161000,
      status: OrderStatus.COMPLETED,
      completedAt: new Date('2026-09-09T15:22:48.550Z'),
    },
  });

  const existingOrderItem = await prisma.orderItem.findFirst({
    where: { orderId: sampleOrder.id, productId: product1.id },
  });
  if (!existingOrderItem) {
    await prisma.orderItem.create({
      data: {
        orderId: sampleOrder.id,
        productId: product1.id,
        quantity: 1,
        unitPrice: 1290000,
        appliedCommissionRate: 15.0,
        calculatedCommissionAmount: 193500,
      },
    });
  }

  await prisma.commission.upsert({
    where: {
      orderId_collaboratorId: {
        orderId: sampleOrder.id,
        collaboratorId: kol1.id,
      },
    },
    update: {},
    create: {
      orderId: sampleOrder.id,
      collaboratorId: kol1.id,
      commissionAmount: 193500,
      status: CommissionStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  // Lệnh rút tiền mẫu
  const existingPayout = await prisma.payoutRequest.findFirst({
    where: { collaboratorId: kol1.id, storeId: store.id, amount: 2500000 },
  });
  if (!existingPayout) {
    await prisma.payoutRequest.create({
      data: {
        collaboratorId: kol1.id,
        storeId: store.id,
        amount: 2500000,
        taxAmount: 250000,
        netAmount: 2250000,
        status: PayoutStatus.PENDING,
        bankName: 'MBBank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN THANH THANG',
      },
    });
  }

  // Đánh giá review mẫu
  const existingReview = await prisma.productReview.findFirst({
    where: { productId: product1.id, customerName: 'Hoàng Minh Tuấn' },
  });
  if (!existingReview) {
    await prisma.productReview.create({
      data: {
        productId: product1.id,
        orderId: sampleOrder.id,
        customerName: 'Hoàng Minh Tuấn',
        rating: 5,
        comment: 'Tai nghe chống ồn siêu đỉnh, nghe nhạc EDM bass sâu lắng, giao hàng nhanh 1 ngày là có!',
        isApproved: true,
      },
    });
  }

  // ==========================================
  // 9. CHAT REALTIME & HÀNG MẪU - Idempotent
  // ==========================================
  console.log('💬 Đang tạo Hội thoại Chat & Yêu cầu Hàng mẫu...');

  let conversation = await prisma.conversation.findFirst({
    where: { storeId: store.id, collaboratorId: kol1.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        storeId: store.id,
        collaboratorId: kol1.id,
        lastMessageAt: new Date(),
      },
    });
  }

  const existingMsg = await prisma.chatMessage.findFirst({
    where: { conversationId: conversation.id },
  });
  if (!existingMsg) {
    await prisma.chatMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: shopOwner.id,
          messageText:
            'Chào bạn Thắng! Shop rất thích các video review setup của bạn, bên mình mới gửi tặng bạn 1 chiếc tai nghe ANC Pro X để trải nghiệm nhé!',
          isRead: true,
        },
        {
          conversationId: conversation.id,
          senderId: kol1.id,
          messageText:
            'Dạ chào Shop! Mình đã nhận được mã vận đơn GHTK rồi ạ, sản phẩm rất đẹp, cuối tuần này mình sẽ lên clip TikTok luôn nhé!',
          isRead: true,
        },
      ],
    });
  }

  // Yêu cầu hàng mẫu
  const existingSample = await prisma.sampleProductRequest.findFirst({
    where: { collaboratorId: kol1.id, productId: product1.id },
  });
  if (!existingSample) {
    await prisma.sampleProductRequest.create({
      data: {
        collaboratorId: kol1.id,
        productId: product1.id,
        shippingAddress: 'Phòng 402, Chung cư Sunrise City, Quận 7, TP.HCM',
        trackingNumber: 'GHTK-SCANMS-889922',
        status: 'SHIPPED',
      },
    });
  }

  console.log('✅ Hoàn tất Gieo mầm CSDL thành công!');
  console.log('----------------------------------------------------');
  console.log('🔑 TÀI KHOẢN ĐĂNG NHẬP MẪU (Mật khẩu: Password@123)');
  console.log('1. Super Admin   : admin@scanms.vn');
  console.log('2. Shop Manager  : shop@techstore.vn');
  console.log('3. Top KOL (Vàng): kol1@scanms.vn');
  console.log('4. KOL (Bạc)     : kol2@scanms.vn');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi gieo mầm dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
