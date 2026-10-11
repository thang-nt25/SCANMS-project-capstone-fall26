# Thanh toán PayOS cho đơn ngoài sàn

- Cần `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` từ cùng kênh PayOS trong backend. Không đưa các khóa này lên frontend.
- `PAYOS_STOREFRONT_URL` là origin frontend: `http://localhost:5173` khi phát triển, HTTPS khi production.
- Webhook HTTPS `/api/orders/payos/webhook` đã đăng ký trong PayOS giúp cập nhật nhanh hơn. Không bắt buộc webhook để tạo QR: máy chủ còn kiểm tra trực tiếp qua API PayOS và đối soát các đơn chưa thanh toán mỗi phút.
- POST `/api/orders/payos/:publicCode/link` chỉ cho chủ đơn. Số tiền lấy từ đơn đã lưu trên máy chủ. Giỏ nhiều gian hàng tạo mã riêng cho từng đơn con.
- GET `/api/orders/payos/:publicCode/status` kiểm tra chủ đơn, mã giao dịch, số tiền và mã liên kết PayOS. Chỉ ghi `PAID` khi PayOS báo đã nhận đủ đúng số tiền. Chuyển hướng trình duyệt không xác nhận thanh toán.
- Ghi giao dịch, thông báo và audit trong cùng transaction có khóa hàng. Webhook trùng và đối soát đồng thời không ghi nhận tiền hai lần.
- QR hết hạn/hủy được tạo lại chỉ khi chưa nhận tiền. QR đã nhận một phần không bị hủy để đổi giá. Nếu mất phản hồi sau khi tạo mã, kiểm tra mã cũ trước khi khôi phục.
- Khách có thể mở lại QR trong **Đơn mua → Thanh toán bằng QR**. Lỗi tạo QR được hiển thị kèm nút thử lại, không tạo lại đơn hàng.

Kiểm thử:

`npm test -- --runTestsByPath src/modules/orders/payos-payment.service.spec.ts src/modules/wallets/wallet-payos.service.spec.ts`

API chính thức: https://payos.vn/docs/api/
