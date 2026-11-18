import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowUpRight, Check, CircleCheck, Clock3, MessageSquare, PackageSearch, Repeat2, Truck, Wallet, X } from 'lucide-react';
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!historyOpen) return;
    const dialog = historyDialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [historyOpen]);
  useEffect(() => { setHistoryOpen(false); setHistoryPage(1); }, [request.id]);
  const active = currentStep(request.status);
  const isExchange = request.resolution === 'EXCHANGE' || ['EXCHANGE_PENDING', 'EXCHANGE_SHIPPED'].includes(request.status);
  const isRefund = request.resolution === 'REFUND' || ['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_FAILED', 'REFUNDED'].includes(request.status);
  const steps = ['Shop phản hồi', 'Lấy hàng trả', 'Shop kiểm tra', isExchange ? 'Giao hàng đổi' : isRefund ? 'Hoàn tiền' : 'Đổi hàng / Hoàn tiền', 'Hoàn tất'];
  const icons = [MessageSquare, Truck, PackageSearch, isExchange ? Truck : isRefund ? Wallet : Repeat2, CircleCheck];
  const finished = ['COMPLETED', 'REFUNDED'].includes(request.status);
  const interrupted = ['SHOP_REJECTED', 'EXPIRED', 'INSPECTION_REJECTED', 'REFUND_FAILED', 'DISPUTED', 'CLOSED'].includes(request.status);
  const events = [...request.events];
  if (!events.some(event => event.type === 'REQUEST_CREATED') && Number.isFinite(Date.parse(request.submittedAt))) {
    events.push({ id: `${request.id}-submitted`, type: 'REQUEST_CREATED', createdAt: request.submittedAt });
  }
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const eventText = (event: ReturnDetail['events'][number]) => {
    const label = eventLabels[event.type] ?? event.data?.details ?? event.data?.notes ?? 'Hồ sơ được cập nhật';
    return event.type === 'GHN_COMPENSATION_CLAIM_UPDATED' && event.data?.status
      ? `${label} · ${ghnClaimStatusLabels[event.data.status] || event.data.status}` : label;
  };
  const dayLabel = (value: string) => Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có ngày';
  const historyPages = Math.max(1, Math.ceil(events.length / 10));
  const visibleHistoryPage = Math.min(historyPage, historyPages);
  const eventGroups = events.slice((visibleHistoryPage - 1) * 10, visibleHistoryPage * 10).reduce<Array<{ day: string; events: ReturnDetail['events'] }>>((groups, event) => {
    const day = dayLabel(event.createdAt);
    const group = groups[groups.length - 1];
    if (group?.day === day) group.events.push(event);
    else groups.push({ day, events: [event] });
    return groups;
  }, []);
  const stepEventTypes = [
    ['REQUESTED_TO_SHOP_APPROVED', 'REQUESTED_TO_SHOP_REJECTED'],
    ['PICKUP_BOOKED_TO_RETURN_SHIPPED', 'SHOP_APPROVED_TO_RETURN_SHIPPED'],
    ['RETURN_RECEIVED_TO_INSPECTING', 'RETURN_SHIPPED_TO_RETURN_RECEIVED'],
    isExchange ? ['EXCHANGE_PENDING_TO_EXCHANGE_SHIPPED', 'INSPECTING_TO_EXCHANGE_PENDING'] : ['INSPECTING_TO_REFUND_PENDING', 'DISPUTED_TO_REFUND_PENDING'],
    ['EXCHANGE_SHIPPED_TO_COMPLETED', 'AWAITING_CUSTOMER_CONFIRMATION_TO_COMPLETED'],
  ];

  if (compact) return <section className="return-case-history" aria-label="Lịch sử xử lý">
    <header><h2>Tiến trình hồ sơ</h2><span>{returnStatusLabel(request.status)}</span></header>
    <ol className="return-history-steps">{steps.map((step,index)=><li key={step} data-done={index<active || finished} aria-current={index===active?'step':undefined}><span>{index<active || finished?<Check size={12}/>:index+1}</span><span className="return-history-step-label">{step}</span>{index < steps.length - 1 && <ArrowRight className="return-history-step-arrow" size={17} aria-hidden="true" />}</li>)}</ol>
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
      <ol className="return-icon-progress">
        {steps.map((step, index) => {
          const Icon = icons[index];
          const done = index < active || finished;
          const date = events.find(event => stepEventTypes[index].includes(event.type))?.createdAt;
          const timestamp = index === 4 && request.refund?.status === 'SUCCEEDED' ? request.refund.processedAt ?? date : date;
          return (
          <li key={step} aria-current={index === active ? 'step' : undefined}
            className={`${done ? 'is-done' : ''} ${index === active ? 'is-current' : ''}`}>
            <span className="return-progress-icon">
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              {done && <span className="return-progress-tick"><Check size={9} aria-hidden="true" /></span>}
            </span>
            <span className="return-progress-label">{step}</span>
            {timestamp && Number.isFinite(Date.parse(timestamp)) && <time dateTime={timestamp}>{new Date(timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</time>}
          </li>
        );})}
      </ol>
      {interrupted && <p className="mt-3 text-sm text-[#7D715E]">Quy trình đang tạm dừng; xem lý do và hướng xử lý bên dưới.</p>}
      {events.length > 0 && <section aria-label="Cập nhật gần nhất" className="return-processing-history mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] pt-3">
        <div className="min-w-0 flex-1"><h3 className="flex items-center gap-2 text-xs font-semibold"><Clock3 size={15} className="text-[#B88E4F]" />Cập nhật gần nhất</h3>
          <p className="mt-1 text-xs leading-5 text-[#7D715E]">{eventText(events[0])}{Number.isFinite(Date.parse(events[0].createdAt)) && <> · <time dateTime={events[0].createdAt}>{new Date(events[0].createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></>}</p>
        </div>
        <button type="button" onClick={() => { setHistoryPage(1); setHistoryOpen(true); }} aria-haspopup="dialog" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-medium text-[#8A6736] hover:border-[#C59B58]">Lịch sử · {events.length}<ArrowUpRight size={14} /></button>
      </section>}
      {historyOpen && createPortal(<dialog ref={historyDialog} className="return-history-drawer" aria-label="Lịch sử xử lý" onCancel={() => setHistoryOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setHistoryOpen(false); } }}>
        <header className="return-drawer-header"><div><h2>Lịch sử xử lý</h2><p>Đơn {request.order.externalOrderSn}</p></div><button type="button" aria-label="Đóng lịch sử xử lý" onClick={() => setHistoryOpen(false)} autoFocus><X size={20} /></button></header>
        <div className="return-drawer-events">{eventGroups.map(group => <section key={group.day}><h3>{group.day}</h3><ol>{group.events.map(event => {
          const Icon = /SHIP|PICKUP|PROVIDER|BOOKING/.test(event.type) ? Truck : /REFUND/.test(event.type) ? Wallet : /INSPECT|RECEIVED/.test(event.type) ? PackageSearch : /COMPLETED/.test(event.type) ? CircleCheck : MessageSquare;
          return <li key={event.id}><span className="return-history-event-icon"><Icon size={15} /></span><div><p>{eventText(event)}</p>{Number.isFinite(Date.parse(event.createdAt)) && <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</time>}</div></li>;
        })}</ol></section>)}</div>
        <footer className="return-history-footer"><span>{events.length} sự kiện · Mới nhất trước</span>{historyPages > 1 && <nav aria-label="Trang lịch sử"><button type="button" disabled={visibleHistoryPage === 1} onClick={() => setHistoryPage(visibleHistoryPage - 1)}>Trước</button><span>{visibleHistoryPage} / {historyPages}</span><button type="button" disabled={visibleHistoryPage === historyPages} onClick={() => setHistoryPage(visibleHistoryPage + 1)}>Sau</button></nav>}</footer>
      </dialog>, document.body)}
    </section>
  );
}
