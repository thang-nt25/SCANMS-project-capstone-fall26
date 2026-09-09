# NHẬT KÝ TIẾN ĐỘ VÀ ĐÓNG GÓP THÀNH VIÊN (SCANMS TEAM WORK LOG)

> **Dự án:** SCANMS (Mã đề tài: FA26SE032)  
> **Trưởng nhóm:** Nguyễn Thành Thắng (SE184251)  
> **Mục đích:** Ghi nhận tự động và chính xác đóng góp công việc của từng thành viên trong nhóm: *Ai làm -> Nút bấm / Màn hình UI nào -> API nào -> Code Backend nào thực thi -> Bảng CSDL nào biến động.*

---

## 📅 NHẬT KÝ CÔNG VIỆC THEO THỜI GIAN (WORK LOGS)

### [2026-07-23] Thành viên: Nguyễn Thành Thắng (Leader)
- **Trạng thái**: COMPLETED (100% Foundation Setup & Architecture)
- **Hạng mục đã thực hiện**:
  1. Khởi tạo toàn bộ Bộ hồ sơ Kỹ thuật & Báo cáo Đồ án tốt nghiệp chính thức (`FA26SE032_SCANMS_Final_Project_Report.docx` dày 224 paragraphs, 64 bảng chi tiết).
  2. Đồng bộ mã số đề tài chuẩn `FA26SE032` trên toàn bộ file đăng ký (`FA26SE032_...real.docx` & `.md`).
  3. Xây dựng Thiết kế CSDL Master 21 Bảng PostgreSQL 3NF (`docs/database/schema.sql` & `backend/prisma/schema.prisma`).
  4. Viết Đặc tả Yêu cầu SRS (`SRS_DOCUMENT.md`), Quy tắc nghiệp vụ (`BUSINESS_RULES.md`) và Kiến trúc hệ thống (`SAD_DOCUMENT.md`).
  5. Thiết kế Đặc tả RESTful API (`API_SPECIFICATION.md`) và Bộ quy chuẩn Code (`CODING_CONVENTIONS.md`).
  6. Khởi tạo khung dự án Backend NestJS Core, Frontend React Web Base, Docker Multi-Container và Bảo mật Gitignore.
- **File thực thi**: `docs/generate_capstone_docx.py`, `docs/database/schema.sql`, `backend/src/`, `frontend/src/`
- **Ghi chú**: Đã hoàn thành 100% nền tảng kỹ thuật và đẩy repository sạch bảo mật lên GitHub chính chủ `thang-nt25`.

### [2026-09-09] Thành viên: Nguyễn Thành Thắng (Leader)
- **Trạng thái**: COMPLETED (4-Person Parallel Architecture & Foundation Setup)
- **Hạng mục đã thực hiện**:
  1. Chuẩn hóa tên dự án chính thức và duy nhất: **SCANMS** (FA26SE032 - Sales Collaborator and Affiliate Network Management System).
  2. Cập nhật thương hiệu hiển thị trên Frontend: Title trang web, Logo Navbar, Footer và Nội dung Hero Homepage.
  3. Xây dựng Kịch bản Gieo mầm CSDL Master (`backend/prisma/seed.ts`) bao phủ trọn vẹn 21 bảng dữ liệu mẫu: User 4 roles, Store, 4 Tiers, 2 Sản phẩm, Media Hub, Link/QR tiếp thị, Ví tiền, Sổ cái tài chính, Đơn hàng và Cuộc hội thoại Chat.
  4. Cấu hình script `"seed": "prisma db seed"` trong `backend/package.json`.
  5. Thiết lập Ma trận Phân công Thực chiến cho 4 thành viên (`docs/4_PERSON_TEAM_EXECUTION_GUIDE.md`):
     - **Nguyễn Thành Thắng (Leader)**: Nhánh Git `thang` (FR-01 → FR-08: Nền tảng, IAM, Store & Products).
     - **Nguyễn Đình Tuấn**: Nhánh Git `tuan` (FR-09 → FR-16: Tracking, QR & Checkout).
     - **Phan Xuân Thịnh**: Nhánh Git `thinh` (FR-17 → FR-24: Đơn hàng, Hoa hồng & Ví tiền).
     - **Nguyễn Phú Quý (hoặc Trần Văn Nhật)**: Nhánh Git `quy` (FR-25 → FR-32: Chat Socket.io & 2 Động cơ AI).
