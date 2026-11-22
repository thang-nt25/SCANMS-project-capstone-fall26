const DEFAULT_PUBLIC_ORIGIN = 'https://scanms.io.vn';
const localHost = (hostname: string) => ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(hostname.toLowerCase()) || hostname.endsWith('.localhost');

export function publicOrigin(configured?: string): string {
  try {
    const url = new URL(configured || DEFAULT_PUBLIC_ORIGIN);
    if (['https:', 'http:'].includes(url.protocol) && !localHost(url.hostname) && !url.username && !url.password) return url.origin;
  } catch { /* A missing/invalid deployment setting must not produce a local share URL. */ }
  return DEFAULT_PUBLIC_ORIGIN;
}

export const PUBLIC_ORIGIN = publicOrigin(import.meta.env.VITE_PUBLIC_APP_URL);
export const publicWebsiteUrl = (path: string) => new URL(path, PUBLIC_ORIGIN).href;

/** Keep legitimate external destinations; repair historical local SCANMS links. */
export function publicShareUrl(value: string): string {
  try {
    const url = new URL(value, PUBLIC_ORIGIN);
    if (localHost(url.hostname)) return publicWebsiteUrl(`${url.pathname}${url.search}${url.hash}`);
    return url.href;
  } catch { return value; }
}
