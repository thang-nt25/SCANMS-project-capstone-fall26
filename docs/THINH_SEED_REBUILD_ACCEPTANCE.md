# Nghiệm thu tái thiết dữ liệu Thịnh

## Cập nhật 18/10/2026 — đồng bộ Tuấn

Đã fast-forward `thinh` tới `dev` tại `da44661`, không conflict. Phần bên dưới ghi nhận kết quả v2 ngày 17/10; cập nhật này dùng **seeder v3**, không ghi đè bản v1/v2 đã cài.

- Dùng hàm policy thật của checkout cho hoa hồng nền/Tier/VIP/Campaign/Live, theo thời điểm đơn lịch sử; Live lưu bonus 2, proposal VIP vẫn lưu tổng 12 theo contract. Budget campaign và snapshot Net GMV được đối soát.
- Bổ sung 30 voucher sàn/phí ship, thành 70 mã; thêm 30 mã Customer đã lưu, redemption khóa kép và funding sàn. Không trừ phí ship/freeship khỏi cơ sở hoa hồng.
- Bổ sung mã GHN ba cấp vào đơn mẫu và 15 khoản cước TEST chưa xác nhận, Shop chịu phí/COD 0. Không tự gán cước thiếu thành 0 hay gắn trạng thái đã trả tiền.
- Cước mua hàng không có export dùng số tiền demo có nhãn SYNTHETIC_DEMO; không gọi GHN. Chỉ export kèm evidence mới được gắn GHN_SANDBOX_EXPORT.
- Sửa hồi quy trên Marketplace API: Shop có 0 đánh giá trả rating null, không trả 4.9 giả.
- Bốn migration chờ Tuấn đã có file trong dev. Lượt kiểm tra chỉ-đọc tiếp theo đã tìm thấy SQL khớp checksum của năm tên migration còn thiếu dưới các tên timestamp khác; bốn migration khác nội dung vẫn cần lead đối soát. DB nhóm thiếu bảng đối soát voucher sàn và bảy migration chưa ghi nhận áp dụng. Xem `THINH_DATABASE_HANDOFF.md`. Không reset, migrate hoặc seed DB nhóm; không đổi `.env`.
- Vẫn còn phụ thuộc schema barcode/quy cách kiện hàng, bằng chứng GHN và phê duyệt vận hành. Chưa đánh dấu hoàn tất toàn bộ nâng cấp.

Đã sửa fixture test cũ của Samples/Shipping/Orders/Live theo DTO và dependency mới, không nới kiểm tra production. TypeScript toàn backend bao gồm test và build đều qua. Test frontend sửa đường dẫn tới module validation thật và kiểm tra component account/Sidebar hiện hành, không thêm module giả để làm xanh. Kết quả được ghi bên dưới.

### Kiểm thử v3

