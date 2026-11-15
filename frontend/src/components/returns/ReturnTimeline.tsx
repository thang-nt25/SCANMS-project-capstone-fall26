import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock3 } from 'lucide-react';
import type { ReturnDetail, ReturnStatus } from '../../services/return.service';
import { returnStatusLabel } from '@/utils/return-status.utils';

const eventLabels: Record<string, string> = {
  REQUEST_CREATED: 'Khách đã gửi yêu cầu đổi trả',
  REQUESTED_TO_SHOP_APPROVED: 'Shop chấp thuận yêu cầu',
  REQUESTED_TO_SHOP_REJECTED: 'Shop từ chối yêu cầu',
  PICKUP_WAREHOUSE_READY: 'Shop đã cấu hình kho nhận hàng trả',
  SHOP_APPROVED_TO_PICKUP_BOOKED: 'Khách đã đặt shipper lấy hàng',
  PICKUP_BOOKED_TO_RETURN_SHIPPED: 'Shipper đã lấy hàng',
  PICKUP_PROVIDER_STATUS: 'Đơn vị vận chuyển đã cập nhật trạng thái',
  RETURN_INSTRUCTIONS_SET: 'Shop đã cung cấp hướng dẫn gửi hàng',
  SHOP_APPROVED_TO_RETURN_SHIPPED: 'Khách xác nhận đã gửi hàng',
  TRACKING_CORRECTED: 'Khách đã sửa mã vận đơn',
  RETURN_SHIPPED_TO_RETURN_RECEIVED: 'Shop xác nhận đã nhận hàng',
  RETURN_RECEIVED_TO_INSPECTING: 'Shop bắt đầu kiểm tra',
  INSPECTION_SLA_ESCALATED: 'Quá 48 giờ chưa hoàn tất kiểm tra',
  INSPECTING_TO_REFUND_PENDING: 'Shop chấp thuận hoàn tiền',
  DISPUTED_TO_REFUND_PENDING: 'Manager duyệt phương án hoàn tiền',
  REFUND_PENDING_TO_AWAITING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận đồng ý hoàn tiền',
  CUSTOMER_REFUND_CONFIRMED: 'Khách đồng ý nhận tiền hoàn vào Ví SCANMS',
  EXCHANGE_BOOKING_REQUESTED: 'Shop đặt giao hàng thay thế và giữ tồn kho',
  EXCHANGE_BOOKING_REJECTED: 'Tạo vận đơn bị từ chối; đã trả lại hàng giữ kho',
  EXCHANGE_BOOKING_RETRY_REQUIRED: 'Đang đối chiếu vận đơn giao hàng đổi',
  EXCHANGE_PROVIDER_STATUS: 'Cập nhật vận chuyển hàng đổi',
  EXCHANGE_INCOME_PRESERVED: 'Đổi hàng trên đơn gốc; không phát sinh thù lao mới',
  INSPECTING_TO_EXCHANGE_PENDING: 'Shop chấp thuận đổi hàng',
  INSPECTING_TO_INSPECTION_REJECTED: 'Shop từ chối sau kiểm tra',
  EXCHANGE_PENDING_TO_EXCHANGE_SHIPPED: 'Đã ghi nhận vận đơn hàng đổi',
  EXCHANGE_SHIPPED_TO_COMPLETED: 'Khách xác nhận hoàn tất',
  AWAITING_CUSTOMER_CONFIRMATION_TO_COMPLETED: 'Khách xác nhận hoàn tất',
  SHIPMENT_DEADLINE_EXPIRED: 'Quá hạn gửi hàng trả',
  SHOP_EVIDENCE_SUBMITTED: 'Shop đã gửi bằng chứng cho Manager',
  GHN_COMPENSATION_CLAIM_OPENED: 'Đã mở hồ sơ bồi hoàn GHN',
  GHN_COMPENSATION_CLAIM_UPDATED: 'Manager cập nhật đối soát GHN',
};
const ghnClaimStatusLabels: Record<string, string> = {
  DRAFT: 'Chờ gửi GHN', SUBMITTED: 'Đã gửi GHN', NEEDS_MORE_EVIDENCE: 'Cần bổ sung bằng chứng',
  ACCEPTED: 'GHN chấp thuận', REJECTED: 'GHN từ chối', PAID: 'GHN đã thanh toán',
};

const steps = [
  'Shop phản hồi',
  'Đặt lấy hàng',
  'Shop nhận và kiểm tra',
  'Đổi hàng / hoàn tiền',
  'Hoàn tất',
];

