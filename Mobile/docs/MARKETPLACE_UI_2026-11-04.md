# Giao diện mobile SCANMS — 04/11/2026

Thiết kế lại các màn mua sắm chính theo cách tổ chức quen thuộc của ứng dụng thương mại điện tử. Tham khảo ảnh giới thiệu chính thức của [Shopee trên Google Play](https://play.google.com/store/apps/details?id=com.shopee.vn&hl=vi). Giữ thương hiệu SCANMS, tông vàng be và các token trong `src/theme/tokens.ts`; không dùng logo, ảnh chiến dịch hoặc màu thương hiệu Shopee.

## Điểm vào mới

| Vai trò | Điều hướng |
| --- | --- |
| Customer | Trang chủ · Khám phá · Đơn mua · Tin nhắn · Tôi |
| KOL | Công cụ · Sản phẩm · Hợp tác · Tin nhắn · Tôi |
| Shop | Công cụ · Sản phẩm · Đơn hàng · Hợp tác · Tôi |
| Manager/Admin | Công cụ và các tab vận hành được cấp quyền · Tôi |

**Tôi** chứa hồ sơ/bảo mật, ví, voucher, địa chỉ và các tiện ích được phép theo role. Bánh răng mở trang **Thiết lập tài khoản** riêng, có nút Đăng xuất/Đổi tài khoản. Nút đăng xuất cũng ở cuối màn Tôi. Phiên hiện hành được khôi phục như trước, không bắt đăng nhập lại sau mỗi lần mở app.

## Các màn thay đổi

- **Trang chủ Customer:** header tìm kiếm vàng be, giỏ/thông báo có số liệu server; dải ví/voucher, lối tắt ngang, vé ưu đãi từ API, danh mục và sản phẩm hai cột. Gian hàng đối tác lấy từ API, không tạo Shop mẫu để lấp giao diện. Mức giảm/đơn tối thiểu là dữ liệu thật; chạm vé để xem đầy đủ điều kiện, không tự áp mã.
- **Khám phá:** tìm kiếm, danh mục cuộn ngang, sắp xếp giá/mới nhất, lưới hai cột, kéo làm mới và phân trang thật.
- **Thẻ sản phẩm:** ảnh vuông, tên hai dòng, giá, mức giảm tính từ giá thật, rating/số đã bán và gian hàng. Không chèn rating hoặc doanh số giả.
- **Chi tiết sản phẩm:** thư viện ảnh, giá/review lấy từ landing, thông tin Shop, mô tả/thuộc tính, đánh giá và thanh Chat/Thêm giỏ cố định. Dải ảnh phân loại mở bottom sheet và chọn đúng SKU vừa chạm. Hộp phân loại hiển thị ảnh nhỏ, giá/tồn kho, bộ đếm số lượng; SKU đơn được chọn sẵn, backend vẫn kiểm tra tồn kho khi lưu.
- **Giỏ hàng:** gom theo Shop, ảnh/phân loại, tăng giảm và xóa, tổng tiền hàng. Đóng hộp SKU trước khi mở giỏ. Có khoảng đệm tránh thanh gesture Android.
- **Gian hàng:** header nhận diện, theo dõi/chat, thống kê, tìm kiếm/danh mục và lưới sản phẩm.
- **Đơn mua:** trạng thái cuộn ngang, thẻ đơn gọn có ảnh, tên, số lượng, ngày và tổng tiền; mở lại luồng xử lý chi tiết hiện có.
- **Thông báo:** bộ lọc nằm trên một hàng ngang; số chưa đọc và nút “Đọc tất cả” thu nhỏ trên cùng (khóa khi không có mục chưa đọc). Danh sách dùng FlatList, mỗi dòng có icon, tiêu đề/nội dung tối đa hai dòng, thời gian và dấu chưa đọc. Chạm cả dòng để mở sheet đọc đầy đủ; bỏ nút “Xem thông báo” lặp lại trên từng mục. Giữ API lọc, phân trang và đánh dấu đọc hiện có; kéo xuống để làm mới. Source tách riêng tại `src/features/account/NotificationsScreen.tsx`, không thêm CSS.
- **Tôi:** header tài khoản vàng be, khối Đơn mua, lưới bốn tiện ích cho Customer, các nhóm tài khoản và quản lý phiên. **Thiết lập tài khoản:** hồ sơ/bảo mật, địa chỉ, ví/ngân hàng, xác minh, thông báo và đăng xuất theo đúng quyền. Không thêm tùy chọn giả khi backend chưa hỗ trợ. Menu Shop/KOL/vận hành chuyển thành ô công cụ có icon và tìm kiếm, giữ allowlist theo role.
- **Đăng nhập:** nhận diện SCANMS, form email/SĐT, bật/tắt hiện mật khẩu, loading/error và khóa gửi lặp như trước. Không thêm social login hoặc đăng ký giả.
- **Thành phần dùng chung:** khoảng cách, cỡ chữ, nút, input, badge và card gọn hơn; icon Feather đồng bộ; title màn nghiệp vụ theo chức năng thay cho tiêu đề chung.

## Ảnh và API

Một phần dữ liệu thật trên DB dùng URL tương đối `/assets/products/real/...` của web. Android nay ánh xạ đúng các URL này tới bản sao cùng file trong `assets/catalog/`. Ảnh remote và `/uploads/` vẫn dùng nguồn gốc; không tráo ảnh khi nguồn thiếu. Manifest: `src/services/bundled-catalog-images.ts`; resolver và test: `src/services/image-policy.ts`, `tests/image-policy.test.ts`.

Sửa `ProductsService.getPublicStores()` trả lại mảng kết quả truy vấn. Trước đó API trả HTTP 200 nhưng không có `data`, khiến danh sách gian hàng không parse được. Giữ các điều kiện Shop xác minh/hoạt động và sản phẩm đã duyệt. Test hồi quy cô lập trong `products.public-stores.spec.ts`.

## Nghiệm thu

1. Customer mở Trang chủ, thử danh mục/tìm kiếm và bấm sản phẩm. Đối chiếu giá/rating/đã bán với API/web.
2. Mở hộp SKU, chọn biến thể/số lượng, đóng/mở; nếu chủ động gửi thêm giỏ, kiểm tra giỏ web cùng tài khoản và tải lại app.
3. Bấm giỏ, xem nhóm Shop/ảnh, thao tác số lượng/xóa với dữ liệu được phép test.
4. Mở Shop từ sản phẩm, kiểm tra ảnh/logo, danh mục, theo dõi và chat theo quyền.
5. Tôi → từng trạng thái đơn; kiểm tra bộ lọc Đơn mua đúng mục đã chọn. Mở đơn và giữ các hành động theo trạng thái server.
6. Tôi → hồ sơ/ví/voucher/địa chỉ/thông báo; kiểm tra logout có xác nhận và quay về form login. Không đưa mật khẩu vào tài liệu hay APK.
7. Đăng nhập các role khác để nghiệm thu menu Công cụ, các màn duyệt và dữ liệu phân công. Unit test quyền không thay thế nghiệm thu Android đủ 5 role.

Đợt kiểm tra tự động: TypeScript/lint, 50 test mobile và 3 test BE cho danh sách Shop; build BE, debug native x86_64, JS export Android và contract công khai chỉ đọc. Kiểm tra trực quan dùng phiên Customer đang có trên emulator; không tự đăng nhập role khác hoặc tạo giao dịch thay người dùng.

Thanh toán/checkout và livestream mobile vẫn là giai đoạn sau đã thống nhất. APK debug cần Metro; khi thay native module phải cài APK mới. Không reset/seed DB hoặc thay mật khẩu trong đợt sửa giao diện.

## Đối chiếu ảnh người dùng bổ sung

Tiếp nhận sáu ảnh bố cục Shopee do người dùng gửi: Trang chủ, Tôi, Thiết lập tài khoản, chi tiết sản phẩm, chọn phân loại và checkout. Đã áp dụng bố cục cho các màn đang triển khai, giữ màu và chức năng SCANMS. Checkout là tham chiếu cho giai đoạn sau, không thêm nút thanh toán chưa có luồng mobile.

Sau tinh chỉnh: TypeScript, lint, 50 test và JS export Android đều qua. Đã xem trực tiếp Trang chủ, Tôi, Thiết lập tài khoản và hộp SKU trên emulator bằng phiên Customer hiện hành. Chạm ảnh Brown Switch mở đúng phân loại được chọn, hiển thị giá và tồn kho; không gửi thêm giỏ. Bộ test lần đầu trong sandbox lỗi `uv_os_get_passwd` trước khi khởi động; chạy lại ngoài sandbox thành công 50/50.

## Banner quảng bá trên Trang chủ — 04/11/2026

Thay dải vé “Mã ưu đãi độc quyền KOL” bằng `MarketplaceBanners`: tối đa 3 banner vuốt ngang, ưu tiên các Shop khác nhau từ kết quả catalog hiện hành. Ảnh lấy đúng ảnh sản phẩm trên API (bao gồm asset web đã ánh xạ), không tạo ảnh AI, không tự đặt mức giảm hoặc gắn nhãn tài trợ. Không hiển thị sản phẩm hết hàng/không hoạt động hoặc không có nguồn ảnh hợp lệ; khi catalog chưa có dữ liệu thì không dựng banner giả. Bấm banner mở đúng chi tiết sản phẩm. Lối tắt Mã KOL và ô tiện ích KOL vẫn giữ nguyên; Home không gọi API coupon để dựng banner nữa.

Kiểm tra: TypeScript/lint và export Android; xem banner trên emulator, vuốt giữa các gian hàng và mở chi tiết sản phẩm. Không tạo đơn hoặc sửa DB trong đợt giao diện này.

## Trang Tổng quan Admin / vận hành — 04/11/2026

- Tách `OperationsWorkspaceScreen` khỏi không gian Shop/KOL; nhận diện Quản trị SCANMS / Vận hành SCANMS, giữ màu vàng be.
- Ưu tiên ba thẻ Chờ xử lý: sản phẩm DRAFT chưa xóa, KYC KOL UNVERIFIED đã nhập CCCD + Shop PENDING_APPROVAL chưa xóa, khiếu nại OPEN. Số liệu lấy từ `GET /dashboard/operations/queue-summary`; chỉ SYSTEM_ADMIN/SYSTEM_MANAGER được truy cập. Endpoint chỉ COUNT, không trả giấy tờ KYC. Lỗi tải hiển thị lỗi và dấu — khi chưa có dữ liệu, không giả thành 0.
- Thẻ Sản phẩm mở tab Kiểm duyệt với bộ lọc DRAFT; KYC mở Chờ duyệt; Khiếu nại mở Khiếu nại đang mở. Có thể chuyển lại Tất cả tại màn nghiệp vụ.
- Chỉ số 30 ngày dùng nguyên API dashboard: grossRevenue là tổng finalAmount của đơn DELIVERED/COMPLETED, không phải doanh thu thuần của sàn. Nhãn mới Giá trị đơn đã giao, chú thích Đã giao & hoàn tất; tổng đơn phát sinh cũng trong cùng 30 ngày.
- Công cụ phụ chia hai cột, tên ngắn, không lặp thẻ Tổng quan/KYC/Đổi trả; vẫn truy cập đầy đủ đổi trả qua bộ lọc tại hàng đợi. Tab Công cụ đổi thành Tổng quan riêng cho Admin/vận hành. Giữ quyền hiện có và lối vào Ngoại lệ VIP riêng Admin.
- Có kéo để làm mới và thời gian cập nhật số liệu. Không có migration/seed/reset hoặc thay đổi dữ liệu nghiệp vụ.

Kiểm tra: build backend, 14 test dashboard (gồm 7 test mới cho đếm hồ sơ, quyền ba role bị cấm, số 0 và lỗi DB), ESLint các file BE mới; TypeScript/lint, 61 test mobile và export Android đều qua. Kiểm tra trực quan bằng phiên Admin đang đăng nhập trên emulator: số Khiếu nại 1 mở đúng hồ sơ chờ phân xử, không gửi quyết định. Lượt test tsx đầu trong sandbox không khởi động được vì uv_os_get_passwd; chạy lại ngoài sandbox thành công.

## Danh sách Tài khoản sàn gọn — 04/11/2026

`UsersScreen` đổi từ card lớn sang danh sách có đường phân cách, avatar 36, tên/email và nhãn vai trò nhỏ; bỏ dòng mô tả lặp. Header riêng Tài khoản sàn, ô tìm kiếm một hàng, chip lọc vai trò ngang, số lượng kết quả thật và nút/kéo làm mới. Giữ API GET /users và quyền tab Admin, không sửa tài khoản hoặc phân quyền. TypeScript/lint qua; kiểm tra trực quan trên emulator khoảng 5 dòng đầy đủ trong màn hình thay cho 3 card trước đó.

## Thu gọn các mục bên trong tab Tôi — 04/11/2026

- Thành phần trình bày dùng chung tại `src/components/RecordList.tsx`: dòng hồ sơ tóm tắt, hồ sơ mở rộng, tab lọc ngang và thông tin nhãn/giá trị theo hàng. Không thêm file CSS hoặc thư viện native.
- Mã KOL: danh sách mã/Shop/mức giảm/trạng thái, nút sao chép trực tiếp; mở rộng xem điều kiện và toàn bộ thao tác cũ. Thiếu điều kiện đơn tối thiểu thì hiển thị lời nhắc xem điều kiện, không hiển thị số 0 giả. Giữ quy tắc khách sao chép/nhập tay.
- Đổi trả: danh sách gọn, bộ lọc ngang, chi tiết có nút đóng ở đầu màn hình. Tiến trình 5 bước nằm ngang; bằng chứng thành dải ảnh/video/tài liệu thu nhỏ; lịch sử có thể mở rộng. Giữ nguyên mọi transition, API, validate và hành động theo role/trạng thái.
- KYC: danh sách tóm tắt, tab chờ duyệt/tất cả, bấm hồ sơ mới hiển thị giấy tờ và nút duyệt. Hàng mẫu: dòng tóm tắt với hạn video, bộ lọc ngang; chi tiết và form dùng layout gọn.
- Nhân sự: tách tab Nhân sự/Gian hàng, mở rộng từng đối tượng để thao tác. Giữ xác nhận khóa/mở khóa và thay người phụ trách. Chấp nhận ownerId null theo schema Store. Khóa nút tạo quản lý Shop khi danh sách Shop chưa sẵn sàng.
- Thiết lập và hồ sơ: hàng menu gọn, thông tin cá nhân theo cột nhãn/giá trị; giữ đổi mật khẩu, cập nhật thông tin và chọn ảnh. Form compact có thanh tiêu đề/nút đóng cố định, danh sách lựa chọn dài chuyển sang ô chọn có tìm kiếm; kiểm tra input/loading/khóa gửi lặp giữ nguyên. Thông báo đã dùng danh sách gọn ở đợt trước, đã xem lại toolbar, tab và dòng nội dung.

Nghiệm thu Android bằng phiên Admin có sẵn: xem mã KOL; mở/đóng hồ sơ đổi trả; danh sách KYC; nhân sự và 5 Shop; mở/đóng form tạo quản lý (không nhập/gửi); thiết lập, hồ sơ và thông báo. Queue hàng mẫu Admin trống nên mới nghiệm thu được trạng thái trống, chưa nghiệm thu chi tiết với hồ sơ thật. Không duyệt/khóa/tạo hồ sơ, đổi mật khẩu, upload tệp, đánh dấu thông báo hoặc thay đổi dữ liệu trong quá trình kiểm tra. TypeScript/lint, 61 test mobile và export Android qua.
