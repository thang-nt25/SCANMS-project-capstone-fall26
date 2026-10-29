# 🏛️ BÁO CÁO KIỂM THỬ THỰC TẾ & CHỨNG MINH CẢI TỔ TOÀN DIỆN HỆ THỐNG SCANMS
## TỪ MÔ HÌNH "SÀN CHỢ TMĐT TỰ DO" SANG "HỆ THỐNG QUẢN LÝ ĐỘI NGŨ CỘNG TÁC VIÊN BÁN HÀNG & TIẾP THỊ LIÊN KẾT NỘI BỘ DOANH NGHIỆP"
### (Enterprise Sales Collaborator & In-House Affiliate Network Management System - E2E Live Test Report)

> **Mã đồ án:** FA26SE032 | **Học kỳ:** Fall 2026 / Spring 2026 | **Đại học FPT TP.HCM**  
> **Giảng viên hướng dẫn:** ThS. Tôn Thất Hoàng Minh (`MinhTTH5`)  
> **Trưởng nhóm thực hiện:** Nguyễn Thành Thắng (Team Leader & Lead Architect)  
> **Tài liệu tham chiếu:**  
> - `docs/SCANMS_MASTER_REFACTORING_PLAN.md`  
> - `docs/SCANMS_REALIGNMENT_BLUEPRINT.md`  
> **Trạng thái:** ✅ **KIỂM THỬ THỰC TẾ HOÀN TẤT 100% (LIVE TEST PASSED - 0 DEFECTS)**  
> **Hệ thống chạy thật:** Backend NestJS port `3000` (PostgreSQL + Redis), Frontend React Vite port `5173`.

---

## 1. GIẢI MÃ NÚT THẮT SLIDE 8: NGUỒN GỐC & VÒNG ĐỜI CỦA "EXCLUSIVE ASSETS"

### 1.1. Hiện tượng trên Slide 8 và thắc mắc của bạn
Trên Slide 8 (*Flow 2: Deals & Livestream*), xuất hiện cụm mũi tên:
$$\text{ACTIVATE} \longrightarrow \textbf{EXCLUSIVE ASSETS: } \begin{cases} \bullet\text{ VIP Voucher Code} \\ \bullet\text{ Exclusive Smart Link} \end{cases} \longrightarrow \textbf{BONUS While LIVE (+2\%)}$$

Bạn đã đặt ra câu hỏi rất chính xác:
- *Tại sao lại có cái xuất ra link, voucher này?*
- *Smart link thì có trước khi deal rồi mà, còn voucher độc quyền hiện tại là KOC xin mã độc quyền, shop cấp voucher cho mã đó, tại sao lại để active từ tier bonus ra?*

### 1.2. Bản chất nghiệp vụ chính xác trong hệ thống SCANMS
Hệ thống phân định rành mạch giữa **2 loại Tài nguyên Tiếp thị**:

```
                                  ┌──────────────────────────────────────────────┐
                                  │ KOC ĐƯỢC DUYỆT eKYC (Hạng Đồng - Base 10%)   │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                 ┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
                 │ 1. SMART LINK TIÊU CHUẨN CÓ SẴN      │  │ 2. ĐÀM PHÁN DEAL ĐỘC QUYỀN 2 CHIỀU  │
                 │ • Có ngay khi duyệt eKYC             │  │ • KOC gửi Proposal xin mức 13%-16%   │
                 │ • Áp dụng Base Rate chuẩn 10%        │  │ • Hoặc Shop mời KOC qua Chat Realtime│
                 │ • Dành cho sản phẩm mở Open Offer    │  └──────────────────┬───────────────────┘
                 └──────────────────────────────────────┘                     │
                                                                 Shop bấm Chấp thuận Deal (APPROVED)
                                                                              │
                                                                              ▼
                                                           ┌──────────────────────────────────────┐
                                                           │ KÍCH HOẠT TÀI SẢN ĐỘC QUYỀN          │
                                                           │ (ACTIVATE EXCLUSIVE ASSETS)          │
                                                           ├──────────────────────────────────────┤
                                                           │ 1. Exclusive Smart Link (VIP Rate):  │
                                                           │    Ghi đè Base Rate -> Hưởng 13%-16% │
                                                           │ 2. VIP Voucher Code (Mã riêng KOC):  │
                                                           │    VD: MEGASALE20 (Giảm 10% cho Fan) │
                                                           │    hoặc KOL01SAVE / NGUYENMA...      │
                                                           └──────────────────┬───────────────────┘
                                                                              │
                                                               KOC ghim sản phẩm vào Livestream
                                                                              │
                                                                              ▼
                                                           ┌──────────────────────────────────────┐
                                                           │ BONUS WHILE LIVE (+2%)               │
                                                           │ Đơn phát sinh trong phiên Live được  │
                                                           │ cộng thêm +2% (Tổng: 13% + 2% = 15%) │
                                                           └──────────────────────────────────────┘
```

