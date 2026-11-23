import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  demoGradle,
  nativePathGradle,
  localDomains,
  networkXml,
} = require("../plugins/with-android-demo.cjs");
test("native library object-path limits survive repeated prebuild without changing signing or SDK settings", () => {
  const root = 'apply plugin: "expo-root-project"';
  const once = nativePathGradle(root);
  const twice = nativePathGradle(once);
  assert.ok(twice.includes(root));
  assert.equal(twice.match(/SCANMS_NATIVE_PATHS_START/g)?.length, 1);
  assert.match(twice, /finalizeDsl/);
  assert.match(twice, /com\.android\.library/);
  assert.equal(twice.match(/cmakeArguments\.add\("-DCMAKE_OBJECT_PATH_MAX=240"\)/g)?.length, 1);
  assert.doesNotMatch(twice, /signingConfig|compileSdk|newArchEnabled/);
});
test("prebuild plugin is idempotent and demo bundles JS as a non-debuggable variant", () => {
  const once = demoGradle("android {}");
  assert.equal(demoGradle(once).match(/SCANMS_DEMO_START/g)?.length, 1);
  assert.match(once, /debuggable false/);
  assert.match(once, /applicationIdSuffix ".demo"/);
  assert.match(once, /-DCMAKE_OBJECT_PATH_MAX=256/);
  assert.equal(
    demoGradle(once).match(/-DCMAKE_OBJECT_PATH_MAX=256/g)?.length,
    1,
  );
});
test("cleartext exceptions only name emulator/local/private hosts", () => {
  assert.deepEqual(localDomains("https://untrusted.example/api"), [
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
  ]);
  assert.ok(
    localDomains("http://192.168.1.20:3000/api").includes("192.168.1.20"),
  );
  assert.ok(
    !localDomains("http://172.32.1.20:3000/api").includes("172.32.1.20"),
  );
  assert.ok(!networkXml().includes('cleartextTrafficPermitted="true"'));
});
