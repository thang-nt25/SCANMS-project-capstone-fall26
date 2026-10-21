# FR-12 - Gán mã giảm giá riêng cho KOL

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. **Bản báo cáo rút gọn hiện tại: 9 lớp/model, 26 thông điệp sequence.** Hai hình dùng đen trắng, class ba ngăn và `+`/`-`, connector có source/target thật và bội số đúng schema; sequence có actor, lifeline, activation và mũi tên, không có khung bao/chia nhánh. Điều kiện ghi trên nhãn. Phong cách theo FR9 và mẫu Word đã tham khảo.

KOL đề xuất mã PENDING_APPROVAL và Shop sở hữu duyệt chính sách thành ACTIVE. Các request preview và đặt đơn không mở rộng trong hình; phần dưới vẫn mô tả validation, redemption và ưu tiên KOL coupon, liên hệ với FR16.

Các lớp/model được vẽ: `CollaboratorCouponsController`, `CouponsService`, `StoreCouponsController`, `PrismaService`, `User`, `Store`, `Coupon`, `StoreCollaborator`, `PrismaClient`. Chỉ chọn thành viên liên quan; model không có phương thức tự khai báo giữ ngăn operation trống. Không dựng Repository/UnitOfWork hoặc service giả. PrismaService kế thừa PrismaClient trong mã và được vẽ bằng tam giác rỗng hướng tới hộp PrismaClient ở phía dưới bên trái, giống FR9.

Hai XML không có đuôi mở rộng: `docs/review 2/FR12 - Class Diagram` và `docs/review 2/FR12 - Sequence Diagram`. Bản `.drawio`, `.scene.json`, PNG có tiền tố `FR12_Assign_Personal_Coupon` trong `docs/diagrams`; XML để dán là `FR12_Class_Paste.xml` và `FR12_Sequence_Paste.xml`. PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Bản chi tiết cũ, gồm tài liệu mô tả hình cũ, được lưu tại `docs/diagrams/archive/FR12_detailed`.

## 1. KOL đề xuất mã

`KolCouponsPage.fetchApprovedStores` gọi trực tiếp api.get `/collaborator/coupons/eligible-stores`; đây không phải method của couponService. Danh sách dựa trên StoreCollaborator APPROVED, Store chưa xóa, có commission rule active chưa xóa hoặc defaultCommissionRate > 0.

`handleProposeSubmit` gửi storeId và code đã trim/uppercase qua `couponService.proposeCoupon`. KOL chỉ đề xuất tên mã, chưa quyết định chính sách giảm giá. UI kiểm tra 4-20 ký tự Latin/số, có ít nhất một chữ và không chứa từ khóa cấm. Backend CreateCouponDto còn nhận campaignId tùy chọn, nhưng form KOL hiện không gửi.

`CollaboratorCouponsController.proposeCoupon` lấy collaboratorId từ JWT, yêu cầu COLLABORATOR qua JwtAuthGuard/RolesGuard. DTO validation chạy trước controller. Service thực hiện:

1. Rate limit 5 yêu cầu/phút và 20/ngày/KOL.
2. Chuẩn hóa/kiểm tra mã và từ khóa cấm.
3. Kiểm tra User tồn tại, active và không isDeleted; Store tồn tại và không isDeleted.
4. StoreCollaborator phải APPROVED; phải có rule hoa hồng active chưa xóa hoặc defaultCommissionRate dương.
5. Quota/KOL: tối đa 5 pending/Shop, 20 pending toàn hệ thống, 10 ACTIVE/Shop, 100 ACTIVE toàn hệ thống.
6. codeNormalized duy nhất toàn hệ thống, bao gồm mã đã soft-delete (không tái sử dụng tên mã).
7. Tạo Coupon PENDING_APPROVAL, lưu collaboratorId và storeId; ghi AuditLog COUPON_PROPOSED; tạo Notification cho Store.ownerId.

Ba thao tác tạo coupon, audit, notification không nằm trong transaction chung. Audit lỗi có thể xảy ra sau khi coupon đã được tạo; helper notification catch/log lỗi. Response thành công là 201, UI đóng modal sau khoảng 500ms và tải lại danh sách. Không cần tạo referral link hoặc QR để đề xuất mã.

Không suy diễn kiểm tra KYC trong proposeCoupon: luồng này kiểm tra quan hệ hợp tác; khác với Open Offer FR-10. Comment nói Store active, nhưng điều kiện hiện tại ở proposeCoupon chỉ kiểm tra tồn tại/isDeleted, không kiểm tra store.isActive.

## 2. Shop phê duyệt chính sách

`ShopCouponsPage.handleApproveSubmit` gọi `couponService.approveCoupon` với approveForm. Route PATCH `/api/stores/{storeId}/coupons/{id}/approve`, controller StoreCouponsController. **Code hiện tại chỉ cho SHOP_MANAGER duyệt đề xuất KOL**, cả ở metadata method và đầu approveCoupon. verifyStoreAccess yêu cầu store.ownerId khớp userId; không còn hai ID demo bypass owner. Helper verifyStoreAccess dùng ở route khác vẫn có nhánh admin, nhưng approveCoupon đã từ chối vai trò admin trước khi gọi helper.

