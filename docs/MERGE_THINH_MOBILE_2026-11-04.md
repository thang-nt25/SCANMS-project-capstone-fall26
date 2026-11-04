# Hợp nhất nhánh Thịnh và so sánh mobile — 04/11/2026

## Phạm vi và điểm khôi phục

- Nhánh làm việc: `tuan`; hợp nhất `origin/thinh` tại `5a58c1b6`.
- Toàn bộ thay đổi local trước merge được lưu ở `a858c50f` và nhánh `backup-tuan-20261104-before-thinh`.
- Không push, reset/seed database, thay tài khoản hay chỉnh các file `.env`.
- Code đến từ Thịnh thay đổi app Expo/React Native trong `Mobile/` và một lỗi API backend; không thay thế frontend web.

## Quyết định giữ và ghép

| Phần | Bản đang làm của Tuấn | Code mới Thịnh | Kết quả hợp nhất |
| --- | --- | --- | --- |
| Web chạy Chrome Android | Header/banner/thẻ sản phẩm gọn; sửa API localhost trên emulator; thanh dưới Customer và 4 role; trang shop/Live/tài khoản | Commit mới không sửa `frontend/` | Giữ nguyên code frontend của Tuấn |
| Trang chủ native | Trang công cụ/luồng nghiệp vụ có sẵn | Trang chủ mua sắm Customer, danh mục, shop và sản phẩm hai cột | Giữ giao diện mới Thịnh cho app native |
| Tìm kiếm và sản phẩm native | API, quyền và thao tác cũ | Bộ lọc, sắp xếp, ảnh, SKU bottom sheet, giá/tồn kho; không thêm checkout giả | Nhận giao diện mới, tiếp tục dùng API và kiểm tra backend |
| Giỏ và đơn mua native | Các thao tác dữ liệu đã có | Gom theo shop, ảnh/phân loại, số lượng, trạng thái đơn gọn hơn | Nhận thiết kế mới Thịnh |
| Hồ sơ và đăng nhập native | Phiên, role và validation | Trang Tôi, thiết lập tài khoản, xác nhận đăng xuất và form mới | Nhận thiết kế mới; giữ kiểm thử phiên/quyền |
| Ảnh native | URL tương đối từ web có thể không tải được trong app | Manifest ánh xạ đúng ảnh public vào assets; URL remote/uploads dùng nguồn gốc | Giữ resolver và test mới Thịnh; không tráo ảnh của sản phẩm khác |
| Ví, payout, Sandbox | Snapshot người nhận, gross/tax/net; duyệt API, đối soát PROCESSING; provider/reference; không tự retry giao dịch | Commit mới không thay các màn này | Giữ toàn bộ sửa lỗi Tuấn |
| Thuế, sổ cái, Escrow native | Màn đọc theo tháng cho Manager/Admin; phân biệt Sandbox | Menu trình bày mới chưa có icon cho module báo cáo được thêm local | Giữ báo cáo và bổ sung icon `finance-reports` để menu mới không thiếu module |
| Component native dùng chung | Chống lề kép trong Screen cuộn, chữ nút co/căn giữa, badge co, multiline có chiều cao, touch target 48 | Padding/cỡ chữ gọn, icon trạng thái rỗng, nút phụ trắng | Ghép cả hai: card padding 14, giữ context tránh lề kép và các bảo vệ chống tràn; nút tối thiểu 48 |
| Chuẩn bị APK | EAS preview/production và kiểm tra endpoint/secrets trước release | Thêm thư viện icon/font và cấu hình font | Giữ scripts kiểm tra release, nhận dependency mới đúng lockfile |
| API danh sách shop | `getPublicStores()` có truy vấn nhưng thiếu return | Thêm `return stores` và 3 ca test | Nhận bản sửa Thịnh, giữ CORS emulator của Tuấn |

## Conflict và lỗi tích hợp

1. `Mobile/src/components/ui.tsx`: giải quyết thủ công; giữ cả `PaddedScreen` và import `Icon`, chọn thông số nhỏ gọn mà vẫn giữ chống tràn và vùng chạm.
2. `Mobile/README_MOBILE.md`: giữ cả hướng dẫn audit/tài chính của Tuấn và tài liệu thiết kế mới của Thịnh.
3. Bổ sung `finance-reports` vào `Mobile/src/features/workspace/module-presentation.ts` để bảng icon đầy đủ sau merge.
4. `Mobile/package.json` tự merge được: giữ cả dependency icon/font mới và scripts kiểm tra phát hành của Tuấn.

## Khác biệt nên giữ rõ

- Web mobile và app native là hai giao diện/route riêng. Sửa giao diện trong `frontend/` không tự đổi app Expo và ngược lại.
- Thanh Customer web là Trang chủ/Gian hàng/Live/Thông báo/Tôi; app native mới là Trang chủ/Khám phá/Đơn mua/Tin nhắn/Tôi. Giữ cách tổ chức native của Thịnh trong lần merge này vì native chưa hoàn thiện luồng Live/checkout như web. Không tạo tab Live hoặc thanh toán chưa hoạt động để giống web về hình thức.
- Native dùng Công cụ để vào các nghiệp vụ theo role. Bộ điều hướng web mới của Tuấn vẫn giữ đúng 5 mục từng role như đã thống nhất.
- Phần Checkout/PayOS, livestream camera/microphone, attribution/App Links, push và nghiệm thu đủ 5 role trên điện thoại thật vẫn cần triển khai/kiểm thử riêng; merge không biến các phần chưa có thành đã hoàn thiện.

## Kiểm tra sau merge

- Mobile: TypeScript, lint không cảnh báo; 54/54 test qua, gồm phiên/quyền, cart, ảnh, gateway, Sandbox và kiểm tra môi trường phát hành.
- Backend: build qua; 7/7 test mục tiêu qua (CORS emulator và danh sách shop công khai).
- Frontend: production build qua; 6/6 bài kiểm thử mobile web qua cho header/banner, sản phẩm từ API thật (13 sản phẩm ở 344px), lọc/sắp xếp, thanh Customer và các role.
- Expo export Android qua: bundle Hermes 4,1 MB, kiểm tra được các module/font/assets dùng trong bundle; không phải kích thước APK.
- Kiểm thử điều hướng dùng dữ liệu fixture để không tạo giao dịch; các kiểm tra API công khai chỉ đọc. Không thực hiện mua/rút/duyệt chi thay người dùng.
- Bundle JS không phải APK cài máy thật. App native dùng dependency font mới cần build/cài lại binary phù hợp trước khi nghiệm thu Android; chưa xác nhận toàn bộ màn native hoặc APK release trên điện thoại thật trong lần merge này.
