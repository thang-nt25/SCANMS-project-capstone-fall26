# Kịch bản kiểm thử và demo web — Phan Xuân Thịnh

> Cập nhật 13/11/2026: Thịnh xác nhận phần thuyết trình chính là **Main Flow 3**. Dùng [kịch bản Main Flow 3](THINH_MAIN_FLOW_3_TEST_2026-11-13.md) cho buổi demo; danh sách Flow 2 mở rộng dưới đây chỉ giữ để tham khảo các ca đã đối chiếu trước đó, không còn là phạm vi trình bày chính.

Ngày đối chiếu: 11/11/2026. Đây là hướng dẫn chạy UAT; từng ca chỉ được ghi PASS sau khi thao tác và lưu bằng chứng thực tế.

Nguồn phân công: `SCANMS_REALIGNMENT_BLUEPRINT.md`, Phần 8: **Thịnh phụ trách Main Flow 2 và nửa đầu Main Flow 3**; đối chiếu thêm `SCANMS_MASTER_REFACTORING_PLAN.md`. Hai bản gốc đọc từ Downloads của người dùng. Khi tài liệu cũ khác quyết định mới của lead/AGENTS.md, dùng quyết định mới: không Media Hub, không voucher Shop/Sàn/freeship, không lưu mã; chỉ mã KOL nhập tay, chat chia sẻ tệp. Livestream là bổ trợ.

## 1. Chuẩn bị trước buổi demo

- Web: http://localhost:5173 ; API: http://localhost:3000/api ; Swagger: http://localhost:3000/api/docs.
- Backend dùng `backend/.env` hiện có, PostgreSQL nhóm trên Supabase. Lượt khởi động này không reset/seed/migrate.
- Health đã trả `UP` / `database: CONNECTED`. Redis 6379 chưa chạy, backend đang dùng cache bộ nhớ; không trình bày đây là kiểm chứng Redis phân tán.
- Mở 3 profile trình duyệt độc lập cho Shop, KOL, Manager; thêm profile Admin khi test VIP >16%. Nhiều tab trong cùng profile chia sẻ localStorage và có thể đổi tài khoản của nhau.
- Các identifier đang cấu hình tự điền ở FE được liệt kê dưới đây; lượt này chưa xác minh lại mật khẩu bằng đăng nhập. Tự điền vẫn gọi API thật.

| Vai trò | Identifier đang cấu hình | Dùng ở bước |
|---|---|---|
| SHOP_MANAGER | manager.sora@scanms.vn | Tạo sản phẩm, hợp tác, chat, VIP, Live |
| COLLABORATOR | kol.bronze@scanms.vn | Nhận/gửi hợp tác, chat, phản hồi VIP |
| SYSTEM_MANAGER | manager@scanms.vn | Kiểm duyệt sản phẩm và giá sàn |
| SYSTEM_ADMIN | admin@scanms.vn | Duyệt đặc cách VIP >16% |
| CUSTOMER | customer.an@scanms.vn | Kiểm tra mã KOL nhập tay, mua từ Live |

Shop dùng mật khẩu DB hiện hành; không mặc định cho rằng `Shop@123456` đúng. Nếu Shop/KOL đã liên kết, dùng cặp tài khoản hợp lệ khác chưa liên kết để test lời mời; không xóa quan hệ thật để dựng lại ca. Chuẩn bị KOL đã đủ điều kiện hợp tác và pháp lý theo API.

Dữ liệu demo: tạo hai sản phẩm A/B đúng ngành Shop, dùng hậu tố `UAT-1111-01`, SKU riêng, barcode EAN-13 hợp lệ và chưa tồn tại, ảnh sản phẩm thật đúng yêu cầu form, thông số đóng gói GHN. A dùng cho luồng duyệt/VIP; B dùng ca từ chối và kiểm tra phạm vi. Không chỉnh một chữ số barcode tùy ý vì có số kiểm tra.