Coupon phải thuộc Store và PENDING_APPROVAL. Chính sách bao gồm phần trăm/số tiền cố định, đơn tối thiểu, giảm tối đa, lượt tổng/mỗi khách, ngân sách, thời gian, phạm vi và cờ cộng dồn. DTO backend hỗ trợ productIds/categoryNames/date fields; tài liệu ghi nhận khả năng DTO, không khẳng định mọi trường đều có control nhập trong form Shop hiện tại. Bản hình chỉ chọn các thuộc tính chính của Coupon.

Giá trị giảm phải dương; nếu phần trăm thì <=100. Kiểm tra thứ tự startsAt/expiresAt. Nhánh duyệt coupon KOL này bắt buộc SHOP_FUNDED, shopFundingRate = 100, platformFundingRate = 0; cấm PLATFORM_FUNDED/CO_FUNDED. Voucher Sàn được phát hành qua luồng khác. Nếu scope CAMPAIGN thì kiểm tra chiến dịch cùng Store, active và chưa hết hạn. Code hiện tại ghi stackableWithShopVoucher=false và stackableWithPlatformVoucher=true khi đề xuất/duyệt, dù DTO còn các trường lựa chọn tương ứng.

Trong transaction: updateCurrentCoupon dùng điều kiện id/status/fundingSource/updatedAt để chống ghi đè thay đổi đồng thời; update chính sách, status ACTIVE, approvedBy/approvedAt; ghi phạm vi CouponProduct/CouponCategory khi phù hợp. Xung đột P2025 được chuyển thành 409. Sau commit mới ghi COUPON_APPROVED và Notification cho KOL. Audit này không được rollback cùng chính sách nếu ghi audit sau commit thất bại. UI đóng form, tải lại danh sách sau thành công.

Các route reject, policy update, block, KOL pause/delete tồn tại và là tương tác riêng; class diagram chọn một số method liên quan, sequence không mở rộng mọi thao tác quản trị.

## 3. Khách áp dụng mã

`GuestCheckoutModal.handleValidateCoupon` gọi trực tiếp POST `/api/coupons/validate`, gửi code, target Store, customerPhone, items (product/variant/quantity/unitPrice tương thích) và các cờ cộng dồn. PublicCouponsController gọi CouponsService.validateCoupon, sau đó loại collaboratorId khỏi response công khai.

Service chuẩn hóa mã; giới hạn kiểm tra 10/phút theo session ID hoặc IP. Đọc coupon, Store, phạm vi và live session nếu có; kiểm tra trạng thái, thời gian, lượt tổng, ngân sách, giới hạn khách, phạm vi sản phẩm/danh mục/campaign, cộng dồn và đơn tối thiểu. Giá và sở hữu sản phẩm lấy lại từ DB; không tin unitPrice phía client. Biến thể cũng phải đúng sản phẩm.

Giảm phần trăm tính trên eligibleSubtotal, round và giới hạn maximumDiscountAmount. Giảm cố định tối đa eligibleSubtotal. Cả hai bị chặn bởi ngân sách còn lại và subtotal hợp lệ. Response nội bộ chứa couponId, code, collaboratorId, discount, scope result; response public bỏ collaboratorId. UI chỉ lưu code/discount và cập nhật tổng hiển thị; bước này không tăng usageCount và chưa ghi nhận đơn cho KOL. Có thể phát thông báo khi gần ngưỡng 80%.

Lưu ý mã hiện tại: recordValidationFailure dùng khóa coupon_lockout:{rateLimitKey}, trong khi checkRateLimit kiểm tra khóa coupon_lockout:coupon_val_{rateLimitKey}. Vì khác tiền tố, không coi cơ chế lockout lỗi liên tiếp là đã được chứng minh có hiệu lực; rate limit yêu cầu vẫn có riêng. Sơ đồ không khẳng định nhánh lockout này hoạt động đúng.

## 4. Tạo đơn và ghi nhận KOL

GuestCheckoutModal gửi POST `/api/orders`: đơn một Store gửi couponCode; đồng thời có couponsByStore cho cart nhiều Store. Phần dưới mô tả ví dụ một Store trong mã; bản hình rút gọn FR12 dừng ở phê duyệt mã, còn request đặt đơn được thể hiện ở FR16. OrdersController còn chạy giới hạn tần suất tạo đơn, lấy ngữ cảnh cookie/IP và xử lý danh tính trước lời gọi createOrder; sơ đồ tập trung phần xử lý coupon bên trong luồng đơn.

OrdersController.createOrder gọi OrdersService.createOrder. Server prevalidate coupon bằng CouponsService.validateCoupon. Trong order transaction, executeStoreOrderInTransaction khóa coupon SELECT ... FOR UPDATE, đọc lại coupon và kiểm tra status/dates/scope/usage/budget/customer limit, tính lại giảm giá. Cập nhật usageCount/budgetUsed và lưu Order, CouponRedemption USED cùng transaction. Lỗi trong transaction rollback các ghi dữ liệu liên quan; không tiêu quota ở bước preview trước đó.

