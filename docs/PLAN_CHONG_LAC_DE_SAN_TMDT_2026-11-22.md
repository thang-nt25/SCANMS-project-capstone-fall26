# PHÂN TÍCH LỖ HỔNG "LẠC ĐỀ SÀN TMĐT" & PLAN CHUẨN HÓA BẢN CHẤT HỆ THỐNG (SCANMS)

- **Dự án:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết (**SCANMS — `FA26SE032`**)
- **Mục tiêu:** Rà soát và triệt tiêu 100% các chức năng, luồng tiền, quyền hạn và câu chữ mang tính chất **Sàn thương mại điện tử mở (Open Marketplace kiểu Shopee/Lazada)** còn sót lại trong code, đảm bảo toàn bộ hệ thống phản ánh đúng **Hệ thống Quản trị Nội bộ Doanh nghiệp Đa Nhãn hàng & Mạng lưới Cộng tác viên / Tiếp thị Liên kết**.
- **Trạng thái:** **CHỈ PHÂN TÍCH & LẬP PLAN — CHƯA CHỈNH SỬA CODE.**

---

## PHẦN A: 5 NHÓM LỖ HỔNG CÓ THỂ BIẾN HỆ THỐNG THÀNH SÀN TMĐT

### 1. [Mức độ: CAO] Tồn tại UI & Logic "Voucher Sàn" & "Đối soát trợ giá Sàn"
- **Hiện trạng trong code:**
  - `frontend/src/pages/admin/AdminVoucherIssuer.tsx` (dòng 52, 74): Tiêu đề *"Phát hành voucher sàn — Thiết lập ưu đãi do SCANMS tài trợ cho gian hàng"*, badge preview **`Voucher Sàn`**.
  - `frontend/src/pages/admin/AdminVoucherSettlements.tsx` (dòng 27–31): *"Đối soát voucher sàn theo gian hàng — Mở từng gian hàng để xem đơn và ghi nhận giao dịch đã chuyển"*.
  - `backend/src/modules/coupons/coupons.service.ts`: Còn giữ các hàm `getPlatformSubsidies()`, `getStorePlatformSubsidies()`, `platformFundingRate`, `platformFundedAmount`.
- **Tại sao làm lạc đề?**
  - Nếu có "Voucher Sàn" và "Đối soát chuyển tiền bù giá cho từng gian hàng", hội đồng sẽ hiểu ngay SCANMS là **sàn trung gian** đang thu hút **nhiều chủ shop độc lập bên ngoài** và phải chuyển khoản bù tiền trợ giá cho họ. Điều này đi ngược hoàn toàn với mô hình **1 doanh nghiệp sở hữu 4 nhãn hàng trực thuộc**.

### 2. [Mức độ: CAO] Chức năng "Quảng cáo Gian hàng Trả tiền" (`SponsoredPlacement`)
- **Hiện trạng trong code:**
  - `backend/src/modules/stores/stores.service.ts` (`getSponsoredPlacements`, dòng 564+), `backend/src/modules/stores/sponsorship/`, `frontend/src/services/sponsorship.service.ts`.
  - Cho phép cửa hàng gửi yêu cầu đặt chỗ hiển thị trả tiền (`fundingType: 'PAID'`), nộp `paymentReference` và ảnh biên lai chuyển khoản `paymentProofUrl` để Admin duyệt.
- **Tại sao làm lạc đề?**
  - **Không một doanh nghiệp nào bắt 4 nhãn hàng/chi nhánh trực thuộc của chính mình chuyển khoản mua vị trí quảng cáo trên website của công ty.** Đây là mô hình thu phí Seller Ads đặc trưng của Shopee/TikTok Shop.

### 3. [Mức độ: CAO] Dư âm "Ví Gian hàng" & "Tài khoản Ngân hàng Rút tiền của Shop"
- **Hiện trạng trong code:**
  - `backend/src/modules/stores/stores.service.ts` (dòng 296–309): Cho phép cập nhật `payoutBankName`, `payoutBankAccountNumber`, `payoutBankAccountName` trên `Store`.
  - `backend/src/modules/payouts/`: Tồn tại `merchant-payouts.controller.ts` và các route `merchant/payouts`, `stores/:storeId/payouts` trong `AppRoutes.tsx` (dòng 193, 197).
  - `frontend/src/components/chat/ProposeCouponInChatModal.tsx` (dòng 308): Ghi *"Cửa hàng chi trả 100%"* / *"Shop tài trợ 100%"*.
