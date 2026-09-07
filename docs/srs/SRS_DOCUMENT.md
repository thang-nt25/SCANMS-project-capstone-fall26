# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## Project Name: InfluxNet - KOL & Sales Collaborator Management Platform
**Official Registered Code:** FA26SE032  
**Official Subtitle:** Sales Collaborator and Affiliate Network Management System  
**Document Version:** 1.0.0 (Enterprise Specification)  
**Target Jury / Faculty:** Capstone Defense Committee (FPT University)

---

## 1. INTRODUCTION

### 1.1 Purpose
Tài liệu Software Requirement Specification (SRS) v1.0.0 này quy định chi tiết toàn bộ Yêu cầu Chức năng (Functional Requirements - FR) và Yêu cầu Phi chức năng (Non-Functional Requirements - NFR) cho dự án **InfluxNet**. Tài liệu này làm căn cứ chính thức cho quy trình thiết kế CSDL (21 bảng 3NF), kiến trúc hệ thống (SAD), hợp đồng API (API Specification), phát triển mã nguồn và kiểm thử phần mềm.

### 1.2 Scope & Vision
**InfluxNet** là nền tảng quản trị mạng lưới Tiếp thị liên kết (Affiliate Marketing) và Cộng tác viên bán hàng (KOL/KOC/Sales Partner) dành cho các thương hiệu D2C và Shop bán hàng.
- **Tự động hóa đối soát tài chính:** Loại bỏ hoàn toàn lỗi tính toán hoa hồng thủ công.
- **Tracking thời gian thực:** Ghi nhận chính xác nguồn đơn hàng dựa trên cơ chế Last-Click Attribution, Cookie Tracking và Device Fingerprinting.
- **Tự động hóa toàn diện:** Tích hợp Chat Realtime In-App, Luồng xin sản phẩm mẫu dùng thử, Phân cấp bậc CTV, Chống Race Condition ví tiền, Quản lý không giới hạn Kênh MXH và AI Gợi ý KOL.

---

## 2. USER PERSONAS & ROLE MATRIX (5 SYSTEM ROLES)

| Actor / Role | Mô tả vai trò | Quyền hạn chính trong InfluxNet |
| :--- | :--- | :--- |
| **System Administrator (Super Admin)** | Quản trị viên cấp cao | - Xem Executive High-Level Dashboard toàn nền tảng SaaS.<br>- Xem báo cáo sức khỏe hệ thống và Tổng dung lượng tài chính.<br>- Tra cứu Audit Logs cấp cao. |
| **System Manager (Web Manager)** | Quản lý vận hành hệ thống Web | - Phê duyệt và Onboarding Cửa hàng (Stores) mới.<br>- Quản lý các cờ cảnh báo gian lận AI (AI Anti-Fraud Flags).<br>- Cấu hình danh mục Ngân hàng hợp lệ toàn sàn (VietQR/Napas247). |
| **Shop Manager (Merchant)** | Chủ cửa hàng / Quản lý thương hiệu | - Quản lý Danh mục sản phẩm & Đồng bộ tồn kho.<br>- Cấu hình Quy tắc hoa hồng (Flat rate, %, Tiered Bonuses).<br>- Tải lên Kho nguyên liệu Marketing (Media Assets, Banners, Copywritten Text).<br>- Duyệt yêu cầu xin sản phẩm mẫu.<br>- Chat nhắn tin 1-1 với KOLs và Duyệt yêu cầu rút tiền đính kèm bill ngân hàng. |
| **Shop Staff (Finance Auditor)** | Kế toán / Nhân viên Cửa hàng | - Hỗ trợ đối soát đơn hàng và trạng thái hoàn trả/hủy đơn.<br>- Kiểm tra hồ sơ KYC và hỗ trợ chuẩn bị danh sách rút tiền cho Manager duyệt. |
| **Collaborator (KOL/KOC/CTV)** | Cộng tác viên bán hàng & Influencers | - Đăng ký tài khoản, xác thực thông tin tài khoản ngân hàng & Thêm không giới hạn Kênh MXH (TikTok, Facebook, Youtube, Threads, Zalo...).<br>- Xem Cấp bậc của mình (Bronze, Silver, Gold, Platinum).<br>- Tạo Link tiếp thị mã hóa, Mã giảm giá (Coupon Code) & Mã QR Code động.<br>- Bấm xin sản phẩm mẫu dùng thử.<br>- Chat trực tiếp 1-1 với Shop Manager.<br>- Theo dõi Dashboard doanh số thời gian thực và Bấm rút tiền hoa hồng. |

