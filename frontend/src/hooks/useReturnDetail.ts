import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { returnService, type ReturnDetail } from '../services/return.service';
import { getChatSocket } from '../services/chat-socket.service';

export function useReturnDetail(id?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!id) return;
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['return-detail', id] }); };
    const changed = (payload: { returnRequestId?: string }) => {
      if (payload?.returnRequestId !== id) return;
      refresh();
      for (const key of ['shop-returns', 'orders', 'shop-orders', 'customer-orders']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    // Reuse the authenticated user socket; never open a public case subscription.
    const socket = localStorage.getItem('token') ? getChatSocket() : null;
    socket?.on('return_updated', changed);
    socket?.on('connected', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      socket?.off('return_updated', changed);
      socket?.off('connected', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [id, queryClient]);
  return useQuery({
    queryKey: ['return-detail', id],
    queryFn: () => returnService.getOne(id!),
    enabled: Boolean(id),
    // Keep a short fallback for a dropped socket, plus immediate refresh on return.
    refetchInterval: 5000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchOnMount: 'always',
  });
}

export function useConfirmShipment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { carrierName: string; trackingNumber: string; receipt: File }) =>
      returnService.submitShipment(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['return-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['shop-returns'] });
    },
  });
}

export function useReturnAction<T>(id: string, action: (id: string, data: T) => Promise<unknown>, options?: { backgroundRefresh?: boolean }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => action(id, data),
    onSuccess: async (result) => {
      if (options?.backgroundRefresh) {
        // A committed mutation already returned the updated case. Slow queue refreshes
        // must not keep its form locked or turn a saved operation into a retry.
        const detail = result as ReturnDetail | undefined;
        if (detail?.id === id && detail.status && detail.order && detail.events) {
          void queryClient.cancelQueries({ queryKey: ['return-detail', id] });
          queryClient.setQueryData(['return-detail', id], detail);
        }
      }
      const refresh = Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['return-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['shop-returns'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-return-disputes'] }),
        queryClient.invalidateQueries({ queryKey: ['ghn-claims'] }),
        queryClient.invalidateQueries({ queryKey: ['return-disputes'] }),
      ]);
      if (!options?.backgroundRefresh) await refresh;
    },
  });
}
