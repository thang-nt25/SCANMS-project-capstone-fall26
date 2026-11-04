const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (
  !sdk ||
  !fs.existsSync(
    path.join(
      sdk,
      "platform-tools",
      process.platform === "win32" ? "adb.exe" : "adb",
    ),
  )
) {
  console.error(
    "Android SDK not configured. Follow docs/ANDROID_APK_GUIDE.md, then set ANDROID_HOME.",
  );
  process.exit(1);
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.platform === "win32" ? "npx.cmd" : "npx", [
  "expo",
  "prebuild",
  "--platform",
  "android",
  "--no-install",
]);
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  [":app:assembleDemo", "--no-daemon"],
  path.join(root, "android"),
);
const source = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "demo",
  "app-demo.apk",
);
if (!fs.existsSync(source))
  throw new Error(
    "Gradle completed without the expected demo APK. Check variant output.",
  );
const bytes = fs.readFileSync(source),
  output = path.join(root, "artifacts");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "scanms-demo.apk"), bytes);
const evidence = {
  variant: "demo",
  applicationId: "vn.scanms.mobile.demo",
  version: "1.0.0-demo",
  bytes: bytes.length,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  builtAt: new Date().toISOString(),
  deviceSmokeTest: "NOT_RUN",
};
fs.writeFileSync(
  path.join(output, "apk-metadata.json"),
  JSON.stringify(evidence, null, 2),
);
console.log("APK ready:", path.join(output, "scanms-demo.apk"));
console.log(evidence);
