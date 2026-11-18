import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Users, Star, Search, Plus, ExternalLink, X, Loader2, MoreHorizontal, Pencil, CheckCircle2, Globe, Video, Camera, Music2 } from 'lucide-react';
import { socialService, type SocialChannel } from '../../services/social.service';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../utils/toast';

interface SocialChannelsPageProps { loadedData?: SocialChannel[]; isRefreshing?: boolean; onCreateLink?: () => void }
const platforms: Record<string, string> = { TIKTOK: 'TikTok', YOUTUBE: 'YouTube', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', THREADS: 'Threads', ZALO: 'Zalo', TELEGRAM: 'Telegram', SHOPEE_VIDEO: 'Shopee Video', LEMON8: 'Lemon8', OTHER: 'Khác' };
const platformHosts: Record<string, string[]> = { TIKTOK: ['tiktok.com'], YOUTUBE: ['youtube.com', 'youtu.be'], FACEBOOK: ['facebook.com', 'fb.com'], INSTAGRAM: ['instagram.com'], THREADS: ['threads.net', 'threads.com'], ZALO: ['zalo.me', 'zaloapp.com'], TELEGRAM: ['t.me', 'telegram.me'], SHOPEE_VIDEO: ['shopee.vn'], LEMON8: ['lemon8-app.com'] };
function normalizedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.)/.test(url.hostname)) return '';
    url.hostname = url.hostname.replace(/^(www|m)\./, ''); url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_') || ['fbclid', 'igsh', 'si'].includes(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    if (['tiktok.com', 'instagram.com', 'facebook.com', 'threads.net', 'threads.com'].includes(url.hostname)) url.pathname = url.pathname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch { return ''; }
}
const verificationLabels = { SELF_DECLARED: 'Tự khai báo', PENDING: 'Chờ xác minh', VERIFIED: 'Đã xác minh', NEEDS_INFO: 'Cần bổ sung' };
const statusOf = (channel: SocialChannel) => channel.verificationStatus || (channel.verifiedAt ? 'VERIFIED' : 'SELF_DECLARED');
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
const platformIcon = (name: string) => ({ TIKTOK: Music2, YOUTUBE: Video, FACEBOOK: Users, INSTAGRAM: Camera }[name] || Globe);
type ChannelForm = { platform: string; name: string; url: string; followers: string; primary: boolean };
const blankForm = (): ChannelForm => ({ platform: 'TIKTOK', name: '', url: '', followers: '', primary: false });

