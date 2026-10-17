# Kiểm thử nhận mẫu và mở nộp video

## Hủy vận đơn thật đã tạo nhầm

`GYMUARMG` xuất hiện tại `khachhang.ghn.vn`, trạng thái Đang lấy hàng: đây là yêu cầu vận chuyển thật.

1. Trên GHN, đóng Nhật ký đơn hàng nếu đang mở.
2. Tại dòng GYMUARMG, bấm **⋯ → Hủy đơn**.
3. Chọn lý do tạo nhầm/không có nhu cầu phù hợp với thực tế, xác nhận theo hộp thoại GHN.
4. Tải lại, kiểm tra chính đơn đó đã **Hủy**. Nếu không hủy được hoặc bưu tá gọi, báo rõ cần hủy và liên hệ hỗ trợ GHN.

Hủy trên GHN không đồng nghĩa đã tự xóa yêu cầu mẫu trong SCANMS. Không bấm tạo lại vận đơn nếu chỉ muốn thử giao diện.

## Chạy thử ngay, không tạo đơn GHN

Chỉ có trên frontend chạy `npm run dev`; không xuất hiện trong build Production.

1. Shop mở **Mạng lưới KOL & Hợp tác → chọn KOL → Hàng mẫu**. Khu vực **Kiểm thử hàng mẫu** nằm đầu tab, cuộn lên nếu chưa thấy.
   Hoặc **Quản lý Đơn hàng → Hàng mẫu KOL**.
2. Mở **Kiểm thử hàng mẫu → Tạo mẫu kiểm thử**. Đây là sản phẩm thử riêng, không phải bản sao hay thay đổi của GYMUARMG.
3. Bấm **Chuyển mốc thử: Bưu tá đã lấy hàng tại kho Shop**.
4. Bấm tiếp **Nhập kho trung chuyển**, rồi **Shipper đang giao**. Tên/SĐT shipper hiển thị là dữ liệu mẫu; chưa có ô nộp video, chưa đếm 14 ngày.
5. Bấm **Chuyển mốc thử: Giao hàng thành công**. Khu vực thử hiển thị **Đã nhận · chờ video**, thời gian nhận và hạn bằng thời gian nhận cộng đúng 14 ngày. Form nộp link thử mở.
6. Nhập `https://example.test/review`, bấm **Nộp Link Video Review thử**. Hiện **Đã lưu video kiểm thử**.
7. Muốn xem cùng mẫu thử bên KOL: đổi vai trò/đăng nhập KOL trên cùng trình duyệt, mở **Hợp tác & Nhận mẫu Shop → chọn Shop → Hàng mẫu → Kiểm thử hàng mẫu**. Dùng cùng địa chỉ web (localhost và 127.0.0.1 lưu dữ liệu riêng).
8. Tải lại không thay đổi giờ nhận/hạn. Shop bấm **Tạo lại mẫu kiểm thử** để chạy lại từ đầu, hoặc **Xóa dữ liệu kiểm thử** để dọn.

Mẫu thử được chia sẻ cục bộ giữa các màn hình/vai trò của trình duyệt, không gắn với một KOL/Shop thật; không đồng bộ qua máy khác hay chế độ ẩn danh. Link thử chỉ lưu trong trình duyệt, không gọi API nộp video, không tạo hoa hồng/phí ship, không dùng token GHN.

## Giới hạn kiểm thử

Khu vực này kiểm tra giao diện/hành vi demo bằng dữ liệu độc lập, không chứng minh GHN đã giao hàng hoặc webhook hoạt động. Luồng đơn thật vẫn chỉ nhận RECEIVED từ bằng chứng GHN hợp lệ. Bộ test backend `sample-delivery-sla.spec.ts` và `samples.service.spec.ts` kiểm tra điều kiện nhận hàng, SLA và quyền nộp video thật; không có API giả lập Production.
