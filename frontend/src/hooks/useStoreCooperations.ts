import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface StoreCooperation {
  id: string;
  storeId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByKol: boolean;
  createdAt?: string;
  updatedAt?: string;
  note?: string | null;
  store?: { id: string; name: string; logoUrl?: string | null };
}

const EMPTY_COOPERATIONS: StoreCooperation[] = [];

/** Cards and the KOC workspace share one account-scoped source of relationships. */
export function useStoreCooperations(userId?: string, enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ['my-store-cooperations', userId];
  const query = useQuery<StoreCooperation[]>({
    queryKey,
    enabled: enabled && Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: 'always',
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await api.get('/store-collaborators/my-invitations', {
        signal, headers: { 'x-skip-cache': 'true' },
      });
      const rows = response?.data?.data ?? response?.data ?? response;
      if (!Array.isArray(rows)) throw new Error('Không tải được trạng thái hợp tác.');
      return rows;
    },
  });
  useEffect(() => {
    if (!enabled || !userId) return;
    const changed = () => { void queryClient.invalidateQueries({ queryKey: ['my-store-cooperations', userId] }, { cancelRefetch: false }); };
    window.addEventListener('scanms_cooperation_changed', changed);
    return () => window.removeEventListener('scanms_cooperation_changed', changed);
  }, [queryClient, userId, enabled]);
  return { ...query, data: query.data ?? EMPTY_COOPERATIONS, queryKey };
}
