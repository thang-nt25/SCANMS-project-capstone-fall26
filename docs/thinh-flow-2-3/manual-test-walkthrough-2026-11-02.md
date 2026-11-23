# Kịch bản thao tác web — Thịnh, Flow 2 và nửa đầu Flow 3

Cập nhật 02/11/2026 theo code sau merge `0230e53`. Đây là hướng dẫn nghiệm thu thủ công, không phải xác nhận các ca đã PASS. Dùng dữ liệu tự tạo qua web, lưu DB nhóm; không reset/seed để chạy lại kịch bản.

## Chuẩn bị

- Mở `http://localhost:5173/login`. Dùng cùng một hostname `localhost` trong suốt phiên.
- Mỗi role dùng profile/cửa sổ đăng nhập độc lập. Hai tab trong cùng profile chia sẻ phiên; hai cửa sổ ẩn danh của cùng trình duyệt cũng chia sẻ phiên ẩn danh.
- Chuẩn bị Shop Aura và hai KOC để kiểm tra hai chiều. Nếu quan hệ đã APPROVED, chọn cặp Shop/KOC chưa liên kết; không xóa quan hệ đã có để làm lại. Có thể đăng ký KOC test mới trên web, rồi hoàn thành quy trình KYC trước.
- Tài khoản đã đối chiếu read-only trên DB trong lượt lập hướng dẫn: `shop.aura.test@scanms.vn`, `kol.bronze@scanms.vn`, `kol.silver@scanms.vn`, `manager@scanms.vn`, `admin@scanms.vn`, `customer.an@scanms.vn`. Cả sáu đang hoạt động và mật khẩu test đã giao trong chat đều khớp; không đổi mật khẩu.
- Dùng hậu tố riêng cho dữ liệu, ví dụ `UAT-0211-01`; lần chạy sau đổi hậu tố. Ghi lại mã sản phẩm, mã đề nghị và mã đơn.
- Chuẩn bị ảnh bìa vuông từ 800×800px, tối đa 5 MB, định dạng JPG/PNG/WebP; một số ảnh phụ và video thực tế nếu muốn kiểm tra media.

## 1. Tạo sản phẩm — SHOP_MANAGER

Vào **Sản phẩm** `/merchant/products` → **Thêm sản phẩm**.

Dữ liệu gợi ý cho Shop thời trang Aura:

| Trường | Giá trị |
|---|---|
| Tên A | Áo thun thể thao nữ UAT-0211-01 |
| SKU | UAT-AURA-0211-A |
| Barcode thử nghiệm đúng checksum | 8939202611016 |
| Giá niêm yết | 350.000 đ |
| Phân loại | Màu Đen/Trắng và Size M/L; khai báo đủ SKU/giá/tồn từng dòng |
| Tồn | 50 cho mỗi phân loại dùng thử |
| Khối lượng đóng gói | 500 g |
| Dài × rộng × cao | 20 × 15 × 10 cm |
| Mô tả | Ghi rõ chất liệu, kích cỡ, cách dùng/bảo quản và đây là sản phẩm UAT |

EAN này là dữ liệu thử nghiệm tính đúng checksum, không phải xác nhận mã hàng thương mại. Nếu trùng mã đã có, dùng mã test khác có checksum hợp lệ; không sửa tùy ý một chữ số.

1. Xem ngành hàng: phải theo ngành đã cấu hình của Shop.
2. Điền sáu khối theo form, nhất là các trường có dấu `*`. Hồ sơ/chứng từ phải khớp loại sản phẩm; không dùng đường dẫn trống để giả hồ sơ đã đầy đủ.
3. Upload ảnh bìa và ảnh phụ; nhập số đo đóng gói.
4. Bật tiếp thị nếu muốn dùng tiếp trong matching/VIP. Cấp mẫu và hoa hồng có thể thiết lập theo chính sách form hiện tại.
5. Bấm **Gửi duyệt sản phẩm**, sau đó reload.

**Đạt:** bản ghi lưu được, còn đúng số liệu/ảnh/phân loại sau reload và ở trạng thái chờ kiểm duyệt. Chưa được công khai như sản phẩm đã duyệt.

Tạo thêm B với tên khác rõ ràng, ví dụ **Túi đeo chéo thể thao UAT-0211-01**, SKU `UAT-AURA-0211-B`, barcode test `8939202611023`. B dùng cho ca từ chối/VIP ngoại lệ để tránh lẫn với A.

## 2. Kiểm tra form chặn dữ liệu sai — SHOP_MANAGER

