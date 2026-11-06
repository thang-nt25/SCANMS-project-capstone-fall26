import { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X } from 'lucide-react';

export function PrivacyConsentToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('scanms_privacy_consent');
    if (!consent) {
      // Small timeout so it slides in smoothly without interrupting initial page paint
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('scanms_privacy_consent', 'accepted_all');
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('scanms_privacy_consent', 'essential_only');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Thông báo Cookie & Bảo mật Tiếp thị"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-32px)] p-4 rounded-2xl border border-[#DFD6C5] bg-[#FBF5EB] text-[#1A1612] shadow-[0_12px_32px_rgba(35,29,21,0.12)] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white border border-[#DFD6C5] flex items-center justify-center text-[#A87D38] shrink-0">
          <Cookie className="w-4 h-4 text-[#A87D38]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-[#1A1612] m-0 flex items-center gap-1.5">
              <span>Bảo mật & Tiếp thị KOC</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-white text-[10px] font-semibold text-[#059669] border border-[#DFD6C5]">
                <ShieldCheck className="w-2.5 h-2.5" /> Chuẩn GDPA
              </span>
            </h4>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="text-[#6B5E4B] hover:text-[#1A1612] p-1 rounded-lg hover:bg-white/60 transition cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6B5E4B]">
            SCANMS sử dụng cookie kỹ thuật và định danh an toàn để ghi nhận mã tiếp thị của Nhà sáng tạo (KOC) và bảo chứng đơn hàng của bạn.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#A87D38] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Đồng ý tất cả
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-3 py-1.5 rounded-xl border border-[#DFD6C5] bg-white hover:bg-[#F5EFE6] text-[#6B5E4B] text-xs font-semibold transition cursor-pointer"
            >
              Chỉ phiên duyệt
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
