# Hướng dẫn test 7 chức năng trong Word trên giao diện SCANMS

Đối chiếu phần văn bản người dùng gửi ngày 17/10/2026. Đây là hướng dẫn nghiệm thu trên web; không có thao tác tạo đơn, phát hành voucher hoặc gửi tin nhắn được thực hiện thay người dùng trong lượt viết hướng dẫn này.

## Chuẩn bị một lần

1. Mở http://localhost:5173 và nhấn **Ctrl+F5**.
2. Dùng các hồ sơ trình duyệt riêng cho **Shop Cococ**, **KOL**, **Customer**, **Admin**. Các tab cùng một hồ sơ dùng chung đăng nhập; không đăng nhập bốn vai trò bằng bốn tab thường trong cùng hồ sơ.
3. Chọn cùng một sản phẩm Cococ có giá **250.000 đ**, số lượng **1**, không giảm giá trực tiếp; ví dụ “thời trang 3.0” nếu giá hiện tại vẫn là 250.000 đ. Ghi lại tên/SKU. Khi test hàng mẫu, sản phẩm phải được bật **Cho phép xin mẫu**, còn hạn mức và chưa có yêu cầu đang xử lý của KOL đó.
4. KOL cần KYC đã duyệt và có kênh mạng xã hội. Customer cần địa chỉ nhận hợp lệ. Shop cần lưu kho lấy hàng và SĐT ở http://localhost:5173/merchant/settings.
5. Chỉ dùng địa chỉ/SĐT thực tế của bạn cho các thao tác có thể phát hành vận đơn thật. **Test nhanh** ở đơn mua là GHN Staging; nút tạo vận đơn **hàng mẫu hiện dùng GHN thật**.
6. Ghi lại từng mã đơn và các điều kiện lúc đặt. Mỗi lần đổi Deal/Campaign/Live/voucher phải tạo **đơn mới** để so sánh; đơn cũ giữ dữ liệu lúc chốt.

## 1. Địa chỉ khi KOL xin mẫu

**KOL:** mở http://localhost:5173/collaborator/collaboration?tab=products → chọn **Cococ** → **Sản phẩm** → **Xin mẫu thử**.

Điền lần lượt:

| Ô | Cách điền |
| --- | --- |
| Kênh đăng video | Chọn một kênh đã liên kết của chính KOL |
| Định dạng review | `Video review sản phẩm 60 giây` |
| Họ tên người nhận | Họ tên thực tế người nhận |
| Số điện thoại nhận hàng | Số di động người nhận đang dùng |
| Tỉnh / Thành | Chọn nơi bạn nhận hàng |
| Quận / Huyện | Chọn trong danh sách sau khi đã chọn tỉnh |
| Phường / Xã | Chọn sau khi đã chọn huyện |
| Số nhà, tên đường… | Số nhà/đường thực tế; có thể thêm tầng và căn hộ sau dấu phẩy |
| Xác nhận | Tích xác nhận SĐT và cam kết video |

Bấm **Gửi Cam Kết & Xin Mẫu**. Kỳ vọng yêu cầu xuất hiện ở **Hàng mẫu**, trạng thái chờ duyệt. Chưa bắt đầu hạn 14 ngày.

Kiểm tra lỗi cũ:

1. Bấm **Sửa thông tin** của yêu cầu vừa tạo. Các phần tầng/căn hộ phải còn nguyên.
2. Đổi tỉnh. Huyện/xã cũ phải trống ngay; không chọn được danh sách cũ trong lúc tải.
3. Chọn lại đủ ba cấp và thay địa chỉ chi tiết bằng một địa chỉ thực tế khác. Bấm **Lưu thay đổi & Gửi lại Shop**.
4. Sang Shop: http://localhost:5173/merchant/kol-hub?tab=samples → chọn đúng KOL → **Hàng mẫu** → **Thông tin nhận hàng & cam kết**. Bấm **Làm mới thông tin nhận hàng** nếu đã mở trang từ trước.
5. Đối chiếu từng phần tên, SĐT, số nhà, tầng/căn hộ, phường, huyện, tỉnh với lần sửa mới nhất.
6. Mở thêm http://localhost:5173/merchant/orders?tab=samples → tab **Hàng mẫu KOL** → mở **Thông tin nhận hàng** tại hàng sản phẩm. Hai màn hình Shop phải cùng thông tin.
7. Thử bỏ trống địa chỉ hoặc nhập SĐT sai: không được gửi thành công.

