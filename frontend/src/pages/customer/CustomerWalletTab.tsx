import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { walletService, type WalletSummary, type LedgerEntry, type LedgerHistory } from '../../services/wallet.service';
import CustomerPayosTopUp from './CustomerPayosTopUp';
import { formatMoney } from '@/utils/marketplace.utils';
import { toast } from '../../utils/toast';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export const CustomerWalletTab: React.FC = () => {
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

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, ledgerData] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getMyLedger(page),
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

      <section
        className="relative grid grid-cols-1 md:grid-cols-[1fr_260px] items-center gap-5 p-5 sm:p-6 border border-[#EAE4D7] rounded-2xl bg-white shadow-[0_2px_12px_rgba(35,29,21,0.03)]"
        aria-label="Số dư ví"
        aria-busy={loading}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-6 h-6 text-[#C59B58]" />
          </div>
          <div className="grid gap-1 min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D715E]">
              Số dư khả dụng
            </span>
            <strong className="text-2xl sm:text-3xl leading-tight tracking-tight font-bold tabular-nums break-words text-[#1A1612]">
              {loading && !wallet ? '—' : formatMoney(Number(wallet?.shoppingBalance || 0))}
            </strong>
          </div>
        </div>
        <div className="grid gap-2 min-w-0 md:pl-6 md:border-l border-[#EAE4D7] pt-3 md:pt-0 border-t md:border-t-0">
          <span className="flex items-center gap-1.5 text-[#059669] text-xs font-semibold">
            <Check size={14} className="text-[#059669]" /> Đang hoạt động
          </span>
          <div className="flex items-center justify-between md:grid md:gap-1 min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D715E] whitespace-nowrap">
              <Clock size={13} /> Chờ xử lý
            </span>
            <strong className="text-lg sm:text-xl font-bold tabular-nums break-words text-[#1A1612]">
              {loading && !wallet ? '—' : formatMoney(Number(wallet?.pendingBalance || 0))}
            </strong>
          </div>
        </div>
      </section>

      <section aria-labelledby="customer-topup-title" className="block min-w-0 border border-[#EAE4D7] rounded-2xl bg-white overflow-hidden shadow-2xs">
        <header className="flex items-center gap-3 p-4 sm:px-6 border-b border-[#EAE4D7] bg-[#FAF8F5]/40">
          <span className="inline-flex items-center justify-center shrink-0 w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] shadow-2xs">
            <Plus size={18} />
          </span>
          <span className="grid gap-0.5 min-w-0 text-left">
            <strong id="customer-topup-title" className="text-sm sm:text-base font-bold text-[#1A1612]">Nạp tiền vào ví</strong>
            <small className="text-xs text-[#7D715E]">Chọn số tiền và phương thức nạp tiện lợi, an toàn</small>
          </span>
        </header>

        <div className="p-4 sm:p-6 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6 items-start">
            {/* Cột trái: Form nạp tiền */}
            <div className="space-y-4 min-w-0">
              {demoAvailable && (
                <div className="inline-flex gap-1 p-1 border border-[#EAE4D7] rounded-xl bg-[#FAF8F5]" role="group" aria-label="Phương thức nạp tiền">
                  <button
                    type="button"
                    aria-pressed={topUpTab === 'SANDBOX'}
                    onClick={() => setTopUpTab('SANDBOX')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                      topUpTab === 'SANDBOX'
                        ? 'bg-white text-[#1A1612] border border-[#EEDFC6] font-bold shadow-2xs'
                        : 'text-[#7D715E] hover:text-[#1A1612]'
                    }`}
                  >
                    Sandbox (Demo)
                  </button>
                  <button
                    type="button"
                    aria-pressed={topUpTab === 'PAYOS'}
                    onClick={() => setTopUpTab('PAYOS')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                      topUpTab === 'PAYOS'
                        ? 'bg-white text-[#1A1612] border border-[#EEDFC6] font-bold shadow-2xs'
                        : 'text-[#7D715E] hover:text-[#1A1612]'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>payOS Ngân hàng</span>
                  </button>
                </div>
              )}

              {demoAvailable && topUpTab === 'SANDBOX' ? (
                <div className="space-y-4">
                  <p className="m-0 text-xs text-[#7D715E]">Nạp thử nghiệm · Số dư được cộng ngay sau khi nạp.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Chọn mức nạp nhanh">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        aria-pressed={customAmount === String(amt)}
                        onClick={() => setCustomAmount(String(amt))}
                        className={`min-h-[38px] p-1.5 border rounded-xl text-xs font-semibold cursor-pointer transition ${
                          customAmount === String(amt)
                            ? 'bg-[#FBF5EB] border-[#C59B58] text-[#B88E4F] font-bold shadow-2xs'
                            : 'bg-white border-[#EAE4D7] text-[#1A1612] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        +{amt >= 1000000 ? amt / 1000000 + 'M' : amt / 1000 + 'k'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="cw-demo-amount" className="block text-xs font-semibold text-[#1A1612]">
                          Số tiền muốn nạp
                        </label>
                        {customAmount && Number(customAmount) > 0 && (
                          <span className="text-xs font-bold font-mono text-[#B88E4F]">
                            {Number(customAmount).toLocaleString('vi-VN')} ₫
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 min-h-[44px] px-3.5 border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/15 rounded-xl bg-white transition-all">
                        <input
                          id="cw-demo-amount"
                          type="text"
                          inputMode="numeric"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                          placeholder="Tối thiểu 10.000"
                          className="w-full min-w-0 py-2 border-0 outline-none bg-transparent text-[#1A1612] text-base font-bold font-mono"
                        />
                        <span className="text-xs font-bold text-[#7D715E] shrink-0">VNĐ</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-[#7D715E] leading-normal m-0">
                        Nạp trực tiếp vào số dư ví để kiểm thử đặt hàng.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-wait active:scale-[0.96] transition-all shrink-0"
                        disabled={topUpLoading}
                        onClick={() => handleTopUp(Number(customAmount))}
                      >
                        {topUpLoading ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                        <span>{topUpLoading ? 'Đang xử lý...' : 'Nạp tiền (Demo)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <CustomerPayosTopUp onPaid={fetchWalletData} />
              )}
            </div>

            {/* Cột phải: Hướng dẫn an toàn & Chính sách (Option A) */}
            <div className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB]/60 p-4 sm:p-5 space-y-3.5 text-xs text-[#7D715E] leading-relaxed">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A1612]">
                <ShieldCheck className="w-4 h-4 text-[#B88E4F]" />
                <span>Nạp Tiền An Toàn & Bảo Mật</span>
              </div>
              <p>
                Hệ thống SCANMS kết nối trực tiếp cổng thanh toán VietQR / payOS chuẩn Napas 24/7. Số dư được cộng vào ví ngay lập tức sau khi giao dịch chuyển khoản thành công.
              </p>
              <div className="pt-2 border-t border-[#EEDFC6]/60 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                  <span><strong>Miễn phí giao dịch:</strong> 100% không thu phí nạp đối với tất cả ứng dụng ngân hàng nội địa.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                  <span><strong>Bảo vệ hoàn tiền 14 ngày:</strong> Mọi giao dịch đặt mua từ ví đều tuân thủ chính sách đổi trả / hoàn tiền trong vòng 14 ngày.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <details className="block min-w-0 border border-[#EAE4D7] rounded-[12px] bg-white overflow-hidden [&[open]>summary]:border-b [&[open]>summary]:border-[#EAE4D7] [&[open]>summary_.cw-chevron]:rotate-180">
        <summary className="flex items-center gap-[11px] min-h-[64px] p-[12px_16px] cursor-pointer list-none hover:bg-[#FAF8F5] transition-colors select-none [&::-webkit-details-marker]:none @max-[599px]:gap-[9px] @max-[599px]:p-[13px_12px]">
          <span className="inline-flex items-center justify-center shrink-0 w-[34px] h-[34px] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]">
            <Clock size={17} />
          </span>
          <span className="grid gap-[3px] min-w-0 text-left">
            <strong className="text-[14px] font-[600] text-[#1A1612] @max-[599px]:text-[13px]">Lịch sử giao dịch</strong>
            <small className="text-[11px] text-[#7D715E] @max-[599px]:text-[10px]">Nạp tiền, thanh toán & hoàn tiền</small>
          </span>
          <span className="ml-auto p-[3px_7px] rounded-[6px] bg-[#F3EFE6] text-[10px] text-[#7D715E] whitespace-nowrap @max-[599px]:[&>span]:hidden">
            {ledger?.total ?? 0}<span> giao dịch</span>
          </span>
          <ChevronDown className="cw-chevron text-[#B88E4F] ml-2 shrink-0 transition-transform duration-200" size={15} />
        </summary>
        <div>
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
              <table className="min-w-[760px] w-full text-left text-[12px]">
                <thead className="bg-[#FAF8F5] text-[#7D715E] text-[11px] font-[550] border-b border-[#EAE4D7]">
                  <tr>
                    <th className="p-[11px_16px] font-[550]">Thời Gian</th>
                    <th className="p-[11px_16px] font-[550]">Nội Dung Biến Động</th>
                    <th className="p-[11px_16px] text-right font-[550]">Số Tiền</th>
                    <th className="p-[11px_16px] text-right font-[550]">Số Dư Trước</th>
                    <th className="p-[11px_16px] text-right font-[550]">Số Dư Sau</th>
                    <th className="p-[11px_16px] text-center font-[550]">Mã Tham Chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {ledger.entries.map((entry) => {
                    const badge = getLedgerBadge(entry);
                    return (
                      <tr key={entry.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-[11px_16px] text-[#7D715E] whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-[11px_16px]">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className={`p-[11px_16px] text-right font-mono font-semibold whitespace-nowrap ${badge.colorClass}`}>
                          {badge.sign}{formatMoney(Math.abs(Number(entry.amount)))}
                        </td>
                        <td className="p-[11px_16px] text-right text-[#7D715E] font-mono whitespace-nowrap">
                          {formatMoney(Number(entry.balanceBefore))}
                        </td>
                        <td className="p-[11px_16px] text-right text-[#1A1612] font-mono font-semibold whitespace-nowrap">
                          {formatMoney(Number(entry.balanceAfter))}
                        </td>
                        <td className="p-[11px_16px] text-center text-[#7D715E] font-mono text-[11px]">
                          {entry.referenceId ? (
                            <span className="bg-[#F3EFE6] px-1.5 py-0.5 rounded truncate max-w-[120px] inline-block" title={entry.referenceId}>
                              {entry.referenceId.slice(0, 8)}...
                            </span>
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
      </details>
    </section>
  );
};

