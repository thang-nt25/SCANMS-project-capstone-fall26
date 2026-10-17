# Đối chiếu mục 2 Word — Nhận mẫu và SLA video 14 ngày

**Cập nhật sau sửa:** Hai trường hợp thiếu phía dưới đã được xử lý. SHIPPED và DELIVERY_ISSUE đều được đồng bộ nhận hàng qua webhook/cron/tracking khi GHN xác minh giao đúng vận đơn. Mốc delivered đã xác thực trong lịch sử LIVE hoặc thời điểm callback có khóa hợp lệ được dùng khi detail thiếu thời gian. UI chờ backend xác nhận RECEIVED rồi mới mở nộp video, tự thử lại nếu đang chờ bằng chứng. Audit hiện **14/14 đạt**. Xem [hướng dẫn kiểm thử sau sửa](TEST_SAMPLE_RECEIPT_SLA.md).

Phần dưới là **audit trước khi sửa**, được giữ để đối chiếu.

Kiểm tra ngày 16/10/2026. Lượt này chỉ audit, thêm kiểm thử và báo cáo; không sửa nghiệp vụ, không gọi tạo vận đơn, không gửi webhook giả vào đơn thật, không sửa dữ liệu mẫu.

**Kết luận: Luồng chính đã đúng yêu cầu; chưa nên nghiệm thu toàn bộ do còn hai trường hợp xác nhận giao thành công bị kẹt.**

## Đối chiếu từng yêu cầu

| Yêu cầu trong Word | Hiện trạng |
| --- | --- |
| SHIPPED tuyệt đối không có nút “Đã nhận được hàng” | **Đạt.** Giao diện KOL không có thao tác này. Endpoint receive cũ vẫn tồn tại nhưng backend luôn từ chối sau khi kiểm tra chủ sở hữu. |
| Thay bằng mã GHN và nút theo dõi bưu kiện | **Đạt với vận đơn GHN.** Thẻ mẫu hiện mã vận đơn và “Theo dõi hành trình bưu kiện”; mở component GHN. |
| Không mở nút nộp video khi đang giao | **Đạt.** UI chỉ cho RECEIVED/OVERDUE/REVISION_REQUIRED. API cũng từ chối PENDING/APPROVED/SHIPPED/DELIVERY_ISSUE, không chỉ dựa vào ẩn nút. |
| Tự nhận khi GHN xác nhận delivered | **Đạt luồng SHIPPED thông thường**, nếu API detail có thời điểm giao trong log hoặc finish_date. Còn hai trường hợp phía dưới. |
| Có kiểm tra an toàn khi mất webhook | **Đạt.** Cron mỗi 10 phút, tối đa 100 mẫu/lượt, luân phiên theo ID; đọc lại GHN. KOL mở tracking còn có API sync-sample. Không tự coi đã nhận chỉ vì đã vận chuyển đủ số ngày. |
| SLA 14 ngày chỉ bắt đầu sau nhận hàng | **Đạt luồng chính.** Tạo vận đơn xóa receivedAt/deadlineAt/expectedVideoAt; khi GHN được xác minh mới cập nhật RECEIVED cùng receivedAt và deadlineAt = receivedAt + 14 ngày trong transaction. |
| Webhook/sync lặp không kéo dài hạn | **Đạt.** Cập nhật có điều kiện status=SHIPPED và đúng trackingNumber. Đơn đã RECEIVED không bị bắt đầu lại SLA. |
| Không nhắc quá hạn video khi đang giao | **Đạt.** Cron nhắc/quá hạn lọc RECEIVED hoặc REVISION_REQUIRED. UI ẩn hạn cho SHIPPED kể cả bản ghi cũ còn expectedVideoAt. |

OVERDUE và REVISION_REQUIRED là các giai đoạn sau khi nhận mẫu. Cho phép nộp bổ sung/sửa video ở các trạng thái này không phải mở nộp video sớm lúc SHIPPED.

## Hai trường hợp còn thiếu

### 1. DELIVERY_ISSUE không tự phục hồi dù GHN giao xong

KOL được báo sự cố khi đang SHIPPED; trạng thái sau đó thành DELIVERY_ISSUE. Nếu GHN giao thành công chính vận đơn đó:

