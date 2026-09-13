# SCANMS — QA review FR-17 đến FR-24

> Báo cáo lịch sử trước khi sửa, tại `395d44b`. Các lỗi và giới hạn Docker bên dưới mô tả vòng QA ban đầu, không phải trạng thái hiện tại. Xem [báo cáo sửa lỗi và kiểm chứng Docker](FR17_FR24_FIX_VERIFICATION.md). Script `fr17-fr24.qa-probe.cjs` là probe tái hiện lỗi cũ; không dùng làm regression cho phiên bản đã harden.

Ngày kiểm thử: 13/09/2026, Asia/Ho_Chi_Minh. Mã nguồn tại HEAD `395d44b` và worktree hiện tại.

## Kết luận

**Chưa đủ điều kiện chốt QA.** Các luồng tài chính cốt lõi có transaction, khóa dòng và ledger, nhưng còn lỗi ở dữ liệu đầu vào, snapshot hoa hồng, hoàn tiền và quyền truy cập công khai. Bộ test pass không đồng nghĩa mọi nghiệp vụ đã đúng.

Đã review source và chạy test cục bộ, bao gồm Frontend → API NestJS → PostgreSQL thật. **Chưa chạy được container Docker**, do Docker Engine không hoạt động và máy chưa có WSL. Không coi kiểm thử PostgreSQL cục bộ là kiểm thử Docker.

Trong đợt QA này không sửa code nghiệp vụ, không sửa `.env`, không thêm thư viện/CSS, không commit hoặc push. Thay đổi sẵn có ở `frontend/src/index.css` được giữ nguyên. Chỉ thêm báo cáo và hai script QA. Không kết nối hoặc ghi vào Supabase; không thực hiện chuyển khoản ngân hàng thật.

## 1. Môi trường và giới hạn bằng chứng

| Thành phần | Thực tế kiểm thử |
| --- | --- |
| Backend | Build NestJS; controller/service thật trong một Nest testing application, global validation/filter/envelope |
| Database | PostgreSQL 18 cục bộ, `127.0.0.1:55432`, database riêng `scanms_fr24_test` |
| Frontend | Vite QA `127.0.0.1:5183`, Edge headless, gọi API QA `127.0.0.1:5184/api` |
| API nghiệp vụ trong live browser | Orders, Wallets, Payouts thật; không mock các request nghiệp vụ này |
| API phụ trợ trong live browser | Mock GET thông tin đăng nhập/shop/sản phẩm để phục vụ ứng dụng QA cô lập |
| Cloudinary | Không upload ra dịch vụ thật. Integration tests dùng storage fake; live browser chủ động gây lỗi storage |
| Sàn ngoài | Payload mẫu Shopee/TikTok/Shopify; chưa gọi webhook staging của tài khoản sàn thật |
| Scheduler | Kiểm thử service với mốc thời gian được điều khiển; không đợi thực tế 14 ngày |
| Docker | CLI và Compose có sẵn; Docker Engine không truy cập được, chưa build/up container |

Ứng dụng QA không phải toàn bộ `AppModule`: các phụ thuộc ngoài phạm vi như Redis/coupon/cache được cô lập. Kết quả live API không chứng minh cấu hình bootstrap mặc định hoặc Docker networking đã hoạt động. PostgreSQL Compose là bản 15, khác bản 18 đã dùng cục bộ.

Fixture QA dùng UUID/mã đơn ngẫu nhiên và được giữ lại trong database test để đối chiếu, không xóa ledger. Không dùng dữ liệu tài chính thật.

## 2. Kết quả chạy kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `npm run build` | PASS |
| Prisma schema validate | PASS; chỉ xác nhận schema hợp lệ, không xác nhận DB đã migrate đủ |
| Jest scope `modules/(orders\|wallets\|payouts\|commissions)/` với DB QA | **16 suites, 148 tests PASS**, gồm 37 PostgreSQL integration tests |
| Frontend build | PASS; cảnh báo bundle JS khoảng 1,514 kB trước gzip |
| Frontend lint | 0 errors, 10 warnings; có warning dependency hook ở trang tra cứu |
| Frontend test mặc định | 14 PASS, 2 browser tests SKIP khi chưa bật opt-in |
| Frontend test với Edge opt-in | **16 PASS, 0 SKIP**, gồm 2 browser regression dùng API mock |
| Live browser QA riêng | **6 kịch bản hoàn tất** với API/DB nghiệp vụ thật; có cả kịch bản chứng minh lỗi |
| Script probe API/service riêng | 21 quan sát QA-01…QA-20 và QA-03B; không phải 21 assertion nghiệp vụ PASS |
| Probe bổ sung đồng thời | QA-27…QA-29: webhook 8 request, manual 2 request cùng mã, payload thiếu item |
| ESLint chỉ đọc trên 4 module backend | **62 errors, 3 warnings**; lỗi tập trung ở Orders |
| Replay SQL trong database mới riêng | 13 migration SQL chạy thành công, nhưng schema còn thiếu 5 cột và enum FR-19 |
| Docker build/up/runtime | BLOCKED — Docker Engine chưa chạy |

