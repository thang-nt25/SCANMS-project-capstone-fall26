import type { SeedContext, SeedDataset } from './seed.types';
import { ADMIN_ID, assetUrl, daysFrom, seedId } from './seed.helpers';
import { addressFor, fullAddress } from './data/addresses.data';
import { CREATOR_NAMES, demoPhone } from './data/people.data';

export function buildSamples(data: SeedDataset, context: SeedContext): void {
  CREATOR_NAMES.forEach((name, index) => {
    const status = (['PENDING', 'SHIPPED', 'RECEIVED', 'COMPLETED'] as const)[
      index % 4
    ];
    const completed = status === 'COMPLETED';
    const received = completed || status === 'RECEIVED';
    const granted = status !== 'PENDING';
    const productIndex = index % data.products.length;
    const product = data.products[productIndex];
    const shopOwnerId = data.stores.find((store) => store.id === product.storeId)?.ownerId;
    if (!shopOwnerId) throw new Error(`Missing shop owner for sample product ${product.id}`);
    const variant =
      data.variants.find((v) => v.productId === product.id) ||
      data.variants[productIndex * 4] ||
      data.variants[0];
    const channel = data.socialChannels[index];
    const sampleId = seedId(`sample:${index}`);
    const receivedAt = received
      ? daysFrom(context, completed ? -20 : -5)
      : null;
    const createdAt = daysFrom(context, completed ? -25 : received ? -9 : -3);
    data.samples.push({
      id: sampleId,
      collaboratorId: seedId(`creator:${index}`),
      productId: product.id!,
      productVariantId: variant.id,
      socialChannelId: channel.id,
      recipientName: name,
      recipientPhone: demoPhone(1, index),
      shippingAddress: fullAddress(addressFor(index)),
      ghnProvinceId: Number(addressFor(index).provinceCode),
      ghnDistrictId: Number(addressFor(index).districtCode),
      ghnWardCode: addressFor(index).wardCode,
      socialPlatformSnapshot: channel.platformName,
      socialChannelNameSnapshot: channel.channelName,
      socialChannelUrlSnapshot: channel.channelUrl,
      socialFollowerSnapshot: channel.followerCount,
      contentType:
        'Video trải nghiệm sản phẩm có nhận xét và hình ảnh thực tế.',
      expectedVideoAt: receivedAt
        ? new Date(receivedAt.getTime() + 14 * 86_400_000)
        : daysFrom(context, 20),
      acceptedTermsAt: createdAt,
      grantedAt: granted ? new Date(createdAt.getTime() + 86_400_000) : null,
      trackingNumber: granted ? `DEMO-SAMPLE-GHN-${index + 1}` : null,
      carrier: granted ? 'GHN' : null,
      receivedAt,
      deadlineAt: receivedAt
        ? new Date(receivedAt.getTime() + 14 * 86_400_000)
        : null,
      videoUrl: completed ? assetUrl(context, 'sample-video.mp4') : null,
      videoTitle: completed ? `Trải nghiệm ${product.title}` : null,
      videoSubmittedAt: completed ? daysFrom(context, -10) : null,
      status,
      createdAt,
    });
    data.sampleEvents.push({
      id: seedId(`sample-event:${index}`),
      sampleRequestId: sampleId,
      actorId: seedId(`creator:${index}`),
      action: 'REQUESTED',
      details: {
        source: 'SYNTHETIC_CAPSTONE',
        shippingPayer: 'SHOP',
        codAmount: 0,
      },
      createdAt,
    });
    if (granted) {
      // No sandbox export exists for samples: preserve unknown freight instead of claiming GHN charged 0.
      data.sampleShippingCharges.push({
        id: seedId(`sample-shipping:${index}`),
        sampleRequestId: sampleId,
        storeId: product.storeId,
        carrier: 'GHN',
        environment: 'TEST',
        trackingNumber: `DEMO-SAMPLE-GHN-${index + 1}`,
        payer: 'SHOP',
        codAmount: 0,
        amount: null,
        status: 'PENDING_CONFIRMATION',
        recordedAt: new Date(createdAt.getTime() + 86_400_000),
      });
      product.sampleGrantedCount = (product.sampleGrantedCount ?? 0) + 1;
      variant.sampleGrantedCount = (variant.sampleGrantedCount ?? 0) + 1;
      data.sampleEvents.push({
        id: seedId(`sample-shipped:${index}`),
        sampleRequestId: sampleId,
        actorId: shopOwnerId,
        action: 'SHIPPED',
        details: {
          carrier: 'GHN',
          trackingNumber: `DEMO-SAMPLE-GHN-${index + 1}`,
          source: 'SYNTHETIC',
        },
        createdAt: new Date(createdAt.getTime() + 86_400_000),
      });
    }
    if (receivedAt)
      data.sampleEvents.push({
        id: seedId(`sample-received:${index}`),
        sampleRequestId: sampleId,
        action: 'RECEIVED',
        details: { source: 'SYNTHETIC_GHN_WEBHOOK' },
        createdAt: receivedAt,
      });
    if (completed) {
      data.mediaAssets.push({
        id: seedId(`sample-video:${index}`),
        storeId: product.storeId,
        productId: product.id,
        collaboratorId: seedId(`creator:${index}`),
        sampleRequestId: sampleId,
        title: `Video trải nghiệm ${product.title}`,
        assetType: 'VIDEO',
        urlOrContent: assetUrl(context, 'sample-video.mp4'),
        posterUrl: product.imageUrl,
        status: 'APPROVED',
        reviewedBy: ADMIN_ID,
        reviewedAt: daysFrom(context, -9),
        createdAt: daysFrom(context, -10),
      });
      data.sampleEvents.push({
        id: seedId(`sample-completed:${index}`),
        sampleRequestId: sampleId,
        actorId: shopOwnerId,
        action: 'COMPLETED',
        createdAt: daysFrom(context, -9),
      });
    }
  });
}
