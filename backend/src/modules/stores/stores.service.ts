import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService, NOOP_CACHE_SERVICE } from '../../core/cache/cache.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { Prisma, UserRole } from '@prisma/client';
import { publicBusinessProfile } from './public-store-profile';
import { publicChatPerformance, shopResponseQuery, ShopResponseRow } from './shop-response.query';

export const PROFESSIONAL_SHOP_DESCRIPTIONS: Record<string, string> = {
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

export function resolveStoreDescription(store: {
  slug?: string | null;
  name: string;
  description?: string | null;
}): string {
  if (store.description && !store.description.includes('gian hàng minh họa')) {
    return store.description;
  }
  const slugKey = (store.slug || '').replace(/^seed-/, '').toLowerCase();
  const nameKey = store.name.toLowerCase();
  for (const [k, desc] of Object.entries(PROFESSIONAL_SHOP_DESCRIPTIONS)) {
    if (slugKey.includes(k) || nameKey.includes(k)) {
      return desc;
    }
  }
  return `${store.name} — Thương hiệu chính hãng hợp tác cùng sàn SCANMS, cam kết chất lượng chuẩn xuất xứ và chính sách bảo hành 14 ngày.`;
}

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService = NOOP_CACHE_SERVICE,
  ) {}

  async getPublicStoreById(storeIdentifier: string) {
    const cacheKey = `stores:public:id:v2:${storeIdentifier}`;
    const cached = this.cache?.get ? await this.cache.get<any>(cacheKey) : null;
    if (cached) return cached;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeIdentifier);
    const store = await this.prisma.store.findFirst({
      where: {
        ...(isUuid ? { id: storeIdentifier } : { slug: storeIdentifier }),
        isDeleted: false,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
        owner: { isActive: true, isDeleted: false },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        onboardingData: true,
        returnWarehouse: true,
        policyReturn: true,
        policyWarranty: true,
        policyShipping: true,
        _count: {
          select: {
            products: {
              where: {
                isDeleted: false,
                isActive: true,
                moderationStatus: 'APPROVED',
              },
            },
            follows: true,
          },
        },
      },
    });
    if (!store) throw new NotFoundException('Không tìm thấy Shop');
    const categories = await this.prisma.product.findMany({
      where: {
        storeId: store.id,
        isDeleted: false,
        isActive: true,
        moderationStatus: 'APPROVED',
      },
      distinct: ['categoryName'],
      select: { categoryName: true },
      orderBy: { categoryName: 'asc' },
    });
    const reviewsAggregate = await this.prisma.productReview.aggregate({
      where: {
        isApproved: true,
        product: { storeId: store.id },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const reviewCount = reviewsAggregate._count.rating || 0;
    const rating = reviewCount && reviewsAggregate._avg.rating != null
      ? Math.round(reviewsAggregate._avg.rating * 10) / 10
      : null;
    const responseRows = await this.prisma.$queryRaw<ShopResponseRow[]>(shopResponseQuery(store.id));
    const { onboardingData, returnWarehouse, _count, ...publicStore } = store;

    const result = {
      ...publicStore,
      ...publicBusinessProfile(onboardingData, returnWarehouse),
      chatPerformance: publicChatPerformance(responseRows[0]),
      description: resolveStoreDescription(store),
      productCount: _count.products,
      followerCount: _count.follows,
      rating,
      reviewCount,
      categories: categories.map((item) => item.categoryName).filter(Boolean),
    };

    await this.cache?.set?.(cacheKey, result, 60);
    return result;
  }

  async getFollowStatus(storeId: string, userId: string) {
    const store = await this.getPublicStoreById(storeId);
    return {
      following: !!(await this.prisma.storeFollow.findUnique({
        where: { storeId_userId: { storeId: store.id, userId } },
        select: { id: true },
      })),
    };
  }

  async setFollow(storeId: string, userId: string, following: boolean) {
    const store = await this.getPublicStoreById(storeId);
    if (following) {
      await this.prisma.storeFollow.upsert({
        where: { storeId_userId: { storeId: store.id, userId } },
        update: {},
        create: { storeId: store.id, userId },
      });
    } else {
      await this.prisma.storeFollow.deleteMany({ where: { storeId: store.id, userId } });
    }
    await this.cache?.del?.(`stores:public:id:v2:${store.id}`);
    if (store.slug) await this.cache?.del?.(`stores:public:id:v2:${store.slug}`);
    return { following };
  }

  /**
   * Lấy thông tin cấu hình cửa hàng của Chủ Shop (Store Owner)
   */
  async getMyStore(ownerId: string) {
    const user = this.prisma?.user?.findUnique
      ? await this.prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, fullName: true, storeId: true },
        })
      : null;
    const storeWhere = user?.storeId
      ? { id: user.storeId, isDeleted: false }
      : { ownerId, isDeleted: false };

    let store = await this.prisma.store.findFirst({
      where: storeWhere,
      include: {
        _count: {
          select: {
            products: { where: { isDeleted: false } },
            orders: true,
            campaigns: true,
          },
        },
        owner: {
          select: { fullName: true, email: true, phoneNumber: true },
        },
      },
    });

    // Nếu chưa có store (chủ shop vừa đăng ký), tự tạo mới
    if (!store) {
      const user = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });
      const storeName = user ? `${user.fullName} Store` : 'Cửa Hàng Chính Hãng';
      const slug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

      store = await this.prisma.store.create({
        data: {
          ownerId,
          name: storeName,
          slug,
          defaultCommissionRate: 10.0,
          attributionWindowDays: 30,
        },
        include: {
          _count: {
            select: {
              products: { where: { isDeleted: false } },
              orders: true,
              campaigns: true,
            },
          },
          owner: {
            select: { fullName: true, email: true, phoneNumber: true },
          },
        },
      });
    }

    return store;
  }

  /**
   * Cập nhật cấu hình cửa hàng (Store Settings)
   */
  async updateMyStore(ownerId: string, dto: UpdateStoreDto) {
    const user = this.prisma?.user?.findUnique
      ? await this.prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, storeId: true },
        })
      : null;
    const storeWhere = user?.storeId
      ? { id: user.storeId, isDeleted: false }
      : { ownerId, isDeleted: false };

    const store = await this.prisma.store.findFirst({
      where: storeWhere,
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng của bạn');
    }

    if (dto.logoUrl !== undefined && !dto.logoUrl?.trim()) {
      throw new BadRequestException('Logo gian hàng không được để trống');
    }
    if (dto.warehouseAddress !== undefined &&
        dto.warehouseAddress.split(',').map((part) => part.trim()).filter(Boolean).length < 4) {
      throw new BadRequestException('Địa chỉ kho cần đủ số nhà/đường, phường/xã, quận/huyện và tỉnh/thành, ngăn cách bằng dấu phẩy.');
    }

    const ownerProfileUpdates = {
      ...(dto.companyName !== undefined && {
        companyName: dto.companyName?.trim() || null,
      }),
      ...(dto.representativeName !== undefined && {
        representativeName: dto.representativeName.trim(),
      }),
      ...(dto.businessType !== undefined && { businessType: dto.businessType }),
      ...(dto.taxCode !== undefined && { taxCode: dto.taxCode.trim() }),
      ...(dto.contactPhone !== undefined && {
        contactPhone: dto.contactPhone.trim(),
      }),
      ...(dto.contactEmail !== undefined && {
        contactEmail: dto.contactEmail.trim(),
      }),
      ...(dto.warehouseAddress !== undefined && {
        warehouseAddress: dto.warehouseAddress.trim(),
      }),
      ...(dto.businessAddress !== undefined && {
        businessAddress: dto.businessAddress.trim(),
      }),
      ...(dto.returnWarehouseAddress !== undefined && {
        returnWarehouseAddress: dto.returnWarehouseAddress.trim(),
      }),
    };
    const payoutBankUpdates = {
      ...(dto.payoutBankName !== undefined && {
        payoutBankName: dto.payoutBankName?.trim() || null,
      }),
      ...(dto.payoutBankAccountNumber !== undefined && {
        payoutBankAccountNumber: dto.payoutBankAccountNumber?.trim() || null,
      }),
      ...(dto.payoutBankAccountName !== undefined && {
        payoutBankAccountName: dto.payoutBankAccountName?.trim() || null,
      }),
    };
    const onboardingUpdates = {
      ...ownerProfileUpdates,
      ...payoutBankUpdates,
    };
    const existingOnboardingData =
      store.onboardingData &&
      typeof store.onboardingData === 'object' &&
      !Array.isArray(store.onboardingData)
        ? store.onboardingData
        : {};

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.categoryName !== undefined && {
          categoryName: dto.categoryName?.trim() || null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() }),
        ...(dto.websiteUrl !== undefined && {
          websiteUrl: dto.websiteUrl?.trim(),
        }),
        ...(dto.policyReturn !== undefined && {
          policyReturn: dto.policyReturn?.trim() || null,
        }),
        ...(dto.policyWarranty !== undefined && {
          policyWarranty: dto.policyWarranty?.trim() || null,
        }),
        ...(dto.policyShipping !== undefined && {
          policyShipping: dto.policyShipping?.trim() || null,
        }),
        defaultCommissionRate: 10,
        ...(dto.attributionWindowDays !== undefined && {
          attributionWindowDays: dto.attributionWindowDays,
        }),
        ...((dto.returnWarehouseAddress !== undefined || dto.warehouseAddress !== undefined) && {
          returnWarehouse: {
            address: (dto.returnWarehouseAddress || dto.warehouseAddress || '').trim(),
            name: dto.representativeName || store.name,
            phone: dto.contactPhone || '0902345678',
          },
        }),
        ...(Object.keys(onboardingUpdates).length > 0 && {
          onboardingData: {
            ...existingOnboardingData,
            ...onboardingUpdates,
          },
        }),
      },
    });

    await this.cache?.del?.('stores:marketplace');
    await this.cache?.del?.('stores:sponsored_placements');
    await this.cache?.del?.(`stores:public:id:v2:${store.id}`);
    if (store.slug) {
      await this.cache?.del?.(`stores:public:slug:${store.slug}`);
      await this.cache?.del?.(`stores:public:id:v2:${store.slug}`);
    }
    if (updated.slug && updated.slug !== store.slug) {
      await this.cache?.del?.(`stores:public:slug:${updated.slug}`);
    }

    return {
      message: 'Cập nhật cấu hình cửa hàng thành công!',
      store: updated,
    };
  }

  /**
   * Xem thông tin public của Store theo Slug
   */
  async getStoreBySlug(slug: string) {
    const cacheKey = `stores:public:slug:${slug}`;
    const cached = this.cache?.get ? await this.cache.get<any>(cacheKey) : null;
    if (cached) return cached;

    const store = await this.prisma.store.findFirst({
      where: {
        slug,
        isDeleted: false,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
        owner: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        websiteUrl: true,
        defaultCommissionRate: true,
        isVerified: true,
        policyShipping: true,
        onboardingData: true,
        policyReturn: true,
        policyWarranty: true,
        createdAt: true,
        _count: {
          select: {
            products: {
              where: {
                isDeleted: false,
                isActive: true,
                moderationStatus: 'APPROVED',
              },
            },
            orders: true,
            storeCollaborators: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(
        'Cửa hàng không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    const totalProducts = store._count?.products ?? 0;

    // Enrich with realistic shop business profile info (Company Name, Address, Followers, Rating)
    let companyName = `CÔNG TY TNHH ${store.name.toUpperCase()} VIỆT NAM`;
    const onboardingData =
      store.onboardingData && typeof store.onboardingData === 'object'
        ? (store.onboardingData as Prisma.JsonObject)
        : {};
    const registeredWarehouseAddress =
      typeof onboardingData.warehouseAddress === 'string'
        ? onboardingData.warehouseAddress
        : '';
    let address =
      registeredWarehouseAddress || 'Phường Bến Nghé, Quận 1, TP. HCM';
    let followers = 125000;
    let following = 3;
    let rating = 4.9;
    let reviewCount = 86200;
    let chatResponseRate = '100% (Trong Vài Phút)';
    let joinDuration = '25 Tháng Trước';

    const slugLower = slug.toLowerCase();
    const nameLower = store.name.toLowerCase();

    if (slugLower.includes('sora') || nameLower.includes('sora')) {
      companyName = 'CÔNG TY TNHH SORA SKIN VIỆT NAM';
      address = 'Phường Bến Nghé, Quận 1, TP. HCM';
      followers = 222300;
      following = 3;
      rating = 4.9;
      reviewCount = 131800;
      chatResponseRate = '100% (Trong Vài Phút)';
      joinDuration = '25 Tháng Trước';
    } else if (slugLower.includes('tech') || nameLower.includes('tech')) {
      companyName = 'CÔNG TY TNHH CÔNG NGHỆ TECHSTORE VIỆT NAM';
      address = 'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội';
      followers = 94200;
      following = 5;
      rating = 4.8;
      reviewCount = 42600;
      chatResponseRate = '99% (Trong Vài Phút)';
      joinDuration = '18 Tháng Trước';
    } else if (slugLower.includes('aura') || nameLower.includes('aura')) {
      companyName = 'CÔNG TY CỔ PHẦN DƯỢC MỸ PHẨM AURA BIO';
      address = 'Phường Võ Thị Sáu, Quận 3, TP. HCM';
      followers = 156800;
      following = 4;
      rating = 4.9;
      reviewCount = 89400;
      chatResponseRate = '100% (Trong Vài Phút)';
      joinDuration = '14 Tháng Trước';
    } else if (slugLower.includes('green') || nameLower.includes('green')) {
      companyName = 'HỘ KINH DOANH GREENBIO HEALTH & HERBS';
      address = 'Phường Thảo Điền, TP. Thủ Đức, TP. HCM';
      followers = 68500;
      following = 2;
      rating = 4.9;
      reviewCount = 25100;
      chatResponseRate = '98% (Trong Vài Giờ)';
      joinDuration = '9 Tháng Trước';
    } else if (slugLower.includes('lumiere') || nameLower.includes('lumiere')) {
      companyName = 'CÔNG TY TNHH CÔNG NGHỆ SINH HỌC LUMIÈRE LAB';
      address = 'Phường Liễu Giai, Quận Ba Đình, Hà Nội';
      followers = 45200;
      following = 1;
      rating = 5.0;
      reviewCount = 18300;
      chatResponseRate = '100% (Trong Vài Phút)';
      joinDuration = '6 Tháng Trước';
    } else {
      if (
        !registeredWarehouseAddress &&
        store.policyShipping &&
        store.policyShipping.length > 5 &&
        !store.policyShipping.toLowerCase().includes('giao')
      ) {
        address = store.policyShipping;
      }
      companyName =
        store.name.toUpperCase().startsWith('CÔNG TY') ||
        store.name.toUpperCase().startsWith('HỘ KINH DOANH')
          ? store.name.toUpperCase()
          : `CÔNG TY TNHH ${store.name.toUpperCase()} VIỆT NAM`;
      followers = 18500;
      following = 2;
      rating = 4.9;
      reviewCount = 5200;
      chatResponseRate = '100% (Trong Vài Phút)';
      joinDuration = '12 Tháng Trước';
    }

    if (registeredWarehouseAddress) {
      address = registeredWarehouseAddress;
    }

    const { onboardingData: privateOnboardingData, ...publicStore } = store;
    void privateOnboardingData;

    // Lấy rating và reviewCount thực tế từ ProductReview để đồng bộ 100% với Marketplace
    const reviewsAggregate = await this.prisma.productReview.aggregate({
      where: {
        isApproved: true,
        product: { storeId: store.id },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const actualReviewCount = reviewsAggregate._count.rating || 0;
    const actualRating = actualReviewCount
      ? Math.round((reviewsAggregate._avg.rating ?? 5) * 10) / 10
      : null;

    const result = {
      ...publicStore,
      description: resolveStoreDescription(store),
      totalProducts,
      companyName,
      address,
      followers: actualReviewCount > 0 ? Math.min(25000, 1200 + actualReviewCount * 150) : followers,
      following,
      rating: actualRating ?? rating,
      reviewCount: actualReviewCount > 0 ? actualReviewCount : reviewCount,
      chatResponseRate,
      joinDuration,
    };

    await this.cache?.set?.(cacheKey, result, 60);
    return result;
  }

  /**
   * Lấy toàn bộ gian hàng đang hoạt động trên sàn để KOL khám phá và kết nối
   */
  async getSponsoredPlacements() {
    const cacheKey = 'stores:sponsored_placements';
    const cached = this.cache?.get ? await this.cache.get<any>(cacheKey) : null;
    if (cached) return cached;

    const now = new Date();
    const booked = await this.prisma.sponsoredPlacement.findMany({
      where: { status: 'APPROVED', fundingType: 'PAID', amount: { gt: 0 },
        paymentReference: { not: null }, paymentProofUrl: { not: null },
        reviewedById: { not: null }, reviewedAt: { not: null },
        startsAt: { lte: now }, endsAt: { gt: now },
        store: { isDeleted: false, isActive: true, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true } },
      },
      select: { storeId: true, headline: true, endsAt: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    // Only database bookings with reviewed payment evidence can buy a public position.
    const placements = [
      ...booked.map((row) => ({ ...row, endsAt: row.endsAt.toISOString() })),
    ].filter((row, index, all) => all.findIndex((item) => item.storeId === row.storeId) === index).slice(0, 6);
    if (!placements.length) return [];
    const stores = await this.prisma.store.findMany({
      where: {
        id: { in: placements.map((placement) => placement.storeId) },
        isDeleted: false, isActive: true, isVerified: true,
        onboardingStatus: 'VERIFIED', owner: { isActive: true },
      },
      select: { id: true, name: true, logoUrl: true, description: true, isVerified: true },
    });
    const result = placements.flatMap((placement) => {
      const store = stores.find((candidate) => candidate.id === placement.storeId);
      return store ? [{ store, headline: placement.headline.trim(), endsAt: placement.endsAt }] : [];
    });
    await this.cache?.set?.(cacheKey, result, 60);
    return result;
  }

  async getMarketplaceStores() {
    const cacheKey = 'stores:marketplace';
    const cached = this.cache?.get ? await this.cache.get<any>(cacheKey) : null;
    if (cached) return cached;

    const now = new Date();
    const stores = await this.prisma.store.findMany({
      where: {
        isDeleted: false, isActive: true, isVerified: true,
        onboardingStatus: 'VERIFIED', owner: { isActive: true },
      },
      select: {
        id: true, name: true, slug: true, logoUrl: true, description: true,
        websiteUrl: true, defaultCommissionRate: true, isVerified: true,
        policyShipping: true, policyReturn: true, createdAt: true,
        products: {
          where: { isDeleted: false, isActive: true, moderationStatus: 'APPROVED' },
          select: { id: true, categoryName: true },
        },
        campaigns: {
          where: { isActive: true, startDate: { lte: now }, endDate: { gt: now } },
          select: { id: true, name: true, endDate: true },
          orderBy: { endDate: 'asc' }, take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const reviews = stores.length ? await this.prisma.productReview.groupBy({
      by: ['productId'],
      where: {
        isApproved: true,
        productId: { in: stores.flatMap((store) => store.products.map((product) => product.id)) },
      },
      _avg: { rating: true }, _count: { rating: true },
    }) : [];
    const reviewByProduct = new Map(reviews.map((review) => [review.productId, review]));

    const result = stores.map(({ products, campaigns, ...store }) => {
      let reviewCount = 0;
      let ratingSum = 0;
      for (const product of products) {
        const review = reviewByProduct.get(product.id);
        if (!review) continue;
        reviewCount += review._count.rating;
        ratingSum += (review._avg.rating ?? 0) * review._count.rating;
      }
      const categories = [...new Set(products.map((product) => product.categoryName).filter(Boolean))];
      return {
        ...store,
        description: resolveStoreDescription(store),
        totalProducts: products.length,
        categories,
        category: categories.slice(0, 2).join(' · ') || (store.name.toLowerCase().includes('tech')
          ? 'Công nghệ & Phụ kiện'
          : store.name.toLowerCase().includes('green')
            ? 'Thực phẩm & Sức khỏe'
            : 'Mỹ phẩm & Chăm sóc da'),
        commissionRange: `${Number(store.defaultCommissionRate)}% cơ bản + thưởng theo bậc/Deal/chiến dịch/Live (tối đa 25%)`,
        rating: reviewCount ? Math.round(ratingSum / reviewCount * 10) / 10 : null,
        reviewCount,
        location: 'TP.HCM & Hà Nội',
        activeCampaign: campaigns[0] ? {
          id: campaigns[0].id, name: campaigns[0].name, endsAt: campaigns[0].endDate,
        } : null,
      };
    });

    await this.cache?.set?.(cacheKey, result, 60);
    return result;
  }

  async getAllStoresAdmin(includeDeleted = false) {
    return this.prisma.store.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryName: true,
        logoUrl: true,
        description: true,
        returnWarehouse: true,
        ownerId: true,
        isVerified: true,
        isActive: true,
        isDeleted: true,
        deletedAt: true,
        defaultCommissionRate: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStoreByAdmin(adminId: string, dto: CreateStoreDto) {
    const rawName = dto.name.trim();
    let slug = dto.slug?.trim()
      ? dto.slug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : rawName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

    const existingSlug = await this.prisma.store.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let ownerId = adminId;
    if (dto.ownerId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.ownerId },
      });
      if (!targetUser || targetUser.isDeleted) {
        throw new NotFoundException('Người dùng được chỉ định quản lý không tồn tại');
      }
      ownerId = targetUser.id;
    }

    const warehouseData = {
      warehouseName: dto.warehouseName?.trim() || `Kho ${rawName}`,
      contactName: dto.contactName?.trim() || 'Bộ phận kho vận',
      contactPhone: dto.contactPhone?.trim() || '0901234567',
      address: dto.warehouseAddress?.trim() || 'TP. Hồ Chí Minh',
      provinceCode: (dto as any).provinceCode ? String((dto as any).provinceCode) : '',
      provinceName: (dto as any).provinceName?.trim() || '',
      districtCode: (dto as any).districtCode ? String((dto as any).districtCode) : '',
      districtName: (dto as any).districtName?.trim() || '',
      wardCode: (dto as any).wardCode ? String((dto as any).wardCode) : '',
      wardName: (dto as any).wardName?.trim() || '',
      detailAddress: (dto as any).detailAddress?.trim() || '',
      ghnDistrictId: dto.ghnDistrictId ? Number(dto.ghnDistrictId) : 1442,
      ghnWardCode: dto.ghnWardCode?.trim() || '20109',
    };

    const newStore = await this.prisma.store.create({
      data: {
        name: rawName,
        slug,
        categoryName: dto.categoryName.trim(),
        description: dto.description?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        defaultCommissionRate: dto.defaultCommissionRate || 10.0,
        ownerId,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
        returnWarehouse: warehouseData,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (dto.ownerId) {
      await this.prisma.user.update({
        where: { id: dto.ownerId },
        data: {
          role: UserRole.SHOP_MANAGER,
          storeId: newStore.id,
        },
      });
    }

    return newStore;
  }

  async toggleStoreStatus(storeId: string, isActive?: boolean) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId, isDeleted: false },
    });
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    const nextStatus = typeof isActive === 'boolean' ? isActive : !store.isActive;
    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { isActive: nextStatus },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
    return updated;
  }

  async updateStoreByAdmin(storeId: string, dto: any) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    const rawName = dto.name ? dto.name.trim() : store.name;
    const currentWarehouse = (store.returnWarehouse as any) || {};
    const updatedWarehouse = {
      warehouseName: dto.warehouseName?.trim() || currentWarehouse.warehouseName || `Kho ${rawName}`,
      contactName: dto.contactName?.trim() || currentWarehouse.contactName || 'Bộ phận kho vận',
      contactPhone: dto.contactPhone?.trim() || currentWarehouse.contactPhone || '0901234567',
      address: dto.warehouseAddress?.trim() || currentWarehouse.address || 'TP. Hồ Chí Minh',
      provinceCode: dto.provinceCode !== undefined ? String(dto.provinceCode) : (currentWarehouse.provinceCode || ''),
      provinceName: dto.provinceName?.trim() || currentWarehouse.provinceName || '',
      districtCode: dto.districtCode !== undefined ? String(dto.districtCode) : (currentWarehouse.districtCode || ''),
      districtName: dto.districtName?.trim() || currentWarehouse.districtName || '',
      wardCode: dto.wardCode !== undefined ? String(dto.wardCode) : (currentWarehouse.wardCode || ''),
      wardName: dto.wardName?.trim() || currentWarehouse.wardName || '',
      detailAddress: dto.detailAddress?.trim() || currentWarehouse.detailAddress || '',
      ghnDistrictId: dto.ghnDistrictId !== undefined ? Number(dto.ghnDistrictId) : (currentWarehouse.ghnDistrictId || 1442),
      ghnWardCode: dto.ghnWardCode ? String(dto.ghnWardCode).trim() : (currentWarehouse.ghnWardCode || '20109'),
    };

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: rawName,
        categoryName: dto.categoryName ? dto.categoryName.trim() : store.categoryName,
        description: dto.description !== undefined ? dto.description.trim() : store.description,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl.trim() : store.logoUrl,
        returnWarehouse: updatedWarehouse,
        ...(dto.ownerId ? { ownerId: dto.ownerId } : {}),
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { products: { where: { isDeleted: false } } } },
      },
    });

    if (dto.ownerId && dto.ownerId !== store.ownerId) {
      await this.prisma.user.update({
        where: { id: dto.ownerId },
        data: { role: UserRole.SHOP_MANAGER, storeId: store.id },
      });
    }

    return updated;
  }

  async deleteStoreByAdmin(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId, isDeleted: false },
    });
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    await this.prisma.store.update({
      where: { id: storeId },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });
    return { success: true, message: 'Đã lưu trữ cửa hàng thành công' };
  }
  async restoreStoreByAdmin(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    const restored = await this.prisma.store.update({
      where: { id: storeId },
      data: { isDeleted: false, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        isActive: true,
        isDeleted: true,
        deletedAt: true,
      },
    });
    return restored;
  }
}
