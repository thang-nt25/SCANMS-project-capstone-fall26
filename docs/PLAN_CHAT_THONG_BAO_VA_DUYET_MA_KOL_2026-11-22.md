# KẾ HOẠCH ĐỒNG BỘ LUỒNG XIN MÃ KOL $\rightarrow$ TIN NHẮN CHAT $\rightarrow$ XÉT DUYỆT & GÁN % (2026-11-22)

> **Trạng thái:** Chờ chốt phương án (**Chưa chỉnh sửa code**).

---

## 1. TẠI SAO KOL THẤY "CHỜ SHOP DUYỆT" NHƯNG VÀO SHOP KHÔNG THẤY CHỖ DUYỆT?

Qua kiểm tra thực tế Database và mã nguồn Frontend/Backend, có **3 nguyên nhân gốc rễ**:

1. **5 mã `PENDING_APPROVAL` nằm rải rác ở 5 Cửa hàng khác nhau:**
   - Dữ liệu hiện tại của `kol.bronze@scanms.vn` có `5` mã chờ duyệt, nhưng chỉ có **1 mã (`NHINE02`)** thuộc về `Sora Skincare & Cosmetics`; `4` mã còn lại (`TESTKOL879`, `TESTKOL236`, `TESTKOL716`, `TESTKOL857`) thuộc về `Aura Fashion Studio`, `Lumière Smart Living`, `Aura Activewear & Apparel` và `GreenBio Health & Nutrition`. Nếu đăng nhập `manager.sora@scanms.vn` sẽ không thấy 4 mã của 4 shop kia.
