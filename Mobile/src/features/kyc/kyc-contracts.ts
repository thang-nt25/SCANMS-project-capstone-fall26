import { z } from "zod";
const text = z.string().trim();
const https = text
  .url("Đường dẫn không hợp lệ.")
  .startsWith("https://", "Dùng đường dẫn HTTPS.");
export const platforms = [
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "INSTAGRAM",
  "THREADS",
  "ZALO",
  "TELEGRAM",
  "SHOPEE_VIDEO",
  "LEMON8",
  "OTHER",
] as const;
export const ChannelInput = z.object({
  platform: z.enum(platforms),
  channelName: text.min(1, "Nhập tên kênh.").max(150),
  channelUrl: https.max(2000),
  followerCount: z.coerce.number().int().min(0).max(2147483647),
  channelProofUrl: https,
  isPrimary: z.boolean(),
});
export const ApplicationInput = z
  .object({
    idCardNumber: text.regex(/^\d{12}$/, "CCCD cần đủ 12 chữ số."),
    taxCode: text.max(30),
    bankName: text.max(100),
    bankAccountNumber: text.max(50),
    bankAccountName: text.max(150),
    bio: text.max(1000),
    frontCardUrl: https,
    backCardUrl: https,
    channels: z.array(ChannelInput).min(1).max(5),
    specialtyCategories: z.array(text.min(1).max(100)).max(10).default([]),
    contentStyles: z.array(text.min(1).max(100)).max(10).default([]),
  })
  .superRefine((input, ctx) => {
    const bank = [
      input.bankName,
      input.bankAccountNumber,
      input.bankAccountName,
    ];
    if (bank.some(Boolean) && !bank.every(Boolean))
      ctx.addIssue({
        code: "custom",
        path: ["bankName"],
        message:
          "Điền đủ ngân hàng, số tài khoản và tên chủ tài khoản hoặc để trống cả ba.",
      });
    if (input.channels.filter((ch) => ch.isPrimary).length !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["channels"],
        message: "Chọn đúng một kênh chính.",
      });
    if (
      new Set(
        input.channels.map((ch) =>
          ch.channelUrl.toLowerCase().replace(/\/$/, ""),
        ),
      ).size !== input.channels.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["channels"],
        message: "Các kênh không được trùng URL.",
      });
  });
export const ChannelRecord = z.object({
  platform: z.string().optional(),
  platformName: z.string().optional(),
  channelName: z.string().nullish(),
  channelUrl: z.string(),
  followerCount: z.coerce.number().optional(),
  channelProofUrl: z.string().nullish(),
  isPrimary: z.boolean().optional(),
});
export const ProfileMeta = z.object({
  frontCardUrl: z.string().nullish(),
  backCardUrl: z.string().nullish(),
  channelProofUrl: z.string().nullish(),
  submittedAt: z.string().nullish(),
  reviewStatus: z.string().nullish(),
  rejectionReason: z.string().nullish(),
  requestedItems: z.array(z.string()).nullish(),
  needsInfo: z.boolean().optional(),
  channels: z.array(ChannelRecord).optional(),
  specialtyCategories: z.array(z.string()).optional(),
  contentStyles: z.array(z.string()).optional(),
});
export const Application = z.object({
  id: z.string(),
  status: z.string().optional(),
  kycStatus: z.string().optional(),
  reviewStatus: z.string().optional(),
  idCardNumber: z.string().nullish(),
  taxCode: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccountNumber: z.string().nullish(),
  bankAccountName: z.string().nullish(),
  bio: z.string().nullish(),
  rejectionReason: z.string().nullish(),
  socialLinksJson: ProfileMeta.nullish(),
  channels: z.array(ChannelRecord).optional(),
  user: z
    .object({
      id: z.string().optional(),
      fullName: z.string(),
      email: z.string(),
      socialChannels: z.array(ChannelRecord).optional(),
    })
    .optional(),
});
export type KolApplication = z.infer<typeof Application>;
export function reviewStatus(item?: KolApplication | null) {
  if (!item) return "DRAFT";
  const status = item.kycStatus || item.status;
  if (status === "VERIFIED" || status === "REJECTED") return status;
  if (
    item.reviewStatus === "NEEDS_INFO" ||
    item.socialLinksJson?.reviewStatus === "NEEDS_INFO" ||
    item.socialLinksJson?.needsInfo
  )
    return "NEEDS_INFO";
  return item.socialLinksJson?.submittedAt || item.idCardNumber
    ? "PENDING_APPROVAL"
    : "DRAFT";
}
export const canEditApplication = (item?: KolApplication | null) =>
  ["DRAFT", "NEEDS_INFO"].includes(reviewStatus(item));
export function applicationDraft(item?: KolApplication | null) {
  const meta = item?.socialLinksJson;
  const sourceChannels = meta?.channels?.length
    ? meta.channels
    : item?.channels?.length
      ? item.channels
      : item?.user?.socialChannels || [];
  // Keep the declared primary channel first when restoring a returned dossier.
  const channels = [...sourceChannels].sort(
    (a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)),
  );
  return {
    idCardNumber: item?.idCardNumber || "",
    taxCode: item?.taxCode || "",
    bankName: item?.bankName || "",
    bankAccountNumber: item?.bankAccountNumber || "",
    bankAccountName: item?.bankAccountName || "",
    bio: item?.bio || "",
    frontCardUrl: meta?.frontCardUrl || "",
    backCardUrl: meta?.backCardUrl || "",
    specialtyCategories: meta?.specialtyCategories || [],
    contentStyles: meta?.contentStyles || [],
    channels: (channels.length
      ? channels
      : [{ channelUrl: "", channelName: "", platform: "TIKTOK" }]
    ).map((ch, i) => ({
      platform: platforms.includes(
        (ch.platform || ch.platformName) as (typeof platforms)[number],
      )
        ? ((ch.platform || ch.platformName) as (typeof platforms)[number])
        : ("OTHER" as const),
      channelName: ch.channelName || "",
      channelUrl: ch.channelUrl,
      followerCount: ch.followerCount || 0,
      channelProofUrl:
        ch.channelProofUrl || (i === 0 ? meta?.channelProofUrl : "") || "",
      isPrimary: i === 0,
    })),
  };
}
export const kycLabels: Record<string, string> = {
  DRAFT: "Chưa nộp hồ sơ",
  PENDING_APPROVAL: "Đang thẩm định",
  VERIFIED: "Đã xác minh",
  NEEDS_INFO: "Cần bổ sung",
  REJECTED: "Đã từ chối",
};
