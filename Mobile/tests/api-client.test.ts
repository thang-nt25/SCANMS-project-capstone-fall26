import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient, ApiError } from "../src/services/api/client";
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function setup(transport: typeof fetch) {
  let token: string | null = "old-token",
    expirations = 0;
  const tokens = {
    get: () => token,
    onUnauthorized: () => {
      expirations++;
      token = null;
    },
  };
  return {
    client: new ApiClient("http://10.0.2.2:3000/api", tokens, transport),
    token: (value: string | null) => {
      token = value;
    },
    expired: () => expirations,
  };
}
test("authenticated requests unwrap only the actual Nest envelope", async () => {
  const { client } = setup(async (url, options) => {
    assert.equal(url, "http://10.0.2.2:3000/api/orders");
    assert.equal(
      (options?.headers as Record<string, string> | undefined)?.Authorization,
      "Bearer old-token",
    );
    return response({ success: true, data: { id: "order" } });
  });
  assert.deepEqual(await client.request("/orders"), { id: "order" });
});
test("login never attaches a cached bearer token", async () => {
  const { client } = setup(async (_url, options) => {
    assert.equal(
      (options?.headers as Record<string, string> | undefined)?.Authorization,
      undefined,
    );
    return response({ accessToken: "new" });
  });
  await client.request("/auth/login", {
    anonymous: true,
    method: "POST",
    body: { identifier: "test@example.test", password: "unit-test-only" },
  });
});
test("401 expires the current session even when a gateway returned non-JSON", async () => {
  const harness = setup(
    async () => new Response("Unauthorized", { status: 401 }),
  );
  await assert.rejects(
    harness.client.request("/mobile/bootstrap"),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(harness.expired(), 1);
});
test("403 reports forbidden without destroying the login", async () => {
  const harness = setup(async () => response({ message: "Forbidden" }, 403));
  await assert.rejects(
    harness.client.request("/users"),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
  assert.equal(harness.expired(), 0);
});
test("a stale 401 cannot log out a new account", async () => {
  let release!: (value: Response) => void;
  const harness = setup(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const pending = harness.client.request("/customer/orders");
  harness.token("new-account-token");
  release(response({ message: "Expired" }, 401));
  await assert.rejects(
    pending,
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(harness.expired(), 0);
});
test("rejects data when identity changes while reading the response body", async () => {
  let finish!: (value: string) => void;
  const transport = async () =>
    ({
      ok: true,
      status: 200,
      text: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    }) as Response;
  const harness = setup(transport);
  const pending = harness.client.request("/orders");
  await new Promise((resolve) => setImmediate(resolve));
  harness.token("other-token");
  finish("{}");
  await assert.rejects(
    pending,
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
});
test("a write timeout is uncertain and is never retried automatically", async () => {
  let calls = 0;
  const harness = setup(async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) =>
      options!.signal!.addEventListener("abort", () =>
        reject(new Error("Aborted")),
      ),
    );
  });
  await assert.rejects(
    harness.client.request("/products", {
      method: "POST",
      timeout: 10,
      body: {},
    }),
    (error: unknown) => error instanceof ApiError && error.unknownOutcome,
  );
  assert.equal(calls, 1);
});
test("validation error arrays remain readable", async () => {
  const harness = setup(async () =>
    response({ message: ["invalid barcode", "missing label"] }, 400),
  );
  await assert.rejects(
    harness.client.request("/products"),
    /invalid barcode\nmissing label/,
  );
});
test("absolute/external and backslash paths cannot receive the token", async () => {
  let calls = 0;
  const harness = setup(async () => {
    calls++;
    return response({});
  });
  for (const path of [
    "https://external.test",
    "//external.test",
    "/\\external.test",
  ])
    await assert.rejects(harness.client.request(path));
  assert.equal(calls, 0);
});
