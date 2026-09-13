# SCANMS — UI/UX DESIGN SPECIFICATIONS FOR FR-25, FR-26, FR-27
## Mẫu Thử Sản Phẩm (FR-25), Nhắn Tin Trực Tuyến (FR-26) & Thẻ Mời Chiến Dịch VIP (FR-27)
> **Tác giả UI/UX & Triển khai:** Nguyễn Phú Quý (NGUYENPHUQUY)  
> **Mã đề tài:** FA26SE032 (SCANMS)  
> **Ngôn ngữ thiết kế:** Vàng Be & Hổ Phách (Warm Sand, Cream & Brand Amber/Gold) — Pure Tailwind CSS

---

# 1. TỔNG QUAN HỆ THỐNG VÀ CHIẾN LƯỢC TRẢI NGHIỆM

Bộ 3 phân hệ **FR-25, FR-26, FR-27** tạo nên chiếc cầu nối tương tác trực tiếp, mật thiết giữa **Nhà Bán Hàng (Shop Manager)** và **Người Sáng Tạo Nội Dung (KOL/Collaborator)**:

```
 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │   FR-25: MẪU THỬ SẢN PHẨM │      │  FR-26: TRÒ CHUYỆN REALTIME│      │ FR-27: MỜI CHIẾN DỊCH VIP │
 │  KOL nhận mẫu thử thực tế │ ───> │  Trao đổi kịch bản, chốt  │ ───> │ Shop gửi thẻ mời mạ vàng  │
 │  để test & làm video review│      │  hợp tác, gửi card đính kèm│     │  với +% hoa hồng thưởng   │
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

---

# 2. BẢNG MÀU & TOKENS THIẾT KẾ (DESIGN SYSTEM)

| Token | Mã màu Hex | Class Tailwind | Ý nghĩa & Vị trí áp dụng |
|---|---|---|---|
| **Gold Primary** | `#f59e0b` / `#d97706` | `amber-500` / `amber-600` | Màu chủ đạo nút bấm, huy hiệu VIP, viền thẻ chiến dịch |
| **Gold Shimmer** | `linear-gradient` | `from-amber-400 via-yellow-400 to-amber-600` | Hiệu ứng mạ vàng lấp lánh trên Thẻ Mời Chiến Dịch VIP |
| **Cream Light** | `#fffbeb` / `#fef3c7` | `amber-50` / `amber-100` | Nền bong bóng tin nhắn thẻ, hover card |
| **Emerald Success**| `#10b981` | `emerald-500` | Trạng thái Chấp nhận (Accepted), Duyệt mẫu thử (Approved) |
| **Rose Danger** | `#f43f5e` | `rose-500` | Trạng thái Từ chối (Rejected), Hủy yêu cầu |
| **Slate Dark** | `#0f172a` / `#1e293b` | `slate-900` / `slate-800` | Chế độ Dark mode, khung chat chuyên nghiệp |

---

# 3. CHI TIẾT ĐẶC TẢ TỪNG MÀN HÌNH (SCREEN SPECIFICATIONS)

## 3.1. Màn hình 01: Quản Lý Mẫu Thử KOL (KOL Sample Request Page — `/app/samples`)
- **Header**: Thanh tiêu đề với huy hiệu số lượng mẫu đang chờ giao, nút "Khám phá sản phẩm mẫu".
- **Product Sample Grid**: Thẻ sản phẩm với ảnh sắc nét, tên shop, giá gốc, mức hoa hồng dự kiến và nút "Xin Mẫu Thử".
- **Request Modal**:
  - Tự động điền thông tin người nhận (Họ tên, SĐT).
  - Chọn địa chỉ giao hàng và ô nhập ghi chú kế hoạch truyền thông.
- **Tracking Drawer / Tabs**: Bảng theo dõi các đơn hàng mẫu với mã bưu cục (GHTK, VNPost) và trạng thái giao vận.

## 3.2. Màn hình 02: Khung Chat Trực Tuyến Thời Gian Thực (Chat Box Portal — `/app/chat`)
- **Sidebar danh sách hội thoại**:
  - Avatar đại diện, tên người liên hệ, tag vai trò (`Shop` hoặc `KOL`).
  - Badge thông báo số tin nhắn chưa đọc màu đỏ neon (`bg-rose-500 animate-pulse`).
- **Main Chat Canvas**:
  - Header với trạng thái Online/Offline, nút gọi nhanh hoặc mở hồ sơ.
  - Khung tin nhắn tự động cuộn (Auto-scroll to bottom).
  - **Dynamic Card Bubbles**:
    - `SAMPLE_CARD`: Hiển thị ảnh sản phẩm mẫu, mã yêu cầu và trạng thái duyệt.
    - `CAMPAIGN_INVITE`: Thẻ mạ vàng VIP với huy hiệu vương miện, tỷ lệ hoa hồng thưởng thêm (+7.5%), thời hạn và 2 nút hành động "Chấp Nhận" / "Từ Chối".
- **Composer & Toolbar**:
  - Ô nhập liệu đa dòng tự dãn chiều cao.
  - Phím tắt đính kèm: Nút gửi Thẻ Mời VIP (`SendVipCampaignModal`), gửi ảnh, gửi icon emoji.

## 3.3. Màn hình 03: Chiến Dịch Tiếp Thị Độc Quyền KOL (`/app/campaigns`)
- **Stats Counter**: Tổng số chiến dịch VIP đang tham gia, hoa hồng thưởng tích lũy, số lời mời đang chờ phản hồi.
- **Filter Tabs**: `Tất cả`, `Lời mời chờ duyệt (Pending)`, `Đã tham gia (Accepted)`, `Đã từ chối (Rejected)`.
- **Campaign Cards**: Thẻ chiến dịch chi tiết với thời hạn áp dụng, tên gian hàng, tỷ lệ thưởng thêm và nút "Mở Chat với Shop".

---

# 4. CHUẨN MỰC TƯƠNG TÁC (MICRO-INTERACTIONS)
1. **Gold Pulse Effect**: Khi Thẻ Mời VIP xuất hiện trong chat, viền thẻ phát sáng vàng kim nhấp nháy nhẹ 3 lần để thu hút ánh nhìn của KOL.
2. **Instant Status Transition**: Khi KOL bấm "Chấp Nhận", nút bấm lập tức chuyển thành hiệu ứng Loading nhẹ và đổi sang Badge "Đã tham gia VIP (Accepted)" mà không cần tải lại trang.
3. **Real-time Badge Sync**: Badge tin nhắn chưa đọc trên Sidebar tự động giảm về 0 ngay khi người dùng chọn vào hội thoại.
