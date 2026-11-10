# Mobile System Manager — giao diện và API

Ngày kiểm tra: 04/11/2026. Phạm vi là vai trò `SYSTEM_MANAGER` (vận hành sàn), dùng backend hiện tại và DB nhóm. Giữ màu vàng be SCANMS, Expo Router và cấu trúc feature có sẵn; không thêm CSS hoặc dependency native.

## Thay đổi

- Danh sách kiểm duyệt, MAP, chi trả, đánh giá, link tiếp thị, nhật ký, rủi ro và chiến dịch dùng dòng tóm tắt; mở rộng để xem nội dung dài và thao tác. Bộ lọc nằm ngang; tìm kiếm gộp thành một hàng.
- Tạo đơn thủ công và Import Excel tách hai tab. Giữ lựa chọn Shop, trạng thái form, khóa gửi lặp và mã idempotency. Danh sách sản phẩm chỉ tải khi dùng tab tạo đơn.
- Kiểm duyệt tải lại chi tiết sản phẩm trước khi gửi quyết định. Chỉ DRAFT do người khác tạo/gửi được xử lý; hồ sơ đã duyệt/từ chối là chỉ xem. Backend vẫn kiểm tra quyền, trạng thái và khóa transaction. Lý do từ chối tối thiểu 3, tối đa 1.000 ký tự.
- Ảnh sản phẩm kiểm duyệt dùng bộ phân giải ảnh có sẵn, hỗ trợ đường dẫn asset của hệ thống.
- Form MAP chuyển các ô tiền thành JSON number và mảng `variants` đúng DTO; chặn tiền rỗng, không dương, quá giới hạn hoặc quá hai số thập phân. Quyết định khuyến mãi gửi `approve` boolean và ghi chú 10–1.000 ký tự.
- Giữ nguyên xác nhận khi xử lý, upload chứng từ chi trả, kiểm tra quyền và các điều kiện trạng thái nghiệp vụ.

## Đối chiếu API bằng tài khoản Manager

Các đường dẫn dưới đây có tiền tố `/api`. GET dùng tài khoản cấu hình sẵn; token chỉ giữ trong bộ nhớ, không ghi vào báo cáo.

| Màn hình | API đọc đã trả 200 |
| --- | --- |
| Phiên đăng nhập | `/auth/me`, `/mobile/bootstrap` |
| Tổng quan, hàng đợi | `/dashboard/realtime/overview?days=30`, `/dashboard/operations/queue-summary` |
| Kiểm duyệt | `/products/moderation?status=DRAFT`; chi tiết `/products/:id` đã mở trên Android |
| KYC | `/kyc/admin/applications` |
| Đổi trả, khiếu nại | `/admin/return-disputes/active-returns`, `/admin/return-disputes` |
| Hàng mẫu | `/sample-requests/admin` |
| Mã KOL | `/admin/coupons?page=1&limit=20` |
| MAP, khuyến mãi | `/pricing/catalog`, `/pricing/promotions` |
| Đánh giá | `/products/reviews/moderation` |
| Chi trả | `/admin/payouts?page=1&limit=20` |
| Giám sát link | `/admin/referral-links?page=1&limit=20` |
| Nhật ký | `/audit-logs?page=1&limit=20` |
| Rủi ro | `/ai/fraud/incidents` |
| Chiến dịch | `/campaigns/explore` |
| Danh sách Shop, đơn | `/stores/all-admin`, `/orders/my-store?page=1&limit=20` |
| Thông báo | `/notifications?page=1&limit=20&category=ALL` |

`/auth/me` xác nhận role SYSTEM_MANAGER. `/users` và `/affiliate-deals/exceptions` trả **403**, đúng giới hạn riêng Admin; giao diện Manager không có tab quản lý tài khoản sàn hoặc ngoại lệ VIP.

Chín hợp đồng response được đối chiếu với Zod schema thực tế của màn hình: tổng quan, đánh giá, nhật ký, rủi ro, link, danh mục giá, khuyến mãi, chi trả, chiến dịch. Tất cả parse thành công; khuyến mãi hiện là mảng rỗng.

## Xác minh

- Mobile: 67 test qua (6 test mới cho quyền/trạng thái kiểm duyệt, validate và payload MAP/khuyến mãi); TypeScript và lint qua.
- Backend: 37 test qua trong 4 suite về kiểm duyệt, công bằng đánh giá, phạm vi dashboard và hàng đợi vận hành.
- Export Android thành công với `expo export --platform android`.
- Android đăng nhập thật bằng tài khoản Manager: tổng quan hiển thị đúng hàng đợi và 4 tab; danh sách Đã duyệt, ảnh và chi tiết sản phẩm tải được, không hiện nút ra quyết định lại. Danh mục MAP tải đúng sản phẩm/Shop/giá từ API; mở form giá chung/từng phân loại rồi đóng mà không lưu. Danh sách chi trả tải đúng người nhận, Shop, số thực nhận và trạng thái.

Không đánh đồng các kiểm tra đọc/payload này với nghiệm thu mọi thao tác ghi: chưa gửi quyết định KYC/sản phẩm, sửa MAP, xử lý khiếu nại, duyệt tiền, tạo đơn hoặc upload chứng từ lên DB nhóm trong lượt này. Hàng mẫu và yêu cầu khuyến mãi đang trống nên chưa kiểm thử chi tiết bằng hồ sơ thật.

## Kịch bản nghiệm thu tiếp

1. Shop tạo và gửi một sản phẩm mới. Manager mở Kiểm duyệt → Chờ duyệt; kiểm tra ảnh, chứng từ, phân loại; thử từ chối thiếu lý do rồi duyệt/từ chối đúng. Shop kiểm tra kết quả. Hồ sơ đã xử lý không được ra quyết định lại.
2. Manager → Giá sàn & Ưu đãi → mở sản phẩm → Cấu hình MAP. Thử bỏ trống/nhập số âm, sau đó lưu giá hợp lệ kèm lý do. Shop làm mới danh mục để đối chiếu MAP.
3. Shop đề xuất khuyến mãi. Manager mở tab Khuyến mãi, kiểm tra giá/ngân sách/thời gian, gửi quyết định có ghi chú; Shop đối chiếu trạng thái.
4. KOL/Shop gửi KYC, khách/Shop chuyển khiếu nại, KOL tạo yêu cầu mẫu: Manager mở đúng hàng đợi và bằng chứng; người gửi đối chiếu kết quả sau quyết định.
5. Với yêu cầu rút tiền đã chuẩn bị để nghiệm thu: mở chi tiết, đối chiếu gross/thuế/net/ngân hàng; thử thiếu chứng từ; chỉ xác nhận duyệt sau khi có chứng từ hợp lệ. Kiểm tra lại ví và lịch sử. Lượt sửa UI không tự chuyển tiền ngân hàng.
6. Kiểm tra lọc/tìm kiếm, phân trang, mở/đóng chi tiết, quay lại, tải lại và lỗi kết nối tại link tiếp thị, đánh giá, nhật ký, rủi ro và đơn hàng.