**Đạt khi:** không còn địa chỉ Sunrise City điền sẵn; lựa chọn ba cấp đồng bộ; Shop thấy đúng dữ liệu mới. SĐT hiện xác nhận bằng checkbox và kiểm tra định dạng, chưa có OTP chứng minh chủ thuê bao.

## 2. Hàng mẫu đang giao và hạn video 14 ngày

Dùng tiếp yêu cầu mục 1.

1. Shop vào http://localhost:5173/merchant/kol-hub?tab=samples → chọn KOL → **Hàng mẫu** → **Duyệt mẫu**. Yêu cầu chuyển sang đã duyệt/chờ gửi.
2. Mở **Tạo vận đơn GHN**. Đối chiếu thông tin nhận hàng và dòng **Shop chịu phí ship, KOL COD 0 đ**. Nút tạo mẫu gọi GHN thật; chỉ phát hành nếu bạn thực sự có kiện mẫu cần giao.
3. Khi đã có vận đơn và mẫu ở trạng thái **Đang giao**, sang KOL → Cococ → **Hàng mẫu**.
4. Kỳ vọng có mã GHN và **Theo dõi hành trình bưu kiện**; không có **Đã nhận được hàng**, **Nộp Link Video Review**, hoặc đếm hạn 14 ngày từ lúc Shop gửi.
5. Bấm theo dõi. GHN còn chờ lấy/đang chuyển/đang giao → mẫu vẫn chưa RECEIVED.
6. Khi GHN xác nhận giao thành công và có thời điểm giao hợp lệ, tải lại/theo dõi lại. Backend còn có lịch kiểm tra 10 phút nếu chưa nhận callback.
7. Kỳ vọng mẫu thành **Đã nhận · chờ video**, mở **Nộp Link Video Review**, hạn đúng **giờ giao GHN + 14 ngày**. Ví dụ nhận 17/10/2026 10:00 → hạn 31/10/2026 10:00.
8. Tải lại nhiều lần: hạn không được kéo dài. Bấm **Nộp Link Video Review** để kiểm tra form; khi thực sự nộp, dùng link video công khai bạn sở hữu.

**Không phải lỗi:** GHN chưa delivered hoặc thiếu thời điểm giao thì chưa mở nộp video. Chỉ tạo mã Staging không giúp hoàn tất mục này; hệ thống không có nút mô phỏng trên web để ép nhận mẫu.

## 3. Hành trình GHN trên Customer và trang tra cứu

Dùng một đơn **mua hàng**, khác yêu cầu hàng mẫu.

1. Customer mua sản phẩm, ghi lại mã dạng `DH-…` và SĐT đặt hàng.
2. Shop vào http://localhost:5173/merchant/orders → tìm mã đơn → xử lý/xác nhận đơn để mở hộp **Giao bưu cục**.
3. Chọn **Test nhanh** để tạo vận đơn Staging. Không nhập mã demo hoặc tự đặt mã vào ô vận đơn để thay cho mã GHN trả về.
4. Customer vào http://localhost:5173/customer/orders → mở đúng đơn → xem khung GHN. Phải có mã và nhãn **GHN Staging · dữ liệu kiểm thử, không giao hàng thật**.
5. Mở http://localhost:5173/tracking → nhập **SĐT đặt hàng** và **mã đơn SCANMS DH-…** → **Tra Cứu Đơn**. Hai màn hình phải tra cùng vận đơn và môi trường.

Đối chiếu khi GHN có dữ liệu:

| GHN đã ghi nhận | Giao diện cần hiện |
| --- | --- |
| Lấy hàng | Bưu tá đã lấy hàng tại kho Shop |
| Vào kho | Nhập kho trung chuyển |
| Đang phát | Shipper đang đi giao; tên/SĐT và nút gọi nếu GHN cung cấp |
| Phát xong | Giao hàng thành công và thời gian tương ứng |

Bấm **Làm mới**; hành trình đang vận chuyển còn tự kiểm tra khoảng 30 giây khi mở tab.

**Giới hạn cần ghi vào biên bản:** Staging thường chỉ có trạng thái chờ lấy hàng, không tự chạy đủ hành trình sau khi bấm Test nhanh. Muốn nghiệm thu đủ bốn mốc và liên hệ shipper trên web phải dùng vận đơn đã có các dữ liệu đó từ GHN. Nếu GHN không cấp SĐT/tên thì không được yêu cầu UI bịa tên/số mẫu. Không dùng nút Shop tự xác nhận giao để coi như đã test webhook GHN.

## 4. Cước vận chuyển động

1. Shop kiểm tra kho tại http://localhost:5173/merchant/settings; có số nhà/đường, phường, huyện, tỉnh và SĐT, đã **Lưu thay đổi**.
2. Customer mở sản phẩm đã chọn, vào thanh toán; chưa áp voucher.
3. Chọn/nhập đủ địa chỉ nhận ba cấp; đợi tính cước xong.
4. Ghi **tiền hàng**, **cước GHN**, **tổng thanh toán**. Kỳ vọng tổng = tiền hàng + cước. Ví dụ 250.000 + 29.001 = **279.001 đ** nếu GHN thực sự trả 29.001 đ.
5. Đổi sang địa chỉ hợp lệ khác. Trong lúc tính, không được chốt theo cước cũ; sau khi xong tổng phải cập nhật. Cước hai địa chỉ có thể bằng nhau theo hợp đồng, không bắt buộc luôn 20k/35k.
6. Khi tạo đơn kiểm thử, sang **Đơn mua** và Shop **Quản lý Đơn hàng** đối chiếu phí ship và tổng tiền của cùng mã đơn.
7. Đối chiếu mục 2: đơn mua Customer trả ship; đơn mẫu Shop trả 100%, KOL COD **0 đ**.

**Đạt khi:** cước có nguồn GHN và đi vào tổng; lỗi tính cước không bị biến thành miễn phí 0 đ. Có thể kiểm tra tổng checkout trước khi đặt nếu chưa muốn tạo thêm đơn.

## 5. Hoa hồng cộng dồn — test từng tầng

### Chuẩn bị link đúng và chỗ xem kết quả

1. KOL mở http://localhost:5173/collaborator/profile?tab=tiers → ghi cấp bậc và thưởng: Đồng **0%**, Bạc **1%**, Vàng **2%**, Kim Cương **3%**. Gọi phần thưởng này là **T**.
2. Shop mở http://localhost:5173/merchant/products → bấm bút sửa sản phẩm. **Hoa hồng KOL & Mẫu thử** phải là **10% chuẩn sàn**, không có ô cho Shop nhập 15/30%. Đóng form, không cần đổi giá.
3. KOL tạo link được lưu thật tại http://localhost:5173/collaborator/marketing?tab=links → mở tạo link → chọn sản phẩm → **Tiếp tục** → chọn kênh, nhập nhãn `TESTWORD1710` nếu form yêu cầu → **Tạo link tiếp thị** → sao chép link kết quả.
4. Mở link vừa tạo trong hồ sơ trình duyệt Customer, đăng nhập Customer nếu cần; mua đúng sản phẩm, số lượng 1. Chưa áp voucher. Không gõ lại đường dẫn sản phẩm trần làm mất nguồn KOL.
5. Sau mỗi đơn, Shop mở http://localhost:5173/merchant/orders → tìm mã đơn → xem cột **Hoa hồng CTV**, tên KOL và chi tiết **Thanh toán & hoa hồng → Hoa hồng KOL ghi nhận**. Đây là nơi đối chiếu số tiền, không dùng tổng ví khả dụng làm kết quả tức thời.

