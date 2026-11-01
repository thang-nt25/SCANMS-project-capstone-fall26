# KỊCH BẢN THUYẾT TRÌNH REVIEW 2 (CAPSTONE PROJECT DEFENSE)
**HỆ THỐNG QUẢN LÝ TIẾP THỊ LIÊN KẾT & MẠNG LƯỚI GIAN HÀNG ĐA ĐỐI TÁC (SCANMS)**
* **Mã nhóm**: FA26SE032
* **Chuyên ngành**: Kỹ thuật phần mềm (Software Engineering) – Đại học FPT
* **Giảng viên hướng dẫn**: ThS. Tôn Thất Hoàng Minh
* **Hội đồng phản biện**: Reviewer 1 (Thầy longt5), Reviewer 2 (Thầy ThinhDP2)
* **Thời lượng dự kiến**: 12 – 15 phút thuyết trình + Demo & Q&A

---

## 1. BẢNG PHÂN BỔ THỜI GIAN VÀ PHÂN VAI THUYẾT TRÌNH

| Chặng | Slide | Nội dung trình bày | Người phụ trách | Thời lượng |
| :---: | :---: | :--- | :--- | :---: |
| **Chặng 1** | **Slide 1 – 5** | Mở đầu, Kiến trúc hệ thống (Dùng gì & Tại sao dùng), Conceptual ERD, 5 vai trò (RBAC) & tính năng đặc thù | **Nguyễn Thành Thắng** (Leader) | **4 phút 00s** |
| **Chặng 2** | **Slide 6 & 7** | Flow 1: Đăng ký tài khoản, 2FA OTP, Thẩm định KYC đa cấp + Kỳ vọng Test Cases | **Nguyễn Thành Thắng** (WF-01) | **2 phút 15s** |
| **Chặng 3** | **Slide 8 & 9** | Flow 2: Đàm phán Deal VIP Socket.IO, Live Shopping (+3% bonus) + Kỳ vọng Test Cases | **Phan Xuân Thịnh** (WF-02) | **2 phút 15s** |
| **Chặng 4** | **Slide 10 & 11** | Flow 3: Tiếp thị Last-Click, Quick Login Modal, Thanh toán VietQR + Kỳ vọng Test Cases | **Nguyễn Đình Tuấn** (WF-03) | **2 phút 30s** |
| **Chặng 5** | **Slide 12 & 13** | Flow 4: Vận đơn GHN, Két Escrow 14 ngày, Phân xử khiếu nại Video + Kỳ vọng Test Cases | **Nguyễn Phú Quý** (WF-04) | **2 phút 30s** |
| **Chặng 6** | **Slide 14 & 15** | Flow 5: Thưởng tháng, Rút tiền Concurrency, 10% Thuế TNCN & Napas + Kỳ vọng Test Cases | **Tuấn & Thắng** (WF-05) | **2 phút 30s** |
| **Chặng 7** | **Slide 16** | Tổng kết cam kết Review 2 & Mời Hội đồng phản biện đặt câu hỏi (Q&A) | **Nguyễn Thành Thắng** (Leader) | **0 phút 45s** |
| **Tổng** | **16 Slides** | **Toàn bộ kiến trúc, dữ liệu và 5 luồng nghiệp vụ E2E kèm kiểm thử UAT** | **Toàn đội FA26SE032** | **16 phút 45s** |

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
> Em là Nguyễn Thành Thắng, đại diện nhóm sinh viên FA26SE032. Hôm nay, nhóm chúng em xin phép được báo cáo tiến độ và bảo vệ đồ án tốt nghiệp Capstone với đề tài: SCANMS – Sales Collaborator & Affiliate Network Management System (Hệ thống Quản lý Mạng lưới Tiếp thị Liên kết và Gian hàng Đa đối tác).
>
> 1. Về bối cảnh và vấn đề giải quyết:
> Trong làn sóng thương mại điện tử bùng nổ, mô hình tiếp thị liên kết (Affiliate Marketing) đang là kênh bán hàng chủ lực. Tuy nhiên, thị trường hiện tại đang gặp phải 3 nỗi đau nhức nhối:
> * Thứ nhất, các gian hàng đối tác (Merchants) gặp khó khăn lớn trong việc tiếp cận mạng lưới KOL/KOC uy tín và thiếu công cụ đo lường chuyển đổi chính xác đa kênh.
> * Thứ hai, các nhà sáng tạo (KOL/KOC) thường xuyên lo sợ bị bùng hoa hồng, thiếu cơ chế đàm phán hợp đồng độc quyền linh hoạt và quy trình rút tiền bị chậm trễ kéo dài.
> * Thứ ba, thiếu vắng một nền tảng trung gian có vai trò trọng tài độc lập để xác minh danh tính (KYC), kiểm soát chất lượng sản phẩm và phân xử khiếu nại hoàn tiền dựa trên bằng chứng minh bạch.
>
> 2. Sứ mệnh của SCANMS:
> Hệ thống SCANMS ra đời nhằm đóng vai trò một Sàn thương mại tiếp thị liên kết đa gian hàng (Multi-Merchant Affiliate Network), kết nối bền vững giữa NHIỀU Gian hàng với NHIỀU Nhà sáng tạo, giải quyết trọn vẹn bài toán minh bạch tài chính, giam giữ tiền ký quỹ Escrow bảo vệ người mua và tự động hóa quy trình chi trả hoa hồng 24/7.
>

---

