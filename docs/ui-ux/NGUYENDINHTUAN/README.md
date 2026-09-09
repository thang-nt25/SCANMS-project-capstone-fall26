# SCANMS UI/UX Prototype — Hệ thống Quản lý CTV & Tiếp thị Liên kết

> **Dự án:** SCANMS (Mã đề tài: FA26SE032)  
> **Tác giả UI/UX:** Nguyễn Đình Tuấn  
> **Phiên bản:** 2.1.0 (Clean Architecture & Modular Structure)

---

## 1. Hướng dẫn Khởi chạy Prototype

Prototype được xây dựng độc lập bằng chuẩn Web hiện đại (HTML5, Vanilla CSS3, Native ES Modules), không phụ thuộc nặng vào thư viện ngoài, giúp xem và kiểm thử trực quan 15 màn hình nghiệp vụ một cách mượt mà.

### Khởi chạy máy chủ cục bộ (Local Server):
```bash
cd docs/ui-ux/NGUYENDINHTUAN
node serve.mjs
```
Truy cập trên trình duyệt: **`http://127.0.0.1:4173/`**

---

## 2. Cấu trúc Thư mục Tối giản & Khoa học

Thư mục đã được tinh chỉnh, loại bỏ các file rác/ảnh trùng lặp và gom nhóm logic chuẩn mực:

```
docs/ui-ux/NGUYENDINHTUAN/
├── assets/                    # Tài nguyên hình ảnh tối ưu
│   └── serum-hero-optimized.jpg  # Ảnh sản phẩm chủ lực (58 KB)
├── css/                       # Hệ thống Stylesheet phân tầng
│   ├── styles.css             # Design tokens, base layout, sidebar, components
│   ├── dashboard.css          # Giao diện Tổng quan KOL, biểu đồ, KPI, cấp bậc
│   └── links.css              # Giao diện Tạo Link & QR, máy tính hoa hồng, coupon
├── js/                        # Mã nguồn Javascript Logic (ES Modules)
│   ├── app.js                 # Router trung tâm, mock data, chuyển đổi 15 màn hình
│   ├── dashboard.js           # Logic dashboard KOL, bộ lọc ngày, rút tiền, biểu đồ
│   └── links.js               # Logic tạo link, canvas QR code, coupon engine
├── vendor/                    # Thư viện ngoài nhỏ gọn
│   └── qrcode.js              # Bộ sinh mã QR canvas chuẩn
├── index.html                 # Điểm vào chính của ứng dụng prototype
├── serve.mjs                  # Máy chủ tĩnh Node.js cực nhẹ (Zero-dependency)
└── README.md                  # Tài liệu tổng hợp toàn diện (Tài liệu này)
```

---

## 3. Danh sách 15 Màn hình & Mapping Yêu cầu Nghiệp vụ (FR)

| STT | Màn hình Prototype | Mã chức năng (SRS) | Trọng tâm nghiệp vụ |
|:---:|:---|:---|:---|
| 01 | **Đăng nhập** | FR-01, FR-02, FR-03 | Đăng nhập đa vai trò (CTV/KOL, Chủ Shop, Quản trị viên) |
| 02 | **Tổng quan KOL (Dashboard)** | FR-05, FR-32, FR-33 | 4 KPI Cards, Hạng Vàng, Việc cần làm, Biểu đồ hiệu suất, Rút tiền KYC |
| 03 | **Link và QR tiếp thị** | FR-10, FR-11, FR-12, FR-13, FR-14 | Tạo tracking link, QR độ nét cao, Máy tính hoa hồng, Kiểm tra mã giảm giá |
| 04 | **Kênh mạng xã hội** | FR-04 | Quản lý đa kênh (TikTok, Facebook, Instagram, YouTube, Zalo) |
| 05 | **Kho nội dung (Media Hub)** | FR-08 | Tải bộ ảnh mẫu, video review, copy caption tiếp thị chuẩn SEO |
| 06 | **Hàng mẫu** | FR-30 | Quy trình đăng ký nhận mẫu thử miễn phí cho KOL |
| 07 | **Ví của tôi & Sổ cái** | FR-21, FR-22, FR-23, FR-24, FR-25, FR-26 | Theo dõi số dư khả dụng, chờ đối soát, lịch sử giao dịch và thuế TNCN |
| 08 | **Tổng quan Shop** | FR-09, FR-32, FR-34 | Quản trị viên shop theo dõi doanh thu tổng, đội ngũ CTV và đơn chờ duyệt |
| 09 | **Danh mục sản phẩm** | FR-06, FR-07 | Thiết lập % hoa hồng cơ bản và hoa hồng bậc thang cho từng mặt hàng |
| 10 | **Đối soát đơn hàng** | FR-19, FR-20, FR-21, FR-22, FR-23 | Đối soát đơn thành công, phát hiện đơn hủy hoàn, tự động tính hoa hồng |
| 11 | **Duyệt chi trả (Payouts)** | FR-24, FR-26, FR-27, FR-28 | Phê duyệt lệnh rút tiền, tạo ủy nhiệm chi ngân hàng tự động |
| 12 | **Tin nhắn & Hỗ trợ** | FR-29, FR-31 | Kênh trao đổi trực tiếp giữa Shop và CTV/KOL |
| 13 | **Trang mua hàng (Storefront)** | FR-15, FR-16 | Landing page bán hàng ghi nhận cookie tiếp thị (Last-Click Attribution) |
| 14 | **Tra cứu đơn hàng** | FR-17, FR-18 | Người mua kiểm tra tiến độ giao hàng GHN/GHTK và đánh giá sản phẩm |
| 15 | **AI Fraud Sentinel** | FR-14, FR-35 | Phát hiện gian lận click ảo, tự mua hàng nhận hoa hồng, audit log bảo mật |

---

## 4. Design System & Design Tokens

### Bảng màu chuẩn (Fintech Emerald Palette)
* **Canvas (Nền):** Light `#F4F7F6` | Dark `#0D1514`
* **Surface (Thẻ/Modal):** Light `#FFFFFF` | Dark `#14201E`
* **Ink (Chữ chính):** Light `#13201D` | Dark `#EDF5F2`
* **Muted (Chữ phụ):** Light `#65736F` | Dark `#A4B7B2`
* **Brand (Chủ đạo):** Light `#126B5F` | Dark `#59B9A7`
* **Warning (Chờ đối soát):** Light `#A35E05` | Dark `#EFB354`
* **Danger (Lỗi / Fraud):** Light `#B83A42` | Dark `#ED7E84`

### Quy tắc Bo góc (Radii)
* Card / Container: `14px`
* Input / Button: `9px`
* Badge / Tag: `6px`
* Avatar: Hình tròn `50%`

---

## 5. Hướng dẫn Handoff sang Figma & Lập trình Production

1. **Frame đề xuất trong Figma:**
   * Desktop frame: `1440 x 1024` (12-column grid, sidebar 246px).
   * Mobile frame: `390 x 844` (Single column, bottom navigation 68px).
2. **Triển khai Production (React 19 + NestJS):**
   * Chuyển các module Javascript (`js/dashboard.js`, `js/links.js`) thành các React Functional Components & Custom Hooks.
   * Tích hợp API NestJS qua TanStack Query (React Query) và Prisma ORM.
   * Dữ liệu hình ảnh được lưu trữ an toàn trên Supabase Storage CDN.