- `syncSampleDelivery` chỉ xử lý SHIPPED và trả về ngay với DELIVERY_ISSUE.
- Cron `reconcileShippedSamples` chỉ lấy SHIPPED.
- Nhánh webhook nhận mẫu và điều kiện cập nhật `recordSampleDelivery` cũng chỉ xử lý SHIPPED.
- UI chỉ truyền sampleRequestId vào component tracking khi isShipped; mẫu đang báo sự cố không được gọi đồng bộ nhận mẫu từ component.

Audit tái hiện: GHN trả delivered cùng thời điểm giao hợp lệ, mẫu vẫn DELIVERY_ISSUE, không mở SLA/video. Cần cho phục hồi khi **cùng vận đơn hiện hành** được xác minh đã giao; không ghi đè đơn đã hủy hoặc lần gửi lại có mã mới.

### 2. Có webhook delivered xác thực và thời điểm giao, nhưng detail thiếu thời gian

Backend đã kiểm tra khóa webhook, đúng Shop ID và lưu `Time` của callback vào `ghn_tracking_records`. Nhưng `recordSampleDelivery` hiện chỉ đọc thời điểm từ `ghnRawDetail.log` hoặc `finish_date`, không dùng thời điểm delivered đã xác thực vừa lưu.

Audit tái hiện:

1. API GHN xác nhận status=delivered, log rỗng và không có finish_date.
2. Callback delivered có khóa hợp lệ, Shop ID đúng, Time hợp lệ và đã được lưu vào lịch sử.
3. Mẫu vẫn SHIPPED, deadlineAt vẫn null; webhook trả thành công nhưng chưa chuyển RECEIVED.

Cách từ chối khi **hoàn toàn không có bằng chứng thời gian** hiện là đúng để tránh lấy giờ phát hiện làm giờ nhận hàng. Điểm thiếu là chưa sử dụng bằng chứng thời gian đáng tin cậy đã có. Cần ghép mốc delivered đúng vận đơn/môi trường từ callback xác thực hoặc lịch sử đã xác minh, không tự lấy thời gian hiện tại để kéo dài hạn.

## Kiểm tra database hiện tại — chỉ đọc

Có 11 yêu cầu mẫu:

- APPROVED: 2; SHIPPED: 6; RECEIVED: 1; OVERDUE: 1; COMPLETED: 1.
- Không có mẫu PENDING/APPROVED/SHIPPED đã được gán receivedAt hoặc deadlineAt.
- Một mẫu SHIPPED còn expectedVideoAt cũ, nhưng receivedAt/deadlineAt đều null. Đây là dữ liệu trường dự kiến cũ; UI hiện đã ẩn và cron không dùng để ép nộp video.
- Mẫu RECEIVED, OVERDUE và COMPLETED đều có receivedAt; deadlineAt cách receivedAt **đúng 14 ngày**.
- Không có mẫu SHIPPED GHN thiếu mã vận đơn trong lần đọc này.

Chưa xác minh GHN thực tế cho từng vận đơn mẫu. Các thống kê trên không chứng minh hãng đã giao từng kiện. Không sửa trạng thái của các mẫu này trong lượt audit.

## Kiểm thử đã thực hiện

- **99/99 test, 4 suite** liên quan SamplesService, GhnService, live tracking và số điện thoại: đạt.
- Test Chrome headless **1/1 đạt**: mở trang KOL Hợp tác → Hàng mẫu bằng fixture SHIPPED, xác nhận không có nút nhận hàng/nộp video, có mã GHN/theo dõi; sau sync trả RECEIVED mới thấy nút Nộp Link Video Review. Bản ghi fixture có expectedVideoAt cũ vẫn không hiện hạn sớm.
- Audit mới `backend/scripts/audit-sample-sla.cjs`: **12 đạt / 2 chưa đạt** như hai trường hợp trên. Transport/Prisma đều giả lập, không gọi GHN hay ghi database.

Chạy lại từ backend:

```powershell
node scripts/audit-sample-sla.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=samples.service.spec|ghn.service.spec|ghn-live-tracking.spec|sample-phone.spec"
```

Từ frontend, khi Vite đang chạy:

```powershell
$env:GHN_UI_TEST_URL='http://localhost:5173'
node --test tests/sample-sla.browser.test.mjs
```

## Giới hạn vận hành

Máy hiện chỉ cấu hình localhost và chưa tìm thấy URL webhook công khai trong lần kiểm tra trước. Callback GHN bên ngoài chưa được chứng minh nhận vào backend này. Cron đọc API và sync từ tracking vẫn là các đường dự phòng khi backend đang chạy; không nên đổi sang giả định đã nhận chỉ vì không có webhook.
