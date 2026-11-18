import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Plus,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { walletService, type WalletSummary, type LedgerEntry, type LedgerHistory } from '../../services/wallet.service';
import CustomerWithdrawals, { CustomerWithdrawalHistory } from '../../components/wallet/CustomerWithdrawals';
import CustomerPayosTopUp from './CustomerPayosTopUp';
import { formatMoney } from '@/utils/marketplace.utils';
import { toast } from '../../utils/toast';
import { customerLedgerReference } from '../../utils/customer-ledger-reference';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export const CustomerWalletTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetWithdrawalId = searchParams.get('withdrawalId') || undefined;
  const [historyTab, setHistoryTab] = useState<'transactions' | 'withdrawals'>(() => targetWithdrawalId || searchParams.get('history') === 'withdrawals' ? 'withdrawals' : 'transactions');
  useEffect(() => {
    if (targetWithdrawalId || searchParams.get('history') === 'withdrawals') setHistoryTab('withdrawals');
  }, [searchParams, targetWithdrawalId]);
  const [withdrawalRefresh, setWithdrawalRefresh] = useState(0);
  const [walletTab, setWalletTab] = useState<'topup' | 'withdraw'>('topup');
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [customAmount, setCustomAmount] = useState<string>('500000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpTab, setTopUpTab] = useState<'SANDBOX' | 'PAYOS'>('PAYOS');
  const [demoAvailable, setDemoAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void walletService.demoTopUpAvailability().then(result => {
      if (active) setDemoAvailable(result.available === true);
    }).catch(() => { if (active) setDemoAvailable(false); });
    return () => { active = false; };
  }, []);

  const fetchWalletData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const [walletData, ledgerData] = await Promise.all([
        walletService.getMyWallet(true),
        walletService.getMyLedger(page, true),
      ]);
      setWallet(walletData);
      setLedger(ledgerData);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải thông tin ví');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [page]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void fetchWalletData(true);
        setWithdrawalRefresh(value => value + 1);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [page]);

  const handleTopUp = async (amount: number) => {
    if (!demoAvailable || topUpLoading) return;
    if (!amount || amount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000 ₫');
      return;
    }
    try {
      setTopUpLoading(true);
      await walletService.topUpDemo(amount);
      toast.success(`Nạp thành công ${formatMoney(amount)} vào Ví SCANMS!`);
      await fetchWalletData();
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setDemoAvailable(false);
        setTopUpTab('PAYOS');
      }
      toast.error(err?.response?.data?.message || 'Không thể nạp tiền thử nghiệm');
    } finally {
      setTopUpLoading(false);
    }
  };

  const getLedgerBadge = (entry: LedgerEntry) => {
    const numAmount = Number(entry.amount);
    const isPositive = numAmount > 0;

    if (entry.referenceType === 'CUSTOMER_WITHDRAWAL' || entry.referenceType === 'CUSTOMER_WITHDRAWAL_REFUND') {
      const status = entry.referenceDetails?.withdrawalStatus;
      const label = isPositive ? 'Hoàn tiền lệnh rút' : status === 'APPROVED' ? 'Rút tiền thành công' : status === 'REJECTED' ? 'Yêu cầu rút bị từ chối' : status === 'PROCESSING' ? 'Đang xử lý rút tiền' : 'Giữ tiền chờ rút';
      return { label, badgeClass: 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]', sign: isPositive ? '+' : '-', colorClass: 'text-[#1A1612] font-bold' };
    }
    if (entry.referenceType === 'TOPUP_PAYOS') {
      return { label: 'Nạp tiền qua payOS', badgeClass: 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]', sign: '+', colorClass: 'text-[#1A1612] font-bold' };
    }
    if (entry.referenceType === 'TOPUP_DEMO') {
      return {
        label: 'Nạp tiền thử nghiệm (Sandbox)',
        badgeClass: 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]',
        sign: '+',
        colorClass: 'text-[#1A1612] font-bold',
      };
    }
    if (entry.referenceType === 'ORDER_REFUND') {
      return {
        label: 'Hoàn tiền đổi trả đơn hàng',
        badgeClass: 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]',
        sign: '+',
        colorClass: 'text-[#1A1612] font-bold',
      };
    }
    if (entry.referenceType === 'ORDER_PAYMENT') {
      return {
        label: 'Thanh toán đơn hàng',
        badgeClass: 'bg-amber-50 text-[#B88E4F] border-[#EEDFC6]',
        sign: '-',
        colorClass: 'text-[#DC2626] font-bold',
      };
    }
    if (entry.referenceType === 'WALLET_RECLASSIFICATION') {
      return {
        label: isPositive ? 'Điều chỉnh số dư (+)' : 'Điều chỉnh số dư (-)',
        badgeClass: isPositive ? 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]' : 'bg-gray-50 text-gray-700 border-gray-200',
        sign: isPositive ? '+' : '-',
        colorClass: isPositive ? 'text-[#1A1612] font-bold' : 'text-[#DC2626] font-bold',
      };
    }
    return {
      label: isPositive ? 'Cộng tiền vào ví' : 'Trừ tiền từ ví',
      badgeClass: isPositive ? 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]' : 'bg-gray-50 text-gray-700 border-gray-200',
      sign: isPositive ? '+' : '-',
      colorClass: isPositive ? 'text-[#1A1612] font-bold' : 'text-[#DC2626] font-bold',
    };
  };

  return (
    <section className="@container/wallet grid gap-[14px] w-full max-w-[1200px] min-w-0 text-left text-[#1A1612] max-[767px]:pb-[64px]" aria-label="Ví mua sắm">

      <div className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
      <section
        className="relative flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-b border-[#EAE4D7] bg-white"
        aria-label="Số dư ví"
        aria-busy={loading}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-6 h-6 text-[#C59B58]" />
          </div>
          <div className="grid gap-1 min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D715E]">
              Ví mua sắm · Số dư khả dụng
            </span>
            <strong className="text-2xl sm:text-3xl leading-tight tracking-tight font-bold tabular-nums break-words text-[#1A1612]">
              {loading && !wallet ? '—' : formatMoney(Number(wallet?.shoppingBalance || 0))}
            </strong>
          </div>
        </div>
        <div className="grid gap-2 min-w-0">
          <span className="flex items-center gap-1.5 text-[#7D715E] text-xs font-medium">
            <Check size={14} className="text-[#059669]" /> Đang hoạt động
          </span>

        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 p-4" role="group" aria-label="Thao tác ví">
        {([['topup', 'Nạp tiền'], ['withdraw', 'Rút tiền']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={walletTab === key} onClick={() => setWalletTab(key)} className={`min-h-12 rounded-xl border text-sm font-semibold ${walletTab === key ? 'border-[#C59B58] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-white'}`}>{label}</button>)}
      </div>
      {walletTab === 'withdraw' ? <CustomerWithdrawals balance={Number(wallet?.shoppingBalance || 0)} onChanged={fetchWalletData} onSubmitted={withdrawal => {
        setHistoryTab('withdrawals');
        setWithdrawalRefresh(value => value + 1);
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('history', 'withdrawals');
          next.set('withdrawalId', withdrawal.id);
          return next;
        }, { replace: true, preventScrollReset: true });
      }}/> : <section aria-label="Nạp tiền" className="block min-w-0 bg-white">

        <div className="p-4 sm:p-6 text-left">
          <div className="grid gap-4">
            {/* Cột trái: Form nạp tiền */}
            <div className="space-y-4 min-w-0">
              {demoAvailable && (
                <div className="grid w-full max-w-[400px] grid-cols-2 gap-2 rounded-xl border border-[#EAE4D7] bg-white p-1.5" role="group" aria-label="Phương thức nạp tiền">
                  <button
                    type="button"
                    aria-pressed={topUpTab === 'SANDBOX'}
                    onClick={() => setTopUpTab('SANDBOX')}
                    className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer transition ${
                      topUpTab === 'SANDBOX'
                        ? 'bg-[#FBF5EB] text-[#1A1612] border-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                    }`}
                  >
                    Sandbox
                  </button>
                  <button
                    type="button"
                    aria-pressed={topUpTab === 'PAYOS'}
                    onClick={() => setTopUpTab('PAYOS')}
                    className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer transition ${
                      topUpTab === 'PAYOS'
                        ? 'bg-[#FBF5EB] text-[#1A1612] border-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>payOS Ngân hàng</span>
                  </button>
                </div>
              )}

              {demoAvailable && topUpTab === 'SANDBOX' ? (
                <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 border-b border-[#EAE4D7] pb-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-xs font-semibold text-[#B88E4F]">1</span>
                    <h3 className="m-0 text-sm font-semibold text-[#1A1612]">Số tiền nạp</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Chọn mức nạp nhanh">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        aria-pressed={customAmount === String(amt)}
                        onClick={() => setCustomAmount(String(amt))}
                        className={`min-h-11 p-2 border rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition ${
                          customAmount === String(amt)
                            ? 'bg-[#FBF5EB] border-[#C59B58] text-[#B88E4F] font-bold shadow-2xs'
                            : 'bg-white border-[#EAE4D7] text-[#1A1612] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        +{amt >= 1000000 ? amt / 1000000 + 'M' : amt / 1000 + 'k'}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-1 flex-col gap-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="cw-demo-amount" className="block text-xs font-semibold text-[#1A1612]">
                          Số tiền muốn nạp
                        </label>
                        <span className="text-[11px] text-[#7D715E]">VNĐ</span>
                      </div>
                      <div className="flex items-center gap-2 min-h-[44px] px-3.5 border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/15 rounded-xl bg-white transition-all">
                        <input
                          id="cw-demo-amount"
                          type="text"
                          inputMode="numeric"
                          value={customAmount ? Number(customAmount).toLocaleString('vi-VN') : ''}
                          onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                          placeholder="Tối thiểu 10.000"
                          className="w-full min-w-0 py-3 border-0 outline-none bg-transparent text-[#1A1612] text-2xl font-bold tabular-nums"
                        />
                        <span className="text-base font-semibold text-[#7D715E] shrink-0">₫</span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-5">
                      <p className="text-[11px] text-[#7D715E] leading-normal m-0">
                        Nạp thử nghiệm · Số dư được cộng ngay sau khi nạp.
                      </p>
                      <button
                        type="button"
                        className="mt-auto inline-flex w-full items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait transition-colors"
                        disabled={topUpLoading}
                        onClick={() => handleTopUp(Number(customAmount))}
                      >
                        {topUpLoading ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                        <span>{topUpLoading ? 'Đang xử lý...' : 'Nạp tiền Sandbox'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              ) : (
                <CustomerPayosTopUp onPaid={fetchWalletData} />
              )}
            </div>

          </div>
        </div>
      </section>}

      </div>
      <section aria-label="Lịch sử ví" className="min-w-0 overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
        <div className="flex items-center gap-[11px] min-h-[64px] p-[12px_16px] border-b border-[#EAE4D7]">
          <span className="inline-flex items-center justify-center shrink-0 w-[34px] h-[34px] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]">
            <Clock size={17} />
          </span>
          <span className="grid gap-[3px] min-w-0 text-left">
            <strong className="text-[14px] font-[600] text-[#1A1612] @max-[599px]:text-[13px]">Lịch sử ví</strong>
          </span>
          <span hidden={historyTab !== 'transactions'} className="ml-auto p-[3px_7px] rounded-[6px] bg-[#F3EFE6] text-[10px] text-[#7D715E] whitespace-nowrap @max-[599px]:[&>span]:hidden">
            {ledger?.total ?? 0}<span> giao dịch</span>
          </span>
        </div>
        <div className="customer-wallet-history-tabs" role="tablist" aria-label="Loại lịch sử ví">
          {([{ id: 'transactions', label: 'Giao dịch' }, { id: 'withdrawals', label: 'Yêu cầu rút tiền' }] as const).map(tab => <button key={tab.id} type="button" role="tab" id={`wallet-history-tab-${tab.id}`} aria-controls={`wallet-history-${tab.id}`} aria-selected={historyTab === tab.id} onClick={() => setHistoryTab(tab.id)}>{tab.label}</button>)}
        </div>
        <div role="tabpanel" id="wallet-history-transactions" aria-labelledby="wallet-history-tab-transactions" hidden={historyTab !== 'transactions'}>
          {loading ? (
            <div className="grid justify-items-center gap-[6px] p-[22px_18px] text-[#7D715E] text-center" role="status">
              <RefreshCw className="w-5 h-5 text-[#B88E4F] animate-spin" />
              <span className="text-[12px]">Đang tải lịch sử giao dịch ví...</span>
            </div>
          ) : !ledger?.entries || ledger.entries.length === 0 ? (
            <div className="grid justify-items-center gap-[6px] p-[22px_18px] text-[#7D715E] text-center">
              <Wallet className="w-[26px] h-[26px] text-[#C59B58] stroke-[1.5] mb-[2px]" />
              <p className="m-0 text-[12px] text-[#7D715E]">Chưa có giao dịch</p>
              <p className="m-0 text-[11px] text-[#7D715E]">Các khoản nạp, thanh toán và hoàn tiền sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto" tabIndex={0} aria-label="Lịch sử biến động số dư">
              <table className="min-w-[720px] w-full text-left text-[13px]">
                <thead className="bg-[#FAF8F5] text-[#7D715E] text-[11px] font-[550] border-b border-[#EAE4D7]">
                  <tr>
                    <th className="p-[11px_16px] font-[550]">Thời gian</th>
                    <th className="p-[11px_16px] font-[550]">Giao dịch</th>
                    <th className="p-[11px_16px] text-right font-[550]">Số tiền</th>
                    <th className="p-[11px_16px] text-right font-[550]">Số dư trước → sau</th>
                    <th className="p-[11px_16px] text-center font-[550]">Tham chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {ledger.entries.map((entry) => {
                    const badge = getLedgerBadge(entry);
                    const reference = customerLedgerReference(entry);
                    return (
                      <tr key={entry.id} className="h-[72px] hover:bg-[#FBF5EB]/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-[#1A1612]">{new Date(entry.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</div>
                          <div className="mt-1 text-xs text-[#7D715E]">{new Date(entry.createdAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</div>
                        </td>
                        <td className="p-[11px_16px]">
                          <span className="inline-flex items-center gap-3 font-medium text-[#1A1612]">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FBF5EB] text-[#B88E4F]">{badge.sign === '+' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>{badge.label}
                          </span>
                          {entry.referenceType === 'CUSTOMER_WITHDRAWAL' && entry.referenceDetails?.withdrawalStatus === 'APPROVED' && entry.referenceDetails.processedAt && <div className="mt-1 pl-12 text-xs text-[#7D715E]">Đã chuyển khoản · {new Date(entry.referenceDetails.processedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' })}</div>}
                        </td>
                        <td className={`p-[11px_16px] text-right tabular-nums font-semibold whitespace-nowrap ${badge.colorClass}`}>
                          {badge.sign}{formatMoney(Math.abs(Number(entry.amount)))}
                        </td>
                        <td className="p-[11px_16px] text-right tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-2"><span className="text-xs text-[#7D715E]">{formatMoney(Number(entry.balanceBefore))}</span><ArrowRight size={13} className="text-[#B88E4F]" /><strong className="font-semibold text-[#1A1612]">{formatMoney(Number(entry.balanceAfter))}</strong></span>
                        </td>
                        <td className="p-[11px_16px] text-center text-[#7D715E] font-mono text-[11px]">
                          {reference ? (
                            <div className="inline-grid justify-items-center gap-1">
                              <span className="font-sans text-xs text-[#7D715E]">{reference.label}</span>
                              <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-[#1A1612] hover:bg-[#FBF5EB] cursor-pointer" title={`${reference.label}: ${reference.copyValue}\nID nội bộ: ${reference.internalId}`} aria-label={`Sao chép ${reference.label.toLowerCase()} ${reference.copyValue}`} onClick={() => { void navigator.clipboard.writeText(reference.copyValue).then(() => toast.success(`Đã sao chép ${reference.label.toLowerCase()}`)).catch(() => toast.error('Không thể sao chép mã')); }}>
                                {reference.code} <Copy size={13} />
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          {ledger && ledger.total > ledger.limit && (
            <div className="flex items-center justify-between flex-wrap gap-[10px] p-[12px_16px] border-t border-[#EAE4D7] bg-[#FAF8F5] text-[11px]">
              <span className="text-[#7D715E]">
                Trang {ledger.page} / {Math.ceil(ledger.total / ledger.limit)}
              </span>
              <div className="flex items-center gap-[6px]">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-[10px] py-[5px] rounded-[7px] border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-[550] text-[#1A1612]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trước</span>
                </button>
                <button
                  type="button"
                  disabled={page >= Math.ceil(ledger.total / ledger.limit)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-[10px] py-[5px] rounded-[7px] border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-[550] text-[#1A1612]"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div role="tabpanel" id="wallet-history-withdrawals" aria-labelledby="wallet-history-tab-withdrawals" hidden={historyTab !== 'withdrawals'}><CustomerWithdrawalHistory refreshKey={withdrawalRefresh} targetId={targetWithdrawalId}/></div>
      </section>
    </section>
  );
};

