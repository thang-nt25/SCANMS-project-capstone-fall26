import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Tag, Check, Clock3, Copy, CheckCircle2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { type DiscountType, type CouponScope } from '../../services/coupon.service';

interface CouponProposalCardProps {
  card: {
    type: string;
    couponId?: string;
    code: string;
    discountType?: DiscountType;
    discountValue?: number;
    desiredDiscount?: number;
    minimumOrderAmount?: number;
    maximumDiscountAmount?: number;
    validityDays?: number;
    startsAt?: string;
    expiresAt?: string;
    scopeType?: CouponScope;
    discountPercent?: number;
    usageLimit?: number;
    note?: string;
    storeId?: string;
    storeName?: string;
    status?: string;
  };
  isMine: boolean;
  isShop: boolean;
  activeConv?: any;
}

export function CouponProposalCardBubble({
  card,
  isShop,
  activeConv,
}: CouponProposalCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const isApproved = card.status === 'APPROVED' || card.type === 'COUPON_PROPOSAL_APPROVED';
  const officialPercent = card.discountValue || card.discountPercent;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(card.code);
    setCopied(true);
    toast.success(`Đã sao chép mã ${card.code}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-[340px] max-w-full rounded-2xl border border-[#EEDFC6] bg-white text-[#1A1612] shadow-[0_3px_12px_rgba(35,29,21,0.03)] text-left overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3.5 py-3 bg-[#FAF8F5] border-b border-[#EAE4D7]">
        <span className="grid place-items-center shrink-0 w-[34px] h-[34px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]">
          <Ticket size={18} />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[10px] leading-3.5 text-[#7D715E]">Đề xuất ưu đãi</span>
          <strong className="text-[13px] leading-[18px] font-semibold text-[#1A1612] truncate">
            Mã độc quyền KOL
          </strong>
        </div>
        <span
          className={`px-2 py-0.5 border rounded-md text-[9px] font-semibold tracking-wider flex items-center gap-1 ${
            isApproved
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'
          }`}
        >
          {isApproved ? <Check size={11} className="text-[#059669]" /> : <Clock3 size={11} />}
          {isApproved ? 'ĐÃ KÍCH HOẠT' : 'CHỜ DUYỆT'}
        </span>
      </header>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {/* Voucher Code Box */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]">
          <div>
            <span className="text-[10px] text-[#7D715E] block">Mã ưu đãi độc quyền</span>
            <strong className="text-base font-extrabold tracking-wider font-mono text-[#1A1612]">
              {card.code}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F] hover:bg-[#F3EFE6] transition cursor-pointer"
            title="Sao chép mã"
          >
            {copied ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
            <span className="text-[10px] text-[#7D715E] block">Mức giảm ưu đãi</span>
            <strong className="text-xs font-bold text-[#B88E4F]">
              {officialPercent ? `${officialPercent}%` : 'Shop thiết lập (3%–20%)'}
            </strong>
            <span className="text-[9.5px] text-[#7D715E] block mt-0.5">
              Phạm vi: Toàn cửa hàng
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
            <span className="text-[10px] text-[#7D715E] block">Đơn tối thiểu</span>
            <strong className="text-xs font-bold text-[#1A1612] block">
              {card.minimumOrderAmount ? `${Number(card.minimumOrderAmount).toLocaleString('vi-VN')}₫` : 'Shop cấu hình'}
            </strong>
            <span className="text-[9.5px] text-[#7D715E] block mt-0.5">
              Toàn cửa hàng
            </span>
          </div>
        </div>

        {/* Validity & Scope badge */}
        <div className="flex items-center justify-between text-[10.5px] text-[#7D715E] bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EAE4D7]/80">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-[#B88E4F]" />
            <span>Thời hạn: {card.validityDays ? `${card.validityDays} ngày` : '30 ngày'}</span>
          </span>
          <span className="truncate max-w-[130px] font-medium text-[#1A1612]">
            {card.storeName || activeConv?.store?.name || 'Cửa hàng trực thuộc'}
          </span>
        </div>

        {card.note && (
          <div className="text-[11px] text-[#7D715E] bg-[#FAF8F5] p-2 rounded-lg border border-[#EAE4D7]/80 leading-relaxed">
            <span className="font-semibold text-[#1A1612]">Cam kết: </span>
            {card.note}
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <footer className="px-3.5 py-2.5 border-t border-[#EAE4D7] bg-[#FAF8F5]">
        {isApproved ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 size={15} className="text-[#059669] shrink-0" />
            <span>Mã đã kích hoạt · Khách áp dụng được ngay</span>
          </div>
        ) : isShop ? (
          <button
            type="button"
            onClick={() => {
              const target = card.couponId
                ? `/merchant/promotions?tab=creator-incentives&reviewCouponId=${encodeURIComponent(card.couponId)}`
                : '/merchant/promotions?tab=creator-incentives';
              navigate(target);
            }}
            className="w-full min-h-[34px] px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Tag size={14} />
            <span>Xem chi tiết &amp; Xét duyệt</span>
            <ExternalLink size={12} />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#7D715E]">
            <Clock3 size={13} className="text-[#B88E4F] shrink-0" />
            <span>Đã gửi đề xuất · Đang chờ Quản lý Cửa hàng xét duyệt &amp; gán %</span>
          </div>
        )}
      </footer>
    </div>
  );
}
