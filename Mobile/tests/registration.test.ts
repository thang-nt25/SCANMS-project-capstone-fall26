import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient, ApiError } from "../src/services/api/client";
import { registrationInput, type RegistrationDraft } from "../src/features/auth/registration-input";
import { createRegistrationService } from "../src/features/auth/registration-service";

const draft: RegistrationDraft = {
  fullName: "  Nguyễn Văn An  ", email: "  New.Customer@Example.test ", phoneNumber: "+84 903 000 001",
  password: "Customer@123", confirmPassword: "Customer@123", agreeTerms: true,
};

function fixture(reply: (path: string, body: Record<string, unknown>) => Response | Promise<Response>) {
  const requests: { path: string; body: Record<string, unknown>; authorization: string | null }[] = [];
  let unauthorized = 0;
  const client = new ApiClient("http://10.0.2.2:3000/api", { get: () => "unrelated-old-token", onUnauthorized: () => unauthorized++ }, async (input, options) => {
    const path = new URL(String(input)).pathname;
    const body = JSON.parse(String(options?.body));
    requests.push({ path, body, authorization: new Headers(options?.headers).get("Authorization") });
    return reply(path, body);
  });
  return { service: createRegistrationService(client), requests, unauthorized: () => unauthorized };
}
const response = (data: unknown, status = 201) => new Response(JSON.stringify({ success: status < 400, data }), { status });

test("registration validates and normalizes email, name and Vietnamese phone without changing the password", () => {
  const normalized = registrationInput(draft);
  assert.equal(normalized.email, "new.customer@example.test");
  assert.equal(normalized.fullName, "Nguyễn Văn An");
  assert.equal(normalized.phoneNumber, "0903000001");
  assert.equal(normalized.password, draft.password);
  assert.equal(registrationInput({ ...draft, phoneNumber: "" }).phoneNumber, "");
});

test("invalid form input is rejected before sending OTP or creating an account", async () => {
  const { service, requests } = fixture(() => response({}));
  for (const changed of [
    { fullName: " " }, { email: "invalid" }, { phoneNumber: "call0903000001" }, { password: "short" },
    { confirmPassword: "different" }, { agreeTerms: false }, { role: "SYSTEM_ADMIN" },
  ]) {
    await assert.rejects(service.register({ ...draft, ...changed } as RegistrationDraft, "456789"));
  }
  await assert.rejects(service.sendOtp("invalid"));
  assert.equal(requests.length, 0);
});

test("OTP and customer registration use the exact anonymous backend contract, with no automatic login", async () => {
  const { service, requests } = fixture((path) => path.endsWith("send-otp")
    ? response({ message: "OTP sent" })
    : response({ message: "Registered", user: { id: "customer-id", email: "new.customer@example.test", fullName: "Nguyễn Văn An", role: "CUSTOMER" } }));
  await service.sendOtp(draft.email);
  const result = await service.register(draft, " 456789 ");
  assert.deepEqual(requests.map(request => request.path), ["/api/auth/send-otp", "/api/auth/register"]);
  assert.deepEqual(requests[0].body, { email: "new.customer@example.test" });
  assert.deepEqual(requests[1].body, { fullName: "Nguyễn Văn An", email: "new.customer@example.test", password: draft.password, phoneNumber: "0903000001", role: "CUSTOMER", otp: "456789" });
  assert.ok(requests.every(request => request.authorization === null));
  assert.equal(result.user.role, "CUSTOMER");
  assert.equal("accessToken" in result, false);
});

test("optional phone is omitted and malformed OTP never reaches the server", async () => {
  const { service, requests } = fixture(() => response({ message: "OK", user: { id: "id", email: "new.customer@example.test", fullName: "An", role: "CUSTOMER" } }));
  for (const otp of ["", "12345", "1234567", "abc123"]) await assert.rejects(service.register(draft, otp));
  assert.equal(requests.length, 0);
  await service.register({ ...draft, phoneNumber: "" }, "456789");
  assert.equal("phoneNumber" in requests[0].body, false);
});

test("invalid/expired OTP and duplicate email preserve backend messages without expiring an anonymous session", async () => {
  for (const status of [400, 401, 409, 429]) {
    const { service, requests, unauthorized } = fixture(() => new Response(JSON.stringify({ message: "OTP expired or email already used" }), { status }));
    await assert.rejects(service.register(draft, "456789"), error => error instanceof ApiError && error.status === status && error.message === "OTP expired or email already used");
    assert.equal(requests.length, 1);
    assert.equal(unauthorized(), 0);
  }
});

test("an uncertain registration outcome is never automatically retried", async () => {
  const { service, requests } = fixture(() => { throw new TypeError("Network interrupted"); });
  await assert.rejects(service.register(draft, "456789"), error => error instanceof ApiError && error.unknownOutcome);
  assert.equal(requests.length, 1);
});
