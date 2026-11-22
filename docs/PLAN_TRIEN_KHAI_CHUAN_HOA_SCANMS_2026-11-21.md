# PHÂN TÍCH NGHIỆP VỤ BỔ SUNG & KẾ HOẠCH TRIỂN KHAI CHI TIẾT (SCANMS)

- **Dự án:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết (**SCANMS — `FA26SE032`**)
- **Ngày lập kế hoạch:** 21/11/2026 (nối tiếp báo cáo [AUDIT_KIEN_TRUC_NGHIEP_VU_VA_GIAI_PHAP_2026-11-21.md](file:///c:/HW/CAPSTONE/docs/AUDIT_KIEN_TRUC_NGHIEP_VU_VA_GIAI_PHAP_2026-11-21.md))
- **Trạng thái:** **CHỈ PHÂN TÍCH & LẬP PLAN — CHƯA CHỈNH SỬA CODE.**

---

# PHẦN A: PHÂN TÍCH NGHIỆP VỤ CHUYÊN SÂU (MỤC 1, 2, 3, 4, 8, 9)

## 1. Hướng sửa chi tiết cho Mục 1: `floorPrice`, `minSafePrice` & Chức năng Giảm giá

### Mục tiêu nghiệp vụ
Cho phép `SHOP_MANAGER` định giá linh hoạt hơn khi tạo sản phẩm (không bị khóa cứng ở mức `1.4815 × floorPrice`), **nhưng vẫn bảo vệ tuyệt đối doanh nghiệp khỏi lỗ kép** khi kết hợp Giảm giá trực tiếp (`ProductPricePromotion`) + Voucher KOL + Hoa hồng Deal 25%.

### Thiết kế luồng chuẩn 3 lớp
1. **Lớp 1 — Tạo & Cập nhật sản phẩm (`create`, `update`, `syncVariants`):**
   - **Khóa cứng (Hard Block):** `price >= floorPrice` và `listPrice >= floorPrice` trên **tất cả** biến thể, áp dụng đồng nhất cho cả `create`, `update` và `syncVariants` (bịt lỗ hổng `syncVariants` đang bỏ qua hoàn toàn kiểm tra sàn).
   - **Cảnh báo mềm (Soft Warning):** Nếu `floorPrice <= price < minSafePrice`:
     - **Cho phép tạo/lưu**, không chặn nút Submit.
     - Trên FE hiển thị hộp cảnh báo màu vàng (`#D97706`): tính rõ *"Giá bán đang thấp hơn ngưỡng an toàn `minSafePrice`. Nếu đơn hàng áp tối đa Voucher KOL + Deal 25%, doanh nghiệp có thể hụt tối đa `X ₫/sản phẩm` so với giá sàn."*
     - Trên màn hình kiểm duyệt sản phẩm của `SYSTEM_MANAGER` (`ProductModerationPage`), hiển thị badge cảnh báo **"Biên mỏng (dưới ngưỡng an toàn)"** kèm số liệu `floorPrice` vs `price` để `SYSTEM_MANAGER` chủ động duyệt hoặc yêu cầu Shop điều chỉnh giá.
2. **Lớp 2 — Tạo & Duyệt Giảm giá trực tiếp (`ProductPricePromotion`):**
   - Khi Shop Manager đề xuất giá giảm `proposedPrice`:
     - **Mức xanh (`proposedPrice >= minSafePrice`):** `SYSTEM_MANAGER` duyệt bình thường; được phép cộng dồn Voucher KOL và hưởng Deal bình thường.
     - **Mức vàng (`floorPrice <= proposedPrice < minSafePrice`):** Hiển thị mô phỏng lỗ tối đa trên UI → Đẩy **`SYSTEM_ADMIN` duyệt** (hoặc cho phép `SYSTEM_MANAGER` duyệt nhưng hệ thống **tự động tắt cộng dồn Voucher KOL** trong thời gian chạy Promo này).
     - **Mức đỏ — Xả hàng dưới sàn (`proposedPrice < floorPrice`):** **Chỉ `SYSTEM_ADMIN` duyệt** (giữ cơ chế hiện tại), đồng thời **tự động khóa cộng dồn Voucher KOL** đối với các dòng hàng đang xả dưới sàn để tránh lỗ chồng lỗ.
3. **Lớp 3 — Checkout & Hậu kiểm:**
   - Không làm gãy trải nghiệm thanh toán của khách; mọi đơn hàng xả kho có `netRealized < floorPrice` tự động ghi `AuditLog` để `SYSTEM_ADMIN` theo dõi trên Executive Financial Dashboard.

---

## 2. Hướng sửa chi tiết cho Mục 2: Voucher Độc quyền của KOL (Min/Max & 2 cấp duyệt)

### Mục tiêu nghiệp vụ
Gỡ bỏ giới hạn máy móc `5% / 10%`, cho phép linh hoạt theo biên lợi nhuận của từng cửa hàng nội bộ (Mỹ phẩm vs Gia dụng), nhưng **có ngưỡng tối thiểu để mã có giá trị** và **có trần kiểm soát để tránh lỗ**, phân quyền rõ giữa `KOL`, `SHOP_MANAGER` và `SYSTEM_ADMIN`.

### Thiết kế quy tắc Min/Max & Phân quyền
| Loại giảm giá | Ngưỡng Tối thiểu (Min) | Shop Manager tự duyệt | Leo thang `SYSTEM_ADMIN` duyệt | Chốt chặn chống lỗ bắt buộc |
| :--- | :--- | :--- | :--- | :--- |
| **Theo % (`PERCENTAGE`)** | **`3%`** (tránh mã rác 1%) | **`3%` đến `10%`** | **`> 10%` đến tối đa `20%`** | **Bắt buộc nhập `maximumDiscountAmount > 0`** (trần tiền giảm tối đa/đơn) + `budgetTotal > 0` + `usageLimitTotal > 0`. |
| **Theo số tiền (`FIXED_AMOUNT`)** | **`10.000₫`** | Quy đổi $\le 10\%$ trên `minimumOrderAmount` | Quy đổi $> 10\%$ đến $\le 20\%$ trên `minimumOrderAmount` | **Bắt buộc `minimumOrderAmount > 0`** và `discountValue / minimumOrderAmount <= 20%` (chống lách trần % bằng giảm tiền thẳng). |

- **Luồng đàm phán giữa KOL & Shop Manager:**
  - KOL được tự do nhập % giảm mong muốn trong khung `3% – 20%` (hoặc chọn nút gợi ý nhanh `5% / 10% / 15% / 20%`) ngay trong `ProposeCouponInChatModal`.
  - Khi `SHOP_MANAGER` bấm xem & duyệt: hiển thị **Bảng mô phỏng biên an toàn** (*Đơn mẫu 1.000.000₫ → Trừ Voucher → Doanh thu ròng `netGoods` → Hoa hồng KOL → Thực thu Shop*).
  - Nếu `<= 10%`: `SHOP_MANAGER` duyệt là `ACTIVE` ngay.
  - Nếu `> 10%` đến `20%`: `SHOP_MANAGER` xác nhận đề xuất → chuyển trạng thái **`PENDING_ADMIN_APPROVAL`** để `SYSTEM_ADMIN` duyệt ngoại lệ (đồng bộ 100% với cơ chế duyệt Deal `> 16%`).
- **Vá lỗ hổng đi kèm:**
  - Áp dụng lại toàn bộ rule trần Min/Max vào `updateCouponPolicy()` (không cho sửa lách trần sau khi duyệt).
  - Bổ sung `floorPrice: true` vào query `dbVariants` trong `CouponsService.evaluateCoupon()` (`coupons.service.ts:2569`).

---

## 3. Hướng sửa chi tiết cho Mục 3: Exclusive Deal 25%, KPI & Chế tài phạt

### Mục tiêu nghiệp vụ
Giữ nguyên bản sắc rất mạnh hiện có (**Trần 25%, Shop duyệt `<= 16%`, Admin duyệt `> 16%–25%`, giải ngân 2 giai đoạn `10%+Bậc` sau 14 ngày & `Deal%-(10%+Bậc)` khi đạt KPI, phạt Cooldown 1–4 tuần nếu không đạt KPI**), và sửa triệt để 3 điểm yếu kỹ thuật đang tiềm ẩn rủi ro mất dữ liệu/kẹt tiền:

1. **Tách lịch sử vi phạm khỏi `socialLinksJson`:**
   - Thêm 2 cột riêng trên `CollaboratorProfile`: `dealViolationCount Int @default(0)` và `dealCooldownUntil DateTime?`. Không lưu chung vào JSON kênh MXH để tránh bị xóa mất khi KOL cập nhật kênh.
2. **Tự động hóa chốt Deal bằng Cron hằng ngày:**
   - Khi Deal hết `settlementEndsAt` (hết thời hạn cam kết + 14 ngày đổi trả):
     - Nếu `validRevenue >= targetRevenue` → Cron tự động gọi `settleSuccessfulDeal()` (giải ngân phần thưởng chênh lệch KPI về ví khả dụng, thông báo cho KOL & Shop).
     - Nếu `validRevenue < targetRevenue` → Cron gửi thông báo nhắc Shop Manager chốt `terminateDeal()` (hoặc tự động chốt sau 48h không có gia hạn) để không bị treo mãi ở `REVIEW_REQUIRED`.
3. **Sửa triệt để Race Condition kẹt tiền KPI (WF-05) & lỗi cột `balanceBucket`:**
   - Chuẩn hóa thứ tự khóa hàng (`SELECT ... FOR UPDATE` trên `commissions` theo `id ASC`) ở cả `settleSuccessfulDeal()` và `approveMatureCommission()`.
   - Sửa lỗi sai tên cột `bucket` → `balanceBucket` ở nhánh fallback `affiliate-deals.service.ts:1783`.
   - Thêm invalidation cache (`deals:shop:*`, `deals:mine:*`, `affiliate:deals:active_partners:*`) sau khi tất toán Deal.

---

## 4. Phân tích chuyên sâu & Hướng sửa Mục 4: Hàng mẫu (Sample SLA 14 ngày) — Cân bằng quyền lợi Shop & KOL

### Thực trạng code đã kiểm tra (`media.service.ts:488-562`)
- **Đã có** bước Shop Manager duyệt video nghiệm thu: `APPROVED` → `COMPLETED`; `REJECTED` → `REVISION_REQUIRED` kèm lý do và gia hạn `revisionDeadlineAt = max(deadlineAt, now + 7 ngày)`.
- **Tuy nhiên đang có 3 lỗ hổng nghiệp vụ lớn đúng như bạn đặt vấn đề:**
  1. **Đi vòng qua `MediaService` (Media Hub đã bãi bỏ):** Việc duyệt video hàng mẫu đang nằm trong `MediaService.reviewMedia()` thay vì nằm trực tiếp trong module `Samples`.
  2. **Nếu Shop Manager "ghét KOL", cố tình bấm từ chối vô lý dù video đạt chuẩn:** Hiện tại **chưa có giới hạn số vòng từ chối** và **chưa có cơ chế Trọng tài (`SYSTEM_MANAGER`)** để KOL khiếu nại. Shop có thể ép KOL sửa đi sửa lại cho đến khi quá hạn `OVERDUE`.
  3. **Nếu KOL "bùng" không nộp video hoặc quá hạn (`OVERDUE`):** Hiện tại **không có chế tài tự động** — KOL vẫn xin hàng mẫu sản phẩm khác bình thường cho tới khi Shop tố cáo thủ công VÀ Admin khóa thủ công.

### Thiết kế nghiệp vụ chuẩn (Chặt 2 chiều: Chống KOL làm ẩu + Chống Shop chèn ép)
1. **Nghiệm thu trực tiếp bởi `SHOP_MANAGER` (tại module `Samples`):**
   - Tách endpoint riêng `PATCH /sample-requests/:id/review-video` trong `SamplesController` (không phụ thuộc UI Media Hub cũ).
   - Khi Shop bấm **Yêu cầu chỉnh sửa (`REVISION_REQUIRED`)**, bắt buộc chọn/nhập **lý do rõ ràng (`>= 15` ký tự)** (vd: *Chưa quay rõ sản phẩm / Chưa gắn link tiếp thị / Video dưới 15 giây làm qua loa*).
   - Giới hạn tối đa **2 lần yêu cầu chỉnh sửa** để tránh vòng lặp vô hạn.
2. **Cơ chế Trọng tài bảo vệ KOL khỏi Shop Manager cố tình gây khó dễ:**
   - Thêm trạng thái **`APPEALED`** (KOL yêu cầu `SYSTEM_MANAGER` phân xử) vào `SampleRequestStatus`.
   - Khi đơn ở trạng thái `REVISION_REQUIRED`, KOL có 2 nút rõ ràng:
     - **Nộp lại video đã chỉnh sửa** (theo góp ý hợp lý của Shop), HOẶC
     - **Yêu cầu Trọng tài (`POST /sample-requests/:id/appeal`)** (nhập giải trình ngắn nếu thấy video đã đạt yêu cầu nhưng Shop vô lý từ chối).
   - **Tác dụng của `APPEALED`:**
     - **Tạm đóng băng đồng hồ SLA 14 ngày** (Cron không được đánh `OVERDUE` trong lúc chờ phân xử).
     - `SYSTEM_MANAGER` xem trực tiếp link video gốc + lý do từ chối của Shop + giải trình của KOL và ra phán quyết cuối cùng:
       - **Video đạt chuẩn (`FORCE_COMPLETE`):** Chuyển `COMPLETED`, bảo vệ quyền lợi KOL, ghi nhận audit đối với Shop.
       - **KOL làm ẩu thật (`UPHOLD_REVISION` hoặc `CONFIRM_VIOLATION`):** Giữ nguyên yêu cầu chỉnh sửa với hạn mới hoặc chốt vi phạm `OVERDUE`.
3. **Chế tài tự động chống KOL nhận mẫu rồi "bùng" (Auto-Freeze SLA):**
   - Trong `getEligibility()` & `createRequest()`: Nếu KOL đang có **bất kỳ đơn hàng mẫu nào `OVERDUE`** (không phải `APPEALED`) → **Tự động chặn gửi yêu cầu mẫu mới** (hiển thị rõ mã đơn quá hạn cần hoàn tất để mở khóa lại).
   - Tích lũy $\ge 2$ đơn bị chốt vi phạm quá hạn → tự động kích hoạt `sampleRequestsBlockedAt` (chỉ Admin mới mở lại được).
4. **Dọn sạch lỗi giao vận hàng mẫu:**
   - Gỡ bỏ nút gọi `/receive` bị chết trên Web (`ShopCollaborationPage.tsx:1062`) và Mobile (`SamplesScreen.tsx:194`) đối với đơn GHN.
   - Với nhánh ship ngoài GHN (`shipRequest`): hoặc bỏ hẳn để thống nhất 100% GHN nội bộ, hoặc chỉ mở nút xác nhận nhận hàng cho riêng đơn không phải GHN để không bị kẹt vĩnh viễn ở `SHIPPED`.
   - Sửa `resolveRequestAsAdmin` (`EXTEND_DEADLINE` reset `overdueAt = null`; `CANCEL_OBLIGATION` hoàn lại `sampleGrantedCount`).

---

## 5. Xác nhận Mục 8: Cờ "Mở tiếp thị" (`isAffiliateEnabled`) — Chốt Phương án A

Theo xác nhận của bạn, triển khai **Phương án A**:
- **Bản chất:** Mọi sản phẩm nội bộ đã được `SYSTEM_MANAGER` duyệt lên kệ trong 4 cửa hàng của doanh nghiệp đều **mặc định bật tiếp thị (`isAffiliateEnabled = true`)**.
- **Thay đổi cụ thể:**
  - Backend (`products.service.ts:1379`): Đổi fallback `dto.isAffiliateEnabled ?? false` $\rightarrow$ **`true`** (khớp với Prisma schema `@default(true)`).
  - Frontend (`ProductManagementPage.tsx`): Ẩn/gỡ công tắc tắt tiếp thị trên form tạo & sửa sản phẩm (luôn gửi `isAffiliateEnabled: true`).
  - **Lợi ích:** Triệt tiêu hoàn toàn 100% bất nhất giữa Link, Deal, Voucher `STORE_WIDE` và Cross-product Attribution trong cùng một cửa hàng; không còn tình huống khách thắc mắc "cùng 1 đơn hàng 2 món tại sao chỉ tính hoa hồng 1 món".

---

## 6. Giải đáp & Hướng sửa Mục 9: Làm sao hệ thống biết sản phẩm không phù hợp với Shop?

### Sự thật trong code hiện tại (`products.service.ts:184-205`)
- Hiện tại hệ thống **CHỈ so sánh `dto.categoryName` với `store.categoryName`** dựa trên 5 nhóm từ khóa tĩnh.
- Trên giao diện tạo sản phẩm, ô `categoryName` đã bị khóa cứng `readOnly` bằng `store.categoryName`.
- **Do đó:**
  - Nếu gọi API trực tiếp gửi `categoryName: "Mỹ phẩm"` vào Shop Công nghệ/Gia dụng → BE **chặn cứng (`400`)**.
  - **NHƯNG** nếu Shop Manager của Shop Gia dụng cứ để nguyên `categoryName` bị khóa là `"Thiết bị gia dụng & Đồ bếp"`, rồi gõ **`title = "Son môi đỏ siêu lì MAC"`** → **hệ thống hiện tại KHÔNG PHÁT HIỆN ĐƯỢC!** Nó chỉ bị phát hiện khi `SYSTEM_MANAGER` đọc và duyệt thủ công.

### Thiết kế kiểm soát 2 lớp chuẩn nghiệp vụ (Chặt nhưng không chặn nhầm)
1. **Lớp 1 — Khóa ngành hàng cứng trên `categoryName` (giữ nguyên) + Cảnh báo xung đột từ khóa thông minh trên `title`:**
   - Bổ sung hàm kiểm tra chéo nhẹ (`detectVerticalMismatchWarning(title, store.categoryName)`):
     - Nếu `store.categoryName` thuộc nhóm *Gia dụng / Công nghệ* nhưng `title` chứa từ khóa đặc trưng cao của *Mỹ phẩm* (`son môi`, `phấn phủ`, `kem nền`, `serum`, `toner`, `kem chống nắng`) hoặc *Thời trang* (`áo thun`, `quần jean`, `váy đầm`) → **Không chặn cứng** (để tránh chặn nhầm sản phẩm giao thoa như *"Máy rửa mặt sóng âm"* ở Shop Gia dụng), nhưng:
       - Hiện **cảnh báo xác nhận trên FE** cho Shop Manager biết tên sản phẩm có dấu hiệu lệch ngành hàng.
       - Tự động **gắn cờ cảnh báo `verticalMismatchWarning`** gửi thẳng lên màn hình duyệt của `SYSTEM_MANAGER` (`ProductModerationPage`) để người duyệt kiểm tra kỹ trước khi cho lên kệ.
2. **Lớp 2 — Kiểm duyệt Maker-Checker của `SYSTEM_MANAGER` (Chốt chặn con người):**
   - Mọi sản phẩm mới tạo đều ở trạng thái `DRAFT` / `PENDING` — **không thể hiển thị ra thị trường** nếu `SYSTEM_MANAGER` chưa kiểm tra tên, ảnh, mô tả, chứng từ VAT/công bố và bấm duyệt.

---

# PHẦN B: KẾ HOẠCH TRIỂN KHAI CHI TIẾT THEO 6 LỘ TRÌNH (PHASES)

> [!IMPORTANT]
> **Nguyên tắc sắp xếp thứ tự Phase để TRÁNH GÃY CHỨC NĂNG LIÊN ĐỚI:**
> 1. **Gỡ Livestream trước (Phase 1)** để làm sạch công thức hoa hồng, giảm bảng DB và bỏ timer 1s gây lag trước khi chỉnh sửa sâu Pricing/Coupons/Commissions.
> 2. **Vá lỗi Contract `400` + Race Condition tài chính (Phase 2)** trước để toàn bộ luồng hiện hữu chạy ổn định, không mất tiền.
> 3. **Tối ưu hiệu năng & Cache (Phase 3)** để quá trình test các Phase sau mượt mà.
> 4. **Nâng cấp nghiệp vụ cốt lõi (Phase 4 & Phase 5)** trên nền tảng đã sạch và nhanh.
> 5. **Chốt bảo mật WF-01 & Kiểm thử hồi quy toàn diện 5 Workflows (Phase 6)**.

---

## PHASE 1: Gỡ bỏ hoàn toàn tính năng Livestream (Làm sạch nền tảng)
- **Mục tiêu:** Xóa sạch toàn bộ code, DB, route, socket, timer 1s và nhánh `+2% liveBonus` của Livestream mà không ảnh hưởng đến 5 Main Workflows.
- **Các file cần sửa / xóa:**
  - **Database (`backend/prisma/`):**
    - `schema.prisma`: Xóa 3 enum (`LiveSessionStatus`, `LiveSessionPlatform`, `LiveSessionInviteStatus`), 4 model (`LiveShoppingSession`, `LiveSessionProduct`, `LiveSessionClaim`, `LiveSessionViewer`), các cột/quan hệ live trên `User`, `Store`, `Product`, `ProductVariant`, `Coupon`, và 2 cột `regularCommissionRate`, `regularCommissionAmount` trên `OrderItem`. Tạo migration mới.
    - `seeds/`: Gỡ dữ liệu live trong `build-dataset.ts`, `commission.seed.ts`, `marketing.seed.ts`, `orders.seed.ts`, `seed.audit.ts`, `seed.database.ts`, `seed.types.ts`, `validate-dataset.ts`.
  - **Backend (`backend/src/`):**
    - Xóa toàn bộ thư mục `modules/live-sessions/` và gỡ `LiveSessionsModule` khỏi `app.module.ts`.
    - `modules/commissions/commission-policy.ts`: Xóa `liveBonusRate()`, bỏ tham số `liveBonus` trong `precedenceCommissionRate()` và `splitCommissionFunding()`.
    - `modules/commissions/commissions.service.ts`: Bỏ nhánh đọc `orderItem.regularCommissionRate` (vì không còn `liveBonus` cần tách riêng).
    - `modules/orders/orders.service.ts`, `dto/create-order.dto.ts`, `order-input.utils.ts`, `payos-payment.service.ts`: Bỏ `liveSessionId`, bỏ tra cứu `liveShoppingSession`, bỏ `cancelPendingLinkForLivePriceReset()`.
    - `modules/coupons/`: Gỡ `liveVoucherActive()` và điều kiện `liveSession` trong `coupons.service.ts`, `voucher-pricing.ts`, `voucher-discovery.ts`.
    - `modules/chat/chat.service.ts`, `modules/dashboard/dashboard.controller.ts`, `dashboard.service.ts`, `modules/notifications/notifications.service.ts`, `modules/mobile/mobile.service.ts`: Gỡ các nhánh/endpoint live.
  - **Frontend (`frontend/src/`):**
    - Xóa các page: `pages/public/LiveStreamRoomPage.tsx`, `pages/merchant/LiveSessionsPage.tsx`, `pages/collaborator/LiveSessionsPage.tsx`, `pages/admin/AdminLiveSessionsPage.tsx`.
    - Xóa components & hooks: thư mục `components/live/`, `KolLivePerformanceCard.tsx`, `LiveInviteMessage.tsx`, `LiveCommerceHubModal.tsx`, `LiveNowSection.tsx`, `LiveSessionDealBadge.tsx`, `LiveSessionDealCard.tsx`, `hooks/useLiveStreamTransport.ts`, `hooks/useLiveFaceFilter.ts`, `services/live-broadcast.service.ts`.
    - Cập nhật gỡ route/menu/tab: `routes/AppRoutes.tsx`, `config/navigation.config.ts`, `components/layout/Sidebar.tsx`, `pages/admin/AdminOversightHubPage.tsx`, `utils/route-preloader.utils.ts`.
    - Cập nhật gỡ tham chiếu `liveSessionId` / live section: `types/cart.types.ts`, `utils/cart-merge.utils.ts`, `context/CartContext.tsx`, `components/checkout/GuestCheckoutModal.tsx`, `pages/public/MarketplacePage.tsx`, `ProductDetailPage.tsx`, `SearchPage.tsx`, `ShopPage.tsx`, `components/marketplace/MarketplaceProductCard.tsx`, `components/store/ShopProductCard.tsx`, `NotificationDropdown.tsx`, `notification-categories.utils.ts`, `api-cache.utils.ts`, `analytics.service.ts`, `KolMarketingReportsPage.tsx`, `VipExceptionsPage.tsx`, `ChatBoxPage.tsx`, `CustomerPortalPage.tsx`.
  - **Tests:** Xóa `frontend/tests/live-*.test.mjs` và cập nhật các spec BE/FE liên quan (`commission-policy.spec.ts`, `cart-merge.test.mjs`, v.v.).
- **🛡️ Chống lỗi liên đới (Regression Guard):**
  - Kiểm tra kỹ `commissions.service.ts`: khi bỏ `regularCommissionRate`, đảm bảo Stage 1 (`baseCommissionAmount = 10% + Tier%`) và Stage 2 (`dealBonusAmount = Deal% - (10% + Tier%)`) vẫn cộng lại khớp 100% với `totalCommission` (không lệch 1₫ làm tròn).
  - Chạy `npx prisma generate`, `npm run build` ở cả BE và FE + chạy lại unit test `commission-policy.spec.ts` và `orders`.

---

## PHASE 2: Vá lỗi Hợp đồng FE ↔ BE (`400`/`404`) & Lỗ hổng An toàn Tài chính (P0)
- **Mục tiêu:** Chặn đứng mọi lỗi `400 Bad Request` khi bấm thao tác trên UI và vá 4 bug nghiêm trọng về tiền/tồn kho/vận đơn.
- **Các file cần sửa:**
  - **Vá 6 điểm lệch FE ↔ BE:**
    1. `frontend/src/components/media/SubmitKolVideoModal.tsx`: Không gửi `posterUrl`, `campaignId`, `requiresCampaignParticipation` vào `POST /sample-requests/:id/video`.
    2. `frontend/src/pages/customer/PartnerUpgradeTab.tsx` + `backend/src/modules/kyc/dto/apply-upgrade.dto.ts`: Ép kiểu `Number(followerCount)` (hoặc thêm `@Type(() => Number)` ở BE), bổ sung validate `channelName` bắt buộc ở FE, strip field `id` và key thừa khỏi `channels[]` trước khi gửi.
    3. `frontend/src/components/chat/ExclusiveOfferModal.tsx` + `backend/src/modules/affiliate-deals/dto/create-exclusive-deal.dto.ts`: Bắt buộc `salesCommitment >= 5` ký tự trên UI (hiển thị `*` rõ ràng); thêm `@IsOptional()` cho `commitmentDays` ở BE DTO.
    4. `frontend/src/components/promotions/ProposePromotionModal.tsx` + `backend/src/modules/pricing/dto/pricing.dto.ts`: Thống nhất `@MinLength(5)` (hoặc `10`) đồng bộ giữa FE và cả 2 DTO single/batch.
    5. `frontend/src/components/coupons/KolCouponManagement.tsx` + `frontend/src/pages/admin/AdminVoucherIssuer.tsx`: Không gửi `0` cho các trường `@IsPositive()` (để `undefined` hoặc bắt buộc nhập `> 0`); đồng bộ regex mã voucher bắt đầu bằng chữ cái `/^[A-Za-z][A-Za-z0-9]{3,19}$/`.
    6. `frontend/src/services/kyc.service.ts`: Xóa hàm chết `applyShopUpgrade` gọi `POST /kyc/upgrade/shop`.
  - **Vá 4 bug tài chính & vận đơn P0:**
    1. `backend/src/modules/commissions/commissions.service.ts:503-510`: Thêm `SHOP_REJECTED` và `INSPECTION_REJECTED` (khi không còn dispute mở) vào điều kiện cho phép giải ngân hoa hồng sau 14 ngày.
    2. `backend/src/modules/affiliate-deals/affiliate-deals.service.ts:1657-1831` & `backend/src/modules/commissions/commissions.service.ts:472-543`: Sửa Race Condition bằng cách khóa cùng thứ tự trên bảng `commissions` (`SELECT ... FOR UPDATE ORDER BY id ASC`) trong cả 2 luồng; sửa tên cột fallback `bucket` → `balanceBucket`.
    3. `backend/src/modules/shipping/ghn.service.ts:379-618`: Bọc `pg_advisory_xact_lock` giống `createSampleShippingOrder` trước khi gọi API GHN tạo vận đơn khách hàng (chống tạo 2 vận đơn trùng).
    4. `backend/src/modules/orders/orders.service.ts:2529-2544`: Khi recover `createMultiStoreOrders` bị gián đoạn, gọi logic hủy đơn đầy đủ (hoàn `stockQuantity`, hoàn `coupon.usageCount`/`budgetUsed`, hoàn `shoppingBalance`).
- **🛡️ Chống lỗi liên đới (Regression Guard):**
  - Kiểm tra kỹ không làm đổi format response `{ success, statusCode, data }` của `TransformInterceptor`.
  - Chạy unit test toàn bộ `orders`, `commissions`, `affiliate-deals`, `coupons`, `kyc`.

---

## PHASE 3: Tối ưu Hiệu năng, Cache & DB Indexes (Hết Lag / Khựng)
- **Mục tiêu:** Loại bỏ hiện tượng khựng UI khi Customer đặt hàng và khi Shop Manager thao tác quản lý đơn/sản phẩm/dashboard.
- **Các file cần sửa:**
  - **Database (`backend/prisma/schema.prisma`):**
    - Thêm 6 composite index:
      - `AuditLog`: `@@index([action, createdAt])`
      - `Order`: `@@index([storeId, createdAt(sort: Desc)])`, `@@index([storeId, status, createdAt(sort: Desc)])`, `@@index([customerId, createdAt(sort: Desc)])`
      - `Commission`: `@@index([dealProposalId, dealBonusStatus])`
      - `ChatMessage`: `@@index([conversationId, createdAt(sort: Desc)])`
      - `CollaboratorProfile`: `@@index([kycStatus])`
  - **Backend Caching & Query Optimization:**
    - `backend/src/core/cache/cache.service.ts`: Thay `redis.keys()` bằng `SCAN` stream non-blocking.
    - `backend/src/modules/orders/orders.service.ts` & `ghn.service.ts`: Thu hẹp `delPrefix('orders:store:')` thành `delPrefix(\`orders:store:\${storeId}:\`)`.
    - `backend/src/modules/shipping/ghn.service.ts`: Cache `calculateShippingFee()` vào Redis (TTL 10 phút); lưu master data tỉnh/quận/phường vào Redis (TTL 24h); chạy `Promise.all` cho `resolveGhnLocation`.
    - `backend/src/modules/stores/stores.service.ts`: Bổ sung `cache.set()` trong `getMyStore()`; chạy `Promise.all` trong `getPublicStoreById()`.
    - `backend/src/modules/products/products.service.ts`: Sửa `invalidateMarketplaceCache()` xóa thêm `products:shop:top:*`; bỏ `visitorIdHash` khỏi cache key chung của `getLandingPageData()`.
    - `backend/src/modules/samples/samples.service.ts` & `affiliate-deals/affiliate-deals.service.ts`: Bổ sung `delPrefix` sau mọi mutation; phân trang `getShopActivePartners` & tránh N+1 `calculateProgress`.
    - `backend/src/modules/customer/customer.service.ts`, `dashboard/dashboard.service.ts`, `payouts/finance-report.service.ts`: Thêm phân trang cho `getOrders()`; dùng SQL `GROUP BY` / `SUM` cho các thống kê thay vì tải full table vào RAM.
  - **Frontend Anti-Lag:**
    - `frontend/src/components/checkout/GuestCheckoutModal.tsx`: Bỏ `shippingAddress` khỏi dependency của `useEffect` báo giá GHN (chỉ trigger theo `province/district/ward` + `items`).
    - `frontend/src/pages/merchant/OrdersManagementPage.tsx`: Sửa bug `isManualFresh` kẹt `true` (reset về `false` sau lần bấm tay, chỉ poll nhẹ 30–60s dùng cache).
    - `frontend/src/context/CartContext.tsx`: Bỏ `syncCart()` khỏi `window.focus` (chỉ đọc nhẹ khi cần, không tạo write-lock `FOR UPDATE` mỗi lần đổi tab).
    - `frontend/src/pages/public/ProductDetailPage.tsx`: Bỏ lệnh gọi thừa `GET /public/products/:id/stock` ngay sau `loadLanding()`.
    - `frontend/src/pages/merchant/ShopDashboardPage.tsx`: Gộp bỏ lời gọi trùng `getMyStoreOrders`, dùng API count/metrics thay vì tải nguyên danh sách deals/samples.
    - `frontend/src/components/chat/ExclusiveDealCardBubble.tsx` & `NotificationDropdown.tsx`: Bỏ storm `focus` trên từng thẻ Deal (đẩy lên cấp chat thread), tăng chu kỳ poll thông báo từ 10s lên 30–45s (hoặc dùng Socket.IO push).
- **🛡️ Chống lỗi liên đới (Regression Guard):**
  - Đảm bảo mọi nơi có cache mới (`getMyStore`, `calculateShippingFee`, `samples:shop`) đều có TTL hợp lý và invalidate đúng lúc cập nhật để không hiển thị dữ liệu cũ (stale data).

---

## PHASE 4: Chuẩn hóa Nghiệp vụ Định giá (`floorPrice`/Promo), Voucher KOL, Cờ tiếp thị & Khóa ngành hàng
- **Mục tiêu:** Triển khai đúng thiết kế nghiệp vụ đã thống nhất ở Phần A cho Mục 1, 2, 8, 9.
- **Các file cần sửa:**
  - **Định giá & Giảm giá (Mục 1):**
    - `backend/src/modules/products/products.service.ts`:
      - Ở `create()` và `update()`: Đổi khóa cứng `price >= minSafePrice` thành **khóa cứng `price >= floorPrice`**; trả thêm metadata `lowMarginWarning` nếu `price < minSafePrice`.
      - Ở `syncVariants()`: **Bổ sung lại khóa cứng `price >= floorPrice`** (bịt lỗ hổng lách sàn).
    - `frontend/src/pages/merchant/ProductManagementPage.tsx`:
      - Step 2 validation: Đổi chặn cứng `minSafePrice` thành **chặn cứng `price >= floorPrice`**, hiển thị **cảnh báo vàng chi tiết biên lợi nhuận** khi `floorPrice <= price < minSafePrice`.
      - Chuyển luồng lưu sửa sản phẩm sang dùng endpoint atomic `PUT /products/:id/editor` thay vì 2 request rời.
    - `frontend/src/pages/shared/ProductModerationPage.tsx` (hoặc trang duyệt SP của `SYSTEM_MANAGER`): Hiển thị badge **"Biên mỏng (dưới ngưỡng an toàn)"** kèm so sánh `floorPrice` / `price` / `minSafePrice`.
    - `backend/src/modules/pricing/pricing.service.ts` & `coupons.service.ts`: Khóa tự động cộng dồn Voucher KOL đối với các dòng sản phẩm đang chạy Promo dưới ngưỡng an toàn / xả dưới sàn (`isClearanceBelowSafeFloor`).
  - **Voucher Độc quyền KOL (Mục 2):**
    - `backend/src/modules/coupons/coupons.service.ts` & `dto/approve-coupon.dto.ts`:
      - Áp dụng khung `PERCENTAGE` `3%–20%` (bắt buộc `maximumDiscountAmount > 0`), `FIXED_AMOUNT` `>= 10.000₫` và `<= 20%` của `minimumOrderAmount`.
      - Thêm nhánh leo thang `PENDING_ADMIN_APPROVAL` khi Voucher vượt `10%` (Shop duyệt bước 1 → Admin duyệt bước 2).
      - Áp dụng lại rule kiểm tra trần trong `updateCouponPolicy()`; thêm `floorPrice: true` khi query `dbVariants` trong `evaluateCoupon()`.
    - `frontend/src/components/chat/ProposeCouponInChatModal.tsx`, `CouponProposalCardBubble.tsx`, `components/coupons/KolCouponManagement.tsx`, `pages/admin/VipExceptionsPage.tsx`: Đồng bộ khung `3%–20%`, thêm bảng mô phỏng biên lợi nhuận cho Shop & KOL, thêm tab/mục duyệt Voucher `> 10%` cho `SYSTEM_ADMIN`.
  - **Cờ "Mở tiếp thị" — Phương án A (Mục 8):**
    - `backend/src/modules/products/products.service.ts:1379`: Đổi fallback `dto.isAffiliateEnabled ?? true`.
    - `frontend/src/pages/merchant/ProductManagementPage.tsx`: Mặc định `formAffiliateEnabled = true` và ẩn nút tắt tiếp thị trên form tạo/sửa sản phẩm.
  - **Khóa ngành hàng 2 lớp (Mục 9):**
    - `backend/src/modules/products/products.service.ts`: Giữ nguyên khóa cứng `categoryName = store.categoryName` cho `SHOP_MANAGER`, bổ sung hàm `detectVerticalMismatchWarning(title, store.categoryName)` trả cờ cảnh báo khi tên SP có dấu hiệu lệch ngành hàng.
    - `frontend/src/pages/merchant/ProductManagementPage.tsx` & màn hình duyệt SP của `SYSTEM_MANAGER`: Hiển thị cảnh báo mềm khi phát hiện tên sản phẩm nghi ngờ lệch ngành hàng của cửa hàng.
- **🛡️ Chống lỗi liên đới (Regression Guard):**
  - Chạy lại toàn bộ test pricing & coupon (`coupons`, `pricing`, `escrow-amounts.test.mjs`, `orders`) để đảm bảo tính `netGoods`, hoàn tiền và phân bổ chiết khấu không bị sai lệch.

---

## PHASE 5: Hoàn thiện Nghiệp vụ Hàng mẫu (Sample SLA + Trọng tài) & Exclusive Deal
- **Mục tiêu:** Đóng chặt lỗ hổng hàng mẫu cho cả 2 phía (Shop & KOL) và tự động hóa chốt Deal KPI.
- **Các file cần sửa:**
  - **Database (`backend/prisma/schema.prisma`):**
    - Thêm `APPEALED` vào enum `SampleRequestStatus` (và cột `appealReason String?`, `appealedAt DateTime?`, `revisionCount Int @default(0)` trên `SampleProductRequest`).
    - Thêm `dealViolationCount Int @default(0)` và `dealCooldownUntil DateTime?` vào `CollaboratorProfile`.
  - **Backend Samples (`backend/src/modules/samples/`):**
    - `samples.controller.ts` & `samples.service.ts`:
      - Thêm `PATCH /sample-requests/:id/review-video` để `SHOP_MANAGER` duyệt/yêu cầu sửa trực tiếp (giới hạn 2 vòng sửa, bắt buộc lý do `>= 15` ký tự).
      - Thêm `POST /sample-requests/:id/appeal` để KOL yêu cầu `SYSTEM_MANAGER` trọng tài khi bị từ chối vô lý (đóng băng đồng hồ SLA).
      - Mở rộng `resolveRequestAsAdmin` hỗ trợ `FORCE_COMPLETE` / `UPHOLD_REVISION` / `CONFIRM_VIOLATION`; sửa bug `EXTEND_DEADLINE` (reset `overdueAt`) và `CANCEL_OBLIGATION` (hoàn `sampleGrantedCount`).
      - Cập nhật `getEligibility()` & `createRequest()`: **Tự động chặn tạo yêu cầu mẫu mới** nếu KOL có đơn `OVERDUE` chưa xử lý; tự động khóa `sampleRequestsBlockedAt` nếu tích lũy $\ge 2$ vi phạm.
      - Chốt dứt điểm nhánh giao hàng ngoài GHN (hoặc chỉ dùng GHN, hoặc chỉ mở `/receive` cho đơn non-GHN).
  - **Frontend & Mobile Samples:**
    - `frontend/src/pages/collaborator/ShopCollaborationPage.tsx`, `SampleRequestsPage.tsx`, `Mobile/src/features/samples/SamplesScreen.tsx`: Gỡ nút `/receive` chết đối với đơn GHN; thêm nút **"Yêu cầu Trọng tài"** khi trạng thái là `REVISION_REQUIRED`; hiển thị rõ thông báo khóa xin mẫu khi đang có đơn `OVERDUE`.
    - `frontend/src/components/samples/ShopSampleManagementTab.tsx` & `pages/admin/AdminSampleRequestsPage.tsx`: Thêm nút duyệt/yêu cầu sửa video trực tiếp cho Shop Manager và hàng đợi phân xử `APPEALED` cho `SYSTEM_MANAGER`.
  - **Backend Exclusive Deals (`backend/src/modules/affiliate-deals/`):**
    - `affiliate-deals.service.ts` & `deal-proposal-creation.ts`: Đọc/ghi `dealViolationCount` & `dealCooldownUntil` từ cột mới trên `CollaboratorProfile` (thay vì `socialLinksJson`); bổ sung `@Cron(CronExpression.EVERY_DAY_AT_2AM)` tự động gọi `settleSuccessfulDeal()` cho Deal đạt KPI và gửi nhắc chốt cho Deal quá hạn `settlementEndsAt`.
- **🛡️ Chống lỗi liên đới (Regression Guard):**
  - Kiểm tra cron `SamplesService.processDeadlines()` không đánh `OVERDUE` đối với đơn đang ở trạng thái `APPEALED`.
  - Kiểm tra dữ liệu cũ trong `socialLinksJson.dealViolations` (nếu có) có fallback đọc hoặc migrate nhẹ sang cột mới.

---

## PHASE 6: Củng cố WF-01 & Kiểm thử Hồi quy Toàn hệ thống (5 Main Workflows)
- **Mục tiêu:** Đóng nốt các lỗ hổng quản trị nhân sự/eKYC ở WF-01 và chạy kiểm thử E2E xuyên suốt 5 luồng trước ngày bảo vệ.
- **Các file cần sửa:**
  - `backend/src/modules/stores/stores.service.ts:220-255`: Xóa logic tự động tạo Store rác trong `getMyStore()` (trả `404/403` nếu user chưa được Admin gán Store).
  - `backend/src/modules/users/users.service.ts:176-193`: Trong `createInternalStaff()`, không ghi đè `store.ownerId` nếu Store đã có owner.
  - `backend/src/modules/kyc/kyc.service.ts:621-781` & `kyc.controller.ts`: Bọc `reviewKolApplication()` trong `$transaction`, bổ sung check Maker-Checker `reviewerId !== applicantUserId` + ghi `AuditLog`, xóa sạch code & route `applyShopUpgrade` / `PATCH /kyc/admin/shop/:id/review`.
- **Checklist Kiểm thử Hồi quy (5 Main Workflows — Web + Backend):**
  - **WF-01:** Admin tạo Store + 2 Shop Manager không ghi đè owner → KOL đăng ký `/register` & nộp eKYC → System Manager duyệt Maker-Checker → KOL nhận Bậc Đồng 10%.
  - **WF-02:** Shop Manager tạo SP với `price >= floorPrice` (test cả trường hợp `< minSafePrice` hiện cảnh báo vàng + tên SP lệch ngành hiện cảnh báo) → System Manager thấy cờ cảnh báo & duyệt → Shop tạo Promo dưới sàn (Admin duyệt, tự tắt cộng dồn Voucher KOL) → Đàm phán Deal `<= 16%` (Shop duyệt) và `> 16%` (Admin duyệt).
  - **WF-03:** KOL xin mẫu (GHN) → Shop duyệt & ship → KOL nộp link video → Test cả 2 nhánh (Shop duyệt đạt & KOL bấm Trọng tài khi bị từ chối vô lý) → Test chặn xin mẫu mới khi `OVERDUE` → KOL tạo Link/QR & đề xuất Voucher `15%` (Shop xác nhận → Admin duyệt) → Khách đặt đơn nhanh, không lag khi gõ địa chỉ.
  - **WF-04:** Shop bấm tạo vận đơn GHN (test bấm nhanh 2 lần không tạo trùng) → Giao hàng thành công → Test đổi hàng 1-1 (giữ nguyên hoa hồng) vs hoàn tiền (Clawback) vs Shop từ chối đổi trả (hoa hồng vẫn mở khóa bình thường sau 14 ngày!).
  - **WF-05:** Hoa hồng giải ngân 2 giai đoạn (`10% + Bậc` sau 14 ngày, `Deal% - (10% + Bậc)` khi đạt KPI — test không bị kẹt Escrow) → KOL rút tiền khấu trừ thuế TNCN 10% → Executive Financial Ledger khớp 100%.
