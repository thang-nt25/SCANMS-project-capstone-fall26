export const SAMPLE_PHONE_PATTERN = /^0[35789][0-9]{8}$/;
export const SAMPLE_PHONE_ERROR = 'Số điện thoại phải là số di động Việt Nam 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 (có thể dùng +84).';

export function normalizeSamplePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const phone = value.trim().replace(/[\s().-]/g, '');
  return phone.startsWith('+84') ? `0${phone.slice(3)}`
    : phone.startsWith('84') ? `0${phone.slice(2)}` : phone;
}
