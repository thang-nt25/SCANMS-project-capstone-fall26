# FR-15 — Landing Page sản phẩm và video review KOL

Đối chiếu mã nguồn ngày 2026-10-16. Tạo class diagram trước, sequence diagram sau bằng `node docs/diagrams/build-fr15-diagrams.cjs`. Hai file `.drawio` riêng trong `docs/diagrams`, tên bắt đầu `FR15_Product_Landing_Video_Review_`. Mỗi file có một diagram; sequence một trang, tiếng Anh, trắng đen, nhãn trong suốt, không có khung ref/alt ngang. PNG là preview từ geometry để kiểm tra bố cục.

## 1. Phạm vi chức năng trên web

Route `/products/:slug` trong `frontend/src/routes/AppRoutes.tsx` mở `ProductDetailPage`. Đây là trang công khai thuộc sàn SCANMS, hiển thị sản phẩm và gian hàng đối tác cụ thể, không phải website riêng của một thương hiệu.

Trang có ảnh gallery, thông tin/giá sản phẩm, biến thể, số lượng, thông tin Shop, chính sách, video KOL, đánh giá khách, mã giảm giá, thêm giỏ và mua ngay. Header dùng PublicHeader. Những chức năng phụ như yêu thích, chat, mẫu thử KOL, live deal và xử lý voucher có xuất hiện trong component nhưng không được mở rộng thành toàn bộ nghiệp vụ riêng trong FR-15. Luồng thanh toán/ghi đơn bên trong GuestCheckoutModal nằm ngoài sơ đồ này.

## 2. Frontend gọi API nào

Nguồn: `frontend/src/pages/public/ProductDetailPage.tsx`.

`loadLanding` được khai báo bên trong useEffect theo slug, gọi trực tiếp `api.get('/public/products/:slug/landing')`, không qua productService. Khi request chính lỗi, frontend thử `/products/:slug/landing`. Cả hai có tiền tố `/api` qua API client.

Route chính đi vào `PublicProductsController.getLandingPage`; route dự phòng đi vào `ProductsController.getLanding`. Controller còn có alias `/products/landing/:idOrSlug`. Cả hai đọc cookie scanms_attr hoặc scanms_attribution rồi gọi cùng `ProductsService.getLandingPageData`.

Frontend chấp nhận payload trực tiếp hoặc payload bọc data, kiểm tra product.id, chọn biến thể còn hàng đầu tiên (hoặc biến thể đầu nếu không có biến thể còn hàng), chọn ảnh tương ứng và render. Dữ liệu lỗi/thiếu sẽ chuyển sang error state; loading luôn kết thúc trong finally. Không có sản phẩm giả được tạo làm fallback khi API lỗi.

## 3. Điều kiện backend trước khi trả landing

Nguồn: `backend/src/modules/products/products.service.ts`, method `getLandingPageData`.

1. ID/slug rỗng trả 404. Thiếu JWT_SECRET trả lỗi cấu hình 500.
2. Tìm Product chưa xóa và moderationStatus APPROVED theo UUID/SKU (SKU không phân biệt hoa thường). Nếu chưa thấy, thử alias và phân giải từ khóa title/SKU cho đường dẫn thân thiện. Đây không phải cột slug duy nhất của Product; có alias đặc thù serum trong implementation.
3. Include các ProductVariant isActive=true, Store và owner.
4. Không thấy sản phẩm trả 404. Store bị xóa/tạm đóng trả 404; Store chưa isVerified hoặc onboardingStatus khác VERIFIED trả 404; owner bị khóa trả 403.
5. Product isActive=false hoặc hết tồn không nhất thiết làm trang 404: backend trả payload với status INACTIVE/OUT_OF_STOCK và canPurchase=false để vẫn xem thông tin.

Không chuyển các mô tả Swagger về HTTP 410/429 thành hành vi chắc chắn của getLandingPageData: implementation đã đọc không có nhánh rate limit landing tương ứng. Analytics có rate limit riêng.

