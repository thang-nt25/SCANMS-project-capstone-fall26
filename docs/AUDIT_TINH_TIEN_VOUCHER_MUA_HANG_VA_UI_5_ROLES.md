# BÁO CÁO AUDIT CHUYÊN SÂU: TÍNH TIỀN, VOUCHER KOL, MUA – GIAO – NHẬN HÀNG, UI 5 VAI TRÒ & RỦI RO KHI DEMO (SCANMS — FA26SE032)

> **Tài liệu đối chiếu:** `docs/SCANMS_Kich_Ban_Demo_Bao_Ve_Do_An_Va_Phan_Tich_Ky_Thuat.docx`, `GEMINI.md`, `AGENTS.md`, `.agents/skills/*`, và mã nguồn thực tế `backend/` + `frontend/`.

---

## 1. GIẢI MÃ CASE THỰC TẾ: RÚT TIỀN KOL `1.400.000₫` – RÚT `200.000₫` NHƯNG UI TỪNG HIỆN `1.220.000₫`

### 1.1. Kỳ vọng nghiệp vụ đúng
- Số dư khả dụng ban đầu (`availableBalance`): **`1.400.000 ₫`**
- KOL tạo lệnh rút (**Gross**): **`200.000 ₫`**
- Thuế TNCN khấu trừ tại nguồn (`10%`): **`20.000 ₫`**
- Tiền thực nhận về ngân hàng (**Net 90%**): **`180.000 ₫`**
- Số dư khả dụng còn lại sau khi tạo lệnh: **`1.400.000 - 200.000 = 1.200.000 ₫`** (và **`200.000 ₫`** nằm ở giỏ *Đang khóa chờ chi / `lockedPayoutBalance`*).

### 1.2. Tại sao trên UI từng xuất hiện con số `1.220.000 ₫`?
Con số `1.220.000 ₫` chính xác là **`1.400.000 - 180.000 (Net)`**. Điều này xảy ra khi hệ thống (ở phiên bản cũ hoặc khi tính nhầm) **chỉ trừ `netAmount` (`180.000₫`) khỏi `availableBalance` thay vì trừ `grossAmount` (`200.000₫`)**, khiến **`20.000₫` tiền thuế vẫn nằm lại trong ví khả dụng** của KOL (tạo lỗ hổng KOL có thể rút tiếp phần tiền thuế đó).

### 1.3. Trạng thái hiện tại trong mã nguồn & Điểm vẫn còn dễ gây hiểu nhầm khi Demo
- **Backend hiện tại đã sửa đúng logic trừ Gross:**
  - `backend/src/modules/payouts/payouts.service.ts` (L128–151): Trừ toàn bộ `amount` (`200.000`, Gross) qua `walletsService.debitAvailableBalanceForWithdrawal(...)`, đồng thời lưu `taxAmount = 20.000`, `netAmount = 180.000` (comment L149: `// Gross is debited once. Tax is withheld from it, not debited again.`).
  - `backend/src/modules/payouts/payout-tax.service.ts` (L10–22): Tính `taxAmount = grossAmount * 0.10`, `netAmount = grossAmount - taxAmount`.
  - `backend/src/modules/wallets/wallet-summary.service.ts` (L88–100): `lockedPayoutBalance` cộng tổng `amount` (Gross `200.000`) của các lệnh `PENDING | PROCESSING`.
