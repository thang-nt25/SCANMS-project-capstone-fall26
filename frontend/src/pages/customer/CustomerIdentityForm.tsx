import type { FormEvent } from 'react';
import { Loader2, Lock, MapPin, Shield, ShieldCheck, User } from 'lucide-react';

interface CustomerIdentityFormProps {
  fullName: string;
  idNumber: string;
  address: string;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onIdNumberChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CustomerIdentityForm({ fullName, idNumber, address, submitting, onNameChange, onIdNumberChange, onAddressChange, onSubmit }: CustomerIdentityFormProps) {
  return (
    <form className="customer-identity-form [.customer-identity-card:has(>&)]:[container:customer-identity_/_inline-size]! [.customer-identity-card:has(>&)]:w-full! [.customer-identity-card:has(>&)]:max-w-[1040px]! [.customer-identity-card:has(>&)]:min-w-0! [.customer-identity-card:has(>&)]:[border:1px_solid_#EAE4D7]! [.customer-identity-card:has(>&)]:rounded-[16px]! [.customer-identity-card:has(>&)]:bg-[#FFFFFF]! [.customer-identity-card:has(>&)]:shadow-[0_2px_8px_rgb(35_29_21_/_2%)]! min-w-0! text-[#1A1612]! text-left!" onSubmit={onSubmit} aria-label="Thông tin định danh">
      <div className="customer-identity-fields grid! grid-cols-[repeat(2,_minmax(0,_1fr))]! gap-[24px_20px]! p-[24px]! [@container_customer-identity_(max-width:_600px)]:grid-cols-[minmax(0,_1fr)]! [@container_customer-identity_(max-width:_600px)]:gap-[20px]! [@container_customer-identity_(max-width:_600px)]:p-[20px]! [@container_customer-identity_(max-width:_360px)]:[&&]:p-[16px]!">
        <div className="customer-identity-field flex! flex-col! gap-[8px]! min-w-0! [&_label]:text-[13px]! [&_label]:font-[600]! [&_label]:leading-[1.5]! [&_label_>_span]:text-[#B88E4F]!">
          <label htmlFor="customer-identity-name">Họ và tên <span aria-hidden="true">*</span></label>
          <div className="customer-identity-input flex! items-center! gap-[10px]! min-w-0! p-[0_14px]! [border:1px_solid_#EAE4D7]! rounded-[10px]! bg-[#FFFFFF]! [transition:border-color_150ms,_box-shadow_150ms]! [&:hover]:border-[#EEDFC6]! [&:focus-within:focus-within]:border-[#C59B58]! [&:focus-within:focus-within]:shadow-[0_0_0_3px_rgb(197_155_88_/_12%)]! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&_input]:w-full! [&_input]:min-w-0! [&_input]:m-0! [&_input]:p-[12px_0]! [&_input]:border-0! [&_input]:[border-style:none]! [&_input]:rounded-[0]! [&_input]:[outline:none]! [&_input]:bg-[transparent]! [&_input]:text-[#1A1612]! [&_input]:[font-family:inherit]! [&_input]:[font-style:inherit]! [&_input]:[font-variant:inherit]! [&_input]:[font-stretch:inherit]! [&_input]:text-[13px]! [&_input]:leading-[1.65]! [&_textarea]:w-full! [&_textarea]:min-w-0! [&_textarea]:m-0! [&_textarea]:p-[12px_0]! [&_textarea]:border-0! [&_textarea]:[border-style:none]! [&_textarea]:rounded-[0]! [&_textarea]:[outline:none]! [&_textarea]:bg-[transparent]! [&_textarea]:text-[#1A1612]! [&_textarea]:[font-family:inherit]! [&_textarea]:[font-style:inherit]! [&_textarea]:[font-variant:inherit]! [&_textarea]:[font-stretch:inherit]! [&_textarea]:text-[13px]! [&_textarea]:leading-[1.65]! [&_input]:min-h-[46px]! [&_input::placeholder]:text-[#7D715E]! [&_input::placeholder]:opacity-[.8]! [&_textarea::placeholder]:text-[#7D715E]! [&_textarea::placeholder]:opacity-[.8]! [&_textarea]:min-h-[96px]! [&_textarea]:resize-y! [@container_customer-identity_(max-width:_360px)]:[&&]:gap-[8px]! [@container_customer-identity_(max-width:_360px)]:[&&]:p-[0_10px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_input]:text-[12px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_textarea]:text-[12px]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]!">
            <User size={16} aria-hidden="true" />
            <input id="customer-identity-name" type="text" autoComplete="name" aria-required="true" aria-describedby="customer-identity-name-hint"
              value={fullName} onChange={event => onNameChange(event.target.value)} placeholder="Nhập họ và tên trên CCCD" />
          </div>
          <p className="customer-identity-hint m-0! text-[#7D715E]! text-[11px]! leading-[1.6]!" id="customer-identity-name-hint">Nhập đầy đủ, đúng như trên CCCD.</p>
        </div>

        <div className="customer-identity-field flex! flex-col! gap-[8px]! min-w-0! [&_label]:text-[13px]! [&_label]:font-[600]! [&_label]:leading-[1.5]! [&_label_>_span]:text-[#B88E4F]!">
          <label htmlFor="customer-identity-number">Số CCCD <span aria-hidden="true">*</span></label>
          <div className="customer-identity-input flex! items-center! gap-[10px]! min-w-0! p-[0_14px]! [border:1px_solid_#EAE4D7]! rounded-[10px]! bg-[#FFFFFF]! [transition:border-color_150ms,_box-shadow_150ms]! [&:hover]:border-[#EEDFC6]! [&:focus-within:focus-within]:border-[#C59B58]! [&:focus-within:focus-within]:shadow-[0_0_0_3px_rgb(197_155_88_/_12%)]! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&_input]:w-full! [&_input]:min-w-0! [&_input]:m-0! [&_input]:p-[12px_0]! [&_input]:border-0! [&_input]:[border-style:none]! [&_input]:rounded-[0]! [&_input]:[outline:none]! [&_input]:bg-[transparent]! [&_input]:text-[#1A1612]! [&_input]:[font-family:inherit]! [&_input]:[font-style:inherit]! [&_input]:[font-variant:inherit]! [&_input]:[font-stretch:inherit]! [&_input]:text-[13px]! [&_input]:leading-[1.65]! [&_textarea]:w-full! [&_textarea]:min-w-0! [&_textarea]:m-0! [&_textarea]:p-[12px_0]! [&_textarea]:border-0! [&_textarea]:[border-style:none]! [&_textarea]:rounded-[0]! [&_textarea]:[outline:none]! [&_textarea]:bg-[transparent]! [&_textarea]:text-[#1A1612]! [&_textarea]:[font-family:inherit]! [&_textarea]:[font-style:inherit]! [&_textarea]:[font-variant:inherit]! [&_textarea]:[font-stretch:inherit]! [&_textarea]:text-[13px]! [&_textarea]:leading-[1.65]! [&_input]:min-h-[46px]! [&_input::placeholder]:text-[#7D715E]! [&_input::placeholder]:opacity-[.8]! [&_textarea::placeholder]:text-[#7D715E]! [&_textarea::placeholder]:opacity-[.8]! [&_textarea]:min-h-[96px]! [&_textarea]:resize-y! [@container_customer-identity_(max-width:_360px)]:[&&]:gap-[8px]! [@container_customer-identity_(max-width:_360px)]:[&&]:p-[0_10px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_input]:text-[12px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_textarea]:text-[12px]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]!">
            <Shield size={16} aria-hidden="true" />
            <input id="customer-identity-number" type="text" inputMode="numeric" autoComplete="off" maxLength={12} aria-required="true"
              aria-describedby="customer-identity-number-hint" value={idNumber} onChange={event => onIdNumberChange(event.target.value.replace(/\D/g, ''))}
              placeholder="Nhập 12 chữ số trên CCCD" />
          </div>
          <p className="customer-identity-hint m-0! text-[#7D715E]! text-[11px]! leading-[1.6]!" id="customer-identity-number-hint">Gồm 12 chữ số, không có khoảng trắng.</p>
        </div>

        <div className="customer-identity-field customer-identity-address flex! flex-col! gap-[8px]! min-w-0! [&_label]:text-[13px]! [&_label]:font-[600]! [&_label]:leading-[1.5]! [&_label_>_span]:text-[#B88E4F]! col-[1_/_-1]!">
          <label htmlFor="customer-identity-address">Địa chỉ thường trú <span aria-hidden="true">*</span></label>
          <div className="customer-identity-input customer-identity-input--multiline flex! items-center! gap-[10px]! min-w-0! p-[0_14px]! [border:1px_solid_#EAE4D7]! rounded-[10px]! bg-[#FFFFFF]! [transition:border-color_150ms,_box-shadow_150ms]! [&:hover]:border-[#EEDFC6]! [&:focus-within:focus-within]:border-[#C59B58]! [&:focus-within:focus-within]:shadow-[0_0_0_3px_rgb(197_155_88_/_12%)]! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&_input]:w-full! [&_input]:min-w-0! [&_input]:m-0! [&_input]:p-[12px_0]! [&_input]:border-0! [&_input]:[border-style:none]! [&_input]:rounded-[0]! [&_input]:[outline:none]! [&_input]:bg-[transparent]! [&_input]:text-[#1A1612]! [&_input]:[font-family:inherit]! [&_input]:[font-style:inherit]! [&_input]:[font-variant:inherit]! [&_input]:[font-stretch:inherit]! [&_input]:text-[13px]! [&_input]:leading-[1.65]! [&_textarea]:w-full! [&_textarea]:min-w-0! [&_textarea]:m-0! [&_textarea]:p-[12px_0]! [&_textarea]:border-0! [&_textarea]:[border-style:none]! [&_textarea]:rounded-[0]! [&_textarea]:[outline:none]! [&_textarea]:bg-[transparent]! [&_textarea]:text-[#1A1612]! [&_textarea]:[font-family:inherit]! [&_textarea]:[font-style:inherit]! [&_textarea]:[font-variant:inherit]! [&_textarea]:[font-stretch:inherit]! [&_textarea]:text-[13px]! [&_textarea]:leading-[1.65]! [&_input]:min-h-[46px]! [&_input::placeholder]:text-[#7D715E]! [&_input::placeholder]:opacity-[.8]! [&_textarea::placeholder]:text-[#7D715E]! [&_textarea::placeholder]:opacity-[.8]! [&_textarea]:min-h-[96px]! [&_textarea]:resize-y! [@container_customer-identity_(max-width:_360px)]:[&&]:gap-[8px]! [@container_customer-identity_(max-width:_360px)]:[&&]:p-[0_10px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_input]:text-[12px]! [@container_customer-identity_(max-width:_360px)]:[&&]:[&_textarea]:text-[12px]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]! [&.customer-identity-input--multiline]:items-start! [&_>_svg]:mt-[15px]!">
            <MapPin size={16} aria-hidden="true" />
            <textarea id="customer-identity-address" rows={3} autoComplete="street-address" maxLength={200} aria-required="true"
              aria-describedby="customer-identity-address-hint customer-identity-address-count" value={address}
              onChange={event => onAddressChange(event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố theo CCCD" />
          </div>
          <div className="customer-identity-address-help flex! items-start! justify-between! gap-[12px]! [&_>_span]:shrink-0! [&_>_span]:text-[#7D715E]! [&_>_span]:text-[11px]! [&_>_span]:tabular-nums! [&_>_span]:leading-[1.6]!">
            <p className="customer-identity-hint m-0! text-[#7D715E]! text-[11px]! leading-[1.6]!" id="customer-identity-address-hint">Ghi đầy đủ địa chỉ thường trú trên CCCD.</p>
            <span id="customer-identity-address-count">{address.length}/200</span>
          </div>
        </div>
      </div>

      <footer className="customer-identity-footer flex! items-center! justify-between! flex-wrap! gap-[16px]! p-[18px_24px]! [border-top:1px_solid_#EAE4D7]! [@container_customer-identity_(max-width:_600px)]:flex-col-reverse! [@container_customer-identity_(max-width:_600px)]:items-stretch! [@container_customer-identity_(max-width:_600px)]:gap-[12px]! [@container_customer-identity_(max-width:_600px)]:p-[16px_20px]! [@container_customer-identity_(max-width:_360px)]:[&&]:p-[16px]!">
        <p className="customer-identity-privacy flex! items-start! gap-[8px]! max-w-[340px]! m-0! text-[#7D715E]! text-[11px]! leading-[1.6]! [&_>_svg]:shrink-0! [&_>_svg]:mt-[1px]! [&_>_svg]:text-[#B88E4F]! [@container_customer-identity_(max-width:_600px)]:max-w-[none]! [@container_customer-identity_(max-width:_600px)]:justify-center!"><Lock size={15} aria-hidden="true" /><span>Thông tin được bảo mật theo chính sách SCANMS.</span></p>
        <button type="submit" className="customer-identity-submit inline-flex! items-center! justify-center! gap-[8px]! min-h-[44px]! ml-auto! p-[10px_18px]! [border:1px_solid_#EEDFC6]! rounded-[9px]! bg-[#FBF5EB]! text-[#1A1612]! [font-family:inherit]! [font-style:inherit]! [font-variant:inherit]! [font-stretch:inherit]! text-[12px]! font-[600]! leading-[1.5]! cursor-pointer! [transition:background-color_150ms,_border-color_150ms]! [&_>_svg]:shrink-0! [&_>_svg]:text-[#B88E4F]! [&:hover:not(:disabled)]:border-[#C59B58]! [&:hover:not(:disabled)]:bg-[#F3EFE6]! [&:focus-visible]:[outline:2px_solid_#B88E4F]! [&:focus-visible]:outline-offset-[3px]! [&:disabled]:bg-[#FAF8F5]! [&:disabled]:border-[#EAE4D7]! [&:disabled]:text-[#7D715E]! [&:disabled]:cursor-not-allowed! [&:disabled_>_svg]:text-[#7D715E]! [@container_customer-identity_(max-width:_600px)]:w-full! [@container_customer-identity_(max-width:_600px)]:ml-[0]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]!" disabled={submitting || !fullName.trim() || !idNumber.trim() || !address.trim()} aria-busy={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
          {submitting ? 'Đang xác nhận…' : 'Xác nhận thông tin'}
        </button>
      </footer>
    </form>
  );
}
