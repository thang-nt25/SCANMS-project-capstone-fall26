# Bộ dữ liệu Capstone SCANMS

Entry point vẫn là `backend/prisma/seed.ts`, được gọi bằng `npx prisma db seed` theo `prisma.config.ts`. Các module trong thư mục này chỉ xây dựng fixture và ghi dữ liệu qua Prisma; không thay thế controller/service của ứng dụng.

Phiên bản hiện tại là **`scanms-capstone-2026-v3`**. UUID tài khoản/sản phẩm được giữ ổn định theo namespace v1, không sinh tài khoản trùng khi nâng phiên bản. Nếu DB đã có manifest v1/v2, lệnh apply/check dừng rõ ràng; không tự cập nhật manifest hoặc ghi đè tiến độ test. Dùng `seed:audit` để đối chiếu trước khi nhóm quyết định dựng lại DB. Không chạy reset DB nhóm khi lịch sử migration chưa được đối soát và chưa được phê duyệt.

`prisma/seed-runner.cjs` nạp ts-node của chính dự án và `tsconfig.seed.json`, giúp lệnh Prisma chạy được cả khi terminal/CI không có `node_modules/.bin` trên PATH. Nếu PowerShell chặn các shim `.ps1`, dùng `npm.cmd` và `npx.cmd` cho các câu lệnh bên dưới.

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

Họ tên, tài khoản, SĐT, CCCD, mã số thuế, STK, lượt follower và giao dịch là dữ liệu giả lập. Tên thương hiệu trong kế hoạch được dùng làm ví dụ, không chứng minh các thương hiệu là đối tác đã đăng ký. Kênh mạng xã hội dùng miền `.invalid` để không giả mạo hồ sơ cá nhân thật.

Ảnh sản phẩm/creator tái sử dụng tài nguyên đã có trong repository. Nguồn ảnh sản phẩm được ghi ở `frontend/public/assets/products/real/README.md`; bao bì ảnh có thể mang nhãn hiệu khác tên catalogue demo, đã được chú thích trong mô tả. Bốn logo Shop dùng asset sẵn có; các logo còn lại là wordmark SVG minh họa màu vàng be tại `frontend/public/assets/seed/shops/`. Ảnh chứng từ payout ghi rõ là minh họa, không phải biên lai ngân hàng.

EAN-13 dùng prefix lưu hành nội bộ `20` và checksum hợp lệ, không phải mã GS1 của nhà sản xuất. Schema hiện chưa có cột barcode/khối lượng/kích thước nên các thông tin này được trình bày bằng văn bản trong `labelInfo`; không thêm field ngầm vào API. Mã tỉnh/huyện/xã trong `data/addresses.data.ts` đã đối chiếu trực tiếp ba API master-data GHN ngày 16/10/2026, cho Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ. Địa chỉ số nhà và người nhận vẫn là fixture.

Mặc định tracking mang tiền tố `DEMO-`, `ghnIsReal=false`, payment/bank reference mang tiền tố `DEMO-`; không có cuộc gọi tạo vận đơn, trừ tiền hay gửi email/SMS. Phí ship mặc định 0 để tương thích policy hiện tại trên `dev`.

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
- `GET /stores/public/placements` dùng `MARKETPLACE_SPONSORED_PLACEMENTS`, không có bảng/cột sponsorship riêng để INSERT. `npm run seed:plan` xuất `marketplaceDemo` gồm đúng hai Shop được chọn bằng UUID fixture, thời gian hiệu lực và headline `[DEMO]`.
- Cấu hình trên là **fixture cho demo, không phải bằng chứng Shop đã thanh toán**. Trạng thái `CONFIRMED` chỉ mô phỏng contract bộ lọc trong môi trường test. Không dùng làm booking trả tiền thật. Script không ghi `.env`, không kích hoạt quảng cáo, không gọi thanh toán và không tự đặt biến môi trường của backend đang chạy.
- Khi nhóm quyết định chạy demo, người vận hành kiểm tra target/referenceDate và cấu hình JSON hai placement trong **môi trường demo đã được duyệt**, sau đó restart backend. Không đưa thông tin thanh toán/credential vào Git. `seed:audit` báo riêng thiếu cấu hình triển khai, không tự sửa.
- Popup đăng nhập nhanh mới của Quý được giữ tương thích email/SĐT khi đăng nhập; đăng ký và nhận OTP vẫn dùng email. Giỏ hàng không được reset khi đổi luồng xác thực.

