# Đối chiếu triển khai SCANMS — 18/11/2026

Đã cập nhật toàn bộ mã nguồn ứng dụng hiện tại, gồm các thay đổi chưa commit, lên https://scanms.io.vn và https://api.scanms.io.vn. Không xóa chức năng local, không seed/reset/migrate dữ liệu, không xóa dịch vụ Render cũ. Giữ image trước cập nhật với tag `before-full-sync` để khôi phục khi cần.

## Bằng chứng đồng bộ

| Kiểm tra | Kết quả |
| --- | --- |
| File nguồn, tài nguyên và artifact theo manifest | 3.105 file khớp checksum |
| File thực tế trong container backend | 1.138 file khớp |
| File thực tế trong container frontend | 518 file khớp |
| Cấu hình backend sau các điều chỉnh dành cho VPS | 63 biến khớp checksum, không in giá trị bí mật |
| Backend unit tests | 2.241 đạt, 59 bỏ qua theo cấu hình test |
| Frontend kiểm tra không cần browser fixture | 320 đạt ban đầu; 1 kiểm tra nhãn cũ được cập nhật và chạy lại đạt; 138 browser tests không chạy trong lệnh mặc định |
| Kiểm tra fixture giao diện trọng tâm chạy riêng | 4/4 đạt: hồ sơ KOL, quản lý sản phẩm/video/đánh giá, hoàn tiền Customer, vận chuyển hàng trả Shop |
| API/đăng nhập trên tên miền | 32/32 đạt, đủ 5 vai trò |
| Màn hình thực trên tên miền | 17/17 tải được, không có pageerror hoặc API 5xx trong lần kiểm tra |
| Chat | WebSocket có xác thực đúng tài khoản qua HTTPS |
| Bí mật trong bundle frontend | Không tìm thấy các giá trị mật khẩu/secret/token riêng được kiểm tra |

Các bản sửa giao diện gần đây của KOL, bộ lọc, thẻ mẫu hai cột, đổi trả, hoàn tiền, vận đơn và quản lý sản phẩm đã được đưa vào bundle mới. Nginx không cache HTML, tài nguyên JS/CSS dùng tên hash mới.

## Điều chỉnh theo môi trường

- Backend giữ `NODE_ENV=production`, HTTPS và cookie production.
- Khóa nạp ví demo Customer: `ALLOW_DEMO_WALLET_TOPUP=false`; API availability thực tế trả `false`, giao diện ví không hiện bộ chọn nạp demo. Code local vẫn còn nguyên.
- PayOS quay về `https://scanms.io.vn`; availability thực tế đã chuyển từ `false` sang `true` sau sửa cấu hình.
- Luồng mô phỏng vận chuyển đã cấu hình trong `.env` được cho phép trên máy chủ bằng `ALLOW_HOSTED_SHIPPING_SIMULATION=true`; không dùng NODE_ENV development và không bật nạp tiền demo theo cờ này.
- Giữ Redis riêng, pool DB, lịch tự động trên VPS và cấu hình worker email xác nhận đơn đang tắt sẵn trong nguồn local.
- Bí mật chỉ nằm trong env backend riêng trên máy chủ, không đưa nguyên `.env` vào tài nguyên web công khai.

## Tích hợp đã kiểm tra

- Gmail: xác thực SMTP thành công; không gửi email thử cho người khác.
- Cloudinary: API ping có xác thực thành công qua HTTPS.
- GHN: API địa phương môi trường thật và staging đều thành công.
- PayOS: cấu hình sẵn sàng; không tạo giao dịch thu/chi thật.
- Cơ sở dữ liệu: health trả UP / CONNECTED.

## Google OAuth còn chờ chủ client

Client ID frontend và backend đã khớp. Google báo `origin_mismatch` vì tên miền chưa được chủ OAuth client cho phép. Tài khoản Google Cloud hiện người dùng mở thuộc dự án chưa cấu hình Google Auth; người dùng xác nhận không phải người quản lý client hiện tại.

Người quản lý **client hiện đang dùng trong `.env`** cần thêm `https://scanms.io.vn` vào **Authorized JavaScript origins**, giữ các origin cũ. Không cần tạo client mới, không cần thay mật khẩu hay gửi client secret cho người khác. Luồng đăng nhập hiện dùng Google Identity Services popup và POST `/api/auth/google`; đổi callback trong `.env` không tự đăng ký origin với Google.

Tài liệu: https://developers.google.com/identity/openid-connect/reference

## Giới hạn của kết quả

Đã xác minh mã nguồn/bundle và các màn hình/API nêu trên; không đồng nghĩa mọi tổ hợp nghiệp vụ đã được thử đầu cuối. Chưa tạo đơn, upload chứng từ, hoàn tiền, gửi OTP hoặc chuyển tiền thật trong lần kiểm tra này. Việc đăng ký webhook, cho phép tên miền và quyền phía nhà cung cấp là cấu hình ngoài repository; sao chép `.env` không thay thế các cấu hình đó.

Không có cấu hình gateway chi trả ngân hàng thật/BIDV trong `.env` nguồn được cấp cho đợt triển khai; không tự tạo credentials hoặc coi thanh toán mô phỏng là chuyển khoản thật. Các thao tác xác nhận chuyển khoản thủ công hiện có vẫn được giữ.