**Lưu ý đường lấy link:** nút popup “Lấy Link Tiếp Thị” tại kho Shop còn nhánh dựng URL `?ref=kol`. Để nghiệm thu hoa hồng, dùng luồng **Link & QR tiếp thị** đã lưu link thật ở bước 3 hoặc link VIP cấp sau duyệt. Không dùng URL có đúng chuỗi `ref=kol` làm bằng chứng đã ghi nhận KOL.

### A. Chỉ nền và cấp bậc

Chọn sản phẩm chưa có Deal, Campaign hoặc Live đang hiệu lực cho KOL đó. Đặt đơn mới, gọi là **Đơn A**.

- Tổng tỷ lệ = **10 + T**.
- Nếu Vàng T = 2: **12%**, hoa hồng trên 250.000 đ = **30.000 đ**.
- Nếu Đồng: **10%**, hoa hồng = **25.000 đ**. Không lấy số Vàng để so với tài khoản Đồng.

### B. Deal phải qua Shop duyệt

1. KOL vào Cococ → **Sản phẩm → Đề xuất Deal hoa hồng riêng với Shop**.
2. Chọn thưởng **+2%**. Điền kỳ hạn **3 tháng**, mục tiêu **10 đơn**, doanh số **2.500.000**, kế hoạch `1 video review sản phẩm 60 giây`; tích cam kết review và gửi đề xuất. Form số đơn hiện tối thiểu 10, không nhập 1.
3. Shop chưa duyệt: Customer đặt **Đơn B** qua link KOL. Kỳ vọng vẫn như A: **10 + T**.
4. Shop mở http://localhost:5173/merchant/campaigns → phần **Deal độc quyền/đề xuất Deal** → tìm đúng KOL và sản phẩm. Đây là danh sách có các ô cấu hình voucher kèm Deal, không chỉ thẻ chat cũ.
5. Điền voucher VIP: giảm **5%**, đơn tối thiểu **200000**, giảm tối đa **50000**, lượt **20**, ngân sách **1000000**, hiệu lực **30 ngày** → **Duyệt link & mã**.
6. Ghi mã VIP và link VIP được cấp thực tế. Sang KOL kiểm tra Deal đã duyệt; dùng link VIP hoặc link đã lưu đúng KOL để Customer đặt **Đơn C**, tạm chưa áp voucher.
7. Kỳ vọng tỷ lệ = **10 + T + 2**. Vàng: **14% → 35.000 đ**.

### C. Campaign có thời hạn và ngân sách

1. Shop tại http://localhost:5173/merchant/campaigns → **Tạo Chiến Dịch Mới**.
2. Điền: tên `TESTWORD1710`, thưởng thêm **2**, ngân sách thưởng **100000**, bắt đầu **ngày hôm nay**, kết thúc **ngày mai** → **Tạo chiến dịch**.
3. **Mời KOL Tham Gia**. Form hiện yêu cầu ID KOL: mở **Mạng lưới KOL & Hợp tác**, chọn KOL; trên URL sao chép phần sau `kol=` và trước `&`, dán vào **ID của KOL/CTV muốn mời**, rồi gửi lời mời.
4. KOL vào Cococ → **Tin nhắn** → mở thẻ lời mời Campaign → **Chấp nhận tham gia**. Nếu thẻ có **Tạo Link Tiếp Thị Chiến Dịch**, dùng link đó để Customer mua.
5. Đặt **Đơn D** trong thời hạn; không voucher. Kỳ vọng tỷ lệ = **10 + T + 2 Deal + 2 Campaign**. Vàng: **16% → 40.000 đ**.
6. Trên thẻ Campaign, ngân sách thưởng dùng tăng **5.000 đ** cho mỗi đơn 250.000 đ đủ điều kiện ở mức +2%, không phải toàn bộ hoa hồng 40.000 đ.
7. Campaign chưa tới giờ, đã kết thúc hoặc dừng thì đơn mới không cộng +2%. Kiểm tra trạng thái thực tế hiển thị trước khi đặt.

