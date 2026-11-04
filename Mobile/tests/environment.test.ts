import test from "node:test";
import assert from "node:assert/strict";
process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP = "true";
const environment = import("../src/config/environment");
test("emulator and private LAN require explicit cleartext opt-in", async () => {
  const { resolveEnvironment } = await environment;
  assert.equal(
    resolveEnvironment("http://10.0.2.2:3000/api", true).socketUrl,
    "http://10.0.2.2:3000",
  );
  assert.equal(
    resolveEnvironment("http://192.168.1.20:3000/api/", true).apiUrl,
    "http://192.168.1.20:3000/api",
  );
  assert.throws(() => resolveEnvironment("http://10.0.2.2:3000/api", false));
  assert.throws(() => resolveEnvironment("http://public.example/api", true));
});
test("server API URLs reject credentials, unsafe protocols and missing prefix", async () => {
  const { resolveEnvironment } = await environment;
  assert.equal(
    resolveEnvironment("https://api.example.test/api", false).socketUrl,
    "https://api.example.test",
  );
  for (const value of [
    "https://user:secret@example.test/api",
    "ftp://example.test/api",
    "https://example.test",
    "https://example.test/api?token=test",
  ])
    assert.throws(() => resolveEnvironment(value, false));
});
