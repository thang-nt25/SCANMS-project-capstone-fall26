# KẾ HOẠCH CẢI THIỆN & TỐI ƯU HỆ THỐNG TRƯỚC BẢO VỆ ĐỒ ÁN (SCANMS — FA26SE032)

---

## PHẦN 1: KIẾN TRÚC GIÁ SÀN (`floorPrice`) — KHUYẾN MÃI — VOUCHER KOL — THÙ LAO KOL

### 1.1. Nguyên tắc cốt lõi: Thống nhất bằng công thức "Thực thu ròng cuối cùng"
Để **cả 3 khoản** (**Khuyến mãi sản phẩm** + **Voucher KOL** + **Thù lao KOL**) cộng lại **không bao giờ gây lỗ**, và nếu **Xả hàng chịu lỗ** thì **`SYSTEM_ADMIN` phải biết & duyệt TRƯỚC khi mở bán** (không hậu kiểm bị động sau khi khách đã mua):

- **`floorPrice` là Ngưỡng thực thu ròng tối thiểu công ty phải giữ lại được** trên mỗi sản phẩm sau khi đã trừ hết: Khuyến mãi sản phẩm, Voucher KOL và Thù lao KOL.
- **Công thức kiểm tra thống nhất (đọc động từ tham số, không hardcode):**
  $$\text{Thực thu ròng} = \text{Giá bán hiệu lực} \times (1 - R_{\text{voucher\_max}}) \times (1 - R_{\text{kol\_max}})$$
  Trong đó mặc định: $R_{\text{voucher\_max}} = 10\%$ (trần mã KOL mặc định), $R_{\text{kol\_max}} = 25\%$ (trần thù lao KOL toàn hệ thống trong `GEMINI.md`).
  $\implies$ Hệ số bảo vệ kênh Affiliate $= (1 - 0.10) \times (1 - 0.25) = \mathbf{0.675}$.
- **Ngưỡng giá bán tối thiểu không lỗ (`minSafePrice`):**
  $$\text{minSafePrice} = \left\lceil \frac{\text{floorPrice}}{(1 - R_{\text{voucher\_max}}) \times (1 - R_{\text{kol\_max}})} \right\rceil$$
  *(Ví dụ: với `floorPrice = 100.000 ₫`, `minSafePrice = 148.149 ₫` → làm tròn `149.000 ₫`).*

---

### 1.2. Phân tầng Kiểm soát & Phê duyệt ở từng điểm (Tiền kiểm chặt — Checkout mượt)

