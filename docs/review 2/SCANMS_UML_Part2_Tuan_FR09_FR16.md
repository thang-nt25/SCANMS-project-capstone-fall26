# ĐẶC TẢ THIẾT KẾ UML 2.5: PHÂN HỆ 2: TIẾP THỊ LIÊN KẾT & ĐỘNG CƠ TRACKING
## DỰ ÁN CAPSTONE: SCANMS (FA26SE032)
**Phạm vi chức năng:** FR-09 đến FR-16 (16 Sơ đồ kỹ thuật: 8 Class Diagrams + 8 Sequence Diagrams)  
**Thành viên chịu trách nhiệm chính & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**  

---

## 1. TỔNG QUAN PHÂN HỆ & CAM KẾT CODE DEFENSE

- **Người phụ trách:** **Nguyễn Đình Tuấn (SE180104)**
- **Tỷ trọng đóng góp:** **25%** toàn hệ thống SCANMS
- **Tệp thiết kế Draw.io độc lập (16 Tabs):** [SCANMS_UML_Part2_Tuan_FR09_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part2_Tuan_FR09_FR16.drawio)
- **Thư mục ảnh PNG & SVG gốc:** [docs/review 2/diagrams/](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/)

### 🎯 Các điểm mấu chốt bảo vệ mã nguồn (Code Defense Points):
1. **Thuật toán tính mốc thưởng lũy tiến theo doanh số tháng (Progressive Bonus)**
2. **Sinh link rút gọn định danh HMAC và Dynamic QR Code canvas**
3. **Động cơ Tracking Last-Click & Attribution Cookie 30 ngày**
4. **Cơ chế chống click ảo bằng Redis Sliding Window Rate Limit (10 req/s)**

---

## 2. CHI TIẾT CÁC CHỨC NĂNG (FR-09 ĐẾN FR-16)

### FR-09: Cấu hình mốc thưởng doanh số tháng (Monthly Revenue Bonus Milestones)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Shop cấu hình bậc thang thưởng lũy tiến theo doanh số tháng (ví dụ đạt 50tr thưởng 2%, đạt 100tr thưởng 3.5%). Hỗ trợ mô phỏng tiền thưởng tự động trước khi lưu.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CommissionRulesPage.tsx, BonusCalculatorModal.tsx`
  - **Backend API & Service:** `CommissionRulesController, CommissionRulesService.calculateProgressiveBonus`
  - **Prisma Models / Database Tables:** `CommissionRule, Store, MonthlyBonusLedger`

#### 1. Sơ đồ Lớp (Class Diagram - FR-09)
![Class Diagram FR-09](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-09)
![Sequence Diagram FR-09](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.drawio)

---

---

