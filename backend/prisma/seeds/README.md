# Bộ dữ liệu Capstone SCANMS

Entry point vẫn là `backend/prisma/seed.ts`, được gọi bằng `npx prisma db seed` theo `prisma.config.ts`. Các module trong thư mục này chỉ xây dựng fixture và ghi dữ liệu qua Prisma; không thay thế controller/service của ứng dụng.

Phiên bản hiện tại là **`scanms-capstone-2026-v3`**. UUID tài khoản/sản phẩm được giữ ổn định theo namespace v1, không sinh tài khoản trùng khi nâng phiên bản. Nếu DB đã có manifest v1/v2, lệnh apply/check dừng rõ ràng; không tự cập nhật manifest hoặc ghi đè tiến độ test. Dùng `seed:audit` để đối chiếu trước khi nhóm quyết định dựng lại DB. Không chạy reset DB nhóm khi lịch sử migration chưa được đối soát và chưa được phê duyệt.

`prisma/seed-runner.cjs` nạp ts-node của chính dự án và `tsconfig.seed.json`, giúp lệnh Prisma chạy được cả khi terminal/CI không có `node_modules/.bin` trên PATH. Nếu PowerShell chặn các shim `.ps1`, dùng `npm.cmd` và `npx.cmd` cho các câu lệnh bên dưới.

## Cập nhật nghiệm thu mới nhất — 18/10/2026

- Đã nâng cấp bổ sung, **không reset/seed lại** DB nhóm: 30 sản phẩm seed có cột barcode/kiện hàng, 20 hồ sơ tham khảo KOL và hai booking tài trợ TEST miễn phí. Chỉ điền cột NULL trên sản phẩm fixture; số đo đã sửa và tài khoản đã đổi tên được bảo toàn. Không đổi mật khẩu, tồn kho, đơn, ví, ledger hoặc payout.
- Tên/kênh công khai có nguồn tại [KOL_PUBLIC_REFERENCES.md](../../../docs/KOL_PUBLIC_REFERENCES.md). Tài khoản có hậu tố `· TEST`, kênh “tham khảo”, avatar trung tính; follower/tier/KYC/ngân hàng vẫn là fixture, không mạo nhận KOL thật đã đăng ký. Thông số sản phẩm seed là fixture 500 g / 20×15×10 cm và EAN nội bộ, không phải kết quả đo hoặc mã GS1 của nhãn hàng.
- Hai gói tài trợ trong DB là `PLATFORM_GRANT`, số tiền 0, tiêu đề `[TEST]`, có ngày bắt đầu/kết thúc; không có chứng từ hoặc giao dịch quảng cáo giả. Chạy lại seed/enrichment không gia hạn hoặc khôi phục booking tester đã hủy.
- Máy phát triển đã chủ động bật `SHIPPING_SIMULATION_ENABLED=true` và `RETURN_PICKUP_SIMULATION_ENABLED=true` để test GHN TEST/Staging không gửi kiện thật. `.env.example` vẫn mặc định tắt; production luôn chặn mô phỏng. Không bật tự điền đăng nhập hoặc đổi DATABASE_URL.
- Audit DB nhóm: `datasetReady=true`, `schemaHistoryReady=true`, lệch ví/Shop/chat/pin bằng 0; thiếu package 0, URL `.invalid` 0, Shop tài trợ đang hiệu lực 2. Số phiên đang LIVE vẫn 0: phải phát nội dung qua quy trình Live, không tự sửa enum hoặc giả người xem. Giao dịch ngân hàng/PayOS và vận chuyển vật lý vẫn phải nghiệm thu riêng.

### Bổ sung cho DB v3 đã có dữ liệu tester

```powershell
npm.cmd run seed:enrich:plan
# Chỉ sau khi kiểm tra đúng target và kế hoạch, dùng fingerprint được in bởi --plan:
$env:SCANMS_SEED_ENRICH_CONFIRM = '<fingerprint của DB phát triển/test>'
npm.cmd run seed:enrich
npm.cmd run seed:audit
```

