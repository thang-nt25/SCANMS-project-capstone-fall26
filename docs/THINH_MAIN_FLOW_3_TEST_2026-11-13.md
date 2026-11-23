# Main Flow 3 — Kịch bản test và trình bày của Phan Xuân Thịnh

> Kết quả rà runtime cùng ngày: xem [đối chiếu code](THINH_MAIN_FLOW_3_RUNTIME_AUDIT_2026-11-13.md). Đã tái hiện lỗi HTTP 400 khi nộp video mẫu kèm ảnh bìa (`posterUrl` FE/DTO chưa khớp); chưa ghi ca này PASS. Sandbox, link giả và Smart Link trong clip có các giới hạn nêu trong báo cáo.

Phạm vi theo xác nhận của leader gửi qua Thịnh: **Hai nhánh Deal VIP (≤16% và >16% qua Admin) + mã độc quyền KOL → Xin mẫu → Duyệt/gửi mẫu → Nhận mẫu và SLA 14 ngày → Video review/nghiệm thu → Bàn giao link tiếp thị cho Flow Customer của Quý**. Cần giải thích và chuẩn bị ca quá hạn/không đăng clip, link video giả. Chat realtime phục vụ đàm phán. Tài liệu này thay kịch bản demo mở rộng Flow 2 đã hướng dẫn trước đó. Đối chiếu source web/backend ngày 13/11/2026; đây là checklist UAT, chưa phải biên bản các ca đã PASS.

Không đưa tạo sản phẩm, kiểm duyệt sản phẩm hay AI Matching vào phần trình bày chính. Không có Media Hub, chiến dịch đại trà, voucher sàn/Shop công khai, freeship hoặc lưu voucher khách hàng. Livestream là tính năng bổ trợ, không chèn vào giữa luồng chính này.

## Chuẩn bị — ngoài phần demo chính

| Role | Tài khoản dùng |
|---|---|
| COLLABORATOR | Chính tài khoản bạn vừa đăng ký KOL và được duyệt; hoặc KOL test `kol.bronze@scanms.vn` |
| SHOP_MANAGER | `manager.sora@scanms.vn`, dùng mật khẩu DB hiện hành của nhóm |
| SYSTEM_ADMIN | `admin@scanms.vn`, dùng cho ca ngoại lệ >16% |
| SYSTEM_MANAGER | `manager@scanms.vn`, chỉ cần khi duyệt KYC trước demo hoặc phân xử vi phạm mẫu |

Các identifier trên đã có trong cấu hình FE; không khẳng định mật khẩu hay trạng thái DB hiện tại đã được kiểm tra lại trong lượt soạn này.

1. KOL đủ KYC, có kênh xã hội phù hợp/đã liên kết, không bị khóa nhận mẫu. Nếu còn CUSTOMER, hoàn tất gửi/duyệt hồ sơ và đăng nhập lại trước khi bắt đầu.
2. KOL và Shop đã liên kết hợp tác. Nếu chưa, KOL gửi đề xuất và Shop chấp nhận trước demo.
3. Có sản phẩm A của Sora đã duyệt, đang bán, còn tồn, bật cấp mẫu và còn quota; có biến thể hợp lệ nếu sản phẩm yêu cầu.
4. Dùng một sản phẩm/cặp KOL chưa bị Deal khác khóa hoặc chồng phạm vi để test. Chuẩn bị B/cặp khác cho ca từ chối và VIP 20%.
5. Mở hai profile trình duyệt độc lập cho Shop/KOL. Nhiều tab trong cùng profile chia sẻ đăng nhập.
6. Chuẩn bị ảnh/tài liệu hợp lệ để gửi chat, địa chỉ GHN 3 cấp của KOL và video review hợp lệ trên đúng nền tảng đã cam kết.
7. Dùng hậu tố `MF3-1311-01` cho nội dung test, ghi lại Store/Product/Deal/Sample ID. Không reset/seed hoặc sửa ngày DB nhóm để dựng kết quả.
8. Chuẩn bị hai Deal độc lập để trình bày bắt buộc: **A — 16%, không qua Admin**; **B — 20%, có Admin**. Dùng sản phẩm/phạm vi hoặc cặp KOL khác để tránh Deal hiện hành bị khóa/chồng phạm vi.
9. Chuẩn bị kênh TikTok demo do bạn quản lý, khai báo đúng kênh trong hồ sơ KOL/cam kết mẫu. Đăng video review sản phẩm thật dùng để demo, có thể ngắn; ghi rõ nội dung demo, không nhận là đánh giá từ một KOL có thật khác. Không dùng ảnh/link giả thay cho bằng chứng đã đăng. Đặt link tiếp thị của đúng KOL/sản phẩm trong phần mô tả/giới thiệu được kênh hỗ trợ; có thể thêm QR trong video. Chuẩn bị URL video công khai để Shop mở được.

