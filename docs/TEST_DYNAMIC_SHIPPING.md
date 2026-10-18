# Kiểm thử mục 4 Word — Phí vận chuyển động

Ngày sửa: 16/10/2026. Phạm vi là phí vận chuyển, không phải hoa hồng hoặc voucher.

## Thay đổi đã áp dụng

- Checkout lấy cước GHN theo kho Shop và địa chỉ nhận; backend báo giá lại khi chốt đơn, không tin cước do khách gửi.
- Nếu thiếu báo giá, mất dịch vụ GHN, cước không phải số hữu hạn hoặc cước âm: chặn đặt hàng, không mặc định 0 đ. Giá 0 hợp lệ do GHN trả vẫn được chấp nhận.
- Customer trả tổng tiền hàng sau ưu đãi + cước GHN sau Freeship. GHN thu cước từ người gửi để không thu ship lần hai từ khách. COD đơn mua bằng tổng cuối cùng; thanh toán trước thì COD 0.
- Gửi mẫu: người gửi trả cước GHN (`payment_type_id=1`), KOL COD 0. Bắt buộc dùng kho và SĐT thực đã cấu hình.
- Mỗi vận đơn mẫu mới có một bản ghi cước, Shop chịu 100%, giữ lịch sử nếu gửi lại. GHN thiếu cước thì ghi `PENDING_CONFIRMATION`, số tiền `null`, vẫn giữ mã vận đơn đã tạo để không khuyến khích bấm tạo lại. Không tự trừ ví Shop hoặc đánh dấu đã thanh toán.
- Giao diện Quản lý đơn hàng → Hàng mẫu KOL và Mạng lưới KOL → Hàng mẫu đều hiện trách nhiệm trả phí/cước đã ghi nhận.
- Database đã thêm `sample_shipping_charges`. Đơn/vận đơn cũ giữ nguyên, không gán cước giả cho lịch sử.

## 1. Kiểm tra cước đơn mua trên giao diện

1. Mở `http://localhost:5173/merchant/settings` bằng tài khoản chủ Shop Cococ. Kiểm tra **Kho lấy hàng xuất đi (GHN)** và số điện thoại liên hệ đã lưu đúng.
2. Dùng tài khoản Customer mở sản phẩm, chọn mua để vào thanh toán. Chọn 1 sản phẩm, tạm không dùng voucher để dễ đối chiếu.
3. Chọn tỉnh/thành, quận/huyện, phường/xã và nhập đầy đủ địa chỉ đường. Đợi trạng thái tính cước kết thúc.
4. Kiểm tra dòng vận chuyển có cước. Ví dụ: tiền hàng 200.000 đ, GHN trả 29.001 đ → tổng phải là **229.001 đ**. Không bắt buộc luôn là 29.001 đ, phải lấy số GHN trả tại lúc thử.
5. Đổi sang địa chỉ khác. Cước cũ không được dùng để đặt hàng khi địa chỉ mới đang được tính; cước/tổng cập nhật sau khi nhận kết quả. Hai địa chỉ có thể cùng giá theo hợp đồng GHN.
6. Nếu muốn thử lỗi mà không thay kho thật của Shop: mở DevTools → Network → chọn Offline, sửa địa chỉ nhận. Checkout phải báo chưa tính được cước và không cho đặt hàng. Chuyển Online và tính lại để tiếp tục.
7. Khi chủ động đặt một đơn kiểm thử, so sánh tổng xác nhận và chi tiết đơn với tổng checkout. Nếu cước thay đổi giữa hai bước, tổng backend lúc chốt là giá được lưu.

## 2. Kiểm tra gửi mẫu

Nếu GHN trả lỗi vượt giới hạn tạo đơn, đó là hạn mức tài khoản GHN Production, không phải hạn mức cấp mẫu của sản phẩm. Cả hai modal Shop hiện lỗi đầy đủ ngay trong form; yêu cầu giữ trạng thái chờ gửi, chưa ghi cước/vận đơn và chưa bắt đầu SLA. Tạo mẫu hiện dùng GHN thật; Test nhanh của đơn bán hàng không tự áp dụng cho luồng mẫu. Cần giải quyết hạn mức với GHN để phát hành mẫu thật; bấm thử lại nhiều lần không thay đổi hạn mức hãng.

1. KOL gửi yêu cầu mẫu bằng địa chỉ nhận và SĐT thật hợp lệ.
2. Chủ Shop mở `http://localhost:5173/merchant/kol-hub?tab=samples`, chọn đúng KOL → **Hàng mẫu** → duyệt yêu cầu.
3. Mở thao tác gửi mẫu. Hộp thoại phải ghi **Shop thanh toán 100% phí ship · KOL COD 0 đ**.
4. Nút tạo vận đơn mẫu hiện gọi GHN **LIVE**. Chỉ bấm khi bạn thực sự muốn phát hành vận đơn; bước này có thể phát sinh dịch vụ/cước GHN. Muốn kiểm tra logic mà không phát hành thật, dùng bộ test ở mục 3.
5. Nếu tạo thành công, kiểm tra mã GHN và cước đã ghi nhận trên thẻ mẫu. Tải lại trang, dữ liệu phải còn. Trong Quản lý đơn hàng → **Hàng mẫu KOL**, tổng cước mẫu cũng được cập nhật.
6. Nếu GHN chưa trả cước hợp lệ, mã vận đơn vẫn được lưu nhưng phải hiện **còn cước chưa xác nhận**, không coi là đã miễn phí hoặc đã thanh toán. Đơn cũ chưa có sổ cước hiện **Chưa có dữ liệu cước**.
7. Đối chiếu đơn trên tài khoản GHN: người gửi trả cước, COD bằng **0**. KOL không phải thanh toán phí ship/tiền mẫu.

## 3. Bộ kiểm thử tự động an toàn

Từ thư mục `backend`:

```powershell
node scripts/audit-dynamic-shipping.cjs
node node_modules/jest/bin/jest.js --runInBand --silent "--testPathPatterns=ghn.service.spec|voucher-margin|orders.service.spec|samples.service.spec|checkout-alias"
```

Audit đạt 8/8. Các test tạo vận đơn đều giả lập transport GHN, không tạo vận đơn thật và không ghi dữ liệu đơn thử vào database. Bao gồm thiếu/âm/null/sai kiểu cước, cước 0 hợp lệ, COD mua hàng, thanh toán trước, COD mẫu 0, lưu cước mẫu chưa xác nhận, gửi lại và chặn Shop khác.

## Bằng chứng và giới hạn

- API đang chạy được gọi lại sau sửa: Cococ, kiện 500 g, khai giá 250.000 đ tới Quận 1 → 29.001 đ, `isRealGhn=true`.
- Kiểm thử sau sửa: **444/444 test, 26 suite** liên quan hoa hồng, voucher, checkout, GHN và hàng mẫu đạt; audit vận chuyển **8/8**; build backend và frontend đạt.
- Kiện hàng hiện vẫn dùng quy cách chung 500 g mỗi sản phẩm, 15×10×5 cm; chưa tự lấy thông số Shop lưu trong mô tả sản phẩm. Cước cuối hãng cân đo có thể khác báo giá.
- Chưa thao tác thanh toán/gửi mẫu thật từ trình duyệt trong lượt sửa này. Chưa đối soát hóa đơn thực tế với GHN.