`prisma/enrich-seed.ts` không nhận tùy chọn reset và từ chối production. Transaction khóa nâng cấp/booking, so sánh lại các trường đã đọc để tránh ghi đè đồng thời; thay đổi và bản chụp các trường trước nâng cấp lưu chung trong audit `CAPSTONE_ADDITIVE_ENRICHMENT`. Marker phiên bản giúp chạy lặp trả `unchanged`. Đây không phải công cụ nhập thông số vật lý hoặc xác minh danh tính thật.

## Biên bản reset ban đầu ngày 18/10/2026 (lịch sử)

Sau xác nhận riêng của Thịnh và sau khi backup mới được phục hồi kiểm chứng, schema `public` của DB phát triển nhóm đã được reset và seed v3. `npx prisma db seed`, `seed:check`, `seed:audit` và lần chạy lại seed đều thành công; đủ 61 migration, không lỗi foreign key hoặc lệch ví/ledger. Backend vẫn dùng `backend/.env` của nhóm, không chuyển sang DB local. Chi tiết backup, kết quả HTTP và giới hạn nghiệm thu tại `docs/THINH_DATABASE_HANDOFF.md` ở gốc repo.

**Tài khoản cũ trong `public` không còn.** Đăng xuất phiên cũ và dùng các email seed bên dưới. Mật khẩu demo ngẫu nhiên của lần chạy này nằm trong file riêng `seed-access.json` cạnh backup; `.dev-runtime/current-public-rebuild.json` trỏ tới biên bản chứa đường dẫn file đó. Không commit hoặc chia sẻ công khai thông tin truy cập. Hai placement tài trợ `[DEMO]` từng được cấp trong phiên backend kiểm tra đã tắt theo yêu cầu kiểm thử không demo; không ghi `.env` hoặc đại diện giao dịch thật.

Phiên kiểm thử hiện tại dùng FE → API → PostgreSQL của nhóm, không bật đăng nhập tự điền, placement DEMO hoặc giả lập giao vận. Không seed/reset/restore lại khi tester tự tạo dữ liệu mới trên web. `RETURN_PICKUP_PROVIDER` mặc định `disabled`, chỉ tạo mock khi đặt rõ `mock` ở môi trường không production. `SHIPPING_SIMULATION_ENABLED` mặc định tắt; credential GHN TEST không tự bật đồng hồ/shipper giả hoặc thanh toán cước giả lập. Khi thiếu credential dịch vụ, hiển thị lỗi chưa cấu hình, không biến dữ liệu synthetic thành giao dịch thật. Không tự gọi tạo vận đơn LIVE hoặc thanh toán thật để kiểm thử.

Sau khi chủ dự án cung cấp cấu hình dịch vụ, đã bổ sung các khóa còn thiếu vào **`backend/.env` riêng, bị Git bỏ qua**, giữ nguyên DB/JWT và các cấu hình đang hoạt động. Phiên hiện tại đặt `RETURN_PICKUP_PROVIDER=staging`, dùng chung cặp `GHN_TEST_API_TOKEN/GHN_TEST_SHOP_ID`, vẫn tắt mô phỏng. Đọc danh mục tỉnh trực tiếp GHN sandbox thành công; PayOS availability chỉ xác nhận cấu hình đã nạp, **không chứng minh giao dịch đã được thanh toán**. Không seed lại để áp dụng cấu hình và không tự đổi fixture cũ thành giao dịch thật.

Đã kiểm tra HTTP bốn vai trò và tải ảnh catalogue; chưa kiểm tra trực quan vì chưa có trình duyệt kết nối. Sau lần seed 61 migration, đã triển khai thêm hai migration **cộng thêm**, nâng lên 63; không seed/reset lại và không mất tài khoản tester mới tạo. Barcode/kiện hàng và đăng ký/duyệt tài trợ đã có API/UI. GHN TEST/PayOS, video LIVE và thông số bao bì thực tế vẫn cần người nghiệm thu thao tác. Xem `docs/THINH_ACCEPTANCE_WEB.md`.

