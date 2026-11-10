import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { couponService } from '../../services/coupon.service';

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
  const [desiredPercent, setDesiredPercent] = useState<number>(10);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setError('Không xác định được ID cửa hàng đối tác.');
      return;
    }
    if (!isCodeValid) {
      setError('Mã ưu đãi không hợp lệ (4-20 ký tự chữ và số, có ít nhất 1 chữ cái).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const startsAt = new Date().toISOString();
      const expiresAt = validityDays > 0
        ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const res = await couponService.proposeCoupon({
        storeId,
        code: trimmedCode,
        discountType: 'PERCENTAGE',
        discountValue: desiredPercent,
        startsAt,
        expiresAt,
        scopeType: 'STORE_WIDE',
        note: note.trim() || undefined,
      });

      const couponId = res?.id || res?.data?.id || (res as any)?.couponId;

      const cardPayload = {
        type: 'COUPON_PROPOSAL',
        couponId,
        code: trimmedCode,
        discountType: 'PERCENTAGE',
        discountValue: desiredPercent,
        desiredDiscount: desiredPercent,
        validityDays,
        startsAt,
        expiresAt,
        scopeType: 'STORE_WIDE',
        note: note.trim() || undefined,
        storeId,
        storeName,
        status: 'PENDING_APPROVAL',
      };

      onSuccess(cardPayload);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi đề xuất mã giảm giá:', err);
      setError(err?.response?.data?.message || 'Không thể gửi đề xuất lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#231D15]/45 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white w-full max-w-2xl rounded-2xl border border-[#EAE4D7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-left flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Gọn gàng, loại bỏ câu chữ rườm rà */}
        <div className="px-5 py-3.5 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
              <Ticket className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#1A1612]">
                Đề xuất mã ưu đãi định danh KOL
              </h3>
              <p className="text-[11px] text-[#7D715E]">
                Cửa hàng nhận đề xuất: <strong className="text-[#1A1612]">{storeName}</strong>
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

        {/* Form Body: 2 Cột song song, không cuộn */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 items-start">
            {/* CỘT TRÁI: Nhập mã, điều kiện & Lời nhắn */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="in-chat-coupon-code" className="text-xs font-bold text-[#1A1612]">
                    Mã ưu đãi mong muốn <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[#7D715E] font-mono">{trimmedCode.length}/20</span>
                </div>
                <input
                  id="in-chat-coupon-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="VD: MAIVIP10 hoặc YENNHI5"
                  maxLength={20}
                  className="w-full px-3.5 py-2 text-sm font-mono font-bold tracking-wider bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none transition uppercase"
                  autoFocus
                />

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-[#7D715E]">Gợi ý:</span>
                  {['+VIP10', '+SALE10', '+DEAL5'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setCode(sug.replace('+', ''))}
                      className="px-2 py-0.5 text-[10px] rounded-md border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:border-[#C59B58] hover:text-[#B88E4F] hover:bg-white transition cursor-pointer font-mono"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Điều kiện hợp lệ: Thu gọn mini badges */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] grid grid-cols-2 gap-1.5 text-[10.5px] text-[#7D715E]">
                <span className={`flex items-center gap-1 ${isLengthValid ? 'text-[#059669] font-medium' : ''}`}>
                  <CheckCircle2 size={11} className={isLengthValid ? 'text-[#059669]' : 'text-[#7D715E]'} /> 4 - 20 ký tự
                </span>
                <span className={`flex items-center gap-1 ${isAlphanumeric ? 'text-[#059669] font-medium' : ''}`}>
                  <CheckCircle2 size={11} className={isAlphanumeric ? 'text-[#059669]' : 'text-[#7D715E]'} /> Chỉ chữ & số
                </span>
                <span className={`flex items-center gap-1 ${hasLetter ? 'text-[#059669] font-medium' : ''}`}>
                  <CheckCircle2 size={11} className={hasLetter ? 'text-[#059669]' : 'text-[#7D715E]'} /> Ít nhất 1 chữ cái
                </span>
                <span className={`flex items-center gap-1 ${!isBanned && trimmedCode ? 'text-[#059669] font-medium' : isBanned ? 'text-red-500' : ''}`}>
                  <CheckCircle2 size={11} className={!isBanned && trimmedCode ? 'text-[#059669]' : 'text-[#7D715E]'} /> Không từ cấm
                </span>
              </div>

              {/* Lời nhắn gửi Shop */}
              <div>
                <label htmlFor="in-chat-coupon-note" className="block text-xs font-bold text-[#1A1612] mb-1">
                  Lời nhắn gửi Shop (Tùy chọn)
                </label>
                <textarea
                  id="in-chat-coupon-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Gắn bio, video review, phiên Live..."
                  maxLength={150}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:bg-white outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* CỘT PHẢI: Mức % (Chỉ 5% và 10%) & Thời hạn */}
            <div className="space-y-3.5">
              {/* Mức % giảm đề xuất: Khớp 100% với Shop Manager (Chỉ 5% và 10%) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Mức giảm đề xuất (Shop duyệt)
                  </label>
                  <span className="text-xs font-extrabold text-[#B88E4F]">Giảm {desiredPercent}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDesiredPercent(pct)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        desiredPercent === pct
                          ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] shadow-2xs font-bold'
                          : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                      }`}
                    >
                      <strong className="block text-sm text-[#1A1612]">Giảm {pct}%</strong>
                      <span className="text-[10px] text-[#7D715E]">
                        {pct === 5 ? 'Ưu đãi phổ thông' : 'Ưu đãi tối đa'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thời hạn hiệu lực: Dạng Segmented Pills 1 dòng */}
              <div>
                <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
                  Thời hạn hiệu lực
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValidityDays(d)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition cursor-pointer ${
                        validityDays === d
                          ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226] shadow-2xs'
                          : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-white'
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
              </div>

              {/* Tóm tắt nhanh thẻ ưu đãi */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[#7D715E]">
                  <span>Áp dụng:</span>
                  <span className="font-semibold text-[#1A1612]">Toàn cửa hàng</span>
                </div>
                <div className="flex items-center justify-between text-[#7D715E]">
                  <span>Kinh phí:</span>
                  <span className="font-semibold text-[#B88E4F]">Cửa hàng chi trả 100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons: Dùng icon Send chuẩn, không dùng icon AI */}
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
              <Send size={13} />
              <span>{loading ? 'Đang gửi...' : 'Gửi đề xuất mã'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
