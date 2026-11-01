import { Prisma } from '@prisma/client';

function record(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

/** Public profile fields are explicitly allowlisted. KYC documents, bank
 * details, phone numbers and the warehouse's house/street address stay private. */
export function publicBusinessProfile(
  onboarding: Prisma.JsonValue | null | undefined,
  returnWarehouse: Prisma.JsonValue | null | undefined,
) {
  const data = record(onboarding);
  const location = record(data.warehouseLocation as Prisma.JsonValue);
  const warehouse = record(returnWarehouse);
  const text = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const companyName =
    data.companyName !== undefined
      ? text(data.companyName)
      : text(data.businessName) || text(data.registeredBusinessName);
  const parts = [
    location.wardName,
    location.districtName,
    location.provinceName,
  ]
    .map(text)
    .filter(Boolean);
  const businessAddress =
    text(data.businessAddress) || text(data.warehouseAddress);
  // Existing profiles store a four-level address as a comma-separated string.
  const addressParts =
    businessAddress
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean) || [];
  const fallbackParts = [
    warehouse.wardName,
    warehouse.districtName,
    warehouse.provinceName,
  ]
    .map(text)
    .filter(Boolean);
  return {
    companyName,
    location: parts.length
      ? parts.join(', ')
      : addressParts.length >= 2
        ? addressParts.slice(1).slice(-3).join(', ')
        : fallbackParts.join(', ') || null,
  };
}
