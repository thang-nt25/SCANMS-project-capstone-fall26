# Triển khai SCANMS — scanms.io.vn

Bộ cấu hình đang triển khai tại VPS Ubuntu 24.04, IP `110.172.28.88`, thư mục `/opt/scanms`. Docker chạy frontend, backend, Redis và Caddy; PostgreSQL tiếp tục dùng cơ sở dữ liệu Supabase hiện có. Không cần hosting PHP.

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

`DISABLE_SCHEDULED_JOBS=false` hiện bật cron/interval/timeout của Nest Schedule trên VPS sau khi đã Suspend backend Render cũ. Worker email xác nhận đơn giữ cấu hình tắt sẵn của dự án (`ORDER_CONFIRMATION_EMAIL_WORKER_DISABLED=true`). Khi chạy thêm bản staging trên cùng dữ liệu, đặt `DISABLE_SCHEDULED_JOBS=true` cho bản staging để tránh chạy hai bộ tác vụ.

## 3. Trỏ DNS TenTen

Khi đã có IP public VPS, tạo hai bản ghi A:

| Host | Giá trị |
| --- | --- |
| @ | 110.172.28.88 |
| api | 110.172.28.88 |

Giữ nguyên bản ghi email/xác minh đang cần dùng. Kiểm tra bản ghi A/AAAA cũ có gây trỏ nhầm hay không. Bộ cấu hình chỉ phục vụ `scanms.io.vn` và `api.scanms.io.vn`, chưa khai báo `www`.

## 4. Build và chạy

VPS hiện tại có 1 vCPU / 1 GB RAM và 2 GB swap. Bản triển khai này biên dịch TypeScript/Vite trên máy phát triển rồi đưa `backend/dist` vào `backend/deploy-dist`, `frontend/dist` vào `frontend/deploy-dist` trên VPS. Image backend vẫn cài dependencies/native ONNX trên Linux. Khi build frontend, dùng `node deploy/build-frontend-local.cjs` để đặt API `/api`, Socket URL HTTPS và bỏ tài khoản đăng nhập mẫu khỏi bundle.

Sau khi chuyển mã nguồn và hai thư mục artifact tương ứng lên VPS:

```sh
cd /opt/scanms
sh deploy/build-prebuilt-vps.sh
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml -f deploy/compose.prebuilt.yml up -d
python3 deploy/smoke-vps.py https://scanms.io.vn
```

Không dùng artifact cũ sau khi thay mã nguồn. Máy chủ có đủ tài nguyên có thể build trực tiếp theo lệnh bên dưới:

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

Ngày 18/11/2026: đã triển khai các container trên VPS, cập nhật bản ghi `@` và `api` tại TenTen, cấp chứng chỉ HTTPS hợp lệ cho hai tên miền. Kiểm tra qua `https://scanms.io.vn` đạt: API health UP/database CONNECTED, frontend và đường dẫn sâu HTTP 200, API sản phẩm công khai hợp lệ, Socket.IO polling handshake có hỗ trợ nâng cấp WebSocket. ONNX native binding CPU tải được; chưa kiểm thử toàn bộ mô hình dưới tải.

Backend Render `scanms-api` (`srv-dbq15fgu01pc739hkcq0`) đã Suspend; giao diện có Resume và endpoint cũ trả HTTP 503. Các lịch tự động đã bật trên VPS và đã kiểm tra lại health, frontend, API sản phẩm, Socket.IO thành công. Chưa nghiệm thu đăng nhập đủ năm vai trò, email OTP, thanh toán, GHN, ngân hàng và ứng dụng Android. Chưa xóa dịch vụ Render hoặc chạy migration/seed/reset database.

Cập nhật tối 18/11/2026: đã đồng bộ lại toàn bộ ứng dụng và đối chiếu checksum nguồn, artifact và container. Đăng nhập đủ 5 vai trò, 32 kiểm tra API và 17 màn hình thực đã đạt. Gmail SMTP, Cloudinary API và GHN location API đã xác thực thành công; nạp ví demo Customer bị khóa, PayOS đã có return URL HTTPS hợp lệ. Google OAuth còn cần chủ client thêm origin tên miền. Xem [báo cáo đối chiếu](DOMAIN-DEPLOYMENT-AUDIT.md) để biết phạm vi kiểm tra và giới hạn.

Khôi phục web về Render khi cần: tạm dừng lịch trên VPS, Resume `scanms-api` trên Render, kiểm tra API/frontend Render rồi đổi bản ghi A `@` về `216.24.57.1`. Không bật đồng thời lịch của hai backend. Giữ bản sao cấu hình và xác định API tương ứng trước khi khôi phục. Việc DNS chuyển máy chủ không tạo bản sao dữ liệu; hai backend đang sử dụng cơ sở dữ liệu hiện có.
