# TÀI LIỆU ĐẶC TẢ CÁC TÍNH NĂNG MỞ RỘNG & NÂNG CẤP HỆ THỐNG SCANMS
## (SCOPE EXPANSION & ADVANCED FEATURE SPECIFICATIONS)

> **Dự án:** SCANMS (Sales Collaborator & Affiliate Network Management System)  
> **Mã đề tài:** FA26SE032 — Học kỳ Fall 2026  
> **Trưởng nhóm:** Nguyễn Thành Thắng (Leader)  
> **Mục đích:** Lưu trữ đầy đủ toàn bộ các chức năng mở rộng, nâng cấp nghiệp vụ phát sinh trong quá trình thiết kế thực chiến, bổ sung cho bộ 32 chức năng (FR-01 $\rightarrow$ FR-32) ban đầu nhằm hoàn thiện 100% hệ thống cấp Enterprise.

---

## 📌 BẢNG TỔNG HỢP CÁC TÍNH NĂNG MỞ RỘNG (MỚI BỔ SUNG)

| STT | Tên Tính Năng Mở Rộng | Phân Hệ Liên Quan | Tác Nhân Thực Hiện | Mã Đề Xuất |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Thẩm định & Kiểm định chất lượng sản phẩm lên sàn** | Sản phẩm & Gian hàng | Chủ Shop $\rightarrow$ Super Admin | `FR-33 (EXT)` |
| **2** | **Phòng Livestream bán hàng tương tác (Live Shopping)** | Bán hàng & Trải nghiệm | KOL $\rightarrow$ Khách xem live | `FR-34 (EXT)` |
| **3** | **Đồng bộ Link Shopee & File Excel đối soát chuẩn** | Đa kênh Omnichannel | Chủ Shop $\rightarrow$ Hệ thống | `FR-35 (EXT)` |
| **4** | **Quy trình Trả hàng & 1 Nút phán quyết của Admin** | Đơn hàng & Tranh chấp | Khách mua $\rightarrow$ Shop $\rightarrow$ Admin | `FR-36 (EXT)` |
| **5** | **Cam kết nộp Video Review Hàng Mẫu trong 7 ngày** | Hàng mẫu dùng thử | KOL $\rightarrow$ Chủ Shop | `FR-37 (EXT)` |
| **6** | **Bộ lọc từ ngữ thô tục khi Chat (Profanity Masking `***`)** | Tương tác & Giao tiếp | Shop $\leftrightarrow$ KOL | `FR-38 (EXT)` |
| **7** | **Đánh giá sao theo đơn & Xử phạt sản phẩm lỗi** | Đánh giá & Chất lượng | Khách mua $\rightarrow$ Hệ thống | `FR-39 (EXT)` |

---

## 🔍 1. TÍNH NĂNG 1: THẨM ĐỊNH & KIỂM ĐỊNH CHẤT LƯỢNG SẢN PHẨM (`FR-33`)

### Bối cảnh nghiệp vụ:
* Để bảo vệ người tiêu dùng và uy tín của sàn, sản phẩm của Shop không được tự động xuất hiện công khai ngay khi vừa tạo. Sản phẩm bắt buộc phải có đầy đủ chứng nhận nguồn gốc xuất xứ và phiếu kiểm nghiệm an toàn.

### Luồng xử lý chi tiết:
1. **Shop đăng sản phẩm:** Ngoài giá, ảnh, tồn kho, Shop bắt buộc upload:
   * Giấy tiếp nhận công bố sản phẩm mỹ phẩm / TCCS.
   * Phiếu kết quả kiểm nghiệm đạt chuẩn (chỉ tiêu vi sinh, kim loại nặng chì/thủy ngân).
   * Sản phẩm được lưu với trạng thái: `status = "PENDING_APPROVAL"` (Chờ duyệt).
2. **Admin thẩm định:**
   * Quản trị viên sàn truy cập `/admin/products-review`, kiểm tra các tệp đính kèm.
   * Nếu hợp lệ: Bấm **[Phê duyệt]** $\rightarrow$ Sản phẩm chuyển sang `status = "ACTIVE"` và chính thức hiển thị trên sàn công khai.
   * Nếu vi phạm: Bấm **[Từ chối]** kèm lý do (ví dụ: *"Phiếu kiểm nghiệm đã hết hạn"*).

