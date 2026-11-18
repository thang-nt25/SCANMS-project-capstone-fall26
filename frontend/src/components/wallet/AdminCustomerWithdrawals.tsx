import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Copy, FileText, Loader2, Search, X, XCircle } from 'lucide-react';
import { customerWithdrawals, type CustomerWithdrawal, type WithdrawalPage } from '../../services/customer-withdrawals.service';
import { withdrawalButtonClass, withdrawalInputClass, withdrawalCode, withdrawalMoney, withdrawalStatus } from './CustomerWithdrawals';
import { PayoutBankAccount } from './PayoutBankAccount';
import { Modal } from '../ui/Modal';
import { PayoutCompactSummary, PayoutProofField } from './PayoutCompactFields';
import { toast } from '../../utils/toast';

export default function AdminCustomerWithdrawals({ onChanged }: { onChanged?: () => void } = {}) {
  const [data, setData] = useState<WithdrawalPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  useEffect(() => { const timer = setTimeout(() => { setPage(1); setQuery(search.trim()); }, 300); return () => clearTimeout(timer); }, [search]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerWithdrawal | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const next = await customerWithdrawals.list(true, page, status, query);
      if (version === requestVersion.current) { setData(next); setError(''); }
    } catch { if (version === requestVersion.current) setError('Không tải được yêu cầu rút tiền Customer.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [page, status, query]);
  useEffect(() => { void load(); return () => { requestVersion.current++; }; }, [load]);
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success('Đã sao chép đầy đủ'); }
    catch { toast.error('Không thể sao chép. Vui lòng chọn mã để sao chép thủ công.'); }
  };
  const open = (row: CustomerWithdrawal, next: 'approve' | 'reject') => {
    setSelected(row); setAction(next); setFile(null); setReference(''); setNote('');
  };
  const submit = async () => {
    if (!selected || lock.current) return;
    if (action === 'approve' && (!file || !reference.trim())) return;
    if (action === 'reject' && note.trim().length < 5) return;
    lock.current = true; setBusy(true);
    try {
      if (action === 'approve') await customerWithdrawals.approve(selected.id, file!, reference.trim().toUpperCase(), note.trim());
      else await customerWithdrawals.reject(selected.id, note.trim());
      setSelected(null); toast.success(action === 'approve' ? 'Đã ghi nhận chuyển khoản' : 'Đã từ chối và hoàn tiền về ví');
      onChanged?.();
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không xử lý được yêu cầu'); }
    finally { lock.current = false; setBusy(false); }
  };
  const proof = async (row: CustomerWithdrawal) => {
    const tab = window.open('about:blank', '_blank'); if (tab) tab.opener = null;
    try { const url = await customerWithdrawals.proof(row.id, true); if (tab) tab.location.href = url; }
    catch { tab?.close(); toast.error('Không tải được chứng từ'); }
  };
  const tabs = [
    { value: '', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'PROCESSING', label: 'Đang xử lý' },
    { value: 'APPROVED', label: 'Hoàn tất' },
    { value: 'REJECTED', label: 'Từ chối' },
  ];
  const metrics = [
    { key: 'PENDING', label: 'Chờ duyệt', caption: 'yêu cầu chờ duyệt', icon: Clock3 },
    { key: 'PROCESSING', label: 'Đang xử lý', caption: 'lệnh đang xử lý', icon: Loader2 },
    { key: 'APPROVED', label: 'Đã hoàn tất', caption: 'lệnh đã xác nhận chuyển khoản', icon: CheckCircle2 },
    { key: 'REJECTED', label: 'Đã từ chối', caption: 'yêu cầu đã từ chối', icon: XCircle },
  ] as const;
  return <section className="grid gap-5 text-[#1A1612]">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => {
        const total = data?.summary?.[metric.key];
        const Icon = metric.icon;
        return <div key={metric.key} className="flex min-h-36 flex-col justify-between rounded-2xl border border-[#EAE4D7] bg-white p-5">
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-[#7D715E]">{metric.label}</span><span className="rounded-xl bg-[#FBF5EB] p-2 text-[#8F682E]"><Icon size={18}/></span></div>
          <div className="mt-4"><strong className="block text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{!data ? '—' : metric.key === 'REJECTED' ? (total?.count ?? 0).toLocaleString('vi-VN') : withdrawalMoney(total?.amount ?? '0')}</strong><p className="mb-0 mt-2 text-xs text-[#7D715E]">{!data ? 'Đang tải thống kê…' : `${total?.count ?? 0} ${metric.caption}`}</p></div>
        </div>;
      })}
    </div>
    <div className="finance-customer-table overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
      <div className="customer-withdrawal-toolbar">
        <div role="group" aria-label="Lọc trạng thái yêu cầu" className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">{tabs.map(tab => <button key={tab.value} aria-pressed={status === tab.value} onClick={() => { setPage(1); setStatus(tab.value); }} className={`min-h-11 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors ${status === tab.value ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#805B27]' : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'}`}>{tab.label}</button>)}</div>
        <label className="relative block w-full"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]"/><input aria-label="Tìm tên khách, số tài khoản hoặc mã yêu cầu" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên khách, STK, mã yêu cầu…" className={`${withdrawalInputClass} !min-h-11 !pl-10 !pr-9`}/>{search && <button aria-label="Xóa tìm kiếm" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#7D715E]"><X size={15}/></button>}</label>
      </div>
    {error ? <p role="alert">{error} <button onClick={() => void load()} className="underline">Thử lại</button></p> : loading ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-[#7D715E]"><Loader2 size={18} className="animate-spin"/>Đang tải yêu cầu…</p> : !data?.items.length ? <p className="px-5 py-10 text-sm text-[#7D715E]">Không có yêu cầu phù hợp với bộ lọc.</p> : <div className="overflow-x-auto border-t border-[#EAE4D7]">
      <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">Danh sách yêu cầu rút tiền của khách hàng</caption>
        <thead className="bg-[#FAF8F5] text-[#7D715E]"><tr>
          <th scope="col" className="w-[15%] px-4 py-4 font-medium">Mã / Ngày</th>
          <th scope="col" className="w-[18%] px-4 py-4 font-medium">Khách hàng</th>
          <th scope="col" className="w-[21%] px-4 py-4 font-medium">Tài khoản thụ hưởng</th>
          <th scope="col" className="w-[13%] px-4 py-4 text-right font-medium">Số tiền rút</th>
          <th scope="col" className="w-[13%] px-4 py-4 font-medium">Trạng thái</th>
          <th scope="col" className="w-[20%] px-4 py-4 text-center font-medium">Thao tác</th>
        </tr></thead>
        <tbody>{data.items.map(row => {
          const created = new Date(row.createdAt);
          const StatusIcon = row.status === 'APPROVED' ? CheckCircle2 : row.status === 'REJECTED' ? XCircle : Clock3;
          return <tr key={row.id} className="border-t border-[#EAE4D7] align-top transition-colors hover:bg-[#FAF8F5]/60">
            <td className="px-4 py-4"><div className="flex items-center gap-1"><span title={`RKH-${row.id.toUpperCase()}`} className="font-mono text-xs font-semibold">{withdrawalCode(row)}</span><button title="Sao chép mã yêu cầu đầy đủ" aria-label="Sao chép mã yêu cầu đầy đủ" onClick={() => void copy(`RKH-${row.id.toUpperCase()}`)} className="rounded p-1 text-[#7D715E] hover:bg-[#F3EFE6]"><Copy size={13}/></button></div><time dateTime={row.createdAt} className="mt-2 block whitespace-nowrap text-xs tabular-nums text-[#7D715E]">{created.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{' · '}{created.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</time></td>
            <td className="px-4 py-4"><strong className="block break-words">{row.customer?.fullName || 'Khách mua hàng'}</strong><span title={row.customer?.email} className="mt-2 block truncate whitespace-nowrap text-xs text-[#7D715E]">{row.customer?.email || 'Chưa có email'}</span></td>
            <td className="px-4 py-4"><PayoutBankAccount bankName={row.bankName} accountNumber={row.bankAccountNumber} accountName={row.bankAccountName}/></td>
            <td className="px-4 py-4 text-right"><strong className="whitespace-nowrap tabular-nums">{withdrawalMoney(row.amount)}</strong></td>
            <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${row.status === 'REJECTED' ? 'border-red-200 text-red-600' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#7D715E]'}`}><StatusIcon size={14} className="shrink-0"/>{row.status === 'APPROVED' ? 'Hoàn tất' : withdrawalStatus[row.status]}</span>{row.bankRefCode && <div className="mt-2 text-xs text-[#7D715E]"><span className="block">Mã ngân hàng</span><div className="mt-1 flex items-start gap-1"><span className="break-all font-mono">{row.bankRefCode}</span><button aria-label="Sao chép mã ngân hàng" onClick={() => void copy(row.bankRefCode!)} className="shrink-0 rounded p-1 hover:bg-[#F3EFE6]"><Copy size={12}/></button></div></div>}{row.status === 'REJECTED' && row.note && <span className="mt-2 block break-words text-xs text-[#7D715E]">{row.note}</span>}</td>
            <td className="px-3 py-4"><div className={row.status === 'PENDING' ? 'customer-payout-actions' : 'flex flex-col gap-2'}>{row.status === 'PENDING' ? <><button className={`${withdrawalButtonClass} !px-2 !text-xs hover:!bg-[#F3EFE6]`} title="Xác nhận chuyển khoản" aria-label="Xác nhận chuyển khoản" onClick={() => open(row, 'approve')}>Xác nhận</button><button className="min-h-10 rounded-xl border border-red-200 bg-white px-2 text-xs font-medium text-red-600" onClick={() => open(row, 'reject')}>Từ chối</button></> : <span className="inline-flex items-center justify-center gap-1 text-xs text-[#7D715E]"><StatusIcon size={14}/>{row.status === 'PROCESSING' ? 'Đang xử lý' : 'Đã xử lý'}</span>}{row.hasProof && <button className={`${withdrawalButtonClass} !px-2 !text-xs hover:!bg-[#F3EFE6]`} onClick={() => void proof(row)}><FileText size={14}/>Chứng từ</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
      <div className="border-t border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3 text-xs text-[#7D715E]">{data.total} yêu cầu{status ? ` · ${withdrawalStatus[status as CustomerWithdrawal['status']]}` : ''}</div>
    </div>}
    </div>
    {!loading && !error && data && data.total > data.limit && <div className="flex items-center justify-end gap-3"><button disabled={page === 1} className={withdrawalButtonClass} onClick={() => setPage(page - 1)}>Trước</button><span className="text-sm">Trang {page}</span><button disabled={page * data.limit >= data.total} className={withdrawalButtonClass} onClick={() => setPage(page + 1)}>Sau</button></div>}
    {selected && <Modal isOpen onClose={() => { if (!lock.current) setSelected(null); }} title={action === 'approve' ? 'Xác nhận chuyển khoản' : 'Từ chối yêu cầu'} className="payout-review-dialog finance-approval-modal" maxWidth="2xl" stickyHeader footer={
      <div className="payout-review-actions">
        <button disabled={busy} className="payout-secondary" onClick={() => setSelected(null)}>Hủy</button>
        <button disabled={busy || (action === 'approve' ? !file || !reference.trim() : note.trim().length < 5)} className="payout-primary" onClick={() => void submit()}>{busy && <Loader2 size={15} className="animate-spin"/>}{action === 'approve' ? 'Xác nhận' : 'Từ chối và hoàn tiền'}</button>
      </div>
    }>
      <div className="payout-review-content">
        <PayoutCompactSummary name={selected.customer?.fullName || 'Khách mua hàng'} code={withdrawalCode(selected)} amount={selected.amount} bankName={selected.bankName} accountNumber={selected.bankAccountNumber} accountName={selected.bankAccountName}/>
        {action === 'approve' ? <>
          <div className="compact-payout-fields">
            <label className="compact-payout-field">Mã giao dịch ngân hàng *<input value={reference} disabled={busy} placeholder="Nhập mã giao dịch trên chứng từ" maxLength={100} onChange={event => setReference(event.target.value)}/></label>
            <PayoutProofField file={file} disabled={busy} webp onChange={next => {
              if (next && (!next.size || next.size > 5 * 1024 * 1024)) { toast.error('Chứng từ phải từ 1 byte đến 5 MB'); setFile(null); }
              else if (next && !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(next.type)) { toast.error('Chọn ảnh hoặc PDF'); setFile(null); }
              else setFile(next);
            }}/>
          </div>
          <details className="compact-payout-note"><summary>+ Thêm ghi chú</summary><label className="compact-payout-field"><span className="sr-only">Ghi chú nội bộ</span><input disabled={busy} placeholder="Ghi chú nội bộ" maxLength={500} value={note} onChange={event => setNote(event.target.value)}/></label></details>
        </> : <label className="compact-payout-field">Lý do từ chối *<textarea rows={2} disabled={busy} maxLength={500} value={note} onChange={event => setNote(event.target.value)}/></label>}
      </div>
    </Modal>}
  </section>;
}
