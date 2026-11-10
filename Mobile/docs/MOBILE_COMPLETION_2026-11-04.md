# Android — cập nhật luồng ví và mã KOL, 04/11/2026

Áp dụng quyết định mới của lead và mục 2.4 trong `docs/SCANMS_REALIGNMENT_BLUEPRINT.md`, mục 8.4 trong `docs/SCANMS_MASTER_REFACTORING_PLAN.md`. Không phát hành voucher Shop/Sàn/freeship. Chỉ dùng mã độc quyền của KOL; khách sao chép và tự nhập khi checkout trên web. Không lưu mã hoặc tự áp dụng từ link, live hay giỏ hàng.

## Đã bổ sung trong lượt này

- Customer: sửa lỗi đọc Decimal khiến toàn bộ số dư ví báo sai cấu trúc; nạp payOS có QR, sao chép thông tin, kiểm tra/hủy giao dịch, khôi phục giao dịch chờ. Nạp demo chỉ hiện khi backend cho phép ở môi trường phát triển, cần xác nhận riêng. Không suy ra đã nạp tiền từ việc quay lại app.
- KOL: đề xuất mã cho Shop đủ điều kiện, lọc trạng thái, sao chép; tạm dừng/kích hoạt lại mã đang dùng và xóa mềm đề xuất chờ duyệt/bị từ chối. Không thể tự mở khóa mã do vận hành khóa.
- Shop: sửa trạng thái chờ duyệt từ `PENDING` sang đúng `PENDING_APPROVAL`; duyệt/từ chối mã KOL, cấp/sửa hạn mức, ngân sách, hạn dùng và khóa mã. Không có nút tạo voucher Shop.
- Manager/Admin: danh sách mã KOL và thao tác khóa/mở khóa theo quyền; không có phát hành voucher sàn. Backend chặn việc kích hoạt lại mã bán lẻ cũ qua API.
- Discovery Customer có phiên bản cache mới và kiểm tra metadata `KOL_EXCLUSIVE` / `GOODS` / `SHOP_FUNDED`, tránh hiển thị cache voucher cũ. `SHOP_FUNDED` là nguồn ngân sách của mã KOL, không phải voucher bán lẻ do Shop phát hành.
- BE giữ các API lưu mã/stacking cũ để trả lỗi 410 rõ ràng; GET kho đã lưu trả mảng rỗng. Checkout kiểm tra chính sách cả trước và trong transaction. Không xóa đơn, redemption hay lịch sử đối soát đã có.
- Web đồng bộ chính sách để cùng backend không bị lệch: copy-only ở Shop/hồ sơ/chat/live, khách tự nhập ở checkout; bỏ bộ chọn voucher và phát hành Shop/Sàn. Seeder v5 chỉ dựng 20 mã KOL, không có freeship/kho mã đã lưu; **chưa chạy seed trên DB nhóm**.

## Kịch bản nghiệm thu theo role

### 1. CUSTOMER — mua sắm và tài khoản

1. Đăng nhập tài khoản Customer hiện có; ở **Trang chủ** kiểm tra sản phẩm, giá, rating/số đã bán, mở chi tiết, chọn phân loại và xem Shop.
2. Thêm sản phẩm vào giỏ, vào biểu tượng giỏ để đổi số lượng/xóa; đóng mở lại app rồi đối chiếu giỏ trên web cùng tài khoản.
3. Vào **Tôi → Sổ địa chỉ**: thêm địa chỉ GHN 3 cấp, đặt mặc định và mở lại để kiểm tra dữ liệu lưu server.
4. Vào **Trang chủ → Mã ưu đãi KOL**: chỉ thấy mã KOL, bấm **Sao chép mã** và thấy phản hồi đã sao chép. Không có nút Lưu/Dùng ngay. Mở lại app không xuất hiện kho mã đã lưu.
5. Trên web cùng tài khoản, vào checkout và tự dán mã; mã đúng giảm tiền theo kết quả server. Thử mã hết hạn/sai Shop/không đạt điều kiện: phải báo lỗi. Link có `?voucher=...` không tự điền hoặc tự áp dụng mã.
6. Vào **Ví SCANMS**: số dư và lịch sử tải bình thường. Mở form nạp, thử bỏ trống/số âm/số lẻ; nút gửi bị chặn hoặc hiển thị lỗi. Nếu tạo payOS để test, kiểm tra QR và trạng thái chờ, hủy giao dịch khi không thanh toán. Chỉ báo PAID và đổi số dư khi backend xác nhận. Nạp demo là giao dịch test riêng, không phải ngân hàng thật.
7. Vào **Đơn mua**: theo dõi, nhận hàng, đánh giá và yêu cầu đổi trả trên đơn đủ điều kiện. Xem bằng chứng, pickup, kiểm tra/refund và khiếu nại trong hồ sơ. Mở tin nhắn, kiểm tra trả lời của Shop và thông báo.

### 2. COLLABORATOR — mã KOL và hoa hồng

