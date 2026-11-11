import type { MouseEvent } from 'react';
import { Check, Copy, Truck } from 'lucide-react';
import type { StoreOrderRecord } from '../../services/order.service';

interface Props {
  order: Pick<StoreOrderRecord, 'trackingNumber' | 'carrierName' | 'returnRequest'>;
  copiedTrackingId: string | null;
  onCopy: (tracking: string, event: MouseEvent<HTMLButtonElement>) => void;
}

export function MerchantOrderTrackingCodes({ order, copiedTrackingId, onCopy }: Props) {
  const candidate = order.returnRequest?.exchangeShipment;
  const exchange = candidate?.providerStatus?.startsWith('booking') ? null : candidate;
  const codes = [
    ...(exchange ? [{ tracking: exchange.trackingNumber, label: 'Hàng đổi mới', carrier: exchange.carrierName,
      demo: exchange.provider === 'MOCK', staging: exchange.provider === 'GHN_STAGING', replacement: true }] : []),
    ...(order.trackingNumber ? [{ tracking: order.trackingNumber, label: exchange ? 'Giao ban đầu' : 'Vận đơn giao hàng',
      carrier: order.carrierName, demo: false, staging: false, replacement: false }] : []),
  ];
  if (!codes.length) return null;
  return <div className="flex min-w-0 max-w-full flex-col items-start gap-1.5" aria-label="Mã vận đơn của đơn hàng">
    {codes.map(({ tracking, label, carrier, demo, staging, replacement }) => <button
      key={`${label}-${tracking}`} type="button" onClick={event => onCopy(tracking, event)}
      title={`Sao chép mã ${label.toLowerCase()}: ${tracking}${carrier ? ` · ${carrier}` : ''}`}
      aria-label={`Sao chép mã ${label.toLowerCase()}: ${tracking}`}
      className={`group/copy inline-flex min-h-11 min-w-0 max-w-full cursor-pointer items-center gap-2 whitespace-normal rounded-lg border px-2 py-1.5 text-left transition hover:border-[#C59B58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] ${replacement ? 'border-[#EEDFC6] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-[#FAF8F5]'}`}>
      <Truck className="h-3.5 w-3.5 shrink-0 text-[#B88E4F]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[10px] font-medium leading-4 text-[#7D715E]">{label}{demo ? ' · Demo' : staging ? ' · Staging' : ''}</span>
        <span className="block break-all font-mono text-[11px] font-bold leading-4 text-[#1A1612]">{tracking}</span>
        {carrier && <span className="block break-words text-[10px] leading-4 text-[#7D715E]">{carrier}</span>}
      </span>
      {copiedTrackingId === tracking ? <Check className="h-3 w-3 shrink-0 text-[#059669]" aria-hidden="true" />
        : <Copy className="h-3 w-3 shrink-0 text-[#7D715E]" aria-hidden="true" />}
    </button>)}
  </div>;
}
