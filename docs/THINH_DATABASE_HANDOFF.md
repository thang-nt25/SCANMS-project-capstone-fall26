# Bàn giao dữ liệu và kiểm thử — Thịnh, 18/10/2026

## Bổ sung mới nhất — KOL tham khảo và nghiệm thu tự động

Đã áp dụng enrichment cộng thêm trên DB nhóm, không reset/seed lại: **20 KOL tham khảo có nguồn và nhãn TEST, 30 sản phẩm fixture có metadata bao bì, hai placement TEST miễn phí**. Dữ liệu người nghiệm thu đã chỉnh được bảo toàn; không đổi mật khẩu, tồn kho, đơn hoặc giao dịch tài chính. Thay đổi và snapshot trường trước nâng cấp lưu chung transaction trong audit `CAPSTONE_ADDITIVE_ENRICHMENT`.

Kết quả mới nhất: **1.098 test backend, 58 test seeder; frontend 80 đạt/0 lỗi/1 bỏ qua, gồm 19 ca browser thực chạy**. Build FE/BE qua; API thật đọc được dữ liệu mới, health UP/DB CONNECTED. Chưa chứng nhận Live/video, giao hàng vật lý hoặc thanh toán thật. Chi tiết phạm vi, giới hạn và các bước còn lại tại [THINH_SEED_ENRICHMENT_REPORT.md](THINH_SEED_ENRICHMENT_REPORT.md). Các kết quả ít hơn bên dưới là lịch sử.

## Cập nhật mới nhất — bổ sung FE/BE sau nghiệm thu seed

Đã thêm cột barcode/kiện hàng và luồng booking tài trợ có phân quyền, API/UI; dùng số đo DB cho checkout và snapshot vận chuyển, sửa timeout QR bằng encoder PNG thực. Hai migration cộng thêm đã deploy vào DB nhóm sau backup/phục hồi thử; **không reset hoặc seed lại**, giữ cả tài khoản tester mới tạo (67 user tại thời điểm deploy). Regression unit mới nhất đạt **1.071/1.071**, thay cho năm lỗi QR ở ghi nhận lịch sử phía dưới. Hướng dẫn chạy, route/file, kiểm thử và phần người nghiệm thu cần thực hiện nằm tại [THINH_ACCEPTANCE_WEB.md](THINH_ACCEPTANCE_WEB.md).

## Reset DB nhóm đã được phê duyệt — 18/10/2026

Thịnh đã xác nhận DB nhóm là môi trường phát triển/test và đồng ý reset **schema `public` sau khi backup được kiểm tra phục hồi**. Thao tác đã hoàn tất trên đúng target lấy từ `backend/.env`; không đổi `.env` sang DB local, không reset Supabase Auth/Storage hoặc media bên ngoài.

