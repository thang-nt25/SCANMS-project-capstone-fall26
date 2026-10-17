# Hai môi trường GHN cho hàng mẫu

## Nhận hàng và video thử ngay trên mã sandbox

### KOL không nộp video

Sau khi Shop xác nhận nhận hàng thử, để trống video rồi bấm **Giả lập hết hạn 14 ngày** ở chính khung sandbox bên Shop. KOL tải lại sẽ thấy **Quá hạn nộp video · Dữ liệu thử**, vẫn có nút nộp video qua form cũ. Đồng hồ giả lập được lưu riêng, không sửa receivedAt/deadlineAt gốc hay hạn của mẫu thật. Nếu đã nộp video, không cho giả lập tình huống chưa nộp nữa.

Luồng thật xử lý theo lịch mỗi giờ: nhắc Shop trước 48 giờ, KOL trước 24 giờ; quá hạn chuyển OVERDUE và báo hai bên. Shop có cơ chế gia hạn/xử lý nghĩa vụ/báo cáo vi phạm; Admin xét báo cáo và quyết định khóa quyền xin mẫu mới. Không tự khóa tài khoản hoặc tự trừ tiền vì bỏ lỡ hạn. Sandbox chỉ thể hiện tình huống, không gửi nhắc hạn hay báo cáo/khóa thật.

1. Shop tạo/chọn GHN sandbox như bên dưới. Dưới mã vận đơn có nhãn **Dữ liệu mô phỏng** và nút **Xác nhận đã nhận hàng thử**.
2. Bấm nút: hiện **Đã nhận · chờ video thử**, hạn nhận thử cộng 14 ngày. Bấm lại không đổi hạn.
3. KOL mở cùng yêu cầu mẫu, khung mã sandbox sẽ đồng bộ từ backend khi vào trang, focus hoặc sau 10 giây. Bấm **Nộp Link Video Review** để mở đúng **SubmitKolVideoModal** đang dùng cho hàng mẫu thật, với sản phẩm được chọn sẵn. Điền tiêu đề, link và mô tả như quy trình cũ. Modal có nhãn Dữ liệu mô phỏng và gửi sang API sandbox riêng; không gọi API nộp mẫu thật.
4. Shop thấy **Đã nộp video thử** và link sau khi tải lại hoặc đợt làm mới tự động.

Trạng thái thử lưu trong sự kiện SANDBOX_SAMPLE_STATE theo mã TEST, dùng được trên hai trình duyệt. Chỉ Shop sở hữu mẫu được xác nhận, chỉ KOL của mẫu được nộp link thử. Không cập nhật RECEIVED/videoUrl/deadlineAt thật của mẫu, không gửi duyệt video thật hay tạo hoa hồng; không đổi trạng thái bên GHN. Đây là mô phỏng có gắn mã sandbox, không phải bằng chứng GHN phát hàng thành công.

## Chống tạo trùng và màu ô chọn

Bấm tạo TEST lần nữa sẽ tra lại mã sandbox hiện tại và dùng lại nếu còn hiệu lực. Một khóa giao dịch theo yêu cầu mẫu ngăn hai lần bấm đồng thời sinh hai mã. Nếu GHN chưa tra được mã cũ, hệ thống báo thử lại thay vì tạo thêm. Chỉ tạo mã thay thế khi GHN xác nhận mã cũ đã hủy/hoàn/mất/hỏng.

Khung sandbox chỉ hiển thị mã hiện tại, các mã đã tạo trước nằm trong mục Lịch sử thu gọn. Không xóa hồ sơ cước hay tự hủy vận đơn cũ. Đã kiểm tra thực tế hai lời gọi đồng thời cùng dùng lại L8R3X8 và không thêm mã.

Ô select dùng giao diện base-select trên Chrome/Edge hỗ trợ, popup trắng và dòng chọn vàng be. Trình duyệt chưa hỗ trợ giữ fallback native color-scheme light. Các Select/CustomSelect dựng bằng React vốn dùng bảng màu trắng/vàng be.

## Tạo mã sandbox

