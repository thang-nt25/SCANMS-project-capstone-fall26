# TỔNG HỢP TOÀN BỘ 32 CHỨC NĂNG DỰ ÁN SCANMS
## TÀI LIỆU BRIEFING DÀNH CHO TRUYỀN ĐẠT & KICKOFF NHÓM
> **Mã đề tài:** FA26SE032  
> **Tên chính thức:** Sales Collaborator and Affiliate Network Management System (SCANMS)  
> **Mục đích:** Bản tổng hợp cô đọng bằng văn nói tự nhiên, trực quan, giúp Leader và các thành viên dễ dàng truyền đạt, nắm bắt toàn bộ luồng nghiệp vụ của hệ thống trong 5 phút.

---

## 🎙️ LỜI MỞ ĐẦU: BỨC TRANH TOÀN CẢNH (BIG PICTURE)

> *"Dự án **SCANMS** của chúng ta bản chất là **hệ thống quản lý mạng lưới Tiếp thị liên kết (Affiliate Marketing) và Cộng tác viên bán hàng (KOL/KOC/Sales Partner)** dành cho các thương hiệu D2C và Shop bán hàng.
>
> **Nỗi đau thực tế ngoài đời:**  
> - **Chủ Shop:** Rất muốn thuê KOL bán hàng nhưng sợ bị gian lận click ảo, tính hoa hồng bằng Excel thủ công thì vừa chậm vừa dễ nhầm lẫn, khách hoàn đơn thì không biết đường nào mà đòi lại hoa hồng.  
> - **KOL / CTV:** Sợ bị bùng tiền, không minh bạch số liệu, không biết đơn hàng của mình đến từ đâu, rút tiền thì bị giữ và chậm chạp.
>
> Hệ thống của chúng ta giải quyết trọn vẹn bài toán này qua **32 chức năng cụ thể**, được gom thành **8 phân hệ nghiệp vụ** kết nối thành một vòng tròn khép kín."*

```
                           VÒNG ĐỜI 1 ĐƠN HÀNG TRONG HỆ THỐNG
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  1. SHOP    │  ──►  │   2. KOL    │  ──►  │  3. KHÁCH   │  ──►  │ 4. HỆ THỐNG │
│ Đăng hàng & │       │ Lấy Link/QR │       │ Bấm mua qua │       │ Bắt Click & │
│ Cài hoa hồng│       │ Đi tiếp thị │       │ Landing/Code│       │ Tính hoa hồng│
└─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘
                                                                         │
┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│ 7. SHOP     │  ◄──  │ 6. KOL      │  ◄──  │ 5. SAU 14D  │  ◄───────────┘
│ Duyệt bill &│       │ Bấm rút tiền│       │ Không hoàn: │
│ Bắn tiền bank│      │ (Khóa ví)   │       │ Chuyển ví OK│
└─────────────┘       └─────────────┘       └─────────────┘
```

---

## 📋 CHI TIẾT 32 CHỨC NĂNG THEO 8 PHÂN HỆ NGHIỆP VỤ

### 1️⃣ PHÂN HỆ 1: AI VÀO HỆ THỐNG & ĐẲNG CẤP CỦA KOL (5 chức năng)
> *"Nhóm này giải quyết việc quản lý người dùng, bảo mật tài khoản và tạo động lực cho KOL cày số."*

* **FR-01: Đăng ký & Đăng nhập JWT (kèm 2FA)**  
  Đăng nhập chia theo vai trò người dùng, cấp Access Token ngắn hạn và Refresh Token dài hạn. Khi rút tiền có thêm xác thực OTP 2FA để bảo vệ ví.
* **FR-02: Phân quyền 4 vai trò (RBAC Guard)**  
  Chặn quyền nghiêm ngặt giữa 4 nhóm: Admin sàn $\rightarrow$ Quản lý sàn $\rightarrow$ Chủ Shop (bao gồm đối soát tài chính) $\rightarrow$ KOL. Shop chỉ thấy dữ liệu Shop mình; KOL chỉ thấy ví và đơn của mình.
