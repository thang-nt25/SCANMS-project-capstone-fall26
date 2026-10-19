type SafeValue =
  null | string | number | boolean | SafeValue[] | { [key: string]: SafeValue };
const secretKey =
  /password|passwd|secret|token|authorization|cookie|otp|verificationcode|privatekey|cvv|cardnumber|bankaccount|nationalid|identitynumber|cccd/i;

/** Bounded recursive redaction also protects old records when read or exported. */
export function sanitizeAuditDetails(
  value: unknown,
  depth = 0,
  visited = new WeakSet<object>(),
): SafeValue {
  if (value == null) return null;
  if (depth > 7) return '[TRUNCATED]';
  if (typeof value === 'string')
    return value
      .slice(0, 2000)
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
      .replace(
        /([?&](?:token|secret|password|key|signature)=)[^&#\s]*/gi,
        '$1[REDACTED]',
      );
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'object') return String(value);
  if (value instanceof Date)
    return Number.isFinite(value.getTime())
      ? value.toISOString()
      : 'Invalid date';
  if (Buffer.isBuffer(value)) return `[BINARY ${value.length} bytes]`;
  if (visited.has(value)) return '[CIRCULAR]';
  visited.add(value);
  if (Array.isArray(value))
    return value
      .slice(0, 50)
      .map((item) => sanitizeAuditDetails(item, depth + 1, visited));
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 50)
      .map(([key, item]) => [
        key,
        secretKey.test(key.replace(/[^a-z0-9]/gi, ''))
          ? '[REDACTED]'
          : sanitizeAuditDetails(item, depth + 1, visited),
      ]),
  );
}
export function auditCsvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+@-]/u.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