Chạy trên form tạo mới hoặc bản nháp, không ghi đè sản phẩm đang bán:

1. Bỏ trống tên hoặc giá → gửi: báo trường thiếu, không tạo bản ghi thành công.
2. Nhập barcode `4006381333932` → gửi: báo sai EAN-13.
3. Nhập trọng lượng 0 hoặc kích thước âm → gửi: bị từ chối.
4. Upload ảnh bìa không vuông/799px; sau đó ảnh vuông ≥800px: ảnh sai bị chặn, ảnh hợp lệ tải được.
5. Thử ảnh phụ thứ năm: không cho vượt giới hạn bốn ảnh phụ.
6. Tạo sản phẩm mới dùng SKU/barcode đã lưu: bị chặn trùng, không mất hồ sơ đang nhập.
7. Thử tên gần nghĩa với sản phẩm có sẵn: nếu điểm tương đồng vượt ngưỡng, phải có cảnh báo để kiểm tra, không tự bỏ qua hoặc tự sửa tên.

## 3. Duyệt và từ chối sản phẩm — SYSTEM_MANAGER → SHOP_MANAGER

1. Manager vào **Kiểm duyệt sản phẩm** `/admin/product-moderation` → **Chờ duyệt**.
2. Tìm A theo tên/SKU; mở hồ sơ, kiểm tra ảnh, nội dung, phân loại và Shop.
3. Duyệt A với reviewer độc lập với người tạo/gửi.
4. Shop reload danh sách: A phải chuyển đã duyệt.
5. Mở Marketplace/gian hàng công khai: tìm được A nếu đang bật bán và còn tồn.
6. Manager mở B → từ chối, ghi lý do cụ thể, ví dụ `Cần bổ sung thông tin chất liệu và xuất xứ`.
7. Shop mở B: thấy đúng lý do; sửa hồ sơ và gửi lại. Manager duyệt lại để dùng B ở các ca sau.

**Đạt:** trạng thái hai role đồng bộ sau reload, sản phẩm chưa duyệt không lọt vào danh sách bán/đề nghị đã duyệt. Với ca reviewer tự duyệt hồ sơ do chính mình tạo/gửi, phải bị chặn; nếu UI không cho tạo hồ sơ bằng reviewer, ghi đây là ca kiểm quyền API riêng, không ghi PASS thủ công chỉ vì nút không có.

## 4. Giá sàn MAP tự đồng bộ — SYSTEM_MANAGER/ADMIN → SHOP_MANAGER

1. Reviewer vào **Giá sàn & Khuyến mãi** `/admin/pricing`, tìm A.
2. Cấu hình giá sàn chung 300.000 đ; kiểm tra các SKU nếu có sàn riêng, lưu lý do.
3. Shop vào **Giá bán & MAP** `/merchant/pricing` → **Làm mới**.
4. Kiểm tra đúng A và các phân loại, reload lần nữa.

**Đạt:** Shop tự đọc được sàn reviewer đã đặt và không có quyền tự sửa sàn. Giá niêm yết 350.000 đ không tự chuyển thành 300.000 đ; MAP là giới hạn giá, không phải lệnh thay giá bán.

## 5. Duyệt khuyến mãi có lịch — SHOP_MANAGER → REVIEWER → SHOP_MANAGER

1. Shop tại `/merchant/pricing` bấm **Đề xuất khuyến mãi**, chọn A/phân loại tương ứng.
2. Nhập 290.000 đ trong khi MAP là 300.000 đ → gửi: phải bị từ chối.
3. Đổi giá 320.000 đ; ngân sách 300.000 đ; bắt đầu sau 3 phút, kết thúc sau 10 phút; nhập lý do rồi gửi.
4. Trước khi reviewer duyệt: trạng thái chờ, giá bán vẫn theo dữ liệu hiện hành.
5. Reviewer `/admin/pricing` duyệt đúng đề nghị.
6. Đến giờ bắt đầu, làm mới Shop và trang sản phẩm công khai: kiểm tra giá áp dụng đúng phạm vi SKU.
7. Đến giờ kết thúc, chờ scheduler xử lý rồi làm mới: giá trở về giá niêm yết. Không sửa giá thủ công để làm giả kết quả tự khôi phục.

**Đạt:** không hạ dưới MAP; không kích hoạt chỉ vì Shop gửi đề nghị; đúng lịch/ngân sách/phạm vi. Giá lịch sử của đơn cũ không thay theo catalog.

## 6. AI Matchmaker — SHOP_MANAGER

