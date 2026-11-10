import { z } from "zod";

// Prisma Decimal is serialized as a decimal string. Reject empty/non-numeric values,
// while accepting the numeric representation used by older API deployments.
const decimal = z.union([
  z.number().finite(),
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .refine((value) => Number.isFinite(Number(value))),
]);
const nonnegative = decimal.refine((value) => Number(value) >= 0);
export const WalletSummarySchema = z.object({
  availableBalance: decimal,
  pendingBalance: nonnegative,
  minimumWithdrawalAmount: nonnegative,
  canWithdraw: z.boolean(),
  kycStatus: z.string(),
  stores: z.array(
    z.object({
      storeId: z.string(),
      storeName: z.string(),
      availableBalance: decimal,
      pendingBalance: nonnegative,
      isActive: z.boolean(),
    }),
  ),
  withdrawalTaxPolicy: z.object({
    threshold: nonnegative,
    rate: nonnegative.refine((value) => Number(value) <= 1),
  }),
  bankAccount: z
    .object({
      bankName: z.string(),
      maskedAccountNumber: z.string(),
      accountName: z.string(),
    })
    .nullish(),
});
export const TopUpAmountInput = z
  .string()
  .trim()
  .regex(/^\d{1,8}$/, "Nhập số tiền nguyên VNĐ.")
  .transform(Number)
  .refine(
    (value) =>
      Number.isSafeInteger(value) && value >= 10000 && value <= 50000000,
    "Số tiền nạp từ 10.000 đến 50.000.000 đ.",
  );
export const TopUpSchema = z.object({
  id: z.string().uuid(),
  orderCode: z.number().int().positive(),
  amount: z.number().int().positive(),
  status: z.enum([
    "CREATING",
    "PENDING",
    "UNDERPAID",
    "PROCESSING",
    "PAID",
    "CANCELLED",
    "EXPIRED",
    "FAILED",
  ]),
  paymentLinkId: z.string().nullable(),
  checkoutUrl: z.string().nullable(),
  qrCode: z.string().nullable(),
  bin: z.string().nullable(),
  accountNumber: z.string().nullable(),
  accountName: z.string().nullable(),
  description: z.string().nullable(),
  expiresAt: z.string().datetime({ offset: true }),
  paidAt: z.string().nullable(),
});
export type WalletTopUp = z.infer<typeof TopUpSchema>;
export const isOpenTopUp = (status: WalletTopUp["status"]) =>
  ["CREATING", "PENDING", "UNDERPAID", "PROCESSING"].includes(status);
export const topUpStatusLabels: Record<WalletTopUp["status"], string> = {
  CREATING: "Đang kiểm tra giao dịch",
  PENDING: "Chờ thanh toán",
  UNDERPAID: "Chưa nhận đủ tiền",
  PROCESSING: "Đang xử lý",
  PAID: "Đã nạp tiền vào ví",
  CANCELLED: "Đã hủy giao dịch",
  EXPIRED: "Mã thanh toán đã hết hạn",
  FAILED: "Giao dịch không thành công",
};
/** Never open arbitrary URLs or attach the app's token to a checkout link. */
export function safePayosCheckout(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "pay.payos.vn" &&
      !url.port &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export const ledgerLabels: Record<string, string> = {
  COMMISSION_PENDING: "Hoa hồng tạm giữ",
  COMMISSION_APPROVED: "Hoa hồng đã duyệt",
  PAYOUT_WITHDRAW: "Yêu cầu rút tiền",
  PAYOUT_REJECT_REFUND: "Hoàn tiền rút bị từ chối",
  REVERSAL: "Thu hồi hoa hồng",
  TOPUP_DEMO: "Nạp ví thử nghiệm",
  TOPUP_PAYOS: "Nạp ví qua payOS",
  WALLET_TOPUP: "Nạp tiền vào ví",
  ORDER_PAYMENT: "Thanh toán đơn hàng",
  REFUND: "Hoàn tiền",
};
