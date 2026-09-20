# 🧪 KẾ HOẠCH & HƯỚNG DẪN KIỂM THỬ THỦ CÔNG TOÀN DIỆN (SCANMS E2E TEST PLAN)

> **Dự án:** SCANMS (FA26SE032) – Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác  
> **Người thực hiện kiểm thử:** Nguyễn Thành Thắng (Team Leader) & Thành viên nhóm  
> **Môi trường:** Local Development (`http://localhost:5173` & `http://localhost:3000`)

---

## 🎯 MỤC TIÊU KIỂM THỬ
1. Xác thực **Logo ScanMS hình Bản đồ chữ S Việt Nam** chuẩn xác theo ảnh tư liệu quốc gia (Bắc Bộ, Miền Trung, Nam Bộ, Đảo Phú Quốc, Hoàng Sa, Trường Sa).
2. Xác thực **Trang Chủ Mua Sắm (`/`)**: Giao diện rộng rãi, full-width 5 cột, đã tắt hoàn toàn sidebar bộ lọc theo chuẩn Shopee; thanh tìm kiếm và nút "Bộ lọc" điều hướng chính xác sang trang tìm kiếm chi tiết.
3. Xác thực **Trang Tìm Kiếm & Lọc Chi Tiết (`/search`)**: Bộ lọc chuyên nghiệp (Ngành hàng, Gian hàng, Khoảng giá, Hoa hồng KOC, Sắp xếp) hoạt động mượt mà và đồng bộ URL.
4. Xác thực **Trang Chi Tiết Sản Phẩm (`/products/:slug`)**: Hiển thị ảnh sắc nét (đã sửa lỗi ảnh Unsplash qua SSRF whitelist), thông tin gian hàng và hoa hồng CTV.
5. Xác thực **Luồng Đặt Mua Nhanh (Guest Checkout)**: Khách vãng lai mua hàng không cần tạo tài khoản, sinh mã đơn tự động.
6. Xác thực **Tra Cứu Đơn Hàng (`/tracking`)**: Tra cứu bằng SĐT hoặc Mã đơn hàng, hiển thị tiến trình vận chuyển.
7. Xác thực **Cổng Gian Hàng (`/merchant/products`)**: Tính năng thêm sản phẩm, tải 5 ảnh, đổi ảnh chính, công cụ hoa hồng quy đổi 2 chiều (% <-> VNĐ).

---

## 🧭 KỊCH BẢN KIỂM THỬ CHI TIẾT (7 GIAI ĐOẠN)

