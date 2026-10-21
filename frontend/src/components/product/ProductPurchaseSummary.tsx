import { CheckCircle2, Package, Ticket } from 'lucide-react';

const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
export function ProductPurchaseSummary({ price, originalPrice, fromPrice, stock, variantName, needsVariantChoice, inactive, quantity, voucher }: {
  price: number; originalPrice?: number | null; fromPrice: boolean; stock: number;
  variantName?: string; needsVariantChoice: boolean; inactive: boolean; quantity: number;
  voucher?: { code: string; discount: number; total: number };
}) {
  const discountPercent = originalPrice && originalPrice > price ? Math.round((originalPrice - price) / originalPrice * 100) : 0;
  return <div className="product-purchase-summary mb-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 py-3 text-[#1A1612] [@media(max-width:420px)]:px-3 [@media(max-width:420px)]:py-[11px]" data-product-price-panel>
    <span className="pps-price-label mb-[3px] block text-[10px] font-medium leading-[1.5] text-[#7D715E]">{fromPrice ? 'Giá từ' : 'Giá bán'}</span>
    <div className="pps-prices flex flex-wrap items-center gap-x-2.5 gap-y-1 [&_del]:whitespace-nowrap [&_del]:text-[11px] [&_del]:text-[#7D715E] [@media(max-width:420px)]:gap-x-2">
      <strong className="pps-price whitespace-nowrap text-[28px] font-extrabold leading-[1.2] tracking-[-.7px] text-[#8A642C] [@media(max-width:420px)]:text-[25px]">{money(price)}</strong>
      {!!discountPercent && <><del>{money(originalPrice!)}</del><span className="pps-sale whitespace-nowrap rounded-[5px] border border-[#EEDFC6] bg-white px-1.5 py-[3px] text-[10px] font-bold text-[#8A642C]">−{discountPercent}%</span></>}
    </div>
    <div className="pps-availability mt-2.5 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 border-t border-[#EEDFC6] pt-[9px] [&_p]:m-0 [&_p]:min-w-[150px] [&_p]:flex-1 [&_p]:text-[11px] [&_p]:leading-[1.5] [&_p]:text-[#7D715E] [&_p]:[overflow-wrap:anywhere]" data-product-availability>
      <p>{needsVariantChoice ? (stock > 0 ? 'Chọn phân loại để xem số lượng có sẵn.' : 'Các phân loại hiện đã hết hàng.')
        : `${variantName ? `${variantName} · ` : ''}${stock.toLocaleString('vi-VN')} sản phẩm có sẵn`}</p>
      <span className="pps-stock inline-flex shrink-0 items-center gap-[5px] text-[11px] font-semibold text-[#1A1612]" role="status" aria-live="polite">
        {stock > 0 && !inactive ? <CheckCircle2 size={13} className="pps-stock-tick text-[#059669]" /> : <Package size={13} />}
        {inactive ? 'Tạm ngừng kinh doanh' : stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
      </span>
    </div>
    {voucher && <div className="pps-voucher mt-2.5 border-t border-[#EEDFC6] pt-2.5 [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:justify-between [&>div]:gap-x-3 [&>div]:gap-y-[5px] [&>div>span]:text-[11px] [&>div>span]:text-[#7D715E] [&_strong]:whitespace-nowrap [&_strong]:text-xl [&_strong]:font-bold [&_strong]:leading-[1.3] [&_strong]:text-[#8A642C] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:flex [&_p]:items-center [&_p]:gap-1.5 [&_p]:text-[11px] [&_p]:text-[#8A642C] [&_p]:[overflow-wrap:anywhere] [&_p_svg]:shrink-0 [&_small]:mt-[5px] [&_small]:block [&_small]:text-[10px] [&_small]:leading-[1.6] [&_small]:text-[#7D715E]" data-product-voucher-total aria-live="polite">
      <div><span>Tạm tính sau voucher · {quantity} sản phẩm</span><strong>{money(voucher.total)}</strong></div>
      <p><Ticket size={13} /><span>{voucher.code} · Giảm {money(voucher.discount)}</span></p>
      <small>Ưu đãi được kiểm tra lại khi thanh toán. Chưa gồm phí vận chuyển.</small>
    </div>}
  </div>;
}
