import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  Sparkles,
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

      <main className="max-w-[1180px] mx-auto w-full my-auto py-2 sm:py-3">
        <div className="w-full rounded-[28px] sm:rounded-[32px] border-2 border-[#EEDFC6] bg-white shadow-[0_24px_70px_rgba(197,155,88,0.18),0_10px_30px_rgba(26,22,18,0.08)] ring-1 ring-[#C59B58]/20 overflow-hidden min-h-[580px] lg:h-[620px] relative">
          
          {/* CỘT TRÁI: MỞ RỘNG (68% CHIỀU RỘNG NỀN TRÊN DESKTOP) - HERO IMAGE ĐẲNG CẤP VỚI ÁNH SÁNG TRÁI -> PHẢI */}
          <div className="relative lg:absolute lg:inset-y-0 lg:left-0 w-full lg:w-[68%] h-[320px] sm:h-[380px] lg:h-full bg-[#F3EFE6] overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-12 z-0 group">
            {/* Ảnh Hero mỹ phẩm cao cấp với ánh sáng chiếu tự nhiên từ góc trên bên trái */}
            <img
              src="/assets/auth_luxury_hero.jpg"
              alt="Hệ sinh thái thương mại đa gian hàng SCANMS"
              className="absolute inset-0 w-full h-full object-cover object-[20%_center] sm:object-center transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Chùm sáng ấm Volumetric Light Leak từ góc trên bên trái */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,248,225,0.45)_0%,_rgba(236,194,114,0.18)_42%,_transparent_75%)] pointer-events-none z-10" />

            {/* Hào quang quét sang mép phải qua dải sóng vào form */}
            <div className="hidden lg:block absolute inset-y-0 right-0 w-48 bg-gradient-to-r from-transparent via-[#C59B58]/15 to-[#ECC272]/30 pointer-events-none z-10" />

            {/* Top-Left Section: Glassmorphic Badge & Slogan đặt ở phần trên đón sáng */}
            <div className="relative z-20 space-y-3.5 max-w-md">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#EEDFC6] text-[#1A1612] text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                <span>Sàn Thương Mại Đối Tác</span>
              </div>

              <h1 className="font-serif italic text-3xl sm:text-4xl lg:text-[40px] leading-[1.18] tracking-tight text-[#1A1612]">
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

          {/* CỘT PHẢI: FORM ĐĂNG KÝ GIAO DIỆN SANG TRỌNG (44% TRÊN DESKTOP) */}
          <div className="relative z-10 w-full lg:w-[44%] xl:w-[42%] lg:ml-auto h-full flex flex-col justify-between p-6 sm:p-8 lg:p-9 xl:p-10 bg-white lg:bg-transparent overflow-visible text-left">
            {/* Desktop 3D Sculpted Liquid Gold Ribbon Divider & Pearlescent Form Surface */}
            <svg
              className="hidden lg:block absolute -top-[2px] -bottom-[2px] -left-16 lg:-left-20 xl:-left-24 h-[calc(100%+4px)] w-[calc(100%+64px)] lg:w-[calc(100%+80px)] xl:w-[calc(100%+96px)] pointer-events-none -z-10 overflow-visible"
              viewBox="0 0 520 620"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sculptedGold3DReg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C59B58" />
                  <stop offset="18%" stopColor="#E5B96E" />
                  <stop offset="38%" stopColor="#FFF2D6" />
                  <stop offset="55%" stopColor="#ECC272" />
                  <stop offset="82%" stopColor="#B88E4F" />
                  <stop offset="100%" stopColor="#7E591F" />
                </linearGradient>

                <linearGradient id="goldSpecularCrestReg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="30%" stopColor="#FFF9E8" stopOpacity="1" />
                  <stop offset="70%" stopColor="#FFF2D6" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#ECC272" stopOpacity="0.9" />
                </linearGradient>

                <radialGradient id="formSurfaceGradReg" cx="0%" cy="45%" r="100%">
                  <stop offset="0%" stopColor="#FAF5EC" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#FDFBF7" stopOpacity="0.98" />
                  <stop offset="55%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                </radialGradient>

                <filter id="ribbonDepthShadowReg" x="-30%" y="-10%" width="170%" height="130%">
                  <feDropShadow dx="8" dy="4" stdDeviation="9" floodColor="#6B4710" floodOpacity="0.35" />
                  <feDropShadow dx="2" dy="1" stdDeviation="3" floodColor="#C59B58" floodOpacity="0.25" />
                </filter>

                <filter id="ribbonAmbientBloomReg" x="-40%" y="-20%" width="180%" height="140%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                </filter>
              </defs>

              {/* Lớp nền Form Pearlescent White lấp đầy từ đường cong sang hết mép phải */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620 L 520,620 L 520,0 Z"
                fill="url(#formSurfaceGradReg)"
              />

              {/* Dải hào quang vàng ấm lan tỏa phía sau dải lụa */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620"
                fill="none"
                stroke="#ECC272"
                strokeWidth="34"
                opacity="0.32"
                filter="url(#ribbonAmbientBloomReg)"
              />

              {/* Bóng đổ khối 3D đè sâu sang bề mặt form bên phải */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620"
                fill="none"
                stroke="#6B4710"
                strokeWidth="18"
                filter="url(#ribbonDepthShadowReg)"
                strokeLinecap="round"
              />

              {/* Thân dải sóng lụa vàng kim 3D kim loại đúc dày dặn */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620"
                fill="none"
                stroke="url(#sculptedGold3DReg)"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Lõi sáng bóng kim loại ở sống giữa dải lụa */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620"
                fill="none"
                stroke="url(#goldSpecularCrestReg)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* Vệt phản chiếu ánh sáng trắng sắc nét (Specular Ridge Glint) */}
              <path
                d="M 75,0 C 105,130 120,210 90,330 C 50,440 30,520 50,620"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.95"
              />
            </svg>

            {/* NỘI DUNG FORM ĐĂNG KÝ */}
            <div className="relative z-20 w-full max-w-[360px] ml-auto mr-auto lg:mr-6 xl:mr-10 flex flex-col justify-between h-full space-y-2 sm:space-y-3">
              {/* Title Header with luxury serif */}
              <div className="text-center flex flex-col items-center">
                <h2 className="font-serif text-3xl sm:text-[32px] font-black tracking-tight text-[#1A1612]">
                  Đăng <span className="text-[#B88E4F]">ký</span>
                </h2>
                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-[#C59B58] to-transparent rounded-full mt-1 opacity-80" />
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
                <span className="bg-white/90 backdrop-blur-xs px-3 text-[11px] font-medium text-[#7D715E] uppercase tracking-wider absolute">
                  hoặc email
                </span>
              </div>

              {error && (
                <div className="p-2 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs text-[#DC2626] font-medium">
                  {error}
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Họ và tên của bạn"
                    className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-4 focus:ring-[#C59B58]/12 rounded-2xl px-4 text-xs font-medium text-[#1A1612] outline-hidden transition shadow-2xs placeholder:text-[#A69986]"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Địa chỉ Email"
                    className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-4 focus:ring-[#C59B58]/12 rounded-2xl px-4 text-xs font-medium text-[#1A1612] outline-hidden transition shadow-2xs placeholder:text-[#A69986]"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại (tùy chọn)"
                    className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-4 focus:ring-[#C59B58]/12 rounded-2xl px-4 text-xs font-medium text-[#1A1612] outline-hidden transition shadow-2xs placeholder:text-[#A69986]"
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
                      className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-4 focus:ring-[#C59B58]/12 rounded-2xl pl-3 pr-8 text-xs font-medium text-[#1A1612] outline-hidden transition shadow-2xs placeholder:text-[#A69986]"
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
                      className="w-full h-10 bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:bg-white focus:ring-4 focus:ring-[#C59B58]/12 rounded-2xl px-3 text-xs font-medium text-[#1A1612] outline-hidden transition shadow-2xs placeholder:text-[#A69986]"
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

                {/* Submit button: Imperial Gold Pill */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-[#C59B58] via-[#D4A359] to-[#B88E4F] hover:from-[#B88E4F] hover:via-[#C59B58] hover:to-[#A87B38] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_10px_25px_-4px_rgba(197,155,88,0.5),0_4px_10px_rgba(197,155,88,0.25)] hover:shadow-[0_14px_30px_-4px_rgba(197,155,88,0.65)] active:scale-[0.99] border-t border-white/30 cursor-pointer disabled:opacity-50 ring-1 ring-white/20 ring-inset"
                >
                  <span>{loading ? 'Đang gửi mã xác thực...' : 'Đăng ký tài khoản'}</span>
                </button>
              </form>

              {/* Bottom switch link */}
              <div className="text-center pt-1 border-t border-[#EAE4D7] text-xs text-[#7D715E]">
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-bold text-[#1A1612] hover:text-[#C59B58] underline underline-offset-4 decoration-[#C59B58]/40 hover:decoration-[#C59B58] transition">
                  Đăng nhập ngay
                </Link>
              </div>
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
