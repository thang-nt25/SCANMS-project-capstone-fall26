# ĐẶC TẢ THIẾT KẾ UML 2.5: PHÂN HỆ 1: XÁC THỰC, BẢO MẬT & VẬN HÀNH CỐT LÕI
## DỰ ÁN CAPSTONE: SCANMS (FA26SE032)
**Phạm vi chức năng:** FR-01 đến FR-08 (16 Sơ đồ kỹ thuật: 8 Class Diagrams + 8 Sequence Diagrams)  
**Thành viên chịu trách nhiệm chính & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**  

---

## 1. TỔNG QUAN PHÂN HỆ & CAM KẾT CODE DEFENSE

- **Người phụ trách:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Tỷ trọng đóng góp:** **25%** toàn hệ thống SCANMS
- **Tệp thiết kế Draw.io độc lập (16 Tabs):** [SCANMS_UML_Part1_Thang_FR01_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part1_Thang_FR01_FR08.drawio)
- **Thư mục ảnh PNG & SVG gốc:** [docs/review 2/diagrams/](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/)

### 🎯 Các điểm mấu chốt bảo vệ mã nguồn (Code Defense Points):
1. **Cơ chế băm mật khẩu Argon2id chống brute-force và bcrypt fallback**
2. **Xác thực 2 tầng JWT Access Token (15m) + Refresh Token (7d HttpOnly Cookie)**
3. **Phân quyền RBAC Guard chặn đứng từ API Gateway & Frontend Router**
4. **Quy trình nộp & thẩm duyệt hồ sơ định danh KYC 2 luồng (Nghị định 85/2021/NĐ-CP)**

---

## 2. CHI TIẾT CÁC CHỨC NĂNG (FR-01 ĐẾN FR-08)

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

---

### FR-08: Kho nội dung số tập trung (Media Hub) chia sẻ tài nguyên quảng bá

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Thành Thắng (Leader - SE184251)**
- **Mô tả nghiệp vụ:** Kho lưu trữ ảnh banner, video review gốc, file tài liệu hướng dẫn bán hàng do Shop tải lên để KOL tự do khai thác phục vụ chiến dịch tiếp thị mà không bị vỡ bản quyền.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `MediaHubPage.tsx, AssetPreviewModal.tsx`
  - **Backend API & Service:** `MediaController.uploadAsset, MediaService.listAssets, MediaService.getDownloadUrl`
  - **Prisma Models / Database Tables:** `MediaAsset, Store, Product, CollaboratorProfile`

##

---

## 3. DANH MỤC 16 TỆP SƠ ĐỒ KỸ THUẬT (BẢNG TRA CỨU)

| STT | Mã chức năng & Tên sơ đồ | Loại | Tệp Ảnh (PNG 2x) | Tệp Vector (SVG) | Tệp Thiết kế Draw.io |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **01** | **FR-01:** ClassDiagram FR1 | **Class Diagram** | [SCANMS_CD_FR01.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.png) | [SCANMS_CD_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.svg) | [SCANMS_CD_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR01.drawio) |
| **02** | **FR-01:** Sequence FR1 | **Sequence Diagram** | [SCANMS_SQ_FR01.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.png) | [SCANMS_SQ_FR01.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.svg) | [SCANMS_SQ_FR01.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR01.drawio) |
| **03** | **FR-02:** ClassDiagram FR2 | **Class Diagram** | [SCANMS_CD_FR02.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.png) | [SCANMS_CD_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.svg) | [SCANMS_CD_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR02.drawio) |
| **04** | **FR-02:** Sequence FR2 | **Sequence Diagram** | [SCANMS_SQ_FR02.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.png) | [SCANMS_SQ_FR02.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.svg) | [SCANMS_SQ_FR02.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR02.drawio) |
| **05** | **FR-03:** ClassDiagram FR3 | **Class Diagram** | [SCANMS_CD_FR03.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.png) | [SCANMS_CD_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.svg) | [SCANMS_CD_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR03.drawio) |
| **06** | **FR-03:** Sequence FR3 | **Sequence Diagram** | [SCANMS_SQ_FR03.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.png) | [SCANMS_SQ_FR03.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.svg) | [SCANMS_SQ_FR03.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR03.drawio) |
| **07** | **FR-04:** ClassDiagram FR4 | **Class Diagram** | [SCANMS_CD_FR04.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.png) | [SCANMS_CD_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.svg) | [SCANMS_CD_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR04.drawio) |
| **08** | **FR-04:** Sequence FR4 | **Sequence Diagram** | [SCANMS_SQ_FR04.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.png) | [SCANMS_SQ_FR04.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.svg) | [SCANMS_SQ_FR04.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR04.drawio) |
| **09** | **FR-05:** Class Diagram FR5 | **Class Diagram** | [SCANMS_CD_FR05.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.png) | [SCANMS_CD_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.svg) | [SCANMS_CD_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR05.drawio) |
| **10** | **FR-05:** Sequence Diagram FR5 | **Sequence Diagram** | [SCANMS_SQ_FR05.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.png) | [SCANMS_SQ_FR05.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.svg) | [SCANMS_SQ_FR05.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR05.drawio) |
| **11** | **FR-06:** Class Diagram FR6 | **Class Diagram** | [SCANMS_CD_FR06.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.png) | [SCANMS_CD_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.svg) | [SCANMS_CD_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR06.drawio) |
| **12** | **FR-06:** Sequence Diagram FR6 | **Sequence Diagram** | [SCANMS_SQ_FR06.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.png) | [SCANMS_SQ_FR06.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.svg) | [SCANMS_SQ_FR06.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR06.drawio) |
| **13** | **FR-07:** Class Diagram FR7 | **Class Diagram** | [SCANMS_CD_FR07.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.png) | [SCANMS_CD_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.svg) | [SCANMS_CD_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR07.drawio) |
| **14** | **FR-07:** Sequence Diagram FR7 | **Sequence Diagram** | [SCANMS_SQ_FR07.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.png) | [SCANMS_SQ_FR07.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.svg) | [SCANMS_SQ_FR07.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR07.drawio) |
| **15** | **FR-08:** Class Diagram FR8 | **Class Diagram** | [SCANMS_CD_FR08.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.png) | [SCANMS_CD_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.svg) | [SCANMS_CD_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR08.drawio) |
| **16** | **FR-08:** Sequence Diagram FR8 | **Sequence Diagram** | [SCANMS_SQ_FR08.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.png) | [SCANMS_SQ_FR08.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.svg) | [SCANMS_SQ_FR08.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR08.drawio) |

---

## 4. CHECKLIST SẴN SÀNG BẢO VỆ

- [x] Thuộc lòng 100% luồng tương tác và các bước xử lý trong 8 sơ đồ Sequence Diagram.
- [x] Nắm rõ cấu trúc class, kiểu dữ liệu DTO, quan hệ thực thể Prisma trong 8 sơ đồ Class Diagram.
- [x] Mở sẵn file code thật trong VS Code và sẵn sàng trình diễn trong vòng 15 giây khi GV Review 2 đặt câu hỏi.
