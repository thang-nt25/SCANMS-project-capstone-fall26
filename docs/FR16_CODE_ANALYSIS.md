# FR-16 — Đặt hàng nhanh, tạo đơn và trừ tồn kho

Đối chiếu mã nguồn ngày 2026-10-16. Hai file riêng trong `docs/diagrams`: `FR16_Guest_Checkout_Class_Diagram.drawio` và `FR16_Guest_Checkout_Sequence_Diagram.drawio`. Generator `build-fr16-diagrams.cjs` tạo class trước, sequence sau. Mỗi file có một diagram; sequence một trang, tiếng Anh, trắng đen, không dùng khung ngang ref/alt. Các điều kiện/nhánh tùy chọn ghi trên mũi tên; chúng không phải các bước luôn thực hiện trong mọi request.

## 1. Khác biệt quan trọng so với tên Guest Checkout

Component hiện tên `GuestCheckoutModal`, nhưng **đặt hàng trên web hiện tại bắt buộc đăng nhập**. Frontend kiểm tra currentUser/token khi submit, có mandatory auth gate và GoogleOfficialButton. Backend `OrdersController.createOrder` tại POST `/api/orders` có `JwtAuthGuard`, ghi đè dto.customerId từ userId trong JWT, không tin customerId do trình duyệt gửi.

Vì vậy sơ đồ mô tả form mua nhanh yêu cầu xác thực, không vẽ khách chưa đăng nhập vẫn tạo đơn thành công. Schema Order.customerId nullable không có nghĩa endpoint hiện cho phép anonymous checkout. `POST /orders/validate-cart` không có JwtAuthGuard ở method này; mở form/kiểm tra giỏ khác với quyền tạo đơn.

Nguồn chính: `frontend/src/components/checkout/GuestCheckoutModal.tsx`, `backend/src/modules/orders/orders.controller.ts`, `orders.service.ts`, `dto/create-order.dto.ts`.

## 2. Form và kiểm tra trước khi đặt

Modal nhận một product/store từ trang sản phẩm hoặc checkoutItems từ giỏ; có variantId, initialQuantity, initialCouponCode. Nó nhóm hàng theo Shop và có các trường tên, điện thoại, email tùy chọn, địa chỉ chi tiết, tỉnh/huyện/xã, ghi chú, voucher, chấp nhận chính sách, phương thức thanh toán.

Khi mở form:

- Điền thông tin người dùng/sổ địa chỉ nếu có; có cache địa chỉ trong localStorage.
- Tạo idempotencyKey mới cho lần mở modal; giữ key cho các lần thử lại trong cùng lần mở.
- Gọi `/orders/validate-cart` với productId, variantId, quantity, clientPrice để nhận cảnh báo giá/tồn/tính khả dụng. Đây là precheck; không giữ hàng và không thay thế kiểm tra backend lúc tạo đơn.
- `loadShippingAddresses` từ order-address.service tải cấu trúc tỉnh/huyện/xã bằng fetch tới nguồn địa chỉ cấu hình; mặc định provinces.open-api.vn depth=3. Đây không phải API danh mục của OrdersController.
- Tải chính sách Shop và trạng thái khả dụng PayOS. Khi địa chỉ đủ, gọi `/shipping/ghn/quote-address` cho từng Shop để preview phí; weight tối thiểu 500g, quy đổi 500g mỗi sản phẩm.

Submit chặn khi chưa đăng nhập, coupon đang kiểm tra, PayOS chưa sẵn sàng, tên quá ngắn, điện thoại/email sai, thiếu địa chỉ hoặc tỉnh/huyện/xã, chưa tính được phí GHN, chưa tải/đồng ý chính sách, số lượng vượt tồn trên client. UI hiện lựa chọn **PAYOS hoặc WALLET**, mặc định PAYOS. Enum backend vẫn hỗ trợ COD và VIETQR; không vẽ COD là lựa chọn UI đang hiển thị.

Payload gồm recipient/address/policyAccepted, notes, paymentMethod, idempotencyKey, items chỉ định product/variant/quantity và coupon theo Shop. Client không gửi giá cuối cùng có thẩm quyền. `resolveOrderVariantId` chuẩn hóa ID variant trước POST. Coupon validation chỉ preview, chưa tiêu thụ quota.

## 3. API tạo đơn và chống spam

`OrdersController.createOrder` thực hiện kiểm tra JWT, lấy customerId từ JWT, assertReady nếu PAYOS, gọi `checkCreateOrderRateLimit`, đọc cookie attribution/legacy referral và User-Agent, sau đó gọi OrdersService.createOrder(dto, clientContext).

