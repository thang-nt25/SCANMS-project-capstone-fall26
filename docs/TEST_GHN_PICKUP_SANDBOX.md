# Test GHN tiếp nhận đơn và bưu tá lấy hàng

## Kết luận từ tài liệu GHN

API `shipping-order/update` sửa thông tin vận đơn theo trạng thái hiện tại, không cung cấp trường đặt trạng thái hoặc gán tài xế. `ready_to_pick` cho phép sửa tất cả các trường thông tin được API hỗ trợ, không có nghĩa cho phép đổi đơn sang `picking`/`picked`.

- Tạo đơn: https://developer.ghn.vn/vi/docs/order/create
- Sửa thông tin: https://developer.ghn.vn/vi/docs/order/update
- Nhận trạng thái: https://developer.ghn.vn/vi/docs/webhook/callback-order-status

Trong các tài liệu công khai đã kiểm tra, chưa có hướng dẫn/API cho Shop ép shipper nhận đơn ngay ở Staging. Nếu cần trạng thái do chính GHN thay đổi, cần hỏi GHN về quyền/công cụ điều phối test dành cho tài khoản sandbox. Không gửi `status: picked` vào API update để giả lập đã lấy hàng.

## Test kết nối GHN sandbox trên SCANMS

1. Giữ mô phỏng tắt (không khai báo `SHIPPING_SIMULATION_ENABLED`, hoặc đặt `false`). Backend đã có nhánh riêng dùng `GHN_TEST_API_TOKEN` và `GHN_TEST_SHOP_ID`; không dùng token LIVE thay thế.
2. Shop mở Quản lý đơn hàng, chọn đơn thử đủ điều kiện giao bưu cục, chọn **Tạo vận đơn GHN sandbox**. Với hàng mẫu, chọn **GHN sandbox · Thử API, không giao hàng thật** trong modal tạo vận đơn.
3. Tạo thành công phải có mã do GHN trả về. Mở theo dõi, kiểm tra môi trường TEST và trạng thái đọc từ GHN. `ready_to_pick` chỉ chứng minh đã tạo vận đơn/chờ lấy hàng, chưa chứng minh có bưu tá nhận việc hoặc đã lấy kiện.
4. Muốn nhận callback: cấu hình webhook trong tài khoản Staging tại Developer Portal, tab Order. URL phải là HTTPS công khai trỏ đến `/api/shipping/ghn/webhook` của backend (kiểm tra prefix của môi trường triển khai); GHN không gọi trực tiếp được `localhost`. Cấu hình header xác thực theo backend đang dùng.
5. GHN ghi rõ cấu hình Staging và Production độc lập, thay đổi cấu hình có thể mất khoảng 15 phút. Chỉ khi GHN thực sự phát sinh sự kiện, hệ thống mới nhận được callback tương ứng; cấu hình webhook không tự tạo trạng thái lấy/giao hàng.

Không tạo vận đơn LIVE chỉ để ép có bưu tá cho bài test sandbox.

## Test nhanh hành trình mô phỏng đã có trên SCANMS

Đây là lựa chọn thử giao diện, không phải shipper GHN nhận đơn. Chỉ bật trên môi trường phát triển:

```dotenv
SHIPPING_SIMULATION_ENABLED=true
```

Khởi động lại backend sau khi đổi cấu hình. Môi trường production luôn chặn mô phỏng. Không cần sửa token hoặc bật vận đơn LIVE.

Với đơn mua:

1. Shop tạo vận đơn TEST mới; mô phỏng bắt đầu sau khi GHN Staging trả mã thành công. Với đơn TEST cũ đủ điều kiện, mở Hành trình đơn hàng, bấm **Bắt đầu mô phỏng giao hàng**.
2. Các mốc tính từ giờ bắt đầu: ngay lập tức chờ lấy hàng; +1 phút bưu tá đã lấy; +2 phút nhập kho; +3 phút đang giao; +4 phút giao thành công.
3. Thông tin tài xế mang nhãn mô phỏng, không có số để gọi thật. Theo dõi lại trong SCANMS; hành trình giả lập không xuất hiện trên trang GHN.
4. Chạy xong đặt cờ về `false`, khởi động lại backend để tiếp tục kiểm tra dữ liệu hãng vận chuyển.

Hướng dẫn riêng: [Đơn mua](TEST_CUSTOMER_GHN_SIMULATION.md), [Hàng mẫu](TEST_GHN_SANDBOX_AUTO_DELIVERY.md).

## Phạm vi kiểm tra lần này

Đã đối chiếu tài liệu công khai với controller/service và kiểm tra sự hiện diện của cấu hình TEST, không xuất giá trị bí mật. Chưa tạo vận đơn mới, chưa đổi `.env`, chưa cấu hình tài khoản GHN hoặc xác nhận shipper nhận đơn. Muốn có bằng chứng nhận đơn từ GHN phải dùng phản hồi/callback thực tế của tài khoản sandbox.
