# Kiểm tra form Thêm / Chỉnh sửa sản phẩm — 24/10/2026

Phạm vi: cửa sổ trong `/merchant/products` mà người dùng cung cấp, từ thông tin cơ bản đến biến thể và nút gửi duyệt. Không phải mục Kho nội dung/video.

## Chức năng và đích thao tác

| Mục | Kết quả kiểm tra |
| --- | --- |
| Nút điều hướng 1–7 | Trỏ đúng ID của từng phần và cuộn trong cửa sổ. Đã sửa lỗi chọn tab của hàng tiếp theo khi hàng hiện tại vẫn đang xem. Thanh mục nằm ngoài vùng cuộn, không che form; 7 ô rộng bằng nhau trên máy tính. |
| Danh mục | Chọn từ danh sách hoặc nhập danh mục riêng; quyết định thuộc tính của phân loại. |
| Mã SKU quản lý | Tạo ngẫu nhiên hoặc nhập khi tạo mới. Khi sửa đã khóa vì API sửa không hỗ trợ đổi SKU gốc. SKU con vẫn chỉnh sửa được. |
| Tên và mô tả | Gửi vào thông tin sản phẩm. Tên có thể gợi ý danh mục khi chưa chọn. |
| Ảnh chính, ảnh phụ | Tải qua `/upload/image`; chọn ảnh phụ làm ảnh chính có hoán đổi ảnh cũ; xóa ảnh chỉ bỏ khỏi form. Đã giới hạn 4 ảnh phụ theo backend. |
| Tải nhiều ảnh | Điền ảnh chính nếu còn thiếu, sau đó thêm ảnh phụ. Đã giữ ảnh tải thành công nếu một ảnh phía sau gặp lỗi; loại tệp sai hoặc quá 5 MB và báo giới hạn. |
| Giá bán / giá niêm yết | Giá bán phải lớn hơn 0; giá niêm yết tùy chọn, không được thấp hơn giá bán. Đã sửa việc bỏ trống giá niêm yết khi chỉnh sửa không xóa giá cũ. |
| Tồn kho | Khi có biến thể, hiển thị tổng tồn kho biến thể ở chế độ chỉ đọc. Không yêu cầu nhập một con số khác rồi bị backend ghi đè. |
| EAN-13 và đóng gói | Barcode tùy chọn; nếu nhập sẽ kiểm tra checksum. Cho phép xóa barcode cũ. Số đo đóng gói thật vẫn được kiểm tra để báo phí vận chuyển. |
| Thông số kỹ thuật | Tùy chọn, lưu trong mô tả. Đã sửa đọc lại, cập nhật và xóa thông số cũ; giữ nguyên mô tả khi không có thay đổi để tránh gửi duyệt lại vô cớ. |
| Hoa hồng | 10% cố định theo backend; số tiền hiển thị dựa trên giá sản phẩm chung. Đã đổi nhãn thành “Hoa hồng dự kiến” và “Sau hoa hồng”, tránh hiểu là tiền thực nhận cuối cùng sau mọi phí hoặc mọi đơn biến thể. |
| Open Offer | Bật/tắt `isAffiliateEnabled`, không chuyển sang trang cộng tác. |
| Cấp mẫu cho KOL | Tùy chọn; khi bật cần hạn mức nguyên dương. Đã áp dụng kiểm tra cả lúc sửa. |
| Xuất xứ, thành phần, nhãn mác | Xuất xứ và nhãn mác vẫn cần khi tạo. Thành phần bắt buộc cho mỹ phẩm, trang điểm, chăm sóc cơ thể/tóc và sức khỏe; ngành khác dùng trường chất liệu/thành phần tùy chọn. |
| Link / ảnh chứng từ | Mỗi phần cần ít nhất một link hoặc ảnh khi tạo; link phải HTTP(S), tối đa 10 link và 10 ảnh mỗi phần. Lưu riêng với ảnh bán hàng. |
| Thêm phân loại | Sản phẩm một loại không cần SKU con, dùng giá/ảnh/tồn kho chung. Khi thêm phân loại, lấy ảnh và giá chung làm mặc định, có thể thay riêng; tối đa 100 SKU con. Mỗi phân loại cần ít nhất một thuộc tính phù hợp, không bắt đủ cả ba. |
| Tạo tổ hợp | Tạo tổ hợp từ các thuộc tính đã nhập, tránh trùng. Không bắt điền các thuộc tính không áp dụng; phần tạo nhanh mặc định thu gọn. |
| Lưu phân loại lúc sửa | Đã sửa backend để không tự ẩn SKU vừa được tạo trong cùng lần lưu. Chỉ ẩn SKU không nằm trong kết quả đã lưu. |
| Gửi duyệt | Gọi `POST /products`; sản phẩm mới được lưu `DRAFT`, chưa bán công khai. Đã sửa thông báo để nói rõ đang chờ duyệt. |
| Lưu chỉnh sửa | Gọi duy nhất `PUT /products/:id/editor`. Thông tin, ảnh/chứng từ và SKU được ghi trong cùng Prisma transaction; lỗi SKU sẽ hoàn tác cả phần thông tin. Cache chỉ bị xóa sau khi transaction thành công. Endpoint cũ giữ tương thích cho các chức năng khác. |
| Hủy / X / Escape | Khi rảnh sẽ đóng cửa sổ; trường hợp vào từ dashboard với `returnTo=dashboard` sẽ quay về dashboard. Đã chặn đóng khi đang tải ảnh/lưu và khóa trường nhập trong lúc xử lý để kết quả tải không rơi vào form hoặc SKU khác. Dữ liệu chưa lưu bị bỏ khi đóng lúc rảnh. |