## Phạm vi dữ liệu

| Nhóm                 | Số lượng | Ràng buộc chính                                                                                 |
| -------------------- | -------: | ----------------------------------------------------------------------------------------------- |
| Shop                 |       15 | Mỗi Shop có một chủ riêng, hồ sơ duyệt, kho giao/nhận trả, chính sách, thông tin ngân hàng demo |
| Creator              |       20 | 5 Đồng, 7 Bạc, 5 Vàng, 3 Kim Cương; có hồ sơ, kênh và địa chỉ                                   |
| Khách                |       30 | Có tài khoản CUSTOMER và địa chỉ mặc định đầy đủ ba cấp                                         |
| Sản phẩm             |       30 | Hai sản phẩm/Shop, giá nền và hoa hồng 10%, quota mẫu 8–20                                      |
| Biến thể             |      120 | Hai dung tích/khối lượng × hai kiểu đóng gói; tổng tồn bằng tồn sản phẩm                        |
| Đơn hàng             |       60 | Hai đơn/khách; có PENDING, SHIPPING, DELIVERED, COMPLETED, RETURN_REQUESTED                     |
| Đánh giá             |       66 | 2–3 đánh giá/sản phẩm, đều gắn với đơn COMPLETED chứa đúng sản phẩm                             |
| Hàng mẫu             |       20 | Năm hồ sơ mỗi trạng thái PENDING, SHIPPED, RECEIVED, COMPLETED                                  |
| Live                 |        5 | Hai phòng LIVE, ba phòng ENDED; có sản phẩm, voucher và governance.pinnedProductId hợp lệ     |
| Hội thoại / tin nhắn | 50 / 100 | Khách–Shop và KOL–Shop; có thẻ sản phẩm, thẻ đề xuất deal                                       |
| Thông báo            |      160 | 60 thông báo đơn hàng và 100 thông báo chat; ID/read-state khớp tin nhắn để đọc chat hạ chuông |
| Voucher              |       70 | 15 Shop, 20 KOL, 5 Live, 15 tiền hàng sàn, 15 phí ship; counter/budget đối soát cả hai bảng redemption |
| Mã đã lưu            |       30 | Mỗi Customer lưu một voucher sàn; khóa kép user/coupon                                        |
| Cước gửi mẫu         |       15 | TEST, Shop chịu phí, COD 0; amount NULL/PENDING_CONFIRMATION vì chưa có chứng từ GHN thật      |
| Đổi trả              |        6 | Có ảnh/video, hồ sơ chờ duyệt hoặc được duyệt để tiếp tục test lấy hàng                         |
| Ví / bút toán        | 66 / 212 | Tách AVAILABLE/PENDING; số dư tính từ lịch sử, không tự gán tiền không có nguồn                 |
| Payout               |        2 | Gross 2.000.000đ, thuế 200.000đ, net 1.800.000đ; dùng PayoutTaxService hiện tại                 |

Bốn đơn mua số lượng lớn tạo nguồn hoa hồng đủ cho hai payout. Đơn hoàn tất đã qua 14 ngày từ lúc giao. Các đơn đang giao/đang đổi trả giữ hoa hồng trong PENDING. Tiền nạp ví khách và thanh toán đơn được ghi thành bút toán riêng theo hợp đồng của WalletsService.

## Cấu trúc

