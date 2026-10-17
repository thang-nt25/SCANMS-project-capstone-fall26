# Hướng dẫn nghiệm thu toàn bộ phần TUẤN

Ngày kiểm tra: 16/10/2026. Đối chiếu phần 2 của tài liệu phân công và mã hiện tại.

## Kết quả đã xác nhận

- Frontend http://localhost:5173 trả 200.
- Backend http://localhost:3000/api/docs trả 200.
- API sản phẩm công khai và API lọc theo Shop từng gặp lỗi đều trả 200 tại thời điểm kiểm tra.
- Chạy lại 9 bộ kiểm thử liên quan: 116/116 qua. Có kiểm tra giả lập; chưa chứng minh chuỗi thực tế đầy đủ.
- Không triển khai migration, thay đổi dữ liệu hoặc tạo đơn GHN trong lượt kiểm tra này.

## Điểm còn thiếu/lệch đã xác nhận

1. `ShopCampaignsPage.tsx` có form tạo campaign với ngày và ngân sách nhưng không được import/mount ở nơi khác trong frontend. Route `/merchant/campaigns` chuyển sang `/merchant/kol-hub?tab=messages`; hub khuyến mãi cũng không có tab campaign. Shop chưa có lối vào màn tạo campaign này. API `/api/campaigns` vẫn có. Cần nối giao diện để nghiệm thu qua web.
2. `GET /api/tiers` hiện trả bonus Vàng=3, Kim Cương=5. Word yêu cầu Vàng=2, Kim Cương=3. Luồng tính đơn và trạng thái bậc đã quy đổi theo tên về 2/3. Cần đồng bộ danh mục API/dữ liệu/hiển thị; chưa kết luận tất cả màn đang hiển thị sai nếu chưa kiểm tra trực tiếp.
3. Chưa xác nhận từng migration trên DB, chưa chạy đủ giao dịch thật/GHN thử nghiệm, và chưa kiểm tra trực quan mọi màn theo vai trò. HTTP 200 của sản phẩm không chứng minh bảng voucher/đối soát đã sẵn sàng.

## Chuẩn bị

1. Dùng dữ liệu nghiệm thu: Shop A và B khác chủ/kho; KOL A và B; hai khách; một Admin. Mỗi tài khoản dùng browser profile riêng để không lẫn cookie giới thiệu.
2. Shop có kho, SĐT và cấu hình GHN thử nghiệm hợp lệ. KOL đáp ứng điều kiện xin mẫu, liên kết kênh xã hội. Sản phẩm đã duyệt, đủ tồn kho, bật tiếp thị.
3. Trước khi test giao dịch, xác nhận DB có các thay đổi: địa chỉ mẫu, customer_saved_coupons, campaign bonus budget, voucher stacking và platform voucher reimbursements. Chỉ kiểm tra trạng thái; không tự chạy reset hoặc deploy migration lên DB dùng chung.
4. Mở F12 → Network → Fetch/XHR → bật Preserve log. Sau mỗi thao tác ghi mã đơn/yêu cầu, HTTP status và ảnh kết quả; không chia sẻ token, cookie hoặc .env.
5. Khi có 401: kiểm tra đăng nhập. 403: kiểm tra đúng vai trò/quyền Shop. 400/409: đọc thông báo điều kiện nghiệp vụ. 500: xem log backend. Dòng React DevTools chỉ là thông báo phát triển.

## Đường dẫn thực tế

| Vai trò | Đường dẫn |
|---|---|
| KOL xin mẫu | `/collaborator/collaboration?tab=samples` |
| Shop quản lý mẫu | `/merchant/kol-hub?tab=samples` |
| Shop mã giảm giá | `/merchant/promotions?tab=coupons` |
| Shop sản phẩm/cài đặt | Mở mục Sản phẩm và Cài đặt trong menu Shop |
| Shop chiến dịch | Hiện bị thiếu lối vào; `/merchant/campaigns` chuyển sang tin nhắn |
| Shop livestream | `/merchant/live-sessions` |
| KOL mã giảm giá | `/collaborator/marketing?tab=coupons` |
| KOL link tiếp thị | `/collaborator/marketing?tab=links` |
| KOL cấp bậc | `/collaborator/profile?tab=tiers` |
| Khách tra cứu | `/tracking` |
| Khách đơn hàng | `/customer/orders` |
| Khách kho voucher | `/customer/vouchers` |
| Admin mã giảm giá | `/admin/affiliate-oversight?tab=coupons` |

