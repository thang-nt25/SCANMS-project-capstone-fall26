import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { GoogleOfficialButton } from '../../components/auth/GoogleOfficialButton';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../utils/toast';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [mockOtpHint, setMockOtpHint] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu cần tối thiểu 8 ký tự.');
      return;
    }

    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng của SCANMS.');
      return;
    }

    setLoading(true);
    try {
      const res: any = await authService.sendOtp(email);
      setRegisteredEmail(email);
      const otpCode = res?.data?.debugOtp || res?.data?.mockOtp;
      if (otpCode) {
        setMockOtpHint(otpCode);
      }
      setShowOtpModal(true);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
          ? 'Không thể kết nối đến máy chủ Backend.'
          : err?.message || 'Không thể gửi mã xác thực OTP. Vui lòng kiểm tra lại email.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.register({
        email: registeredEmail,
        password,
        fullName,
        phoneNumber: phone || undefined,
        role: 'CUSTOMER',
        otp: otp.trim(),
      });

      toast.success('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');

      try {
        await authService.login(registeredEmail, password);
        navigate('/customer/orders');
      } catch {
        navigate('/login');
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
          ? 'Không thể kết nối đến máy chủ Backend.'
          : err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleRegisterSuccess = async (idToken: string) => {
    try {
      setLoading(true);
      setError(null);
      await authService.googleLogin(idToken, 'CUSTOMER');
      toast.success('Đăng ký & xác thực Google thành công!');
      navigate('/customer/orders');
    } catch (err: any) {
      setError(err.message || 'Đăng ký qua Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] text-[#1A1612] flex flex-col justify-between py-4 px-4 sm:px-8 lg:px-14 selection:bg-[#EEDFC6] selection:text-[#1A1612]">
      <header className="max-w-[1240px] mx-auto w-full flex justify-between items-center py-2">
        <Link to="/marketplace" className="hover:opacity-95 transition-opacity">
          <ScanMSLogo size="md" showSubtitle={true} />
        </Link>

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C59B58]" />
          <span>Sàn mua sắm</span>
        </Link>
      </header>

      <main className="max-w-[1160px] mx-auto w-full my-auto py-2 sm:py-3">
        <div className="w-full rounded-[28px] sm:rounded-[32px] border border-[#EAE4D7] bg-white shadow-[0_24px_65px_rgba(26,22,18,0.07)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:h-[610px] relative">
          
          <div className="relative w-full h-[340px] sm:h-[400px] lg:h-full lg:col-span-5 bg-[#231D15] overflow-hidden flex flex-col justify-end p-7 sm:p-9 group">
            <img
              src="/assets/marketplace_luxury_hero.jpg"
              alt="Hệ sinh thái thương mại đa gian hàng SCANMS"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

            <div className="hidden lg:block absolute inset-y-0 right-0 w-36 bg-gradient-to-r from-transparent via-[#C59B58]/20 to-[#ECC272]/35 pointer-events-none z-10" />

            <div className="relative z-10 space-y-1">
              <h1
                className="font-display italic text-2xl sm:text-3xl lg:text-[38px] leading-[1.18] tracking-tight drop-shadow-xl"
                style={{ color: '#FFFFFF' }}
              >
                Kết nối gian hàng,<br />
                <span className="font-display italic" style={{ color: '#ECC272' }}>
                  lan tỏa giá trị.
                </span>
              </h1>
            </div>

            <svg
              className="lg:hidden absolute -bottom-[1px] left-0 right-0 w-full h-8 pointer-events-none z-20"
              viewBox="0 0 400 32"
              preserveAspectRatio="none"
            >
              <path
                d="M0,32 C90,12 170,28 260,12 C330,-1 370,24 400,20 L400,32 L0,32 Z"
                fill="#FFFFFF"
              />
              <path
                d="M0,32 C70,18 150,30 240,16 C310,4 360,26 400,24 L400,32 L0,32 Z"
                fill="rgba(238, 223, 198, 0.45)"
              />
            </svg>
          </div>

          <div
            className="relative w-full h-full lg:col-span-7 p-6 sm:p-8 lg:p-9 flex flex-col justify-between text-left overflow-hidden bg-white"
            style={{
              background: 'radial-gradient(ellipse 95% 75% at 0% 40%, rgba(238, 223, 198, 0.42) 0%, rgba(251, 245, 235, 0.25) 36%, rgba(255, 255, 255, 1) 72%)',
            }}
          >
            <svg
              className="hidden lg:block absolute -top-[1px] -bottom-[1px] -left-[1px] h-[calc(100%+2px)] w-20 xl:w-24 pointer-events-none z-10"
              viewBox="0 0 100 620"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="waveBleedRegGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C59B58" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#EEDFC6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="waveBleedRegGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ECC272" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#FAF8F5" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,0 C32,95 76,170 56,260 C36,350 86,435 66,525 C50,580 24,605 0,620 Z"
                fill="url(#waveBleedRegGrad1)"
              />
              <path
                d="M0,0 C22,110 54,195 40,285 C24,375 66,455 48,545 C34,592 16,612 0,620 Z"
                fill="url(#waveBleedRegGrad2)"
              />
              <path
                d="M0,0 C12,125 34,205 24,295 C14,385 40,470 28,555 C18,598 6,615 0,620 Z"
                fill="rgba(255, 255, 255, 0.45)"
              />
            </svg>

            <div className="relative z-20">
              <h2 className="text-2xl font-black text-[#1A1612] tracking-tight">
                Tạo tài khoản mới
              </h2>
              <p className="text-xs text-[#7D715E] mt-1 font-medium">
                Nhanh chóng, an toàn và hoàn toàn miễn phí
              </p>
            </div>

            <div className="w-full">
              <GoogleOfficialButton
                onSuccess={onGoogleRegisterSuccess}
                onError={(err) => setError(err)}
              />
            </div>

            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-[#EAE4D7] w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-[#7D715E] uppercase tracking-wider absolute">
                hoặc email
              </span>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs text-[#DC2626] font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Họ và tên của bạn"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl px-4 text-sm text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                />
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Địa chỉ Email"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl px-4 text-sm text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                />
              </div>

              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại (tùy chọn)"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl px-4 text-sm text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mật khẩu"
                    className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-3 pr-8 text-xs text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 text-[#A69986] p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu"
                    className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl px-3 text-xs text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                  />
                </div>
              </div>

              <div className="text-[11px] text-[#7D715E] pt-0.5 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="cursor-pointer leading-snug">
                  Tôi đồng ý với{' '}
                  <Link to="/terms" className="text-[#B88E4F] hover:underline font-semibold">Điều khoản dịch vụ</Link> và{' '}
                  <Link to="/privacy" className="text-[#B88E4F] hover:underline font-semibold">Chính sách bảo mật</Link> của SCANMS.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-sm rounded-xl transition shadow-[0_4px_16px_rgba(197,155,88,0.28)] hover:shadow-[0_6px_20px_rgba(197,155,88,0.38)] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Đang gửi mã xác thực...' : 'Đăng ký tài khoản'}
              </button>
            </form>

            <div className="border-t border-[#EAE4D7] pt-2 text-center text-xs text-[#7D715E]">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-bold text-[#B88E4F] hover:underline">
                Đăng nhập ngay →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Xác thực mã OTP Email"
      >
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-2 text-left">
          <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs text-[#7D715E] leading-relaxed">
            Mã xác thực 6 số đã được gửi tới hòm thư <strong className="text-[#1A1612] font-bold">{registeredEmail}</strong>.
          </div>

          {mockOtpHint && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Mã kiểm thử (Demo): <strong className="font-mono text-sm tracking-wider text-amber-900">{mockOtpHint}</strong></span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1A1612]">
              Mã xác thực 6 chữ số
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="123456"
              className="w-full h-11 text-center font-mono text-lg font-black tracking-[0.3em] bg-white border border-[#EAE4D7] rounded-xl focus:border-[#C59B58] focus:ring-3 focus:ring-[#C59B58]/15 outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full h-11 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Đang xác thực...' : 'Hoàn tất & Đăng nhập'}</span>
          </button>
        </form>
      </Modal>

      <footer className="max-w-[1240px] mx-auto w-full pt-3 text-center text-xs text-[#7D715E] font-medium flex flex-wrap items-center justify-center gap-4">
        <span>© 2026 SCANMS Corporation</span>
        <span>•</span>
        <Link to="/marketplace" className="hover:underline">Sàn Thương Mại</Link>
        <span>•</span>
        <Link to="/privacy" className="hover:underline">Chính sách bảo mật</Link>
        <span>•</span>
        <Link to="/terms" className="hover:underline">Điều khoản dịch vụ</Link>
      </footer>
    </div>
  );
}
