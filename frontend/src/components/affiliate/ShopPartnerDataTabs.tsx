import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import api from '../../services/api';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';
import { CreateExclusiveDealModal } from '../chat/CreateExclusiveDealModal';
import { Modal } from '../ui/Modal';

interface TeamMember {
  collaboratorId:string;
  collaborator:{id:string;fullName:string;email:string;collaboratorProfile?:{avatarUrl?:string;kycStatus?:string;tier?:{name:string;extraBonusPercentage?:number|string}};socialChannels?:Array<{platformName:string;channelName?:string;channelUrl?:string;followerCount?:number}>};
  stats:{totalRevenue:number;totalOrders:number;completedVideosCount:number};
}
interface Team {store:{id:string;name:string};members:TeamMember[]}
export function useShopPartnerTeam() {
  return useQuery({queryKey:['shop-partner-team'],queryFn:async()=>{
    const response:any=await api.get('/store-collaborators/shop');
    const data=response?.data?.data??response?.data??response;
    if(!Array.isArray(data?.members)||!data?.store?.id)throw new Error('Không đọc được đội ngũ hợp tác.');
    return data as Team;
  },staleTime:30000,retry:1});
}
export function useShopPartnerDeals() {
  return useQuery({queryKey:['shop-exclusive-deals'],queryFn:()=>referralLinksService.getShopExclusiveDeals(),staleTime:30000,retry:1});
}
const money=(value:number|string)=>`${Number(value).toLocaleString('vi-VN')} ₫`;
const date=(value:string)=>new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
function PartnerName({member}:{member:TeamMember}) {
  const [failed,setFailed]=useState(false);const user=member.collaborator;
  return <div className="partner-data-person"><span>{user.collaboratorProfile?.avatarUrl&&!failed?<img src={user.collaboratorProfile.avatarUrl} alt="" onError={()=>setFailed(true)}/>:user.fullName.trim().charAt(0).toUpperCase()}</span><div><strong>{user.fullName}{user.collaboratorProfile?.kycStatus==='VERIFIED'&&<small title="Đã xác minh" className="partner-data-verified"> ✓</small>}</strong><p>{user.email}</p></div></div>;
}
function dealState(deal:ExclusiveDealProposal) {
  if(deal.closedAt)return 'Đã kết thúc';
  if(deal.status==='PENDING_ADMIN_APPROVAL')return 'Chờ Admin duyệt';
  if(deal.status==='APPROVED')return deal.isCurrentDeal?'Đang hiệu lực':'Đã duyệt';
  if(deal.status==='REJECTED')return 'Đã từ chối';
  return 'Đang đàm phán';
}
export function ShopPartnerDataTab({kind,onInvite}:{kind:'LEADERBOARD'|'DEALS';onInvite:()=>void}) {
  const team=useShopPartnerTeam();const deals=useShopPartnerDeals();
  const [search,setSearch]=useState('');const [filter,setFilter]=useState('ALL');
  const [choosing,setChoosing]=useState(false);const [partnerId,setPartnerId]=useState('');const [creating,setCreating]=useState<TeamMember|null>(null);
  const members=useMemo(()=>[...(team.data?.members||[])].sort((a,b)=>b.stats.totalRevenue-a.stats.totalRevenue),[team.data]);
  const matchedMembers=members.filter(member=>`${member.collaborator.fullName} ${member.collaborator.email}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
  const matchedDeals=(deals.data||[]).filter(deal=>`${deal.collaborator?.fullName||deal.collaboratorName||''} ${deal.product?.title||deal.productTitle||''} ${deal.vipVoucherCode||''}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN'))&&(filter==='ALL'||(filter==='HISTORY'?(!!deal.closedAt||deal.status==='REJECTED'):!deal.closedAt&&deal.status===filter)));
  const activeQuery=kind==='LEADERBOARD'?team:deals;
  return <div className="shop-partner-data" data-kind={kind}>
    <div className="partner-data-toolbar" role="group" aria-label={kind==='LEADERBOARD'?'Công cụ hiệu quả KOL':'Công cụ Deal độc quyền'}>
      {kind==='DEALS'&&<nav aria-label="Lọc Deal">{[['ALL','Tất cả'],['PENDING','Đàm phán'],['PENDING_ADMIN_APPROVAL','Chờ Admin'],['APPROVED','Đã duyệt'],['HISTORY','Đã kết thúc']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</nav>}
      <div className="partner-data-toolbar-actions">
        <label className="partner-data-search"><Search size={15}/><input aria-label={kind==='LEADERBOARD'?'Tìm KOL hợp tác':'Tìm Deal độc quyền'} placeholder={kind==='LEADERBOARD'?'Tìm tên, email KOL…':'Tìm KOL, sản phẩm…'} value={search} onChange={event=>setSearch(event.target.value)}/></label>
        <button type="button" className="partner-data-primary" onClick={()=>kind==='LEADERBOARD'?onInvite():setChoosing(true)}><Plus size={15}/>{kind==='LEADERBOARD'?'Mời KOL hợp tác':'Tạo Deal'}</button>
      </div>
    </div>
    {activeQuery.isLoading?<p role="status" className="partner-data-empty">Đang tải dữ liệu…</p>:activeQuery.isError?<div role="alert" className="partner-data-empty">Không tải được dữ liệu.<button type="button" onClick={()=>void activeQuery.refetch()}>Thử lại</button></div>:kind==='LEADERBOARD'?<div className="partner-data-table-wrap"><table><thead><tr><th>Hạng</th><th>KOL / Cộng tác viên</th><th>Kênh / Người theo dõi</th><th title="Toàn thời gian: đơn đã giao / hoàn tất, trừ tiền đã hoàn.">Doanh số thực nhận</th><th>Đơn hàng</th><th>Bậc KOL</th><th>Thao tác</th></tr></thead><tbody>{matchedMembers.map(member=>{const channel=member.collaborator.socialChannels?.[0];return <tr key={member.collaboratorId}><td className="partner-data-rank">{members.indexOf(member)+1}</td><td><PartnerName member={member}/></td><td>{channel?.channelName||channel?.platformName||'Chưa có kênh'}<small>{channel?.followerCount!=null?`${channel.followerCount.toLocaleString('vi-VN')} người theo dõi`:'Chưa ghi nhận lượt theo dõi'}</small></td><td className="partner-data-money">{money(member.stats.totalRevenue)}</td><td className="partner-data-number">{member.stats.totalOrders.toLocaleString('vi-VN')}</td><td>{member.collaborator.collaboratorProfile?.tier?.name||'Chưa ghi nhận'}</td><td><Link className="partner-data-link" to={`/merchant/kol-hub?kol=${encodeURIComponent(member.collaboratorId)}`}>Xem KOL</Link></td></tr>;})}{!matchedMembers.length&&<tr><td colSpan={7}><div className="partner-data-empty"><Users size={24}/><strong>{search?'Không tìm thấy KOL phù hợp':'Chưa có KOL hợp tác'}</strong>{!search&&<button type="button" onClick={onInvite}>Mời KOL hợp tác</button>}</div></td></tr>}</tbody></table></div>:<div className="partner-data-table-wrap"><table><thead><tr><th>KOL / Sản phẩm</th><th>Thù lao</th><th>KPI cam kết</th><th>Thời hạn</th><th>Voucher độc quyền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{matchedDeals.map(deal=><tr key={deal.id}><td><strong>{deal.collaborator?.fullName||deal.collaboratorName||'Chưa ghi nhận KOL'}</strong><small>{deal.scopeType==='STORE_WIDE'?'Toàn cửa hàng':deal.product?.title||deal.productTitle||'Sản phẩm trong Deal'}</small></td><td className="partner-data-number">{deal.approvedCommissionRate??deal.proposedCommissionRate}%</td><td>{deal.targetOrders!=null&&<span>{deal.targetOrders} đơn</span>}{deal.targetRevenue!=null&&<small>{money(deal.targetRevenue)}</small>}{deal.targetOrders==null&&deal.targetRevenue==null&&<span>Chưa ghi nhận</span>}</td><td>{deal.commitmentDays?`${deal.commitmentDays} ngày`:'Chưa ghi nhận'}<small>Đề xuất {date(deal.createdAt)}</small></td><td><code>{deal.vipVoucherCode||deal.referralLink?.customCouponCode||'Chưa phát hành'}</code></td><td><span className="partner-data-state">{dealState(deal)}</span></td><td><Link className="partner-data-link" to={`/merchant/kol-hub?tab=deals${deal.collaborator?.id||deal.collaboratorId?`&kol=${encodeURIComponent(deal.collaborator?.id||deal.collaboratorId!)}`:''}`}>Xem Deal</Link></td></tr>)}{!matchedDeals.length&&<tr><td colSpan={7}><div className="partner-data-empty"><strong>{search||filter!=='ALL'?'Không có Deal phù hợp bộ lọc':'Chưa có Deal độc quyền'}</strong><button type="button" onClick={()=>setChoosing(true)}>Tạo đề xuất Deal</button></div></td></tr>}</tbody></table></div>}
    {choosing&&<Modal isOpen title="Chọn KOL tạo Deal" maxWidth="lg" onClose={()=>setChoosing(false)} footer={<div className="partner-data-dialog-actions"><button type="button" onClick={()=>setChoosing(false)}>Quay lại</button><button type="submit" form="partner-deal-selection" className="partner-data-primary" disabled={!members.some(member=>member.collaboratorId===partnerId)}>Tiếp tục</button></div>}><form id="partner-deal-selection" onSubmit={event=>{event.preventDefault();const member=members.find(item=>item.collaboratorId===partnerId);if(member){setCreating(member);setChoosing(false);}}}><label>KOL đã hợp tác<select aria-label="KOL đã hợp tác" value={partnerId} onChange={event=>setPartnerId(event.target.value)}><option value="">Chọn KOL</option>{members.map(member=><option key={member.collaboratorId} value={member.collaboratorId}>{member.collaborator.fullName} · {member.collaborator.email}</option>)}</select></label>{team.isLoading&&<p>Đang tải KOL…</p>}{team.isError&&<p role="alert">Chưa tải được KOL. <button type="button" onClick={()=>void team.refetch()}>Thử lại</button></p>}{!team.isLoading&&!team.isError&&!members.length&&<div className="partner-data-empty">Chưa có KOL hợp tác.<button type="button" onClick={()=>{setChoosing(false);onInvite();}}>Mời KOL hợp tác</button></div>}</form></Modal>}
    {creating&&<CreateExclusiveDealModal collaboratorId={creating.collaboratorId} collaboratorName={creating.collaborator.fullName} storeId={team.data?.store.id} onClose={()=>setCreating(null)} onSuccess={()=>{setCreating(null);void deals.refetch();}}/>}
  </div>;
}