## Đồng bộ contract Tuấn trên dev ngày 18/10/2026

Nhánh `thinh` đã fast-forward tới `origin/dev` tại `da44661` (PR #95/#97); chưa push thay đổi v3.

- Hoa hồng dùng `commission-policy.ts` và `exclusive-deal-bonus.ts` của checkout: nền 10 + Tier + VIP + Campaign + Live, chặn trần 25%, tính trên Net GMV. VIP vẫn lưu 12 trong proposal để thể hiện +2; Live lưu 2, không lưu 12. Đơn lịch sử dùng thời điểm mua để kiểm tra hiệu lực. Chỉ tái dựng trạng thái LIVE của phiên ENDED trong đúng cửa sổ lịch sử, không phục hồi Live bị hủy/tạm dừng.
- Campaign có ngân sách, participant ACCEPTED, link chiến dịch, snapshot phần thưởng và `bonusBudgetUsed` khớp phần đã giữ. Lịch sử sáu đơn chứa Live đã kết thúc; đơn thứ hai phân bổ thêm năm Creator, bao gồm Kim Cương.
- Dùng `priceVoucherLines` của checkout để phân bổ giảm tiền hàng. Voucher Shop/KOL, voucher sàn GOODS và voucher SHIPPING được lưu riêng; chỉ một mã mỗi nhóm trên một đơn. `couponDiscountAmount` chỉ chứa giảm tiền hàng; `discountAmount` chứa cả giảm ship. Hoa hồng không bị giảm bởi freeship.
- Cước đơn mua lấy từ export sandbox nếu có, kể cả cước 0 thật. Khi chưa có export, dùng số tiền lịch sử **mô phỏng** 24–33 nghìn đồng và `shippingFeeSource=SYNTHETIC_DEMO`, `ghnIsReal=false`, `ghnTotalFee=null`. Đây không phải thuật toán báo giá GHN và không được dùng cho checkout thật. Seed không gọi GHN hoặc tạo vận đơn.
- Đơn mẫu có `ghnProvinceId`, `ghnDistrictId`, `ghnWardCode` khớp sổ địa chỉ. Mười lăm khoản cước mẫu TEST chỉ thể hiện trách nhiệm Shop; chưa có số tiền/chứng từ, không ghi thành đã thanh toán và không trừ ví.
- Thêm writer, kiểm tra ID khóa kép, kiểm tra ngân sách/funding/ownership trong transaction seed cho `StackedVoucherRedemption`, `CustomerSavedCoupon`, `SampleShippingCharge`.
- Còn thiếu cột barcode/trọng lượng/kích thước sản phẩm. Bốn migration địa chỉ/voucher/campaign đã có trên dev; SQL của năm tên gốc còn thiếu đã tìm thấy dưới tên timestamp khác và khớp checksum DB. Không tự chép trùng/đổi tên vì có CREATE TYPE không idempotent. Bốn file SQL khác nội dung và bảy migration chưa ghi nhận áp dụng vẫn cần đối soát. Đã đọc metadata DB nhóm, không ghi DB; xem `docs/THINH_DATABASE_HANDOFF.md` ở gốc repo.

Chỉ dữ liệu đã có chức năng thật được ghi vào schema. `fullUpgradeReady=false` vẫn giữ cho tới khi hoàn tất schema, lịch sử migration và nghiệm thu vận hành. Gói Shop tài trợ vẫn cần người vận hành duyệt cấu hình như mục Marketplace; không tự bật quảng cáo demo.

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
