import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Store,
  ShieldCheck,
  Shield,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Crown,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  Building2,
  Award,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { triggerGoogleSignIn, devBypassGoogleSignIn } from '../../utils/googleAuth';
import { toast } from '../../utils/toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'customer' | 'kol' | 'shop' | 'admin' | 'manager'>('customer');
  const [email, setEmail] = useState('customer@scanms.vn');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const DEMO_ACCOUNTS = [
    {
      role: 'customer' as const,
      name: 'Nguyễn Văn Mua',
      title: 'Khách Hàng Thân Thiết',
      badge: 'Khách Mua',
      email: 'customer@scanms.vn',
      password: 'Password@123',
      description: 'Theo dõi đơn đặt hàng, lịch sử giao hàng & điểm thưởng tích lũy',
      icon: ShoppingBag,
    },
    {
      role: 'kol' as const,
      name: 'Nguyễn Thành Thắng',
      title: 'Top KOL Vàng (Team Leader)',
      badge: 'KOL / KOC',
      email: 'kol1@scanms.vn',
      password: 'Password@123',
      description: 'Phát hành Dynamic QR & Smart Link, kiểm tra hoa hồng 22% CPS',
      icon: Sparkles,
    },
    {
      role: 'shop' as const,
      name: 'Sora Skin Official',
      title: 'Chủ Gian Hàng Dược Mỹ Phẩm',
      badge: 'Chủ Shop',
      email: 'shop@scanms.vn',
      password: 'Password@123',
      description: 'Quản trị danh mục sản phẩm, chiến dịch hoa hồng & đơn hàng',
      icon: Store,
    },
    {
      role: 'manager' as const,
      name: 'Lê Hồng Phúc',
      title: 'Vận Hành & Tuân Thủ Sàn',
      badge: 'Vận Hành',
      email: 'manager@scanms.vn',
      password: 'Password@123',
      description: 'Kiểm duyệt hồ sơ KYC, giải quyết tranh chấp & giám sát đối soát',
      icon: ShieldCheck,
    },
    {
      role: 'admin' as const,
      name: 'Nguyễn Quản Trị',
      title: 'Ban Quản Trị Tối Cao',
      badge: 'Quản Trị',
      email: 'admin@scanms.vn',
      password: 'Password@123',
      description: 'Quản trị hệ thống toàn quyền, phân quyền vai trò & cấu hình sàn',
      icon: Crown,
    },
  ];

  const currentDemo = DEMO_ACCOUNTS.find((a) => a.role === role) || DEMO_ACCOUNTS[0];

  const roleDescriptions: Record<string, { title: string; subtitle: string }> = {
    customer: {
      title: 'Không gian Khách Mua Hàng',
      subtitle: 'Theo dõi đơn hàng, quản lý địa chỉ nhận và hưởng ưu đãi tích lũy.',
    },
    kol: {
      title: 'Không gian Sáng Tạo & Tiếp Thị (KOL / KOC)',
      subtitle: 'Tạo mã Smart QR cá nhân, theo dõi lượt click và đối soát hoa hồng tức thời.',
    },
    shop: {
      title: 'Cổng Quản Trị Gian Hàng Đối Tác',
      subtitle: 'Quản lý kho hàng, tạo chiến dịch tiếp thị và kết nối đội ngũ CTV toàn quốc.',
    },
    manager: {
      title: 'Trung Tâm Vận Hành & Tuân Thủ Sàn',
      subtitle: 'Xét duyệt hồ sơ định danh KYC, giám sát luồng thanh toán và xử lý sự cố.',
    },
    admin: {
      title: 'Cổng Quản Trị Tối Cao (System Admin)',
      subtitle: 'Cấu hình bảo mật hệ thống, giám sát tài chính và điều phối phân quyền RBAC.',
    },
  };

  const handleRoleChange = (selectedRole: 'customer' | 'kol' | 'shop' | 'admin' | 'manager') => {
    setRole(selectedRole);
    const matched = DEMO_ACCOUNTS.find((a) => a.role === selectedRole);
    if (matched) {
      setEmail(matched.email);
      setPassword(matched.password);
    }
    setError(null);
  };

  const handleQuickLogin = async (
    targetRole: 'customer' | 'kol' | 'shop' | 'admin' | 'manager',
    targetEmail: string,
    targetPass: string = 'Password@123',
    autoSubmit: boolean = false
  ) => {
    setRole(targetRole);
    setEmail(targetEmail);
    setPassword(targetPass);
    setError(null);

    if (autoSubmit) {
      setLoading(true);
      try {
        const res: any = await authService.login(targetEmail, targetPass);
        const user = res.data?.user || res.user;

        setSuccessNotice(`Đăng nhập thành công với vai trò ${user?.fullName || targetEmail}!`);

        setTimeout(() => {
          if (user?.role === 'SHOP_MANAGER') {
            navigate('/merchant/dashboard');
          } else if (user?.role === 'SYSTEM_ADMIN') {
            navigate('/admin/analytics');
          } else if (user?.role === 'SYSTEM_MANAGER') {
            navigate('/admin/users');
          } else if (user?.role === 'CUSTOMER') {
            navigate('/customer/orders');
          } else {
            navigate('/collaborator/dashboard');
          }
        }, 500);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
            ? 'Không thể kết nối đến máy chủ Backend (cổng 3000). Vui lòng đảm bảo backend đang chạy trên http://localhost:3000.'
            : err?.message || 'Đăng nhập không thành công');
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      const res: any = await authService.login(email, password);
      const user = res?.data?.user || res?.user;

      setSuccessNotice('Đăng nhập thành công! Đang chuyển hướng...');

      setTimeout(() => {
        if (user?.role === 'SHOP_MANAGER') {
          navigate('/merchant/dashboard');
        } else if (user?.role === 'SYSTEM_ADMIN') {
          navigate('/admin/analytics');
        } else if (user?.role === 'SYSTEM_MANAGER') {
          navigate('/admin/users');
        } else if (user?.role === 'CUSTOMER') {
          navigate('/customer/orders');
        } else {
          navigate('/collaborator/dashboard');
        }
      }, 600);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')
          ? 'Không thể kết nối đến máy chủ Backend (cổng 3000). Vui lòng đảm bảo backend đang chạy trên http://localhost:3000.'
          : err?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email hoặc mật khẩu.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = (useDevBypass: boolean = false) => {
    setError(null);
    setLoading(true);

    const onTokenSuccess = async (idToken: string) => {
      try {
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
        if (user?.role === 'SHOP_MANAGER') {
          navigate('/merchant/dashboard');
        } else if (user?.role === 'SYSTEM_ADMIN') {
          navigate('/admin/analytics');
        } else if (user?.role === 'SYSTEM_MANAGER') {
          navigate('/admin/users');
        } else if (user?.role === 'CUSTOMER') {
          navigate('/customer/orders');
        } else {
          navigate('/collaborator/dashboard');
        }
      } catch (err: any) {
        setError(err.message || 'Đăng nhập Google thất bại');
      } finally {
        setLoading(false);
      }
    };

    if (useDevBypass) {
      devBypassGoogleSignIn(onTokenSuccess, email || 'customer@scanms.vn');
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
    <div className="min-h-screen bg-[#FAF8F5] relative overflow-hidden flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-12 selection:bg-[#EEDFC6] selection:text-[#1A1612]">
      {/* Soft Warm Ambient Lighting Orbs */}
      <div className="absolute top-[-8%] left-[-6%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-[#C59B58]/12 via-[#EEDFC6]/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-6%] w-[650px] h-[650px] rounded-full bg-gradient-to-tl from-[#C59B58]/10 via-[#F3EFE6]/50 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-[1480px] mx-auto w-full mb-6 flex flex-wrap justify-between items-center gap-3 relative z-10">
        <Link
          to="/marketplace"
          id="btn-back-to-marketplace"
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
          <span className="text-[#C59B58] font-bold">Cổng Đăng Nhập Bảo Mật</span>
        </div>
      </header>

      {/* Main Grid: 2 Columns */}
      <main className="max-w-[1480px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch relative z-10 my-auto">

        {/* LEFT COLUMN: Luxury Platform Showcase */}
        <section className="lg:col-span-7 bg-gradient-to-br from-[#F8F5EE] via-[#F3EFE6] to-[#ECE4D4] border border-[#E5DAC8] rounded-[32px] p-7 sm:p-10 lg:p-12 flex flex-col justify-between gap-8 relative overflow-hidden shadow-[0_12px_40px_rgba(184,142,79,0.06)] text-left">
          
          {/* Subtle Golden Glow Halo */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-[#C59B58]/15 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#B88E4F] via-[#C59B58] to-[#DFC187] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(184,142,79,0.3)]">
                <Sparkles className="w-6 h-6 text-amber-50" />
              </div>
              <div>
                <span className="text-2xl font-black text-[#1A1612] tracking-tight block">
                  SCANMS
                </span>
                <span className="text-[11px] font-extrabold text-[#B88E4F] uppercase tracking-wider block">
                  MẠNG LƯỚI THƯƠNG MẠI &amp; TIẾP THỊ LIÊN KẾT CAO CẤP
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#EEDFC6] text-[#B88E4F] text-xs font-bold w-fit shadow-2xs backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-[#B88E4F]" />
              <span>Chuẩn Đề Án FA26SE032 • Kết Nối Doanh Nghiệp &amp; Nhà Sáng Tạo</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-[#1A1612] tracking-tight leading-[1.22] m-0">
              Quản trị mạng lưới CTV &amp;{' '}
              <span className="bg-gradient-to-r from-[#B88E4F] via-[#C59B58] to-[#926927] bg-clip-text text-transparent">
                bứt phá doanh số tiếp thị.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#7D715E] leading-relaxed max-w-2xl m-0 font-medium">
              Không gian hợp nhất kết nối hàng ngàn cộng tác viên bán hàng, phát hành Smart QR định danh, đối soát hoa hồng minh bạch và bảo chứng giao dịch 14 ngày qua hợp đồng thông minh.
            </p>

            {/* Synergy Live Showcase Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#E8DFC8] p-5 sm:p-6 shadow-[0_10px_30px_rgba(26,22,18,0.04)] my-1 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#EAE4D7]">
                <div className="flex items-center gap-2 text-xs font-black text-[#B88E4F] uppercase tracking-wider">
                  <Award className="w-4 h-4 text-[#B88E4F]" />
                  <span>Mô Hình Hợp Tác Tiêu Biểu Trên Sàn</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đang Hoạt Động
                </span>
              </div>

              {/* Connected Merchant & Creator Node */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                {/* Merchant Node */}
                <div className="md:col-span-5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-xs font-extrabold text-[#1A1612] truncate block">
                        Sora Skin Official
                      </strong>
                      <span className="text-[10px] text-amber-600 font-bold flex items-center">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500 inline mr-0.5" /> 4.9
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D715E] block truncate">
                      Mỹ phẩm thuần chay • Hoa hồng 22%
                    </span>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                  <div className="w-7 h-7 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 rotate-90 md:rotate-0" />
                  </div>
                </div>

                {/* Creator Node */}
                <div className="md:col-span-5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B88E4F] to-[#C59B58] text-white flex items-center justify-center shrink-0 shadow-2xs font-extrabold text-xs">
                    NT
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-xs font-extrabold text-[#1A1612] truncate block">
                        Nguyễn Thành Thắng
                      </strong>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                        Top 1 KOL
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D715E] block truncate">
                      Thu nhập ~91.000 ₫/đơn • 100% Khớp
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-bar with QR and Last-Click */}
              <div className="mt-3.5 pt-3 border-t border-[#EAE4D7]/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D715E]">
                <div className="flex items-center gap-2 font-bold text-[#1A1612]">
                  <QrCode className="w-3.5 h-3.5 text-[#B88E4F]" />
                  <span>Dynamic Smart QR</span>
                  <span className="text-[11px] font-normal text-[#7D715E]">• Lưu vết Last-Click 30 Ngày</span>
                </div>
                <span className="text-[11px] font-semibold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-md border border-[#EEDFC6]">
                  Escrow Tự Động 14 Ngày
                </span>
              </div>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-white/90 p-3.5 rounded-2xl border border-[#EAE4D7] text-left shadow-2xs backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center mb-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <strong className="text-xs sm:text-sm font-extrabold text-[#1A1612] block">
                  Định Danh Đa Kênh
                </strong>
                <span className="text-[11px] text-[#7D715E] block mt-0.5 leading-snug">
                  Smart Link &amp; Dynamic QR
                </span>
              </div>

              <div className="bg-white/90 p-3.5 rounded-2xl border border-[#EAE4D7] text-left shadow-2xs backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center mb-1.5">
                  <Shield className="w-4 h-4" />
                </div>
                <strong className="text-xs sm:text-sm font-extrabold text-[#1A1612] block">
                  Đối Soát Tự Động
                </strong>
                <span className="text-[11px] text-[#7D715E] block mt-0.5 leading-snug">
                  100% Khớp đơn minh bạch
                </span>
              </div>

              <div className="bg-white/90 p-3.5 rounded-2xl border border-[#EAE4D7] text-left shadow-2xs backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center mb-1.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <strong className="text-xs sm:text-sm font-extrabold text-[#1A1612] block">
                  Bảo Chứng Escrow
                </strong>
                <span className="text-[11px] text-[#7D715E] block mt-0.5 leading-snug">
                  Giữ tiền an toàn 14 ngày
                </span>
              </div>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="relative z-10 pt-4 border-t border-[#EAE4D7] flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-[#7D715E]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                Mã hóa Argon2id &amp; JWT
              </span>
              <span>•</span>
              <span>RBAC 5 Cấp Phân Quyền</span>
              <span>•</span>
              <span>VietQR Batch Payout</span>
            </div>
            <span>© 2026 SCANMS Corporation</span>
          </div>
        </section>

        {/* RIGHT COLUMN: Redesigned Elegant Login Card */}
        <section className="lg:col-span-5 w-full flex flex-col justify-center">
          <div className="bg-white rounded-[32px] border border-[#EAE4D7] shadow-[0_20px_50px_rgba(184,142,79,0.08)] p-6 sm:p-9 flex flex-col gap-5 text-left relative">
            
            {/* Header Titles */}
            <div>
              <span className="text-[11px] font-extrabold text-[#B88E4F] uppercase tracking-wider block mb-1">
                {roleDescriptions[role]?.title}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] tracking-tight m-0">
                Đăng nhập tài khoản
              </h2>
              <p className="text-xs sm:text-sm text-[#7D715E] mt-1.5 leading-relaxed m-0 font-medium">
                {roleDescriptions[role]?.subtitle}
              </p>
            </div>

            {/* Elegant 5-Role Segmented Selector */}
            <div>
              <div className="text-[11px] font-bold text-[#7D715E] mb-1.5 flex items-center justify-between">
                <span>CHỌN KHÔNG GIAN LÀM VIỆC:</span>
                <span className="text-[#B88E4F] font-extrabold">5 Vai trò chuẩn hóa</span>
              </div>

              <div className="p-1 bg-[#F3EFE6] border border-[#EAE4D7] rounded-2xl grid grid-cols-5 gap-1">
                <button
                  type="button"
                  onClick={() => handleRoleChange('customer')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    role === 'customer'
                      ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EAE4D7]/60'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                  title="Khách Mua Hàng"
                >
                  <ShoppingBag className={`w-3.5 h-3.5 shrink-0 ${role === 'customer' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span className="text-[11px] sm:text-xs">Khách</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('kol')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    role === 'kol'
                      ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EAE4D7]/60'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                  title="KOL / KOC Tiếp Thị"
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${role === 'kol' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span className="text-[11px] sm:text-xs">KOL/CTV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('shop')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    role === 'shop'
                      ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EAE4D7]/60'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                  title="Chủ Gian Hàng"
                >
                  <Store className={`w-3.5 h-3.5 shrink-0 ${role === 'shop' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span className="text-[11px] sm:text-xs">Chủ Shop</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('manager')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    role === 'manager'
                      ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EAE4D7]/60'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                  title="Vận Hành & Tuân Thủ Sàn"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${role === 'manager' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span className="text-[11px] sm:text-xs">Vận Hành</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EAE4D7]/60'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                  title="Ban Quản Trị Tối Cao"
                >
                  <Crown className={`w-3.5 h-3.5 shrink-0 ${role === 'admin' ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span className="text-[11px] sm:text-xs">Quản Trị</span>
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
                {(error.toLowerCase().includes('google') || error.toLowerCase().includes('origin') || error.toLowerCase().includes('403')) && (
                  <div className="mt-1 pt-2 border-t border-rose-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#7D715E]">Lỗi Google Cloud chưa duyệt domain localhost?</span>
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin(true)}
                      className="px-2.5 py-1 bg-[#B88E4F] hover:bg-[#9E7933] text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs shrink-0"
                    >
                      Đăng nhập Google (Dev Bypass)
                    </button>
                  </div>
                )}
              </div>
            )}

            {successNotice && (
              <div className="p-3.5 bg-[#FBF5EB] border border-[#EEDFC6] rounded-2xl text-[#B88E4F] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#B88E4F]" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* ACTIVE ROLE PREVIEW & QUICK 1-CLICK ACTION */}
            <div className="bg-[#FAF8F5] border border-[#EAE4D7] rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#B88E4F] to-[#C59B58] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <currentDemo.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-xs font-extrabold text-[#1A1612] truncate">
                        {currentDemo.name}
                      </strong>
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white border border-[#EAE4D7] text-[#B88E4F] shrink-0">
                        {currentDemo.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D715E] block truncate font-medium">
                      {currentDemo.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickLogin(currentDemo.role, currentDemo.email, currentDemo.password, true)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-[#B88E4F] hover:bg-[#A07736] text-white rounded-xl text-xs font-extrabold shrink-0 cursor-pointer shadow-2xs hover:shadow-xs transition active:scale-95 flex items-center gap-1.5"
                  title={`Đăng nhập 1-chạm vào vai trò ${currentDemo.badge}`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Vào Ngay</span>
                </button>
              </div>

              {/* Accordion Trigger for All 5 Test Accounts */}
              <div className="pt-2 border-t border-[#EAE4D7]/70 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="text-[#7D715E] hover:text-[#B88E4F] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{showDemoAccounts ? 'Thu gọn danh sách kiểm thử' : '⚡ Mở danh sách 5 tài khoản mẫu'}</span>
                  {showDemoAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[#7D715E]">
                  Mật khẩu: <code className="font-bold text-[#1A1612]">Password@123</code>
                </span>
              </div>

              {/* Collapsible List of 5 Test Accounts */}
              {showDemoAccounts && (
                <div className="grid grid-cols-1 gap-2 pt-1 animate-in fade-in duration-200">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const isCurrent = role === acc.role;
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleRoleChange(acc.role)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-[#FBF5EB] border-[#B88E4F] shadow-2xs'
                            : 'bg-white border-[#EAE4D7] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#B88E4F] text-white' : 'bg-[#FAF8F5] text-[#7D715E]'}`}>
                            <acc.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#1A1612] truncate">
                                {acc.name}
                              </span>
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-[#FAF8F5] text-[#B88E4F] border border-[#EAE4D7]">
                                {acc.badge}
                              </span>
                            </div>
                            <span className="text-[10.5px] text-[#7D715E] block truncate">
                              {acc.email}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickLogin(acc.role, acc.email, acc.password, true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-[#B88E4F] text-[#B88E4F] hover:text-white border border-[#EEDFC6] hover:border-[#B88E4F] rounded-lg text-[10.5px] font-extrabold shrink-0 cursor-pointer shadow-2xs transition"
                        >
                          Vào
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#B88E4F]" />
                  <span>Email đăng nhập</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@scanms.vn"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-sm text-[#1A1612] font-medium focus:bg-white focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/15 outline-none transition-all placeholder:text-[#A89F91]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#B88E4F]" />
                    <span>Mật khẩu</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Vui lòng liên hệ Quản trị viên để đặt lại mật khẩu.')}
                    className="text-xs font-semibold text-[#B88E4F] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#1A1612] font-medium focus:bg-white focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#7D715E] hover:text-[#1A1612] cursor-pointer p-1"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="remember-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#EAE4D7] text-[#C59B58] focus:ring-[#C59B58] cursor-pointer accent-[#C59B58]"
                />
                <label htmlFor="remember-checkbox" className="text-xs text-[#7D715E] font-medium cursor-pointer select-none">
                  Ghi nhớ phiên đăng nhập trên thiết bị này
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C6728] text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_8px_20px_rgba(184,142,79,0.28)] hover:shadow-[0_10px_25px_rgba(184,142,79,0.38)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Đang xác thực hệ thống...' : 'Đăng nhập an toàn'}</span>
              </button>

              <div className="relative flex items-center justify-center my-0.5">
                <div className="border-t border-[#EAE4D7] w-full" />
                <span className="bg-white px-3 text-[10.5px] font-extrabold text-[#7D715E] uppercase tracking-wider absolute">
                  HOẶC TIẾP TỤC VỚI
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin(false)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs font-bold text-[#1A1612] transition-all cursor-pointer shadow-2xs hover:border-[#C59B58]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.32 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>Google SSO</span>
                </button>

                <button
                  type="button"
                  onClick={() => toast.info('Cổng đăng nhập TikTok Open API đang chuẩn bị tích hợp.')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs font-bold text-[#1A1612] transition-all cursor-pointer shadow-2xs hover:border-[#C59B58]"
                >
                  <span className="font-extrabold text-sm">🎵</span>
                  <span>TikTok Shop</span>
                </button>
              </div>

              {/* Bottom Quick-Pass & Registration */}
              <div className="text-center text-xs text-[#7D715E] mt-1 flex flex-col gap-3 font-medium">
                <div>
                  Chưa có tài khoản đối tác?{' '}
                  <Link to="/register" className="font-extrabold text-[#B88E4F] hover:underline">
                    Đăng ký tham gia ngay →
                  </Link>
                </div>

                <div className="p-3 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#B88E4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-xs font-extrabold text-[#1A1612] block truncate">
                        Khách mua hàng trực tiếp
                      </strong>
                      <span className="text-[11px] text-[#7D715E] block truncate">
                        Không cần tài khoản để duyệt &amp; mua sản phẩm
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/marketplace"
                    id="btn-goto-shopping-marketplace"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EEDFC6] text-xs font-extrabold text-[#B88E4F] shadow-2xs transition cursor-pointer"
                  >
                    <span>Vào sàn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </section>

      </main>
    </div>
  );
}
