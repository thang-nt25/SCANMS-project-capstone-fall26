# API CONTRACT SPECIFICATION (RESTFUL & OPENAPI)
## Project Name: InfluxNet - KOL & Sales Collaborator Management Platform
**Base URL:** `https://api.influxnet.vn/api/v1`  
**Authentication Header:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
**Document Version:** 1.0.0 (Enterprise Schema Support)

---

## 1. GENERAL HTTP STATUS CODES & ROLES

| Code | Status | Description |
| :--- | :--- | :--- |
| **200** | OK | Thao tác truy vấn hoặc cập nhật thành công. |
| **201** | Created | Khởi tạo tài nguyên mới thành công (User, Order, Link, Payout, Chat). |
| **400** | Bad Request | Dữ liệu đầu vào sai định dạng hoặc vi phạm ràng buộc DTO validation. |
| **401** | Unauthorized | Token JWT hết hạn hoặc không hợp lệ. |
| **403** | Forbidden | Không đủ thẩm quyền vai trò (Role-Based Access Denied). |
| **404** | Not Found | Không tìm thấy tài nguyên yêu cầu. |
| **409** | Conflict | Trùng lặp dữ liệu (Email đã tồn tại, Coupon Code đã được dùng). |
| **500** | Internal Server Error | Lỗi xử lý mã nguồn hoặc giao dịch CSDL hệ thống. |

**Allowed Roles (`role`):** `SYSTEM_ADMIN`, `SYSTEM_MANAGER`, `SHOP_MANAGER`, `SHOP_STAFF`, `COLLABORATOR`

---

## 2. MODULE 1: AUTHENTICATION, KYC & CHANNELS

### 2.1 `POST /auth/register` (Đăng ký tài khoản)
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "kol_nguyenvana@gmail.com",
    "password": "SecurePassword123!",
    "full_name": "Nguyễn Văn A",
    "role": "COLLABORATOR",
    "phone_number": "0987654321"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "message": "Đăng ký tài khoản thành công",
    "data": {
      "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "kol_nguyenvana@gmail.com",
      "role": "COLLABORATOR"
    }
  }
  ```

### 2.2 `POST /collaborators/kyc` (Cập nhật hồ sơ KYC Ngân hàng & Kênh MXH)
- **Access:** Collaborator Only
- **Request Body (JSON):**
  ```json
  {
    "id_card_number": "001098012345",
    "tax_code": "8492019201",
    "bank_name": "MBBank",
    "bank_account_number": "999988886666",
    "bank_account_name": "NGUYEN VAN A",
    "social_channels": [
      {
        "platform_name": "TIKTOK",
        "channel_name": "@kol_nguyenvana",
        "channel_url": "https://www.tiktok.com/@kol_nguyenvana",
        "follower_count": 150000,
        "is_primary": true
      },
      {
        "platform_name": "THREADS",
        "channel_name": "@kol_nguyenvana",
        "channel_url": "https://threads.net/@kol_nguyenvana",
        "follower_count": 25000,
        "is_primary": false
      }
    ]
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Cập nhật hồ sơ KYC và danh sách Kênh MXH thành công. Trạng thái: VERIFIED"
  }
  ```

---

## 3. MODULE 2: SAMPLE PRODUCT REQUESTS & MEDIA HUB

### 3.1 `POST /sample-requests` (KOL xin hàng mẫu dùng thử)
- **Access:** Collaborator Only
- **Request Body (JSON):**
  ```json
  {
    "product_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "shipping_address": "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "message": "Gửi yêu cầu nhận hàng mẫu thành công",
    "data": {
      "request_id": "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
      "status": "PENDING"
    }
  }
  ```

### 3.2 `POST /sample-requests/:id/approve` (Shop Manager duyệt gửi hàng mẫu)
- **Access:** Shop Manager Only
- **Request Body (JSON):**
  ```json
  {
    "tracking_number": "GHTK-99882211"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Phê duyệt gửi hàng mẫu thành công và đã cập nhật Mã vận đơn"
  }
  ```

---

## 4. MODULE 3: IN-APP CHAT REALTIME (SOCKET.IO & REST)

### 4.1 `POST /chat/conversations` (Tạo cuộc trò chuyện Shop <-> KOL)
- **Access:** Shop Manager / Collaborator
- **Request Body (JSON):**
  ```json
  {
    "target_user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "conversation_id": "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c"
    }
  }
  ```

### 4.2 `POST /chat/messages` (Gửi tin nhắn Chat)
- **Access:** Authenticated Users
- **Request Body (JSON):**
  ```json
  {
    "conversation_id": "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c",
    "message_text": "Chào Shop, mình muốn làm video review cho chiếc áo mẫu vừa nhận được nhé!",
    "media_url": "https://storage.influxnet.vn/chat/script_preview.png"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "message": "Tin nhắn đã gửi thành công"
  }
  ```

---

## 5. MODULE 4: ORDERS & REFUND REVERSAL WEBHOOK

### 5.1 `POST /orders/webhook` (Webhook nhận đơn hàng kèm Danh sách Món)
- **Access:** System / E-commerce Hook (Protected by Webhook Secret)
- **Request Body (JSON):**
  ```json
  {
    "store_id": "f1e2d3c4-b5a6-7f8e-9d0c-1b2a3f4e5d6c",
    "external_order_sn": "ORD-20260722-9988",
    "subtotal_amount": 1500000.00,
    "discount_amount": 100000.00,
    "final_amount": 1400000.00,
    "coupon_code": "KOLA10",
    "cookie_ref_code": "ref_a9k2",
    "items": [
      {
        "product_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "quantity": 2,
        "unit_price": 500000.00,
        "commission_rate": 10.00
      }
    ]
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Ghi nhận đơn hàng và phân bổ hoa hồng chi tiết món thành công"
  }
  ```

### 5.2 `POST /orders/:id/refund` (Shop Manager xác nhận Trả hàng & Hủy hoa hồng)
- **Access:** Shop Manager Only
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Xác nhận đơn hàng bị hoàn trả. Hoa hồng PENDING đã chuyển sang REVERSED và trừ Ví Chờ thành công."
  }
  ```

---

## 6. MODULE 5: SETTLEMENT & PAYOUT ENGINE

### 6.1 `POST /payouts/approve` (Shop Manager duyệt lệnh rút & Tải ảnh Bill)
- **Access:** Shop Manager Only
- **Request Body (JSON):**
  ```json
  {
    "payout_request_ids": [
      "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a"
    ],
    "proof_image_url": "https://storage.influxnet.vn/proofs/bill_20260722_99.png",
    "bank_ref_code": "FT2620391823"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Phê duyệt yêu cầu rút tiền và cập nhật minh chứng chuyển khoản thành công",
    "data": {
      "approved_count": 1,
      "export_bank_file_url": "https://api.influxnet.vn/api/v1/payouts/export/batch_20260722.csv"
    }
  }
  ```

---
*Tài liệu API Contract v1.0.0 Enterprise Specification thuộc dự án InfluxNet.*