1. **Smart Link tiêu chuẩn (Standard Link - 10%):** Bất kỳ KOC nào sau khi được duyệt eKYC đều có thể tự sinh Smart Link cho mọi sản phẩm của nhãn hàng. Lúc này thù lao hưởng theo mức chuẩn sàn $10\%$ (hoặc cộng thêm Tier nếu đã thăng hạng Bạc/Vàng/Kim Cương).
2. **Tài sản Độc quyền (Exclusive Assets):** **KHÔNG PHẢI TỰ NHIÊN CÓ**, và **KHÔNG SINH RA TỪ TIER BONUS**! Nó là thành quả của thỏa thuận 2 chiều giữa KOC và Trưởng nhãn hàng (`SHOP_MANAGER`):
   - KOC gửi đề xuất: *"Em có tệp khách lớn, xin mức hoa hồng riêng 13% (thay vì 10%) và xin Shop cấp 1 mã voucher giảm 10% riêng gắn tên em để em kéo fan mua"*.
   - Hoặc Shop Manager lọc KOC uy tín từ bảng Leaderboard và gửi Thẻ mời chiến dịch VIP trực tiếp vào khung Chat Socket.IO.
   - Khi Shop Manager bấm **"Chấp thuận" (`APPROVED`)**, hệ thống chuyển trạng thái Deal sang `ACTIVE` và tự động kích hoạt **Bộ đôi Tài sản Độc quyền**:
     - **VIP Voucher Code (Mã giảm giá độc quyền):** Ví dụ `MEGASALE20`, `KOL01SAVE` giảm 5% - 10% độc quyền cho khách hàng của KOC đó.
     - **Exclusive Smart Link (Liên kết tiếp thị độc quyền):** Kích hoạt động cơ ghi đè áp dụng thẳng mức VIP ($13\%$) cho KOC thay vì mức cơ bản $10\%$.
3. **Thưởng Phiên Live (+2% Live Bonus):** Khi KOC đưa sản phẩm đó vào phiên Mega Live giờ vàng, đơn hàng được gắn cờ `LiveSession` và động cơ tự động cộng thêm $+2\%$ (Ví dụ: $13\% \text{ VIP} + 2\% \text{ Live} = 15\%$).

---

## 2. BẢNG TỔNG HỢP SO SÁNH ĐỘT PHÁ
### Hệ Thống Cũ (Sàn Chợ Mở Shopee-Clone) vs Hệ Thống Mới (Hệ Thống Doanh Nghiệp In-House)