- Dừng backend bảo trì, tạo backup mới chứa **113 users, 128 orders, 250 financial_ledgers**. Archive custom PostgreSQL có **589.224 byte**, SHA-256 `18bab00552700ed74fde1c392cdb760d376f2e1a7f19a1a3d97994ffbec46a94`.
- Phục hồi chính archive mới vào DB cô lập `scanms_public_restore_20261018` tại localhost:55433 và đối chiếu đủ ba số lượng. Đây không phải backup toàn bộ Supabase.
- Diễn tập Prisma reset chính thức, đủ **61 migration**, rồi `npx prisma db seed` và `--check` trên DB local khác `scanms_reset_probe_20261018`. Prisma đã nhận xác nhận mới của người dùng sau cảnh báo chặn AI.
- Reset `public` của DB nhóm bằng Prisma, áp dụng 61 migration và **`npx prisma db seed` thành công, không lỗi foreign key**. Không sửa SQL lịch sử, checksum, tên migration hoặc vô hiệu hóa trigger ledger. Lịch sử cũ được lưu trong backup; đây là dựng lại DB phát triển được duyệt, không phải sửa lịch sử tại chỗ cho các môi trường khác.
- `seed:check` và `seed:audit` qua: `datasetReady=true`, `schemaHistoryReady=true`; không có migration thiếu/chờ/khác nội dung/thất bại. Sai lệch ví tổng, ví Shop, thông báo chat chưa đọc và pin Live đều bằng **0**. `prisma migrate status` báo schema up to date.
- Dữ liệu mới: **66 tài khoản** (1 Admin, 15 Shop, 20 KOL, 30 khách), **30 sản phẩm / 120 biến thể**, 60 đơn, 66 review, 70 voucher, 20 mẫu, 5 Live, 50 hội thoại / 100 tin, 212 ledger và 2 payout. Chạy lại `npx prisma db seed` trả về `unchanged`, không ghi đè tài khoản hoặc tiến độ test.
- Smoke test HTTP qua **25 mục**: đăng nhập đúng bốn vai trò, đọc catalogue/đơn/ví/chat/KYC. Bổ sung: Customer 05 và Shop 08 đọc được hồ sơ `SHOP_APPROVED`, khách khác bị 404; chat của khách khác bị 403; catalogue của một Shop có đúng hai sản phẩm; **29 ảnh tải được**, đúng MIME ảnh, không phải HTML fallback.
- Backend đã chạy lại tại `http://localhost:3000/api`, frontend tại `http://localhost:5173`. Hai placement `[DEMO]` từng được cấp qua **environment của phiên backend** để kiểm tra contract; đã tắt trong phiên kiểm thử không giả lập theo cập nhật dưới đây. Không ghi `.env` hoặc tạo booking trả tiền thật. PostgreSQL kiểm thử 55433 đã dừng, dữ liệu diễn tập được giữ.

Biên bản riêng ở `.dev-runtime/current-public-rebuild.json` (trỏ tới receipt), cùng backup/log và `seed-access.json` trong thư mục backup riêng. `seed-access.json` chứa mật khẩu demo ngẫu nhiên dùng chung của lần seed này; **không đưa file hoặc mật khẩu lên Git/chat công khai**. Tài khoản cũ trong `public` đã bị xóa, chỉ phục hồi được từ backup; đăng xuất phiên cũ rồi dùng email `*@seed.scanms.test` trong README seeder.

**Chưa nghiệm thu UI trực quan:** công cụ trình duyệt chưa có phiên kết nối (`Browser is not available: iab`). HTTP/ảnh tải được không đồng nghĩa đã kiểm tra bố cục, responsive, âm báo hoặc tương tác end-to-end trên trình duyệt.

**Không tuyên bố hoàn tất tích hợp thật:** `fullUpgradeReady=false` vì contract cột barcode/trọng lượng/kích thước chưa có. Chưa cấu hình GHN TEST và chưa có export vận đơn sandbox thật: `realShipmentCount=0`, cước/vận đơn và thanh toán/payout vẫn được đánh dấu synthetic demo. Phòng LIVE không tự phát video. GHN/PayOS sandbox và luồng thao tác web cần nghiệm thu riêng; không dùng credential LIVE để tạo vận đơn test.

### Checklist test web sau reset

1. Đăng xuất phiên cũ, tải lại `http://localhost:5173`, dùng mật khẩu riêng nói trên. Customer 01 có hai đơn, một địa chỉ, hội thoại và thông báo; kiểm tra giỏ hàng/đơn sau reload.
2. Shop 01 có hai sản phẩm và bốn đơn; KOL 01 có một hồ sơ mẫu, một deal và ví; Admin xem hồ sơ KYC của 15 Shop/20 KOL.
3. Đổi trả đã duyệt: **Customer 05 / Shop 08**; chờ duyệt: **Customer 10 / Shop 13**. Kiểm tra nhận hàng ngược theo chế độ test hiện có, không gọi hãng vận chuyển thật.
4. Mở hai phiên Customer/Shop, gửi chat và trả lời; kiểm tra chuông, đọc/chưa đọc, âm báo và reload giữ lịch sử. Các API đọc đã qua không thay thế bài test này.
5. Kiểm tra trang chủ/gian hàng và sản phẩm ghim. Phiên test không demo không bật hai placement giả; trạng thái Live phụ thuộc thời gian và thao tác bắt đầu phát thật trong hệ thống, không tự gia hạn bằng seed.

