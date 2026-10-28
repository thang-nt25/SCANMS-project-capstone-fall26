export function safeLoginReturn(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n\t]/.test(path)) return null;
  try {
    const base = 'https://scanms.invalid';
    const url = new URL(path, base);
    if (url.origin !== base || /^\/(?:login|register)(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function productLoginUrl(returnTo: string, defaultRole?: string): string {
  const safePath = safeLoginReturn(returnTo);
  const params = new URLSearchParams();
  if (defaultRole) params.set('role', defaultRole);
  if (safePath) params.set('redirect', safePath);
  return `/login${params.toString() ? `?${params}` : ''}`;
}