Nếu couponValidationResult có collaboratorId: attributedCollaboratorId = coupon owner, attributionMethod COUPON, confidence HIGH. Coupon ưu tiên hơn candidate cookie/fingerprint; ghi overrideReason/original collaborator khi cần. Link click/QR trước đó không bắt buộc. ReferralLinkId trong đơn có thể vẫn đến từ cookie/fingerprint; không nên kết luận nó nhất thiết thuộc cùng KOL như coupon.

Order lưu couponId, couponCodeSnapshot, couponDiscountAmount và thông tin attribution. CouponRedemption lưu snapshot discount, eligible subtotal, phân bổ tài trợ, KOL/Store và trạng thái USED. Việc ghi USED xảy ra khi tạo đơn, chưa đồng nghĩa đơn đã thanh toán hay KOL đã được trả hoa hồng.

## 5. Class diagram và quan hệ

- Coupon thuộc đúng một User cộng tác viên và một Store; có Campaign tùy chọn. codeNormalized unique toàn hệ thống.
- Order có Coupon tùy chọn; một Coupon có nhiều Order.
- CouponRedemption.orderId unique: mỗi Order có tối đa một CouponRedemption; một Coupon có nhiều redemptions.
- CouponProduct nối Coupon-Product; CouponCategory lưu categoryName, không FK Category.
- CouponRedemption.collaboratorId/storeId/customerId là scalar/indexed theo schema; chỉ coupon/order có @relation tại model này. Sơ đồ không bịa FK cho chúng.
- AuditLog và Notification tham chiếu User; couponId trong details/data là JSON, không FK Coupon.
- Class bản báo cáo chọn chín khối: CollaboratorCouponsController, StoreCouponsController, CouponsService, PrismaService, PrismaClient, User, Store, StoreCollaborator và Coupon. DTO, enum, CacheService và các model đặt đơn không mở rộng thành hộp; thành viên được chọn theo phạm vi đề xuất/duyệt mã.
- Trong schema, User → Order theo attributedCollaborator có multiplicity 0..1 ở User và 0..* ở Order; các cột coupon/attribution có thể null. Những quan hệ đặt đơn và enum này được giải thích trong văn bản, không mở rộng trong class bản báo cáo FR12.

## 6. Nguồn đối chiếu

- frontend/src/pages/collaborator/KolCouponsPage.tsx
- frontend/src/pages/merchant/ShopCouponsPage.tsx
- frontend/src/components/checkout/GuestCheckoutModal.tsx
- frontend/src/services/coupon.service.ts
- backend/src/modules/coupons/coupons.controller.ts
- backend/src/modules/coupons/coupons.service.ts
- backend/src/modules/coupons/dto/create-coupon.dto.ts
- backend/src/modules/coupons/dto/approve-coupon.dto.ts
- backend/src/modules/coupons/dto/validate-coupon.dto.ts
- backend/src/modules/orders/orders.controller.ts
- backend/src/modules/orders/orders.service.ts
- backend/prisma/schema.prisma

Tái tạo: `node docs/diagrams/build-fr12-diagrams.cjs`.

Entry point gọi `build-report-diagrams.cjs` với đặc tả `fr12-report-spec.json`, dùng helper UML của FR9. Render preview: `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR12_Assign_Personal_Coupon` (đổi Class thành Sequence cho hình còn lại). PNG là preview từ geometry, không phải export trực tiếp diagrams.net.

Kiểm chứng ngày 2026-10-19: test hiện có `coupons.service.spec.ts` và `voucher-permissions.spec.ts` đều passed, **47 tests / 2 suites**. Các test này kiểm chứng service coupon và quyền, không khẳng định bao phủ toàn bộ order transaction hoặc chứng minh UML hoàn hảo. Đã kiểm tra XML, ID, terminal, một diagram mỗi file, class ba ngăn, sequence không có khung bao/chia nhánh, bản review/paste trùng nội dung và xem ảnh render. Không sửa code nghiệp vụ hay đọc/sửa `.env`, không tạo coupon/đơn thật trên web.

## Kiểm tra bản báo cáo rút gọn

Tái tạo: `node docs/diagrams/build-fr12-diagrams.cjs` hoặc `node docs/diagrams/build-report-diagrams.cjs 12`. Đặc tả nằm trong `fr12-report-spec.json`; bộ bố cục dùng `report-uml-layout.cjs` và helper UML của FR9.

Kiểm tra 9 cặp ngăn class, 26 thông điệp, một trang mỗi file, ID/tham chiếu, giới hạn canvas, đường nối không xuyên lớp hoặc chồng đoạn thẳng cùng hướng; render/xem hai PNG và kiểm tra tràn chữ. Review và XML paste phải khớp bản gốc. Chỉ thay sơ đồ/tài liệu, không thay logic ứng dụng. Kết quả unit test bên trên thuộc lượt đối chiếu trước; không chạy lại test nghiệp vụ cho lần rút gọn này.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR12_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR12_before_word_class_alignment`, `FR12_before_fr09_sequence_layout` và `FR12_compact_before_fr09_layout`.