---

## 🎥 2. TÍNH NĂNG 2: PHÒNG LIVESTREAM BÁN HÀNG TƯƠNG TÁC (`FR-34`)

### Bối cảnh nghiệp vụ:
* Bán hàng qua Livestream (Live Commerce) là xu thế chủ đạo hiện nay của TikTok Shop và Shopee Live. Tích hợp phòng phát sóng trực tiếp ngay trên web SCANMS giúp tăng mạnh tỷ lệ chốt đơn (Conversion Rate) và là "Killer Feature" khi demo bảo vệ đồ án.

### Kiến trúc kỹ thuật:
* **Công nghệ Stream:** WebRTC Native + Socket.io Signaling (tận dụng `chat.gateway.ts` sẵn có trong Backend NestJS).
* **Giao diện phòng Live (`LiveShoppingRoom.tsx`):**
  1. **Khung Video Stream:** KOL phát webcam/micro trực tiếp từ trình duyệt. Khách xem video thời gian thực không độ trễ.
  2. **Ghim sản phẩm (Product Pinning Widget):** Góc dưới video có ô hiển thị sản phẩm KOL đang nói tới kèm giá ưu đãi Flash Deal và % hoa hồng.
  3. **Khung Chat bình luận trực tiếp:** Khách gõ bình luận hỏi về sản phẩm, hệ thống hiển thị hiệu ứng bong bóng bay (like, tim).
  4. **Nút "Mua ngay" tại túi đồ (Live Checkout):** Khách bấm mua trực tiếp mà không cần thoát khỏi phiên live, đơn hàng tự động gắn `collaborator_id` của KOL phiên live đó.

---

## 🛒 3. TÍNH NĂNG 3: ĐỒNG BỘ LINK SHOPEE & FILE EXCEL ĐỐI SOÁT (`FR-35`)

### Bối cảnh nghiệp vụ:
* Giải quyết bài toán Shop đã có sẵn sản phẩm và đơn hàng trên Shopee mà không cần phải nhập lại từ đầu.

### Luồng xử lý chi tiết:
1. **Cào thông tin sản phẩm bằng Link Shopee:**
   * Trong form tạo sản phẩm, có thêm ô: `[Nhập Link Shopee: https://shopee.vn/...]`.
   * Hệ thống tự động phân tích và điền sẵn Tiêu đề, Giá bán và Ảnh đại diện vào form cho Shop.
2. **Cơ chế Mã Voucher Độc Quyền (Coupon Mapping):**
   * Shop tạo mã giảm giá riêng trên Shopee (ví dụ `THANG10`).
   * Gán mã này vào hồ sơ của KOL Thắng trên SCANMS.
3. **Đối soát đơn hàng bằng File Excel Shopee:**
   * Web SCANMS cung cấp nút **[Tải file mẫu Excel Shopee]** và nút **[Tải lên file đơn Shopee]**.
   * Hệ thống quét cột `Mã Voucher`: Dòng nào chứa `THANG10` và trạng thái `Hoàn thành` $\rightarrow$ Tự động tính tiền hoa hồng cho Thắng!

---

## 🔄 4. TÍNH NĂNG 4: QUY TRÌNH TRẢ HÀNG & 1 NÚT PHÁN QUYẾT CỦA ADMIN (`FR-36`)

### Bối cảnh nghiệp vụ:
* Khách nhận hàng không ưng ý, có quyền yêu cầu đổi trả trong 14 ngày. Giải quyết dứt điểm tranh chấp bằng quyền lực tối cao của Admin mà không cần cãi cọ phức tạp.

### Luồng xử lý chi tiết:
1. **Khách hàng nộp yêu cầu trả hàng qua Email / Tra cứu:**
   * Khách tải lên **1 ảnh/video bóc hàng lỗi**.
2. **Chủ Shop thao tác:**
   * 👉 **Nếu Shop bấm [Đồng ý]:** Khách gửi hàng về kho $\rightarrow$ Shop nhận hàng $\rightarrow$ Kích hoạt **Clawback**: Hủy hoa hồng KOL (trừ khỏi Ví Chờ), hoàn tiền cho khách.
   * 👉 **Nếu Shop bấm [Từ chối]:** Đơn hàng tự động chuyển thẳng lên bàn của **Super Admin**.
