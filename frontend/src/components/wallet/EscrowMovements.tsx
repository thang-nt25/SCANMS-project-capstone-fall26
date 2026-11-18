import { useEffect, useState } from 'react';
import { Copy, Clock3 } from 'lucide-react';
import api from '../../services/api';

interface Movement {
  id: string; createdAt: string; transactionType: string; balanceBucket: string;
  amount: string; balanceBefore: string; balanceAfter: string;
}
interface Report { items: Movement[]; total: number; page: number; limit: number }
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const bucketName = (bucket: string) => ({ AVAILABLE: 'Khả dụng', PENDING: 'Chờ đối soát', SHOPPING: 'Ví mua sắm' })[bucket] || bucket;
function label(row: Movement) {
  if (row.transactionType === 'REVERSAL') return 'Thu hồi thù lao';
  if (row.transactionType === 'COMMISSION_APPROVED') return Number(row.amount) < 0 ? 'Chuyển khỏi ngăn chờ' : 'Giải tỏa vào khả dụng';
  if (row.transactionType === 'COMMISSION_PENDING') return 'Ghi nhận thù lao chờ';
  return 'Điều chỉnh thù lao';
}

export function EscrowMovements({ commissionId }: { commissionId: string }) {
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setReport(null);
    api.get(`/admin/payouts/escrow/${commissionId}/movements`, { params: { page }, headers: { 'x-skip-cache': 'true' } })
      .then(response => { if (live) setReport(response.data?.data ?? response.data); })
      .catch(() => { if (live) setError('Không tải được bút toán.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [commissionId, page, reload]);
  return <section aria-label="Biến động tiền" className="flex min-h-0 flex-1 flex-col bg-white">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 pb-3 text-xs text-[#7D715E]"><span>{report ? `${report.total} bút toán` : 'Bút toán liên quan'}</span><span>Số dư trước–sau thuộc toàn ngăn ví KOL.</span></div>
    {loading && <p role="status" className="p-4 text-sm text-[#7D715E]">Đang tải bút toán…</p>}
    {error && <div role="alert" className="p-4 text-sm text-[#DC2626]">{error} <button type="button" onClick={() => setReload(value => value + 1)} className="underline">Thử lại</button></div>}
    {report?.items.length === 0 && <p className="p-4 text-sm text-[#7D715E]">Chưa có bút toán liên kết với khoản thù lao này.</p>}
    <div className="min-h-0 max-h-[360px] overflow-y-auto overscroll-contain divide-y divide-[#EAE4D7] border-y border-[#EAE4D7]">
      {report?.items.map(row => <article key={row.id} className="py-3.5 pr-2 text-sm">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="m-0 flex items-center gap-2 font-medium"><Clock3 size={15} className="shrink-0 text-[#B88E4F]" />{label(row)}</h4><p className="mb-0 mt-1.5 text-xs text-[#7D715E]">{new Date(row.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {bucketName(row.balanceBucket)}</p></div><strong className={`shrink-0 tabular-nums ${Number(row.amount) < 0 ? 'text-[#DC2626]' : 'text-[#1A1612]'}`}>{Number(row.amount) > 0 ? '+' : ''}{money(row.amount)}</strong></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="m-0 text-xs tabular-nums text-[#7D715E]">Số dư ngăn ví: {money(row.balanceBefore)} → <strong className="text-[#1A1612]">{money(row.balanceAfter)}</strong></p><button type="button" title={row.id} aria-label="Sao chép mã bút toán" onClick={() => void navigator.clipboard.writeText(row.id).then(() => setCopied(row.id)).catch(() => setCopied(''))} className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#EAE4D7] px-2 py-1 text-xs text-[#7D715E]"><Copy size={12} />{copied === row.id ? 'Đã sao chép' : 'Mã bút toán'}</button></div>
      </article>)}
    </div>
    {report && report.total > report.limit && <div className="flex items-center justify-between border-t border-[#EAE4D7] p-3 text-xs"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40">Trước</button><span>Trang {page}/{Math.ceil(report.total / report.limit)}</span><button type="button" disabled={page * report.limit >= report.total || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40">Sau</button></div>}
  </section>;
}
