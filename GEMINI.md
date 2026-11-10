# SCANMS SYSTEM INSTRUCTIONS & IMMUTABLE PROJECT MEMORY

> ⚠️ **LƯU Ý TỐI THƯỢNG VỀ BỘ NHỚ VĨNH VIỄN (POST-REVIEW 2 LOCKED GOVERNANCE):**  
> File này lưu trữ các chỉ thị bất biến đã được Team Leader **Nguyễn Thành Thắng** chốt sau buổi Review 2 Hội đồng SWP490. Mọi tương tác, phân tích, thiết kế UI/UX, cập nhật hồ sơ tài liệu và lập trình Frontend / Backend / Mobile **BẮT BUỘC PHẢI TUÂN THỦ 100%**, tuyệt đối không tự ý thay đổi.

---

## 0. 🏷️ TÊN ĐỀ TÀI BẤT BIẾN (TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỔI TÊN DỰ ÁN)

- **Mã đề tài:** `FA26SE032` (`SCANMS`)
- **Tên tiếng Việt cố định:** **Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết**
- **Tên tiếng Anh cố định:** **Sales Collaborator and Affiliate Network Management System**
- **Giảng viên hướng dẫn:** ThS. Tôn Thất Hoàng Minh (`minhtth5@fpt.edu.vn`)
- **Đội ngũ 4 thành viên:**
  1. **Nguyễn Thành Thắng** (`SE184251` — Team Leader)
  2. **Nguyễn Đình Tuấn** (`SE182540`)
  3. **Nguyễn Phú Quý** (`SE180104`)
  4. **Phan Xuân Thịnh** (`SE184527`)

---

## 1. 🎨 HỆ THỐNG MÀU SẮC CHỦ ĐẠO TỐI THƯỢNG: VÀNG BE (WARM SAND & BRAND GOLD)

### ❌ ĐIỀU CẤM TUYỆT ĐỐI:
- **NGHIÊM CẤM:** **KHÔNG BAO GIỜ** được sử dụng màu **XANH LÁ CÂY (Emerald / Teal / Mint `#0F766E`, `#10B981`, `#0D5C52`, `#EDF7F4`,...)** làm màu chủ đạo, màu nền, màu thanh header hay màu nút bấm thương hiệu!
- Màu xanh lá (`#059669`) chỉ được dùng duy nhất cho icon tick xác minh nhỏ (`CheckCircle` $14\text{px}$) hoặc chỉ số % tăng trưởng dương nhỏ (`+12.4%`). **TUYỆT ĐỐI KHÔNG DÙNG CHO NỀN, HEADER, SIDEBAR, HOẶC NÚT BẤM (BUTTON/CTA)**.

### ✅ BẢNG MÃ MÀU CHUẨN ĐƯỢC PHÉP SỬ DỤNG (WARM SAND GOLD TOKENS):
| Token CSS / Tailwind | Hex Code | Ý Nghĩa / Vị Trí Bắt Buộc |
| :--- | :--- | :--- |
| `--canvas` | `#FAF8F5` | Nền toàn bộ website (Soft Warm Cream) |
| `--surface-sand` | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ, bộ lọc (Warm Sand) |
| `--surface` | `#FFFFFF` | Nền thẻ Card chính, ô form, modal |
| `--brand` | `#C59B58` | Nút bấm chính ("Đăng nhập an toàn", "Xác nhận", "Gửi đề xuất"), CTA chính |
| `--brand-strong` | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, trạng thái active, viền nút khi hover |
| `--brand-soft` | `#FBF5EB` | Nền badge ưu đãi, nền pill thù lao KOL, box thông tin nổi bật |
| `--brand-border` | `#EEDFC6` | Viền badge ưu đãi, viền hộp thông tin |
| `--brand-dark` | `#231D15` | Nút phụ sang trọng (Dark Accent), thanh header tương phản cao |
| `--line` / `--border` | `#EAE4D7` | Đường kẻ phân cách, viền ô nhập liệu (Input), viền thẻ Card |
| `--ink` | `#1A1612` | Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính (Deep Ink) |
| `--muted` | `#7D715E` | Màu chữ phụ, mô tả, chú thích, nhãn phụ (Warm Muted) |
| `--warning` | `#D97706` | Trạng thái Chờ đối soát / Chờ duyệt (Pending / Escrow) |
| `--danger` | `#DC2626` | Trạng thái lỗi, từ chối, thu hồi Clawback, cảnh báo vi phạm |

