import type { MouseEvent } from 'react';
import { ArrowUpRight, Check, Copy, Truck } from 'lucide-react';
import type { StoreOrderRecord } from '../../services/order.service';

interface Props {
  order: Pick<StoreOrderRecord, 'trackingNumber' | 'carrierName' | 'returnRequest'>;
  copiedTrackingId: string | null;
  onCopy: (tracking: string, event: MouseEvent<HTMLButtonElement>) => void;
  onTrack?: () => void;
  compact?: boolean;
  inline?: boolean;
}

export function MerchantOrderTrackingCodes({ order, copiedTrackingId, onCopy, onTrack, compact = false, inline = false }: Props) {
  const candidate = order.returnRequest?.exchangeShipment;
  const exchange = candidate?.providerStatus?.startsWith('booking') ? null : candidate;
  const codes = [
    ...(exchange ? [{ tracking: exchange.trackingNumber, label: 'Hàng đổi', carrier: exchange.carrierName.replace(/\s*(?:\bDemo\b|\(Staging\))/gi, '').trim(), replacement: true }] : []),
    ...(order.trackingNumber && (!compact || !exchange) ? [{ tracking: order.trackingNumber, label: exchange ? 'Giao ban đầu' : 'Vận đơn giao hàng',
      carrier: order.carrierName, replacement: false }] : []),
  ];
  if (!codes.length) return null;
  return <div className={`merchant-waybills${compact ? ' merchant-waybills-compact' : ''}${inline ? ' merchant-waybills-inline' : ''}`} aria-label="Mã vận đơn của đơn hàng">
    {codes.map(({ tracking, label, carrier, replacement }) => <div className="merchant-waybill" key={`${label}-${tracking}`}>
      {(exchange || inline) && <span className="merchant-waybill-label">{inline && !exchange ? 'Vận đơn' : label}{compact && carrier ? ` · ${/GHN|Giao Hàng Nhanh/i.test(carrier) ? 'GHN' : carrier}` : ''}</span>}
      <div className="merchant-waybill-line">
      {!(compact && replacement) && <><Truck size={15} className="merchant-waybill-icon" aria-hidden="true" />
      <span className="merchant-waybill-carrier" title={carrier || undefined}>{carrier && /GHN|Giao Hàng Nhanh/i.test(carrier) ? 'GHN' : carrier || 'Vận chuyển'}</span></>}
      <strong className="merchant-waybill-code" title={tracking}>{tracking}</strong>
      <button type="button" onClick={event => onCopy(tracking, event)}
      title={`Sao chép mã ${label.toLowerCase()}: ${tracking}${carrier ? ` · ${carrier}` : ''}`}
      aria-label={`Sao chép mã ${label.toLowerCase()}: ${tracking}`}
      className="merchant-waybill-copy">
      {copiedTrackingId === tracking ? <Check className="h-3 w-3 shrink-0 text-[#059669]" aria-hidden="true" />
        : <Copy className="h-3 w-3 shrink-0 text-[#7D715E]" aria-hidden="true" />}
    </button>{compact && !replacement && onTrack && <button type="button" className="merchant-waybill-open" onClick={onTrack} title="Xem hành trình vận chuyển" aria-label={`Xem hành trình vận đơn ${tracking}`}><ArrowUpRight size={14} aria-hidden="true" /></button>}</div>
      {inline && !replacement && onTrack && <button type="button" className="merchant-waybill-track" onClick={onTrack} aria-label={`Xem hành trình vận đơn giao ban đầu ${tracking}`}>Xem hành trình<ArrowUpRight size={13} aria-hidden="true" /></button>}
    </div>)}
    {!inline && !compact && order.trackingNumber && onTrack && <button type="button" className="merchant-waybill-track" onClick={onTrack} aria-label={`Xem hành trình vận đơn giao ban đầu ${order.trackingNumber}`}>Xem hành trình<ArrowUpRight size={13} aria-hidden="true" /></button>}
  </div>;
}
