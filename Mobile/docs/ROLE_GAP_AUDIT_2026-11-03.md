# Rà soát nghiệp vụ Android theo 5 role — 03/11/2026

> Đây là snapshot **trước khi bổ sung**. Những màn đã triển khai tiếp theo và kịch bản nghiệm thu nằm tại [ROLE_WORKFLOWS_2026-11-03.md](ROLE_WORKFLOWS_2026-11-03.md). Giữ nguyên phát hiện gốc để truy vết; không dùng bảng dưới như trạng thái mới nhất.

## Kết luận

Mobile hiện có nền tảng và một phần nghiệp vụ của 5 role, **chưa tương đương web**. Đăng nhập được một role không có nghĩa role đó đã đủ chức năng. Không dùng kết quả build APK hoặc unit test để xác nhận các luồng chưa có màn hình.

Rà soát bằng source: routes web, màn native, API client/schema native, controller backend và một số service/DTO liên quan. Đây không phải nghiệm thu runtime của mọi endpoint. Không thay đổi DB, mật khẩu hoặc tạo giao dịch thật trong lượt này.

Livestream và thanh toán mobile đã được người dùng để giai đoạn sau. Các mục còn thiếu khác bên dưới không được xem là đã hoàn thành chỉ vì đang dùng được trên web.

## CUSTOMER

| Nhóm | Android hiện tại | Thiếu / giới hạn | Bằng chứng web / backend để tích hợp |
| --- | --- | --- | --- |
| Sản phẩm | Catalog, tìm kiếm, phân trang, chi tiết | Lọc danh mục/sắp xếp; chọn biến thể tương tác; trang gian hàng/theo dõi Shop; xem review; hiển thị rating đầy đủ | `frontend/src/pages/public/ShopPage.tsx`, `ProductDetailPage.tsx`; `products/public-products.controller.ts`, `stores/stores.controller.ts` |
| Giỏ hàng | Chưa có | Thêm/sửa/xóa/chọn sản phẩm; đồng bộ khi mở lại app | GET/PUT `/customer/cart`; `customer/customer.controller.ts` |
| Địa chỉ | Chưa có | Thêm/sửa/xóa, địa chỉ mặc định, địa chỉ GHN 3 cấp | GET/POST `/customer/addresses`, PUT/DELETE `/:id`, PATCH `/:id/default` |
| Đơn hàng | Danh sách/tìm kiếm, chi tiết, tracking GHN, xác nhận nhận hàng | Lọc trạng thái; hủy đơn và lý do; thông tin thanh toán/khuyến mãi/phí giao hàng chi tiết; mô phỏng GHN TEST trên mobile | `/customer/orders`; POST `/:id/cancel`; DTO `customer-orders-query.dto.ts`; `shipping/shipping.controller.ts` |
| Đánh giá | Chưa có | Form sao/nhận xét/ảnh; biết món đã đánh giá; phản hồi/kiểm duyệt | POST `/customer/orders/:id/reviews`; `products/products.controller.ts` |
| Trả hàng/hoàn tiền | Chưa có | Tạo hồ sơ, bằng chứng ảnh/video, lấy hàng ngược, theo dõi kiểm tra/hoàn tiền/đổi hàng, xác nhận và khiếu nại | POST `/customer/orders/:id/return-request`; `returns/return.controller.ts`; `frontend/src/pages/returns/ReturnDetailPage.tsx` |
| Tài khoản | Xem tên/email/role; đăng xuất/làm mới phiên | Chỉnh hồ sơ/avatar, mật khẩu/OTP, yêu thích, xác minh danh tính, voucher, số dư và lịch sử ví | `CustomerPortalPage.tsx`; `customer/customer.controller.ts`, `wallets/wallets.controller.ts` |
| Chat | Gửi chữ, đọc lịch sử, nhận realtime, xem tệp đã gửi từ web | Gửi ảnh/video/tệp; mở gian hàng từ header chat; thông báo ngoài màn chat | POST `/chat/conversations/:conversationId/attachments`; `ChatScreen.tsx` hiện chỉ gửi chữ |

## COLLABORATOR / KOL

