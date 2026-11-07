import { PartnerTaxStatements } from '../../components/wallet/FinanceReports';
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
  ArrowDownLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Unlink,
  Store,
  TrendingUp,
  Receipt,
  ReceiptText,
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
import { WalletSectionHeader } from '../../components/ui/WalletSectionHeader';
import { WalletFinancialBreakdown } from '../../components/wallet/WalletFinancialBreakdown';

import { type VietQrBank, findBankByQuery, VIETNAM_BANKS } from "@/config/banks.config";
import type {
  PayoutStatus,
  WalletSummary,
  WithdrawalHistory,
  LedgerHistory,
  LedgerEntry,
} from "../../services/wallet.service";

const STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Chờ chuyển khoản",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

const formatMoney = (amount: string) =>
  `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(amount))} ₫`;

const TRANSACTION_LABELS: Record<LedgerEntry["transactionType"], string> = {
  COMMISSION_PENDING: "Ghi nhận hoa hồng chờ",
  COMMISSION_APPROVED: "Duyệt hoa hồng / cộng thưởng",
  PAYOUT_WITHDRAW: "Yêu cầu rút tiền",
  REVERSAL: "Thu hồi hoa hồng",
  PAYOUT_REJECT_REFUND: "Hoàn tiền yêu cầu rút",
};

