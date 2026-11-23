import { useCallback, useMemo, useSyncExternalStore } from 'react';
import api from '../../services/api';

export interface SandboxSampleState {
  receivedAt: string | null;
  deadlineAt: string | null;
  videoUrl: string | null;
  videoRevision?: number;
  videoSubmittedAt?: string | null;
  title?: string | null;
  videoReview?: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string | null; reviewedAt: string; reviewedBy: string } | null;
  status?: string;
  simulatedNow?: string | null;
  simulationStartedAt?: string | null;
  deliveryStatus?: 'NOT_STARTED' | 'WAITING_PICKUP' | 'IN_TRANSIT' | 'DELIVERED';
  shippingPayment?: {
    status: 'PAID_SIMULATED'; amount: number; paidAt: string; reference: string;
    payer: 'SHOP'; codAmount: number;
  } | null;
}

type Snapshot = { state: SandboxSampleState | null; error: string };
type Entry = { snapshot: Snapshot; listeners: Set<() => void>; revision: number; stop?: () => void };
const entries = new Map<string, Entry>();
function entryFor(code: string): Entry {
  let entry = entries.get(code);
  if (!entry) {
    entry = { snapshot: { state: null, error: '' }, listeners: new Set(), revision: 0 };
    entries.set(code, entry);
  }
  return entry;
}
function publish(entry: Entry, snapshot: Snapshot) {
  entry.snapshot = snapshot;
  entry.listeners.forEach(listener => listener());
}
function subscribe(code: string, listener: () => void) {
  const entry = entryFor(code);
  entry.listeners.add(listener);
  if (!entry.stop) {
    let active = true, loading = false;
    const refresh = async () => {
      if (loading || !active) return;
      loading = true;
      const revision = entry.revision;
      try {
        const response: any = await api.get(`/shipping/ghn/sandbox-sample/${encodeURIComponent(code)}`, { headers: { 'x-skip-cache': 'true' } });
        if (active && revision === entry.revision) publish(entry, { state: response?.data?.data || response?.data || response, error: '' });
      } catch {
        if (active && revision === entry.revision) publish(entry, { ...entry.snapshot, error: 'Chưa tải được trạng thái đơn. Vui lòng tải lại trang.' });
      } finally { loading = false; }
    };
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    entry.stop = () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
    void refresh();
  }
  return () => {
    entry.listeners.delete(listener);
    if (!entry.listeners.size) { entry.stop?.(); entry.stop = undefined; }
  };
}

export function useSandboxSampleState(code: string) {
  const subscribeToCode = useCallback((listener: () => void) => subscribe(code, listener), [code]);
  const getSnapshot = useCallback(() => entryFor(code).snapshot, [code]);
  const snapshot = useSyncExternalStore(subscribeToCode, getSnapshot);
  const setState = useCallback((state: SandboxSampleState) => {
    const entry = entryFor(code);
    entry.revision++;
    publish(entry, { state, error: '' });
  }, [code]);
  return { ...snapshot, setState };
}

/** Subscribe before filtering: a pending video must remain discoverable even
 * when its receipt card is hidden by the currently selected tab. */
export function useSandboxSampleStates(codes: string[]) {
  const key = JSON.stringify([...new Set(codes)].sort());
  const subscribeToCodes = useCallback((listener: () => void) => {
    const stops = (JSON.parse(key) as string[]).map(code => subscribe(code, listener));
    return () => stops.forEach(stop => stop());
  }, [key]);
  // A primitive snapshot stays referentially stable between publications.
  const getSnapshot = useCallback(() => JSON.stringify((JSON.parse(key) as string[]).map(code => [code, entryFor(code).snapshot])), [key]);
  const snapshot = useSyncExternalStore(subscribeToCodes, getSnapshot);
  return useMemo(() => Object.fromEntries(JSON.parse(snapshot)) as Record<string, Snapshot>, [snapshot]);
}

export function sandboxSampleStatusLabel(state: SandboxSampleState | null) {
  if (!state) return 'Đang cập nhật';
  if (state.status === 'COMPLETED') return 'Đã nghiệm thu · Sandbox';
  if (state.status === 'REVISION_REQUIRED') return 'Cần sửa video · Sandbox';
  if (state.videoUrl || state.status === 'VIDEO_SUBMITTED') return 'Đã nộp video kiểm thử';
  if (state.status === 'OVERDUE') return 'Quá hạn';
  if (state.receivedAt || state.deliveryStatus === 'DELIVERED') return 'Chờ video';
  if (state.deliveryStatus === 'IN_TRANSIT') return 'Đang giao';
  if (state.simulationStartedAt || state.deliveryStatus === 'WAITING_PICKUP') return 'Chờ lấy hàng';
  return 'Chờ giao hàng';
}
