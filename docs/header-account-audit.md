# Rà soát thanh đầu trang và menu tài khoản

Ngày 29/10/2026. Phạm vi: PublicHeader, MarketplaceHeader, MarketplaceShortcuts, Topbar, AccountMenu và NotificationDropdown.

## Menu theo vai trò

Menu ở trang mua sắm và khu vực làm việc dùng chung danh sách chức năng. Không có bảng chuyển vai trò.

| Vai trò | Mục chính |
| --- | --- |
| CUSTOMER | Đơn mua, địa chỉ, yêu thích, voucher, ví mua sắm, hồ sơ, đăng ký đối tác |
| COLLABORATOR | Không gian KOL/KOC, ví hoa hồng, hợp tác/tin nhắn, hồ sơ |
| SHOP_MANAGER | Tổng quan gian hàng, đơn bán, sản phẩm, tin nhắn đối tác, cài đặt gian hàng |
| SYSTEM_MANAGER | Duyệt hồ sơ, kiểm duyệt sản phẩm, khiếu nại, hồ sơ cá nhân |
| SYSTEM_ADMIN | Tổng quan quản trị, duyệt hồ sơ, kiểm duyệt sản phẩm, khiếu nại, hồ sơ cá nhân |

Mọi vai trò giữ quyền mua sắm cá nhân. Khi đối tác mở trang khách hàng, menu giữ lối quay lại không gian của chính tài khoản. Nhãn đơn mua cá nhân phân biệt với đơn bán của shop. Mục tuyển đối tác được bỏ khỏi menu làm việc của đối tác đã đăng ký; màn hình đăng ký vẫn tồn tại tại /customer/upgrade.

Không gọi /admin/users là “Phân quyền”: route hiện tại thực tế render KycApprovalPage. SYSTEM_MANAGER không thấy liên kết executive analytics trong menu. Đây là chỉnh điều hướng hiển thị; quyền API tiếp tục do backend kiểm soát.

## Thanh đầu trang

| Mục | Kết quả rà soát / thay đổi |
| --- | --- |
| Logo | Giữ đường dẫn /marketplace |
| Tìm kiếm | Có gợi ý từ API, hỗ trợ Enter và bàn phím. Xóa nội dung đồng bộ tham số q, giữ các bộ lọc khác |
| Tra cứu đơn | Mở /tracking thống nhất, thay vì ở trang chủ chỉ cuộn xuống một ô nhập khác. Trên điện thoại có nút biểu tượng có nhãn truy cập |
| Giỏ hàng | Dùng CartContext.openCart và CartDrawer chung; số lượng theo giỏ tài khoản. Không có đường dẫn giả cần thay |
| Trang mua sắm | Quay về đầu trang cả khi bấm lại |
| Gian hàng đối tác | Đường dẫn /marketplace#featured-stores, bấm lại vẫn cuộn tới đúng khối; trạng thái active theo hash |
| Live KOC | Mở LiveCommerceHubModal hiện có |
| Sản phẩm giảm giá | /search?discount=true&inStock=true; SearchPage có xử lý cả hai bộ lọc |
| Menu tài khoản | Cùng chức năng trên hai header, Esc trả focus về nút tài khoản, đóng khi đổi route; kiểm tra MIME và dung lượng ảnh |
| Đăng xuất | Giữ xử lý authService/logout, không tự đăng xuất phiên của người dùng để thử |

Các điểm vào trang chủ, lịch live và giỏ hàng là thao tác mua sắm dùng chung cho các vai trò, không phải mục dư cần xóa. Các mục cùng tên dẫn sang chức năng khác đã được đổi nhãn hoặc sửa route.

## Thông báo

- Lời mời chiến dịch đưa KOL tới tin nhắn đúng shop; phản hồi chiến dịch đưa chủ shop tới đúng KOL.
- KYC của quản trị/vận hành đưa tới /admin/users; thông báo cần bổ sung hoặc bị từ chối đưa người nhận tới hồ sơ tương ứng.
- Thông báo hoa hồng/rút tiền có đích theo vai trò và giữ payoutId.
- Thông báo Live từ backend gọi API đánh dấu đã đọc; chỉ thông báo local mới dùng local read IDs.
- Chỉ cập nhật đã đọc khi lưu thành công; khi lỗi hiển thị thông báo và giữ trạng thái chưa đọc.
- Có trạng thái tải lỗi và nút thử lại, không giả là không có thông báo khi API thất bại.
- Loại bỏ fallback /live/demo khi thông báo thiếu phiên.
- Chỉ dùng actionUrl nội bộ hợp lệ; URL Live ngoài mở với noopener/noreferrer.

## Kiểm chứng và giới hạn

- Kiểm thử menu của đủ 5 vai trò: đích route tồn tại, không trùng đường dẫn, vai trò vận hành không có executive analytics.
- Kiểm thử đường quay lại workspace từ màn hình khách hàng.
- Kiểm thử ánh xạ thông báo chiến dịch/KYC/hoa hồng theo vai trò và mã hóa ID.
- Kiểm thử luồng cập nhật chuông theo sự kiện chat và lọc ngành hàng hiện có.
- TypeScript build kiểm tra tích hợp component.

## Kiểm tra bổ sung trên Chrome

Đã khởi chạy được Chrome kiểm thử với quyền chạy trình duyệt của môi trường. Dùng máy chủ Vite kiểm thử riêng ở localhost:5184 và chặn các API bằng dữ liệu giả lập; không dùng tài khoản đang mở của người dùng.

- Tìm kiếm: gợi ý từ khóa, Enter/phím mũi tên, hủy yêu cầu cũ, giao diện điện thoại, lỗi API và trạng thái không có kết quả.
- Bộ lọc: giảm giá và tồn kho kết hợp, vai trò KOL mới có bộ lọc hoa hồng; Quay lại/Tiến tới khôi phục đúng bộ lọc theo URL.
- Menu của đủ 5 vai trò: mở, có đúng đường dẫn vai trò, không có bảng chuyển vai trò, Esc đóng và trả focus.
- Thanh khám phá: gian hàng đối tác cuộn đúng khối, Live mở modal thật, giảm giá áp dụng đúng bộ lọc; logo/trang mua sắm về trang chủ.
- Tra cứu đơn mở /tracking; giỏ hàng mở drawer và đóng bằng Esc.
- Chuông: thử 1440×900, 1024×600, 390×640, 320×480 và 800×320; bảng vừa viewport, cuộn được đến cuối, giữ các nút đọc tất cả/đóng trong khung.
- Trường hợp API đọc tất cả trả lỗi: số chưa đọc giữ nguyên; thử lại thành công mới về 0.
- Cùng một thông báo Live có bản lưu máy: tài khoản đăng nhập dùng thông báo và trạng thái đã đọc từ máy chủ, tránh cộng trùng và lẫn dữ liệu giữa tài khoản. Khách chưa đăng nhập có thể xem thông báo Live cục bộ.
- Khi tải sản phẩm lỗi: hiển thị lỗi và thử lại, không ghi là không tìm được sản phẩm.

Giới hạn: kiểm thử trình duyệt dùng API giả lập; chưa xác nhận dữ liệu backend production, tải ảnh thật, đăng xuất phiên thật hoặc giao dịch. Không gửi tin nhắn, đặt đơn hay rút tiền trong kiểm thử.
