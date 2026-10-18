# Customer: hành trình GHN mô phỏng

Áp dụng cho đơn mua, độc lập với sandbox hàng mẫu. Không cần migration.

1. Customer tạo đơn mua và lưu mã DH cùng SĐT đặt hàng.
2. Shop mở đơn → Giao bưu cục → **Test nhanh**. Sau khi GHN Staging tạo mã thành công, hệ thống lưu giờ bắt đầu và một shipper mô phỏng theo vận đơn.
3. Customer mở **Đơn mua → Chi tiết** và trang `/tracking` với cùng mã DH + SĐT. Cả hai gọi `GET /api/shipping/ghn/track/:orderCode`.
4. Các mốc: ngay khi tạo **Chờ lấy hàng**, sau 1 phút **Bưu tá đã lấy hàng tại kho Shop**, sau 2 phút **Nhập kho trung chuyển**, sau 3 phút **Shipper đang đi giao**, sau 4 phút **Giao hàng thành công**.
5. Ở mốc đang giao và sau khi hoàn tất: hiện **Shipper mô phỏng**, tên được lưu cố định và số che **09xx xxx xxx**. Nút **Gọi shipper** bị vô hiệu hóa. Không gán số điện thoại thật.

Mở lại trang vẫn tính theo giờ bắt đầu đã lưu. Giao diện tải lại trạng thái mỗi 5 giây và dừng khi hoàn tất. Lịch sử chỉ có những mốc đã xảy ra.

Với đơn GHN TEST cũ chưa có mô phỏng: Shop mở **Hành trình đơn hàng** → **Bắt đầu mô phỏng giao hàng**. Thao tác này chỉ dành cho đơn TEST đang giao thuộc Shop; bấm lại không đặt lại đồng hồ hoặc đổi shipper. Đơn thử mới tự bắt đầu sau khi tạo vận đơn thành công.

Mô phỏng không cập nhật website GHN, trạng thái nghiệp vụ đơn mua, thanh toán, tồn kho, hoa hồng hoặc hạn video. Callback hãng không được dùng để đồng bộ đơn đã chọn mô phỏng. Vận đơn LIVE và hàng mẫu giữ luồng riêng. Các ô tiến độ chung của đơn mua vẫn theo trạng thái nghiệp vụ; khung GHN có nhãn riêng cho tiến độ mô phỏng.

Kiểm tra backend: `node node_modules/jest/bin/jest.js --runInBand src/modules/shipping/customer-ghn-simulation.spec.ts src/modules/shipping/ghn.service.spec.ts src/modules/shipping/ghn-live-tracking.spec.ts`

Kiểm tra frontend: đặt `GHN_UI_TEST_URL=http://localhost:5173`, rồi chạy `node --test tests/ghn-tracking.browser.test.mjs tests/ghn-tracking.test.mjs`. Browser test chặn API và dùng fixture, không tạo đơn thật.
