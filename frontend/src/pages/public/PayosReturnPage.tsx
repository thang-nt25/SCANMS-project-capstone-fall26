import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, AlertCircle, ArrowLeft } from 'lucide-react';
import { MarketplaceHeader } from '../../components/marketplace/MarketplaceHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { PayosOrderPayment } from '../../components/checkout/PayosOrderPayment';
import { toast } from '../../utils/toast';

export default function PayosReturnPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderCode = params.get('order') || '';
  const manual = params.get('manual') === '1';
  const [status, setStatus] = useState<'loading' | 'PAID' | 'WAITING_PAYMENT' | 'CANCELLED' | 'error'>('loading');
  const [confirmedOrderCode, setConfirmedOrderCode] = useState('');
  const loggedIn = Boolean(localStorage.getItem('token') && authService.getCurrentUser());
  const backToOrder = '/customer/orders';

  useEffect(() => {
    if (manual || !loggedIn || !orderCode) return;
    let active = true;
    const refresh = async () => {
      try {
        const response: any = await api.get(`/orders/payos/${encodeURIComponent(orderCode)}/status`, {
          headers: { 'x-skip-cache': 'true' },
        });
        const data = response?.data?.data || response?.data || response;
        if (active) {
          setStatus(data.paymentStatus === 'PAID' ? 'PAID' : data.orderStatus === 'CANCELLED' ? 'CANCELLED' : 'WAITING_PAYMENT');
          if (data.paymentStatus === 'PAID') setConfirmedOrderCode(orderCode);
        }
      } catch {
        if (active) setStatus('error');
      }
    };
    void refresh();
    return () => { active = false; };
  }, [manual, loggedIn, orderCode]);

  useEffect(() => {
    if (manual || !loggedIn || !orderCode || status !== 'PAID' || confirmedOrderCode !== orderCode) return;
    navigate('/customer/orders', { replace: true, state: { placedOrderCodes: [orderCode] } });
    toast.success('Thanh toán thành công. Bạn có thể theo dõi đơn trong Đơn mua.');
  }, [manual, loggedIn, orderCode, confirmedOrderCode, status, navigate]);

  if (manual) return <main className="min-h-screen bg-[#FAF8F5] px-4 py-16 text-[#1A1612]"><div className="mx-auto max-w-lg rounded-2xl border border-[#EAE4D7] bg-white p-6 text-center">
    <Clock3 className="mx-auto h-9 w-9 text-[#B88E4F]" /><h1 className="mt-4 text-xl font-semibold">Kiểm tra thanh toán đơn thủ công</h1>
    <p className="mt-3 text-sm leading-relaxed text-[#7D715E]">SCANMS cập nhật trạng thái khi máy chủ PayOS xác nhận đã nhận đủ tiền. Vui lòng liên hệ Shop để kiểm tra đơn{orderCode ? ` ${orderCode}` : ''}.</p>
    <Link to="/marketplace" className="mt-5 inline-block rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm">Về sàn SCANMS</Link>
  </div></main>;

  const icon = status === 'PAID' ? <CheckCircle2 className="h-10 w-10 text-[#B88E4F]" />
    : status === 'error' ? <AlertCircle className="h-10 w-10 text-[#DC2626]" />
    : <Clock3 className="h-10 w-10 text-[#B88E4F]" />;
  const title = status === 'PAID' ? 'Thanh toán thành công'
    : status === 'CANCELLED' ? 'Đơn hàng đã hủy'
    : status === 'error' ? 'Chưa kiểm tra được thanh toán'
    : 'Đang chờ PayOS xác nhận';

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5]">
    <MarketplaceHeader onOpenTracking={() => navigate('/tracking')} onOpenLive={() => navigate('/marketplace#live')} />
    <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] items-start gap-5 max-w-[1248px] mx-auto px-4 sm:px-6 pb-6">
    <aside className="min-w-0 hidden lg:block"><Sidebar currentUser={authService.getCurrentUser()} onLogout={() => { authService.logout(); navigate('/login'); }} /></aside>
    <main className="min-h-0 pt-5 text-[#1A1612]">
      <div className="w-full rounded-md border border-[#EAE4D7] bg-white overflow-hidden shadow-none">
        <div className="flex items-center justify-between gap-4 p-3.5 sm:px-5 border-b border-[#EAE4D7] text-sm leading-normal [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1.5 [&_a]:text-[#7D715E] [&_a]:no-underline [&_a]:whitespace-nowrap [&_span]:text-right [&_span]:[overflow-wrap:anywhere] [&_strong]:font-medium"><Link to={backToOrder} state={{ returnedOrderCode: orderCode, clearOrderSearch: true }}><ArrowLeft size={16} />Trở lại</Link><span>Mã đơn hàng: <strong>{orderCode || 'Chưa có mã đơn'}</strong></span></div>
        <header className="flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 border-b border-[#EAE4D7] [&_h1]:m-0 [&_h1]:text-lg sm:[&_h1]:text-xl [&_h1]:font-semibold [&_p]:mt-1 [&_p]:text-xs [&_p]:text-[#7D715E] [&_p]:leading-relaxed">
        <div className="grid shrink-0 place-items-center w-10 h-10 border border-[#EEDFC6] rounded-[10px] bg-white [&_svg]:w-6 [&_svg]:h-6">{icon}</div>
        <div><h1>{title}</h1>
        <p>
          {!loggedIn ? 'Đăng nhập để xem trạng thái thanh toán của đơn hàng.'
            : !orderCode ? 'Liên kết chưa có mã đơn hàng. Vui lòng mở thanh toán từ mục Đơn mua.'
            : status === 'CANCELLED' ? 'Đơn này không còn nhận thanh toán.'
            : status === 'PAID' ? `Đơn ${orderCode} đã được xác nhận thanh toán.`
            : 'Quét mã để thanh toán. SCANMS sẽ tự động cập nhật khi PayOS xác nhận nhận đủ tiền.'}
        </p>
        </div>
        </header>
        {loggedIn && orderCode && (status === 'WAITING_PAYMENT' || status === 'error') && (
          <div className="p-4 sm:p-5"><PayosOrderPayment key={orderCode} orderCode={orderCode} onPaid={() => { setConfirmedOrderCode(orderCode); setStatus('PAID'); }} /></div>
        )}
      </div>
    </main>
    </div>
    </div>
  );
}
