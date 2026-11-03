import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, AlertCircle, ArrowLeft } from 'lucide-react';
import { MarketplaceHeader } from '../../components/marketplace/MarketplaceHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import { PayosOrderPayment } from '../../components/checkout/PayosOrderPayment';
import { toast } from '../../utils/toast';
import './PayosReturnPage.css';

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
    <div className="payos-buyer-layout">
    <MarketplaceHeader onOpenTracking={() => navigate('/tracking')} onOpenLive={() => navigate('/marketplace#live')} />
    <div className="payos-buyer-workspace">
    <aside className="payos-buyer-sidebar"><Sidebar currentUser={authService.getCurrentUser()} onLogout={() => { authService.logout(); navigate('/login'); }} /></aside>
    <main className="payos-return-page">
      <div className="payos-return-card">
        <div className="payos-return-top"><Link to={backToOrder} state={{ returnedOrderCode: orderCode, clearOrderSearch: true }}><ArrowLeft size={16} />Trở lại</Link><span>Mã đơn hàng: <strong>{orderCode || 'Chưa có mã đơn'}</strong></span></div>
        <header className="payos-return-heading">
        <div className="payos-return-icon">{icon}</div>
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
          <div className="payos-return-payment"><PayosOrderPayment key={orderCode} orderCode={orderCode} onPaid={() => { setConfirmedOrderCode(orderCode); setStatus('PAID'); }} /></div>
        )}
      </div>
    </main>
    </div>
    </div>
  );
}
