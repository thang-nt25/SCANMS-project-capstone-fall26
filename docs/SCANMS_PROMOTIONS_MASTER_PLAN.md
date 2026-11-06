# 🏛️ KẾ HOẠCH TỔNG THỂ TÁI CẤU TRÚC PHÂN HỆ KHUYẾN MÃI, CHIẾN DỊCH & ĐỊNH GIÁ SẢN PHẨM
## (SCANMS PROMOTIONS, CAMPAIGNS & PRICING MASTER ARCHITECTURE PLAN)

> **Mã dự án:** FA26SE032 | **Học kỳ:** Fall 2026 / Spring 2026 | **Đơn vị:** Đại học FPT TP.HCM  
> **Trưởng nhóm:** Nguyễn Thành Thắng (Lead Architect & Fullstack Engineer)  
> **Tài liệu tham chiếu:** `docs/SCANMS_MASTER_REFACTORING_PLAN.md`, `docs/SCANMS_REALIGNMENT_BLUEPRINT.md`  
> **Bộ quy chuẩn thiết kế:** `.agents` Design System Memory (`better-ui`, `better-colors`, `better-layout`, `better-typography`, `frontend-design`, `kol-merchant-governance`)  
> **Trạng thái:** **BẢN KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT (ACTIONABLE MASTER PLAN) — LƯU TÀI LIỆU, CHƯA TRIỂN KHAI CODE**.

---

## MỤC LỤC CHI TIẾT

