# Triển khai SCANMS — scanms.io.vn

Bộ cấu hình này dành cho VPS Linux có Docker Engine và Docker Compose v2. Chưa có VPS/IP nên chưa thể trỏ DNS hoặc cấp HTTPS. Không cần mua thêm hosting PHP nếu dùng VPS.

## 1. Chuẩn bị máy chủ

- Ubuntu 24.04 LTS, tham khảo khởi điểm 2 vCPU / 4 GB RAM; cần kiểm tra tải thực tế, đặc biệt tác vụ tìm kiếm ngữ nghĩa. Build lần đầu có thể cần thêm RAM/swap.
- Mở cổng 80/TCP, 443/TCP và 443/UDP. SSH chỉ cho nguồn quản trị cần thiết.
- PostgreSQL dùng kết nối đã được xác nhận riêng. Compose không tạo, xóa, reset hoặc seed database.
- Kiểm tra subnet Docker `172.30.94.0/24` không trùng mạng đang dùng.

## 2. Chuẩn bị cấu hình riêng

Đưa mã nguồn lên VPS qua Git hoặc phương thức riêng; không đưa `.env`, khóa ngân hàng, bản sao dữ liệu cá nhân vào Git/image.

Chạy tại thư mục gốc mã nguồn trên VPS:

```sh
cp deploy/.env.example deploy/backend.env
chmod 600 deploy/backend.env
```

Điền `deploy/backend.env` bằng trình sửa tệp trên máy chủ:

- DOMAIN: `scanms.io.vn`; ACME_EMAIL: email quản trị nhận thông tin chứng chỉ.
- DATABASE_URL: kết nối PostgreSQL đúng môi trường; kiểm tra backup trước khi dùng dữ liệu hiện có.
- JWT_SECRET, JWT_REFRESH_SECRET, REDIS_PASSWORD: các chuỗi ngẫu nhiên riêng biệt, không dùng giá trị mẫu.
- Các tích hợp cần dùng lấy tên biến từ `backend/.env.example`: email OTP, lưu ảnh/tệp, GHN, Google OAuth, thanh toán, ngân hàng. Không sao chép biến localhost hoặc đường dẫn Windows sang Linux.
- Nếu dùng chứng thư BIDV, bổ sung mount chỉ đọc tới thư mục khóa ngoài mã nguồn và cấu hình đường dẫn Linux. Bộ Compose hiện chưa mount khóa và chưa nghiệm thu kết nối ngân hàng.

`DISABLE_SCHEDULED_JOBS=true` tạm ngừng các lịch có kiểm tra cờ này trong lần triển khai đầu, gồm giải tỏa hoa hồng và email payout. Sau khi kiểm tra môi trường và bảo đảm chỉ một instance chạy lịch, đổi thành `false` để hoạt động tự động.

## 3. Trỏ DNS TenTen

Khi đã có IP public VPS, tạo hai bản ghi A:

| Host | Giá trị |
| --- | --- |
| @ | IP public VPS |
| api | IP public VPS |

Giữ nguyên bản ghi email/xác minh đang cần dùng. Kiểm tra bản ghi A/AAAA cũ có gây trỏ nhầm hay không. Bộ cấu hình chỉ phục vụ `scanms.io.vn` và `api.scanms.io.vn`, chưa khai báo `www`.

## 4. Build và chạy

```sh
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml config --quiet
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml up -d --build
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml ps
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml logs --tail=80 caddy backend
```

Không chia sẻ log chứa thông tin cá nhân hoặc cấu hình bí mật. Caddy tự xin chứng chỉ HTTPS khi DNS đã trỏ đúng và cổng truy cập được. Backend/Redis không mở cổng trực tiếp ra Internet.

Nếu database cần migration, phải kiểm tra trạng thái/schema, backup và nội dung migration trước khi thực hiện riêng; không chạy `migrate reset` hoặc seed lên dữ liệu đang vận hành.

## 5. Kiểm tra trước khi sử dụng

- Website mở được qua HTTPS; tải lại các đường dẫn sâu không lỗi 404.
- Đăng nhập đúng năm vai trò; danh sách sản phẩm và ảnh/tệp tải được.
- Chat kết nối WebSocket, gửi/nhận và tải tệp đúng quyền.
- Email OTP hoạt động với nhà cung cấp đã cấu hình; cập nhật OAuth origin/callback theo tên miền thật.
- GHN/thanh toán/ngân hàng: cập nhật webhook theo route thực tế của backend và thử đúng môi trường Sandbox. Không tự đổi sang giao dịch thật.
- Đối chiếu ví, payout, thuế theo kỳ và audit; kiểm tra lịch sau khi bật lại. Không chạy song song hai bộ lịch vào cùng database.
- Kiểm tra backup database và các dịch vụ lưu tệp ngoài máy chủ.

## 6. App Android

Sau khi API HTTPS chạy ổn định, cập nhật API base URL của bản Mobile thành `https://api.scanms.io.vn/api` theo cấu hình ứng dụng. `10.0.2.2` chỉ phục vụ máy ảo khi phát triển, không dùng cho APK phát hành. Cần build lại và thử đăng nhập, ảnh, chat, chọn tệp/camera và deep link trên điện thoại thật.

## Trạng thái xác minh

Đã kiểm tra cấu trúc Compose bằng chế độ không đọc env riêng. Chưa build các image hoặc kiểm tra Nginx/Caddy trong container vì Docker Engine trên máy hiện chưa chạy. Chưa triển khai lên VPS, chưa trỏ DNS và chưa xác minh tích hợp production.
