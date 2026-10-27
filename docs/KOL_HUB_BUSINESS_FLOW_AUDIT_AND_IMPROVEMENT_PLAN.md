# SCANMS - ĐẶC TẢ TÁI CẤU TRÚC LUỒNG KINH DOANH CHUẨN SÀN TMĐT & HỢP NHẤT CHIẾN DỊCH - VOUCHER - MẠNG LƯỚI KOL
## Chuyên Đề: Xóa Bỏ Sự Phân Mảnh 3 Nơi, Chuẩn Hóa Nghiệp Vụ Người Dùng Mới, Hợp Nhất 1-Click Hợp Tác VIP & Kiểm Thử Toàn Trình

> **Người thực hiện:** Antigravity Solution Architect & Senior Product Manager  
> **Dự án:** SCANMS (FA26SE032 - Sales Collaborator & Affiliate Network Management System)  
> **Trạng thái:** 📋 BẢN ĐẶC TẢ NGHIỆP VỤ CHÍNH THỨC — ĐÃ PHÂN TÍCH CHUẨN BUSINESS & ĐANG TRIỂN KHAI HOÀN THIỆN  

---

## MỤC LỤC
1. [Bóc tách 7 lỗi hiển thị & dữ liệu thực tế từ ảnh chụp màn hình](#1-bóc-tách-7-lỗi-hiển-thị--dữ-liệu-thực-tế-từ-ảnh-chụp-màn-hình)
2. [Kiểm toán Nghiệp vụ Voucher: Voucher Sàn vs Voucher Shop vs Voucher KOL](#2-kiểm-toán-nghiệp-vụ-voucher-voucher-sàn-vs-voucher-shop-vs-voucher-kol)
3. [Quy tắc Xếp chồng Voucher (Stacking) & Bảo vệ quyền lợi hoa hồng KOL](#3-quy-tắc-xếp-chồng-voucher-stacking--bảo-vệ-quyền-lợi-hoa-hồng-kol)
4. [Tối ưu hóa Link Tiếp Thị KOL: Gộp 1 Link Duy Nhất thay vì xé lẻ theo MXH](#4-tối-ưu-hóa-link-tiếp-thị-kol-gộp-1-link-duy-nhất-thay-vì-xé-lẻ-theo-mxh)
5. [Bản vẽ Luồng Mời Hợp Tác VIP 1-Click & Đề Xuất Mã Riêng Trong Chat](#5-bản-vẽ-luồng-mời-hợp-tác-vip-1-click--đề-xuất-mã-riêng-trong-chat)
6. [Tái cấu trúc Kiến trúc thông tin trang Quản lý KOL (`/merchant/kol-hub`)](#6-tái-cấu-trúc-kiến-trúc-thông-tin-trang-quản-lý-kol-merchantkol-hub)
7. [Quy chuẩn Thiết Kế Giao Diện (UI/UX Design Standards - Không Quá AI)](#7-quy-chuẩn-thiết-kế-giao-diện-uiux-design-standards---không-quá-ai)
8. [Quy chuẩn Kiểm Thử & Nghiệm Thu Bắt Buộc: Live Test Thủ Công Toàn Trình](#8-quy-chuẩn-kiểm-thử--nghiệm-thu-bắt-buộc-live-test-thủ-công-toàn-trình)
9. [Danh mục File & Mã nguồn cần can thiệp](#9-danh-mục-file--mã-nguồn-cần-can-thiệp)
10. [Bổ sung kiểm toán và khắc phục 6 vấn đề thực tế (User Audit 25/10/2026)](#10-bổ-sung-kiểm-toán-và-khắc-phục-6-vấn-đề-thực-tế-user-audit-25102026)
11. [Báo cáo nghiệm thu & Kết quả triển khai thực tế](#11-báo-cáo-nghiệm-thu--kết-quả-triển-khai-thực-tế-hoàn-tất-toàn-diện)
12. [Đặc tả Kiến Trúc Nghiệp Vụ Hợp Nhất: Xóa Bỏ Sự Phân Mảnh 3 Nơi (Business Architecture Unified Spec)](#12-đặc-tả-kiến-trúc-nghiệp-vụ-hợp-nhất-xóa-bỏ-sự-phân-mảnh-3-nơi-business-architecture-unified-spec)

---

## 1. BÓC TÁCH 7 LỖI HIỂN THỊ & DỮ LIỆU THỰC TẾ TỪ ẢNH CHỤP MÀN HÌNH

### 1.1. Hình 1: Danh sách hội thoại hiện chuỗi JSON thô `{"type":"CAMPAIGN_INVITE","p...`
* **Hiện tượng:** Tại thanh bên trái danh sách hội thoại, tin nhắn mới nhất không hiển thị tóm tắt thân thiện mà lộ nguyên chuỗi mã nguồn JSON máy đọc: `{"type":"CAMPAIGN_INVITE","p...`.
* **Vị trí code:** [ShopKolHubPage.tsx (Dòng 62-82)](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx#L62-L82) và [ChatBoxPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/chat/ChatBoxPage.tsx).
* **Nguyên nhân:** Hàm `getChatMessagePreview(messageText)` hoàn toàn thiếu case xử lý cho `CAMPAIGN_INVITE` và `CAMPAIGN_ACCEPTED`, dẫn đến rơi vào khối fallback `return messageText;` in chuỗi JSON thô.
* **Giải pháp chuẩn:** Bổ sung bộ phân giải tin nhắn:
  - `CAMPAIGN_INVITE` $\rightarrow$ `🎁 Thư mời chiến dịch VIP: [Tên chiến dịch] (+X%)`
  - `CAMPAIGN_ACCEPTED` $\rightarrow$ `✅ Đã tham gia chiến dịch: [Tên chiến dịch]`
  - `CAMPAIGN_REJECTED` $\rightarrow$ `❌ Đã từ chối chiến dịch: [Tên chiến dịch]`

---

### 1.2. Hình 2: Bóng chat sau khi duyệt bị cụt lủn và xóa sạch dữ liệu chiến dịch ban đầu
* **Hiện tượng:** Khi KOL bấm "Đồng ý", thẻ mời biến mất và bị thay thế bằng một khối chữ sơ sài:
  > *Đã chấp nhận chiến dịch*  
  > *test 10*  
  > *Hoa hồng thưởng thêm đã được kích hoạt.*  
  Mất hoàn toàn: Tên gian hàng mời, mức hoa hồng thưởng thêm bao nhiêu %, thời hạn áp dụng từ ngày nào tới ngày nào, và quyền lợi đi kèm.
* **Vị trí code:** [CampaignCardBubble.tsx (Dòng 65-74)](file:///c:/HW/CAPSTONE/frontend/src/components/chat/CampaignCardBubble.tsx#L65-L74).
* **Giải pháp chuẩn (Interactive Contract Bubble):** Giữ nguyên toàn bộ khung thẻ chiến dịch (Tên chiến dịch, Gian hàng, Badge hoa hồng thưởng thêm, Thời hạn), chỉ chuyển cụm nút bấm phản hồi thành Huy hiệu trạng thái chính thức:  
  `[✓ ĐÃ KÍCH HOẠT HỢP TÁC · Hiệu lực từ 25/10/2026 đến 25/11/2026]` kèm nút `[Sao chép Link tiếp thị VIP]`.

---

### 1.3. Hình 3: Thẻ Deal độc quyền hiện `Hoa hồng sàn: — %` và `Mã voucher VIP đã cấp:` bị rỗng
* **Hiện tượng:** Ô "Hoa hồng sàn" hiển thị dấu gạch ngang `— %` thay vì mức $10\%$ chuẩn sàn; Ô "Mã voucher VIP đã cấp" hiển thị rỗng.
* **Vị trí code:**
  - Backend: [affiliate-deals.service.ts (Dòng 822-841)](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/affiliate-deals.service.ts#L822-L841).
  - Frontend: [ExclusiveDealCardBubble.tsx (Dòng 100-111 & 143-160)](file:///c:/HW/CAPSTONE/frontend/src/components/chat/ExclusiveDealCardBubble.tsx#L100-L111).
* **Nguyên nhân:**
  1. Backend chỉ gửi `approvedCommissionRate: 13` mà không gán `publicCommissionRate: 10`. Frontend đọc `card.publicCommissionRate ?? '—'` nên bị fallback thành dấu gạch ngang.
  2. Backend tạo coupon gắn ở `referralLink.customCouponCode`, nhưng frontend lại tìm trường `card.vipVoucherCode` hoặc `issued.vipVoucherCode`. Việc lệch tên trường khiến giao diện không hiển thị được mã giảm giá.
* **Giải pháp chuẩn:** Luôn inject `publicCommissionRate: 10` trong payload socket và chuẩn hóa trường `vipVoucherCode = referralLink.customCouponCode`.

---

### 1.4. Hình 4: KOL Nguyễn Mai Anh có hạng Vàng nhưng hiện `CHƯA XẾP HẠNG` & `Chưa liên kết mạng xã hội`
* **Hiện tượng:** Tài khoản KOL Nguyễn Mai Anh đã đạt Hạng Vàng và đã liên kết kênh TikTok, nhưng trên Hub của Shop lại bị hiển thị huy hiệu `CHƯA XẾP HẠNG` và `Chưa liên kết kênh mạng xã hội`.
* **Vị trí code:**
  - Backend: [chat.service.ts (Dòng 261-269)](file:///c:/HW/CAPSTONE/backend/src/modules/chat/chat.service.ts#L261-L269).
  - Frontend: [ShopKolHubPage.tsx (Dòng 545-676)](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx#L545-L676).
* **Nguyên nhân cốt lõi (Merge Race Condition):**
  1. Hàm `getConversations` của Backend Chat chỉ select: `{ id, fullName, role, avatarUrl, collaboratorProfile: { select: { avatarUrl: true } } }` $\rightarrow$ Thiếu `tier` và `socialChannels`.
  2. Frontend đưa dữ liệu chat vào `mergedMap` đầu tiên với `tier = undefined` và `socialChannels = []`.
  3. Khi nạp danh bạ KOL toàn sàn (`dbKols` có đủ Hạng Vàng và TikTok), code kiểm tra `if (!mergedMap.has(k.id))` thấy Mai Anh đã có nên bỏ qua không cập nhật, làm dữ liệu chuẩn bị vứt bỏ!
* **Giải pháp chuẩn:** Bổ sung `tier` và `socialChannels` vào query chat backend; Frontend khi merge phải ưu tiên giữ lại tier/kênh từ nguồn có dữ liệu đầy đủ nhất.

---

### 1.5. Hình 5: Sub-tab "Đối tác có deal" bị đặt nhầm vị trí & Tab "Hiệu suất" bị crash
* **Hiện tượng:** Sub-tab thứ 2 trong view 1-1 của KOL là `Đối tác có deal` (bảng đa đối tác toàn sàn); Tab `Hiệu suất` bị crash trắng trang.
* **Vị trí code:** [ShopKolHubPage.tsx (Dòng 1950-1960, 2435-2458, 2740-2745)](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx).
* **Nguyên nhân:**
  1. Sai kiến trúc thông tin (IA): Nhét bảng quản lý đối tác toàn sàn làm sub-tab của 1 KOL cá nhân.
  2. Crash tab Hiệu suất: Frontend đọc `kolOrders.reduce(..., o.finalAmount)` trong khi Backend `/dashboard/shop/kol-orders` trả về `orderTotal` và `commissionEarned`. Dẫn tới `ord.orderTotal` là `undefined` $\rightarrow$ Gọi `ord.orderTotal.toLocaleString()` sinh lỗi runtime `Cannot read properties of undefined (reading 'toLocaleString')`.
* **Giải pháp chuẩn:** Tách bảng Đối tác toàn sàn ra ngoài cấp Hub; Sửa đồng bộ mapping trường dữ liệu đơn hàng.

---

### 1.6. Cột bên trái hiện tất cả 21 KOL dù Shop chưa hề nhắn tin lần nào
* **Hiện tượng:** Cột danh sách chat bên trái tự động hiển thị toàn bộ 21 KOL trên sàn.
* **Vị trí code:** [ShopKolHubPage.tsx (Dòng 672-676)](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx#L672-L676).
* **Giải pháp chuẩn:** Cột bên trái chỉ nạp những người **đã có tương tác thật** (có tin nhắn, đã yêu cầu mẫu, hoặc đang có deal). Cung cấp nút `+ Tìm nhà sáng tạo mới` để mở danh bạ khi muốn tìm người mới.

---

### 1.7. Hình 6 (Mới phát sinh): Form Đề xuất mã giảm giá riêng của KOL bị lỗi `storeId phải là định dạng UUID hợp lệ`
* **Hiện tượng từ ảnh chụp thực tế:**
  - KOL vào modal "Đề xuất mã giảm giá riêng" (`KolCouponsPage.tsx`), chọn Gian hàng đối tác đã duyệt hợp tác là `Sora Skin`.
  - Nhập mã giảm giá: `MAIVIP132` (9/20 ký tự, thỏa mãn 100% các tiêu chí kiểm tra cú pháp).
  - Xem trước hiển thị trên App khách hàng hiện đầy đủ thông tin: `VOUCHER ĐỘC QUYỀN KOL MAIVIP132 · Áp dụng tại: Sora Skin`.
  - Khi bấm gửi đề xuất, hệ thống lập tức văng thông báo lỗi màu đỏ:
    > ⚠️ **`storeId phải là định dạng UUID hợp lệ`**
* **Vị trí code liên quan:**
  - Backend DTO: [create-coupon.dto.ts (Dòng 18)](file:///c:/HW/CAPSTONE/backend/src/modules/coupons/dto/create-coupon.dto.ts#L18):
    ```typescript
    @IsNotEmpty({ message: 'storeId không được để trống' })
    @IsUUID('4', { message: 'storeId phải là định dạng UUID hợp lệ' })
    storeId: string;
    ```
  - Backend Seed System: [seed.helpers.ts (Dòng 19)](file:///c:/HW/CAPSTONE/backend/prisma/seeds/seed.helpers.ts#L19):
    ```typescript
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // UUID Version 5 (Namespace SHA-1)
    ```
  - Frontend Submission: [KolCouponsPage.tsx (Dòng 378)](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolCouponsPage.tsx#L378) và [coupon.service.ts](file:///c:/HW/CAPSTONE/frontend/src/services/coupon.service.ts).
* **Nguyên nhân gốc rễ kỹ thuật (Validation Version Mismatch):**
  1. Trong NestJS DTO, `CreateCouponDto` đặt decorator `@IsUUID('4')`, nghĩa là **chỉ chấp nhận duy nhất UUID phiên bản 4 (Random UUID)**.
  2. Trong khi đó, toàn bộ dữ liệu mẫu chuẩn của hệ thống trong `seed.helpers.ts` (`seedId`) lại sử dụng thuật toán băm SHA-1 **UUID phiên bản 5 (`UUIDv5` với flag `0x50`)** nhằm đảm bảo các ID của Gian hàng (`store:0` - Sora Skin, `store:1` - Aura Bio...) có tính bất biến (deterministic) xuyên suốt quá trình seed và giữa các máy tính khác nhau.
  3. Cột `id` trong PostgreSQL của bảng `Store` là kiểu `UUID` tiêu chuẩn (chấp nhận mọi phiên bản UUID RFC 4122 từ v1 đến v5).
  4. Vì ép version `'4'` quá cứng nhắc, `class-validator` đã từ chối ID chuẩn của Sora Skin và trả về lỗi `400 Bad Request`.
* **Giải pháp chuẩn:**
  1. Nới lỏng kiểm tra DTO: Thay `@IsUUID('4')` thành `@IsUUID('all')` hoặc `@IsUUID()` trong [create-coupon.dto.ts](file:///c:/HW/CAPSTONE/backend/src/modules/coupons/dto/create-coupon.dto.ts) (hỗ trợ toàn bộ phiên bản UUID hợp lệ theo chuẩn RFC 4122).
  2. Đồng thời áp dụng tương tự cho `campaignId?: string` trong DTO để tránh lỗi tương tự khi gắn chiến dịch.
  3. Bổ sung kiểm tra an toàn tại Frontend: Nếu `selectedStoreId` chưa sẵn sàng, vô hiệu hóa nút gửi kèm chỉ báo trực quan.

---

## 2. KIỂM TOÁN NGHIỆP VỤ VOUCHER: VOUCHER SÀN VS VOUCHER SHOP VS VOUCHER KOL

### 2.1. Nghịch lý hiện tại của Voucher Sàn (Platform Voucher)
* **Vấn đề thực tế:** Khi Admin vào phát hành Voucher Sàn trong [AdminVoucherIssuer.tsx dòng 48](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminVoucherIssuer.tsx#L48), giao diện **bắt buộc Admin phải chọn 1 Gian hàng áp dụng**!
* **Nguyên nhân gốc rễ:** Trong database [schema.prisma dòng 1106](file:///c:/HW/CAPSTONE/backend/prisma/schema.prisma#L1106), trường `storeId String @map("store_id") @db.Uuid` được định nghĩa là **bắt buộc (NOT NULL)**. Vì vậy hệ thống không thể lưu một voucher áp dụng cho toàn sàn mà không gắn vào một shop cụ thể.
* **Hậu quả:** Voucher do Admin tạo bị biến thành voucher của shop Sora Skin, khách mua hàng shop khác không áp dụng được. Đồng thời, Customer trên trang chủ và giỏ hàng không có nơi nào để xem và lưu voucher do Admin tạo.
* **Giải pháp kiến trúc chuẩn:**
  1. **Chuyển `storeId` thành Nullable (`storeId String?`) trong Prisma Schema:**
     - Nếu `storeId === null`: Đây là **Voucher Sàn Toàn Diện (Platform Global Voucher)**, áp dụng cho MỌI gian hàng trên sàn SCANMS (Sàn tài trợ 100%).
     - Nếu `storeId !== null`: Đây là **Voucher Gian Hàng (Store Voucher)** do Shop tự tài trợ 100%.
  2. **Xây dựng "Kho Voucher Sàn / Trạm Săn Mã" (Platform Voucher Center):**
     - Đặt banner / icon "Mã Giảm Giá Sàn" trên Trang chủ (`/marketplace`) và trong Giỏ hàng (`/checkout`). Khách bấm vào xem danh sách voucher sàn đang có và bấm **[Lưu mã]** vào ví của mình.

---

### 2.2. Phân cấp 4 Tầng Voucher Chuẩn TMĐT (Voucher Hierarchy)

| Tầng Voucher | Nguồn Tiền (Funding Source) | Phạm Vi Áp Dụng (Scope) | Nơi Hiển Thị & Thu Thập |
| :--- | :--- | :--- | :--- |
| **1. Voucher Sàn** | **SCANMS tài trợ 100%** (Sàn bù tiền lại cho Shop khi đối soát) | Toàn sàn hoặc toàn ngành hàng | Banner Trang chủ, Trạm Voucher Sàn, Pop-up giỏ hàng |
| **2. Voucher Vận Chuyển** | Sàn hoặc GHN tài trợ | Trừ cước vận chuyển đơn hàng | Tự động áp dụng tại bước tính phí vận chuyển |
| **3. Voucher Shop** | **Shop tự tài trợ 100%** | Chỉ sản phẩm của Shop đó | Khay voucher dưới giá trên trang chi tiết SP (`ProductDetailPage.tsx`), Trang hồ sơ shop |
| **4. Voucher KOL** | Shop cấp riêng cho KOL kích cầu | Chỉ áp dụng qua link của KOL hoặc gõ mã | Tự động ghim khi vào qua Link tiếp thị của KOL; KOL chia sẻ mã trên video |

---

## 3. QUY TẮC XẾP CHỒNG VOUCHER (STACKING) & BẢO VỆ QUYỀN LỢI HOA HỒNG KOL

### 3.1. Quy tắc cộng dồn tối đa 3 Voucher trên 1 đơn hàng (Checkout Stacking)
Một đơn hàng hợp lệ chỉ được phép áp dụng tối đa **3 Voucher khác tầng**:
$$\text{Số tiền thanh toán} = \text{Tiền hàng} - \text{Voucher Tiền hàng (Shop HOẶC KOL)} - \text{Voucher Toàn Sàn} - \text{Voucher Freeship}$$

* **Quy tắc bài trừ:** Không được dùng cùng lúc 2 voucher tiền hàng của cùng 1 Shop (không thể vừa dùng `SHOP20K` vừa dùng `KOL15K` vì Shop sẽ bị trừ tiền 2 lần).

---

### 3.2. Xung đột: Nếu Voucher Shop giảm sâu hơn Voucher KOL thì sao?
* **Tình huống:** Shop phát hành mã `SHOP30K` (giảm 30.000₫), trong khi mã độc quyền của KOL chỉ giảm `MAIANH15K` (15.000₫). Khách hàng sẽ chọn mã `SHOP30K` để tiết kiệm hơn.
* **KOL CÓ BỊ MẤT HOA HỒNG KHÔNG?**
  * **HOÀN TOÀN KHÔNG BỊ MẤT! KOL VẪN ĐƯỢC HƯỞNG ĐỦ 100% HOA HỒNG!**
  * **Cơ chế hoạt động chuẩn TMĐT:**
    1. Khi khách bấm vào Link tiếp thị của KOL $\rightarrow$ Cookie lưu trữ phiên tiếp thị `attributedCollaboratorId = Mai Anh` (thời hạn 30 ngày theo luật Last-click).
    2. Tại trang thanh toán, cho dù khách dùng mã của Shop (`SHOP30K`), dùng mã của Sàn, hay không dùng mã nào... thì **ĐƠN HÀNG VẪN ĐƯỢC HỆ THỐNG GHI NHẬN CHO MAI ANH**!
    3. Mai Anh vẫn nhận đủ hoa hồng $10\%$ hoặc $13\%$ tính trên giá trị thực thu của sản phẩm sau giảm giá.
* **Ý nghĩa thực sự của Voucher KOL:**
  - Voucher mang tên KOL là **công cụ kích thích (Incentive)** để fan có động lực mua ngay.
  - Ngoài ra, hệ thống có cơ chế **Coupon Attribution (Ghi nhận theo mã)**: Nếu khách không bấm link mà chỉ gõ mã `MAIANH15K`, đơn hàng vẫn tự động được gán hoa hồng cho Mai Anh!

---

### 3.3. Cơ chế Smart Link Auto-Apply Voucher (Không bắt khách gõ tay)
* Khi khách bấm vào link tiếp thị của KOL (`scanms.vn/r/maianh`), hệ thống tự động gán mã `MAIANH15K` vào giỏ hàng.
* Khi khách tiến hành thanh toán, mã đã được áp dụng sẵn, trừ tiền ngay lập tức mà không bắt khách phải gõ tay từng ký tự.

---

### 3.4. Hiển thị Voucher Shop trên Trang Chi Tiết Sản Phẩm (`ProductDetailPage.tsx`)
* Bổ sung khay hiển thị voucher ngay dưới khối giá bán:
  - Các pill badge màu vàng be sang trọng: `[Giảm 15k đơn từ 200k]`, `[Giảm 10% tối đa 30k]`.
  - Nút bấm trực quan **[Lưu mã]** để khách lưu vào ví voucher trước khi bấm "Mua ngay".

---

## 4. TỐI ƯU HÓA LINK TIẾP THỊ KOL: GỘP 1 LINK DUY NHẤT THAY VÌ XÉ LẺ THEO MXH

* **Vấn đề hiện tại:** Bắt KOL phải tạo từng link con riêng biệt cho TikTok, Facebook, YouTube... làm danh sách link dài dằng dặc, rối mắt và phức tạp hóa thao tác.
* **Chuẩn hóa tinh gọn:**
  1. **Mỗi sản phẩm chỉ cần 1 Link Tiếp Thị duy nhất** (Ví dụ: `scanms.vn/r/vitchi-sora`). KOL chỉ cần bấm copy 1 lần và dùng được trên mọi nền tảng.
  2. **Backend tự động phân tích kênh (Dynamic Referrer Detection):**
     - Khi người dùng bấm vào link, backend đọc header `Referer` của trình duyệt:
       - Đến từ `tiktok.com` $\rightarrow$ Tự ghi nhận kênh TikTok.
       - Đến từ `facebook.com` / `fb.me` $\rightarrow$ Tự ghi nhận kênh Facebook.
       - Đến từ `youtube.com` $\rightarrow$ Tự ghi nhận kênh YouTube.
  3. Bỏ việc bắt buộc tạo nhiều link thủ công, chỉ giữ lại tính năng gắn UTM dưới dạng tùy chọn nâng cao cho KOL chuyên nghiệp.

---

## 5. BẢN VẼ LUỒNG MỜI HỢP TÁC VIP & ĐỀ XUẤT MÃ RIÊNG TRONG KHUNG CHAT 1-1

### 5.1. Bản vẽ Luồng Shop Mời Hợp Tác VIP 1-Click (Unified 1-Click Collaboration Modal)

Loại bỏ hoàn toàn quy trình rời rạc 3 bước (Tạo Chiến dịch $\rightarrow$ Tạo Coupon $\rightarrow$ Mò vào Chat dán UUID). Hợp nhất thành **1 Popup duy nhất**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  👑 MỜI HỢP TÁC CHIẾN DỊCH VIP · [KOL: Nguyễn Mai Anh]                 │
├────────────────────────────────────────────────────────────────────────┤
│  1. SẢN PHẨM & THỜI HẠN                                                │
│     • Sản phẩm: [ Serum Vitamin C 15% Sora Skin 30ml            ▼ ]    │
│     • Thời hạn: [ 25/10/2026 ] đến [ 25/11/2026 ] (30 ngày)            │
├────────────────────────────────────────────────────────────────────────┤
│  2. CHÍNH SÁCH HOA HỒNG KOL                                            │
│     • Hoa hồng sàn: 10% (Cố định chuẩn sàn)                            │
│     • Hoa hồng VIP đề xuất: [ +3% (Tổng nhận 13%)               ▼ ]    │
├────────────────────────────────────────────────────────────────────────┤
│  3. VOUCHER ĐỘC QUYỀN CHO FOLLOWER CỦA KOL (Tùy chọn)                  │
│     [X] Tạo mã voucher riêng cho KOL                                   │
│     • Mức giảm: [ 15.000 ₫ ] cho đơn tối thiểu [ 200.000 ₫ ]           │
│     • Mã tự sinh: [ SORA_MAIANH15K ]                                   │
│     • Số lượng: [ 50 ] lượt dùng                                       │
├────────────────────────────────────────────────────────────────────────┤
│  4. CAM KẾT REVIEW (SLA)                                               │
│     • Yêu cầu: Đăng [ 1 ] video review trong vòng [ 14 ] ngày          │
├────────────────────────────────────────────────────────────────────────┤
│     [ Hủy ]                        [ 🚀 Gửi Thư Mời Hợp Tác Ngay ]     │
└────────────────────────────────────────────────────────────────────────┘
```

* **Kết quả:** Sau khi bấm gửi, hệ thống tự động tạo chiến dịch, tạo voucher, sinh link VIP và bắn Thẻ hợp đồng tương tác vào khung chat. Khi KOL bấm chấp nhận, thẻ vẫn giữ nguyên đầy đủ điều khoản chi tiết kèm nút sao chép link và voucher.

---

### 5.2. Bản vẽ Luồng KOL Đề Xuất Mã Riêng Trực Tiếp Trong Chat 1-1 Với Shop (Interactive In-Chat Coupon Proposal & Instant Activation)

> 💡 **ĐỀ XUẤT ĐỘT PHÁ TỪ USER:**  
> Thay vì bắt KOL phải mò sang trang `/collaborator/coupons` để mở form đề xuất độc lập (vừa dễ lỗi UUID, vừa không có ngữ cảnh trao đổi), **tích hợp tính năng Đề xuất mã giảm giá riêng trực tiếp vào Khung Chat 1-1 giữa KOL và Gian hàng**.

#### A. Sự bất hợp lý của luồng cũ (Bị cô lập ngoài khung chat):
1. **Mất ngữ cảnh đàm phán:** Ngoài đời, việc xin mã giảm giá độc quyền luôn gắn liền với việc trao đổi kế hoạch: *"Shop ơi, tuần tới em làm clip review kem chống nắng, shop cấp cho em mã `MAIVIP132` giảm 15% cho người xem của em nhé"*.
2. **Thao tác rườm rà & Rủi ro sai lệch dữ liệu:** KOL phải đổi trang, chọn shop từ dropdown (dễ nhầm lẫn), rồi gửi một đề xuất trôi nổi mà Chủ shop không biết tại sao KOL xin mã đó, dẫn đến tỷ lệ bị treo hoặc từ chối rất cao.

#### B. Luồng Nghiệp Vụ Chuẩn TMĐT Trong Khung Chat (Shopee / TikTok Shop Merchant Chat):
1. **Nút công cụ tiện ích trên thanh soạn thảo Chat:**
   - Trong khung chat 1-1 giữa KOL và Shop ([ChatBoxPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/chat/ChatBoxPage.tsx) và [ShopKolHubPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx)), ngay cạnh thanh nhập tin nhắn, bố trí nút tiện ích: **`[🎟️ Đề xuất mã riêng]`**.
2. **Popup tinh gọn tự động gắn ngữ cảnh (Context Auto-binding):**
   - Khi KOL đang chat với Sora Skin và bấm `[🎟️ Đề xuất mã riêng]`, popup mở ra **tự động khóa chặt `storeId` của Sora Skin** (loại bỏ hoàn toàn dropdown chọn shop, triệt tiêu 100% nguy cơ lỗi UUID).
   - KOL chỉ cần nhập:
     - **Mã mong muốn:** Gõ mã hoặc chọn gợi ý nhanh (`+VIP10`, `+SALE15`, `+DEAL20`). Ví dụ: `MAIVIP132`.
     - **Mức giảm mong muốn:** (Ví dụ: `15%`).
     - **Cam kết đẩy số:** (Ví dụ: *"Review video TikTok dòng B5 Centella"*).
3. **Thẻ tin nhắn tương tác thời gian thực (Interactive Coupon Proposal Bubble):**
   - Sau khi KOL bấm gửi, một thẻ tin nhắn sang trọng (Brand Gold) lập tức xuất hiện trong luồng chat của cả 2 bên:

```
┌────────────────────────────────────────────────────────────────────────┐
│  🎟️ ĐỀ XUẤT MÃ GIẢM GIÁ ĐỘC QUYỀN KOL                                 │
├────────────────────────────────────────────────────────────────────────┤
│  Mã đề xuất:       [ MAIVIP132 ]                                       │
│  Mức giảm mong muốn: 15%                                               │
│  Mục đích:         Review video TikTok dòng B5 Centella                │
│  Trạng thái:       ⏳ Đang chờ Chủ Shop cấu hình & kích hoạt           │
├────────────────────────────────────────────────────────────────────────┤
│  (Phía Shop hiển thị):                                                 │
│  [ Từ chối ]                 [ ⚡ Cấu hình & Kích hoạt mã ngay ]        │
└────────────────────────────────────────────────────────────────────────┘
```

4. **Shop duyệt & Kích hoạt 1-Click ngay trong luồng chat:**
   - Chủ shop bấm **`[⚡ Cấu hình & Kích hoạt mã ngay]`**:
     - Mở sheet cấu hình nhanh: Chọn % giảm chính thức ($10\% - 20\%$), Ngân sách/Số lượt tối đa (VD: $50$ lượt), Thời hạn (VD: 30 ngày).
     - Bấm **"Xác nhận kích hoạt"** $\rightarrow$ Hệ thống gọi API duyệt, tạo coupon và liên kết ngay với KOL.
   - Thẻ tin nhắn trong chat đổi trạng thái realtime sang:  
     `[✅ ĐÃ KÍCH HOẠT MÃ · Giảm 15% · Tối đa 50 đơn · HSD: 30 ngày]` kèm nút tiện ích `[Sao chép mã]` cho cả hai bên.
5. **Đồng bộ tự động vào kho mã:**
   - Mã sau khi kích hoạt trong chat tự động xuất hiện trong trang `/collaborator/coupons` của KOL và danh sách Coupon của Shop.
   - Vừa đàm phán tức thì, vừa quản lý chặt chẽ!

---

## 6. TÁI CẤU TRÚC KIẾN TRÚC THÔNG TIN TRANG QUẢN LÝ KOL (`/merchant/kol-hub`)

```
TRANG QUẢN TRỊ KOL GIAN HÀNG (/merchant/kol-hub)
│
├── THANH ĐIỀU HƯỚNG ĐỈNH TRANG (TOP BAR)
│   ├── [Hộp thư trao đổi 1-1] (Active mặc định)
│   ├── [Quản lý Đối tác & Deal toàn sàn] (Đưa bảng tổng hợp ra đây)
│   └── Nút CTA: [+ Tìm nhà sáng tạo mới] (Mở thư viện khám phá KOL)
│
├── CỘT TRÁI: HỘP THƯ ĐỐI TÁC CÓ TƯƠNG TÁC
│   ├── Bộ lọc: [Tất cả] · [Đang có Deal] · [Chờ duyệt mẫu]
│   └── Chỉ hiển thị những KOL ĐÃ CÓ tin nhắn / hàng mẫu / deal
│
└── CỘT PHẢI: KHÔNG GIAN LÀM VIỆC 1-1 VỚI KOL ĐANG CHỌN
    ├── Header KOL: Avatar, Tên, Badge Hạng chuẩn (Vàng/Bạc/Kim cương), Multi-channel MXH
    └── 4 Sub-Tabs chuẩn mực cá nhân:
        ├── Tab 1: [Tin nhắn & Đàm phán] (Chat realtime + Thẻ Deal/Voucher/Mẫu)
        ├── Tab 2: [Deal độc quyền của KOL này] (Lịch sử deal riêng với Shop)
        ├── Tab 3: [Hàng mẫu trải nghiệm] (Theo dõi gửi mẫu GHN, SLA nộp video)
        └── Tab 4: [Báo cáo Doanh số & Đơn hàng] (Doanh thu thực, Đơn hàng qua link)
```

---

## 7. QUY CHUẨN THIẾT KẾ GIAO DIỆN (UI/UX DESIGN STANDARDS - KHÔNG QUÁ AI)

> ⚠️ **CHỈ THỊ THIẾT KẾ BẮT BUỘC TỪ USER:**
> 1. **Hoàn thiện, đẹp, tinh tế, nhìn không rối mắt.**
> 2. **Không dùng mô tả dài dòng lê thê:** Không coi người dùng như con nít để phải chỉ việc từng tí. Tiêu đề ngắn gọn, số liệu rõ ràng, tự nhìn là hiểu.
> 3. **Không dùng icon vô tội vạ:** Dùng đúng nơi đúng chỗ, mang tính bổ trợ ngữ nghĩa, không spam icon lòe loẹt.
> 4. **Giao diện KHÔNG ĐƯỢC "quá AI" (No generic AI-template vibes):** Mang đúng phong cách trang thương mại điện tử chuyên nghiệp của doanh nghiệp, chuẩn hệ màu Vàng Be (Warm Sand & Brand Gold):
>    - Nền chính: `#FAF8F5` (Soft Warm Cream)
>    - Thẻ card / Sidebar: `#F3EFE6` / `#FFFFFF`
>    - Nút bấm & CTA chính: `#C59B58` (Hover `#B88E4F`, chữ `#231D15` hoặc `#FFFFFF`)
>    - Viền: `#EAE4D7` / `#EEDFC6`
>    - Chữ chính: `#1A1612`, chữ phụ: `#7D715E`
>    - Tuyệt đối không dùng màu xanh lá làm nền, header hoặc nút bấm chính!

---

## 8. QUY CHUẨN KIỂM THỬ & NGHIỆM THU BẮT BUỘC: LIVE TEST THỦ CÔNG TOÀN TRÌNH

> ⚠️ **QUY TẮC NGHIỆM THU TUYỆT ĐỐI:**
> - **KHÔNG ĐƯỢC kiểm thử qua loa bằng lệnh script chạy ngầm!**
> - **Làm xong BẮT BUỘC phải Live Test thủ công trực tiếp trên trình duyệt thật** thông qua công cụ browser automation/chụp màn hình thực tế:
>   1. Shop mở chat $\rightarrow$ Bấm nút mở popup $\rightarrow$ Tạo lời mời VIP kèm hoa hồng và voucher.
>   2. Kiểm tra thẻ tin nhắn trong chat hiện đẹp, đầy đủ thông tin, không bị chuỗi JSON thô ở sidebar.
>   3. Đăng nhập tài khoản KOL $\rightarrow$ Bấm chấp nhận $\rightarrow$ Thẻ giữ nguyên giao diện đẹp.
>   4. Khách hàng bấm vào link tiếp thị $\rightarrow$ Xem sản phẩm $\rightarrow$ Đặt hàng $\rightarrow$ Voucher tự động áp dụng.
>   5. Kiểm tra ví hoa hồng của KOL nhảy tiền thực tế thời gian thực.
>   6. Chụp ảnh màn hình từng bước làm bằng chứng kiểm thử trước khi bàn giao.

---

## 9. DANH MỤC FILE & MÃ NGUỒN CẦN CAN THIỆP

| Phân hệ | Tệp tin | Trách nhiệm can thiệp |
| :--- | :--- | :--- |
| **Database** | `backend/prisma/schema.prisma` | Chuyển `storeId` trong `Coupon` thành nullable (`storeId String?`); Migration database. |
| **Backend DTO** | `backend/src/modules/coupons/dto/create-coupon.dto.ts` | Thay `@IsUUID('4')` thành `@IsUUID('all')` cho `storeId` và `campaignId` (sửa lỗi 400 UUIDv5 seed). |
| **Backend Chat** | `backend/src/modules/chat/chat.service.ts` | Bổ sung `tier` và `socialChannels` vào query `getConversations`; Hỗ trợ type tin nhắn `COUPON_PROPOSAL` và `COUPON_PROPOSAL_APPROVED`. |
| **Backend Deals** | `backend/src/modules/affiliate-deals/affiliate-deals.service.ts` | Bổ sung `publicCommissionRate: 10` vào event `EXCLUSIVE_DEAL_DECISION` và chuẩn hóa key `vipVoucherCode`. |
| **Backend Dashboard**| `backend/src/modules/dashboard/dashboard.service.ts` | Đồng bộ cấu trúc dữ liệu trả về của `/dashboard/shop/kol-orders`. |
| **Backend Coupons**  | `backend/src/modules/coupons/coupons.service.ts` | Hỗ trợ Voucher Sàn toàn diện khi `storeId` là null; API lấy voucher hợp lệ của sản phẩm; API duyệt nhanh coupon từ chat. |
| **Frontend Preview** | `frontend/src/pages/merchant/ShopKolHubPage.tsx` | Sửa `getChatMessagePreview` parse `CAMPAIGN_INVITE` và `COUPON_PROPOSAL`; Lọc danh sách KOL bên trái; Tái cấu trúc 4 sub-tabs; Sửa lỗi crash tab Hiệu suất; Bỏ mô tả rườm rà. |
| **Frontend Chat** | `frontend/src/pages/chat/ChatBoxPage.tsx` | Bổ sung nút công cụ `[🎟️ Đề xuất mã riêng]` cho KOL; Render thẻ tương tác `CouponProposalCardBubble` cho Shop duyệt tại chỗ. |
| **Frontend Product** | `frontend/src/pages/public/ProductDetailPage.tsx` | Thêm khay hiển thị voucher của Shop dưới giá bán kèm nút [Lưu mã]. |
| **Frontend Bubble**  | `frontend/src/components/chat/CampaignCardBubble.tsx` | Giữ nguyên thẻ điều khoản chi tiết sau khi KOL bấm "Đã chấp nhận". |
| **Frontend Deal**    | `frontend/src/components/chat/ExclusiveDealCardBubble.tsx` | Sửa hiển thị `Hoa hồng sàn: 10%` và hiển thị mã voucher VIP chính xác. |
| **Frontend Modal**   | `frontend/src/components/chat/SendVipCampaignModal.tsx` | Nâng cấp thành **Unified VIP Collaboration Modal** (Gộp Chiến dịch + Voucher + Sản phẩm + Hoa hồng trong 1 bước, tối giản, không mô tả thừa). |
| **Frontend Coupons** | `frontend/src/pages/collaborator/KolCouponsPage.tsx` | Sửa lỗi form đề xuất mã riêng; Tự động đồng bộ coupon được kích hoạt từ Chat. |
| **Frontend Admin**   | `frontend/src/pages/admin/AdminVoucherIssuer.tsx` | Cho phép chọn phạm vi "Toàn sàn" (không bắt buộc chọn gian hàng đơn lẻ). |

---

## 10. BỔ SUNG KIỂM TOÁN VÀ KHẮC PHỤC 6 VẤN ĐỀ THỰC TẾ (USER AUDIT 25/10/2026)

### 10.1. Vấn đề 1 (Ảnh 1): Nghiệp vụ Form Đề Xuất Mã Riêng của KOL
- **Hiện trạng:** Form chỉ có 3 ô cơ bản (Mã, Mức giảm %, Mục đích sử dụng), thiếu hoàn toàn các điều kiện cốt lõi của một thỏa thuận voucher thực tế.
- **Giải pháp chuẩn hóa (Production E-Commerce Spec):**
  1. **Hình thức giảm giá:** Cho phép chọn giữa **`Giảm theo %`** (kèm mức trần Giảm tối đa VNĐ) HOẶC **`Giảm số tiền cố định (VNĐ)`** (ví dụ: giảm ngay 30.000₫ cho đơn mỹ phẩm).
  2. **Giá trị đơn tối thiểu (Min Spend):** Bắt buộc cấu hình giá trị đơn tối thiểu (ví dụ: từ 150.000₫) để bảo vệ Shop không bị lỗ âm đơn giá trị nhỏ.
  3. **Thời hạn hiệu lực:** Có ngày bắt đầu và ngày kết thúc (mặc định 14 - 30 ngày theo đợt chiến dịch lên video review của KOL).
  4. **Phạm vi áp dụng:** Lựa chọn giữa **Toàn gian hàng** hoặc **Sản phẩm cụ thể** mà KOL đang nhận hợp tác review.
  5. Cập nhật đồng bộ cả trên [ProposeCouponInChatModal.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/chat/ProposeCouponInChatModal.tsx) và [KolCouponsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolCouponsPage.tsx).

### 10.2. Vấn đề 2 (Ảnh 2): Sửa dứt điểm lỗi hiển thị JSON thô ở dòng xem trước tin nhắn
- **Hiện trạng:** Dòng xem trước tin nhắn ở danh sách hội thoại hiển thị chuỗi JSON thô: `{"type":"CAMPAIGN_ACCEPTED","pa...`.
- **Giải pháp:** Cập nhật hàm `getChatMessagePreview` trong cả [ChatBoxPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/chat/ChatBoxPage.tsx) và [ShopKolHubPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopKolHubPage.tsx):
  - Phân tích an toàn qua `try/catch` JSON parse.
  - Chuyển đổi mọi loại thẻ số sang tiếng Việt tự nhiên:
    - `CAMPAIGN_INVITE` $\rightarrow$ `👑 Lời mời chiến dịch VIP: [Tên]`
    - `CAMPAIGN_ACCEPTED` $\rightarrow$ `✓ Đã đồng ý tham gia chiến dịch: [Tên]`
    - `CAMPAIGN_REJECTED` $\rightarrow$ `✕ Đã từ chối chiến dịch: [Tên]`
    - `COUPON_PROPOSAL` $\rightarrow$ `🎟️ Đề xuất mã giảm giá riêng: [Mã]`
    - `COUPON_PROPOSAL_APPROVED` $\rightarrow$ `✅ Shop đã duyệt & kích hoạt mã: [Mã]`
    - `EXCLUSIVE_DEAL_PROPOSAL` $\rightarrow$ `🤝 Đề xuất thỏa thuận hoa hồng riêng`

### 10.3. Vấn đề 3 (Ảnh 3): Tái thiết kế Header Cột trái Danh sách KOL
- **Hiện trạng:** Vạch đứng `|` bị rơi lơ lửng, vòng tròn số `4` bị đè, nút `[Đối tác Deal]` bị chèn ép với nút thu gọn `<`.
- **Giải pháp:**
  - Bỏ ký tự vạch đứng `|` thừa.
  - Tách bạch rõ ràng: Cụm bên trái gồm icon danh bạ + Tiêu đề "Nhà sáng tạo" + Huy hiệu số lượng `(4)`.
  - Nút `[Đối tác Deal]` chuyển thành tab chọn lọc hoặc pill badge nằm gọn gàng trên thanh công cụ tìm kiếm, không nhồi nhét chung hàng với nút thu gọn sidebar.

### 10.4. Vấn đề 4 (Ảnh 4): Đồng bộ Trạng thái Header KOL vs Khung Chat & Giữ Cache Chuyển Tab
- **Hiện trạng:** Header đã hiển thị tên `Nguyễn Mai Anh`, nhưng khung chat bên dưới lại hiện màn hình trống rỗng "Chọn một hội thoại". Khi chuyển tab con bị giật lag unmount reload lại từ đầu.
- **Giải pháp:**
  1. Khi `selectedKol` có giá trị, tự động tìm và gán `activeConvId` trong context chat để mở ngay hội thoại của KOL đó, loại bỏ triệt để hiện tượng "trên có tên mà dưới trống trơn".
  2. Khi chưa chọn KOL nào, hiển thị màn hình trống đồng bộ toàn trang.
  3. Áp dụng kỹ thuật giữ cache hiển thị tab: Sử dụng CSS `hidden` hoặc lưu cache dữ liệu client, chuyển tab tức thì không fetch lại hay reload giao diện.

### 10.5. Vấn đề 5: Khắc phục Lỗi Input Masking (Gõ số 0 tự sinh 3 số 0)
- **Hiện trạng:** Tại các ô nhập tiền tệ/ngân sách, khi người dùng gõ số 0 thì input tự động chèn thêm `000`.
- **Giải pháp:** Tách biệt state lưu trữ giá trị số nguyên thô (raw number) và định dạng hiển thị. Không tự động nhân 1000 hay format regex khi người dùng đang trong quá trình gõ phím.

### 10.6. Vấn đề 6 (Ảnh 5): Tinh gọn Quy trình Chiến dịch VIP All-In-One (Không Rườm Rà)
- **Hiện trạng:** Quy trình tạo chiến dịch bị phân mảnh (tạo chiến dịch ở 1 nơi $\rightarrow$ tạo voucher ở 1 nơi $\rightarrow$ vào chat tìm cách mời).
- **Giải pháp:** Nâng cấp [SendVipCampaignModal.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/chat/SendVipCampaignModal.tsx) thành modal mời trọn gói 1 bước:
  - Chọn chiến dịch có sẵn hoặc nhập nhanh tên chiến dịch mới.
  - Chọn % hoa hồng thưởng thêm (+1% đến +5%).
  - Tùy chọn đính kèm voucher ưu đãi cho chiến dịch.
  - Thiết lập ngân sách và thời hạn.
  - Bấm `[Gửi thẻ mời ngay]` là hệ thống tự động hoàn tất và bắn thẻ tương tác vào cuộc trò chuyện.

### 10.7. Quy chuẩn Kiểm Thử & Chụp ảnh Màn hình Mới
- **Tuyệt đối KHÔNG sử dụng subagent browser live test** gây chậm và tốn token của người dùng.
- **Quy chuẩn bắt buộc:** Chạy script headless Node.js / Puppeteer trực tiếp từ terminal, chụp các ảnh artifact nhanh chóng (vài giây), kiểm tra ảnh tĩnh và bàn giao minh chứng rõ ràng.

---

## 11. BÁO CÁO NGHIỆM THU & KẾT QUẢ TRIỂN KHAI THỰC TẾ (HOÀN TẤT TOÀN DIỆN)

| STT | Hạng mục / Lỗi kiểm toán | Hiện trạng khắc phục | Tệp tin can thiệp chính | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Vấn đề 1 (Ảnh 1):** Form đề xuất mã riêng của KOL thiếu hạn dùng, giảm tiền VNĐ, ngành hàng, đơn tối thiểu | Đã nâng cấp toàn diện: hỗ trợ % (kèm trần tối đa VNĐ) hoặc số tiền cố định VNĐ, đơn tối thiểu, thời hạn ngày, phạm vi cửa hàng / sản phẩm. | `ProposeCouponInChatModal.tsx`, `KolCouponsPage.tsx`, `CouponProposalCardBubble.tsx` | ✅ Đã hoàn thành |
| **2** | **Vấn đề 2 (Ảnh 2):** Tin nhắn preview hiện chuỗi JSON thô `{"type":"CAMPAIGN_ACCEPTED"...}` | Đã bổ sung bộ phân giải thông minh `getChatMessagePreview` cho tất cả các loại thẻ số (Chiến dịch, Coupon, Deal) sang tiếng Việt tự nhiên. | `ShopCollaborationPage.tsx`, `ScanmsChatContext.tsx`, `ShopKolHubPage.tsx` | ✅ Đã hoàn thành |
| **3** | **Vấn đề 3 (Ảnh 3):** Header cột trái danh sách KOL bị đè chữ, vạch đứng rơi lơ lửng, nút Deal bị chèn ép | Bỏ ký tự thừa, căn chỉnh lại tiêu đề `Nhà sáng tạo (4)`, đưa nút `[🤝 Đối tác Deal]` xuống thanh pill filter gọn gàng không bị chèn ép. | `ShopKolHubPage.tsx` | ✅ Đã hoàn thành |
| **4** | **Vấn đề 4 (Ảnh 4):** Lệch state: Header đã chọn Mai Anh nhưng chat hiện "Chọn một hội thoại", tab chuyển bị reload | Tự động đồng bộ `activeConvId` khi có `targetCollaboratorId`, bọc DOM cache `hidden/block` cho tab Chat để chuyển tab tức thì 0ms không unmount. | `ChatBoxPage.tsx`, `ShopKolHubPage.tsx` | ✅ Đã hoàn thành |
| **5** | **Vấn đề 5:** Lỗi input số: gõ số 0 tự sinh 3 số 0 | Loại bỏ logic nhân 1000/mask chuỗi tự động; chuẩn hóa parse `parseInt(digits, 10)` an toàn cho mọi ô nhập liệu. | `ProposeCouponInChatModal.tsx`, `KolCouponsPage.tsx`, `CouponProposalCardBubble.tsx` | ✅ Đã hoàn thành |
| **6** | **Vấn đề 6 (Ảnh 5):** Quy trình mời chiến dịch VIP phân mảnh | Hợp nhất modal mời VIP trong chat với lựa chọn chiến dịch, bonus hoa hồng (+1% đến +5%), ngày hết hạn và gửi thẻ trực tiếp vào chat. | `SendVipCampaignModal.tsx`, `CampaignCardBubble.tsx` | ✅ Đã hoàn thành |
| **7** | **Lỗi UUIDv5 Seed:** `storeId phải là định dạng UUID hợp lệ` | Cập nhật DTO `@IsUUID('all')` cho `storeId` và `campaignId` hỗ trợ tất cả phiên bản UUID RFC 4122. | `create-coupon.dto.ts`, `coupons.service.ts` | ✅ Đã hoàn thành |
| **8** | **Voucher Shop dưới giá bán:** Khay mã ưu đãi trên trang chi tiết sản phẩm | Hiển thị khay mã voucher vàng be sang trọng kèm nút `[Lưu mã]` dưới khối giá và tính toán tự động. | `ProductDetailPage.tsx` | ✅ Đã hoàn thành |

---

## 12. ĐẶC TẢ KIẾN TRÚC NGHIỆP VỤ HỢP NHẤT: XÓA BỎ SỰ PHÂN MẢNH 3 NƠI (BUSINESS ARCHITECTURE UNIFIED SPEC)

### 12.1. Phân Tích Gốc Rễ: Bẫy Thiết Kế "Table-Driven UI" Dẫn Đến Trải Nghiệm Phân Mảnh
Quy trình cũ bắt một Chủ Shop muốn mời KOL phải đi qua **3 nơi khác nhau cho 1 mục đích duy nhất**:
1. Vào `Khuyến mãi & Hoa hồng` (`/merchant/promotions`) bấm *[Tạo chiến dịch]* $\rightarrow$ Tạo xong chiến dịch nằm im trơ trọi.
2. Bấm nút *[Phát hành voucher mới]* nằm kế bên $\rightarrow$ Phải tự nhớ tên chiến dịch ở bước 1 để chọn dropdown gắn vào.
3. Thoát ra, mò sang `Mạng lưới KOL & Hợp tác` (`/merchant/kol-hub`), tìm KOL, mở Chat, lại bấm *[Mời VIP]* để chọn lại chiến dịch!

> ⚠️ **Hậu quả:** Người mới dùng web không bao giờ hiểu được quy trình "đánh đố" này. Hệ thống vi phạm nguyên tắc cơ bản nhất của sản phẩm TMĐT: **Không được bắt người dùng ghép nối các bảng dữ liệu bằng tay**.

---

### 12.2. Chuẩn Business Thực Tế: Phân Định Rạch Ròi 2 Bài Toán Độc Lập

```
                                      HỆ THỐNG MARKETING GIAN HÀNG SCANMS
                                                       │
         ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
         ▼                                                                                           ▼
  BÀI TOÁN 1: KHUYẾN MÃI CHO KHÁCH MUA                                         BÀI TOÁN 2: TIẾP THỊ & HỢP TÁC VỚI KOL
  (Shopper Vouchers & Promotions)                                              (KOL Collaboration & Affiliate Campaigns)
  • Địa chỉ: /merchant/promotions?tab=coupons                                  • Địa chỉ: /merchant/kol-hub
  • Đối tượng: Khách hàng vãng lai mua sắm trên sàn                            • Đối tượng: Nhà sáng tạo nội dung (KOL/KOC/CTV)
  • Bản chất: Voucher giảm giá, Freeship hiển thị dưới giá SP                  • Bản chất: Hoa hồng thưởng thêm, Voucher độc quyền cho Fan
  • Nút thao tác: CHỈ CÓ DUY NHẤT 1 NÚT:                                       • Nút thao tác: CHỈ NẰM TẠI TRUNG TÂM KOL:
    [+ Tạo Voucher Gian Hàng] (Preset 10%, 50k, Freeship)                        1. Mời đích danh 1-1: [👑 Mời Hợp Tác VIP 1-Click]
    + Banner chỉ dẫn: "Muốn tạo chiến dịch cho KOL? -> Vào Hub KOL"              2. Phát động toàn sàn: [📢 Phát Động Chiến Dịch Mở]
```

---

### 12.3. Quy Hoạch & Kế Hoạch Can Thiệp Mã Nguồn Cụ Thể

#### Bước 1: Dọn dẹp trang Quản lý Voucher Gian Hàng (`ShopCouponsPage.tsx`)
- **Loại bỏ hoàn toàn nút "Tạo chiến dịch" rời rạc** khỏi thanh công cụ của `ShopCouponsPage.tsx` (dòng 670-676).
- Giữ nguyên nút CTA chuẩn duy nhất: **`[+ Phát hành voucher mới]`** kèm 3 chip preset nhanh (`Giảm 10%`, `Giảm 50K`, `Freeship 25K`).
- Bổ sung **Banner Chỉ Dẫn Thông Minh (Contextual Guide Banner)** trên đỉnh trang:
  > *💡 **Bạn muốn tạo Chiến dịch đẩy số hoặc cấp mã ưu đãi riêng cho KOL/KOC?**  
  > Hãy truy cập **[Trung Tâm Hợp Tác KOL (`/merchant/kol-hub`)]** để gửi lời mời hợp tác trọn gói 1-Click.*

#### Bước 2: Hợp nhất Luồng Mời Hợp Tác VIP 1-Click tại Hub KOL (`SendVipCampaignModal.tsx`)
- Khi Shop bấm **`[👑 Mời chiến dịch VIP]`** trong Chat 1-1 với KOL:
  - Mở Sheet All-In-One duy nhất:
    1. **Chiến dịch & Sản phẩm:** Chọn chiến dịch có sẵn hoặc nhập nhanh tên chiến dịch mới.
    2. **Hoa hồng thưởng thêm:** Chọn mức VIP ($+1\%$ đến $+5\%$) với thước đo an toàn dưới trần $25\%$.
    3. **Voucher độc quyền cho Follower của KOL (Tùy chọn 1-Click):**
       - Bật công tắc: `[x] Cấp voucher riêng mang tên ${collaboratorName}` (tự sinh mã `SORA_MAIANH15`).
       - Nhập % giảm hoặc số tiền giảm cố định VNĐ.
    4. **Thời hạn & Cam kết.**
  - Bấm **`[🚀 Gửi Thư Mời Hợp Tác Ngay]`**: Hệ thống tự động xử lý toàn bộ ngầm (tạo chiến dịch, tạo voucher, sinh link VIP) và bắn Thẻ hợp tác trực tiếp vào Chat.
  - KOL bấm **"Đồng ý"** là kích hoạt đồng loạt cả 3 quyền lợi!

#### Bước 3: Khóa cứng Gian hàng khi Shop chỉ có 1 Store (Auto-Binding)
- Kiểm tra `availableStores.length <= 1`: Tự động khóa chặt `storeId`, ẩn hoàn toàn dropdown chọn store gây phân tâm và lỗi dữ liệu.

#### Bước 4: Tái cấu trúc Tab "Link tiếp thị" của Shop (`StoreReferralLinksPage.tsx`)
- Đổi tiêu đề thành **"Giám sát Hiệu suất Link Tiếp Thị của Đối tác"**.
- Chuyển trọng tâm từ "Shop tự tạo link" sang "Theo dõi các link mà KOL đang chạy, lượt click, đơn hàng và doanh số mang về".

---

### 12.4. Kịch Bản Kiểm Thử & Nghiệm Thu Tự Động (Playwright Headless)
1. Truy cập `/merchant/promotions`: Xác nhận **không còn nút Tạo chiến dịch lơ lửng**, chỉ có nút Tạo Voucher Shop + Banner chỉ dẫn sang Hub KOL.
2. Truy cập `/merchant/kol-hub`: Mở modal Mời VIP 1-Click, kiểm tra tích hợp trọn gói (Hoa hồng + Voucher + Ngày hạn) gửi thẳng vào Chat.
3. Chụp ảnh minh chứng artifact bàn giao.

---

## 13. ĐẶC TẢ TỔNG THỂ CẢI TIẾN NGHIỆP VỤ & TÁI CẤU TRÚC GIAO DIỆN CHUYÊN NGHIỆP (BỔ SUNG THEO YÊU CẦU USER 25/10/2026)

### 13.1. Hạng mục 1: Tách Tab "Thỏa thuận độc quyền (Exclusive Deals)" riêng biệt trên Hub Khuyến Mãi & Hoa Hồng
* **Bản chất nghiệp vụ:**
  - Trong chính sách thương mại TMĐT đa tầng của SCANMS, có 3 hình thức ưu đãi/hoa hồng cho KOL:
    1. **Open Plan (Mặc định toàn sàn):** Hoa hồng cơ bản 10% mở cho mọi CTV.
    2. **Campaign Plan (Chiến dịch theo thời vụ):** Bonus thêm +1% đến +5% cho nhóm KOL tham gia theo giai đoạn.
    3. **Exclusive Deal Plan (Thỏa thuận riêng 1-1):** Thỏa thuận cam kết doanh số và hoa hồng độc quyền giữa Shop và 1 KOL cụ thể (được khởi tạo từ Chat hoặc từ Proposal).
  - Trước đây, phần "Đề xuất Exclusive Deal" bị nhét tạm bợ ở đáy trang Chiến dịch (`ShopCampaignsPage.tsx`) gây rối mắt, mất cân đối và làm loãng nội dung chiến dịch.
* **Quy chuẩn kiến trúc mới:**
  - Tách thành 1 tab độc lập tại `/merchant/promotions?tab=exclusive-deals` mang tên **`Thỏa thuận độc quyền`** (Icon `Handshake`).
  - Thanh tab `/merchant/promotions` có 5 tabs đồng cấp, rõ ràng:
    `[🏷️ Mã giảm giá]` · `[📅 Chiến dịch]` · `[🤝 Thỏa thuận độc quyền]` · `[🏆 Hoa hồng & thưởng]` · `[🔗 Link tiếp thị]`
  - Di chuyển component `ExclusiveDealInbox` từ `ShopCampaignsPage` sang tab này.

### 13.2. Hạng mục 2: Chuẩn hóa Giao diện Chuyên nghiệp - Xóa bỏ Mô tả Dài Dòng & Icon/Emoji AI
* **Nguyên tắc thiết kế tối thượng:**
  - Người dùng là các Nhà Quản Trị Gian Hàng (Shop Managers) chuyên nghiệp. Giao diện B2B SaaS cần khúc chiết, trực quan, không dùng các đoạn mô tả "cầm tay chỉ việc" như dạy trẻ em.
  - Xóa sạch các subtitle mô tả giải thích dưới tiêu đề ở các tab:
    - Tab Mã giảm giá: Bỏ *"Phát hành mã ưu đãi công khai áp dụng trên toàn Shop..."*
    - Tab Chiến dịch: Bỏ *"Quản lý các chiến dịch thưởng thêm hoa hồng cho KOL..."*
    - Tab Thỏa thuận độc quyền: Bỏ các mô tả dài dòng không cần thiết.
    - Tab Hoa hồng: Bỏ các đoạn giải thích sơ đẳng.
  - Loại bỏ hoàn toàn các emoji/icon mang cảm giác nháp/AI (`🎯`, `💌`, `✨`...), thay thế bằng hệ thống icon Lucide SVG chuẩn mực doanh nghiệp (`Megaphone`, `Send`, `UserPlus`, `Coins`, `Handshake`).
  - Tuân thủ 100% bảng màu thương hiệu Vàng Be (Warm Sand & Brand Gold): `#FAF8F5`, `#F3EFE6`, `#FFFFFF`, `#C59B58`, `#B88E4F`, `#231D15`, `#EAE4D7`, `#1A1612`, `#7D715E`.

### 13.3. Hạng mục 3: Modal Mời KOL Thông Minh Trong Chiến Dịch (In-Place VIP Invite)
* **Vấn đề cũ:** Nút "Mời KOL" trong thẻ chiến dịch bắt người dùng gõ tay mã định danh UUID hoặc redirect sang kol-hub làm đứt đoạn trải nghiệm.
* **Giải pháp chuẩn:**
  - Bấm "Mời KOL" sẽ mở modal tại chỗ: Danh sách các KOL đã từng nhắn tin/tương tác với Shop.
  - Hiển thị danh thiếp tóm tắt: Avatar, Tên KOL, Cấp bậc (Vàng/Bạc/Kim cương), Số người theo dõi, Kênh liên kết.
  - Cho phép tích chọn 1 hoặc nhiều KOL và bấm **`Gửi lời mời`** ngay lập tức, tự động kích hoạt lời mời chiến dịch qua Socket.IO mà không cần chuyển trang.

### 13.4. Hạng mục 4: Tái cấu trúc Sidebar Merchant & Hợp nhất Quản lý Đơn hàng (Orders & Sample Consolidation)
* **Bản chất nghiệp vụ:**
  - Đối với chủ shop, "Đơn bán hàng cho khách" và "Đơn hàng mẫu gửi cho KOL" đều là các đơn hàng cần đóng gói, vận chuyển và theo dõi mã vận đơn GHN.
  - Hợp nhất thành mục **`Quản lý Đơn hàng`** (`/merchant/orders`) với 2 sub-tabs đầu trang:
    `[ 👜 Đơn bán hàng ]` · `[ 📦 Hàng mẫu KOL ]`
  - Điều chỉnh thứ tự Sidebar theo đúng chuẩn vận hành:
    - Bảng điều khiển (`/merchant/dashboard`)
    - Sản phẩm (`/merchant/products`)
    - Đơn hàng (`/merchant/orders` - gồm Đơn bán & Hàng mẫu)
    - Khuyến mãi & Hoa hồng (`/merchant/promotions`)
    - Mạng lưới KOL (`/merchant/kol-hub`)
    - Đánh giá sản phẩm (`/merchant/reviews`)
    - Tin nhắn khách hàng (`/merchant/chat` - kéo xuống sát mục Tài chính)
    - Doanh thu & Ví Shop (`/merchant/wallet`)
    - Đối soát hoa hồng KOL (`/merchant/payouts`)
    - Cài đặt gian hàng (`/merchant/settings`)

### 13.5. Hạng mục 5: Kiến trúc Ví & Rút Tiền Doanh Thu Gian Hàng (Merchant Revenue Wallet & Payout System)
* **Thực trạng kỹ thuật & Lỗi hiện hữu:**
  1. `/merchant/wallet` bị lỗi **403 Forbidden** vì route này trong `AppRoutes.tsx` đang trỏ nhầm sang `pages/collaborator/WalletPage.tsx` (trang ví KOL, gọi API KYC cá nhân bị Guard chặn quyền).
  2. `/merchant/payouts` bị lỗi **400 Bad Request** (`Validation failed (uuid v 4 is expected)`) vì `PayoutApprovalPage.tsx` truyền `storeId` chưa chuẩn UUID v4 khi gọi API backend.
* **Chuẩn hóa Kiến Trúc Nghiệp Vụ Ví Doanh Thu Gian Hàng (`ShopRevenueWalletPage.tsx`):**
  - **4 Chỉ số Tài chính Cốt lõi của Gian hàng:**
    1. **Số dư khả dụng (Available Balance):** Số tiền từ các đơn hàng đã giao thành công và hoàn tất thời gian chờ khiếu nại (14 ngày). Chủ shop có thể rút về tài khoản ngân hàng bất cứ lúc nào.
    2. **Số dư tạm giữ / Chờ đối soát (Pending Escrow Balance):** Tiền thu hộ từ các đơn hàng mới giao hoặc đang vận chuyển, chờ khách xác nhận và hết hạn đổi trả 14 ngày.
    3. **Tổng doanh thu tích lũy (Total Lifetime Revenue):** Tổng giá trị đơn hàng thực thu từ ngày mở gian hàng.
    4. **Đã rút về ngân hàng (Total Withdrawn):** Tổng số tiền đã thanh toán vào tài khoản ngân hàng của doanh nghiệp.
  - **Chức năng Rút tiền về Ngân hàng (Bank Withdrawal Request):**
    - Modal nhập số tiền muốn rút (tối thiểu 100.000₫, tối đa bằng Số dư khả dụng).
    - Chọn thông tin ngân hàng doanh nghiệp thụ hưởng (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản).
    - Tạo lệnh rút tiền với trạng thái `PENDING` gửi lên Chuyên viên Vận hành / Kế toán sàn SCANMS duyệt.
  - **Sổ cái Giao dịch Tài chính Gian hàng (Financial Ledger):**
    - Bảng lịch sử ghi nhận chi tiết mọi biến động số dư:
      - `ORDER_PAYOUT`: Cộng tiền hàng khi đơn thành công (+).
      - `AFFILIATE_COMMISSION`: Trừ hoa hồng trả cho KOL (-).
      - `PLATFORM_FEE`: Trừ phí sàn TMĐT (-).
      - `WITHDRAWAL`: Trừ tiền khi thực hiện lệnh rút về ngân hàng (-).
      - `ORDER_REFUND`: Trừ tiền hoàn trả khách khi có tranh chấp đổi trả (-).
  - **Sửa dứt điểm lỗi 400 trên `/merchant/payouts` (`PayoutApprovalPage.tsx`):**
    - Đảm bảo kiểm tra và lấy đúng UUID v4 của `storeId` từ thông tin cửa hàng hiện tại trước khi gọi API lịch sử chi trả.





