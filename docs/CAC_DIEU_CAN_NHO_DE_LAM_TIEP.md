# SỔ TAY GHI NHỚ: CÁC ĐIỀU CẦN NHỚ ĐỂ THỰC HIỆN TIẾP
## DỰ ÁN SCANMS (MÃ ĐỀ TÀI: FA26SE032)

> **Tài liệu dành cho:** Leader Nguyễn Thành Thắng & Đội ngũ Capstone FA26SE032  
> **Mục đích:** Bản tóm lược toàn bộ các quy tắc nghiệp vụ, giải pháp tinh gọn, cơ chế xử lý tranh chấp và các tính năng mở rộng đã chốt để mang ra thực hiện tiếp mà không bị quên hay làm thừa.

---

## 📌 PHẦN 1: QUY TRÌNH MUA HÀNG & GIAO HÀNG (TINH GỌN — KHÔNG CẦN ROLE SHIPPER)

1. **Khách hàng mua hàng 1-chạm (Guest Checkout):**
   * Không bắt buộc tạo tài khoản. Chỉ cần: Họ tên, SĐT, Địa chỉ, chọn COD hoặc VietQR.
   * Tự động áp mã giảm giá của KOL (nếu đi từ link hoặc phiên Live).
2. **Kho hàng (Inventory):**
   * Không làm phần mềm quản lý kho (WMS) phức tạp.
   * Chỉ cần: Khi khách đặt hàng thành công $\rightarrow$ Hệ thống tự động trừ kho (`stock = stock - 1`). Khi kho bằng `0` $\rightarrow$ Hiện nhãn "Hết hàng".
3. **Shop thao tác giao hàng (Không cần Role Shipper vì Shipper là bên thứ 3):**
   * Đơn mới ở trạng thái: **`PENDING`** (Chờ đóng gói).
   * Nhân viên kho đóng gói hàng $\rightarrow$ Bấm nút **`[Giao cho bưu cục]`** $\rightarrow$ Gõ **Mã vận đơn** của bưu điện (ví dụ: `GHTK-987654`) $\rightarrow$ Đơn đổi sang **`SHIPPING`**.
   * Khi bưu tá báo giao xong và thu tiền COD $\rightarrow$ Shop bấm nút **`[Cập nhật: Đã giao thành công]`** $\rightarrow$ Đơn đổi sang **`DELIVERED`**.
   * **Bắt đầu đếm ngược 14 ngày giam tiền hoa hồng (Ví Chờ).**

---

## 📌 PHẦN 2: XỬ LÝ KHIẾU NẠI TRẢ HÀNG & 1 NÚT PHÁN QUYẾT CỦA ADMIN

1. **Khách yêu cầu trả hàng trong vòng 14 ngày:**
   * Khi đơn `DELIVERED`, hệ thống gửi Email cho khách kèm 2 nút:
     * Nút 1: *Đánh giá 1-5 sao* (nếu hài lòng).
     * Nút 2: *Yêu cầu đổi trả/hoàn hàng* (nếu không vừa ý).
   * Khách bấm nút trả hàng $\rightarrow$ Điền form nộp **1 ảnh/video chụp bóc hàng lỗi**.
2. **Chủ Shop xử lý:**
   * 👉 **Nếu Shop bấm [Đồng ý]:** Khách gửi hàng về kho $\rightarrow$ Shop nhận hàng $\rightarrow$ Hệ thống kích hoạt **Clawback**: Hủy hoa hồng KOL (trừ sạch khỏi Ví Chờ), hoàn tiền cho khách. Xong!
   * 👉 **Nếu Shop bấm [Từ chối]:** Đơn hàng tự động đẩy thẳng lên bàn của **Super Admin** làm trọng tài.
3. **Admin phán quyết dứt điểm bằng 1 Click:**
   * Màn hình Admin chỉ có 2 nút:
     * **`[Ép hoàn tiền]`:** Admin thấy hàng lỗi thật $\rightarrow$ Ép Shop trả tiền cho khách, hủy hoa hồng KOL.
     * **`[Bác bỏ khiếu nại]`:** Admin thấy khách cố tình quấy phá không có bằng chứng $\rightarrow$ Bác bỏ khiếu nại, hết 14 ngày tiền hoa hồng vẫn trả về cho KOL bình thường.

---

## 📌 PHẦN 3: ĐÁNH GIÁ HÀNG HÓA & QUY TẮC XỬ PHẠT SHOP

1. **Logic Đánh giá sao gắn liền đơn hàng:**
   * **1 - 2 sao (Tiêu cực / Đơn lỗi):** Nếu một sản phẩm bị dính **quá 3 lần đánh giá 1-2 sao** (hoặc điểm trung bình $< 3.0$ sao) $\rightarrow$ Hệ thống **tự động ẩn sản phẩm** khỏi sàn để Shop kiểm tra lại nguồn hàng.
   * **3 sao (Trung tính):** Đánh giá bình thường $\rightarrow$ Không phạt, điểm ở mức trung bình.
   * **4 - 5 sao (Hài lòng):** Gắn huy hiệu "Sản phẩm yêu thích" $\rightarrow$ AI ưu tiên gợi ý cho KOL bán.
