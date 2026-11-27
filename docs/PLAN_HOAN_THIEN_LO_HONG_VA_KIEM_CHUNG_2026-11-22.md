# KẾ HOẠCH HOÀN THIỆN LỖ HỔNG, CHỐNG LẠC ĐỀ & ĐỐI CHIẾU TRƯỚC/SAU (2026-11-22)

> **Mục tiêu tài liệu:** Ghi nhận đầy đủ **100% các lỗ hổng validation, lỗi hiển thị UI, sai lệch dữ liệu và từ khóa lạc đề** được phát hiện trong đợt **Live Test Ngoại Lệ & Nhập Liệu Trái Chiều trên 5 Workflows (`http://localhost:5173`)**.
> Tài liệu đóng vai trò **bảng đối chiếu Trước (Before) $\rightarrow$ Sau (After)** để kiểm chứng rõ ràng sự khác biệt sau khi tiến hành sửa code. *(Chưa chỉnh sửa mã nguồn ở bước này).*

---

## TỔNG QUAN PHÂN LOẠI CÁC HẠNG MỤC CẦN HOÀN THIỆN

| Nhóm | Số lượng | Mức độ ưu tiên | Mục tiêu sau khi sửa |
| :--- | :---: | :---: | :--- |
| **Nhóm 1: Lỗ hổng Validation & Luồng Nghiệp vụ** | 5 hạng mục | **P0 — Bắt buộc** | Chặn 100% dữ liệu sai biên cả ở Frontend lẫn Backend (`400 BadRequest`), không để lọt dữ liệu rác hoặc sai quy tắc 25%. |
| **Nhóm 2: Từ khóa lạc đề ("Marketplace Drift" & Livestream)** | 2 hạng mục | **P0 — Bắt buộc** | Xóa sạch chữ `"Sàn Thương Mại"` ở `<title>` và `"livestream"` ở placeholder, giữ 100% định vị Hệ thống Quản lý Nội bộ CTV/KOL. |
| **Nhóm 3: Lỗi hiển thị UI, Responsive `1280×800` & Encoding** | 6 hạng mục | **P1 — Quan trọng** | Bảng không tràn ngang ở màn hình laptop, không lộ mã enum thô (`COMPLETED`), không lỗi font (`C?ch n?p video`, `chua xác nhận`), làm tròn số tiền thuế. |
| **Nhóm 4: Dữ liệu Demo / Seed & Tài sản Ảnh** | 3 hạng mục | **P1 — Quan trọng** | Khôi phục hồ sơ `đình tuấn nguyễn` về `Chờ thẩm định`, làm sạch mô tả fixture `FLOW5-DEMO` và ảnh trống `src=""`. |

---

## CHI TIẾT TỪNG HẠNG MỤC & BẢNG ĐỐI CHIẾU TRƯỚC $\rightarrow$ SAU

### NHÓM 1: LỖ HỔNG VALIDATION & LUỒNG NGHIỆP VỤ (P0)

#### 1.1. WF-01 — Thiếu kiểm tra độ dài lý do từ chối eKYC & Badge `"Khớp tên ngân hàng"` sai ngữ cảnh
- **Phạm vi file dự kiến sửa:**
  - Frontend: `frontend/src/pages/admin/KycApprovalPage.tsx` (khu vực modal `Thẩm định hồ sơ đối tác`, quanh dòng `761`)
  - Backend: `backend/src/modules/kyc/dto/review-kyc.dto.ts` & `backend/src/modules/kyc/kyc.service.ts`
- **Trước khi sửa (Hiện trạng phát hiện khi Live Test):**
  1. Khi bấm **`Từ chối hồ sơ`** và nhập lý do chỉ có 2 ký tự `"ab"`, nút **`Xác nhận Từ chối`** vẫn bấm được và Backend `PATCH /api/kyc/admin/kol/:id/review` trả về **HTTP 200** (cho phép từ chối với lý do vô nghĩa `"ab"`).
  2. Trong popup thẩm định hồ sơ chưa cập nhật ngân hàng (`Ngân hàng thụ hưởng: Chưa cập nhật`, `Số tài khoản: Chưa cập nhật`), huy hiệu xanh **`"Khớp tên ngân hàng"`** vẫn hiển thị.
