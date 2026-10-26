import React, { useState } from 'react';
import { Ticket, X, Sparkles, AlertCircle, CheckCircle2, Calendar, ShoppingBag, DollarSign, Percent } from 'lucide-react';
import { couponService, type DiscountType, type CouponScope } from '../../services/coupon.service';

interface ProposeCouponInChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onSuccess: (cardPayload: any) => void;
}

export function ProposeCouponInChatModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  onSuccess,
}: ProposeCouponInChatModalProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [desiredPercent, setDesiredPercent] = useState<number>(15);
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<number>(30000);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number>(50000);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(150000);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [scopeType, setScopeType] = useState<CouponScope>('STORE_WIDE');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmedCode = code.trim().toUpperCase();
  const isLengthValid = trimmedCode.length >= 4 && trimmedCode.length <= 20;
  const isAlphanumeric = /^[A-Z0-9]+$/.test(trimmedCode);
  const hasLetter = /[A-Z]/.test(trimmedCode);
  const isBanned = [
    'ADMIN',
    'SCANMS',
    'OFFICIAL',
    'SYSTEM',
    'SUPPORT',
    'ROOT',
    'MODERATOR',
    'STAFF',
    'HELPDESK',
    'VOUCHER',
    'PROMO',
    'DISCOUNT',
  ].some((word) => trimmedCode === word || trimmedCode.includes(word));

  const isCodeValid = isLengthValid && isAlphanumeric && hasLetter && !isBanned;

  const handleNumericInput = (rawText: string, setter: (val: number) => void) => {
    const digits = rawText.replace(/\D/g, '');
    if (!digits) {
      setter(0);
      return;
    }
    const parsed = parseInt(digits, 10);
    setter(Number.isNaN(parsed) ? 0 : parsed);
  };

  const formatMoney = (val?: number | null) => {
    if (val === 0) return '0';
    return val ? val.toLocaleString('vi-VN') : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setError('Không xác định được ID gian hàng đối tác.');
      return;
    }
    if (!isCodeValid) {
      setError('Mã coupon không hợp lệ (4-20 ký tự chữ và số, có ít nhất 1 chữ cái).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const startsAt = new Date().toISOString();
      const expiresAt = validityDays > 0
        ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const discountValue = discountType === 'PERCENTAGE' ? desiredPercent : fixedDiscountAmount;

      const res = await couponService.proposeCoupon({
        storeId,
        code: trimmedCode,
        discountType,
        discountValue,
        minimumOrderAmount: minOrderAmount > 0 ? minOrderAmount : undefined,
        maximumDiscountAmount: discountType === 'PERCENTAGE' && maxDiscountAmount > 0 ? maxDiscountAmount : undefined,
        startsAt,
        expiresAt,
        scopeType,
        note: note.trim() || undefined,
      });

      const couponId = res?.id || res?.data?.id || (res as any)?.couponId;

      const cardPayload = {
        type: 'COUPON_PROPOSAL',
        couponId,
        code: trimmedCode,
        discountType,
        discountValue,
        desiredDiscount: desiredPercent,
        minimumOrderAmount: minOrderAmount,
        maximumDiscountAmount: maxDiscountAmount,
        validityDays,
        startsAt,
        expiresAt,
        scopeType,
        note: note.trim() || undefined,
        storeId,
        storeName,
        status: 'PENDING_APPROVAL',
      };

      onSuccess(cardPayload);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi đề xuất mã giảm giá:', err);
      setError(err?.response?.data?.message || 'Không thể gửi đề xuất mã lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/40 p-4 backdrop-blur-xs overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white w-full max-w-lg rounded-2xl border border-[#EAE4D7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-left max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5] shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
              <Ticket className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1612]">
                Đề xuất mã giảm giá riêng cho KOL
              </h3>
              <p className="text-xs text-[#7D715E] mt-0.5">
                Gửi mã mang dấu ấn cá nhân kèm điều kiện hợp tác tới {storeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7D715E] hover:text-[#1A1612] p-1.5 rounded-lg hover:bg-[#F3EFE6] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Store Info Banner */}
          <div className="p-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7D715E] block uppercase font-bold tracking-wider">
                Gian hàng tiếp nhận
              </span>
              <strong className="text-xs font-bold text-[#1A1612]">{storeName}</strong>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#EEDFC6] text-[#B88E4F] font-semibold">
              Khóa đối tác hợp tác
            </span>
          </div>

          {/* Proposed Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="in-chat-coupon-code" className="text-xs font-bold text-[#1A1612]">
                Mã giảm giá đề xuất <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#7D715E]">{trimmedCode.length}/20 ký tự</span>
            </div>
            <input
              id="in-chat-coupon-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="VD: MAIVIP132"
              maxLength={20}
              className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none transition"
              autoFocus
            />

            {/* Quick chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-[#7D715E]">Gợi ý nhanh:</span>
              {['+VIP10', '+SALE15', '+DEAL20', '+SPECIAL'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCode(sug.replace('+', ''))}
                  className="px-2 py-0.5 text-[10px] rounded-lg border border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58] hover:text-[#B88E4F] transition cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
              Hình thức giảm giá mong muốn
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENTAGE')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  discountType === 'PERCENTAGE'
                    ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]/30 shadow-2xs'
                    : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Giảm theo phần trăm (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('FIXED_AMOUNT')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  discountType === 'FIXED_AMOUNT'
                    ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] ring-1 ring-[#C59B58]/30 shadow-2xs'
                    : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Giảm số tiền cố định (VNĐ)</span>
              </button>
            </div>
          </div>

          {/* Discount Value Inputs */}
          {discountType === 'PERCENTAGE' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="in-chat-desired-discount" className="block text-xs font-bold text-[#1A1612] mb-1">
                  Mức giảm (%)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="in-chat-desired-discount"
                    type="number"
                    min={5}
                    max={50}
                    value={desiredPercent || ''}
                    onChange={(e) => setDesiredPercent(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-bold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                    placeholder="15"
                  />
                  <span className="text-xs font-bold text-[#7D715E]">%</span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {[10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDesiredPercent(pct)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        desiredPercent === pct
                          ? 'bg-[#B88E4F] text-white'
                          : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="in-chat-max-discount" className="block text-xs font-bold text-[#1A1612] mb-1">
                  Mức giảm tối đa (VNĐ)
                </label>
                <input
                  id="in-chat-max-discount"
                  type="text"
                  inputMode="numeric"
                  value={maxDiscountAmount ? String(maxDiscountAmount) : ''}
                  onChange={(e) => handleNumericInput(e.target.value, setMaxDiscountAmount)}
                  placeholder="50000"
                  className="w-full px-3 py-2 text-sm font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
                />
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-[#7D715E]">Trần giảm để bảo vệ lợi nhuận Shop</span>
                  {maxDiscountAmount > 0 && (
                    <span className="font-bold text-[#B88E4F] font-mono">
                      {maxDiscountAmount.toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="in-chat-fixed-discount" className="block text-xs font-bold text-[#1A1612] mb-1">
                Số tiền giảm cố định (VNĐ)
              </label>
              <input
                id="in-chat-fixed-discount"
                type="text"
                inputMode="numeric"
                value={fixedDiscountAmount ? String(fixedDiscountAmount) : ''}
                onChange={(e) => handleNumericInput(e.target.value, setFixedDiscountAmount)}
                placeholder="30000"
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
              />
              {fixedDiscountAmount > 0 && (
                <div className="text-[10px] text-[#B88E4F] font-bold font-mono mt-1">
                  Quy đổi: {fixedDiscountAmount.toLocaleString('vi-VN')} ₫
                </div>
              )}
              <div className="flex gap-1.5 mt-1.5">
                {[20000, 30000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFixedDiscountAmount(amt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                      fixedDiscountAmount === amt
                        ? 'bg-[#B88E4F] text-white'
                        : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                    }`}
                  >
                    {(amt / 1000).toLocaleString('vi-VN')}K
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Minimum Order Value (Min Spend) */}
          <div>
            <label htmlFor="in-chat-min-order" className="block text-xs font-bold text-[#1A1612] mb-1">
              Giá trị đơn hàng tối thiểu áp dụng (VNĐ)
            </label>
            <input
              id="in-chat-min-order"
              type="text"
              inputMode="numeric"
              value={minOrderAmount ? String(minOrderAmount) : ''}
              onChange={(e) => handleNumericInput(e.target.value, setMinOrderAmount)}
              placeholder="150000"
              className="w-full px-3.5 py-2 text-sm font-bold font-mono bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
            />
            {minOrderAmount > 0 && (
              <div className="text-[10px] text-[#B88E4F] font-bold font-mono mt-1">
                Áp dụng đơn từ: {minOrderAmount.toLocaleString('vi-VN')} ₫
              </div>
            )}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {[0, 100000, 150000, 200000, 300000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMinOrderAmount(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    minOrderAmount === amt
                      ? 'bg-[#B88E4F] text-white'
                      : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-white'
                  }`}
                >
                  {amt === 0 ? 'Không giới hạn' : `${(amt / 1000).toLocaleString('vi-VN')}K`}
                </button>
              ))}
            </div>
          </div>

          {/* Scope & Duration Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Scope */}
            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                Phạm vi áp dụng
              </label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value as CouponScope)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
              >
                <option value="STORE_WIDE">Toàn bộ gian hàng</option>
                <option value="PRODUCTS">Sản phẩm review chỉ định</option>
              </select>
            </div>

            {/* Validity Days */}
            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1">
                Thời hạn hiệu lực
              </label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none"
              >
                <option value={14}>14 ngày (Đợt review video)</option>
                <option value={30}>30 ngày (Chiến dịch tháng)</option>
                <option value={60}>60 ngày (Hợp tác dài hạn)</option>
                <option value={0}>Vô thời hạn (Cho đến khi hết ngân sách)</option>
              </select>
            </div>
          </div>

          {/* Commitment Note */}
          <div>
            <label htmlFor="in-chat-coupon-note" className="block text-xs font-bold text-[#1A1612] mb-1">
              Cam kết đẩy số / Kế hoạch video review
            </label>
            <textarea
              id="in-chat-coupon-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Em sẽ lên 2 video review dòng phục hồi da và ghim mã này ở đầu bình luận..."
              className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none resize-none"
            />
          </div>

          {/* Criteria checklist */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#7D715E] pt-1">
            <span className={`flex items-center gap-1 ${isLengthValid ? 'text-[#059669] font-medium' : ''}`}>
              <CheckCircle2 size={12} /> 4 đến 20 ký tự
            </span>
            <span className={`flex items-center gap-1 ${isAlphanumeric ? 'text-[#059669] font-medium' : ''}`}>
              <CheckCircle2 size={12} /> Chỉ chữ cái & số
            </span>
            <span className={`flex items-center gap-1 ${hasLetter ? 'text-[#059669] font-medium' : ''}`}>
              <CheckCircle2 size={12} /> Có ít nhất 1 chữ cái
            </span>
            <span className={`flex items-center gap-1 ${!isBanned ? 'text-[#059669] font-medium' : 'text-red-500'}`}>
              <CheckCircle2 size={12} /> Không chứa từ cấm
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE4D7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !isCodeValid}
              className="px-5 py-2 text-xs font-bold bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>{loading ? 'Đang gửi...' : 'Gửi đề xuất mã vào Chat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