1. **Công cụ → Mã ưu đãi KOL → Đề xuất mã KOL**: chọn Shop đã hợp tác, nhập mã 4–20 ký tự có chữ và mức giảm hợp lệ. Chưa có Shop đủ điều kiện thì không gửi được.
2. Đề xuất thành công phải ở **Chờ duyệt**. Chuyển client Shop để duyệt, sau đó tải lại KOL và kiểm tra **Đang dùng** cùng chính sách đã duyệt.
3. Tạm dừng rồi kích hoạt lại; khách không thấy mã tạm dừng. Đề xuất bị từ chối/chờ duyệt có thể xóa mềm, mã đang dùng/bị khóa không có nút xóa.
4. Test các luồng đã tích hợp: hợp tác/VIP hai chiều, link/QR, hàng mẫu/video, hồ sơ KYC/kênh xã hội/tier. Ví hiển thị khả dụng/tạm giữ theo Shop; yêu cầu rút hiển thị gross/thuế/net và trạng thái server.

### 3. SHOP_MANAGER — duyệt mã và xử lý đơn

1. Chọn đúng Shop được phân công trong **Tôi**, vào **Công cụ → Mã ưu đãi KOL → Chờ duyệt**.
2. Mở đề xuất KOL vừa tạo, bấm **Duyệt & cấp ngân sách**, nhập mức giảm/hạn mức/hạn dùng. Thử lượt dùng `1.5`, ngân sách âm và ngày hết hạn quá khứ: phải bị chặn. Duyệt hợp lệ thì KOL/Customer thấy kết quả sau tải lại.
3. Với mã đang dùng, sửa chính sách/ngân sách hoặc khóa có lý do. Shop không tự mở khóa mã đã khóa bởi vận hành, không có phát hành voucher Shop.
4. Kiểm tra sản phẩm 6 khối/sửa SKU giá-tồn, MAP/khuyến mãi, đơn/GHN TEST, xử lý trả hàng/hàng mẫu, hợp tác/chat/VIP và payout có chứng từ. Đổi Shop phải tải dữ liệu đúng phạm vi mới.

### 4. SYSTEM_MANAGER — vận hành

1. **Công cụ → Mã ưu đãi KOL**: lọc và khóa/mở khóa có xác nhận. Mở khóa đề xuất chưa duyệt phải quay về chờ duyệt, không tự thành ACTIVE.
2. Kiểm tra duyệt sản phẩm khác người tạo, KYC, MAP/khuyến mãi, review, trọng tài mẫu/đổi trả và giám sát theo phân quyền backend.
3. Không thấy menu Nhân sự hoặc Duyệt ngoại lệ VIP của Admin; gọi API trái quyền phải bị từ chối.

### 5. SYSTEM_ADMIN — quản trị

1. Test các màn vận hành như Manager, sau đó nhân sự/phân công Shop và ngoại lệ VIP.
2. Không có tạo voucher sàn; thử client cũ phát hành/lưu/stacking phải bị chặn, không tạo giao dịch hay tiêu ngân sách.
3. Đăng xuất rồi đăng nhập role khác: dữ liệu đặc quyền và draft của phiên trước không còn hiển thị.

## Bằng chứng và giới hạn

| Kiểm tra | Kết quả |
| --- | --- |
| Mobile TypeScript / oxlint | PASS |
| Mobile unit/contract | 61/61 PASS |
| Backend coupon + checkout chọn lọc | 155/155 PASS, có HTTP routing/DTO/role guard, Prisma mock |
| Backend quyền/HTTP nạp ví, kiểm tra lại | 24/24 PASS, không gọi ngân hàng hoặc DB nhóm |
| Seed unit | 48 PASS; 10 PostgreSQL test bỏ qua, không gọi DB nhóm |
| Web unit | 206 PASS; 76 browser test bỏ qua |
| Backend / web build | PASS |
| Expo Android export | PASS, bundle `entry-d9eb7db21f4e7a51e6bb7208d915e255.hbc` |
| API đang chạy → DB nhóm, chỉ đọc | 19 mã khả dụng; 0 mã sai metadata KOL/GOODS/SHOP_FUNDED |
| Android Customer | Trang chủ, danh sách mã KOL và nút “Đã sao chép mã” hiển thị đúng sau thao tác |

Không coi bảng này là nghiệm thu mutation đủ 5 role. Customer được kiểm tra trên emulator với phiên hiện có; các bước KOL → Shop → Customer và duyệt tài chính cần người nghiệm thu chạy bằng các tài khoản được phân công. Không thay mật khẩu, reset DB hoặc tự đăng nhập các role bằng mật khẩu demo.

Thanh toán **đơn hàng** và livestream native vẫn thuộc giai đoạn sau đã thống nhất. Nạp ví payOS không có nghĩa checkout mobile đã hoàn thành. Những mục ngoài phạm vi đợt đầu còn gồm thiết kế lại ma trận SKU, onboarding/nâng role, analytics chuyên sâu, App Links/attribution, push khi app đóng và bản APK standalone ARM. Các luồng native còn lại và giới hạn gốc nằm trong [kịch bản 5 role](ROLE_WORKFLOWS_2026-11-03.md).