- **Sau khi sửa (Mục tiêu kỳ vọng):**
  1. Bắt buộc lý do từ chối tối thiểu **10 ký tự** ở cả Frontend (khóa mờ nút `Xác nhận Từ chối` + hiện dòng báo lỗi đỏ *"Vui lòng nhập lý do từ chối chi tiết tối thiểu 10 ký tự"*) lẫn Backend (`@MinLength(10)` trong `ReviewKycDto` trả về **HTTP 400** nếu gọi API trực tiếp).
  2. Chỉ hiển thị badge xanh **`"Khớp tên ngân hàng"`** khi hồ sơ thực sự có `bankName`, `bankAccountNumber` và `bankAccountName` khớp với tên CCCD; nếu chưa có thì hiển thị badge xám/vàng **`"Chưa cập nhật ngân hàng"`**.

#### 1.2. WF-01 — Sửa Cửa hàng (`AdminPersonnelPage`) không khóa `primaryCategory` & lệch giá trị mặc định
- **Phạm vi file dự kiến sửa:**
  - Frontend: `frontend/src/pages/admin/AdminPersonnelPage.tsx` (khu vực form chỉnh sửa Store, quanh dòng `315`, `1207`, `1555`)
- **Trước khi sửa:**
  - Mở `Aura Activewear & Apparel` $\rightarrow$ `Chi tiết` $\rightarrow$ `Chỉnh sửa`: ô `"Ngành hàng kinh doanh cố định *"` vẫn cho phép thay đổi (`disabled: false`) và bị hiển thị nhầm sang lựa chọn đầu tiên `"Mỹ phẩm & Chăm sóc da chuyên sâu"` do lệch giá trị option.
- **Sau khi sửa:**
  - Khi ở chế độ **Chỉnh sửa cửa hàng đã tạo**, ô `"Ngành hàng kinh doanh cố định *"` bị khóa cứng (`disabled` + `bg-[#F3EFE6]`) và map đúng giá trị `primaryCategory` hiện tại của cửa hàng (ví dụ `Aura Activewear & Apparel` hiển thị đúng `"Thời trang & May mặc"`).

#### 1.3. WF-02 — Modal `+ Đề xuất Deal` (`/merchant/kol-hub`) không chặn input sai biên trên UI
- **Phạm vi file dự kiến sửa:**
  - Frontend: `frontend/src/components/chat/CreateExclusiveDealModal.tsx` (quanh dòng `203`, `564`)
- **Trước khi sửa:**
  - Nhập **`5%`** (thấp hơn `10%` gốc), **`26%`** (vượt trần tuyệt đối `25%`), **`KPI = 0`**, **`KPI = -5`**, hoặc **`Thời hạn = 0`**:
    - Ô nhập giữ nguyên giá trị sai, không hiện thông báo lỗi đỏ inline.
    - Nhập `26%` UI vẫn hiện `"Mức 26% cần Admin phê duyệt."` và bật sáng nút **`Gửi Admin duyệt`**.
    - Nút gửi vẫn cho bấm (chỉ dựa vào `<input min max>` mà không có `<form>` hay state validation).
- **Sau khi sửa:**
  - Bổ sung validation tức thì trên UI + vô hiệu hóa nút `Gửi đề xuất` / `Gửi Admin duyệt` khi vi phạm bất kỳ điều kiện nào:
    - Tỷ lệ thù lao phải nằm trong `[11%, 25%]` (hoặc `> baseRate` và `<= 25%`): nếu `<= 10%` báo đỏ *"Thù lao Deal phải lớn hơn mức cơ bản 10%."*; nếu `> 25%` báo đỏ *"Vượt trần tối đa 25% của hệ thống SCANMS — không thể tạo Deal."* (tuyệt đối không hiện thông báo chuyển Admin duyệt cho mức `> 25%`).
    - `KPI đơn hàng` phải `>= 1` (`<= 10.000`): nếu `<= 0` báo đỏ *"Chỉ tiêu KPI tối thiểu là 1 đơn hàng."*
    - `Thời hạn` phải nằm trong `[7, 90]` ngày: nếu `< 7` hoặc `> 90` báo đỏ *"Thời hạn Deal hợp lệ từ 7 đến 90 ngày."*

#### 1.4. WF-03 — Giỏ hàng (`/cart`) cho phép tick chọn nhiều Cửa hàng cùng lúc khi thanh toán
- **Phạm vi file dự kiến sửa:**
  - Frontend: `frontend/src/pages/public/CartPage.tsx` & `frontend/src/components/checkout/GuestCheckoutModal.tsx`
