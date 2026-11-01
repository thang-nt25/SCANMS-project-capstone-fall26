# Trả lời trích dẫn trong chat

Đã chuẩn bị mã cho tính năng trả lời một tin cụ thể ở trang ChatBox (Shop/khách/KOL) và khung chat nổi phía khách.

## Thao tác

- Bấm vào nội dung tin nhắn hoặc nút **Trả lời**. Các nút/liên kết bên trong thẻ sản phẩm, voucher và video tiếp tục làm đúng chức năng riêng.
- Ô soạn hiển thị tên người gửi và phần trích dẫn. Bấm **Hủy trả lời** để bỏ trích dẫn mà giữ nội dung đang soạn.
- Gửi tin: phía nhận thấy trích dẫn cùng câu trả lời. Trang đầy đủ hỗ trợ trích dẫn khi gửi văn bản, sản phẩm, voucher hoặc tệp; chat nổi hỗ trợ văn bản và tệp.
- Bấm trích dẫn trong tin đã gửi để cuộn và đánh dấu tin gốc. Nếu tin gốc nằm ngoài lịch sử đã tải, mở cửa sổ xem tin gốc từ API có kiểm tra quyền.
- Bản nháp trích dẫn tách theo người dùng và hội thoại; gửi thất bại giữ lại bản nháp và mã gửi để thử lại.

Tham khảo tương tác: [Meta — Reply to Messages in Inbox](https://www.facebook.com/business/help/27148728838061242).

## Lưu trữ và giới hạn truy cập

`chat_messages.reply_to_id` là liên kết tùy chọn tới tin gốc. Server tra tin gốc bằng ID trong cùng hội thoại, không nhận bản trích dẫn do client tự cung cấp. Chặn ID không hợp lệ, tin khác hội thoại và việc trích dẫn thẻ hoa hồng nội bộ vào hội thoại khách hàng.

Tin gốc được trả về một cấp cùng tên người gửi và thông tin tệp; không tải cả chuỗi trả lời đệ quy. Xóa tin gốc đặt liên kết thành `NULL`, không xóa câu trả lời.

## Trạng thái triển khai

**Chưa áp dụng lên Supabase.** Kiểm tra migration cho thấy 66 migration trước đã được áp dụng, chỉ migration mới sau đây đang chờ:

`backend/prisma/migrations/20261024140000_chat_message_replies/migration.sql`

Migration chỉ thêm một cột UUID nullable, chỉ mục và khóa ngoại tự liên kết; không cập nhật hoặc xóa nội dung tin. DDL cần khóa bảng trong lúc thực thi nên vẫn là một thay đổi cơ sở dữ liệu dùng chung cần được duyệt.

Phê duyệt tự động đã từ chối `prisma migrate deploy` vì yêu cầu triển khai lên cơ sở dữ liệu Supabase dùng chung chưa được cho phép rõ ràng. Không thực hiện bằng lệnh khác để vượt qua quyết định đó.

Để chat hiện có tiếp tục hoạt động, backend có `/chat/capabilities`: chỉ chọn các trường reply sau khi phát hiện cột đã tồn tại. Frontend ẩn nút mới khi server chưa sẵn sàng. Sau khi migration được duyệt/applied, kiểm tra schema được làm mới tối đa sau 30 giây; tải lại trang để hiện nút.

## Kiểm chứng

- 82 kiểm thử backend của chat, gồm 14 trường hợp mới về reply và khả năng hoạt động khi migration chưa áp dụng.
- 18 kiểm thử bổ sung về chiến dịch/deal đạt sau khi chuyển các lệnh ghi tin tự động sang chọn rõ trường hiện có, bảo đảm chúng không yêu cầu cột mới trong lúc migration còn chờ.
- 8 kiểm thử frontend đạt, gồm 3 kịch bản trình duyệt tổng hợp và các kiểm thử logic URL/voucher.
- Kiểm thử trình duyệt giả lập hai tài khoản trong hai phiên riêng: Shop trả lời thẻ sản phẩm; khách thấy trích dẫn, trả lời lại và gửi từ khung chat nổi; kiểm tra hủy chọn, bản nháp từng hội thoại, thử gửi lại cùng ID, tải lại lịch sử, mở tin gốc chưa tải và trạng thái tính năng chưa được bật.
- Prisma schema hợp lệ; TypeScript mã chạy backend và frontend đạt.
- Không gửi tin đến khách thật, không sửa dữ liệu Supabase trong các kiểm thử.

Ảnh component kiểm thử ở `artifacts/chat-replies/shop.png`, `customer-mobile.png`, `floating.png`.
