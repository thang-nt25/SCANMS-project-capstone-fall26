# Báo cáo trước khi sửa: Voucher và bảo vệ biên lợi nhuận

**Cập nhật sau khi sửa ngày 16/10/2026:** Các lỗi liệt kê bên dưới đã được xử lý trong mã; 323 kiểm thử thuộc 21 nhóm đạt, audit mục 6 đạt 7/7 và backend/frontend build thành công. Đã chuẩn hóa 14 cấu hình voucher cũ, xác nhận không sửa dữ liệu đơn, hoa hồng và lượt dùng voucher. Xem [hướng dẫn kiểm thử sau khi sửa](TEST_VOUCHER_MARGIN_PROTECTION.md). Nội dung bên dưới lưu lại kết quả kiểm tra ban đầu, không mô tả trạng thái mã hiện tại.

Ngày kiểm tra: 16/10/2026. Phạm vi: mã giao diện, API, luồng checkout chính và cũ, tính hoa hồng, vòng đời voucher Live. Chưa thao tác mua hàng trên trình duyệt và chưa xác nhận cấu hình từng voucher thực tế trong cơ sở dữ liệu. Đợt này kiểm tra, chưa sửa nghiệp vụ hoặc dữ liệu.

## Kết luận

**Chưa đạt đầy đủ yêu cầu Word.** Các chức năng nền đã có, nhưng còn lỗi nối giao diện Campaign, quy tắc cộng voucher và các trường hợp Net GMV.

| Yêu cầu | Kết quả | Căn cứ |
| --- | --- | --- |
| Deal VIP kèm mã thương hiệu KOL | Đã có trong mã và kiểm thử | Shop duyệt Deal tạo coupon phần trăm, gắn KOL/sản phẩm và link. Mặc định 5%, đơn tối thiểu 200.000 đ; Shop cấu hình ngân sách, hạn dùng và hạn mức. `affiliate-deals.service.ts:504`, DTO duyệt Deal. |
| Voucher chung của Campaign | Backend có, giao diện chưa hoàn chỉnh | `ShopCouponsPage.tsx:1183` chọn CAMPAIGN nhưng không có trường chọn/gửi `campaignId` trong trang. Backend `coupons.service.ts:1090` bắt buộc ID nên tạo từ lựa chọn này sẽ bị từ chối. |
| Voucher Live chỉ hiệu lực khi Live | Đã có cho luồng chính | Tạo coupon của phiên, có ngày bắt đầu/kết thúc; kiểm tra trạng thái LIVE và lời mời ACCEPTED, sản phẩm thuộc phiên. Kiểm thử voucher phiên PAUSED bị từ chối. Tuy nhiên còn lỗi kết hợp voucher Sàn và reset đơn chưa thanh toán bên dưới. |
| Cấm hai voucher tiền hàng cùng Shop | Checkout chính có một ô/một mã; API kiểm tra chưa khóa tuyệt đối | DTO và giao diện chỉ gửi một mã Shop/KOL. Tuy nhiên `validateCoupon` chỉ chặn `hasShopVoucher` khi `stackableWithShopVoucher=false`; API tạo/duyệt/sửa vẫn cho bật true. Chưa chứng minh checkout chính thực tế trừ hai lần, nhưng quy tắc kiểm tra chưa đúng lệnh cấm tuyệt đối. |
| Một voucher tiền hàng + một Sàn + một Freeship | Có ba ô nhưng chưa đạt mọi trường hợp | Coupon Live được tạo với `stackableWithPlatformVoucher=false`, nên ghép với voucher Sàn bị từ chối. Shop/KOL voucher khác cũng có thể được cấu hình cấm ghép Sàn. |
| Freeship chỉ trừ cước GHN | Đúng ở luồng checkout chính | Preview và transaction dùng cước vận chuyển làm cơ sở và chặn giảm vượt cước. Mã shipping không được nhập vào ô tiền hàng. Hoa hồng snapshot mới không trừ Freeship khỏi tiền hàng. |
| Hoa hồng tính trên Net GMV | Đúng trường hợp đơn giản; còn sai ở giỏ hỗn hợp/luồng phụ | Đơn mới trừ voucher tiền hàng rồi tính hoa hồng. Nhưng toàn giỏ dùng chung tỷ lệ giảm, không phân bổ theo phạm vi sản phẩm của voucher. GMV xét hạng và fallback hoa hồng cũ còn dùng tổng giảm gồm cả ship. |

## Các lỗi cần xử lý

### 1. Voucher Campaign chưa tạo được từ lựa chọn trên giao diện