## 2. Luồng chính cần demo

### TC-01 — Tạo sản phẩm và khóa ngành hàng

**Role:** SHOP_MANAGER. **Điểm vào:** Sản phẩm → `/merchant/products` → Thêm sản phẩm.

1. Xác nhận đúng Store được phân công. Quan sát danh mục/ngành hàng theo Store, không tự đổi sang ngành Store khác.
2. Điền định danh, SKU/barcode, ảnh, mô tả, biến thể/giá/tồn, đóng gói GHN và hồ sơ pháp lý theo yêu cầu form.
3. Tạo A, gửi duyệt rồi reload danh sách.
4. Thử ca sai trên bản nháp riêng: thiếu tên/giá, barcode sai/trùng, thông số đóng gói không hợp lệ.

**Đạt:** A lưu đủ dữ liệu, chờ duyệt và chưa công khai; dữ liệu sai bị chặn với lỗi rõ, không báo thành công. Chụp ngành hàng bị khóa, form và trạng thái sau reload.

### TC-02 — Maker–Checker: duyệt, từ chối, gửi lại

**Role:** SYSTEM_MANAGER → SHOP_MANAGER. **Điểm vào:** Sản phẩm & Giá sàn → Kiểm duyệt sản phẩm, `/admin/products-pricing?tab=moderation`.

1. Manager tìm A theo tên/SKU; mở hồ sơ, kiểm tra ảnh, thông tin pháp lý và biến thể.
2. Duyệt A bằng reviewer độc lập với người tạo/gửi.
3. Shop reload; khách mở gian hàng để kiểm tra A xuất hiện khi đang bán và còn tồn.
4. Với B, Manager từ chối kèm lý do; Shop xem lý do, sửa và gửi duyệt lại.

**Đạt:** trạng thái đồng bộ; chỉ sản phẩm đủ điều kiện được công khai; không bỏ qua bước người tạo–người duyệt. Chụp cả phía Manager và Shop. Nếu chưa dựng được ca tự duyệt bằng UI, ghi chưa kiểm chứng ca quyền đó, không tự ghi PASS.

### TC-03 — AI Matchmaker theo sản phẩm

**Role:** SHOP_MANAGER. **Điểm vào:** Sản phẩm → A đã duyệt → Tìm KOC bằng AI.

1. Kiểm tra drawer đúng A, danh sách KOC, điểm và radar 4 trục, lý do đề xuất, độ đầy đủ dữ liệu.
2. Mở trang so sánh KOC từ drawer; xem bộ lọc và dữ liệu hiệu suất.
3. Kiểm tra KOC ít đơn: không dựng CR/doanh thu giả để lấp chỗ trống.

**Đạt:** kết quả có nguồn dữ liệu đúng, không coi điểm xếp hạng là xác suất chốt đơn. Code hiện phân biệt KOC dưới 5 đơn (cold start) với KOC đủ lịch sử; không bắt radar phải ra 94% như ví dụ MD. Nếu mô hình/API không sẵn sàng, ghi lỗi thật.

### TC-04 — Shop chủ động mời KOL

**Role:** SHOP_MANAGER → COLLABORATOR. **Điểm vào:** Mạng lưới Đối tác → AI Radar/khám phá KOL, `/merchant/kol-hub`.

1. Chọn KOL chưa hợp tác, gửi lời mời với kế hoạch rõ ràng.
2. Đăng nhập đúng KOL; mở Hợp tác & Hàng mẫu, `/collaborator/collaboration`; tìm lời mời của Store.
3. KOL chấp nhận; Shop làm mới để kiểm tra đã liên kết.
4. Dùng cặp khác để test từ chối. Thử bấm/gửi lại khi đang chờ.

**Đạt:** đúng người nhận, lời mời không phụ thuộc việc đã chat trước, không tạo quan hệ trùng, người gửi không tự chấp nhận. Lời mời hợp tác chưa phải Deal VIP có hiệu lực.

