# Cấu hình đăng nhập local

Cập nhật 01/11/2026, code `thinh` nhận `dev` tại `f1b4ff0`.

## Cấu hình

Các giá trị máy hiện tại nằm trong `frontend/.env` và `backend/.env`, đều được Git ignore. Không commit hai file này.

- `frontend/.env`: `VITE_API_URL=http://localhost:3000/api`.
- `VITE_GOOGLE_CLIENT_ID` phải giống `GOOGLE_CLIENT_ID` của backend. Khi đổi env, khởi động lại tiến trình tương ứng.
- `VITE_ENABLE_DEMO_LOGIN=true` chỉ cho phép điền tài khoản ở Vite development. Production build tắt nhánh này.
- Mỗi vai trò dùng cặp `VITE_DEMO_<ROLE>_IDENTIFIER` / `VITE_DEMO_<ROLE>_PASSWORD`. Nếu chỉ có identifier, trang điền email và để người dùng nhập mật khẩu.
- Không tự ghép email cấu hình với mật khẩu hardcode. Chọn vai trò chỉ thay nội dung form, không tự gửi đăng nhập.

## Tài khoản đã đối chiếu DB

| Vai trò trên login | Email local | Kết quả kiểm tra |
|---|---|---|
| Khách mua | customer.an@scanms.vn | Đang hoạt động, mật khẩu cấu hình khớp |
| KOL/KOC | kol.bronze@scanms.vn | Đang hoạt động, mật khẩu cấu hình khớp |
| Chủ Shop | manager.sora@scanms.vn | Đang hoạt động; nhập mật khẩu hiện tại do nhóm cung cấp |
| Vận hành | manager@scanms.vn | Đang hoạt động, mật khẩu cấu hình khớp |
| Quản trị | admin@scanms.vn | Đang hoạt động, mật khẩu cấu hình khớp |

Người dùng chọn giữ mật khẩu Shop trên DB. `VITE_DEMO_SHOP_PASSWORD` local được để trống để tránh tiếp tục điền một mật khẩu đã biết không khớp. Sau khi có mật khẩu đúng, có thể nhập trực tiếp trên web hoặc cập nhật riêng biến local này rồi restart Vite.

Điền sẵn tài khoản không tạo user, không seed DB, không đổi quyền và không bỏ qua xác thực backend. Bài test browser kiểm tra form sử dụng dữ liệu giả ở biên API; kiểm tra mật khẩu DB được thực hiện riêng bằng truy vấn chỉ đọc.

## Chạy khi chưa có tiến trình phục vụ

Tại `backend`:

```powershell
npm.cmd run build
npm.cmd run start:prod
```

Tại `frontend`:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở `http://127.0.0.1:5173/login`. Chỉ chạy một backend trên cổng 3000. Trong lần cập nhật này, hai dịch vụ đã được khởi động và health DB đã trả `CONNECTED`.

## Kiểm tra lặp lại

Tại `frontend`:

```powershell
node --test tests/demo-login-env.test.mjs
$env:GHN_UI_TEST_URL='http://127.0.0.1:5173'
node --test tests/demo-login-autofill.browser.test.mjs
```

Browser test mặc định dùng Edge. Có thể đặt `GHN_UI_BROWSER_PATH` nếu đường dẫn khác. Không dùng các test này làm bằng chứng đã đăng nhập Google thật hoặc đã nghiệm thu tất cả nghiệp vụ từng vai trò.