- **File thực thi**: `backend/prisma/seed.ts`, `backend/package.json`, `frontend/index.html`, `frontend/src/components/layout/MainLayout.tsx`, `frontend/src/pages/HomePage.tsx`, `docs/4_PERSON_TEAM_EXECUTION_GUIDE.md`


---

### [2026-09-07] Thành viên: Nguyễn Đình Tuấn (UI/UX Designer & Frontend Dev)
- **Trạng thái**: COMPLETED (100% UX/UI Link và QR Tiếp Thị - FR-10, FR-11, FR-12, FR-13, FR-14)
- **Hạng mục đã thực hiện**:
  1. Hoàn thiện toàn diện luồng UX: Chọn sản phẩm kèm tìm kiếm -> Chọn kênh mạng xã hội -> Tạo link định danh -> Xem kết quả & QR code tức thì.
  2. Xây dựng Bảng tính hoa hồng thời gian thực (Commission Calculator): Tính hoa hồng cơ bản + thưởng cấp bậc Vàng + số tiền thực nhận/đơn.
  3. Triển khai tạo mã QR quét được bằng camera điện thoại trên HTML5 Canvas độ nét cao (512x512) với thư viện `qrcode.js`.
  4. Tích hợp công cụ Tùy chỉnh màu mã QR với Palette màu thương hiệu và Bộ kiểm định độ tương phản WCAG 2.1 (Contrast Ratio Gauge) thời gian thực, đảm bảo camera quét dễ dàng (tỉ lệ >= 4.5:1).
  5. Tải ảnh QR PNG thật với tên file chuẩn `SCANMS-QR-[code]-[channel].png`.
  6. Xây dựng Bộ kiểm tra mã giảm giá (Coupon Validation Engine): kiểm tra cú pháp, phát hiện trùng mã (`DUPLICATE10`), hết hạn (`EXPIRED10`), và lưu/áp dụng vào link & mã QR.
  7. Xây dựng cơ chế Invalidation khi đổi lựa chọn sản phẩm/kênh, phản hồi sao chép link (Clipboard API + Fallback), và chia sẻ mạng xã hội (Web Share, Facebook Share Dialog, Zalo, Copy Caption chuẩn SEO).
  8. Chuẩn hóa thuật ngữ chuyên môn: Sửa "Link đã mã hóa" thành "Link tiếp thị định danh CTV duy nhất (Affiliate Tracking Link)", bổ sung hướng dẫn Last-Click Attribution và Cookie 30 ngày.
  9. Bổ sung các trạng thái UX: Loading (spinner), Empty State (kho rỗng), Out of stock, Error/Retry state.
  10. Tái thiết kế toàn diện UX/UI khối Lịch sử link trong phiên (Session Links): Empty state minh họa trực quan kèm nút CTA tạo link / nạp 3 mẫu demo, hệ thống thẻ card tương tác cao cấp (ảnh thumbnail, channel pill có icon mạng xã hội, tracking code, coupon chip, URL mono preview, nút nạp lại QR, sao chép link tức thì, xóa từng link hoặc xóa tất cả có phản hồi toast).
  11. Nâng cấp toàn diện UX/UI màn hình Đăng ký / Đăng nhập (`#auth`): Form đăng ký linh hoạt theo 2 phân vai (KOL/CTV và Chủ Shop), thanh đo độ mạnh mật khẩu tương tác thời gian thực, nút ẩn/hiện mật khẩu, modal đọc Điều khoản dịch vụ và chính sách hoa hồng không gián đoạn, các nút đăng ký nhanh qua Google / TikTok, và tối ưu layout sạch sẽ bằng cách bỏ thanh tab thừa trên đỉnh, ẩn topbar thừa khi chưa đăng nhập.
  12. Sửa lỗi hiển thị sidebar (Fixed Sticky Sidebar & Layout Bounds): Khắc phục hiện tượng nút "Đăng xuất" bị trôi khỏi màn hình khi viewport thấp; chuẩn hóa `max-height: 100dvh`, cấu hình `flex: 1 1 0px` cho danh sách màn hình và ghim cố định cụm tài khoản `[Đăng nhập / Đăng xuất]` luôn hiển thị đầy đủ 100% ở đáy thanh bên.
  13. Phân quyền thanh điều hướng theo vai trò đăng nhập (Role-Based Sidebar Navigation - RBAC UI/UX): Lọc động danh sách chức năng thanh bên theo đúng vai trò đang đăng nhập (KOL / CTV hiển thị đúng 9 chức năng; Chủ Shop hiển thị đúng 8 chức năng); đồng bộ hóa tiêu đề không gian làm việc và thông tin avatar/profile trên Topbar (`Trần Văn Nhật - KOL hạng Vàng` vs `Sora Skin Official - Chủ gian hàng`); loại bỏ nút đổi vai trò tự động trên thanh bên để đảm bảo quy trình bảo mật chuẩn: muốn đổi vai trò thì bấm Đăng xuất ra màn hình đăng nhập.
  14. Hoàn thiện toàn diện UX/UI cho 3 vai trò (KOL/CTV, Chủ Shop và Quản trị Sàn - Multi-tenant SaaS Platform):
      - Mở rộng phân vai trên màn hình Đăng nhập/Đăng ký (`#auth`): Bộ chọn 3 vai trò (KOL/CTV, Chủ Shop, Quản trị Sàn), banner nghệ thuật tương ứng và tài khoản demo định sẵn (`demo@scanms.vn`, `shop@scanms.vn`, `admin@scanms.vn`).
      - Bổ sung màn hình Bảng vinh danh Leaderboard (`UI-16`) cho KOL/CTV: Bục vinh danh Top 3 với quà thưởng nóng, bảng xếp hạng Top 4-10, huy hiệu cấp bậc Gamification (Kim Cương, Vàng, Bạc, Đồng).
      - Bổ sung màn hình Quản lý Đội ngũ CTV cho Chủ Shop: Đo lường doanh số từng KOL, tỷ lệ chốt đơn, thiết lập hoa hồng VIP cá nhân hóa, duyệt gửi hàng mẫu và tạm ngưng quyền affiliate khi có cảnh báo gian lận.
      - Xây dựng trọn bộ Không gian Quản trị Sàn (Executive SaaS Super Admin) gồm 5 màn hình chuyên biệt: Tổng quan Sàn (GMV 24,8 tỷ ₫, phí SaaS 3%), Quản lý & Duyệt mở Gian hàng mới (Store Onboarding), Quản trị Người dùng & KOL toàn sàn (duyệt KYC CCCD/MST, mở/khóa tài khoản vi phạm), Cổng Ngân hàng VietQR/Napas247 (giám sát pool thanh khoản 8,4 tỷ ₫), và Nhật ký An ninh Audit Trail (chuỗi mã băm SHA-256 bất biến).
  15. Tách biệt bảo mật cho Quản trị Sàn trên màn hình Xác thực: Ẩn hoàn toàn tùy chọn 'Quản trị Sàn' khỏi chế độ Đăng ký (chỉ cho phép đăng ký công khai KOL/CTV và Chủ Shop; tự động chuyển layout 2 cột cân đối `.segmented.is-register`); chỉ giữ lại nút Quản trị Sàn bên tab Đăng nhập để phục vụ kiểm thử thử nghiệm UX/UI của Admin, tuân thủ nguyên tắc tài khoản Super Admin không được tự đăng ký công khai.
  16. Tái thiết kế toàn diện hộp chọn Điều khoản & Chính sách (Terms & Policy Agreement Card) trên màn hình Đăng ký:
      - Loại bỏ khoảng trống bất thường và lỗi ngắt dòng của các nút bấm; thay thế bằng lớp `.terms-label` dạng thẻ card tinh tế với nền nhẹ `var(--surface-2)` và viền bo góc 9px.
      - Căn chỉnh thẳng hàng hoàn hảo (Grid layout 18px 1fr) giữa ô checkbox và dòng chữ đầu tiên.
      - Áp dụng typography chuẩn inline link (`.inline-link-btn`) cho 'Điều khoản dịch vụ' và 'Chính sách hoa hồng & bảo mật', tích hợp `stopPropagation` để khi bấm mở modal đọc điều khoản không bị vô tình kích hoạt checkbox.
  17. Tái thiết kế toàn diện Thước đo độ mạnh mật khẩu (Fintech Multi-Segment Password Strength Meter) trên form Đăng ký:
      - Loại bỏ thanh xám đơn điệu 4px lỗi thời và nhãn văn bản tách rời; thay thế bằng component thẻ card `.password-meter-card` đồng bộ với ngôn ngữ thiết kế của SCANMS.
      - Thiết kế thanh tiến trình 4 đoạn phân khúc (4-segment progress bar) trực quan: Chưa nhập (4 vạch xám ẩn), Yếu (1 vạch đỏ), Trung bình (2 vạch cam hổ phách), Khá mạnh (3 vạch ngọc lục bảo), Rất an toàn (4 vạch xanh ngọc đậm chuẩn bảo mật ngân hàng).
  18. Nâng cấp Thẻ Điều khoản & Chính sách sang cấu trúc đối xứng toàn chiều rộng (Balanced 2-Row Terms Card):
      - Khắc phục triệt để tình trạng nội dung bị co cụm về góc trái để lại khoảng trống bất đối xứng lớn bên phải thẻ.
      - Tái cấu trúc thành 2 hàng khoa học: Hàng trên chứa checkbox căn giữa hoàn hảo cùng câu cam kết trải dài toàn diện; Hàng dưới bố trí lưới 2 nút hành động song song (`grid-template-columns: 1fr 1fr`) cho 'Điều khoản dịch vụ' và 'Chính sách & Bảo mật' trải đều 100% chiều ngang thẻ card.
      - Tối ưu hóa trải nghiệm bấm trên thiết bị di động với responsive tự động chuyển thành 1 cột trên màn hình hẹp (< 420px).
