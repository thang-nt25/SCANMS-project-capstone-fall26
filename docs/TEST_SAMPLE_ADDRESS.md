# Mục 1 Word — Địa chỉ KOL xin mẫu

Đã đối chiếu nội dung mục 1 do người dùng gửi và sửa các lỗi phát hiện trong form, API và hai màn hình Shop. Kết quả kiểm tra ngày 17/10/2026.

## Đối chiếu yêu cầu

| Yêu cầu | Kết quả |
| --- | --- |
| Bỏ textarea địa chỉ và địa chỉ hardcode Sunrise City | Không còn trong luồng đang chạy. SampleRequestsPage chuyển hướng về màn hình hợp tác; form mới bắt đầu với thông tin người nhận trống. |
| Chọn Tỉnh → Huyện → Xã theo GHN | Lấy master-data GHN. Đổi cấp cha xóa cấp con ngay; khóa lựa chọn trong lúc tải, bỏ phản hồi cũ khi người dùng đổi lựa chọn. |
| Số nhà/tên đường riêng | Input chi tiết bắt buộc; gửi kèm tên ba cấp và mã GHN. Giữ nguyên thông tin tầng/căn hộ có dấu phẩy khi mở sửa và lưu lại. |
| SĐT người nhận | Chuẩn hóa đầu +84, kiểm tra số di động Việt Nam, bắt buộc người dùng xác nhận SĐT. Thay SĐT phải xác nhận lại. Chưa có OTP chứng minh chủ thuê bao. |
| Shop thấy đúng thông tin vừa nhập | Hai màn hình dùng snapshot người nhận/địa chỉ trên yêu cầu mẫu, không lấy địa chỉ hoặc SĐT hồ sơ KOL thay thế. Có thông tin nhận hàng trước khi duyệt và trong modal tạo vận đơn. |
| Không giữ địa chỉ cũ | Bỏ cache cho sample-requests; tải mới khi mở màn hình, làm mới hoặc quay lại tab trình duyệt. Phản hồi cũ không được đè kết quả mới; modal nhận bản ghi mới khi danh sách cập nhật. |

Backend kiểm tra lại quan hệ tỉnh/huyện/xã và tên ba cấp trong địa chỉ. Chặn tên/địa chỉ chỉ có khoảng trắng, địa chỉ thiếu số nhà/tên đường hoặc tên cấp địa chỉ không khớp mã GHN. Chỉ được sửa yêu cầu PENDING; dữ liệu yêu cầu cũ không bị tự đổi theo hồ sơ KOL.

## Test trên giao diện

1. Chạy backend/frontend phiên bản mới, nhấn **Ctrl+F5**. Đăng nhập KOL đã KYC và liên kết kênh xã hội.
2. Vào **Hợp tác & Nhận mẫu Shop → chọn Shop → Sản phẩm**. Chọn sản phẩm Shop đang cho xin mẫu, chưa có yêu cầu đang xử lý → **Xin mẫu thử**.
3. Nhập tên người nhận, SĐT thực tế bạn dùng nhận hàng. Chọn lần lượt **Tỉnh / Thành → Quận / Huyện → Phường / Xã** trong danh sách GHN.
4. Nhập số nhà/tên đường. Nếu có, nhập thêm tầng/căn hộ sau dấu phẩy. Tích xác nhận SĐT và cam kết → **Gửi Cam Kết & Xin Mẫu**.
5. Vào **Hàng mẫu → Sửa thông tin** của yêu cầu đang chờ duyệt. Kiểm tra đầy đủ tầng/căn hộ. Đổi tỉnh: huyện/xã cũ phải được xóa ngay, không chọn được trong lúc tải. Chọn đủ địa chỉ mới → **Lưu thay đổi & Gửi lại Shop**.
6. Đăng nhập Shop ở cửa sổ khác → **Mạng lưới KOL & Hợp tác → chọn KOL → Hàng mẫu → Thông tin nhận hàng & cam kết**. Bấm **Làm mới thông tin nhận hàng** nếu màn hình đã mở trước lúc KOL sửa. Đối chiếu tên/SĐT/địa chỉ với yêu cầu mới nhất.
7. Vào **Quản lý Đơn hàng → Hàng mẫu KOL → Thông tin nhận hàng** ở hàng sản phẩm. Phải xem được địa chỉ, tên và SĐT trước khi duyệt.
8. Sau khi duyệt mẫu, mở **Tạo vận đơn GHN**: phải thấy đúng người nhận, SĐT và địa chỉ. Chỉ mở để đối chiếu; không cần phát hành vận đơn thật cho bài kiểm tra form.
9. Thử bỏ trống địa chỉ, chỉ nhập dấu cách hoặc SĐT sai. Form/API phải chặn. API gửi mã huyện/xã sai quan hệ hoặc chuỗi địa chỉ khác các cấp đã chọn cũng phải bị từ chối.

Các yêu cầu cũ đã lưu địa chỉ sơ sài không được tự bịa thêm địa chỉ. KOL cần sửa khi còn PENDING; form sửa bắt buộc chọn đủ các cấp GHN.

## Kết quả tự động

- Audit backend: **9/9 đạt** — kiểm tra lưu snapshot, cập nhật yêu cầu, dữ liệu API Shop, chặn mã GHN/SĐT/địa chỉ không hợp lệ.
- Audit Chrome: **13/13 đạt** — tạo mới, sửa, giữ tầng/căn hộ, đổi tỉnh khi mạng chậm, cả hai màn hình Shop và nút làm mới.
- Bộ kiểm tra backend samples/shipping liên quan: **127/127 đạt, 6 bộ kiểm tra**.
- Kiểm tra hồi quy giao diện tracking/SLA: **4/4 đạt**.
- Build backend và frontend thành công. Frontend còn cảnh báo bundle trên 500 kB.

Audit dùng database/API fixture và chặn toàn bộ request ra backend/GHN thật; không sửa yêu cầu mẫu thật hoặc phát hành vận đơn. Danh mục địa chỉ thực tế vẫn phụ thuộc API GHN đang hoạt động.

Chạy lại từ `backend`:

```powershell
node scripts/audit-sample-address.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=ghn.service.spec|ghn-live-tracking.spec|ghn-tracking-code.spec|sample-delivery-sla.spec|samples.service.spec|sample-phone.spec"
```

Chạy từ `frontend` khi Vite đang chạy:

```powershell
node scripts/audit-sample-address.mjs
```

Kết quả chi tiết: [backend](audit-results/sample-address-backend.json), [trình duyệt](audit-results/sample-address-browser.json).
