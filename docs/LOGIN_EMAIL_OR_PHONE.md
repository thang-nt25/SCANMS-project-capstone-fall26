# Đăng nhập bằng email hoặc số điện thoại

## Hợp đồng và hành vi

- `POST /api/auth/login` nhận `{ "identifier": "email hoặc số điện thoại", "password": "mật khẩu hiện tại" }`.
- Payload cũ `{ "email": "...", "password": "..." }` tiếp tục hoạt động. Không được gửi đồng thời `email` và `identifier`; request thiếu/sai định dạng bị trả 400 trước truy vấn DB.
- Email được trim/lowercase. SĐT Việt Nam hỗ trợ đầu `0`, `+84`, `84`, `0084`, khoảng trắng, dấu chấm, gạch nối và ngoặc; hỗ trợ di động 10 chữ số và điện thoại bàn đầu `02` 11 chữ số sau chuẩn hóa. Không tự sửa chữ cái/số sai hoặc đổi mật khẩu.
- Trang login và đăng nhập trong checkout dùng cùng API. Chuyển vai trò không tự ghi đè email/SĐT/mật khẩu đang nhập. Vai trò và JWT lấy từ tài khoản trong DB, không từ dropdown.
- DB hiện không unique theo SĐT. Truy vấn có tham số chỉ lấy tối đa hai ID khớp số đã chuẩn hóa. Nếu có nhiều tài khoản chưa xóa dùng cùng số, không chọn tài khoản đầu tiên hoặc đoán theo mật khẩu/vai trò; trả 401 chung và hướng dẫn dùng email. Tài khoản khóa vẫn bị chặn; tài khoản xóa mềm không tham gia tra cứu số.
- Email bảo mật, JWT, Google login, OTP và điều hướng sau đăng nhập giữ hợp đồng hiện tại. Không bổ sung đăng nhập không mật khẩu/SMS OTP và không coi việc nhập số là đã xác thực quyền sở hữu SIM.

## Triển khai và kiểm tra

Không cần migration, đổi `.env`, seed hoặc chuẩn hóa hàng loạt dữ liệu nhóm. Backend watch/frontend HMR tải lại code mới. API cũ được giữ để tránh lỗi khi FE/BE triển khai lệch thời điểm.

Test web: tài khoản có SĐT đã lưu → dùng email + mật khẩu → đăng xuất → dùng SĐT + cùng mật khẩu → kiểm tra cùng tài khoản. Thử `+84`, mật khẩu sai, số chưa đăng ký, tài khoản khóa, số trùng và đăng nhập trong checkout. Tài khoản chỉ có email hoặc chưa có SĐT hợp lệ vẫn dùng email như cũ. Không tự gán SĐT khác hoặc sửa thông tin của thành viên khác để test.

```powershell
# backend (unit/DTO + regression)
node node_modules/jest/bin/jest.js --runInBand src/modules/auth/tests

# frontend
node --test tests/login-identifier.test.mjs
```

Integration test dùng `AUTH_TEST_DATABASE_URL`, chỉ chấp nhận DB thử nghiệm `127.0.0.1/localhost:55433/scanms_seed_test`, tạo schema mới, chạy migration thật, không reset/drop dữ liệu cũ. Email cảnh báo được mock, không gửi mail thật:

```powershell
$env:AUTH_TEST_DATABASE_URL = 'postgresql://<test-user>:<test-password>@127.0.0.1:55433/scanms_seed_test'
node node_modules/jest/bin/jest.js --runInBand src/modules/auth/tests/login-identifier.postgres.integration.spec.ts
```

Lưu ý vận hành: tra cứu SĐT legacy dùng `regexp_replace`, nên DB lớn cần cân nhắc cột canonical/index và ràng buộc uniqueness sau khi nhóm thống nhất việc xác thực số và xử lý dữ liệu trùng. Thay đổi này không tự áp unique index hoặc thay thế chính sách giới hạn thử đăng nhập của hệ thống.

## Kết quả kiểm tra 17/10/2026

- 79 unit/regression test backend đã qua, gồm chuẩn hóa input, DTO, email cũ, phone, mật khẩu sai, khóa tài khoản, số trùng, Passport và các luồng OTP/mật khẩu trước đó.
- 15 integration test PostgreSQL/HTTP đã qua trên DB local cô lập, gồm số lưu có dấu cách/ngoặc, `0`/`+84`, payload cũ, chống trường xung đột/SQL injection, số trùng khác vai trò và tài khoản xóa/khóa.
- 2 test frontend đã qua; frontend production build và TypeScript backend no-emit đã qua. Không thay đổi `.env`, không migration/seed DB nhóm, không gửi email thật trong integration test.
- Lint frontend còn một cảnh báo `useEffect` dependencies có sẵn trong checkout, ngoài phần đăng nhập; không sửa luồng địa chỉ/đặt hàng để giải quyết cảnh báo không liên quan.
