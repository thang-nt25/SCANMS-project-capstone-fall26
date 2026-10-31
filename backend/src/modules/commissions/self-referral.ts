/** Exact identity signals only; a risk score alone must not confiscate earnings. */
export function requiresReferralReview(order: { rawPayload?: unknown }) {
  return (
    (order.rawPayload as Record<string, unknown> | null)
      ?.selfReferralReviewRequired === true
  );
}

export function referralRiskSignals(
  shippingAddress: string,
  creatorAddresses: Array<{
    detailAddress: string;
    wardName: string;
    districtName: string;
    provinceName: string;
  }>,
  creatorBank?: { bankName?: string; bankAccountNumber?: string } | null,
  buyerBank?: { bankName?: string; bankAccountNumber?: string } | null,
) {
  const normalize = (s = '') =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const signals: string[] = [];
  const address = normalize(shippingAddress);
  if (
    address.length >= 16 &&
    creatorAddresses.some(
      (a) =>
        normalize(
          [a.detailAddress, a.wardName, a.districtName, a.provinceName].join(
            ', ',
          ),
        ) === address,
    )
  )
    signals.push('SHARED_DELIVERY_ADDRESS');
  if (
    creatorBank?.bankName &&
    buyerBank?.bankName &&
    creatorBank.bankAccountNumber &&
    buyerBank.bankAccountNumber &&
    normalize(creatorBank.bankName) === normalize(buyerBank.bankName) &&
    normalize(creatorBank.bankAccountNumber) ===
      normalize(buyerBank.bankAccountNumber)
  )
    signals.push('SHARED_VERIFIED_BANK_ACCOUNT');
  return signals;
}

export function isSelfReferral(
  order: {
    customerId?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    rawPayload?: unknown;
  },
  creator?: {
    id?: string;
    email?: string | null;
    phoneNumber?: string | null;
  } | null,
) {
  const raw = order.rawPayload as Record<string, unknown> | null;
  if (raw?.selfReferralDetected === true) return true;
  if (!creator) return false;
  const email = (value?: string | null) => value?.trim().toLowerCase();
  const phone = (value?: string | null) =>
    value?.replace(/[\s().-]/g, '').replace(/^(\+84|84)(?=\d{9}$)/, '0');
  return Boolean(
    (creator.id && order.customerId === creator.id) ||
    (email(creator.email) &&
      email(order.customerEmail) === email(creator.email)) ||
    (phone(creator.phoneNumber) &&
      phone(order.customerPhone) === phone(creator.phoneNumber)),
  );
}
