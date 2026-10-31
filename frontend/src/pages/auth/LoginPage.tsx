import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Store,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Crown,
  ChevronDown,
  Check,
  ArrowLeft,
  UserRound,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import { GoogleOfficialButton } from '../../components/auth/GoogleOfficialButton';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';
import { ShoppingScene } from '../../components/auth/ShoppingScene';
import { AnimatedPasswordField, type PasswordAuthState } from '../../components/auth/AnimatedPasswordField';
import { getDemoLogin } from '../../utils/demo-login';
import { getRememberedIdentifier, getRememberedLoginRole, rememberLoginIdentifier } from '../../utils/remembered-login';
import { safeLoginReturn } from '../../utils/login-return';

type RoleType = 'customer' | 'kol' | 'shop' | 'manager' | 'admin';

interface RoleOption {
  id: RoleType;
  label: string;
  icon: any;
  email: string;
  badge: string;
}

const ROLES: RoleOption[] = [
  { id: 'customer', label: 'Khách mua', icon: ShoppingBag, email: 'customer.an@scanms.vn', badge: 'Trần An (Ví 2.5Tr)' },
  { id: 'kol', label: 'KOL/KOC', icon: Sparkles, email: 'kol.bronze@scanms.vn', badge: 'Lê Hoàng Yến Nhi (TikTok 25K, Đồng)' },
  { id: 'shop', label: 'Chủ Shop', icon: Store, email: 'manager.sora@scanms.vn', badge: 'Nguyễn Văn Minh (Sora Skin Tân Bình)' },
  { id: 'manager', label: 'Vận hành', icon: ShieldCheck, email: 'manager@scanms.vn', badge: 'Lê Thu Trang (Vận Hành & Tuân Thủ)' },
  { id: 'admin', label: 'Quản trị', icon: Crown, email: 'admin@scanms.vn', badge: 'Nguyễn Thành Thắng (Super Admin)' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Nhận redirect và email sau khi đăng ký
  const requestedRedirect = searchParams.get('redirect');
  const registeredProvider = searchParams.get('registered');
  const registeredEmail = searchParams.get('email');
  const returnTo = safeLoginReturn(requestedRedirect);
  const registerUrl = returnTo ? `/register?redirect=${encodeURIComponent(returnTo)}` : '/register';

  const [role, setRole] = useState<RoleType>(() => {
    const requestedRole = searchParams.get('role')?.toLowerCase();
    const normalizedRole = requestedRole === 'collaborator' ? 'kol' : requestedRole;
    if (ROLES.some(option => option.id === normalizedRole)) return normalizedRole as RoleType;
    return registeredEmail ? 'customer' : getRememberedLoginRole();
  });
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [identifier, setIdentifier] = useState(() => {
    if (registeredEmail) return registeredEmail;
    const account = getDemoLogin(role);
    return account?.identifier || getRememberedIdentifier(role) || '';
  });
  const [password, setPassword] = useState(() => registeredEmail ? '' : getDemoLogin(role)?.password || '');
  const [passwordAuthState, setPasswordAuthState] = useState<PasswordAuthState>('idle');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    if (registeredProvider === 'email' && registeredEmail) {
      setIdentifier(registeredEmail);
      setPassword('');
      toast.success(`Đăng ký tài khoản ${registeredEmail} thành công! Vui lòng nhập mật khẩu để đăng nhập.`);
    }
  }, [registeredProvider, registeredEmail]);

  const activeRole = ROLES.find((x) => x.id === role) || ROLES[0];
  const ActiveRoleIcon = activeRole.icon;

  const handleRoleSelect = (selectedRole: RoleType) => {
    if (loading || passwordAuthState === 'success') return;
    if (selectedRole === role) {
      setIsRoleDropdownOpen(false);
      return;
    }
    const account = getDemoLogin(selectedRole);
    setIdentifier(account?.identifier || '');
    setPassword(account?.password || '');
    setPasswordAuthState('idle');
    setRole(selectedRole);
    setError(null);
    setIsRoleDropdownOpen(false);
  };

  const navigateAfterLogin = (userRole?: string) => {
    if (returnTo && !returnTo.startsWith('/login') && !returnTo.startsWith('/register')) {
      const isPrivilegedRole =
        userRole === 'SHOP_MANAGER' ||
        userRole === 'COLLABORATOR' ||
        userRole === 'SYSTEM_ADMIN' ||
        userRole === 'SYSTEM_MANAGER';
      const isCustomerOnlyUrl =
        returnTo.startsWith('/customer/') || returnTo === '/marketplace' || returnTo === '/';
      if (!isPrivilegedRole || !isCustomerOnlyUrl) {
        navigate(returnTo);
        return;
      }
    }
    if (userRole === 'SHOP_MANAGER') {
      navigate('/merchant/dashboard');
    } else if (userRole === 'SYSTEM_ADMIN') {
      navigate('/admin/analytics');
    } else if (userRole === 'SYSTEM_MANAGER') {
      navigate('/admin/users');
    } else if (userRole === 'CUSTOMER') {
      navigate('/customer/orders');
    } else {
      navigate('/collaborator/dashboard');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || passwordAuthState === 'success') return;
    setError(null);
    setLoading(true);
    setPasswordAuthState('checking');
    const submittedIdentifier = identifier.trim();
    const submittedPassword = password;

    try {
      const res: any = await authService.login(submittedIdentifier, submittedPassword);
      const user = res?.data?.user || res?.user;
      const loginRole: RoleType = ({ CUSTOMER: 'customer', COLLABORATOR: 'kol', SHOP_MANAGER: 'shop', SYSTEM_MANAGER: 'manager', SYSTEM_ADMIN: 'admin' } as Record<string, RoleType>)[user?.role] || role;
      rememberLoginIdentifier(loginRole, submittedIdentifier, rememberMe);
      setPasswordAuthState('success');
      toast.success(`Đăng nhập thành công! Chào mừng ${user?.fullName || user?.email}`);

      setTimeout(() => {
        navigateAfterLogin(user?.role);
      }, 350);
    } catch (err: any) {
      setPasswordAuthState('error');
      const errorMsg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
          ? 'Không thể kết nối đến máy chủ Backend.'
          : err?.message || 'Email, số điện thoại hoặc mật khẩu không chính xác.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleTokenSuccess = async (idToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const apiRole =
        role === 'kol'
          ? 'COLLABORATOR'
          : role === 'shop'
          ? 'SHOP_MANAGER'
          : role === 'customer'
          ? 'CUSTOMER'
          : role === 'manager'
          ? 'SYSTEM_MANAGER'
          : 'SYSTEM_ADMIN';
      const res: any = await authService.googleLogin(idToken, apiRole);
      const user = res?.data?.user || res?.user;
      toast.success(`Đăng nhập Google thành công! Chào mừng ${user?.fullName || user?.email}`);
      navigateAfterLogin(user?.role);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanms-login-page selection:bg-[#EEDFC6] selection:text-[#1A1612] flex min-h-dvh flex-col gap-[18px] bg-canvas px-10 pt-4 pb-3.5 text-ink [color-scheme:light] max-[1050px]:gap-[22px] max-[1050px]:px-6 max-[1050px]:py-[18px] login-compact:gap-3 login-compact:py-2.5 max-[760px]:gap-[18px] max-[760px]:px-4 max-[760px]:pt-3.5 max-[760px]:pb-5 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-brand-strong [&_button:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-brand-strong [&_a:focus-visible]:outline-offset-4 motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto! motion-reduce:[&_*::before]:animate-none! motion-reduce:[&_*::before]:transition-none! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:transition-none!">
      <header className="login-page-header mx-auto mt-auto flex min-h-14 w-full max-w-[1240px] items-center justify-between gap-4 min-[1500px]:max-w-[1320px] login-compact:min-h-11 max-[760px]:min-h-12 max-[760px]:[&>a:first-child]:max-w-[61%] max-[760px]:[&>a:last-child]:px-2.5 max-[760px]:[&>a:last-child]:py-2 max-[760px]:[&>a:last-child]:text-[11px] max-[760px]:[&>a:last-child]:whitespace-nowrap">
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

      <main className="login-page-main mx-auto mt-0 mb-auto w-full max-w-[1240px] min-[1500px]:max-w-[1320px]">
        <div className="login-experience relative isolate grid grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] overflow-clip rounded-[30px] border-2 border-brand-border p-0 bg-[linear-gradient(to_right,transparent_72%,#FAF8F0_91%),radial-gradient(ellipse_at_20%_18%,#FFFDF7_2%,transparent_55%),linear-gradient(135deg,#EEDFC6,#FBF5EB_52%,#EEDFC6)] shadow-[0_20px_65px_-30px_rgb(125_113_94/28%),0_2px_6px_rgb(125_113_94/3%)] before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:content-[''] before:[background:url('/assets/auth_luxury_card_inner.jpg')_center/100%_100%_no-repeat] before:[mask:url('/assets/login-gold-curve-mask.svg')_center/100%_100%_no-repeat] before:[transform:scaleX(.8)] before:origin-[55%_center] after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:content-[''] after:bg-[linear-gradient(to_right,transparent_86%,#FAF8F0_91%)] max-[760px]:grid-cols-[minmax(0,1fr)] max-[760px]:rounded-[22px] max-[760px]:before:bg-[linear-gradient(160deg,transparent_10%,#FFFEF9_65%,#FBF5EB)] max-[760px]:before:[mask:none] max-[760px]:before:[transform:none] max-[760px]:after:hidden">
          <section className="login-showcase relative flex min-w-0 flex-col overflow-hidden rounded-none bg-transparent max-[760px]:grid max-[760px]:min-h-[175px] max-[760px]:grid-cols-[1.05fr_1fr]" aria-label="Kết nối mua sắm cùng SCANMS">
            <div className="login-showcase-copy relative z-1 px-[42px] pt-10 pb-0 animate-[login-content-enter_600ms_both] min-[1500px]:px-[38px] min-[1500px]:pt-[34px] max-[1050px]:px-[22px] max-[1050px]:pt-[26px] login-compact:pt-6 max-[760px]:self-center max-[760px]:pt-6 max-[760px]:pr-0 max-[760px]:pb-[22px] max-[760px]:pl-[22px] [&_h1]:mt-[19px] [&_h1]:mb-0 [&_h1]:pb-[5px] [&_h1]:text-[clamp(30px,3vw,40px)] [&_h1]:font-semibold [&_h1]:italic [&_h1]:leading-[1.2] [&_h1]:tracking-[-1px] [&_h1_span]:text-brand-strong max-[1050px]:[&_h1]:text-[32px] max-[1050px]:[&_h1]:tracking-[-1.1px] max-[760px]:[&_h1]:mt-2.5 max-[760px]:[&_h1]:text-[clamp(20px,4.3vw,29px)] max-[760px]:[&_h1]:tracking-[-.7px] max-[760px]:[&_h1]:leading-[1.25] max-[760px]:[&_p]:hidden">
              <div className="login-showcase-eyebrow inline-flex items-center gap-[9px] rounded-full border border-brand-border bg-white/90 px-4 py-2 text-xs font-bold leading-[1.5] text-ink shadow-[0_2px_6px_rgb(125_113_94/6%)] [&_svg]:shrink-0 [&_svg]:text-brand-strong max-[760px]:gap-1 max-[760px]:px-2 max-[760px]:py-[5px] max-[760px]:text-[9px] max-[760px]:[&_svg]:hidden"><Sparkles size={14} /><span>Sàn Thương Mại Đối Tác</span></div>
              <h1 className="font-display">Kết nối gian hàng,<br /><span>lan tỏa giá trị.</span></h1>
            </div>
            <ShoppingScene quiet={isForgotPasswordOpen} />
          </section>

          <div className="login-form-panel relative flex min-h-[580px] min-w-0 flex-col justify-between gap-[25px] rounded-none border-0 bg-transparent pt-7 pr-8 pb-[26px] pl-[100px] shadow-none min-[1500px]:pr-9 min-[1500px]:pl-[108px] max-[1050px]:pt-[26px] max-[1050px]:pr-6 max-[1050px]:pb-6 max-[1050px]:pl-[74px] login-compact:min-h-[540px] login-compact:gap-[22px] login-compact:py-6 max-[760px]:min-h-[490px] max-[760px]:gap-6 max-[760px]:px-6 max-[760px]:py-[26px] [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:text-[13px] [&_button.h-11]:min-h-11 [&_button.h-11]:text-[13px] [&_input::placeholder]:text-muted [&_label]:font-medium [&_form]:flex [&_form]:flex-col [&_form]:gap-3 [&_form>*]:my-0 max-[760px]:[&_input:not([type=checkbox])]:[font-size:16px]">
            <div className="login-form-heading mb-2 text-center [&_h2]:m-0 [&_h2]:text-[34px] [&_h2]:font-black [&_h2]:tracking-[-1px] [&_h2]:leading-[1.25] [&_h2>span]:text-brand-strong login-compact:[&_h2]:text-[32px] max-[760px]:[&_h2]:text-[28px]">
              <h2 className="font-display">Đăng <span>nhập</span></h2>
            </div>

            {/* Role Dropdown */}
            <div className="relative">
              <label id="login-role-label" className="block text-xs font-bold text-[#1A1612] mb-1">
                Vai trò đăng nhập:
              </label>
              <button
                type="button"
                aria-labelledby="login-role-label login-role-value"
                aria-expanded={isRoleDropdownOpen}
                aria-controls="login-role-options"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsRoleDropdownOpen(false); }}
                className="w-full h-11 px-3.5 bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-3 focus:ring-[#C59B58]/12 rounded-xl flex items-center justify-between transition shadow-2xs cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center text-[#C59B58] shadow-2xs shrink-0">
                    <ActiveRoleIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span id="login-role-value" className="text-xs font-black text-[#1A1612]">
                      {activeRole.label}
                    </span>
                    <span className="text-[11px] text-[#7D715E] font-medium hidden sm:inline">
                      • {activeRole.badge}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#7D715E] transition-transform duration-200 ${
                    isRoleDropdownOpen ? 'rotate-180 text-[#C59B58]' : ''
                  }`}
                />
              </button>

              {isRoleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  />
                  <div id="login-role-options" onKeyDown={(e) => { if (e.key === 'Escape') { setIsRoleDropdownOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="login-role-options"]')?.focus(); } }} className="login-role-options absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-[#EAE4D7] rounded-xl shadow-[0_16px_40px_rgba(26,22,18,0.12)] p-1.5 space-y-1 max-h-[280px] overflow-y-auto">
                    {ROLES.map((r) => {
                      const isSelected = role === r.id;
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleSelect(r.id)}
                          className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[#FBF5EB] text-[#1A1612] font-bold border border-[#EEDFC6]'
                              : 'hover:bg-[#FAF8F5] text-[#1A1612] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#C59B58] text-white shadow-xs'
                                  : 'bg-[#F3EFE6] text-[#7D715E]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                                <span>{r.label}</span>
                                <span className="text-[#7D715E] font-normal text-[11px] truncate hidden sm:inline">· {r.badge}</span>
                              </div>
                              <div className="text-[10px] text-[#7D715E] font-mono truncate">
                                {r.email}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#C59B58] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Social sign-in options */}
            <div className="w-full">
              <GoogleOfficialButton
                onSuccess={onGoogleTokenSuccess}
                onError={(err) => setError(err)}
                className="h-11"
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-[#EAE4D7] w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-[#7D715E] uppercase tracking-wider absolute">
                hoặc email / số điện thoại
              </span>
            </div>

            {error && (
              <div role="alert" className="p-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs text-[#DC2626] font-medium">
                {error}
              </div>
            )}

            {/* Form inputs */}
            {searchParams.get('sessionChanged') === '1' && (
              <p role="status" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2.5 text-xs leading-relaxed text-[#7D715E]">
                Tài khoản đã được thay đổi ở tab khác. Đăng nhập tài khoản {activeRole.label} để tiếp tục trang vừa mở.
              </p>
            )}
            <form id="scanms-auth-form" name="scanms-auth-form" autoComplete="off" onSubmit={handleSubmit} className="space-y-3">
              {/* Trap decoy inputs for Chrome autofill */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
                <input type="text" name="chrome_autofill_decoy_user" tabIndex={-1} autoComplete="username" />
                <input type="password" name="chrome_autofill_decoy_pass" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="relative flex items-center">
                <label htmlFor="login-identifier" className="sr-only">Email hoặc số điện thoại đã đăng ký</label>
                <input
                  id="login-identifier"
                  name="scanms_account_identity"
                  type="text"
                  autoComplete="one-time-code"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={254}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setPasswordAuthState('idle'); }}
                  required
                  placeholder="Email hoặc số điện thoại đã đăng ký"
                  className="w-full h-11 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-10 pr-4 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]"
                />
                <UserRound className="w-4 h-4 text-[#A69986] absolute left-3.5 pointer-events-none" />
              </div>

              <label className="sr-only" htmlFor="login-password">Mật khẩu</label>
              <AnimatedPasswordField
                autoComplete="new-password"
                name="scanms_account_secret"
                value={password}
                state={passwordAuthState}
                onChange={(value) => { setPassword(value); setPasswordAuthState('idle'); }}
              />

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#7D715E] hover:text-[#1A1612]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer"
                  />
                  <span>Ghi nhớ</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="font-medium text-[#B88E4F] hover:text-[#C59B58] hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || passwordAuthState === 'success'}
                className="login-submit disabled:opacity-50 flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-brand-border bg-brand-soft px-[18px] py-3 text-sm font-semibold leading-[1.5] text-brand-dark shadow-[inset_0_1px_0_rgb(255_255_255/55%)] transition-[background,transform,box-shadow] duration-180 enabled:hover:-translate-y-px enabled:hover:border-brand enabled:hover:bg-surface-sand enabled:hover:shadow-[0_6px_16px_rgb(197_155_88/15%)] enabled:active:translate-y-0 disabled:cursor-wait my-0"
              >
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập an toàn'}</span>
              </button>
            </form>

            {/* Bottom switch link */}
            <div className="login-register-link border-t border-line pt-3.5 text-center text-xs leading-[1.7] text-muted [&_a]:text-[#90682F]">
              Chưa có tài khoản đối tác?{' '}
              <Link to={registerUrl} className="font-bold text-[#B88E4F] hover:underline">
                Đăng ký ngay →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-[1240px] mx-auto w-full pt-0 text-center text-[11px] leading-4 max-[760px]:text-[10px] max-[760px]:gap-x-3 max-[760px]:gap-y-2 text-[#7D715E] font-medium flex flex-wrap items-center justify-center gap-4">
        <span>© 2026 SCANMS Corporation</span>
        <span>•</span>
        <Link to="/marketplace" className="hover:underline">Sàn Thương Mại</Link>
        <span>•</span>
        <Link to="/privacy" className="hover:underline">Chính sách bảo mật</Link>
        <span>•</span>
        <Link to="/terms" className="hover:underline">Điều khoản dịch vụ</Link>
      </footer>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
}
