import { ReviewManagementPanel } from '@/components/product/ReviewManagementPanel';
export default function CustomerReviewModerationPage() {
  return (
    <main className="w-full min-w-0 pb-6" aria-label="Quản lý đánh giá và báo cáo">
      <ReviewManagementPanel admin />
    </main>
  );
}