### FR-10: Tạo link tiếp thị liên kết rút gọn định danh (Short Affiliate Links & HMAC)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Sinh liên kết tiếp thị rút gọn chuẩn hóa (scanms.vn/r/xxxx) tích hợp UTM tracking parameters và mã xác thực chống giả mạo HMAC.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ReferralLinksPage.tsx, CreateLinkModal.tsx`
  - **Backend API & Service:** `ReferralLinksController.createLink, ReferralLinksService.generateShortCode`
  - **Prisma Models / Database Tables:** `ReferralLink, Product, Campaign, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-10)
![Class Diagram FR-10](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-10)
![Sequence Diagram FR-10](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.drawio)

---

---

### FR-11: Tạo mã QR Code động cá nhân hóa (Dynamic QR Code Generator)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Kết xuất mã QR Code SVG/PNG tùy biến có chèn logo gian hàng hoặc avatar KOL, hỗ trợ quét trực tiếp qua camera điện thoại dẫn thẳng vào trang sản phẩm.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `QrCodeModal.tsx, CanvasQrRenderer.tsx`
  - **Backend API & Service:** `ReferralLinksController.getQrCode, ReferralLinksService.renderDynamicQr`
  - **Prisma Models / Database Tables:** `ReferralLink, QrAsset`

#### 1. Sơ đồ Lớp (Class Diagram - FR-11)
![Class Diagram FR-11](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-11)
![Sequence Diagram FR-11](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.drawio)

---

---

### FR-12: Gán mã giảm giá độc quyền cho KOL (Exclusive Creator Coupons)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Shop cấp mã giảm giá riêng (Voucher độc quyền) cho từng KOL. Khi khách dùng voucher này, hệ thống tự động ghi nhận hoa hồng cho KOL mà không cần click link tiếp thị.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `KolCouponsPage.tsx, CouponBindingModal.tsx`
  - **Backend API & Service:** `CouponsController.assignToKol, CouponsService.validateCouponApplication`
  - **Prisma Models / Database Tables:** `Coupon, UserCoupon, Store, Product`

#### 1. Sơ đồ Lớp (Class Diagram - FR-12)
![Class Diagram FR-12](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-12)
![Sequence Diagram FR-12](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.drawio)

---

---

### FR-13: Động cơ Tracking Last-Click & Attribution Cookie 30 ngày

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Ghi nhận click traffic log, thiết lập Cookie lưu trữ 30 ngày theo nguyên tắc Last-Click Attribution (lượt click cuối cùng trước khi mua sẽ hưởng toàn bộ hoa hồng).
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `PublicHeader.tsx, useReferralTracking.ts`
  - **Backend API & Service:** `TrackingController.recordClick, TrackingService.resolveAttribution`
  - **Prisma Models / Database Tables:** `ClickTrafficLog, ReferralLink, SessionAttribution`

#### 1. Sơ đồ Lớp (Class Diagram - FR-13)
![Class Diagram FR-13](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-13)
![Sequence Diagram FR-13](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.drawio)

---

---

### FR-14: Chống click tặc & Spam traffic bằng Redis Sliding Window Rate Limit

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Bảo vệ endpoint click redirect bằng thuật toán Sliding Window Counter trên Redis In-Memory. Chặn tối đa 10 clicks/giây/IP, trả về HTTP 429 Too Many Requests khi bị bot tấn công.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `Global Error Interceptor`
  - **Backend API & Service:** `RedisRateLimiterGuard, TrackingQueueService, RedisService`
  - **Prisma Models / Database Tables:** `Redis Key (ratelimit:ip:*), ClickTrafficLog`

#### 1. Sơ đồ Lớp (Class Diagram - FR-14)
![Class Diagram FR-14](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-14)
![Sequence Diagram FR-14](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.drawio)

---

---

### FR-15: Trang đích sản phẩm (Landing Page) & Tích hợp Video Review KOL

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Trang chi tiết sản phẩm chuẩn SEO TMĐT, hiển thị thông tin gian hàng minh bạch, tỉ lệ hoa hồng CTV, video review chân thực của KOL và các ưu đãi đang áp dụng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ProductDetailPage.tsx, KolReviewVideoPlayer.tsx`
  - **Backend API & Service:** `ProductController.getProductPublicDetail, ProductService.getLandingMeta`
  - **Prisma Models / Database Tables:** `Product, ProductVariant, MediaAsset, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-15)
![Class Diagram FR-15](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-15)
![Sequence Diagram FR-15](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.drawio)

---

---

### FR-16: Đặt hàng nhanh & Tự động nhận diện Attribution khi thanh toán

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Đình Tuấn (SE180104)**
- **Mô tả nghiệp vụ:** Quy trình đặt hàng thông minh tự động đọc Cookie tiếp thị hoặc mã giảm giá đang kích hoạt, tính toán hoa hồng dự kiến và khấu trừ voucher chính xác đến từng xu.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CheckoutModal.tsx, OrderSummary.tsx`
  - **Backend API & Service:** `OrdersController.createOrder, OrdersService.calculateTotals`
  - **Prisma Models / Database Tables:** `Order, OrderItem, ReferralLink, Coupon`

##

---

## 3. DANH MỤC 16 TỆP SƠ ĐỒ KỸ THUẬT (BẢNG TRA CỨU)

