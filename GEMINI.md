# SCANMS SYSTEM INSTRUCTIONS & IMMUTABLE MEMORY

> ⚠️ **LƯU Ý QUAN TRỌNG VỀ BỘ NHỚ VĨNH VIỄN:**  
> File này lưu trữ các chỉ thị bất biến của dự án SCANMS (FA26SE032). Mọi tương tác, lập trình Frontend/Backend, cập nhật tài liệu hoặc thiết kế UI **BẮT BUỘC PHẢI TUÂN THỦ 100%**, không được làm trái trong bất kỳ hoàn cảnh nào.

---

## 1. 🎨 HỆ THỐNG MÀU SẮC CHỦ ĐẠO TỐI THƯỢNG: VÀNG BE (WARM SAND & BRAND GOLD)

### ❌ ĐIỀU CẤM TUYỆT ĐỐI:
- **NGHIÊM CẤM:** **KHÔNG BAO GIỜ** được sử dụng màu **XANH LÁ CÂY (Emerald / Teal / Mint `#0F766E`, `#10B981`, `#0D5C52`, `#EDF7F4`,...)** làm màu chủ đạo, màu nền, màu thanh header hay màu nút bấm thương hiệu!
- **Lý do:** Màu xanh lá trong một số file ảnh xuất Figma cũ là bản vẽ nháp chưa sửa xong của nhóm. Màu sắc thương hiệu chính thức đã được Leader Nguyễn Thành Thắng chốt là **VÀNG BE**.
- Màu xanh lá chỉ được dùng duy nhất cho:
  - Icon tick xác minh nhỏ (`CheckCircle` $14\text{px}$)
  - Chỉ số % tăng trưởng tài chính dương nhỏ (`+12.4%`)
  - **TUYỆT ĐỐI KHÔNG DÙNG CHO NỀN, HEADER, SIDEBAR, HOẶC NÚT BẤM (BUTTON/CTA)**.

### ✅ BẢNG MÃ MÀU CHUẨN ĐƯỢC PHÉP SỬ DỤNG (WARM SAND GOLD TOKENS):
| Token CSS / Tailwind | Hex Code | Ý Nghĩa / Vị Trí Bắt Buộc |
| :--- | :--- | :--- |
| `--canvas` | `#FAF8F5` | Nền toàn bộ website (Soft Warm Cream) |
| `--surface-sand` | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ, bộ lọc (Warm Sand) |
| `--surface` | `#FFFFFF` | Nền thẻ Card chính, ô form, modal |
| `--brand` | `#C59B58` | Nút bấm chính ("Đăng nhập an toàn", "Đặt mua ngay", "Thêm vào giỏ"), CTA chính |
| `--brand-strong` | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, trạng thái active, viền nút khi hover |
| `--brand-soft` | `#FBF5EB` | Nền badge ưu đãi, nền pill hoa hồng KOL, box giảm giá |
| `--brand-border` | `#EEDFC6` | Viền badge ưu đãi, viền hộp thông tin |
| `--brand-dark` | `#231D15` | Nút phụ sang trọng (Dark Accent), thanh header tương phản cao |
| `--line` / `--border` | `#EAE4D7` | Đường kẻ phân cách, viền ô nhập liệu (Input), viền thẻ Card |
| `--ink` | `#1A1612` | Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính (Deep Ink) |
| `--muted` | `#7D715E` | Màu chữ phụ, mô tả, chú thích, nhãn phụ (Warm Muted) |
| `--warning` | `#D97706` | Trạng thái Chờ xử lý (Pending) / Cảnh báo |
| `--danger` | `#DC2626` | Trạng thái lỗi, từ chối, cảnh báo vi phạm |

---

## 2. 🏛️ BẢN SẮC KIẾN TRÚC SÀN ĐA GIAN HÀNG (MULTI-MERCHANT MARKETPLACE)

