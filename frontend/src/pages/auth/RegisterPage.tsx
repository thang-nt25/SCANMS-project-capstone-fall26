import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  Sparkles,
  User,
  Mail,
  Phone,
  Lock,
  Gift,
  UserPlus,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { GoogleOfficialButton } from '../../components/auth/GoogleOfficialButton';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../utils/toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedRedirect = searchParams.get('redirect');
  const initialRef = searchParams.get('ref') || '';
  const returnTo =
    requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\')
      ? requestedRedirect
      : null;
  const loginUrl = returnTo ? `/login?redirect=${encodeURIComponent(returnTo)}` : '/login';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(initialRef);
  const [showReferralInput, setShowReferralInput] = useState(Boolean(initialRef));
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [mockOtpHint, setMockOtpHint] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (showOtpModal && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpCountdown]);

  const handleResendOtp = async () => {
    if (!canResendOtp || resendingOtp) return;
    try {
      setResendingOtp(true);
      const res: any = await authService.sendOtp(registeredEmail);
      const otpCode = res?.data?.debugOtp || res?.data?.mockOtp;
      if (otpCode) {
        setMockOtpHint(otpCode);
      }
      setOtpCountdown(60);
      setCanResendOtp(false);
      toast.success('Mã OTP mới đã được gửi tới email của bạn!');
    } catch {
      toast.error('Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setResendingOtp(false);
    }
  };

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
      setOtpCountdown(60);
      setCanResendOtp(false);
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
        if (returnTo) {
          navigate(returnTo);
        } else {
          navigate('/customer/orders');
        }
      } catch {
        const dest = returnTo
          ? `/login?registered=email&email=${encodeURIComponent(registeredEmail)}&redirect=${encodeURIComponent(returnTo)}`
          : `/login?registered=email&email=${encodeURIComponent(registeredEmail)}`;
        navigate(dest);
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
      if (returnTo) {
        navigate(returnTo);
      } else {
        navigate('/customer/orders');
      }
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

      <main className="max-w-[1180px] mx-auto w-full my-auto py-2 sm:py-3">
        <div className="w-full rounded-[28px] sm:rounded-[32px] border border-[#EEDFC6] bg-white shadow-[0_20px_60px_rgba(26,22,18,0.07)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:h-[620px] relative">
          
          {/* CỘT TRÁI: HERO IMAGE ĐẲNG CẤP VỚI ÁNH SÁNG TỰ NHIÊN (7 COLS = ~58%) */}
          <div className="relative w-full h-[320px] sm:h-[380px] lg:h-full lg:col-span-7 bg-[#F3EFE6] overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-12 group">
            {/* Ảnh Hero mỹ phẩm cao cấp đồng bộ với LoginPage */}
            <img
              src="/assets/auth_luxury_hero.jpg"
              alt="Hệ sinh thái thương mại đa gian hàng SCANMS"
              className="absolute inset-0 w-full h-full object-cover object-[25%_center] sm:object-center transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Chùm sáng ấm Volumetric Light Leak từ góc trên bên trái */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,248,225,0.45)_0%,_rgba(236,194,114,0.15)_40%,_transparent_75%)] pointer-events-none z-10" />

            {/* Chuyển sắc viền mép phải nối sang form mượt mà */}
            <div className="hidden lg:block absolute inset-y-0 right-0 w-20 bg-gradient-to-r from-transparent via-[#FAF8F5]/30 to-white/60 pointer-events-none z-10" />

            {/* Đường hairline ngăn cách dọc tinh tế */}
            <div className="hidden lg:block absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-[#EEDFC6]/20 via-[#C59B58]/35 to-[#EEDFC6]/20 z-20 pointer-events-none" />

            {/* Top-Left Section: Glassmorphic Badge & Slogan */}
            <div className="relative z-20 space-y-3.5 max-w-md">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[#EEDFC6] text-[#1A1612] text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                <span>Sàn Thương Mại Đối Tác</span>
              </div>

              <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-[34px] leading-[1.2] tracking-tight text-[#1A1612]">
                Kết nối gian hàng,<br />
                <span className="text-[#B88E4F]">
                  lan tỏa giá trị.
                </span>
              </h1>
            </div>

            {/* Dưới chân để thoáng cho các sản phẩm và hộp quà travertine */}
            <div className="relative z-20" />

            {/* Mobile wave transition */}
            <svg
              className="lg:hidden absolute -bottom-[1px] left-0 right-0 w-full h-7 pointer-events-none z-20"
              viewBox="0 0 400 28"
              preserveAspectRatio="none"
            >
              <path
                d="M0,28 C120,8 280,32 400,16 L400,28 L0,28 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>

          {/* CỘT PHẢI: FORM ĐĂNG KÝ GIAO DIỆN SANG TRỌNG (5 COLS = ~42%) */}
          <div className="relative w-full h-full lg:col-span-5 p-6 sm:p-8 lg:p-9 xl:p-10 flex flex-col justify-between text-left overflow-hidden bg-white">
            
            {/* Header: Tiêu đề căn giữa, typography hiện đại */}
            <div className="text-center">
              <h2 className="text-2xl sm:text-[26px] font-black tracking-tight text-[#1A1612]">
                Đăng ký
              </h2>
            </div>

            {/* Google Button */}
            <div className="w-full">
              <GoogleOfficialButton
                onSuccess={onGoogleRegisterSuccess}
                onError={(err) => setError(err)}
              />
            </div>

            {/* Divider */}
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

            {/* Form inputs */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Họ và tên */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Họ và tên của bạn"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-10 pr-4 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                />
                <User className="w-4 h-4 text-[#A69986] absolute left-3.5 pointer-events-none" />
              </div>

              {/* Email */}
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Địa chỉ Email"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-10 pr-4 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                />
                <Mail className="w-4 h-4 text-[#A69986] absolute left-3.5 pointer-events-none" />
              </div>

              {/* Số điện thoại */}
              <div className="relative flex items-center">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại (tùy chọn)"
                  className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-10 pr-4 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                />
                <Phone className="w-4 h-4 text-[#A69986] absolute left-3.5 pointer-events-none" />
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mật khẩu"
                    className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-9 pr-8 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#A69986] absolute left-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-[#A69986] hover:text-[#1A1612] p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu"
                    className="w-full h-10.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-9 pr-8 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#A69986] absolute left-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 text-[#A69986] hover:text-[#1A1612] p-0.5 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Mã giới thiệu đối tác (Collapsible) */}
              <div className="pt-0.5">
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B88E4F] hover:text-[#C59B58] transition cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Có mã giới thiệu đối tác?</span>
                  </button>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Mã giới thiệu đối tác (Tùy chọn)"
                      className="w-full h-9 bg-[#FBF5EB] border border-[#EEDFC6] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-3 focus:ring-[#C59B58]/12 rounded-xl pl-9 pr-3 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#9E917F]"
                    />
                    <Gift className="w-3.5 h-3.5 text-[#C59B58] absolute left-3 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Điều khoản sử dụng */}
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
                  <Link to="/terms" className="text-[#B88E4F] hover:underline font-semibold">Điều khoản</Link> và{' '}
                  <Link to="/privacy" className="text-[#B88E4F] hover:underline font-semibold">Chính sách</Link> của SCANMS.
                </label>
              </div>

              {/* Submit button: Brand Gold */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10.5 sm:h-11 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(197,155,88,0.28)] hover:shadow-[0_6px_22px_rgba(197,155,88,0.4)] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Đang gửi mã xác thực...' : 'Đăng ký tài khoản'}</span>
              </button>
            </form>

            {/* Bottom switch link */}
            <div className="text-center pt-2 border-t border-[#EAE4D7] text-xs text-[#7D715E]">
              Đã có tài khoản?{' '}
              <Link to={loginUrl} className="font-bold text-[#B88E4F] hover:underline">
                Đăng nhập ngay →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Xác thực OTP */}
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
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Mã kiểm thử (Demo): <strong className="font-mono text-sm tracking-wider text-amber-900">{mockOtpHint}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(mockOtpHint)}
                className="text-[11px] font-bold text-amber-900 underline hover:text-amber-700 cursor-pointer"
              >
                Điền nhanh
              </button>
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

          {/* Đếm ngược 60s và Gửi lại mã */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[#7D715E] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
              {otpCountdown > 0 ? (
                <span>Gửi lại mã sau <strong className="font-mono text-[#1A1612]">{otpCountdown}s</strong></span>
              ) : (
                <span className="text-[#059669] font-medium">Bạn có thể gửi lại mã ngay</span>
              )}
            </span>
            <button
              type="button"
              disabled={!canResendOtp || resendingOtp}
              onClick={handleResendOtp}
              className="font-bold text-[#B88E4F] hover:text-[#C59B58] disabled:opacity-40 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendingOtp ? 'animate-spin' : ''}`} />
              <span>Gửi lại mã OTP</span>
            </button>
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