## 4. Cookie, cache và video ưu tiên

Backend xác thực opaque visitor token. Nếu hợp lệ, HMAC visitorId để tạo visitorIdHash; token lỗi bị bỏ qua, không làm hỏng trang. Key cache là `landing:v2:{product.id}:{visitorIdHash hoặc anon}`, TTL **30 giây**.

Điểm thứ tự: backend vẫn query và kiểm tra Product/Store trước khi đọc cache; cache hit không có nghĩa hoàn toàn không truy cập DB. Cache hit trả payload ngay, bỏ qua truy vấn session/media/reviews phía sau.

Khi cache miss và có visitor hash, backend tra AttributionSession theo Store + visitorIdHash. Chỉ dùng collaboratorId khi session ACTIVE, chưa hết hạn, referralLink ACTIVE và chưa deletedAt. Việc này chỉ ưu tiên video đang hiển thị; không ghi đè attribution hay tạo đơn.

Backend lấy MediaAsset theo productId, isDeleted=false, status APPROVED, include collaborator và collaboratorProfile. Asset IMAGE tạo gallery, loại ảnh trùng; asset VIDEO tạo LandingVideoDto. Thông tin gồm videoUrl, posterUrl (fallback ảnh sản phẩm), caption, KOL, badge, disclosure, isFeatured, isReferredKol. Video không có collaborator dùng tên Shop. Badge xác minh KOL dựa trên collaboratorProfile.kycStatus VERIFIED, không phải cứ APPROVED media là KOL đã KYC.

Backend sắp xếp video: đúng KOL referral trước → featured → createdAt mới nhất. URL qua `isSafeUrl`, dùng các domain cho phép và ALLOWED_MEDIA_DOMAINS, có loại các scheme nguy hiểm và một số địa chỉ nội bộ. Đường bắt đầu `/` được chấp nhận trực tiếp; không diễn giải helper này là bảo đảm tuyệt đối mọi URL đều an toàn/phát được.

## 5. Frontend còn ghép video localStorage

ProductDetailPage đọc `scanms_kol_video_submissions`, lọc theo các alias sản phẩm và status APPROVED hoặc isApproved=true. Nó map URL `./assets/` sang `/reference/assets/`, tạo thông tin KOL cục bộ, rồi ghép với videos từ API, tránh trùng ID. Cuối cùng frontend **sort lại isFeatured trước**.

Đây là nguồn dữ liệu phía trình duyệt, không phải record chắc chắn đã được server duyệt. Người dùng có thể thay localStorage; nhãn verified của nhánh local cũng được gán true. Sơ đồ thể hiện đúng bước merge để tránh mô tả toàn bộ video trên giao diện đều đến từ DB đã kiểm duyệt. Lần sort frontend có thể đưa featured không phải KOL referral lên trên video referral mà backend đã ưu tiên.

## 6. Đánh giá, tồn kho và chính sách

Backend đọc tối đa **50 ProductReview mới nhất có isApproved=true**, include Order.status. totalReviews, trung bình sao và phân bố sao đều được tính trên tối đa 50 dòng đã lấy, không phải COUNT toàn bộ lịch sử. Tên khách qua maskCustomerName. isVerifiedBuyer chỉ true nếu có Order liên kết và trạng thái COMPLETED.

Video review KOL là MediaAsset; ProductReview là đánh giá sao/comment của khách. Hai nguồn khác nhau và có quan hệ riêng tới Product. ProductReview.orderId là FK tùy chọn tới Order.

Tồn khả dụng của landing là tổng stockQuantity các variant active nếu có, nếu không dùng stockQuantity của Product. canPurchase yêu cầu Product active và tồn khả dụng > 0. Giá/số lượng đang chọn trên UI dựa vào variant. Chính sách lấy từ Store, có giá trị mặc định khi thiếu.

