# Tin nhắn Mobile

Áp dụng cho các vai trò được backend cho phép tham gia hội thoại; không mở rộng quyền xem tin nhắn giữa các tài khoản.

- Bên dưới mỗi tin có **Trả lời**: mở phần trích dẫn trên ô soạn, có thể hủy trước khi gửi. Tin gửi lưu `replyToId`; bấm trích dẫn để xem tin gốc.
- **Cảm xúc** hoặc nhấn giữ tin mở bảng 👍 ❤️ 😂 😮 😢 🙏. Mỗi người chọn một cảm xúc trên mỗi tin, chọn lại để gỡ hoặc chọn khác để thay. Các thiết bị nhận sự kiện để tải lại dữ liệu.
- Icon mặt cười cạnh ô soạn chèn emoji vào nội dung; không tự gửi.
- Dấu cộng mở Ảnh/Video và Tài liệu. Phân biệt đang chọn tệp với đang tải lên; hủy chọn không gửi tin. Có thể bỏ tệp đã đính kèm trước khi gửi.
- Giữ thao tác sao chép, xem ảnh, trạng thái gửi/đọc và đang nhập.

## Triển khai

Backend cần migration `20261105090000_chat_message_reactions` trước khi bật cảm xúc trên môi trường khác. Triển khai migration bằng quy trình Prisma của môi trường đó. `/api/chat/capabilities` trả `messageReactions`; Mobile chỉ bật thao tác nếu backend hỗ trợ. SQL migration tạo bảng và index theo cách có thể chạy lại, không đổi nội dung tin cũ.

## Kiểm thử

1. Hai tài khoản có quyền mở cùng hội thoại; gửi một tin và trả lời có trích dẫn. Tải lại phải còn nội dung và liên kết tin gốc.
2. Hai người thả cùng cảm xúc: số lượng 2. Một người đổi hoặc gỡ: chỉ cảm xúc của người đó thay đổi, không tăng trùng khi gửi lại cùng yêu cầu.
3. Tài khoản ngoài hội thoại không được đọc tin hoặc đổi cảm xúc. Tin thuộc hội thoại khác không được dùng làm mục tiêu.
4. Chọn tệp rồi hủy, chọn tệp hợp lệ rồi bỏ bản nháp, chọn tệp không hỗ trợ: không kẹt nút và không tự gửi.
5. Mở bàn phím/emoji, kiểm tra ô soạn và nút gửi không bị che.

Kiểm tra tự động bao gồm quyền truy cập, đầu vào, dữ liệu hợp đồng; kiểm tra lưu cảm xúc trong transaction được rollback. Chưa thay thế kiểm thử gửi/nhận thực tế bằng hai thiết bị.
