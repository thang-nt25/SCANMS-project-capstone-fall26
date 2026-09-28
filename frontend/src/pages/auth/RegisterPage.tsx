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
        <div className="w-full rounded-[28px] sm:rounded-[32px] border border-[#EEDFC6] bg-white shadow-[0_24px_70px_rgba(197,155,88,0.14),0_10px_30px_rgba(26,22,18,0.06)] ring-1 ring-[#C59B58]/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:h-[620px] relative">
          
          {/* CỘT TRÁI: MỞ RỘNG (6 COLS = 50%) - HERO IMAGE ĐẲNG CẤP VỚI ÁNH SÁNG TRÁI -> PHẢI */}
          <div className="relative w-full h-[320px] sm:h-[380px] lg:h-full lg:col-span-6 bg-[#F3EFE6] overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-10 group">
            {/* Ảnh Hero mỹ phẩm cao cấp với ánh sáng chiếu tự nhiên từ góc trên bên trái */}
            <img
              src="/assets/auth_luxury_hero.jpg"
              alt="Hệ sinh thái thương mại đa gian hàng SCANMS"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Chùm sáng ấm Volumetric Light Leak từ góc trên bên trái */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,248,225,0.4)_0%,_rgba(236,194,114,0.15)_40%,_transparent_75%)] pointer-events-none z-10" />

            {/* Hào quang quét sang mép phải qua dải sóng vào form */}
            <div className="hidden lg:block absolute inset-y-0 right-0 w-44 bg-gradient-to-r from-transparent via-[#C59B58]/20 to-[#ECC272]/40 pointer-events-none z-10" />

            {/* Top-Left Section: Glassmorphic Badge & Slogan đặt ở phần trên đón sáng */}
            <div className="relative z-20 space-y-3 max-w-md">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-[#EEDFC6] text-[#1A1612] text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                <span>Sàn Thương Mại Đối Tác</span>
              </div>

              <h1
                className="font-display italic text-2xl sm:text-3xl lg:text-[35px] leading-[1.2] tracking-tight drop-shadow-xs text-[#1A1612]"
              >
                Kết nối gian hàng,<br />
                <span className="font-display italic text-[#B88E4F]">
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

          {/* CỘT PHẢI: FORM ĐĂNG KÝ (6 COLS = 50%) */}
          <div
            className="relative w-full h-full lg:col-span-6 p-6 sm:p-8 lg:p-9 xl:p-10 flex flex-col justify-between text-left overflow-hidden bg-white"
            style={{
              background: 'radial-gradient(ellipse 95% 75% at 0% 40%, rgba(238, 223, 198, 0.48) 0%, rgba(251, 245, 235, 0.3) 36%, rgba(255, 255, 255, 1) 75%)',
            }}
          >
            {/* Desktop Wave Bleed SVG Transition with 3D Sculpted Liquid Gold Ribbon */}
            <svg
              className="hidden lg:block absolute -top-[1px] -bottom-[1px] -left-[1px] h-[calc(100%+2px)] w-24 xl:w-32 pointer-events-none z-10"
              viewBox="0 0 120 620"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sculptedGoldRibbonReg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#C59B58" />
                  <stop offset="25%" stopColor="#ECC272" />
                  <stop offset="50%" stopColor="#FFF9E6" />
                  <stop offset="70%" stopColor="#ECC272" />
                  <stop offset="90%" stopColor="#B88E4F" />
                  <stop offset="100%" stopColor="#8C6527" />
                </linearGradient>
                <linearGradient id="waveHazeReg1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ECC272" stopOpacity="0.38" />
                  <stop offset="60%" stopColor="#FAF8F5" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
                </linearGradient>
                <filter id="ribbonDepthGlowReg" x="-30%" y="-20%" width="160%" height="140%">
                  <feDropShadow dx="-2" dy="2" stdDeviation="3" floodColor="#8C6527" floodOpacity="0.4" />
                  <feDropShadow dx="4" dy="3" stdDeviation="6" floodColor="#ECC272" floodOpacity="0.6" />
                </filter>
              </defs>
              {/* Lớp bóng mờ warm gold phía sau dải sóng */}
              <path
                d="M0,0 C45,115 85,215 62,330 C38,450 86,540 50,620 L0,620 Z"
                fill="url(#waveHazeReg1)"
              />
              <path
                d="M0,0 C38,115 72,215 52,330 C30,450 72,540 42,620 L0,620 Z"
                fill="#FFFFFF"
                opacity="0.85"
              />
              {/* Thân dải sóng lụa vàng kim 3D uốn lượn mềm mại */}
              <path
                d="M0,0 C45,115 85,215 62,330 C38,450 86,540 50,620"
                fill="none"
                stroke="url(#sculptedGoldRibbonReg)"
                strokeWidth="7"
                filter="url(#ribbonDepthGlowReg)"
                strokeLinecap="round"
              />
              {/* Vệt sáng lấp lánh Specular Glint dọc sống dải lụa */}
              <path
                d="M0,0 C45,115 85,215 62,330 C38,450 86,540 50,620"
                fill="none"
                stroke="#FFFDF5"
                strokeWidth="2"
                opacity="0.85"
              />
            </svg>

            {/* Title Header with subtle golden underline */}
            <div className="relative z-20 text-center flex flex-col items-center">
              <h2 className="text-2xl sm:text-[28px] font-black tracking-tight text-[#1A1612]">
                Đăng ký
              </h2>
              <div className="w-12 h-1 bg-gradient-to-r from-transparent via-[#C59B58] to-transparent rounded-full mt-1.5 opacity-80" />
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
                className="w-full h-11 bg-gradient-to-r from-[#C59B58] via-[#D4A359] to-[#B88E4F] hover:from-[#B88E4F] hover:via-[#C59B58] hover:to-[#A67E3F] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_8px_25px_rgba(197,155,88,0.4)] hover:shadow-[0_10px_30px_rgba(197,155,88,0.55)] active:scale-[0.99] border-t border-white/25 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Đang gửi mã xác thực...' : 'Đăng ký tài khoản'}</span>
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
