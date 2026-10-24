# ĐẶC TẢ THIẾT KẾ CLASS & SEQUENCE DIAGRAMS TOÀN DIỆN (FR-01 ĐẾN FR-32)
## DỰ ÁN CAPSTONE: SCANMS (FA26SE032)
**Sales Collaborator and Affiliate Network Management System**  
*(Hệ thống Quản lý Mạng lưới Tiếp thị liên kết & Cộng tác viên bán hàng Đa Gian Hàng)*

---

- **Mã đề tài:** FA26SE032  
- **Team Leader:** Nguyễn Thành Thắng (SE184251)  
- **Tiêu chuẩn thiết kế áp dụng:** UML 2.5 Specification, Modular Clean Architecture, NestJS Backend Standards, React TypeScript Guidelines, Prisma ORM Models, PostgreSQL Physical Database.  
- **Tài liệu tham chiếu:** `SEP490.drawio.xml`, `KE_HOACH_CHUAN_BI_REVIEW_2_VA_HOI_DONG_1.1.md`, `SCANMS_ERD_Conceptual_Logical_Physical_Specification.md`.

---

## MỤC LỤC
1. [Tổng quan Kiến trúc Toàn diện & Ma trận Phân công Trách nhiệm](#1-tổng-quan-kiến-trúc-toàn-diện--ma-trận-phân-công-trách-nhiệm)
2. [Sơ đồ Ngữ cảnh Toàn sàn SCANMS (System Context Diagram)](#2-sơ-đồ-ngữ-cảnh-toàn-sàn-scanms-system-context-diagram)
3. [Phân hệ 1: Xác thực, Bảo mật & Vận hành Cốt lõi (FR-01 đến FR-08)](#3-phân-hệ-1-xác-thực-bảo-mật--vận-hành-cốt-lõi-fr-01-đến-fr-08)
4. [Phân hệ 2: Tiếp thị Liên kết & Động cơ Tracking (FR-09 đến FR-16)](#4-phân-hệ-2-tiếp-thị-liên-kết--động-cơ-tracking-fr-09-đến-fr-16)
5. [Phân hệ 3: Gian hàng, Đơn hàng & Quản trị Vận hành (FR-17 đến FR-24)](#5-phân-hệ-3-gian-hàng-đơn-hàng--quản-trị-vận-hành-fr-17-đến-fr-24)
6. [Phân hệ 4: Tương tác KOL, Phân tích Realtime & Trí tuệ Nhân tạo (FR-25 đến FR-32)](#6-phân-hệ-4-tương-tác-kol-phân-tích-realtime--trí-tuệ-nhân-tạo-fr-25-đến-fr-32)
7. [Bảng Ma trận Tổng hợp 65 Sơ đồ & Danh mục Tệp Thiết kế](#7-bảng-ma-trận-tổng-hợp-65-sơ-đồ--danh-mục-tệp-thiết-kế)
8. [Checklist Sẵn sàng Bảo vệ Review 2 & Hội đồng 1.1](#8-checklist-sẵn-sàng-bảo-vệ-review-2--hội-đồng-11)

---

> ### 📂 HỆ THỐNG ĐÃ ĐƯỢC TÁCH RIÊNG THÀNH 4 BỘ HỒ SƠ ĐỘC LẬP THEO 4 THÀNH VIÊN:
> Nếu bạn muốn xem, gửi hoặc nộp riêng theo từng người phụ trách để chuẩn bị phản biện Review 2:
> 1. **Phân hệ 1 (FR-01 $\rightarrow$ FR-08) - Nguyễn Thành Thắng (Leader):**  
>    📄 [SCANMS_UML_Part1_Thang_FR01_FR08.md](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part1_Thang_FR01_FR08.md) | 📐 [SCANMS_UML_Part1_Thang_FR01_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part1_Thang_FR01_FR08.drawio) (16 Tabs)
> 2. **Phân hệ 2 (FR-09 $\rightarrow$ FR-16) - Nguyễn Đình Tuấn:**  
>    📄 [SCANMS_UML_Part2_Tuan_FR09_FR16.md](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part2_Tuan_FR09_FR16.md) | 📐 [SCANMS_UML_Part2_Tuan_FR09_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part2_Tuan_FR09_FR16.drawio) (16 Tabs)
> 3. **Phân hệ 3 (FR-17 $\rightarrow$ FR-24) - Nguyễn Phú Quý:**  
>    📄 [SCANMS_UML_Part3_Quy_FR17_FR24.md](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part3_Quy_FR17_FR24.md) | 📐 [SCANMS_UML_Part3_Quy_FR17_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part3_Quy_FR17_FR24.drawio) (16 Tabs)
> 4. **Phân hệ 4 (FR-25 $\rightarrow$ FR-32) - Phan Xuân Thịnh:**  
>    📄 [SCANMS_UML_Part4_Thinh_FR25_FR32.md](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part4_Thinh_FR25_FR32.md) | 📐 [SCANMS_UML_Part4_Thinh_FR25_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part4_Thinh_FR25_FR32.drawio) (16 Tabs)

---

## 1. TỔNG QUAN KIẾN TRÚC TOÀN DIỆN & MA TRẬN PHÂN CÔNG TRÁCH NHIỆM

Hệ thống **SCANMS** được mô hình hóa theo chuẩn UML 2.5 với **65 sơ đồ kỹ thuật chi tiết** bao gồm:
- **01 Sơ đồ Ngữ cảnh (System Context Diagram):** Mô tả toàn cảnh tương tác giữa người dùng, các đối tác ngoại vi và sàn giao dịch.
- **32 Sơ đồ Lớp (Class Diagrams):** Thể hiện chi tiết cấu trúc phân lớp đối tượng: Giao diện React Functional Components, Client Service Objects, NestJS Controllers, DTOs, NestJS Providers/Services và Prisma Data Models.
- **32 Sơ đồ Tuần tự (Sequence Diagrams):** Mô tả chi tiết từng bước trao đổi thông điệp thời gian thực (Life lines, Activation bars, Request/Response, Asynchronous events, Database queries).

### 👥 Ma trận Phân công 4 Thành viên (Đồng đều 25%):

| STT | Thành viên phụ trách | MSSV | Vai trò | Phân hệ đảm nhiệm | Phạm vi FRs | Số lượng Sơ đồ |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: |
| 1 | **Nguyễn Thành Thắng** | `SE184251` | **Team Leader** | Xác thực, Bảo mật & Vận hành Cốt lõi | **FR-01 $\rightarrow$ FR-08** | 16 sơ đồ (8 CD + 8 SQ) |
| 2 | **Nguyễn Đình Tuấn** | `SE180104` | **Member** | Tiếp thị Liên kết & Động cơ Tracking | **FR-09 $\rightarrow$ FR-16** | 16 sơ đồ (8 CD + 8 SQ) |
| 3 | **Nguyễn Phú Quý** | `SE180104` | **Member** | Gian hàng, Đơn hàng & Quản trị Vận hành | **FR-17 $\rightarrow$ FR-24** | 16 sơ đồ (8 CD + 8 SQ) |
| 4 | **Phan Xuân Thịnh** | `SE184527` | **Member** | Tương tác KOL, Phân tích Realtime & AI | **FR-25 $\rightarrow$ FR-32** | 16 sơ đồ (8 CD + 8 SQ) |
| - | **Toàn đội ngũ** | `FA26SE032` | **Toàn hệ thống** | Bối cảnh tương tác thực tế sàn SCANMS | **Context Diagram** | 1 sơ đồ Ngữ cảnh |
| **TỔNG** | **4 Thành viên** | - | - | **32 Chức năng Hoàn chỉnh** | **FR-01 .. FR-32** | **65 Sơ đồ Chuẩn UML** |

---

## 2. SƠ ĐỒ NGỮ CẢNH TOÀN SÀN SCANMS (SYSTEM CONTEXT DIAGRAM)

Sơ đồ Ngữ cảnh mô tả ranh giới hệ thống SCANMS với 7 nhóm tác nhân bên ngoài:
1. **Khách hàng (Customer / Guest):** Tìm kiếm sản phẩm, xem live, đặt hàng, thanh toán, đánh giá.
2. **Nhà sáng tạo nội dung (KOL / KOC / Affiliate Collaborator):** Tạo link rút gọn, nhận mã giảm giá, xin hàng mẫu, theo dõi hoa hồng, rút tiền ví.
3. **Chủ gian hàng (Merchant / Shop Owner):** Đăng bán sản phẩm, duyệt hàng mẫu, xử lý đơn hàng, in vận đơn A6, đàm phán hợp tác.
4. **Cơ quan Quản lý & Vận hành sàn (System Admin / Compliance Officer):** Thẩm định hồ sơ KYC, kiểm soát rủi ro, phân xử khiếu nại, giám sát Audit logs.
5. **Cổng thanh toán điện tử (VietQR / PayOS / Napas 24/7):** Xử lý thanh toán đơn hàng và chi trả hoa hồng tự động.
6. **Đơn vị vận chuyển (Giao Hàng Nhanh - GHN / GHTK):** Lấy hàng, cập nhật hành trình vận đơn thời gian thực.
7. **Mạng xã hội & Đám mây (TikTok, YouTube, Facebook, Cloudinary Storage):** Đồng bộ kênh truyền thông và lưu trữ đa phương tiện.

![SCANMS Context Diagram](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.png)

- **Tệp Vector:** [SCANMS_Context_Diagram.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.svg)
- **Tệp Thiết kế Draw.io:** [SCANMS_Context_Diagram.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.drawio)

---

## 3. PHÂN HỆ 1: XÁC THỰC, BẢO MẬT & VẬN HÀNH CỐT LÕI (FR-01 ĐẾN FR-08)
> 👤 **Người phụ trách chính:** **Nguyễn Thành Thắng (Leader - SE184251)**  
> 📌 **Phạm vi chức năng:** FR-01 đến FR-08

### FR-01: Đăng ký tài khoản đa vai trò, Hash mật khẩu Argon2 & OTP xác thực Email

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Cung cấp cơ chế đăng ký tài khoản cho 3 vai trò chính (KOL, Merchant, Customer). Xác thực Email OTP 6 chữ số với hạn 5 phút. Mật khẩu được băm bằng thuật toán Argon2id chống brute-force.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `RegisterPage.tsx, OtpVerificationModal.tsx`
  - **Backend API & Service:** `AuthController.register, AuthService.register, MailService.sendRegistrationOtp`
  - **Prisma Models / Database Tables:** `User, CollaboratorProfile, Store, Wallet, OtpCache`

#### 1. Sơ đồ Lớp (Class Diagram - FR-01)
![Class Diagram FR-01](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-01)
![Sequence Diagram FR-01](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.drawio)

---

### FR-02: Đăng nhập an toàn, JWT Access/Refresh tokens & Bảo mật phiên

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Cơ chế xác thực đăng nhập kép (Access Token ngắn hạn 15m + Refresh Token dài hạn 7d lưu HttpOnly Cookie). Cơ chế khóa tài khoản tự động khi nhập sai mật khẩu quá 5 lần.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `LoginPage.tsx, useAuth.ts`
  - **Backend API & Service:** `AuthController.login, AuthService.login, JwtAuthGuard`
  - **Prisma Models / Database Tables:** `User, RefreshToken, LoginSession, AuditLog`

#### 1. Sơ đồ Lớp (Class Diagram - FR-02)
![Class Diagram FR-02](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-02)
![Sequence Diagram FR-02](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.drawio)

---

### FR-03: Xác thực 2 bước (2FA OTP) & Khôi phục mật khẩu qua Email

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Lớp bảo vệ thứ hai cho tài khoản Merchant và Admin khi thực hiện các tác vụ nhạy cảm (đổi mật khẩu, rút tiền). Token khôi phục mật khẩu mã hóa 1 chiều có hạn sử dụng 15 phút.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ForgotPasswordModal.tsx, TwoFactorAuthModal.tsx`
  - **Backend API & Service:** `AuthController.verify2Fa, AuthService.sendPasswordResetOtp, AuthService.resetPassword`
  - **Prisma Models / Database Tables:** `User, PasswordResetToken, AuditLog`

#### 1. Sơ đồ Lớp (Class Diagram - FR-03)
![Class Diagram FR-03](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-03)
![Sequence Diagram FR-03](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.drawio)

---

### FR-04: Phân quyền người dùng theo vai trò (RBAC Guard đa tầng)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Hệ thống kiểm soát truy cập dựa trên vai trò (RBAC). Chặn đứng từ API Gateway và Frontend Router, ngăn chặn triệt để hành vi IDOR và leo thang đặc quyền (Privilege Escalation).
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ProtectedRoute.tsx, RoleBasedNav.tsx`
  - **Backend API & Service:** `RolesGuard, PermissionsGuard, RolesDecorator (@Roles)`
  - **Prisma Models / Database Tables:** `User, UserRole (CUSTOMER, COLLABORATOR, SHOP_MANAGER, SYSTEM_ADMIN)`

#### 1. Sơ đồ Lớp (Class Diagram - FR-04)
![Class Diagram FR-04](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-04)
![Sequence Diagram FR-04](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.drawio)

---

### FR-05: Nộp hồ sơ định danh điện tử (KYC cá nhân KOL & Pháp nhân Doanh nghiệp)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Thu thập hồ sơ định danh theo Nghị định 85/2021/NĐ-CP: Cá nhân (CCCD 2 mặt, MST cá nhân, STK); Doanh nghiệp (Giấy phép ĐKKD, MST doanh nghiệp, Địa chỉ kho hàng).
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `KycSubmissionPage.tsx, KycDocumentUploader.tsx`
  - **Backend API & Service:** `KycController.submitKyc, KycService.createProfile, StorageService.uploadDocument`
  - **Prisma Models / Database Tables:** `KycProfile, KycDocument, CollaboratorProfile, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-05)
![Class Diagram FR-05](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-05)
![Sequence Diagram FR-05](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.drawio)

---

### FR-06: Xét duyệt hồ sơ KYC đa cấp (System Admin & Shop Manager)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Giao diện thẩm định hồ sơ phân tách quyền: Admin duyệt toàn sàn, Shop duyệt KOL trực thuộc. Hỗ trợ lý do từ chối rõ ràng và gửi thông báo tức thời qua WebSocket và Email.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `KycApprovalPage.tsx, KycDetailDrawer.tsx`
  - **Backend API & Service:** `KycController.approveKyc, KycController.rejectKyc, KycService.evaluateKyc`
  - **Prisma Models / Database Tables:** `KycProfile, User, AuditLog, Notification`

#### 1. Sơ đồ Lớp (Class Diagram - FR-06)
![Class Diagram FR-06](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-06)
![Sequence Diagram FR-06](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.drawio)

---

### FR-07: Quản lý danh mục & Liên kết tài khoản Mạng xã hội của KOL (Social Channels)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Xác thực và lưu trữ liên kết mạng xã hội của KOL. Hỗ trợ kiểm tra định dạng profile URL và đếm số lượng người theo dõi (Followers) phục vụ thuật toán phân hạng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `KolProfilePage.tsx, SocialLinkManager.tsx`
  - **Backend API & Service:** `CollaboratorController.linkSocial, CollaboratorService.updateSocialChannels`
  - **Prisma Models / Database Tables:** `CollaboratorProfile, SocialChannel (TIKTOK, FACEBOOK, YOUTUBE, INSTAGRAM)`

#### 1. Sơ đồ Lớp (Class Diagram - FR-07)
![Class Diagram FR-07](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-07)
![Sequence Diagram FR-07](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.drawio)

---

### FR-08: Kho nội dung số tập trung (Media Hub) chia sẻ tài nguyên quảng bá

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Kho lưu trữ ảnh banner, video review gốc, file tài liệu hướng dẫn bán hàng do Shop tải lên để KOL tự do khai thác phục vụ chiến dịch tiếp thị mà không bị vỡ bản quyền.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `MediaHubPage.tsx, AssetPreviewModal.tsx`
  - **Backend API & Service:** `MediaController.uploadAsset, MediaService.listAssets, MediaService.getDownloadUrl`
  - **Prisma Models / Database Tables:** `MediaAsset, Store, Product, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-08)
![Class Diagram FR-08](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-08)
![Sequence Diagram FR-08](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.drawio)

---

## 4. PHÂN HỆ 2: TIẾP THỊ LIÊN KẾT & ĐỘNG CƠ TRACKING (FR-09 ĐẾN FR-16)
> 👤 **Người phụ trách chính:** **Nguyễn Đình Tuấn (SE180104)**  
> 📌 **Phạm vi chức năng:** FR-09 đến FR-16

### FR-09: Cấu hình mốc thưởng doanh số tháng (Monthly Revenue Bonus Milestones)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Shop cấu hình bậc thang thưởng lũy tiến theo doanh số tháng (ví dụ đạt 50tr thưởng 2%, đạt 100tr thưởng 3.5%). Hỗ trợ mô phỏng tiền thưởng tự động trước khi lưu.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CommissionRulesPage.tsx, BonusCalculatorModal.tsx`
  - **Backend API & Service:** `CommissionRulesController, CommissionRulesService.calculateProgressiveBonus`
  - **Prisma Models / Database Tables:** `CommissionRule, Store, MonthlyBonusLedger`

#### 1. Sơ đồ Lớp (Class Diagram - FR-09)
![Class Diagram FR-09](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-09)
![Sequence Diagram FR-09](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.drawio)

---

### FR-10: Tạo link tiếp thị liên kết rút gọn định danh (Short Affiliate Links & HMAC)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Sinh liên kết tiếp thị rút gọn chuẩn hóa (scanms.vn/r/xxxx) tích hợp UTM tracking parameters và mã xác thực chống giả mạo HMAC.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ReferralLinksPage.tsx, CreateLinkModal.tsx`
  - **Backend API & Service:** `ReferralLinksController.createLink, ReferralLinksService.generateShortCode`
  - **Prisma Models / Database Tables:** `ReferralLink, Product, Campaign, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-10)
![Class Diagram FR-10](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-10)
![Sequence Diagram FR-10](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.drawio)

---

### FR-11: Tạo mã QR Code động cá nhân hóa (Dynamic QR Code Generator)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Kết xuất mã QR Code SVG/PNG tùy biến có chèn logo gian hàng hoặc avatar KOL, hỗ trợ quét trực tiếp qua camera điện thoại dẫn thẳng vào trang sản phẩm.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `QrCodeModal.tsx, CanvasQrRenderer.tsx`
  - **Backend API & Service:** `ReferralLinksController.getQrCode, ReferralLinksService.renderDynamicQr`
  - **Prisma Models / Database Tables:** `ReferralLink, QrAsset`

#### 1. Sơ đồ Lớp (Class Diagram - FR-11)
![Class Diagram FR-11](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-11)
![Sequence Diagram FR-11](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.drawio)

---

### FR-12: Gán mã giảm giá độc quyền cho KOL (Exclusive Creator Coupons)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Shop cấp mã giảm giá riêng (Voucher độc quyền) cho từng KOL. Khi khách dùng voucher này, hệ thống tự động ghi nhận hoa hồng cho KOL mà không cần click link tiếp thị.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `KolCouponsPage.tsx, CouponBindingModal.tsx`
  - **Backend API & Service:** `CouponsController.assignToKol, CouponsService.validateCouponApplication`
  - **Prisma Models / Database Tables:** `Coupon, UserCoupon, Store, Product`

#### 1. Sơ đồ Lớp (Class Diagram - FR-12)
![Class Diagram FR-12](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-12)
![Sequence Diagram FR-12](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.drawio)

---

### FR-13: Động cơ Tracking Last-Click & Attribution Cookie 30 ngày

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Ghi nhận click traffic log, thiết lập Cookie lưu trữ 30 ngày theo nguyên tắc Last-Click Attribution (lượt click cuối cùng trước khi mua sẽ hưởng toàn bộ hoa hồng).
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `PublicHeader.tsx, useReferralTracking.ts`
  - **Backend API & Service:** `TrackingController.recordClick, TrackingService.resolveAttribution`
  - **Prisma Models / Database Tables:** `ClickTrafficLog, ReferralLink, SessionAttribution`

#### 1. Sơ đồ Lớp (Class Diagram - FR-13)
![Class Diagram FR-13](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-13)
![Sequence Diagram FR-13](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.drawio)

---

### FR-14: Chống click tặc & Spam traffic bằng Redis Sliding Window Rate Limit

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Bảo vệ endpoint click redirect bằng thuật toán Sliding Window Counter trên Redis In-Memory. Chặn tối đa 10 clicks/giây/IP, trả về HTTP 429 Too Many Requests khi bị bot tấn công.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `Global Error Interceptor`
  - **Backend API & Service:** `RedisRateLimiterGuard, TrackingQueueService, RedisService`
  - **Prisma Models / Database Tables:** `Redis Key (ratelimit:ip:*), ClickTrafficLog`

#### 1. Sơ đồ Lớp (Class Diagram - FR-14)
![Class Diagram FR-14](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-14)
![Sequence Diagram FR-14](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.drawio)

---

### FR-15: Trang đích sản phẩm (Landing Page) & Tích hợp Video Review KOL

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Trang chi tiết sản phẩm chuẩn SEO TMĐT, hiển thị thông tin gian hàng minh bạch, tỉ lệ hoa hồng CTV, video review chân thực của KOL và các ưu đãi đang áp dụng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ProductDetailPage.tsx, KolReviewVideoPlayer.tsx`
  - **Backend API & Service:** `ProductController.getProductPublicDetail, ProductService.getLandingMeta`
  - **Prisma Models / Database Tables:** `Product, ProductVariant, MediaAsset, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-15)
![Class Diagram FR-15](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-15)
![Sequence Diagram FR-15](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.drawio)

---

### FR-16: Đặt hàng nhanh & Tự động nhận diện Attribution khi thanh toán

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Quy trình đặt hàng thông minh tự động đọc Cookie tiếp thị hoặc mã giảm giá đang kích hoạt, tính toán hoa hồng dự kiến và khấu trừ voucher chính xác đến từng xu.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CheckoutModal.tsx, OrderSummary.tsx`
  - **Backend API & Service:** `OrdersController.createOrder, OrdersService.calculateTotals`
  - **Prisma Models / Database Tables:** `Order, OrderItem, ReferralLink, Coupon`

#### 1. Sơ đồ Lớp (Class Diagram - FR-16)
![Class Diagram FR-16](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-16)
![Sequence Diagram FR-16](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.drawio)

---

## 5. PHÂN HỆ 3: GIAN HÀNG, ĐƠN HÀNG & QUẢN TRỊ VẬN HÀNH (FR-17 ĐẾN FR-24)
> 👤 **Người phụ trách chính:** **Nguyễn Phú Quý (SE180104)**  
> 📌 **Phạm vi chức năng:** FR-17 đến FR-24

### FR-17: Quản lý Giỏ hàng đa gian hàng & Đồng bộ Database PostgreSQL

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Giỏ hàng được lưu trữ và đồng bộ hóa trực tiếp trên PostgreSQL Server theo User ID. Nhóm các sản phẩm theo từng Shop riêng biệt và tự động kiểm tra tồn kho realtime.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CartDrawer.tsx, CartItemRow.tsx`
  - **Backend API & Service:** `CartController, CartService.syncCart, CartService.validateStock`
  - **Prisma Models / Database Tables:** `CartItem, Product, ProductVariant, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-17)
![Class Diagram FR-17](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-17)
![Sequence Diagram FR-17](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.drawio)

---

### FR-18: Đánh giá sản phẩm có chứng thực (Verified Buyer Review Gate)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Cơ chế chống đánh giá ảo (Spam Reviews). Chỉ những khách hàng có đơn hàng chứa sản phẩm ở trạng thái DELIVERED hoặc COMPLETED mới được quyền gửi bài đánh giá kèm ảnh thực tế.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ProductReviewModal.tsx, ReviewRatingStars.tsx`
  - **Backend API & Service:** `ReviewsController.createReview, ReviewsService.verifyPurchaseGate`
  - **Prisma Models / Database Tables:** `ProductReview, Order, OrderItem, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-18)
![Class Diagram FR-18](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-18)
![Sequence Diagram FR-18](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.drawio)

---

### FR-19: Quản lý đơn hàng Merchant & Tách đơn đa gian hàng (Order Processing)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Khi khách đặt nhiều sản phẩm thuộc nhiều Shop khác nhau, hệ thống tự động tách thành các Sub-orders độc lập. Mỗi Shop chỉ nhìn thấy và quản lý đơn hàng của chính mình.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `OrdersManagementPage.tsx, OrderDetailModal.tsx`
  - **Backend API & Service:** `OrdersController.updateOrderStatus, OrdersService.splitMultiStoreOrder`
  - **Prisma Models / Database Tables:** `Order, OrderItem, Store, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-19)
![Class Diagram FR-19](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-19)
![Sequence Diagram FR-19](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.drawio)

---

### FR-20: Giao vận GHN & Shipping Simulator in phiếu A6 Barcode Code-128

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Tích hợp bưu cục Giao Hàng Nhanh (GHN) API và bộ mô phỏng doanh nghiệp. Tự động sinh mã vận đơn AWB chuẩn TMĐT và in tem phiếu đóng gói bưu kiện kích thước A6 có Barcode Code-128.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ShippingLabelModal.tsx, ShippingSimulatorTab.tsx`
  - **Backend API & Service:** `ShippingController.createFulfillment, ShippingService.generateAwbBarcode`
  - **Prisma Models / Database Tables:** `ShippingFulfillment, Order, Address`

#### 1. Sơ đồ Lớp (Class Diagram - FR-20)
![Class Diagram FR-20](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-20)
![Sequence Diagram FR-20](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.drawio)

---

### FR-21: Quỹ bảo chứng Escrow 14 ngày & Tạm giữ hoa hồng bảo vệ rủi ro

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Khi đơn giao thành công, hoa hồng của KOL lập tức được tính toán nhưng tạm giữ trong Quỹ Escrow 14 ngày. Hết thời hạn khiếu nại đổi trả, Cronjob tự động chuyển tiền sang Ví khả dụng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `EscrowLedgerTable.tsx, CommissionTimeline.tsx`
  - **Backend API & Service:** `CommissionService.holdInEscrow, EscrowCronJob.releaseMaturedCommissions`
  - **Prisma Models / Database Tables:** `CommissionLedger, Wallet, Order`

#### 1. Sơ đồ Lớp (Class Diagram - FR-21)
![Class Diagram FR-21](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-21)
![Sequence Diagram FR-21](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.drawio)

---

### FR-22: Quy trình đổi trả hàng / hoàn tiền & Thu hồi hoa hồng (Clawback Engine)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Xử lý khiếu nại đổi trả có đính kèm video bóc hộp. Khi Shop duyệt hoàn trả, Động cơ Clawback tự động thu hồi 100% hoa hồng tạm giữ và hoàn trả toàn bộ tiền về ví khách hàng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ReturnRequestModal.tsx, ReturnDisputeSplitView.tsx`
  - **Backend API & Service:** `ReturnsController.submitReturn, ReturnsService.approveReturnAndClawback`
  - **Prisma Models / Database Tables:** `ReturnRequest, ReturnEvidence, Order, CommissionLedger`

#### 1. Sơ đồ Lớp (Class Diagram - FR-22)
![Class Diagram FR-22](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-22)
![Sequence Diagram FR-22](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.drawio)

---

### FR-23: Yêu cầu rút tiền ví đối tác & Khóa bi quan chống âm ví (Pessimistic Locking)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** KOL tạo lệnh rút tiền về tài khoản ngân hàng. Áp dụng câu lệnh SELECT ... FOR UPDATE khóa dòng CSDL tức thời, ngăn chặn triệt để tấn công Race Condition / Double-spending làm âm ví.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `WalletPage.tsx, WithdrawalRequestModal.tsx`
  - **Backend API & Service:** `WalletsController.requestPayout, WalletsService.withdrawWithPessimisticLock`
  - **Prisma Models / Database Tables:** `Wallet, WalletTransaction, PayoutRequest`

#### 1. Sơ đồ Lớp (Class Diagram - FR-23)
![Class Diagram FR-23](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-23)
![Sequence Diagram FR-23](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.drawio)

---

### FR-24: Quyết toán chi trả Payout hàng loạt & Xuất file VietQR Napas 24/7

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Giao diện thẩm định duyệt lệnh chi trả. Tự động trích lập 10% thuế TNCN cho lệnh rút >= 2.000.000đ và xuất file Excel chuẩn lô lệnh liên ngân hàng VietQR Napas247.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `PayoutApprovalPage.tsx, BatchPayoutExporter.tsx`
  - **Backend API & Service:** `PayoutsController.approveBatch, PayoutsService.exportVietQrBatchFile`
  - **Prisma Models / Database Tables:** `PayoutRequest, KycProfile, FinancialLedger`

#### 1. Sơ đồ Lớp (Class Diagram - FR-24)
![Class Diagram FR-24](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-24)
![Sequence Diagram FR-24](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.drawio)

---

## 6. PHÂN HỆ 4: TƯƠNG TÁC KOL, PHÂN TÍCH REALTIME & TRÍ TUỆ NHÂN TẠO (FR-25 ĐẾN FR-32)
> 👤 **Người phụ trách chính:** **Phan Xuân Thịnh (SE184527)**  
> 📌 **Phạm vi chức năng:** FR-25 đến FR-32

### FR-25: Quy trình xin hàng mẫu dùng thử 4 bước (Sample Request Flow & 14-day SLA)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Quy trình 4 bước: KOL xin mẫu -> Shop duyệt cấp -> Bưu cục giao hàng -> KOL nộp video review nghiệm thu trong vòng 14 ngày. Quản lý trạng thái vòng đời chặt chẽ.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ShopSampleManagementTab.tsx, KolSampleRequestModal.tsx`
  - **Backend API & Service:** `SamplesController, SamplesService.approveSample, SamplesService.confirmDelivery`
  - **Prisma Models / Database Tables:** `SampleRequest, Product, Store, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-25)
![Class Diagram FR-25](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-25)
![Sequence Diagram FR-25](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.drawio)

---

### FR-26: Nhắn tin Realtime trao đổi giữa Shop và KOL (WebSocket Socket.IO Chat)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Hệ thống nhắn tin thời gian thực dựa trên WebSocket Socket.IO. Hỗ trợ hiển thị trạng thái đã đọc, typing indicators, chia sẻ thẻ sản phẩm và bảo chứng thông tin đàm phán.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ScanmsChatDrawer.tsx, ChatMessageList.tsx`
  - **Backend API & Service:** `ChatGateway (@WebSocketGateway), ChatService.saveMessage`
  - **Prisma Models / Database Tables:** `ChatMessage, ChatRoom, User, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-26)
![Class Diagram FR-26](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-26)
![Sequence Diagram FR-26](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.drawio)

---

### FR-27: Mời chiến dịch độc quyền qua Chat (Exclusive Deal Negotiation & Custom Rate)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Shop gửi lời mời hợp tác trực tiếp trong khung chat với mức hoa hồng độc quyền VIP (ví dụ 18% thay vì 10% cơ bản). KOL bấm chấp nhận sẽ tự sinh link riêng có mức rate này.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ExclusiveDealCard.tsx, DealProposalModal.tsx`
  - **Backend API & Service:** `DealsController.proposeDeal, DealsService.acceptExclusiveDeal`
  - **Prisma Models / Database Tables:** `ExclusiveDealProposal, Store, Product, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-27)
![Class Diagram FR-27](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-27)
![Sequence Diagram FR-27](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.drawio)

---

### FR-28: Dashboard phân tích doanh số thời gian thực & Traffic Analytics

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Báo cáo chỉ số kinh doanh trực quan (GMV, Doanh thu thuần, Tổng click, Tỉ lệ chuyển đổi CR%, Hoa hồng chi trả) với biểu đồ đường thời gian thực và phân loại theo kênh mạng xã hội.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `MerchantAnalyticsDashboard.tsx, KolSalesStats.tsx`
  - **Backend API & Service:** `AnalyticsController.getStoreDashboard, AnalyticsService.aggregateMetrics`
  - **Prisma Models / Database Tables:** `Order, ClickTrafficLog, CommissionLedger, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-28)
![Class Diagram FR-28](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-28)
![Sequence Diagram FR-28](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.drawio)

---

### FR-29: Bảng vinh danh Top KOL (Leaderboard & Tier Progression)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Bảng xếp hạng Top 10 KOL có doanh số tiếp thị cao nhất tháng. Tự động xét thăng hạng thành viên dựa trên doanh số lũy kế và cấp huy hiệu độc quyền trên sàn.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `LeaderboardPage.tsx, TierBadge.tsx`
  - **Backend API & Service:** `LeaderboardController.getMonthlyRankings, LeaderboardService.computeTierRanks`
  - **Prisma Models / Database Tables:** `CollaboratorProfile, CollaboratorTier (BRONZE, SILVER, GOLD, DIAMOND), User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-29)
![Class Diagram FR-29](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-29)
![Sequence Diagram FR-29](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.drawio)

---

### FR-30: AI gợi ý KOL phù hợp với ngành hàng & Sản phẩm (Smart Matching)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Mô hình AI chấm điểm độ phù hợp (Match Score 0-100%) giữa đặc tính sản phẩm và tệp khán giả của KOL dựa trên lịch sử chuyển đổi, ngành hàng thế mạnh và lượng tương tác.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `AiKolRecommendationWidget.tsx, KolMatchScoreBadge.tsx`
  - **Backend API & Service:** `AiController.recommendKolsForProduct, AiRecommendationService.calculateFitScore`
  - **Prisma Models / Database Tables:** `Product, Category, CollaboratorProfile, SocialChannel`

#### 1. Sơ đồ Lớp (Class Diagram - FR-30)
![Class Diagram FR-30](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-30)
![Sequence Diagram FR-30](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.drawio)

---

### FR-31: AI phát hiện gian lận Traffic & Đơn hàng ảo (Fraud Detection Engine)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Động cơ AI phát hiện các hành vi bất thường: Tự mua qua link của chính mình (Self-referral), Cùng IP/Fingerprint đặt hàng loạt đơn, hoặc Click spike bất thường từ IP proxy/VPN.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `FraudAlertBanner.tsx, SuspiciousActivityDrawer.tsx`
  - **Backend API & Service:** `FraudController.scanTrafficAnomaly, FraudDetectionService.detectSelfReferral`
  - **Prisma Models / Database Tables:** `FraudIncident, ClickTrafficLog, Order, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-31)
![Class Diagram FR-31](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-31)
![Sequence Diagram FR-31](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.drawio)

---

### FR-32: Nhật ký kiểm toán toàn diện & Truy vết an ninh bất biến (Comprehensive Audit Logs)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Ghi nhận nhật ký an ninh bất biến (Append-Only) cho mọi thao tác POST/PUT/PATCH/DELETE. Tự động làm sạch dữ liệu nhạy cảm (sanitization), gắn mã băm EventId và xuất báo cáo CSV an toàn.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `AuditLogsPage.tsx, AuditDetailModal.tsx`
  - **Backend API & Service:** `AuditController.getAuditLogs, AuditService.recordAuditLog, AuditInterceptor`
  - **Prisma Models / Database Tables:** `AuditLog, User, EventId (Unique Hash)`

#### 1. Sơ đồ Lớp (Class Diagram - FR-32)
![Class Diagram FR-32](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-32)
![Sequence Diagram FR-32](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.drawio)

---

## 7. BẢNG MA TRẬN TỔNG HỢP 65 SƠ ĐỒ & DANH MỤC TỆP THIẾT KẾ

Toàn bộ 65 sơ đồ UML chuẩn hóa đã được kết xuất thành 3 định dạng:
1. **PNG (2x Retina):** Dùng để chèn vào báo cáo Word / PDF và hiển thị sắc nét trên màn hình Retina.
2. **SVG (Pure Vector):** Định dạng vector co giãn vô hạn, dùng để in ấn khổ lớn hoặc nhúng web.
3. **Draw.io (Editable XML):** Định dạng gốc cho phép chỉnh sửa trực tiếp trên diagrams.net hoặc VS Code.

### ⭐ Tệp Tổng hợp Đa Tab Toàn Hệ thống (Master All-in-One Draw.io):
- **Đường dẫn tệp:** [SCANMS_All_Class_Sequence_Diagrams.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_All_Class_Sequence_Diagrams.drawio) *(Dung lượng: ~1.92 MB, chứa đầy đủ 65 tabs)*
- **Thư mục lưu trữ hình ảnh độc lập:** [docs/review 2/diagrams/](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/)

### 📊 Bảng tra cứu chi tiết 65 sơ đồ kỹ thuật:

| STT | Mã chức năng & Tên sơ đồ | Loại | Phụ trách chính | Tệp Ảnh Sắc nét (PNG) | Tệp Vector Gốc (SVG) | Tệp Thiết kế Draw.io |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **00** | **System Context Diagram** | **Context** | **Toàn đội ngũ** | [SCANMS_Context_Diagram.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.png) | [SCANMS_Context_Diagram.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.svg) | [SCANMS_Context_Diagram.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_Context_Diagram.drawio) |
| **01** | **FR-01:** ClassDiagram FR1 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR01.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.png) | [SCANMS_CD_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.svg) | [SCANMS_CD_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.drawio) |
| **02** | **FR-01:** Sequence FR1 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR01.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.png) | [SCANMS_SQ_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.svg) | [SCANMS_SQ_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.drawio) |
| **03** | **FR-02:** ClassDiagram FR2 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR02.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.png) | [SCANMS_CD_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.svg) | [SCANMS_CD_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.drawio) |
| **04** | **FR-02:** Sequence FR2 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR02.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.png) | [SCANMS_SQ_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.svg) | [SCANMS_SQ_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.drawio) |
| **05** | **FR-03:** ClassDiagram FR3 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR03.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.png) | [SCANMS_CD_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.svg) | [SCANMS_CD_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.drawio) |
| **06** | **FR-03:** Sequence FR3 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR03.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.png) | [SCANMS_SQ_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.svg) | [SCANMS_SQ_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.drawio) |
| **07** | **FR-04:** ClassDiagram FR4 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR04.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.png) | [SCANMS_CD_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.svg) | [SCANMS_CD_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.drawio) |
| **08** | **FR-04:** Sequence FR4 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR04.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.png) | [SCANMS_SQ_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.svg) | [SCANMS_SQ_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.drawio) |
| **09** | **FR-05:** Class Diagram FR5 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR05.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.png) | [SCANMS_CD_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.svg) | [SCANMS_CD_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.drawio) |
| **10** | **FR-05:** Sequence Diagram FR5 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR05.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.png) | [SCANMS_SQ_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.svg) | [SCANMS_SQ_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.drawio) |
| **11** | **FR-06:** Class Diagram FR6 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR06.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.png) | [SCANMS_CD_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.svg) | [SCANMS_CD_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.drawio) |
| **12** | **FR-06:** Sequence Diagram FR6 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR06.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.png) | [SCANMS_SQ_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.svg) | [SCANMS_SQ_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.drawio) |
| **13** | **FR-07:** Class Diagram FR7 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR07.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.png) | [SCANMS_CD_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.svg) | [SCANMS_CD_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.drawio) |
| **14** | **FR-07:** Sequence Diagram FR7 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR07.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.png) | [SCANMS_SQ_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.svg) | [SCANMS_SQ_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.drawio) |
| **15** | **FR-08:** Class Diagram FR8 | **Class** | Nguyễn Thành Thắng | [SCANMS_CD_FR08.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.png) | [SCANMS_CD_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.svg) | [SCANMS_CD_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.drawio) |
| **16** | **FR-08:** Sequence Diagram FR8 | **Sequence** | Nguyễn Thành Thắng | [SCANMS_SQ_FR08.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.png) | [SCANMS_SQ_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.svg) | [SCANMS_SQ_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.drawio) |
| **17** | **FR-09:** ClassDiagram FR9 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR09.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.png) | [SCANMS_CD_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.svg) | [SCANMS_CD_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.drawio) |
| **18** | **FR-09:** Sequence FR9 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR09.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.png) | [SCANMS_SQ_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.svg) | [SCANMS_SQ_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.drawio) |
| **19** | **FR-10:** ClassDiagram FR10 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR10.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.png) | [SCANMS_CD_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.svg) | [SCANMS_CD_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.drawio) |
| **20** | **FR-10:** Sequence FR10 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR10.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.png) | [SCANMS_SQ_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.svg) | [SCANMS_SQ_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.drawio) |
| **21** | **FR-11:** Class Diagram FR11 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR11.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.png) | [SCANMS_CD_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.svg) | [SCANMS_CD_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.drawio) |
| **22** | **FR-11:** Sequence Diagram FR11 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR11.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.png) | [SCANMS_SQ_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.svg) | [SCANMS_SQ_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.drawio) |
| **23** | **FR-12:** Class Diagram FR12 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR12.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.png) | [SCANMS_CD_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.svg) | [SCANMS_CD_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.drawio) |
| **24** | **FR-12:** Sequence Diagram FR12 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR12.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.png) | [SCANMS_SQ_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.svg) | [SCANMS_SQ_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.drawio) |
| **25** | **FR-13:** Class Diagram FR13 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR13.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.png) | [SCANMS_CD_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.svg) | [SCANMS_CD_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.drawio) |
| **26** | **FR-13:** Sequence Diagram FR13 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR13.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.png) | [SCANMS_SQ_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.svg) | [SCANMS_SQ_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.drawio) |
| **27** | **FR-14:** Class Diagram FR14 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR14.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.png) | [SCANMS_CD_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.svg) | [SCANMS_CD_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.drawio) |
| **28** | **FR-14:** Sequence Diagram FR14 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR14.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.png) | [SCANMS_SQ_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.svg) | [SCANMS_SQ_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.drawio) |
| **29** | **FR-15:** Class Diagram FR15 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR15.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.png) | [SCANMS_CD_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.svg) | [SCANMS_CD_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.drawio) |
| **30** | **FR-15:** Sequence Diagram FR15 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR15.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.png) | [SCANMS_SQ_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.svg) | [SCANMS_SQ_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.drawio) |
| **31** | **FR-16:** Class Diagram FR16 | **Class** | Nguyễn Đình Tuấn | [SCANMS_CD_FR16.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.png) | [SCANMS_CD_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.svg) | [SCANMS_CD_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.drawio) |
| **32** | **FR-16:** Sequence Diagram FR16 | **Sequence** | Nguyễn Đình Tuấn | [SCANMS_SQ_FR16.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.png) | [SCANMS_SQ_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.svg) | [SCANMS_SQ_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.drawio) |
| **33** | **FR-17:** Class Diagram FR17 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR17.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.png) | [SCANMS_CD_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.svg) | [SCANMS_CD_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.drawio) |
| **34** | **FR-17:** Sequence Diagram FR17 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR17.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.png) | [SCANMS_SQ_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.svg) | [SCANMS_SQ_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.drawio) |
| **35** | **FR-18:** Class Diagram FR18 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR18.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.png) | [SCANMS_CD_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.svg) | [SCANMS_CD_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.drawio) |
| **36** | **FR-18:** Sequence Diagram FR18 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR18.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.png) | [SCANMS_SQ_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.svg) | [SCANMS_SQ_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.drawio) |
| **37** | **FR-19:** Class Diagram FR19 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR19.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.png) | [SCANMS_CD_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.svg) | [SCANMS_CD_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.drawio) |
| **38** | **FR-19:** Sequence Diagram FR19 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR19.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.png) | [SCANMS_SQ_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.svg) | [SCANMS_SQ_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.drawio) |
| **39** | **FR-20:** Class Diagram FR20 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR20.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.png) | [SCANMS_CD_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.svg) | [SCANMS_CD_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.drawio) |
| **40** | **FR-20:** Sequence Diagram FR20 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR20.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.png) | [SCANMS_SQ_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.svg) | [SCANMS_SQ_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.drawio) |
| **41** | **FR-21:** Class Diagram FR21 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR21.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.png) | [SCANMS_CD_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.svg) | [SCANMS_CD_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.drawio) |
| **42** | **FR-21:** Sequence Diagram FR21 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR21.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.png) | [SCANMS_SQ_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.svg) | [SCANMS_SQ_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.drawio) |
| **43** | **FR-22:** Class Diagram FR22 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR22.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.png) | [SCANMS_CD_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.svg) | [SCANMS_CD_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.drawio) |
| **44** | **FR-22:** Sequence Diagram FR22 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR22.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.png) | [SCANMS_SQ_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.svg) | [SCANMS_SQ_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.drawio) |
| **45** | **FR-23:** Class Diagram FR23 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR23.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.png) | [SCANMS_CD_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.svg) | [SCANMS_CD_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.drawio) |
| **46** | **FR-23:** Sequence Diagram FR23 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR23.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.png) | [SCANMS_SQ_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.svg) | [SCANMS_SQ_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.drawio) |
| **47** | **FR-24:** Class Diagram FR24 | **Class** | Nguyễn Phú Quý | [SCANMS_CD_FR24.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.png) | [SCANMS_CD_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.svg) | [SCANMS_CD_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.drawio) |
| **48** | **FR-24:** Sequence Diagram FR24 | **Sequence** | Nguyễn Phú Quý | [SCANMS_SQ_FR24.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.png) | [SCANMS_SQ_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.svg) | [SCANMS_SQ_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.drawio) |
| **49** | **FR-25:** ClassDiagram FR25 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR25.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.png) | [SCANMS_CD_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.svg) | [SCANMS_CD_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.drawio) |
| **50** | **FR-25:** Sequence FR25 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR25.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.png) | [SCANMS_SQ_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.svg) | [SCANMS_SQ_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.drawio) |
| **51** | **FR-26:** ClassDiagram FR26 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR26.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.png) | [SCANMS_CD_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.svg) | [SCANMS_CD_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.drawio) |
| **52** | **FR-26:** Sequence FR26 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR26.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.png) | [SCANMS_SQ_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.svg) | [SCANMS_SQ_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.drawio) |
| **53** | **FR-27:** ClassDiagram FR27 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR27.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.png) | [SCANMS_CD_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.svg) | [SCANMS_CD_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.drawio) |
| **54** | **FR-27:** Sequence FR27 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR27.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.png) | [SCANMS_SQ_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.svg) | [SCANMS_SQ_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.drawio) |
| **55** | **FR-28:** ClassDiagram FR28 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR28.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.png) | [SCANMS_CD_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.svg) | [SCANMS_CD_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.drawio) |
| **56** | **FR-28:** Sequence FR28 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR28.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.png) | [SCANMS_SQ_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.svg) | [SCANMS_SQ_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.drawio) |
| **57** | **FR-29:** ClassDiagram FR29 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR29.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.png) | [SCANMS_CD_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.svg) | [SCANMS_CD_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.drawio) |
| **58** | **FR-29:** Sequence FR29 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR29.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.png) | [SCANMS_SQ_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.svg) | [SCANMS_SQ_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.drawio) |
| **59** | **FR-30:** ClassDiagram FR30 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR30.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.png) | [SCANMS_CD_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.svg) | [SCANMS_CD_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.drawio) |
| **60** | **FR-30:** Sequence FR30 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR30.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.png) | [SCANMS_SQ_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.svg) | [SCANMS_SQ_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.drawio) |
| **61** | **FR-31:** ClassDiagram FR31 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR31.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.png) | [SCANMS_CD_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.svg) | [SCANMS_CD_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.drawio) |
| **62** | **FR-31:** Sequence FR31 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR31.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.png) | [SCANMS_SQ_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.svg) | [SCANMS_SQ_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.drawio) |
| **63** | **FR-32:** ClassDiagram FR32 | **Class** | Phan Xuân Thịnh | [SCANMS_CD_FR32.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.png) | [SCANMS_CD_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.svg) | [SCANMS_CD_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.drawio) |
| **64** | **FR-32:** Sequence FR32 | **Sequence** | Phan Xuân Thịnh | [SCANMS_SQ_FR32.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.png) | [SCANMS_SQ_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.svg) | [SCANMS_SQ_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.drawio) |

