import { CheckCircle2, Edit2, MapPin, Trash2 } from 'lucide-react';
import type { CustomerAddress } from '../../services/customer.service';

interface CustomerAddressCardProps {
  address: CustomerAddress;
  onEdit: (address: CustomerAddress) => void;
  onDelete: (address: CustomerAddress) => void;
  onSetDefault: (id: string) => void;
}

export function CustomerAddressCard({ address, onEdit, onDelete, onSetDefault }: CustomerAddressCardProps) {
  const locality = [address.wardName, address.districtName, address.provinceName].filter(Boolean).join(', ');

  return (
    <article className="customer-address-card [container-type:inline-size]! flex! flex-col! min-w-0! [overflow-wrap:anywhere]! [border:1px_solid_#EAE4D7]! rounded-[14px]! bg-[#FFFFFF]! text-[#1A1612]! text-left! shadow-[0_2px_6px_rgb(35_29_21_/_2%)]! [transition:border-color_150ms_ease]! [&:hover]:border-[#EEDFC6]! [&[data-default='true']]:border-[#EEDFC6]! [@media_(prefers-reduced-motion:_reduce)]:[transition:none]!" data-default={address.isDefault} aria-label={`Địa chỉ của ${address.fullName}`}>
      <div className="customer-address-content grid! grid-cols-[36px_minmax(0,_1fr)]! gap-[12px]! p-[20px]! flex-[1]! [@container_(max-width:_380px)]:grid-cols-[30px_minmax(0,_1fr)]! [@container_(max-width:_380px)]:gap-[10px]! [@container_(max-width:_380px)]:p-[16px]!">
        <span className="customer-address-pin grid! place-items-center! w-[36px]! h-[36px]! [border:1px_solid_#EEDFC6]! rounded-[10px]! bg-[#FBF5EB]! text-[#B88E4F]! [@container_(max-width:_380px)]:w-[30px]! [@container_(max-width:_380px)]:h-[32px]! [@container_(max-width:_380px)]:rounded-[8px]!" aria-hidden="true"><MapPin size={19} /></span>
        <div className="customer-address-info min-w-0!">
          <div className="customer-address-heading flex! flex-wrap! items-center! justify-between! gap-[6px_10px]! min-h-[24px]! [&_h3]:m-0! [&_h3]:min-w-0! [&_h3]:[font-family:inherit]! [&_h3]:[font-style:inherit]! [&_h3]:[font-variant:inherit]! [&_h3]:[font-stretch:inherit]! [&_h3]:text-[16px]! [&_h3]:font-[650]! [&_h3]:leading-[1.5]! [@container_(max-width:_380px)]:[&_h3]:text-[15px]!">
            <h3>{address.fullName}</h3>
            {address.isDefault && (
              <span className="customer-address-default inline-flex! shrink-0! items-center! gap-[4px]! p-[3px_7px]! [border:1px_solid_#EEDFC6]! rounded-[5px]! bg-[#FBF5EB]! text-[#7D715E]! text-[10px]! font-[550]! leading-[1.5]! whitespace-nowrap!"><CheckCircle2 size={12} aria-hidden="true" />Mặc định</span>
            )}
          </div>
          <p className="customer-address-phone m-[3px_0_0]! text-[#7D715E]! text-[13px]! tabular-nums! leading-[1.5]!">{address.phoneNumber}</p>
          <div className="customer-address-location mt-[14px]! [&_p]:m-0! [&_p]:text-[13px]! [&_p]:leading-[1.7]! [@container_(max-width:_380px)]:mt-[12px]!">
            <p className="customer-address-street font-[500]!">{address.detailAddress}</p>
            {locality && <p className="customer-address-locality [&&]:mt-[3px]! text-[#7D715E]!">{locality}</p>}
          </div>
        </div>
      </div>
      <footer className="customer-address-footer flex! items-center! flex-wrap! gap-[8px]! m-[0_20px]! p-[12px_0]! [border-top:1px_solid_#EAE4D7]! [&_button]:inline-flex! [&_button]:items-center! [&_button]:justify-center! [&_button]:gap-[6px]! [&_button]:min-h-[40px]! [&_button]:p-[8px_11px]! [&_button]:[border:1px_solid_#EAE4D7]! [&_button]:rounded-[8px]! [&_button]:bg-[#FFFFFF]! [&_button]:text-[#7D715E]! [&_button]:[font-family:inherit]! [&_button]:[font-style:inherit]! [&_button]:[font-variant:inherit]! [&_button]:[font-stretch:inherit]! [&_button]:text-[12px]! [&_button]:font-[550]! [&_button]:leading-[1.5]! [&_button]:cursor-pointer! [&_button]:[transition:background-color_150ms_ease,_border-color_150ms_ease,_color_150ms_ease]! [&_button:hover]:bg-[#FAF8F5]! [&_button:hover]:border-[#EEDFC6]! [&_button:hover]:text-[#1A1612]! [&_button:focus-visible]:[outline:2px_solid_#B88E4F]! [&_button:focus-visible]:outline-offset-[3px]! [&_svg]:shrink-0! [&_.customer-address-edit]:text-[#1A1612]! [&_.customer-address-edit]:border-[#EEDFC6]! [&_.customer-address-edit]:bg-[#FBF5EB]! [&_.customer-address-delete]:border-[transparent]! [&_.customer-address-delete:hover]:text-[#DC2626]! [&_.customer-address-delete:hover]:border-[#EAE4D7]! [@container_(max-width:_380px)]:m-[0_16px]! [@container_(max-width:_380px)]:[&_button]:min-h-[44px]! [@container_(max-width:_380px)]:[&_button]:p-[8px_9px]! [@container_(max-width:_380px)]:[&_button]:text-[11px]! [@container_(max-width:_380px)]:[&_.customer-address-set-default]:flex-[1_0_100%]! [@media_(prefers-reduced-motion:_reduce)]:[&_button]:[transition:none]!">
        {!address.isDefault && (
          <button type="button" className="customer-address-set-default" onClick={() => onSetDefault(address.id)}>
            Đặt làm mặc định
          </button>
        )}
        <div className="customer-address-actions flex! flex-wrap! gap-[6px]! ml-auto!">
          <button type="button" className="customer-address-edit [&_svg]:text-[#B88E4F]!" onClick={() => onEdit(address)} aria-label={`Sửa địa chỉ của ${address.fullName}`}>
            <Edit2 size={14} aria-hidden="true" />Chỉnh sửa
          </button>
          <button type="button" className="customer-address-delete" onClick={() => onDelete(address)} aria-label={`Xóa địa chỉ của ${address.fullName}`}>
            <Trash2 size={14} aria-hidden="true" />Xóa
          </button>
        </div>
      </footer>
    </article>
  );
}
