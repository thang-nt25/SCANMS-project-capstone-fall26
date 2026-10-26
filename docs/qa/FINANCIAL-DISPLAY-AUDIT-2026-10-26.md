# Sửa dấu giao dịch và rà soát hiển thị dòng tiền — 26/10/2026

## Đã sửa theo yêu cầu

Dashboard KOL trước đây suy đoán dấu cộng từ bucket AVAILABLE hoặc tên giao dịch chứa COMMISSION. Vì vậy lệnh rút tiền và dòng trừ ví chờ khi duyệt hoa hồng có thể bị trình bày như tiền cộng.

Hiện hướng tiền được lấy duy nhất từ `entry.amount` có dấu:

| Giá trị sổ cái | Hiển thị |
| --- | --- |
| -1000000.00 | -1.000.000 ₫ |
| -25000.00 | -25.000 ₫ |
| 25000.00 | +25.000 ₫ |
| 0.00 hoặc -0.00 | 0 ₫ |
| Dữ liệu không hợp lệ | —, không giả làm số 0 |

Định dạng số tiền chuỗi bằng phần nguyên BigInt và phần thập phân, không dùng Math.abs(Number(...)) để đoán dấu hay làm mất chính xác của số tiền chuỗi lớn. Không thay bất cứ số dư, giao dịch, thuế hay công thức ghi sổ backend nào.

## Kiểm chứng

- 20 test mới cho dấu âm/dương/0, phần lẻ, số tiền chuỗi lớn và dữ liệu sai.
- Toàn bộ frontend mặc định: 186 test đạt, 50 browser test opt-in được bỏ qua.
- Chạy riêng 2 test Chrome: đạt; bài dashboard kiểm tra trực tiếp 4 dòng giao dịch với cả bucket AVAILABLE và PENDING, sau đó thử lại nguồn ví bị lỗi.
- 52 test backend ví/sổ cái/thuế/rút tiền/lọc đơn: đạt. Backend không có thay đổi trong đợt này.
- Frontend build production thành công; còn cảnh báo chunk lớn, không phải lỗi build.
- Các kiểm thử dùng mock/fixture, không tạo hay duyệt giao dịch thật trên database chung.

## Ba lỗi khác đã xác nhận — CHƯA SỬA, CHỜ DUYỆT

### 1. Nút “Sau” có thể luôn bị khóa ở trang đầu

Vị trí: `frontend/src/pages/merchant/PayoutApprovalPage.tsx`, phần thanh phân trang.

API trả 10 dòng mỗi trang và có tổng `history.total`, nhưng nút Sau so `page * 10` với `displayedRequests.length` (chỉ số dòng trên trang). Giả lập 25 lệnh, trang 1 có 10 dòng: biểu thức trả `disabled=true`, trong khi phải cho sang trang 2. Hậu quả: Shop không xem được các yêu cầu cũ hơn để xử lý.

Hướng sửa đề xuất: phân trang theo `history.total/history.limit`, giữ đúng trạng thái loading, reset trang khi đổi lọc và cập nhật tổng hiển thị. Cần kiểm thử ít nhất 25 lệnh và trang cuối sau thao tác duyệt/từ chối.

### 2. Bấm thẻ KPI làm bỏ qua từ khóa tìm kiếm; tìm kiếm chỉ có dữ liệu trang hiện tại

Vị trí: cùng file, callback `displayedRequests`; API list trong `frontend/src/services/payout.service.ts` chỉ gửi page/limit/status.

Callback trả kết quả ngay khi gặp thẻ PENDING/APPROVED/TAX/KYC, trước khi kiểm tra từ khóa. Với hai lệnh PENDING của “Khach A” và “Khach B”, chọn thẻ Chờ duyệt rồi tìm “Khach A” vẫn nhận cả hai. Ngoài ra, tìm kiếm hiện tại không thể tìm lệnh nằm ở trang API khác.

Hướng sửa đề xuất: kết hợp tất cả điều kiện; chuyển tìm kiếm và lọc cần thiết xuống backend trước phân trang để trả đúng tổng, giữ giới hạn theo Shop sở hữu.

### 3. KPI “Đã duyệt hôm nay” không lọc ngày, tổng KPI chỉ tính trên trang

Vị trí: cùng file, `approvedRequests`, `pendingRequests`, các tổng và tiêu đề KPI.

Danh sách approved chỉ kiểm tra status, không kiểm tra processedAt. Giả lập lệnh approved ngày 01/01/2020 vẫn bị tính là “hôm nay”. Các tổng cũng dùng `history.requests` đã phân trang nên có thể không đại diện toàn Shop và đổi theo trang/lọc.

Hướng sửa đề xuất: backend cung cấp tổng hợp đúng phạm vi Shop và mốc ngày UTC+7, phân biệt tổng toàn Shop với bảng đang lọc; giao diện sử dụng kết quả tổng hợp thay vì cộng 10 dòng đang xem.

## Phạm vi và giới hạn

Rà soát tập trung dashboard KOL, hiển thị sổ cái ví, màn hình chi trả Shop và hợp đồng phân trang API. Ba lỗi mới được chứng minh bằng cách chạy biểu thức/filter trích từ code hiện hành trong bộ nhớ với dữ liệu giả lập. Chưa thao tác lệnh thật và chưa triển khai sửa chúng.

Kết quả này không phải khẳng định toàn website không còn lỗi. Các dịch vụ PayOS, GHN, OTP/SMTP thật vẫn cần môi trường sandbox và một đợt kiểm thử end-to-end riêng được phép thực hiện.