- `data/`: danh mục Shop/sản phẩm, danh sách tên giả lập, địa chỉ GHN.
- `identity.seed.ts`, `catalog.seed.ts`, `marketing.seed.ts`, `orders.seed.ts`, `samples.seed.ts`, `finance.seed.ts`: dựng dữ liệu theo miền nghiệp vụ, không truy cập DB.
- `build-dataset.ts`: điều phối dựng fixture; `validate-dataset.ts`: kiểm tra quan hệ, tiền, thời gian, trạng thái.
- `seed.database.ts`: kiểm tra schema thực tế, ghi theo thứ tự khóa ngoại trong một transaction, kiểm tra ID đã lưu và ghi manifest vào audit log.
- `inventory.seed.ts`: ghi tồn đầu kỳ đối ứng số lượng đã bán/giữ chỗ và cấp mẫu vào audit manifest; tồn cuối bằng tồn đầu trừ các lượng xuất đó.
- `seed.config.ts`, `reset-database.ts`: đọc/validate input, định danh DB đích và quy trình reset môi trường phát triển.
- `tests/`: unit test nghiệp vụ và integration test PostgreSQL với migration thật.

## Chạy và kiểm tra

Chạy từ `backend` bằng Node/npm của dự án:

```powershell
npm ci
npx prisma generate
npm run seed:typecheck
npm run test:seed
npm run seed:plan
```

`seed:plan` dựng và kiểm tra toàn bộ fixture, in số lượng và tên DB đích đã loại mật khẩu; không kết nối/ghi database. Seeder chọn `DIRECT_URL` khi có, nếu không chọn `DATABASE_URL`, giống `prisma.config.ts`. Không cần đổi `.env` sang database khác để chạy ứng dụng.

Sau khi kiểm tra DB đích và migration của nhóm:

```powershell
$env:SCANMS_SEED_PASSWORD = 'MatKhauDemoTuChon2026!'
npx prisma db seed
npm run seed:check
```

Ví dụ mật khẩu trên chỉ dùng để minh họa câu lệnh; tự đặt mật khẩu demo trong môi trường chạy. Script không ghi mật khẩu ra log. Không chạy seed demo trong `NODE_ENV=production`.

Lần đầu, toàn bộ INSERT và audit manifest cùng nằm trong một transaction. Nếu lỗi bất kỳ bảng nào, tất cả INSERT rollback. Khi manifest đã tồn tại, chạy lại trả về `unchanged`: không đổi mật khẩu, tồn kho, trạng thái trả hàng hay tin nhắn đã test. Advisory lock giúp hai tiến trình seed đồng thời không sinh trùng. Email, slug và mã fixture có namespace riêng; dữ liệu của thành viên khác được giữ khi seed bổ sung.

`seed:check` là kiểm tra chỉ đọc: schema thực tế và sự hiện diện của các ID fixture. Nó không ép dữ liệu đã được tester thao tác trở lại trạng thái ban đầu. Kiểm tra đầy đủ tính đúng của snapshot ban đầu nằm trong unit/integration test.

`npm run seed:audit` không cần mật khẩu demo: chạy trong transaction **READ ONLY / REPEATABLE READ**, báo phiên bản đã cài, toàn bộ số lượng ID fixture, đối soát AVAILABLE/PENDING theo ledger và ví từng Shop, liên kết thông báo chat, lịch sử migration. Không in họ tên, CCCD, tài khoản ngân hàng, mật khẩu hay URL kết nối đầy đủ. Mã thoát 2 báo kiểm tra đã chạy nhưng snapshot/lịch sử chưa đạt; `fullUpgradeReady=false` vẫn được giữ khi các hợp đồng Tuấn/Quý chưa được nghiệm thu. Đây không phải lệnh sửa hoặc tự reset DB.

Migration `20261016120000_seed_schema_alignment` bổ sung cột avatar và các giá trị enum đã có trong schema/code nhưng thiếu trong lịch sử migration cũ. Các câu lệnh đều có `IF NOT EXISTS`; dữ liệu hiện có được giữ. Nhóm cần rà soát và deploy migration này trước khi dựng lại DB mới.

## Reset dữ liệu cũ

DB hiện có trigger chặn UPDATE, DELETE và TRUNCATE trên `financial_ledgers`. Vì vậy reset dùng quy trình chuẩn `prisma migrate reset --force` để dựng lại schema cùng toàn bộ migration/trigger; không vô hiệu hóa trigger bất biến trong ứng dụng.

