# FR-13 - Tracking Last-Click và Cookie

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. **Bản báo cáo rút gọn hiện tại: 10 lớp/model, 25 thông điệp sequence.** Hai hình dùng đen trắng, class ba ngăn và `+`/`-`, connector có source/target thật và bội số đúng schema; sequence có actor, lifeline, activation và mũi tên, không có khung bao/chia nhánh. Điều kiện ghi trên nhãn. Phong cách theo FR9 và mẫu Word đã tham khảo.

Ví dụ đã có phiên từ click hợp lệ của KOL A; hình mở rộng click KOL B cùng Shop, cập nhật phiên Last-Click, cookie định danh và attribution khi đặt đơn. Limiter, cache và worker log được tóm tắt; fingerprint fallback được giải thích trong văn bản.

Các lớp/model được vẽ: `RedirectController`, `ReferralLinksService`, `OrdersController`, `PrismaService`, `OrdersService`, `Store`, `ReferralLink`, `AttributionSession`, `Order`, `PrismaClient`. Chỉ chọn thành viên liên quan; model không có phương thức tự khai báo giữ ngăn operation trống. Không dựng Repository/UnitOfWork hoặc service giả. PrismaService kế thừa PrismaClient trong mã và được vẽ bằng tam giác rỗng hướng tới hộp PrismaClient ở phía dưới bên trái, giống FR9.

Hai XML không có đuôi mở rộng: `docs/review 2/FR13 - Class Diagram` và `docs/review 2/FR13 - Sequence Diagram`. Bản `.drawio`, `.scene.json`, PNG có tiền tố `FR13_Last_Click_Tracking_Cookie` trong `docs/diagrams`; XML để dán là `FR13_Class_Paste.xml` và `FR13_Sequence_Paste.xml`. PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Bản chi tiết cũ, gồm tài liệu mô tả hình cũ, được lưu tại `docs/diagrams/archive/FR13_detailed`.

## 1. Luồng vào link và thu thập tín hiệu

Frontend `RedirectHandlerPage` đọc shortCode và query string, dùng window.location.replace tới backend `/r/{shortCode}`. Backend RedirectController cũng hỗ trợ `/api/r/{shortCode}`. Controller lấy IP qua extractTrustedClientIp theo cấu hình trusted proxy, User-Agent, Referer và nhận diện device type. Query via=qr được chuyển thành accessMethod QR; còn lại LINK.

Controller thử xác thực cookie scanms_attr hoặc scanms_attribution bằng verifyOpaqueVisitorToken, rồi legacy verifyMultiShopAttributionToken. Visitor ID cuối cùng là ID đã xác thực, fallback scanms_vid, hoặc crypto.randomUUID. DNT/Sec-GPC theo biểu thức header hiện tại và scanms_opt_out=true được chuyển thành isOptedOut.

ReferralLinksService.handleRedirect chuẩn hóa IP cho limiter, HMAC IP và gọi CacheService.checkClickRateLimitAtomic. Mặc định 10 request/giây và 60/phút theo IP hash, có cấu hình override và timeout mặc định 50ms. Dù comment cũ nói IP/session, lời gọi hiện tại truyền ipHash, không truyền session key cho limiter.

Link được tìm theo shortCode trim/lowercase qua cache ref_link:{code}, TTL 300s; cache miss truy vấn Prisma lấy kèm Product, Store, KOL. Link không tồn tại hoặc deletedAt có giá trị trả 404; BLOCKED trả 410. Code thực thi khác comment Swagger nói deleted trả 410, nên sơ đồ dùng 404 theo implementation.

## 2. Click hợp lệ và Last-Click theo từng Shop

Rate limited, bot/crawler, link PAUSED/EXPIRED, product không hợp lệ, Store.deletedAt hoặc KOL không active, opt-out đều tắt allowAttribution. Các lượt này vẫn có thể tiếp tục chuyển hướng an toàn; không cập nhật phiên/cấp cookie attribution mới. Không khẳng định chúng tự xóa attribution cookie đã tồn tại. Luồng vẫn tính các hash và enqueue invalid click có riskReason; opt-out tại redirect không đồng nghĩa hoàn toàn không còn click log.

Service gọi hashIpAddress để lấy subnet IPv4 /24 hoặc IPv6 /48 và HMAC; normalizeUserAgent trim/gộp khoảng trắng/tối đa 512 ký tự; generateDeviceFingerprint tạo HMAC(secret, subnet + normalized UA). Đây là fingerprint phía server, không có browser SDK thu canvas/hardware trong path này. visitorIdHash cũng là HMAC SHA-256.

Attribution window lấy từ Store.attributionWindowDays nếu trong 1-365, mặc định 30. Với click hợp lệ, attributionSession.upsert dùng unique(storeId, visitorIdHash):

- Create: Store, KOL, link, visitor/fingerprint hash, latestClickId, first/lastClickedAt, expiresAt, status ACTIVE.
- Update: ghi đè KOL/link/fingerprint/latestClickId/lastClickedAt, gia hạn expiresAt và ACTIVE; giữ firstClickedAt. Không tăng version trong đoạn update này.
- Phiên Shop khác không bị thay đổi.

