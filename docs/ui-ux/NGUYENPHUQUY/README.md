# SCANMS UI/UX Prototype — Phân Hệ FR-25, FR-26, FR-27
## Mẫu Thử Sản Phẩm (FR-25), Nhắn Tin Trực Tuyến (FR-26) & Thẻ Mời Chiến Dịch VIP (FR-27)

> **Dự án:** SCANMS (Mã đề tài: FA26SE032)  
> **Tác giả UI/UX:** Nguyễn Phú Quý (NGUYENPHUQUY)  
> **Phiên bản:** 2.0.0 (Pure Tailwind CSS Architecture & Dual-Platform Support)

---

## 1. Hướng dẫn Khởi chạy Prototype

Prototype được xây dựng độc lập bằng HTML5, Tailwind CSS và Vanilla ES Modules, hiển thị sống động toàn bộ 3 màn hình nghiệp vụ trọng tâm:

### Khởi chạy máy chủ cục bộ (Local Server):
```bash
cd docs/ui-ux/NGUYENPHUQUY
node serve.mjs
```
Truy cập trên trình duyệt: **`http://127.0.0.1:4175/`**

---

## 2. Cấu trúc Thư mục

```
docs/ui-ux/NGUYENPHUQUY/
├── index.html                 # Showcase tương tác 3 màn hình FR-25, FR-26, FR-27
├── serve.mjs                  # Máy chủ Node.js độc lập (Zero-dependency)
└── README.md                  # Hướng dẫn chi tiết (Tài liệu này)
```

---

## 3. Danh sách Màn hình & Mapping Yêu cầu Nghiệp vụ (FR)

| STT | Màn hình Prototype | Mã chức năng (SRS) | Trọng tâm nghiệp vụ |
|:---:|:---|:---|:---|
| 01 | **Yêu cầu & Quản lý Mẫu Thử (Sample Requests)** | FR-25 | KOL chọn sản phẩm xin mẫu, form địa chỉ & kế hoạch review, Shop duyệt cấp mã vận đơn. |
| 02 | **Khung Chat Real-Time & Thẻ Mời VIP** | FR-26, FR-27 | Nhắn tin tức thì qua Socket.io, gửi và tương tác trực tiếp trên Thẻ Mời VIP mạ vàng hoàng kim. |
| 03 | **Chiến Dịch Tiếp Thị Độc Quyền (VIP Campaigns)** | FR-27 | KOL quản lý các lời mời tham gia chiến dịch với hoa hồng thưởng vượt khung (+5% đến +15%). |