---

## 2. 🏛️ BẢN SẮC HỆ THỐNG QUẢN LÝ NỘI BỘ & CÁC CHỨC NĂNG BỊ BÃI BỎ VĨNH VIỄN

> [!IMPORTANT]
> **ĐỊNH VỊ MÔ HÌNH HOẠT ĐỘNG THỐNG NHẤT SAU REVIEW 2:**
> 1. **Bản chất hệ thống:** **Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết (`Sales Collaborator and Affiliate Network Management System`)** là **Hệ thống Quản lý Nội bộ cấp Doanh nghiệp Đa Nhãn Hàng (Enterprise In-House Multi-Store Collaborator & Affiliate Management System)** — thuộc sở hữu của một doanh nghiệp sở hữu chuỗi cửa hàng/nhãn hàng trực thuộc (tương tự mô hình chuỗi đa thương hiệu *Coolmate D2C / MWG*), kết nối và quản trị mạng lưới Cộng tác viên / KOC / KOL bên ngoài.
> 2. **Nguyên tắc "Trong - Ngoài" bất biến:**  
>    **"CỬA HÀNG (`STORE`) & `SHOP_MANAGER` LÀ NỘI BỘ DOANH NGHIỆP (DO `SYSTEM_ADMIN` TẠO) — CỘNG TÁC VIÊN / KOL (`COLLABORATOR`) LÀ ĐỐI TÁC BÊN NGOÀI"**.
> 3. **TUYỆT ĐỐI KHÔNG XA ĐÀ VÀO SÀN THƯƠNG MẠI ĐIỆN TỬ (NO MARKETPLACE DRIFT):** Giao diện đặt hàng của `CUSTOMER` trên Web/Mobile đóng vai trò là **Cổng Ghi Nhận Đơn Hàng & Đối Soát Attribution Trực Tiếp (First-Party Attribution Storefront)** để hệ thống nắm 100% dữ liệu đơn hàng thực, trạng thái giao vận GHN và đối soát trả hàng 14 ngày phục vụ quyết toán thù lao minh bạch.

### 🚫 DANH MỤC 4 NHÓM CHỨC NĂNG BÃI BỎ VĨNH VIỄN (NGHIÊM CẤM XUẤT HIỆN TRONG TÀI LIỆU/THIẾT KẾ MỚI):
1. **BÃI BỎ 100% CƠ CHẾ GOM ĐỢT KHUYẾN MÃI ĐẠI TRÀ CŨ (KHÔNG CÒN TỒN TẠI):**
   - Toàn bộ thực thể, màn hình, API của phân hệ gom đợt khuyến mãi cũ **đã bị loại bỏ hoàn toàn** vì chức năng thỏa thuận thù lao đã có **Thỏa thuận Thù lao Độc quyền (`Exclusive Deal`)**, còn chức năng giảm giá sản phẩm đã có **Quản trị Giá bán kèm Giá sàn (`floorPrice`)**.
   - **Tuyệt đối không nhắc tới hay đưa khái niệm cũ đó vào bất kỳ file phân tích, công thức tính tiền, ERD hay workflow mới nào.**
2. **BÃI BỎ 100% KHO TÀI NGUYÊN SỐ (`MEDIA` / `MEDIA HUB`):**
   - Bỏ hoàn toàn chức năng và màn hình Media Hub vì `SHOP_MANAGER` và `COLLABORATOR` đã có thể gửi trực tiếp ảnh HD, video, tài liệu hướng dẫn sản phẩm ngay qua **Tin nhắn Chat Realtime (Socket.IO)**.
