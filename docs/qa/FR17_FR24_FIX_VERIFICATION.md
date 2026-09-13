# FR-17–FR-24 — Sửa lỗi và kiểm chứng Docker

Ngày: 13/09/2026. Base: `origin/dev` tại `dbb0207` (fast-forward từ `395d44b`, cùng nội dung source). Báo cáo này thay thế kết luận trạng thái hiện tại của [vòng QA trước khi sửa](FR17_FR24_QA_REPORT.md).

## 1. Phạm vi sửa

Không xây lại các FR đã hoàn thành; sửa lỗi tìm được và thêm regression. Không thêm thư viện, không tạo CSS. Không kết nối Supabase, không chuyển khoản thật, không upload ra Cloudinary thật. Giữ nguyên thay đổi có sẵn của người dùng trong `frontend/src/index.css`; không đưa file này vào commit sửa lỗi. Git chỉ được push `thinh`, không push hoặc merge remote `dev`.

| Mã lỗi cũ | Bản sửa |
| --- | --- |
| B01, B17 | Tra cứu bằng SĐT chuẩn hóa Việt Nam/exact match, không tìm chuỗi con. Mã đơn exact match; giới hạn kết quả và rate limit. Chỉ tra cứu bằng một yếu tố sẽ che tên/SĐT/địa chỉ. |
| B02, B14, B20 | Review cần token HMAC ngắn hạn gắn với đơn, được cấp sau đối chiếu cả SĐT và mã đơn. UUID, comment trim 5–500 ký tự; lock đơn và unique `(order_id, product_id)` chống review trùng khi concurrent. |
| B03 | Webhook cần `x-webhook-secret` riêng cho từng shop/source, so sánh timing-safe; thiếu cấu hình fail closed. |
| B04, B05 | Engine dùng snapshot hoa hồng có sẵn, không tính lại theo rate sản phẩm mới. Snapshot có marker cho phép tỷ lệ/tiền bằng 0. Đơn chưa snapshot được tính trên giá trị sau giảm giá bằng Decimal. |
| B06, B19 | Hoàn tiền thu hồi commission PENDING từ ví chờ hoặc APPROVED từ ví khả dụng trong transaction. Partial refund kế tiếp tính tỷ lệ theo tiền đơn còn lại, không áp lại tỷ lệ trên commission đã giảm. |
| B07 | Khôi phục SQL trong thư mục migration FR-19 trước đó trống; thêm migration reconcile schema FR-19/21, marker snapshot, mốc sự kiện và unique review. Không tự xóa duplicate review. |
| B08 | Intent UUID của form thủ công + fingerprint payload; retry cùng intent trả cùng đơn, payload khác trả 409. Guard submit đồng bộ ở frontend cho manual/import. |
| B09 | Sửa allowlist cổng FE, Redis host và Vite proxy dùng service backend trong Docker. |
| B10–B13, B23 | Shopify phân biệt fulfilled/shipping/delivered và full refund; nhận currency, phí vận chuyển/thuế; đối chiếu tổng tiền. Chỉ nhận VND, trả 400 với USD. Ghép đầy đủ địa chỉ. Webhook timestamp mới cập nhật trạng thái theo transition, event cũ không ghi đè; không tạo lại item. |
| B15, B16 | Reject boolean thay số, vượt precision/bounds, số lượng vượt Int32, SĐT không hợp lệ. Excel không đổi `1,5` thành 15; báo lỗi theo dòng. Response 500 không lộ Prisma/exception nội bộ. |
| B18 | Mốc đủ điều kiện ưu tiên `completedAt`; không reset ngày nhận đã ghi khi webhook delivered lặp lại. `availableAt` vẫn cách mốc đủ điều kiện 14 ngày. |
| B21 | Các panel/nút trạng thái brand trong hai trang Orders dùng Tailwind warm sand/gold, không emerald làm nền brand. |
| B22 | Hướng dẫn config danh sách ngân hàng VietQR và bổ sung mapping công khai trong `.env` local (không commit `.env`). Mapping BIN/code kiểm tra với [API ngân hàng VietQR chính thức](https://api.vietqr.io/v2/banks). QA dùng ngân hàng giả, không dùng tài khoản thật. |

## 2. Bằng chứng đã chạy

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Docker build FE/BE `--no-cache` | PASS. Node 22 Alpine; backend copy `.npmrc`, `npm ci`, OpenSSL và generate Prisma không cần secret thực. Backend image cập nhật lại sau các sửa typing cuối. |
| Compose QA | Bốn container PostgreSQL 15, Redis 7, NestJS, Vite chạy. Không mount `.env` thật vào QA. |
| Migration | PASS: toàn bộ 15 migration áp vào PostgreSQL QA; lần chạy lại báo `No pending migrations to apply`. Không xác nhận schema Supabase. |
| Backend FR-17–24 Jest trong Docker | **17 suites, 156 tests PASS**, gồm **37 PostgreSQL integration tests**. Đã chạy sau sửa filter và helper refund cuối. Các error log trong test rollback là lỗi chủ động gây ra, không phải test fail. |
| Backend FR-09 unit/integration liên quan refund | **4 suites, 53 tests PASS** trên image Docker cuối; loại trừ suite real-db ngoài phạm vi. Không phải tất cả đều dùng DB thật. |
| Backend build | **PASS** với `npm run build` trực tiếp trong backend Docker cuối; `tsc -p tsconfig.build.json --noEmit` trên host cũng PASS. |
| Lint bốn module Orders/Commissions/Wallets/Payouts + filter | **0 errors, 0 warnings** trong lần chạy cuối. Không tuyên bố lint toàn backend sạch. |
| Frontend build trong Docker | PASS. Bundle khoảng 1.515 kB trước gzip; còn warning chunk lớn. |
| Frontend lint trong Docker | **0 errors, 10 warnings**, chủ yếu dependency của hook trong source hiện có. |
| Frontend test | **16 PASS, 0 SKIP**, gồm hai browser test opt-in chạy Edge headless trên FE Docker. Hai test này mock API để kiểm tra UI. |
| Live Docker regression | **9 check PASS**, đã chạy lại trên image cuối: API thực, transaction/ledger/commission thực và PostgreSQL 15. Có manual concurrent/idempotency, import lỗi dòng, webhook auth/concurrency/status/version/currency/totals, snapshot/discount, approved full clawback, partial 20%+20% còn 60%, CORS. |
| Live browser FE → BE → PostgreSQL Docker | **6 kịch bản PASS**, đã chạy lại trên image cuối: manual double submit, review token/500 ký tự, SĐT +84, withdraw double click/tax, Excel VietQR/net và batch download recovery khi upload bill lỗi. Core Orders/Wallets/Payouts không mock; GET auth/store/product phụ trợ được mock để cô lập fixture UI. |

Lệnh API regression từng bị cơ chế duyệt lệnh từ chối do giới hạn usage. Sau khi người dùng yêu cầu tiếp tục và fetch được duyệt thành công, đã xin duyệt lại qua cùng cơ chế; 9 API checks và 6 browser checks trên image cuối đều PASS. Không dùng workaround để vượt từ chối.

## 3. Chạy lại trên Docker QA riêng

Chạy tại thư mục gốc project; không dùng `down -v`, reset schema hoặc database chung:

```bash
docker compose -p scanms-qa -f docker-compose.qa.yml build --no-cache
docker compose -p scanms-qa -f docker-compose.qa.yml up -d
docker compose -p scanms-qa -f docker-compose.qa.yml exec -T backend npx prisma migrate deploy
docker compose -p scanms-qa -f docker-compose.qa.yml logs --tail=100 backend frontend
docker compose -p scanms-qa -f docker-compose.qa.yml exec -T backend npm run build
docker compose -p scanms-qa -f docker-compose.qa.yml exec -T frontend npm run build
docker compose -p scanms-qa -f docker-compose.qa.yml exec -T -e QA_DOCKER=1 backend node test/fr17-fr24.docker-regression.cjs
```

Đợi backend log compile thành công và HTTP sẵn sàng rồi chạy regression. Lệnh regression in JSON fixture ngẫu nhiên; dùng output mới cho mỗi lần browser test. Runner không nạp `.env`, từ chối host DB khác local/`postgres-db`, yêu cầu DB `_test`, `QA_DOCKER=1` và JWT secret QA.

PowerShell chạy live browser trên máy host có Edge:

```powershell
$env:WITHDRAWAL_UI_BROWSER_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:QA_FIXTURE_JSON = '<JSON fixture từ regression Docker vừa chạy>'
Set-Location frontend
node tests/fr17-fr24.qa-browser.mjs
```

Chạy Jest Docker với PostgreSQL loopback để vượt kiểm tra an toàn của test, không dùng DB thật:

```bash
docker run --rm --network container:scanms-qa-postgres-db-1 -e WITHDRAWAL_TEST_DATABASE_URL=postgresql://postgres:qa-local-only@127.0.0.1:5432/scanms_fr24_test -e DATABASE_URL=postgresql://postgres:qa-local-only@127.0.0.1:5432/scanms_fr24_test --entrypoint node scanms-qa-backend node_modules/jest/bin/jest.js --runInBand --testPathPatterns='modules/(orders|wallets|payouts|commissions)/'
```

Địa chỉ QA: FE `http://127.0.0.1:5183`; BE `http://127.0.0.1:5184/api`; Swagger `/api/docs`. QA không tự seed tài khoản đăng nhập đầy đủ; fixture/script là đường kiểm chứng.

## 4. Việc cần xác nhận trước môi trường dùng chung

- Leader review migration/baseline trước áp vào DB đã có schema thủ công. Nếu có duplicate review, migration dừng và yêu cầu đối soát, không tự delete dữ liệu. Legacy snapshot 0 chưa có marker không thể tự phân biệt với placeholder; không đoán/backfill tiền.
- Provision `ORDER_WEBHOOK_SECRETS` trong môi trường triển khai, dạng JSON key `<store UUID>:<shopee|tiktok|shopify>`, mỗi giá trị secret riêng tối thiểu 32 ký tự. Client adapter gửi `x-webhook-secret`. Đây là authentication cho gateway/adapter của đồ án, **không phải** triển khai signature native đầy đủ của ba nền tảng. Chưa thử webhook tài khoản sàn staging.
- Webhook không có timestamp vẫn idempotent nhưng không tự áp event đổi trạng thái. Partial refund từ sàn cần đối soát số tiền qua luồng refund; không tự chuyển tất cả partial-refunded thành hoàn toàn bộ. SĐT mask/quốc tế ngoài VN cần rule adapter riêng trước tích hợp tài khoản thật.
- Review xác minh SĐT + mã đơn là mức phù hợp demo guest, không tương đương OTP/xác minh danh tính mạnh. Cần nâng cấp nếu triển khai thực tế.
- Cloudinary private bill thành công mới được kiểm bằng storage fake trong integration test; live browser chỉ kiểm lỗi storage và khả năng retry. Chưa xác nhận upload/signed download provider thật hoặc ngân hàng chấp nhận file lô thực tế. VietQR Excel của đồ án không được coi là format import chung cho mọi ngân hàng.
- Các thao tác rút/duyệt/export đã được regression; không tạo chuyển khoản thật. Test thuế chỉ xác nhận quy tắc đồ án 10% khi gross từ 2 triệu, không phải kết luận pháp lý.
- Còn lỗi lint cũ trong `commission-rules` ngoài block refund vừa sửa. `tsc --noEmit` toàn bộ (kể cả test ngoài scope) còn lỗi type fixture cũ; build production và test scope là các kiểm tra riêng. Không tự đổi dependency ngoài phạm vi: `npm ci` báo BE 15 vulnerabilities (11 high), FE 4 high.
- `.env` chứa secret đã xuất hiện trong hội thoại cần được chủ dự án rotate. Không commit secret hay tự reset credential.

## 5. Handoff Git

Đã đồng bộ local với `origin/dev` trước sửa và fetch lại sau khi hoàn tất regression; `HEAD` và `origin/dev` đều tại `dbb0207`, không có conflict. Nhánh làm việc: `thinh/fr-24-payout-approval-vietqr`; remote đích được phép là `thinh`. Commit dùng tiếng Anh; không force push, không push hoặc merge remote `dev`. SHA và kết quả push được xác nhận ở phần bàn giao cuối, không suy ra từ báo cáo này.

Probe lịch sử `backend/test/fr17-fr24.qa-probe.cjs` được giữ local, không đưa vào commit regression mới. Script Docker mới là đường kiểm chứng phiên bản đã sửa.
