import { z } from "zod";
export const SocialChannel = z.object({
  id: z.string().uuid(), platformName: z.string(), channelName: z.string().nullish(),
  channelUrl: z.string(), followerCount: z.number().int().nonnegative(), isPrimary: z.boolean(),
});
export const ChannelInput = z.object({
  platformName: z.enum(["TIKTOK", "YOUTUBE", "FACEBOOK", "INSTAGRAM", "THREADS", "ZALO", "TELEGRAM", "SHOPEE_VIDEO", "LEMON8", "OTHER"]),
  channelName: z.string().trim().min(1, "Nhập tên kênh.").max(150),
  channelUrl: z.string().url("Đường dẫn kênh chưa hợp lệ.").startsWith("https://", "Đường dẫn kênh cần bắt đầu bằng https://"),
  followerCount: z.preprocess(value => typeof value === "string" && value.trim() === "" ? undefined : value, z.coerce.number().int("Nhập số người theo dõi là số nguyên.").min(0).max(2147483647)),
});