Không chạy `npm run lint` backend vì script có `--fix`: dùng ESLint API ở chế độ không sửa file. Phân bố 62 lỗi: `create-order.dto.ts` 2, `orders.controller.ts` 18, `orders.service.ts` 42. Các module Commissions/Wallets/Payouts không có lint error trong scope đã kiểm tra. Không khẳng định toàn repository sạch lint.

37 integration tests tài chính có kiểm tra rollback, concurrency, ownership, thuế, ledger bất biến và upload multipart. Upload thành công trong các test này vẫn dùng storage fake, không chứng minh kết nối Cloudinary thật.

## 3. Đánh giá theo FR

| FR | Điểm đã xác nhận | Vấn đề còn lại |
| --- | --- | --- |
| FR-17 | Trang tra cứu gọi đúng `/api/orders/track`, có loading/error | Tra cứu substring lộ dữ liệu; chưa chuẩn hóa SĐT; CORS mặc định sai |
| FR-18 | Có kiểm tra trạng thái giao hàng, sản phẩm thuộc đơn, sao 1–5 | Chưa xác minh người đánh giá; race duplicate; whitespace/độ dài; UUID lỗi trả 500 |
| FR-19 | Normalizer riêng 3 nguồn, transaction, duplicate guard | Webhook chưa xác thực; trạng thái Shopify sai; currency/tổng tiền/địa chỉ; chưa có luồng cập nhật sự kiện |
| FR-20 | Manual/import có transaction theo đơn; import trả lỗi theo dòng/nhóm đơn | Manual không mã có thể tạo trùng; coercion/bounds/SĐT; định dạng tiền Excel |
| FR-21 | Pending → available, lock và ledger, full cancel/return được engine xử lý | Snapshot thay đổi; bỏ discount; refund đã approved không clawback; mốc giữ tiền không ổn định |
| FR-22 | Transaction và `SELECT ... FOR UPDATE`; concurrency withdrawal test PASS | Phụ thuộc tính đúng của nguồn credit/clawback FR-21; chưa test trong Docker |
| FR-23 | Decimal, ledger append-only, DB trigger, tax threshold/net snapshot | Ledger có thể khớp số học nhưng vẫn ghi sai số tiền do nghiệp vụ FR-21; migration workflow thiếu FR-19/21 |
| FR-24 | Ownership, bắt buộc bill, export net, persisted batch, chống xử lý lặp | Thiếu config ngân hàng hiện tại; Cloudinary thật/Docker/chuyển khoản chưa kiểm thử |

## 4. Bug ưu tiên cao — P1

### B01 — FR-17: Tra cứu công khai bằng chuỗi con làm lộ đơn và địa chỉ

- Source: `backend/src/modules/orders/orders.service.ts:1416`, đặc biệt `:1428`, `:1433`, phần response `:1520`; `dto/track-order.dto.ts`.
- Repro: tạo đơn QA với SĐT `0901234567`, gọi không đăng nhập `GET /api/orders/track?phone=0`.
- Actual: HTTP 200, tìm thấy đơn và địa chỉ riêng đầy đủ. Mã đơn cũng được tìm bằng `contains`.
- Expected: không cho một ký tự liệt kê dữ liệu khách hàng; xác minh quyền xem và hạn chế dữ liệu trả ra.
- Hướng sửa: chuẩn hóa + exact match; yêu cầu đủ thông tin xác minh (token/OTP hoặc mã đơn kết hợp SĐT), rate limit, giới hạn kết quả và mask PII. Không chỉ sửa regex frontend.
- Bằng chứng: QA-01, DB thật.

### B02 — FR-18: Người ngoài có thể viết review được tự duyệt

- Source: `orders.controller.ts:164`; `orders.service.ts:1552`, `:1609`.
- Repro: gọi `POST /api/orders/{deliveredOrderId}/review` không JWT/token chứng minh mua hàng, gửi `customerName: "Not the buyer"`.
- Actual: HTTP 201, `isApproved=true`. Có thể lấy ID từ B01.
- Expected: guest vẫn có thể review nhưng phải chứng minh sở hữu đơn; không tin tên khách tự nhập.
- Hướng sửa: guest review token riêng hoặc xác minh SĐT/OTP; bind token với đơn/sản phẩm, tránh dùng UUID như bí mật bảo mật.
- Bằng chứng: QA-02.

### B03 — FR-19: Webhook chưa xác thực nguồn và shop nhận đơn

- Source: `orders.controller.ts:86`, `dto/order-webhook.dto.ts`; `orders.service.ts:90`.
- Repro: gọi public `/api/orders/webhook`, tự chọn `storeId`, dùng SKU hợp lệ của shop; không signature/token.
- Actual: HTTP 200, tạo đơn mới. Webhook server-to-server không cần JWT người dùng, nhưng hiện cũng không có xác thực thay thế.
- Expected: chỉ nguồn tích hợp được shop cho phép mới có thể ghi đơn của shop đó.
- Hướng sửa: adapter xác minh signature theo nguồn hoặc shared secret scoped theo shop cho chế độ đồ án; phân biệt rõ mock/demo với webhook thật. Không log secret/raw PII.
- Bằng chứng: QA-07. Đây là thiếu bảo vệ tích hợp, không yêu cầu bỏ endpoint webhook công khai khỏi routing.

