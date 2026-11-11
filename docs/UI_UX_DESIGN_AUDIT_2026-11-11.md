# BÁO CÁO KIỂM ĐỊNH TOÀN DIỆN UI/UX & QUY CHUẨN THIẾT KẾ HỆ THỐNG SCANMS (FA26SE032)

- **Dự án:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết (`Sales Collaborator and Affiliate Network Management System` — `SCANMS`)
- **Ngày kiểm định:** 11/11/2026
- **Phạm vi kiểm định:** Toàn bộ 236 file giao diện (`.tsx`, `.css`) và 22 màn hình thực tế thuộc 5 vai trò (`Public/Guest`, `CUSTOMER`, `COLLABORATOR`, `SHOP_MANAGER`, `SYSTEM_MANAGER / SYSTEM_ADMIN`)
- **Bộ tiêu chuẩn đối chiếu (`.agents/skills`):**
  - [`better-colors`](file:///c:/HW/CAPSTONE/.agents/skills/better-colors/SKILL.md)
  - [`better-ui`](file:///c:/HW/CAPSTONE/.agents/skills/better-ui/SKILL.md)
  - [`better-typography`](file:///c:/HW/CAPSTONE/.agents/skills/better-typography/SKILL.md)
  - [`better-layout`](file:///c:/HW/CAPSTONE/.agents/skills/better-layout/SKILL.md)
  - [`frontend-design`](file:///c:/HW/CAPSTONE/.agents/skills/frontend-design/SKILL.md)

---

## PHẦN 1: 5 NGUYÊN NHÂN GỐC RỄ KHIẾN GIAO DIỆN BỊ "NHỢT NHẠT, LỘN XỘN & THIẾU ĐIỂM NHẤN"

### 1. "Thủ phạm ẩn" trong `index.css` đã tẩy trắng toàn bộ Nút Bấm Chính (Primary CTA)
Trong [`frontend/src/index.css:1288-1373`](file:///c:/HW/CAPSTONE/frontend/src/index.css#L1288-L1373) hiện có một đoạn CSS toàn cục dùng `!important` đè lên toàn bộ các nút thương hiệu:

```css
:root {
  --action-bg: #FBF5EB;       /* Màu vàng trắng rất nhạt */
  --action-hover: #F3EFE6;
  --action-border: #EEDFC6;
  --action-border-hover: #C59B58;
  --action-ink: #1A1612;
}
:root :is(button, a, input[type='submit'], input[type='button'], [role='button'], [role='tab'], label):is(
  .scanms-brand-action,
  .btn-gold-glossy,
  .btn:not(.secondary):not(.danger),
  [class~='bg-brand'], [class~='!bg-brand'],
  [class~='bg-brand-strong'], [class~='!bg-brand-strong'],
  [class~='bg-amber-600'],
  [class~='bg-[#C59B58]' i], [class~='bg-[#B88E4F]' i], ...
) {
  background-color: var(--action-bg) !important; /* Ép về #FBF5EB! */
  border: 1px solid var(--action-border) !important;
  color: var(--action-ink) !important;
  box-shadow: none !important;
}
```

- **Hệ quả nghiêm trọng:** Dù trong code component ([`Button.tsx`](file:///c:/HW/CAPSTONE/frontend/src/components/ui/Button.tsx)) có truyền `variant="primary"` hay `bg-[#C59B58] text-white`, đoạn CSS này đều **ép tất cả các nút hành động chính biến thành màu vàng trắng nhạt `#FBF5EB` chữ đen, không có bóng đổ**!
- Đó là lý do các nút quan trọng nhất như **"Đăng nhập an toàn"** (`/login`), **"Tiến hành Mua Hàng"** (`/cart`), **"Tạo mã payOS"** (`/customer/wallet`), **"Gửi yêu cầu rút tiền"** (`/collaborator/wallet`), **"+ Thêm sản phẩm"** (`/merchant/products`) đều chìm nghỉm vào nền trắng, không có bất kỳ điểm nhấn thị giác nào.
- Ngược lại, ở trang Đơn hàng khách mua ([`CustomerPortalPage.tsx:1119,1381,1422`](file:///c:/HW/CAPSTONE/frontend/src/pages/customer/CustomerPortalPage.tsx#L1119)), nút **"Tất cả"** và **"Mua lại"** lại dùng mã màu **Cam Đỏ kiểu Shopee (`from-[#EA580C] via-[#D97706] to-[#C59B58]`)** nên lọt qua bộ lọc CSS trên, tạo ra một mảng màu cam rực lạc quẻ hoàn toàn với tông Vàng Be – Nâu Espresso của hệ thống.

---

### 2. Hiện tượng "4 lớp màu gần trắng hòa lẫn vào nhau" (Đo bằng OKLCH & WCAG)
Theo nguyên lý của skill [`better-colors`](file:///c:/HW/CAPSTONE/.agents/skills/better-colors/SKILL.md#L59-L62) (*"Measure the rendered pair... Tighten the light end until 50 and 100 read as two surfaces"*), khi đo độ sáng cảm nhận (OKLCH Lightness $L$) và độ tương phản WCAG 2.x của các màu nền đang dùng:

| Cặp bề mặt đặt cạnh / chồng lên nhau | Độ sáng OKLCH ($L$) | Tỷ lệ tương phản WCAG | Đánh giá thị giác thực tế |
| :--- | :---: | :---: | :--- |
| **Card `#FFFFFF`** trên **Nền trang `#FAF8F5`** | $100\%$ vs $98.0\%$ | **1.06 : 1** | Chênh lệch chỉ $2\%$ độ sáng $\rightarrow$ Card trắng và nền trang gần như hòa làm một. |
| **Nút/Hộp `#FBF5EB`** trên **Card `#FFFFFF`** | $97.2\%$ vs $100\%$ | **1.08 : 1** | Nút chính, badge, hộp thông tin và ô icon cùng màu `#FBF5EB` chìm hẳn vào thẻ trắng. |
| **Sidebar `#FAF8F5`** và **Mục đang chọn `#FAF5EB`** | $98.0\%$ vs $97.2\%$ | **1.02 : 1** | Mục đang active trên Sidebar gần như tàng hình trên nền Sidebar. |
| **Chữ vàng `#B88E4F`** trên **Nền active `#FBF5EB`** | $67.3\%$ vs $97.2\%$ | **2.76 : 1** | **Không đạt chuẩn WCAG AA (4.5 : 1)** $\rightarrow$ Chữ mục đang chọn bị mờ, thiếu độ sắc nét. |
| **364 mã Hex tự phát & 18 họ màu Tailwind ngoại lai** | — | — | Toàn codebase đang có **364 mã Hex khác nhau** cùng hàng trăm class `rose-*` (444 chỗ), `amber-*` (239 chỗ), `gray-*` (145 chỗ), `slate-*` (135 chỗ), `stone-*` (76 chỗ), `orange-*` (22 chỗ). |

#### Bảng thông số OKLCH thực đo của các Token hiện tại:
| Token | Hex | OKLCH ($L$, $C$, $h$) | Ghi chú |
| :--- | :---: | :---: | :--- |
| `white` | `#FFFFFF` | $L = 100.0\%,\; C = 0.000,\; h = 90^\circ$ | Nền Card chính |
| `canvas` | `#FAF8F5` | $L = 98.0\%,\; C = 0.005,\; h = 78^\circ$ | Quá sát với `#FFFFFF` ($1.06:1$) |
| `brand-soft` | `#FBF5EB` | $L = 97.2\%,\; C = 0.015,\; h = 81^\circ$ | Quá sát với `#FFFFFF` ($1.08:1$) |
| `surface-sand` | `#F3EFE6` | $L = 95.3\%,\; C = 0.013,\; h = 87^\circ$ | Nền Sidebar & Khay phụ |
| `line` | `#EAE4D7` | $L = 92.0\%,\; C = 0.019,\; h = 86^\circ$ | Đường kẻ viền |
| `brand-border` | `#EEDFC6` | $L = 90.9\%,\; C = 0.037,\; h = 81^\circ$ | Viền hộp thông tin |
| `brand` | `#C59B58` | $L = 71.4\%,\; C = 0.099,\; h = 78^\circ$ | Vàng thương hiệu |
| `brand-strong` | `#B88E4F` | $L = 67.3\%,\; C = 0.096,\; h = 76^\circ$ | Điểm nhấn viền/icon |
| `muted` | `#7D715E` | $L = 55.4\%,\; C = 0.032,\; h = 79^\circ$ | Chữ phụ (Tương phản $4.78:1$ trên trắng — Đạt AA) |
| `brand-dark` | `#231D15` | $L = 23.5\%,\; C = 0.017,\; h = 75^\circ$ | Nâu Espresso Header & Nút phụ tối |
| `ink` | `#1A1612` | $L = 20.3\%,\; C = 0.010,\; h = 67^\circ$ | Chữ chính (Tương phản $18.1:1$ trên trắng — Đạt AAA) |

---

### 3. Loạn cỡ chữ (42 font-size khác nhau) & Sai lầm khi dùng `JetBrains Mono` cho giá tiền
Theo skill [`better-typography`](file:///c:/HW/CAPSTONE/.agents/skills/better-typography/SKILL.md#L38-L42) (*"Define a small set of sizes and deviate from it as little as possible... UI text: 14px starting point, 13px for captions and rarely below 12px"*):

- **42 cỡ chữ khác nhau trong code:** Qua quét tự động 236 file, hệ thống đang dùng đủ mọi cỡ chữ lẻ:
  - `text-xs` (`12px`): 2.754 chỗ (177 files) + `text-[12px]`: 141 chỗ
  - `text-[11px]`: 1.084 chỗ (127 files)
  - `text-sm` (`14px`): 830 chỗ (140 files) + `text-[14px]`: 22 chỗ
  - `text-[10px]`: 705 chỗ (116 files)
  - `text-base` (`16px`): 196 chỗ (81 files) + `text-[16px]`: 10 chỗ
  - `text-[13px]`: 117 chỗ (53 files)
  - `text-2xl`: 92 chỗ, `text-lg`: 84 chỗ, `text-[10.5px]`: 69 chỗ, `text-xl`: 69 chỗ, `text-[9px]`: 67 chỗ, `text-[15px]`: 17 chỗ, `text-[9.5px]`: 14 chỗ, `text-3xl`: 14 chỗ, `text-[8px]`: 13 chỗ, `text-[11.5px]`: 10 chỗ, cùng các cỡ lẻ `6px`, `7px`, `7.5px`, `8.5px`, `13.5px`, `17px`, `18px`, `19px`, `20px`, `21px`, `22px`, `23px`, `24px`, `25px`, `26px`, `28px`, `29px`, `31px`, `32px`, `34px`.
- **Hơn 1.880 vị trí dùng chữ siêu nhỏ dưới `11px`** kèm in hoa `uppercase` và `font-bold` làm giao diện bị vụn, cảm giác nén chặt và mỏi mắt.
- **Lạm dụng `font-mono` (`JetBrains Mono`) ở 246 vị trí (65 files) cho giá tiền:** Trong trang Đơn hàng và Ví (`250.000 ₫`, `271.001 ₫`), số `0` có dấu gạch/chấm ở giữa đặc trưng của phông chữ lập trình viên (code editor). Nhìn vào bảng giá thương mại hay số dư ví mà thấy chữ số kiểu lập trình khiến giao diện mất đi vẻ sang trọng.
  - *Giải pháp chuẩn từ `better-typography`:* Giữ nguyên phông chữ chính **`Plus Jakarta Sans`** nhưng bật thuộc tính OpenType **`tabular-nums`** (`font-variant-numeric: tabular-nums`) — các con số vẫn thẳng cột 100% mà nét chữ tròn trịa, hiện đại. Chỉ dùng `font-mono` cho **Mã đơn (`#DH-2026...`), Mã SKU, Mã vận đơn GHN, Mã Coupon (`THAONHI16`)**.

---

### 4. Mất tính nhất quán ở Thanh Tab & Bố cục Khối (5 trang = 5 kiểu Tab khác nhau)
Theo skill [`better-layout`](file:///c:/HW/CAPSTONE/.agents/skills/better-layout/SKILL.md#L14-L24) (*"Group with space, not lines... Keep controls distinct from content... Align to shared edges"*):

- **5 kiểu Tab Active khác nhau trên 5 màn hình:**
  1. **Đơn hàng Customer (`/customer/orders`):** Tab đang chọn (`Tất cả`) tô **Gradient Cam Đỏ `#EA580C`** chữ trắng.
  2. **Ưu đãi & Đãi ngộ Shop (`/merchant/promotions`):** Tab con (`Tất cả (0)`) tô **Đen đặc `#1A1612`** chữ trắng; trong khi Tab lớn phía trên tô kem nhạt `#FBF5EB`.
  3. **Mạng lưới Đối tác Shop (`/merchant/kol-hub`):** Tab trên cùng nằm trong khay xám cát, tab đang chọn nền trắng; nhưng tab con bên dưới (`Tin nhắn & đàm phán`) lại dùng **gạch chân vàng (Underline)**.
  4. **Công cụ tiếp thị KOL (`/collaborator/marketing`):** Tab đang chọn dùng **viền vàng đậm + nền kem `#FBF5EB`**.
  5. **Báo cáo Admin (`/admin/analytics`):** Tab có thêm **vòng tròn đánh số `1`, `2`, `3`** (vi phạm quy tắc của [`frontend-design`](file:///c:/HW/CAPSTONE/.agents/skills/frontend-design/SKILL.md#L21): *"Numbered markers 1 / 2 / 3 are only appropriate if the content actually is a sequence/step-by-step process"* — đây là 3 tab báo cáo độc lập, không phải quy trình 3 bước!).
- **Lạm dụng viền trong viền (Nested Borders):** Rất nhiều màn hình bọc 3–4 lớp khung viền `#EAE4D7` lồng nhau (Khung trang $\rightarrow$ Khung section $\rightarrow$ Khung card $\rightarrow$ Khung hộp con $\rightarrow$ Khung badge), làm giao diện nặng nề.

---

### 5. Icon thiếu chuyên nghiệp, trộn lẫn 55 Emoji & Câu chữ mô tả dài dòng
Theo skill [`better-ui`](file:///c:/HW/CAPSTONE/.agents/skills/better-ui/SKILL.md#L74-L81) và [`frontend-design`](file:///c:/HW/CAPSTONE/.agents/skills/frontend-design/SKILL.md#L46-L55):

- **Trộn 55 loại Emoji hệ điều hành (`⚡`, `🎟`, `🎁`, `🤝`, `👑`, `🔥`, `✅`...) vào 80+ chỗ trong giao diện:** Ví dụ trong Ví KOL có badge `🟢 ⚡ Sẵn sàng rút` (vừa có icon tròn xanh, vừa có emoji tia chớp vàng cam).
- **Bội thực "Ô vuông icon nền kem":** Hầu như mọi tiêu đề khối, mọi thẻ KPI, mọi dòng thông tin đều kèm một ô vuông/tròn nền `#FBF5EB` viền `#EEDFC6` chứa icon vàng. Khi cả nút bấm thật cũng có màu `#FBF5EB` viền `#EEDFC6`, người dùng không phân biệt được đâu là icon trang trí, đâu là nút bấm!
- **Icon thừa thãi:** Ví dụ nút `← 🏪 Cổng Mua Sắm` ở đáy Sidebar đặt **2 icon liên tiếp nhau** (`ArrowLeft` + `Store`) trước 1 dòng chữ ngắn.
- **Mô tả dài dòng, lặp ý:** Ví dụ ở Cài đặt cửa hàng: Tiêu đề *"Nhận diện thương hiệu"*, dòng phụ *"Logo và thông tin cơ bản của gian hàng"*; hoặc trên trang Giỏ hàng có tới **3 hộp nhắc nhở nhập mã KOL** lặp lại cùng một nội dung ở đầu trang, bên phải và dưới chân mỗi cửa hàng.

---

## PHẦN 2: PHÂN TÍCH & ĐÁNH GIÁ CHI TIẾT TẤT CẢ CÁC TRANG UI HIỆN CÓ

### Nhóm A — Phân hệ Cổng Mua Sắm & Xác Thực (`Public` & `Auth`)
1. **Trang chủ Cổng Mua Sắm ([`MarketplacePage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/public/MarketplacePage.tsx)):**
   - *Điểm tốt:* Banner Hero có hình ảnh sản phẩm sáng sủa, nút CTA trên Hero (`#9E7432`) có độ tương phản tốt.
   - *Điểm yếu:* Thanh điều hướng phụ (`Gian hàng | Live KOC | Giảm giá`) lơ lửng dưới ô tìm kiếm tạo cảm giác thừa; chữ `AFFILIATE COMMERCE NETWORK` dưới logo viết hoa toàn bộ hơi thô; góc dưới phải bị đè bởi hộp thông báo Cookie khá to.
2. **Trang Tìm kiếm & Bộ lọc ([`SearchPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/public/SearchPage.tsx)):**
   - *Điểm yếu:* Cột bộ lọc bên trái ("BỘ LỌC SẢN PHẨM") không có nền hoặc khung tách biệt nên chữ trôi lơ lửng trên nền `#FAF8F5`; nút `ÁP DỤNG` khoảng giá bị tẩy trắng thành màu kem nhạt; trên thẻ sản phẩm, chữ tên sản phẩm và giá tiền chưa có sự phân cấp rõ ràng.
3. **Trang Chi tiết Sản phẩm ([`ProductDetailPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/public/ProductDetailPage.tsx)):**
   - *Điểm yếu:* Khối giá tiền dùng nền kem `#FBF5EB` quá nhạt; dòng `Phí GHN được tính theo địa chỉ nhận hàng` đóng khung màu vàng kem trông giống hệt một cái nút bấm; icon chia sẻ mạng xã hội (`M`, `f` màu xanh dương tươi) lệch tông hoàn toàn với bảng màu Vàng Be; vẫn còn từ *"Gian hàng"* ở phần thông tin cửa hàng.
4. **Trang Giỏ hàng ([`CartPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/public/CartPage.tsx)):**
   - *Điểm yếu:* Nút quan trọng nhất trang là **"Tiến hành Mua Hàng (2) →"** bị đoạn CSS `index.css` biến thành màu kem nhạt `#FBF5EB`, nhìn yếu hơn cả cái checkbox màu vàng bên trái! Ngoài ra có tới 3 chỗ nhắc *"Nhập mã KOL ở bước thanh toán"* gây rối mắt.
5. **Trang Đăng nhập & Đăng ký ([`LoginPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/auth/LoginPage.tsx), [`RegisterPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/auth/RegisterPage.tsx)):**
   - *Điểm yếu:* Nút chính **"Đăng nhập an toàn"** bị tẩy thành màu kem nhạt `#FBF5EB`, nhìn chìm hơn cả nút phụ *"Đăng nhập bằng Google"*; góc trên phải vẫn còn chữ **`← Sàn mua sắm`** (cần đổi thành `← Cổng mua sắm`); câu khẩu hiệu *"Kết nối gian hàng, lan tỏa giá trị"* vẫn còn từ *"gian hàng"*.

---

### Nhóm B — Phân hệ Khách Mua Hàng (`CUSTOMER` — [`CustomerPortalPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/customer/CustomerPortalPage.tsx))
1. **Tab Đơn hàng (`/customer/orders`):**
   - *Điểm yếu:*
     - Tab **"Tất cả"** và nút **"Mua lại"** dùng màu **Cam Đỏ `#EA580C`**, xung đột hoàn toàn với nút kính lúp vàng `#B88E4F` trên Header và nút active vàng nhạt trên Sidebar.
     - Giá tiền (`250.000 ₫`, `271.001 ₫`) và Mã đơn (`#DH-2026-99BEC6C5`) dùng `JetBrains Mono` với nét số `0` gạch chéo, cỡ chữ giữa giá đơn vị và thành tiền chênh lệch thiếu hài hòa.
     - Hàng trên cùng của mỗi thẻ đơn hàng có quá nhiều pill nhỏ đứng sát nhau (`Sora Skincare` + badge `Chính hãng` nền kem + nút `Chat` nền kem + nút `Xem Shop` nền trắng + bên phải là badge `Giao thành công` nền xanh + badge `Hoàn thành` nền kem) $\rightarrow$ **5 cái hộp bo tròn liên tiếp trên 1 dòng**, không phân biệt được đâu là nhãn trạng thái (Badge), đâu là nút bấm (Button)!
     - Góc dưới bên phải bị nút nổi `Chat` đè trực tiếp lên chữ `Đánh giá` và giá tiền của đơn hàng thứ 2.
2. **Tab Ví mua sắm (`/customer/wallet` — [`CustomerWalletTab.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/customer/CustomerWalletTab.tsx)):**
   - *Điểm yếu:* Nút **"Tạo mã payOS"** bị tẩy thành màu kem nhạt `#FBF5EB`; số tiền `500.000 ₫` góc phải dùng font lập trình `JetBrains Mono`; hộp giải thích *"Nạp Tiền An Toàn & Bảo Mật"* bên phải chiếm tới 40% diện tích với 3 đoạn văn dài dòng.
3. **Tab Thông báo (`/customer/notifications`) & Yêu thích (`/customer/wishlist`):**
   - *Điểm yếu:* Toàn bộ thẻ thông báo, nút lọc tab và nút *"Xem chi tiết"* đều xoay quanh 2 màu `#FFFFFF` và `#FBF5EB`, thiếu điểm nhấn cho thông báo chưa đọc.
4. **Tab Nâng cấp Đối tác (`/customer/upgrade` — [`PartnerUpgradeForms.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/customer/PartnerUpgradeForms.tsx)):**
   - *Điểm yếu:* Hai tab bước `1 Hồ sơ sáng tạo` và `2 Định danh & Thanh toán` làm to như 2 tấm biển quảng cáo; nút **"Tiếp tục →"** ở đáy cũng bị tẩy thành màu kem nhạt `#FBF5EB`, nhìn không khác gì nút *"Lưu nháp"* bên cạnh.

---

### Nhóm C — Phân hệ Cộng Tác Viên / KOL (`COLLABORATOR`)
1. **Tổng quan KOL ([`KolDashboardPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolDashboardPage.tsx)):**
   - *Điểm yếu:* 3 thẻ số dư trên cùng + 4 thẻ chỉ số bên dưới tạo thành **7 ô chữ nhật trắng viền mảnh xếp sát nhau**; trong khi 4 chỉ số phụ (`-100.0%`) lại hiện màu **Đỏ tươi `#DC2626`** rực rỡ khiến cả trang trông như đang báo lỗi nghiêm trọng dù chỉ là chưa có đơn trong 7 ngày qua; nút chính **"+ Tạo link tiếp thị"** cũng bị biến thành màu kem nhạt.
2. **Thu nhập & Đối soát ([`WalletPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/WalletPage.tsx)):**
   - *Điểm yếu:* Thẻ thứ 3 (*"KÝ QUỸ KPI DEAL"*) tự dưng dùng viền vàng cam đậm và icon cam đặc, trong khi 3 thẻ còn lại dùng viền xám nhạt; nút chính **"↗ Gửi yêu cầu rút tiền"** bị tẩy thành màu kem nhạt `#FBF5EB`; badge `🟢 ⚡ Sẵn sàng rút` dùng cả chấm xanh lẫn emoji tia chớp.
3. **Công cụ tiếp thị ([`MarketingToolkitPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/MarketingToolkitPage.tsx), [`ReferralLinksPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/ReferralLinksPage.tsx)):**
   - *Điểm yếu:* Vẫn còn chữ **`Sàn: 10%`** trong thẻ Deal độc quyền (cần đổi thành `Gốc: 10%` hoặc `Cơ bản: 10%`); nút `Áp dụng` bộ lọc và `+ Tạo link tiếp thị` đều bị tẩy thành màu kem nhạt.
4. **Hợp tác & Hàng mẫu ([`ShopCollaborationPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/ShopCollaborationPage.tsx)):**
   - *Điểm yếu:* Vẫn còn nút **`+ Khám phá gian hàng trên Sàn`**; 3 tab `1 Tin nhắn`, `2 Sản phẩm`, `3 Hàng mẫu` đánh số thứ tự `1-2-3` không cần thiết.

---

### Nhóm D — Phân hệ Quản Lý Cửa Hàng Nội Bộ (`SHOP_MANAGER`)
1. **Tổng quan Cửa hàng ([`ShopDashboardPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopDashboardPage.tsx)):**
   - *Điểm tốt:* Bố cục 4 thẻ KPI + biểu đồ + danh sách tác vụ bên phải khá hợp lý.
   - *Điểm yếu:* Trong thẻ *"Tác vụ cần xử lý ngay"*, các chấm tròn trạng thái dùng 3 màu tươi (cam, xanh lá, đỏ) chưa đồng bộ; chữ `Chủ shop` dưới tên Nguyễn Văn Minh ở góc phải Header chưa chuẩn định vị nội bộ (nên là `Quản lý cửa hàng`).
2. **Quản lý Sản phẩm ([`ProductManagementPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ProductManagementPage.tsx)):**
   - *Điểm yếu:* Thanh công cụ lọc gộp chung ô tìm kiếm, dropdown trạng thái với 2 nút tab lớn (`Duyệt video`, `Đánh giá khách hàng`) trên cùng 1 hàng làm bố cục bị lệch; trên mỗi dòng sản phẩm có tới **5 nút hành động liên tiếp** (`✨ Gợi ý KOC`, `% Giảm giá`, icon Xem, icon Sửa, icon Xóa đỏ); nút chính **`+ Thêm sản phẩm`** bị tẩy thành màu kem nhạt.
3. **Quản lý Đơn hàng ([`OrdersManagementPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/OrdersManagementPage.tsx)):**
   - *Điểm yếu:* Nút `Làm mới` bị kéo dài thành một thanh ngang rộng hết 100% chiều ngang màn hình nằm ngay dưới ô tìm kiếm — một lỗi bố cục rất lạ mắt và tốn diện tích!
4. **Mạng lưới Đối tác ([`ShopKolHubPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx)) & Ưu đãi ([`ShopPromotionsHubPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopPromotionsHubPage.tsx)):**
   - *Điểm yếu:* Hai trang nằm cạnh nhau trên Sidebar nhưng dùng 2 hệ thống Tab khác hẳn nhau (một bên dùng khay xám + gạch chân vàng; một bên dùng nút đen `#1A1612` + nút kem lớn).
5. **Cài đặt cửa hàng ([`ShopSettingsPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopSettingsPage.tsx)):**
   - *Điểm yếu:* Còn nhiều thuật ngữ *"gian hàng"*, *"Cố định 10% theo chuẩn sàn SCANMS"*, *"Thông tin chủ shop"*.

---

### Nhóm E — Phân hệ Quản Trị Hệ Thống & Vận Hành (`SYSTEM_ADMIN` & `SYSTEM_MANAGER`)
1. **Báo cáo Doanh thu ([`AdminAnalyticsHubPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminAnalyticsHubPage.tsx)):**
   - *Điểm yếu:* Nút `Xuất báo cáo` bị kéo giãn rộng tới 50% màn hình đặt cạnh dropdown `30 ngày gần nhất` rộng 50% màn hình — tạo thành 2 thanh khổng lồ trống rỗng phía trên 4 thẻ KPI.
2. **Nhân sự & Cửa hàng ([`AdminPersonnelPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminPersonnelPage.tsx)):**
   - *Điểm yếu:* Vẫn còn dày đặc chữ **`Chuyên viên Sàn`**, **`Toàn sàn`**, **`Gian hàng`** ngay trên bảng và thanh lọc! Badge `Super Admin` tô màu đen đặc `#1A1612` trong khi các badge khác màu kem nhạt.
3. **Thỏa thuận Đặc cách ([`VipExceptionsPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/VipExceptionsPage.tsx)) & An ninh Kiểm toán ([`AdminSecurityAuditHubPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminSecurityAuditHubPage.tsx)):**
   - *Điểm yếu:* Trên trang An ninh còn nút **`Quét lại toàn sàn`** (xuất hiện 2 lần!); các con số KPI (`0`, `1`, `0`, `100M`) dùng 3 màu xanh – đỏ – đen khác nhau trên nền trắng phẳng lì.

---

## PHẦN 3: BỘ QUY LUẬT THIẾT KẾ CHUẨN HÓA TOÀN HỆ THỐNG (DESIGN SYSTEM GOVERNANCE)

Để giải quyết triệt để mà vẫn tuân thủ 100% quy tắc **Warm Sand & Brand Gold (`AGENTS.md` & `GEMINI.md` — Cấm tuyệt đối màu xanh lá làm nền/nút)**, hệ thống cần áp dụng **6 Quy Luật Bất Biến** sau đây:

### Quy luật 1: Phân tầng 4 Lớp Bề mặt (Surface Depth) — Chấm dứt cảnh "Trắng lẫn vào Trắng"
Thay vì để mọi thứ từ `97%` đến `100%` độ sáng, ta khóa cứng 4 tầng bề mặt có độ tách biệt rõ rệt:
1. **Tầng 0 — Header Thượng tầng (`--brand-dark: #231D15`):** Nền Nâu Espresso đậm sang trọng ở thanh Topbar trên cùng, tạo điểm neo vững chãi cho toàn trang.
2. **Tầng 1 — Khu vực Điều hướng & Khay phụ (`--surface-sand: #F3EFE6`):**
   - **Bắt buộc áp dụng cho toàn bộ cột Sidebar trái** và các **khay chứa Tab (Tab Tray)**, **khung Bộ lọc (Filter Bar)**.
   - Khi cột Sidebar có nền `#F3EFE6` và có đường kẻ dọc `#EAE4D7`, nó tách biệt hoàn toàn với vùng nội dung bên phải!
3. **Tầng 2 — Nền Trang Chính (`--canvas: #FAF8F5`):** Nền tổng thể của vùng làm việc bên phải.
4. **Tầng 3 — Thẻ Nội dung Chính (`--surface-white: #FFFFFF`):**
   - Chỉ dùng cho Thẻ sản phẩm, Thẻ đơn hàng, Bảng dữ liệu, Thẻ KPI và Ô nhập liệu (Input).
   - Kết hợp bóng đổ tinh tế phân lớp theo chuẩn `better-ui`: `shadow-[0_1px_2px_rgba(26,22,18,0.05),0_4px_12px_rgba(26,22,18,0.04)]` và viền `1px solid #EAE4D7`.

---

### Quy luật 2: Quy chuẩn Nút Sidebar (Trạng thái Bình thường / Di chuột / Đang chọn)
Áp dụng thống nhất cho [`Sidebar.tsx`](file:///c:/HW/CAPSTONE/frontend/src/components/layout/Sidebar.tsx) ở tất cả các vai trò (`Customer`, `KOL`, `Shop Manager`, `Admin`):

| Trạng thái (State) | Nền (Background) | Chữ & Icon (Foreground) | Điểm nhấn cấu trúc | Hiệu ứng chuyển động (`better-ui`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Bình thường (Idle)** | Trong suốt (`transparent` trên nền Sidebar `#F3EFE6`) | Chữ: `#4A3F33` (`font-medium` 500)<br>Icon: `#7D715E` (`strokeWidth={1.75}`) | Không viền | `transition-colors duration-150` |
| **2. Di chuột (Hover)** | `#EAE4D7/60` (Cát đậm hơn nền Sidebar 1 nấc) | Chữ: `#1A1612`<br>Icon: `#8C6226` | Không viền | Phản hồi tức thì `< 150ms` |
| **3. Nhấn giữ (Pressed)** | `#EAE4D7` | Chữ: `#1A1612` | `scale-[0.98]` | Cảm giác bấm vật lý (`better-ui`) |
| **4. Đang chọn (Active)** | **`#FFFFFF` (Trắng nổi bật trên nền Sidebar `#F3EFE6`)** | Chữ: **`#1A1612` (`font-semibold` 600)**<br>Icon: **`#B88E4F` (`strokeWidth={2.25}`)** | **Thanh chỉ thị dọc bên trái `3px` màu Vàng thương hiệu `#C59B58`** + Viền `#EEDFC6` + Bóng nhẹ `shadow-xs` | Nhìn từ xa biết ngay đang ở mục nào, độ tương phản chữ đạt **18.1 : 1** (Chuẩn AAA)! |
| **5. Huy hiệu đếm (Badge)** | Có việc cần xử lý: Nền **`#C59B58`** chữ **`#FFFFFF`**<br>Bình thường: Nền `#EAE4D7` chữ `#6B5E4B` | Cỡ `11px`, `font-semibold`, `tabular-nums` | Bo tròn `rounded-full px-2 py-0.5` | **Bỏ `animate-pulse`** nhấp nháy liên tục gây mỏi mắt |

---

### Quy luật 3: Quy chuẩn Hệ thống Nút bấm (Button Hierarchy) — "Mỗi khung nhìn 1 Điểm Nhấn Chính"
Theo nguyên lý cốt lõi của [`better-colors`](file:///c:/HW/CAPSTONE/.agents/skills/better-colors/SKILL.md#L53-L57) (*"Fill exactly one action per view. Put the color on the background, not the label"*):

- **Gỡ bỏ hoàn toàn đoạn CSS ép màu `#FBF5EB` trong `index.css:1288-1373`** và **xóa toàn bộ màu Cam Đỏ `#EA580C`**.
- Phân cấp đúng **5 cấp độ nút bấm** rõ ràng:
  1. **Primary CTA (Nút hành động chính — Tối đa 1 nút nổi bật nhất mỗi khu vực):**
     - **Nền:** Vàng Thương Hiệu Đậm **`#C59B58`** (Hover: **`#A87D38`**, Active: `scale-[0.96]`).
     - **Chữ & Icon:** Trắng **`#FFFFFF`** hoặc Nâu Đen **`#1A1612`** tùy ngữ cảnh (hoặc dùng nền **`#B88E4F` / `#9E7432`** với chữ **`#FFFFFF`** để đạt độ tương phản cao, sắc nét như nút trên Banner trang chủ).
     - *Áp dụng cho:* "Đăng nhập an toàn", "Tiến hành Mua Hàng", "Mua ngay", "Mua lại", "Gửi yêu cầu rút tiền", "+ Tạo link tiếp thị", "+ Thêm sản phẩm", "Bổ nhiệm Nhân sự".
  2. **Secondary Dark Accent (Nút nhấn phụ sang trọng):**
     - **Nền:** Nâu Espresso **`#231D15`** (Hover: `#3A2F23`) — **Chữ:** `#FAF8F5` hoặc vàng `#EBD08C`.
     - *Áp dụng cho:* Các hành động quan trọng cấp 2 như "Đề xuất Thỏa thuận Độc quyền", "Tạo mã payOS".
  3. **Secondary Soft Gold (Nút nghiệp vụ thương hiệu nhẹ):**
     - **Nền:** `#FBF5EB` — **Viền:** `#EEDFC6` (Hover: `#F3EFE6`, viền `#C59B58`) — **Chữ:** `#8C6226`.
     - *Áp dụng cho:* "Gợi ý KOC", "Tạo đơn thủ công", "Nhập Excel".
  4. **Outline Neutral (Nút thao tác tiêu chuẩn):**
     - **Nền:** `#FFFFFF` — **Viền:** `#EAE4D7` (Hover: `#FAF8F5`, viền `#C4B499`) — **Chữ:** `#1A1612`.
     - *Áp dụng cho:* "Liên hệ Shop", "Đánh giá", "Làm mới", "Xuất báo cáo", "Sửa thông tin".
  5. **Ghost / Danger (Nút phụ tối giản / Nút cảnh báo xóa, khóa):**
     - *Danger:* Nền `#FEF2F2`, viền `#FECACA`, chữ `#DC2626` (chỉ tô đặc `#DC2626` chữ trắng ở nút xác nhận cuối cùng trong Modal).
- **Tách biệt hoàn toàn Badge (Nhãn trạng thái) và Button (Nút bấm):**
  - **Button:** Bo góc `rounded-xl` (`12px`), chiều cao chuẩn `36px` (`sm`) hoặc `40px` (`md`), có hiệu ứng hover + `active:scale-[0.96]`.
  - **Badge trạng thái:** Bo tròn `rounded-md` (`6px`) hoặc `rounded-full`, chiều cao nhỏ `22px–24px`, có chấm tròn trạng thái (`6px`) bên trái, **không có hiệu ứng bóng đổ của nút bấm**.

---

### Quy luật 4: Thống nhất Duy Nhất 1 Kiểu Thanh Tab (Segmented & Underline Tabs)
Xóa bỏ tình trạng 5 trang 5 kiểu tab. Toàn hệ thống chỉ dùng đúng **2 cấp độ Tab chuẩn**:
1. **Tab Cấp 1 (Chuyển phân khu lớn trên đầu trang — Segmented Pill Tray):**
   - Đặt trong khay nền cát `bg-[#F3EFE6] p-1 rounded-xl border border-[#EAE4D7] inline-flex` (chiều rộng vừa khít nội dung, không kéo giãn full màn hình).
   - **Tab đang chọn:** Nền trắng `bg-white text-[#1A1612] font-semibold shadow-xs border border-[#EAE4D7]/80`.
   - **Tab chưa chọn:** `text-[#6B5E4B] hover:text-[#1A1612] font-medium`.
   - **Bỏ các vòng tròn đánh số `1, 2, 3`** trên các tab không phải là quy trình tuần tự.
2. **Tab Cấp 2 (Lọc trạng thái danh sách như *Tất cả / Chờ xác nhận / Đang giao / Hoàn thành*):**
   - Dùng thanh Tab gạch chân (Underline Bar) trên nền Card trắng hoặc Pill gọn nhẹ:
   - **Tab đang chọn:** Chữ `#1A1612 font-semibold` + Gạch chân dày `2.5px` màu Vàng thương hiệu `#C59B58` (hoặc Pill nền `#231D15` chữ trắng). **Tuyệt đối không dùng Gradient Cam `#EA580C`**.

---

### Quy luật 5: Quy chuẩn Thang Chữ (6 Bậc Cố Định) & Chữ Số Tài Chính
Thu gọn **42 cỡ chữ tự phát** về đúng **6 bậc chuẩn** theo [`better-typography`](file:///c:/HW/CAPSTONE/.agents/skills/better-typography/SKILL.md):

| Bậc chữ (Token) | Kích thước & Dòng (`font-size` / `line-height`) | Độ đậm (`font-weight`) | Vị trí áp dụng bắt buộc |
| :--- | :--- | :---: | :--- |
| **1. `Display / KPI`** | `24px – 28px` (`text-2xl` / `leading-tight`) | `700` (`font-bold`) | Số dư ví, Tổng doanh thu KPI trên thẻ thống kê (`tabular-nums`) |
| **2. `Page Title (H1)`** | `20px` (`text-xl` / `leading-snug`) | `700` (`font-bold`) | Tiêu đề chính của trang (`tracking-[-0.02em]`) |
| **3. `Section / Card Title (H2/H3)`** | `15px – 16px` (`text-base` / `leading-snug`) | `600` (`font-semibold`) | Tiêu đề khối, tên cửa hàng, tên sản phẩm lớn |
| **4. `Body / Control`** | `14px` (`text-sm` / `leading-normal`) | `400` / `500` / `600` | Nội dung chính, ô Input, nhãn nút bấm, dòng bảng dữ liệu |
| **5. `Secondary / Menu`** | `13px` (`text-[13px]` / `leading-normal`) | `500` (`font-medium`) | Mục menu Sidebar, mô tả phụ, thông tin ngày tháng |
| **6. `Caption / Badge (Sàn tối thiểu)`** | **`12px` (`text-xs` / `leading-tight`)** | `500` / `600` | Badge trạng thái, tiêu đề cột bảng (`uppercase tracking-wider`). **Cấm dùng chữ `< 11px`!** |

- **Quy tắc Phông chữ:**
  - **Toàn bộ Giá tiền, Số dư, Phần trăm (`250.000 ₫`, `11.500.004 ₫`, `+12.8%`):** Dùng **`Plus Jakarta Sans` + `tabular-nums`** (xóa bỏ `font-mono` khỏi giá tiền để bỏ số `0` gạch chéo).
  - **`JetBrains Mono` (`font-mono`):** Chỉ dùng duy nhất cho **Mã định danh kỹ thuật** (`#DH-2026...`, `SORA-VITC-215`, `REF-MINHANHFIT10`, `THAONHI16`).

---

### Quy luật 6: Quy chuẩn Icon, Bo góc đồng tâm & Tinh gọn câu chữ
1. **Chuyên nghiệp hóa Icon (`better-ui`):**
   - **Xóa toàn bộ 55 Emoji Unicode (`⚡`, `🎟`, `🎁`, `👑`...)** khỏi giao diện; thay 100% bằng icon vector của **`lucide-react`**.
   - **Bỏ các ô vuông nền kem `#FBF5EB` bọc icon ở tiêu đề trang và tiêu đề bảng** — chỉ giữ lại ô icon cho **4 thẻ KPI thống kê hàng đầu**, giúp giao diện thoáng và sạch hơn 50%.
   - Đồng bộ nét vẽ: Icon đi cạnh chữ thường dùng `strokeWidth={1.75}`, đi cạnh chữ đậm/active dùng `strokeWidth={2}`.
2. **Bo góc đồng tâm (`Concentric Border Radius` — `better-ui`):**
   - Công thức: $\text{Bán kính ngoài} = \text{Bán kính trong} + \text{Khoảng đệm (Padding)}$.
   - Khung Card ngoài: `rounded-2xl` (`16px`), padding `16px` (`p-4`) hoặc `20px` (`p-5`) $\rightarrow$ Khung/Nút bên trong: `rounded-xl` (`12px`) $\rightarrow$ Badge/Tag nhỏ bên trong: `rounded-lg` (`8px`).
3. **Tinh gọn mô tả & Quét sạch từ ngữ "Sàn / Gian hàng" còn sót:**
   - Cắt bỏ các dòng phụ giải thích lặp lại tiêu đề; gộp 3 hộp nhắc mã KOL ở Giỏ hàng thành 1 dòng duy nhất trong khung Tóm tắt đơn hàng.
   - Thay thế triệt để các từ còn sót đã phát hiện qua ảnh chụp: `Sàn mua sắm` $\rightarrow$ `Cổng mua sắm`, `Chuyên viên Sàn` $\rightarrow$ `Chuyên viên Vận hành`, `Toàn sàn` $\rightarrow$ `Toàn hệ thống`, `Quét lại toàn sàn` $\rightarrow$ `Quét toàn hệ thống`, `Sàn: 10%` $\rightarrow$ `Gốc: 10%`, `Chủ shop` $\rightarrow$ `Quản lý cửa hàng`.

---

## PHẦN 4: HƯỚNG GIẢI QUYẾT ĐỀ XUẤT (LỘ TRÌNH 4 BƯỚC TRIỂN KHAI)

1. **Bước 1 — Khôi phục Hệ thống Màu & Nút bấm cốt lõi (`index.css`, `Button.tsx`, `Badge.tsx`, `Sidebar.tsx`):**
   - Gỡ bỏ bộ lọc tẩy trắng nút trong `index.css:1288-1373`, trả lại màu Vàng thương hiệu nổi bật cho các nút Primary CTA.
   - Chuẩn hóa nền Sidebar sang `#F3EFE6` với trạng thái Active nền trắng + vạch chỉ thị vàng `#C59B58` sắc nét.
2. **Bước 2 — Chuẩn hóa Phông chữ, Thang chữ & Xóa màu Cam lạc tông trên cổng Customer & Storefront:**
   - Đổi tab "Tất cả" và nút "Mua lại" từ màu Cam `#EA580C` về đúng chuẩn Brand Gold; chuyển giá tiền từ `font-mono` sang `Plus Jakarta Sans tabular-nums`; nâng các chữ lí nhí `9px–10px` lên chuẩn `12px–13px`; cố định vị trí nút Chat nổi để không đè lên nút thao tác đơn hàng.
3. **Bước 3 — Đồng bộ Thanh Tab, Bố cục Bảng & Nút công cụ trên cổng KOL, Shop Manager & Admin:**
   - Thống nhất 1 kiểu Tab chung; thu gọn các nút bị kéo giãn 100% chiều ngang vô lý (như nút `Làm mới` ở Quản lý đơn hàng Shop, nút `Xuất báo cáo` ở Admin); thay thế toàn bộ Emoji bằng icon `lucide-react`.
4. **Bước 4 — Quét sạch các từ ngữ "Sàn / Chủ shop" còn sót & Kiểm thử Tự động đa màn hình.**
