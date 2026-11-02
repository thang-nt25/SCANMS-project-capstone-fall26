# Kết quả kiểm thử — bản áp dụng đầy đủ hai MD

Ngày 01/11/2026. Quyết định mới áp dụng VIP 10–25%, ngưỡng Admin16, ba phạm vi, KPI doanh thu, MAP và semantic model thay baseline cũ.

## Kết quả đã chạy

| Kiểm tra | Kết quả | Phạm vi bằng chứng |
|---|---|---|
| Backend regression mới nhất | Báo cáo gap-full-unit-report.json: **143 suite, 1.592 test PASS; 59 test bỏ qua trong 3 suite** | Chạy sau bổ sung gallery và transaction cập nhật sản phẩm; không khởi tạo AppModule vào DB nhóm |
| Kiểm tra bổ sung sau sửa hiển thị KPI chờ Admin | 3 suite, 24 test PASS | Service và domain policy |
| PostgreSQL/HTTP/JWT/Socket.IO | **21 test PASS** | DB local cô lập; thêm ảnh bìa/role, tự duyệt/duyệt đồng thời, rollback nội dung/quota khi gallery lỗi |
| Frontend | **23 test PASS = 17 browser Edge +6 utility** | 19 ca hồi quy và 4 ca mới: CTA đúng Shop/query dùng chung, ẩn Customer, pixel cover/ảnh thứ năm, UI cấm tự duyệt |
| BE build / FE build | PASS | NestJS và TypeScript/Vite |
| Lint thay đổi | PASS | File mới kiểm cả formatter; file lớn cũ lint logic, tắt riêng prettier để tránh đổi format ngoài phạm vi |
| git diff --check | PASS | Không có lỗi whitespace |
| Semantic inference thật | PASS | Tên “Máy ép trái cây tốc độ chậm” và “Máy ép chậm hoa quả”:83,03; loại ứng viên không liên quan |
| API Admin trên DB nhóm | Login200; catalog200 (13 sản phẩm); promotions200; exceptions200 | Đọc API chạy thật, không ghi MAP/Deal/đơn mới |
| Browser nối API/DB nhóm | /admin/pricing hiển thị13 dòng; /admin/vip-exceptions mở được | Đã render và xem ảnh thực tế |
| Semantic qua API thật | 200, MULTILINGUAL_SENTENCE_EMBEDDING, tìm được ứng viên | Model chạy trong backend thực |
| Runtime | FE5173/API3000 health200; pricing chưa auth401 | Một backend và một frontend |
| AI mới trên API/DB nhóm | 200; 16/16 KOC, cả COLD_START và PERFORMANCE; tổng điểm đúng trọng số/radar | Đăng nhập Admin/KOC bằng cấu hình riêng, không in token/mật khẩu; không ghi hợp tác/sản phẩm |
| CTA trên trang Shop thật | GET trạng thái200; layout1440/390px vừa màn hình, không có lỗi JavaScript trong lượt chạy | Giữ đúng trạng thái hợp tác đã có trong DB; không gửi thêm request hợp tác để lấy minh chứng |
| Upload cover chưa đăng nhập | 401 | Endpoint mới đã chạy trong backend thực |

Báo cáo trước đợt bổ sung từng có 137 suite/1.563 test; không cộng số đó với lượt mới. Các lượt focused test là tập con hồi quy, không cộng chồng. Log/mô hình/ảnh runtime ở `.dev-runtime/` được ignore; không commit token, `.env` hoặc model cache.

Model smoke có thêm Bio: nội dung làm đẹp so ngành mỹ phẩm 54,03 và nội dung công nghệ 6,50. Đây là điểm cosine tương đối; không coi 54,03 là đã vượt ngưỡng lọc category60. Kiểm thử không giả điểm để làm đẹp kết quả.

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

Migration bổ sung `20261101020000_product_moderation_makers` đã áp dụng lên DB phát triển nhóm sau thử PostgreSQL local; đã kiểm tra hai cột provenance tồn tại. Creator/submitter lịch sử chưa biết giữ NULL. Không chạy reset/seed hoặc sửa mật khẩu ở đợt này.

DB vẫn có bảy migration gốc của nhóm chưa có file local: chat_message_replies và sáu migration Flow5 tài chính (finance_postings, integrity, shopping_bucket, opening_balances, finance_documents, policy_history_guard). Lịch sử này được giữ nguyên. Migrate deploy đã áp dụng đúng một migration mới; không dùng reset/resolve giả để che khác biệt. Chưa kết luận có thể dựng một DB nhóm hoàn chỉnh từ lịch sử local đang thiếu này.

Đợt rà soát mới đã fetch dev và tìm theo tên trong các path của toàn bộ lịch sử Git hiện có; vẫn không tìm được bảy bản gốc. Đây là phụ thuộc cần thành viên giữ migration cung cấp, không phải SQL có thể khôi phục nguyên bản từ `_prisma_migrations`.

