import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Copy, Gem, Medal, Plus, Search, Store, Users } from 'lucide-react';
import api from '../../services/api';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';
import { toast } from '../../utils/toast';
import { handleProductImageError } from '../../utils/image-fallback.utils';
import { normalizeSearch } from '../../utils/marketplace.utils';
import { CreateExclusiveDealModal } from '../chat/CreateExclusiveDealModal';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { ShopWorkspaceToolbar } from './ShopWorkspaceToolbar';

interface TeamMember {
  collaboratorId: string;
  collaborator: {
    id: string;
    fullName: string;
    email: string;
    collaboratorProfile?: { avatarUrl?: string; kycStatus?: string; tier?: { name: string; extraBonusPercentage?: number | string } };
    socialChannels?: Array<{ platformName: string; channelName?: string; channelUrl?: string; followerCount?: number }>;
  };
  stats?: { totalRevenue?: number | null; totalOrders?: number | null; completedVideosCount?: number };
}
interface Team { store: { id: string; name: string }; members: TeamMember[] }

export function useShopPartnerTeam() {
  return useQuery({
    queryKey: ['shop-partner-team'],
    queryFn: async () => {
      const response: any = await api.get('/store-collaborators/shop', { headers: { 'x-skip-cache': 'true' } });
      const data = response?.data?.data ?? response?.data ?? response;
      if (!Array.isArray(data?.members) || !data?.store?.id) throw new Error('Không đọc được đội ngũ hợp tác.');
      return data as Team;
    },
    staleTime: 30000, retry: 1,
  });
}

export function useShopPartnerDeals() {
  return useQuery({ queryKey: ['shop-exclusive-deals'], queryFn: () => referralLinksService.getShopExclusiveDeals(), staleTime: 30000, retry: 1 });
}

const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const voucherCode = (deal: ExclusiveDealProposal) => deal.vipVoucherCode || deal.referralLink?.customCouponCode;
const historyDeal = (deal: ExclusiveDealProposal) => Boolean(deal.closedAt) || deal.status === 'REJECTED'
  || Boolean(deal.commitmentEndsAt && Date.parse(deal.commitmentEndsAt) <= Date.now());

const dealFilters = [
  ['ALL', 'Tất cả'], ['PENDING', 'Đàm phán'], ['PENDING_ADMIN_APPROVAL', 'Chờ Admin'],
  ['APPROVED', 'Hiệu lực'], ['HISTORY', 'Kết thúc'],
];

