# Flow 4 — kiểm tra dưới góc nhìn khách mua và đổi trả

## Chuẩn bị

- Chạy backend và frontend, mở `http://localhost:5173`.
- Dùng DB demo hiện tại và ghi lại mã đơn, số tiền thực tế; không đọc số 450.000 ₫ trong blueprint như giá seed hiện tại.
- Tài khoản: khách, KOL, Shop và System Manager. Với GHN mock/staging, nói rõ bước nào mô phỏng.

## Đường A — hàng vỡ do vận chuyển, đổi 1:1

1. KOL tạo link/mã, khách mở link và mua một sản phẩm bằng PayOS, Ví hoặc COD; kiểm tra mã vận đơn và thu nhập KOL đang chờ.
2. Shop giao hàng qua GHN; đưa đơn đến trạng thái `DELIVERED`.
3. Khách mở đơn, chọn đúng sản phẩm và số lượng, lý do **hư hỏng**, mong muốn **đổi hàng**, tải ảnh và video mở hộp.
4. Shop gửi bằng chứng đóng gói và chuyển tranh chấp cho Manager. Manager xem cả hai bên, kết luận `LOGISTICS_FAULT` khi đủ chứng cứ.
5. Shop nhận hàng trả, kiểm tra, gửi hàng đổi và nhập mã vận đơn. Lúc này khách **chưa thể đóng hồ sơ**. Khách bấm **Tôi đã nhận hàng đổi**, sau đó **Hoàn tất**.
6. Kiểm tra kho giảm theo số lượng hàng đổi, thu nhập KOL được giữ, hồ sơ GHN được mở riêng. Trạng thái GHN bồi hoàn là ghi nhận thủ công, không phải xác nhận dòng tiền ngân hàng.

## Đường B — đổi ý, hoàn tiền và clawback

1. Tạo đơn khác, ưu tiên có hai sản phẩm để kiểm tra chọn một món và số lượng trả.
2. Khách chọn **Đổi ý / không còn nhu cầu**, **Hoàn tiền vào Ví SCANMS**, tải ảnh tình trạng hàng. Video không bắt buộc.
3. Shop duyệt, khách đặt GHN lấy hàng trả; Shop nhận và kiểm tra. Shop hoặc Manager quyết định hoàn tiền.
4. So sánh số dư ví, `order.refundedAmount`, trạng thái refund và thu nhập KOL trước/sau. Khoản hoàn của món đã chọn được phân bổ theo tỷ lệ giá gốc của món trong đơn đã thanh toán. Không cộng `refundedAmount` hai lần.
5. Khách xác nhận hoàn tất. Nếu đã hoàn ví mà khách không bấm, job tự đóng sau 7 ngày.

## Đường C — chống tự mua

KOL mở link của chính mình rồi mua bằng cùng tài khoản, email, số điện thoại hoặc tài khoản ngân hàng KYC đã xác minh. Đơn vẫn cần được ghi nhận, nhưng tỷ lệ thu nhập từ chính đơn đó phải về 0. Trùng địa chỉ giao hàng chỉ tạo tín hiệu cần rà soát.

## Giới hạn cần nói đúng khi review

- Mỗi đơn hiện chỉ có **một** hồ sơ đổi trả; khách phải chọn tất cả món cần xử lý trong hồ sơ đó.
- Hoàn tiền đi vào **Ví SCANMS**, kể cả đơn đã thanh toán qua PayOS/COD. Chưa có chuyển ngược tự động về ngân hàng.
- GHN reverse pickup trong máy local là mock hoặc staging. Bồi hoàn từ GHN được Manager ghi nhận theo chứng từ, chưa có API nhận tiền và đối soát ngân hàng tự động.
