import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type PickupBookingInput, type ReturnDetail } from '../../services/return.service';
import { carrierStatusLabel } from '../../utils/return-status.utils';

const inputClass = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2.5 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] disabled:bg-[#F3EFE6]';
const buttonClass = 'min-h-11 max-w-full rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]';
const addressFields = [
  ['name', 'Người nhận'], ['phone', 'Số điện thoại'], ['address', 'Địa chỉ nhận hàng'],
  ['provinceName', 'Tỉnh / Thành phố'], ['wardName', 'Phường / Xã'], ['districtName', 'Quận / Huyện (nếu có)'],
] as const;
const packageFields = [['weight', 'Khối lượng (g)'], ['length', 'Dài (cm)'], ['width', 'Rộng (cm)'], ['height', 'Cao (cm)']] as const;

function ActionError({ error }: { error: unknown }) {
  return error ? <p role="alert" className="text-sm leading-relaxed text-[#DC2626] [overflow-wrap:anywhere]">{error instanceof Error ? error.message : 'Chưa xử lý được vận đơn. Vui lòng thử lại.'}</p> : null;
}

export function ExchangeShipmentPanel({ request }: { request: ReturnDetail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PickupBookingInput>(() => request.exchangeBooking?.recipient || {
    name: request.exchangeRecipient?.name || request.order.customerName || '',
    phone: request.exchangeRecipient?.phone || request.order.customerPhone || '',
    address: request.exchangeRecipient?.address || request.order.shippingAddress || '',
    provinceName: request.exchangeRecipient?.provinceName || '', wardName: request.exchangeRecipient?.wardName || '',
    districtName: request.exchangeRecipient?.districtName || '',
    weight: request.exchangePackage?.weight || 0, length: request.exchangePackage?.length || 0,
    width: request.exchangePackage?.width || 0, height: request.exchangePackage?.height || 0,
  });
  const [manual, setManual] = useState({ carrierName: '', trackingNumber: '' });
  const booking = useReturnAction(request.id, returnService.bookExchangeShipment);
  const external = useReturnAction(request.id, returnService.submitExchangeShipment);
  const sync = useReturnAction(request.id, returnService.syncExchangeShipment);
  const simulation = useReturnAction(request.id, returnService.simulateExchangeShipment);
  const locked = Boolean(request.exchangeBooking?.pending);
  const busy = booking.isPending || external.isPending;
  const update = (key: keyof PickupBookingInput, value: string | number) => setForm(current => ({ ...current, [key]: value }));
  const shipment = request.exchangeShipment;
  const sender = request.exchangeBooking?.warehouse || request.returnWarehouse;
  useEffect(() => {
    if (request.exchangeBooking?.pending && request.exchangeBooking.recipient) setForm(request.exchangeBooking.recipient);
  }, [request.exchangeBooking]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await booking.mutateAsync({ ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(),
        provinceName: form.provinceName.trim(), wardName: form.wardName.trim(), districtName: form.districtName?.trim() || undefined });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['return-detail', request.id] });
    }
  }

  if (shipment) return <section className="min-w-0 space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5" aria-label="Vận đơn giao hàng đổi">
    <h3 className="font-bold text-[#1A1612]">Vận đơn giao hàng đổi</h3>
    <p className="break-words text-sm">{shipment.carrierName} · <strong>{shipment.trackingNumber}</strong></p>
    <p className="text-sm text-[#7D715E]">{carrierStatusLabel(shipment.providerStatus)} · Khách không thanh toán lại tiền sản phẩm.</p>
    <p className="text-sm text-[#7D715E]">Cước: {shipment.feeAmount == null ? 'Chưa có phí xác nhận từ hãng vận chuyển' : `${shipment.feeAmount.toLocaleString('vi-VN')} ₫`} · Shop thanh toán cho hãng vận chuyển.</p>
    {shipment.provider === 'MOCK' && <p className="text-xs text-[#7D715E]">Vận đơn demo; không có chuyến giao hay khoản phí thật.</p>}
    {shipment.provider === 'GHN_STAGING' && <p className="text-xs text-[#7D715E]">GHN Staging: vận đơn thử tích hợp, không điều phối shipper thật.</p>}
    <div className="flex flex-wrap gap-2">
      {shipment.provider === 'GHN_STAGING' && <button type="button" className={buttonClass} disabled={sync.isPending}
        onClick={() => void sync.mutateAsync(undefined).catch(() => undefined)}>{sync.isPending ? 'Đang đồng bộ…' : 'Đồng bộ trạng thái GHN'}</button>}
      {request.pickupSimulationEnabled && shipment.provider && shipment.providerStatus !== 'delivered' && request.status === 'EXCHANGE_SHIPPED' &&
        <button type="button" className={buttonClass} disabled={simulation.isPending}
          onClick={() => void simulation.mutateAsync({ status: shipment.pickedUpAt ? 'delivered' : 'picked' }).catch(() => undefined)}>
          {simulation.isPending ? 'Đang mô phỏng…' : shipment.pickedUpAt ? 'Mô phỏng giao hàng đổi thành công' : 'Mô phỏng shipper lấy hàng đổi'}
        </button>}
    </div>
    {shipment.providerStatus === 'delivered' && !shipment.receivedAt && <p className="text-sm text-[#7D715E]">Đã báo giao thành công. Chờ khách kiểm tra và xác nhận nhận hàng đổi trong đơn gốc.</p>}
    <ActionError error={sync.error || simulation.error} />
  </section>;

  if (request.status !== 'EXCHANGE_PENDING') return null;
  return <section className="min-w-0 space-y-4 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5" aria-label="Tạo vận đơn hàng thay thế">
    <div>
      <h3 className="font-bold text-[#1A1612]">Tạo vận đơn giao sản phẩm thay thế</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#7D715E]">Gửi đúng sản phẩm và số lượng đã duyệt trong hồ sơ. Khách không cần đặt đơn mới. Hệ thống kiểm tra tồn kho, không thu lại tiền hàng và không tính thêm thù lao KOL.</p>
      <p className="mt-2 text-xs leading-relaxed text-[#7D715E]">Shop thanh toán cước cho GHN; trách nhiệm chi phí cuối cùng theo kết luận xử lý. Yêu cầu bồi hoàn GHN được theo dõi riêng.</p>
      {sender ? <p className="mt-2 break-words text-xs text-[#7D715E]">Kho gửi: {sender.name} · {sender.address}</p>
        : <p role="alert" className="mt-2 text-sm text-[#DC2626]">Shop cần lưu kho nhận/gửi hàng ở phần trên trước khi tạo vận đơn.</p>}
      {request.pickupProviderMode === 'mock' && <p className="mt-2 text-xs text-[#7D715E]">Chế độ demo: chỉ tạo vận đơn mô phỏng, không có shipper thật.</p>}
      {request.pickupProviderMode === 'staging' && <p className="mt-2 text-xs text-[#7D715E]">GHN Staging: chỉ thử tích hợp, không điều phối giao hàng thật.</p>}
      {request.pickupProviderMode === 'disabled' && <p role="alert" className="mt-2 text-sm text-[#DC2626]">Dịch vụ tạo vận đơn chưa được cấu hình.</p>}
    </div>
    {locked && <p role="status" className="rounded-xl border border-[#EEDFC6] bg-white p-3 text-sm leading-relaxed text-[#7D715E]">Đang đối chiếu lần đặt trước. Hàng đã được giữ kho; giữ nguyên thông tin và thử lại để lấy đúng vận đơn, không trừ kho lần nữa.</p>}
    <form onSubmit={event => void submit(event)} className="min-w-0 space-y-4">
      <fieldset disabled={busy || locked} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Kiểm tra địa chỉ nhận hàng thay thế</legend>
        {addressFields.map(([key, label]) => <label key={key} className={`min-w-0 text-sm ${key === 'address' ? 'sm:col-span-2' : ''}`}>{label}
          <input required={key !== 'districtName'} minLength={key === 'address' ? 10 : key === 'phone' ? 9 : 2}
            maxLength={key === 'address' ? 500 : key === 'phone' ? 20 : key === 'name' ? 150 : 100}
            type={key === 'phone' ? 'tel' : 'text'} pattern={key === 'phone' ? '\\+?[0-9]{9,15}' : undefined}
            value={form[key] || ''} onChange={event => update(key, event.target.value)} className={inputClass} />
        </label>)}
      </fieldset>
      <fieldset disabled={busy || locked} className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold">Kiện hàng thực tế</legend>
        {packageFields.map(([key, label]) => <label key={key} className="min-w-0 text-sm">{label}
          <input required type="number" min={1} max={key === 'weight' ? 19999 : 150} step={1} value={form[key] || ''}
            onChange={event => update(key, Number(event.target.value))} className={inputClass} />
        </label>)}
      </fieldset>
      <ActionError error={booking.error} />
      <button type="submit" disabled={busy || !sender || request.pickupProviderMode === 'disabled'} className={`${buttonClass} w-full sm:w-auto`}>
        {booking.isPending ? 'Đang tạo vận đơn…' : locked ? 'Đối chiếu / Thử lại vận đơn hàng đổi' : 'Tạo vận đơn giao hàng đổi'}
      </button>
    </form>
    {!locked && <details className="border-t border-[#EEDFC6] pt-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm text-[#7D715E]">Đã có vận đơn tạo bên ngoài? Ghi nhận tại đây</summary>
      <form className="mt-3 space-y-3" onSubmit={event => {
        event.preventDefault();
        void external.mutateAsync({ carrierName: manual.carrierName.trim(), trackingNumber: manual.trackingNumber.trim() }).catch(() => undefined);
      }}>
        <label className="block text-sm">Đơn vị vận chuyển<input required minLength={2} maxLength={100} disabled={busy} value={manual.carrierName} onChange={event => setManual(current => ({ ...current, carrierName: event.target.value }))} className={inputClass} /></label>
        <label className="block text-sm">Mã vận đơn đã tạo<input required minLength={5} maxLength={100} disabled={busy} value={manual.trackingNumber} onChange={event => setManual(current => ({ ...current, trackingNumber: event.target.value }))} className={inputClass} /></label>
        <button disabled={busy} className={buttonClass}>Ghi nhận vận đơn có sẵn</button>
        <ActionError error={external.error} />
      </form>
    </details>}
  </section>;
}
