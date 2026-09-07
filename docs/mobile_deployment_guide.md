# Hướng Dẫn Chi Tiết Đóng Gói và Deploy Dự Án Lên Android & iOS

Tài liệu này hướng dẫn chi tiết cách chuyển đổi dự án Capstone hiện tại (ReactJS + NestJS) thành ứng dụng di động chạy trên Android (APK) và iOS, cũng như quy trình đưa lên các chợ ứng dụng (Google Play Store & Apple App Store).

---

## BƯỚC 1: CHUẨN BỊ BACKEND (MÔI TRƯỜNG INTERNET)

Khi chạy ở local, frontend kết nối đến backend thông qua `http://localhost:3000`. Khi chạy trên điện thoại thật (hoặc máy ảo), điện thoại sẽ không thể kết nối tới `localhost` của máy tính.

1. **Deploy Backend lên Internet:**
   * Bạn cần deploy NestJS Backend và cơ sở dữ liệu PostgreSQL lên một dịch vụ cloud (ví dụ: VPS riêng, Render, Railway, fly.io, hoặc AWS).
   * Đảm bảo backend chạy trên giao thức **HTTPS** (ví dụ: `https://api.yourdomain.com`).
2. **Cập nhật biến môi trường Frontend:**
   * Cấu hình URL gọi API của Frontend trỏ đến domain sản phẩm (ví dụ: `VITE_API_URL=https://api.yourdomain.com`).

---

## BƯỚC 2: TÍCH HỢP CAPACITOR VÀO REACTJS (FRONTEND)

Chúng ta sẽ dùng **Capacitor** để đóng gói mã nguồn ReactJS thành ứng dụng di động mà không cần phải viết lại code giao diện.

### 1. Cài đặt các thư viện cần thiết
Mở terminal tại thư mục `frontend/` và chạy lệnh:
```bash
# Cài đặt CLI và Core của Capacitor
npm install @capacitor/core @capacitor/cli

# Cài đặt các platform Android và iOS
npm install @capacitor/android @capacitor/ios
```

### 2. Khởi tạo cấu hình Capacitor
Chạy lệnh sau tại thư mục `frontend/`:
```bash
npx cap init "Tên Ứng Dụng" "com.yourcompany.capstoneapp" --web-dir=dist
```
* **"Tên Ứng Dụng"**: Tên hiển thị của app trên điện thoại (ví dụ: `Capstone Sales`).
* **"com.yourcompany.capstoneapp"**: Package Name / Bundle ID (đây là định danh duy nhất của app, viết dạng ngược, ví dụ: `com.sp26.salesapp`). *Hãy chọn kỹ vì không đổi được sau khi upload lên Store.*
* **`--web-dir=dist`**: Thư mục chứa code sau khi build của Vite (Vite mặc định xuất ra thư mục `dist`).

### 3. Thêm các thư mục Native cho Android và iOS
```bash
npx cap add android
npx cap add ios
```
*Lệnh này sẽ tạo ra 2 thư mục con `android` và `ios` bên trong thư mục `frontend/`. Đây là các project native thực sự.*

---

## BƯỚC 3: QUY TRÌNH BUILD & ĐỒNG BỘ MỖI KHI CẬP NHẬT CODE

Mỗi khi bạn thay đổi code ReactJS và muốn chạy thử trên điện thoại, hãy làm theo 3 bước sau tại thư mục `frontend/`:

1. **Build mã nguồn Web:**
   ```bash
   npm run build
   ```
2. **Đồng bộ code build vào thư mục Native:**
   ```bash
   npx cap sync
   ```
   *(Lệnh này sẽ copy file tĩnh từ `dist/` vào thư mục của Android/iOS và cập nhật các plugin).*
3. **Mở dự án trên Android Studio hoặc Xcode:**
   * **Android:**
     ```bash
     npx cap open android
     ```
   * **iOS (yêu cầu máy Mac):**
     ```bash
     npx cap open ios
     ```

---

## BƯỚC 4: XUẤT FILE CÀI ĐẶT THỬ NGHIỆM (TESTING)

### 1. Dành cho Android (Tạo file APK)
1. Sau khi chạy lệnh `npx cap open android`, **Android Studio** sẽ được mở lên.
2. Đợi Android Studio đồng bộ xong (Gradle Sync hoàn tất).
3. Trên thanh công cụ trên cùng, chọn:
   * **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Sau khi build xong, góc dưới bên phải sẽ hiện thông báo thành công. Bạn nhấn **Locate** để lấy file `app-debug.apk` hoặc `app-release-unsigned.apk`.
5. Gửi file `.apk` này qua Zalo, Drive... rồi tải về cài trực tiếp lên điện thoại Android của các thành viên trong nhóm để test.