1. Vào `/merchant/products`, tìm A đã duyệt → nút **Tìm KOC bằng AI**.
2. Xem drawer: đúng tên/ID sản phẩm, danh sách KOC, điểm phù hợp, radar và lý do.
3. Xem KOC ít lịch sử: số liệu thiếu phải được thể hiện đúng, không tự có doanh thu/CR.
4. Bấm **Mở trang so sánh KOC**; hoặc vào `/merchant/kol-hub?mode=ai-matching`.
5. Thử bộ lọc và so sánh KOC có trên trang; ghi lại điều kiện lọc khi chụp ảnh.

**Đạt:** kết quả theo sản phẩm/điều kiện, không lẫn Shop khác. Không bắt mọi KOC phải có điểm >80; ngưỡng cảnh báo tên gần nghĩa là nghiệp vụ khác. Nếu mô hình không sẵn sàng, ghi lỗi thực tế, không ghi kết quả giả là AI hoạt động.

## 7. KOC chủ động xin hợp tác — COLLABORATOR → SHOP_MANAGER

1. Dùng một KOC chưa liên kết với Aura. Vào Marketplace `/marketplace`, mở gian hàng Aura.
2. Bấm nút gửi yêu cầu hợp tác, nhập kế hoạch: `UAT-0211: thực hiện video trải nghiệm và giới thiệu sản phẩm thời trang của Aura`.
3. Gửi; xem trạng thái chờ Shop duyệt. Kế hoạch quan hệ hợp tác giới hạn 255 ký tự.
4. Shop mở **Mạng lưới Đối tác** `/merchant/kol-hub` → **Tin nhắn & Hợp tác**.
5. Trong **Yêu cầu hợp tác từ KOL**, duyệt đúng người.
6. KOC quay lại cửa sổ hợp tác/trang Shop và làm mới nếu cần: trạng thái đã liên kết.

**Đạt:** đúng KOC/Shop nhận yêu cầu; bên gửi không tự duyệt; gửi/bấm lại không tạo nhiều quan hệ. Muốn kiểm tra từ chối, dùng cặp khác chưa liên kết, ghi rõ lý do/ảnh kết quả.

## 8. Shop chủ động mời KOC — SHOP_MANAGER → COLLABORATOR

1. Shop vào `/merchant/kol-hub?mode=ai-matching` hoặc tab AI Radar của Mạng lưới Đối tác.
2. Chọn KOC thứ hai chưa liên kết → **Mời hợp tác** → nhập nội dung → **Gửi lời mời**.
3. Đăng nhập đúng KOC đó, mở **Hàng mẫu trải nghiệm** `/collaborator/collaboration`.
4. Chọn bộ lọc **Lời mời**, chọn Aura → **Chấp nhận lời mời** hoặc **Từ chối lời mời**.
5. Kiểm tra lại phía Shop, sau đó reload hai bên.

**Đạt:** lời mời hiển thị cả khi chưa có hội thoại; đúng người được phản hồi; trạng thái được lưu. Mức % trong ghi chú lời mời hợp tác chưa phải hợp đồng VIP đã hiệu lực; kiểm tra hợp đồng ở bước 10–12.

## 9. Chat realtime — SHOP_MANAGER ↔ COLLABORATOR

1. Giữ hai profile đăng nhập khác nhau, mở cùng cuộc trò chuyện Aura–KOC.
2. Shop gửi `UAT-0211-Shop-01`; KOC trả lời `UAT-0211-KOC-01`.
3. Kiểm tra bên nhận không cần F5, tên người gửi và thứ tự đúng, không nhân đôi tin.
4. Reload cả hai: lịch sử vẫn còn. Nếu có media test, thử một ảnh, xem lại được.

**Đạt:** gửi/nhận realtime và lưu DB nhất quán. Không coi việc chat hoạt động là quan hệ hợp tác hay VIP đã được chấp thuận.

## 10. Shop gửi VIP 14% — SHOP_MANAGER → COLLABORATOR

Để test đúng form KPI doanh thu, mở từ **Sản phẩm → Tìm KOC bằng AI → Đề nghị VIP** trong drawer.

1. Chọn KOC, sản phẩm A và phạm vi **Một sản phẩm**.
2. Nhập thù lao 14%, mục tiêu doanh thu 1.000.000 đ, kỳ cam kết 14 ngày.
3. Điền kế hoạch hợp tác; nếu form cấp coupon có giảm giá/ngân sách, khai báo ngân sách thực tế của ca test, không bỏ qua trường bắt buộc.
4. Gửi đề nghị. KOC mở đúng hội thoại và đối chiếu sản phẩm/%/KPI/kỳ hạn.
5. KOC chấp nhận; quan sát thẻ chat cập nhật phía Shop.
6. Reload: trạng thái giữ đúng; kiểm tra link/coupon liên quan trên tài khoản KOC, đúng phạm vi và không cấp trùng khi bấm lại.

