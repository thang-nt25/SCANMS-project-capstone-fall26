# Bộ dữ liệu Capstone SCANMS

Entry point vẫn là `backend/prisma/seed.ts`, được gọi bằng `npx prisma db seed` theo `prisma.config.ts`. Các module trong thư mục này chỉ xây dựng fixture và ghi dữ liệu qua Prisma; không thay thế controller/service của ứng dụng.

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
| Live                 |        5 | Hai phòng LIVE, ba phòng ENDED; có sản phẩm và voucher                                          |
| Hội thoại / tin nhắn | 50 / 100 | Khách–Shop và KOL–Shop; có thẻ sản phẩm, thẻ đề xuất deal                                       |
| Voucher              |       40 | 15 mã Shop, 20 mã KOL, 5 mã Live; counter và ngân sách đối soát với redemption                  |
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

Migration `20261016120000_seed_schema_alignment` bổ sung cột avatar và các giá trị enum đã có trong schema/code nhưng thiếu trong lịch sử migration cũ. Các câu lệnh đều có `IF NOT EXISTS`; dữ liệu hiện có được giữ. Nhóm cần rà soát và deploy migration này trước khi dựng lại DB mới.

## Reset dữ liệu cũ

DB hiện có trigger chặn UPDATE, DELETE và TRUNCATE trên `financial_ledgers`. Vì vậy reset dùng quy trình chuẩn `prisma migrate reset --force` để dựng lại schema cùng toàn bộ migration/trigger; không vô hiệu hóa trigger bất biến trong ứng dụng.

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

## Phụ thuộc bàn giao của Tuấn và Quý

| Mục kế hoạch chưa có hợp đồng trên dev          | Xử lý hiện tại                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Hoa hồng cộng dồn Deal + Campaign + Live + Tier | Giữ snapshot đơn Open Offer 10%; deal và live dùng tổng 12% theo contract hiện tại. Chưa tuyên bố engine đã cộng dồn |
| Phí GHN động                                    | Seed phí theo policy miễn ship đang có hoặc theo export GHN sandbox được cung cấp                                    |
| Voucher freeship / voucher sàn tách riêng       | Không giả lập field mà backend chưa hỗ trợ; một voucher tiền hàng trên mỗi order                                     |
| Hai Shop tài trợ / banner động                  | Schema hiện chưa có bảng/field cho placement/banner; cần hợp đồng của Quý để seed tiếp                               |
| Barcode, cân nặng, kích thước có cột riêng      | Tạm dùng nhãn văn bản; chuyển sang field chính thức khi danh mục của Tuấn bàn giao                                   |

Chỉ dữ liệu đã có chức năng thật được ghi vào schema. Các mục trên là phần nghiệm thu phụ thuộc bàn giao, cần kiểm lại trước khi báo hoàn tất toàn bộ kế hoạch.

## Integration test PostgreSQL

Unit test luôn chạy độc lập. Integration test chỉ chạy khi có `SEED_TEST_DATABASE_URL`; nó từ chối mọi đích ngoài `localhost/127.0.0.1:55433/scanms_seed_test`. Mỗi test tạo một schema mới, chạy toàn bộ migration thật và giữ nguyên schema cũ. Test không gọi reset/drop/delete và không vô hiệu hóa trigger tài chính. Các schema này chỉ thuộc DB kiểm thử bỏ đi, không trỏ DB làm việc của nhóm.

```powershell
$env:SEED_TEST_DATABASE_URL = 'postgresql://<test_user>:<test_password>@127.0.0.1:55433/scanms_seed_test'
npm run test:seed
```

Các ca kiểm tra gồm rollback khi lỗi khóa ngoại cuối transaction, số lượng và đối soát ledger, chạy lại bảo toàn tiến độ, seed đồng thời, giữ dữ liệu ngoài fixture và trigger bất biến. Unit test kiểm tra các chốt xác nhận/backup trước reset. Việc thực thi reset vẫn cần người vận hành xác nhận, đặc biệt khi Prisma chặn lệnh reset do được gọi từ AI. Test không sửa `.env` và không đổi database mà backend sử dụng khi chạy ứng dụng.
