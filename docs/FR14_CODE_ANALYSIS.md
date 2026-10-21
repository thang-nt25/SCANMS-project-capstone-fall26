# FR-14 — Chống click spam qua Redis Rate Limit

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. **Bản báo cáo rút gọn hiện tại: 9 lớp/model, 23 thông điệp sequence.** Hai hình dùng đen trắng, class ba ngăn và `+`/`-`, connector có source/target thật và bội số đúng schema; sequence có actor, lifeline, activation và mũi tên, không có khung bao/chia nhánh. Điều kiện ghi trên nhãn. Phong cách theo FR9 và mẫu Word đã tham khảo.

Quyết định giới hạn nguyên tử bằng Redis Lua, fallback RAM, chuyển hướng an toàn và log bất đồng bộ. Health/dashboard và chi tiết metrics nằm trong văn bản; không ghép request quản trị vào luồng click của khách.

Các lớp/model được vẽ: `RedirectController`, `ReferralLinksService`, `CacheService`, `PrismaService`, `ClickQueueService`, `Redis (ioredis library)`, `ReferralLink`, `ClickTrafficLog`, `PrismaClient`. Chỉ chọn thành viên liên quan; model không có phương thức tự khai báo giữ ngăn operation trống. Không dựng Repository/UnitOfWork hoặc service giả. PrismaService kế thừa PrismaClient trong mã và được vẽ bằng tam giác rỗng hướng tới hộp PrismaClient ở phía dưới bên trái, giống FR9.

Hai XML không có đuôi mở rộng: `docs/review 2/FR14 - Class Diagram` và `docs/review 2/FR14 - Sequence Diagram`. Bản `.drawio`, `.scene.json`, PNG có tiền tố `FR14_Redis_Click_Rate_Limit` trong `docs/diagrams`; XML để dán là `FR14_Class_Paste.xml` và `FR14_Sequence_Paste.xml`. PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Bản chi tiết cũ, gồm tài liệu mô tả hình cũ, được lưu tại `docs/diagrams/archive/FR14_detailed`.

## Hành vi trên web hiện tại

`frontend/src/pages/public/RedirectHandlerPage.tsx` chuyển trình duyệt tới backend `/r/:shortCode`, giữ query string, gồm `via=qr` nếu quét QR. Không có màn hình riêng để khách bật/tắt rate limiter. Trong phạm vi tìm kiếm frontend hiện tại không thấy trang gọi API dashboard rate limit; không thêm trang quản trị giả vào sơ đồ.

`RedirectController.handleRedirect` lấy IP qua `extractTrustedClientIp`, thu thập UA, cookie, consent rồi gọi `ReferralLinksService.handleRedirect`. Cùng đường xử lý phục vụ LINK và QR. Controller cũng hỗ trợ đường `/api/r/:shortCode`.

Điểm quan trọng: giới hạn FR-14 là giới hạn ghi nhận attribution, không phải chặn truy cập sản phẩm bằng HTTP 429. Với link vẫn hợp lệ để redirect, click vượt ngưỡng tiếp tục nhận 302 tới đích cho phép. Service đặt `allowAttribution=false`, thêm `CLICK_RATE_LIMITED`, không upsert AttributionSession mới; controller không cấp/cập nhật cookie attribution mới. Nhánh này không xóa cookie cũ. Link không tồn tại/đã xóa vẫn 404, link BLOCKED vẫn 410; bot, privacy và trạng thái sản phẩm/link có kiểm tra riêng.

## Khóa giới hạn và ngưỡng

Nguồn: `backend/src/modules/referral-links/referral-links.service.ts`, `utils/client-ip.util.ts`, `backend/src/core/config/env.validation.ts`.