### Kiểm thử không demo theo yêu cầu mới

Thịnh xác nhận sẽ **tự tạo dữ liệu mới trên web và lưu vào DB nhóm**, không khôi phục dữ liệu cũ. Giữ nguyên dữ liệu hiện có, không chạy seed/reset/restore lại. Dataset ban đầu vẫn là fixture được đánh dấu synthetic; không xóa nhãn xuất xứ hoặc coi chúng là giao dịch thật.

- Tắt cấu hình hai placement DEMO trong phiên backend; đăng nhập tự điền trên frontend đang tắt.
- Bỏ fallback mock ngầm của lấy hàng trả ở môi trường development. Chỉ `RETURN_PICKUP_PROVIDER=mock` được bật rõ ràng ngoài production mới giả lập; thiếu/khác cấu hình thì `disabled`.
- Thêm opt-in `SHIPPING_SIMULATION_ENABLED=true` ngoài production cho hành trình shipper/nhận mẫu/thanh toán cước giả. Mặc định tắt; tạo vận đơn sandbox chỉ lưu phản hồi GHN, không tự thêm đồng hồ mô phỏng. Tắt cờ cũng không phục vụ hành trình giả đã lưu thay cho dữ liệu từ hãng vận chuyển.
- Không tự tạo vận đơn LIVE hoặc thanh toán thật. Lần kiểm tra đầu thiếu credential GHN/PayOS; sau đó chủ dự án cung cấp cấu hình và các khóa còn thiếu đã được bổ sung vào **`backend/.env` riêng, bị Git bỏ qua**. Đã sao lưu file trước khi sửa, giữ nguyên mọi khóa cũ (gồm DB/JWT), không chép giá trị bí mật vào tài liệu/Git.
- Backend khởi động lại với `RETURN_PICKUP_PROVIDER=staging`; adapter trả hàng nhận cặp GHN TEST của nhóm, không lấy credential LIVE làm fallback. `SHIPPING_SIMULATION_ENABLED=false`, `RETURN_PICKUP_SIMULATION_ENABLED=false`, placement DEMO rỗng; đăng nhập tự điền frontend tắt.
- Kiểm tra đọc thật: GHN sandbox trả **65 tỉnh/thành**, API danh mục GHN LIVE qua backend trả **63 tỉnh/thành**. Chỉ đọc master-data, **không tạo vận đơn**. PayOS availability trả `available=true`: chỉ xác nhận cấu hình đủ, chưa nghiệm thu thanh toán/link/refund thật.
- **83/83 test trọng tâm** qua; TypeScript và build backend qua. **9 kiểm tra HTTP** sau nạp cấu hình qua, gồm DB kết nối, không placement DEMO, provider Staging không mô phỏng, và các API giả lập bị chặn 403/503. Không seed/reset/restore lại, không tạo đơn nghiệp vụ/vận đơn/thanh toán mới trong lượt kiểm tra; đăng nhập có audit/security notification bình thường của hệ thống.
- Regression toàn backend: **1.044 qua / 5 lỗi / 1.049 ca**, 85 suite qua, một suite lỗi. Năm lỗi là timeout 30 giây trong `referral-links-qr.spec.ts` (ca 1/7/9/11/14); chạy riêng ca 1 cũng tái hiện timeout. Render QR thuần Node trong bộ nhớ vẫn hoàn tất khoảng 0,5 giây; chưa kết luận nguyên nhân trong Jest, không sửa QR/tăng timeout hoặc gọi cả bộ regression là đã qua. Kết quả 1.036/1.036 trong phần lịch sử bên dưới thuộc lần chạy trước, không thay cho kết quả hiện tại.
- Các khóa được gửi trong hội thoại nên được chủ dự án thu hồi/đổi trước khi chia sẻ hoặc triển khai; lượt này không tự xoay khóa hay thay đổi quyền truy cập dịch vụ.