- Seeder: **52/52 test qua**, gồm 43 unit và 9 integration PostgreSQL. Chạy toàn bộ migration trên schema mới, kiểm tra đủ 70 coupon/30 mã đã lưu/56 stacked redemption/15 cước mẫu, rollback, chạy lại, concurrency, ledger và CLI seed → check → seed lại → audit.
- Stores API và policy Tuấn: **195/195 test qua**, gồm 6 HTTP integration PostgreSQL của Marketplace và các test policy hoa hồng/VIP/voucher. Ca regression Shop chưa có review trả rating null đã qua.
- TypeScript strict seed, TypeScript toàn backend (kể cả spec), build backend và lint các file seeder thay đổi qua.
- Frontend `npm test`: 50 qua, 0 lỗi, 20 browser test chưa bật môi trường opt-in. Build frontend qua, còn cảnh báo chunk lớn hơn 500 kB. Không coi browser test chưa chạy là đã nghiệm thu UI.
- `npm test` backend được tách thành unit suite an toàn. Test cần PostgreSQL/Redis thật vẫn giữ nguyên, chạy riêng với dịch vụ cô lập. Các file integration/E2E cũ có thể nạp `.env` nhóm không còn chạy vô tình trong lệnh mặc định. Có sáu ca regression kiểm tra phân loại này.
- Lượt cuối `npm test` backend: **1.036/1.036 ca qua trong 86 suite, không lỗi/skip**, bao gồm 15 ca QR sau cập nhật cache fixture. Integration seed riêng **52/52** và HTTP Marketplace **6/6** được chạy lại trên PostgreSQL cô lập. Các integration/E2E/Redis cũ không có hạ tầng riêng chưa được chạy, không được tính vào số ca đã qua.
- `seed:plan` chạy không ghi DB, xác nhận dataset v3; chỉ còn PRODUCT_PACKAGE_FIELDS trong danh sách thiếu contract. `fullUpgradeReady=false` vẫn giữ.
- Không kiểm thử giao dịch GHN/PayOS thật, không reset/migrate/seed DB nhóm, không thay `.env` hoặc dependencies/lockfile. Chỉ đổi script test backend sang cấu hình unit an toàn.
- Backup public schema đã restore thử thành công vào DB local mới: 113 users / 126 orders / 247 ledger. Không sửa archive gốc hoặc lịch sử DB nhóm. Chi tiết và các quyết định còn cần lead nằm trong `THINH_DATABASE_HANDOFF.md`.

## Ghi nhận lịch sử 17/10/2026

