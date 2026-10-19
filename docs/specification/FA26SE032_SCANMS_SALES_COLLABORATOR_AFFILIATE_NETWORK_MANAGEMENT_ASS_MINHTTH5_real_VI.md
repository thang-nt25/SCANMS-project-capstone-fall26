# BẢN ĐĂNG KÝ ĐỀ TÀI ĐỒ ÁN TỐT NGHIỆP (CAPSTONE PROJECT)

**Lớp:** SE... | **Thời gian thực hiện:** Từ 07/09/2026 Đến 30/12/2026  
**(*) Ngành:** Kỹ thuật Phần mềm (Software Engineer) | **Chuyên ngành:** Software Engineering (SE)  
**(*) Đối tượng đăng ký:** Sinh viên (Students)

---

### 1. Thông tin Giảng viên hướng dẫn (GVHD)
| STT | Họ và tên | Điện thoại | Email | Học hàm/Học vị |
| --- | --- | --- | --- | --- |
| 1 | Tôn Thất Hoàng Minh | 0936668995 | MinhTTH5@fe.edu.vn | Giảng viên |

---

### 2. Thông tin Sinh viên thực hiện (4 Thành viên chính thức)
| STT | Họ và tên | Mã sinh viên | Điện thoại | Email | Vai trò trong nhóm |
| --- | --- | --- | --- | --- | --- |
| 1 | Nguyễn Thành Thắng | SE184251 | 0966823637 | Thangntse184251@fpt.edu.vn | **Trưởng nhóm (Leader)** |
| 2 | Nguyễn Đình Tuấn | SE182540 | 0787664860 | tuanndse182540@fpt.edu.vn | Thành viên (Member) |
| 3 | Nguyễn Phú Quý | SE180104 | 0766824448 | Quynpse180104@fpt.edu.vn | Thành viên (Member) |
| 4 | Phan Xuân Thịnh | SE184527 | 0945645753 | thinhpxse184527@fpt.edu.vn | Thành viên (Member) |

---

### 3. Nội dung Đăng ký Đồ án Tốt nghiệp

#### (*) 3.1. Tên Đồ án Tốt nghiệp:
- **Tiếng Anh:** Sales Collaborator and Affiliate Network Management System (SCANMS)  
- **Tiếng Việt:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết đa gian hàng  
- **Tên viết tắt (Mã đề tài):** FA26SE032  

**Bối cảnh (Context):**  
Mô hình bán hàng trực tiếp đến người tiêu dùng (D2C) và thương mại xã hội (Social Commerce) đang tăng trưởng bùng nổ tại Việt Nam, dẫn đầu bởi các nền tảng như TikTok Shop và Shopee. Các thương hiệu và gian hàng bán lẻ ngày càng phụ thuộc vào mạng lưới nhà sáng tạo nội dung phân tán (KOL, KOC, Affiliate) để phân phối sản phẩm. Tuy nhiên, việc quản lý mạng lưới tiếp thị đa gian hàng theo phương pháp thủ công hoặc các kênh rời rạc phát sinh nhiều rủi ro kinh doanh và bảo mật nghiêm trọng:
- **Sai lệch tài chính & Chậm trễ đối soát:** Tính toán thủ công các chính sách hoa hồng đa tầng giữa nhiều ngành hàng dẫn đến sai sót, tranh chấp số liệu và làm giảm niềm tin của cộng tác viên.
- **Lỗ hổng tracking & Gian lận traffic:** Thiếu cơ chế tracking chặt chẽ dẫn đến tranh chấp ghi nhận đơn hàng, đánh cắp cookie và tình trạng bot 'cày click ảo' làm hao hụt ngân sách tiếp thị mà không tạo ra doanh số thật.
- **Logistics ngược & Thất thoát tiền hoa hồng:** Không có cơ chế quỹ bảo chứng (Escrow), chủ shop thường xuyên phải chi trả hoa hồng cho những đơn hàng sau đó bị khách trả hàng, hoàn tiền.
- **Phân mảnh tài nguyên & Thất thoát hàng mẫu:** Tài liệu quảng bá, hình ảnh và kịch bản review bị rải rác trên các nhóm chat (Zalo, Telegram). Quy trình cấp phát sản phẩm mẫu cho KOL thiếu sự theo dõi vận đơn và kiểm duyệt bằng chứng video review.
- **Thiếu mô hình sàn đa gian hàng hợp nhất:** Các công cụ tiếp thị liên kết truyền thống chỉ phục vụ cho một cửa hàng đơn lẻ, thiếu nền tảng trung gian bảo chứng quyền lợi cho cả Chủ Shop, KOL, Khách mua hàng và Kiểm duyệt viên sàn.

