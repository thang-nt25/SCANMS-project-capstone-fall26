# Nghiệp vụ Android bổ sung — 03/11/2026

Đây là báo cáo triển khai tiếp theo của [bản rà soát thiếu nghiệp vụ](ROLE_GAP_AUDIT_2026-11-03.md). Có màn native và tích hợp API không đồng nghĩa mọi luồng đã nghiệm thu E2E. Các thao tác nhiều role, chứng từ, hoàn tiền và vận chuyển cần người nghiệm thu chạy bằng tài khoản được phân công.

## Cách mở

Mở SCANMS trên emulator, đăng nhập tài khoản hiện có rồi chọn tab **Nghiệp vụ**. Menu và ô tìm kiếm chỉ hiện chức năng được phép theo role. Shop chọn đúng gian hàng trong **Cá nhân** trước khi xử lý. Các nút sửa sản phẩm, đánh giá và trả hàng mở từ chi tiết sản phẩm/đơn tương ứng.

API và DB dùng chung backend web; không reset/seed DB hoặc thay mật khẩu trong đợt bổ sung này. Mobile không giữ secret GHN, Prisma, ngân hàng hay mật khẩu autofill của web. Không có dữ liệu thành công giả khi API từ chối.

## CUSTOMER — kiểm thử theo thứ tự

1. **Sản phẩm → chi tiết → Xem gian hàng**: xem giá, biến thể, rating, số đã bán và review; tìm sản phẩm trong Shop; theo dõi/bỏ theo dõi. Mở lại màn để kiểm tra trạng thái từ server.
2. **Nghiệp vụ → Sổ địa chỉ**: chọn tỉnh/quận/phường từ GHN, thêm địa chỉ, sửa, đặt mặc định. Đóng/mở app và kiểm tra còn địa chỉ. Không xóa địa chỉ đang dùng cho bài test khác.
3. **Sản phẩm → chi tiết → Thêm giỏ hàng**: chọn SKU thật, thêm cùng SKU hai lần và SKU khác. **Nghiệp vụ → Giỏ hàng**: tăng/giảm/bỏ sản phẩm; tải lại và đối chiếu giỏ web cùng tài khoản. Backend có thể điều chỉnh tồn kho và trả cảnh báo; UI cập nhật giỏ trước khi hiện cảnh báo.
4. **Đơn hàng**: lọc trạng thái, mở đơn thuộc chính khách. Hủy đơn đang chờ bằng lý do; xác nhận nhận hàng đúng trạng thái. Theo dõi GHN lấy trạng thái server. Khách không có nút giả lập shipment; Shop/Admin chỉ có điều khiển TEST khi server cho phép.
5. **Đơn hoàn tất → Viết đánh giá**: chọn món chưa đánh giá, sao 1–5, nhận xét, ảnh; gửi và mở lại. Shop/vận hành kiểm duyệt theo chính sách hiện tại, không tự công khai mọi review vừa gửi.
6. **Đơn đã giao → Yêu cầu trả hàng/hoàn tiền**: nhập lý do, ảnh và video mở hộp; Shop duyệt. **Nghiệp vụ → Trả hàng & khiếu nại → hồ sơ**: xem hướng dẫn/kho/hạn, đặt lịch lấy hàng khi đủ điều kiện; theo dõi nhận/kiểm tra, tiền hoàn hoặc vận đơn đổi. Xác nhận hoàn tất khi đủ điều kiện. Bị từ chối, refund lỗi hoặc kiểm tra quá SLA thì mở khiếu nại. Hồ sơ gửi thủ công cũ có thể sửa vận đơn; luồng mới ưu tiên shipper đến lấy.
7. **Nghiệp vụ**: sửa hồ sơ/mật khẩu, yêu thích, khai báo định danh, voucher, ví và ledger. Khai báo định danh không phải kết nối xác minh CCCD quốc gia.
8. **Tin nhắn**: gửi chữ, chọn ảnh/video/tệp rồi gửi; bấm tên Shop mở gian hàng. Kiểm tra lịch sử và thông báo khi Shop trả lời ở client khác.

**Checkout/PayOS trên mobile chưa thuộc giai đoạn này.** Có thể tạo đơn trên web bằng cùng giỏ/tài khoản rồi kiểm tra các bước hậu mãi trên app.

## COLLABORATOR / KOL

