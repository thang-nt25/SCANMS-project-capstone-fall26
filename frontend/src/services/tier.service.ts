import api from './api';

export interface TierPolicy {
  id: string;
  name: string;
  extraBonusPercentage: number;
  minRevenueThreshold: number;
  maintenanceThreshold?: number;
}

export interface TierStatus {
  currentTier: TierPolicy;
  currentRevenue: number;
  totalOrders: number;
  revenueBasis: 'CUMULATIVE_CLOSED_MONTHS_VIETNAM';
  assessmentIncomplete?: boolean;
  unassignedCompletedOrdersCount?: number;
  assessmentPeriod?: { startsAt: string; endsAt: string };
  nextEvaluationAt?: string;
  qualifiedTier: TierPolicy;
  nextTier: TierPolicy | null;
  progressPercentage: number;
  revenueNeeded: number;
  // Governance: Ngưỡng duy trì 60% & Ân hạn 30 ngày Soft Landing
  maintenanceThreshold?: number;
  maintenanceProgressPercentage?: number;
  revenueNeededToMaintain?: number;
  isMaintained?: boolean;
  cycleStatus?: 'PROMOTED_OR_EXCEEDED' | 'MAINTAINED' | 'GRACE_PERIOD';
  daysRemaining?: number;
  stepDownTier?: { id: string; name: string; extraBonusPercentage: number } | null;
}

export const tierService = {
  async getAllTiers(fresh = false): Promise<TierPolicy[]> {
    const res: any = await api.get('/tiers', { headers: fresh ? { 'x-skip-cache': 'true' } : undefined });
    return res.data;
  },

  async getMyTierStatus(fresh = false): Promise<TierStatus> {
    const res: any = await api.get('/tiers/my-status', { headers: fresh ? { 'x-skip-cache': 'true' } : undefined });
    return res.data;
  },

  async triggerEvaluation() {
    const res: any = await api.post('/tiers/evaluate');
    return res.data;
  },
};