### B04 — FR-21: Engine bỏ qua discount và ghi đè snapshot tiền hoa hồng

- Source: `commissions/commissions.service.ts:155`, `:167`; `commission-calculator.service.ts:24`.
- Repro: đơn gross 1,000,000; discount 500,000; final 500,000; snapshot item rate 10%, commission 50,000. Chạy `createPendingCommission`.
- Actual: tạo commission 100,000 và ghi đè snapshot item thành 100,000, thay vì giữ 50,000 đã tính trên net.
- Expected: dùng cơ sở tính và phân bổ discount nhất quán với snapshot đã chốt. Luồng tạo đơn hiện có đã tính snapshot trên giá trị sau giảm giá.
- Hướng sửa: xác định net commissionable amount từng item, snapshot tại thời điểm nghiệp vụ thống nhất; không tái tính từ giá gross rồi ghi đè vô điều kiện. Tách phí ship/thuế không commissionable theo quy tắc dự án.
- Bằng chứng: QA-16.

### B05 — FR-21: Đổi cấu hình sau mua làm thay đổi hoa hồng của đơn cũ

- Source: `commissions.service.ts:117`, `:131`, `:151`, `:155`.
- Repro: đơn/item đã snapshot rate 10%, commission 100,000. Đổi `product.customCommissionRate` thành 50% trước khi engine tạo commission.
- Actual: engine tính 500,000 và ghi lại item. Default rate shop và tier bonus cũng được đọc ở thời điểm xử lý.
- Expected: cấu hình mới không hồi tố lên đơn đã chốt, trừ khi có quy trình điều chỉnh được truy vết rõ ràng.
- Hướng sửa: snapshot rate/tier/commissionable amount; phân biệt snapshot chưa tính của FR-19/20 với snapshot đã chốt, không dùng số 0 làm tín hiệu nhập nhằng.
- Bằng chứng: QA-17.

### B06 — FR-21 liên kết FR-09: Hoàn tiền sau approved không thu hồi commission

- Source: `commission-rules/commission-rules.service.ts:1581`, `:1654`, nhánh xử lý commission phía sau; `commissions.service.ts:275` và điều kiện reversal status.
- Repro: commission 100,000 đã APPROVED và credit available. Hoàn toàn bộ 1,000,000 qua `handleRefundAdjustment`, sau đó gọi engine reversal.
- Actual: order vẫn DELIVERED, `refundedAmount=1000000`; available vẫn 100,000; engine trả `false`. Refund path điều chỉnh commission PENDING, còn cron chỉ reverse khi order CANCELLED/RETURNED.
- Expected: full refund sau approved vẫn thu hồi đúng phần commission tương ứng, có ledger bù trừ. Nếu tiền đã rút, áp dụng cơ chế debt/đối soát đã thiết kế, không xóa lịch sử.
- Hướng sửa: thống nhất một đường clawback transactional cho refund và status event, xử lý idempotent phần đã thu hồi; phối hợp chủ module FR-09 trước khi sửa ngoài scope.
- Bằng chứng: QA-18. Đã phát hiện liên kết ngoài module, không tự ý sửa.

### B07 — Deployment: Migration chuẩn không tái tạo được schema hiện tại

- Source: `backend/prisma/schema.prisma:775`, `:922`; `prisma/sql/fr-19-order-webhook-migration.sql`; `prisma/sql/fr-21-commission-engine-migration.sql`; thư mục `prisma/migrations/`.
- Repro: tạo database QA trống, chạy tuần tự toàn bộ 13 `migration.sql`, đối chiếu scalar fields Prisma với `information_schema`.
- Actual: tất cả SQL chạy thành công, nhưng thiếu `orders.source_platform`, `orders.raw_payload`, `commissions.eligible_at`, `available_at`, `reversed_at`; enum `OrderSourcePlatform` cũng chưa có.
- Root cause: SQL FR-19/21 nằm ngoài thư mục migration chuẩn; Prisma Migrate không tự chạy chúng. Không phải toàn bộ script FR-19/21 bị mất.
- Expected: có một workflow migration được leader review, tái tạo đúng schema cả DB mới và DB đang dùng.
- Hướng sửa: hợp nhất/đăng ký migration có preflight và baseline phù hợp cho DB đã chạy manual SQL. Không chạy `db push`, reset, drop hoặc replay mù trên Supabase. Comment FR-19 nói repository chưa có baseline cũng đã lỗi thời.
- Bằng chứng: database riêng `scanms_qa_migrations_c2271820_test`; kiểm tra schema không ghi vào DB dùng chung.

### B08 — FR-20: Manual order không mã có thể tạo hai đơn khi submit lặp

