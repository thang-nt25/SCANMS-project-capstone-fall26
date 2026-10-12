import { useCallback, useEffect, useState } from 'react';
import { Users, Mail, X, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonList } from '../../components/ui/Skeleton';

type Member = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  createdAt: string;
  collaborator: {
    fullName: string;
    email: string;
    collaboratorProfile?: { totalFollowers: number; kycStatus: string };
    socialChannels?: Array<{ platformName: string; channelName?: string; followerCount: number }>;
  };
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Đang hoạt động', className: 'badge-success' },
  PENDING:  { label: 'Chờ KOL phản hồi', className: 'badge-warning' },
  REJECTED: { label: 'Đã từ chối', className: 'badge-danger' },
  BLOCKED:  { label: 'Đã khóa', className: 'badge-neutral' },
};

export default function StoreCollaboratorsPage() {
  const [storeId, setStoreId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [storeName, setStoreName] = useState('Cửa hàng');
  const [email, setEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/store-collaborators/shop');
      const body = res?.data || res;
      setMembers(body.members || []);
      setStoreName(body.store?.name || 'Cửa hàng');
      if (body.store?.id) {
        setStoreId(body.store.id);
        localStorage.setItem('current_store_id', body.store.id);
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Không thể tải đội ngũ CTV', error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) {
      setMessage({ text: 'Không xác định được gian hàng của tài khoản hiện tại', error: true });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res: any = await api.post('/store-collaborators/invite', { storeId, email });
      setMessage({ text: (res?.data || res)?.message || 'Đã gửi lời mời thành công!' });
      setShowInvite(false);
      setEmail('');
      await load();
    } catch (e: any) {
      setMessage({ text: e.message || 'Gửi lời mời thất bại', error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-3 sm:pt-4 pb-6 page-fade-in text-left">
      <PageHeader
        title="Đội ngũ CTV & KOL"
        description={`Quản lý cộng tác viên tiếp thị cho ${storeName}`}
        icon={<Users className="w-4 h-4" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="h-8 px-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#FBF5EB] text-[#7D715E] hover:text-[#B88E4F] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#B88E4F]' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowInvite(true); setMessage(null); }}
              className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A37B3E] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Mời KOL mới</span>
            </button>
          </div>
        }
      />

      {message && (
        <div className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
          message.error
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-[#EAE4D7] rounded-2xl shadow-xs overflow-hidden">
        {/* Table header */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#EAE4D7] bg-[#FAF8F5] text-[11px] font-bold text-[#7D715E] uppercase tracking-wider">
          {loading ? (
            <span className="text-xs">Đang tải đội ngũ…</span>
          ) : (
            <span>{members.length} thành viên trong đội ngũ</span>
          )}
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonList count={4} itemClassName="h-16 rounded-xl" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center">
              <Users className="w-6 h-6 text-[#B88E4F]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1612]">Gian hàng chưa có KOL/CTV nào</div>
              <p className="mt-1 text-xs text-[#7D715E]">Bấm "Mời KOL mới" và nhập email tài khoản KOL để bắt đầu hợp tác.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-[#EAE4D7] text-[11px] font-bold text-[#7D715E] uppercase tracking-wider bg-[#FAF8F5]">
                  <th className="py-3 px-4 font-bold">KOL / CTV</th>
                  <th className="py-3 px-4 font-bold">Kênh chính</th>
                  <th className="py-3 px-4 font-bold">Người theo dõi</th>
                  <th className="py-3 px-4 font-bold">Ngày tham gia</th>
                  <th className="py-3 px-4 font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]/70">
                {members.map((m) => {
                  const channel = m.collaborator.socialChannels?.[0];
                  const followers = channel?.followerCount || m.collaborator.collaboratorProfile?.totalFollowers || 0;
                  const statusCfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.BLOCKED;
                  return (
                    <tr key={m.id} className="hover:bg-[#FBF5EB]/40 transition-colors">
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-[#1A1612]">{m.collaborator.fullName}</div>
                        <div className="text-[11px] text-[#7D715E]">{m.collaborator.email}</div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        {channel ? (
                          <span className="font-semibold text-[#1A1612]">
                            {channel.platformName}{channel.channelName ? ` · ${channel.channelName}` : ''}
                          </span>
                        ) : (
                          <span className="text-[#7D715E]">Chưa cập nhật</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle font-semibold text-[#1A1612]">
                        {followers.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 align-middle text-[#7D715E]">
                        {new Date(m.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}
        >
          <form
            onSubmit={invite}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] p-6 flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#1A1612] m-0">Mời KOL/CTV vào {storeName}</h2>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">KOL sẽ nhận lời mời trong trang Thưởng doanh số của họ.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F3EFE6] flex items-center justify-center text-[#7D715E] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1612] mb-1.5">
                Email tài khoản KOL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D715E]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#EAE4D7] focus:border-[#B88E4F] focus:outline-none focus:ring-2 focus:ring-[#C59B58]/20 transition bg-white text-[#1A1612] placeholder:text-[#A89D8E]"
                  placeholder="kol@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="h-9 px-4 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A37B3E] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi…</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi lời mời</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

