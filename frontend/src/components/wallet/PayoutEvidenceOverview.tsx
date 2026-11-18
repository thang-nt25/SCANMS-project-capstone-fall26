import { useEffect, useRef, useState } from 'react';
import { Building2, Copy, FileImage, UserRound, X, ZoomIn, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { payoutDisplayCode } from '../../utils/payout-display-code';

export interface PayoutOverviewData {
  payoutId?: string;
  name: string;
  requestStatus: string;
  contact?: { email: string | null; phone: string | null; avatarUrl: string | null };
  profile?: { kycStatus: string; idNumberMasked: string | null; taxCode: string | null; bankName: string | null; accountNumber: string | null; accountName: string | null; updatedAt: string | null; verifiedAt: string | null };
  payout?: { createdAt: string | null; processedAt: string | null; amount: string; taxAmount: string; netAmount: string; bankName: string | null; accountNumber: string | null; accountName: string | null; bankRefCode: string | null; approvedBy: string | null; hasBill: boolean; isTest: boolean };
  checks: { code: string; passed: boolean; documents: { label: string; url: string | null }[] }[];
}
export const evidenceDate = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa ghi nhận';
const money = (value?: string) => value != null && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')} đ` : 'Chưa ghi nhận';
const safeImage = (value?: string | null) => { try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : null; } catch { return null; } };
const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success('Đã sao chép'); } catch { toast.error('Chưa sao chép được'); } };
export function PayoutPerson({ data }: { data: PayoutOverviewData }) {
  const avatar = safeImage(data.contact?.avatarUrl);
  return <section className="payout-evidence-person">
    <div className="payout-evidence-avatar">{avatar ? <img src={avatar} alt={data.name} onError={event => { event.currentTarget.style.display = 'none'; }} /> : <UserRound size={24}/>}</div>
    <div className="payout-evidence-person-copy"><strong>{data.name}</strong><p>{data.contact?.email || 'Chưa có email'} · {data.contact?.phone || 'Chưa có số điện thoại'}</p><div className="payout-evidence-reference"><span title={data.payoutId}>{data.payoutId ? payoutDisplayCode(data.payoutId, data.payout?.createdAt || '') : 'Chưa ghi nhận mã yêu cầu'}</span>{data.payoutId && <button type="button" onClick={() => void copy(data.payoutId!)} aria-label="Sao chép mã yêu cầu"><Copy size={13}/></button>}<time>Gửi: {evidenceDate(data.payout?.createdAt)}</time></div></div>
    <span className="payout-evidence-status">{data.payout?.isTest ? 'Giao dịch thử nghiệm' : ({PENDING:'Chờ duyệt',PROCESSING:'Đang xử lý',APPROVED:'Đã chi trả',REJECTED:'Đã từ chối'}[data.requestStatus] || data.requestStatus)}</span>
  </section>;
}
export function PayoutEvidenceOverview({ data, panel, id }: { data: PayoutOverviewData; panel: 'profile' | 'bank'; id: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (expanded) previewRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [expanded]);
  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const profile = data.profile;
  const payout = data.payout;
  const documents = data.checks.find(check => check.code === 'VERIFIED_KYC')?.documents || [];
  const openBill = async () => {
    setLoadingBill(true);
    try {
      const response = await api.get(`/admin/payouts/${id}/bill`, { headers: {'x-skip-cache':'true'} });
      const result = response.data?.data ?? response.data;
      const url = safeImage(result.url || result.downloadUrl);
      if (!url) throw new Error();
      setBillUrl(url);
    } catch { toast.error('Chưa tải được chứng từ chi trả'); }
    finally { setLoadingBill(false); }
  };
  return <div className="payout-evidence-overview">
    {panel === 'profile' ? <>
      <section className="payout-evidence-card"><h3>Thông tin định danh</h3><dl className="payout-evidence-facts">
        <div><dt>Tên hồ sơ</dt><dd>{data.name}</dd></div><div><dt>Số CCCD</dt><dd>{profile?.idNumberMasked || 'Chưa bổ sung'}</dd></div>
        <div><dt>Mã số thuế</dt><dd>{profile?.taxCode || 'Chưa bổ sung'}</dd></div><div><dt>Trạng thái KYC</dt><dd>{profile?.kycStatus === 'VERIFIED' ? 'Đã xác minh' : profile?.kycStatus === 'REJECTED' ? 'Cần bổ sung' : 'Chưa xác minh'}</dd></div>
        <div><dt>Xác minh lúc</dt><dd>{evidenceDate(profile?.verifiedAt)}</dd></div><div><dt>Người duyệt KYC</dt><dd>Chưa ghi nhận</dd></div><div><dt>Hồ sơ cập nhật</dt><dd>{evidenceDate(profile?.updatedAt)}</dd></div>
      </dl></section>
      <section className="payout-evidence-card"><h3>Ảnh định danh</h3><div className="payout-evidence-documents">{['CCCD mặt trước','CCCD mặt sau'].map((label,index) => {
        const url = safeImage(documents[index]?.url);
        return <div key={label}><span>{label}</span>{url ? <button type="button" className="payout-document-image" onClick={() => setExpanded(url)} aria-label={`Phóng to ${label}`}><img src={url} alt={label} onError={event => { event.currentTarget.hidden=true; event.currentTarget.parentElement?.classList.add('image-unavailable'); }}/><span><ZoomIn size={14}/>Xem ảnh</span></button> : <div className="payout-document-empty"><FileImage size={25}/><span>Chưa đính kèm</span></div>}</div>;
      })}</div></section>
    </> : <>
      <div className="payout-evidence-bank-grid">{[{title:'Tài khoản trên lệnh rút',bank:payout?.bankName,number:payout?.accountNumber,name:payout?.accountName},{title:'Tài khoản trong hồ sơ',bank:profile?.bankName,number:profile?.accountNumber,name:profile?.accountName}].map(item => <section className="payout-evidence-card" key={item.title}><h3><Building2 size={16}/>{item.title}</h3><strong>{item.bank || 'Chưa bổ sung'}</strong><div className="payout-evidence-account"><span>{item.number || 'Chưa có số tài khoản'}</span>{item.number && <button type="button" aria-label={`Sao chép ${item.title}`} onClick={() => void copy(item.number!)}><Copy size={14}/></button>}</div><p>{item.name || 'Chưa có chủ tài khoản'}</p></section>)}</div>
      <div className="payout-evidence-amounts">{[{label:'Số tiền yêu cầu',value:payout?.amount},{label:'Thuế khấu trừ',value:payout?.taxAmount},{label:data.requestStatus === 'REJECTED' ? 'Thực nhận dự kiến trước từ chối' : 'Thực nhận theo lệnh',value:payout?.netAmount}].map(item => <div key={item.label}><span>{item.label}</span><strong>{money(item.value)}</strong></div>)}</div>
      <section className="payout-evidence-card"><h3>Thông tin xử lý khoản chi</h3><dl className="payout-evidence-facts"><div><dt>Người duyệt chi trả</dt><dd>{payout?.approvedBy || 'Chưa ghi nhận'}</dd></div><div><dt>Thời gian xử lý</dt><dd>{evidenceDate(payout?.processedAt)}</dd></div><div><dt>Mã giao dịch ngân hàng</dt><dd>{payout?.bankRefCode || 'Chưa ghi nhận'}</dd></div><div><dt>Chứng từ chi trả</dt><dd>{payout?.hasBill ? <button type="button" onClick={() => void openBill()} disabled={loadingBill}>{loadingBill ? 'Đang tải…' : 'Xem chứng từ'}</button> : 'Chưa đính kèm'}</dd></div></dl>{billUrl && <a href={billUrl} target="_blank" rel="noopener noreferrer" className="payout-bill-link">Mở chứng từ chi trả<ExternalLink size={14}/></a>}</section>
    </>}
    {expanded && <div ref={previewRef} className="payout-document-preview" role="region" aria-label="Ảnh định danh phóng to"><div><strong>Ảnh định danh</strong><button type="button" onClick={() => setExpanded(null)} aria-label="Đóng ảnh phóng to"><X size={18}/></button></div><img src={expanded} alt="Ảnh định danh phóng to"/></div>}
  </div>;
}
