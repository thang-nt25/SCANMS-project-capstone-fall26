# Kiểm tra Tạo phiên live & Voucher mới

Ngày: 27/10/2026. Trang: `/merchant/live-sessions`, tab tạo phiên.

## Cập nhật sau sửa

Đã sửa ngày 27/10/2026:

- Parse ISO giữ nguyên timezone; chuỗi ngày/giờ local vẫn dùng giờ máy. Chặn ngày local không hợp lệ.
- Giữ gian hàng đang chọn khi làm mới hồ sơ; form xác minh store thuộc danh sách tài khoản.
- Link phòng chỉ tạo trong tab tạo và nền tảng SCANMS; không tạo code thừa sau khi tạo phiên. Avatar thiếu ảnh dùng chữ cái đầu.
- Đặt mặc định1 lượt/khách, required và max100; thêm đơn tối thiểu/trần giảm; đổi loại voucher xóa mức giảm cũ để tránh chuyển nhầm số tiền thành phần trăm. Tìm sản phẩm hỗ trợ bỏ dấu.
- Chặn tên chỉ khoảng trắng, số không hợp lệ và gửi tạo phiên trùng. API thất bại giữ lại bản nháp để thử lại.
- Nút “Tạo phiên & gửi lời mời” và modal hiển thị rõ chờ KOL; bỏ nút Tạm dừng cũ không được backend hỗ trợ. Dùng luồng kết thúc/governance hiện có.
- Lời mời ghi “Thưởng thêm phiên Live: +2%/+3%”; không gửi thông báo đại trà ngay khi phiên mới chờ xác nhận. Thông báo/lời mời cho KOL được giữ.
- Dọn nhánh DANGER không dùng và thêm thông báo khi vượt trần hoa hồng.

Kiểm chứng sau sửa: backend67/67 test, frontend17/17 mục (bao gồm browser tạo SCANMS và YouTube giả lập, lỗi rồi thử lại, bấm hai lần, nhiều store, clipboard, sản phẩm/variant). TypeScript frontend và build Nest backend đạt. Chưa gửi lời mời hoặc tạo phiên thật; kiểm thử không thay thế xác nhận phát video/camera và nhận thông báo trên hai tài khoản thật.

Các mục dưới đây là kết quả audit ban đầu, giữ để đối chiếu. Browser test hiện kiểm tra hồi quy sau sửa; file observations được tạo lại với hành vi mới. Chưa bổ sung ngân sách tiền cho voucher Live, kiểm chứng follower từ nền tảng ngoài hoặc phát video thực tế.

## Kết luận

Các thao tác chính có nối API thật, không phải nút trang trí. Chọn KOL/sản phẩm/biến thể, tạo mã phòng, lịch phát sóng và mức thưởng gửi đúng cấu trúc. Tuy nhiên chưa thể coi toàn bộ chức năng là đúng: có lỗi giờ ISO, nhãn kích hoạt và tỷ lệ trong lời mời không đúng nghĩa, trường bắt buộc không rõ, một số thao tác sau tạo bị lệch với backend.

Đây là kiểm tra và ghi nhận. Chưa sửa nghiệp vụ; không phát hành voucher, tạo phiên hoặc gửi thông báo thật.

## Phát hiện ưu tiên