- **Nhưng UI giữa các vai trò ĐANG LỆCH PHA HIỂN THỊ (dễ bị Hội đồng bắt bẻ):**
  1. **KOL (`frontend/src/pages/collaborator/WalletPage.tsx` L636–685):** Card 4 *"Đang Chờ Giải Ngân"* hiển thị **`lockedPayoutBalance` = `200.000 ₫` (Gross)** kèm badge `Thuế TNCN 10%`, nhưng **không ghi rõ ngay trên card** phần thực nhận `180.000 ₫` và thuế `20.000 ₫`.
  2. **Kế toán / Admin (`frontend/src/pages/admin/AdminFinancePayoutsPage.tsx` L263–273):** Thẻ KPI *"Chờ phê duyệt"* lại hiển thị **`stats?.pending.netAmount` = `180.000 ₫` (Net)**!
     - **Rủi ro khi demo:** Nếu chuyển tab từ ví KOL (đang khóa `200.000 ₫`) sang màn hình Kế toán (thấy chờ phê duyệt `180.000 ₫`), giám khảo rất dễ hỏi: *"Tại sao bên KOL khóa 200k mà bên Kế toán chỉ thấy chờ chi 180k? 20k kia đi đâu?"*
  3. **Cache UI phía Client (`WalletPage.tsx` L99–104 & `wallet.service.ts` L53–68):** `WalletPage.tsx` giữ `lastWalletSnapshot` ở cấp module và `walletService.getMyWallet(fresh)` chỉ gửi `x-skip-cache: true` khi `fresh = true`. Nếu chuyển qua lại giữa Dashboard KOL (`KolDashboardPage.tsx`) và Ví (`WalletPage.tsx`) ngay sau thao tác rút tiền/giải ngân, có thể xảy ra độ trễ đồng bộ hiển thị nếu không invalidate cache đồng loạt.

---

## 2. CÁC LỖ HỔNG NGHIÊM TRỌNG DỄ BỊ HỘI ĐỒNG BẮT BẺ (CODE VS KỊCH BẢN DEMO)

### Lỗ hổng #1 (CRITICAL): Hoa hồng tính trên giá GỐC trước khi trừ Voucher KOL
- **Quy tắc chuẩn (`GEMINI.md` Mục 4):** $V$ là giá trị tính thù lao ròng **sau khi trừ chiết khấu Voucher Deal độc quyền của KOL** (không gồm phí ship).
- **Thực tế trong Code:**
  - `backend/src/modules/orders/orders.service.ts` (L2007–2016):
    ```ts
    const remunerationBase = unitPrice * quantity; // KHÔNG trừ appliedDiscountAmount!
    const calculatedCommission = remunerationBase * (finalCommissionRate / 100);
    ```
  - `backend/src/modules/commissions/commission-calculator.service.ts` (L31): Tham số `_discountAmount` có dấu gạch dưới và **hoàn toàn không được sử dụng** trong phép tính `itemSubtotal = item.unitPrice.times(item.quantity)`.
- **Sai sót ngay trong Kịch bản Demo (`SCANMS_Kich_Ban_Demo...docx` Bước 3.5 & 4.2):**
  - Bước 3.5: Serum giá `390.000 ₫`, khách áp mã `THAONHI16` giảm 10% (`39.000 ₫`) $\rightarrow$ khách chỉ thanh toán **`351.000 ₫`**.
  - Bước 4.2: Kịch bản lại ghi *"Khoản 1 (10% = 39.000đ)... Khoản 2 (6% = 23.400đ)"* — tức đang tính hoa hồng trên **`390.000 ₫`** thay vì doanh thu thực thu **`351.000 ₫`** (đúng ra phải là `35.100 ₫` và `21.060 ₫`).
- **Mức độ rủi ro khi bảo vệ:** **Rất cao.** Bất kỳ giảng viên nào để ý phép nhân sẽ hỏi: *"Khách chỉ trả 351k sao lại trả hoa hồng cho KOL trên 390k? Shop vừa chịu giảm giá 39k vừa trả hoa hồng trên phần tiền không thu được à?"*

### Lỗ hổng #2 (CRITICAL): Floor Price Guard (`floorPrice`) KHÔNG chặn Checkout khi áp Voucher KOL
- **Quy tắc chuẩn (`GEMINI.md` & `kol-merchant-governance`):** Không một mã giảm giá nào của KOL được phép đẩy đơn giá thực thu xuống dưới `floorPrice` nếu chưa có ngoại lệ của `SYSTEM_ADMIN`.
- **Thực tế trong Code:**
  - `backend/src/modules/coupons/coupons.service.ts` (L2727–2732): Khi kiểm tra `discountedUnitPrice < itemFloorPrice`, hệ thống **CHỈ ghi `this.logger.warn('[CLEARANCE_DISCOUNT]...')` và KHÔNG chặn checkout**!
  - `backend/src/modules/orders/orders.service.ts`: Không có bất kỳ bước kiểm tra `floorPrice` nào khi tạo đơn hàng có áp coupon.