### 📌 GIAI ĐOẠN 1: KIỂM TRA THƯƠNG HIỆU & LOGO BẢN ĐỒ CHỮ S
**Địa chỉ:** `http://localhost:5173/` (Góc trên cùng bên trái của Header)

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **1.1** | Quan sát biểu tượng Logo ScanMS ở góc trái Header | Khung biểu tượng hình vuông bo góc sang trọng, nền tối ánh kim viền vàng gold `#C59B58`. | 🔲 Đạt / 🔲 Chưa |
| **1.2** | Quan sát hình khối dải đất liền | Rõ nét hình dáng chữ S của Tổ quốc: Vùng Bắc Bộ rộng mở, eo Miền Trung thon gọn dọc bờ biển, Nam Bộ vươn cong về phía Mũi Cà Mau. Không còn bị nhầm lẫn với số 3. | 🔲 Đạt / 🔲 Chưa |
| **1.3** | Quan sát các chi tiết chủ quyền | Có ngôi sao vàng 5 cánh thiêng liêng ở Bắc Bộ (Hà Nội); đảo **Phú Quốc** ở góc biển Tây Nam; 2 cụm sao vàng rực rỡ tượng trưng cho **Quần đảo Hoàng Sa** và **Quần đảo Trường Sa** ở Biển Đông cùng các tia sóng kết nối về đất liền. | 🔲 Đạt / 🔲 Chưa |
| **1.4** | Bấm vào Logo ScanMS | Trang web tự động cuộn lên đầu trang chủ mượt mà. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 2: TRANG CHỦ MUA SẮM THEO CHUẨN SHOPEE (`/`)
**Địa chỉ:** `http://localhost:5173/`

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **2.1** | Cuộn trang xuống khu vực Danh mục sản phẩm | **Không có sidebar bộ lọc bên trái** làm chật chội. Lưới sản phẩm dàn trải **toàn màn hình (full-width 5 cột)** sang trọng, hiển thị đầy đủ ảnh, tên shop, giá và hoa hồng CTV. | 🔲 Đạt / 🔲 Chưa |
| **2.2** | Kiểm tra ô tìm kiếm tại Hero trang chủ | Gõ từ khóa `Serum` vào ô tìm kiếm ở banner giữa trang, nhấn phím **Enter** hoặc bấm nút **"Tìm kiếm"**. Hệ thống tự động chuyển sang trang `http://localhost:5173/search?q=Serum`. | 🔲 Đạt / 🔲 Chưa |
| **2.3** | Kiểm tra nút "Bộ lọc" trên thanh tìm kiếm | Quay lại trang chủ, bấm vào nút **"Bộ lọc"** màu be ngay cạnh nút Tìm kiếm. Hệ thống chuyển ngay sang trang `/search`. | 🔲 Đạt / 🔲 Chưa |
| **2.4** | Kiểm tra các từ khóa gợi ý (Chips) | Bấm thử vào một chip từ khóa như `Dưỡng ẩm` hoặc `Tai nghe`. Hệ thống chuyển sang trang `/search?q=...` với kết quả tương ứng. | 🔲 Đạt / 🔲 Chưa |
| **2.5** | Kiểm tra hàng thẻ Danh mục nổi bật | Bên dưới 3 khối cam kết chất lượng, nhấp vào thẻ `Mỹ phẩm & Chăm sóc da`. Hệ thống chuyển sang `/search?category=...` và kết quả được lọc đúng. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 3: TRANG TÌM KIẾM & BỘ LỌC CHI TIẾT (`/search`)
**Địa chỉ:** `http://localhost:5173/search`

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **3.1** | Kiểm tra bố cục trang Tìm Kiếm | Đúng chuẩn Shopee: Cột bên trái là **Bộ lọc chi tiết** (Danh mục, Gian hàng, Giá, Hoa hồng), cột bên phải là **Kết quả tìm kiếm & Lưới sản phẩm**. | 🔲 Đạt / 🔲 Chưa |
| **3.2** | Lọc theo Danh mục sản phẩm | Nhấp chọn danh mục `Mỹ phẩm & Chăm sóc da`. Lưới sản phẩm bên phải chỉ hiển thị các sản phẩm thuộc ngành này. | 🔲 Đạt / 🔲 Chưa |
| **3.3** | Lọc theo Gian hàng đối tác (Shop) | Nhấp chọn một gian hàng (ví dụ: `Sora Skin Official` hoặc `Lumière Lab`). Chỉ các sản phẩm của shop đó được hiển thị. | 🔲 Đạt / 🔲 Chưa |
| **3.4** | Lọc theo Khoảng giá (Price Range) | Nhập từ `200000` đến `500000`, bấm **"Áp dụng"**. Hệ thống lọc chính xác các sản phẩm trong khung giá 200k – 500k. | 🔲 Đạt / 🔲 Chưa |
| **3.5** | Lọc Deal Hoa Hồng KOC cao | Bật công tắc **"Chỉ hiện sản phẩm có hoa hồng KOC"**. Chỉ các mặt hàng có chính sách chia sẻ hoa hồng CTV được hiển thị. | 🔲 Đạt / 🔲 Chưa |
| **3.6** | Đổi tiêu chí sắp xếp | Chọn dropdown: *Giá: Thấp đến Cao*, *Giá: Cao đến Thấp*, *Mới nhất*. Lưới sản phẩm lập tức đảo vị trí chính xác. | 🔲 Đạt / 🔲 Chưa |
| **3.7** | Gỡ bộ lọc nhanh (Active Filter Chips) | Bấm nút `x` trên từng chip bộ lọc hoặc bấm nút **"Xóa tất cả bộ lọc"**. Bộ lọc được reset về mặc định. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 4: TRANG CHI TIẾT SẢN PHẨM & HIỂN THỊ HÌNH ẢNH (`/products/:slug`)
**Địa chỉ:** Nhấp vào bất kỳ sản phẩm nào từ trang chủ hoặc `/products/LL-AMPOULE-PEP`

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **4.1** | Kiểm tra hình ảnh sản phẩm | Ảnh sản phẩm mẫu hiển thị sắc nét 100%, không bị ô vuông xám hay lỗi placeholder (nhờ cơ chế cho phép domain Unsplash ở backend). | 🔲 Đạt / 🔲 Chưa |
| **4.2** | Kiểm tra thông tin giá & tồn kho | Hiển thị giá tiền thực tế bằng định dạng VNĐ (ví dụ `350.000 ₫`), số lượng kho còn lại rõ ràng. | 🔲 Đạt / 🔲 Chưa |
| **4.3** | Kiểm tra chính sách hoa hồng CTV | Khung hoa hồng hiển thị rõ ràng: `Hoa hồng CTV: 22% (~77.000 ₫)` để KOL/KOC dễ dàng đánh giá tiềm năng tiếp thị. | 🔲 Đạt / 🔲 Chưa |
| **4.4** | Kiểm tra thông tin Gian hàng đối tác | Hiển thị tên Shop (`Sora Skin Official` hoặc `Lumière Lab`), nhãn tick xác minh KYC và cam kết đồng kiểm hàng trước khi nhận. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 5: ĐẶT HÀNG NHANH KHÁCH VÃNG LAI (GUEST CHECKOUT)
**Địa chỉ:** Thực hiện ngay trên thẻ sản phẩm hoặc trang chi tiết

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **5.1** | Bấm nút **"Mua ngay"** trên sản phẩm | Modal **Thanh toán nhanh dành cho Khách hàng** lập tức xuất hiện. Không bắt buộc phải đăng nhập hay tạo tài khoản phức tạp. | 🔲 Đạt / 🔲 Chưa |
| **5.2** | Nhập thông tin giao hàng | Nhập Họ tên: `Nguyễn Thành Thắng`, SĐT: `0912345678`, Địa chỉ: `Khu Công nghệ cao Hòa Lạc, Hà Nội`. | 🔲 Đạt / 🔲 Chưa |
| **5.3** | Thử nhập mã giảm giá (Coupon) | Nhập mã `SORA10` hoặc `SUMMER10` và bấm **Áp dụng** ➔ Tiền đơn hàng được giảm trừ tương ứng. | 🔲 Đạt / 🔲 Chưa |
| **5.4** | Bấm nút **"Xác nhận đặt hàng (COD)"** | Modal hiển thị thông báo thành công, cấp **Mã đơn hàng** (ví dụ `IN23931` hoặc mã hệ thống sinh tự động), kèm nút tra cứu hành trình. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 6: TRA CỨU HÀNH TRÌNH ĐƠN HÀNG (`/tracking`)
**Địa chỉ:** `http://localhost:5173/tracking` hoặc bấm mục Tra cứu ở chân trang

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **6.1** | Tra cứu bằng Số điện thoại | Nhập số điện thoại đã đặt đơn (ví dụ `0912345678`) và bấm **"Tra cứu"**. | 🔲 Đạt / 🔲 Chưa |
| **6.2** | Quan sát kết quả hiển thị | Hiển thị thẻ thông tin đơn hàng: Mã vận đơn, Tên sản phẩm, Tổng tiền, Trạng thái (ĐANG VẬN CHUYỂN / ĐANG XỬ LÝ). | 🔲 Đạt / 🔲 Chưa |
| **6.3** | Kiểm tra Timeline & Đánh giá 5 sao | Các mốc thời gian giao hàng hiển thị sinh động; có khu vực đánh giá sao và gửi phản hồi trải nghiệm mua sắm. | 🔲 Đạt / 🔲 Chưa |