---

## 3. FUNCTIONAL REQUIREMENTS (28 MASTER FUNCTIONAL REQUIREMENTS)

### 3.1 Module 1: Identity & Access Management (IAM), KYC, Tiers & Unlimited Social Channels
- **FR-01 (User Registration & Authentication):** Đăng ký/Đăng nhập an toàn qua JWT (Access & Refresh Token). Bảo mật OTP 2FA khi rút tiền.
- **FR-02 (Role-Based Access Control - RBAC):** Kiểm soát phân quyền nghiêm ngặt giữa 5 vai trò (`SYSTEM_ADMIN`, `SYSTEM_MANAGER`, `SHOP_MANAGER`, `SHOP_STAFF`, `COLLABORATOR`).
- **FR-03 (Partner KYC & Multi-Channel Verification):** Cập nhật CMND/CCCD, Mã số thuế, STK Ngân hàng và Thêm không giới hạn các kênh MXH (TikTok, Facebook, Youtube, Threads, Zalo, Telegram, Shopee Video, Lemon8...).
- **FR-04 (Collaborator Tier Ranking Engine):** Tự động phân cấp bậc CTV (Đồng, Bạc, Vàng, Kim Cương) theo tổng doanh số tích lũy để thưởng thêm % hoa hồng.

### 3.2 Module 2: Attribution, Tracking Engine & Marketing Media Hub
- **FR-05 (Encrypted Referral Link Generator):** Tạo link tiếp thị rút gọn mã hóa định dạng `/r/{short_code}`.
- **FR-06 (Dynamic QR Code Generator):** Tự động tạo ảnh mã QR Code để KOL tải về quảng bá.
- **FR-07 (Custom Promo Coupon Attribution):** Cho phép KOL/Shop tạo mã giảm giá riêng (VD: `KOLTHANG10`) để gán hoa hồng tự động khi khách nhập mã.
- **FR-08 (Last-Click Attribution Engine):** Ghi nhận lượt nhấp (Click), set Cookie mã hóa (`influx_ref`) và lưu Device Fingerprint (IP + UserAgent) với thời hạn Cookie cài đặt riêng theo Shop (`attribution_window_days`).
- **FR-09 (Centralized Marketing Media Asset Library):** Kho chứa ảnh HD, Banner, Video review và Bài viết mẫu SEO với nút **"1-Click Copy Text"**.
- **FR-10 (Sample Product Request Workflow):** Cho phép KOL bấm *"Yêu cầu nhận hàng mẫu để làm video"* -> Shop duyệt & gửi hàng mẫu kèm Mã vận đơn.

### 3.3 Module 3: In-App Real-time Direct Messaging (Chat Realtime)
- **FR-11 (Socket.io Direct Messaging):** Khung chat nhắn tin 1-1 trực tiếp giữa Shop Manager và KOL ngay trên ứng dụng.
- **FR-12 (Campaign Invitation via Chat):** Shop gửi lời mời trực tiếp đến các Top KOLs tham gia chiến dịch độc quyền kèm tỷ lệ hoa hồng ưu đãi.
- **FR-13 (Automated Sample Product Shipping Notifications):** Tự động gửi thông báo chat khi Shop duyệt hoặc cập nhật mã vận đơn gửi hàng mẫu.

