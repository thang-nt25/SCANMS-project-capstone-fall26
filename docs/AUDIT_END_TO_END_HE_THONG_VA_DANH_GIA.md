# BÁO CÁO KIỂM TOÁN TOÀN DIỆN HỆ THỐNG SCANMS (END-TO-END AUDIT REPORT)

> **Căn cứ đánh giá:** Đối chiếu trực tiếp với tài liệu luồng vận hành chuẩn [docs/END_TO_END_SYSTEM_FLOW.md](file:///c:/HW/CAPSTONE/docs/END_TO_END_SYSTEM_FLOW.md) và sổ tay nghiệp vụ [docs/CAC_DIEU_CAN_NHO_DE_LAM_TIEP.md](file:///c:/HW/CAPSTONE/docs/CAC_DIEU_CAN_NHO_DE_LAM_TIEP.md).  
> **Mục đích:** Đánh giá độ phủ thực tế (UI, Backend API, PostgreSQL, Redis), liệt kê toàn bộ sai sót, điểm chưa chuyên nghiệp, chức năng thừa, chức năng thiếu và lộ trình cải tiến.  
> **Trạng thái hành động:** Báo cáo ghi nhận hiện trạng kiểm toán — *Chưa can thiệp sửa đổi mã nguồn theo yêu cầu của Leader*.

---

## 📊 BẢNG TỔNG HỢP ĐỘ PHỦ NGHIỆP VỤ (5 CHẶNG END-TO-END)

| Chặng | Tên Chặng Nghiệp Vụ | Tỷ lệ Hoàn Thiện Thực Tế | Đã Hoạt Động (UI + API) | Chưa Hoàn Thiện / Thiếu | Đánh Giá Chung |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **1** | **Khởi tạo, Định danh & Kiểm định sản phẩm lên sàn** | **65%** | Đăng ký/Đăng nhập JWT + OTP, Liên kết kênh MXH, CRUD Sản phẩm cơ bản. | Thiếu KYC Shop (GPKD), thiếu upload ảnh 2 mặt CCCD, thiếu kiểm định chất lượng BYT, thiếu cào link Shopee, thiếu Admin duyệt sản phẩm. | Khá, nhưng còn thiếu các bước thẩm định pháp lý doanh nghiệp. |
| **2** | **Kết nối, Hàng mẫu & Chuẩn bị truyền thông** | **80%** | Chat Socket.io Realtime + lọc từ bậy, Gửi thiệp mời VIP qua chat, AI Gợi ý KOL, Kho Media Hub, Xin mẫu & Nhập mã bưu cục. | Thiếu nút KOL xác nhận "Đã nhận hàng", thiếu đếm ngược 7 ngày nộp video review cho hàng mẫu. | Tốt, luồng kết nối và hàng mẫu đã hoạt động mượt mà. |
| **3** | **Tạo Link tiếp thị, Livestream & Khách mua hàng** | **75%** | Link rút gọn `/r/:code`, QR Code Canvas, Coupon riêng KOL, Cookie 30 ngày, Redis chống spam, Guest Checkout 1-chạm, Trừ kho. | **Hoàn toàn chưa có Phòng Live Shopping (`LiveShoppingRoom.tsx`)**; chưa có Webhook Shopee/TikTok thực chiến. | Rất tốt ở mảng Affiliate Web, nhưng mảng Livestream trên sàn chưa có code. |
| **4** | **Vận chuyển, Giam tiền 14 ngày & Đối soát rủi ro** | **70%** | Cập nhật bưu cục (`SHIPPING` $\rightarrow$ `DELIVERED`), Tra cứu vận đơn bưu cục bằng SĐT, Review 5 sao, Cronjob giam hoa hồng 14 ngày. | Thiếu giao diện khách nộp yêu cầu Đổi trả / Hoàn tiền kèm ảnh bóc hàng; thiếu màn hình Admin phán quyết 1-Click (`Ép hoàn tiền` / `Bác bỏ`). | Khung thanh toán & hoa hồng chuẩn, nhưng thiếu UI giải quyết tranh chấp. |
| **5** | **Rút tiền, Thuế TNCN 10% & Thăng hạng Leaderboard** | **90%** | Khóa dòng `SELECT FOR UPDATE` chống âm ví, Khấu trừ 10% thuế TNCN, Sổ cái bất biến, Duyệt Payout kèm ảnh bill, Xuất file VietQR, Leaderboard Top 10. | Thao tác chuyển khoản tự động Napas qua Open Banking thật chỉ mô phỏng qua xuất file lô Excel. | Xuất sắc, module tài chính ngân hàng đạt chuẩn Enterprise. |

---

## 🔍 CHI TIẾT ĐỐI CHIẾU TỪNG BƯỚC THEO LUỒNG END-TO-END

### CHẶNG 1: KHỞI TẠO, ĐỊNH DANH & KIỂM ĐỊNH SẢN PHẨM LÊN SÀN

1. **Tạo tài khoản Shop, tạo tài khoản KOL:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG THỰC TẾ.
   - **Frontend:** [RegisterPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/auth/RegisterPage.tsx) và [LoginPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/auth/LoginPage.tsx).
   - **Backend:** `POST /api/auth/register`, `POST /api/auth/send-otp`, `POST /api/auth/login`. Mật khẩu băm bcrypt, hỗ trợ Google OAuth.
2. **Nộp hồ sơ định danh KYC (CCCD 2 mặt, MST, STK / Giấy phép ĐKKD Shop):**
   - **Hiện trạng:** HOÀN THIỆN 1 PHẦN (CHỈ CÓ KOL, THIẾU SHOP).
   - **KOL:** Đã có form nhập số CCCD, MST, STK ngân hàng tại [KycSubmissionPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KycSubmissionPage.tsx).
   - **Sai sót & Thiếu:**
     - Không có nút upload file ảnh mặt trước / mặt sau CCCD (chỉ là ô nhập text `idCardNumber`).
     - Không có form nộp hồ sơ KYC dành cho Chủ Shop (Giấy phép kinh doanh, Giấy ủy quyền thương hiệu, MST doanh nghiệp). Bảng `Store` trong DB chỉ có trường cờ `isVerified: Boolean`.
3. **Admin thẩm định & duyệt hồ sơ KYC:**
   - **Hiện trạng:** ĐÃ CÓ UI & API NHƯNG CÒN BUG MAPPING.
   - **Frontend:** [KycApprovalPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/KycApprovalPage.tsx) (Route: `/merchant/kyc-approval` và `/admin/users`).
   - **Backend:** `GET /api/kyc/pending`, `POST /api/kyc/review/:id`.
   - **Bug:** Trong `KycApprovalPage.tsx` line 157, code đọc `kycStatus: p.status` trong khi API trả về thuộc tính `p.kycStatus`. Hậu quả: Trạng thái hiển thị luôn bị gán nhầm thành `"Chờ duyệt CCCD"` dù hồ sơ đã được duyệt!
4. **KOL liên kết đa kênh mạng xã hội (TikTok, Facebook, YouTube...):**
   - **Hiện trạng:** ĐÃ CÓ VÀ KẾT NỐI DB THẬT.
   - **Frontend:** [SocialChannelsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SocialChannelsPage.tsx).
   - **Backend:** `POST/GET/DELETE /api/collaborator-social`.
   - **Điểm chưa chuyên nghiệp:** Dòng 92–138 chứa mảng fallback tĩnh hiển thị tài khoản của "Thắng" và "Nhật" khi tài khoản mới có 0 kênh, thay vì hiển thị trạng thái trống (Empty State).
5. **Shop đăng sản phẩm kèm % hoa hồng, bằng chứng kiểm định & cào link Shopee:**
   - **Hiện trạng:** HOÀN THIỆN 1 PHẦN (CHỈ CÓ CRUD SẢN PHẨM CƠ BẢN).
   - **Đã có:** Thêm/sửa SKU, tên, ảnh, danh mục, giá bán, tồn kho, % hoa hồng CTV tại [ProductManagementPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ProductManagementPage.tsx).
   - **Thiếu hoàn toàn:**
     - Không có ô upload Giấy công bố sản phẩm / Phiếu kiểm nghiệm Bộ Y Tế.
     - Không có tính năng dán link Shopee để tự động cào thông tin sản phẩm.
     - Không có trạng thái `PENDING_APPROVAL` cho sản phẩm: Khi Shop tạo sản phẩm là lên sàn ngay (`ACTIVE`), Ban kiểm soát sàn (Admin) không có màn hình thẩm định giấy tờ chất lượng trước khi mở bán.

---

### CHẶNG 2: KẾT NỐI, HÀNG MẪU & CHUẨN BỊ TRUYỀN THÔNG

1. **Shop và KOL liên hệ qua Chat Realtime (hoặc AI Smart Matching gợi ý KOL):**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG THỰC TẾ.
   - **Chat:** [ChatBoxPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/chat/ChatBoxPage.tsx) kết nối Socket.io Gateway, có âm thanh thông báo, hiển thị tin nhắn thời gian thực.
   - **AI Matching:** [KolRecommendationPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/KolRecommendationPage.tsx) kết nối Backend `POST /api/ai-recommendation/recommend-kols`, tính điểm tương thích (Affinity Score), gợi ý đúng thế mạnh ngành hàng.
   - **Bộ lọc từ ngữ cấm (Profanity Filter):** Dòng 38–60 của `ChatBoxPage.tsx` có bộ lọc regex chuyển từ ngữ thô tục thành `***`.
2. **Shop gửi thẻ mời chiến dịch VIP hoa hồng cao qua Chat:**
   - **Hiện trạng:** ĐÃ CÓ UI & MODAL.
   - **Frontend:** Component [SendVipCampaignModal.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/chat/SendVipCampaignModal.tsx) được nhúng trong khung chat, gửi thẻ chiến dịch trực tiếp vào luồng tin nhắn.
3. **KOL nộp yêu cầu xin sản phẩm mẫu dùng thử & Shop duyệt cấp mã vận đơn:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG THỰC TẾ.
   - **KOL:** [SampleRequestsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SampleRequestsPage.tsx) chọn sản phẩm từ shop, nhập địa chỉ nhận hàng $\rightarrow$ Lưu `sample_product_requests`.
   - **Shop:** [ShopSampleRequestsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopSampleRequestsPage.tsx) duyệt yêu cầu $\rightarrow$ Nhập đơn vị bưu cục (GHTK/GHN) và mã vận đơn tracking.
4. **KOL nhận hàng mẫu, kích hoạt cam kết nộp link video review trong 7 ngày:**
   - **Hiện trạng:** THIẾU LOGIC CAM KẾT 7 NGÀY.
   - **Thiếu:** Trong `SampleRequestsPage.tsx`, trạng thái chỉ dừng ở `SHIPPED`. Không có nút để KOL bấm *"Đã nhận được hàng mẫu"*, không có đồng hồ đếm ngược 7 ngày (168 giờ) và không có form để KOL dán link video review cam kết vào đơn hàng mẫu đó.
5. **Kho nội dung Media Hub:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG TỐT.
   - **Frontend:** [MediaHubBrowserPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/MediaHubBrowserPage.tsx).
   - **Tính năng:** Tải banner HD, xem video review gốc của nhãn hàng, 1-Click Copy kịch bản bài viết chuẩn SEO chia theo 4 định dạng (ngắn, review chi tiết, ưu đãi, kịch bản live).

---

### CHẶNG 3: TẠO LINK TIẾP THỊ, LIVESTREAM BÁN HÀNG & KHÁCH MUA HÀNG

1. **Tạo Link tiếp thị rút gọn, mã QR Canvas & Mã giảm giá riêng của KOL:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG HOÀN HẢO.
   - **Link rút gọn:** [ReferralLinksPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/ReferralLinksPage.tsx) sinh link `/r/{shortCode}` có chữ ký HMAC.
   - **Mã QR:** Sinh mã QR tải về định dạng PNG/SVG, tích hợp bộ công cụ đổi màu sắc và khung thương hiệu.
   - **Mã Coupon riêng:** [KolCouponsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolCouponsPage.tsx) gán mã định danh mang tên KOL.
2. **KOL mở phòng Livestream bán hàng trực tiếp trên sàn (Live Shopping Room):**
   - **Hiện trạng:** **HOÀN TOÀN CHƯA CÓ TRONG SOURCE CODE.**
   - **Thiếu:** Mặc dù trong tài liệu [docs/END_TO_END_SYSTEM_FLOW.md](file:///c:/HW/CAPSTONE/docs/END_TO_END_SYSTEM_FLOW.md) và [docs/CAC_DIEU_CAN_NHO_DE_LAM_TIEP.md](file:///c:/HW/CAPSTONE/docs/CAC_DIEU_CAN_NHO_DE_LAM_TIEP.md) mô tả rất chi tiết về *"Trang phát sóng LiveShoppingRoom.tsx bật webcam, ghim túi đồ sản phẩm flash deal, mua hàng không gián đoạn live"*, nhưng trong source code frontend và routes hiện tại **chưa hề có file hoặc trang này**.
3. **Tracking Cookie 30 ngày (Last-Click Wins) & Redis chặn click ảo:**
   - **Hiện trạng:** ĐÃ CÓ TRONG BACKEND & ROUTE REDIRECT.
   - **Redirect:** [RedirectHandlerPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/RedirectHandlerPage.tsx) gọi API `GET /api/r/:shortCode`.
   - **Backend:** `ReferralLinksService.handleRedirect` ghi log click, set cookie `scanms_attribution` thời hạn 30 ngày, áp dụng cơ chế Redis Sliding Window Rate Limit chặn spam click cùng IP.
4. **Khách hàng đặt hàng nhanh 1-chạm (Guest Checkout):**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG THỰC TẾ.
   - **Frontend:** [ProductDetailPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/ProductDetailPage.tsx) mở modal [GuestCheckoutModal.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/checkout/GuestCheckoutModal.tsx).
   - **Backend:** `POST /api/orders/direct-checkout` nhận đơn không cần tài khoản, tự động đọc cookie attribution hoặc mã coupon, trừ tồn kho sản phẩm, tạo bản ghi đơn hàng và hoa hồng `PENDING`.
5. **Tiếp nhận đơn từ Shopee / TikTok Shop qua Webhook hoặc Excel:**
   - **Hiện trạng:** ĐÃ CÓ BACKEND API & IMPORT EXCEL CỦA SHOP.
   - **Backend:** `POST /api/orders/webhook` và `POST /api/orders/import-excel`.
   - **Frontend:** [OrdersManagementPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/OrdersManagementPage.tsx) có nút tải file Excel đơn hàng ngoài lên sàn để đối soát.

---

### CHẶNG 4: VẬN CHUYỂN, GIAM TIỀN 14 NGÀY & ĐỐI SOÁT RỦI RO

1. **Shop đóng gói và bàn giao bưu cục:**
   - **Hiện trạng:** ĐÃ CÓ GIAO DIỆN QUẢN LÝ ĐƠN HÀNG THỰC TẾ.
   - **Frontend:** [OrdersManagementPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/OrdersManagementPage.tsx).
   - **Backend:** `GET /api/orders/my-store` và `PATCH /api/orders/:id/fulfillment`.
   - **Thao tác:** Shop chuyển trạng thái từ `PENDING` $\rightarrow$ `SHIPPING`, nhập đơn vị vận chuyển (GHTK/GHN) và mã vận đơn.
2. **Khách tra cứu tiến độ bưu kiện bằng SĐT:**
   - **Hiện trạng:** ĐÃ CÓ TRANG CÔNG KHAI.
   - **Frontend:** [OrderTrackingPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/public/OrderTrackingPage.tsx) (Route: `/tracking`).
   - **Tra cứu:** Nhập SĐT người nhận hoặc Mã đơn hàng để hiển thị dòng thời gian vận chuyển.
3. **Giao hàng thành công & Khách gửi đánh giá 5 sao:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG.
   - **Giao hàng:** Đơn chuyển sang `DELIVERED`.
   - **Đánh giá:** Modal [ProductReviewModal.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/feedback/ProductReviewModal.tsx) cho phép gửi số sao (1-5) và nhận xét chất lượng lưu vào bảng `product_reviews`.
4. **Cơ chế giam tiền hoa hồng 14 ngày (Ví Chờ - Escrow):**
   - **Hiện trạng:** ĐÃ CÓ CRONJOB BACKEND HOẠT ĐỘNG TỰ ĐỘNG.
   - **Backend:** `CommissionSchedulerService.reconcileCommissionBalances` chạy định kỳ bằng cron.
   - **Quy tắc:** Tiền nằm ở `pendingBalance` của KOL. Nếu đơn `DELIVERED` đủ 14 ngày mà không có khiếu nại hoàn trả, tự động duyệt sang `availableBalance`.
5. **Cơ chế khiếu nại Trả hàng & Hủy hoa hồng (Clawback):**
   - **Hiện trạng:** HOÀN THIỆN TRONG BACKEND NHƯNG THIẾU GIAO DIỆN KHIẾU NẠI.
   - **Backend:** Có logic `reverseCommission` khi đơn hàng chuyển sang `RETURNED` hoặc `CANCELLED` (hủy hoa hồng, trừ sạch khỏi ví chờ, ghi log thu hồi vào sổ cái).
   - **Thiếu:**
     - Khách hàng không có trang/form bấm *"Yêu cầu trả hàng & hoàn tiền"* kèm tải 1 ảnh bằng chứng hàng lỗi.
     - Super Admin không có màn hình phân xử tranh chấp với 2 nút dứt điểm: `[Ép hoàn tiền]` và `[Bác bỏ khiếu nại]`.
     - Thiếu quy tắc tự động ẩn sản phẩm khi nhận trên 3 đánh giá 1-2 sao hoặc điểm trung bình $< 3.0$ sao.

---

### CHẶNG 5: RÚT TIỀN, THUẾ TNCN 10% & THĂNG HẠNG LEADERBOARD

1. **KOL tạo lệnh rút tiền về tài khoản ngân hàng:**
   - **Hiện trạng:** ĐÃ HOÀN THIỆN ĐẠT CHUẨN TÀI CHÍNH ENTERPRISE.
   - **Frontend:** [WalletPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/WalletPage.tsx).
   - **Backend:** `POST /api/wallets/withdrawals`.
   - **Bảo mật:** Khóa dòng CSDL `SELECT ... FOR UPDATE` chặn tuyệt đối race condition (spam click rút tiền gây âm ví). Kiểm tra bắt buộc KYC `VERIFIED`.
   - **Khấu trừ thuế:** Tự động trích 10% thuế TNCN nếu lệnh rút $\ge 2.000.000$ VNĐ, hiển thị rõ số tiền thực nhận (90%).
   - **Sổ cái:** Ghi nhận biến động tức thì vào Sổ cái tài chính bất biến [financial_ledgers](file:///c:/HW/CAPSTONE/backend/prisma/schema.prisma) (Append-Only).
2. **Shop/Admin duyệt lệnh rút và xuất file lô VietQR:**
   - **Hiện trạng:** ĐÃ CÓ VÀ HOẠT ĐỘNG RẤT TỐT.
   - **Frontend:** [PayoutApprovalPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/PayoutApprovalPage.tsx).
   - **Tính năng:** Duyệt lệnh, bắt buộc upload ảnh bill chuyển khoản ngân hàng, xuất file Excel lô chuẩn định dạng Napas 24/7 / VietQR để nạp vào Internet Banking.
3. **Đánh giá nâng cấp bậc KOL (Tier Ranking):**
   - **Hiện trạng:** ĐÃ CÓ VÀ KẾT NỐI DỮ LIỆU THỰC TẾ.
   - **Frontend:** [KolTierStatusPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolTierStatusPage.tsx).
   - **Backend:** `POST /api/tiers/evaluate` tính lũy kế doanh số tháng để thăng hạng: Đồng (0%) $\rightarrow$ Bạc (+1%) $\rightarrow$ Vàng (+3%) $\rightarrow$ Kim Cương (+5%).
4. **Vinh danh Top 10 KOL trên Bảng xếp hạng Leaderboard:**
   - **Hiện trạng:** ĐÃ CÓ VÀ KẾT NỐI API THẬT.
   - **Frontend:** [LeaderboardPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/dashboard/LeaderboardPage.tsx).
   - **Giao diện:** Bục vinh danh Podium Top 3 (Vàng, Bạc, Đồng) và danh sách bảng xếp hạng Top 10 kèm số lượng đơn và doanh số phát sinh.

---

## ⚠️ BẢNG TỔNG HỢP CÁC SAI SÓT KỸ THUẬT (BUGS & DEFECTS)

| # | Vị Trí Lỗi | Mô Tả Sai Sót | Mức Độ | Hậu Quả Thực Tế |
| :-: | :--- | :--- | :---: | :--- |
| **1** | [KycApprovalPage.tsx:157](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/KycApprovalPage.tsx#L157) | Đọc `kycStatus: p.status` thay vì `p.kycStatus`. | **Nghiêm trọng** | Mọi hồ sơ đã được Admin duyệt thành công trên DB vẫn hiển thị là *"Chờ duyệt CCCD"* trên bảng duyệt KYC. |
| **2** | [KycSubmissionPage.tsx:85](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KycSubmissionPage.tsx#L85) | Tự ý fallback: `const status = profile?.kycStatus ... \|\| 'VERIFIED'` | **Trung bình** | Người dùng vừa vào trang chưa kịp nộp hồ sơ hoặc dữ liệu đang tải đã vội vàng hiển thị thẻ xanh *"Đã xác minh thành công"*. |
| **3** | [SocialChannelsPage.tsx:92-138](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SocialChannelsPage.tsx#L92-L138) | Khi mảng `channels` rỗng, code tự lôi 5 kênh mạng xã hội mock của Thắng/Nhật ra hiển thị. | **Trung bình** | Tài khoản KOL mới tạo chưa thêm kênh nào vẫn nhìn thấy 5 kênh TikTok/Facebook ảo của người khác. |
| **4** | [SampleRequestsPage.tsx:403](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SampleRequestsPage.tsx#L403) | Vòng đời trạng thái mẫu chỉ có `PENDING`, `APPROVED`, `SHIPPED`, `REJECTED`. | **Trung bình** | Không có bước kết thúc luồng: KOL không có nút bấm nhận hàng và không nộp được link review. |
| **5** | [StoreCollaboratorsPage.tsx:35](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/StoreCollaboratorsPage.tsx#L35) | Gọi API `/store-collaborators/shop` nhưng thiếu xử lý khi Shop chưa có bất kỳ CTV nào. | **Thấp** | Trang có thể báo lỗi hoặc hiển thị trống không có hướng dẫn mời CTV. |

---

## 🎭 NHỮNG ĐIỂM CHƯA CHUYÊN NGHIỆP & CẦN CẢI THIỆN (UNPROFESSIONAL UX)

1. **Còn sót dữ liệu mẫu cá nhân trong form nhập liệu:**
   - Trong [KycSubmissionPage.tsx:33-38](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KycSubmissionPage.tsx#L33-L38): State khởi tạo sẵn số CCCD `"079201008899"`, MST `"8594028193"`, STK `"999988887777"`. Khi người dùng mới vào form, các ô này đã bị điền sẵn thông tin giả lập thay vì ô trống.
   - Trong [SampleRequestsPage.tsx:44](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SampleRequestsPage.tsx#L44): Địa chỉ giao mẫu điền sẵn `"Phòng 402, Chung cư Sunrise City, Quận 7, TP.HCM"`.
2. **Code check cứng theo tên người dùng (`isThang`):**
   - Trong [SocialChannelsPage.tsx:25-27](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/SocialChannelsPage.tsx#L25-L27):
     ```typescript
     const isThang = currentUser?.fullName?.includes('Thắng') || currentUser?.email === 'kol1@scanms.vn';
     const ownerName = isThang ? 'Thắng' : 'Nhật';
     const ownerHandle = isThang ? 'thang' : 'nhat';
     ```
     Đây là code phong cách làm bài tập tạm bợ, cần loại bỏ và dùng dữ liệu động 100% từ `currentUser.fullName`.
3. **Thông báo và ngôn ngữ hiển thị còn pha tạp:**
   - Một số trang báo lỗi bằng mã tiếng Anh thô như `ERR_BAD_REQUEST`, `Failed to fetch` hoặc `Network Error` thay vì tiếng Việt thân thiện.
   - Trộn lẫn thuật ngữ: lúc gọi là "Chủ Shop", lúc gọi là "Merchant", lúc gọi là "Cộng tác viên", lúc gọi là "KOL/KOC". Cần chuẩn hóa bộ từ điển thuật ngữ toàn sàn.
4. **Trải nghiệm bảng biểu khi dữ liệu rỗng (Empty States):**
   - Một số trang quản lý khi tài khoản mới chưa có dữ liệu sẽ hiện bảng trắng trơn hoặc bị vỡ layout thay vì hiển thị hình minh họa tinh tế kèm nút kêu gọi hành động (CTA) như: *"Bạn chưa có đơn hàng nào. Hãy chia sẻ link tiếp thị để nhận đơn đầu tiên!"*.

---

## 🗑️ CÁC CHỨC NĂNG THỪA & RƯỜM RÀ (REDUNDANT / DEAD CODE)

1. **Trùng lặp Route điều hướng trong `AppRoutes.tsx`:**
   - Cùng một trang Danh sách link tiếp thị lại có tới 3 đường dẫn:
     - `/collaborator/links`
     - `/collaborator/referral-links`
     - `/kol/referral-links`
   - Cùng một trang Mã giảm giá KOL lại có tới 2 đường dẫn:
     - `/collaborator/coupons`
     - `/kol/coupons`
   - Cùng một trang Tiến độ thưởng lại có 2 đường dẫn:
     - `/collaborator/bonus-progress`
     - `/kol/bonus-progress`
   - 👉 **Kiến nghị:** Gom về 1 chuẩn duy nhất là `/collaborator/...` để súc tích và tránh phân mảnh SEO.
2. **Các trang mẫu thử nghiệm (Prototype / Mockup Pages):**
   - Route `/prototype`, `/ui-reference`, `/app`, `/app/:screenId` dẫn tới file [UiReferencePage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/UiReferencePage.tsx). Đây là trang mockup iframe cũ thời kỳ vẽ nháp giao diện, không còn giá trị thực tế trong hệ thống thật.
   - 👉 **Kiến nghị:** Xóa bỏ hoặc ẩn khỏi router production.
3. **Thanh Sidebar có một số liên kết trùng ngữ cảnh:**
   - Nút "Sàn mua sắm" xuất hiện lặp lại ở cả đầu Sidebar, Topbar và Footer. Chỉ cần giữ 1 nút tinh tế trên Topbar là đủ.

---

## 🧩 CÁC CHỨC NĂNG THIẾU SO VỚI `END_TO_END_SYSTEM_FLOW.md`

Dưới đây là danh sách các tính năng được ghi trong luồng chuẩn `END_TO_END_SYSTEM_FLOW.md` nhưng **chưa được xây dựng (chưa có code)**:

1. **Phòng Livestream bán hàng tương tác trên sàn (`LiveShoppingRoom.tsx`):**
   - *Mô tả tài liệu:* KOL phát video trực tiếp, ghim sản phẩm ưu đãi góc màn hình, khách bấm mua trực tiếp trong túi đồ phiên live.
   - *Thực tế:* Chưa có mã nguồn.
2. **Quy trình Khách gửi khiếu nại Trả hàng & Admin phân xử 1-Click:**
   - *Mô tả tài liệu:* Khách bấm nút Trả hàng $\rightarrow$ Nộp 1 ảnh bóc hàng lỗi $\rightarrow$ Nếu Shop từ chối, đơn đẩy lên Admin $\rightarrow$ Admin bấm `[Ép hoàn tiền]` hoặc `[Bác bỏ khiếu nại]`.
   - *Thực tế:* Backend đã có hàm hủy hoa hồng (Clawback), nhưng Frontend hoàn toàn chưa có màn hình và form cho luồng này.
3. **Hồ sơ định danh pháp nhân (KYC Shop / Doanh nghiệp):**
   - *Mô tả tài liệu:* Nộp Giấy phép ĐKKD, Giấy ủy quyền thương hiệu, MST doanh nghiệp.
   - *Thực tế:* Chỉ mới có KYC cá nhân cho KOL, chưa có KYC doanh nghiệp cho Shop.
4. **Thẩm định chất lượng sản phẩm trước khi lên sàn:**
   - *Mô tả tài liệu:* Shop đăng sản phẩm đính kèm Phiếu kiểm nghiệm BYT/chứng nhận sản xuất $\rightarrow$ Ban kiểm soát sàn duyệt $\rightarrow$ Sản phẩm mới xuất hiện trên sàn.
   - *Thực tế:* Sản phẩm tạo xong là hiển thị bán ngay, thiếu khâu kiểm duyệt chứng từ của Admin.
5. **Cơ chế cam kết hoàn thành Video Review hàng mẫu trong 7 ngày:**
   - *Mô tả tài liệu:* KOL nhận hàng mẫu $\rightarrow$ Đếm ngược 7 ngày (168h) $\rightarrow$ Nộp link video review để mở khóa quyền xin mẫu tiếp theo.
   - *Thực tế:* Chưa có đồng hồ đếm ngược và chưa có ô nộp link video hoàn tất cho đơn xin mẫu.
6. **Công cụ cào thông tin tự động bằng Link Shopee:**
   - *Mô tả tài liệu:* Dán link Shopee $\rightarrow$ Tự bóc tách tiêu đề, giá, ảnh.
   - *Thực tế:* Chưa tích hợp bộ scraper.

---

## 🎯 LỘ TRÌNH KHUYẾN NGHỊ CẢI THIỆN (ACTION PLAN)

> Lưu ý: Đây là lộ trình định hướng để nhóm cân nhắc thực hiện, hiện tại chưa sửa đổi code.

### 🔴 Ưu tiên 1 (P0 - Sửa lỗi kỹ thuật & Dọn rác chuyên nghiệp):
- Sửa lỗi mapping `p.kycStatus` tại `KycApprovalPage.tsx`.
- Xóa bỏ toàn bộ các giá trị khởi tạo cứng (default state) trong `KycSubmissionPage.tsx`, `SampleRequestsPage.tsx`, `SocialChannelsPage.tsx`.
- Thay thế mảng fallback mock trong `SocialChannelsPage.tsx` và `KycApprovalPage.tsx` bằng giao diện Empty State chuyên nghiệp.
- Dọn dẹp các route trùng lặp trong `AppRoutes.tsx`.

### 🟡 Ưu tiên 2 (P1 - Bổ sung các mắt xích còn thiếu trong luồng):
- Bổ sung nút "Đã nhận hàng mẫu" và form nộp link video review trong 7 ngày cho KOL.
- Bổ sung giao diện Khách khiếu nại trả hàng và 2 nút phán quyết tranh chấp của Admin (`Ép hoàn tiền` / `Bác bỏ`).
- Thêm ô upload ảnh CCCD 2 mặt trong trang KYC của KOL.

### 🟢 Ưu tiên 3 (P2 - Tính năng nâng cao ghi điểm khi bảo vệ):
- Xây dựng phòng Livestream tương tác ghim sản phẩm (`LiveShoppingRoom.tsx`).
- Bổ sung form KYC doanh nghiệp (ĐKKD) cho Shop.
- Tích hợp kiểm duyệt chứng từ sản phẩm trước khi mở bán.
