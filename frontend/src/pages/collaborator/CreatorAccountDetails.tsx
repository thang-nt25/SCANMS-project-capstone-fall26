import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Loader2, Save, ShieldCheck } from 'lucide-react';
import { authService, type UserProfile } from '../../services/auth.service';
import { customerService } from '../../services/customer.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { Select } from '../../components/ui/Select';
import './CreatorAccountDetails.css';

export default function CreatorAccountDetails() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [nameInput, setNameInput] = useState(() => currentUser?.fullName || '');
  const [phoneInput, setPhoneInput] = useState(() => currentUser?.phoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // KOL profile metadata (Gender & Date of birth)
  const metaKey = `scanms_kol_meta_${currentUser?.id || 'kol'}`;
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>(() => {
    try {
      const saved = localStorage.getItem(metaKey);
      if (saved) return JSON.parse(saved).gender || 'MALE';
    } catch {}
    return 'MALE';
  });

  const [birthDay, setBirthDay] = useState(() => {
    try {
      const saved = localStorage.getItem(metaKey);
      if (saved) return JSON.parse(saved).birthDay || '02';
    } catch {}
    return '02';
  });

  const [birthMonth, setBirthMonth] = useState(() => {
    try {
      const saved = localStorage.getItem(metaKey);
      if (saved) return JSON.parse(saved).birthMonth || '01';
    } catch {}
    return '01';
  });

  const [birthYear, setBirthYear] = useState(() => {
    try {
      const saved = localStorage.getItem(metaKey);
      if (saved) return JSON.parse(saved).birthYear || '2000';
    } catch {}
    return '2000';
  });

  // Sync latest user profile on mount
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const profile = await customerService.getProfile();
        if (isMounted && profile?.user) {
          if (profile.user.fullName) setNameInput(profile.user.fullName);
          if (profile.user.phoneNumber) setPhoneInput(profile.user.phoneNumber);
        }
      } catch {
        // Fallback to authService user
        const u = authService.getCurrentUser();
        if (isMounted && u) {
          setNameInput(u.fullName || '');
          setPhoneInput(u.phoneNumber || '');
        }
      }
    };
    loadProfile();

    const handleUserSync = () => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
      if (u?.fullName) setNameInput(u.fullName);
      if (u?.phoneNumber) setPhoneInput(u.phoneNumber);
    };

    window.addEventListener('auth-user-updated', handleUserSync);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-user-updated', handleUserSync);
    };
  }, []);

  // Masking helpers matching SCANMS Profile Image 1
  const maskEmail = (email?: string) => {
    if (!email) return 'chua-co-email@scanms.vn';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const visible = name.slice(0, 2);
    return `${visible}***********@${parts[1]}`;
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return 'Chưa cập nhật';
    const clean = phone.trim();
    if (clean.length < 4) return clean;
    const last2 = clean.slice(-2);
    return `*********${last2}`;
  };

  const username =
    currentUser?.email?.split('@')[0] ||
    'kol_creator';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await customerService.updateProfile({
        fullName: nameInput.trim(),
        phoneNumber: phoneInput.trim(),
      });

      // Persist gender and birth date in localStorage
      localStorage.setItem(
        metaKey,
        JSON.stringify({ gender, birthDay, birthMonth, birthYear })
      );

      // Refresh auth session
      await authService.getMe();
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('Cập nhật thông tin hồ sơ KOL thành công!');
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ:', err);
      toast.error(err?.response?.data?.message || 'Không thể cập nhật thông tin hồ sơ');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (.JPEG, .PNG, .WEBP)');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast.error('Dung lượng file tối đa là 1 MB theo quy định hồ sơ');
      return;
    }

    try {
      setUploadingAvatar(true);
      const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(secureUrl);
      await customerService.updateProfile({ avatarUrl: secureUrl });
      await authService.getMe();
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('Cập nhật ảnh đại diện KOL thành công!');
    } catch (error: any) {
      console.error('Lỗi khi tải ảnh đại diện:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Không thể tải ảnh đại diện lên');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <section className="creator-account" aria-labelledby="creator-account-title">
      <header className="creator-account-heading">
        <span className="creator-account-heading-icon"><User size={18} /></span>
        <div>
          <h1 id="creator-account-title">Hồ sơ của tôi</h1>
          <p>Cập nhật thông tin cá nhân và ảnh đại diện của bạn.</p>
        </div>
      </header>

      <div className="creator-account-body">
        <form onSubmit={handleUpdateProfile} className="creator-account-form" id="creator-account-form">
          <div className="creator-account-fields">
            <div className="creator-account-field">
              <span className="creator-account-label">Tên đăng nhập</span>
              <div className="creator-account-readonly">{username}</div>
              <p className="creator-account-hint">Tên đăng nhập chỉ có thể thay đổi một lần.</p>
            </div>
            <div className="creator-account-field">
              <label htmlFor="creator-account-name">Họ và tên</label>
              <input
                id="creator-account-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                autoComplete="name"
                placeholder="Nhập họ và tên"
              />
            </div>
            <div className="creator-account-field">
              <span className="creator-account-label">Email</span>
              <div className="creator-account-contact">
                <span>{maskEmail(currentUser?.email)}</span>
                <button type="button" onClick={() => toast.info('Email đã được bảo mật theo chuẩn định danh')}>
                  <ShieldCheck size={13} /> Bảo mật
                </button>
              </div>
            </div>
            <div className="creator-account-field">
              <label htmlFor={isEditingPhone ? 'creator-account-phone' : undefined}>Số điện thoại</label>
              {isEditingPhone ? (
                <div className="creator-account-phone-editor">
                  <input
                    id="creator-account-phone"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0912345678"
                    autoComplete="tel"
                    autoFocus
                  />
                  <button type="button" onClick={() => setIsEditingPhone(false)}>Xong</button>
                </div>
              ) : (
                <div className="creator-account-contact">
                  <span>{phoneInput ? maskPhone(phoneInput) : 'Chưa cập nhật'}</span>
                  <button type="button" onClick={() => setIsEditingPhone(true)}>Thay đổi</button>
                </div>
              )}
            </div>
            <fieldset className="creator-account-field">
              <legend>Giới tính</legend>
              <div className="creator-account-genders">
                {([
                  ['MALE', 'Nam'], ['FEMALE', 'Nữ'], ['OTHER', 'Khác'],
                ] as const).map(([value, label]) => (
                  <label key={value}>
                    <input type="radio" name="gender" value={value} checked={gender === value} onChange={() => setGender(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="creator-account-field">
              <legend>Ngày sinh</legend>
              <div className="creator-account-birthday">
                <Select aria-label="Ngày sinh" value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </Select>
                <Select aria-label="Tháng sinh" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </Select>
                <Select aria-label="Năm sinh" value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
                  {Array.from({ length: 70 }, (_, i) => String(2015 - i)).map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </Select>
              </div>
            </fieldset>
          </div>
        </form>

        <aside className="creator-account-avatar-panel" aria-label="Ảnh đại diện">
          <h2>Ảnh đại diện</h2>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="creator-account-avatar"
            aria-label="Chọn ảnh đại diện mới"
          >
            {uploadingAvatar ? <Loader2 className="animate-spin" size={24} /> : currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Ảnh đại diện của bạn" />
            ) : <User size={36} />}
            {!uploadingAvatar && <span className="creator-account-camera"><Camera size={13} /></span>}
          </button>
          <div className="creator-account-avatar-controls">
            <button className="creator-account-button" type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
              <Camera size={14} /> {uploadingAvatar ? 'Đang tải...' : 'Chọn ảnh'}
            </button>
            <p>JPEG, PNG, WEBP · Tối đa 1 MB</p>
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarFileSelected}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="creator-account-file"
            aria-label="Tải ảnh đại diện"
          />
        </aside>
      </div>

      <footer className="creator-account-footer">
        <span><ShieldCheck size={14} /> Thông tin liên hệ được ẩn để bảo vệ tài khoản.</span>
        <button type="submit" form="creator-account-form" disabled={updatingProfile} className="creator-account-button creator-account-save">
          {updatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {updatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </footer>
    </section>
  );
}
