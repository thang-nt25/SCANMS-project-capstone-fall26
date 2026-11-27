# KỊCH BẢN THUYẾT TRÌNH REVIEW 2 (CAPSTONE PROJECT DEFENSE)
**HỆ THỐNG QUẢN LÝ ĐỘI NGŨ CỘNG TÁC VIÊN BÁN HÀNG VÀ TIẾP THỊ LIÊN KẾT (SCANMS — FA26SE032)**
* **Tên tiếng Anh chính thức**: Sales Collaborator and Affiliate Network Management System
* **Mã đề tài**: FA26SE032
* **Chuyên ngành**: Kỹ thuật phần mềm (Software Engineering) – Đại học FPT TP.HCM
* **Giảng viên hướng dẫn**: ThS. Tôn Thất Hoàng Minh
* **Hội đồng phản biện**: Reviewer 1 (Thầy longt5), Reviewer 2 (Thầy ThinhDP2)
* **Thời lượng dự kiến**: 12 – 15 phút thuyết trình + Demo & Q&A

---

## 1. BẢNG PHÂN BỔ THỜI GIAN VÀ PHÂN VAI THUYẾT TRÌNH (5 WORKFLOWS SOLE-OWNER)

| Chặng | Slide | Nội dung trình bày | Người phụ trách | Thời lượng |
| :---: | :---: | :--- | :--- | :---: |
| **Chặng 1** | **Slide 1 – 5** | Mở đầu, Bản sắc Doanh nghiệp Đa Nhãn hàng, Kiến trúc đa tầng (Modular Monolith, CQRS, NestJS, React, PostgreSQL 16), Conceptual ERD, 5 vai trò (RBAC) & tính năng đặc thù | **Nguyễn Thành Thắng** (Leader) | **3 phút 45s** |
| **Chặng 2** | **Slide 6 & 7** | **WF-01:** Khởi tạo Cửa hàng & Nhân sự Nội bộ, Tuyển mộ Cộng tác viên Đa kênh, Thẩm định eKYC Maker-Checker, Kích hoạt Bậc Đồng (10%) & Kết nạp Đối tác Cửa hàng (`StoreCollaborator`) | **Nguyễn Thành Thắng** (WF-01) | **2 phút 15s** |
| **Chặng 3** | **Slide 8 & 9** | **WF-02:** Quản trị Sản phẩm Biến thể 2 Cấp (Khóa Ngành hàng & Bảo vệ Giá sàn `floorPrice`), Đề xuất AI Matching & Đàm phán Thỏa thuận Thù lao Độc quyền 2 Chiều qua Chat Đính kèm File (`<= 16%` Shop duyệt, `> 16%` leo thang Admin duyệt, trần `25%`) | **Phan Xuân Thịnh** (WF-02) | **2 phút 15s** |
| **Chặng 4** | **Slide 10 & 11** | **WF-03:** Cấp phát Hàng mẫu Trải nghiệm SLA 14 Ngày, Khởi tạo Công cụ Tiếp thị Định danh (Smart Link `/r/:code`, Dynamic QR, Voucher Deal Độc quyền KOL `THAONHI16`) & Ghi nhận Đơn hàng Chống Gian lận Tự mua (`SELF_REFERRAL`) | **Nguyễn Đình Tuấn** (WF-03) | **2 phút 30s** |
| **Chặng 5** | **Slide 12 & 13** | **WF-04:** Thực thi Giao vận GHN Đa kho Nội bộ, Đối soát Đổi trả 14 Ngày (Đổi mới 1-1 Bảo lưu Thù lao vs Hoàn tiền Kích hoạt Clawback) & Theo dõi Tiến độ Thỏa thuận KPI | **Nguyễn Phú Quý** (WF-04) | **2 phút 30s** |
| **Chặng 6** | **Slide 14 & 15** | **WF-05:** Quyết toán Thù lao 2 Giai đoạn (Giải ngân `10% + Bậc` sau 14 ngày & Kết chuyển Phần chênh lệch `Deal% - (10% + Bậc)` khi đạt 100% KPI), Rút tiền Khấu trừ Thuế TNCN 10% (Pessimistic Row-Level Lock) & Báo cáo Sổ cái Kiểm toán Doanh nghiệp (`Executive Financial Ledger`) | **Nguyễn Thành Thắng & Nguyễn Đình Tuấn** (WF-05) | **2 phút 30s** |
| **Chặng 7** | **Slide 16** | Tổng kết cam kết Review 2 (24 Phân hệ, 64 Sơ đồ UML chuẩn B&W FPT, 293 trang tài liệu) & Mời Hội đồng phản biện Q&A | **Nguyễn Thành Thắng** (Leader) | **0 phút 45s** |
| **Tổng** | **16 Slides** | **Toàn bộ kiến trúc, dữ liệu và 5 luồng nghiệp vụ E2E kèm kiểm thử UAT** | **Toàn đội FA26SE032** | **16 phút 30s** |

---

## 2. NỘI DUNG KỊCH BẢN CHI TIẾT THEO TỪNG SLIDE

