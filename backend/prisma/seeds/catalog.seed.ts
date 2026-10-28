import type { SeedContext, SeedDataset } from './seed.types';
import {
  ADMIN_ID,
  assetUrl,
  daysFrom,
  demoEan13,
  seedId,
} from './seed.helpers';
import { addressFor, fullAddress } from './data/addresses.data';
import { demoPhone } from './data/people.data';
import {
  PRODUCT_TEMPLATES,
  RETURN_POLICY,
  SHOPS,
  SHOP_DESCRIPTIONS,
  WARRANTY_POLICY,
} from './data/catalog.data';

export function buildCatalog(data: SeedDataset, context: SeedContext): void {
  const createdAt = daysFrom(context, -50);
  SHOPS.forEach((shop, shopIndex) => {
    const storeId = seedId(`store:${shopIndex}`);
    const address = addressFor(shopIndex);
    const contactPhone = demoPhone(0, shopIndex);
    const logo = 'logo' in shop ? shop.logo : `seed/shops/${shop.slug}.svg`;
    data.stores.push({
      id: storeId,
      ownerId: seedId(`shop-owner:${shopIndex}`),
      name: shop.name,
      slug: `seed-${shop.slug}`,
      logoUrl: assetUrl(context, logo),
      description:
        SHOP_DESCRIPTIONS[shop.slug] ||
        `${shop.name} — Thương hiệu chính hãng hợp tác cùng sàn SCANMS, cam kết nguồn gốc xuất xứ và dịch vụ hậu mãi uy tín.`,
      defaultCommissionRate: 10,
      isActive: true,
      isVerified: true,
      onboardingStatus: 'VERIFIED',
      onboardingSubmittedAt: daysFrom(context, -55),
      onboardingReviewedAt: createdAt,
      onboardingReviewedById: ADMIN_ID,
      onboardingReviewNote:
        'Hồ sơ giả lập đã được duyệt trong bộ dữ liệu kiểm thử.',
      onboardingData: {
        businessType: 'ENTERPRISE',
        representativeName: `Đại diện ${shop.name}`,
        taxCode: `999${String(shopIndex + 1).padStart(7, '0')}`,
        contactPhone,
        contactEmail: `shop${String(shopIndex + 1).padStart(2, '0')}@seed.scanms.test`,
        businessAddress: fullAddress(address),
        warehouseAddress: fullAddress(address),
        returnWarehouseAddress: fullAddress(address),
        payoutBankName: shopIndex % 2 === 0 ? 'MB' : 'Vietcombank',
        payoutBankAccountNumber: `999901${String(shopIndex + 1).padStart(6, '0')}`,
        payoutBankAccountName: `Đại diện ${shop.name}`,
        seedSource: 'SYNTHETIC_CAPSTONE',
        warehouseLocation: { ...address },
      },
      returnWarehouse: {
        name: `Kho ${shop.name}`,
        phone: contactPhone,
        address: address.detailAddress,
        provinceName: address.provinceName,
        districtName: address.districtName,
        wardName: address.wardName,
      },
      policyReturn: RETURN_POLICY,
      policyWarranty: WARRANTY_POLICY,
      policyShipping:
        'Phí giao hàng được hiển thị trước khi thanh toán theo cấu hình vận chuyển của sàn.',
      createdAt,
    });

    for (let slot = 0; slot < 2; slot++) {
      const index = shopIndex * 2 + slot;
      const template = PRODUCT_TEMPLATES[index % PRODUCT_TEMPLATES.length];
      const id = seedId(`product:${index}`);
      const imageUrl = assetUrl(context, `products/real/${template.image}`);
      const sku = `SEED-${String(index + 1).padStart(3, '0')}`;
      const quota = 8 + (index % 13);
      const currentStock = 4 * (50 + (index % 20));
      data.products.push({
        id,
        storeId,
        sku,
        title: template.name,
        categoryName: template.category,
        description: `<h2>${template.name}</h2><p>Bộ dữ liệu minh họa Capstone SCANMS; hình ảnh chụp sản phẩm cùng loại có thể mang thương hiệu khác.</p><p>Quy cách: ${template.size} hoặc ${template.largeSize}; đóng gói tiêu chuẩn hoặc hộp quà. Thông tin sử dụng thực tế cần đối chiếu nhãn của nhà sản xuất.</p>`,
        labelInfo: `EAN-13 nội bộ demo: ${demoEan13(index)}. Kiện mẫu: 500 g; 20 × 15 × 10 cm. Dữ liệu minh họa, không phải mã đăng ký GS1 hay chứng nhận công bố.`,
        barcode: demoEan13(index),
        packageWeight: 500,
        packageLength: 20,
        packageWidth: 15,
        packageHeight: 10,
        imageUrl,
        price: template.price,
        originalPrice: template.price + 30_000,
        customCommissionRate: 10,
        stockQuantity: currentStock,
        isActive: true,
        moderationStatus: 'APPROVED',
        moderatedAt: createdAt,
        moderatedById: ADMIN_ID,
        origin: 'Việt Nam (dữ liệu minh họa)',
        ingredients:
          'Tham khảo thành phần ghi trên nhãn sản phẩm; không dùng dữ liệu demo làm thông tin y tế.',
        sampleEnabled: true,
        sampleQuota: quota,
        sampleGrantedCount: 0,
        createdAt,
      });
      for (let variant = 0; variant < 4; variant++) {
        const size = variant < 2 ? template.size : template.largeSize;
        const pack = variant % 2 === 0 ? 'Tiêu chuẩn' : 'Hộp quà';
        data.variants.push({
          id: seedId(`variant:${index}:${variant}`),
          productId: id,
          sku: `${sku}-V${variant + 1}`,
          name: `${size} / ${pack}`,
          attributes: { 'Dung tích / Khối lượng': size, 'Đóng gói': pack },
          imageUrl,
          price:
            template.price +
            (variant >= 2 ? 50_000 : 0) +
            (variant % 2 === 1 ? 20_000 : 0),
          stockQuantity: 50 + (index % 20),
          isActive: true,
          sampleEnabled: variant === 0,
          sampleQuota: variant === 0 ? quota : 0,
          sampleGrantedCount: 0,
          createdAt,
        });
      }
      data.mediaAssets.push({
        id: seedId(`catalog-media:${index}`),
        storeId,
        productId: id,
        title: `Ảnh ${template.name}`,
        assetType: 'IMAGE',
        urlOrContent: imageUrl,
        status: 'APPROVED',
        reviewedBy: ADMIN_ID,
        reviewedAt: createdAt,
        createdAt,
      });
    }
  });
}