2. **Đang đứng ở `Mạng lưới Đối tác` thay vì `Ưu đãi & Đãi ngộ`, hoặc bị giới hạn 20 dòng + Cache snapshot:**
   - Nút duyệt mã của Chủ Shop hiện nằm ở **`Ưu đãi & Đãi ngộ → Đãi ngộ & Mã ưu đãi KOC`** (`/merchant/promotions?tab=creator-incentives`), không nằm ở `Mạng lưới Đối tác` (`/merchant/kol-hub`).
   - Ngoài ra, [ShopCreatorIncentivesTab.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/promotions/ShopCreatorIncentivesTab.tsx#L110) gọi `couponService.getStoreCoupons(sId)` **không truyền `limit`**, nên Backend `getStoreCoupons` mặc định chỉ lấy **`20` mã mới nhất (`take: 20`)**. Nếu Shop có nhiều hơn 20 mã, các mã chờ duyệt cũ hơn sẽ bị rơi sang trang 2 và **biến mất khỏi khối `Đề xuất mã từ KOC`**. Đồng thời cache biến cục bộ `lastCreatorIncentivesSnapshot` khiến lần quay lại tab có thể chưa hiện mã mới ngay.
3. **KOL xin mã chưa tự động báo vào khung Chat với Shop:**
   - Khi KOL đề xuất mã qua `POST /api/collaborator/coupons`, Backend chỉ tạo thông báo chuông (`Notification`) chứ **chưa gửi tin nhắn / thẻ đề xuất vào khung Chat 1-1** với Chủ Shop, nên Chủ Shop không biết có yêu cầu mới để bấm vào duyệt.

---

## 2. KẾ HOẠCH TRIỂN KHAI 4 BƯỚC (CHƯA CODE)

### Bước 1 — Đặt nút `+ Xin mã ưu đãi` ngay cạnh `+ Đề xuất Deal` & Bỏ nút `Xem cửa hàng`
- **File:** [ShopCollaborationPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/ShopCollaborationPage.tsx#L1454-L1471)
- **Thay đổi dự kiến:**
  - Gỡ bỏ thẻ `<a>Xem cửa hàng</a>` ở thanh công cụ đầu khung Chat (vì bấm vào tên Cửa hàng ở bên trái đã mở gian hàng rồi).
  - Thêm nút **`+ Xin mã ưu đãi`** ngay bên cạnh nút **`+ Đề xuất Deal`**, bấm vào sẽ mở modal đề xuất mã (`ProposeCouponInChatModal`) gắn sẵn `selectedStore.id` và `selectedStore.name`.

### Bước 2 — Tự động bắn thông báo thẻ đề xuất mã vào Tin nhắn Chat với Shop
- **File dự kiến:** `backend/src/modules/coupons/coupons.service.ts` (hàm tạo đề xuất mã của KOL) & `backend/src/modules/chat/chat.service.ts` (hoặc controller/service liên quan).
- **Thay đổi dự kiến:**
  - Khi KOL gửi đề xuất mã thành công (dù bấm từ trang `Công cụ tiếp thị -> Mã ưu đãi` hay từ nút `+ Xin mã ưu đãi` trong Chat), Backend tự động lấy/khởi tạo phòng Chat 1-1 giữa `collaboratorId` và `store.ownerId` (cũng như phát sự kiện Socket.IO realtime) để gửi **1 tin nhắn dạng thẻ có cấu trúc** (`COUPON_PROPOSAL` metadata/payload), chứa:
    - `couponId`, `displayCode` (vd `NHINE02`), `storeId`, `storeName`, `note` của KOL.
  - Đảm bảo không gửi trùng nếu Frontend trong Chat trước đó tự gửi thêm 1 tin nhắn text phụ (gom về 1 nguồn chuẩn duy nhất).

### Bước 3 — Chủ Shop bấm vào thẻ tin nhắn xin mã trong Chat $\rightarrow$ Nhảy thẳng tới trang xét duyệt & gán `%`
- **File dự kiến:** `frontend/src/pages/merchant/ShopKolHubPage.tsx` & `frontend/src/pages/chat/ChatBoxPage.tsx` (component render bong bóng tin nhắn Chat).
- **Thay đổi dự kiến:**
  - Hiển thị thẻ đề xuất mã KOL rõ ràng ngay trong luồng tin nhắn của Chủ Shop (tên mã, KOC đề xuất, ghi chú, phạm vi `Toàn bộ sản phẩm của gian hàng`) kèm nút CTA **`Xem chi tiết & Xét duyệt`**.
  - Khi Chủ Shop bấm nút này, điều hướng thẳng sang:
    **`/merchant/promotions?tab=creator-incentives&reviewCouponId=<couponId>`** (và xóa/làm mới cache để tải dữ liệu mới nhất).

### Bước 4 — Đảm bảo 100% mã `Chờ Shop duyệt` luôn hiện lên đầu & Tự mở popup xét duyệt khi đi từ Chat
- **File:** [ShopCreatorIncentivesTab.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/promotions/ShopCreatorIncentivesTab.tsx)
- **Thay đổi dự kiến:**
  1. **Không bao giờ rớt mã chờ duyệt do phân trang:** Gọi song song `couponService.getStoreCoupons(sId, { status: 'PENDING_APPROVAL', limit: 100 })` (hoặc `limit: 100`) để **100% mã `Chờ Shop duyệt` của cửa hàng luôn xuất hiện đầy đủ** ở khối `Đề xuất mã từ KOC`, bất kể tổng số mã của Shop có vượt quá 20 hay không.
  2. **Deep-link từ Chat (`?reviewCouponId=<id>`):** Khi URL có `reviewCouponId`, `ShopCreatorIncentivesTab` tự động fetch mới (bỏ qua snapshot cũ), tìm đúng mã đó:
     - Nếu đang `PENDING_APPROVAL`: **tự động mở popup `"Xét duyệt mã KOC"`** để Chủ Shop xem thông tin và gán `%` (`3%–20%`), trần giảm tối đa, ngày hết hạn ngay lập tức.
     - Nếu đã duyệt/từ chối rồi: **tự động mở popup `"Chi tiết mã"`** để Chủ Shop xem trạng thái hiện tại.

---

## 3. KIỂM CHỨNG SAU KHI BẠN DUYỆT PLAN VÀ TRIỂN KHAI
1. Đăng nhập KOL (`kol.bronze@scanms.vn`) $\rightarrow$ Vào `Hợp tác & Hàng mẫu` chọn `Sora Skincare`: thấy nút `+ Đề xuất Deal` và `+ Xin mã ưu đãi` cạnh nhau (không còn nút `Xem cửa hàng`).
2. KOL gửi xin mã mới (vd `TESTCHAT26`) $\rightarrow$ Tin nhắn thẻ xuất hiện ngay trong khung Chat với Chủ Shop Sora.
3. Đăng nhập Chủ Shop (`manager.sora@scanms.vn`) $\rightarrow$ Mở Chat thấy thẻ `TESTCHAT26`, bấm **`Xem chi tiết & Xét duyệt`** $\rightarrow$ Chuyển thẳng sang `/merchant/promotions?tab=creator-incentives&reviewCouponId=...` và tự mở popup xét duyệt gán `%` + hiển thị đầy đủ tất cả mã `Chờ Shop duyệt`.
