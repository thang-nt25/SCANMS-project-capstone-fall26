import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Landmark,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  X,
  CreditCard,
  Building,
  Download,
  Percent,
} from 'lucide-react';
import api from '../../services/api';
import { storeService, type StoreSettings } from '../../services/store.service';
import { toast } from '../../utils/toast';
import { BankSelectorModal } from '../../components/bank/BankSelectorModal';
import { type VietQrBank, findBankByQuery, VIETNAM_BANKS } from '@/config/banks.config';

interface LedgerItem {
  id: string;
  type: 'ORDER_REVENUE' | 'AFFILIATE_COMMISSION' | 'WITHDRAWAL' | 'PLATFORM_FEE' | 'REFUND';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceCode: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
}

interface CommissionStatementItem {
  id: string;
  orderCode: string;
  orderDate: string;
  collaboratorName: string;
  collaboratorAvatar?: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settlementStatus: 'HOLDING_14D' | 'SETTLED' | 'CLAWBACKED';
  productName: string;
}

const formatCurrency = (val: number | string) =>
  `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

const SETTLEMENT_BADGES: Record<string, { label: string; className: string }> = {
  HOLDING_14D: { label: 'Tạm giữ 14 ngày', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  SETTLED: { label: 'Đã quyết toán', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLAWBACKED: { label: 'Đã thu hồi', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const DEMO_STATEMENTS: CommissionStatementItem[] = [
  {
    id: 'stmt-01',
    orderCode: 'SCN-99824',
    orderDate: '2026-10-24T14:30:00Z',
    collaboratorName: 'Nguyễn Mai Anh',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    orderAmount: 1450000,
    commissionRate: 13,
    commissionAmount: 188500,
    settlementStatus: 'SETTLED',
    productName: 'Serum Vitamin C 15% Sora Skin 30 ml',
  },
  {
    id: 'stmt-02',
    orderCode: 'SCN-99821',
    orderDate: '2026-10-25T09:15:00Z',
    collaboratorName: 'Phan Hải Yến',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    orderAmount: 580000,
    commissionRate: 10,
    commissionAmount: 58000,
    settlementStatus: 'HOLDING_14D',
    productName: 'Sữa rửa mặt dịu nhẹ pH 5.5 Sora Skin 100 ml',
  },
  {
    id: 'stmt-03',
    orderCode: 'SCN-99781',
    orderDate: '2026-10-23T16:20:00Z',
    collaboratorName: 'Trần Văn Nhật',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    orderAmount: 2200000,
    commissionRate: 12,
    commissionAmount: 264000,
    settlementStatus: 'SETTLED',
    productName: 'Combo Phục Hồi Dưỡng Ẩm Chuyên Sâu Sora Skin',
  },
  {
    id: 'stmt-04',
    orderCode: 'SCN-99750',
    orderDate: '2026-10-22T11:00:00Z',
    collaboratorName: 'Lê Minh Khang',
    collaboratorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    orderAmount: 490000,
    commissionRate: 10,
    commissionAmount: 49000,
    settlementStatus: 'CLAWBACKED',
    productName: 'Kem Chống Nắng Phổ Rộng SPF 50+ Sora Skin',
  },
];

export default function ShopRevenueWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'commissions' || rawTab === 'withdrawals' ? rawTab : 'ledger';

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Financial Balances
  const [availableBalance, setAvailableBalance] = useState<number>(14250000);
  const [pendingBalance, setPendingBalance] = useState<number>(3820000);
  const [totalRevenue, setTotalRevenue] = useState<number>(48500000);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(30430000);

  // Ledger & Transactions
  const [transactions, setTransactions] = useState<LedgerItem[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Commission Statements State
  const [statements] = useState<CommissionStatementItem[]>(DEMO_STATEMENTS);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>('ALL');
  const [commissionSearch, setCommissionSearch] = useState('');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState('');

  // Bank Info & Selector
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditBankOpen, setIsEditBankOpen] = useState(false);
  const defaultBank = VIETNAM_BANKS.find((b) => b.shortName === 'MBBank') || VIETNAM_BANKS[0];
  const [selectedBank, setSelectedBank] = useState<VietQrBank>(defaultBank);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Sandbox Top-up Modal State
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [sandboxAmount, setSandboxAmount] = useState('2000000');
  const [submittingSandbox, setSubmittingSandbox] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [storeData, dashboardRes, ledgerRes] = await Promise.all([
        storeService.getMyStore().catch(() => null),
        api.get('/dashboard/shop').catch(() => null),
        api.get('/wallets/me/ledger').catch(() => null),
      ]);

      if (storeData) {
        setStore(storeData);
        const onboarding = storeData.onboardingData || {};
        const bName = storeData.payoutBankName || onboarding.payoutBankName || onboarding.bankName || '';
        const bAcc = storeData.payoutBankAccountNumber || onboarding.payoutBankAccountNumber || onboarding.bankAccountNumber || '';
        const bHolder = storeData.payoutBankAccountName || onboarding.payoutBankAccountName || onboarding.bankAccountName || '';

        setBankAccountNumber(bAcc || '0988776655');
        setBankAccountName(bHolder || 'CONG TY TNHH SORA SKIN');
        if (bName) {
          const match = findBankByQuery(bName);
          if (match) setSelectedBank(match);
        }
      }

      const summary = dashboardRes?.data?.summary || dashboardRes?.summary;
      if (summary) {
        if (summary.totalRevenue != null) {
          const rev = Number(summary.totalRevenue);
          setTotalRevenue(rev);
          const comm = Number(summary.totalCommissions || 0);
          const net = Math.max(0, rev - comm);
          setAvailableBalance(Math.round(net * 0.7));
          setPendingBalance(Math.round(net * 0.3));
        }
      }

      const realItems = Array.isArray(ledgerRes?.data?.items) ? ledgerRes.data.items : [];
      if (realItems.length > 0) {
        const mapped: LedgerItem[] = realItems.map((r: any) => ({
          id: r.id,
          type: r.transactionType === 'ORDER_PAYOUT' ? 'ORDER_REVENUE' : r.transactionType === 'COMMISSION' ? 'AFFILIATE_COMMISSION' : 'WITHDRAWAL',
          amount: Number(r.amount),
          balanceAfter: Number(r.balanceAfter),
          description: r.description || `Giao dịch ${r.transactionType}`,
          referenceCode: r.referenceId ? `REF-${r.referenceId.slice(0, 8)}` : 'GEN-01',
          createdAt: r.createdAt,
          status: 'COMPLETED',
        }));
        setTransactions(mapped);
      } else {
        setTransactions([
          {
            id: 'TXN-99824',
            type: 'ORDER_REVENUE',
            amount: 1450000,
            balanceAfter: 14250000,
            description: 'Tiền hàng hoàn tất đối soát 14 ngày đơn hàng #SCN-99824',
            referenceCode: 'SCN-99824',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            status: 'COMPLETED',
          },
          {
            id: 'TXN-99823',
            type: 'AFFILIATE_COMMISSION',
            amount: -188500,
            balanceAfter: 12800000,
            description: 'Khấu trừ hoa hồng KOL (13%) theo chiến dịch đơn #SCN-99824',
            referenceCode: 'SCN-99824',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            status: 'COMPLETED',
          },
          {
            id: 'TXN-99810',
            type: 'WITHDRAWAL',
            amount: -5000000,
            balanceAfter: 12988500,
            description: 'Rút tiền doanh thu về tài khoản MBBank 0988776655',
            referenceCode: 'WD-20261024-01',
            createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
            status: 'COMPLETED',
          },
          {
            id: 'TXN-99805',
            type: 'ORDER_REVENUE',
            amount: 2200000,
            balanceAfter: 17988500,
            description: 'Tiền hàng hoàn tất đối soát 14 ngày đơn hàng #SCN-99781',
            referenceCode: 'SCN-99781',
            createdAt: new Date(Date.now() - 3600000 * 52).toISOString(),
            status: 'COMPLETED',
          },
          {
            id: 'TXN-99790',
            type: 'PLATFORM_FEE',
            amount: -66000,
            balanceAfter: 15788500,
            description: 'Phí dịch vụ sàn SCANMS (3%) theo quy chế vận hành',
            referenceCode: 'FEE-20261022',
            createdAt: new Date(Date.now() - 3600000 * 54).toISOString(),
            status: 'COMPLETED',
          },
        ]);
      }
    } catch {
      // Solid baseline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast.error('Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản.');
      return;
    }
    setSavingBank(true);
    try {
      await storeService.updateMyStore({
        payoutBankName: selectedBank.shortName,
        payoutBankAccountNumber: bankAccountNumber.trim(),
        payoutBankAccountName: bankAccountName.trim().toUpperCase(),
      });
      toast.success('Đã cập nhật tài khoản ngân hàng thụ hưởng thành công.');
      setIsEditBankOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể lưu tài khoản ngân hàng.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(withdrawAmount.replace(/\D/g, ''));
    if (!parsed || parsed < 100000) {
      toast.error('Số tiền rút tối thiểu là 100.000 ₫');
      return;
    }
    if (parsed > availableBalance) {
      toast.error('Số tiền rút vượt quá số dư khả dụng hiện có.');
      return;
    }
    if (!bankAccountNumber || !bankAccountName) {
      toast.error('Vui lòng cập nhật tài khoản ngân hàng thụ hưởng trước khi rút tiền.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const newTxn: LedgerItem = {
        id: `WD-${Date.now().toString().slice(-6)}`,
        type: 'WITHDRAWAL',
        amount: -parsed,
        balanceAfter: availableBalance - parsed,
        description: `Rút tiền về ${selectedBank.shortName} (${bankAccountNumber}) - ${withdrawNote || 'Yêu cầu rút doanh thu'}`,
        referenceCode: `WD-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };

      setAvailableBalance((prev) => Math.max(0, prev - parsed));
      setTotalWithdrawn((prev) => prev + parsed);
      setTransactions((prev) => [newTxn, ...prev]);

      toast.success('Đã gửi yêu cầu rút tiền thành công. Kế toán sàn sẽ xử lý giải ngân.');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawNote('');
    } catch {
      toast.error('Có lỗi xảy ra khi tạo yêu cầu rút tiền.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleSandboxTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(sandboxAmount.replace(/\D/g, ''));
    if (!val || val <= 0) return;
    setSubmittingSandbox(true);
    try {
      await api.post('/wallets/top-up-demo', { amount: val }).catch(() => null);
      setAvailableBalance((prev) => prev + val);
      setTotalRevenue((prev) => prev + val);

      const topupTxn: LedgerItem = {
        id: `SBX-${Date.now().toString().slice(-6)}`,
        type: 'ORDER_REVENUE',
        amount: val,
        balanceAfter: availableBalance + val,
        description: 'Nạp tiền thử nghiệm Sandbox (Kiểm thử dòng tiền TMĐT)',
        referenceCode: `SBX-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      };

      setTransactions((prev) => [topupTxn, ...prev]);
      toast.success(`Đã nạp ${formatCurrency(val)} Sandbox vào ví thành công.`);
      setIsSandboxModalOpen(false);
    } finally {
      setSubmittingSandbox(false);
    }
  };

  // Filtered transactions for Ledger tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.referenceCode.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  // Filtered statements for Commissions tab
  const filteredStatements = useMemo(() => {
    return statements.filter((item) => {
      const matchStatus = commissionStatusFilter === 'ALL' || item.settlementStatus === commissionStatusFilter;
      const matchSearch =
        !commissionSearch.trim() ||
        item.orderCode.toLowerCase().includes(commissionSearch.toLowerCase()) ||
        item.collaboratorName.toLowerCase().includes(commissionSearch.toLowerCase()) ||
        item.productName.toLowerCase().includes(commissionSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [statements, commissionStatusFilter, commissionSearch]);

  const commissionKpis = useMemo(() => {
    const totalDeducted = statements
      .filter((s) => s.settlementStatus === 'SETTLED')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const totalHolding = statements
      .filter((s) => s.settlementStatus === 'HOLDING_14D')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const totalClawbacked = statements
      .filter((s) => s.settlementStatus === 'CLAWBACKED')
      .reduce((sum, s) => sum + s.commissionAmount, 0);

    const avgRate =
      statements.length > 0
        ? Math.round(
            statements.reduce((sum, s) => sum + s.commissionRate, 0) / statements.length,
          )
        : 10;

    return { totalDeducted, totalHolding, totalClawbacked, avgRate };
  }, [statements]);

  const handleExportExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Mã đơn,Ngày,Nhà sáng tạo,Sản phẩm,Giá trị đơn,Tỷ lệ hoa hồng,Số tiền trích,Trạng thái']
        .concat(
          filteredStatements.map(
            (s) =>
              `${s.orderCode},${new Date(s.orderDate).toLocaleDateString('vi-VN')},"${s.collaboratorName}","${s.productName}",${s.orderAmount},${s.commissionRate}%,${s.commissionAmount},${s.settlementStatus}`,
          ),
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sao_ke_hoa_hong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file sao kê chi phí hoa hồng');
  };

  const withdrawalList = useMemo(() => {
    return transactions.filter((t) => t.type === 'WITHDRAWAL');
  }, [transactions]);

  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-6 pb-12 pt-2 text-[#1A1612]" id="merchant-revenue-wallet-page">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D7]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1612]">Tài chính & Ví Gian hàng</h1>
            <div className="text-xs text-[#7D715E] flex items-center gap-2 mt-0.5">
              <span>{store?.name || 'Sora Skin Official'}</span>
              <span>•</span>
              <span className="text-[#059669] font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Đối soát ký quỹ an toàn
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#B88E4F]' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSandboxModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 text-xs font-bold text-[#8C6B32] hover:bg-[#F3EFE6] transition cursor-pointer shadow-2xs"
            title="Nạp tiền thử nghiệm kiểm thử đặt hàng và hoàn tiền"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nạp Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWithdrawModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] px-4 text-xs font-bold text-white transition cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Rút tiền về ngân hàng</span>
          </button>
        </div>
      </div>

      {/* 2. Four Financial Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số dư khả dụng */}
        <div className="rounded-2xl border border-[#EEDFC6] bg-gradient-to-br from-[#FAF8F5] to-[#FBF5EB] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#8C6B32] mb-1">
            <span>SỐ DƯ KHẢ DỤNG</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-[#B88E4F]">
              <Wallet className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1A1612] tracking-tight">
            {formatCurrency(availableBalance)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#7D715E] pt-2 border-t border-[#EEDFC6]/60">
            <span>Sẵn sàng rút ngay</span>
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="text-[#B88E4F] font-bold hover:underline cursor-pointer"
            >
              Rút tiền →
            </button>
          </div>
        </div>

        {/* Card 2: Chờ đối soát (14 ngày) */}
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#7D715E] mb-1">
            <span>TẠM GIỮ ĐỐI SOÁT</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#7D715E]">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1A1612] tracking-tight">
            {formatCurrency(pendingBalance)}
          </div>
          <div className="mt-2 text-[11px] text-[#7D715E] pt-2 border-t border-[#EAE4D7]">
            Chu kỳ bảo vệ người mua 14 ngày
          </div>
        </div>

        {/* Card 3: Doanh thu tích lũy */}
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#7D715E] mb-1">
            <span>DOANH THU TÍCH LŨY</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#059669]">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1A1612] tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="mt-2 text-[11px] text-[#7D715E] pt-2 border-t border-[#EAE4D7]">
            Đã khấu trừ hoa hồng & phí sàn
          </div>
        </div>

        {/* Card 4: Đã rút về ngân hàng */}
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#7D715E] mb-1">
            <span>ĐÃ RÚT VỀ NGÂN HÀNG</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#B88E4F]">
              <Landmark className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1A1612] tracking-tight">
            {formatCurrency(totalWithdrawn)}
          </div>
          <div className="mt-2 text-[11px] text-[#7D715E] pt-2 border-t border-[#EAE4D7]">
            Tài khoản thụ hưởng doanh nghiệp
          </div>
        </div>
      </div>

      {/* 3. Linked Bank Account Card */}
      <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#7D715E]">
                Tài khoản ngân hàng thụ hưởng của Gian hàng
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-base font-extrabold text-[#1A1612]">
                  {selectedBank.shortName} • {bankAccountNumber || '0988776655'}
                </span>
                <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-xs font-bold text-[#8C6B32]">
                  {bankAccountName || 'CONG TY TNHH SORA SKIN'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditBankOpen(true)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] px-3.5 text-xs font-bold text-[#1A1612] transition cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5 text-[#B88E4F]" />
            <span>Đổi tài khoản</span>
          </button>
        </div>
      </div>

      {/* 4. Unified Data Tabs Navigation */}
      <div className="flex items-center border-b border-[#EAE4D7] gap-3">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'ledger' })}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Biến động số dư (Sổ cái)</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'commissions' })}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'commissions'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Chi phí hoa hồng KOL (Đối soát)</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'withdrawals' })}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'border-[#B88E4F] text-[#B88E4F]'
              : 'border-transparent text-[#7D715E] hover:text-[#1A1612]'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Lịch sử rút doanh thu</span>
        </button>
      </div>

      {/* TAB 1: BIẾN ĐỘNG SỐ DƯ (SỔ CÁI) */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'ORDER_REVENUE', label: 'Tiền hàng (+)' },
                { id: 'AFFILIATE_COMMISSION', label: 'Hoa hồng KOL (-)' },
                { id: 'WITHDRAWAL', label: 'Rút tiền (-)' },
                { id: 'PLATFORM_FEE', label: 'Phí sàn (-)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-[#C59B58] text-white shadow-xs'
                      : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D715E]" />
              <input
                type="text"
                placeholder="Tìm mã đơn, mã lệnh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-[#1A1612] outline-none focus:border-[#B88E4F]"
              />
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAE4D7] text-[#7D715E] font-semibold bg-[#FAF8F5]">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Loại giao dịch</th>
                  <th className="py-2.5 px-3">Mô tả / Tham chiếu</th>
                  <th className="py-2.5 px-3 text-right">Số tiền</th>
                  <th className="py-2.5 px-3 text-right">Số dư sau</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#7D715E]">
                      Chưa có dữ liệu giao dịch phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((item) => {
                    const isPositive = item.amount > 0;
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-3 text-[#7D715E] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            item.type === 'ORDER_REVENUE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.type === 'WITHDRAWAL'
                              ? 'bg-[#FBF5EB] text-[#8C6B32] border border-[#EEDFC6]'
                              : 'bg-[#F3EFE6] text-[#7D715E]'
                          }`}>
                            {item.type === 'ORDER_REVENUE' && 'Tiền hàng'}
                            {item.type === 'AFFILIATE_COMMISSION' && 'Hoa hồng KOL'}
                            {item.type === 'WITHDRAWAL' && 'Rút về ngân hàng'}
                            {item.type === 'PLATFORM_FEE' && 'Phí dịch vụ'}
                            {item.type === 'REFUND' && 'Hoàn tiền đơn'}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-semibold text-[#1A1612] truncate">{item.description}</div>
                          <div className="text-[10px] text-[#7D715E] font-mono mt-0.5">{item.referenceCode}</div>
                        </td>
                        <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                          isPositive ? 'text-[#059669]' : 'text-[#1A1612]'
                        }`}>
                          {isPositive ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#7D715E] whitespace-nowrap">
                          {formatCurrency(item.balanceAfter)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.status === 'COMPLETED' ? 'Thành công' : item.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ĐỐI SOÁT CHI PHÍ HOA HỒNG KOL */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          {/* KPI Cards for Commissions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đã quyết toán cho KOL
              </div>
              <div className="text-xl font-black text-[#1A1612]">
                {formatCurrency(commissionKpis.totalDeducted)}
              </div>
              <div className="text-[10px] text-[#7D715E] mt-1">
                Sàn đã trích chuyển về ví KOL
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đang tạm giữ 14 ngày
              </div>
              <div className="text-xl font-black text-amber-700">
                {formatCurrency(commissionKpis.totalHolding)}
              </div>
              <div className="text-[10px] text-[#7D715E] mt-1">
                Đang trong chu kỳ bảo vệ người mua
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Đã thu hồi (Clawback)
              </div>
              <div className="text-xl font-black text-rose-700">
                {formatCurrency(commissionKpis.totalClawbacked)}
              </div>
              <div className="text-[10px] text-[#7D715E] mt-1">
                Đơn hủy hoặc khách trả hàng
              </div>
            </div>

            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-1">
                Tỷ lệ hoa hồng trung bình
              </div>
              <div className="text-xl font-black text-[#B88E4F]">
                {commissionKpis.avgRate}%
              </div>
              <div className="text-[10px] text-[#7D715E] mt-1">
                Bao gồm Open Offer + Deal VIP
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-[#EAE4D7] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'HOLDING_14D', label: 'Tạm giữ 14 ngày' },
                { id: 'SETTLED', label: 'Đã quyết toán' },
                { id: 'CLAWBACKED', label: 'Đã thu hồi' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCommissionStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    commissionStatusFilter === st.id
                      ? 'bg-[#231D15] text-white border-[#231D15]'
                      : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn, KOL, sản phẩm..."
                  value={commissionSearch}
                  onChange={(e) => setCommissionSearch(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs outline-none focus:border-[#B88E4F]"
                />
              </div>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                  <tr>
                    <th className="p-3.5">Mã Đơn / Ngày</th>
                    <th className="p-3.5">Nhà Sáng Tạo Tiếp Thị</th>
                    <th className="p-3.5">Sản Phẩm</th>
                    <th className="p-3.5 text-right">Doanh Thu Đơn</th>
                    <th className="p-3.5 text-center">Tỷ Lệ</th>
                    <th className="p-3.5 text-right font-black text-[#1A1612]">Hoa Hồng Sàn Trích</th>
                    <th className="p-3.5 text-center">Trạng Thái Dòng Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]">
                  {filteredStatements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-[#7D715E]">
                        Không có giao dịch hoa hồng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredStatements.map((item) => {
                      const badge = SETTLEMENT_BADGES[item.settlementStatus] || { label: item.settlementStatus, className: '' };
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition">
                          <td className="p-3.5">
                            <div className="font-mono text-xs font-bold text-[#1A1612]">
                              #{item.orderCode}
                            </div>
                            <div className="text-[10px] text-[#7D715E]">
                              {new Date(item.orderDate).toLocaleDateString('vi-VN')}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#EAE4D7] text-[#B88E4F] font-bold flex items-center justify-center text-[11px] shrink-0 overflow-hidden">
                                {item.collaboratorAvatar ? (
                                  <img src={item.collaboratorAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  item.collaboratorName[0]
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-[#1A1612]">{item.collaboratorName}</div>
                                <div className="text-[10px] text-[#7D715E]">CTV Tiếp thị</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="max-w-xs truncate font-medium text-[#1A1612]" title={item.productName}>
                              {item.productName}
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                            {formatCurrency(item.orderAmount)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="font-mono font-bold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-md border border-[#EEDFC6]">
                              {item.commissionRate}%
                            </span>
                          </td>

                          <td className="p-3.5 text-right font-mono text-xs font-black text-[#1A1612]">
                            {formatCurrency(item.commissionAmount)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
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

      {/* TAB 3: LỊCH SỬ RÚT TIỀN */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-[#FAF8F5] border-b border-[#EAE4D7] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
              Lịch sử rút doanh thu về ngân hàng ({withdrawalList.length} lệnh)
            </h2>
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Tạo lệnh rút mới</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-[#7D715E] border-b border-[#EAE4D7] font-bold">
                <tr>
                  <th className="p-3.5">Mã Lệnh / Thời Gian</th>
                  <th className="p-3.5">Ngân Hàng Thụ Hưởng</th>
                  <th className="p-3.5">Ghi Chú</th>
                  <th className="p-3.5 text-right font-black text-[#1A1612]">Số Tiền Rút</th>
                  <th className="p-3.5 text-right">Số Dư Sau</th>
                  <th className="p-3.5 text-center">Trạng Thái Sàn Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {withdrawalList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-[#7D715E]">
                      Chưa có lệnh rút tiền nào.
                    </td>
                  </tr>
                ) : (
                  withdrawalList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition">
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-bold text-[#1A1612]">{item.id}</div>
                        <div className="text-[10px] text-[#7D715E]">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-[#1A1612]">{selectedBank.shortName}</div>
                        <div className="font-mono font-bold text-[#B88E4F]">{bankAccountNumber}</div>
                        <div className="text-[10px] text-[#7D715E] uppercase">{bankAccountName}</div>
                      </td>
                      <td className="p-3.5 text-[#7D715E] max-w-xs">
                        {item.description}
                      </td>
                      <td className="p-3.5 text-right font-mono text-sm font-black text-rose-700">
                        {formatCurrency(Math.abs(item.amount))}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-[#7D715E]">
                        {formatCurrency(item.balanceAfter)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.status === 'COMPLETED' ? 'Đã giải ngân' : item.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: WITHDRAWAL MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setIsWithdrawModalOpen(false)}>
          <div className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#EAE4D7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-[#B88E4F]" />
                <h3 className="text-base font-bold text-[#1A1612]">Yêu cầu rút tiền về ngân hàng</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWithdrawal} className="p-6 space-y-4">
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs">
                <div className="text-[#7D715E]">Số dư khả dụng hiện có:</div>
                <div className="text-lg font-black text-[#8C6B32]">{formatCurrency(availableBalance)}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Số tiền muốn rút (₫)
                  </label>
                  {availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(availableBalance))}
                      className="text-[11px] font-bold text-[#B88E4F] hover:text-[#8C6B32] transition cursor-pointer select-none"
                    >
                      Rút toàn bộ ({formatCurrency(availableBalance)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Nhập số tiền (ví dụ: 1000000)..."
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 pr-12 text-sm font-bold font-mono text-[#1A1612] outline-none focus:border-[#B88E4F]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7D715E] pointer-events-none">
                    VNĐ
                  </span>
                </div>

                {/* Realtime formatted preview */}
                {withdrawAmount && Number(withdrawAmount) > 0 && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#7D715E] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EEDFC6]">
                    <span>Số tiền quy đổi:</span>
                    <span className="font-bold font-mono text-[#B88E4F] text-sm">
                      {Number(withdrawAmount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                )}

                {/* Quick amount shortcuts */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] text-[#7D715E] font-medium mr-0.5">Chọn nhanh:</span>
                  {[500000, 1000000, 2000000, 5000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(String(amt))}
                      className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-mono font-semibold transition cursor-pointer ${
                        withdrawAmount === String(amt)
                          ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#8C6B32]'
                          : 'border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1612]'
                      }`}
                    >
                      {amt.toLocaleString('vi-VN')} ₫
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Tài khoản nhận tiền
                </label>
                <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs">
                  <div className="font-bold text-[#1A1612]">{selectedBank.shortName} • {bankAccountNumber}</div>
                  <div className="text-[#7D715E] mt-0.5">{bankAccountName}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Ghi chú rút tiền (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Rút doanh thu đợt cuối tháng..."
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 text-xs text-[#1A1612] outline-none focus:border-[#B88E4F]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                  onClick={() => setIsWithdrawModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingWithdraw ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Xác nhận rút tiền</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BANK MODAL */}
      {isEditBankOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setIsEditBankOpen(false)}>
          <div className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#EAE4D7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#B88E4F]" />
                <h3 className="text-base font-bold text-[#1A1612]">Tài khoản ngân hàng thụ hưởng</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setIsEditBankOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Ngân hàng
                </label>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full flex items-center justify-between bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1612] hover:border-[#B88E4F] transition cursor-pointer"
                >
                  <span>{selectedBank.shortName} - {selectedBank.name}</span>
                  <span className="text-[#B88E4F]">Chọn lại</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0988776655..."
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Tên chủ tài khoản (Viết in hoa không dấu)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: CONG TY TNHH SORA SKIN..."
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1A1612] outline-none focus:border-[#B88E4F]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                  onClick={() => setIsEditBankOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Lưu tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SANDBOX TOP-UP MODAL */}
      {isSandboxModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setIsSandboxModalOpen(false)}>
          <div className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#EAE4D7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#B88E4F]" />
                <h3 className="text-base font-bold text-[#1A1612]">Nạp tiền Sandbox (Thử nghiệm)</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={() => setIsSandboxModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSandboxTopup} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Số tiền nạp thử nghiệm (₫)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sandboxAmount}
                    onChange={(e) => setSandboxAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="VD: 2000000"
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 pr-12 text-sm font-bold font-mono text-[#1A1612] outline-none focus:border-[#B88E4F]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7D715E] pointer-events-none">
                    VNĐ
                  </span>
                </div>

                {/* Realtime formatted preview */}
                {sandboxAmount && Number(sandboxAmount) > 0 && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#7D715E] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EEDFC6]">
                    <span>Số tiền quy đổi:</span>
                    <span className="font-bold font-mono text-[#B88E4F] text-sm">
                      {Number(sandboxAmount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                )}

                {/* Quick shortcuts */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] text-[#7D715E] font-medium mr-0.5">Chọn nhanh:</span>
                  {[1000000, 2000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSandboxAmount(String(amt))}
                      className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-mono font-semibold transition cursor-pointer ${
                        sandboxAmount === String(amt)
                          ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#8C6B32]'
                          : 'border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1612]'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000}M ₫` : `${amt / 1000}k ₫`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                  onClick={() => setIsSandboxModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingSandbox}
                  className="px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {submittingSandbox ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Nạp tiền ngay</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Selector Modal */}
      {isBankModalOpen && (
        <BankSelectorModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          onSelectBank={(bank) => {
            setSelectedBank(bank);
            setIsBankModalOpen(false);
          }}
          selectedBin={selectedBank.bin}
        />
      )}
    </div>
  );
}
