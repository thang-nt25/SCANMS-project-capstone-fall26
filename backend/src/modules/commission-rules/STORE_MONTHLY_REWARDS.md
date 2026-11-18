# Thưởng doanh số tháng riêng từng Shop

Shop tạo một chính sách từ tháng hiện tại trở đi, gồm KPI doanh số
sạch và tiền thưởng cố định. Chính sách phải được SYSTEM_MANAGER hoặc
SYSTEM_ADMIN duyệt. UI mặc định tạo tháng sau.

KOL hợp tác đã duyệt được theo dõi theo từng Shop, từng tháng Việt Nam.
Doanh số dùng cùng phép đối soát đơn COMPLETED, loại tự mua và trừ hoàn tiền.
Đạt KPI chỉ là dự tính: Shop gửi đề nghị, nhân sự vận hành kiểm tra lại doanh
số và duyệt thì mới cộng ví. Một KOL chỉ nhận một lần cho mỗi Shop/tháng.
Không tự nâng tier hoặc tự cộng tiền qua scheduler.

## API `/api/monthly-rewards`

- GET `?month=YYYY-MM&storeId=...`: Shop xem phạm vi của mình; KOL chỉ xem
  chính sách đã duyệt và số liệu của mình; Manager/Admin xem toàn hệ thống.
- POST `/stores/:storeId`: Shop tạo chính sách chờ duyệt.
- POST `/policies/:id/review`: Manager/Admin duyệt hoặc từ chối chính sách.
- POST `/policies/:id/request/:kolId`: Shop gửi đề nghị cho KOL đạt KPI.
- POST `/grants/:id/review`: Manager/Admin duyệt và cộng ví, hoặc từ chối
  kèm lý do. Người gửi không được tự duyệt.

Thao tác cộng ví, bút toán MONTHLY_BONUS_REWARD, thông báo và trạng thái nằm
trong cùng transaction. Bản chốt MonthlyBonusResult lưu chính sách bất biến
để luồng hoàn tiền hiện tại thu hồi phần thưởng nếu không còn đạt KPI.
Các kỳ dùng chính sách mới không được trả thêm qua luồng quyết toán cũ.

GET cũng trả `legacyHistory`: các bản chốt cũ giữ nguyên doanh số, tiền
thưởng, trạng thái và snapshot chính sách. Nếu chưa chốt, chính sách cũ
được phục dựng theo audit tại đầu kỳ. Chỉ đọc, không chuyển đổi dữ liệu,
không tính lại tiền đã trả và không tạo lịch sử cho tháng chưa có chính sách.
KOL chỉ thấy bản chốt của mình, kể cả khi quan hệ hợp tác đã kết thúc.
Danh sách tháng cũ còn bao gồm KOL có quan hệ hợp tác trong kỳ (theo mốc
duyệt/kết thúc) hoặc có đơn hoàn tất được gán cho mình trong kỳ. Người chưa
chốt hiển thị doanh số sạch và `NOT_SETTLED`, không gán số tiền thưởng hay
trạng thái đã trả. Với người đã chốt, bản lưu luôn được ưu tiên hơn số liệu
tính lại từ đơn hiện tại. Việc này chỉ bổ sung hiển thị, không tạo bản chốt.

Danh sách KPI đọc đơn theo nhóm KOL trong một lượt cho mỗi chính sách,
không gọi lại chuỗi truy vấn đối soát cho từng thành viên. Vẫn dùng bộ tính
doanh số hàng hóa sạch và kiểm tra tự mua/hoàn tiền chung. Gửi và duyệt
thưởng tiếp tục đối soát lại trong transaction, không lấy số liệu từ cache.
Giao diện giữ snapshot 15 giây theo tài khoản/Shop/tháng, gộp GET đồng thời;
xóa khi đổi phiên hoặc thay đổi dữ liệu. Khi cửa sổ nhận focus, chỉ đọc lại
nếu snapshot đã hết hạn và không có lượt đọc đang chạy. Cập nhật cùng kỳ
giữ nguyên các hàng trong lúc chờ; không có bộ hẹn giờ tải lại định kỳ.

## Demo và kiểm tra

Tại thư mục backend:

```text
node scripts/demo-store-monthly-rewards.cjs          # xem kế hoạch
node scripts/demo-store-monthly-rewards.cjs --apply  # tạo mẫu, không cộng ví
node scripts/check-store-monthly-rewards.cjs         # đọc API cả bốn vai trò
node scripts/check-monthly-rewards-ui.cjs             # UI Shop/Admin + form tháng sau
```

Seed có khóa chống tạo trùng theo Shop/tháng, đánh dấu demo rõ ràng. Không
ghi đè chính sách thực, không tạo đề nghị đã trả, không thay số dư, tier hay
tồn kho. Đơn mẫu phục vụ KPI có thù lao bằng 0 và không gọi bộ xử lý chi trả.