- **Mức độ rủi ro khi bảo vệ:** **Rất cao.** Kịch bản Bước 2.4 demo chặn giảm giá dưới sàn `350.000₫` ở màn hình Khuyến mãi giá, nhưng nếu giám khảo yêu cầu thử áp mã KOL giảm sâu làm giá đơn hàng tụt xuống dưới `350.000₫` tại Checkout, hệ thống vẫn cho đặt đơn thành công.

### Lỗ hổng #3 (HIGH): Sót chữ "7 ngày" trên UI & API dù nghiệp vụ đã chốt "14 ngày"
- `backend/src/modules/commissions/commission.constants.ts` (L3) đã đặt `COMMISSION_HOLD_DAYS = 14`.
- **Nhưng vẫn còn 2 chỗ ghi cứng "7 ngày":**
  1. `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx` (L251): Tab 2 ghi **`Bảo chứng Escrow · 7 ngày`**.
  2. `backend/src/modules/commissions/commissions.service.ts` (L658): API policy description trả về **`'Hoa hồng được bảo chứng 7 ngày lịch kể từ khi giao thành công...'`**.
- **Mức độ rủi ro:** Dễ bị bắt lỗi thiếu đồng nhất giữa tài liệu, UI và code khi mở trang Kế toán/Admin.

### Lỗ hổng #4 (HIGH): Tàn dư tính năng đã bãi bỏ vẫn còn trong Codebase & UI
- `GEMINI.md` yêu cầu **bãi bỏ vĩnh viễn**: Voucher sàn / Voucher công khai của Shop, Media Hub, Gom đợt khuyến mãi (Campaigns).
- **Thực tế:**
  - `frontend/src/pages/admin/AdminVoucherIssuer.tsx` (*"Phát hành voucher sàn"*) và `AdminVoucherSettlements.tsx` vẫn tồn tại trong `frontend/src/pages/admin/` (dù backend `coupons.service.ts` L2187 đã khóa bằng `retiredVoucherFeature()` trả lỗi `410 Gone`).
  - `backend/src/modules/orders/orders.service.ts` (L1959–2044) vẫn giữ logic tính `campaignBonus` và trừ `bonus_budget_used` của bảng `campaigns`.
  - `backend/src/modules/commissions/commissions.service.ts` (L248–266): Khi tách `totalBaseCommission` và `totalDealCommission`, hệ thống kiểm tra `appliedRate > tierBaseRateNum`. Nếu một đơn hàng vừa có **Livestream `+2%`** vừa có **Deal đang active** ở cùng Shop, phần `+2%` của Livestream có nguy cơ bị tính gộp vào `totalDealCommission` (treo vào `conditionalDealEscrowBalance` chờ KPI) thay vì giải ngân cùng chu kỳ 14 ngày!

### Lỗ hổng #5 (MEDIUM): Vi phạm nhỏ về màu sắc Thương hiệu (Vàng Be vs Emerald/Blue)
- Theo `GEMINI.md` Mục 1: Không dùng màu xanh lá (`#059669` / `emerald`) làm màu nền badge/card lớn.
- `WalletPage.tsx` (L1401) dùng `bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]` cho badge số tiền *Thực nhận*.
- `AdminFinancePayoutsPage.tsx` (L63–64, L279, L303) dùng `bg-emerald-50 text-emerald-700` và `text-blue-700` cho trạng thái *Đã giải ngân* và KPI.

---

## 3. GÓC NHÌN CỦA TỪNG ROLE (5 VAI TRÒ): MUA HÀNG – GIAO HÀNG – NHẬN HÀNG – TIỀN & VOUCHER

