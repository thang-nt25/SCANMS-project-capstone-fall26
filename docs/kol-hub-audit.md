# Rà soát Mạng lưới KOL & Hợp tác — 27/10/2026

Phạm vi: `/merchant/kol-hub`, các công cụ liên quan và luồng chat được nhúng. Rà mã nguồn và kiểm tra trình duyệt với API giả lập; không gửi tin nhắn, duyệt hợp tác hoặc tạo vận đơn trên dữ liệu thật.

## Lỗi xác định và đã sửa

- Danh sách kết nối trộn toàn bộ danh bạ trên sàn. Chỉ giữ người có hợp tác, hội thoại hoặc yêu cầu mẫu; danh bạ toàn sàn vẫn nằm trong Khám phá KOL.
- Yêu cầu duyệt hợp tác của người khác hiện trên hồ sơ đang chọn. Lọc theo ID KOL hiện tại.
- Tab Hiệu suất dùng tổng mặc định bằng 0, lịch sử đơn luôn rỗng, bộ lọc thời gian không thay đổi truy vấn; tỷ lệ 3,8%, 96,2%, lượt nhấp 1.820 và các tầng phễu là số viết sẵn. Thay bằng API riêng, giới hạn theo gian hàng thuộc người đăng nhập và KOL đang chọn, lọc 7/30 ngày, tháng Việt Nam hoặc toàn thời gian. Chưa có lượt nhấp thì không tự suy ra tỷ lệ chuyển đổi.
- Hoa hồng từng được tính doanh thu nhân 10%. Nay lấy bản ghi commission APPROVED/PAID; doanh thu chỉ tính đơn DELIVERED/COMPLETED. Chỉ số được ghi nhãn tương ứng.
- Nút sao chép trong Hiệu suất gọi hàm chép trang gian hàng nhưng ghi là link tiếp thị. Bỏ nút đặt sai nghĩa; chức năng chia sẻ trang gian hàng vẫn ở cuối danh sách. Không tự tạo link gán KOL.
- Hộp deal từng hiển thị toàn bộ KOL và có thể focus vào chat của người khác. Lọc theo người đang chọn, điều hướng đến đúng KOL khi mở chat.
- Ảnh thay thế từng được chọn từ ảnh chân dung có sẵn theo tên/ID. Dùng chữ viết tắt nếu không có ảnh thật hoặc ảnh lỗi.
- API thành viên chỉ lấy tên kênh, thiếu URL nên nút truy cập không có dữ liệu. Bổ sung channelUrl trong truy vấn.
- Không tải được dữ liệu từng bị đổi thành danh sách rỗng. Hiển thị lỗi và nút thử lại, giữ dữ liệu đã tải trước đó.
- Chat khi đổi KOL có thể còn dữ liệu người trước; nay xóa lựa chọn cũ khi đổi đối tượng và hiện lỗi nếu không mở được hội thoại.
- Hội thoại khách hàng cũ lưu ở trường collaborator bị bộ lọc khách hàng bỏ qua. Chuẩn hóa dựa trên role CUSTOMER; loại khỏi danh sách KOL.
- Tìm tên trong danh sách hỗ trợ cả tiếng Việt không dấu.

## Chức năng và mục trùng

| Mục | Kết quả rà soát |
| --- | --- |
| Chọn KOL, bốn tab | Giữ ID người và tab trên URL; kiểm tra mở chat đúng người, tab và màn hình nhỏ bằng trình duyệt |
| Hàng mẫu | Lọc trạng thái, duyệt/từ chối, vận đơn, video, gia hạn và vi phạm có handler/API; không thực hiện thao tác thật |
| Hiệu suất | Có kiểm tra phân quyền gian hàng, ngày đầu tháng Việt Nam, tỷ lệ từ số liệu thật và trạng thái không có lượt nhấp |
| Đơn trong Hiệu suất | Link `/merchant/orders?search=<mã đơn>`; trang đơn có đọc tham số search |
| Hồ sơ và kênh | Mở đúng KOL; đường dẫn dùng URL kênh từ dữ liệu |
| Dấu + và Khám phá KOL | Cùng mở danh bạ. Đây là lối tắt trùng, không phải hai chức năng khác; giữ nguyên vì không gây mất dữ liệu |
| Mời KOL và chia sẻ gian hàng | Hai vai trò khác nhau: gửi lời mời bằng email qua API và chép URL công khai của shop |
| Tìm với AI | Mở chế độ gợi ý riêng; không phải lọc danh sách hội thoại. Chưa đánh giá chất lượng mô hình AI trong phiên này |
| Biểu tượng vương miện | Mời chiến dịch VIP, khác với đính kèm tệp và gửi tin nhắn thường |

## Xác minh và giới hạn

- 39 unit test backend đạt: chat, kiểm tra khách hàng, hiệu suất và giới hạn gian hàng.
- Kiểm tra trình duyệt KOL hub đạt: chat đúng người, không lẫn yêu cầu hợp tác, bộ lọc 7/30 ngày, số hoa hồng thực, đường dẫn đơn, các tab, thu gọn danh sách và không tràn ngang trên mobile.
- Kiểm tra kho nội dung chat đạt: bộ lọc, link, sao chép, phân trang, thử lại, đổi hội thoại, ngày và mobile.
- TypeScript frontend và backend build đạt. TypeScript toàn bộ backend có hai lỗi sẵn trong test sản phẩm không thuộc phần này.
- Bài kiểm tra hồi quy gửi mẫu đã đạt toàn bộ. Bước timeout do bài cũ tìm nút Nộp video, trong khi mẫu sandbox dùng Nộp video kiểm thử. Đã cập nhật bước mở Chi tiết hàng mẫu trên trang quản lý đơn và nhãn nút hiện tại. Kiểm tra thêm việc mở form, nhập tiêu đề/link, lưu đúng endpoint sandbox, cập nhật trạng thái Đã nộp video và không hiện nút gửi review thật trên mẫu sandbox. Sửa điều kiện canSubmitVideo để chỉ hiện nút review thật cho mẫu không phải sandbox.
- Chưa kiểm tra gửi/nhận realtime giữa hai tài khoản thật, tạo vận đơn, duyệt hợp tác hay dịch vụ AI thật. Không thể kết luận dữ liệu khách hàng thật bị xóa chỉ từ ảnh giao diện trống.