3. **BÃI BỎ 100% VOUCHER SÀN & VOUCHER CÔNG KHAI CỦA SHOP:**
   - Xóa bỏ hoàn toàn voucher toàn sàn, voucher freeship đại trà, voucher công khai của cửa hàng (kiểu sàn TMĐT).
   - **Chỉ giữ lại duy nhất Voucher/Coupon Thỏa Thuận Độc Quyền gắn với KOL (`KOL Exclusive Deal Coupon`, ví dụ `THAONHI16`)** vừa ưu đãi cho khách mua qua KOL vừa làm định danh Attribution đơn hàng chính xác.
4. **BÃI BỎ 100% ĐĂNG KÝ / NÂNG CẤP LÀM `SHOP_MANAGER`:**
   - Không có form đăng ký mở gian hàng ngoài, không có luồng nâng cấp từ Customer lên Shop. Tài khoản `SHOP_MANAGER` và `Store` chỉ do `SYSTEM_ADMIN` khởi tạo và phân công nội bộ.

### 🏪 4 Khối Cửa Hàng Trực Thuộc Doanh Nghiệp (In-House Stores):
| Đơn vị Cửa hàng Nội bộ (`Store`) | Ngành hàng Khóa cứng (`primaryCategory`) | Kho Xuất Hàng GHN Vệ Tinh | Tệp KOL / KOC Tiếp thị Mục tiêu |
| :--- | :--- | :--- | :--- |
| **Store 1: Sora Skincare & Cosmetics** | Mỹ phẩm & Chăm sóc da chuyên sâu | Kho Mát Dược Mỹ phẩm GMP, TP.Thủ Đức (`1442` / `20109`) | KOC Beauty, Skincare Reviewers |
| **Store 2: Aura Activewear & Apparel** | Thời trang & May mặc thể thao năng động | Kho May Mặc Thời Trang, Tân Bình, TP.HCM (`1444` / `20708`) | Fashion Creators, Gymer, Lifestyle KOCs |
| **Store 3: GreenBio Health & Nutrition** | Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên | Kho Dược Liệu & Sức Khỏe, Tân Phú, TP.HCM (`1452` / `21011`) | KOC Eat-clean, HLV Thể hình, Dược sĩ |
| **Store 4: Lumière Smart Living** | Thiết bị gia dụng & Đồ bếp thông minh | Kho Tổng Thiết Bị & Đồ Bếp, KCN Tân Bình (`1452` / `21011`) | KOC Gia đình, Review Gia dụng, Food Bloggers |

---

## 3. 👥 HỆ THỐNG 5 USER ROLES & KIẾN TRÚC ĐA NỀN TẢNG (WEB + MOBILE APP)

### 📱 Kiến Trúc Nền Tảng Đồng Bộ:
- **Web Application (React + TypeScript):** Phục vụ toàn diện công tác quản trị chuyên sâu cho `SYSTEM_ADMIN`, `SYSTEM_MANAGER`, `SHOP_MANAGER`, cổng làm việc `COLLABORATOR` và cổng mua sắm chuyển đổi `CUSTOMER`.
- **Mobile Application (React Native / Expo tại `Mobile/`):** Ứng dụng di động gọn nhẹ tập trung cho **Đội ngũ Cộng tác viên / KOL (`COLLABORATOR`)** lấy Smart Link / Dynamic QR / Coupon nhanh trên điện thoại, nhắn tin thỏa thuận với Shop Manager, theo dõi biến động số dư thù lao từng giỏ tiền, nộp link nghiệm thu hàng mẫu và tạo lệnh rút tiền mọi lúc mọi nơi (kèm trải nghiệm tra cứu đơn hàng cho `CUSTOMER`).

### 🔐 Ma Trận 5 Vai Trò (`enum UserRole` Chuẩn Hóa):
1. **`CUSTOMER` (Khách Mua Hàng):**
   - Mua hàng đã xác thực tài khoản (`customerId` bắt buộc gắn chặt với `SalesOrder`) qua Smart Link, Dynamic QR hoặc nhập **Voucher Deal Độc Quyền của KOL (`THAONHI16`)**.
   - Thanh toán VietQR / PayOS / COD, theo dõi vận đơn GHN, gửi yêu cầu đổi hàng 1-1 (lỗi vận chuyển/sản xuất) hoặc trả hàng hoàn tiền trong thời hạn **14 ngày**.
   - Có thể nộp hồ sơ eKYC nâng cấp thành Cộng tác viên (`COLLABORATOR`).
