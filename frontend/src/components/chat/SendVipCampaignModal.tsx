import { useEffect, useRef, useState } from 'react';
import { Crown, X, Search, Send, Loader2, Users, Plus, Check } from 'lucide-react';
import api from '../../services/api';
import { Select } from '../ui/Select';
import { DateTimePicker } from '../common/DateTimePicker';
import type { Campaign } from '@/types/campaigns.types';
import type { ChatMessage } from '@/types/chat.types';
import './SendVipCampaignModal.css';

interface Props {
  conversationId?: string;
  collaboratorName?: string;
  onClose: () => void;
  onSuccess: (message: ChatMessage) => void;
}
interface Recipient {
  id: string; fullName: string; email: string; avatarUrl?: string;
  collaboratorProfile?: { avatarUrl?: string };
}

const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function SendVipCampaignModal({ conversationId, collaboratorName, onClose, onSuccess }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCampaignId, setCreatedCampaignId] = useState('');
  const [draft, setDraft] = useState(() => ({ name: '', rate: '5', start: localDateTime(new Date()), end: localDateTime(new Date(Date.now() + 7 * 86400000)) }));
  const sending = useRef(false);
  const creatingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const busy = submitting || saving;
  const recipientSearchRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError('');
    const load = async () => {
      try {
        const [campaignRes, recipientRes]: any[] = await Promise.all([
          api.get('/campaigns/shop', { headers: { 'x-skip-cache': '1' } }),
          conversationId ? Promise.resolve([]) : api.get('/chat/search-collaborators'),
        ]);
        if (cancelled) return;
        const list = campaignRes?.data || campaignRes;
        const people = recipientRes?.data || recipientRes;
        if (!Array.isArray(list) || !Array.isArray(people)) throw new Error('Dữ liệu lời mời chưa hợp lệ. Vui lòng tải lại.');
        const active = list.filter((campaign: Campaign) => campaign.isActive && new Date(campaign.endDate).getTime() >= Date.now());
        setCampaigns(active); setRecipients(people); setUnavailableCount(list.length - active.length);
        setCampaignId(previous => active.some((campaign: Campaign) => campaign.id === previous) ? previous : active[0]?.id || '');
      } catch (error: any) {
        if (!cancelled) setLoadError(error.message || 'Không tải được dữ liệu lời mời.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [conversationId, reload]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  useEffect(() => {
    if (!createdCampaignId || creating || saving) return;
    if (conversationId) sendButtonRef.current?.focus();
    else recipientSearchRef.current?.focus();
  }, [createdCampaignId, creating, saving, conversationId]);

  const selectedRecipient = recipients.find(person => person.id === recipientId);
  const selectedCampaign = campaigns.find(campaign => campaign.id === campaignId);
  const visibleRecipients = recipients.filter(person => `${person.fullName} ${person.email}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')));
  const recipientName = conversationId ? collaboratorName || 'KOL/CTV' : selectedRecipient?.fullName;
  const canSend = !loading && !loadError && !busy && !creating && Boolean(selectedCampaign && (conversationId || selectedRecipient));

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creatingRef.current || busy) return;
    setCreateError('');
    const start = new Date(draft.start), end = new Date(draft.end), rate = Number(draft.rate);
    if (!draft.name.trim()) { setCreateError('Vui lòng nhập tên chiến dịch.'); return; }
    if (!draft.rate.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) { setCreateError('Hoa hồng thưởng thêm phải từ 0 đến 100%.'); return; }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= new Date()) { setCreateError('Ngày kết thúc phải sau ngày bắt đầu và thời điểm hiện tại.'); return; }
    creatingRef.current = true; setSaving(true);
    try {
      const response: any = await api.post('/campaigns', { name: draft.name.trim(), bonusCommissionRate: rate, startDate: start.toISOString(), endDate: end.toISOString() });
      const campaign: Campaign = response?.data || response;
      if (!campaign?.id || !campaign.isActive || !(new Date(campaign.endDate).getTime() >= Date.now())) throw new Error('Máy chủ chưa xác nhận chiến dịch còn hiệu lực. Hãy tải lại trước khi thử tạo thêm.');
      setCampaigns(previous => [campaign, ...previous.filter(item => item.id !== campaign.id)]);
      setCampaignId(campaign.id); setCreatedCampaignId(campaign.id); setCreating(false); setSendError('');
    } catch (error: any) { setCreateError(error.message || 'Không tạo được chiến dịch. Vui lòng thử lại.'); }
    finally { creatingRef.current = false; setSaving(false); }
  };

  const submit = async () => {
    if (!canSend || sending.current) return;
    sending.current = true; setSubmitting(true); setSendError('');
    try {
      const personalMessage = note.trim() || undefined;
      const response: any = conversationId
        ? await api.post(`/campaigns/chat/${conversationId}/invite`, { campaignId, personalMessage })
        : await api.post(`/campaigns/${campaignId}/invite`, { collaboratorId: recipientId, personalMessage });
      const result = response?.data || response;
      if (!result?.chatMessage?.id || !result.chatMessage.conversationId) throw new Error('Máy chủ chưa xác nhận lời mời. Vui lòng thử lại.');
      onSuccess(result.chatMessage); onClose();
    } catch (error: any) { setSendError(error.message || 'Không gửi được lời mời. Vui lòng thử lại.'); }
    finally { sending.current = false; setSubmitting(false); }
  };

  return (
    <div className="vip-campaign-overlay" onClick={() => { if (!busy) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="vip-campaign-title" className="vip-campaign-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length);
          const first = elements[0], last = elements[elements.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus(); }
        }
      }}>
        <header className="vip-campaign-header">
          <span className="vip-campaign-icon"><Crown size={22} /></span>
          <div><h3 id="vip-campaign-title">Mời chiến dịch VIP</h3><p>{creating ? 'Thiết lập chiến dịch để tiếp tục gửi lời mời.' : conversationId ? 'Chọn chiến dịch để mời KOL đang trò chuyện.' : 'Chọn KOL và chiến dịch để gửi lời mời.'}</p></div>
          <button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={18} /></button>
        </header>
        <div className="vip-campaign-body" aria-busy={loading}>
          {loading ? <div className="vip-campaign-state"><Loader2 className="animate-spin" size={22} />Đang tải KOL và chiến dịch…</div> : loadError ? <div className="vip-campaign-state"><p role="alert">{loadError}</p><button type="button" onClick={() => setReload(value => value + 1)}>Tải lại</button></div> : creating ? <form id="vip-create-campaign" className="vip-campaign-create" onSubmit={event => void createCampaign(event)}>
            <div className="vip-campaign-steps" aria-label="Các bước gửi lời mời"><span aria-current="step"><b>1</b>Thiết lập chiến dịch</span><span><b>2</b>Gửi lời mời</span></div>
            <p className="vip-campaign-create-intro">Lời mời VIP cần có chiến dịch để KOL xem thời gian hợp tác và hoa hồng. Lưu xong, bạn sẽ chuyển ngay sang bước gửi lời mời.</p>
            <label htmlFor="vip-create-name">Tên chiến dịch</label><input id="vip-create-name" autoFocus required maxLength={200} placeholder="VD: Hợp tác KOL tháng 10" value={draft.name} disabled={saving} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} />
            <label htmlFor="vip-create-rate">Hoa hồng thưởng thêm (%)</label><input id="vip-create-rate" type="number" min={0} max={100} step="0.01" required value={draft.rate} disabled={saving} onChange={event => setDraft(previous => ({ ...previous, rate: event.target.value }))} />
            <small>Được cộng thêm vào hoa hồng thông thường của sản phẩm.</small>
            <div className="vip-campaign-date-grid"><div><label htmlFor="vip-create-start">Bắt đầu</label><DateTimePicker id="vip-create-start" compact required popoverTitle="Chọn ngày bắt đầu" inlinePopoverRef={datePopoverRef} value={draft.start} disabled={saving} onChange={value => setDraft(previous => ({ ...previous, start: value }))} /></div><div><label htmlFor="vip-create-end">Kết thúc</label><DateTimePicker id="vip-create-end" compact required popoverTitle="Chọn ngày kết thúc" inlinePopoverRef={datePopoverRef} minDateTime={draft.start} value={draft.end} disabled={saving} onChange={value => setDraft(previous => ({ ...previous, end: value }))} /></div></div>
            <div ref={datePopoverRef} className="vip-campaign-date-panel" />
            {createError && <p role="alert" className="vip-campaign-error">{createError}</p>}
          </form> : campaigns.length === 0 ? <div className="vip-campaign-state"><Crown size={26} /><strong>{unavailableCount ? 'Chưa có chiến dịch còn hiệu lực' : 'Thiết lập chiến dịch để mời KOL'}</strong><p>{unavailableCount ? 'Các chiến dịch hiện có đã kết thúc hoặc bị tắt. Thiết lập chiến dịch mới, sau đó gửi lời mời.' : 'Gian hàng chưa có chiến dịch VIP. Thiết lập thời gian và hoa hồng một lần, sau đó dùng chiến dịch này để mời các KOL.'}</p><button type="button" onClick={() => { setCreating(true); setCreateError(''); }}><Plus size={15} />Thiết lập & tiếp tục mời</button></div> : <>
            {createdCampaignId === campaignId && <div className="vip-campaign-created" role="status"><Check size={17} /><div><strong>Chiến dịch đã sẵn sàng</strong><p>{conversationId ? `Bấm “Gửi lời mời VIP” để mời ${recipientName}.` : 'Chọn KOL bên dưới, rồi bấm “Gửi lời mời VIP”.'}</p></div></div>}
            <section className="vip-campaign-section">
              <label>Người nhận lời mời</label>
              {conversationId ? <div className="vip-campaign-fixed-recipient"><Users size={16} /><strong>{recipientName}</strong><span>KOL / CTV</span></div> : <>
                <div className="vip-campaign-search"><Search size={15} /><input ref={recipientSearchRef} aria-label="Tìm KOL nhận lời mời" placeholder="Tìm tên hoặc email KOL…" value={query} disabled={submitting} onChange={event => setQuery(event.target.value)} /></div>
                <div className="vip-campaign-recipients" role="group" aria-label="KOL nhận lời mời">
                  {visibleRecipients.length ? visibleRecipients.map(person => <button type="button" key={person.id} aria-pressed={recipientId === person.id} disabled={submitting} onClick={() => { setRecipientId(person.id); setSendError(''); }}>
                    <span className="vip-campaign-avatar">{(person.collaboratorProfile?.avatarUrl || person.avatarUrl) ? <img src={person.collaboratorProfile?.avatarUrl || person.avatarUrl} alt="" /> : person.fullName.charAt(0)}</span>
                    <span><strong>{person.fullName}</strong><small>{person.email}</small></span><span className="vip-campaign-radio" aria-hidden="true" />
                  </button>) : <p>Không tìm thấy KOL phù hợp.</p>}
                </div>
              </>}
            </section>
            <section className="vip-campaign-section">
              <div className="vip-campaign-section-heading"><label>Chiến dịch</label><button type="button" disabled={busy} onClick={() => { setCreating(true); setCreateError(''); }}><Plus size={13} />Tạo mới</button></div>
              <Select aria-label="Chiến dịch VIP" value={campaignId} disabled={submitting} onChange={event => { setCampaignId(event.target.value); setSendError(''); }} options={campaigns.map(campaign => ({ value: campaign.id, label: campaign.name }))} />
              {selectedCampaign && <div className="vip-campaign-benefits"><span>Thưởng thêm <strong>+{selectedCampaign.bonusCommissionRate}%</strong> hoa hồng</span><span>Đến {new Date(selectedCampaign.endDate).toLocaleDateString('vi-VN')}</span></div>}
            </section>
            <section className="vip-campaign-section"><label htmlFor="vip-campaign-note">Lời nhắn <span>· Không bắt buộc</span></label><textarea id="vip-campaign-note" rows={2} maxLength={1000} disabled={submitting} placeholder="Gửi lời chào hoặc đề xuất hợp tác…" value={note} onChange={event => setNote(event.target.value)} /></section>
            {recipientName && <p className="vip-campaign-summary">Lời mời sẽ gửi tới <strong>{recipientName}</strong> trong hội thoại KOL.</p>}
            {!recipientName && <p className="vip-campaign-summary">Chọn một KOL để bật nút gửi lời mời.</p>}
            {sendError && <p role="alert" className="vip-campaign-error">{sendError}</p>}
          </>}
        </div>
        <footer className="vip-campaign-footer"><button type="button" disabled={busy} onClick={() => creating ? setCreating(false) : onClose()}>{creating ? 'Quay lại' : 'Đóng'}</button>{creating ? <button type="submit" form="vip-create-campaign" className="vip-campaign-submit" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{saving ? 'Đang lưu…' : 'Tạo & tiếp tục mời'}</button> : campaigns.length > 0 && <button ref={sendButtonRef} type="button" className="vip-campaign-submit" disabled={!canSend} onClick={() => void submit()}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{submitting ? 'Đang gửi…' : 'Gửi lời mời VIP'}</button>}</footer>
      </div>
    </div>
  );
}
