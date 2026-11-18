import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info, Wallet } from 'lucide-react';
import type { ReturnDetail } from '../../services/return.service';
import { returnService } from '../../services/return.service';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { canConfirmReturnCompletion } from '../../utils/return-actions';

export function CustomerRefundResult({ request }: { request: ReturnDetail }) {
  const [current, setCurrent] = useState(request);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const confirmation = useReturnAction(request.id, returnService.confirmCompletion);
  useEffect(() => { setCurrent(request); }, [request]);
  const refund = current.refund;
  if (!refund) return null;
  const paid = refund.status === 'SUCCEEDED';
  const mayConfirm = current.resolution === 'REFUND' && canConfirmReturnCompletion(current);
  const waiting = mayConfirm && !paid && refund.status !== 'PROCESSING';
  const status = paid ? 'Đã hoàn tiền' : refund.status === 'PROCESSING' ? 'Đang hoàn tiền' : waiting ? 'Chờ bạn xác nhận' : refund.status === 'FAILED' ? 'Hoàn tiền chưa thành công' : 'Chờ xử lý hoàn tiền';
  const assessment = [...current.events].reverse().find(event => event.type === 'LIABILITY_ASSESSED');
  const liability = assessment?.data?.liability;
  const liabilityLabel = liability === 'LOGISTICS_FAULT' ? 'GHN / vận chuyển' : liability === 'SHOP_FAULT' ? 'Shop / sản phẩm' : liability === 'CUSTOMER_REASON' ? 'Khách hàng' : null;
  const ruling = current.dispute?.ruling;
  const decision = ruling === 'APPROVE_REFUND' ? 'Chấp thuận hoàn tiền' : ruling === 'UPHOLD_SHOP' ? 'Giữ nguyên quyết định của Shop' : current.resolution === 'REFUND' ? 'Chấp thuận hoàn tiền' : 'Chưa có kết luận hoàn tiền';
  const notes = current.dispute?.resolutionNotes || current.inspectionNotes;
  async function confirm() {
    if (lock.current || busy || !mayConfirm) return;
    lock.current = true; setBusy(true);
    try {
      const result = await confirmation.mutateAsync(undefined) as ReturnDetail;
      if (result?.id === request.id && result.status) setCurrent(result);
    } catch { /* Preserve data and render the API error for retry. */ }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="customer-refund-result" aria-label="Kết quả hoàn tiền">
    <header><h3><Wallet size={18} aria-hidden="true" />Kết quả hoàn tiền</h3><span className="customer-refund-badge" role="status">{status}</span></header>
    <div className="customer-refund-grid"><section><h4>Khoản hoàn</h4><strong className="customer-refund-amount">{Number(refund.amount).toLocaleString('vi-VN')} ₫</strong><p>Nhận vào {refund.method === 'WALLET' ? 'Ví SCANMS' : refund.method}</p><p className="customer-refund-payment-state">{paid ? 'Đã chuyển tiền' : refund.status === 'PROCESSING' ? 'Đang xử lý chuyển tiền' : 'Chưa chuyển tiền'}</p></section>
      <section><h4>Kết quả xử lý</h4><strong className="customer-refund-decision">{decision}</strong>{liabilityLabel && <p>Trách nhiệm: {liabilityLabel}</p>}{notes && <div className="customer-refund-notes"><h5>Ghi chú quyết định</h5><p>{notes}</p></div>}
        {current.dispute?.details && <section className="customer-refund-previous"><h5>Phản hồi trước đó của Shop</h5><p>{current.dispute.details}</p></section>}
      </section></div>
    <footer><div className="customer-refund-footer-copy">{paid ? <Check size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}<div><p>{paid ? `Đã hoàn vào ${refund.method === 'WALLET' ? 'Ví SCANMS' : refund.method}` : waiting ? 'Xác nhận để nhận tiền vào ví.' : refund.status === 'FAILED' ? 'Khoản hoàn cần được xử lý lại.' : 'Đang xử lý khoản hoàn.'}</p>{paid && refund.processedAt && <time dateTime={refund.processedAt}>{new Date(refund.processedAt).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'})}</time>}</div></div>
      <div className="customer-refund-actions">{paid && refund.method === 'WALLET' && <Link to="/customer/wallet" className="customer-refund-wallet">Xem ví</Link>}{mayConfirm && <button type="button" onClick={() => void confirm()} disabled={busy || confirmation.isPending} className="customer-refund-confirm">{busy || confirmation.isPending ? 'Đang xác nhận…' : paid ? 'Xác nhận hoàn tất' : 'Đồng ý & nhận tiền hoàn'}</button>}</div>
    </footer>
    {confirmation.error && <p role="alert" className="customer-refund-error">{confirmation.error instanceof Error ? confirmation.error.message : 'Chưa xác nhận được. Vui lòng thử lại.'}</p>}
  </section>;
}
