import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { returnService, type ReturnAddress, type ReturnDetail } from '../../services/return.service';
import { useReturnAction, useReturnDetail } from '../../hooks/useReturnDetail';
import { ReturnTimeline } from '../../components/returns/ReturnTimeline';
import { PickupBookingForm } from '../../components/returns/PickupBookingForm';
import { DisputeModal } from '../../components/returns/DisputeModal';
import { uploadService } from '../../services/upload.service';
import { MarketplaceHeader } from '../../components/marketplace/MarketplaceHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { carrierStatusLabel, returnReasonLabel, returnStatusLabel } from '@/utils/return-status.utils';
import { customerService, type CustomerOrderItem } from '../../services/customer.service';
import { canRequestReturnReview } from '../../utils/return-actions';
import { getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';

const field = 'mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm outline-none focus:border-[#C59B58]';
const liabilityLabels: Record<string, string> = {
  LOGISTICS_FAULT: 'GHN / vận chuyển',
  SHOP_FAULT: 'Shop / hàng hóa',
  CUSTOMER_REASON: 'Khách đổi ý',
};
const primary = 'rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#B88E4F] disabled:opacity-50';
const money = (amount: number | string) => `${Number(amount).toLocaleString('vi-VN')} ₫`;
const ghnClaimLabels: Record<string, string> = {
  DRAFT: 'Chờ gửi GHN', SUBMITTED: 'Đã gửi GHN, chờ phản hồi',
  NEEDS_MORE_EVIDENCE: 'GHN yêu cầu bổ sung bằng chứng', ACCEPTED: 'GHN đã chấp thuận',
  REJECTED: 'GHN từ chối bồi hoàn', PAID: 'Đã ghi nhận GHN thanh toán',
};

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
    : request.items.map(item => ({ id: item.id, quantity: item.quantity, unitPrice: item.unitPrice, product: item.orderItem.product }));
  return <div className="grid gap-2.5 mt-4">
    {missingItems && <p className="text-xs text-[#7D715E]">{loading ? 'Đang tải sản phẩm…' : products.length ? 'Sản phẩm trong đơn gốc' : 'Hồ sơ chưa có thông tin sản phẩm liên kết.'}</p>}
    {products.map(item => <div key={item.id} className="flex items-center gap-3.5 p-3 border border-[#EAE4D7] rounded-md [&>img]:w-16 [&>img]:h-16 [&>img]:shrink-0 [&>img]:object-contain [&>div]:flex-1 [&>div]:min-w-0 [&>div]:text-sm [&>strong]:text-sm [&>strong]:whitespace-nowrap [&_strong]:font-medium [&_span]:block [&_span]:mt-1.25 [&_span]:text-xs [&_span]:text-[#7D715E]">
      <img src={getSafeProductImageUrl(item.product?.imageUrl)} onError={handleProductImageError} alt={item.product?.title || 'Sản phẩm'} />
      <div><strong>{item.product?.title || 'Sản phẩm trong đơn'}</strong><span>Số lượng: {item.quantity}</span></div>
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

function CustomerActions({ request }: { request: ReturnDetail }) {
  const [searchParams] = useSearchParams();
  const mayDispute = canRequestReturnReview(request);
  const liabilityEvent = [...request.events].reverse().find((event) => event.type === 'LIABILITY_ASSESSED');
  const [showDispute, setShowDispute] = useState(() => mayDispute && searchParams.get('dispute') === '1');
  const [carrierName, setCarrierName] = useState(request.customerShipment?.carrierName ?? '');
  const [trackingNumber, setTrackingNumber] = useState(request.customerShipment?.trackingNumber ?? '');
  const correction = useReturnAction(request.id, returnService.correctShipment);
  const completion = useReturnAction(request.id, returnService.confirmCompletion);
  const exchangeReceipt = useReturnAction(request.id, returnService.confirmExchangeReceipt);
  const inspectionOverdue = ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) &&
    Boolean(request.receivedAt) && new Date(request.receivedAt!).getTime() <= Date.now() - 48 * 60 * 60 * 1000;
  const mayComplete = request.status === 'AWAITING_CUSTOMER_CONFIRMATION' &&
    (request.refund?.status === 'SUCCEEDED' || Boolean(request.exchangeShipment?.receivedAt));

  async function correct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await correction.mutateAsync({ carrierName: carrierName.trim(), trackingNumber: trackingNumber.trim() }); }
    catch { /* Keep input for retry; error is rendered below. */ }
  }

  return <div className="space-y-4">
    {inspectionOverdue && <section role="alert" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      Shop đã nhận hàng hơn 48 giờ nhưng chưa hoàn tất kiểm tra. Hệ thống đã đưa hồ sơ vào diện cần xử lý; bạn có thể gửi khiếu nại.
    </section>}
    {request.status === 'SHOP_APPROVED' && (
      <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
        <h3 className="font-bold text-[#1A1612]">Lấy hàng trả tận nơi</h3>
        <p className="mt-2 text-sm text-[#7D715E]">Sau khi đặt, đơn vị vận chuyển đến địa chỉ bạn xác nhận và mang kiện hàng về Shop.</p>
        {!request.returnWarehouse && <p className="mt-2 text-sm text-[#7D715E]">Shop đang cấu hình kho nhận hàng trả. Bạn chưa cần gửi hàng.</p>}
      </section>
    )}
    {request.status === 'SHOP_APPROVED' && request.returnWarehouse && request.shipByAt &&
      <PickupBookingForm request={request} />}

    {request.customerShipment && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Vận chuyển hàng trả</h3>
      <p className="mt-2 text-sm">{request.customerShipment.carrierName} · {request.customerShipment.trackingNumber}</p>
      <p className="mt-1 text-sm text-[#7D715E]">{request.customerShipment.receivedAt
        ? 'Hàng đã đến Shop, chờ kiểm tra.' : request.status === 'PICKUP_BOOKED'
          ? 'Đã đặt lấy hàng, đang chờ shipper đến.' : 'Shipper đã lấy hàng, đang chuyển về Shop.'}</p>
      {request.customerShipment.providerStatus && <p className="mt-1 text-xs text-[#7D715E]">Trạng thái đơn vị vận chuyển: {carrierStatusLabel(request.customerShipment.providerStatus)}</p>}
      {request.customerShipment.provider === 'MOCK' && <p className="mt-1 text-xs text-[#8A6736]">Vận đơn demo, không có chuyến giao nhận thật.</p>}
      {request.customerShipment.receiptImageUrl && <a href={request.customerShipment.receiptImageUrl}
        target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-[#B88E4F] underline">
        Xem ảnh biên nhận</a>}
    </section>}

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

    {request.inspectionNotes && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Kết quả kiểm tra của Shop</h3>
      {liabilityEvent?.data?.liability &&
        <p className="mt-2 text-sm font-semibold">Trách nhiệm: {liabilityLabels[liabilityEvent.data.liability] || 'Chưa xác định'}</p>}
      <p className="mt-2 whitespace-pre-wrap text-sm">{request.inspectionNotes}</p>
    </section>}

    {request.refund && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
      <h3 className="font-bold">Tình trạng hoàn tiền</h3>
      <p className="mt-2 text-sm">Số tiền dự kiến: <strong>{money(request.refund.amount)}</strong></p>
      <p className="mt-1 text-sm">Phương thức: {request.refund.method}</p>
      <p className="mt-1 text-sm font-semibold">{request.refund.status === 'SUCCEEDED'
        ? 'Đã hoàn tiền vào Ví SCANMS'
        : request.refund.status === 'FAILED' ? 'Hoàn tiền gặp lỗi; đang cần xử lý'
          : request.refund.status === 'PROCESSING' ? 'Đang xử lý tại bên thanh toán'
            : 'Chưa chuyển tiền · đang chờ đối soát'}</p>
      {request.refund.failureReason && <p className="mt-1 text-sm text-[#DC2626]">{request.refund.failureReason}</p>}
      {request.refund.status === 'SUCCEEDED' && request.status === 'AWAITING_CUSTOMER_CONFIRMATION' &&
        <p className="mt-1 text-xs text-[#7D715E]">Bạn có thể xác nhận hoàn tất. Sau 7 ngày, hồ sơ đã hoàn tiền sẽ tự đóng.</p>}
    </section>}

    {request.exchangeShipment && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Hàng đổi Shop đã gửi</h3>
      <p className="mt-2 text-sm">{request.exchangeShipment.carrierName} · {request.exchangeShipment.trackingNumber}</p>
      {!request.exchangeShipment.receivedAt && <p className="mt-1 text-xs text-[#7D715E]">Chỉ xác nhận đã nhận hàng đổi khi kiện thực sự đến tay bạn. Nếu chưa nhận hoặc hàng có vấn đề, giữ hồ sơ mở và liên hệ hỗ trợ.</p>}
    </section>}

    {request.dispute && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Khiếu nại: {request.dispute.status === 'OPEN' ? 'Đang chờ phân xử' : 'Đã phân xử'}</h3>
      <p className="mt-2 text-sm">{request.dispute.details}</p>
      {request.dispute.resolutionNotes && <p className="mt-2 text-sm">Quyết định: {request.dispute.resolutionNotes}</p>}
    </section>}

    <div className="flex flex-wrap gap-2">
      {request.status === 'EXCHANGE_SHIPPED' && request.exchangeShipment &&
        <button type="button" disabled={exchangeReceipt.isPending}
          onClick={() => void exchangeReceipt.mutateAsync(undefined).catch(() => undefined)} className={primary}>
          {exchangeReceipt.isPending ? 'Đang xác nhận…' : 'Tôi đã nhận hàng đổi'}
        </button>}
      <ErrorText error={exchangeReceipt.error} />
      {mayComplete && <button type="button" disabled={completion.isPending}
        onClick={() => void completion.mutateAsync(undefined).catch(() => undefined)} className={primary}>
        {completion.isPending ? 'Đang xác nhận…' : 'Tôi đã nhận kết quả · Hoàn tất'}
      </button>}
      {mayDispute && <button type="button" onClick={() => setShowDispute(true)}
        className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2.5 text-sm font-semibold text-[#8A6736]">Yêu cầu SCANMS xem xét</button>}
    </div>
    <ErrorText error={completion.error} />
    {showDispute && mayDispute && <DisputeModal returnId={request.id} onClose={() => setShowDispute(false)} />}
  </div>;
}

function ShopActions({ request }: { request: ReturnDetail }) {
  const managerAssessment = [...request.events].reverse().find((event) =>
    event.type === 'LIABILITY_ASSESSED' && event.data?.source === 'SYSTEM_MANAGER_REVIEW');
  const [warehouse, setWarehouse] = useState<ReturnAddress>(request.returnWarehouse || {
    name: request.order.storeName, phone: '', address: '', wardName: '', provinceName: '', districtName: '',
  });
  const [editingWarehouse, setEditingWarehouse] = useState(!request.returnWarehouse);
  const [resolution, setResolution] = useState<'REFUND' | 'EXCHANGE' | 'REJECT'>(request.preferredResolution || 'REFUND');
  const [liability, setLiability] = useState<'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON'>(
    (managerAssessment?.data?.liability as 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON') ||
      (request.reason === 'CHANGE_OF_MIND' ? 'CUSTOMER_REASON' : 'SHOP_FAULT'));
  const [notes, setNotes] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const warehouseAction = useReturnAction(request.id, returnService.saveWarehouse);
  const simulateAction = useReturnAction(request.id, returnService.simulatePickup);
  const syncAction = useReturnAction(request.id, returnService.syncPickup);
  const receiptAction = useReturnAction(request.id, returnService.confirmReceipt);
  const startAction = useReturnAction(request.id, returnService.startInspection);
  const inspectAction = useReturnAction(request.id, returnService.submitInspection);
  const exchangeAction = useReturnAction(request.id, returnService.submitExchangeShipment);

  async function submit<T>(event: FormEvent<HTMLFormElement>, action: { mutateAsync: (value: T) => Promise<unknown> }, value: T) {
    event.preventDefault();
    try { await action.mutateAsync(value); }
    catch { /* Error remains visible on the form. */ }
  }

  return <div className="space-y-4">
    {request.ghnClaim && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      <h3 className="font-bold">Hồ sơ yêu cầu GHN bồi hoàn</h3>
      <p className="mt-1">Trạng thái: <strong>{ghnClaimLabels[request.ghnClaim.status]}</strong></p>
      <p className="mt-1 text-[#7D715E]">Vận đơn gốc: {request.ghnClaim.originalTrackingNumber}; mã yêu cầu GHN: {request.ghnClaim.ghnReference || 'chưa gửi'}.</p>
      {request.ghnClaim.status === 'SUBMITTED' && Date.now() - Date.parse(request.ghnClaim.updatedAt) > 7 * 86400000 &&
        <p role="alert" className="mt-2 font-semibold text-[#8A6736]">GHN chưa phản hồi sau 7 ngày. System Manager cần liên hệ lại và cập nhật chứng từ; việc xử lý cho khách không phải chờ GHN.</p>}
      {request.ghnClaim.status === 'REJECTED' &&
        <p role="alert" className="mt-2 font-semibold text-[#8A6736]">GHN đã từ chối. System Manager cần xem xét kháng nghị hoặc quyết định nguồn bù cho Shop; không trừ tiền Shop tự động.</p>}
      {request.ghnClaim.claimedAmount && <p className="mt-1">Yêu cầu: {money(request.ghnClaim.claimedAmount)} · GHN chấp thuận: {request.ghnClaim.approvedAmount ? money(request.ghnClaim.approvedAmount) : 'chưa có'}</p>}
      {request.ghnClaim.notes && <p className="mt-1 text-[#7D715E]">Đối soát: {request.ghnClaim.notes}</p>}
    </section>}
    {request.inspectionEscalatedAt && ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) &&
      <p role="alert" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm font-semibold text-[#8A6736]">
        Hồ sơ đã quá 48 giờ kiểm tra và được thông báo cho Admin. Vui lòng cập nhật kết quả sớm.
      </p>}
    {request.status === 'REQUESTED' && <div className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      Hồ sơ đang chờ duyệt. <Link to="/merchant/orders" className="font-bold text-[#B88E4F] underline">Mở quản lý đơn hàng để duyệt/từ chối</Link>.
    </div>}
    {request.status === 'SHOP_APPROVED' && !editingWarehouse && request.returnWarehouse && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      <p className="font-bold">Kho nhận hàng trả: {request.returnWarehouse.address}</p>
      <p className="mt-1 text-[#7D715E]">Khách sẽ xác nhận địa chỉ lấy hàng để đặt shipper. Shop không phải cấp địa chỉ theo từng đơn.</p>
      <button type="button" onClick={() => setEditingWarehouse(true)} className="mt-2 font-semibold text-[#8A6736] underline">Sửa kho nhận hàng</button>
    </section>}
    {request.status === 'SHOP_APPROVED' && editingWarehouse && <form
      onSubmit={(event) => { event.preventDefault(); void warehouseAction.mutateAsync({
        ...warehouse, name: warehouse.name.trim(), phone: warehouse.phone.trim(), address: warehouse.address.trim(),
        wardName: warehouse.wardName.trim(), provinceName: warehouse.provinceName.trim(), districtName: warehouse.districtName?.trim() || undefined,
      }).then(() => setEditingWarehouse(false)).catch(() => undefined); }}
      className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
      <h3 className="font-bold">Cấu hình kho nhận hàng trả của Shop</h3>
      <p className="text-sm text-[#7D715E]">Lưu một lần cho gian hàng. Đây là địa chỉ GHN sẽ chuyển hàng khách trả về.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['name', 'Tên người nhận tại kho'], ['phone', 'Số điện thoại kho'],
          ['address', 'Địa chỉ kho'], ['provinceName', 'Tỉnh / thành phố'],
          ['wardName', 'Phường / xã'], ['districtName', 'Quận / huyện (nếu địa chỉ cũ)'],
        ] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}
          <input required={key !== 'districtName'} minLength={key === 'address' ? 10 : key === 'phone' ? 9 : 2}
            maxLength={key === 'address' ? 500 : key === 'phone' ? 20 : 150} value={warehouse[key] || ''}
            onChange={(event) => setWarehouse((current) => ({ ...current, [key]: event.target.value }))} className={field} />
        </label>)}
      </div>
      <button disabled={warehouseAction.isPending} className={primary}>{warehouseAction.isPending ? 'Đang lưu…' : 'Lưu kho nhận hàng'}</button>
      <ErrorText error={warehouseAction.error} />
    </form>}
    {request.customerShipment && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Vận đơn hàng trả</h3>
      <p className="mt-2 text-sm">{request.customerShipment.carrierName} · {request.customerShipment.trackingNumber}</p>
      {request.customerShipment.providerStatus && <p className="mt-1 text-xs text-[#7D715E]">Trạng thái hãng vận chuyển: {carrierStatusLabel(request.customerShipment.providerStatus)}</p>}
      {request.customerShipment.provider === 'GHN_STAGING' && <button type="button" disabled={syncAction.isPending}
        onClick={() => void syncAction.mutateAsync(undefined).catch(() => undefined)}
        className="mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-bold text-[#8A6736] disabled:opacity-50">
        {syncAction.isPending ? 'Đang đồng bộ…' : 'Đồng bộ trạng thái từ GHN'}
      </button>}
      <ErrorText error={syncAction.error} />
      {request.customerShipment.receiptImageUrl && <a href={request.customerShipment.receiptImageUrl}
        target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#B88E4F] underline">Xem ảnh biên nhận</a>}
    </section>}
    {request.pickupSimulationEnabled && request.customerShipment?.provider && ['PICKUP_BOOKED', 'RETURN_SHIPPED'].includes(request.status) && <div className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      <p className="font-bold">Mô phỏng tiến trình vận chuyển</p>
      <p className="mt-1 text-[#7D715E]">Chỉ để test phần mềm; không tạo chuyến lấy hàng thật.</p>
      <button type="button" disabled={simulateAction.isPending}
        onClick={() => void simulateAction.mutateAsync({ status: request.status === 'PICKUP_BOOKED' ? 'picked' : 'delivered' }).catch(() => undefined)} className={`${primary} mt-3`}>
        {request.status === 'PICKUP_BOOKED' ? 'Mô phỏng shipper đã lấy hàng' : 'Mô phỏng hàng đã đến Shop'}
      </button><ErrorText error={simulateAction.error} />
    </div>}
    {request.status === 'RETURN_SHIPPED' && !request.customerShipment?.provider && <div>
      <button type="button" disabled={receiptAction.isPending}
        onClick={() => void receiptAction.mutateAsync(undefined).catch(() => undefined)} className={primary}>
        Xác nhận Shop đã nhận hàng trả
      </button><ErrorText error={receiptAction.error} />
    </div>}
    {request.status === 'RETURN_RECEIVED' && <div>
      <button type="button" disabled={startAction.isPending}
        onClick={() => void startAction.mutateAsync(undefined).catch(() => undefined)} className={primary}>
        Bắt đầu kiểm tra
      </button><ErrorText error={startAction.error} />
    </div>}
    {request.status === 'INSPECTING' && <form
      onSubmit={(event) => void submit(event, inspectAction, { resolution, liability: (managerAssessment?.data?.liability as typeof liability) || liability, notes: notes.trim() })}
      className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Kết quả kiểm tra</h3>
      {request.preferredResolution && <p className="text-sm text-[#7D715E]">Khách mong muốn: {request.preferredResolution === 'REFUND' ? 'hoàn tiền vào Ví SCANMS' : 'đổi sản phẩm mới'}. Nếu xử lý khác, ghi rõ căn cứ trong phần ghi chú.</p>}
      <select value={resolution} onChange={(event) => setResolution(event.target.value as typeof resolution)} className={field}>
        <option value="REFUND">Chấp nhận hoàn tiền</option>
        <option value="EXCHANGE">Chấp nhận đổi sản phẩm</option>
        <option value="REJECT">Từ chối sau kiểm tra</option>
      </select>
      <label className="block text-sm font-semibold">Bên chịu trách nhiệm</label>
      <select value={managerAssessment?.data?.liability || liability} disabled={Boolean(managerAssessment)} onChange={(event) => setLiability(event.target.value as typeof liability)} className={field}>
        <option value="LOGISTICS_FAULT" disabled={!managerAssessment}>GHN / vận chuyển (cần System Manager xác minh)</option>
        <option value="SHOP_FAULT">Shop / hàng hóa</option>
        <option value="CUSTOMER_REASON">Khách đổi ý</option>
      </select>
      {managerAssessment && <p className="text-xs text-[#7D715E]">System Manager đã xác định trách nhiệm; Shop xử lý theo kết luận này.</p>}
      <textarea required minLength={10} maxLength={2000} rows={4} value={notes}
        onChange={(event) => setNotes(event.target.value)} placeholder="Nêu tình trạng hàng và căn cứ quyết định" className={field} />
      <p className="text-xs text-[#7D715E]">Hoàn vào ví khi chuyển tiền nội bộ thành công; nếu chưa thể chuyển, hồ sơ tiếp tục chờ đối soát.</p>
      <button disabled={inspectAction.isPending} className={primary}>Lưu kết quả kiểm tra</button>
      <ErrorText error={inspectAction.error} />
    </form>}
    {request.status === 'EXCHANGE_PENDING' && <form
      onSubmit={(event) => void submit(event, exchangeAction, { carrierName: carrierName.trim(), trackingNumber: trackingNumber.trim() })}
      className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Gửi sản phẩm thay thế</h3>
      <input required minLength={2} maxLength={100} value={carrierName} onChange={(event) => setCarrierName(event.target.value)}
        placeholder="Đơn vị vận chuyển" className={field} />
      <input required minLength={5} maxLength={100} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)}
        placeholder="Mã vận đơn" className={field} />
      <button disabled={exchangeAction.isPending} className={primary}>Xác nhận đã gửi hàng đổi</button>
      <ErrorText error={exchangeAction.error} />
    </form>}
  </div>;
}

