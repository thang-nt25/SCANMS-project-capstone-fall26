import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { validatePayoutBill } from '../../validations/payout-bill.validation';
import { PayoutCompactSummary, PayoutProofField } from './PayoutCompactFields';

export interface ManualPayoutProof {
  bill: File;
  bankRefCode: string;
  note: string;
}

interface Props {
  item: {
    collaboratorName: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    netAmount: string;
    amount?: string;
    taxAmount?: string;
    status: string;
    risk?: { status: string; checks: { code: string; label: string; passed: boolean; blocking: boolean }[] };
  };
  busy: boolean;
  uploadProgress?: number;
  onClose: () => void;
  onViewIssue: (code?: string) => void;
  onManualApprove: (proof: ManualPayoutProof) => Promise<void>;
}

export function PayoutApprovalDialog({ item, busy, uploadProgress = 0, onClose, onViewIssue, onManualApprove }: Props) {
  const formId = useId();
  const [bill, setBill] = useState<File | null>(null);
  const [bankRefCode, setBankRefCode] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const reconciling = item.status === 'PROCESSING';
  const blocked = item.status === 'PENDING' && item.risk?.status === 'BLOCKED';
  const failedChecks = item.risk?.checks.filter(check => !check.passed) ?? [];

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Xác nhận chuyển khoản" className="payout-review-dialog finance-approval-modal" maxWidth="2xl" stickyHeader footer={
      <div className="payout-review-actions">
        <button type="button" className="payout-secondary" disabled={busy} onClick={onClose}>Hủy</button>
        <button type="submit" form={formId} className="payout-primary" disabled={busy || blocked || !bill || !bankRefCode.trim()}>{busy && <Loader2 size={15} className="animate-spin"/>}{busy ? 'Đang xác nhận…' : 'Xác nhận chi trả'}</button>
      </div>
    }>
      <div className="payout-review-content">
      {busy && <p role="status" aria-live="polite" className="compact-payout-notice">{uploadProgress < 100 ? `Đang tải chứng từ · ${uploadProgress}%` : 'Đang lưu chứng từ và ghi nhận chi trả…'}</p>}
      <PayoutCompactSummary name={item.collaboratorName} code="Thực nhận" amount={item.netAmount} bankName={item.bankName} accountNumber={item.bankAccountNumber} accountName={item.bankAccountName} detail={item.amount && item.taxAmount ? `Yêu cầu ${Number(item.amount).toLocaleString('vi-VN')} đ · Thuế ${Number(item.taxAmount).toLocaleString('vi-VN')} đ` : undefined}/>

      {reconciling && <p className="compact-payout-notice">Đối soát lệnh đã gửi trước khi chuyển mới.</p>}
      {blocked && <div role="alert" className="compact-payout-issues">
        <button type="button" className="compact-payout-issues-heading" onClick={() => onViewIssue(failedChecks[0]?.code)}>Chưa đủ điều kiện chi trả · Xem lý do →</button>
        {failedChecks.map(check => <button type="button" key={check.code} className="compact-payout-issue" onClick={() => onViewIssue(check.code)}>{check.label}<span>{check.blocking ? 'Chưa đạt' : 'Cần bổ sung'} →</span></button>)}
      </div>}

        <form id={formId} className="compact-payout-form" onSubmit={event => {
          event.preventDefault();
          if (busy || blocked) return;
          const validation = bill ? validatePayoutBill(bill) : 'Chọn chứng từ chuyển khoản đã thực hiện.';
          if (validation) { setError(validation); return; }
          const reference = bankRefCode.trim().toUpperCase();
          if (!/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/.test(reference)) { setError('Nhập mã giao dịch hợp lệ trên chứng từ ngân hàng.'); return; }
          setError('');
          void onManualApprove({ bill: bill!, bankRefCode: reference, note: note.trim() });
        }}>
          <div className="compact-payout-fields">
            <label className="compact-payout-field">Mã giao dịch ngân hàng *<input type="text" placeholder="Nhập mã giao dịch trên chứng từ" required maxLength={100} disabled={busy} value={bankRefCode} onChange={event => setBankRefCode(event.target.value)} /></label>
            <PayoutProofField file={bill} disabled={busy} onChange={next => { const validation = next ? validatePayoutBill(next) : ''; setBill(validation ? null : next); setError(validation); }}/>
          </div>
          <details className="compact-payout-note"><summary>+ Thêm ghi chú</summary><label className="compact-payout-field"><span className="sr-only">Ghi chú nội bộ</span><input type="text" placeholder="Ghi chú nội bộ" maxLength={500} disabled={busy} value={note} onChange={event => setNote(event.target.value)} /></label></details>
          {error && <p role="alert" className="compact-payout-error">{error}</p>}
        </form>
      </div>
    </Modal>
  );
}