### TC-05 — KOL chủ động xin hợp tác

**Role:** COLLABORATOR → SHOP_MANAGER. **Điểm vào:** KOL mở gian hàng trên trang mua sắm → gửi đề xuất hợp tác.

1. Chọn Store chưa liên kết, nhập kế hoạch và gửi.
2. Shop vào Mạng lưới Đối tác, tìm yêu cầu từ KOL, đọc và duyệt/từ chối.
3. Reload hai phía và kiểm tra đúng trạng thái, đúng Store/KOL.

**Đạt:** hai chiều độc lập đều hoạt động, không yêu cầu Shop gửi ngược lời mời mới để hoàn tất đề xuất của KOL. Chụp trạng thái chờ và kết quả.

### TC-06 — Chat realtime và chia sẻ tài liệu

**Role:** SHOP_MANAGER ↔ COLLABORATOR. **Điểm vào:** `/merchant/kol-hub?tab=messages` và `/collaborator/collaboration`.

1. Mở đúng cuộc trò chuyện Store–KOL ở hai profile; Shop gửi `UAT-1111-Shop-01`, KOL trả lời.
2. Kiểm tra bên nhận không phải F5, không nhân đôi, đúng người gửi/thứ tự.
3. Gửi một ảnh và một tài liệu hợp lệ bằng công cụ đính kèm; bên kia mở/tải và đối chiếu nội dung.
4. Reload: tin nhắn và tệp còn trong lịch sử. Ra khỏi hội thoại và thử thông báo tin mới.

**Đạt:** nội dung lưu server, realtime hoạt động, quyền tệp đúng. Đây là cách chia sẻ tài nguyên hiện tại; không demo Media Hub cũ.

### TC-07 — Shop đề nghị VIP ≤16%, KOL phản hồi

**Role:** SHOP_MANAGER → COLLABORATOR.

**Điểm vào dùng KPI doanh thu:** `/merchant/products` → A → Tìm KOC bằng AI → Đề nghị VIP.

1. Chọn đúng KOL, A, thù lao 14%, mục tiêu doanh thu 1.000.000 đ, thời hạn 14 ngày; điền cam kết và chính sách mã KOL/ngân sách nếu form yêu cầu.
2. Gửi; KOL mở chat, xem thẻ điều khoản và chấp nhận.
3. Kiểm tra trạng thái ở hai phía, reload và kiểm tra tài nguyên tiếp thị được cấp đúng, không cấp trùng.
4. Dùng đề nghị riêng để test từ chối; bên gửi không tự chấp nhận đề nghị của mình.

**Đạt:** đối tác được quyền phản hồi; mức ≤16% không cần ngoại lệ Admin khi đủ điều kiện khác. 14% là tổng mức thù lao Deal, không phải cộng thêm 14% vào 10% + bậc.

**Khác biệt UI còn tồn tại:** nút tạo Deal cũ trong KOL Hub dùng `CreateExclusiveDealModal` với KPI số đơn; drawer dùng `ExclusiveOfferModal` với KPI doanh thu. Không ghi tất cả điểm vào đã đồng nhất.

### TC-08 — KOL đề nghị VIP, Shop phản hồi

**Role:** COLLABORATOR → SHOP_MANAGER. **Điểm vào:** `/collaborator/collaboration` → chọn Store → Đề xuất deal VIP.

1. Dùng B hoặc một cặp không chồng phạm vi với Deal trước; nhập 15%, KPI doanh thu, kỳ hạn và cam kết.
2. Shop nhận thẻ, kiểm tra và chấp nhận/từ chối đúng đề nghị.
3. KOL kiểm tra trạng thái sau phản hồi và reload.

**Đạt:** đúng chiều đàm phán, không biến đề nghị KOL thành một offer khác do Shop tạo; không bỏ qua điều kiện hợp tác/KYC/ngân sách.

### TC-09 — VIP >16% chuyển Admin, chặn vượt 25%

