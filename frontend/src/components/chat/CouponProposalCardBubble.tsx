import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Copy, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { type CouponProposalCard } from '@/utils/chat-explorer';

interface CouponProposalCardProps {
  card: CouponProposalCard;
  isShop: boolean;
  storeName?: string;
}

const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

export function CouponProposalCardBubble({ card, isShop, storeName }: CouponProposalCardProps) {
  const navigate = useNavigate();
  const approved = card.status === 'APPROVED' || card.type === 'COUPON_PROPOSAL_APPROVED';
  const rejected = card.status === 'REJECTED';
  const canReview = isShop && !approved && !rejected && card.couponId;
  const discount = card.discountValue ?? card.discountPercent ?? card.desiredDiscount;
  const discountText = discount === undefined
    ? undefined
    : card.discountType === 'FIXED_AMOUNT' ? formatMoney(discount) : `${discount}%`;
  const expiresAt = card.expiresAt ? new Date(card.expiresAt) : null;
  const validity = expiresAt && Number.isFinite(expiresAt.getTime())
    ? expiresAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : card.validityDays ? `${card.validityDays} ngày` : undefined;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(card.code);
      toast.success('Đã sao chép mã ưu đãi');
    } catch {
      toast.error('Không sao chép được mã ưu đãi');
    }
  };

  return (
    <article className="w-[340px] max-w-full overflow-hidden rounded-xl border border-[#EAE4D7] bg-white text-left text-[#1A1612]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2.5">
        <Ticket size={17} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
        <strong className="flex-1 text-sm">Đề xuất mã riêng</strong>
        <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-xs text-[#795522]">
          {approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : 'Chờ duyệt'}
        </span>
      </header>
      <div className="space-y-2 px-3 py-3 text-xs">
        {card.code && (
          <div className="flex items-center gap-2">
            <strong className="min-w-0 break-all font-mono text-sm">{card.code}</strong>
            <button type="button" onClick={copyCode} title="Sao chép mã" aria-label="Sao chép mã"
              className="grid size-7 shrink-0 place-items-center rounded-md text-[#795522] hover:bg-[#FBF5EB]">
              <Copy size={14} />
            </button>
          </div>
        )}
        <p className="break-words text-[#7D715E]">
          {[card.storeName || storeName, card.scopeType === 'STORE_WIDE' ? 'Toàn gian hàng' : undefined].filter(Boolean).join(' · ')}
        </p>
        {discountText && <p>{approved ? 'Mức giảm' : 'Mức giảm đề xuất'} · <strong>{discountText}</strong></p>}
        {validity && <p>Hiệu lực · <strong>{validity}</strong></p>}
        {card.minimumOrderAmount !== undefined && <p>Đơn tối thiểu · {formatMoney(card.minimumOrderAmount)}</p>}
        {card.maximumDiscountAmount !== undefined && <p>Giảm tối đa · {formatMoney(card.maximumDiscountAmount)}</p>}
        {card.note && <p className="whitespace-pre-wrap break-words border-t border-[#EAE4D7] pt-2">{card.note}</p>}
      </div>
      {canReview && (
        <footer className="border-t border-[#EAE4D7] px-3 py-2.5">
          <button type="button"
            onClick={() => navigate(`/merchant/promotions?tab=creator-incentives&reviewCouponId=${encodeURIComponent(canReview)}`)}
            className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#795522] hover:bg-[#F3EFE6]">
            Xem đề xuất <ArrowUpRight size={14} />
          </button>
        </footer>
      )}
    </article>
  );
}
