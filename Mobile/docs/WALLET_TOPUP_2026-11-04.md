# Sửa ví và nạp ví mobile — 04/11/2026

## Nguyên nhân và thay đổi

API `/wallets/me` trả `withdrawalTaxPolicy.threshold/rate` là chuỗi Decimal (ví dụ `"0.00"`, `"0.10"`). Schema mobile trước đây yêu cầu `number`, gây lỗi cấu trúc và ẩn số dư. Hợp đồng mới chấp nhận chuỗi số hợp lệ hoặc số hữu hạn, không đổi dữ liệu thiếu thành 0. Số dư âm do clawback vẫn được hiển thị; quyền rút lấy từ backend.

Customer có form nạp ví theo API hiện có. Màu vàng be, RN styles trong TSX, không thêm CSS. Lịch sử ưu tiên nhãn theo `referenceType` để nạp ví/thanh toán không bị hiển thị thành hoa hồng/rút tiền do loại ledger dùng chung.

## Luồng nạp

- **payOS:** nhập số tiền nguyên 10.000–50.000.000 đ, tạo yêu cầu, hiển thị QR và thông tin ngân hàng từ server. QR sinh cục bộ, không gửi nội dung sang dịch vụ ảnh. Link checkout chỉ mở HTTPS trên đúng host `pay.payos.vn`, không chuyển bearer token sang trình duyệt.
- Kiểm tra giao dịch đang chờ trước khi tạo. Poll trạng thái mỗi 8 giây khi app foreground và còn mở. Khôi phục yêu cầu khi mở lại ví. Khi backend trả `PAID`, tải lại số dư/ledger; không tự cộng số dư trên client và không coi redirect là thanh toán thành công.
- Hủy mã/đổi tiền phải được backend xác nhận. Giữ yêu cầu nếu timeout, thiếu tiền hoặc đang xử lý. Không tự retry POST khi kết quả chưa chắc chắn; có bước kiểm tra giao dịch đang chờ.
- **Thử nghiệm:** chỉ hiển thị khi server cho phép. Có xác nhận trước khi nạp. Backend chặn role khác Customer, chặn production dù flag bật, và từ chối NaN/Infinity/số thập phân/vượt hạn mức. Vẫn dùng transaction và ledger service sẵn có.

## Cấu hình

`backend/.env` cục bộ đã bật `ALLOW_DEMO_WALLET_TOPUP=true` theo yêu cầu. `.env.example` dùng mặc định `false`. Không đưa secret vào app, tài liệu hoặc Git.

Cấu hình nhóm đang được giữ; bổ sung các khóa pool/simulation/BIDV được gửi. Đường dẫn `BIDV_SANDBOX_KEY_DIR` được cung cấp thuộc máy khác và không tồn tại trên máy hiện tại. Nạp ví dùng payOS, không phụ thuộc chứng thư BIDV. Chưa kiểm thử payout BIDV hoặc thay đổi logic payout trong đợt này.

## Các bước người dùng nghiệm thu

1. Customer → Tôi → Ví SCANMS. Xem số dư, tạm giữ và lịch sử; không còn thông báo lỗi cấu trúc.
2. Chọn **Thử nghiệm** → nhập `10000` → **Nạp tiền thử nghiệm** → xác nhận nếu muốn ghi giao dịch test vào DB nhóm. Số dư tăng đúng 10.000 đ và có dòng lịch sử “Nạp ví thử nghiệm”. Mở lại ví/web cùng tài khoản để đối chiếu.
3. Thử số tiền dưới 10.000, quá 50.000.000 hoặc không phải số nguyên; UI phải báo lỗi.
4. Chọn **Chuyển khoản payOS** → nhập tiền → tạo mã. Kiểm tra QR, số tiền, nội dung, hạn và nút mở payOS. Đây là luồng nhận tiền thật; chỉ chuyển khoản khi chủ động nghiệm thu.
5. Chưa chuyển tiền: bấm kiểm tra không được tăng ví. Thoát/mở lại ví phải tìm thấy yêu cầu còn mở. Chọn hủy/đổi số tiền chỉ trở về tạo mới khi server xác nhận.
6. Nếu chủ động chuyển đủ tiền: chờ server xác nhận `PAID`, đối chiếu số dư/ledger; kiểm tra nhiều lần không được cộng lặp. Chuyển thiếu tiền phải giữ trạng thái chờ nhận đủ.
7. KOL vẫn xem ví/hoa hồng, ngân hàng và rút theo Shop như trước; không có nạp thử nghiệm. Shop dùng màn tài chính hiện hành.

## Kiểm tra đã thực hiện

- 57 test mobile; TypeScript và oxlint qua.
- 65 test BE thuộc 5 suite ví/payOS, bao gồm integration HTTP cô lập (DTO, role, production, transaction) và kiểm tra thanh toán thiếu/đủ, hủy, timeout, idempotency.
- Build backend qua; backend đang chạy lại với cấu hình cục bộ.
- Android: số dư hiển thị lại, form payOS/thử nghiệm, nhãn ledger và hộp xác nhận. Trong lúc kiểm tra sau HMR, phát sinh một mã payOS 100.000 đ đang chờ; đã kiểm tra QR native và thực hiện hủy mã. Không gửi nạp thử và không chuyển khoản thật.
- Không reset/seed DB, không đổi mật khẩu, không sửa hay xóa lịch sử ví.

QR encoder dùng API từ [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator/tree/master/js); mở URL/clipboard theo [Expo Linking SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/linking/) và [Expo Clipboard SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/clipboard/).