### D. Thưởng Live chỉ khi LIVE

1. Shop vào http://localhost:5173/merchant/live-sessions → **Tạo phiên live & Voucher mới**.
2. Tên `TESTLIVE1710`; nền tảng **Sàn SCANMS Live**; chọn đúng KOL, đúng sản phẩm 250.000 đ; bắt đầu gần hiện tại, kết thúc sau **60 phút**.
3. Cấu hình voucher Live: loại **Giảm số tiền cố định (₫)**, mức **15000**, tổng lượt **20**, lượt mỗi khách **1**; chọn mức thưởng Live **+3%**. Mô tả/thư mời/ảnh có thể để trống; bấm **Tạo phiên & Kích hoạt Voucher**. Khi áp mã, kiểm tra điều kiện thực tế trên thẻ voucher của phiên.
4. KOL vào http://localhost:5173/collaborator/live-sessions → phiên vừa mời → **Chấp nhận tham gia**.
5. Shop mở phiên → **Bắt đầu phát sóng**. Phải thấy trạng thái **Đang live/LIVE**; chỉ tạo phiên hoặc chỉ chấp nhận chưa đủ.
6. Sao chép **Link phòng live** tự sinh, mở bằng Customer, mua đúng sản phẩm qua phòng Live. Ghi nhận **Đơn E** và voucher có tự áp dụng hay không.
7. Nếu Deal +2, Campaign +2 và hạng Vàng vẫn có hiệu lực: tổng **19%**. Không voucher: **47.500 đ**. Nếu Live giảm 15.000 đ: Net GMV **235.000 đ**, hoa hồng **44.650 đ**.
8. Kết thúc phiên và mua đơn mới qua link thường khi Campaign vẫn còn: về **16%** đối với Vàng. Đơn đã chốt trong phiên giữ số liệu lịch sử.

### Bảng đối chiếu Vàng (+2%)

| Đơn | Điều kiện | Tỷ lệ | Hoa hồng nếu tiền hàng thuần 250.000 đ |
| --- | --- | ---: | ---: |
| A | Nền + Vàng | 12% | 30.000 đ |
| B | Đề xuất Deal chưa duyệt | 12% | 30.000 đ |
| C | Deal +2 đã duyệt | 14% | 35.000 đ |
| D | Thêm Campaign +2 hiệu lực | 16% | 40.000 đ |
| E | Thêm Live +3 đang LIVE | 19% | 47.500 đ |
| F | Live kết thúc, Campaign còn | 16% | 40.000 đ |

Cấp bậc xét theo **GMV tháng trước**, không tăng ngay vì vừa tạo đơn hôm nay. Muốn nghiệm thu đổi hạng tự động trên dữ liệu thật cần kỳ đánh giá tháng mới; UI không có nút ép chạy lịch. Tổng tối đa các tầng trong bảng Word là **21%** (10+3+3+2+3), còn **25%** là trần phòng vệ; không có cách hợp lệ trên form này để tạo mức 25% chỉ bằng các tầng đã nêu.

## 6. Voucher và chống chồng giảm giá

Để con số dễ đối chiếu, làm phần này khi Live đã kết thúc và Campaign không còn áp dụng, hoặc ghi rõ tỷ lệ thực tế. Ví dụ hoa hồng bên dưới giả sử tỷ lệ **14%**.

### A. Voucher KOL đi cùng Deal

Dùng **mã VIP thực tế** cấp ở mục 5B. Customer mở checkout sản phẩm 250.000 đ → ô **Voucher tiền hàng của Shop / KOL (chọn 1 mã)** → nhập mã → **Áp dụng**.

- Giảm 5% = **12.500 đ**.
- Tiền hàng thuần = **237.500 đ**.
- Nếu tỷ lệ 14%, hoa hồng = **33.250 đ**, không phải 35.000 đ.
- Tổng Customer trả = **237.500 + cước GHN**, nếu chưa thêm mã Sàn/Freeship.

### B. Voucher chiến dịch

