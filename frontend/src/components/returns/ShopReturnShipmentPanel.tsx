import { useEffect, useRef, useState } from 'react';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { returnService, type ReturnDetail } from '../../services/return.service';
import { ReturnPickupShipmentCard } from './ReturnPickupShipmentCard';

export function ShopReturnShipmentPanel({ request }: { request: ReturnDetail }) {
  const [snapshot, setSnapshot] = useState(request);
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  useEffect(() => { setSnapshot(request); }, [request]);
  const simulate = useReturnAction(request.id, returnService.simulatePickup);
  const sync = useReturnAction(request.id, returnService.syncPickup);
  const receipt = useReturnAction(request.id, returnService.confirmReceipt);
  const inspect = useReturnAction(request.id, returnService.startInspection);
  const shipment = snapshot.customerShipment;
  if (!shipment) return null;
  const maySimulate = Boolean(snapshot.pickupSimulationEnabled && shipment.provider && ['PICKUP_BOOKED', 'RETURN_SHIPPED'].includes(snapshot.status));
  const mayReceive = snapshot.status === 'RETURN_SHIPPED' && !shipment.provider;
  const mayInspect = snapshot.status === 'RETURN_RECEIVED';
  const maySync = shipment.provider === 'GHN_STAGING' && !maySimulate;
  const label = maySimulate ? snapshot.status === 'PICKUP_BOOKED' ? 'Xác nhận đã lấy hàng' : 'Xác nhận hàng đến kho' : mayInspect ? 'Bắt đầu kiểm tra' : mayReceive ? 'Xác nhận hàng đến kho' : 'Đồng bộ vận chuyển';
  const error = simulate.error || sync.error || receipt.error || inspect.error;
  async function act() {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try {
      const result = maySimulate ? await simulate.mutateAsync({ status: snapshot.status === 'PICKUP_BOOKED' ? 'picked' : 'delivered' })
        : mayInspect ? await inspect.mutateAsync(undefined) : mayReceive ? await receipt.mutateAsync(undefined) : await sync.mutateAsync(undefined);
      const updated = result as ReturnDetail;
      if (updated?.id === request.id && updated.status) setSnapshot(updated);
    } catch { /* Keep the confirmed stage and show the API error. */ }
    finally { lock.current = false; setWorking(false); }
  }
  return <ReturnPickupShipmentCard request={snapshot} shop footer={(maySimulate || mayInspect || mayReceive || maySync || error) ? <>
    <div className="pickup-shipment-action-row">
      {(maySimulate || mayInspect || mayReceive || maySync) && <button type="button" className="pickup-primary" disabled={working} onClick={() => void act()}>{working ? 'Đang cập nhật…' : label}</button>}
    </div>
    {error && <p role="alert" className="pickup-action-error">{error instanceof Error ? error.message : 'Chưa cập nhật được vận chuyển. Vui lòng thử lại.'}</p>}
  </> : undefined} />;
}
