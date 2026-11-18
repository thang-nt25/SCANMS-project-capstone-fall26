import { MonthlyRewardsPanel } from '../../components/promotions/MonthlyRewardsPanel';
import AdminCustomerWithdrawals from '../../components/wallet/AdminCustomerWithdrawals';
import { PayoutEvidenceDialog } from '../../components/wallet/PayoutEvidenceDialog';
import { payoutTaxLabel, payoutTableTaxLabel, type MonthlyTaxContext } from '../../utils/payout-tax';
import { Modal } from '../../components/ui/Modal';
import { PayoutBankAccount } from '../../components/wallet/PayoutBankAccount';
import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { EscrowFinanceReport } from '../../components/wallet/FinanceReports';
import { FinanceOperations } from '../../components/wallet/FinanceOperations';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PayoutApprovalDialog, type ManualPayoutProof } from '../../components/wallet/PayoutApprovalDialog';
import {
  Search,
  Eye,
  Loader2,
  CheckCircle2,
  Copy,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { payoutDisplayCode } from '../../utils/payout-display-code';
import { hasRejectionReason, toggleRejectionReason } from '../../utils/payout-rejection-reasons';

interface PayoutItem {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail?: string;
  collaboratorPhone?: string;
  collaboratorAvatar?: string;
  collaboratorTaxCode?: string;
  kycStatus: string;
  storeId?: string;
  storeName?: string;
  amount: string;
  taxAmount: string;
  taxContext?: MonthlyTaxContext | null;
  monthlyWithdrawalSummary?: { month: string; totalGross: string; pendingGross: string; processingGross: string; approvedGross: string; count: number };
  netAmount: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankRefCode?: string | null;
  transferProvider?: string | null;
  hasBill: boolean;
  rejectedReason?: string | null;
  refundedAmount?: string | null;
  createdAt: string;
  processedAt?: string | null;
  approvedByName?: string | null;
  risk?: {
    status: 'BLOCKED' | 'REVIEW' | 'CLEAR';
    passedChecks: number;
    totalChecks: number;
    checks: { code: string; label: string; passed: boolean; blocking: boolean }[];
    disclaimer: string;
  };
}

interface PayoutStats {
  pending: { count: number; grossAmount: string; netAmount: string; taxAmount: string };
  approved: { count: number; grossAmount: string; netAmount: string; taxAmount: string };
  processingCount: number;
  totalRequests: number;
}

interface PendingFinanceWork {
  kol: number;
  customer: number;
  escrow: number;
  escrowWaitingExchange?: number;
  monthly: { policies: number; grants: number; total: number; months: string[] };
  checkedAt: string;
}
function FinanceWorkBadge({ count, label }: { count?: number; label: string }) {
  if (count === 0) return null;
  return <span className="finance-tab-count finance-work-count" data-attention={count !== undefined || undefined} title={count === undefined ? 'Chưa tải được số việc cần xử lý' : `${count} ${label}`} aria-label={count === undefined ? 'Chưa xác định số lượng' : `${count} ${label}`}>{count === undefined ? '—' : count > 99 ? '99+' : count}</span>;
}

const formatMoney = (val: string | number) =>
  `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Chờ đối soát', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Đã giải ngân', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

let lastAdminPayoutsSnapshot: { payouts: PayoutItem[]; stats: PayoutStats | null; total: number } | null = null;
registerPrivateCacheReset(() => { lastAdminPayoutsSnapshot = null; });

export default function AdminFinancePayoutsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'kol' | 'escrow' | 'operations' | 'customer' | 'monthly'>('kol');
  useEffect(() => { if (searchParams.get('tab') === 'monthly') setActiveTab('monthly'); }, [searchParams]);
  const [loading, setLoading] = useState(() => !lastAdminPayoutsSnapshot);
  const [payouts, setPayouts] = useState<PayoutItem[]>(() => lastAdminPayoutsSnapshot?.payouts || []);
  const [stats, setStats] = useState<PayoutStats | null>(() => lastAdminPayoutsSnapshot?.stats || null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => lastAdminPayoutsSnapshot?.total || 0);
  const [loadError, setLoadError] = useState('');
  const [pendingWork, setPendingWork] = useState<PendingFinanceWork | null>(null);
  const [workError, setWorkError] = useState(false);
  const [rewardMonth, setRewardMonth] = useState<string>();
  const workInFlight = useRef(false);
  const workQueued = useRef(false);
  const workMounted = useRef(false);
  const previousWork = useRef<PendingFinanceWork | null>(null);
  const fetchPendingWork = useCallback(async () => {
    if (workInFlight.current) { workQueued.current = true; return; }
    workInFlight.current = true;
    try {
      const response = await api.get('/admin/payouts/pending-work', { headers: { 'x-skip-cache': 'true' }, timeout: 15000 });
      const next: PendingFinanceWork = response.data?.data || response.data;
      if (!workMounted.current) return;
      const old = previousWork.current;
      if (old && document.visibilityState === 'visible' && (next.customer > old.customer || next.escrow > old.escrow || next.monthly.total > old.monthly.total || next.kol > old.kol)) {
        toast.info('Có yêu cầu tài chính mới cần xử lý. Xem số lượng trên các tab.');
      }
      previousWork.current = next; setPendingWork(next); setWorkError(false);
    } catch { if (workMounted.current) setWorkError(true); }
    finally {
      workInFlight.current = false;
      if (workQueued.current && workMounted.current) { workQueued.current = false; void fetchPendingWork(); }
    }
  }, []);
  useEffect(() => {
    workMounted.current = true; void fetchPendingWork();
    const refresh = () => { if (document.visibilityState === 'visible') void fetchPendingWork(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { workMounted.current = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [fetchPendingWork]);

  // Approval modal state
  const [approvingItem, setApprovingItem] = useState<PayoutItem | null>(null);
  const [approvalProgress, setApprovalProgress] = useState(0);
  const [riskItem, setRiskItem] = useState<PayoutItem | null>(null);
  const [riskFocusCode, setRiskFocusCode] = useState<string>();
  const [monthlyItem, setMonthlyItem] = useState<PayoutItem | null>(null);
  const [detailItem, setDetailItem] = useState<PayoutItem | null>(null);
  const approvalInFlight = useRef(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Rejection modal state
  const [rejectingItem, setRejectingItem] = useState<PayoutItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Bill preview modal
  const [viewingBillUrl, setViewingBillUrl] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/payouts/stats');
      setStats(res.data?.data || res.data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 12 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/payouts', { params });
      const data = res.data?.data || res.data;
      setPayouts(data.requests || []);
      setTotal(data.total || 0);
      setLoadError('');
    } catch {
      setPayouts([]);
      setLoadError('Không tải được danh sách chi trả. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchStats();
    fetchPayouts();
  }, [fetchStats, fetchPayouts]);

  const handleApproveSubmit = async ({ bill, bankRefCode, note }: ManualPayoutProof) => {
    if (!approvingItem || approvalInFlight.current || (approvingItem.status === 'PENDING' && approvingItem.risk?.status === 'BLOCKED')) return;
    approvalInFlight.current = true;
    setSubmittingApproval(true);
    setApprovalProgress(0);
    try {
      const formData = new FormData();
      formData.append('bill', bill);
      formData.append('bankRefCode', bankRefCode);
      formData.append('expectedNetAmount', approvingItem.netAmount);
      if (note.trim()) formData.append('note', note.trim());

      await api.patch(`/admin/payouts/${approvingItem.id}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        onUploadProgress: progress => setApprovalProgress(progress.total ? Math.min(100, Math.round(progress.loaded / progress.total * 100)) : 0),
      });
      toast.success(`Đã xác nhận giải ngân cho ${approvingItem.collaboratorName}`);
      void fetchPendingWork();
      setApprovingItem(null);
      fetchStats();
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.code === 'ECONNABORTED' || !err.response ? 'Chưa nhận được kết quả. Kiểm tra trạng thái lệnh trước khi xác nhận lại.' : err.response?.data?.message || 'Không thể duyệt yêu cầu');
    } finally {
      approvalInFlight.current = false;
      setSubmittingApproval(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem || !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setSubmittingReject(true);
    try {
      await api.patch(`/admin/payouts/${rejectingItem.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Đã từ chối và hoàn tiền về ví cho đối tác');
      void fetchPendingWork();
      setRejectingItem(null);
      setRejectReason('');
      fetchStats();
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể từ chối yêu cầu');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleViewBill = async (item: PayoutItem) => {
    try {
      const res = await api.get(`/admin/payouts/${item.id}/bill`);
      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setViewingBillUrl(url);
      } else {
        toast.error('Chưa có chứng từ đính kèm');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không lấy được chứng từ');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-12" id="admin-finance-payouts-page">
      {/* 2. Top Tabs */}
      <div className="finance-main-tabs">
        <button
          type="button"
          aria-pressed={activeTab === 'kol'}
          onClick={() => setActiveTab('kol')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'kol'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <span className="finance-tab-number">1</span>
          <span>Yêu cầu chi trả</span><FinanceWorkBadge count={pendingWork?.kol} label="yêu cầu KOL chờ duyệt" />
        </button>

        <button
          type="button"
          aria-pressed={activeTab === 'escrow'}
          onClick={() => setActiveTab('escrow')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'escrow'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <span className="finance-tab-number">2</span>
          <span>Bảo chứng Escrow · 14 ngày</span>
          <FinanceWorkBadge count={pendingWork?.escrow} label="khoản cần đối soát" />
        </button>
        <button type="button" aria-pressed={activeTab === 'customer'} onClick={() => setActiveTab('customer')} className="flex items-center gap-2 cursor-pointer"><span className="finance-tab-number">3</span><span>Rút tiền Customer</span><FinanceWorkBadge count={pendingWork?.customer} label="yêu cầu Customer chờ duyệt" /></button>
        <button type="button" aria-pressed={activeTab === 'operations'} onClick={() => setActiveTab('operations')} className="flex items-center gap-2 cursor-pointer">
          <span className="finance-tab-number">4</span><span>Thuế &amp; Đối soát</span>
        </button><button type="button" aria-pressed={activeTab === 'monthly'} onClick={() => { setRewardMonth(pendingWork?.monthly.months[0]); setActiveTab('monthly'); }} className="flex items-center gap-2"><span className="finance-tab-number">5</span><span>Thưởng tháng</span><FinanceWorkBadge count={pendingWork?.monthly.total} label="chính sách hoặc đề nghị thưởng chờ duyệt" /></button>
      </div>
      {workError && <div className="finance-work-notice" role="status"><span>Chưa cập nhật được số việc cần xử lý{pendingWork ? '; số đang hiện là lần kiểm tra gần nhất.' : '.'}</span><button type="button" onClick={() => void fetchPendingWork()}>Thử lại</button></div>}
      {!workError && pendingWork && activeTab === 'escrow' && pendingWork.escrow > 0 && <div className="finance-work-notice" role="status"><span>
        {(pendingWork.escrowWaitingExchange ?? 0) > 0 && <><strong>{pendingWork.escrowWaitingExchange} khoản đang chờ hoàn tất đổi hàng</strong>{pendingWork.escrow > (pendingWork.escrowWaitingExchange ?? 0) ? ' · ' : '. '}</>}
        {pendingWork.escrow > (pendingWork.escrowWaitingExchange ?? 0) && <><strong>{pendingWork.escrow - (pendingWork.escrowWaitingExchange ?? 0)} khoản cần xem xét</strong> · Đổi trả, tranh chấp hoặc thẩm định chưa hoàn tất.</>}
      </span></div>}
      {!workError && pendingWork && activeTab === 'customer' && pendingWork.customer > 0 && <div className="finance-work-notice" role="status"><span><strong>{pendingWork.customer} yêu cầu rút tiền Customer chờ duyệt.</strong></span></div>}
      {!workError && pendingWork && activeTab === 'monthly' && pendingWork.monthly.total > 0 && <div className="finance-work-notice" role="status"><span><strong>{pendingWork.monthly.total} việc chờ duyệt</strong> · {pendingWork.monthly.policies} chính sách · {pendingWork.monthly.grants} đề nghị thưởng</span><div>{pendingWork.monthly.months.map(month => <button type="button" key={month} aria-pressed={rewardMonth === month} onClick={() => setRewardMonth(month)}>Tháng {month.split('-').reverse().join('/')}</button>)}</div></div>}
      {activeTab === 'customer' && <AdminCustomerWithdrawals onChanged={fetchPendingWork}/>}
      {activeTab === 'monthly' && <MonthlyRewardsPanel key={rewardMonth || 'current'} initialMonth={rewardMonth} mode="operator" onChanged={fetchPendingWork}/>}

      {/* Tab 1: Chi trả hoa hồng KOL */}
      {activeTab === 'kol' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="finance-kpis grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ phê duyệt
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {formatMoney(stats?.pending.netAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                {stats?.pending.count ?? 0} yêu cầu chờ thẩm định
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đã giải ngân
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {formatMoney(stats?.approved.netAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                {stats?.approved.count ?? 0} khoản chi trả thực tế
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Thuế TNCN đã khấu trừ
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1A1612]">
                {formatMoney(stats?.approved.taxAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Lũy kế chi trả thực tế đã hoàn tất
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ đối soát
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
                {stats?.processingCount ?? 0}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Yêu cầu cần xác minh chứng từ
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="finance-filter bg-white border border-[#EAE4D7] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'PENDING', 'PROCESSING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                      : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : STATUS_BADGES[st]?.label || st}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm KOL, STK, mã lệnh..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8.5 pl-8 pr-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="finance-payout-table finance-ledger-table bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã / Thời gian gửi</th>
                    <th className="p-3.5">Nhà sáng tạo (KOL)</th>
                    <th className="p-3.5">Tài khoản thụ hưởng</th>
                    <th className="p-3.5 text-right">Số tiền chi trả</th>
                    <th className="p-3.5 text-center">Trạng thái</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-[#7D715E]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B88E4F] mb-2" />
                        <span>Đang tải danh sách chi trả...</span>
                      </td>
                    </tr>
                  ) : payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-[#7D715E]">
                        Không có yêu cầu chi trả nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((item) => {
                      const badge = STATUS_BADGES[item.status] || { label: item.status, className: '' };
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition">
                          <td className="p-3.5">
                            <div title={item.id} className="payout-request-code font-semibold text-[#1A1612]">
                              {payoutDisplayCode(item.id, item.createdAt)}
                              <button type="button" className="payout-copy" aria-label="Sao chép mã yêu cầu" onClick={() => { void navigator.clipboard.writeText(payoutDisplayCode(item.id, item.createdAt)).then(() => toast.success('Đã sao chép mã yêu cầu')).catch(() => toast.error('Không thể sao chép')); }}><Copy size={12}/></button>
                            </div>
                            <time dateTime={item.createdAt} title="Thời điểm KOL gửi yêu cầu · Giờ Việt Nam" className="mt-1 block text-[11px] tabular-nums text-[#7D715E]">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                              {' · '}
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </td>

                          <td className="p-3.5">
                            <div className="payout-person-heading"><span className="payout-avatar">{item.collaboratorName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('')}{item.collaboratorAvatar && <img src={item.collaboratorAvatar} alt="" onError={event => { event.currentTarget.hidden = true; }}/>}</span><button type="button" className="payout-person-name" onClick={() => setRiskItem(item)} title="Xem hồ sơ KOL"><strong>{item.collaboratorName}</strong></button></div>
                            <div className="payout-person-tools">
                            {item.monthlyWithdrawalSummary && <button type="button" className="payout-month-total" onClick={() => setMonthlyItem(item)} title={`Tháng ${item.monthlyWithdrawalSummary.month.split('-').reverse().join('/')}`} aria-label={`Xem tổng yêu cầu rút tháng ${item.monthlyWithdrawalSummary.month} của ${item.collaboratorName}`}><span>Tháng {item.monthlyWithdrawalSummary.month.split('-').reverse().join('/')}:</span><strong>{formatMoney(item.monthlyWithdrawalSummary.totalGross)}</strong><span aria-hidden="true">↗</span></button>}
                            {item.risk ? <button type="button" onClick={() => setRiskItem(item)} className="payout-risk-trigger" aria-label={`Xem kiểm tra rủi ro của ${item.collaboratorName}`}>
                              <span className={item.risk.status === 'BLOCKED' ? 'font-semibold text-[#DC2626]' : 'font-semibold text-[#8F682E]'}>
                                {item.risk.passedChecks === item.risk.totalChecks ? '✓ Đủ điều kiện' : '⚠ Cần bổ sung'} · {item.risk.passedChecks}/{item.risk.totalChecks}
                              </span><span aria-hidden="true"> ›</span>
                            </button> : <span>Chưa có kết quả kiểm tra</span>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <PayoutBankAccount copyable bankName={item.bankName} accountNumber={item.bankAccountNumber} accountName={item.bankAccountName}/>
                          </td>

                          <td className="p-3.5">
                            <div className="payout-money-cell"><strong title={item.status === 'REJECTED' ? 'Số tiền yêu cầu' : item.status === 'APPROVED' ? 'Thực nhận đã ghi nhận' : 'Thực nhận dự kiến'}>{formatMoney(item.status === 'REJECTED' ? item.amount : item.netAmount)}</strong>{item.status === 'REJECTED' ? <span className="payout-refund-note">{Number(item.refundedAmount) > 0 ? `Đã hoàn về ví ${formatMoney(item.refundedAmount!)}` : 'Chưa xác nhận bút toán hoàn'}</span> : <button type="button" className="payout-money-breakdown" onClick={() => setDetailItem(item)} title={payoutTaxLabel(item.amount, item.taxContext)}><span>Yêu cầu</span><span>{formatMoney(item.amount)}</span><span>{payoutTableTaxLabel(item.amount, item.taxAmount, item.taxContext)}</span><span>{formatMoney(item.taxAmount)}</span></button>}</div>
                          </td>

                          <td className="p-3.5 text-center">
                            {item.status === 'APPROVED' ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1.5 text-xs font-semibold text-[#715126]">
                                  <CheckCircle2 size={14} className="shrink-0 text-[#059669]" aria-hidden="true" />
                                  {(item.transferProvider === 'BIDV_SANDBOX' || item.bankRefCode?.startsWith('SBX-')) ? 'Hoàn tất thử nghiệm' : 'Hoàn tất'}
                                </span>

                              </div>
                            ) : <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>{badge.label}</span>}

                            {item.bankRefCode && <button
                              type="button"
                              title={`Sao chép mã giao dịch: ${item.bankRefCode}`}
                              aria-label={`Sao chép mã tham chiếu ${item.bankRefCode}`}
                              onClick={async () => {
                                try { await navigator.clipboard.writeText(item.bankRefCode!); toast.success('Đã sao chép mã tham chiếu'); }
                                catch { toast.error('Không thể sao chép mã tham chiếu'); }
                              }}
                              className="mx-auto mt-2 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-[10px] text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#715126] focus-visible:outline-2 focus-visible:outline-[#C59B58]"
                            ><span className="min-w-0 truncate font-mono">{item.bankRefCode.length > 16 ? `${item.bankRefCode.slice(0, 8)}…${item.bankRefCode.slice(-4)}` : item.bankRefCode}</span><Copy size={12} className="shrink-0" aria-hidden="true" /></button>}
                          </td>

                          <td className="p-3.5 text-center">
                            {item.status === 'PENDING' || item.status === 'PROCESSING' ? (
                              <div className="payout-actions flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={submittingApproval}
                                  onClick={() => setApprovingItem(item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[11px] font-bold transition cursor-pointer"
                                  title="Xác nhận chuyển khoản bằng chứng từ"
                                >
                                  {item.status === 'PROCESSING' ? 'Đối soát' : 'Duyệt'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setRejectingItem(item); setRejectReason(''); }}
                                  className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition cursor-pointer"
                                  title="Từ chối yêu cầu"
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : <button type="button" onClick={() => setDetailItem(item)} className="payout-detail-link" title="Xem thông tin xử lý yêu cầu">{item.status === 'REJECTED' ? 'Xem lý do' : 'Xem bảng kê'}</button>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bảo chứng Tạm giữ Escrow */}

      {activeTab === 'escrow' && <EscrowFinanceReport onChanged={fetchPendingWork} />}
      {activeTab === 'kol' && <div className="finance-pagination flex flex-wrap justify-between gap-3 items-center text-sm text-[#7D715E]">
        {loadError && <p role="alert" className="text-[#DC2626]">{loadError}</p>}
        <span>{total} yêu cầu</span><div className="flex gap-3 items-center"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page}</span><button disabled={page * 12 >= total || loading} onClick={() => setPage(page + 1)}>Sau</button></div>
      </div>}
      {activeTab === 'operations' && <FinanceOperations />}
      {/* Modal: Duyệt chi trả & Tải UNC */}
      {approvingItem && <PayoutApprovalDialog
        key={approvingItem.id}
        item={approvingItem}
        busy={submittingApproval}
        uploadProgress={approvalProgress}
        onClose={() => setApprovingItem(null)}
        onViewIssue={code => { setRiskFocusCode(code); setRiskItem(approvingItem); }}
        onManualApprove={handleApproveSubmit}
      />}
      {riskItem && <PayoutEvidenceDialog id={riskItem.id} focusCode={approvingItem?.id === riskItem.id ? riskFocusCode : undefined} onClose={() => { setRiskItem(null); setRiskFocusCode(undefined); }} onReject={reason => { setRejectingItem(riskItem); setRejectReason(reason); setRiskItem(null); setApprovingItem(null); setRiskFocusCode(undefined); }}/>}

      {/* Modal: Từ chối yêu cầu */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" aria-label="Từ chối yêu cầu chi trả" className="payout-rejection-dialog relative bg-white border border-[#EAE4D7] rounded-2xl w-full shadow-xl animate-in zoom-in-95">
            <button type="button" aria-label="Đóng cửa sổ từ chối" title="Đóng" disabled={submittingReject} onClick={() => { setRejectingItem(null); setRejectReason(''); }} className="absolute right-5 top-5 inline-flex !size-9 !min-h-9 items-center justify-center !rounded-lg !p-2 text-[#7D715E] hover:bg-[#FBF5EB] disabled:opacity-50"><X size={20}/></button>
            <h3 className="mb-2 pr-10 text-sm font-bold text-[#1A1612]">Từ chối Yêu cầu Chi trả</h3>
            <p className="text-xs text-[#7D715E] mb-3">
              Số tiền <strong className="text-[#1A1612]">{formatMoney(rejectingItem.amount)}</strong> sẽ được hoàn lại vào ví khả dụng của đối tác.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div className="flex flex-wrap gap-2">{['KYC chưa được xác minh', 'Thông tin ngân hàng không khớp hồ sơ KYC', 'Chưa khai báo mã số thuế', 'Ví cần đối soát bởi bộ phận vận hành', 'Thiếu bút toán giữ tiền; kế toán kiểm tra', 'Số tiền hoặc thuế cần đối soát'].map(reason => <button type="button" key={reason} disabled={submittingReject} aria-pressed={hasRejectionReason(rejectReason, reason)} className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${hasRejectionReason(rejectReason, reason) ? 'border-[#D7BD94] bg-[#FBF5EB] text-[#715126]' : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'}`} onClick={() => setRejectReason(current => toggleRejectionReason(current, reason))}>{reason}</button>)}</div>
              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  placeholder="VD: Sai thông tin số tài khoản hoặc vi phạm quy chế tiếp thị..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingReject ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {monthlyItem?.monthlyWithdrawalSummary && <Modal isOpen title="Tổng yêu cầu rút trong tháng" onClose={() => setMonthlyItem(null)} maxWidth="xl" stickyHeader>
        <div className="payout-month-overview">
          <div className="payout-month-heading"><div><strong>{monthlyItem.collaboratorName}</strong><span>Tháng {monthlyItem.monthlyWithdrawalSummary.month.split('-').reverse().join('/')}</span></div><strong>{formatMoney(monthlyItem.monthlyWithdrawalSummary.totalGross)}</strong></div>
          <dl>{[
            ['Chờ duyệt', monthlyItem.monthlyWithdrawalSummary.pendingGross],
            ['Đang xử lý', monthlyItem.monthlyWithdrawalSummary.processingGross],
            ['Đã hoàn tất', monthlyItem.monthlyWithdrawalSummary.approvedGross],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(value)}</dd></div>)}</dl>
          <p>{monthlyItem.monthlyWithdrawalSummary.count} yêu cầu · Tiền gốc trước thuế · Toàn bộ cửa hàng</p>
          {monthlyItem.taxContext?.policy === 'MONTHLY_PROGRESSIVE_V1' && <div className="payout-month-tax"><span>Tổng trước lệnh này tại lúc tính thuế</span><strong>{formatMoney(monthlyItem.taxContext.monthlyGrossBefore)}</strong><span>{payoutTaxLabel(monthlyItem.amount, monthlyItem.taxContext)}</span><strong>{formatMoney(monthlyItem.taxAmount)}</strong></div>}
        </div>
      </Modal>}
      {detailItem && <Modal isOpen title="Chi tiết chi trả" subtitle={payoutDisplayCode(detailItem.id, detailItem.createdAt)} onClose={() => setDetailItem(null)} maxWidth="xl" stickyHeader>
        <div className="grid gap-4 text-sm">
          <div className="flex items-start justify-between gap-4"><div><strong>{detailItem.collaboratorName}</strong><p className="mb-0 mt-1 text-xs text-[#7D715E]">{new Date(detailItem.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></div><span className="text-xs text-[#7D715E]">{detailItem.status === 'APPROVED' ? ((detailItem.transferProvider === 'BIDV_SANDBOX' || detailItem.bankRefCode?.startsWith('SBX-')) ? 'Hoàn tất thử nghiệm' : 'Hoàn tất') : STATUS_BADGES[detailItem.status]?.label}</span></div>
          <PayoutBankAccount bankName={detailItem.bankName} accountNumber={detailItem.bankAccountNumber} accountName={detailItem.bankAccountName}/>
          <dl className="m-0 grid gap-3 rounded-xl border border-[#EAE4D7] bg-[#FDFCF9] p-4">{[['Yêu cầu', formatMoney(detailItem.amount)], [payoutTaxLabel(detailItem.amount, detailItem.taxContext), formatMoney(detailItem.taxAmount)], [detailItem.status === 'REJECTED' ? 'Đã hoàn về ví' : 'Thực nhận', detailItem.status === 'REJECTED' ? (Number(detailItem.refundedAmount) > 0 ? formatMoney(detailItem.refundedAmount!) : 'Chưa xác nhận bút toán hoàn') : formatMoney(detailItem.netAmount)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-[#7D715E]">{label}</dt><dd className="m-0 font-semibold tabular-nums">{value}</dd></div>)}</dl>
          {detailItem.status === 'REJECTED' && <div className="rounded-xl border border-red-100 p-3"><span className="text-xs text-red-600">Lý do từ chối</span><p className="mb-0 mt-1 whitespace-pre-line">{detailItem.rejectedReason || 'Lệnh cũ chưa lưu lý do chi tiết.'}</p></div>}
          {detailItem.bankRefCode && <p className="m-0 break-all text-xs text-[#7D715E]">Mã giao dịch: {detailItem.bankRefCode}</p>}
          <div className="flex flex-wrap gap-2">{detailItem.monthlyWithdrawalSummary && <button className="rounded-lg border border-[#EAE4D7] px-3 py-2 text-xs" onClick={() => { setMonthlyItem(detailItem); setDetailItem(null); }}>Tổng tháng / Cách tính thuế</button>}<button className="rounded-lg border border-[#EAE4D7] px-3 py-2 text-xs" onClick={() => { setRiskItem(detailItem); setDetailItem(null); }}>Kiểm tra hồ sơ</button>{detailItem.hasBill && <button className="inline-flex items-center gap-1 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs" onClick={() => { void handleViewBill(detailItem); setDetailItem(null); }}><Eye size={13}/>Xem chứng từ</button>}</div>
        </div>
      </Modal>}
      {/* Modal: Xem ảnh UNC */}
      {viewingBillUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D7] mb-3">
              <span className="text-xs font-bold text-[#1A1612]">Chứng từ Ủy nhiệm chi Sàn</span>
              <button
                type="button"
                onClick={() => setViewingBillUrl(null)}
                className="text-[#7D715E] hover:text-[#1A1612] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-[#FAF8F5] rounded-xl p-2">
              <img src={viewingBillUrl} alt="Ủy nhiệm chi" className="max-w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
