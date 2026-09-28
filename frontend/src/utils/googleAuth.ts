import { toast } from './toast';

declare global {
  interface Window {
    google?: any;
  }
}

let isGoogleInitialized = false;
let activeClientId: string | null = null;

const DEFAULT_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1028788240521-ujoshj82g60v811p5fkqv3hh4iirqbt3.apps.googleusercontent.com';

/**
 * Khởi tạo Google Identity Services (dành cho ID Token & renderButton)
 */
export function initGoogleIdentity(
  onSuccess: (idToken: string) => void,
  onError?: (errorMsg: string) => void,
) {
  if (typeof window === 'undefined') return false;

  if (!window.google?.accounts?.id) {
    return false;
  }

  try {
    if (!isGoogleInitialized || activeClientId !== DEFAULT_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: DEFAULT_CLIENT_ID,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Không nhận được mã xác thực (credential) từ Google.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      isGoogleInitialized = true;
      activeClientId = DEFAULT_CLIENT_ID;
    }
    return true;
  } catch (err: any) {
    console.warn('Lỗi khởi tạo Google Identity:', err);
    return false;
  }
}

/**
 * Hiển thị nút Google Sign-In chính thức vào một container DOM
 */
export function renderGoogleButton(
  container: HTMLElement,
  onSuccess: (idToken: string) => void,
  onError?: (errorMsg: string) => void,
) {
  const initialized = initGoogleIdentity(onSuccess, onError);
  if (!initialized || !container) return false;

  try {
    container.innerHTML = '';
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'left',
      width: '100%',
    });
    return true;
  } catch (err) {
    console.warn('Không thể render nút Google Sign-In:', err);
    return false;
  }
}

/**
 * Kích hoạt popup đăng nhập Google (Hỗ trợ chuẩn OAuth2 Popup & One Tap fallback)
 */
export function triggerGoogleSignIn(
  onSuccess: (token: string) => void,
  onError?: (errorMsg: string) => void,
  onCancel?: () => void,
) {
  if (typeof window === 'undefined') return;

  // 1. ƯU TIÊN HÀNG ĐẦU: Sử dụng Google OAuth2 Token Client (Mở cửa sổ Popup chuẩn chọn tài khoản Gmail)
  if (window.google?.accounts?.oauth2) {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: DEFAULT_CLIENT_ID,
        scope: 'email profile openid',
        callback: (response: any) => {
          if (response?.error) {
            if (response.error === 'access_denied') {
              console.log('Người dùng bấm Hủy hoặc đóng Popup chọn tài khoản Google');
              onCancel?.();
            } else {
              onError?.(`Đăng nhập Google thất bại: ${response.error}`);
            }
            return;
          }
          if (response?.access_token) {
            onSuccess(response.access_token);
          } else {
            onError?.('Không nhận được mã truy cập từ Google.');
          }
        },
        error_callback: (err: any) => {
          console.warn('Sự kiện cửa sổ Google OAuth Popup:', err);
          if (err?.type === 'popup_closed') {
            // Người dùng chủ động đóng popup Google -> Hủy nhẹ nhàng, không báo lỗi đỏ
            onCancel?.();
          } else if (err?.type === 'popup_blocked_by_browser') {
            onError?.('Trình duyệt chặn cửa sổ popup. Vui lòng bật cho phép popup để đăng nhập Google.');
          } else {
            onCancel?.();
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
      return;
    } catch (err: any) {
      console.warn('Lỗi mở Google OAuth2 Token Client:', err);
    }
  }

  // 2. Dự phòng: Google One Tap Prompt
  if (window.google?.accounts?.id) {
    const initialized = initGoogleIdentity(onSuccess, onError);
    if (!initialized) return;

    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason?.() || 'unknown';
          console.warn('Google prompt không hiển thị:', reason);
          if (reason === 'suppressed_by_user' || reason === 'opt_out_or_no_session' || reason === 'cool_down_phase') {
            onCancel?.();
            return;
          }
          onError?.(
            `Google Sign-In prompt không thể hiển thị (${reason}). Bạn có thể đăng ký trực tiếp bằng biểu mẫu.`
          );
        } else if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
          onCancel?.();
        }
      });
      return;
    } catch (err: any) {
      console.error('Google One Tap error:', err);
    }
  }

  // 3. Nếu script Google chưa load xong
  const msg =
    'Thư viện Google Identity Services đang tải hoặc bị chặn. Bạn có thể đăng ký trực tiếp bằng biểu mẫu.';
  if (onError) onError(msg);
  else toast.error(msg);
}

/**
 * Chế độ Dev Bypass: Giúp lập trình viên / Hội đồng kiểm thử nghiệm nhanh luồng Google
 * mà không bị chặn bởi Authorized JavaScript Origins của Google Cloud Console trên localhost.
 */
export function devBypassGoogleSignIn(
  onSuccess: (idToken: string) => void,
  testEmail: string = 'customer.google@scanms.vn',
) {
  toast.info('Đang giả lập xác thực nhanh bằng tài khoản Google...');
  onSuccess(`mock-google-token:${testEmail}`);
}