2. **Quy tắc 3 Gậy & 1 Công tắc Khóa Gian Hàng (Kill Switch):**
   * Nếu Shop bị khiếu nại thua quá 3 lần (dính 3 gậy vi phạm):
   * Admin bấm đúng 1 nút: **`[Khóa Gian Hàng] (SUSPEND)`**:
     * Toàn bộ sản phẩm của Shop bị ẩn ngay lập tức.
     * Mọi link tiếp thị của KOL dẫn tới Shop này tạm dừng hoạt động.
     * Khóa luôn chức năng rút tiền của Shop.

---

## 📌 PHẦN 4: BỘ LỌC TỪ NGỮ THÔ TỤC TRONG CHAT (PROFANITY FILTER `***`)

* **Mục đích:** Bảo vệ văn hóa giao tiếp và kiểm duyệt nội dung an toàn khi Shop và KOL chat trực tiếp qua Socket.io.
* **Cơ chế:**
  * Khung chat có bộ lọc từ cấm.
  * Khi người dùng gửi câu có từ ngữ xúc phạm, chửi thề, lừa đảo... $\rightarrow$ Hệ thống tự động chuyển thành dấu hoa thị `***`.
  * *Ví dụ:* `"Shop lừa đảo quá, đm"` $\rightarrow$ Hiển thị thành `"Shop ***** quá, **"`.
* **Ghi điểm khi Demo:** Mở 2 tab chat gõ thử từ bậy $\rightarrow$ Tab bên kia tự động hiện `***` $\rightarrow$ Giảng viên chấm điểm rất cao!

---

## 📌 PHẦN 5: PHÒNG LIVESTREAM BÁN HÀNG TƯƠNG TÁC (LIVE SHOPPING)

* **Trang phát sóng (`LiveShoppingRoom.tsx`):**
  * KOL bật webcam/micro phát trực tiếp trên trình duyệt (WebRTC qua Socket.io).
  * Nút **Ghim sản phẩm (Product Pinning)**: Ghim sản phẩm đang live góc dưới màn hình kèm giá Flash Deal.
  * Khung Chat bình luận thời gian thực cho người xem.
  * Nút **"Mua ngay"** tại túi đồ phiên live: Khách mua hàng siêu tốc mà không bị gián đoạn video live.

---

## 📌 PHẦN 6: TÍCH HỢP SHOPEE THỰC CHIẾN (KHÔNG CẦN CÓ SHOPEE THẬT)

1. **Cào thông tin bằng Link Shopee:** Form đăng sản phẩm có thêm ô dán link Shopee $\rightarrow$ Tự động cào tiêu đề, giá bán, ảnh mẫu.
2. **Mã Voucher độc quyền:** Gán mã giảm giá độc quyền trên Shopee (`THANG10`) vào tài khoản KOL Thắng.
3. **Đối soát bằng File Excel Shopee mẫu:** Tạo 1 file Excel mẫu Shopee có cột `Mã đơn`, `Doanh thu`, `Mã voucher` $\rightarrow$ Bấm nút tải lên để hệ thống tự quét và cộng hoa hồng.

---

## 📌 PHẦN 7: BẰNG CHỨNG SẢN XUẤT & KIỂM ĐỊNH SẢN PHẨM LÊN SÀN

* Khi Shop đăng sản phẩm mới: Có ô đính kèm Giấy công bố mỹ phẩm / Phiếu kiểm nghiệm Bộ Y Tế.
* Sản phẩm ở trạng thái **`PENDING_APPROVAL`** (Chờ duyệt).
* Super Admin vào trang quản trị xem giấy tờ $\rightarrow$ Bấm **`[Phê duyệt]`** thì sản phẩm mới chính thức xuất hiện trên sàn SCANMS (`ACTIVE`).

---

## 📌 PHẦN 8: CAM KẾT NỘP VIDEO REVIEW HÀNG MẪU TRONG 7 NGÀY

* Khi KOL nhận được sản phẩm mẫu từ bưu tá $\rightarrow$ Bấm nút "Đã nhận hàng mẫu".
* Hệ thống đếm ngược **7 ngày (168 giờ)**.
* KOL phải nộp đường link video review (TikTok/Reels/Shorts) vào hệ thống để hoàn tất cam kết $\rightarrow$ Mở khóa quyền được xin tiếp các sản phẩm mẫu khác.

---
*(Sổ tay ghi nhớ chính thức của Nhóm Đồ án Tốt nghiệp SCANMS - FA26SE032. Lưu trữ tại: `docs/CAC_DIEU_CAN_NHO_DE_LAM_TIEP.md`)*