Dưới đây là ma trận đối chiếu **những gì mỗi Role cần thấy** theo đúng luồng Mua $\rightarrow$ Giao $\rightarrow$ Nhận/Đổi trả $\rightarrow$ Quyết toán tiền, kèm đánh giá trạng thái hiện tại trên UI:

| Vai trò | Giai đoạn | Cần thấy gì trên UI? | Thực tế UI hiện tại & Điểm cần lưu ý |
| :--- | :--- | :--- | :--- |
| **1. `CUSTOMER`** | **Mua hàng & Voucher** | - Nhập mã Voucher KOL độc quyền (`THAONHI16`), thấy rõ số tiền giảm, phí ship GHN, tổng thực trả.<br>- Không thấy voucher sàn/voucher công khai của Shop. | - `GuestCheckoutModal.tsx` & `ScanmsCheckoutVoucherModal.tsx` chỉ cho nhập mã KOL (`POST /coupons/validate`).<br>- `CustomerVouchersTab.tsx` ghi rõ chỉ sao chép mã KOL. **Ổn**, nhưng cần chặn `floorPrice` ở BE để không báo lỗi bất ngờ lúc thanh toán. |
| | **Giao & Nhận hàng** | - Timeline GHN, mã vận đơn, nút *Xác nhận đã nhận hàng*, đồng hồ đếm ngược **14 ngày** được quyền đổi/trả.<br>- Nếu khiếu nại: chọn *Đổi 1-1* hoặc *Trả hàng hoàn tiền* kèm Video Unboxing. | - `CustomerCompletedOrderDetail.tsx` & `CustomerOrderProgress.tsx` hiển thị đủ timeline 5 bước + GHN tracking.<br>- Khi hoàn tiền, tiền vào `shoppingBalance` (Ví mua sắm, không rút bank — đúng logic chống AML ở Chương 5 Q&A). |
| **2. `COLLABORATOR` (KOL)** | **Voucher & Link** | - Smart Link, Dynamic QR, Mã Voucher Deal độc quyền (`THAONHI16`) kèm trạng thái (`ACTIVE` / `PENDING_APPROVAL`), số lượt dùng & GMV mang về. | - `KolCouponsPage.tsx` & `MarketingToolkitPage.tsx` thể hiện đầy đủ. |
| | **Đơn hàng & Tiền** | - Thấy đơn phát sinh qua link/mã của mình (nhưng **ẩn thông tin nhạy cảm** của khách).<br>- Thấy rõ **4 giỏ tiền** tách bạch:<br>  1. *Khả dụng rút* (`availableBalance`)<br>  2. *Chờ đối soát 14 ngày* (`10% + Bậc%`)<br>  3. *Ký quỹ KPI Deal* (`Deal% - (10% + Bậc%)`)<br>  4. *Đang khóa chờ chi* (`lockedPayoutBalance`: nên hiện cả Gross `200k`, Thuế `20k`, Net `180k`).<br>- Thấy cảnh báo nếu đơn bị **Self-Referral (`0₫`)** hoặc **Clawback**. | - `WalletPage.tsx` có đủ 4 card giỏ tiền + bảng phân bổ theo Store + lịch sử giao dịch + bảng tính trước thuế `10%` & thực nhận `90%`.<br>- **Cần bổ sung:** Trên Card 4 (*Đang chờ giải ngân*) nên hiển thị dòng phụ `Thực nhận sau thuế: ... ₫` để khớp 100% với số tiền bên Kế toán duyệt. |
| **3. `SHOP_MANAGER`** | **Sản phẩm & Voucher** | - Thấy Giá niêm yết, Giá KM, **Giá sàn `floorPrice`**, khóa ngành hàng.<br>- Duyệt/từ chối mã Voucher đề xuất từ KOL và đàm phán Deal (`<= 16%` tự duyệt, `> 16%` leo thang Admin). | - `ShopPromotionsHubPage.tsx` & `ShopCreatorIncentivesTab.tsx` quản lý tốt. |
| | **Đơn hàng, Giao & Đổi trả** | - Thấy doanh thu đơn hàng, chiết khấu voucher KOL, mã vận đơn GHN định tuyến đúng kho vệ tinh.<br>- Xử lý đổi 1-1 (mở claim GHN, bảo lưu hoa hồng KOL) vs Hoàn tiền (kích hoạt Clawback).<br>- **Không có nút rút tiền** (tài khoản nội bộ). | - `OrdersManagementPage.tsx` có in vận đơn GHN A6, tạo đơn GHN.<br>- `ShopRevenueWalletPage.tsx` L159 có ghi chú rõ *"Doanh thu ghi nhận không phải số dư có thể rút"*. |
| **4. `SYSTEM_MANAGER`** | **Vận hành & Kế toán** | - Duyệt eKYC Maker-Checker, duyệt sản phẩm mới, trọng tài khiếu nại đổi trả.<br>- Duyệt rút tiền KOL: thấy **3 cột rõ ràng (`Yêu cầu Gross`, `Thuế TNCN 10%`, `Thực chi Net 90%`)**, mã Napas/BIDV Sandbox, check rủi ro. | - `AdminFinancePayoutsPage.tsx` có đủ 3 cột, Risk check, Napas/BIDV Sandbox.<br>- **Lỗi cần sửa:** Tab 2 đang ghi `7 ngày` thay vì `14 ngày`; KPI card *Chờ phê duyệt* hiện `netAmount` gây lệch cảm nhận với `lockedPayoutBalance` (Gross) bên KOL. |
| **5. `SYSTEM_ADMIN`** | **Giám sát tối cao** | - Duyệt Deal `> 16%` đến `25%`, ngoại lệ giá sàn.<br>- **Executive Financial Dashboard:** Thấy cân đối 4 rổ tiền (GMV, Net Revenue, Escrow 14 ngày, Khả dụng KOL, Thực chi Net, Thuế TNCN 10%, Độ lệch `0 ₫`), tách bạch số liệu thật vs Sandbox Demo. | - `AdminAnalyticsHubPage.tsx` & `FinanceReports.tsx` (`ExecutiveFinanceReport`) thể hiện rất chi tiết, có cả nút `(!)` giải thích từng chỉ số và phần tách riêng Sandbox Demo. |

