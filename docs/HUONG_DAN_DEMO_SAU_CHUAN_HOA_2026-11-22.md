# HƯỚNG DẪN DEMO & TÁI HIỆN ĐẦY ĐỦ CÁC CHỨC NĂNG ĐÃ CHUẨN HÓA (SCANMS)

> **Tài liệu đối chiếu sau triển khai 6 Phase chuẩn hóa** — Mọi màn hình bên dưới đã được kiểm thử trực tiếp trên trình duyệt tại `http://localhost:5173` kết nối Backend (`http://localhost:3000`), Redis (`127.0.0.1:6379`) và Supabase PostgreSQL sau khi đồng bộ Prisma schema.

---

## 1. Tài khoản Demo 5 Vai trò (Lấy từ `frontend/.env`)

| Vai trò | Email đăng nhập | Mật khẩu | Trang đích mặc định |
| :--- | :--- | :--- | :--- |
| **Khách mua (`CUSTOMER`)** | `customer.an@scanms.vn` | `Customer@123456` | `/customer/orders` |
| **KOL / KOC (`COLLABORATOR`)** | `kol.bronze@scanms.vn` | `Kol@123456` | `/collaborator/dashboard` |
| **Chủ Shop (`SHOP_MANAGER`)** | `manager.sora@scanms.vn` | `Shop@123456` | `/merchant/dashboard` |
| **Vận hành (`SYSTEM_MANAGER`)** | `manager@scanms.vn` | `Manager@123456` | `/admin/users` |
| **Quản trị (`SYSTEM_ADMIN`)** | `admin@scanms.vn` | `Admin@123456` | `/admin/analytics` |

---

## 2. Kịch bản Demo Từng Bước Cho Hội Đồng Giám Khảo

### Bước 1: Giao diện Public & Xóa bỏ hoàn toàn Livestream
1. Truy cập `http://localhost:5173/marketplace` và `http://localhost:5173/products/SORA-VITC-215`.
2. **Điểm nhấn trình bày:**
   - Giao diện đồng bộ tông **Vàng Be (`#FAF8F5` / `#F3EFE6` / `#C59B58`)**, tải nhanh qua Redis cache.
   - Toàn bộ banner, tab, bộ lọc, badge và route Livestream đã được gỡ bỏ 100% khỏi cả Frontend, Backend và Database.