- **Trước khi sửa:**
  - Khách hàng có thể tick chọn sản phẩm từ 2 Cửa hàng khác nhau cùng lúc rồi bấm `Mua hàng` mở Checkout (dễ gây hiểu nhầm khi áp **Mã ưu đãi độc quyền KOL** vốn chỉ áp dụng cho đúng 1 Cửa hàng trực thuộc).
- **Sau khi sửa:**
  - Khi khách đã tick sản phẩm thuộc Store A mà tick thêm sản phẩm thuộc Store B, hoặc chọn "Chọn tất cả" trên nhiều Store: hiển thị cảnh báo rõ ràng *"Mỗi lần thanh toán hỗ trợ đặt hàng theo từng Cửa hàng trực thuộc để áp dụng chính xác Mã ưu đãi độc quyền KOL"* (hoặc tự động tách/khóa thanh toán 1 Store tại một thời điểm).

#### 1.5. WF-05 — Làm tròn số thuế rút tiền & Tách nguồn đơn khi tính CR% Bảng vinh danh
- **Phạm vi file dự kiến sửa:**
  - Frontend: `frontend/src/pages/collaborator/WalletPage.tsx` (khu vực tính `estimatedTax` / `estimatedNet`)
  - Backend/Frontend: `Leaderboard` / `AdminAnalyticsHubPage` (công thức tính `CR%` cho KOL)
- **Trước khi sửa:**
  1. Nhập số tiền rút lẻ hoặc lớn (`999.999.999`) $\rightarrow$ ô Thuế TNCN 10% hiển thị số thập phân `99.999.999,9 ₫`.
  2. Tại `/admin/analytics` (Tab `3 Bảng vinh danh Đối tác`), KOL `Hoàng Thảo Nhi` hiển thị `3 đơn / 2 lượt click = 150%` (vượt `100%`).
- **Sau khi sửa:**
  1. Dùng `Math.round(amount * 0.1)` và `amount - taxAmount` đồng bộ 100% với công thức Backend (`payouts.service.ts`), đảm bảo tiền VNĐ luôn là số nguyên tròn.
  2. Với chỉ số `CR%` trên Bảng vinh danh: chỉ tính tỷ lệ chuyển đổi trên đơn đến từ Link/QR (`ordersFromLinks / clicks`), hoặc gắn nhãn rõ khi đơn đến từ Mã Coupon trực tiếp và chặn hiển thị `> 100%` gây hiểu nhầm cho Hội đồng.

---

### NHÓM 2: TỪ KHÓA LẠC ĐỀ ("MARKETPLACE DRIFT" & LIVESTREAM) (P0)

#### 2.1. Tiêu đề tab trình duyệt (`<title>`) vẫn chứa chữ `"Sàn Thương Mại"`
- **Phạm vi file dự kiến sửa:** `frontend/index.html` (dòng `14`)
- **Trước khi sửa:** `<title>ScanMS - Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng</title>`
- **Sau khi sửa:** `<title>SCANMS - Hệ Thống Quản Lý Cộng Tác Viên Bán Hàng & Tiếp Thị Liên Kết</title>`

#### 2.2. Placeholder ô Ghi chú trong modal `+ Đề xuất Deal` vẫn còn chữ `"livestream"`
- **Phạm vi file dự kiến sửa:** `frontend/src/components/chat/CreateExclusiveDealModal.tsx` (và kiểm tra lại các file chat nếu có)
- **Trước khi sửa:** `placeholder="Ghi chú về video review, livestream hoặc kênh truyền thông..."`
- **Sau khi sửa:** `placeholder="Ghi chú điều khoản video review, bài đăng hoặc kênh truyền thông cam kết..."`

---

### NHÓM 3: LỖI HIỂN THỊ UI, RESPONSIVE `1280×800` & ENCODING (P1)

#### 3.1. Tràn ngang bảng trên màn hình Laptop chuẩn `1280×800`
- **Phạm vi file dự kiến sửa:**
  - `frontend/src/pages/admin/KycApprovalPage.tsx` (bảng duyệt eKYC `/admin/users`)
  - `frontend/src/pages/collaborator/ReferralLinksPage.tsx` (bảng Link & QR `/collaborator/marketing?tab=links`)
- **Trước khi sửa:** Ở `1280×800`, cột cuối (`Thẩm định` ở `/admin/users` và `QR / Thống kê` ở `/collaborator/marketing`) bị đẩy lệch ra ngoài mép phải, phải cuộn ngang mới thấy nút.
- **Sau khi sửa:** Tối ưu độ rộng cột (`min-w-0`, thu gọn padding/chữ phụ, dùng `overflow-x-auto` có kiểm soát hoặc ẩn/gộp thông tin phụ) để **100% nút thao tác chính hiển thị trọn vẹn trong khung `1280px` không cần cuộn ngang**.