1. Đăng nhập Shop → Mạng lưới KOL & Hợp tác → chọn KOL → Hàng mẫu.
2. Mẫu đã duyệt/chờ gửi: bấm **Tạo vận đơn GHN**. Mẫu đang giao: bấm **Tạo mã GHN sandbox**.
3. Trong modal, mục **Môi trường vận đơn GHN** có:
   - **GHN thật · Có bưu tá đến lấy hàng**: chỉ cho mẫu APPROVED/DELIVERY_ISSUE; dùng GHN_API_*.
   - **GHN sandbox · Thử API, không giao hàng thật**: dùng GHN_TEST_API_*, tạo vận đơn thử qua GHN API.
4. Chọn sandbox, bấm **Tạo vận đơn GHN sandbox**. Có thể làm tương tự tại Quản lý đơn hàng → Hàng mẫu KOL; trang này dùng nút Xác nhận tạo vận đơn.
5. Khung **GHN sandbox · Dữ liệu kiểm thử** xuất hiện dưới mẫu, có danh sách mã và nút **Theo dõi GHN sandbox**.
6. KOL vào Hợp tác & Nhận mẫu Shop → chọn Shop → Hàng mẫu, tải lại để thấy cùng khung mã thử. Mở theo dõi sandbox để tra API môi trường TEST.
7. Mã thử có thể đối chiếu tại https://5sao.ghn.dev, chọn đúng Shop sandbox. Đây không phải nút mô phỏng từng mốc và không bảo đảm GHN cấp công cụ chuyển trạng thái cho tài khoản Shop.

## Tách biệt dữ liệu

- Khi mẫu đã duyệt chưa có vận đơn thật nhưng đã có mã TEST, thẻ Shop/KOL và bộ lọc hiển thị **Đang giao · Sandbox**. Mã thử trở thành phần vận chuyển chính của thẻ, không phải một hộp phụ. Nút **Đổi môi trường GHN** mở lại lựa chọn TEST/LIVE, mặc định TEST cho mẫu này.
- Đây là trạng thái hiển thị của chuyến thử. Trạng thái nghiệp vụ mẫu thật trong database vẫn APPROVED cho đến khi Shop thực sự gửi kiện thật; sandbox không lấy quyền nộp video hay bắt đầu SLA thật. Không đổi mẫu thật thành RECEIVED từ dữ liệu TEST.

- Không thay mã/thời điểm nhận/trạng thái/hạn video của mẫu thật khi tạo TEST. GYMUARMG đã hủy vẫn nằm trong lịch sử thật.
- Sandbox lưu cước với environment TEST; tổng phí thật trên các màn hình Shop loại khoản này.
- TEST không phát thông báo gửi hàng thật, không chuyển RECEIVED hoặc mở video thật, dù API TEST trả delivered.
- Mã mới được lưu trong sampleShippingCharges và sự kiện GHN_SANDBOX_CREATED; không cần migration schema.
- Tra cứu ghi rõ TEST/LIVE, lưu bằng chứng theo môi trường; không chuyển qua token thật khi test không tìm thấy mã.
- Mẫu SHIPPED chỉ mở tùy chọn TEST để tránh tạo trùng kiện thật. Muốn gửi lại kiện thật cần luồng DELIVERY_ISSUE thích hợp; việc hủy tại GHN không tự đổi trạng thái mẫu trong SCANMS.

## Kiểm tra tích hợp thực tế

Đã tạo thử sandbox **L8R3XP**, GHN trả ready_to_pick, giữ nguyên toàn bộ bản ghi mẫu thật GYMUARMG. Kiểm thử không tạo vận đơn Production. Trong lần thử đầu, GHN đã cấp một mã sandbox nhưng việc lưu cước bị database từ chối; ràng buộc đã được sửa ở ứng dụng để dùng đúng trạng thái cước hiện có. Vì vậy danh sách GHN sandbox có thể có thêm một đơn thử chưa gắn vào SCANMS.

Test tự động: ghn.service.spec.ts kiểm tra route môi trường/địa chỉ/không cập nhật mẫu thật, sample-delivery-sla.spec.ts bảo vệ xác nhận nhận hàng thật, sample-ghn-environment.browser.test.mjs kiểm tra hai modal Shop và theo dõi KOL bằng TEST, không gọi sync nhận hàng thật.
