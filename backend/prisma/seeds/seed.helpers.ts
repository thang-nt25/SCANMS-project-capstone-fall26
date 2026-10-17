import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { SeedContext } from './seed.types';

export const DATASET_VERSION = 'scanms-capstone-2026-v3';
// Keep identity stable between revisions. Do not create duplicate accounts or
// bypass unique email/slug constraints by silently changing every fixture ID.
const ID_NAMESPACE_VERSION = 'scanms-capstone-2026-v1';
export const DAY_MS = 86_400_000;
const UUID_NAMESPACE = Buffer.from('cfc50f4069435a3587de6d76b77e1d74', 'hex');

/** UUID v5 keeps every cross-reference stable across machines and seed retries. */
export function seedId(key: string): string {
  const bytes = createHash('sha1')
    .update(UUID_NAMESPACE)
    .update(`${ID_NAMESPACE_VERSION}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const ADMIN_ID = seedId('user:admin');

export const daysFrom = (context: SeedContext, days: number): Date =>
  new Date(context.referenceDate.getTime() + days * DAY_MS);

export const assetUrl = (context: SeedContext, path: string): string =>
  new URL(`/assets/${path}`, context.frontendUrl).toString();

export const amount = (
  value: Prisma.OrderCreateManyInput['subtotalAmount'] | null | undefined,
): number =>
  new Prisma.Decimal(
    value && typeof value === 'object' ? value.toFixed() : (value ?? 0),
  ).toNumber();

export function commissionAmount(netSubtotal: number, rate: number): number {
  return new Prisma.Decimal(netSubtotal)
    .mul(rate)
    .div(100)
    .toDecimalPlaces(2)
    .toNumber();
}

/** 20 is a restricted-circulation prefix; these are demo codes, not GS1 registrations. */
export function demoEan13(index: number): string {
  const base = `200${String(index + 1).padStart(9, '0')}`;
  const sum = [...base].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return `${base}${(10 - (sum % 10)) % 10}`;
}

export function assertSeed(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`Seed invariant: ${message}`);
}

export function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
