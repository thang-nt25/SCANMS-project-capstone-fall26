import { z } from "zod";

export const cancellationReasons = [
  { value: "CHANGE_PRODUCT", label: "Muốn đổi sản phẩm hoặc phân loại" },
  { value: "CHANGE_ADDRESS", label: "Muốn đổi địa chỉ nhận hàng" },
  { value: "NO_LONGER_NEEDED", label: "Không còn nhu cầu mua" },
  { value: "OTHER", label: "Lý do khác" },
] as const;

export const CancellationInput = z
  .object({
    reason: z.enum(cancellationReasons.map((item) => item.value)),
    details: z.string().trim().max(500, "Lý do tối đa 500 ký tự."),
  })
  .superRefine((input, context) => {
    if (input.reason === "OTHER" && input.details.length < 5)
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Vui lòng nhập lý do từ 5 đến 500 ký tự.",
      });
  })
  .transform((input) => ({
    // The existing API stores a readable reason, not a new enum/code.
    reason:
      input.reason === "OTHER"
        ? input.details
        : cancellationReasons.find((item) => item.value === input.reason)!
            .label,
  }));
