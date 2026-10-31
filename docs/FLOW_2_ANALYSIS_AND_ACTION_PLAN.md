# 🏛️ BÁO CÁO PHÂN TÍCH TOÀN DIỆN, KẾ HOẠCH HÀNH ĐỘNG & BIÊN BẢN LIVE TEST FLOW 2
## HỆ THỐNG QUẢN LÝ ĐỘI NGŨ CỘNG TÁC VIÊN & TIẾP THỊ LIÊN KẾT NỘI BỘ (SCANMS)

> **Tài liệu tham chiếu:** [`docs/SCANMS_MASTER_REFACTORING_PLAN.md`](file:///c:/HW/CAPSTONE/docs/SCANMS_MASTER_REFACTORING_PLAN.md) & [`docs/SCANMS_REALIGNMENT_BLUEPRINT.md`](file:///c:/HW/CAPSTONE/docs/SCANMS_REALIGNMENT_BLUEPRINT.md)  
> **Trạng thái thực thi:** **ĐÃ HOÀN THÀNH TRIỂN KHAI 100% & LIVE TEST ĐỘC LẬP THÀNH CÔNG TRÊN TRÌNH DUYỆT THẬT (PRODUCTION READY)**  
> **Người thực hiện:** Nhóm phát triển SCANMS (FA26SE032) · Phụ trách bảo vệ Flow 2: **Phan Xuân Thịnh** & **Nguyễn Thành Thắng (Leader)**

---

## PHẦN 1: ĐỐI CHIẾU 7 ĐIỂM CỐT LÕI VỚI BẢN SẮC MỚI CỦA HỆ THỐNG

Sau khi rà soát toàn bộ nội dung của hai tài liệu kiến trúc, 7 yêu cầu cốt lõi hoàn toàn trùng khớp với định hướng cải tổ đã được thống nhất với Giảng viên hướng dẫn ThS. Tôn Thất Hoàng Minh. Dưới đây là đối chiếu chi tiết từng điểm gắn liền với ranh giới của Flow 2:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                 MA TRẬN ĐỐI CHIẾU 7 CHỈ THỊ CỐT LÕI VỚI FLOW 2 TRONG HỆ THỐNG                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Shop không tự đăng ký (Admin cấp quyền nội bộ)    ──> Đã xong Flow 1; Store đã gắn Category   │
│ 2. Xóa 100% voucher rác TMĐT, chỉ giữ Coupon KOL     ──> Vũ khí Attribution định danh KOC        │
│ 3. Khóa Ngành Hàng (Category Lock) & Giá Sàn (MAP)  ──> Trọng tâm Bước 2.1 của Flow 2            │
│ 4. Cơ chế Đổi trả: Bù hàng 1-1 vs Clawback về 0đ     ──> Hiển thị tỷ lệ hoàn đơn & thù lao KOC   │
│ 5. Đổi tên thành "Thù Lao / Thu Nhập", tính Max(...) ──> Động cơ Best-Benefit Precedence Rule     │
│ 6. Phân hệ Livestream là tính năng phụ              ──> Giữ nguyên code, không đưa vào Flow 2    │
│ 7. Phân tách duyệt tiền SoD: Manager vs Admin        ──> Manager duyệt Payout; Admin duyệt Deal>16%│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Bản chất Cửa hàng & Quyền quản trị nội bộ
- **Bản chất:** SCANMS là hệ thống của một Doanh nghiệp bán lẻ đa nhãn hàng (House of Brands / D2C Multi-Storefront) sở hữu các nhãn hàng nội bộ:
  - 🏪 **Sora Skincare & Cosmetics** (Kho Mát GMP Thủ Đức — Mỹ phẩm)
  - 🏪 **Aura Activewear & Apparel** (Kho Tân Bình — Thời trang)
  - 🏪 **GreenBio Health & Nutrition** (Kho Tân Phú — Thực phẩm sức khỏe)
  - 🏪 **Lumière Smart Living** (Kho KCN Tân Bình — Gia dụng đồ bếp)
- **Ảnh hưởng đến Flow 2:** Vì Shop đã được cấu hình cố định 1 ngành hàng ngay từ Flow 1 bởi `SYSTEM_ADMIN`, nên khi `SHOP_MANAGER` tạo sản phẩm ở Bước 2.1 của Flow 2, hệ thống bắt buộc khóa cứng ô Danh mục (Category) theo ngành hàng độc quyền của Shop đó.

### 1.2. Tinh giản Voucher: Xóa sạch Voucher rác TMĐT, Duy trì Duy nhất Coupon Độc Quyền KOC
- **Định vị:** SCANMS không phải chợ Shopee/Lazada xả hàng giá rẻ.
- **Loại bỏ 100%:** Xóa sổ toàn bộ các khái niệm "Voucher freeship toàn sàn", "Voucher hoàn xu", "Mã giảm giá chớp nhoáng của sàn".
- **Duy nhất giữ lại "Coupon Độc Quyền Định Danh KOC" (KOL-Exclusive Attribution Coupon):**
  - **Cấu trúc chuẩn hóa:** `[TÊN_KOL][MỨC_GIẢM]` (Ví dụ: `THAONHI16`, `LANHUONG10`, `QUANGTRAN12`).
  - **Cơ chế & Thao tác UI:**
    - **Shop cấp / duyệt mã:** Tại giao diện đàm phán hợp đồng hoặc Trung tâm KOC, Shop đồng ý cấp mã riêng cho KOC (ví dụ giảm $10\%$ cho khách).
    - **KOC nhận mã:** Hiển thị nổi bật trên Marketing Toolkit của KOC kèm nút Copy 1-click để KOC gắn vào bio TikTok/YouTube.
    - **Khách nhập mã tại Giỏ hàng/Checkout:** Nhập `THAONHI16` $\rightarrow$ Khách được giảm giá $10\%$, đồng thời hệ thống bắt dấu vết Attribution $100\%$ doanh số đơn hàng cho KOC Thảo Nhi ngay cả khi khách dùng trình duyệt ẩn danh hoặc đổi thiết bị.

### 1.3. Khóa Ngành Hàng (Category Lock) & Quản Trị Giá Sàn (Floor Price / MAP)
- **Khóa Ngành Hàng:** Khi Shop Manager tạo sản phẩm mới, ô Danh mục tự động lấy từ `store.primaryCategory` và bị disabled. Backend ném lỗi `400 Bad Request` nếu cố tình gửi sai.
- **Giá Sàn Bảo Vệ Biên Lợi Nhuận (Floor Price / MAP):**
  - Không cho nhân viên tự gõ giảm giá tùy tiện lúc tạo sản phẩm (tránh bán phá giá hoặc bán dưới giá vốn làm thủng ngân sách công ty).
  - Khi tạo sản phẩm chỉ nhập Giá niêm yết chính thức (`price`) và Giá tham chiếu (`originalPrice`).
  - `floorPrice` là ngưỡng giá thấp nhất cho phép:
    $$\text{Floor Price} = \text{Giá vốn (COGS)} + \text{Chi phí đóng gói/vận hành} + \text{Trần thù lao KOC tối đa (16\%)} + \text{Lợi nhuận an toàn}$$
  - **Quy trình đề xuất giảm giá:** Shop Manager muốn Flash Sale phải tạo "Đề xuất Chiến dịch Giảm giá" (Promotion Campaign Request) gửi `SYSTEM_MANAGER` / `SYSTEM_ADMIN` duyệt Maker-Checker; cấm tuyệt đối giảm dưới `floorPrice`.

### 1.4. Đổi tên "Hoa Hồng" $\rightarrow$ "Thù Lao / Thu Nhập" & Quy tắc Ưu tiên (Best-Benefit Override)
- **Chuẩn hóa thuật ngữ B2B:**
  - **Trên giao diện KOC & Ví tiền:** Thu Nhập Đối Tác / Thu Nhập Tiếp Thị (Partner Earnings - chuẩn TikTok Creator Rewards).
  - **Trong hợp đồng Deal & Thuật toán:** Tỷ Lệ Thù Lao Đối Tác (Partner Remuneration Rate).
  - **Trong báo cáo quản trị:** Chính Sách Thù Lao & Đãi Ngộ Hiệu Suất (Remuneration & Performance Rewards).
- **Động cơ tính toán mới (Precedence Rule — Tuyệt đối KHÔNG cộng dồn):**
  $$\text{Tỷ Lệ Áp Dụng} = \max\Big(\text{Deal VIP } 16\%,\; \text{Chiến Dịch } 14\%,\; \text{Cấp Bậc Tier } 11-13\%,\; \text{Mức Cơ Sở } 10\%\Big) + \text{Thưởng Live } (+2\%)$$
  - KOC có Deal VIP $16\%$ thì nhận đúng $16\%$ (không cộng thêm Tier Bạc hay Base).
  - Mức trần toàn sàn cố định tối đa $25\%$.
  - Thưởng mốc doanh số tháng (FR-09) là khoản thưởng định kỳ độc lập (Kickback), quét vào 23:59:59 ngày cuối tháng, cộng thẳng một khoản tiền thưởng vào ví chứ không cộng % vào từng đơn hàng lẻ.

### 1.5. Cơ chế Đổi trả hàng / Hoàn tiền
- **Sai do GHN (Bể vỡ, móp hộp):** Khách gửi video unboxing $\rightarrow$ Shop xuất đơn Bù hàng mới 1-đổi-1 $\rightarrow$ **BẢO LƯU 100% THÙ LAO CHO KOC** vì doanh nghiệp bảo toàn được doanh số đơn hàng.
- **Sai do Shop / Khách hủy đơn hoàn tiền:** Thu hồi hàng về kho $\rightarrow$ Kích hoạt Clawback Engine thu hồi/hủy $100\%$ thù lao KOC về $0₫$ trong Escrow tạm giữ, tránh thất thoát ngân sách.

### 1.6. Livestream là Luồng phụ & Phân tách trách nhiệm duyệt tiền (SoD)
- **Livestream:** Giữ nguyên code Socket.IO/WebRTC làm tính năng giá trị gia tăng (Bonus Feature), không can thiệp, không đưa vào kịch bản demo chính để tránh loãng thời lượng.
- **Phân tách trách nhiệm (SoD):** `SYSTEM_MANAGER` (Kế toán vận hành) duyệt các lệnh chi trả Payout hằng ngày. Chỉ khi có Deal VIP vượt trần ($> 16\%$) hoặc Chiến dịch giảm giá dưới Floor Price mới leo thang lên Tổng Giám Đốc (`SYSTEM_ADMIN`) phê duyệt ngoại lệ ngân sách.

---

## PHẦN 2: ĐÁNH GIÁ ĐỘ HOÀN THIỆN CÁC TRANG FLOW 2 TRONG CODEBASE

Khảo sát mã nguồn thực tế tại các tệp liên quan đến Flow 2 cho thấy bức tranh hiện trạng sau khi tinh giản:

| Tệp Mã Nguồn | Chức năng phụ trách | Hiện trạng kỹ thuật | Đánh giá sau cải tiến |
| :--- | :--- | :--- | :--- |
| [`ProductManagementPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ProductManagementPage.tsx) | Shop tạo & quản lý SP 6 khối | Đã khóa cứng `disabled={Boolean(storeCategory)}`. Có Giá sàn MAP & Cột Thù lao 10%. | ✅ **Hoàn hảo:** Nút 1-click "🔍 Tìm KOC bằng AI" bay thẳng sang radar đối soát của sản phẩm đó. |
| [`ProductModerationPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/ProductModerationPage.tsx) | System Manager duyệt Maker-Checker | Gọn gàng (270 dòng), có nút "Duyệt" (APPROVED) và "Từ chối" (REJECTED). | ✅ **Chuẩn mực:** Đáp ứng đúng luồng kiểm tra EAN-13, nhãn hàng và pháp lý công bố. |
| [`KolRecommendationPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/KolRecommendationPage.tsx) | Động cơ AI Matchmaker 4 trục | Nhận param `?productId=...` tự động chọn sản phẩm, tính điểm 4 trục và sinh nhận xét AI. | ✅ **Trực quan:** Hiển thị Radar Breakdown, thẻ KOC có nút Mời hợp tác / Thương lượng Deal VIP. |
| [`ProductDetailPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/public/ProductDetailPage.tsx) | Chi tiết sản phẩm công khai | Bổ sung nút vàng đối tác "🤝 Đề Xuất Hợp Tác Tiếp Thị Với Nhãn Hàng". | ✅ **Mạch lạc:** KOC đang duyệt hàng trên sàn có thể bắt tay hợp tác ngay với 1 cú click. |
| [`ShopCouponsPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopCouponsPage.tsx) | Quản lý mã ưu đãi của Shop | Chuyển đổi thành Trang Quản lý Coupon Độc Quyền KOC (`THAONHI16`). | ✅ **Đúng định vị B2B:** Xóa sạch toàn bộ voucher freeship/hoàn xu rác của sàn TMĐT. |
| [`KolCouponsPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolCouponsPage.tsx) | KOC quản lý mã coupon cá nhân | Hiển thị mã độc quyền định danh cá nhân và Thu nhập tiếp thị dự kiến. | ✅ **Minh bạch:** KOC copy mã kèm tỷ lệ chiết khấu rõ ràng để gắn vào bio MXH. |

---

## PHẦN 3: GÓC NHÌN "END-USER KHÓ TÍNH" (UX/UI AUDIT & TỐI ƯU HÓA THAO TÁC)

Đặt cương vị là một Giám đốc Nhãn hàng (`SHOP_MANAGER`) hoặc một Nhà sáng tạo nội dung (`COLLABORATOR`) lần đầu sử dụng nền tảng:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   BẢNG CHẨN ĐOÁN TRẢI NGHIỆM NGƯỜI DÙNG (HEURISTIC UX AUDIT)                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ❌ NỖI ĐAU CŨ 1: "Tại sao tôi phải chạy qua 3 trang khác nhau để làm 1 việc?"                     │
│    • Người dùng xem sản phẩm ở Menu Sản phẩm -> Muốn tìm KOL cho sản phẩm đó phải sang Menu KOC  │
│      -> Vào tab AI Matching -> Lại phải tìm lại sản phẩm trong Dropdown!                          │
│    👉 ĐÃ GIẢI QUYẾT: Bổ sung NÚT 1-CLICK ngay tại dòng sản phẩm: "🔍 Tìm KOC bằng AI"             │
│                                                                                                  │
│ ❌ NỖI ĐAU CŨ 2: "Quá nhiều chữ mô tả như đang dạy việc cho con nít!"                             │
│    • Dưới ô "Tên sản phẩm" có dòng: "Nhập tên sản phẩm thật hay để thu hút khách hàng..."        │
│    • Dưới ô "Mã SKU" có dòng: "SKU là mã phân loại duy nhất của sản phẩm..."                     │
│    👉 ĐÃ GIẢI QUYẾT: Gỡ bỏ 100% các dòng chú thích thừa thãi. Label sắc sảo, ngắn gọn.           │
│                                                                                                  │
│ ❌ NỖI ĐAU CŨ 3: "KOC đang xem hàng trên sàn muốn hợp tác với Shop thì bấm vào đâu?"             │
│    • KOC lướt Marketplace thấy sản phẩm hay -> Không thấy nút "Đề xuất hợp tác với Shop"         │
│    👉 ĐÃ GIẢI QUYẾT: Tại trang chi tiết sản phẩm, thêm nút vàng nổi bật:                        │
│      "🤝 Đề Xuất Hợp Tác Tiếp Thị Với Nhãn Hàng" -> Mở trực tiếp khung Chat Socket.IO với Shop.  │
│                                                                                                  │
│ ❌ NỖI ĐAU CŨ 4: "Voucher rác làm rối loạn tâm trí người dùng doanh nghiệp"                      │
│    • Menu hiển thị: Voucher Shop, Voucher Sàn, Mã Freeship... giống hệt Shopee giá rẻ.          │
│    👉 ĐÃ GIẢI QUYẾT: Xóa sạch các tab rác. Chỉ để 1 mục: "Coupon Độc Quyền Định Danh KOC".      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 4: KỊCH BẢN THỰC CHIẾN FLOW 2 CHUẨN DEMO HỘI ĐỒNG

```mermaid
sequenceDiagram
    autonumber
    actor SM as SHOP_MANAGER (Giám đốc Nhãn Hàng)
    actor SYS as SYSTEM_MANAGER (Pháp Chế Sàn)
    actor AI as AI Radar Matchmaker
    actor KOC as COLLABORATOR (KOC Tiếp Thị)

    Note over SM,SYS: Bước 2.1: Nhập Sản Phẩm Khóa Ngành Hàng & Quản Trị Giá Sàn MAP
    SM->>SM: Tạo SP mới (Ngành hàng tự động KHÓA THEO STORE, Kiểm soát Floor Price)
    SM->>SYS: Gửi hồ sơ SP (Chờ duyệt)
    SYS->>SYS: Thẩm định Barcode EAN-13, Công bố y tế & Giá sàn MAP (/admin/product-moderation)
    SYS-->>SM: Phê duyệt ACTIVE lên sàn

    Note over SM,AI: Bước 2.2: 1-Click AI Matchmaker 4 Trục Tìm Top KOC Phù Hợp
    SM->>SM: Tại danh sách SP, bấm "🔍 Tìm KOC bằng AI" (1-click)
    SM->>AI: Truy vấn Top KOC theo 4 trục (Category 35%, CR 25%, Followers 20%, Price 20%)
    AI-->>SM: Trả về Radar Chart, điểm % Tương thích (94% Siêu Phù Hợp) & Lý giải AI
    SM->>KOC: Bấm "Mời hợp tác chiến dịch" -> Bắn Thẻ mời VIP vào Chat Socket.IO

    Note over KOC,SM: Bước 2.3: Chiều KOC Chủ Động & Khai Thác Media Hub
    KOC->>KOC: Lướt Marketplace, bấm "🤝 Đề Xuất Hợp Tác Tiếp Thị" tại trang chi tiết SP
    KOC->>SM: Gửi Proposal chia sẻ thù lao qua Chat Socket.IO
    KOC->>KOC: Vào Quản lý Coupon nhận mã độc quyền (THAONHI16) và tải Media Hub (FR-08)
```

---

## PHẦN 5: BẢNG KẾ HOẠCH HÀNH ĐỘNG FLOW 2 (MASTER ACTION PLAN - 100% HOÀN THÀNH)

- [x] **Giai đoạn 1: Chuẩn Hóa Quản Lý Sản Phẩm & Giá Sàn MAP (`ProductManagementPage.tsx`)**
  - [x] Dọn dẹp text mô tả rườm rà dưới các ô input.
  - [x] Khóa cứng ô Danh mục (Category Lock) theo `storeCategory`.
  - [x] Hiển thị Giá sàn bảo vệ (`floorPrice` / MAP) và cột Thù lao cơ sở 10%.
  - [x] Nút 1-click **"🔍 Tìm KOC bằng AI"** chuyển thẳng sang radar đối soát của sản phẩm đó.
- [x] **Giai đoạn 2: Tối Ưu Hóa Giao Diện Động Cơ AI Matchmaker (`KolRecommendationPage.tsx`)**
  - [x] Tự động chọn sản phẩm từ tham số URL `?productId=...`.
  - [x] Hiển thị Radar 4 trục (Ngành hàng 35%, CR% 25%, Followers 20%, Phù hợp giá 20%).
  - [x] Hiển thị thẻ Top Pick với điểm % Tương thích và lời giải thích Explainable AI tự nhiên.
  - [x] Nút hành động trực tiếp: "Mời hợp tác chiến dịch" & "Thương lượng Deal VIP".
- [x] **Giai đoạn 3: Chiều KOC Chủ Động Hợp Tác (`ProductDetailPage.tsx`)**
  - [x] Nút vàng đối tác nổi bật **"🤝 Đề Xuất Hợp Tác Tiếp Thị Với Nhãn Hàng"** cho KOC đang đăng nhập.
  - [x] Tích hợp mở cuộc hội thoại đàm phán với Giám đốc Nhãn hàng.
- [x] **Giai đoạn 4: Tinh Giản Voucher Thành "Coupon Độc Quyền KOC" (`ShopCouponsPage.tsx` & `KolCouponsPage.tsx`)**
  - [x] Loại bỏ 100% voucher rác Shopee (Freeship toàn sàn, voucher hoàn xu).
  - [x] Chuẩn hóa bảng mã ưu đãi định danh KOC (`THAONHI16`, `LANHUONG10`).
  - [x] Hiển thị rõ mức giảm cho khách và Tỷ lệ thù lao KOC nhận được.
- [x] **Giai đoạn 5: Đồng Bộ Thuật Ngữ Doanh Nghiệp Toàn Diện**
  - [x] Thay thế "Hoa hồng sàn" $\rightarrow$ "Thù lao cơ sở 10%", "Thu nhập đối tác tiếp thị".
  - [x] Áp dụng Quy tắc Mức ưu đãi tốt nhất (Best-Benefit Precedence Rule, không cộng dồn).

---

## PHẦN 6: BÁO CÁO LIVE TEST THỰC NGHIỆM CHI TIẾT (7 BƯỚC END-TO-END VERIFIED)

> **Môi trường thử nghiệm:** Microsoft Edge (Headless/Real Puppeteer) · **Backend:** NestJS Port 3000 · **Frontend:** Vite React Port 5173  
> **Cơ sở dữ liệu:** PostgreSQL Supabase Production-grade schema.

---

### 📸 Bước 1: Shop Manager Quản Lý Sản Phẩm & Nút 1-Click AI Matchmaker
- **Vai trò:** Giám đốc Nhãn hàng Sora Skincare (`manager.sora@scanms.vn`).
- **Thao tác:** Đăng nhập vào hệ thống $\rightarrow$ Truy cập menu **Sản phẩm** (`/merchant/products`).
- **Chi tiết kiểm chứng:**
  - Bảng danh sách sản phẩm hiển thị gọn gàng, typography chuẩn mực.
  - Cột **"Thù lao cơ sở"** ghi nhận cố định **10%** chuẩn hệ thống.
  - Mỗi dòng sản phẩm có nút hành động nhanh màu vàng: **"🔍 Tìm KOC bằng AI"**.
- **Ảnh minh họa thực tế:**

![Bước 1: Danh sách Sản phẩm & Nút 1-Click AI](images/flow2/step1_product_management.png)

---

### 📸 Bước 2: Modal Tạo Sản Phẩm với Khóa Ngành Hàng (Category Lock) & Giá Sàn MAP
- **Vai trò:** Giám đốc Nhãn hàng Sora Skincare.
- **Thao tác:** Bấm nút **"Thêm sản phẩm mới"** tại góc phải trên cùng.
- **Chi tiết kiểm chứng:**
  - Ô **Ngành hàng (Category)** tự động điền `Mỹ phẩm & Chăm sóc da` và **BỊ KHÓA CỨNG (Disabled / Readonly)**, ngăn chặn nhân viên đăng sai ngành.
  - Ô **Giá Sàn Bảo Vệ (MAP - Floor Price)** hiển thị ngưỡng an toàn tài chính tham chiếu, bảo vệ biên lợi nhuận công ty.
  - Loại bỏ hoàn toàn các dòng chú thích rườm rà.
- **Ảnh minh họa thực tế:**

![Bước 2: Modal Tạo Sản Phẩm với Category Lock & Giá Sàn MAP](images/flow2/step2_modal_category_lock.png)

---

### 📸 Bước 3: Động Cơ AI Matchmaker 4 Trục với Biểu Đồ Radar & Lời Giải Thích AI
- **Vai trò:** Giám đốc Nhãn hàng Sora Skincare.
- **Thao tác:** Bấm nút **"🔍 Tìm KOC bằng AI"** tại dòng sản phẩm *"Serum Dưỡng Trắng Mờ Thâm Vitamin C 15%"*.
- **Chi tiết kiểm chứng:**
  - Hệ thống tự động chuyển sang URL `/merchant/kol-recommendations?productId=ddc59e43-5dc1-44f0-a482-a7ded7b5155e` mà không cần người dùng chọn lại sản phẩm.
  - Thuật toán AI Radar quét 4 trục và xếp hạng KOC **Vũ Thanh Huyền** đạt **94% - Siêu Phù Hợp (Top Pick)**.
  - Hiển thị đầy đủ **Điểm mạnh cốt lõi (Key Strengths)** và **Lời giải thích Explainable AI tự nhiên**.
  - Có sẵn 2 nút hành động: **"Mời hợp tác chiến dịch"** và **"Thương lượng Deal VIP"**.
- **Ảnh minh họa thực tế:**

![Bước 3: Động Cơ AI Matchmaker 4 Trục](images/flow2/step3_ai_matchmaker_radar.png)

---

### 📸 Bước 4: Quản Lý Coupon Độc Quyền Định Danh KOC (`THAONHI16`)
- **Vai trò:** Giám đốc Nhãn hàng Sora Skincare.
- **Thao tác:** Điều hướng sang tab **Mã ưu đãi** (`/merchant/promotions?tab=coupons`).
- **Chi tiết kiểm chứng:**
  - Toàn bộ voucher freeship, voucher hoàn xu rác của sàn TMĐT đã bị xóa sổ.
  - Chỉ duy trì danh sách **Coupon Độc Quyền Định Danh KOC** (cấu trúc `[TÊN_KOC][MỨC_GIẢM]` như `THAONHI16`, `LANHUONG10`).
  - Thể hiện rõ: Tên KOC được cấp quyền, Mức giảm cho khách hàng ($10\%$) và Tỷ lệ thù lao tiếp thị tương ứng ($16\%$).
- **Ảnh minh họa thực tế:**

![Bước 4: Quản Lý Coupon Độc Quyền KOC](images/flow2/step4_shop_coupons_attribution.png)

---

### 📸 Bước 5: KOC Xem Chi Tiết Sản Phẩm & Nút Đề Xuất Hợp Tác Tiếp Thị
- **Vai trò:** Nhà sáng tạo nội dung KOC Vũ Thanh Huyền (`kol.silver@scanms.vn`).
- **Thao tác:** Lướt xem Marketplace $\rightarrow$ Bấm xem chi tiết *"Serum Dưỡng Trắng Mờ Thâm Vitamin C 15%"*.
- **Chi tiết kiểm chứng:**
  - Bên cạnh nút *"Thêm vào giỏ"* của khách mua hàng, KOC được cung cấp nút đối tác độc quyền: **"🤝 Đề Xuất Hợp Tác Tiếp Thị Với Nhãn Hàng"**.
  - Bấm nút cho phép KOC gửi ngay đề xuất hợp tác trực tiếp đến Giám đốc Nhãn hàng mà không phải tìm kiếm thủ công.
- **Ảnh minh họa thực tế:**

![Bước 5: KOC Xem Chi Tiết Sản Phẩm & Nút Đề Xuất Hợp Tác](images/flow2/step5_koc_product_detail_proposal.png)

---

### 📸 Bước 6: KOC Quản Lý Mã Ưu Đãi Cá Nhân & Thu Nhập Tiếp Thị Dự Kiến
- **Vai trò:** Nhà sáng tạo nội dung KOC Vũ Thanh Huyền.
- **Thao tác:** Truy cập menu cá nhân **Mã ưu đãi của bạn** (`/collaborator/coupons`).
- **Chi tiết kiểm chứng:**
  - Hiển thị danh sách Coupon định danh cá nhân đang hoạt động.
  - Cột **"Thu nhập tiếp thị dự kiến"** thể hiện rõ thù lao đối tác nhận được trên mỗi đơn hàng thành công qua mã.
  - Nút **"Sao chép mã"** 1-click để KOC dễ dàng dán vào bài viết review trên TikTok/Instagram.
- **Ảnh minh họa thực tế:**

![Bước 6: KOC Quản Lý Coupon Cá Nhân & Thu Nhập Tiếp Thị](images/flow2/step6_koc_my_coupons.png)

---

### 📸 Bước 7: System Manager Kiểm Duyệt Sản Phẩm Mới (Maker-Checker)
- **Vai trò:** Chuyên viên Vận hành Sàn Lê Thu Trang (`manager@scanms.vn`).
- **Thao tác:** Đăng nhập System Manager $\rightarrow$ Vào trang **Kiểm duyệt sản phẩm** (`/admin/product-moderation`).
- **Chi tiết kiểm chứng:**
  - Danh sách sản phẩm chờ duyệt hiển thị rõ hình ảnh, SKU, nhãn hàng và ngày gửi.
  - Chuyên viên có thể bấm **"Xem hồ sơ"** để đối soát giấy công bố y tế, mã vạch EAN-13 và Giá sàn MAP trước khi bấm **"Phê duyệt"** (APPROVED) đưa sản phẩm lên sàn.
- **Ảnh minh họa thực tế:**

![Bước 7: System Manager Kiểm Duyệt Sản Phẩm](images/flow2/step7_system_product_moderation.png)

---

## PHẦN 7: ĐÁNH GIÁ TRẢI NGHIỆM DƯỚI GÓC NHÌN "END-USER MỚI LẦN ĐẦU SỬ DỤNG"

Sau khi hóa thân vào cả 3 vai trò (Shop Manager, KOC, System Manager), nhóm ghi nhận kết quả đánh giá thực tế:

### 1. Về Tính Thuận Tiện & Liền Mạch (Seamless 1-Click Affordance)
- **Trước cải tiến:** Người dùng phải nhớ các menu phân mảnh (`/merchant/products` $\rightarrow$ `/merchant/kol-hub` $\rightarrow$ Chọn tab AI Matching $\rightarrow$ Tìm lại sản phẩm trong danh sách 50 món).
- **Sau cải tiến:** **1 Cú Click Duy Nhất.** Tại dòng sản phẩm, bấm nút vàng *"🔍 Tìm KOC bằng AI"*, hệ thống lập tức mở màn hình Radar và phân tích đúng KOC cho sản phẩm đó. Người dùng lần đầu hoàn toàn không cần học cách sử dụng.

### 2. Về Ngôn Ngữ & Độ Tinh Gọn Giao Diện (No Clutter / Enterprise B2B Tone)
- Toàn bộ các câu chú thích kiểu "dạy việc con nít" đã được xóa sạch.
- Các ô nhập liệu có nhãn ngắn gọn, súc tích, phân cấp thị giác rõ ràng với tông màu chủ đạo **Vàng Be (Warm Sand `#FAF8F5`, `#F3EFE6`, `#C59B58`)**.
- Không còn bất kỳ sự nhầm lẫn nào giữa một sàn chợ TMĐT giá rẻ và một Nền tảng Tiếp thị Doanh nghiệp chuyên nghiệp.

### 3. Về Khả Năng Thực Hiện Full Flow
- **Từ Nhãn Hàng $\rightarrow$ KOC:** Shop tạo sản phẩm (khóa ngành) $\rightarrow$ Duyệt sản phẩm $\rightarrow$ Quét AI tìm KOC $\rightarrow$ Mời hợp tác chiến dịch.
- **Từ KOC $\rightarrow$ Nhãn Hàng:** KOC xem sản phẩm $\rightarrow$ Bấm nút đề xuất hợp tác tiếp thị $\rightarrow$ Lấy Coupon độc quyền cá nhân đi quảng bá.
- Toàn bộ chu trình vận hành khép kín $100\%$, không bị đứt gãy ở bất kỳ mắt xích nào.

---

## PHẦN 8: KẾT LUẬN & SẴN SÀNG BẢO VỆ REVIEW 2 HỘI ĐỒNG

- **Tiêu chuẩn mã nguồn:** `tsc -b` và `vite build` đạt **0 lỗi**, 133 test suites backend đều **PASS XANH**.
- **Tính liêm chính dữ liệu:** Khóa ngành hàng 3 tầng kiểm soát, Quản trị giá sàn bảo vệ MAP, Xóa sạch voucher rác, Chuẩn hóa cơ chế thù lao đối tác Best-Benefit Precedence.
- **Flow 2 đã hoàn thành trọn vẹn $100\%$**, sẵn sàng thực chiến trình chiếu và bảo vệ trước Hội đồng chấm thi tốt nghiệp!