### ❌ KHÔNG ĐƯỢC LÀM:
- **KHÔNG ĐƯỢC BIẾN WEBSITE THÀNH TRANG BÁN HÀNG CỦA 1 CỬA HÀNG ĐƠN LẺ** (Ví dụ không biến toàn bộ web thành cửa hàng của Sora Skin).

### ✅ QUY TẮC CỐT LÕI:
1. **SCANMS** là **Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác (Sales Collaborator & Affiliate Network Management System)**.
2. Nền tảng kết nối **NHIỀU Gian Hàng Đối Tác (Merchants/Shops)** như `Sora Skin Official`, `Aura Bio Cosmetics`, `GreenBio Health & Herbs`, `Lumière Lab`... với **NHIỀU Nhà Sáng Tạo (KOL/KOC)** để đẩy số và nhận hoa hồng.
3. Header trang công khai luôn mang thương hiệu **SCANMS**, có:
   - Thanh tìm kiếm sản phẩm và gian hàng xuyên suốt toàn sàn.
   - Nút giỏ hàng nhanh và mua hàng cho khách vãng lai (Guest).
   - Nút dẫn vào Cổng Đối Tác (`/login`, `/register`) cho KOL/Chủ Shop/Admin.
   - Nút quay lại Cửa hàng khi đang ở trang đăng nhập (`/login`).
4. Mỗi sản phẩm trên sàn bắt buộc phải hiển thị rõ:
   - **Tên gian hàng cung cấp** (Ví dụ: `🏪 Sora Skin Official`, `🏪 Aura Bio Cosmetics`).
   - **Mức hoa hồng dành cho CTV/KOL** (Ví dụ: `Hoa hồng CTV: 22% (~91.000 ₫)`).

---

## 3. 👤 THÔNG TIN VAI TRÒ & PHÂN CÔNG THÀNH VIÊN
- **User:** **Nguyễn Thành Thắng** - Team Leader dự án SCANMS (FA26SE032).
- **Phạm vi chức năng của Thắng:** **FR-01 đến FR-08**:
  - `FR-01`: Đăng ký tài khoản đa vai trò (KOL, Shop, Admin) + mã hóa mật khẩu Argon2.
  - `FR-02`: Đăng nhập an toàn + JWT Access/Refresh tokens + Rate Limiting.
  - `FR-03`: Xác thực 2 bước (2FA OTP) + Khôi phục mật khẩu qua Email.
  - `FR-04`: Phân quyền người dùng theo vai trò (RBAC Guard).
  - `FR-05`: Nộp hồ sơ định danh điện tử (KYC cá nhân & pháp nhân doanh nghiệp).
  - `FR-06`: Xét duyệt hồ sơ KYC đa cấp (System Admin & Shop Manager).
  - `FR-07`: Quản lý danh mục & liên kết tài khoản Mạng xã hội của KOL (TikTok, FB, YouTube...).
  - `FR-08`: Kho nội dung số tập trung (Media Hub) chia sẻ tài nguyên quảng bá.

---

## 4. 📐 TIÊU CHUẨN THIẾT KẾ & VẬN HÀNH TMĐT THỰC TẾ (REAL-WORLD E-COMMERCE GOVERNANCE)

> ⚠️ **BỘ QUY TẮC NGHIỆP VỤ & TRẢI NGHIỆM NGƯỜI DÙNG BẮT BUỘC:**

1. **Nghiệp vụ Tài chính, Ví & Duyệt Chi trả (Payout):**
   - **Tính toàn vẹn dữ liệu kế toán:** Khi duyệt chi trả hoa hồng (`payoutService.approve/reject`), nếu API backend trả về lỗi, **TUYỆT ĐỐI KHÔNG ĐƯỢC NUỐT LỖI** (`catch (err) { console.warn }`), không được tự động sinh mã ngân hàng giả (`MBB...`) để ép trạng thái sang `APPROVED`. Bắt buộc phải thông báo lỗi đỏ rõ ràng và giữ nguyên trạng thái `PENDING`.
   - **Cơ chế Nạp tiền Ví Khách hàng:** Duy trì tính năng "Nạp tiền Sandbox / Demo" trong môi trường phát triển để phục vụ kiểm thử đặt hàng, luân chuyển dòng tiền và thử nghiệm chính sách Hoàn tiền đổi trả (`ORDER_REFUND`). Giao diện nạp tiền phải phân định rõ ràng giữa chế độ Thử nghiệm và Cổng thanh toán chính thức (VietQR / PayOS).

