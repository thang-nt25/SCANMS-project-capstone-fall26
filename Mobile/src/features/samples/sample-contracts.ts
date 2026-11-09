import { z } from "zod";
import { required } from "../common/validation";
export const Sample = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string().optional(),
  contentType: z.string().nullish(),
  socialChannelId: z.string().nullish(),
  socialChannel: z.object({ id: z.string(), channelName: z.string(), platformName: z.string() }).nullish(),
  socialChannelNameSnapshot: z.string().nullish(),
  socialPlatformSnapshot: z.string().nullish(),
  productVariant: z.object({ id: z.string(), name: z.string() }).nullish(),
  ghnProvinceId: z.number().nullish(),
  ghnDistrictId: z.number().nullish(),
  ghnWardCode: z.string().nullish(),
  recipientName: z.string().nullish(),
  recipientPhone: z.string().nullish(),
  shippingAddress: z.string(),
  trackingNumber: z.string().nullish(),
  carrier: z.string().nullish(),
  deadlineAt: z.string().nullish(),
  collaboratorId: z.string(),
  rejectedReason: z.string().nullish(),
  deliveryIssueReason: z.string().nullish(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    imageUrl: z.string().nullish(),
    store: z.object({ name: z.string() }),
  }),
  collaborator: z.object({ fullName: z.string() }).nullish(),
  videoAssets: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        urlOrContent: z.string(),
        status: z.string(),
        rejectionReason: z.string().nullish(),
      }),
    )
    .optional(),
});
export const Eligibility = z.object({
  canRequest: z.boolean(),
  kycVerified: z.boolean(),
  hasSocialChannel: z.boolean(),
  blockReason: z.string().nullish(),
  channels: z.array(
    z.object({
      id: z.string(),
      channelName: z.string(),
      platformName: z.string(),
    }),
  ),
});
export const CreateSample = z.object({
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().optional(),
  recipientName: required.min(2).max(150),
  recipientPhone: z.string().regex(/^(?:0[35789]\d{8}|\+84[35789]\d{8})$/),
  recipientPhoneConfirmed: z.literal(true),
  shippingAddress: required.min(10).max(500),
  ghnProvinceId: z.number().int().positive(),
  ghnDistrictId: z.number().int().positive(),
  ghnWardCode: required,
  socialChannelId: z.string().uuid(),
  contentType: required.max(500),
  termsAccepted: z.literal(true),
});
