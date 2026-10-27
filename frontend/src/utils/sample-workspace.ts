import type { SampleRequest, SampleRequestStatus } from '@/types/samples.types';

export const SAMPLE_STATUS_LABELS: Record<SampleRequestStatus, string> = {
  PENDING: 'Chờ Shop duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  SHIPPED: 'Đang giao',
  RECEIVED: 'Cần nộp video',
  VIDEO_SUBMITTED: 'Chờ nghiệm thu',
  REVISION_REQUIRED: 'Cần sửa video',
  COMPLETED: 'Hoàn thành',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy',
  DELIVERY_ISSUE: 'Sự cố giao hàng',
};
export const canSubmitSampleVideo = (status: SampleRequestStatus) =>
  ['RECEIVED', 'REVISION_REQUIRED', 'OVERDUE'].includes(status);

export function sampleSandboxCode(request: SampleRequest) {
  if (request.status !== 'APPROVED' || request.trackingNumber) return null;
  return request.shippingCharges?.find(charge => charge.environment === 'TEST')?.trackingNumber || null;
}

export function withSampleSandboxState(request: SampleRequest, state?: {
  receivedAt: string | null; deadlineAt: string | null; videoUrl: string | null; status?: string;
} | null): SampleRequest {
  if (!sampleSandboxCode(request) || !state) return request;
  const status = state.videoUrl ? 'VIDEO_SUBMITTED' : state.status === 'OVERDUE' ? 'OVERDUE'
    : state.receivedAt ? 'RECEIVED' : 'SHIPPED';
  return { ...request, status, receivedAt: state.receivedAt || undefined, deadlineAt: state.deadlineAt || undefined, videoUrl: state.videoUrl || undefined };
}

export function sampleShopLink(request: SampleRequest) {
  return `/collaborator/collaboration?${new URLSearchParams({ shop: request.product.storeId || request.product.store.id, tab: 'samples', sampleId: request.id })}`;
}

export const SAMPLE_EVENT_LABELS: Record<string, string> = {
  GHN_SANDBOX_CREATED: 'Đã tạo vận đơn thử nghiệm', SANDBOX_SAMPLE_STATE: 'Đã cập nhật hành trình thử nghiệm',
  SAMPLE_REQUEST_CREATED: 'Đã gửi yêu cầu mẫu', SAMPLE_REQUEST_UPDATED: 'Đã sửa thông tin nhận mẫu',
  SAMPLE_REQUEST_APPROVED: 'Shop đã duyệt yêu cầu', SAMPLE_REQUEST_REJECTED: 'Shop từ chối yêu cầu',
  SAMPLE_REQUEST_CANCELLED: 'Đã hủy yêu cầu', SAMPLE_REQUEST_SHIPPED: 'Shop đã gửi hàng',
  GHN_DELIVERED: 'GHN xác nhận giao thành công', SAMPLE_VIDEO_SUBMITTED: 'Đã nộp video review',
  SAMPLE_VIDEO_APPROVED: 'Shop đã nghiệm thu video', SAMPLE_VIDEO_REJECTED: 'Shop yêu cầu sửa video',
  SAMPLE_VIDEO_REVISION_REQUIRED: 'Shop yêu cầu sửa video', SAMPLE_REQUEST_OVERDUE: 'Quá hạn nộp video',
  SAMPLE_REVISION_OVERDUE: 'Quá hạn sửa video', SAMPLE_SHOP_DEADLINE_EXTENDED: 'Shop gia hạn video',
  SAMPLE_ADMIN_DEADLINE_EXTENDED: 'Quản trị viên gia hạn video', SAMPLE_DELIVERY_ISSUE_REPORTED: 'Đã báo sự cố giao hàng',
  SAMPLE_ADMIN_DELIVERY_ISSUE_RESOLVED: 'Đã xử lý sự cố giao hàng', SAMPLE_ADMIN_OBLIGATION_CANCELLED: 'Được miễn nghĩa vụ mẫu',
  SAMPLE_VIOLATION_REPORTED: 'Shop đã gửi báo cáo vi phạm', SAMPLE_VIOLATION_DISMISSED: 'Đã bác bỏ báo cáo vi phạm',
  SAMPLE_REQUESTS_BLOCKED: 'Đã khóa quyền nhận mẫu', SAMPLE_REQUESTS_UNBLOCKED: 'Đã mở lại quyền nhận mẫu',
};
export function sampleDeadline(request: SampleRequest): number | null {
  const raw = request.revisionDeadlineAt || request.deadlineAt;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}
export function sampleNeedsAttention(
  request: SampleRequest,
  now = Date.now(),
): boolean {
  if (request.status === 'DELIVERY_ISSUE') return true;
  const deadline = sampleDeadline(request);
  return (
    canSubmitSampleVideo(request.status) &&
    (request.status === 'OVERDUE' ||
      request.status === 'REVISION_REQUIRED' ||
      (deadline !== null && deadline <= now + 3 * 86400000))
  );
}
