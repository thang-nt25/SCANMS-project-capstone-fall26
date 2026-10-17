# Test mục 2 Word — Nhận hàng mẫu và SLA 14 ngày

## Hành vi sau sửa

| Trạng thái mẫu | KOL được thao tác gì | Hạn video |
| --- | --- | --- |
| PENDING / APPROVED | Theo dõi yêu cầu, sửa/hủy theo quyền hiện có | Chưa bắt đầu |
| SHIPPED | Xem mã GHN, Theo dõi hành trình bưu kiện, báo sự cố | Chưa bắt đầu; không có nút nhận hàng hay nộp video |
| DELIVERY_ISSUE | Tiếp tục theo dõi vận đơn; hệ thống kiểm tra lại GHN | Chưa bắt đầu; chưa được nộp video |
| RECEIVED | Nộp Link Video Review | Đúng 14 ngày từ thời điểm GHN giao thành công |
| OVERDUE / REVISION_REQUIRED | Nộp bổ sung hoặc sửa theo yêu cầu | Dùng hạn sau nhận hàng/gia hạn hiện có |

Hai lỗi đã sửa:

- Mẫu đã báo sự cố vẫn được tự chuyển RECEIVED nếu GHN giao thành công **đúng mã vận đơn hiện hành**. Webhook, lịch kiểm tra 10 phút và nút theo dõi đều hỗ trợ.
- Nếu detail GHN thiếu log/finish_date, backend đọc mốc delivered đã được xác thực từ lịch sử LIVE của đúng vận đơn hoặc thời điểm callback có khóa hợp lệ, đúng GHN Shop ID. Không dùng giờ tra cứu hoặc ngày Shop gửi làm giờ nhận hàng.

Các bảo vệ:

- Chỉ bắt đầu SLA khi API GHN hiện xác nhận delivered và có thời điểm giao hợp lệ, không nằm trong tương lai.
- Không lấy mốc TEST sang mẫu LIVE, không lấy thời điểm từ callback không xác thực.
- Mã vận đơn đổi do gửi lại, mẫu đã hủy hoặc đã RECEIVED không bị webhook cũ ghi đè/kéo dài hạn.
- Mẫu còn đang chờ xác minh không mở nút nộp video. UI tự thử đồng bộ lại sau 30 giây, không coi HTTP 200 đơn thuần là đã nhận hàng.

## Bạn kiểm tra trên giao diện

1. **Ctrl+F5**, đăng nhập tài khoản KOL → **Hợp tác & Nhận mẫu Shop** → chọn Shop → **Hàng mẫu**.
2. Chọn mẫu **Đang giao**: phải có mã vận đơn GHN và **Theo dõi hành trình bưu kiện**. Không có nút **Đã nhận được hàng**, **Nộp Link Video Review** hoặc hạn đếm ngược sớm.
3. Bấm theo dõi. GHN chưa delivered → mẫu phải vẫn SHIPPED, chưa bắt đầu SLA.
4. Với mẫu đã **Báo sự cố**, vẫn có thể mở theo dõi. Nếu GHN xác nhận giao xong đúng mã, hệ thống chuyển RECEIVED, xóa trạng thái sự cố đang hoạt động nhưng giữ lịch sử xử lý.
5. Khi có xác nhận nhận mẫu, thẻ hiện **Đã nhận · chờ video**, hạn video và nút **Nộp Link Video Review**. Đối chiếu hạn = giờ giao GHN + 14 ngày; không tính từ lúc đăng ký hoặc lúc Shop duyệt/gửi.
6. Tải lại trang hoặc bấm theo dõi nhiều lần. receivedAt/deadlineAt phải giữ nguyên, không cộng thêm 14 ngày mỗi lần.
7. Nếu GHN báo delivered nhưng chưa có bằng chứng giờ giao, thông báo sẽ ghi đang xác minh; chưa mở nộp video. Hệ thống tự thử lại thay vì lấy giờ hiện tại để đặt hạn.

Không dùng nút tạo vận đơn mới để ép mốc giao thành công. Staging/đơn mới tạo có thể vẫn chờ lấy hàng. Hai lỗi đã được kiểm thử bằng fixture và transport giả, không thêm mô phỏng vào giao diện sàn.

## Test tự động

Từ `backend`:

```powershell
node scripts/audit-sample-sla.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=sample-delivery-sla.spec|samples.service.spec|ghn.service.spec|ghn-live-tracking.spec|sample-phone.spec"
```

Từ `frontend` khi Vite đang chạy:

```powershell
$env:GHN_UI_TEST_URL='http://localhost:5173'
node --test tests/sample-sla.browser.test.mjs
```

Test trình duyệt kiểm tra cả SHIPPED và DELIVERY_ISSUE: lần sync đầu còn chờ xác minh không được mở nộp video; UI thử lại rồi chỉ mở sau khi backend trả RECEIVED. Tất cả request API trong test được chặn và trả fixture, không sửa đơn thật.

## Kết quả kiểm tra ngày 16/10/2026

- Backend: 479/479 bài kiểm tra đạt trong 29 bộ kiểm tra liên quan.
- Audit nhận mẫu/SLA: 14/14 tình huống đạt.
- Frontend tracking/SLA: 4/4 bài kiểm tra đạt, gồm kiểm tra trên trình duyệt.
- Build backend và frontend thành công. Frontend còn cảnh báo kích thước một số bundle trên 500 kB.
- Kiểm tra dùng dữ liệu fixture; chưa xác minh một chuyến giao GHN thực tế từ đầu đến cuối.

## Giới hạn vận hành thực tế

Máy hiện chỉ có localhost, chưa cấu hình URL HTTPS công khai nhận webhook GHN. Cron và tra cứu chủ động vẫn hoạt động khi backend chạy; để nhận callback thật cần kết nối theo [hướng dẫn GHN tracking](TEST_CUSTOMER_LIVE_TRACKING.md). Phần sửa này không phát hành vận đơn thật và không ép đổi các mẫu chưa có xác nhận giao thành công.