function ShopEscalation({ request }: { request: ReturnDetail }) {
  const [details, setDetails] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const action = useReturnAction(request.id, returnService.escalateShopRejection);
  const canSend = (request.status === 'SHOP_REJECTED' && !request.dispute) ||
    (request.status === 'DISPUTED' && request.dispute?.status === 'OPEN');
  if (!canSend || request.events.some((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED')) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const evidenceUrls = await Promise.all(files.map(async (file) =>
        (await uploadService.uploadMedia(file, `scanms/returns/${request.id}/shop-evidence`)).url));
      await action.mutateAsync({ details: details.trim(), evidenceUrls });
    } catch (cause) { setError(cause); }
    finally { setUploading(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
    <h2 className="font-bold">Gửi bằng chứng cho System Manager</h2>
    <p className="text-sm text-[#7D715E]">Nếu Shop cho rằng hàng vỡ trong lúc GHN vận chuyển, gửi ảnh đóng gói, bàn giao, biên bản hoặc video. Manager sẽ đối chiếu bằng chứng của cả hai bên; Shop chưa được tự quy lỗi cho GHN.</p>
    <p className="text-xs text-[#7D715E]">Vận đơn GHN gốc: {request.order.outboundGhnTrackingNumber || 'Chưa có; Manager cần xác minh trước khi kết luận lỗi GHN'}.</p>
    <textarea required minLength={20} maxLength={2000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)}
      placeholder="Mô tả lúc đóng gói, bàn giao và căn cứ cho rằng lỗi thuộc bên vận chuyển" className={field} />
    <label className="block text-sm font-semibold">Ảnh hoặc video bằng chứng (1–5 tệp)
      <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple
        onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} className={`${field} font-normal`} />
    </label>
    {!!files.length && <p className="text-xs text-[#7D715E]">Đã chọn: {files.map((file) => file.name).join(', ')}</p>}
    <button type="submit" disabled={uploading || action.isPending || details.trim().length < 20 || files.length === 0} className={primary}>
      {uploading || action.isPending ? 'Đang gửi hồ sơ…' : request.status === 'DISPUTED' ? 'Bổ sung bằng chứng cho Manager' : 'Chuyển bằng chứng cho Manager'}
    </button>
    <ErrorText error={error || action.error} />
  </form>;
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
  return <form className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4"
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
  </form>;
}

