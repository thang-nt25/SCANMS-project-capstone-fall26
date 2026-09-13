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

### [2026-09-10] Thành viên: Nguyễn Thành Thắng (Leader)
- **Trạng thái**: COMPLETED (100% FR-01 → FR-08 Backend & Frontend + Public Guest Storefront + Đồng Bộ UI Vàng Be)
- **Hạng mục đã thực hiện**:
  1. **Đồng bộ toàn diện hệ thống UI Vàng Be Figma**:
     - Chuẩn hóa màu chủ đạo toàn app sang **Vàng Be (Warm Sand `#F3EFE6`, Warm Cream `#FAF8F5`, Sand Gold `#C59B58` / `#B88E4F`, Ink `#1A1612`)**.
     - Chỉnh sửa trang Đăng nhập & Đăng ký: Cột giới thiệu nền Warm Sand với hoa văn chấm lưới Sand Gold, nút đăng nhập chính Vàng Đất `#C59B58` ("Đăng nhập an toàn").
     - Loại bỏ triệt để 85% CSS dư thừa, chuẩn hóa 100% Tailwind v4 + Lucide React icons.
  2. **Xây dựng Trang Bán Hàng Cho Khách Vãng Lai (Guest Storefront)**:
     - Route chính `/` và `/store`, `/storefront`, `/shop`: Cho phép khách truy cập và mua hàng trực tiếp mà không bắt buộc tạo tài khoản.
     - Luồng Đặt Hàng 1-Chạm: Form thông tin giao hàng (họ tên, SĐT, tỉnh/thành, địa chỉ), phương thức COD / VietQR, tự động áp mã ưu đãi KOL (`THANGVIP10` -10%), tạo mã đơn `#DH-2026-XXXX`.
     - Nút điều hướng thông minh: Nút `[ 🔐 Đăng nhập Đối tác / KOL ]` ở header của Storefront và các nút `[ ← Quay lại Cửa Hàng Sora Skin ]` trên trang Login và Register.
  3. **Hoàn thiện trọn bộ 8 chức năng phụ trách (FR-01 → FR-08)**:
     - FR-01 & FR-02: Xác thực đa vai trò IAM (JWT, OTP Email, Bcrypt, Google Sign-in).
     - FR-03 & FR-04: Quản lý Hồ sơ & Thông tin Gian hàng D2C (`StoreManagement`).
     - FR-05 & FR-06: Danh mục Sản phẩm Merchant, biến thể SKU và định giá hoa hồng.
     - FR-07: Kho tài nguyên truyền thông (`MediaHub`) với phân loại banner/video/copywriting.
     - FR-08: Quản lý liên kết Kênh mạng xã hội KOL (TikTok, Facebook, Instagram, YouTube) và Bảng vinh danh cấp bậc Gamification.
- **File thực thi**:
  - Frontend: `frontend/src/pages/store/GuestStorefrontPage.tsx`, `frontend/src/pages/auth/LoginPage.tsx`, `frontend/src/pages/auth/RegisterPage.tsx`, `frontend/src/routes/AppRoutes.tsx`, `frontend/src/pages/DashboardDispatcher.tsx`, `frontend/src/index.css`, `frontend/src/components/layout/Sidebar.tsx`
  - Backend: `backend/src/modules/auth/`, `backend/src/modules/products/`, `backend/src/modules/stores/`, `backend/src/modules/media/`, `backend/src/modules/social-channels/`, `backend/src/modules/tiers/`, `backend/src/modules/kyc/`
- **Ghi chú**: Build Frontend và Backend 0 lỗi, kiểm thử giao diện và luồng mua hàng thực tế qua Playwright thành công 100%.

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
---

