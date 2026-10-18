import { auditCsvCell, sanitizeAuditDetails } from './audit-safety';

describe('Audit data minimization', () => {
  it.each([
    'password',
    'refresh_token',
    'clientSecret',
    'OTP',
    'authorization',
    'bank_account',
    'cccd',
  ])('redacts nested %s', (key) => {
    expect(
      sanitizeAuditDetails({
        child: [{ [key]: 'must-not-leak', id: 'visible' }],
      }),
    ).toEqual({ child: [{ [key]: '[REDACTED]', id: 'visible' }] });
  });
  it('redacts bearer credentials and signed URL secrets', () => {
    expect(
      sanitizeAuditDetails({
        note: 'Bearer abc.def',
        url: 'https://site.test/?token=secret&safe=1',
      }),
    ).toEqual({
      note: 'Bearer [REDACTED]',
      url: 'https://site.test/?token=[REDACTED]&safe=1',
    });
  });
  it('bounds arrays, strings, buffers and circular data', () => {
    const item: any = {
      list: Array(70).fill('a'),
      text: 'b'.repeat(3000),
      bytes: Buffer.from('secret'),
    };
    item.self = item;
    const result = sanitizeAuditDetails(item) as any;
    expect(result.list).toHaveLength(50);
    expect(result.text).toHaveLength(2000);
    expect(result.bytes).toBe('[BINARY 6 bytes]');
    expect(result.self).toBe('[CIRCULAR]');
  });
  it('CSV escapes quotes, separators and spreadsheet formulas', () => {
    expect(auditCsvCell('a,"b')).toBe('"a,""b"');
    expect(auditCsvCell('\t=CMD()')).toBe('"\'\t=CMD()"');
    expect(auditCsvCell(-12)).toBe('"-12"');
  });
});