Frontend có polling `/public/products/:skuOrId/stock` ngay khi tải xong và mỗi 30 giây, bắt lỗi rồi bỏ qua. Trong backend hiện tại có `ProductsService.getRealtimeStock` nhưng tìm kiếm controller toàn backend chưa thấy route stock tương ứng. Vì vậy sơ đồ không vẽ một request polling thành công giả định. Method này dùng tồn cấp Product, cũng khác phép tổng variant trong landing.

## 7. Phát video và analytics

Frontend dùng thẻ HTML `<video>` với src trực tiếp, poster, playsInline và muted; không có SDK player hoặc chuyển YouTube/TikTok thành iframe trong đường này. togglePlay gọi play()/pause(); khi play thành công gửi video_start lần đầu, có mute, tốc độ, caption dạng text overlay và fullscreen. onEnded gửi video_complete. Video URL được domain cho phép chưa chắc là URL media trực tiếp; một URL watch-page mạng xã hội có thể không phát trong HTML video.

Module function `trackAnalytics` chỉ gửi khi `scanms_analytics_consent` bằng granted. Hàm tạo eventId, dispatch CustomEvent và POST `/public/products/analytics/events`, catch lỗi để không chặn giao diện. page_view chạy sau khi dữ liệu có; các CTA/video dùng cùng helper.

`PublicProductsController.trackAnalytics` lấy trusted IP và UA; `ProductsService.recordAnalyticsEvent` HMAC IP/UA, kiểm tra `CacheService.checkRateLimit` 60 sự kiện/60 giây/IP hash. Nếu vượt trả 429. Nếu được phép ghi AuditLog với eventId và action ANALYTICS_*. Duplicate P2002 trả duplicate=true; lỗi ghi khác trả recorded=false.

Một điểm lệch hiện có: frontend gửi add_to_cart và purchase, trong khi enum LandingAnalyticsEvent của DTO hiện không chứa hai giá trị này (có order_complete thay purchase). Các event đó có thể bị DTO validation từ chối và frontend bỏ qua lỗi. Sơ đồ minh họa đường video_start hợp lệ, không khẳng định mọi event frontend đều ghi thành công.

## 8. Thêm giỏ, mua ngay và SEO

Thêm giỏ gọi `useCart().addItem` với Product, Store, variantId và quantity; CartProvider kiểm tra tồn, quản lý cart và persistence. Mua ngay từ CTA chính, video card hoặc sticky CTA gọi handleBuyNow: mở GuestCheckoutModal và set query checkout=1. Modal nhận sản phẩm, Shop, giá/variant/số lượng và coupon đang chọn. Bấm nút mua chưa tự tạo Order.

Sau khi có dữ liệu, frontend cập nhật title, canonical, description, Open Graph, Twitter và JSON-LD Product/Offer. Share dùng endpoint `/public/products/:idOrSku/seo`; PublicProductsController.getSeoPreview tạo HTML meta phía server. Sơ đồ tập trung browsing/video/purchase entry; SEO là helper liên quan, không mở rộng thành sequence mạng xã hội riêng.

## 9. Quan hệ trong class diagram và kiểm tra

- Store 1 — 0..* Product; mỗi Product thuộc một Store.
- Product 1 — 0..* ProductVariant và ProductReview.
- Product 0..1 — 0..* MediaAsset vì media.productId có thể null.
- User 0..1 — 0..* MediaAsset theo collaboratorId; User/CollaboratorProfile được nhóm một ô để hiển thị nguồn KYC, không phải một bảng duy nhất.
- DTO response và frontend interfaces là cấu trúc trao đổi dữ liệu, không phải bảng DB. Các React function/context được ghi stereotype để phân biệt class backend.

Đã đọc test hiện có `backend/src/modules/products/tests/products.landing.spec.ts` và đối chiếu các điều kiện với implementation. Thay đổi chỉ tạo tài liệu và sơ đồ; không chạy test nghiệp vụ, không thay đổi runtime hay .env. Kiểm tra bằng parse XML, mỗi file một diagram, kiểm tra ID không trùng và xem PNG render.
