import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  Store,
  Layers,
  RotateCcw,
  Wallet,
  FileText,
  BadgePercent,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { commissionRulesService } from '../../services/commission-rules.service';
import api from '../../services/api';
import { getVietnamCurrentMonthYear } from '@/utils/date-time.utils';
import { Select } from '../../components/ui/Select';
import './KolBonusProgressPage.css';

interface MilestoneItem {
  id: string;
  name: string;
  minMonthlyRevenue: string;
  achievementBonus: string;
  bonusPercentage: string;
  description?: string;
  isReached: boolean;
}

interface BonusProgressData {
  storeId: string;
  storeName: string;
  storeLogo?: string;
  collaboratorId: string;
  yearMonth: string;
  validRevenue: string;
  validOrdersCount: number;
  currentMilestone: {
    id: string;
    name: string;
    minMonthlyRevenue: string;
    achievementBonus: string;
  } | null;
  achievementBonus: string;
  rangeBonuses: Array<{
    from: string;
    to: string;
    rate: string;
    revenue: string;
    bonus: string;
  }>;
  estimatedTotalBonus: string;
  nextMilestone: {
    id: string;
    name: string;
    minMonthlyRevenue: string;
    achievementBonus: string;
    bonusPercentage: string;
    missingRevenue: string;
  } | null;
  milestones: MilestoneItem[];
  settlementStatus: string;
  hasRefundAdjustment: boolean;
  settlement?: {
    id: string;
    status: string;
    bonusAmount: string;
    settledAt: string;
    approvedAt?: string;
    paidAt?: string;
  } | null;
  adjustments?: {
    hasAdjustment: boolean;
    totalAdjustmentAmount: string;
    items: Array<{
      id: string;
      amount: string;
      reason: string;
      status: string;
      createdAt: string;
    }>;
  };
}