- **Tại sao làm lạc đề?**
  - `SHOP_MANAGER` là nhân sự nội bộ công ty, **không sở hữu ví tiền hay tài khoản ngân hàng nhận doanh thu riêng**; toàn bộ doanh thu bán hàng thuộc về quỹ tổng của doanh nghiệp do `SYSTEM_ADMIN` / `SYSTEM_MANAGER` kiểm soát. Việc còn chữ *"Shop tài trợ 100%"* hoặc chỗ nhập số tài khoản ngân hàng của Shop gây mâu thuẫn trực tiếp với mô hình tập trung dòng tiền.

### 4. [Mức độ: TRUNG BÌNH] KOL tự chọn `%` & `Trần giảm giá` khi đề xuất Voucher
- **Hiện trạng trong code:**
  - `frontend/src/pages/collaborator/CouponProposalDialog.tsx` & `frontend/src/components/chat/ProposeCouponInChatModal.tsx`: Cho phép KOL chọn `% giảm` (`3%–20%`) và `giảm tối đa / đơn`.
- **Tại sao dễ lệch vai trò?**
  - KOL/CTV là đối tác truyền thông bên ngoài, **không nắm giá vốn và biên lợi nhuận**. Nếu để KOL tự nhập `%` và trần giảm, quy trình trông giống "đàm phán giá sỉ trên sàn" hơn là "CTV xin cấp mã định danh tiếp thị". Quyền quyết định cấu hình giảm giá (`%`, trần giảm, đơn tối thiểu, hạn mức ngân sách) phải thuộc về `SHOP_MANAGER` (và `SYSTEM_ADMIN` nếu `> 10%`).

### 5. [Mức độ: TRUNG BÌNH] Nhãn hiệu & Câu chữ "Sàn TMĐT SCANMS" rải rác trên UI + Phiếu in vận đơn
- **Hiện trạng trong code:**
  - **Phiếu giao hàng (`ShippingLabel.tsx:109,130,214,221`):** In chữ **`"Sàn TMĐT SCANMS"`** và **`"Vận chuyển liên kết sàn SCANMS"`** ngay trên tem vận chuyển!
  - **Tiêu đề trang & điều hướng:** `ProductDetailPage.tsx:801` (`| Sàn SCANMS`), `PayosReturnPage.tsx:51` (`Về sàn SCANMS`), `SearchPage.tsx:471` (`Toàn sàn`).
  - **Trang quản trị & vận hành:**
    - `ShopSettingsPage.tsx:287,442` (`Tài khoản quản trị sàn`, `chuẩn sàn SCANMS`).
    - `AdminReferralLinksPage.tsx:147,199` (`Liên kết trên sàn`).
    - `AdminSampleRequestsPage.tsx:837` (`gian hàng đối tác trên sàn SCANMS` — gọi nhầm Cửa hàng nội bộ là "đối tác trên sàn").
    - `ProductManagementPage.tsx:537,4384` (`mở bán công khai trên sàn SCANMS`).
    - `ShopCollaborationPage.tsx:1178,1399,1793` (`Khám phá gian hàng trên Sàn`, `toàn sàn`).
  - **Biến môi trường (`backend/.env`):** `VIETQR_ACCOUNT_NAME="SCANMS MARKETPLACE"`.

---

## PHẦN B: KẾ HOẠCH SỬA ĐỔI CHI TIẾT (4 PHASES — KHÔNG ẢNH HƯỞNG 5 WORKFLOWS)