2. **Xử lý Trang Chi tiết Sản phẩm 404 (Không Fallback Lừa dối):**
   - Khi người dùng truy cập một sản phẩm không tồn tại, đã bị xóa hoặc ngừng kinh doanh, **TUYỆT ĐỐI KHÔNG ĐƯỢC ÂM THẦM FALLBACK** tải sản phẩm thử nghiệm khác (`SR-VTC-15` hay sản phẩm đầu tiên trong DB) để hiển thị thay thế.
   - Bắt buộc phải hiển thị trang thông báo chuẩn mực: *"Sản phẩm không tồn tại hoặc đã ngừng kinh doanh"* kèm nút điều hướng *"Khám phá các sản phẩm khác trên SCANMS"*.

3. **Phòng Livestream (Tính chân thực & Màn hình Kết thúc Phiên Live):**
   - **Loại bỏ bình luận ảo:** Không sử dụng `setInterval` tự động random bắn tin nhắn bot chốt đơn ảo.
   - **Màn hình Kết thúc (Ended Stream Overlay):** Khi phiên live có trạng thái `ENDED`, bắt buộc phải hiển thị màn hình kết thúc chuyên nghiệp (hiển thị thời lượng live, số người đã xem, tổng kết ưu đãi) và khóa khung chat / ghim deal, kèm nút "Ghé thăm gian hàng" hoặc "Xem các phiên Live đang diễn ra". Không để khán giả vào phòng live tối đen mà vẫn thao tác được.

4. **Bố cục Form Thêm / Cập nhật Sản phẩm của Shop Manager (`ProductManagementPage.tsx`):**
   - Bắt buộc tuân theo cấu trúc 6 khối logic tuần tự của sàn TMĐT tiêu chuẩn (Shopee Seller Centre / TikTok Shop Seller Center):
     - **Khối 1: Thông tin cơ bản** (Tên sản phẩm, Danh mục, Thương hiệu, Mô tả chi tiết rich text).
     - **Khối 2: Hình ảnh & Video sản phẩm** (Ảnh bìa 1:1, Thư viện ảnh phụ, Video sản phẩm).
     - **Khối 3: Bán hàng & Phân loại biến thể** (Bảng ma trận biến thể Màu/Size; Giá bán, Tồn kho, SKU con của từng biến thể; Tự động tính tổng tồn kho).
     - **Khối 4: Quy cách đóng gói & Vận chuyển** (Cân nặng đóng gói gram, Kích thước Dài x Rộng x Cao cm để tính phí ship GHN/GHTK).
     - **Khối 5: Chính sách KOL & Mẫu thử** (Hoa hồng 10% chuẩn sàn, Công tắc mở Open Offer, Suất cấp mẫu thử cho KOL).
     - **Khối 6: Pháp lý & Kiểm duyệt** (Xuất xứ, Thành phần, Giấy phép công bố, Hóa đơn chứng từ nguồn gốc).
   - Tuyệt đối không đặt ô "Mô tả chi tiết" ở tận đáy form, không đưa "Cấp mẫu thử" lên trước "Thông số kỹ thuật".