2. **`COLLABORATOR` (Cộng tác viên bán hàng / KOL / KOC):**
   - Đăng ký & nộp hồ sơ eKYC (CCCD, tài khoản ngân hàng thụ hưởng, danh mục kênh MXH TikTok/FB/YouTube kèm ảnh chứng minh chính chủ).
   - Khởi điểm tại **Hạng ĐỒNG (`Bronze` — +0%, hưởng 10% gốc)**; tự động xét bậc **Bạc (`+1%` = 11%)**, **Vàng (`+2%` = 12%)**, **Kim Cương (`+3%` = 13%)** theo doanh số sạch tích lũy.
   - Đàm phán **Thỏa thuận Thù lao Độc quyền (`Exclusive Deal`)** 2 chiều với `SHOP_MANAGER` và nhận tài liệu/ảnh/video sản phẩm trực tiếp qua **Chat Realtime**.
   - Mượn hàng mẫu trải nghiệm (SLA trả link review trong **14 ngày**), sinh Smart Link / Dynamic QR / Voucher Deal độc quyền.
   - Theo dõi sổ cái minh bạch từng giỏ tiền (Tiền khả dụng rút được, Tiền chờ 14 ngày hết hạn trả hàng `10% + Bậc`, Tiền chờ đạt KPI Deal `Deal% - (10% + Bậc)`, Thưởng bậc, Thưởng mốc phụ trợ, Thuế TNCN 10%) và rút tiền Napas 24/7.
3. **`SHOP_MANAGER` (Quản lý Cửa hàng / Nhãn hàng Nội bộ):**
   - Do `SYSTEM_ADMIN` tạo tài khoản và gán quản lý cửa hàng nội bộ (không tự đăng ký, không có ví rút doanh thu).
   - Quản lý sản phẩm & biến thể 2 cấp (`Product` – `ProductVariant`) tuân thủ **Khóa Ngành Hàng (`Category Lock`)** và **Giá Sàn Thấp Nhất (`floorPrice`)**.
   - Dùng AI Matching tìm KOL phù hợp, đàm phán **Deal Thù lao Độc quyền** (tự quyết định nếu **`<= 16%`**, chuyển `SYSTEM_ADMIN` duyệt nếu **`> 16%` đến `25%`**), gửi ảnh/video/file qua Chat, duyệt cấp hàng mẫu 0đ và xử lý đơn hàng.
4. **`SYSTEM_MANAGER` (Chuyên viên Vận hành & Kế toán Đối soát):**
   - Thẩm định hồ sơ eKYC của KOL (Maker-Checker), kiểm duyệt sản phẩm mới & kiểm soát chống trùng lặp nội bộ.
   - Xử lý yêu cầu đổi trả (bù hàng 1-1 bảo lưu thù lao vs trả hàng hoàn tiền kích hoạt **Clawback** thu hồi thù lao) và trọng tài vi phạm SLA hàng mẫu 14 ngày.
   - **Đối soát & phê duyệt lệnh rút tiền hàng ngày của KOL:** Khấu trừ **10% Thuế TNCN** tại nguồn (áp dụng theo quy định khấu trừ thuế thu nhập vãng lai) và giải ngân chuyển khoản.
5. **`SYSTEM_ADMIN` (Quản trị viên Hệ thống / Ban Giám đốc):**
   - Độc quyền khởi tạo Cửa hàng nội bộ và cấp tài khoản nhân sự (`SHOP_MANAGER`, `SYSTEM_MANAGER`).
   - **Can thiệp phê duyệt bắt buộc đối với mọi Thỏa thuận Deal Thù lao vượt ngưỡng `> 16%` (tối đa trần `25%`)** và ngoại lệ giá sàn.
   - Giám sát **Executive Financial Dashboard** (Tổng dòng tiền vào, công nợ phải trả CTV theo từng rổ Escrow, chi phí thù lao thực tế, thuế TNCN khấu trừ), cấu hình quy tắc bậc/mốc thưởng (`CommissionRule`) và giám sát AI Fraud Sentinel + `AuditLog`.

