import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Info, Pencil, Truck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { VietnamAddressSelects } from './VietnamAddressSelects';
import { ReturnWarehouseCard } from './ReturnWarehouseCard';
import { ExchangeFreightQuote } from './ExchangeFreightQuote';
import { CaseProductImage, caseProducts } from './ReturnCaseProducts';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type PickupBookingInput, type ReturnAddress, type ReturnDetail } from '../../services/return.service';
import { carrierStatusLabel } from '../../utils/return-status.utils';
import { completeReturnAddress, resolveSavedReturnAddress, returnFullAddress, returnStreet } from '../../utils/return-address';

function ActionError({ error }: { error: unknown }) {
  return error ? <p role="alert" className="exchange-error">{error instanceof Error ? error.message : 'Chưa xử lý được vận đơn. Vui lòng thử lại.'}</p> : null;
}

export function ExchangeShipmentPanel({ request }: { request: ReturnDetail }) {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState(request);
  const [seed] = useState<ReturnAddress>(() => request.exchangeBooking?.recipient || request.exchangeRecipient || {
    name: request.order.customerName || '', phone: request.order.customerPhone || '', address: request.order.shippingAddress || '', provinceName: '', wardName: '', districtName: '',
  });
  const [form, setForm] = useState<PickupBookingInput>(() => ({ ...seed, weight: request.exchangePackage?.weight || 0, length: request.exchangePackage?.length || 0, width: request.exchangePackage?.width || 0, height: request.exchangePackage?.height || 0, ...request.exchangeBooking?.recipient }));
  const [draft, setDraft] = useState<ReturnAddress>(seed);
  const [draftValid, setDraftValid] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const lock = useRef(false);
  const addressEdited = useRef(false);
  const booking = useReturnAction(request.id, returnService.bookExchangeShipment);
  const sync = useReturnAction(request.id, returnService.syncExchangeShipment);
  const simulation = useReturnAction(request.id, returnService.simulateExchangeShipment);
  const locked = Boolean(snapshot.exchangeBooking?.pending);
  const busy = Boolean(working) || booking.isPending || sync.isPending || simulation.isPending;
  const shipment = snapshot.exchangeShipment;
  const sender = snapshot.exchangeDelivery?.warehouse || snapshot.exchangeBooking?.warehouse || snapshot.returnWarehouse;
  const recipient = snapshot.exchangeDelivery?.recipient || form;
  const products = caseProducts(snapshot);
  const formId = `exchange-address-${request.id}`;
  const resolved = useQuery({ queryKey: ['exchange-saved-address', request.id, seed], queryFn: ({ signal }) => resolveSavedReturnAddress(seed, signal), enabled: snapshot.status === 'EXCHANGE_PENDING' && !locked && !shipment && !completeReturnAddress(seed), staleTime: 86400000, retry: 1 });
  useEffect(() => { setSnapshot(request); }, [request]);
  useEffect(() => { if (resolved.data && !addressEdited.current && !locked) setForm(current => ({ ...current, ...resolved.data! })); }, [resolved.data, locked]);
  useEffect(() => { if (request.exchangeBooking?.pending && request.exchangeBooking.recipient) setForm(request.exchangeBooking.recipient); }, [request.exchangeBooking]);

  async function run(kind: string, action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setWorking(kind);
    try {
      const result = await action() as ReturnDetail;
      if (result?.id === request.id && result.status) setSnapshot(result);
    } catch { await queryClient.invalidateQueries({ queryKey: ['return-detail', request.id] }); }
    finally { lock.current = false; setWorking(null); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || shipment || !sender || snapshot.pickupProviderMode === 'disabled' || (!locked && !completeReturnAddress(form))) return;
    const value = locked && snapshot.exchangeBooking?.recipient ? snapshot.exchangeBooking.recipient : {
      ...form, name: form.name.trim(), phone: form.phone.trim(), address: returnFullAddress(form), provinceName: form.provinceName.trim(), wardName: form.wardName.trim(), districtName: form.districtName?.trim() || undefined,
    };
    void run('booking', () => booking.mutateAsync(value));
  }
  const openEditor = () => { setDraft({ ...form, address: returnStreet(form) }); setDraftValid(false); setEditing(true); };

  if (shipment) {
    const delivered = shipment.providerStatus === 'delivered' || Boolean(shipment.receivedAt);
    const maySimulate = snapshot.pickupSimulationEnabled && shipment.provider && shipment.providerStatus !== 'delivered' && snapshot.status === 'EXCHANGE_SHIPPED';
    const status = shipment.receivedAt ? 'Khách đã xác nhận nhận hàng' : shipment.providerStatus === 'ready_to_pick' ? 'Chờ lấy hàng đổi' : shipment.providerStatus ? carrierStatusLabel(shipment.providerStatus, 'customer') : 'Đã tạo vận đơn hàng đổi';
    return <section className="pickup-card exchange-card" aria-label="Vận đơn giao hàng đổi">
      <header className="pickup-header"><h3><Truck size={19} />Giao hàng đổi cho khách</h3><span className="pickup-state" role="status">{status}</span></header>
      <div className="pickup-waybill"><p><strong>{shipment.provider === 'MOCK' && /SCANMS Demo/i.test(shipment.carrierName) ? 'Vận chuyển SCANMS' : shipment.carrierName}</strong> · <code>{shipment.trackingNumber}</code></p><button type="button" className="pickup-copy" onClick={() => { void navigator.clipboard.writeText(shipment.trackingNumber).then(() => { setCopiedCode(shipment.trackingNumber); setCopyFailed(false); }).catch(() => setCopyFailed(true)); }}>{copiedCode === shipment.trackingNumber ? <Check size={15} /> : <Copy size={15} />}{copiedCode === shipment.trackingNumber ? 'Đã sao chép' : 'Sao chép'}</button></div>
      {copyFailed && <p role="alert" className="exchange-error">Chưa sao chép được mã vận đơn.</p>}
      <div className="pickup-success-addresses"><section><h4>Gửi từ</h4><p className="pickup-contact">{sender?.name || 'Kho Shop'}{sender?.phone ? ` · ${sender.phone}` : ''}</p><p className="pickup-address-text">{sender ? returnFullAddress(sender) : 'Chưa có địa chỉ kho gửi'}</p></section><section><h4>Giao đến</h4><p className="pickup-contact">{recipient.name} · {recipient.phone}</p><p className="pickup-address-text">{returnFullAddress(recipient)}</p></section></div>
      <div className="exchange-shipment-summary"><span>Kiện hàng: <strong>{recipient.weight ? `${recipient.weight.toLocaleString('vi-VN')} g · ${recipient.length} × ${recipient.width} × ${recipient.height} cm` : 'Chưa có thông số xác nhận'}</strong></span><ExchangeFreightQuote id={request.id} recipient={recipient} sender={sender} feeAmount={shipment.feeAmount} enabled={!!snapshot.exchangeDelivery && snapshot.pickupProviderMode !== 'disabled'} /></div>
      {delivered ? <footer className="exchange-delivery-status" role="status">
        <div className="exchange-delivery-copy"><span className="exchange-delivery-icon" aria-hidden="true"><Check size={18} /></span><div><strong>{shipment.receivedAt ? 'Khách đã nhận hàng đổi' : 'Đã giao hàng đổi'}</strong><p>Không thu thêm tiền hàng</p></div></div>
        <div className="exchange-delivery-actions"><span className="exchange-delivery-badge">{shipment.receivedAt ? 'Khách đã xác nhận' : 'Chờ khách xác nhận'}</span>
          {shipment.provider === 'GHN_STAGING' && <button type="button" className="pickup-secondary" disabled={busy} onClick={() => void run('sync', () => sync.mutateAsync(undefined))}>{working === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ vận chuyển'}</button>}
        </div>
      </footer> : <footer className="exchange-footer"><span>Không thu thêm tiền hàng từ khách.</span><div>
        {shipment.provider === 'GHN_STAGING' && <button type="button" className="pickup-secondary" disabled={busy} onClick={() => void run('sync', () => sync.mutateAsync(undefined))}>{working === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ vận chuyển'}</button>}
        {maySimulate && <button type="button" className="pickup-primary" disabled={busy} onClick={() => void run('simulation', () => simulation.mutateAsync({ status: shipment.pickedUpAt ? 'delivered' : 'picked' }))}>{working === 'simulation' ? 'Đang cập nhật…' : shipment.pickedUpAt ? 'Xác nhận giao hàng thành công' : 'Xác nhận đã lấy hàng đổi'}</button>}
      </div></footer>}
      <ActionError error={sync.error || simulation.error} />
    </section>;
  }
  if (snapshot.status !== 'EXCHANGE_PENDING') return null;
  return <section className="pickup-card exchange-card" aria-label="Tạo vận đơn hàng thay thế">
    <header className="pickup-header"><h3><Truck size={19} />Gửi hàng đổi cho khách</h3><span className="pickup-state">{locked ? 'Đang đối chiếu vận đơn' : 'Chờ tạo vận đơn'}</span></header>
    <section className="exchange-products" aria-label="Sản phẩm gửi đổi"><h4>Sản phẩm gửi đổi</h4>{products.length ? products.map(product => <div className="exchange-product" key={product.id}><CaseProductImage product={product} size={48} /><div><strong>{product.title}</strong><p>{product.variantName ? `${product.variantName} · ` : ''}Số lượng: {product.quantity}</p></div></div>) : <p className="exchange-muted">Chưa có sản phẩm được duyệt trong hồ sơ.</p>}</section>
    <div className="exchange-addresses">
      <fieldset disabled={busy || locked}><div className="exchange-address-heading"><h4>Gửi từ</h4><ReturnWarehouseCard request={snapshot} triggerOnly title="Kho gửi hàng" onSaved={value => setSnapshot(current => ({ ...current, returnWarehouse: value }))} /></div>
        {sender ? <><p className="exchange-contact">{sender.name} · {sender.phone}</p><p className="exchange-address-text">{returnFullAddress(sender)}</p></> : <p className="exchange-muted">Chưa có kho gửi hàng.</p>}
      </fieldset>
      <fieldset disabled={busy || locked}><div className="exchange-address-heading"><h4>Giao đến</h4><button type="button" className="exchange-edit-address" onClick={openEditor}><Pencil size={14} />Chỉnh sửa</button></div><p className="exchange-contact">{form.name || 'Chưa có người nhận'} · {form.phone || 'Chưa có số điện thoại'}</p><p className="exchange-address-text">{returnFullAddress(form) || 'Chưa có địa chỉ nhận hàng'}</p>
        {!completeReturnAddress(form) && <p className="exchange-locality-note">{resolved.isFetching ? 'Đang đối chiếu địa phương đã lưu…' : 'Bổ sung địa phương trong Chỉnh sửa địa chỉ.'}{resolved.isError && <button type="button" onClick={() => void resolved.refetch()}>Thử lại</button>}</p>}
      </fieldset>
    </div>
    <form onSubmit={submit}>
      <fieldset className="exchange-parcel" disabled={busy || locked}><legend>Kiện hàng</legend>{([['weight', 'Khối lượng (g)'], ['length', 'Dài (cm)'], ['width', 'Rộng (cm)'], ['height', 'Cao (cm)']] as const).map(([key, label]) => <label key={key}>{label}<input type="number" required min={1} max={key === 'weight' ? 19999 : 150} step={1} value={form[key] || ''} onChange={event => setForm(current => ({ ...current, [key]: Number(event.target.value) }))} className="pickup-input" /></label>)}</fieldset>
      {locked && <p role="status" className="exchange-notice"><Info size={16} />Đang đối chiếu lần tạo trước. Thử lại để lấy đúng vận đơn đã giữ hàng.</p>}
      {snapshot.pickupProviderMode === 'disabled' && <p role="status" className="exchange-notice"><Info size={16} />Chưa thể tạo vận đơn lúc này.</p>}
      <ActionError error={booking.error} />
      <footer className="exchange-footer"><div className="exchange-payment-facts"><ExchangeFreightQuote id={request.id} recipient={form} sender={sender} enabled={!locked && snapshot.pickupProviderMode !== 'disabled'} /><span>Shop trả cước · Không thu thêm tiền hàng</span></div><div className="exchange-footer-actions">

        <button type="submit" className="pickup-primary exchange-create-shipment" disabled={busy || !sender || snapshot.pickupProviderMode === 'disabled' || (!locked && (!completeReturnAddress(form) || !products.length))}><Truck size={16} aria-hidden="true" />{working === 'booking' ? 'Đang tạo vận đơn…' : locked ? 'Thử lại vận đơn hàng đổi' : 'Tạo vận đơn hàng đổi'}</button>
      </div></footer>
    </form>
    {editing && createPortal(<Modal isOpen title="Địa chỉ giao hàng đổi" stickyHeader maxWidth="2xl" className="max-w-[640px]" onClose={() => setEditing(false)} footer={<div className="flex justify-end gap-2"><button type="button" className="pickup-secondary" onClick={() => setEditing(false)}>Hủy</button><button type="submit" form={formId} className="pickup-primary" disabled={!draftValid}>Dùng địa chỉ này</button></div>}>
      <form id={formId} className="exchange-address-editor" onSubmit={event => { event.preventDefault(); if (!draftValid) return; addressEdited.current = true; setForm(current => ({ ...current, ...draft, address: returnStreet(draft) })); setEditing(false); }}>
        <label>Người nhận<input className="pickup-input" required minLength={2} maxLength={150} autoComplete="name" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Số điện thoại<input className="pickup-input" required type="tel" pattern="\+?[0-9]{9,15}" maxLength={16} autoComplete="tel" value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} /></label>
        <label className="sm:col-span-2">Số nhà, tên đường<input className="pickup-input" required minLength={2} maxLength={350} autoComplete="street-address" value={draft.address} onChange={event => setDraft(current => ({ ...current, address: event.target.value }))} /></label>
        <VietnamAddressSelects value={draft} onChange={value => setDraft(current => ({ ...current, ...value }))} onValidityChange={setDraftValid} />
      </form>
    </Modal>, document.querySelector('dialog[open]') || document.body)}
  </section>;
}
