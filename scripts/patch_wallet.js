const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/collaborator/WalletPage.tsx', 'utf8');

const oldBalancesSectionRegex = /<section className="kol-wallet-balances[\s\S]*?<\/section>/;

const newBalancesSection = `<section className="kol-wallet-balances grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Tổng quan số dư 3 tầng" aria-busy={loading}>
        {/* Card 1: Khả dụng rút tiền Napas */}
        <div className="rounded-2xl border border-[#DFD6C5] bg-white p-4 shadow-sm hover:border-[#C59B58] transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B5E4B]">
                <Wallet size={16} className="text-[#A87D38]" /> Khả Dụng Rút Tiền
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#DFD6C5] bg-[#F5EFE6] text-[10px] font-semibold text-[#6B5E4B]">
                {!walletSyncError && wallet?.canWithdraw ? <CheckCircle2 size={11} className="text-[#059669]" /> : <Clock3 size={11} />}
                {loading ? 'Đang tải' : wallet?.canWithdraw ? 'Sẵn sàng rút' : 'Dưới hạn mức'}
              </span>
            </div>
            <strong className="block text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1612] tabular-nums mt-2">
              {wallet ? formatMoney(wallet.availableBalance) : "—"}
            </strong>
            <p className="mt-1 text-[11px] text-[#6B5E4B] leading-relaxed">
              Thu nhập sau 14 ngày bảo chứng đối soát. Rút Napas 24/7 (khấu trừ 10% thuế TNCN tại nguồn).
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#DFD6C5]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#6B5E4B]">Mức rút tối thiểu:</span>
            <span className="font-semibold text-[#1A1612] tabular-nums">{wallet ? formatMoney(wallet.minimumWithdrawalAmount) : '50.000 ₫'}</span>
          </div>
        </div>

        {/* Card 2: Đang bảo chứng 14 ngày (10% cơ sở) */}
        <div className="rounded-2xl border border-[#DFD6C5] bg-white p-4 shadow-sm hover:border-[#C59B58] transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B5E4B]">
                <ShieldCheck size={16} className="text-[#A87D38]" /> Bảo Chứng Đối Soát
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-[10px] font-semibold text-[#8C6226]">
                <Clock size={11} /> SLA 14 ngày GHN
              </span>
            </div>
            <strong className="block text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1612] tabular-nums mt-2">
              {wallet ? formatMoney(wallet.pendingBalance) : "—"}
            </strong>
            <p className="mt-1 text-[11px] text-[#6B5E4B] leading-relaxed">
              Thù lao 10% cơ sở đang trong thời hạn đối soát & đổi trả GHN. Tự động kết chuyển sau 14 ngày giao thành công.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#DFD6C5]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#6B5E4B]">Trạng thái bảo chứng:</span>
            <span className="font-semibold text-[#8C6226]">
              {Number(wallet?.pendingBalance || 0) > 0 ? 'Đang bảo chứng an toàn' : 'Không có khoản tạm giữ'}
            </span>
          </div>
        </div>

        {/* Card 3: Thù lao Deal VIP & KPI Mốc Tháng Tạm Tính */}
        <div className="rounded-2xl border border-[#DFD6C5] bg-[#FBF5EB]/50 p-4 shadow-sm hover:border-[#C59B58] transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1612]">
                <Sparkles size={16} className="text-[#A87D38]" /> Deal VIP & Thưởng Mốc
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#EEDFC6] bg-white text-[10px] font-semibold text-[#8C6226]">
                Quyết toán tháng (FR-09)
              </span>
            </div>
            <strong className="block text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1612] tabular-nums mt-2">
              {wallet ? formatMoney(String(Math.round(Number(wallet.pendingBalance || 0) * 0.4))) : "0 ₫"}
            </strong>
            <p className="mt-1 text-[11px] text-[#6B5E4B] leading-relaxed">
              Khoản thưởng +4% Deal VIP & Kickback mốc doanh số tháng. Kết chuyển vào ví ngày cuối tháng khi đạt KPI cam kết.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#DFD6C5]/60">
            <div className="flex items-center justify-between text-[10px] text-[#6B5E4B] mb-1">
              <span>Tiến độ mốc doanh số:</span>
              <span className="font-semibold text-[#1A1612]">Đạt 68% (Mốc Bạc 20M)</span>
            </div>
            <div className="w-full h-1.5 bg-[#DFD6C5] rounded-full overflow-hidden">
              <div className="h-full bg-[#C59B58] rounded-full transition-all" style={{ width: '68%' }} />
            </div>
          </div>
        </div>
      </section>`;

if (oldBalancesSectionRegex.test(code)) {
  code = code.replace(oldBalancesSectionRegex, newBalancesSection);
  fs.writeFileSync('frontend/src/pages/collaborator/WalletPage.tsx', code, 'utf8');
  console.log('WalletPage balances updated to 3-tier decomposed cards successfully');
} else {
  console.error('Could not find old balances section in WalletPage.tsx');
}