| Mức | Vấn đề | Bằng chứng và tác động | Hướng sửa |
| --- | --- | --- | --- |
| Cao | Bộ chọn giờ hiểu sai ISO có múi giờ | `DateTimePicker.tsx:46` lấy phần giờ bằng regex rồi dựng Date local, bỏ `Z`/offset. Form truyền `minDateTime` dạng ISO. Chạy hàm thật ở Asia/Ho_Chi_Minh: `2026-10-27T03:00:00Z` đáng ra 10:00, picker hiểu 03:00, lệch −7 giờ. Điều này ảnh hưởng giới hạn chọn giờ/default lịch; không có nghĩa mọi giờ người dùng chọn đều lệch, vì chuỗi local từ picker được submit bằng `toISOString()` đúng. | Phân biệt ISO có múi giờ với chuỗi local trước parse; kiểm tra cả value/min/max và múi giờ máy. |
| Cao | Lời mời Chat mô tả thưởng thêm thành tổng hoa hồng | Frontend gửi `commissionRate` là 2 hoặc 3; backend lưu đúng khoản thưởng Live và đơn hàng cộng thêm vào mức nền. Nhưng `LiveSessionsService.create` viết “Hoa hồng phiên Live: 3%”. Browser kiểm tra cùng một phiên: 12% nền/Deal +1% chiến dịch +3% live =16%, payload đúng là 3. | Sửa lời mời thành “Thưởng thêm Live +3%”; nếu đưa tổng phải nói rõ là ước tính và tính đúng theo sản phẩm/điều kiện. Không đổi payload sang 16 vì backend chỉ nhận 2/3. |
| Cao | Nút Tạm dừng trong chi tiết không dùng được | `LiveSessionsPage.tsx:1903` gọi `changeState(...,'PAUSED')`, trong khi `LiveSessionsService.updateState` từ chối PAUSED/CANCELLED ngay với yêu cầu dùng quy trình kết thúc/dừng khẩn cấp có lý do. Đây là xung đột mã nguồn, chưa bấm dừng phiên thật. | Bỏ thao tác cũ hoặc nối vào đúng quy trình governance; không tự mở lại API dừng thiếu lý do. |
| Vừa | “Tạo phiên & Kích hoạt Voucher” gây hiểu nhầm | Backend tạo `PENDING_CREATOR`/`PENDING`; coupon được lưu ACTIVE nhưng áp dụng thực tế còn yêu cầu phiên LIVE, KOL ACCEPTED và trong lịch. Tạo xong chưa có voucher dùng được ngay. | Đổi thành “Tạo phiên & gửi lời mời”; hiển thị rõ “Chờ KOL xác nhận”, voucher chỉ dùng khi phiên phát sóng hợp lệ. |
| Vừa | Thiếu điều kiện giới hạn voucher trên form | `minimumOrderAmount`/`maximumDiscountAmount` có trong state, payload và DTO nhưng không có ô nhập JSX. Người dùng không đặt được đơn tối thiểu/trần giảm %; backend nhận null nếu không gửi. Không có tổng ngân sách live voucher trong luồng tạo này. | Cho cấu hình đơn tối thiểu, trần giảm %; cân nhắc ngân sách theo yêu cầu kinh doanh. Không gọi đây là kiểm tra lợi nhuận: khối hiện tại chỉ cộng tỷ lệ hoa hồng. |
| Vừa | “Lượt dùng mỗi khách” nhìn là tùy chọn nhưng bắt buộc lúc submit | Không có dấu * hay `required`, ban đầu để rỗng. Browser điền đầy đủ còn lại, submit bị toast chặn và không có POST. DTO thực ra cho bỏ trống, backend mặc định 1. | Đặt mặc định 1 và/hoặc ghi bắt buộc; đồng bộ giới hạn tối đa100 của DTO với input. |
| Vừa | Gửi thông báo diện rộng quá sớm | Ngay trong `create`, backend tìm toàn bộ user active rồi ghi LIVE_SESSION_BROADCAST, dù KOL chưa đồng ý và chưa phát sóng. Khi START_NOW còn broadcast tiếp. Đây là hành vi từ mã nguồn, không thực thi gửi thật. | Lúc tạo chỉ báo Shop/KOL liên quan; thông báo công khai khi phiên hợp lệ đang live, theo nhóm nhận phù hợp và chống gửi lặp. |
| Vừa | Form không chắc dùng đúng gian hàng đang chọn nếu nhiều store | Khởi tạo lấy `user.stores[0]` trước `current_store_id`, không có bộ chọn store tại đây. Tài khoản một store không bị lỗi này. Backend vẫn kiểm tra owner nên đây không phải bỏ qua phân quyền. | Dùng store đang hoạt động trong workspace và xác minh thuộc tài khoản; làm rõ tên store. |
| Thấp | Gọi tạo link phòng cả khi chọn nền tảng ngoài | useEffect tạo code không kiểm tra `form.platform`. Browser chọn TikTok rồi chọn KOL vẫn POST `/live-sessions/shop/link-code` dù field phòng SCANMS ẩn. Sau tạo thành công reset link nhưng giữ KOL cũng phát sinh code mới khi đang ở tab lịch sử. | Chỉ tạo code khi platform SCANMS, ở form tạo, có KOL; giữ retry/guard chống dữ liệu KOL cũ. |
| Thấp | Ảnh thay thế KOL là người ngẫu nhiên | `getFallbackAvatar` chọn một trong bảy ảnh Unsplash theo ID/tên; ảnh hỏng cũng thay bằng người lạ. Có thể khiến Shop nhận nhầm đối tác. | Dùng avatar thật hoặc chữ cái đầu, không dùng chân dung của người khác. |
| Thấp | Một số validation chưa đồng nhất | Tên chỉ khoảng trắng có thể qua `required`/IsNotEmpty rồi backend trim thành rỗng. Input mỗi khách không max100; platform ngoài không kiểm tra link thuộc TikTok/YouTube tương ứng. | Trim và kiểm tra tên không rỗng, đồng bộ min/max; URL ngoài nên gọi đúng là link kênh/phòng do Shop cung cấp, không ngụ ý tích hợp/kiểm chứng nền tảng. |
| Thấp | Một số trạng thái tài chính là nhánh chết hoặc không có giải thích | `financialAlertTier` chỉ trả SAFE/WARNING/EXCEEDED nhưng JSX vẫn xử lý DANGER và `acceptedHighRisk` không có control. Tổng được chặn hiển thị ở25 và nút bị khóa nếu raw tổng>25, không có thông báo rõ ngay tại nút. | Dọn nhánh không dùng; thể hiện lý do nút bị khóa. Với catalog theo chính sách hiện tại, tổng tối đa thường thấp hơn25, không nên thêm checkbox xác nhận rủi ro chỉ vì có state cũ. |

