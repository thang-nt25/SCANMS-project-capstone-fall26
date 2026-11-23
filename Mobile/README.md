# SCANMS Android

**Đồng bộ source 23/11/2026:** đã merge dev mới, chuyển đề nghị VIP mới sang KPI số đơn, giữ khóa xác nhận nhận hàng GHN và bổ sung khiếu nại kết quả video theo dev. APK 1.0.2 bên dưới là bản build ngày 22/11; cần build lại để kiểm tra các thay đổi source ngày 23/11 trên điện thoại.

**Bản cập nhật 22/11/2026 — 1.0.2 (versionCode 3):** [APK kiểm thử](artifacts/scanms-demo.apk), dùng chung NestJS/Prisma và DB nhóm với web. Giữ tông vàng be, Expo Router và component native hiện có; không thêm file CSS. Điện thoại cần cùng Wi-Fi với laptop đang chạy backend. Cách build/cài và cấu hình API tại [ANDROID_APK_GUIDE.md](docs/ANDROID_APK_GUIDE.md).

Đã bổ sung đăng ký KOL nhiều kênh, hồ sơ thẩm định đầy đủ, tạo Store nội bộ bởi Admin, thẻ đề nghị VIP trong chat mở đúng thỏa thuận, và các thao tác hàng mẫu sandbox. Bỏ menu chiến dịch cũ và KYC Shop; Customer vẫn chỉ nhập thủ công mã độc quyền do KOL chia sẻ.

### Kiểm thử Main Flow 1–3

1. **Admin — khởi tạo nội bộ:** Công cụ → Nhân sự & gian hàng → Gian hàng → Tạo cửa hàng nội bộ. Nhập ngành hàng, liên hệ kho, địa chỉ GHN đủ cấp. Tạo/phân công Shop Manager tại tab Nhân sự. Customer không có chức năng tự mở Shop.
2. **Customer — đăng ký KOL:** đăng ký tài khoản bằng OTP email nếu chưa có → đăng nhập → Tôi → Đăng ký KOL/KOC. Nộp CCCD hai mặt, 1–5 kênh chính chủ và ảnh quản trị từng kênh. Ngân hàng là nhóm tùy chọn nhưng phải điền đủ ba trường nếu sử dụng. Hồ sơ đang thẩm định bị khóa chỉnh sửa; yêu cầu bổ sung khôi phục lại dữ liệu cũ. Ảnh phải tải xong trước khi gửi.
3. **Manager/Admin — thẩm định:** Công cụ → Hồ sơ xác minh KYC → mở hồ sơ, xem CCCD, kênh và bằng chứng → duyệt/yêu cầu bổ sung/từ chối kèm ghi chú. Không tự duyệt hồ sơ của mình. Customer quay lại hồ sơ, chọn Cập nhật quyền KOL sau khi được duyệt; client không tự cấp role.
4. **Shop/Manager — sản phẩm:** Shop tạo sản phẩm đúng ngành hàng của Store, đủ biến thể/ảnh/thông tin yêu cầu → vận hành kiểm duyệt → Shop xem giá bán và giá sàn. Thử dữ liệu sai và tài khoản không được phân công để kiểm tra chặn quyền. Dùng các màn sản phẩm, kiểm duyệt và giá sàn hiện có.
5. **Shop/KOL — hợp tác:** thử cả Shop gửi lời mời và KOL gửi đề nghị; bên nhận phản hồi. Kiểm tra chat, gửi ảnh/video/tài liệu bằng dấu + và các gợi ý KOL hiện có. Không có Media Hub riêng.
6. **Shop/KOL/Admin — VIP:** tạo hai đề nghị riêng: 16% và 20%. Chuẩn bị cặp KOL/Store chưa có mã đang hoạt động/chờ duyệt; dev chỉ cho một mã như vậy trên mỗi cặp, nên dùng cặp khác nhau cho hai ca demo. Bên nhận đồng ý 16% theo luồng thường; 20% phải chờ Admin duyệt tại hàng đợi đặc cách. Theo bản dev ngày 23/11, đề nghị mới dùng KPI số đơn nguyên dương (ví dụ 30 đơn/14 ngày), thống nhất với web; hồ sơ cũ theo doanh thu vẫn hiển thị đúng đơn vị đã lưu. Kiểm tra trần 25%, phạm vi sản phẩm và thời hạn. Thẻ VIP trong chat mở đúng hồ sơ; lấy mã/link từ trạng thái đã duyệt, không từ nội dung thẻ cũ.
7. **KOL/Shop — hàng mẫu thật:** KOL xin mẫu, chọn biến thể/kênh/địa chỉ GHN và cam kết → Shop duyệt → tạo vận đơn đúng môi trường. Với hàng thật, chỉ nộp video sau khi nhận hàng; Shop xem bằng chứng và nghiệm thu/yêu cầu sửa. Khi sửa, màn chi tiết và danh sách dùng hạn nộp lại, chỉ video hiện tại còn chờ mới có nút xét duyệt.
8. **KOL/Shop — hàng mẫu sandbox:** mở chi tiết mẫu có vận đơn TEST → khung Sandbox riêng. Shop bắt đầu mô phỏng, xác nhận cước mô phỏng; KOL chờ nhận rồi nộp video; Shop xem, yêu cầu sửa hoặc nghiệm thu; có thao tác kiểm thử quá hạn. Không dùng trạng thái sandbox để đánh dấu hồ sơ gửi hàng thật đã hoàn tất. Tạo vận đơn LIVE luôn cần xác nhận riêng.

