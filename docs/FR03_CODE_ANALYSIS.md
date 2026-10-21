# FR-03 — Nộp và duyệt hồ sơ tài chính KYC

Đối chiếu mã nguồn SCANMS hiện tại ngày 2026-10-20. Class và sequence dùng chung bộ hình/renderer của FR9, FR01–FR02: Arial, trắng đen, class ba ngăn, đường nối vuông góc, lifeline đứt, thanh thực thi và nhãn trong suốt. Giữ cách trình bày đã đối chiếu với hình Word; tên lớp và hành vi theo NestJS/Prisma của dự án.

## File sử dụng

- [Class — XML review](<review 2/FR03 - Class Diagram>) · [Drawio](diagrams/FR03_Financial_KYC_Submission_Review_Class_Diagram.drawio) · [PNG](diagrams/FR03_Financial_KYC_Submission_Review_Class_Diagram.png)
- [Sequence — XML review](<review 2/FR03 - Sequence Diagram>) · [Drawio](diagrams/FR03_Financial_KYC_Submission_Review_Sequence_Diagram.drawio) · [PNG](diagrams/FR03_Financial_KYC_Submission_Review_Sequence_Diagram.png)
- Chỉ dán `mxGraphModel`: [Class paste](diagrams/FR03_Class_Paste.xml), [Sequence paste](diagrams/FR03_Sequence_Paste.xml).
- [Đặc tả](diagrams/fr03-report-spec.json), [script tạo hình](diagrams/build-fr03-diagrams.cjs), [validator](diagrams/validate-fr03-diagrams.ps1).
- PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net.

## Quyền Shop: yêu cầu và trạng thái triển khai

**Backend có API KYC cũ cho Shop duyệt**, gồm `GET /api/kyc/admin/pending` và `PATCH /api/kyc/admin/:id/review`. Hai API cho phép `SHOP_MANAGER`, `SYSTEM_ADMIN`, `SYSTEM_MANAGER`.

**Trang dùng chung chưa khớp các API này:** route `/merchant/kyc-approval` dùng `KycApprovalPage`, nhưng trang tải dữ liệu bằng `getUpgradeApplications()` và duyệt KOL bằng `reviewKolApplication()`. Chúng gọi `/api/kyc/admin/applications` và `/api/kyc/admin/kol/:id/review`, chỉ cho phép Admin/Quản lý hệ thống. Tài khoản có role `SHOP_MANAGER` bị `RolesGuard` từ chối 403 ở cả hai lời gọi đó. Frontend có hàm `getPendingKyc()` và `reviewKyc()` cho API cũ, nhưng trang duyệt hiện không dùng chúng.

Vì vậy sequence vẽ **luồng UI thành công bằng Admin/Manager**; quyền Shop ở API cũ và khoảng lệch UI được ghi trực tiếp trong subtitle, scope và note. Không vẽ một luồng Shop bấm duyệt thành công bằng API mà role này bị chặn. Đây là tài liệu phản ánh hiện trạng; lượt này không sửa ứng dụng.

| API (prefix `/api`) | Phương thức controller | Quyền hiện có |
| --- | --- | --- |
| `GET /kyc/profile` | `getMyKyc(userId)` | JWT; không khai báo `@Roles` |
| `PUT /kyc/submit` | `submitKyc(userId, dto)` | JWT; không khai báo `@Roles` |
| `GET /kyc/admin/pending` | `getPendingKyc()` | Shop / Admin / Manager |
| `PATCH /kyc/admin/:id/review` | `reviewKyc(profileId, dto)` | Shop / Admin / Manager |
| `GET /kyc/admin/applications` | `getUpgradeApplications()` | Admin / Manager |
| `PATCH /kyc/admin/kol/:id/review` | `reviewKolApplication(profileId, dto)` | Admin / Manager |
| `PATCH /kyc/admin/shop/:id/review` | `reviewShopApplication(reviewerId, storeId, dto)` | Admin / Manager; duyệt mở Shop riêng |

`KycController` dùng `JwtAuthGuard` rồi `RolesGuard`. Không có `@Roles` cho `profile`/`submit` nghĩa là RolesGuard không giới hạn vai trò ở đó; vẫn phải qua JWT. Không khẳng định chỉ KOL mới gọi được hai API này. API danh sách KYC cũ lọc `idCardNumber != null`, không lọc riêng `UNVERIFIED` và không giới hạn theo một Store. API review cũ cũng nhận profile ID, không có store ID hay kiểm tra quan hệ Shop–KOL. Không tạo association Store–CollaboratorProfile giả trong class.

## Dữ liệu tài chính và ảnh định danh