```
SLIDE 2: NỘI DUNG BÁO CÁO (AGENDA)
```
* **Thời lượng**: 30 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Bài thuyết trình của nhóm hôm nay được cấu trúc mạch lạc thành 4 phần trọng tâm theo đúng tiến trình phát triển phần mềm chuẩn mực:
>
> 1. System Architecture: Tổng quan kiến trúc hệ thống, giải trình chi tiết CÔNG NGHỆ ĐƯỢC CHỌN VÀ LÝ DO TẠI SAO LẠI DÙNG (Technical Rationale & Trade-offs).
> 2. Conceptual Data Model & Access Control: Mô hình dữ liệu khái niệm và Ma trận 5 vai trò (Actors) cùng các TÍNH NĂNG ĐẶC THÙ của từng vai trò.
> 3. Five Business Flows & UAT Validation: Đi sâu vào 5 luồng nghiệp vụ thực tế, chứng minh KỲ VỌNG VÀ MONG MUỐN ĐẠT ĐƯỢC KHI THỰC HIỆN CÁC TEST CASE (Cả luồng thành công Happy Path lẫn cơ chế xử lý ngoại lệ Exception Handling).
> 4. Conclusion & Q&A: Tổng kết cam kết Review 2 và lắng nghe ý kiến đóng góp từ Quý Thầy Cô.
>
> Sau đây, em xin phép bắt đầu phần 1: Tổng quan kiến trúc và công nghệ.
>

---

