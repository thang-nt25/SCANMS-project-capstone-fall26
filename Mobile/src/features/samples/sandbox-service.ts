import { z } from "zod";
import type { ApiClient } from "../../services/api/client";
import { validateInput } from "../../utils/validate-input";
export const SandboxState = z.object({
  orderCode: z.string(),
  simulated: z.literal(true),
  status: z.string(),
  deliveryStatus: z.string(),
  simulationStartedAt: z.string().nullish(),
  receivedAt: z.string().nullish(),
  deadlineAt: z.string().nullish(),
  videoUrl: z.string().nullish(),
  title: z.string().nullish(),
  caption: z.string().nullish(),
  videoRevision: z.number().int().nonnegative(),
  videoReview: z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      rejectionReason: z.string().nullish(),
    })
    .nullish(),
  shippingPayment: z
    .object({ status: z.string(), reference: z.string(), amount: z.number() })
    .nullish(),
});
export type Sandbox = z.infer<typeof SandboxState>;
export const VideoInput = z.object({
  title: z.string().trim().min(1, "Nhập tiêu đề video.").max(255),
  videoUrl: z
    .string()
    .trim()
    .url("Link video không hợp lệ.")
    .startsWith("https://", "Link video cần dùng HTTPS.")
    .max(2000),
  caption: z.string().trim().max(2000),
});
export const ReviewInput = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    videoUrl: z.string().url(),
    revision: z.number().int().min(1),
    rejectionReason: z.string().trim().max(2000).optional(),
  })
  .refine(
    (input) =>
      input.status !== "REJECTED" || (input.rejectionReason?.length || 0) >= 5,
    { message: "Nhập lý do cần sửa từ 5 ký tự.", path: ["rejectionReason"] },
  );
export function sandboxActions(role: string, state: Sandbox) {
  return {
    start:
      role === "SHOP_MANAGER" &&
      !state.simulationStartedAt &&
      !state.receivedAt,
    pay: role === "SHOP_MANAGER" && !state.shippingPayment,
    submit:
      role === "COLLABORATOR" &&
      Boolean(state.receivedAt) &&
      ["RECEIVED", "OVERDUE", "REVISION_REQUIRED"].includes(state.status),
    review:
      role === "SHOP_MANAGER" &&
      state.status === "VIDEO_SUBMITTED" &&
      Boolean(state.videoUrl) &&
      !state.videoReview,
    expire:
      role === "SHOP_MANAGER" &&
      Boolean(state.receivedAt) &&
      !state.videoUrl &&
      state.status !== "OVERDUE",
  };
}
export function createSandboxService(
  client: Pick<ApiClient, "request">,
  code: string,
) {
  const path = `/shipping/ghn/sandbox-sample/${encodeURIComponent(code)}`;
  const mutate = async (action: string, body: unknown) =>
    SandboxState.parse(
      await client.request(`${path}/${action}`, {
        method: "POST",
        body,
        timeout: 60000,
      }),
    );
  return {
    async read(signal?: AbortSignal) {
      return SandboxState.parse(await client.request(path, { signal }));
    },
    act(action: "start" | "pay-shipping" | "expire") {
      return mutate(action, {});
    },
    async submit(body: unknown) {
      return mutate("video", validateInput(VideoInput, body));
    },
    async review(body: unknown) {
      return mutate("review-video", validateInput(ReviewInput, body));
    },
  };
}