type GhnClaimAction = 'SUBMIT' | 'REQUEST_MORE' | 'ACCEPT' | 'REJECT' | 'APPEAL' | 'PAID';
function AdminGhnClaim({ request }: { request: ReturnDetail }) {
  const claim = request.ghnClaim;
  const [action, setAction] = useState<GhnClaimAction>('SUBMIT');
  const [reference, setReference] = useState(claim?.ghnReference || '');
  const [claimedAmount, setClaimedAmount] = useState(claim?.claimedAmount?.toString() || '');
  const [approvedAmount, setApprovedAmount] = useState(claim?.approvedAmount?.toString() || '');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const update = useReturnAction(request.id, returnService.updateGhnClaim);
  if (!claim) return null;
  const options: GhnClaimAction[] = claim.status === 'DRAFT' || claim.status === 'NEEDS_MORE_EVIDENCE'
    ? ['SUBMIT'] : claim.status === 'SUBMITTED' ? ['REQUEST_MORE', 'ACCEPT', 'REJECT']
      : claim.status === 'ACCEPTED' ? ['PAID'] : claim.status === 'REJECTED' ? ['APPEAL'] : [];
  const selected = options.includes(action) ? action : options[0];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const uploaded = proofFile ? (await uploadService.uploadMedia(proofFile, `scanms/returns/${request.id}/ghn-claim`)).url : undefined;
      await update.mutateAsync({
        action: selected, ghnReference: reference.trim() || undefined,
        claimedAmount: claimedAmount ? Number(claimedAmount) : undefined,
        approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
        notes: notes.trim(), proofUrl: uploaded || proofUrl.trim() || undefined,
      });
      setNotes(''); setProofFile(null); setProofUrl('');
    } catch (cause) { setError(cause); }
    finally { setUploading(false); }
  }
  return <section className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
    <h2 className="font-bold">Đối soát bồi hoàn với GHN</h2>
    <p className="text-sm">Trạng thái: <strong>{ghnClaimLabels[claim.status]}</strong> · Vận đơn gốc: <strong>{claim.originalTrackingNumber}</strong></p>
    <p className="text-sm text-[#7D715E]">Hồ sơ này độc lập với việc hoàn tiền/đổi hàng cho khách. Các bước phản hồi và thanh toán GHN được Manager ghi nhận thủ công theo chứng từ.</p>
    {claim.replacementTrackingNumber && <p className="text-sm">Vận đơn hàng đổi: {claim.replacementTrackingNumber}</p>}
    {claim.ghnReference && <p className="text-sm">Mã yêu cầu GHN: {claim.ghnReference}</p>}
    {claim.claimedAmount && <p className="text-sm">Yêu cầu: {money(claim.claimedAmount)} · Chấp thuận: {claim.approvedAmount ? money(claim.approvedAmount) : 'chưa có'}</p>}
    {claim.notes && <p className="whitespace-pre-wrap text-sm">Ghi chú gần nhất: {claim.notes}</p>}
    <div className="flex flex-wrap gap-3">{claim.evidenceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#8A6736] underline">Bằng chứng {index + 1}</a>)}</div>
    {options.length > 0 && <form onSubmit={(event) => void submit(event)} className="space-y-3 border-t border-[#EEDFC6] pt-3">
      <label className="block text-sm">Bước đối soát
        <select value={selected} onChange={(event) => setAction(event.target.value as GhnClaimAction)} className={field}>
          {options.map((value) => <option key={value} value={value}>{({ SUBMIT: 'Ghi nhận đã gửi GHN', REQUEST_MORE: 'GHN yêu cầu bổ sung', ACCEPT: 'GHN chấp thuận', REJECT: 'GHN từ chối', APPEAL: 'Kháng nghị với GHN', PAID: 'Ghi nhận GHN đã thanh toán' } as Record<GhnClaimAction, string>)[value]}</option>)}
        </select>
      </label>
      {selected === 'SUBMIT' && <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Mã yêu cầu GHN<input required minLength={3} maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} className={field} /></label>
        <label className="text-sm">Số tiền đề nghị bồi hoàn (₫)<input required type="number" min="1" max="1000000000" value={claimedAmount} onChange={(event) => setClaimedAmount(event.target.value)} className={field} /></label>
      </div>}
      {selected === 'APPEAL' && <label className="block text-sm">Mã yêu cầu GHN mới<input required minLength={3} maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} className={field} /></label>}
      {(selected === 'ACCEPT' || selected === 'PAID') && <label className="block text-sm">Số tiền GHN chấp thuận (₫)
        <input required type="number" min="1" max={claim.claimedAmount || 1000000000} value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)} className={field} />
      </label>}
      <textarea required minLength={10} maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ghi rõ nội dung liên hệ, phản hồi hoặc đối soát GHN" className={field} />
      <label className="block text-sm">Chứng từ GHN {selected === 'SUBMIT' && claim.status === 'DRAFT' ? '(nếu cần bổ sung)' : '(bắt buộc)'}
        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className={field} />
      </label>
      <input type="url" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="Hoặc dán URL HTTPS của chứng từ GHN" className={field} />
      <button type="submit" disabled={uploading || update.isPending || notes.trim().length < 10 ||
        ((selected !== 'SUBMIT' || claim.status === 'NEEDS_MORE_EVIDENCE') && !proofFile && !proofUrl.trim())} className={primary}>
        {uploading || update.isPending ? 'Đang lưu đối soát…' : 'Lưu bước đối soát GHN'}
      </button>
      <ErrorText error={error || update.error} />
    </form>}
  </section>;
}

