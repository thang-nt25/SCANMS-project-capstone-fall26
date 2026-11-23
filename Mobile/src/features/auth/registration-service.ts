import { z } from "zod";
import type { ApiClient } from "../../services/api/client";
import { RegistrationEmailSchema, RegistrationOtpSchema, registrationInput, type RegistrationDraft } from "./registration-input";

const OtpResult = z.object({ message: z.string().min(1) });
const RegistrationResult = z.object({
  message: z.string().min(1),
  user: z.object({ id: z.string().min(1), email: z.string().email(), fullName: z.string(), role: z.literal("CUSTOMER") }),
});

/** Use the existing public web contract; never persist a draft password or issue a local session. */
export function createRegistrationService(client: Pick<ApiClient, "request">) {
  return {
    async sendOtp(email: string) {
      const result = RegistrationEmailSchema.safeParse(email);
      if (!result.success) throw new Error("Email không đúng định dạng.");
      return OtpResult.parse(await client.request("/auth/send-otp", {
        method: "POST", anonymous: true, body: { email: result.data },
      }));
    },
    async register(input: RegistrationDraft, otp: string) {
      const draft = registrationInput(input);
      const code = RegistrationOtpSchema.safeParse(otp);
      if (!code.success) throw new Error("Nhập mã OTP gồm 6 chữ số trong email.");
      // Explicitly select fields: DTO forbids confirmPassword/agreeTerms, and
      // an omitted role defaults to COLLABORATOR on the existing backend.
      return RegistrationResult.parse(await client.request("/auth/register", {
        method: "POST", anonymous: true,
        body: {
          fullName: draft.fullName, email: draft.email, password: draft.password,
          ...(draft.phoneNumber ? { phoneNumber: draft.phoneNumber } : {}),
          role: "CUSTOMER", otp: code.data,
        },
      }));
    },
  };
}
