# Đối chiếu mục 4: Tính phí vận chuyển động

**Cập nhật sau sửa ngày 16/10/2026:** Ba thiếu sót dưới đây đã được xử lý: kiểm tra cước ở GHN service, giao dịch đặt hàng và modal; bỏ kho/SĐT mặc định; lưu chi phí mẫu từng vận đơn trong `sample_shipping_charges`, bên chịu phí `SHOP`, COD 0. Cước thiếu được lưu là chưa xác nhận, không giả định miễn phí. Database đã bổ sung bảng, không sửa đơn cũ. Xem [hướng dẫn kiểm thử sau sửa](TEST_DYNAMIC_SHIPPING.md).

Phần bên dưới là **kết quả audit trước khi sửa**, được giữ để đối chiếu.

Kiểm tra ngày 16/10/2026. Phạm vi: modal checkout, API báo giá, backend chốt đơn, payload tạo vận đơn mua/mẫu và cấu hình host GHN (không xuất token).

**Kết luận:** Các luồng chính của yêu cầu đã được triển khai và API báo giá đang trả cước. Chưa nên xác nhận hoàn thiện toàn bộ: còn thiếu kiểm tra phản hồi cước, cấu hình kho của đơn mẫu và bằng chứng hạch toán chi phí mẫu theo từng Shop.

Lượt này chỉ kiểm tra, thêm script audit và ghi báo cáo. Không sửa nghiệp vụ, không tạo đơn hàng/vận đơn thật, không ghi database.

## Đối chiếu từng ý Word

| Yêu cầu | Hiện trạng |
| --- | --- |
| Bỏ gán cứng shippingFee = 0 | **Đã có trong luồng checkout chính.** Backend gọi `quoteCheckoutShipping`, lưu cước GHN và cộng vào tổng thanh toán. Nhánh giao dịch vẫn có `shippingQuote?.totalFee || 0`; không phải cước cố định trong luồng bình thường nhưng cần chặn dữ liệu báo giá lỗi trước khi đến đây. |
| Tự tính cước khi chọn địa chỉ | **Đã có.** Modal đợi tỉnh/huyện/phường và địa chỉ đường đầy đủ, tự gọi theo từng Shop; cộng tổng cước, hủy kết quả cũ khi đổi địa chỉ và chặn đặt hàng khi chưa có cước hoặc có lỗi. |
| API POST `/api/shipping/ghn/fee` | API tồn tại. Modal hiện gọi `/api/shipping/ghn/quote-address`, phân giải địa chỉ kho/nhận thành mã GHN rồi gọi cùng `calculateShippingFee`, gửi POST tới GHN `/v2/shipping-order/fee`. Đây là đường gọi trung gian, không phải bỏ kết nối GHN. |
| Customer trả ship đơn mua | **Đã tính vào đơn.** `finalAmount = tiền hàng − voucher tiền hàng + cước GHN − Freeship`. Với COD, tiền thu hộ lấy tổng cuối cùng đã chốt; với thanh toán trước, COD bằng 0. GHN dùng người gửi thanh toán cước cho hãng, tránh thu lại cước lần hai từ Customer. |
| Shop trả ship mẫu, KOL COD = 0 | **Đã có ở payload vận chuyển:** `payment_type_id=1`, `cod_amount=0`. Tuy nhiên phí trả về chỉ được trả cho client, chưa lưu/đối soát vào yêu cầu mẫu hoặc ví theo Shop. Xem lưu ý tài chính phía dưới. |

## Kiểm tra với backend và GHN đang chạy

Chỉ gọi API báo giá, không tạo vận đơn:

- Store Cococ, kiện 500 g, khai giá 250.000 đ, gửi tới địa chỉ Quận 1 TP.HCM: **29.001 đ**, gồm serviceFee 29.001 đ, insuranceFee 0, `isRealGhn=true`.
- Cùng kiện hàng gửi tới Ba Đình, Hà Nội: API cũng trả **29.001 đ**. Không ép kết quả khác nhau chỉ vì khác tỉnh; cần lấy đúng giá hợp đồng GHN trả về.
- Host cấu hình LIVE là `online-gateway.ghn.vn`; TEST là `dev-online-gateway.ghn.vn`.
- Các con số ~20k/~35k trong Word là ví dụ, không phải giá phải gán cố định.

