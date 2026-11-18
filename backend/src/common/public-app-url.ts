/** Public links sent to people must never point at the developer's computer. */
export function resolvePublicAppUrl(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      if (['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname) || url.hostname.endsWith('.localhost')) continue;
      return url.origin;
    } catch { /* Try the next deployment setting. */ }
  }
  return 'https://scanms.io.vn';
}