- Source: `frontend/src/pages/merchant/OrdersManagementPage.tsx:140`; `backend/src/modules/orders/manual-orders.service.ts:61` và hàm sinh mã.
- Repro: điền form hợp lệ, để trống mã đơn, gọi `form.requestSubmit()` hai lần trong cùng một lượt trước khi React render disabled state.
- Actual: 2 POST thành công, 2 mã đơn khác nhau, 2 order với items riêng. Backend tự sinh mã cho từng request nên unique constraint không phát hiện cùng ý định tạo đơn.
- Expected: một thao tác tạo đơn chỉ tạo một order, kể cả double submit/retry sau mất mạng.
- Hướng sửa: synchronous `useRef` in-flight guard như Wallet/Payout UI, và idempotency key backend scoped theo shop + nội dung request, giữ key khi retry chưa rõ kết quả.
- Bằng chứng: QA-21, live browser/API/DB thật. Khi cung cấp cùng mã đơn, chống trùng hiện có hoạt động tốt: QA-28 trả 201/409.

### B09 — Integration/config: CORS hiện tại không cho Frontend cổng 5173

- Source: `backend/src/main.ts:39`, `:52`; public config đã đọc từ `.env`; `docker-compose.yml`.
- Repro/config: FE ở `http://localhost:5173`, API URL `http://localhost:3000/api`; BE có `FRONTEND_URL=http://localhost:3000`, chưa có `CORS_ORIGINS`.
- Actual theo callback hiện tại: origin 5173 không nằm trong allowlist, browser request bị từ chối CORS. Compose cũng không override cấu hình này.
- Expected: allowlist chứa origin thật của frontend; không dùng wildcard khi gửi credentials.
- Hướng sửa: cấu hình origin FE chính xác, cân nhắc localhost và 127.0.0.1 là hai origin khác nhau. QA browser đã dùng CORS riêng nên kết quả PASS không phủ nhận lỗi cấu hình bootstrap này.
- Bằng chứng: static/config confirmed; chưa chạy full AppModule/Docker để đo network error này trên cấu hình mặc định.

## 5. Bug/validation cần xử lý — P2/P3

### B10 — P2, FR-19: Shopify refunded + fulfilled được map DELIVERED

`normalizers/shopify-order.normalizer.ts:97` kiểm tra fulfillment trước financial status. Payload `financial_status=refunded`, `fulfillment_status=fulfilled` tạo đơn DELIVERED (QA-09). Cần ưu tiên refund/cancel và xử lý full/partial refund theo lượng hoàn, không bỏ qua vì đã fulfillment. Điều này ảnh hưởng eligibility FR-21.