## Lịch sử kiểm tra trước khi được duyệt reset

Các ghi nhận bên dưới là **trạng thái trước reset**, không phải tình trạng DB nhóm hiện tại.

### Điều đã xác minh trực tiếp

Đã kết nối DB nhóm bằng cấu hình dự án, chỉ đọc metadata trong transaction READ ONLY. Không reset, migrate, sửa `_prisma_migrations`, seed hoặc thay `.env`.

- DB thiếu bảng `platform_voucher_reimbursements` mà Prisma mới yêu cầu.
- Bảy migration trong repo chưa có bản ghi hoàn tất tương ứng. Không suy diễn rằng mọi DDL của cả bảy đều chưa tồn tại: một số cấu trúc có thể đã được tạo thủ công.
- Bốn migration có checksum nội dung khác DB; đã tìm các phiên bản cùng đường dẫn trong lịch sử Git hiện có nhưng chưa thấy nội dung khớp. Cần đối soát với lead trước khi triển khai thay đổi lịch sử.
- Năm tên migration thiếu file có SQL khớp checksum trong repo nhưng nằm dưới tên thời gian khác (bảng sau). Không cần đoán lại SQL từ pgAdmin.

| Tên ghi trong DB nhưng thiếu file | File SQL hiện có khớp checksum |
| --- | --- |
| `20260913020000_fr15_media_review_moderation` | `20260913130000_fr15_media_review_moderation` |
| `20260913030000_add_order_source_platform` | `20260913140000_add_order_source_platform` |
| `20260913040000_secure_landing_analytics` | `20260913150000_secure_landing_analytics` |
| `20260913050000_add_commission_lifecycle_timestamps` | `20260913160000_add_commission_lifecycle_timestamps` |
| `20260913060000_add_review_moderation_status` | `20260913170000_add_review_moderation_status` |

Hai bộ tên đều liên quan lịch sử đã công bố. **Không chép thêm năm thư mục rồi chạy lại mù quáng**: SQL MediaAssetStatus có CREATE TYPE không idempotent. Cũng không tự đổi tên/xóa migration đang được dùng ở môi trường khác. Lead cần thống nhất kế hoạch reconciliation/baseline cho các môi trường và lưu SQL gốc của bốn file khác nội dung. Không dùng `migrate resolve` hoặc sửa checksum để che khác biệt.

### Bốn file khác nội dung

```text
20260911110000_fr10_referral_links
20260912100000_fr12_coupons_and_attribution
20260912170000_fr13_tracking_attribution_engine
20260912180000_fix_tracking_constraints_and_audit_history
```

### Bảy migration chưa ghi nhận áp dụng

```text
20261015130000_platform_voucher_reimbursements
20261016150000_fixed_base_commission
20261016160000_additive_bonus_policy
20261016170000_voucher_margin_protection
20261016180000_coupon_permission_state
20261016190000_sample_shipping_charges
20261016200000_ghn_tracking_records
```

## Backup đã diễn tập phục hồi

Bản `public` schema ngày 17/10 được xác minh SHA-256 `bbf78f65e6763a0af64919064f0c6de44c95c29ff61dfc47d0777949396e59e2`, rồi phục hồi bằng pg_restore vào **database mới** `scanms_restorecheck_20261018_v3`, chỉ trên localhost:55433. Không ghi đè database đang có; không vô hiệu hóa trigger ledger. Schema public trống của target mới được loại bỏ bằng DROP SCHEMA không CASCADE sau chốt kiểm tra đúng database/cổng và không có bảng, để tránh lỗi CREATE SCHEMA public trùng.