function PartnerName({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  const user = member.collaborator;
  return <div className="partner-data-person">
    <span>{user.collaboratorProfile?.avatarUrl && !failed
      ? <img src={user.collaboratorProfile.avatarUrl} alt="" onError={() => setFailed(true)} />
      : user.fullName.trim().charAt(0).toUpperCase()}</span>
    <div className="min-w-0 break-words">
      <strong>{user.fullName}{user.collaboratorProfile?.kycStatus === 'VERIFIED' && <Check size={13} className="partner-data-verified ml-1 inline" aria-label="Đã xác minh" />}</strong>
      {user.email && <p>{user.email}</p>}
    </div>
  </div>;
}

function dealState(deal: ExclusiveDealProposal) {
  if (deal.status === 'REJECTED') return 'Đã từ chối';
  if (historyDeal(deal)) return 'Đã kết thúc';
  if (deal.status === 'PENDING_ADMIN_APPROVAL') return 'Chờ Admin duyệt';
  if (deal.status === 'APPROVED') return deal.isCurrentDeal ? 'Đang hiệu lực' : 'Đã duyệt';
  return 'Đang đàm phán';
}

export function ShopPartnerDataTab({ kind, onInvite }: { kind: 'LEADERBOARD' | 'DEALS'; onInvite: () => void }) {
  const team = useShopPartnerTeam();
  const deals = useShopPartnerDeals();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [choosing, setChoosing] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [creating, setCreating] = useState<TeamMember | null>(null);
  const leaderboard = kind === 'LEADERBOARD';
  const members = useMemo(() => [...(team.data?.members || [])].sort((a, b) =>
    ((sortBy === 'orders' ? b.stats?.totalOrders : b.stats?.totalRevenue) ?? -Infinity)
    - ((sortBy === 'orders' ? a.stats?.totalOrders : a.stats?.totalRevenue) ?? -Infinity)), [team.data, sortBy]);
  const selectedPartner = members.find(member => member.collaboratorId === partnerId);
  const partnerQuery = normalizeSearch(partnerSearch);
  const selectablePartners = choosing ? members.filter(({ collaborator }) =>
    normalizeSearch(`${collaborator.fullName} ${collaborator.email ?? ''}`).includes(partnerQuery)) : [];
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const matchedMembers = members.map((member, index) => ({ member, rank: index + 1 })).filter(({ member }) => {
    const { fullName, email, socialChannels } = member.collaborator;
    return (!tierFilter || member.collaborator.collaboratorProfile?.tier?.name === tierFilter) && [fullName, email, ...((socialChannels || []).flatMap(channel => [channel.channelName, channel.platformName, channel.channelUrl]))]
      .join(' ').toLocaleLowerCase('vi-VN').includes(query);
  });
  const matchedDeals = (deals.data || []).filter(deal => {
    const matchesFilter = filter === 'ALL'
      || (filter === 'HISTORY' ? historyDeal(deal) : !historyDeal(deal) && deal.status === filter
        && (filter !== 'APPROVED' || deal.isCurrentDeal !== false));
    return matchesFilter && [deal.collaborator?.fullName || deal.collaboratorName, deal.product?.title || deal.productTitle, voucherCode(deal)]
      .join(' ').toLocaleLowerCase('vi-VN').includes(query);
  });
  const activeQuery = leaderboard ? team : deals;

  async function copyVoucher(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Đã sao chép mã voucher.');
    } catch {
      toast.error('Không sao chép được mã voucher.');
    }
  }

  return <div className="shop-partner-data p-3!" data-kind={kind}>
    <div className="mb-3">
      <ShopWorkspaceToolbar label={leaderboard ? 'Công cụ hiệu quả KOL' : 'Công cụ Deal độc quyền'}
        search={<label className="relative block min-w-0"><Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label={leaderboard ? 'Tìm KOL hợp tác' : 'Tìm Deal độc quyền'}
            className="w-full min-w-0 border border-[#EAE4D7] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#C59B58]"
            placeholder={leaderboard ? 'Tìm tên, email, kênh…' : 'Tìm KOL, sản phẩm, mã voucher…'}
            value={search} onChange={event => setSearch(event.target.value)} />
        </label>}
        filters={leaderboard ? <div className="grid grid-cols-2 gap-2">
          <Select aria-label="Lọc cấp bậc KOL" portal value={tierFilter} onChange={event => setTierFilter(event.target.value)}
            options={[{ value: '', label: 'Cấp bậc' }, ...Array.from(new Set(members.flatMap(member => member.collaborator.collaboratorProfile?.tier?.name ? [member.collaborator.collaboratorProfile.tier.name] : []))).map(value => ({ value, label: value }))]}
            className="min-h-10 w-full py-0 text-xs" />
          <Select aria-label="Sắp xếp hiệu quả KOL" portal value={sortBy} onChange={event => setSortBy(event.target.value)}
            options={[{ value: 'revenue', label: 'Doanh số tại Shop' }, { value: 'orders', label: 'Số đơn tại Shop' }]} className="min-h-10 w-full py-0 text-xs" />
        </div> : <nav aria-label="Lọc Deal" className="grid grid-cols-3 gap-1 @[700px]:grid-cols-5">
          {dealFilters.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}
            className="min-w-0 whitespace-nowrap border border-transparent px-1 text-xs text-[#655A49] transition-colors hover:bg-[#FAF8F5] aria-pressed:border-[#EEDFC6] aria-pressed:bg-[#FBF5EB] aria-pressed:font-semibold aria-pressed:text-[#79592C]">{label}</button>)}
        </nav>}
        action={<button type="button" className="flex items-center justify-center gap-1 whitespace-nowrap border border-[#B88E4F] bg-[#C59B58] px-2 text-xs font-semibold text-[#231D15] hover:bg-[#B88E4F]" onClick={() => {
          if (leaderboard) { onInvite(); return; }
          setPartnerSearch('');
          setChoosing(true);
        }}>
          <Plus size={15} aria-hidden="true" />{leaderboard ? 'Mời KOL hợp tác' : 'Tạo Deal'}
        </button>} />
    </div>
    {activeQuery.isLoading ? <p role="status" className="partner-data-empty">Đang tải dữ liệu…</p>
      : activeQuery.isError ? <div role="alert" className="partner-data-empty">Không tải được dữ liệu.<button type="button" onClick={() => void activeQuery.refetch()}>Thử lại</button></div>
      : leaderboard ? <div className="partner-data-table-wrap"><table aria-label="Hiệu quả KOL">
        <thead><tr><th>Hạng</th><th>Nhà sáng tạo</th><th>Kênh & người theo dõi</th><th className="partner-data-number" title="Toàn thời gian · Đơn đã giao hoặc hoàn tất, trừ tiền đã hoàn">Doanh số thực nhận</th><th className="partner-data-number">Đơn hàng</th><th>Bậc KOL</th><th>Thao tác</th></tr></thead>
        <tbody>{matchedMembers.map(({ member, rank }) => {
          const channel = member.collaborator.socialChannels?.[0];
          const tier = member.collaborator.collaboratorProfile?.tier?.name;
          const TierIcon = tier && /DIAMOND|KIM CƯƠNG/i.test(tier) ? Gem : Medal;
          return <tr key={member.collaboratorId} data-partner-row>
            <td data-label="Hạng" className="partner-data-rank">{rank}</td>
            <td><PartnerName member={member} /></td>
            <td data-label="Kênh">{channel?.channelName ? `@${channel.channelName.replace(/^@+/, '')}` : channel?.platformName || '—'}
              <small>{channel?.followerCount != null ? `${channel.followerCount.toLocaleString('vi-VN')} người theo dõi` : '—'}</small></td>
            <td data-label="Doanh số thực nhận" className="partner-data-money">{member.stats?.totalRevenue != null ? money(member.stats.totalRevenue) : '—'}</td>
            <td data-label="Đơn hàng" className="partner-data-number">{member.stats?.totalOrders?.toLocaleString('vi-VN') ?? '—'}</td>
            <td data-label="Bậc KOL">{tier ? <span className="partner-data-state gap-1.5"><TierIcon size={13} aria-hidden="true" />{tier}</span> : '—'}</td>
            <td><Link className="partner-data-link" to={`/merchant/kol-hub?kol=${encodeURIComponent(member.collaboratorId)}`}>Xem KOL</Link></td>
          </tr>;
        })}
        {!matchedMembers.length && <tr><td colSpan={7}><div className="partner-data-empty"><Users size={22} aria-hidden="true" /><strong>{query ? 'Không tìm thấy KOL phù hợp' : 'Chưa có KOL hợp tác'}</strong></div></td></tr>}</tbody>
      </table></div> : <div className="partner-data-table-wrap"><table aria-label="Deal độc quyền">
        <thead><tr><th>KOL & sản phẩm</th><th className="partner-data-number">Thù lao</th><th className="partner-data-number">KPI cam kết</th><th>Thời hạn</th><th>Voucher</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{matchedDeals.map(deal => {
          const code = voucherCode(deal);
          const collaboratorId = deal.collaborator?.id || deal.collaboratorId;
          const isStoreWide = deal.scopeType === 'STORE_WIDE';
          const productTitle = isStoreWide
            ? 'Toàn cửa hàng'
            : deal.product?.title || deal.productTitle || 'Sản phẩm trong Deal';
          return <tr key={deal.id} data-partner-row>
            <td className="align-middle">
              <div className="flex min-h-10 min-w-0 items-center gap-2.5">
                {isStoreWide ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FBF5EB] text-[#805B27]">
                    <Store size={17} aria-hidden="true" />
                  </span>
                ) : (
                  <img src={deal.product?.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError}
                    alt="" loading="lazy" width={40} height={40}
                    className="size-10 shrink-0 rounded-lg border border-[#EAE4D7] bg-white object-contain" />
                )}
                <div className="grid min-w-0 gap-0.5 leading-4">
                  <strong className="text-[13px] font-semibold text-[#1A1612]">{deal.collaborator?.fullName || deal.collaboratorName || '—'}</strong>
                  <span className="text-xs text-[#7D715E] [overflow-wrap:anywhere]">{productTitle}</span>
                </div>
              </div>
            </td>
            <td data-label="Thù lao" className="partner-data-number">{deal.approvedCommissionRate ?? deal.proposedCommissionRate}%</td>
            <td data-label="KPI cam kết" className="partner-data-number">
              {deal.targetOrders != null && <div>{deal.targetOrders.toLocaleString('vi-VN')} đơn</div>}
              {deal.targetRevenue != null && <div>{money(deal.targetRevenue)}</div>}
              {deal.targetOrders == null && deal.targetRevenue == null && '—'}
            </td>
            <td data-label="Thời hạn">
              {deal.commitmentEndsAt ? <time dateTime={deal.commitmentEndsAt}>{date(deal.commitmentEndsAt)}</time> : <>
                {deal.commitmentDays ? `${deal.commitmentDays} ngày` : '—'}<small>Đề xuất {date(deal.createdAt)}</small>
              </>}
            </td>
            <td data-label="Voucher">{code ? <span className="inline-flex min-w-0 items-center gap-1">
              <code className="min-w-0 [overflow-wrap:anywhere]">{code}</code>
              <button type="button" aria-label={`Sao chép mã voucher ${code}`} title="Sao chép mã voucher"
                onClick={() => void copyVoucher(code)} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-brand-soft"><Copy size={14} aria-hidden="true" /></button>
            </span> : <span className="text-muted">Chưa phát hành</span>}</td>
            <td data-label="Trạng thái"><span className="partner-data-state">{dealState(deal)}</span></td>
            <td><Link className="partner-data-link" to={`/merchant/kol-hub?tab=deals${collaboratorId ? `&kol=${encodeURIComponent(collaboratorId)}` : ''}`}>Xem Deal</Link></td>
          </tr>;
        })}
        {!matchedDeals.length && <tr><td colSpan={7}><div className="partner-data-empty"><strong>{query || filter !== 'ALL' ? 'Không có Deal phù hợp bộ lọc' : 'Chưa có Deal độc quyền'}</strong></div></td></tr>}</tbody>
      </table></div>}
    {choosing && createPortal(<Modal isOpen stickyHeader title="Chọn KOL tạo Deal" maxWidth="xl"
      className="max-w-[600px]!" bodyClassName="max-h-[307px] p-0! [scrollbar-width:thin]"
      onClose={() => setChoosing(false)}
      belowHeader={<div className="shrink-0 border-b border-[#EAE4D7] px-4 py-3 sm:px-6">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-[#EAE4D7] px-3 focus-within:border-[#C59B58]">
          <Search size={16} className="shrink-0 text-[#7D715E]" aria-hidden="true" />
          <input type="search" aria-label="Tìm KOL theo tên hoặc email" placeholder="Tìm theo tên hoặc email…"
            value={partnerSearch} onChange={event => setPartnerSearch(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
        </label>
      </div>}
      footer={<div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 break-words text-xs text-[#7D715E]" aria-live="polite">
          {selectedPartner && <>Đã chọn <strong className="font-semibold text-[#1A1612]">{selectedPartner.collaborator.fullName}</strong></>}
        </span>
        <div className="partner-data-dialog-actions ml-auto">
          <button type="button" onClick={() => setChoosing(false)}>Quay lại</button>
          <button type="button" className="partner-data-primary" disabled={!selectedPartner || team.isError}
            onClick={() => { if (selectedPartner) { setCreating(selectedPartner); setChoosing(false); } }}>Tiếp tục</button>
        </div>
      </div>}>
      {team.isLoading ? <p role="status" className="m-0 px-6 py-5 text-sm text-[#7D715E]">Đang tải KOL…</p>
        : team.isError ? <p role="alert" className="m-0 px-6 py-5 text-sm text-[#7D715E]">Chưa tải được KOL. <button type="button" className="font-medium text-[#715126] underline" onClick={() => void team.refetch()}>Thử lại</button></p>
        : !members.length ? <div className="partner-data-empty">Chưa có KOL hợp tác.<button type="button" onClick={() => { setChoosing(false); onInvite(); }}>Mời KOL hợp tác</button></div>
        : !selectablePartners.length ? <p className="m-0 px-6 py-5 text-center text-sm text-[#7D715E]">Không tìm thấy KOL phù hợp.</p>
        : <ul aria-label="KOL đã hợp tác" className="m-0 list-none divide-y divide-[#EAE4D7] p-0">
          {selectablePartners.map(member => {
            const selected = member.collaboratorId === partnerId;
            const tier = member.collaborator.collaboratorProfile?.tier?.name;
            return <li key={member.collaboratorId}>
              <button type="button" aria-pressed={selected} onClick={() => setPartnerId(member.collaboratorId)}
                className="flex min-h-[60px] w-full items-center justify-between gap-2 rounded-none! px-4 py-2 text-left text-sm hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58] aria-pressed:bg-[#FBF5EB] sm:px-6">
                <PartnerName member={member} />
                <span className="flex shrink-0 items-center gap-2" aria-hidden={!tier}>
                  {tier && <span className="partner-data-state">{tier}</span>}
                  <span className={`grid size-5 place-items-center rounded-full border ${selected ? 'border-[#C59B58] bg-[#C59B58] text-[#231D15]' : 'border-[#D8CDB9] bg-white'}`} aria-hidden="true">{selected && <Check size={13} />}</span>
                </span>
              </button>
            </li>;
          })}
        </ul>}
    </Modal>, document.body)}
    {creating && <CreateExclusiveDealModal collaboratorId={creating.collaboratorId} collaboratorName={creating.collaborator.fullName}
      storeId={team.data?.store.id} onClose={() => setCreating(null)} onSuccess={() => { setCreating(null); void deals.refetch(); }} />}
  </div>;
}