1. **Nghiệp vụ → Kênh xã hội & cấp bậc**: thêm/sửa/đặt kênh chính, xem tiến độ tier. **Hồ sơ xác minh KYC**: gửi chứng từ thật phục vụ kiểm thử; vận hành duyệt ở tài khoản khác. Không dùng giấy tờ của người khác.
2. **Hợp tác**: khám phá/đề nghị hợp tác, nhận hoặc từ chối lời mời Shop; mở chat/VIP theo quan hệ hiện có. Đối chiếu lời mời tại client Shop, không dùng cùng người tự duyệt hai phía.
3. **Nghiệp vụ → Link tiếp thị & QR**: chọn sản phẩm đủ điều kiện, tạo link có nhãn/kênh; copy, xem QR, chia sẻ PNG, tạm ngừng/kích hoạt/xóa. Mở link trả bởi backend trên trình duyệt truy cập được domain đó; không tự đổi domain để kết luận attribution đã chạy.
4. **Nghiệp vụ → Hàng mẫu & video review**: kiểm tra eligibility; chọn sản phẩm/SKU, địa chỉ GHN, kênh và cam kết. Khi còn PENDING có thể sửa địa chỉ/cam kết hoặc hủy. Shop duyệt/gửi; KOL nhận/báo sự cố, theo dõi hạn, nộp URL video công khai; Shop nghiệm thu hoặc yêu cầu sửa. Vận hành xử lý báo cáo nếu có.
5. **Voucher & Coupon / Chiến dịch & lời mời**: đề xuất coupon, theo dõi duyệt; xem và phản hồi lời mời chiến dịch. **Thưởng doanh số tháng**: chọn Shop và kỳ, xem tiến độ/mốc và lịch sử.
6. **Ví & lịch sử giao dịch**: xem khả dụng/tạm giữ và ledger, sửa ngân hàng khi được phép, chọn Shop và gửi yêu cầu rút; đối chiếu gross/thuế/net từ backend. Shop duyệt ở client khác rồi KOL tải lại trạng thái.

## SHOP_MANAGER

1. **Cá nhân → chọn Shop**: danh sách chỉ từ phân công còn hiệu lực. **Nghiệp vụ → Tổng quan** kiểm tra phạm vi đúng Shop.
2. **Sản phẩm → tạo/chi tiết → Chỉnh sửa**: nội dung 6 khối, ảnh, thông số kiện hàng/barcode, giá/tồn kho SKU và chính sách mẫu. Nội dung cần duyệt lại vẫn theo maker–checker backend. Xóa sản phẩm có xác nhận. Trình sửa hiện giữ nguyên tập thuộc tính SKU, chưa có trình thiết kế lại ma trận SKU như web.
3. **Nghiệp vụ → Tạo đơn & Import Excel**: tải mẫu, nhập file XLSX đúng mẫu, xem lỗi từng dòng; tạo đơn tay với SKU thật. Không mặc định đơn nhập đã thanh toán. Timeout cần tra cứu trước khi gửi lại; mã request được giữ để chống trùng cho thao tác nhập tay.
4. **Đơn hàng → chi tiết**: tạo GHN TEST hoặc nhập mã đúng; mô phỏng TEST khi server cho phép; đối chiếu đã giao ở cả tracking và danh sách. GHN thật gửi dữ liệu cho hãng vận chuyển và không dùng để giả lập kiểm thử.
5. **Trả hàng & khiếu nại**: xem ảnh/video, duyệt/từ chối có căn cứ, kho/hướng dẫn; sau khi nhận bắt đầu kiểm tra và kết luận. Lỗi vận chuyển phải có xác định trách nhiệm của vận hành theo backend. Gửi vận đơn đổi hoặc theo dõi kết quả hoàn tiền; không coi duyệt yêu cầu là tiền đã hoàn.
6. **Hàng mẫu & video review**: duyệt/từ chối, gửi mã hoặc GHN TEST, gia hạn/report, xem video, nghiệm thu/yêu cầu sửa. Kiểm tra KOL nhìn thấy cùng trạng thái ở client khác.
7. **Giá sàn & khuyến mãi**: xem MAP do vận hành đặt, đề xuất giảm giá/ngân sách/thời gian, hủy khi được phép; Shop không tự đặt MAP. **Đánh giá & phản hồi**: trả lời/báo cáo review theo quyền.
8. **Hợp tác / VIP / Voucher / Chiến dịch / Thưởng doanh số**: mời/đàm phán, phản hồi hai chiều; cấu hình mốc thưởng, chốt kỳ, duyệt và chi thưởng có xác nhận. Quy tắc tính tiền/rate/KPI do backend thực thi.
9. **Tài chính & chi trả Shop → Duyệt yêu cầu rút tiền**: xem gross/thuế/net/ngân hàng, upload bill và xác nhận; từ chối có lý do. Chọn các yêu cầu đủ điều kiện để xuất XLSX lô VietQR, tải lại lô cũ. Xuất file không tự chuyển tiền. Nếu không rõ kết quả, bấm làm mới lịch sử trước khi xuất lại.
10. **Cài đặt gian hàng / Hồ sơ KYC / Giám sát link tiếp thị**: sửa thông tin, kho, chính sách, ngân hàng; chủ Shop gửi bổ sung KYC khi bị yêu cầu. Khóa link cần lý do. Các endpoint hiện giới hạn owner vẫn giữ kiểm tra đó; staff được phân công có thể bị backend từ chối ở nghiệp vụ chưa cấp quyền owner.

## SYSTEM_MANAGER