## A. Địa chỉ xin mẫu

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| A01 | KOL mở Shop/sản phẩm, xin mẫu; chọn tỉnh → huyện → xã, nhập số nhà, tên và SĐT, kênh/cam kết | Danh sách lấy từ GHN, không có địa chỉ Sunrise hardcode; gửi được yêu cầu hợp lệ |
| A02 | Chọn đủ địa chỉ rồi đổi tỉnh, sau đó đổi huyện | Các cấp con cũ bị xóa; không gửi tổ hợp tỉnh/huyện/xã mâu thuẫn |
| A03 | Bỏ trống xã/số nhà/tên/SĐT hoặc bỏ xác nhận SĐT; nhập SĐT sai | Form/API chặn; không tạo yêu cầu thiếu dữ liệu |
| A04 | Nhập địa chỉ khác hồ sơ cũ, gửi; sang Shop xem đúng yêu cầu | Tên, SĐT, số nhà, xã, huyện, tỉnh đúng dữ liệu vừa nhập; tải lại vẫn đúng |
| A05 | Shop B/KOL B thử xem hoặc xử lý yêu cầu của người khác bằng API | Không đọc/sửa trái quyền |

OTP SMS không thuộc yêu cầu này. Checkbox xác nhận người nhận không phải bằng chứng xác thực danh tính qua nhà mạng.

## B. Trạng thái mẫu và SLA

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| B01 | Shop duyệt rồi tạo vận đơn mẫu qua GHN | Có tracking; SHIPPED; COD=0; người gửi trả phí GHN |
| B02 | KOL xem mẫu SHIPPED, bấm theo dõi; thử gửi video qua API trước giao | Không có nút nhận hàng sớm, chưa chạy SLA/nộp video; API nộp sớm bị chặn |
| B03 | Vận đơn GHN thử nghiệm chuyển delivered tại D; webhook được xử lý | Tự RECEIVED; receivedAt=D; deadline=D+14 ngày; mở nộp review |
| B04 | Gửi lại cùng sự kiện delivered | Không đổi hạn, không cộng thêm 14 ngày, không lặp thông báo nhận mẫu |
| B05 | Bỏ lỡ webhook rồi đồng bộ theo dõi hoặc chờ lượt tác vụ rà soát | Hệ thống kiểm tra GHN và cập nhật; hạn vẫn từ thời điểm giao, không từ lúc phát hiện |
| B06 | GHN còn delivering nhưng gửi webhook khai delivered | Backend kiểm chứng GHN, không chuyển RECEIVED |
| B07 | GHN delivered thiếu mốc giao đáng tin cậy; hoặc chỉ có updated_date chung | Giữ SHIPPED và chờ tra soát; không tự dùng thời điểm hiện tại để đặt SLA |
| B08 | RECEIVED: nộp URL review hợp lệ, Shop mở duyệt | Gửi được video; Shop thấy đúng yêu cầu và xử lý theo luồng |

B03–B07 cần GHN thử nghiệm hoặc fixture tự động. Không chỉ gõ mã tracking giả rồi đánh dấu đạt. Với SLA dùng fixture đồng hồ trong môi trường thử, không chỉnh ngày máy/DB dùng chung.

## C. Theo dõi GHN cho khách

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| C01 | Tra đơn có tracking ở `/tracking`, rồi xem cùng đơn trong Customer Portal | Cả hai gọi API track và hiện cùng trạng thái |
| C02 | Xem vận đơn có đủ log lấy hàng/kho trung chuyển/đang giao/giao xong | Hiện mốc và thời gian đúng GHN; tên/SĐT bưu tá khi GHN có cung cấp |
| C03 | Dùng vận đơn không có thông tin bưu tá hoặc GHN lỗi | Không bịa tên/SĐT/mốc; có thông báo chưa tải được/chưa có dữ liệu |

Timeline hiện tải khi mở component; nếu cần theo dõi trạng thái mới hãy mở lại/tải lại. Không coi việc chưa tự cập nhật liên tục là bằng chứng webhook không hoạt động.