Trước khi gọi Prisma reset, script mở kết nối chỉ đọc để đối chiếu các migration đã áp dụng. Thiếu file SQL trong repo, khác nội dung SQL hoặc migration chưa hoàn tất đều **chặn reset**, kể cả có backup và confirmation. Khác biệt CRLF/LF được báo riêng. Không sửa checksum trong DB hoặc tự dựng SQL thay thế để vượt qua chốt này. DB mới hoàn toàn dùng migration deploy trước, không cần reset.

Reset xóa dữ liệu trong schema đích và dựng lại lịch sử migration. Bước reset không thể rollback bằng transaction INSERT sau đó. Chỉ thực hiện sau khi nhóm thống nhất DB dùng demo và có bản sao lưu.

1. Sao lưu bằng `pg_dump` bằng tài khoản được nhóm cấp; lưu bản backup ngoài Git.
2. Chạy `npm run seed:plan`, kiểm tra `target` và lấy `resetConfirmation`.
3. Thiết lập các biến của đúng phiên terminal rồi chạy:

```powershell
$env:SCANMS_SEED_PASSWORD = 'MatKhauDemoTuChon2026!'
$env:SCANMS_SEED_RESET_CONFIRM = '<resetConfirmation của đúng target>'
$env:SCANMS_SEED_BACKUP_FILE = '<đường dẫn tuyệt đối tới file pg_dump đã sao lưu>'
npx prisma db seed -- --reset
npm run seed:check
```

Đích remote bắt buộc có file backup khác rỗng. Người chạy cần kiểm tra backup hợp lệ và có thể phục hồi trước khi reset. Fingerprint gắn với hostname, port, database và schema; xác nhận của một DB không dùng được cho DB khác. Seeder không tự áp migration cho chế độ seed bổ sung; nếu schema thiếu cột, lệnh dừng và báo các cột thiếu trước khi INSERT.

## Tài khoản và kịch bản kiểm thử

- Admin: `admin@seed.scanms.test`.
- Shop: `shop01@seed.scanms.test` đến `shop15@seed.scanms.test`, tương ứng thứ tự trong `data/catalog.data.ts`.
- KOL: `kol01@seed.scanms.test` đến `kol20@seed.scanms.test`.
- Khách: `customer01@seed.scanms.test` đến `customer30@seed.scanms.test`.
- Mật khẩu: giá trị `SCANMS_SEED_PASSWORD` tại lần seed đầu.
- Payout có thuế: đăng nhập Shop 01/02 và KOL 01/02.
- Hồ sơ đã duyệt để test lấy hàng: Khách 05, Shop 08. Hồ sơ chờ duyệt: Khách 10, Shop 13.
- Định danh khách được lưu trong bảng `customer_identities` sau migration `20261016140000_customer_identity_storage`; seeder không tự xác minh danh tính khách demo. Khách mới cần khai báo theo giao diện hiện có trước khi thanh toán mới. Dữ liệu JSON cũ cần import riêng có xác nhận theo `docs/CUSTOMER_AUTH_IDENTITY_HARDENING.md`; đây là tự khai báo, không thay thế KYC.

Các phòng LIVE là fixture có thời hạn, chưa tự phát video: KOC vẫn phải bắt đầu phiên phát qua tính năng hiện có. Không tạo người xem ảo trong phòng LIVE. Log người xem ở phòng ENDED là lịch sử demo lưu trong DB. Chạy seed lại giữ trạng thái đang test; muốn dựng lại mốc thời gian demo cần reset có xác nhận.

## Nguồn dữ liệu và bằng chứng Sandbox

Tài khoản, SĐT, CCCD, mã số thuế, STK, lượt follower và giao dịch là dữ liệu giả lập. Tên thương hiệu trong kế hoạch được dùng làm ví dụ, không chứng minh các thương hiệu là đối tác đã đăng ký. Tên hoạt động/kênh công khai của KOL hiện dùng làm tham khảo có nguồn và nhãn TEST; không phải xác minh quyền sở hữu hay hợp tác.

