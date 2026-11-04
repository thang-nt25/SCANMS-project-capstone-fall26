# Flow 4 — kiểm tra trước buổi review 02/11/2026

Người demo: Nguyễn Phú Quý. Đối chiếu với `SCANMS_REALIGNMENT_BLUEPRINT.md`, dòng 554–634. Tài liệu này ghi **trạng thái code và database đang chạy**, không thay cho kết quả kiểm thử trên một bộ dữ liệu khác.

## Kết quả kiểm tra lúc chuẩn bị

| Bước | Code hiện có | Điều cần chứng minh trên dữ liệu demo |
| --- | --- | --- |
| 4.1 Link, QR, mã KOL | Tạo link, tải PNG/SVG QR, mã định danh KOL | KOL có link và mã gắn đúng sản phẩm/Shop |
| 4.2 Attribution | Phiên click, cookie 30 ngày, last click; coupon có quyền ghi đè nguồn link | Mở link trong cửa sổ Customer, kiểm tra đơn lưu nguồn KOL |
| 4.3 Chống tự mua | Checkout so trùng tài khoản hoặc SĐT nhận hàng, gắn `SELF_REFERRAL_`, thu nhập 0 | Mua bằng chính tài khoản KOL và mở chi tiết đơn của Shop |
| 4.4 Thanh toán | Checkout COD/PayOS, coupon KOL, lưu attribution | Tạo đơn thật qua UI trên DB demo; PayOS chỉ tuyên bố đã thanh toán nếu có callback xác minh |
| 4.5 Thu nhập | Lấy tỷ lệ cao nhất; số tiền tính trên giá gốc, ghi `PENDING` | Xem tỷ lệ, số tiền và trạng thái của đúng đơn ở Shop/KOL |
| 4.6 Giao GHN | Báo giá, dữ liệu đóng gói, tạo tracking và cập nhật trạng thái; có chế độ mô phỏng | Dùng mock/staging; không nói có bưu tá thật nếu chỉ mô phỏng |
| 4.7 Đổi/hoàn | Khách gửi bằng chứng, Shop duyệt, đặt lấy hàng trả, Manager xác định lỗi, Shop kiểm tra; đổi 1:1 trừ tồn kho và bảo lưu thu nhập; hoàn vào ví SCANMS thành công mới clawback, có retry khi `PENDING` | Chuẩn bị **hai đơn đã giao riêng biệt** cho nhánh đổi và nhánh hoàn |

Kiểm tra kỹ thuật: build backend/frontend thành công; 152/152 unit tests backend trọng tâm (link/QR, self-referral, thù lao, GHN, lấy hàng trả, đổi/hoàn, đơn hàng) qua. Kiểm tra frontend liên quan: 28 unit tests và 2 Chrome headless browser tests qua (mua ngay/giỏ hàng/áp mã/đặt đơn; báo giá và retry phí ship). API health trả `UP`, database `CONNECTED`; frontend trả HTTP 200. Đây chưa phải bằng chứng rằng toàn bộ thao tác nhiều tài khoản đã được chạy lại từ đầu đến cuối trên DB hiện tại.

## Chặn demo số liệu theo blueprint

`npm.cmd run seed:check` kết luận database Supabase đang cấu hình **chưa có dataset `scanms-capstone-2026-v4`**. `seed:audit` thấy **713 đơn hàng** đang tồn tại và **7 migration đã ghi trong DB nhưng thiếu file ở nhánh hiện tại**. API thực tế trả serum `SKIN-VTC15` giá **280.000₫**, mã `THAONHI16` giảm **10%** và validate thành công cho serum; danh sách mã công khai hiện **không có `SCANMSFREESHIP`**. Seed v4 quy định serum **450.000₫**, mã giảm **5%**, deal **16%** tạo thu nhập **72.000₫** và có mã freeship. Không nói 72.000₫ hoặc freeship 3 lượt là kết quả đang chạy nếu chưa nạp v4 hoặc chưa nhìn thấy đúng trên UI.

Để có số minh họa v4: dùng một **database demo riêng**, chạy migration và seed v4 theo `backend/prisma/seeds/README.md`, rồi chạy `seed:check`. Không reset hoặc seed đè database nhóm `public`; nó đang có đơn, ví và dữ liệu tester. Nếu buổi review dùng DB hiện tại, trình bày số tiền thực tế trên màn hình, tính `giá gốc của đơn × tỷ lệ đã chọn`, và bỏ ví dụ cứng 450.000₫ → 72.000₫.

### Đường demo đã kiểm tra trên DB hiện tại

Người dùng chọn dùng DB hiện tại và trình bày số thực tế. Bốn tài khoản trong `frontend/.env` (`VITE_DEMO_CUSTOMER/KOL/SHOP/MANAGER_*`) đều đăng nhập API thành công. Không chép mật khẩu từ file này vào tài liệu hoặc slide.

