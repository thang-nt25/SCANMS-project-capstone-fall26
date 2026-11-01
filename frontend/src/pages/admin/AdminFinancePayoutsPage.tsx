import { EscrowFinanceReport } from '../../components/wallet/FinanceReports';
import { FinanceOperations } from '../../components/wallet/FinanceOperations';
import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { payoutDisplayCode } from '../../utils/payout-display-code';
import './AdminFinancePayoutsPage.css';

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
  netAmount: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankRefCode?: string | null;
  hasBill: boolean;
  rejectedReason?: string | null;
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

const formatMoney = (val: string | number) =>
  `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Chờ chuyển khoản', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Đã giải ngân', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function AdminFinancePayoutsPage() {
  const [activeTab, setActiveTab] = useState<'kol' | 'escrow' | 'operations'>('kol');
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState('Đang kiểm tra cấu hình cổng chi trả…');

  // Approval modal state
  const [approvingItem, setApprovingItem] = useState<PayoutItem | null>(null);
  const [riskItem, setRiskItem] = useState<PayoutItem | null>(null);
  const [approvalTab, setApprovalTab] = useState<'information' | 'documents'>('information');
  useEffect(() => { setApprovalTab('information'); }, [approvingItem?.id]);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [bankRefCode, setBankRefCode] = useState('');
  const [note, setNote] = useState('');
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

  useEffect(() => {
    api.get('/admin/payouts/gateway').then((res: any) => {
      const gateway = res.data?.data ?? res.data ?? res;
      setGatewayEnabled(Boolean(gateway.configured));
      setGatewayMessage(gateway.message || (gateway.configured ? 'Đã có cấu hình cổng chi trả; cần kiểm chứng kết nối ngân hàng.' : 'Chưa cấu hình cổng chi trả ngân hàng. Xác nhận UNC không tự chuyển tiền.'));
    }).catch(() => { setGatewayEnabled(false); setGatewayMessage('Chưa kiểm tra được cổng chi trả. Không thể xác nhận kết nối ngân hàng.'); });
  }, []);

  const handleBankTransfer = async () => {
    if (!approvingItem || submittingApproval) return;
    setSubmittingApproval(true);
    try {
      const action = approvingItem.status === 'PROCESSING' ? 'reconcile' : 'approve';
      const response: any = await api.post(`/payouts/${approvingItem.id}/${action}`, {}, { timeout: 25000 });
      const result = response.data ?? response;
      if (result.status === 'APPROVED') toast.success('Ngân hàng xác nhận chuyển khoản thành công');
      else toast.info('Ngân hàng đang xử lý. Tiền tiếp tục được giữ để đối soát.');
      setApprovingItem(null); fetchStats(); fetchPayouts();
    } catch (error: any) { toast.error(error.message || 'Cần đối soát trạng thái ngân hàng'); fetchPayouts(); }
    finally { setSubmittingApproval(false); }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingItem || !billFile) {
      toast.error('Vui lòng đính kèm chứng từ ủy nhiệm chi (ảnh hoặc PDF)');
      return;
    }
    setSubmittingApproval(true);
    try {
      const formData = new FormData();
      formData.append('bill', billFile);
      if (bankRefCode.trim()) formData.append('bankRefCode', bankRefCode.trim());
      if (note.trim()) formData.append('note', note.trim());

      await api.patch(`/admin/payouts/${approvingItem.id}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Đã xác nhận giải ngân cho ${approvingItem.collaboratorName}`);
      setApprovingItem(null);
      setBillFile(null);
      setBankRefCode('');
      setNote('');
      fetchStats();
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể duyệt yêu cầu');
    } finally {
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
          <span>Yêu cầu chi trả</span><span className="finance-tab-count">{stats?.pending.count ?? 0}</span>
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
          <span>Bảo chứng Escrow · 7 ngày</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'operations'} onClick={() => setActiveTab('operations')} className="flex items-center gap-2 cursor-pointer">
          <span className="finance-tab-number">3</span><span>Thuế &amp; Đối soát</span>
        </button>
      </div>

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
                {stats?.approved.count ?? 0} lệnh chuyển thành công
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Thuế TNCN đã khấu trừ (10%)
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1A1612]">
                {formatMoney(stats?.approved.taxAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Lũy kế thuế TNCN khấu trừ 10%
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ chuyển khoản Napas
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
                {stats?.processingCount ?? 0}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Lệnh chi Napas 24/7 đang xử lý
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
          <p role="status" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">{gatewayMessage}</p>
          <div className="finance-payout-table bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã / Ngày</th>
                    <th className="p-3.5">Nhà Sáng Tạo (KOL)</th>
                    <th className="p-3.5">Tài Khoản Thụ Hưởng</th>
                    <th className="p-3.5">Số tiền chi trả</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                    <th className="p-3.5 text-center">Thao Tác</th>
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
                            <div title={item.id} className="font-mono text-[11px] font-bold text-[#1A1612]">
                              {payoutDisplayCode(item.id, item.createdAt)}
                            </div>
                            <div className="text-[10px] text-[#7D715E]">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-[#1A1612]">{item.collaboratorName}</div>
                            <div className="text-[10px] text-[#7D715E]">{item.collaboratorPhone || item.collaboratorEmail}</div>
                            {item.collaboratorTaxCode && (
                              <div className="text-[10px] text-[#B88E4F]">MST: {item.collaboratorTaxCode}</div>
                            )}
                            {item.risk ? <button type="button" onClick={() => setRiskItem(item)} className="payout-risk-trigger" aria-label={`Xem kiểm tra rủi ro của ${item.collaboratorName}`}>
                              <span className={item.risk.status === 'BLOCKED' ? 'font-semibold text-[#DC2626]' : 'font-semibold text-[#8F682E]'}>
                                {item.risk.status === 'BLOCKED' ? 'Cần xử lý' : item.risk.status === 'REVIEW' ? 'Cần bổ sung hồ sơ' : 'Đạt kiểm tra'} · {item.risk.passedChecks}/{item.risk.totalChecks}
                              </span><span aria-hidden="true"> ›</span>
                            </button> : <span>Chưa có kết quả kiểm tra</span>}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-[#1A1612]">{item.bankName}</div>
                            <div className="font-mono font-bold text-[#B88E4F]">{item.bankAccountNumber}</div>
                            <div className="text-[10px] text-[#7D715E] uppercase">{item.bankAccountName}</div>
                          </td>

                          <td className="p-3.5">
                            <dl className="payout-amounts">
                              <div><dt>Yêu cầu</dt><dd>{formatMoney(item.amount)}</dd></div>
                              <div><dt>Thuế khấu trừ</dt><dd>{formatMoney(item.taxAmount)}</dd></div>
                              <div><dt>Thực chuyển</dt><dd>{formatMoney(item.netAmount)}</dd></div>
                            </dl>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {item.status === 'PENDING' || item.status === 'PROCESSING' ? (
                              <div className="payout-actions flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setApprovingItem(item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[11px] font-bold transition cursor-pointer"
                                  title="Duyệt chi trả & tải ủy nhiệm chi"
                                >
                                  Duyệt & Tải UNC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingItem(item)}
                                  className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition cursor-pointer"
                                  title="Từ chối yêu cầu"
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : item.hasBill ? (
                              <button
                                type="button"
                                onClick={() => handleViewBill(item)}
                                className="px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#1A1612] inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-[#B88E4F]" />
                                <span>Xem UNC</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#7D715E] italic">Hoàn tất</span>
                            )}
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
      
      {activeTab === 'escrow' && <EscrowFinanceReport />}
      {activeTab === 'kol' && <div className="finance-pagination flex flex-wrap justify-between gap-3 items-center text-sm text-[#7D715E]">
        {loadError && <p role="alert" className="text-[#DC2626]">{loadError}</p>}
        <span>{total} yêu cầu</span><div className="flex gap-3 items-center"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page}</span><button disabled={page * 12 >= total || loading} onClick={() => setPage(page + 1)}>Sau</button></div>
      </div>}
      {activeTab === 'operations' && <FinanceOperations />}
      {/* Modal: Duyệt chi trả & Tải UNC */}
      {riskItem?.risk && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setRiskItem(null)}>
        <section role="dialog" aria-modal="true" aria-label="Chi tiết kiểm tra rủi ro" className="w-full max-w-lg rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') setRiskItem(null); }}>
          <div className="flex items-start justify-between gap-4 border-b border-[#EAE4D7] pb-3">
            <div><h3 className="font-semibold text-[#1A1612]">Kiểm tra điều kiện chi trả</h3><p className="mt-1 text-xs text-[#7D715E]">{riskItem.collaboratorName} · {riskItem.risk.passedChecks}/{riskItem.risk.totalChecks} điều kiện đạt</p></div>
            <button autoFocus type="button" onClick={() => setRiskItem(null)} className="rounded-lg border border-[#EAE4D7] px-3 py-1.5 text-xs">Đóng</button>
          </div>
          <ul className="my-4 grid gap-2">{riskItem.risk.checks.map(check => <li key={check.code} className="flex items-start gap-3 rounded-lg bg-[#FAF8F5] px-3 py-2 text-sm"><span className={check.passed ? 'text-[#8F682E]' : 'text-[#DC2626]'} aria-label={check.passed ? 'Đạt' : 'Chưa đạt'}>{check.passed ? '✓' : '!'}</span><span>{check.label}</span></li>)}</ul>
          <p className="border-t border-[#EAE4D7] pt-3 text-xs leading-relaxed text-[#7D715E]">{riskItem.risk.disclaimer}</p>
        </section>
      </div>}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" aria-label="Xác nhận chi trả" className="payout-approval-dialog bg-white border border-[#EAE4D7] rounded-2xl w-full shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7] mb-3">
              <h3 className="text-sm font-bold text-[#1A1612]">Xác nhận chi trả & chứng từ ngân hàng</h3>
              <button
                type="button"
                onClick={() => setApprovingItem(null)}
                aria-label="Đóng hộp xác nhận"
                className="text-[#7D715E] hover:text-[#1A1612] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="payout-approval-tabs" role="tablist" aria-label="Các bước xác nhận chi trả">
              <button type="button" role="tab" aria-selected={approvalTab === 'information'} onClick={() => setApprovalTab('information')}><span>1</span>Thông tin chi trả</button>
              <button type="button" role="tab" aria-selected={approvalTab === 'documents'} onClick={() => setApprovalTab('documents')}><span>2</span>Chứng từ ngân hàng</button>
            </div>
            <form onSubmit={event => { if (approvalTab === 'information') { event.preventDefault(); setApprovalTab('documents'); } else { void handleApproveSubmit(event); } }} className="space-y-3">
              <div hidden={approvalTab !== 'information'} className="payout-approval-panel">
              <p className="text-xs text-[#7D715E]">{gatewayMessage}</p>
              {gatewayEnabled && <button type="button" onClick={() => void handleBankTransfer()} disabled={submittingApproval || (approvingItem.status === 'PENDING' && approvingItem.risk?.status === 'BLOCKED')} className="w-full rounded-xl bg-[#C59B58] p-3 text-white disabled:opacity-50">{approvingItem.status === 'PROCESSING' ? 'Đối soát kết quả ngân hàng' : 'Duyệt chuyển khoản qua ngân hàng'}</button>}
              <div className="payout-recipient p-3 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Đối tác:</span>
                  <span className="font-bold text-[#1A1612]">{approvingItem.collaboratorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Ngân hàng:</span>
                  <span className="font-semibold text-[#1A1612]">{approvingItem.bankName}</span>
                </div>
                <div><span className="text-[#7D715E]">Số tài khoản:</span><span className="font-semibold">{approvingItem.bankAccountNumber}</span></div>
                <div><span className="text-[#7D715E]">Chủ tài khoản:</span><span className="font-semibold">{approvingItem.bankAccountName}</span></div>
                <div className="flex justify-between pt-1 border-t border-[#EEDFC6]">
                  <span className="text-[#7D715E]">Số tiền thực chuyển:</span>
                  <span className="text-sm font-black text-[#B88E4F]">{formatMoney(approvingItem.netAmount)}</span>
                </div>
              </div>
              </div>
              <fieldset hidden={approvalTab !== 'documents'} disabled={approvalTab !== 'documents'} className="payout-approval-panel">
              <div>
                <label htmlFor="payout-bank-document" className="block text-[11px] font-bold text-[#7D715E] mb-1">Chứng từ chuyển khoản (UNC / biên nhận) *</label>
                <div className="payout-document-upload">
                  <label htmlFor="payout-bank-document" className="payout-document-picker">Chọn tệp</label>
                  <span>{billFile?.name || 'Chưa chọn chứng từ'}</span>
                <input
                  id="payout-bank-document"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  required
                  onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Mã tham chiếu ngân hàng (FT / Ref Code)
                </label>
                <input
                  type="text"
                  placeholder="VD: FT26298103984"
                  required
                  maxLength={100}
                  value={bankRefCode}
                  onChange={(e) => setBankRefCode(e.target.value)}
                  className="w-full h-9 px-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Ghi chú nội bộ
                </label>
                <input
                  type="text"
                  placeholder="VD: Đã chuyển khoản qua Napas247"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-9 px-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F]"
                />
              </div>

              </fieldset>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                {approvalTab === 'information' ? <button type="button" onClick={() => setApprovalTab('documents')} className="payout-continue">Tiếp tục →</button> : <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>}
                <button
                  type="submit"
                  hidden={approvalTab !== 'documents'}
                  disabled={submittingApproval}
                  className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingApproval ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Xác nhận giải ngân</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Từ chối yêu cầu */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" aria-label="Từ chối yêu cầu chi trả" className="payout-rejection-dialog bg-white border border-[#EAE4D7] rounded-2xl w-full shadow-xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-[#1A1612] mb-2">Từ chối Yêu cầu Chi trả</h3>
            <p className="text-xs text-[#7D715E] mb-3">
              Số tiền <strong className="text-[#1A1612]">{formatMoney(rejectingItem.amount)}</strong> sẽ được hoàn lại vào ví khả dụng của đối tác.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Lý do từ chối *
                </label>
                <textarea
                  required
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