```
SLIDE 1: GIỚI THIỆU DỰ ÁN SCANMS (PROJECT INTRODUCTION)
```
* **Thời lượng**: 45 giây
* **Người trình bày**: Nguyễn Thành Thắng (Team Leader)
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Tôn Thất Hoàng Minh - Giảng viên hướng dẫn, kính thưa Thầy longt5 và Thầy ThinhDP2 trong Hội đồng phản biện Review 2,
>
> Em là Nguyễn Thành Thắng, đại diện nhóm sinh viên FA26SE032. Hôm nay, nhóm chúng em xin phép được báo cáo tiến độ và bảo vệ đồ án tốt nghiệp Capstone với đề tài: **SCANMS – Sales Collaborator & Affiliate Network Management System (Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết)**.
>
> 1. Về bản sắc và mô hình hoạt động cốt lõi:
> Khác biệt hoàn toàn với các sàn thương mại điện tử mở (như Shopee hay Lazada), SCANMS được định vị là **Hệ thống Quản lý Nội bộ cấp Doanh nghiệp Đa Nhãn Hàng (Enterprise In-House Multi-Store Collaborator & Affiliate Management System)** — thuộc sở hữu của một doanh nghiệp vận hành 4 khối Cửa hàng nội bộ (In-House Stores):
> * Store 1: **Sora Skincare & Cosmetics** (Mỹ phẩm & Chăm sóc da chuyên sâu)
> * Store 2: **Aura Activewear & Apparel** (Thời trang & May mặc thể thao năng động)
> * Store 3: **GreenBio Health & Nutrition** (Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên)
> * Store 4: **Lumière Smart Living** (Thiết bị gia dụng & Đồ bếp thông minh)
>
> 2. Nguyên tắc tổ chức bất biến:
> **"Cửa hàng (Store) và Quản lý cửa hàng (Shop Manager) là nhân sự nội bộ doanh nghiệp do System Admin bổ nhiệm — Cộng tác viên / KOL / KOC là đối tác tiếp thị bên ngoài được tuyển mộ, ký thỏa thuận thù lao và quyết toán thu nhập minh bạch"**. Cổng mua sắm Customer trên Web/Mobile đóng vai trò là First-Party Attribution Storefront giúp doanh nghiệp nắm 100% dữ liệu đơn hàng thực, trạng thái giao vận GHN và đối soát đổi trả 14 ngày.

---

```
SLIDE 2: NỘI DUNG BÁO CÁO (AGENDA)
```
* **Thời lượng**: 30 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Bài thuyết trình của nhóm hôm nay được cấu trúc mạch lạc thành 4 phần trọng tâm theo đúng tiến trình phát triển phần mềm chuẩn mực FPT University:
>
> 1. **System Architecture & 24 Subsystems**: Tổng quan kiến trúc đa tầng (Client - Reverse Proxy - NestJS Modular Monolith - Persistence & Cache - Third-Party Gateways) và cơ sở lựa chọn công nghệ (Technical Rationale & Trade-offs).
> 2. **Conceptual Data Model & 5 Roles (RBAC)**: Mô hình thực thể miền (Domain Model ERD) và Ma trận 5 vai trò cùng các đặc quyền nghiệp vụ chuẩn hóa.
> 3. **Five Core Business Workflows & UAT Validation**: Đi sâu vào 5 luồng nghiệp vụ cốt lõi (WF-01 đến WF-05), chứng minh kỳ vọng và mong muốn đạt được khi thực hiện các Test Cases (cả Happy Path lẫn Exception Handling).
> 4. **Financial Ledger & Two-Phase Settlement**: Minh chứng cơ chế quyết toán thù lao 2 giai đoạn (không cộng dồn Deal với Bậc), khóa dòng rút tiền và khấu trừ 10% thuế TNCN tại nguồn.

---

