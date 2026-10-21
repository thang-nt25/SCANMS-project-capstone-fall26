# FR-01 — Đăng ký, đăng nhập JWT và OTP email

Đối chiếu mã nguồn hiện tại ngày 2026-10-20. Hai sơ đồ dùng bộ hình và renderer chung của FR9/FR10–FR16: Arial, hộp lớp ba ngăn, trục Controller → Service → PrismaService; sequence có actor, Browser, lifeline đứt, thanh thực thi và nhãn trong suốt. Cách trình bày tham khảo Word đã xem; kiến trúc và tên lớp theo SCANMS NestJS/Prisma.

## File sử dụng

- [Class — XML để mở/dán diagrams.net](<review 2/FR01 - Class Diagram>) · [PNG](diagrams/FR01_Registration_Login_JWT_Email_OTP_Class_Diagram.png)
- [Sequence — XML để mở/dán diagrams.net](<review 2/FR01 - Sequence Diagram>) · [PNG](diagrams/FR01_Registration_Login_JWT_Email_OTP_Sequence_Diagram.png)
- Bản chuẩn `.drawio`, `.scene.json`, `FR01_Class_Paste.xml`, `FR01_Sequence_Paste.xml` nằm trong `docs/diagrams`.
- Đặc tả: `diagrams/fr01-report-spec.json`. Tạo lại: `node docs/diagrams/build-fr01-diagrams.cjs`.
- Render: `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR01_Registration_Login_JWT_Email_OTP`; thay `Class` bằng `Sequence` để tạo ảnh còn lại.
- Kiểm tra: `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/validate-fr01-diagrams.ps1`.

## Phạm vi và tình trạng 2FA

**Đã có:** OTP email để xác minh khi đăng ký; đăng nhập email hoặc số điện thoại Việt Nam bằng mật khẩu; cấp access JWT; guard/strategy xác thực Bearer cho tài nguyên được bảo vệ.

**Chưa có trong luồng được kiểm tra:** bước OTP thứ hai sau khi mật khẩu đăng nhập hợp lệ; API setup/verify/disable 2FA; trạng thái/secret 2FA trong User; quy trình refresh token. `Verify2FaDto` chỉ khai báo `secret` và `token`, chưa có chỗ sử dụng trong controller/service/frontend. Có dependency `otplib` không đồng nghĩa đã triển khai 2FA. Email cảnh báo đăng nhập cũng không phải thử thách OTP đăng nhập.

Sơ đồ mô tả chức năng đang chạy và ghi khoảng thiếu này ngay trong subtitle/note, không tạo API hoặc lớp xác minh 2FA giả. Đây là đối chiếu yêu cầu với triển khai, không phải thay đổi logic xác thực.

## Luồng đang chạy

1. `RegisterPage` kiểm tra mật khẩu trùng nhau, tối thiểu 8 ký tự và đồng ý điều khoản; gửi `/api/auth/send-otp`. Backend DTO yêu cầu mật khẩu tối thiểu 6 ký tự ở register/login, khác điều kiện 8 ký tự phía trang đăng ký.
2. `sendRegistrationOtp` chuẩn hóa email, tìm email đã tồn tại chưa bị xóa, sinh mã ngẫu nhiên 6 số bằng `randomInt`, lưu vào `otpCache: Map<string, StoredOtp>` trong 5 phút. Không có bảng OTP. Mã không xuất hiện trong HTTP response.
3. MailService gửi qua Nodemailer nếu có cấu hình. Chế độ thiếu cấu hình hoặc lỗi gửi thông thường có thể log console. Hàm gửi đăng ký không trả trạng thái nhận thư cho AuthService; phản hồi thành công không chứng minh người dùng đã nhận email. Trang hiển thị modal OTP và đếm ngược gửi lại 60 giây; API hiện không có cooldown tương ứng. Gửi lại thay mã cũ trong Map.
4. Trang hiện gửi `role: CUSTOMER` cùng thông tin và OTP tới `/api/auth/register`. `assertOtp` kiểm tra hạn, định dạng và mã; 5 lần nhập sai xóa mã. Mã đúng được xóa **trước lần await tiếp theo**, rồi mới kiểm tra trùng email, băm và ghi User.
5. `hashPassword` ưu tiên Argon2id, fallback bcrypt cost 10 khi băm Argon2 thất bại. `user.create` chỉ chọn các trường công khai trả về. Endpoint đăng ký trả User và thông báo; không cấp JWT.
6. `RegisterPage` gọi `/api/auth/login` để tự động đăng nhập bằng email/mật khẩu vừa nhập. Nếu thất bại, tài khoản đã đăng ký vẫn tồn tại và UI chuyển về `/login` với email. Đăng nhập thường qua `LoginPage` sử dụng cùng API.
7. `login` chuẩn hóa identifier rồi `findLoginUser`. Email dùng `findUnique`; điện thoại chuẩn hóa các dạng 0/+84/84/0084, dùng SQL tham số tìm tối đa hai tài khoản chưa bị xóa, chỉ chấp nhận đúng một tài khoản. Không chọn theo vai trò UI, không thử mật khẩu giữa nhiều tài khoản và không tự tạo tài khoản khi đăng nhập.
8. Kiểm tra `isDeleted`/`isActive`, xác minh mật khẩu Argon2 hoặc bcrypt. Hash bcrypt cũ được thử nâng cấp; lỗi nâng cấp không chặn đăng nhập. Sau đó gửi cảnh báo đăng nhập bằng promise không await, bắt lỗi độc lập.
9. **`JwtService` của `@nestjs/jwt`** ký payload `{sub, email, role}`. AuthModule bắt buộc cấu hình `JWT_SECRET`, thời hạn theo `JWT_EXPIRATION`, mặc định `7d`. File `modules/auth/jwt.service.ts` cùng tên là lớp khác, không phải dependency được import trong AuthService; sơ đồ ghi rõ tên thư viện.
10. Login trả accessToken, User đã bỏ passwordHash và `securityAlertQueued` (chỉ phản ánh sự hiện diện MailService, không xác nhận giao thư). TransformInterceptor bọc response `success/statusCode/data`. Frontend lưu token/User/workspace vào localStorage, phát sự kiện và điều hướng.

