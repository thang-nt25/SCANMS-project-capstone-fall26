import { randomInt } from 'crypto';
import { GHN_STATUS_LABELS } from './ghn-tracking';
import { GhnEnvironment } from './dto/shipping.dto';

const names = ['Nguyễn Minh An', 'Trần Quốc Huy', 'Lê Hoàng Nam', 'Phạm Tuấn Anh'];
const stages = ['ready_to_pick', 'picked', 'storing', 'delivering', 'delivered'] as const;
const SIMULATION_DURATION_MS = 60_000;
const LAST_STAGE_INDEX = stages.length - 1;
const STAGE_INTERVAL_MS = SIMULATION_DURATION_MS / LAST_STAGE_INDEX;

export type CustomerGhnSimulation = {
  version: 1;
  orderCode: string;
  startedAt: string;
  shipperName: string;
};

export function createCustomerGhnSimulation(orderCode: string, now = Date.now()): CustomerGhnSimulation {
  return { version: 1, orderCode, startedAt: new Date(now).toISOString(), shipperName: names[randomInt(names.length)] };
}

export function customerGhnSimulationDetail(raw: Record<string, any>, orderCode: string, now = Date.now()) {
  const saved = raw.ghnSimulation as CustomerGhnSimulation | undefined;
  if (raw.ghnEnvironment !== 'TEST' || raw.ghnOrderCode !== orderCode || saved?.version !== 1 || saved.orderCode !== orderCode ||
      !saved.shipperName || !Number.isFinite(Date.parse(saved.startedAt))) return null;
  const start = Date.parse(saved.startedAt);
  const index = Math.min(LAST_STAGE_INDEX, Math.max(0, Math.floor((now - start) / STAGE_INTERVAL_MS)));
  const status = stages[index];
  return {
    orderCode, carrier: 'Giao Hàng Nhanh (GHN Express)', environment: GhnEnvironment.TEST,
    isSimulation: true, simulationStartedAt: saved.startedAt,
    nextEventAt: index < LAST_STAGE_INDEX ? new Date(start + (index + 1) * STAGE_INTERVAL_MS).toISOString() : null,
    status, statusText: GHN_STATUS_LABELS[status], trackingError: null, trackingUrl: null,
    expectedDeliveryTime: new Date(start + SIMULATION_DURATION_MS).toISOString(),
    shipperName: index >= 3 ? saved.shipperName : null,
    shipperPhone: null, shipperPhoneDisplay: index >= 3 ? '09xx xxx xxx' : null, shipperCanCall: false,
    timeline: stages.slice(0, index + 1).map((eventStatus, i) => ({
      status: eventStatus, title: GHN_STATUS_LABELS[eventStatus], time: new Date(start + i * STAGE_INTERVAL_MS).toISOString(), completed: true,
      warehouse: eventStatus === 'storing' ? 'Kho trung chuyển mô phỏng' : null,
      shipperName: i === 3 ? saved.shipperName : null, shipperPhone: null,
    })),
    isStale: false, lastCheckedAt: new Date(now).toISOString(), lastKnownStatusText: null,
    // No carrier detail: simulated progress must never authorize a real delivery webhook.
    ghnRawDetail: null,
  };
}
