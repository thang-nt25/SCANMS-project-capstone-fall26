# FR-16 — Đặt hàng nhanh, tạo đơn và trừ tồn kho

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. Hai file XML không có đuôi mở rộng: `docs/review 2/FR16 - Class Diagram` và `docs/review 2/FR16 - Sequence Diagram`, cùng tiền tố để nằm cạnh nhau khi sắp theo tên. Bản `.drawio`, `.scene.json`, PNG trong `docs/diagrams` có tiền tố `FR16_Guest_Checkout_`; XML để dán là `FR16_Class_Paste.xml` và `FR16_Sequence_Paste.xml`.

Generator `build-fr16-diagrams.cjs` gọi `fr16-report-diagrams.cjs`, dùng chung helper UML của FR9, tạo class trước rồi sequence. Bản báo cáo gồm 11 lớp/model sau khi bổ sung hộp PrismaClient để thống nhất bố cục FR9, giữ ba ngăn tên/thuộc tính/phương thức và `+`/`-`; sequence rút từ 57 xuống 24 thông điệp trên một trang, với Customer, Browser, OrdersController, OrdersService, CouponsService và PrismaService. Không có khung bao `sd`, khung ngang `ref`/`alt`/`opt`/`break` hay đường chia nhánh. Điều kiện ghi trên thông điệp; nhãn nền trắng để lifeline không cắt chữ. Hình đen trắng theo FR9 và quy ước UML từ Word tham khảo; nội dung lấy từ SCANMS hiện tại.

Sequence chọn luồng tạo đơn một Shop, coupon Shop/KOL tùy chọn, kết thúc ở xác nhận đã tạo đơn. Giữ kiểm tra dữ liệu, giá từ DB, coupon, trừ kho và tạo Order/OrderItems trong cùng transaction, commit và phản hồi. Shipping, rate limit, attribution, email sau commit, thanh toán và đa Shop được giải thích trong tài liệu này; không thêm service giả để thay thế. Bản chi tiết cũ được giữ tại `docs/diagrams/archive/FR16_detailed`. PNG là preview từ cùng geometry, không phải export trực tiếp của diagrams.net.

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
- Tải chính sách Shop và trạng thái khả dụng PayOS. Khi địa chỉ đủ, gọi `/shipping/ghn/quote-address` cho từng Shop để preview phí. Phí chính thức lúc tạo đơn được backend báo giá lại từ kiện hàng tính bằng `buildShippingPackage` theo thông số đóng gói trong DB; không xem phí client hoặc quy đổi cố định theo số lượng là nguồn chính thức.

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

Nếu có mã coupon, service prevalidate bằng CouponsService. Backend gọi `quoteCheckoutShipping` qua GhnService.quoteAddress để lấy phí lần nữa từ địa chỉ, giá trị hàng và kích thước/cân nặng của kiện hàng; không dùng số phí preview phía client làm nguồn chính thức. Dù constructor đánh dấu ghnService optional, helper hiện ném InternalServerErrorException khi thiếu dịch vụ; không fallback phí ship 0. `requireShippingFee` kiểm tra phí trước khi xử lý transaction.

## 5. Transaction trừ kho và tạo Order

Đơn một Shop dùng Prisma `$transaction`, isolation ReadCommitted, timeout **15 giây**, gọi `executeStoreOrderInTransaction(tx, params)`.

1. Kiểm tra lại trạng thái Store trong transaction bằng findUnique. Comment code dùng từ khóa hàng nhưng tại đoạn này không có SELECT FOR UPDATE cho Store; sơ đồ không vẽ khóa Store giả định.
2. Nếu có shippingPackage, khóa các hàng Product theo ID đã sắp xếp bằng SELECT ... FOR UPDATE, đọc lại packageWeight/Length/Width/Height và tính lại kiện hàng. Thông số khác báo giá thì trả 409 và rollback. Đây là khóa hàng Product để kiểm tra kiện, không phải SELECT FOR UPDATE Store hoặc khóa mọi giá trong transaction. Sau đó, với item có variantId: UPDATE product_variants, stock_quantity = stock_quantity - quantity, chỉ thành công khi stock >= quantity và is_active=true.
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

Sau commit, service await `sendConfirmationEmail`; helper gọi MailService.sendOrderConfirmation khi có email/service, catch lỗi và trả SENT/FAILED/NOT_REQUESTED. `confirmationEmailQueued` hiện trả false; không mô tả đây là email queue đã lên lịch. SENT phản ánh kết quả service chấp nhận gửi, không chứng minh người nhận đã nhận/đọc email. Lỗi mail không rollback đơn đã commit.

