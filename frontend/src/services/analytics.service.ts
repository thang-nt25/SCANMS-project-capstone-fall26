import api from './api';

export interface DashboardOverviewResponse {
  period: {
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
    range: string;
  };
  metrics: {
    totalClicks: number;
    previousClicks: number;
    growthClicks: number;

    totalOrders: number;
    previousOrders: number;
    growthOrders: number;

    completedOrders: number;
    grossRevenue: number;
    previousRevenue: number;
    growthRevenue: number;

    totalCommission: number;
    previousCommission: number;
    growthCommission: number;

    estimatedCommission?: number;
    pendingOrdersCount?: number;

    vipBonusCommission: number;
    conversionRate: number;
    previousConversionRate: number;
    growthConversionRate: number;

    averageOrderValue: number;
    activeReferralLinks: number;
    activeCollaboratorsCount?: number;
  };
  storesBreakdown?: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    category: string | null;
    managerName: string | null;
    managerEmail: string | null;
    revenue: number;
    orders: number;
    growth: string;
    status: string;
  }>;
  operationsSummary?: {
    activeStoresCount: number;
    activeCollaboratorsCount: number;
    pendingOrdersCount: number;
    pendingPayoutsCount: number;
    pendingDisputesCount: number;
    unassignedStoresCount: number;
  };
}

export interface ReferralOrderItem {
  id: string;
  orderCode: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhoneMasked: string;
  storeName: string;
  storeLogo?: string;
  finalAmount: number;
  commissionAmount: number;
  commissionRate: number;
  commissionStatus: 'ESTIMATED' | 'IN_ESCROW' | 'APPROVED' | 'PAID' | string;
  availableAt?: string | null;
  orderTotal?: number;
  commissionEarned?: number;
  externalOrderSn?: string;
  productTitle?: string;
  products: Array<{
    id?: string;
    title: string;
    variantName?: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
    commissionAmount: number;
  }>;
}

export interface ReferralOrdersResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: ReferralOrderItem[];
}

export interface TimeSeriesPoint {
  date?: string;
  hour?: number;
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
}

export interface TopProductItem {
  rank: number;
  productId: string;
  title: string;
  sku: string;
  imageUrl?: string;
  unitPrice: number;
  storeName?: string;
  ordersCount: number;
  quantitySold: number;
  grossRevenue: number;
}

export interface TopChannelItem {
  channel: string;
  clicks: number;
  orders: number;
  conversionRate: number;
  trafficSharePercent: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  conversionRate: number;
  fulfillmentRate: number;
}

export interface CampaignPerformanceItem {
  campaignId: string;
  name: string;
  bonusCommissionRate: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  storeName?: string;
  participantsCount: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  myStatus?: string;
}

export interface ProductCommissionBreakdownItem {
  productId: string;
  productTitle: string;
  productImage: string | null;
  productPrice: number;
  storeName: string;
  unitsSold: number;
  ordersCount: number;
  grossRevenue: number;
  commissionEarned: number;
  rateBreakdown: {
    baseRate: number;
    tierBonus: number;
    tierName: string;
    dealBonus: number;
    hasExclusiveDeal: boolean;
    liveBonus: number;
    finalRate: number;
  };
}

export interface LiveSessionSummaryItem {
  id: string;
  title: string;
  coverImageUrl?: string;
  storeName: string;
  storeLogo?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  pinnedProductsCount: number;
  liveBonusRate: number;
  metrics: {
    ordersCount: number;
    unitsSold: number;
    grossRevenue: number;
    commissionEarned: number;
  };
}

export interface ActiveDealPartnerItem {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail?: string;
  collaboratorAvatar?: string;
  collaboratorTier: string;
  primaryChannel?: {
    platformName: string;
    channelName?: string;
    channelUrl?: string;
    followerCount?: number;
  } | null;
  productId: string;
  productTitle?: string;
  productImage?: string;
  productPrice: number;
  dealCommissionRate: number;
  publicCommissionRate: number;
  targetOrders: number;
  commitmentDays: number;
  commitmentEndsAt?: string;
  isExpired: boolean;
  progress: {
    completedOrders: number;
    pendingOrders: number;
    validRevenue: number;
    targetOrders: number;
    status: string;
    percent?: number;
    percentComplete?: number;
  };
  referralLink?: {
    shortCode: string;
    totalClicks: number;
    totalOrders: number;
  } | null;
}