1. **Kiểm duyệt**: mở hồ sơ/chứng từ, duyệt/từ chối sản phẩm khác người tạo. Thử hồ sơ chính mình tạo để xác nhận backend chặn maker–checker.
2. **Nghiệp vụ → Hồ sơ xác minh KYC**: xem hồ sơ KOL/Shop, chứng từ, quyết định/ghi chú/yêu cầu bổ sung theo loại hồ sơ.
3. **Hàng mẫu & video review**: xem vi phạm/giao nhận, phân xử/gia hạn/mở khóa theo quyền; KOL/Shop phải thấy kết quả sau cập nhật.
4. **Trả hàng & khiếu nại**: danh sách gồm active, tranh chấp mở và kiểm tra quá hạn; mở hồ sơ, xác định trách nhiệm trước kiểm tra, ra quyết định khiếu nại có căn cứ. Backend chặn quyết định không hợp lệ theo hàng đã nhận. Thử lại refund theo quyền và trạng thái.
5. **Giá sàn & khuyến mãi / Đánh giá & phản hồi**: đặt MAP theo sản phẩm/SKU, duyệt khuyến mãi; duyệt/ẩn review, xử lý báo cáo.
6. **Tổng quan / Nhật ký vận hành / Giám sát rủi ro / Giám sát link / Voucher / Duyệt rút tiền**: dữ liệu server, lý do bắt buộc cho hành động; không sửa/xóa ledger từ UI.
7. Kiểm tra **không có Nhân sự & gian hàng và Duyệt ngoại lệ VIP**; deep link trái quyền cũng phải bị chặn và backend trả 403 khi gọi trái quyền.

## SYSTEM_ADMIN

Chạy các mục vận hành ở trên, sau đó:

1. **Nghiệp vụ → Nhân sự & gian hàng**: tạo nhân sự nội bộ đúng role được API hỗ trợ; phân công chủ Shop/khóa mở theo policy. Không có API đổi tùy ý mọi role; không tạo nút giả.
2. **Duyệt ngoại lệ VIP**: hồ sơ trên ngưỡng Shop, quyết định độc lập có lý do, kiểm tra KOL/Shop nhận kết quả.
3. **Tổng quan**: kiểm tra dữ liệu toàn sàn theo phạm vi Admin. Kiểm tra đăng xuất/xóa cache, đăng nhập role khác không thấy dữ liệu đặc quyền của phiên trước.

## Kiểm tra lỗi chung

- Mất mạng lúc đọc: hiện lỗi và thử lại. Mutation không tự retry tài chính; khi timeout có thể chưa biết kết quả, tải lại trước khi gửi tiếp.
- Đổi tài khoản/Shop: dữ liệu query, draft, selection được tách scope; API luôn kiểm tra tài nguyên. Backend sample đã bổ sung kiểm tra phân công Shop còn hiệu lực cho các thao tác liên quan.
- File quá lớn/sai loại, barcode sai checksum, UUID không hợp lệ, thiếu địa chỉ/kênh/KYC: phải hiện lỗi, không báo thành công giả.
- Token hết hạn: yêu cầu đăng nhập lại; không có refresh token API thì không tự dựng refresh giả.
- Thông báo có center và cập nhật foreground/polling; chưa tích hợp FCM/APNs push khi app đóng.

## Bằng chứng đã thực hiện

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Mobile TypeScript + oxlint | PASS | Kiểm tra source |
| Mobile unit/contract | 46/46 PASS | API client, quyền, cart, phiên, file và gate đổi trả; không phải E2E 5 role |
| Backend selected suites | 5 suites, 71/71 PASS | Bootstrap HTTP Passport/JWT + Prisma mock, UUID DTO, scope sample |
| Backend build | PASS | Không chạy migration/seed |
| Expo Android JS export | PASS | Tách biệt build native |
| Debug native x86_64 APK | Build/install/signature PASS | Cần Metro, chưa phải bản standalone ARM |
| API public local → DB nhóm | 4 contract checks PASS | Catalog/categories/reviews/store, chỉ đọc |
| Emulator phiên SYSTEM_MANAGER | Workspace + dashboard + KYC đọc được dữ liệu | Không đăng nhập thay người dùng hoặc duyệt giao dịch |
| Mutation E2E đủ 5 role | CHƯA NGHIỆM THU | Thực hiện theo các bước bên trên |

## Phần còn mở được ghi rõ

Thanh toán/checkout và livestream mobile là giai đoạn tiếp theo đã thống nhất. Chưa port toàn bộ biểu đồ, bộ lọc phân tích chuyên sâu, trình sửa ma trận SKU, đăng ký/nâng role tự phục vụ, App Links/attribution native, push background hoặc APK standalone ARM. Các màn tích hợp mới vẫn cần nghiệm thu dữ liệu/quyền bằng nhiều tài khoản trên thiết bị, không đánh dấu toàn bộ tương đương web chỉ vì build đã qua.

Mã chia theo `src/features/<domain>/`, dùng lại `common`, `services/api`, React Query và Expo Router; không có CSS riêng. Backend bổ sung trong module hiện có, không dựng server/DB mobile tách rời.
