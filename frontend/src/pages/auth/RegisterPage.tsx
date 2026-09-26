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

        <div className="flex items-center gap-3">
          <Link
            to="/marketplace"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C59B58]" />
            <span>Sàn mua sắm</span>
          </Link>

          <div className="text-xs text-[#7D715E] font-medium bg-white px-3.5 py-1.5 rounded-full border border-[#EAE4D7] shadow-2xs">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-[#B88E4F] hover:underline">
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto w-full my-auto py-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch lg:h-[610px]">
          
          <div className="relative w-full h-[480px] lg:h-[610px] rounded-3xl overflow-hidden border border-[#EAE4D7] shadow-[0_20px_50px_rgba(26,22,18,0.06)] bg-[#F3EFE6] flex flex-col justify-end p-8 sm:p-11 group">
            <img
              src="/assets/marketplace_luxury_hero.jpg"
              alt="Hệ sinh thái thương mại đa gian hàng SCANMS"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-1">
              <h1
                className="font-display italic text-3xl sm:text-4xl lg:text-[44px] leading-[1.15] tracking-tight drop-shadow-xl"
                style={{ color: '#FFFFFF' }}
              >
                Khởi đầu hành trình,<br />
                <span className="font-display italic" style={{ color: '#ECC272' }}>
                  mở lối cơ hội.
                </span>
              </h1>
            </div>
          </div>

          <div className="w-full h-auto lg:h-[610px] bg-white rounded-3xl border border-[#EAE4D7] shadow-[0_20px_50px_rgba(26,22,18,0.06)] p-7 sm:p-9 flex flex-col justify-between text-left">
            <div>
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
