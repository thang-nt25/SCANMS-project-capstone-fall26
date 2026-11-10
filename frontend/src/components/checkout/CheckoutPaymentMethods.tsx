import { CreditCard, QrCode, Wallet, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../utils/marketplace.utils';

export function CheckoutPaymentMethods({
  method,
  onChange,
  balance,
  loading,
  total,
  payosAvailable,
}: {
  method: 'WALLET' | 'PAYOS';
  onChange: (value: 'WALLET' | 'PAYOS') => void;
  balance: number;
  loading: boolean;
  total: number;
  payosAvailable: boolean | null;
}) {
  return (
    <div className="checkout-payment-methods">
      <header className="checkout-section-heading flex items-center justify-between flex-wrap gap-2.5 p-4 sm:p-5 border-b border-[#EAE4D7] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
            <CreditCard size={17} aria-hidden="true" />
          </div>
          <div>
            <h2 id="checkout-payment-title" className="text-sm sm:text-base font-bold text-[#1A1612]">
              Phương thức thanh toán
            </h2>
            <p className="text-[11px] text-[#7D715E]">Thanh toán trực tuyến bảo mật, xác nhận đơn tức thì</p>
          </div>
        </div>
      </header>

      <fieldset className="checkout-payment-options grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 sm:p-6 border-0">
        <legend className="sr-only">Chọn phương thức thanh toán</legend>

        {/* Option 1: Chuyển khoản VietQR / PayOS */}
        <label
          className={`checkout-payment-option relative flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer ${
            method === 'PAYOS'
              ? 'border-2 border-[#C59B58] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6EE] to-[#FFFBEB] shadow-[0_4px_16px_rgba(197,155,88,0.15)] ring-2 ring-[#C59B58]/20'
              : 'border-[#EAE4D7] bg-white hover:border-[#EEDFC6] hover:bg-[#FAF8F5]'
          }`}
          data-selected={method === 'PAYOS'}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="PAYOS"
            checked={method === 'PAYOS'}
            onChange={() => onChange('PAYOS')}
            className="sr-only"
          />

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              method === 'PAYOS'
                ? 'bg-gradient-to-br from-[#D97706] to-[#C59B58] text-white shadow-xs'
                : 'bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]'
            }`}
          >
            <QrCode size={19} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <strong className="text-xs sm:text-[13px] font-bold text-[#1A1612]">
                Chuyển khoản VietQR (PayOS)
              </strong>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-[#D97706] to-[#C59B58] text-white shadow-2xs">
                Khuyên dùng · 24/7
              </span>
            </div>
            <p className="text-[11px] text-[#7D715E] mt-1 leading-relaxed">
              Quét mã QR bằng mọi App ngân hàng hoặc Ví điện tử. Tự động xác nhận sau 3 giây.
            </p>
          </div>

          <div className="shrink-0 mt-0.5">
            {method === 'PAYOS' ? (
              <div className="w-5 h-5 rounded-full bg-[#C59B58] text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 size={13} className="stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-[#D5CDBC] bg-white" />
            )}
          </div>
        </label>

        {/* Option 2: Ví SCANMS */}
        <label
          className={`checkout-payment-option relative flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer ${
            method === 'WALLET'
              ? 'border-2 border-[#C59B58] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6EE] to-[#FFFBEB] shadow-[0_4px_16px_rgba(197,155,88,0.15)] ring-2 ring-[#C59B58]/20'
              : 'border-[#EAE4D7] bg-white hover:border-[#EEDFC6] hover:bg-[#FAF8F5]'
          }`}
          data-selected={method === 'WALLET'}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="WALLET"
            checked={method === 'WALLET'}
            onChange={() => onChange('WALLET')}
            className="sr-only"
          />

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              method === 'WALLET'
                ? 'bg-gradient-to-br from-[#D97706] to-[#C59B58] text-white shadow-xs'
                : 'bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]'
            }`}
          >
            <Wallet size={19} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <strong className="text-xs sm:text-[13px] font-bold text-[#1A1612]">
                Ví mua sắm SCANMS
              </strong>
              {!loading && balance >= total && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                  Thanh toán 1 chạm
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7D715E] mt-1 leading-relaxed">
              Số dư khả dụng:{' '}
              <strong className="text-[#1A1612] font-semibold">
                {loading ? 'Đang tải…' : formatMoney(balance)}
              </strong>
            </p>
            {!loading && balance < total && (
              <p className="text-[11px] font-semibold text-[#B45309] mt-1">
                Cần thêm {formatMoney(total - balance)} để thanh toán bằng ví.
              </p>
            )}
          </div>

          <div className="shrink-0 mt-0.5">
            {method === 'WALLET' ? (
              <div className="w-5 h-5 rounded-full bg-[#C59B58] text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 size={13} className="stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-[#D5CDBC] bg-white" />
            )}
          </div>
        </label>
      </fieldset>

      {method === 'PAYOS' && payosAvailable === false && (
        <p
          className="checkout-payment-notice mx-4 sm:mx-6 mb-4 p-3 border border-[#EEDFC6] rounded-xl bg-[#FBF5EB] text-[#B45309] text-xs leading-relaxed"
          role="status"
        >
          Hệ thống PayOS đang bảo trì định kỳ. Quý khách vui lòng thử lại sau giây lát hoặc sử dụng Ví SCANMS.
        </p>
      )}
    </div>
  );
}
