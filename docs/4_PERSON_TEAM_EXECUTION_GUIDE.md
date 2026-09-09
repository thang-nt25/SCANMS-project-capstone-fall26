# SỔ TAY HƯỚNG DẪN PHÁT TRIỂN SONG SONG CHO NHÓM 4 THÀNH VIÊN
## DỰ ÁN: SCANMS (FA26SE032)
**Tên chính thức:** Sales Collaborator and Affiliate Network Management System  
*(Hệ thống Quản lý Mạng lưới Tiếp thị liên kết & Cộng tác viên bán hàng)*  
**Áp dụng cho:** 4 Thành viên nhóm Đồ án Tốt nghiệp Capstone FA26SE032

---

## 🎯 1. NGUYÊN TẮC VÀNG ĐỂ 4 NGƯỜI LÀM CÙNG LÚC KHÔNG VƯỚNG NHAU

Để 4 thành viên code song song mà **không phải chờ đợi dữ liệu của nhau (Zero Data Blocking)** và **không bị xung đột mã nguồn khi merge Git (Zero Merge Conflict)**, toàn đội bắt buộc tuân thủ 4 nguyên tắc:

1. **Ranh giới Thư mục Bất khả xâm phạm:**
   - Mỗi người sở hữu các thư mục Module riêng biệt trong `backend/src/modules/` và các trang riêng trong `frontend/src/pages/`.
   - Tuyệt đối **không tự ý sửa file của thành viên khác**. Nếu cần dùng chung hàm tiện ích, đặt vào `common/` hoặc trao đổi trước khi push.
2. **Giữ nguyên Thiết kế CSDL (21 Bảng 3NF):**
   - File `backend/prisma/schema.prisma` đã được thiết kế hoàn thiện cho toàn bộ 32 chức năng. Không sửa đổi cấu trúc bảng để tránh lỗi migration chéo nhau.
3. **Sử dụng Bộ dữ liệu mẫu Master Seed (`npm run seed`):**
   - Ngay sau khi clone code, mỗi người chạy lệnh `npm run seed` trong thư mục `backend/` để nạp sẵn tài khoản Admin, Shop, KOL, Sản phẩm, Đơn hàng, Ví tiền mẫu.
   - Nhờ đó, **Người làm ví tiền không cần đợi người làm checkout**, **Người làm AI/Dashboard không cần đợi có đơn hàng thật**. Mọi người đều có dữ liệu để test ngay từ Ngày 1!