| Nhóm | Android hiện tại | Thiếu / giới hạn | Bằng chứng web / backend để tích hợp |
| --- | --- | --- | --- |
| Tổng quan | Chưa có | Doanh thu, đơn tiếp thị, KPI, hoa hồng theo trạng thái | `KolDashboardPage.tsx`; GET `/dashboard/kol`, `/dashboard/collaborator/referral-orders` |
| Hợp tác | Nhận/phản hồi lời mời; gửi đề nghị từ sản phẩm; chat Shop | Hệ sinh thái khám phá Shop; chi tiết hiệu suất hợp tác; điều hướng tới mẫu và sản phẩm của đối tác | `ShopCollaborationPage.tsx`; `commission-rules/store-collaborators.controller.ts` |
| VIP | Tạo/phản hồi đề nghị; phạm vi SP/nhóm/Shop; KPI doanh thu; copy link/mã VIP được cấp | Báo cáo tiến độ thực hiện; thông báo quyết định; chat hiện chỉ hiện nút tới danh sách VIP, không render thẻ chi tiết như web | `affiliate-deals/affiliate-deals.controller.ts`; `DealsScreen.tsx`, `ChatScreen.tsx` |
| Smart link / QR / Coupon | Chỉ copy link VIP sau duyệt | Tạo/quản lý link thường; QR; analytics; quản lý coupon và kho media tiếp thị | `MarketingToolkitPage.tsx`; `referral-links/referral-links.controller.ts`, `coupons/coupons.controller.ts`, `media/media.controller.ts` |
| Hàng mẫu | Chưa có | Kiểm tra eligibility, xin mẫu, cập nhật địa chỉ, hủy, tracking/nhận mẫu, hạn nộp, gửi video, báo lỗi giao hàng | `samples/samples.controller.ts` (prefix `/sample-requests`); các trạng thái do backend quyết định |
| Ví/rút hoa hồng | Chưa có | Khả dụng/tạm giữ, ledger, tài khoản ngân hàng, gửi yêu cầu rút, lịch sử payout/thuế | `WalletPage.tsx`; `/wallets/me`, `/wallets/me/ledger`, `/wallets/withdrawals` |
| Hồ sơ KOL | Chỉ thông tin phiên | KYC, kênh xã hội, cấp bậc và thưởng doanh số | `CreatorProfilePage.tsx`; `kyc/kyc.controller.ts`, `social-channels/social-channels.controller.ts`, `tiers/tiers.controller.ts` |

## SHOP_MANAGER

| Nhóm | Android hiện tại | Thiếu / giới hạn | Bằng chứng web / backend để tích hợp |
| --- | --- | --- | --- |
| Phạm vi Shop | Chọn gian hàng được phân công trong Cá nhân | Tổng quan Shop/doanh số chưa có | `StoreScope.tsx`; `mobile/mobile.service.ts`; GET `/dashboard/shop` |
| Sản phẩm | Danh sách, xem, tạo mới 6 khối, upload ảnh sản phẩm | Sửa/xóa, quản lý tồn kho/biến thể và chính sách hàng mẫu sau tạo; lọc trạng thái | `ProductManagementPage.tsx`; PUT/DELETE `/products/:id`, PUT `/:id/variants`, PATCH `/:id/variants/:variantId/sample-policy` |
| Giá bán/MAP | Chưa có | Xem MAP do vận hành đặt; đề xuất/hủy chương trình giảm giá, theo dõi duyệt/ngân sách | `ProductPricingPage.tsx`; `/pricing/catalog`, `/pricing/promotions`; Shop không được tự đặt MAP |
| Đơn hàng | Danh sách, chi tiết, nhập mã vận đơn, tạo GHN TEST | Lọc trạng thái/thanh toán; tạo tay/import; các thao tác đơn khác đúng transition; in phiếu; điều khiển mô phỏng TEST | `OrdersManagementPage.tsx`; POST `/orders/manual`, `/orders/import-excel`; `orders/orders.controller.ts` |
| Trả hàng | Chưa có | Hàng đợi duyệt/từ chối, bằng chứng, địa chỉ kho/hướng dẫn, pickup, nhận/kiểm hàng, đổi hàng/hoàn tiền | `ShopReturnRequestsPage.tsx`, `ReturnDetailPage.tsx`; `/returns/shop`, `/returns/:id/...` |
| Hợp tác/KOC | Mời qua email, phản hồi, AI Matching, chat, VIP | Hàng mẫu toàn luồng; hiệu suất KOC; coupon riêng; cấu hình commission/campaign | `ShopKolHubPage.tsx`, `ShopPromotionsHubPage.tsx`; modules `samples`, `commission-rules`, `coupons`, `campaigns` |
| Đánh giá | Chưa có | Xem/phản hồi/báo cáo review | GET `/products/reviews/moderation`, POST `/products/reviews/:reviewId/reply`, `/:reviewId/report` |
| Ví/payout | Chưa có | Ví Shop, ledger, duyệt/từ chối rút, upload bill, xuất/đọc lô VietQR | `ShopRevenueWalletPage.tsx`, `PayoutApprovalPage.tsx`; `payouts/merchant-payouts.controller.ts` |
| Cấu hình Shop | Chỉ chọn Shop | Sửa thông tin/địa chỉ kho, chính sách, ngân hàng, trạng thái hiện diện | `ShopSettingsPage.tsx`; GET/PUT `/stores/my-store`; POST `/stores/my-store/presence` |