1. [Phần 1: Bối Cảnh & Động Lực Tái Cấu Trúc Toàn Diện](#phần-1-bối-cảnh--động-lực-tái-cấu-trúc-toàn-diện)
2. [Phần 2: Mổ Xẻ 4 Nút Thắt Cốt Lõi Của Hệ Thống Hiện Tại](#phần-2-mổ-xẻ-4-nút-thắt-cốt-lõi-của-hệ-thống-hiện-tại)
   * 2.1. Lỗ Hổng Database: Cột `floor_price` Bị `NULL` & Nghịch Lý Deadlock $\text{Floor Price} = \text{List Price}$
   * 2.2. Điểm Nghẽn Thao Tác: Bắt Giảm Giá Từng Phân Loại Lẻ Tẻ (Thiếu Batch/Bulk Promotions)
   * 2.3. Sự Nhầm Lẫn Giữa "Chiến Dịch Giảm Giá Hàng Hóa" vs "Chiến Dịch Seeding Thưởng KOC"
   * 2.4. Sự Hỗn Loạn Của Menu Sidebar & 6 Tabs Rời Rạc, Trùng Lặp Chức Năng
3. [Phần 3: Bảng Kiểm Toán Đa Chiều 6 Tabs Hiện Tại (Audit & Verdict Matrix)](#phần-3-bảng-kiểm-toán-đa-chiều-6-tabs-hiện-tại-audit--verdict-matrix)
4. [Phần 4: Đối Chiếu Chuẩn Mực MarTech Quốc Tế (Benchmark Analysis)](#phần-4-đối-chiếu-chuẩn-mực-martech-quốc-tế-benchmark-analysis)
5. [Phần 5: Kiến Trúc Mới Tinh Gọn (The 2-Pillar Promotions Architecture)](#phần-5-kiến-trúc-mới-tinh-gọn-the-2-pillar-promotions-architecture)
   * 5.1. Chuẩn Hóa Menu Điều Hướng Sidebar
   * 5.2. Tab 1: Chương Trình Giảm Giá Sản Phẩm (Product Pricing & Price Drops)
   * 5.3. Tab 2: Chính Sách Đãi Ngộ & Mã Ưu Đãi KOC (Creator Incentives & Attribution Coupons)
   * 5.4. Quy Chuẩn Giao Diện B2B SaaS Tinh Gọn Theo Bộ Kỹ Năng `.agents`
6. [Phần 6: Lộ Trình 4 Giai Đoạn Triển Khai Chi Tiết (4-Phase Implementation Roadmap)](#phần-6-lộ-trình-4-giai-đoạn-triển-khai-chi-tiết-4-phase-implementation-roadmap)
7. [Phần 7: Bảng Đối Chiếu Trước & Sau Khi Triển Khai (Before vs After)](#phần-7-bảng-đối-chiếu-trước--sau-khi-triển-khai-before-vs-after)

---

## PHẦN 1: BỐI CẢNH & ĐỘNG LỰC TÁI CẤU TRÚC TOÀN DIỆN

Trong quá trình vận hành thử nghiệm thực tế hệ thống **SCANMS**, qua góc nhìn của người dùng cuối (End-User — Giám đốc Nhãn hàng `SHOP_MANAGER`), phân hệ quản trị Khuyến mại & Chiến dịch bộc lộ các vấn đề nghiêm trọng:
1. **Phân mảnh tư duy quản trị:** Một quy trình định giá và kích cầu hàng hóa bị xé nhỏ ra nhiều nơi: Quản lý sản phẩm ở `/merchant/products`, ngắm giá ở `/merchant/pricing`, tạo voucher ở `/merchant/promotions?tab=coupons`, mời KOC ở `/merchant/promotions?tab=campaigns`, rồi lại đàm phán deal ở `/merchant/promotions?tab=exclusive-deals`.
2. **Trùng lặp menu và chức năng:** Tab *Thỏa thuận độc quyền* xuất hiện ở cả `Mạng lưới KOL` lẫn `Chiến dịch nhãn hàng`. Tab *Link tiếp thị* xuất hiện vô nghĩa với chủ shop.
3. **Tồn dư "Voucher rác TMĐT":** Vẫn còn form tạo Voucher freeship, Voucher toàn shop kiểu chợ Shopee/Lazada, vi phạm trực tiếp định hướng Doanh nghiệp In-House D2C và gây nguy cơ cộng dồn âm tiền đơn hàng.
4. **Nghịch lý dữ liệu Giá sàn MAP:** Dữ liệu cũ trong database chưa được cập nhật giá sàn bảo vệ biên lãi (`floor_price` bị `NULL`), hoặc bị gán bằng $100\%$ giá niêm yết khiến tính năng giảm giá bị khóa cứng.
5. **Giao diện rườm rà, thiếu chuyên nghiệp:** Quá nhiều văn bản giải thích "cầm tay chỉ việc", icon hoạt hình lộn xộn, mang nặng cảm giác sản phẩm được sinh tự động bởi AI thiếu chiều sâu thiết kế.

Kế hoạch này vạch ra giải pháp tổng thể nhằm **tái cấu trúc triệt để từ Database, Backend API đến Frontend UI/UX**, đưa phân hệ về đúng chuẩn **B2B SaaS Enterprise MarTech**.

---

## PHẦN 2: MỔ XẺ 4 NÚT THẮT CỐT LÕI CỦA HỆ THỐNG HIỆN TẠI

### 2.1. Lỗ Hổng Database: Cột `floor_price` Bị `NULL` & Nghịch Lý Deadlock $\text{Floor Price} = \text{List Price}$

#### Hiện trạng dữ liệu thực tế:
Kiểm tra trực tiếp database PostgreSQL (`SELECT id, title, price, list_price, original_price, floor_price FROM products`):
* **13/14 sản phẩm cũ:** `floor_price` mang giá trị `NULL`.
  * *Hệ quả:* Giao diện hiển thị nhãn `Chưa đặt sàn MAP`. Người dùng cảm thấy hệ thống thiếu hoàn thiện, thiếu nhất quán.
* **1 sản phẩm cá biệt (`Kem dưỡng giảm mụn La Roche-Posay Effaclar Duo+`):**
  * `price` = `list_price` = $500.000\text{ ₫}$
  * `floor_price` = $500.000\text{ ₫}$

#### Nghịch lý toán học dẫn đến ngõ cụt logic (Deadlock):
Theo quy tắc nghiệp vụ bất biến:
$$\text{Floor Price (Giá sàn MAP)} \le \text{Proposed Price (Giá đề xuất giảm)} < \text{List Price (Giá niêm yết)}$$

Khi dữ liệu gán $\text{Floor Price} = \text{List Price} = 500.000\text{ ₫}$:
* Nếu Shop Manager đề xuất giá $480.000\text{ ₫}$: Backend chặn đứng bằng lỗi `400 Bad Request` (*"Giá đề xuất không được thấp hơn giá sàn MAP 500.000 ₫"*).
* Nếu Shop Manager đề xuất giá $500.000\text{ ₫}$: Backend chặn đứng vì *"Giá đề xuất phải thấp hơn giá niêm yết ban đầu"*.
* **Kết luận:** Khoảng giá giảm hợp lệ $[500.000, 500.000)$ là **tập hợp rỗng**. Người dùng bị kẹt hoàn toàn, không thể giảm giá sản phẩm.

#### Chuẩn mực công thức tính Giá sàn MAP trong MarTech Doanh nghiệp:
Trong mô hình D2C House of Brands, Giá sàn MAP bảo vệ dòng tiền doanh nghiệp:
$$\text{Floor Price (MAP)} = \text{Giá vốn (COGS)} + \text{Chi phí vận hành kho} + \text{Trần hoa hồng KOC (16\%)} + \text{Biên lãi ròng tối thiểu}$$
Thông thường, Giá sàn MAP dao động trong khoảng **$65\% - 75\%$ Giá niêm yết**.
* *Ví dụ chuẩn:* Sản phẩm niêm yết $500.000\text{ ₫}$ $\rightarrow$ Giá sàn MAP hợp lý là $350.000\text{ ₫}$ ($70\%$). Khi đó, Shop Manager có khoảng an toàn linh hoạt từ $350.000\text{ ₫}$ đến $490.000\text{ ₫}$ để tạo chiến dịch Flash Sale mà không bao giờ bán lỗ.

---

### 2.2. Điểm Nghẽn Thao Tác: Bắt Giảm Giá Từng Phân Loại Lẻ Tẻ (Thiếu Batch/Bulk Promotions)

#### Hạn chế kiến trúc hiện tại:
* Bảng `product_price_promotions` trong `schema.prisma` và `pricing.service.ts` chỉ nhận payload của **1 sản phẩm đơn lẻ** (`productId`) hoặc **1 biến thể** (`variantId`).
* Giao diện modal chỉ cho phép chọn 1 sản phẩm tại một thời điểm.

#### Trải nghiệm người dùng cực đoan (Severe UX Friction):
* Khi một nhãn hàng muốn chạy chương trình "Đồng giá $199.000\text{ ₫}$" hoặc "Giảm $15\%$ toàn bộ dòng sản phẩm mùa hè" (gồm 10 sản phẩm), Shop Manager phải:
  1. Bấm nút giảm giá sản phẩm 1 $\rightarrow$ Nhập giá $\rightarrow$ Nhập ngày $\rightarrow$ Gõ lý do $\rightarrow$ Gửi.
  2. Lặp lại toàn bộ các bước trên thêm **9 lần nữa** cho 9 sản phẩm còn lại!
* Thao tác lặp đơn điệu này gây ức chế cao độ cho người dùng và không đáp ứng được yêu cầu của một phần mềm quản trị bán hàng hiện đại.

---

### 2.3. Sự Nhầm Lẫn Giữa "Chiến Dịch Giảm Giá Hàng Hóa" vs "Chiến Dịch Seeding Thưởng KOC"

Hệ thống đang tồn tại sự mâu thuẫn lớn giữa tư duy của người dùng và logic lập trình:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      SỰ KHÁC BIỆT BẢN CHẤT GIỮA 2 LOẠI HÌNH CHIẾN DỊCH                 │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ CHIẾN DỊCH GIẢM GIÁ SẢN PHẨM (PRICE)   │ CHIẾN DỊCH TIẾP THỊ KOC (CREATOR SEEDING)     │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Đối tượng: Khách hàng mua lẻ trên sàn│ • Đối tượng: Đội ngũ KOL/KOC trong mạng lưới  │
│ • Mục tiêu: Giảm giá niêm yết sản phẩm │ • Mục tiêu: Kích thích KOC sáng tạo video/live│
│ • Cơ chế: Flash Sale, Giảm giá theo %  │ • Cơ chế: Thưởng thêm +1% - +2% hoa hồng      │
│ • Ràng buộc: Tuân thủ Giá sàn MAP      │ • Trách nhiệm: Cam kết trả video review 14 ngày│
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

* **Thực trạng code:** Bảng `campaigns` trong DB thực chất là "Chiến dịch thưởng hoa hồng KOC", nhưng giao diện `CreateCampaignModal.tsx` lại không cho chọn sản phẩm cụ thể. Khi tạo chiến dịch, hệ thống tự động thưởng thêm hoa hồng cho toàn bộ mặt hàng trong shop.
* **Hậu quả:** Người dùng vào tab "Chiến dịch" với mong muốn giảm giá sản phẩm hàng loạt thì không thấy chỗ giảm giá; còn vào tab "Giảm giá sản phẩm" thì lại chỉ cho giảm từng cái một.

---

### 2.4. Sự Hỗn Loạn Của Menu Sidebar & 6 Tabs Rời Rạc, Trùng Lặp Chức Năng

Thanh tab hiện tại gồm 6 mục:  
`[Giảm giá sản phẩm] | [Mã giảm giá] | [Chiến dịch] | [Thỏa thuận độc quyền] | [Thưởng mốc doanh số] | [Link tiếp thị]`

1. **Tên Sidebar `Chiến dịch nhãn hàng`:** Quá hẹp và sai lệch bản chất, không bao quát được kho mã ưu đãi hay chính sách thưởng mốc.
2. **Tab `Mã giảm giá` chứa đầy Voucher rác TMĐT:** Form tạo voucher shop, voucher freeship, voucher trợ cấp sàn kiểu Shopee vẫn còn nguyên trong `ShopCouponsPage.tsx`. Điều này đi ngược lại hoàn toàn với nguyên tắc chỉ dùng **Coupon Định Danh KOC (`THAONHI16`)**.
3. **Tab `Thỏa thuận độc quyền` bị nhân bản vô lý:** Chức năng này đã có mặt đầy đủ tại `/merchant/kol-hub?tab=deals` kèm hệ thống Chat đàm phán Socket.IO. Đặt thêm 1 tab tại đây khiến người dùng bối rối không biết phải vào đâu để duyệt deal.
4. **Tab `Link tiếp thị` thừa thãi:** Chủ shop không cần xem một danh sách link tiếp thị tổng hợp. Nút tạo link đã có sẵn trên từng dòng sản phẩm tại trang danh mục hàng hóa.

---

## PHẦN 3: BẢNG KIỂM TOÁN ĐA CHIỀU 6 TABS HIỆN TẠI (AUDIT & VERDICT MATRIX)

| STT | Tab Hiện Tại | Chức Năng Thực Tế | Đánh Giá Tác Vụ | Phán Quyết (Verdict) | Hướng Xử Lý Triệt Để |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Giảm giá sản phẩm** | Đề xuất giá sau giảm cho sản phẩm lẻ, kiểm tra Giá sàn MAP, quy trình Maker-Checker. | Cốt lõi của quản trị giá, nhưng thiếu khả năng giảm giá hàng loạt (Bulk). | **GIỮ LẠI & NÂNG CẤP MẠNH** | Trở thành **Tab 1: Giảm giá sản phẩm**. Bổ sung chế độ Đề xuất giảm giá hàng loạt cho nhiều sản phẩm cùng lúc. |
| **2** | **Mã giảm giá** | Chứa form tạo Voucher shop, voucher freeship, trợ cấp sàn kiểu Shopee rác. | Sai lệch bản chất doanh nghiệp, gây rủi ro cộng dồn voucher làm âm tiền. | **TÁI CẤU TRÚC TRIỆT ĐỂ** | Xóa sạch form tạo voucher rác. Đổi tên thành **Mã ưu đãi KOC (Attribution Coupons)**: Chỉ quản lý và cấp mã gắn với KOC (`THAONHI16`). |
| **3** | **Chiến dịch** | Tạo đợt thi đua KOC, thưởng thêm $+1\% - +2\%$ hoa hồng cho KOC tham gia. | Bản chất là kích cầu đội ngũ KOC, không phải giảm giá sản phẩm. | **HỢP NHẤT (MERGE)** | Đưa vào **Tab 2** dưới dạng khối tính năng "Chiến dịch Seeding KOC", liên kết chặt chẽ với ngân sách thưởng. |
| **4** | **Thỏa thuận độc quyền** | Hộp thư xem các đề xuất hoa hồng VIP giữa Shop và KOC ($\le 16\%$). | Trùng lặp $100\%$ với menu `Mạng lưới KOL` (`ShopKolHubPage.tsx`). | **LOẠI BỎ KHỎI HUB NÀY** | Gom dứt điểm về 1 nơi duy nhất tại `/merchant/kol-hub?tab=deals` để tránh phân mảnh trải nghiệm. |
| **5** | **Thưởng mốc doanh số** | Cấu hình thang thưởng lũy tiến theo doanh số tháng của KOC (Chức năng FR-09). | Bản chất là chính sách đãi ngộ KOC định kỳ cuối tháng. | **HỢP NHẤT (MERGE)** | Đưa vào **Tab 2** dưới dạng khối tính năng "Chính sách Thưởng mốc Doanh số (FR-09)". |
| **6** | **Link tiếp thị** | Hiển thị bảng danh sách các link tiếp thị / dynamic QR của shop. | Thừa thãi với Shop Manager; đã có sẵn nút thao tác trên từng dòng của trang Sản phẩm. | **LOẠI BỎ KHỎI HUB NÀY** | Xóa bỏ tab độc lập này. Thao tác lấy link nhanh được duy trì tại trang danh mục sản phẩm `/merchant/products`. |

---

## PHẦN 4: ĐỐI CHIẾU CHUẨN MỰC MARTECH QUỐC TẾ (BENCHMARK ANALYSIS)

SCANMS được định vị tương đương các nền tảng tự động hóa tiếp thị liên kết hàng đầu thế giới (UpPromote, Impact.com, Refersion):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                          BẢNG ĐỐI CHIẾU QUẢN TRỊ MARTECH CHUẨN QUỐC TẾ                         │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────────────┤
│ TIÊU CHÍ NGHIỆP VỤ       │ SÀN CHỢ TMĐT (SHOPEE MỞ)    │ SCANMS & UPPROMOTE / IMPACT.COM       │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ 1. Bản chất Phân hệ      │ Trung tâm khuyến mại bán lẻ │ Marketing & Promotions Hub Doanh nghiệp│
│ 2. Đối tượng hưởng lợi   │ Khách mua hàng tự do        │ Phân định rõ 2 nhánh:                  │
│                          │                             │ • Khách hàng: Giảm giá niêm yết       │
│                          │                             │ • KOC/CTV: Hoa hồng + Thưởng mốc      │
│ 3. Cơ chế Mã ưu đãi      │ Hàng chục voucher rác TMĐT  │ DUY NHẤT Coupon Định Danh KOC         │
│                          │ (Freeship, xu, chớp nhoáng) │ (`THAONHI16`): Giảm 10% cho fan KOC,  │
│                          │ gây lỗi cộng dồn âm tiền.   │ đồng thời là mã bắt Attribution số 1. │
│ 4. Chiến dịch Tiếp thị   │ Đợt sale xả kho giảm giá sâu│ Creator Seeding Campaign:             │
│                          │ cho người mua hàng.         │ Thưởng thêm % hoa hồng + Hàng mẫu 0đ  │
│                          │                             │ gắn đồng hồ cam kết SLA 14 ngày.      │
│ 5. Kiểm soát Biên lãi    │ Shop tự gõ giá phá giá,     │ Kiểm soát Giá sàn MAP & Maker-Checker:│
│                          │ không kiểm soát giá vốn.    │ Chặn bán dưới giá sàn; Admin phê duyệt│
│                          │                             │ ngân sách trước khi kích hoạt.        │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────────────┘
```

---

## PHẦN 5: KIẾN TRÚC MỚI TINH GỌN (THE 2-PILLAR PROMOTIONS ARCHITECTURE)

### 5.1. Chuẩn Hóa Menu Điều Hướng Sidebar
* **Tên cũ:** `🏷️ Chiến dịch nhãn hàng`
* **Tên mới chuẩn mực B2B:** **`🏷️ Khuyến mại & Đãi ngộ`** (URL: `/merchant/promotions`)
  * *Ý nghĩa:* Đại diện hoàn hảo cho 2 trụ cột nghiệp vụ: Khuyến mại giá bán sản phẩm + Chính sách đãi ngộ đội ngũ KOC.

---

### 5.2. Cấu Trúc 2 Tabs Duy Nhất (Chuẩn Tinh Gọn - Zero Duplication)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                SCANMS ENTERPRISE MARKETING & PROMOTIONS HUB (/merchant/promotions)             │
├────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│   TAB 1: GIẢM GIÁ SẢN PHẨM (PRICE PROMOTIONS)  │   TAB 2: ĐÃI NGỘ & MÃ ƯU ĐÃI KOC (CREATOR HUB) │
│       (Dành cho Hàng hóa & Khách mua lẻ)       │         (Dành cho Đội ngũ KOC & CTV)          │
└────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

#### TAB 1: `Giảm giá sản phẩm` (Product Price Drops & Flash Deals)
* **Mục tiêu:** Quản trị các chương trình giảm giá bán lẻ trên sàn SCANMS, bảo vệ biên lợi nhuận thông qua Giá sàn MAP và quy trình kiểm duyệt Maker - Checker.
* **Bộ 4 Thẻ Chỉ Số Hiệu Suất (KPI Cards):**
  1. *Tổng đợt đề xuất* (Toàn bộ các chiến dịch đã khởi tạo).
  2. *Chờ Checker thẩm định* (Trạng thái `PENDING`).
  3. *Đang kích hoạt* (Trạng thái `ACTIVE` đang bán trên sàn).
  4. *Ngân sách đã sử dụng* (So sánh với Tổng ngân sách cam kết).
* **Hai Cơ Chế Khởi Tạo Linh Hoạt:**
  * *Chế độ Đơn lẻ:* Bấm nút `[🏷️ Giảm giá]` trực tiếp trên từng dòng sản phẩm tại trang `Sản phẩm` (`/merchant/products`).
  * *Chế độ Hàng loạt (Bulk):* Bấm `[+ Tạo đợt giảm giá mới]` tại Tab này $\rightarrow$ Cho phép chọn nhiều sản phẩm cùng lúc $\rightarrow$ Áp dụng mức giảm theo $\%$ hoặc số tiền $\rightarrow$ Hệ thống tự động tính giá sau giảm và đối soát đồng loạt với Giá sàn MAP của từng sản phẩm.
* **Ràng buộc an toàn tuyệt đối:**
  * Nếu có bất kỳ sản phẩm nào có giá sau giảm $< \text{Floor Price (MAP)}$, hệ thống lập tức báo lỗi và khóa nút gửi.
* **Vòng đời trạng thái tự động:**
  * `PENDING` (Chờ duyệt) $\rightarrow$ `APPROVED` (Đã duyệt · Chờ giờ kích hoạt) $\rightarrow$ `ACTIVE` (Đang chạy) $\rightarrow$ `EXPIRED` (Tự động hoàn nguyên về Giá niêm yết ban đầu khi hết giờ hoặc cạn ngân sách).

---

#### TAB 2: `Đãi ngộ & Mã ưu đãi KOC` (Creator Incentives & Attribution Coupons)
* **Mục tiêu:** Quản trị các chính sách thù lao, thưởng mốc và công cụ bán hàng độc quyền cho đội ngũ sáng tạo nội dung.
* **Tích hợp 3 khối chức năng tinh gọn:**

##### 1. Khối Mã Ưu Đãi Định Danh KOC (Attribution Coupons)
* **Xóa bỏ 100% form tạo voucher rác kiểu Shopee.**
* Chỉ quản lý các mã ưu đãi độc quyền cấp cho KOC:
  * Cấu trúc chuẩn hóa: `[TÊN_KOC][MỨC_GIẢM]` (Ví dụ: `THAONHI16`, `LANHUONG10`).
  * Vai trò kép: Giảm $5\% - 10\%$ cho fan KOC + Bắt attribution ghi nhận $100\%$ doanh số cho KOC kể cả khi khách tắt cookie hoặc đổi trình duyệt.
* Nút thao tác: `[+ Cấp mã ưu đãi cho KOC]` (Chọn KOC từ danh sách đối tác $\rightarrow$ Nhập mức giảm $5\% - 10\%$).

##### 2. Khối Chiến Dịch Seeding KOC (Creator Seeding Campaigns)
* Quản lý các đợt thi đua tiếp thị: Tên chiến dịch, Thời hạn hiệu lực, Tỷ lệ hoa hồng thưởng thêm ($+1\% - +2\%$), Ngân sách thưởng tối đa và Danh mục sản phẩm trọng tâm Seeding.
* KOC tham gia được nhận hàng mẫu trải nghiệm 0đ với cam kết nộp video nghiệm thu trong thời hạn **SLA 14 ngày**.

##### 3. Khối Chính Sách Thưởng Mốc Doanh Số Tháng (FR-09 Milestones)
* Hiển thị bảng cấu hình thưởng bậc thang độc lập theo doanh số sạch tích lũy trong tháng:
  * Mốc Đồng: Đạt $20.000.000\text{ ₫}$ doanh số sạch $\rightarrow$ Thưởng $500.000\text{ ₫}$.
  * Mốc Vàng: Đạt $50.000.000\text{ ₫}$ doanh số sạch $\rightarrow$ Thưởng $1.500.000\text{ ₫}$.
  * Mốc Kim Cương: Đạt $100.000.000\text{ ₫}$ doanh số sạch $\rightarrow$ Thưởng $4.000.000\text{ ₫}$.

---

### 5.3. Tiêu Chuẩn Giao Diện B2B SaaS Tinh Gọn Theo Bộ Kỹ Năng `.agents`
* **Tuyệt đối không dùng Icon hoạt hình & Emoji trẻ con:**
  * Loại bỏ triệt để các emoji `🚨`, `⏰`, `🎁`, `🎉`.
  * Chỉ sử dụng bộ icon chuẩn SVG của Lucide (`Tag`, `ShieldCheck`, `CheckCircle2`, `Coins`, `Clock3`).
* **Loại bỏ chữ rác "cầm tay chỉ việc":**
  * Xóa bỏ các dòng mô tả dài dòng, hiển nhiên. Thay bằng nhãn phụ ngắn gọn, súc tích (Microcopy).
* **Tuân thủ bảng mã màu Vàng Be (Warm Sand Gold Tokens):**
  * Nền: `--canvas` `#FAF8F5`.
  * Sidebar, khay tab: `--surface-sand` `#F3EFE6`.
  * Thẻ Card chính: `--surface` `#FFFFFF`.
  * Nút bấm chính & CTA: `--brand` `#C59B58` (Hover: `--brand-strong` `#B88E4F`).
  * Viền phân cách: `--line` `#EAE4D7`.
  * Chữ chính: `--ink` `#1A1612`. Chữ phụ: `--muted` `#7D715E`.
* **Trải nghiệm hình ảnh chuẩn:** Toàn bộ sản phẩm đều có ảnh Thumbnail $40 \times 40\text{px}$ bo góc `rounded-xl`, không để bảng dữ liệu trần trụi chỉ có chữ.

---

## PHẦN 6: LỘ TRÌNH 4 GIAI ĐOẠN TRIỂN KHAI CHI TIẾT (4-PHASE IMPLEMENTATION ROADMAP)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LỘ TRÌNH TRIỂN KHAI 4 GIAI ĐOẠN TUẦN TỰ                         │
├─────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ GIAI ĐOẠN               │ TRỌNG TÂM KỸ THUẬT       │ SẢN PHẨM BÀN GIAO (DELIVERABLES)  │
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Giai đoạn 1             │ Database Sanitization &  │ • Script cập nhật floor_price 70% │
│ (Dữ liệu Giá sàn)       │ Floor Price Backfill     │ • Sửa lỗi deadlock Effaclar Duo+  │
│                         │                          │ • Cập nhật seed.ts chuẩn 3 giá trị│
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Giai đoạn 2             │ Backend API Refactoring  │ • Endpoint POST /batch-propose    │
│ (Nâng cấp API)          │ & Coupon Cleanup         │ • Tinh giản coupons.service.ts    │
│                         │                          │ • Chuẩn hóa Attribution Coupon API│
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Giai đoạn 3             │ Frontend UI Rebuilding   │ • Đổi tên Sidebar thành Khuyến mại│
│ (Giao diện Tinh gọn)    │ (2 Tabs Architecture)    │ • Xây dựng ShopCreatorIncentives  │
│                         │                          │ • Nâng cấp Batch Promotion Modal  │
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Giai đoạn 4             │ Maker-Checker E2E Test   │ • Test chặn giá < MAP Floor       │
│ (Kiểm thử & Nghiệm thu) │ & Verification           │ • Test duyệt hàng loạt từ Admin   │
│                         │                          │ • Build FE/BE 0 lỗi TypeScript    │
└─────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

### Giai đoạn 1: Chuẩn hóa Dữ liệu Database (Data Backfill & Floor Price Sanitization)
1. **Viết Script cập nhật dữ liệu (Data Migration Script):**
   * Quét toàn bộ bảng `products` và `product_variants`.
   * Cập nhật tự động: $\text{floorPrice} = \text{ROUND}(\text{price} \times 0.70)$ cho toàn bộ sản phẩm đang có `floor_price = NULL`.
   * Điều chỉnh sản phẩm cá biệt `Effaclar Duo+`: Hạ `floor_price` từ $500.000\text{ ₫}$ xuống $350.000\text{ ₫}$ ($70\%$), giải phóng khoảng giảm giá khả dụng.
2. **Cập nhật `seed.ts`:**
   * Đảm bảo mọi sản phẩm mẫu trong hệ thống luôn có đủ bộ 3 giá trị: `listPrice` (Niêm yết), `floorPrice` (Sàn bảo vệ $70\%$), và `price` (Giá bán hiện tại).

---

### Giai đoạn 2: Nâng cấp Backend Hỗ trợ Đề xuất Giảm giá Hàng loạt (Batch Promotion API) & Tinh Giản Voucher Rác
1. **Nâng cấp `pricing.service.ts`:**
   * Xây dựng endpoint mới: `POST /pricing/promotions/batch-propose`
   * Nhận payload:
     ```typescript
     interface BatchProposePromotionDto {
       items: Array<{
         productId: string;
         variantId?: string;
         proposedPrice: number;
       }>;
       budgetTotal: number;
       startsAt: string;
       endsAt: string;
       reason: string;
     }
     ```
   * Chạy trong Prisma `$transaction`, duyệt qua từng item và kiểm tra `assertFloor(item.proposedPrice, product.floorPrice)`. Nếu có bất kỳ item nào vi phạm, toàn bộ giao dịch bị hủy và trả về lỗi chi tiết.
2. **Dọn dẹp `coupons.service.ts`:**
   * Vô hiệu hóa các endpoint tạo voucher rác toàn sàn, voucher freeship.
   * Chuẩn hóa API tạo Coupon gắn chặt với KOC: `POST /coupons/collaborator-attribution` nhận `collaboratorId`, `discountPercent` ($5\% - 10\%$), tự động sinh code chuẩn `[TÊN_KOC][MỨC_GIẢM]`.

---

### Giai đoạn 3: Tái Cấu Trúc Giao Diện Hub Khuyến Mại & Sản Phẩm (Frontend Refactoring)
1. **`frontend/src/config/navigation.config.ts`:**
   * Đổi tên menu Sidebar của Shop Manager: `{ path: '/merchant/promotions', label: 'Khuyến mại & Đãi ngộ', icon: Tag }`.
2. **`frontend/src/pages/merchant/ShopPromotionsHubPage.tsx`:**
   * Rút gọn thanh HubTabs thành **2 Tabs Duy Nhất**:
     * Tab 1: `price-promotions` (`Giảm giá sản phẩm`)
     * Tab 2: `creator-incentives` (`Đãi ngộ & Mã ưu đãi KOC`)
   * Gỡ bỏ hoàn toàn việc nhúng `ExclusiveDealInbox` và `StoreReferralLinksPage` tại đây.
3. **Nâng cấp `ShopPricePromotionsTab.tsx`:**
   * Thêm nút `[+ Tạo đợt giảm giá mới]` mở modal cho phép tích chọn nhiều sản phẩm cùng lúc.
   * Cập nhật danh sách hiển thị thẻ Card sản phẩm sang trọng, có Thumbnail, nhãn phân loại, thanh tiến độ giải ngân ngân sách.
4. **Xây dựng mới `ShopCreatorIncentivesTab.tsx`:**
   * Thay thế hoàn toàn file `ShopCouponsPage.tsx` cũ.
   * Tích hợp 3 khối: Mã ưu đãi KOC (`THAONHI16`), Chiến dịch Seeding KOC, và Bảng thưởng mốc doanh số tháng (FR-09).
5. **Nâng cấp `ProposePromotionModal.tsx` tại `ProductManagementPage.tsx`:**
   * Hỗ trợ 2 luồng: Giảm giá đơn lẻ (khi bấm trên dòng sản phẩm) và Giảm giá hàng loạt (khi chọn nhiều checkbox trên bảng sản phẩm).

---

### Giai đoạn 4: Kiểm Thử Hệ Thống & Nghiệm Thu (Verification & Acceptance Testing)
1. **Kiểm thử Ràng buộc Giá sàn:**
   * Nhập giá thấp hơn Giá sàn MAP $\rightarrow$ Hệ thống lập tức chặn và báo lỗi đỏ.
   * Nhập giá hợp lệ $\rightarrow$ Hệ thống tính toán chính xác biên lãi còn lại và % tiết kiệm cho khách.
2. **Kiểm thử Luồng Maker - Checker:**
   * Shop Manager tạo đợt giảm giá hàng loạt $\rightarrow$ Đề xuất xuất hiện tại `/admin/pricing` $\rightarrow$ System Admin bấm Duyệt $\rightarrow$ Trạng thái chuyển sang `APPROVED` bên Shop Manager.
3. **Kiểm thử Biên Dịch & Hiệu Năng:**
   * `npm --prefix backend run build` đạt $0$ lỗi TypeScript.
   * `npm --prefix frontend run build` đạt $0$ lỗi TypeScript, đóng gói Vite dưới 3 giây.

---

## PHẦN 7: BẢNG ĐỐI CHIẾU TRƯỚC & SAU KHI TRIỂN KHAI (BEFORE VS AFTER)

| Tiêu Chí | HIỆN TRẠNG (BEFORE) | SAU KHI TRIỂN KHAI MASTER PLAN (AFTER) |
| :--- | :--- | :--- |
| **Số lượng Tabs tại Hub** | **6 Tabs** rời rạc, gây quá tải nhận thức, trùng lặp tính năng. | **2 Tabs** tinh gọn: Giảm giá sản phẩm (Bán lẻ) vs Đãi ngộ KOC (Tiếp thị). |
| **Trải nghiệm Giảm giá** | Bắt giảm lẻ tẻ từng sản phẩm, thao tác lặp đi lặp lại. | Hỗ trợ cả **Giảm đơn lẻ** và **Giảm hàng loạt nhiều sản phẩm cùng lúc**. |
| **Giá sàn bảo vệ (MAP)** | $13/14$ sản phẩm bị `NULL` ("Chưa đặt sàn MAP"), $1$ sản phẩm bị kẹt do $\text{MAP} = \text{Price}$. | $100\%$ sản phẩm có Giá sàn MAP chuẩn ($70\%$ giá niêm yết), bảo vệ biên lãi an toàn. |
| **Hệ thống Mã giảm giá** | Tràn lan voucher rác TMĐT (freeship, voucher shop, trợ cấp sàn) gây âm tiền. | **Xóa 100% voucher rác**. Duy nhất duy trì Coupon định danh KOC (`THAONHI16`). |
| **Trùng lặp menu** | Deal VIP nằm ở cả 2 menu Sidebar khác nhau; Link tiếp thị rải khắp nơi. | **Triệt tiêu 100% trùng lặp**: Deal VIP về đúng KOL Hub, Link tiếp thị về đúng Product Page. |
| **Phong cách Giao diện** | Nhiều chữ rườm rà, icon hoạt hình trẻ con, cảm giác AI gen thô sơ. | Chuẩn **B2B SaaS Enterprise**: Thanh lịch, tối giản chữ thừa, tone màu Vàng Be sang trọng. |

---

*Tài liệu này được lập bởi Lead Architect Nguyễn Thành Thắng làm căn cứ kỹ thuật chuẩn mực cho đợt cải tổ phân hệ Marketing & Promotions Hub của hệ thống SCANMS.*

