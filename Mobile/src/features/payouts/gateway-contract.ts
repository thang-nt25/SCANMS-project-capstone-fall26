import { z } from "zod";

export const isSandboxPayout = (row: { transferProvider?: string | null; bankRefCode?: string | null }) =>
  row.transferProvider === "BIDV_SANDBOX" || Boolean(row.bankRefCode?.startsWith("SBX-"));

export const GatewaySchema = z.object({
  provider: z.string(),
  environment: z.enum(["SANDBOX", "LIVE"]),
  configured: z.boolean(),
  message: z.string(),
});
export const TransferResultSchema = z.object({
  status: z.enum(["PROCESSING", "APPROVED"]),
  provider: z.string().optional(),
  bankRefCode: z.string().nullish(),
});

export function gatewayAction(
  reviewer: boolean,
  status: string,
  provider: string | null | undefined,
  gateway: z.infer<typeof GatewaySchema> | undefined,
): "approve" | "reconcile" | null {
  if (!reviewer || !gateway?.configured) return null;
  if (provider && provider !== gateway.provider) return null;
  if (status === "PENDING") return "approve";
  // A manual export in PROCESSING must never be silently sent to a gateway.
  if (status === "PROCESSING" && provider) return "reconcile";
  return null;
}