- **File thực thi**: `docs/ui-ux/NGUYENDINHTUAN/js/links.js`, `docs/ui-ux/NGUYENDINHTUAN/css/links.css`, `docs/ui-ux/NGUYENDINHTUAN/js/app.js`, `docs/ui-ux/NGUYENDINHTUAN/css/styles.css`, `docs/ui-ux/NGUYENDINHTUAN/index.html`.

---

### [2026-09-08] Thành viên: Nguyễn Đình Tuấn (UI/UX Designer & Frontend Dev)
- **Trạng thái**: COMPLETED (100% UX/UI Toàn Diện Kho Nội Dung Bán Hàng Media Hub - FR-08)
- **Hạng mục đã thực hiện**:
  1. Xây dựng Module kiến trúc độc lập `docs/ui-ux/NGUYENDINHTUAN/js/media.js` và Stylesheet `media.css` chuẩn Fintech Emerald hỗ trợ Responsive và Dark Mode.
  2. Xây dựng Bộ lọc & Tìm kiếm đa chiều: Lọc theo 5 dòng sản phẩm chủ lực (Serum Vitamin C, Kem chống nắng, Nước hoa hồng BHA, Gel rửa mặt, Mặt nạ Cica), theo 4 loại tài nguyên (Ảnh chụp HD, Video review, Banner ưu đãi, Caption SEO), và theo tỷ lệ khung hình (9:16 TikTok/Reels, 1:1 Feed vuông, 16:9 Youtube/Web, 4:3 Studio).
  3. Thanh tìm kiếm thời gian thực (Real-time Keyword Search) hỗ trợ debounce, lọc theo tên, chủ đề và định dạng file (.mp4, .png), kết hợp bộ sắp xếp (Mới nhất, Lượt tải nhiều nhất, Dung lượng file).
  4. Trình xem trước đa phương tiện nâng cao (Media Lightbox & Video Player Modal):
     - Lightbox ảnh HD hỗ trợ phóng to/thu nhỏ (Zoom in/out 50% - 250%), xoay ảnh 90 độ, cùng bảng thông số metadata chi tiết (pixel dimension, 300 DPI, color depth, dung lượng thực, chứng nhận bản quyền thương hiệu, gợi ý kênh đăng tải tối ưu).
     - Trình phát Video Review tương tác với bộ điều khiển HTML5 tùy chỉnh: Nút Play/Pause, thanh tua thời gian Scrub bar, đồng hồ đếm thời gian thực, điều chỉnh âm lượng/mute, bộ chọn tốc độ phát (1x, 1.25x, 1.5x, 2x) và chế độ toàn màn hình Fullscreen.
  5. Động cơ Tải tệp thực tế (Real Download Engine): Sử dụng Canvas và Blob URL để tải tệp nhị phân thực sự về ổ cứng máy tính với định dạng tên tệp chuẩn hóa `SCANMS_SoraSkin_[ProductName]_[AssetID].[ext]`, kèm thanh tiến trình tải động (Download Progress Dialog) đo lường tốc độ MB/s và thông báo toast thành công.
  6. Xử lý phản hồi lỗi tải tệp & Tệp hết hạn (Error State & Retry Feedback): Mô phỏng tệp CDN không khả dụng hoặc chiến dịch kết thúc với badge cảnh báo, nút 'Thử lại' và nút chuyển sang Chat để liên hệ Shop.
  7. Trình soạn thảo & Cá nhân hóa Caption tiếp thị chuẩn SEO (Personalized Caption Engine):
     - Tích hợp 4 kịch bản mục tiêu: Hook giật tít ngắn (TikTok/Shorts), Review trải nghiệm chuyên sâu (Facebook/Threads), Flash Sale cấp tốc (FOMO/Urgency), và Kịch bản Livestream 3 bước.
     - Cơ chế cá nhân hóa tự động (Dynamic Template Tags): Tự động gắn tên KOL (`Trần Văn Nhật`), Link tiếp thị định danh riêng (`https://scanms.vn/r/ref_nhat_c15`) và Mã giảm giá độc quyền (`NHATXINH10`).
     - Bộ công tắc kiểm soát: Bật/tắt tự chèn link affiliate, mã coupon và hashtag xu hướng.
     - Bộ đếm ký tự & hashtag thời gian thực, nút 'Sao chép Caption' 1-click với visual checkmark và clipboard fallback.
  8. Trình mô phỏng hiển thị bài đăng mạng xã hội (Social Post Live Simulator): Chuyển đổi xem trước bài đăng thực tế trên TikTok, Facebook và Threads với avatar KOL, dấu tích xanh xác minh, bố cục bài viết và thẻ sản phẩm liên kết.
  9. Đầy đủ các trạng thái trải nghiệm UX: Loading Skeleton Card với hiệu ứng shimmer wave, Empty State khi kho rỗng hoặc không tìm thấy kết quả tìm kiếm với nút 'Đặt lại bộ lọc', và Error State khi mất kết nối CDN với nút thử lại.
  10. Thẻ chứng nhận nguồn cấp nhãn hàng (Brand Authority Banner) và Modal Quy định sử dụng bản quyền: Cam kết 100% tài nguyên đã được kiểm duyệt pháp lý, 3 nguyên tắc vàng về tiếp thị liên kết minh bạch và quy định gắn nhãn `#Affiliate`.