## Kiểm tra từng phần và nút

| Phần / thao tác | Kết quả |
| --- | --- |
| Tab lịch sử / tạo phiên | Đổi đúng nội dung trong `/merchant/live-sessions`; tab dùng state local, URL không giữ tab nên F5 trở về lịch sử. Đây là hạn chế trải nghiệm, không phải điều hướng sang trang sai. |
| Tên phiên | Có max200, bắt buộc nhập; cần xử lý tên toàn khoảng trắng. |
| Chọn SCANMS/TikTok/YouTube/Facebook/Khác | Đổi nền tảng và hiện đúng nhóm field. Nền tảng ngoài là khai báo link, không có bằng chứng tự đồng bộ lịch/số follower/trạng thái phát sóng của nền tảng đó. |
| Catalog KOL | API chỉ lấy StoreCollaborator APPROVED, user active/chưa xóa; backend tạo phiên kiểm tra lại. “KOL đối tác sẵn sàng” là số đối tác hợp lệ, chưa có kiểm tra lịch rảnh/trùng phiên hay trạng thái online. Nên đổi chữ thành “KOL đã hợp tác”. |
| Tìm KOL | Tìm tên/kênh/platform/URL, có bỏ dấu; browser tìm “nguyen mai” ra Nguyễn Mai Anh. |
| Tất cả / VIP / sắp xếp follower | Thử đổi lọc/sort đạt, không làm mất bộ lọc VIP. Follower là dữ liệu hồ sơ đã lưu, không phải truy vấn realtime TikTok. |
| Chọn / thay đổi KOL | Cập nhật đúng creatorId, clear link cũ; phản hồi link của KOL cũ có guard không ghi đè. Đổi KOL không tự xóa sản phẩm/lịch đã chọn. |
| Link tự sinh | POST `/live-sessions/shop/link-code` đúng; backend kiểm tra owner/KOL, tạo code12 ký tự và kiểm tra trùng. Browser nhận `/live/QA1234567890`. Route frontend `/live/:slug` và API `public/detail/:identifier` hỗ trợ code. Trước khi tạo session thành công, mã mới chưa có bản ghi phòng để truy cập; không nên hứa link chia sẻ hoạt động ngay lúc chọn KOL. |
| Sao chép link | Chỉ bật khi có link; có await/catch. Browser thử clipboard thành công và bị từ chối đều báo đúng, không giống lỗi sao chép ở tab coupon. |
| Thử lại link | Có nút, tăng retry và gọi lại đúng endpoint. Kiểm tra bằng mã nguồn; chưa mô phỏng riêng HTTP500 của link trong browser audit. |
| Thêm/xóa kênh ngoài | Thêm được nhiều hàng; giữ ít nhất một hàng; payload dùng kênh đầu làm liveUrl và gửi toàn bộ externalChannels. Browser thử thêm hàng/đổi platform; chưa submit phiên TikTok thật. Backend chặn trùng URL và follower phải là số nguyên>=0. |
| Lịch bắt đầu/kết thúc | Có chọn ngày/giờ, nút Bây giờ và +1/+2/+3/+4h. Browser Bây giờ rồi +2h gửi hai timestamp cách nhau đúng7.200.000ms. Backend chặn quá khứ>2h và kết thúc<=bắt đầu; bắt đầu trong quá khứ<=2h được chỉnh thành now. Lỗi ISO bound riêng nêu trên. |
| Sản phẩm | API chỉ lấy sản phẩm của store, đang bán, APPROVED/chưa xóa; create kiểm tra lại owner sản phẩm. Không chọn sản phẩm thì chặn submit, cuộn/focus vào khu chọn. |
| Tìm sản phẩm / Tất cả / Đã chọn | Tìm theo tên sản phẩm hoặc tên/mã biến thể. Browser tìm MASK5 đúng sản phẩm. Hiện không tìm SKU của sản phẩm cha và không bỏ dấu như tìm KOL; placeholder “mã SKU” chưa nói rõ SKU biến thể. |
| Chọn tất cả / Bỏ chọn hết | “Chọn tất cả” chỉ chọn các sản phẩm đang qua bộ lọc, không phải toàn catalog; “Bỏ chọn hết” xóa toàn bộ sản phẩm/variant. Hành vi có thể giữ nhưng nên đổi thành “Chọn sản phẩm đang hiển thị” và “Bỏ chọn tất cả”. |
| Biến thể SKU | Bật sau khi chọn sản phẩm; bỏ sản phẩm loại các variant của sản phẩm đó. Backend kiểm tra variant active và thuộc productIds. Không chọn variant thì session dùng productId chung, có nghĩa tất cả biến thể, cần chú thích ngắn. Browser payload có đúng productId và variantId đã chọn. |
| Loại giảm % / tiền | Field mức giảm đổi theo loại; HTML/backend chặn %>100 và số<=0; tổng lượt nguyên>=1. Không có điều kiện đơn tối thiểu/trần giảm hiển thị như đã nêu. |
| Thưởng +2%/+3% | Chọn đúng mức; browser tính 12+1+3=16 và gửi bonus3. Backend chặn các giá trị khác2/3. Tổng chỉ là ước tính tối đa theo catalog hiện tại, không cam kết mọi sản phẩm/đơn đều có đủ Deal/chiến dịch ở lịch tương lai. |
| Lời nhắn riêng | Tùy chọn, giữ trong customMessage và ghép trước thư mời mặc định. Frontend max1000, DTO max2000: khác giới hạn nhưng không làm payload frontend bị từ chối. Browser xác nhận lời nhắn trong POST; chưa kiểm tra nhận bằng hai tài khoản thật. |
| Hủy | Quay lại tab lịch sử, không gửi API, không xóa bản nháp. Có thể đổi thành “Quay lại” nếu muốn giữ bản nháp. |
| Tạo phiên | POST `/live-sessions/shop` đúng, payload đủ selected IDs, lịch, voucher và bonus; có disabled khi saving, báo lỗi và giữ form khi thất bại. Thành công tải danh sách, về lịch sử và mở chi tiết. Browser mô phỏng phản hồi chưa có report vẫn không crash. |
| Chi tiết sau tạo | Mở đúng phiên được trả về, link phòng trỏ đúng liveUrl. Nên hiện rõ trạng thái chờ KOL tại modal; snapshot sau tạo hiện thông tin voucher nhưng không nói rõ chờ xác nhận. |
| Mở link live | Thẻ/modal dùng liveUrl của chính session. Với SCANMS route đúng mã phòng; với ngoài sàn mở URL khai báo. Chỉ đối chiếu URL/route, chưa mở camera hay phát sóng thật. |

