import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';

export function PayoutRejectionDetails({ reason, amount, refundedAmount, code, onCreateNew, canCreateNew = false }: {
  reason?: string | null; amount: string; refundedAmount?: string | null; code?: string; onCreateNew?: () => void; canCreateNew?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const operational = /bảo trì|gián đoạn|timeout|lỗi hệ thống|lỗi kết nối|nghẽn|tạm ngưng|tạm dừng/i.test(reason ?? '');
  const needsProfile = !operational && /kyc|định danh|cccd|mã số thuế|\bmst\b|(?:thiếu|sai|không khớp|chưa|bổ sung).*(?:hồ sơ|ngân hàng|tài khoản)|(?:ngân hàng|tài khoản).*(?:sai|không khớp|chưa xác minh)/i.test(reason ?? '');
  const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
  return <><button type="button" onClick={() => setOpen(true)} className="wallet-history-action">Xem lý do</button>
    {open && createPortal(<Modal isOpen onClose={() => setOpen(false)} title="Yêu cầu bị từ chối" subtitle={code} maxWidth="2xl" className="wallet-rejection-dialog" stickyHeader
      footer={<div className="wallet-rejection-actions"><button type="button" onClick={() => setOpen(false)}>Đóng</button>{needsProfile ? <Link to="/collaborator/profile?tab=kyc">Bổ sung hồ sơ</Link> : onCreateNew && <button type="button" disabled={!canCreateNew} onClick={() => { setOpen(false); onCreateNew(); }}>Tạo yêu cầu mới</button>}</div>}>
      <div className="wallet-rejection-values"><div><span>Số tiền yêu cầu</span><strong>{money(amount)}</strong></div><div><span>Đã hoàn về ví</span><strong>{refundedAmount && Number(refundedAmount) > 0 ? money(refundedAmount) : 'Chưa xác nhận'}</strong></div></div>
      <div className="wallet-rejection-reason"><span>Lý do từ người duyệt</span><p>{reason || 'Yêu cầu cũ chưa lưu lý do chi tiết. Liên hệ bộ phận vận hành để được hỗ trợ.'}</p></div>
      {needsProfile && <p className="wallet-rejection-note">Kiểm tra thông tin hồ sơ trước khi gửi yêu cầu mới.</p>}
      {!needsProfile && !canCreateNew && onCreateNew && <p className="wallet-rejection-note">Bạn có thể tạo yêu cầu mới khi ví đủ điều kiện rút tiền.</p>}
    </Modal>, document.body)}
  </>;
}