| Điểm kiểm soát | Hành vi thiết kế & Phân quyền | Lý do & Cách trả lời Hội đồng |
| :--- | :--- | :--- |
| **1. Lúc Shop Manager tạo / sửa Sản phẩm** (`price` & `floorPrice`) | - Có **icon `?` / `!` giải thích** ngay tại ô `floorPrice` và `price`.<br>- Có **công cụ gợi ý tính giá động (không hardcode)** với các nút chọn nhanh biên dự phòng khuyến mãi / lợi nhuận (ví dụ: `0%`, `+20%`, `+30%`): nhấn vào nút `30%` sẽ tính thật theo công thức $\text{floorPrice} / ((1 - 30\%) \times 0.675)$ (với `100k` ra ~`212k–213k`) và điền vào ô `price`, kèm bảng xem trước thực thu.<br>- **Khóa cứng (Hard Validation):** Không cho lưu nếu `price < minSafePrice`. | - Đảm bảo ngay từ đầu giá bán đã gánh được trần Voucher 10% + trần Hoa hồng 25% mà không lỗ.<br>- Giúp Shop Manager chủ động chừa dư địa cho các đợt giảm giá sau này. |
| **2. Lúc Shop Manager tạo Khuyến mãi sản phẩm** (`promoPrice`) | - **Nếu `promoPrice >= minSafePrice` (Giảm giá thường, không lỗ):** `SHOP_MANAGER` gửi yêu cầu → **`SYSTEM_MANAGER` duyệt** theo đúng quy trình kiểm soát vận hành hiện tại.<br>- **Nếu `promoPrice < minSafePrice` (Xả hàng chịu lỗ):** Hệ thống gắn cờ xả hàng, tính rõ mức lỗ tối đa/đơn vị và **bắt buộc chỉ `SYSTEM_ADMIN` mới được duyệt TRƯỚC khi mở bán** (`SYSTEM_MANAGER` không được phép duyệt đơn xả hàng lỗ). | - Giữ đúng quy trình chuẩn có `SYSTEM_MANAGER` kiểm duyệt khuyến mãi thường.<br>- **Chỉ xả hàng chịu lỗ mới leo thang lên `SYSTEM_ADMIN` duyệt TRƯỚC**, loại bỏ hoàn toàn hậu kiểm bị động. |
| **3. Lúc Shop Manager tạo / duyệt Voucher KOL** (`Coupon`) | - Khóa trần mặc định của Voucher KOL là **`<= 10%`** (nếu muốn phát hành mã giảm sâu `> 10%` thì `SYSTEM_ADMIN` phải duyệt trước).<br>- Hệ thống quét các SKU trong phạm vi mã (nếu Shop có SKU đang xả hàng đặc thù) để cảnh báo sớm và cho Shop chọn **loại trừ SKU chạm lỗ** hoặc **xin Admin duyệt trước**. | - Không bị kẹt tạo mã toàn shop chỉ vì 1–2 SKU.<br>- Giữ vững rào chắn tài chính mà vẫn linh hoạt. |
| **4. Lúc Khách hàng Checkout & Tính Thù lao KOL** | - **Không chặn đơn, không cắt giảm voucher của khách** vì mọi giá KM và mã KOL đã được kiểm tra/duyệt trước khi phát hành.<br>- Thù lao KOL tính trên **doanh thu ròng thực thu sau khuyến mãi & sau Voucher KOL** ($V = \text{Giá sau KM} - \text{Giảm giá mã KOL}$, không tính phí ship). | - Trải nghiệm mua hàng 100% mượt mà.<br>- Công thức tính thù lao công bằng, khớp tuyệt đối với dòng tiền thực thu. |

---

### 1.3. Tinh gọn cơ chế sinh Mã KOL (Đúng bản chất Affiliate)
- **Không tự động đẻ `Coupon` mới mỗi lần duyệt Deal (`exclusive-deal-activation.ts` L318–370):** Khi một `ExclusiveDealProposal` được duyệt, hệ thống chỉ tự động cấp **Smart Link + Dynamic QR** cho sản phẩm trong Deal (phục vụ KOL gắn dưới mô tả video/bài viết).
- **Chỉ tạo `Coupon` khi có yêu cầu chủ động:** Mã giảm giá chỉ được sinh ra khi **KOL chủ động gửi yêu cầu xin mã** (`POST /collaborator/coupons`) hoặc **Shop Manager chủ động cấp mã** (`POST /stores/:storeId/coupons`).
- **Giữ mã `Unique` toàn hệ thống & Gợi ý hậu tố theo Store:** Giữ nguyên `Coupon.codeNormalized` là `@unique` trên toàn hệ thống (`schema.prisma`) để tránh xung đột attribution tại Checkout. Trên UI xin mã (`KolCouponsPage.tsx`), gợi ý hậu tố theo tên cửa hàng (ví dụ: `YENNHI_SORA`, `YENNHI_AURA`) khi KOL hợp tác nhiều shop.
- **Khách không nhập mã vẫn ghi nhận hoa hồng qua Link (Attribution 3 tầng):** Hệ thống đã có cơ chế fallback `COUPON` (ưu tiên 1) $\rightarrow$ `COOKIE` (`AttributionSession` 30 ngày) $\rightarrow$ `FINGERPRINT` (`ClickTrafficLog` 24 giờ nếu không mơ hồ) $\rightarrow$ `ORGANIC`. Ngoài ra `expiresAt` của mã là tùy chọn (`null` nếu không giới hạn), Shop Manager có thể tắt mã (`PATCH /stores/:storeId/coupons/:id/block`) và KOL có thể tạm dừng (`PATCH /collaborator/coupons/:id/pause`).

