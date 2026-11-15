import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, Package, ShoppingBag, Store } from 'lucide-react';
import { analyticsService, type ReferralOrderItem } from '../../services/analytics.service';
import { handleProductImageError } from '../../utils/image-fallback.utils';
import { kolOrderCommissionStatus } from '../../utils/kol-order-status';
import { KolReferralOrderDialog } from '../../components/affiliate/KolReferralOrderDialog';
import KolProductCommissionTable from '../../components/affiliate/KolProductCommissionTable';
import KolLivePerformanceCard from '../../components/affiliate/KolLivePerformanceCard';
import './kol-dashboard.css';

type ReportTab = 'orders' | 'products' | 'stores' | 'live';
export default function KolMarketingReportsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeTab: ReportTab = ['orders', 'products', 'stores', 'live'].includes(params.get('tab') || '') ? params.get('tab') as ReportTab : 'orders';
  const setActiveTab = (tab: ReportTab) => setParams({ tab });
  const [copiedOrderSn, setCopiedOrderSn] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ReferralOrderItem | null>(null);
  const { data: referralOrdersData, isFetching: isFetchingReferralOrders } = useQuery({
    queryKey: ['kol-referral-orders', 'report-v2', ordersPage, selectedStore?.id],
    queryFn: () => analyticsService.getCollaboratorReferralOrders({ limit: 10, page: ordersPage, storeId: selectedStore?.id }, true).catch(() => null),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const { data: topProductsData, isFetching: isFetchingProducts } = useQuery({
    queryKey: ['kol-top-products'],
    queryFn: () => analyticsService.getCollaboratorTopProducts(10).catch(() => null),
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const { data: liveData, isFetching: isFetchingLive } = useQuery({
    queryKey: ['kol-live-summary'],
    queryFn: () => analyticsService.getCollaboratorLiveSessionsSummary().catch(() => null),
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const referralOrders = referralOrdersData?.items || [];
  const topProducts = topProductsData?.items || [];
  const liveSummary = {
    sessions: liveData?.sessions || [],
    totals: liveData?.totals || { totalLiveRevenue: 0, totalLiveCommission: 0, totalLiveOrders: 0 },
  };

  const storeBreakdown = referralOrdersData?.stores || [];


  return <section id="kol-overview" className="kol-marketing-reports flex min-w-0 flex-col gap-4 pb-8" aria-label="Báo cáo tiếp thị">
    <header className="kol-report-page-heading"><Link to="/collaborator/dashboard"><ArrowLeft size={16}/>Tổng quan</Link><h1>Báo cáo tiếp thị</h1><span>Lũy kế mọi thời gian</span></header>
      <div className="flex flex-col min-w-0 rounded-2xl border border-[#EAE4D7] bg-white shadow-xs overflow-hidden">
        {/* Khay tab điều hướng */}
        <div className="px-3 py-3 border-b border-[#EAE4D7] bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5" role="group" aria-label="Loại báo cáo tiếp thị">
            {([
              { id: 'orders', label: 'Đơn hàng', count: referralOrdersData?.total || 0 },
              { id: 'products', label: 'Sản phẩm', count: topProductsData?.totalProducts || 0 },
              { id: 'stores', label: 'Cửa hàng', count: storeBreakdown.length },
              { id: 'live', label: 'Livestream', count: liveSummary.sessions.length },
            ] as const).map((tab, index) => (
              <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 min-h-[42px] sm:min-h-[46px] px-2.5 py-2 border rounded-[10px] text-[11px] sm:text-[12px] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#b88e4f] focus-visible:outline-offset-2 ${activeTab === tab.id ? "border-[#eedfc6] bg-[#fbf5eb] text-[#1a1612] font-semibold" : "border-[#eae4d7] bg-white text-[#7d715e] font-medium"}`}>
                <span className={`grid place-items-center shrink-0 w-[25px] h-[25px] border rounded-full text-[11px] font-normal ${activeTab === tab.id ? "border-[#c59b58] text-[#9a7135]" : "border-[#eae4d7]"}`} aria-hidden="true">{index + 1}</span>
                <span>{tab.label}</span><small className="rounded-[5px] px-[5px] py-[1px] bg-[#faf8f5] text-[10px] tabular-nums text-[#7d715e]">{tab.count}</small>
              </button>
            ))}
          </div>

          <span className="kol-report-scope block mt-2 text-[11px] text-[#7D715E]">
            Lũy kế mọi thời gian · {activeTab === 'orders' && '10 đơn mỗi trang'}
            {activeTab === 'products' && `Top ${topProducts.length} sản phẩm theo thù lao ghi nhận`}
            {activeTab === 'stores' && `${storeBreakdown.length} gian hàng đối tác`}
            {activeTab === 'live' && `${liveSummary.sessions.length} phiên gần nhất · số liệu trong danh sách`}
          </span>
          {selectedStore && activeTab === 'orders' && <div className="kol-store-filter">Cửa hàng: {selectedStore.name}<button type="button" onClick={() => { setSelectedStore(null); setOrdersPage(1); }}>Xóa bộ lọc</button></div>}
        </div>

        {/* Nội dung Tab 1: Đơn hàng tiếp thị */}
        {activeTab === 'orders' && !referralOrdersData ? <p role="status" className="kol-report-empty">{isFetchingReferralOrders ? 'Đang tải đơn hàng…' : 'Chưa tải được báo cáo đơn hàng. Vui lòng thử tải lại.'}</p> : activeTab === 'orders' &&
          (referralOrders.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center mb-2.5">
              <Package size={22} />
            </div>
            <strong className="text-sm font-semibold text-[#1A1612]">Chưa phát sinh đơn hàng qua liên kết</strong>
            <p className="text-xs text-[#7D715E] max-w-md mt-1 mb-3.5">
              Khi khách hàng nhấp vào link tiếp thị và đặt mua sản phẩm, đơn hàng và hoa hồng tạm tính sẽ xuất hiện ngay tại đây.
            </p>
            <button
              type="button"
              onClick={() => navigate('/collaborator/marketing?tab=links')}
              className="px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Lấy link chia sẻ ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="kol-orders-table w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7]">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Mã / Thời gian đặt</th>
                  <th className="px-3.5 py-2.5 font-bold">Sản phẩm & Gian hàng</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Giá trị đơn</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Thù lao ghi nhận</th>
                  <th className="px-3.5 py-2.5 font-bold text-center">Trạng thái đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {referralOrders.map((order) => {
                  const isReturned = order.status === 'RETURNED' || order.status === 'REFUNDED';
                  const firstProduct = order.products?.[0];
                  const otherCount = (order.products?.length || 1) - 1;

                  return (
                    <tr key={order.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-[#1A1612]">
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="kol-order-link" onClick={() => setSelectedOrder(order)}>{order.orderCode}</button>
                          <button
                            type="button"
                            aria-label={`Sao chép mã đơn ${order.orderCode}`}
                            onClick={() => {
                              navigator.clipboard.writeText(order.orderCode);
                              setCopiedOrderSn(order.orderCode);
                              setTimeout(() => setCopiedOrderSn(null), 1500);
                            }}
                            className="text-[#7D715E] hover:text-[#B88E4F] p-0.5 rounded cursor-pointer"
                            title="Sao chép mã đơn"
                          >
                            {copiedOrderSn === order.orderCode ? (
                              <Check size={12} className="text-[#059669]" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <time className="kol-order-date" dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</time>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0 max-w-xs">
                          {firstProduct?.imageUrl ? (
                            <img
                              src={firstProduct.imageUrl} onError={handleProductImageError}
                              alt={firstProduct.title}
                              className="w-8 h-8 rounded-lg object-cover border border-[#EAE4D7] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center shrink-0">
                              <ShoppingBag size={14} className="text-[#B88E4F]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1A1612] truncate block" title={firstProduct?.title}>
                              {firstProduct?.title || 'Sản phẩm tiếp thị'}
                              {otherCount > 0 && ` (+${otherCount})`}
                            </span>
                            <span className="text-[10px] text-[#7D715E] truncate block">
                              {order.storeName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-[#1A1612] tabular-nums whitespace-nowrap">
                        {order.finalAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-3.5 py-3 text-right font-extrabold text-[#B88E4F] tabular-nums whitespace-nowrap">
                        {isReturned ? (
                          <span className="text-rose-600">0 ₫</span>
                        ) : (
                          `+${order.commissionAmount.toLocaleString('vi-VN')} ₫`
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="kol-commission-status" data-status={order.commissionStatus}>{kolOrderCommissionStatus(order)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {referralOrdersData && <div className="kol-report-pagination"><span>{(ordersPage - 1) * 10 + 1}–{Math.min(ordersPage * 10, referralOrdersData.total)} / {referralOrdersData.total} đơn</span><div><button type="button" disabled={ordersPage <= 1} onClick={() => setOrdersPage(page => page - 1)}>Trước</button><span>{ordersPage} / {Math.max(1, referralOrdersData.totalPages)}</span><button type="button" disabled={ordersPage >= referralOrdersData.totalPages} onClick={() => setOrdersPage(page => page + 1)}>Sau</button></div></div>}
          </div>
        ))}

      {/* Nội dung Tab 2: Hiệu suất theo sản phẩm */}
      {activeTab === 'products' && (
        <div className="p-0">
          {topProductsData === null ? <p className="kol-report-empty">Chưa tải được số liệu sản phẩm.</p> : <KolProductCommissionTable items={topProducts} loading={isFetchingProducts} />}
        </div>
      )}

      {/* Nội dung Tab: Phân bổ hoa hồng theo gian hàng */}
      {activeTab === 'stores' && (
        <div className="overflow-x-auto">
          <table className="kol-stores-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[11px] font-semibold text-[#7D715E]">
                <th className="py-3 px-4">Cửa hàng</th>
                <th className="py-3 px-4 text-center">Số đơn</th>
                <th className="py-3 px-4 text-right">Doanh số (GMV)</th>
                <th className="py-3 px-4 text-right">Thù lao ghi nhận</th>
                <th className="py-3 px-4 text-right">Tỷ trọng thù lao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {!storeBreakdown.length && <tr><td colSpan={5} className="text-center text-[#7D715E]">{referralOrdersData ? 'Chưa có doanh số cửa hàng được ghi nhận.' : 'Chưa tải được số liệu cửa hàng.'}</td></tr>}
              {storeBreakdown.map((item, idx) => (
                <tr key={item.storeName || idx} className="hover:bg-[#FBF5EB]/40 transition">
                  <td className="py-3 px-4 font-semibold text-[#1A1612]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-center text-[#B88E4F] shrink-0">
                        {item.storeLogo ? <img src={item.storeLogo} alt="" className="size-7 rounded-lg object-contain" onError={event => { event.currentTarget.src = '/assets/store-placeholder.svg'; }}/> : <Store size={14} />}
                      </div>
                      <button type="button" className="kol-store-link" onClick={() => { setSelectedStore({ id: item.storeId, name: item.storeName }); setOrdersPage(1); setActiveTab('orders'); }}>{item.storeName}</button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-[#1A1612] tabular-nums font-medium">
                    {item.ordersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[#1A1612] tabular-nums">
                    {item.totalRevenue.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#B88E4F] tabular-nums">
                    {item.totalCommission.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <div className="w-16 h-1.5 rounded-full bg-[#EAE4D7] overflow-hidden">
                        <div
                          className="h-full bg-[#C59B58] rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#7D715E] w-8 tabular-nums">
                        {item.percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nội dung Tab 3: Phiên Livestream */}
      {activeTab === 'live' && (
        <div className="p-0">
          {liveData === null ? <p className="kol-report-empty">Chưa tải được số liệu livestream.</p> : <KolLivePerformanceCard
            sessions={liveSummary.sessions}
            totals={liveSummary.totals}
            loading={isFetchingLive}
          />}
        </div>
      )}
    </div>

    {selectedOrder && <KolReferralOrderDialog order={selectedOrder} onClose={() => setSelectedOrder(null)}/>}
  </section>;
}
