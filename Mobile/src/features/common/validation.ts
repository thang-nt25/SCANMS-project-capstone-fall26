import { z } from "zod";
export const amount = z.union([z.number(), z.string()]);
export const https = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "Liên kết phải dùng HTTPS.");
export const required = z.string().trim().min(1, "Cần nhập thông tin.");
