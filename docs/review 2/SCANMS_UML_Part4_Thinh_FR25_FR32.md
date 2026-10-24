# ĐẶC TẢ THIẾT KẾ UML 2.5: PHÂN HỆ 4: TƯƠNG TÁC KOL, PHÂN TÍCH REALTIME & TRÍ TUỆ NHÂN TẠO
## DỰ ÁN CAPSTONE: SCANMS (FA26SE032)
**Phạm vi chức năng:** FR-25 đến FR-32 (16 Sơ đồ kỹ thuật: 8 Class Diagrams + 8 Sequence Diagrams)  
**Thành viên chịu trách nhiệm chính & Code Defense:** **Phan Xuân Thịnh (SE184527)**  

---

## 1. TỔNG QUAN PHÂN HỆ & CAM KẾT CODE DEFENSE

- **Người phụ trách:** **Phan Xuân Thịnh (SE184527)**
- **Tỷ trọng đóng góp:** **25%** toàn hệ thống SCANMS
- **Tệp thiết kế Draw.io độc lập (16 Tabs):** [SCANMS_UML_Part4_Thinh_FR25_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_UML_Part4_Thinh_FR25_FR32.drawio)
- **Thư mục ảnh PNG & SVG gốc:** [docs/review 2/diagrams/](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/)

### 🎯 Các điểm mấu chốt bảo vệ mã nguồn (Code Defense Points):
1. **Vòng đời yêu cầu hàng mẫu 4 bước & Đếm ngược 14 ngày nộp video review**
2. **Hệ thống Chat Realtime dựa trên WebSocket Socket.IO**
3. **Đàm phán chiến dịch độc quyền (Exclusive Deal) ngay trong khung chat**
4. **Mô hình AI chấm điểm độ phù hợp KOL (Smart Matching) & Phát hiện gian lận traffic**
5. **Nhật ký kiểm toán toàn diện bất biến (Append-Only Audit Logs) kèm EventId Hash**

---

## 2. CHI TIẾT CÁC CHỨC NĂNG (FR-25 ĐẾN FR-32)

### FR-25: Quy trình xin hàng mẫu dùng thử 4 bước (Sample Request Flow & 14-day SLA)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Quy trình 4 bước: KOL xin mẫu -> Shop duyệt cấp -> Bưu cục giao hàng -> KOL nộp video review nghiệm thu trong vòng 14 ngày. Quản lý trạng thái vòng đời chặt chẽ.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ShopSampleManagementTab.tsx, KolSampleRequestModal.tsx`
  - **Backend API & Service:** `SamplesController, SamplesService.approveSample, SamplesService.confirmDelivery`
  - **Prisma Models / Database Tables:** `SampleRequest, Product, Store, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-25)
![Class Diagram FR-25](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-25)
![Sequence Diagram FR-25](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.drawio)

---

---

### FR-26: Nhắn tin Realtime trao đổi giữa Shop và KOL (WebSocket Socket.IO Chat)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Hệ thống nhắn tin thời gian thực dựa trên WebSocket Socket.IO. Hỗ trợ hiển thị trạng thái đã đọc, typing indicators, chia sẻ thẻ sản phẩm và bảo chứng thông tin đàm phán.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ScanmsChatDrawer.tsx, ChatMessageList.tsx`
  - **Backend API & Service:** `ChatGateway (@WebSocketGateway), ChatService.saveMessage`
  - **Prisma Models / Database Tables:** `ChatMessage, ChatRoom, User, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-26)
![Class Diagram FR-26](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-26)
![Sequence Diagram FR-26](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.drawio)

---

---

### FR-27: Mời chiến dịch độc quyền qua Chat (Exclusive Deal Negotiation & Custom Rate)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Shop gửi lời mời hợp tác trực tiếp trong khung chat với mức hoa hồng độc quyền VIP (ví dụ 18% thay vì 10% cơ bản). KOL bấm chấp nhận sẽ tự sinh link riêng có mức rate này.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `ExclusiveDealCard.tsx, DealProposalModal.tsx`
  - **Backend API & Service:** `DealsController.proposeDeal, DealsService.acceptExclusiveDeal`
  - **Prisma Models / Database Tables:** `ExclusiveDealProposal, Store, Product, CollaboratorProfile`

#### 1. Sơ đồ Lớp (Class Diagram - FR-27)
![Class Diagram FR-27](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-27)
![Sequence Diagram FR-27](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.drawio)

---

---

### FR-28: Dashboard phân tích doanh số thời gian thực & Traffic Analytics

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Báo cáo chỉ số kinh doanh trực quan (GMV, Doanh thu thuần, Tổng click, Tỉ lệ chuyển đổi CR%, Hoa hồng chi trả) với biểu đồ đường thời gian thực và phân loại theo kênh mạng xã hội.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `MerchantAnalyticsDashboard.tsx, KolSalesStats.tsx`
  - **Backend API & Service:** `AnalyticsController.getStoreDashboard, AnalyticsService.aggregateMetrics`
  - **Prisma Models / Database Tables:** `Order, ClickTrafficLog, CommissionLedger, Store`

#### 1. Sơ đồ Lớp (Class Diagram - FR-28)
![Class Diagram FR-28](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-28)
![Sequence Diagram FR-28](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.drawio)

---

---

### FR-29: Bảng vinh danh Top KOL (Leaderboard & Tier Progression)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Bảng xếp hạng Top 10 KOL có doanh số tiếp thị cao nhất tháng. Tự động xét thăng hạng thành viên dựa trên doanh số lũy kế và cấp huy hiệu độc quyền trên sàn.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `LeaderboardPage.tsx, TierBadge.tsx`
  - **Backend API & Service:** `LeaderboardController.getMonthlyRankings, LeaderboardService.computeTierRanks`
  - **Prisma Models / Database Tables:** `CollaboratorProfile, CollaboratorTier (BRONZE, SILVER, GOLD, DIAMOND), User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-29)
