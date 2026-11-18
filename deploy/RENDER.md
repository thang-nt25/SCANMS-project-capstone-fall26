# Render — SCANMS

## Trạng thái

Đã chuẩn bị `render.yaml` cho hai dịch vụ mới: `scanms-api` và `scanms-web`, nhánh `tuan`. Chưa tạo dịch vụ, chưa build trên Render, chưa trỏ DNS. Không thay đổi các dịch vụ cũ trong tài khoản.

Render hiện chưa thấy repository `thang-nt25/SCANMS-project-capstone-fall26` trong kết nối GitHub. Cần chủ repository cấp quyền cho Render đọc đúng repository; không cần chuyển repository thành public hoặc cấp toàn bộ repository.

## Tạo dịch vụ

Sau khi mã nguồn và cấu hình đã được đưa lên nhánh triển khai, chọn New → Blueprint → đúng repository → nhánh `tuan`. Xem lại danh sách dịch vụ và giá trước khi tạo. Blueprint hiện chọn backend Free, frontend Static Site; không tự tạo database hoặc dịch vụ Redis có phí.

Nếu tạo thủ công:

| Thuộc tính | Backend | Frontend |
| --- | --- | --- |
| Loại | Web Service, Node | Static Site |
| Root directory | backend | frontend |
| Build | `npm ci --include=dev && npx prisma generate && npm run build` | `npm ci --include=dev && npm run build` |
| Start | `node dist/main.js` | Không có |
| Publish | Không có | dist |
| Health | /api/health | Không có |
| Region | Singapore | CDN |

## Biến môi trường

Nhập giá trị riêng trực tiếp trong Render, không commit `.env`:

- DATABASE_URL: PostgreSQL đúng môi trường, đã kiểm tra backup/schema. Không tự seed/reset/migrate dữ liệu hiện có.
- REDIS_URL: kết nối Redis bảo vệ bằng mật khẩu và TLS (`rediss://...`). Trình kiểm tra production hiện không nhận hostname private Render không TLS; không tắt kiểm tra TLS để vượt qua. Nếu dùng Render Key Value phải xác nhận cấu hình kết nối tương thích trước.
- JWT_SECRET và JWT_REFRESH_SECRET: Blueprint sinh mới; người dùng phải đăng nhập lại trên môi trường deploy.
- Cấu hình Supabase, Cloudinary, email/OTP, Google OAuth và GHN theo tích hợp dự án đang dùng; lấy tên biến từ `backend/.env.example`, không sao chép mù toàn bộ giá trị localhost.
- Chứng thư BIDV cần secret files/đường dẫn Linux riêng. Chưa cấu hình chứng thư thì chưa nghiệm thu payout qua ngân hàng.
- `DISABLE_SCHEDULED_JOBS=true` chỉ phục vụ kiểm tra ban đầu. Sau khi xác minh toàn luồng và chỉ một backend chạy lịch, mới bật lại; Render Free có thể ngủ nên không bảo đảm lịch chạy đúng giờ.

Frontend chỉ chứa thông tin công khai: `VITE_API_URL=https://api.scanms.io.vn/api`, `VITE_SOCKET_URL=https://api.scanms.io.vn`, Google client ID nếu dùng. Không đặt khóa bí mật vào biến `VITE_*`.

## Tên miền

Sau khi Render tạo dịch vụ, thêm domain và dùng đúng bản ghi DNS Render hiển thị:

- `scanms.io.vn` cho frontend.
- `api.scanms.io.vn` cho backend.

Không đoán IP Render và không lấy IP VPS cũ để trỏ. Chờ xác minh domain/HTTPS rồi kiểm tra đăng nhập và chat. Frontend có fallback SPA; `/r/*` chuyển tới backend để ghi nhận link tiếp thị. Trang bot chia sẻ sản phẩm/SEO cần kiểm tra riêng trên Static Site vì cấu hình Nginx của VPS không chạy ở đây.

## Giới hạn cần kiểm tra

Backend Free ngủ sau thời gian không có truy cập, ổ đĩa không bền vững và RAM hạn chế. Tìm kiếm/đối chiếu ngữ nghĩa có tải model lớn nên có thể không đủ tài nguyên. Không khẳng định mọi chức năng đã đạt chỉ vì build thành công. Tệp người dùng phải lưu ở dịch vụ lưu trữ ngoài, không trong `/tmp`.

Kiểm tra năm role, tải ảnh/tài liệu, WebSocket, OTP, callback, giới hạn quyền, ví/payout/thuế và app Android. Đổi API endpoint APK sang HTTPS sau khi backend hoạt động; không dùng `10.0.2.2` cho điện thoại ngoài môi trường phát triển.

Tài liệu: https://render.com/docs/blueprint-spec và https://render.com/docs/free
