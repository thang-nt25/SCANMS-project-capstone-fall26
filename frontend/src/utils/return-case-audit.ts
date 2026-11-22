import type { ReturnDetail } from '../services/return.service';

export interface ReturnCaseFinding {
  code: string;
  severity: 'action' | 'review';
  title: string;
  detail: string;
}

const hoursSince = (value: string | null | undefined, now: Date): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? (now.getTime() - time) / 3_600_000 : null;
};

/** Operational checks only; a finding is not an automatic liability ruling. */
export function analyzeReturnCase(request: ReturnDetail, now = new Date()): ReturnCaseFinding[] {
  const findings: ReturnCaseFinding[] = [];
  const add = (code: string, severity: ReturnCaseFinding['severity'], title: string, detail: string) =>
    findings.push({ code, severity, title, detail });

  if (request.status === 'SHOP_APPROVED' && !request.returnWarehouse) {
    add('WAREHOUSE_MISSING', 'action', 'Shop chưa cấu hình kho nhận hàng trả',
      'Yêu cầu Shop lưu địa chỉ kho để khách đặt GHN lấy hàng. Khách chưa cần tự gửi hàng.');
  }

  if (request.status === 'REFUND_FAILED' || request.refund?.status === 'FAILED') {
    add('REFUND_FAILED', 'action', 'Hoàn tiền vào ví chưa thành công',
      'Kiểm tra lý do lỗi; khách có thể mở hồ sơ và thử xác nhận lại. Manager chỉ thử hoàn lại nếu đã có xác nhận của khách. Chỉ thu hồi thu nhập KOL khi hoàn tiền thành công.');
  }

  const inspectionAge = hoursSince(request.receivedAt, now);
  if (inspectionAge != null && inspectionAge >= 48 && !request.inspectionCompletedAt &&
      ['RETURN_RECEIVED', 'INSPECTING', 'DISPUTED'].includes(request.status)) {
    add('INSPECTION_OVERDUE', 'action', 'Shop kiểm tra hàng trả quá 48 giờ',
      'Manager đối chiếu thời điểm GHN giao hàng trả và nhắc Shop kết luận; khách có quyền gửi khiếu nại.');
  }

  const managerLiability = [...request.events].reverse().find((event) =>
    event.type === 'LIABILITY_ASSESSED' && event.data?.source === 'SYSTEM_MANAGER_REVIEW');
  if (managerLiability?.data?.liability === 'LOGISTICS_FAULT') {
    if (!request.order.outboundGhnTrackingNumber) {
      add('GHN_TRACKING_MISSING', 'review', 'Thiếu vận đơn GHN gốc',
        'Cần đối chiếu mã vận đơn và chứng từ bàn giao trước khi kết luận trách nhiệm vận chuyển.');
    }
    if (!request.ghnClaim) {
      add('GHN_CLAIM_MISSING', 'action', 'Chưa có hồ sơ yêu cầu GHN bồi hoàn',
        'Manager mở yêu cầu bồi hoàn GHN độc lập với tiến độ đổi hoặc hoàn cho khách.');
    }
  }

  if (request.ghnClaim?.status === 'SUBMITTED') {
    const claimAge = hoursSince(request.ghnClaim.updatedAt, now);
    if (claimAge != null && claimAge >= 7 * 24) {
      add('GHN_REPLY_OVERDUE', 'action', 'GHN chưa phản hồi sau 7 ngày',
        'Manager liên hệ GHN, lưu mã yêu cầu và chứng từ liên hệ. Không trì hoãn quyền lợi của khách.');
    }
  }
  if (request.ghnClaim?.status === 'NEEDS_MORE_EVIDENCE') {
    add('GHN_EVIDENCE_REQUIRED', 'action', 'GHN yêu cầu bổ sung bằng chứng',
      'Đối chiếu ảnh/video từ khách, biên bản đóng gói của Shop và vận đơn trước khi gửi bổ sung.');
  }
  if (request.ghnClaim?.status === 'REJECTED') {
    add('GHN_CLAIM_REJECTED', 'review', 'GHN từ chối bồi hoàn',
      'Ghi lý do từ chối, cân nhắc khiếu nại lại và xác định khoản tổn thất nội bộ; không thu hồi tiền đã hoàn cho khách.');
  }

  if (request.dispute?.status === 'OPEN') {
    add('DISPUTE_OPEN', 'action', 'Khiếu nại đang chờ phân xử',
      'Manager xem bằng chứng hai bên và lưu kết luận có căn cứ. Không đóng hồ sơ khi Shop vẫn giữ hàng khách trả mà chưa có phương án xử lý.');
  }

  return findings;
}
