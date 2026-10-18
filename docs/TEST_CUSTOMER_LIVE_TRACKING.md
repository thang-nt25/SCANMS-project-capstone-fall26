# Kiểm tra mục 3 Word — Hành trình giao hàng GHN

## Phần đã sửa

Áp dụng đồng nhất tại `/tracking` và chi tiết đơn `/customer/orders`:

1. **Bưu tá đã lấy hàng tại kho Shop** (`picked`).
2. **Nhập kho trung chuyển** (`storing`); phân loại/chuyển kho có nhãn riêng.
3. **Shipper đang đi giao** (`delivering`), có tên/SĐT và liên kết bấm gọi khi GHN cung cấp.
4. **Giao hàng thành công** (`delivered`).

Các mốc thật chưa có bằng chứng hiện “Chưa có xác nhận từ GHN”. Test nhanh hiện có hành trình mô phỏng riêng, có nhãn rõ ràng, SĐT che và nút gọi tắt: xem [hướng dẫn kiểm thử sandbox](TEST_CUSTOMER_GHN_SIMULATION.md).

- Lịch sử được lưu ở `ghn_tracking_records`, tách TEST/LIVE, sắp theo thời gian và khử trùng lặp; log lỗi/null không làm hỏng toàn bộ hành trình.
- Thông tin shipper được lấy từ detail GHN hoặc callback có khóa xác thực, đúng Shop ID. Callback cũ không làm lùi trạng thái mới. SĐT của lần giao cũ không được gán cho lần giao mới chưa có tài xế.
- Đổi mã tra cứu không nhận nhầm kết quả request cũ. Hành trình tự tải lại mỗi 30 giây khi đang vận chuyển, tạm dừng khi tab bị ẩn; dừng polling khi GHN xác nhận trạng thái kết thúc. Có nút Làm mới.
- Nếu GHN lỗi, lịch sử đã lưu còn hiển thị cùng cảnh báo dữ liệu chưa cập nhật. Mã không tồn tại vẫn có cảnh báo riêng.
- Mã GHN nhập thủ công được tra ở cả hai màn hình. Mã hãng khác không bị gửi sang GHN. Mã demo nội bộ không được xem như vận đơn thật.
- Khi trạng thái đơn sàn lệch GHN, giao diện báo rõ hai nguồn khác nhau. Không tự lùi đơn đã hoàn tất hoặc thay đổi số dư/hoa hồng để làm đẹp tiến độ.
- Tra cứu công khai yêu cầu **cả SĐT đặt hàng và mã đơn**, đồng nhất với backend.

## Kết quả kiểm tra thực tế trên máy

- Backend cấu hình ở `http://localhost:3000`, frontend `http://localhost:5173`.
- Chưa tìm thấy URL backend công khai trong cấu hình hoặc tunnel ngrok/cloudflared đang chạy.
- GET `/api/shipping/ghn/track/L8RBUE` trả TEST, `ready_to_pick`, `isStale=false`, chưa có log/shipper. Bản ghi trạng thái này đã được lưu thật vào database.
- Đơn sàn `DH-2026-154B80BE` đang DELIVERED trong khi GHN vẫn chờ lấy hàng. Mở chi tiết sẽ có thông báo lệch trạng thái; không tự xác nhận bốn mốc cho đơn này.
- Đã tạo `GHN_WEBHOOK_SECRET` trong `backend/.env`, không in giá trị ra chat và không gửi ra ngoài.

## Thử trên giao diện ngay bây giờ

1. Tải lại web bằng **Ctrl+F5**.
2. Mở `http://localhost:5173/tracking`, nhập mã đơn **DH-2026-154B80BE** và SĐT đặt đơn đó, bấm **Tra Cứu Đơn**.
3. Khung GHN phải có nhãn **Staging**, trạng thái hiện tại **Chờ lấy hàng** và bốn mốc dự kiến. Những mốc chưa xảy ra không có tick xác nhận.
4. Bấm **Làm mới**. Phải thấy trạng thái tải và thời điểm cập nhật mới; không hiện tên/SĐT shipper mẫu.
5. Đăng nhập Customer sở hữu đơn → Đơn mua → **Xem chi tiết**. Khung hành trình phải dùng cùng mã và kết quả GHN như trang công khai; thông báo lệch trạng thái xuất hiện với đơn thử này.
6. Với vận đơn GHN đang giao thực sự, khi hãng cấp thông tin tài xế, kiểm tra thẻ **Shipper phụ trách giao hàng**, bấm SĐT để mở cuộc gọi. Lịch sử phải ghi lần đi giao và thời gian GHN đã cấp.

