# BẢN ĐĂNG KÝ ĐỀ TÀI ĐỒ ÁN TỐT NGHIỆP (CAPSTONE PROJECT)

**Lớp:** SE... | **Thời gian thực hiện:** Từ 01/01/2026 Đến 30/04/2026  
**(*) Ngành:** Kỹ thuật Phần mềm (Software Engineer) | **Chuyên ngành:** Software Engineering (SE)  
**(*) Đối tượng đăng ký:** Sinh viên (Students)

---

### 1. Thông tin Giảng viên hướng dẫn (GVHD)
| STT | Họ và tên | Điện thoại | Email | Học hàm/Học vị |
| --- | --- | --- | --- | --- |
| 1 | Tôn Thất Hoàng Minh | 0936668995 | MinhTTH5@fe.edu.vn | Giảng viên |

---

### 2. Thông tin Sinh viên thực hiện
| STT | Họ và tên | Mã sinh viên | Điện thoại | Email | Vai trò trong nhóm |
| --- | --- | --- | --- | --- | --- |
| 1 | Nguyễn Thành Thắng | SE184251 | 0966823637 | Thangntse184251@fpt.edu.vn | **Trưởng nhóm (Leader)** |
| 2 | Nguyễn Đình Tuấn | SE180104 | 0787664860 | tuanndse182540@fpt.edu.vn | Thành viên (Member) |
| 3 | Nguyễn Phú Quý | SE180104 | 0766824448 | Quynpse180104@fpt.edu.vn | Thành viên (Member) |
| 4 | Phan Xuân Thịnh | SE184527 | 0945645753 | thinhpxse184527@fpt.edu.vn | Thành viên (Member) |
| 5 | Trần Văn Nhật | SE172768 | 0949997692 | NhatTVSE172768@fpt.efu.vn | Thành viên (Member) |

---

### 3. Nội dung Đăng ký Đồ án Tốt nghiệp

#### (*) 3.1. Tên Đồ án Tốt nghiệp:
- **Tiếng Anh:** Sales Collaborator and Affiliate Network Management System  
- **Tiếng Việt:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết  
- **Tên viết tắt (Mã đề tài):** FA26SE032  

**Bối cảnh (Context):**  
Mô hình bán hàng trực tiếp đến người tiêu dùng (D2C) và thương mại xã hội (Social Commerce) đang tăng trưởng bùng nổ tại Việt Nam. Các nền tảng thương mại điện tử và thương hiệu trực tuyến ngày càng phụ thuộc vào mạng lưới phân tán gồm các cộng tác viên bán hàng (KOL, KOC và Affiliate) để phân phối sản phẩm. Tuy nhiên, việc quản lý mạng lưới này theo phương pháp thủ công đang gây ra nhiều rủi ro vận hành và kinh doanh nghiêm trọng:
- **Sai lệch tài chính (Financial discrepancies):** Tính toán thủ công các chính sách hoa hồng đa tầng (theo sản phẩm, theo doanh số hoặc tỷ lệ giới thiệu nhiều cấp) dẫn đến sai sót, chậm trễ đối soát và làm giảm niềm tin của cộng tác viên.
- **Nghẽn hiệu suất (Performance bottlenecks):** Cộng tác viên thiếu bảng theo dõi thời gian thực (nhấp chuột, tỷ lệ chuyển đổi, trạng thái đơn hàng) để tối ưu hóa chiến dịch tiếp thị; trong khi Quản lý cửa hàng thiếu dữ liệu để nhận diện đối tác xuất sắc.
- **Phân mảnh tài nguyên & Lộ dữ liệu (Resource fragmentation & data leakage):** Tài liệu quảng cáo, hình ảnh và mô tả sản phẩm bị rải rác trên nhiều nhóm chat (Zalo, Telegram), dẫn đến thông điệp thương hiệu không thống nhất. Danh sách khách hàng gắn liền với CTV dễ bị trùng lặp hoặc rò rỉ.
- **Không đồng bộ tồn kho (Inventory misalignment):** Cộng tác viên đi bán các sản phẩm đã hết hàng do thiếu sự đồng bộ tồn kho thời gian thực.