5. **Quản lý Đơn hàng Merchant (`OrdersManagementPage.tsx`):**
   - Bắt buộc có tab **"Chờ thanh toán" (Unpaid / Pending Payment)** để tách biệt các đơn VietQR/PayOS chưa nhận được tiền với đơn "Chờ lấy hàng" (COD hoặc đã thanh toán thành công).
   - Bổ sung tab **"Trả hàng / Hoàn tiền" (Returns / Disputes)** ngay trên thanh trạng thái đơn hàng kèm huy hiệu số lượng đơn khiếu nại cần xử lý.
   - Loại bỏ các nhãn chữ "Simulator / Tự sinh mã" lộ liễu trên modal tạo vận đơn, đảm bảo giao diện vận hành doanh nghiệp chuyên nghiệp.

6. **Báo cáo Hiệu suất KOL của Shop (`ShopKolHubPage.tsx`):**
   - Báo cáo doanh số và đơn hàng tiếp thị của từng KOL phải truy vấn từ API backend thực tế theo `collaboratorId` và `storeId`.
   - Loại bỏ hoàn toàn mảng 4 đơn hàng tĩnh hardcoded (`#SCN-99824`...) và công tắc "Đang bật số liệu mẫu" trên UI sản xuất.

7. **Trải nghiệm Giỏ hàng & Điều hướng Thông báo (Deep Linking):**
   - **Quy định Bắt buộc Tài khoản khi Mua hàng (Strict Authentication for Purchase):**
     - Khách chưa đăng nhập (Guest) **CHỈ ĐƯỢC PHÉP XEM HÀNG (Browse only)**, xem livestream, tìm kiếm sản phẩm.
     - Khi bấm "Mua ngay" hoặc "Tiến hành thanh toán", **BẮT BUỘC PHẢI CÓ TÀI KHOẢN (Đã đăng nhập)**. Hệ thống **TUYỆT ĐỐI KHÔNG HỖ TRỢ MUA ẨN DANH (No Anonymous Guest Checkout)**.
     - **Cơ chế Đăng nhập không mất giỏ hàng:** Không được redirect làm mất giỏ hàng và dữ liệu form của khách. Phải mở popup Đăng nhập nhanh tại chỗ (Quick Login / Google OAuth / OTP SMS); sau khi đăng nhập thành công, giữ nguyên 100% giỏ hàng để khách tiếp tục thanh toán ngay lập tức.
   - **Trung tâm thông báo (`NotificationDropdown.tsx`):** Bấm vào thông báo đơn hàng hoặc khiếu nại bắt buộc phải truyền `orderId` để mở trực tiếp modal hoặc trang chi tiết đơn hàng đó, không được chỉ ném người dùng vào trang danh sách tổng.

---

## 5. 👥 HỆ THỐNG 5 ROLES & MA TRẬN PHÂN QUYỀN RBAC CHUẨN MỰC (PRISMA SCHEMA & CODEBASE)

Hệ thống chuẩn hóa duy nhất **5 User Roles** (khớp 1:1 với `enum UserRole` trong `schema.prisma` và `auth.service.ts`):
1. **`CUSTOMER` (Khách mua hàng):** Duyệt Marketplace, xem livestream, mua hàng qua link/voucher tiếp thị, theo dõi vận đơn GHN, gửi yêu cầu đổi trả/hoàn tiền.
2. **`COLLABORATOR` (Cộng tác viên / KOL / KOC / Affiliate Partner):** Định danh cá nhân (CCCD, STK ngân hàng), sinh Smart Link / Dynamic QR / Coupon độc quyền, xin sản phẩm mẫu 14 ngày, đàm phán deal độc quyền với Shop, nhận hoa hồng và rút tiền Napas 24/7.
3. **`SHOP_MANAGER` (Quản lý gian hàng / Merchant):** Quản lý sản phẩm (ma trận biến thể 6 khối), cấp duyệt hàng mẫu, cấu hình mốc thưởng tháng, đàm phán deal VIP với KOL, quản lý đơn hàng GHN, đối soát hoa hồng và ví shop.
4. **`SYSTEM_MANAGER` (Chuyên viên Vận hành & Tuân thủ Sàn - Operations Specialist):**
   - Trực tiếp xử lý tác vụ vận hành sàn hằng ngày:
     - Thẩm định & Phê duyệt hồ sơ KYC cá nhân và doanh nghiệp.
     - Kiểm duyệt sản phẩm Shop mới đăng (`Product Moderation`).
     - Trọng tài phân xử hàng mẫu KOL vi phạm cam kết (`Sample Request Dispute`).
     - Giải quyết tranh chấp khiếu nại đơn hàng & trung gian Escrow (`Dispute & Mediation`).
     - Giám sát gian lận lưu lượng và đường link affiliate (`Fraud Sentinel`).