---

## 4. ĐÁNH GIÁ HỆ THỐNG SKILLS TRONG `.agents/skills/` & ĐỀ XUẤT MỞ RỘNG

### 4.1. Đánh giá các Skills hiện có tại `c:\HW\CAPSTONE\.agents\skills`
Bộ skill hiện tại rất mạnh về **UI/UX, React/NestJS và Nghiệp vụ SCANMS**:
- **`kol-merchant-governance`**: Rất tốt — đã khóa chặt các quy tắc Post-Review 2 (In-house Store, 4 tính năng bãi bỏ, Floor Price, 2-stage Commission không cộng dồn, SLA 14 ngày).
- **`nestjs-backend` & `supabase-postgres-best-practices`**: Bao phủ tốt kiến trúc Modular Monolith, Row-Level Locking (`FOR UPDATE`), Prisma/Postgres performance.
- **`better-ui`, `better-colors`, `better-layout`, `better-typography`, `frontend-design`, `vercel-react-best-practices`**: Hướng dẫn tốt về thiết kế hệ thống token (Warm Sand & Gold), contrast, layout, và tối ưu React.
- **`code-review-expert`**: Hỗ trợ rà soát SOLID và bảo mật.

### 4.2. Khoảng trống (Gaps) & Skills nên tham khảo/bổ sung từ GitHub
Hiện tại `.agents/skills` **thiếu 2 mảng skill cực kỳ quan trọng** cho giai đoạn chốt hạ bảo vệ đồ án tài chính:
1. **FinTech Ledger & Accounting Invariants Skill (Kiểm toán số dư & Bất biến tài chính):**
   - *Vấn đề:* Những lỗi như tính hoa hồng trên giá chưa trừ voucher (`390k` thay vì `351k`), hay trộn lẫn `Gross` và `Net` giữa các màn hình, xảy ra vì chưa có checklist kiểm tra bất biến kế toán (*Accounting Invariants*: `Order Net = Subtotal - Discount`, `Gross Payout = Tax + Net`, `Ledger Sum == Wallet Balance`).
   - *Gợi ý tham khảo trên GitHub:* Các bộ skill/pattern về **Double-Entry Bookkeeping / Financial Invariants & Security Audit** (ví dụ các repo `trailofbits/skills` hoặc `anthropics/skills` / OWASP API Security checklists) để dùng cho bước review mọi PR liên quan đến `wallets`, `payouts`, `commissions`, `orders`.