Đối chiếu sau restore: **113 users, 126 orders, 247 financial_ledgers, 63 dòng lịch sử migration** (số dòng lịch sử không đồng nghĩa số migration áp dụng thành công). Archive gốc không đổi. Dump/log chứa dữ liệu riêng, nằm trong `.dev-runtime/private-backups`, không đưa lên Git. Đây không phải backup toàn bộ Supabase auth/storage hoặc media bên ngoài. Cần backup mới và dừng ghi khi nhóm duyệt cửa sổ thao tác thật.

## Cách chạy kiểm tra an toàn

- `cd backend; npm.cmd test`: bộ unit test; không tự khởi tạo AppModule/Prisma trên DB nhóm. Test DB/HTTP E2E/Redis thật được tách khỏi lệnh mặc định, không xóa khỏi repo và không gọi chúng là đã qua nếu chưa chạy.
- `npm.cmd run seed:typecheck`: TypeScript strict của seeder.
- `npm.cmd run test:seed`: unit seed; integration chỉ chạy với `SEED_TEST_DATABASE_URL` trỏ đúng DB cô lập localhost:55433/scanms_seed_test, mỗi ca có schema mới.
- `npm.cmd run build`: build backend; frontend có lệnh tương tự trong thư mục frontend.
- `cd frontend; npm.cmd test`: test frontend; browser tests cần môi trường opt-in riêng.

Các lệnh integration cũ như `test:db`, test E2E đầy đủ và test Redis **chỉ được chạy sau khi cấu hình database/cache bỏ đi, không dùng .env nhóm**. Bản v3 từ chối apply trên manifest v1/v2 để tránh ghi đè tiến độ test.

Các lỗi test ban đầu đã xử lý bằng cập nhật fixture đúng DTO/GHN, nạp danh sách products trong mock Live, đường dẫn validation frontend và test account/Sidebar theo component hiện hành. Ca QR idempotency dùng cache fixture có lưu kết quả giống runtime, so sánh cả buffer và kiểm tra không tạo link mới; vẫn giữ các ca render/decode PNG thật, không tăng timeout hoặc bỏ assertion.

Kết quả cuối: backend unit **1.036/1.036** (86 suite), seed **52/52** (có chín integration PostgreSQL), Marketplace HTTP **6/6**, frontend **50 qua / 0 lỗi / 20 browser ca chưa bật**. TypeScript backend gồm spec, strict seed, build frontend/backend qua. Các bài HTTP E2E/Redis khác không được xem là đã nghiệm thu. Frontend/backend đang chạy, DB kiểm thử 55433 đã dừng.

## Các quyết định từng còn chờ trước reset

1. Lead duyệt cách giải quyết lịch sử migration nêu trên; đồng bộ cột barcode/trọng lượng/kích thước với Tuấn.
2. Duyệt migration ứng dụng, xác nhận cửa sổ bảo trì, bản backup mới và target chính xác. Reset là quyết định riêng, không mặc định từ yêu cầu sửa/push code.
3. Chỉ sau khi dựng DB được phê duyệt mới seed v3 và nghiệm thu web Customer/Shop/KOL/Admin. Hiện chưa xác nhận các dữ liệu v3 đã xuất hiện trên web dùng DB nhóm.
4. GHN/PayOS sandbox và quảng cáo tài trợ cần bằng chứng/cấu hình được duyệt; cước, vận đơn và thanh toán synthetic không phải bằng chứng vận hành thật.

Mục 2 và phần dựng/seed DB ở mục 3 đã hoàn thành theo biên bản đầu tài liệu. Reconciliation vẫn cần cho **môi trường khác còn giữ lịch sử cũ**; không reset các môi trường đó nếu chưa được duyệt riêng. Nghiệm thu UI trực quan, package fields và bằng chứng sandbox vẫn còn mở.
