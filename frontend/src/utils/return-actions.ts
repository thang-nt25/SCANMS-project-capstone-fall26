export function buildShopApprovalResponse(preferred: 'EXCHANGE' | 'REFUND' | null | undefined, note: string) {
  const action = preferred === 'EXCHANGE' ? 'đổi sản phẩm' : preferred === 'REFUND' ? 'trả hàng/hoàn tiền' : 'đổi trả';
  return `Shop chấp nhận yêu cầu ${action}. Khách gửi hàng trả để Shop kiểm tra và xử lý.${note.trim() ? `\nGhi chú: ${note.trim()}` : ''}`;
}

export function canConfirmReturnCompletion(request: {
  status: string;
  resolution?: string | null;
  refund?: { status: string } | null;
  exchangeShipment?: { receivedAt?: string | null } | null;
}): boolean {
  if (request.resolution === 'REFUND') {
    return ['AWAITING_CUSTOMER_CONFIRMATION', 'REFUND_PENDING', 'REFUND_FAILED'].includes(request.status) &&
      Boolean(request.refund && ['PENDING', 'FAILED', 'SUCCEEDED'].includes(request.refund.status));
  }
  return request.status === 'AWAITING_CUSTOMER_CONFIRMATION' && Boolean(request.exchangeShipment?.receivedAt);
}

export function canRequestReturnReview(request?: {
  status: string;
  dispute?: unknown;
  receivedAt?: string | null;
  inspectionCompletedAt?: string | null;
} | null, now = Date.now()): boolean {
  if (!request || request.dispute) return false;
  if (['SHOP_REJECTED', 'EXPIRED', 'INSPECTION_REJECTED', 'REFUND_FAILED'].includes(request.status)) return true;
  return ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) && Boolean(request.receivedAt) &&
    !request.inspectionCompletedAt && Date.parse(request.receivedAt!) <= now - 48 * 60 * 60 * 1000;
}