Rate limit hiện tại: **30 lần tạo đơn/IP/60s**, thêm **5 lần/SĐT/300s**, qua CacheService.checkRateLimit. Nhánh NODE_ENV=test bỏ qua limiter. Vượt ngưỡng trả 429. Đây là limiter riêng với giới hạn click FR-14. IP tại controller này dùng req.ip/socket; không tự gán cơ chế extractTrustedClientIp của redirect vào sơ đồ.

DTO yêu cầu policyAccepted=true, idempotencyKey và items; service kiểm tra bổ sung quantity là số nguyên >=1. Hàm order-input.utils chuẩn hóa điện thoại dạng +84 thành 0, yêu cầu 10 số; tên 2–150 ký tự, địa chỉ 5–500 ký tự và loại dữ liệu không hợp lệ; ghi chú tối đa 500 ký tự. Frontend có regex SĐT hẹp hơn backend.

## 4. Idempotency và giá từ database

Service tạo canonical requestHash từ recipient, địa chỉ, items, coupon, phương thức thanh toán và các ngữ cảnh liên quan rồi tìm Order theo idempotencyKey unique.

- Đã có đơn và hash khớp: trả đơn cũ, không trừ kho hoặc tạo Order lần nữa.
- Đã có key nhưng payload khác: ConflictException 409. Đơn cũ không có hash dùng đối chiếu items/tên/điện thoại.
- Chưa có: tiếp tục tạo mới. Database unique key là lớp chống ghi trùng cuối cùng; không đồng nhất precheck này với một khóa phân tán riêng.

Service lấy Product chưa xóa, yêu cầu isActive và moderationStatus APPROVED, xác định Store thực tế từ Product. Một Shop thì kiểm tra Store active/chưa xóa và storeId không bị sai. Variant phải tồn tại, active và thuộc đúng Product. Giá lấy Product.price hoặc giá variant từ DB; client unitPrice bị bỏ qua.

Đọc Product/Variant và phần lớn dữ liệu giá diễn ra trước transaction; không vẽ thành mọi giá đều được SELECT FOR UPDATE bên trong transaction. Điều kiện tồn kho khi UPDATE mới là kiểm tra cuối có tác dụng chống âm kho.

Nếu có mã coupon, service prevalidate bằng CouponsService. Backend gọi `quoteCheckoutShipping` qua GhnService.quoteAddress để lấy phí lần nữa; không dùng số phí preview phía client làm nguồn chính thức. Constructor cho phép ghnService optional để phục vụ legacy isolated tests, helper trả null nếu thiếu; trong nhánh này phí sẽ thành 0, không khẳng định mọi lời gọi service độc lập đều liên hệ GHN.

## 5. Transaction trừ kho và tạo Order

Đơn một Shop dùng Prisma `$transaction`, isolation ReadCommitted, timeout **15 giây**, gọi `executeStoreOrderInTransaction(tx, params)`.

1. Kiểm tra lại trạng thái Store trong transaction bằng findUnique. Comment code dùng từ khóa hàng nhưng tại đoạn này không có SELECT FOR UPDATE cho Store; sơ đồ không vẽ khóa Store giả định.
2. Với item có variantId: UPDATE product_variants, stock_quantity = stock_quantity - quantity, chỉ thành công khi stock >= quantity và is_active=true.
3. Không có variantId: UPDATE products với điều kiện tương tự, thêm is_deleted=false.
4. UPDATE ảnh hưởng 0 dòng thì ném PRODUCT_OUT_OF_STOCK, rollback. Code hiện ném BadRequestException **400**, dù Swagger liệt kê 422.
5. Nếu có coupon: SELECT coupon FOR UPDATE, kiểm tra lại hiệu lực, scope, stacking, quota/ngân sách, cập nhật usageCount/budgetUsed. Có xử lý platform/shipping stacked vouchers và livestream/campaign liên quan.
6. Resolve attribution theo coupon/cookie/fingerprint/organic, tính tổng tiền, commission snapshot và các snapshot chính sách/attribution.
7. Tạo Order status **PENDING**, nested OrderItems có unitPrice/quantity/commission snapshot; ghi notification ORDER_CREATED, redemption coupon USED và các stacked redemption; cập nhật referral counter nếu có.
8. Nếu WALLET: trừ available balance bằng WalletsService với chính tx client, ghi paymentTransaction, paymentStatus PAID trong rawPayload. Không đủ tiền/lỗi ví làm rollback cả đơn và tồn.
9. Callback kết thúc thành công mới commit. Lỗi coupon, ví, tạo đơn hoặc bất kỳ bước transaction nào làm rollback phần kho đã trừ.

