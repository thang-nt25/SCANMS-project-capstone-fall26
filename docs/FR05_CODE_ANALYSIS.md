# FR-05 — Cấp bậc KOL theo doanh số tháng

Phân tích mã nguồn hiện tại ngày 18/10/2026. Sơ đồ mô tả code trong workspace, không suy diễn dữ liệu database đang chạy và không sửa logic nghiệp vụ.

## Hai sơ đồ

- [Class diagram](diagrams/FR05_KOL_Monthly_Tiering_Class_Diagram.drawio)
- [Sequence diagram](diagrams/FR05_KOL_Monthly_Tiering_Sequence_Diagram.drawio)

Mỗi file có một trang. Class được tạo trước sequence. Sequence gồm luồng cron và luồng KOL xem hạng độc lập, dùng thông điệp có điều kiện thay cho khung ref/alt/loop ngang. Nhánh gọi thủ công được ghi ở cuối trang để không nhầm cron phải đi qua HTTP controller.

## Nguồn đã đối chiếu

- `backend/src/modules/tiers/tiers.service.ts`: tính kỳ, doanh số, chính sách, trạng thái và đánh giá toàn bộ KOL.
- `backend/src/modules/tiers/tiers.controller.ts`: API và guard.
- `backend/src/modules/tiers/tiers.module.ts`, `backend/src/app.module.ts`: đăng ký service và `ScheduleModule.forRoot()`.
- `backend/src/modules/commissions/commission-policy.ts`: `tierBonusByName()`.
- `backend/src/modules/coupons/voucher-pricing.ts`: `goodsDiscount()`.
- `backend/prisma/schema.prisma`: `CollaboratorTier`, `CollaboratorProfile`, `User`, `Order`.
- `backend/prisma/seeds/data/people.data.ts`, `backend/prisma/seeds/identity.seed.ts`: chính sách mẫu.
- `frontend/src/pages/collaborator/KolTierStatusPage.tsx`, `frontend/src/services/tier.service.ts`: web hiện tại.
- `frontend/src/services/api.ts`, `frontend/src/utils/api-cache.utils.ts`: adapter HTTP, token và cache client.
- `backend/src/modules/tiers/tiers.service.spec.ts`: các trường hợp đã có về hạng đang áp dụng, hoàn tiền, kỳ tháng, policy trùng và tăng/giảm hạng.

## Cron và kỳ doanh số

`evaluateAllCollaborators()` có decorator `@Cron('15 0 1 * *', { timeZone: 'Asia/Ho_Chi_Minh' })`: chạy lúc **00:15 ngày 1 mỗi tháng**, xét **tháng lịch trước theo UTC+7**. Không phải tổng doanh số trọn đời hoặc doanh số tháng đang chạy.

Ví dụ chạy ngày 01/10/2026: kỳ là từ 01/09/2026 00:00 đến trước 01/10/2026 00:00 giờ Việt Nam; tương ứng `[2026-08-31T17:00:00Z, 2026-09-30T17:00:00Z)`.

Đơn hàng lọc theo `attributedCollaboratorId = userId`, trạng thái hiện tại thuộc `DELIVERED`, `COMPLETED`, và **createdAt** trong kỳ. Không dùng `deliveredAt` hoặc `completedAt` để xác định tháng. Không lọc Store, KYC hoặc trạng thái hoạt động của User trong engine này.

`previousMonthSales()` đọc trang 500 đơn, sắp `id ASC`, dùng cursor và `skip: 1`; nếu đủ 500 thì tiếp tục. Khoảng tháng được tính lại khi thực hiện từng truy vấn, không được chụp một lần cho cả batch.

## Công thức doanh số

```text
goodsDiscount = max(0, Number(couponDiscountAmount ?? discountAmount ?? 0))
netGoods = max(0, subtotalAmount - goodsDiscount)
paid = max(0, finalAmount)
refund = min(paid, max(0, refundedAmount || 0))
netRevenue = paid > 0 ? netGoods * (paid - refund) / paid : 0
revenue = max(0, sum(netRevenue))
orderCount = số đơn có netRevenue > 0
```

`couponDiscountAmount` được ưu tiên, kể cả khi bằng 0; chỉ fallback `discountAmount` khi null/undefined. Hoàn tiền toàn đơn được phân bổ tỷ lệ cho tiền hàng vì bản ghi không tách phần hoàn hàng/phí vận chuyển. Không lấy `totalEarnedCommission` hoặc `totalOrdersReferred` trên profile làm doanh số xét hạng.

## Chính sách và cập nhật hạng

`getAllTiers()` đọc database theo `minRevenueThreshold ASC`, `createdAt ASC`, `id ASC`. Bonus trả ra được tính lại bằng tên: Diamond/Kim Cương 3%, Gold/Vàng 2%, Silver/Bạc 1%, còn lại 0%. Trường `extraBonusPercentage` có lưu ở database nhưng không quyết định bonus hiệu lực trong service này.

Service loại chính sách trùng theo tên trim/lowercase + threshold dạng Number + bonus theo tên. Không xóa row hoặc thay ID trên database khi đọc catalog.