3. **Admin phán quyết dứt điểm 1-Click:**
   * Màn hình Admin chỉ có 2 nút:
     * **`[Ép hoàn tiền]`:** Admin thấy hàng lỗi thật $\rightarrow$ Ép hoàn tiền, hủy hoa hồng KOL.
     * **`[Bác bỏ khiếu nại]`:** Admin thấy khách cố tình quấy phá $\rightarrow$ Bác bỏ khiếu nại, hết 14 ngày tiền hoa hồng vẫn trả về cho KOL bình thường.

---

## 📦 5. TÍNH NĂNG 5: CAM KẾT NỘP VIDEO REVIEW HÀNG MẪU TRONG 7 NGÀY (`FR-37`)

### Bối cảnh nghiệp vụ:
* Tránh tình trạng KOL xin hàng mẫu miễn phí về dùng nhưng không chịu làm video review để bán hàng.

### Luồng xử lý chi tiết:
1. Khi Shop gửi hàng mẫu $\rightarrow$ Shop nhập Mã vận đơn GHTK/GHN.
2. Khi bưu tá giao thành công $\rightarrow$ KOL bấm nút **"Tôi đã nhận được hàng mẫu"**.
3. Hệ thống kích hoạt đồng hồ đếm ngược **7 ngày (168 giờ)**.
4. Màn hình của KOL xuất hiện nút: **[Nộp Link Video Review]** (nhập link TikTok video / YouTube Shorts / Reels).
5. Khi nộp link thành công:
   * Hệ thống xác nhận hoàn thành nghĩa vụ.
   * Mở khóa quyền được xin tiếp các sản phẩm mẫu khác trên sàn.
   * Nếu quá 7 ngày không nộp: Tạm khóa quyền xin hàng mẫu của KOL.

---

## 💬 6. TÍNH NĂNG 6: BỘ LỌC TỪ NGỮ THÔ TỤC TRONG CHAT (`FR-38`)

### Bối cảnh nghiệp vụ:
* Bảo vệ môi trường giao tiếp văn minh, an toàn số giữa Shop và KOL trong khung Chat 1-1 Socket.io.

### Cơ chế hoạt động:
* Khung chat tích hợp bộ lọc Regular Expression (Regex) quét danh sách các từ ngữ cấm (chửi thề, xúc phạm, lăng mạ, lừa đảo...).
* Khi người gửi bấm nút Gửi $\rightarrow$ Hệ thống tự động thay thế các ký tự vi phạm thành dấu hoa thị `***`.
* *Ví dụ:* `"Shop lừa đảo quá, đm"` $\rightarrow$ Hiển thị thành `"Shop ***** quá, **"`.

---

## ⭐ 7. TÍNH NĂNG 7: ĐÁNH GIÁ SAO THEO ĐƠN & XỬ PHẠT SẢN PHẨM LỖI (`FR-39`)

### Cơ chế đánh giá:
* **1 - 2 sao (Đơn có vấn đề / Trả hàng):**
  * Đơn bị trả hàng hoặc khách không hài lòng được đánh giá 1-2 sao.
  * **Hình phạt:** Nếu 1 sản phẩm bị dính **quá 3 lần đánh giá 1-2 sao** (hoặc điểm trung bình $< 3.0$ sao) $\rightarrow$ Hệ thống **tự động ẩn sản phẩm** khỏi sàn để Shop kiểm tra lại chất lượng.
* **3 sao (Trung tính):** Khách thấy hàng tạm được $\rightarrow$ Giữ điểm trung bình, không phạt.
* **4 - 5 sao (Hài lòng):** Gắn huy hiệu "Sản phẩm yêu thích" $\rightarrow$ AI ưu tiên hiển thị cho KOL chọn bán.
* **Quy tắc 3 Gậy cho Shop (Kill Switch):**
  * Nếu Shop bị Admin xử thua khiếu nại quá 3 lần $\rightarrow$ Admin bấm 1 nút **[Khóa Gian Hàng] (`SUSPEND`)** $\rightarrow$ Ẩn toàn bộ sản phẩm và khóa chức năng rút tiền của Shop.

---
*(Tài liệu chuẩn hóa chính thức của Dự án SCANMS - FA26SE032. Đã được ghi nhận và lưu trữ vào kho hồ sơ kỹ thuật).*
