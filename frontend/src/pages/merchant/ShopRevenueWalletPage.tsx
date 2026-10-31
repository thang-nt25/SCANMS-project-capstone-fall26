import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, FileText, RefreshCw, Search, ShieldCheck, Wallet } from 'lucide-react';
import api from '../../services/api';
import { StoreFinanceReport } from '../../components/wallet/FinanceReports';
import { storeService, type StoreSettings } from '../../services/store.service';
import { payoutService, type MerchantPayout, type MerchantPayoutHistory } from '../../services/payout.service';

type PeriodDays = 7 | 30 | 90;
type FinanceTab = 'overview' | 'commissions';

interface ShopDashboard {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalCommissions: number;
  };
  charts: {
    revenueByDay: Array<{ date: string; revenue: number }>;
  };
}

const money = (value: number | string | null | undefined) =>
  `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

function unwrap<T>(response: unknown): T {
  const value = response as { data?: T } | null;
  return (value?.data ?? response) as T;
}

const payoutStatus: Record<string, string> = {
  PENDING: 'Chờ Shop xử lý',
  APPROVED: 'Đã xác nhận chi trả',
  REJECTED: 'Đã từ chối',
};

export default function ShopRevenueWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: FinanceTab = searchParams.get('tab') === 'commissions' || searchParams.get('tab') === 'withdrawals'
    ? 'commissions' : 'overview';
  const [days, setDays] = useState<PeriodDays>(30);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [dashboard, setDashboard] = useState<ShopDashboard | null>(null);
  const [payouts, setPayouts] = useState<MerchantPayoutHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeError, setStoreError] = useState(false);
  const [dashboardError, setDashboardError] = useState(false);
  const [payoutError, setPayoutError] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const requestSequence = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const sequence = ++requestSequence.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const storeResult = await storeService.getMyStore(refresh).catch(() => null);
      if (sequence !== requestSequence.current) return;
      setStore(storeResult);
      setStoreError(!storeResult?.id);

      const [dashboardResult, payoutResult] = await Promise.allSettled([
        api.get('/dashboard/shop', { params: { days }, headers: refresh ? { 'x-skip-cache': 'true' } : undefined }),
        storeResult?.id ? payoutService.list(storeResult.id, 1, '', { fresh: refresh }) : Promise.resolve(null),
      ]);
      if (sequence !== requestSequence.current) return;
      if (dashboardResult.status === 'fulfilled') {
        const data = unwrap<ShopDashboard>(dashboardResult.value);
        const valid = data?.summary && Array.isArray(data?.charts?.revenueByDay);
        setDashboard(valid ? data : null);
        setDashboardError(!valid);
      } else {
        setDashboard(null);
        setDashboardError(true);
      }

      if (payoutResult.status === 'fulfilled' && payoutResult.value) {
        const data = payoutResult.value;
        const valid = Array.isArray(data.requests);
        setPayouts(valid ? data : null);
        setPayoutError(!valid);
      } else {
        setPayouts(null);
        setPayoutError(Boolean(storeResult?.id));
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [days]);

  useEffect(() => {
    void load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  const points = dashboard?.charts.revenueByDay ?? [];
  const maxRevenue = Math.max(1, ...points.map((point) => Number(point.revenue) || 0));
  const visiblePayouts = useMemo(() => (payouts?.requests ?? []).filter((item) => {
    if (status !== 'ALL' && item.status !== status) return false;
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return !query || [item.collaboratorName, item.collaboratorEmail, item.id]
      .some((value) => value?.toLocaleLowerCase('vi-VN').includes(query));
  }), [payouts, search, status]);

  const changeTab = (next: FinanceTab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next });
  };

  return (
    <div id="merchant-finance-page" className="mx-auto w-full max-w-7xl space-y-5 pb-12 text-[#1A1612]">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-sm">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#B88E4F]"><Wallet size={20} /><span className="text-xs font-bold uppercase tracking-wider">Tài chính gian hàng</span></div>
          <h1 className="m-0 text-2xl font-black">{store?.name || 'Tổng quan tài chính Shop'}</h1>
          <p className="mb-0 mt-2 text-sm text-[#7D715E]">Theo dõi doanh số và các yêu cầu chi trả hoa hồng KOL từ dữ liệu của gian hàng.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-semibold text-[#B88E4F] hover:bg-[#F3EFE6] disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Làm mới
        </button>
      </section>

      {storeError && <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#DC2626]">Không tải được gian hàng. Vui lòng kiểm tra kết nối rồi bấm Làm mới.</div>}
      <div role="tablist" aria-label="Tài chính Shop" className="flex gap-2 rounded-2xl border border-[#EAE4D7] bg-[#F3EFE6] p-1.5">
        {([['overview', 'Doanh số Shop'], ['commissions', 'Chi trả KOL']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => changeTab(key)} className={`min-h-10 flex-1 rounded-xl px-3 text-sm font-bold transition ${tab === key ? 'bg-white text-[#B88E4F] shadow-sm' : 'text-[#7D715E] hover:bg-[#FBF5EB]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section role="tabpanel" className="space-y-5">
          {store?.id && <StoreFinanceReport key={`${store.id}-${refreshing}`} storeId={store.id} />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black">Doanh số theo kỳ</h2>
            <div aria-label="Khoảng thời gian" className="flex gap-1 rounded-xl border border-[#EAE4D7] bg-white p-1">
              {([7, 30, 90] as const).map((period) => <button key={period} type="button" aria-pressed={days === period} onClick={() => setDays(period)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${days === period ? 'bg-[#C59B58] text-[#231D15]' : 'text-[#7D715E] hover:bg-[#FBF5EB]'}`}>{period} ngày</button>)}
            </div>
          </div>
          {dashboardError && <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">Chưa tải được báo cáo doanh số. Bấm Làm mới để thử lại.</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Doanh thu ghi nhận', dashboard?.summary.totalRevenue, 'Giá trị đơn trong kỳ'],
              ['Đơn hàng', dashboard?.summary.totalOrders, 'Tổng số đơn trong kỳ'],
              ['Hoa hồng phát sinh', dashboard?.summary.totalCommissions, 'Theo đơn tiếp thị liên kết'],
            ].map(([label, value, detail], index) => <div key={String(label)} className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-wide text-[#7D715E]">{label}</div><div className="mt-3 text-2xl font-black">{loading || value == null ? '—' : index === 1 ? Number(value).toLocaleString('vi-VN') : money(Number(value))}</div><div className="mt-2 text-xs text-[#7D715E]">{detail}</div></div>)}
          </div>
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-sm">
            <h3 className="mb-1 mt-0 text-base font-bold">Doanh thu theo ngày</h3>
            <p className="mt-0 text-xs text-[#7D715E]">Biểu đồ dựa trên các đơn hàng thuộc khoảng thời gian đã chọn.</p>
            {points.length ? <div className="flex h-44 items-end gap-1 overflow-x-auto border-b border-[#EAE4D7] pb-1" role="img" aria-label={`Biểu đồ doanh thu ${days} ngày`}>
              {points.map((point, index) => <div key={`${point.date}-${index}`} className="group relative flex h-full min-w-2 flex-1 items-end" title={`${point.date}: ${money(point.revenue)}`}><div className="w-full rounded-t bg-[#C59B58] transition-colors group-hover:bg-[#B88E4F]" style={{ height: `${Math.max(3, (Number(point.revenue) || 0) / maxRevenue * 100)}%` }} /></div>)}
            </div> : <p className="rounded-xl bg-[#FAF8F5] p-6 text-center text-sm text-[#7D715E]">{loading ? 'Đang tải dữ liệu...' : 'Chưa có doanh thu trong kỳ.'}</p>}
          </div>
          <div className="flex flex-wrap gap-2"><Link to="/merchant/orders" className="inline-flex items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-sm font-semibold text-[#B88E4F]">Xem đơn hàng <ArrowRight size={15} /></Link><Link to="/merchant/payouts" className="inline-flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-sm font-semibold text-[#1A1612]">Quản lý chi trả KOL <ArrowRight size={15} /></Link></div>
          <p className="text-xs text-[#7D715E]">Doanh thu ghi nhận không phải số dư có thể rút. Số dư rút doanh thu Shop chỉ hiển thị khi có đối soát và API xác nhận.</p>
        </section>
      ) : (
        <section role="tabpanel" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['Chờ chi trả', payouts?.summary?.pending.count, payouts?.summary?.pending.netAmount, Clock3],
              ['Đã duyệt hôm nay', payouts?.summary?.approvedToday.count, payouts?.summary?.approvedToday.netAmount, ShieldCheck],
              ['Thuế đã giữ', payouts?.summary?.withheldTax.count, payouts?.summary?.withheldTax.amount, FileText],
            ] as const).map(([label, count, amount, Icon]) => <div key={label} className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold uppercase text-[#7D715E]"><Icon size={15} className="text-[#B88E4F]" />{label}</div><div className="mt-3 text-2xl font-black">{loading || count == null ? '—' : Number(count).toLocaleString('vi-VN')}</div><div className="mt-1 text-sm font-semibold text-[#B88E4F]">{loading || amount == null ? '—' : money(String(amount))}</div></div>)}
          </div>
          {payoutError && <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">Chưa tải được yêu cầu chi trả. Bấm Làm mới để thử lại.</p>}
          <div className="rounded-2xl border border-[#EAE4D7] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] p-4"><div><h2 className="m-0 text-base font-black">Yêu cầu chi trả gần đây</h2><p className="mb-0 mt-1 text-xs text-[#7D715E]">Hiển thị tối đa 10 yêu cầu mới nhất. Mở trang chi trả để xem đầy đủ và xử lý.</p></div><Link to="/merchant/payouts" className="inline-flex items-center gap-1 text-sm font-bold text-[#B88E4F]">Mở trang chi trả <ArrowRight size={15} /></Link></div>
            <div className="flex flex-wrap gap-2 p-4"><label className="flex min-w-40 flex-1 items-center gap-2 rounded-xl border border-[#EAE4D7] px-3"><Search size={15} className="text-[#7D715E]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm KOL hoặc mã yêu cầu" className="min-h-10 w-full outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Trạng thái chi trả" className="min-h-10 rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm"><option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chờ xử lý</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option></select></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#FAF8F5] text-xs uppercase text-[#7D715E]"><tr><th className="p-3">KOL</th><th className="p-3">Yêu cầu</th><th className="p-3">Thuế</th><th className="p-3">Thực nhận</th><th className="p-3">Trạng thái</th></tr></thead><tbody>{visiblePayouts.map((item: MerchantPayout) => <tr key={item.id} className="border-t border-[#EAE4D7]"><td className="p-3 font-semibold">{item.collaboratorName}</td><td className="p-3">{money(item.amount)}</td><td className="p-3">{money(item.taxAmount)}</td><td className="p-3 font-semibold text-[#B88E4F]">{money(item.netAmount)}</td><td className="p-3">{payoutStatus[item.status] || item.status}</td></tr>)}</tbody></table>{!loading && visiblePayouts.length === 0 && <p className="p-6 text-center text-sm text-[#7D715E]">{payoutError ? 'Không thể tải danh sách.' : 'Không có yêu cầu phù hợp.'}</p>}</div>
          </div>
        </section>
      )}
    </div>
  );
}