Response trả publicOrderCode, totals, status, paymentMethod/paymentStatus, trackingUrl, items, Store; có cancellationToken cho đơn mới. Replay có dữ liệu phục hồi khác, không nhất thiết trả lại token ban đầu. Không đưa toàn bộ raw Order/PII vào diagram response.

Frontend unwrap response, chỉ removeItems các cartItemId đã đặt, lưu recent public code vào `scanms-recent-guest-order`, hiển thị danh sách đơn theo Shop, gọi onOrderPlaced. Có thể lưu địa chỉ mới bất đồng bộ nếu khách chọn. Lỗi hiển thị server message trên form; 401 chuyển login; finally tắt isSubmitting.

Đổi recipient/giỏ sau một response thành công nhưng bị timeout rồi gửi lại cùng key có thể nhận 409 nếu hash thay đổi. Mở lại modal tạo key mới; không mô tả key như được lưu bền vững xuyên mọi lần mở/trình duyệt.

## 8. Thanh toán PayOS sau khi tạo đơn

`PayosOrderPayment` được mount theo mã đơn. Component POST `/orders/payos/:code/link`, tạo QR từ qrCode do server trả, và GET `/orders/payos/:code/status` lặp khoảng 5 giây khi chưa kết thúc. Hai endpoint có JwtAuthGuard, PayosPaymentService kiểm tra đơn thuộc người mua. Cập nhật UI theo paymentStatus server, không coi quét QR hoặc mở link là thanh toán thành công.

PayOS link/poll chạy sau response tạo Order; không giữ transaction trừ kho mở trong lúc khách chuyển tiền. Webhook và hoàn tiền/hủy đơn là nghiệp vụ kế tiếp, không mở rộng toàn bộ vào sequence FR-16. Bản sequence báo cáo kết thúc trước bước tạo link/QR; GhnService và PayosPaymentService không mở rộng thành lifeline trong hình này. CouponsService vẫn có lifeline riêng để thể hiện kiểm tra coupon. Shipping/Coupon preview của UI đi controller riêng, không qua OrdersController; đây là các bước chuẩn bị được tóm tắt.

## 9. Class diagram và kiểm tra tài liệu

Class diagram gồm năm lớp OrdersController, OrdersService, CouponsService, PrismaService, PrismaClient và sáu model Product, ProductVariant, Order, OrderItem, Coupon, CouponRedemption. Đã vẽ bảy association: Product–ProductVariant/OrderItem; ProductVariant–OrderItem; Order–OrderItem/Coupon/CouponRedemption; Coupon–CouponRedemption. Store/User không mở rộng thành hộp trong hình; các liên kết tương ứng vẫn tồn tại trong mã/schema. PrismaClient được vẽ thành hộp và có mũi tên kế thừa từ PrismaService, đúng mã nguồn. Order có 0..* OrderItem theo schema; service tạo mới yêu cầu ít nhất một item. Mỗi OrderItem thuộc một Product, optional một variant. Order có tối đa một CouponRedemption chính nhờ orderId unique; stacked redemption là quan hệ khác. Một Coupon có nhiều redemption. Order.customerId, couponId, referralLinkId là FK; attributionSessionId/clickId là scalar, không vẽ FK cho chúng. CouponRedemption chỉ khai báo relation coupon/order trong schema; các storeId/collaboratorId/customerId trên redemption không tự biến thành association.

Đã chạy ba suite unit có sẵn `orders-cart.spec.ts`, `order-hardening.spec.ts`, `order-confirmation-email.spec.ts` với `test/jest-unit.config.cjs`: **16/16 test đạt**, gồm kiểm tra giá/variant, atomic multi-Store và mail sau commit. Đây là unit với mock, không phải kiểm chứng race condition/khóa DB hoặc giao dịch GHN/PayOS thật.

Không sửa logic nghiệp vụ, không đọc `.env` hoặc tạo đơn thật. Khi rút gọn chỉ thay đổi sơ đồ và tài liệu, không chạy lại unit test nghiệp vụ. Kiểm tra đường nối không xuyên phần trong của lớp/không chồng đoạn thẳng cùng hướng; render và xem hai PNG, kiểm tra tràn chữ và giới hạn canvas; parse XML kiểm tra ID/tham chiếu, mỗi file một trang, ba ngăn cho 11 lớp/model và 24 thông điệp không có fragment frame. Bản review và XML paste phải khớp bản gốc.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR16_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR16_before_word_class_alignment`, `FR16_before_fr09_sequence_layout` và `FR16_compact_before_fr09_layout`.