```
SLIDE 3: KIẾN TRÚC HỆ THỐNG – CÔNG NGHỆ & LÝ DO CHỌN LỰA
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Về mặt kiến trúc, nhóm áp dụng mô hình **Multi-Tier Clean Architecture / Modular Monolith kết hợp mô hình CQRS** (Command Query Responsibility Segregation) chia tách triệt để 24 phân hệ nghiệp vụ độc lập:
>
> * **Backend Framework (NestJS + TypeScript)**: Nhóm chọn NestJS vì cơ chế Dependency Injection và Module cô lập theo ranh giới nghiệp vụ (Bounded Contexts: Auth, Products, Orders, Commission, Payouts). Kiến trúc này giúp mã nguồn cực kỳ mạch lạc, dễ viết Unit/Integration test và bảo đảm nguyên lý Single Responsibility.
> * **Cơ sở dữ liệu (PostgreSQL 16 + Prisma ORM)**: SCANMS là hệ thống tài chính đòi hỏi tính toàn vẹn tuyệt đối (ACID). Nhóm chọn PostgreSQL vì hỗ trợ giao dịch nghiêm ngặt, chỉ mục partial index và cơ chế khóa dòng bi quan `SELECT ... FOR UPDATE` nhằm ngăn chặn triệt để gian lận rút đúp tiền (Double-Spending).
> * **Bộ nhớ đệm & Phân luồng (Redis 7)**: Đảm nhiệm 3 nhiệm vụ trọng yếu: lưu trữ OTP có thời hạn sống (TTL 5 phút), kiểm soát tốc độ gửi yêu cầu (Rate Limiting 100 req/min) và đệm dữ liệu danh mục sản phẩm nhằm đạt p95 API response time dưới 200ms.
> * **Frontend (React 18, Vite & Tailwind CSS)**: Tốc độ build dưới 3 giây, bundle size nén brotli dưới 500KB. Toàn bộ giao diện được thiết kế chuẩn theo bảng màu **Vàng Be (Warm Sand & Brand Gold: #FAF8F5, #C59B58, #1A1612)** sang trọng dành riêng cho nền tảng đối tác doanh nghiệp.
> * **Mobile Application (React Native / Expo tại `Mobile/`)**: Phục vụ riêng cho Creator lấy Smart Link, Dynamic QR, Voucher độc quyền, đàm phán hợp đồng qua Chat Socket.IO và tạo lệnh rút tiền Napas 24/7 mọi lúc mọi nơi.
> * **Tích hợp bên thứ ba**: Giao Hàng Nhanh (GHN Sandbox API) cho logistics đa kho nội bộ; PayOS (VietQR) cho cổng thanh toán; Socket.IO cho đàm phán hợp đồng thời gian thực độ trễ dưới 50ms.

---

```
SLIDE 4: MÔ HÌNH DỮ LIỆU MIỀN & 5 VAI TRÒ HỆ THỐNG (RBAC)
```
* **Thời lượng**: 45 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Trên màn hình là **Domain Model Class Diagram (Conceptual ERD)** gồm 18 thực thể cốt lõi chia thành 6 cụm liên kết chặt chẽ:
>
> 1. Cụm Định danh & Tài chính: `User`, `Profile`, `KycDossier`, `Wallet`, `CommissionLedger`, `PayoutTransaction`.
> 2. Cụm Cửa hàng & Sản phẩm: `Store`, `Category`, `Product`, `ProductVariant` (có trường `floorPrice` bắt buộc), `SampleOrder`.
> 3. Cụm Tiếp thị & Đối soát: `StoreCollaborator`, `ExclusiveDeal`, `Coupon`, `ReferralLink`, `SalesOrder`, `OrderItem`, `ReturnRequest`.
>
> Về phân quyền, hệ thống vận hành với **5 vai trò độc lập**:
> 1. `CUSTOMER`: Mua hàng xác thực tài khoản, áp mã Voucher Deal độc quyền của KOL, theo dõi GHN và khiếu nại đổi trả trong 14 ngày.
> 2. `COLLABORATOR`: Nộp eKYC, phân hạng Bậc (Đồng 10%, Bạc 11%, Vàng 12%, Kim Cương 13%), đàm phán Deal độc quyền với Shop, mượn hàng mẫu SLA 14 ngày, sinh công cụ tiếp thị và theo dõi từng giỏ tiền thù lao.
> 3. `SHOP_MANAGER`: Quản lý nội bộ cửa hàng, quản trị sản phẩm có khóa ngành hàng và bảo vệ giá sàn `floorPrice`, đàm phán Deal độc quyền (`<= 16%` tự duyệt, `> 16%` chuyển Admin), duyệt cấp mẫu thử.
> 4. `SYSTEM_MANAGER`: Chuyên viên vận hành & kế toán đối soát: duyệt eKYC Maker-Checker, kiểm duyệt sản phẩm mới, phân xử đổi trả 1-1 vs hoàn tiền kích hoạt Clawback, đối soát và giải ngân rút tiền (khấu trừ 10% thuế TNCN).
> 5. `SYSTEM_ADMIN`: Tổng giám đốc: tạo Cửa hàng & bổ nhiệm Shop Manager, phê duyệt bắt buộc các Deal thù lao `> 16%` (trần tối đa `25%`), giám sát Sổ cái kiểm toán & Executive Financial Dashboard.

---

```
SLIDE 5: MA TRẬN TÍNH NĂNG ĐẶC THÙ & CÁC CHỨC NĂNG ĐÃ BÃI BỎ
```
* **Thời lượng**: 45 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Để bảo vệ biên lợi nhuận doanh nghiệp và nâng cao tính chuyên nghiệp, SCANMS đã thực hiện rà soát phạm vi nghiêm ngặt:
>
> * **4 nhóm tính năng đã bãi bỏ vĩnh viễn**:
>   1. Bãi bỏ cơ chế gom đợt khuyến mãi đại trà cũ (thay thế hoàn toàn bằng Deal Độc quyền và Quản trị giá sàn `floorPrice`).
>   2. Bãi bỏ kho tài nguyên số Media Hub (thay bằng việc gửi ảnh HD/video/file trực tiếp qua tin nhắn Chat Socket.IO).
>   3. Bãi bỏ voucher sàn công khai và voucher giảm giá đại trà của shop (chỉ duy trì duy nhất Voucher Deal Độc quyền gắn với KOL).
>   4. Bãi bỏ đăng ký mở shop tự do hoặc nâng cấp từ khách lên chủ shop.
> * **Tính năng đặc thù vượt trội**:
>   - Đàm phán Deal thù lao 2 chiều có kiểm soát trần 2 cấp (`<= 16%` Shop duyệt, `> 16%` Admin duyệt, trần `25%`).
>   - Khóa giá sàn `floorPrice` tại biến thể sản phẩm chống bán phá giá.
>   - Quyết toán thù lao 2 giai đoạn: Giải ngân `10% + Bậc` sau 14 ngày trả hàng sạch; giữ lại phần chênh lệch `Deal% - (10% + Bậc)` chờ đạt đủ 100% KPI cam kết.

---

```
SLIDE 6: FLOW 1 – KHỞI TẠO CỬA HÀNG, TUYỂN MỘ CTV & THẨM ĐỊNH eKYC (WF-01)
```
* **Thời lượng**: 1 phút 00 giây
* **Người trình bày**: Nguyễn Thành Thắng (Owner: WF-01)
* **Lời thoại thuyết trình**:
> Em xin đi vào luồng nghiệp vụ đầu tiên: **WF-01 – Khởi tạo Cửa hàng & Bổ nhiệm Nhân sự, Tuyển mộ Cộng tác viên Đa kênh, Thẩm định eKYC Maker-Checker & Kích hoạt Bậc Đồng (10%)**:
>
> * Bước 1: System Admin khởi tạo Cửa hàng nội bộ (ví dụ Sora Skincare), gắn mã kho vệ tinh GHN và cấp tài khoản cho Shop Manager.
> * Bước 2: Ứng viên Cộng tác viên đăng ký tài khoản qua Email OTP 6 số (mã hóa Argon2id, token JWT 15 phút, OTP lưu Redis TTL 5 phút).
> * Bước 3: Ứng viên nộp hồ sơ eKYC gồm: Số CCCD 12 số, ảnh chụp 2 mặt CCCD, thông tin ngân hàng nhận tiền và danh mục các kênh mạng xã hội (TikTok, Facebook, YouTube) kèm ảnh chụp chứng minh quyền sở hữu.
> * Bước 4: Chuyên viên System Manager thẩm định hồ sơ theo nguyên tắc Maker-Checker: kiểm tra tính hợp lệ của giấy tờ. Khi bấm Approve, trạng thái tài khoản chuyển sang ACTIVE, KYC VERIFIED, tự động khởi tạo Ví thù lao gắn Bậc khởi điểm là **BẬC ĐỒNG (Bronze — 10% cơ bản)** và liên kết ứng viên vào bảng `StoreCollaborator` của Cửa hàng.

---

```
SLIDE 7: UAT VALIDATION – WF-01: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Thành Thắng (Owner: WF-01)
* **Lời thoại thuyết trình**:
> Kỳ vọng kiểm thử đối với Workflow 1:
>
> 1. **Luồng thành công (Happy Path)**:
> * `TC_KYC_01 & 02`: Khi CTV đăng ký và nhập đúng mã OTP gửi về Email trong vòng 5 phút, hệ thống cấp phát Access Token; khi CTV nộp hồ sơ CCCD hợp lệ, trạng thái hồ sơ chuyển sang `PENDING_REVIEW`; khi System Manager phê duyệt, hệ thống tự động sinh Ví tiền, kích hoạt Bậc Đồng 10% và cập nhật huy hiệu đối tác xác minh.
> 2. **Luồng xử lý ngoại lệ (Exception Handling)**:
> * `TC_KYC_03`: Nếu CTV nhập sai OTP quá 5 lần liên tiếp, Redis kích hoạt cơ chế khóa tạm thời 15 phút chống brute-force.
> * `TC_KYC_04`: Nếu tải ảnh mờ hoặc số CCCD không đúng 12 chữ số, form hiển thị thông báo lỗi màu đỏ tại chỗ và vô hiệu hóa nút gửi; khi System Manager từ chối (Reject), BẮT BUỘC PHẢI NHẬP LÝ DO PHẢN HỒI (Feedback Note) để CTV biết chính xác cần chụp lại mặt nào và nộp lại hồ sơ mà không bị xóa tài khoản.