Ngoài ra, `fulfilled` chỉ mô tả line items đã fulfillment, không tự chứng minh khách đã nhận hàng. Cần sự kiện vận chuyển/delivery hoặc quy tắc mock được công bố trước khi coi là DELIVERED. Đây là suy luận từ định nghĩa trạng thái của [Shopify Order documentation](https://shopify.dev/docs/api/admin-rest/latest/resources/order), không phải đã thử tracking Shopify thật.

### B11 — P2, FR-19/17/21: Webhook lặp bỏ qua sự kiện thay đổi trạng thái

`orders.service.ts:95` trả đơn cũ trước xử lý event. QA-08: webhook đầu tạo PENDING; cùng external ID gửi fulfilled vẫn PENDING. Không tạo trùng là đúng, nhưng hiện chưa có luồng đồng bộ trạng thái qua các event tiếp theo; đơn có thể không tiến triển đến bước tính commission.

**Integration gap cần chốt phạm vi:** FR-19 ban đầu tập trung nhận/tạo đơn nên không coi mọi duplicate là phải update vô điều kiện. Nên thiết kế event idempotency riêng, xác thực nguồn và kiểm tra transition/version; không biến replay payload cũ thành rollback trạng thái mới.

### B12 — P2, FR-19: Mất currency, USD bị coi như tiền VND

Normalizer không giữ/reject currency. QA-10: Shopify USD 19.99 được lưu `finalAmount=19.99`; UI/export hệ thống dùng VND. Cần reject non-VND cho phạm vi đồ án hoặc thiết kế conversion/snapshot rõ ràng. Không tự áp tỷ giá hard-code.

### B13 — P2, FR-19: Tổng tiền không được kiểm tra theo mô hình phí đầy đủ

QA-11: payload không khai báo ship/tax, subtotal 1,000,000, discount 500,000, final 1,000,000 vẫn được nhận. Source: `orders.service.ts` xử lý totals và normalizers.

Cần chuẩn hóa discount, shipping, tax, refunded amount và kiểm tra tính nhất quán theo từng nguồn. **Không áp cứng `subtotal-discount=total` cho mọi Shopify order**, vì đơn thật có thể có shipping/tax. Trường hợp hiện tại chứng minh thiếu validation/mô hình phí, không chứng minh mọi total khác phép trừ đều sai.

### B14 — P2, FR-18: Check-then-insert review không an toàn khi concurrent

`orders.service.ts` tìm review cũ rồi create, không constraint unique `(order_id, product_id)` trong `schema.prisma:360`.

QA-03 qua 8 HTTP request tự nhiên đã trả 1×201 + 7×400, không tái hiện duplicate trong lượt chạy đó. QA-03B đồng bộ hai thao tác đọc thật trước create bằng barrier (không giả kết quả DB), sau đó có **2 review cùng order/product**. Đây là tái hiện race có kiểm soát. Thêm unique constraint được review migration và bắt conflict; frontend disabled không thay thế constraint.

### B15 — P2, FR-18/20: Kiểu dữ liệu/bounds không chặt, lỗi nhập trả 500 và lộ Prisma

- `create-manual-order.dto.ts`: `@Type(() => Number)` chuyển `true` thành 1. QA-13 lưu `quantity=1`, `unitPrice=1` khi gửi boolean.
- QA-14: `unitPrice=1e16` vượt khả năng column monetary vẫn lọt DTO, DB báo lỗi 500.
- Review route không `ParseUUIDPipe`; product ID review cũng chỉ `IsString`. QA-04: order ID `not-a-uuid` trả 500.
- `common/filters/http-exception.filter.ts:27` trả thẳng `exception.message`, response lỗi trên lộ Prisma invocation/internal details.

Cần kiểm tra type trước coercion, max quantity/precision monetary và UUID; trả 400 cho lỗi nhập. Với 500 trả thông báo chung + correlation ID, log nội bộ được sanitize. Manual service còn dùng JS number cho subtotal/final; nên thống nhất Decimal trong tính toán tiền thay vì chỉ chuyển ở DB.

### B16 — P2, FR-20: Chuỗi tiền Excel `1,5` bị đổi thành 15

`excel-order-import.service.ts:428` xóa mọi dấu phẩy và khoảng trắng trước `Number`. QA-15: ô text `unit_price="1,5"` được import giá 15.00. Với người dùng nhập dấu phẩy thập phân, số tiền bị đổi mà không báo lỗi.

Cần hướng dẫn/validate một định dạng rõ ràng; ưu tiên cell numeric, reject chuỗi mơ hồ hoặc parse locale có kiểm soát. Không âm thầm xóa dấu phân cách. Kiểm tra số lẻ/bounds như DTO trước khi gọi manual service, vì import tự dựng DTO chứ không chạy lại global ValidationPipe cho từng row.

### B17 — P2, FR-17/20: SĐT không chuẩn hóa và manual nhận `abc`

QA-12: manual `customerPhone="abc"` trả 201 (`create-manual-order.dto.ts` chỉ kiểm tra non-whitespace/độ dài). QA-23 live browser: đơn SĐT `0902233445`, lookup `+84902233445` trả 200 với 0 đơn dù cùng số theo quy ước VN.

Cần một hàm chuẩn hóa thống nhất lúc ghi/tra cứu/import, validate phone server và client; kiểm tra case `0`, `+84`, dấu cách/gạch nối theo quy tắc dự án. Không tiếp tục dùng substring để bù cho thiếu normalization.

### B18 — P2, FR-21: Mốc 14 ngày lấy từ `order.updatedAt` không ổn định

`commissions.service.ts:176` lấy updatedAt làm eligibleAt. QA-20: order completedAt cách 20 ngày, nhưng updatedAt hôm nay → commission phải chờ thêm 14 ngày, chưa mature.

Cần chốt rõ mốc nghiệp vụ bắt đầu escrow (giao/hoàn thành đủ điều kiện), lưu timestamp ổn định và giữ nguyên khi sửa metadata. Fixture chứng minh code không dùng completedAt; phải xác nhận ý nghĩa completedAt của các nguồn trước khi migration/backfill, không tự coi mọi completedAt đều là receipt timestamp chuẩn.

### B19 — P2, FR-21 liên kết FR-09: Partial refund nhiều lần giảm sai phần còn lại

`commission-rules.service.ts:1581` và nhánh giảm commission PENDING. QA-19: commission 100,000; hoàn 200,000 rồi 200,000 trên đơn 1,000,000. Expected theo tỷ lệ refund tích lũy: còn 60,000; actual: 64,000 (nhân 80% hai lần).

Đây là lỗi liên kết FR-09 đã được ghi nhận trước đó, không phải sửa mới của QA. Cần tính cumulative entitlement từ baseline ổn định rồi ghi delta, transactional/idempotent và Decimal; phối hợp chủ module ngoài scope.

### B20 — P3, FR-18: Review whitespace/độ dài không khớp UI

`create-review.dto.ts` thiếu trim/min/max length. QA-05: comment toàn khoảng trắng được lưu, HTTP 201. QA-06 và QA-22 live UI: 600 ký tự vẫn được lưu dù counter hiển thị `/500`; textarea `OrderTrackingPage.tsx:771` không có maxLength.

Cần validate thống nhất FE/BE; giới hạn customerName và reviewImageUrl theo schema/security policy; không chỉ kiểm tra độ dài trước trim trên frontend.

### B21 — P3, FR-18/20: Có nền thương hiệu emerald trái AGENTS.md

`OrderTrackingPage.tsx:557` có `bg-emerald-50/80` và border emerald; notice/import visuals ở OrdersManagement cũng còn emerald. QA-22 kiểm tra review panel thật vẫn xanh. Đây là lỗi design-system, không lỗi tính tiền. Khi được phép sửa UI, dùng token vàng be/brand-soft, Tailwind; không tạo CSS mới.

### B22 — P2, FR-24/config: Chưa cấu hình danh sách ngân hàng VietQR

`.env` hiện tại không có `PAYOUT_VIETQR_BANKS`; `payout-settings.service.ts` default `[]`; `payout-batches.service.ts:210` gọi `resolveBank` và báo 400 cho ngân hàng chưa có mapping.

Live export PASS sử dụng **config QA riêng** với một ngân hàng giả lập, không chứng minh export chạy được với `.env` hiện tại. Cần leader cung cấp/review mapping BIN/code/name/aliases trong config cho ngân hàng demo; không hard-code ngân hàng vào service hoặc đưa số tài khoản cá nhân vào source.

### B23 — P2, FR-19: Shopify shipping address bị mất city/province/country

QA-09 gửi address1, city, province, country, nhưng đơn chỉ lưu `"QA road"`. `normalizer.utils.ts:92` có early return cho street/address1 trước nhánh ghép các phần địa chỉ ở phía dưới. Cần ghép theo cấu trúc nguồn, tránh mất địa chỉ giao/đối soát; có test riêng cho address1 + address2 + locality.

## 6. Những điểm đang làm tốt và đã kiểm chứng

- Normalizer từng nguồn được tách file, DTO envelope rõ ràng; không if/else tập trung rối trong controller.
- Webhook 8 POST cùng external ID: 1 created response, 1 order, 1 item; 7 response idempotent (QA-27). Payload Shopee thiếu items trả 400 (QA-29).
- Manual cùng mã: concurrent 201/409, chỉ 1 order và 1 item (QA-28). Đơn và items tạo cùng transaction/nested create; đây là bảo vệ tốt nhưng khác idempotency của intent không mã.
- Import nhóm nhiều dòng theo order code, báo lỗi row/field và không nhập phần còn lại của nhóm đơn bị lỗi. Transaction theo từng order phù hợp partial-success import, không phải rollback toàn file.
- `wallets.service.ts:327`, `:356` dùng parameterized `SELECT ... FOR UPDATE`, đọc số dư sau khi lock. Các mutation và ledger đi chung transaction.
- Ledger service chỉ có append, kiểm tra `before + amount = after`, reference và bucket; trigger chặn UPDATE/DELETE/TRUNCATE ở DB đã migrate FR-23. Không có nghĩa superuser DB không thể bypass chính sách.
- Concurrency withdrawal test xác nhận không âm available; lỗi tạo payout/ledger rollback số dư. Debt clawback là bucket nghiệp vụ riêng, không nhầm với cho phép available âm.
- Thuế theo **quy tắc đồ án FR-23**, không phải kết luận pháp lý áp dụng mọi trường hợp: dưới 2 triệu không khấu trừ, từ 2 triệu 10%, Decimal và ROUND_HALF_UP. Payout lưu gross/tax/net.
- Live Wallet UI rút 2 triệu: double submit chỉ 1 POST, tax 200,000, net 1,800,000 (QA-24).
- Live Merchant UI xuất đúng net 1,800,000 trong Excel, chuyển payout PROCESSING, tải lại batch cũ mà không tạo batch mới (QA-25). Excel có metadata shop/payout, ngân hàng/BIN, số tài khoản dạng text, người nhận, gross/tax/net, nội dung chuyển khoản và link QR. Không phải đã import file này thành công vào ngân hàng cụ thể.
- Bill cần MIME/extension/signature/size phù hợp; có hash chống tái sử dụng, private storage và link ngắn hạn; ownership/role test PASS. Confirm payout không trừ ví lần hai; reject hoàn về đúng store wallet trong transaction.
- Live browser mô phỏng storage error: UI hiển thị lỗi, giữ dialog/input, không xác nhận chi trả (QA-26). Lỗi mô phỏng trả 500; provider thật dùng ServiceUnavailableException 503, chưa kiểm thử lỗi mạng provider trực tiếp.

## 7. Code quality và UX follow-up

Các mục dưới là rủi ro static/case cần test thêm, không gộp vào lỗi đã tái hiện:

- OrdersService rất lớn, nhiều `any`/unsafe member access và lint errors. Nên tách tracking/review khỏi order creation theo scope nhỏ sau khi được phép, không rewrite toàn module.
- Frontend tra cứu chưa có request sequencing/abort đầy đủ: kiểm tra search A chậm, search B nhanh, tránh A ghi đè B.
- Merchant order page tải danh sách sản phẩm giới hạn; cần kiểm tra shop nhiều hơn 100 sản phẩm, pagination/search và trạng thái không tải được sản phẩm.
- Frontend route cho SYSTEM_ADMIN vào Wallet/Merchant Payout, nhưng backend wallet giới hạn COLLABORATOR và merchant payout SHOP_MANAGER. Cần chốt admin được xem hay thao tác, đồng bộ route/API để tránh trang mở được nhưng 403.
- Shared Axios development có auto demo-login/retry sau 401/403. QA quyền truy cập không được dựa vào UI demo retry; kiểm tra API trực tiếp và bảo đảm production không âm thầm đổi danh tính.
- Filter chỉ trả message đầu tiên của validation array, UX form nhiều field không thể hiển thị đầy đủ lỗi cùng lúc.
- File `.xlsx` giới hạn compressed bytes nhưng chưa có rõ ràng max rows/items/decompressed payload. Cần thử workbook lớn/zip bomb có kiểm soát, không chạy payload gây DoS trên DB dùng chung.
- Thiếu test real source payload/version, malformed numeric status, masked phone, multi-currency, SKU ambiguity, shipping/tax allocation và retry events out-of-order.
- Chưa stress test deadlock/lock timeout khi batch payout, clawback và withdrawal cùng lúc; cần bounded retry chính xác, không retry mutation không idempotent một cách mù quáng.
- Payout legacy thiếu shop/net/ledger bị backend từ chối để đối soát; UX nên hiển thị khả năng thao tác tương ứng thay vì chỉ theo PENDING. Không tự backfill tiền legacy.
- Cảnh báo bundle lớn nên được triage code splitting, không phải nguyên nhân trực tiếp của bug tài chính.

## 8. Docker — kiểm tra và phần chưa thực hiện

Đã kiểm tra `docker-compose.yml`, cả Dockerfile và `.dockerignore`, Vite proxy, cấu hình BE/FE.

### Trạng thái máy

- Docker CLI 29.7.2 và Compose v5.5.1 có sẵn.
- Context `desktop-linux` nhưng pipe `dockerDesktopLinuxEngine` không tồn tại; không có daemon hoạt động.
- `wsl --list --quiet` và lượt kiểm tra tiếp theo `wsl --status` báo chưa cài WSL. Người dùng đã cung cấp ảnh Docker Desktop 4.90.0, xác nhận ứng dụng đã cài; kiểm tra executable ở các đường dẫn phổ biến trước đó không đủ để kết luận chưa có Docker Desktop.
- Ảnh Docker Desktop báo `Virtualization support not detected`, trạng thái `Engine stopped`. Chẩn đoán chỉ đọc tiếp theo: máy Dell Precision 3490, Core Ultra 7 165H, `HypervisorPresent=true`; các cờ CPU virtualization trả false. Khi hypervisor đã hiện diện, không dùng riêng các cờ này để kết luận chắc chắn BIOS tắt virtualization. Cần đối chiếu Task Manager, Windows features và WSL backend trước khi thay đổi BIOS.
- Không tự cài WSL/Docker Desktop, thay đổi Windows features, reboot hoặc chạy installer trong task review này.

WSL2/Docker Desktop phải được cài/cấu hình và Docker Engine phải chạy trước khi build/up. Xem [Docker Desktop Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/) và [WSL backend requirements](https://docs.docker.com/desktop/features/wsl/). Đây là blocker môi trường, không phải kết luận container build fail do source.

### Vấn đề Compose/static cần xử lý trước vòng runtime

1. Không có bước migrate/healthcheck database. `depends_on` hiện chỉ biểu diễn dependency, không chứng minh schema đã sẵn sàng. Fresh volume sẽ chưa có schema; B07 khiến replay migration chuẩn vẫn thiếu FR-19/21.
2. Chưa có Redis service trong Compose; nếu backend dùng `REDIS_HOST=localhost`, localhost trong container không phải Redis host. Phải xác nhận dependency nào bắt buộc runtime toàn AppModule.
3. Proxy Vite `/api` và `/r/` trỏ `http://localhost:3000`; trong frontend container, localhost là frontend container, không phải backend. Target container nên cấu hình theo DNS service `backend:3000`. **Browser** trên máy host vẫn có thể dùng `http://localhost:3000/api`, đây là hai môi trường khác nhau. Theo [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/).
4. CORS B09 cần allowlist đúng FE. Default browser direct API hiện không đi qua Vite proxy.
5. Compose chỉ khai báo PORT/DATABASE_URL cho BE. Bind mount hiện có thể cung cấp `backend/.env` trên máy này, dù Dockerfile không copy `.env`. Vì vậy không khẳng định máy này luôn thiếu JWT. Nhưng clean checkout không có `.env` sẽ thiếu JWT_SECRET và bootstrap từ chối chạy; cần workflow config local an toàn, không commit secrets.
6. DB host port 5432 có thể trùng PostgreSQL đang cài trên Windows; cần kiểm tra trước khi up. Không đổi port hoặc stop service của người dùng tự động.
7. Dockerfiles dùng `npm install` và dev targets; nên chốt reproducibility với lockfile/`npm ci` và phiên bản Node tương thích. Chưa đo build container thực tế.

### Lệnh chạy sau khi môi trường và migration/config được leader review

Chạy từ `D:\ProjectCapstone`:

```powershell
docker version
docker compose version
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Theo dõi liên tục ở hai terminal riêng (Ctrl+C chỉ dừng theo dõi log):

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

Chưa thực thi build/up/log container trong đợt này vì daemon chưa hoạt động. Không dùng `docker compose down -v`, không xóa volume hoặc reset DB để chữa migration. Đảm bảo DATABASE_URL là DB local của Compose, không Supabase, trước bất kỳ seed/migrate/test mutation nào.

### Ma trận runtime Docker còn cần chạy

- Container startup/migration readiness, Swagger, FE page load, CORS/proxy `/api` và referral `/r/`.
- Tracking exact/normalized phone; không leak data khi input quá ngắn; rate limit.
- Review token/ownership, UUID, bounds, double submit/concurrency và reload persistence.
- Webhook từng nguồn, signature, duplicate concurrent, SKU mismatch, trạng thái/refund/replay, currency.
- Manual + Excel nhiều dòng hợp lệ/lỗi, partial success theo order, duplicate, invalid workbook, bounds và locale money.
- Commission multi-item/discount/snapshot, trước/đúng/sau 14 ngày, scheduler chạy lặp, full/partial refund trước/sau approval/rút tiền.
- Withdrawal concurrent với PG15, insufficient funds, rollback, tax 1,999,999.99 / 2,000,000 / 2,000,000.05.
- Ledger reconciliation tất cả bucket/store/global, mutation forbidden bằng application DB role, thử rollback trong từng mutation.
- Payout ownership, private bill upload thật trên tài khoản test được cho phép, lỗi provider, conflict approve/reject/export, download/recovery batch.
- VietQR workbook bằng dữ liệu ngân hàng demo có mapping được review; không thực hiện chuyển khoản thật.

## 9. Chạy lại các artifact QA

Artifact:

- `backend/test/fr17-fr24.qa-probe.cjs`: tạo fixture, probe API/service thật, optionally giữ server cho browser.
- `frontend/tests/fr17-fr24.qa-browser.mjs`: 6 live browser scenarios, đọc fixture từ JSON summary của probe.

Các probe là công cụ tái hiện **hành vi hiện tại**, không thay thế regression assertion đúng/sai. Muốn chặn bug sau sửa phải chuyển case tương ứng thành test expected behavior trong suite chính. Không chạy probe vào DB production/shared; script guard chỉ chấp nhận loopback và database có hậu tố `_test`.

Database test phải được provision schema đầy đủ trước, bao gồm manual SQL FR-19/21 và migrations FR-23/24 đã review. Lệnh ví dụ dùng DB QA cục bộ đã chuẩn bị, không dùng DATABASE_URL trong `.env`:

```powershell
cd D:\ProjectCapstone\backend
npm.cmd run build
$env:WITHDRAWAL_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55432/scanms_fr24_test'
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='modules/(orders|wallets|payouts|commissions)/'
$env:QA_KEEP_SERVER='1'
node test/fr17-fr24.qa-probe.cjs
```

Lấy JSON summary cuối probe, dùng các trường `storeId`, `productId`, `productSku`, `ownerId`, `kolId`, `deliveredOrderId` ở lượt chạy mới. Mỗi lượt tạo fixture khác nhau, không dùng ID cũ.

Terminal frontend thứ nhất:

```powershell
cd D:\ProjectCapstone\frontend
$env:VITE_API_URL='http://127.0.0.1:5184/api'
npm.cmd run dev -- --host 127.0.0.1 --port 5183 --strictPort
```

Terminal frontend thứ hai:

```powershell
cd D:\ProjectCapstone\frontend
$env:WITHDRAWAL_UI_BROWSER_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:WITHDRAWAL_UI_TEST_URL='http://127.0.0.1:5183'
npm.cmd test
# Gán QA_FIXTURE_JSON bằng JSON summary mới của probe, không chứa production secret/token.
$env:QA_FIXTURE_JSON='<JSON summary của lượt probe mới>'
node tests/fr17-fr24.qa-browser.mjs
```

Port 5183/5184 là port QA cô lập, không cấu hình thương hiệu/ngân hàng hard-code trong code nghiệp vụ. Dừng hai server QA bằng Ctrl+C khi kết thúc; giữ data/ledger test để audit. Không chạy test ngoài scope có khả năng dùng DB từ `.env` nếu chưa kiểm tra guard/cleanup.

## 10. Đề xuất thứ tự xử lý

1. Chốt quy tắc snapshot/net commission + refund/clawback (B04–B06, B19), viết regression test trước khi sửa.
2. Khóa lỗ hổng tra cứu/review/webhook (B01–B03), không phá guest UX bằng cách bắt mọi khách tạo tài khoản.
3. Review workflow migration, Docker networking/config (B07/B09/B22), chạy lại trên DB local mới; không tự động chỉnh Supabase.
4. Thêm manual intent idempotency và guard UI (B08), validation/locale money/phone (B15–B17).
5. Chốt state events/receipt timestamp/currency/charges/address (B10–B13/B18/B23), sửa review bounds/design-system (B20/B21).
6. Hoàn tất vòng Docker + storage test thật được phép, reconcile ledger và triage lint trước nghiệm thu.

Các secret đã được đưa vào hội thoại trước đây nên được chủ tài khoản rotate (DB password, JWT, Supabase secret, Cloudinary secret, Google OAuth secret). Không đưa chúng vào báo cáo, commit hoặc log QA. Đợt QA này không tự rotate cấu hình/tài khoản.
