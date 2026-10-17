import { isEmail } from 'class-validator';

export type LoginIdentifier =
  { kind: 'email'; value: string } | { kind: 'phone'; value: string };

/** Accept Vietnamese mobile/landline numbers; never strip arbitrary letters. */
export function normalizeLoginPhone(value: string): string | null {
  if (value.length > 40 || !/^[+\d\s().-]+$/.test(value)) return null;
  let phone = value.replace(/[\s().-]/g, '');
  if (phone.startsWith('0084')) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84')) phone = `0${phone.slice(2)}`;
  return /^0(?:[35789]\d{8}|2\d{9})$/.test(phone) ? phone : null;
}

export function parseLoginIdentifier(value: unknown): LoginIdentifier | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return null;
  if (isEmail(trimmed)) return { kind: 'email', value: trimmed.toLowerCase() };
  const phone = normalizeLoginPhone(trimmed);
  return phone ? { kind: 'phone', value: phone } : null;
}

/** Keep old { email, password } clients working, but reject conflicting fields. */
export function resolveLoginIdentifier(input: {
  identifier?: unknown;
  email?: unknown;
}): LoginIdentifier | null {
  const values = [input.identifier, input.email].filter(
    (value) => value !== undefined,
  );
  return values.length === 1 ? parseLoginIdentifier(values[0]) : null;
}

export function loginPhoneVariants(canonical: string): string[] {
  const subscriber = canonical.slice(1);
  return [
    canonical,
    `84${subscriber}`,
    `+84${subscriber}`,
    `0084${subscriber}`,
  ];
}