Seed hiện tại:

| Hạng | Ngưỡng mẫu | Bonus |
| --- | ---: | ---: |
| Đồng | 0 đ | 0% |
| Bạc | 5.000.000 đ | 1% |
| Vàng | 20.000.000 đ | 2% |
| Kim Cương | 50.000.000 đ | 3% |

Đây là **dữ liệu seed**, không khẳng định ngưỡng database đang chạy. Ngưỡng trong unit test khác seed; không dùng fixture test làm chính sách sản phẩm.

Engine đảo danh sách hạng rồi chọn hạng đầu tiên có ngưỡng không vượt doanh số; fallback về hạng thấp nhất. Chỉ cập nhật `CollaboratorProfile.tierId` khi profile chưa có tier hoặc `policyKey` thay đổi. Vì vậy có thể **thăng hoặc hạ hạng**, không chỉ thăng tuần tự qua từng bậc. Hai row cùng policy nhưng khác ID không gây cập nhật dư.

Profiles được xử lý tuần tự. Kết quả trả về `{ message, updatedCount, details }`; details chỉ chứa thay đổi với userId, oldTier, newTier, revenue. Không có transaction bao toàn batch, khóa phân tán, ghi lịch sử xét hạng hay gửi notification trong hàm này. Nếu lỗi giữa batch, các cập nhật trước đó không tự rollback toàn bộ.

## API và giao diện

| API | Bảo vệ | Hành vi |
| --- | --- | --- |
| `GET /api/tiers` | Không guard tại controller | Catalog chuẩn hóa, loại policy trùng |
| `GET /api/tiers/my-status` | JwtAuthGuard | Đọc profile, policy, doanh số tháng trước và tiến độ |
| `POST /api/tiers/evaluate` | JWT + RolesGuard; SYSTEM_ADMIN hoặc SHOP_MANAGER | Gọi engine đánh giá **toàn bộ profiles**, không giới hạn theo Shop |

Cron gọi thẳng service. Web có `triggerEvaluation()` nhưng không tìm thấy nơi gọi trong frontend hiện tại; `KolTierStatusPage` không có nút kích hoạt xét hạng.

Trang `/collaborator/tiers` chạy ba request bằng `Promise.allSettled`: trạng thái hạng, catalog, và podium leaderboard theo `REVENUE/this_month`. Podium là phần phụ với kỳ doanh số riêng; không phải đầu vào cron. Trang có loading, lỗi từng panel, Retry và cờ cancelled để tránh cập nhật state sau khi rời trang.

`currentTier` là hạng đang gán trên profile, fallback hạng thấp nhất nếu null. `qualifiedTier` là hạng đủ ngưỡng theo doanh số tính lại. **GET không ghi tierId**. `nextTier` là hạng đầu tiên có threshold lớn hơn hạng đang áp dụng, không phải lớn hơn qualifiedTier.

Nếu có nextTier: `progressPercentage = clamp(round((revenue-currentThreshold)/(nextThreshold-currentThreshold)*100), 0, 100)`; `revenueNeeded = max(0, nextThreshold-revenue)`. Nếu không có: tiến độ 100%, thiếu 0. Khi đủ điều kiện cao hơn hạng đang gán, UI báo chờ đánh giá để có hiệu lực.

Shared Axios gắn Bearer token và có cache client cho `/tiers`; sequence minh họa nhánh cache miss. Cache hit có thể trả ngay, không gọi controller. Các nhánh status/catalog được vẽ nối tiếp cho dễ đọc nhưng thực tế gửi đồng thời. Response interceptor trả body, sau đó tierService lấy `res.data` theo cấu trúc ứng dụng hiện tại.

## Điểm lệch đang tồn tại

Backend trả `revenueBasis: 'PREVIOUS_MONTH_VIETNAM'`, nhưng interface `TierStatus` frontend vẫn khai báo `'LIFETIME'`; nhãn UI còn ghi “Doanh số tích lũy”. Sơ đồ theo logic backend thực thi và ghi rõ khác biệt, không tự sửa UI hoặc hợp đồng dữ liệu trong tác vụ tài liệu này.

Không có profile hoặc không có chính sách: NotFoundException. Catalog rỗng tự nó trả mảng rỗng; chỉ status/evaluation ném lỗi thiếu cấu hình. Unit tests có xác nhận GET không ghi hạng, phân bổ hoàn tiền, biên tháng Việt Nam và cả thăng/hạ hạng.

## Mở và dán vào Draw.io

Mở đầy đủ file `.drawio` bằng File → Open/Import. Nếu dùng Extras → Edit Diagram, dán toàn bộ nội dung một trong hai file `FR05_Class_Paste.xml`, `FR05_Sequence_Paste.xml`, mỗi file có root `mxGraphModel`. Không dán một đoạn lựa chọn thiếu thẻ đóng. PNG đi kèm là bản preview bằng renderer nội bộ; file Draw.io giữ các phần tử có thể chỉnh sửa.