Vì vậy, một nền tảng kỹ thuật số hợp nhất giúp tự động hóa toàn bộ vòng đời cộng tác viên — từ đăng ký, phân phối tài nguyên tiếp thị, theo dõi giới thiệu, đến đối soát hoa hồng tự động và chi trả an toàn — là vô cùng thiết yếu để doanh nghiệp mở rộng quy mô.

**Giải pháp đề xuất (Proposed Solutions):**  
Hệ thống đề xuất là một giải pháp Web Portal cấp doanh nghiệp (Enterprise-grade) được thiết kế nhằm tối ưu hóa các mô hình chia sẻ doanh thu và nâng cao hiệu suất mạng lưới cộng tác viên bán hàng trực tuyến.

**Các tính năng cốt lõi (Core Features):**
1. **Quản lý Định danh & Truy cập (IAM):**
   - Phân quyền nghiêm ngặt dựa trên vai trò (RBAC) với 3 vai trò chính: System Administrator, Shop Manager và Collaborator.
   - Quy trình đăng ký tài khoản có cấu trúc giúp xác minh giấy tờ định danh, thông tin thuế và tài khoản ngân hàng để chi trả hợp pháp.
2. **Động cơ Tracking & Phân bổ (Attribution & Tracking Engine):**
   - Tự động tạo link tiếp thị liên kết mã hóa, mã giảm giá riêng (promo coupon) và mã QR Code động.
   - Áp dụng tracking theo browser cookie và dấu vân tay thiết bị (device fingerprinting) để đảm bảo ghi nhận đơn hàng chính xác trong thời hạn hiệu lực cấu hình được.
3. **Động cơ Cấu hình & Tính hoa hồng tự động (Commission Configuration & Billing Engine):**
   - Quy tắc hoa hồng linh hoạt: Cố định theo sản phẩm, % doanh số, hoặc thưởng theo bậc doanh số tháng.
   - Sổ cái giao dịch tài chính ghi nhận các trạng thái hoa hồng: Pending (Chờ duyệt), Approved (Đã duyệt khi hoàn tất đơn và hết hạn đổi trả), và Reversed (Hủy do hoàn trả/hủy đơn).
4. **Cổng thông tin Cộng tác viên (Responsive Web Interface):**
   - Dashboard phân tích thời gian thực hiển thị số click, đơn hàng thành công, tỷ lệ chuyển đổi (CR), hoa hồng chờ duyệt và số dư có thể rút.
   - Kho thư viện tài nguyên truyền thông tập trung cho CTV tải ảnh sản phẩm, video và bài viết chuẩn SEO.
5. **Phân hệ Chi trả & Đối soát (Payout & Settlement Module):**
   - Yêu cầu rút tiền tự động khi số dư vượt mức tối thiểu.
   - Quy trình duyệt của Quản lý, tự động tạo hóa đơn và đối soát chuyển khoản ngân hàng nhằm ngăn chặn thất thoát dòng tiền.
6. **Bảng điều khiển Quản trị Doanh nghiệp (Admin & Manager Portal):**
   - Bảng xếp hạng thời gian thực vinh danh các CTV đóng góp doanh thu cao nhất.
   - Báo cáo phân tích hiệu suất bán hàng của cửa hàng, chi phí hoa hồng và tỷ lệ hoàn trả.

---

#### Yêu cầu Chức năng (Functional Requirement):

- **Quản lý Người dùng & Xác thực:** Đăng ký, xác minh danh tính và quản lý chi tiết ngân hàng nhận tiền. Đăng nhập an toàn qua JWT và phân quyền.
- **Hệ thống Tracking & Giới thiệu:** Tạo link giới thiệu, mã coupon và mã QR gắn với ID của CTV. Ghi nhận traffic nhấp chuột từ nhiều kênh.
- **Quản lý Đơn hàng & Doanh số:** Đồng bộ đơn hàng từ giỏ hàng trực tuyến. Phân bổ đơn hàng cho CTV theo mô hình Last-Click Attribution. Quản lý vòng đời đơn: Pending -> Shipping -> Delivered -> Completed (hoặc Cancelled/Returned).
- **Quản lý Hoa hồng & Chi trả:** Cấu hình quy tắc hoa hồng và các mốc thưởng. Tự động cộng/trừ số dư ví CTV dựa trên cập nhật đơn hàng thời gian thực. Xử lý yêu cầu rút tiền và xuất file giao dịch ngân hàng.
- **Quản lý Sản phẩm & Tồn kho:** Quản lý danh mục sản phẩm, đồng bộ tồn kho thời gian thực. Tải lên, quản lý và chia sẻ tài nguyên truyền thông.
- **Báo cáo & Phân tích:** Biểu đồ tương tác về xu hướng doanh số, tỷ lệ chuyển đổi, doanh thu. Xuất báo cáo chi trả hoa hồng và tóm tắt tài chính cho chủ shop.