Ảnh sản phẩm/creator tái sử dụng tài nguyên đã có trong repository. Nguồn ảnh sản phẩm được ghi ở `frontend/public/assets/products/real/README.md`; bao bì ảnh có thể mang nhãn hiệu khác tên catalogue demo, đã được chú thích trong mô tả. Bốn logo Shop dùng asset sẵn có; các logo còn lại là wordmark SVG minh họa màu vàng be tại `frontend/public/assets/seed/shops/`. Ảnh chứng từ payout ghi rõ là minh họa, không phải biên lai ngân hàng.

EAN-13 fixture dùng prefix nội bộ `20` và checksum hợp lệ, không phải mã GS1 của nhà sản xuất. Schema/API hiện có các cột `barcode`, `packageWeight` (gram), `packageLength/Width/Height` (cm). Seeder mới ghi cả các cột riêng và nhãn nguồn fixture; khối lượng/kích thước fixture không phải kết quả đo thật. Migration giữ NULL cho sản phẩm cũ, không tự gán thông số giả: Shop cập nhật theo bao bì thực tế trước khi checkout. Mã tỉnh/huyện/xã trong `data/addresses.data.ts` đã đối chiếu ba API master-data GHN ngày 16/10/2026, cho Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ. Địa chỉ số nhà và người nhận vẫn là fixture.

Mặc định tracking mang tiền tố `DEMO-`, `ghnIsReal=false`, payment/bank reference mang tiền tố `DEMO-`; không có cuộc gọi tạo vận đơn, trừ tiền hay gửi email/SMS. Bản v3 dùng cước lịch sử mô phỏng 24–33 nghìn đồng khi chưa có export sandbox, được đánh dấu `shippingFeeSource=SYNTHETIC_DEMO`; không phải báo giá GHN thật.

Có thể nhập bằng chứng GHN sandbox qua `SCANMS_SEED_GHN_FIXTURES`, trỏ tới file JSON ngoài Git:

```json
[
  {
    "orderKey": "customer-2-order-2",
    "environment": "sandbox",
    "provider": "GHN",
    "orderCode": "<mã GHN sandbox thực tế>",
    "fee": 25000,
    "status": "transporting",
    "capturedAt": "2026-10-16T05:00:00.000Z",
    "evidenceFile": "<file response GHN đã lưu làm bằng chứng>"
  }
]
```

Đây là cấu trúc nhập, không phải bằng chứng đã gọi GHN thật. `evidenceFile` được tính tương đối từ file manifest (hoặc là đường dẫn tuyệt đối), phải là file JSON response tạo đơn của GHN có `code=200`, `data.order_code` và `data.total_fee` khớp export. Seeder kiểm tra trạng thái export phù hợp với đơn được seed. Chỉ đưa export thực tế vào file; seeder không sinh mã GHN thật từ chuỗi ngẫu nhiên. Payment WALLET và hai payout là demo, không được mô tả với hội đồng là đối soát PayOS/ngân hàng thật. Test E2E qua PayOS/GHN sandbox cần chạy riêng qua API ứng dụng và lưu bằng chứng.

## Đồng bộ Marketplace của Quý

Đã tích hợp nhánh `quy` tại `3f71c54` vào nhánh làm việc `thinh`. Lần fetch trước khi push ngày 17/10/2026 xác nhận `origin/dev` tại `78125bc` đã có PR #93 của Quý (kèm refactor `5ccf00d`); không tự merge PR thay thành viên khác.