**Role:** SHOP_MANAGER + COLLABORATOR → SYSTEM_ADMIN.

1. Tạo đề nghị độc lập 20%, bên nhận đồng ý.
2. Kiểm tra chuyển hàng đợi Admin, chưa coi Deal có hiệu lực và chưa cấp tài nguyên như đã duyệt cuối.
3. Admin mở Thỏa thuận Đặc cách, `/admin/vip-exceptions`; xem đúng Store/KOL/phạm vi/KPI rồi duyệt với lý do.
4. Reload Shop/KOL, kiểm tra kết quả. Dùng đề nghị khác cho ca Admin từ chối.
5. Thử mức 26% và thử SYSTEM_MANAGER vào chức năng duyệt đặc cách.

**Đạt:** 20% không vượt bước Admin, 26% bị chặn, Manager vận hành không có quyền duyệt ngoại lệ. Chụp đủ 3 trạng thái: gửi → chờ Admin → quyết định.

### TC-10 — Phạm vi và điều khoản VIP

**Role:** SHOP_MANAGER + COLLABORATOR.

1. Deal một sản phẩm: A thuộc phạm vi, B không tự được hưởng.
2. Deal nhóm: tạo bằng form hỗ trợ chọn nhiều sản phẩm, kiểm tra danh sách được chọn và sản phẩm không được chọn.
3. Kiểm tra số tiền KPI, thời hạn, cam kết, mức thù lao giữ nguyên sau reload; đề nghị trùng/xung đột phải xử lý theo lỗi backend.

**Đạt:** thẻ/hợp đồng/tài nguyên cùng phạm vi. Để chứng minh tiền thực nhận phải có đơn đúng attribution và snapshot, chỉ nhìn nhãn chưa đủ.

**Giới hạn:** `ExclusiveOfferModal` hiện sinh `SINGLE_PRODUCT` hoặc `SELECTED_PRODUCTS`, chưa có lựa chọn tạo `STORE_WIDE` ở điểm vào này. Khả năng hiển thị/đọc Deal toàn Store không chứng minh đã có UI tạo mới toàn Store. Nếu thầy yêu cầu demo toàn Store, ghi đây là phần UI cần đồng bộ, không thay bằng gọi API rồi mô tả là đã thao tác trên web.

## 3. Kiểm tra liên thông, không nhận thay phạm vi của cả nhóm

### TC-11 — MAP và giảm giá sản phẩm

**Role:** SYSTEM_MANAGER/ADMIN → SHOP_MANAGER. **Điểm vào:** `/admin/products-pricing?tab=pricing`; Shop `/merchant/promotions?tab=price-promotions`.

1. Reviewer đặt MAP 300.000 đ trên sản phẩm giá niêm yết 350.000 đ.
2. Shop làm mới: sàn tự hiện nhưng giá niêm yết không tự đổi thành MAP; Shop không tự sửa MAP.
3. Đề xuất giá 290.000 đ: bị chặn. Đề xuất 320.000 đ với ngân sách/lịch hợp lệ: chờ reviewer duyệt.
4. Duyệt, kiểm tra lúc bắt đầu và kết thúc theo scheduler; đối chiếu đúng biến thể.

Đây là quản trị giá sản phẩm đã có trong web, không phải khôi phục chiến dịch đại trà hoặc voucher bán lẻ.

### TC-12 — Mã KOL chia sẻ, khách nhập tay

**Role:** COLLABORATOR → CUSTOMER.

1. KOL xem mã đã được duyệt trong Công cụ tiếp thị, `/collaborator/marketing?tab=coupons`, sao chép để chia sẻ.
2. Customer mở checkout: ô mã rỗng, không tự áp mã từ link/giỏ/Live.
3. Khách tự nhập rồi bấm áp dụng. Đúng mã/Store/phạm vi thì tiền hàng giảm theo API; phí GHN giữ đúng báo giá.
4. Thử mã sai/hết hạn/sai Store, xóa mã rồi đối chiếu tổng tiền.