---

## PHẦN 2: BẢNG TỔNG HỢP THAY ĐỔI BACKEND (BE) & FRONTEND (UI) THEO TỪNG PHASE

### Tổng quan nhanh BE vs UI cần sửa

| Hạng mục | Thay đổi Backend (BE) | Thay đổi Frontend (UI) |
| :--- | :--- | :--- |
| **1. Đồng bộ 14 ngày & Gross/Net** | - `commissions.service.ts` (L658): sửa copy `7 ngày` $\rightarrow$ `14 ngày`. | - `AdminFinancePayoutsPage.tsx` (L251, L263–273): sửa `7 ngày` $\rightarrow$ `14 ngày`, hiện song song Gross (`200k`) & Net (`180k`).<br>- `WalletPage.tsx` (L636–685): thêm dòng phụ `Thực nhận 90% · Thuế TNCN 10%` ở Card 4.<br>- Dọn route `AdminVoucherIssuer.tsx` & đổi badge xanh lá/dương sang Warm Sand. |
| **2. Công thức Hoa hồng & `liveBonus`** | - `orders.service.ts` (L2007) & `commission-calculator.service.ts` (L31): tính hoa hồng trên giá ròng sau Voucher.<br>- `commissions.service.ts` (L248–266): tách `liveBonus (+2%)` khỏi `KPI Deal Escrow` dùng `regularCommissionRate`. | - Đồng bộ lại số liệu hiển thị và cập nhật kịch bản demo Bước 4.2 (`35.100 ₫` & `21.060 ₫`). |
| **3. Tạo Sản phẩm & Tính giá động** | - Tạo helper tính `calculateMinSafePrice(floorPrice, maxVoucher, maxKol, promoReserve)`.<br>- `products.service.ts`: khóa cứng `price >= calculateMinSafePrice(floorPrice)` khi tạo/sửa sản phẩm. | - Form Tạo/Sửa Sản phẩm: thêm icon `?` / `!` giải thích `floorPrice` & `price`, thanh gợi ý tính giá động (`+0%`, `+20%`, `+30%` — bấm vào tính thật, không hardcode), khóa validation nếu `< minSafePrice`. |
| **4. Giảm giá Sản phẩm & Duyệt Xả hàng** | - `pricing.service.ts` (L191–234, L307–340) & `pricing-policy.ts` (L13–22): bỏ chặn cứng `assertFloor` khi xin xả hàng; phân loại `promoPrice >= minSafePrice` (cho `SYSTEM_MANAGER` duyệt) vs `< minSafePrice` (gắn cờ xả hàng & **chỉ `SYSTEM_ADMIN` mới được duyệt**). | - `ProposePromotionModal.tsx` & `ShopPricePromotionsTab.tsx`: hiển thị mốc `minSafePrice`, phân biệt rõ gửi `SYSTEM_MANAGER` (thường) vs gửi `SYSTEM_ADMIN` (xả hàng chịu lỗ + ước tính mức lỗ).<br>- `AdminProductPricingHubPage.tsx` / `ProductPricingPage.tsx`: lọc/gắn badge đơn xả hàng `< minSafePrice`, khóa nút duyệt với `SYSTEM_MANAGER`, hiện mức lỗ tối đa cho `SYSTEM_ADMIN`. |
| **5. Voucher KOL & Bỏ tự động đẻ mã** | - `exclusive-deal-activation.ts` (L318–370): bỏ tự động tạo `tx.coupon` khi duyệt Deal (chỉ giữ Smart Link + QR); dọn loop `floorPrice` rỗng (L206–215).<br>- `coupons.service.ts`: khóa trần mặc định `<= 10%` (`> 10%` cần `SYSTEM_ADMIN` duyệt); quét SKU chạm lỗ khi tạo mã toàn shop; giữ `codeNormalized` `@unique`. | - `ShopCouponsPage.tsx` / `ShopCreatorIncentivesTab`: cảnh báo SKU chạm lỗ (nếu có) với tùy chọn loại trừ SKU hoặc xin Admin duyệt.<br>- `KolCouponsPage.tsx`: gợi ý hậu tố Store (`TENKOL_SORA`) khi KOL xin mã nhiều shop. |

