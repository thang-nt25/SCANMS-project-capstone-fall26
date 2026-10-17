# Đối chiếu mục 3 Word — Customer Live Tracking GHN

**Cập nhật sau sửa:** Đã chuẩn hóa các mốc, giữ lịch sử theo TEST/LIVE, lưu thông tin shipper từ API/callback đã xác thực, sửa mã GHN nhập tay và hãng vận chuyển ở cả hai màn hình, bổ sung tự cập nhật 30 giây/nút Làm mới/thông báo lệch trạng thái. Audit bổ sung hiện đạt **11/11**. Xem [hướng dẫn sau sửa](TEST_CUSTOMER_LIVE_TRACKING.md). Cấu hình hiện chỉ có localhost, chưa tìm thấy URL nhận webhook công khai; việc tiếp nhận callback từ GHN cần bước kết nối trong hướng dẫn.

Phần dưới là **audit trước khi sửa**, giữ để đối chiếu.

Ngày kiểm tra: 16/10/2026. Đây là lượt audit, chưa sửa nghiệp vụ. Chỉ thêm script kiểm tra và báo cáo; không tạo vận đơn, không thay trạng thái đơn và không ghi dữ liệu kiểm thử vào database.

**Kết luận: Đã có tích hợp cơ bản, chưa đầy đủ để nghiệm thu toàn bộ yêu cầu Word.**

## Đối chiếu yêu cầu

| Yêu cầu Word | Kết quả |
| --- | --- |
| GET `/api/shipping/ghn/track/:orderCode` | Đã có. Controller gọi service, loại `ghnRawDetail` khỏi phản hồi công khai. |
| Gắn vào `/tracking` | Đã có `GhnTrackingTimeline`, hiển thị khi API tra đơn trả `trackingNumber`. Tuy nhiên backend tra công khai chỉ lấy `rawPayload.ghnOrderCode`, bỏ sót mã GHN được Shop lưu thủ công trong `trackingNumber`. |
| Gắn vào chi tiết `/customer/orders` | Đã có. Customer dùng cả `ghnOrderCode` và `trackingNumber`; mã demo nội bộ được cảnh báo riêng. Chưa kiểm tra hãng vận chuyển trước khi gọi GHN, nên mã GHTK/Viettel cũng có thể bị đưa đi tra GHN. |
| Bưu tá đã lấy hàng tại kho Shop | Chưa rõ đúng yêu cầu: `picked` chưa có trong bảng dịch, đang hiển thị chung “Đang vận chuyển”. |
| Nhập kho trung chuyển | Mới dịch `storing` thành “Đang lưu kho”; `sorting`, `transporting` cũng rơi về “Đang vận chuyển”. Không có nhãn/mốc cụ thể theo chuỗi Word. |
| Shipper đang đi giao kèm tên và SĐT | Mới hỗ trợ một phần: service lấy `shipper_name`/`shipper_phone` từ response detail và UI hiển thị khi có. Chưa lưu `ShipperName`/`ShipperPhone` từ callback GHN; không bảo đảm khách có thông tin khi detail thiếu hai trường này. |
| Giao hàng thành công | Có dịch `delivered` đúng. Webhook xác minh trạng thái bằng API GHN rồi cập nhật đơn sang DELIVERED, có kiểm thử chống cập nhật/thông báo trùng. |
| Cập nhật tiến độ trong lúc khách đang xem | Chưa có. Component GET một lần khi mở/đổi mã. Không polling, không subscription trạng thái; nút Thử lại chỉ xuất hiện ở một số trạng thái lỗi. |

## Các thiếu sót đã tái hiện bằng service

Script `backend/scripts/audit-live-tracking.cjs` chạy service đang dùng, chỉ giả lập GHN/Prisma, không thêm chế độ mô phỏng vào sản phẩm.

**11 ca audit: 5 đạt, 6 chưa đạt tiêu chí kiểm tra.** Đây gồm cả tiêu chí diễn đạt đúng Word và độ bền dữ liệu; không có nghĩa cả 6 đều gây lỗi trong dữ liệu GHN bình thường.