### [2026-09-13] Thành viên: Nguyễn Đình Tuấn (Frontend & Backend Developer)
- **Trạng thái**: COMPLETED (100% Chức Năng FR-15 — Landing Page Sản Phẩm & Video Review)
- **Hạng mục đã thực hiện**:
  1. Phê duyệt chính thức và đồng bộ toàn văn 45 mục và 20 quyết định nghiệp vụ FR-15 vào `docs/FR-15_LANDING_PAGE_SAN_PHAM_VIDEO_REVIEW_DUYET_NGHIEP_VU.txt`.
  2. Backend NestJS:
     - Bổ sung 2 endpoint công khai `GET /products/:idOrSlug/landing` và alias `GET /products/landing/:idOrSlug`.
     - Hiện thực hàm `getLandingPageData` cách ly an toàn dữ liệu công khai (ẩn hoa hồng nội bộ, ẩn deletedAt).
     - Thuật toán che tên khách hàng tự động `maskCustomerName` (VD: `Nguyễn Đ*** T***`) bảo vệ quyền riêng tư.
     - Tự động sắp xếp ưu tiên Video Review của đúng KOL referral lên đầu khi có cookie/query referral.
     - Viết bộ unit test `products.landing.spec.ts` đạt 6/6 test pass 100%.
  3. Frontend React (SCANMS Buyer Landing Page):
     - Thiết kế chuẩn nhận diện Vàng Be (Warm Sand & Brand Gold): Canvas `#FAF8F5`, Sand `#F3EFE6`, Brand Gold `#C59B58`.
     - Thư viện ảnh sản phẩm kèm placeholder SVG trung tính SCANMS (không dùng ảnh ngẫu nhiên).
     - Trình phát Video Review KOL hiện đại: play/pause, tua, âm lượng, toàn màn hình, không autoplay có tiếng, thẻ KOL và nhãn minh bạch tiếp thị.
     - Đánh giá khách hàng xác minh: điểm trung bình sao, phân bố sao, huy hiệu `✓ Đã mua hàng`.
     - Tích hợp Coupon thật FR-12 gọi `POST /coupons/validate`.
     - Tích hợp Guest Checkout thật FR-16: Form 1 chạm, gọi `POST /checkout` kèm cookie `scanms_attr`, trả về mã đơn hàng thật và điều hướng theo dõi hành trình đơn hàng.
     - Mobile Sticky Action Bar giúp thao tác mua hàng tiện lợi khi cuộn.
- **File thực thi**: `backend/src/modules/products/products.controller.ts`, `backend/src/modules/products/products.service.ts`, `backend/src/modules/products/tests/products.landing.spec.ts`, `frontend/src/pages/ProductDetailPage.tsx`, `docs/FR-15_LANDING_PAGE_SAN_PHAM_VIDEO_REVIEW_DUYET_NGHIEP_VU.txt`.

---