---

### Chi tiết thực thi từng Phase

#### Phase 1: Quick Wins — Sửa nhanh UI & Copy trước Demo (~1–2 giờ)
1. **Đồng bộ thông số "14 ngày" (thay thế tàn dư "7 ngày"):**
   - `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx` (L251): Sửa `Bảo chứng Escrow · 7 ngày` $\rightarrow$ **`Bảo chứng Escrow · 14 ngày`**.
   - `backend/src/modules/commissions/commissions.service.ts` (L658): Sửa chuỗi mô tả `'Hoa hồng được bảo chứng 7 ngày lịch...'` $\rightarrow$ **`'Hoa hồng được bảo chứng 14 ngày lịch...'`**.
2. **Đồng bộ hiển thị Gross / Thuế 10% / Net giữa Ví KOL & Cổng Kế toán:**
   - `frontend/src/pages/collaborator/WalletPage.tsx` (Card 4 *Đang Chờ Giải Ngân*, L636–685): Giữ số chính là `lockedPayoutBalance` (Gross `200.000 ₫`) nhưng thêm dòng phụ rõ ràng: `Thực nhận 90%: 180.000 ₫ · Thuế TNCN: 20.000 ₫`.
   - `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx` (KPI Card 1 *Chờ phê duyệt*, L263–273): Hiển thị song song **Gross (`200.000 ₫`)** ở phụ đề hoặc tooltip dưới con số **Net thực chi (`180.000 ₫`)** để khi chuyển màn hình từ KOL sang Kế toán, 2 con số khớp nhau tuyệt đối.
3. **Kiểm tra & Dọn tàn dư màn hình Voucher sàn đã bãi bỏ:**
   - Kiểm tra `AppRoutes.tsx` và Sidebar Admin: đảm bảo không còn route hoặc nút bấm mở `AdminVoucherIssuer.tsx` (*Phát hành voucher sàn*) để tránh bấm nhầm bị lỗi `410 Gone` khi demo.
4. **Rà soát màu sắc chuẩn Vàng Be (`GEMINI.md`):**
   - Thay các badge nền xanh lá/xanh dương lớn tại `WalletPage.tsx` (L1401 `bg-[#ECFDF5]`) và `AdminFinancePayoutsPage.tsx` (L63–64, L279, L303) về hệ token Warm Sand / Brand Gold (`#FBF5EB`, `#B88E4F`, `#EEDFC6`).

---

#### Phase 2: Chốt nhất quán Công thức Tính Tiền & Kịch bản Demo
1. **Đồng bộ cơ sở tính hoa hồng sau Voucher KOL ($V$):**
   - **Trong Code (`backend/src/modules/orders/orders.service.ts` L2007 & `commission-calculator.service.ts` L31):** Cập nhật `remunerationBase` để tính trên **doanh thu ròng sau khi trừ chiết khấu Voucher KOL** (`linePricing` thay vì `unitPrice * quantity`).
   - **Trong Kịch bản Demo (`docs/SCANMS_Kich_Ban_Demo_Bao_Ve_Do_An_Va_Phan_Tich_Ky_Thuat.docx` Bước 4.2):** Cập nhật lại số liệu minh họa theo đúng giá thực thu `351.000 ₫`:
     - Khoản 1 (10%): **`35.100 ₫`** (thay cho `39.000 ₫`).
     - Khoản 2 (6% Deal KPI): **`21.060 ₫`** (thay cho `23.400 ₫`).
   - Cập nhật lại unit tests trong `commission-calculator.service.spec.ts` và `orders.service.spec.ts` theo công thức mới.