Thao tác tái hiện: Shop → quản lý voucher → tạo voucher → **Chiến dịch Sale** → điền thông tin → phát hành. Không có ô chọn chiến dịch, trong khi backend yêu cầu `campaignId`. API tạo voucher Campaign đã có; cần nối dữ liệu và bộ chọn chiến dịch vào form.

### 2. Quy tắc cấm chồng voucher Shop còn phụ thuộc cấu hình

Audit gọi service thật với voucher `stackableWithShopVoucher=true`, request `hasShopVoucher=true`: vẫn trả hợp lệ và giảm 12.500 đ. Word yêu cầu từ chối bất kể cấu hình. Đây là lỗi ở API validate; checkout chính hiện có một slot Shop nên chưa kết luận đã phát sinh trừ hai voucher Shop thực tế.

### 3. Voucher Live không ghép được voucher Sàn

`live-sessions.service.ts:370` tạo voucher Live với `stackableWithPlatformVoucher=false`. Audit gọi validate với voucher LIVE/ACCEPTED và `hasPlatformVoucher=true`: bị từ chối. Cần thống nhất chính sách ghép với voucher Sàn theo Word và xử lý cấu hình voucher đã tồn tại.

### 4. Voucher giới hạn sản phẩm bị chia giảm giá cho cả giỏ

`orders.service.ts:1616` tính một `txDiscountRatio` cho toàn đơn, rồi nhân cho mọi sản phẩm ở dòng 1700. Ví dụ suy ra từ công thức hiện tại:

- A: 250.000 đ, hoa hồng 15%; B: 250.000 đ, hoa hồng 10%.
- Voucher 50.000 đ chỉ áp dụng A.
- Đúng theo Net GMV từng sản phẩm: A 200.000 × 15% + B 250.000 × 10% = **55.000 đ**.
- Công thức hiện tại chia đều giảm giá: A 225.000 × 15% + B 225.000 × 10% = **56.250 đ**.

Đây là phân tích mã, chưa tạo đơn thực tế cho ví dụ này.

### 5. Freeship còn ảnh hưởng GMV xét hạng và fallback hoa hồng

`tiers.service.ts:65` trừ `discountAmount`, trong khi `orders.service.ts:1859` lưu trường này gồm tiền hàng và ship. Audit đơn hàng 250.000 đ, giảm tiền hàng 20.000 đ, giảm ship 25.000 đ: GMV đúng **230.000 đ**, service trả **205.000 đ**. Lỗi này cũng liên quan chức năng cấp bậc đã sửa ở mục 5.

`commissions.service.ts:173` cũng truyền tổng discount này cho calculator khi tính dòng đơn cũ chưa có snapshot. Các dòng đã có snapshot được giữ nguyên và không bị tính lại theo nhánh đó.

### 6. Reset đơn Live chưa thanh toán có thể xóa cả ưu đãi khác

Nhánh `repriceUnpaidOrders` trong `live-sessions.service.ts:1101` tính lại tổng thành `subtotal + shipping`, đặt `discountAmount` và `couponDiscountAmount` về 0, không giữ riêng các voucher Sàn/Freeship đang đi kèm. Cần chỉ bỏ voucher Live và tính lại các ưu đãi còn hợp lệ; không xóa các khoản giảm không thuộc phiên. Đây là phát hiện qua mã, chưa chạy tình huống trình duyệt.

### 7. Endpoint checkout cũ chưa có luồng voucher

`POST /checkout` vẫn tạo đơn theo `quantity × unitPrice`, không nhận/xử lý voucher hoặc cước GHN. Checkout mới dùng OrdersService có đầy đủ hơn. Cần thống nhất hoặc giới hạn endpoint cũ để tránh hai luồng tính tiền khác nhau. Chưa kết luận giao diện hiện tại gọi endpoint cũ.

## Bằng chứng kiểm thử

- 9 nhóm kiểm thử hiện có: **66/66 đạt**.
- Script `backend/scripts/audit-margin-protection.cjs`: **4 đạt, 3 không đạt**. Chạy service thật trên dữ liệu giả, không ghi database.
- Ba ca không đạt: kiểm tra tuyệt đối hai voucher Shop; ghép voucher Live với voucher Sàn; GMV xét hạng bị trừ cả Freeship.
- Script chạy bằng `node scripts/audit-margin-protection.cjs` từ thư mục backend. Script xuất FAIL để báo chênh lệch nghiệp vụ; chưa phải kết quả test đã sửa lỗi.
- Các phát hiện khác được xác định bằng đọc mã; chưa tuyên bố kiểm thử đầu cuối.