---

```
SLIDE 8: FLOW 2 – QUẢN TRỊ SẢN PHẨM, GIÁ SÀN & ĐÀM PHÁN DEAL ĐỘC QUYỀN (WF-02)
```
* **Thời lượng**: 1 phút 00 giây
* **Người trình bày**: Phan Xuân Thịnh (Owner: WF-02)
* **Lời thoại thuyết trình**:
> Tiếp theo là **WF-02: Quản trị Sản phẩm Biến thể 2 Cấp (Khóa Ngành hàng & Bảo vệ Giá sàn `floorPrice`), Đề xuất AI Matching & Đàm phán Thỏa thuận Thù lao Độc quyền 2 Chiều qua Chat Đính kèm File**, do em Phan Xuân Thịnh phụ trách:
>
> * **Quản trị Sản phẩm & Giá sàn**: Shop Manager quản lý sản phẩm theo danh mục khóa cứng (`Category Lock`). Tại bảng biến thể (Màu sắc / Kích cỡ), mỗi biến thể bắt buộc phải có giá bán (`price`) và **Giá sàn thấp nhất (`floorPrice`)**. Hệ thống chặn hoàn toàn mọi hành vi giảm giá bán hoặc áp voucher vượt dưới giá sàn này nhằm bảo vệ tuyệt đối lợi nhuận biên của cửa hàng.
> * **AI Matching & Đàm phán Deal 2 chiều**:
>   - Shop Manager dùng AI Matching phân tích tệp người theo dõi và thế mạnh của KOL để gửi lời mời chiến dịch.
>   - Hai bên thương thảo trực tiếp qua khung Chat Socket.IO (gửi kèm ảnh HD, video, bảng thỏa thuận KPI).
>   - **Quy tắc phân quyền duyệt Deal 2 cấp**:
>     • Mức thù lao đề xuất **`<= 16%`**: Shop Manager có toàn quyền bấm Duyệt (Approve).
>     • Mức thù lao đề xuất **`> 16%` đến trần `25%`**: Hệ thống tự động chuyển trạng thái `PENDING_ADMIN_APPROVAL` và gửi cảnh báo leo thang lên System Admin phê duyệt.
>     • Trần tuyệt đối toàn hệ thống là **`25%`**: Mọi đề xuất vượt quá 25% đều bị backend chặn ngay lập tức.