## D. Phí ship động

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| D01 | Khách chọn đủ địa chỉ ở checkout; đổi địa chỉ nội tỉnh/liên tỉnh | Gọi báo giá GHN, tổng tiền cập nhật đúng; không mặc định miễn phí |
| D02 | Đổi số lượng 1 → 3; tạo đơn và Shop tạo vận đơn | Khối lượng, kích thước và bảo hiểm lúc báo giá/tạo vận đơn thống nhất |
| D03 | Giỏ gồm Shop A/B khác kho | Mỗi Shop có cước theo kho của mình; tổng bằng các đơn con |
| D04 | GHN báo giá lỗi, địa chỉ thiếu hoặc cũ | Không cho khách chốt với giá 0/cước cũ ngoài chính sách |
| D05 | So sánh đơn mua và mẫu | Khách chịu cước đơn mua trong thanh toán; mẫu COD=0 và Shop trả cước |

20k/35k trong Word là ví dụ, không phải giá cố định. Đạt khi khớp báo giá GHN của đơn đang thử.

## E. Hoa hồng và bậc

Shop thử sửa hoa hồng mở ở sản phẩm/cài đặt: UI phải read-only 10%; API sửa tùy ý cũng phải bị chặn hoặc giữ quy chuẩn. Không chỉ kiểm tra một ô trên UI.

Dùng sản phẩm 500.000đ, khách đi qua đúng link KOL; mỗi ca dùng một đơn và dữ liệu nguồn rõ ràng:

| Mã | Điều kiện | Tỷ lệ mong đợi |
|---|---|---|
| E01 | Đồng, không có thưởng khác | 10% |
| E02 | Bạc / Vàng / Kim Cương | 11% / 12% / 13% |
| E03 | Đồng + VIP được Shop duyệt +1 / +2 / +3 | 11% / 12% / 13% |
| E04 | Đồng + campaign đang hiệu lực +1 / +2, KOL tham gia và link thuộc campaign | 11% / 12% |
| E05 | Đồng + live hợp lệ đang LIVE +2 / +3 | 12% / 13% |
| E06 | Kim Cương + VIP3 + campaign2 + live3 | 21% |
| E07 | VIP đang chờ/bị từ chối, sai KOL/sản phẩm/Shop | Không có VIP |
| E08 | Campaign chưa bắt đầu/đã hết hạn/ngừng/hết ngân sách | Không nhận thưởng sai hoặc ghi vượt ngân sách; nếu chặn đặt hàng phải thông báo rõ |
| E09 | Live chưa phát/đã kết thúc, sản phẩm ngoài live | Không có thưởng live |

VIP được tính theo deal APPROVED của đúng KOL/sản phẩm/Shop, độc lập loại link; E06 dùng link campaign để giữ nguồn campaign. Đảm bảo nguồn live đi qua checkout của phiên và vẫn giữ attribution KOL/campaign. Nếu nguồn này không kết hợp được trên UI, ghi nhận chưa đạt, không chỉ cộng tay để xác nhận.

Tỷ lệ có thể nằm ở chi tiết dòng hàng/API đơn; số dư ví có thể chờ điều kiện thanh toán/hoàn tất, không đòi ví tăng ngay lúc đặt đơn.

- Trần 25% cần kiểm thử tự động với dữ liệu vượt giới hạn, không mở sửa mức thưởng thật để cố đạt 25%. Các nấc trong Word cộng tối đa 21%.
- Test bậc bằng doanh số thành công tháng trước theo giờ Việt Nam. Đơn hủy không tính; ship không cộng vào GMV; hoàn tiền phải được xử lý theo chính sách. Kiểm tra mốc ranh giới tháng và ngưỡng bậc.
- Tác vụ xét bậc có lịch ngày đầu tháng. API `POST /api/tiers/evaluate` làm thay đổi bậc toàn bộ KOL; chỉ kích hoạt trong môi trường nghiệm thu. Không dùng tùy tiện trên DB dùng chung.
- Hiện `/api/tiers` có mức Vàng3/KimCương5 lệch Word; cần đồng bộ trước khi chốt E02 và nghiệm thu giao diện bậc.

## F. Voucher, Net GMV và chống lỗ

Tạo bộ mã thử khác tên để tránh trùng: Shop giảm cố định 50.000; sàn giảm tiền hàng 20.000; ship giảm 10.000. Chọn mã cho phép cộng lớp theo chính sách. Phí GHN thực tế ký hiệu S.

Với hàng 500.000 và đủ các thưởng E06:

- Net GMV = 500.000 − 50.000 − 20.000 = 430.000.
- Thanh toán = 430.000 + S − min(S, 10.000).
- Hoa hồng 21% = 90.300, không tính trên 500.000 và không tính phí ship.
- Nếu S=30.000 thì thanh toán=450.000. Chỉ dùng con số này khi báo giá thực tế đúng 30.000.

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| F01 | KOL đề xuất VIP +1/+2/+3 kèm cam kết; Shop duyệt và chọn điều kiện voucher | Mã mang nhận diện KOL được cấp đúng sản phẩm/Shop; điều kiện và link đã lưu; chờ duyệt chưa có thưởng |
| F02 | Shop tạo mã campaign, dùng trước/trong/sau thời gian campaign | Chỉ dùng đúng phạm vi, hạn và điều kiện đã cấu hình |
| F03 | Tạo/nhận voucher trong phòng LIVE, thử sau kết thúc | Dùng trong live hợp lệ; ngoài live bị từ chối |
| F04 | Nhập mã Shop rồi nhập mã KOL cùng Shop | Chỉ một mã tiền hàng Shop được giữ/thay thế; không cộng hai lần |
| F05 | Thêm mã sàn và mã ship | Hiện ba lớp riêng, tính đúng công thức trên cả UI và đơn đã lưu |
| F06 | Mã ship lớn hơn cước | Giảm tối đa cước; tiền hàng và phí không âm |
| F07 | Đơn dưới tối thiểu, vượt trần %, hết hạn/lượt/ngân sách | Chặn hoặc áp đúng trần; không vượt ngân sách |
| F08 | Hai khách đồng thời dùng lượt/ngân sách cuối | Không cả hai vượt hạn; đơn thất bại không trừ tồn/ngân sách dang dở |
| F09 | Khách sửa số giảm/tỷ lệ/cước trong request | Backend tính lại và kiểm chứng, không tin số từ frontend |
| F10 | Hủy đơn; gọi hủy lặp; hoàn một phần/toàn bộ | Tiền, voucher, thưởng campaign và hoa hồng xử lý nhất quán; không hoàn ngân sách/hoa hồng lặp |

Ngân sách thưởng campaign và ngân sách giảm giá voucher là hai khoản riêng. Không dùng một khoản thay cả hai.

## G. Phân quyền và kho voucher

| Mã | Thao tác | Kết quả đạt |
|---|---|---|
| G01 | Shop tạo mã, kiểm tra nguồn tài trợ và các hạn mức | SHOP_FUNDED, Shop chịu 100%; lưu được min đơn/trần giảm/ngân sách/lượt |
| G02 | KOL đề xuất mã; thử kích hoạt ngay hoặc gửi status ACTIVE qua API | PENDING_APPROVAL; không tự có hiệu lực |
| G03 | Shop khác duyệt thử, rồi đúng chủ Shop duyệt | Shop khác bị chặn; đúng chủ mới kích hoạt |
| G04 | Admin phát hành mã sàn rồi khóa khẩn cấp | PLATFORM_FUNDED; khóa xong đơn mới không dùng được |
| G05 | Khách mở Kho voucher, lưu/bỏ lưu rồi tải lại | API dữ liệu thật; trạng thái lưu bền vững, tách theo tài khoản |
| G06 | Lưu mã ngoài 100 kết quả công khai đầu; tải lại tab Đã lưu | Vẫn thấy mã; không mất vì giới hạn danh sách |
| G07 | Đơn đủ điều kiện có mã sàn, xem đối soát Shop/Admin | Tiền sàn tài trợ được ghi đúng; không trừ nhầm ngân sách Shop |
| G08 | Ghi nhận đã chuyển hoàn cùng mã giao dịch hai lần hoặc quá số còn thiếu | Bị chặn trùng/vượt; thao tác này ghi nhận chuyển ngoài hệ thống, không tự chuyển tiền |

## Cách chốt kết quả

Mỗi ca ghi: mã ca, vai trò, mã đơn/yêu cầu, dữ liệu đầu vào, kết quả mong đợi, kết quả thực tế, ảnh/response, ĐẠT / LỖI / CHƯA TEST.

Chỉ xác nhận hoàn thành toàn bộ khi các ca đều đạt, xử lý xong lối vào campaign và danh mục bậc, xác nhận schema DB và chạy được GHN thử nghiệm. 116 test qua hoặc một API 200 không thay thế các điều kiện này.
