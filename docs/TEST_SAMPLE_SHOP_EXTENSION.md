# Gia hạn video mẫu từ gian hàng

Shop có nút **Gia hạn nộp video** tại:

- Mạng lưới KOL & Hợp tác → Hàng mẫu.
- Quản lý Đơn hàng → Hàng mẫu.

Chỉ hiện khi mẫu đang RECEIVED, REVISION_REQUIRED hoặc OVERDUE và đã có hạn video. Chọn thời điểm mới muộn hơn hạn hiện tại và bây giờ, nhập lý do rồi xác nhận. API PATCH `/sample-requests/:id/extend-deadline` yêu cầu vai trò Shop và kiểm tra sở hữu gian hàng.

Sau khi lưu: mẫu quay về chờ video hoặc chờ sửa; đặt lại lịch nhắc tương ứng, bỏ cờ quá hạn hiện tại, giữ lịch sử cũ, ghi hạn cũ/mới cùng lý do và gửi thông báo cho KOL. Quyền xin mẫu đã bị Admin khóa vẫn giữ nguyên.

Nếu báo cáo đang chờ xét, Shop phải đề nghị Admin xử lý; không tự gia hạn vượt qua báo cáo. Miễn nghĩa vụ, quyết định khóa và mở khóa vẫn thuộc Admin.

Trang Quản lý Đơn hàng → Hàng mẫu cũng có **Báo cáo quá hạn**, dùng cùng API và điều kiện với màn hình Mạng lưới KOL.

Sandbox không được dùng nút gia hạn thật: mẫu chỉ có vận đơn TEST và trạng thái thật APPROVED/SHIPPED không đủ điều kiện. Các nút nhận hàng, hết hạn và nộp video thử tiếp tục tách biệt.

Khi thử trên dữ liệu thật, chọn mẫu đã nhận, thống nhất hạn với KOL rồi gửi gia hạn có lý do. Đơn hàng thử sandbox không làm thay đổi hạn video thật.
