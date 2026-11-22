import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { PayoutEvidenceDialog } from './PayoutEvidenceDialog';

export const accountLabels: Record<string, string> = {
  PARTNER_EARNINGS_PAYABLE: 'Thu nhập khả dụng', AFFILIATE_ESCROW: 'Thu nhập bảo chứng',
  CUSTOMER_FUNDS: 'Tiền mua hàng', PAYOUT_RESERVED: 'Tiền giữ chi trả KOL',
  CORPORATE_BANK: 'Thực chi KOL + Customer', PIT_TAX_PAYABLE: 'Thuế TNCN phải nộp',
  BIDV_SANDBOX_BANK: 'Chi trả thử nghiệm cũ', SANDBOX_PIT_PAYABLE: 'Thuế thử nghiệm cũ',
};
export type Reconciliation = { yearMonth?: string; balanced: boolean; items: { account: string; walletAmount: string; bookAmount: string; difference: string }[] };
type EvidenceRow = { id: string; referenceId: string | null; referenceType: string; createdAt: string; amount: string; signedAmount?: string; debitAccount?: string; creditAccount?: string; status?: string; payout?: { processedAt: string | null; createdAt: string; status: string } | null };
type Details = { yearMonth: string; account: string; page: number; book: EvidenceRow[]; source: EvidenceRow[]; bookCount: number; sourceCount: number; hasMore: boolean };
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const referenceLabels: Record<string, string> = { PAYOUT_REQUEST: 'Rút tiền KOL', PAYOUT_SANDBOX: 'Chi trả thử nghiệm cũ', CUSTOMER_WITHDRAWAL: 'Rút tiền Customer', COMMISSION: 'Thù lao', MONTHLY_BONUS: 'Thưởng tháng', ORDER_PAYMENT: 'Thanh toán đơn', ORDER_REFUND: 'Hoàn tiền đơn', WALLET_RECONCILIATION: 'Điều chỉnh ví', TOPUP_PAYOS: 'Nạp ví', TOPUP_DEMO: 'Nạp ví thử nghiệm' };

