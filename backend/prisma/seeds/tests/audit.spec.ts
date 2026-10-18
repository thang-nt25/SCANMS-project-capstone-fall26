import { createHash } from 'node:crypto';
import {
  assertResetMigrationHistory,
  compareMigrationHistory,
  PENDING_HANDOVERS,
} from '../seed.audit';
import { assertManifestVersion } from '../seed.database';
import { DATASET_VERSION } from '../seed.helpers';

describe('Seed acceptance and migration inspection', () => {
  it('blocks destructive reset for missing/changed/failed migrations, not a newline-only difference', () => {
    const clean = {
      pending: [],
      missingLocal: [],
      contentMismatch: [],
      lineEndingOnly: ['crlf-only'],
      failed: [],
    };
    expect(() => assertResetMigrationHistory(clean)).not.toThrow();
    for (const issue of [
      'missingLocal',
      'contentMismatch',
      'failed',
    ] as const) {
      expect(() =>
        assertResetMigrationHistory({ ...clean, [issue]: ['migration'] }),
      ).toThrow('Reset blocked: reconcile migration history first');
    }
  });
  const checksum = (value: string) =>
    createHash('sha256').update(value).digest('hex');
  const applied = (name: string, text: string) => ({
    migration_name: name,
    checksum: checksum(text),
    finished_at: new Date(),
    rolled_back_at: null,
  });

  it('distinguishes pending, missing source, changed SQL and line-ending-only migrations', () => {
    const local = new Map([
      ['one', Buffer.from('SELECT 1;\n')],
      ['two', Buffer.from('SELECT 2;\r\n')],
      ['three', Buffer.from('SELECT 3;\n')],
      ['reverse-newline', Buffer.from('SELECT 5;\n')],
      ['pending', Buffer.from('SELECT 4;\n')],
    ]);
    expect(
      compareMigrationHistory(local, [
        applied('one', 'SELECT 1;\n'),
        applied('two', 'SELECT 2;\n'),
        applied('three', 'SELECT 999;\n'),
        applied('missing', 'SELECT 1;\n'),
        applied('reverse-newline', 'SELECT 5;\r\n'),
      ]),
    ).toEqual({
      pending: ['pending'],
      missingLocal: ['missing'],
      contentMismatch: ['three'],
      lineEndingOnly: ['two', 'reverse-newline'],
      failed: [],
    });
  });

  it('does not treat an unfinished/rolled-back migration as successfully applied', () => {
    const local = new Map([
      ['unfinished', Buffer.from('SELECT 1;')],
      ['rolled-back', Buffer.from('SELECT 2;')],
    ]);
    const result = compareMigrationHistory(local, [
      { ...applied('unfinished', 'SELECT 1;'), finished_at: null },
      { ...applied('rolled-back', 'SELECT 2;'), rolled_back_at: new Date() },
    ]);
    expect(result.pending).toEqual(['unfinished', 'rolled-back']);
    expect(result.failed).toEqual(['unfinished']);
  });

  it('accepts the current revision but refuses silently relabeling v1 as upgraded data', () => {
    expect(() =>
      assertManifestVersion({ dataset: DATASET_VERSION }),
    ).not.toThrow();
    expect(() =>
      assertManifestVersion({ dataset: 'scanms-capstone-2026-v1' }),
    ).toThrow('older/different seed revision');
    expect(() => assertManifestVersion(null)).toThrow(
      'older/different seed revision',
    );
    expect(() =>
      assertManifestVersion({ dataset: 'scanms-capstone-2026-v2' }),
    ).toThrow('older/different seed revision');
    expect(PENDING_HANDOVERS).toHaveLength(0);
    expect(
      PENDING_HANDOVERS.some(
        (row) => (row.id as string) === 'SPONSORED_PLACEMENT',
      ),
    ).toBe(false);
  });
});
