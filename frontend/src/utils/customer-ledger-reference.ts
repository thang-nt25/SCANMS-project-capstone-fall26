import type { LedgerEntry } from '../types/wallet.types';

/** Business references are not bank transfer confirmation codes. */
export function customerLedgerReference(entry: LedgerEntry) {
  if (!entry.referenceId) return null;
  const id = entry.referenceId;
  if (['CUSTOMER_WITHDRAWAL', 'CUSTOMER_WITHDRAWAL_REFUND'].includes(entry.referenceType ?? '')) {
    const code = `RKH-${id.slice(0, 8).toUpperCase()}`;
    return { label: 'Lệnh rút', code, copyValue: code, internalId: id };
  }
  if (entry.referenceDetails?.orderCode) {
    const code = entry.referenceDetails.orderCode;
    return { label: 'Đơn hàng', code, copyValue: code, internalId: id };
  }
  if (entry.referenceType === 'TOPUP_PAYOS' && entry.referenceDetails?.topUpCode) {
    const code = entry.referenceDetails.topUpCode;
    return { label: 'Mã nạp payOS', code, copyValue: code, internalId: id };
  }
  return { label: 'Mã nội bộ', code: `${id.slice(0, 8)}…`, copyValue: id, internalId: id };
}