2. **Tách bạch `liveBonus (+2%)` khỏi `KPI Deal Escrow`:**
   - Trong `backend/src/modules/commissions/commissions.service.ts` (L248–266): Dùng `regularCommissionRate` (đã có sẵn trên `OrderItem` tại `orders.service.ts` L2025) để tách đúng phần chênh lệch **chỉ của Deal** vào `conditionalDealEscrowBalance`, còn phần `+2%` Livestream đi cùng chu kỳ 14 ngày vào `pendingBalance`.

---

#### Phase 3: Bảo vệ `floorPrice` Tiền kiểm, Phân tầng Duyệt & Tinh gọn Mã KOL
##### 3A. Bảo vệ `floorPrice` Tiền kiểm + Máy tính gợi ý giá động + Phân tầng Duyệt
1. **Shared Formula Helper (Backend & Frontend):**
   - Tạo hàm tính động `calculateMinSafePrice(floorPrice, maxVoucherRate = 0.10, maxCommissionRate = 0.25, promoReserveRate = 0)` — tính toán thật, tuyệt đối không hardcode.
2. **Backend (`products`, `pricing.controller.ts`, `pricing.service.ts`, `pricing-policy.ts`, `coupons.service.ts`):**
   - Khi tạo/cập nhật sản phẩm: Kiểm tra cứng `price >= calculateMinSafePrice(floorPrice)`.
   - Khi tạo/duyệt Khuyến mãi sản phẩm (`pricing.service.ts`):
     - Nếu `proposedPrice >= minSafePrice`: Cho phép **`SYSTEM_MANAGER` hoặc `SYSTEM_ADMIN`** duyệt như quy trình hiện tại.
     - Nếu `proposedPrice < minSafePrice`: Bỏ chặn cứng `assertFloor` khi tạo đề xuất, đánh dấu là **xả hàng chịu lỗ** và trong `review` chỉ cho phép **`SYSTEM_ADMIN`** bấm duyệt (trả `403 Forbidden` nếu `SYSTEM_MANAGER` cố duyệt đơn xả hàng lỗ).
   - Khi tạo/duyệt Voucher KOL (`coupons.service.ts`): Khóa trần mặc định `<= 10%` (`> 10%` cần `SYSTEM_ADMIN` duyệt); nếu có SKU bị chạm dưới sàn thì trả danh sách cảnh báo để chọn loại trừ SKU hoặc xin Admin duyệt.
3. **Frontend (`ProductPricingPage.tsx`, `ProposePromotionModal.tsx`, `ShopPricePromotionsTab.tsx`, `AdminProductPricingHubPage.tsx`, Form Sản phẩm):**
   - Form Tạo/Sửa Sản phẩm: Thêm **icon `?` / `!` tooltip** giải thích `floorPrice` & `price`, **thanh gợi ý tính giá động** (`+0%`, `+20%`, `+30%`) và khóa validation nếu `price < minSafePrice`.
   - `ProposePromotionModal.tsx` & `ShopPricePromotionsTab.tsx`: Hiển thị ngưỡng `minSafePrice`, tự động phân luồng thông báo *"Gửi `SYSTEM_MANAGER` duyệt"* (nếu `>= minSafePrice`) hoặc *"Cảnh báo xả hàng chịu lỗ — Chuyển `SYSTEM_ADMIN` duyệt"* (nếu `< minSafePrice`, kèm mức lỗ tối đa/đơn vị).
   - `AdminProductPricingHubPage.tsx` / `ProductPricingPage.tsx`: Thêm bộ lọc/badge nhận diện đơn xả hàng `< minSafePrice`, ẩn/khóa nút duyệt đối với `SYSTEM_MANAGER` ở đơn xả hàng và hiển thị mức lỗ dự kiến cho `SYSTEM_ADMIN`.

