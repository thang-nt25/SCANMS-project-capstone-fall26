# BÁO CÁO PHÂN TÍCH CHUYÊN SÂU KIẾN TRÚC, NGHIỆP VỤ, HIỆU NĂNG & GIẢI PHÁP HỆ THỐNG SCANMS

- **Dự án:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết (**Sales Collaborator and Affiliate Network Management System — SCANMS / `FA26SE032`**)
- **Ngày rà soát:** 21/11/2026 (dựa trên codebase thực tế nhánh `main` commit `b0be34dd`)
- **Phạm vi:** Chỉ rà soát, phân tích, phản biện chuyên môn và đề xuất hướng giải quyết — **chưa chỉnh sửa source code**.
- **Lăng kính đánh giá cốt lõi:** Mọi đề xuất đều bám sát bản chất **Enterprise In-House Multi-Store Collaborator & Affiliate Management System** (Doanh nghiệp sở hữu 4 cửa hàng nội bộ quản trị đội ngũ CTV/KOL bên ngoài), tuyệt đối không lạc đề sang sàn TMĐT mở (Shopee/Lazada).

---

## MỤC LỤC NHANH
1. [Giá sàn (`floorPrice`), `minSafePrice` & Rủi ro khi kết hợp Giảm giá](#1-giá-sàn-floorprice-minsafeprice--rủi-ro-khi-kết-hợp-giảm-giá)
2. [Voucher Độc quyền của KOL — Thiết kế biên Min/Max tránh lỗ](#2-voucher-độc-quyền-của-kol--thiết-kế-biên-minmax-tránh-lỗ)
3. [Exclusive Deal tối đa 25%, Cơ chế KPI & Chế tài phạt](#3-exclusive-deal-tối-đa-25-cơ-chế-kpi--chế-tài-phạt)
4. [Hàng mẫu (Sample Request) cho KOL & SLA 14 ngày nộp link Review](#4-hàng-mẫu-sample-request-cho-kol--sla-14-ngày-nộp-link-review)
5. [Nguyên nhân gây Lag / Khựng (Customer & Shop Manager) & Lỗ hổng Cache](#5-nguyên-nhân-gây-lag--khựng-customer--shop-manager--lỗ-hổng-cache)
6. [Lỗ hổng & Bug tiềm ẩn trên 5 Main Workflows (WF-01 → WF-05)](#6-lỗ-hổng--bug-tiềm-ẩn-trên-5-main-workflows-wf-01--wf-05)
7. [Kế hoạch gỡ bỏ hoàn toàn Livestream (Impact Audit & Checklist)](#7-kế-hoạch-gỡ-bỏ-hoàn-toàn-livestream-impact-audit--checklist)
8. [Cờ "Mở tiếp thị" (`isAffiliateEnabled`) — Tác động thực tế & Khuyến nghị](#8-cờ-mở-tiếp-thị-isaffiliateenabled--tác-động-thực-tế--khuyến-nghị)
9. [Validation tạo sản phẩm & Khóa ngành hàng (`Category Lock`)](#9-validation-tạo-sản-phẩm--khóa-ngành-hàng-category-lock)
10. [Đối chiếu Hợp đồng FE ↔ BE (Contract Drift gây lỗi 400/404)](#10-đối-chiếu-hợp-đồng-fe--be-contract-drift-gây-lỗi-400404)
11. [Lộ trình ưu tiên xử lý trước khi bảo vệ (P0 / P1 / P2)](#11-lộ-trình-ưu-tiên-xử-lý-trước-khi-bảo-vệ-p0--p1--p2)

---

## 1. Giá sàn (`floorPrice`), `minSafePrice` & Rủi ro khi kết hợp Giảm giá

### 1.1. Thực trạng code hiện tại
- **Schema (`backend/prisma/schema.prisma:626-630, 717-719`):** `Product` có `originalPrice`, `price`, `listPrice`, `floorPrice`; `ProductVariant` có `price`, `listPrice`, `floorPrice`. Không có cột `costPrice`.
- **Công thức `minSafePrice` (`backend/src/modules/pricing/pricing-math.ts:9-20` & `frontend/src/utils/pricing-math.ts:9-20`):**
  $$\text{minSafePrice} = \left\lceil \frac{\text{floorPrice}}{(1 - 10\%) \times (1 - 25\%)} \right\rceil = \left\lceil \frac{\text{floorPrice}}{0.675} \right\rceil \approx 1.4815 \times \text{floorPrice}$$
- **Chỗ đang KHÓA CỨNG:**
  - `ProductsService.create` (`products.service.ts:1322-1343`) & `update` (`:1629-1640`) & FE Step 2 (`ProductManagementPage.tsx:758-769`): **Chặn cứng** không cho tạo/sửa nếu `price < minSafePrice`.
- **Chỗ đang HỞ / KHÔNG ĐỒNG BỘ:**
  1. `ProductsService.syncVariants` (`products.service.ts:2040-2055`): Có comment `// assertFloor removed` → **không kiểm tra cả `floorPrice` lẫn `minSafePrice`**! Shop Manager có thể tạo giá cao rồi cập nhật biến thể hạ giá xuống dưới cả `floorPrice`.
  2. `ProductsService.moderateProduct` (`products.service.ts:1055-1146`): Khi `SYSTEM_MANAGER` duyệt sản phẩm mới, **hoàn toàn không kiểm tra giá hay cảnh báo biên lợi nhuận**.
  3. `PricingService.create` (`pricing.service.ts:210-277`) & `reservePromotionBudget` (`pricing-policy.ts:160-164`): Cho phép tạo chương trình giảm giá `ProductPricePromotion` thấp hơn `minSafePrice` và thậm chí **thấp hơn cả `floorPrice`** (chỉ gắn cờ `isClearanceBelowSafeFloor` để đẩy lên `SYSTEM_ADMIN` duyệt). Tại checkout cũng không chặn.

### 1.2. Phản biện chuyên môn & Các trường hợp rủi ro nếu bỏ khóa `minSafePrice` khi tạo sản phẩm
**Đánh giá ý định của bạn:** Việc **nới lỏng khóa cứng `price >= minSafePrice` thành `price >= floorPrice` kèm cảnh báo** là **HỢP LÝ về mặt kinh doanh thực tế**, vì hệ số `1.4815×` giả định *mọi đơn hàng đều ăn cùng lúc mức tệ nhất (Voucher 10% + Deal trần 25%)* — điều này khiến các ngành hàng biên lợi nhuận trung bình (như gia dụng Lumière) bị ép giá bán quá cao, khó tạo sản phẩm.

**TUY NHIÊN, nếu mở lỏng lúc tạo mà không dựng chốt chặn ở tầng Giảm giá + Voucher + Duyệt sản phẩm, 4 kịch bản rủi ro sau CHẮC CHẮN sẽ xảy ra:**

| Kịch bản | Diễn biến cụ thể | Hậu quả tài chính |
| :--- | :--- | :--- |
| **Case 1: Lỗ kép khi cộng dồn Giảm giá + Voucher KOL + Deal 25%** | Sản phẩm có `floorPrice = 100k`, Shop đặt `price = 110k` (hợp lệ vì `>= 100k`). Sau đó tạo Promo giảm xuống `100k`, khách áp thêm Voucher KOL `10%` (còn `90k`) và KOL có Deal `25%` (`22.5k`). | Thực thu ròng của doanh nghiệp còn `67.5k` (**lỗ 32.5k/sp so với giá sàn**, mất 32.5% giá trị sàn!). |
| **Case 2: `SYSTEM_MANAGER` duyệt "mù"** | Shop Manager tạo 20 biến thể có giá sát `floorPrice` (bỏ qua cảnh báo vàng). Khi đẩy lên `SYSTEM_MANAGER` duyệt sản phẩm, màn hình duyệt hiện tại không hiện cờ cảnh báo biên lợi nhuận. | Sản phẩm biên mỏng lọt ra thị trường, không ai biết cho đến khi kết sổ lỗ. |
| **Case 3: Lách luật qua `syncVariants`** | Shop tạo sản phẩm giá `150k`, sau đó gọi sửa biến thể (`PUT /products/:id/variants`) hạ giá xuống `80k` (`< floorPrice = 100k`). | Phá vỡ hoàn toàn giá sàn doanh nghiệp mà không qua `SYSTEM_ADMIN`. |
| **Case 4: Hết hạn Promo khôi phục giá bị lỗi** | Nếu `listPrice` thấp hơn `floorPrice` hoặc bị sửa sai, `reconcileProductPrice` sẽ báo lỗi hoặc khôi phục giá sai. | Kẹt trạng thái khuyến mãi. |

### 1.3. Hướng giải quyết đề xuất (Phòng thủ 3 lớp — Mềm lúc tạo, Chặt lúc giảm)
1. **Lớp 1 — Lúc Tạo/Sửa Sản phẩm (`create`, `update`, `syncVariants`):**
   - **Khóa cứng duy nhất:** `price >= floorPrice` và `listPrice >= floorPrice` (áp dụng đồng nhất cho cả `syncVariants`, bịt lỗ hổng hiện tại).
   - **Cảnh báo mềm (Soft Warning):** Nếu `floorPrice <= price < minSafePrice`, **vẫn cho phép tạo**, nhưng:
     - Hiển thị cảnh báo vàng rõ ràng trên FE: *"Giá bán thấp hơn ngưỡng an toàn (`minSafePrice`). Nếu áp đồng thời Voucher KOL tối đa và Deal 25%, doanh nghiệp có thể hụt tối đa `X ₫/sản phẩm` so với giá sàn."*
     - Gắn cờ cảnh báo `lowMarginWarning: true` (hoặc tính động) hiển thị nổi bật ngay tại màn hình duyệt sản phẩm của `SYSTEM_MANAGER` để người duyệt cân nhắc.
2. **Lớp 2 — Lúc Tạo Giảm giá trực tiếp (`ProductPricePromotion`):**
   - Tách rõ **2 mức kiểm soát**:
     - `proposedPrice >= minSafePrice`: `SYSTEM_MANAGER` tự duyệt.
     - `floorPrice <= proposedPrice < minSafePrice`: Hiển thị bảng mô phỏng lỗ tối đa → **Yêu cầu `SYSTEM_ADMIN` duyệt** HOẶC bắt buộc tắt quyền cộng dồn Voucher KOL (`stackableWithKolCoupon = false`) trong suốt thời gian chạy Promo.
     - `proposedPrice < floorPrice` (Xả hàng dưới sàn): **Chỉ `SYSTEM_ADMIN` duyệt** + **tự động khóa cộng dồn Voucher KOL** + khóa mức hoa hồng về tiêu chuẩn (`10% + Bậc`, không cộng dồn Deal) để cắt lỗ an toàn.
3. **Lớp 3 — Lúc Checkout:**
   - Không chặn thanh toán đột ngột làm gãy trải nghiệm khách hàng, nhưng ghi log kiểm toán (`AuditLog`) nếu phát sinh đơn có `netRealized < floorPrice` (chỉ có thể xảy ra với đơn Clearance đã được Admin duyệt).

---

## 2. Voucher Độc quyền của KOL — Thiết kế biên Min/Max tránh lỗ

### 2.1. Thực trạng code hiện tại (đang mâu thuẫn giữa BE và FE)
- **BE `approveCoupon` (`coupons.service.ts:1508-1516`):** Khóa cứng `PERCENTAGE` trong khoảng `0 < discountValue <= 10%`. Nhưng `FIXED_AMOUNT` **không có trần** (chỉ `@IsPositive()`), và `updateCouponPolicy` (`:1810-1811`) **quên kiểm tra lại trần 10%** khi chỉnh sửa voucher đang chạy!
- **FE đang "trống đánh xuôi, kèn thổi ngược":**
  - `ProposeCouponInChatModal.tsx:236-265`: Khóa cứng KOL chỉ được chọn 2 nút **`5%`** hoặc **`10%`**.
  - `CouponProposalCardBubble.tsx:247-248`: Cho Shop Manager nhập `min={1}` đến `max={20}` (nhập 15% gửi lên BE sẽ bị lỗi `400`).
  - `KolCouponManagement.tsx:143`: Cho nhập đến `100%`.
- **Lỗi kiểm tra sàn theo biến thể:** `coupons.service.ts:2569` query `dbVariants` thiếu cột `floorPrice`, khiến dòng `:2765` (`variant?.floorPrice`) luôn là `undefined` và bỏ sót giá sàn của biến thể.
- **Chi phí & Tính hoa hồng:** Voucher KOL 100% do cửa hàng chịu (`SHOP_FUNDED`), hoa hồng KOL tính trên `netGoods` (sau khi trừ voucher).

### 2.2. Phản biện & Thiết kế biên Min/Max chuẩn cho cả KOL và Shop Manager
- Việc chỉ cho chọn `5%` hoặc `10%` là quá cứng nhắc, không phản ánh thực tế đa ngành hàng (Mỹ phẩm/Thực phẩm sức khỏe biên cao có thể giảm 15–20%, Gia dụng biên mỏng chỉ nên giảm 3–8%).
- Tuy nhiên, nếu mở tự do mà không gắn với biên an toàn, Shop Manager và KOL có thể thỏa thuận voucher quá sâu gây âm biên lợi nhuận.

### 2.3. Hướng giải quyết đề xuất (Cơ chế 2 tầng + Trần tiền tuyệt đối)
1. **Quy định khung đề xuất cho KOL (trên FE & BE):**
   - **Loại phần trăm (`PERCENTAGE`):**
     - **Tối thiểu (Min):** `3%` (hoặc `5%`) để mã thực sự có ý nghĩa khuyến khích mua hàng.
     - **Tối đa (Max):** Mở rộng lên **`20%`** (hoặc `25%` trần tuyệt đối hệ thống).
     - **Bắt buộc khai báo `maximumDiscountAmount`** (số tiền giảm tối đa/đơn, vd `100.000₫` / `200.000₫`) để chặn rủi ro đơn hàng giá trị quá lớn.
   - **Loại giảm tiền cố định (`FIXED_AMOUNT`):**
     - **Tối thiểu (Min):** `10.000₫`.
     - **Ràng buộc chống lỗ:** Bắt buộc `minimumOrderAmount > 0` và `discountValue / minimumOrderAmount <= 20%` (tương đương trần % để không lách luật bằng `FIXED_AMOUNT`).
2. **Phân quyền duyệt 2 cấp (đồng bộ tư duy với Exclusive Deal):**
   - **`<= 10%` (hoặc `<= 12%`)**: `SHOP_MANAGER` tự duyệt ngay (nếu vẫn còn biên an toàn trên sản phẩm chủ lực).
   - **`> 10%` đến `20%`**: `SHOP_MANAGER` chấp thuận bước 1 → chuyển **`SYSTEM_ADMIN` phê duyệt ngoại lệ** (tương tự Deal `> 16%`).
3. **Cơ chế tự cân bằng lợi ích giữa KOL & Shop Manager:**
   - Vì hoa hồng KOL tính trên `netGoods` (doanh thu sau giảm giá), bản thân hệ thống đã có sẵn cơ chế cân bằng: KOL đòi voucher càng cao thì đơn giá tính hoa hồng của chính KOL càng giảm. Trên UI đàm phán, nên hiện luôn bảng mô phỏng nhanh: *"Với đơn 1.000.000₫, Voucher 15% → Khách trả 850.000₫ → Hoa hồng KOL (16%) = 136.000₫ → Doanh thu ròng sau hoa hồng của Shop = 714.000₫"*.
4. **Vá 2 lỗ hổng kỹ thuật:**
   - Bổ sung kiểm tra trần vào `updateCouponPolicy` (không cho sửa lách trần).
   - Bổ sung `floorPrice: true` vào query `dbVariants` ở `coupons.service.ts:2569`.

---

## 3. Exclusive Deal tối đa 25%, Cơ chế KPI & Chế tài phạt

### 3.1. Thực trạng code hiện tại
- **Trần Deal & Phân quyền (`deal-proposal-creation.ts:28-30`, `exclusive-deal-activation.ts:206-275`):**
  - Mức Deal: **`10% – 25%`**, không cộng dồn với Bậc KOL.
  - `<= 16%`: Shop Manager tự duyệt / KOL chấp thuận là kích hoạt ngay.
  - `> 16%` đến `25%`: Chuyển `PENDING_ADMIN_APPROVAL`, bắt buộc `SYSTEM_ADMIN` duyệt (có Maker-Checker và lý do `>= 10` ký tự).
- **Thiết kế KPI hiện tại (`schema.prisma:1170-1186`, `deal-kpi.policy.ts:55-254`):**
  - Dùng **KPI Doanh số (`targetRevenue`)** tính trên `netGoods` của các đơn `DELIVERED` / `COMPLETED` có `refundedAmount === 0` (tự động loại trừ đơn hủy/hoàn tiền).
  - Thời gian: `[commitmentStartedAt, commitmentEndsAt)` + thêm **14 ngày đối soát đổi trả (`settlementEndsAt = commitmentEndsAt + 14d`)**.
  - Tiến độ được tính động (`calculateProgress`) mỗi khi đọc.
- **Giải ngân 2 giai đoạn (`commissions.service.ts:237-275`, `affiliate-deals.service.ts:1657-1831`):**
  - Giai đoạn 1 (`10% + Bậc`): Về `pendingBalance` → mở khóa sang `availableBalance` sau 14 ngày không hoàn trả.
  - Giai đoạn 2 (`Deal% - (10% + Bậc)`): Giữ ở `conditionalDealEscrowBalance` (`PENDING_KPI`) → mở khóa khi đạt đủ 100% KPI và đơn đã qua 14 ngày.
- **Chế tài khi KHÔNG hoàn thành KPI (`terminateDeal`, `affiliate-deals.service.ts:1341-1570`):**
  - **ĐÃ CÓ CHẾ TÀI PHẠT**, không chỉ mất tiền thưởng treo:
    1. **Tịch thu phần thưởng chênh lệch (`FORFEITED`):** Hủy toàn bộ `conditionalDealEscrowBalance` của Deal đó. KOL vẫn giữ trọn `10% + Bậc`.
    2. **Khóa công cụ của Deal:** Chuyển toàn bộ `ReferralLink` của Deal sang `BLOCKED` và tạm dừng `Coupon` gắn với Deal (`PAUSED`).
    3. **Phạt Cooldown leo thang 4 cấp:** Tăng `dealViolations.count` và khóa quyền đề xuất Deal mới trong **`1 tuần → 2 tuần → 3 tuần → tối đa 4 tuần`**.

### 3.2. Đánh giá chuyên môn
1. **Trần 25% có hợp lý không?**
   - **CÓ — RẤT HỢP LÝ** với mô hình **In-House Enterprise D2C** (doanh nghiệp tự sở hữu 4 nhãn hàng nội bộ). Trong thực tế thị trường Việt Nam (Mỹ phẩm, Thời trang D2C, TPCN), chi phí Affiliate 15–25% cho Top KOL có cam kết doanh số là mức chuẩn.
   - Cơ chế an toàn đã rất chặt: muốn vượt `16%` phải có `SYSTEM_ADMIN` duyệt, và phần chênh lệch bị treo Escrow 100% cho tới khi đạt KPI sạch (đã trừ hoàn trả 14 ngày). Doanh nghiệp không bị rủi ro chi trước.
2. **Các lỗ hổng đang tồn tại trong cơ chế KPI cần xử lý:**
   - **Thiếu Cron tự động chốt Deal hết hạn:** Hiện tại `settleSuccessfulDeal` và `terminateDeal` phải bấm tay. Nếu Shop quên bấm, tiền `conditionalDealEscrowBalance` hoặc trạng thái `REVIEW_REQUIRED` cứ treo mãi.
   - **Lưu `dealViolations` trong `socialLinksJson` (`affiliate-deals.service.ts:1465-1506`):** Rất nguy hiểm vì nếu luồng cập nhật hồ sơ MXH ghi đè object `socialLinksJson` thì lịch sử vi phạm + cooldown của KOL sẽ bị xóa sạch!
   - **Race condition treo tiền vĩnh viễn** giữa `settleSuccessfulDeal` và `approveMatureCommission` (chi tiết ở Mục 6 — WF-05).

### 3.3. Hướng giải quyết đề xuất
- **Giữ nguyên trần `25%`, ngưỡng Admin `> 16%`, giải ngân 2 giai đoạn và phạt Cooldown 1–4 tuần** (đây là điểm sáng ăn điểm lớn nhất khi bảo vệ đồ án).
- Tách `dealViolationCount` và `dealCooldownUntil` thành cột riêng trên `CollaboratorProfile` (không nhét chung vào `socialLinksJson`).
- Bổ sung Cron hằng ngày tự động gọi `settleSuccessfulDeal` khi `state === 'ACHIEVED'` và gửi thông báo nhắc/tự động chốt `terminateDeal` khi quá `settlementEndsAt`.

---

## 4. Hàng mẫu (Sample Request) cho KOL & SLA 14 ngày nộp link Review

### 4.1. Thực trạng code hiện tại
- **Giao vận hàng mẫu (`ghn.service.ts:644-869`):** Đã tích hợp tạo vận đơn GHN (`cod_amount = 0`, Shop trả ship), có bảng `SampleShippingCharge`, `GhnTrackingRecord`, `SampleRequestEvent`.
- **So sánh với luồng giao hàng của Customer:**
  - *Giống:* Cùng dùng GHN LIVE/TEST, cùng in mã A6 và lưu `GhnTrackingRecord`.
  - *Khác:* Hàng mẫu **không có** luồng trả hàng/đổi hàng, không có upload ảnh/video bằng chứng nhận hàng hỏng, không có khiếu nại đền bù GHN. Đặc biệt, KOL **bị khóa cứng nút xác nhận đã nhận hàng** (`PATCH /sample-requests/:id/receive` luôn ném `400 BadRequestException` tại `samples.service.ts:681-686`).
- **Cron SLA 14 ngày (`samples.service.ts:1371-1579`):** Chạy mỗi giờ (`EVERY_HOUR`), nhắc KOL trước 24h, nhắc Shop trước 48h, quá hạn tự chuyển trạng thái `OVERDUE`.
- **Phạt khi KOL không nộp link review:** **KHÔNG CÓ PHẠT TỰ ĐỘNG.** Quá hạn chỉ đổi sang `OVERDUE`. KOL vẫn có thể gửi yêu cầu xin hàng mẫu ở sản phẩm khác thoải mái cho đến khi Shop bấm báo cáo vi phạm (`report-violation`) **VÀ** Admin bấm khóa thủ công (`BLOCK_SAMPLE_REQUESTS`).
- **4 Bug nghiêm trọng phát hiện trong code hiện tại:**
  1. **Đơn ship ngoài GHN bị kẹt vĩnh viễn ở `SHIPPED`:** `shipRequest()` cho phép nhập hãng vận chuyển khác (GHTK, ViettelPost...), nhưng vì GHN không cập nhật được còn nút `/receive` bị khóa cứng → đơn không bao giờ sang `RECEIVED` và không bao giờ kích hoạt SLA 14 ngày!
  2. **Nút chết trên FE & Mobile:** `ShopCollaborationPage.tsx:1060-1068` và `Mobile/src/features/samples/SamplesScreen.tsx:192-194` vẫn đang gọi `PATCH /sample-requests/:id/receive` (bấm vào chắc chắn lỗi `400`).
  3. **`resolveRequestAsAdmin` (`EXTEND_DEADLINE`)** quên reset `overdueAt = null` và `shopReminderSentAt = null`.
  4. **`CANCEL_OBLIGATION`** quên hoàn lại `sampleGrantedCount` cho sản phẩm/biến thể.

### 4.2. Phản biện thẳng thắn: Có nên bỏ nhẹ hàng mẫu để tập trung vào Customer không?
> [!IMPORTANT]
> **KHUYẾN NGHỊ CHUYÊN MÔN: TUYỆT ĐỐI KHÔNG BỎ LUỒNG QUẢN LÝ HÀNG MẪU THÀNH NHẮN TIN THỦ CÔNG!**

- **Vì sao?** Tên đề tài của bạn là **Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết**. Trọng tâm mà Hội đồng đánh giá là **cách doanh nghiệp quản trị, kiểm soát chi phí và đo lường hiệu suất đội ngũ KOL/CTV** — KHÔNG PHẢI làm một sàn mua sắm đẹp cho Customer!
- Nếu luồng Customer mua hàng làm siêu chi tiết còn luồng cấp hàng mẫu cho KOL (một nguồn thất thoát chi phí rất lớn trong thực tế Affiliate) lại đẩy ra nhắn tin thủ công, hệ thống sẽ bị **lệch trọng tâm sang sàn TMĐT**.
- **Tuy nhiên**, bạn **KHÔNG CẦN** làm giao nhận hàng mẫu nặng nề như Customer (không cần đổi trả 1-1, không cần hoàn tiền, không cần tranh chấp nhiều vòng).

### 4.3. Hướng giải quyết đề xuất (Gọn vận hành — Chặt chế tài SLA)
1. **Giữ luồng GHN chuẩn, bỏ nhánh non-GHN gây kẹt** (hoặc nếu giữ non-GHN thì chỉ mở `/receive` cho đơn không dùng GHN). Gỡ bỏ nút gọi `/receive` chết trên Web & Mobile với đơn GHN.
2. **Bổ sung Chế tài SLA tự động (Zero-Trust đối với hàng mẫu):**
   - Trong `getEligibility()` & `createRequest()`: **Tự động khóa quyền xin mẫu mới** nếu KOL đang có bất kỳ đơn hàng mẫu nào ở trạng thái `OVERDUE` (`overdueRequests.length > 0`) — tự động mở lại ngay khi KOL nộp link review bổ sung được duyệt (hoặc Admin gỡ).
   - Nếu KOL tích lũy `>= 2` lần quá hạn không giải trình → tự động gắn cờ `sampleRequestsBlockedAt` (chỉ Admin mới được mở khóa) và trừ điểm uy tín trong AI Matching.
3. **Tách khỏi `Media Hub`:** Vì Media Hub đã bãi bỏ, cần kiểm tra tách bảng lưu video nghiệm thu hàng mẫu khỏi các màn hình quản lý Media Hub cũ để không bị kéo theo code thừa.

---

## 5. Nguyên nhân gây Lag / Khựng (Customer & Shop Manager) & Lỗ hổng Cache

Codebase hiện tại **ĐÃ CÓ Redis (`CacheService`)**, nhưng đang bị **6 lỗi kiến trúc hiệu năng nghiêm trọng** làm cả luồng Customer mua hàng lẫn thao tác của Shop Manager bị lag, khựng và quá tải DB/Redis:

### 5.1. Nguyên nhân gây Lag ở luồng Customer mua hàng
| # | Vị trí code | Nguyên nhân gốc rễ | Mức độ |
| :--- | :--- | :--- | :--- |
| 1 | `GuestCheckoutModal.tsx:842-880` + `ghn.service.ts:289-355` | **`shippingAddress` (số nhà/tên đường) nằm trong `useEffect` dependency:** Cứ gõ phím địa chỉ sau 350ms là FE bắn `POST /shipping/ghn/quote-address` ra thẳng API GHN bên ngoài! Ở BE, `calculateShippingFee` **không cache**, còn `quoteAddress` gọi `resolveGhnLocation` **tuần tự** (tối đa 6 HTTP request nối tiếp ra GHN trước khi tính phí). | **Cực nặng (P0)** |
| 2 | `CartContext.tsx:126-166` + `customer.service.ts:937-939` | **Khóa DB mỗi lần chuyển tab trình duyệt:** `window.addEventListener('focus', syncIdentity)` gọi `getCart()` + `syncCart()` mỗi khi người dùng quay lại tab. Ở BE, `syncCart` khóa dòng `users` bằng `SELECT ... FOR UPDATE`, xóa sạch `cart_items` rồi insert lại từ đầu. | **Nặng (P0)** |
| 3 | `products.service.ts:2601-2602` + `schema.prisma:1969-1983` | **Full Table Scan bảng `audit_logs` khi mở trang chi tiết sản phẩm:** `getLandingPageData()` truy vấn `audit_logs` theo `action = 'PRODUCT_REVIEW_REPLY'` + JSON path `details.productId`, nhưng `audit_logs` **không có index trên `action`**! Ngoài ra cache key lại ghép thêm `visitorIdHash` nên hầu như luôn miss cache với khách mới. | **Nặng (P0)** |
| 4 | `ProductDetailPage.tsx:764-792` | **Gọi thừa API tồn kho + Polling 30s:** Vừa load xong `getLandingPageData` lại bắn ngay thêm `GET /public/products/:id/stock` (`x-skip-cache: true`), lặp lại mỗi 30 giây và mỗi khi focus tab. | **Trung bình (P1)** |
| 5 | `customer.service.ts:375, 419-453` + `CustomerPortalPage.tsx:406,452,472` | `getOrders()` **không phân trang**, `include` 5 cấp + `rawPayload` JSONB khổng lồ + đồng bộ GHN simulation trực tiếp trong request đọc; FE còn chạy cùng lúc **3 `setInterval`**. | **Nặng (P1)** |

### 5.2. Nguyên nhân gây Lag ở thao tác của Shop Manager & Toàn hệ thống
| # | Vị trí code | Nguyên nhân gốc rễ | Mức độ |
| :--- | :--- | :--- | :--- |
| 1 | `OrdersManagementPage.tsx:405-461` (2.926 dòng) | **Bug polling bypass cache vĩnh viễn:** Sau lần refresh tay đầu tiên, `isManualFresh = ordersRefreshCount > 0` kẹt ở `true` mãi mãi → **mỗi 10 giây** bắn request `fresh=true` bỏ qua hoàn toàn Redis, chạy 5 câu `order.count()` + 1 query `findMany` 6 quan hệ, gây re-render toàn trang khổng lồ 2 lần/chu kỳ. | **Cực nặng (P0)** |
| 2 | `cache.service.ts:258-268` + `orders.service.ts` + `ghn.service.ts:621` | **Dùng lệnh `redis.keys(prefix*)` gây đóng băng Redis:** `KEYS *` là lệnh $O(N)$ chặn luồng duy nhất của Redis mỗi khi tạo/cập nhật sản phẩm hay đơn hàng. Lại còn xóa toàn cục `orders:store:` của mọi shop thay vì `orders:store:${storeId}:`. | **Cực nặng (P0)** |
| 3 | `stores.service.ts:189-257` | **`getMyStore()` đọc cache nhưng QUÊN ghi cache:** Có `cache.get()` ở dòng 190 nhưng không hề có `cache.set()` trước khi `return` → 100% miss cache ở mọi trang của Shop Manager! | **Nặng (P0)** |
| 4 | `ShopDashboardPage.tsx:209-256` + `dashboard.service.ts` | Bắn 10 request cùng lúc khi vào Dashboard, gọi trùng `getMyStoreOrders` 2 lần, tải nguyên danh sách Deals và Samples không phân trang chỉ để đếm `.length`. Ở BE, `dashboard.service.ts` tải **toàn bộ raw rows** `clickTrafficLog`, `order`, `orderItem`, `commission` vào RAM Node.js thay vì dùng SQL `GROUP BY`. | **Nặng (P1)** |
| 5 | `ExclusiveDealCardBubble.tsx:76-103` + `NotificationDropdown.tsx:186` | Mỗi thẻ Deal trong khung chat tự gắn 1 listener `focus`/`connect` và bắn API `x-skip-cache` riêng (10 thẻ Deal = 10 API cùng lúc khi chuyển tab). `NotificationDropdown` poll 10 giây/lần trên mọi trang. | **Trung bình (P1)** |
| 6 | `schema.prisma` (Thiếu Index) | Thiếu composite index trên các bảng nóng: `AuditLog(action, createdAt)`, `Order(storeId, status, createdAt DESC)`, `Order(customerId, createdAt DESC)`, `Commission(dealProposalId, dealBonusStatus)`, `ChatMessage(conversationId, createdAt DESC)`, `CollaboratorProfile(kycStatus)`. | **Nặng (P0)** |
| 7 | `ProductManagementPage.tsx` (4.779 dòng) + `GuestCheckoutModal.tsx` (2.248 dòng) | Component nguyên khối quá lớn, rất ít memoization (`React.memo`, `useMemo`) và chỉ dùng `@tanstack/react-query` ở 22 chỗ toàn app → mỗi lần gõ phím trong form hoặc nhận state mới làm React diff lại hàng nghìn DOM node gây cảm giác "khựng". | **Nặng (P1)** |

### 5.3. Hướng giải quyết tối ưu hiệu năng (nhanh & thấy hiệu quả ngay)
1. **Sửa ngay 4 điểm P0 ở FE:**
   - Bỏ `shippingAddress` khỏi dependency của `useEffect` tính phí GHN trong `GuestCheckoutModal` (chỉ trigger khi đổi `provinceId`, `districtId`, `wardCode`, hoặc `items`).
   - Sửa `OrdersManagementPage`: chỉ truyền `fresh=true` trong lần bấm tay đó, không giữ cờ `fresh=true` cho interval 10s (tốt nhất tăng interval lên 30–60s hoặc dùng Socket.IO push).
   - Bỏ `syncCart()` khỏi `window.focus` trong `CartContext` (chỉ sync khi thực sự thao tác giỏ hàng).
   - Gỡ bỏ `setInterval` 1 giây (của Livestream) và bỏ `x-skip-cache` thừa trong `ProductDetailPage` & `ExclusiveDealCardBubble`.
2. **Sửa ngay 4 điểm P0 ở BE & DB:**
   - Thay `redis.keys()` bằng `SCAN` iterator trong `CacheService.delPrefix()` và thu hẹp scope invalidation theo `storeId`.
   - Thêm `cache.set()` cho `StoresService.getMyStore()`; cache `calculateShippingFee` theo key `(storeId, toDistrictId, toWardCode, totalWeight, insuranceValue)` TTL 10–15 phút; chuyển `resolveGhnLocation` sang `Promise.all` + lưu master data GHN vào Redis (TTL 24h).
   - Thêm 6 composite index đã liệt kê vào `schema.prisma` (đặc biệt là `AuditLog` và `Order`).
   - Phân trang cho `CustomerService.getOrders()`, `SamplesService`, `AffiliateDealsService`, và dùng `COUNT(*)` / `GROUP BY` cho Dashboard thay vì load full table.

---

## 6. Lỗ hổng & Bug tiềm ẩn trên 5 Main Workflows (WF-01 → WF-05)

| Workflow | Lỗ hổng / Bug phát hiện trong code | Vị trí | Hướng khắc phục |
| :--- | :--- | :--- | :--- |
| **WF-01** (Store, Nhân sự, KOL eKYC) | 1. **`getMyStore()` tự động tạo Store rác** nếu user gọi API mà chưa có Store — vi phạm nghiêm trọng quy tắc chỉ `SYSTEM_ADMIN` mới được tạo Store.<br>2. **`createInternalStaff()` ghi đè `store.ownerId`** khi tạo `SHOP_MANAGER` thứ 2 cho cùng 1 Store, có thể làm mất quyền manager cũ.<br>3. **`reviewKolApplication()` không bọc `$transaction`** (4 lệnh tách rời, dễ gây lệch role vs trạng thái KYC) và **không lưu/kiểm tra `reviewerId` (thiếu Maker-Checker)**.<br>4. Còn sót code & route `applyShopUpgrade` / `PATCH /kyc/admin/shop/:id/review`. | `stores.service.ts:220-255`<br>`users.service.ts:176-193`<br>`kyc.service.ts:621-781`<br>`kyc.controller.ts:98-107` | Xóa logic auto-create Store (trả `404`/`403`); không ghi đè `ownerId` nếu Store đã có owner; bọc `$transaction` + kiểm tra `reviewerId !== userId` khi duyệt eKYC; xóa sạch code `shop upgrade` cũ. |
| **WF-02** (Sản phẩm, Giá sàn, AI Matching, Deal) | 1. **`syncVariants()` bỏ qua kiểm tra `floorPrice`/`minSafePrice`**.<br>2. **`settleSuccessfulDeal()` fallback path ghi sai tên cột Prisma** (`bucket` thay vì `balanceBucket` → crash nếu chạy vào nhánh fallback) và **không xóa cache Deal** sau khi tất toán.<br>3. `invalidateMarketplaceCache()` không xóa `products:shop:top:*`. | `products.service.ts:2040-2055, 82-92`<br>`affiliate-deals.service.ts:1657-1831` | Bổ sung check `floorPrice` ở `syncVariants`; sửa tên cột thành `balanceBucket`; bổ sung `delPrefix` đầy đủ sau mutation. |
| **WF-03** (Hàng mẫu, Link/QR/Coupon, Tạo đơn) | 1. **`createMultiStoreOrders()` hủy đơn dang dở KHÔNG hoàn tồn kho, KHÔNG hoàn lượt/ngân sách Coupon, KHÔNG hoàn ví mua sắm** (`updateMany` thẳng sang `CANCELLED`).<br>2. **`SamplesService` cache 30s không bao giờ invalidate** sau duyệt/từ chối/giao hàng.<br>3. Đơn hàng mẫu ngoài GHN kẹt vĩnh viễn ở `SHIPPED`. | `orders.service.ts:2529-2544`<br>`samples.service.ts:390-410, 637-686` | Gọi hàm hủy đơn chuẩn có hoàn stock/coupon/wallet khi recover multi-store; invalidate `samples:shop:${storeId}` sau mọi mutation; xử lý dứt điểm nhánh non-GHN. |
| **WF-04** (Giao vận GHN, Đổi trả 14 ngày, KPI) | 1. **Double GHN Waybill Race Condition:** `createShippingOrder()` gọi API GHN tạo vận đơn **trước khi khóa DB** (không có `pg_advisory_xact_lock` như Sample) → 2 cú click nhanh tạo 2 vận đơn GHN thật tốn phí kép.<br>2. **Đơn đổi trả bị Shop từ chối làm TREO HOA HỒNG KOL VĨNH VIỄN:** `approveMatureCommission()` chặn giải ngân nếu `returnRequest.status` không nằm trong `['CLOSED', 'EXPIRED', 'COMPLETED']` — **thiếu `SHOP_REJECTED` và `INSPECTION_REJECTED`**! | `ghn.service.ts:379-618`<br>`commissions.service.ts:503-510` | Bổ sung `pg_advisory_xact_lock` giống `createSampleShippingOrder` trước khi gọi API GHN; bổ sung `SHOP_REJECTED` & `INSPECTION_REJECTED` (khi đã hết hạn khiếu nại) vào whitelist cho phép giải ngân hoa hồng. |
| **WF-05** (Quyết toán 2 giai đoạn, Rút tiền thuế 10%, Sổ cái) | 1. **Lost-Update Race Condition làm kẹt tiền KPI vĩnh viễn:** `settleSuccessfulDeal()` khóa bảng `collaborator_profiles`, còn `approveMatureCommission()` khóa bảng `orders` + `commissions`. Nếu chạy song song đúng ngày thứ 14, cả 2 đều bỏ qua việc giải ngân `dealBonusAmount`, để lại trạng thái `status = APPROVED` + `dealBonusStatus = QUALIFIED` nhưng tiền mãi nằm kẹt trong `conditionalDealEscrowBalance`!<br>2. **`FinanceReportService`** không phân trang, không cache, quét toàn bộ bảng tài chính trong transaction. | `affiliate-deals.service.ts:1688, 1713-1804`<br>`commissions.service.ts:472-473, 524-543`<br>`finance-report.service.ts:46-95` | Chuẩn hóa thứ tự khóa (cả 2 đều `SELECT ... FOR UPDATE` trên bảng `commissions` theo thứ tự ID tăng dần) + thêm cron quét bù cho các bản ghi `APPROVED + QUALIFIED` chưa có bút toán giải ngân; tối ưu truy vấn báo cáo bằng SQL `SUM/GROUP BY` + cache ngắn hạn. |

---

## 7. Kế hoạch gỡ bỏ hoàn toàn Livestream (Impact Audit & Checklist)

### 7.1. Đánh giá chuyên môn
**HOÀN TOÀN ỦNG HỘ XÓA SẠCH LIVESTREAM!**
- Theo đúng phạm vi chốt sau Review 2, Livestream chỉ là tính năng phụ trợ, không nằm trong 5 Main Workflows.
- Giữ lại vừa không kịp hoàn thiện, vừa gây lag (có 3 component dùng `setInterval` 1 giây), vừa làm rối công thức tính hoa hồng (`+2% liveBonus` + 2 cột thừa `regularCommissionRate`/`regularCommissionAmount` trên `OrderItem`), trong khi **Mobile vốn dĩ chưa hề làm (0 tham chiếu)**.

### 7.2. Checklist 5 tầng cần dọn để xóa sạch không gãy hệ thống
1. **Tầng Database (`backend/prisma/schema.prisma`) + Migration:**
   - Xóa 3 Enum: `LiveSessionStatus`, `LiveSessionPlatform`, `LiveSessionInviteStatus`.
   - Xóa 4 Model: `LiveShoppingSession`, `LiveSessionProduct`, `LiveSessionClaim`, `LiveSessionViewer`.
   - Xóa các cột/quan hệ liên kết trên: `User` (`liveSessionsCreated`, `liveSessionsOwned`, `liveSessionClaims`, `liveRestrictionUntil`, `liveCooperationBlocked`), `Store` (`liveSessions`), `Product` (`liveSessionProducts`), `ProductVariant` (`liveSessionProducts`), `Coupon` (`liveSessionId`, `liveSession`), `OrderItem` (`regularCommissionRate`, `regularCommissionAmount`).
2. **Tầng Backend (`backend/src/`):**
   - Xóa toàn bộ thư mục `modules/live-sessions/` (gồm cả `live-stream.gateway.ts` namespace `/live-stream`) và gỡ `LiveSessionsModule` khỏi `app.module.ts`.
   - Rút gọn công thức hoa hồng: bỏ `liveBonusRate()` trong `commission-policy.ts`, bỏ tra cứu `liveSessionIds` và `liveBonus` trong `orders.service.ts`, bỏ nhánh tách `regularCommissionRate` trong `commissions.service.ts`, bỏ `liveSessionId` trong `create-order.dto.ts`.
   - Gỡ các nhánh `liveVoucherActive` / `liveSession` trong `coupons.service.ts`, `voucher-pricing.ts`, `voucher-discovery.ts`, `chat.service.ts`, `payos-payment.service.ts`, `dashboard.controller.ts` + `dashboard.service.ts` (`getCollaboratorLiveSessionsSummary`), `notifications.service.ts`, `mobile.service.ts`.
3. **Tầng Frontend (`frontend/src/`):**
   - Gỡ các route `/live*`, `/merchant/live-sessions`, `/merchant/livestream`, `/collaborator/live-sessions` trong `AppRoutes.tsx`, gỡ menu `'Phiên Live'` trong `navigation.config.ts`, `Sidebar.tsx`, tab `'live-sessions'` trong `AdminOversightHubPage.tsx`.
   - Xóa các page & component chuyên biệt: `LiveStreamRoomPage.tsx`, `merchant/LiveSessionsPage.tsx`, `collaborator/LiveSessionsPage.tsx`, `AdminLiveSessionsPage.tsx`, thư mục `components/live/`, `KolLivePerformanceCard.tsx`, `LiveInviteMessage.tsx`, `LiveCommerceHubModal.tsx`, `LiveNowSection.tsx`, `LiveSessionDealBadge.tsx`, `LiveSessionDealCard.tsx`, `useLiveStreamTransport.ts`, `useLiveFaceFilter.ts`, `live-broadcast.service.ts`.
   - Gỡ tham chiếu `liveSessionId` / live section trong `CartContext`, `cart.types.ts`, `GuestCheckoutModal`, `MarketplacePage`, `ProductDetailPage`, `SearchPage`, `ShopPage`, `NotificationDropdown`, `analytics.service.ts`.
4. **Tầng Mobile (`Mobile/`):** **0 việc phải làm** (không có tham chiếu nào).
5. **Tầng Seed & Tests:**
   - Gỡ dữ liệu seed live trong `backend/prisma/seeds/` (`build-dataset.ts`, `commission.seed.ts`, `marketing.seed.ts`, `orders.seed.ts`, `seed.database.ts`, `validate-dataset.ts`).
   - Xóa 6 file test FE `frontend/tests/live-*.test.mjs` và cập nhật các spec BE/FE có nhắc đến `liveBonus` / `liveSession`.

---

## 8. Cờ "Mở tiếp thị" (`isAffiliateEnabled`) — Tác động thực tế & Khuyến nghị

### 8.1. Trả lời chính xác từng câu hỏi của bạn dựa trên code hiện tại
Trường trong DB là `Product.isAffiliateEnabled` (`schema.prisma:645`, DB default `true`, nhưng `ProductsService.create:1379` lại fallback `dto.isAffiliateEnabled ?? false` — một điểm lệch nhỏ!).

Khi Shop Manager **KHÔNG tích "Mở tiếp thị"** (`isAffiliateEnabled = false`):
1. **KOL có thấy để tiếp thị / tạo Link / tạo QR không?** → **KHÔNG** (đã chặn ở `referral-links.service.ts:174, 322-326`).
2. **KOL có thấy để đề xuất Deal độc quyền không?** → **KHÔNG** (đã chặn ở `deal-scope.policy.ts:78`, `affiliate-deals.service.ts:718, 847`).
3. **Khách nhấn link KOL của sản phẩm A (trong Store X), rồi mua thêm sản phẩm B (`isAffiliateEnabled = false`) trong cùng Store X thì sản phẩm B có tính thù lao cho KOL không?**
   - **HIỆN TẠI LÀ CÓ (LỖ HỔNG LOGIC)!** Vì `AttributionSession` lưu theo cấp `(storeId, visitorIdHash)`, và vòng lặp tính hoa hồng ở `orders.service.ts:1940-2032` **không kiểm tra `prod.isAffiliateEnabled`**.
   - *(Nếu sản phẩm B thuộc Store Y khác thì KHÔNG tính hoa hồng vì Attribution khóa theo `storeId`.)*
4. **Sản phẩm không mở tiếp thị có được giảm giá khi khách nhập mã Voucher `STORE_WIDE` của KOL không?**
   - **HIỆN TẠI LÀ CÓ (LỖ HỔNG LOGIC)!** Vì `CouponsService.evaluateCoupon` (`coupons.service.ts:2549-2674`) chỉ kiểm tra `isActive` và `APPROVED`, **không kiểm tra `isAffiliateEnabled`**.

### 8.2. Khuyến nghị chuyên môn: Nên giữ hay tắt nút này?
- **Xét bản chất đề tài SCANMS:** Hệ thống sinh ra để doanh nghiệp quản lý đội ngũ CTV tiếp thị sản phẩm của 4 nhãn hàng nội bộ. Về lý thuyết, cờ `isAffiliateEnabled` hữu ích khi có hàng mồi/hàng xả kho không chi hoa hồng; nhưng nếu **để nửa vời như hiện tại** (tắt rồi mà vẫn tính hoa hồng cross-product và vẫn ăn voucher KOL) thì rất dễ bị hội đồng bắt bẻ khi test thực tế.
- **2 phương án để bạn chọn (khuyến nghị Phương án A cho giai đoạn chốt đồ án):**
  - **Phương án A (Khuyến nghị — Gọn, sạch, không phát sinh edge case):** **Mặc định bật `isAffiliateEnabled = true` cho tất cả sản phẩm nội bộ** (ẩn hoặc bỏ nút tắt trên form tạo sản phẩm, đổi fallback BE `dto.isAffiliateEnabled ?? true`). Toàn bộ danh mục sản phẩm đã được duyệt đều sẵn sàng cho CTV tiếp thị, tính hoa hồng và áp Voucher đồng nhất 100%.
  - **Phương án B (Nếu muốn giữ nút tắt để demo kiểm soát danh mục):** Bắt buộc vá đồng bộ 2 chỗ: (1) Trong `orders.service.ts:1940-2032`, bỏ qua tính hoa hồng cho `OrderItem` có `prod.isAffiliateEnabled === false`; (2) Trong `coupons.service.ts:2638-2674`, loại các sản phẩm `isAffiliateEnabled === false` khỏi danh sách sản phẩm đủ điều kiện áp Voucher KOL.

---

## 9. Validation tạo sản phẩm & Khóa ngành hàng (`Category Lock`)

### 9.1. Khi tạo sản phẩm thiếu trường có thông báo chưa?
- **ĐÃ CÓ THÔNG BÁO ĐẦY ĐỦ & RÕ RÀNG ở cả FE và BE:**
  - **Frontend (`ProductManagementPage.tsx:732-819, 1948-2042, 2761-2786`):** Kiểm tra theo 3 bước (Step 1: tên, SKU, ảnh bìa, mô tả; Step 2: biến thể, giá sàn, giá bán, tồn kho, xuất xứ, nhãn mác/thành phần, khối lượng & kích thước GHN; Step 3: tối thiểu 1 chứng từ xuất xứ/nhãn mác, hạn mức mẫu thử). Nếu thiếu trường, hệ thống **tự động chuyển về đúng bước bị lỗi**, hiển thị **banner đỏ liệt kê từng mục thiếu** kèm toast thông báo.
  - **Backend (`CreateProductDto` + `assertProductSubmissionComplete` tại `products.service.ts:207-282`):** Validate toàn bộ trường bắt buộc (kể cả `ingredients` bắt buộc riêng cho Mỹ phẩm/Sức khỏe) và gom thành danh sách lỗi tiếng Việt rõ ràng.
- **Lưu ý nhỏ cần vá:** Khi `currentStoreId` chưa load kịp (rỗng `""`) hoặc ảnh chứng từ lưu dạng relative path `/uploads/...`, BE có thể trả lỗi `400` khó hiểu hơn — cần kiểm soát trên FE trước khi gọi API.

### 9.2. Tạo sản phẩm Mỹ phẩm ở Shop Công nghệ / Gia dụng có bị chặn không?
- **ĐÚNG — BỊ CHẶN CỨNG Ở CẢ FE VÀ BE (không phải bạn nhầm):**
  - **Trên FE (`ProductManagementPage.tsx:2878`):** Ô Ngành hàng (`categoryName`) hiển thị dạng `readOnly`, tự khóa cứng theo `store.categoryName` của cửa hàng nội bộ.
  - **Trên BE (`products.service.ts:184-205, 1221-1236, 1485-1503`):** Với `SHOP_MANAGER`, hệ thống kiểm tra tương thích nhóm ngành hàng (`isCategoryVerticalCompatible` theo 5 nhóm: Mỹ phẩm, Thời trang, Sức khỏe/Dinh dưỡng, Gia dụng/Smart Living, Công nghệ). Nếu cố gửi sản phẩm Mỹ phẩm vào Shop Công nghệ/Gia dụng, BE chặn cứng với `400 BadRequestException` (*"Gian hàng ... thuộc ngành hàng chuyên biệt ... Không được đăng sản phẩm sai ngành hàng đã cấp phép."*). *(Chỉ `SYSTEM_ADMIN` và `SYSTEM_MANAGER` được miễn trừ khóa này).*
- **Đánh giá chuyên môn:** **NÊN GIỮ NGUYÊN CƠ CHẾ NÀY.** Đây là đặc trưng quản trị rất đúng với mô hình 4 Cửa hàng nội bộ chuyên biệt của SCANMS (Sora Skincare, Aura Activewear, GreenBio, Lumière Smart Living), giúp dữ liệu sản phẩm sạch để AI Matching ghép đúng tệp KOL theo chuyên môn ngách.

---

## 10. Đối chiếu Hợp đồng FE ↔ BE (Contract Drift gây lỗi 400/404)

> [!CAUTION]
> **Cấu hình toàn cục tại `backend/src/main.ts:56-62` đang bật `forbidNonWhitelisted: true` và `transform: true` (không bật `enableImplicitConversion`).**
> Nghĩa là bất kỳ trường nào FE gửi **dư** không khai báo trong BE DTO, hoặc gửi chuỗi rỗng `""` vào trường `@IsNumber()`, sẽ **ngay lập tức bị BE từ chối với lỗi `400 Bad Request`**.

### Danh sách các điểm lệch hợp đồng đã phát hiện:

| Mức độ | Luồng / Endpoint | File FE ↔ File BE | Lỗi lệch cụ thể & Hậu quả |
| :--- | :--- | :--- | :--- |
| **Cao (400)** | Nộp video hàng mẫu<br>`POST /sample-requests/:id/video` | `SubmitKolVideoModal.tsx:365-384`<br>↔ `SubmitSampleVideoDto` (`sample-request.dto.ts:128-146`) | FE gắn thêm `posterUrl`, `campaignId`, `requiresCampaignParticipation` không có trong DTO → **`400` (`property should not exist`)**. |
| **Cao (400)** | Nâng cấp KOL / eKYC<br>`POST /kyc/upgrade/kol` | `PartnerUpgradeTab.tsx:37-46, 108-232`<br>↔ `SocialChannelItemDto` (`apply-upgrade.dto.ts:15-62`) | 1) Khởi tạo `followerCount: ""` gửi lên `@IsNumber()` (thiếu `@Type(() => Number)`) → **`400`**.<br>2) FE quên validate `channelName` (BE đòi `@IsNotEmpty()`) → **`400`**.<br>3) Hydrate `channels` giữ nguyên trường `id` không có trong DTO → **`400`**. |
| **Cao (400)** | Tạo Exclusive Deal<br>`POST /affiliate-deals/proposals` & `/offers` | `ExclusiveOfferModal.tsx:219, 272`<br>↔ `CreateExclusiveDealDto` (`create-exclusive-deal.dto.ts:47-70`) | 1) FE để ô `salesCommitment` không bắt buộc, nhưng BE bắt `@MinLength(5)` → bỏ trống là **`400`**.<br>2) BE khai báo `commitmentDays?: number` nhưng **quên `@IsOptional()`** → không gửi là **`400`**. |
| **Cao (400)** | Đề xuất giảm giá SP<br>`POST /pricing/promotions` | `ProposePromotionModal.tsx:239-270`<br>↔ `CreatePricePromotionDto` (`pricing.dto.ts:54, 85`) | FE cho phép `reason >= 5` ký tự, nhưng BE single-mode đòi `@MinLength(10)` (trong khi batch-mode đòi `5`) → nhập 5–9 ký tự bị **`400`**. |
| **Cao (400)** | Duyệt / Sửa Coupon KOL & Tạo Coupon Admin | `KolCouponManagement.tsx:152-175`, `AdminVoucherIssuer.tsx:35,50`<br>↔ `ApproveCouponDto`, `CreatePlatformCouponDto` | 1) FE ép `Number("") = 0` gửi vào 3 trường `@IsPositive()` (`maximumDiscountAmount`, `budgetTotal`, `usageLimitTotal`) → **`400`**.<br>2) `AdminVoucherIssuer` cho mã bắt đầu bằng số (vd `2026SALE`), BE regex bắt đầu bằng chữ → **`400`**. |
| **Trung bình** | Cập nhật SP & Biến thể | `ProductManagementPage.tsx:2070-2095`<br>↔ `ProductsController` | FE đang gọi 2 request rời (`PUT /products/:id` rồi `PUT /products/:id/variants`) dễ gây lệch dữ liệu nếu request 2 lỗi, dù BE đã có sẵn endpoint atomic `PUT /products/:id/editor`. |
| **Trung bình (404)** | Nâng cấp Shop (cũ) | `frontend/src/services/kyc.service.ts:188-191`<br>↔ `kyc.controller.ts` | FE vẫn còn hàm `applyShopUpgrade` gọi `POST /kyc/upgrade/shop` dù BE đã xóa endpoint này → **`404`**. |
| **Trung bình (400)** | Nút xác nhận nhận mẫu | `ShopCollaborationPage.tsx:1062`, `Mobile/.../SamplesScreen.tsx:194`<br>↔ `samples.service.ts:681` | FE & Mobile vẫn gọi `PATCH /sample-requests/:id/receive` nhưng BE khóa cứng trả **`400`**. |
| **Lưu ý** | Bằng chứng đổi trả | `create-return-request.dto.ts:53`, `return.schemas.ts:76` | BE bắt buộc tuyệt đối `https://`. Chạy bình thường với Cloudinary, nhưng sẽ lỗi **`400`** nếu upload rơi về local `http://localhost:3000/...`. |

*(Các luồng đã đối chiếu **KHỚP SẠCH, KHÔNG LỆCH**: Tạo đơn & Validate giỏ hàng, Báo giá GHN, Validate/Preview Voucher, Tạo/Duyệt/Từ chối/Giao hàng mẫu, Quy trình Đổi trả `/returns/*`, Rút tiền & Duyệt chi Payouts, Nộp & Duyệt eKYC chính `/kyc/submit`.)*

---

## 11. Lộ trình ưu tiên xử lý trước khi bảo vệ (P0 / P1 / P2)

### 🔴 Ưu tiên P0 — Bắt buộc sửa ngay (Chống lỗi demo, chống mất tiền & hết lag rõ rệt)
1. **Sửa 5 lỗi FE ↔ BE gây `400 Bad Request` chắc chắn** (Video mẫu, Nâng cấp KOL, Tạo Deal, Đề xuất Promo, Duyệt Coupon).
2. **Sửa 3 lỗi tài chính & vận hành cốt lõi:**
   - Thêm `SHOP_REJECTED` / `INSPECTION_REJECTED` vào `approveMatureCommission` (tránh treo hoa hồng KOL vĩnh viễn).
   - Khóa đồng nhất trên bảng `commissions` giữa `settleSuccessfulDeal` và `approveMatureCommission` (chống kẹt tiền KPI vĩnh viễn) + sửa cột `balanceBucket`.
   - Thêm `pg_advisory_xact_lock` cho `createShippingOrder` (chống tạo 2 vận đơn GHN) và hoàn kho/coupon/ví khi `createMultiStoreOrders` recover đơn lỗi.
3. **Sửa 4 nguyên nhân gây Lag/Khựng rõ nhất:**
   - Bỏ `shippingAddress` khỏi trigger tính phí GHN ở `GuestCheckoutModal` + cache `calculateShippingFee` & master data GHN vào Redis.
   - Sửa bug `isManualFresh` kẹt `true` polling 10s trong `OrdersManagementPage` + thay `redis.keys()` bằng `SCAN` + thêm `cache.set()` cho `getMyStore()`.
   - Thêm 6 composite DB index (đặc biệt `AuditLog` và `Order`).
   - Bỏ `syncCart()` khỏi `window.focus` trong `CartContext`.

### 🟠 Ưu tiên P1 — Tinh chỉnh đúng bản chất nghiệp vụ SCANMS
1. **Nới lỏng `floorPrice` an toàn 3 lớp:** Cho tạo SP với `price >= floorPrice` + cảnh báo mềm khi `< minSafePrice` + bịt lỗ hổng `syncVariants` + hiển thị cờ biên mỏng khi `SYSTEM_MANAGER` duyệt SP + khóa cộng dồn Voucher KOL khi chạy Promo dưới sàn.
2. **Chuẩn hóa Voucher KOL Min/Max:** Mở khung `3%–20%` (Shop tự duyệt `<= 10%`, Admin duyệt `> 10%–20%`), bắt buộc `maximumDiscountAmount`, khóa tỷ lệ `FIXED_AMOUNT`, đồng bộ lại FE/BE và vá `updateCouponPolicy` + `dbVariants.floorPrice`.
3. **Siết SLA Hàng mẫu tự động:** Gỡ nút `/receive` chết, chốt luồng chỉ dùng GHN (hoặc cho phép confirm với non-GHN), tự động chặn xin mẫu mới khi đang có đơn `OVERDUE`.
4. **Quyết định dứt khoát `isAffiliateEnabled`:** Chuyển mặc định `true` toàn bộ sản phẩm nội bộ (Phương án A) hoặc vá `orders.service.ts` + `coupons.service.ts` (Phương án B).
5. **Gỡ bỏ hoàn toàn Livestream** theo checklist 5 tầng ở Mục 7 (giảm hẳn code thừa, xóa timer 1s gây lag, đơn giản hóa công thức hoa hồng).

### 🟢 Ưu tiên P2 — Làm đẹp kiến trúc & Sẵn sàng scale
1. Bọc `$transaction` + Maker-Checker cho `reviewKolApplication`, gỡ auto-create Store ở `getMyStore()`, tách `dealViolationCount` / `dealCooldownUntil` ra khỏi `socialLinksJson`, xóa sạch code `shop upgrade` cũ.
2. Thêm Cron tự động chốt Deal hết hạn (`settleSuccessfulDeal` / nhắc `terminateDeal`).
3. Phân trang cho `CustomerService.getOrders()`, `SamplesService`, `AffiliateDealsService`; dùng SQL `GROUP BY` cho Dashboard & `FinanceReportService`; chuyển `ProductManagementPage` sang gọi `PUT /products/:id/editor` atomic.