## Ca chính

### MF3-01 — Chat hai chiều, gửi ảnh và tài liệu

**Role:** Shop ↔ KOL.

- Shop: **Mạng lưới Đối tác** → `/merchant/kol-hub?tab=messages` → chọn đúng KOL.
- KOL: **Hợp tác & Hàng mẫu** → `/collaborator/collaboration` → chọn đúng Sora → tab Tin nhắn.
- Shop gửi `MF3-1311-01: Mời bạn hợp tác giới thiệu sản phẩm A`; KOL trả lời.
- Gửi một ảnh và một tài liệu; bên nhận mở/tải để đối chiếu. Reload hai phía.

**Đạt:** nhận realtime không cần F5, đúng người gửi, không nhân đôi; tin và tệp còn sau reload. Lưu ảnh của cả hai cửa sổ.

### MF3-02 — Gửi đề nghị VIP với KPI doanh thu

**Role chính của ca:** KOL → Shop, vì điểm vào hiện tại có form KPI doanh thu trực tiếp.

1. KOL trong cuộc trò chuyện chọn **Đề xuất deal VIP**.
2. Chọn A, mức thù lao **16%**, mục tiêu doanh thu **1.000.000 đ**, thời hạn **14 ngày**, cam kết video và kế hoạch `MF3-1311-01: sản xuất video review và giới thiệu sản phẩm A`.
3. Gửi và quan sát thẻ đề nghị ở Shop.

**Đạt:** hai phía thấy cùng sản phẩm/phạm vi, 16%, KPI doanh thu và kỳ hạn; đang chờ đối tác phản hồi, chưa báo đã ký ngay khi gửi. Người gửi không tự chấp nhận.

**Test chiều ngược:** Shop có thể tạo offer bằng **Sản phẩm → A → Tìm KOC bằng AI → Đề nghị VIP**, dùng để mở form rồi quay lại chat; AI không phải phần trình bày chính của ca. Nút tạo Deal cũ trong KOL Hub hiện vẫn dùng KPI số đơn. Không gọi form đó là đã đồng nhất KPI doanh thu.

### MF3-03 — Đối tác chấp nhận/từ chối

**Role:** Shop nhận đề nghị KOL; nếu Shop gửi thì KOL nhận.

1. Mở thẻ, đọc điều khoản, bấm chấp nhận.
2. Kiểm tra thẻ bên còn lại và reload hai phía.
3. Dùng đề nghị riêng cho ca từ chối, nhập lý do nếu form yêu cầu.

**Đạt:** đề nghị 16% đủ điều kiện được chấp thuận mà không chờ ngoại lệ Admin; đúng bên nhận được phản hồi; bấm lại không tạo hợp đồng/tài nguyên trùng. Từ chối không tạo Deal có hiệu lực.

**Giải thích tiền:** 16% là tổng tỷ lệ Deal, không phải 10% +16% + bậc. KOL Đồng có chuẩn 10%; phần chênh 6 điểm phần trăm còn chờ điều kiện KPI và hạn trả hàng theo cơ chế hiện có. Chấp nhận Deal chưa làm tăng ví ngay.

### MF3-04 — KOL xin mẫu

**Role:** KOL.

1. Trong Store Sora, mở tab **Sản phẩm/Kho Sản Phẩm**, tìm A → **Xin mẫu**.
2. Chọn biến thể nếu có, kênh xã hội cam kết, loại nội dung review.
3. Điền người nhận, SĐT và xác nhận SĐT theo form; chọn Tỉnh/Thành → Quận/Huyện → Phường/Xã → địa chỉ chi tiết.
4. Đồng ý cam kết nộp video trong 14 ngày sau nhận hàng → gửi yêu cầu.
5. Mở tab **Hàng mẫu** và reload.