- **File thực thi**: `docs/ui-ux/NGUYENDINHTUAN/js/media.js`, `docs/ui-ux/NGUYENDINHTUAN/css/media.css`, `docs/ui-ux/NGUYENDINHTUAN/js/app.js`, `docs/ui-ux/NGUYENDINHTUAN/index.html`, `docs/ui-ux/NGUYENDINHTUAN/serve.mjs`.

---

### [2026-09-08] Thành viên: Nguyễn Đình Tuấn (UI/UX Designer & Frontend Dev)
- **Trạng thái**: COMPLETED (100% UX/UI Toàn Diện Hàng Mẫu Dùng Thử - FR-30)
- **Hạng mục đã thực hiện**:
  1. Xây dựng Module độc lập `docs/ui-ux/NGUYENDINHTUAN/js/samples.js` và Stylesheet `samples.css` theo chuẩn thiết kế Fintech Emerald, hỗ trợ Responsive và Dark Mode.
  2. Triển khai Bố cục Master-Detail hiện đại: Cột trái quản lý danh sách yêu cầu với bộ lọc trạng thái (Tất cả, Chờ duyệt, Đang giao, Đã duyệt, Đã nhận, Từ chối) và ô tìm kiếm tức thì; Cột phải hiển thị chi tiết sản phẩm, tiến trình vận chuyển và thông tin nhận hàng tương ứng.
  3. Xây dựng Timeline tiến trình 4 bước (Step Timeline): Đã gửi đề xuất $\rightarrow$ Shop xét duyệt $\rightarrow$ Đang giao hàng $\rightarrow$ Đã nhận mẫu, với màu sắc trực quan tương ứng với từng giai đoạn bưu kiện.
  4. Xây dựng Form Đăng ký xin mẫu sản phẩm đầy đủ (Sample Request Modal): Chọn sản phẩm từ Catalog kèm tồn kho mẫu, thông tin người nhận, số điện thoại có kiểm tra định dạng regex, địa chỉ, kênh truyền thông (TikTok, YouTube, Facebook, Instagram), định dạng review và cam kết kịch bản. Khi gửi thành công sẽ tự động cập nhật ngay yêu cầu mới vào danh sách.
  5. Cơ chế Chỉnh sửa & Hủy yêu cầu linh hoạt: Cho phép sửa thông tin và hủy đơn khi ở trạng thái 'Chờ Shop duyệt'; Tích hợp hộp thoại giải thích lý do khóa chỉnh sửa khi đơn đã được Shop đóng gói hoặc bàn giao đơn vị vận chuyển.
  6. Quản lý Logistics & Vận đơn thông minh: Nút 1-click sao chép mã vận đơn, Modal tra cứu chi tiết lịch trình di chuyển bưu kiện qua các kho của GHTK/GHN.
  7. Quy trình xác nhận nhận hàng & Hoàn tất nghĩa vụ: Nút thao tác 'Tôi đã nhận được hàng' chuyển đổi trạng thái sang 'Đã nhận', kích hoạt bộ đếm thời hạn 7 ngày và Modal nộp link bài đăng review (TikTok/Facebook video URL) để hoàn tất cam kết.
  8. Tích hợp liên hệ Shop qua Chat: Nút 'Nhắn tin Shop' điều hướng trực tiếp sang màn hình Chat trao đổi với Chủ shop về yêu cầu nhận mẫu.
  9. Đầy đủ các trạng thái UX: Loading Skeleton Card, Empty State khi chưa có yêu cầu nào kèm nút CTA xin mẫu, và Error State với nút thử lại kết nối.