Chưa thao tác toàn bộ luồng chọn địa chỉ và thanh toán trực tiếp bằng trình duyệt. Chưa kiểm tra đối soát hóa đơn GHN thực tế.

## Điểm cần hoàn thiện

### 1. Chưa kiểm tra totalFee của GHN

`ghn.service.ts:285` chỉ kiểm tra `code === 200` và có `data`, không kiểm tra `total` là số hữu hạn, không âm.

Audit gọi service thật với transport giả:

- `{code:200,data:{}}` vẫn được chấp nhận; backend chốt đơn có thể rơi về cước 0 ở `orders.service.ts:1738`. Modal bình thường chặn total không phải số, nhưng backend vẫn phải tự bảo vệ.
- `{code:200,data:{total:-10000}}` vẫn được chấp nhận. Modal chỉ kiểm tra hữu hạn, chưa chặn âm.
- Phản hồi lỗi GHN thông thường (`code:400`) đã bị từ chối đúng, không tự chuyển sang Freeship.

Cần kiểm tra kiểu dữ liệu/số hữu hạn/không âm ở service và lúc chốt đơn; thiếu báo giá phải báo lỗi, không tự dùng 0. Giá 0 thực sự do GHN trả về khác với giá trị bị thiếu.

### 2. Gửi mẫu vẫn có thể dùng kho và số điện thoại mẫu

`createSampleShippingOrder`, khoảng dòng 594, dùng địa chỉ SCANMS 123 Nguyễn Huệ và SĐT mặc định khi Shop thiếu cấu hình. Vì đã gán chuỗi mặc định nên kiểm tra thiếu địa chỉ/SĐT phía sau không ngăn được.

Audit xác nhận service vẫn gọi tạo vận đơn giả khi kho Shop trống. Báo giá đơn mua đã chặn thiếu kho; luồng mẫu cần thống nhất quy tắc này để GHN không đến nhầm kho.

### 3. Chưa đủ bằng chứng Shop đã chịu 100% chi phí mẫu trong sổ tài chính

Code dùng Token/ShopId GHN cấu hình chung. Payload người gửi trả cước và COD 0 bảo vệ KOL khỏi bị thu tiền; tuy nhiên `total_fee` chỉ được trả về, không được lưu cùng yêu cầu mẫu hoặc tạo khoản chi vận chuyển theo Shop trong transaction hiện tại.

Không thể từ `payment_type_id=1` kết luận sàn đã khấu trừ hoặc đối soát đủ 100% cho từng Shop. Nếu yêu cầu Word cần thể hiện trách nhiệm phí trên sàn, cần lưu bên chịu phí, cước GHN và chứng từ/đối soát tương ứng. Không tự suy diễn rằng nhất thiết phải trừ ví Shop nếu hệ thống chọn cơ chế thanh toán GHN ngoài sàn.

### Giới hạn độ chính xác đóng gói

Checkout và tạo vận đơn mua đang dùng 500 g mỗi sản phẩm, kiện 15×10×5 cm. Hai bước nhất quán nhưng chưa lấy thông số đóng gói Shop nhập trong sản phẩm. Cước tính qua GHN thật vẫn có thể khác cước hãng cân đo khi nhận hàng.

## Kiểm thử

- 91 kiểm thử thuộc 10 nhóm liên quan shipping, sample, order, voucher và checkout: **đạt**.
- Audit bổ sung `backend/scripts/audit-dynamic-shipping.cjs`: **5 đạt, 3 không đạt**, gồm hai ca cước bất thường và một ca thiếu kho mẫu.
- Script chỉ thực thi service với dữ liệu giả và giả lập transport GHN; không gửi yêu cầu tạo vận đơn thật.
- Chạy lại: `node scripts/audit-dynamic-shipping.cjs` từ backend.
