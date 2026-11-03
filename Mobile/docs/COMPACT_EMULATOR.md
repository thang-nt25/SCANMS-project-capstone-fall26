# Màn hình Android gọn hơn

Máy ảo `Medium_Phone_API_37.0` mặc định dùng màn hình 1080×2400. Để thử giao diện 16:9 ngắn hơn, đóng máy ảo rồi chạy trong PowerShell:

```powershell
$env:ANDROID_USER_HOME = Join-Path $env:USERPROFILE '.android'
$taskEmulator = Join-Path $env:LOCALAPPDATA 'Android/Sdk/emulator/emulator.exe'
& $taskEmulator -avd Medium_Phone_API_37.0 -no-snapshot-load -no-snapshot-save -gpu software -cores 2 -memory 2048 -skin 1080x1920 -no-boot-anim
```

Tham số `-skin 1080x1920` đổi kích thước màn hình cho lần chạy này; không xóa dữ liệu app, không thay DB và không tạo máy ảo mới. Bỏ tham số này để quay về kích thước mặc định. Không chạy hai instance của cùng máy ảo đồng thời.

APK debug vẫn cần backend cổng 3000 và Metro cổng 8081. Khi máy ảo khởi động xong:

```powershell
$taskAdb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
& $taskAdb -s emulator-5554 reverse tcp:8081 tcp:8081
& $taskAdb -s emulator-5554 shell am start -n vn.scanms.mobile/.MainActivity
```

Kiểm tra serial bằng `adb devices` nếu máy ảo không dùng `emulator-5554`.