* **FR-03: Xác thực tài chính KYC**  
  KOL muốn nhận tiền thì phải nhập CCCD, Mã số thuế cá nhân và Số tài khoản ngân hàng chính chủ để hợp thức hóa thu nhập.
* **FR-04: Quản lý đa kênh Mạng xã hội không giới hạn**  
  KOL liên kết bao nhiêu kênh tùy thích (TikTok, Facebook, Instagram, Threads, YouTube, Shopee Video...) kèm số lượng follower để Shop dễ dàng chọn mặt gửi vàng.
* **FR-05: Tự động phân Cấp bậc KOL (Tier Ranking Engine)**  
  Cứ cuối tháng, hệ thống tự quét tổng doanh số để thăng hạng: **Đồng (0%) $\rightarrow$ Bạc (+1%) $\rightarrow$ Vàng (+3%) $\rightarrow$ Kim Cương (+5%)**. Cấp càng cao, mỗi đơn hàng bán ra càng được thưởng thêm % hoa hồng.

---

### 2️⃣ PHÂN HỆ 2: SHOP CHUẨN BỊ "VŨ KHÍ" CHO KOL (4 chức năng)
> *"Nhóm này dành cho Chủ Shop: cấu hình luật chơi, đăng sản phẩm và chuẩn bị tài nguyên truyền thông."*

* **FR-06: Cài đặt Cấu hình Cửa hàng (Store Settings)**  
  Shop tự cài hạn mức rút tiền tối thiểu (ví dụ: đủ 200k mới cho rút), thời gian lưu cookie (mặc định 30 ngày) và tỷ lệ hoa hồng mặc định của toàn shop.
* **FR-07: Quản lý Danh mục Sản phẩm & Xóa mềm (Soft Delete)**  
  Đăng sản phẩm, sửa giá bán, cập nhật tồn kho, cài % hoa hồng riêng cho từng món. Khi xóa sản phẩm thì chỉ ẩn đi (`is_deleted = true`) để không làm gãy dữ liệu lịch sử các đơn hàng cũ.
* **FR-08: Kho tài nguyên Marketing "1-Click Copy" (Media Hub)**  
  Shop đăng tải ảnh banner HD, video review mẫu, kịch bản bài viết chuẩn SEO. KOL chỉ cần bấm **1 nút Copy** là có sẵn nội dung để mang lên mạng xã hội đăng bài kiếm tiền.
* **FR-09: Cài đặt mốc thưởng doanh số tháng**  
  Shop thiết lập các mốc khích lệ: ví dụ *"Tháng này KOL nào bán vượt 50 triệu sẽ được thưởng thêm 2% hoa hồng trên toàn bộ doanh số"*.

---

### 3️⃣ PHÂN HỆ 3: CÔNG CỤ TIẾP THỊ CỦA KOL & ĐO LƯỢNG CLICK (5 chức năng)
> *"Nhóm này là vũ khí đi bán hàng của KOL và động cơ bắt vết khách hàng."*

* **FR-10: Tạo Link tiếp thị rút gọn mã hóa**  
  KOL chọn sản phẩm cần bán $\rightarrow$ Hệ thống nhả ra đường link ngắn gọn duy nhất dạng `influxnet.vn/r/{short_code}` để đem đi rải trên mạng xã hội.
* **FR-11: Tự động tạo mã QR Code động**  
  Hệ thống tự sinh ảnh QR Code chứa link của KOL, chỉ cần tải về chèn vào video review, livestream hoặc in ra đặt tại bàn ăn/quầy thu ngân.
* **FR-12: Gán Mã giảm giá riêng của KOL (Custom Coupon)**  
  KOL tạo mã giảm giá mang tên mình (ví dụ: `KOLTHANG10`). Người mua không cần bấm link, chỉ cần gõ mã này lúc thanh toán là hệ thống tự biết đơn thuộc về ai.
* **FR-13: Động cơ Tracking Last-Click & Cookie**  
  Khi khách bấm link: Hệ thống âm thầm ghi lại IP, thiết bị (Device Fingerprint), tăng bộ đếm click và cài Cookie 30 ngày. Áp dụng luật **Lượt click cuối cùng thắng (Last-Click Wins)** nếu khách bấm qua nhiều link khác nhau.