### PHASE 1: Dọn sạch tàn dư "Voucher Sàn" & "Quảng cáo Gian hàng Trả tiền"
- **Mục tiêu:** Loại bỏ hoàn toàn khái niệm Sàn trợ giá và Seller mua quảng cáo khỏi cả UI lẫn API công khai.
- **Công việc cụ thể:**
  1. **Gỡ / vô hiệu hóa UI `AdminVoucherIssuer` & `AdminVoucherSettlements`:** Kiểm tra nơi import 2 component này; nếu còn gắn trong tab nào thì gỡ bỏ hoàn toàn, chỉ giữ duy nhất luồng duyệt **Voucher Độc Quyền KOL** (`AdminAffiliateOversightPage` -> tab `Mã ưu đãi KOL`).
  2. **Chuẩn hóa `CouponsService`:** Giữ nguyên khóa cứng không cho tạo `PLATFORM_FUNDED`/`CO_FUNDED`; ẩn hoặc đánh dấu retired các endpoint `getPlatformSubsidies` / `getStorePlatformSubsidies` nếu không còn màn hình nào gọi.
  3. **Xử lý `SponsoredPlacement`:**
     - **Phương án gọn nhất:** Gỡ bỏ luồng thanh toán mua slot quảng cáo của Shop (`PAID` + `paymentProofUrl`), chuyển khu vực nổi bật trên trang chủ thành **Cấu hình Nhãn hàng Tiêu biểu do `SYSTEM_ADMIN` sắp xếp nội bộ** (hoặc giữ lại danh sách 4 cửa hàng trực thuộc cố định, không có thu tiền giữa Shop và Hệ thống).

### PHASE 2: Chuẩn hóa Dòng tiền Tập trung (Xóa tàn dư "Ví Shop / Tài khoản rút tiền của Shop")
- **Mục tiêu:** Khẳng định tuyệt đối chỉ có **Hệ thống tổng** giữ doanh thu và chỉ có **KOL (`COLLABORATOR`) / Khách hoàn tiền (`CUSTOMER`)** mới có ví & lệnh rút tiền.
- **Công việc cụ thể:**
  1. **UI Cài đặt Cửa hàng (`ShopSettingsPage.tsx`):** Ẩn/gỡ phần nhập `payoutBankName` / `payoutBankAccountNumber` của Shop (vì Shop Manager không rút doanh thu về tài khoản riêng).
  2. **Backend `stores.service.ts` & `merchant-payouts`:** Không cho phép/không dùng endpoint rút tiền cho Shop; đảm bảo mọi tài liệu & màn hình dưới `merchant/` chỉ là **Báo cáo Đối soát Doanh thu & Chi phí Thù lao Cửa hàng**, tuyệt đối không dùng chữ *"Ví rút tiền của Shop"*.
  3. **Sửa câu chữ tài trợ mã giảm giá (`ProposeCouponInChatModal.tsx`, `CouponProposalCardBubble.tsx`, `KolCouponManagement.tsx`):**
     - Đổi `"Cửa hàng chi trả 100%"` / `"Shop tài trợ 100%"` → **`"Trừ trực tiếp vào doanh thu đơn hàng (Hạn mức Cửa hàng)"`**.

