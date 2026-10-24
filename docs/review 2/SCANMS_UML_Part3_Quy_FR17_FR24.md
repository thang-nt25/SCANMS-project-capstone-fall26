# ĐẶC TẢ THIẾT KẾ UML 2.5: PHÂN HỆ 3: GIAN HÀNG, ĐƠN HÀNG & QUẢN TRỊ VẬN HÀNH
## DỰ ÁN CAPSTONE: SCANMS (FA26SE032)
**Phạm vi chức năng:** FR-17 đến FR-24 (16 Sơ đồ kỹ thuật: 8 Class Diagrams + 8 Sequence Diagrams)  
**Thành viên chịu trách nhiệm chính & Code Defense:** **Nguyễn Phú Quý (SE180104)**  

---

## 1. TỔNG QUAN PHÂN HỆ & CAM KẾT CODE DEFENSE

- **Người phụ trách:** **Nguyễn Phú Quý (SE180104)**
- **Tỷ trọng đóng góp:** **25%** toàn hệ thống SCANMS
- **Tệp thiết kế Draw.io độc lập (16 Tabs):** [SCANMS_UML_Part3_Quy_FR17_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part3_Quy_FR17_FR24.drawio)
- **Thư mục ảnh PNG & SVG gốc:** [docs/review 2/diagrams/](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/)

### 🎯 Các điểm mấu chốt bảo vệ mã nguồn (Code Defense Points):
1. **Giỏ hàng đồng bộ hóa trực tiếp trên PostgreSQL Server theo User ID**
2. **Tách đơn hàng đa gian hàng (Sub-orders split) và quản lý kho realtime**
3. **Shipping Simulator kết nối GHN và in phiếu A6 Barcode Code-128**
4. **Bảo chứng Quỹ Escrow 14 ngày & Động cơ thu hồi hoa hồng (Clawback Engine)**
5. **Khóa bi quan (Pessimistic Lock SELECT FOR UPDATE) chống âm ví khi rút tiền**

---

## 2. CHI TIẾT CÁC CHỨC NĂNG (FR-17 ĐẾN FR-24)

### FR-17: Quản lý Giỏ hàng đa gian hàng & Đồng bộ Database PostgreSQL

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Giỏ hàng được lưu trữ và đồng bộ hóa trực tiếp trên PostgreSQL Server theo User ID. Nhóm các sản phẩm theo từng Shop riêng biệt và tự động kiểm tra tồn kho realtime.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `CartDrawer.tsx, CartItemRow.tsx`
  - **Backend API & Service:** `CartController, CartService.syncCart, CartService.validateStock`
  - **Prisma Models / Database Tables:** `CartItem, Product, ProductVariant, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-17)
![Class Diagram FR-17](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-17)
![Sequence Diagram FR-17](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.drawio)

---

---

### FR-18: Đánh giá sản phẩm có chứng thực (Verified Buyer Review Gate)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Cơ chế chống đánh giá ảo (Spam Reviews). Chỉ những khách hàng có đơn hàng chứa sản phẩm ở trạng thái DELIVERED hoặc COMPLETED mới được quyền gửi bài đánh giá kèm ảnh thực tế.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ProductReviewModal.tsx, ReviewRatingStars.tsx`
  - **Backend API & Service:** `ReviewsController.createReview, ReviewsService.verifyPurchaseGate`
  - **Prisma Models / Database Tables:** `ProductReview, Order, OrderItem, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-18)
![Class Diagram FR-18](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-18)
![Sequence Diagram FR-18](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.drawio)

---

---

### FR-19: Quản lý đơn hàng Merchant & Tách đơn đa gian hàng (Order Processing)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Khi khách đặt nhiều sản phẩm thuộc nhiều Shop khác nhau, hệ thống tự động tách thành các Sub-orders độc lập. Mỗi Shop chỉ nhìn thấy và quản lý đơn hàng của chính mình.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `OrdersManagementPage.tsx, OrderDetailModal.tsx`
  - **Backend API & Service:** `OrdersController.updateOrderStatus, OrdersService.splitMultiStoreOrder`
  - **Prisma Models / Database Tables:** `Order, OrderItem, Store, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-19)
![Class Diagram FR-19](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-19)
![Sequence Diagram FR-19](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.drawio)

---

---