**Đạt:** bên nhận quyết định, người gửi không tự chấp nhận. Với mức ≤16%, không chờ ngoại lệ Admin nếu đủ điều kiện khác.

**Lưu ý code sau merge:** nút tạo thỏa thuận cũ trong KOL Hub vẫn có form KPI số đơn. Ghi rõ điểm vào khi test; dùng drawer hoặc đề xuất của KOC để test form **Mục tiêu doanh thu**. Nếu yêu cầu nghiệm thu đòi tất cả điểm vào cùng một form, sự khác nhau này là mục cần đối chiếu, không ghi đã đồng nhất toàn bộ UI.

## 11. KOC gửi VIP chiều ngược — COLLABORATOR → SHOP_MANAGER

1. KOC vào `/collaborator/collaboration`, chọn Aura → **Đề xuất deal VIP**.
2. Chọn sản phẩm đã duyệt, ví dụ B; nhập 15%, mục tiêu doanh thu 1.000.000 đ, 14 ngày và kế hoạch.
3. Gửi đề xuất. Shop mở đúng chat và kiểm tra chi tiết, chấp nhận hoặc từ chối.
4. KOC xem trạng thái cập nhật sau phản hồi và sau reload.

**Đạt:** đúng chiều ký; không cần gửi lại offer từ Shop để sửa ngược trạng thái của đề nghị KOC. Dùng đề nghị/cặp sản phẩm khác cho ca từ chối để không làm nhiễu hợp đồng đã dùng ở bước 10.

## 12. VIP ngoại lệ 20% và trần 25% — SHOP/KOC → ADMIN

1. Tạo đề nghị mới trên B hoặc cặp KOC chưa có thỏa thuận trùng, mức 20%.
2. Bên nhận chấp nhận: phải chuyển **Chờ Admin duyệt/PENDING_ADMIN_APPROVAL**, chưa được coi là hợp đồng hoạt động, chưa cấp tài nguyên mới cho đề nghị này.
3. System Manager thử truy cập `/admin/vip-exceptions`: không được phê duyệt ngoại lệ.
4. Admin vào **Ngoại lệ VIP** `/admin/vip-exceptions`, tìm đúng Shop/KOC/sản phẩm.
5. Duyệt với lý do: `UAT-0211: phê duyệt ngoại lệ cho chiến dịch kiểm thử`.
6. Quay lại hai phía: thẻ và tài nguyên cập nhật đúng. Dùng đề nghị riêng để test Admin từ chối.
7. Thử đề nghị 26%: bị chặn, không có hợp đồng hiệu lực 26%.

**Đạt:** sự đồng ý của hai bên ở 20% chưa bỏ qua bước duyệt Admin; tài nguyên cấp sau quyết định cuối, một lần. Không dùng Admin đang là người tạo đề nghị để làm người duyệt độc lập.

## 13. Phạm vi VIP — SHOP_MANAGER + COLLABORATOR

Chạy từng ca độc lập hoặc dùng KOC/sản phẩm khác để tránh các thỏa thuận trùng ảnh hưởng kết quả:

- **Một sản phẩm:** A nằm trong phạm vi, B không tự được hưởng.
- **Nhóm sản phẩm:** chọn A và B; sản phẩm C không được chọn không tự được hưởng.
- **Toàn gian hàng:** sau khi phê duyệt, tạo C và duyệt C; kiểm tra C thuộc phạm vi Store-wide khi đủ điều kiện áp dụng.

Đối chiếu phạm vi thẻ/hợp đồng và tài nguyên. Muốn chứng minh mức hoa hồng thực nhận, cần kiểm tra attribution/snapshot trên đơn có đúng KOC và sản phẩm; chỉ nhìn tên phạm vi chưa đủ.

## 14. Media Hub và tạo link — COLLABORATOR

1. KOC đã liên kết Aura vào **Link & Mã tiếp thị** `/collaborator/marketing` → tab **Media Hub** (mở thẳng `/collaborator/marketing?tab=media`).
2. Tìm tài nguyên của A/Aura; mở ảnh, phát video nếu Shop đã có video hợp lệ.
3. Tải một tài nguyên/gói ZIP; mở file kiểm tra đúng ảnh/video và nội dung hướng dẫn đi kèm. Nếu chưa upload video thì ghi chưa có dữ liệu, không ghi lỗi phát video.
4. Sang **Link & QR tiếp thị**, tạo link cho A.
5. Kiểm tra modal rộng, tên/ảnh sản phẩm, link; sao chép link, mở QR, tải PNG.
6. Reload danh sách: link vừa tạo còn tồn tại.

