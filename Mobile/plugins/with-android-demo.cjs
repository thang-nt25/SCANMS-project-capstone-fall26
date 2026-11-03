const fs = require("node:fs");
const path = require("node:path");
const {
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withDangerousMod,
} = require("expo/config-plugins");

const START = "// SCANMS_DEMO_START";
const END = "// SCANMS_DEMO_END";
function demoGradle(source) {
  const clean = source
    .replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`, "g"), "")
    .replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1// Production release requires a separately configured private signing key.",
    );
  return `${clean}\n${START}
// Local demonstration only: release bundling, separate ID, Android debug signing.
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                // Hash generated object paths before Ninja reaches Windows MAX_PATH.
                arguments "-DCMAKE_OBJECT_PATH_MAX=240"
            }
        }
    }
    buildTypes {
        demo {
            initWith release
            applicationIdSuffix ".demo"
            versionNameSuffix "-demo"
            debuggable false
            signingConfig signingConfigs.debug
            matchingFallbacks = ["release"]
        }
    }
}
${END}\n`;
}
function localDomains(raw) {
  const hosts = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);
  if (raw) {
    const url = new URL(raw);
    if (
      /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
        url.hostname,
      )
    )
      hosts.add(url.hostname);
  }
  return [...hosts];
}
function networkXml(hosts = []) {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system" /></trust-anchors></base-config>
${hosts.length ? `  <domain-config cleartextTrafficPermitted="true">\n${hosts.map((host) => `    <domain includeSubdomains="false">${host}</domain>`).join("\n")}\n  </domain-config>` : ""}
</network-security-config>\n`;
}
function withAndroidDemo(config) {
  config = withGradleProperties(config, (mod) => {
    // Keep the initial native build usable alongside the IDE on 16 GB machines.
    const properties = {
      "org.gradle.workers.max": "2",
      "org.gradle.parallel": "false",
      "org.gradle.jvmargs": "-Xmx1536m -XX:MaxMetaspaceSize=1024m",
      "kotlin.compiler.execution.strategy": "in-process",
    };
    for (const [key, value] of Object.entries(properties)) {
      mod.modResults = mod.modResults.filter(
        (item) => item.type !== "property" || item.key !== key,
      );
      mod.modResults.push({ type: "property", key, value });
    }
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0].$;
    app["android:networkSecurityConfig"] = "@xml/scanms_network_security";
    app["android:usesCleartextTraffic"] = "false";
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy")
      throw new Error("SCANMS plugin expects the Expo Groovy template.");
    mod.modResults.contents = demoGradle(mod.modResults.contents);
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const root = mod.modRequest.platformProjectRoot;
      for (const variant of ["main", "debug", "demo"]) {
        const dir = path.join(root, "app", "src", variant, "res", "xml");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, "scanms_network_security.xml"),
          networkXml(
            variant === "main"
              ? []
              : localDomains(process.env.EXPO_PUBLIC_API_URL),
          ),
        );
      }
      return mod;
    },
  ]);
}
module.exports = withAndroidDemo;
module.exports.demoGradle = demoGradle;
module.exports.localDomains = localDomains;
module.exports.networkXml = networkXml;
