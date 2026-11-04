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
