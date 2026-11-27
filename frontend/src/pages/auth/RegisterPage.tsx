import { authPage, authHeader, authMain, authExperience, authFormPanel, authHeading, authLabel, authInput, authGoogle, authSubmit } from '../../components/auth/auth-form-layout';
import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthFooter } from '../../components/auth/AuthFooter';
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { GoogleOfficialButton } from '../../components/auth/GoogleOfficialButton';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../utils/toast';
import { RegisterShowcase } from '../../components/auth/RegisterShowcase';
import PartnerUpgradeTab from '../customer/PartnerUpgradeTab';

const registerInput = authInput;
const registerLabel = authLabel;
const registerFieldError = 'mt-1.5 text-xs leading-4 text-danger';
const passwordToggle = 'absolute inset-y-0 right-1 grid w-9 cursor-pointer place-items-center rounded-md text-muted hover:text-ink';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedRedirect = searchParams.get('redirect');
  const returnTo =
    requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\')
      ? requestedRedirect
      : null;
  const loginUrl = returnTo ? `/login?redirect=${encodeURIComponent(returnTo)}` : '/login';

  const [registerIntent, setRegisterIntent] = useState<'CUSTOMER' | 'COLLABORATOR'>(() =>
    searchParams.get('role') === 'kol' ? 'COLLABORATOR' : 'CUSTOMER',
  );
  const [onboardingStep, setOnboardingStep] = useState<'account' | 'kol_kyc'>('account');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const errors: Record<string, string> = {};
    const emailField = e.currentTarget.elements.namedItem('email') as HTMLInputElement;
    if (!fullName.trim()) errors.name = 'Vui lòng nhập họ và tên.';
    if (!email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (emailField.validity.typeMismatch) errors.email = 'Email không hợp lệ.';
    if (password.length < 8) errors.password = 'Mật khẩu cần tối thiểu 8 ký tự.';
    if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Mật khẩu nhập lại chưa khớp.';
    if (!agreeTerms) errors.agreeTerms = 'Vui lòng đồng ý để tiếp tục.';
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      (e.currentTarget.elements.namedItem(firstInvalid) as HTMLInputElement).focus();
      return;
    }

    setLoading(true);
    try {
      const res: any = await authService.sendOtp(email.trim());
      setRegisteredEmail(email.trim());
      const otpCode = res?.data?.debugOtp || res?.data?.mockOtp;
      setMockOtpHint(otpCode || null);
      setOtp('');
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
      } as any);

      toast.success('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');

      try {
        await authService.login(registeredEmail, password);
        if (registerIntent === 'COLLABORATOR') {
          setShowOtpModal(false);
          setOnboardingStep('kol_kyc');
          toast.success('Đã xác thực tài khoản! Hãy hoàn tất hồ sơ KOL & eKYC ở Bước 3.');
        } else if (returnTo) {
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
      if (registerIntent === 'COLLABORATOR') {
        setOnboardingStep('kol_kyc');
        toast.success('Đã xác thực Google! Hãy hoàn tất hồ sơ KOL & eKYC ở Bước 3.');
      } else {
        toast.success('Đăng ký & xác thực Google thành công!');
        if (returnTo) {
          navigate(returnTo);
        } else {
          navigate('/customer/orders');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký qua Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`scanms-register-page ${authPage}`}>
      <header className={`register-page-header ${authHeader}`}>
        <Link to="/marketplace" className="hover:opacity-95 transition-opacity">
          <ScanMSLogo size="md" showSubtitle={true} />
        </Link>

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] hover:border-[#C59B58] transition shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C59B58]" />
          <span>Cổng mua sắm</span>
        </Link>
      </header>

      <main className={`register-page-main ${authMain}`}>
        {onboardingStep === 'kol_kyc' ? (
          <div className="space-y-5 py-2">
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-[#7D715E]">
                  <span className="inline-flex items-center gap-1.5 text-[#059669]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    1. Tạo tài khoản
                  </span>
                  <span className="h-px w-5 bg-[#EAE4D7]" />
                  <span className="inline-flex items-center gap-1.5 text-[#059669]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    2. Xác thực OTP
                  </span>
                  <span className="h-px w-5 bg-[#EAE4D7]" />
                  <span className="inline-flex items-center gap-1.5 text-[#B88E4F]">
                    <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white inline-flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    Hồ sơ KOL &amp; eKYC
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1612] m-0">
                  Hoàn tất hồ sơ Cộng tác viên / KOL
                </h1>
                <p className="text-xs text-[#7D715E] m-0 leading-relaxed max-w-2xl">
                  Tài khoản Khách hàng của bạn đã được tạo và xác thực thành công. Hãy điền thông tin kênh mạng xã hội và CCCD bên dưới để gửi Ban Quản Trị xét duyệt nâng cấp lên Cộng tác viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(returnTo || '/customer/orders')}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
              >
                Để sau, vào trang Khách hàng
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 sm:p-6 shadow-xs">
              <PartnerUpgradeTab />
            </div>
          </div>
        ) : (
        <div className={`register-experience ${authExperience} max-[900px]:[&>.register-showcase]:hidden`}>
          <RegisterShowcase name={fullName} />
          <div className={`register-form-panel ${authFormPanel} rounded-[20px]! ring-1 ring-line ring-inset`}>
            <div className="register-form-heading flex flex-col gap-2.5">
              <h2 className={authHeading}>Đăng <span className="text-brand-strong">ký</span></h2>
              <ol
                aria-label="Các bước đăng ký"
                className="register-steps m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-medium text-muted
                  [&>li]:inline-flex [&>li]:items-center [&>li]:gap-1.5 [&>li]:whitespace-nowrap
                  [&_b]:grid [&_b]:size-5 [&_b]:shrink-0 [&_b]:place-items-center [&_b]:rounded-full [&_b]:border [&_b]:border-line [&_b]:text-[10px]
                  [&_[aria-current=step]]:font-semibold [&_[aria-current=step]]:text-[#715126]
                  [&_[aria-current=step]_b]:border-brand [&_[aria-current=step]_b]:bg-brand [&_[aria-current=step]_b]:text-ink
                  [&>li+li]:before:mr-0.5 [&>li+li]:before:h-px [&>li+li]:before:w-3 [&>li+li]:before:bg-line"
              >
                <li aria-current={showOtpModal ? undefined : 'step'}>
                  <b aria-hidden="true">
                    {showOtpModal ? <Check size={12} className="text-[#90682F]" /> : '1'}
                  </b>
                  Tài khoản
                  {showOtpModal && <span className="sr-only">Đã xong</span>}
                </li>
                <li aria-current={showOtpModal ? 'step' : undefined}><b aria-hidden="true">2</b> Xác thực</li>
                {registerIntent === 'COLLABORATOR' && (
                  <li><b aria-hidden="true">3</b> Hồ sơ KOL</li>
                )}
              </ol>
            </div>

            <div
              role="group"
              aria-label="Loại tài khoản"
              className="relative grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-1
                before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:h-5 before:w-px before:-translate-x-1/2 before:-translate-y-1/2 before:bg-line"
            >
              {([
                { id: 'CUSTOMER', label: 'Khách hàng', Icon: ShoppingBag },
                { id: 'COLLABORATOR', label: 'Cộng tác viên / KOL', Icon: Sparkles },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={registerIntent === id}
                  onClick={() => setRegisterIntent(id)}
                  className="flex h-[42px] min-h-[42px] min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-center text-xs leading-tight font-semibold text-[#655A49] transition-colors hover:bg-canvas
                    aria-pressed:border-brand-border aria-pressed:bg-brand-soft aria-pressed:text-[#715126] aria-pressed:[&_svg]:text-brand-strong"
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <GoogleOfficialButton
              text="signup_with"
              onSuccess={onGoogleRegisterSuccess}
              onError={setError}
              disabled={loading}
              className={authGoogle}
            />

            <div className="flex items-center gap-3 text-xs font-medium text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              Hoặc dùng email
            </div>

            {error && !showOtpModal && (
              <div role="alert" className="rounded-[10px] border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col gap-4"
              onChange={(event) => {
                if (!(event.target instanceof HTMLInputElement)) return;
                const { name } = event.target;
                setFieldErrors((previous) => {
                  if (!previous[name] && (name !== 'password' || !previous.confirmPassword)) return previous;
                  const next = { ...previous };
                  delete next[name];
                  if (name === 'password') delete next.confirmPassword;
                  return next;
                });
              }}
            >
              <div className="min-w-0">
                <label htmlFor="register-name" className={registerLabel}>Họ và tên</label>
                <input
                  id="register-name" name="name" type="text" autoComplete="name"
                  value={fullName} onChange={(event) => setFullName(event.target.value)}
                  placeholder="Nhập họ và tên" className={registerInput} required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
                />
                {fieldErrors.name && <p id="register-name-error" className={registerFieldError}>{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 items-start gap-x-3 gap-y-3.5 max-[480px]:grid-cols-1">
                <div className="min-w-0">
                  <label htmlFor="register-email" className={registerLabel}>Email</label>
                  <input
                    id="register-email" name="email" type="email" autoComplete="email"
                    value={email} onChange={(event) => setEmail(event.target.value)}
                    placeholder="ten@example.com" className={registerInput} required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  />
                  {fieldErrors.email && <p id="register-email-error" className={registerFieldError}>{fieldErrors.email}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="register-phone" className={registerLabel}>Số điện thoại <span className="text-[11px] font-normal text-muted">· Tùy chọn</span></label>
                  <input
                    id="register-phone" name="phone" type="tel" autoComplete="tel"
                    value={phone} onChange={(event) => setPhone(event.target.value)}
                    placeholder="0901 234 567" className={registerInput}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 items-start gap-x-3 gap-y-3.5 max-[480px]:grid-cols-1">
                {([
                  { id: 'register-password', name: 'password', label: 'Mật khẩu', placeholder: 'Tối thiểu 8 ký tự', value: password, setValue: setPassword, visible: showPassword, setVisible: setShowPassword },
                  { id: 'register-confirm', name: 'confirmPassword', label: 'Xác nhận mật khẩu', placeholder: 'Nhập lại mật khẩu', value: confirmPassword, setValue: setConfirmPassword, visible: showConfirmPassword, setVisible: setShowConfirmPassword },
                ] as const).map(({ id, name, label, placeholder, value, setValue, visible, setVisible }) => (
                  <div key={id} className="min-w-0">
                    <label htmlFor={id} className={registerLabel}>{label}</label>
                    <div className="relative">
                      <input
                        id={id} name={name} type={visible ? 'text' : 'password'} autoComplete="new-password"
                        value={value} onChange={(event) => setValue(event.target.value)}
                        placeholder={placeholder} className={`${registerInput} pr-11`} required
                        minLength={name === 'password' ? 8 : undefined}
                        aria-invalid={Boolean(fieldErrors[name])}
                        aria-describedby={fieldErrors[name] ? `${id}-error` : name === 'password' ? 'register-password-note' : undefined}
                      />
                      <button
                        type="button" aria-pressed={visible}
                        aria-label={`${visible ? 'Ẩn' : 'Hiện'} mật khẩu${name === 'confirmPassword' ? ' xác nhận' : ''}`}
                        onClick={() => setVisible(!visible)} className={passwordToggle}
                      >
                        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      </button>
                    </div>
                    {fieldErrors[name] && <p id={`${id}-error`} className={registerFieldError}>{fieldErrors[name]}</p>}
                  </div>
                ))}
              </div>
              <span id="register-password-note" className="sr-only">Mật khẩu cần tối thiểu 8 ký tự.</span>

              <div>
                <div className="flex items-start gap-2.5 text-xs text-muted">
                  <input
                    type="checkbox" id="agreeTerms" name="agreeTerms" checked={agreeTerms} required
                    onChange={(event) => setAgreeTerms(event.target.checked)}
                    aria-invalid={Boolean(fieldErrors.agreeTerms)}
                    aria-labelledby="register-terms-label"
                    aria-describedby={fieldErrors.agreeTerms ? 'register-terms-error' : undefined}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
                  />
                  <div id="register-terms-label" className="leading-5">
                    <label htmlFor="agreeTerms" className="cursor-pointer">Tôi đồng ý với</label>{' '}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#805B27] underline underline-offset-2">Điều khoản sử dụng</Link>{' và '}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#805B27] underline underline-offset-2">Chính sách bảo mật</Link>.
                  </div>
                </div>
                {fieldErrors.agreeTerms && <p id="register-terms-error" className={registerFieldError}>{fieldErrors.agreeTerms}</p>}
              </div>

              <button
                type="submit" disabled={loading}
                className={authSubmit}
              >
                {loading ? 'Đang xử lý…' : 'Tiếp tục xác thực'}
                {!loading && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </form>

            {/* Bottom switch link */}
            <div className="register-login-link leading-[1.5] pt-1.5 text-center text-xs text-muted [&_a]:font-semibold [&_a]:text-[#90682F]">
              Đã có tài khoản?{' '}
              <Link to={loginUrl} className="font-bold text-[#B88E4F] hover:underline">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Modal Xác thực OTP */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Xác thực mã OTP Email"
      >
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-2 text-left">
          {error && <div role="alert" className="p-3 rounded-xl bg-[#DC2626]/10 text-xs text-[#DC2626]">{error}</div>}
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
            <label htmlFor="register-otp" className="text-xs font-bold text-[#1A1612]">
              Mã xác thực 6 chữ số
            </label>
            <input
              id="register-otp" inputMode="numeric" autoComplete="one-time-code"
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
            className="w-full h-11 btn-gold-glossy flex items-center justify-center gap-2 text-sm tracking-wide disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? 'Đang xác thực...' : 'Hoàn tất & Đăng nhập'}</span>
          </button>
        </form>
      </Modal>

      <AuthFooter />
    </div>
  );
}
