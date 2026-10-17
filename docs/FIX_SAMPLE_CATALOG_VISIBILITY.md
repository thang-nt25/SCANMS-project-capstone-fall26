# Shop bật xin mẫu nhưng KOL không thấy sản phẩm

## Nguyên nhân đã xác minh ngày 17/10/2026

Đọc dữ liệu thực tế, không cập nhật database:

| SKU Cococ | Cho xin mẫu | Hạn mức / đã duyệt mẫu | Kiểm duyệt sản phẩm | Đang bán |
| --- | --- | --- | --- | --- |
| FASHION-Q8N8C | Có | 2 / 0 | DRAFT | Không |
| FASHION-9POZ8 | Có | 3 / 0 | DRAFT | Không |

KOL chỉ được lấy sản phẩm đã APPROVED, đang hoạt động và thuộc Shop đã xác minh. Bật xin mẫu không thay thế bước kiểm duyệt sản phẩm.

Form sửa có lỗi: khi lưu, thông số đóng gói mặc định được ghép thêm vào mô tả dù người dùng chỉ thay chính sách mẫu. Điều kiện nhận biết tiêu đề thông số cũng không khớp tiêu đề được tạo, nên có thể lặp khối thông số khi lưu tiếp. Backend thấy mô tả thay đổi sẽ đưa sản phẩm đã duyệt về DRAFT và tạm ẩn.

## Đã sửa

- Giữ mô tả khi chỉ chỉnh chính sách mẫu hoặc tồn kho; chỉ ghép thông số khi người dùng thay phần mô tả/thông số/đóng gói.
- Nhận đúng cả hai tiêu đề khối thông số hiện có, tránh chèn lặp.
- KOL lấy danh sách sản phẩm mới từ API, bỏ qua cache; cập nhật khi quay lại tab và định kỳ 30 giây khi đang mở danh sách.
- Có nút **Làm mới sản phẩm**, phân biệt lỗi tải với gian hàng chưa có sản phẩm được duyệt đang bán.
- Bỏ ba sản phẩm Sora Skin giả từng được dùng làm dữ liệu dự phòng khi API lỗi.
- Giữ bước Admin duyệt khi Shop thực sự đổi nội dung. Bật/tắt xin mẫu và đổi hạn mức không yêu cầu duyệt lại.

## Khôi phục hai sản phẩm đã từng được duyệt

Đã tìm thấy lịch sử `PRODUCT_MODERATION_APPROVED` cho cả hai sản phẩm từ ngày 07/10/2026. Theo yêu cầu chủ dự án, đã khôi phục trạng thái APPROVED/đang bán cho đúng hai bản ghi bị ảnh hưởng, giữ thời điểm/người duyệt cũ, giữ nguyên nội dung, tồn kho, cấu hình và hạn mức mẫu. Có sao lưu ngoài repo và ghi audit `PRODUCT_SAMPLE_VISIBILITY_REPAIRED`.

Đã gọi truy vấn sản phẩm thực tế theo quyền KOL: cả hai SKU hiện lại, còn lần lượt 2 và 3 suất mẫu. Không cần Admin duyệt lại chỉ vì thay cấu hình xin mẫu.

1. KOL vào **Hợp tác & Nhận mẫu Shop → Cococ → Sản phẩm**, bấm **Làm mới sản phẩm** hoặc Ctrl+F5.
2. Nút **Xin mẫu thử** mở khi KOL đủ điều kiện, còn suất mẫu và không có yêu cầu cùng sản phẩm đang xử lý.
3. Tab **Hàng mẫu** chứa các yêu cầu đã gửi, không phải toàn bộ sản phẩm Shop vừa bật cho xin mẫu.

Script khôi phục `backend/scripts/repair-cococ-sample-visibility.cjs` chỉ dành cho hai SKU này; đã sửa một lần thì từ chối chạy lại để bỏ qua một lần duyệt mới về sau.

## Kiểm tra

- Backend: 54 bài, 4 bộ kiểm tra sản phẩm/mẫu đạt. Bao gồm chỉ bật cấp mẫu giữ trạng thái duyệt, thay mô tả vẫn cần duyệt lại và sản phẩm nháp không lọt sang KOL.
- Chrome fixture: lưu chỉ thay cấp mẫu với mô tả thường và mô tả có khối thông số; giữ nội dung/APPROVED; KOL nhận chính sách mới khi focus; lỗi API không hiện sản phẩm giả. Đạt.
- Kiểm tra giao diện SLA hàng mẫu vẫn đạt.
- Frontend build thành công; còn cảnh báo kích thước một số bundle.

Kiểm tra trình duyệt dùng API fixture, không lưu thay đổi sản phẩm thật hoặc duyệt sản phẩm thay Admin.
