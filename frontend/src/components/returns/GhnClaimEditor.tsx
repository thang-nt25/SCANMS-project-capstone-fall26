import { useRef, useState, type FormEvent } from 'react';
import { Check, Copy, FileText, Info, Link as LinkIcon, Plus, X } from 'lucide-react';
import { returnService, type ReturnDetail } from '../../services/return.service';
import { useReturnAction } from '../../hooks/useReturnDetail';
import { uploadService } from '../../services/upload.service';

type Action = 'SUBMIT' | 'REQUEST_MORE' | 'ACCEPT' | 'REJECT' | 'APPEAL' | 'PAID';
const actions: Record<Action,string> = { SUBMIT:'Ghi nhận đã gửi GHN',REQUEST_MORE:'GHN yêu cầu bổ sung',ACCEPT:'GHN chấp thuận',REJECT:'GHN từ chối',APPEAL:'Kháng nghị với GHN',PAID:'Ghi nhận đã thanh toán' };
const states: Record<string,string> = { DRAFT:'Chờ gửi GHN',SUBMITTED:'Chờ GHN phản hồi',NEEDS_MORE_EVIDENCE:'Cần bổ sung chứng từ',ACCEPTED:'GHN đã chấp thuận',REJECTED:'GHN từ chối',PAID:'Đã ghi nhận thanh toán' };
const money = (value?: number) => value == null ? 'Chưa ghi nhận' : `${value.toLocaleString('vi-VN')} ₫`;
function EvidenceLink({ url, index }: {url:string;index:number}) {
  const [failed,setFailed] = useState(false);
  const video = /\.(mp4|mov|webm)(\?|$)|\/video\//i.test(url);
  const image = /\.(png|jpe?g|webp)(\?|$)|\/image\//i.test(url);
  return <a className="ghn-editor-evidence" href={url} target="_blank" rel="noopener noreferrer" title={`Mở bằng chứng ${index+1}`}><span>{failed ? <FileText size={22}/> : video ? <video src={url} muted playsInline preload="metadata" onError={()=>setFailed(true)}/> : image ? <img src={url} alt={`Bằng chứng ${index+1}`} loading="lazy" onError={()=>setFailed(true)}/> : <FileText size={22}/>}</span><small>{video ? 'Video' : image ? `Ảnh ${index+1}` : `Tệp ${index+1}`}</small></a>;
}
export function GhnClaimEditor({ request }: {request:ReturnDetail}) {
  const [snapshot,setSnapshot] = useState<ReturnDetail | null>(null);
  const current = snapshot && snapshot.id === request.id && Date.parse(snapshot.ghnClaim?.updatedAt || '') > Date.parse(request.ghnClaim?.updatedAt || '') ? snapshot : request;
  const claim = current.ghnClaim;
  const [action,setAction] = useState<Action>('SUBMIT');
  const [reference,setReference] = useState(claim?.ghnReference || '');
  const [claimed,setClaimed] = useState(claim?.claimedAmount?.toString() || '');
  const [approved,setApproved] = useState(claim?.approvedAmount?.toString() || '');
  const [notes,setNotes] = useState('');
  const [file,setFile] = useState<File | null>(null);
  const [url,setUrl] = useState('');
  const [mode,setMode] = useState<'file'|'url'>('file');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [copied,setCopied] = useState(false);
  const [saved,setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const update = useReturnAction(request.id,returnService.updateGhnClaim,{backgroundRefresh:true});
  if (!claim) return null;
  const options:Action[] = ['DRAFT','NEEDS_MORE_EVIDENCE'].includes(claim.status) ? ['SUBMIT'] : claim.status === 'SUBMITTED' ? ['REQUEST_MORE','ACCEPT','REJECT'] : claim.status === 'ACCEPTED' ? ['PAID'] : claim.status === 'REJECTED' ? ['APPEAL'] : [];
  const selected = options.includes(action) ? action : options[0];
  const proofRequired = selected !== 'SUBMIT' || claim.status === 'NEEDS_MORE_EVIDENCE' || claim.evidenceUrls.length === 0;
  const proofValid = mode === 'file' ? Boolean(file) : /^https:\/\/[^\s]+$/i.test(url.trim());
  const positive = (value:string,max=1000000000) => Number.isInteger(Number(value)) && Number(value)>0 && Number(value)<=max;
  const valid = notes.trim().length>=10 && notes.trim().length<=2000 && (!proofRequired || proofValid) && (mode!=='url' || !url.trim() || proofValid) && (selected!=='SUBMIT' || (reference.trim().length>=3 && positive(claimed))) && (selected!=='APPEAL' || reference.trim().length>=3) && (!['ACCEPT','PAID'].includes(selected) || positive(approved,claim.claimedAmount || 1000000000));
  async function submit(event:FormEvent) {
    event.preventDefault(); if(lock.current || busy || !valid || !selected)return;
    lock.current=true;setBusy(true);setError('');setSaved(false);
    try {
      const proof = mode==='file' && file ? (await uploadService.uploadMedia(file,`scanms/returns/${request.id}/ghn-claim`)).url : mode==='url' ? url.trim() || undefined : undefined;
      const result=await update.mutateAsync({action:selected,ghnReference:reference.trim()||undefined,claimedAmount:claimed?Number(claimed):undefined,approvedAmount:approved?Number(approved):undefined,notes:notes.trim(),proofUrl:proof}) as ReturnDetail;
      if(result?.id===request.id && result.ghnClaim)setSnapshot(result);
      setNotes('');setFile(null);setUrl('');setSaved(true);
    }catch(cause){setError(cause instanceof Error?cause.message:'Chưa lưu được cập nhật. Vui lòng thử lại.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className="ghn-editor" aria-label="Đối soát bồi hoàn GHN"><header><h3><FileText size={18}/>Đối soát bồi hoàn GHN</h3><span>{states[claim.status]}</span></header><div className="ghn-editor-grid">
    <section className="ghn-editor-summary"><h4>Thông tin hồ sơ</h4><dl><div><dt>Vận đơn gốc</dt><dd className="ghn-editor-code"><strong>{claim.originalTrackingNumber}</strong><button type="button" aria-label="Sao chép vận đơn" onClick={()=>void navigator.clipboard.writeText(claim.originalTrackingNumber).then(()=>setCopied(true)).catch(()=>setError('Chưa sao chép được mã vận đơn.'))}>{copied?<Check size={14}/>:<Copy size={14}/>}</button></dd></div><div><dt>Mã yêu cầu GHN</dt><dd>{claim.ghnReference||'Chưa có'}</dd></div><div><dt>Đề nghị bồi hoàn</dt><dd>{money(claim.claimedAmount)}</dd></div><div><dt>GHN chấp thuận</dt><dd>{claim.approvedAmount==null?'Chưa có kết quả':money(claim.approvedAmount)}</dd></div></dl>
      <h5>Bằng chứng hồ sơ · {claim.evidenceUrls.length} tệp</h5><div className="ghn-editor-evidence-list">{claim.evidenceUrls.map((value,index)=><EvidenceLink key={value} url={value} index={index}/>)}</div>{!claim.evidenceUrls.length&&<p>Chưa có bằng chứng</p>}
      {claim.proofUrl&&!claim.evidenceUrls.includes(claim.proofUrl)&&<a href={claim.proofUrl} target="_blank" rel="noopener noreferrer" className="ghn-editor-proof-link">Xem chứng từ GHN</a>}
      {claim.notes&&<div className="ghn-editor-saved-notes"><h5>Ghi chú gần nhất</h5><p>{claim.notes}</p></div>}<p className="ghn-editor-updated">Cập nhật: <time dateTime={claim.updatedAt}>{new Date(claim.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'})}</time></p>
    </section>
    {options.length>0?<form id={`ghn-editor-${request.id}`} className="ghn-editor-form" onSubmit={event=>void submit(event)}><h4>Cập nhật đối soát</h4><fieldset disabled={busy||update.isPending}>
      <label>Bước xử lý *<select value={selected} onChange={event=>{setAction(event.target.value as Action);setError('');setSaved(false);}}>{options.map(value=><option key={value} value={value}>{actions[value]}</option>)}</select></label>
      {selected==='SUBMIT'&&<div className="ghn-editor-pair"><label>Mã yêu cầu GHN *<input required minLength={3} maxLength={100} value={reference} onChange={event=>setReference(event.target.value)}/></label><label>Đề nghị (₫) *<input required type="number" min={1} max={1000000000} step={1} value={claimed} onChange={event=>setClaimed(event.target.value)}/></label></div>}
      {selected==='APPEAL'&&<label>Mã yêu cầu GHN mới *<input required minLength={3} maxLength={100} value={reference} onChange={event=>setReference(event.target.value)}/></label>}
      {['ACCEPT','PAID'].includes(selected)&&<label>Số tiền GHN chấp thuận (₫) *<input required type="number" min={1} max={claim.claimedAmount||1000000000} step={1} value={approved} onChange={event=>setApproved(event.target.value)}/></label>}
      <label><span className="ghn-editor-label">Ghi chú *<small>10–2.000 ký tự</small></span><textarea required minLength={10} maxLength={2000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Nội dung liên hệ hoặc phản hồi…"/><small className="ghn-editor-counter">{notes.length}/2.000</small></label>
      <div><div className="ghn-editor-label">Chứng từ {proofRequired?'*':'· Không bắt buộc'}</div><div className="ghn-editor-upload-actions"><button type="button" aria-pressed={mode==='file'} onClick={()=>{setMode('file');input.current?.click();}}><Plus size={15}/>Thêm tệp</button><button type="button" aria-pressed={mode==='url'} onClick={()=>setMode('url')}><LinkIcon size={14}/>Dán liên kết</button></div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="ghn-editor-hidden" onChange={event=>{const chosen=event.target.files?.[0];if(chosen){setFile(chosen);setMode('file');}event.target.value='';}}/>
        {mode==='file'&&file&&<div className="ghn-editor-selected-file"><FileText size={16}/><span>{file.name}<small>{(file.size/1024/1024).toFixed(2)} MB</small></span><button type="button" aria-label="Xóa chứng từ" onClick={()=>setFile(null)}><X size={14}/></button></div>}
        {mode==='url'&&<input type="url" pattern="https://.*" value={url} onChange={event=>setUrl(event.target.value)} placeholder="Liên kết HTTPS của chứng từ" aria-label="Liên kết chứng từ"/>}
      </div></fieldset></form>:<section className="ghn-editor-finished"><Check size={20}/><strong>Đã ghi nhận GHN thanh toán</strong><p>Hồ sơ bồi hoàn đã hoàn tất.</p></section>}
    </div><footer><p><Info size={15}/>Ghi nhận theo phản hồi và chứng từ GHN.</p>{options.length>0&&<button type="submit" form={`ghn-editor-${request.id}`} disabled={busy||update.isPending||!valid}>{busy||update.isPending?'Đang lưu…':'Lưu cập nhật'}</button>}</footer>{error&&<p className="ghn-editor-error" role="alert">{error}</p>}{saved&&<p role="status" className="ghn-editor-success">Đã lưu cập nhật.</p>}</section>;
}
