# Hoàn tất sửa phân trang, tìm kiếm và KPI chi trả Shop — 26/10/2026

Ba lỗi được ghi nhận ở `FINANCIAL-DISPLAY-AUDIT-2026-10-26.md` đã được người dùng duyệt và xử lý trong đợt này.

## Kết quả

1. Phân trang dựa vào tổng kết quả và limit từ API, không dựa vào số dòng đang xem. 25 lệnh đi được qua 3 trang.
2. Tìm kiếm được chạy ở backend trước phân trang, kết hợp bằng AND với dropdown trạng thái và thẻ KPI. Không còn bỏ qua từ khóa khi chọn KPI. Đổi lọc/từ khóa đưa về trang 1, xóa lựa chọn cũ.
3. KPI do backend tổng hợp trên toàn Shop, độc lập với bảng đang lọc/trang hiện tại. “Đã duyệt hôm nay” lọc `processedAt` trong khoảng 00:00–00:00 hôm sau UTC+7, đầu bao gồm/cuối không bao gồm.
4. “Thuế đã giữ” chỉ cộng snapshot thuế của lệnh APPROVED; không cộng lệnh PENDING/REJECTED. Bộ lọc TAX dùng cùng tiêu chí.
5. “Cần bổ sung KYC” chỉ tính lệnh PENDING/PROCESSING có profile chưa xác minh hoặc không có profile; bộ lọc KYC dùng cùng tiêu chí.
6. Nếu trang cuối hết dữ liệu sau lọc/duyệt/từ chối, backend tự giới hạn về trang cuối còn hợp lệ; frontend đồng bộ số trang trả về.
7. Dữ liệu bảng, tổng và KPI được đọc trong transaction RepeatableRead để không ghép số liệu từ các thời điểm khác nhau. Không thay nghiệp vụ phê duyệt, bill, ghi sổ, thuế hay hoàn tiền.
8. Số tiền tổng hợp giữ dạng Decimal/string; frontend định dạng chuỗi chính xác, không rút gọn mất số lẻ thành “triệu”. Chế độ fixture chỉ tồn tại khi được bật rõ ở DEV, không dùng số trang thật để giả làm tổng KPI.

## API tương thích

`GET /api/stores/:storeId/payouts` vẫn hỗ trợ `page`, `limit`, `status`. Bổ sung:

- `search`: tối đa 200 ký tự, tìm tên/email/số điện thoại KOL, ngân hàng, người thụ hưởng, số tài khoản, mã giao dịch; UUID yêu cầu dùng mã đầy đủ (không LIKE trên cột UUID).
- `filter`: `ALL`, `PENDING`, `APPROVED` (đã duyệt hôm nay), `TAX`, `KYC`.
- Response thêm `totalPages` và `summary` toàn Shop: pending, approvedToday, withheldTax, kycPendingCount, timezone và mốc ngày.
- Kiểm tra quyền sở hữu Shop vẫn chạy trước khi đọc dữ liệu tài chính. Không thêm endpoint công khai.

## Cách kiểm tra giao diện

1. Chủ Shop → Ví & Chi trả KOL. Khi trên 10 lệnh, thử nút Sau/Trước; footer hiển thị số dòng/tổng kết quả và trang/tổng trang.
2. Tìm KOL có lệnh ngoài trang đầu; phải tìm được mà không cần tự qua từng trang.
3. Bấm Chờ phê duyệt rồi nhập tên KOL; kết quả phải thỏa cả hai điều kiện.
4. Bấm Đã duyệt hôm nay; lệnh duyệt hôm trước không xuất hiện. KPI toàn Shop vẫn giữ nguyên khi đổi trang/từ khóa.
5. Đổi dropdown trạng thái khi đang chọn KPI: hai điều kiện kết hợp, kể cả khi giao nhau cho ra 0 kết quả. Có thể bỏ thẻ KPI để xem lại toàn bộ trạng thái đã chọn.
6. Khi dữ liệu giảm khiến trang cuối không còn tồn tại, bấm tải lại: phải tự về trang hợp lệ.

Không cần và không nên xử lý lệnh thật chỉ để kiểm tra phân trang; dùng fixture/test sandbox cho tình huống duyệt/từ chối.

## Kiểm chứng đã thực hiện

- Backend đầy đủ: **1.444 test đạt**, 129 suite đạt; 56 test/2 suite integration vẫn bỏ qua theo cấu hình an toàn.
- Frontend đầy đủ: **191 test đạt**, browser test opt-in được bỏ qua nếu thiếu cấu hình.
- Chrome headless mới: đạt tình huống 25 lệnh, 3 trang, tìm kiếm kết hợp KPI, chỉ duyệt hôm nay, KPI không đổi theo trang và dữ liệu giảm từ 25 xuống 20 khiến trang 3 được trả về trang 2.
- Kiểm tra service với database trong transaction `SET TRANSACTION READ ONLY`: truy vấn danh sách/aggregate hợp lệ, summary đúng scope STORE và timezone, số tiền dạng chuỗi; tìm kiếm không khớp ở trang 999 được trả về trang 1.
- Backend và frontend build production thành công. Frontend còn cảnh báo chunk lớn hơn 500 kB.
- Không migration, không sửa `.env`, không tạo/duyệt/từ chối payout thật và không sửa lịch sử tài chính.

## Tái chạy

```powershell
# backend/
npm.cmd test
npm.cmd run build

# frontend/
npm.cmd test
npm.cmd run build
$env:GHN_UI_TEST_URL='http://127.0.0.1:5173'
node --test tests/merchant-payout-pagination.browser.test.mjs
```
