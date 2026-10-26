import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building2,
  ReceiptText,
  Landmark,
  Eye,
  Loader2,
  Upload,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

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
  const [activeTab, setActiveTab] = useState<'kol' | 'merchant' | 'escrow'>('kol');
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Approval modal state
  const [approvingItem, setApprovingItem] = useState<PayoutItem | null>(null);
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
  const [loadingBill, setLoadingBill] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/payouts/stats');
      setStats(res.data?.data || res.data);
    } catch {
      // Fallback
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
    } catch {
      // If endpoint not returned, fallback
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchStats();
    fetchPayouts();
  }, [fetchStats, fetchPayouts]);

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
    setLoadingBill(true);
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
    } finally {
      setLoadingBill(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-12" id="admin-finance-payouts-page">
      {/* 1. Header */}
      <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1612]">Quản trị Chi trả & Dòng tiền Sàn</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                <ShieldCheck className="w-3 h-3" />
                Trung tâm quyết toán Escrow
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { fetchStats(); fetchPayouts(); }}
            className="px-3.5 py-2 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1612] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#7D715E] ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Top Tabs */}
      <div className="flex border-b border-[#EAE4D7] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('kol')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'kol'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Chi trả hoa hồng KOL ({stats?.pending.count ?? 0} chờ duyệt)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('merchant')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'merchant'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Chi trả doanh thu Shop</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('escrow')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'escrow'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Ký quỹ & Thu phí Sàn</span>
        </button>
      </div>

      {/* Tab 1: Chi trả hoa hồng KOL */}
      {activeTab === 'kol' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ phê duyệt
              </div>
              <div className="text-xl font-black text-amber-700">
                {formatMoney(stats?.pending.netAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                {stats?.pending.count ?? 0} yêu cầu cần xử lý
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đã giải ngân
              </div>
              <div className="text-xl font-black text-emerald-700">
                {formatMoney(stats?.approved.netAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                {stats?.approved.count ?? 0} yêu cầu thành công
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Thuế TNCN đã giữ (10%)
              </div>
              <div className="text-xl font-black text-[#1A1612]">
                {formatMoney(stats?.approved.taxAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Nộp Kho bạc Nhà nước
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ chuyển khoản
              </div>
              <div className="text-xl font-black text-blue-700">
                {stats?.processingCount ?? 0}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">
                Lô VietQR đã xuất
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-[#EAE4D7] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'PENDING', 'PROCESSING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-[#231D15] text-white border-[#231D15]'
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
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã / Ngày</th>
                    <th className="p-3.5">Nhà Sáng Tạo (KOL)</th>
                    <th className="p-3.5">Tài Khoản Thụ Hưởng</th>
                    <th className="p-3.5 text-right">Rút Gộp (Gross)</th>
                    <th className="p-3.5 text-right">Thuế (10%)</th>
                    <th className="p-3.5 text-right font-black text-[#1A1612]">Thực Chuyển (Net)</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                    <th className="p-3.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-[#7D715E]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B88E4F] mb-2" />
                        <span>Đang tải danh sách chi trả...</span>
                      </td>
                    </tr>
                  ) : payouts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-[#7D715E]">
                        Không có yêu cầu chi trả nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((item) => {
                      const badge = STATUS_BADGES[item.status] || { label: item.status, className: '' };
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition">
                          <td className="p-3.5">
                            <div className="font-mono text-[11px] font-bold text-[#1A1612]">
                              {item.id.slice(0, 8)}...
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
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-[#1A1612]">{item.bankName}</div>
                            <div className="font-mono font-bold text-[#B88E4F]">{item.bankAccountNumber}</div>
                            <div className="text-[10px] text-[#7D715E] uppercase">{item.bankAccountName}</div>
                          </td>

                          <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                            {formatMoney(item.amount)}
                          </td>

                          <td className="p-3.5 text-right font-mono text-xs text-rose-600">
                            {Number(item.taxAmount) > 0 ? `-${formatMoney(item.taxAmount)}` : '0 ₫'}
                          </td>

                          <td className="p-3.5 text-right font-mono text-sm font-black text-[#1A1612]">
                            {formatMoney(item.netAmount)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {item.status === 'PENDING' || item.status === 'PROCESSING' ? (
                              <div className="flex items-center justify-center gap-1.5">
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

      {/* Tab 2: Chi trả doanh thu Shop */}
      {activeTab === 'merchant' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Chờ phê duyệt giải ngân
              </div>
              <div className="text-xl font-black text-amber-700">
                12.500.000 ₫
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">1 yêu cầu rút doanh thu</div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đã giải ngân cho gian hàng
              </div>
              <div className="text-xl font-black text-emerald-700">
                28.400.000 ₫
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">1 lệnh hoàn tất đối soát</div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Phí rút doanh thu
              </div>
              <div className="text-xl font-black text-[#1A1612]">
                0 ₫
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">Sàn miễn phí giao dịch Napas247</div>
            </div>
          </div>

          <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã Lệnh / Ngày</th>
                    <th className="p-3.5">Gian Hàng</th>
                    <th className="p-3.5">Tài Khoản Thụ Hưởng</th>
                    <th className="p-3.5 text-right">Doanh Thu Rút</th>
                    <th className="p-3.5 text-right">Phí Xử Lý</th>
                    <th className="p-3.5 text-right font-black text-[#1A1612]">Thực Chuyển</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                    <th className="p-3.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  <tr className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-3.5">
                      <div className="font-mono text-[11px] font-bold text-[#1A1612]">WD-ST-99810</div>
                      <div className="text-[10px] text-[#7D715E]">25/10/2026</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#1A1612]">Sora Skin Official</div>
                      <div className="text-[10px] text-[#7D715E]">Mã Shop: SHP-SORA-01</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#1A1612]">MBBank</div>
                      <div className="font-mono font-bold text-[#B88E4F]">0988776655</div>
                      <div className="text-[10px] text-[#7D715E] uppercase">CONG TY TNHH SORA SKIN</div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                      12.500.000 ₫
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                      0 ₫
                    </td>
                    <td className="p-3.5 text-right font-mono text-sm font-black text-[#1A1612]">
                      12.500.000 ₫
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                        Chờ duyệt
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toast.success('Đã xác nhận giải ngân doanh thu cho Sora Skin Official')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          Duyệt & Tải UNC
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info('Đã từ chối yêu cầu rút')}
                          className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-3.5">
                      <div className="font-mono text-[11px] font-bold text-[#1A1612]">WD-ST-99750</div>
                      <div className="text-[10px] text-[#7D715E]">24/10/2026</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#1A1612]">Aura Bio Cosmetics</div>
                      <div className="text-[10px] text-[#7D715E]">Mã Shop: SHP-AURA-02</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#1A1612]">Vietcombank</div>
                      <div className="font-mono font-bold text-[#B88E4F]">0071001234567</div>
                      <div className="text-[10px] text-[#7D715E] uppercase">CTY CP AURA VIET NAM</div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                      28.400.000 ₫
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                      0 ₫
                    </td>
                    <td className="p-3.5 text-right font-mono text-sm font-black text-[#1A1612]">
                      28.400.000 ₫
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Đã giải ngân
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="text-[11px] text-[#7D715E] italic">Hoàn tất</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Ký quỹ & Thu phí Sàn */}
      {activeTab === 'escrow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-[#EAE4D7] bg-white shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Tài khoản Ký quỹ Escrow (Ngân hàng)
              </div>
              <div className="text-xl font-black text-[#1A1612]">
                {formatMoney('158400000')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">Tiền khách thanh toán đang giữ an toàn</div>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAE4D7] bg-white shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Doanh thu Phí Sàn Tích Lũy (3%)
              </div>
              <div className="text-xl font-black text-emerald-700">
                {formatMoney('14250000')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">Lợi nhuận gộp dịch vụ sàn TMĐT</div>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAE4D7] bg-white shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Thuế TNCN Đã Tạm Giữ
              </div>
              <div className="text-xl font-black text-[#B88E4F]">
                {formatMoney(stats?.approved.taxAmount || '0')}
              </div>
              <div className="text-[11px] text-[#7D715E] mt-1">Chuẩn bị nộp quyết toán thuế quý</div>
            </div>
          </div>

          <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                Đơn hàng đang ký quỹ bảo vệ 14 ngày
              </h2>
              <span className="text-[11px] text-[#7D715E]">Tự động tất toán sau khi hết hạn đổi trả</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã Đơn</th>
                    <th className="p-3.5">Gian Hàng</th>
                    <th className="p-3.5 text-right">Tổng Tiền Đơn</th>
                    <th className="p-3.5 text-right">Hoa Hồng KOL</th>
                    <th className="p-3.5 text-right">Phí Sàn (3%)</th>
                    <th className="p-3.5 text-right font-black text-[#1A1612]">Tiền Chuyển Shop</th>
                    <th className="p-3.5 text-center">Hạn Tạm Giữ</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  <tr className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#1A1612]">#SCN-99824</td>
                    <td className="p-3.5 font-medium text-[#1A1612]">Sora Skin Official</td>
                    <td className="p-3.5 text-right font-mono text-[#7D715E]">1.450.000 ₫</td>
                    <td className="p-3.5 text-right font-mono text-[#B88E4F]">-188.500 ₫</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">-43.500 ₫</td>
                    <td className="p-3.5 text-right font-mono font-black text-[#1A1612]">1.218.000 ₫</td>
                    <td className="p-3.5 text-center font-mono text-[11px] text-[#7D715E]">07/11/2026</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Tạm giữ 14 ngày
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#1A1612]">#SCN-99821</td>
                    <td className="p-3.5 font-medium text-[#1A1612]">Sora Skin Official</td>
                    <td className="p-3.5 text-right font-mono text-[#7D715E]">580.000 ₫</td>
                    <td className="p-3.5 text-right font-mono text-[#B88E4F]">-58.000 ₫</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">-17.400 ₫</td>
                    <td className="p-3.5 text-right font-mono font-black text-[#1A1612]">504.600 ₫</td>
                    <td className="p-3.5 text-center font-mono text-[11px] text-[#7D715E]">08/11/2026</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Tạm giữ 14 ngày
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#FAF8F5]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#1A1612]">#SCN-99781</td>
                    <td className="p-3.5 font-medium text-[#1A1612]">Aura Bio Cosmetics</td>
                    <td className="p-3.5 text-right font-mono text-[#7D715E]">2.200.000 ₫</td>
                    <td className="p-3.5 text-right font-mono text-[#B88E4F]">-264.000 ₫</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">-66.000 ₫</td>
                    <td className="p-3.5 text-right font-mono font-black text-[#1A1612]">1.870.000 ₫</td>
                    <td className="p-3.5 text-center font-mono text-[11px] text-[#059669]">24/10/2026</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã quyết toán
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Duyệt chi trả & Tải UNC */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-2xl max-w-md w-full p-5 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7] mb-3">
              <h3 className="text-sm font-bold text-[#1A1612]">Xác nhận Giải ngân & Tải Ủy nhiệm chi</h3>
              <button
                type="button"
                onClick={() => setApprovingItem(null)}
                className="text-[#7D715E] hover:text-[#1A1612] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-3">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Người thụ hưởng:</span>
                  <span className="font-bold text-[#1A1612]">{approvingItem.collaboratorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D715E]">Ngân hàng:</span>
                  <span className="font-semibold text-[#1A1612]">{approvingItem.bankName} - {approvingItem.bankAccountNumber}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#EEDFC6]">
                  <span className="text-[#7D715E]">Số tiền thực chuyển:</span>
                  <span className="text-sm font-black text-[#B88E4F]">{formatMoney(approvingItem.netAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Đính kèm Ủy nhiệm chi (UNC) / Bill ngân hàng Sàn *
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  required
                  onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#C59B58] file:text-white hover:file:bg-[#B88E4F] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7D715E] mb-1">
                  Mã tham chiếu ngân hàng (FT / Ref Code)
                </label>
                <input
                  type="text"
                  placeholder="VD: FT26298103984"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
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
          <div className="bg-white border border-[#EAE4D7] rounded-2xl max-w-sm w-full p-5 shadow-xl animate-in zoom-in-95">
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