1. `picked` → “Đang vận chuyển”, không nói rõ đã lấy hàng từ Shop.
2. `storing` → “Đang lưu kho”, chưa diễn đạt mốc nhập kho trung chuyển theo Word.
3. Khi log trả ngược thứ tự, backend giữ nguyên, không chuẩn hóa trình tự thời gian. Cần quyết định trình bày mới nhất trước hay trình tự từ lấy hàng đến giao hàng và thực hiện nhất quán.
4. Log có một phần tử `null` làm cả lần tra cứu ném lỗi, dù trạng thái hiện tại còn hợp lệ.
5. Callback đã được xác minh ở trạng thái `delivering`, có tên/SĐT shipper, không ghi lịch sử hoặc thông tin liên hệ. Customer không thể lấy lại từ sàn nếu GHN detail không cung cấp.
6. Đơn có mã GHN chỉ nằm trong `rawPayload.trackingNumber` → API `/orders/track` trả `trackingNumber=null`, nên trang công khai không mở khung hành trình. Customer Portal lại đọc được mã này: hai màn hình thiếu nhất quán.

Các ca đạt xác nhận: đủ số log được truyền qua khi GHN có dữ liệu, nhãn delivered, đọc tên/SĐT từ detail khi có, không tự dựng hành trình/shipper cho Staging và không công khai toàn bộ raw GHN.

## Kiểm tra API đang chạy

Chỉ gọi GET, không đổi dữ liệu:

- `/api/orders/track` cho đơn `DH-2026-154B80BE`: tìm được vận đơn `L8RBUE`; trạng thái đơn sàn hiện là `DELIVERED`.
- `/api/shipping/ghn/track/L8RBUE`: môi trường `TEST`, trạng thái `ready_to_pick`, timeline 0 mốc, không tên/SĐT shipper, không lỗi mã vận đơn.
- Hai nguồn đang lệch trạng thái ở đơn thử này. Chưa xác định lịch sử thao tác nào đã khiến đơn sàn thành DELIVERED; không kết luận GHN đã giao. GET tra hành trình hiện không tự đối chiếu/sửa trạng thái đơn sàn.
- Do vận đơn thử vẫn chờ lấy hàng, không thể dùng nó làm bằng chứng bốn mốc vận chuyển thật đã chạy thành công.

## Đối chiếu tài liệu GHN chính thức

- [Mã trạng thái GHN](https://developer.ghn.vn/vi/docs/master-data/order-status): có các trạng thái riêng `picked`, `storing`, `sorting`, `transporting`, `delivering`, `delivered`. Bảng dịch hiện chưa xử lý đủ để phân biệt chúng.
- [Callback trạng thái đơn](https://developer.ghn.vn/vi/docs/webhook/callback-order-status): `ShipperName`/`ShipperPhone` là thông tin tài xế được gán khi bật dữ liệu `shipper`; `Warehouse` phụ thuộc dữ liệu `warehouse`. Không thể bảo đảm tài khoản nào cũng trả đầy đủ hoặc luôn có dữ liệu.
- [Thông tin đơn](https://developer.ghn.vn/vi/docs/order/info): mô tả detail và các trường vận hành; mẫu công khai không cam kết luôn có tên/SĐT shipper. Tài liệu hiện ghi GET tới detail, code sàn đang POST; request hiện vẫn nhận được trạng thái Staging nên chưa xác định đây là lỗi chặn chức năng.

## Những phần cần hoàn thiện trước nghiệm thu

1. Chuẩn hóa nhãn trạng thái và timeline, xử lý dữ liệu log thiếu/sai, không tự xác nhận mốc chưa có bằng chứng.
2. Lưu hành trình cùng tên/SĐT shipper từ nguồn GHN đã xác thực; ghép vào API tra cứu khi detail thiếu, không lấy thông tin giả.
3. Thống nhất chọn mã/hãng vận chuyển cho cả trang công khai và Customer Portal.
4. Cập nhật hành trình khi khách đang xem, có làm mới và thời điểm cập nhật; xử lý trạng thái đơn sàn khác trạng thái GHN rõ ràng.
5. Xác minh tài khoản GHN bật dữ liệu shipper/warehouse và callback tới được backend; cần đơn thật hoặc dữ liệu kiểm thử hợp lệ có đủ các mốc để nghiệm thu đầu cuối.

## Kiểm thử đã chạy

- **49/49 test, 5 suite** liên quan GHN, mã vận đơn, thông báo đơn và Customer: đạt.
- Audit bổ sung ở trên: **5 đạt / 6 chưa đạt**. Những ca thiếu này chưa được bộ test cũ bao phủ.
- Chạy lại từ `backend`:

```powershell
node scripts/audit-live-tracking.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=ghn.service.spec|ghn-tracking-code.spec|customer-orders-filter.spec|orders.service.spec"
```

Chưa thao tác đủ bốn trạng thái trên trình duyệt với vận đơn thực. Không thay đổi cấu hình GHN/webhook trong tài khoản nhà vận chuyển.
