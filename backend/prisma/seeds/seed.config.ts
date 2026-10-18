import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import type { ShippingFixture } from './seed.types';

export interface DatabaseTarget {
  connectionString: string;
  schema: string;
  label: string;
  confirmation: string;
}

export interface SeedOptions {
  mode: 'apply' | 'plan' | 'check' | 'audit';
  reset: boolean;
  referenceDate: Date;
  frontendUrl: string;
  password?: string;
  target?: DatabaseTarget;
  shipping: ShippingFixture[];
}

export function parseDatabaseTarget(connectionString: string): DatabaseTarget {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Seeder requires PostgreSQL.');
  const schema = url.searchParams.get('schema') || 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schema))
    throw new Error('Invalid PostgreSQL schema identifier.');
  const label = `${url.hostname}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1))}?schema=${schema}`;
  return {
    connectionString,
    schema,
    label,
    confirmation: createHash('sha256').update(label).digest('hex').slice(0, 16),
  };
}

const shippingSchema = z.array(
  z
    .object({
      orderKey: z.string().regex(/^customer-([1-9]|[12]\d|30)-order-[12]$/),
      environment: z.literal('sandbox'),
      provider: z.literal('GHN'),
      orderCode: z
        .string()
        .min(5)
        .max(50)
        .regex(/^[A-Za-z0-9]+$/)
        .refine(
          (value) => !/^(DEMO|MOCK|TEST)[-_]/i.test(value),
          'Provide the actual sandbox order code.',
        ),
      fee: z.number().int().min(0).max(10_000_000),
      status: z.enum(['transporting', 'delivered']),
      capturedAt: z.string().datetime(),
      evidenceFile: z.string().min(1),
    })
    .strict(),
);

export function readSeedOptions(
  args: string[],
  env: NodeJS.ProcessEnv,
): SeedOptions {
  const supported = new Set(['--plan', '--check', '--audit', '--reset']);
  if (args.some((arg) => !supported.has(arg)))
    throw new Error(
      'Supported seed options: --plan, --check, --audit, --reset.',
    );
  if (
    ['--plan', '--check', '--audit'].filter((flag) => args.includes(flag))
      .length > 1
  )
    throw new Error('Choose one read mode: --plan, --check or --audit.');
  const mode = args.includes('--plan')
    ? 'plan'
    : args.includes('--check')
      ? 'check'
      : args.includes('--audit')
        ? 'audit'
        : 'apply';
  const reset = args.includes('--reset');
  if (reset && mode !== 'apply')
    throw new Error('--reset is only valid when applying the dataset.');
  if (mode === 'apply' && env.NODE_ENV === 'production')
    throw new Error('Demo seeding is disabled in production.');
  const connectionString = env.DIRECT_URL || env.DATABASE_URL;
  const target = connectionString
    ? parseDatabaseTarget(connectionString)
    : undefined;
  if (mode !== 'plan' && !target)
    throw new Error(
      'Set DATABASE_URL or DIRECT_URL for the intended project database.',
    );
  if (reset && env.SCANMS_SEED_RESET_CONFIRM !== target?.confirmation)
    throw new Error(
      `Reset was not authorized for ${target?.label}. First inspect --plan; then set SCANMS_SEED_RESET_CONFIRM=${target?.confirmation}.`,
    );
  if (
    mode === 'apply' &&
    (!env.SCANMS_SEED_PASSWORD || env.SCANMS_SEED_PASSWORD.length < 12)
  )
    throw new Error(
      'Set SCANMS_SEED_PASSWORD to a demo password of at least 12 characters.',
    );
  const referenceDate = z.coerce
    .date()
    .parse(env.SCANMS_SEED_REFERENCE_DATE || new Date());
  const frontendUrl = z
    .string()
    .url()
    .parse(env.FRONTEND_URL || 'http://localhost:5173');
  if (!['http:', 'https:'].includes(new URL(frontendUrl).protocol))
    throw new Error('FRONTEND_URL must use HTTP(S).');
  const shipping = env.SCANMS_SEED_GHN_FIXTURES
    ? shippingSchema.parse(
        JSON.parse(readFileSync(env.SCANMS_SEED_GHN_FIXTURES, 'utf8')),
      )
    : [];
  if (
    new Set(shipping.map((row) => row.orderKey)).size !== shipping.length ||
    new Set(shipping.map((row) => row.orderCode)).size !== shipping.length
  )
    throw new Error(
      'Duplicate order key or GHN sandbox order code in fixture file.',
    );
  for (const shipment of shipping) {
    const evidencePath = resolve(
      dirname(env.SCANMS_SEED_GHN_FIXTURES!),
      shipment.evidenceFile,
    );
    const response = z
      .object({
        code: z.literal(200),
        data: z
          .object({
            order_code: z.string(),
            total_fee: z.number().nonnegative(),
          })
          .passthrough(),
      })
      .passthrough()
      .parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    if (
      response.data.order_code !== shipment.orderCode ||
      response.data.total_fee !== shipment.fee
    )
      throw new Error(
        `GHN response evidence does not match ${shipment.orderKey}.`,
      );
  }
  return {
    mode,
    reset,
    referenceDate,
    frontendUrl,
    password: env.SCANMS_SEED_PASSWORD,
    target,
    shipping,
  };
}
