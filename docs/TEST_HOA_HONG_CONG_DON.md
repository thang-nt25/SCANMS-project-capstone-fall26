# Kiểm thử hoa hồng cộng dồn theo Word

## Chuẩn bị

- Làm mới trình duyệt sau khi backend đã tải mã mới. Nếu backend không chạy chế độ watch, khởi động lại backend.
- Dùng một sản phẩm giá 250.000 đ, số lượng 1, không giảm giá, không voucher. Hoa hồng tính trên tiền hàng, không cộng phí vận chuyển.
- Dùng cùng một KOL cho toàn bộ các bước. Xem cấp bậc ở **Hồ sơ & Cấp bậc KOL**. Bảng dưới giả sử KOL đang hạng **Vàng (+2%)**.
- Để đối chiếu chính xác bảng, chọn sản phẩm chưa có Deal được duyệt, chưa tham gia Campaign hay Live. Các Deal được duyệt sẵn vẫn được cộng.
- Mỗi lần thay đổi điều kiện, tạo một đơn mới từ link của KOL. Đơn đã tạo giữ nguyên mức hoa hồng đã chốt.

## Các bước trên giao diện

| Bước | Thao tác | Tổng kỳ vọng | Hoa hồng trên 250.000 đ |
| --- | --- | --- | --- |
| 1 | KOL lấy link tại **Hợp tác & Nhận mẫu Shop → Cococ → Sản phẩm**, Customer mở link và tạo đơn | 10% nền + 2% Vàng = **12%** | **30.000 đ** |
| 2 | KOL chọn **Đề xuất Deal hoa hồng riêng với Shop**, chọn **+2%**, điền kế hoạch review và tích cam kết video. Gửi đề xuất; Shop chưa duyệt. Tạo đơn mới | Vẫn **12%** | **30.000 đ** |
| 3 | Shop vào **Mạng lưới KOL & Hợp tác**, mở đúng KOL/đề xuất và duyệt Deal. Tạo đơn mới | 10 + 2 + 2 = **14%** | **35.000 đ** |
| 4 | Shop mở `/merchant/campaigns`, tạo Campaign **+2%**, ngân sách **100.000 đ**, ngày bắt đầu hiện tại, kết thúc ngày mai; mời đúng KOL và KOL chấp nhận. Tạo đơn trong thời gian hiệu lực | 10 + 2 + 2 + 2 = **16%** | **40.000 đ** |
| 5 | Shop mở **Phiên & Voucher Live**, tạo phiên cho đúng KOL và sản phẩm, chọn thưởng **+3%**. Hoàn tất chấp nhận lời mời và bắt đầu phiên để trạng thái thực sự là **LIVE**. Customer mua từ phiên Live | 10 + 2 + 2 + 2 + 3 = **19%** | **47.500 đ** |
| 6 | Kết thúc phiên; tạo đơn mới từ link thường, khi Campaign vẫn còn hiệu lực | Bỏ thưởng Live, còn **16%** | **40.000 đ** |

Sau mỗi đơn, đối chiếu hoa hồng của **đơn mới đó** trong quản lý đơn/hoa hồng của KOL. Tổng ví khả dụng có thể chưa tăng ngay nếu đơn chưa đủ điều kiện quyết toán.

## Kiểm tra chặn sai

- Deal: chỉ có +1%, +2%, +3%; chưa duyệt không được cộng. API từ chối đề xuất không cam kết review.
- Campaign: ngân sách trống/không dương hoặc mức ngoài +1–2% bị từ chối; ngoài thời gian hiệu lực không được cộng. Với đơn 250.000 đ và +2%, mỗi đơn giữ chỗ **5.000 đ** ngân sách thưởng. Không được ghi nhận vượt trần; yêu cầu gặp tranh chấp ngân sách phải tải lại/tính lại đơn.
- Live: phiên mới mời, đang lên lịch, tạm dừng hoặc đã kết thúc không được cộng thưởng Live. API từ chối 0%, 5% và tổng 13% làm mức thưởng Live.
- Cấp bậc: Đồng +0%, Bạc +1%, Vàng +2%, Kim Cương +3%. Hệ thống xét lại lúc **00:15 ngày 1 hàng tháng, giờ Việt Nam**, dựa trên GMV thuần của tháng trước. Tạo đơn hôm nay không làm đổi hạng ngay.
- Trường hợp tối đa đúng bảng Word: **10 + 3 + 3 + 2 + 3 = 21%**. Trần phòng vệ vẫn là **25%**; không có tầng nào trong yêu cầu hiện tại làm tổng đạt 25%.

## Dữ liệu cũ đã xử lý

- Chuẩn hóa tỷ lệ thưởng cấp bậc về 0/1/2/3%.
- Hai Deal cũ có tổng vượt chuẩn được lưu về tổng **13%**, tương ứng thưởng Deal +3% mà checkout đã chặn trước đó. Đây chưa bao gồm thưởng cấp bậc/Campaign/Live.
- Bốn Campaign cũ sai mức hoặc thiếu ngân sách đã tạm dừng. Shop cần tạo Campaign mới với ngày và ngân sách do Shop lựa chọn.
- Không thay đổi dữ liệu các dòng đơn hàng và bản ghi hoa hồng cũ. Lịch sử phiên Live đã kết thúc/hủy được giữ nguyên.

## Kiểm tra tự động đã thực hiện

277 kiểm thử thuộc 15 nhóm đã đạt; backend và frontend build thành công. Có kiểm tra ma trận 144 tổ hợp hợp lệ, thời gian Live/Campaign, ngân sách nguyên tử, phê duyệt Deal, GMV tháng trước và bảo toàn mức đã chốt. Chưa xác nhận toàn bộ các bước mua hàng bằng thao tác trình duyệt thực tế.
