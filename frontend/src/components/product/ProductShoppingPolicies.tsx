import { useId, useState } from 'react';
import { BadgeCheck, ChevronDown, RotateCcw, ShieldCheck, Truck, Wrench } from 'lucide-react';

export function ProductShoppingPolicies({ storeName, policies }: {
  storeName: string;
  policies?: { genuineCommitment?: string; returnPolicy?: string; shipping?: string; warranty?: string };
}) {
  const id = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const items = [
    { key: 'origin', label: 'Nguồn gốc', title: 'Nguồn gốc sản phẩm', icon: BadgeCheck,
      content: policies?.genuineCommitment?.trim() || 'Liên hệ Shop để được cung cấp thông tin xuất xứ và chứng từ sản phẩm.' },
    { key: 'returns', label: 'Đổi trả', title: 'Đổi trả & hoàn tiền', icon: RotateCcw,
      content: policies?.returnPolicy?.trim() || 'Shop chưa công bố chính sách đổi trả riêng. Vui lòng liên hệ Shop để xác nhận điều kiện trước khi mua.' },
    { key: 'shipping', label: 'Giao nhận', title: 'Giao nhận & kiểm tra hàng', icon: Truck,
      content: policies?.shipping?.trim() || 'Phí và phương thức vận chuyển hiển thị khi thanh toán. Vui lòng xác nhận điều kiện kiểm tra hàng với Shop.' },
    { key: 'warranty', label: 'Bảo hành', title: 'Điều kiện bảo hành', icon: Wrench,
      content: policies?.warranty?.trim() || 'Shop chưa công bố điều kiện bảo hành riêng. Vui lòng liên hệ Shop để được tư vấn cho sản phẩm này.' },
  ];
  const active = items.find(item => item.key === selected);
  return <section className="product-shopping-policies mt-3.5 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-[13px] text-[#1A1612]" aria-labelledby={`${id}-heading`}>
    <header className="psp-heading mb-3 flex items-center gap-[9px] [&>div]:min-w-0 [&>div]:flex-1 [&_h3]:m-0 [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:leading-[1.5] [&_p]:mt-0.5 [&_p]:mb-0 [&_p]:text-[10px] [&_p]:leading-[1.5] [&_p]:text-[#7D715E] [&_p]:[overflow-wrap:anywhere]">
      <span className="psp-heading-icon grid size-[33px] shrink-0 place-items-center rounded-[9px] border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><ShieldCheck size={18} /></span>
      <div><h3 id={`${id}-heading`}>An tâm mua sắm</h3><p>Chính sách của {storeName}</p></div>
      <button type="button" className="psp-toggle cursor-pointer whitespace-nowrap border-0 bg-transparent py-[7px] pr-0 pl-1.5 text-[11px] font-semibold text-[#8A642C] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]" aria-expanded={!!active} aria-controls={`${id}-details`}
        onClick={() => setSelected(active ? null : 'returns')}>{active ? 'Thu gọn' : 'Xem chi tiết'}</button>
    </header>
    <div className="psp-options grid grid-cols-4 gap-[7px] [@media(max-width:700px)]:grid-cols-2">
      {items.map(item => <button key={item.key} type="button" className={`psp-option flex min-h-[38px] min-w-0 cursor-pointer items-center gap-[7px] rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2.5 py-2 text-left text-[11px] font-medium text-[#7D715E] [&>svg]:shrink-0 [&>svg]:text-[#B88E4F] [&>span]:flex-1 [&>span]:text-[#1A1612] hover:border-[#C59B58] hover:bg-[#FBF5EB] [&.is-selected]:border-[#C59B58] [&.is-selected]:bg-[#FBF5EB] [&.is-selected_.psp-chevron]:rotate-180 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]${selected === item.key ? ' is-selected' : ''}`}
        aria-expanded={selected === item.key} aria-controls={`${id}-details`}
        onClick={() => setSelected(selected === item.key ? null : item.key)}>
        <item.icon size={15} /><span>{item.label}</span><ChevronDown size={13} className="psp-chevron [&.psp-chevron]:text-[#7D715E] transition-transform duration-150 ease-[ease] motion-reduce:transition-none" />
      </button>)}
    </div>
    <div id={`${id}-details`} hidden={!active} className="psp-details mt-2.5 rounded-[9px] border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-[11px] [&[hidden]]:hidden [&_h4]:mt-0 [&_h4]:mb-[5px] [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:leading-[1.5] [&_p]:m-0 [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.75] [&_p]:text-[#7D715E] [&_p]:[overflow-wrap:anywhere]" role="region" aria-labelledby={`${id}-detail-title`}>
      {active && <><h4 id={`${id}-detail-title`}>{active.title}</h4><p>{active.content}</p></>}
    </div>
  </section>;
}
