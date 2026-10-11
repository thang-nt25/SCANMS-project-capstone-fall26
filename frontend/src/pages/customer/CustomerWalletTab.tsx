import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  ShoppingBag,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Check,
} from 'lucide-react';
import { walletService, type WalletSummary, type LedgerEntry, type LedgerHistory } from '../../services/wallet.service';
import CustomerPayosTopUp from './CustomerPayosTopUp';
import { formatMoney } from '@/utils/marketplace.utils';
import { toast } from '../../utils/toast';
import { Link } from 'react-router-dom';
import './CustomerWalletTab.css';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export const CustomerWalletTab: React.FC = () => {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [customAmount, setCustomAmount] = useState<string>('500000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpTab, setTopUpTab] = useState<'SANDBOX' | 'PAYOS'>('PAYOS');

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
      toast.error(err?.response?.data?.message || 'Không thể nạp tiền thử nghiệm');
    } finally {
      setTopUpLoading(false);
    }
  };

  const getLedgerBadge = (entry: LedgerEntry) => {
    const isPositive =
      entry.transactionType === 'COMMISSION_APPROVED' ||
      entry.referenceType === 'TOPUP_DEMO' ||
      entry.referenceType === 'TOPUP_PAYOS' ||
      entry.referenceType === 'ORDER_REFUND';

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
    return {
      label: isPositive ? 'Cộng tiền vào ví' : 'Trừ tiền từ ví',
      badgeClass: isPositive ? 'bg-[#FBF5EB] text-[#7D715E] border-[#EEDFC6]' : 'bg-gray-50 text-gray-700 border-gray-200',
      sign: isPositive ? '+' : '-',
      colorClass: isPositive ? 'text-[#1A1612] font-bold' : 'text-[#DC2626] font-bold',
    };
  };

  return (
    <section className="customer-wallet" aria-labelledby="customer-wallet-title">
      <header className="cw-page-heading">
        <span className="cw-heading-icon" aria-hidden="true"><Wallet size={21} /></span>
        <div className="cw-heading-copy">
          <h1 id="customer-wallet-title">Ví mua sắm</h1>
          <p>Quản lý số dư, nạp tiền và theo dõi giao dịch.</p>
        </div>
        <div className="cw-actions">
          <button type="button" className="cw-button cw-refresh" disabled={loading} onClick={() => void fetchWalletData()}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /><span>Làm mới</span>
          </button>
          <Link to="/marketplace" className="cw-button cw-shopping">
            <ShoppingBag size={14} aria-hidden="true" /><span>Mua sắm</span>
          </Link>
        </div>
      </header>
      <section className="cw-balance" aria-label="Số dư ví" aria-busy={loading}>
        <div className="cw-balance-primary">
          <div className="cw-available">
            <span className="cw-label">Số dư khả dụng</span>
            <strong className="cw-amount">{loading && !wallet ? '—' : formatMoney(Number(wallet?.availableBalance || 0))}</strong>
          </div>
        </div>
        <div className="cw-balance-secondary">
          <span className="cw-state"><Check size={12} /> Đang hoạt động</span>
          <div className="cw-pending">
            <span className="cw-label"><Clock size={14} /> Chờ xử lý</span>
            <strong>{loading && !wallet ? '—' : formatMoney(Number(wallet?.pendingBalance || 0))}</strong>
          </div>
        </div>
      </section>
      <details className="cw-panel cw-deposit">
        <summary className="cw-panel-summary">
          <span className="cw-icon"><Plus size={17} /></span>
          <span className="cw-panel-copy"><strong>Nạp tiền vào ví</strong><small>Chọn số tiền và phương thức nạp</small></span>
          <span className="cw-summary-action"><span className="cw-closed-label">Nạp tiền</span><span className="cw-open-label">Thu gọn</span><ChevronDown size={15} /></span>
        </summary>
        <div className="cw-deposit-body">
          <div className="cw-methods" role="group" aria-label="Phương thức nạp tiền">
            <button type="button" aria-pressed={topUpTab === 'SANDBOX'} onClick={() => setTopUpTab('SANDBOX')}>Sandbox (Demo)</button>
            <button type="button" aria-pressed={topUpTab === 'PAYOS'} onClick={() => setTopUpTab('PAYOS')}><QrCode size={14} />payOS ngân hàng</button>
          </div>
          {topUpTab === 'SANDBOX' ? (
            <div className="cw-sandbox">
              <p className="cw-demo-note">Nạp thử nghiệm · Số dư được cộng ngay sau khi nạp.</p>
              <div className="cw-quick" role="group" aria-label="Chọn mức nạp nhanh">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} type="button" aria-pressed={customAmount === String(amt)} onClick={() => setCustomAmount(String(amt))}>
                    +{amt >= 1000000 ? (amt / 1000000) + 'M' : (amt / 1000) + 'k'}
                  </button>
                ))}
              </div>
              <div className="cw-amount-row">
                <div className="cw-input-wrap">
                  <label htmlFor="cw-demo-amount">Số tiền nạp</label>
                  <div className="cw-input">
                    <input id="cw-demo-amount" type="number" min="10000" step="50000" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Tối thiểu 10.000" />
                    <span>VNĐ</span>
                  </div>
                </div>
                <button type="button" className="cw-button cw-primary" disabled={topUpLoading} onClick={() => handleTopUp(Number(customAmount))}>
                  {topUpLoading ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                  {topUpLoading ? 'Đang xử lý...' : 'Nạp tiền (Demo)'}
                </button>
              </div>
              <details className="cw-help"><summary>Thông tin nạp thử nghiệm<ChevronDown size={13} /></summary>
                <p>Nạp trực tiếp vào số dư ví để kiểm thử đặt hàng và luân chuyển dòng tiền. Chính sách hoàn tiền đổi trả áp dụng trong 14 ngày (ORDER_REFUND).</p>
              </details>
            </div>
          ) : (
            <CustomerPayosTopUp onPaid={fetchWalletData} />
          )}
        </div>
      </details>
      <details className="cw-panel cw-history">
        <summary className="cw-panel-summary">
          <span className="cw-icon"><Clock size={17} /></span>
          <span className="cw-panel-copy"><strong>Lịch sử giao dịch</strong><small>Nạp tiền, thanh toán & hoàn tiền</small></span>
          <span className="cw-history-count">{ledger?.total ?? 0}<span> giao dịch</span></span>
          <ChevronDown className="cw-chevron" size={15} />
        </summary>
        <div className="cw-history-body">
        {loading ? (
          <div className="cw-empty" role="status">
            <RefreshCw className="w-5 h-5 text-[#B88E4F] animate-spin" />
            <span>Đang tải lịch sử giao dịch ví...</span>
          </div>
        ) : !ledger?.entries || ledger.entries.length === 0 ? (
          <div className="cw-empty">
            <Wallet className="cw-empty-icon" />
            <p className="text-xs text-[#7D715E]">Chưa có giao dịch</p>
            <p className="text-[11px] text-gray-400">Các khoản nạp, thanh toán và hoàn tiền sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="cw-table-scroll" tabIndex={0} aria-label="Lịch sử biến động số dư">
            <table className="cw-table w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#7D715E] uppercase text-[10px] font-bold border-b border-[#EAE4D7]">
                <tr>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Nội Dung Biến Động</th>
                  <th className="py-3 px-4 text-right">Số Tiền</th>
                  <th className="py-3 px-4 text-right">Số Dư Trước</th>
                  <th className="py-3 px-4 text-right">Số Dư Sau</th>
                  <th className="py-3 px-4 text-center">Mã Tham Chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8F5]">
                {ledger.entries.map((entry) => {
                  const badge = getLedgerBadge(entry);
                  return (
                    <tr key={entry.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3.5 px-4 text-[#7D715E] whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${badge.colorClass}`}>
                        {badge.sign}{formatMoney(Number(entry.amount))}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500 font-mono whitespace-nowrap">
                        {formatMoney(Number(entry.balanceBefore))}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#1A1612] font-mono font-semibold whitespace-nowrap">
                        {formatMoney(Number(entry.balanceAfter))}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#7D715E] font-mono text-[11px]">
                        {entry.referenceId ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px] inline-block" title={entry.referenceId}>
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
          <div className="cw-pagination">
            <span className="text-[#7D715E]">
              Trang {ledger.page} / {Math.ceil(ledger.total / ledger.limit)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={page >= Math.ceil(ledger.total / ledger.limit)}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 font-semibold"
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
