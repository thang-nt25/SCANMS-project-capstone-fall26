import { useEffect, useState } from 'react';
import { CalendarDays, Trophy } from 'lucide-react';
import { commissionRulesService as service, type CommissionRule, type SettlementHistoryItem } from '../../services/commission-rules.service';
import { Modal } from '../ui/Modal';

interface Member {
  collaboratorId: string;
  fullName: string;
  validRevenue: string;
  validOrdersCount: number;
  estimatedTotalBonus: string;
}
interface Team { members: Member[]; errors?: { message: string }[] }
type Action = { kind: 'settle' } | { kind: 'approve' | 'payout'; row: SettlementHistoryItem };
const money = (value: string | number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const button = 'min-h-11 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-semibold text-[#8C6226] disabled:cursor-not-allowed disabled:opacity-50';
const statusLabel: Record<string, string> = { PENDING: 'Chờ duyệt thưởng', APPROVED: 'Chờ cộng ví', PAID: 'Đã cộng ví', REVERSED: 'Đã thu hồi' };
const vnMonth = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date());

export function ShopMonthlyBonusPanel({ storeId }: { storeId: string }) {
  const [month, setMonth] = useState(vnMonth);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [history, setHistory] = useState<SettlementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setTeam(null); setHistory([]); setRules([]);
    if (!storeId || !/^\d{4}-\d{2}$/.test(month)) { setLoading(false); return; }
    Promise.all([service.getRules(storeId), service.getTeamProgress(storeId, month), service.getSettlementHistory(storeId, month)])
      .then(([nextRules, nextTeam, nextHistory]) => {
        if (!Array.isArray(nextRules) || !Array.isArray(nextTeam?.members) || !Array.isArray(nextHistory)) throw new Error('Dữ liệu thưởng tháng chưa đúng cấu trúc.');
        if (active) { setRules(nextRules); setTeam(nextTeam); setHistory(nextHistory); }
      }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Không tải được kỳ thưởng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId, month, revision]);

  const execute = async () => {
    if (!action || busy) return;
    setBusy(true); setError('');
    try {
      const response = action.kind === 'settle' ? await service.settleAll(storeId, month)
        : action.kind === 'approve' ? await service.approveSettlement(storeId, action.row.id)
          : await service.payoutSettlement(storeId, action.row.id);
      setAction(null); setRevision((n) => n + 1);
      setResult(response.message || 'Đã cập nhật kỳ thưởng.');
    } catch (err: unknown) {
      setAction(null);
      setError(err instanceof Error ? err.message : 'Chưa xác định kết quả. Hãy tải lại trước khi thực hiện tiếp.');
    } finally { setBusy(false); }
  };

  return <section className="space-y-4 text-[#1A1612]">
    <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Trophy className="text-[#B88E4F]" /><div><h3 className="font-bold">Thưởng mốc tháng · FR-09</h3><p className="mt-1 text-xs text-[#7D715E]">Theo doanh số sạch và chính sách đã lưu của từng kỳ.</p></div></div>
        <label className="flex items-center gap-2 rounded-xl border border-[#EAE4D7] p-2 text-sm"><CalendarDays size={18} className="text-[#B88E4F]" /><span className="sr-only">Kỳ thưởng</span><input aria-label="Kỳ thưởng" type="month" value={month} max={vnMonth()} disabled={busy} onChange={(e) => { setResult(''); setMonth(e.target.value); }} /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] pt-4">
        <p className="max-w-2xl text-xs leading-relaxed text-[#7D715E]">Tự động xử lý từ ngày 15 tháng kế tiếp. Chốt thủ công chỉ dành cho kỳ đã kết thúc; duyệt thưởng rồi cộng ví là hai bước riêng.</p>
        <button className={button} disabled={loading || busy || !!error || !team || month >= vnMonth() || !team.members.some((m) => Number(m.estimatedTotalBonus) > 0 && !history.some((h) => h.collaboratorId === m.collaboratorId))} onClick={() => setAction({ kind: 'settle' })}>Quyết toán mốc thưởng tháng</button>
      </div>
      {month >= vnMonth() && <p className="mt-2 text-xs text-[#7D715E]">Kỳ chưa kết thúc: đang theo dõi, chưa được chốt.</p>}
    </div>
    {loading && <p role="status" className="p-4 text-sm text-[#7D715E]">Đang tải chính sách và dữ liệu kỳ thưởng…</p>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-600">{error} <button className="ml-2 underline" onClick={() => setRevision((n) => n + 1)}>Tải lại</button></div>}
    {result && <p role="status" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm">{result}</p>}
    {!loading && !error && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rules.filter((r) => r.isActive).map((r) => <div key={r.id} className="rounded-2xl border border-[#EAE4D7] bg-white p-4"><h4 className="font-semibold">{r.name}</h4><p className="mt-3 text-xs text-[#7D715E]">Doanh số từ {money(r.minMonthlyRevenue)}</p><p className="mt-1 font-bold tabular-nums text-[#8C6226]">{Number(r.bonusPercentage) > 0 ? `${r.bonusPercentage}% doanh số sạch` : money(r.achievementBonus)}</p></div>)}</div>
      {!rules.some((r) => r.isActive) && <p className="text-sm text-[#7D715E]">Shop chưa có mốc thưởng đang áp dụng.</p>}
      <div className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
        <h4 className="border-b border-[#EAE4D7] p-4 font-bold">Đối soát KOL · {month}</h4>
        <p className="px-4 pt-3 text-xs text-[#7D715E]">Các thẻ trên là chính sách hiện tại. Kết quả dưới dùng chính sách của kỳ đã chọn; tiền dự tính chưa phải tiền đã cộng ví.</p>
        {team?.errors?.map((e, i) => <p key={i} role="alert" className="p-4 text-sm text-red-600">{e.message}</p>)}
        <div className="divide-y divide-[#EAE4D7]">{team?.members.map((m) => {
          const row = history.find((h) => h.collaboratorId === m.collaboratorId);
          return <div key={m.collaboratorId} className="grid items-center gap-4 p-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div><strong className="text-sm">{m.fullName}</strong><p className="mt-1 text-xs text-[#7D715E]">{m.validOrdersCount} đơn hợp lệ</p></div>
            <div><p className="text-xs text-[#7D715E]">Doanh số sạch</p><p className="mt-1 font-semibold tabular-nums">{money(row?.validRevenue ?? m.validRevenue)}</p></div>
            <div><p className="text-xs text-[#7D715E]">{row ? 'Thưởng đã chốt' : 'Thưởng dự tính'}</p><p className="mt-1 font-semibold tabular-nums text-[#8C6226]">{money(row?.bonusAmount ?? m.estimatedTotalBonus)}</p></div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[#7D715E]">{row ? statusLabel[row.status] || row.status : 'Chưa chốt'}</span>{row && ['PENDING', 'APPROVED'].includes(row.status) && <button disabled={busy} className={button} onClick={() => setAction({ kind: row.status === 'PENDING' ? 'approve' : 'payout', row })}>{row.status === 'PENDING' ? 'Duyệt thưởng' : 'Cộng vào ví'}</button>}</div>
          </div>;
        })}</div>
        {!team?.members.length && <p className="p-5 text-sm text-[#7D715E]">Chưa có đối tác có dữ liệu tiến độ trong kỳ.</p>}
      </div>
      <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4"><h4 className="font-bold">Lịch sử kỳ thưởng · {history.length} kết quả</h4>{history.map((row) => <div key={row.id} className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#EAE4D7] pt-3 text-sm"><span>{row.collaboratorName} · {row.appliedRuleName || 'Không đạt mốc'}</span><span>{money(row.bonusAmount)} · {statusLabel[row.status] || row.status}</span></div>)}{!history.length && <p className="mt-2 text-sm text-[#7D715E]">Chưa có kết quả đã chốt cho tháng này.</p>}</div>
    </>}
    {action && <Modal isOpen onClose={() => { if (!busy) setAction(null); }} title={action.kind === 'settle' ? 'Xác nhận chốt kỳ thưởng' : action.kind === 'approve' ? 'Duyệt thưởng tháng' : 'Cộng thưởng vào ví KOL'} maxWidth="md"><div className="space-y-4 p-5"><p className="text-sm leading-relaxed">{action.kind === 'settle' ? `Chốt tháng ${month} cho các KOL đủ điều kiện. Thao tác này lưu kết quả tính thưởng, chưa cộng tiền vào ví.` : `${action.row.collaboratorName} · ${action.row.yearMonth} · ${money(action.row.bonusAmount)}. ${action.kind === 'approve' ? 'Duyệt kết quả đã chốt, chưa cộng ví.' : 'Ghi bút toán thưởng và cộng số tiền này vào ví khả dụng.'}`}</p><div className="flex justify-end gap-3"><button disabled={busy} className={button} onClick={() => setAction(null)}>Hủy</button><button disabled={busy} className={button} onClick={() => void execute()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div></div></Modal>}
  </section>;
}