---

```
SLIDE 9: UAT VALIDATION – WF-02: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Phan Xuân Thịnh (Owner: WF-02)
* **Lời thoại thuyết trình**:
> Kỳ vọng kiểm thử đối với Workflow 2:
>
> 1. **Luồng thành công (Happy Path)**:
> * `TC_DEAL_01 & 02`: Khi Shop Manager hoặc KOL gửi đề xuất thù lao, tin nhắn hiển thị dưới dạng Thẻ hợp đồng tương tác (Interactive Deal Card) trong khung Chat Socket.IO với độ trễ dưới 50ms; khi mức đề xuất là 14% (`<= 16%`), Shop Manager bấm Duyệt thì trạng thái deal chuyển ngay sang `AGREED`, tự động sinh mã Coupon Độc quyền (ví dụ `THAONHI16`) và liên kết vào tài khoản KOL.
> 2. **Luồng xử lý ngoại lệ (Exception Handling)**:
> * `TC_DEAL_03 (Quy tắc trần và leo thang Admin)`: Nếu KOL đề xuất mức 18% (`> 16%`), nút Duyệt của Shop Manager chuyển thành "Chuyển Admin xét duyệt"; khi System Admin vào bảng điều khiển phê duyệt thì Deal mới chính thức có hiệu lực. Nếu bất kỳ bên nào cố tình nhập tỷ lệ > 25%, hệ thống lập tức báo lỗi và chặn gửi đề xuất.
> * `TC_DEAL_04 (Bảo vệ giá sàn floorPrice)`: Nếu Shop Manager chỉnh sửa giá sản phẩm hoặc tạo coupon làm giá bán sau chiết khấu thấp hơn `floorPrice`, hệ thống chặn giao dịch và hiển thị cảnh báo vi phạm giá sàn.

---

```
SLIDE 10: FLOW 3 – CẤP HÀNG MẪU SLA 14 NGÀY & CHECKOUT FIRST-PARTY (WF-03)
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn (Owner: WF-03)
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Cô, tiếp theo là **WF-03: Cấp phát Hàng mẫu Trải nghiệm SLA 14 Ngày, Khởi tạo Công cụ Tiếp thị Định danh & Ghi nhận Đơn hàng Chống Gian lận Tự mua**, do em Nguyễn Đình Tuấn phụ trách:
>
> * **Cấp phát Hàng mẫu SLA 14 ngày**: KOL sau khi kết nạp có quyền mượn sản phẩm mẫu trải nghiệm 0đ. Shop Manager xét duyệt hạn ngạch và gửi hàng qua GHN. Ngay khi bưu kiện được giao thành công, hệ thống kích hoạt **đồng hồ đếm ngược SLA 14 ngày**. KOL có nghĩa vụ đăng tải video review và nộp link nghiệm thu vào hệ thống. Nếu quá 14 ngày không nộp, hệ thống chuyển hồ sơ sang trạng thái cảnh báo vi phạm để trọng tài xử lý.
> * **Công cụ Tiếp thị Định danh**: KOL tạo Smart Link rút gọn `/r/:code` và Dynamic QR code độc quyền. Khách hàng bấm link sẽ được ghi nhận cookie Last-Click trong 30 ngày.
> * **Cổng Mua sắm First-Party & Chống gian lận tự mua**:
>   - Đơn hàng bắt buộc phải gắn với tài khoản khách hàng thực (`customerId`).
>   - Hệ thống tự động kiểm tra đối chiếu chéo: nếu phát hiện tài khoản mua hàng trùng khớp với tài khoản KOL sở hữu mã tiếp thị (Self-Referral), đơn hàng vẫn được xử lý giao dịch nhưng ghi nhận thù lao = 0đ với lý do `SELF_REFERRAL_BLOCKED`.
>   - Khách áp mã Voucher Deal Độc quyền của KOL (ví dụ `THAONHI16`), thanh toán qua PayOS (VietQR) hoặc COD, đơn hàng được ghi nhận và đưa vào chu trình đối soát.

---

