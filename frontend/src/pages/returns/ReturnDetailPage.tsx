import { ReturnActionDialog } from '../../components/returns/ReturnActionDialog';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Truck, ClipboardCheck, Play, Copy, Check } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { returnService, type ReturnDetail } from '../../services/return.service';
import { useReturnAction, useReturnDetail } from '../../hooks/useReturnDetail';
import { ReturnTimeline } from '../../components/returns/ReturnTimeline';
import { PickupBookingForm } from '../../components/returns/PickupBookingForm';
import { DisputeModal } from '../../components/returns/DisputeModal';
import { MarketplaceHeader } from '../../components/marketplace/MarketplaceHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { carrierStatusLabel, returnReasonLabel, returnStatusLabel } from '@/utils/return-status.utils';
import { customerService, type CustomerOrderItem } from '../../services/customer.service';
import { canConfirmReturnCompletion, canRequestReturnReview } from '../../utils/return-actions';
import { getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';
import { downloadReturnCaseReport } from '../../utils/return-case-report';
import { analyzeReturnCase } from '../../utils/return-case-audit';
import { ExchangeShipmentPanel } from '../../components/returns/ExchangeShipmentPanel';
import { CustomerRefundResult } from '../../components/returns/CustomerRefundResult';
import { GhnClaimEditor } from '../../components/returns/GhnClaimEditor';
import { GhnClaimSummary } from '../../components/returns/GhnClaimSummary';
import { ReturnOutcomeCard } from '../../components/returns/ReturnOutcomeCard';
import { ShopEvidencePanel } from '../../components/returns/ShopEvidencePanel';
import { ShopReturnDecisionForm } from '../../components/returns/ShopReturnDecisionForm';
import { ReturnWarehouseCard } from '../../components/returns/ReturnWarehouseCard';
import { ShopReturnShipmentPanel } from '../../components/returns/ShopReturnShipmentPanel';
import { ShopReturnInspectionDialog } from '../../components/returns/ShopReturnInspectionDialog';
import { ReturnOversightDetail, type ReturnDetailPanel } from '../../components/returns/ReturnOversightDetail';
import { caseProducts, CaseProductImage } from '../../components/returns/ReturnCaseProducts';

const field = 'mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm outline-none focus:border-[#C59B58]';
const liabilityLabels: Record<string, string> = {
  LOGISTICS_FAULT: 'GHN / vận chuyển',
  SHOP_FAULT: 'Shop / hàng hóa',
  CUSTOMER_REASON: 'Khách đổi ý',
};
const primary = 'rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50';
const money = (amount: number | string) => `${Number(amount).toLocaleString('vi-VN')} ₫`;


function TrackingCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="mt-2 flex items-center gap-1"><span className="min-w-0 break-all text-xs font-semibold tabular-nums">{value}</span><button type="button" aria-label={copied ? 'Đã sao chép mã vận đơn' : 'Sao chép mã vận đơn'} title={copied ? 'Đã sao chép' : 'Sao chép mã vận đơn'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#B88E4F] hover:bg-[#FBF5EB]" onClick={() => { void navigator.clipboard.writeText(value).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>;
}

function ReturnCaseAudit({ request }: { request: ReturnDetail }) {
  const findings = analyzeReturnCase(request);
  return <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5" aria-label="Kiểm tra hồ sơ đổi trả">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-bold text-[#1A1612]">Điểm cần kiểm tra trong hồ sơ</h2>
      <span className="rounded-full border border-[#EEDFC6] bg-white px-2.5 py-1 text-xs font-semibold text-[#795A2D]">
        {findings.length} mục
      </span>
    </div>
    <p className="mt-1 text-xs text-[#7D715E]">Gợi ý vận hành từ dữ liệu hiện tại; Manager vẫn phải đối chiếu chứng từ trước khi kết luận.</p>
    {findings.length === 0 ? <p className="mt-3 text-sm text-[#7D715E]">Chưa phát hiện mục cần xử lý thêm tại thời điểm này.</p> :
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{findings.map((finding) => <li key={finding.code}
        className="rounded-xl border border-[#EAE4D7] bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${finding.severity === 'action'
            ? 'bg-[#FFF1E6] text-[#A45312]' : 'bg-[#F3EFE6] text-[#795A2D]'}`}>
            {finding.severity === 'action' ? 'Cần xử lý' : 'Cần đối chiếu'}
          </span>
          <strong className="text-sm">{finding.title}</strong>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#7D715E]">{finding.detail}</p>
      </li>)}</ul>}
  </section>;
}

function ReturnProducts({ request, customer }: { request: ReturnDetail; customer: boolean }) {
  const [originalItems, setOriginalItems] = useState<CustomerOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const missingItems = !request.items.length;
  useEffect(() => {
    setOriginalItems([]);
    if (!customer || !missingItems) return;
    let active = true;
    setLoading(true);
    customerService.getOrderDetails(request.order.id)
      .then(order => { if (active) setOriginalItems(order.orderItems); })
      .catch(() => { /* Keep the order link available when original items cannot be loaded. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customer, missingItems, request.order.id]);
  const products = missingItems ? originalItems.map(item => ({ id: item.id, quantity: item.quantity, unitPrice: item.unitPrice, product: item.product }))
    : request.items.map(item => ({ id: item.id, quantity: item.quantity, unitPrice: item.unitPrice, product: item.orderItem.product, variantName: item.orderItem.variant?.name }));
  return <div className="grid gap-2.5 mt-4">
    {missingItems && <p className="text-xs text-[#7D715E]">{loading ? 'Đang tải sản phẩm…' : products.length ? 'Sản phẩm trong đơn gốc' : 'Hồ sơ chưa có thông tin sản phẩm liên kết.'}</p>}
    {products.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3.5 p-3 border border-[#EAE4D7] rounded-md [&>img]:w-16 [&>img]:h-16 [&>img]:shrink-0 [&>img]:object-contain [&>div]:flex-1 [&>div]:min-w-0 [&>div]:basis-[calc(100%-80px)] sm:[&>div]:basis-auto [&>div]:text-sm [&>div_strong]:break-words [&>strong]:text-sm [&>strong]:whitespace-nowrap max-sm:[&>strong]:ml-auto [&_strong]:font-medium [&_span]:block [&_span]:mt-1.25 [&_span]:text-xs [&_span]:text-[#7D715E]">
      <img src={getSafeProductImageUrl(item.product?.imageUrl)} onError={handleProductImageError} alt={item.product?.title || 'Sản phẩm'} />
      <div><strong>{item.product?.title || 'Sản phẩm trong đơn'}</strong><span>{'variantName' in item && item.variantName ? `${item.variantName} · ` : ''}Số lượng: {item.quantity}</span><span>Đơn giá: {money(item.unitPrice)}</span></div>
      <strong>{money(Number(item.unitPrice) * item.quantity)}</strong>
    </div>)}
  </div>;
}

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p role="alert" className="mt-2 text-sm text-[#DC2626]">
    {error instanceof Error ? error.message : 'Thao tác không thành công. Vui lòng thử lại.'}
  </p>;
}

function CustomerExchangeReceipt({ request }: { request: ReturnDetail }) {
  const receipt = useReturnAction(request.id, returnService.confirmExchangeReceipt);
  const completion = useReturnAction(request.id, returnService.confirmCompletion);
  const actionLock = useRef(false);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const shipment = request.exchangeShipment;
  const canReceive = request.status === 'EXCHANGE_SHIPPED' && Boolean(shipment);
  const canComplete = request.resolution === 'EXCHANGE' && canConfirmReturnCompletion(request);
  const received = Boolean(shipment?.receivedAt);
  if (!canReceive && !canComplete && !(received && request.resolution === 'EXCHANGE')) return null;
  const waitingCarrier = !received && Boolean(shipment?.provider && shipment.providerStatus !== 'delivered');
  const busy = working || receipt.isPending || completion.isPending;
  const products = caseProducts(request);
  const status = received ? 'Đã xác nhận nhận hàng' : shipment?.providerStatus === 'delivered' ? 'Đã giao hàng' : shipment?.providerStatus ? carrierStatusLabel(shipment.providerStatus, 'customer') : 'Đã gửi hàng đổi';
  async function confirm() {
    if (actionLock.current || busy || (!canComplete && (!canReceive || waitingCarrier))) return;
    actionLock.current = true; setWorking(true);
    try { await (canComplete ? completion.mutateAsync(undefined) : receipt.mutateAsync(undefined)); }
    catch { /* Preserve the action for retry; the API error is shown below. */ }
    finally { actionLock.current = false; setWorking(false); }
  }
  return <section aria-label="Xác nhận hàng đổi" className="customer-exchange-receipt">
    <header className="customer-exchange-header"><h2><Truck size={18} aria-hidden="true" />Hàng đổi của bạn</h2><span className="customer-exchange-status" role="status">{status}</span></header>
    {shipment && <div className="customer-exchange-tracking"><p><span>{shipment.provider === 'MOCK' && /SCANMS Demo/i.test(shipment.carrierName) ? 'Vận chuyển SCANMS' : shipment.carrierName}</span><span aria-hidden="true"> · </span><strong>{shipment.trackingNumber}</strong></p><button type="button" onClick={() => { void navigator.clipboard.writeText(shipment.trackingNumber).then(() => { setCopied(true); setCopyFailed(false); }).catch(() => setCopyFailed(true)); }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Đã sao chép' : 'Sao chép'}</button></div>}
    {copyFailed && <p role="alert" className="customer-exchange-error">Chưa sao chép được mã vận đơn.</p>}
    <div className="customer-exchange-products">{products.map(product => <div className="customer-exchange-product" key={product.id}><CaseProductImage product={product} size={48} /><div><strong>{product.title}</strong><p>{product.variantName ? `${product.variantName} · ` : ''}Số lượng: {product.quantity}</p></div></div>)}</div>
    <footer className="customer-exchange-footer">
      <div><p>Không thu thêm tiền hàng</p>{received && <p className="customer-exchange-confirmed"><Check size={14} aria-hidden="true" />Đã xác nhận nhận hàng<time dateTime={shipment!.receivedAt!}>{new Date(shipment!.receivedAt!).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></p>}</div>
      {(canReceive || canComplete) && <button type="button" disabled={busy || (!canComplete && waitingCarrier)} onClick={() => void confirm()} className="customer-exchange-confirm">
        {busy ? 'Đang xác nhận…' : canComplete ? 'Xác nhận hoàn tất' : 'Xác nhận đã nhận hàng'}
      </button>}
    </footer>
    <div className="customer-exchange-errors">
      <ErrorText error={receipt.error || completion.error} />
    </div>
  </section>;
}

function CustomerActions({ request }: { request: ReturnDetail }) {
  const [searchParams] = useSearchParams();
  const mayDispute = canRequestReturnReview(request);
  const liabilityEvent = [...request.events].reverse().find((event) => event.type === 'LIABILITY_ASSESSED');
  const [showDispute, setShowDispute] = useState(() => mayDispute && searchParams.get('dispute') === '1');
  const [carrierName, setCarrierName] = useState(request.customerShipment?.carrierName ?? '');
  const [trackingNumber, setTrackingNumber] = useState(request.customerShipment?.trackingNumber ?? '');
  const correction = useReturnAction(request.id, returnService.correctShipment);
  const inspectionOverdue = ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) &&
    Boolean(request.receivedAt) && new Date(request.receivedAt!).getTime() <= Date.now() - 48 * 60 * 60 * 1000;

  async function correct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await correction.mutateAsync({ carrierName: carrierName.trim(), trackingNumber: trackingNumber.trim() }); }
    catch { /* Keep input for retry; error is rendered below. */ }
  }

  return <div className="grid gap-3 sm:grid-cols-2 [&>form]:col-span-full [&>div]:col-span-full">
    {inspectionOverdue && <section role="alert" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      Shop đã nhận hàng hơn 48 giờ nhưng chưa hoàn tất kiểm tra. Hệ thống đã đưa hồ sơ vào diện cần xử lý; bạn có thể gửi khiếu nại.
    </section>}
    {(request.status === 'SHOP_APPROVED' || request.customerShipment) && <PickupBookingForm key={request.id} request={request} />}

    {(request.inspectionNotes || request.exchangeShipment) && <section className="col-span-full overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white"><h3 className="border-b border-[#EAE4D7] px-4 py-3 text-sm font-bold">Vận chuyển & kiểm tra</h3><div className="grid divide-y divide-[#EAE4D7] sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
    {request.inspectionNotes && <section className="min-w-0 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold"><ClipboardCheck size={17} className="text-[#B88E4F]" />Shop kiểm tra</h3>
      {liabilityEvent?.data?.liability &&
        <p className="mt-2 text-sm font-semibold">Trách nhiệm: {liabilityLabels[liabilityEvent.data.liability] || 'Chưa xác định'}</p>}
      <p className="mt-2 whitespace-pre-wrap text-sm">{request.inspectionNotes}</p>
    </section>}
    {request.exchangeShipment && <section className="min-w-0 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold"><Truck size={17} className="text-[#B88E4F]" />Hàng đổi gửi đến bạn</h3>
      <TrackingCode value={request.exchangeShipment.trackingNumber} />
      <p className="mt-1 text-xs text-[#7D715E]">{request.exchangeShipment.provider === 'MOCK' && /SCANMS Demo/i.test(request.exchangeShipment.carrierName) ? 'Vận chuyển SCANMS' : request.exchangeShipment.carrierName}</p>
      {request.exchangeShipment.providerStatus && <p className="mt-3 text-xs font-medium text-[#8A6736]">{carrierStatusLabel(request.exchangeShipment.providerStatus, 'customer')}</p>}
    </section>}
    </div></section>}
    {request.status === 'RETURN_SHIPPED' && !request.customerShipment?.provider && <form onSubmit={(event) => void correct(event)}
      className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Nhập sai vận đơn?</h3>
      <p className="mt-1 text-xs text-[#7D715E]">Bạn chỉ có thể sửa trước khi Shop xác nhận nhận hàng.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Đơn vị vận chuyển
          <input required minLength={2} maxLength={100} value={carrierName}
            onChange={(event) => setCarrierName(event.target.value)} className={field} /></label>
        <label className="text-sm">Mã vận đơn
          <input required minLength={5} maxLength={100} value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)} className={field} /></label>
      </div>
      <button type="submit" disabled={correction.isPending} className={`${primary} mt-3`}>
        {correction.isPending ? 'Đang cập nhật…' : 'Lưu vận đơn sửa'}
      </button>
      <ErrorText error={correction.error} />
    </form>}



    {request.refund && <CustomerRefundResult request={request} />}

    {request.dispute && !request.refund && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Kết quả khiếu nại</h3><span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-[11px] font-medium text-[#8A6736]">{request.dispute.status === 'OPEN' ? 'Chờ phân xử' : 'Đã phân xử'}</span></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-[#7D715E]">{request.dispute.details}</p>
      {request.dispute.resolutionNotes && <div className="mt-3 border-t border-[#EAE4D7] pt-3"><p className="text-[11px] text-[#7D715E]">Quyết định xử lý</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{request.dispute.resolutionNotes}</p></div>}
    </section>}

    <div className="flex flex-wrap gap-2">
      {mayDispute && <button type="button" onClick={() => setShowDispute(true)}
        className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2.5 text-sm font-semibold text-[#8A6736]">Yêu cầu SCANMS xem xét</button>}
    </div>
    {showDispute && mayDispute && <DisputeModal returnId={request.id} onClose={() => setShowDispute(false)} />}
  </div>;
}

function ShopActions({ request }: { request: ReturnDetail }) {
  const mayEditWarehouse = request.status === 'SHOP_APPROVED';
  const receiptAction = useReturnAction(request.id, returnService.confirmReceipt);
  const startAction = useReturnAction(request.id, returnService.startInspection);

  return <div className="space-y-4">
    {request.ghnClaim && <GhnClaimSummary claim={request.ghnClaim} />}
    {request.inspectionEscalatedAt && ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) &&
      <p role="alert" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm font-semibold text-[#8A6736]">
        Hồ sơ đã quá 48 giờ kiểm tra và được thông báo cho Admin. Vui lòng cập nhật kết quả sớm.
      </p>}
    {request.status === 'REQUESTED' && <ShopReturnDecisionForm key={request.id} orderId={request.orderId} request={request} />}
    {mayEditWarehouse && <ReturnWarehouseCard key={request.id} request={request} />}
    {request.customerShipment && <ShopReturnShipmentPanel key={request.id} request={request} />}
    {!request.customerShipment && request.status === 'RETURN_SHIPPED' && <div><button type="button" disabled={receiptAction.isPending} onClick={() => void receiptAction.mutateAsync(undefined).catch(() => undefined)} className={primary}>{receiptAction.isPending ? 'Đang cập nhật…' : 'Xác nhận Shop đã nhận hàng trả'}</button><ErrorText error={receiptAction.error} /></div>}
    {!request.customerShipment && request.status === 'RETURN_RECEIVED' && <div><button type="button" disabled={startAction.isPending} onClick={() => void startAction.mutateAsync(undefined).catch(() => undefined)} className={primary}>{startAction.isPending ? 'Đang cập nhật…' : 'Bắt đầu kiểm tra'}</button><ErrorText error={startAction.error} /></div>}
    {request.status === 'INSPECTING' && <ShopReturnInspectionDialog key={request.id} request={request} />}
  </div>;
}


function AdminActions({ request }: { request: ReturnDetail }) {
  const [liability, setLiability] = useState<'' | 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON'>('');
  const [notes, setNotes] = useState('');
  const assessment = useReturnAction(request.id, returnService.assessLiability);
  const current = (assessment.data as ReturnDetail | undefined)?.id === request.id
    ? (assessment.data as ReturnDetail) : request;
  const savedAssessment = [...current.events].reverse().find((event) =>
    event.type === 'LIABILITY_ASSESSED' && event.data?.source === 'SYSTEM_MANAGER_REVIEW');
  const mayAssess = ['REQUESTED', 'SHOP_APPROVED', 'PICKUP_BOOKED', 'RETURN_SHIPPED', 'RETURN_RECEIVED', 'INSPECTING'].includes(request.status);
  if (savedAssessment) return <section role="status" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
    <h2 className="font-bold">Đã lưu kết luận trách nhiệm</h2>
    <p className="mt-2">Bên chịu trách nhiệm: <strong>{liabilityLabels[savedAssessment.data?.liability || ''] || 'Chưa xác định'}</strong></p>
    {savedAssessment.data?.notes && <p className="mt-1 text-[#7D715E]">Căn cứ: {savedAssessment.data.notes}</p>}
    <p className="mt-2 text-[#7D715E]">Hồ sơ vẫn ở bước xử lý hiện tại. Khách cần gửi hàng trả về Shop; sau khi nhận và kiểm tra, Shop chọn đổi sản phẩm hoặc hoàn tiền theo kết luận này.</p>
    <Link to="/admin/return-disputes" className="mt-3 inline-block font-semibold text-[#8A6736] underline">Quay lại danh sách đổi trả</Link>
  </section>;
  if (!mayAssess) return <p className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
    Hồ sơ đã qua bước xác định trách nhiệm. Xem kết quả kiểm tra và thu nhập đối tác ở trên.
  </p>;
  return <ReturnActionDialog title="Xác định bên chịu trách nhiệm" busy={assessment.isPending}><form className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4"
    onSubmit={(event) => { event.preventDefault(); if (liability) void assessment.mutateAsync({ liability, notes: notes.trim() }).catch(() => undefined); }}>
    <h2 className="font-bold">System Manager xác định bên chịu trách nhiệm</h2>
    <p className="text-sm text-[#7D715E]">Đối chiếu ảnh, video mở hộp, biên bản đóng gói và lịch sử vận đơn trước khi kết luận. Nếu chưa đủ chứng cứ, giữ hồ sơ để xác minh thêm.</p>
    <p className="text-sm text-[#7D715E]">Vận đơn GHN gốc: {request.order.outboundGhnTrackingNumber || 'Chưa có'}. Việc đổi hoặc hoàn cho khách không chờ GHN bồi hoàn cho Shop.</p>
    <select value={liability} onChange={(event) => setLiability(event.target.value as typeof liability)} className={field}>
      <option value="">Chọn bên chịu trách nhiệm</option>
      <option value="LOGISTICS_FAULT" disabled={!request.order.outboundGhnTrackingNumber}>GHN / vận chuyển</option>
      <option value="SHOP_FAULT">Shop / hàng hóa</option>
      <option value="CUSTOMER_REASON">Khách đổi ý</option>
    </select>
    <textarea required minLength={10} maxLength={2000} rows={3} value={notes}
      onChange={(event) => setNotes(event.target.value)} placeholder="Ghi rõ bằng chứng và căn cứ kết luận"
      className={field} />
    {notes.trim().length < 10 && <p className="text-xs text-[#7D715E]">Nhập ít nhất 10 ký tự để lưu kết luận ({notes.trim().length}/10).</p>}
    <button type="submit" disabled={assessment.isPending || !liability || notes.trim().length < 10} className={primary}>
      {assessment.isPending ? 'Đang lưu…' : 'Lưu kết luận trách nhiệm'}
    </button>
    <ErrorText error={assessment.error} />
  </form></ReturnActionDialog>;
}


function AdminRefundRetry({ request }: { request: ReturnDetail }) {
  const retry = useReturnAction(request.id, returnService.retryPendingRefund);
  if (!['REFUND_PENDING', 'REFUND_FAILED'].includes(request.status) ||
      !request.refund || !['PENDING', 'FAILED'].includes(request.refund.status)) return null;
  return <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
    <h2 className="font-bold">Hoàn tiền đang chờ xử lý</h2>
    <p className="mt-2 text-[#7D715E]">Số tiền {money(request.refund.amount)} chưa vào ví khách. Thu nhập KOL chỉ bị thu hồi sau khi hoàn tiền thành công.</p>
    {!request.events.some(event => event.type === 'CUSTOMER_REFUND_CONFIRMED') && <p className="mt-2 text-[#7D715E]">Khách cần mở hồ sơ trong đơn hàng và xác nhận đồng ý hoàn tiền. Manager không thể chuyển tiền trước bước này.</p>}
    {request.events.some(event => event.type === 'CUSTOMER_REFUND_CONFIRMED') && <button type="button" disabled={retry.isPending}
      onClick={() => void retry.mutateAsync(undefined).catch(() => undefined)} className={`${primary} mt-3`}>
      {retry.isPending ? 'Đang xử lý…' : 'Thử hoàn tiền vào ví khách'}
    </button>}
    <ErrorText error={retry.error} />
  </section>;
}

function LegacyReturnDetailPage({ mode }: { mode: 'customer' | 'shop' | 'admin' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useReturnDetail(id);
  const user = authService.getCurrentUser();
  const location = useLocation();
  const shopReturnFrom = location.state?.shopReturnFrom;
  const shopBackPath = ['/merchant/orders', '/merchant/returns', '/merchant/return-requests'].includes(shopReturnFrom?.pathname)
    ? shopReturnFrom.pathname as string
    : '/merchant/returns';
  const shopBackSearch = shopBackPath === shopReturnFrom?.pathname && typeof shopReturnFrom.search === 'string'
    ? shopReturnFrom.search
    : '';
  const back = mode === 'shop' ? { pathname: shopBackPath, search: shopBackSearch } : mode === 'admin' ? '/admin/return-disputes' : '/customer/orders';
  const backLabel = mode === 'shop' && shopBackPath !== '/merchant/orders' ? 'Quay lại danh sách hồ sơ' : 'Quay lại đơn hàng';

  if (!user) return <div className="min-h-screen bg-[#FAF8F5] p-6"><p>Bạn cần đăng nhập để xem hồ sơ.</p>
    <button onClick={() => navigate('/login')} className={`${primary} mt-3`}>Đăng nhập</button></div>;

  return <div className={mode === 'customer' ? 'customer-return-layout customer-portal-layout min-h-dvh bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans' : ''}>
    {mode === 'customer' && <div className="sticky top-0 isolate shrink-0 bg-[#FAF8F5] z-40"><MarketplaceHeader showShortcuts={false} onOpenTracking={() => navigate('/tracking')} /></div>}
    <main className={mode === 'customer' ? 'w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-0 flex-1 min-h-0 flex flex-col' : mode === 'shop' ? 'shop-return-workspace min-h-screen bg-[#FAF8F5] text-[#1A1612]' : 'min-h-screen bg-[#FAF8F5] px-4 py-6 text-[#1A1612] sm:px-6'}>
      <div className={mode === 'customer' ? 'flex flex-col lg:flex-row gap-5 lg:gap-6 items-start flex-1 min-h-0' : ''}>
      {mode === 'customer' && <aside className="relative hidden w-full lg:w-[265px] lg:shrink-0 lg:sticky lg:top-[155px] lg:flex lg:flex-col after:pointer-events-none after:absolute after:top-7 after:bottom-5 after:-right-3 after:w-px after:bg-[#EAE4D7]"><Sidebar currentUser={user} className="px-0 lg:max-h-[calc(100dvh-165px)] lg:overflow-y-auto no-scrollbar" onLogout={() => { authService.logout(); navigate('/login'); }} /></aside>}
      <div className={mode === 'customer' ? 'workspace-page-column w-full flex-1 min-w-0 min-h-0 lg:px-3 pt-4 sm:pt-5 pb-5 [scrollbar-gutter:stable] flex flex-col gap-4 text-left [scrollbar-width:thin] [scrollbar-color:rgba(180,140,75,0.45)_transparent]' : ''}>
      <div className={`mx-auto space-y-4 ${mode === 'customer' ? 'shrink-0 min-w-0 w-full border border-[#EAE4D7] rounded-2xl bg-white overflow-hidden shadow-[0_8px_30px_rgba(110,84,39,.06)] [&>div]:p-4 sm:[&>div]:p-4 [&>section]:p-4 sm:[&>section]:p-[22px] [&>div]:border-b [&>div]:border-[#EAE4D7] [&>section]:border-b [&>section]:border-[#EAE4D7] [&>*:last-child]:border-b-0' : mode === 'shop' ? 'shop-return-detail' : 'max-w-5xl'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={back} state={mode === 'customer' ? { returnedOrderCode: detail.data?.order.externalOrderSn, clearOrderSearch: true } : undefined} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7D715E] hover:text-[#B88E4F]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
          </Link>
          {mode === 'customer' && detail.data && <div className="ml-auto min-w-0 text-right">
            <h1 className="text-base font-bold">Hồ sơ đổi trả</h1>
            <p className="mt-0.5 text-xs text-[#7D715E]">Đơn <strong className="font-medium text-[#1A1612]">{detail.data.order.externalOrderSn}</strong></p>
          </div>}
          {mode === 'admin' && <div className="flex flex-wrap items-center gap-2">
            {mode === 'admin' && detail.data && <button type="button" onClick={() => downloadReturnCaseReport(detail.data, analyzeReturnCase(detail.data))}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-sm font-semibold text-[#795A2D] hover:bg-[#F3EFE6]">
              <Download className="h-4 w-4" /> Tải hồ sơ đối soát
            </button>}
          </div>}
        </div>
        {detail.isLoading && <p role="status">Đang tải hồ sơ đổi trả…</p>}
        {detail.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[#DC2626]">
          {detail.error instanceof Error ? detail.error.message : 'Không thể tải hồ sơ.'}
        </div>}
        {detail.data && <>
          {mode !== 'customer' && <header className="shop-return-heading rounded-2xl border border-[#EAE4D7] bg-white p-5">
            <CaseProductImage product={caseProducts(detail.data)[0]} size={64} />
            <div><p className="text-xs text-[#7D715E]">Hồ sơ đổi trả</p>
            <h1 className="mt-1 text-lg font-semibold">{detail.data.order.externalOrderSn}</h1>
            <p className="mt-1 text-xs text-[#7D715E]">{detail.data.order.storeName}</p></div>
            <div className="shop-return-heading-status"><span>{returnStatusLabel(detail.data.status)}</span><time>Gửi lúc {new Date(detail.data.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></div>
          </header>}
          {mode === 'admin' && <ReturnCaseAudit request={detail.data} />}
          <ReturnTimeline request={detail.data} />
          {mode === 'customer' && <CustomerExchangeReceipt request={detail.data} />}
          {mode === 'shop' && <ExchangeShipmentPanel key={detail.data.id} request={detail.data} />}
{mode === 'admin' && detail.data.partnerIncome && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4" aria-label="Thu nhập đối tác của đơn hàng">
            <h2 className="font-bold text-[#1A1612]">Thu nhập đối tác của đơn hàng</h2>
            <p className="mt-2 text-xl font-black text-[#8A6736]">{money(detail.data.partnerIncome.amount)}</p>
            <p className="mt-1 text-sm text-[#7D715E]">
              {detail.data.partnerIncome.status === 'REVERSED'
                ? 'Đã thu hồi toàn bộ thu nhập của đơn sau khi hoàn tiền thành công; ví KOC còn 0 ₫ từ đơn này.'
                : detail.data.resolution === 'EXCHANGE'
                  ? 'Đổi hàng 1-1: khoản thu nhập của KOC được bảo lưu.'
                  : detail.data.partnerIncome.status === 'PENDING'
                    ? 'Đang tạm giữ trong Escrow, chưa thể rút.'
                    : detail.data.partnerIncome.status === 'AVAILABLE'
                      ? 'Đã giải tỏa vào số dư khả dụng của KOC.'
                      : 'Mức dự kiến theo đơn; hệ thống sẽ ghi ví khi đơn đủ điều kiện.'}
            </p>
          </section>}
          {mode === 'customer' && <section className="customer-return-address [&_h2]:m-0 [&_h2]:mb-4.5 [&_h2]:text-lg [&_h2]:font-medium [&>div]:grid [&>div]:grid-cols-1 sm:[&>div]:grid-cols-2 [&>div]:gap-5.5 [&_address]:flex [&_address]:flex-col [&_address]:gap-2.25 [&_address]:text-[13px] [&_address]:not-italic [&_address]:leading-relaxed [&_address]:[overflow-wrap:anywhere] [&_address_strong]:font-medium [&_address_strong]:text-[#1A1612] [&_address_span]:m-0 [&_address_span]:text-[#7D715E] [&_address_p]:m-0 [&_address_p]:text-[#7D715E] [&>div>div]:flex [&>div>div]:flex-col [&>div>div]:gap-3 [&>div>div]:border-t sm:[&>div>div]:border-t-0 sm:[&>div>div]:border-l [&>div>div]:border-[#EAE4D7] [&>div>div]:pt-4 sm:[&>div>div]:pt-0 sm:[&>div>div]:pl-5.5 [&>div>div]:text-[13px] [&_a]:self-start [&_a]:px-3 [&_a]:py-1.75 [&_a]:border [&_a]:border-[#EAE4D7] [&_a]:rounded [&_a]:text-[#795A2D] [&_a]:no-underline">
            <h2>Địa chỉ nhận hàng</h2>
            <div><address><strong>{detail.data.order.customerName || 'Chưa có tên người nhận'}</strong><span>{detail.data.order.customerPhone || 'Chưa có số điện thoại'}</span><p>{detail.data.order.shippingAddress || 'Chưa có địa chỉ nhận hàng'}</p></address>
              <div><strong>{detail.data.order.storeName}</strong><Link to={`/customer/orders/${encodeURIComponent(detail.data.order.id)}`}>Xem đơn hàng gốc</Link></div></div>
          </section>}
          {detail.data.shopResponse && <section className="rounded-xl border border-[#EEDFC6] bg-white p-4 text-sm">
            <h2 className="text-sm font-semibold">Phản hồi của Shop</h2>
            {(() => {
              const event = [...detail.data.events].reverse().find(event => ['REQUESTED_TO_SHOP_APPROVED', 'REQUESTED_TO_SHOP_REJECTED'].includes(event.type));
              return event && <time dateTime={event.createdAt} className="mt-1 block text-xs text-[#7D715E]">Phản hồi lúc {new Date(event.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>;
            })()}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{detail.data.shopResponse}</p>
            {mode === 'customer' && ['SHOP_REJECTED', 'INSPECTION_REJECTED'].includes(detail.data.status) && <p className="mt-3 rounded-lg bg-[#FBF5EB] p-3 text-xs leading-relaxed text-[#7D715E]">
              Đây là phản hồi của Shop, chưa phải kết quả phân xử của SCANMS. Nếu không đồng ý, bạn có thể yêu cầu SCANMS xem xét hồ sơ và bằng chứng.
            </p>}
          </section>}
          {mode !== 'customer' && <ReturnOutcomeCard request={detail.data} />}
          <div className={mode === 'shop' ? 'shop-return-information' : ''}>
          <section className="return-evidence-section rounded-2xl border border-[#EAE4D7] bg-white p-4">
            <h2 className="text-sm font-bold">Sản phẩm & bằng chứng</h2>
            <ReturnProducts request={detail.data} customer={mode === 'customer'} />
            <div className="mt-4 grid gap-4 border-t border-[#EAE4D7] pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,auto)]">
              <div className="min-w-0 text-sm leading-6">
                <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                  <dt className="text-xs text-[#7D715E]">Lý do</dt><dd className="m-0 font-medium">{returnReasonLabel(detail.data.reason)}</dd>
                  {detail.data.preferredResolution && <><dt className="text-xs text-[#7D715E]">Phương án</dt><dd className="m-0 font-medium">{detail.data.preferredResolution === 'REFUND' ? 'Hoàn tiền vào Ví SCANMS' : 'Đổi sản phẩm mới'}</dd></>}
                </dl>
                {detail.data.details && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#7D715E]">{detail.data.details}</p>}
              </div>
            <div className="flex max-w-sm flex-wrap items-start gap-2.5 sm:justify-end">
              {detail.data.imageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"
                className="grid w-20 gap-1 text-center text-[11px] text-[#795A2D] no-underline [&_img]:h-20 [&_img]:w-20 [&_img]:rounded-xl [&_img]:border [&_img]:border-[#EAE4D7] [&_img]:bg-[#FAF8F5] [&_img]:object-contain"><img src={getSafeProductImageUrl(url)} onError={handleProductImageError} alt={`Ảnh bằng chứng ${index + 1}`} loading="lazy" /><span>Ảnh {index + 1}</span></a>)}
              {detail.data.unboxingVideoUrl && <a href={detail.data.unboxingVideoUrl} target="_blank" rel="noreferrer" aria-label="Xem video bằng chứng" className="grid w-20 gap-1 text-center text-[11px] text-[#795A2D]"><span className="relative flex h-20 overflow-hidden items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]"><video src={detail.data.unboxingVideoUrl} preload="metadata" muted playsInline aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" /><span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#EEDFC6] bg-white/95 shadow-sm"><Play size={16} /></span></span><span>Video</span></a>}
              {!detail.data.imageUrls.length && !detail.data.unboxingVideoUrl && <p className="text-sm text-[#7D715E]">Chưa có bằng chứng đính kèm.</p>}
            </div>
            </div>
          </section>
          {mode === 'shop' && <aside className="shop-return-facts"><h2>Thông tin xử lý</h2><dl>
            <dt>Người nhận</dt><dd>{detail.data.order.customerName || 'Chưa ghi nhận'}</dd>
            <dt>Số điện thoại</dt><dd>{detail.data.order.customerPhone || 'Chưa ghi nhận'}</dd>
            <dt>Địa chỉ</dt><dd>{detail.data.order.shippingAddress || 'Chưa ghi nhận'}</dd>
            <dt>Phương án yêu cầu</dt><dd>{detail.data.preferredResolution === 'EXCHANGE' ? 'Đổi sản phẩm mới' : detail.data.preferredResolution === 'REFUND' ? 'Hoàn tiền vào ví' : 'Chưa ghi nhận'}</dd>
            <dt>Thù lao KOL liên quan</dt><dd>{detail.data.partnerIncome ? money(detail.data.partnerIncome.amount) : 'Chưa ghi nhận'}</dd>
            <dt>Trạng thái khoản tiền</dt><dd>{detail.data.partnerIncome ? ({ NOT_POSTED: 'Chưa ghi ví', PENDING: 'Chờ đối soát', AVAILABLE: 'Đã khả dụng', REVERSED: 'Đã thu hồi' }[detail.data.partnerIncome.status]) : 'Chưa ghi nhận'}</dd>
            {detail.data.refund && <><dt>Khoản hoàn cho khách</dt><dd>{money(detail.data.refund.amount)}</dd></>}
          </dl>{detail.data.resolution === 'EXCHANGE' && <p>Đổi hàng 1–1: bảo lưu thù lao trên đơn gốc.</p>}</aside>}
          </div>
          {detail.data.events.filter((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED').map((event) => <section key={event.id}
            className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
            <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardCheck size={17} className="text-[#B88E4F]" />Bằng chứng từ Shop</h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#7D715E]">{event.data?.details}</p></div>
            <div className="flex flex-wrap gap-2">
              {event.data?.evidenceUrls?.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#8A6736]"><Download size={14} />Bằng chứng {index + 1}</a>)}
            </div></div>
          </section>)}
          {mode === 'shop' ? <><ShopEvidencePanel request={detail.data} /><ShopActions request={detail.data} /></> : mode === 'customer' ? <CustomerActions request={detail.data} /> :
            <><AdminRefundRetry request={detail.data} /><GhnClaimEditor request={detail.data} /><AdminActions request={detail.data} /></>}
        </>}
      </div>
      </div>
      </div>
    </main>
  </div>;
}

function AdminReturnWorkspace() {
  const { id } = useParams();
  const client = useQueryClient();
  const detail = useReturnDetail(id);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const rawPanel = params.get('panel');
  const panel: ReturnDetailPanel = rawPanel === 'handling' || rawPanel === 'evidence' || rawPanel === 'shipping' || rawPanel === 'history' ? rawPanel : 'products';
  const setPanel = (next: ReturnDetailPanel) => setParams(previous => { const updated = new URLSearchParams(previous); updated.set('panel',next); return updated; },{replace:true,state:location.state});
  const savedReturnTo = location.state?.returnTo;
  const returnTo = typeof savedReturnTo === 'string' && /^\/admin\/arbitration\?/.test(savedReturnTo) ? savedReturnTo : '/admin/arbitration?tab=returns';
  const request = detail.data;
  const products = request ? caseProducts(request) : [];
  const findings = request ? analyzeReturnCase(request) : [];
  const destinations: Record<string, ReturnDetailPanel> = {
    WAREHOUSE_MISSING: 'shipping', GHN_TRACKING_MISSING: 'shipping', GHN_CLAIM_MISSING: 'shipping',
    GHN_REPLY_OVERDUE: 'shipping', GHN_EVIDENCE_REQUIRED: 'evidence', GHN_CLAIM_REJECTED: 'shipping',
    REFUND_FAILED: 'handling', INSPECTION_OVERDUE: 'handling', DISPUTE_OPEN: 'handling',
  };
  function openPanel(next: ReturnDetailPanel) {
    setPanel(next);
    document.getElementById('return-admin-workspace-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return <div className="return-admin-workspace">
    <section className="return-workspace-card" aria-label="Hồ sơ đổi trả">
    <div className="return-workspace-toolbar"><Link to={returnTo}><ArrowLeft size={15}/>Danh sách đổi trả</Link>
      {request && <button type="button" onClick={() => downloadReturnCaseReport(request, findings)}><Download size={15}/>Tải hồ sơ</button>}</div>
    {!request && <p role={detail.error ? 'alert' : 'status'}>{detail.error ? 'Không tải được hồ sơ đổi trả.' : 'Đang tải hồ sơ…'}{detail.error && <button type="button" onClick={() => void detail.refetch()}>Thử lại</button>}</p>}
    {request && <><header className="return-workspace-summary">
      {products[0] && <CaseProductImage product={products[0]} size={56}/>}
      <div><h1>Hồ sơ #{request.order.externalOrderSn}</h1><p>{request.order.storeName} · {request.order.customerName || 'Chưa có tên khách'}</p></div>
      <span className="return-workspace-status">{returnStatusLabel(request.status)}</span>
    </header>
    {!!findings.length && <section className="return-workspace-findings" aria-label="Mục cần xử lý"><h2>Cần kiểm tra <span>{findings.length}</span></h2>
      <div className="return-finding-items">{findings.map(finding => <article key={finding.code} className="return-finding-item"><div><h3>{finding.title}</h3><p>{finding.detail}</p></div><button type="button" onClick={() => openPanel(destinations[finding.code] || 'handling')} aria-label={`Xử lý: ${finding.title}`}>Đến xử lý<span aria-hidden="true">↗</span></button></article>)}</div>
    </section>}
    <div id="return-admin-workspace-content"><ReturnOversightDetail key={request.id} snapshot={request} activePanel={panel} onPanelChange={setPanel}
      onChanged={async () => { await Promise.all([detail.refetch(),...['rejected-return-reviews','active-return-oversight','ghn-claims','stalled-return-inspections','return-disputes','return-history'].map(key=>client.invalidateQueries({queryKey:[key]}))]); }}
      handlingActions={current => <><AdminRefundRetry request={current}/>{!current.dispute && <AdminActions request={current}/>}{current.partnerIncome && <section className="return-detail-box"><h4>Thu nhập KOL của đơn</h4><strong>{money(current.partnerIncome.amount)}</strong><p>{({REVERSED:'Đã thu hồi',PENDING:'Đang tạm giữ',AVAILABLE:'Đã khả dụng',NOT_POSTED:'Dự kiến theo đơn'})[current.partnerIncome.status]}</p></section>}</>}
      shippingActions={current => <div className="return-workspace-ghn-actions"><GhnClaimEditor request={current}/></div>}/></div>
    </>}
    </section>
  </div>;
}

export default function ReturnDetailPage({ mode }: { mode: 'customer' | 'shop' | 'admin' }) {
  return mode === 'admin' ? <AdminReturnWorkspace/> : <LegacyReturnDetailPage mode={mode}/>;
}