| STT | Mã chức năng & Tên sơ đồ | Loại | Tệp Ảnh (PNG 2x) | Tệp Vector (SVG) | Tệp Thiết kế Draw.io |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **17** | **FR-09:** ClassDiagram FR9 | **Class Diagram** | [SCANMS_CD_FR09.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.png) | [SCANMS_CD_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.svg) | [SCANMS_CD_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR09.drawio) |
| **18** | **FR-09:** Sequence FR9 | **Sequence Diagram** | [SCANMS_SQ_FR09.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.png) | [SCANMS_SQ_FR09.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.svg) | [SCANMS_SQ_FR09.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR09.drawio) |
| **19** | **FR-10:** ClassDiagram FR10 | **Class Diagram** | [SCANMS_CD_FR10.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.png) | [SCANMS_CD_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.svg) | [SCANMS_CD_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR10.drawio) |
| **20** | **FR-10:** Sequence FR10 | **Sequence Diagram** | [SCANMS_SQ_FR10.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.png) | [SCANMS_SQ_FR10.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.svg) | [SCANMS_SQ_FR10.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR10.drawio) |
| **21** | **FR-11:** Class Diagram FR11 | **Class Diagram** | [SCANMS_CD_FR11.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.png) | [SCANMS_CD_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.svg) | [SCANMS_CD_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR11.drawio) |
| **22** | **FR-11:** Sequence Diagram FR11 | **Sequence Diagram** | [SCANMS_SQ_FR11.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.png) | [SCANMS_SQ_FR11.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.svg) | [SCANMS_SQ_FR11.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR11.drawio) |
| **23** | **FR-12:** Class Diagram FR12 | **Class Diagram** | [SCANMS_CD_FR12.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.png) | [SCANMS_CD_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.svg) | [SCANMS_CD_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR12.drawio) |
| **24** | **FR-12:** Sequence Diagram FR12 | **Sequence Diagram** | [SCANMS_SQ_FR12.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.png) | [SCANMS_SQ_FR12.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.svg) | [SCANMS_SQ_FR12.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR12.drawio) |
| **25** | **FR-13:** Class Diagram FR13 | **Class Diagram** | [SCANMS_CD_FR13.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.png) | [SCANMS_CD_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.svg) | [SCANMS_CD_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR13.drawio) |
| **26** | **FR-13:** Sequence Diagram FR13 | **Sequence Diagram** | [SCANMS_SQ_FR13.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.png) | [SCANMS_SQ_FR13.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.svg) | [SCANMS_SQ_FR13.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR13.drawio) |
| **27** | **FR-14:** Class Diagram FR14 | **Class Diagram** | [SCANMS_CD_FR14.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.png) | [SCANMS_CD_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.svg) | [SCANMS_CD_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR14.drawio) |
| **28** | **FR-14:** Sequence Diagram FR14 | **Sequence Diagram** | [SCANMS_SQ_FR14.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.png) | [SCANMS_SQ_FR14.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.svg) | [SCANMS_SQ_FR14.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR14.drawio) |
| **29** | **FR-15:** Class Diagram FR15 | **Class Diagram** | [SCANMS_CD_FR15.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.png) | [SCANMS_CD_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.svg) | [SCANMS_CD_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR15.drawio) |
| **30** | **FR-15:** Sequence Diagram FR15 | **Sequence Diagram** | [SCANMS_SQ_FR15.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.png) | [SCANMS_SQ_FR15.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.svg) | [SCANMS_SQ_FR15.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR15.drawio) |
| **31** | **FR-16:** Class Diagram FR16 | **Class Diagram** | [SCANMS_CD_FR16.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.png) | [SCANMS_CD_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.svg) | [SCANMS_CD_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR16.drawio) |
| **32** | **FR-16:** Sequence Diagram FR16 | **Sequence Diagram** | [SCANMS_SQ_FR16.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.png) | [SCANMS_SQ_FR16.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.svg) | [SCANMS_SQ_FR16.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR16.drawio) |

---

## 4. CHECKLIST SẴN SÀNG BẢO VỆ

- [x] Thuộc lòng 100% luồng tương tác và các bước xử lý trong 8 sơ đồ Sequence Diagram.
- [x] Nắm rõ cấu trúc class, kiểu dữ liệu DTO, quan hệ thực thể Prisma trong 8 sơ đồ Class Diagram.
- [x] Mở sẵn file code thật trong VS Code và sẵn sàng trình diễn trong vòng 15 giây khi GV Review 2 đặt câu hỏi.
