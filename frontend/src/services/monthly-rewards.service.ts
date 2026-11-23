import api from "./api";
import { apiCache } from '../utils/api-cache.utils';
import { registerPrivateCacheReset } from '../utils/private-cache-session';
export interface RewardGrant {
  id: string;
  status: string;
  amount: string;
  reviewNote?: string;
  paidAt?: string;
}
export interface RewardMember {
  collaboratorId: string;
  name: string;
  validRevenue: string | null;
  validOrdersCount: number;
  eligible: boolean;
  estimatedReward: string;
  error?: string;
  grant: RewardGrant | null;
}
export interface RewardPolicy {
  id: string;
  storeId: string;
  storeName: string;
  yearMonth: string;
  name: string;
  targetRevenue: string;
  rewardAmount: string;
  status: string;
  reviewNote?: string;
  isDemo: boolean;
  reviewedAt?: string | null;
  reviewHistory?: { id: string; resubmittedAt: string; name: string | null; targetRevenue: string | null; rewardAmount: string | null; reviewNote: string | null; reviewedAt: string | null }[];
  members: RewardMember[];
}
export interface RewardOverview {
  stores: { id: string; name: string; logoUrl?: string | null }[];
  policies: RewardPolicy[];
  legacyHistory?: {
    storeId: string; storeName: string; yearMonth: string; warning: string | null;
    rules: { id: string; name: string; targetRevenue: string; rewardAmount: string; bonusPercentage: string }[];
    settlements: { id: string; collaboratorId: string; name: string; validRevenue: string; amount: string; appliedRuleName: string | null; status: string; settledAt: string; paidAt: string | null }[];
    members: { id: string; collaboratorId: string; name: string; validRevenue: string | null; validOrdersCount: number | null; amount: string | null; appliedRuleName: string | null; status: string; settledAt: string | null; paidAt: string | null; isSettled: boolean; error: string | null }[];
  }[];
}
export interface MonthlyRewardOrders {
  totalRevenue: string;
  totalOrders: number;
  items: { id: string; code: string; completedAt: string | null; revenue: string; products: { title: string; imageUrl: string | null; quantity: number }[] }[];
}
export interface RewardPolicyHistory {
  items: { id: string; yearMonth: string; name: string; targetRevenue: string; rewardAmount: string; status: string; createdAt: string; reviewNote?: string | null }[];
  total: number;
  page: number;
  pageSize: number;
}
const unwrap = <T>(response: { data?: unknown }): T =>
  ((response.data as { data?: unknown })?.data ??
    response.data ??
    response) as T;
const snapshots = new Map<string, { data: RewardOverview; until: number }>();
const pending = new Map<string, Promise<RewardOverview>>();
let generation = 0;
let identity = '';
function invalidate() { generation++; snapshots.clear(); pending.clear(); }
registerPrivateCacheReset(invalidate);
function sessionKey() {
  const token = localStorage.getItem('token');
  apiCache.setSession(token);
  const next = `${token ?? ''}:${localStorage.getItem('user') ?? ''}:${localStorage.getItem('current_store_id') ?? ''}:${apiCache.revision}`;
  if (next !== identity) { identity = next; invalidate(); }
  return next;
}
function cacheKey(month: string, storeId?: string) { return `${sessionKey()}|${storeId ?? 'all'}|${month}`; }
function cached(month: string, storeId?: string) {
  const key = cacheKey(month, storeId), entry = snapshots.get(key);
  if (entry && entry.until > Date.now()) return entry.data;
  snapshots.delete(key); return null;
}
async function mutate(work: () => Promise<unknown>) {
  // A submitted/reviewed reward must never keep an old preview in this tab.
  invalidate();
  try { return await work(); } finally { invalidate(); }
}
export const monthlyRewards = {
  async policyHistory(storeId: string, page = 1): Promise<RewardPolicyHistory> {
    return unwrap<RewardPolicyHistory>(await api.get(`/monthly-rewards/stores/${storeId}/policies`, { params: { page }, headers: { 'x-skip-cache': 'true' } }));
  },
  cached,
  invalidate,
  async myOrders(policyId: string): Promise<MonthlyRewardOrders> {
    return unwrap<MonthlyRewardOrders>(await api.get(`/monthly-rewards/policies/${policyId}/my-orders`, { headers: { 'x-skip-cache': 'true' } }));
  },
  list(month: string, storeId?: string): Promise<RewardOverview> {
    const value = cached(month, storeId);
    if (value) return Promise.resolve(value);
    const key = cacheKey(month, storeId), active = pending.get(key);
    if (active) return active;
    const version = generation;
    const request = api.get("/monthly-rewards", {
        params: { month, storeId },
        headers: { "x-skip-cache": "true" },
        timeout: 45000,
      }).then(response => {
        const data = unwrap<RewardOverview>(response);
        if (version === generation && key === cacheKey(month, storeId)) {
          if (snapshots.size >= 24) snapshots.delete(snapshots.keys().next().value!);
          snapshots.set(key, { data, until: Date.now() + 15000 });
        }
        return data;
      }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
    pending.set(key, request); return request;
  },
  async create(
    storeId: string,
    input: {
      yearMonth: string;
      name: string;
      targetRevenue: string;
      rewardAmount: string;
    },
  ) {
    return mutate(() => api.post(`/monthly-rewards/stores/${storeId}`, input));
  },
  async reviewPolicy(id: string, decision: string, note?: string) {
    return mutate(() => api.post(`/monthly-rewards/policies/${id}/review`, {
      decision,
      note,
    }));
  },
  async request(id: string, kolId: string) {
    return mutate(() => api.post(`/monthly-rewards/policies/${id}/request/${kolId}`));
  },
  async reviewGrant(id: string, decision: string, note?: string) {
    return mutate(() => api.post(
      `/monthly-rewards/grants/${id}/review`,
      { decision, note },
      { timeout: 45000 },
    ));
  },
};
export function currentRewardMonth(offset = 0) {
  const local = new Date(Date.now() + 7 * 3600000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1),
  )
    .toISOString()
    .slice(0, 7);
}