## Lệnh tái lập

Tại backend:
- npm.cmd test -- --runInBand
- Jest config test/jest-flow23.config.cjs, TEST_DATABASE_URL trỏ localhost:55441/scanms_flow23_test
- npm.cmd run semantic:prepare
- npm.cmd run build

Tại frontend:
- GHN_UI_TEST_URL=http://127.0.0.1:5173
- node --test tests/flow23-components.browser.test.mjs tests/partner-tier.test.mjs tests/demo-login-env.test.mjs
- node --test tests/gap-completion.browser.test.mjs
- npm.cmd run build

DB integration có guard bắt buộc localhost + tên DB test; không dùng DATABASE_URL nhóm. Không nạp AppModule/crons/mail vào integration suite.

## Giới hạn còn lại của nghiệm thu

UAT đầy đủ bằng dữ liệu do người dùng tự tạo trên DB nhóm chưa được người dùng ký. Đọc trang Admin/Shop thật không chứng minh toàn bộ checkout/VIP thật đã được người dùng thao tác. Theo [checklist WEB-01–WEB-34](acceptance-tests.md) để lưu ID, ảnh và kết quả từng ca.

Redis local hiện chưa chạy; runtime dùng fallback RAM sẵn có. Không tuyên bố đã kiểm thử nhiều instance hay shipping/thanh toán thật. Các cảnh báo build chunk lớn và pg client-query deprecation không làm các kiểm tra trên thất bại.

## Bổ sung trang gian hàng công khai

- Hồ sơ Shop lấy số sản phẩm, người theo dõi, đánh giá, ngày tham gia và thống kê phản hồi chat từ DB. Không có đánh giá không tự gán 4,9 sao; thiếu dữ liệu chat không tự gán 100%.
- Thống kê chat tính phản hồi đầu tiên của Shop trong 24 giờ cho hội thoại khách hàng thuộc 30 ngày gần nhất. Hội thoại mới chưa được trả lời được chờ đủ 24 giờ trước khi vào mẫu đánh giá.
- Chỉ công khai tên doanh nghiệp và khu vực; không trả raw onboardingData, ngân hàng hoặc hồ sơ KYC. Chủ Shop cập nhật tên doanh nghiệp qua trang cài đặt sẵn có.
- Tab Trang chủ / Tất cả sản phẩm / Danh mục; gợi ý theo số lượng đã bán, tìm kiếm và lọc. Card giữ đánh giá và số lượng đã bán, không thêm nhãn “Xử lý”.
- Kiểm tra bổ sung: 15 unit test thuộc 4 suite và 2 PostgreSQL read-only test PASS; build FE/BE PASS. Browser nối API thật của DB nhóm kiểm tra điều hướng, tìm kiếm, trạng thái rỗng và bố cục 1440/390/320px, không có lỗi JavaScript trong lượt chạy.
- Không reset/seed DB để kiểm tra trang Shop. Các kết quả này không thay thế 30 ca UAT Flow 2–3 vẫn đang chờ nghiệm thu trong acceptance-tests.md.

## Bổ sung quyền quản lý được phân công

- Tái hiện với tài khoản quản lý mới của Aura: `/pricing/catalog` thành công nhưng `/orders/my-store?storeId=...` trả 403 vì chỉ so ownerId. API đơn đã dùng `managedStoreWhere`, nhận chủ Shop hoặc quản lý đang được phân công và còn hoạt động; trường hợp thiếu storeId cũng suy đúng phạm vi.
- `/auth/me` trước đây ghi đè phân công bằng Store sở hữu, trả NULL với nhân viên. Đã ưu tiên storeId lưu trong DB; FE dùng cùng quy tắc khi đăng nhập mật khẩu/Google và làm mới hồ sơ, đồng thời xóa ngữ cảnh cũ khi mất phân công/đổi sang Customer.
- Kiểm thử bổ sung sau đợt regression toàn bộ ở trên: 117 test thuộc 18 suite đơn hàng, 18 test AuthService, 9 test FE session/cache PASS; 22 ca PostgreSQL/HTTP/JWT/Socket.IO PASS. Các tập này có trùng phạm vi kiểm thử cũ, không cộng thành một tổng full-suite mới.
- Integration dùng DB local, kiểm tra truy cập đúng Shop, chặn người ngoài và chặn ngay khi gỡ phân công/khóa/xóa mềm tài khoản. Build FE/BE và lint các file sửa PASS.
- Hai API đọc danh sách/thống kê hàng mẫu cũng dùng policy owner/staff để bộ đếm menu không trả 404 cho quản lý được phân công. Hồi quy Samples: 66 test thuộc 3 suite PASS; không thay đổi SLA hay quy trình xử lý mẫu trong đợt sửa quyền đọc này.
- Browser thật với tài khoản Aura đã đăng nhập bằng form, mở Tổng quan/Giá bán/Sản phẩm/Đơn hàng và reload thành công. Không có API lỗi hoặc lỗi JavaScript trong lượt chạy; API đơn của Shop được phân công trả 200, Shop khác vẫn 403. Bằng chứng local: `.dev-runtime/shop-assignment-live-qa.json` và ảnh `aura-fixed-*.png`.
- Tạo tài khoản qua API Admin có sẵn trên DB phát triển nhóm. Không reset/seed, thay owner, đổi mật khẩu cũ hoặc sửa giá sản phẩm để xử lý lỗi quyền.