| Dữ liệu | Nơi lưu / hành vi |
| --- | --- |
| Số CCCD, mã số thuế | `CollaboratorProfile.idCardNumber`, `taxCode` |
| Ngân hàng, số tài khoản, chủ tài khoản | `bankName`, `bankAccountNumber`, `bankAccountName`; tên chủ tài khoản được trim và viết hoa |
| Ảnh CCCD trước/sau | `socialLinksJson.frontCardUrl`, `backCardUrl`; không có hai cột URL riêng trong schema |
| Thời điểm nộp và thông tin kênh | Metadata JSON có `submittedAt`, platform, tên/URL kênh, số follower và ảnh chứng minh nếu cung cấp |
| Trạng thái KYC | `UNVERIFIED`, `VERIFIED`, `REJECTED` |
| Số dư ví | Model `Wallet`, liên kết với **User** bằng `collaboratorId`; không phải nơi chứa số tài khoản ngân hàng |
| Kết quả duyệt | Notification lưu trong database: `KOL_APPROVED` hoặc `KOL_REJECTED`; không vẽ push thời gian thực hoặc email không có trong method |

`ImageUploadDropzone` gọi `uploadService.uploadImage()` → `POST /api/upload/image` → `CloudinaryService`. Nếu upload lỗi, component có fallback `FileReader.readAsDataURL()` và truyền Data URL vào form. KYC nhận chuỗi tham chiếu ảnh đã chuẩn bị, không nhận multipart file ở `PUT /kyc/submit`. Luồng upload độc lập được lược trong sequence, không dựng thêm lời gọi upload từ `KycService`.

Form `KycSubmissionPage` kiểm tra kênh, CCCD, mã số thuế, ngân hàng và đủ hai ảnh; kiểm tra CCCD trong submit handler là chuỗi không rỗng, dài ít nhất 9, không tự suy thành xác minh số CCCD hợp lệ. `SubmitKycDto` bắt buộc chuỗi không rỗng cho CCCD/MST/hai ảnh nhưng **bank fields là optional**, không có kiểm tra URL ảnh bằng `@IsUrl`. Service kiểm tra thêm hai chuỗi ảnh sau trim. Không vẽ tích hợp tra cứu căn cước, thuế hoặc xác minh chủ tài khoản ngân hàng vì luồng KYC hiện không gọi các dịch vụ đó.

## Luồng nộp hồ sơ

1. KOL nhập thông tin và chuẩn bị ảnh trên `KycSubmissionPage`, rồi gửi `PUT /api/kyc/submit`.
2. Controller lấy `userId` từ JWT, gọi `KycService.submitKyc()`.
3. Service yêu cầu đủ hai tham chiếu ảnh, đọc profile theo `userId`, chuẩn hóa các trường và gộp metadata cũ với metadata mới.
4. Không có profile: `create()` với `UNVERIFIED`. Có profile: `update()`; **VERIFIED vẫn giữ VERIFIED**, các trạng thái khác về UNVERIFIED. Không vẽ mọi lần sửa CCCD/ngân hàng đều bắt buộc tái duyệt.
5. Nếu có platform và channel URL, service tìm kênh xã hội theo User/platform rồi update/create; thao tác này được await sau ghi profile. Có thể lưu profile xong nhưng đồng bộ kênh lỗi; không có transaction bao hai nhóm ghi.
6. Trả message/profile, UI báo thành công rồi tải lại profile và account. `UNVERIFIED` kèm hồ sơ đã nộp được UI hiển thị chờ thẩm định; schema không có trạng thái `PENDING` cho KYC.

Sequence mở rộng nhánh **đã có profile UNVERIFIED của COLLABORATOR** và đã có Wallet, phù hợp màn hình cập nhật KYC của KOL. Nhánh tạo profile và các request tải lại được ghi note, không thay bằng lời gọi `upsert()` giả. Luồng khách hàng xin nâng cấp KOL dùng `POST /kyc/upgrade/kol`/`applyKolUpgrade()` riêng: upsert profile, reset UNVERIFIED, yêu cầu hai ảnh và ít nhất một kênh. Nó không phải endpoint nộp tài chính đang mở rộng trong hình.

## Luồng duyệt hiện tại

`KycApprovalPage` dùng TanStack Query để gọi `getUpgradeApplications()`. Service dùng `Promise.all` lấy toàn bộ profile kèm User/tier/kênh và Store chưa xóa, không ở DRAFT. Phân loại pending trên UI dùng `kycStatus`; API tổng hợp không chỉ trả hồ sơ chờ duyệt.

Sau khi người duyệt xem CCCD/MST/ngân hàng, UI gọi `PATCH /kyc/admin/kol/:id/review` với `VERIFIED`. Service:

1. Đọc profile cùng User; thiếu profile trả 404.
2. Ghi trạng thái VERIFIED hoặc REJECTED.
3. Nếu VERIFIED và User hiện là CUSTOMER, đổi role thành COLLABORATOR; không đổi mọi role khác thành KOL.
4. Nếu VERIFIED, tìm Wallet theo User, chỉ tạo ví số dư 0 nếu chưa có. Hình mở rộng trường hợp ví đã tồn tại, không ghi phát sinh một ví mới cho mỗi lần duyệt.
5. Tạo Notification tương ứng và trả kết quả. UI invalidate danh sách, đóng modal, báo thành công. Người nộp nhận thông báo qua các luồng tải Notification riêng, không có return HTTP từ request của Admin sang Browser KOL.

