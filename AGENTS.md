# SCANMS PROJECT RULES & DESIGN SYSTEM MEMORY

## ⚠️ CRITICAL BRAND & COLOR SYSTEM: VÀNG BE (WARM SAND & GOLD)
> **Tuyệt đối tuân thủ:** Tông màu chủ đạo duy nhất của toàn bộ hệ thống SCANMS là **VÀNG BE (WARM SAND & BRAND GOLD)**. 
> **NGHIÊM CẤM:** Không được sử dụng màu xanh lá (Emerald / Teal / Mint `#0F766E` / `#0D5C52` / `#EDF7F4`) làm màu chủ đạo, màu nền hay màu nút bấm thương hiệu! Màu xanh lá trong một số file thiết kế cũ là chưa sửa xong.

---

### 🎨 BẢNG MÃ MÀU CHUẨN (ATOMIC TOKENS)

| Token Name | Hex Code | Ý Nghĩa / Vị Trí Áp Dụng |
| :--- | :--- | :--- |
| **`canvas`** | `#FAF8F5` | Nền toàn bộ trang web (Soft Warm Cream) |
| **`surface-sand`** | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ (Warm Sand) |
| **`surface-white`** | `#FFFFFF` | Nền thẻ Card chính, ô form, modal |
| **`brand`** | `#C59B58` | Nút bấm chính ("Đăng nhập an toàn", "Đặt mua ngay"), CTA chính |
| **`brand-strong`** | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, viền active, hover của nút |
| **`brand-soft`** | `#FBF5EB` | Nền pill badge, nền thông báo ưu đãi, box giảm giá |
| **`brand-border`** | `#EEDFC6` | Viền badge ưu đãi, viền hộp giảm giá |
| **`brand-dark`** | `#231D15` | Nút phụ tối màu sang trọng, thanh header tối |
| **`line` / `border`** | `#EAE4D7` | Đường kẻ phân cách, viền ô nhập liệu (Input), viền thẻ Card |
| **`ink`** | `#1A1612` | Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính |
| **`muted`** | `#7D715E` | Màu chữ phụ, mô tả, chú thích, nhãn phụ |
| **`danger`** | `#DC2626` | Trạng thái lỗi, cảnh báo vi phạm |
| **`success`** | `#059669` | Chỉ dùng cho icon tick xanh xác minh hoặc % tăng trưởng nhỏ, **KHÔNG LÀM MÀU CHỦ ĐẠO NỀN/NÚT** |

---

### 🏛️ BẢN SẮC NỀN TẢNG (PLATFORM IDENTITY)
1. **SCANMS** là **Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác (Multi-Merchant & Affiliate Network)**.
2. Đây là nền tảng kết nối **NHIỀU Gian Hàng (Shops)** quản lý hàng hóa với **NHIỀU Nhà Sáng Tạo (KOL/KOC)** quảng bá sản phẩm.
3. Không được biến website thành trang bán hàng riêng của một hãng đơn lẻ (như "Sora Skin"). Sora Skin chỉ là một trong nhiều gian hàng đối tác kinh doanh trên sàn SCANMS.
4. Header công khai luôn mang thương hiệu **SCANMS**, có đầy đủ cổng đăng nhập cho Đối tác (`/login`) và nút quay lại trang mua hàng.

---

### 👥 5 USER ROLES & MA TRẬN PHÂN QUYỀN
1. **`CUSTOMER`**: Khách mua hàng, theo dõi đơn GHN, gửi khiếu nại đổi trả.
2. **`COLLABORATOR`**: KOL / KOC tiếp thị, sinh Smart Link / Dynamic QR / Coupon, xin mẫu thử, nhận hoa hồng.
3. **`SHOP_MANAGER`**: Chủ shop, quản lý sản phẩm 6 khối, duyệt hàng mẫu, đàm phán deal VIP, quản lý đơn hàng.
4. **`SYSTEM_MANAGER`**: Chuyên viên vận hành sàn: Duyệt KYC, duyệt sản phẩm mới, trọng tài hàng mẫu, xử lý khiếu nại hoàn tiền.
5. **`SYSTEM_ADMIN`**: Quản trị tối cao: Toàn quyền của System Manager + Độc quyền Quản lý User/Phân quyền & Executive Dashboard.

---

### 💰 MA TRẬN 5 LOẠI HOA HỒNG (MAX TRAN 25%)
1. **Hoa hồng gốc (Base Rate)**: 10% chuẩn sàn Open Offer.
2. **Hoa hồng cấp bậc (Tier Bonus)**: Bạc +1%, Vàng +2%, Kim Cương +3%.
3. **Hoa hồng Deal độc quyền 2 chiều**: Collab đề xuất Proposal với Shop OR Shop mời Top KOL qua Chat Socket.IO.
4. **Hoa hồng Livestream**: +2% đến +3% trong phiên Live.
5. **Thưởng mốc doanh số tháng (FR-09)**: Lũy tiến theo bậc doanh số tháng.