function currentStep(status: ReturnStatus): number {
  if (['REQUESTED', 'SHOP_REJECTED'].includes(status)) return 0;
  if (['SHOP_APPROVED', 'PICKUP_BOOKED', 'EXPIRED', 'RETURN_SHIPPED'].includes(status)) return 1;
  if (['RETURN_RECEIVED', 'INSPECTING', 'INSPECTION_REJECTED'].includes(status)) return 2;
  if (['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_FAILED',
    'EXCHANGE_PENDING', 'EXCHANGE_SHIPPED', 'AWAITING_CUSTOMER_CONFIRMATION'].includes(status)) return 3;
  if (status === 'DISPUTED') return 3;
  return 4;
}

export function ReturnTimeline({ request, compact = false }: { request: ReturnDetail; compact?: boolean }) {
  const active = currentStep(request.status);
  const [expanded, setExpanded] = useState(false);
  const interrupted = ['SHOP_REJECTED', 'EXPIRED', 'INSPECTION_REJECTED', 'REFUND_FAILED', 'DISPUTED', 'CLOSED'].includes(request.status);
  const events = [...request.events];
  if (!events.some(event => event.type === 'REQUEST_CREATED') && Number.isFinite(Date.parse(request.submittedAt))) {
    events.push({ id: `${request.id}-submitted`, type: 'REQUEST_CREATED', createdAt: request.submittedAt });
  }
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const visibleEvents = expanded ? events : events.slice(0, 2);

  if (compact) return <section className="return-case-history" aria-label="Lịch sử xử lý">
    <header><h2>Tiến trình hồ sơ</h2><span>{returnStatusLabel(request.status)}</span></header>
    <ol className="return-history-steps">{steps.map((step,index)=><li key={step} aria-current={index===active?'step':undefined}><span>{index<active?<Check size={12}/>:index+1}</span>{step}</li>)}</ol>
    <div className="return-history-table"><table><thead><tr><th>Thời gian</th><th>Nội dung</th></tr></thead><tbody>{events.map(event=><tr key={event.id}><td><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'})}</time></td><td>{eventLabels[event.type] ?? 'Hồ sơ được cập nhật'}{event.type==='GHN_COMPENSATION_CLAIM_UPDATED' && event.data?.status ? ` · ${ghnClaimStatusLabels[event.data.status] || event.data.status}` : ''}</td></tr>)}</tbody></table></div>
  </section>;

  return (
    <section aria-label="Tiến trình đổi trả" className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-[#1A1612]">Tiến trình xử lý</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${interrupted
          ? 'border-red-200 bg-red-50 text-[#DC2626]'
          : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8A6736]'}`}>
          {returnStatusLabel(request.status)}
        </span>
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1 sm:gap-3">
        {steps.map((step, index) => (
          <li key={step} aria-current={index === active ? 'step' : undefined}
            className="min-w-0 text-center">
            <div className={`mb-2 flex h-1 rounded-full ${index <= active ? 'bg-[#C59B58]' : 'bg-[#EAE4D7]'}`} />
            <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index <= active ? 'bg-[#FBF5EB] text-[#B88E4F]' : 'bg-[#FAF8F5] text-[#7D715E]'}`}>
              {index < active ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={`block text-[10px] leading-4 sm:text-xs ${index === active ? 'font-semibold text-[#1A1612]' : 'text-[#7D715E]'}`}>{step}</span>
          </li>
        ))}
      </ol>
      {interrupted && <p className="mt-3 text-sm text-[#7D715E]">Quy trình đang tạm dừng; xem lý do và hướng xử lý bên dưới.</p>}
      {events.length > 0 && <section aria-label="Lịch sử xử lý" className="return-processing-history mt-4 border-t border-[#EAE4D7] pt-3">
        <header className="flex items-center justify-between gap-3 text-sm"><h3 className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-[#B88E4F]" />Cập nhật gần nhất</h3>{events.length > 2 && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#8A6736]">{expanded ? 'Thu gọn' : `Lịch sử (${events.length})`}{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>}</header>
        <ol className={`mt-1 divide-y divide-[#EAE4D7] text-sm ${expanded ? 'max-h-40 overflow-y-auto pr-2' : ''}`}>
          {visibleEvents.map((event) => <li key={event.id} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
            <span className="min-w-0 text-xs leading-5 text-[#1A1612]">{eventLabels[event.type] ?? 'Hồ sơ được cập nhật'}{event.type === 'GHN_COMPENSATION_CLAIM_UPDATED' && event.data?.status ? ` · ${ghnClaimStatusLabels[event.data.status] || event.data.status}` : ''}</span>
            <time className="text-[11px] tabular-nums text-[#7D715E]" dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </time>
          </li>)}
        </ol>
      </section>}
    </section>
  );
}