**Đạt:** yêu cầu ở trạng thái chờ Shop duyệt; đúng A, KOL, kênh và địa chỉ; không tạo trùng khi bấm liên tiếp. Không có KYC/kênh/quota thì phải báo điều kiện thiếu, không ép qua bước.

### MF3-05 — Shop duyệt mẫu

**Role:** Shop.

1. Mở Mạng lưới Đối tác → chọn đúng KOL → tab **Hàng mẫu**.
2. Mở yêu cầu vừa gửi; đối chiếu sản phẩm, biến thể, địa chỉ và cam kết.
3. Bấm **Duyệt mẫu**.
4. KOL reload tab Hàng mẫu.

**Đạt:** đúng yêu cầu chuyển được duyệt; hai phía đồng bộ. Duyệt mẫu không đồng nghĩa GHN đã giao hoặc bắt đầu SLA.

### MF3-06 — Tạo vận đơn và theo dõi giao mẫu

**Role:** Shop → KOL.

1. Shop trên yêu cầu đã duyệt chọn **Tạo vận đơn GHN**.
2. Để test không gửi hàng thật, chọn rõ **GHN sandbox** → **Tạo vận đơn GHN sandbox**.
3. Kiểm tra mã vận đơn API trả về, mở phần hành trình → Shop bấm **Bắt đầu hành trình**.
4. KOL mở **Theo dõi hành trình bưu kiện** trên cùng vận đơn sandbox.

**Đạt với sandbox:** trạng thái thử đồng bộ, reload không chạy lại đồng hồ. Code hiện tại: chờ lấy hàng → sau 60 giây đang vận chuyển → sau 120 giây giao thành công; polling khoảng 5 giây. Hàng mẫu mô phỏng là **2 phút**, khác mô phỏng đơn mua 1 phút.

**Phân biệt bắt buộc:** vận đơn sandbox/trạng thái sandbox không phải bằng chứng đã giao thật. Không chọn GHN thật trong buổi demo chỉ để vượt bước. Không nhập mã ngẫu nhiên để giả kết quả GHN.

### MF3-07 — SLA và nộp video: chọn đúng nhánh

**Role:** KOL.

**Nhánh A — demo sandbox, không giao hàng thật:**

1. Sau khi hành trình sandbox giao thành công, kiểm tra thời điểm nhận và hạn video thử 14 ngày.
2. Bấm **Nộp video kiểm thử**, điền đúng sản phẩm, tiêu đề, video/nội dung theo form → **Lưu video kiểm thử**.
3. Shop mở **Hàng mẫu → Chờ duyệt video**: yêu cầu sandbox đã nộp phải xuất hiện và được tính vào số đếm.
4. Bấm **Xem video đã nộp**, kiểm tra nội dung rồi chọn **Nghiệm thu (sandbox)**. Yêu cầu rời tab chờ duyệt; trong **Tất cả** hiện **Đã nghiệm thu · Sandbox**. KOL xem kết quả trong nhóm **Hoàn tất**.
5. Để thử nhánh sửa: chọn **Yêu cầu sửa (sandbox)**, nhập lý do ít nhất 5 ký tự → **Gửi yêu cầu sửa**. KOL thấy lý do và nút **Nộp lại video kiểm thử**; nộp lại rồi Shop nghiệm thu phiên bản mới.

**Đạt (cập nhật 14/11):** có thể demo trọn vòng nhận mẫu, nộp video, yêu cầu sửa/nộp lại và nghiệm thu trong sandbox. Quyết định được lưu vào sự kiện sandbox và dùng chung ở hai role; hồ sơ mẫu thật, media công khai, ví và thù lao không đổi. Bản video sandbox đã nộp trước bản vá vẫn nghiệm thu được, không cần tạo mẫu mới.

**Nhánh B — kiểm thử nghiệp vụ mẫu đầy đủ:**