#### 3.2. Lỗi hiển thị text, font tiếng Việt & enum thô
- **Trước khi sửa $\rightarrow$ Sau khi sửa:**
  1. `frontend/src/components/media/SubmitKolVideoModal.tsx` (dòng `675`): `aria-label="C?ch n?p video"` $\rightarrow$ sửa thành `"Cách nộp video"`. Thêm thông báo lỗi inline tiếng Việt rõ ràng khi nhập link không phải URL (`not a url`) thay vì chỉ dựa vào tooltip mặc định của trình duyệt.
  2. `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx` (Tab `5 Thưởng tháng`): Lỗi chính tả `"chua xác nhận"` $\rightarrow$ sửa thành `"chưa xác nhận"`.
  3. `frontend/src/components/coupons/KolCouponManagement.tsx`: Dropdown lọc `"Chờ Admin duyệt (>10%)"` bị xuống 2 dòng và hơi cắt chữ $\rightarrow$ tăng chiều rộng select hoặc chỉnh `whitespace-nowrap truncate` cho gọn 1 dòng.
  4. `frontend/src/pages/customer/CustomerPortalPage.tsx`: Khi tab đơn hàng rỗng, hiện chuỗi enum thô `'Không tìm thấy đơn hàng nào ở mục "COMPLETED".'` $\rightarrow$ map sang nhãn tiếng Việt `'Không tìm thấy đơn hàng nào ở mục "Hoàn thành".'`
  5. `frontend/src/pages/admin/AdminArbitrationHubPage.tsx` / `ReturnDetailPage.tsx`: Một số hồ sơ đổi trả hoàn tất cũ hiện `"Tiền hoàn: Chưa xác định"` $\rightarrow$ fallback hiển thị `0 ₫` (nếu đổi 1-1 / bị từ chối) hoặc tính theo `refundAmount` thực tế trên đơn.
  6. `frontend/src/pages/admin/VipExceptionsPage.tsx` & `frontend/src/pages/merchant/ShopKolHubPage.tsx`: Bị lồng thẻ `<main>` trong `<main>` (nested landmark) và dấu `@` thừa trước preview tin nhắn KOL $\rightarrow$ đổi thẻ `<main>` con thành `<div>`/`<section>` và bỏ dấu `@` thừa.

#### 3.3. Trang Chi tiết sản phẩm (`/products/:slug`) mâu thuẫn thông báo Hàng mẫu & 0 đánh giá vẫn hiện 5 sao
- **Phạm vi file dự kiến sửa:** `frontend/src/pages/public/ProductDetailPage.tsx` (quanh dòng `2081`)
- **Trước khi sửa:**
  1. Hiển thị đồng thời *"Shop hiện chưa bật cấp mẫu"* ngay cạnh *"đang mở suất cấp mẫu thử miễn phí... Đăng ký nhận mẫu ngay"*.
  2. Sản phẩm có `0` đánh giá vẫn tô sáng `5` ngôi sao vàng.
- **Sau khi sửa:**
  1. Thống nhất logic hiển thị khối Hàng mẫu dựa trên đúng 1 trạng thái `isSampleEnabled` / `sampleStock` của sản phẩm.
  2. Khi `reviewCount === 0`, hiển thị 5 sao xám nhạt kèm chữ *"Chưa có đánh giá"* thay vì 5 sao vàng.

#### 3.4. Chặn `AbortError` từ API tỉnh thành bên ngoài (`provinces.open-api.vn`)
- **Phạm vi file dự kiến sửa:** Helper gọi API tỉnh/thành phố ở Frontend (`AddressLocationPicker` / service địa giới hành chính)
- **Trước khi sửa:** Khi chuyển trang/đóng modal nhanh, request `GET https://provinces.open-api.vn/api/v1/?depth=3` bị hủy gây log `net::ERR_ABORTED` trong Console/Network.
- **Sau khi sửa:** Cache danh mục Tỉnh/Quận/Phường vào `sessionStorage` / bộ nhớ dùng chung 1 lần duy nhất trong phiên (hoặc dùng nguồn nội bộ `/api/shipping/ghn/provinces`), không fetch lặp lại mỗi lần mở modal.

---

### NHÓM 4: DỮ LIỆU DEMO / SEED & ẢNH SẢN PHẨM (P1)

