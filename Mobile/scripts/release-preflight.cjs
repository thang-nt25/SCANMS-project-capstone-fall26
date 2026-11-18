function validateReleaseEnvironment(env) {
  const errors = [];
  let url;
  try { url = new URL(env.EXPO_PUBLIC_API_URL || ""); } catch { /* Report without printing credentials. */ }
  if (!url || url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.pathname.replace(/\/$/, "").endsWith("/api")) {
    errors.push("Set EXPO_PUBLIC_API_URL to the deployed HTTPS API ending in /api.");
  }
  if (url && (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname === "[::1]" || url.hostname.endsWith(".local"))) {
    errors.push("An APK for physical phones cannot use the emulator, loopback or private LAN API.");
  }
  if (env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === "true") errors.push("Disable local HTTP for distributed APKs.");
  const sensitive = Object.keys(env).filter(key => key.startsWith("EXPO_PUBLIC_") && /SECRET|PASSWORD|PRIVATE_KEY|API_TOKEN|DATABASE_URL/.test(key));
  if (sensitive.length) errors.push("Remove secret values from EXPO_PUBLIC_ variables; keep bank and database credentials on the backend.");
  return errors;
}
if (require.main === module) {
  const errors = validateReleaseEnvironment(process.env);
  if (errors.length) { for (const error of errors) process.stderr.write(`${error}\n`); process.exitCode = 1; }
  else process.stdout.write("Android release environment checks passed. Device acceptance tests are still required.\n");
}
module.exports = { validateReleaseEnvironment };
