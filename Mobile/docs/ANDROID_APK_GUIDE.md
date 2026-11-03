# Android Studio, Emulator và APK demo

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

Script chạy prebuild rồi thực thi lệnh Gradle Windows **`gradlew.bat :app:assembleDemo --no-daemon`**. Variant `demo` kế thừa release bundling, `debuggable=false`, ID **`vn.scanms.mobile.demo`**, version **`1.0.0-demo`**, versionCode **1**. Dùng debug signing cho nghiệm thu nội bộ, không dùng để phát hành Store.

Chỉ khi build thành công, script mới tạo:

```text
Mobile/artifacts/scanms-demo.apk
Mobile/artifacts/apk-metadata.json
```

Metadata gồm bytes, SHA-256 và thời điểm build, ban đầu `deviceSmokeTest=NOT_RUN`. File nguồn Gradle dự kiến `android/app/build/outputs/apk/demo/app-demo.apk`. Những đường dẫn này là **đầu ra được cấu hình**, chưa tồn tại APK trong lần bàn giao hiện tại.

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

- Ninja báo `Filename longer than 260 characters` ở codegen gesture handler. Config plugin đặt `CMAKE_OBJECT_PATH_MAX=240`; CMake hash phần thư mục object. Đường dẫn gây lỗi đã đo lại còn 234 ký tự và build C++/APK đã qua. Cấu hình nằm ở `plugins/with-android-demo.cjs`, không sửa `node_modules` hoặc Registry Windows. Cơ chế hash được mô tả trong [tài liệu CMake](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html).
- Máy 16 GB RAM chạy đồng thời IDE/Emulator/build bị thiếu RAM. Plugin giới hạn 2 Gradle worker, heap 1536 MB, metaspace 1024 MB, compiler Kotlin in-process. Nên build xong rồi mới mở Emulator trong lần đầu.
- Emulator đã boot bằng renderer `software`, 2 CPU, RAM 2048 MB. Android 17 hiện quyền Nearby devices cho `ACCESS_LOCAL_NETWORK`: bản debug cần quyền này để kết nối Metro trên máy tính. Đã đối chiếu với `LocalNetworkPermissionUtil.kt` của React Native và wrapper của Expo trước khi cấp quyền; không cấp camera/micro.