1. **Khôi phục hồ sơ eKYC `đình tuấn nguyễn` (`42421443-a66a-449e-a5c9-5ba41837e464`):**
   - **Trước:** Bị chuyển nhầm sang `REJECTED` (lý do `"ab"`) trong lúc chạy test ngoại lệ.
   - **Sau:** Cập nhật lại về `PENDING` (`Chờ thẩm định`) trong database để phục vụ demo `WF-01` (`4 hồ sơ chờ thẩm định`), đồng thời kiểm tra xóa sạch các từ khóa `"FLOW5-DEMO-20261031: synthetic historical fixture..."` trong mô tả của `Aura Fashion Studio`.
2. **Kiểm tra ảnh trống (`src=""`) trên Trang chủ `/` & ảnh đại diện sản phẩm:**
   - **Trước:** Phát hiện `13` thẻ `<img>` có `src=""` trên `/` và thẻ sản phẩm áo thể thao nam dùng ảnh chưa khớp.
   - **Sau:** Dùng fallback SVG/placeholder hợp lệ khi thiếu URL ảnh (không render `<img src="">`) và rà soát lại URL ảnh sản phẩm trong seed/DB.

---

## QUY TRÌNH KIỂM CHỨNG SAU KHI SỬA CODE & KẾT QUẢ ĐỐI CHIẾU (ĐÃ THỰC HIỆN NGÀY 2026-11-22)

1. **Kiểm tra biên dịch tĩnh:**
   - `frontend`: `tsc -b && vite build` — **PASS (Exit 0)**.
   - `backend`: `nest build` — **PASS (Exit 0)**.
2. **Kết quả Re-test trực tiếp trên trình duyệt (`1280×800`, `http://localhost:5173`):**
   - **PASS** `<title>`: Đã đổi sang `"SCANMS - Hệ Thống Quản Lý Cộng Tác Viên Bán Hàng & Tiếp Thị Liên Kết"` (xóa sạch `"Sàn Thương Mại"`).
   - **PASS** `ProductDetailPage`: Hết mâu thuẫn thông báo Hàng mẫu trên `/products/SORA-VITC-215`.
   - **PASS** `KycApprovalPage` & `KycService`: Đã khôi phục hồ sơ `đình tuấn nguyễn` về `Chờ thẩm định` (`4` hồ sơ); nút `Thẩm định` nằm gọn trong khung `1280×800`; badge hiện đúng `"Chưa đủ thông tin ngân hàng"`; nhập `"ab"` vào lý do từ chối hiện `"Cần nhập tối thiểu 10 ký tự (2/10)."` và khóa nút `Xác nhận Từ chối` (Backend cũng chặn `< 10` ký tự).
   - **PASS** `AdminPersonnelPage`: Mở `Aura Activewear & Apparel` $\rightarrow$ `Chi tiết` $\rightarrow$ `Chỉnh sửa`, ô `"Ngành hàng kinh doanh cố định *"` đã bị khóa (`disabled: true`) và hiển thị đúng `"Thời trang & Phụ kiện"`.
   - **PASS** `CreateExclusiveDealModal`: Placeholder đã bỏ chữ `"livestream"`; nhập `26%`, `5%`, `KPI = 0`, `Thời hạn = 0` đều bật thông báo lỗi đỏ ngay lập tức và khóa nút gửi.
   - **PASS (Đã gỡ bỏ chốt chặn dư thừa)** `CartPage`: Đã gỡ bỏ chốt chặn > 1 cửa hàng vì `GuestCheckoutModal` đã hỗ trợ sẵn gom nhóm theo từng cửa hàng và tách ô nhập Mã ưu đãi KOL riêng cho từng cửa hàng.
   - **PASS** `WalletPage`: Nhập `999.999.999 ₫` hiển thị `Thuế TNCN (10%): −100.000.000 ₫` và `Thực nhận dự kiến: 899.999.999 ₫` (số nguyên tròn, không còn `,9 ₫`).
   - **PASS** Các sửa đổi phụ trợ đã áp dụng: `SubmitKolVideoModal` (`aria-label="Cách nộp video"`), `CustomerPortalPage` (map nhãn tiếng Việt cho bộ lọc đơn rỗng), `AdminReturnOversightPage` (`0 ₫` / `0 ₫ (Đổi 1-1)` thay `'Chưa xác định'`), `KolCouponManagement` (mở rộng select `250px`), `order-address.service.ts` (cache danh mục tỉnh/thành theo phiên), DB mô tả `Aura Fashion Studio` (đã xóa chuỗi `FLOW5-DEMO`).