export const analyticsService = {
  getRealtimeOverview: async (params?: {
    range?: string;
    days?: number;
    startDate?: string;
    endDate?: string;
    interval?: string;
    storeId?: string;
    channel?: string;
    campaignId?: string;
  }, fresh = false) => {
    const res = await api.get<{ data?: DashboardOverviewResponse } | DashboardOverviewResponse>(
      '/dashboard/realtime/overview',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getTimeSeries: async (params?: {
    range?: string;
    days?: number;
    startDate?: string;
    endDate?: string;
    interval?: string;
    storeId?: string;
  }, fresh = false) => {
    const res = await api.get<{ data?: TimeSeriesPoint[] } | TimeSeriesPoint[]>(
      '/dashboard/realtime/timeseries',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getTopProducts: async (params?: { range?: string; limit?: number; startDate?: string; endDate?: string }, fresh = false) => {
    const res = await api.get<{ data?: TopProductItem[] } | TopProductItem[]>(
      '/dashboard/realtime/top-products',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getTopChannels: async (params?: { range?: string; limit?: number; startDate?: string; endDate?: string }, fresh = false) => {
    const res = await api.get<{ data?: TopChannelItem[] } | TopChannelItem[]>(
      '/dashboard/realtime/top-channels',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getConversionFunnel: async (params?: { range?: string; startDate?: string; endDate?: string }, fresh = false) => {
    const res = await api.get<{ data?: FunnelResponse } | FunnelResponse>(
      '/dashboard/realtime/funnel',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getCampaignPerformance: async (params?: { range?: string; startDate?: string; endDate?: string }, fresh = false) => {
    const res = await api.get<{ data?: CampaignPerformanceItem[] } | CampaignPerformanceItem[]>(
      '/dashboard/realtime/campaigns',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getCollaboratorReferralOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }, fresh = false): Promise<ReferralOrdersResponse> => {
    const res = await api.get<{ data?: ReferralOrdersResponse } | ReferralOrdersResponse>(
      '/dashboard/collaborator/referral-orders',
      { params, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return ((res.data as any)?.data || res.data) as ReferralOrdersResponse;
  },

  getShopKolOrders: async (kolId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }, fresh = false) => {
    const res = await api.get<{ data?: any } | any>(
      '/dashboard/shop/kol-orders',
      { params: { ...params, kolId }, headers: fresh ? { 'x-skip-cache': 'true' } : undefined },
    );
    return (res.data as any)?.data || res.data;
  },

  getCollaboratorTopProducts: async (limit = 10, fresh = false): Promise<{
    success: boolean;
    totalProducts: number;
    items: ProductCommissionBreakdownItem[];
  }> => {
    const res = await api.get('/dashboard/collaborator/top-products', {
      params: { limit },
      headers: fresh ? { 'x-skip-cache': 'true' } : undefined,
    });
    return (res.data as any)?.data || res.data;
  },

  getCollaboratorLiveSessionsSummary: async (fresh = false): Promise<{
    success: boolean;
    totalSessions: number;
    totals: {
      totalLiveRevenue: number;
      totalLiveCommission: number;
      totalLiveOrders: number;
    };
    sessions: LiveSessionSummaryItem[];
  }> => {
    const res = await api.get('/dashboard/collaborator/live-sessions-summary', {
      headers: fresh ? { 'x-skip-cache': 'true' } : undefined,
    });
    return (res.data as any)?.data || res.data;
  },

  getShopActivePartners: async (fresh = false): Promise<{
    success: boolean;
    totalPartners: number;
    totalActiveDeals: number;
    averageCommissionRate: number;
    deals: ActiveDealPartnerItem[];
  }> => {
    const res = await api.get('/affiliate-deals/shop/active-partners', {
      headers: fresh ? { 'x-skip-cache': 'true' } : undefined,
    });
    return (res.data as any)?.data || res.data;
  },
};
