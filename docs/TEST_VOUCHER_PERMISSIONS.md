# Nghiệm thu mục 7: Phân quyền voucher

## Thay đổi đã áp dụng

- Bỏ hai ngoại lệ tài khoản Shop demo. Mọi Shop đều phải là chủ sở hữu đúng gian hàng.
- Chỉ SHOP_MANAGER của gian hàng được tạo voucher từ ngân sách Shop và duyệt đề xuất KOL. Voucher được duyệt theo luồng này luôn SHOP_FUNDED, Shop 100%, Sàn 0%.
- Shop không được sửa voucher PLATFORM_FUNDED/CO_FUNDED hoặc voucher có tỷ lệ Sàn tài trợ đã lưu lớn hơn 0. Không thể lách bằng cách bỏ `fundingSource` khỏi request hay đổi về SHOP_FUNDED.
- API cập nhật kiểm tra trạng thái và nguồn tài trợ của bản ghi tại lúc ghi, để thao tác cũ không ghi đè một lệnh khóa vừa xảy ra.
- Khi khóa, lưu trạng thái trước đó trong `status_before_block`. Khi mở khóa, mã chưa được duyệt trở lại PENDING_APPROVAL; mã PAUSED vẫn PAUSED; mã ACTIVE đã được duyệt trở lại ACTIVE nếu chưa hết hạn. Mã hết hạn không được kích hoạt lại. API từ chối mở khóa mã chưa bị khóa và từ chối khóa lặp để tránh mất trạng thái gốc.
- Với mã cũ không có trạng thái trước khi khóa: chưa có bằng chứng duyệt thì về PENDING_APPROVAL; đã có bằng chứng duyệt nhưng không biết trạng thái cũ thì về PAUSED để không tự ý chạy lại ưu đãi. Không chỉnh trạng thái các mã cũ hàng loạt.
- KOL chỉ xóa đề xuất PENDING_APPROVAL/REJECTED. KOL không thể xóa mã ACTIVE/BLOCKED hoặc kích hoạt mã PAUSED chưa có bằng chứng Shop duyệt.
- Kho Voucher Customer tiếp tục dùng API thật. Đọc/bỏ lưu được giới hạn theo tài khoản Customer hiện tại.

Quyền quản trị sẵn có của SYSTEM_MANAGER trong nhóm API Admin vẫn được giữ; nhóm này cùng SYSTEM_ADMIN có quyền giám sát/tài trợ theo chính sách hiện tại của hệ thống. Riêng tạo và duyệt mã lấy ngân sách Shop bắt buộc đúng chủ Shop.

## 1. Đề xuất KOL phải chờ Shop

1. Đăng nhập KOL → **Trung tâm Tiếp thị → Voucher**, hoặc `/collaborator/coupons`.
2. Chọn gian hàng đã hợp tác, nhập một mã chưa trùng và gửi đề xuất.
3. Kỳ vọng trạng thái **Chờ duyệt**. Customer chưa được dùng mã này để giảm tiền.
4. KOL không có thao tác tự kích hoạt. Gọi API KOL tạm dừng/tiếp tục cho mã đang chờ duyệt cũng phải bị từ chối.
5. Đăng nhập đúng chủ Shop → **Khuyến mãi & Hoa hồng → Voucher → Chờ duyệt** → mở đúng đề xuất.
6. Chọn giảm 5%, đơn từ 200.000 đ, trần giảm 30.000 đ, ngân sách 1.000.000 đ, tối đa 20 lượt. Duyệt.
7. Kỳ vọng mã chuyển ACTIVE; phần tài trợ luôn Shop 100%, Sàn 0%. Admin không dùng API duyệt Shop để bỏ qua bước này.

## 2. Shop không được quản lý Shop khác

1. Dùng hai tài khoản Shop A và Shop B.
2. Ghi lại storeId của A, rồi đăng nhập B và thử gọi API danh sách/tạo/duyệt voucher của A.
3. Kỳ vọng **403**, không thay đổi voucher A. Hai tài khoản Shop demo trước đây cũng chịu quy tắc này.

## 3. Không sửa tiền tài trợ Sàn bằng tài khoản Shop

1. Admin tạo voucher Sàn cho Shop A ở trang **Giám sát tiếp thị → Voucher**.
2. Đăng nhập Shop A. Thử PATCH `/stores/{storeId}/coupons/{couponId}/policy` với riêng `budgetTotal`, hoặc `discountValue`, hoặc `fundingSource: SHOP_FUNDED`.
3. Kỳ vọng **403**, ngân sách và mức giảm giữ nguyên. Admin có thẩm quyền vẫn chỉnh sửa được theo API quản trị hiện tại.

## 4. Khóa/mở khóa không thay bước duyệt

1. KOL tạo đề xuất mới, giữ trạng thái PENDING_APPROVAL.
2. Admin khóa đề xuất đó, rồi mở khóa.
3. Kỳ vọng trở lại **Chờ chủ Shop duyệt**, không phải ACTIVE. Thông báo mở khóa phải nêu trạng thái này.
4. Lặp lại với một mã đã được Shop duyệt ACTIVE: khóa rồi mở, mã chưa hết hạn trở lại ACTIVE.
5. KOL tạm dừng một mã đã duyệt thành PAUSED; Admin khóa rồi mở. Kỳ vọng vẫn PAUSED, không tự chạy lại.
6. Nếu mã hết hạn trong khi bị khóa, mở khóa không làm mã có hiệu lực trở lại.

## 5. Kho Voucher Customer dùng dữ liệu thật

1. Đăng nhập Customer → **Kho Voucher**, hoặc `/customer/vouchers`.
2. Lưu một mã, chuyển tab **Đã lưu**, tải lại trang: mã vẫn còn nếu còn khả dụng.
3. Bỏ lưu rồi tải lại: mã không còn trong tab Đã lưu.
4. Đăng nhập Customer khác: không thấy danh sách đã lưu của tài khoản trước.

## Kiểm tra đã hoàn tất

- 347 kiểm thử thuộc 22 nhóm đạt, gồm 24 ca mới về phân quyền, vòng đời và dữ liệu đã lưu Customer.
- Audit thực thi service/RolesGuard trên dữ liệu giả: **18 đạt, 0 lỗi**. Chạy `node scripts/audit-voucher-permissions.cjs` trong backend.
- Backend/frontend build thành công; Prisma Client đã tạo lại.
- Đã áp dụng migration bổ sung `status_before_block`, chỉ thêm cột, không cập nhật dữ liệu cũ. Không thay đổi đơn hàng, hoa hồng hoặc lượt dùng voucher.
- Chưa chạy toàn bộ các bước đăng nhập/chuyển vai trò trực tiếp trên trình duyệt; các bước trên dành cho nghiệm thu giao diện thực tế.
