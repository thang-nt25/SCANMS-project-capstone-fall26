import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Percent,
  ShieldCheck,
  AlertCircle,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  ArrowLeft,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { triggerGoogleSignIn, devBypassGoogleSignIn } from '../../utils/googleAuth';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../utils/toast';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [mockOtpHint, setMockOtpHint] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Rất yếu', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Khá mạnh', color: 'bg-emerald-500' };
      case 4:
        return { score: 4, label: 'Rất mạnh', color: 'bg-amber-600' };
      default:
        return { score: 0, label: 'Chưa nhập', color: 'bg-slate-200' };
    }
  };

  const passStrength = getPasswordStrength(password);

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
      console.error('Send OTP error:', err);
      const errorMsg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
          ? 'Không thể kết nối đến máy chủ Backend (cổng 3000).'
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

      toast.success('Đăng ký tài khoản Khách Hàng thành công! Đang tự động đăng nhập...');

      // Tự động đăng nhập luôn để khách không phải gõ lại
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
          ? 'Không thể kết nối đến máy chủ Backend (cổng 3000).'
          : err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = (useDevBypass: boolean = false) => {
    setError(null);
    setLoading(true);

    const onTokenSuccess = async (idToken: string) => {
      try {
        await authService.googleLogin(idToken, 'CUSTOMER');
        toast.success('Đăng ký & xác thực tài khoản Google thành công!');
        navigate('/customer/orders');
      } catch (err: any) {
        setError(err.message || 'Đăng ký qua Google thất bại');
      } finally {
        setLoading(false);
      }
    };

    if (useDevBypass) {
      devBypassGoogleSignIn(onTokenSuccess, 'customer.new@scanms.vn');
      return;
    }

    triggerGoogleSignIn(
      onTokenSuccess,
      (errorMsg: string) => {
        setError(errorMsg);
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-10">
      {/* Top Breadcrumb */}
      <div className="max-w-[1400px] mx-auto w-full mb-5 flex flex-wrap justify-between items-center gap-3 text-xs">
        <Link
          to="/marketplace"
          id="btn-back-to-marketplace-register"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EAE4D7] text-[#1A1612] font-bold hover:bg-[#F3EFE6] transition shadow-2xs group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#B88E4F] group-hover:-translate-x-1 transition-transform" />
          <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
          <span>Quay về Sàn Mua Sắm Chính (SCANMS Marketplace)</span>
        </Link>
        <div className="flex items-center gap-2 text-[#7D715E] font-medium">
          <span>Đã có tài khoản?</span>
          <Link to="/login" className="font-bold text-[#B88E4F] hover:underline">
            Đăng nhập ngay ↗
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Branding & Opportunity Showcase */}
        <div className="lg:col-span-6 bg-[#F3EFE6] border border-[#EAE4D7] rounded-3xl p-7 sm:p-10 flex flex-col gap-6 text-left relative overflow-hidden shadow-xs">
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              backgroundImage:
                'radial-gradient(#B88E4F 0.75px, transparent 0.75px), radial-gradient(#B88E4F 0.75px, #F3EFE6 0.75px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
            }}
          />

          <div className="relative z-10 flex flex-col gap-5">
            <Link to="/marketplace" className="flex items-center gap-3 no-underline w-fit">
              <div className="w-11 h-11 rounded-xl bg-[#B88E4F] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <strong className="text-xl font-extrabold text-[#1A1612] tracking-tight block">
                  SCANMS
                </strong>
                <span className="text-[11px] font-bold text-[#B88E4F] uppercase tracking-wider block">
                  HỆ SINH THÁI THƯƠNG MẠI ĐIỆN TỬ &amp; TIẾP THỊ
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] text-xs font-bold w-fit">
              <span className="w-2 h-2 rounded-full bg-[#B88E4F] animate-pulse" />
              <span>Đăng Ký Tài Khoản Mua Sắm &amp; Mở Rộng Cơ Hội Hợp Tác</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A1612] tracking-tight leading-tight m-0">
              Gia nhập SCANMS. <br />
              <span className="text-[#B88E4F]">Mua Sắm An Tâm &amp; Nâng Cấp Linh Hoạt.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#7D715E] leading-relaxed max-w-xl m-0">
              Đăng ký tài khoản Khách Hàng chỉ trong 30 giây để tận hưởng chính sách đồng kiểm tận tay.
              Bạn có thể dễ dàng nộp đơn xin nâng cấp lên <strong>KOL Tiếp Thị</strong> hoặc <strong>Mở Gian Hàng</strong> bất kỳ lúc nào!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="bg-white p-3.5 rounded-2xl border border-[#EAE4D7] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-[#1A1612] block">100% Chính Hãng</strong>
                  <span className="text-[11px] text-[#7D715E]">Kiểm định nguồn hàng KYC</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#EAE4D7] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-[#1A1612] block">Đồng Kiểm 14 Ngày</strong>
                  <span className="text-[11px] text-[#7D715E]">Đổi trả miễn phí tận nơi</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#EAE4D7] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-[#1A1612] block">Cơ Hội Kiếm Thu Nhập</strong>
                  <span className="text-[11px] text-[#7D715E]">Nâng cấp làm KOL nhận hoa hồng</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#EAE4D7] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-[#1A1612] block">Mở Gian Hàng Bán Lẻ</strong>
                  <span className="text-[11px] text-[#7D715E]">Tiếp cận mạng lưới Creator</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Registration Form (Customer-First) */}
        <div className="lg:col-span-6 w-full">
          <div className="bg-white rounded-3xl border border-[#EAE4D7] shadow-lg p-6 sm:p-8 flex flex-col gap-5 text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[11px] font-bold text-[#8C6226] mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] tracking-tight m-0">
                Tạo Tài Khoản Mua Sắm
              </h2>
              <p className="text-xs sm:text-sm text-[#7D715E] mt-1.5 m-0">
                Chỉ mất 30 giây để bắt đầu. Bạn có thể gửi đơn xin nâng cấp lên KOL hoặc Mở Shop bất kỳ lúc nào sau khi đăng ký.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Fast Sign-Up Button */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleGoogleRegister(false)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-[#EAE4D7] hover:bg-[#FAF8F5] text-[#1A1612] font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng ký nhanh với Google</span>
              </button>

              {/* Dev Bypass Button for Localhost Verification */}
              <button
                type="button"
                onClick={() => handleGoogleRegister(true)}
                className="text-[11px] text-[#B88E4F] hover:underline font-semibold text-center cursor-pointer py-1"
                title="Sử dụng nếu Google One Tap bị lỗi 403 do tên miền localhost chưa khai báo trên Google Cloud"
              >
                ⚡ Hoặc thử nghiệm nhanh với Google (Chế độ Dev Test)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EAE4D7]" />
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                HOẶC ĐIỀN THÔNG TIN
              </span>
              <div className="flex-1 h-px bg-[#EAE4D7]" />
            </div>

            {/* Main Customer Register Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Họ và tên <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Tuấn"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-sm text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Địa chỉ Email <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@gmail.com"
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Số điện thoại nhận hàng
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Mật khẩu <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Xác nhận mật khẩu <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      required
                      className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#1A1612] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {password && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 1 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 2 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 3 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${passStrength.score >= 4 ? passStrength.color : 'bg-slate-200'}`} />
                  </div>
                  <span className="text-[11px] font-bold text-[#7D715E] shrink-0">
                    Độ mạnh: {passStrength.label}
                  </span>
                </div>
              )}

              {/* Agreement */}
              <label className="flex items-start gap-2.5 text-xs text-[#7D715E] cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] mt-0.5"
                />
                <span>
                  Tôi đồng ý với{' '}
                  <Link to="#" className="font-bold text-[#B88E4F] hover:underline">
                    Điều khoản sử dụng
                  </Link>{' '}
                  và{' '}
                  <Link to="#" className="font-bold text-[#B88E4F] hover:underline">
                    Chính sách bảo mật
                  </Link>{' '}
                  của sàn thương mại điện tử SCANMS.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white font-extrabold text-sm hover:opacity-95 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 mt-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Đang xử lý...' : 'Đăng Ký Tài Khoản Khách Hàng'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#EAE4D7] text-center text-xs text-[#7D715E]">
              Bạn muốn tham gia tiếp thị hoặc bán hàng?{' '}
              <span className="block mt-1 text-[11px] text-[#8C6226]">
                💡 Đăng ký tài khoản Khách Hàng trước, sau đó nộp hồ sơ xin nâng cấp lên <strong>KOL</strong> hoặc <strong>Mở Shop</strong> với 1 biểu mẫu xác thực đơn giản!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Xác thực mã OTP đăng ký"
      >
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 text-left">
          <p className="text-xs text-[#7D715E] leading-relaxed">
            Mã OTP 6 chữ số đã được gửi đến email{' '}
            <strong className="text-[#1A1612] font-semibold">{registeredEmail}</strong>.
            Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam.
          </p>

          {mockOtpHint && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-mono">
              <span className="font-bold">Mã OTP (Môi trường Dev / Demo): </span>
              <strong className="text-sm text-amber-900 tracking-widest">{mockOtpHint}</strong>
              <div className="text-[10px] text-amber-700 mt-1">Hoặc nhập mã test mặc định: <strong>123456</strong></div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Mã OTP (6 số)</label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-10 pr-3.5 py-3 text-base text-[#1A1612] font-mono tracking-widest text-center focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Đang xác thực...' : 'Xác nhận & Hoàn tất đăng ký'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
