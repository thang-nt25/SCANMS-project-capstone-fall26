import { useState } from 'react';
import { Ticket, Sparkles, Check, Clock3, AlertCircle, Copy, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { couponService, type DiscountType, type CouponScope } from '../../services/coupon.service';

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
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>(card.discountType || 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(
    card.discountValue || card.discountPercent || card.desiredDiscount || 15
  );
  const [usageLimit, setUsageLimit] = useState<number>(card.usageLimit || 50);
  const [minOrder, setMinOrder] = useState<number>(card.minimumOrderAmount || 150000);
  const [maxDiscount] = useState<number>(card.maximumDiscountAmount || 50000);
  const [validityDays] = useState<number>(card.validityDays || 30);
  const [status, setStatus] = useState<string>(card.status || 'PENDING_APPROVAL');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const effectiveStoreId =
    card.storeId ||
    activeConv?.storeId ||
    activeConv?.store?.id ||
    currentUser?.stores?.[0]?.id ||
    currentUser?.storeId;
  const isApproved = status === 'APPROVED' || card.type === 'COUPON_PROPOSAL_APPROVED';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(card.code);
    setCopied(true);
    toast.success(`Đã sao chép mã ${card.code}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNumericInput = (rawText: string, setter: (val: number) => void) => {
    const digits = rawText.replace(/\D/g, '');
    if (!digits) {
      setter(0);
      return;
    }
    const parsed = parseInt(digits, 10);
    setter(Number.isNaN(parsed) ? 0 : parsed);
  };



  const handleApprove = async () => {
    if (!effectiveStoreId || !card.couponId) {
      setError('Thiếu thông tin mã hoặc gian hàng để kích hoạt.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const expiresAt = validityDays > 0
        ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      await couponService.approveCoupon(effectiveStoreId, card.couponId, {
        discountType,
        discountValue,
        minimumOrderAmount: minOrder > 0 ? minOrder : undefined,
        maximumDiscountAmount: discountType === 'PERCENTAGE' && maxDiscount > 0 ? maxDiscount : undefined,
        usageLimitTotal: usageLimit > 0 ? usageLimit : undefined,
        usageLimitPerCustomer: 1,
        expiresAt,
        scopeType: card.scopeType || 'STORE_WIDE',
      });

      setStatus('APPROVED');
      setIsConfigOpen(false);
      const discountLabel = discountType === 'PERCENTAGE'
        ? `giảm ${discountValue}%`
        : `giảm ${discountValue.toLocaleString('vi-VN')}₫`;
      toast.success(`Đã kích hoạt thành công mã "${card.code}" ${discountLabel}!`);
    } catch (err: any) {
      console.error('Lỗi duyệt mã coupon:', err);
      setError(err?.response?.data?.message || 'Không thể kích hoạt mã lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const isPercentage = (card.discountType || discountType) === 'PERCENTAGE';
  const displayVal = card.discountValue || card.discountPercent || card.desiredDiscount || 15;

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
            <span className="text-[10px] text-[#7D715E] block">Mức giảm đề xuất</span>
            <strong className="text-sm font-bold text-[#B88E4F]">
              {isPercentage ? `${displayVal}%` : `${Number(displayVal).toLocaleString('vi-VN')}₫`}
            </strong>
            {isPercentage && card.maximumDiscountAmount && (
              <span className="text-[9.5px] text-[#7D715E] block mt-0.5">
                Tối đa {Number(card.maximumDiscountAmount).toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
            <span className="text-[10px] text-[#7D715E] block">Đơn tối thiểu</span>
            <strong className="text-xs font-bold text-[#1A1612] block">
              {card.minimumOrderAmount ? `${Number(card.minimumOrderAmount).toLocaleString('vi-VN')}₫` : 'Không giới hạn'}
            </strong>
            <span className="text-[9.5px] text-[#7D715E] block mt-0.5">
              {card.scopeType === 'PRODUCTS' ? 'Sản phẩm chỉ định' : 'Toàn gian hàng'}
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
            {card.storeName || activeConv?.store?.name || 'Gian hàng đối tác'}
          </span>
        </div>

        {card.note && (
          <div className="text-[11px] text-[#7D715E] bg-[#FAF8F5] p-2 rounded-lg border border-[#EAE4D7]/80 leading-relaxed">
            <span className="font-semibold text-[#1A1612]">Cam kết: </span>
            {card.note}
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
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
          <div className="space-y-2">
            {!isConfigOpen ? (
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="w-full min-h-[34px] px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles size={14} />
                <span>Cấu hình & Kích hoạt mã ngay</span>
              </button>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-[#EEDFC6] space-y-2.5 animate-in fade-in-50 duration-150">
                <span className="text-[11px] font-bold text-[#1A1612] block">
                  Thiết lập hạn mức giảm chính thức:
                </span>

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENTAGE')}
                    className={`py-1 rounded-lg border font-bold transition cursor-pointer ${
                      discountType === 'PERCENTAGE'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]'
                        : 'border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('FIXED_AMOUNT')}
                    className={`py-1 rounded-lg border font-bold transition cursor-pointer ${
                      discountType === 'FIXED_AMOUNT'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]'
                        : 'border-[#EAE4D7] text-[#7D715E]'
                    }`}
                  >
                    Giảm số tiền VNĐ
                  </button>
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#7D715E] block mb-0.5">
                      {discountType === 'PERCENTAGE' ? '% Giảm giá:' : 'Tiền giảm (VNĐ):'}
                    </label>
                    <input
                      type={discountType === 'PERCENTAGE' ? 'number' : 'text'}
                      inputMode="numeric"
                      value={discountType === 'PERCENTAGE' ? (discountValue === 0 ? '0' : (discountValue || '')) : (discountValue ? String(discountValue) : '')}
                      onChange={(e) => {
                        if (discountType === 'PERCENTAGE') {
                          setDiscountValue(Number(e.target.value) || 0);
                        } else {
                          handleNumericInput(e.target.value, setDiscountValue);
                        }
                      }}
                      className="w-full p-1.5 border border-[#EAE4D7] rounded-lg text-xs font-semibold font-mono focus:border-[#C59B58] outline-none"
                    />
                    {discountType === 'FIXED_AMOUNT' && discountValue > 0 && (
                      <span className="text-[10px] text-[#B88E4F] font-bold font-mono block mt-0.5">
                        {discountValue.toLocaleString('vi-VN')} ₫
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7D715E] block mb-0.5">Số lượt tối đa:</label>
                    <input
                      type="number"
                      min={10}
                      max={5000}
                      value={usageLimit || ''}
                      onChange={(e) => setUsageLimit(Number(e.target.value) || 0)}
                      className="w-full p-1.5 border border-[#EAE4D7] rounded-lg text-xs font-semibold focus:border-[#C59B58] outline-none"
                    />
                  </div>
                </div>

                {/* Min order */}
                <div>
                  <label className="text-[10px] text-[#7D715E] block mb-0.5">Đơn tối thiểu (VNĐ):</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minOrder ? String(minOrder) : ''}
                    onChange={(e) => handleNumericInput(e.target.value, setMinOrder)}
                    className="w-full p-1.5 border border-[#EAE4D7] rounded-lg text-xs font-semibold font-mono focus:border-[#C59B58] outline-none"
                    placeholder="150000"
                  />
                  {minOrder > 0 && (
                    <span className="text-[10px] text-[#B88E4F] font-bold font-mono block mt-0.5">
                      Đơn từ {minOrder.toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="flex-1 py-1.5 text-xs text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleApprove}
                    className="flex-1 py-1.5 text-xs font-bold bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Đang kích hoạt...' : 'Kích hoạt mã'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#7D715E]">
            <Clock3 size={13} className="text-[#B88E4F] shrink-0" />
            <span>Đã gửi đề xuất · Đang chờ Chủ Shop kích hoạt hạn mức</span>
          </div>
        )}
      </footer>
    </div>
  );
}
