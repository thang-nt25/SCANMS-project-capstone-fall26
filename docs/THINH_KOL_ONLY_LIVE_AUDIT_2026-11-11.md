# Đồng bộ dev, loại bỏ voucher sai luồng và sửa bonus Live

## Phạm vi workspace

- Workspace: `D:/ProjectCapstone`; backend NestJS/Prisma, frontend React/Vite và Mobile Expo.
- Đã lấy `origin/dev` ở `08453743`, merge vào `thinh` tại `b5984595`, không conflict.
- Không có thư mục `be/order-service` hoặc file `CheckoutServiceImpl.java` được nhắc trong IDE; báo cáo này chỉ áp dụng repository hiện có.

## Voucher KOL nhập tay

- Xóa state, props, effect tự áp mã từ link/giỏ/livestream và tham số mã tự áp trong CartContext.
- Checkout chỉ kiểm tra mã sau thao tác nhập tay/Áp dụng qua `/coupons/validate`, theo từng cửa hàng. Không gửi `platformCouponCode`, `shippingCouponCode` hoặc bản đồ mã sàn/ship khi đặt đơn.
- Giữ `liveSessionId` của sản phẩm trong payload để ghi nhận đúng nguồn Live; không đánh đồng tracking Live với việc áp voucher.
- Bỏ preview voucher sàn/vận chuyển khỏi utility checkout, không fallback thử các loại voucher cũ khi mã KOL không hợp lệ.
- Gỡ hai component Admin phát hành/đối soát voucher sàn không còn được route/import sử dụng.
- Bỏ banner freeship SCANMS, lời mời lưu voucher, quà miễn phí và giảm giá cố định không có dữ liệu xác nhận trong giao diện livestream. Cước giao hàng vẫn lấy từ GHN theo địa chỉ.
- Chat giữ nội dung tin nhắn lịch sử nhưng không cho sao chép mã sàn/ship/co-funded có metadata xác định. Mã KOL có hướng dẫn sao chép và tự nhập, không lưu vào tài khoản.
- Backend đã chặn chức năng lưu/phát hành voucher cũ bằng `GoneException`; giữ cơ chế chặn tương thích này và không xóa dữ liệu lịch sử/schema.
- Mobile đã dùng mã KOL copy/nhập tay và không có thao tác lưu voucher; không thêm màn/chức năng mới.

## Bonus livestream

Phát hiện: khi đơn vừa có Deal KPI vừa có bonus Live, phần tiền vượt tỷ lệ tiêu chuẩn bị tính toàn bộ vào conditional escrow. Điều này giữ cả thưởng Live theo KPI dù Live là thưởng phụ trợ đã chốt tại lúc mua.

Sửa tại `commission-escrow-split.ts` và `CommissionsService`:

- Dùng snapshot `appliedCommissionRate` và `regularCommissionRate` trước Live để suy ra đúng phần Live đã thực sự áp dụng, kể cả khi bị chặn ở trần 25%.
- Tiền tiêu chuẩn + bonus Live vào pending escrow 14 ngày. Phần chênh lệch Deal còn lại vào conditional escrow chờ KPI theo luồng hiện có.
- Chia trên số tiền commission đã tính, không tính lại từ giá sản phẩm hiện tại; giữ tổng tiền và phần điều chỉnh do hoàn một phần, làm tròn bằng Prisma Decimal.
- Không đổi mức bonus, trần 25%, điều kiện phiên Live hoặc quy tắc duyệt Deal; không sửa hồi tố các commission đã ghi sổ.

Ví dụ: đơn 1.000.000 đ, tiêu chuẩn 10%, Deal 16%, Live +2% → tổng 180.000 đ; pending 14 ngày 120.000 đ và chờ KPI 60.000 đ. Khoản Live 20.000 đ không bị giữ theo KPI.

## Kiểm tra thực tế

- Backend build qua; 199 unit-test suite / 1.974 test qua; 3 suite / 59 test được skip theo cấu hình. Nhóm test tập trung bonus/KOL: 8 suite / 182 test qua.
- ESLint các file commission sửa qua; lint frontend chạy thành công nhưng còn cảnh báo có sẵn, không khẳng định zero-warning toàn dự án.
- Frontend build TypeScript/Vite qua; 243 test qua, 106 browser test chưa cấu hình được skip.
- Browser checkout riêng trên Edge với toàn bộ API mock qua: mở không gọi API coupon, bỏ qua mã cũ trong props/giỏ Live, nhập KOL10 mới validate, giảm 20.000 đ trên tiền hàng, giữ phí GHN 21.001 đ, hủy mã trả tổng về 221.001 đ. Không gọi saved/preview-stacked hay tạo đơn.
- Mobile: TypeScript, lint và 87 test qua sau merge dev. Rà soát riêng Mobile: không có API lưu/nhận voucher, stacking hoặc freeship trong source; mã checkout khởi tạo rỗng và chỉ áp dụng khi khách nhập rồi bấm Áp dụng. Bỏ ba cờ legacy `hasProductDiscount`, `hasShopVoucher`, `hasPlatformVoucher` khỏi payload validate; kiểm thử bổ sung xác nhận không nhập mã thì không gọi API coupon, giữ nguyên cước GHN. Màn mã chỉ khám phá/sao chép KOL, không phải kho mã đã lưu. Chưa chạy lại nghiệm thu trực quan Android trong lượt rà soát này.
- Không thêm CSS hoặc thư viện. Web dùng Tailwind hiện có, màu vàng be.
- Chỉ sinh Prisma Client; không chạy migration/reset/seed, không ghi giao dịch/đơn hoặc thay đổi dữ liệu DB nhóm trong lượt QA.