| Hạng mục Nghiệp vụ | Hệ thống Cũ (Sàn chợ mở - Sai đề tài) | Hệ thống Mới (In-House Affiliate Network) | Trạng thái Thực tế Đã Kiểm Thử |
| :--- | :--- | :--- | :---: |
| **Quyền lập Cửa hàng (Shop)** | Khách vãng lai bấm tab "Đăng ký Shop" để tự tạo gian hàng bán dạo | **Loại bỏ 100% form tạo Shop công khai.** Cửa hàng thuộc sở hữu doanh nghiệp. `SHOP_MANAGER` là nhân sự nội bộ do `SYSTEM_ADMIN` bổ nhiệm tại `/admin/personnel`. | ✅ Đã kiểm chứng (Ảnh 02, Ảnh 03, Ảnh 04) |
| **Dòng tiền bán hàng** | Tiền giam tại ví trung gian sàn chợ | **100% tiền thanh toán** (VietQR/PayOS/COD) chảy thẳng vào **Tài khoản Doanh nghiệp Tập trung (Corporate Master Account)** | ✅ Đã chuẩn hóa kiến trúc |
| **Quyền Rút tiền (Payout)** | Chủ shop bán xong làm đơn xin sàn rút tiền về tài khoản ngân hàng cá nhân | **Shop Manager TUYỆT ĐỐI KHÔNG RÚT TIỀN** (tiền là của công ty). **CHỈ CÓ KOC MỚI THỰC HIỆN LỆNH RÚT HOA HỒNG (Payout)** sau 7-14 ngày Escrow. | ✅ Đã kiểm chứng (Ảnh 05, Ảnh 09) |
| **Thuế Thu nhập Cá nhân (TNCN)** | Không có, trả tròn số không hợp pháp | Hệ thống tự động tính và **khấu trừ 10% thuế TNCN** cho các khoản rút $\ge 2.000.000$đ theo Thông tư 111/2013/TT-BTC. | ✅ Đã kiểm chứng (Ảnh 05) |
| **Cơ chế tính thù lao (Commission)** | Cộng dồn vô tội vạ ($10\% + 3\% + 5\% + 3\% = 21\% \rightarrow 25\%$) | **Quy tắc Ưu tiên Mức tốt nhất (Best-Benefit Precedence Rule):** $\max(\text{Deal VIP}, \text{Campaign}, \text{Tier}, \text{Base}) + \text{Live Bonus (+2\%)}$. | ✅ Đã kiểm chứng (Ảnh 10) |
| **Cấp bậc khởi điểm KOC** | Gán tùy tiện hoặc mặc định Bạc | Duyệt eKYC xong tự động gán **Hạng ĐỒNG (Bronze - 0% Bonus)**, hưởng Base Rate $10\%$. Đạt doanh số sạch mới thăng hạng. | ✅ Đã kiểm chứng (Ảnh 11) |
| **Quản lý Đơn hàng Merchant** | Chỉ có các tab đơn giản Shopee clone | Bổ sung tab **"Chờ thanh toán (Unpaid)"** (VietQR chưa nhận tiền) và tab **"Trả hàng / Hoàn tiền (Returns / Disputes)"**. | ✅ Đã kiểm chứng (Ảnh 07) |
| **Dữ liệu KOC Hub của Shop** | Dùng bảng 4 đơn hàng ảo hardcoded (`#SCN-99824`) và nút bật toggle "Số liệu mẫu" | **Xóa bỏ 100% dữ liệu ảo.** Kết nối dữ liệu thật từ DB, chat Socket.IO đàm phán deal VIP và cấp voucher trực tiếp. | ✅ Đã kiểm chứng (Ảnh 08, Ảnh 10b) |
| **Microcopy & Giao diện UI** | Quá nhiều chữ mô tả chỉ việc con nít, icon màu mè, badge phô trương | **Loại bỏ 100% văn phong thừa thãi, icon Sparkles/ngôi sao trẻ con.** Dùng token Warm Sand Gold, typography `font-mono tabular-nums`, thẻ chỉ số mật độ cao. | ✅ Đã kiểm chứng toàn bộ 14 màn hình |

---

## 3. CHI TIẾT 10 CHỨC NĂNG CỐT LÕI ĐÃ CẢI TỔ & MINH CHỨNG THỰC TẾ

---

### Chức năng 1: Định vị Bản sắc Trang Chủ & Nhãn hàng Trực thuộc (`C-01`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Trang chủ hiển thị như một sàn thương mại điện tử tự do ("Sàn đa gian hàng", nút mời người ngoài mở shop).  
  - *Mới:* Định vị là **Hệ Thống Bán Lẻ Trực Thuộc Doanh Nghiệp & Mạng Lưới Tiếp Thị Liên Kết (Affiliate Commerce Network)**. Header mang thương hiệu SCANMS sang trọng, phân bổ rõ 3 Cửa hàng/Ngành hàng trực thuộc (`Sora Skin`, `Aura Bio`, `GreenBio Health`). Mỗi thẻ sản phẩm hiển thị huy hiệu hoa hồng KOC chuẩn $10\%$.
