# Kiểm thử mục 6 sau khi sửa

## Quy tắc đang áp dụng

Mỗi Shop trong một đơn được dùng tối đa **1 voucher tiền hàng Shop/KOL/Deal/Campaign/Live + 1 voucher tiền hàng Sàn + 1 voucher Freeship**. Voucher Freeship chỉ giảm cước GHN và bị chặn tại số cước thực tế. Tỷ lệ hoa hồng nhân tiền hàng sau khi trừ voucher tiền hàng, không trừ Freeship khỏi GMV.

Coupon Shop/KOL không có tùy chọn cho chồng thêm coupon tiền hàng Shop. Cấu hình cũ không được dùng để vượt quy tắc. Voucher chỉ áp dụng một số sản phẩm được phân bổ giảm giá đúng các dòng đó; voucher tiền hàng Sàn phân bổ trên tiền hàng còn lại.

## Chuẩn bị

1. Nếu backend không chạy chế độ watch, khởi động lại bằng `npm.cmd run start:dev` trong thư mục backend. Làm mới trang web.
2. Dùng sản phẩm giá 250.000 đ, không có giảm giá trực tiếp. Customer có địa chỉ GHN hợp lệ.
3. Dùng các tài khoản Shop, KOL và Customer ở ba phiên đăng nhập riêng. Ghi lại mức hoa hồng thực sự áp dụng của KOL; ví dụ phía dưới dùng 14%.
4. Mỗi lần test một thay đổi tạo **đơn mới**; bản ghi hoa hồng các đơn trước được giữ nguyên.

## A. Deal độc quyền có voucher KOL

1. KOL vào **Hợp tác & Nhận mẫu Shop → chọn Shop → Sản phẩm → Đề xuất Deal**.
2. Chọn thưởng Deal +1/+2/+3%, điền kế hoạch và cam kết review rồi gửi.
3. Shop mở đề xuất trong **Mạng lưới KOL & Hợp tác**, duyệt với voucher **5%**, đơn tối thiểu **200.000 đ**, ngân sách và số lượt phù hợp.
4. Kiểm tra phản hồi duyệt có mã voucher mang thương hiệu KOL. Dùng **mã thực tế vừa được cấp**; phần đuôi giúp tránh trùng mã.
5. Customer mua sản phẩm 250.000 đ, nhập mã vào **Voucher tiền hàng của Shop / KOL**. Kỳ vọng giảm **12.500 đ**.

## B. Voucher Campaign

1. Shop tạo một Campaign đang còn hiệu lực trong **Khuyến mãi & Hoa hồng**.
2. Mở tab **Voucher**, bấm phát hành voucher, chọn **Chiến dịch Sale**.
3. Trong ô **Chiến dịch áp dụng**, chọn Campaign vừa tạo. Form gắn ngày theo Campaign; có thể chỉnh ngày nhưng voucher chỉ dùng khi cả voucher và Campaign còn hiệu lực.
4. Điền mã chưa trùng, ví dụ `MEGASALE20`, hình thức giảm **số tiền 20.000 đ**, đơn tối thiểu **250.000 đ**, ngân sách và số lượt; phát hành.
5. Customer áp mã vào ô tiền hàng: đơn 250.000 đ giảm 20.000 đ. Chưa tới giờ/đã hết giờ Campaign hoặc Campaign tạm dừng thì mã phải bị từ chối.

## C. Ghép đúng ba loại voucher

Chuẩn bị mã Shop/KOL giảm 5%, mã Sàn giảm 20.000 đ và Freeship giảm 50.000 đ. Voucher Sàn do Admin phát hành. Dùng mã còn ngân sách và đủ điều kiện đơn tối thiểu.

