import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { walletService } from "../../services/wallet.service";
import type {
  PayoutStatus,
  WalletSummary,
  WithdrawalHistory,
} from "../../services/wallet.service";

const STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

const formatMoney = (amount: string) =>
  `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(amount))} ₫`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.";

// Compare minor units without floating-point rounding in client validation.
function toMinorUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<WithdrawalHistory | null>(null);
  const [page, setPage] = useState(1);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submissionInFlight = useRef(false);
  const loadSequence = useRef(0);

  const loadWallet = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const [summary, withdrawals] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getMyWithdrawals(page),
      ]);
      if (sequence !== loadSequence.current) return;
      setWallet(summary);
      setHistory(withdrawals);
      setError("");
    } catch (err: unknown) {
      if (sequence === loadSequence.current) setError(getErrorMessage(err));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const sequenceRef = loadSequence;
    void loadWallet();
    return () => {
      sequenceRef.current++;
    };
  }, [loadWallet]);

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || submissionInFlight.current || loading) return;
    setError("");
    setSuccess("");
    const normalizedAmount = amount.trim();
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(normalizedAmount)) {
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
      setError(
        `Số tiền rút tối thiểu là ${formatMoney(wallet.minimumWithdrawalAmount)}.`,
      );
      return;
    }
    if (minorUnits > toMinorUnits(wallet.availableBalance)) {
      setError("Số dư khả dụng không đủ để thực hiện rút tiền.");
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    try {
      const result = await walletService.createWithdrawal(normalizedAmount);
      setSuccess(`${result.message}. Mã yêu cầu: ${result.request.id}`);
      setAmount("");
      setWallet((current) =>
        current
          ? { ...current, availableBalance: result.availableBalance }
          : current,
      );
      if (page === 1) await loadWallet();
      else setPage(1);
    } catch (err: unknown) {
      // Never automatically resubmit a financial POST after a timeout.
      setError(
        `${getErrorMessage(err)} Nếu kết nối bị gián đoạn, hãy tải lại lịch sử trước khi gửi lại.`,
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 text-ink">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            Ví tiền & rút tiền
          </h1>
          <p className="mt-1 text-sm text-muted">
            Quản lý số dư hoa hồng và yêu cầu rút tiền của bạn trên SCANMS.
          </p>
        </div>
        <button
          type="button"
          aria-label="Tải lại ví"
          onClick={() => void loadWallet()}
          disabled={loading || submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Tải
          lại
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
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

      <section className="grid gap-4 sm:grid-cols-2" aria-busy={loading}>
        <div className="rounded-2xl border border-brand-border bg-brand-soft p-6">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Wallet size={18} /> Số dư khả dụng
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums">
            {wallet ? formatMoney(wallet.availableBalance) : "—"}
          </p>
          <p className="mt-2 text-xs text-muted">
            Chỉ số dư khả dụng được dùng để yêu cầu rút tiền.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Clock3 size={18} /> Số dư chờ duyệt
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums">
            {wallet ? formatMoney(wallet.pendingBalance) : "—"}
          </p>
          <p className="mt-2 text-xs text-muted">
            Hoa hồng được mở khóa sau thời gian giữ 14 ngày.
          </p>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-line bg-white p-6 lg:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={20} className="text-brand-strong" /> Tài khoản
            nhận tiền
          </h2>
          {wallet?.bankAccount ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Ngân hàng</dt>
                <dd className="font-semibold">{wallet.bankAccount.bankName}</dd>
              </div>
              <div>
                <dt className="text-muted">Số tài khoản</dt>
                <dd>{wallet.bankAccount.maskedAccountNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">Chủ tài khoản</dt>
                <dd>{wallet.bankAccount.accountName}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Chưa có tài khoản ngân hàng.
            </p>
          )}
          <p className="mt-4 text-sm text-muted">
            KYC:{" "}
            {wallet?.kycStatus === "VERIFIED"
              ? "Đã xác minh"
              : "Chưa được xác minh"}
          </p>
          <Link
            to="/collaborator/kyc"
            className="mt-2 inline-block text-sm font-semibold text-brand-strong underline"
          >
            Xem / cập nhật hồ sơ KYC
          </Link>
        </div>
        <form
          onSubmit={(event) => void handleWithdrawal(event)}
          className="space-y-4"
        >
          <h2 className="text-lg font-bold">Yêu cầu rút tiền</h2>
          <div>
            <label
              htmlFor="withdrawal-amount"
              className="mb-2 block text-sm font-medium"
            >
              Số tiền (VNĐ)
            </label>
            <input
              id="withdrawal-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ví dụ: 500000.00"
              required
              maxLength={16}
              disabled={submitting || loading || !wallet?.canWithdraw}
              className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand disabled:bg-surface-sand"
            />
            <p className="mt-2 text-xs text-muted">
              Tối thiểu:{" "}
              {wallet ? formatMoney(wallet.minimumWithdrawalAmount) : "—"}
            </p>
          </div>
          <p className="text-sm text-muted">
            Tiền được trừ khỏi số dư khả dụng khi gửi yêu cầu. Đây chưa phải
            giao dịch ngân hàng đã hoàn tất.
          </p>
          <button
            type="submit"
            disabled={submitting || loading || !wallet?.canWithdraw}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownToLine size={18} />{" "}
            {submitting ? "Đang gửi yêu cầu…" : "Yêu cầu rút tiền"}
          </button>
          {wallet && !wallet.canWithdraw && (
            <p className="text-xs text-muted">
              Cần KYC đã xác minh, tài khoản ngân hàng đầy đủ và đủ số dư tối
              thiểu để rút tiền.
            </p>
          )}
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 className="p-6 text-lg font-bold">Lịch sử yêu cầu rút tiền</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sand text-muted">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Mã yêu cầu
                </th>
                <th scope="col" className="px-6 py-3">
                  Thời gian
                </th>
                <th scope="col" className="px-6 py-3">
                  Số tiền
                </th>
                <th scope="col" className="px-6 py-3">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {history?.requests.map((request) => (
                <tr key={request.id} className="border-t border-line">
                  <td className="px-6 py-4 font-mono text-xs">{request.id}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {new Date(request.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-semibold tabular-nums">
                    {formatMoney(request.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="whitespace-nowrap rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs">
                      {STATUS_LABELS[request.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && history?.total === 0 && (
          <p className="p-6 text-sm text-muted">
            Bạn chưa có yêu cầu rút tiền.
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line p-4 text-sm">
          <span className="text-muted">
            Trang {page} · {history?.total ?? 0} yêu cầu
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1 || loading || submitting}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-line px-3 py-2 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={
                !history ||
                page * history.limit >= history.total ||
                loading ||
                submitting
              }
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-line px-3 py-2 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
