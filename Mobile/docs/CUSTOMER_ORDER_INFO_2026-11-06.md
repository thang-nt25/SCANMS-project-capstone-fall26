# Thông tin đơn hàng Customer

## Phạm vi

- `CustomerOrderDetailScreen` dùng chung cho kết quả đặt hàng và chi tiết trong Đơn mua.
- Kết quả checkout chỉ có mã công khai: tìm chính xác mã trong danh sách đơn của Customer đang đăng nhập, rồi tải chi tiết qua UUID. Không dùng endpoint công khai để lấy thông tin người nhận.
- Hiển thị trạng thái đơn, thanh toán, vận chuyển, người nhận, địa chỉ, Shop, ảnh sản phẩm, phân loại, số lượng và đơn giá lúc mua.
- Thành tiền mở rộng thành tiền hàng, phí vận chuyển, giảm giá và mã KOL đã lưu; mục mã đơn mở rộng thời điểm đặt/giao/hoàn tất và ghi chú nếu có.
- Dùng màu vàng be và React Native StyleSheet; không thêm file CSS, thư viện native hoặc thay đổi database.

## Quy tắc nghiệp vụ

- Dữ liệu được tải từ `GET /customer/orders/:id`, làm mới định kỳ 15 giây và kéo để làm mới. Snapshot từ danh sách chỉ hỗ trợ hiển thị ban đầu; thao tác cần dữ liệu chi tiết hợp lệ.
- Chỉ mở Xác nhận nhận hàng khi trạng thái `DELIVERED` và không có hồ sơ đổi trả. Kiểm tra lại server trước khi gửi `POST /customer/orders/:id/confirm-receipt`.
- Chưa có vận đơn thì hiển thị Shop đang chuẩn bị/chưa cập nhật mã; không dựng hành trình đã giao. Theo dõi GHN mở trong BottomSheet, chỉ lấy mốc đã xác nhận cho tóm tắt.
- Giữ chức năng hủy, đánh giá và đổi trả theo điều kiện có sẵn. Customer không có nút mô phỏng giao hàng.
- PayOS chỉ xác nhận thanh toán theo phản hồi backend. Form và QR không bị tháo khỏi màn hình trong mỗi lần polling chi tiết đơn.

## Kiểm tra

- 83 test mobile qua, gồm 8 test mới cho hợp đồng chi tiết đơn, đơn giá lúc mua, danh sách sản phẩm, điều kiện nhận hàng, phương thức/trạng thái thanh toán, mốc vận chuyển xác nhận, tìm đúng mã đơn và truyền lỗi phân quyền.
- TypeScript, lint và export Android thành công.
- Đã mở đơn Customer hiện có `DH-2026-DCD8F84E` trên Android: cream 40 ml, 1 sản phẩm, tiền hàng 500.000 đ, GHN 21.001 đ, tổng 521.001 đ; thanh toán bằng Ví SCANMS, trạng thái chờ Shop xác nhận. Địa chỉ, ảnh, phân loại, bảng tiền mở rộng và thời điểm đặt hiển thị đúng dữ liệu API.
- QA trực quan chỉ đọc dữ liệu và mở/đóng thông tin; chưa gửi hủy đơn, xác nhận nhận hàng, tạo hội thoại, đặt đơn hay thanh toán. Chưa nghiệm thu thanh toán PayOS và chuyển trạng thái giao hàng thực tế trong lượt này.

## Người dùng test tiếp

1. Customer → Đơn mua → chọn đơn: đối chiếu địa chỉ, sản phẩm, phân loại, giá và tổng tiền.
2. Mở Thành tiền và Thông tin mã đơn; kéo để làm mới.
3. Với đơn có vận đơn, mở Thông tin vận chuyển hoặc Theo dõi đơn: đối chiếu mã, môi trường và hành trình GHN.
4. Đơn đang giao phải khóa Đã nhận được hàng. Đơn đã giao, chưa đổi trả mới cho xác nhận; chỉ xác nhận khi chủ động kiểm thử nghiệp vụ này.
5. Sau một lần mua mới, kết quả đặt hàng phải mở cùng màn chi tiết và khớp dữ liệu trong Đơn mua. Kiểm thử riêng Ví và PayOS nếu cần nghiệm thu giao dịch thực tế.
