import { useId, useState } from 'react';
import { Modal } from '../ui/Modal';
import { validatePayoutBill } from '../../validations/payout-bill.validation';

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
    status: string;
    risk?: { status: string };
  };
  gatewayEnabled: boolean;
  sandbox?: boolean;
  busy: boolean;
  onClose: () => void;
  onBankTransfer: () => Promise<void>;
  onManualApprove: (proof: ManualPayoutProof) => Promise<void>;
}

export function PayoutApprovalDialog({ item, gatewayEnabled, sandbox = false, busy, onClose, onBankTransfer, onManualApprove }: Props) {
  const formId = useId();
  const [method, setMethod] = useState<'bank' | 'manual'>('bank');
  const [bill, setBill] = useState<File | null>(null);
  const [bankRefCode, setBankRefCode] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const reconciling = item.status === 'PROCESSING';
  const blocked = item.status === 'PENDING' && item.risk?.status === 'BLOCKED';

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={reconciling ? 'Đối soát chi trả' : 'Duyệt chi trả'} className="payout-review-dialog" maxWidth="2xl" stickyHeader footer={
      <div className="payout-review-actions">
        <button type="button" className="payout-secondary" disabled={busy} onClick={onClose}>Hủy</button>
        {method === 'manual' ? (
          <button type="submit" form={formId} className="payout-primary" disabled={busy || blocked}>{busy ? 'Đang lưu…' : 'Xác nhận đã chuyển khoản'}</button>
        ) : gatewayEnabled ? (
          <button type="button" className="payout-primary" disabled={busy || blocked} onClick={() => void onBankTransfer()}>
            {busy ? 'Đang xử lý…' : reconciling ? 'Đối soát kết quả ngân hàng' : sandbox ? 'Duyệt qua BIDV Sandbox' : 'Duyệt chuyển khoản qua ngân hàng'}
          </button>
        ) : <button type="button" className="payout-primary" disabled>Chưa kết nối chi trả</button>}
      </div>
    }>
      <div className="payout-review-content">
      <div className="payout-recipient rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] text-sm">
        <div><span>Đối tác</span><span className="font-semibold">{item.collaboratorName}</span></div>
        <div><span>Ngân hàng</span><span>{item.bankName}</span></div>
        <div><span>Số tài khoản</span><span>{item.bankAccountNumber}</span></div>
        <div><span>Chủ tài khoản</span><span>{item.bankAccountName}</span></div>
        <div><span>Số tiền thực chuyển</span><span className="font-bold text-[#B88E4F]">{Number(item.netAmount).toLocaleString('vi-VN')} ₫</span></div>
      </div>

      {reconciling && <p className="payout-document-notice text-sm">Lệnh đang chờ kết quả. Đối soát lệnh đã gửi trước khi thực hiện bất kỳ chuyển khoản mới nào.</p>}
      {blocked && <p role="alert" className="text-sm text-[#DC2626]">Yêu cầu chưa đạt điều kiện chi trả. Xem kiểm tra rủi ro để bổ sung hồ sơ.</p>}

      <fieldset disabled={busy} className="payout-methods">
        <legend className="mb-2 text-sm font-semibold">Cách xử lý</legend>
        <div>
          <label data-selected={method === 'bank'}><input type="radio" name="payout-method" checked={method === 'bank'} onChange={() => { setMethod('bank'); setError(''); }} /><span>Qua API ngân hàng</span></label>
          {!(sandbox && reconciling) && <label data-selected={method === 'manual'}><input type="radio" name="payout-method" checked={method === 'manual'} onChange={() => setMethod('manual')} /><span>Đã chuyển khoản thủ công</span></label>}
        </div>
      </fieldset>

      {method === 'bank' ? (
        <section className="space-y-3" aria-label="Chi trả qua API ngân hàng">
          {gatewayEnabled && sandbox && <div className="payout-connection-status" role="status">
            <strong>BIDV Sandbox</strong>
            <p>Khi thành công, lịch sử rút tiền và bảng kê của KOL được cập nhật trong SCANMS. Không chuyển tiền ngoài đời.</p>
          </div>}
          {!gatewayEnabled && <div role="status" className="payout-connection-status">
            <strong>Chưa thể chuyển tiền qua API</strong>
            <p>Kiểm tra cấu hình dịch vụ chi trả đang chọn trên máy chủ.</p>
            {!reconciling && <p>Nếu bạn đã tự chuyển tiền, chọn “Đã chuyển khoản thủ công” để ghi nhận chứng từ.</p>}
          </div>}
        </section>
      ) : (
        <form id={formId} className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (busy || blocked) return;
          const validation = bill ? validatePayoutBill(bill) : 'Chọn chứng từ chuyển khoản đã thực hiện.';
          if (validation) { setError(validation); return; }
          const reference = bankRefCode.trim().toUpperCase();
          if (!/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/.test(reference)) { setError('Nhập mã giao dịch hợp lệ trên chứng từ ngân hàng.'); return; }
          setError('');
          void onManualApprove({ bill: bill!, bankRefCode: reference, note: note.trim() });
        }}>
          <p className="payout-document-notice text-sm">Chỉ dùng khi đã chuyển tiền bên ngoài hệ thống. Xác nhận này ghi nhận chứng từ, không gửi lệnh chuyển khoản.</p>
          <label className="grid gap-2 text-sm">Chứng từ chuyển khoản (JPG, PNG hoặc PDF, tối đa 5 MB) *
            <input type="file" accept="image/png,image/jpeg,application/pdf" required disabled={busy} onChange={event => { setBill(event.target.files?.[0] ?? null); setError(''); }} />
          </label>
          <label className="grid gap-2 text-sm">Mã tham chiếu ngân hàng (FT / Ref Code) *
            <input className="payout-review-input" type="text" placeholder="Mã giao dịch trên chứng từ" required maxLength={100} disabled={busy} value={bankRefCode} onChange={event => setBankRefCode(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">Ghi chú nội bộ
            <input className="payout-review-input" type="text" maxLength={500} disabled={busy} value={note} onChange={event => setNote(event.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
        </form>
      )}
      </div>
    </Modal>
  );
}