Staging thuần không bảo đảm tự chạy đủ bốn trạng thái. Vận đơn tạo bằng Test nhanh có hành trình mô phỏng năm mốc trong bốn phút; không tự thay đổi tài chính hay trạng thái giao hàng thật.

## Kết nối webhook để nhận tên/SĐT từ GHN

GET tra cứu đã hoạt động trên localhost. Để GHN chủ động gửi thông tin về máy, backend cần URL HTTPS mà GHN truy cập được; không thể đăng ký `localhost:3000` làm callback từ bên ngoài.

Khi có URL backend công khai:

1. Vào GHN Developer đúng môi trường đang dùng: [Production](https://developer.ghn.vn) hoặc [Staging](https://developer.ghn.dev).
2. Mở menu tài khoản → **Cấu hình webhook** → tab **Order**.
3. Đặt URL nhận: `https://<dia-chi-backend-cong-khai>/api/shipping/ghn/webhook`.
4. Thêm header tùy chỉnh **`x-ghn-webhook-secret`**. Giá trị: sao chép đúng phần sau dấu `=` của **`GHN_WEBHOOK_SECRET`** trong `backend/.env`. Không dùng token API làm giá trị này, không đưa secret vào URL hoặc frontend.
5. Bật sự kiện đổi trạng thái. Kiểm tra quyền/dữ liệu **shipper** và **warehouse** nếu tài khoản GHN cung cấp; nếu không có quyền, cần GHN hỗ trợ bật. Không thể đảm bảo luôn có SĐT khi hãng chưa gán/cấp thông tin.
6. Lưu cấu hình. Làm riêng cho mỗi môi trường. GHN có thể cần thời gian cập nhật cấu hình; xem [tài liệu callback chính thức](https://developer.ghn.vn/vi/docs/webhook/callback-order-status).

Webhook thiếu khóa vẫn phải được xác minh trạng thái qua API GHN trước khi xử lý giao thành công, nhưng phần tên/SĐT/kho do payload gửi sẽ không được nhận để tránh giả mạo.

## Kiểm thử kỹ thuật

Kết quả sau sửa: **461/461 test backend (28 suite)**, **2/2 test tiện ích frontend**, **1/1 test trình duyệt** bao phủ hai màn hình và mobile, **11/11 ca audit tracking** đạt. Build backend/frontend đạt. Bộ test dùng fixture không tạo vận đơn hoặc thay trạng thái đơn thật.

Từ `backend`:

```powershell
node scripts/audit-live-tracking.cjs
node scripts/check-ghn-tracking-config.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=ghn-live-tracking.spec|ghn.service.spec|ghn-tracking-code.spec|orders.service.spec|customer-orders-filter.spec"
```

Từ `frontend`:

```powershell
node --test tests/ghn-tracking.test.mjs
$env:GHN_UI_TEST_URL='http://localhost:5173'
node --test tests/ghn-tracking.browser.test.mjs
```

Test trình duyệt mở Chrome headless riêng, chặn toàn bộ request API và cấp fixture. Đã kiểm tra cả hai màn hình, polling, dừng sau giao thành công, tên/SĐT và viewport điện thoại. Không gọi API tạo đơn, không gửi webhook giả vào đơn thật, không sửa trạng thái nghiệp vụ hay số dư.

Schema mới được áp dụng bằng `node scripts/apply-ghn-tracking-schema.cjs`. Script chỉ tạo bảng nếu chưa có; không đổi dữ liệu đơn cũ. Khi chuyển môi trường cần áp dụng migration và chạy Prisma generate tương ứng.
