import type { ReferralOrderItem } from '../services/analytics.service';
export function kolOrderCommissionStatus(order: Pick<ReferralOrderItem, 'status' | 'commissionStatus'>) {
  if (order.commissionStatus === 'REVERSED') return 'Đã thu hồi';
  if (order.status === 'CANCELLED') return 'Đã hủy';
  if (['RETURNED', 'REFUNDED'].includes(order.status)) return 'Đã hoàn trả';
  if (order.commissionStatus === 'PAID') return 'Đã chi trả';
  if (order.commissionStatus === 'APPROVED') return 'Khả dụng';
  if (order.commissionStatus === 'IN_ESCROW' || ['DELIVERED', 'COMPLETED'].includes(order.status)) return 'Chờ đối soát';
  return 'Tạm tính';
}

export function kolOrderCommissionAmountLabel(order: Pick<ReferralOrderItem, 'status' | 'commissionStatus'>) {
  const status = kolOrderCommissionStatus(order);
  if (status === 'Tạm tính') return 'Thù lao dự kiến';
  if (['Đã thu hồi', 'Đã hoàn trả', 'Đã hủy'].includes(status)) return 'Thù lao còn lại';
  if (status === 'Chờ đối soát') return 'Thù lao chờ đối soát';
  if (status === 'Khả dụng') return 'Thù lao khả dụng';
  if (status === 'Đã chi trả') return 'Thù lao đã chi trả';
  return 'Thù lao ghi nhận';
}