### FR-20: Giao vận GHN & Shipping Simulator in phiếu A6 Barcode Code-128

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Tích hợp bưu cục Giao Hàng Nhanh (GHN) API và bộ mô phỏng doanh nghiệp. Tự động sinh mã vận đơn AWB chuẩn TMĐT và in tem phiếu đóng gói bưu kiện kích thước A6 có Barcode Code-128.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ShippingLabelModal.tsx, ShippingSimulatorTab.tsx`
  - **Backend API & Service:** `ShippingController.createFulfillment, ShippingService.generateAwbBarcode`
  - **Prisma Models / Database Tables:** `ShippingFulfillment, Order, Address`

#### 1. Sơ đồ Lớp (Class Diagram - FR-20)
![Class Diagram FR-20](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-20)
![Sequence Diagram FR-20](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.drawio)

---

---

### FR-21: Quỹ bảo chứng Escrow 14 ngày & Tạm giữ hoa hồng bảo vệ rủi ro

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Khi đơn giao thành công, hoa hồng của KOL lập tức được tính toán nhưng tạm giữ trong Quỹ Escrow 14 ngày. Hết thời hạn khiếu nại đổi trả, Cronjob tự động chuyển tiền sang Ví khả dụng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `EscrowLedgerTable.tsx, CommissionTimeline.tsx`
  - **Backend API & Service:** `CommissionService.holdInEscrow, EscrowCronJob.releaseMaturedCommissions`
  - **Prisma Models / Database Tables:** `CommissionLedger, Wallet, Order`

#### 1. Sơ đồ Lớp (Class Diagram - FR-21)
![Class Diagram FR-21](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-21)
![Sequence Diagram FR-21](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.drawio)

---

---

### FR-22: Quy trình đổi trả hàng / hoàn tiền & Thu hồi hoa hồng (Clawback Engine)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Xử lý khiếu nại đổi trả có đính kèm video bóc hộp. Khi Shop duyệt hoàn trả, Động cơ Clawback tự động thu hồi 100% hoa hồng tạm giữ và hoàn trả toàn bộ tiền về ví khách hàng.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ReturnRequestModal.tsx, ReturnDisputeSplitView.tsx`
  - **Backend API & Service:** `ReturnsController.submitReturn, ReturnsService.approveReturnAndClawback`
  - **Prisma Models / Database Tables:** `ReturnRequest, ReturnEvidence, Order, CommissionLedger`

#### 1. Sơ đồ Lớp (Class Diagram - FR-22)
![Class Diagram FR-22](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-22)
![Sequence Diagram FR-22](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.drawio)

---

---

### FR-23: Yêu cầu rút tiền ví đối tác & Khóa bi quan chống âm ví (Pessimistic Locking)

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** KOL tạo lệnh rút tiền về tài khoản ngân hàng. Áp dụng câu lệnh SELECT ... FOR UPDATE khóa dòng CSDL tức thời, ngăn chặn triệt để tấn công Race Condition / Double-spending làm âm ví.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `WalletPage.tsx, WithdrawalRequestModal.tsx`
  - **Backend API & Service:** `WalletsController.requestPayout, WalletsService.withdrawWithPessimisticLock`
  - **Prisma Models / Database Tables:** `Wallet, WalletTransaction, PayoutRequest`

#### 1. Sơ đồ Lớp (Class Diagram - FR-23)
![Class Diagram FR-23](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-23)
![Sequence Diagram FR-23](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.drawio)

---

---

### FR-24: Quyết toán chi trả Payout hàng loạt & Xuất file VietQR Napas 24/7

- **Người chịu trách nhiệm & Code Defense:** **Nguyễn Phú Quý (SE180104)**
- **Mô tả nghiệp vụ:** Giao diện thẩm định duyệt lệnh chi trả. Tự động trích lập 10% thuế TNCN cho lệnh rút >= 2.000.000đ và xuất file Excel chuẩn lô lệnh liên ngân hàng VietQR Napas247.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `PayoutApprovalPage.tsx, BatchPayoutExporter.tsx`
  - **Backend API & Service:** `PayoutsController.approveBatch, PayoutsService.exportVietQrBatchFile`
  - **Prisma Models / Database Tables:** `PayoutRequest, KycProfile, FinancialLedger`

##

---

## 3. DANH MỤC 16 TỆP SƠ ĐỒ KỸ THUẬT (BẢNG TRA CỨU)

