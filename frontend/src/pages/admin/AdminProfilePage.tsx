import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { Loader2, UserRound, ShieldCheck, Camera, LockKeyhole, Eye, EyeOff, Check, Mail, Phone, Save } from 'lucide-react';
import { authService, type UserProfile } from '../../services/auth.service';
import { customerService } from '../../services/customer.service';
import { uploadService } from '../../services/upload.service';
import './AdminProfilePage.css';

export default function AdminProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(authService.getCurrentUser);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const roleLabel = user?.role === 'SYSTEM_MANAGER' ? 'Vận hành & tuân thủ' : 'Ban quản trị tối cao';
  const busy = saving || uploading || loading || loadFailed;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError('');
    authService.getMe().then(profile => {
      if (!active) return;
      if (!profile?.id) throw new Error('Không thể tải hồ sơ cá nhân.');
      setUser(profile);
      setFullName(profile.fullName || '');
      setPhone(profile.phoneNumber || '');
    }).catch(() => {
      if (active) { setLoadFailed(true); setError('Không thể tải hồ sơ. Vui lòng thử lại.'); }
    }).finally(() => { if (active) setLoading(false); });
    const sync = () => setUser(authService.getCurrentUser());
    window.addEventListener('auth-user-updated', sync);
    return () => { active = false; window.removeEventListener('auth-user-updated', sync); };
  }, [reload]);

  const dirty = fullName.trim() !== (user?.fullName || '') || phone.trim() !== (user?.phoneNumber || '');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    if (!fullName.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const result = await customerService.updateProfile({ fullName: fullName.trim(), phoneNumber: phone.trim() });
      if (!result?.user?.id) throw new Error('Máy chủ chưa xác nhận cập nhật hồ sơ.');
      const updated = { ...(authService.getCurrentUser() || user), ...result.user } as UserProfile;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated); setFullName(updated.fullName); setPhone(updated.phoneNumber || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      setSaved(true);
    } catch (err) { setError(getError(err, 'Không thể lưu hồ sơ. Vui lòng thử lại.')); }
    finally { setSaving(false); }
  }

  function getError(err: any, fallback: string) {
    const message = err?.response?.data?.message;
    return Array.isArray(message) ? message.join(' ') : message || err?.message || fallback;
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setAvatarMessage(''); setAvatarError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarError('Chọn ảnh JPG, PNG hoặc WEBP, tối đa 5 MB.'); return;
    }
    setUploading(true);
    try {
      const url = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(url);
      setUser(authService.getCurrentUser());
      setAvatarMessage('Đã cập nhật ảnh đại diện.');
    } catch (err) { setAvatarError(getError(err, 'Không thể cập nhật ảnh đại diện.')); }
    finally { setUploading(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (changingPassword || busy) return;
    setPasswordError(''); setPasswordSaved(false);
    if (passwords.next.length < 6) { setPasswordError('Mật khẩu mới cần ít nhất 6 ký tự.'); return; }
    if (passwords.next !== passwords.confirm) { setPasswordError('Mật khẩu xác nhận chưa khớp.'); return; }
    if (passwords.next === passwords.current) { setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
    setChangingPassword(true);
    try {
      await customerService.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' }); setShowPasswords(false); setPasswordSaved(true);
    } catch (err) { setPasswordError(getError(err, 'Không thể đổi mật khẩu.')); }
    finally { setChangingPassword(false); }
  }

  return (
    <section className="admin-personal-profile" aria-label="Hồ sơ cá nhân">
      {loading ? <div className="admin-profile-loading" role="status"><Loader2 size={18} className="animate-spin" /> Đang tải hồ sơ…</div> : (
        <div className="admin-profile-grid">
          <aside className="admin-profile-identity">
            <div className="admin-profile-avatar-wrap">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="Ảnh đại diện" /> : <span className="admin-profile-avatar">{user?.fullName?.charAt(0).toUpperCase() || 'A'}</span>}
              <button type="button" className="admin-profile-camera" onClick={() => avatarInput.current?.click()} disabled={busy} aria-label="Đổi ảnh đại diện">{uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}</button>
            </div>
            <h2>{user?.fullName || 'Tài khoản quản trị'}</h2>
            <span className="admin-profile-role"><ShieldCheck size={12} /> {roleLabel}</span>
            <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadAvatar} />
            <button type="button" className="admin-profile-secondary" disabled={busy} onClick={() => avatarInput.current?.click()}>{uploading ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}</button>
            <p className="admin-profile-hint">JPG, PNG, WEBP · Tối đa 5 MB</p>
            {avatarError && <p className="admin-profile-error" role="alert">{avatarError}</p>}
            {avatarMessage && <p className="admin-profile-feedback" role="status">{avatarMessage}</p>}
            <div className="admin-profile-contact"><div><Mail size={14} /><span>{user?.email || 'Chưa cập nhật email'}</span></div><div><Phone size={14} /><span>{user?.phoneNumber || 'Chưa cập nhật số điện thoại'}</span></div></div>
            <div className="admin-profile-identity-note"><LockKeyhole size={14} /><p>Email đăng nhập và vai trò được quản lý bởi hệ thống.</p></div>
          </aside>
          <div className="admin-profile-content">
            <form onSubmit={save} className="admin-profile-form">
              <div className="admin-profile-section-title"><span><UserRound size={16} /></span><div><h2>Thông tin cá nhân</h2><p>Cập nhật tên hiển thị và thông tin liên hệ.</p></div></div>
              {error && <p className="admin-profile-error" role="alert">{error}</p>}
              {loadFailed && <button type="button" className="admin-profile-secondary" onClick={() => setReload(value => value + 1)}>Tải lại hồ sơ</button>}
              <fieldset disabled={busy}>
                <label>Họ và tên <span aria-hidden="true">*</span><input name="fullName" autoComplete="name" required maxLength={150} value={fullName} onChange={event => { setFullName(event.target.value); setSaved(false); }} /></label>
                <label>Số điện thoại<input name="phoneNumber" autoComplete="tel" type="tel" maxLength={20} placeholder="Nhập số điện thoại" value={phone} onChange={event => { setPhone(event.target.value); setSaved(false); }} /></label>
                <label>Email đăng nhập<span className="admin-profile-locked-label"><LockKeyhole size={10} /> Chỉ xem</span><input value={user?.email || ''} readOnly type="email" /></label>
                <label>Vai trò tài khoản<span className="admin-profile-locked-label"><LockKeyhole size={10} /> Chỉ xem</span><input value={roleLabel} readOnly /></label>
              </fieldset>
              <footer><span role="status">{saved ? <><Check size={13} /> Đã lưu thông tin.</> : dirty ? 'Có thay đổi chưa lưu' : 'Thông tin đã được đồng bộ'}</span><div><button type="button" className="admin-profile-secondary" disabled={busy || !dirty} onClick={() => { setFullName(user?.fullName || ''); setPhone(user?.phoneNumber || ''); setError(''); setSaved(false); }}>Hủy thay đổi</button><button type="submit" className="admin-profile-primary" disabled={busy || !dirty || !fullName.trim()}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></footer>
            </form>
            <details className="admin-profile-security">
              <summary><span className="admin-profile-section-title"><span><LockKeyhole size={16} /></span><span><strong>Bảo mật tài khoản</strong><small>Đổi mật khẩu đăng nhập</small></span></span><span className="admin-profile-security-action">Đổi mật khẩu</span></summary>
              <form onSubmit={changePassword}>
                <fieldset disabled={changingPassword || busy}>
                  {(['current', 'next', 'confirm'] as const).map(key => <label key={key}>{key === 'current' ? 'Mật khẩu hiện tại' : key === 'next' ? 'Mật khẩu mới' : 'Xác nhận mật khẩu mới'}<input name={key + 'Password'} type={showPasswords ? 'text' : 'password'} autoComplete={key === 'current' ? 'current-password' : 'new-password'} required minLength={key === 'current' ? undefined : 6} value={passwords[key]} onChange={event => { setPasswords(previous => ({ ...previous, [key]: event.target.value })); setPasswordSaved(false); }} /></label>)}
                </fieldset>
                <div className="admin-profile-password-tools"><span>Ít nhất 6 ký tự.</span><button type="button" className="admin-profile-text-button" aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)}>{showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button></div>
                {passwordError && <p className="admin-profile-error" role="alert">{passwordError}</p>}
                {passwordSaved && <p className="admin-profile-feedback" role="status"><Check size={13} /> Đã đổi mật khẩu thành công.</p>}
                <button type="submit" className="admin-profile-primary" disabled={changingPassword || busy || !passwords.current || !passwords.next || !passwords.confirm}>{changingPassword && <Loader2 size={14} className="animate-spin" />}{changingPassword ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button>
              </form>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