---

### 📌 GIAI ĐOẠN 7: CỔNG GIAN HÀNG & THIẾT LẬP HOA HỒNG 2 CHIỀU (`/merchant/products`)
**Địa chỉ:** Đăng nhập tài khoản Shop tại `http://localhost:5173/login`

| Bước | Thao tác thực hiện | Kết quả mong đợi | Đánh giá |
| :---: | :--- | :--- | :---: |
| **7.1** | Đăng nhập tài khoản Chủ Shop | Email: `shop@scanms.vn` (hoặc `test_shop_2026@example.com`), Mật khẩu: `Password123@`. | 🔲 Đạt / 🔲 Chưa |
| **7.2** | Vào mục **Quản lý sản phẩm** | Truy cập `http://localhost:5173/merchant/products`, bấm nút **`+ Thêm sản phẩm mới`**. | 🔲 Đạt / 🔲 Chưa |
| **7.3** | Kiểm tra Dropdown danh mục chuẩn | Chọn danh mục (Mỹ phẩm, Sức khỏe, Công nghệ...) ➔ Mã SKU tự động sinh tiền tố chuẩn ngành. | 🔲 Đạt / 🔲 Chưa |
| **7.4** | Kiểm tra Thư viện 5 ảnh | Tải lên 1 ảnh chính + ảnh phụ; rê chuột bấm nút `👑 Đặt làm chính` để đổi vị trí ảnh chính mượt mà. | 🔲 Đạt / 🔲 Chưa |
| **7.5** | **Kiểm tra công cụ hoa hồng 2 chiều (% <-> VNĐ)** | - Gõ `25%` ➔ Ô tiền tự động tính ra số VNĐ tương ứng.<br>- Gõ `100.000 ₫` ➔ Ô phần trăm tự động tính ra tỷ lệ % tương ứng.<br>- Bấm các nút preset `10%`, `20%`, `50k`, `100k` hoạt động chuẩn xác. | 🔲 Đạt / 🔲 Chưa |
| **7.6** | Đăng bán sản phẩm | Bấm **"Đăng bán sản phẩm mới"** ➔ Sản phẩm mới xuất hiện ngay trong danh sách quản lý của Shop và đồng bộ lên sàn chung SCANMS. | 🔲 Đạt / 🔲 Chưa |

---

## 🎯 DANH SÁCH TÀI KHOẢN MẪU SẴN SÀNG
| Vai trò | Email đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Chủ Gian Hàng (Shop)** | `shop@scanms.vn` | `Password123@` | Quản lý kho, đăng sản phẩm, thiết lập hoa hồng |
| **Nhà Sáng Tạo (KOL/KOC)** | `kol1@scanms.vn` | `Password123@` | Lấy link tiếp thị, xem hoa hồng, rút ví |
| **Quản Trị Viên (Admin)** | `admin@scanms.vn` | `Password123@` | Duyệt KYC gian hàng, giám sát an ninh sàn |
| **Khách mua hàng (Guest)** | *Không cần đăng nhập* | *Không cần mật khẩu* | Mua sắm vãng lai, tra cứu đơn hàng bằng SĐT |