Vì vậy, việc xây dựng SCANMS — Nền tảng sàn thương mại tiếp thị liên kết và mạng lưới gian hàng đối tác hợp nhất — tự động hóa toàn bộ vòng đời từ định danh e-KYC, tracking referral, quỹ bảo chứng Escrow, quy trình cấp hàng mẫu, đến đối soát chi trả hoa hồng an toàn và ứng dụng AI kép là giải pháp công nghệ thiết yếu.

**Giải pháp đề xuất (Proposed Solutions):**  
SCANMS là giải pháp Web Portal cấp doanh nghiệp vận hành theo mô hình Sàn Tiếp Thị Liên Kết Đa Gian Hàng (Multi-Merchant Affiliate Marketplace) với 5 vai trò người dùng (System Administrator, System Manager, Shop Manager, Collaborator/KOL, và Customer).

**Các tính năng cốt lõi (Core Features):**
1. **Quản lý Định danh & Phân quyền Đa Vai trò (IAM & RBAC):**
   - Phân quyền nghiêm ngặt dựa trên vai trò (RBAC) với 5 vai trò chính: System Admin, System Manager (Kiểm duyệt sàn & Trọng tài khiếu nại), Shop Manager, Collaborator (KOL/KOC) và Customer (Khách mua hàng).
   - Quy trình định danh điện tử (e-KYC) cho KOL và Shop (CCCD, Giấy phép kinh doanh, MST, tài khoản ngân hàng) được kiểm duyệt đa cấp.
2. **Ma trận Biến thể Sản phẩm & Tích hợp Vận chuyển:**
   - Quản lý danh mục chuẩn sàn TMĐT với ma trận phân loại (Màu sắc x Kích cỡ), quản lý tồn kho theo SKU con và kích thước/khối lượng đóng gói kết nối API đơn vị vận chuyển.
   - Bắt buộc đăng nhập tài khoản khi mua hàng (loại bỏ hoàn toàn Guest Checkout) nhằm bảo đảm truy xuất đơn hàng, sổ địa chỉ và quyền khiếu nại đổi trả.
3. **Động cơ Tracking Last-Click, Giới thiệu Động & Chống Gian lận:**
   - Tự động sinh link tiếp thị rút gọn mã hóa, mã giảm giá riêng của KOL và mã QR Code động.
   - Cơ chế ghi nhận Last-Click qua cookie kết hợp Rate Limiting trên bộ nhớ đệm chống spam click ảo.
4. **Cấu hình Hoa hồng, Quỹ Bảo chứng Escrow & Logistics Ngược:**
   - Chính sách hoa hồng linh hoạt: hoa hồng chuẩn sàn, hoa hồng riêng theo sản phẩm, hoặc thưởng theo mốc doanh số.
   - Sổ cái tài chính với quỹ bảo chứng Escrow (tiền hoa hồng tạm giữ ở trạng thái Pending, tự động duyệt sang ví khả dụng khi hết hạn đổi trả, hoặc thu hồi Clawback khi đơn hoàn hủy).
5. **Tương tác Thời gian thực, Cấp Hàng Mẫu & Livestream Bán Hàng:**
   - Hệ thống chat 1-1 realtime giữa Shop và KOL, gửi trực tiếp thẻ mời chiến dịch độc quyền vào khung chat.
   - Quy trình xin và nghiệm thu hàng mẫu có mã vận đơn, cùng phòng Livestream bán hàng ghim deal trực tiếp.
