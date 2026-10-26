# Rà soát luồng web — 26/10/2026

## Phạm vi và giới hạn

Đọc code và chạy bộ kiểm thử tự động hiện có cho đăng nhập, giỏ hàng, đơn hàng, voucher, mẫu thử, chat, chiến dịch, báo cáo, AI, audit và chi trả. Không đồng nghĩa đã thao tác thủ công toàn bộ màn hình với mọi vai trò.

Không tạo đơn, chuyển tiền, duyệt rút tiền, gửi email hay vận đơn thật trên database dùng chung. Không sửa `.env`, không migration, không viết lại lịch sử tài chính. Kiểm thử Chrome bổ sung dùng API giả lập và chặn mạng ngoài; các giao dịch trong test không đi tới backend thật.

## Tính năng và lỗi đã sửa

### 1. Khám phá voucher đúng sản phẩm, không bắt buộc lưu

- Khay thanh toán lấy mã công khai theo từng sản phẩm của từng gian hàng, gộp trùng ID.
- Mã đã lưu là nguồn bổ sung, không còn là điều kiện để thấy voucher Shop.
- Mã sàn/vận chuyển chỉ xuất hiện cho gian hàng có trong đơn. Không giới hạn tùy ý hai mã đầu tiên.
- Không tạo voucher dự phòng giả khi API lỗi hoặc không có voucher.
- Tải lỗi có thông báo và nút thử lại; ưu đãi của các nguồn tải thành công vẫn xem được.

### 2. Áp dụng voucher qua backend

- Click voucher và nhập mã dùng chung bộ kiểm tra server, không tự ước lượng giảm giá từ phần trăm trên card.
- Mã Shop gửi đúng sản phẩm, biến thể, số lượng của Shop đó; không gửi giá client như nguồn tính tiền.
- Mã sàn/vận chuyển gửi đủ `shopDiscount`, `shopCouponCode`, tiền hàng và phí giao đúng Shop.
- Chặn bấm gửi trùng; bỏ kết quả cũ khi đóng khay hoặc thay đổi đầu vào.
- Giữ lỗi mạng, hết phiên, quá tải; không thử mọi Shop liên tục khi server đang lỗi.
- Mã hết hạn/hết lượt bị vô hiệu trước khi click; backend vẫn quyết định cuối cùng.
- Tab/Enter/Space/Escape, giữ focus trong hộp thoại và khôi phục focus khi đóng.
- Đăng nhập từ khay quay về form đăng nhập tại chỗ trong checkout, không redirect.

### 3. Thanh toán nhiều gian hàng

- Voucher sàn/vận chuyển mang theo `storeId` sau khi được kiểm tra, không mặc định gán Shop đầu tiên.
- Backend coi map voucher từng Shop là nguồn chỉ định chính xác; không lấy mã fallback của Shop B gán cho Shop A.
- Đổi voucher Shop làm bỏ preview voucher sàn bị ảnh hưởng; thay báo giá vận chuyển làm bỏ preview freeship cũ để chọn lại.
- Không đổi quy tắc thanh toán/hoàn tác giao dịch, khấu trừ thuế hay lịch sử chi trả.

### 4. Cache và chuyển tài khoản

- Cache được xoá khi token đổi; tài khoản sau không nhận payload cache của tài khoản trước.
- Response của phiên cũ bị huỷ; giữ nguyên dấu hiệu cancellation để bên gọi nhận biết.
- Không cache danh sách đơn, chat và voucher; catalogue hết hạn sau 30 giây.
- Thao tác đơn/hoàn trả xoá cache tồn kho, gian hàng và báo cáo liên quan.
- GET đang chờ trước mutation không được điền lại cache bằng dữ liệu cũ.

### 5. Giỏ hàng lưu trên thiết bị

- Một dòng JSON hỏng/thiếu Shop/số lượng âm không còn làm crash trang hoặc loại toàn bộ dòng hợp lệ.
- Lọc ID được chọn sai kiểu/trùng; chịu được variant snapshot null hoặc sai kiểu.
- Không dùng giá NaN hoặc tồn kho âm từ variant snapshot.
- Giữ sản phẩm hết hàng trong giỏ để khách điều chỉnh; giữ phân tách theo tài khoản.

## Cách kiểm tra nhanh

1. Vào sản phẩm có voucher Shop, chọn mua → mở **Chọn SCANMS Voucher**: mã phù hợp hiện dù chưa lưu.
2. Click mã: chỉ cập nhật tổng giảm khi backend xác nhận. Mã lỗi phải có thông báo, không báo áp dụng thành công.
3. Thêm hàng của hai Shop vào giỏ. Chọn voucher Shop B: mức giảm và mã phải gắn đơn con Shop B, không ảnh hưởng Shop A.
4. Đổi địa chỉ/phí giao: freeship preview cũ được bỏ để kiểm tra/chọn lại.
5. Checkout chưa đăng nhập → nút đăng nhập trong khay: giữ nguyên trang, mở form đăng nhập tại chỗ.
6. Đổi tài khoản trong cùng tab: dữ liệu đơn/KYC/chat/voucher không lấy từ cache tài khoản trước.
7. Dùng Tab/Enter/Space chọn mã, Esc đóng khay; kiểm tra trên điện thoại.

Chỉ đặt đơn/duyệt chi thật khi chủ dữ liệu xác nhận; các bước trên có thể dừng ở phần xem trước.

## Kiểm thử

- Backend: 125 suite đạt, 1.418 test đạt; 2 suite/56 test được bỏ qua theo cấu hình (không tự chạy integration dịch vụ thật).
- Frontend mặc định: 146 test đạt; browser test opt-in được bỏ qua khi chưa truyền cấu hình.
- Chrome headless bổ sung: `checkout-voucher-selection.browser.test.mjs` đạt; kiểm tra nguồn voucher chưa lưu, thử lại, không mã giả, gọi validator đúng Shop, bàn phím và bố cục 1440/390/320px.
- Backend và frontend build production thành công. Frontend còn cảnh báo chunk lớn hơn 500 kB, không phải lỗi build.

Lệnh tái chạy từ thư mục tương ứng:

```powershell
# backend
npm.cmd test
npm.cmd run build

# frontend
npm.cmd test
npm.cmd run build
$env:GHN_UI_TEST_URL='http://127.0.0.1:5173'
node --test tests/checkout-voucher-selection.browser.test.mjs
```

Các luồng PayOS/GHN/SMTP thật, xác thực OTP thật và thanh toán/duyệt chi thật chưa được chứng minh end-to-end bởi đợt kiểm thử cô lập này; cần môi trường sandbox và dữ liệu kiểm thử được nhóm cho phép.
