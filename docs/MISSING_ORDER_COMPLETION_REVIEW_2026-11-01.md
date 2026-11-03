# Rà soát ngày hoàn tất đơn cũ — 01/11/2026

Đã kiểm tra chỉ đọc toàn bộ 100 đơn COMPLETED thiếu completedAt của Sora: 17 đơn Yến Nhi, 31 đơn Lan Hương và 52 đơn Thảo Nhi.

## Bằng chứng tìm được

- Không có AuditLog liên kết ID hoặc mã của các đơn này.
- Không có thông báo liên kết ID hoặc mã đơn lưu dấu mốc hoàn tất.
- Không có bản ghi GHN đối chiếu được với các đơn.
- rawPayload không có dữ liệu; sourceUpdatedAt rỗng.
- Có ngày tạo đơn và ngày duyệt hoa hồng. Đây là các sự kiện khác ngày hoàn tất; không được tự coi là completedAt.
- Bản sao đối soát ví cục bộ lưu trạng thái COMPLETED và thời điểm commission, không lưu ngày hoàn tất gốc để khôi phục.

Không thay ngày, trạng thái, tiền đơn, chính sách hoặc số dư trong lần rà soát này. Script kiểm tra: artifacts/flow5-audit/trace-missing-completion.cjs. Kết quả theo từng mã đơn: artifacts/flow5-audit/missing-completion-evidence.json.

## Hướng xử lý

### Truy lại lúc đặt mua

Đã mở rộng truy vấn tới 202 đơn thuộc ba nhóm mã ORD-YENNHISKIN, ORD-LANHUONG10 và ORD-THAONHI16, gồm cả DELIVERED và COMPLETED. Có ngày tạo đơn và liên kết tài khoản khách ở cả 202 đơn, nhưng không có payment_transactions; cả 202 đơn đều thiếu deliveredAt/completedAt. Không có giao dịch thanh toán trong bảng này không tự chứng minh đơn chưa thanh toán (ví dụ COD), nhưng không cung cấp được bằng chứng thanh toán để khôi phục lịch sử.

Riêng Yến Nhi có 35 đơn; 17 đơn trạng thái COMPLETED đều có createdAt thuộc tháng 10/2026 theo giờ Việt Nam. Đây chỉ là tháng đặt, chưa chứng minh tháng hoàn tất.

Phát hiện bổ sung: ORD-YENNHISKIN-0032 tạo lúc 11:26:12 ngày 30/10/2026, nhưng approvedAt hoa hồng là 08:52:41 cùng ngày; ORD-YENNHISKIN-0034 tạo lúc 14:28:31 ngày 31/10/2026, nhưng approvedAt là 04:04:41 cùng ngày. Vì ngày duyệt hoa hồng còn trước ngày tạo đơn, không nên dùng approvedAt làm ngày hoàn tất quy ước như đề xuất trước khi rà soát chi tiết.

71/202 đơn có finalAmount khác phép đối chiếu subtotalAmount - discountAmount + shippingFee. Cần kiểm tra quy ước dữ liệu giảm giá/nguồn nhập trước khi kết luận đây là khoản thu đúng. Không sửa giá theo catalog hiện tại vì đơn cũ phải giữ giá giao dịch tại thời điểm mua.

Xuất dữ liệu chỉ đọc tại artifacts/flow5-audit/original-purchases.csv và original-purchases.json; không chứa mật khẩu, token hay thông tin liên hệ khách hàng. Chưa thay ngày hoặc số tiền của đơn.

1. Nếu có bản xuất/backup nguồn hoặc xác nhận giao nhận: nhập ngày hoàn tất có căn cứ, lưu AuditLog và tính lại các phiếu PENDING bị ảnh hưởng trước khi duyệt.
2. Nếu đây là bộ dữ liệu demo và không còn ngày gốc: cần chốt một quy tắc dựng lại lịch sử kiểm thử. Có thể chọn ngày duyệt hoa hồng làm ngày quy ước, nhưng phải đánh dấu reconstructed/demo, sao lưu trước sửa và không mô tả là khôi phục lịch sử giao dịch thật.
3. Không tự tạo chính sách tháng cũ hoặc ép thưởng 2 triệu. Sau khi phân kỳ, thưởng vẫn phụ thuộc chính sách có hiệu lực và doanh thu sạch thực tế.

Giao diện đã đổi nhãn nút từ “Đã chốt đối soát” thành “Chờ đối soát ngày hoàn tất” khi còn thiếu dữ liệu, kể cả có phiếu PENDING cũ. Đây chỉ là sửa thông báo, không thay thế việc khôi phục ngày.

## Hiển thị tách biệt dữ liệu đã ghi nhận

API tiến độ trả thêm unassignedRecordedValue và unassignedOrderDetails (mã đơn, ngày đặt, giá trị đang lưu). Giá trị tính bằng Decimal từ finalAmount của các đơn COMPLETED chưa có completedAt, trên toàn bộ lịch sử, không gán vào tháng đang chọn và không cộng vào validRevenue hoặc thưởng.

Bảng đội ngũ hiển thị số đơn/doanh số đủ dữ liệu trong kỳ và dòng phụ số đơn/giá trị chưa phân kỳ; chi tiết KOC và danh sách đối soát thể hiện cùng dữ liệu. Thông tin ngày đặt được định dạng giờ Việt Nam. Nút quyết toán vẫn bị chặn khi thiếu ngày hoàn tất.

Kiểm tra: backend build và frontend TypeScript đạt; 9 suites/88 unit tests commission-rules đạt, gồm kiểm tra tách giá trị đơn lịch sử bằng Decimal và không cộng vào doanh số kỳ. Backend đã khởi động lại bản mới. Chưa kiểm tra trực quan bằng trình duyệt trong lần sửa này.