**Đạt:** đúng dữ liệu và quyền; tệp tải mở được, link/QR trỏ cùng mã. Nếu link trả về domain public khi đang test local, dùng `http://localhost:5173/r/<mã>` giữ nguyên mã để test local.

## 15. Kiểm tra quyền và trình bày

- Customer mở đường dẫn quản trị riêng: bị chặn, không gọi được hành động quản trị.
- Manager vận hành được kiểm duyệt, không được duyệt ngoại lệ VIP >16%.
- Shop khác không xem/sửa dữ liệu riêng của Aura qua ID/đường dẫn. Nếu chưa có tài khoản Shop B hợp lệ, ghi ca này chưa đủ điều kiện, không dùng việc đăng nhập Customer thay thế bằng chứng cách ly hai Shop.
- Mở màn hình 390px: form, tab, thẻ VIP, modal tạo link, ảnh/QR không tràn ngang; nút có loading/disabled và lỗi đọc được.
- Trong lúc còn bản nháp, đổi tab/quay lại phải giữ hoặc cảnh báo đúng; lỗi submit không tự xóa toàn bộ nội dung đã nhập.

## 16. Liên thông mua hàng, giao vận và hoa hồng — bổ sung sau flow chính

1. KOC tạo link; Customer mở link trên phiên độc lập, đăng nhập Customer rồi mua đúng sản phẩm/biến thể.
2. Nếu UI liệt kê phí GHN lỗi, chưa ghi PASS checkout. Kiểm tra địa chỉ/số đo kho và hàng; không tự nhập cước 0 để đi tiếp.
3. Dùng phương thức thanh toán test đã được nhóm chuẩn bị. Ví phải đủ tiền; GHN sandbox chỉ là môi trường giao vận, không biến PayOS thành cổng thanh toán giả.
4. Shop mở đúng đơn → **Tạo vận đơn GHN sandbox**; phải có mã từ GHN TEST. Không nhập chuỗi ngẫu nhiên vào mã thủ công để giả kết quả tạo sandbox.
5. Nếu thao tác mô phỏng được bật cho đơn TEST, hoàn tất mô phỏng; kiểm tra cả timeline và trạng thái danh sách đơn. Hành trình hiện là 1 phút: chờ lấy hàng lúc 0 giây, lấy hàng lúc 15 giây, trung chuyển lúc 30 giây, đang giao lúc 45 giây, đã giao lúc 60 giây. Danh sách có thể cập nhật trễ thêm vài giây do polling/scheduler; làm mới để đối chiếu.
6. Customer xác nhận **Đã nhận hàng** khi có nút; đơn chuyển hoàn thành. Gửi đánh giá rồi Reviewer kiểm duyệt, kiểm tra hiển thị công khai.
7. Đúng KOC tạo link mở **Ví thù lao** `/collaborator/wallet`, đợi cron khoảng 1–2 phút rồi làm mới: kiểm tra đúng đơn/Shop, hoa hồng và Ví Chờ.
8. Escrow chưa đủ hạn không được tự vào Ví Khả Dụng. Không sửa ngày DB để ghi rằng đã test chờ thực tế. Rút tiền chỉ test khi đã có số dư khả dụng hợp lệ và đủ KYC/ngân hàng.

Luồng hàng mẫu/GHN, đổi trả, escrow và payout cần phối hợp người phụ trách tương ứng; hoàn thành 1–15 là trọng tâm phần Thịnh, không tự nhận đã nghiệm thu toàn bộ 5 Main Flows chỉ vì một đơn đi qua sandbox.

## Ghi kết quả

Mỗi ca ghi: ID ca, role/email (không ghi mật khẩu), Shop/Product/Deal/Order ID, đầu vào, kết quả thực tế, PASS/FAIL/CHƯA ĐỦ ĐIỀU KIỆN và ảnh. Giữ ảnh của hai phía khi test realtime và duyệt hai chiều. Gặp lỗi: ghi đúng bước/thời điểm/thông báo; không reset DB hoặc đổi role để che lỗi.

**Thứ tự demo ngắn:** 1 → 3 → 6 → 8 → 9 → 10 → 12 → 14. Sau đó chạy bổ sung 4–5, 7, 11, 13, 15 và 16.
