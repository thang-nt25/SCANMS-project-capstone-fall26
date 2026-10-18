/**
 * Detects codes generated locally by the merchant UI, including the legacy
 * GHN-XXXXXXXXX format. They are useful for layout tests but are not GHN waybills.
 */
export function isGeneratedGhnTestTrackingCode(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^(?:TEST-GHN-[A-Z0-9]{9}|GHN-[A-Z0-9]{9})$/i.test(value.trim());
}
