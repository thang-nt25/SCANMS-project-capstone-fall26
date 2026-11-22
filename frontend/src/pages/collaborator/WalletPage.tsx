import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import { WithdrawalHistoryPanel } from '../../components/wallet/WithdrawalHistoryPanel';
import { LedgerHistoryPanel, type LedgerFilters } from '../../components/wallet/LedgerHistoryPanel';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { createSearchParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Clock3,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Landmark,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Unlink,
  Store,
  TrendingUp,
  Receipt,
  Plus,
  HelpCircle,
  X,
} from "lucide-react";
import { walletService } from "../../services/wallet.service";
import { payoutDisplayCode } from '../../utils/payout-display-code';
import { kycService } from '../../services/kyc.service';
import { toast } from "../../utils/toast";
import { cn } from "../../utils/cn";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { BankSelectorModal } from "../../components/bank/BankSelectorModal";
import { WalletFinancialBreakdown } from '../../components/wallet/WalletFinancialBreakdown';

import { type VietQrBank, findBankByQuery, VIETNAM_BANKS } from "@/config/banks.config";
import type {
  PayoutStatus,
  WalletSummary,
  WithdrawalHistory,
  LedgerHistory,
} from "../../services/wallet.service";

const formatMoney = (amount: string) =>
  `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(amount))} ₫`;

const getErrorMessage = (error: unknown) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.filter(item => typeof item === 'string').join('. ');
  return error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.";
};

const CreateWalletReferralLink = lazy(() => import('./ReferralLinksPage'));


function toMinorUnits(amount: string): bigint {
  const negative = amount.startsWith("-");
  const [whole, fraction = ""] = (negative ? amount.slice(1) : amount).split(
    ".",
  );
  return (
    (negative ? -1n : 1n) *
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")))
  );
}

let lastWalletSnapshot: {
  wallet: WalletSummary | null;
  history: WithdrawalHistory | null;
  ledger: LedgerHistory | null;
} | null = null;
registerPrivateCacheReset(() => { lastWalletSnapshot = null; });

