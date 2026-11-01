import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { returnService, type ReturnAddress, type ReturnDetail } from '../../services/return.service';
import { useReturnAction, useReturnDetail } from '../../hooks/useReturnDetail';
import { ReturnTimeline } from '../../components/returns/ReturnTimeline';
import { PickupBookingForm } from '../../components/returns/PickupBookingForm';
import { DisputeModal } from '../../components/returns/DisputeModal';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { carrierStatusLabel } from '@/utils/return-status.utils';

const field = 'mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm outline-none focus:border-[#C59B58]';
const liabilityLabels: Record<string, string> = {
  LOGISTICS_FAULT: 'GHN / vận chuyển',
  SHOP_FAULT: 'Shop / hàng hóa',
  CUSTOMER_REASON: 'Khách đổi ý',
};
const primary = 'rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#B88E4F] disabled:opacity-50';
const money = (amount: number | string) => `${Number(amount).toLocaleString('vi-VN')} ₫`;

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p role="alert" className="mt-2 text-sm text-[#DC2626]">
    {error instanceof Error ? error.message : 'Thao tác không thành công. Vui lòng thử lại.'}
  </p>;
}

function CustomerActions({ request }: { request: ReturnDetail }) {
  const liabilityEvent = [...request.events].reverse().find((event) => event.type === 'LIABILITY_ASSESSED');
  const [showDispute, setShowDispute] = useState(false);
  const [carrierName, setCarrierName] = useState(request.customerShipment?.carrierName ?? '');
  const [trackingNumber, setTrackingNumber] = useState(request.customerShipment?.trackingNumber ?? '');
  const correction = useReturnAction(request.id, returnService.correctShipment);
  const completion = useReturnAction(request.id, returnService.confirmCompletion);
  const inspectionOverdue = ['RETURN_RECEIVED', 'INSPECTING'].includes(request.status) &&
    Boolean(request.receivedAt) && new Date(request.receivedAt!).getTime() <= Date.now() - 48 * 60 * 60 * 1000;
  const mayDispute = (['SHOP_REJECTED', 'EXPIRED', 'INSPECTION_REJECTED', 'REFUND_FAILED'].includes(request.status) || inspectionOverdue) && !request.dispute;
  const mayComplete = request.status === 'EXCHANGE_SHIPPED' ||
    (request.status === 'AWAITING_CUSTOMER_CONFIRMATION' && request.refund?.status === 'SUCCEEDED');

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
        ? 'Đã xác nhận hoàn tiền thành công'
        : request.refund.status === 'FAILED' ? 'Hoàn tiền gặp lỗi; đang cần xử lý'
          : request.refund.status === 'PROCESSING' ? 'Đang xử lý tại bên thanh toán'
            : 'Chưa chuyển tiền · đang chờ đối soát'}</p>
      {request.refund.failureReason && <p className="mt-1 text-sm text-[#DC2626]">{request.refund.failureReason}</p>}
    </section>}

    {request.exchangeShipment && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Hàng đổi Shop đã gửi</h3>
      <p className="mt-2 text-sm">{request.exchangeShipment.carrierName} · {request.exchangeShipment.trackingNumber}</p>
    </section>}

    {request.dispute && <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
      <h3 className="font-bold">Khiếu nại: {request.dispute.status === 'OPEN' ? 'Đang chờ phân xử' : 'Đã phân xử'}</h3>
      <p className="mt-2 text-sm">{request.dispute.details}</p>
      {request.dispute.resolutionNotes && <p className="mt-2 text-sm">Quyết định: {request.dispute.resolutionNotes}</p>}
    </section>}

    <div className="flex flex-wrap gap-2">
      {mayComplete && <button type="button" disabled={completion.isPending}
        onClick={() => void completion.mutateAsync(undefined).catch(() => undefined)} className={primary}>
        {completion.isPending ? 'Đang xác nhận…' : 'Tôi đã nhận kết quả · Hoàn tất'}
      </button>}
      {mayDispute && <button type="button" onClick={() => setShowDispute(true)}
        className="rounded-xl border border-[#C59B58] px-4 py-2.5 text-sm font-bold text-[#8A6736]">Gửi khiếu nại</button>}
    </div>
    <ErrorText error={completion.error} />
    {showDispute && <DisputeModal returnId={request.id} onClose={() => setShowDispute(false)} />}
  </div>;
}

