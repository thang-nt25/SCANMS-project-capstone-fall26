# FR-02 — Phân quyền RBAC Guard giữa Admin, Shop và KOL

Đối chiếu mã nguồn SCANMS ngày 2026-10-20. Hai hình dùng chung renderer và quy tắc trình bày của FR9: Arial, đen trắng, hộp lớp ba ngăn, đường nối vuông góc; sequence có actor, Browser, lifeline đứt, thanh thực thi và nhãn trong suốt. Tham khảo hình thức class/sequence trong Word đã đối chiếu ở các lượt trước; tên lớp và hành vi theo NestJS/Prisma hiện có.

## File sử dụng

- [Class — XML review](<review 2/FR02 - Class Diagram>) · [Drawio](diagrams/FR02_RBAC_Roles_Guard_Class_Diagram.drawio) · [PNG](diagrams/FR02_RBAC_Roles_Guard_Class_Diagram.png)
- [Sequence — XML review](<review 2/FR02 - Sequence Diagram>) · [Drawio](diagrams/FR02_RBAC_Roles_Guard_Sequence_Diagram.drawio) · [PNG](diagrams/FR02_RBAC_Roles_Guard_Sequence_Diagram.png)
- Chỉ dán `mxGraphModel` vào diagrams.net: [Class paste](diagrams/FR02_Class_Paste.xml), [Sequence paste](diagrams/FR02_Sequence_Paste.xml).
- [Đặc tả](diagrams/fr02-report-spec.json), [script tạo hình](diagrams/build-fr02-diagrams.cjs), [validator](diagrams/validate-fr02-diagrams.ps1). PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net.

## Hành vi thực tế

`@UseGuards(JwtAuthGuard, RolesGuard)` chạy xác thực trước, phân quyền sau. `JwtAuthGuard` kế thừa mixin `AuthGuard('jwt')`; Passport kiểm tra chữ ký và hạn Bearer token rồi gọi `JwtStrategy.validate(payload)`. Strategy tìm User theo `payload.sub`, lấy lại `role`, `isActive`, `isDeleted` cùng các trường tài khoản được chọn. User không tồn tại, bị khóa hoặc bị xóa bị từ chối với 401. Passport đặt User đã xác thực vào `request.user`.

`RolesGuard` thực hiện:

1. Gọi `reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()])`.
2. Nếu metadata không có hoặc mảng role rỗng, trả `true` ngay.
3. Với danh sách role có phần tử, đọc `request.user`; không có User thì ném `ForbiddenException` (403).
4. Kiểm tra `requiredRoles.includes(user.role)`; sai role thì ném 403, đúng thì trả `true`.

`@Roles(...roles)` là **hàm decorator** gọi `SetMetadata('roles', roles)`, không phải lớp ứng dụng hoặc bảng phân quyền. Metadata ở phương thức ghi đè metadata controller, không cộng hai danh sách. Guard dùng role của User vừa đọc từ database; việc chọn workspace trên UI hoặc giá trị role cũ trong JWT không thay thế bước này. Không có phân cấp role hay nhánh mặc định cho Admin vượt mọi endpoint.

Guard không tự xác thực, không truy vấn database, không kiểm tra Store owner, KYC hoặc bảng permission. Guard được gắn tại từng controller/phương thức; không suy rộng thành mọi API trong hệ thống đều được bảo vệ bởi `RolesGuard`.

## Ma trận ví dụ từ controller hiện có

Các đường dẫn dưới đây có prefix `/api`. Đây là quyền đi qua `RolesGuard`; service vẫn có thể từ chối theo dữ liệu và chính sách.

| Endpoint | Metadata hiệu lực | Admin / quản lý hệ thống | Shop | KOL |
| --- | --- | --- | --- | --- |
| `POST /admin/coupons` | `AdminCouponsController`: `SYSTEM_ADMIN`, `SYSTEM_MANAGER` | Được qua guard | 403 | 403 |
| `POST /collaborator/coupons` | `CollaboratorCouponsController`: `COLLABORATOR` | 403 | 403 | Được qua guard |
| `GET /stores/:storeId/coupons` | `StoreCouponsController`: `SHOP_MANAGER`, `SYSTEM_ADMIN`, `SYSTEM_MANAGER` | Được qua guard | Được qua guard | 403 |
| `POST /stores/:storeId/coupons` | Phương thức `createStoreCoupon`: `SHOP_MANAGER` | 403 | Được qua guard | 403 |
| `PATCH /stores/:storeId/coupons/:id/approve` | Phương thức `approveCoupon`: `SHOP_MANAGER` | 403 | Được qua guard | 403 |

Schema còn có `CUSTOMER`; không bỏ enum này để biến mô hình thành chỉ ba role. CUSTOMER bị chặn ở các ví dụ trên, có các endpoint coupon riêng dành cho khách hàng.

## Phạm vi hai hình

Class có **11 lớp/enum**: `StoreCouponsController`, `CouponsService`, `PrismaService`, `PrismaClient`, `JwtAuthGuard`, `RolesGuard`, `Reflector`, `JwtStrategy`, `User`, `UserRole`, `Store`. Cột giữa giữ Controller → Service → PrismaService như FR9; guard và lớp hỗ trợ ở trái, User/enum/Store ở phải, PrismaClient phía dưới trái. `User` sở hữu nhiều Store qua `Store.ownerId`: `1` — `0..*`.

