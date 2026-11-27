import { z } from "zod";

export const RegistrationEmailSchema = z.string().trim().toLowerCase().email("Email không đúng định dạng.").max(254);

function normalizePhone(value: string) {
  if (!value.trim()) return "";
  if (!/^[+\d\s().-]+$/.test(value)) return value;
  let phone = value.replace(/[\s().-]/g, "");
  if (phone.startsWith("0084")) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("84")) phone = `0${phone.slice(2)}`;
  return phone;
}

export const RegistrationDraftSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên.").max(100, "Họ tên tối đa 100 ký tự."),
  email: RegistrationEmailSchema,
  phoneNumber: z.string().max(40).transform(normalizePhone).refine(
    phone => !phone || /^0(?:[35789]\d{8}|2\d{9})$/.test(phone),
    "Số điện thoại Việt Nam không hợp lệ.",
  ),
  // Match the web form; preserve the original password characters when sent.
  password: z.string().min(8, "Mật khẩu cần tối thiểu 8 ký tự.").max(128, "Mật khẩu tối đa 128 ký tự.").refine(value => Boolean(value.trim()), "Mật khẩu không được chỉ chứa khoảng trắng."),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(Boolean, "Vui lòng đồng ý điều khoản sử dụng."),
}).strict().refine(value => value.password === value.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.", path: ["confirmPassword"],
});

export const RegistrationOtpSchema = z.string().trim().regex(/^\d{6}$/, "Nhập mã OTP gồm 6 chữ số trong email.");
export type RegistrationDraft = z.infer<typeof RegistrationDraftSchema>;

export function registrationInput(input: RegistrationDraft): RegistrationDraft {
  const result = RegistrationDraftSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message || "Thông tin đăng ký chưa hợp lệ.");
  return result.data;
}