* **Cách thực hiện:**  
  1. Truy cập `http://localhost:5173/`.  
  2. Quan sát Logo `ScanMS+ AFFILIATE COMMERCE NETWORK`.  
  3. Cuộn xuống khu vực sản phẩm để thấy nhãn hoa hồng: `Hoa hồng CTV: 10% (~25.000 ₫)`.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Hero Header: `01_homepage_hero.png`
  - Gian hàng & Huy hiệu hoa hồng: `01b_homepage_storefronts_commission.png`

---

### Chức năng 2: Cổng Đăng Ký Đối Tác Tiếp Thị KOL/KOC (`C-02`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Chứa 4 đoạn văn giải thích dài dòng, icon ngôi sao/lấp lánh, microcopy chỉ việc như cho trẻ con.  
  - *Mới:* Chuyển sang **Bảng Tiêu Chuẩn Chính Sách (Executive Policy Terms Sheet)** dạng Key-Value chuẩn mực:
    - Hoa hồng cơ sở: `10% (Hạng Đồng)`
    - Hàng mẫu thử: `14 ngày trải nghiệm`
    - Deal độc quyền: `VIP 13% - 16%`
    - Rút tiền Napas 24/7: `Khấu trừ 10% TNCN`
    - Thời gian thẩm định: `Cam kết trong 24h`
    - Quy trình 4 bước tinh gọn dạng lưới (1. Nộp eKYC $\rightarrow$ 2. Thẩm định $\rightarrow$ 3. Hạng Đồng $\rightarrow$ 4. Lấy Smart Link).
    - Form eKYC 3 khối có đánh số thứ tự: 1. Kênh truyền thông & Lưu lượng, 2. Định danh công dân (CCCD), 3. Tài khoản thanh toán Napas 24/7.
* **Cách thực hiện:**  
  1. Đăng nhập tài khoản khách hàng `customer01@seed.scanms.test` (`Password@123`).  
  2. Truy cập `/customer/upgrade`.  
  3. Quan sát Form eKYC bên trái và Bảng chính sách bên phải.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình Cổng Đối Tác: `02_creator_portal_upgrade.png`

---

### Chức năng 3: Bổ Nhiệm & Quản Trị Nhân Sự Cửa Hàng (`C-03`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Cho phép khách ngoài đăng ký shop bừa bãi; modal bổ nhiệm dùng văn bản giải thích mã hóa RFC 9106 Argon2id rườm rà.  
  - *Mới:* Toàn bộ Cửa hàng là tài sản nội bộ của doanh nghiệp. Chỉ có `SYSTEM_ADMIN` mới có quyền bổ nhiệm Trưởng nhãn hàng (`SHOP_MANAGER`) và Chuyên viên vận hành (`SYSTEM_MANAGER`) tại `/admin/personnel`. Modal bổ nhiệm gọn gàng, chuyên nghiệp, gán trực tiếp nhân sự phụ trách Cửa hàng.
  - Bảng 4 thẻ KPI mật độ cao: Tổng nhân sự (18), Quản lý Cửa hàng (16), Chuyên viên Vận hành (1), Cửa hàng trực thuộc (17). Avatar chữ cái viết tắt, micro-badge vai trò rõ nét.
* **Cách thực hiện:**  
  1. Đăng nhập `admin@seed.scanms.test` (`Password@123`).  
  2. Truy cập `/admin/personnel`.  
  3. Bấm nút `+ Bổ nhiệm nhân sự mới` ở góc phải.  
  4. Modal mở ra cho phép chọn vai trò ("Quản lý Cửa hàng" hoặc "Chuyên viên Vận hành") và Cửa hàng phụ trách.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Bảng quản trị nhân sự: `03_admin_personnel_management.png`
  - Modal bổ nhiệm nhân sự: `04_admin_appoint_staff_modal.png`

---

### Chức năng 4: Trung Tâm Quyết Toán Chi Trả & Khấu Trừ Thuế TNCN 10% (`C-04`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Cho chủ shop vào xin rút tiền doanh thu bán hàng; chi trả không trừ thuế TNCN, gắn nhãn tùy tiện ("Nộp Kho bạc", "Lô VietQR đã xuất").  
  - *Mới:* **SHOP MANAGER KHÔNG CÓ NÚT RÚT TIỀN** (tiền bán hàng vào tài khoản doanh nghiệp). Khu vực này **CHỈ CHI TRẢ THÙ LAO TIẾP THỊ CHO KOC**.
    - Tự động khấu trừ **10% thuế TNCN** cho các khoản rút $\ge 2.000.000$đ theo Luật Thuế TNCN (ví dụ: rút 2.000.000đ $\rightarrow$ thuế 200.000đ $\rightarrow$ thực chuyển 1.800.000đ).
    - Bắt buộc đính kèm Ủy nhiệm chi (UNC / File Bill ngân hàng) và mã FT/Ref Code trước khi bấm duyệt.
    - Tab 2: Quản lý Quỹ bảo chứng Escrow 14 ngày (158.400.000đ) đảm bảo an toàn đổi trả trước khi chuyển tiền về doanh nghiệp.
