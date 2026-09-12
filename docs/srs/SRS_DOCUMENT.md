# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## Project Name: SCANMS - Sales Collaborator and Affiliate Network Management System
**Official Registered Code:** FA26SE032  
**Document Version:** 1.0.0 (Enterprise Specification)  
**Target Jury / Faculty:** Capstone Defense Committee (FPT University)

---

## 1. INTRODUCTION

### 1.1 Purpose
Tài liệu Software Requirement Specification (SRS) v1.0.0 này quy định chi tiết toàn bộ Yêu cầu Chức năng (Functional Requirements - FR) và Yêu cầu Phi chức năng (Non-Functional Requirements - NFR) cho dự án **SCANMS**. Tài liệu này làm căn cứ chính thức cho quy trình thiết kế CSDL (21 bảng 3NF), kiến trúc hệ thống (SAD), hợp đồng API (API Specification), phát triển mã nguồn và kiểm thử phần mềm.

### 1.2 Scope & Vision
**SCANMS** là nền tảng quản trị mạng lưới Tiếp thị liên kết (Affiliate Marketing) và Cộng tác viên bán hàng (KOL/KOC/Sales Partner) dành cho các thương hiệu D2C và Shop bán hàng.
- **Tự động hóa đối soát tài chính:** Loại bỏ hoàn toàn lỗi tính toán hoa hồng thủ công.
- **Tracking thời gian thực:** Ghi nhận chính xác nguồn đơn hàng dựa trên cơ chế Last-Click Attribution, Cookie Tracking và Device Fingerprinting.
- **Tự động hóa toàn diện:** Tích hợp Chat Realtime In-App, Luồng xin sản phẩm mẫu dùng thử, Phân cấp bậc CTV, Chống Race Condition ví tiền, Quản lý không giới hạn Kênh MXH và AI Gợi ý KOL.

---

## 2. USER PERSONAS & ROLE MATRIX (4 SYSTEM ROLES)

| Actor / Role | Mô tả vai trò | Quyền hạn chính trong InfluxNet |
| :--- | :--- | :--- |
| **System Administrator (Super Admin)** | Quản trị viên cấp cao | - Xem Executive High-Level Dashboard toàn nền tảng SaaS.<br>- Xem báo cáo sức khỏe hệ thống và Tổng dung lượng tài chính.<br>- Tra cứu Audit Logs cấp cao. |
| **System Manager (Web Manager)** | Quản lý vận hành hệ thống Web | - Phê duyệt và Onboarding Cửa hàng (Stores) mới.<br>- Quản lý các cờ cảnh báo gian lận AI (AI Anti-Fraud Flags).<br>- Cấu hình danh mục Ngân hàng hợp lệ toàn sàn (VietQR/Napas247). |
| **Shop Manager (Merchant / Shop Owner)** | Chủ cửa hàng / Quản trị viên Store | - Quản lý Danh mục sản phẩm & Đồng bộ tồn kho.<br>- Cấu hình Quy tắc hoa hồng (Flat rate, %, Tiered Bonuses).<br>- Tải lên Kho nguyên liệu Marketing (Media Assets, Banners, Copywritten Text).<br>- Duyệt yêu cầu xin sản phẩm mẫu.<br>- Chat nhắn tin 1-1 với KOLs.<br>- Quản lý đối soát đơn hàng, trạng thái hoàn trả/hủy đơn và Duyệt rút tiền đính kèm bill ngân hàng / xuất file VietQR. |
| **Collaborator (KOL/KOC/CTV)** | Cộng tác viên bán hàng & Influencers | - Đăng ký tài khoản, xác thực thông tin tài khoản ngân hàng & Thêm không giới hạn Kênh MXH (TikTok, Facebook, Youtube, Threads, Zalo...).<br>- Xem Cấp bậc của mình (Bronze, Silver, Gold, Platinum).<br>- Tạo Link tiếp thị mã hóa, Mã giảm giá (Coupon Code) & Mã QR Code động.<br>- Bấm xin sản phẩm mẫu dùng thử.<br>- Chat trực tiếp 1-1 với Shop Manager.<br>- Theo dõi Dashboard doanh số thời gian thực và Bấm rút tiền hoa hồng. |

---

## 3. FUNCTIONAL REQUIREMENTS (32 MASTER FUNCTIONAL REQUIREMENTS)

