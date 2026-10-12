import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Ticket,
  Truck,
  Store,
  Gift,
  Clock3,
} from 'lucide-react';
import { toast } from '../../utils/toast';

const vouchers = [
  {
    code: 'SCANMS15',
    title: 'Giảm 15% đơn hàng đối tác',
    value: '15%',
    label: 'Giảm giá',
    minimum: 'Đơn từ 200.000₫',
    expiry: '31/12/2026',
    scope: 'Toàn bộ gian hàng chính hãng',
    category: 'Đối tác',
    icon: Ticket,
  },
  {
    code: 'FREESHIP50K',
    title: 'Miễn phí vận chuyển toàn sàn',
    value: '50K',
    label: 'Tối đa',
    minimum: 'Đơn từ 150.000₫',
    expiry: '31/12/2026',
    scope: 'Áp dụng cho mọi đơn hàng',
    category: 'Vận chuyển',
    icon: Truck,
  },
  {
    code: 'KOLWELCOME',
    title: 'Ưu đãi khách mới SCANMS',
    value: '30K',
    label: 'Giảm giá',
    minimum: 'Không yêu cầu giá trị tối thiểu',
    expiry: '31/12/2026',
    scope: 'Khách hàng đăng ký mới',
    category: 'Khách mới',
    icon: Gift,
  },
  {
    code: 'SORASKIN20',
    title: 'Giảm 20% tại Sora Skin',
    value: '20%',
    label: 'Giảm giá',
    minimum: 'Đơn từ 350.000₫',
    expiry: '30/11/2026',
    scope: 'Sora Skin Official Store',
    category: 'Gian hàng',
    icon: Store,
  },
];

export function CustomerVouchersTab() {
  const [copiedCode, setCopiedCode] = useState('');
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể nhập mã khi thanh toán.');
    }
  };

  return (
    <section className="@container/vouchers grid gap-[14px] w-full max-w-[1120px] min-w-0 text-[#1A1612] text-left max-md:pb-[64px]" aria-labelledby="customer-vouchers-title">
      <header className="flex items-center gap-[11px] p-[4px_0_14px] border-b border-[#EAE4D7]">
        <span className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true">
          <Ticket size={21} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-[9px]">
            <h1 id="customer-vouchers-title" className="m-0 font-inherit text-[20px] @max-[499px]:text-[19px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Kho voucher</h1>
            <span className="p-[3px_7px] rounded-[6px] bg-[#F3EFE6] text-[#7D715E] text-[11px] leading-[1.5] whitespace-nowrap">
              {vouchers.length} ưu đãi
            </span>
          </div>
          <p className="m-0 mt-[3px] text-[#7D715E] text-[12px] leading-[1.5]">Ưu đãi từ SCANMS và các gian hàng đối tác.</p>
        </div>
      </header>
      <div className="grid grid-cols-2 @max-[899px]:grid-cols-1 items-start gap-[14px] min-w-0">
        {vouchers.map((voucher) => {
          const Icon = voucher.icon;
          const copied = copiedCode === voucher.code;
          return (
            <article className="grid grid-cols-[68px_minmax(0,1fr)_auto] @max-[499px]:grid-cols-[66px_minmax(0,1fr)] items-center gap-[10px_14px] @max-[499px]:gap-[10px_12px] min-w-0 p-[14px_16px_0] @max-[499px]:p-[14px_14px_0] border border-[#EAE4D7] hover:border-[#EEDFC6] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] transition-colors" key={voucher.code}>
              <div className="flex flex-col items-center justify-center gap-[4px] min-h-[68px] p-[8px_4px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]">
                <strong className="text-[27px] @max-[499px]:text-[26px] leading-[1.15] tracking-[-0.8px] font-[650]">{voucher.value}</strong>
                <span className="text-[10px] leading-[1.5] text-[#7D715E]">{voucher.label}</span>
              </div>
              <div className="grid gap-[3px] min-w-0">
                <span className="inline-flex items-center gap-[5px] text-[11px] leading-[1.5] text-[#B88E4F]">
                  <Icon size={13} className="shrink-0" aria-hidden="true" />
                  {voucher.category}
                </span>
                <h2 className="m-0 font-inherit text-[15px] font-[600] leading-[1.45] break-words text-[#1A1612]">{voucher.title}</h2>
                <p className="m-0 text-[#7D715E] text-[11px] leading-[1.5]">{voucher.minimum}</p>
              </div>
              <div className="flex flex-col @max-[499px]:col-span-full @max-[499px]:flex-row @max-[499px]:items-center @max-[499px]:justify-between @max-[499px]:flex-wrap items-stretch gap-[5px] @max-[499px]:gap-[8px] min-w-0">
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-[6px] min-h-[32px] p-[6px_9px] @max-[499px]:px-0 border rounded-[8px] font-inherit text-[11px] font-[550] leading-[1.4] whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] ${
                    copied
                      ? 'border-[#C59B58] bg-[#FBF5EB] text-[#B88E4F]'
                      : 'border-transparent bg-white text-[#1A1612] hover:bg-[#FBF5EB] hover:border-[#C59B58]'
                  }`}
                  onClick={() => void copyCode(voucher.code)}
                  aria-label={`Sao chép mã ${voucher.code}`}
                  title={copied ? 'Đã sao chép' : 'Sao chép mã'}
                >
                  {copied ? <Check size={14} className="shrink-0 text-[#059669]" /> : <Copy size={14} className="shrink-0 text-[#B88E4F]" />}
                  <span className="tracking-[0.3px]">{voucher.code}</span>
                </button>
                <Link
                  className="inline-flex items-center justify-center gap-[6px] min-h-[32px] p-[6px_9px] border border-[#EEDFC6] rounded-[8px] font-inherit text-[11px] font-[550] leading-[1.4] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px]"
                  to="/marketplace"
                >
                  <span>Dùng ngay</span>
                  <ArrowRight size={13} className="shrink-0 text-[#B88E4F]" />
                </Link>
              </div>
              <details className="col-span-full min-w-0 border-t border-[#EAE4D7] mt-0 group">
                <summary
                  className="flex items-center justify-between flex-wrap gap-[5px_10px] min-h-[34px] p-[8px_0] list-none text-[10px] leading-[1.5] text-[#7D715E] hover:text-[#B88E4F] cursor-pointer select-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px]"
                  aria-label={`Điều kiện mã ${voucher.code}, hạn dùng ${voucher.expiry}`}
                >
                  <span className="inline-flex items-center gap-[5px]">
                    Điều kiện
                    <ChevronDown size={13} className="group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                    <Clock3 size={12} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
                    HSD: {voucher.expiry}
                  </span>
                </summary>
                <dl className="grid gap-[7px] m-[0_0_12px] p-[10px_12px] rounded-[8px] bg-[#FAF8F5] text-[11px] leading-[1.6]">
                  <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                    <dt className="text-[#7D715E]">Áp dụng</dt>
                    <dd className="m-0 text-[#1A1612] break-words">{voucher.scope}</dd>
                  </div>
                  <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-[8px]">
                    <dt className="text-[#7D715E]">Giá trị đơn</dt>
                    <dd className="m-0 text-[#1A1612] break-words">{voucher.minimum}</dd>
                  </div>
                </dl>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