### [2026-09-13] Thành viên: Nguyễn Đình Tuấn (Fullstack & Security Engineering)
- **Trạng thái**: COMPLETED (Khắc Phục Toàn Diện 15 Điểm Nghiêm Trọng & Nghiệp Vụ Chưa Hoàn Thành Cho FR-15)
- **Hạng mục đã thực hiện**:
  1. **Luồng đặt hàng Guest Checkout chuẩn xác**:
     - Frontend chuyển từ gọi `POST /checkout` sang gọi đúng endpoint hệ sinh thái backend: `POST /api/orders`.
     - Chuẩn hóa đầy đủ DTO `CreateOrderDto`: sinh `idempotencyKey` UUID bắt buộc chống gửi trùng lặp, gửi `orderNotes` (thay vì note), `couponCode`, `paymentMethod`, và danh sách `items: [{ productId, quantity }]`.
     - Không gửi đơn giá đã trừ chiết khấu; backend tự động truy xuất giá gốc từ cơ sở dữ liệu và tính toán giảm giá theo ngân sách coupon.
  2. **Xóa bỏ hoàn toàn mã đơn giả lập**:
     - Loại bỏ cơ chế tự sinh mã `ORDER-*` và `SCANMS-*` ngẫu nhiên trên frontend khi backend phản hồi bất thường.
     - Frontend chỉ hiển thị trạng thái đặt hàng thành công khi backend trả về bản ghi đơn hàng thật với `id` (UUID) và `externalOrderSn` (hoặc `orderCode`) hợp lệ; nếu không sẽ báo lỗi chi tiết để khách thử lại.
  3. **Xóa bỏ fallback coupon giảm 10% hard-code**:
     - Loại bỏ hoàn toàn dòng lệnh tự gán giảm giá 10% khi API backend trả về mức giảm 0đ.
     - Nếu mã coupon không có chiết khấu hoặc không đủ điều kiện đơn hàng, hệ thống hiển thị thông báo từ chối minh bạch và hủy trạng thái áp dụng mã.
  4. **Triệt tiêu lỗ hổng giả mạo KOL qua query `?kolId=...`**:
     - Loại bỏ hoàn toàn tham số `kolId` khỏi các API công khai `ProductsController` và `PublicProductsController`.
     - Backend bắt buộc giải mã phiên tiếp thị từ Cookie định danh khách ghé thăm đã ký HMAC SHA-256 (`scanms_attr` / `scanms_attribution`) và kiểm tra đối chiếu trực tiếp với bảng `AttributionSession` trong database.
  5. **Bảo mật phiên Attribution theo đúng chuẩn FR-13**:
     - Chấm dứt việc tự coi cookie là JSON Base64 không an toàn.
     - Tích hợp hàm bảo mật `verifyOpaqueVisitorToken`, hash SHA-256 `visitorId` để tìm kiếm session, xác minh trạng thái `ACTIVE`, kiểm tra thời hạn `expiresAt` và trạng thái link `referralLink.deletedAt`.
  6. **Sửa thuật toán ưu tiên Video Review KOL**:
     - Loại bỏ việc gán video đầu tiên cho KOL referral.
     - Bổ sung trường `collaboratorId` vào `MediaAsset`. Thuật toán sắp xếp ưu tiên 3 cấp rõ ràng: (1) Video của đúng KOL referral được khách hàng theo dõi $\rightarrow$ (2) Video nổi bật của Shop (`isFeatured: true`) $\rightarrow$ (3) Video đã duyệt mới nhất theo thời gian.
  7. **Hệ thống kiểm duyệt đa cấp cho Media (Media Moderation Workflow)**:
     - Mở rộng Prisma schema: thêm enum `MediaAssetStatus` (`PENDING`, `APPROVED`, `REJECTED`, `HIDDEN`), các trường `collaboratorId`, `reviewedBy`, `reviewedAt`, `rejectionReason`, `isFeatured`, `posterUrl`, `caption`.
     - Viết migration `20260913020000_fr15_media_review_moderation` và deploy thành công lên cơ sở dữ liệu Supabase PostgreSQL.
     - Landing page công khai chỉ truy vấn các video có trạng thái `APPROVED` và `isDeleted: false`.
  8. **API nộp và phê duyệt video cho KOL & Shop**:
     - Bổ sung API `POST /api/media/kol-submission` cho vai trò `COLLABORATOR` (tạo video ở trạng thái `PENDING`).
     - Bổ sung API `PATCH /api/media/:id/review` cho `SHOP_MANAGER` (chỉ được duyệt media của shop mình) và `SYSTEM_ADMIN` (duyệt toàn sàn).
  9. **Dữ liệu KOL thật từ Database**:
     - Chấm dứt việc tạo dữ liệu giả lập (tên mặc định, avatar DiceBear, tích xanh ảo).
     - Truy vấn quan hệ `collaborator` và hồ sơ `collaboratorProfile`: lấy tên thật, ảnh đại diện thật và trạng thái `isVerified` dựa trên `kycStatus === 'VERIFIED'`.
  10. **Kiểm duyệt Đánh giá khách hàng & Xác thực người mua**:
      - Sửa mặc định `ProductReview.isApproved` thành `false` (mọi đánh giá mới đều phải qua quy trình kiểm duyệt).
      - Đổi quan hệ `ProductReview` $\rightarrow$ `Product` sang `onDelete: Restrict` nhằm lưu giữ lịch sử kiểm toán.
      - Gắn nhãn "Đã mua hàng" chỉ khi đơn hàng của khách đã chuyển sang trạng thái `DELIVERED` hoặc `COMPLETED`.
  11. **Hiển thị điểm đánh giá chuẩn xác khi chưa có review**:
      - Backend trả về `averageRating: null` khi tổng số review bằng 0 (không còn tự động trả về 5.0 sao).
      - Frontend hiển thị nhãn "Chưa có đánh giá" kèm ngôi sao chưa kích hoạt.
  12. **Loại bỏ hoàn toàn ảnh Unsplash ngẫu nhiên**:
      - Làm sạch toàn bộ URL Unsplash khỏi backend và frontend; chỉ sử dụng ảnh chính thức từ sản phẩm hoặc placeholder SVG nội bộ SCANMS.
  13. **Xóa bỏ fallback dựng dữ liệu ảo trên Frontend**:
      - Loại bỏ đoạn code fallback sang `/products/:id` tự dựng fake store, tồn kho 10 và review 5 sao.
      - Khi API lỗi hoặc sản phẩm ngừng kinh doanh, giao diện hiển thị thông báo lỗi rõ ràng kèm nút "Thử lại".
  14. **Chính sách gian hàng thật từ cơ sở dữ liệu**:
      - Mở rộng model `Store`: thêm `policyReturn`, `policyWarranty`, `policyShipping`.
      - Backend trả về đúng cam kết do Shop cấu hình trong database.
  15. **Trạng thái xác minh và khóa tài khoản Shop**:
      - Mở rộng model `Store`: thêm `isActive`, `isVerified`.
      - Backend kiểm tra đồng thời `store.isActive` và tài khoản chủ shop `store.owner.isActive` (ném lỗi 403 Forbidden nếu chủ shop đang bị khóa).
  16. **Các tính năng bổ sung hoàn thiện**:
      - Endpoint RESTful công khai: `GET /api/public/products/:idOrSlug/landing` có đầy đủ tài liệu OpenAPI/Swagger (mô tả lỗi 400, 404, 410, 429, 500).
      - Bộ nhớ đệm (In-memory Cache 30s) và cơ chế tự động giải phóng (Invalidation) khi cập nhật/xóa sản phẩm.
      - Chống mã độc XSS: Kiểm tra Allowlist URL cho video và hình ảnh (`isSafeUrl`, `validateAllowedUrl`).
      - SEO động, Open Graph và Product Schema.org JSON-LD tự động cập nhật theo sản phẩm.
      - Trình phát video nâng cao: Chọn tốc độ phát (0.75x, 1x, 1.25x, 1.5x, 2x) và hiển thị phụ đề caption.
      - Theo dõi sự kiện Analytics: `page_view`, `video_start`, `video_complete`, `cta_click`, `checkout_start`, `order_complete`.
      - Bộ Unit Tests: `products.landing.spec.ts` (8/8 passed) và `media.moderation.spec.ts` (4/4 passed).
