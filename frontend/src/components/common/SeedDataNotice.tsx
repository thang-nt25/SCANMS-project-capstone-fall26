import type { UserProfile } from '../../services/auth.service';

/** Preserve attribution when a demo profile references a public creator. */
export function SeedDataNotice({ user }: { user: UserProfile | null }) {
  if (!user?.email?.toLowerCase().endsWith('@seed.scanms.test')) return null;
  const reference = user.collaboratorProfile?.socialLinksJson?.seedReference;
  if (reference?.purpose !== 'PUBLIC_REFERENCE_FOR_CAPSTONE_TESTING') return null;
  return <aside className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-3 text-xs leading-relaxed text-[#7D715E]" aria-label="Nguồn dữ liệu kiểm thử">
    <p>
      Tên và kênh của <strong>{String(reference.name)}</strong> chỉ dùng để tham khảo công khai; người này không đăng ký hoặc xác nhận hợp tác qua tài khoản thử nghiệm này.
    </p>
  </aside>;
}
