import { useState } from 'react';
import { Copy, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { chatVoucherDiscount, chatVoucherHint } from '../../utils/chat-voucher';

export interface CouponVoucherCardData {
  benefitType?: string;
  fundingSource?: string;
  type: 'COUPON_VOUCHER';
  couponId: string;
  couponCode: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumOrderAmount?: number | null;
  maximumDiscountAmount?: number | null;
  remainingUses?: number | null;
  expiresAt?: string | null;
  scopeType?: string;
  products?: Array<{ id: string; title: string }>;
  categories?: string[];
  storeName?: string;
}

export function CouponVoucherCardBubble({ card }: { card: CouponVoucherCardData }) {
  const [copied, setCopied] = useState(false);
  const discount = chatVoucherDiscount(card);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(card.couponCode);
      setCopied(true);
      toast.success('Đã sao chép mã giảm giá.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép mã trên thiết bị này.');
    }
  };

  return (
    <article className="max-w-sm rounded-2xl border border-[#EEDFC6] bg-white p-3.5 text-[#1A1612] shadow-xs">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#B88E4F]">
        <Ticket className="h-4 w-4" /> Mã giảm giá · {card.storeName || 'Shop'}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#C59B58] bg-[#FBF5EB] p-3">
        <span className="font-mono text-base font-extrabold tracking-wider text-[#8F682E]">{card.couponCode}</span>
        <button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-white px-2.5 py-1.5 text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5]">
          <Copy className="h-3.5 w-3.5" /> {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
      <div className="mt-2 text-sm font-extrabold">{discount}</div>
      <p className="mt-2 text-[11px] font-medium text-[#8F682E]">{chatVoucherHint(card)}</p>
      {card.minimumOrderAmount && <div className="mt-1 text-[11px] text-[#7D715E]">Đơn tối thiểu {Number(card.minimumOrderAmount).toLocaleString('vi-VN')}₫</div>}
      {card.maximumDiscountAmount && card.discountType === 'PERCENTAGE' && <div className="text-[11px] text-[#7D715E]">Giảm tối đa {Number(card.maximumDiscountAmount).toLocaleString('vi-VN')}₫</div>}
      {card.scopeType === 'PRODUCTS' && <div className="mt-1 text-[11px] text-[#7D715E]">Áp dụng cho {card.products?.length || 0} sản phẩm trong danh sách Shop.</div>}
      {card.scopeType === 'CATEGORIES' && <div className="mt-1 text-[11px] text-[#7D715E]">Danh mục: {card.categories?.join(', ') || 'theo điều kiện của Shop'}.</div>}
      {card.expiresAt && <div className="mt-1 text-[11px] text-[#7D715E]">Hạn đến {new Date(card.expiresAt).toLocaleDateString('vi-VN')}</div>}
      {card.remainingUses !== null && card.remainingUses !== undefined && <div className="mt-1 text-[11px] text-[#7D715E]">Còn {card.remainingUses} lượt sử dụng</div>}
    </article>
  );
}
