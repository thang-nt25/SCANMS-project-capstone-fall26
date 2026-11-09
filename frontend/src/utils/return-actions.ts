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