Các ghi ở `reviewKolApplication()` là **tuần tự, không có `$transaction` hoặc AuditLog duyệt KOL**. Không vẽ BEGIN/COMMIT/ROLLBACK, không gán tính nguyên tử cho việc cập nhật trạng thái, role, Wallet và Notification. Method cũng không có điều kiện chỉ cho duyệt hồ sơ UNVERIFIED; duyệt lại có thể tạo thêm Notification. Rejection không tự thu hồi role hoặc xóa ví đã có.

API cũ `reviewKyc()` chỉ chuyển tiếp sang `reviewKolApplication()`: VERIFIED giữ nguyên, các giá trị khác của `KycStatus` thành REJECTED; **không chuyển tiếp `dto.note`**. Vì DTO cũ cho cả enum, gửi UNVERIFIED vào review cũ cũng trở thành REJECTED. UI hiện chỉ gửi VERIFIED/REJECTED qua API mới. Không thêm trường `reviewerId`, `approvedBy` hoặc lý do từ chối đã lưu vào profile nếu source không có.

Đăng ký/duyệt mở gian hàng có `Store.onboardingStatus`, giấy phép và cơ chế ghi khác, nằm ngoài nhánh tài chính KOL đang mở rộng. Thông tin tự khai của người mua trong `CustomerIdentity` cũng không phải hồ sơ KYC được duyệt này.

## Phạm vi hình và nguồn đối chiếu

Class gồm **10 lớp/model**: KycController, KycService, PrismaService, PrismaClient, JwtAuthGuard, RolesGuard, User, CollaboratorProfile, Wallet, Notification. Giữ trục Controller → Service → PrismaService ở giữa; guard trái; model phải; PrismaClient dưới trái. Chỉ vẽ thành viên liên quan. DTO, Reflector, enum, Store, social channel và dịch vụ upload được giải thích trong tài liệu; không cần vẽ mọi model mà một delegate có thể truy cập.

Association đúng schema: User–CollaboratorProfile `1`–`0..1`, User–Wallet `1`–`0..1`, User–Notification `1`–`0..*`. Không nối Wallet trực tiếp với Profile như một khóa ngoại. Sequence có **6 participant, 37 thông điệp**; Browser là vai giao diện chung cho **hai phiên đăng nhập riêng** của KOL và Admin/Manager. Request và return dùng đúng loại mũi tên như FR9; các nhánh khác và chi tiết đã lược được ghi note.

| Nội dung | Mã nguồn |
| --- | --- |
| Endpoint và metadata role | [kyc.controller.ts](../backend/src/modules/kyc/kyc.controller.ts) |
| Nộp hồ sơ, danh sách và duyệt | [kyc.service.ts](../backend/src/modules/kyc/kyc.service.ts) |
| Ràng buộc dữ liệu | [submit-kyc.dto.ts](../backend/src/modules/kyc/dto/submit-kyc.dto.ts), [review-kyc.dto.ts](../backend/src/modules/kyc/dto/review-kyc.dto.ts), [apply-upgrade.dto.ts](../backend/src/modules/kyc/dto/apply-upgrade.dto.ts) |
| Schema và cardinality | [schema.prisma](../backend/prisma/schema.prisma) |
| Màn hình nộp | [KycSubmissionPage.tsx](../frontend/src/pages/collaborator/KycSubmissionPage.tsx) |
| Màn hình duyệt dùng chung | [KycApprovalPage.tsx](../frontend/src/pages/admin/KycApprovalPage.tsx), [AppRoutes.tsx](../frontend/src/routes/AppRoutes.tsx) |
| API adapter | [kyc.service.ts frontend](../frontend/src/services/kyc.service.ts) |
| Upload ảnh | [ImageUploadDropzone.tsx](../frontend/src/components/ui/ImageUploadDropzone.tsx), [upload.service.ts](../frontend/src/services/upload.service.ts), [upload.controller.ts](../backend/src/core/cloudinary/upload.controller.ts) |
| Test hiện có | [kyc.service.spec.ts](../backend/src/modules/kyc/tests/kyc.service.spec.ts) |

## Tạo lại và kiểm tra

```powershell
node docs/diagrams/build-fr03-diagrams.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR03_Financial_KYC_Submission_Review
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Sequence -FeatureStem FR03_Financial_KYC_Submission_Review
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/validate-fr03-diagrams.ps1
```

Đã chạy test có mock trong `backend`: `npm test -- --runTestsByPath src/modules/kyc/tests/kyc.service.spec.ts`: **6/6 test đạt**. Suite hiện có kiểm tra chủ yếu Shop onboarding và yêu cầu hai ảnh khi đăng ký KOL; không phải bằng chứng kiểm thử đầy đủ HTTP nộp/duyệt tài chính. Đã kiểm tra thêm RolesGuard/Reflector với metadata controller thật cho sáu method (`submitKyc`, pending, review cũ, applications, review KOL, review Shop) trên cả năm role; kết quả khớp bảng quyền phía trên.

Đã render và xem cả hai ảnh, kiểm tra tràn chữ, XML review/paste khớp drawio, cardinality và nhãn sequence. Không kết nối database, gửi ảnh/email hoặc sửa logic ứng dụng để tạo hình. Các sơ đồ FR01–FR02 và FR9–FR16 được giữ nguyên.
