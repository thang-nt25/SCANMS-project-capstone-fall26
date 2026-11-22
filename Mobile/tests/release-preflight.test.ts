import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { validateReleaseEnvironment } = require("../scripts/release-preflight.cjs");
test("distributed APK requires explicit deployed HTTPS API and no client-side bank secrets", () => {
  for (const url of [undefined, "http://10.0.2.2:3000/api", "https://192.168.1.2/api", "https://localhost/api", "https://api.example.com", "https://user:pass@api.example.com/api"]) {
    assert.ok(validateReleaseEnvironment({ EXPO_PUBLIC_API_URL: url }).length > 0);
  }
  const valid = { EXPO_PUBLIC_API_URL: "https://api.example.com/api" };
  assert.deepEqual(validateReleaseEnvironment(valid), []);
  assert.ok(validateReleaseEnvironment({ ...valid, EXPO_PUBLIC_ALLOW_LOCAL_HTTP: "true" }).length > 0);
  assert.ok(validateReleaseEnvironment({ ...valid, EXPO_PUBLIC_BANK_SECRET: "example" }).length > 0);
});