### 3.1 Module 1: Identity & Access Management (IAM), KYC, Tiers & Unlimited Social Channels
- **FR-01 (User Registration & Authentication):** Đăng ký/Đăng nhập an toàn qua JWT (Access Token 15 phút & Refresh Token 7 ngày). Bảo mật OTP 2FA khi rút tiền.
- **FR-02 (Role-Based Access Control - RBAC):** Kiểm soát phân quyền nghiêm ngặt giữa 4 vai trò (`SYSTEM_ADMIN`, `SYSTEM_MANAGER`, `SHOP_MANAGER`, `COLLABORATOR`).
- **FR-03 (Partner KYC Verification):** Cập nhật CMND/CCCD, Mã số thuế, STK Ngân hàng và xác minh danh tính tài chính.
- **FR-04 (Multi-Channel Social Media Management):** Liên kết không giới hạn các kênh MXH (TikTok, Facebook, Youtube, Threads, Zalo, Telegram, Shopee Video, Lemon8...) kèm follower count.
- **FR-05 (Collaborator Tier Ranking Engine):** Tự động phân cấp bậc CTV (Đồng, Bạc, Vàng, Kim Cương) theo tổng doanh số tích lũy để thưởng thêm % hoa hồng.

### 3.2 Module 2: Catalog Management, Store Settings & Bonus Milestone Engine
- **FR-06 (Store Settings Configuration):** Cấu hình thời hạn Cookie (`attribution_window_days`), hạn mức rút tối thiểu (`min_payout_amount`), % hoa hồng mặc định của Store.
- **FR-07 (Product Catalog & Soft Delete):** Đăng sản phẩm, sửa giá, cài % hoa hồng riêng, đồng bộ tồn kho và áp dụng cờ xóa mềm (`is_deleted = true`).
- **FR-08 (Centralized Marketing Media Asset Library - Media Hub):** Kho chứa ảnh HD, Banner, Video review và Bài viết mẫu SEO với nút **"1-Click Copy Text"**.
- **FR-09 (Tiered Monthly Revenue Bonus Milestone Engine - Mốc Thưởng Doanh Số Tháng):** Shop thiết lập các mốc đạt doanh số cao trong tháng để thưởng thêm tiền cố định hoặc % hoa hồng vượt mốc (VD: Đạt 50tr thưởng 500.000đ + 2% phần vượt). Hệ thống tự động tính lũy tiến, kết chuyển tháng, duyệt và chi trả thưởng vào ví KOL.

### 3.3 Module 3: Attribution, Tracking Engine & Dynamic Link/QR
- **FR-10 (Encrypted Referral Link Generator):** Tạo link tiếp thị rút gọn mã hóa định dạng `/r/{short_code}`.
- **FR-11 (Dynamic QR Code Generator):** Tự động tạo ảnh mã QR Code để KOL tải về quảng bá.
- **FR-12 (Custom Promo Coupon Attribution):** Cho phép KOL/Shop tạo mã giảm giá riêng (VD: `KOLTHANG10`) để gán hoa hồng tự động khi khách nhập mã.
- **FR-13 (Last-Click Attribution Engine):** Ghi nhận lượt nhấp (Click), set Cookie mã hóa (`influx_ref`) và lưu Device Fingerprint (IP + UserAgent) với thời hạn Cookie cài đặt riêng theo Shop.
- **FR-14 (Anti-Click Spam via Redis Rate Limit):** Thuật toán Sliding Window trên Redis giới hạn tối đa 10 clicks/giây/IP để chặn click tặc.