```
SLIDE 11: UAT VALIDATION – WF-03: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn (Owner: WF-03)
* **Lời thoại thuyết trình**:
> Kỳ vọng kiểm thử đối với Workflow 3:
>
> 1. **Luồng thành công (Happy Path)**:
> * `TC_ATTR_01 & 02`: Khi KOL bấm sinh link tiếp thị, hệ thống tạo ra URL rút gọn `/r/:code` và mã QR tải về file PNG; khi khách hàng click link, cookie ghi nhận đúng 30 ngày; nếu khách click tiếp link của KOL thứ hai thì cookie tự động ghi đè sang KOL thứ hai theo đúng luật Last-Click.
> * `TC_SAMPLE_01`: KOL xin mẫu thử $\rightarrow$ Shop Manager duyệt $\rightarrow$ GHN giao thành công $\rightarrow$ SLA 14 ngày bắt đầu đếm ngược; KOL nộp link video TikTok review $\rightarrow$ Shop Manager nghiệm thu hoàn tất.
> 2. **Luồng xử lý ngoại lệ (Exception Handling)**:
> * `TC_ATTR_03 (Chống tự mua Self-Referral)`: Khi tài khoản KOL tự đặt mua sản phẩm qua chính link hoặc mã coupon của mình, hệ thống lập tức gắn cờ `SELF_REFERRAL_DETECTED`, gán tỷ lệ thù lao = 0% và không ghi nhận doanh số xét thưởng.
> * `TC_SAMPLE_02 (Vi phạm hạn 14 ngày)`: Nếu sau 14 ngày kể từ khi nhận hàng mẫu mà KOL không nộp link review, hệ thống tự động khóa quyền xin mẫu thử mới và gửi thông báo cảnh báo lên System Manager.

---

```
SLIDE 12: FLOW 4 – GIAO VẬN GHN, ĐỐI SOÁT ĐỔI TRẢ 14 NGÀY & THEO DÕI KPI (WF-04)
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Phú Quý (Owner: WF-04)
* **Lời thoại thuyết trình**:
> Tiếp theo là **WF-04: Thực thi Giao vận GHN Đa kho Nội bộ, Đối soát Đổi trả 14 Ngày & Theo dõi Tiến độ Thỏa thuận KPI**, do em Nguyễn Phú Quý phụ trách:
>
> * **Giao vận GHN Đa kho Nội bộ**: Tích hợp trực tiếp bưu cục GHN API kết nối 4 kho hàng vệ tinh của 4 Store. Khi Shop bấm chuẩn bị hàng, hệ thống sinh mã vận đơn AWB thực tế, lưu vết hành trình và cập nhật trạng thái đơn hàng thời gian thực qua Webhook GHN.
> * **Đối soát Đổi trả 14 Ngày (1-1 Exchange vs Refund Clawback)**:
>   - Trong vòng 14 ngày kể từ khi giao hàng thành công (`DELIVERED`), khách hàng có quyền gửi yêu cầu đổi trả kèm hình ảnh/video unboxing.
>   - **Trường hợp Đổi hàng 1-1 (do lỗi vận chuyển/sản xuất)**: Shop gửi bù sản phẩm mới, hệ thống **BẢO LƯU 100% THÙ LAO** cho KOL, không trừ doanh số KPI.
>   - **Trường hợp Trả hàng hoàn tiền (`REFUND`)**: System Manager thẩm định và duyệt hoàn tiền; hệ thống lập tức kích hoạt cơ chế **CLAWBACK** — thu hồi toàn bộ khoản thù lao tiêu chuẩn và thù lao deal treo về 0đ, đồng thời trừ ngược doanh số khỏi tiến độ KPI của Deal.
> * **Theo dõi Tiến độ Thỏa thuận KPI**: Hệ thống cập nhật thời gian thực tỷ lệ % hoàn thành doanh số cam kết của từng Deal độc quyền, đảm bảo số liệu minh bạch trước khi bước sang giai đoạn quyết toán.

---