- Ảnh chứng minh:
  - [01-public-marketplace-no-livestream.png](file:///c:/HW/CAPSTONE/docs/screenshots/01-public-marketplace-no-livestream.png)
  - [02-public-product-detail.png](file:///c:/HW/CAPSTONE/docs/screenshots/02-public-product-detail.png)

---

### Bước 2: Chủ Shop (`SHOP_MANAGER`) — Giá sàn `floorPrice`, Cảnh báo Biên mỏng & Tiếp thị mặc định Bật
1. Đăng nhập tại `http://localhost:5173/login` bằng tab **Chủ Shop** (`manager.sora@scanms.vn` / `Shop@123456`).
2. Vào **Sản phẩm** (`/merchant/products`) -> nhấn **Thêm sản phẩm**:
   - Điền thông tin cơ bản ở Bước 1 để sang **Bước 2: Phân loại & Giao hàng**.
   - Nhập **Giá sàn (`floorPrice`)** = `200.000`, **Giá niêm yết (`price`)** = `220.000` (nằm giữa `floorPrice` và `minSafePrice`).
   - **Kết quả quan sát:** Hệ thống **không khóa cứng** việc tạo sản phẩm (cho phép lưu miễn `price >= floorPrice`), đồng thời hiển thị viền hổ phách và cảnh báo **Biên mỏng (`< minSafePrice`)** để cảnh báo rủi ro lỗ khi cộng thêm thù lao KOL.
   - Sang **Bước 3: Tiếp thị & Gửi duyệt**: Mục `3.1` hiển thị cố định **Tiếp thị Liên kết: Tự động Bật** (read-only, mọi sản phẩm đều tham gia tiếp thị đồng nhất, không còn công tắc tắt gây hụt hoa hồng ngoài ý muốn).
- Ảnh chứng minh:
  - [03-shop-product-floorprice-thin-margin-warning.png](file:///c:/HW/CAPSTONE/docs/screenshots/03-shop-product-floorprice-thin-margin-warning.png)
  - [04-shop-product-affiliate-auto-enabled.png](file:///c:/HW/CAPSTONE/docs/screenshots/04-shop-product-affiliate-auto-enabled.png)

3. Vào **Đơn hàng** (`/merchant/orders`):
   - Tab **Đơn bán hàng**: danh sách 230 đơn tải mượt, polling nền giảm xuống 30 giây và không còn tự bypass cache.
   - Tab **Hàng mẫu KOL**: Chủ Shop duyệt video trực tiếp (`PATCH /sample-requests/:id/review-video`) tối đa 2 lần yêu cầu sửa lại (bắt buộc nhập lý do `>= 15` ký tự).
   - Ảnh chứng minh:
     - [05-shop-orders-management.png](file:///c:/HW/CAPSTONE/docs/screenshots/05-shop-orders-management.png)
     - [06-shop-samples-management.png](file:///c:/HW/CAPSTONE/docs/screenshots/06-shop-samples-management.png)

4. Vào **Khuyến mãi & Đãi ngộ KOC** (`/merchant/promotions?tab=creator-incentives`) và **Mạng lưới Đối tác** (`/merchant/kol-hub`):
   - Xem danh sách 17 mã ưu đãi KOC và khung Chat 1-1 với KOL kèm thẻ Đề xuất Deal / Đề xuất Voucher.
   - Ảnh chứng minh:
     - [07-shop-kol-coupons.png](file:///c:/HW/CAPSTONE/docs/screenshots/07-shop-kol-coupons.png)
     - [08-shop-kol-hub-chat.png](file:///c:/HW/CAPSTONE/docs/screenshots/08-shop-kol-hub-chat.png)

---

### Bước 3: Vận hành (`SYSTEM_MANAGER`) — Kiểm duyệt Sản phẩm Biên mỏng & Trọng tài Hàng mẫu (`APPEALED`)
1. Đăng xuất, đăng nhập vai trò **Vận hành** (`manager@scanms.vn` / `Manager@123456`).
2. Vào **Sản phẩm & Giá sàn** (`/admin/products-pricing`):
   - Thẻ sản phẩm và modal **Xem hồ sơ** hiển thị rõ **Giá bán**, **Giá sàn bảo vệ (`floorPrice`)**, và cảnh báo **Biên mỏng: Giá dưới ngưỡng an toàn · Rủi ro hụt tối đa ...₫/sp** để Vận hành kiểm soát rủi ro trước khi duyệt mở bán.
   - Ảnh chứng minh:
     - [09-manager-product-moderation-thin-margin.png](file:///c:/HW/CAPSTONE/docs/screenshots/09-manager-product-moderation-thin-margin.png)
     - [10-manager-product-review-modal.png](file:///c:/HW/CAPSTONE/docs/screenshots/10-manager-product-review-modal.png)
3. Vào **Trọng tài & Pháp chế** -> tab **Vi phạm hàng mẫu** (`/admin/arbitration?tab=samples`):
   - Bộ lọc trạng thái có đầy đủ **Chờ Trọng tài (`APPEALED`)** để xử lý khi KOL khiếu nại quyết định từ chối video của Shop (hỗ trợ 3 quyết định trọng tài: `FORCE_COMPLETE`, `UPHOLD_REVISION`, `CONFIRM_VIOLATION` bên cạnh `EXTEND_DEADLINE` và `CANCEL_OBLIGATION`).
   - Ảnh chứng minh:
     - [11-manager-samples-arbitration-appealed.png](file:///c:/HW/CAPSTONE/docs/screenshots/11-manager-samples-arbitration-appealed.png)

---

### Bước 4: Quản trị (`SYSTEM_ADMIN`) — Duyệt Ngoại lệ Voucher KOL (`>10%–20%`) & Quản trị Toàn hệ thống
1. Đăng xuất, đăng nhập vai trò **Quản trị** (`admin@scanms.vn` / `Admin@123456`).
2. Kiểm tra **Tổng quan** (`/admin/analytics`) và thanh Sidebar: không còn bất kỳ mục Livestream nào.
3. Vào **Giám sát tiếp thị** -> tab **Mã ưu đãi KOL** (`/admin/affiliate-oversight?tab=coupons`):
   - Bộ lọc trạng thái có **Chờ Admin duyệt (`>10%`)** (`PENDING_ADMIN_APPROVAL`) để `SYSTEM_ADMIN` phê duyệt ngoại lệ cho các mã KOL từ `>10%` đến trần `20%` (từ `3%–10%` do Shop Manager tự duyệt).
   - Ngoài ra có mục **Thỏa thuận Đặc cách** (`/admin/vip-exceptions`) để Admin duyệt Deal hoa hồng `>16%` đến trần `25%`.
   - Ảnh chứng minh:
     - [12-admin-dashboard-no-livestream.png](file:///c:/HW/CAPSTONE/docs/screenshots/12-admin-dashboard-no-livestream.png)
     - [13-admin-kol-coupons-pending-approval-filter.png](file:///c:/HW/CAPSTONE/docs/screenshots/13-admin-kol-coupons-pending-approval-filter.png)

---

### Bước 5: KOL / KOC (`COLLABORATOR`) — Đề xuất Voucher `3%–20%` trong Chat & Hàng mẫu GHN
1. Đăng xuất, đăng nhập vai trò **KOL/KOC** (`kol.bronze@scanms.vn` / `Kol@123456`).
2. Vào **Công cụ tiếp thị** -> tab **Mẫu thử & Video review** (`/collaborator/marketing?tab=samples`):
   - Với đơn hàng mẫu giao qua GHN, hệ thống **ẩn nút xác nhận nhận hàng thủ công** (trạng thái nhận hàng đồng bộ tự động từ GHN webhook).
   - Khi bị Shop yêu cầu sửa video (`REVISION_REQUIRED`), KOL có nút **Yêu cầu Trọng tài** chuyển trạng thái sang `APPEALED` và đóng băng đồng hồ SLA 14 ngày.
   - Ảnh chứng minh:
     - [14-kol-samples-no-manual-ghn-receive.png](file:///c:/HW/CAPSTONE/docs/screenshots/14-kol-samples-no-manual-ghn-receive.png)
3. Vào **Hợp tác & Hàng mẫu** (`/collaborator/collaboration`) -> tab **Tin nhắn** -> nhấn **Đề xuất mã ưu đãi định danh KOC với Shop**:
   - Biên độ giảm giá mở rộng **3% – 20%** (có nút chọn nhanh `5%`, `10%`, `15%`, `20%`).
   - Khi chọn `<= 10%` hiển thị *"Từ 3%–10%: Shop Manager duyệt trực tiếp"*; khi chọn `> 10%` hiển thị *"Trên 10%: Cần System Admin duyệt ngoại lệ sau Shop"*.
   - Ảnh chứng minh:
     - [15-kol-chat-propose-coupon-3-to-20.png](file:///c:/HW/CAPSTONE/docs/screenshots/15-kol-chat-propose-coupon-3-to-20.png)

---

### Bước 6: Khách mua (`CUSTOMER`) — Checkout Tối ưu Không Spam API Phí Ship
1. Đăng xuất, đăng nhập vai trò **Khách mua** (`customer.an@scanms.vn` / `Customer@123456`).
2. Thêm sản phẩm vào giỏ tại `/products/SORA-VITC-215`, vào `/cart`, chọn 1 sản phẩm và nhấn **Mua hàng** để mở **Cổng thanh toán SCANMS**.
3. Nhấn **Thay Đổi** ở phần địa chỉ và gõ địa chỉ chi tiết (`"123 Nguyen Hue"`):
   - **Kết quả quan sát:** Hệ thống **không gọi lại `/api/shipping/ghn/quote-address` theo từng phím gõ** (chỉ tính phí khi thay đổi Tỉnh/Quận/Phường hoặc sản phẩm, loại bỏ hoàn toàn hiện tượng giật/khựng khi nhập địa chỉ).
   - Ảnh chứng minh:
     - [16-customer-checkout-address-no-spam.png](file:///c:/HW/CAPSTONE/docs/screenshots/16-customer-checkout-address-no-spam.png)

---

## 3. Tóm tắt Kết quả Kiểm thử Kỹ thuật Sau Chỉnh sửa Cuối

- **Backend build (`nest build`):** Thành công (exit code `0`).
- **Backend unit tests (`jest`):** `222` suites passed (`2.086` tests passed, `0` failed, `3` skipped).
- **Frontend build (`tsc -b && vite build`):** Thành công sau lần sửa cuối (exit code `0`).
- **Frontend unit tests:** `308` passed, `0` failed (`137` browser-flagged tests skipped).
- **Database Sync (Supabase PostgreSQL):** Đã đồng bộ `prisma db push --accept-data-loss` thành công qua `DIRECT_URL` (`:5432`).
