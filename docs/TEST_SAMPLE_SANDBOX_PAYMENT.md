# Kiểm thử thanh toán cước hàng mẫu sandbox

1. Shop mở **Mạng lưới KOL & Hợp tác → Hàng mẫu**, hoặc **Quản lý Đơn hàng → Hàng mẫu KOL**.
2. Chọn mẫu đã có vận đơn **GHN sandbox**, kiểm tra số cước và **Thu hộ COD từ KOL: 0 đ**.
3. Bấm **Thanh toán cước thử**. Thẻ chuyển sang **Shop đã thanh toán cước mô phỏng**, hiện mã xác nhận và thời điểm; nút thanh toán biến mất.
4. Tải lại trang hoặc mở mẫu ở màn hình Shop còn lại: trạng thái và mã xác nhận giữ nguyên.
5. KOL mở cùng yêu cầu: thấy Shop đã thanh toán cước mô phỏng và COD 0 đ, không có nút thanh toán.
6. Cước chưa xác nhận: hiện lời nhắc và khóa nút, không tự dùng cước 0 đ. Cước 0 đ hợp lệ được GHN trả về vẫn được xác nhận thử.
7. Khi lưu thất bại: hiện lỗi, chưa báo thành công, cho phép thử lại. Gửi lại cùng yêu cầu sau khi đã thành công trả cùng mã/thời điểm.

Chức năng chỉ ghi trạng thái thử vào sự kiện `SANDBOX_SAMPLE_STATE` theo từng vận đơn TEST, trong giao dịch có khóa. Chỉ chủ Shop của yêu cầu được thanh toán thử. Không gọi GHN, không trừ ví, không tạo bút toán tiền thật, không đổi cước/trạng thái vận đơn thật hay thời hạn video. Thanh toán không tự bắt đầu hành trình; Shop vẫn dùng nút Bắt đầu hành trình nếu cần test giao hàng.

API: `POST /api/shipping/ghn/sandbox-sample/:orderCode/pay-shipping` với tài khoản Shop. Dữ liệu trả về có `shippingPayment.status = PAID_SIMULATED`, số tiền lấy từ cước đã lưu, bên chịu phí SHOP và COD 0 đ. Không nhận số tiền từ trình duyệt.

Kiểm thử tự động:

```powershell
# backend
node node_modules/jest/bin/jest.js --runInBand --silent src/modules/shipping/sandbox-sample.spec.ts

# frontend, khi Vite chạy cổng 5173
$env:GHN_UI_TEST_URL='http://localhost:5173'
node --test tests/sample-compact.browser.test.mjs
```
