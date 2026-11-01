# Dựng lại kỳ của đơn demo — 01/11/2026

Người dùng đồng ý sửa sau khi được thông báo cần dựng lại lịch sử demo vì không còn ngày hoàn tất gốc. Đây là dữ liệu kiểm thử được quy ước, không phải khôi phục chứng từ giao nhận thật.

## Phạm vi và quy tắc

- Chỉ 100 đơn Sora thuộc các nhóm ORD-YENNHISKIN, ORD-LANHUONG10 và ORD-THAONHI16, trạng thái COMPLETED, thiếu completedAt.
- deliveredAt = createdAt + 12 giờ; completedAt = createdAt + 24 giờ. Nếu vượt thời điểm sửa thì chặn ở thời điểm sửa, bảo đảm createdAt ≤ deliveredAt ≤ completedAt ≤ hiện tại.
- Mỗi đơn có rawPayload.demoHistoryReconstruction chứa event ID, syntheticHistory, quy tắc và lý do.
- Không sửa tiền đơn, sản phẩm, attribution, trạng thái commission hoặc số dư ví; không phát sinh thanh toán/ngân hàng/email.
- Hủy một phiếu nháp PENDING 0đ tháng 10 của Yến Nhi được tính khi chưa có dữ liệu hoàn tất. Toàn bộ nội dung phiếu được giữ trong backup và AuditLog để tra lại. Không đụng phiếu đã duyệt/đã chi.

## Kết quả backend tháng 10/2026

| KOC | Đơn đủ điều kiện | Doanh số sạch theo engine | Thưởng |
|---|---:|---:|---:|
| Lê Hoàng Yến Nhi | 16 | 12.887.956đ | 0đ |
| Nguyễn Lan Hương | 30 | 35.269.449đ | 0đ |
| Hoàng Thảo Nhi | 38 | 51.871.862đ | 0đ |

Không còn đơn COMPLETED thiếu ngày trong 100 đơn này. Thưởng 0 vì không có chính sách mốc áp dụng; không tạo chính sách ngược kỳ hoặc ép thành 2 triệu. Vũ Thanh Huyền/Đặng Thùy Dung vẫn 0 do không có đơn hợp lệ của tháng.

13 đơn Thảo Nhi được phân tháng 9; tháng 11 có thêm một đơn của mỗi KOC trên. Quy tắc không ép tất cả vào tháng 10.

## Bằng chứng và kiểm tra

- Audit event: 84deca46-0a84-4697-a614-508df311ec50, action DEMO_ORDER_PERIOD_RECONSTRUCTION.
- Backup: artifacts/flow5-audit/demo-periods-before-20261101.json.
- Kết quả: artifacts/flow5-audit/demo-periods-result-20261101.json.
- Kiểm tra: artifacts/flow5-audit/demo-periods-verified-20261101.json.
- Đã dùng hàm getTeamProgress thật trong transaction READ ONLY: doanh số như bảng; unassignedCompletedOrdersCount=0; xác minh cả 100 finalAmount không đổi so với backup.
- Hai thành viên khác được thu thập bởi đường tìm đội ngũ bị engine từ chối vì không có quan hệ/dữ liệu liên kết; không ảnh hưởng kết quả ba KOC trên, không coi là toàn bộ báo cáo đã được nghiệm thu E2E.
- Script sửa có kiểm tra event ID để chạy lại không ghi đè hoặc cộng trùng.

Trên web: chọn tháng 10/2026, chờ tối đa 30 giây cache tiến độ rồi tải lại; bấm hàng Yến Nhi để xem chi tiết đúng KOC. Nhãn không có chính sách được đổi thành “Chưa có mốc áp dụng”.

## Bổ sung chính sách demo tháng 10 để kiểm thử bước 5.2

Sau yêu cầu tiếp theo của người dùng, đã bổ sung đúng một mốc Sora: 50.000.000đ → thưởng cố định 2.000.000đ, phần trăm 0, hiệu lực 01–31/10/2026 giờ Việt Nam. Tên/description ghi rõ demo; createdAt/updatedAt được dựng ở đầu kỳ để engine lịch sử nhận được policy. Đây không phải bằng chứng chính sách đã được ban hành thực tế từ tháng 10.

- Rule ID: 7cbda998-40cd-458c-98ad-90d8ac1081ab.
- Audit event: 8411d983-8837-467d-a59c-d4aefec8df45, action DEMO_HISTORICAL_BONUS_POLICY_SETUP; giữ thời điểm thực tế thêm fixture và quy tắc dựng lịch sử.
- Backup: artifacts/flow5-audit/october-demo-rule-before.json.
- Script: artifacts/flow5-audit/prepare-october-demo-bonus-rule.cjs; không ghi đè policy hoặc settlement đã có, chống chạy trùng bằng event ID.
- getTeamProgress thật trong transaction READ ONLY đã trả Thảo Nhi: 38 đơn, 51.871.862đ, thưởng 2.000.000đ; các KOC dưới ngưỡng vẫn 0. Tổng thưởng dự kiến 2.000.000đ, settledCount=0.
- Không tự chốt, duyệt hoặc cộng ví. Người dùng thực hiện các bước này trên web; scheduler các kỳ đóng vẫn hoạt động theo cấu hình hiện có.
- Policy hết hiệu lực tháng 10, không tự tạo chính sách thưởng cho tháng 11.

Các kết quả “thưởng 0 vì thiếu chính sách” ở phần trên mô tả thời điểm trước khi bổ sung fixture này.