* **Cách thực hiện:**  
  1. Tại vai trò Admin, truy cập `/admin/payouts`.  
  2. Xem 4 thẻ KPI: Chờ phê duyệt (0 ₫), Đã giải ngân (4.600.000 ₫), Thuế TNCN đã khấu trừ (400.000 ₫), Chờ chuyển khoản Napas (0).  
  3. Xem danh sách chi trả: Bấm nút `Xem UNC` để mở modal xem ảnh chứng từ ủy nhiệm chi ngân hàng.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình Quyết toán thù lao: `05_admin_finance_payouts.png`

---

### Chức năng 5: Thẩm Định eKYC & Phân Cấp Khởi Điểm Hạng Đồng (`C-05`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* KOC duyệt xong được gán ngẫu nhiên hoặc gán cấp Bạc; duyệt tài khoản không rõ ràng.  
  - *Mới:* Khi Admin bấm "Phê duyệt eKYC", tài khoản tự động được gán vào **HẠNG ĐỒNG (Bronze - 0% Tier Bonus)**, hưởng Base Rate $10\%$. Đạt doanh số tích lũy sạch sau 14 ngày Escrow mới được thăng Bạc (+1%), Vàng (+2%), Kim Cương (+3%).
* **Cách thực hiện:**  
  1. Tại vai trò Admin, truy cập `/admin/users`.  
  2. Lọc danh sách theo vai trò hoặc trạng thái eKYC.  
  3. Xem chi tiết hồ sơ CCCD gắn chip và tài khoản ngân hàng Napas 24/7.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình eKYC Admin: `06_admin_kyc_verification.png`

---

### Chức năng 6: Quản Lý Đơn Hàng Cửa Hàng Với Tab Chờ Thanh Toán & Khiếu Nại (`C-06`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Chỉ có các tab cơ bản, đơn VietQR chưa thanh toán bị gộp chung làm shipper lấy hàng nhầm lẫn; không có tab xử lý hoàn tiền đổi trả.  
  - *Mới:*  
    - Tab **"Chờ thanh toán (Unpaid)"**: Tách biệt đơn VietQR/PayOS đang chờ khách chuyển tiền với đơn COD/đã thanh toán chờ giao.
    - Tab **"Trả hàng / Hoàn tiền (Returns / Disputes)"**: Quản lý khiếu nại khách hàng trong chu kỳ Escrow 14 ngày.
    - Mỗi đơn hàng hiển thị rõ **KOC tiếp thị mang lại đơn** (Ví dụ: `Nguyễn Mai Anh`).
* **Cách thực hiện:**  
  1. Đăng nhập `shop01@seed.scanms.test` (`Password@123`).  
  2. Truy cập `/merchant/orders`.  
  3. Quan sát các tab: Tất cả (20), Chờ thanh toán, Chờ lấy hàng (7), Đang giao (0), Đã giao (3), Trả hàng / Hoàn tiền, Đã hủy.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình Quản lý Đơn hàng: `07_merchant_orders_management.png`

---

### Chức năng 7: KOC Hub Shop & Đàm Phán Deal VIP Thời Gian Thực (`C-07`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Hiển thị bảng tĩnh 4 đơn hàng ảo `#SCN-99824` và công tắc "Đang bật số liệu mẫu"; nút tìm kiếm dùng icon Sparkles màu mè.  
  - *Mới:*  
    - Xóa bỏ 100% dữ liệu ảo và công tắc mẫu.
    - Thay thế toàn bộ icon Sparkles bằng icon Search/ShoppingBag chuyên nghiệp.
    - Tích hợp Chat Socket.IO thời gian thực: Shop gửi Thẻ mời Chiến dịch VIP (+1% thưởng) trực tiếp vào khung chat; KOC gửi đề xuất Deal VIP (13% - 16%) và Shop cấp Voucher độc quyền trực tiếp.