---

## 8. CHECKLIST SẴN SÀNG BẢO VỆ REVIEW 2 & HỘI ĐỒNG 1.1

- [x] **Tính đầy đủ (Completeness):** Đã kết xuất 100% đầy đủ 65 sơ đồ (32 Class Diagrams + 32 Sequence Diagrams + 1 Context Diagram).
- [x] **Tính chuẩn xác UML 2.5:**
  - Class Diagram: Phân tách rõ tầng Presentation (React Component), Client API (Service Object), Backend Layer (Controller/Service/DTO), Infrastructure (PrismaService) và Data Persistence (Prisma Models).
  - Sequence Diagram: Thể hiện đúng lifelines, activation boxes, kiểu mũi tên (Solid line cho request đồng bộ, Dashed line cho return value, Open arrow cho async/event), đầy đủ mã lỗi (400, 401, 403, 404, 429).
- [x] **Tính khớp nối mã nguồn thực tế (Current Implementation Truth):** Sơ đồ đối chiếu chuẩn xác với mã nguồn đang chạy thật trong workspace (`frontend/src/` & `backend/src/`), tuyệt đối không dùng sơ đồ vẽ nháp hay thiết kế viển vông chưa cài đặt.
- [x] **Tính minh bạch trách nhiệm cá nhân:** 4 thành viên được phân định ranh giới chức năng rõ ràng, mỗi thành viên làm chủ 8 FRs (16 sơ đồ), cam kết phản biện code và trả lời trực tiếp trước Giảng viên Thẩm định Review 2 và Hội đồng 1.1.