* **FR-14: Chống Click tặc bằng Redis Rate Limit**  
  Chặn triệt để các tool cày click ảo: Giới hạn tối đa 10 click/giây từ cùng 1 địa chỉ IP, click vượt ngưỡng sẽ bị bỏ qua không tính vào báo cáo.

---

### 4️⃣ PHÂN HỆ 4: TIẾP NHẬN ĐƠN HÀNG & TÍNH TIỀN HOA HỒNG (9 chức năng)
> *"Trái tim của hệ thống: Tiếp nhận mọi loại Shop (từ shop chốt Zalo đến sàn TMĐT) và tính tiền chuẩn xác."*

* **FR-15: Trang mua hàng công khai có Video Review (Landing Page)**  
  Khách bấm link tiếp thị sẽ mở ra ngay Landing Page của sản phẩm, có sẵn ảnh HD, video review của KOL và feedback thực tế để chốt sale.
* **FR-16: Đặt hàng nhanh không cần tạo nick (Guest Checkout)**  
  Khách chỉ cần điền Tên, SĐT, Địa chỉ nhận hàng, áp mã giảm giá $\rightarrow$ Bấm Mua ngay là xong, hệ thống tự tạo đơn và trừ tồn kho. Cực kỳ tiện khi Demo bảo vệ đồ án!
* **FR-17: Tra cứu hành trình đơn hàng bằng SĐT**  
  Người mua chỉ cần gõ Số điện thoại hoặc Mã đơn là thấy ngay tiến độ đơn: Đang chuẩn bị $\rightarrow$ Đang giao hàng $\rightarrow$ Đã nhận hàng.
* **FR-18: Đánh giá & Review sản phẩm 5 sao**  
  Khách nhận hàng thành công có thể gửi đánh giá 1-5 sao kèm nhận xét chất lượng để tăng uy tín cho Shop và KOL.
* **FR-19: Webhook nhận đơn từ sàn TMĐT ngoài (`POST /orders/webhook`)**  
  Dành cho các Shop lớn bán trên Shopee, TikTok Shop, Shopify. Mỗi khi có đơn mới, sàn tự động bắn webhook sang hệ thống InfluxNet.
* **FR-20: Tạo đơn thủ công & Import file Excel**  
  Dành cho các Shop bán hàng qua chat Zalo, chốt đơn qua điện thoại: Cuối ngày kế toán chỉ cần tải file Excel danh sách đơn lên là hệ thống tự tính hoa hồng cho từng KOL.
* **FR-21: Tính hoa hồng chi tiết từng món (Per-Item Billing)**  
  Tiền hoa hồng không tính cào bằng, mà tính theo từng sản phẩm:  
  $$\text{Tiền} = \text{Số lượng} \times \text{Đơn giá} \times (\% \text{món} + \% \text{cấp bậc} + \% \text{chiến dịch})$$  
  Tiền này lập tức được cộng vào **Ví Chờ (Pending Balance)** của KOL.
* **FR-22: Tự động duyệt hoa hồng sau 14 ngày**  
  Sau 14 ngày kể từ khi đơn giao thành công (vượt qua thời hạn cho phép đổi trả hàng), Cron Job tự động chuyển tiền từ **Ví Chờ $\rightarrow$ Ví Khả Dụng**.
* **FR-23: Thu hồi hoa hồng khi khách hoàn/hủy đơn (Clawback)**  
  Nếu khách boom hàng hoặc trả hàng: Shop đổi trạng thái đơn sang `RETURNED`, hệ thống lập tức hủy hoa hồng, trừ sạch số tiền trong ví chờ về 0 và ghi log thu hồi vào sổ cái.

---

### 5️⃣ PHÂN HỆ 5: QUẢN TRỊ VÍ TIỀN, SỔ CÁI BẤT BIẾN & CHI TRẢ (5 chức năng)
> *"Nhóm chuẩn tài chính ngân hàng: minh bạch, không thể bị hack và không bao giờ âm ví."*