## SYSTEM_MANAGER

| Nhóm | Android hiện tại | Thiếu / giới hạn | Bằng chứng web / backend để tích hợp |
| --- | --- | --- | --- |
| Kiểm duyệt sản phẩm | Hàng đợi DRAFT/APPROVED/REJECTED, chứng từ, duyệt/từ chối có maker–checker | Tìm kiếm/phân trang/lọc sâu; không phải đã đủ mọi màn duyệt | `ModerationScreen.tsx`; `products/products.controller.ts` |
| KYC | Chưa có | Hồ sơ KOL/Shop, chứng từ, duyệt/từ chối/yêu cầu bổ sung theo contract | `KycApprovalPage.tsx`; GET `/kyc/admin/applications`, PATCH `/kyc/admin/kol/:id/review`, `/kyc/admin/shop/:id/review` |
| Trọng tài hàng mẫu | Chưa có | Danh sách vi phạm, bằng chứng, phân xử, mở khóa theo quyền | `AdminSampleRequestsPage.tsx`; GET `/sample-requests/admin`, PATCH `/sample-requests/admin/:id/resolve` |
| Tranh chấp đổi trả | Chưa có | Danh sách tranh chấp, hồ sơ, phân xử, trách nhiệm, xử lý refund lỗi | `AdminReturnDisputesPage.tsx`; `/admin/return-disputes` |
| MAP/khuyến mãi | Chưa có | Đặt MAP, duyệt/từ chối đề xuất giảm giá | PUT `/pricing/products/:id/floor`; PATCH `/pricing/promotions/:id/review` |
| Review | Chưa có | Duyệt/ẩn/xử lý báo cáo đánh giá | `CustomerReviewModerationPage.tsx`; PATCH `/products/reviews/:reviewId/moderation`, POST `/:reviewId/resolve` |
| Giám sát vận hành | Chỉ danh sách/chi tiết đơn | Analytics, giám sát affiliate/coupon, audit/fraud, duyệt payout theo policy backend | `AdminAnalyticsHubPage.tsx`, `AdminOversightHubPage.tsx`, `AuditLogsPage.tsx`, `AiFraudSentinelPage.tsx`, `AdminFinancePayoutsPage.tsx` |

Manager không được dùng quyền quản trị tài khoản hoặc ngoại lệ VIP của SYSTEM_ADMIN. Backend vẫn là nơi thực thi quyền; không nới quyền để bổ sung menu.

## SYSTEM_ADMIN

| Nhóm | Android hiện tại | Thiếu / giới hạn | Bằng chứng web / backend để tích hợp |
| --- | --- | --- | --- |
| Nghiệp vụ vận hành | Có phần kiểm duyệt sản phẩm và đơn hàng như Manager | Kế thừa toàn bộ phần thiếu của Manager ở trên | Không chỉ thêm tab Admin rồi xem là đủ nghiệp vụ |
| Ngoại lệ VIP | Danh sách và quyết định độc lập cho PENDING_ADMIN_APPROVAL | Dashboard/theo dõi KPI, lịch sử quyết định sâu | `DealsScreen.tsx` với `exceptionQueue`; `affiliate-deals` |
| Tài khoản/nhân sự | Danh sách user chỉ đọc và tìm kiếm | Tạo nhân sự, khóa/mở khóa, quản lý phân công Shop | `AdminPersonnelPage.tsx`; POST `/users/internal-staff`, PATCH `/users/:id/toggle-status`; quản lý Store trong `stores.controller.ts` |
| Dashboard executive | Chưa có | Tổng quan tài chính, doanh thu, rủi ro toàn hệ thống | `AdminAnalyticsHubPage.tsx`; các endpoint dashboard theo quyền |

