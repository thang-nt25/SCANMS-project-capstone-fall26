# FR-12 - Gán mã giảm giá riêng cho KOL

Sequence đã đổi theo ảnh mẫu: chỉ dùng participant, lifeline, activation và mũi tên; phần chính là luồng thành công, bước có điều kiện ghi ngay trên nhãn. Các lỗi/giải thích chi tiết được giữ trong tài liệu này và chú thích cuối trang, không dùng khung ngang ref/break.

Đối chiếu code hiện tại ngày 2026-10-16. Có hai file draw.io riêng: class diagram rộng và sequence diagram gộp một trang (đề xuất → duyệt → áp dụng/đặt hàng). Sequence giữ riêng ba actor KOL, Shop Manager, Customer; các trang giao diện, controller và service được nhóm theo vai trò trên lifeline, tên thành phần cụ thể ghi ở cuối trang. Các nhãn chữ có nền trong suốt. Sơ đồ chỉ chọn thành phần liên quan coupon cá nhân KOL; không mở rộng sang toàn bộ hệ thống voucher, live, hoàn tiền và thanh toán hoa hồng.

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

`ShopCouponsPage.handleApproveSubmit` gọi `couponService.approveCoupon` với approveForm. Route PATCH `/api/stores/{storeId}/coupons/{id}/approve`, controller StoreCouponsController. Service verifyStoreAccess kiểm tra owner; SYSTEM_ADMIN/SYSTEM_MANAGER được phép và có hai ID demo được bypass owner check trong code.

Coupon phải thuộc Store và PENDING_APPROVAL. Chính sách bao gồm phần trăm/số tiền cố định, đơn tối thiểu, giảm tối đa, lượt tổng/mỗi khách, ngân sách, thời gian, phạm vi và cờ cộng dồn. DTO backend hỗ trợ productIds/categoryNames/date fields; sơ đồ thể hiện khả năng DTO, không khẳng định mọi trường đều có control nhập trong form Shop hiện tại.

Giá trị giảm phải dương; nếu phần trăm thì <=100. Kiểm tra thứ tự startsAt/expiresAt. Shop chỉ được SHOP_FUNDED; quyền platform/co-funding dành cho admin. Khi đồng tài trợ tổng tỷ lệ phải bằng 100.

Trong transaction: update chính sách, status ACTIVE, approvedBy/approvedAt; ghi phạm vi CouponProduct/CouponCategory khi phù hợp. Sau commit mới ghi COUPON_APPROVED và Notification cho KOL. Audit này không được rollback cùng chính sách nếu ghi audit sau commit thất bại. UI đóng form, tải lại danh sách sau thành công.

Các route reject, policy update, block, KOL pause/delete tồn tại và là tương tác riêng; class diagram chọn một số method liên quan, sequence không mở rộng mọi thao tác quản trị.

## 3. Khách áp dụng mã

`GuestCheckoutModal.handleValidateCoupon` gọi trực tiếp POST `/api/coupons/validate`, gửi code, target Store, customerPhone, items (product/variant/quantity/unitPrice tương thích) và các cờ cộng dồn. PublicCouponsController gọi CouponsService.validateCoupon, sau đó loại collaboratorId khỏi response công khai.

Service chuẩn hóa mã; giới hạn kiểm tra 10/phút theo session ID hoặc IP. Đọc coupon, Store, phạm vi và live session nếu có; kiểm tra trạng thái, thời gian, lượt tổng, ngân sách, giới hạn khách, phạm vi sản phẩm/danh mục/campaign, cộng dồn và đơn tối thiểu. Giá và sở hữu sản phẩm lấy lại từ DB; không tin unitPrice phía client. Biến thể cũng phải đúng sản phẩm.

Giảm phần trăm tính trên eligibleSubtotal, round và giới hạn maximumDiscountAmount. Giảm cố định tối đa eligibleSubtotal. Cả hai bị chặn bởi ngân sách còn lại và subtotal hợp lệ. Response nội bộ chứa couponId, code, collaboratorId, discount, scope result; response public bỏ collaboratorId. UI chỉ lưu code/discount và cập nhật tổng hiển thị; bước này không tăng usageCount và chưa ghi nhận đơn cho KOL. Có thể phát thông báo khi gần ngưỡng 80%.

Lưu ý mã hiện tại: recordValidationFailure dùng khóa coupon_lockout:{rateLimitKey}, trong khi checkRateLimit kiểm tra khóa coupon_lockout:coupon_val_{rateLimitKey}. Vì khác tiền tố, không coi cơ chế lockout lỗi liên tiếp là đã được chứng minh có hiệu lực; rate limit yêu cầu vẫn có riêng. Sơ đồ không khẳng định nhánh lockout này hoạt động đúng.

## 4. Tạo đơn và ghi nhận KOL

GuestCheckoutModal gửi POST `/api/orders`: đơn một Store gửi couponCode; đồng thời có couponsByStore cho cart nhiều Store. Sequence trang 03 dùng ví dụ một Store; controller/service coupon và order được ghép vào hai lifeline có tên rõ để giữ trang ngắn.

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
- Các component React và couponService object được phân biệt với NestJS classes và DTO; PrismaService được dùng trực tiếp, không có CouponRepository riêng.

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