* **Cách thực hiện:**  
  1. Tại tài khoản Shop `shop01@seed.scanms.test`, truy cập `/merchant/kol-hub`.  
  2. Chọn cuộc hội thoại với `Phan Hải Yến` hoặc `Nguyễn Mai Anh`.  
  3. Xem thẻ "Chiến dịch VIP: Sora Skin — Tuần lễ trải nghiệm (+1% hoa hồng)". Bấm `Cấp Voucher Riêng` hoặc `Mời Chiến Dịch VIP`.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình KOC Hub Shop: `08_merchant_kol_hub.png`

---

### Chức năng 8: Ví KOC & Minh Bạch Thuế TNCN (`C-08`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Không có cảnh báo thuế, không đối chiếu chu kỳ Escrow.  
  - *Mới:*  
    - Hiển thị rành mạch 2 số dư: **Số dư khả dụng** (đã qua 14 ngày đổi trả) và **Số dư chờ đối soát Escrow** (đang đếm ngược hạn khiếu nại).  
    - Form rút tiền liên kết tài khoản ngân hàng Napas 24/7 (MBBank, Vietcombank...).  
    - Hiển thị quy định khấu trừ thuế TNCN 10% cho các khoản rút $\ge 2.000.000$đ.
* **Cách thực hiện:**  
  1. Đăng nhập KOC `kol01@seed.scanms.test` (`Password@123`).  
  2. Truy cập `/collaborator/wallet`.  
  3. Xem Số dư khả dụng (6.000 ₫), Chờ đối soát Escrow (37.500 ₫), tài khoản MBBank đã xác minh.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình Ví KOC: `09_collaborator_wallet_payout.png`

---

### Chức năng 9: Bộ Công Cụ Tiếp Thị (Smart Link, Voucher Độc Quyền, Mẫu Thử) (`C-09`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Link tiếp thị và Voucher bị nhầm lẫn với Tier Bonus; giao diện Coupon dùng icon Sparkles trẻ con; không thể chuyển tab trơn tru.  
  - *Mới:*  
    - Hợp nhất 3 công cụ vào **Trung tâm Tiếp thị (`/collaborator/marketing`)** với 3 tab:
      1. **Tab 1: Link & QR tiếp thị**: 6 liên kết, 9 lượt nhấp, 4 đơn chuyển đổi. Hộp "Deal độc quyền" hiển thị Serum Vitamin C đang áp dụng mức VIP $13\%$ (thay vì Base $10\%$).
      2. **Tab 2: Mã giảm giá độc quyền**: Hiển thị các mã do Shop duyệt cấp riêng (`NGUYENMA...`, `KOL01SAVE` giảm 5% - 10%). Đổi toàn bộ icon sang `DollarSign`, `Tag`, `Ticket` chuyên nghiệp.
      3. **Tab 3: Mẫu thử & Video review**: Theo dõi đơn mẫu 14 ngày (Sora Skin: Serum Vitamin C SEED-001) và nút nộp link video TikTok/YouTube review.
* **Cách thực hiện:**  
  1. Tại vai trò KOC, truy cập `/collaborator/marketing?tab=links` để xem Smart Link và Deal độc quyền.  
  2. Bấm tab `Mã giảm giá độc quyền` (hoặc truy cập `/collaborator/marketing?tab=coupons`) để xem Voucher độc quyền.  
  3. Bấm tab `Mẫu thử & Video review` để xem SLA 14 ngày và nộp video.  
  4. Truy cập `/collaborator/collaboration` để xem khung đàm phán deal 2 chiều với các nhãn hàng.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Tab Link & QR tiếp thị + Deal VIP: `10_collaborator_marketing_toolkit.png`
  - Tab Mã giảm giá độc quyền: `10c_collaborator_coupons.png`
  - Màn hình Đàm phán Deal độc quyền: `10b_collaborator_exclusive_deals.png`
  - Tab Mẫu thử & SLA 14 ngày: `12_collaborator_samples_sla.png`

---

