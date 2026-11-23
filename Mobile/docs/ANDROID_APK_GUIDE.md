# Android Studio, Emulator và APK demo

## APK demo đã build — 22/11/2026

- Bản hiện tại: `Mobile/artifacts/scanms-demo.apk`, package `vn.scanms.mobile.demo`, version `1.0.2-demo`, versionCode **3** để cài đè bản trước. Byte/hash chính xác nằm trong `Mobile/artifacts/apk-metadata.json`. Có bundle JavaScript và hỗ trợ ARM/x86; app không cần Metro.
- API được nhúng: `http://192.168.27.24:3000/api`. Điện thoại thật cần cùng Wi-Fi với laptop; backend phải đang chạy. Không thay `.env` emulator: build lần này dùng biến môi trường của terminal. Nếu địa chỉ laptop đổi, cần build lại với API phù hợp.
- Bản 1.0.2 bổ sung hồ sơ KOL nhiều kênh, thẩm định, tạo Store nội bộ, thẻ VIP trong chat và thao tác hàng mẫu sandbox. **136 test Mobile, 218 test backend liên quan**, typecheck, lint và build backend đạt. Đăng nhập thật 5 role và 41 kiểm tra API đọc/đăng nhập đạt; chưa nghiệm thu E2E các mutation đủ 5 role hoặc điện thoại thật. Xem các bước test tại [README](../README.md).
- Kiểm tra API phát hiện schema nhóm thiếu bảng/cột trong khi lịch sử migration đã ghi đã áp dụng. Migration bổ sung `20261122090000_restore_live_schema_objects` đã được áp dụng sau khi backup phục hồi cục bộ và thử hai lần; toàn bộ bảng/cột Prisma cần đã có, các số lượng dữ liệu cũ giữ nguyên. Không reset hoặc seed DB nhóm.
- Bằng chứng kiểm thử API/schema nằm tại `.dev-runtime/mobile-flow-native-smoke-results.json` và `.dev-runtime/mobile-schema-repair-receipt.json` ở thư mục gốc dự án. Backup có dữ liệu nhạy cảm, chỉ giữ cục bộ, không commit/chia sẻ. Bằng chứng build/thiết bị nằm trong `Mobile/artifacts/`.
- APK cuối đã cài đè trên emulator API 37, khôi phục phiên Customer và mở Tôi → Đăng ký KOL/KOC → cả ba bước của form. Đã xem ảnh bố cục chọn ngành/kênh và ngân hàng/đồng ý; không nộp hồ sơ. Bằng chứng: `apk-verification-20261122-flows.json`, `mobile-kyc-channels-20261122.png`, `mobile-kyc-bank-20261122.png` trong `artifacts/`. Lúc vừa build native vừa nhập bàn phím từng xuất hiện ANR (cả các app hệ thống emulator); đã thử lại đăng nhập/điều hướng thành công sau build. Đây chưa phải kiểm thử hiệu năng thiết bị hoặc E2E nhiều role.

### Test đăng ký Customer

1. Cài đè bản mới, mở màn đăng nhập → **Đăng ký ngay**.
2. Nhập họ tên, email đang sử dụng, số điện thoại tùy chọn, mật khẩu tối thiểu 8 ký tự và xác nhận; đồng ý điều khoản.
3. **Tiếp tục · Gửi mã OTP** gọi `/api/auth/send-otp`. Kiểm tra hộp thư/spam; mã hiệu lực 5 phút, nút gửi lại mở sau 60 giây.
4. Nhập đủ 6 số → **Xác thực & tạo tài khoản** gọi `/api/auth/register` với role `CUSTOMER`. Thành công → **Đăng nhập ngay**. Không lưu mật khẩu/OTP vào SecureStore hoặc URL, không tự tạo phiên đăng nhập từ response đăng ký.
5. Kiểm tra email trùng, mật khẩu không khớp, điện thoại sai, OTP sai/hết hạn, gửi lại và trở lại sửa email. Các nhánh API đã kiểm thử bằng fixture/mock; kiểm thử email thực tế do người dùng thao tác trên app.

## Trạng thái trên máy ngày 03/11/2026

Android Studio/SDK đã được cài. SDK nằm tại `C:\Users\Dell\AppData\Local\Android\Sdk`; đã có Platform 37.0, Build Tools 37.0.0, NDK 27.1.12297006 và CMake 3.22.1. JDK dùng để build là `C:\Program Files\Java\jdk-21.0.12.1`.