function AdminRefundRetry({ request }: { request: ReturnDetail }) {
  const retry = useReturnAction(request.id, returnService.retryPendingRefund);
  if (!['REFUND_PENDING', 'REFUND_FAILED'].includes(request.status) ||
      !request.refund || !['PENDING', 'FAILED'].includes(request.refund.status)) return null;
  return <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
    <h2 className="font-bold">Hoàn tiền đang chờ xử lý</h2>
    <p className="mt-2 text-[#7D715E]">Số tiền {money(request.refund.amount)} chưa vào ví khách. Thu nhập KOL chỉ bị thu hồi sau khi hoàn tiền thành công.</p>
    <button type="button" disabled={retry.isPending}
      onClick={() => void retry.mutateAsync(undefined).catch(() => undefined)} className={`${primary} mt-3`}>
      {retry.isPending ? 'Đang xử lý…' : 'Thử hoàn tiền vào ví khách'}
    </button>
    <ErrorText error={retry.error} />
  </section>;
}

export default function ReturnDetailPage({ mode }: { mode: 'customer' | 'shop' | 'admin' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useReturnDetail(id);
  const user = authService.getCurrentUser();
  const back = mode === 'shop' ? '/merchant/orders' : mode === 'admin' ? '/admin/return-disputes' : '/customer/orders';

  if (!user) return <div className="min-h-screen bg-[#FAF8F5] p-6"><p>Bạn cần đăng nhập để xem hồ sơ.</p>
    <button onClick={() => navigate('/login')} className={`${primary} mt-3`}>Đăng nhập</button></div>;

  return <>
    {mode === 'customer' && <MarketplaceHeader showShortcuts={false} onOpenTracking={() => navigate('/tracking')} onOpenLive={() => navigate('/marketplace#live')} />}
    <main className={`min-h-screen bg-[#FAF8F5] px-4 py-6 text-[#1A1612] sm:px-6 ${mode === 'customer' ? 'grid lg:grid-cols-[250px_minmax(0,1fr)] items-start gap-5 max-w-[1248px] mx-auto' : ''}`}>
      {mode === 'customer' && <aside className="min-w-0 hidden lg:block"><Sidebar currentUser={user} onLogout={() => { authService.logout(); navigate('/login'); }} /></aside>}
      <div className={`mx-auto max-w-5xl space-y-4 ${mode === 'customer' ? 'min-w-0 w-full max-w-none border border-[#EAE4D7] rounded-[5px] bg-white overflow-hidden [&>div]:p-4 sm:[&>div]:p-[22px] [&>section]:p-4 sm:[&>section]:p-[22px] [&>div]:border-b [&>div]:border-[#EAE4D7] [&>section]:border-b [&>section]:border-[#EAE4D7] [&>*:last-child]:border-b-0 [&_button]:border [&_button]:border-[#EEDFC6] [&_button]:bg-white [&_button]:text-[#795A2D] [&_button]:rounded-[5px] hover:[&_button]:bg-[#FBF5EB]' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={back} state={mode === 'customer' ? { returnedOrderCode: detail.data?.order.externalOrderSn, clearOrderSearch: true } : undefined} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7D715E] hover:text-[#B88E4F]">
            <ArrowLeft className="h-4 w-4" /> Quay lại đơn hàng
          </Link>
          {mode === 'customer' && detail.data && <div className="flex flex-wrap items-center justify-start sm:justify-end gap-3 text-xs sm:text-sm [&_strong]:font-medium [&>*:last-child]:border-l [&>*:last-child]:border-[#EAE4D7] [&>*:last-child]:pl-3 [&>*:last-child]:text-[#B88E4F] [&>*:last-child]:font-semibold"><span>Mã đơn hàng: <strong>{detail.data.order.externalOrderSn}</strong></span><span>{returnStatusLabel(detail.data.status)}</span></div>}
          <button type="button" onClick={() => void detail.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Tải lại
          </button>
        </div>
        {detail.isLoading && <p role="status">Đang tải hồ sơ đổi trả…</p>}
        {detail.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[#DC2626]">
          {detail.error instanceof Error ? detail.error.message : 'Không thể tải hồ sơ.'}
        </div>}
        {detail.data && <>
          {mode !== 'customer' && <header className="rounded-2xl border border-[#EAE4D7] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B88E4F]">SCANMS · Đổi trả / Hoàn tiền</p>
            <h1 className="mt-1 text-xl font-black">Đơn #{detail.data.order.externalOrderSn}</h1>
            <p className="mt-1 text-sm text-[#7D715E]">Gian hàng: {detail.data.order.storeName}</p>
          </header>}
          <ReturnTimeline request={detail.data} />
{mode !== 'customer' && detail.data.partnerIncome && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4" aria-label="Thu nhập đối tác của đơn hàng">
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
            <h2 className="font-semibold">Phản hồi của Shop</h2>
            {(() => {
              const event = [...detail.data.events].reverse().find(event => ['REQUESTED_TO_SHOP_APPROVED', 'REQUESTED_TO_SHOP_REJECTED'].includes(event.type));
              return event && <time dateTime={event.createdAt} className="mt-1 block text-xs text-[#7D715E]">Phản hồi lúc {new Date(event.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>;
            })()}
            <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{detail.data.shopResponse}</p>
            {mode === 'customer' && ['SHOP_REJECTED', 'INSPECTION_REJECTED'].includes(detail.data.status) && <p className="mt-3 rounded-lg bg-[#FBF5EB] p-3 text-xs leading-relaxed text-[#7D715E]">
              Đây là phản hồi của Shop, chưa phải kết quả phân xử của SCANMS. Nếu không đồng ý, bạn có thể yêu cầu SCANMS xem xét hồ sơ và bằng chứng.
            </p>}
          </section>}
          {mode !== 'customer' && detail.data.dispute?.resolutionNotes && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
            <h2 className="font-bold">Quyết định của System Manager</h2>
            <p className="mt-2 whitespace-pre-wrap">{detail.data.dispute.resolutionNotes}</p>
          </section>}
          {mode !== 'customer' && detail.data.refund && <section role="status" className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
            <h2 className="font-bold">Khoản hoàn cho khách: {money(detail.data.refund.amount)}</h2>
            <p className="mt-2">{detail.data.refund.status === 'SUCCEEDED'
              ? 'Đã hoàn vào ví khách thành công. Shop không hoàn thêm lần nữa.'
              : 'Chưa hoàn thành. System Manager cần đối soát hoặc thử hoàn lại; Shop không tạo khoản hoàn thứ hai.'}</p>
            {detail.data.refund.status === 'SUCCEEDED' && detail.data.status === 'AWAITING_CUSTOMER_CONFIRMATION' &&
              <p className="mt-1 text-[#7D715E]">Khách cần mở hồ sơ đổi trả và xác nhận đã nhận kết quả để đóng đơn.</p>}
          </section>}
          <section className="return-evidence-section rounded-2xl border border-[#EAE4D7] bg-white p-4">
            <h2 className="font-bold">Sản phẩm và bằng chứng</h2>
            <ReturnProducts request={detail.data} customer={mode === 'customer'} />
             <div className="my-4.5 text-sm leading-relaxed [&_p+p]:mt-1.25"><p><strong>Lý do đổi trả:</strong> {returnReasonLabel(detail.data.reason)}</p>
             {detail.data.preferredResolution && <p><strong>Khách mong muốn:</strong> {detail.data.preferredResolution === 'REFUND' ? 'Hoàn tiền vào Ví SCANMS' : 'Đổi sản phẩm mới'}</p>}
            {detail.data.details && <p className="whitespace-pre-wrap text-[#7D715E]">{detail.data.details}</p>}</div>
            <div className="flex flex-wrap items-start gap-3.5">
              {detail.data.imageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"
                className="grid gap-2 w-[132px] text-[#795A2D] text-xs no-underline [&_img]:w-[132px] [&_img]:h-[110px] [&_img]:object-contain [&_img]:border [&_img]:border-[#EAE4D7] [&_img]:rounded-md [&_img]:bg-[#FAF8F5]"><img src={getSafeProductImageUrl(url)} onError={handleProductImageError} alt={`Ảnh bằng chứng ${index + 1}`} loading="lazy" /><span>Ảnh bằng chứng {index + 1}</span></a>)}
              {detail.data.unboxingVideoUrl && <div className="w-[min(100%,280px)] grid gap-2 text-xs [&_video]:block [&_video]:w-full [&_video]:h-[158px] [&_video]:border [&_video]:border-[#EAE4D7] [&_video]:rounded-md [&_video]:bg-[#FAF8F5] [&_a]:text-[#795A2D]"><video src={detail.data.unboxingVideoUrl} controls preload="metadata" aria-label="Video mở hộp" /><a href={detail.data.unboxingVideoUrl} target="_blank" rel="noreferrer">Mở video trong tab mới</a></div>}
              {!detail.data.imageUrls.length && !detail.data.unboxingVideoUrl && <p className="text-sm text-[#7D715E]">Chưa có bằng chứng đính kèm.</p>}
            </div>
          </section>
          {detail.data.events.filter((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED').map((event) => <section key={event.id}
            className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
            <h2 className="font-bold">Bằng chứng Shop gửi Manager</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{event.data?.details}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {event.data?.evidenceUrls?.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-[#8A6736] underline">Tệp bằng chứng {index + 1}</a>)}
            </div>
          </section>)}
          {mode === 'shop' ? <><ShopEscalation request={detail.data} /><ShopActions request={detail.data} /></> : mode === 'customer' ? <CustomerActions request={detail.data} /> :
            <><AdminRefundRetry request={detail.data} /><AdminGhnClaim request={detail.data} /><AdminActions request={detail.data} /></>}
        </>}
      </div>
    </main>
  </>;
}
