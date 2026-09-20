# 📋 HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL TEST GUIDE)
## QUY TRÌNH TOÀN DIỆN: TẠO SẢN PHẨM MỚI ➔ HOA HỒNG 2 CHIỀU ➔ TIẾP THỊ LIÊN KẾT ➔ MUA HÀNG ➔ ĐỐI SOÁT VÍ

> **Dự án:** SCANMS (FA26SE032) - Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác  
> **Người thực hiện:** Nguyễn Thành Thắng (Team Leader)  
> **Môi trường:** Local Development (`http://localhost:5173` & `http://localhost:3000`)

---

## 🧭 MỤC LỤC
1. [Chuẩn bị môi trường & Danh sách tài khoản thử nghiệm](#1-chuẩn-bị-môi-trường--tài-khoản-thử-nghiệm)
2. [Bước 1: Shop tạo sản phẩm mới (Danh mục chuẩn, 5 ảnh, Hoa hồng 2 chiều)](#bước-1-shop-tạo-sản-phẩm-mới)
3. [Bước 2: KOL tìm kiếm sản phẩm & tạo link tiếp thị (Affiliate Link + QR)](#bước-2-kol-lấy-link-tiếp-thị)
4. [Bước 3: Khách hàng vãng lai truy cập qua link và xem chi tiết sản phẩm](#bước-3-khách-hàng-xem-chi-tiết-sản-phẩm)
5. [Bước 4: Khách hàng đặt mua nhanh (Guest Checkout)](#bước-4-khách-hàng-đặt-hàng-nhanh)
6. [Bước 5: Gian hàng xử lý đơn và giao hàng thành công (DELIVERED)](#bước-5-gian-hàng-giao-hàng-thành-công)
7. [Bước 6: KOL kiểm tra ví hoa hồng và đối soát thu nhập](#bước-6-kol-đối-soát-hoa-hồng)
8. [Checklist kiểm thử trường hợp biên (Edge Cases)](#7-checklist-các-trường-hợp-biên-cần-lưu-ý)

---

## 1. Chuẩn bị môi trường & Tài khoản thử nghiệm

### 1.1 Kiểm tra dịch vụ đang chạy
- **Backend NestJS:** Đang chạy tại `http://localhost:3000` (API Health Check: `http://localhost:3000/api/health`)
- **Frontend Vite React:** Đang chạy tại `http://localhost:5173`
- **Cơ sở dữ liệu:** PostgreSQL & Redis Docker container đang hoạt động

### 1.2 Danh sách tài khoản thử nghiệm sẵn sàng trong Database:
| Vai trò | Email đăng nhập | Mật khẩu mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Chủ Gian Hàng (Merchant)** | `shop@scanms.vn` hoặc `test_shop_2026@example.com` | `Password123@` hoặc `Shop@123456` | Đại diện cho Gian hàng đối tác trên sàn SCANMS |
| **Nhà Sáng Tạo (KOL/KOC)** | `kol1@scanms.vn` hoặc `test_kol_2026@example.com` | `Password123@` hoặc `Kol@123456` | Tiếp thị liên kết, nhận hoa hồng |
| **Quản Trị Viên (Admin)** | `admin@scanms.vn` | `Password123@` | Quản lý hệ thống toàn sàn |
| **Khách mua hàng (Guest)** | *Không cần tài khoản* | *Không cần mật khẩu* | Dùng cửa sổ ẩn danh (Incognito) |

---

## Bước 1: Shop tạo sản phẩm mới

### Mục tiêu kiểm tra:
- Dropdown danh mục chuẩn hóa hoạt động mượt mà, tự động sinh tiền tố SKU.
- Thư viện 5 ảnh: 1 ảnh chính bắt buộc (⭐ viền vàng) + 4 ảnh phụ, tính năng `👑 Đặt làm ảnh chính`, tải ảnh hàng loạt.
- Giá bán sản phẩm & Số lượng kho rõ ràng, tập trung trực tiếp vào bài toán chia sẻ hoa hồng cho KOL.
- Công cụ tính hoa hồng 2 chiều: Nhập `%` tự quy ra `VNĐ`, hoặc gõ `VNĐ` tự quy ra `%`.

### Các bước thực hiện:
1. Mở trình duyệt (ví dụ: Google Chrome thường), truy cập: `http://localhost:5173/login`.
2. Đăng nhập bằng tài khoản **Chủ Gian Hàng**:
   - Email: `shop@scanms.vn` (hoặc `test_shop_2026@example.com`)
   - Mật khẩu: `Password123@`
3. Nhấp chọn mục menu bên trái: **Quản lý sản phẩm** (hoặc truy cập trực tiếp `http://localhost:5173/merchant/products`).
4. Bấm nút màu vàng be: **`+ Thêm sản phẩm mới`**.
5. Modal kích thước lớn (chuẩn `maxWidth="3xl"`) sẽ mở ra. Thực hiện các thao tác:

   #### 🏷️ Khối 1: Phân loại & Mã SKU
   - Tại mục **Danh mục sản phẩm**: Nhấp vào Dropdown và chọn một danh mục (ví dụ: `🧴 Mỹ phẩm & Chăm sóc da`).
   - Quan sát ô **Mã SKU quản lý**: Hệ thống sẽ tự động tạo mã SKU có tiền tố theo ngành, ví dụ `SKIN-8X2A1`. Bấm thử nút `Tạo ngẫu nhiên` để đổi mã khác nếu muốn.
   - Thử chọn tùy chọn `📦 Danh mục khác (Tự nhập)`: Một ô nhập bổ sung sẽ xuất hiện cho phép gõ tên ngành hàng tự do.
   - Nhập **Tên sản phẩm**: `Serum Dưỡng Trắng Mờ Thâm Vitamin C 15% Sora Skin 30ml`.

   #### 📸 Khối 2: Thư viện 5 Ảnh sản phẩm
   - Nhấp vào ô **⭐ ẢNH CHÍNH** (có viền vàng nổi bật) ➔ Chọn 1 file ảnh từ máy tính (hoặc ảnh mẫu trong thư mục `backend/uploads` hoặc bất kỳ ảnh JPG/PNG nào).
     * Sau khi tải xong, ảnh chính xuất hiện với huy hiệu `⭐ CHÍNH`.
     * Khi rê chuột vào ảnh chính, có 2 nút chức năng: `Đổi ảnh` và `Gỡ ảnh`.
   - Nhấp vào ô **Ảnh phụ 1, 2, 3, 4** để tải thêm các góc chụp khác của sản phẩm.
   - **Thử nghiệm tính năng Đổi Ảnh Chính:** Trên bất kỳ ô ảnh phụ nào đã có ảnh, rê chuột vào và bấm nút **`👑 Đặt làm chính`**.
     * ➔ Ảnh phụ đó sẽ ngay lập tức đổi vị trí thành Ảnh bìa chính, ảnh chính cũ sẽ chuyển thành ảnh phụ!
   - Thử nút **`📁 Tải lên nhiều ảnh`**: Cho phép chọn cùng lúc 2–5 file ảnh để hệ thống tự động điền lần lượt vào ảnh chính và các ảnh phụ còn trống.

   #### 💰 Khối 3: Giá bán sản phẩm & Số lượng kho
   - Nhập **Giá bán sản phẩm**: `350000` (350.000 ₫).
   - Nhập **Số lượng tồn kho**: `100`.
   - *Lưu ý:* SCANMS tập trung cốt lõi vào cơ chế hoa hồng chia sẻ cho KOL/CTV; các chương trình mã giảm giá (voucher/coupon) được quản lý độc lập tại tính năng Coupon riêng biệt (FR-12).

   #### 🔄 Khối 4: Thiết lập hoa hồng KOL/CTV (Quy đổi 2 chiều Linh hoạt)
   - **Test nút chọn nhanh (Presets):**
     * Bấm nút `20%` ➔ Ô tỷ lệ hiển thị `20%`, ô số tiền tự động cập nhật: `70.000 ₫`.
     * Bấm nút `100k` ➔ Ô số tiền hiển thị `100.000 ₫`, ô tỷ lệ tự động cập nhật: `28.6%`.
   - **Test nhập thủ công 2 chiều:**
     * Thử sửa ô **Tỷ lệ hoa hồng (%)** thành `25` ➔ Ô số tiền tự nhảy thành `87.500 ₫`.
     * Thử sửa ô **Hoa hồng cụ thể (₫)** thành `50000` ➔ Ô tỷ lệ tự nhảy thành `14.3%`.
   - Quan sát **Khung tóm tắt doanh thu thực nhận** ở bên dưới:
     * `💰 KOL/CTV nhận được: 50.000 ₫ (14.3% giá trị đơn)`
     * `Gian hàng thu về: 300.000 ₫`

   #### 📝 Khối 5: Mô tả chi tiết
   - Nhập tóm tắt mô tả sản phẩm:  
     `Serum Vitamin C 15% nguyên chất kết hợp Vitamin E và Ferulic Acid giúp làm sáng đều màu da, mờ thâm nám sau 14 ngày, chống oxy hóa mạnh mẽ.`

6. Bấm nút **`✨ Đăng bán sản phẩm mới`**.
   - Thông báo Toast hiển thị: *"Đã thêm sản phẩm mới vào danh mục gian hàng!"*.
   - Modal tự đóng và sản phẩm vừa tạo xuất hiện trên cùng danh sách bảng sản phẩm của Shop.

---

## Bước 2: KOL lấy link tiếp thị

### Mục tiêu kiểm tra:
- KOL tìm thấy sản phẩm trên sàn chung SCANMS.
- Xem được đúng tỷ lệ hoa hồng mà Shop vừa cấu hình.
- Tạo Link tiếp thị rút gọn (`/r/{shortCode}`) kèm mã QR Code động.

### Các bước thực hiện:
1. Mở một tab trình duyệt khác hoặc đăng xuất rồi đăng nhập lại bằng tài khoản **KOL**:
   - Email: `kol1@scanms.vn` (hoặc `test_kol_2026@example.com`)
   - Mật khẩu: `Password123@`
2. Truy cập vào **Sàn sản phẩm liên kết (Marketplace)** tại `http://localhost:5173/marketplace` hoặc mục **Tiếp thị số (Marketing Toolkit)** tại `http://localhost:5173/kol/marketing-toolkit`.
3. Gõ tìm kiếm tên sản phẩm hoặc mã SKU vừa tạo ở Bước 1.
4. Kiểm tra thông tin hiển thị trên thẻ sản phẩm:
   - Tên sản phẩm: `Serum Dưỡng Trắng Mờ Thâm Vitamin C 15%...`
   - Giá bán: `350.000 ₫`.
   - Mức hoa hồng dành cho KOL: Hiển thị rõ số tiền hoa hồng hoặc tỷ lệ %.
5. Bấm nút **`Lấy link tiếp thị`** (hoặc `Tạo link rút gọn`).
6. Hệ thống sẽ sinh ra một đường dẫn Affiliate rút gọn, ví dụ:  
   `http://localhost:5173/r/abc12345`
7. Bấm nút **`Sao chép liên kết`** (Copy link) để chuẩn bị gửi cho khách hàng.

---

## Bước 3: Khách hàng xem chi tiết sản phẩm

### Mục tiêu kiểm tra:
- Link tiếp thị redirect đúng sản phẩm và gắn cookie tracking attribution của KOL.
- Landing Page hiển thị đầy đủ thư viện 5 ảnh (ảnh chính + 4 ảnh phụ bấm đổi mượt mà).

### Các bước thực hiện:
1. Mở một cửa sổ **Trình duyệt ẩn danh (Incognito Window)** mới tinh (phím tắt: `Ctrl + Shift + N` trên Windows).
2. Dán đường link tiếp thị vừa copy ở Bước 2 vào thanh địa chỉ (ví dụ: `http://localhost:5173/r/abc12345`) rồi nhấn `Enter`.
3. Quan sát hệ thống:
   - Link tự động chuyển hướng (Redirect 302) đến trang Landing Page chi tiết:  
     `http://localhost:5173/products/{MÃ_SKU_HOẶC_ID}`
   - Trình duyệt ngầm lưu trữ cookie tiếp thị: `scanms_ref` với mã định danh của KOL.
4. Kiểm tra giao diện chi tiết sản phẩm:
   - Thư viện ảnh: Hiển thị khung ảnh to chính giữa và hàng thumbnail các ảnh phụ ở dưới.
   - Nhấp vào từng ảnh phụ: Ảnh to lập tức chuyển đổi sang ảnh đó mượt mà.
   - Kiểm tra giá bán, tên Gian hàng phân phối và phần mô tả sản phẩm.

---

## Bước 4: Khách hàng đặt hàng nhanh

### Mục tiêu kiểm tra:
- Khách vãng lai mua hàng không cần tạo tài khoản hay đăng nhập rườm rà.
- Đơn hàng được gắn đúng mã giới thiệu (Attribution) của KOL.

### Các bước thực hiện:
1. Trên trang chi tiết sản phẩm tại cửa sổ ẩn danh, nhấp nút màu vàng be: **`Mua ngay`** (hoặc `Thêm vào giỏ hàng` ➔ `Thanh toán`).
2. Modal **Đặt hàng nhanh (Guest Checkout)** hiện lên.
3. Điền thông tin giao hàng:
   - Họ và tên người nhận: `Nguyễn Văn Khách`
   - Số điện thoại: `0912345678`
   - Tỉnh / Thành phố: Chọn một tỉnh bất kỳ (ví dụ: `Hà Nội` hoặc `TP. Hồ Chí Minh`)
   - Quận / Huyện & Phường / Xã: Chọn tương ứng
   - Địa chỉ chi tiết: `Số 123 Đường Cầu Giấy`
   - Ghi chú đơn hàng: `Giao giờ hành chính giúp mình`
   - Phương thức thanh toán: Chọn `Thanh toán khi nhận hàng (COD)`
4. Bấm nút **`Xác nhận đặt hàng`**.
5. Màn hình thông báo **Đặt hàng thành công**:
   - Hệ thống cấp một **Mã đơn hàng công khai** (Ví dụ: `DH-2026-9F8A1B2C`).
   - Có nút xem hành trình đơn hàng (`/orders/tracking?code=...`).
   - *Ghi nhớ lại Mã đơn hàng này để sang Bước 5 kiểm tra.*

---

## Bước 5: Gian hàng giao hàng thành công

### Mục tiêu kiểm tra:
- Shop nhìn thấy đơn hàng mới trong danh sách quản lý.
- Hiển thị đúng nguồn đơn hàng đến từ link tiếp thị của KOL nào.
- Khi chuyển trạng thái đơn hàng sang `DELIVERED`, hoa hồng được kích hoạt ghi nhận vào ví KOL.

### Các bước thực hiện:
1. Quay lại cửa sổ trình duyệt của **Chủ Gian Hàng (Shop)** (hoặc truy cập lại `http://localhost:5173/merchant/orders`).
2. Vào mục **Quản lý đơn hàng**.
3. Danh sách đơn hàng sẽ có đơn hàng vừa đặt ở Bước 4 với mã `DH-2026-9F8A1B2C`:
   - Trạng thái ban đầu: `PENDING` (Chờ xử lý).
   - Tên khách hàng: `Nguyễn Văn Khách`.
   - CTV giới thiệu: Hiển thị tên tài khoản KOL ở Bước 2.
4. Thao tác xử lý đơn:
   - Nhấp vào nút cập nhật trạng thái: Chuyển từ `PENDING` ➔ `CONFIRMED` (Đã xác nhận).
   - Chuyển tiếp sang `SHIPPING` (Đang giao hàng).
   - Cuối cùng chuyển sang **`DELIVERED`** (Giao thành công).
5. Toast thông báo cập nhật trạng thái đơn hàng thành công.

---

## Bước 6: KOL đối soát hoa hồng

### Mục tiêu kiểm tra:
- Ví tiền của KOL được cộng tiền hoa hồng tự động theo đúng số tiền đã quy đổi ở Bước 1.
- Lịch sử giao dịch ví hiển thị chi tiết mã đơn hàng và gian hàng chi trả.

### Các bước thực hiện:
1. Quay lại cửa sổ trình duyệt của **KOL**.
2. Nhấp vào mục menu bên trái: **Ví & Thu nhập** (`http://localhost:5173/kol/wallet`).
3. Kiểm tra các số liệu tài chính:
   - **Số dư chờ đối soát (Pending Balance)** hoặc **Số dư khả dụng (Available Balance)** được cộng thêm số tiền hoa hồng của sản phẩm (Ví dụ: `+50.000 ₫` hoặc `+87.500 ₫`).
4. Xem bảng **Lịch sử biến động số dư (Transaction History)** ở bên dưới:
   - Loại giao dịch: `Cộng hoa hồng tiếp thị liên kết (Affiliate Commission)`.
   - Mã đơn hàng tham chiếu: Đúng mã đơn `DH-2026-9F8A1B2C`.
   - Gian hàng phát sinh: Tên Gian hàng của Shop ở Bước 1.
5. *(Tùy chọn nâng cao)*: KOL có thể bấm nút **`Tạo yêu cầu rút tiền`** về tài khoản ngân hàng đã liên kết KYC để kiểm tra nốt chu trình Payout của Shop!

---

## 7. Checklist các trường hợp biên cần lưu ý

Khi kiểm thử thủ công, bạn nên thử thêm các trường hợp đặc biệt sau để đánh giá độ hoàn thiện của hệ thống:

| STT | Tình huống kiểm thử biên | Thao tác thực hiện | Kết quả mong đợi | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Không chọn ảnh chính** | Bỏ trống ô ảnh chính và bấm `Đăng bán sản phẩm` | Hệ thống chặn lưu và báo Toast: *"Vui lòng tải lên Ảnh chính (Ảnh bìa) cho sản phẩm!"* | ✅ Đã kiểm chứng |
| 2 | **Nhập giá bán bằng 0** | Nhập giá bán `0 ₫` | Hệ thống báo lỗi yêu cầu giá bán phải lớn hơn 0 ₫ | ✅ Đã kiểm chứng |
| 3 | **Hoa hồng vượt quá 100%** | Gõ số tiền hoa hồng lớn hơn giá bán (Ví dụ giá 350k, gõ hoa hồng 400k) | Hệ thống tự động giới hạn mức tối đa là 100% (350.000 ₫), không để âm doanh thu | ✅ Đã kiểm chứng |
| 4 | **Ảnh quá dung lượng 5MB** | Chọn file ảnh có dung lượng > 5MB tải lên | Hệ thống từ chối và báo *"Dung lượng ảnh tối đa là 5 MB"* | ✅ Đã kiểm chứng |
| 5 | **Định dạng file không hợp lệ** | Chọn file PDF hoặc TXT tải vào slot ảnh | Hệ thống từ chối và báo *"Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP"* | ✅ Đã kiểm chứng |
| 6 | **Hoán đổi ảnh chính liên tục** | Bấm nút `👑 Đặt làm chính` nhiều lần trên các ảnh phụ | Ảnh chính và ảnh phụ hoán đổi vị trí linh hoạt, không bị mất ảnh hay trùng lặp | ✅ Đã kiểm chứng |
| 7 | **Tải hàng loạt (Bulk Upload)** | Bấm `Tải lên nhiều ảnh` và chọn 4 file cùng lúc | Hệ thống tự động sắp xếp vào ảnh chính và các slot phụ trống kế tiếp | ✅ Đã kiểm chứng |

---

## 🎯 TỔNG KẾT
Toàn bộ luồng nghiệp vụ từ:
1. **Gian hàng đăng sản phẩm chất lượng cao (Danh mục chuẩn, 5 ảnh, Hoa hồng 2 chiều linh hoạt)**
2. **KOL lấy link tiếp thị và mã QR**
3. **Khách hàng vãng lai lướt Landing Page xem thư viện ảnh mượt mà**
4. **Khách đặt hàng nhanh qua Guest Checkout**
5. **Shop xác nhận và giao hàng thành công (DELIVERED)**
6. **Ví KOL tự động đối soát nhận hoa hồng chính xác**

Đã được hoàn thiện đồng bộ, bám sát **Bộ quy chuẩn thiết kế Vàng Be (Warm Sand & Brand Gold)** và bản sắc **Sàn thương mại đa gian hàng SCANMS**.