Đây là Last-Click theo lần cập nhật hợp lệ được xử lý cuối; không có điều kiện timestamp compare-and-swap để bảo đảm thứ tự click vật lý khi nhiều request đồng thời chạy. Unique key bảo đảm một row/Shop/visitor, không chứng minh mọi race về thời gian đã được giải quyết.

Lỗi upsert bị catch, tắt attribution, sessionId null và không cấp cookie mới; vẫn có thể redirect. Session upsert và click log worker là hai thao tác riêng, không chung transaction. latestClickId là scalar UUID, không có FK tới ClickTrafficLog; ID có thể được gán trước khi log được worker ghi.

## 3. Cookie và chuyển hướng

Khi allowAttribution, không opt-out và có sessionId, controller ký opaque token bằng HMAC SHA-256. Payload token là v, vid, iat; không chứa KOL/link/Shop/IP/UA, và không có trường exp trong opaque token này. Hạn dùng được thực thi qua browser Max-Age và expiresAt phiên trong DB, không suy diễn verifyOpaqueVisitorToken tự kiểm tra tuổi token.

Ba cookie scanms_attr, scanms_attribution (alias cũ), scanms_vid dùng Max-Age theo window Shop, httpOnly, SameSite=Lax, path=/, secure khi NODE_ENV=production. Cookie mang visitor ID, còn winning KOL/link nằm trong DB. Không cố định mọi Shop đều 30 ngày.

Controller gắn noindex/nofollow và no-store; kiểm tra allowlist URL đích, sau đó trả 302 cho trình duyệt thường. Social crawler được trả HTTP 200 Open Graph HTML thay vì 302 thuần. Đường products cũ/rỗng được service đổi thành `/products/{productId}`.

Trong implementation hiện tại, service upsert/enqueue và controller gắn Set-Cookie diễn ra trước kiểm tra allowlist destination. Vì vậy một lỗi URL đích có thể đến sau khi tracking đã xử lý; sơ đồ không đảo thứ tự để mô tả một thiết kế giả định.

POST `/r/consent`, `/api/tracking/consent`, `/api/r/consent` nhận allowTracking. Opt-out đặt scanms_opt_out 365 ngày và xóa ba cookie tracking; opt-in xóa opt-out cookie. Không tìm thấy frontend caller riêng trong các tìm kiếm code hiện tại; đây là endpoint backend được đọc, không phải bằng chứng đã có banner consent giao diện.

## 4. Hàng đợi click, idempotency và dedup

ClickQueueService.enqueue nhận job mà không await worker. Redis List/ZSET có pending/processing/lease/DLQ; không có Redis client thì RAM queue. Worker chạy mỗi 1.5s, tối đa 50 Redis jobs/pass; flush sớm khi RAM queue >=20. Lease 30s; reclaim mỗi 15s. Retry lỗi job tối đa ba lần sau attempt đầu, rồi Redis DLQ. Fallback RAM có xử lý retry riêng; không coi RAM là bền vững khi process bị tắt.

processSingleJob kiểm tra eventId đã tồn tại thì bỏ qua. Với job valid: Redis SET NX EX 1800 cho dedup key link + visitor hash, fallback fingerprint/IP nếu thiếu. Khi không có Redis client, transaction advisory lock và query click gần nhất được dùng cho dedup DB. Nếu Redis client có nhưng SET NX lỗi, code trả null và không tự chạy nhánh DB fallback của !redis; vì vậy không khẳng định mọi tình huống Redis lỗi đều có cùng hành vi unique.

Trong một Prisma transaction, worker tăng ReferralLink.totalClicks, uniqueClicks nếu unique valid, cập nhật lastAccessedAt và tạo ClickTrafficLog. Log lưu IP subnet, IP hash, UA chuẩn hóa, fingerprintHash, sessionId là visitor hash, via LINK/QR, isValid/isUnique/risk, request/event ID và UTM. deviceFingerprint được ghi null. totalClicks bao gồm cả invalid traffic đã được xử lý, không chỉ click được nhận attribution.

Idempotency eventId/P2002 chống ghi lại cùng event; dedup 30 phút chỉ xác định unique click, không chặn cập nhật Last-Click session ở request redirect trước đó. Redis dedup key đã giữ được xóa nếu DB transaction thất bại để retry; lỗi P2003 của link đã bị xóa có nhánh bỏ job.

## 5. Xác định KOL khi tạo đơn

GuestCheckoutModal gửi POST /api/orders. OrdersController đọc cookie chính/alias và legacy referral cookie, IP và UA rồi gọi OrdersService.createOrder. Client không gửi hoặc tự chọn winning KOL. createOrder dùng executeStoreOrderInTransaction cho từng Store.

Thứ tự candidate:

1. Xác thực opaque cookie, HMAC visitor ID, đọc AttributionSession của Store đang đặt. Session phải ACTIVE, chưa hết hạn; link phải ACTIVE, chưa xóa/hết hạn, đúng Store, KOL active. Có tương thích signed multi-Shop cookie cũ và legacy referral cookie.
2. Fingerprint fallback chỉ chạy khi không có Store cookie tracking và không có cookie candidate. Đọc tối đa 20 valid clicks của Store/fingerprint trong 24h, newest-first; lọc lại link/KOL hợp lệ. Một KOL duy nhất thì dùng click mới nhất; nhiều KOL thì AMBIGUOUS và không chọn tùy tiện. Có session row của Store dù invalid/expired có thể chặn fingerprint fallback.
3. Ưu tiên cuối: coupon hợp lệ > cookie > fingerprint > organic. COUPON/COOKIE confidence HIGH; FINGERPRINT MEDIUM; Organic có thể mang confidence AMBIGUOUS.

Order lưu winning collaboratorId, link/session/click ID, attributionMethod, confidence, thời gian, original/override reason và attributionSnapshot. Snapshot giữ kết quả tại thời điểm đặt; thanh toán và chi trả hoa hồng là flow khác. Coupon có thể ghi đè cookie/fingerprint KOL, dù referralLinkId vẫn còn candidate từ click của KOL khác.

Snapshot `via` của opaque cookie path hiện gán LINK trong OrdersService; không được suy luận mọi order từ lượt QR đều có snapshot via=QR chỉ vì ClickTrafficLog ghi QR.

Controller orders không truyền isOptedOut vào clientContext và không thấy kiểm tra DNT/scanms_opt_out ở nhánh fingerprint attribution; không khẳng định cơ chế opt-out đã chặn toàn bộ fallback tại checkout. Tài liệu ghi nhận hiện trạng code, không sửa logic runtime trong tác vụ sơ đồ.

## 6. Quan hệ và nguồn

AttributionSession liên kết Store, User, ReferralLink; unique Store+visitor hash. ClickTrafficLog chỉ có relation ReferralLink; store/KOL/product/campaign ID là scalar/index theo schema. Order có relation ReferralLink và attributed User; attributionSessionId/clickId là scalar UUID, không vẽ FK giả tới Session/ClickLog.

Nguồn đối chiếu:

- frontend/src/pages/public/RedirectHandlerPage.tsx
- frontend/src/components/checkout/GuestCheckoutModal.tsx
- backend/src/modules/referral-links/redirect.controller.ts
- backend/src/modules/referral-links/referral-links.service.ts
- backend/src/modules/referral-links/click-queue.service.ts
- backend/src/modules/referral-links/utils/short-code.generator.ts
- backend/src/modules/referral-links/utils/client-ip.util.ts
- backend/src/core/cache/cache.service.ts
- backend/src/modules/orders/orders.controller.ts
- backend/src/modules/orders/orders.service.ts
- backend/prisma/schema.prisma

Tái tạo hai file draw.io: `node docs/diagrams/build-fr13-diagrams.cjs`.

## 7. File bàn giao và kiểm tra

- Hai file XML không có đuôi mở rộng: `docs/review 2/FR13 - Class Diagram` và `docs/review 2/FR13 - Sequence Diagram`, cùng tiền tố để nằm cạnh nhau khi sắp xếp theo tên.
- Bản `.drawio`, `.scene.json`, PNG và XML để dán nằm trong `docs/diagrams`, với tiền tố `FR13_Last_Click_Tracking_Cookie` hoặc `FR13_Class_Paste`/`FR13_Sequence_Paste`.
- Generator bản báo cáo: `build-report-diagrams.cjs` + `fr13-report-spec.json` + `report-uml-layout.cjs`, dùng chung helper UML của FR9. Các entry point FR13 đều chuyển tới bản báo cáo.
- Đã render và xem cả hai ảnh; bộ kiểm tra chiều cao chữ không báo tràn. Kiểm tra đường nối class không xuyên qua phần trong của lớp và không chồng đoạn thẳng cùng hướng.
- Hai suite unit có sẵn `referral-links.service.spec.ts` và `client-ip.util.spec.ts`: **48/48 test đạt**, chạy với `test/jest-unit.config.cjs`. Đây là kiểm tra unit liên quan, không phải xác nhận end-to-end trên DB/Redis thật.
- Chỉ cập nhật tài liệu/sơ đồ; không sửa logic tracking, cookie hoặc order của ứng dụng.

## Kiểm tra bản báo cáo rút gọn

Tái tạo: `node docs/diagrams/build-fr13-diagrams.cjs` hoặc `node docs/diagrams/build-report-diagrams.cjs 13`. Đặc tả nằm trong `fr13-report-spec.json`; bộ bố cục dùng `report-uml-layout.cjs` và helper UML của FR9.

Kiểm tra 10 cặp ngăn class, 25 thông điệp, một trang mỗi file, ID/tham chiếu, giới hạn canvas, đường nối không xuyên lớp hoặc chồng đoạn thẳng cùng hướng; render/xem hai PNG và kiểm tra tràn chữ. Review và XML paste phải khớp bản gốc. Chỉ thay sơ đồ/tài liệu, không thay logic ứng dụng. Kết quả unit test bên trên thuộc lượt đối chiếu trước; không chạy lại test nghiệp vụ cho lần rút gọn này.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR13_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR13_before_word_class_alignment`, `FR13_before_fr09_sequence_layout` và `FR13_compact_before_fr09_layout`.