6. **Bộ đôi Động cơ AI & Bảng Điều khiển Phân tích:**
   - AI Smart Matching phân tích ngành hàng gợi ý top KOL phù hợp cho từng sản phẩm; AI Anti-Fraud quét phát hiện hành vi gian lận traffic.
   - Dashboard phân tích doanh số thời gian thực và Bảng vinh danh Top KOL theo mốc thời gian.
7. **Chi trả Tài chính An toàn & Tuân thủ Thuế:**
   - Rút tiền áp dụng khóa dòng trong CSDL triệt tiêu lỗi âm ví và race condition.
   - Tự động khấu trừ thuế TNCN theo quy định đối với các khoản rút đạt ngưỡng, lưu vết kiểm toán và xuất file đối soát thanh toán lô.

---

#### Yêu cầu Chức năng (Functional Requirement):
- **Quản lý Người dùng & Xác thực:** Đăng ký, đăng nhập an toàn với mật khẩu mã hóa, JWT Access/Refresh tokens, xác thực 2 bước 2FA OTP và nộp/duyệt hồ sơ e-KYC đa cấp.
- **Hệ thống Tracking & Giới thiệu:** Sinh link rút gọn mã hóa, mã giảm giá độc quyền cho KOL, mã QR Code động. Ghi nhận click với Rate Limit và Cookie Last-Click.
- **Quản lý Đơn hàng, Logistics Ngược & Khách hàng:** Đăng nhập mua hàng, giỏ hàng, quản lý đơn hàng. Quy trình khách gửi yêu cầu Đổi trả / Hoàn tiền kèm ảnh bằng chứng, đặt shipper thu hồi hàng và System Manager phân xử tranh chấp.
- **Quản lý Hoa hồng, Escrow & Rút tiền:** Động cơ Escrow tạm giữ hoa hồng trong thời gian bảo hành đổi trả, tự động tính hoa hồng, thu hồi hoa hồng khi hoàn đơn, rút tiền an toàn qua khóa dòng CSDL, khấu trừ thuế và xuất file chuyển khoản lô.
- **Quản lý Sản phẩm, Biến thể & Tồn kho:** Quản lý ma trận biến thể sản phẩm, tồn kho SKU con, tính cước vận chuyển và kho Media Hub tập trung 1-Click Copy.
- **Hợp tác KOL, Hàng Mẫu & Livestream:** Chat realtime giữa Shop và KOL, mời campaign độc quyền, quy trình xin và nghiệm thu hàng mẫu, phiên Livestream bán hàng ghim deal.
- **Động cơ AI, Báo cáo & Phân tích:** AI gợi ý KOL phù hợp, AI phát hiện gian lận traffic, Dashboard biểu đồ trực quan thời gian thực, bảng xếp hạng Top KOL và Nhật ký kiểm toán Audit Logs toàn sàn.

---

#### Yêu cầu Phi chức năng (Non-functional Requirement):
- **Bảo mật (Security):** Tuân thủ tiêu chuẩn OWASP Top 10, mật khẩu mã hóa an toàn, cookie HTTP-only SameSite, phân quyền RBAC Guard, mã hóa dữ liệu cá nhân và thông tin ngân hàng.
- **Tính toàn vẹn Dữ liệu & Xử lý Đồng thời:** Tuân thủ ACID, áp dụng khóa dòng CSDL chống Race Condition khi rút tiền, duy trì sổ cái tài chính Append-Only bất biến.
- **Hiệu năng (Performance):** Thời gian phản hồi API core dưới 200ms, tải trang frontend dưới 1.5 giây. Sử dụng In-Memory Cache cho truy vấn sản phẩm, tracking link và rate limit chống click spam.
- **Khả năng mở rộng (Scalability):** Kiến trúc Modular Monolithic với NestJS, phân tách ranh giới module rõ ràng, tối ưu connection pooling chịu tải lượng lớn người dùng đồng thời.

---

#### (*) 3.2. Nội dung đề xuất chính (Bao gồm kết quả và sản phẩm)