1. Dùng yêu cầu mẫu đã nhận hợp lệ trong bộ dữ liệu test; kiểm tra trạng thái nghiệp vụ `RECEIVED` và hạn nộp thực tế. Nếu gửi mới thì cần giao nhận hợp lệ trước, không dùng trạng thái thử thay thế.
2. KOL chọn **Nộp Link Video Review** trên yêu cầu đó.
3. Nhập link HTTPS trên đúng nền tảng đã cam kết, tiêu đề/nội dung; gửi cho Shop duyệt.
4. Reload: phải hiện **Chờ Shop nghiệm thu** (`VIDEO_SUBMITTED`).

**Đạt:** video gắn đúng sample/product, Shop nhận đúng hồ sơ chờ duyệt. Link sai nền tảng/không HTTPS hoặc mẫu chưa nhận phải bị từ chối.

### MF3-08 — Nghiệm thu hoặc yêu cầu sửa video

**Role:** Shop → KOL. **Điều kiện:** đã hoàn tất Nhánh B, không dùng video kiểm thử sandbox cho ca này.

1. Shop mở tab Hàng mẫu → bộ lọc **Chờ duyệt video/Chờ nghiệm thu**.
2. Chọn đúng yêu cầu, **Xem video**, kiểm tra nội dung theo cam kết.
3. Bấm **Nghiệm thu video** → KOL reload và đối chiếu trạng thái hoàn tất.
4. Với hồ sơ riêng, chọn **Yêu cầu sửa**, nêu lý do; KOL thấy lý do/hạn sửa, nộp lại rồi Shop nghiệm thu.

**Đạt:** đồng bộ `VIDEO_SUBMITTED → COMPLETED`, hoặc `VIDEO_SUBMITTED → REVISION_REQUIRED → VIDEO_SUBMITTED → COMPLETED`; video thử không bị coi là video đã được duyệt. Không suy ra được trả toàn bộ chênh Deal chỉ vì Shop đã nghiệm thu video: KPI doanh thu và điều kiện 14 ngày còn phải đáp ứng.

## Ca ngoại lệ nên chuẩn bị

| Ca | Role | Thao tác | Kết quả cần thấy |
|---|---|---|---|
| EX-01 | KOL/Shop | Đề nghị riêng 20%, bên nhận đồng ý | Chờ Admin; chưa coi Deal hoạt động |
| EX-02 | Admin | `/admin/vip-exceptions` → duyệt/từ chối đề nghị 20% | Hai phía nhận đúng quyết định; SYSTEM_MANAGER không được duyệt thay Admin |
| EX-03 | KOL/Shop | Nhập 26% | Bị chặn, không có hợp đồng hiệu lực >25% |
| EX-04 | KOL | Xin mẫu khi thiếu KYC/kênh hoặc quota hết | Báo đúng điều kiện, không tạo yêu cầu thành công |
| EX-05 | KOL | Gửi link video sai nền tảng hoặc khi chưa nhận mẫu | Báo lỗi rõ, không chuyển chờ nghiệm thu |
| EX-06 | Shop → KOL | Yêu cầu sửa video, KOL nộp lại | Có lý do, hạn sửa và trạng thái đúng |
| EX-07 | Shop, sandbox | Sau giao thử/chưa có video: Kiểm thử quá hạn video → Chuyển quá hạn | Chỉ trạng thái sandbox quá hạn, không tự thay ngày/khóa tài khoản thật |

## Bổ sung bắt buộc theo leader

### MF3-09 — Nhánh B, Deal 20% phải qua Admin

Đây là **ca demo chính thứ hai**, không để thành ca chỉ chạy khi thầy hỏi.

1. Shop/KOL gửi đề nghị B với mức 20%, KPI và kỳ hạn cụ thể.
2. Bên nhận đồng ý: thẻ phải chờ Admin (`PENDING_ADMIN_APPROVAL`). Chưa sinh link/coupon hay bắt đầu kỳ KPI như hợp đồng đã duyệt cuối.
3. `SYSTEM_ADMIN` mở **Thỏa thuận Đặc cách** → `/admin/vip-exceptions`, kiểm tra đề nghị rồi duyệt với căn cứ quyết định đủ rõ. Người đề xuất/chấp thuận không tự duyệt ngoại lệ.
4. Shop/KOL reload: Deal hoạt động, mức 20% và tài nguyên đúng. Dùng đề nghị khác cho ca Admin từ chối. Nhập 26% phải bị chặn.

