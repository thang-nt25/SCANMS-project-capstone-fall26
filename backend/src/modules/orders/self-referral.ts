/** Identity checks available at checkout; risk scans may add more evidence later. */
export function selfReferralReason(input: {
  customerId?: string | null;
  customerPhone?: string | null;
  collaboratorId?: string | null;
  collaboratorPhone?: string | null;
}): 'SAME_ACCOUNT' | 'SAME_PHONE' | null {
  if (!input.collaboratorId) return null;
  if (input.customerId === input.collaboratorId) return 'SAME_ACCOUNT';
  const digits = (phone?: string | null) => (phone || '').replace(/\D/g, '');
  const buyerPhone = digits(input.customerPhone);
  const creatorPhone = digits(input.collaboratorPhone);
  return buyerPhone.length >= 9 && buyerPhone === creatorPhone ? 'SAME_PHONE' : null;
}
