import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../services/api';
import { Ticket, Plus, Megaphone, Send, Search, UserPlus, Check, Loader2, X } from 'lucide-react';
import type { Campaign } from '@/types/campaigns.types';
import { CreateCampaignModal } from '../../components/common/CreateCampaignModal';


const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Đã mời',
  ACCEPTED: 'Đã tham gia',
  REJECTED: 'Từ chối',
};

const STATUS_CLASS: Record<string, string> = {
  INVITED: 'bg-amber-50 text-amber-700 border border-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy');
const isExpired = (endDate: string) => new Date(endDate) < new Date();

interface KolContact {
  id: string;
  fullName: string;
  avatarUrl?: string;
  tier?: string;
  followers?: number;
  channelName?: string;
}

function InviteKolModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [kols, setKols] = useState<KolContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingKols, setLoadingKols] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadContacts() {
      setLoadingKols(true);
      try {
        const [convsRes, storeCollabsRes]: [any, any] = await Promise.all([
          api.get('/chat/conversations').catch(() => []),
          api.get('/store-collaborators/shop').catch(() => ({})),
        ]);

        const contactMap = new Map<string, KolContact>();

        // Process chat conversations
        const convList = Array.isArray(convsRes?.data) ? convsRes.data : Array.isArray(convsRes) ? convsRes : [];
        convList.forEach((c: any) => {
          const collab = c.collaborator || c.otherUser;
          if (collab?.id) {
            contactMap.set(collab.id, {
              id: collab.id,
              fullName: collab.fullName || collab.name || 'Nhà sáng tạo',
              avatarUrl: collab.collaboratorProfile?.avatarUrl || collab.avatarUrl,
              tier: collab.collaboratorProfile?.tier?.name || collab.tier || 'Thành viên',
              channelName: collab.collaboratorProfile?.socialChannels?.[0]?.channelName,
              followers: collab.collaboratorProfile?.totalFollowers,
            });
          }
        });

        // Process store partners
        const partners = Array.isArray(storeCollabsRes?.data) ? storeCollabsRes.data : Array.isArray(storeCollabsRes) ? storeCollabsRes : [];
        partners.forEach((p: any) => {
          const collab = p.collaborator || p;
          if (collab?.id && !contactMap.has(collab.id)) {
            contactMap.set(collab.id, {
              id: collab.id,
              fullName: collab.fullName || collab.name || 'Nhà sáng tạo',
              avatarUrl: collab.collaboratorProfile?.avatarUrl || collab.avatarUrl,
              tier: collab.collaboratorProfile?.tier?.name || collab.tier || 'Thành viên',
              channelName: collab.collaboratorProfile?.socialChannels?.[0]?.channelName,
              followers: collab.collaboratorProfile?.totalFollowers,
            });
          }
        });

        if (mounted) {
          setKols(Array.from(contactMap.values()));
        }
      } catch (err: any) {
        if (mounted) setError('Không thể tải danh sách nhà sáng tạo');
      } finally {
        if (mounted) setLoadingKols(false);
      }
    }
    loadContacts();
    return () => { mounted = false; };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      for (const kolId of selectedIds) {
        await api.post(`/campaigns/${campaign.id}/invite`, { collaboratorId: kolId });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gửi lời mời thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredKols = kols.filter((k) =>
    k.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (k.channelName && k.channelName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#EAE4D7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#B88E4F]" />
            <h2 className="text-base font-bold text-[#1A1612]">Mời đối tác tham gia chiến dịch</h2>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
            onClick={onClose}
            id="btn-close-invite"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 mx-6 mt-4 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <div className="text-xs font-bold text-[#1A1612] truncate">{campaign.name}</div>
            <div className="text-[11px] text-[#7D715E]">
              {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}
            </div>
          </div>
          <div className="text-sm font-extrabold text-[#B88E4F] shrink-0">
            +{campaign.bonusCommissionRate}% thưởng
          </div>
        </div>

        <div className="px-6 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên nhà sáng tạo hoặc kênh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#1A1612] outline-none focus:border-[#B88E4F]"
            />
          </div>
        </div>

        <form onSubmit={handleSendInvites} className="flex-1 flex flex-col min-h-0 px-6 pb-6 pt-2">
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[160px] pr-1">
            {loadingKols ? (
              <div className="flex items-center justify-center py-10 text-xs text-[#7D715E] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#B88E4F]" />
                <span>Đang tải danh sách nhà sáng tạo...</span>
              </div>
            ) : filteredKols.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#7D715E]">
                {kols.length === 0
                  ? 'Chưa có đối tác trong hộp thư. Hãy trao đổi với KOL trên sàn trước khi mời chiến dịch.'
                  : 'Không tìm thấy đối tác phù hợp.'}
              </div>
            ) : (
              filteredKols.map((kol) => {
                const selected = selectedIds.has(kol.id);
                return (
                  <div
                    key={kol.id}
                    onClick={() => toggleSelect(kol.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      selected
                        ? 'border-[#B88E4F] bg-[#FBF5EB]'
                        : 'border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#EAE4D7] text-[#B88E4F] font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                        {kol.avatarUrl ? (
                          <img src={kol.avatarUrl} alt={kol.fullName} className="w-full h-full object-cover" />
                        ) : (
                          kol.fullName?.[0] || 'K'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1A1612] truncate">{kol.fullName}</div>
                        <div className="text-[10px] text-[#7D715E] flex items-center gap-1.5 truncate">
                          <span className="font-medium text-[#B88E4F]">{kol.tier}</span>
                          {kol.channelName && <span>· @{kol.channelName}</span>}
                          {kol.followers != null && Number(kol.followers) > 0 && (
                            <span>· {Number(kol.followers).toLocaleString('vi-VN')} flw</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                      selected ? 'bg-[#C59B58] border-[#B88E4F] text-white' : 'border-[#EAE4D7] bg-white'
                    }`}>
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error && <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">{error}</div>}

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#EAE4D7] mt-3">
            <span className="text-xs text-[#7D715E]">
              Đã chọn: <strong className="text-[#1A1612]">{selectedIds.size}</strong> đối tác
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] transition cursor-pointer"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                id="btn-send-invite"
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                disabled={submitting || selectedIds.size === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi lời mời ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


function CampaignCard({
  campaign,
  vouchers = [],
  onInvite,
}: {
  campaign: Campaign;
  vouchers?: any[];
  onInvite: (c: Campaign) => void;
}) {
  const navigate = useNavigate();
  const expired = isExpired(campaign.endDate);
  const paused = !campaign.isActive;
  const scheduled = new Date(campaign.startDate) > new Date();
  const needsPolicy = !(Number(campaign.bonusBudgetTotal) > 0) || Number(campaign.bonusCommissionRate) < 1 || Number(campaign.bonusCommissionRate) > 2;
  const accepted = campaign.participants?.filter((p) => p.status === 'ACCEPTED').length || 0;
  const invited = campaign.participants?.filter((p) => p.status === 'INVITED').length || 0;

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
        expired ? 'border-[#EAE4D7] opacity-75' : 'border-[#EAE4D7]'
      }`}
      id={`campaign-${campaign.id}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-5 h-5 text-[#B88E4F] shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-[#1A1612] truncate">{campaign.name}</div>
              <div className="text-[11px] text-[#7D715E]">
                {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}
              </div>
            </div>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${
              expired
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {needsPolicy ? 'Cần tạo lại' : paused ? 'Tạm dừng' : expired ? 'Đã kết thúc' : scheduled ? 'Chưa bắt đầu' : 'Đang chạy'}
          </span>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-[#7D715E]">
          {needsPolicy ? 'Chiến dịch cũ chưa có ngân sách hợp lệ. Tạo chiến dịch mới với thưởng 1–2% và ngân sách trần.'
            : `Ngân sách thưởng: ${Number(campaign.bonusBudgetUsed || 0).toLocaleString('vi-VN')} / ${Number(campaign.bonusBudgetTotal).toLocaleString('vi-VN')} ₫`}
        </p>
        <div className="my-3 p-3 rounded-xl bg-[#FBF5EB] border border-[#EAE4D7] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#7D715E]">Hoa hồng thưởng thêm</span>
          <span className="text-xl font-black text-[#B88E4F]">+{campaign.bonusCommissionRate}%</span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-3 text-center">
          <div className="p-2 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7]">
            <div className="text-base font-black text-[#1A1612]">{accepted}</div>
            <div className="text-[10px] font-bold text-[#7D715E]">Đã tham gia</div>
          </div>
          <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
            <div className="text-base font-black text-[#B88E4F]">{invited}</div>
            <div className="text-[10px] font-bold text-[#7D715E]">Chờ phản hồi</div>
          </div>
        </div>

        {/* Vouchers đính kèm chiến dịch này */}
        <div className="my-3 pt-2.5 border-t border-[#EAE4D7]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#1A1612] flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-[#B88E4F]" />
              Voucher đính kèm ({vouchers.length})
            </span>
            {vouchers.length === 0 && (
              <span className="text-[10px] text-[#7D715E]">Chưa gắn voucher</span>
            )}
          </div>

          {vouchers.length > 0 ? (
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {vouchers.map((v) => {
                const discountText = v.discountType === 'PERCENTAGE'
                  ? `Giảm ${v.discountValue}%`
                  : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`;
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[11px] font-black text-[#8F682E] bg-white px-1.5 py-0.5 rounded border border-[#EEDFC6]">
                        {v.displayCode || v.code}
                      </span>
                      <span className="text-[11px] font-bold text-[#1A1612] truncate">
                        {discountText}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7D715E] shrink-0">
                      {v.minimumOrderAmount ? `Đơn từ ${Number(v.minimumOrderAmount / 1000).toLocaleString('vi-VN')}k` : 'Mọi đơn'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[#7D715E] italic">
              Chưa có voucher ưu đãi. Bấm "Thêm Voucher" để cấp mã cho KOL.
            </p>
          )}
        </div>

        {(campaign.participants?.length || 0) > 0 && (
          <div className="space-y-1.5 my-3 pt-2 border-t border-[#EAE4D7]">
            {campaign.participants?.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-lg bg-[#FAF8F5]"
                id={`participant-${p.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#EAE4D7] text-[#B88E4F] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    {p.collaborator?.fullName?.[0] || '?'}
                  </div>
                  <span className="text-xs font-semibold text-[#1A1612] truncate">
                    {p.collaborator?.fullName}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STATUS_CLASS[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#EAE4D7] mt-2 flex items-center gap-2">
        <button
          id={`btn-invite-${campaign.id}`}
          type="button"
          className="flex-1 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          onClick={() => onInvite(campaign)}
          disabled={expired || paused || needsPolicy}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Mời KOL Tham Gia</span>
        </button>

        <button
          id={`btn-add-voucher-${campaign.id}`}
          type="button"
          className="py-2.5 px-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#FAF8F5] text-[#1A1612] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          onClick={() => navigate(`/merchant/promotions?tab=coupons&createVoucher=1&campaignId=${campaign.id}`)}
          title="Tạo voucher gắn vào chiến dịch này"
        >
          <Ticket className="w-3.5 h-3.5 text-[#B88E4F]" />
          <span>Thêm Voucher</span>
        </button>
      </div>
    </div>
  );
}


export default function ShopCampaignsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [returnToDashboard, setReturnToDashboard] = useState(
    () => searchParams.get('returnTo') === 'dashboard',
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('returnTo') === 'dashboard') setReturnToDashboard(true);
    if (searchParams.get('create') === '1') setShowCreate(true);
    if (!searchParams.has('create') && !searchParams.has('returnTo')) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('create');
      next.delete('returnTo');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeCreateModal = () => {
    setShowCreate(false);
    if (returnToDashboard) {
      setReturnToDashboard(false);
      navigate('/merchant/dashboard', { replace: true });
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let storeId = localStorage.getItem('current_store_id') || '';
      const campRes: any = await api.get('/campaigns/shop');
      const rawCamps = campRes?.data?.data || campRes?.data || campRes || [];
      const campList = Array.isArray(rawCamps) ? rawCamps : [];
      setCampaigns(campList);

      if (!storeId && campList.length > 0 && campList[0].storeId) {
        storeId = campList[0].storeId;
      }
      if (!storeId) {
        try {
          const storeRes: any = await api.get('/stores/my-store');
          const myStore = storeRes?.data || storeRes;
          if (myStore?.id) storeId = myStore.id;
        } catch {
          // ignore
        }
      }

      if (storeId) {
        try {
          const coupRes: any = await api.get(`/stores/${storeId}/coupons`);
          const rawCoups = coupRes?.data?.data || coupRes?.data || coupRes || [];
          setCoupons(Array.isArray(rawCoups) ? rawCoups : []);
        } catch {
          setCoupons([]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={embedded ? "w-full min-w-0 flex flex-col gap-6" : "max-w-[1520px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6"} id="shop-campaigns-page">

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-xl bg-white border border-[#EAE4D7] text-[#B88E4F] text-xs font-extrabold shadow-lg z-50"
          role="alert"
        >
          {toast}
        </div>
      )}


      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D7]">
        <div>
          <h1 className="text-lg font-bold text-[#1A1612]">Chiến dịch tiếp thị</h1>
        </div>
        <button
          id="btn-new-campaign"
          type="button"
          className="px-4 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Chiến Dịch Mới</span>
        </button>
      </div>

      {/* Campaigns Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#1A1612]">
            Danh Sách Chiến Dịch ({campaigns.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-[#7D715E]">
            <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
            <span className="text-xs font-semibold">Đang tải danh sách chiến dịch...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#EAE4D7] rounded-2xl text-[#7D715E] p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#1A1612]">Chưa có chiến dịch nào</h3>
            <p className="text-xs text-[#7D715E] mt-1 max-w-md mx-auto mb-4">
              Tạo chiến dịch hoa hồng thưởng đầu tiên để thu hút KOL có tầm ảnh hưởng tham gia đẩy số cho gian hàng.
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              onClick={() => setShowCreate(true)}
            >
              + Tạo Chiến Dịch Ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => {
              const campVouchers = coupons.filter(
                (v) => v.campaignId === c.id || v.campaign?.id === c.id
              );
              return (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  vouchers={campVouchers}
                  onInvite={(target) => {
                    setInviteTarget(target);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCampaignModal
          onClose={closeCreateModal}
          onSuccess={() => {
            load();
            showToast('Đã tạo chiến dịch thành công!');
          }}
        />
      )}
      {inviteTarget && (
        <InviteKolModal
          campaign={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onSuccess={() => {
            load();
            showToast('Đã gửi lời mời tham gia chiến dịch thành công!');
          }}
        />
      )}
    </div>
  );
}