1. `TRUST_PROXY` phải bật và socket phải thuộc proxy tin cậy thì mới đọc CF-Connecting-IP hoặc X-Forwarded-For; mặc định lấy địa chỉ socket. Loopback được tin cậy, proxy khác cần cấu hình `TRUSTED_PROXIES`.
2. `normalizeClientIp` giữ nguyên IPv4, bỏ dạng IPv4-mapped IPv6, gom IPv6 theo prefix /64.
3. `hashIpForRateLimit` dùng HMAC-SHA256 với server secret. Redis key không chứa IP thô. Đây là hash phục vụ rate limit, khác hash/subnet dùng lưu click log và fingerprint.
4. `CLICK_RATE_LIMIT_SEC` mặc định 10; `CLICK_RATE_LIMIT_MIN` mặc định 60. Validation yêu cầu số nguyên dương và ngưỡng phút không nhỏ hơn ngưỡng giây.
5. Khóa chỉ dựa trên IP hash, không gồm shortCode, Store, KOL hay session: cùng IP dùng chung hạn mức trên các link/Store. IPv6 chung /64 dùng chung hạn mức.

Hai ngưỡng cùng áp dụng. Request thứ 11 bị từ chối nếu đã có 10 request được chấp nhận trong một giây vừa qua. Request vượt 60 trong một phút cũng bị từ chối, kể cả chưa chạm ngưỡng giây.

## Redis Lua và cửa sổ trượt

Nguồn: `CacheService.checkClickRateLimitAtomic` và `clickRateLimitLuaScript` trong `backend/src/core/cache/cache.service.ts`.

- Hai Sorted Set: `rl:v1:click:sec:{ipHash}` và `rl:v1:click:min:{ipHash}`; `{ipHash}` ở đây là ký hiệu thay thế trong tài liệu, code ghép trực tiếp hash vào key.
- Score là timestamp do ứng dụng gửi, member là timestamp cộng UUID để các click cùng millisecond không bị ghi đè.
- Một lần EVAL xóa timestamp ngoài cửa sổ 1.000ms/60.000ms rồi ZCARD. Kiểm tra ngưỡng giây trước, phút sau. Nếu đã đạt ngưỡng thì trả SEC/MIN và không thêm request bị từ chối vào ZSET.
- Nếu được chấp nhận, ZADD vào cả hai tập rồi EXPIRE lần lượt 3 giây và 70 giây. TTL này dọn key, không phải độ dài cửa sổ.
- Kết quả gồm allowed, limitedBy, currentSec/currentMin, remainingSec/remainingMin, resetTimeSec/resetTimeMin, isDegraded. Các kiểu options/result được khai báo inline trong method, không có DTO/class độc lập trong code; sơ đồ liệt kê trong ghi chú, không thêm lớp mang tên mô tả.
- Lua đảm bảo tính nguyên tử khi nhiều request/instance dùng cùng Redis. Đây không phải bộ đếm INCR với fixed window.

`resetTime*` trong nhánh Redis được tính từ TTL của key, không phải thời điểm chính xác timestamp cũ nhất trượt khỏi cửa sổ. Sơ đồ không diễn giải giá trị này thành Retry-After chính xác.

## Redis suy thoái và RAM fallback

Service gọi limiter với `CLICK_RATE_LIMIT_TIMEOUT_MS` mặc định **50ms**; default khi gọi trực tiếp method CacheService là **20ms**. Hai giá trị này khác nhau trong code hiện tại.

Nếu Redis không active, lỗi hoặc timeout, CacheService lọc timestamp trong Map cục bộ rồi áp dụng cùng ngưỡng 1s/60s. Map tối đa 10.000 IP; khi đầy thì cleanup rồi xóa entry đầu theo thứ tự Map nếu vẫn đầy. Đây không phải LRU đầy đủ vì entry cũ không được di chuyển về cuối mỗi lần truy cập.

Fallback trả `isDegraded=true`, tăng metrics và ghi cảnh báo. Map không chia sẻ giữa instance, cũng không đồng bộ lịch sử với Redis. Promise.race timeout không hủy EVAL đã gửi; Redis có thể vẫn hoàn tất sau khi code đã chuyển sang RAM. Vì vậy không mô tả fallback như một hạn mức phân tán tương đương Redis. Tự reconnect dùng backoff tối đa 3s; một lần check Redis thành công xử lý trạng thái phục hồi.

## Click log và số liệu