| STT | Mã chức năng & Tên sơ đồ | Loại | Tệp Ảnh (PNG 2x) | Tệp Vector (SVG) | Tệp Thiết kế Draw.io |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **33** | **FR-17:** Class Diagram FR17 | **Class Diagram** | [SCANMS_CD_FR17.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.png) | [SCANMS_CD_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.svg) | [SCANMS_CD_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR17.drawio) |
| **34** | **FR-17:** Sequence Diagram FR17 | **Sequence Diagram** | [SCANMS_SQ_FR17.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.png) | [SCANMS_SQ_FR17.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.svg) | [SCANMS_SQ_FR17.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR17.drawio) |
| **35** | **FR-18:** Class Diagram FR18 | **Class Diagram** | [SCANMS_CD_FR18.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.png) | [SCANMS_CD_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.svg) | [SCANMS_CD_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR18.drawio) |
| **36** | **FR-18:** Sequence Diagram FR18 | **Sequence Diagram** | [SCANMS_SQ_FR18.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.png) | [SCANMS_SQ_FR18.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.svg) | [SCANMS_SQ_FR18.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR18.drawio) |
| **37** | **FR-19:** Class Diagram FR19 | **Class Diagram** | [SCANMS_CD_FR19.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.png) | [SCANMS_CD_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.svg) | [SCANMS_CD_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR19.drawio) |
| **38** | **FR-19:** Sequence Diagram FR19 | **Sequence Diagram** | [SCANMS_SQ_FR19.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.png) | [SCANMS_SQ_FR19.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.svg) | [SCANMS_SQ_FR19.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR19.drawio) |
| **39** | **FR-20:** Class Diagram FR20 | **Class Diagram** | [SCANMS_CD_FR20.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.png) | [SCANMS_CD_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.svg) | [SCANMS_CD_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR20.drawio) |
| **40** | **FR-20:** Sequence Diagram FR20 | **Sequence Diagram** | [SCANMS_SQ_FR20.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.png) | [SCANMS_SQ_FR20.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.svg) | [SCANMS_SQ_FR20.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR20.drawio) |
| **41** | **FR-21:** Class Diagram FR21 | **Class Diagram** | [SCANMS_CD_FR21.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.png) | [SCANMS_CD_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.svg) | [SCANMS_CD_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR21.drawio) |
| **42** | **FR-21:** Sequence Diagram FR21 | **Sequence Diagram** | [SCANMS_SQ_FR21.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.png) | [SCANMS_SQ_FR21.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.svg) | [SCANMS_SQ_FR21.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR21.drawio) |
| **43** | **FR-22:** Class Diagram FR22 | **Class Diagram** | [SCANMS_CD_FR22.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.png) | [SCANMS_CD_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.svg) | [SCANMS_CD_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR22.drawio) |
| **44** | **FR-22:** Sequence Diagram FR22 | **Sequence Diagram** | [SCANMS_SQ_FR22.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.png) | [SCANMS_SQ_FR22.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.svg) | [SCANMS_SQ_FR22.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR22.drawio) |
| **45** | **FR-23:** Class Diagram FR23 | **Class Diagram** | [SCANMS_CD_FR23.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.png) | [SCANMS_CD_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.svg) | [SCANMS_CD_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR23.drawio) |
| **46** | **FR-23:** Sequence Diagram FR23 | **Sequence Diagram** | [SCANMS_SQ_FR23.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.png) | [SCANMS_SQ_FR23.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.svg) | [SCANMS_SQ_FR23.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR23.drawio) |
| **47** | **FR-24:** Class Diagram FR24 | **Class Diagram** | [SCANMS_CD_FR24.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.png) | [SCANMS_CD_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.svg) | [SCANMS_CD_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR24.drawio) |
| **48** | **FR-24:** Sequence Diagram FR24 | **Sequence Diagram** | [SCANMS_SQ_FR24.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.png) | [SCANMS_SQ_FR24.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.svg) | [SCANMS_SQ_FR24.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR24.drawio) |

---

## 4. CHECKLIST SẴN SÀNG BẢO VỆ

- [x] Thuộc lòng 100% luồng tương tác và các bước xử lý trong 8 sơ đồ Sequence Diagram.
- [x] Nắm rõ cấu trúc class, kiểu dữ liệu DTO, quan hệ thực thể Prisma trong 8 sơ đồ Class Diagram.
- [x] Mở sẵn file code thật trong VS Code và sẵn sàng trình diễn trong vòng 15 giây khi GV Review 2 đặt câu hỏi.
