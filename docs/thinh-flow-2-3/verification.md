# Kết quả kiểm thử — bản áp dụng đầy đủ hai MD

Ngày 01/11/2026. Quyết định mới áp dụng VIP 10–25%, ngưỡng Admin16, ba phạm vi, KPI doanh thu, MAP và semantic model thay baseline cũ.

## Kết quả đã chạy

| Kiểm tra | Kết quả | Phạm vi bằng chứng |
|---|---|---|
| Backend regression | Báo cáo flow23-complete-unit-report.json: 137 suite, 1.563 test PASS; 56 test bỏ qua theo cấu hình sẵn có | Jest unit, không khởi tạo AppModule vào DB nhóm; các lượt bổ sung ghi riêng, không cộng trùng vào tổng này |
| Kiểm tra bổ sung sau sửa hiển thị KPI chờ Admin | 3 suite, 24 test PASS | Service và domain policy |
| PostgreSQL/HTTP/JWT/Socket.IO | 18 test PASS | DB local cô lập, controller/service/Prisma thật |
| Frontend | 19 test PASS = 13 browser Edge +6 utility | React thật với API fixture; không dùng để chứng minh ghi DB nhóm |
| BE build / FE build | PASS | NestJS và TypeScript/Vite |
| Lint thay đổi | PASS | File mới kiểm cả formatter; file lớn cũ lint logic, tắt riêng prettier để tránh đổi format ngoài phạm vi |
| git diff --check | PASS | Không có lỗi whitespace |
| Semantic inference thật | PASS | Tên “Máy ép trái cây tốc độ chậm” và “Máy ép chậm hoa quả”:83,03; loại ứng viên không liên quan |
| API Admin trên DB nhóm | Login200; catalog200 (13 sản phẩm); promotions200; exceptions200 | Đọc API chạy thật, không ghi MAP/Deal/đơn mới |
| Browser nối API/DB nhóm | /admin/pricing hiển thị13 dòng; /admin/vip-exceptions mở được | Đã render và xem ảnh thực tế |
| Semantic qua API thật | 200, MULTILINGUAL_SENTENCE_EMBEDDING, tìm được ứng viên | Model chạy trong backend thực |
| Runtime | FE5173/API3000 health200; pricing chưa auth401 | Một backend và một frontend |

## Nội dung kiểm thử tích hợp quan trọng

- Hai request chấp thuận đồng thời chỉ cấp tài nguyên một lần.
- Coupon lỗi/trùng làm rollback trạng thái, link và audit.
- VIP >16 chờ Admin, chưa có link/coupon/KPI clock; System Manager không được duyệt ngoại lệ.
- Admin từ chối không cấp tài nguyên; danh sách chọn phải cùng Shop.
- Selected-products cấp nhiều link trong một contract; Store-wide có hiệu lực với sản phẩm mới.
- KPI lấy net-goods snapshot và attribution đúng dòng.
- MAP và quyền reviewer, chặn tự duyệt, hai đơn tranh ngân sách, hủy ngân sách đúng một lần.
- Giá sàn riêng theo SKU; khuyến mãi đúng phân loại và khôi phục đúng giá.
- Socket.IO thực phát sau commit, nhân viên bị thu hồi quyền không nhận quyết định riêng.
- Media cache không giữ quyền đã thu hồi; guard barcode chống ghi đồng thời.

## Migration và DB nhóm

20261101010000_enterprise_pricing_and_vip đã chạy trên PostgreSQL cô lập rồi deploy thành công lên DB phát triển của nhóm theo backend/.env. Đây là migration bổ sung; không reset/seed, không xóa dữ liệu và không thay mật khẩu Shop. Migration 20261101000000_exclusive_deal_shop_offers đã được deploy ở đợt trước.

DB vẫn có bảy migration gốc của nhóm chưa có file local: chat_message_replies và sáu migration Flow5 tài chính (finance_postings, integrity, shopping_bucket, opening_balances, finance_documents, policy_history_guard). Lịch sử này được giữ nguyên. Migrate deploy đã áp dụng đúng một migration mới; không dùng reset/resolve giả để che khác biệt. Chưa kết luận có thể dựng một DB nhóm hoàn chỉnh từ lịch sử local đang thiếu này.

## Lệnh tái lập

Tại backend:
- npm.cmd test -- --runInBand
- Jest config test/jest-flow23.config.cjs, TEST_DATABASE_URL trỏ localhost:55441/scanms_flow23_test
- npm.cmd run semantic:prepare
- npm.cmd run build

Tại frontend:
- GHN_UI_TEST_URL=http://127.0.0.1:5173
- node --test tests/flow23-components.browser.test.mjs tests/partner-tier.test.mjs tests/demo-login-env.test.mjs
- npm.cmd run build

DB integration có guard bắt buộc localhost + tên DB test; không dùng DATABASE_URL nhóm. Không nạp AppModule/crons/mail vào integration suite.

## Giới hạn còn lại của nghiệm thu

UAT đầy đủ bằng dữ liệu do người dùng tự tạo trên DB nhóm chưa được người dùng ký. Đọc hai trang Admin thật không chứng minh toàn bộ checkout/VIP thật đã được người dùng thao tác. Theo [checklist](acceptance-tests.md) để lưu ID, ảnh và kết quả từng ca.

Redis local hiện chưa chạy; runtime dùng fallback RAM sẵn có. Không tuyên bố đã kiểm thử nhiều instance hay shipping/thanh toán thật. Các cảnh báo build chunk lớn và pg client-query deprecation không làm các kiểm tra trên thất bại.

## Bổ sung trang gian hàng công khai

- Hồ sơ Shop lấy số sản phẩm, người theo dõi, đánh giá, ngày tham gia và thống kê phản hồi chat từ DB. Không có đánh giá không tự gán 4,9 sao; thiếu dữ liệu chat không tự gán 100%.
- Thống kê chat tính phản hồi đầu tiên của Shop trong 24 giờ cho hội thoại khách hàng thuộc 30 ngày gần nhất. Hội thoại mới chưa được trả lời được chờ đủ 24 giờ trước khi vào mẫu đánh giá.
- Chỉ công khai tên doanh nghiệp và khu vực; không trả raw onboardingData, ngân hàng hoặc hồ sơ KYC. Chủ Shop cập nhật tên doanh nghiệp qua trang cài đặt sẵn có.
- Tab Trang chủ / Tất cả sản phẩm / Danh mục; gợi ý theo số lượng đã bán, tìm kiếm và lọc. Card giữ đánh giá và số lượng đã bán, không thêm nhãn “Xử lý”.
- Kiểm tra bổ sung: 15 unit test thuộc 4 suite và 2 PostgreSQL read-only test PASS; build FE/BE PASS. Browser nối API thật của DB nhóm kiểm tra điều hướng, tìm kiếm, trạng thái rỗng và bố cục 1440/390/320px, không có lỗi JavaScript trong lượt chạy.
- Không reset/seed DB để kiểm tra trang Shop. Các kết quả này không thay thế 30 ca UAT Flow 2–3 vẫn đang chờ nghiệm thu trong acceptance-tests.md.
