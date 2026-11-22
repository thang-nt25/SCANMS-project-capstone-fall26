import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Info, Pencil, Truck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { VietnamAddressSelects } from './VietnamAddressSelects';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { customerService, type CustomerAddress } from '../../services/customer.service';
import { returnService, type PickupBookingInput, type ReturnAddress, type ReturnDetail } from '../../services/return.service';
import { ReturnPickupShipmentCard } from './ReturnPickupShipmentCard';

const street = (value: ReturnAddress) => value.address.split(',').map(part => part.trim()).filter(part => ![value.wardName, value.districtName, value.provinceName].some(region => region?.trim().toLowerCase() === part.toLowerCase())).join(', ');
const fullAddress = (value: ReturnAddress) => [street(value), value.wardName, value.districtName, value.provinceName].filter(Boolean).join(', ');
const fromSaved = (value: CustomerAddress): ReturnAddress => ({ name: value.fullName, phone: value.phoneNumber, address: value.detailAddress, provinceName: value.provinceName, districtName: value.districtName, wardName: value.wardName });
const complete = (value: ReturnAddress) => Boolean(value.name.trim() && value.phone.trim() && value.address.trim() && value.provinceName.trim() && value.wardName.trim());
const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' });

export function PickupBookingForm({ request }: { request: ReturnDetail }) {
  const initial = request.pickupContact || { name: request.order.customerName || '', phone: request.order.customerPhone || '', address: request.order.shippingAddress || '', wardName: '', provinceName: '', districtName: '' };
  const [address, setAddress] = useState<ReturnAddress>(initial);
  const [draft, setDraft] = useState<ReturnAddress>(initial);
  const [parcel, setParcel] = useState({ weight: 0, length: 0, width: 0, height: 0 });
  const [editing, setEditing] = useState(false);
  const [draftValid, setDraftValid] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [booked, setBooked] = useState<ReturnDetail | null>(null);
  const [now, setNow] = useState(Date.now());
  const initialized = useRef(Boolean(request.pickupContact));
  const saving = useRef(false);
  const addresses = useQuery({ queryKey: ['customer-addresses'], queryFn: () => customerService.getAddresses(), staleTime: 60000, enabled: request.status === 'SHOP_APPROVED' });
  const booking = useReturnAction(request.id, returnService.bookPickup);
  const editorId = `pickup-address-${request.id}`;
  useEffect(() => {
    if (initialized.current || !addresses.data) return;
    const saved = addresses.data.find(value => value.isDefault) || addresses.data[0];
    if (saved) setAddress(fromSaved(saved));
    initialized.current = true;
  }, [addresses.data]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const overdue = Boolean(request.shipByAt && Date.parse(request.shipByAt) <= now);
  const unavailable = request.pickupProviderMode === 'disabled';
  const waiting = !request.returnWarehouse || !request.shipByAt;
  const confirmed = request.customerShipment ? request : booked;
  const edit = () => { initialized.current = true; setDraft({ ...address, address: street(address) }); setDraftValid(false); setEditorVersion(value => value + 1); setEditing(true); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || confirmed || !complete(address) || overdue || unavailable || waiting || addresses.isPending) return;
    saving.current = true;
    try {
      const value: PickupBookingInput = { ...parcel, name: address.name.trim(), phone: address.phone.trim(), address: fullAddress(address), provinceName: address.provinceName.trim(), wardName: address.wardName.trim(), districtName: address.districtName?.trim() || undefined };
      const result = await booking.mutateAsync(value) as ReturnDetail;
      if (result?.customerShipment) setBooked(result);
    } catch { /* Preserve the address and parcel for retry. */ }
    finally { saving.current = false; }
  }
  if (confirmed?.customerShipment) return <ReturnPickupShipmentCard request={confirmed} />;
  return <section className="pickup-card" aria-label={confirmed ? 'Đã đặt lấy hàng' : 'Đặt lấy hàng trả'}>
    <header className="pickup-header"><div className="pickup-heading"><h3><Truck size={19} />Đặt lấy hàng trả</h3></div>
      {!confirmed && request.shipByAt && <span className={overdue ? 'pickup-overdue' : ''}>Hạn đặt: <time dateTime={request.shipByAt}>{date(request.shipByAt)}</time></span>}
      {!confirmed && ['mock', 'staging'].includes(request.pickupProviderMode || '') && <span className="pickup-test-badge">Vận đơn thử nghiệm</span>}
    </header>
    <form onSubmit={event => void submit(event)}>
      <div className="pickup-columns">
        <section className="pickup-address"><h4>Địa chỉ lấy hàng</h4>
          {addresses.isPending ? <p role="status" className="pickup-muted">Đang tải địa chỉ đã lưu…</p> : <>
            <p className="pickup-contact">{address.name || 'Chưa có người gửi'} · {address.phone || 'Chưa có số điện thoại'}</p>
            <p className="pickup-address-text">{fullAddress(address) || 'Chưa có địa chỉ lấy hàng'}</p>
            <button type="button" className="pickup-secondary" onClick={edit} disabled={booking.isPending}><Pencil size={14} />Chỉnh sửa địa chỉ</button>
            {!complete(address) && <p className="pickup-note">Bổ sung địa phương trong Chỉnh sửa địa chỉ.</p>}
          </>}
          {addresses.isError && <p className="pickup-note">Chưa tải được sổ địa chỉ. <button type="button" onClick={() => void addresses.refetch()}>Thử lại</button></p>}
        </section>
        <fieldset className="pickup-parcel" disabled={booking.isPending}><legend>Kiện hàng</legend>
          <label>Khối lượng (g)<input required type="number" min={1} max={19999} step={1} value={parcel.weight || ''} onChange={event => setParcel(current => ({ ...current, weight: Number(event.target.value) }))} className="pickup-input" /></label>
          <p className="pickup-dimensions-label">Dài × Rộng × Cao (cm)</p>
          <div className="pickup-dimensions">{(['length', 'width', 'height'] as const).map((key, index) => <label key={key}><span className="sr-only">{['Dài', 'Rộng', 'Cao'][index]} (cm)</span><input required type="number" min={1} max={200} step={1} aria-label={`${['Dài', 'Rộng', 'Cao'][index]} (cm)`} value={parcel[key] || ''} onChange={event => setParcel(current => ({ ...current, [key]: Number(event.target.value) }))} className="pickup-input" /></label>)}</div>
          <p className="pickup-note">Đo sau khi đóng gói.</p>
        </fieldset>
      </div>
      {(unavailable || waiting || overdue) && <p role="status" className="pickup-notice"><Info size={16} />{overdue ? 'Đã quá hạn đặt lấy hàng.' : waiting ? 'Chờ Shop bổ sung kho nhận hàng và hạn đặt.' : 'Chưa thể đặt lấy hàng lúc này.'} <Link to="/chat">Liên hệ hỗ trợ</Link></p>}
      {booking.error && <p role="alert" className="pickup-error">{booking.error instanceof Error ? booking.error.message : 'Không đặt được lấy hàng. Vui lòng thử lại.'}</p>}
      <footer className="pickup-footer"><div className="pickup-destination"><span>Gửi về: {request.returnWarehouse ? `Kho Shop tại ${request.returnWarehouse.provinceName}` : 'Chờ Shop cập nhật'}</span>{request.returnWarehouse && <div className="pickup-warehouse"><strong>{request.returnWarehouse.name} · {request.returnWarehouse.phone}</strong><p>{fullAddress(request.returnWarehouse)}</p></div>}</div>
        <button type="submit" disabled={booking.isPending || !complete(address) || overdue || unavailable || waiting || addresses.isPending} className="pickup-primary">{booking.isPending ? 'Đang đặt…' : 'Xác nhận đặt lấy hàng'}</button>
      </footer>
    </form>
    {editing && createPortal(<Modal isOpen title="Địa chỉ lấy hàng" stickyHeader maxWidth="2xl" className="max-w-[640px]" onClose={() => setEditing(false)}
      footer={<div className="flex justify-end gap-2"><button type="button" className="pickup-secondary" onClick={() => setEditing(false)}>Hủy</button><button form={editorId} type="submit" disabled={!draftValid} className="pickup-primary">Dùng địa chỉ này</button></div>}>
      <form id={editorId} onSubmit={event => { event.preventDefault(); if (!draftValid) return; setAddress({ ...draft, name: draft.name.trim(), phone: draft.phone.trim(), address: street(draft) }); setEditing(false); }} className="grid min-w-0 gap-4 sm:grid-cols-2">
        {Boolean(addresses.data?.length) && <label className="text-sm sm:col-span-2">Địa chỉ đã lưu<select className="pickup-input" defaultValue="" onChange={event => { const saved = addresses.data?.find(value => value.id === event.target.value); if (saved) { setDraft(fromSaved(saved)); setDraftValid(false); setEditorVersion(value => value + 1); } }}><option value="" disabled>Chọn địa chỉ trong tài khoản</option>{addresses.data?.map(value => <option key={value.id} value={value.id}>{value.fullName} · {value.detailAddress}{value.isDefault ? ' · Mặc định' : ''}</option>)}</select></label>}
        <label className="text-sm">Người gửi<input className="pickup-input" required minLength={2} maxLength={150} autoComplete="name" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
        <label className="text-sm">Số điện thoại<input className="pickup-input" required type="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} /></label>
        <label className="text-sm sm:col-span-2">Số nhà, tên đường<input className="pickup-input" required minLength={2} maxLength={350} autoComplete="street-address" value={draft.address} onChange={event => setDraft(current => ({ ...current, address: event.target.value }))} /></label>
        <VietnamAddressSelects key={editorVersion} value={draft} onChange={value => setDraft(current => ({ ...current, ...value }))} onValidityChange={setDraftValid} />
      </form>
    </Modal>, document.querySelector('dialog[open]') || document.body)}
  </section>;
}
