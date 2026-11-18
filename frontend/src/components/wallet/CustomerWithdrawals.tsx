import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, CheckCircle2, Clock, Copy, FileText, Loader2 } from 'lucide-react';
import { customerWithdrawals, type CustomerWithdrawal, type WithdrawalPage } from '../../services/customer-withdrawals.service';
import { BankSelectTrigger } from '../bank/BankSelectTrigger';
import { toast } from '../../utils/toast';
import { findBankByQuery, VIETNAM_BANKS } from '../../config/banks.config';

export const withdrawalMoney = (value: string | number) => `${Number(value).toLocaleString('vi-VN')} đ`;
export const withdrawalCode = (row: CustomerWithdrawal) => `RKH-${row.id.slice(0, 8).toUpperCase()}`;
export const withdrawalStatus = { PENDING: 'Chờ duyệt', PROCESSING: 'Đang xử lý', APPROVED: 'Đã chuyển khoản', REJECTED: 'Đã từ chối' };
export const withdrawalInputClass = 'w-full min-h-12 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2.5 text-sm text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]';
export const withdrawalButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2.5 text-sm font-semibold text-[#1A1612] disabled:opacity-50 disabled:cursor-not-allowed';

const historyDate = (value: string) => new Date(value).toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function WithdrawalHistoryCard({ row, onViewProof }: { row: CustomerWithdrawal; onViewProof: () => void }) {
  const normalizeBank = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const bank = findBankByQuery(row.bankName) || VIETNAM_BANKS.find(item => normalizeBank(item.name) === normalizeBank(row.bankName));
  const bankName = bank?.shortName || row.bankName;
  const copyReference = async () => {
    try { await navigator.clipboard.writeText(row.bankRefCode!); toast.success('Đã sao chép mã giao dịch'); }
    catch { toast.error('Không sao chép được mã giao dịch'); }
  };
  return <article id={`customer-withdrawal-${row.id}`} tabIndex={-1} className="customer-withdrawal-card" aria-label={`Yêu cầu ${withdrawalCode(row)}`}>
    <header className="customer-withdrawal-card-heading">
      <div className="customer-withdrawal-card-code"><span aria-hidden="true"><ArrowUpRight size={17}/></span><strong>{withdrawalCode(row)}</strong></div>
      <span className={`customer-withdrawal-card-status ${row.status === 'REJECTED' ? 'is-rejected' : ''}`}>{withdrawalStatus[row.status]}</span>
    </header>
    <div className="customer-withdrawal-card-columns">
      <section><h4>Số tiền rút</h4><strong className="customer-withdrawal-card-amount">{withdrawalMoney(row.amount)}</strong><p className="customer-withdrawal-card-muted">Gửi lúc <time dateTime={row.createdAt}>{historyDate(row.createdAt)}</time></p></section>
      <section><h4>Tài khoản nhận</h4><p className="customer-withdrawal-card-bank"><Building2 size={16} aria-hidden="true"/>{bankName}</p><p className="customer-withdrawal-card-account">{row.bankAccountNumber}</p><p className="customer-withdrawal-card-muted">{row.bankAccountName}</p></section>
      <section><h4>Thông tin chuyển khoản</h4>{row.bankRefCode ? <div className="customer-withdrawal-card-reference"><span>{row.bankRefCode}</span><button type="button" onClick={() => void copyReference()} aria-label="Sao chép mã giao dịch ngân hàng" title="Sao chép mã giao dịch"><Copy size={14}/></button></div> : <p className="customer-withdrawal-card-muted">{row.status === 'REJECTED' ? 'Không phát sinh chuyển khoản' : 'Chưa có mã giao dịch'}</p>}{row.processedAt && <p className="customer-withdrawal-card-muted">{row.status === 'APPROVED' ? 'Hoàn tất' : 'Xử lý lúc'} <time dateTime={row.processedAt}>{historyDate(row.processedAt)}</time></p>}</section>
    </div>
    {(row.status === 'REJECTED' || row.hasProof) && <footer className="customer-withdrawal-card-footer">{row.status === 'REJECTED' && <p className="customer-withdrawal-card-reason">{row.note && <span>{row.note} · </span>}Đã hoàn tiền về ví.</p>}{row.hasProof && <button type="button" onClick={onViewProof}><FileText size={15}/>Xem chứng từ</button>}</footer>}
  </article>;
}

export function WithdrawalDetails({ row }: { row: CustomerWithdrawal }) {
  return <div className="grid gap-2 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-mono text-xs">{withdrawalCode(row)}</strong><span className={`rounded-lg border px-2.5 py-1 text-xs ${row.status === 'REJECTED' ? 'border-red-200 text-red-700' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]'}`}>{withdrawalStatus[row.status]}</span></div>
    <div className="flex items-baseline justify-between gap-3"><span className="text-[#7D715E]">Số tiền rút</span><strong className="text-xl tabular-nums">{withdrawalMoney(row.amount)}</strong></div>
    <p className="m-0 break-words text-[#7D715E]">{row.bankName} · {row.bankAccountNumber}</p>
    <p className="m-0 text-xs">{row.bankAccountName}</p>
    <time className="text-xs text-[#7D715E]">{new Date(row.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
    {row.bankRefCode && <p className="m-0 break-all text-xs text-[#7D715E]">Tham chiếu: {row.bankRefCode}</p>}
    {row.status === 'REJECTED' && row.note && <p className="m-0 text-sm text-red-700">{row.note} · Đã hoàn tiền về ví.</p>}
  </div>;
}

export default function CustomerWithdrawals({ balance, onChanged, onSubmitted }: { balance: number; onChanged: () => Promise<void>; onSubmitted?: (withdrawal: CustomerWithdrawal) => void }) {
  const [bankName, setBankName] = useState('');
  const [account, setAccount] = useState('');
  const [holder, setHolder] = useState('');
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const valid = Number.isSafeInteger(Number(amount)) && Number(amount) >= 200000 && Number(amount) <= balance && /^\d{6,30}$/.test(account) && holder.trim().length >= 2 && bankName && confirmed;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!valid || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    const input = { amount: Number(amount), bankName, bankAccountNumber: account, bankAccountName: holder.trim().toUpperCase() };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload) retry.current = { payload, key: crypto.randomUUID() };
    try {
      const withdrawal = await customerWithdrawals.create({ ...input, requestKey: retry.current.key });
      retry.current = null; setAmount(''); setConfirmed(false);
      toast.success('Đã gửi yêu cầu. Tiền được giữ để chờ duyệt.');
      await Promise.allSettled([onChanged()]);
      onSubmitted?.(withdrawal);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không gửi được yêu cầu'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <div className="grid gap-5 p-4 sm:p-6">
    <div className="grid items-stretch gap-5 lg:grid-cols-2">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3"><Building2 size={21} className="text-[#B88E4F]"/><div><h3 className="m-0 text-base font-bold">Rút về ngân hàng</h3><p className="m-0 mt-1 text-xs text-[#7D715E]">Tối thiểu 200.000 đ · Không khấu trừ thuế thù lao</p></div></div>
        <BankSelectTrigger
          label="Ngân hàng nhận tiền"
          value={bankName}
          onChange={(name, bank) => setBankName(bank?.name || name)}
          placeholder="Chọn ngân hàng nhận tiền"
          disabled={busy}
        />
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Số tài khoản<input required inputMode="numeric" autoComplete="off" maxLength={30} value={account} onChange={e => setAccount(e.target.value.replace(/\D/g, ''))} className={withdrawalInputClass}/></label><label className="grid gap-1.5 text-sm font-medium">Chủ tài khoản<input required maxLength={150} value={holder} onChange={e => setHolder(e.target.value)} className={`${withdrawalInputClass} uppercase`}/></label></div>
        <label className="grid gap-1.5 text-sm font-medium"><span className="flex justify-between gap-2">Số tiền rút<button type="button" onClick={() => setAmount(String(balance))} className="text-xs text-[#B88E4F]">Rút toàn bộ</button></span><input required inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Từ 200.000 đ" className={withdrawalInputClass}/></label>
        <label className="flex items-start gap-2 text-xs leading-5 text-[#7D715E]"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-[#C59B58]"/>Tôi đã kiểm tra đúng tài khoản nhận tiền và số tiền muốn rút.</label>
        <button disabled={!valid || busy} className={withdrawalButtonClass}>{busy ? <Loader2 size={17} className="animate-spin"/> : <ArrowUpRight size={17}/>}Gửi yêu cầu rút tiền</button>
      </form>
      <aside className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5" aria-label="Thông tin rút tiền">
        <div className="rounded-xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm text-[#7D715E]"><Building2 size={18} className="text-[#B88E4F]"/>Số dư có thể rút</div>
          <strong className="mt-3 block break-words text-3xl font-bold tracking-tight tabular-nums">{withdrawalMoney(balance)}</strong>
          <p className="m-0 mt-2 text-xs text-[#7D715E]">Từ ví mua sắm về tài khoản ngân hàng</p>
        </div>
        <ol className="m-0 grid flex-1 list-none content-center gap-5 p-0">
          {[
            { icon: Clock, title: 'Gửi yêu cầu', detail: 'Số tiền được giữ lại, tạm thời không dùng mua hàng.' },
            { icon: CheckCircle2, title: 'Xác nhận chuyển khoản', detail: 'Manager/Admin duyệt sau khi chuyển tiền thủ công.' },
            { icon: ArrowUpRight, title: 'Theo dõi kết quả', detail: 'Xem tại Lịch sử ví → Yêu cầu rút tiền. Nếu bị từ chối, tiền trở về ví.' },
          ].map(({ icon: Icon, title, detail }, index) => <li key={title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-white text-[#B88E4F]"><Icon size={19}/></span>
            <div className="min-w-0 pt-0.5"><h4 className="m-0 text-sm font-semibold">{index + 1}. {title}</h4><p className="m-0 mt-1 text-xs leading-5 text-[#7D715E]">{detail}</p></div>
          </li>)}
        </ol>
        <div className="flex items-center justify-between gap-3 border-t border-[#EEDFC6] pt-4 text-xs"><span className="text-[#7D715E]">Thuế thù lao</span><span className="font-medium">Không áp dụng cho ví mua sắm</span></div>
      </aside>
    </div>
  </div>;
}

export function CustomerWithdrawalHistory({ refreshKey, targetId }: { refreshKey: number; targetId?: string }) {
  const focusedTarget = useRef<string | undefined>(undefined);
  const [history, setHistory] = useState<WithdrawalPage | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    // Keep existing rows visible during background status refreshes.
    void customerWithdrawals.list(false, targetId ? 1 : page, '', targetId || '').then(result => {
      if (active) { setHistory(result); setError(''); }
    }).catch(() => {
      if (active) setError('Chưa tải được yêu cầu rút tiền. Vui lòng thử lại.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refreshKey, retryKey, targetId]);
  useEffect(() => {
    if (!targetId) { focusedTarget.current = undefined; return; }
    if (focusedTarget.current === targetId || loading || !history) return;
    const card = document.getElementById(`customer-withdrawal-${targetId}`);
    if (card && !card.closest('[hidden]')) {
      focusedTarget.current = targetId;
      card.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      card.focus({ preventScroll: true });
    }
  }, [targetId, loading, history]);
  const viewProof = async (id: string) => {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try { const url = await customerWithdrawals.proof(id); if (tab) tab.location.href = url; else toast.info('Cho phép mở tab mới để xem chứng từ.'); }
    catch { tab?.close(); toast.error('Không tải được chứng từ'); }
  };
  return <div className="p-4 sm:p-5">
    {targetId && <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#7D715E]"><span>Yêu cầu đang xem</span><Link to="/customer/wallet?history=withdrawals" className="text-[#8F682E] underline">Xem tất cả yêu cầu</Link></div>}
    {error ? <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm">{error}<button type="button" onClick={() => setRetryKey(key => key + 1)} className="ml-3 underline">Thử lại</button></div>
      : loading ? <div role="status" className="flex justify-center gap-2 py-6 text-sm text-[#7D715E]"><Loader2 size={18} className="animate-spin"/>Đang tải yêu cầu…</div>
      : !history?.items.length ? <div className="grid justify-items-center gap-2 py-7 text-center"><Building2 size={26} className="text-[#B88E4F]"/><strong className="text-sm">{targetId ? 'Không tìm thấy yêu cầu rút tiền này' : 'Chưa có yêu cầu rút tiền'}</strong><p className="m-0 text-xs text-[#7D715E]">{targetId ? 'Yêu cầu không tồn tại hoặc không thuộc tài khoản của bạn.' : 'Các yêu cầu và kết quả xử lý sẽ xuất hiện tại đây.'}</p></div>
      : <div className="customer-withdrawal-history-list">{history.items.map(row => <WithdrawalHistoryCard key={row.id} row={row} onViewProof={() => void viewProof(row.id)}/>)}</div>}
    {history && history.total > 10 && <div className="mt-4 flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className={withdrawalButtonClass}>Trước</button><span>Trang {page}</span><button type="button" disabled={page * 10 >= history.total || loading} onClick={() => setPage(p => p + 1)} className={withdrawalButtonClass}>Sau</button></div>}
  </div>;
}
