import { HelpCircle, KeyRound, Loader2, Mail } from 'lucide-react';

interface CustomerSecurityMethodProps {
  email: string;
  sending: boolean;
  onSendCode: () => void;
  onUsePassword: () => void;
}

export function CustomerSecurityMethod({ email, sending, onSendCode, onUsePassword }: CustomerSecurityMethodProps) {
  return <div className="customer-account-security">
    <section className="customer-account-panel" aria-labelledby="security-method-title">
      <header className="customer-account-panel-heading"><Mail size={20} /><h3 id="security-method-title">Đổi mật khẩu</h3></header>
      <div className="customer-account-security-body">
        <div className="customer-account-methods" aria-label="Phương thức đổi mật khẩu">
          <button type="button" aria-pressed="true"><Mail size={15} />Xác minh qua email</button>
          <button type="button" onClick={onUsePassword} disabled={sending}><KeyRound size={15} />Mật khẩu hiện tại</button>
        </div>
        <label className="customer-account-email">Email nhận mã<strong>{email}</strong></label>
        <button type="button" className="customer-account-send" onClick={onSendCode} disabled={sending} aria-busy={sending}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {sending ? 'Đang gửi mã…' : 'Gửi mã xác minh'}
        </button>
      </div>
    </section>
    <aside className="customer-account-panel customer-account-help" aria-labelledby="security-help-title">
      <h3 id="security-help-title"><HelpCircle size={18} />Trợ giúp xác minh</h3>
      <div><h4>Vì sao cần xác minh?</h4><p>Xác nhận bạn là chủ tài khoản trước khi đổi mật khẩu.</p></div>
      <div><h4>Chưa nhận được mã?</h4><p>Kiểm tra thư rác hoặc gửi lại khi hết thời gian chờ.</p></div>
    </aside>
  </div>;
}