## Lỗi bổ sung đã sửa khi kiểm tra lại

- Tab được chọn theo hàng có đầu khung gần mép trên nhất, khiến tab 3 sáng trong lúc vẫn đang xem phần 1–2. Đã ưu tiên hàng đang đi qua mép trên của vùng cuộn.
- Lỗi barcode/đóng gói, giá hoặc tồn kho có thể nằm ngoài màn hình sau khi bấm gửi từ cuối form. Đã cuộn về thông báo lỗi cho tất cả lỗi lưu.
- Có thể đóng rồi mở lại form hoặc xóa SKU trong lúc ảnh đang tải, khiến phản hồi bất đồng bộ tác động sai chỗ. Đã chặn các thao tác thay đổi trong lúc tải/lưu.
- API sửa chưa chặn ảnh phụ vượt 4, tồn kho thập phân và giá bằng 0 như giao diện. Đã bổ sung kiểm tra DTO, gồm giá SKU khi được cung cấp.

## Mục dư hoặc cần cân nhắc

- Ô tồn kho chung trước đây trùng với tồn kho SKU và bị ghi đè: đã chuyển sang tổng tự tính khi có biến thể.
- Các lần PATCH chính sách mẫu cho từng SKU mỗi lần lưu là dư vì form này không có thao tác sửa chính sách mẫu riêng cho SKU: đã bỏ.
- Giá sản phẩm chung và giá SKU có vai trò khác nhau trong hệ thống; chưa xóa giá chung. Người dùng cần nhập giá SKU đúng vì đây là giá của lựa chọn cụ thể.
- Hai nhóm minh chứng không trùng nhau: một nhóm chứng minh nguồn gốc, một nhóm chứng minh nhãn/công bố.
- Đã bỏ yêu cầu thành phần với ngành hàng không liên quan và bỏ yêu cầu đủ ba thuộc tính cho mọi SKU.
- Đã chuyển barcode thành tùy chọn, vẫn giữ SKU quản lý nội bộ.
- Đã bỏ yêu cầu tạo SKU con cho sản phẩm một loại. Chọn thêm phân loại khi thực sự có lựa chọn khác nhau; có thể xóa hết SKU con để quay lại dùng thông tin chung.
- Giá niêm yết, ảnh phụ, thông số bổ sung, Open Offer và chương trình mẫu là tùy chọn. Có thể thu gọn các phần này, không cần xóa chức năng.

## Hạn chế còn lại

- Luồng lưu của form đã gộp thành transaction. Kiểm tra rollback hiện dùng transaction giả lập trong unit test; chưa thực hiện kiểm tra tích hợp rollback trên PostgreSQL thật trong phiên này.
- Kiểm tra giao diện dùng API giả lập để không tạo sản phẩm/chứng từ thử trong dữ liệu thật; chưa kiểm tra tải thật lên Cloudinary hoặc thao tác duyệt bằng tài khoản quản trị thật.
- Kiểm tra desktop ở 1440 × 1000; có kiểm tra bố cục 390 × 844 khi bật xuất ảnh, chưa bao phủ mọi kích thước di động.

## Xác minh

- 25 kiểm tra backend: biến thể, phân quyền, kiểm duyệt, DTO cập nhật, giao dịch lưu form và đóng gói vận chuyển; gồm sản phẩm điện tử một loại không barcode/thành phần, và hoàn tác khi SKU xung đột.
- 5 kiểm tra tiện ích frontend: barcode tùy chọn/đóng gói và sửa/xóa/giữ nguyên thông số kỹ thuật.
- 1 kịch bản trình duyệt tích hợp: đủ 7 điểm cuộn và chiều rộng tab; tab khi cuộn nửa hàng đầu; thông báo thiếu dữ liệu; chọn danh mục; thêm/xóa link và tải/mở/xóa ảnh chứng từ; ảnh lỗi giữa chừng; chặn đóng/chỉnh SKU khi tải ảnh; giới hạn ảnh; đổi ảnh chính; tạo tổ hợp không trùng, xóa/thêm SKU; tổng tồn kho; lưu chỉnh sửa bằng một request; xóa giá niêm yết; chặn tồn kho lẻ; tạo sản phẩm điện tử một loại không barcode/thành phần/SKU con.
- Kiểm tra TypeScript frontend và backend.
