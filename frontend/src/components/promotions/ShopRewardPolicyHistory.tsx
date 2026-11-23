import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { monthlyRewards, type RewardPolicyHistory } from '../../services/monthly-rewards.service';
import { Modal } from '../ui/Modal';

const labels: Record<string, string> = { PENDING: 'Chờ kiểm duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' };
const money = (amount: string) => `${Number(amount).toLocaleString('vi-VN')} ₫`;

export function ShopRewardPolicyHistory({storeId, revision, month, onSelect}: {storeId: string; revision: number; month: string; onSelect: (month: string) => void}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RewardPolicyHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(1); }, [storeId, revision]);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setData(null);
    monthlyRewards.policyHistory(storeId, page).then(result => { if (live) setData(result); })
      .catch(() => { if (live) setError('Không tải được các mốc thưởng.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [storeId, page, revision, retry]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <>
    <button type="button" aria-label="Mốc thưởng đã tạo" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#EAE4D7] bg-white px-4 text-[13px] font-medium text-[#715126] transition-colors hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]">
      <Trophy size={16}/><span>Mốc đã tạo</span>{data && <span className="border-l border-[#EAE4D7] pl-2 tabular-nums text-[#7D715E]">{data.total}</span>}
    </button>
    {open && createPortal(<Modal isOpen title="Mốc thưởng đã tạo" subtitle={data ? `${data.total} mốc` : undefined} maxWidth="3xl" stickyHeader className="w-full sm:max-w-[760px]" bodyClassName="p-0!" onClose={() => setOpen(false)}>
      <section aria-label="Các mốc thưởng đã tạo">
        {loading ? <p role="status" className="m-0 p-6 text-center text-sm text-[#7D715E]">Đang tải mốc thưởng…</p> : error ? <p role="alert" className="m-0 p-5 text-sm text-[#DC2626]">{error} <button type="button" className="ml-2 underline" onClick={() => setRetry(v => v + 1)}>Thử lại</button></p> : !data?.items.length ? <p className="m-0 p-6 text-center text-sm text-[#7D715E]">Shop chưa tạo mốc thưởng nào.</p> : <>
          <div aria-hidden="true" className="hidden grid-cols-[1.1fr_1fr_1fr_150px] gap-4 border-b border-[#EAE4D7] bg-[#FAF8F5] px-5 py-3 text-xs text-[#7D715E] sm:grid"><span>Kỳ thưởng</span><span className="text-right">Mốc doanh số</span><span className="text-right">Tiền thưởng</span><span className="pl-2">Trạng thái</span></div>
          <div className="divide-y divide-[#EAE4D7]">{data.items.map(policy => <button key={policy.id} type="button" aria-label={`Xem mốc thưởng tháng ${policy.yearMonth}`} aria-current={policy.yearMonth === month ? 'true' : undefined} onClick={() => { setOpen(false); onSelect(policy.yearMonth); }} className={`grid min-h-[64px] w-full grid-cols-2 items-center gap-x-4 gap-y-2 border-0 px-5 py-3 text-left text-[13px] transition-colors sm:grid-cols-[1.1fr_1fr_1fr_150px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58] ${policy.yearMonth === month ? 'bg-[#FBF5EB]' : 'bg-white hover:bg-[#FAF8F5]'}`}>
            <span className="min-w-0"><strong className="font-semibold text-[#1A1612]">{policy.yearMonth.split('-').reverse().join('/')}</strong>{policy.name.trim().toLocaleLowerCase('vi-VN') !== 'thưởng doanh số tháng' && <span className="mt-0.5 block text-xs text-[#7D715E]">{policy.name}</span>}<time dateTime={policy.createdAt} className="mt-0.5 block text-[11px] text-[#7D715E]">Tạo {new Date(policy.createdAt).toLocaleDateString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}</time></span>
            <span className="text-right font-medium tabular-nums text-[#1A1612]"><span className="mb-0.5 block text-[11px] font-normal text-[#7D715E] sm:hidden">Mốc doanh số</span>{money(policy.targetRevenue)}</span>
            <span className="text-right font-semibold tabular-nums text-[#715126]"><span className="mb-0.5 block text-[11px] font-normal text-[#7D715E] sm:hidden">Tiền thưởng</span>{money(policy.rewardAmount)}</span>
            <span className="flex items-center justify-between gap-1 sm:pl-2"><span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[11px] ${policy.status === 'REJECTED' ? 'border-[#DC2626]/20 text-[#DC2626]' : 'border-[#EEDFC6] text-[#715126]'}`}>{labels[policy.status] || policy.status}</span><ChevronRight size={14} className="shrink-0 text-[#7D715E]"/></span>
          </button>)}</div>
          {pages > 1 && <footer className="flex items-center justify-end gap-3 border-t border-[#EAE4D7] px-5 py-3 text-xs text-[#7D715E]"><button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Trước</button><span>{page}/{pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(v => v + 1)} className="h-8 rounded-lg border border-[#EAE4D7] px-3 disabled:opacity-40">Sau</button></footer>}
        </>}
      </section>
    </Modal>, document.body)}
  </>;
}
