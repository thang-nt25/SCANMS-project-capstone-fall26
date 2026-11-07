# SCANMS PROJECT RULES & DESIGN SYSTEM MEMORY

## 🏷️ TÊN DỰ ÁN CỐ ĐỊNH BẤT BIẾN (NEVER RENAME)
- **Tiếng Việt:** **Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết**
- **Tiếng Anh:** **Sales Collaborator and Affiliate Network Management System** (`SCANMS` — `FA26SE032`)

---

## ⚠️ CRITICAL BRAND & COLOR SYSTEM: VÀNG BE (WARM SAND & GOLD)
> **Tuyệt đối tuân thủ:** Tông màu chủ đạo duy nhất của toàn bộ hệ thống SCANMS là **VÀNG BE (WARM SAND & BRAND GOLD)**. 
> **NGHIÊM CẤM:** Không được sử dụng màu xanh lá (Emerald / Teal / Mint `#0F766E` / `#0D5C52` / `#EDF7F4`) làm màu chủ đạo, màu nền hay màu nút bấm thương hiệu!

### 🎨 BẢNG MÃ MÀU CHUẨN (ATOMIC TOKENS)

| Token Name | Hex Code | Ý Nghĩa / Vị Trí Áp Dụng |
| :--- | :--- | :--- |
| **`canvas`** | `#FAF8F5` | Nền toàn bộ trang web (Soft Warm Cream) |
| **`surface-sand`** | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ (Warm Sand) |
| **`surface-white`** | `#FFFFFF` | Nền thẻ Card chính, ô form, modal |
| **`brand`** | `#C59B58` | Nút bấm chính ("Đăng nhập an toàn", "Xác nhận", "Gửi đề xuất"), CTA chính |
| **`brand-strong`** | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, viền active, hover của nút |
| **`brand-soft`** | `#FBF5EB` | Nền pill badge, nền hộp thông tin thù lao & ưu đãi KOL |
| **`brand-border`** | `#EEDFC6` | Viền badge ưu đãi, viền hộp thông tin |
| **`brand-dark`** | `#231D15` | Nút phụ tối màu sang trọng, thanh header tối |
| **`line` / `border`** | `#EAE4D7` | Đường kẻ phân cách, viền ô nhập liệu (Input), viền thẻ Card |
| **`ink`** | `#1A1612` | Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính (`tabular-nums`) |
| **`muted`** | `#7D715E` | Màu chữ phụ, mô tả, chú thích, nhãn phụ |
| **`warning`** | `#D97706` | Trạng thái đang tạm giữ đối soát 14 ngày / chờ KPI / chờ duyệt |
| **`danger`** | `#DC2626` | Trạng thái lỗi, từ chối, thu hồi Clawback, cảnh báo vi phạm |
| **`success`** | `#059669` | Chỉ dùng cho icon tick xanh xác minh hoặc % tăng trưởng nhỏ, **KHÔNG LÀM MÀU CHỦ ĐẠO NỀN/NÚT** |

---

## 🏛️ ĐỊNH VỊ MÔ HÌNH HỆ THỐNG (ENTERPRISE IN-HOUSE COLLABORATOR & AFFILIATE SYSTEM)
1. **SCANMS KHÔNG PHẢI LÀ SÀN THƯƠNG MẠI ĐIỆN TỬ MỞ (NO SHOPEE/LAZADA MARKETPLACE DRIFT):**
   - SCANMS là **Hệ thống quản lý nội bộ đội ngũ cộng tác viên bán hàng và tiếp thị liên kết** của một doanh nghiệp sở hữu nhiều cửa hàng/nhãn hàng trực thuộc (4 In-House Stores: Sora Skincare, Aura Activewear, GreenBio Health, Lumière Smart Living).
   - **Cửa hàng (`Store`) và Quản lý cửa hàng (`SHOP_MANAGER`) là nội bộ doanh nghiệp**, chỉ do `SYSTEM_ADMIN` tạo và bổ nhiệm. **Bãi bỏ hoàn toàn** đăng ký mở shop ngoài hoặc nâng cấp từ khách hàng lên chủ shop.
   - **Cộng tác viên / KOL / KOC (`COLLABORATOR`) là lực lượng đối tác tiếp thị bên ngoài** được tuyển mộ, định danh eKYC, phân hạng bậc, ký thỏa thuận thù lao, cấp công cụ tiếp thị (Smart Link, QR, Voucher độc quyền) và quyết toán thu nhập trên Web & Mobile App.