```
SLIDE 13: UAT VALIDATION – WF-04: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Phú Quý (Owner: WF-04)
* **Lời thoại thuyết trình**:
> Kỳ vọng kiểm thử đối với Workflow 4:
>
> 1. **Luồng thành công (Happy Path)**:
> * `TC_GHN_01`: Shop xác nhận đơn $\rightarrow$ API GHN Sandbox trả về mã vận đơn AWB hợp lệ, tính đúng cước phí vận chuyển theo khối lượng và khoảng cách kho xuất hàng; khi trạng thái chuyển `DELIVERED`, đơn hàng bắt đầu đếm ngược 14 ngày đổi trả.
> * `TC_RETURN_01 (Đổi hàng 1-1)`: Khách gửi yêu cầu đổi hàng do lỗi vỡ $\rightarrow$ System Manager duyệt `EXCHANGE_1_TO_1` $\rightarrow$ Shop gửi kiện hàng bù $\rightarrow$ Bút toán thù lao của KOL vẫn được bảo lưu nguyên vẹn ở trạng thái chờ đối soát.
> 2. **Luồng xử lý ngoại lệ (Exception Handling)**:
> * `TC_RETURN_02 (Hoàn tiền Clawback)`: Khách gửi yêu cầu trả hàng hoàn tiền $\rightarrow$ System Manager duyệt `REFUND` $\rightarrow$ Số tiền hoàn được ghi nhận, trạng thái thù lao của đơn hàng chuyển thành `CLAWBACK_REVERSED`, doanh số KPI của Deal bị trừ tương ứng.
> * `TC_RETURN_03 (Quá hạn 14 ngày)`: Nếu khách hàng gửi yêu cầu đổi trả sau ngày thứ 15 kể từ khi nhận hàng, hệ thống tự động vô hiệu hóa nút gửi yêu cầu và thông báo đã hết thời hạn bảo hành đổi trả quy định.

---

```
SLIDE 14: FLOW 5 – QUYẾT TOÁN THÙ LAO 2 GIAI ĐOẠN, RÚT TIỀN & THUẾ TNCN 10% (WF-05)
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Thành Thắng & Nguyễn Đình Tuấn (WF-05)
* **Lời thoại thuyết trình**:
> Cuối cùng là **WF-05: Quyết toán Thù lao 2 Giai đoạn, Rút tiền An toàn Concurrency Khấu trừ Thuế TNCN 10% & Báo cáo Sổ cái Kiểm toán Doanh nghiệp**, do em Nguyễn Thành Thắng và bạn Nguyễn Đình Tuấn đồng phụ trách:
>
> * **Cơ chế Quyết toán Thù lao 2 Giai đoạn Chuẩn Kế toán**:
>   - **Giai đoạn 1 (Thù lao Tiêu chuẩn: 10% Gốc + Bậc KOL)**: Ví dụ đơn 1.000.000₫, KOL bậc Vàng (`+2%` $\rightarrow$ `12%`), khoản thù lao chắc chắn hưởng là $120.000₫$. Sau đúng 14 ngày giao thành công sạch (không hoàn trả), hệ thống giải ngân ngay $120.000₫$ vào **Số dư khả dụng (`availableBalance`)**.
>   - **Giai đoạn 2 (Thưởng chênh lệch Deal giữ lại chờ KPI)**: Nếu Deal độc quyền ký mức `18%`:
>     $$\text{Chênh lệch KPI} = \text{Deal\%} - (10\% + \text{Bậc\%}) = 18\% - 12\% = 6\% = 60.000₫$$
>     Khoản $60.000₫$ này được treo riêng trong két Escrow. Chỉ khi Deal đạt đủ 100% KPI cam kết, hệ thống mới giải ngân nốt $60.000₫$ về ví khả dụng. Tổng cộng KOL nhận đúng $180.000₫$ (`18%`), tuyệt đối **KHÔNG CỘNG DỒN DEAL VỚI BẬC** tránh thất thoát tài chính! Nếu không đạt KPI, khoản $60.000₫$ bị hủy (`KPI_FORFEITED`), KOL vẫn giữ trọn $120.000₫$.
> * **Rút tiền An toàn Concurrency & Khấu trừ Thuế TNCN 10%**:
>   - Khóa dòng dữ liệu `SELECT ... FOR UPDATE` (Pessimistic Row-level Locking) chống rút đúp tiền khi ấn liên tục.
>   - Hệ thống tự động khấu trừ **10% Thuế TNCN** theo quy định pháp luật Việt Nam đối với thu nhập vãng lai; KOL thực nhận 90% qua chuyển khoản Napas 24/7.
>   - Mọi biến động tiền tệ đều được ghi vào Sổ cái kép (`CommissionLedger`) phục vụ kiểm toán minh bạch trên **Executive Financial Dashboard**.

---