1. Shop vào http://localhost:5173/merchant/promotions?tab=coupons → tab **Mã giảm giá** → **Phát hành voucher mới**.
2. Chọn **Chiến dịch Sale**, chọn đúng Campaign đang hiệu lực.
3. Mã `WORDSALE20`, loại giảm **số tiền**, mức **20000**, đơn tối thiểu **250000**, ngày còn hiệu lực, lượt **20**, ngân sách **1000000** → **Phát hành voucher**.
4. Nếu trùng mã, thêm đuôi số rồi ghi lại mã mới.
5. Customer bỏ mã VIP hiện tại, áp mã Sale vào cùng ô tiền hàng. Kỳ vọng giảm **20.000 đ**; không cộng thêm 12.500 đ của mã VIP trước.

### C. Ba ô voucher độc lập

Admin phát hành hai mã tại http://localhost:5173/admin/affiliate-oversight?tab=coupons, cùng chọn **Cococ**:

| Ô cấu hình | Mã tiền hàng Sàn | Mã giảm ship |
| --- | --- | --- |
| Mã voucher | WORDSAN20 | WORDSHIP50 |
| Loại quyền lợi | Giảm tiền hàng | Giảm cước GHN |
| Kiểu giảm | Số tiền | Số tiền |
| Mức giảm | 20000 | 50000 |
| Giảm tối đa | 20000 | 50000 |
| Đơn tối thiểu | 0 | 0 |
| Ngân sách | 1000000 | 1000000 |
| Lượt dùng tối đa | 20 | 20 |

Bấm **Phát hành** từng mã. Customer ở checkout:

1. Áp mã VIP 5% vào **Voucher tiền hàng của Shop / KOL**.
2. Áp `WORDSAN20` vào **Voucher tiền hàng SCANMS**.
3. Áp `WORDSHIP50` vào **Voucher vận chuyển GHN**.
4. Nếu GHN báo cước 25.000 đ: tiền phải trả = **250.000 − 12.500 − 20.000 + 25.000 − 25.000 = 217.500 đ**.
5. Freeship 50k chỉ giảm 25k cước thực tế; 25k dư không được giảm tiếp tiền hàng. Cước khác thì thay đúng cước thực tế vào phép tính.
6. Theo cách tính hiện tại, tiền hàng thuần sau hai voucher tiền hàng = **217.500 đ**; nếu tỷ lệ 14% thì hoa hồng = **30.450 đ**. Freeship không làm giảm thêm cơ sở hoa hồng.
7. Thử nhập `WORDSALE20` vào ô Sàn để chồng thêm một voucher Shop: phải báo không hợp lệ. Thử nhập `WORDSHIP50` vào ô tiền hàng: phải từ chối.

### D. Voucher Live

Dùng phiên mục 5D: Customer chỉ áp mã Live khi phiên đang **LIVE** và đúng sản phẩm/KOL. Kết thúc phiên, mở checkout/đơn mới và thử mã lại: không được hưởng voucher Live. Chọn mã Live thay cho mã Shop/KOL đang có trong ô tiền hàng, không cộng cả hai.

## 7. Phân quyền tạo/duyệt/lưu voucher

### A. KOL chỉ đề xuất

1. KOL mở http://localhost:5173/collaborator/marketing?tab=coupons → **Mã giảm giá độc quyền** → mở form đề xuất.
2. Chọn **Cococ**, nhập mã `WORDKOL5` (hoặc đuôi số mới nếu đã dùng), gửi đề xuất.
3. Phải hiện **Chờ duyệt**. KOL không có quyền tự chuyển mã sang đang hoạt động.
4. Customer thử mã trước khi Shop duyệt: không được giảm tiền.

### B. Đúng chủ Shop duyệt