### Phạm vi xác minh bản cập nhật

- TypeScript, oxlint và test Mobile; các suite backend KYC, sản phẩm, VIP, media, hàng mẫu, quyền vận đơn và bootstrap.
- Đăng nhập thật 5 role và kiểm tra hợp đồng API đọc từ DB nhóm. Kiểm thử này không tạo Store, nộp KYC, duyệt VIP, gọi vận chuyển thật hay chuyển tiền.
- Lỗi đăng nhập 500 do schema thiếu sau cập nhật dev được sửa bằng migration `20261122090000_restore_live_schema_objects`. Backup đã phục hồi cục bộ, migration chạy thử hai lần trước khi deploy; không reset/seed hoặc xóa dữ liệu nhóm.
- Cần nghiệm thu thủ công chuỗi mutation nhiều tài khoản ở các bước trên. Test tự động và kiểm tra API đọc không thay thế nghiệm thu toàn bộ UI/nghiệp vụ nhiều role.

Bắt đầu tại [README_MOBILE.md](README_MOBILE.md). Mã giao diện nằm trong `src/`; phần bổ sung backend nằm tại `../backend/src/modules/mobile/` và dùng chung NestJS/Prisma của web.

### Các mốc triển khai trước

**04/11/2026:** đã thiết kế lại trải nghiệm mua sắm mobile: Trang chủ, lưới sản phẩm, chi tiết/SKU, gian hàng, giỏ, đơn mua, Tôi và menu Công cụ theo role. Xem [giao diện và các bước nghiệm thu thời điểm đó](docs/MARKETPLACE_UI_2026-11-04.md). Các số test/bản debug dưới đây là lịch sử, không phải tổng kiểm thử hiện tại.

Đã bổ sung menu **Nghiệp vụ** và các màn native theo 5 role: địa chỉ/giỏ hàng/đổi trả, link/QR/hàng mẫu/ví, giá sàn/KYC/duyệt chi trả và quản trị. Xem [phạm vi triển khai và các bước test từng role](docs/ROLE_WORKFLOWS_2026-11-03.md).

APK **debug x86_64** mới đã build/cài, cần Metro. Mobile có 46 test PASS, backend liên quan 71 test PASS; đã kiểm tra workspace, dashboard và KYC qua API thật trên emulator. Các mutation E2E đủ 5 role và APK standalone ARM vẫn cần nghiệm thu. Báo cáo startup trước đó tại [ANDROID_STARTUP_2026-11-03.md](docs/ANDROID_STARTUP_2026-11-03.md).
