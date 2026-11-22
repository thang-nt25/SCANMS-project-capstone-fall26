import { History, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getSafeProductImageUrl, handleProductImageError } from '@/utils/marketplace.utils';

const labels: Record<string,string> = {
  SAMPLE_VIOLATION_REPORTED:'Shop gửi báo cáo vi phạm', SAMPLE_VIOLATION_DISMISSED:'Không chấp nhận đề nghị khóa',
  SAMPLE_REQUESTS_BLOCKED:'Khóa quyền nhận mẫu', SAMPLE_ADMIN_DEADLINE_EXTENDED:'Manager/Admin gia hạn nộp video',
  SAMPLE_SHOP_DEADLINE_EXTENDED:'Shop gia hạn nộp video', SAMPLE_ADMIN_OBLIGATION_CANCELLED:'Miễn nghĩa vụ video',
  SAMPLE_VIDEO_SUBMITTED:'KOL nộp video mẫu', SAMPLE_REQUEST_OVERDUE:'Quá hạn nộp video', SAMPLE_REVISION_OVERDUE:'Quá hạn sửa video',
  SAMPLE_REQUEST_CREATED:'Gửi yêu cầu nhận mẫu', SAMPLE_REQUEST_APPROVED:'Duyệt yêu cầu nhận mẫu', SAMPLE_REQUEST_SHIPPED:'Shop gửi mẫu',
  SAMPLE_REQUEST_RECEIVED:'KOL nhận hàng mẫu', SAMPLE_REQUEST_REJECTED:'Từ chối yêu cầu', SAMPLE_REQUEST_CANCELLED:'Hủy yêu cầu',
};
type Sample = { id:string; createdAt?:string; receivedAt?:string; videoSubmittedAt?:string; product?:{title?:string;imageUrl?:string}; events?:Array<{id:string;action:string;createdAt:string;details?:{reason?:string}}>; videoAssets?:Array<{id:string;urlOrContent:string;title?:string;status:string;createdAt:string;rejectionReason?:string}> };
export function sampleEventLabel(action: string) { return labels[action] || 'Cập nhật hồ sơ'; }
export function sampleHistoryEvents(request: Sample) {
  const events=[...(request.events||[])];
  for(const [action,time] of [['SAMPLE_REQUEST_CREATED',request.createdAt],['SAMPLE_REQUEST_RECEIVED',request.receivedAt],['SAMPLE_VIDEO_SUBMITTED',request.videoSubmittedAt]]) {
    if(time && Number.isFinite(Date.parse(time)) && !events.some(event=>event.action===action))events.push({id:`stored-${action}`,action:action!,createdAt:time});
  }
  return events.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
const date=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});
export function SampleHistoryDialog({request,onClose}:{request:Sample;onClose:()=>void}) {
  const events=sampleHistoryEvents(request);
  return <Modal isOpen onClose={onClose} title="Lịch sử hàng mẫu" maxWidth="2xl" stickyHeader className="sample-history-modal sample-history-dialog">
    <div className="sample-history-product"><img src={getSafeProductImageUrl(request.product?.imageUrl)} onError={handleProductImageError} alt={request.product?.title||'Sản phẩm mẫu'}/><div><strong>{request.product?.title||'Sản phẩm mẫu'}</strong><span>Yêu cầu #{request.id.slice(0,8).toUpperCase()}</span></div></div>
    {!!request.videoAssets?.length && <section className="sample-history-videos"><h4>Video đã gửi · {request.videoAssets.length}</h4>{request.videoAssets.map(asset=><article key={asset.id}><div><a href={asset.urlOrContent} target="_blank" rel="noreferrer">{asset.title||'Video nghiệm thu'}<ExternalLink size={13}/></a><span>{({PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Từ chối',REVISION_REQUIRED:'Cần chỉnh sửa'})[asset.status]||'Chưa xác định kết quả'}</span></div><time>{date(asset.createdAt)}</time>{asset.rejectionReason&&<p>Lý do: {asset.rejectionReason}</p>}</article>)}</section>}
    {events.length ? <div className="sample-history-table"><table><thead><tr><th>Thời gian</th><th>Hoạt động · {events.length}</th></tr></thead><tbody>{events.map(event=><tr key={event.id}><td><time dateTime={event.createdAt}>{date(event.createdAt)}</time></td><td>{labels[event.action]||'Cập nhật hồ sơ'}{event.details?.reason&&<p>{event.details.reason}</p>}</td></tr>)}</tbody></table></div> : <div className="sample-history-empty"><History size={25}/><p>Chưa có sự kiện được ghi nhận</p></div>}
  </Modal>;
}