export default function WalletPage({ embedded = false, onBusyChange }: { embedded?: boolean; onBusyChange?: (busy: boolean) => void } = {}) {
  const [routeSearchParams, setRouteSearchParams] = useSearchParams();
  const [localSearchParams, setLocalSearchParams] = useState(() => new URLSearchParams());
  const searchParams = embedded ? localSearchParams : routeSearchParams;
  const setSearchParams: typeof setRouteSearchParams = useCallback((next, options) => {
    if (embedded) {
      setLocalSearchParams(previous => {
        const value = typeof next === 'function' ? next(previous) : next;
        return createSearchParams(value);
      });
    } else {
      setRouteSearchParams(next, options);
    }
  }, [embedded, setRouteSearchParams]);
  const navigate = useNavigate();
  const requestedTab = searchParams.get('tab');
  const focusedPayoutId = searchParams.get('payoutId') || undefined;

  useEffect(() => {
    if (requestedTab === 'kyc' || requestedTab === 'social') {
      navigate(`/collaborator/profile?tab=${requestedTab}`, { replace: true });
    }
  }, [requestedTab, navigate]);

  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary | null>(() => lastWalletSnapshot?.wallet || null);
  const [history, setHistory] = useState<WithdrawalHistory | null>(() => lastWalletSnapshot?.history || null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(() => lastWalletSnapshot?.ledger || null);
  const [page, setPage] = useState(1);
  const [withdrawalStatus, setWithdrawalStatus] = useState<PayoutStatus | ''>('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerFilters, setLedgerFilters] = useState<LedgerFilters>({});
  const [recentLedger, setRecentLedger] = useState<LedgerHistory | null>(null);
  const handleLedgerFilters = useCallback((filters: LedgerFilters) => { setLedgerFilters(filters); setLedgerPage(1); }, []);
  const [walletPanel, setWalletPanel] = useState<'withdraw' | 'stores' | 'history'>(() => searchParams.has('payoutId') ? 'history' : 'withdraw');
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(() => !lastWalletSnapshot?.wallet);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submissionInFlight = useRef(false);
  const loadSequence = useRef(0);
  const walletReadSequence = useRef(0);
  const walletBusy = useRef(false);
  const [walletSyncError, setWalletSyncError] = useState('');
  const [activeInfoCard, setActiveInfoCard] = useState<'available' | 'pending' | 'deal' | 'locked' | null>(null);
  const ledgerSectionRequested = searchParams.get('section') === 'ledger';
  useEffect(() => {
    if (!focusedPayoutId || loading) return;
    setWalletPanel('history');
    const frame = requestAnimationFrame(() => document.getElementById('wallet-withdrawal-details')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [focusedPayoutId, loading]);

  useEffect(() => {
    if (!ledgerSectionRequested) return;
    if (loading) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('wallet-ledger-details')?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [ledgerSectionRequested, loading]);

  const defaultBank = VIETNAM_BANKS.find((b) => b.shortName === "MBBank") || VIETNAM_BANKS[0];
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [selectedBank, setSelectedBank] = useState<VietQrBank>(defaultBank);
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const bankSaveInFlight = useRef(false);
  const [bankErrors, setBankErrors] = useState<{ number?: string; name?: string; form?: string }>({});
  const handleEditBank = () => {
    setSelectedBank(findBankByQuery(wallet?.bankAccount?.bankName || '') || defaultBank);
    setAccountNameInput(wallet?.bankAccount?.accountName || '');
    setAccountNumberInput('');
    setBankErrors({});
    setShowAddBankForm(true);
  };
  walletBusy.current = submitting || savingBank;
  useEffect(() => {
    onBusyChange?.(submitting || savingBank);
    return () => onBusyChange?.(false);
  }, [submitting, savingBank, onBusyChange]);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  const handleCopyId = async (id: string, label: string = 'mã') => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success(`Đã sao chép ${label}: ${id.slice(0, 12)}...`);
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.');
    }
  };

  const handleDisconnectBank = () => {
    setIsDisconnectConfirmOpen(true);
  };

  const handleConfirmDisconnectBank = async () => {
    setSavingBank(true);
    try {
      await walletService.disconnectBankAccount();
      toast.success("Đã ngừng sử dụng tài khoản nhận tiền.");
      setAccountNumberInput("");
      await loadWallet();
      setIsDisconnectConfirmOpen(false);
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') setWalletSyncError(getErrorMessage(err));
      toast.error(err?.response?.data?.message || err?.message || "Lỗi cập nhật tài khoản");
    } finally {
      setSavingBank(false);
    }
  };

  const handleBankChosen = (bank: VietQrBank) => {
    setSelectedBank(bank);
    setShowAddBankForm(true);
    setIsBankModalOpen(false);
    toast.info(`Đã chọn ${bank.shortName}. Vui lòng nhập số tài khoản bên dưới để hoàn tất.`);
  };

  const handleSaveBankInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (bankSaveInFlight.current) return;
    const bankToSave = selectedBank || defaultBank;
    const validation = {
      number: !/^\d+$/.test(accountNumberInput.trim()) ? 'Nhập số tài khoản chỉ gồm chữ số.' : undefined,
      name: !accountNameInput.trim() ? 'Nhập tên chủ tài khoản.' : undefined,
    };
    setBankErrors(validation);
    if (validation.number || validation.name) {
      return;
    }
    bankSaveInFlight.current = true;
    setSavingBank(true);
    try {
      const p = await kycService.getMyKyc({ forceRefresh: true });
      if (!p?.idCardNumber || !p.socialLinksJson?.frontCardUrl || !p.socialLinksJson?.backCardUrl) {
        toast.error('Vui lòng hoàn thiện CCCD và ảnh hai mặt trong Hồ sơ KYC trước khi liên kết ngân hàng.');
        setSearchParams({ tab: 'kyc' });
        return;
      }
      await walletService.updateBankAccount({
        bankName: `${bankToSave.shortName} (${bankToSave.name})`,
        bankAccountNumber: accountNumberInput.trim(),
        bankAccountName: accountNameInput.trim().toUpperCase(),
      });
      toast.success("Đăng ký tài khoản nhận tiền thành công!");
      setShowAddBankForm(false);
      setAccountNumberInput("");
      await loadWallet();
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') setWalletSyncError(getErrorMessage(err));
      setBankErrors({ form: err?.response?.data?.message || err?.message || 'Không thể lưu tài khoản. Vui lòng thử lại.' });
      toast.error(err?.response?.data?.message || err?.message || "Lỗi lưu tài khoản");
    } finally {
      bankSaveInFlight.current = false;
      setSavingBank(false);
    }
  };

  const handleCancelAddBank = () => {
    if (savingBank) return;
    setAccountNumberInput("");
    setBankErrors({});
    setShowAddBankForm(false);
  };

  const loadWallet = useCallback(async (background = false, forceFresh = false) => {
    if (background && (walletReadSequence.current || walletBusy.current || submissionInFlight.current)) return;
    const sequence = ++loadSequence.current;
    walletReadSequence.current = sequence;
    if (!background && !wallet) setLoading(true);
    try {
      const [summary, withdrawals, ledgerHistory, recentHistory] = await Promise.all([
        walletService.getMyWallet(forceFresh),
        walletService.getMyWithdrawals(page, forceFresh, withdrawalStatus || undefined, focusedPayoutId),
        walletService.getMyLedger(ledgerPage, forceFresh, ledgerFilters),
        walletService.getMyLedger(1, forceFresh),
      ]);
      if (sequence !== loadSequence.current) return;
      setWallet(summary);

      setHistory(withdrawals);
      setLedger(ledgerHistory);
      setRecentLedger(recentHistory);
      setWalletSyncError('');
      if (!background) setError("");
    } catch (err: unknown) {
      if (sequence === loadSequence.current) {
        setWalletSyncError(getErrorMessage(err));
        if (!background) setError(getErrorMessage(err));
      }
    } finally {
      if (walletReadSequence.current === sequence) walletReadSequence.current = 0;
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [page, ledgerPage, withdrawalStatus, ledgerFilters, focusedPayoutId]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const sync = () => {
      if (!document.hidden) void loadWallet(true);
    };
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [loadWallet]);




  const validPreviewAmount = /^\d{1,13}(\.\d{1,2})?$/.test(amount.trim());
  const effectiveStoreAvailable = Number(wallet?.availableBalance || 0);
  const grossMinor = validPreviewAmount ? toMinorUnits(amount.trim()) : 0n;
  const amountHint = amount && wallet
    ? !validPreviewAmount ? 'Nhập số tiền hợp lệ.'
      : grossMinor < toMinorUnits(wallet.minimumWithdrawalAmount) ? `Tối thiểu ${formatMoney(wallet.minimumWithdrawalAmount)}.`
        : grossMinor > toMinorUnits(wallet.availableBalance) ? 'Số tiền vượt số dư khả dụng.' : ''
    : '';
  const isWithdrawEligible = Boolean(
    !walletSyncError && wallet?.canWithdraw &&
      toMinorUnits(wallet.availableBalance) >= toMinorUnits(wallet.minimumWithdrawalAmount)
  );
  const taxMinor = grossMinor > 0n ? (grossMinor * 10n + 50n) / 100n : 0n;
  const previewMoney = (minorUnits: bigint) =>
    formatMoney(
      `${minorUnits / 100n}.${(minorUnits % 100n).toString().padStart(2, "0")}`,
    );

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || submissionInFlight.current || loading) return;
    if (walletSyncError) {
      toast.error('Cần đồng bộ lại dữ liệu ví trước khi gửi yêu cầu rút tiền.');
      return;
    }
    setError("");
    if (!wallet.bankAccount) {
      toast.error("Vui lòng liên kết tài khoản ngân hàng thụ hưởng trước khi tạo yêu cầu rút.");
      setError("Vui lòng liên kết tài khoản ngân hàng thụ hưởng trước khi tạo yêu cầu rút.");
      return;
    }
    if (wallet.kycStatus !== 'VERIFIED') {
      toast.error("Hồ sơ KYC cần được phê duyệt trước khi tạo yêu cầu rút tiền.");
      setError("Hồ sơ KYC cần được phê duyệt trước khi tạo yêu cầu rút tiền.");
      return;
    }
    const normalizedAmount = amount.trim();
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(normalizedAmount)) {
      toast.error("Nhập số tiền hợp lệ, không có dấu phân cách hàng nghìn.");
      setError(
        "Nhập số tiền hợp lệ, không có dấu phân cách hàng nghìn, tối đa 2 chữ số lẻ.",
      );
      return;
    }
    const minorUnits = toMinorUnits(normalizedAmount);
    if (
      minorUnits <= 0n ||
      minorUnits < toMinorUnits(wallet.minimumWithdrawalAmount)
    ) {
      toast.error(`Số tiền rút tối thiểu là ${formatMoney(wallet.minimumWithdrawalAmount)}.`);
      setError(
        `Số tiền rút tối thiểu là ${formatMoney(wallet.minimumWithdrawalAmount)}.`,
      );
      return;
    }
    if (minorUnits > toMinorUnits(wallet.availableBalance)) {
      toast.error("Số dư khả dụng trên ví không đủ để thực hiện rút tiền.");
      setError("Số dư khả dụng không đủ để thực hiện rút tiền.");
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    try {
      const result = await walletService.createWithdrawal(normalizedAmount);
      toast.success('Đã tạo yêu cầu rút tiền', {
        description: `${payoutDisplayCode(result.request.id, result.request.createdAt)} · Chờ duyệt`,
        duration: 4000,
        position: 'top-center',
      });
      setWalletPanel('history');
      setAmount("");
      setWallet((current) =>
        current
          ? { ...current, availableBalance: result.availableBalance }
          : current,
      );
      if (page === 1) await loadWallet();
      else setPage(1);
    } catch (err: unknown) {

      setError(
        `${getErrorMessage(err)} Nếu kết nối bị gián đoạn, hãy tải lại lịch sử trước khi gửi lại.`,
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div id="kol-wallet-page" data-active-tab={walletPanel} className={cn("flex flex-col gap-4 w-full min-w-0 pb-12 text-[#1A1612] text-left", !embedded && "wallet-standalone")}>
      {/* Top Unified Hub Navigation Bar */}
      <div className="p-1.5 sm:p-2 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
        <nav className="grid grid-cols-3 items-stretch gap-2 w-full" aria-label="Phân hệ Thu nhập & Đối soát">
          <button
            type="button"
            onClick={() => setWalletPanel('withdraw')}
            disabled={submitting || savingBank}
            className={`flex min-h-[44px] items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer select-none ${
              walletPanel === 'withdraw'
                ? 'bg-[#FBF5EB] border border-[#EEDFC6] text-[#1A1612]'
                : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612] border border-[#EAE4D7]'
            }`}
            id="tab-btn-withdraw"
            aria-pressed={walletPanel === 'withdraw'}
          >
            <Wallet className="w-4 h-4 text-[#B88E4F]" />
            <span>Ví & rút tiền</span>
          </button>

          <button
            type="button"
            onClick={() => setWalletPanel('stores')}
            disabled={submitting || savingBank}
            className={`flex min-h-[44px] items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer select-none ${
              walletPanel === 'stores'
                ? 'bg-[#FBF5EB] border border-[#EEDFC6] text-[#1A1612]'
                : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612] border border-[#EAE4D7]'
            }`}
            id="tab-btn-stores"
            aria-pressed={walletPanel === 'stores'}
          >
            <Store className="w-4 h-4 text-[#B88E4F]" />
            <span>Nhãn hàng đối tác</span>
          </button>

          <button
            type="button"
            onClick={() => setWalletPanel('history')}
            disabled={submitting || savingBank}
            className={`flex min-h-[44px] items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer select-none ${
              walletPanel === 'history'
                ? 'bg-[#FBF5EB] border border-[#EEDFC6] text-[#1A1612]'
                : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612] border border-[#EAE4D7]'
            }`}
            id="tab-btn-history"
            aria-pressed={walletPanel === 'history'}
          >
            <Receipt className="w-4 h-4 text-[#B88E4F]" />
            <span>Lịch sử giao dịch</span>
          </button>
        </nav>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!error && !wallet && loading && (
        <section className="wallet-tab-loading" role="status" aria-busy="true" aria-label="Đang tải nội dung">
          <div className="wallet-tab-loading-heading"><Loader2 size={15} className="animate-spin" aria-hidden="true" /><span>Đang tải dữ liệu…</span></div>
          <div className="wallet-tab-skeleton" aria-hidden="true"><div /><div /><div /></div>
        </section>
      )}
      {wallet && (
        <>
      {walletSyncError && (
        <div role="alert" data-testid="wallet-sync-error" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EEDFC6] bg-white p-3 text-xs text-[#7D715E]">
          <span>Chưa đồng bộ được dữ liệu ví. Thông tin đang hiển thị có thể chưa mới nhất. {walletSyncError}</span>
          <button type="button" onClick={() => void loadWallet(true)} className="shrink-0 rounded-md border border-[#EAE4D7] px-2 py-1">Thử lại</button>
        </div>
      )}

      {wallet?.earningsReviewRequired && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
        <strong className="block text-[#1A1612]">Số dư cần đối soát — tạm thời chưa thể rút tiền</strong>
        {wallet.balanceConsistency?.requiresReview ? <p className="mt-1">
          Ví tổng ghi nhận {formatMoney(wallet.availableBalance)} khả dụng và {formatMoney(wallet.pendingBalance)} tạm giữ;
          phân bổ gian hàng ghi nhận {formatMoney(wallet.balanceConsistency.allocatedAvailableBalance)} khả dụng và {formatMoney(wallet.balanceConsistency.allocatedPendingBalance)} tạm giữ.
          Dữ liệu chưa khớp, cần kiểm tra sổ giao dịch trước khi xác nhận số tiền được rút.
        </p> : <p className="mt-1">Số dư cũ cần được kế toán đối soát nguồn tiền trước khi rút thu nhập.</p>}
      </div>}
      <section className="kol-wallet-balances wallet-balance-overview" aria-label="Tổng quan ví" aria-busy={loading}>
        {([
          { key: 'available', label: 'Có thể rút', icon: Wallet, value: wallet?.availableBalance, note: `Tối thiểu ${wallet ? formatMoney(wallet.minimumWithdrawalAmount) : '200.000 ₫'}` },
          { key: 'pending', label: 'Chờ đối soát', icon: ShieldCheck, value: wallet?.pendingBalance, note: '14 ngày sau khi giao thành công' },
          { key: 'deal', label: 'Chênh lệch Deal đang giữ', icon: TrendingUp, value: wallet?.conditionalDealEscrowBalance, note: 'Đủ KPI và hoàn tất đối soát 14 ngày' },
          { key: 'locked', label: 'Đang rút', icon: Clock3, value: wallet?.lockedPayoutBalance, note: Number(wallet?.lockedPayoutBalance || 0) > 0 ? 'Yêu cầu đang chờ xử lý' : 'Không có yêu cầu đang chờ' },
        ] as const).map(({ key, label, icon: Icon, value, note }) => (
          <div key={key} className="wallet-balance-cell" data-active={activeInfoCard === key}>
            <div className="wallet-balance-top">
              <span className="wallet-balance-icon"><Icon size={19} aria-hidden="true" /></span>
              <span className="wallet-balance-badge">
                {key === 'available' && <><CheckCircle2 size={13} aria-hidden="true" />{loading ? 'Đang tải' : wallet?.canWithdraw && !walletSyncError ? 'Sẵn sàng rút' : 'Chờ đủ điều kiện'}</>}
                {key === 'pending' && '10% gốc + Bậc'}
                {key === 'deal' && 'Deal% − (10% + Bậc)'}
                {key === 'locked' && 'Khấu trừ thuế TNCN 10%'}
              </span>
            </div>
            <div className="wallet-balance-label"><span>{label}</span>
              <button type="button" aria-label={`Giải thích: ${label}`} aria-expanded={activeInfoCard === key} onClick={() => setActiveInfoCard(activeInfoCard === key ? null : key)}><HelpCircle size={14} /></button>
            </div>
            <strong>{wallet ? formatMoney(value || '0') : '—'}</strong>
            <p>{note}</p>
          </div>
        ))}
      </section>

      {/* FULL-WIDTH BANNER GIẢI TRÌNH QUY CHẾ KHI NHẤP VÀO ICON HỎI (TRÁNH BIẾN DẠNG CARD) */}
      {activeInfoCard && (
        <div className="rounded-2xl border border-[#EEDFC6] bg-gradient-to-r from-[#FFFBEB] via-[#FDF9F0] to-[#FAF8F5] p-3.5 sm:p-4 text-xs shadow-xs animate-fadeIn relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0 shadow-2xs mt-0.5">
                {activeInfoCard === 'available' && <Wallet size={16} className="text-[#C59B58]" />}
                {activeInfoCard === 'pending' && <ShieldCheck size={16} className="text-[#D97706]" />}
                {activeInfoCard === 'deal' && <TrendingUp size={16} className="text-[#D97706]" />}
                {activeInfoCard === 'locked' && <Clock3 size={16} className="text-[#231D15]" />}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-[#1A1612] m-0">
                  {activeInfoCard === 'available' && 'Có thể rút'}
                  {activeInfoCard === 'pending' && 'Thù lao chờ đối soát'}
                  {activeInfoCard === 'deal' && 'Chênh lệch Deal đang giữ'}
                  {activeInfoCard === 'locked' && 'Yêu cầu rút tiền đang xử lý'}
                </h4>
                <p className="text-[11.5px] text-[#7D715E] leading-relaxed m-0">
                  {activeInfoCard === 'available' && 'Thu nhập đã đủ điều kiện rút về tài khoản liên kết. Thuế dự kiến được tính theo chính sách đang áp dụng và hiển thị trước khi gửi yêu cầu.'}
                  {activeInfoCard === 'pending' && 'Thù lao tiêu chuẩn bằng 10% cộng mức theo bậc KOL. Khoản đủ điều kiện được mở khóa sau 14 ngày từ khi giao thành công, không có đổi trả.'}
                  {activeInfoCard === 'deal' && 'Phần chênh lệch bằng Deal% − (10% + Bậc%). Khoản này chỉ được mở khóa khi đủ KPI và các đơn đã hoàn tất đối soát 14 ngày; không cộng dồn Deal với bậc.'}
                  {activeInfoCard === 'locked' && 'Số tiền đang được giữ trong ví để xử lý yêu cầu rút. Manager/Admin kiểm tra hồ sơ, chuyển khoản thủ công và lưu chứng từ xác nhận.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveInfoCard(null)}
              className="p-1 rounded-lg text-[#7D715E] hover:text-[#1A1612] hover:bg-white/80 transition cursor-pointer shrink-0"
              title="Đóng giải thích"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}





      {/* SECTION TÀI KHOẢN NHẬN TIỀN & YÊU CẦU RÚT TIỀN (SCANMS CREATOR COMPACT STYLE) */}
      <section hidden={walletPanel !== 'withdraw'} className="wallet-detail-panel wallet-payout-stack w-full min-w-0 grid! grid-cols-[minmax(280px,_.85fr)_minmax(0,_1.35fr)]! items-stretch! gap-[16px]! [&[hidden]]:hidden! [@media(max-width:1023px)]:grid-cols-[minmax(0,1fr)]! ">

        {/* Cột 1: Quản lý tài khoản ngân hàng thụ hưởng (VietQR) */}
        <div className={cn("wallet-bank-row min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 flex flex-col [&>div]:grid [&>div]:min-w-0 [&>div]:gap-4 [&>div]:flex-1 [&>div]:content-start", embedded && "wallet-bank-row [border:1px_solid_#eae4d7]! rounded-[16px]! bg-[#fff]! p-[16px_18px]! [box-shadow:0_2px_5px_#231d1504]! [&_>_div]:grid! [&_>_div]:grid-cols-[minmax(0,1fr)]! [&_>_div]:gap-[14px]! [&_>_div_>_div:first-child]:flex-row! [&_>_div_>_div:first-child]:items-center! [&_>_div_>_div:first-child]:justify-between! [&_>_div_>_div:first-child]:gap-[8px]! [&_>_div_>_div:first-child]:[border-top:0]! [&_>_div_>_div:first-child]:[border-right:0]! [&_>_div_>_div:first-child]:[border-left:0]! [&_>_div_>_div:first-child]:[border-bottom:1px_solid_#eae4d7]! [&_>_div_>_div:first-child]:p-[0_0_12px]! [&_h2]:text-[length:14px]! [&_h2]:font-[650]! [@media(max-width:639px)]:p-[14px]! ")}>
          <div>
            {/* Header: Tiêu đề + Badge bảo mật */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
                  <Landmark className="w-3.5 h-3.5 text-[#B88E4F]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">
                  Tài khoản nhận tiền
                </h2>
              </div>
              {showAddBankForm && <button type="button" className="wallet-bank-close" onClick={handleCancelAddBank} disabled={savingBank} aria-label="Hủy chỉnh sửa tài khoản"><X size={18} /></button>}
            </div>

            {/* Khi ĐÃ có tài khoản ngân hàng */}
            {wallet?.bankAccount && !showAddBankForm && (
              <div className={cn("wallet-bank-summary min-w-0 space-y-3", embedded && "wallet-bank-summary grid! grid-cols-[minmax(0,1fr)]! items-center! gap-[5px_18px]! [&_>_div:first-child]:col-[1]! ")}>
                {(() => {
                  const bankMatch = findBankByQuery(wallet.bankAccount.bankName);
                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Logo ngân hàng */}
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE4D7] flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                            {bankMatch?.logo ? (
                              <img
                                src={bankMatch.logo}
                                alt={bankMatch.shortName}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Landmark className="w-5 h-5 text-[#B88E4F]" />
                            )}
                          </div>

                          {/* Thông tin số tài khoản & tên chủ sở hữu */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-[#1A1612]">
                                {bankMatch ? bankMatch.shortName : wallet.bankAccount.bankName}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 mt-0.5">
                              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#1A1612] tracking-wider">
                                {wallet.bankAccount.maskedAccountNumber}
                              </span>
                              <span className="text-xs uppercase font-medium text-[#7D715E] truncate">
                                {wallet.bankAccount.accountName}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="wallet-bank-tools">
                        <button type="button" className="wallet-bank-change" onClick={handleEditBank}><RefreshCw size={14} />Đổi tài khoản</button>
                        <details className="wallet-bank-more"><summary aria-label="Thao tác tài khoản ngân hàng">•••</summary>
                          <div><p>{wallet.bankAccount.bankName}</p>{bankMatch?.bin && <p>BIN {bankMatch.bin}</p>}
                            <button type="button" onClick={() => void handleDisconnectBank()} disabled={savingBank}><Unlink size={14} />{savingBank ? 'Đang xử lý…' : 'Ngừng dùng tài khoản'}</button>
                          </div>
                        </details>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Khi CHƯA có tài khoản hoặc đang thu gọn: Nút Thêm mới chuẩn TikTok Shop */}
            {!wallet?.bankAccount && !showAddBankForm && (
              <button
                type="button"
                onClick={() => setShowAddBankForm(true)}
                className="mt-3.5 w-full p-3.5 sm:p-4 rounded-xl border border-dashed border-[#EEDFC6] hover:border-[#C59B58] bg-[#FAF8F5]/80 hover:bg-[#F3EFE6]/60 transition-all flex items-center justify-between gap-3 text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] group-hover:scale-105 transition-transform shrink-0 shadow-2xs">
                    <Landmark className="w-5 h-5 text-[#B88E4F]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1A1612] group-hover:text-[#B88E4F] transition-colors">
                      Liên kết tài khoản ngân hàng nhận tiền
                    </div>
                    <p className="text-[11px] text-[#7D715E] mt-0.5 truncate m-0">
                      Chọn ngân hàng và nhập thông tin tài khoản thụ hưởng
                    </p>
                  </div>
                </div>
                <div className="shrink-0 px-2.5 py-1 rounded-lg bg-[#C59B58] group-hover:bg-[#B88E4F] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thêm ngay</span>
                </div>
              </button>
            )}

            {showAddBankForm && (
              <form onSubmit={handleSaveBankInfo} className="wallet-bank-editor" noValidate>
                <div>
                  <label>Ngân hàng thụ hưởng</label>
                  <div className="wallet-bank-selection">
                    <div className="wallet-bank-logo">{selectedBank?.logo ? <img src={selectedBank.logo} alt="" /> : <Landmark size={20} />}</div>
                    <div className="wallet-bank-selected-name"><strong>{selectedBank.shortName}</strong><span>{selectedBank.name}</span></div>
                    <button type="button" onClick={() => setIsBankModalOpen(true)} disabled={savingBank}>Đổi <ChevronRight size={14} /></button>
                  </div>
                </div>
                <div>
                  <label htmlFor="wallet-bank-number">Số tài khoản</label>
                  <input id="wallet-bank-number" type="text" inputMode="numeric" autoComplete="off" required
                    placeholder="Nhập số tài khoản" value={accountNumberInput} disabled={savingBank}
                    aria-invalid={Boolean(bankErrors.number)} aria-describedby={bankErrors.number ? 'wallet-bank-number-error' : undefined}
                    onChange={e => { setAccountNumberInput(e.target.value.replace(/\D/g, '')); setBankErrors(current => ({ ...current, number: undefined, form: undefined })); }} />
                  {bankErrors.number && <p id="wallet-bank-number-error" role="alert" className="wallet-bank-error">{bankErrors.number}</p>}
                </div>
                <div>
                  <label htmlFor="wallet-bank-owner">Tên chủ tài khoản</label>
                  <input id="wallet-bank-owner" type="text" autoComplete="name" required
                    placeholder="NGUYEN VAN A" value={accountNameInput} disabled={savingBank}
                    aria-invalid={Boolean(bankErrors.name)} aria-describedby={bankErrors.name ? 'wallet-bank-owner-error' : undefined}
                    onChange={e => { setAccountNameInput(e.target.value.toUpperCase()); setBankErrors(current => ({ ...current, name: undefined, form: undefined })); }} />
                  {bankErrors.name && <p id="wallet-bank-owner-error" role="alert" className="wallet-bank-error">{bankErrors.name}</p>}
                </div>
                {bankErrors.form && <p role="alert" className="wallet-bank-error">{bankErrors.form}</p>}
                <div className="wallet-bank-editor-footer">
                <div className="wallet-bank-editor-actions">
                  <button type="button" onClick={handleCancelAddBank} disabled={savingBank}>Hủy</button>
                  <button type="submit" disabled={savingBank}>{savingBank && <Loader2 size={15} className="animate-spin" />}{savingBank ? 'Đang lưu…' : 'Lưu tài khoản'}</button>
                </div>
                <p className="wallet-bank-note"><ShieldCheck size={14} aria-hidden="true" />Thông tin phải khớp hồ sơ định danh.</p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Cột 2: Form Tạo yêu cầu rút tiền (SCANMS Creator Studio Standard) */}
        <form
          aria-label="Yêu cầu rút tiền"
          onSubmit={(event) => void handleWithdrawal(event)}
          className={cn("kol-wallet-transfer wallet-withdraw-row min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 flex flex-col gap-4", embedded && "kol-wallet-transfer wallet-withdraw-row rounded-xl border border-[#EAE4D7] bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between [border:1px_solid_#eae4d7]! rounded-[16px]! bg-[#fff]! p-[16px_18px]! [box-shadow:0_2px_5px_#231d1504]! [&_h2]:text-[length:14px]! [&_h2]:font-[650]! flex! flex-col! gap-[12px]! min-w-0! [@media(max-width:639px)]:p-[14px]! ")}
        >
          <div className={cn("wallet-withdraw-fields min-w-0 space-y-4", embedded && "wallet-withdraw-fields min-w-0! [&_>_div:first-child]:pb-[12px]! [&_>_div:first-child]:[border-bottom:0]! ")}>
            {/* Header: Tiêu đề + Giới hạn rút tối thiểu */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#B88E4F]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">
                  Yêu cầu rút tiền
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EAE4D7]">
                Tối thiểu: <strong className="text-[#1A1612] font-mono">{wallet ? formatMoney(wallet.minimumWithdrawalAmount) : "200.000 ₫"}</strong>
              </span>
            </div>


            <div className="wallet-withdraw-inputs wallet-amount-layout">
            {/* Số tiền rút + Nút rút toàn bộ */}
            <div>
              <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2">
                <label
                  htmlFor="withdrawal-amount"
                  className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider"
                >
                  Số tiền muốn rút
                </label>
                {wallet && effectiveStoreAvailable > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(Math.floor(effectiveStoreAvailable).toString());
                    }}
                    className="text-[11px] font-bold text-[#B88E4F] hover:text-[#1A1612] transition cursor-pointer select-none"
                  >
                    Rút tối đa
                  </button>
                )}
              </div>

              <div className="relative wallet-amount-control">
                <input
                  id="withdrawal-amount"
                  aria-invalid={Boolean(amountHint)}
                  aria-describedby={amountHint ? 'withdrawal-amount-hint' : undefined}
                  type="text"
                  inputMode="numeric"
                  value={amount ? new Intl.NumberFormat('vi-VN').format(BigInt(amount)) : ''}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const beforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
                    setAmount(input.value.replace(/\D/g, '').slice(0, 16));
                    requestAnimationFrame(() => {
                      let digits = 0;
                      let position = 0;
                      while (position < input.value.length && digits < beforeCaret) {
                        if (/\d/.test(input.value[position])) digits++;
                        position++;
                      }
                      input.setSelectionRange(position, position);
                    });
                  }}
                  placeholder="Nhập số tiền"
                  required
                  maxLength={21}
                  disabled={submitting || loading}
                  className="w-full h-12 px-3.5 pr-14 bg-white rounded-xl border border-[#EAE4D7] tabular-nums text-sm font-semibold text-[#1A1612] placeholder:text-[#A89E90] placeholder:font-normal outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition disabled:bg-[#FAF8F5]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#7D715E] pointer-events-none select-none">
                  đ
                </span>
              </div>


              {amountHint && <p id="withdrawal-amount-hint" role="status" className="mt-2 text-xs text-[#DC2626]">{amountHint}</p>}
              <div className="wallet-quick-group">
              <div className="wallet-available-line"><span>Có thể rút</span><strong>{wallet ? formatMoney(wallet.availableBalance) : '—'}</strong></div>
              {/* Quick shortcut pills */}
              <div className="wallet-quick-amounts">
                {[200000, 500000, 1000000].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => setAmount(quickVal.toString())}
                    disabled={submitting || loading}
                    aria-pressed={amount === quickVal.toString()}
                    className="px-2 py-0.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[10.5px] font-mono font-semibold text-[#1A1612] transition cursor-pointer disabled:opacity-40"
                  >
                    {new Intl.NumberFormat("vi-VN").format(quickVal)} ₫
                  </button>
                ))}
              </div>
              </div>

            </div>

            </div>
            {/* Bảng tính thực nhận dự kiến & thuế khấu trừ TNCN */}
            {wallet && validPreviewAmount && grossMinor > 0n && (
              <div className="wallet-estimate rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] p-3 text-xs space-y-1.5">
                <div className="flex justify-between gap-3 text-xs text-[#7D715E]">
                  <span>Số tiền yêu cầu</span>
                  <span className="font-semibold font-mono text-[#1A1612]">{previewMoney(grossMinor)}</span>
                </div>
                  <div className="flex justify-between gap-3 text-xs text-[#7D715E]">
                    <span className="flex items-center gap-1">
                      <span>Thuế TNCN (10%)</span>
                    </span>
                    <span className="font-semibold font-mono text-[#DC2626]" data-testid="withdrawal-tax-preview">
                      {taxMinor > 0n ? '−' : ''}{previewMoney(taxMinor)}
                    </span>
                  </div>
                <div className="flex justify-between items-center gap-3 text-xs sm:text-sm font-bold border-t border-[#EEDFC6] pt-1.5">
                  <span className="text-[#1A1612]">Thực nhận dự kiến</span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[#B88E4F]" data-testid="withdrawal-net-preview">
                    {previewMoney(grossMinor - taxMinor)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Nút gửi yêu cầu & Chú thích */}
          <div className={cn("wallet-withdraw-actions mt-auto pt-1", embedded && "wallet-withdraw-actions pt-[0]! w-full! [&_>_button]:h-[42px]! [&_>_button]:[border:1px_solid_#c59b58]! [&_>_button]:bg-[#c59b58]! [&_>_button]:text-[#1a1612]! [&_>_button]:text-[length:12px]! [&_>_button]:font-[600]! [&_>_button:not(:disabled):hover]:bg-[#b88e4f]! [&_>_button:disabled]:bg-[#f3efe6]! [&_>_button:disabled]:border-[#eae4d7]! [&_>_button:disabled]:text-[#7d715e]! [&_>_button:disabled]:opacity-[.7]! [&_>_div]:[border:0]! [&_>_div]:p-[0]! [&_>_div]:bg-[transparent]! [&_>_div]:text-[length:10px]! [&_>_div]:leading-[16px]! ")}>
            <button
              type="submit"
              disabled={submitting || loading || !isWithdrawEligible}
              data-testid="wallet-withdraw-submit"
              className="wallet-withdraw-submit w-full h-10 sm:h-11 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[#1A1612] font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              <span>{submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu rút tiền"}</span>
            </button>
            <p className="wallet-withdraw-caption">Tiền được chuyển sau khi yêu cầu được duyệt.</p>
            {wallet && !isWithdrawEligible && (
              <div className="kol-wallet-notice mt-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EEDFC6] text-[11px] text-[#7D715E] space-y-1.5">
                <div className="font-bold text-[#1A1612]">Điều kiện rút tiền:</div>
                {!wallet.bankAccount && (

                  <div className="text-[#D97706] font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />

                    <span>Chưa liên kết tài khoản ngân hàng nhận tiền.</span>
                  </div>
                )}
                {wallet.kycStatus !== 'VERIFIED' && (

                  <div className="text-[#D97706] font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#B88E4F]" />
                    <span>Hồ sơ định danh KYC cần được thẩm định trước khi rút.</span>
                    <button type="button" onClick={() => navigate('/collaborator/profile?tab=kyc')} className="underline text-[#B88E4F] ml-1 cursor-pointer">Mở hồ sơ định danh</button>
                  </div>

                )}
                {Number(wallet.availableBalance) < Number(wallet.minimumWithdrawalAmount) && (
                  <div className="text-[#7D715E] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-[#B88E4F]" />
                    <span>Số dư khả dụng tối thiểu để tạo yêu cầu rút: <strong className="font-mono text-[#1A1612]">{formatMoney(wallet.minimumWithdrawalAmount)}</strong>.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </section>
            {/* KHỐI BIẾN ĐỘNG TÀI CHÍNH GẦN NHẤT TRÊN TAB VÍ & RÚT TIỀN (LẤP ĐẦY TRANG & MINH BẠCH SỔ CÁI) */}
      {walletPanel === 'withdraw' && <LedgerHistoryPanel compact ledger={recentLedger} loading={loading} page={1} filters={{}}
        onFilters={handleLedgerFilters} onPage={setLedgerPage} onCopy={id => void handleCopyId(id, 'mã giao dịch')}
        onViewAll={() => { handleLedgerFilters({}); setWalletPanel('history'); setSearchParams({ section: 'ledger' }); }}
        onPayout={id => { setWalletPanel('history'); setWithdrawalStatus(''); setPage(1); setSearchParams({ payoutId: id }); }} />}

              {/* 1. LỊCH SỬ YÊU CẦU RÚT TIỀN (FINTECH & SCANMS COMPACT E-COMMERCE STYLE) */}
      {/* 2. NHÃN HÀNG ĐỐI TÁC & PHÂN BỔ THU NHẬP */}
      <div className="wallet-detail-panel" hidden={walletPanel !== 'stores'}>
        <WalletFinancialBreakdown
          wallet={wallet}
          formatMoney={formatMoney}
          onViewTransactions={() => setWalletPanel('history')}
        />
      </div>

      <div hidden={walletPanel !== 'history'} className="wallet-detail-panel wallet-history-section">
        <WithdrawalHistoryPanel history={history} loading={loading} page={page} status={withdrawalStatus}
          onStatus={status => { setWithdrawalStatus(status); setPage(1); if (focusedPayoutId) setSearchParams({}); }} onPage={setPage}
          onCopy={id => void handleCopyId(id, 'mã yêu cầu')}
          onCreateNew={() => { setWalletPanel('withdraw'); setAmount(''); }} canCreateNew={isWithdrawEligible} />
      </div>

      {/* 2. BIẾN ĐỘNG TÀI CHÍNH GẦN NHẤT (SỔ CÁI MINH BẠCH - APPEND-ONLY LEDGER) */}
      <div hidden={walletPanel !== 'history'} className="wallet-detail-panel wallet-ledger-section">
        <LedgerHistoryPanel ledger={ledger} page={ledgerPage} loading={loading} filters={ledgerFilters}
          onFilters={handleLedgerFilters} onPage={setLedgerPage} onCopy={id => void handleCopyId(id, 'mã giao dịch')}
          onPayout={id => { setWithdrawalStatus(''); setPage(1); setSearchParams({ payoutId: id }); }} />
      </div>
        </>
      )}

      {createLinkOpen && <Suspense fallback={<p role="status" className="text-xs text-[#7D715E]">Đang mở hộp tạo link…</p>}><CreateWalletReferralLink modalOnly onCreateClose={() => setCreateLinkOpen(false)} /></Suspense>}

      {/* Modal Chọn Danh Sách Ngân Hàng Việt Nam (Ảnh 2) */}
      <BankSelectorModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onSelectBank={handleBankChosen}
        selectedBankName={wallet?.bankAccount?.bankName}
      />

      {/* Modal Xác nhận Ngừng sử dụng tài khoản ngân hàng chuẩn thương hiệu */}
      <ConfirmModal
        isOpen={isDisconnectConfirmOpen}
        onClose={() => !savingBank && setIsDisconnectConfirmOpen(false)}
        onConfirm={handleConfirmDisconnectBank}
        isLoading={savingBank}
        title="Ngừng sử dụng tài khoản ngân hàng"
        message="Bạn có chắc chắn muốn ngừng sử dụng tài khoản nhận tiền này? Sau khi gỡ, bạn có thể liên kết tài khoản ngân hàng mới bất kỳ lúc nào."
        confirmText="Ngừng sử dụng"
        variant="danger"
      />
    </div>
  );
}