`POST send-otp` không đặt `@HttpCode`, vì vậy status thành công mặc định NestJS là **201**, dù Swagger mô tả 200. Register thành công 201; login có `@HttpCode(OK)` nên 200. DTO/OTP không hợp lệ 400; thông tin đăng nhập sai 401; tài khoản vô hiệu hóa 403; kiểm tra email trùng tài khoản chưa bị xóa 409. Lỗi ghi/unique khác chưa được hàm register chuyển đổi đồng nhất thành 409.

## Class và các nhánh được tóm tắt

Class chọn 10 lớp/model: AuthController, AuthService, PrismaService, PrismaClient, JwtService của NestJS, MailService, User, Store, CollaboratorProfile, Wallet. Map/StoredOtp là trạng thái trong AuthService; DTO và helper định danh là kiểu/thành phần được nhắc trong chữ ký và tài liệu. Không vẽ OTP thành entity, không thêm Repository/UnitOfWork/get-set của dự án Word.

Backend cho phép ba vai trò đăng ký công khai CUSTOMER/COLLABORATOR/SHOP_MANAGER; mặc định backend là COLLABORATOR. COLLABORATOR tạo User, tra hạng Đồng, tạo profile rồi Wallet; avatar bắt buộc nhưng kiểm tra sau khi User đã được ghi. Yêu cầu SHOP_MANAGER tạo User với vai trò CUSTOMER, yêu cầu logo, sau đó tạo Store không active/verified và onboarding DRAFT. Các ghi này **không ở chung transaction**; lỗi giữa chừng có thể để lại User và OTP đã bị tiêu thụ. Sequence mở rộng luồng CUSTOMER đúng theo RegisterPage hiện tại; các nhánh KOL/Shop được ghi note và thể hiện quan hệ dữ liệu trên class.

User–Store là 1 → 0..*, User–CollaboratorProfile và User–Wallet là 1 → 0..1. PrismaService kế thừa PrismaClient thật. Các dependency `«use»` tới model là truy cập ORM, không phải khóa ngoại mới. Hạng KOL, các DTO, Google OAuth và khôi phục mật khẩu không mở rộng trong hai hình này.

Đối với request sau đăng nhập, Axios đính Bearer từ localStorage. `JwtAuthGuard`/Passport dùng `JwtStrategy`, kiểm tra chữ ký/hạn, nạp User đang active/chưa bị xóa từ database; `/auth/me` tiếp tục nạp dữ liệu tài khoản an toàn. Luồng này được ghi note, không giả định token tự có hiệu lực vĩnh viễn và không đưa guard vào endpoint đăng nhập công khai.

## Mã nguồn đối chiếu

- [AuthController](../backend/src/modules/auth/auth.controller.ts): route và HTTP status.
- [AuthService](../backend/src/modules/auth/auth.service.ts): OTP Map, ghi đăng ký, kiểm tra mật khẩu, cấp JWT.
- [AuthModule](../backend/src/modules/auth/auth.module.ts): JwtModule, secret và expiry.
- [MailService](../backend/src/modules/auth/mail.service.ts): gửi OTP, cảnh báo và fallback.
- [RegisterDto](../backend/src/modules/auth/dto/register.dto.ts), [LoginDto](../backend/src/modules/auth/dto/login.dto.ts), [Verify2FaDto chưa được dùng](../backend/src/modules/auth/dto/verify-2fa.dto.ts).
- [Helper định danh](../backend/src/modules/auth/login-identifier.ts), [JwtStrategy](../backend/src/common/strategies/jwt.strategy.ts), [JwtAuthGuard](../backend/src/common/guards/jwt-auth.guard.ts).
- [Prisma schema](../backend/prisma/schema.prisma), [PrismaService](../backend/src/core/database/prisma.service.ts).
- [RegisterPage](../frontend/src/pages/auth/RegisterPage.tsx), [LoginPage](../frontend/src/pages/auth/LoginPage.tsx), [frontend authService](../frontend/src/services/auth.service.ts), [Axios](../frontend/src/services/api.ts).

## Kiểm tra

Đã chạy ba suite mock `auth-otp.spec.ts`, `phone-login.spec.ts`, `login-identifier.spec.ts`: **57/57 test đạt**. Lệnh: `npm test -- --runTestsByPath src/modules/auth/tests/auth-otp.spec.ts src/modules/auth/tests/phone-login.spec.ts src/modules/auth/tests/login-identifier.spec.ts` từ thư mục backend. Test không chứng minh 2FA đăng nhập đã có và không thay thế kiểm tra sơ đồ.

Đã parse XML, đối chiếu review/paste/drawio, đếm lớp và thông điệp, kiểm tra tọa độ, bội số, kiểu gọi/trả về, nhãn trong suốt và tràn chữ; render và xem cả hai PNG. PNG lấy từ geometry chung, không phải export trực tiếp diagrams.net. Không sửa mã ứng dụng, không đọc `.env`, không gọi API thật, không gửi OTP/email thật và không ghi database.