### 2. Dành cho iOS (Chạy giả lập hoặc máy thật)
* *Lưu ý: Bạn bắt buộc phải có máy tính chạy hệ điều hành macOS.*
1. Sau khi chạy lệnh `npx cap open ios`, **Xcode** sẽ tự động mở lên.
2. **Chạy thử trên Simulator:** Chọn thiết bị ảo (ví dụ: iPhone 15) ở thanh công cụ phía trên và nhấn nút **Run** (hình tam giác).
3. **Chạy thử trên iPhone thật:**
   * Cắm iPhone thật vào máy Mac bằng cáp.
   * Trên Xcode, chọn tài khoản Apple cá nhân trong phần *Signing & Capabilities* (Team) để ký chứng chỉ nhà phát triển miễn phí.
   * Chọn thiết bị là iPhone của bạn và nhấn **Run**.

---

## BƯỚC 5: QUY TRÌNH UPLOAD LÊN GOOGLE PLAY STORE & APPLE APP STORE

Để đưa ứng dụng lên store chính thức cho người dùng tải về:

### 1. Đưa ứng dụng lên Google Play Store (Android)
1. **Đăng ký tài khoản Developer:**
   * Truy cập [Google Play Console](https://play.google.com/console).
   * Đăng ký tài khoản với chi phí **25 USD (đóng 1 lần duy nhất)**. Yêu cầu có thẻ tín dụng quốc tế (Visa/Mastercard).
2. **Tạo chứng chỉ và ký app (Sign App):**
   * Trong Android Studio, chọn **Build > Generate Signed Bundle / APK...**
   * Chọn **Android App Bundle (`.aab`)** (đây là định dạng mới thay thế APK khi tải lên Google Play).
   * Tạo một Keystore mới (lưu file này cực kỳ cẩn thận, mất file này sẽ không bao giờ cập nhật được app nữa).
   * Build ra file `.aab` đã được signed.
3. **Đưa lên Play Console:**
   * Tạo ứng dụng mới trên trang quản trị.
   * Tải file `.aab` lên mục **Production** hoặc **Testing**.
   * Hoàn thành các bảng khảo sát (độ tuổi, nội dung app...).
   * Điền thông tin mô tả, đăng tải ảnh chụp màn hình ứng dụng (screenshot), ảnh logo, ảnh banner.
   * Cung cấp link **Chính sách bảo mật (Privacy Policy)** - *Bạn có thể tạo miễn phí qua các trang web generator và host trên GitHub Pages.*
   * Gửi duyệt (Google duyệt thủ công, thời gian duyệt khoảng **2 đến 7 ngày**).

### 2. Đưa ứng dụng lên Apple App Store (iOS)
1. **Đăng ký tài khoản Apple Developer Program:**
   * Truy cập trang chủ Apple Developer.
   * Đăng ký tài khoản với chi phí **99 USD/năm (phải gia hạn hàng năm)**.
2. **Cấu hình & Tạo Archive trong Xcode:**
   * Trong Xcode, chọn mục tiêu build là **Any iOS Device (arm64)**.
   * Chọn **Product > Archive**.
   * Sau khi đóng gói xong, nhấn **Distribute App** và chọn **App Store Connect** để Xcode tự động upload ứng dụng lên tài khoản Apple của bạn.
3. **Thiết lập trên App Store Connect:**
   * Truy cập trang web [App Store Connect](https://appstoreconnect.apple.com).
   * Điền mô tả ứng dụng, từ khóa, chọn ảnh chụp màn hình cho các dòng iPhone khác nhau.
   * Chọn phiên bản app vừa được upload từ Xcode lên.
   * Điền thông tin về độ tuổi, thông tin liên hệ và link **Privacy Policy**.
   * Nhấn **Submit for Review** để gửi cho Apple kiểm duyệt (thời gian duyệt của Apple thường rất nhanh, từ **24 giờ đến 3 ngày**).

---

## MỘT SỐ LƯU Ý KHI ĐÓNG GÓI ĐỒ ÁN
* **Trải nghiệm UI/UX di động:** Đảm bảo giao diện ReactJS được thiết kế Responsive tốt, các nút bấm đủ to, không bị tràn màn hình khi xem trên các kích thước điện thoại khác nhau.
* **CORS (Cross-Origin Resource Sharing):** Khi chạy dưới dạng ứng dụng Capacitor, nguồn gửi request từ app di động sẽ là `http://localhost` hoặc `capacitor://localhost`. Bạn cần cấu hình cấu trúc CORS ở backend NestJS cho phép nhận request từ các origin này.
* **Quyền hạn thiết bị (Permissions):** Nếu đồ án cần dùng Camera, Định vị (GPS), hay Album ảnh, bạn phải khai báo quyền trong file `AndroidManifest.xml` (Android) và `Info.plist` (iOS). Capacitor cung cấp sẵn các API plugin để gọi các tính năng native này một cách dễ dàng.