const REFERENCE_LABELS: Record<string, string> = {
  COMMISSION: 'Hoa hồng', PAYOUT_REQUEST: 'Yêu cầu rút tiền', MONTHLY_BONUS: 'Thưởng tháng',
  ORDER_REFUND: 'Hoàn tiền đơn hàng', ORDER_PAYMENT: 'Thanh toán đơn hàng',
  TOPUP_DEMO: 'Nạp tiền kiểm thử', TOPUP_PAYOS: 'Nạp tiền',
  WALLET_RECONCILIATION: 'Đối soát số dư', RECONCILIATION_ORDER: 'Đối soát thanh toán cũ',
};

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
  const [ledgerPage, setLedgerPage] = useState(1);
  const [walletPanel, setWalletPanel] = useState<'withdraw' | 'stores' | 'history'>(() => searchParams.has('payoutId') ? 'history' : 'withdraw');
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(() => !lastWalletSnapshot?.wallet);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submissionInFlight = useRef(false);
  const loadSequence = useRef(0);
  const walletReadSequence = useRef(0);
  const walletBusy = useRef(false);
  const [walletSyncError, setWalletSyncError] = useState('');
  const [activeInfoCard, setActiveInfoCard] = useState<'available' | 'pending' | 'deal' | 'locked' | null>(null);
  const ledgerSectionRequested = searchParams.get('section') === 'ledger';

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
  walletBusy.current = submitting || savingBank;
  useEffect(() => {
    onBusyChange?.(submitting || savingBank);
    return () => onBusyChange?.(false);
  }, [submitting, savingBank, onBusyChange]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  const handleCopyId = async (id: string, label: string = 'mã') => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast.success(`Đã sao chép ${label}: ${id.slice(0, 12)}...`);
      setTimeout(() => setCopiedId(null), 2000);
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
    const bankToSave = selectedBank || defaultBank;
    if (!accountNumberInput.trim() || !accountNameInput.trim()) {
      toast.error("Vui lòng nhập đầy đủ số tài khoản và họ tên chủ tài khoản");
      return;
    }
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
      toast.error(err?.response?.data?.message || err?.message || "Lỗi lưu tài khoản");
    } finally {
      setSavingBank(false);
    }
  };

  const handleCancelAddBank = () => {
    setAccountNumberInput("");
    setShowAddBankForm(false);
  };

  const loadWallet = useCallback(async (background = false, forceFresh = false) => {
    if (background && (walletReadSequence.current || walletBusy.current || submissionInFlight.current)) return;
    const sequence = ++loadSequence.current;
    walletReadSequence.current = sequence;
    if (!background && !wallet) setLoading(true);
    try {
      const [summary, withdrawals, ledgerHistory] = await Promise.all([
        walletService.getMyWallet(forceFresh),
        walletService.getMyWithdrawals(page, forceFresh),
        walletService.getMyLedger(ledgerPage),
      ]);
      if (sequence !== loadSequence.current) return;
      setWallet(summary);

      setHistory(withdrawals);
      setLedger(ledgerHistory);
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
  }, [page, ledgerPage]);

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
  const isWithdrawEligible = Boolean(
    !walletSyncError && wallet?.canWithdraw &&
      toMinorUnits(wallet.availableBalance) >= toMinorUnits(wallet.minimumWithdrawalAmount)
  );
  const taxMinor =
    wallet && grossMinor > 0n
      ? (grossMinor * toMinorUnits(wallet.withdrawalTaxPolicy.rate) + 50n) /
        100n
      : 0n;
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
    setSuccess("");
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
      setSuccess(`Đã tạo yêu cầu rút tiền ${payoutDisplayCode(result.request.id, result.request.createdAt)}. Đang chờ duyệt; tiền chưa chuyển về ngân hàng.`);
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
      {success && (
        <div
          role="status"
          className="rounded-xl border border-brand-border bg-brand-soft p-4 text-sm text-ink"
        >
          {success}
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
      <section className="kol-wallet-balances grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch" aria-label="Tổng quan 4 giỏ thù lao minh bạch" aria-busy={loading}>
        {/* Card 1: Khả dụng rút tiền Napas */}
        <div className={cn(
          "relative rounded-2xl border bg-gradient-to-b from-white via-white to-[#FDFBF7] p-4.5 shadow-xs transition-all duration-200 flex flex-col justify-between hover:shadow-md min-h-[178px]",
          activeInfoCard === 'available' ? "border-[#C59B58] ring-2 ring-[#C59B58]/30 shadow-md" : "border-[#E8DEC8] hover:border-[#C59B58]"
        )}>
          <div>
            {/* Hàng 1: Icon + Badge trạng thái độc lập */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shadow-2xs">
                <Wallet size={18} />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#FDE68A] bg-[#FEF3C7] text-[10.5px] font-bold text-[#92400E] shadow-2xs whitespace-nowrap">
                {!walletSyncError && wallet?.canWithdraw ? <CheckCircle2 size={12} className="text-[#059669]" /> : <Clock3 size={12} />}
                <span>{loading ? 'Đang tải' : wallet?.canWithdraw ? '⚡ Sẵn sàng rút' : 'Chờ đối soát'}</span>
              </span>
            </div>

            {/* Hàng 2: Tiêu đề đầy đủ không bị cắt chữ */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-[#6B5E4B] tracking-wide uppercase">
                Khả Dụng Rút Tiền
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoCard(activeInfoCard === 'available' ? null : 'available')}
                className={cn(
                  "p-0.5 rounded-full transition cursor-pointer",
                  activeInfoCard === 'available' ? "text-[#B88E4F] bg-[#FBF5EB]" : "text-[#A89E90] hover:text-[#B88E4F]"
                )}
                title="Xem quy chế & giải thích"
              >
                <HelpCircle size={13} />
              </button>
            </div>

            {/* Hàng 3: Số tiền to rõ ràng */}
            <div>
              <strong className="block text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1A1612] tabular-nums">
                {wallet ? formatMoney(wallet.availableBalance) : "—"}
              </strong>
            </div>
          </div>

          {/* Hàng 4: Chú thích chân card chuẩn 1 hàng */}
          <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between text-[11px] leading-tight mt-3">
            <span className="text-[#7D715E]">Mức rút tối thiểu:</span>
            <span className="font-semibold text-[#1A1612] tabular-nums font-mono">
              {wallet ? formatMoney(wallet.minimumWithdrawalAmount) : '200.000 ₫'}
            </span>
          </div>
        </div>

        {/* Card 2: Chờ 14 Ngày Đối Soát (Gốc 10% + Bậc) */}
        <div className={cn(
          "relative rounded-2xl border bg-gradient-to-b from-white via-white to-[#FAF6EE] p-4.5 shadow-xs transition-all duration-200 flex flex-col justify-between hover:shadow-md min-h-[178px]",
          activeInfoCard === 'pending' ? "border-[#D97706] ring-2 ring-[#D97706]/30 shadow-md" : "border-[#E8DEC8] hover:border-[#D97706]/70"
        )}>
          <div>
            {/* Hàng 1: Icon + Badge trạng thái độc lập */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shadow-2xs">
                <ShieldCheck size={18} />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-[10.5px] font-bold text-[#8C6226] shadow-2xs whitespace-nowrap">
                <Clock size={11} /> 10% Gốc + Bậc
              </span>
            </div>

            {/* Hàng 2: Tiêu đề đầy đủ không bị cắt chữ */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-[#6B5E4B] tracking-wide uppercase">
                Chờ Đối Soát 14 Ngày
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoCard(activeInfoCard === 'pending' ? null : 'pending')}
                className={cn(
                  "p-0.5 rounded-full transition cursor-pointer",
                  activeInfoCard === 'pending' ? "text-[#D97706] bg-[#FFFBEB]" : "text-[#A89E90] hover:text-[#D97706]"
                )}
                title="Xem quy chế & giải thích"
              >
                <HelpCircle size={13} />
              </button>
            </div>

            {/* Hàng 3: Số tiền to rõ ràng */}
            <div>
              <strong className="block text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1A1612] tabular-nums">
                {wallet ? formatMoney(wallet.pendingBalance) : "—"}
              </strong>
            </div>
          </div>

          {/* Hàng 4: Chú thích chân card chuẩn 1 hàng */}
          <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between text-[11px] leading-tight mt-3">
            <span className="text-[#7D715E]">Bảo đảm thù lao:</span>
            <span className="font-semibold text-[#059669]">
              Sau 14 ngày sạch
            </span>
          </div>
        </div>

        {/* Card 3: Thù lao Deal VIP Ký Quỹ KPI (Điểm nhấn Vàng Cam nổi bật) */}
        <div className={cn(
          "relative rounded-2xl border bg-gradient-to-b from-white via-[#FFFDF5] to-[#FEF3C7]/40 p-4.5 shadow-[0_4px_16px_rgba(245,158,11,0.09)] transition-all duration-200 flex flex-col justify-between hover:shadow-lg min-h-[178px]",
          activeInfoCard === 'deal' ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/50 shadow-md" : "border-[#FCD34D] hover:border-[#F59E0B]"
        )}>
          <div>
            {/* Hàng 1: Icon + Badge trạng thái độc lập */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shadow-xs">
                <TrendingUp size={18} />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#FCD34D] bg-[#FEF3C7] text-[10.5px] font-bold text-[#B45309] shadow-2xs whitespace-nowrap">
                Deal% − (10%+Bậc)
              </span>
            </div>

            {/* Hàng 2: Tiêu đề đầy đủ không bị cắt chữ */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-[#B45309] tracking-wide uppercase">
                Ký Quỹ KPI Deal
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoCard(activeInfoCard === 'deal' ? null : 'deal')}
                className={cn(
                  "p-0.5 rounded-full transition cursor-pointer",
                  activeInfoCard === 'deal' ? "text-[#D97706] bg-[#FEF3C7]" : "text-[#A89E90] hover:text-[#D97706]"
                )}
                title="Xem quy chế & giải thích"
              >
                <HelpCircle size={13} />
              </button>
            </div>

            {/* Hàng 3: Số tiền to rõ ràng với màu Vàng Cam điểm nhấn */}
            <div>
              <strong className="block text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#B45309] tabular-nums">
                {wallet ? formatMoney(wallet.conditionalDealEscrowBalance || '0') : "0 ₫"}
              </strong>
            </div>
          </div>

          {/* Hàng 4: Chú thích chân card chuẩn 1 hàng */}
          <div className="pt-3 border-t border-[#FCD34D]/70 flex items-center justify-between text-[11px] leading-tight mt-3">
            <span className="text-[#8C6226]">Điều kiện giải tỏa:</span>
            <span className="font-semibold text-[#D97706]">
              {Number(wallet?.conditionalDealEscrowBalance || 0) > 0 ? 'Đạt đủ 100% KPI' : 'Không có thỏa thuận'}
            </span>
          </div>
        </div>

        {/* Card 4: Đang Khóa Chờ Chi (lockedPayoutBalance) */}
        <div className={cn(
          "relative rounded-2xl border bg-gradient-to-b from-white via-white to-[#FAF8F5] p-4.5 shadow-xs transition-all duration-200 flex flex-col justify-between hover:shadow-md min-h-[178px]",
          activeInfoCard === 'locked' ? "border-[#231D15] ring-2 ring-[#231D15]/30 shadow-md" : "border-[#E8DEC8] hover:border-[#7D715E]"
        )}>
          <div>
            {/* Hàng 1: Icon + Badge trạng thái độc lập */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] flex items-center justify-center shadow-2xs">
                <Clock3 size={18} />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#EAE4D7] bg-[#F3EFE6] text-[10.5px] font-bold text-[#231D15] shadow-2xs whitespace-nowrap">
                Thuế TNCN 10%
              </span>
            </div>

            {/* Hàng 2: Tiêu đề đầy đủ không bị cắt chữ */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-[#6B5E4B] tracking-wide uppercase">
                Đang Chờ Giải Ngân
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoCard(activeInfoCard === 'locked' ? null : 'locked')}
                className={cn(
                  "p-0.5 rounded-full transition cursor-pointer",
                  activeInfoCard === 'locked' ? "text-[#231D15] bg-[#F3EFE6]" : "text-[#A89E90] hover:text-[#231D15]"
                )}
                title="Xem quy chế & giải thích"
              >
                <HelpCircle size={13} />
              </button>
            </div>

            {/* Hàng 3: Số tiền to rõ ràng */}
            <div>
              <strong className="block text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1A1612] tabular-nums">
                {wallet ? formatMoney(wallet.lockedPayoutBalance || '0') : "0 ₫"}
              </strong>
            </div>
          </div>

          {/* Hàng 4: Chú thích chân card chuẩn 1 hàng */}
          <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between text-[11px] leading-tight mt-3">
            <span className="text-[#7D715E]">Tiến độ xử lý:</span>
            <span className="font-semibold text-[#7D715E]">
              {Number(wallet?.lockedPayoutBalance || 0) > 0 ? 'Kế toán đang xử lý' : 'Không có lệnh chờ'}
            </span>
          </div>
        </div>
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
                  {activeInfoCard === 'available' && 'Quy chế Khả dụng Rút tiền (Napas 24/7)'}
                  {activeInfoCard === 'pending' && 'Quy chế Thù lao Tiêu chuẩn 14 Ngày (10% Gốc + Bậc)'}
                  {activeInfoCard === 'deal' && 'Quy chế Ký quỹ Thưởng Deal Độc quyền [Deal% − (10% + Bậc)]'}
                  {activeInfoCard === 'locked' && 'Quy trình Khấu trừ Thuế TNCN 10% & Giải ngân Kế toán'}
                </h4>
                <p className="text-[11.5px] text-[#7D715E] leading-relaxed m-0">
                  {activeInfoCard === 'available' && 'Thu nhập đã hoàn tất 14 ngày bảo chứng đối soát sạch không có yêu cầu đổi trả hàng. Bạn có thể rút ngay về tài khoản ngân hàng liên kết mọi lúc 24/7 (hệ thống tự động khấu trừ 10% thuế TNCN tại nguồn nộp cơ quan thuế).'}
                  {activeInfoCard === 'pending' && 'Bao gồm 10% Thù lao cơ bản cố định toàn hệ thống cộng thêm Thưởng Cấp bậc KOL (+0% Đồng, +1% Bạc, +2% Vàng, +3% Kim Cương). Khoản này được bảo chứng an toàn và sẽ tự động kết chuyển 100% sang Số dư khả dụng đúng 14 ngày sau khi đơn giao thành công.'}
                  {activeInfoCard === 'deal' && 'Khoản tiền chênh lệch giữa Deal thỏa thuận và Thù lao tiêu chuẩn [Deal% − (10% + Bậc%)]. Nguyên tắc kế toán bất biến: Tuyệt đối không cộng dồn Deal với Bậc. Khoản tiền này được ký quỹ an toàn và giải ngân tự động khi thỏa thuận đạt đủ 100% chỉ tiêu KPI cam kết.'}
                  {activeInfoCard === 'locked' && 'Lệnh rút tiền đã được hệ thống tiếp nhận và khóa an toàn tại ngân hàng thụ hưởng (Row-Level Locking). Chuyên viên kế toán đối soát hồ sơ và thực hiện chuyển khoản Napas 24/7, xuất biên lai khấu trừ 10% thuế TNCN.'}
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
      <section hidden={walletPanel !== 'withdraw'} className="wallet-detail-panel wallet-payout-stack grid! grid-cols-[minmax(260px,_.7fr)_minmax(0,_1.3fr)]! items-stretch! gap-[16px]! [@media(max-width:1023px)]:grid-cols-[minmax(0,1fr)]! ">

        {/* Cột 1: Quản lý tài khoản ngân hàng thụ hưởng (VietQR) */}
        <div className={cn("wallet-bank-row", embedded && "wallet-bank-row [border:1px_solid_#eae4d7]! rounded-[16px]! bg-[#fff]! p-[16px_18px]! [box-shadow:0_2px_5px_#231d1504]! [&_>_div]:grid! [&_>_div]:grid-cols-[minmax(0,1fr)]! [&_>_div]:gap-[14px]! [&_>_div_>_div:first-child]:flex-row! [&_>_div_>_div:first-child]:items-center! [&_>_div_>_div:first-child]:justify-between! [&_>_div_>_div:first-child]:gap-[8px]! [&_>_div_>_div:first-child]:[border-top:0]! [&_>_div_>_div:first-child]:[border-right:0]! [&_>_div_>_div:first-child]:[border-left:0]! [&_>_div_>_div:first-child]:[border-bottom:1px_solid_#eae4d7]! [&_>_div_>_div:first-child]:p-[0_0_12px]! [&_h2]:text-[length:14px]! [&_h2]:font-[650]! [@media(max-width:639px)]:p-[14px]! ")}>
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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7D715E] bg-white px-2 py-0.5 rounded-full border border-[#EAE4D7]">
                <ShieldCheck className="w-3 h-3 text-[#B88E4F]" />
                <span>VietQR 65+</span>
              </span>
            </div>

            {/* Khi ĐÃ có tài khoản ngân hàng */}
            {wallet?.bankAccount && !showAddBankForm && (
              <div className={cn("wallet-bank-summary", embedded && "wallet-bank-summary grid! grid-cols-[minmax(0,1fr)]! items-center! gap-[5px_18px]! [&_>_div:first-child]:col-[1]! ")}>
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

                      {/* Phân cách & Nút Thao tác */}
                      <p className={cn("wallet-bank-caption", embedded && "wallet-bank-caption col-[1]! m-[0]! pl-[52px]! text-[length:11px]! text-[#7d715e]! leading-[17px]! [@media(max-width:639px)]:pl-[0]! ")}>Nhận tiền sau khi yêu cầu rút được xử lý.</p>
                      <section className="wallet-bank-manage" aria-label="Quản lý tài khoản">
                        <div className="wallet-bank-management-heading">
                          <h3>Quản lý tài khoản</h3>
                          {bankMatch?.bin && <span>BIN {bankMatch.bin}</span>}
                        </div>
                        <p className="wallet-bank-management-name">{wallet.bankAccount.bankName}</p>
                        <div className="wallet-bank-management-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddBankForm(true);
                              setIsBankModalOpen(true);
                            }}
                            className="wallet-bank-change"
                          >
                            <RefreshCw size={13} aria-hidden="true" />
                            Đổi tài khoản
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDisconnectBank()}
                            disabled={savingBank}
                            className="wallet-bank-disconnect"
                          >
                            <Unlink size={13} aria-hidden="true" />
                            {savingBank ? "Đang xử lý..." : "Ngừng dùng"}
                          </button>
                        </div>
                      </section>
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

            {/* Form Thêm/Đổi tài khoản ngân hàng (Thiết kế tinh gọn, chuẩn e-commerce) */}
            {showAddBankForm && (
              <div className="mt-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]">
                  <h3 className="text-xs sm:text-sm font-bold text-[#1A1612] m-0">
                    {wallet?.bankAccount ? "Cập nhật tài khoản thụ hưởng" : "Thêm tài khoản ngân hàng nhận tiền"}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancelAddBank}
                    className="text-xs font-medium text-[#7D715E] hover:text-[#DC2626] transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                </div>

                <form onSubmit={handleSaveBankInfo} className="mt-3 space-y-3">
                  {/* Ngân hàng đã chọn */}
                  <div>
                    <label className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider block mb-1">
                      Ngân hàng thụ hưởng
                    </label>
                    <div className="rounded-xl border border-[#EAE4D7] bg-white p-2.5 sm:p-3 flex items-center justify-between gap-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center p-1 shrink-0">
                          {selectedBank?.logo ? (
                            <img
                              src={selectedBank.logo}
                              alt={selectedBank.shortName}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <Landmark className="w-4 h-4 text-[#B88E4F]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-[#1A1612]">
                              {selectedBank?.shortName || "MBBank"}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                              BIN: {selectedBank?.bin || "970422"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7D715E] truncate m-0">
                            {selectedBank?.name || "Ngân hàng TMCP Quân đội"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsBankModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#1A1612] transition shadow-2xs shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <span>Đổi</span>
                        <ChevronRight className="w-3 h-3 text-[#7D715E]" />
                      </button>
                    </div>
                  </div>

                  {/* 2 Trường nhập liệu nhỏ gọn song song trên tablet/desktop */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider block mb-1">
                        Tên chủ tài khoản
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: NGUYEN VAN A"
                        value={accountNameInput}
                        onChange={(e) => setAccountNameInput(e.target.value.toUpperCase())}
                        className="w-full h-9 sm:h-9.5 px-3 bg-white border border-[#EAE4D7] rounded-xl text-xs sm:text-sm font-bold uppercase text-[#1A1612] placeholder:text-[#A89E90] placeholder:font-normal placeholder:normal-case outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider block mb-1">
                        Số tài khoản
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 0987654321..."
                        value={accountNumberInput}
                        onChange={(e) => setAccountNumberInput(e.target.value.trim())}
                        className="w-full h-9 sm:h-9.5 px-3 bg-white border border-[#EAE4D7] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#1A1612] placeholder:text-[#A89E90] placeholder:font-normal outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition"
                      />
                    </div>
                  </div>

                  {/* Nút Đăng ký tài khoản */}
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="w-full h-9.5 sm:h-10 rounded-xl text-xs sm:text-sm font-bold border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] hover:border-[#C59B58] text-[#1A1612] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingBank ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu thông tin tài khoản</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Cột 2: Form Tạo yêu cầu rút tiền (SCANMS Creator Studio Standard) */}
        <form
          aria-label="Yêu cầu rút tiền"
          onSubmit={(event) => void handleWithdrawal(event)}
          className={cn("kol-wallet-transfer wallet-withdraw-row", embedded && "kol-wallet-transfer wallet-withdraw-row rounded-xl border border-[#EAE4D7] bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between [border:1px_solid_#eae4d7]! rounded-[16px]! bg-[#fff]! p-[16px_18px]! [box-shadow:0_2px_5px_#231d1504]! [&_h2]:text-[length:14px]! [&_h2]:font-[650]! flex! flex-col! gap-[12px]! min-w-0! [@media(max-width:639px)]:p-[14px]! ")}
        >
          <div className={cn("wallet-withdraw-fields", embedded && "wallet-withdraw-fields min-w-0! [&_>_div:first-child]:pb-[12px]! [&_>_div:first-child]:[border-bottom:0]! ")}>
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


            <div className="wallet-withdraw-inputs grid! grid-cols-[1fr_1fr]! gap-[16px]! [&_label]:normal-case! [&_label]:tracking-[0]! [&_label]:font-[500]! [&_label]:text-[length:11px]! [@media(max-width:639px)]:grid-cols-[1fr]! [@media(max-width:639px)]:gap-[12px]! ">
            {/* Nguồn tiền chi trả */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
                  Nguồn tiền chi trả
                </label>
                <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Hệ thống SCANMS chi trả</span>
                </span>
              </div>
              <div className="w-full h-10 px-3.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-between text-xs sm:text-sm select-none">
                <span className="text-[#7D715E] font-medium">Toàn bộ ví khả dụng:</span>
                <span className="font-bold text-[#1A1612] font-mono text-sm tabular-nums">
                  {wallet ? formatMoney(wallet.availableBalance) : '0 ₫'}
                </span>
              </div>
            </div>

            {/* Số tiền rút + Nút rút toàn bộ */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="withdrawal-amount"
                  className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider"
                >
                  Số tiền muốn rút (VNĐ)
                </label>
                {wallet && effectiveStoreAvailable > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(Math.floor(effectiveStoreAvailable).toString());
                    }}
                    className="text-[11px] font-bold text-[#B88E4F] hover:text-[#1A1612] transition cursor-pointer select-none"
                  >
                    Rút toàn bộ ({formatMoney(effectiveStoreAvailable.toString())})
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="withdrawal-amount"
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
                  placeholder="VD: 500000"
                  required
                  maxLength={16}
                  disabled={submitting || loading}
                  className="w-full h-10 px-3.5 pr-14 bg-white rounded-xl border border-[#EAE4D7] font-mono text-sm font-bold text-[#1A1612] placeholder:text-[#A89E90] placeholder:font-normal outline-none focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/20 transition disabled:bg-[#FAF8F5]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#7D715E] pointer-events-none select-none">
                  VNĐ
                </span>
              </div>


              {/* Quick shortcut pills */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10.5px] text-[#7D715E] font-medium mr-0.5">Gợi ý nhanh:</span>
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
            {/* Bảng tính thực nhận dự kiến & thuế khấu trừ TNCN */}
            {wallet && validPreviewAmount && (
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] p-3 text-xs space-y-1.5">
                <div className="flex justify-between gap-3 text-xs text-[#7D715E]">
                  <span>Yêu cầu rút</span>
                  <span className="font-semibold font-mono text-[#1A1612]">{previewMoney(grossMinor)}</span>
                </div>
                {taxMinor > 0n && (
                  <div className="flex justify-between gap-3 text-xs text-[#7D715E]">
                    <span className="flex items-center gap-1">
                      <span>Thuế TNCN khấu trừ ({Number(wallet.withdrawalTaxPolicy.rate) * 100}%)</span>
                      <span className="text-[10px] text-[#A89E90]">(tại nguồn)</span>
                    </span>
                    <span className="font-semibold font-mono text-[#DC2626]" data-testid="withdrawal-tax-preview">
                      -{previewMoney(taxMinor)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-3 text-xs sm:text-sm font-bold border-t border-[#EEDFC6] pt-1.5">
                  <span className="text-[#1A1612]">Thực nhận về ngân hàng</span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[#B88E4F]" data-testid="withdrawal-net-preview">
                    {previewMoney(grossMinor - taxMinor)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Nút gửi yêu cầu & Chú thích */}
          <div className={cn("wallet-withdraw-actions", embedded && "wallet-withdraw-actions pt-[0]! w-full! [&_>_button]:h-[42px]! [&_>_button]:[border:1px_solid_#c59b58]! [&_>_button]:bg-[#c59b58]! [&_>_button]:text-[#1a1612]! [&_>_button]:text-[length:12px]! [&_>_button]:font-[600]! [&_>_button:not(:disabled):hover]:bg-[#b88e4f]! [&_>_button:disabled]:bg-[#f3efe6]! [&_>_button:disabled]:border-[#eae4d7]! [&_>_button:disabled]:text-[#7d715e]! [&_>_button:disabled]:opacity-[.7]! [&_>_div]:[border:0]! [&_>_div]:p-[0]! [&_>_div]:bg-[transparent]! [&_>_div]:text-[length:10px]! [&_>_div]:leading-[16px]! ")}>
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
      {walletPanel === 'withdraw' && (
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0">
                <ReceiptText className="w-4 h-4 text-[#B88E4F]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1A1612] m-0">Nhật ký thù lao & biến động gần nhất</h3>
                <p className="text-[11px] text-[#7D715E] m-0">Đối soát minh bạch số dư, thời hạn 14 ngày & giải ngân Napas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWalletPanel('history')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8C6226] hover:text-[#1A1612] transition cursor-pointer"
            >
              <span>Xem toàn bộ sổ cái ({ledger?.total ?? 0})</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#B88E4F]" />
            </button>
          </div>

          {/* Bảng 5 biến động gần nhất */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF8F5] border-b border-[#EAE4D7] text-[10.5px] font-bold uppercase tracking-wider text-[#7D715E]">
                <tr>
                  <th className="px-3.5 py-2 whitespace-nowrap">Thời gian</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Nghiệp vụ thù lao</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Ngăn ví</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap">Biến động</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Dòng tiền</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Nguồn / Tham chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {ledger && ledger.entries.length > 0 ? (
                  ledger.entries.slice(0, 5).map((entry) => {
                    const entryDate = new Date(entry.createdAt);
                    const amt = Number(entry.amount);
                    const isPositive = amt > 0;
                    const isNegative = amt < 0;
                    return (
                      <tr key={entry.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px] text-[#7D715E]">
                          {entryDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}{" "}
                          {entryDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {entry.transactionType === "COMMISSION_PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]">
                              <Clock3 className="w-2.5 h-2.5 text-[#B88E4F]" />
                              Ghi nhận thù lao chờ 14 ngày
                            </span>
                          )}
                          {entry.transactionType === "COMMISSION_APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#059669]" />
                              Mở khóa khả dụng sau 14 ngày
                            </span>
                          )}
                          {entry.transactionType === "PAYOUT_WITHDRAW" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FAF8F5] text-[#1A1612] border border-[#EAE4D7]">
                              <ArrowUpRight className="w-2.5 h-2.5 text-[#B88E4F]" />
                              Yêu cầu rút tiền
                            </span>
                          )}
                          {entry.transactionType === "REVERSAL" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                              <AlertCircle className="w-2.5 h-2.5 text-[#DC2626]" />
                              Thu hồi Clawback hoàn trả
                            </span>
                          )}
                          {!["COMMISSION_PENDING", "COMMISSION_APPROVED", "PAYOUT_WITHDRAW", "REVERSAL"].includes(entry.transactionType) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FAF8F5] text-[#7D715E] border border-[#EAE4D7]">
                              {TRANSACTION_LABELS[entry.transactionType] || entry.transactionType}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 whitespace-nowrap text-[11px]">
                          {entry.balanceBucket === "PENDING" ? (
                            <span className="px-2 py-0.5 rounded bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7] font-medium text-[10.5px]">
                              Ví Chờ 14d
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6] font-semibold text-[10.5px]">
                              Ví Khả Dụng
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-right whitespace-nowrap font-mono text-xs font-bold tabular-nums">
                          <span className={cn(
                            isPositive && "text-[#059669]",
                            isNegative && "text-[#DC2626]",
                            !isPositive && !isNegative && "text-[#7D715E]"
                          )}>
                            {isPositive ? "+" : ""}{formatMoney(entry.amount)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 whitespace-nowrap font-mono text-[10.5px] text-[#7D715E] tabular-nums">
                          <span>{formatMoney(entry.balanceBefore)}</span>
                          <span className="mx-1 text-[#B88E4F]">→</span>
                          <strong className="text-[#1A1612] font-bold">{formatMoney(entry.balanceAfter)}</strong>
                        </td>
                        <td className="px-3.5 py-2 whitespace-nowrap text-[10.5px] text-[#7D715E]">
                          {entry.referenceDetails?.storeName || (entry.referenceType ? REFERENCE_LABELS[entry.referenceType] : 'Hệ thống')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-[#7D715E]">
                      Chưa có giao dịch phát sinh gần đây.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

              {/* 1. LỊCH SỬ YÊU CẦU RÚT TIỀN (FINTECH & SCANMS COMPACT E-COMMERCE STYLE) */}
      {/* 2. NHÃN HÀNG ĐỐI TÁC & PHÂN BỔ THU NHẬP */}
      <div className="wallet-detail-panel" hidden={walletPanel !== 'stores'}>
        <WalletFinancialBreakdown
          wallet={wallet}
          formatMoney={formatMoney}
        />
      </div>

      <section hidden={walletPanel !== 'history'} className="wallet-detail-panel wallet-history-section overflow-hidden rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
        <WalletSectionHeader
          id="wallet-withdrawal-details"
          title="Lịch sử yêu cầu rút tiền"
          description=""
          count={`${history?.total ?? 0} yêu cầu`}
          icon={Receipt}
        />

          <div id="wallet-withdrawal-details">
            {/* Table Container */}
            <div className="overflow-x-auto" hidden={!loading && history?.total === 0}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF8F5]/90 border-b border-[#EAE4D7] text-[10.5px] font-bold uppercase tracking-wider text-[#7D715E]">
              <tr>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Mã yêu cầu
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Gian hàng phụ trách
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                  Số tiền rút
                </th>
                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                  Thuế khấu trừ
                </th>
                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                  Thực nhận
                </th>
                <th scope="col" className="px-4 py-2.5 text-center whitespace-nowrap">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {history?.requests.map((request) => {
                const reqDate = new Date(request.createdAt);
                const isApproved = request.status === 'APPROVED';
                const isPending = request.status === 'PENDING';
                const isProcessing = request.status === 'PROCESSING';
                const isRejected = request.status === 'REJECTED';

                return (
                  <tr
                    key={request.id}
                    className="hover:bg-[#FAF8F5]/80 transition-colors group"
                  >
                    {/* Mã yêu cầu với nút copy */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span title={request.id} className="font-mono text-xs font-bold text-[#1A1612] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EAE4D7]">
                          {payoutDisplayCode(request.id, request.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(request.id, 'mã yêu cầu')}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#7D715E] hover:text-[#B88E4F] hover:bg-white transition cursor-pointer"
                          title="Sao chép toàn bộ mã yêu cầu"
                        >
                          {copiedId === request.id ? (
                            <Check className="w-3 h-3 text-[#059669]" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Shop */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        <div className="w-6 h-6 rounded-md bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center shrink-0 text-[#B88E4F]">
                          <Store className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-xs text-[#1A1612] truncate">
                          {request.store?.name ?? "Chờ đối soát shop"}
                        </span>
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="text-xs leading-tight">
                        <span className="font-semibold text-[#1A1612] block">
                          {reqDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: 'Asia/Ho_Chi_Minh' })}
                        </span>
                        <span className="text-[10.5px] text-[#7D715E] font-mono inline-flex items-center gap-0.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[#B88E4F]" />
                          {reqDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: 'Asia/Ho_Chi_Minh' })}
                        </span>
                      </div>
                    </td>

                    {/* Số tiền rút */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <span className="font-mono text-xs sm:text-[13px] font-bold text-[#1A1612] tabular-nums">
                        {formatMoney(request.amount)}
                      </span>
                    </td>

                    {/* Thuế */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {request.taxCalculated ? (
                        <div className="text-xs font-mono tabular-nums leading-tight text-[#DC2626]">
                          <span>-{formatMoney(request.taxAmount)}</span>
                          <span className="text-[9.5px] text-[#7D715E] block font-sans">{Number(request.taxAmount) > 0 ? 'Đã khấu trừ' : 'Không khấu trừ'}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#7D715E] italic">Chưa tính thuế</span>
                      )}
                    </td>

                    {/* Thực nhận */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {request.taxCalculated ? (
                        <span className="font-mono text-xs sm:text-[13px] font-extrabold text-[#059669] tabular-nums bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                          {formatMoney(request.netAmount)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#7D715E]">Chưa xác định</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-center">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs">
                          <Clock className="w-2.5 h-2.5 text-[#B88E4F]" />
                          <span>{STATUS_LABELS.PENDING}</span>
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] shadow-2xs">
                          <RefreshCw className="w-2.5 h-2.5 text-[#2563EB] animate-spin" />
                          <span>{STATUS_LABELS.PROCESSING}</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shadow-2xs">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#059669]" />
                          <span>{request.transferProvider === 'BIDV_SANDBOX' ? 'Hoàn tất · Sandbox' : STATUS_LABELS.APPROVED}</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shadow-2xs">
                          <AlertCircle className="w-2.5 h-2.5 text-[#DC2626]" />
                          <span>{STATUS_LABELS.REJECTED}</span>
                        </span>
                      )}
                      {request.transferProvider === 'BIDV_SANDBOX' && <p className="mt-1 text-[10px] text-[#7D715E]">Thử nghiệm · Không chuyển tiền ngoài đời</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && history?.total === 0 && (
          <div className="wallet-empty-state py-8 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] mb-2 shadow-2xs">
              <ReceiptText className="w-5 h-5 text-[#B88E4F]" />
            </div>
            <h4 className="row-span-2 text-xs sm:text-sm font-bold text-[#1A1612] m-0">Chưa có yêu cầu rút tiền nào</h4>
          </div>
        )}

        {/* Pagination bar */}
        <div hidden={!history?.total} className="wallet-table-footer flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] bg-[#FAF8F5]/50 px-4 py-2 text-xs">
          <span className="text-[#7D715E] font-medium text-[11px]">
            Tổng <strong className="text-[#1A1612]">{history?.total ?? 0}</strong> yêu cầu
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading || submitting}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1612] hover:bg-[#FAF8F5] transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Trước</span>
            </button>
            <span className="inline-flex items-center self-stretch gap-1 whitespace-nowrap px-1 font-medium text-[#7D715E]">
              Trang <strong className="font-semibold text-[#1A1612]">{page}</strong>
            </span>
            <button
              type="button"
              disabled={
                !history ||
                page * history.limit >= history.total ||
                loading ||
                submitting
              }
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1612] hover:bg-[#FAF8F5] transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
          </div>
      </section>

      <div hidden={walletPanel !== 'history'} className="wallet-detail-panel wallet-tax-statements"><PartnerTaxStatements /></div>

      {/* 2. BIẾN ĐỘNG TÀI CHÍNH GẦN NHẤT (SỔ CÁI MINH BẠCH - APPEND-ONLY LEDGER) */}
      <section hidden={walletPanel !== 'history'} className="wallet-detail-panel wallet-ledger-section overflow-hidden rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
        <WalletSectionHeader id="wallet-ledger-details" title="Biến động tài chính gần nhất" description="" count={`${ledger?.total ?? 0} giao dịch`} icon={ReceiptText} />

          <div id="wallet-ledger-details">
            {/* Table Container */}
            <div className="overflow-x-auto">
          <table
            className="w-full text-left text-xs border-collapse"
            aria-label="Sổ cái tài chính"
          >
            <thead className="bg-[#FAF8F5]/90 border-b border-[#EAE4D7] text-[10.5px] font-bold uppercase tracking-wider text-[#7D715E]">
              <tr>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Loại giao dịch
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Ngăn ví
                </th>
                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                  Biến động số dư
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Dòng tiền (Trước ➔ Sau)
                </th>
                <th scope="col" className="px-4 py-2.5 whitespace-nowrap">
                  Nguồn giao dịch
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {ledger?.entries.map((entry) => {
                const entryDate = new Date(entry.createdAt);
                const amt = Number(entry.amount);
                const isPositive = amt > 0;
                const isNegative = amt < 0;

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-[#FAF8F5]/80 transition-colors group"
                  >
                    {/* Thời gian */}
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="text-xs leading-tight">
                        <span className="font-semibold text-[#1A1612] block">
                          {entryDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: 'Asia/Ho_Chi_Minh' })}
                        </span>
                        <span className="text-[10.5px] text-[#7D715E] font-mono inline-flex items-center gap-0.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[#B88E4F]" />
                          {entryDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: 'Asia/Ho_Chi_Minh' })}
                        </span>
                      </div>
                    </td>

                    {/* Loại giao dịch */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {entry.transactionType === "COMMISSION_PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                          <Clock3 className="w-3 h-3 text-[#B88E4F] shrink-0" />
                          <span>Ghi nhận hoa hồng chờ</span>
                        </span>
                      )}
                      {entry.transactionType === "COMMISSION_APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                          <span>Duyệt hoa hồng / Thưởng</span>
                        </span>
                      )}
                      {entry.transactionType === "PAYOUT_WITHDRAW" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF8F5] text-[#1A1612] border border-[#EAE4D7]">
                          <ArrowUpRight className="w-3 h-3 text-[#B88E4F] shrink-0" />
                          <span>Yêu cầu rút tiền</span>
                        </span>
                      )}
                      {entry.transactionType === "REVERSAL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          <AlertCircle className="w-3 h-3 text-[#DC2626] shrink-0" />
                          <span>{entry.referenceType === 'WALLET_RECONCILIATION' ? 'Điều chỉnh đối soát' : entry.referenceType === 'RECONCILIATION_ORDER' ? 'Ghi nhận thanh toán cũ' : 'Thu hồi hoa hồng'}</span>
                        </span>
                      )}
                      {entry.transactionType === "PAYOUT_REJECT_REFUND" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          <RefreshCw className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span>Hoàn tiền yêu cầu rút</span>
                        </span>
                      )}
                      {!["COMMISSION_PENDING", "COMMISSION_APPROVED", "PAYOUT_WITHDRAW", "REVERSAL", "PAYOUT_REJECT_REFUND"].includes(entry.transactionType) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF8F5] text-[#7D715E] border border-[#EAE4D7]">
                          <span>{TRANSACTION_LABELS[entry.transactionType] || entry.transactionType}</span>
                        </span>
                      )}
                    </td>

                    {/* Ngăn ví */}
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {entry.balanceBucket === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                          <Clock3 className="w-2.5 h-2.5 text-[#B88E4F]" />
                          <span>Ví Chờ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                          <Wallet className="w-2.5 h-2.5 text-[#B88E4F]" />
                          <span>Ví Khả Dụng</span>
                        </span>
                      )}
                    </td>

                    {/* Biến động số dư */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <span
                        className={cn(
                          "font-mono text-xs sm:text-[13px] font-extrabold tabular-nums inline-flex items-center gap-0.5",
                          isPositive && "text-[#059669]",
                          isNegative && "text-[#DC2626]",
                          !isPositive && !isNegative && "text-[#7D715E]"
                        )}
                      >
                        {isPositive && <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[#059669]" />}
                        {isNegative && <ArrowDownLeft className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" />}
                        <span>{isPositive ? "+" : ""}{formatMoney(entry.amount)}</span>
                      </span>
                    </td>

                    {/* Dòng tiền (Trước ➔ Sau) */}
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="wallet-balance-flow flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[#7D715E]">
                        <span className="bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EAE4D7]">
                          {formatMoney(entry.balanceBefore)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#B88E4F] shrink-0" />
                        <span className="font-bold text-[#1A1612] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EEDFC6]">
                          {formatMoney(entry.balanceAfter)}
                        </span>
                      </div>
                    </td>

                    {/* Nguồn giao dịch */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="wallet-ledger-reference flex items-center gap-1">
                        <span title={entry.referenceType ?? undefined} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]">
                          {entry.referenceType ? REFERENCE_LABELS[entry.referenceType] ?? 'Tham chiếu khác' : 'Hệ thống'}
                        </span>
                        {entry.referenceId && (
                          <div className="flex items-center gap-0.5">
                            <span title={entry.referenceId} className="font-mono text-xs font-medium text-[#1A1612]">
                              #{entry.referenceId.slice(0, 8)}...
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyId(entry.referenceId!, 'mã tham chiếu')}
                              className="w-5 h-5 rounded flex items-center justify-center text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FAF8F5] transition cursor-pointer"
                              title="Sao chép toàn bộ mã tham chiếu"
                              aria-label={`Sao chép mã tham chiếu ${entry.referenceId}`}
                            >
                              {copiedId === entry.referenceId ? (
                                <Check className="w-3 h-3 text-[#059669]" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      {entry.referenceDetails && (
                        <div className="wallet-ledger-reference-details mt-1 text-[10px] leading-4 text-[#7D715E]">
                          {entry.referenceDetails.storeName && <span className="block">{entry.referenceDetails.storeName}</span>}
                          {entry.referenceDetails.orderId && <span className="block" title={`Mã đơn: ${entry.referenceDetails.orderCode || entry.referenceDetails.orderId}`}>
                            Đơn {entry.referenceDetails.orderCode || `#${entry.referenceDetails.orderId.slice(0, 8)}…`}
                          </span>}
                          {entry.referenceDetails.period && <span className="block">Kỳ {entry.referenceDetails.period}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && ledger && ledger.entries.length === 0 && (
          <div className="wallet-empty-state py-8 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F] mb-2 shadow-2xs">
              <ReceiptText className="w-5 h-5 text-[#B88E4F]" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-[#1A1612] m-0">Chưa ghi nhận biến động số dư</h4>
            <p className="text-[11px] text-[#7D715E] mt-0.5 max-w-sm">
              Mọi giao dịch phát sinh hoa hồng từ đơn hàng hoặc các lệnh rút tiền sẽ tự động được ghi nhận tại đây.
            </p>
          </div>
        )}

        {/* Ledger pagination */}
        <div className="wallet-table-footer flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] bg-[#FAF8F5]/50 px-4 py-2 text-[11px] text-[#7D715E]">
          <span className="font-medium shrink-0">
            Hiển thị <strong className="text-[#1A1612]">{ledger?.entries.length ?? 0}</strong> / <strong className="text-[#1A1612]">{ledger?.total ?? 0}</strong> bản ghi
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Trang giao dịch trước" disabled={ledgerPage <= 1 || loading || submitting} onClick={() => setLedgerPage(current => current - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1612] hover:bg-[#FAF8F5] transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={14} />Trước</button>
            <span>Trang {ledgerPage} / {Math.max(1, Math.ceil((ledger?.total ?? 0) / (ledger?.limit ?? 10)))}</span>
            <button type="button" aria-label="Trang giao dịch sau" disabled={!ledger || ledgerPage * ledger.limit >= ledger.total || loading || submitting} onClick={() => setLedgerPage(current => current + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1612] hover:bg-[#FAF8F5] transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Sau<ChevronRight size={14} /></button>
          </div>
        </div>
          </div>
      </section>
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
