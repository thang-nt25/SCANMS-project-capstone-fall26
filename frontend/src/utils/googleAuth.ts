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
 * Khởi tạo Google Identity Services
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
        // Tắt FedCM tự động bắt buộc nếu trình duyệt gặp sự cố origin
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
      shape: 'rectangular',
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
 * Kích hoạt popup / One Tap Google Sign-In
 */
export function triggerGoogleSignIn(
  onSuccess: (idToken: string) => void,
  onError?: (errorMsg: string) => void,
) {
  if (typeof window === 'undefined' || !window.google?.accounts?.id) {
    const msg =
      'Thư viện Google Identity Services đang tải hoặc bị chặn bởi trình duyệt. Bạn có thể sử dụng biểu mẫu Đăng ký/Đăng nhập trực tiếp.';
    if (onError) onError(msg);
    else toast.error(msg);
    return;
  }

  const initialized = initGoogleIdentity(onSuccess, onError);
  if (!initialized) return;

  try {
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason?.() || 'trình duyệt chặn hoặc chưa cấu hình origin';
        console.warn('Google prompt không hiển thị:', reason);
        onError?.(
          `Google Sign-In prompt chưa được cấp phép hiển thị trên http://localhost:5173 (${reason}). Bạn có thể click nút 'Tiếp tục với Google (Môi trường Dev)' để kiểm thử ngay!`
        );
      } else if (notification.isSkippedMoment()) {
        const reason = notification.getSkippedReason?.();
        console.warn('Google prompt bị bỏ qua:', reason);
        onError?.(
          `Google Sign-In bị chặn hoặc bị bỏ qua (${reason || 'chưa cấp phép origin localhost:5173'}). Bạn có thể thêm http://localhost:5173 vào Google Cloud Console hoặc dùng nút Dev Bypass.`
        );
      }
    });
  } catch (err: any) {
    console.error('Google Sign-In error:', err);
    onError?.(
      'Không thể kích hoạt Google Sign-In. Vui lòng sử dụng tài khoản Email hoặc chế độ kiểm thử nhanh.'
    );
  }
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