Nguồn: `ReferralLinksService.handleRedirect`, `ClickQueueService.processSingleJob`, `backend/prisma/schema.prisma`.

Với link tìm thấy, service ghi spike theo link/Store/KOL. Nếu queue được inject, service enqueue cả click hợp lệ và không hợp lệ. Click vượt rate limit có `isValid=false`, `riskReason` chứa `CLICK_RATE_LIMITED`; có thể kèm các lý do khác, không ghi đè chúng.

Worker xử lý bất đồng bộ, không bắt trình duyệt chờ ghi log. EventId dùng để chống ghi trùng. Trong transaction worker tăng `ReferralLink.totalClicks` cho cả invalid traffic rồi tạo ClickTrafficLog. `isUnique` ban đầu false và chỉ được xét dedup khi job hợp lệ, nên click rate-limited không tăng `uniqueClicks`. Nếu eventId đã được xử lý thì bỏ qua, không tăng lại. Unique-click dedup 30 phút thuộc FR-13, tách biệt với rate limit 1s/60s.

ClickTrafficLog.referralLinkId là FK tới ReferralLink: một link có 0..* log, mỗi log thuộc một link. Các Store/KOL/product ID trên log là scalar, không tự vẽ thành FK. Redis window và Map RAM không phải bảng Prisma.

## Giám sát

`AdminReferralLinksController.getRateLimitDashboard` có GET `/api/admin/referral-links/rate-limit/dashboard`, giới hạn SYSTEM_ADMIN/SYSTEM_MANAGER; gọi `ReferralLinksService.getRateLimitDashboard` rồi `CacheService.getHealthStatus`. `RedirectController.getRateLimitHealth` khai báo GET `/r/rate-limit/health` và `/api/referral-links/rate-limit/health`; đây là route thực tế đã đọc trong controller. Hai request giám sát được thể hiện ở mức lớp, không ghép vào sequence click của khách.

Health chứa backend Redis/RAM, ngưỡng cấu hình, metrics allowed/blockedSec/blockedMin/degraded, latency/error/timeout, blocked IP, spike và cảnh báo tỷ lệ chặn. Dashboard suy ra HEALTHY/WARNING/DEGRADED. Các bộ đếm request trong CacheService là cục bộ theo process; một số thống kê IP/spike được đồng bộ Redis theo timer, không coi toàn bộ metrics là tổng phân tán chính xác.

## Kiểm tra tài liệu

Đã đối chiếu implementation, đọc test có sẵn `backend/src/modules/referral-links/tests/click-rate-limit.spec.ts` (ngưỡng giây/phút, cạnh cửa sổ, concurrency, multi-instance, fallback). Suite này dùng Redis thật nên không chạy với Redis dùng chung trong tác vụ tài liệu.

Đã chạy hai suite unit có sẵn `referral-links.service.spec.ts` và `client-ip.util.spec.ts` bằng `test/jest-unit.config.cjs`: **48/48 test đạt**. Kết quả này kiểm tra unit liên quan, không thay thế kiểm chứng Lua/multi-instance end-to-end trên Redis thật.

## Kiểm tra bản báo cáo rút gọn

Tái tạo: `node docs/diagrams/build-fr14-diagrams.cjs` hoặc `node docs/diagrams/build-report-diagrams.cjs 14`. Đặc tả nằm trong `fr14-report-spec.json`; bộ bố cục dùng `report-uml-layout.cjs` và helper UML của FR9.

Kiểm tra 9 cặp ngăn class, 23 thông điệp, một trang mỗi file, ID/tham chiếu, giới hạn canvas, đường nối không xuyên lớp hoặc chồng đoạn thẳng cùng hướng; render/xem hai PNG và kiểm tra tràn chữ. Review và XML paste phải khớp bản gốc. Chỉ thay sơ đồ/tài liệu, không thay logic ứng dụng. Kết quả unit test bên trên thuộc lượt đối chiếu trước; không chạy lại test nghiệp vụ cho lần rút gọn này.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR14_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR14_before_word_class_alignment`, `FR14_before_fr09_sequence_layout` và `FR14_compact_before_fr09_layout`.
