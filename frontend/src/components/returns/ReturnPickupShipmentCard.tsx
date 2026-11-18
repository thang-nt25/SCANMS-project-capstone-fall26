import { useState, type ReactNode } from 'react';
import { Check, CheckCircle2, Copy, Truck } from 'lucide-react';
import type { ReturnAddress, ReturnDetail } from '../../services/return.service';
import { carrierStatusLabel } from '../../utils/return-status.utils';

const fullAddress = (value: ReturnAddress) => [...value.address.split(',').map(part => part.trim()).filter(part => ![value.wardName, value.districtName, value.provinceName].some(region => region?.trim().toLowerCase() === part.toLowerCase())), value.wardName, value.districtName, value.provinceName].filter(Boolean).join(', ');

export function ReturnPickupShipmentCard({ request, shop = false, footer }: { request: ReturnDetail; shop?: boolean; footer?: ReactNode }) {
  const [copiedCode, setCopiedCode] = useState('');
  const [copyError, setCopyError] = useState(false);
  const shipment = request.customerShipment;
  if (!shipment) return null;
  const pickup = request.pickupContact;
  const warehouse = request.returnWarehouse;
  const status = shipment.receivedAt ? 'Shop đã nhận hàng' : shipment.providerStatus === 'ready_to_pick' ? 'Chờ lấy hàng' : shipment.providerStatus ? carrierStatusLabel(shipment.providerStatus) : 'Đã ghi nhận đặt lấy hàng';
  const simulation = shipment.provider === 'MOCK';
  const title = shop ? 'Vận chuyển hàng trả' : 'Đã đặt lấy hàng';
  const copied = copiedCode === shipment.trackingNumber;
  return <section className="pickup-card" aria-label={title}>
    <header className="pickup-header"><div className="pickup-heading"><h3>{shop ? <Truck size={19} /> : <CheckCircle2 size={19} />}{title}</h3>
      {!shop && simulation && <p>Vận đơn mô phỏng</p>}
      {shipment.provider === 'GHN_STAGING' && <p>Vận đơn thử nghiệm</p>}
    </div><span className="pickup-state" role="status">{status}</span></header>
    <div className="pickup-success">
      <div className="pickup-waybill"><p><strong>{simulation && /^SCANMS Demo$/i.test(shipment.carrierName.trim()) ? 'Vận chuyển SCANMS' : shipment.carrierName}</strong><span aria-hidden="true"> · </span><code>{shipment.trackingNumber}</code></p>
        <button type="button" className="pickup-copy" aria-label={copied ? 'Đã sao chép mã vận đơn' : 'Sao chép mã vận đơn'} onClick={() => { void navigator.clipboard.writeText(shipment.trackingNumber).then(() => { setCopiedCode(shipment.trackingNumber); setCopyError(false); }).catch(() => setCopyError(true)); }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Đã sao chép' : 'Sao chép'}</button>
      </div>
      {copyError && <p role="alert" className="pickup-copy-error">Chưa sao chép được. Bạn có thể chọn mã vận đơn để sao chép.</p>}
      <div className="pickup-success-addresses">
        <section><h4>Lấy tại</h4><p className="pickup-contact">{pickup?.name || request.order.customerName || 'Chưa có người gửi'} · {pickup?.phone || request.order.customerPhone || 'Chưa có số điện thoại'}</p><p className="pickup-address-text">{pickup ? fullAddress(pickup) : request.order.shippingAddress || 'Chưa có địa chỉ lấy hàng'}</p></section>
        <section><h4>{shop ? 'Nhận tại kho' : 'Gửi về'}</h4>{warehouse ? <><p className="pickup-contact">{warehouse.name} · {warehouse.phone}</p><p className="pickup-address-text">{request.returnAddress || fullAddress(warehouse)}</p></> : <p className="pickup-muted">{request.returnAddress || 'Chưa có thông tin kho nhận hàng'}</p>}</section>
      </div>
      <div className="pickup-success-footer"><p>Kiện hàng: <strong>{pickup?.weight ? `${pickup.weight.toLocaleString('vi-VN')} g` : 'Chưa có khối lượng'}{pickup && [pickup.length, pickup.width, pickup.height].every(value => value > 0) ? ` · ${pickup.length} × ${pickup.width} × ${pickup.height} cm` : ' · Chưa có kích thước'}</strong></p>
        {shipment.receiptImageUrl && <a href={shipment.receiptImageUrl} target="_blank" rel="noreferrer">Xem biên nhận</a>}
      </div>
    </div>
    {footer && <footer className="pickup-shipment-actions">{footer}</footer>}
  </section>;
}