5. **`SYSTEM_ADMIN` (Quản trị viên Tối cao Hệ thống - Super Admin):**
   - **Kế thừa 100% quyền hạn của `SYSTEM_MANAGER`** (có thể thực hiện mọi thao tác vận hành).
   - **ĐỘC QUYỀN 2 CHỨC NĂNG TỐI CAO:**
     1. **Quản lý Tài khoản & Phân quyền (`/admin/users`):** Khóa/mở tài khoản, cấp quyền nhân viên, thay đổi vai trò người dùng trong hệ thống.
     2. **Executive Financial & Performance Dashboard (`/admin/analytics`):** Báo cáo Doanh số, GMV toàn sàn, biên lợi nhuận hoa hồng sàn thu về, dòng tiền Escrow tổng.

---

## 6. 💰 HỆ THỐNG 5 LOẠI HOA HỒNG & THƯỞNG ĐA TẦNG (ADDITIVE MULTI-RULE COMMISSION ENGINE)

Hệ thống tính toán hoa hồng tự động theo cơ chế cộng dồn đa tầng (`additiveCommissionRate`), với mức trần tối đa **$25\%$**:
$$\text{Final Rate} = \min\Big(25\%,\; R_{\text{base}} + R_{\text{tier}} + R_{\text{deal}} + R_{\text{campaign}} + R_{\text{live}}\Big) + \text{Bonus Thưởng Tháng}$$

1. **Hoa hồng gốc sàn (Base Rate - $10\%$):** Mức hoa hồng Open Offer mở công khai mặc định cho toàn bộ sản phẩm trên sàn SCANMS.
2. **Hoa hồng theo Cấp bậc KOL (Tier Ranking Bonus):** Tự động cộng lũy tiến theo doanh số tích lũy:
   - Hạng Bạc (Silver): $+1\%$ (Tổng $11\%$).
   - Hạng Vàng (Gold): $+2\%$ (Tổng $12\%$).
   - Hạng Kim Cương (Diamond): $+3\%$ (Tổng $13\%$).
3. **Hoa hồng Đàm phán Độc quyền 2 chiều (Exclusive Deal Negotiation):**
   - **Chiều 1 (Collab $\rightarrow$ Shop):** KOL gửi Proposal đề xuất mức VIP ($+1\%$ đến $+3\%$, hoặc mức đặc biệt) kèm cam kết doanh số và video review. Shop duyệt hoặc từ chối.
   - **Chiều 2 (Shop $\rightarrow$ Collab):** Shop chủ động lọc Top KOL từ bảng Leaderboard và gửi Thẻ mời chiến dịch độc quyền qua khung Chat Socket.IO.
4. **Hoa hồng Phiên Livestream (Live Session Bonus Rate):** Tự động cộng thêm **$+2\%$ hoặc $+3\%$** cho các sản phẩm được ghim trong giỏ Live khi phiên có trạng thái `status = LIVE`. Tự động hết hạn khi phiên Live kết thúc (`ENDED`).
5. **Thưởng Mốc Doanh Số Tháng (Monthly Revenue Bonus Milestones - FR-09):** Shop thiết lập các mốc bậc thang doanh số trong tháng (ví dụ: đạt 50tr thưởng thêm $2\%$ hoặc 1tr VNĐ; đạt 100tr thưởng $3.5\%$). Hệ thống tự động kết chuyển thưởng vào ví cuối tháng.