---

## 4. 💰 CƠ CHẾ TÍNH THÙ LAO & QUYẾT TOÁN 2 GIAI ĐOẠN (CHUẨN KẾ TOÁN — KHÔNG SAI SỐ)

> [!CAUTION]
> **QUY TẮC TỐI THƯỢNG VỀ TÍNH TIỀN CHO KOL (BẮT BUỘC CHÍNH XÁC 100%):**
> 1. **Chỉ có Thù lao Gốc (`10%`) + Bậc KOL (`Tier%`) và Thỏa thuận Deal Độc quyền (`Exclusive Deal%`)** làm xương sống tính thù lao đơn hàng (cùng các khoản **phụ trợ**: Thưởng mốc tháng & Livestream).
> 2. **TUYỆT ĐỐI KHÔNG CỘNG DỒN DEAL VỚI BẬC KOL!** Nếu KOL bậc Vàng (`+2%`, tức mức thường là `12%`) ký Deal độc quyền `16%`, tổng thù lao tối đa của KOL trên đơn hàng đó khi đạt KPI là **`16%`** (chứ KHÔNG PHẢI `16% + 2% = 18%`).
> 3. **CHIA TÁCH GIẢI NGÂN 2 GIAI ĐOẠN (TRẢ TRƯỚC `10% + BẬC` SAU 14 NGÀY — GIỮ LẠI PHẦN CHÊNH LỆCH KPI DEAL ĐÃ TRỪ BẬC):**

### 📐 Công Thức Toán Học Bất Biến Trên Từng Đơn Hàng Hợp Lệ:

Gọi:
- $V$: Giá trị tính thù lao ròng của sản phẩm/đơn hàng (sau khi trừ chiết khấu Voucher Deal độc quyền của KOL, không bao gồm phí vận chuyển GHN, đảm bảo đơn giá thực thu $\ge \text{floorPrice}$).
- $R_{\text{base}} = 10\%$: Tỷ lệ thù lao cơ bản cố định toàn hệ thống.
- $R_{\text{tier}} \in \{0\%, 1\%, 2\%, 3\%\}$: Tỷ lệ cộng thêm theo Bậc KOL tại thời điểm ghi nhận quy tắc đơn hàng (**Đồng `0%`**, **Bạc `+1%`**, **Vàng `+2%`**, **Kim Cương `+3%`**).
- $R_{\text{standard}} = R_{\text{base}} + R_{\text{tier}} \in \{10\%, 11\%, 12\%, 13\%\}$: Tỷ lệ thù lao tiêu chuẩn chắc chắn hưởng khi đơn thành công qua 14 ngày.
- $R_{\text{deal}}$: Tỷ lệ thỏa thuận trong **Exclusive Deal** đang hiệu lực giữa KOL và Shop Manager:
  - Ngưỡng tự quyết của `SHOP_MANAGER`: $R_{\text{standard}} < R_{\text{deal}} \le 16\%$.
  - Ngưỡng bắt buộc qua `SYSTEM_ADMIN` phê duyệt: $16\% < R_{\text{deal}} \le 25\%$.
  - Trần tuyệt đối toàn hệ thống: **$\le 25\%$** (kể cả khi có cộng phụ trợ Livestream `+2%`).

#### 🔹 Khoản 1 — Tiền Thù Lao Tiêu Chuẩn Chờ 14 Ngày Trả Hàng (`Standard Hold: 10% + Tier%`):
$$A_{\text{standard}} = \text{round}\Big(V \times (10\% + R_{\text{tier}})\Big) = \underbrace{\text{round}(V \times 10\%)}_{A_{\text{base}}} + \underbrace{\Big(\text{round}(V \times (10\% + R_{\text{tier}})) - \text{round}(V \times 10\%)\Big)}_{A_{\text{tier}}}$$
- Ngay khi đơn hàng giao thành công (`DELIVERED`), khoản $A_{\text{standard}}$ được đưa vào **Giỏ Chờ Đối Soát 14 Ngày Đổi Trả (`PENDING_14D_HOLD`)**.
- Sau đúng **14 ngày** kể từ lúc giao hàng thành công mà khách không trả hàng hoàn tiền $\rightarrow$ Hệ thống tự động giải ngân **chỉ phần $A_{\text{standard}} = 10\% + \text{Tier\%}$** này sang **Số dư khả dụng được rút (`availableBalance`)** của KOL.