- KOL demo: **Lê Hoàng Yến Nhi** (`kol.bronze@scanms.vn`). Link serum đang `ACTIVE`: `http://localhost:5173/r/R_KOLBRONZE_DDC5`. Mã cùng KOL `YENNHISKIN` validate thành công với chính tài khoản Customer demo: **280.000₫ × 5% = 14.000₫ giảm**, còn **266.000₫ tiền hàng**. API GHN TEST báo cước **21.001₫** cho địa chỉ Customer đang lưu, nên tổng dự kiến **287.001₫**, nhưng phải đọc lại cước trên checkout lúc demo. Thu nhập của hai đơn đã giao bên dưới là **28.000₫/đơn (10% giá gốc)**. Khi tạo đơn mới, phải đọc lại tỷ lệ và số tiền trên chính đơn đó.
- Customer demo: `customer.an@scanms.vn`. **Đơn A** `DH-2026-C58C204C` và **đơn B** `DH-2026-4EEB3F8E` đều là serum Sora, `DELIVERED`, chưa có hồ sơ đổi trả, mỗi đơn có thu nhập KOL `PENDING` **28.000₫**. Dùng A cho **đổi hàng** và B cho **hoàn vào ví + clawback**. Chúng được giao ngày 29/10 và 28/10/2026, còn trong hạn đổi trả tại ngày lập báo cáo. **Hai đơn không có vận đơn GHN gốc trong dữ liệu hiện tại; không dùng để quy lỗi GHN hoặc mở hồ sơ đòi GHN bồi hoàn.**
- Shop demo: `manager.sora@scanms.vn`, vào `/merchant/orders` rồi tìm chính xác mã đơn A/B. Manager demo: `manager@scanms.vn`, vào `/admin/return-disputes` để xác định bên chịu trách nhiệm. Shop Sora đã có kho trong Shop Settings theo định dạng cũ; backend nay đọc và chuyển sang định dạng đổi trả khi trả API, **không ghi đè kho hay bịa số điện thoại**. Môi trường local đã bật mock lấy hàng trả và mô phỏng vận chuyển; không tạo chuyến vận chuyển thật.
- Bằng chứng ảnh và video mở hộp là bắt buộc khi Customer gửi yêu cầu. Chuẩn bị file **có nhãn TEST** trước buổi review. Hai đơn đã giao vẫn chưa bị thay đổi bởi lần kiểm tra chỉ đọc này.

`THAONHI16` vẫn validate được trên serum nhưng thuộc KOL **Hoàng Thảo Nhi**, khác tài khoản KOL demo. Nếu dùng `THAONHI16`, không mở ví của Yến Nhi để chứng minh thu nhập đơn đó. `SCANMSFREESHIP` hiện không xuất hiện trong danh sách mã công khai, nên bỏ phần freeship khỏi demo DB hiện tại.

## Thứ tự rehearsal trên UI

1. Mở `http://localhost:5173`, đăng nhập KOL Yến Nhi, vào `/collaborator/marketing`. Chỉ link, QR và mã `YENNHISKIN`; mở link trong cửa sổ Customer khác.
2. Customer thêm serum vào giỏ, áp `YENNHISKIN`, chọn COD, đặt hàng nếu muốn chứng minh 4.1–4.5 bằng đơn mới. Trên DB hiện tại bỏ phần freeship. Để tiết kiệm thời gian cho 4.7, dùng hai đơn A/B đã giao ở trên.
3. Shop vào `/merchant/orders`, mở đúng đơn để chỉ nguồn KOL, khoản thu nhập chờ xử lý; đóng gói và tạo vận đơn GHN trong mock/staging, cập nhật đến `DELIVERED`.
4. Dùng chính tài khoản KOL mua qua link/mã của mình để chứng minh `SELF_REFERRAL_` và thu nhập bằng 0. Đây là **đơn khác** với đơn chứng minh thu nhập hợp lệ.
5. Với **đơn A `DH-2026-C58C204C`**, Customer gửi yêu cầu đổi kèm ảnh/video → Shop duyệt và lưu kho trả → Customer đặt lấy hàng trả → Shop mô phỏng/đồng bộ hàng về → Manager mở `/admin/return-disputes`, chỉ kết luận `SHOP_FAULT` nếu chứng cứ thực sự cho thấy lỗi đóng gói/hàng hóa của Shop → Shop kiểm tra và ghi vận đơn hàng thay thế → kiểm tra **28.000₫** thu nhập KOL không bị đảo. Nếu ảnh/video TEST không chứng minh lỗi của bên nào, giữ hồ sơ ở bước xác minh và trình bày đó là giới hạn của demo.
6. Với **đơn B `DH-2026-4EEB3F8E`**, Customer yêu cầu hoàn → Shop nhận/kiểm tra và chọn hoàn vào ví. Chỉ sau `refund=SUCCEEDED` mới chỉ `order.refundedAmount`, `commission=REVERSED`, bút toán thu hồi **28.000₫**. Nếu `PENDING`, Manager dùng nút **Thử hoàn tiền vào ví khách** trên chi tiết hồ sơ; chưa được nói đã clawback.