**Đã build, xác minh chữ ký và cài APK debug** `Mobile/artifacts/scanms-debug-x86_64.apk` trên Emulator Medium Phone API 37. Màn đăng nhập, validation trống, mở bàn phím và mở lạnh có Metro đã kiểm tra. Metadata/SHA-256 tại [verification-2026-11-03.json](verification-2026-11-03.json). Bản debug này cần Metro, chỉ chứa ABI x86_64 cho Emulator; chưa phải APK cho điện thoại ARM hoặc bản demo chạy độc lập Metro. Chưa kiểm thử các luồng đăng nhập nghiệp vụ đủ 5 role hay điện thoại thật.

Kết quả và ảnh thật: [ANDROID_STARTUP_2026-11-03.md](ANDROID_STARTUP_2026-11-03.md). Các bước cài công cụ dưới đây vẫn dùng cho máy mới.

## 1. Cài công cụ

1. Cài [Android Studio](https://developer.android.com/studio). Làm theo [hướng dẫn Emulator của Expo](https://docs.expo.dev/workflow/android-studio-emulator/).
2. Mở Settings → Languages & Frameworks → Android SDK. Cài Android SDK Platform **37**, Build Tools **37.0.0**, Platform Tools, Command-line Tools, Emulator, NDK **27.1.12297006**. Đây là phiên bản lấy từ `node_modules/react-native/gradle/libs.versions.toml` của lockfile hiện tại (compileSdk 37, targetSdk 36, minSdk 24), không dùng bảng SDK của template cũ.
3. Người sử dụng đọc/chấp nhận điều khoản SDK trong Android Studio. Không tự động chạy lệnh nhận toàn bộ license bằng script.
4. Device Manager → Create Device → chọn thiết bị Pixel và system image phù hợp (API 36 hoặc 37) → khởi động Emulator. Bật virtualization nếu máy yêu cầu.
5. Trong Gradle Settings chọn JDK tương thích; project hiện có JDK 21, không dùng JRE cũ trong PATH.

Nếu SDK Manager chưa có đúng Platform/Build Tools theo lockfile, ghi lỗi và đồng bộ SDK/Expo có kiểm thử; không tự hạ compileSdk hoặc ép dependencies để che lỗi.

## 2. Biến môi trường PowerShell

Đường dẫn dưới đây chỉ dùng nếu SDK được cài ở vị trí mặc định; sửa thành đường dẫn hiện trong Android Studio nếu khác.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12.1'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
java -version
adb devices
```

Các biến trên chỉ áp dụng terminal hiện tại, không sửa `$HOME` hoặc cấu hình dự án khác. Có thể đặt biến User qua Windows Environment Variables sau khi xác nhận đúng đường dẫn.

## 3. Chạy bản debug để phát triển

```powershell
cd D:\ProjectCapstone\Mobile
npm ci
# Tạo .env từ .env.example chỉ khi chưa có cấu hình riêng.
npm run android:prebuild
```

Mở `Mobile/android` trong Android Studio, đợi Gradle Sync; chọn device và variant **debug**. Mở terminal khác tại `Mobile` chạy `npm start`, rồi Run trong Android Studio. Hoặc chạy `npm run android` khi Emulator đã bật để CLI build/cài app.

Debug package `vn.scanms.mobile` cần Metro. Backend vẫn là NestJS cổng 3000, API emulator `http://10.0.2.2:3000/api`. Không đưa file `backend/.env` vào Android project.

`android/` là thư mục sinh tự động và gitignored. Không sửa tay Gradle/Manifest rồi coi đó là cấu hình source; thay đổi phải ở `app.json` hoặc `plugins/with-android-demo.cjs` để máy khác prebuild tái tạo được.

## 4. Xuất APK demo có bundle

Sau khi SDK, JDK và license đã sẵn sàng:

```powershell
cd D:\ProjectCapstone\Mobile
npm run typecheck
npm run lint
npm test
npm run build:demo
```

Script chạy prebuild rồi thực thi lệnh Gradle Windows **`gradlew.bat :app:assembleDemo --no-daemon`**. Variant `demo` kế thừa release bundling, `debuggable=false`, ID **`vn.scanms.mobile.demo`**. Version đọc từ `app.json` và thêm hậu tố `-demo`; hiện là **`1.0.2-demo`**, versionCode **3**. Dùng debug signing cho nghiệm thu nội bộ, không dùng để phát hành Store.

Chỉ khi build thành công, script mới tạo:

```text
Mobile/artifacts/scanms-demo.apk
Mobile/artifacts/apk-metadata.json
```

Metadata gồm bytes, SHA-256 và thời điểm build, ban đầu `deviceSmokeTest=NOT_RUN`; chỉ cập nhật sau khi kiểm tra thiết bị thực tế. File nguồn Gradle là `android/app/build/outputs/apk/demo/app-demo.apk`. Bản mới ngày 22/11 đã được build và xác minh như ghi ở đầu tài liệu.

Không bấm Assemble Debug rồi bàn giao nhầm là APK demo độc lập Metro. Tham khảo [APK và AAB](https://docs.expo.dev/build-reference/apk/) và [build production local](https://docs.expo.dev/guides/local-app-production/).

## 5. Kiểm tra artifact và cài thử

Khi file đã có:

```powershell
Get-FileHash .\artifacts\scanms-demo.apk -Algorithm SHA256
& "$env:ANDROID_HOME\build-tools\37.0.0\aapt.exe" dump badging .\artifacts\scanms-demo.apk
& "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --verbose .\artifacts\scanms-demo.apk
adb install -r .\artifacts\scanms-demo.apk
adb shell am force-stop vn.scanms.mobile.demo
adb shell monkey -p vn.scanms.mobile.demo -c android.intent.category.LAUNCHER 1
```

Tắt Metro hoàn toàn, mở app lại: màn login phải hiện được; chức năng online vẫn cần backend. Kiểm tra Android Back, keyboard, logout/relogin, kill/reopen, mất mạng và hai client chat. Ghi kết quả thật vào MOBILE_TEST_REPORT; không tự sửa `NOT_RUN` thành PASS trước khi cài thử.

Điện thoại thật không dùng `10.0.2.2`: đổi `.env` sang IP LAN hoặc server HTTPS, prebuild và build APK lại. Địa chỉ backend được nhúng lúc build; thay `.env` trên máy sau đó không tự cập nhật APK đã cài.

## 6. Release và thông tin ký

Plugin loại bỏ debug signing khỏi block release của template. Release main không có HTTP exception và chưa có khóa ký production. Muốn phát hành cần cấu hình khóa riêng ngoài Git, HTTPS, package/store policy và kiểm thử bổ sung. Không commit `.keystore`, key password, service secret hoặc `local.properties`. Bản demo có signing debug do Gradle local sinh, không phải khóa phát hành.

Chưa gửi source lên EAS/cloud hoặc tạo build remote; Android Studio local là môi trường người dùng đã chọn.

## 7. Lỗi đã xử lý khi build Windows

- Ninja báo `Filename longer than 260 characters` ở codegen gesture handler. Với Debug trước đây, giới hạn 240 tạo được đường dẫn 234 ký tự. Bản demo release dùng thư mục `RelWithDebInfo` dài hơn: object đã hash cần 246 ký tự nên đặt 240 lại khiến CMake không rút gọn được. Plugin nay đặt **256 cho app**, **240 cho thư viện native**, cấu hình thư viện bằng `androidComponents.finalizeDsl` trong root Gradle. Bản build ngày 22/11 đã biên dịch được object gesture handler tại đường dẫn 246 ký tự. Không sửa tay `node_modules` hoặc Registry Windows. Xem [cơ chế hash của CMake](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html) và [Android Gradle DSL lifecycle](https://developer.android.com/reference/tools/gradle-api/9.2/com/android/build/api/variant/AndroidComponentsExtension).
- Máy 16 GB RAM chạy đồng thời IDE/Emulator/build bị thiếu RAM. Plugin giới hạn 2 Gradle worker, heap 1536 MB, metaspace 1024 MB, compiler Kotlin in-process. Nên build xong rồi mới mở Emulator trong lần đầu.
- Emulator đã boot bằng renderer `software`, 2 CPU, RAM 2048 MB. Android 17 hiện quyền Nearby devices cho `ACCESS_LOCAL_NETWORK`: bản debug cần quyền này để kết nối Metro trên máy tính. Đã đối chiếu với `LocalNetworkPermissionUtil.kt` của React Native và wrapper của Expo trước khi cấp quyền; không cấp camera/micro.
