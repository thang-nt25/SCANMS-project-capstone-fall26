import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient, ApiError } from "../src/services/api/client";
const mime =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
function harness(transport: typeof fetch) {
  let token: string | null = "test-session",
    expired = 0;
  return {
    client: new ApiClient(
      "http://localhost:3000/api",
      {
        get: () => token,
        onUnauthorized: () => {
          expired++;
          token = null;
        },
      },
      transport,
    ),
    set: (value: string | null) => {
      token = value;
    },
    expired: () => expired,
  };
}
test("payout export sends authorization in headers and returns bytes without a token URL", async () => {
  const setup = harness(async (url, options) => {
    assert.equal(
      url,
      "http://localhost:3000/api/stores/shop/payouts/export-vietqr",
    );
    assert.equal(
      (options!.headers as Record<string, string>).Authorization,
      "Bearer test-session",
    );
    assert.equal(options!.method, "POST");
    assert.equal(options!.redirect, "error");
    return new Response(new Uint8Array([80, 75, 3, 4]), {
      headers: { "content-type": mime },
    });
  });
  assert.deepEqual(
    await setup.client.binary("/stores/shop/payouts/export-vietqr", {
      method: "POST",
      body: { payoutIds: ["payout"] },
      mime,
    }),
    new Uint8Array([80, 75, 3, 4]),
  );
});
test("binary downloads reject external paths before exposing credentials", async () => {
  let calls = 0;
  const setup = harness(async () => {
    calls++;
    throw new Error("Must not call");
  });
  for (const path of [
    "https://external.test/file",
    "//external.test/file",
    "/\\external/file",
  ])
    await assert.rejects(setup.client.binary(path, { mime }));
  assert.equal(calls, 0);
});
test("a stale export response cannot deliver the previous account's financial file", async () => {
  let release!: (value: Response) => void;
  const setup = harness(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const file = setup.client.binary("/file", { mime });
  setup.set("next-session");
  release(
    new Response(new Uint8Array([80, 75]), {
      headers: { "content-type": mime },
    }),
  );
  await assert.rejects(
    file,
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
});
test("a stale unauthorized export cannot expire the next account", async () => {
  let release!: (value: Response) => void;
  const setup = harness(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const file = setup.client.binary("/file", { mime });
  setup.set("next-session");
  release(new Response("Unauthorized", { status: 401 }));
  await assert.rejects(file);
  assert.equal(setup.expired(), 0);
});
test("failed payout export reports uncertain outcome and never retries writes", async () => {
  let count = 0;
  const setup = harness(async () => {
    count++;
    throw new Error("Network lost");
  });
  await assert.rejects(
    setup.client.binary("/export", {
      mime,
      method: "POST",
      body: { payoutIds: ["payout"] },
    }),
    (error: unknown) => error instanceof ApiError && error.unknownOutcome,
  );
  assert.equal(count, 1);
});
test("rejects an HTML error page or an oversized file advertised as a workbook", async () => {
  const html = harness(
    async () =>
      new Response("<html>proxy</html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  await assert.rejects(html.client.binary("/file", { mime }));
  const large = harness(
    async () =>
      new Response("x", {
        headers: {
          "content-type": mime,
          "content-length": String(21 * 1024 * 1024),
        },
      }),
  );
  await assert.rejects(
    large.client.binary("/file", { mime }),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});