### 3.4 Module 4: Order Synchronization & Per-Item Commission Billing
- **FR-14 (Order Ingestion & Line Items Sync):** Nhận đơn hàng từ hệ thống E-commerce qua API Webhook `POST /api/v1/orders/webhook` gồm Header đơn hàng (`orders`) và Danh sách từng món (`order_items`).
- **FR-15 (Per-Item Multi-Rule Commission Billing):** Tính toán tiền hoa hồng chính xác cho từng sản phẩm dựa trên tỷ lệ % riêng của từng món.
- **FR-16 (Commission Pending Crediting):** Khởi tạo bản ghi Hoa hồng ở trạng thái `PENDING` và cộng vào Số dư chờ duyệt của KOL.
- **FR-17 (Automated Reconciliation & Refund Clawback):** Tự động chuyển hoa hồng sang `APPROVED` sau 14 ngày. Nếu đơn hàng bị Hủy/Hoàn trả -> Chuyển hoa hồng sang `REVERSED`, trừ ví chờ của KOL về 0 và ghi Sổ cái tài chính (`type = REVERSAL`).

### 3.5 Module 5: Settlement, Financial Ledger & Payout Engine
- **FR-18 (Wallet Balance Management):** Quản lý ví tiền gồm `available_balance` (Khả dụng) và `pending_balance` (Chờ duyệt).
- **FR-19 (Immutable Financial Ledger):** Ghi lịch sử biến động số dư dạng Append-Only (`financial_ledgers`), không thể sửa/xóa.
- **FR-20 (Pessimistic Wallet Locking):** Áp dụng khóa `SELECT ... FOR UPDATE` trong PostgreSQL khi rút tiền để chống lặp tiền/race condition.
- **FR-21 (Payout Audit & Bank Proof Upload):** Shop Manager duyệt rút tiền, bắt buộc tải lên ảnh bill chuyển khoản ngân hàng (`proof_image_url`) và mã đối soát.
- **FR-22 (Bank Batch Transfer Export):** Xuất danh sách chuyển khoản được phê duyệt ra file Excel/CSV định dạng chuẩn VietQR / Napas247.

### 3.6 Module 6: Catalog Management & Store Configuration
- **FR-23 (Product Catalog & Soft Delete):** Đăng sản phẩm, sửa giá, cài % hoa hồng riêng, đồng bộ tồn kho và áp dụng cờ xóa mềm (`is_deleted = true`).
- **FR-24 (Store Settings Configuration):** Cấu hình thời hạn Cookie, hạn mức rút tối thiểu (`min_payout_amount`), % hoa hồng mặc định của Store.

### 3.7 Module 7: Enterprise Analytics, AI Engine & Audit Trails
- **FR-25 (Real-Time Performance Dashboard & Charts):** Biểu đồ Clicks, Đơn thành công, CR%, Hoa hồng và Biểu đồ doanh thu Recharts.
- **FR-26 (Gamified KOL Leaderboard):** Bảng vinh danh Top 10 KOLs có doanh số cao nhất tháng.
- **FR-27 (AI-Powered Smart KOL Matching):** AI phân tích dữ liệu bán hàng quá khứ để gợi ý KOL phù hợp với từng ngành hàng.
- **FR-28 (AI Anti-Fraud Click Detection & Security Audit Logs):** AI phát hiện lượt nhấp tăng đột biến bất thường từ IP lạ và lưu vết lịch sử thao tác (`audit_logs`).

---

## 4. NON-FUNCTIONAL REQUIREMENTS (NFR)

- **NFR-SEC-01 (Security):** Mã hóa thông tin nhạy cảm qua HTTPS/TLS 1.3, băm mật khẩu `bcrypt` salt >= 10, tuân thủ OWASP Top 10.
- **NFR-PER-01 (Performance):** Phản hồi API Core < 200ms, tải trang Frontend < 1.5s, xử lý Click qua Redis > 1,000 req/s.
- **NFR-DAT-01 (Data Integrity):** Cam kết 100% giao dịch đạt tính vẹn toàn ACID và 100% thao tác xóa áp dụng Soft Delete (`is_deleted = true`).

---
*Tài liệu SRS v1.0.0 Enterprise Specification thuộc dự án InfluxNet.*