## Chức năng cần giữ / có thể bỏ

- Giữ các phần1–6: thông tin/KOL, lịch, sản phẩm/biến thể, voucher, thưởng và lời nhắn tùy chọn. Không có phần bắt buộc nào nên xóa toàn bộ.
- Bộ lọc VIP, sort follower, cộng nhanh thời lượng và chọn tất cả là tiện ích; không dư nghiệp vụ nhưng có thể thu gọn nếu danh sách ngắn.
- Bỏ chân dung giả, API tạo code khi không cần và nhánh rủi ro không bao giờ được dùng. Sửa/bỏ nút tạm dừng cũ theo quy trình governance hiện tại.
- Không cần thêm nút “đến TikTok” hay “mở live ngay” khi KOL chưa nhận lời. Cần mô tả đúng trạng thái thay vì thêm thao tác không có backend hỗ trợ.
- Không phải bỏ trần giảm/đơn tối thiểu vì form đang thiếu: đó là điều kiện voucher hữu ích nên bổ sung.

## Kiểm chứng

- Backend: `npx jest --config test/jest-unit.config.cjs --runInBand src/modules/live-sessions` — 8 suite, 62/62 test đạt.
- Frontend: 5 file live-session-loading/created-render/product-pin/voucher-drop/evidence-upload — 13/13 mục kiểm thử đạt.
- Browser: `frontend/tests/live-create-audit.browser.test.mjs` đạt. Dùng React app thật trên localhost, timezone Asia/Ho_Chi_Minh; chặn toàn bộ API/socket/nguồn ngoài. Thử tìm/sort/lọc/chọn KOL, đổi nền tảng, thêm kênh, link và clipboard hai trường hợp, lịch Bây giờ/+2h, chọn/bỏ/chọn lại sản phẩm/variant, tìm SKU, bonus3, chặn khi thiếu lượt mỗi khách, tạo giả lập và mở chi tiết.
- Payload/quan sát: `artifacts/live-create-audit/observations.json`; ảnh `artifacts/live-create-audit/created.png`. Mức16 trong fixture là số liệu giả lập để kiểm tra phép cộng, không phải dữ liệu của Shop thật.
- Lỗi ISO được tái hiện bằng trích hàm `parseSafeDate` thật, transpile TypeScript rồi chạy với Date tại timezone Việt Nam.
- Chưa thực hiện end-to-end với KOL thật, gửi lời mời thật, thông báo đại trà, tạo voucher/đặt hàng/thanh toán, quyền camera/microphone hay phát video. Không đọc `.env`, không thay đổi backend/dữ liệu kinh doanh trong lần audit này.

Lệnh browser từ thư mục frontend:

```powershell
$env:LIVE_AUDIT_URL='http://127.0.0.1:5173'
$env:LIVE_AUDIT_BROWSER='C:\Program Files\Google\Chrome\Application\chrome.exe'
node --test tests/live-create-audit.browser.test.mjs
```