`SYSTEM_MANAGER` vận hành không có quyền duyệt ngoại lệ VIP >16%, dù được tham gia xử lý vi phạm mẫu.

### MF3-10 — Kiểm tra mã độc quyền KOL trên cả hai nhánh

1. Sau phê duyệt cuối cùng của A/B, KOL vào **Công cụ tiếp thị → Mã ưu đãi**, `/collaborator/marketing?tab=coupons`.
2. Đối chiếu mã đã cấp gắn đúng KOL, Store, phạm vi sản phẩm, mức giảm, hạn dùng và hạn mức/ngân sách.
3. Sao chép mã để chia sẻ cho Customer. Customer tự nhập khi thanh toán; không có kho lưu voucher hoặc tự áp mã từ link.

**Phân biệt:** 16%/20% là thù lao KOL; phần trăm giảm tiền hàng của voucher là điều khoản riêng, không mặc định bằng tỷ lệ Deal. Nhánh >16% chưa được Admin duyệt không được có tài nguyên của chính đề nghị đó như đã kích hoạt.

### MF3-11 — Không đăng clip, quá hạn và quyền của Admin

**Chuẩn bị:** một hồ sơ mẫu test đã nhận và quá hạn thật trong bộ dữ liệu kiểm thử, tách với hồ sơ đang demo thành công. Nhánh sandbox có nút thử quá hạn riêng nhưng không được dùng nó làm bằng chứng đã khóa KOL nghiệp vụ.

1. Khi đã nhận mẫu, nghĩa vụ review có hạn 14 ngày. Job định kỳ hiện chạy mỗi giờ; nhắc KOL khi còn dưới 24 giờ, nhắc Shop khi còn dưới 48 giờ, cả hạn nộp và hạn sửa.
2. Không nộp đúng hạn: job ghi `OVERDUE`, thông báo KOL/Shop và lưu vết.
3. Shop chọn **Báo cáo quá hạn**, nhập lý do/bằng chứng → gửi xét duyệt. Gửi báo cáo **chưa tự khóa KOL**.
4. Admin/Manager vận hành vào **Trọng tài & Pháp chế → Vi phạm hàng mẫu**, `/admin/arbitration?tab=samples`; xem hồ sơ, thời hạn, trao đổi và lịch sử.
5. Demo một quyết định có lý do: **Khóa quyền nhận mẫu**, **Không chấp nhận đề nghị khóa**, **Gia hạn nộp video** hoặc **Miễn nộp video cho yêu cầu mẫu** tùy hồ sơ. Không gọi miễn nghĩa vụ là Shop đã nghiệm thu một video chưa có.
6. Nếu khóa, KOL thử xin mẫu mới: bị chặn. KOL vẫn được nộp video để khắc phục nghĩa vụ cũ. Sau khắc phục, Admin/Manager có thể mở khóa với lý do; không tự mở khóa chỉ vì đã nộp clip/gia hạn.

**Câu trả lời cho thầy:** “Hệ thống theo dõi SLA và nhắc hạn, ghi nhận quá hạn; Shop báo cáo để bộ phận vận hành xem xét bằng chứng. Việc khóa là khóa quyền xin mẫu mới theo quyết định có lưu vết, không tự khóa toàn bộ tài khoản ngay khi quá hạn.” Không nói tự phạt tiền, tự ban 60 ngày hay tự trừ điểm nếu chưa chứng minh bằng nghiệp vụ hiện tại.

### MF3-12 — Nếu KOL nộp link video giả

| Dữ liệu thử | Code hiện xử lý | Cách chứng minh |
|---|---|---|
| URL không HTTPS/nguồn không được phép | Backend từ chối | Gửi trong form, chụp lỗi |
| Cam kết TikTok nhưng nộp link nền tảng khác | Backend kiểm tra nền tảng cam kết | Không chuyển chờ nghiệm thu |
| URL TikTok đúng host nhưng video không tồn tại/đã xóa | Chưa xác minh tồn tại tự động | Có thể được lưu chờ duyệt; Shop phải mở và yêu cầu sửa |
| Video của người khác hoặc không review đúng sản phẩm | Chưa đối chiếu chủ kênh/nội dung tự động | Shop đối chiếu video, kênh đã cam kết, sản phẩm; yêu cầu sửa với lý do |

