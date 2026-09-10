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
