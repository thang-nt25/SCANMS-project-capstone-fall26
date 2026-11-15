import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, Save, User, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { authService } from '../../services/auth.service';
import { customerService } from '../../services/customer.service';
import { uploadService } from '../../services/upload.service';
import { Select } from '../../components/ui/Select';
import { handleAvatarImageError } from '@/utils/image-fallback.utils';
import { toast } from '../../utils/toast';
import './creator-account-details.css';

type Details = { name: string; phone: string; gender: string; day: string; month: string; year: string };
const daysInMonth = (year: string, month: string) => new Date(Number(year), Number(month), 0).getDate();
const maskPhone = (phone: string) => phone ? `••••••••${phone.slice(-2)}` : 'Chưa cập nhật';
const maskEmail = (email?: string) => {
  if (!email) return 'Chưa cập nhật';
  const [name, domain] = email.split('@');
  return domain ? `${name.slice(0, 2)}••••••@${domain}` : 'Đã bảo mật';
};

export default function CreatorAccountDetails() {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const metaKey = `scanms_kol_meta_${user?.id || 'kol'}`;
  const readDetails = (): Details => {
    let meta: Record<string, string> = {};
    try { meta = JSON.parse(localStorage.getItem(metaKey) || '{}'); } catch { /* Older metadata may be invalid. */ }
    return { name: user?.fullName || '', phone: user?.phoneNumber || '', gender: meta.gender || 'MALE', day: meta.birthDay || '02', month: meta.birthMonth || '01', year: meta.birthYear || '2000' };
  };
  const [details, setDetails] = useState<Details>(readDetails);
  const [saved, setSaved] = useState<Details>(readDetails);
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [cropSource, setCropSource] = useState('');
  const [zoom, setZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);
  const cropRef = useRef<HTMLCanvasElement>(null);
  const inFlight = useRef(false);
  const dirtyRef = useRef(false);
  const dirty = JSON.stringify(details) !== JSON.stringify(saved) || Boolean(avatar);
  dirtyRef.current = dirty;
  const nameError = !details.name.trim() ? 'Vui lòng nhập họ và tên.' : details.name.trim().length > 150 ? 'Họ và tên tối đa 150 ký tự.' : '';
  const phoneError = details.phone && !/^(0\d{9}|\+84\d{9})$/.test(details.phone.trim()) ? 'Nhập số điện thoại Việt Nam hợp lệ.' : '';
  const birthday = new Date(Number(details.year), Number(details.month) - 1, Number(details.day));
  const dateError = Number(details.day) > daysInMonth(details.year, details.month) || birthday > new Date() ? 'Vui lòng chọn ngày sinh hợp lệ.' : '';
  const valid = !nameError && !phoneError && !dateError;
  const update = (key: keyof Details, value: string) => { setDetails(old => ({ ...old, [key]: value })); setFormError(''); };
  const changeCalendar = (key: 'year' | 'month', value: string) => setDetails(old => {
    const next = { ...old, [key]: value };
    next.day = String(Math.min(Number(next.day), daysInMonth(next.year, next.month))).padStart(2, '0');
    return next;
  });

  useEffect(() => {
    let active = true;
    customerService.getProfile().then(profile => {
      if (!active || !profile?.user || dirtyRef.current) return;
      const incoming = profile.user;
      setUser(old => old ? { ...old, fullName: incoming.fullName, phoneNumber: incoming.phoneNumber || undefined, avatarUrl: incoming.avatarUrl } : old);
      const apply = (old: Details) => ({ ...old, name: incoming.fullName || '', phone: incoming.phoneNumber || '' });
      setDetails(apply); setSaved(apply);
    }).catch(() => { /* Keep the existing session if refresh fails. */ });
    const sync = () => setUser(authService.getCurrentUser());
    window.addEventListener('auth-user-updated', sync);
    return () => { active = false; window.removeEventListener('auth-user-updated', sync); };
  }, []);
  useEffect(() => {
    if (!avatar) { setPreview(''); return; }
    const url = URL.createObjectURL(avatar); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);
  useEffect(() => {
    if (!cropSource) return;
    const image = new Image(); let active = true;
    image.onload = () => {
      if (!active || !cropRef.current) return;
      const ctx = cropRef.current.getContext('2d'); if (!ctx) return;
      const side = Math.min(image.width, image.height) / zoom;
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(image, (image.width - side) * cropX / 100, (image.height - side) * cropY / 100, side, side, 0, 0, 512, 512);
    };
    image.src = cropSource;
    return () => { active = false; };
  }, [cropSource, zoom, cropX, cropY]);
  useEffect(() => {
    if (!cropSource) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCropSource('');
      if (event.key !== 'Tab') return;
      const controls = document.querySelectorAll<HTMLElement>('.creator-crop-dialog button, .creator-crop-dialog input');
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [cropSource]);

  const chooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return void toast.error('Chọn ảnh JPG, PNG hoặc WEBP.');
    if (file.size > 1024 * 1024) return void toast.error('Ảnh tối đa 1 MB.');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => { setZoom(1); setCropX(50); setCropY(50); setCropSource(String(reader.result)); };
      image.onerror = () => toast.error('Không đọc được ảnh. Vui lòng chọn ảnh khác.');
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error('Không đọc được ảnh.'); reader.readAsDataURL(file);
  };
  const useCrop = () => cropRef.current?.toBlob(blob => {
    if (!blob) return void toast.error('Không thể xử lý ảnh.');
    setAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })); setCropSource('');
  }, 'image/jpeg', 0.9);
  const reset = () => { setDetails(saved); setAvatar(null); setEditingPhone(false); setAttempted(false); setFormError(''); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setAttempted(true);
    if (!valid || !dirty || inFlight.current) return;
    inFlight.current = true; setSaving(true); setFormError('');
    try {
      const avatarUrl = avatar ? await uploadService.uploadImage(avatar, 'scanms/avatars') : undefined;
      await customerService.updateProfile({ fullName: details.name.trim(), phoneNumber: details.phone.trim(), ...(avatarUrl ? { avatarUrl } : {}) });
      const normalized = { ...details, name: details.name.trim(), phone: details.phone.trim() };
      localStorage.setItem(metaKey, JSON.stringify({ gender: details.gender, birthDay: details.day, birthMonth: details.month, birthYear: details.year }));
      setSaved(normalized); setDetails(normalized); setAvatar(null); setEditingPhone(false);
      const latest = { ...user!, fullName: normalized.name, phoneNumber: normalized.phone, ...(avatarUrl ? { avatarUrl } : {}) };
      setUser(latest); localStorage.setItem('user', JSON.stringify(latest));
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('Đã cập nhật hồ sơ');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join(' ') : message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally { setSaving(false); inFlight.current = false; }
  };

  return (
    <section className="creator-account" aria-labelledby="creator-account-title">
      <header className="creator-account-heading"><User size={20} /><h1 id="creator-account-title">Thông tin cá nhân</h1></header>
      <div className="creator-account-layout">
        <form id="creator-account-form" onSubmit={save} noValidate>
          <fieldset disabled={saving} className="creator-account-fields">
            <label>Tên đăng nhập<input value={user?.email?.split('@')[0] || ''} readOnly className="readonly" /></label>
            <label>Họ và tên<input id="creator-account-name" value={details.name} onChange={e => update('name', e.target.value)} autoComplete="name" maxLength={150} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'creator-name-error' : undefined} />{nameError && (attempted || dirty) && <small id="creator-name-error" className="field-error">{nameError}</small>}</label>
            <label>Email<input value={maskEmail(user?.email)} readOnly className="readonly" /></label>
            <div className="creator-account-field"><label htmlFor="creator-account-phone">Số điện thoại</label><div className="creator-phone-row"><input id="creator-account-phone" type={editingPhone ? 'tel' : 'text'} value={editingPhone ? details.phone : maskPhone(details.phone)} readOnly={!editingPhone} className={!editingPhone ? 'readonly' : ''} onChange={e => update('phone', e.target.value)} autoComplete="tel" aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? 'creator-phone-error' : undefined} /><button type="button" onClick={() => setEditingPhone(!editingPhone)}>{editingPhone ? 'Xong' : 'Thay đổi'}</button></div>{phoneError && <small id="creator-phone-error" className="field-error">{phoneError}</small>}</div>
            <fieldset className="creator-account-field"><legend>Giới tính</legend><div className="creator-gender">{[['MALE', 'Nam'], ['FEMALE', 'Nữ'], ['OTHER', 'Khác']].map(([value, label]) => <label key={value} className={details.gender === value ? 'selected' : ''}><input type="radio" name="gender" checked={details.gender === value} onChange={() => update('gender', value)} /><span className="gender-tick">{details.gender === value && <Check size={14} />}</span>{label}</label>)}</div></fieldset>
            <fieldset className="creator-account-field"><legend>Ngày sinh</legend><div className="creator-birthday">
              <Select aria-label="Ngày sinh" value={details.day} disabled={saving} onChange={e => update('day', e.target.value)}>{Array.from({ length: daysInMonth(details.year, details.month) }, (_, i) => String(i + 1).padStart(2, '0')).map(day => <option key={day} value={day}>{day}</option>)}</Select>
              <Select aria-label="Tháng sinh" value={details.month} disabled={saving} onChange={e => changeCalendar('month', e.target.value)}>{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => <option key={month} value={month}>Tháng {Number(month)}</option>)}</Select>
              <Select aria-label="Năm sinh" value={details.year} disabled={saving} onChange={e => changeCalendar('year', e.target.value)}>{Array.from({ length: 121 }, (_, i) => String(new Date().getFullYear() - i)).map(year => <option key={year} value={year}>{year}</option>)}</Select>
            </div>{dateError && <small className="field-error">{dateError}</small>}</fieldset>
          </fieldset>
        </form>
        <aside className="creator-avatar-panel" aria-label="Ảnh đại diện"><h2>Ảnh đại diện</h2><div className="creator-avatar-preview">{preview || user?.avatarUrl ? <img src={preview || user?.avatarUrl || ''} alt="Ảnh đại diện của bạn" onError={handleAvatarImageError} /> : <User size={40} />}</div><button type="button" disabled={saving} onClick={() => inputRef.current?.click()}><Camera size={15} />Đổi ảnh</button><p>JPG, PNG, WEBP · Tối đa 1 MB</p>{avatar && <span className="creator-avatar-pending">Ảnh mới chưa lưu</span>}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} hidden /></aside>
      </div>
      {formError && <p role="alert" className="creator-account-error">{formError}</p>}
      <footer className="creator-account-footer"><span role="status">{dirty ? 'Có thay đổi chưa lưu' : ''}</span><div><button type="button" disabled={!dirty || saving} onClick={reset}>Hủy thay đổi</button><button type="submit" form="creator-account-form" className="primary" disabled={!dirty || !valid || saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></footer>
      {cropSource && createPortal(<div className="creator-crop-backdrop"><section className="creator-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="creator-crop-title"><header><h2 id="creator-crop-title">Căn chỉnh ảnh</h2><button type="button" onClick={() => setCropSource('')} aria-label="Đóng căn chỉnh ảnh" autoFocus><X size={20} /></button></header><canvas ref={cropRef} width={512} height={512} aria-label="Xem trước ảnh đại diện" /><label>Thu phóng<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label><label>Vị trí ngang<input type="range" min="0" max="100" value={cropX} onChange={e => setCropX(Number(e.target.value))} /></label><label>Vị trí dọc<input type="range" min="0" max="100" value={cropY} onChange={e => setCropY(Number(e.target.value))} /></label><footer><button type="button" onClick={() => setCropSource('')}>Hủy</button><button type="button" className="primary" onClick={useCrop}>Dùng ảnh này</button></footer></section></div>, document.body)}
    </section>
  );
}