- `GET /stores/marketplace` đọc rating/reviewCount và campaign đang hiệu lực từ DB; seeder cung cấp 15 Shop, 30 sản phẩm, 66 review và 15 campaign để kiểm tra dữ liệu thật, không gán số 4.9 giả.
- `GET /live-sessions/public/list` đọc sản phẩm ghim từ `governance.pinnedProductId`. Seeder gán pin đúng thành viên/Shop cho năm phiên; hai phiên LIVE không có viewer giả. KOC vẫn cần bắt đầu phát video thực tế.
- `GET /stores/public/placements` hiện ưu tiên booking đã duyệt/còn hạn trong bảng `sponsored_placements`, chỉ hiển thị Shop còn đủ điều kiện. Cấu hình legacy `MARKETPLACE_SPONSORED_PLACEMENTS` vẫn tương thích nhưng phiên nghiệm thu đặt `[]`. Shop đăng ký tại `/merchant/settings`; quản trị duyệt tại `/admin/affiliate-oversight?tab=sponsorship`. Gói miễn phí phải ghi rõ sàn cấp, gói thu phí bắt buộc mã đối soát/chứng từ đã kiểm tra.
- Seeder hiện tạo hai booking trong DB với nhãn `[TEST]`, funding `PLATFORM_GRANT`, số tiền 0; không có mã/chứng từ thanh toán giả và không gọi nhà cung cấp. Với DB v3 đã có dữ liệu, dùng enrichment có kiểm tra target thay vì reset/seed lại. Chạy lặp không gia hạn booking hoặc khôi phục booking đã hủy.
- Hàm tạo cấu hình legacy được giữ để tương thích/test; trạng thái `CONFIRMED` của cấu hình đó không chứng minh Shop đã trả tiền. Phiên nghiệm thu không sử dụng cấu hình này và script không ghi `.env`. `seed:audit` báo riêng khoảng trống nghiệm thu; không đưa credential vào Git.
- Popup đăng nhập nhanh mới của Quý được giữ tương thích email/SĐT khi đăng nhập; đăng ký và nhận OTP vẫn dùng email. Giỏ hàng không được reset khi đổi luồng xác thực.

## Đồng bộ contract Tuấn trên dev ngày 18/10/2026

