# SCANMS - TỔNG HỢP TOÀN BỘ Ý TƯỞNG THIẾT KẾ SLIDE REVIEW 2 & KIẾN TRÚC ĐỐI SOÁT TÀI CHÍNH FR-09

> **Dự án:** SCANMS - Sales Collaborator & Affiliate Network Management System (FA26SE032)  
> **Tài liệu:** Biên bản Lưu trữ Toàn diện Ý tưởng Slide Review 2 & Thẩm định Nghiệp vụ Đối soát KPI Doanh số (FR-09)  
> **Tác giả:** Nguyễn Thành Thắng (Team Leader) & AI Senior System Architect  
> **Thời điểm cập nhật:** 26/10/2026  
> **Trạng thái:** Sẵn sàng thực thi khi Leader yêu cầu  

---

## MỤC LỤC
1. [PHẦN 1: LƯU TRỮ TRỌN VẸN 11 Ý TƯỞNG CHUẨN HÓA SLIDE THUYẾT TRÌNH REVIEW 2](#phần-1-lưu-trữ-trọn-vẹn-11-ý-tưởng-chuẩn-hóa-slide-thuyết-trình-review-2)
2. [PHẦN 2: THẨM ĐỊNH TÍNH NĂNG FR-09 & PHÂN TÍCH HIỆN TƯỢNG "NGUYỄN MAXIDE"](#phần-2-thẩm-định-tính-năng-fr-09--phân-tích-hiện-tượng-nguyễn-maxide)
3. [PHẦN 3: SO SÁNH VỚI CHUẨN BUSINESS TMĐT THỰC TẾ (BENCHMARK SHOPEE / TIKTOK SHOP)](#phần-3-so-sánh-với-chuẩn-business-tmđt-thực-tế-benchmark-shopee--tiktok-shop)
4. [PHẦN 4: GIẢI PHÁP TRUYỀN THÔNG MỐC THƯỞNG CHO KOL (MARKETING & CAMPAIGN MOTIVATION)](#phần-4-giải-pháp-truyền-thông-mốc-thưởng-cho-kol-marketing--campaign-motivation)
5. [PHẦN 5: MÔ HÌNH DÒNG TIỀN ESCROW TRUNG GIAN SÀN & CƠ CHẾ SHOP TRẢ THƯỞNG CHO KOL](#phần-5-mô-hình-dòng-tiền-escrow-trung-gian-sàn--cơ-chế-shop-trả-thưởng-cho-kol)
6. [PHẦN 6: CHU KỲ CHI TRẢ THƯỞNG NGÀY 15 & VÙNG ĐỆM BẢO CHỨNG ĐỔI TRẢ 14 NGÀY](#phần-6-chu-kỳ-chi-trả-thưởng-ngày-15--vùng-đệm-bảo-chứng-đổi-trả-14-ngày)
7. [PHẦN 7: CƠ CHẾ KPI DEAL ĐỘC QUYỀN (FR-27) & CÁC CHỨC NĂNG CÓ KPI TƯƠNG TỰ TRÊN SCANMS](#phần-7-cơ-chế-kpi-deal-độc-quyền-fr-27--các-chức-năng-có-kpi-tương-tự-trên-scanms)
8. [PHẦN 8: ĐÁNH GIÁ CHUYÊN SÂU CHUẨN BUSINESS SO VỚI SHOPEE/TIKTOK SHOP & MA TRẬN ẢNH HƯỞNG TỚI CÁC TÍNH NĂNG KHÁC](#phần-8-đánh-giá-chuyên-sâu-chuẩn-business-so-với-shopeetiktok-shop--ma-trận-ảnh-hưởng-tới-các-tính-năng-khác)
9. [PHẦN 9: KẾ HOẠCH HÀNH ĐỘNG TRIỂN KHAI TOÀN DIỆN (EXECUTION PLAN FULL FLOW)](#phần-9-kế-hoạch-hành-động-triển-khai-toàn-diện-execution-plan-full-flow)

---

## PHẦN 1: LƯU TRỮ TRỌN VẸN 11 Ý TƯỞNG CHUẨN HÓA SLIDE THUYẾT TRÌNH REVIEW 2

Toàn bộ 11 điểm chuẩn hóa nội dung bài thuyết trình Review 2 và Hội đồng tốt nghiệp đã được rà soát và lưu trữ chính xác theo chỉ đạo của Leader Nguyễn Thành Thắng:

| Slide | Tên Slide | Hiện Trạng Cần Sửa | Giải Pháp Chuẩn Hóa Chi Tiết |
| :---: | :--- | :--- | :--- |
| **01** | **Bìa Thuyết Minh (Title Slide)** | Khung chữ nền trắng thô cứng đè lên hình ảnh nền `bg_title.png`. | **Bỏ hoàn toàn khung chữ trắng đè nền.** Typography hiển thị thanh thoát trực tiếp trên nền Canvas Vàng Be Soft Warm Sand (`#FAF8F5`), viền chữ và điểm nhấn Brand Gold (`#C59B58`). |
| **02** | **Mục Lục (Agenda)** | Các khối hộp trắng thô kệch đè lên nền. | **Bỏ các khối trắng đè nền.** Thiết kế lại các mục theo dạng thẻ card Be Warm Sand (`#F3EFE6`) viền kim loại mảnh (`#EAE4D7`), số thứ tự `01 - 05` màu Brand Gold đậm nét. |
| **03** | **Công Nghệ & 4 Phân Hệ (Portals)** | Tên gọi các phân hệ chưa chuẩn mực theo kiến trúc đa cổng. | **Chuẩn hóa danh xưng 4 phân hệ chính:**<br>1. *Customer Web App* (Khách mua hàng & Livestream)<br>2. *Collaborator Portal* (KOL/KOC tiếp thị & sinh link/voucher)<br>3. *Shop Manager Portal* (Quản lý gian hàng & sản phẩm 6 khối)<br>4. *System Admin & Manager Console* (Vận hành, KYC & Giám sát tài chính) |
| **04** | **Kiến Trúc Tổng Quan (Architecture)** | Sơ đồ kiến trúc chưa cập nhật phiên bản mới nhất. | **Thay thế bằng sơ đồ kiến trúc chuẩn:** [SCANMS_OVERVIEW_ARCHITECTURE.png](file:///c:/HW/CAPSTONE/docs/review%202/SCANMS_OVERVIEW_ARCHITECTURE.png) thể hiện rõ ràng các tầng Client, API Gateway, Micro-services, PostgreSQL, Redis và Cổng thanh toán. |
| **05** | **Sơ Đồ Dữ Liệu (Conceptual ERD)** | Đã đạt chuẩn thiết kế 16 thực thể 5 cụm logic. | **Giữ nguyên Conceptual ERD.** Duy trì cấu trúc 16 bảng dữ liệu then chốt phân chia thành 5 cụm: Identity & RBAC, Merchant & Product, Affiliate Engine, E-Commerce & Escrow, Communications. |
| **06** | **Chân Dung Tác Nhân (Actors & Roles)** | Xuất hiện khối văn bản giải thích RBAC rườm rà ở đáy slide làm che khuất các Actor. | **Xóa bỏ hoàn toàn khối text RBAC ở đáy slide.** Tăng diện tích hiển thị cho 5 Avatar tác nhân: *Customer, Collaborator, Shop Manager, System Manager, System Admin*. |
| **07** | **Quy Trình 1: Định Danh KYC** | Luồng xét duyệt KYC đa cấp đã đúng logic. | **Giữ nguyên (OK).** Thể hiện luồng nộp CCCD/GPKD $\rightarrow$ OCR & Face Match $\rightarrow$ System Manager phê duyệt. |
| **08** | **Quy Trình 2: Deal & Livestream** | Thiếu tính năng Shop mời Livestream qua Chat; thừa banner công thức ở đáy. | **Bổ sung:** Shop chủ động gửi Lời mời tham gia phiên Live qua Chat Socket.IO & Cơ chế cộng thêm hoa hồng phiên Live (+2% đến +3%).<br>**Xóa bỏ:** Khối banner công thức hoa hồng ở đáy slide để tránh rối mắt. |
| **09** | **Quy Trình 3: Mua Hàng & Attribution** | Chân slide có dòng mô tả công nghệ Attribution dư thừa. | **Xóa bỏ dòng mô tả Attribution ở chân slide.** Tập trung làm nổi bật luồng: Click Smart Link $\rightarrow$ Last-Click Cookie 30 ngày $\rightarrow$ Đặt hàng PayOS/COD. |
| **10** | **Quy Trình 4: Vận Chuyển & Đổi Trả** | Luồng khiếu nại chưa tách rõ nhánh khi Shop Từ chối thì ai phân xử. | **Tách rõ nhánh Trả hàng / Hoàn tiền (Returns & Disputes):**<br>- *Nhánh 1:* Shop Đồng ý $\rightarrow$ Hoàn tiền cho khách & Sàn tự động thu hồi hoa hồng (Clawback).<br>- *Nhánh 2:* Shop Từ chối $\rightarrow$ **System Manager** đóng vai trò trọng tài độc lập, đối soát Video mở hộp của Khách vs Camera đóng hàng của Shop. |
| **11** | **Quy Trình 5: Chi Trả Hoa Hồng (Payout)** | Đang ghi tác nhân duyệt lệnh chi là System Manager. | **Đổi tác nhân duyệt tiền thành System Admin (Super Admin).** System Manager chỉ vận hành; duy nhất Super Admin mới nắm độc quyền kho bạc và phê duyệt lệnh chi trả qua Napas 24/7. |

---

## PHẦN 2: THẨM ĐỊNH TÍNH NĂNG FR-09 & PHÂN TÍCH HIỆN TƯỢNG "NGUYỄN MAXIDE"

### 1. Dữ liệu tính năng có bị Hardcode không?
- **KẾT LUẬN: DỮ LIỆU HOÀN TOÀN KHÔNG BỊ HARDCODE MOCK TĨNH.**
  - Danh sách KOL được truy vấn thực tế từ PostgreSQL: `GET /api/store-collaborators/shop?storeId=...` truy vấn bảng `store_collaborators` kết hợp `users`.
  - Tiến độ doanh số và mốc thưởng được tính toán trực tiếp từ API: `GET /api/stores/:storeId/commission-rules/kol-progress/:kolId?yearMonth=...` quét bảng `orders`, lọc đơn `status = 'COMPLETED'` trong kỳ tháng, tự động cấn trừ tiền hoàn hàng (`refunds`), so khớp mốc trong bảng `commission_rules` để ra công thức thưởng lũy tiến.
- **Điểm "Code Smell" duy nhất:**
  - Tại file [CommissionRulesPage.tsx:L185-192](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/CommissionRulesPage.tsx#L185-L192), code có đoạn fallback gán UUID cứng `a7e7bd20-bebc-44c9-a98b-004de44cf773` nếu `localStorage` chưa có `current_store_id` và `/auth/me` không trả về shop.

### 2. Tại sao người được chọn lại là "Nguyễn Maxide" và hiển thị "đang đánh giá"?
- **Nguyễn Maxide là ai trong hệ thống?**
  - Trong DB thật, bảng `users` có tài khoản `fb601358-52f9-48d7-9f53-af860dd820dd`, họ tên: **Nguyễn Maxide** (email `hang2004g@gmail.com`, vai trò `COLLABORATOR`).
  - Tài khoản này đã gửi yêu cầu hợp tác và được Shop Sora Skin duyệt (`status = 'APPROVED'`). Shop Sora Skin hiện có 4 KOL đối tác: *Nguyễn Maxide, Nguyễn Mai Anh, Đinh Thảo Nhi, Phan Hải Yến*.
- **Tại sao Nguyễn Maxide lại tự động hiển thị trước?**
  - Backend [store-collaborators.service.ts:L110](file:///c:/HW/CAPSTONE/backend/src/modules/commission-rules/store-collaborators.service.ts#L110) sắp xếp danh sách:
    ```typescript
    orderBy: { createdAt: 'desc' }
    ```
    Do tài khoản *Nguyễn Maxide* được duyệt gần đây nhất nên đứng ở **vị trí số 0 (`list[0]`)** trong mảng kết quả.
  - Frontend [CommissionRulesPage.tsx:L148](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/CommissionRulesPage.tsx#L148) tự động chọn phần tử đầu tiên:
    ```typescript
    if (list.length > 0) setSelectedKolId((prev) => prev || list[0].id);
    ```
    Dẫn đến việc thẻ hiệu suất của Nguyễn Maxide lập tức được tải lên giao diện.
- **Tại sao lại có chữ "đang đánh giá / ⏳ Kỳ đang diễn ra (Ước tính)"?**
  - Bộ lọc mặc định chọn tháng hiện tại (Tháng 10/2026).
  - Vì tháng 10 chưa kết thúc nên trạng thái backend là `settlementStatus = 'ACCUMULATING'` (doanh số vẫn đang nhảy theo từng đơn hàng mới phát sinh).
  - Giao diện gắn huy hiệu `"⏳ Kỳ đang diễn ra (Ước tính)"` để phân biệt với kỳ đã qua (`"🏁 Kỳ đã kết thúc"`).

---

## PHẦN 3: SO SÁNH VỚI CHUẨN BUSINESS TMĐT THỰC TẾ (BENCHMARK SHOPEE / TIKTOK SHOP)

| Tiêu Chí Nghiệp Vụ | Chuẩn Sàn TMĐT Lớn (Shopee / TikTok Shop / AccessTrade) | Hiện Trạng Trên SCANMS | Nhận Xét & Khuyến Nghị Cải Tiến |
| :--- | :--- | :--- | :--- |
| **Giao diện Giám sát KOL** | **Bảng Ma Trận Tổng Hợp Toàn Đội Ngũ (Overview Leaderboard Table):** Hiển thị toàn bộ 50–200 KOL trong tháng trên 1 bảng: Doanh số, Đơn hoàn thành, Mốc chạm, Thưởng ước tính, Trạng thái. | **Thẻ Đơn Lẻ (Single Card) + Dropdown:** Chỉ hiển thị 1 người duy nhất được chọn trong dropdown. | ⚠️ **Thiếu tính bao quát.** Bắt buộc phải bổ sung Bảng Tổng Hợp Doanh Số KOL để chủ shop không phải bấm từng người. |
| **Cơ Chế Chốt Đối Soát** | **Chốt Hàng Loạt (Batch Settlement):** Nút *"Chốt sổ toàn bộ KOL đủ điều kiện"* hoặc Cronjob tự động đóng sổ cuối tháng. | **Chốt Từng Người (Single Settle):** Phải bấm nút chốt riêng lẻ cho từng người một. | ⚠️ **Cần nâng cấp:** Thêm nút *"Chốt sổ hàng loạt"* cho tất cả KOL đạt mốc trong kỳ tháng trước. |
| **Tính Hợp Lệ Của Doanh Số** | Chỉ tính đơn giao thành công, qua hạn đổi trả, tự động trừ tiền đơn hoàn hàng (Net GMV). | Backend làm rất chuẩn: lọc đơn `COMPLETED`, trừ `refunds`, ghi `auditLog`. | ✅ **Rất xuất sắc.** Logic kế toán backend rất chặt chẽ. |
| **Công Thức Tính Thưởng** | Lũy tiến từng phần (Progressive Brackets) hoặc Thưởng mốc cao nhất (Achievement Milestone). | Hỗ trợ tính lũy tiến chuẩn xác, có chuỗi công thức minh bạch (`formulaParts`). | ✅ **Rất chuẩn mực.** |
| **Thời Điểm Khóa Sổ** | Không cho chốt chính thức giữa tháng; phải chờ qua ngày cuối cùng của tháng. | Giao diện đang cho phép bấm *"Chốt sớm kỳ này (Dự kiến)"* ngay giữa tháng. | ⚠️ **Cần siết lại:** Giữa tháng chỉ cho xem ước tính, không sinh phiếu chi trả chính thức. |

---

## PHẦN 4: GIẢI PHÁP TRUYỀN THÔNG MỐC THƯỞNG CHO KOL (MARKETING & CAMPAIGN MOTIVATION)

### Vấn đề:
Shop ban hành chính sách thưởng tháng nhưng KOL không được thông báo thì chính sách sẽ hoàn toàn mất tác dụng kích cầu doanh số.

### Giải pháp Truyền thông 3 Lớp Bắt Buộc Phải Có:
1. **Lớp 1: In-App Notification (Trung tâm thông báo `NotificationDropdown.tsx`):**
   - Khi Shop lưu mốc thưởng tháng (`POST /api/stores/:storeId/commission-rules`), backend tự động phát thông báo tới tất cả KOL thuộc Shop Team:
     > *"🎉 Shop Sora Skin vừa kích hoạt chương trình Thưởng Doanh Số Tháng 10/2026! Đạt mốc nhận thưởng lên tới 5.000.000đ. Nhấp để xem chi tiết mốc thưởng!"*
2. **Lớp 2: Thẻ Chiến Dịch Tự Động Qua Chat Socket.IO (Broadcast Campaign Card):**
   - Hệ thống tự động đẩy một Thẻ tin nhắn hệ thống (System Message Card) vào khung chat riêng giữa Shop và từng KOL:
     - Thẻ hiển thị: Tên mốc thưởng, Tỷ lệ % thưởng thêm, Mốc doanh số cần chạm, Nút CTA *"Xem tiến độ của tôi"*.
3. **Lớp 3: Huy Hiệu Trực Quan Trên Marketplace & Portal KOL:**
   - Tại trang tìm kiếm sản phẩm và trang chi tiết Shop trên sàn, gắn huy hiệu:
     `🔥 Shop đang có chương trình Thưởng Mốc Tháng`
   - Tại Portal của KOL, thêm tab **"Tiến độ Thưởng Tháng"** hiển thị thanh tiến độ (Progress Bar): Đã đạt bao nhiêu triệu, còn thiếu bao nhiêu triệu để nhảy lên bậc thưởng kế tiếp.

---

## PHẦN 5: MÔ HÌNH DÒNG TIỀN ESCROW TRUNG GIAN SÀN & CƠ CHẾ SHOP TRẢ THƯỞNG CHO KOL

### 1. Bản chất Sàn Trung Gian giữ tiền Escrow:
- Khách mua hàng $\rightarrow$ 100% tiền thanh toán (PayOS / VietQR / COD) đổ về **Tài khoản Trung gian Treo (Escrow Account)** do Sàn SCANMS quản lý.
- Sàn tạm giữ tiền này trong suốt hành trình vận chuyển và thời hạn 14 ngày bảo chứng đổi trả.

### 2. Shop sẽ trả tiền thưởng tháng cho KOL như thế nào?
Áp dụng **MÔ HÌNH 1: CẤN TRỪ DOANH THU ESCROW TỰ ĐỘNG (Net Clearing / Auto-Deduction - Chuẩn Shopee & TikTok Shop)**:
- **Cơ chế vận hành:**
  - Trong suốt tháng, Sàn đang giữ toàn bộ tiền bán hàng của Shop (ví dụ Shop bán được 100 triệu tiền hàng).
  - Hết tháng, đối soát xác nhận KOL Nguyễn Maxide đạt mốc KPI và được thưởng **2.500.000đ**.
  - Sàn SCANMS đóng vai trò **Trung tâm Bù trừ Tài chính (Clearing House)**:
    1. Sàn **tự động cấn trừ 2.500.000đ** từ cục tiền doanh thu bán hàng của Shop mà Sàn đang giữ.
    2. Sàn cộng ngay 2.500.000đ này vào **Ví khả dụng (Available Wallet)** của KOL.
    3. Đến kỳ thanh toán tiền hàng cho Shop, Sàn chỉ chuyển khoản cho Shop:
       $$\text{Tiền hàng Shop nhận} = 100.000.000đ - \text{Phí sàn} - \text{Hoa hồng thường (10%)} - 2.500.000đ (\text{Thưởng tháng})$$
- **Ưu điểm vượt trội:**
  - Chủ shop **không cần nạp tiền ví hay tự chuyển khoản ngân hàng thủ công**.
  - Tiền thưởng được trích trực tiếp từ chính doanh thu bán hàng khổng lồ mà KOL đã mang về cho Shop.
  - Loại bỏ hoàn toàn rủi ro Shop "bùng" thưởng của KOL vì Sàn đã nắm giữ dòng tiền trong quỹ Escrow.

### 3. Cảnh báo Lỗ hổng Logic hiện tại trong Code Backend:
- Tại hàm `payoutSettlement` trong file [commission-rules.service.ts:L1528-1538](file:///c:/HW/CAPSTONE/backend/src/modules/commission-rules/commission-rules.service.ts#L1528-L1538):
  - Hiện tại code chỉ mới gọi lệnh **CỘNG TIỀN VÀO VÍ KOL** (`walletsService.creditAvailableBalance`).
  - Code **CHƯA CÓ LỆNH TRỪ TIỀN DOANH THU CỦA SHOP**!
  - Cần phải bổ sung logic ghi nợ hoặc trừ số dư doanh thu Escrow của Shop để dòng tiền cân bằng tuyệt đối (Tổng Nợ = Tổng Có).

---

## PHẦN 6: CHU KỲ CHI TRẢ THƯỞNG NGÀY 15 & VÙNG ĐỆM BẢO CHỨNG ĐỔI TRẢ 14 NGÀY

### Tại sao không được trả thưởng vào ngày 01 đầu tháng sau?
Vì khách mua hàng ngày 29–31 cuối tháng thì đến ngày 03–05 tháng sau mới nhận được hàng. Khách còn có **thời hạn đổi trả / khiếu nại hoàn tiền (14 ngày)**! Nếu trả sớm, khách hoàn đơn thì Sàn và Shop sẽ bị lỗ.

### Chu kỳ 4 Giai đoạn Chuẩn mực:
*(Ví dụ cho **Kỳ thưởng Tháng 10/2026**)*

```
[01/10 ------------ 31/10] ---> [01/11 ------------ 14/11] ---> [15/11] ----------> [16/11 - 20/11]
     GIAI ĐOẠN 1                      GIAI ĐOẠN 2                GIAI ĐOẠN 3            GIAI ĐOẠN 4
   Tích lũy Doanh số             Đóng băng & Chờ đổi trả        Chốt sổ Escrow       KOL Rút tiền Napas
  (KOL cày đơn, Live)            (Vùng đệm 14 ngày an toàn)     (Cấn trừ tự động)    (Giải ngân về STK)
```

1. **Giai đoạn 1: Tích Lũy Doanh Số (01/10 – 31/10):**
   - KOL push link, Livestream, kéo đơn.
   - Doanh số và mốc thưởng nhảy liên tục trên Dashboard ở trạng thái: `⏳ ACCUMULATING` (Ước tính).
2. **Giai đoạn 2: Vùng Đệm Đóng Băng Chờ Đổi Trả (01/11 – 14/11):**
   - Đóng sổ tháng 10 (đơn mới tính sang tháng 11).
   - Chờ 14 ngày bảo chứng (`COMMISSION_HOLD_DAYS = 14`).
   - Mọi đơn khiếu nại, trả hàng, hoàn tiền (`REFUNDED`) được trừ sạch sẽ để chốt **Doanh số thực tế hợp lệ (Net Valid GMV)**.
3. **Giai đoạn 3: Chốt Sổ & Cấn Trừ Escrow (Ngày 15/11 - Giữa tháng kế tiếp):**
   - 100% đơn hàng tháng 10 đã hết hạn đổi trả, an toàn tuyệt đối.
   - Sàn tự động chốt mốc thưởng chính thức (`🏁 SETTLED`).
   - Sàn cấn trừ tiền thưởng từ quỹ Escrow tiền hàng của Shop $\rightarrow$ Bơm vào Ví khả dụng của KOL.
4. **Giai đoạn 4: Giải Ngân Về Ngân Hàng (16/11 – 20/11):**
   - KOL tạo lệnh Rút tiền (Withdrawal) về tài khoản ngân hàng qua Napas 24/7.
   - Sàn thanh toán phần tiền hàng còn lại về tài khoản ngân hàng của Shop.

### Cơ chế bọc lót khi phát sinh hoàn tiền muộn (Late Refund Edge Case):
Nếu sau ngày 15/11 mới phát sinh hoàn tiền đặc biệt, cơ chế **Điều chỉnh âm (`BonusAdjustment`)** tại [commission-rules.service.ts:L1965-1977](file:///c:/HW/CAPSTONE/backend/src/modules/commission-rules/commission-rules.service.ts#L1965-L1977) sẽ tự động tạo khoản trừ âm (ví dụ: `-500.000đ`) cấn trừ trực tiếp vào tiền thưởng của **Kỳ tháng 11 kế tiếp**. Nhờ đó Sàn và Shop không bao giờ bị mất tiền.

---

## PHẦN 7: CƠ CHẾ KPI DEAL ĐỘC QUYỀN (FR-27) & CÁC CHỨC NĂNG CÓ KPI TƯƠNG TỰ TRÊN SCANMS

Trong hệ thống SCANMS, không chỉ có **FR-09 (Thưởng mốc doanh số tháng)** mới có KPI, mà còn có **4 hệ thống tính năng khác** cũng gắn liền với cam kết chỉ tiêu (KPI) và chịu ảnh hưởng trực tiếp bởi **thời hạn đổi trả/hoàn tiền 14 ngày**.

---

### 1. KPI DEAL HOA HỒNG ĐỘC QUYỀN 2 CHIỀU (FR-27 - EXCLUSIVE DEAL PROPOSALS)
- **Bản chất nghiệp vụ:** 
  - KOL gửi Proposal xin mức hoa hồng VIP (ví dụ: xin mức $18\% - 20\%$ thay vì mức chuẩn $10\%$) HOẶC Shop chủ động mời Top KOL với deal đặc quyền.
  - Đổi lại, KOL phải **cam kết chỉ tiêu KPI** với Shop:
    + `targetOrders`: Số lượng đơn hàng tối thiểu phải chốt được (ví dụ: cam kết tối thiểu 20 đơn sản phẩm).
    + `commitmentDays`: Thời gian chạy cam kết (từ 1 đến 365 ngày, ví dụ 30 ngày).
- **Cơ chế tính KPI trong mã nguồn (`deal-kpi.policy.ts`):**
  - Thời điểm bắt đầu: Khi Shop duyệt deal (`commitmentStartedAt = approvalDate`).
  - Hết hạn chạy bán hàng: `commitmentEndsAt = commitmentStartedAt + commitmentDays`.
  - **Vùng đệm an toàn 14 ngày (`DEAL_SETTLEMENT_DAYS = 14`):**
    ```typescript
    settlementEndsAt = commitmentEndsAt + 14 ngày
    ```
- **Hệ thống trạng thái vòng đời Deal KPI:**
  1. `ACTIVE`: Đang trong thời gian chạy bán hàng (`now < commitmentEndsAt`).
  2. `SETTLING`: Đã hết ngày bán, đang trong **Vùng đệm 14 ngày chờ giao hàng và hết hạn khiếu nại đổi trả** (`now < settlementEndsAt`). Trong giai đoạn này chưa được chốt deal!
  3. `ACHIEVED`: Đến ngày thứ 14 (`now >= settlementEndsAt`), nếu `completedOrders >= targetOrders` $\rightarrow$ Đạt cam kết thành công! Deal hoàn tất vẻ vang.
  4. `REVIEW_REQUIRED`: Đến ngày thứ 14, nếu `completedOrders < targetOrders` $\rightarrow$ **Không đạt cam kết**.
- **TRẢ LỜI CÂU HỎI: NẾU TRONG THÁNG ĐỦ KPI NHƯNG TRONG THỜI GIAN TRẢ HÀNG KHÁCH TRẢ THÌ SAO?**
  - **Quy tắc tính đơn hợp lệ (`dealOrderWhere`):** Hệ thống chỉ đếm các đơn hàng có trạng thái `status = 'COMPLETED'` và **KHÔNG BỊ HOÀN TIỀN (`refunds = []`)**!
  - **Kịch bản thực tế:**
    - Trong tháng, KOL chốt được 21 đơn (cam kết là 20 đơn $\rightarrow$ Tưởng như đã đạt).
    - Nhưng trong 14 ngày đệm `SETTLING`, có 2 khách khiếu nại trả hàng và được duyệt hoàn tiền $\rightarrow$ Số đơn hợp lệ thực tế tụt xuống còn **19 đơn** ($19 < 20$).
    - Đến ngày `settlementEndsAt`, hệ thống tự động đánh giá: **`REVIEW_REQUIRED` (KHÔNG ĐẠT KPI)**!
  - **Chế tài xử lý khi không đạt KPI (`terminateDeal` trong `affiliate-deals.service.ts`):**
    Khi trạng thái là `REVIEW_REQUIRED`, Shop Manager có toàn quyền kích hoạt chế tài:
    1. **Đóng deal độc quyền ngay lập tức:** Trạng thái deal chuyển sang `CLOSED`.
    2. **Hạ mức hoa hồng về tiêu chuẩn:** Toàn bộ các đơn hàng mới phát sinh lập tức quay về mức hoa hồng sàn cơ sở ($10\%$).
    3. **Áp dụng thời gian phạt "Đóng băng" (Cooldown Penalty):** Tạm khóa quyền gửi Proposal deal độc quyền mới của KOL trong **2 đến 4 tuần** (`cooldownUntil`).
    4. **Ghi vết vi phạm tín nhiệm:** Tăng biến đếm vi phạm cam kết (`violationsCount`) trên hồ sơ KOL và lưu nhật ký Audit Log.
    5. **Bắn thông báo qua Chat:** Hệ thống tự động gửi thẻ phạt cảnh báo qua khung Chat Socket.IO để cả Shop và KOL đều nắm rõ lý do bị hủy deal.

---

### 2. KPI XIN HÀNG MẪU 14 NGÀY (FR-25 - SAMPLE PRODUCT REQUESTS)
- **Bản chất nghiệp vụ:** KOL nhận sản phẩm mẫu miễn phí từ Shop để trải nghiệm thực tế.
- **Cam kết KPI:** Trong vòng **14 ngày** kể từ ngày nhận hàng thành công, KOL bắt buộc phải đăng Video review / Livestream gắn link sản phẩm và nộp URL bằng chứng lên hệ thống.
- **Nếu vi phạm KPI (quá 14 ngày không nộp bài review):**
  - Hệ thống tự động đánh cờ trạng thái `OVERDUE`.
  - Shop có quyền gửi khiếu nại vi phạm hàng mẫu (`Sample Request Dispute`) lên Sàn.
  - **System Manager** vào phân xử:
    + Khóa vĩnh viễn hoặc tạm thời quyền xin hàng mẫu mới của KOL (`sampleRequestsBlockedAt`).
    + Tịch thu tiền bảo chứng / phạt phí ship mẫu (`sampleShippingCharges`).
    + Hạ điểm tín nhiệm uy tín của KOL trên toàn sàn.

---

### 3. KPI CẤP BẬC KOL TOÀN SÀN (TIER RANKING ENGINE)
- **Bản chất nghiệp vụ:** KOL bán càng nhiều thì cấp bậc càng cao, nhận thêm % hoa hồng cấp bậc:
  - Hạng Bạc (Silver): Doanh số đạt 20 triệu $\rightarrow$ Cộng $+1\%$ hoa hồng.
  - Hạng Vàng (Gold): Doanh số đạt 50 triệu $\rightarrow$ Cộng $+2\%$ hoa hồng.
  - Hạng Kim Cương (Diamond): Doanh số đạt 100 triệu $\rightarrow$ Cộng $+3\%$ hoa hồng.
- **Ảnh hưởng khi bị trả hàng:**
  - Doanh số xếp hạng cấp bậc được tính dựa trên **Doanh số thực thu ròng (Net Valid Revenue)**.
  - Nếu khách trả hàng số lượng lớn trong thời hạn 14 ngày, doanh số tích lũy của KOL bị kéo tụt xuống dưới ngưỡng duy trì hạng $\rightarrow$ Hệ thống tự động **Giáng cấp (Downgrade)** về bậc thấp hơn và hủy bỏ tỷ lệ % thưởng cấp bậc tương ứng.

---

### 4. KPI PHIÊN LIVESTREAM BÁN HÀNG (LIVE SHOPPING SESSION)
- **Bản chất nghiệp vụ:** Shop và KOL thỏa thuận phiên Live (được hưởng ưu đãi hoa hồng $+2\%$ đến $+3\%$ trong phiên Live).
- **Cam kết KPI:** KOL cam kết thời lượng live tối thiểu (ví dụ: live ít nhất 90 phút) và ghim đủ các sản phẩm deal của Shop.
- **Nếu vi phạm KPI (KOL bỏ ca live hoặc tắt live sớm):**
  - Mức hoa hồng $+2\%$ live lập tức bị ngắt.
  - Shop có thể gắn cờ chặn hợp tác Live với KOL đó (`liveCooperationBlocked = true`).
  - Nếu vi phạm nhiều lần, Sàn áp dụng lệnh cấm Live toàn sàn (`liveRestrictionUntil`).

---

### TỔNG KẾT BẢN ĐỒ CÁC TÍNH NĂNG GẮN VỚI KPI TRÊN SCANMS

| Tính Năng | Chỉ Tiêu KPI Cam Kết | Vùng Đệm An Toàn | Hậu Quả Nếu Bị Trả Hàng Khiến Rớt KPI |
| :--- | :--- | :--- | :--- |
| **FR-09: Thưởng Doanh Số Tháng** | Doanh số bán hợp lệ trong tháng (VNĐ) | 14 ngày (01 - 14 tháng sau) | Không được nhận tiền thưởng mốc đó (tụt bậc thưởng hoặc 0đ). Nếu đã nhận mà hoàn muộn thì cấn trừ âm kỳ sau. |
| **FR-27: Deal Hoa Hồng Độc Quyền** | Số đơn hàng mục tiêu (`targetOrders`) | 14 ngày (`DEAL_SETTLEMENT_DAYS = 14`) | Deal bị hủy, hoa hồng quay về $10\%$, bị khóa quyền xin deal 2–4 tuần, tăng điểm vi phạm. |
| **FR-25: Xin Mẫu Thử Miễn Phí** | 14 ngày phải đăng video review gắn link | 14 ngày từ khi nhận hàng | Bị mở Dispute, khóa quyền xin mẫu thử, trừ điểm uy tín, mất tiền cọc ship. |
| **Tier Ranking: Cấp Bậc KOL** | Doanh số tích lũy 30–90 ngày | Tính theo đơn `COMPLETED` hết hạn đổi trả | Tụt hạng sao (Diamond $\rightarrow$ Gold $\rightarrow$ Silver), mất $+1\%$ đến $+3\%$ hoa hồng. |
| **Live Session: Livestream** | Thời lượng live và doanh số phiên Live | Trong suốt thời gian Live | Bị khóa hợp tác Live (`liveCooperationBlocked`), tước hoa hồng Live bonus. |

---

## PHẦN 8: ĐÁNH GIÁ CHUYÊN SÂU CHUẨN BUSINESS SO VỚI SHOPEE/TIKTOK SHOP & MA TRẬN ẢNH HƯỞNG TỚI CÁC TÍNH NĂNG KHÁC

### 1. Đánh giá tính hợp lý & So sánh chuẩn mực với Shopee & TikTok Shop
- **Shopee Seller Centre (Mô hình Quản lý Tiếp thị Liên kết Người Bán):**
  - Shopee cung cấp màn hình *"Hiệu quả Tiếp thị Liên kết"* hiển thị dạng **Bảng Danh Sách Toàn Bộ KOL** (Tên KOL, GMV mang lại, Đơn giao thành công, Tỷ lệ hủy/trả, Hoa hồng cơ sở và Thưởng bổ sung).
  - Shopee không bao giờ hiển thị dropdown chọn đơn lẻ từng người để quản lý thưởng.
  - Chu kỳ thanh toán của Shopee: Đóng kỳ vào ngày cuối tháng, kiểm toán đối soát trong 14 ngày đầu tháng sau, và **tự động cấn trừ vào "Số dư tài khoản người bán" (Seller Balance)** vào ngày 15–18.
- **TikTok Shop Creator Center (Chiến dịch Thưởng Mục Tiêu - Targeted Incentive):**
  - TikTok Shop cho phép Shop tạo mốc thưởng bậc thang (ví dụ: đạt 50 đơn tặng voucher hoặc tiền mặt).
  - Toàn bộ Creator tham gia chiến dịch đều nhận được thông báo đẩy và có thanh tiến độ (Progress Bar) hiển thị số đơn còn thiếu để chạm mốc thưởng.
  - Sau khi chiến dịch kết thúc, TikTok Shop giữ vùng đệm 14 ngày để xử lý hoàn tiền trước khi kết chuyển tiền thưởng vào Ví Creator.

$\Rightarrow$ **Nhận xét tính hợp lý:** Thiết kế chu kỳ 4 giai đoạn, vùng đệm 14 ngày, mô hình cấn trừ Escrow và bảng tổng hợp danh sách KOL mà SCANMS đang chuẩn hóa là **HOÀN TOÀN HỢP LÝ VÀ ĐẠT 100% CHUẨN MỰC TMĐT THỰC TẾ**.

---

### 2. Ma trận Đánh giá Mức độ Ảnh hưởng (Blast Radius & Impact Analysis)

| Phân Hệ / Chức Năng | Khả Năng Ảnh Hưởng | Điểm Rủi Ro Kỹ Thuật & Nghiệp Vụ | Giải Pháp Kiểm Soát An Toàn Tuyệt Đối |
| :--- | :---: | :--- | :--- |
| **1. Ví & Sổ Cái Tài Chính (FR-22 / FR-23)** | **Cao** | Bút toán cộng tiền thưởng vào Ví KOL (`creditAvailableBalance`) nếu không gắn với `storeId` sẽ khiến tiền bị "tự sinh ra từ không khí", làm sai lệch báo cáo dòng tiền của Sàn. | Bắt buộc truyền `storeId` vào mọi bút toán Sổ cái (`FinancialLedger`). Áp dụng nguyên tắc Cấn trừ Escrow: Tiền thưởng được hạch toán cấn trừ từ Doanh thu bán hàng kỳ của Shop. |
| **2. Quản Lý Đơn Hàng & Hoàn Tiền (FR-20 / FR-21)** | **Trung bình** | Khách hoàn tiền trễ hạn có thể khiến doanh số của kỳ tháng trước bị thay đổi sau khi đã chốt thưởng. | Giữ nguyên logic `processOrderRefundAdjustment`: Nếu hoàn tiền sau ngày 15 (sau khi đã chốt thưởng), hệ thống tạo khoản khấu trừ âm (`BonusAdjustment`) cấn trừ vào kỳ tháng sau, tuyệt đối không sửa ngược lịch sử sổ cái cũ. |
| **3. Deal Hoa Hồng Độc Quyền (FR-27)** | **Thấp (Độc lập)** | Nhầm lẫn giữa KPI Thưởng Doanh Số Tháng (FR-09) và KPI Đơn Hàng Của Deal Độc Quyền (FR-27). | Tách bạch rõ ranh giới trong DB: FR-09 dựa trên tổng GMV ròng của Shop trong tháng; FR-27 dựa trên số đơn `targetOrders` của riêng sản phẩm được duyệt trong Deal. Hai cơ chế này cộng dồn độc lập và không xung đột. |
| **4. Giao Diện Người Dùng (UI/UX Merchant)** | **Cao** | Giao diện hiện tại có quá nhiều khối mô tả dài dòng, dropdown chọn đơn lẻ gây khó chịu cho chủ shop, fallback store UUID cứng có thể gây lỗi hiển thị. | **Tối giản hóa toàn diện UI:**<br>- Bỏ hoàn toàn các đoạn văn text mô tả rườm rà.<br>- Thay bằng tên ngắn gọn, dễ hiểu, nhãn pill xúc tích.<br>- Sử dụng icon Lucide chuyên nghiệp (`TrendingUp`, `Users`, `Award`, `CheckCircle2`, `Calculator`).<br>- Xây dựng **Bảng Ma Trận Tổng Hợp Toàn Bộ KOL** ngay vị trí trung tâm, kèm nút "Chốt toàn bộ". |
| **5. Thông Báo & Chat (FR-08 / FR-26)** | **Thấp** | KOL không biết khi nào có chính sách thưởng mới. | Bổ sung hàm gửi Notification tự động tới các KOL trong Shop Team khi Shop lưu hoặc sửa mốc thưởng mới. |

---

## PHẦN 9: KẾ HOẠCH HÀNH ĐỘNG TRIỂN KHAI TOÀN DIỆN (EXECUTION PLAN FULL FLOW)

Kế hoạch thực hiện theo 4 giai đoạn chuẩn mực từ Backend đến Frontend, Kiểm thử và Xác minh UI:

### Giai Đoạn 1: Nâng Cấp Backend (API Tổng Hợp & Chốt Hàng Loạt)
1. **API Tổng Hợp Tiến Độ Toàn Đội Ngũ:**
   - Tạo endpoint `GET /stores/:storeId/commission-rules/team-progress?yearMonth=...`
   - Quét toàn bộ KOL thuộc Shop, tính toán nhanh: Đơn hoàn tất, Doanh số hợp lệ, Bậc chạm, Thưởng dự kiến, Trạng thái (Đang tích lũy / Chờ chốt / Đã chốt) và tổng quỹ thưởng dự kiến của Shop trong tháng.
2. **API Chốt Đối Soát Hàng Loạt:**
   - Tạo endpoint `POST /stores/:storeId/commission-rules/settle-all`
   - Cho phép chốt sổ trong một transaction cho tất cả các KOL đủ điều kiện đạt mốc trong kỳ đã kết thúc.
3. **Kích Hoạt Thông Báo Chiến Dịch Thưởng:**
   - Khi Shop lưu mốc thưởng mới, tự động gửi In-App Notification cho các KOL của Shop.

### Giai Đoạn 2: Tái Cấu Trúc Giao Diện Frontend (`CommissionRulesPage.tsx`)
1. **Loại bỏ triệt để Fallback UUID cứng:**
   - Lấy `storeId` trực tiếp từ thông tin Shop thực tế của người dùng đăng nhập.
2. **Thiết Kế Bảng Ma Trận Đối Soát Doanh Số KOL Tháng:**
   - Đặt ở vị trí trung tâm trang.
   - Hiển thị danh sách tất cả KOL: Tên/Avatar, Kênh liên kết, Đơn hoàn thành, Doanh số, Bậc đạt, Thưởng dự kiến, Trạng thái.
   - Thêm nút hành động nhanh: **"Chốt đối soát toàn bộ (Batch Settle)"**.
3. **Thanh Lọc UI & Tối Giản Hóa Typography:**
   - Xóa bỏ các đoạn văn mô tả lê thê dài dòng.
   - Chỉ giữ lại tiêu đề ngắn, số liệu to rõ, icon Lucide sắc nét, chuẩn bảng màu Vàng Be Warm Sand (`#FAF8F5`, `#F3EFE6`, `#C59B58`, `#B88E4F`).
   - Giữ thẻ xem chi tiết công thức (Drill-down view) mở ra khi chủ shop nhấp vào dòng của bất kỳ KOL nào.

### Giai Đoạn 3: Kiểm Thử Nghiệp Vụ & Dòng Tiền (Testing)
1. Chạy Jest Unit & Integration Test backend để đảm bảo không gãy vỡ test suites.
2. Kiểm tra tính toàn vẹn của Sổ cái tài chính (`FinancialLedger`) và không ảnh hưởng đến luồng đơn hàng hay hoàn tiền.

### Giai Đoạn 4: Trải Nghiệm Người Dùng & Đánh Giá UI Trực Tiếp Bằng Trình Duyệt
1. Mở trình duyệt truy cập `http://localhost:5173/merchant/commission-rules`.
2. Kiểm tra trực quan từ góc nhìn người dùng: Tải dữ liệu mượt mà, không giật lag, không tự reload, bố cục hiện đại, chuẩn nhận diện thương hiệu SCANMS.