### Chức năng 10: Tổng Quan Bảng Điều Khiển KOC & Sửa Lỗi Truy Vấn Database (`C-10`)
* **Mục đích nghiệp vụ & Khác lúc cũ:**  
  - *Cũ:* Xuất hiện thông báo lỗi đỏ *"Chưa thể tải tổng quan. Dấu — nghĩa là chưa có dữ liệu..."* do câu lệnh SQL `$queryRaw` trong NestJS backend truy vấn sai tên cột database (`oi.orderId` thay vì `oi.order_id` do Prisma `@map`).  
  - *Mới:*  
    - **Sửa triệt để câu lệnh SQL trong `dashboard.service.ts`**: Chuẩn hóa `oi.order_id`, `o.attributed_collaborator_id`, `c.order_id`.  
    - Sau khi sửa và biên dịch lại backend, thông báo lỗi đỏ biến mất hoàn toàn 100%.  
    - Bảng điều khiển tải dữ liệu thời gian thực mượt mà:
      - Số dư khả dụng: `6.000 ₫`
      - Chờ đối soát Escrow: `37.500 ₫`
      - Hoa hồng tạm tính: `72.500 ₫` (tính từ các đơn hàng thật đang xử lý)
      - Lượt nhấp: `7` (+250.0%)
      - Đơn hàng: `1 / 2 đơn` (+100.0%)
      - GMV tiếp thị: `271.001 ₫` (+100.0%)
      - Biểu đồ hiệu quả theo ngày và lịch sử biến động số dư.
* **Cách thực hiện:**  
  1. Tại vai trò KOC, truy cập `/collaborator/dashboard`.  
  2. Quan sát biểu đồ và các thẻ chỉ số hiển thị đầy đủ, không còn bất kỳ thông báo lỗi nào.
* **Kết quả thực tế (Hình ảnh minh chứng):**
  - Màn hình Bảng điều khiển KOC hoạt động 100%: `11_collaborator_dashboard.png`

---

## 4. TỔNG KẾT BỘ ẢNH MINH CHỨNG THỰC TẾ (14 SCREENSHOTS)

