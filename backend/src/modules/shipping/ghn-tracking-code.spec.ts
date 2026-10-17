import { isGeneratedGhnTestTrackingCode } from './ghn-tracking-code';

describe('isGeneratedGhnTestTrackingCode', () => {
  it('recognizes current and legacy codes generated locally for GHN', () => {
    expect(isGeneratedGhnTestTrackingCode('TEST-GHN-0ABFBVQ3K')).toBe(true);
    expect(isGeneratedGhnTestTrackingCode('GHN-0ABFBVQ3K')).toBe(true);
  });

  it('does not classify a GHN-issued waybill as a local test code', () => {
    expect(isGeneratedGhnTestTrackingCode('GHN2364158')).toBe(false);
    expect(isGeneratedGhnTestTrackingCode('')).toBe(false);
  });
});