* **FR-24: Bấm rút tiền & Khóa dòng chống gian lận (Pessimistic Locking)**  
  KOL bấm rút tiền. Hệ thống dùng lệnh `SELECT ... FOR UPDATE` khóa dòng ví lại trong tích tắc để chặn hoàn toàn trò spam click rút tiền liên tục gây âm ví.
* **FR-25: Sổ cái tài chính bất biến (Financial Ledger)**  
  Mọi biến động số dư (Cộng hoa hồng, Rút tiền, Thu hồi hoàn trả) đều được ghi một dòng Append-Only vào sổ cái, tuyệt đối không ai có quyền sửa hoặc xóa.
* **FR-26: Tự động khấu trừ 10% thuế TNCN**  
  Theo đúng luật thuế Việt Nam, nếu lệnh rút từ 2.000.000 VNĐ trở lên, hệ thống tự động trích lại 10% thuế TNCN và hiển thị rõ số tiền thực nhận (90%).
* **FR-27: Phê duyệt Payout & Bắt buộc tải ảnh Bill ngân hàng**  
  Shop duyệt lệnh rút tiền thì bắt buộc phải chụp ảnh bill chuyển khoản ngân hàng tải lên hệ thống kèm mã giao dịch để làm bằng chứng đối soát.
* **FR-28: Xuất file chuyển tiền lô VietQR / Napas247**  
  Kế toán chỉ cần bấm 1 nút là xuất ra toàn bộ danh sách lệnh rút thành file Excel chuẩn định dạng VietQR/Napas247, nạp vào Internet Banking ngân hàng là chuyển tiền hàng loạt trong 1 phút.

---

### 6️⃣ PHÂN HỆ 6: CHAT TRỰC TIẾP REALTIME & XIN HÀNG MẪU (3 chức năng)
> *"Tạo cầu nối trực tiếp giữa nhãn hàng và KOL mà không cần phải qua mạng xã hội cá nhân."*

* **FR-29: Chat 1-1 Realtime bằng Socket.io**  
  Khung chat trực tiếp giữa Shop và KOL ngay trên web: nhắn tin văn bản, gửi file ảnh kịch bản review, hiển thị trạng thái đã xem.
* **FR-30: Quy trình Xin sản phẩm mẫu dùng thử (Sample Product Flow)**  
  KOL bấm *"Xin mẫu làm video review"* $\rightarrow$ Nhập địa chỉ $\rightarrow$ Shop bấm duyệt $\rightarrow$ Shop điền Mã vận đơn GHTK/GHN vào chat để KOL theo dõi gói hàng mẫu.
* **FR-31: Mời KOL tham gia Chiến dịch độc quyền qua Chat**  
  Shop tạo chiến dịch ưu đãi riêng, gửi một "tấm thiệp mời" kèm mức hoa hồng VIP thẳng vào khung chat của Top KOL để chốt deal hợp tác.

---

### 7️⃣ PHÂN HỆ 7: BÁO CÁO PHÂN TÍCH & ĐUA TOP (2 chức năng)
> *"Thống kê số liệu trực quan và trò chơi hóa (gamification) để kích thích bán hàng."*

* **FR-32: Dashboard Phân tích Doanh số Realtime**  
  Biểu đồ tương tác thời gian thực: Theo dõi Lượt click, Số đơn thành công, Tỷ lệ chốt đơn (CR%), Tiền hoa hồng chờ duyệt và Doanh thu theo từng ngày.
* **FR-33: Bảng vinh danh Top 10 KOLs (Leaderboard)**  
  Bảng xếp hạng Top 10 người bán giỏi nhất tháng kèm Cúp Vàng, Bạc, Đồng để tạo không khí thi đua sôi nổi trong cộng đồng KOL.

---

### 8️⃣ PHÂN HỆ 8: ĐIỂM NHẤN CÔNG NGHỆ AI & BẢO MẬT AUDIT (2 chức năng)
> *"Hai tính năng công nghệ thông minh tạo điểm nhấn khác biệt khi chấm đồ án."*

* **FR-34: AI Gợi ý KOL phù hợp với sản phẩm (Smart Matching)**  
  Thuật toán AI tự động phân tích lịch sử bán hàng và thế mạnh ngành hàng để gợi ý cho Shop: *"Sản phẩm mỹ phẩm này nên mời 5 bạn KOL A, B, C này vì độ tương thích và tỷ lệ chốt đơn cao nhất"*.