### PHASE 3: Tinh gọn Luồng Đề xuất Mã KOL & Khóa Cam Kết Bảo Vệ Uy Tín KOL
- **Mục tiêu:** Trả lại đúng quyền hạn: **KOL xin tên mã gắn thương hiệu cá nhân — Shop Manager quyết định mức giảm & điều kiện — Admin duyệt ngoại lệ `>10%` — Hệ thống khóa cam kết khi đã `ACTIVE` để bảo vệ uy tín KOL**.
- **Công việc cụ thể:**
  1. **Đơn giản hóa `CouponProposalDialog.tsx` & `ProposeCouponInChatModal.tsx`:**
     - KOL chỉ cần chọn **Cửa hàng**, nhập **Tên mã mong muốn** (vd `YENNHI10`), và **Ghi chú đề xuất** (không bắt KOL tự nhập `%` hay `Giảm tối đa`).
  2. **Chuẩn hóa thông số thật — Bỏ `Giới hạn mỗi khách` ảo & Mặc định Không giới hạn lượt:**
     - Bỏ hẳn trường ảo `"Giới hạn mỗi khách"` (`usageLimitPerCustomer`) khỏi UI chi tiết của KOL (`KolCouponWorkspace.tsx`) và form duyệt của Shop.
     - Mặc định mã KOL chạy theo **Thời hạn chiến dịch (`expiresAt`)**, không giới hạn số lượt dùng (`usageLimitTotal = null`), bảo vệ tài chính bằng `maximumDiscountAmount` + `floorPrice` trên từng đơn.
  3. **Khóa Cam Kết Sau Kích Hoạt (`Immutable Active Policy` trong `coupons.service.ts`):**
     - Khi mã đã `ACTIVE`: **Chặn `SHOP_MANAGER` sửa** `discountType`, `discountValue`, `maximumDiscountAmount`, `minimumOrderAmount`, `scopeType`, không cho rút ngắn `expiresAt`, và **không cho xóa** mã đã kích hoạt/đã có lượt dùng (`usageCount > 0`). Shop Manager chỉ được phép tăng thêm ngân sách/lượt/gia hạn.
     - Mọi hành động **tạm dừng khẩn cấp, thu hồi/xóa trước hạn, hoặc sửa điều kiện mã đang chạy** đều bắt buộc qua **`SYSTEM_MANAGER` / `SYSTEM_ADMIN`** và **gửi thông báo ngay cho KOL** (`notification.create`).
  4. **Tập trung toàn bộ cấu hình thương mại ở màn hình Duyệt của `SHOP_MANAGER`:**
     - Shop Manager chọn `%` (`3%–20%`) hoặc tiền thẳng (`>= 10.000₫`), `Giảm tối đa / đơn`, `Đơn tối thiểu` (tùy chọn với `%`, bắt buộc với tiền thẳng), và `Ngày hết hạn`.
     - Hiển thị sẵn **Bảng mô phỏng biên lợi nhuận** để Shop Manager cân đối trước khi bấm duyệt (`<=10%` kích hoạt ngay; `>10%–20%` tự động chuyển `SYSTEM_ADMIN` duyệt ngoại lệ).

### PHASE 4: Tổng vệ sinh Câu chữ "Sàn TMĐT" -> "Hệ thống Quản trị & Phân phối Nội bộ SCANMS"
- **Mục tiêu:** Khi hội đồng đọc từng câu trên UI, phiếu in, hay tiêu đề tab trình duyệt đều thấy sự nhất quán 100% với tên đề tài.
- **Bảng quy đổi thuật ngữ chuẩn:**

| Cụm từ cũ (Lạc đề Sàn TMĐT) | Cụm từ chuẩn mới (Enterprise In-House Affiliate) | File cần sửa tiêu biểu |
| :--- | :--- | :--- |
| `Sàn TMĐT SCANMS` / `Sàn SCANMS` | `Hệ thống SCANMS` | `ShippingLabel.tsx`, `ProductDetailPage.tsx`, `PayosReturnPage.tsx`, `ShopSettingsPage.tsx` |
| `Gian hàng đối tác trên sàn` | `Cửa hàng trực thuộc hệ thống` *(chỉ KOL mới là "Đối tác")* | `AdminSampleRequestsPage.tsx`, `ShopCollaborationPage.tsx` |
| `Toàn sàn` / `trên sàn` | `Toàn hệ thống` / `trên hệ thống` | `AdminReferralLinksPage.tsx`, `SearchPage.tsx`, `ProductManagementPage.tsx`, `KolRecommendationPage.tsx` |
| `Tài khoản quản trị sàn` | `Tài khoản Quản trị hệ thống` | `ShopSettingsPage.tsx` |
| `SCANMS MARKETPLACE` | `SCANMS ENTERPRISE` | `backend/.env` (`VIETQR_ACCOUNT_NAME`) |

---

## PHẦN C: KIỂM SOÁT RỦI RO KHI TRIỂN KHAI
1. **Không sửa cấu trúc route đang chạy ổn:** Giữ nguyên các đường dẫn kỹ thuật (`/marketplace` cho storefront công khai) để không làm gãy link giới thiệu (`ReferralLink`) hay unit test route hiện hữu — chỉ thay **nhãn hiển thị người dùng đọc được**.
2. **Kiểm thử hồi quy sau khi sửa:** Chạy lại `backend` build + Jest, `frontend` build + unit tests, và kiểm tra live bằng `browser` subagent các trang Public, Shipping Label, Shop Settings, Admin Coupons, KOL Coupon Proposal.
