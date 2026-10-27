import { useState } from 'react';
import { X } from 'lucide-react';
import type { UserProfile } from '../../services/auth.service';

/** Never present seeded verification, metrics or bank fixtures as a person's actual identity. */
export function SeedDataNotice({ user }: { user: UserProfile | null }) {
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  if (!user?.email?.toLowerCase().endsWith('@seed.scanms.test') || dismissedFor === user.email) return null;
  const reference = user.collaboratorProfile?.socialLinksJson?.seedReference;
  return <aside className="flex items-start gap-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-3 text-xs leading-relaxed text-[#7D715E]" aria-label="Nguồn dữ liệu kiểm thử">
    <div className="min-w-0 flex-1 self-center">
    <strong className="text-[#231D15]">Tài khoản kiểm thử Capstone.</strong>{' '}
    KYC, cấp bậc, follower, số dư và giao dịch seed là dữ liệu minh họa, không chứng minh xác minh danh tính hoặc thanh toán thật.
    {reference?.purpose === 'PUBLIC_REFERENCE_FOR_CAPSTONE_TESTING' && <p className="mt-1">
      Tên và kênh của <strong>{String(reference.name)}</strong> chỉ dùng để tham khảo công khai; người này không đăng ký hoặc xác nhận hợp tác qua tài khoản thử nghiệm này.
    </p>}
    </div>
    <button type="button" aria-label="Đóng thông báo dữ liệu kiểm thử" onClick={() => setDismissedFor(user.email!)} className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#231D15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]">
      <X size={16} aria-hidden="true" />
    </button>
  </aside>;
}
