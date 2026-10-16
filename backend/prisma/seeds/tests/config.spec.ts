import { parseDatabaseTarget, readSeedOptions } from '../seed.config';
import { resetDatabase } from '../reset-database';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const env = {
  NODE_ENV: 'test',
  DATABASE_URL:
    'postgresql://seed:private-password@localhost:55433/scanms_seed?schema=public',
  SCANMS_SEED_PASSWORD: 'SeedTestPassword2026!',
};

describe('Seed CLI target protection', () => {
  it('blocks a reset before invoking Prisma when confirmation, environment or remote backup is invalid', async () => {
    const local = parseDatabaseTarget(env.DATABASE_URL);
    await expect(resetDatabase(local, undefined, 'test')).rejects.toThrow(
      'requires confirmation',
    );
    await expect(
      resetDatabase(local, local.confirmation, 'production'),
    ).rejects.toThrow('requires confirmation');
    const remote = parseDatabaseTarget(
      'postgresql://seed:pass@db.example/team',
    );
    await expect(
      resetDatabase(remote, remote.confirmation, 'development'),
    ).rejects.toThrow('existing pg_dump backup');
  });
  it('allows a dry run without credentials or a database', () => {
    const options = readSeedOptions(['--plan'], {});
    expect(options.mode).toBe('plan');
    expect(options.target).toBeUndefined();
  });

  it('uses DIRECT_URL consistently with prisma.config.ts and never includes secrets in target labels', () => {
    const options = readSeedOptions(['--plan'], {
      ...env,
      DIRECT_URL: 'postgresql://user:secret@db.example:5432/team?schema=scanms',
    });
    expect(options.target?.label).toBe('db.example:5432/team?schema=scanms');
    expect(options.target?.label).not.toContain('secret');
  });

  it('rejects production writes, weak credentials and unknown switches', () => {
    expect(() =>
      readSeedOptions([], { ...env, NODE_ENV: 'production' }),
    ).toThrow('disabled in production');
    expect(() =>
      readSeedOptions([], { ...env, SCANMS_SEED_PASSWORD: 'short' }),
    ).toThrow('at least 12');
    expect(() => readSeedOptions(['--force'], env)).toThrow(
      'Supported seed options',
    );
  });

  it('requires confirmation bound to the exact database and schema before reset', () => {
    expect(() => readSeedOptions(['--reset'], env)).toThrow(
      'Reset was not authorized',
    );
    const target = parseDatabaseTarget(env.DATABASE_URL);
    expect(
      readSeedOptions(['--reset'], {
        ...env,
        SCANMS_SEED_RESET_CONFIRM: target.confirmation,
      }).reset,
    ).toBe(true);
    expect(() =>
      readSeedOptions(['--reset'], {
        ...env,
        DATABASE_URL: `${env.DATABASE_URL}_other`,
        SCANMS_SEED_RESET_CONFIRM: target.confirmation,
      }),
    ).toThrow('Reset was not authorized');
  });

  it('rejects schema identifiers that could escape a SQL identifier', () => {
    expect(() =>
      parseDatabaseTarget(
        'postgresql://seed:pass@localhost/demo?schema=public%22%3Bdrop',
      ),
    ).toThrow('Invalid PostgreSQL schema identifier');
  });
});

describe('GHN sandbox evidence import', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'scanms-seed-evidence-'));
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const shipment = {
    orderKey: 'customer-2-order-2',
    environment: 'sandbox',
    provider: 'GHN',
    orderCode: 'SBX12345',
    fee: 25000,
    status: 'transporting',
    capturedAt: '2026-10-16T05:00:00Z',
    evidenceFile: 'response.json',
  };
  const prepare = (fee = 25000) => {
    writeFileSync(
      join(directory, 'response.json'),
      JSON.stringify({
        code: 200,
        data: { order_code: 'SBX12345', total_fee: fee },
      }),
    );
    const path = join(directory, 'manifest.json');
    writeFileSync(path, JSON.stringify([shipment]));
    return { ...env, SCANMS_SEED_GHN_FIXTURES: path };
  };

  it('loads a manifest only when its response file matches the code and fee', () => {
    expect(readSeedOptions(['--plan'], prepare()).shipping[0]).toEqual(
      shipment,
    );
  });

  it('rejects an export whose fee disagrees with the actual response file', () => {
    expect(() => readSeedOptions(['--plan'], prepare(35000))).toThrow(
      'response evidence does not match',
    );
  });

  it('rejects a mock tracking code claimed as a real sandbox export', () => {
    const options = prepare();
    writeFileSync(
      options.SCANMS_SEED_GHN_FIXTURES,
      JSON.stringify([{ ...shipment, orderCode: 'DEMO-GHN-12' }]),
    );
    expect(() => readSeedOptions(['--plan'], options)).toThrow();
  });
});
