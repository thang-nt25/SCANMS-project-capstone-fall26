import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../dto/login.dto';
import {
  loginPhoneVariants,
  normalizeLoginPhone,
  parseLoginIdentifier,
  resolveLoginIdentifier,
} from '../login-identifier';

describe('Login identifier contract', () => {
  it.each([
    '0901234567',
    '+84901234567',
    '84901234567',
    '0084901234567',
    ' 0901 234 567 ',
    '+84 (901) 234-567',
    '0901.234.567',
  ])('normalizes phone %s without changing the subscriber', (value) => {
    expect(parseLoginIdentifier(value)).toEqual({
      kind: 'phone',
      value: '0901234567',
    });
  });

  it('normalizes an email case-insensitively', () => {
    expect(parseLoginIdentifier('  CUSTOMER@EXAMPLE.TEST  ')).toEqual({
      kind: 'email',
      value: 'customer@example.test',
    });
  });

  it('supports a Vietnamese landline and its international format', () => {
    expect(normalizeLoginPhone('+84 24 1234 5678')).toBe('02412345678');
  });

  it.each([
    '',
    '   ',
    null,
    undefined,
    901234567,
    ['0901234567'],
    {},
    'not-an-email',
    'customer@',
    '09012345678',
    '090123456',
    '+12025550123',
    '0901abc234567',
    "0901234567' OR 1=1--",
    'x'.repeat(255),
  ])('rejects malformed identifiers %p', (value) => {
    expect(parseLoginIdentifier(value)).toBeNull();
  });

  it('returns only explicit canonical country-code variants', () => {
    expect(loginPhoneVariants('0901234567')).toEqual([
      '0901234567',
      '84901234567',
      '+84901234567',
      '0084901234567',
    ]);
  });

  it('rejects ambiguous request fields instead of choosing one', () => {
    expect(
      resolveLoginIdentifier({
        identifier: '0901234567',
        email: 'customer@example.test',
      }),
    ).toBeNull();
    expect(resolveLoginIdentifier({})).toBeNull();
  });

  it.each([
    { identifier: '0901234567' },
    { identifier: '+84 901 234 567' },
    { identifier: 'CUSTOMER@example.test' },
    { email: 'customer@example.test' },
  ])('accepts the canonical and backward-compatible DTO %p', async (fields) => {
    const errors = await validate(
      plainToInstance(LoginDto, { ...fields, password: 'Current2026!' }),
      {
        whitelist: true,
        forbidNonWhitelisted: true,
      },
    );
    expect(errors).toHaveLength(0);
  });

  it.each([
    {},
    { identifier: '' },
    { identifier: null },
    { identifier: 12345 },
    { email: null },
    { email: 'invalid' },
    { identifier: '0901234567', email: 'customer@example.test' },
    { identifier: '0901234567', role: 'SYSTEM_ADMIN' },
  ])('rejects an invalid login body %p before the service', async (fields) => {
    const errors = await validate(
      plainToInstance(LoginDto, { ...fields, password: 'Current2026!' }),
      {
        whitelist: true,
        forbidNonWhitelisted: true,
      },
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
