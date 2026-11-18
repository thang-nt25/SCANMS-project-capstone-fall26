import { Copy, CheckCircle2, Clock3, AlertCircle, ReceiptText } from 'lucide-react';
import { PartnerTaxStatements } from './FinanceReports';
import { PayoutRejectionDetails } from './PayoutRejectionDetails';
import { payoutDisplayCode } from '@/utils/payout-display-code';
import type { PayoutStatus, WithdrawalHistory } from '@/types/wallet.types';

export function WithdrawalHistoryPanel({ history, loading, page, status, onStatus, onPage, onCopy, onCreateNew, canCreateNew }: {
  history: WithdrawalHistory | null; loading: boolean; page: number; status: PayoutStatus | ''; onStatus: (status: PayoutStatus | '') => void; onPage: (page: number) => void;
  onCopy: (id: string) => void; onCreateNew: () => void; canCreateNew: boolean;
}) {
  const money = (amount: string) => `${Number(amount).toLocaleString('vi-VN')} ₫`;
  const pages = Math.ceil((history?.total ?? 0) / 10);
  return <section className="wallet-withdraw-history" aria-label="Lịch sử rút tiền" aria-busy={loading}>
    <header id="wallet-withdrawal-details"><h2><ReceiptText size={19} />Lịch sử rút tiền <span>{history?.total ?? 0} yêu cầu</span></h2>
      <select value={status} onChange={e => onStatus(e.target.value as PayoutStatus | '')} aria-label="Lọc trạng thái yêu cầu rút" disabled={loading}>
        <option value="">Tất cả trạng thái</option><option value="PENDING">Chờ xử lý</option><option value="PROCESSING">Chờ chuyển khoản</option><option value="APPROVED">Hoàn tất</option><option value="REJECTED">Đã từ chối</option>
      </select>
    </header>
    <div className="wallet-withdraw-history-table"><table><thead><tr><th>Mã / Thời gian</th><th>Nguồn tiền</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {history?.requests.map(request => {
        const rejected = request.status === 'REJECTED';
        const approved = request.status === 'APPROVED';
        const sandbox = request.transferProvider === 'BIDV_SANDBOX' || Boolean(request.bankRefCode?.startsWith('SBX-'));
        const code = payoutDisplayCode(request.id, request.createdAt);
        const refunded = rejected && Number(request.refundedAmount ?? 0) > 0;
        const Icon = rejected ? AlertCircle : approved ? CheckCircle2 : Clock3;
        const label = rejected ? 'Đã từ chối' : approved ? sandbox ? 'Hoàn tất thử nghiệm' : 'Hoàn tất' : request.status === 'PROCESSING' ? 'Chờ chuyển khoản' : 'Chờ xử lý';
        return <tr key={request.id}>
          <td><div className="wallet-history-code"><strong>{code}</strong><button type="button" onClick={() => onCopy(request.id)} aria-label={`Sao chép mã ${code}`}><Copy size={13} /></button></div><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></td>
          <td>{request.store?.name || 'Toàn bộ ví khả dụng'}</td>
          <td><div className="wallet-history-money">
            {rejected ? <><span className="wallet-history-money-caption">{refunded ? 'Đã hoàn về ví' : 'Số tiền yêu cầu'}</span><strong>{money(refunded ? request.refundedAmount! : request.amount)}</strong>{!refunded && <small>Chưa xác nhận hoàn tiền</small>}</> : <><span className="wallet-history-money-caption">{approved ? sandbox ? 'Thực nhận mô phỏng' : 'Thực nhận' : 'Thực nhận dự kiến'}</span><strong>{request.taxCalculated ? money(request.netAmount) : 'Chưa xác định'}</strong><dl><div><dt>Yêu cầu</dt><dd>{money(request.amount)}</dd></div><div><dt>Thuế</dt><dd>{request.taxCalculated ? money(request.taxAmount) : 'Chưa tính'}</dd></div></dl></>}
          </div></td>
          <td><span className="wallet-history-status" data-status={request.status}><Icon size={13} />{label}</span></td>
          <td>{rejected ? <PayoutRejectionDetails reason={request.rejectedReason} amount={request.amount} refundedAmount={request.refundedAmount} code={code} onCreateNew={onCreateNew} canCreateNew={canCreateNew} /> : approved ? <PartnerTaxStatements payoutId={request.id} taxAmount={request.taxAmount} sandbox={sandbox} /> : <span className="wallet-history-muted">Đang xử lý</span>}</td>
        </tr>;
      })}
    </tbody></table></div>
    {!history?.requests.length && <p className="wallet-history-empty">{loading ? 'Đang tải yêu cầu…' : 'Chưa có yêu cầu trong trạng thái này.'}</p>}
    <footer><span>{history?.total ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, history.total)} / ${history.total} yêu cầu` : '0 yêu cầu'}</span>{pages > 1 && <div><button type="button" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Trước</button><span>Trang {page}/{pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>Sau</button></div>}</footer>
  </section>;
}
