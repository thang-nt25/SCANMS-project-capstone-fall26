# Báo cáo trước khi sửa mục 7: Phân quyền và nơi tạo voucher

**Cập nhật sau khi sửa ngày 16/10/2026:** Ba lỗi đã được xử lý. Audit bổ sung đạt **18/18**, bộ kiểm thử liên quan đạt **347/347 thuộc 22 nhóm**, backend/frontend build thành công. Shop tạo/duyệt mã bằng ngân sách Shop chỉ dành cho chủ Shop; Admin không thể thay bước duyệt của Shop. Đã thêm cột lưu trạng thái trước khi khóa, không cập nhật các bản ghi cũ. Xem [hướng dẫn nghiệm thu sau khi sửa](TEST_VOUCHER_PERMISSIONS.md). Nội dung dưới đây lưu kết quả trước khi sửa, không mô tả mã hiện tại.

Kiểm tra ngày 16/10/2026. **Chưa đạt đầy đủ mục 7 trong Word.** Đã có bốn giao diện, kết nối API và bảo vệ vai trò, nhưng còn ba lỗ hổng nghiệp vụ/phân quyền được tái hiện bằng service thật trên dữ liệu giả.

Lượt này chỉ kiểm tra và thêm script audit; không thay đổi quyền, nghiệp vụ hay dữ liệu database.

## Từng yêu cầu

| Yêu cầu Word | Kết quả đối chiếu |
| --- | --- |
| Shop tạo/duyệt tại ShopCouponsPage, POST `/stores/:storeId/coupons` | Đã có. Trang gọi `couponService.createStoreCoupon`, duyệt qua PATCH `:id/approve`. Controller có JwtAuthGuard + RolesGuard. |
| Shop tự chi 100%, có đơn tối thiểu, trần giảm, ngân sách và giới hạn lượt | Tạo mã Shop ghi cứng SHOP_FUNDED, Shop 100%, Sàn 0%. Form, DTO và service có các công cụ trên. Khi duyệt, Shop cũng không được chủ động chỉ định Sàn tài trợ. Tuy nhiên vẫn có lỗi sửa voucher đã được Sàn tài trợ ở dưới. |
| KOL đề xuất tại KolCouponsPage, POST `/collaborator/coupons` | Đã có, API giới hạn COLLABORATOR, service ghi cứng PENDING_APPROVAL. KOL không thể dùng nút tạm dừng/tiếp tục để kích hoạt đề xuất đang PENDING_APPROVAL. |
| Chỉ khi Shop duyệt mã KOL mới ACTIVE | Luồng thường đúng, nhưng Admin mở khóa mã bị khóa trước khi Shop duyệt sẽ đưa thẳng về ACTIVE. Chưa khóa tuyệt đối. |
| Admin giám sát toàn sàn, khóa khẩn cấp và tạo PLATFORM_FUNDED | Đã có trang, API và guard. Tạo voucher Sàn ghi cứng Sàn 100%, Shop 0%; có chức năng đối soát/ghi nhận chuyển hoàn cho Shop. Ghi nhận chuyển hoàn không đồng nghĩa hệ thống tự chuyển tiền ngân hàng. |
| Customer Kho Voucher dùng API thật thay bốn mã tĩnh | **Đã đúng về kết nối mã.** CustomerPortalPage render CustomerVouchersTab. Trang tải `/coupons/available`, `/coupons/saved`, `/coupons/saved/details`; có POST lưu và DELETE bỏ lưu theo tài khoản. Tab Đã lưu lọc theo dữ liệu API; không có danh sách bốn voucher hardcode. |

## Ba lỗi đã tái hiện

### 1. Ngoại lệ tài khoản Shop demo bỏ qua chủ sở hữu — mức cao

`backend/src/modules/coupons/coupons.service.ts:963` chứa hai ID Shop demo được phép vượt kiểm tra `store.ownerId`.

Audit dùng store thuộc `owner`, gọi kiểm tra truy cập bằng tài khoản Shop demo khác chủ: **được phép**, trong khi Shop thông thường bị từ chối đúng.

Ảnh hưởng: ngoại lệ áp dụng cho các thao tác sử dụng `verifyStoreAccess`, bao gồm xem, phát hành, duyệt, sửa chính sách và khóa voucher của Shop khác. Cần bỏ ngoại lệ và dùng quyền sở hữu/phân công quản lý thực tế.

### 2. Shop sửa được ngân sách voucher Sàn — mức cao

`coupons.service.ts:1550` cho ghi `budgetTotal`; kiểm tra phía sau chỉ từ chối khi request chủ động gửi `fundingSource=PLATFORM_FUNDED/CO_FUNDED` hoặc `platformFundingRate>0`. Không chặn dựa trên nguồn tài trợ đã lưu của coupon.

Audit: coupon đang ACTIVE, PLATFORM_FUNDED, thuộc store của Shop; Shop gửi riêng `{ budgetTotal: 999999999 }` qua `updateCouponPolicy`. Service **chấp nhận cập nhật**. Các trường mức giảm, điều kiện tối thiểu và hạn mức cũng nằm trong nhánh sửa này.

Cần giới hạn chỉnh sửa voucher Sàn/đồng tài trợ cho quyền có thẩm quyền tài chính, dựa trên dữ liệu coupon đã lưu.

### 3. Mở khóa có thể kích hoạt đề xuất KOL chưa duyệt — mức cao

`coupons.service.ts:1802`, `adminUnblockCoupon` không yêu cầu trạng thái hiện tại BLOCKED, không kiểm tra lịch sử duyệt và luôn đặt ACTIVE.

Audit: coupon KOL BLOCKED, `approvedBy=null`, `approvedAt=null`; gọi mở khóa trả ACTIVE. Trường hợp thực tế có thể xảy ra khi Admin khóa đề xuất đang chờ duyệt rồi mở lại.

Cần lưu/khôi phục đúng trạng thái trước khi khóa: đề xuất chưa duyệt trở lại PENDING_APPROVAL; không dùng mở khóa để bỏ qua bước duyệt Shop. API cũng phải từ chối mở khóa mã chưa bị khóa.

## Kiểm tra đã chạy

- 34 kiểm thử hiện có thuộc ba nhóm coupons.service, stacked-vouchers và campaign-voucher-margin: **đạt**.
- Audit bổ sung `backend/scripts/audit-voucher-permissions.cjs`: **13 đạt, 3 không đạt**, chạy RolesGuard thật cùng service thật với dữ liệu giả; không ghi database.
- Kiểm tra HTTP chỉ đọc trên backend đang chạy: các API saved voucher, KOL coupon, Admin coupon và Shop coupon đều trả **401** khi không đăng nhập.
- Chưa kiểm thử đăng nhập/chuyển vai trò và mua hàng trực tiếp trên trình duyệt. Chưa chạy bộ E2E có tạo/xóa dữ liệu PostgreSQL.

Chạy lại audit từ backend: `node scripts/audit-voucher-permissions.cjs`. Các kết quả FAIL mô tả chênh lệch với Word, không phải lỗi đã được sửa.

Lưu ý phạm vi vai trò: code hiện cho SYSTEM_MANAGER truy cập một số API cùng SYSTEM_ADMIN, và cho Admin duyệt voucher Shop. Word chỉ nêu nhóm System Admin; nếu cần tách quyền tài chính/duyệt chặt hơn giữa các vai trò này thì cần thống nhất chính sách cụ thể. Ba lỗi phía trên không phụ thuộc cách diễn giải này.