![Class Diagram FR-29](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-29)
![Sequence Diagram FR-29](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.drawio)

---

---

### FR-30: AI gợi ý KOL phù hợp với ngành hàng & Sản phẩm (Smart Matching)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Mô hình AI chấm điểm độ phù hợp (Match Score 0-100%) giữa đặc tính sản phẩm và tệp khán giả của KOL dựa trên lịch sử chuyển đổi, ngành hàng thế mạnh và lượng tương tác.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `AiKolRecommendationWidget.tsx, KolMatchScoreBadge.tsx`
  - **Backend API & Service:** `AiController.recommendKolsForProduct, AiRecommendationService.calculateFitScore`
  - **Prisma Models / Database Tables:** `Product, Category, CollaboratorProfile, SocialChannel`

#### 1. Sơ đồ Lớp (Class Diagram - FR-30)
![Class Diagram FR-30](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-30)
![Sequence Diagram FR-30](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.drawio)

---

---

### FR-31: AI phát hiện gian lận Traffic & Đơn hàng ảo (Fraud Detection Engine)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Động cơ AI phát hiện các hành vi bất thường: Tự mua qua link của chính mình (Self-referral), Cùng IP/Fingerprint đặt hàng loạt đơn, hoặc Click spike bất thường từ IP proxy/VPN.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `FraudAlertBanner.tsx, SuspiciousActivityDrawer.tsx`
  - **Backend API & Service:** `FraudController.scanTrafficAnomaly, FraudDetectionService.detectSelfReferral`
  - **Prisma Models / Database Tables:** `FraudIncident, ClickTrafficLog, Order, User`

#### 1. Sơ đồ Lớp (Class Diagram - FR-31)
![Class Diagram FR-31](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_CD_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_CD_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.drawio)

#### 2. Sơ đồ Tuần tự (Sequence Diagram - FR-31)
![Sequence Diagram FR-31](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.png)

- 📄 **Tải / Xem Vector SVG:** [SCANMS_SQ_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.svg)
- 📐 **Mở tệp thiết kế Draw.io:** [SCANMS_SQ_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.drawio)

---

---

### FR-32: Nhật ký kiểm toán toàn diện & Truy vết an ninh bất biến (Comprehensive Audit Logs)

- **Người chịu trách nhiệm & Code Defense:** **Phan Xuân Thịnh (SE184527)**
- **Mô tả nghiệp vụ:** Ghi nhận nhật ký an ninh bất biến (Append-Only) cho mọi thao tác POST/PUT/PATCH/DELETE. Tự động làm sạch dữ liệu nhạy cảm (sanitization), gắn mã băm EventId và xuất báo cáo CSV an toàn.
- **Ánh xạ kiến trúc kỹ thuật:**
  - **Frontend UI / Components:** `AuditLogsPage.tsx, AuditDetailModal.tsx`
  - **Backend API & Service:** `AuditController.getAuditLogs, AuditService.recordAuditLog, AuditInterceptor`
  - **Prisma Models / Database Tables:** `AuditLog, User, EventId (Unique Hash)`

##

---

## 3. DANH MỤC 16 TỆP SƠ ĐỒ KỸ THUẬT (BẢNG TRA CỨU)

