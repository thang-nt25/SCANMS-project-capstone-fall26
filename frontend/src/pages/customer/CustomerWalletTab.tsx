import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  ShoppingBag,
  Clock,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { walletService, type WalletSummary, type LedgerEntry, type LedgerHistory } from '../../services/wallet.service';
import { authService } from '../../services/auth.service';
import { formatMoney } from '../../features/marketplace/marketplaceUtils';
import { toast } from '../../utils/toast';
import { Link } from 'react-router-dom';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export const CustomerWalletTab: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const memoCode = `SCANMS NAP ${(currentUser?.id || 'WALLET').slice(-6).toUpperCase()}`;
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [customAmount, setCustomAmount] = useState<string>('500000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpTab, setTopUpTab] = useState<'SANDBOX' | 'VIETQR'>('SANDBOX');
  const [copiedMemo, setCopiedMemo] = useState(false);

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

    if (entry.referenceType === 'TOPUP_DEMO') {
      return {
        label: 'Nạp tiền thử nghiệm (Sandbox)',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        sign: '+',
        colorClass: 'text-emerald-700 font-bold',
      };
    }
    if (entry.referenceType === 'ORDER_REFUND') {
      return {
        label: 'Hoàn tiền đổi trả đơn hàng',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        sign: '+',
        colorClass: 'text-emerald-700 font-bold',
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
      badgeClass: isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200',
      sign: isPositive ? '+' : '-',
      colorClass: isPositive ? 'text-emerald-700 font-bold' : 'text-[#DC2626] font-bold',
    };
  };

  return (
    <div className="space-y-5 text-left">
      {/* 1. Thanh tiêu đề Ví Mua Sắm */}
      <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D7]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
            <Wallet className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#1A1612]">
            Ví Mua Sắm
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWalletData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] text-xs font-semibold text-[#1A1612] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#7D715E] ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <Link
            to="/marketplace"
            className="px-3.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mua sắm</span>
          </Link>
        </div>
      </div>

      {/* 2. Grid thẻ số dư & Khay nạp tiền */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột Trái (lg:col-span-5): Thẻ số dư ví */}
        <div className="lg:col-span-5 rounded-2xl border border-[#EEDFC6] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F5]">
              <span className="text-xs font-bold text-[#1A1612]">Số Dư Ví</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Đang hoạt động
              </span>
            </div>

            {/* Số dư khả dụng lớn */}
            <div>
              <span className="text-xs text-[#7D715E] block mb-1">Số dư khả dụng:</span>
              <div className="text-2xl sm:text-3xl font-black text-[#1A1612] tracking-tight">
                {formatMoney(Number(wallet?.availableBalance || 0))}
              </div>
            </div>

            {/* Số dư tạm giữ (nếu có đơn hoàn tiền đang xử lý) */}
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#7D715E]">
                <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Số dư chờ xử lý:</span>
              </div>
              <strong className="text-[#1A1612] font-bold">
                {formatMoney(Number(wallet?.pendingBalance || 0))}
              </strong>
            </div>
          </div>
        </div>

        {/* Cột Phải (lg:col-span-7): Khay nạp tiền */}
        <div className="lg:col-span-7 rounded-2xl border border-[#EEDFC6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF8F5]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#1A1612]">Nạp tiền vào ví</span>
            </div>

            {/* TAB SWITCHER: SANDBOX VS VIETQR */}
            <div className="flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setTopUpTab('SANDBOX')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  topUpTab === 'SANDBOX'
                    ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EEDFC6]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <span>🛠️</span>
                <span>Sandbox Test</span>
              </button>
              <button
                type="button"
                onClick={() => setTopUpTab('VIETQR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  topUpTab === 'VIETQR'
                    ? 'bg-white text-[#B88E4F] shadow-xs border border-[#EEDFC6]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>VietQR Ngân Hàng</span>
              </button>
            </div>
          </div>

          {topUpTab === 'SANDBOX' ? (
            /* TAB 1: SANDBOX DEV MODE */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E] flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-[#B88E4F]">Chế độ Sandbox:</span>
                  <span>Cộng tiền lập tức để test đặt hàng & hoàn tiền.</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6] text-[10px] font-bold">
                  Dev Mode
                </span>
              </div>

              {/* Chọn số tiền nhanh */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#7D715E] block">
                  Chọn mức nạp nhanh:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmount(String(amt))}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        customAmount === String(amt)
                          ? 'border-[#C59B58] bg-[#FBF5EB] text-[#B88E4F] ring-1 ring-[#C59B58]'
                          : 'border-[#EAE4D7] bg-white text-[#1A1612] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      +{amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập số tiền tùy chỉnh & Nút bấm nạp */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="10000"
                    step="50000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Nhập số tiền cần nạp..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE4D7] rounded-xl text-xs sm:text-sm text-[#1A1612] font-bold focus:outline-none focus:border-[#C59B58]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7D715E]">
                    VNĐ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={topUpLoading}
                  onClick={() => handleTopUp(Number(customAmount))}
                  className="px-5 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  {topUpLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý nạp...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Nạp tiền ngay (Demo)</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#7D715E] leading-relaxed">
                * Nạp tiền trực tiếp vào số dư ví để phục vụ kiểm thử đặt hàng, luân chuyển dòng tiền và chính sách hoàn tiền đổi trả 14 ngày (ORDER_REFUND).
              </p>
            </div>
          ) : (
            /* TAB 2: CỔNG THANH TOÁN VIETQR */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Mã QR */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7]">
                  <div className="w-40 h-40 bg-white p-2 rounded-xl border border-[#EEDFC6] shadow-2xs flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${Number(customAmount) || 500000}&addInfo=${encodeURIComponent(memoCode)}&accountName=SCANMS%20ESCROW`}
                      alt="VietQR Scanms"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SCANMS_NAP_TIEN';
                      }}
                    />
                  </div>
                  <span className="mt-2 text-[10.5px] font-bold text-[#B88E4F] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Quét mã VietQR 24/7</span>
                  </span>
                </div>

                {/* Thông tin chuyển khoản */}
                <div className="md:col-span-7 space-y-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-[#7D715E] block">Số tiền muốn nạp:</label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="10000"
                        step="50000"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#EAE4D7] rounded-lg text-xs font-bold text-[#1A1612] focus:outline-none focus:border-[#C59B58]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#7D715E]">VNĐ</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-2 text-[11.5px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7D715E]">Ngân hàng:</span>
                      <strong className="text-[#1A1612]">MB Bank (Quân Đội)</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7D715E]">Số tài khoản:</span>
                      <strong className="text-[#1A1612] font-mono text-xs">0987654321</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7D715E]">Chủ tài khoản:</span>
                      <strong className="text-[#1A1612]">SCANMS PLATFORM ESCROW</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-[#EAE4D7]">
                      <span className="text-[#7D715E]">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#B88E4F] font-mono font-bold">
                          {memoCode}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(memoCode);
                            setCopiedMemo(true);
                            setTimeout(() => setCopiedMemo(false), 2000);
                            toast.success('Đã sao chép nội dung chuyển khoản!');
                          }}
                          className="p-1 rounded bg-white hover:bg-[#FBF5EB] border border-[#EAE4D7] text-[#7D715E] hover:text-[#B88E4F] cursor-pointer"
                          title="Sao chép"
                        >
                          {copiedMemo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toast.success('Hệ thống đang chờ nhận biến động số dư VietQR. Số dư sẽ tự động cập nhật sau vài giây!');
                      void fetchWalletData();
                    }}
                    className="w-full py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Tôi đã chuyển khoản qua VietQR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bảng Lịch Sử Biến Động Số Dư (Ledger History) */}
      <div className="rounded-2xl border border-[#EAE4D7] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#B88E4F]" />
            <h3 className="text-sm font-bold text-[#1A1612]">Lịch Sử Giao Dịch & Biến Động Số Dư</h3>
          </div>
          <span className="text-xs text-[#7D715E]">
            Tổng số: <strong className="text-[#1A1612]">{ledger?.total ?? 0}</strong> giao dịch
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#7D715E] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#B88E4F] animate-spin" />
            <span>Đang tải lịch sử giao dịch ví...</span>
          </div>
        ) : !ledger?.entries || ledger.entries.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-xs text-[#7D715E]">Chưa có giao dịch nào phát sinh trên ví của bạn.</p>
            <p className="text-[11px] text-gray-400">Hãy thử nạp một khoản tiền Demo phía trên để bắt đầu mua sắm!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
          <div className="p-4 border-t border-[#EAE4D7] flex items-center justify-between text-xs bg-[#FAF8F5]">
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
    </div>
  );
};
