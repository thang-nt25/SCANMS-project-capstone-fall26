import type { LedgerEntry } from '../types/wallet.types';

/** Business references are not bank transfer confirmation codes. */
export function customerLedgerReference(entry: LedgerEntry) {
  if (entry.referenceId && ['CUSTOMER_WITHDRAWAL', 'CUSTOMER_WITHDRAWAL_REFUND'].includes(entry.referenceType ?? '')) {
    const code = `RKH-${entry.referenceId.slice(0, 8).toUpperCase()}`;
    return { label: 'Lệnh rút', code };
  }
  if (entry.referenceDetails?.orderCode) {
    const code = entry.referenceDetails.orderCode;
    return { label: 'Đơn hàng', code };
  }
  if (entry.referenceType === 'TOPUP_PAYOS' && entry.referenceDetails?.topUpCode) {
    const code = entry.referenceDetails.topUpCode;
    return { label: 'Mã nạp payOS', code };
  }
  return null;
}
