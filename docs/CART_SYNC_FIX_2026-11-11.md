# Sửa lỗi đồng bộ giỏ hàng liên tục — 11/11/2026

## Nguyên nhân có bằng chứng

Log runtime ghi `PUT /api/customer/cart` thất bại tại `CustomerService.syncCart`, Prisma báo unique constraint `idx_unique_customer_cart_line`. Đọc metadata DB nhóm xác nhận index đúng trên `(user_id, product_id, variant_key)`; không cần xóa index hay sửa schema.

Luồng cũ thay toàn bộ giỏ bằng `deleteMany` rồi `createMany` trong transaction nhưng không khóa theo chủ giỏ. Hai transaction đồng thời có thể cùng xóa trước khi insert và xung đột index. Frontend còn gửi lại giỏ khi chỉ thay ảnh/giá/tồn và mỗi lỗi đều tạo toast mới.

## Bản sửa

- Backend khóa dòng `users` của chính user từ JWT bằng `SELECT ... FOR UPDATE` trong cùng transaction, trước delete/insert. Dòng user luôn tồn tại kể cả khi giỏ trống, nên các lần thay giỏ cùng tài khoản được tuần tự hóa.
- Không dùng `skipDuplicates` để che xung đột hoặc mất dòng; không bỏ ràng buộc unique.
- Frontend so sánh product/variant/quantity với lần đồng bộ thành công; chỉ cập nhật metadata thì không PUT lại.
- Refresh ảnh giữ nguyên state nếu URL thực tế không đổi, tránh vòng lặp render/request không cần thiết.
- Một đợt mất đồng bộ chỉ có một thông báo lỗi cho tài khoản. Khi lưu thành công thì xóa cảnh báo; giỏ vẫn giữ cục bộ khi API lỗi. Vẫn giữ kiểm tra phiên/tài khoản và hủy request cũ.

## Xác minh

- 2 suite backend liên quan: **30 test đạt**.
- PostgreSQL 18 test riêng mới tạo trong `.dev-runtime`, localhost:55481: chạy method `CustomerService.syncCart` đã build với transaction thật. Bỏ khóa trong harness tái hiện P2002; có khóa thì hai lần lưu cùng tài khoản thành công, không trộn hai snapshot; tài khoản khác không bị ghi đè; xóa giỏ song song với lưu không lỗi. Catalog/đọc trình bày được dùng fixture, phần transaction và cart persistence là PostgreSQL thật. Cluster đã dừng sau test, không ghi DB nhóm cho ca này.
- Browser Edge với API mock: hydrate giỏ không echo PUT, đổi giá/tồn không PUT, hai lần đổi số lượng khi API 500 vẫn giữ localStorage và chỉ có một thông báo, API hồi phục lưu được và bỏ cảnh báo. **1 browser test đạt**, không tạo đơn/thanh toán.
- Frontend suite: **243 đạt, 107 bỏ qua**, không thất bại; browser test trên đã chạy riêng với cấu hình trình duyệt.
- Build frontend/backend đạt. Backend runtime đã nạp lại, health `UP` / DB `CONNECTED`; web HTTP 200.
- ESLint trên hai file customer vẫn báo các lỗi định dạng Prettier; không tuyên bố lint toàn bộ hai file đã sạch và không tự format diện rộng ngoài phần sửa lỗi.
- Không migration/reset/seed, không thêm CSS hoặc thư viện, không xóa giỏ trên thiết bị.

## UAT trên web

1. F5 trang hiện tại, giữ nguyên tài khoản và localStorage.
2. Vào giỏ, tăng/giảm số lượng một sản phẩm hợp lệ; reload để đối chiếu số lượng còn đúng.
3. Mở hai tab cùng tài khoản và thử lưu giỏ gần đồng thời; không được trả P2002/500. Đây là thao tác thay toàn bộ snapshot, lần ghi cuối cùng thắng, không phải cơ chế gộp chỉnh sửa nhiều thiết bị.
4. Tiếp tục gửi/duyệt hồ sơ KOL. Đăng ký KOL không phải nguyên nhân lỗi giỏ này.