2. **4 NHÓM CHỨC NĂNG ĐÃ BÃI BỎ VĨNH VIỄN (KHÔNG ĐƯỢC ĐƯA VÀO TÀI LIỆU/THIẾT KẾ MỚI):**
   - **Bãi bỏ hoàn toàn cơ chế gom đợt khuyến mãi đại trà cũ** *(đã có Deal thù lao độc quyền giữa KOL & Shop Manager và Quản trị giá bán có Giá sàn `floorPrice` thay thế)*.
   - **Bãi bỏ hoàn toàn Media Hub** *(đã gửi trực tiếp ảnh, video, tài liệu qua tin nhắn Chat Socket.IO)*.
   - **Bãi bỏ hoàn toàn Voucher sàn và Voucher công khai của Shop** *(chỉ giữ lại duy nhất Voucher Deal Độc Quyền gắn với KOL)*.
   - **Bãi bỏ hoàn toàn cơ chế tự đăng ký `SHOP_MANAGER`**.

---

## 👥 5 USER ROLES CHUẨN HÓA
1. **`CUSTOMER`**: Khách mua hàng xác thực tài khoản (`Customer` — `SalesOrder`), áp mã Voucher Deal độc quyền của KOL, theo dõi đơn GHN, đổi trả trong 14 ngày.
2. **`COLLABORATOR`**: Cộng tác viên / KOL / KOC (Web + Mobile App): nộp eKYC, đàm phán Deal với Shop Manager, nhận file/ảnh/video qua Chat, xin mẫu thử SLA 14 ngày, sinh Link/QR/Voucher độc quyền, theo dõi minh bạch từng giỏ tiền thù lao và rút tiền.
3. **`SHOP_MANAGER`**: Nhân sự quản lý cửa hàng nội bộ (do Admin tạo): quản lý `Product` & `ProductVariant` có khóa ngành hàng và **Giá sàn thấp nhất (`floorPrice`)**, duyệt mẫu thử, đàm phán Deal thù lao với KOL (`<= 16%` tự duyệt; `> 16%` chuyển Admin duyệt).
4. **`SYSTEM_MANAGER`**: Chuyên viên vận hành & kế toán: duyệt eKYC của KOL, duyệt sản phẩm mới, xử lý đổi trả 1-1 vs hoàn tiền thu hồi thù lao (`Clawback`), đối soát và giải ngân rút tiền hàng ngày (khấu trừ `10%` thuế TNCN).
5. **`SYSTEM_ADMIN`**: Quản trị tối cao / Tổng giám đốc: tạo Store & cấp tài khoản `SHOP_MANAGER`/`SYSTEM_MANAGER`, phê duyệt bắt buộc các **Deal thù lao `> 16%` (trần tối đa `25%`)**, cấu hình `CommissionRule`, giám sát Sổ cái & Executive Financial Dashboard.

---

## 💰 CƠ CHẾ TÍNH TIỀN & GIẢI NGÂN 2 GIAI ĐOẠN (MAX TRẦN 25% — KHÔNG CỘNG DỒN DEAL VỚI BẬC)
1. **Thù lao Tiêu chuẩn trả trước sau 14 ngày (`10% Gốc + Bậc KOL`):**
   - Gốc `10%` + Bậc KOL (**Đồng `+0%` = 10%**, **Bạc `+1%` = 11%**, **Vàng `+2%` = 12%**, **Kim Cương `+3%` = 13%**).
   - Chờ hết hạn **14 ngày trả hàng** của đơn giao thành công là mở khóa ngay sang **Số dư khả dụng được rút**.
2. **Thỏa thuận Deal Độc quyền 2 chiều (`Exclusive Deal` giữa KOL & Shop Manager):**
   - `<= 16%`: `SHOP_MANAGER` tự duyệt; `> 16%` đến trần `25%`: bắt buộc qua `SYSTEM_ADMIN` duyệt.
   - **Không cộng dồn với Bậc KOL:** Phần tiền treo chờ đạt KPI được tính bằng đúng **`Deal% - (10% + Bậc%)`**. Chỉ khi KOL đạt đủ KPI cam kết (và đơn hàng đã qua 14 ngày không hoàn trả) mới giải ngân phần chênh lệch này về ví khả dụng.
3. **Tính năng Phụ trợ (`Auxiliary` — Không làm luồng chính):**
   - **Thưởng mốc doanh số tháng (`FR-09`)** và **Livestream (`+2%`, tổng không vượt `25%`)** chỉ đóng vai trò phụ trợ, chỉ nhắc tới bổ sung chứ không làm workflow chính.