export function LedgerReconciliation({ report, month }: { report: Reconciliation; month: string }) {
  const differences = report.items.filter(row => Number(row.difference) !== 0);
  const [account, setAccount] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [payoutId, setPayoutId] = useState<string | null>(null);
  useEffect(() => { setAccount(null); setPage(1); setPayoutId(null); }, [month]);
  useEffect(() => {
    if (!account) return;
    let live = true; setDetails(null); setError('');
    api.get('/admin/payouts/ledger-reconciliation/details', { params: { yearMonth: month, account, page }, headers: { 'x-skip-cache': 'true' } })
      .then(response => { if (live) setDetails(response.data?.data ?? response.data); })
      .catch(() => { if (live) setError('Không tải được chứng từ đối soát.'); });
    return () => { live = false; };
  }, [account, month, page, retry]);
  const open = (value: string) => { setPage(1); setAccount(value); };
  const selected = report.items.find(row => row.account === account);
  return <div className="reconciliation-panel">
    <button type="button" className={`reconciliation-status ${differences.length ? 'has-differences' : ''}`} onClick={() => open(differences[0]?.account ?? report.items[0].account)}>
      {differences.length ? <AlertCircle size={19}/> : <CheckCircle2 size={19}/>}
      <span><strong>{differences.length ? `${differences.length}/${report.items.length} tài khoản cần đối soát` : 'Các tài khoản đã khớp trong kỳ'}</strong><small>Tháng {month.split('-').reverse().join('/')} · Chênh lệch = Sổ cái − Nghiệp vụ</small></span>
      <span className="reconciliation-status-action">Xem phát sinh <ArrowRight size={16}/></span>
    </button>
    <div className="reconciliation-table-scroll"><table className="reconciliation-table"><thead><tr><th>Tài khoản</th><th>Nghiệp vụ</th><th>Sổ cái</th><th>Chênh lệch</th><th aria-label="Xem phát sinh"/></tr></thead><tbody>
      {report.items.map(row => <tr key={row.account}>
        <td><button type="button" onClick={() => open(row.account)}>{accountLabels[row.account] ?? row.account}</button></td>
        <td>{money(row.walletAmount)}</td><td>{money(row.bookAmount)}</td>
        <td><button type="button" className={Number(row.difference) !== 0 ? 'reconciliation-difference' : 'reconciliation-matched'} onClick={() => open(row.account)}>{money(row.difference)}</button></td>
        <td><button type="button" aria-label={`Xem phát sinh ${accountLabels[row.account]}`} onClick={() => open(row.account)}><ArrowRight size={16}/></button></td>
      </tr>)}
    </tbody></table></div>
    <p className="reconciliation-caption">Theo ngày ghi nhận, giờ Việt Nam · Giữ riêng các tài khoản thử nghiệm cũ.</p>
    {account && <Modal isOpen title="Chi tiết đối soát" subtitle={`Tháng ${month.split('-').reverse().join('/')} · ${accountLabels[account]}`} onClose={() => setAccount(null)} maxWidth="4xl" stickyHeader footer={<div className="reconciliation-pagination"><span>Trang {page}</span><button type="button" disabled={page === 1 || !details} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/>Trước</button><button type="button" disabled={!details?.hasMore} onClick={() => setPage(value => value + 1)}>Sau<ChevronRight size={16}/></button></div>}>
      <div className="reconciliation-detail">
        <label>Tài khoản<select aria-label="Tài khoản đối soát" value={account} onChange={event => open(event.target.value)}>{report.items.map(row => <option key={row.account} value={row.account}>{accountLabels[row.account]}</option>)}</select></label>
        {selected && <dl className="reconciliation-detail-totals">{[['Nghiệp vụ', selected.walletAmount], ['Sổ cái', selected.bookAmount], ['Chênh lệch', selected.difference]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}</dl>}
        <p className="reconciliation-caption">So ngày nghiệp vụ với ngày ghi sổ để xác định lệch kỳ hoặc thiếu bút toán. Chưa tự điều chỉnh dữ liệu.</p>
        {error ? <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></p> : !details ? <p role="status">Đang tải phát sinh…</p> : <div className="reconciliation-evidence-columns">
          {([{ title: 'Chứng từ nghiệp vụ', rows: details.source, count: details.sourceCount, book: false }, { title: 'Bút toán sổ cái', rows: details.book, count: details.bookCount, book: true }]).map(group => <section key={group.title}><h4>{group.title}<span>{group.count}</span></h4>
            {!group.rows.length && <p className="reconciliation-empty">Không có phát sinh trên trang này trong kỳ.</p>}
            {group.rows.map(row => <article key={row.id} className="reconciliation-evidence-row"><div><strong>{referenceLabels[row.referenceType] ?? row.referenceType}</strong><b>{money(row.signedAmount ?? row.amount)}</b></div><time>{date(row.createdAt)}</time>
              {group.book && <p>Nợ: {accountLabels[row.debitAccount!] ?? row.debitAccount}<br/>Có: {accountLabels[row.creditAccount!] ?? row.creditAccount}</p>}
              <code title={row.referenceId ?? row.id}>{row.referenceId ?? row.id}</code>
              {row.payout && <p className="reconciliation-origin">Lệnh tạo: {date(row.payout.createdAt)}<br/>{row.payout.processedAt ? `Lệnh xử lý: ${date(row.payout.processedAt)}` : 'Lệnh chưa có ngày xử lý'}</p>}
              {row.referenceId && ['PAYOUT_REQUEST', 'PAYOUT_SANDBOX'].includes(row.referenceType) && <button type="button" onClick={() => setPayoutId(row.referenceId)}>Xem hồ sơ chi trả <ArrowRight size={14}/></button>}
            </article>)}
          </section>)}
        </div>}
      </div>
    </Modal>}
    {payoutId && <PayoutEvidenceDialog id={payoutId} onClose={() => setPayoutId(null)}/>}
  </div>;
}
