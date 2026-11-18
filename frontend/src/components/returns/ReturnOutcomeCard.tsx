import { Clock3, ShieldCheck } from 'lucide-react';
import type { ReturnDetail } from '../../services/return.service';

export function ReturnOutcomeCard({ request }: { request: ReturnDetail }) {
  const refund = request.refund;
  const notes = request.dispute?.resolutionNotes;
  if (!notes && !refund) return null;
  const assessment = [...request.events].reverse().find(event => event.type === 'LIABILITY_ASSESSED');
  const liability = assessment?.data?.liability;
  const liabilityLabel = liability === 'LOGISTICS_FAULT' ? 'GHN / vận chuyển' : liability === 'SHOP_FAULT' ? 'Shop / sản phẩm' : liability === 'CUSTOMER_REASON' ? 'Lý do từ khách hàng' : null;
  const confirmed = request.events.some(event => event.type === 'CUSTOMER_REFUND_CONFIRMED');
  const waiting = refund && refund.status !== 'SUCCEEDED' && refund.status !== 'PROCESSING' && !confirmed && ['AWAITING_CUSTOMER_CONFIRMATION','REFUND_PENDING','REFUND_FAILED'].includes(request.status);
  const refundLabel = refund?.status === 'SUCCEEDED' ? 'Đã hoàn vào ví SCANMS' : waiting ? 'Chờ khách xác nhận' : refund?.status === 'FAILED' ? 'Hoàn tiền chưa thành công' : refund?.status === 'PROCESSING' ? 'Đang hoàn tiền' : 'Chờ xử lý hoàn tiền';
  const ruling = request.dispute?.ruling;
  const decision = ruling === 'APPROVE_REFUND' ? 'Chấp thuận hoàn tiền' : ruling === 'APPROVE_EXCHANGE' ? 'Chấp thuận đổi sản phẩm' : ruling === 'UPHOLD_SHOP' ? 'Giữ nguyên quyết định của Shop' : request.resolution === 'REFUND' ? 'Phương án hoàn tiền' : request.resolution === 'EXCHANGE' ? 'Phương án đổi sản phẩm' : 'Đã có quyết định';
  const notice = refund?.status === 'SUCCEEDED' ? (request.status === 'AWAITING_CUSTOMER_CONFIRMATION' ? 'Đã hoàn tiền · Chờ khách xác nhận kết quả' : 'Đã hoàn tiền vào ví khách') : waiting ? 'Chờ khách xác nhận phương án hoàn tiền' : refund?.status === 'FAILED' ? 'Vận hành cần kiểm tra khoản hoàn' : refund ? 'Khoản hoàn đang được xử lý' : 'Kết luận được ghi nhận trong hồ sơ';
  return <section className="return-outcome" aria-label="Kết quả xử lý">
    <header><h2><ShieldCheck size={18} aria-hidden="true" />Kết quả xử lý</h2><span className="return-outcome-badge">{notes ? 'Đã có quyết định' : 'Đã duyệt phương án'}</span></header>
    <div className={`return-outcome-grid${refund ? '' : ' return-outcome-single'}`}>
      <section className="return-outcome-decision"><h3>Kết luận vận hành</h3><strong>{decision}</strong>{liabilityLabel && <p>Trách nhiệm: <span>{liabilityLabel}</span></p>}
        {notes && <div className="return-outcome-notes"><h4>Ghi chú quyết định</h4><p>{notes}</p></div>}
      </section>
      {refund && <section className="return-outcome-refund"><h3>Khoản hoàn cho khách</h3><strong className="return-outcome-amount">{Number(refund.amount).toLocaleString('vi-VN')} ₫</strong><span className="return-outcome-badge" data-failed={!waiting && refund.status === 'FAILED'}>{refundLabel}</span><dl><dt>Nhận qua</dt><dd>{refund.method === 'WALLET' ? 'Ví SCANMS' : refund.method}</dd>{waiting && <><dt>Chuyển tiền</dt><dd>Chưa chuyển tiền</dd></>}{refund.status === 'SUCCEEDED' && refund.processedAt && <><dt>Thời gian hoàn</dt><dd><time dateTime={refund.processedAt}>{new Date(refund.processedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></dd></>}</dl>{!waiting && refund.status === 'FAILED' && refund.failureReason && <p className="return-outcome-failure">{refund.failureReason}</p>}</section>}
    </div>
    <footer role="status"><Clock3 size={15} aria-hidden="true" />{notice}</footer>
  </section>;
}
