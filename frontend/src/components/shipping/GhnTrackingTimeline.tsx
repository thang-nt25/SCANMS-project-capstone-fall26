import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import api from '../../services/api';

interface TrackingEvent {
  status: string;
  title: string;
  time: string | null;
}

interface Tracking {
  orderCode: string;
  status: string;
  statusText: string;
  expectedDeliveryTime: string | null;
  shipperName: string | null;
  shipperPhone: string | null;
  timeline: TrackingEvent[];
}

export function GhnTrackingTimeline({ orderCode, sampleRequestId, onSampleDelivered }: { orderCode: string; sampleRequestId?: string; onSampleDelivered?: () => void }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setTracking(null);
    setError('');
    api.get(`/shipping/ghn/track/${encodeURIComponent(orderCode)}`, { headers: { 'x-skip-cache': 'true' } })
      .then(async (response: any) => {
        const data = response?.data?.data || response?.data || response;
        if (active) setTracking(data);
        if (active && sampleRequestId && data.status === 'delivered') {
          await api.post(`/shipping/ghn/sync-sample/${encodeURIComponent(sampleRequestId)}`);
          if (active) onSampleDelivered?.();
        }
      })
      .catch(() => { if (active) setError('Chưa tải được hành trình từ GHN.'); });
    return () => { active = false; };
  }, [orderCode, sampleRequestId]);

  return (
    <section className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 text-sm text-[#1A1612]" aria-label={`Hành trình GHN ${orderCode}`}>
      <div className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4 text-[#B88E4F]" /> GHN: {orderCode}</div>
      {error && <p role="alert" className="mt-2 text-[#DC2626]">{error}</p>}
      {!tracking && !error && <p className="mt-2 text-[#7D715E]">Đang tra cứu GHN...</p>}
      {tracking && <>
        <p className="mt-2 font-semibold">{tracking.statusText}</p>
        {tracking.shipperName && <p className="text-[#7D715E]">Bưu tá: {tracking.shipperName}{tracking.shipperPhone ? ` · ${tracking.shipperPhone}` : ''}</p>}
        {tracking.expectedDeliveryTime && <p className="text-[#7D715E]">Dự kiến: {new Date(tracking.expectedDeliveryTime).toLocaleString('vi-VN')}</p>}
        {tracking.timeline.length ? <ol className="mt-3 space-y-3 border-l-2 border-[#EEDFC6] pl-4">
          {tracking.timeline.map((event, index) => <li key={`${event.status}-${event.time || index}`} className="relative">
            <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-[#C59B58]" />
            <strong>{event.title}</strong>
            {event.time && <span className="ml-2 text-xs text-[#7D715E]">{new Date(event.time).toLocaleString('vi-VN')}</span>}
          </li>)}
        </ol> : <p className="mt-2 text-[#7D715E]">GHN chưa công bố mốc hành trình chi tiết.</p>}
      </>}
    </section>
  );
}