#### 🔹 Khoản 2 — Tiền Thưởng Chênh Lệch Deal Giữ Lại Chờ Đạt KPI (`KPI Deal Escrow`):
Nếu đơn hàng áp dụng **Exclusive Deal** có $R_{\text{deal}} > (10\% + R_{\text{tier}})$:
$$R_{\text{kpi\_diff}} = \max\Big(0,\; R_{\text{deal}} - (10\% + R_{\text{tier}})\Big)$$
$$A_{\text{kpi\_escrow}} = \text{round}(V \times R_{\text{deal}}) - A_{\text{standard}}$$
- **Ý nghĩa cốt lõi:** Vì KOL đã được hưởng `10% + Tier%` ở Khoản 1, nên phần tiền thưởng Deal treo chờ KPI **BẮT BUỘC PHẢI TRỪ ĐI CẢ `10%` GỐC LẪN `Tier%` CỦA BẬC KOL** ($A_{\text{total\_deal}} - A_{\text{standard}}$).
- **Ví dụ minh họa chuẩn xác:** Đơn hàng $V = 1.000.000₫$, KOL đang ở **Bậc Vàng (`+2%` $\rightarrow$ `12%`)**, có **Deal Độc Quyền `18%`** (đã được Admin duyệt vì $> 16\%$):
  - Khoản 1 (Chờ hết hạn 14 ngày trả hàng): $12\% \times 1.000.000₫ = \mathbf{120.000₫}$ (gồm $100.000₫$ Gốc 10% + $20.000₫$ Bậc Vàng 2%). Hết 14 ngày không hoàn hàng $\rightarrow$ KOL rút được ngay $120.000₫$ này!
  - Khoản 2 (Treo chờ đạt đủ KPI Deal): $(18\% - 12\%) \times 1.000.000₫ = 6\% \times 1.000.000₫ = \mathbf{60.000₫}$ (tuyệt đối không tính $18\% - 10\% = 80.000₫$ vì sẽ bị trùng 2% bậc Vàng thành 20%!).
  - Khi Deal **đạt đủ 100% KPI** (và đơn hàng đã qua mốc 14 ngày sạch) $\rightarrow$ Giải ngân nốt $\mathbf{60.000₫}$ về ví khả dụng. Tổng tiền KOL thực nhận trên đơn = $120.000₫ + 60.000₫ = \mathbf{180.000₫}$ (đúng chuẩn `18%` tuyệt đối không sai 1 đồng!).
  - Nếu hết hạn Deal mà **KHÔNG đạt KPI** $\rightarrow$ Khoản $60.000₫$ bị hủy (`KPI_FORFEITED`), KOL vẫn giữ trọn $120.000₫$ (`10% + Bậc Vàng 2%`).

#### 🔹 Khoản 3 — Các Khoản Phụ Trợ (`Auxiliary Features` — Không thuộc luồng chính):
- **Thưởng mốc doanh số tháng (`FR-09 Monthly Milestone Bonus`):** Phụ trợ tổng kết cuối tháng theo quy tắc `CommissionRule` trên doanh số sạch đã hết hạn 14 ngày trả hàng, ghi nhận thành bút toán riêng biệt `MILESTONE_BONUS` trong ví KOL.
- **Phụ trợ Livestream (`+2% Live Bonus`):** Đơn hàng chốt trực tiếp trong phiên Live được cộng phụ trợ tối đa `+2%` (nhưng tổng toàn bộ tỷ lệ trên đơn không bao giờ vượt trần `25%`), giải ngân cùng chu kỳ 14 ngày đổi trả.

