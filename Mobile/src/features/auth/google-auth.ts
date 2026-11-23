import { Platform } from "react-native";

export type GoogleAuthIntent = "login" | "register";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const clientIdPattern = /^[\w-]+\.apps\.googleusercontent\.com$/;

export const googleSignInSupported =
  Platform.OS === "android" ||
  (Platform.OS === "ios" && clientIdPattern.test(iosClientId || ""));

export async function requestGoogleIdToken() {
  if (!webClientId || !clientIdPattern.test(webClientId)) {
    throw new Error("Ứng dụng chưa cấu hình đăng nhập Google.");
  }

  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    await import("@react-native-google-signin/google-signin").catch(() => {
      throw new Error("Bản ứng dụng này chưa tích hợp Google Sign-In. Hãy cập nhật bản cài đặt.");
    });
  try {
    GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
    if (Platform.OS === "android") await GoogleSignin.hasPlayServices();
    // Keep the Google account chooser available after signing out of SCANMS.
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) {
      throw new Error("Google chưa cấp mã xác thực. Vui lòng thử lại.");
    }
    return response.data.idToken;
  } catch (error) {
    if (!isErrorWithCode(error)) throw error;
    if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services chưa sẵn sàng trên thiết bị này.");
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Google đang xử lý một yêu cầu xác thực. Vui lòng thử lại.");
    }
    if (error.code === "10" || error.code === "DEVELOPER_ERROR") {
      throw new Error("Google chưa chấp nhận cấu hình của bản cài đặt SCANMS này.");
    }
    throw new Error("Chưa xác thực được với Google. Vui lòng thử lại.");
  }
}