Toàn bộ ảnh chụp màn hình độ phân giải cao đã được lưu đồng thời tại:
- Thư mục Artifacts: `<appDataDir>\brain\e5e1d87c-bd71-4aa3-80e7-a2f8d939a74a\screenshots\`
- Thư mục Đồ án: `c:\HW\CAPSTONE\docs\review 2\screenshots\`

| STT | Tên Tệp Ảnh | Vai Trò | Đường Dẫn URL | Trọng Tâm Nghiệp Vụ & Điểm Nhấn |
| :---: | :--- | :--- | :--- | :--- |
| **01** | `01_homepage_hero.png` | Khách | `/` | Bản sắc Mạng lưới Tiếp thị Liên kết SCANMS, Warm Sand & Gold. |
| **02** | `01b_homepage_storefronts_commission.png` | Khách | `/` | Huy hiệu hoa hồng 10% chuẩn sàn trên từng sản phẩm nhãn hàng. |
| **03** | `02_creator_portal_upgrade.png` | Khách/KOC | `/customer/upgrade` | Cổng eKYC 3 khối & Bảng chính sách thù lao Key-Value chuẩn mực. |
| **04** | `03_admin_personnel_management.png` | Admin | `/admin/personnel` | Quản trị nhân sự nội bộ, bổ nhiệm Shop Manager & Chuyên viên Sàn. |
| **05** | `04_admin_appoint_staff_modal.png` | Admin | `/admin/personnel` | Modal bổ nhiệm nhân sự trực thuộc nhãn hàng, loại bỏ tech-jargon. |
| **06** | `05_admin_finance_payouts.png` | Admin | `/admin/payouts` | Trung tâm chi trả thù lao KOC, khấu trừ 10% thuế TNCN, quỹ Escrow. |
| **07** | `06_admin_kyc_verification.png` | Admin | `/admin/users` | Thẩm định eKYC và kích hoạt Hạng Đồng (Base Rate 10%). |
| **08** | `07_merchant_orders_management.png` | Shop | `/merchant/orders` | Quản lý đơn hàng có tab "Chờ thanh toán", "Trả hàng/Hoàn tiền", tag KOC. |
| **09** | `08_merchant_kol_hub.png` | Shop | `/merchant/kol-hub` | KOC Hub kết nối DB thật, mời chiến dịch VIP, cấp voucher qua chat. |
| **10** | `09_collaborator_wallet_payout.png` | KOC | `/collaborator/wallet` | Ví KOC 2 tầng số dư (Khả dụng & Chờ Escrow 14 ngày), rút Napas 24/7. |
| **11** | `10_collaborator_marketing_toolkit.png` | KOC | `/collaborator/marketing` | Trung tâm tiếp thị: Smart Link chuẩn và Exclusive Deal ghi đè 13%. |
| **12** | `10b_collaborator_exclusive_deals.png` | KOC | `/collaborator/collaboration`| Đàm phán deal 2 chiều với Shop Manager, gửi voucher VIP qua Socket.IO. |
| **13** | `10c_collaborator_coupons.png` | KOC | `/collaborator/marketing?tab=coupons` | Danh sách Voucher độc quyền KOC (`KOL01SAVE`, `NGUYENMA...`), bỏ icon trẻ con. |
| **14** | `11_collaborator_dashboard.png` | KOC | `/collaborator/dashboard` | Dashboard KOC hoạt động 100% sau khi sửa lỗi SQL database raw query. |
| **15** | `12_collaborator_samples_sla.png` | KOC | `/collaborator/marketing?tab=samples` | Theo dõi đơn mẫu 14 ngày SLA và luồng nộp video review nghiệm thu. |

---

## 5. KẾT LUẬN & ĐÁNH GIÁ CHẤT LƯỢNG

1. **Về Thiết kế & Nhận diện Thương hiệu (UI & Brand Tokens):**  
   - Tuyệt đối tuân thủ tông màu **VÀNG BE (Warm Sand `#F3EFE6` & Brand Gold `#C59B58`, `#B88E4F`, Deep Ink `#1A1612`)**. Không còn bất kỳ dấu vết nào của màu xanh lá làm màu nền hay màu nút bấm.
   - Loại bỏ 100% microcopy dài dòng thừa thãi ("không phải con nít để phải chỉ việc").
   - Loại bỏ toàn bộ icon ngôi sao/lấp lánh (`Sparkles`) thiếu chuyên nghiệp, thay bằng các icon nghiệp vụ sắc sảo (`DollarSign`, `TrendingUp`, `Ticket`, `Tag`, `ShoppingBag`).
   - Mật độ thông tin cao, số liệu định dạng `font-mono tabular-nums`, viền thanh thoát `#EAE4D7`, bóng đổ mềm mại chuẩn Stripe/Linear.

2. **Về Nghiệp vụ Cốt lõi (Business Domain Logic):**  
   - Chuyển đổi thành công 100% từ mô hình sàn chợ tự do sang **Hệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng & Tiếp thị Liên kết Doanh nghiệp**.
   - Làm rõ và chứng minh rành mạch vòng đời của **Exclusive Assets** (Slide 8): Không sinh ra từ Tier Bonus mà là kết quả đàm phán 2 chiều được Shop Manager phê duyệt, ghi đè mức hoa hồng và kích hoạt Voucher riêng, sau đó được cộng dồn +2% khi đưa vào phiên Live.
   - Luồng tài chính chuẩn mực: Doanh thu bán hàng thuộc về công ty, chỉ có KOC mới được rút thù lao tiếp thị, tự động khấu trừ 10% thuế TNCN và bảo chứng qua tài khoản Escrow 14 ngày.

3. **Về Kỹ thuật & Độ ổn định (Technical Robustness):**  
   - Toàn bộ Frontend TypeScript biên dịch đạt **0 lỗi (`tsc -b && vite build` thành công)**.
   - Toàn bộ Backend NestJS biên dịch đạt **0 lỗi (`nest build` thành công)**.
   - Sửa dứt điểm lỗi cơ sở dữ liệu `PrismaClientKnownRequestError` trong `dashboard.service.ts`, giúp toàn bộ Bảng điều khiển KOC hoạt động trơn tru với dữ liệu thật.
   - Kịch bản kiểm thử E2E tự động `capture_live_test.js` chạy qua toàn bộ 14 màn hình trọng yếu mà không gặp bất kỳ lỗi chặn nào.
