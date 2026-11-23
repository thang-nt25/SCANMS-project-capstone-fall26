import { z } from "zod";
import type { ApiClient } from "../../services/api/client";
import { Application, ApplicationInput } from "./kyc-contracts";
import { validateInput } from "../../utils/validate-input";
export const UpgradeStatus = z.object({
  userRole: z.string(),
  kolApplication: Application.nullable(),
});
export function createKycService(client: Pick<ApiClient, "request">) {
  return {
    async status(signal?: AbortSignal) {
      return UpgradeStatus.parse(
        await client.request("/kyc/upgrade/my-status", { signal }),
      );
    },
    async submit(input: unknown) {
      // Explicit DTO fields only; role is changed by backend approval, never by this client.
      const body = validateInput(ApplicationInput, input);
      return client.request("/kyc/upgrade/kol", {
        method: "POST",
        body,
        timeout: 60000,
      });
    },
  };
}
