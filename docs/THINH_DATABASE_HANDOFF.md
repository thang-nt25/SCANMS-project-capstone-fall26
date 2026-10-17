# Bàn giao dữ liệu và kiểm thử — Thịnh, 18/10/2026

## Điều đã xác minh trực tiếp

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

## Chưa thực hiện và cần quyết định của nhóm

1. Lead duyệt cách giải quyết lịch sử migration nêu trên; đồng bộ cột barcode/trọng lượng/kích thước với Tuấn.
2. Duyệt migration ứng dụng, xác nhận cửa sổ bảo trì, bản backup mới và target chính xác. Reset là quyết định riêng, không mặc định từ yêu cầu sửa/push code.
3. Chỉ sau khi dựng DB được phê duyệt mới seed v3 và nghiệm thu web Customer/Shop/KOL/Admin. Hiện chưa xác nhận các dữ liệu v3 đã xuất hiện trên web dùng DB nhóm.
4. GHN/PayOS sandbox và quảng cáo tài trợ cần bằng chứng/cấu hình được duyệt; cước, vận đơn và thanh toán synthetic không phải bằng chứng vận hành thật.
