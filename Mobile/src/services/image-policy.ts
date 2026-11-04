/** Resolve public image references without assuming a web development server is running. */
export function resolveImageReference<T>(
  raw: string | null | undefined,
  bundled: Readonly<Record<string, T>>,
  apiOrigin: string,
): T | { uri: string } | null {
  if (!raw) return null;
  const uri = raw.trim();
  const key = uri.split(/[?#]/)[0];
  if (Object.prototype.hasOwnProperty.call(bundled, key)) return bundled[key];
  if (uri.startsWith("/uploads/") && !uri.includes(".."))
    return { uri: new URL(uri, apiOrigin).toString() };
  try {
    const url = new URL(uri);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return { uri: url.toString() };
  } catch {
    return null;
  }
}
