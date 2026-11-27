import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HubTabs } from '@/components/common/HubTabs';
import { ReviewManagementPanel } from '@/components/product/ReviewManagementPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useControlledTab } from '@/hooks/useControlledTab';
import api from '@/services/api';

const tabs = ['reviews', 'history'] as const;
type ReviewTab = (typeof tabs)[number];

interface ModerationEvent {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  reviewId: string | null;
  productId: string | null;
  productTitle: string | null;
  decision: string | null;
  previousStatus: string | null;
  reason: string | null;
}

interface ModerationHistoryPage {
  items: ModerationEvent[];
  hasMore: boolean;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

function moderationLabel(event: ModerationEvent) {
  switch (event.action) {
    case 'PRODUCT_REVIEW_HIDDEN': return 'Đã ẩn';
    case 'PRODUCT_REVIEW_REJECTED': return 'Đã từ chối';
    case 'PRODUCT_REVIEW_REPORT_RESOLVED':
      if (event.decision === 'HIDE') return 'Đã ẩn sau báo cáo';
      if (event.decision === 'KEEP') return 'Giữ công khai sau báo cáo';
      return 'Đã xử lý báo cáo';
    case 'PRODUCT_REVIEW_APPROVED':
      return event.previousStatus === 'REJECTED' || event.previousStatus === 'HIDDEN' ? 'Đã khôi phục' : 'Đã công khai';
    default: return 'Đã kiểm duyệt';
  }
}

function ReviewModerationHistory() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['product-review-moderation-history', page],
    queryFn: async ({ signal }) => {
      const response = await api.get<unknown, { data: ModerationHistoryPage }>(
        '/products/reviews/moderation/history', { params: { page }, signal },
      );
      if (!Array.isArray(response.data?.items)) throw new Error('Không đọc được lịch sử kiểm duyệt.');
      return response.data;
    },
  });

  return (
    <Card className="overflow-hidden rounded-2xl border-[#EAE4D7] bg-white p-0 shadow-none">
      <h2 className="m-0 border-b border-[#EAE4D7] px-4 py-3 text-sm font-semibold text-[#1A1612] sm:px-5">Lịch sử kiểm duyệt</h2>
      {isPending || isError || !data?.items.length ? (
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-10 text-center text-sm text-[#7D715E]" role={isError ? 'alert' : 'status'}>
          {isPending ? 'Đang tải lịch sử…' : isError ? 'Chưa tải được lịch sử kiểm duyệt.' : 'Chưa có quyết định kiểm duyệt.'}
          {isError && <Button variant="outline" size="sm" onClick={() => void refetch()}>Thử lại</Button>}
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Các quyết định kiểm duyệt" tabIndex={0}>
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[#655A49]">
              <tr>
                {['Sản phẩm', 'Quyết định', 'Người xử lý', 'Thời điểm', 'Lý do'].map(label => (
                  <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {data.items.map(event => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-semibold">
                    {event.productId && event.productTitle ? (
                      <Link to={`/products/${event.productId}`} className="hover:underline">{event.productTitle}</Link>
                    ) : 'Sản phẩm không còn trong danh mục'}
                    {event.reviewId && <span className="mt-1 block font-normal text-[#7D715E]" title={event.reviewId}>Đánh giá {event.reviewId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3"><span className="whitespace-nowrap rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[#795A2D]">{moderationLabel(event)}</span></td>
                  <td className="px-4 py-3">{event.actorName ?? 'Chưa ghi nhận'}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums"><time dateTime={event.createdAt}>{dateFormat.format(new Date(event.createdAt))}</time></td>
                  <td className="max-w-sm whitespace-pre-wrap px-4 py-3 wrap-anywhere">{event.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || data?.hasMore) && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EAE4D7] px-4 py-3 text-xs">
          <span>Trang {page}</span>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</Button>
          <Button variant="outline" size="sm" disabled={!data?.hasMore} onClick={() => setPage(page + 1)}>Trang sau</Button>
        </div>
      )}
    </Card>
  );
}

export default function CustomerReviewModerationPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<ReviewTab>({ defaultTab: 'reviews', validTabs: tabs });
  return (
    <main className="flex w-full min-w-0 flex-col gap-3 pb-6 text-[#1A1612]" aria-label="Quản lý đánh giá và báo cáo">
      <HubTabs
        className="mb-0"
        variant="framed"
        tone="white"
        stretchTabs
        stretchTabColumns={2}
        tabs={[
          { id: 'reviews', label: 'Đánh giá sản phẩm', icon: Star },
          { id: 'history', label: 'Lịch sử kiểm duyệt', icon: History },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as ReviewTab)}
      />
      {visitedTabs.reviews && <div hidden={activeTab !== 'reviews'}><ReviewManagementPanel admin standalone /></div>}
      {activeTab === 'history' && <ReviewModerationHistory />}
    </main>
  );
}