1. Shop Cococ mở http://localhost:5173/merchant/promotions?tab=coupons → lọc **Chờ duyệt** → đúng mã `WORDKOL5` → **Duyệt & Cấu hình**.
2. Điền giảm **5%**, đơn tối thiểu **200000**, giảm tối đa **30000**, **Tổng ngân sách tài trợ 1000000**, **Tổng lượt dùng tối đa 20**, các trường thời gian nếu có → xác nhận duyệt.
3. Mã chuyển **Đang hoạt động**. Customer áp lại cho đơn 250.000 đ: giảm **12.500 đ**.
4. Admin xem chi tiết mã: nguồn **SHOP_FUNDED/Shop tài trợ**, Shop chịu 100%. Shop khác không được thấy mã như mã do mình quản lý.
5. Để thử đơn tối thiểu/trần giảm: dưới 200k bị chặn; giỏ 1.000.000 đ giảm 5% nhưng bị giới hạn còn **30.000 đ**.
6. Muốn thử hết lượt nhanh, tạo một mã riêng có **1 lượt**, dùng cho một đơn kiểm thử rồi thử lại bằng đơn mới/tài khoản khác. Không cần tạo 20 đơn để thử.

### C. Admin khóa và phát hành mã Sàn

1. Admin mở http://localhost:5173/admin/affiliate-oversight?tab=coupons → tìm `WORDKOL5` → mở thao tác **Khóa**, nhập lý do `Kiểm thử khóa voucher`, xác nhận.
2. Customer mở checkout mới, áp lại mã: phải bị từ chối.
3. Admin mở khóa mã đã được Shop duyệt: mã còn hạn được trở lại trạng thái phù hợp. Với đề xuất KOL chưa duyệt, khóa rồi mở phải vẫn **Chờ duyệt**, không được thành đang hoạt động.
4. Xem hai mã Sàn đã tạo ở mục 6C: nguồn **PLATFORM_FUNDED/Sàn tài trợ**. Tài khoản Shop không có quyền sửa ngân sách tài trợ Sàn.

### D. Kho Voucher Customer

1. Customer vào http://localhost:5173/customer/vouchers → tìm một mã đang khả dụng → **Lưu mã**.
2. Chọn **Đã lưu**, nhấn Ctrl+F5: mã vẫn còn.
3. Bấm **Bỏ lưu**, tải lại: mã không còn trong Đã lưu.
4. Dùng tài khoản Customer khác: không được thấy danh sách lưu riêng của Customer trước.

Phân quyền “không gọi được API Shop khác/KOL không tự kích hoạt” còn cần kiểm thử API để chứng minh đầy đủ. Không thấy nút trên giao diện chưa đủ chứng minh backend đã chặn request trái quyền.

## Cách ghi kết quả để không nhầm đã test xong

| Mục | Bằng chứng nên lưu | Trạng thái của bạn |
| --- | --- | --- |
| 1 | Yêu cầu mẫu sau sửa và thông tin khớp trên hai trang Shop | Chưa thử / Đạt / Lỗi |
| 2 | Mẫu SHIPPED không có nút sớm; RECEIVED có hạn đúng 14 ngày | Chưa thử / Chờ GHN / Đạt / Lỗi |
| 3 | Cùng mã đơn trên Customer + tracking; từng mốc/tên/SĐT có bằng chứng GHN | Chưa thử / Chờ GHN / Đạt / Lỗi |
| 4 | Ảnh checkout có tiền hàng, cước và tổng; mẫu COD 0 | Chưa thử / Đạt / Lỗi |
| 5 | Mã đơn A–F, hạng KOL, trạng thái Deal/Campaign/Live, tiền hoa hồng | Chưa thử / Chờ kỳ xét hạng / Đạt / Lỗi |
| 6 | Ba ô voucher, tổng giảm và tổng thanh toán; hoa hồng trên tiền thuần | Chưa thử / Đạt / Lỗi |
| 7 | KOL chờ duyệt → Shop duyệt; Admin khóa; Customer lưu/bỏ lưu | Chưa thử / Đạt / Lỗi |

Nếu có lỗi, gửi ảnh **toàn bộ màn hình liên quan**, vai trò đang đăng nhập, tên/SKU sản phẩm, mã đơn/yêu cầu, mã voucher, bước đang làm và số tiền mong đợi. Không cần gửi mật khẩu hay token .env.
