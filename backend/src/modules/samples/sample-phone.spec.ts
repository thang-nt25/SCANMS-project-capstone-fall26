import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSampleRequestDto, UpdateSampleRequestDto } from './dto/sample-request.dto';
import { normalizeSamplePhone, SAMPLE_PHONE_PATTERN } from './sample-phone';

describe('sample recipient phone validation', () => {
  it.each(['1234567891', '12345', '0212345678', '09123456789', '09123abc78', '', '0000000000', '+840912345678'])('rejects %s', async (recipientPhone) => {
    for (const dto of [CreateSampleRequestDto, UpdateSampleRequestDto]) {
      const value = plainToInstance(dto as typeof CreateSampleRequestDto, { recipientPhone });
      const errors = await validate(value);
      expect(errors.some((error) => error.property === 'recipientPhone')).toBe(true);
    }
  });
  it.each(['0912345678', '+84912345678', '84912345678', '0912 345 678', '0912.345.678', '0912-345-678'])('normalizes %s consistently for create/edit', async (recipientPhone) => {
    expect(normalizeSamplePhone(recipientPhone)).toBe('0912345678');
    for (const dto of [CreateSampleRequestDto, UpdateSampleRequestDto]) {
      const value = plainToInstance(dto as typeof CreateSampleRequestDto, { recipientPhone });
      expect(value.recipientPhone).toBe('0912345678');
      expect((await validate(value)).some((error) => error.property === 'recipientPhone')).toBe(false);
    }
  });
  it.each(['0312345678', '0512345678', '0712345678', '0812345678', '0912345678'])('accepts supported mobile structure %s', (phone) => {
    expect(SAMPLE_PHONE_PATTERN.test(phone)).toBe(true);
  });
});
