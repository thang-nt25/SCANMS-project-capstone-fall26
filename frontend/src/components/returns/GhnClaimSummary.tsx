import { useState } from 'react';
import { Check, Clock3, Copy, FileText } from 'lucide-react';
import type { ReturnDetail } from '../../services/return.service';

const labels: Record<string, string> = {
  DRAFT: 'Chờ gửi GHN', SUBMITTED: 'Chờ GHN phản hồi', NEEDS_MORE_EVIDENCE: 'Cần bổ sung chứng từ',
  ACCEPTED: 'GHN đã chấp thuận', REJECTED: 'GHN từ chối bồi hoàn', PAID: 'Đã ghi nhận GHN thanh toán',
};
const notices: Record<string, string> = {
  DRAFT: 'Vận hành chuẩn bị hồ sơ gửi GHN', SUBMITTED: 'Đã gửi hồ sơ · Chờ GHN phản hồi',
  NEEDS_MORE_EVIDENCE: 'Vận hành cần bổ sung chứng từ', ACCEPTED: 'Đã được duyệt · Chờ ghi nhận thanh toán',
  REJECTED: 'Vận hành xem xét kết quả từ GHN', PAID: 'Đã ghi nhận khoản bồi hoàn từ GHN',
};
const amount = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value.toLocaleString('vi-VN')} ₫` : null;

export function GhnClaimSummary({ claim }: { claim: NonNullable<ReturnDetail['ghnClaim']> }) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState(false);
  const overdue = claim.status === 'SUBMITTED' && Date.now() - Date.parse(claim.updatedAt) > 7 * 86400000;
  const copyCode = (value: string) => { void navigator.clipboard.writeText(value).then(() => { setCopied(value); setCopyError(false); }).catch(() => setCopyError(true)); };
  return <section className="ghn-claim-summary" aria-label="Yêu cầu GHN bồi hoàn">
    <header><h3><FileText size={18} aria-hidden="true" />Yêu cầu GHN bồi hoàn</h3><span className="ghn-claim-state">{labels[claim.status] || claim.status}</span></header>
    <dl className="ghn-claim-fields">
      <div><dt>Vận đơn liên quan</dt><dd className="ghn-claim-code"><strong title={claim.originalTrackingNumber}>{claim.originalTrackingNumber || 'Chưa ghi nhận'}</strong>{claim.originalTrackingNumber && <button type="button" onClick={() => copyCode(claim.originalTrackingNumber)} aria-label="Sao chép vận đơn liên quan">{copied === claim.originalTrackingNumber ? <Check size={14} /> : <Copy size={14} />}</button>}</dd></div>
      <div><dt>Mã yêu cầu GHN</dt><dd className="ghn-claim-code"><strong title={claim.ghnReference}>{claim.ghnReference || 'Chưa có'}</strong>{claim.ghnReference && <button type="button" onClick={() => copyCode(claim.ghnReference!)} aria-label="Sao chép mã yêu cầu GHN">{copied === claim.ghnReference ? <Check size={14} /> : <Copy size={14} />}</button>}</dd></div>
      <div><dt>Số tiền yêu cầu</dt><dd>{amount(claim.claimedAmount) ?? 'Chưa ghi nhận'}</dd></div>
      <div><dt>GHN chấp thuận</dt><dd>{amount(claim.approvedAmount) ?? 'Chưa có kết quả'}</dd></div>
    </dl>
    {claim.notes && <div className="ghn-claim-notes"><h4>Ghi chú vận hành</h4><p>{claim.notes}</p></div>}
    {copyError && <p role="alert" className="ghn-claim-error">Chưa sao chép được mã. Vui lòng thử lại.</p>}
    <footer role="status"><Clock3 size={15} aria-hidden="true" /><span>{overdue ? 'Quá 7 ngày chưa có phản hồi · Vận hành cần liên hệ GHN' : notices[claim.status] || 'Vận hành đang theo dõi hồ sơ'}</span></footer>
  </section>;
}
