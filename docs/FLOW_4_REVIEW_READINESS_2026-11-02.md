# Flow 4 — kiểm tra trước buổi review 02/11/2026

Người demo: Nguyễn Phú Quý. Đối chiếu với `SCANMS_REALIGNMENT_BLUEPRINT.md`, dòng 554–634. Tài liệu này ghi **trạng thái code và database đang chạy**, không thay cho kết quả kiểm thử trên một bộ dữ liệu khác.

## Kết quả kiểm tra lúc chuẩn bị

| Bước | Code hiện có | Điều cần chứng minh trên dữ liệu demo |
| --- | --- | --- |
| 4.1 Link, QR, mã KOL | Tạo link, tải PNG/SVG QR, mã định danh KOL | KOL có link và mã gắn đúng sản phẩm/Shop |
| 4.2 Attribution | Phiên click, cookie 30 ngày, last click; coupon có quyền ghi đè nguồn link | Mở link trong cửa sổ Customer, kiểm tra đơn lưu nguồn KOL |
| 4.3 Chống tự mua | Checkout so trùng tài khoản hoặc SĐT nhận hàng, gắn `SELF_REFERRAL_`, thu nhập 0 | Mua bằng chính tài khoản KOL và mở chi tiết đơn của Shop |
| 4.4 Thanh toán | Checkout COD/PayOS, coupon KOL, lưu attribution | Tạo đơn thật qua UI trên DB demo; PayOS chỉ tuyên bố đã thanh toán nếu có callback xác minh |
| 4.5 Thu nhập | Lấy tỷ lệ cao nhất; số tiền tính trên giá gốc, ghi `PENDING` | Xem tỷ lệ, số tiền và trạng thái của đúng đơn ở Shop/KOL |
| 4.6 Giao GHN | Báo giá, dữ liệu đóng gói, tạo tracking và cập nhật trạng thái; có chế độ mô phỏng | Dùng mock/staging; không nói có bưu tá thật nếu chỉ mô phỏng |
| 4.7 Đổi/hoàn | Khách gửi bằng chứng, Shop duyệt, đặt lấy hàng trả, Manager xác định lỗi, Shop kiểm tra; đổi 1:1 trừ tồn kho và bảo lưu thu nhập; hoàn vào ví SCANMS thành công mới clawback, có retry khi `PENDING` | Chuẩn bị **hai đơn đã giao riêng biệt** cho nhánh đổi và nhánh hoàn |

Kiểm tra kỹ thuật: build backend/frontend thành công; 152/152 unit tests backend trọng tâm (link/QR, self-referral, thù lao, GHN, lấy hàng trả, đổi/hoàn, đơn hàng) qua. Kiểm tra frontend liên quan: 28 qua, 2 browser tests bị skip theo cấu hình môi trường. API health trả `UP`, database `CONNECTED`; frontend trả HTTP 200. Đây chưa phải bằng chứng rằng toàn bộ thao tác nhiều tài khoản đã được chạy lại từ đầu đến cuối trên DB hiện tại.

## Chặn demo số liệu theo blueprint

`npm.cmd run seed:check` kết luận database Supabase đang cấu hình **chưa có dataset `scanms-capstone-2026-v4`**. `seed:audit` thấy **713 đơn hàng** đang tồn tại và **7 migration đã ghi trong DB nhưng thiếu file ở nhánh hiện tại**. API thực tế trả serum `SKIN-VTC15` giá **280.000₫**, mã `THAONHI16` giảm **10%** và validate thành công cho serum; danh sách mã công khai hiện **không có `SCANMSFREESHIP`**. Seed v4 quy định serum **450.000₫**, mã giảm **5%**, deal **16%** tạo thu nhập **72.000₫** và có mã freeship. Không nói 72.000₫ hoặc freeship 3 lượt là kết quả đang chạy nếu chưa nạp v4 hoặc chưa nhìn thấy đúng trên UI.

Để có số minh họa v4: dùng một **database demo riêng**, chạy migration và seed v4 theo `backend/prisma/seeds/README.md`, rồi chạy `seed:check`. Không reset hoặc seed đè database nhóm `public`; nó đang có đơn, ví và dữ liệu tester. Nếu buổi review dùng DB hiện tại, trình bày số tiền thực tế trên màn hình, tính `giá gốc của đơn × tỷ lệ đã chọn`, và bỏ ví dụ cứng 450.000₫ → 72.000₫.

## Thứ tự rehearsal trên UI

1. Mở `http://localhost:5173`, đăng nhập KOL có `THAONHI16`, vào `/collaborator/marketing`. Chỉ link, QR và mã KOL; mở link trong cửa sổ Customer khác.
2. Customer thêm serum vào giỏ, áp `THAONHI16`, chọn COD, đặt hàng. **Chỉ trên DB v4**, nếu kiểm tra freeship thì dùng một số điện thoại đủ điều kiện và kiểm tra `SCANMSFREESHIP` riêng; mã này không thay mã KOL.
3. Shop vào `/merchant/orders`, mở đúng đơn để chỉ nguồn KOL, khoản thu nhập chờ xử lý; đóng gói và tạo vận đơn GHN trong mock/staging, cập nhật đến `DELIVERED`.
4. Dùng chính tài khoản KOL mua qua link/mã của mình để chứng minh `SELF_REFERRAL_` và thu nhập bằng 0. Đây là **đơn khác** với đơn chứng minh thu nhập hợp lệ.
5. Với **đơn đã giao A**, Customer gửi yêu cầu đổi kèm ảnh/video → Shop duyệt → Customer đặt lấy hàng trả → Shop mô phỏng/đồng bộ hàng về → Manager mở `/admin/return-disputes` xác định `LOGISTICS_FAULT` → Shop kiểm tra và gửi hàng thay thế → kiểm tra thu nhập KOL không bị đảo.
6. Với **đơn đã giao B**, Customer yêu cầu hoàn → Shop nhận/kiểm tra và chọn hoàn vào ví. Chỉ sau `refund=SUCCEEDED` mới chỉ `order.refundedAmount`, `commission=REVERSED`, bút toán thu hồi. Nếu `PENDING`, Manager dùng nút **Thử hoàn tiền vào ví khách** trên chi tiết hồ sơ; chưa được nói đã clawback.

Chuẩn bị sẵn hai đơn đã giao, tồn kho hàng bù, ảnh/video unboxing và bốn phiên đăng nhập riêng (KOL, Customer, Shop, Manager). Tại mỗi bước dùng mã đơn cụ thể trên màn hình để tránh mở nhầm hồ sơ.

## Giới hạn cần trả lời đúng khi giáo viên hỏi

- Guard chống tự mua hiện kiểm tra **cùng tài khoản** và **cùng số điện thoại**. Nó chưa so STK ngân hàng của người mua vì hồ sơ Customer không lưu STK; không giới thiệu đó là mô hình AI đã xác minh ba tín hiệu.
- Hàng thay thế hiện được Shop ghi vận đơn và trừ tồn kho trong một transaction. Chưa có tích hợp tự tạo vận đơn GHN cho kiện hàng thay thế. Phiếu GHN bồi hoàn là hồ sơ nội bộ `PENDING_RECONCILIATION`, chưa có thanh toán bồi thường từ GHN.
- Hoàn tiền đi vào **ví SCANMS nội bộ**. Chưa có API chuyển trả tiền về ngân hàng/PayOS gốc. Mock/staging không chứng minh vận chuyển hay thanh toán ngoài đời thực.