```
SLIDE 15: UAT VALIDATION – WF-05: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Thành Thắng & Nguyễn Đình Tuấn (WF-05)
* **Lời thoại thuyết trình**:
> Kỳ vọng kiểm thử đối với Workflow 5:
>
> 1. **Luồng thành công (Happy Path)**:
> * `TC_PAY_01 (Giải ngân 2 giai đoạn)`: Đơn hàng qua 14 ngày $\rightarrow$ Giải ngân ngay `10% + Bậc`; khi Deal kết thúc đạt 100% KPI $\rightarrow$ Cronjob giải ngân phần chênh lệch `Deal% - (10% + Bậc)` vào ví khả dụng.
> * `TC_PAY_02 (Khấu trừ Thuế TNCN)`: KOL gửi yêu cầu rút 5.000.000₫ $\rightarrow$ Hệ thống khóa số dư 5.000.000₫ sang `lockedPayoutBalance`, tự động tính Thuế TNCN 10% (500.000₫) và số tiền thực nhận 4.500.000₫; System Manager duyệt và tải ủy nhiệm chi $\rightarrow$ Lệnh chi hoàn tất (`DISBURSED`).
> 2. **Luồng xử lý ngoại lệ và an toàn kế toán (Exception Handling)**:
> * `TC_PAY_03 (Chống rút đúp Concurrency)`: Giả lập 2 yêu cầu rút tiền gửi đến trong cùng 1 mili-giây $\rightarrow$ Cơ chế `SELECT ... FOR UPDATE` chỉ cho phép giao dịch đầu tiên xử lý thành công; giao dịch thứ hai đọc được số dư đã bị trừ và trả về lỗi `INSUFFICIENT_BALANCE`.
> * `TC_PAY_04 (Không đạt KPI Deal)`: Nếu Deal hết hạn mà doanh số chỉ đạt 85% KPI cam kết $\rightarrow$ Khoản tiền thưởng Deal chênh lệch tự động chuyển sang trạng thái `KPI_FORFEITED` và hoàn trả về quỹ doanh nghiệp, không giải ngân sang ví KOL.

---

```
SLIDE 16: LỜI KẾT & MỜI HỘI ĐỒNG ĐẶT CÂU HỎI (THANK YOU & Q&A)
```
* **Thời lượng**: 45 giây
* **Người trình bày**: Nguyễn Thành Thắng (Team Leader)
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Tôn Thất Hoàng Minh cùng Quý Thầy Cô trong Hội đồng phản biện Review 2,
>
> Tóm lại, thông qua 16 slide vừa trình bày, nhóm FA26SE032 đã hoàn thành toàn diện các yêu cầu của đợt đánh giá Review 2:
> 1. Định vị chuẩn xác mô hình **Hệ thống Quản lý Nội bộ Đa Cửa hàng (Enterprise In-House System)**, loại bỏ triệt để các tính năng lạc đề của sàn TMĐT đại trà.
> 2. Chuẩn hóa trọn bộ **64 Sơ đồ Thiết kế Kỹ thuật (16 sơ đồ kiến trúc + 24 sơ đồ lớp CQRS + 24 sơ đồ tuần tự)** đạt chuẩn 100% Đen Trắng Monochrome theo mẫu xuất sắc FPT University (`3681_FA24SE007` & `4488_SP25SE136`).
> 3. Hoàn thiện Báo cáo tốt nghiệp chính thức **293 trang** (`Report 7`) với 279 bảng biểu và 109 hình ảnh minh họa sắc nét.
> 4. Toàn bộ 5 Workflows và 24 Subsystems đã sẵn sàng 100% trên cả Web & Mobile App để bước vào phần trình diễn demo trực tiếp.
>
> Nhóm chúng em xin chân thành cảm ơn Quý Thầy Cô và rất mong nhận được những câu hỏi, ý kiến đóng góp quý báu từ Hội đồng!

---

## 3. BỘ CÂU HỎI PHẢN BIỆN THƯỜNG GẶP (DEFENSE STRATEGY & FAQ)

### Câu hỏi 1: Tại sao hệ thống lại chia thù lao thành 2 giai đoạn giải ngân thay vì trả hết một lần sau 14 ngày?
* **Chiến lược trả lời**: Thù lao của KOL trong SCANMS gồm 2 phần có bản chất tài chính khác nhau:
  - Phần `10% Gốc + Bậc KOL` là quyền lợi tiêu chuẩn gắn liền với từng đơn hàng cụ thể, phụ thuộc duy nhất vào việc đơn hàng có bị khách đổi trả trong 14 ngày hay không. Do đó, hết 14 ngày an toàn là phải giải ngân ngay cho đối tác.
  - Phần thù lao bổ sung từ Deal độc quyền (`Deal% - (10% + Bậc%)`) là khoản thưởng gắn với cam kết KPI tổng thể của toàn bộ chiến dịch (ví dụ cam kết đạt 100 triệu doanh số). Khoản này phải được giữ lại cho đến khi kết thúc đợt kiểm toán KPI để đảm bảo KOL đạt đủ cam kết, tránh tình trạng doanh nghiệp chi trả vượt hạn mức rồi không thể thu hồi.

### Câu hỏi 2: Tại sao hệ thống lại quy định ngưỡng duyệt Deal 16% và trần tối đa 25%?
* **Chiến lược trả lời**: Đây là cơ chế kiểm soát rủi ro phân quyền tài chính:
  - Ngưỡng `<= 16%`: Nằm trong thẩm quyền chi phí biên mà Shop Manager được phép chủ động quyết định để linh hoạt chốt deal nhanh với KOL mà không cần qua nhiều cấp phê duyệt.
  - Ngưỡng `> 16%` đến `25%`: Ảnh hưởng trực tiếp đến biên lợi nhuận của toàn bộ doanh nghiệp, do đó bắt buộc phải leo thang lên System Admin (Ban Giám đốc) phê duyệt.
  - Trần `25%`: Là trần chi phí tiếp thị an toàn tuyệt đối, hệ thống chặn cứng ở tầng DB và API để ngăn chặn lỗi cấu hình hoặc thông đồng làm thâm hụt tài chính của doanh nghiệp.

### Câu hỏi 3: Nếu khách hàng yêu cầu đổi trả sau khi thù lao đã giải ngân thì sao?
* **Chiến lược trả lời**: Thời hạn cho phép đổi trả của khách hàng là đúng 14 ngày kể từ khi đơn giao thành công, trùng khớp hoàn toàn với thời gian giam giữ tiền trong giỏ Escrow (`PENDING_14D_HOLD`). Do đó, trong 14 ngày này, tiền thù lao chưa hề được giải ngân vào ví khả dụng. Nếu khách trả hàng hoàn tiền, hệ thống thực hiện Clawback ngay trên két Escrow. Sau ngày thứ 14, quyền yêu cầu đổi trả của khách đã hết hiệu lực theo chính sách, do đó không bao giờ xảy ra rủi ro tiền đã rút mà khách lại đòi hoàn hàng.
