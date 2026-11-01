import { useEffect, useState } from 'react';
import api from '../../services/api';
import { getChatSocket } from '../../services/chat-socket.service';
import { tierRemuneration } from '../../utils/partner-tier';

type Deal = {
  storeId: string; collaboratorId: string; productId: string;
  status: string; closedAt?: string | null; isCurrentDeal?: boolean;
  approvedCommissionRate?: number | string | null;
  scopeType?: string; scopeProducts?: { productId: string }[];
};
type Props = {
  storeId?: string; collaboratorId?: string; tier?: unknown;
  role: 'SHOP_MANAGER' | 'COLLABORATOR'; productId?: string;
};

/** A per-product VIP must never be advertised as the rate for the whole Store. */
export function PartnerRemunerationSummary({ storeId, collaboratorId, tier, role, productId }: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    let pending: AbortController | undefined;
    setDeals([]);
    setStatus('loading');
    if (!storeId || !collaboratorId) return;
    async function refresh() {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      try {
        const response: any = await api.get(`/affiliate-deals/${role === 'SHOP_MANAGER' ? 'shop' : 'mine'}`, { signal: controller.signal, headers: { 'x-skip-cache': '1' } });
        const body = response?.data?.data || response?.data || response;
        if (!Array.isArray(body)) throw new Error('Invalid deal collection');
        if (!active || controller.signal.aborted) return;
        setDeals(body.filter((deal: Deal) => deal.storeId === storeId && deal.collaboratorId === collaboratorId && deal.status === 'APPROVED' && deal.isCurrentDeal === true && !deal.closedAt));
        setStatus('ready');
      } catch {
        if (active && !controller.signal.aborted) { setDeals([]); setStatus('error'); }
      }
    }
    const update = () => { if (!document.hidden) void refresh(); };
    const message = (event: { messageText?: string }) => {
      try {
        if (['EXCLUSIVE_DEAL_DECISION', 'EXCLUSIVE_DEAL_PROPOSAL'].includes(JSON.parse(event.messageText || '').type)) update();
      } catch { /* Ordinary messages do not change contract rates. */ }
    };
    void refresh();
    const socket = getChatSocket();
    socket.on('new_message', message);
    socket.on('connect', update);
    window.addEventListener('focus', update);
    return () => { active = false; pending?.abort(); socket.off('new_message', message); socket.off('connect', update); window.removeEventListener('focus', update); };
  }, [storeId, collaboratorId, role]);

  const base = tierRemuneration(tier);
  const scopedDeal = deals.filter(deal => deal.scopeType === 'STORE_WIDE' || (productId && (deal.scopeType === 'SELECTED_PRODUCTS' ? deal.scopeProducts?.some(item => item.productId === productId) : deal.productId === productId))).sort((a, b) => Number(b.approvedCommissionRate) - Number(a.approvedCommissionRate))[0];
  const rate = scopedDeal?.approvedCommissionRate == null ? undefined : Number(scopedDeal.approvedCommissionRate);
  const vip = !storeId || !collaboratorId ? 'Chưa xác định gian hàng' : status === 'error' ? 'Chưa đồng bộ VIP' : status === 'loading' ? 'Đang đồng bộ VIP…' : Number.isFinite(rate) ? `VIP ${rate}% ${scopedDeal?.scopeType === 'STORE_WIDE' ? 'toàn gian hàng' : 'cho sản phẩm đang trao đổi'}` : deals.length ? `${deals.length} thỏa thuận VIP theo phạm vi` : 'Chưa có thỏa thuận VIP';
  return <span data-partner-remuneration className="text-[10px] leading-relaxed text-[#7D715E]">
    {base == null ? 'Chưa có cấp bậc' : `Theo cấp bậc: ${base}%`} · {vip}
  </span>;
}
