import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronRight, Heart, LogOut, MapPin, PackageSearch, ShieldCheck, ShoppingBag, Ticket, UserRound, Wallet, Handshake, LayoutDashboard } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { authService } from '@/services/auth.service';
import { productLoginUrl } from '@/utils/login-return';

export default function ShoppingAccountPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [avatarFailed, setAvatarFailed] = useState(false);
  if (!user || !localStorage.getItem('token')) return <Navigate replace to={productLoginUrl('/customer/account', 'CUSTOMER')} />;
  const items = [
    { label: 'Đơn mua', icon: ShoppingBag, to: '/customer/orders' },
    { label: 'Tra cứu đơn', icon: PackageSearch, to: '/tracking' },
    { label: 'Ví mua sắm', icon: Wallet, to: '/customer/wallet' },
    { label: 'Kho voucher', icon: Ticket, to: '/customer/vouchers' },
    { label: 'Yêu thích', icon: Heart, to: '/customer/wishlist' },
    { label: 'Địa chỉ', icon: MapPin, to: '/customer/addresses' },
    { label: 'Hồ sơ', icon: UserRound, to: '/customer/profile' },
    { label: 'Bảo mật', icon: ShieldCheck, to: '/customer/security' },
  ];
  const workspace = user.role === 'COLLABORATOR' ? '/collaborator/dashboard' : user.role === 'SHOP_MANAGER' ? '/merchant/dashboard' : '/admin/analytics';
  return <div className="min-h-dvh bg-[#FAF8F5] text-[#1A1612]">
    <PublicHeader />
    <main className="mx-auto max-w-2xl space-y-4 px-3 py-4">
      <Link to="/customer/profile" className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-4">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-lg font-semibold text-[#8C6226]">
          {user.avatarUrl && !avatarFailed ? <img src={user.avatarUrl} onError={() => setAvatarFailed(true)} alt="" className="size-full object-cover" /> : (user.fullName || user.email || 'S').charAt(0).toUpperCase()}
        </span><span className="min-w-0 flex-1"><strong className="block truncate text-base">{user.fullName || 'Tài khoản của tôi'}</strong><span className="mt-1 block truncate text-xs text-[#7D715E]">{user.email}</span></span><ChevronRight size={18} className="text-[#B88E4F]" />
      </Link>
      <section aria-label="Tiện ích tài khoản" className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-3">
        {items.map(({ label, icon: Icon, to }) => <Link key={to} to={to} className="flex min-h-[72px] items-center gap-2.5 rounded-xl border border-[#EAE4D7] px-3 py-3 text-xs font-medium hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-[#B88E4F]"><Icon size={21} className="shrink-0 text-[#B88E4F]" /><span>{label}</span></Link>)}
      </section>
      <Link to={user.role === 'CUSTOMER' ? '/customer/upgrade' : workspace} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 text-sm font-medium">
        {user.role === 'CUSTOMER' ? <Handshake size={21} className="text-[#B88E4F]" /> : <LayoutDashboard size={21} className="text-[#B88E4F]" />}<span className="flex-1">{user.role === 'CUSTOMER' ? 'Trở thành đối tác SCANMS' : 'Không gian làm việc của tôi'}</span><ChevronRight size={17} />
      </Link>
      <button type="button" onClick={() => { authService.logout(); navigate('/marketplace'); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#EAE4D7] bg-white text-sm text-[#DC2626]"><LogOut size={17} />Đăng xuất</button>
    </main>
  </div>;
}