Chuẩn bị sẵn hai đơn đã giao, tồn kho hàng bù, ảnh/video unboxing và bốn phiên đăng nhập riêng (KOL, Customer, Shop, Manager). Tại mỗi bước dùng mã đơn cụ thể trên màn hình để tránh mở nhầm hồ sơ.

## Giới hạn cần trả lời đúng khi giáo viên hỏi

### Cách phân xử để tránh tranh chấp Shop – GHN

1. **Tách quyền lợi khách khỏi việc đòi bồi hoàn:** Khách gửi ảnh/video mở hộp và yêu cầu đổi hoặc hoàn. Shop xử lý hàng thay thế hoặc hoàn ví theo kết quả kiểm tra; hồ sơ Shop đòi GHN bồi hoàn là nhánh đối soát riêng. Chỉ ghi đã nhận bồi hoàn khi Manager có chứng từ thanh toán và lưu trạng thái `PAID`; `DRAFT`, `SUBMITTED` hoặc `ACCEPTED` chưa phải tiền đã về.
2. **Giữ ba nhóm chứng cứ:** khách cung cấp ảnh/video và thời điểm nhận; Shop cung cấp ảnh đóng gói, tình trạng niêm phong và biên bản bàn giao; GHN cung cấp vận đơn gốc, mốc quét và biên bản sự cố. Manager ghi căn cứ vào sự kiện `LIABILITY_ASSESSED` để hai bên xem lại được.
3. **Quy trách nhiệm theo chứng cứ:** sai hàng, thiếu hàng hoặc hư trước bàn giao thuộc Shop; kiện móp/vỡ trong vận chuyển với dấu vết bàn giao nguyên vẹn và vận đơn GHN thuộc nhánh GHN; khách đổi ý thuộc nhánh chính sách trả hàng. Vận đơn GHN gốc là điều kiện tối thiểu để chọn `LOGISTICS_FAULT`, **không tự nó chứng minh lỗi GHN**. Thiếu bằng chứng thì chưa lưu kết luận, tiếp tục xác minh.
4. **Tiền và thu nhập KOL:** đổi 1:1 giữ thu nhập vì đơn vẫn hoàn thành; hoàn tiền chỉ thu hồi thu nhập sau khi hoàn ví `SUCCEEDED`. Không trừ tiền Shop hoặc ghi nhận khoản GHN đã trả chỉ vì Manager chọn một mã lỗi. Hệ thống lưu các bước đòi GHN và chứng từ do Manager nhập; chưa tích hợp API GHN tự xác nhận hay chuyển tiền bồi hoàn.

- Guard chống tự mua hiện kiểm tra **cùng tài khoản** và **cùng số điện thoại**. Nó chưa so STK ngân hàng của người mua vì hồ sơ Customer không lưu STK; không giới thiệu đó là mô hình AI đã xác minh ba tín hiệu.
- Hàng thay thế hiện được Shop ghi vận đơn và trừ tồn kho trong một transaction. Chưa có tích hợp tự tạo vận đơn GHN cho kiện hàng thay thế. Hồ sơ đòi GHN đi qua `DRAFT` → `SUBMITTED` → phản hồi chấp thuận/từ chối/yêu cầu bổ sung → `PAID` khi Manager đối chiếu chứng từ. Đây là ghi nhận thủ công, không phải xác minh thanh toán ngân hàng tự động. Xem [kịch bản test GHN](FLOW4_GHN_COMPENSATION_TEST.md).
- Với lỗi GHN, Manager cần đối chiếu vận đơn GHN gốc, lịch sử quét/biên bản bàn giao, ảnh đóng gói của Shop và ảnh/video mở hộp của khách. Có tracking là điều kiện cần để ghi kết luận GHN trong hệ thống, chưa đủ để chứng minh GHN nhận trách nhiệm. Shop/SCANMS xử lý đổi hoặc hoàn cho khách theo kết quả kiểm tra; việc đòi GHN bồi hoàn là đối soát riêng, không làm khách chờ. Nếu thiếu chứng cứ, chưa quy lỗi bên nào và tiếp tục xác minh.
- Hoàn tiền đi vào **ví SCANMS nội bộ**. Chưa có API chuyển trả tiền về ngân hàng/PayOS gốc. Mock/staging không chứng minh vận chuyển hay thanh toán ngoài đời thực.
- Khi chạy backend trên DB nhóm để rehearsal, đặt `ORDER_CONFIRMATION_EMAIL_WORKER_DISABLED=true` trong `backend/.env` để không lấy và gửi email xác nhận tồn đọng của người khác. Cờ này chỉ dừng worker gửi email; mặc định production giữ nguyên hành vi cũ. Bản `.env` local trên máy review đã đặt cờ này.
