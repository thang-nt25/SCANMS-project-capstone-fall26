import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { returnService, type PickupBookingInput, type ReturnAddress } from '../../services/return.service';
import { completeReturnAddress, returnFullAddress } from '../../utils/return-address';

const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

export function ExchangeFreightQuote({ id, recipient, sender, feeAmount, enabled }: {
  id: string; recipient: PickupBookingInput; sender?: ReturnAddress | null; feeAmount?: number | null; enabled: boolean;
}) {
  const confirmed = typeof feeAmount === 'number' && Number.isInteger(feeAmount) && feeAmount >= 0;
  const validParcel = (['weight', 'length', 'width', 'height'] as const).every(key => Number.isInteger(recipient[key]) && recipient[key] > 0 && recipient[key] <= (key === 'weight' ? 19999 : 150));
  const ready = enabled && !confirmed && !!sender && completeReturnAddress(sender) && completeReturnAddress(recipient) && validParcel;
  const input = { ...recipient, address: returnFullAddress(recipient) };
  // Include both addresses: changing the warehouse must invalidate an earlier quote too.
  const currentKey = JSON.stringify({ input, sender });
  const [settledKey, setSettledKey] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(currentKey), 500);
    return () => clearTimeout(timer);
  }, [currentKey]);
  const quote = useQuery({
    queryKey: ['exchange-freight', id, currentKey],
    queryFn: ({ signal }) => returnService.quoteExchangeShipment(id, input, signal),
    enabled: ready && settledKey === currentKey,
    retry: false, staleTime: 240000, refetchInterval: 300000, refetchOnWindowFocus: false,
  });
  if (confirmed) return <span className="exchange-freight">Cước xác nhận: <strong>{money(feeAmount)}</strong></span>;
  if (!ready) return <span className="exchange-freight exchange-muted">Cước: {enabled ? 'Bổ sung địa chỉ và kiện hàng để tính cước' : 'Chưa có cước xác nhận'}</span>;
  const data = settledKey === currentKey && !quote.isError && quote.data && Date.parse(quote.data.validUntil) > Date.now() ? quote.data : null;
  return <span className="exchange-freight" aria-live="polite">
    {data ? <><span>Cước tạm tính: <strong>{money(data.amount)}</strong></span><small title={`Tra cước lúc ${new Date(data.quotedAt).toLocaleString('vi-VN')}. Chưa thu phí.`}>GHN</small></> : quote.isError ? <><span>Chưa lấy được cước</span><button type="button" onClick={() => void quote.refetch()} disabled={quote.isFetching}>Thử lại</button></> : <span>Đang tính cước…</span>}
  </span>;
}
