# Nạp ví qua payOS

- Cấu hình `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` chỉ trong backend. `PAYOS_STOREFRONT_URL` là origin frontend (HTTPS khi production).
- POST `/api/wallets/top-up-payos` nhận số tiền nguyên VND từ 10.000 đến 50.000.000. Máy chủ lưu chủ sở hữu và số tiền trước khi tạo link payOS, trả QR và thông tin ngân hàng từ phản hồi đã được SDK kiểm tra chữ ký.
- GET `/api/wallets/top-up-payos/:id/status` kiểm tra chủ sở hữu trước khi tra payOS. Không dùng tham số `status`, `cancel` hay `code` ở URL trình duyệt để cộng tiền.
- POST `/api/wallets/top-up-payos/:id/cancel` dùng cho nút “Đổi số tiền”: xác minh chủ sở hữu, kiểm tra payOS trước, rồi hủy link chưa nhận tiền. Chỉ quay lại form khi payOS xác nhận trạng thái kết thúc. Nếu đã thanh toán thì cập nhật ví; nếu đã nhận một phần hoặc đang xử lý thì giữ giao dịch để hoàn tất trước.
- Ví chỉ được cộng khi API payOS trả `PAID`, đúng orderCode/paymentLinkId/số tiền, `amountPaid` bằng số tiền yêu cầu và `amountRemaining` bằng 0. Sổ cái `TOPUP_PAYOS` và trạng thái PAID được ghi trong cùng transaction, khóa hàng PostgreSQL chống cộng trùng.
- Frontend kiểm tra mỗi 8 giây khi đang mở và khi quay lại cửa sổ. Backend đối soát các yêu cầu đang chờ mỗi phút, kể cả khi người dùng đóng trang. Vì vậy nạp ví hoạt động tại localhost khi chưa có webhook công khai.
- Có thể đăng ký webhook HTTPS hiện có `/api/orders/payos/webhook` trong kênh payOS để nhận nhanh hơn. Endpoint kiểm tra chữ ký bằng SDK rồi định tuyến giao dịch nạp ví trước khi xử lý thanh toán đơn hàng. Không thay đổi đăng ký webhook từ ứng dụng nếu kênh đang dùng cho checkout.
- Yêu cầu thiếu tiền chưa được cộng; có thể chuyển tiếp số tiền còn thiếu theo cùng nội dung. Sai hoặc thừa số tiền cần đối soát, không tự cộng số dư ngoài yêu cầu.
- QR được render nội bộ từ payload payOS bằng `qrcode`, không gửi QR/nội dung sang dịch vụ tạo ảnh bên ngoài. Khóa payOS không trả về frontend.

Tài liệu: https://payos.vn/docs/api/ và https://payos.vn/docs/sdks/back-end/node/.

## Kiểm tra

`npm test -- --runTestsByPath src/modules/wallets/wallet-payos.service.spec.ts src/modules/orders/payos-payment.service.spec.ts src/modules/wallets/wallets.service.spec.ts`

Kiểm tra kết nối thật ngày 09/10/2026: tạo mã 10.000 VND, nhận QR và tài khoản từ payOS, kiểm tra PENDING không cộng ví, hủy link thử nghiệm. Kiểm tra 10 lần xác nhận đồng thời trên tài khoản riêng với phản hồi payOS giả lập: chỉ một bút toán cộng được ghi. Tài khoản thử nghiệm đã được vô hiệu hóa và số dư thử nghiệm đã được đảo về 0 bằng bút toán REVERSAL; lịch sử được giữ nguyên vì sổ cái append-only.