Không suy ra có API thay đổi tùy ý mọi role từ chức năng tạo nhân sự. `users.controller.ts` hiện có tạo nhân sự nội bộ và khóa/mở; nếu cần màn đổi role tổng quát phải xác minh/thống nhất contract riêng.

## Thiếu dùng chung và rủi ro cần xử lý

1. Chưa có Notification Center hoặc push mobile; chat có realtime khi foreground và số chưa đọc tại danh sách hội thoại, chưa có trải nghiệm thông báo đầy đủ.
2. Màn Cá nhân hiện là thông tin phiên và chọn Shop, chưa phải hồ sơ nghiệp vụ của từng role.
3. Chưa có dashboard của các role. Điều hướng ít tab đang làm nhiều nghiệp vụ không có điểm vào.
4. `OrderSchema` chỉ giữ một phần trường; Zod loại các trường chưa khai báo như `returnRequest`, `productReviews`, dữ liệu thanh toán. Backend đã trả dữ liệu nhưng native chưa dùng được để hiển thị nghiệp vụ tương ứng.
5. `orders()` của Customer đang tải toàn bộ danh sách rồi cắt trang ở client. Không phải phân trang server; cần cải thiện khi dữ liệu lớn.
6. `OrderDetailScreen` với Shop/vận hành tìm lại đơn bằng API danh sách + mã đơn; chưa phải endpoint chi tiết riêng cho mobile. Cần giữ kiểm tra scope và không bỏ xác minh khi thay cách đọc.
7. `FulfillmentForm` chỉ hiện cho PENDING; chưa có đầy đủ các thao tác theo state machine của web. Tracking chưa có nút khởi động/hoàn tất mô phỏng GHN TEST trên Android.
8. `ChatScreen` xem được ảnh/tệp nhận từ web nhưng chưa có upload/gửi tệp; thẻ VIP chỉ là lời dẫn tới danh sách.
9. APK đã cài là debug x86_64 cần Metro, chưa nghiệm thu APK demo độc lập trên thiết bị ARM. Đây là thiếu ở bàn giao, tách biệt việc thiếu nghiệp vụ.

## Thứ tự bổ sung để nghiệm thu luồng trọn vẹn

1. **Khách–Shop–Vận hành:** địa chỉ + giỏ hàng (chưa thanh toán mobile), quản lý đơn, hủy/nhận/đánh giá, trả hàng và trọng tài. Tiêu chí: tạo hồ sơ từ khách → Shop xử lý → vận hành phân xử nếu cần → khách thấy kết quả trên cùng DB.
2. **KOL–Shop–Vận hành:** link/QR và coupon, xin mẫu → duyệt/gửi/nhận → nộp video → nghiệm thu/trọng tài; nối với hợp tác/VIP đã có.
3. **Dòng tiền:** ví/escrow/ledger, yêu cầu rút → duyệt bill → trạng thái payout/thuế. Việc xem ví/rút hoa hồng không đồng nghĩa triển khai PayOS checkout mobile.
4. **Vận hành và quản trị:** KYC, MAP/khuyến mãi, review, nhân sự/phân công Shop, dashboard; giữ Manager/Admin khác quyền.
5. **Hoàn thiện trải nghiệm:** thông báo, hồ sơ, gửi tệp chat, điều hướng dễ tìm, lọc/phân trang; chạy E2E giữa ít nhất hai client và kiểm thử quyền khác Shop.
6. **Giai đoạn đã hoãn:** thanh toán mobile và livestream; triển khai riêng khi tới giai đoạn đó.

Mỗi nhóm chỉ đánh dấu hoàn thành khi có native screen + API thật + quyền tài nguyên + xử lý lỗi/trạng thái + bằng chứng kiểm thử Android. Không thay bằng nút mở toàn bộ web và gọi đó là đã port native.

## Kiểm tra đã chạy trong lượt rà soát

- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: **26/26 PASS**. Đây là unit/contract test của phần hiện có, không bao phủ các nghiệp vụ chưa triển khai hoặc chứng minh E2E của 5 role.
- Lần `npm test` trong sandbox lỗi `uv_os_get_passwd ... ENOMEM` trước khi chạy test; chạy lại ngoài sandbox với một worker thành công. Không ghi nhận lỗi môi trường này là lỗi nghiệp vụ.
- Không thực hiện lại các mutation trên DB nhóm, giao dịch thanh toán, gửi hàng thật hoặc đăng nhập các role để nghiệm thu trong lượt này.