const SocialChannelsPage = forwardRef<{ refresh: () => Promise<void> }, SocialChannelsPageProps>(function SocialChannelsPage({ loadedData, isRefreshing = false }, ref) {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SocialChannel | null>(null);
  const [form, setForm] = useState<ChannelForm>(blankForm);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [toDelete, setToDelete] = useState<SocialChannel | null>(null);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const loadChannels = async (forceRefresh = false) => {
    const request = ++sequence.current; setLoading(true); setLoadError('');
    try {
      const list = await socialService.getMyChannels({ forceRefresh });
      if (request !== sequence.current) return;
      if (!Array.isArray(list)) throw new Error('Không thể đọc danh sách kênh.');
      setChannels(list); setHasLoaded(true);
    } catch (error: any) { if (request === sequence.current) setLoadError(error?.message || 'Không thể tải kênh.'); }
    finally { if (request === sequence.current) setLoading(false); }
  };
  useEffect(() => {
    if (loadedData) { setChannels(loadedData); setLoading(false); setHasLoaded(true); return; }
    void loadChannels(); return () => { sequence.current++; };
  }, [loadedData]);
  useImperativeHandle(ref, () => ({ refresh: () => loadChannels(true) }));
  useEffect(() => {
    if (!showModal) return;
    const oldOverflow = document.body.style.overflow; const oldFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden'; dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mutation.current) setShowModal(false);
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary');
      if (!controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = oldOverflow; oldFocus?.focus(); window.removeEventListener('keydown', keyboard); };
  }, [showModal]);
  const openForm = (channel?: SocialChannel) => {
    setEditing(channel || null); setAttempted(false); setServerError(''); setUrlError('');
    setForm(channel ? { platform: channel.platformName, name: channel.channelName || '', url: channel.channelUrl, followers: String(channel.followerCount || 0), primary: channel.isPrimary } : { ...blankForm(), primary: !channels.some(c => c.isPrimary) });
    setShowModal(true);
  };
  const updateForm = (key: keyof ChannelForm, value: string | boolean) => { setForm(old => ({ ...old, [key]: value })); setServerError(''); setUrlError(''); };
  const canonical = normalizedUrl(form.url);
  const hosts = platformHosts[form.platform];
  const domainMismatch = canonical && hosts && !hosts.some(host => new URL(canonical).hostname === host || new URL(canonical).hostname.endsWith(`.${host}`));
  const errors = {
    name: !form.name.trim() ? 'Nhập tên hiển thị kênh.' : form.name.trim().length > 150 ? 'Tên kênh tối đa 150 ký tự.' : '',
    url: !canonical ? 'Nhập liên kết HTTPS hợp lệ.' : domainMismatch ? 'Liên kết không thuộc nền tảng đã chọn.' : channels.some(c => c.id !== editing?.id && normalizedUrl(c.channelUrl) === canonical) ? 'Kênh này đã có trong danh sách.' : urlError,
    followers: !/^\d+$/.test(form.followers) || Number(form.followers) > 2147483647 ? 'Nhập số nguyên từ 0 đến 2.147.483.647.' : '',
  };
  const valid = !Object.values(errors).some(Boolean);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setAttempted(true); if (!valid || mutation.current) return;
    mutation.current = true; setSaving(true); setServerError('');
    const payload = { platformName: form.platform, channelName: form.name.trim(), channelUrl: canonical, followerCount: Number(form.followers), isPrimary: form.primary };
    try {
      if (editing) await socialService.updateChannel(editing.id, payload); else await socialService.addChannel(payload);
      setShowModal(false); toast.success(editing ? 'Đã cập nhật kênh' : 'Đã thêm kênh'); await loadChannels(true);
    } catch (error: any) {
      const raw = error?.response?.data?.message || error?.message || 'Không thể lưu kênh.'; const message = Array.isArray(raw) ? raw.join(' ') : raw;
      if (/kênh này đã|liên kết|HTTPS/i.test(message)) setUrlError(message); else setServerError(message);
    } finally { setSaving(false); mutation.current = false; }
  };
  const setPrimary = async (channel: SocialChannel) => {
    if (mutation.current) return; mutation.current = true; setBusyId(channel.id);
    try { await socialService.setPrimary(channel.id); toast.success('Đã đặt làm kênh chính'); await loadChannels(true); }
    catch (error: any) { toast.error(error?.response?.data?.message || error?.message || 'Không thể đổi kênh chính.'); }
    finally { mutation.current = false; setBusyId(''); }
  };
  const deleteChannel = async () => {
    if (!toDelete || toDelete.isPrimary || mutation.current) return; mutation.current = true; setBusyId(toDelete.id);
    try { await socialService.deleteChannel(toDelete.id); setToDelete(null); toast.success('Đã xóa kênh'); await loadChannels(true); }
    catch (error: any) { toast.error(error?.response?.data?.message || error?.message || 'Không thể xóa kênh.'); }
    finally { mutation.current = false; setBusyId(''); }
  };
  const filtered = channels.filter(c => (platform === 'ALL' || c.platformName === platform) && `${c.channelName || ''} ${c.channelUrl}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const totalFollowers = channels.reduce((sum, c) => sum + Number(c.followerCount || 0), 0);
  const primary = channels.find(c => c.isPrimary);
  if (!hasLoaded && loading) return <div className="social-workspace social-loading" role="status"><Loader2 size={18} className="animate-spin" />Đang tải kênh…</div>;

  return <section className="social-workspace" aria-label="Quản lý kênh mạng xã hội" aria-busy={loading || isRefreshing}>
    {loadError && <div className="social-load-error" role="alert">{loadError}<button onClick={() => void loadChannels(true)}>Thử lại</button></div>}
    {hasLoaded && <>
      <div className="social-summary" aria-label="Tổng quan kênh">
        <div><Share2 size={20} /><span>Kênh đã thêm</span><strong>{channels.length} <small>kênh</small></strong></div>
        <div title="Tổng số khai báo trên các kênh, không phải số khán giả duy nhất"><Users size={20} /><span>Người theo dõi đã khai báo</span><strong>{totalFollowers.toLocaleString('vi-VN')}</strong></div>
        <div><Star size={20} /><span>Kênh chính</span><strong className="social-primary-name" title={primary?.channelName || primary?.channelUrl}>{primary?.channelName || 'Chưa thiết lập'}</strong></div>
      </div>
      <div className="social-controls"><div className="social-search"><Search size={17} /><input aria-label="Tìm kênh" placeholder="Tìm tên kênh hoặc liên kết…" value={search} onChange={e => setSearch(e.target.value)} /></div><Select aria-label="Lọc nền tảng" value={platform} onChange={e => setPlatform(e.target.value)}><option value="ALL">Mọi nền tảng</option>{[...new Set(channels.map(c => c.platformName))].map(p => <option key={p} value={p}>{platforms[p] || p}</option>)}</Select><button className="social-add" onClick={() => openForm()}><Plus size={16} />Thêm kênh</button></div>
      <div className="social-list-title"><h2>Kênh của bạn</h2><span>{filtered.length} kênh{loading ? ' · Đang cập nhật…' : ''}</span></div>
      <div className="social-channel-list">
        {filtered.map(channel => {
          const Icon = platformIcon(channel.platformName); const status = statusOf(channel); const href = normalizedUrl(channel.channelUrl);
          return <article className="social-channel-row" key={channel.id}>
            <div className="social-channel-info"><span className="social-platform-icon"><Icon size={20} /></span><div><div className="social-channel-name"><h3>{channel.channelName || platforms[channel.platformName]}</h3>{channel.isPrimary && <span className="social-primary-tag"><Star size={11} />Kênh chính</span>}</div><p title={channel.channelUrl}>{platforms[channel.platformName] || channel.platformName} · {channel.channelUrl.replace(/^https?:\/\/(www\.)?/, '')}</p></div></div>
            <div className="social-channel-metric"><span>Người theo dõi</span><strong>{Number(channel.followerCount || 0).toLocaleString('vi-VN')}</strong></div>
            <div className="social-channel-verification"><span>Xác minh</span><strong data-state={status}>{status === 'VERIFIED' && <CheckCircle2 size={13} />}{verificationLabels[status]}</strong></div>
            <div className="social-channel-actions"><button disabled={Boolean(busyId)} onClick={() => openForm(channel)}><Pencil size={13} />Chỉnh sửa</button>{href ? <a href={href} target="_blank" rel="noopener noreferrer">Mở kênh<ExternalLink size={13} /></a> : <button disabled title="Liên kết chưa hợp lệ">Mở kênh</button>}<details className="social-channel-menu"><summary aria-label={`Thao tác kênh ${channel.channelName || ''}`}><MoreHorizontal size={18} /></summary><div>{!channel.isPrimary && <button disabled={Boolean(busyId)} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); void setPrimary(channel); }}><Star size={14} />Đặt làm kênh chính</button>}<button className="danger" disabled={channel.isPrimary || Boolean(busyId)} title={channel.isPrimary ? 'Đặt kênh khác làm kênh chính trước khi xóa.' : undefined} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setToDelete(channel); }}>Xóa kênh</button>{channel.isPrimary && <small>Đổi kênh chính trước khi xóa.</small>}</div></details></div>
          </article>;
        })}
        {!filtered.length && <div className="social-empty"><Share2 size={28} /><h3>{channels.length ? 'Không tìm thấy kênh' : 'Chưa có kênh mạng xã hội'}</h3><button onClick={() => channels.length ? (setSearch(''), setPlatform('ALL')) : openForm()}>{channels.length ? 'Xóa bộ lọc' : 'Thêm kênh'}</button></div>}
      </div>
    </>}
    {showModal && createPortal(<div className="social-modal-backdrop"><div ref={dialogRef} className="social-channel-dialog" role="dialog" aria-modal="true" aria-labelledby="social-dialog-title"><header><div><h2 id="social-dialog-title">{editing ? 'Chỉnh sửa kênh' : 'Thêm kênh'}</h2>{editing && <p>{editing.updatedAt ? 'Cập nhật' : 'Đã thêm'}: {formatDate(editing.updatedAt || editing.createdAt)}</p>}</div><button disabled={saving} onClick={() => setShowModal(false)} aria-label="Đóng"><X size={20} /></button></header><form onSubmit={submit} noValidate>
      <fieldset disabled={saving}><label>Nền tảng<Select aria-label="Nền tảng kênh" value={form.platform} disabled={saving} onChange={e => updateForm('platform', e.target.value)}>{Object.entries(platforms).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select></label>
      <label>Tên hiển thị<input id="social-channel-name" value={form.name} maxLength={150} onChange={e => updateForm('name', e.target.value)} aria-invalid={attempted && Boolean(errors.name)} />{attempted && errors.name && <small className="social-field-error">{errors.name}</small>}</label>
      <label>Liên kết kênh<input id="social-channel-url" type="url" value={form.url} placeholder="https://…" onChange={e => updateForm('url', e.target.value)} aria-invalid={(attempted || Boolean(form.url)) && Boolean(errors.url)} />{(attempted || form.url) && errors.url && <small className="social-field-error">{errors.url}</small>}</label>
      <label>Người theo dõi đã khai báo<input id="social-channel-followers" inputMode="numeric" value={form.followers} onChange={e => updateForm('followers', e.target.value)} aria-invalid={attempted && Boolean(errors.followers)} />{attempted && errors.followers && <small className="social-field-error">{errors.followers}</small>}</label>
      <label className="social-primary-choice"><input type="checkbox" checked={form.primary} disabled={Boolean(editing?.isPrimary) || !channels.some(c => c.isPrimary)} onChange={e => updateForm('primary', e.target.checked)} /><Star size={15} />Đặt làm kênh chính</label>
      {editing && <div className="social-verification-detail"><span>Xác minh kênh</span><strong>{verificationLabels[statusOf(editing)]}</strong>{editing.verificationReason && <p>{editing.verificationReason}</p>}</div>}
      {serverError && <p role="alert" className="social-field-error">{serverError}</p>}</fieldset>
      <footer><button disabled={saving} type="button" onClick={() => setShowModal(false)}>Hủy</button><button className="social-add" disabled={saving} type="submit">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm kênh'}</button></footer></form></div></div>, document.body)}
    <ConfirmModal isOpen={Boolean(toDelete)} onClose={() => !busyId && setToDelete(null)} onConfirm={deleteChannel} isLoading={Boolean(busyId)} title="Xóa kênh" message={`Xóa kênh “${toDelete?.channelName || ''}” khỏi hồ sơ của bạn?`} confirmText="Xóa kênh" variant="danger" />
  </section>;
});
export default SocialChannelsPage;