##### 3B. Tinh gọn cơ chế sinh Mã KOL (Bỏ tự động đẻ mã theo Deal)
1. **Backend (`backend/src/modules/affiliate-deals/exclusive-deal-activation.ts` L318–370):**
   - Loại bỏ đoạn code tự động tạo `tx.coupon` (`vipCode`) mỗi khi duyệt `ExclusiveDealProposal`. Giữ nguyên phần tự động tạo **Smart Link + Dynamic QR** cho sản phẩm trong Deal.
   - Dọn đoạn loop `floorPrice` đang để thân rỗng tại `exclusive-deal-activation.ts` (L206–215).
2. **Backend & Frontend (`coupons.service.ts`, `ShopCouponsPage.tsx`, `KolCouponsPage.tsx`):**
   - Chỉ tạo mã khi KOL gửi yêu cầu (`POST /collaborator/coupons`) hoặc Shop Manager chủ động cấp (`POST /stores/:storeId/coupons`).
   - Giữ nguyên ràng buộc `codeNormalized` `@unique` toàn hệ thống; bổ sung gợi ý ghép hậu tố Store trên UI `KolCouponsPage.tsx` (ví dụ `TENKOL_SORA`) để KOL dễ tạo mã không trùng khi xin ở nhiều cửa hàng.

---

#### Phase 4: Nâng cấp Hệ thống Skills tại `.agents/skills/` (Cho đội ngũ & AI Agent)
Dựa trên đánh giá bộ skill hiện tại tại `c:\HW\CAPSTONE\.agents\skills/`, nên bổ sung **2 skill mới** (có thể tham khảo mẫu chuẩn từ GitHub như `anthropics/skills` và `trailofbits/skills` rồi tùy biến cho SCANMS):

1. **Skill 1: `fintech-ledger-invariants` (Đặt tại `.agents/skills/fintech-ledger-invariants/SKILL.md`)**
   - *Mục đích:* Bắt buộc AI & dev kiểm tra 5 bất biến kế toán trước khi sửa bất kỳ logic nào ở `wallets`, `payouts`, `commissions`, `orders`, `returns`:
     1. **Voucher Base Invariant:** Hoa hồng luôn tính trên doanh thu ròng sau giảm giá ($V = \text{Price} - \text{CouponDiscount}$), không bao gồm phí ship.
     2. **Gross-Tax-Net Conservation:** `availableBalance` luôn trừ **Gross**; `Gross = Tax (10%) + Net (90%)`; mọi UI từ KOL đến Kế toán phải hiển thị nhất quán cặp số Gross/Net.
     3. **Non-Stacking Deal & Tier:** `Deal Escrow = max(0, Deal% - (10% + Tier%))`; Livestream `+2%` không nằm trong `Deal Escrow` và tổng tỷ lệ $\le 25\%$.
     4. **Concurrency & Idempotency:** Mọi thao tác trừ tiền/hoàn tiền phải dùng `SELECT ... FOR UPDATE` trong `prisma.$transaction`.
     5. **Zero Stale Copy:** Thời hạn Escrow/SLA/Đổi trả thống nhất 14 ngày trên cả constants, API message và UI.
2. **Skill 2: `playwright-demo-e2e` (Đặt tại `.agents/skills/playwright-demo-e2e/SKILL.md`)**
   - *Nguồn tham khảo GitHub:* Pattern `webapp-testing` từ `anthropics/skills` kết hợp Playwright MCP.
   - *Mục đích:* Đóng gói bộ script kiểm thử tự động 5 luồng Demo (`DS-01a` $\rightarrow$ `DS-05b`) qua giao diện thật trên `localhost:5173`: tự động đăng nhập 5 vai trò, tạo đơn áp mã KOL, giả lập PayOS/GHN, kiểm tra số tiền hiển thị ở **Ví KOL** vs **Kế toán** vs **Executive Dashboard** khớp nhau từng đồng trước ngày bảo vệ.