export const KolBonusProgressPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { year: currentVnYear, month: currentVnMonth } = getVietnamCurrentMonthYear();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(currentVnYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentVnMonth);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [storesLoading, setStoresLoading] = useState<boolean>(true);
  const [storeInvitations, setStoreInvitations] = useState<any[]>([]);
  const [invitationLoading, setInvitationLoading] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'progress' | 'history'>('progress');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<BonusProgressData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isDevMockEnabled = import.meta.env.VITE_ENABLE_MOCK_DEMO === 'true';
  const currentYearMonth = `${selectedYear}-${selectedMonth}`;



  useEffect(() => {
    const handleAuthSync = (event: MessageEvent) => {
      if (event.data?.type === 'SCANMS_AUTH_SYNC') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleAuthSync);
    return () => window.removeEventListener('message', handleAuthSync);
  }, []);


  useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      setStoresLoading(true);
      try {
        const res = await commissionRulesService.getCollaboratorStores(false);
        if (isMounted) {
          if (Array.isArray(res) && res.length > 0) {
            setStores(res.map((s: any) => ({ id: s.id, name: s.name })));
            setSelectedStoreId(res[0].id);
          } else {
            setStores([]);
            setSelectedStoreId('');
          }
        }
      } catch {
        if (isMounted) {
          setStores([]);
          setSelectedStoreId('');
        }
      } finally {
        if (isMounted) {
          setStoresLoading(false);
        }
      }
    }
    loadStores();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    api.get('/store-collaborators/my-invitations')
      .then((res: any) => {
        const body = res?.data || res;
        setStoreInvitations(Array.isArray(body) ? body.filter((item: any) => item.status === 'PENDING') : []);
      })
      .catch(() => setStoreInvitations([]));
  }, []);

  const respondToStoreInvitation = async (id: string, accept: boolean) => {
    setInvitationLoading(id);
    try {
      await api.patch(`/store-collaborators/${id}/${accept ? 'accept' : 'reject'}`, {});
      setStoreInvitations((items) => items.filter((item) => item.id !== id));
      if (accept) window.location.reload();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Không thể xử lý lời mời của Shop');
    } finally {
      setInvitationLoading(null);
    }
  };


  useEffect(() => {
    if (window.parent && window.parent !== window) {
      const sendHeight = () => {
        const rootEl = document.getElementById('kol-bonus-root') || document.body;
        const h = Math.max(rootEl.scrollHeight, document.documentElement.scrollHeight, 680);
        window.parent.postMessage({ type: 'SCANMS_IFRAME_RESIZE', height: h }, '*');
        window.parent.postMessage({ type: 'SCANMS_RESIZE_IFRAME', height: h }, '*');
      };
      sendHeight();
      const observer = new ResizeObserver(() => sendHeight());
      observer.observe(document.body);
      const timer = setTimeout(sendHeight, 200);
      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }
  }, [loading, data, errorMessage, activeTab, historyList, historyLoading, selectedStoreId]);


  useEffect(() => {
    if (!selectedStoreId) {
      setLoading(false);
      setData(null);
      return;
    }

    let active = true;
    async function fetchProgress() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await commissionRulesService.getMyBonusProgress(selectedStoreId, currentYearMonth);
        if (!active) return;
        if (res && (res.validRevenue !== undefined || res.estimatedTotalBonus !== undefined)) {
          setData(res);
        } else {
          throw new Error('Dữ liệu không đúng định dạng');
        }
      } catch {
        if (!active) return;
        if (isDevMockEnabled) {
          setData({
            storeId: selectedStoreId,
            storeName: stores.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng liên kết',
            collaboratorId: 'kol-current',
            yearMonth: currentYearMonth,
            validRevenue: '60000000',
            validOrdersCount: 28,
            currentMilestone: {
              id: 'm1',
              name: 'Mốc Bạc 50 Triệu',
              minMonthlyRevenue: '50000000',
              achievementBonus: '500000',
            },
            achievementBonus: '500000',
            rangeBonuses: [
              {
                from: '50000000',
                to: '60000000',
                rate: '2',
                revenue: '10000000',
                bonus: '200000',
              },
            ],
            estimatedTotalBonus: '700000',
            nextMilestone: {
              id: 'm2',
              name: 'Mốc Vàng 100 Triệu',
              minMonthlyRevenue: '100000000',
              achievementBonus: '1500000',
              bonusPercentage: '3',
              missingRevenue: '40000000',
            },
            milestones: [
              {
                id: 'm1',
                name: 'Mốc Bạc 50 Triệu',
                minMonthlyRevenue: '50000000',
                achievementBonus: '500000',
                bonusPercentage: '2',
                description: 'Đạt doanh số 50 triệu thưởng nóng 500.000đ + 2% phần vượt',
                isReached: true,
              },
              {
                id: 'm2',
                name: 'Mốc Vàng 100 Triệu',
                minMonthlyRevenue: '100000000',
                achievementBonus: '1500000',
                bonusPercentage: '3',
                description: 'Đạt doanh số 100 triệu thưởng nóng 1.500.000đ + 3% phần vượt',
                isReached: false,
              },
            ],
            settlementStatus: 'ACCUMULATING',
            hasRefundAdjustment: false,
            settlement: null,
          });
        } else {
          setData(null);
          setErrorMessage('Không thể tải dữ liệu thưởng. Vui lòng đăng nhập lại hoặc thử lại sau.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProgress();
    return () => { active = false; };
  }, [selectedStoreId, currentYearMonth, isDevMockEnabled, stores]);


  useEffect(() => {
    if (activeTab !== 'history' || !selectedStoreId) return;

    let active = true;
    async function fetchHistory() {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await commissionRulesService.getMyBonusHistory(selectedStoreId);
        if (!active) return;
        if (Array.isArray(res)) {
          setHistoryList(res);
        } else {
          throw new Error('Dữ liệu không hợp lệ');
        }
      } catch {
        if (!active) return;
        if (isDevMockEnabled) {
          setHistoryList([
            {
              id: 'settle-aug',
              yearMonth: '2026-08',
              storeName: stores.find((s) => s.id === selectedStoreId)?.name || 'Cửa hàng liên kết',
              validRevenue: '58000000',
              appliedRuleName: 'Mốc Bạc 50 Triệu',
              achievementBonus: '500000',
              bonusAmount: '660000',
              status: 'PAID',
              settledAt: '2026-09-01T02:00:00Z',
              approvedAt: '2026-09-02T10:15:00Z',
              paidAt: '2026-09-03T14:30:00Z',
              hasRefundAdjustment: false,
            },
          ]);
        } else {
          setHistoryList([]);
          setHistoryError('Không thể tải lịch sử nhận thưởng. Vui lòng đăng nhập lại hoặc thử lại sau.');
        }
      } finally {
        if (active) setHistoryLoading(false);
      }
    }
    fetchHistory();
    return () => { active = false; };
  }, [activeTab, selectedStoreId, isDevMockEnabled, stores]);

  const formatVnd = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCUMULATING':
        return {
          bg: '#FEF9C3',
          color: '#854D0E',
          border: '#FDE047',
          icon: <Clock size={16} color="#854D0E" />,
          label: 'Đang tích lũy doanh số',
          desc: 'Kỳ tháng hiện tại đang tiếp diễn. Doanh số tiếp tục được cộng dồn từ các đơn hàng thành công.',
        };
      case 'PENDING_SETTLEMENT':
        return {
          bg: '#FBF5EB',
          color: '#9A3412',
          border: '#FDBA74',
          icon: <AlertCircle size={16} color="#9A3412" />,
          label: 'Chờ Shop chốt thưởng',
          desc: 'Kỳ tháng đã kết thúc. Đang chờ Chủ Shop rà soát và tạo bản chốt thưởng.',
        };
      case 'PENDING':
        return {
          bg: '#FBF5EB',
          color: '#B88E4F',
          border: '#C59B58',
          icon: <Clock size={16} color="#B88E4F" />,
          label: 'Chờ duyệt chi trả',
          desc: 'Shop đã chốt bảng thưởng tháng. Đang chờ kế toán/chủ shop duyệt phê duyệt.',
        };
      case 'APPROVED':
        return {
          bg: '#FBF5EB',
          color: '#15803d',
          border: '#EAE4D7',
          icon: <CheckCircle2 size={16} color="#15803d" />,
          label: 'Đã duyệt thưởng',
          desc: 'Khoản thưởng đã được phê duyệt hợp lệ. Tiền sẽ sớm được chuyển vào Ví Khả Dụng.',
        };
      case 'PAID':
        return {
          bg: '#ECE1CD',
          color: '#B88E4F',
          border: '#DEBE85',
          icon: <Wallet size={16} color="#B88E4F" />,
          label: 'Đã trả vào ví',
          desc: 'Tiền thưởng đã được cộng trực tiếp vào Ví Khả Dụng của bạn. Bạn có thể bấm rút tiền VietQR ngay.',
        };
      case 'REFUND_ADJUSTED':
        return {
          bg: '#FEE2E2',
          color: '#991B1B',
          border: '#DC2626',
          icon: <RotateCcw size={16} color="#991B1B" />,
          label: 'Có điều chỉnh hoàn tiền',
          desc: 'Đơn hàng phát sinh hoàn tiền/hủy sau khi giao. Đã khấu trừ đối soát minh bạch vào sổ cái.',
        };
      default:
        return {
          bg: '#F6EFE3',
          color: '#7D715E',
          border: '#EAE4D7',
          icon: <Clock size={16} color="#7D715E" />,
          label: status,
          desc: 'Trạng thái tính thưởng kỳ hiện tại',
        };
    }
  };

  const validRevNum = parseFloat(data?.validRevenue || '0');
  const nextMinNum = parseFloat(data?.nextMilestone?.minMonthlyRevenue || '0');
  const prevMinNum = parseFloat(data?.currentMilestone?.minMonthlyRevenue || '0');


  let progressPercent = 100;
  if (data?.nextMilestone && nextMinNum > 0) {
    if (nextMinNum > prevMinNum) {
      const span = nextMinNum - prevMinNum;
      const done = Math.max(0, validRevNum - prevMinNum);
      progressPercent = Math.min(100, Math.max(0, Math.round((done / span) * 100)));
    } else {
      progressPercent = Math.min(100, Math.max(0, Math.round((validRevNum / nextMinNum) * 100)));
    }
  }

  return (
    <div
      id="kol-bonus-root"
      style={{
        minHeight: embedded ? 'auto' : '100vh',
        backgroundColor: embedded ? 'transparent' : '#FAF8F5',
        padding: embedded ? 0 : '24px 24px 72px',
        fontFamily: embedded ? 'inherit' : "'Plus Jakarta Sans', Inter, -apple-system, sans-serif",
        color: '#1A1612',
        boxSizing: 'border-box',
      }}
    >
      {!embedded && <style>{`
        html, body {
          scrollbar-width: thin;
          scrollbar-color: rgba(180, 140, 75, 0.45) transparent;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scroll-behavior: smooth;
        }
        ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
          background-color: transparent;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background-color: rgba(180, 140, 75, 0.45);
          border-radius: 9999px;
          border: 1.5px solid transparent;
          background-clip: padding-box;
          transition: background-color 0.15s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: rgba(158, 121, 51, 0.85);
        }
        ::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>}
      <div className="kol-bonus-content">
        {storeInvitations.map((invitation) => (
          <div key={invitation.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#FFF7E7', border: '1.5px solid #DEBE85', borderRadius: 12, flexWrap: 'wrap' }}>
            <div>
              <strong style={{ fontSize: 15 }}>{invitation.store?.name} mời bạn vào đội ngũ CTV</strong>
              <div style={{ marginTop: 3, color: '#7D715E', fontSize: 13 }}>Chấp nhận để xem mốc thưởng và tạo link tiếp thị cho Shop này.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={invitationLoading === invitation.id} onClick={() => respondToStoreInvitation(invitation.id, false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D8C6A8', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Từ chối</button>
              <button type="button" disabled={invitationLoading === invitation.id} onClick={() => respondToStoreInvitation(invitation.id, true)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--action-border)', background: 'var(--action-bg)', color: 'var(--action-ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }} className="scanms-brand-action">{invitationLoading === invitation.id ? 'Đang xử lý…' : 'Chấp nhận'}</button>
            </div>
          </div>
        ))}

        <div className="kol-bonus-toolbar">
          <header className="bonus-toolbar-heading">
            <div className="bonus-heading"><span className="bonus-icon"><BadgePercent aria-hidden="true" /></span><div><h2>Thưởng doanh số</h2><p>Tháng {Number(selectedMonth)}/{selectedYear} · Theo chính sách từng gian hàng</p></div></div>
            {data && !loading && <span className="bonus-badge">{getStatusBadge(data.settlementStatus).icon}{getStatusBadge(data.settlementStatus).label}</span>}
          </header>
          <div className="kol-bonus-tabs" role="group" aria-label="Nội dung thưởng doanh số">
            <button type="button" aria-pressed={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
              Tiến độ &amp; mốc thưởng
            </button>
            <button type="button" aria-pressed={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              {historyLoading ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
              Lịch sử nhận thưởng
            </button>
          </div>
          <div className="kol-bonus-filters">
            <Select
              aria-label="Gian hàng tính thưởng"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              disabled={storesLoading || stores.length === 0}
              className="w-48"
            >
              {stores.length === 0 ? (
                <option value="">Chưa có Shop liên kết</option>
              ) : (
                stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </Select>

            <Select
              aria-label="Tháng tính thưởng"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-32"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                return (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                );
              })}
            </Select>

            <Select
              aria-label="Năm tính thưởng"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-32"
            >
              {[Number(currentVnYear) - 1, Number(currentVnYear), Number(currentVnYear) + 1].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        </div>


        {storesLoading || (activeTab === 'progress' && loading) || (activeTab === 'history' && historyLoading) ? (
          <section className="bonus-panel bonus-loading-state" role="status"><Loader2 className="animate-spin" size={18} aria-hidden="true" />Đang tải {activeTab === 'progress' ? 'tiến độ thưởng' : 'lịch sử nhận thưởng'}…</section>
        ) : !storesLoading && stores.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '36px 24px',
              border: '1.5px solid #EAE4D7',
              textAlign: 'center',
              boxShadow: '0 3px 14px rgba(110, 84, 39, 0.05)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#FAF8F5',
                border: '1.5px solid #EAE4D7',
                color: '#B88E4F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <Store size={22} color="#B88E4F" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 850, color: '#1A1612', margin: '0 0 6px' }}>
              Bạn chưa tham gia Shop nào có chính sách thưởng doanh số.
            </h3>
            <p style={{ fontSize: 13, color: '#7D715E', margin: '0 0 16px', maxWidth: 540, marginInline: 'auto', lineHeight: 1.5 }}>
              Khi bạn liên kết với các Cửa hàng có áp dụng chương trình thưởng doanh số tháng hoặc tạo ra đơn hàng tiếp thị hợp lệ, tiến độ tích lũy và mức thưởng dự kiến sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : errorMessage && !data ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '32px 24px',
              border: '1.5px solid #DC2626',
              textAlign: 'center',
              boxShadow: '0 3px 14px rgba(110, 84, 39, 0.05)',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                fontSize: 22,
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991B1B', margin: '0 0 6px' }}>
              Không thể tải dữ liệu thưởng
            </h3>
            <p style={{ fontSize: 13, color: '#7D715E', margin: '0 0 18px' }}>
              Vui lòng đăng nhập lại hoặc thử lại sau.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 18px',
                  background: 'var(--action-bg)',
                  color: 'var(--action-ink)',
                  border: '1px solid var(--action-border)',
                  borderRadius: 8,
                  fontWeight: 750,
                  fontSize: 13,
                  cursor: 'pointer',
                }} className="scanms-brand-action"
              >
                Thử lại
              </button>
              <a
                href="/login"
                style={{
                  padding: '8px 18px',
                  background: '#F6EFE3',
                  color: '#7D715E',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  border: '1px solid #EAE4D7',
                }}
              >
                Đăng nhập lại
              </a>
            </div>
          </div>
        ) : activeTab === 'progress' ? (
          <>
            <section className="bonus-panel bonus-overview" aria-label="Tổng quan thưởng doanh số" aria-busy={loading}>
            <div className="kol-kpi-grid">
              <article className="bonus-kpi">
                <div className="bonus-kpi-heading"><h2>Doanh số hợp lệ</h2><span className="bonus-icon"><Coins aria-hidden="true" /></span></div>
                <strong className="bonus-amount">{formatVnd(data?.validRevenue || '0')}</strong>
                <p><span>Từ <strong>{data?.validOrdersCount || 0} đơn hàng</strong> thành công</span></p>
              </article>
              <article className="bonus-kpi">
                <div className="bonus-kpi-heading"><h2>Mốc đã đạt</h2><span className="bonus-icon"><Award aria-hidden="true" /></span></div>
                <strong className="bonus-kpi-name">{data?.currentMilestone?.name || 'Chưa đạt mốc nào'}</strong>
                <p>{data?.currentMilestone ? `Ngưỡng: ${formatVnd(data.currentMilestone.minMonthlyRevenue)}` : 'Đạt mốc đầu tiên để nhận thưởng'}</p>
              </article>
              <article className="bonus-kpi">
                <div className="bonus-kpi-heading"><h2>Thưởng KPI & phần vượt</h2><span className="bonus-icon"><BadgePercent aria-hidden="true" /></span></div>
                <div className="bonus-kpi-split"><strong>{formatVnd(data?.achievementBonus || '0')}</strong><span>+</span><strong>{formatVnd(parseFloat(data?.estimatedTotalBonus || '0') - parseFloat(data?.achievementBonus || '0'))}</strong></div>
                <p>KPI cố định + phần vượt</p>
              </article>
              <article className="bonus-kpi bonus-kpi-total">
                <div className="bonus-kpi-heading"><h2>Tổng thưởng dự kiến</h2><span className="bonus-icon"><Trophy aria-hidden="true" /></span></div>
                <strong className="bonus-amount">{formatVnd(data?.estimatedTotalBonus || '0')}</strong>
                <p><Wallet size={14} aria-hidden="true" /><span>{data ? getStatusBadge(data.settlementStatus).label : 'Chưa có dữ liệu'}</span></p>
              </article>
            </div>
            </section>

            {data?.nextMilestone ? (
              <section className="bonus-panel bonus-progress" aria-labelledby="bonus-progress-title">
                <div className="bonus-progress-header">
                  <div className="bonus-heading">
                    <span className="bonus-icon"><TrendingUp aria-hidden="true" /></span>
                    <div>
                      <h2 id="bonus-progress-title">Mốc tiếp theo: {data.nextMilestone.name}</h2>
                      <p>Tích lũy doanh số để mở mốc thưởng mới.</p>
                    </div>
                  </div>
                  <div className="bonus-missing"><span>Doanh số còn thiếu</span><strong>{formatVnd(data.nextMilestone.missingRevenue)}</strong></div>
                </div>
                <div className="bonus-progress-body">
                <div className="bonus-progress-meter">
                <div className="bonus-meter-label"><span>Tiến độ đạt mốc</span><strong>{progressPercent}%</strong></div>
                <div className="bonus-progress-track" role="progressbar" aria-label="Tiến độ tới mốc tiếp theo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="bonus-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="bonus-progress-footer">
                  <span><strong>{formatVnd(data.validRevenue)}</strong> / {formatVnd(data.nextMilestone.minMonthlyRevenue)}</span>
                  <span>Doanh số mục tiêu</span>
                </div>
                </div>
                <aside className="bonus-next-reward" aria-label="Quyền lợi tại mốc tiếp theo">
                  <span>Quyền lợi tại mốc {data.nextMilestone.name}</span>
                  <dl><div><dt>Thưởng KPI</dt><dd>{formatVnd(data.nextMilestone.achievementBonus)}</dd></div><div><dt>Phần vượt mốc</dt><dd>+{data.nextMilestone.bonusPercentage}%</dd></div></dl>
                </aside>
                </div>
                {data.milestones.length > 1 && <ol className="bonus-roadmap" aria-label="Lộ trình mốc thưởng">{data.milestones.map((milestone,index) => <li key={milestone.id} data-reached={milestone.isReached || undefined} data-next={milestone.id === data.nextMilestone?.id || undefined}><span>{milestone.isReached ? <Check size={13} aria-hidden="true" /> : index + 1}</span><div><strong>{milestone.name}</strong><small>{formatVnd(milestone.minMonthlyRevenue)}</small></div></li>)}</ol>}
              </section>
            ) : (
              <section className="bonus-panel bonus-complete">
                <div className="bonus-heading">
                  <span className="bonus-icon">{data?.milestones?.length ? <CheckCircle2 aria-hidden="true" /> : <Layers aria-hidden="true" />}</span>
                  <div>
                    <h2>{loading ? 'Đang tải tiến độ thưởng…' : data?.milestones?.length ? 'Bạn đã đạt mốc thưởng cao nhất' : 'Chưa có mốc thưởng được thiết lập'}</h2>
                    <p>{data?.milestones?.length ? 'Tiếp tục tích lũy doanh số để nhận thưởng phần vượt theo chính sách gian hàng.' : 'Các mốc thưởng sẽ hiển thị khi gian hàng cập nhật chính sách.'}</p>
                  </div>
                </div>
              </section>
            )}

            <details className="bonus-panel bonus-policy">
              <summary className="bonus-section-header">
                <div className="bonus-heading">
                  <span className="bonus-icon"><Layers aria-hidden="true" /></span>
                  <div><h2>Chính sách & mốc thưởng</h2><p>{data?.milestones?.length || 0} mốc · {data?.storeName || stores.find(store => store.id === selectedStoreId)?.name} · Tháng {selectedMonth}/{selectedYear}</p></div>
                </div>
                <span className="bonus-policy-action"><span className="bonus-policy-open-label">Xem các mốc</span><span className="bonus-policy-close-label">Thu gọn</span><ChevronDown size={16} aria-hidden="true" /></span>
              </summary>
              <div className="bonus-policy-list" aria-label="Danh sách mốc thưởng">
                    {data?.milestones?.length ? data.milestones.map((m, idx) => (
                      <article className="bonus-policy-row" key={m.id || idx} data-reached={m.isReached || undefined}>
                        <div className="bonus-milestone-name"><span className="bonus-milestone-index">{idx + 1}</span><div><h3>{m.name}</h3><p>{m.description || 'Áp dụng theo doanh số hợp lệ tháng'}</p></div></div>
                        <dl><div><dt>Doanh số tối thiểu</dt><dd>{formatVnd(m.minMonthlyRevenue)}</dd></div><div><dt>Thưởng KPI</dt><dd>{formatVnd(m.achievementBonus)}</dd></div><div><dt>Phần vượt</dt><dd>+{m.bonusPercentage}%</dd></div></dl>
                        <span className={`bonus-badge ${m.isReached ? 'bonus-badge-reached' : ''}`}>{m.isReached && <Check size={13} aria-hidden="true" />}{m.isReached ? 'Đã đạt' : 'Chưa đạt'}</span>
                      </article>
                    )) : <p className="bonus-empty">Chưa có mốc thưởng nào được cấu hình cho gian hàng này.</p>}
              </div>
              <details className="bonus-calculation">
                <summary>Cách tính thưởng lũy tiến</summary>
                <p>Khi vượt qua ngưỡng doanh số, bạn được nhận <strong>tiền thưởng đạt KPI</strong> của mốc cao nhất đạt được, cộng thêm <strong>% thưởng phần vượt</strong> tính trên số tiền vượt mốc. Tiền thưởng sẽ được chủ gian hàng phê duyệt và chuyển vào ví sau khi kết thúc kỳ đối soát tháng.</p>
              </details>
            </details>
          </>
        ) : historyError && historyList.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '32px 24px',
              border: '1.5px solid #DC2626',
              textAlign: 'center',
              boxShadow: '0 3px 14px rgba(110, 84, 39, 0.05)',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                fontSize: 22,
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991B1B', margin: '0 0 6px' }}>
              Không thể tải lịch sử nhận thưởng
            </h3>
            <p style={{ fontSize: 13, color: '#7D715E', margin: '0 0 18px' }}>
              Vui lòng đăng nhập lại hoặc thử lại sau.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 18px',
                  background: 'var(--action-bg)',
                  color: 'var(--action-ink)',
                  border: '1px solid var(--action-border)',
                  borderRadius: 8,
                  fontWeight: 750,
                  fontSize: 13,
                  cursor: 'pointer',
                }} className="scanms-brand-action"
              >
                Thử lại
              </button>
              <a
                href="/login"
                style={{
                  padding: '8px 18px',
                  background: '#F6EFE3',
                  color: '#7D715E',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  border: '1px solid #EAE4D7',
                }}
              >
                Đăng nhập lại
              </a>
            </div>
          </div>
        ) : (
          <section className="bonus-panel bonus-history" aria-labelledby="bonus-history-title" aria-busy={historyLoading}>
            <header className="bonus-section-header">
              <div className="bonus-heading"><span className="bonus-icon"><FileText aria-hidden="true" /></span><div><h2 id="bonus-history-title">Lịch sử nhận thưởng</h2><p>Kết quả chốt thưởng, trạng thái phê duyệt và thời gian chuyển vào ví.</p></div></div>
              <span className="bonus-badge">{historyList.length} kỳ thưởng</span>
            </header>
            <div className="bonus-table-scroll" data-scrollable-x="true" role="region" aria-label="Lịch sử các kỳ thưởng" tabIndex={0}>
              <table className="bonus-table">
                <thead><tr>
                  <th scope="col">Kỳ tháng</th><th scope="col">Gian hàng</th><th scope="col" className="bonus-number">Doanh số hợp lệ</th><th scope="col">Mốc áp dụng</th>
                  <th scope="col" className="bonus-number">Thưởng KPI</th><th scope="col" className="bonus-number">Tổng thưởng</th><th scope="col">Trạng thái</th><th scope="col">Thời gian</th>
                </tr></thead>
                <tbody>
                  {historyList.length ? historyList.map(item => {
                    const badge = getStatusBadge(item.status);
                    return <tr key={item.id}>
                      <td>{item.yearMonth}</td><td>{item.storeName}</td><td className="bonus-number">{formatVnd(item.validRevenue)}</td>
                      <td className="bonus-description">{item.appliedRuleName || 'N/A'}</td><td className="bonus-number">{formatVnd(item.achievementBonus || '0')}</td>
                      <td className="bonus-number">{formatVnd(item.bonusAmount)}</td><td><span className="bonus-badge">{badge.icon}{badge.label}</span></td>
                      <td className="bonus-description">{item.paidAt ? new Date(item.paidAt).toLocaleDateString('vi-VN') : item.settledAt ? `Chốt ${new Date(item.settledAt).toLocaleDateString('vi-VN')}` : 'Chưa có'}</td>
                    </tr>;
                  }) : <tr><td colSpan={8} className="bonus-empty">{historyLoading ? 'Đang tải lịch sử nhận thưởng…' : 'Chưa có lượt chốt thưởng nào cho gian hàng này.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default KolBonusProgressPage;