- **File thực thi**:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20260913020000_fr15_media_review_moderation/migration.sql`
  - `backend/src/modules/products/products.service.ts`
  - `backend/src/modules/products/products.controller.ts`
  - `backend/src/modules/products/public-products.controller.ts`
  - `backend/src/modules/products/dto/landing-page-response.dto.ts`
  - `backend/src/modules/products/dto/track-event.dto.ts`
  - `backend/src/modules/products/products.module.ts`
  - `backend/src/modules/media/media.controller.ts`
  - `backend/src/modules/media/media.service.ts`
  - `backend/src/modules/media/dto/submit-kol-video.dto.ts`
  - `backend/src/modules/media/dto/review-media.dto.ts`
  - `backend/src/modules/media/tests/media.moderation.spec.ts`
  - `backend/src/modules/products/tests/products.landing.spec.ts`
  - `backend/test/fr15-landing.e2e-spec.ts`
  - `frontend/src/pages/ProductDetailPage.tsx`
  - `frontend/src/pages/collaborator/MediaHubBrowserPage.tsx`
  - `frontend/src/pages/merchant/ProductManagementPage.tsx`
  - `docs/PROGRESS_LOG.md`

---

### 11. Sửa toàn diện 11 lỗi quan trọng còn lại của FR-15 (Landing Page & Video Review & Order Placement)
- **Ngày hoàn thành**: 13/09/2026
- **Người thực hiện**: Nguyễn Đình Tuấn (Pair programming cùng Leader Nguyễn Thành Thắng)
- **Hạng mục đã xử lý**:
  1. **E2E FR-15 xanh 100% & Khắc phục rò rỉ Scheduler/Prisma (`fr15-landing.e2e-spec.ts`)**:
     - Sửa lỗi cascade xóa dữ liệu quan hệ đơn hàng: `commission`, `attributionAdjustment`, `couponRedemption`, `orderItem`, `order`, `mediaAsset`, `attributionSession`, `referralLink`, `product`, `storeCollaborator`, `store`, `user`.
     - Tắt toàn bộ Cron Jobs và Timers của `SchedulerRegistry` trước khi teardown, dừng `ClickQueueService`, `CacheService`, đóng kết nối server và disconnect Prisma.
     - Cấu hình `--forceExit` cho kịch bản `test:e2e`; chạy `npm run test:e2e -- --runInBand fr15-landing.e2e-spec.ts` hoàn thành 2/2 test và thoát ngay lập tức không bị treo.
     - Xác nhận hoàn chỉnh luồng E2E: Cookie attribution $\rightarrow$ landing $\rightarrow$ ưu tiên video KOL $\rightarrow$ POST /orders $\rightarrow$ idempotency $\rightarrow$ tạo đơn hàng thật trong CSDL.
  2. **Bắt buộc Secret Attribution từ môi trường**:
     - Xóa bỏ fallback mặc định nguy hiểm `'scanms-jwt-secret-key-production'` trong `products.service.ts`.
     - Inject `ConfigService`; ném `InternalServerErrorException` và chặn máy chủ khởi động khi thiếu `JWT_SECRET`.
  3. **Kiểm tra quyền hợp tác trước khi KOL nộp video (`submitKolVideo`)**:
     - Kiểm tra quan hệ `StoreCollaborator` trạng thái `APPROVED` giữa KOL và Store.
     - Ném `ForbiddenException` nếu KOL chưa được duyệt làm CTV của Shop.
  4. **Allowlist URL an toàn & Chống SSRF**:
     - Kiểm tra domain chỉ cho phép các máy chủ kiểm định: `scanms.vn`, `cdn.scanms.vn`, `cloudinary.com`, `res.cloudinary.com`, `youtube.com`, `youtu.be`, `tiktok.com`, `vimeo.com`, `supabase.co`, `storage.googleapis.com`, `amazonaws.com`.
     - Chặn giao thức nguy hiểm (`javascript:`, `data:`, `file:`) và chặn IP nội bộ/localhost (`127.0.0.1`, `localhost`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`) chống tấn công SSRF.
  5. **Bắt buộc lý do kiểm duyệt khi REJECTED / HIDDEN**:
     - `ReviewMediaDto` và `MediaService.reviewMedia()` chặn trạng thái `PENDING`.
     - Bắt buộc cung cấp `rejectionReason` không được rỗng khi chọn `REJECTED` hoặc `HIDDEN`.
  6. **Ghi vết kiểm toán AuditLog cho mọi hành động kiểm duyệt**:
     - Tự động tạo bản ghi `AuditLog` ghi nhận `userId`, `action: MEDIA_REVIEWED`, `mediaId`, `productId`, `previousState`, `newState` và `reviewerRole`.
  7. **Ràng buộc duy nhất 1 video featured cho cùng sản phẩm**:
     - Thực thi Prisma Transaction: khi đặt video mới `isFeatured: true`, tự động cập nhật `isFeatured: false` cho toàn bộ video khác của cùng sản phẩm.
  8. **Hạ tầng Cache Landing Page chuẩn Production**:
     - Thay thế cache thô sơ bằng Bounded LRU Cache (giới hạn tối đa 500 mục, TTL 30s) chống tràn RAM.
     - Sử dụng HMAC hash của visitorId trong key (không lưu raw cookie token).
     - Triển khai cơ chế Invalidation chính xác theo SKU/Product ID (`invalidateGlobalLandingCache`) gọi ngay khi Shop duyệt/ẩn media, cập nhật sản phẩm.
  9. **Giao diện người dùng Web cho nộp và duyệt video**:
     - **KOL** (`MediaHubBrowserPage.tsx`): Bổ sung nút & modal "Nộp Video Review", cho phép chọn sản phẩm, nhập tiêu đề, link video, thumbnail và caption. Gọi API `POST /api/media/kol-submission`.
     - **Shop Manager** (`ProductManagementPage.tsx`): Bổ sung nút action "Kiểm duyệt Video KOL Review" trên từng sản phẩm; mở modal danh sách video, xem link preview, duyệt video thường hoặc "Duyệt & Ghim nổi bật" (`isFeatured`), từ chối hoặc ẩn video có modal nhập lý do bắt buộc. Gọi API `PATCH /api/media/:id/review`.
     - Đảm bảo 100% tuân thủ hệ màu **Vàng Be (Warm Sand & Brand Gold)**, không dùng nút xanh lá.
  10. **SEO động chuẩn & Dispatch Analytics thật lên Backend**:
      - Bổ sung dynamic `<link rel="canonical">` và đầy đủ thẻ Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), thẻ `og:url`.
      - `trackAnalytics()` tự động gửi sự kiện tới API `POST /api/public/products/analytics/events` để máy chủ ghi nhận và thống kê.
  11. **Tài liệu Swagger / OpenAPI Schema chi tiết**:
      - Tạo `ProductLandingResponseDto` mô tả đầy đủ cấu trúc JSON trả về của endpoint `GET /api/public/products/:idOrSlug/landing`.

---

## 🛠️ CÁCH SỬ DỤNG SKILL `scanms-progress-tracker`:

Mỗi khi bạn hoặc thành viên trong nhóm hoàn thành một đoạn code / màn hình UI / API mới, chỉ cần gõ lệnh:

> `/log-work` hoặc *"Ghi nhận tiến độ cho [Tên] vừa làm [Chức năng]"*

Skill **`scanms-progress-tracker`** sẽ tự động soi code thực tế và ghi vết nhật ký đóng góp chi tiết vào file này!

