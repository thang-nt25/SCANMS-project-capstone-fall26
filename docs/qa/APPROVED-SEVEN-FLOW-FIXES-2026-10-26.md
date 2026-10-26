# Hoàn tất 7 lỗi được duyệt — 26/10/2026

## Các thay đổi

| Lỗi được duyệt | Kết quả | Cách kiểm tra |
| --- | --- | --- |
| AI từ chối sản phẩm UUID v5 | Route nhận UUID v4/v5; vẫn chuyển danh tính người gọi tới service kiểm tra quyền | Chủ Shop → gợi ý KOL → chọn sản phẩm seed của Shop |
| Mời chiến dịch VIP chỉ nhận UUID v4 | DTO nhận ID KOL, hội thoại, chiến dịch UUID hợp lệ; ID sai vẫn bị chặn | Mở chiến dịch → chọn KOL seed; chỉ gửi lời mời thực tế khi nhóm cho phép |
| Chat tìm đơn theo tên khách | API hỗ trợ `customerId` chính xác, giữ giới hạn Shop sở hữu; UI không gửi truy vấn nếu thiếu ID khách | Hai khách cùng tên: từng hội thoại chỉ lấy đơn đúng ID; không đoán theo tên/số điện thoại |
| Tìm kiếm ghi đè bộ lọc hoàn trả | DTO nhận `RETURNS`; điều kiện hoàn trả kết hợp với từ khóa/thanh toán/khách bằng AND | Chủ Shop → nhóm hoàn trả → nhập từ khóa; đơn thường cùng từ khóa không được lọt vào |
| Dashboard KOL biến lỗi API thành số 0 | Lỗi riêng từng nguồn, placeholder —, nút thử lại; nguồn thành công vẫn hiển thị; số 0 thật không bị coi là lỗi | Chặn `/wallets/me` trong môi trường thử: phải hiện lỗi và —; mở lại mạng → thử tải lại |
| Dashboard KOL dùng đầu ngày UTC | Khoảng ngày bắt đầu 00:00 UTC+7, không phụ thuộc múi giờ trình duyệt | 7 ngày lúc 10:00 VN 26/10: mốc bắt đầu phải là `2026-10-19T17:00:00.000Z` |
| Kho nội dung bị cắt ở 100 mục | Đọc đủ trang API, sắp xếp ổn định theo thời gian rồi ID; phân trang UI 24 mục; Pack dùng toàn bộ kết quả lọc | Catalogue 251 mục: API tải trang 1–3, tìm được mục 250; Pack không giới hạn ở trang UI |

Trong luồng chat cũng chuẩn hóa tên trường API cho mã đơn, thành tiền và mã vận đơn, để thẻ chia sẻ dùng thông tin đơn thực tế. Tải lịch sử thất bại hiện thông báo/thử lại thay vì giả vờ khách chưa có đơn.

## Chi tiết an toàn và giới hạn

- Không thay schema, không migration, không sửa dữ liệu cũ, không sửa `.env`.
- Không làm lỏng quyền sở hữu Shop. Truy vấn lịch sử khách chỉ giới hạn các đơn đã gắn đúng `customerId`; không tự nhận đơn khách vãng lai bằng tên hay số điện thoại.
- Test HTTP sử dụng guard/service giả lập chỉ bên trong bài test, không thay guard production.
- Chrome headless chặn truy cập ngoài, chỉ GET API giả lập; không đăng nhập tài khoản thật hay tạo lời mời/đơn/giao dịch.
- Kho nội dung tải đủ catalogue được phép xem trước khi lọc/phân trang phía client. Nếu trang sau lỗi, dữ liệu thay đổi giữa lúc tải, dữ liệu trùng/thiếu hoặc request bị hủy, không coi bản thiếu là Pack hoàn chỉnh. Có thể thử tải lại.
- Đây là hoàn tất 7 lỗi đã duyệt, không phải chứng nhận mọi luồng dịch vụ ngoài đã chạy end-to-end.

## Kết quả kiểm thử

- Backend: 128 suite đạt, **1.430 test đạt**; 2 suite/56 test integration được bỏ qua theo cấu hình an toàn.
- Frontend: **166 test đạt**, 50 browser test opt-in bỏ qua trong lệnh mặc định.
- Chạy riêng **2 test Chrome đạt**: dashboard lỗi ví → placeholder/thử lại/khôi phục; media 251 mục → đủ 3 trang API, phân trang UI và tìm mục sau 100.
- Cả backend/frontend build production thành công. Frontend còn cảnh báo bundle lớn hơn 500 kB (không làm build thất bại).

Các bài test mới: `campaign.uuid.spec.ts`, `ai-recommendation.uuid.spec.ts`, `store-order-filters.spec.ts`, `chat-customer-orders.test.mjs`, `kol-dashboard.test.mjs`, `media-pagination.test.mjs`, `approved-dashboard-media.browser.test.mjs`.

```powershell
# backend/
npm.cmd test
npm.cmd run build

# frontend/
npm.cmd test
npm.cmd run build
$env:GHN_UI_TEST_URL='http://127.0.0.1:5173'
node --test tests/approved-dashboard-media.browser.test.mjs
```

## Phát hiện khác chưa nằm trong 7 lỗi được duyệt

Dashboard đang xác định dấu của giao dịch bằng bucket `AVAILABLE` hoặc tên chứa `COMMISSION`, thay vì dấu thực tế của `entry.amount`. Một giao dịch rút tiền thuộc bucket AVAILABLE có thể hiện dấu cộng trong khối “Hoa hồng gần đây”. Chưa sửa để chờ duyệt riêng; không ảnh hưởng phép ghi sổ backend.