### 3.4 Module 4: Order Synchronization & Per-Item Commission Billing
- **FR-15 (Buyer Landing Page & Video Review):** Trang chi tiết sản phẩm công khai kèm video review của KOL và đánh giá khách hàng.
- **FR-16 (Guest Direct Checkout):** Đặt hàng siêu tốc không cần tài khoản, áp coupon giảm giá, tự động trừ tồn kho và tạo đơn hàng.
- **FR-17 (Public Order Tracking):** Khách tra cứu hành trình đơn hàng bằng Số điện thoại hoặc Mã đơn hàng.
- **FR-18 (Product Review & Rating):** Khách nhận hàng thành công gửi đánh giá 1-5 sao kèm nhận xét chất lượng.
- **FR-19 (Order Ingestion Webhook):** Nhận đơn hàng từ hệ thống E-commerce (Shopee, TikTok Shop, Shopify) qua Webhook `POST /orders/webhook`.
- **FR-20 (Manual Order & Batch Excel Import):** Tạo đơn hàng thủ công hoặc tải file Excel danh sách đơn để đối soát hoa hồng hàng loạt.
- **FR-21 (Per-Item Multi-Rule Commission Billing):** Tính toán tiền hoa hồng chính xác cho từng sản phẩm dựa trên tỷ lệ % món, cấp bậc và chiến dịch, cộng vào Số dư chờ duyệt (`PENDING`).
- **FR-22 (Automated 14-Day Reconciliation):** Tự động chuyển hoa hồng sang `APPROVED` sau 14 ngày kể từ khi giao hàng thành công.
- **FR-23 (Automated Refund Clawback & Reversal):** Khi đơn bị Hủy/Hoàn trả, chuyển hoa hồng sang `REVERSED`, trừ ví chờ về 0 và ghi Sổ cái tài chính (`type = REVERSAL`).

### 3.5 Module 5: Settlement, Financial Ledger & Payout Engine
- **FR-24 (Pessimistic Wallet Locking & Payout Request):** KOL bấm rút tiền; áp dụng khóa `SELECT ... FOR UPDATE` trong PostgreSQL để chống race condition / lặp tiền.
- **FR-25 (Immutable Financial Ledger):** Ghi lịch sử biến động số dư dạng Append-Only (`financial_ledgers`), không thể sửa/xóa.
- **FR-26 (Automated 10% Personal Income Tax):** Tự động khấu trừ 10% thuế TNCN cho các khoản chi trả từ 2.000.000 VNĐ theo quy định pháp luật.
- **FR-27 (Payout Audit & Bank Proof Upload):** Shop duyệt rút tiền, bắt buộc tải lên ảnh bill chuyển khoản ngân hàng và mã đối soát.
- **FR-28 (Bank Batch Transfer Export):** Xuất danh sách chuyển khoản được phê duyệt ra file Excel chuẩn VietQR / Napas247.

### 3.6 Module 6: Direct Messaging & Sample Product Flow
- **FR-29 (Socket.io Direct Messaging):** Khung chat nhắn tin 1-1 trực tiếp giữa Shop Manager và KOL ngay trên ứng dụng.
- **FR-30 (Sample Product Request Workflow):** Cho phép KOL bấm *"Yêu cầu nhận hàng mẫu để làm video"* -> Shop duyệt & gửi hàng mẫu kèm Mã vận đơn.
- **FR-31 (Campaign Invitation via Chat):** Shop gửi lời mời trực tiếp đến các Top KOLs tham gia chiến dịch độc quyền kèm tỷ lệ hoa hồng ưu đãi.

### 3.7 Module 7 & 8: Enterprise Analytics, AI Engine & Audit Trails
- **FR-32 (Real-Time Performance Dashboard & Charts):** Biểu đồ Clicks, Đơn thành công, CR%, Hoa hồng và Biểu đồ doanh thu Recharts.
- **FR-33 (Gamified KOL Leaderboard):** Bảng vinh danh Top 10 KOLs có doanh số cao nhất tháng.
- **FR-34 (AI-Powered Smart KOL Matching):** AI phân tích dữ liệu bán hàng quá khứ để gợi ý KOL phù hợp với từng ngành hàng.
- **FR-35 (AI Anti-Fraud Click Detection & Security Audit Logs):** AI phát hiện lượt nhấp tăng đột biến bất thường từ IP lạ và lưu vết lịch sử thao tác (`audit_logs`).

---

## 4. NON-FUNCTIONAL REQUIREMENTS (NFR)

- **NFR-SEC-01 (Security):** Mã hóa thông tin nhạy cảm qua HTTPS/TLS 1.3, băm mật khẩu `bcrypt` salt >= 10, tuân thủ OWASP Top 10.
- **NFR-PER-01 (Performance):** Phản hồi API Core < 200ms, tải trang Frontend < 1.5s, xử lý Click qua Redis > 1,000 req/s.
- **NFR-DAT-01 (Data Integrity):** Cam kết 100% giao dịch đạt tính vẹn toàn ACID và 100% thao tác xóa áp dụng Soft Delete (`is_deleted = true`).

---
*Tài liệu SRS v1.0.0 Enterprise Specification thuộc dự án InfluxNet.*