- **File thực thi**: `docs/ui-ux/NGUYENDINHTUAN/js/samples.js`, `docs/ui-ux/NGUYENDINHTUAN/css/samples.css`, `docs/ui-ux/NGUYENDINHTUAN/js/app.js`, `docs/ui-ux/NGUYENDINHTUAN/index.html`.

---

### [2026-09-08] Thành viên: Nguyễn Đình Tuấn (UI/UX Designer & Frontend Dev)
- **Trạng thái**: COMPLETED (100% Ma Trận 22 Artboard Figma 1440x1024 Trọn Bộ 4 Hàng & Bộ Ảnh Xuất Hi-Res)
- **Hạng mục đã thực hiện**:
  1. Thiết lập trang tổng thể `docs/ui-ux/NGUYENDINHTUAN/figma-board.html` dạng Canvas vô cực (Infinite Canvas) quy tụ toàn bộ 22 Master Screen Artboard (kích thước chuẩn Desktop 1440 x 1024) theo cấu trúc 4 hàng phân vai chuẩn Figma.
  2. Tổ chức chuẩn ma trận 4 hàng nghiệp vụ:
     - Hàng 1 (KOL / CTV): 01 Đăng nhập $\rightarrow$ 02 Tổng quan KOL $\rightarrow$ 03 Link & QR $\rightarrow$ 04 Kênh MXH $\rightarrow$ 05 Kho nội dung $\rightarrow$ 06 Hàng mẫu $\rightarrow$ 07 Bảng vinh danh $\rightarrow$ 08 Ví tiền.
     - Hàng 2 (Chủ Shop / Merchant): 09 Tổng quan Shop $\rightarrow$ 10 Danh mục sản phẩm $\rightarrow$ 11 Đội ngũ CTV $\rightarrow$ 12 Đối soát đơn $\rightarrow$ 13 Duyệt chi trả $\rightarrow$ 14 AI Fraud Sentinel.
     - Hàng 3 (Quản trị Sàn Super Admin): 15 Tổng quan Sàn GMV $\rightarrow$ 16 Quản lý Gian hàng $\rightarrow$ 17 Người dùng & Duyệt KYC $\rightarrow$ 18 Cổng Ngân hàng $\rightarrow$ 19 Audit Trail SHA-256.
     - Hàng 4 (Dùng chung & Khách mua): 20 Tin nhắn Chat Brief $\rightarrow$ 21 Storefront mua hàng $\rightarrow$ 22 Tra cứu vận đơn GHN/GHTK.
  3. Xuất trọn bộ 22 file ảnh tĩnh độ phân giải cao 1440x1024 vào thư mục dự án `docs/ui-ux/NGUYENDINHTUAN/figma-exports/` với tên file quy chuẩn tiện kéo thả trực tiếp vào Figma.
  4. Tính năng Dual-Mode trên Canvas: Cho phép chuyển đổi linh hoạt giữa "Chế độ Ảnh Figma 1440x1024" (siêu nhẹ, nét căng) và "Chế độ Web Live Iframe" (tương tác trực tiếp).
  5. Bộ công cụ điều khiển Canvas: Phóng to thu nhỏ tự do (Ctrl + Wheel), 3 mức zoom định sẵn (14% Toàn cảnh, 32% Trung bình, 100% Nét thật), nút kéo chuột toàn canvas (Pan) và nút tải ảnh PNG riêng lẻ cho từng khung vẽ.
- **File thực thi**: `docs/ui-ux/NGUYENDINHTUAN/figma-board.html`, `docs/ui-ux/NGUYENDINHTUAN/figma-exports/*`, `scratch/export-all-figma.js`.

## 🛠️ CÁCH SỬ DỤNG SKILL `scanms-progress-tracker`:

Mỗi khi bạn hoặc thành viên trong nhóm hoàn thành một đoạn code / màn hình UI / API mới, chỉ cần gõ lệnh:

> `/log-work` hoặc *"Ghi nhận tiến độ cho [Tên] vừa làm [Chức năng]"*

Skill **`scanms-progress-tracker`** sẽ tự động soi code thực tế và ghi vết nhật ký đóng góp chi tiết vào file này!
