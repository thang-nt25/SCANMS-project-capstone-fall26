# Kịch bản trình bày và nghiệm thu của Thịnh

Dùng profile trình duyệt riêng cho Shop, KOC, System Manager và System Admin. Web localhost:5173, API localhost:3000/api, DB theo backend/.env nhóm. Giữ mật khẩu Shop hiện tại; không đổi để khớp autofill.

| Bước | Thao tác | Bằng chứng |
|---|---|---|
| 1 | Shop tạo sản phẩm sáu khối, nhập ngành sai qua request | Ngành theo Store; BE chặn sai ngành |
| 2 | Thử trùng SKU/barcode và tên đồng nghĩa | Guard định danh; semantic warning có phương pháp rõ |
| 3 | Reviewer duyệt sản phẩm và cấu hình MAP tại /admin/pricing | Trạng thái kiểm duyệt, giá sàn từng SKU, audit |
| 4 | Shop đề xuất khuyến mãi tại /merchant/pricing | Giá/lịch/budget/lý do; chưa tự chạy trước khi duyệt |
| 5 | Reviewer duyệt; theo dõi giá bắt đầu/kết thúc | Giá áp dụng/khôi phục đúng SKU; checkout kiểm sàn và budget |
| 6 | Shop mở drawer AI, đổi lọc và xem KOC dưới/từ5 đơn | Dữ liệu thực, cold-start/performance; không tự đổi tier |
| 7 | KOC xin hợp tác; Shop mời KOC; nhận/từ chối | Hai chiều đúng quyền; CAS không ghi ngược trạng thái |
| 8 | Shop gửi VIP16% hoặc KOC đề xuất; chọn nhóm sản phẩm | Bên nhận ký; tài nguyên đúng scope; KPI doanh thu |
| 9 | Gửi VIP20%, đối tác chấp thuận | Chờ Admin, chưa cấp tài nguyên/chưa bắt đầu KPI |
| 10 | System Manager thử duyệt ngoại lệ; Admin độc lập quyết định | Manager403; Admin có lý do, cấp đúng một lần |
| 11 | Chọn Store-wide rồi thêm sản phẩm đã duyệt mới | Quyền VIP áp dụng sản phẩm mới qua resolver |
| 12 | Xem tiến độ, đơn mới và Media Hub | Net goods đúng attribution; max rate+Live trần25; ZIP có nội dung |

Các điểm kỹ thuật để giải thích:
- Khóa Store/KOC + transaction giải quyết cấp VIP đồng thời và rollback lỗi coupon.
- Khóa dòng sản phẩm + conditional UPDATE bảo vệ ngân sách khuyến mãi.
- SKU/barcode dùng guard độc lập với cảnh báo tên; semantic cosine không phải xác suất.
- Best-benefit chỉ áp dụng đơn mới; giữ snapshot để không sửa quyền lợi đơn cũ.
- Đối soát14 ngày trước xử lý thiếu KPI; KPI cũ targetRevenue null vẫn tương thích.
- GET/API/DB là nguồn trạng thái, Socket.IO chỉ chuyển sự kiện sau commit.
- Admin duyệt ngoại lệ độc lập, Shop không tự đặt MAP; KOC không tự ký đề nghị mình gửi.

Số test và giới hạn bằng chứng ở [verification](verification.md). Checklist UAT ở [acceptance-tests](acceptance-tests.md). Không dùng browser fixture hoặc đọc trang Admin để ký thay toàn bộ UAT DB nhóm.