| Khoản | Ví dụ khi cước GHN = 25.000 đ |
| --- | ---: |
| Tiền hàng | 250.000 đ |
| Voucher Shop/KOL 5% | −12.500 đ |
| Voucher tiền hàng Sàn | −20.000 đ |
| Cước GHN | +25.000 đ |
| Freeship 50.000 đ bị chặn theo cước | −25.000 đ |
| **Customer thanh toán** | **217.500 đ** |
| **Net GMV tính hoa hồng** | **217.500 đ** |
| Hoa hồng nếu tỷ lệ đã chốt = 14% | **30.450 đ** |

Nếu cước GHN của bạn khác 25.000 đ, thay cước thực tế vào bảng. Freeship tối đa 50.000 đ trong ví dụ này, không trừ phần còn dư vào tiền hàng.

Nhập một mã Shop khác vào ô voucher Sàn phải bị từ chối. Nhập Freeship vào ô tiền hàng cũng phải bị từ chối. Muốn đổi voucher tiền hàng Shop/KOL, bỏ mã hiện tại và chọn mã có lợi hơn; hai mã này không được cộng với nhau.

## D. Voucher giới hạn sản phẩm

1. Giỏ cùng Shop có A và B, mỗi sản phẩm 250.000 đ.
2. Tạo voucher 50.000 đ chỉ áp dụng A. Giả sử A có tổng hoa hồng 13%, B có 10%.
3. Kỳ vọng Net GMV A = 200.000 đ, B = 250.000 đ.
4. Tổng hoa hồng = 200.000 × 13% + 250.000 × 10% = **51.000 đ**. B không bị chia phần giảm giá của A.

## E. Voucher Live và đơn chưa thanh toán

1. Shop tạo phiên, chọn sản phẩm và voucher Live; KOL chấp nhận và bắt đầu để phiên thực sự là LIVE.
2. Customer nhập voucher Live vào ô tiền hàng. Có thể thêm một mã Sàn và một Freeship hợp lệ.
3. Khi phiên tạm dừng, chưa bắt đầu hoặc đã hết thời gian, đơn mới không được dùng voucher Live. Không thể dùng voucher Campaign/Shop khác cùng ô tiền hàng.
4. Khi hệ thống tính lại đơn Live còn PENDING và chưa thanh toán sau khi phiên kết thúc, chỉ bỏ voucher Live; giữ voucher Sàn/Freeship đã áp dụng và tính lại hoa hồng trên tiền hàng còn lại. Đơn đã thanh toán và đơn đã qua PENDING không bị tính lại bởi nhánh này.
5. Ví dụ: tiền hàng 250.000, cước 25.000, Live giảm 15.000, Sàn giảm 20.000, Freeship 25.000 → ban đầu trả 215.000; sau bỏ voucher Live còn **230.000 đ**. Nếu mức hoa hồng thường đã chốt là 12%, hoa hồng sau tính lại là **27.600 đ**.

## Phạm vi đã xác minh

- 323 kiểm thử thuộc 21 nhóm đạt, gồm kiểm tra transaction của OrdersService, phân bổ theo sản phẩm, ba loại voucher, ngân sách/hạn mức, Live hết thời gian, reset Live giữ ưu đãi khác và không sửa đơn đã thanh toán.
- Audit `node scripts/audit-margin-protection.cjs` chạy trong backend: **7/7 đạt**.
- Backend và frontend build thành công; Prisma Client đã được tạo lại.
- Database: chuẩn hóa 14 cấu hình cũ, sao lưu các cờ trước khi cập nhật, so sánh fingerprint trước/sau của orders, order_items, commissions, coupon_redemptions và stacked_voucher_redemptions đều không đổi. Kiểm tra lại không còn cấu hình cần chuẩn hóa.
- `/checkout` dùng chung OrdersService với luồng chính, yêu cầu đăng nhập, đồng ý chính sách, địa chỉ và khóa chống tạo trùng; giá client gửi lên không được dùng để chốt tiền.
- Chưa chạy toàn bộ các bước Customer/Shop/KOL trực tiếp bằng trình duyệt. Các bước trên dùng để nghiệm thu giao diện và kết quả đơn thực tế.
