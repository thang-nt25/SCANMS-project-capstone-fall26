# Thử tự chạy trạng thái giao GHN sandbox

Trong SCANMS, mở **Mạng lưới KOL & Hợp tác → Hàng mẫu** hoặc **Quản lý Đơn hàng → Hàng mẫu**, mở thẻ **GHN sandbox** và bấm **Bắt đầu giả lập giao hàng**. Mã TEST lần lượt hiện:

1. Chờ bưu tá lấy hàng.
2. Sau 1 phút: Đang vận chuyển.
3. Sau 1 phút nữa: Đã giao thành công; bắt đầu hạn video thử 14 ngày.

Thẻ tự hỏi trạng thái mỗi 5 giây. Nếu đóng trang, lần mở sau sẽ tính trạng thái theo giờ bắt đầu và nhảy đến mốc tương ứng. KOL thấy cùng hành trình ở thẻ mẫu của mình; sau khi mô phỏng giao xong có thể nộp video thử.

Mã mẫu đã nhận trước đó có thể bấm **Bắt đầu giả lập giao hàng** để chạy lại. Việc chạy lại đặt lại trạng thái nhận hàng/video thử cho mã sandbox hiện tại; các lần thao tác vẫn được lưu trong lịch sử sự kiện sandbox.

Đây là dữ liệu chỉ lưu trong SCANMS cho vận đơn `environment=TEST`. Không phát webhook giả, không sửa trạng thái mẫu thật hoặc gửi cập nhật đến GHN. Nút **Theo dõi GHN sandbox** vẫn đọc trạng thái do GHN staging trả về.

GHN ghi rõ trạng thái đơn được gửi theo chiều GHN → webhook của hệ thống tích hợp; API Update Order cho phép sửa các trường vận đơn theo trạng thái, nhưng không có thao tác đặt trạng thái giao hàng. Vì thế hành trình tự chạy này không xuất hiện trên website 5sao.GHN. [Webhook trạng thái đơn](https://developer.ghn.dev/en/docs/webhook/callback-order-status), [API cập nhật đơn](https://developer.ghn.dev/en/docs/order/update).
