import { LiveGovernancePanel, type LiveGovernance } from '../../components/live/LiveGovernancePanel';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Ticket,
  Store,
  ShoppingBag,
  Clock,
  TrendingUp,
  Coins,
  Radio,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  Users,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import './LiveSessionsPage.css';

type Session = {
  governance?: LiveGovernance;
  id: string;
  title: string;
  description?: string | null;
  platform: string;
  liveUrl: string;
  externalChannels?: Array<{ channelUrl: string; followerCount: number }>;
  startsAt: string;
  endsAt: string;
  status: string;
  inviteStatus: string;
  serverTime?: string;
  commissionRate: number | string;
  store: { name: string; logoUrl?: string | null; slug: string };
  coupon: {
    displayCode: string;
    discountType: string;
    discountValue: number | string;
    usageLimitTotal: number | null;
    usageCount: number;
  };
  report?: {
    claims: number;
    orders: number;
    buyers?: number;
    pendingOrders?: number;
    cancelledOrders?: number;
    grossSales: number;
    voucherDiscount: number;
    commission: number;
  };
  products: Array<{ product: { id: string; title: string; imageUrl?: string | null } }>;
};

type FilterKey = 'ALL' | 'UPCOMING' | 'LIVE' | 'PENDING' | 'ENDED';