Shop không bấm nghiệm thu chỉ vì URL có chữ `tiktok.com`. Video hợp lệ về định dạng vẫn ở `VIDEO_SUBMITTED`, chưa hoàn tất nghĩa vụ. Shop mở xem bằng chứng → **Yêu cầu sửa** → KOL thấy lý do/hạn sửa và nộp lại. Quá hạn nộp lại được xử lý qua luồng vi phạm trên.

**Câu trả lời cho thầy:** “Hệ thống kiểm tra kỹ thuật và nền tảng ở đầu vào, còn tính xác thực/nội dung có bước Shop kiểm duyệt. Link đúng định dạng chưa có nghĩa là video hợp lệ. Hiện chưa có cơ chế tự xác minh video TikTok tồn tại và thuộc đúng chủ kênh.” Đây là giới hạn đã đối chiếu source, không trình bày thành kiểm duyệt AI tự động.

### MF3-13 — Video có link KOL, bàn giao sang Flow Customer của Quý

1. Lấy Smart Link đã được cấp từ Deal có hiệu lực hoặc tạo link cho đúng sản phẩm trong **Công cụ tiếp thị → Link & QR tiếp thị**.
2. Đối chiếu đúng KOL, Product, Store và mã `/r/<shortCode>`; sao chép đúng link này vào phần mô tả/giới thiệu video demo hoặc hiển thị QR. Ghi thêm mã ưu đãi KOL để khách có thể nhập tay.
3. Chuẩn bị hai URL riêng: **URL TikTok review** để nộp bằng chứng; **Smart Link SCANMS** để khách đi đến sản phẩm và ghi attribution. Không nộp Smart Link vào ô URL video.
4. Shop mở video, kiểm tra đúng sản phẩm/kênh, có thông tin tiếp thị và nghiệm thu khi đủ điều kiện.
5. Bàn giao cho Quý: KOL/email hoặc ID, Store/Product/variant ID, URL video, Smart Link đầy đủ và shortCode, mã ưu đãi/điều kiện, Deal đã duyệt cuối. Quý mở link bằng profile Customer độc lập, mua đúng sản phẩm và tự nhập mã nếu dùng ưu đãi.
6. Nếu demo local, dùng link do môi trường local tạo; đổi sang máy khác thì `localhost` của máy đó không trỏ về máy bạn. Chuẩn bị URL môi trường demo mà cả hai máy truy cập được, giữ nguyên shortCode.

Kết thúc phần Thịnh tại “video đã nghiệm thu, link và mã KOL đã sẵn sàng cho Customer”. Quý tiếp tục kiểm tra attribution và mua hàng; phần Thịnh chưa tự nhận một lượt mở link là doanh số/KPI đã chốt.

## Thứ tự trình bày ngắn

**Chat → Deal A 16% không qua Admin → kiểm tra link/mã KOL → Deal B 20% chờ Admin, Admin quyết định → kiểm tra tài nguyên sau duyệt → xin/duyệt mẫu → nhận hàng → nộp video TikTok và nghiệm thu → trình bày quá hạn/link giả → bàn giao Smart Link cho Quý.**

Có thể demo vòng **Shop nghiệm thu kiểm thử** với Nhánh A mà không giao hàng thật; nói rõ kết quả thuộc sandbox. Để chứng minh nghiệm thu nghiệp vụ/công khai video, dùng Nhánh B và MF3-08 trên hồ sơ đã nhận hợp lệ. **Hai nhánh Deal và bàn giao link là bắt buộc**; quá hạn/link giả cần dữ liệu minh họa và giải thích đúng cơ chế hiện tại. Không trình bày nghiệm thu sandbox là đã hoàn tất nghĩa vụ hoặc giải ngân thật.

Mỗi ca lưu ID, role, đầu vào, kết quả, PASS/FAIL/CHƯA ĐỦ ĐIỀU KIỆN và ảnh hai phía. Không chụp mật khẩu/JWT. Lượt này chỉ soạn và đối chiếu source, không chạy giao hàng hoặc thay dữ liệu DB nhóm để dựng demo.
