# FR-14 — Chống click spam qua Redis Rate Limit

Đối chiếu mã nguồn ngày 2026-10-16. Hai file riêng trong `docs/diagrams`: `FR14_Redis_Click_Rate_Limit_Class_Diagram.drawio` và `FR14_Redis_Click_Rate_Limit_Sequence_Diagram.drawio`. Class được tạo trước sequence bằng `node docs/diagrams/build-fr14-diagrams.cjs`. Sequence một trang, tiếng Anh, trắng đen, không có khung ref/alt/opt ngang; điều kiện được ghi trên từng mũi tên. PNG là bản preview từ geometry, không phải export trực tiếp của diagrams.net.

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
- Kết quả gồm allowed, limitedBy, currentSec/currentMin, remainingSec/remainingMin, resetTimeSec/resetTimeMin, isDegraded. Các kiểu options/result được khai báo inline trong method, không có DTO/class độc lập trong code; sơ đồ đặt tên mô tả cho dễ đọc.
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

`ReferralLinksController.getRateLimitDashboard` có GET `rate-limit/dashboard`, giới hạn SYSTEM_ADMIN/SYSTEM_MANAGER; gọi `ReferralLinksService.getRateLimitDashboard` rồi `CacheService.getHealthStatus`. Service cũng có `getRateLimitHealth`, không suy ra một route public riêng chỉ từ method này.

Health chứa backend Redis/RAM, ngưỡng cấu hình, metrics allowed/blockedSec/blockedMin/degraded, latency/error/timeout, blocked IP, spike và cảnh báo tỷ lệ chặn. Dashboard suy ra HEALTHY/WARNING/DEGRADED. Các bộ đếm request trong CacheService là cục bộ theo process; một số thống kê IP/spike được đồng bộ Redis theo timer, không coi toàn bộ metrics là tổng phân tán chính xác.

## Kiểm tra tài liệu

Đã đối chiếu implementation, đọc test có sẵn `backend/src/modules/referral-links/tests/click-rate-limit.spec.ts` (ngưỡng giây/phút, cạnh cửa sổ, concurrency, multi-instance, fallback). Chưa chạy integration test vì việc này chỉ tạo tài liệu và test yêu cầu Redis thật. Kiểm tra thay đổi bằng parse XML, xác nhận mỗi file có một diagram và xem ảnh render để kiểm tra bố cục. Không thay đổi code nghiệp vụ hoặc cấu hình runtime.