Chỉ vẽ các thành viên liên quan. `Reflector` là lớp thư viện thật; `RolesGuard implements CanActivate` được ghi trong scope. Bỏ chi tiết các base class framework của JWT, `CacheService`, DTO và nghiệp vụ coupon để tránh làm hình RBAC quá rộng. Quan hệ `JwtAuthGuard` → `JwtStrategy` ghi **via Passport**, là phụ thuộc qua framework, không phải thuộc tính inject trực tiếp. `RolesGuard` → `User` ghi `request.user`, không phải truy vấn ORM hay thuộc tính giữ User. Enum `UserRole` không phải model database độc lập.

Sequence có **7 participant, 20 thông điệp**. Ví dụ cụ thể là request duyệt coupon của Shop. Thứ tự là Browser → NestJS request pipeline → JwtAuthGuard → RolesGuard → controller. Reflector hiện rõ cách lấy metadata và method override. `NestJS request pipeline` đại diện xử lý framework trước controller, không phải lớp mới của dự án.

Các self-message ở JwtAuthGuard **tóm tắt** ủy quyền sang Passport, JwtStrategy và Prisma; không khẳng định guard tự gọi database. Chi tiết này đã thể hiện quan hệ trong class. Controller gọi `CouponsService.approveCoupon()`; tương tác nội bộ service được lược và dẫn sang FR12. Kết quả thành công chỉ xuất hiện khi service đã hoàn tất. Với request bị từ chối, các thông điệp phía sau điểm lỗi không chạy; 401/403 được xử lý qua exception handling của NestJS. Các điều kiện dừng ghi ngay trên hình và note, không thêm khung `alt` để giữ kiểu vẽ đã thống nhất.

Sau RBAC, `CouponsService.approveCoupon()` kiểm tra lại `SHOP_MANAGER`, gọi `verifyStoreAccess()`, tìm Store và đối chiếu `ownerId === userId`. Sai chủ Shop trả 403; không tồn tại Store trả 404. Helper `verifyStoreAccess()` có nhánh cho Admin/Manager, nhưng riêng approve đã chặn các role đó trước cả guard lẫn đầu service. Không được diễn giải nhánh helper thành Admin có thể duyệt coupon Shop. Chính sách giảm giá, transaction, audit sau transaction và thông báo xem [FR12](FR12_CODE_ANALYSIS.md).

Frontend `RoleGuard` kiểm soát điều hướng workspace dựa trên tài khoản/profile/Store; backend kiểm tra API độc lập theo role trong User. FR9 dùng `StoreOwnerGuard` riêng, nên chỉ kế thừa hình thức vẽ của FR9, không đổi guard của FR9 thành `RolesGuard`.

## Mã nguồn đối chiếu

| Nội dung | Nguồn |
| --- | --- |
| Kiểm tra role và method override | [roles.guard.ts](../backend/src/common/guards/roles.guard.ts), [roles.decorator.ts](../backend/src/common/decorators/roles.decorator.ts) |
| Xác thực JWT và lấy lại User | [jwt-auth.guard.ts](../backend/src/common/guards/jwt-auth.guard.ts), [jwt.strategy.ts](../backend/src/common/strategies/jwt.strategy.ts) |
| Metadata Admin, Shop, KOL | [coupons.controller.ts](../backend/src/modules/coupons/coupons.controller.ts) |
| Kiểm tra chủ Store và duyệt coupon | [coupons.service.ts](../backend/src/modules/coupons/coupons.service.ts) |
| UserRole, User, Store và ownerId | [schema.prisma](../backend/prisma/schema.prisma) |
| Trang Shop và request PATCH | [ShopCouponsPage.tsx](../frontend/src/pages/merchant/ShopCouponsPage.tsx), [coupon.service.ts](../frontend/src/services/coupon.service.ts), [api.ts](../frontend/src/services/api.ts) |
| Quyền điều hướng UI | [RoleGuard.tsx](../frontend/src/routes/RoleGuard.tsx) |
| Guard riêng FR9 | [store-owner.guard.ts](../backend/src/modules/commission-rules/guards/store-owner.guard.ts) |
| Ma trận role và quyền nghiệp vụ | [voucher-permissions.spec.ts](../backend/src/modules/coupons/tests/voucher-permissions.spec.ts) |

Đã kiểm tra thêm implementation NestJS/Passport đang cài trong `backend/node_modules`: guard chạy tuần tự trước controller; Passport gán `request.user` sau callback xác thực; Reflector lấy metadata đầu tiên được định nghĩa. Không đưa các lớp framework giả vào code ứng dụng.

## Tạo lại và kiểm tra

```powershell
node docs/diagrams/build-fr02-diagrams.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR02_RBAC_Roles_Guard
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Sequence -FeatureStem FR02_RBAC_Roles_Guard
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/validate-fr02-diagrams.ps1
```

Đã chạy bộ test unit có mock từ thư mục `backend`: `npm test -- --runTestsByPath src/modules/coupons/tests/voucher-permissions.spec.ts`: **24/24 test đạt**. Test dùng RolesGuard thật, Reflector thật và metadata controller thật để kiểm tra cả năm role; các phần service dùng mock. Đây không phải kiểm thử HTTP hoặc tích hợp với database thật. Thay đổi chỉ tạo sơ đồ/tài liệu; không sửa logic RBAC của dự án.