| STT | Mã chức năng & Tên sơ đồ | Loại | Tệp Ảnh (PNG 2x) | Tệp Vector (SVG) | Tệp Thiết kế Draw.io |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **49** | **FR-25:** ClassDiagram FR25 | **Class Diagram** | [SCANMS_CD_FR25.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.png) | [SCANMS_CD_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.svg) | [SCANMS_CD_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR25.drawio) |
| **50** | **FR-25:** Sequence FR25 | **Sequence Diagram** | [SCANMS_SQ_FR25.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.png) | [SCANMS_SQ_FR25.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.svg) | [SCANMS_SQ_FR25.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR25.drawio) |
| **51** | **FR-26:** ClassDiagram FR26 | **Class Diagram** | [SCANMS_CD_FR26.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.png) | [SCANMS_CD_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.svg) | [SCANMS_CD_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR26.drawio) |
| **52** | **FR-26:** Sequence FR26 | **Sequence Diagram** | [SCANMS_SQ_FR26.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.png) | [SCANMS_SQ_FR26.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.svg) | [SCANMS_SQ_FR26.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR26.drawio) |
| **53** | **FR-27:** ClassDiagram FR27 | **Class Diagram** | [SCANMS_CD_FR27.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.png) | [SCANMS_CD_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.svg) | [SCANMS_CD_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR27.drawio) |
| **54** | **FR-27:** Sequence FR27 | **Sequence Diagram** | [SCANMS_SQ_FR27.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.png) | [SCANMS_SQ_FR27.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.svg) | [SCANMS_SQ_FR27.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR27.drawio) |
| **55** | **FR-28:** ClassDiagram FR28 | **Class Diagram** | [SCANMS_CD_FR28.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.png) | [SCANMS_CD_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.svg) | [SCANMS_CD_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR28.drawio) |
| **56** | **FR-28:** Sequence FR28 | **Sequence Diagram** | [SCANMS_SQ_FR28.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.png) | [SCANMS_SQ_FR28.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.svg) | [SCANMS_SQ_FR28.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR28.drawio) |
| **57** | **FR-29:** ClassDiagram FR29 | **Class Diagram** | [SCANMS_CD_FR29.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.png) | [SCANMS_CD_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.svg) | [SCANMS_CD_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR29.drawio) |
| **58** | **FR-29:** Sequence FR29 | **Sequence Diagram** | [SCANMS_SQ_FR29.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.png) | [SCANMS_SQ_FR29.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.svg) | [SCANMS_SQ_FR29.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR29.drawio) |
| **59** | **FR-30:** ClassDiagram FR30 | **Class Diagram** | [SCANMS_CD_FR30.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.png) | [SCANMS_CD_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.svg) | [SCANMS_CD_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR30.drawio) |
| **60** | **FR-30:** Sequence FR30 | **Sequence Diagram** | [SCANMS_SQ_FR30.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.png) | [SCANMS_SQ_FR30.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.svg) | [SCANMS_SQ_FR30.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR30.drawio) |
| **61** | **FR-31:** ClassDiagram FR31 | **Class Diagram** | [SCANMS_CD_FR31.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.png) | [SCANMS_CD_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.svg) | [SCANMS_CD_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR31.drawio) |
| **62** | **FR-31:** Sequence FR31 | **Sequence Diagram** | [SCANMS_SQ_FR31.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.png) | [SCANMS_SQ_FR31.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.svg) | [SCANMS_SQ_FR31.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR31.drawio) |
| **63** | **FR-32:** ClassDiagram FR32 | **Class Diagram** | [SCANMS_CD_FR32.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.png) | [SCANMS_CD_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.svg) | [SCANMS_CD_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_CD_FR32.drawio) |
| **64** | **FR-32:** Sequence FR32 | **Sequence Diagram** | [SCANMS_SQ_FR32.png](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.png) | [SCANMS_SQ_FR32.svg](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.svg) | [SCANMS_SQ_FR32.drawio](file:///c:/HW/CAPSTONE/docs/review%202/diagrams/SCANMS_SQ_FR32.drawio) |

---

## 4. CHECKLIST SẴN SÀNG BẢO VỆ

- [x] Thuộc lòng 100% luồng tương tác và các bước xử lý trong 8 sơ đồ Sequence Diagram.
- [x] Nắm rõ cấu trúc class, kiểu dữ liệu DTO, quan hệ thực thể Prisma trong 8 sơ đồ Class Diagram.
- [x] Mở sẵn file code thật trong VS Code và sẵn sàng trình diễn trong vòng 15 giây khi GV Review 2 đặt câu hỏi.
