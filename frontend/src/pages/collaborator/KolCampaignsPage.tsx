import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { CampaignParticipant } from '../../types/campaigns';

const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Chờ phản hồi',
  ACCEPTED: 'Đã tham gia',
  REJECTED: 'Đã từ chối',
};

const STATUS_CLASS: Record<string, string> = {
  INVITED: 'bg-amber-50 text-amber-700 border border-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const STATUS_ICON: Record<string, string> = {
  INVITED: '💌',
  ACCEPTED: '✅',
  REJECTED: '❌',
};

const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy');

export default function KolCampaignsPage() {
  const [invitations, setInvitations] = useState<CampaignParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/campaigns/my-invitations');
      setInvitations(res.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (participantId: string) => {
    setActionLoading(participantId + '-accept');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/accept`, {});
      showToast('🎉 Đã chấp nhận tham gia chiến dịch VIP thành công!');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (participantId: string) => {
    if (!confirm('Bạn chắc chắn từ chối lời mời này?')) return;
    setActionLoading(participantId + '-reject');
    try {
      await api.patch(`/campaigns/invitations/${participantId}/reject`, {});
      showToast('Đã từ chối lời mời.');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = invitations.filter((i) => i.status === 'INVITED');
  const others = invitations.filter((i) => i.status !== 'INVITED');

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6" id="kol-campaigns-page">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-xs font-extrabold shadow-lg z-50 border ${
            toast.type === 'success'
              ? 'bg-white border-[#EEDFC6] text-[#B88E4F]'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
          role="alert"
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="pb-2 border-b border-[#EAE4D7]">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1612] flex items-center gap-2.5">
          <span>💌</span> Lời Mời Chiến Dịch VIP
        </h1>
        <p className="text-sm text-[#7D715E] mt-1">
          Xem và phản hồi lời mời hợp tác độc quyền từ các gian hàng đối tác trên sàn SCANMS
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 flex flex-col shadow-xs">
          <span className="text-2xl font-black text-[#B88E4F]">{pending.length}</span>
          <span className="text-xs font-bold text-[#7D715E] mt-1">⏳ Chờ phản hồi</span>
        </div>
        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 flex flex-col shadow-xs">
          <span className="text-2xl font-black text-[#1A1612]">
            {invitations.filter((i) => i.status === 'ACCEPTED').length}
          </span>
          <span className="text-xs font-bold text-[#7D715E] mt-1">✅ Đang tham gia</span>
        </div>
        <div className="bg-white border border-[#EAE4D7] rounded-2xl p-4 flex flex-col shadow-xs">
          <span className="text-2xl font-black text-[#1A1612]">{invitations.length}</span>
          <span className="text-xs font-bold text-[#7D715E] mt-1">📋 Tổng lời mời nhận được</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 p-20 text-[#7D715E]">
          <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang tải danh sách lời mời...</span>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#EAE4D7] rounded-2xl text-[#7D715E] p-8 shadow-xs">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-base font-bold text-[#1A1612]">Chưa có lời mời nào</h3>
          <p className="text-xs text-[#7D715E] mt-1 max-w-md mx-auto">
            Khi các gian hàng đối tác gửi lời mời chiến dịch VIP với mức hoa hồng độc quyền, thẻ mời sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <>
          {/* Pending invitations */}
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold text-[#1A1612] flex items-center gap-2">
                <span>💌</span> Đang chờ phản hồi ({pending.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white border border-[#EEDFC6] rounded-2xl p-5 shadow-xs hover:shadow-md transition relative flex flex-col justify-between"
                    id={`invitation-${inv.id}`}
                  >
                    <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[11px] font-black text-[#B88E4F]">
                      🌟 VIP Campaign
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        {inv.campaign?.store?.logoUrl ? (
                          <img
                            src={inv.campaign.store.logoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full border border-[#EAE4D7] object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#F3EFE6] border border-[#EAE4D7] flex items-center justify-center font-black text-[#B88E4F]">
                            {inv.campaign?.store?.name?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-[#1A1612]">
                            {inv.campaign?.store?.name}
                          </div>
                          <div className="text-[11px] text-[#7D715E]">Gian hàng đối tác chính thức</div>
                        </div>
                      </div>

                      <div className="text-base font-extrabold text-[#1A1612]">
                        🎯 {inv.campaign?.name}
                      </div>

                      <div className="my-4 p-4 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-center">
                        <div className="text-xs font-semibold text-[#7D715E]">Hoa hồng thưởng thêm</div>
                        <div className="text-3xl font-black text-[#B88E4F] my-0.5">
                          +{inv.campaign?.bonusCommissionRate}%
                        </div>
                        <div className="text-[11px] text-[#7D715E]">
                          cộng thêm ngoài mức hoa hồng mặc định của gian hàng
                        </div>
                      </div>

                      <div className="text-xs text-[#7D715E] mb-4">
                        📅 Thời gian: {inv.campaign ? fmtDate(inv.campaign.startDate) : ''} →{' '}
                        {inv.campaign ? fmtDate(inv.campaign.endDate) : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#EAE4D7]">
                      <button
                        id={`btn-accept-${inv.id}`}
                        type="button"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-extrabold transition shadow-xs disabled:opacity-50 cursor-pointer"
                        onClick={() => handleAccept(inv.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === inv.id + '-accept' ? '⏳ Đang lưu...' : '✅ Chấp nhận tham gia'}
                      </button>
                      <button
                        id={`btn-reject-${inv.id}`}
                        type="button"
                        className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold transition disabled:opacity-50 cursor-pointer"
                        onClick={() => handleReject(inv.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === inv.id + '-reject' ? '⏳' : '❌ Từ chối'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold text-[#1A1612] flex items-center gap-2">
                <span>📋</span> Lịch sử lời mời ({others.length})
              </h2>
              <div className="space-y-2">
                {others.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white border border-[#EAE4D7] rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                    id={`history-${inv.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xl flex-shrink-0">{STATUS_ICON[inv.status]}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1A1612] truncate">
                          {inv.campaign?.name}
                        </div>
                        <div className="text-xs text-[#7D715E]">
                          {inv.campaign?.store?.name} · Thưởng thêm +{inv.campaign?.bonusCommissionRate}%
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold flex-shrink-0 ${
                        STATUS_CLASS[inv.status] || ''
                      }`}
                    >
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