**Lý thuyết và thực hành (Tài liệu):**  
Sinh viên áp dụng quy trình phát triển phần mềm Agile/Scrum, thể hiện sự am hiểu chuyên sâu về:
- **Phát triển Backend Cấp Doanh nghiệp (Node.js & NestJS):** Xây dựng Modular Monolith hướng tên miền với Controllers, Services, Guards, Interceptors, Decorators và WebSocket Gateways.
- **Thiết kế CSDL & Xử lý Đồng thời (PostgreSQL & Prisma ORM):** Thiết kế schema quan hệ chuẩn 3NF, đánh chỉ mục, Database Transaction, khóa dòng bi quan và trường JSONB.
- **Bộ nhớ đệm In-Memory & Kiểm soát Phân tán (Redis):** Tracking tốc độ cao, quản lý token và giới hạn tần suất request phân tán.
- **Kỹ nghệ An ninh & Kiểm toán Tài chính:** Xác thực kép JWT + 2FA, chữ ký số, RBAC Guard, nhật ký Audit Log và khấu trừ thuế TNCN.
- **Thuật toán Thông minh & Phân tích Dữ liệu:** Thuật toán ghép cặp KOL - Sản phẩm và luật heuristic phát hiện gian lận traffic.

**Sản phẩm (Products):**
1. **Management Web Portal (React + Vite):** Dành cho Quản trị viên tối cao, Kiểm duyệt viên sàn và Chủ Shop quản lý sản phẩm biến thể, duyệt KYC, phân xử khiếu nại và duyệt rút tiền lô.
2. **Collaborator Web Application (React + Vite):** Dành cho KOL/KOC lấy link tiếp thị, mã coupon, xin hàng mẫu, chat với Shop và theo dõi ví hoa hồng.
3. **Cổng Trải nghiệm Mua hàng Khách hàng (React + Vite):** Mua hàng bắt buộc đăng nhập, giỏ hàng, tra cứu hành trình vận chuyển, tạo khiếu nại đổi trả và đánh giá sản phẩm.
4. **Dịch vụ API Backend (NestJS & Prisma):** Hệ thống API RESTful và WebSocket phục vụ các module nghiệp vụ, cron job Escrow tự động và kết nối thanh toán/vận chuyển.
5. **Hạ tầng CSDL & Caching:** PostgreSQL kết hợp Redis In-Memory Cache.
6. **Bộ Tài liệu Kỹ thuật Dự án:** SRS, SAD, ERD chuẩn 3NF, sơ đồ UML Sequence/Component, tài liệu API và kịch bản kiểm thử Runbook.

**Các nhiệm vụ đề xuất (Proposed Tasks):**
- Kỹ nghệ Yêu cầu Phần mềm (URS/SRS): Phân tích 5 vai trò, đặc tả yêu cầu chức năng và luật nghiệp vụ Escrow, Clawback, Thuế TNCN.
- Thiết kế Kiến trúc & Mô hình CSDL (SAD): Xây dựng ERD chuẩn 3NF trong PostgreSQL, thiết kế máy trạng thái hữu hạn cho đơn hàng, đổi trả, hàng mẫu và hoa hồng.
- Triển khai Backend Core & Modules: Dựng kiến trúc NestJS, Prisma Migration/Seed, Redis Rate Limit, Socket.io Gateway và cron job Escrow.
- Phát triển Frontend & Hệ thống Thiết kế: Xây dựng UI bằng React, Vite, hệ thống màu Vàng Be (Warm Sand & Gold) và biểu đồ phân tích.
- Tích hợp, Gia cố Bảo mật & Kiểm thử Đồng thời: Tích hợp cổng thanh toán và vận chuyển sandbox; chạy test kiểm tra khóa dòng rút tiền và kiểm thử E2E các luồng vận hành thực tế.

---

#### 4. Ý kiến khác
*(Không có)*

| Giảng viên Hướng dẫn (Ký và ghi rõ họ tên)<br>**Tôn Thất Hoàng Minh** | TP.HCM, ngày 12/12/2025<br>Đại diện nhóm đăng ký (Ký và ghi rõ họ tên) |
| --- | --- |