function ShopActions({ request }: { request: ReturnDetail }) {
  const managerAssessment = [...request.events].reverse().find((event) =>
    event.type === 'LIABILITY_ASSESSED' && event.data?.source === 'SYSTEM_MANAGER_REVIEW');
  const compensationClaim = [...request.events].reverse().find((event) => event.type === 'GHN_COMPENSATION_CLAIM_OPENED');
  const [warehouse, setWarehouse] = useState<ReturnAddress>(request.returnWarehouse || {
    name: request.order.storeName, phone: '', address: '', wardName: '', provinceName: '', districtName: '',
  });
  const [editingWarehouse, setEditingWarehouse] = useState(!request.returnWarehouse);
  const [resolution, setResolution] = useState<'REFUND' | 'EXCHANGE' | 'REJECT'>('REFUND');
  const [liability, setLiability] = useState<'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON'>(
    (managerAssessment?.data?.liability as 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON') || 'SHOP_FAULT');
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
    {compensationClaim && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
      <h3 className="font-bold">Hồ sơ yêu cầu GHN bồi hoàn</h3>
      <p className="mt-1 text-[#7D715E]">Đang chờ đối soát nội bộ với GHN. Vận đơn gốc: {compensationClaim.data?.originalTrackingNumber || 'chưa có mã'}; vận đơn bù: {compensationClaim.data?.replacementTrackingNumber || 'chưa có mã'}.</p>
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

function AdminActions({ request }: { request: ReturnDetail }) {
  const [liability, setLiability] = useState<'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON'>('LOGISTICS_FAULT');
  const [notes, setNotes] = useState('');
  const assessment = useReturnAction(request.id, returnService.assessLiability);
  const mayAssess = ['REQUESTED', 'SHOP_APPROVED', 'PICKUP_BOOKED', 'RETURN_SHIPPED', 'RETURN_RECEIVED', 'INSPECTING'].includes(request.status);
  if (!mayAssess) return <p className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
    Hồ sơ đã qua bước xác định trách nhiệm. Xem kết quả kiểm tra và thu nhập đối tác ở trên.
  </p>;
  return <form className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4"
    onSubmit={(event) => { event.preventDefault(); void assessment.mutateAsync({ liability, notes: notes.trim() }).catch(() => undefined); }}>
    <h2 className="font-bold">System Manager xác định bên chịu trách nhiệm</h2>
    <p className="text-sm text-[#7D715E]">Đối chiếu ảnh, video mở hộp và tình trạng kiện hàng trước khi Shop quyết định đổi hoặc hoàn tiền.</p>
    <select value={liability} onChange={(event) => setLiability(event.target.value as typeof liability)} className={field}>
      <option value="LOGISTICS_FAULT">GHN / vận chuyển</option>
      <option value="SHOP_FAULT">Shop / hàng hóa</option>
      <option value="CUSTOMER_REASON">Khách đổi ý</option>
    </select>
    <textarea required minLength={10} maxLength={2000} rows={3} value={notes}
      onChange={(event) => setNotes(event.target.value)} placeholder="Ghi rõ bằng chứng và căn cứ kết luận"
      className={field} />
    {notes.trim().length < 10 && <p className="text-xs text-[#7D715E]">Nhập ít nhất 10 ký tự để lưu kết luận ({notes.trim().length}/10).</p>}
    <button type="submit" disabled={assessment.isPending || notes.trim().length < 10} className={primary}>
      {assessment.isPending ? 'Đang lưu…' : 'Lưu kết luận trách nhiệm'}
    </button>
    <ErrorText error={assessment.error} />
  </form>;
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
    {mode === 'customer' && <PublicHeader />}
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-6 text-[#1A1612] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={back} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7D715E] hover:text-[#B88E4F]">
            <ArrowLeft className="h-4 w-4" /> Quay lại đơn hàng
          </Link>
          <button type="button" onClick={() => void detail.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Tải lại
          </button>
        </div>
        {detail.isLoading && <p role="status">Đang tải hồ sơ đổi trả…</p>}
        {detail.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[#DC2626]">
          {detail.error instanceof Error ? detail.error.message : 'Không thể tải hồ sơ.'}
        </div>}
        {detail.data && <>
          <header className="rounded-2xl border border-[#EAE4D7] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B88E4F]">SCANMS · Đổi trả / Hoàn tiền</p>
            <h1 className="mt-1 text-xl font-black">Đơn #{detail.data.order.externalOrderSn}</h1>
            <p className="mt-1 text-sm text-[#7D715E]">Gian hàng: {detail.data.order.storeName}</p>
          </header>
          <ReturnTimeline request={detail.data} />
          {mode !== 'customer' && detail.data.partnerIncome && <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4" aria-label="Thu nhập đối tác của đơn hàng">
            <h2 className="font-bold text-[#1A1612]">Thu nhập đối tác của đơn hàng</h2>
            <p className="mt-2 text-xl font-black text-[#8A6736]">{money(detail.data.partnerIncome.amount)}</p>
            <p className="mt-1 text-sm text-[#7D715E]">
              {detail.data.partnerIncome.status === 'REVERSED'
                ? `Đã thu hồi ${money(detail.data.partnerIncome.reversedAmount || 0)} sau khi hoàn tiền thành công; ví KOC còn 0 ₫ từ đơn này.`
                : detail.data.resolution === 'EXCHANGE'
                  ? 'Đổi hàng 1-1: khoản thu nhập của KOC được bảo lưu.'
                  : detail.data.partnerIncome.status === 'PENDING'
                    ? 'Đang tạm giữ trong Escrow, chưa thể rút.'
                    : detail.data.partnerIncome.status === 'AVAILABLE'
                      ? 'Đã giải tỏa vào số dư khả dụng của KOC.'
                      : 'Mức dự kiến theo đơn; hệ thống sẽ ghi ví khi đơn đủ điều kiện.'}
            </p>
          </section>}
          {detail.data.shopResponse && <p className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">
            Phản hồi của Shop: {detail.data.shopResponse}</p>}
          <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
            <h2 className="font-bold">Sản phẩm và bằng chứng</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {detail.data.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#EAE4D7] p-2">
                {item.orderItem.product.imageUrl && <img src={item.orderItem.product.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <span className="text-sm">{item.orderItem.product.title} × {item.quantity}</span>
              </div>)}
            </div>
            <p className="mt-3 text-sm">Lý do: {detail.data.reason}</p>
            {detail.data.details && <p className="mt-1 whitespace-pre-wrap text-sm text-[#7D715E]">{detail.data.details}</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              {detail.data.imageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"
                className="text-sm font-medium text-[#B88E4F] underline">Ảnh bằng chứng {index + 1}</a>)}
              {detail.data.unboxingVideoUrl && <a href={detail.data.unboxingVideoUrl} target="_blank" rel="noreferrer"
                className="text-sm font-medium text-[#B88E4F] underline">Video mở hộp</a>}
            </div>
          </section>
          {mode === 'shop' ? <ShopActions request={detail.data} /> : mode === 'customer' ? <CustomerActions request={detail.data} /> :
            <AdminActions request={detail.data} />}
        </>}
      </div>
    </main>
  </>;
}
