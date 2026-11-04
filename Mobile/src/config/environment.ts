export function resolveEnvironment(raw: string, allowLocalHttp: boolean) {
  const url = new URL(raw.trim());
  const local =
    /^(localhost|10\.0\.2\.2|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    throw new Error(
      "Địa chỉ API không hợp lệ. Không đưa thông tin đăng nhập vào URL.",
    );
  }
  if (url.protocol === "http:" && !(allowLocalHttp && local)) {
    throw new Error(
      "API cần HTTPS; HTTP chỉ dành cho emulator/LAN khi cho phép rõ ràng.",
    );
  }
  if (!url.pathname.replace(/\/$/, "").endsWith("/api"))
    throw new Error("Địa chỉ API phải bao gồm prefix /api.");
  return { apiUrl: url.toString().replace(/\/$/, ""), socketUrl: url.origin };
}

export const environment = resolveEnvironment(
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000/api",
  process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === "true",
);