---

#### Yêu cầu Phi chức năng (Non-functional Requirement):

- **Bảo mật (Security):** Mã hóa thông tin cá nhân và tài chính ở trạng thái lưu trữ và đường truyền. Tuân thủ tiêu chuẩn OWASP Top 10.
- **Tính vẹn toàn Dữ liệu (Data Integrity):** Thực thi nghiêm ngặt các ràng buộc ACID trong CSDL để tránh race condition khi cập nhật số dư đồng thời.
- **Hiệu năng (Performance):** Thời gian phản hồi API Core dưới 200ms, thời gian tải trang dưới 1.5 giây. Sử dụng Redis Caching cho truy vấn sản phẩm và tracking lượt nhấp link.
- **Khả năng mở rộng (Scalability):** Thiết kế kiến trúc Modular Monolithic, tối ưu hóa để xử lý hàng nghìn CTV hoạt động đồng thời và lượng đơn hàng lớn hàng ngày.

---

#### (*) 3.2. Nội dung đề xuất chính (Bao gồm kết quả và sản phẩm)

**Lý thuyết và thực hành (Tài liệu):**  
Sinh viên sẽ áp dụng quy trình phát triển phần mềm Agile/Scrum. Dự án thể hiện sự am hiểu nâng cao về:
- **Phát triển Web Backend (Node.js):** Thiết kế và phát triển API service hướng sự kiện, mở rộng linh hoạt bằng NestJS/Express.
- **Quản trị CSDL Quan hệ (PostgreSQL):** Thiết kế schema chuẩn hóa 3NF, đánh chỉ mục tối ưu, áp dụng Database Transaction bảo đảm tính nhất quán sổ cái tài chính. Tận dụng trường `JSONB` cho thuộc tính động.
- **Bảo mật & Kiểm toán Tài chính:** Cài đặt Audit Log ghi vết thao tác, RBAC middleware guard, mã hóa bảo vệ số dư tài chính.

**Sản phẩm (Products):**
1. **Management Web Portal (ReactJS/Next.js):** Dashboard cho Quản lý cửa hàng và Admin giám sát CTV, cấu hình quy tắc, duyệt rút tiền.
2. **Collaborator Web Application (ReactJS/Next.js):** Portal tối ưu cho trình duyệt mobile cho CTV đăng ký, lấy tài nguyên và theo dõi hoa hồng.
3. **Backend API Service (Node.js với NestJS/Express):** Xử lý business logic cốt lõi, attribution và CSDL.
4. **Hệ thống CSDL (PostgreSQL & Redis Cache):** Lưu trữ giao dịch an toàn kết hợp Caching tốc độ cao.
5. **Bộ Tài liệu Dự án Chi tiết:** SRS và SAD bao gồm ERD, Sequence và Component diagrams.

**Các nhiệm vụ đề xuất (Proposed Tasks):**
- Phân tích Yêu cầu Người dùng (URS).
- Lập Tài liệu Yêu cầu Phần mềm (SRS).
- Thiết kế Kiến trúc Hệ thống (SAD): ERD PostgreSQL, các thành phần và sơ đồ sequence.
- Triển khai CSDL & API: Tạo Database Migration, viết API Node.js và chạy Unit Test.

---

#### 4. Ý kiến khác
*(Không có)*

| Giảng viên Hướng dẫn (Ký và ghi rõ họ tên)<br>**Tôn Thất Hoàng Minh** | TP.HCM, ngày 12/12/2025<br>Đại diện nhóm đăng ký (Ký và ghi rõ họ tên) |
| --- | --- |