Ngày đối chiếu: 17/10/2026. Nhánh `dev` tại `ae8993f` và bản bàn giao `quy` tại `3f71c54` đã merge vào nhánh làm việc `thinh` không conflict. Khi cập nhật trước khi push, `origin/dev` đã ở `78125bc` (PR #93 của Quý, có thêm refactor `5ccf00d`). Chỉ push nhánh `thinh` theo yêu cầu; không tự merge PR vào `dev`.

## Kết luận

Seeder v2 dựng được dữ liệu cho các chức năng hiện có và đã đồng bộ hợp đồng Marketplace mới của Quý. Chưa hoàn tất toàn bộ kế hoạch nâng cấp: còn các hợp đồng hoa hồng cộng dồn, cước động, voucher tách loại và cột quy cách sản phẩm của Tuấn. Không xóa/reset database nhóm trong lượt này.

Theo xác nhận của Thịnh ngày 17/10/2026, phần đối soát migration và reset DB nhóm **được hoãn lại**. Các kiểm thử seeder dùng DB riêng; ứng dụng vẫn giữ kết nối DB nhóm, không đổi `.env`.

## Phần đã triển khai và kiểm tra

| Hạng mục | Dữ liệu seeder |
| --- | --- |
| Gian hàng | 15 Shop, chủ riêng, địa chỉ kho/hoàn trả, logo, chính sách, ngân hàng minh họa, hồ sơ duyệt |
| KOL | 20, phân bổ 5 Đồng / 7 Bạc / 5 Vàng / 3 Kim Cương, địa chỉ, ngân hàng, kênh mô phỏng |
| Khách | 30, sổ địa chỉ ba cấp, hai đơn mỗi người |
| Sản phẩm | 30, 120 biến thể hai tầng, SKU, EAN-13 nội bộ trong labelInfo, tồn 200–276, hoa hồng nền 10%, quota mẫu |
| Đơn hàng | 60, đủ năm trạng thái, tiền hàng/voucher/cước và thanh toán đối ứng |
| Voucher | 40, khóa chồng voucher tiền hàng cùng Shop, counter/budget đối soát redemption |
| Hàng mẫu | 20, bốn trạng thái; deadline 14 ngày chỉ tính từ receivedAt; video đã nghiệm thu |
| Live | 2 LIVE / 3 ENDED, pin lưu bằng governance.pinnedProductId đúng sản phẩm thành viên, lịch sử viewer; không phát video/người xem giả |
| Tài trợ Marketplace | Plan xuất JSON hai Shop `[DEMO]` theo cấu hình Quý, không thêm cột/bảng giả và không tự áp dụng cấu hình |
| Chat | 50 hội thoại / 100 tin, thẻ sản phẩm và đề xuất Deal theo contract hiện tại |
| Thông báo | 160; 100 thông báo chat dùng cùng UUID với tin, đúng người nhận và trạng thái đọc |
| Tài chính | 66 ví / 212 ledger, AVAILABLE và PENDING; hai payout có gross/tax/net khớp PayoutTaxService |
| Đánh giá | 66, 2–3 mỗi sản phẩm, năm sao, ảnh và đơn COMPLETED chứa đúng sản phẩm |
| Đổi trả | 6 hồ sơ có ảnh/video, dữ liệu để tiếp tục thử quy trình lấy hàng |

Dữ liệu cá nhân/kênh/follower/giao dịch là synthetic, không phải hồ sơ thật được thu thập. Ảnh dùng tài nguyên sẵn trong repo; không giả mạo việc thương hiệu đã ký hợp tác hay ảnh khách thực tế. Chưa có mã GHN hoặc bằng chứng PayOS sandbox thật được cung cấp cho snapshot này.

## An toàn vận hành

- Phiên bản v2 giữ UUID ổn định nhưng từ chối apply đè v1. Không đổi mật khẩu, tồn kho hoặc tiến độ người test khi chạy lại cùng phiên bản.
- `seed:audit` chỉ đọc, báo counts, migration và đối soát ví/chat, không tự sửa dữ liệu.
- Reset yêu cầu đúng target, xác nhận, backup; thêm chốt từ chối nếu lịch sử migration không thể dựng lại từ repo.
- Không tắt trigger ledger bất biến, không sửa `_prisma_migrations` để vượt kiểm tra.

## Kết quả kiểm thử

- Sau đồng bộ Quý: 43 test seeder đã qua, gồm 34 unit test và 9 integration test PostgreSQL thật.
- Dựng mới schema bằng migration; gọi `prisma db seed → --check → seed lại → --audit` thành công trên DB cô lập.
- Kiểm tra rollback, concurrency, giữ dữ liệu ngoài fixture, trigger ledger, từ chối ghi lên manifest v1 và phát hiện số dư/thông báo thiếu.
- Dùng ChatService thật để đọc tin mẫu: ChatMessage và Notification cùng cập nhật đã đọc.
- TypeScript seed strict, lint các file thay đổi và build frontend đã được kiểm tra. Trang chủ mới của Quý build thành công sau merge dev.
- Chưa nghiệm thu UI trên DB nhóm sau tái thiết vì reset được hoãn. Backend hiện vẫn báo UP / CONNECTED và frontend trả HTTP 200.

## Kết quả kiểm tra chỉ đọc DB nhóm

Tại thời điểm kiểm tra: 113 users, 126 orders, 247 financial_ledgers, 62 bảng, 59 migration đã áp dụng. Manifest bộ seed vẫn là v1. Các ID fixture nền đang đủ; 100 Notification ID theo quy ước chat mới chưa có. Ví tổng và ví theo Shop đều đối soát được, không thấy lệch trong phạm vi fixture.

Chín migration đã áp dụng nhưng repo không có file:

```text
20260913020000_fr15_media_review_moderation
20260913030000_add_order_source_platform
20260913040000_secure_landing_analytics
20260913050000_add_commission_lifecycle_timestamps
20260913060000_add_review_moderation_status
20261014213000_sample_ghn_address
20261014214500_customer_saved_coupons
20261014220000_campaign_bonus_budget
20261014221500_voucher_stacking
```

Bốn migration khác nội dung file SQL (không tính CRLF/LF theo cả hai chiều):

```text
20260911110000_fr10_referral_links
20260912100000_fr12_coupons_and_attribution
20260912170000_fr13_tracking_attribution_engine
20260912180000_fix_tracking_constraints_and_audit_history
```

Đã tạo backup mới của public schema, archive-list verified, nằm ngoài Git trong `.dev-runtime/private-backups/2026-10-17T12-54-18-912Z/`. Dump 562140 bytes; SHA-256 `bbf78f65e6763a0af64919064f0c6de44c95c29ff61dfc47d0777949396e59e2`. Chưa diễn tập restore. Không bao gồm Supabase auth/storage hoặc file media được host ngoài DB; không coi đây là bản sao toàn bộ Supabase.

## Điều kiện cần bàn giao trước khi reset nhóm

1. Lead/Tuấn cung cấp SQL gốc của chín migration và đối soát bốn migration khác nội dung. Giữ nguyên lịch sử migration đã công bố. Hai file ngày 16/10 ban đầu bị báo khác đã được xác định lại chỉ khác CRLF/LF, không xếp vào nhóm khác nội dung.
2. Tuấn bàn giao contract và test engine hoa hồng cộng dồn, cước GHN và voucher sàn/freeship. Seeder hiện giữ đúng contract dev, không tự giả lập engine mới.
3. Quý đã bàn giao API placement theo cấu hình môi trường, rating/reviewCount thật và banner theo campaign; PR #93 đã được merge vào dev. Seeder đã đồng bộ trên thinh. Người vận hành vẫn cần duyệt cấu hình hai vị trí demo; không coi fixture CONFIRMED là bằng chứng thanh toán thật.
4. Có bằng chứng GHN sandbox thật nếu muốn nghiệm thu mã vận đơn/cước thật. Không gắn nhãn vận đơn demo là thật.
5. Thống nhất cửa sổ bảo trì, dừng ghi DB, xác nhận backup có thể phục hồi và đích reset chính xác. Chỉ lúc đó mới duyệt reset và nghiệm thu UI theo bốn vai trò.

## Kiểm thử sau đồng bộ Quý

Đã bổ sung kiểm thử HTTP thực tế Stores/Live với dữ liệu seed trên schema PostgreSQL cô lập, gồm rating/count/campaign, hai Shop tài trợ chỉ khi cấu hình hợp lệ, sản phẩm ghim lưu bền và chặn tài khoản không có quyền. Popup xác thực tại chỗ giữ đăng nhập email/SĐT và đăng ký OTP email.

Kết quả ngày 17/10/2026:

- Bộ seeder: 43/43 test qua; có chuỗi CLI seed → check → seed lại → audit trên PostgreSQL kiểm thử.
- Stores/Live và cấu hình Marketplace: 11/11 test qua, gồm 6 integration test HTTP với PostgreSQL thật và 5 unit test.
- Frontend trong phạm vi cart, thông báo chat, email/SĐT và lọc danh mục: 12/12 test qua.
- TypeScript backend/seed strict, lint trong phạm vi file thay đổi và build frontend qua. Build frontend còn cảnh báo chunk lớn hơn 500 kB.
- Backend `/api/health` báo UP / CONNECTED; Vite phục vụ module giao diện HTTP 200. Chưa nghiệm thu trực quan bằng trình duyệt.
- Không seed/reset DB nhóm, không đổi `.env`, không tự bật hai placement demo. Kiểm thử được thực hiện trước commit/push; lượt bàn giao chỉ push `thinh`, không thay đổi `dev` trên remote.

Lệnh tổng `npm test` của frontend hiện có năm ca cũ lỗi: ba file `manual-order.validation.ts`, `payout-bill.validation.ts`, `review.validation.ts` không tồn tại ở đường dẫn mà test yêu cầu; hai assertion Sidebar phụ thuộc literal class cũ. Các file này không bị đổi bởi lượt đồng bộ Quý; không xóa/skip test hoặc viết lại nghiệp vụ ngoài phạm vi để làm xanh giả. Test liên quan mới và build được báo riêng.