2. **Playwright E2E Verification Skill (Kiểm thử luồng Demo End-to-End tự động):**
   - *Vấn đề:* Demo gồm 5 Workflow liên hoàn qua 5 tài khoản. Test unit/integration từng module không bắt được lỗi UI hiển thị lệch giữa Role này và Role khác (ví dụ KOL thấy `200k` còn Admin thấy `180k`, hoặc tab ghi `7 ngày`).
   - *Gợi ý tham khảo trên GitHub:* Cài/tích hợp skill **Playwright E2E / Webapp Testing** (ví dụ `anthropics/skills` -> `webapp-testing` hoặc `microsoft/playwright-mcp` skill) để viết script chạy tự động toàn bộ kịch bản DS-01a $\rightarrow$ DS-05b trước ngày bảo vệ, chụp ảnh xác minh đúng số tiền trên từng màn hình.

---

## 5. CHECKLIST HÀNH ĐỘNG ƯU TIÊN TRƯỚC KHI BẢO VỆ ĐỒ ÁN

1. **[Bắt buộc - Code BE & Kịch bản]** Chốt dứt khoát và đồng bộ giữa Code với Kịch bản Demo về cơ sở tính hoa hồng sau Voucher KOL:
   - Nếu theo `GEMINI.md` (tính trên giá **sau** giảm `351.000₫`): sửa `orders.service.ts` L2007 dùng `linePricing` (sau discount) và cập nhật lại số trong `SCANMS_Kich_Ban_Demo...docx` (`35.100₫` & `21.060₫`).
   - *(Hoặc nếu giữ tính trên giá gốc `390.000₫` như kịch bản hiện tại, phải sửa lại định nghĩa $V$ trong `GEMINI.md` và chuẩn bị sẵn lý lẽ "doanh thu niêm yết trước trợ giá" — nhưng phương án tính trên giá thực thu `351.000₫` an toàn hơn trước Hội đồng).*
2. **[Bắt buộc - Code BE]** Bổ sung **chặn cứng `floorPrice`** trong `coupons.service.ts` (L2727) và `orders.service.ts` khi áp mã KOL làm đơn giá thực thu < `floorPrice` (trả `400 Bad Request` thay vì chỉ `logger.warn`).
3. **[Nhanh - UI & Copy]** Sửa 2 chỗ còn sót chữ **`7 ngày`** thành **`14 ngày`** tại `AdminFinancePayoutsPage.tsx` (L251) và `commissions.service.ts` (L658).
4. **[Nhanh - UI]** Trên `WalletPage.tsx` (Card 4 *Đang chờ giải ngân*) và `AdminFinancePayoutsPage.tsx` (KPI *Chờ phê duyệt*), hiển thị song song cả **Gross (`200.000 ₫`)** và **Net thực nhận (`180.000 ₫`)** để 2 màn hình khớp nhau 100% khi đối chiếu trước Hội đồng.
5. **[Dọn dẹp]** Kiểm tra `AppRoutes.tsx` và Sidebar Admin để chắc chắn không còn đường dẫn nào trỏ tới `AdminVoucherIssuer` (Voucher sàn đã bãi bỏ).
