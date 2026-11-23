import { ExternalLink, Video } from 'lucide-react';
import { pendingSampleVideo, sampleVideoLink, type SubmittedSampleVideo } from '../../utils/sample-video';

/** Keep the latest review visible without opening the shipping or history panels. */
export default function SampleSubmittedVideo({ sample }: { sample: SubmittedSampleVideo }) {
  if (!sample.reviewVideoUrl) return null;
  const href = sampleVideoLink(sample.reviewVideoUrl);
  const current = pendingSampleVideo(sample);
  const submittedAt = sample.videoSubmittedAt ? new Date(sample.videoSubmittedAt) : null;
  return (
    <section className="mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3" aria-label="Video review hiện tại">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-[#795A2D]"><Video size={14} />Video KOL đã nộp</p>
          <p className="mb-0 mt-1 break-words text-sm font-semibold text-[#1A1612]">{sample.videoTitle || current?.title || 'Video review sản phẩm'}</p>
          {submittedAt && Number.isFinite(submittedAt.getTime()) && <p className="mb-0 mt-1 text-[11px] text-[#7D715E]">Nộp lúc {submittedAt.toLocaleString('vi-VN')}</p>}
        </div>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" data-sample-current-video
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#C59B58] bg-white px-3 py-2 text-xs font-bold text-[#795A2D] transition hover:bg-[#F3EFE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]">
          <ExternalLink size={14} />Xem video đã nộp
        </a> : <span className="text-xs text-[#DC2626]">Link video không hợp lệ. Vui lòng yêu cầu KOL kiểm tra lại.</span>}
      </div>
      {sample.status === 'VIDEO_SUBMITTED' && !current && <p className="mb-0 mt-2 text-xs text-[#D97706]">Chưa tìm thấy bản video chờ duyệt tương ứng. Hãy làm mới trước khi nghiệm thu.</p>}
    </section>
  );
}