**Đạt:** không Lưu voucher, kho voucher, mã sàn/Shop công khai hay freeship; không chồng nhiều tầng giảm giá đã bãi bỏ. Cần mua thật để kiểm chứng attribution cuối cùng; sao chép mã chưa tạo doanh số/KPI.

### TC-13 — Livestream và bonus (bổ trợ)

**Role:** SHOP_MANAGER → COLLABORATOR → CUSTOMER.

1. Shop vào Phiên Live, `/merchant/live-sessions`, chọn KOL đã hợp tác, sản phẩm hợp lệ, lịch và thưởng Live **+2%** theo quy tắc đã chốt; hoàn tất các trường mã KOL/ngân sách nếu form hiện yêu cầu.
2. KOL vào `/collaborator/live-sessions`, phản hồi lời mời, mở phiên theo các hành động UI cho phép. Customer vào đúng phòng khi phiên đang phát.
3. Kiểm tra sản phẩm đang ghim, giá/tồn, chat và thao tác mua. Nếu dùng mã, khách vẫn phải tự nhập; không tự áp từ phiên.
4. Đặt đơn test theo phương thức được nhóm chuẩn bị; Shop/nhóm giao vận xử lý giao hàng. Đối chiếu snapshot nguồn Live và thù lao của đúng KOL.
5. Đối chiếu tách tiền chuẩn + bonus Live với tiền chênh Deal chờ KPI. Kết thúc phiên không làm mất mức đã chốt cho đơn cũ.

**Ví dụ đối chiếu:** cơ sở tính thù lao sau giảm giá, chưa gồm phí ship là 1.000.000 đ; KOL Đồng chuẩn 10%, Deal 16%, Live +2% → tổng 180.000 đ: 120.000 đ chờ 14 ngày, 60.000 đ chờ KPI. Không cộng 10% +16% +2%; tổng tỷ lệ không vượt 25%.

**Lưu ý:** code hiện còn hỗ trợ lựa chọn Live +3%; để bám quy tắc AGENTS.md dùng +2% trong buổi demo. Không tuyên bố UI đã loại +3%. Chứng minh khoản mở khóa sau 14 ngày cần bộ dữ liệu đủ hạn/fixture kiểm thử đã chuẩn bị; không sửa ngày DB nhóm hay dùng mô phỏng giao vận 1 phút để thay cho 14 ngày escrow.

Hàng mẫu/SLA, GHN, đổi trả/clawback, escrow và payout là các luồng cần phối hợp người phụ trách tương ứng; không gọi toàn bộ là nhiệm vụ demo chính của Thịnh theo hai MD.

## 4. Thứ tự trình bày và lưu kết quả

Demo ngắn: **TC-01 → TC-02 → TC-03 → TC-04 → TC-06 → TC-07 → TC-09**. Sau đó trình bày chiều ngược TC-05/08 và phạm vi TC-10. MAP, mã KOL và Live là các ca liên thông/bổ sung khi có thời gian.

Mỗi ca ghi: ID, role/email, Store/Product/Deal/Order ID, đầu vào, kết quả thực tế, PASS/FAIL/CHƯA ĐỦ ĐIỀU KIỆN, thời điểm và ảnh hai phía nếu cần. Reload để xác minh dữ liệu đã lưu. Không chụp mật khẩu, JWT hoặc khóa dịch vụ.

| Ca | Kết quả thực tế | Trạng thái | Ảnh/ID bằng chứng |
|---|---|---|---|
| TC-01..TC-13 | Điền sau khi thao tác | CHƯA CHẠY UAT lượt này | |

Kết quả khởi động 11/11: frontend HTTP 200, backend health HTTP 200 / DB CONNECTED; một frontend cổng 5173 và một backend cổng 3000. Điều này không thay thế việc nghiệm thu các ca trên.
