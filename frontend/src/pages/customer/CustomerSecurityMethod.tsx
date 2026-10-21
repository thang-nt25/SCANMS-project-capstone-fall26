import { ArrowRight, ChevronDown, HelpCircle, KeyRound, Loader2, Mail } from 'lucide-react';

interface CustomerSecurityMethodProps {
  email: string;
  sending: boolean;
  onSendCode: () => void;
  onUsePassword: () => void;
}

export function CustomerSecurityMethod({ email, sending, onSendCode, onUsePassword }: CustomerSecurityMethodProps) {
  return (
    <div className="customer-security-method [container:security-method_/_inline-size]! w-full! max-w-[1040px]! min-w-0! text-[#1A1612]! text-left! [&_:is(button,_summary):focus-visible]:[outline:2px_solid_#B88E4F]! [&_:is(button,_summary):focus-visible]:outline-offset-[3px]!">
      <div className="customer-security-method-layout grid! grid-cols-[minmax(0,_1fr)_280px]! [align-items:start]! gap-[16px]! [@container_security-method_(max-width:_780px)]:grid-cols-[minmax(0,_1fr)]!">
        <section className="customer-security-method-card min-w-0! [border:1px_solid_#EAE4D7]! rounded-[16px]! bg-[#FFFFFF]! shadow-[0_2px_8px_rgb(35_29_21_/_2%)]!" aria-labelledby="security-method-title">
          <header className="customer-security-method-heading flex! items-start! gap-[12px]! p-[24px_24px_20px]! [&_>_div]:min-w-0! [&_h3]:m-0! [&_h3]:[font-family:inherit]! [&_h3]:[font-style:inherit]! [&_h3]:[font-variant:inherit]! [&_h3]:[font-stretch:inherit]! [&_h3]:text-[16px]! [&_h3]:font-[650]! [&_h3]:leading-[1.5]! [&_p]:m-[4px_0_0]! [&_p]:text-[#7D715E]! [&_p]:text-[12px]! [&_p]:leading-[1.65]! [@container_security-method_(max-width:_400px)]:p-[20px_16px_18px]! [@container_security-method_(max-width:_400px)]:gap-[10px]! [@container_security-method_(max-width:_400px)]:[&_h3]:text-[15px]!">
            <span className="customer-security-method-icon grid! place-items-center! shrink-0! w-[40px]! h-[40px]! [border:1px_solid_#EEDFC6]! rounded-[11px]! bg-[#FBF5EB]! text-[#B88E4F]! [@container_security-method_(max-width:_400px)]:w-[36px]! [@container_security-method_(max-width:_400px)]:h-[36px]! [@container_security-method_(max-width:_400px)]:rounded-[10px]!" aria-hidden="true"><Mail size={20} /></span>
            <div>
              <h3 id="security-method-title">Xác minh qua email</h3>
              <p>Nhận mã xác minh để thiết lập mật khẩu mới.</p>
            </div>
          </header>
          <div className="customer-security-method-body grid! gap-[16px]! p-[0_24px_22px]! [@container_security-method_(max-width:_400px)]:p-[0_16px_18px]! [@container_security-method_(max-width:_400px)]:gap-[14px]!">
            <div className="customer-security-email grid! gap-[6px]! min-w-0! p-[14px_16px]! [border:1px_solid_#EAE4D7]! rounded-[10px]! bg-[#FAF8F5]! [&_>_span]:text-[#7D715E]! [&_>_span]:text-[11px]! [&_>_span]:leading-[1.5]! [&_>_strong]:min-w-0! [&_>_strong]:[overflow-wrap:anywhere]! [&_>_strong]:text-[14px]! [&_>_strong]:font-[600]! [&_>_strong]:leading-[1.6]! [@container_security-method_(max-width:_400px)]:p-[12px]! [@container_security-method_(max-width:_400px)]:[&_>_strong]:text-[13px]!">
              <span>Email nhận mã</span>
              <strong>{email}</strong>
            </div>
            <button type="button" className="customer-security-send-code inline-flex! items-center! justify-center! gap-[8px]! w-full! min-h-[46px]! p-[10px_16px]! [border:1px_solid_#EEDFC6]! rounded-[9px]! bg-[#FBF5EB]! text-[#1A1612]! [font-family:inherit]! [font-style:inherit]! [font-variant:inherit]! [font-stretch:inherit]! text-[13px]! font-[600]! leading-[1.5]! cursor-pointer! [transition:border-color_150ms,_background-color_150ms]! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&:hover:not(:disabled)]:border-[#C59B58]! [&:hover:not(:disabled)]:bg-[#F3EFE6]! [&:disabled]:text-[#7D715E]! [&:disabled]:cursor-wait! [&:disabled]:bg-[#FAF8F5]! [&:disabled]:border-[#EAE4D7]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]!" onClick={onSendCode} disabled={sending} aria-busy={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
              <span>{sending ? 'Đang gửi mã xác minh…' : 'Gửi mã xác minh'}</span>
            </button>
          </div>
          <footer className="customer-security-method-footer m-[0_24px]! p-[8px_0]! [border-top:1px_solid_#EAE4D7]! [@container_security-method_(max-width:_400px)]:m-[0_16px]!">
            <button type="button" className="customer-security-use-password flex! items-center! gap-[10px]! w-full! min-h-[48px]! p-[8px_0]! border-0! [border-style:none]! rounded-[6px]! bg-[transparent]! text-[#7D715E]! [font-family:inherit]! [font-style:inherit]! [font-variant:inherit]! [font-stretch:inherit]! text-[12px]! font-[550]! leading-[1.6]! text-left! cursor-pointer! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&_>_svg:last-child]:ml-auto! [&:hover]:text-[#1A1612]!" onClick={onUsePassword}>
              <KeyRound size={16} aria-hidden="true" />
              <span>Đổi bằng mật khẩu hiện tại</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </footer>
        </section>

        <aside className="customer-security-help min-w-0! [border:1px_solid_#EAE4D7]! rounded-[16px]! bg-[#FFFFFF]! shadow-[0_2px_8px_rgb(35_29_21_/_2%)]! p-[20px]! shadow-[none]! [&_h3]:flex! [&_h3]:items-center! [&_h3]:gap-[8px]! [&_h3]:m-[0_0_14px]! [&_h3]:[font-family:inherit]! [&_h3]:[font-style:inherit]! [&_h3]:[font-variant:inherit]! [&_h3]:[font-stretch:inherit]! [&_h3]:text-[14px]! [&_h3]:font-[600]! [&_h3]:leading-[1.5]! [&_h3_>_svg]:shrink-0! [&_h3_>_svg]:text-[#B88E4F]! [&_details_+_details]:[border-top:1px_solid_#EAE4D7]! [&_summary]:flex! [&_summary]:items-center! [&_summary]:justify-between! [&_summary]:gap-[10px]! [&_summary]:min-h-[48px]! [&_summary]:p-[12px_0]! [&_summary]:rounded-[4px]! [&_summary]:list-none! [&_summary]:text-[12px]! [&_summary]:font-[500]! [&_summary]:leading-[1.6]! [&_summary]:cursor-pointer! [&_summary::-webkit-details-marker]:hidden! [&_summary_>_svg]:shrink-0! [&_summary_>_svg]:text-[#7D715E]! [&_summary_>_svg]:[transition:transform_150ms]! [&_details[open]_summary_>_svg]:[transform:rotate(180deg)]! [&_details_p]:m-0! [&_details_p]:pb-[14px]! [&_details_p]:text-[#7D715E]! [&_details_p]:text-[12px]! [&_details_p]:leading-[1.75]! [@container_security-method_(max-width:_400px)]:p-[16px]! [@media_(prefers-reduced-motion:_reduce)]:[&_summary_>_svg]:[transition:none]!" aria-labelledby="security-help-title">
          <h3 id="security-help-title"><HelpCircle size={17} aria-hidden="true" />Trợ giúp xác minh</h3>
          <details>
            <summary><span>Vì sao cần xác minh?</span><ChevronDown size={14} aria-hidden="true" /></summary>
            <p>SCANMS xác minh email trước khi cho phép thiết lập mật khẩu mới để bảo vệ tài khoản của bạn.</p>
          </details>
          <details>
            <summary><span>Chưa nhận được email?</span><ChevronDown size={14} aria-hidden="true" /></summary>
            <p>Kiểm tra thư mục Spam. Nếu vẫn chưa nhận được, hãy liên hệ CSKH qua Chat hỗ trợ.</p>
          </details>
        </aside>
      </div>
    </div>
  );
}
