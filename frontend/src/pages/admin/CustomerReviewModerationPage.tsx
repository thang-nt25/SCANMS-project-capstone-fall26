import { ReviewManagementPanel } from '@/components/product/ReviewManagementPanel';
export default function CustomerReviewModerationPage() {
  return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6"><div><h1 className="text-2xl font-bold text-[#1A1612]">Đánh giá & báo cáo</h1><p className="mt-1 text-sm text-[#7D715E]">Bảo vệ phản hồi trung thực của người mua trên SCANMS.</p></div><ReviewManagementPanel admin /></main>;
}