4. **Bám sát Hợp đồng API:**
   - Mọi request URL, body JSON và response trả về đã được quy định chuẩn xác tại tài liệu [API_SPECIFICATION.md](file:///c:/HW/CAPSTONE/docs/api/API_SPECIFICATION.md).

---

## 👥 2. BẢNG PHÂN CHIA CHI TIẾT 4 WORKSTREAMS (MỖI NGƯỜI 8 CHỨC NĂNG)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SCANMS TEAM 4-WORKSTREAM MATRIX                                   │
├───────────────────────────┬─────────────────────────────────────────────────┬──────────────────┤
│ Thành viên                │ Phân hệ & Trọng tâm Kỹ thuật                    │ Nhánh Git        │
├───────────────────────────┼─────────────────────────────────────────────────┼──────────────────┤
│ **1. Nguyễn Thành Thắng** │ **Gian Hàng, Sản Phẩm, Hồ Sơ Đối Tác & Bảo Mật**│ `thang`          │
│   *(Trưởng nhóm - Leader)*│ *(Chức năng 01 → 08: Khởi tạo toàn bộ nền tảng)*│                  │
├───────────────────────────┼─────────────────────────────────────────────────┼──────────────────┤
│ **2. Nguyễn Đình Tuấn**   │ **Tracking Click, Attribution & Khách Mua Hàng**│ `tuan`           │
│                           │ *(Chức năng 09 → 16: Kéo traffic & Checkout)*   │                  │
├───────────────────────────┼─────────────────────────────────────────────────┼──────────────────┤
│ **3. Phan Xuân Thịnh**    │ **Đơn Hàng, Động Cơ Hoa Hồng, Ví Tiền & Payout**│ `thinh`          │
│                           │ *(Chức năng 17 → 24: Tính tiền, Khóa ví, VietQR)*│                 │
├───────────────────────────┼─────────────────────────────────────────────────┼──────────────────┤
│ **4. Nguyễn Phú Quý**     │ **Chat Realtime, Dashboard & 2 Động Cơ AI**     │ `quy`            │
│   *(hoặc Trần Văn Nhật)*  │ *(Chức năng 25 → 32: Kết nối, Recharts & AI)*   │                  │
└───────────────────────────┴─────────────────────────────────────────────────┴──────────────────┘
```

---

### 👤 THÀNH VIÊN 1: NGUYỄN THÀNH THẮNG (LEADER) — GIAN HÀNG, SẢN PHẨM & HỒ SƠ ĐỐI TÁC
* **Nhánh Git:** `thang`
* **Vai trò:** Trưởng nhóm (Leader) & Kiến trúc sư hệ thống (Software Architect).
* **Trọng tâm:** Khởi tạo tài khoản, bảo mật phân quyền RBAC, hồ sơ KOL và toàn bộ kho hàng hóa/media làm nền tảng cho 3 thành viên còn lại.
* **Vùng Code Backend:**
  - `backend/src/modules/stores/` (Quản lý cấu hình cửa hàng)
  - `backend/src/modules/products/` (CRUD sản phẩm, giá bán, xóa mềm)
  - `backend/src/modules/collaborators/` (KYC hồ sơ, đa kênh MXH, cấp bậc KOL)
  - `backend/src/modules/media/` (Kho tài nguyên Media Hub 1-Click copy)
* **Vùng Code Frontend:**
  - `frontend/src/pages/merchant/ProductsPage.tsx`
  - `frontend/src/pages/merchant/StoreSettingsPage.tsx`
  - `frontend/src/pages/merchant/MediaHubPage.tsx`
  - `frontend/src/pages/collaborator/KycPage.tsx`
  - `frontend/src/pages/collaborator/SocialChannelsPage.tsx`
* **Bảng CSDL phụ trách:** `users`, `collaborator_profiles`, `collaborator_social_channels`, `collaborator_tiers`, `stores`, `products`, `media_assets`.

| STT | Mã Chức Năng | Tên Chức Năng & Việc Cần Làm |
| :---: | :---: | :--- |
| 1 | `FR-01` | **Đăng ký & Đăng nhập JWT (2FA):** Hoàn thiện API cấp token và cơ chế xác thực OTP 2FA. |
| 2 | `FR-02` | **Phân quyền RBAC Guard:** Xây dựng `RolesGuard` chặn quyền giữa Admin, Shop và KOL. |
| 3 | `FR-03` | **Xác thực Tài chính KYC:** Màn hình nộp CCCD, Mã số thuế, Ngân hàng; Shop có nút Duyệt KYC. |
| 4 | `FR-04` | **Quản lý Đa Kênh MXH:** Thêm không giới hạn TikTok, FB, YouTube, Threads kèm số followers. |
| 5 | `FR-05` | **Cấp Bậc KOL (Tiering Cron Engine):** Cron job đánh giá doanh số tích lũy tháng để thăng hạng Đồng $\rightarrow$ Bạc $\rightarrow$ Vàng $\rightarrow$ Kim Cương. |
| 6 | `FR-06` | **Cấu hình Cửa Hàng (Store Settings):** Cài đặt hạn mức rút tối thiểu, thời hạn cookie (30 ngày), % hoa hồng mặc định. |
| 7 | `FR-07` | **Danh mục Sản phẩm & Soft Delete:** CRUD sản phẩm, tồn kho, % hoa hồng riêng, xóa mềm `is_deleted = true`. |
| 8 | `FR-08` | **Kho Media "1-Click Copy":** Upload banner HD, video review, kịch bản mẫu SEO; KOL bấm nút 1-Click Copy. |

* **Cách test độc lập:**
  1. Đăng nhập tài khoản Shop (`shop@techstore.vn` / `Password@123`).
  2. Tạo mới 1 sản phẩm, tải ảnh lên Cloudinary, đổi cấu hình Store.
  3. Đăng nhập tài khoản KOL (`kol1@scanms.vn`) cập nhật KYC và thêm link kênh TikTok.

---

### 👤 THÀNH VIÊN 2: NGUYỄN ĐÌNH TUẤN — TRACKING, ATTRIBUTION & MẶT TIỀN BÁN LẺ
* **Nhánh Git:** `tuan`
* **Vùng Code Backend:**
  - `backend/src/modules/referral-links/` (Sinh link rút gọn, QR Code, Custom Coupon)
  - `backend/src/modules/tracking/` (Ghi nhận click, Cookie 30 ngày, Redis Rate Limit)
  - `backend/src/modules/checkout/` (Trang Landing Page xem sản phẩm & Form đặt hàng nhanh)
* **Vùng Code Frontend:**
  - `frontend/src/pages/collaborator/MarketingLinksPage.tsx` (Màn hình KOL lấy link/QR/Coupon)
  - `frontend/src/pages/public/LandingProductPage.tsx` (Trang Landing Page mua hàng chuẩn SEO)
  - `frontend/src/pages/public/GuestCheckoutPage.tsx` (Form mua hàng không cần tài khoản)
* **Bảng CSDL phụ trách:** `referral_links`, `click_traffic_logs`, `commission_rules`, bộ nhớ Redis In-Memory.

| STT | Mã Chức Năng | Tên Chức Năng & Việc Cần Làm |
| :---: | :---: | :--- |
| 9 | `FR-09` | **Cấu hình Mốc Thưởng Doanh Số:** Shop cài đặt mốc doanh số tháng (VD: Bán vượt 50 triệu thưởng thêm 2%). |
| 10 | `FR-10` | **Tạo Link Tiếp Thị Rút Gọn:** KOL chọn sản phẩm $\rightarrow$ Hệ thống sinh link `scanms.vn/r/{short_code}`. |
| 11 | `FR-11` | **Tạo Mã QR Code Động:** Tự động sinh ảnh QR Code chứa link của KOL để tải về. |
| 12 | `FR-12` | **Gán Mã Giảm Giá Riêng (Coupon):** Cho phép KOL tạo coupon riêng (VD: `THANGVIP10`) để nhận đơn khi khách nhập mã. |
| 13 | `FR-13` | **Động cơ Tracking Last-Click & Cookie:** Ghi IP, UserAgent, Fingerprint, cài Cookie 30 ngày. Luật Last-Click Wins. |
| 14 | `FR-14` | **Chống Click Spam qua Redis Rate Limit:** Giới hạn tối đa 10 clicks/giây/IP trên Redis In-Memory. |
| 15 | `FR-15` | **Landing Page Sản Phẩm & Video Review:** Giao diện mua hàng công khai hiện đại, video review của KOL. |
| 16 | `FR-16` | **Đặt Hàng Nhanh (Guest Checkout):** Form mua hàng siêu tốc (Tên, SĐT, Địa chỉ, Mã giảm giá) $\rightarrow$ Tạo đơn `orders` và trừ tồn kho. |

* **Cách test độc lập:**
  1. Lấy `productId` của sản phẩm mẫu trong CSDL seed (Tai nghe ANC Pro X).
  2. Dùng Postman hoặc UI gọi API sinh link rút gọn $\rightarrow$ Thử click link `GET /r/{short_code}` kiểm tra log ghi vào `click_traffic_logs` và cookie được set.
  3. Mở trang Landing Page và thử điền form Guest Checkout để tạo đơn hàng mới.

---

### 👤 THÀNH VIÊN 3: PHAN XUÂN THỊNH — ĐƠN HÀNG, HOA HỒNG, VÍ TIỀN & CHI TRẢ
* **Nhánh Git:** `thinh`
* **Vùng Code Backend:**
  - `backend/src/modules/orders/` (Webhook sàn ngoài, Tạo đơn thủ công, Import file Excel)
  - `backend/src/modules/commissions/` (Tính hoa hồng từng món, Escrow 14 ngày, Thu hồi Clawback)
  - `backend/src/modules/wallets/` (Khóa dòng `SELECT ... FOR UPDATE`, Sổ cái tài chính)
  - `backend/src/modules/payouts/` (Duyệt rút tiền, Khấu trừ thuế 10%, Xuất file lô VietQR)
* **Vùng Code Frontend:**
  - `frontend/src/pages/public/OrderTrackingPage.tsx` (Khách tra cứu tiến độ đơn bằng SĐT)
  - `frontend/src/pages/merchant/OrdersManagementPage.tsx` (Quản lý đơn hàng, Import Excel)
  - `frontend/src/pages/collaborator/WalletPage.tsx` (Ví tiền KOL, Bấm rút tiền, Lịch sử biến động)
  - `frontend/src/pages/merchant/PayoutApprovalPage.tsx` (Shop duyệt rút, upload bill, xuất VietQR)
* **Bảng CSDL phụ trách:** `orders`, `order_items`, `product_reviews`, `commissions`, `wallets`, `financial_ledgers`, `payout_requests`.

| STT | Mã Chức Năng | Tên Chức Năng & Việc Cần Làm |
| :---: | :---: | :--- |
| 17 | `FR-17` | **Tra Cứu Đơn Hàng Bằng SĐT:** Khách nhập SĐT để tra cứu: Đang chuẩn bị $\rightarrow$ Đang giao GHTK $\rightarrow$ Đã nhận. |
| 18 | `FR-18` | **Đánh Giá & Review 5 Sao:** Khách nhận hàng thành công gửi đánh giá 1-5 sao và nhận xét. |
| 19 | `FR-19` | **Webhook Tiếp Nhận Đơn Sàn Ngoài:** Endpoint `POST /orders/webhook` tiếp nhận đơn từ Shopee, TikTok Shop, Shopify. |
| 20 | `FR-20` | **Tạo Đơn Thủ Công & Import File Excel:** Nhập đơn tay hoặc tải file Excel danh sách đơn để đối soát hàng loạt. |
| 21 | `FR-21` | **Động Cơ Tính Hoa Hồng & Tự Duyệt 14 Ngày:** Tính hoa hồng theo từng món, cộng Ví Chờ; Tự chuyển Ví Khả Dụng sau 14 ngày & Thu hồi khi hoàn đơn (Clawback). |
| 22 | `FR-22` | **Rút Tiền & Khóa Dòng (Pessimistic Lock):** KOL bấm rút tiền: Khóa dòng `SELECT ... FOR UPDATE` trong PostgreSQL chống âm ví. |
| 23 | `FR-23` | **Sổ Cái Bất Biến & Khấu Trừ Thuế 10%:** Ghi log Append-Only không sửa/xóa; Tự động trích 10% thuế TNCN nếu rút $\ge 2$ triệu. |
| 24 | `FR-24` | **Duyệt Payout & Xuất File Lô VietQR:** Shop duyệt rút tiền phải tải ảnh bill ngân hàng; Xuất file Excel VietQR để thanh toán lô. |

* **Cách test độc lập (KHÔNG CẦN ĐỢI NGƯỜI 2 LÀM XONG CHECKOUT):**
  1. Dùng Postman giả lập bắn webhook payload đơn hàng vào `POST /orders/webhook` hoặc upload 1 file Excel mẫu lên `POST /orders/import-excel`.
  2. Xem tiền hoa hồng tự động nhảy vào bảng `commissions` (PENDING) và cộng `pending_balance` của ví KOL.
  3. Đăng nhập tài khoản `kol1@scanms.vn` bấm rút tiền, kiểm tra trừ ví và sinh dòng trong `payout_requests` và `financial_ledgers`.
  4. Đăng nhập tài khoản `shop@techstore.vn` bấm nút xuất file Excel VietQR.

---

### 👤 THÀNH VIÊN 4: NGUYỄN PHÚ QUÝ (HOẶC TRẦN VĂN NHẬT) — CHAT REALTIME, BÁO CÁO & 2 ĐỘNG CƠ AI
* **Nhánh Git:** `quy`
* **Vùng Code Backend:**
  - `backend/src/modules/chat/` (WebSocket Gateway Socket.io chat 1-1)
  - `backend/src/modules/samples/` (Quy trình xin hàng mẫu dùng thử)
  - `backend/src/modules/analytics/` (Dashboard Recharts & Bảng xếp hạng Leaderboard)
  - `backend/src/modules/ai/` (AI Smart Matching gợi ý KOL & AI Anti-Fraud phát hiện gian lận)
  - `backend/src/modules/audit/` (Audit Logs Interceptor toàn diện)
* **Vùng Code Frontend:**
  - `frontend/src/pages/chat/ChatBoxPage.tsx` (Khung chat realtime giữa Shop và KOL)
  - `frontend/src/pages/collaborator/SampleRequestsPage.tsx` (Giao diện xin hàng mẫu & xem mã vận đơn)
  - `frontend/src/pages/dashboard/AnalyticsDashboardPage.tsx` (Biểu đồ tương tác thời gian thực)
  - `frontend/src/pages/dashboard/LeaderboardPage.tsx` (Bảng vinh danh Top 10 KOLs có Cúp Vàng/Bạc/Đồng)
  - `frontend/src/pages/admin/AuditLogsPage.tsx` (Màn hình tra cứu nhật ký kiểm toán toàn sàn)
* **Bảng CSDL phụ trách:** `conversations`, `chat_messages`, `sample_product_requests`, `campaigns`, `campaign_participants`, `audit_logs`.

| STT | Mã Chức Năng | Tên Chức Năng & Việc Cần Làm |
| :---: | :---: | :--- |
| 25 | `FR-25` | **Chat Realtime 1-1 qua Socket.io:** Nhắn tin tức thời giữa Shop và KOL, gửi file ảnh kịch bản review. |
| 26 | `FR-26` | **Quy Trình Xin Sản Phẩm Mẫu Dùng Thử:** KOL xin mẫu $\rightarrow$ Shop duyệt $\rightarrow$ Shop nhập Mã vận đơn GHTK/GHN. |
| 27 | `FR-27` | **Mời Chiến Dịch Độc Quyền Qua Chat:** Shop gửi "thẻ mời VIP" kèm mức hoa hồng thưởng thẳng vào khung chat của Top KOL. |
| 28 | `FR-28` | **Dashboard Doanh Số Realtime:** Biểu đồ Recharts: Lượt Click, Số đơn, Tỷ lệ chốt đơn (CR%), Doanh thu theo ngày. |
| 29 | `FR-29` | **Bảng Vinh Danh Top 10 KOLs (Leaderboard):** Bảng xếp hạng Top 10 người bán giỏi nhất tháng kèm Cúp Vàng/Bạc/Đồng. |
| 30 | `FR-30` | **AI Gợi Ý KOL Phù Hợp Sản Phẩm:** Thuật toán phân tích lịch sử ngành hàng gợi ý 5 KOL có độ tương thích cao nhất cho Shop. |
| 31 | `FR-31` | **AI Phát Hiện Gian Lận & Click Ảo:** AI quét traffic bất thường (VD: $> 5.000$ clicks nhưng 0 đơn), gắn cờ `AI_FRAUD_FLAG`. |
| 32 | `FR-32` | **Nhật Ký Kiểm Toán Toàn Diện (Audit Logs):** Ghi lại toàn bộ lịch sử thao tác nhạy cảm phục vụ thanh tra hệ thống. |

* **Cách test độc lập:**
  1. Mở 2 tab trình duyệt ẩn danh: 1 tab đăng nhập `shop@techstore.vn`, 1 tab đăng nhập `kol1@scanms.vn`. Gửi tin nhắn qua lại để test WebSocket Socket.io.
  2. Mở trang Dashboard và Leaderboard để kiểm tra biểu đồ Recharts vẽ dữ liệu từ CSDL seed mẫu.
  3. Gọi API AI gợi ý KOL để nhận JSON danh sách KOL được xếp hạng theo điểm tương thích.

---

## 🌿 3. QUY TRÌNH PHỐI HỢP GIT VỚI 4 NHÁNH CÁ NHÂN (AN TOÀN 100%)

Cả nhóm thống nhất: **Mỗi người sở hữu đúng 1 nhánh cố định mang tên mình** (`thang`, `tuan`, `thinh`, `quy`). Tuyệt đối không ai commit thẳng vào `main` hay `dev`.

### A. Khởi tạo nhánh của mình (Chỉ làm 1 lần duy nhất lúc bắt đầu):
```bash
# Đảm bảo đang ở nhánh dev mới nhất
git checkout dev
git pull origin dev

# Tạo và chuyển sang nhánh mang tên mình:
# 1. Nguyễn Thành Thắng (Leader):
git checkout -b thang

# 2. Nguyễn Đình Tuấn:
git checkout -b tuan

# 3. Phan Xuân Thịnh:
git checkout -b thinh

# 4. Nguyễn Phú Quý (hoặc Trần Văn Nhật):
git checkout -b quy
```

### B. Quy trình làm việc hàng ngày của mỗi thành viên:
```bash
# 1. Đầu ngày làm việc: Lấy code mới nhất của cả nhóm về nhánh mình
git checkout <ten_minh>         # Ví dụ: git checkout tuan
git pull origin dev             # Đồng bộ code mới nhất từ dev vào nhánh mình

# 2. Cứ thế cắm đầu code trong ngày trên nhánh của mình
# Code xong chức năng nào thì commit rõ ràng:
git add .
git commit -m "hoan thanh giao dien landing page va checkout"

# 3. Đẩy code lên nhánh của mình trên GitHub:
git push origin <ten_minh>      # Ví dụ: git push origin tuan

# 4. Lên giao diện GitHub:
# - Bấm nút "New Pull Request" (PR)
# - Base: dev  <---  Compare: <ten_minh> (ví dụ: tuan)
# - Báo Leader Thắng duyệt merge vào dev!
```

### C. Vai trò của Leader (Nguyễn Thành Thắng):
1. **Duyệt PR vào dev:** Khi thành viên nộp PR, Thắng lên GitHub review code và bấm nút **"Merge pull request"** xanh lè để gộp code vào `dev`.
2. **Duyệt từ dev vào main:** Cuối tuần hoặc trước buổi demo, Thắng kiểm tra nhánh `dev` chạy ổn định 100% thì tự tạo PR gộp từ `dev` vào `main`. Nhánh `main` luôn là bản sạch và chuẩn nhất để trình chiếu cho Giảng viên.

---

## 🎤 4. KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN MẪU (DÀNH CHO 4 THÀNH VIÊN)

Khi đứng trước Hội đồng phản biện Capstone, 4 bạn sẽ lần lượt demo theo chuỗi câu chuyện kinh doanh cực kỳ thuyết phục:

1. **Thành viên 1 (1 phút):**  
   *"Kính thưa Hội đồng, em phụ trách khâu khởi tạo nền tảng. Em xin demo việc đăng nhập bảo mật 2FA, Shop cấu hình gian hàng và đăng sản phẩm, cùng với luồng KOL hoàn thiện hồ sơ KYC tài chính để được thăng hạng tự động."*
2. **Thành viên 2 (1 phút):**  
   *"Sau khi có sản phẩm, em phụ trách khâu tiếp thị và kéo khách. Em xin demo KOL tạo đường link rút gọn mã hóa và QR Code. Khi khách hàng click link từ mạng xã hội, hệ thống chống click ảo qua Redis, cài Cookie 30 ngày và mở ra trang Landing Page mua hàng siêu tốc Guest Checkout."*
3. **Thành viên 3 (1.5 phút):**  
   *"Ngay khi đơn hàng được tạo (hoặc bắn qua Webhook sàn TMĐT), em phụ trách động cơ tài chính. Hệ thống tự động bóc tách hoa hồng từng món cộng vào ví chờ. Sau 14 ngày hết hạn hoàn trả, tiền chuyển sang ví khả dụng. Khi KOL rút tiền, hệ thống dùng khóa dòng PostgreSQL `SELECT FOR UPDATE` chống âm ví, tự khấu trừ 10% thuế TNCN và xuất file Excel chuẩn VietQR cho ngân hàng."*
4. **Thành viên 4 (1.5 phút):**  
   *"Cuối cùng, để sàn phát triển bền vững, em phụ trách khâu tương tác và trí tuệ nhân tạo. Em xin demo tính năng Chat 1-1 Realtime bằng WebSocket, quy trình xin hàng mẫu có mã vận đơn, Dashboard phân tích doanh số thời gian thực, thuật toán AI gợi ý KOL phù hợp sản phẩm và AI quét phát hiện gian lận traffic."*

---
*(Tài liệu chuẩn hóa chính thức của nhóm Đồ án Tốt nghiệp SCANMS - FA26SE032)*