```
SLIDE 3: TỔNG QUAN KIẾN TRÚC – DÙNG GÌ VÀ TẠI SAO LẠI DÙNG? (SYSTEM ARCHITECTURE & RATIONALE)
```
* **Thời lượng**: 1 phút 30 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Cô, ở phần kiến trúc, nhóm không chỉ lựa chọn công nghệ theo trào lưu mà mọi quyết định kỹ thuật đều xuất phát từ yêu cầu bài toán nghiệp vụ TMĐT khắt khe:
>
> 1. Tại sao dùng Kiến trúc Modular Monolith trên nền tảng NestJS (TypeScript)?
> * Lý do: Đề tài có tính chất toàn vẹn dữ liệu tài chính cực cao: tiền luân chuyển liên tục từ Đơn hàng -> Két ký quỹ Escrow -> Ví cá nhân. Kiến trúc Modular Monolith cho phép tận dụng triệt để ACID Transactions của cơ sở dữ liệu để rollback nguyên khối an toàn tuyệt đối khi có lỗi, loại bỏ hoàn toàn bài toán phức tạp và rủi ro mất mát giao dịch phân tán (Saga/2PC) của Microservices.
> * NestJS cung cấp cơ chế Dependency Injection và Module cô lập theo ranh giới nghiệp vụ (Bounded Contexts: Auth, Products, Orders, Live, Payouts), giúp code cực kỳ sạch, dễ viết Unit/Integration test và sẵn sàng bóc tách thành Microservices độc lập trong tương lai khi lưu lượng tăng trưởng.
>
> 2. Tại sao dùng PostgreSQL kết hợp Prisma ORM mà không dùng MongoDB?
> * Lý do: Dữ liệu TMĐT và tài chính đòi hỏi tính toàn vẹn tham chiếu nghiêm ngặt (Foreign Keys, Constraints) giữa Orders, Sub-orders theo từng shop, Items, EscrowLedger và Wallets.
> * Đặc biệt, PostgreSQL hỗ trợ cơ chế khóa dòng Pessimistic Row-Level Locking (SELECT ... FOR UPDATE) trên bảng Ví tiền, ngăn chặn triệt để lỗ hổng Double-Spending khi người dùng bấm rút tiền liên tiếp. Prisma ORM cung cấp Type-safety 100% từ schema đến tầng code, loại bỏ lỗi runtime.
>
> 3. Tại sao dùng Redis Caching kết hợp cơ chế LRU In-Memory Fallback?
> * Lý do: Redis đóng vai trò Caching các API đọc nhiều (Danh mục sản phẩm, Thông tin shop, Bảng xếp hạng KOL), đưa p95 latency xuống dưới 200ms. Đồng thời, Redis xử lý Sliding Window Rate Limiting (100 req/min/IP) chặn bot click spam link affiliate.
> * Quan trọng nhất: Nhóm đã lập trình cơ chế LRU In-memory Fallback trong core NestJS. Nếu cụm Redis gặp sự cố hoặc mất kết nối, hệ thống tự động giáng cấp xuống dùng bộ nhớ RAM cục bộ, đảm bảo hệ thống không bao giờ bị crash hay trả lỗi 500 cho người dùng.
>
> 4. Tại sao mã hóa mật khẩu bằng Argon2id thay vì BCrypt hay SHA256?
> * Lý do: Argon2id là thuật toán mã hóa mật khẩu hiện đại nhất thế giới (quán quân Password Hashing Competition), cấu hình bộ nhớ tối thiểu 64MB và 3 vòng lặp. Nó có khả năng kháng hoàn toàn các cuộc tấn công bẻ khóa bằng phần cứng chuyên dụng GPU/ASIC và phòng chống tấn công side-channel.
>
> 5. Tầng Giao diện Client (React 18, Vite, Tailwind CSS & Atomic Color Tokens):
> * Dùng React 18 & Vite cho tốc độ build dưới 3 giây, hỗ trợ Concurrent rendering giúp bảng biểu và phòng livestream mượt mà. Áp dụng bảng mã màu chuẩn Vàng Be (Warm Sand & Brand Gold: #FAF8F5, #C59B58, #14233A) tạo nhận diện thương hiệu đối tác cao cấp. Bundle size nén brotli dưới 500KB để đạt FCP <= 1.2s.
>
> 6. Tích hợp Dịch vụ thứ ba (Third-party Integrations):
> * Cổng thanh toán VietQR / PayOS: Chuẩn hóa thanh toán không tiền mặt Napas 24/7, xác thực giao dịch tức thì qua Webhook ký số bảo mật SHA256.
> * Giao Hàng Nhanh (GHN Sandbox API): Tự động tính cước vận chuyển theo trọng lượng và kích thước 3 chiều thực tế, đồng bộ mã vận đơn thời gian thực.
> * Socket.IO & WebRTC: Đàm phán hợp đồng thời gian thực độ trễ dưới 50ms và phát sóng trực tiếp phòng Livestream Shopping.
>

---

```
SLIDE 4: MÔ HÌNH DỮ LIỆU KHÁI NIỆM (CONCEPTUAL DATA MODEL)
```
* **Thời lượng**: 1 phút 00 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Ở Slide 4 là Mô hình dữ liệu khái niệm (Conceptual Data Model) thể hiện bức tranh toàn cảnh về quan hệ giữa các thực thể cốt lõi:
>
> * Khác với web bán lẻ một chủ thông thường, SCANMS xây dựng mô hình Đa Gian hàng (Stores). Mỗi Store quản lý danh mục Products với Bảng ma trận biến thể 2 chiều (Màu sắc x Kích thước), kèm theo chính sách cấp hàng mẫu và mức hoa hồng gốc 10%.
> * Trung tâm của mạng lưới affiliate là mối quan hệ giữa Collaborators và các đường link tiếp thị ReferralLinks. Mỗi lượt click sinh ra một bản ghi ClickTracking, tự động lưu Marketing Cookie 30 ngày theo cơ chế Last-Click.
> * Khi đơn hàng (Orders) được thanh toán thành công, hệ thống tự động tách đơn theo từng Shop (Sub-Orders), đồng thời trích xuất khoản hoa hồng tương ứng đưa vào Sổ cái ký quỹ EscrowLedger. Tiền hoa hồng được giam an toàn trong 14 ngày (khớp với thời gian khách hàng khiếu nại đổi trả), trước khi chính thức kết chuyển vào Ví cá nhân (Wallets) của Đối tác để yêu cầu rút tiền (PayoutRequests).
>

---

```
SLIDE 5: MA TRẬN 5 VAI TRÒ & CÁC TÍNH NĂNG ĐẶC THÙ (ACTORS & SPECIFIC CAPABILITIES)
```
* **Thời lượng**: 1 phút 30 giây
* **Người trình bày**: Nguyễn Thành Thắng
* **Lời thoại thuyết trình**:
> Về khía cạnh quản trị và phân quyền người dùng, hệ thống chuẩn hóa DUY NHẤT 5 USER ROLES được kiểm soát nghiêm ngặt qua NestJS RBAC Guard, với các TÍNH NĂNG ĐẶC THÙ riêng biệt cho từng vai trò:
>
> 1. Customer (Khách mua hàng):
> * Dạo sàn đa gian hàng, mua hàng qua link/voucher affiliate.
> * TÍNH NĂNG ĐẶC THÙ: In-place Quick Login Modal (Popup đăng nhập tại chỗ không chuyển hướng trang, giữ nguyên 100% giỏ hàng khi từ khách vãng lai đăng nhập để thanh toán); thanh toán VietQR tự động; quyền mở khiếu nại trả hàng trong 14 ngày và BẮT BUỘC PHẢI TẢI LÊN VIDEO BÓC HÀNG (Unboxing Video) để được bảo vệ quyền lợi.
>
> 2. Collaborator (KOL / KOC tiếp thị):
> * Định danh cá nhân CCCD và tài khoản ngân hàng để kích hoạt ví.
> * TÍNH NĂNG ĐẶC THÙ: Sinh Smart Link rút gọn /r/:code và Dynamic QR code tải về ảnh PNG; xin cấp sản phẩm mẫu trải nghiệm 14 ngày; ĐÀM PHÁN DEAL ĐỘC QUYỀN 2 CHIỀU trực tiếp trong khung Chat Socket.IO; mở phòng Livestream Shopping nhận thêm +3% Live Bonus; rút tiền hoa hồng Napas 24/7 (tự động khấu trừ 10% thuế TNCN theo luật).
>
> 3. Shop Manager (Chủ gian hàng / Merchant):
> * Đăng ký pháp nhân doanh nghiệp (Giấy phép ĐKKD, Mã số thuế).
> * TÍNH NĂNG ĐẶC THÙ: Form quản lý sản phẩm 6 KHỐI TUẦN TỰ chuẩn Shopee/TikTok Shop (Thông tin cơ bản -> Media ảnh/video -> Ma trận 2 biến thể Màu x Size -> Cân nặng/kích thước đóng gói GHN -> Chính sách hoa hồng 10% & cấp mẫu thử -> Pháp lý kiểm duyệt); duyệt cấp hàng mẫu cho KOL; đàm phán hợp đồng VIP; CẤU HÌNH MỐC THƯỞNG THÁNG LŨY TIẾN (FR-09) để kích cầu doanh số KOL; quản lý đơn hàng tách biệt các tab (Chờ thanh toán, Chờ lấy hàng, Trả hàng/hoàn tiền).
>
> 4. System Manager (Chuyên viên Vận hành Sàn - Operations Specialist):
> * TÍNH NĂNG ĐẶC THÙ - VAI TRÒ TRỌNG TÀI ĐỘC LẬP: Thẩm định hồ sơ KYC 2 cấp (cá nhân KOL & doanh nghiệp Shop); kiểm duyệt sản phẩm mới đăng; trọng tài xử phạt KOL vi phạm cam kết review hàng mẫu; TRỌNG TÀI PHÂN XỬ KHIẾU NẠI HOÀN TIỀN ĐỘC LẬP: thẩm định chéo Video bóc hàng của khách với Video đóng gói của Shop để ra phán quyết hoàn tiền hay giải tỏa tiền cho Shop.
>
> 5. System Administrator (Quản trị viên Tối cao - Super Admin):
> * Kế thừa 100% quyền hạn của System Manager, đồng thời ĐỘC QUYỀN NẮM GIỮ 2 CHỨC NĂNG TỐI CAO:
> * Thứ nhất: Quản lý toàn bộ danh sách User và phân quyền nhân viên (/admin/users), có quyền khóa/mở tài khoản khẩn cấp khi phát hiện gian lận.
> * Thứ hai: Báo cáo tài chính cấp điều hành (Executive Analytics Dashboard): Giám sát tổng GMV toàn sàn, tổng tiền ký quỹ Escrow đang giam giữ, và biên lợi nhuận sàn thu về.
>

---

```
SLIDE 6: FLOW 1 – ĐĂNG KÝ VÀ THẨM ĐỊNH ĐỊNH DANH KYC (REGISTRATION & KYC)
```
* **Thời lượng**: 1 phút 00 giây
* **Người trình bày**: Nguyễn Thành Thắng (Owner: WF-01)
* **Lời thoại thuyết trình**:
> Sau đây, nhóm xin phép đi vào chi tiết 5 Luồng nghiệp vụ cốt lõi kèm kỳ vọng kiểm thử UAT:
>
> Flow 1: Quy trình Đăng ký tài khoản và Thẩm định hồ sơ định danh điện tử (KYC) do em trực tiếp phụ trách:
> * Nhằm đảm bảo tính minh bạch pháp lý và bảo vệ tài chính cho toàn sàn, toàn bộ Đối tác (KOL và Chủ shop) đều phải trải qua quy trình xác minh 2 bước.
> * Bước 1: Người dùng đăng ký thông tin cơ bản, mật khẩu được băm an toàn bằng Argon2id và xác thực email/SĐT qua mã OTP 6 chữ số gửi qua Mailer.
> * Bước 2: Đối tác nộp hồ sơ KYC: KOL tải ảnh chụp CCCD 2 mặt và số tài khoản ngân hàng chính chủ; Shop nộp thêm Giấy phép ĐKKD và Mã số thuế. Hồ sơ vào trạng thái PENDING_REVIEW.
> * Bước 3: Chuyên viên System Manager truy cập Cổng thẩm định, đối soát giấy tờ. Nếu đạt chuẩn, duyệt hồ sơ sang trạng thái VERIFIED, cấp tích xanh uy tín và mở khóa toàn bộ quyền hạn affiliate và ví rút tiền.
>

---

```
SLIDE 7: UAT VALIDATION – FLOW 1: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Thành Thắng (Owner: WF-01)
* **Lời thoại thuyết trình**:
> Ở Slide 7 là Kỳ vọng và mong muốn cụ thể khi thực hiện các Test Case của Flow 1:
>
> 1. Kỳ vọng ở luồng thành công (Happy Path Acceptance Criteria):
> * TC_KYC_01 & 02: Mong muốn khi người dùng submit form đăng ký thì hệ thống gửi mã OTP 6 chữ số trong vòng 5 giây; khi nhập đúng OTP, hệ thống kích hoạt tài khoản, cấp Access Token JWT (15 phút) và Refresh Token (7 ngày), tự động điều hướng đúng Portal theo vai trò người dùng.
> * TC_KYC_03 & 04: Mong muốn khi nộp hồ sơ KYC hợp lệ (ảnh nét, đủ 12 số CCCD), hồ sơ chuyển sang PENDING_REVIEW; khi System Manager bấm Approve, trạng thái tài khoản chuyển ngay sang VERIFIED, tự động kích hoạt ví điện tử và cho phép sinh link affiliate.
>
> 2. Kỳ vọng ở luồng xử lý ngoại lệ và bảo mật (Exception Handling Expectations):
> * TC_KYC_01: Mong muốn nếu đăng ký bằng Email đã tồn tại, hệ thống chặn submit và báo lỗi 'Email already registered'; nếu mật khẩu dưới 8 ký tự, chặn form ngay tại client.
> * TC_KYC_02 (Chống Brute-force): Mong muốn nếu người dùng cố tình đoán mã OTP quá 5 lần liên tiếp, hệ thống tự động khóa tài khoản trong 15 phút, ngăn chặn hoàn toàn tấn công tự động.
> * TC_KYC_03: Mong muốn nếu người dùng tải ảnh > 5MB hoặc nhập số CCCD khác 12 chữ số, form báo lỗi đỏ và disable nút gửi.
> * TC_KYC_04: Mong muốn khi System Manager bấm Reject, hệ thống BẮT BUỘC PHẢI NHẬP LÝ DO PHẢN HỒI (Feedback note) để người dùng biết chính xác cần chụp lại ảnh mặt nào, đồng thời giữ nguyên tài khoản cho phép nộp lại chứ không xóa user.
>

---

```
SLIDE 8: FLOW 2 – ĐÀM PHÁN DEAL VIP & PHÒNG LIVESTREAM SHOPPING
```
* **Thời lượng**: 1 phút 00 giây
* **Người trình bày**: Phan Xuân Thịnh (Owner: WF-02)
* **Lời thoại thuyết trình**:
> Tiếp theo là Flow 2: Đàm phán Hợp đồng Độc quyền & Phòng Livestream Shopping, do bạn Phan Xuân Thịnh phụ trách:
>
> * Thay vì chỉ có mức hoa hồng cố định nhàm chán, SCANMS cung cấp cơ chế Thương thảo Deal 2 chiều thời gian thực qua Socket.IO:
>   • Chiều 1: KOL chủ động gửi Proposal đề xuất mức hoa hồng VIP (ví dụ 13% so với 10% gốc) kèm cam kết doanh số và video review.
>   • Chiều 2: Shop chủ động xem bảng Leaderboard, chọn Top KOL phù hợp và gửi Thẻ mời chiến dịch độc quyền trực tiếp vào khung chat.
> * Khi hai bên bấm Chấp thuận (Agreed), hệ thống tự động sinh Mã giảm giá VIP riêng (VIP Voucher Code) và Đường link độc quyền cho KOL.
> * Đặc biệt, khi KOL mở phiên Livestream Shopping, hệ thống kích hoạt cơ chế ghim sản phẩm thời gian thực và tự động cộng thêm Hoa hồng Live Bonus (+3%), nâng tổng mức nhận lên 16% trong suốt phiên phát sóng.
>

---

```
SLIDE 9: UAT VALIDATION – FLOW 2: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Phan Xuân Thịnh (Owner: WF-02)
* **Lời thoại thuyết trình**:
> Kỳ vọng và mong muốn cụ thể khi kiểm thử Flow 2:
>
> 1. Kỳ vọng ở luồng thành công (Happy Path Expectations):
> * TC_DEAL_01 & 02: Mong muốn khi Shop hoặc KOL gửi lời mời, tin nhắn hiển thị dưới dạng Thẻ hợp đồng tương tác (Interactive Deal Card) trong khung chat Socket.IO với độ trễ dưới 50ms; khi KOL bấm Chấp nhận, trạng thái deal chuyển ngay sang AGREED, hệ thống tự sinh mã VIP Voucher và liên kết với tài khoản KOL.
> * TC_DEAL_03: Mong muốn khi KOL bắt đầu phát sóng Live và Shop ghim Deal, huy hiệu Live đỏ rực xuất hiện trên thẻ sản phẩm; hoa hồng của sản phẩm được ghim tự động cộng thêm +3% Live Bonus (ví dụ 13% thành 16%).
> * TC_DEAL_04: Mong muốn khi KOL bấm Kết thúc Live, phòng live hiển thị Màn hình tổng kết phiên live (thời lượng, lượt xem, doanh số); toàn bộ sản phẩm ghim tự động hoàn trả hoa hồng về mức gốc 13% và khóa khung chat.
>
> 2. Kỳ vọng ở luồng xử lý ngoại lệ (Exception Handling Expectations):
> * TC_DEAL_01 (Quy tắc trần tối cao 25%): Mong muốn nếu mức hoa hồng đề xuất cộng dồn vượt quá 25% (Base + Tier + Deal + Live > 25%), hệ thống tự động ép về mức trần tối đa 25% để bảo vệ lợi nhuận biên cho chủ shop.
> * TC_DEAL_02: Mong muốn nếu đề xuất deal gửi đi quá 48 giờ không được phản hồi, hệ thống tự động chuyển trạng thái EXPIRED và khóa nút chấp thuận.
> * TC_DEAL_03: Mong muốn trong lúc đang phát Livestream, nếu tồn kho sản phẩm về 0 (Stock = 0), nút mua hàng trong khay live tự động ẩn đi và hiển thị nhãn Hết hàng, tránh tình trạng khách chốt đơn ảo.
>

---

```
SLIDE 10: FLOW 3 – ĐIỀU HƯỚNG TIẾP THỊ & THANH TOÁN VIETQR
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn (Owner: WF-03)
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Cô, Flow 3: Cơ chế Ghi nhận Tiếp thị Đa kênh, Quick Login Modal và Thanh toán VietQR do bạn Nguyễn Đình Tuấn phụ trách, là mắt xích tạo ra doanh thu thực tế cho nền tảng:
>
> * Khách hàng tiếp cận sản phẩm qua 3 kênh: Bấm Smart Link của KOL, quét Mã QR động, hoặc xem Livestream. Ngay khi khách vào trang, cookie tiếp thị được thiết lập với thời hạn 30 ngày theo thuật toán Last-Click Attribution (KOL nào tác động cuối cùng trước khi mua sẽ được ghi nhận hoa hồng).
> * Đột phá trải nghiệm người dùng - In-place Quick Login Modal: Khách vãng lai (Guest) được tự do dạo sàn và nhặt hàng vào giỏ từ nhiều shop khác nhau. Khi bấm 'Thanh toán', thay vì redirect làm mất dữ liệu giỏ hàng, hệ thống bật ngay Popup Đăng nhập nhanh tại chỗ. Sau khi đăng nhập thành công, GIỮ NGUYÊN 100% GIỎ HÀNG để khách tiếp tục thanh toán mà không mất bất kỳ thao tác nào!
> * Tại màn hình thanh toán, hệ thống áp dụng cấu trúc voucher 3 tầng (Sàn + Shop + Sản phẩm), sinh mã VietQR động chuẩn Napas qua PayOS. Khi khách chuyển khoản thành công, Webhook backend xác thực chữ ký bảo mật và cập nhật đơn hàng sang trạng thái PAID trong vòng chưa đầy 1 giây.
>

---

```
SLIDE 11: UAT VALIDATION – FLOW 3: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn (Owner: WF-03)
* **Lời thoại thuyết trình**:
> Kỳ vọng và mong muốn cụ thể khi kiểm thử Flow 3:
>
> 1. Kỳ vọng ở luồng thành công (Happy Path Expectations):
> * TC_ATTR_01 & 02: Mong muốn khi KOL bấm tạo link, hệ thống sinh ra đường dẫn rút gọn /r/:code và mã QR động tải về file PNG; khi khách bấm vào link, cookie tiếp thị lưu đúng 30 ngày; nếu khách click tiếp link của KOL thứ hai thì cookie tự động ghi đè sang KOL thứ hai theo đúng luật Last-Click.
> * TC_ATTR_03: Mong muốn khi khách chưa đăng nhập bấm Tiến hành thanh toán, Modal Quick Login xuất hiện tại chỗ; sau khi đăng nhập thành công, toàn bộ danh sách sản phẩm từ các shop trong giỏ hàng được giữ nguyên vẹn 100% để tiếp tục đặt hàng.
> * TC_ATTR_04: Mong muốn khi khách quét mã VietQR và chuyển tiền, Webhook PayOS gửi thông báo về server; hệ thống tự động chuyển trạng thái đơn sang PAID, tách đơn theo từng shop và kết chuyển tiền hoa hồng vào két ký quỹ Escrow.
>
> 2. Kỳ vọng ở luồng xử lý ngoại lệ (Exception Handling Expectations):
> * TC_ATTR_01: Mong muốn nếu tài khoản KOL chưa hoàn tất KYC, nút tạo link affiliate bị vô hiệu hóa kèm thông báo yêu cầu xác minh danh tính.
> * TC_ATTR_02: Mong muốn nếu khách hàng truy cập vào link sản phẩm đã ngừng kinh doanh hoặc bị xóa, hệ thống hiển thị trang 404 lịch sự kèm nút điều hướng về Marketplace, TUYỆT ĐỐI KHÔNG ÂM THẦM FALLBACK sang sản phẩm khác.
> * TC_ATTR_03: Mong muốn nếu khách nhập sai mật khẩu trong Modal Quick Login, hệ thống báo lỗi ngay trong modal mà không reload trang web làm mất dữ liệu form.
> * TC_ATTR_04: Mong muốn nếu khách quét VietQR nhưng chuyển thiếu tiền (Underpaid), đơn hàng được giữ nguyên ở tab 'Chờ thanh toán', thông báo bổ sung số tiền còn thiếu chứ không nuốt lỗi; nếu Webhook bị làm giả chữ ký, server trả về mã 403 Forbidden và ghi nhật ký cảnh báo an ninh.
>

---

```
SLIDE 12: FLOW 4 – ATTRIBUTION, GIAO HÀNG GHN & XỬ LÝ ĐỔI TRẢ
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Phú Quý (Owner: WF-04)
* **Lời thoại thuyết trình**:
> Tiếp theo là Flow 4 do em Nguyễn Phú Quý phụ trách: theo dõi nguồn KOL từ lúc chia sẻ đến đơn hàng, xử lý giao nhận và giải quyết đổi trả minh bạch.
>
> * KOL tạo Smart Link/QR và mã độc quyền `THAONHI16`. Click link ghi phiên attribution, cookie 30 ngày và nguồn cuối cùng có hiệu lực. Khi khách đặt bằng link hoặc mã, đơn lưu KOL để đối soát. Trên dữ liệu demo v4, serum 450.000₫ giảm 5% còn 427.500₫ tiền hàng; deal 16% tạo thu nhập 72.000₫ trên giá gốc. Thu nhập lấy tỷ lệ cao nhất, không cộng dồn các mức base, tier, campaign và deal.
> * Shop xử lý đóng gói và vận chuyển GHN; hệ thống lưu phí, mã tracking và trạng thái đơn. Checkout có thêm mã freeship toàn sàn `SCANMSFREESHIP` dành cho khách mới, giảm tối đa 100.000₫ phí ship và giới hạn 3 lượt mỗi số điện thoại.
> * Nếu phát sinh lỗi, khách gửi hồ sơ đổi trả kèm chứng cứ. Shop phân loại lỗi do Shop, GHN hay khách; System Manager có thể xem và phân xử hồ sơ tranh chấp.
> * Đổi hàng 1:1 giữ nguyên thu nhập KOL. Chỉ khi hoàn tiền thành công, hệ thống mới đảo khoản thu nhập đã ghi nhận và tạo bút toán thu hồi. Nếu hoàn tiền còn `PENDING`, chưa kết luận đã clawback.
> * Buổi demo dùng GHN/hoàn hàng mô phỏng; không tuyên bố đã gọi vận chuyển hay thanh toán thật.
>

---

```
SLIDE 13: UAT VALIDATION – FLOW 4: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Phú Quý (Owner: WF-04)
* **Lời thoại thuyết trình**:
> Các ca kiểm thử trực tiếp cần trình bày trong Flow 4:
>
> 1. **TC_F4_01 — Attribution và thu nhập:** KOL tạo link/mã; khách đặt hàng bằng `THAONHI16`; đơn gắn KOL đúng. Kiểm tra 450.000₫ × 16% = 72.000₫ dù khách chỉ trả 427.500₫ tiền hàng. Nếu KOL tự mua, đơn vẫn lưu dấu nguồn nhưng thu nhập bằng 0 với lý do `SELF_REFERRAL_`.
> 2. **TC_F4_02 — GHN và freeship:** Shop tạo vận đơn bằng dữ liệu đóng gói hợp lệ; phí và tracking được lưu. Mã `SCANMSFREESHIP` giảm phí ship tối đa 100.000₫, chỉ cho số điện thoại chưa có đơn mua và tối đa 3 lượt. Dữ liệu GHN dùng trong buổi demo phải được giới thiệu đúng là mock/sandbox.
> 3. **TC_F4_03 — Trách nhiệm khi đổi trả:** Khách gửi chứng cứ; Shop phân loại `SHOP_FAULT`, `LOGISTICS_FAULT` hoặc `CUSTOMER_REASON`. Khi có bất đồng, System Manager xem hồ sơ tại `/admin/return-disputes` và phân xử.
> 4. **TC_F4_04 — Đổi hàng:** Dùng đơn đã giao để tạo yêu cầu đổi hàng 1:1. Kỳ vọng có bước gửi hàng bù và commission không chuyển `REVERSED`.
> 5. **TC_F4_05 — Hoàn tiền và clawback:** Dùng đơn khác để hoàn tiền. Chỉ khi refund đạt `SUCCEEDED`, `order.refundedAmount` tăng, commission chuyển `REVERSED` và có bút toán thu hồi; nếu refund `PENDING`, chưa có clawback thành công.
> 6. **TC_F4_06 — Tính nhất quán:** Đối chiếu hồ sơ trả hàng, Return Event, đơn hàng, trạng thái commission và sổ cái/ví KOL để chỉ ra từng thay đổi có dấu vết kiểm toán.
>

### Thứ tự thao tác khi demo Flow 4

1. Đăng nhập KOL 01 → `/collaborator/marketing`; mở link/QR Serum Sora và chỉ mã `THAONHI16` cùng deal 16%.
2. Đăng nhập Customer 04 bằng cửa sổ khác; mở link KOL, thêm serum vào giỏ, xác nhận giá và attribution. Trong checkout, dùng số điện thoại mới nếu muốn áp dụng `SCANMSFREESHIP`; tạo đơn COD.
3. Đăng nhập Shop 01 → `/merchant/orders`; xử lý đơn và tracking bằng môi trường vận chuyển mô phỏng đến trạng thái giao thành công.
4. Chạy nhánh self-referral bằng chính tài khoản KOL; chỉ thu nhập 0 và dấu `SELF_REFERRAL_`. Không dùng đơn này để chứng minh thu nhập 72.000₫.
5. Với các đơn đã giao riêng biệt, chạy nhánh A đổi hàng, nhánh B hoàn tiền, nhánh C lỗi GHN/tranh chấp. Đăng nhập Manager xử lý C tại `/admin/return-disputes`.
6. Kết thúc bằng cách đối chiếu ví/sổ cái và các trạng thái đơn/commission. Dùng seed v4 thì số minh họa là giá gốc 450.000₫ → khách trả 427.500₫ tiền hàng → KOL nhận 72.000₫; nếu DB khác seed, đọc số thực tế trên màn hình và tính lại.

**Chuẩn bị môi trường trước buổi review:** Chạy `npm run seed:plan` rồi `npm run seed:check` trong `backend` để xác nhận đúng bộ dữ liệu v4. `seed:plan` chỉ dựng fixture, không ghi DB. Nếu `seed:check` báo thiếu manifest, chuyển sang một DB demo riêng đã sao lưu và nạp v4 theo `backend/prisma/seeds/README.md`; không reset DB nhóm đang dùng. Chuẩn bị trước hai đơn đã giao riêng biệt cho nhánh đổi hàng và hoàn tiền, một đơn tự mua, ảnh/video unboxing và tồn kho sản phẩm bù. Kiểm tra GHN đang ở chế độ mock hoặc staging trước khi thao tác; phiếu đòi bồi thường GHN trong demo là hồ sơ nội bộ chờ đối soát.

---

```
SLIDE 14: FLOW 5 – QUYẾT TOÁN THƯỞNG THÁNG & RÚT TIỀN HOA HỒNG
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn & Nguyễn Thành Thắng (WF-05)
* **Lời thoại thuyết trình**:
> Cuối cùng là Flow 5: Quyết toán Thưởng Mốc Doanh số Tháng & Chi trả Hoa hồng Ví an toàn, do bạn Nguyễn Đình Tuấn và em đồng chủ trì:
>
> * Thưởng mốc doanh số tháng (FR-09): Vào cuối tháng, hệ thống tự động quét tổng doanh số thực tế đã giải tỏa khỏi Escrow. Nếu KOL vượt mốc (ví dụ đạt 50 triệu), hệ thống tự động kết chuyển thưởng lũy tiến (thêm +2% hoặc khoản tiền thưởng cố định) vào ví của KOL.
> * Rút tiền ví an toàn đồng thời (Concurrency-Safe Payouts): Khi Đối tác gửi yêu cầu rút tiền:
>   • Hệ thống sử dụng Database Row-Level Locking khóa cứng số dư khả dụng, ngăn chặn triệt để lỗ hổng Double-Spending (bấm rút tiền nhiều lần liên tiếp để rút lố số dư).
>   • Tự động khấu trừ 10% thuế TNCN theo đúng quy định pháp luật Việt Nam đối với thu nhập tiếp thị liên kết vãng lai.
>   • System Admin kiểm tra tài khoản nhận, xuất file thanh toán hàng loạt qua VietQR và đính kèm ủy nhiệm chi ngân hàng trước khi xác nhận chuyển khoản qua Napas 24/7.
> * Cơ chế An toàn Ngân hàng: Nếu giao dịch ngân hàng thất bại, hệ thống tuyệt đối không nuốt lỗi, mà tự động rollback hoàn trả 100% số tiền bị khóa về lại ví cho người dùng kèm thông báo lỗi rõ ràng.
>

---

```
SLIDE 15: UAT VALIDATION – FLOW 5: KỲ VỌNG KHI THỰC HIỆN TEST CASES
```
* **Thời lượng**: 1 phút 15 giây
* **Người trình bày**: Nguyễn Đình Tuấn & Nguyễn Thành Thắng (WF-05)
* **Lời thoại thuyết trình**:
> Kỳ vọng và mong muốn cụ thể khi kiểm thử Flow 5:
>
> 1. Kỳ vọng ở luồng thành công (Happy Path Expectations):
> * TC_PAY_01: Mong muốn cronjob quét doanh số cuối tháng tính toán chính xác tổng doanh số Escrow thực tế; nếu đạt 52.4 triệu (vượt mốc 50tr), hệ thống tự động cộng đúng +2% (1.048.000 VNĐ) vào ví thưởng của KOL.
> * TC_PAY_02: Mong muốn khi KOL yêu cầu rút 5.000.000 VNĐ, hệ thống tự động khấu trừ đúng 10% thuế TNCN (500.000 VNĐ), tạo lệnh chi trả thực nhận 4.500.000 VNĐ; số dư 5 triệu trong ví bị khóa cứng ngay lập tức.
> * TC_PAY_03: Mong muốn khi System Admin duyệt lệnh rút và tải lên ủy nhiệm chi ngân hàng Napas, trạng thái chuyển sang DISBURSED, số tiền bị khóa được khấu trừ vĩnh viễn và gửi email thông báo kèm biên lai cho đối tác.
>
> 2. Kỳ vọng ở luồng xử lý ngoại lệ và an toàn kế toán (Exception Handling Expectations):
> * TC_PAY_01: Mong muốn các đơn hàng bị khách trả hàng hoàn tiền sẽ tự động bị loại trừ khỏi doanh số tính thưởng mốc tháng.
> * TC_PAY_02: Mong muốn nếu người dùng yêu cầu rút số tiền lớn hơn số dư khả dụng hoặc rút dưới hạn mức tối thiểu 100.000 VNĐ, form lập tức vô hiệu hóa nút submit và cảnh báo số dư không đủ.
> * TC_PAY_03: Mong muốn nếu tài khoản không có quyền Admin cố tình gọi API phê duyệt rút tiền, hệ thống RBAC chặn ngay lập tức với mã 403 Forbidden và ghi nhật ký kiểm toán Audit Log.
> * TC_PAY_04 (Nguyên tắc toàn vẹn kế toán): Mong muốn nếu giao dịch ngân hàng gặp sự cố timeout hoặc thất bại, hệ thống TUYỆT ĐỐI KHÔNG ĐƯỢC NUỐT LỖI, không được tự động sinh mã ngân hàng giả, mà bắt buộc phải thông báo lỗi đỏ và rollback 100% số tiền bị khóa về lại ví cho đối tác.
>

---

```
SLIDE 16: LỜI KẾT & MỜI HỘI ĐỒNG ĐẶT CÂU HỎI (THANK YOU & Q&A)
```
* **Thời lượng**: 45 giây
* **Người trình bày**: Nguyễn Thành Thắng (Team Leader)
* **Lời thoại thuyết trình**:
> Kính thưa Thầy Tôn Thất Hoàng Minh cùng hai Thầy trong Hội đồng phản biện,
>
> Tóm lại, thông qua 16 slide vừa trình bày, nhóm FA26SE032 đã chứng minh tính sẵn sàng và hoàn thiện toàn bộ các yêu cầu của cột mốc Review 2:
> 1. Chốt thành công Phiếu đăng ký đề tài Version 2.0 với 6 thay đổi kiến trúc tối ưu (BM03).
> 2. Hoàn thiện hồ sơ Design Brief BM01 và Báo cáo tự rà soát AI BM02 với 100% lỗi High được xử lý triệt để.
> 3. Thiết lập bản Cam kết Review 2 (BM04) với 5 Main Workflows, 19 tính năng bắt buộc và 81 functional test cases đạt tỷ lệ tự động hóa CI trên 95%.
> 4. Toàn bộ mã nguồn trên GitHub repository đã được gắn tag review-2 và kiểm thử thành công trên môi trường staging.
>
> Nhóm chúng em đã sẵn sàng 100% để bước vào phần trình diễn demo trực tiếp các kịch bản trên hệ thống thực tế và rất mong nhận được những câu hỏi, đóng góp quý báu từ Quý Thầy Cô để hoàn thiện đề tài đạt kết quả xuất sắc nhất tại đợt Defense 1.1.
>
> Nhóm em xin chân thành cảm ơn Quý Thầy Cô!
>

---

## 3. BỘ CÂU HỎI THƯỜNG GẶP (FAQ & CHIẾN LƯỢC PHẢN BIỆN)

### Câu hỏi 1: Tại sao nhóm chọn kiến trúc Modular Monolith thay vì Microservices?
* **Trả lời của nhóm**: Đề tài có tính chất toàn vẹn dữ liệu tài chính rất cao (luân chuyển tiền từ đơn hàng sang Escrow rồi sang Ví). Modular Monolith giúp tận dụng **Database ACID Transactions** của PostgreSQL để rollback nguyên khối khi có lỗi, loại bỏ hoàn toàn bài toán phức tạp về Distributed Transaction (Saga/2PC) của Microservices. Đồng thời, các module trong NestJS được thiết kế phân tách hoàn toàn theo ranh giới nghiệp vụ (Bounded Contexts), sẵn sàng tách ra thành Microservices trong tương lai khi lưu lượng tăng trưởng.

### Câu hỏi 2: Cơ chế bảo vệ tiền hoa hồng Escrow hoạt động ra sao nếu khách khiếu nại?
* **Trả lời của nhóm**: Khi đơn giao thành công, tiền hoa hồng KHÔNG được chuyển vào số dư khả dụng của KOL ngay mà nằm ở trạng thái `ESCROW_HOLDING` trong 14 ngày. Nếu có khiếu nại, trạng thái chuyển thành `ESCROW_FROZEN`. Chỉ khi hết 14 ngày mà không có khiếu nại, cronjob tự động giải phóng tiền sang `WALLET_AVAILABLE`. Nếu khiếu nại được duyệt chấp thuận, tiền được giải tỏa hoàn trả ví khách và hủy bút toán hoa hồng, đảm bảo Shop và Nền tảng không bao giờ bị thất thoát dòng tiền.

### Câu hỏi 3: Nếu một người dùng liên tục bấm nút 'Rút tiền' cùng 1 lúc thì hệ thống có bị rút đúp tiền không?
* **Trả lời của nhóm**: Hoàn toàn không. Hệ thống áp dụng 2 tầng bảo vệ: (1) Ở tầng API, Redis Rate Limiting giới hạn 1 yêu cầu rút tiền mỗi 10 giây trên mỗi người dùng; (2) Ở tầng CSDL, Prisma thực hiện truy vấn khóa dòng `SELECT ... FOR UPDATE` (Pessimistic Row-level Locking) trên bảng Wallets. Giao dịch đầu tiên sẽ khóa dòng số dư và trừ tiền, giao dịch thứ hai đến sau sẽ đọc được số dư đã bị trừ và lập tức bị từ chối với lỗi Insufficient Balance.