* **FR-35: AI Phát hiện gian lận & Nhật ký Audit Log**  
  AI quét phát hiện traffic bất thường (ví dụ: một link có hơn 5.000 lượt click trong 1 giờ nhưng không có nổi 1 đơn hàng) $\rightarrow$ Tự động gắn cờ cảnh báo `AI_FRAUD_FLAG` vào Audit Log cho Admin vào xử lý.

---

## 👥 MA TRẬN PHÂN CHIA 5 THÀNH VIÊN (WBS FULLSTACK)

Mỗi thành viên trong nhóm phụ trách trọn gói từ **Giao diện Frontend (React) + API Backend (NestJS) + Thiết kế CSDL (PostgreSQL)**:

| Thành Viên | Vai Trò & Phân Hệ Cốt Lõi | Các Chức Năng Chính Đảm Nhận |
| :--- | :--- | :--- |
| **1. Nguyễn Thành Thắng** *(Leader)* | **Tài chính, Ví tiền, Khóa dòng & Payout Engine** | `FR-24` đến `FR-28` (Ví tiền, Khóa `SELECT FOR UPDATE`, Sổ cái tài chính, Thuế TNCN 10%, Xuất file VietQR, Màn hình Super Admin). |
| **2. Nguyễn Đình Tuấn** | **Tracking, Mốc Thưởng, Link/QR & Động cơ Hoa hồng** | `FR-09` đến `FR-14`, `FR-19`, `FR-21` đến `FR-23` (Cấu hình mốc thưởng doanh số tháng, Sinh Link/QR, Cookie 30 ngày, Last-Click, Redis Rate Limit, Webhook đơn hàng, Tính hoa hồng từng món, Duyệt 14 ngày & Thu hồi đơn hủy). |
| **3. Nguyễn Phú Quý** | **Cửa hàng, Sản phẩm, Media Hub & Hàng mẫu** | `FR-06` đến `FR-08`, `FR-30` (Cấu hình Store, CRUD Sản phẩm Soft Delete, Kho media 1-click copy, Luồng xin hàng mẫu kèm mã vận đơn). |
| **4. Phan Xuân Thịnh** | **Xác thực IAM, Phân quyền RBAC, KYC & Chat Realtime** | `FR-01` đến `FR-05`, `FR-29`, `FR-31` (Đăng ký/Đăng nhập JWT, 2FA OTP, Role Guards 5 vai trò, KYC tài chính, Đa kênh MXH, Chat realtime 1-1 Socket.io). |
| **5. Trần Văn Nhật** | **Trải nghiệm Mua hàng, Dashboard & 2 Động cơ AI** | `FR-15` đến `FR-18`, `FR-32` đến `FR-35` (Trang Landing Page mua hàng, Guest Checkout, Tra cứu đơn SĐT, Review 5 sao, Dashboard biểu đồ, Bảng vinh danh Top KOL, AI Gợi ý KOL & AI Bắt gian lận). |

---

## 💡 GỢI Ý CÁCH TRÌNH BÀY CHO THUYẾT TRÌNH BẢO VỆ
1. **1 phút đầu:** Nêu ngay bài toán thực tế và giải pháp của InfluxNet.
2. **2 phút tiếp theo:** Trình diễn kịch bản thực tế: Khách click link $\rightarrow$ Mua hàng $\rightarrow$ Webhook nhảy tiền vào ví chờ $\rightarrow$ Rút tiền khóa dòng.
3. **1 phút cuối:** Nhấn mạnh 3 điểm kỹ thuật chuyên sâu ghi điểm tuyệt đối:
   - **Chống Race Condition ví tiền:** Khóa dòng CSDL `SELECT ... FOR UPDATE`.
   - **Đối soát Last-Click 3 tầng:** Coupon $\rightarrow$ Cookie mã hóa $\rightarrow$ Device Fingerprint.
   - **Trí tuệ nhân tạo:** AI Smart Matching gợi ý KOL & AI phát hiện gian lận click tặc.
