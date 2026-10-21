import { ChevronDown, Copy, ExternalLink, Globe, Link2 } from 'lucide-react';

export function StorefrontSettingsSection({ url, path, description, onDescriptionChange, onCopy }: {
  url: string; path: string; description: string;
  onDescriptionChange: (value: string) => void;
  onCopy: () => void;
}) {
  return <details className="sf-settings mt-[4px] border border-[#EAE4D7] rounded-[14px] bg-white text-[#1A1612] [&[open]_.sf-settings-chevron]:[transform:rotate(180deg)]">
    <summary className="sf-settings-heading flex items-center gap-[11px] list-none py-[15px] px-[16px] cursor-pointer rounded-[14px] transition-[background] duration-[150ms] ease-[ease] [&::-webkit-details-marker]:hidden [&::marker]:content-[''] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] motion-reduce:transition-none [@media(max-width:420px)]:p-[13px] [@media(max-width:420px)]:gap-[9px]">
      <span className="sf-settings-icon w-[37px] h-[37px] grid place-items-center bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] rounded-[10px] shrink-0"><Globe size={19} /></span>
      <span className="sf-settings-title grid gap-[4px] flex-1 min-w-0 [&_strong]:text-[14px] [&_strong]:font-bold [&_strong]:leading-[1.4] [&_small]:text-[11px] [&_small]:leading-[1.5] [&_small]:text-[#7D715E]"><strong>Trang gian hàng</strong><small>Đường dẫn chia sẻ và giới thiệu thương hiệu</small></span>
      <ChevronDown className="sf-settings-chevron shrink-0 text-[#B88E4F] transition-[transform] duration-[150ms] ease-[ease] motion-reduce:transition-none" size={18} />
    </summary>
    <div className="sf-settings-body pt-[18px] pb-[16px] px-[16px] border-t border-t-[#EAE4D7] [@media(max-width:420px)]:py-[15px] [@media(max-width:420px)]:px-[13px]">
      <div className="sf-settings-link-heading flex items-center justify-between gap-[12px] mb-[9px] [&>span]:flex [&>span]:items-center [&>span]:gap-[7px] [&>span]:text-[12px] [&>span]:font-semibold [&_svg]:text-[#B88E4F] [&_small]:text-[10px] [&_small]:font-semibold [&_small]:border [&_small]:border-[#EEDFC6] [&_small]:rounded-[5px] [&_small]:py-[3px] [&_small]:px-[7px] [&_small]:bg-[#FBF5EB] [&_small]:text-[#7D715E]"><span><Link2 size={15} /> Đường dẫn trên SCANMS</span><small>Công khai</small></div>
      <div className="sf-settings-url flex items-center gap-[6px] border border-[#EAE4D7] bg-[#FAF8F5] rounded-[10px] p-[5px] focus-within:border-[#C59B58] [&_input]:flex-1 [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-[7px] [&_input]:text-[#1A1612] [&_input]:outline-none [&_input]:text-[12px] [&_input]:text-ellipsis [&_button]:w-[34px] [&_button]:h-[34px] [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:grid [&_button]:place-items-center [&_button]:text-[#B88E4F] [&_button]:bg-white [&_button]:shrink-0 [&_button]:cursor-pointer [&_button:hover]:bg-[#FBF5EB] [&_button:hover]:border-[#C59B58] [&_button:disabled]:opacity-50 [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid [&_button:focus-visible]:outline-[#C59B58] [&_button:focus-visible]:outline-offset-[2px]">
        <input type="text" readOnly value={url} aria-label="Đường dẫn gian hàng trên SCANMS"
          placeholder="Đang tải đường dẫn…" onFocus={event => event.currentTarget.select()} />
        <button type="button" aria-label="Sao chép đường dẫn gian hàng" title="Sao chép đường dẫn" disabled={!url} onClick={onCopy}><Copy size={16} /></button>
      </div>
      <div className="sf-settings-link-footer [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-[#C59B58] [&_a:focus-visible]:outline-offset-[2px] flex justify-between items-baseline flex-wrap gap-[7px] mt-[9px] [&_p]:text-[11px] [&_p]:text-[#7D715E] [&_p]:m-0 [&_p]:leading-[1.5] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[5px] [&_a]:text-[#8A642C] [&_a]:text-[11px] [&_a]:font-semibold [&_a]:no-underline [&_a]:whitespace-nowrap [&_a:hover]:underline"><p>Chia sẻ đường dẫn này để khách ghé thăm Shop.</p>
        {path && <a href={path} target="_blank" rel="noopener noreferrer">Mở gian hàng <ExternalLink size={13} /></a>}
      </div>
      <div className="sf-settings-description mt-[20px] pt-[17px] border-t border-t-[#EAE4D7] [&_label]:block [&_label]:font-semibold [&_label]:text-[12px] [&_label]:mb-[5px] [&_p]:text-[#7D715E] [&_p]:mt-0 [&_p]:mb-[11px] [&_p]:mx-0 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_textarea]:block [&_textarea]:box-border [&_textarea]:w-full [&_textarea]:min-h-[108px] [&_textarea]:border [&_textarea]:border-[#EAE4D7] [&_textarea]:rounded-[10px] [&_textarea]:p-[12px] [&_textarea]:text-[13px] [&_textarea]:leading-[1.7] [&_textarea]:bg-white [&_textarea]:text-[#1A1612] [&_textarea]:resize-y [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-solid [&_textarea:focus-visible]:outline-[#C59B58] [&_textarea:focus-visible]:outline-offset-[2px] [&_textarea::placeholder]:text-[#A39784]">
        <label htmlFor="storefront-description">Giới thiệu gian hàng</label>
        <p>Giúp khách hiểu thương hiệu, sản phẩm nổi bật và cam kết của Shop.</p>
        <textarea id="storefront-description" value={description} rows={4}
          placeholder="Kể ngắn gọn về thương hiệu và điều khiến gian hàng của bạn khác biệt…"
          onChange={event => onDescriptionChange(event.target.value)} />
        <div className="sf-settings-description-footer flex justify-between gap-[12px] text-[10px] text-[#7D715E] mt-[8px] leading-[1.5] [&>span:last-child]:whitespace-nowrap [@media(max-width:420px)]:flex-wrap [@media(max-width:420px)]:gap-[4px]"><span>Bấm “Lưu thay đổi” để cập nhật giới thiệu.</span><span>{description.length.toLocaleString('vi-VN')} ký tự</span></div>
      </div>
    </div>
  </details>;
}
