import { useState } from 'react';
import type { SampleRequestItem } from '../../pages/merchant/ShopKolHubPage';
import { SampleSandboxWaybills } from './SampleGhnEnvironmentPicker';
import { CalendarDays, CalendarX, ExternalLink, Truck, Play, Copy, Check } from 'lucide-react';

function videoThumbnail(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : /^(www\.)?youtube\.com$/.test(parsed.hostname) ? parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1] : null;
    return id && /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined;
  } catch { return undefined; }
}

export function PartnerSampleDetails({ item }: { item: SampleRequestItem }) {
  const [copied, setCopied] = useState(false);
  const channelUrl = item.socialChannelUrlSnapshot || item.socialChannel?.channelUrl;
  const assets = item.videoAssets || [];
  const videos = assets.length ? assets : item.reviewVideoUrl ? [{id:item.id,title:item.videoTitle || 'Video review đã nộp',urlOrContent:item.reviewVideoUrl,status:'',createdAt:item.videoSubmittedAt,rejectionReason:null}] : [];
  const liveCharges = item.shippingCharges?.filter(charge => charge.environment !== 'TEST') || [];
  const testTracking = item.shippingCharges?.some(charge => charge.environment === 'TEST' && charge.trackingNumber === item.trackingCode);
  const copyTracking = async () => { try { await navigator.clipboard.writeText(item.trackingCode || ''); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch { setCopied(false); } };
  return <div className="partner-sample-details">
    <div className="partner-sample-columns">
      <section aria-label="Vận chuyển mẫu">
        <h5><Truck size={14}/>Vận chuyển</h5>
        <SampleSandboxWaybills charges={item.shippingCharges} role="shop" compact productId={item.product.id} productTitle={item.product.title} sampleRequestId={item.id}/>
        {item.trackingCode && !testTracking && <div className="partner-live-waybill">
          <div className="flex min-w-0 items-center gap-2"><strong className="min-w-0 break-all">{item.carrier || 'Vận chuyển'} · {item.trackingCode}</strong><button type="button" title="Sao chép vận đơn" aria-label="Sao chép vận đơn" onClick={()=>void copyTracking()} className="grid size-7 shrink-0 place-items-center rounded text-[#90682F] hover:bg-[#FBF5EB]">{copied?<Check size={14}/>:<Copy size={14}/>}</button></div>
          <dl><div><dt>Cước Shop trả</dt><dd>{liveCharges.some(charge=>charge.amount!=null) ? `${liveCharges.filter(charge=>charge.amount!=null).reduce((sum,charge)=>sum+Number(charge.amount),0).toLocaleString('vi-VN')} ₫${liveCharges.some(charge=>charge.amount==null)?' · Chưa đủ cước':''}`:'Chưa ghi nhận'}</dd></div><div><dt>Thu hộ KOL</dt><dd>{Math.max(0,...liveCharges.map(charge=>Number(charge.codAmount || 0))).toLocaleString('vi-VN')} ₫</dd></div></dl>
        </div>}
        {!item.trackingCode && !item.shippingCharges?.some(charge=>charge.environment==='TEST') && <p className="partner-sample-muted">Chưa có vận đơn</p>}
      </section>
      <section aria-label="Người nhận mẫu">
        <h5>Người nhận</h5>
        <strong>{item.recipientName || item.collaboratorInfo?.fullName || 'Chưa có người nhận'}</strong>
        {item.recipientPhone && <p className="partner-recipient-phone">{item.recipientPhone}</p>}
        <p>{item.shippingAddress || 'Chưa có địa chỉ nhận mẫu'}</p>
        {(item.socialPlatformSnapshot || item.socialChannel) && <div className="partner-sample-channel">
          {channelUrl?<a href={channelUrl} target="_blank" rel="noreferrer">{item.socialPlatformSnapshot || item.socialChannel?.platformName} · {item.socialChannelNameSnapshot || item.socialChannel?.channelName || 'Kênh đã chọn'}<ExternalLink size={12}/></a>:<strong>{item.socialPlatformSnapshot || item.socialChannel?.platformName} · {item.socialChannelNameSnapshot || item.socialChannel?.channelName}</strong>}
          <span>{Number(item.socialFollowerSnapshot ?? item.socialChannel?.followerCount ?? 0).toLocaleString('vi-VN')} người theo dõi</span>
        </div>}
        {item.note && <div className="partner-content-commitment"><span className="partner-sample-muted">Cam kết nội dung</span><p>{item.note}</p></div>}
      </section>
    </div>
    {videos.length>0 && <section className="partner-sample-videos" aria-label="Video đã nộp">
      {videos.map(asset=>{
        const submitted = asset.createdAt || (videos.length===1 || asset.urlOrContent===item.reviewVideoUrl ? item.videoSubmittedAt : undefined);
        const date = submitted ? new Date(submitted) : null;
        const invalid = date && (!Number.isFinite(date.getTime()) || date.getTime()<new Date(item.createdAt).getTime());
        const poster = videoThumbnail(asset.urlOrContent);
        const directVideo = /\.(mp4|webm|mov)(?:[?#]|$)|cloudinary\.com\/.*\/video\//i.test(asset.urlOrContent);
        const statusLabel = asset.status === 'APPROVED' ? 'Đã nghiệm thu'
          : asset.status === 'REJECTED' ? 'Cần chỉnh sửa' : 'Chờ duyệt';
        return <div key={asset.id} className="partner-video-row">
          <div className="partner-video-thumbnail" aria-hidden="true">
            {poster ? <img src={poster} alt="" onError={event => { event.currentTarget.hidden = true; }}/>
              : directVideo ? <video src={asset.urlOrContent} preload="metadata" muted playsInline/> : null}
            <span className="absolute grid size-6 place-items-center rounded-full bg-white/95 shadow-sm">
              <Play size={13}/>
            </span>
          </div>
          <div className="partner-video-info">
            <strong title={asset.title}>{asset.title || 'Video review đã nộp'}</strong>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#7D715E]">
              {invalid ? (
                <span title={`Ngày nộp đã lưu: ${submitted} · Ngày yêu cầu: ${item.createdAt}`} className="inline-flex items-center gap-1.5 rounded-md bg-[#FBF5EB] px-1.5 py-0.5 font-medium text-[#79592C]">
                  <CalendarX size={13} className="shrink-0" aria-hidden="true"/>Ngày nộp cần đối chiếu
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="shrink-0" aria-hidden="true"/>
                  {date ? <time dateTime={submitted}>Đã nộp: {date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time> : 'Chưa có ngày nộp'}
                </span>
              )}
              {asset.status && (
                <span className={`rounded-md border px-1.5 py-0.5 font-medium ${asset.status === 'REJECTED' ? 'border-red-100 bg-red-50 text-[#DC2626]' : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#79592C]'}`}>
                  {statusLabel}
                </span>
              )}
            </div>
            {asset.rejectionReason && <p className="text-xs text-[#DC2626]">{asset.rejectionReason}</p>}
          </div>
          <a href={asset.urlOrContent} target="_blank" rel="noreferrer" className="partner-video-open">
            Xem video<ExternalLink size={13} aria-hidden="true"/>
          </a>
        </div>;
      })}
    </section>}
  </div>;
}