**Tồn kho giảm khi tạo đơn, trước khi thanh toán PayOS.** Có variant thì giảm kho variant, không đồng thời giảm Product.stockQuantity. Không có bảng inventory riêng được đường checkout này cập nhật. Tồn preview không phải giữ chỗ; khách khác có thể mua trước, nên kiểm tra conditional UPDATE là cần thiết.

Order.status PENDING và paymentStatus PAID/WAITING_PAYMENT là hai khái niệm khác nhau. Phương thức/trạng thái thanh toán hiện nằm trong Order.rawPayload; không tự tạo cột paymentMethod/paymentStatus trên model Order trong sơ đồ.

## 6. Giỏ nhiều Shop

`createOrder` phát hiện nhiều storeId rồi chuyển `createMultiStoreOrders`. Service dựng context và idempotency key cho từng Shop, tính coupon/phí theo Shop, sau đó tạo các đơn con bằng cùng helper executeStoreOrderInTransaction.

Toàn bộ đơn con dùng **một transaction chung**, ReadCommitted, timeout **25 giây**. Nếu Shop thứ hai lỗi, đơn/kho/coupon/ví của Shop thứ nhất cũng rollback; không có commit từng Shop độc lập. Kết quả có isMultiStore, orders[], publicOrderCode/totals và trackingUrl theo đơn con.

Top-level paymentStatus trong response multi-Store hiện có giá trị UNPAID, trong khi từng đơn có trạng thái riêng; frontend dùng trạng thái từng đơn cho màn PayOS. Không diễn giải top-level này là mọi ví chưa thanh toán.

## 7. Sau commit và giao diện thành công

Nếu có email và MailService, service gọi sendOrderConfirmation bất đồng bộ sau commit. Email lỗi được log, không rollback đơn đã commit. Cờ confirmationEmailQueued thể hiện đã lên lịch lời gọi, không chứng minh mail tới hộp thư.

Response trả publicOrderCode, totals, status, paymentMethod/paymentStatus, trackingUrl, items, Store; có cancellationToken cho đơn mới. Replay có dữ liệu phục hồi khác, không nhất thiết trả lại token ban đầu. Không đưa toàn bộ raw Order/PII vào diagram response.

Frontend unwrap response, chỉ removeItems các cartItemId đã đặt, lưu recent public code vào `scanms-recent-guest-order`, hiển thị danh sách đơn theo Shop, gọi onOrderPlaced. Có thể lưu địa chỉ mới bất đồng bộ nếu khách chọn. Lỗi hiển thị server message trên form; 401 chuyển login; finally tắt isSubmitting.

Đổi recipient/giỏ sau một response thành công nhưng bị timeout rồi gửi lại cùng key có thể nhận 409 nếu hash thay đổi. Mở lại modal tạo key mới; không mô tả key như được lưu bền vững xuyên mọi lần mở/trình duyệt.

## 8. Thanh toán PayOS sau khi tạo đơn

`PayosOrderPayment` được mount theo mã đơn. Component POST `/orders/payos/:code/link`, tạo QR từ qrCode do server trả, và GET `/orders/payos/:code/status` lặp khoảng 5 giây khi chưa kết thúc. Hai endpoint có JwtAuthGuard, PayosPaymentService kiểm tra đơn thuộc người mua. Cập nhật UI theo paymentStatus server, không coi quét QR hoặc mở link là thanh toán thành công.

PayOS link/poll chạy sau response tạo Order; không giữ transaction trừ kho mở trong lúc khách chuyển tiền. Webhook và hoàn tiền/hủy đơn là nghiệp vụ kế tiếp, không mở rộng toàn bộ vào sequence FR-16. Sequence nhóm các support service trên một lifeline và ghi rõ tên ở cuối trang; Shipping/Coupon preview đi controller riêng, không qua OrdersController.

## 9. Class diagram và kiểm tra tài liệu

Các model chính: Store, Product, ProductVariant, Order, OrderItem, User, Coupon, CouponRedemption. Order có 0..* OrderItem theo schema; service tạo mới yêu cầu ít nhất một item. Mỗi OrderItem thuộc một Product, optional một variant. Order có tối đa một CouponRedemption chính nhờ orderId unique; stacked redemption là quan hệ khác. Một Coupon có nhiều redemption. Order.customerId, couponId, referralLinkId là FK; attributionSessionId/clickId là scalar, không vẽ FK cho chúng.

Đã đọc test hiện có orders-cart.spec.ts (giá/variant/tồn, atomic multi-Store) và order-hardening.spec.ts, đối chiếu với implementation. Không thay đổi code nghiệp vụ, .env hoặc chạy luồng đặt đơn thật. Xác minh tài liệu bằng parse XML, kiểm tra mỗi file một diagram/ID không trùng, render PNG và kiểm tra bố cục. PNG là preview từ geometry, không phải export trực tiếp diagrams.net.
