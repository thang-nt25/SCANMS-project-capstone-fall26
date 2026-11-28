import { CheckCircle2, Package, Ticket } from 'lucide-react';

const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
export function ProductPurchaseSummary({ price, fromPrice, stock, variantName, needsVariantChoice, inactive, quantity, voucher }: {
  price: number; originalPrice?: number | null; fromPrice: boolean; stock: number;
  variantName?: string; needsVariantChoice: boolean; inactive: boolean; quantity: number;
  voucher?: { code: string; discount: number; total: number };
}) {
  return <div className="product-purchase-summary mb-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2.5 text-[#1A1612] sm:px-3.5" data-product-price-panel>
    <div data-product-availability>
      <div className="pps-prices flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="pps-price-label text-[11px] font-medium whitespace-nowrap text-[#7D715E]">{fromPrice ? 'Giá từ' : 'Giá bán'}</span>
          <strong className="pps-price whitespace-nowrap text-[26px] leading-tight font-extrabold tracking-tight tabular-nums text-[#8A642C] sm:text-[30px]">{money(price)}</strong>
        </div>
        <span className="pps-stock inline-flex items-center gap-1.5 rounded-full border border-[#EEDFC6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A1612]" role="status" aria-live="polite">
          {stock > 0 && !inactive ? <CheckCircle2 size={13} className="pps-stock-tick text-[#059669]" aria-hidden="true" /> : <Package size={13} aria-hidden="true" />}
          {inactive ? 'Tạm ngừng kinh doanh' : stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
        </span>
      </div>
      <p className="pps-availability mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-[#EEDFC6] pt-1.5 text-xs leading-relaxed text-[#7D715E]">
        {needsVariantChoice ? (
          stock > 0 ? 'Chọn phân loại để xem tồn kho' : 'Các phân loại hiện đã hết hàng.'
        ) : (
          <>
            {variantName && <strong className="font-semibold text-[#715126]">{variantName}</strong>}
            <span>{variantName && '· '}Còn {stock.toLocaleString('vi-VN')} sản phẩm</span>
          </>
        )}
      </p>
    </div>
    {voucher && <div className="pps-voucher mt-2.5 border-t border-[#EEDFC6] pt-2.5 [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:justify-between [&>div]:gap-x-3 [&>div]:gap-y-[5px] [&>div>span]:text-[11px] [&>div>span]:text-[#7D715E] [&_strong]:whitespace-nowrap [&_strong]:text-xl [&_strong]:font-bold [&_strong]:leading-[1.3] [&_strong]:text-[#8A642C] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:flex [&_p]:items-center [&_p]:gap-1.5 [&_p]:text-[11px] [&_p]:text-[#8A642C] [&_p]:[overflow-wrap:anywhere] [&_p_svg]:shrink-0 [&_small]:mt-[5px] [&_small]:block [&_small]:text-[10px] [&_small]:leading-[1.6] [&_small]:text-[#7D715E]" data-product-voucher-total aria-live="polite">
      <div><span>Tạm tính sau voucher · {quantity} sản phẩm</span><strong>{money(voucher.total)}</strong></div>
      <p><Ticket size={13} /><span>{voucher.code} · Giảm {money(voucher.discount)}</span></p>
      <small>Mã được kiểm tra khi thanh toán. Chưa gồm phí giao hàng.</small>
    </div>}
  </div>;
}
