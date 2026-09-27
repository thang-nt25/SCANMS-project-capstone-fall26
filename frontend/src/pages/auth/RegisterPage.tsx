import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Percent,
  ShieldCheck,
  AlertCircle,
  Mail,

  Lock,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  ArrowLeft,
  Truck,
  RotateCcw,
  UserRound,
  ArrowRight,
  CheckCircle2,
  Check,
  X,
  Gift,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { triggerGoogleSignIn } from '../../utils/googleAuth';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../utils/toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get('redirect');
  const returnTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\')
    ? requestedRedirect
    : null;
  const loginUrl = returnTo ? `/login?redirect=${encodeURIComponent(returnTo)}` : '/login';
  const goToLoginAfterRegistration = (registeredAddress: string, provider: 'email' | 'google') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('scanms-current-role');
    localStorage.removeItem('scanms-active-workspace');
    localStorage.removeItem('current_store_id');
    const params = new URLSearchParams(returnTo ? { redirect: returnTo } : {});
    params.set('registered', provider);
    if (provider === 'email') params.set('email', registeredAddress);
    navigate(`/login?${params.toString()}`, { replace: true });
  };

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
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showReferralInput, setShowReferralInput] = useState(Boolean(searchParams.get('ref')));
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);

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
    if (!canResendOtp || !registeredEmail) return;
    try {
      await authService.sendOtp(registeredEmail);
      toast.success('Đã gửi lại mã xác thực OTP mới vào email của bạn.');
      setOtpCountdown(60);
      setCanResendOtp(false);
    } catch (err: any) {
      toast.error('Không thể gửi lại mã OTP lúc này.');
    }
  };

  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
  const isNameValid = fullName.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordMin = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;

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
      await authService.sendOtp(email);
      setRegisteredEmail(email);
      setOtpCountdown(60);
      setCanResendOtp(false);
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

      setShowOtpModal(false);
      toast.success('Đăng ký thành công. Vui lòng đăng nhập bằng tài khoản vừa tạo.');
      goToLoginAfterRegistration(registeredEmail, 'email');
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

  const handleGoogleRegister = () => {
    setError(null);
    setIsGoogleLoading(true);

    const onTokenSuccess = async (idToken: string) => {
      try {
        const result: any = await authService.googleLogin(idToken, 'CUSTOMER');
        const googleEmail = result?.data?.user?.email || result?.user?.email || '';
        toast.success('Xác thực Google thành công! Chuyển tiếp hệ thống...');
        goToLoginAfterRegistration(googleEmail, 'google');
      } catch (err: any) {
        setError(err.message || 'Đăng ký qua Google thất bại');
      } finally {
        setIsGoogleLoading(false);
      }
    };

    triggerGoogleSignIn(
      onTokenSuccess,
      (errorMsg: string) => {
        setError(errorMsg);
        setIsGoogleLoading(false);
      },
      () => {
        setIsGoogleLoading(false);
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-10">
      {/* Top Breadcrumb */}
      <header className="max-w-[1400px] mx-auto w-full mb-6 flex flex-wrap justify-between items-center gap-3 relative z-10">
        <Link
          to="/marketplace"
          id="btn-back-to-marketplace-register"
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 hover:bg-white border border-[#EAE4D7] text-[#1A1612] text-xs font-bold hover:border-[#C59B58] transition-all shadow-[0_2px_8px_rgba(26,22,18,0.04)] hover:shadow-xs group cursor-pointer backdrop-blur-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#B88E4F] group-hover:-translate-x-1 transition-transform" />
          <ShoppingBag className="w-3.5 h-3.5 text-[#B88E4F]" />
          <span>Quay về Sàn Mua Sắm SCANMS</span>
        </Link>
        <div className="hidden sm:flex items-center gap-3 text-xs text-[#7D715E] font-medium">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#EAE4D7] text-[11px] font-semibold text-[#1A1612]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Hệ thống vận hành 99.98% SLA
          </span>
          <span className="text-[#B88E4F] font-bold">Cổng Đăng Ký Đối Tác</span>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Left: Branding & Opportunity Showcase */}
        <div className="lg:col-span-6 bg-[#F3EFE6] border border-[#EAE4D7] rounded-[28px] p-7 sm:p-9 flex flex-col justify-between gap-6 text-left relative overflow-hidden shadow-xs">
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

          {/* Footer Security / Trust Badges */}
          <div className="relative z-10 pt-4 mt-auto border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-[#7D715E]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                Bảo vệ dữ liệu SSL 256-bit
              </span>
              <span>•</span>
              <span>Xác thực OTP tự động</span>
            </div>
            <span>© 2026 SCANMS Corporation</span>
          </div>
        </div>

        {/* Right: Registration Form (Customer-First) */}
        <div className="lg:col-span-6 w-full flex flex-col">
          <div className="bg-white rounded-[28px] border border-[#EAE4D7] shadow-[0_18px_55px_rgba(93,70,35,0.08)] p-5 sm:p-7 lg:p-8 flex flex-col gap-5 text-left h-full justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EAE4D7] text-[11px] font-bold text-[#B88E4F] mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG</span>
              </div>
              <h2 className="text-2xl sm:text-[28px] font-black text-[#1A1612] tracking-tight m-0">
                Tạo tài khoản SCANMS
              </h2>
              <p className="text-xs sm:text-sm text-[#7D715E] mt-1.5 m-0">
                Tạo tài khoản khách hàng để mua sắm tại các gian hàng đối tác.
              </p>
              {/* Stepper Indicator */}
              <div className="mt-4 flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white border border-[#EEDFC6] shadow-2xs text-[#B88E4F]">
                  <span className="w-5 h-5 rounded-full bg-[#B88E4F] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <span className="text-[11px] font-bold truncate">01. Thông tin</span>
                </div>
                <div className="w-3 h-0.5 bg-[#EAE4D7] rounded-full shrink-0" />
                <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[#7D715E]">
                  <span className="w-5 h-5 rounded-full bg-[#EAE4D7] text-[#7D715E] text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[11px] font-medium truncate">02. Mã OTP</span>
                </div>
                <div className="w-3 h-0.5 bg-[#EAE4D7] rounded-full shrink-0" />
                <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[#7D715E]">
                  <span className="w-5 h-5 rounded-full bg-[#EAE4D7] text-[#7D715E] text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[11px] font-medium truncate">03. Đăng nhập</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Main Customer Register Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1A1612]">
                  Họ và tên <span className="text-rose-600">*</span>
                  </label>
                  {isNameValid && (
                    <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                    </span>
                  )}
                </div>
                <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] hover:border-[#D5C7B0] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE4D7] group-focus-within:border-[#C59B58]/40 group-focus-within:text-[#B88E4F] text-[#7D715E] flex items-center justify-center shrink-0 ml-2 shadow-2xs transition-colors">
                    <UserRound className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên của bạn"
                    autoComplete="name"
                    required
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1A1612] placeholder:text-[#9E9382] outline-none font-medium"
                  />
                  {fullName && (
                    <button
                      type="button"
                      onClick={() => setFullName('')}
                      className="text-[#9E9382] hover:text-[#1A1612] p-1 mr-2 rounded-full hover:bg-[#EAE4D7]/50 cursor-pointer"
                      title="Xóa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1A1612]">
                    Địa chỉ Email <span className="text-rose-600">*</span>
                    </label>
                    {isEmailValid && (
                      <span className="text-[10px] font-bold text-[#059669] flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                      </span>
                    )}
                  </div>
                  <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] hover:border-[#D5C7B0] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE4D7] group-focus-within:border-[#C59B58]/40 group-focus-within:text-[#B88E4F] text-[#7D715E] flex items-center justify-center shrink-0 ml-2 shadow-2xs transition-colors">
                      <Mail className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@gmail.com"
                      required
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1A1612] placeholder:text-[#9E9382] outline-none font-medium"
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEmail('')}
                        className="text-[#9E9382] hover:text-[#1A1612] p-1 mr-2 rounded-full hover:bg-[#EAE4D7]/50 cursor-pointer"
                        title="Xóa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1A1612]">
                    Số điện thoại nhận hàng
                    </label>
                    <span className="text-[10px] text-[#7D715E]">SMS / Zalo</span>
                  </div>
                  <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] hover:border-[#D5C7B0] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
                    <div className="flex items-center gap-1.5 pl-3 pr-2 py-1 border-r border-[#EAE4D7] my-1 shrink-0 text-xs font-bold text-[#1A1612] select-none">
                      <span className="text-sm">🇻🇳</span>
                      <span>+84</span>
                    </div>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
                      placeholder="0912 345 678"
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1A1612] placeholder:text-[#9E9382] outline-none font-mono font-medium"
                    />
                    {phone && (
                      <button
                        type="button"
                        onClick={() => setPhone('')}
                        className="text-[#9E9382] hover:text-[#1A1612] p-1 mr-2 rounded-full hover:bg-[#EAE4D7]/50 cursor-pointer"
                        title="Xóa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                    Mật khẩu <span className="text-rose-600">*</span>
                  </label>
                  <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] hover:border-[#D5C7B0] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE4D7] group-focus-within:border-[#C59B58]/40 group-focus-within:text-[#B88E4F] text-[#7D715E] flex items-center justify-center shrink-0 ml-2 shadow-2xs transition-colors">
                      <Lock className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      required
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1A1612] placeholder:text-[#9E9382] outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 mr-2 text-[#7D715E] hover:text-[#1A1612] cursor-pointer transition-colors"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1A1612]">
                    Xác nhận mật khẩu <span className="text-rose-600">*</span>
                    </label>
                    {confirmPassword && (
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isPasswordMatch ? 'text-[#059669]' : 'text-rose-600'}`}>
                        {isPasswordMatch ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Khớp mật khẩu
                          </>
                        ) : (
                          'Chưa khớp'
                        )}
                      </span>
                    )}
                  </div>
                  <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] hover:border-[#D5C7B0] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#EAE4D7] group-focus-within:border-[#C59B58]/40 group-focus-within:text-[#B88E4F] text-[#7D715E] flex items-center justify-center shrink-0 ml-2 shadow-2xs transition-colors">
                      <Lock className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      required
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1A1612] placeholder:text-[#9E9382] outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="p-1 mr-2 text-[#7D715E] hover:text-[#1A1612] cursor-pointer transition-colors"
                      title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {password && (
                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7D715E] font-medium">Độ mạnh mật khẩu:</span>
                    <span className={`font-bold ${passStrength.score >= 3 ? 'text-[#059669]' : passStrength.score === 2 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {passStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`rounded-full transition-all duration-300 ${
                          passStrength.score >= level
                            ? passStrength.score === 1
                              ? 'bg-rose-500'
                              : passStrength.score === 2
                              ? 'bg-amber-500'
                              : passStrength.score === 3
                              ? 'bg-emerald-500'
                              : 'bg-[#B88E4F]'
                            : 'bg-[#EAE4D7]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#7D715E] pt-0.5">
                    <span className={`flex items-center gap-1 ${isPasswordMin ? 'text-[#059669] font-bold' : ''}`}>
                      {isPasswordMin ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#7D715E]" />}
                      Tối thiểu 8 ký tự
                    </span>
                    <span className={`flex items-center gap-1 ${hasLetterAndNumber ? 'text-[#059669] font-bold' : ''}`}>
                      {hasLetterAndNumber ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#7D715E]" />}
                      Bao gồm cả chữ và số
                    </span>
                  </div>









                </div>
              )}

              {/* Affiliate Referral Code */}
              <div>
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B88E4F] hover:text-[#1A1612] cursor-pointer transition-colors py-0.5"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>+ Bạn có mã giới thiệu từ KOL hoặc Shop?</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[#B88E4F]" />
                        <span>Mã giới thiệu Tiếp Thị (Tùy chọn)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setReferralCode('');
                          setShowReferralInput(false);
                        }}
                        className="text-[11px] font-semibold text-[#7D715E] hover:text-rose-600 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                    <div className="group relative flex items-center bg-white border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/20 rounded-lg">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: KOL-THANG25 hoặc SHOP99"
                        className="w-full px-3 py-2 text-xs font-mono font-bold text-[#1A1612] placeholder:text-[#9E9382] uppercase outline-none bg-transparent"
                      />
                      {referralCode && (
                        <span className="mr-2 text-[10px] font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Đã áp dụng
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7D715E] m-0">
                      Nhập mã tiếp thị để nhận thêm voucher ưu đãi độc quyền 10% cho đơn hàng đầu tiên.
                    </p>
                  </div>
                )}
              </div>

              {/* Agreement */}
              <label className="flex items-start gap-2.5 text-xs text-[#7D715E] cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-[#EAE4D7] text-[#B88E4F] focus:ring-[#C59B58] mt-0.5"
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#A77D3E] hover:from-[#B88E4F] hover:to-[#966E2E] text-white font-extrabold text-sm transition-all shadow-[0_8px_25px_rgba(197,155,88,0.28)] hover:shadow-[0_12px_32px_rgba(197,155,88,0.38)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Đang gửi mã OTP...' : 'Tạo tài khoản SCANMS'}</span>
                {!loading && <ArrowRight className="w-4 h-4" strokeWidth={1.8} />}
              </button>
            </form>

            <div className="flex items-center gap-3" role="separator">
              <div className="flex-1 h-px bg-[#EAE4D7]" />
              <span className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider whitespace-nowrap">
                Hoặc đăng ký bằng
              </span>
              <div className="flex-1 h-px bg-[#EAE4D7]" />
            </div>

            {/* Social Fast Sign-Up */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading || isGoogleLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58] text-[#1A1612] font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                )}
                <span>{isGoogleLoading ? 'Đang kết nối...' : 'Google SSO'}</span>
              </button>

              <button
                type="button"
                onClick={() => toast.info('Cổng đăng ký liên kết TikTok Creator đang chuẩn bị kích hoạt.')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58] text-[#1A1612] font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="font-extrabold text-sm">🎵</span>
                <span>TikTok Shop</span>
              </button>

            </div>

            <div className="pt-4 border-t border-[#EAE4D7] text-center">
              <p className="text-sm text-[#7D715E]">
                Đã có tài khoản?{' '}
                <Link to={loginUrl} className="inline-flex items-center gap-1 font-bold text-[#B88E4F] hover:text-[#1A1612] transition-colors">
                  Đăng nhập ngay <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </Link>
              </p>
              <p className="mt-2 text-[11px] text-[#7D715E]">
                Muốn trở thành KOL hoặc mở Shop? Bạn có thể đăng ký tham gia sau khi tạo tài khoản.
              </p>
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
          <div className="p-3.5 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#7D715E] leading-relaxed">
            Mã OTP 6 chữ số đã được gửi đến email{' '}
            <strong className="text-[#1A1612] font-semibold">{registeredEmail}</strong>.
            Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam.
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1612] block mb-1.5">Mã OTP (6 số)</label>
            <div className="group relative flex items-center bg-[#FAF8F5] hover:bg-white focus-within:bg-white border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-4 focus-within:ring-[#C59B58]/10 rounded-xl transition-all shadow-2xs">
              <KeyRound className="w-4 h-4 text-[#B88E4F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-xl text-[#1A1612] font-mono font-bold tracking-[0.3em] text-center outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[#7D715E] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
              {otpCountdown > 0 ? (
                <span>Gửi lại mã sau <strong className="text-[#1A1612]">{otpCountdown}s</strong></span>
              ) : (
                <span className="text-amber-700 font-semibold">Mã có thể đã hết hạn</span>
              )}
            </span>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResendOtp || loading}
              className="font-bold text-[#B88E4F] hover:text-[#1A1612] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Gửi lại mã OTP
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#A77D3E] hover:from-[#B88E4F] hover:to-[#966E2E] text-white font-bold text-sm shadow-[0_4px_16px_rgba(197,155,88,0.25)] transition-all cursor-pointer disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Xác nhận &amp; Đăng ký</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