Nhánh `thinh` đã đồng bộ `origin/dev` tại `da44661` (PR #95/#97); thay đổi v3 đã push trong commit `f448155`.

- Hoa hồng dùng `commission-policy.ts` và `exclusive-deal-bonus.ts` của checkout: nền 10 + Tier + VIP + Campaign + Live, chặn trần 25%, tính trên Net GMV. VIP vẫn lưu 12 trong proposal để thể hiện +2; Live lưu 2, không lưu 12. Đơn lịch sử dùng thời điểm mua để kiểm tra hiệu lực. Chỉ tái dựng trạng thái LIVE của phiên ENDED trong đúng cửa sổ lịch sử, không phục hồi Live bị hủy/tạm dừng.
- Campaign có ngân sách, participant ACCEPTED, link chiến dịch, snapshot phần thưởng và `bonusBudgetUsed` khớp phần đã giữ. Lịch sử sáu đơn chứa Live đã kết thúc; đơn thứ hai phân bổ thêm năm Creator, bao gồm Kim Cương.
- Dùng `priceVoucherLines` của checkout để phân bổ giảm tiền hàng. Voucher Shop/KOL, voucher sàn GOODS và voucher SHIPPING được lưu riêng; chỉ một mã mỗi nhóm trên một đơn. `couponDiscountAmount` chỉ chứa giảm tiền hàng; `discountAmount` chứa cả giảm ship. Hoa hồng không bị giảm bởi freeship.
- Cước đơn mua lấy từ export sandbox nếu có, kể cả cước 0 thật. Khi chưa có export, dùng số tiền lịch sử **mô phỏng** 24–33 nghìn đồng và `shippingFeeSource=SYNTHETIC_DEMO`, `ghnIsReal=false`, `ghnTotalFee=null`. Đây không phải thuật toán báo giá GHN và không được dùng cho checkout thật. Seed không gọi GHN hoặc tạo vận đơn.
- Đơn mẫu có `ghnProvinceId`, `ghnDistrictId`, `ghnWardCode` khớp sổ địa chỉ. Mười lăm khoản cước mẫu TEST chỉ thể hiện trách nhiệm Shop; chưa có số tiền/chứng từ, không ghi thành đã thanh toán và không trừ ví.
- Thêm writer, kiểm tra ID khóa kép, kiểm tra ngân sách/funding/ownership trong transaction seed cho `StackedVoucherRedemption`, `CustomerSavedCoupon`, `SampleShippingCharge`.
- Cột barcode/kiện hàng đã được bổ sung bằng migration `20261018040000_product_shipping_metadata`; booking tài trợ bằng `20261018041000_sponsored_placements`. Lịch sử thiếu/khác SQL đã được xử lý trong lần dựng DB được phê duyệt trước đó, không còn là blocker hiện tại. Các ghi nhận lịch sử được giữ tại `docs/THINH_DATABASE_HANDOFF.md`; không đổi checksum hoặc chép migration trùng để chạy lại.

Chỉ dữ liệu đã có chức năng thật được ghi vào schema. Audit báo riêng `acceptanceGaps` (thiếu bao bì, kênh placeholder, Live đang hiệu lực, tài trợ được duyệt, phản hồi hãng vận chuyển). `fullUpgradeReady=false`/`manualAcceptanceRequired=true` nhắc rằng kiểm tra tự động không chứng nhận danh tính, thanh toán, video phát hay giao hàng vật lý. Không tự bật quảng cáo demo hoặc seed lại để làm đẹp số liệu.

## Integration test PostgreSQL

Unit test luôn chạy độc lập. Integration test chỉ chạy khi có `SEED_TEST_DATABASE_URL`; nó từ chối mọi đích ngoài `localhost/127.0.0.1:55433/scanms_seed_test`. Mỗi test tạo một schema mới, chạy toàn bộ migration thật và giữ nguyên schema cũ. Test không gọi reset/drop/delete và không vô hiệu hóa trigger tài chính. Các schema này chỉ thuộc DB kiểm thử bỏ đi, không trỏ DB làm việc của nhóm.

```powershell
$env:SEED_TEST_DATABASE_URL = 'postgresql://<test_user>:<test_password>@127.0.0.1:55433/scanms_seed_test'
npm run test:seed
```

Các ca kiểm tra gồm rollback khi lỗi khóa ngoại cuối transaction, số lượng và đối soát ledger, chạy lại bảo toàn tiến độ, seed đồng thời, giữ dữ liệu ngoài fixture và trigger bất biến. Unit test kiểm tra các chốt xác nhận/backup trước reset. Việc thực thi reset vẫn cần người vận hành xác nhận, đặc biệt khi Prisma chặn lệnh reset do được gọi từ AI. Test không sửa `.env` và không đổi database mà backend sử dụng khi chạy ứng dụng.

Bản v2 bổ sung test dữ liệu ngân hàng/kho/chính sách Shop, kênh KOL, phân bổ đơn từng khách, ảnh đánh giá, thông báo chat; test READ ONLY audit, phát hiện lệch số dư/thiếu fixture, từ chối ghi lên v1, và luồng thực tế `prisma db seed → --check → seed lại → --audit`. Test dùng ChatService thật để xác nhận đọc tin mẫu đồng bộ Notification.

Kiểm thử tích hợp Marketplace của Quý dùng cùng DB test cô lập, chạy từ `backend`:

```powershell
$env:SEED_TEST_DATABASE_URL = 'postgresql://<test_user>:<test_password>@127.0.0.1:55433/scanms_seed_test'
node node_modules/jest/bin/jest.js --runInBand src/modules/stores/marketplace-seed.postgres.integration.spec.ts
```

Bộ test gọi HTTP thật của Stores/Live controllers, đọc fixture đã seed bằng Prisma; kiểm tra rating có trọng số/không có review, hai placement hợp lệ/hết hạn/chưa xác nhận, viewer thật bằng 0, pin lưu bền và chặn Customer/Shop khác. Chỉ process test đặt biến cấu hình placement và khôi phục sau test; không dùng `.env`/DB nhóm cho các request này.