const formatSessionTime = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const startDate = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (sameDay) {
    return `${startTime} – ${endTime} · ${startDate}`;
  }
  const endDate = end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${startTime} ${startDate} – ${endTime} ${endDate}`;
};

export default function CollaboratorLiveSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterKey>('ALL');

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response: any = await api.get('/live-sessions/my', {
        headers: { 'x-skip-cache': 'true' },
      });
      const result = response?.data || response;
      setSessions(Array.isArray(result) ? result : []);
      setLoadError(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Không tải được phiên livestream.';
      setLoadError(message);
      if (showLoading) toast.error(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(false);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const respond = async (session: Session, accepted: boolean) => {
    try {
      setPendingAction(session.id);
      await api.patch(`/live-sessions/my/${session.id}/respond`, { accepted });
      toast.success(
        accepted
          ? 'Bạn đã nhận lời tham gia phiên live thành công!'
          : 'Bạn đã từ chối lời mời phiên live.',
      );
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Không gửi được phản hồi.');
    } finally {
      setPendingAction(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Đã sao chép mã voucher vào bộ nhớ tạm.');
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      toast.error('Trình duyệt không cho phép sao chép mã.');
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === 'LIVE') {
        return s.status === 'LIVE';
      }
      if (statusFilter === 'UPCOMING') {
        return (
          (s.status === 'SCHEDULED' || s.inviteStatus === 'ACCEPTED') &&
          s.status !== 'ENDED' &&
          s.status !== 'CANCELLED' &&
          s.status !== 'LIVE'
        );
      }
      if (statusFilter === 'PENDING') {
        return s.inviteStatus === 'PENDING' && s.status !== 'ENDED' && s.status !== 'CANCELLED';
      }
      if (statusFilter === 'ENDED') {
        return s.status === 'ENDED' || s.status === 'CANCELLED';
      }
      return true;
    });
  }, [sessions, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: sessions.length,
      upcoming: sessions.filter(
        (s) =>
          (s.status === 'SCHEDULED' || s.inviteStatus === 'ACCEPTED') &&
          s.status !== 'ENDED' &&
          s.status !== 'CANCELLED' &&
          s.status !== 'LIVE',
      ).length,
      live: sessions.filter((s) => s.status === 'LIVE').length,
      pending: sessions.filter(
        (s) => s.inviteStatus === 'PENDING' && s.status !== 'ENDED' && s.status !== 'CANCELLED',
      ).length,
      ended: sessions.filter((s) => s.status === 'ENDED' || s.status === 'CANCELLED').length,
    };
  }, [sessions]);

  const renderTab = (key: FilterKey, label: string, count: number) => (
    <button key={key} type="button" onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key} className="kl-tab">
      {key === 'LIVE' && <span className="kl-live-dot" aria-hidden="true" />}
      {label}<span className="kl-tab-count">{count}</span>
    </button>
  );

  return (
    <div className="kol-live-sessions">
      <section className="kl-toolbar" aria-label="Quản lý livestream và voucher">
        <div className="kl-toolbar-heading">
          <span className="kl-heading-icon"><Radio aria-hidden="true" /></span>
          <div className="kl-heading-copy">
            <h1>Livestream & voucher</h1>
            <p>Theo dõi lịch phát, ưu đãi và hoa hồng của từng phiên.</p>
          </div>
        </div>
        <nav className="kl-filters" aria-label="Lọc phiên livestream">
          {renderTab('ALL', 'Tất cả', counts.all)}
          {counts.live > 0 && renderTab('LIVE', 'Đang live', counts.live)}
          {renderTab('UPCOMING', 'Sắp diễn ra', counts.upcoming)}
          {renderTab('PENDING', 'Chờ phản hồi', counts.pending)}
          {renderTab('ENDED', 'Đã kết thúc', counts.ended)}
        </nav>
        <button type="button" onClick={() => void load()} disabled={loading} className="kl-button kl-refresh" title="Làm mới danh sách phiên" aria-label="Làm mới danh sách phiên">
          <RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /><span>Làm mới</span>
        </button>
      </section>

      {loadError && <div className="kl-error" role="alert"><AlertCircle aria-hidden="true" /><span>{loadError}</span><button type="button" className="kl-button" disabled={loading} onClick={() => void load()}>Thử lại</button></div>}

      {loading ? (
        <div className="kl-empty" role="status"><span className="kl-empty-icon"><RefreshCw className="animate-spin" aria-hidden="true" /></span><h2>Đang tải phiên livestream</h2><p>Đang cập nhật lịch phát và số liệu của bạn.</p></div>
      ) : filteredSessions.length === 0 ? (
        !loadError && <div className="kl-empty">
          <span className="kl-empty-icon"><Radio aria-hidden="true" /></span>
          <h2>{sessions.length === 0 ? 'Chưa có phiên livestream' : 'Chưa có phiên trong mục này'}</h2>
          <p>{sessions.length === 0 ? 'Lời mời từ gian hàng và voucher của từng phiên sẽ xuất hiện tại đây.' : 'Chọn Tất cả để xem lại các phiên livestream của bạn.'}</p>
          {sessions.length > 0 && <button type="button" className="kl-button" onClick={() => setStatusFilter('ALL')}>Xem tất cả phiên</button>}
        </div>
      ) : (
        <div className="kl-session-list" aria-label="Danh sách phiên livestream">
          {filteredSessions.map((session) => {
            const pending = session.inviteStatus === 'PENDING' && session.status !== 'ENDED' && session.status !== 'CANCELLED';
            const accepted = session.inviteStatus === 'ACCEPTED';
            const isLive = session.status === 'LIVE';
            const isEnded = session.status === 'ENDED' || session.status === 'CANCELLED';
            const isCopied = copiedCode === session.coupon.displayCode;
            const discount = session.coupon.discountType === 'PERCENTAGE' ? `${session.coupon.discountValue}%` : `${Number(session.coupon.discountValue).toLocaleString('vi-VN')} ₫`;
            const report = session.report;

            return (
              <article key={session.id} className="kl-session" aria-label={`Phiên ${session.title}`}>
                <div className="kl-session-heading">
                  <div className="kl-session-identity">
                    <span className="kl-shop-avatar" aria-hidden="true">{session.store.logoUrl ? <img src={session.store.logoUrl} alt="" /> : session.store.name.slice(0, 2).toUpperCase()}</span>
                    <div className="kl-session-copy">
                      <div className="kl-title-row">
                        <h2>{session.title}</h2>
                        {isLive && <span className="kl-status kl-status-live"><span className="kl-live-dot" />Đang live</span>}
                        {pending && <span className="kl-status kl-status-pending"><Clock />Chờ phản hồi</span>}
                        {accepted && !isLive && !isEnded && <span className="kl-status"><CheckCircle2 className="kl-success-icon" />Đã xác nhận</span>}
                        {isEnded && <span className="kl-status">{session.status === 'CANCELLED' ? 'Đã hủy' : 'Đã kết thúc'}</span>}
                        {session.inviteStatus === 'REJECTED' && <span className="kl-status"><XCircle />Đã từ chối</span>}
                      </div>
                      <div className="kl-session-meta">
                        <span className="kl-store-name"><Store aria-hidden="true" />{session.store.name}</span>
                        <span><CalendarClock aria-hidden="true" />{formatSessionTime(session.startsAt, session.endsAt)}</span>
                        <span><Radio aria-hidden="true" />{session.platform === 'SCANMS' ? 'SCANMS Live' : session.platform}</span>
                      </div>
                    </div>
                  </div>
                  {session.liveUrl && <a href={session.liveUrl} target="_blank" rel="noreferrer" className="kl-button kl-room"><ExternalLink aria-hidden="true" />{session.platform === 'SCANMS' ? 'Vào phòng SCANMS' : 'Mở link live'}</a>}
                </div>

                {!!session.externalChannels?.length && <div className="kl-external-channels">
                  <p>Kênh ngoài sàn <span>· Số người theo dõi do Shop cung cấp</span></p>
                  {session.externalChannels.map((channel, index) => <a key={`${channel.channelUrl}-${index}`} href={channel.channelUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /><span>{channel.channelUrl}</span><strong>{Number(channel.followerCount).toLocaleString('vi-VN')} người theo dõi</strong></a>)}
                </div>}

                <div className={`kl-offer-row ${session.products?.length ? '' : 'kl-offer-only'}`}>
                <div className="kl-voucher">
                  <div className="kl-discount"><Ticket aria-hidden="true" /><div><small>Ưu đãi phiên live</small><strong>Giảm {discount}</strong></div></div>
                  <div className="kl-code">
                    <small>Mã voucher</small>
                    <div className="kl-code-control">
                      <code>{session.coupon.displayCode}</code>
                      <button type="button" className="kl-copy" disabled={!accepted} onClick={() => void copyCode(session.coupon.displayCode)} title={accepted ? 'Sao chép mã voucher' : 'Chấp nhận lời mời để sao chép voucher'} aria-label={`Sao chép mã voucher ${session.coupon.displayCode}`}>
                        {isCopied ? <Check className="kl-success-icon" aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="kl-rate"><small><Sparkles aria-hidden="true" />Hoa hồng</small><strong>{Number(session.commissionRate)}%</strong></div>
                </div>

                {!!session.products?.length && <div className="kl-products">
                  <span>Áp dụng cho</span>
                  {session.products.slice(0, 2).map((item, index) => <span className="kl-product" key={item.product.id || index} title={item.product.title}><img src={getSafeProductImageUrl(item.product.imageUrl)} alt="" loading="lazy" /><span>{item.product.title}</span></span>)}
                  {session.products.length > 2 && <span className="kl-more-products">+{session.products.length - 2} sản phẩm</span>}
                </div>}
                </div>

                {report && <dl className="kl-metrics">
                  <div><dt><Users aria-hidden="true" />Người mua</dt><dd>{Number(report.buyers ?? 0).toLocaleString('vi-VN')}</dd></div>
                  <div><dt><Ticket aria-hidden="true" />Lượt nhận mã</dt><dd>{Number(report.claims || 0).toLocaleString('vi-VN')}</dd></div>
                  <div><dt><ShoppingBag aria-hidden="true" />Đơn ghi nhận</dt><dd>{Number(report.orders || 0).toLocaleString('vi-VN')}<small>{report.pendingOrders || 0} chờ</small></dd>{(report.cancelledOrders || 0) > 0 && <span className="kl-cancelled">{report.cancelledOrders} đã hủy</span>}</div>
                  <div><dt><TrendingUp aria-hidden="true" />Doanh số GMV</dt><dd>{Number(report.grossSales || 0).toLocaleString('vi-VN')} ₫</dd></div>
                  <div><dt><Tag aria-hidden="true" />Giảm voucher</dt><dd>{Number(report.voucherDiscount || 0).toLocaleString('vi-VN')} ₫</dd></div>
                  <div className="kl-commission"><dt><Coins aria-hidden="true" />Hoa hồng của bạn</dt><dd>+{Number(report.commission || 0).toLocaleString('vi-VN')} ₫</dd></div>
                </dl>}

                {pending && <div className="kl-invitation">
                  <p><Sparkles aria-hidden="true" />Gian hàng mời bạn tham gia phiên live cùng voucher riêng.</p>
                  <div><button type="button" className="kl-button" disabled={pendingAction === session.id} onClick={() => void respond(session, false)}>Từ chối</button>
                    <button type="button" className="kl-button kl-primary" disabled={pendingAction === session.id} onClick={() => void respond(session, true)}>
                      {pendingAction === session.id ? <RefreshCw className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{pendingAction === session.id ? 'Đang gửi...' : 'Chấp nhận tham gia'}
                    </button></div>
                </div>}

                <div className="kl-governance"><LiveGovernancePanel session={session} audience="kol" onChanged={() => void load(false)} /></div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
