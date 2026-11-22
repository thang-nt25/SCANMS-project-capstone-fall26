import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AdminLiveSession } from '@/pages/admin/AdminLiveSessionsPage';
import { Modal } from '../ui/Modal';
import { LiveGovernancePanel } from './LiveGovernancePanel';
import { liveMoney,liveStatus } from './AdminLiveList';
import { getSafeProductImageUrl,handleProductImageError } from '@/utils/marketplace.utils';
export function AdminLiveSessionDialog({session,onClose,onChanged}:{session:AdminLiveSession;onClose:()=>void;onChanged:()=>void}) {
  const [tab,setTab]=useState('overview');
  const tabs=[['overview','Tổng quan'],['products','Sản phẩm'],['results','Hiệu quả'],['dispute','Tranh chấp'],['history','Lịch sử']];
  return <Modal isOpen onClose={onClose} title={session.title} subtitle={`${session.store.name} · ${session.creator.fullName}`} maxWidth="4xl" stickyHeader className="admin-live-dialog" belowHeader={<nav className="admin-live-tabs">{tabs.map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>}>
    {tab==='overview'&&<><dl className="admin-live-facts">{[['Trạng thái',liveStatus[session.status]||session.status],['Nền tảng',session.platform],['KOL',session.creator.fullName],['Cửa hàng',session.store.name],['Bắt đầu',new Date(session.startsAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})],['Mã phiên',session.id]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{/^https?:\/\//i.test(session.liveUrl)&&<a className="admin-live-external" href={session.liveUrl} target="_blank" rel="noreferrer">Mở phiên live<ExternalLink size={14}/></a>}</>}
    {tab==='products'&&<div className="admin-live-products">{session.products?.length?session.products.map(item=><article key={item.id}><img src={getSafeProductImageUrl(item.product.imageUrl)} onError={handleProductImageError} alt={item.product.title}/><div><strong>{item.product.title}</strong><p>{item.variant?.name||'Phân loại tiêu chuẩn'}</p></div><strong>{liveMoney(Number(item.product.price))}</strong></article>):<p>Chưa có sản phẩm trong phiên.</p>}</div>}
    {tab==='results'&&<dl className="admin-live-facts">{[['Đang xem',session.platform==='SCANMS'?session.report?.currentViewers??'—':'—'],['Tổng lượt xem',session.platform==='SCANMS'?session.report?.totalViewers??'—':'—'],['Đơn đã chốt',session.report?.orders??0],['Người mua',session.report?.buyers??0],['Đơn chờ',session.report?.pendingOrders??0],['Doanh số',liveMoney(session.report?.grossSales)],['Thù lao KOL',liveMoney(session.report?.commission)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {tab==='dispute'&&<LiveGovernancePanel session={session} audience="admin" onChanged={onChanged}/>}
    {tab==='history'&&<div className="admin-live-history">{session.governance?.timeline?.length?[...session.governance.timeline].sort((a,b)=>Date.parse(b.at||'')-Date.parse(a.at||'')).map((event,index)=><article key={`${event.at}-${index}`}><time>{event.at?new Date(event.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ghi thời gian'}</time><div><strong>{event.action}</strong><p>{event.message}</p><small>{event.role}</small></div></article>):<p>Chưa có sự kiện được ghi nhận.</p>}</div>}
  </Modal>;
}
