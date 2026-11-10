# Khắc phục sau kiểm tra hồi quy — 09/11/2026

Phạm vi: 6 vấn đề trong báo cáo Post-Fix Audit gần nhất. Giữ nguyên các thay đổi có sẵn; không thêm thư viện, sửa file CSS nguồn, đổi schema/migration, seed lại dữ liệu hoặc commit/push Git.

## Trạng thái

| # | Vấn đề | Trạng thái | Nguyên nhân và cách sửa |
| --- | --- | --- | --- |
| 1 | Deal hết hạn biến phần KPI thành tiền cơ sở | Partially Fixed | Checkout lưu ID deal vào snapshot giá từng dòng. Ghi nhận thu nhập ưu tiên ID này; đơn cũ đối chiếu thời điểm mua thay vì ngày giao. Test 450.000đ × 16% giữ 45.000đ cơ sở + 27.000đ chờ KPI. Deal lịch sử đã đóng hoặc snapshot không đối chiếu được sẽ báo cần đối soát, không tự quyết định kết quả KPI. Chưa tự sửa các khoản đã ghi sai trước đây. |
| 2 | Trộn hoàn theo tiền và hoàn từng món làm lệch cơ sở/KPI | Fixed | Phân chia phần thù lao còn lại theo tỷ lệ cơ sở/tỷ lệ áp dụng đã lưu, thay vì tính lại từ nguyên giá. Test hoàn 50% rồi trả một đơn vị thu hồi đúng 5.000đ cơ sở + 3.000đ KPI. Thiếu tỷ lệ gốc thì chặn và yêu cầu đối soát. |
| 3 | Thứ tự khóa ngược giữa mua và hủy đơn | Fixed | Hủy khóa toàn bộ sản phẩm theo ID tăng dần, loại trùng, trước khi hoàn vào ví; cùng thứ tự với checkout. Test xác nhận tất cả khóa sản phẩm xảy ra trước thao tác ví. Chưa chạy giao dịch đồng thời trên PostgreSQL thật. |
| 4 | KOL và các vai trò mua sắm lỗi voucher đã lưu/loading | Fixed | Cho đủ 5 vai trò truy cập các thao tác mã đã lưu của chính mình; vẫn lấy userId từ JWT. Trang voucher dùng ID người mua ở mọi vai trò; query bị tắt không còn báo đang tải. HTTP với DB thật: 3 API đọc mã đã lưu đều 200 cho đủ 5 vai trò, không đăng nhập trả 401. |
| 5 | Deal bị trùng khi dữ liệu thay đổi giữa các trang | Fixed | Thêm cursor theo createdAt + id cho Mine/Shop và truyền mốc sang lần đọc tiếp theo. Không phụ thuộc dòng tại mốc còn tồn tại. Giữ API số trang và dạng mảng cũ. Client phát hiện cursor lặp, ID trùng hoặc phân trang cũ đổi tổng để tránh nhận danh sách sai. |
| 6 | Select mở bằng chuột rồi nhấn mũi tên không chuyển focus | Fixed | Khi đang mở, mũi tên chuyển focus trực tiếp; khi đóng, ghi nhớ hướng mở. ArrowUp không có lựa chọn hiện tại đi tới cuối. Hủy timer focus tìm kiếm khi đóng. Test chạy handler component với hook/ref giả lập, chưa thao tác trên trình duyệt thật. |

`Fixed` ở đây có căn cứ source/test được liệt kê; không có nghĩa đã kiểm thử mọi tương tác trên trình duyệt hoặc thực hiện giao dịch tài chính thật.

## Các file đã chỉnh trong đợt này

### Backend

- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/orders/customer-cancellation.spec.ts`
- `backend/src/modules/commissions/commissions.service.ts`
- `backend/src/modules/commissions/commissions.service.spec.ts`
- `backend/src/modules/commission-rules/item-clawback.ts`
- `backend/src/modules/commission-rules/tests/item-clawback.spec.ts`
- `backend/src/modules/commission-rules/tests/selected-return-settlement.spec.ts`
- `backend/src/modules/affiliate-deals/deal-cursor.ts` (mới)
- `backend/src/modules/affiliate-deals/affiliate-deals.service.ts`
- `backend/src/modules/affiliate-deals/affiliate-deals.controller.ts`
- `backend/src/modules/affiliate-deals/deal-pagination.spec.ts`
- `backend/src/modules/coupons/coupons.controller.ts`
- `backend/src/modules/coupons/tests/voucher-permissions.spec.ts`

### Frontend

- `frontend/src/components/ui/Select.tsx`
- `frontend/src/hooks/useCustomerVouchers.ts`
- `frontend/src/pages/customer/CustomerVouchersTab.tsx`
- `frontend/src/utils/paged-deals.ts`
- `frontend/src/services/referral-links.service.ts`
- `frontend/tests/paged-deals.test.mjs`
- `frontend/tests/select-keyboard-regression.test.mjs` (mới)
- `frontend/tests/voucher-buyer-regression.test.mjs` (mới)

## Kết quả kiểm tra

- Backend full unit suite: **192 suite / 1.919 test đạt**, 3 suite / 59 test bỏ qua.
- Sau điều chỉnh cuối, 8 suite liên quan: **72 test đạt**; ca khóa nhiều sản phẩm được chạy lại riêng: **6 test đạt**.
- Frontend: **244 test đạt, 106 bỏ qua**, không có test thất bại.
- Typecheck và build cả hai phần đạt. Backend được build lại sau thay đổi cuối. Frontend còn cảnh báo chunk lớn hơn 500 kB.
- Frontend lint: **0 error, 78 warning**. Backend lint toàn bộ, không tự sửa: **6.275 error**, trong đó 6.225 định dạng và 50 lỗi rule khác; nợ lint cũ chưa được xử lý ngoài phạm vi. Các module lõi thuộc bản sửa đã chạy ESLint; một số file coupon cũ còn lỗi lint có sẵn.
- `git diff --check` đạt; không thay đổi `.css`, `.scss`, `.sass` nguồn.
- HTTP smoke test chạy module Coupons với controller/guard/service và DB thật, cache tắt: CUSTOMER, COLLABORATOR, SHOP_MANAGER, SYSTEM_MANAGER, SYSTEM_ADMIN đều đọc 3 API mã đã lưu thành công; anonymous nhận 401. Không kiểm thử ghi mã đã lưu lên DB, không tạo/hủy/hoàn đơn thật. Test dùng JWT tạm thời cho các tài khoản demo có sẵn, không phải kiểm thử màn hình đăng nhập.

## Desktop, Tablet và Mobile

Không thay đổi style, bố cục hay breakpoint trong đợt sửa này. Phần UI thay đổi ở focus Select, trạng thái tải voucher và dữ liệu danh sách.

Kết nối trình duyệt vẫn báo `The browser access host is unavailable`. Vì vậy các mức **320, 375, 390, 430, 768, 1024, 1280, 1440, 1920px chưa được xác minh trực quan**. Các test hook, render và handler không thay thế kiểm thử trình duyệt.

## Các kiểm tra còn lại

1. Trên DB demo được phép ghi: hoàn 50% theo số tiền rồi hoàn từng món; đối chiếu tiền khách, snapshot và cả hai giỏ tiền KOL.
2. Mua và hủy đồng thời bằng cùng ví, cùng sản phẩm; kiểm tra không deadlock và không hoàn hai lần.
3. Kiểm tra chuột, cảm ứng, Tab/Shift+Tab, ArrowUp/Down, Enter, Escape của Select trong modal ở đủ 9 kích thước.
4. Kiểm tra voucher khi chuyển giữa 5 tài khoản, reload và mất kết nối; quyền lưu/xóa vẫn phải giới hạn ở người dùng hiện tại.
5. Với khoản thu nhập đã ghi trước bản sửa hoặc deal đã đóng: vận hành cần đối chiếu sổ cái và quyết định KPI trước khi hiệu chỉnh. Bản sửa không tự thu hồi, chi thêm hay viết lại số dư cũ.