#### 🔹 Khoản 4 — Đổi Trả Hàng, Thu Hồi (`Clawback`) & Rút Tiền Khấu Trừ Thuế TNCN 10%:
- **Đổi hàng mới 1-1 (`EXCHANGE_1_TO_1` do lỗi vận chuyển GHN / lỗi nhà sản xuất):** Bảo lưu 100% cả Khoản 1 (`10% + Bậc`) và Khoản 2 (`KPI Deal`) cho KOL.
- **Trả hàng hoàn tiền (`REFUND` trong hạn 14 ngày):** Thu hồi (`CLAWBACK`) toàn bộ Khoản 1 và Khoản 2 của đơn hàng/sản phẩm hoàn trả về `0₫`, đồng thời trừ doanh số khỏi tiến độ KPI Deal và doanh số xét Bậc/Mốc.
- **Rút tiền & Khấu trừ Thuế TNCN 10%:** Khóa dòng `SELECT ... FOR UPDATE` chống rút trùng; khóa tiền sang `lockedPayoutBalance`; khi `SYSTEM_MANAGER` duyệt chi, khấu trừ `10%` Thuế TNCN nộp ngân sách (áp dụng từ ngưỡng quy định hoặc khấu trừ tại nguồn minh bạch trên phiếu chi) và chuyển khoản `90%` thực nhận (`netAmount`).

---

## 5. 🎯 NGUYÊN TẮC TỔ CHỨC 5 MAIN WORKFLOWS CHUẨN REVIEW 2 SWP490

1. **Mỗi Workflow có DUY NHẤT 1 người sở hữu (`1 Workflow = 1 Sole Owner`):** Tuyệt đối không chia "nửa đầu / nửa sau" hoặc đứng tên 2 người trên cùng 1 Workflow.
2. **Tích hợp Đăng ký, eKYC và Rút tiền vào các quy trình nghiệp vụ liên quan:** Không tách Đăng ký/KYC hay Rút tiền thành các workflow đơn lẻ quá đơn giản để demo độc lập.
3. **Bám sát trục cốt lõi Quản trị Đội ngũ Cộng tác viên & Tiếp thị Liên kết:**
   - **WF-01 (Nguyễn Thành Thắng):** Khởi tạo Cửa hàng & Nhân sự Nội bộ, Tuyển mộ Cộng tác viên Đa kênh, Thẩm định eKYC Maker-Checker, Kích hoạt Bậc Đồng (`10%`) & Kết nạp Đối tác vào Cửa hàng Nội bộ (`StoreCollaborator`).
   - **WF-02 (Phan Xuân Thịnh):** Quản trị Sản phẩm Biến thể 2 Cấp (Khóa Ngành hàng & Bảo vệ Giá sàn `floorPrice`), Đề xuất AI Matching & Đàm phán Thỏa thuận Thù lao Độc quyền 2 Chiều qua Chat Đính kèm File (`<= 16%` Shop duyệt / `> 16%` leo thang Admin duyệt, trần `25%`).
   - **WF-03 (Nguyễn Đình Tuấn):** Cấp phát Hàng mẫu Trải nghiệm SLA 14 Ngày, Khởi tạo Công cụ Tiếp thị Định danh (Smart Link, Dynamic QR, Voucher Deal Độc quyền KOL) & Ghi nhận Đơn hàng Chống Gian lận Tự mua (Web + Mobile).
   - **WF-04 (Nguyễn Phú Quý):** Thực thi Giao vận GHN Đa kho Nội bộ, Đối soát Đổi trả 14 Ngày (Đổi mới 1-1 Bảo lưu Thù lao vs Hoàn tiền Kích hoạt Clawback) & Theo dõi Tiến độ Thỏa thuận KPI.
   - **WF-05 (Nguyễn Thành Thắng):** Quyết toán Thù lao 2 Giai đoạn (Giải ngân `10% + Bậc` sau 14 ngày & Kết chuyển Phần chênh lệch `Deal% - (10% + Bậc)` khi đạt KPI), Rút tiền Khấu trừ Thuế TNCN 10% (Row-Level Lock) & Báo cáo Kiểm toán Doanh nghiệp (`Executive Financial Ledger`).
   *(Ghi chú: Livestream bán hàng và Thưởng mốc doanh số tháng chỉ đóng vai trò tính năng phụ trợ bổ sung giá trị, không chiếm sóng 5 luồng nghiệp vụ cốt lõi).*