## Lời mời hợp tác chưa có hội thoại — 02/11/2026

- Tái hiện trên DB nhóm: Aura đã mời đúng tài khoản KOC, trạng thái PENDING/requestedByKol=false. Màn hợp tác trước đây chỉ dựng danh sách Shop từ hội thoại/deal, bỏ sót lời mời không có chat.
- Màn KOC nay lấy thêm quan hệ hợp tác, gộp theo Store ID và giữ metadata chat hiện có. Có bộ lọc **Lời mời**, trạng thái chờ riêng, nút làm mới, polling 15 giây, làm mới khi quay lại cửa sổ và báo lỗi/thử lại khi API không tải được. Query theo tài khoản được dùng chung với card Marketplace/Shop.
- Chấp nhận/từ chối vẫn dùng API có kiểm quyền và CAS hiện tại; quyết định thành công làm mới danh sách. Không tạo hội thoại hoặc tự chấp thuận quan hệ chỉ để lời mời xuất hiện. Ô chat giữ bản nháp cục bộ khi đồng bộ danh sách hội thoại, tránh mất ô soạn ở Shop vừa được mời.
- Kiểm thử: 8 browser fixture PASS (gồm ca mời chưa có chat, hai quyết định, refresh/lỗi API, giữ composer); 4 utility test gộp quan hệ PASS; 13 browser hồi quy Flow 2–3 PASS. Build FE và lint các file sửa không có lỗi. Các lượt có ca trùng, không cộng vào tổng full-suite BE ở trên.
- Browser nối API/DB nhóm xác nhận tài khoản KOC thấy Aura trong bộ lọc Lời mời, có cả hai nút phản hồi, bố cục 1440/390px không tràn ngang và không có lỗi API/JavaScript trong lượt chạy. Lời mời thật vẫn PENDING để người dùng nghiệm thu; không tự nhận/từ chối thay người dùng. Minh chứng local: `.dev-runtime/koc-invitations-live-qa.json`, `koc-aura-invitation-*.png`.

## Bổ sung giao diện và giao vận — 02/11/2026

- Tạo link: modal rộng tối đa 820px, tách sản phẩm/link/QR/thao tác; kiểm duyệt: tab trạng thái, tìm kiếm, làm mới và hồ sơ được bố trí bằng Tailwind trong TSX. Không tạo CSS riêng. Browser kiểm tra 1440/390/320px; màn kiểm duyệt nối API thật không tràn ngang tại 1440/390px. Build frontend và 8 browser hồi quy PASS. Chi tiết phạm vi stylesheet tại [style-audit.md](style-audit.md).
- Tách kiểm tra số đo kiện hàng khỏi EAN-13: barcode cũ sai không chặn báo cước khi số đo hợp lệ; tạo/sửa sản phẩm vẫn kiểm tra barcode. Không tự sửa barcode hoặc bịa số đo/cước. 63 test thuộc 3 suite PASS, gồm HTTP báo phí với persistence/carrier giả lập; không gọi GHN với địa chỉ khách trong lượt kiểm tra này.
- Tạo vận đơn TEST/LIVE và thao tác mô phỏng dùng quyền chủ Shop hoặc quản lý đang được phân công, truy vấn theo đúng Shop của đơn thay vì chọn Shop đầu tiên hoặc tin storeId trong JWT. Chặn quyền bị thu hồi, khác Shop, sai role và UUID/environment không hợp lệ trước khi gọi dịch vụ giao vận.
- 95 test thuộc 5 suite giao vận PASS sau sửa quyền; có ca trùng với lượt 63 test nên không cộng hai lượt. Lint test PASS; lint controller PASS khi tắt riêng quy tắc Prettier để tránh định dạng lại toàn bộ file cũ. Backend watch biên dịch 0 lỗi và health báo UP/CONNECTED.
- Kiểm tra read-only đúng đơn người dùng cung cấp xác nhận quản lý Aura có quyền qua staff assignment dù không phải owner. Không tạo vận đơn, thay trạng thái đơn hoặc gửi địa chỉ khách tới GHN thay người nghiệm thu.
