# Nghiệm thu bổ sung FE/BE — 18/10/2026

## Kết quả mới nhất — bổ sung KOL và chạy kiểm thử trình duyệt

Đã bổ sung vào DB phát triển nhóm bằng transaction, **không reset hoặc seed lại**: 20 tên/kênh KOL công khai có nhãn TEST và nguồn tham khảo, cột barcode/bao bì cho 30 sản phẩm fixture, hai booking tài trợ TEST miễn phí. Không đổi mật khẩu, tồn kho, đơn, số dư, ledger hoặc payout. Số đo bao bì là fixture, không phải số đo thực tế. Xem [báo cáo bổ sung](THINH_SEED_ENRICHMENT_REPORT.md) và [nguồn KOL](KOL_PUBLIC_REFERENCES.md).

- Backend: **1.098/1.098 test**, 91 suite.
- Seeder: **58/58 test**, gồm 10 ca tích hợp PostgreSQL local cô lập.
- Frontend: **80 đạt, 0 lỗi, 1 bỏ qua**; đã chạy 19 ca trình duyệt bằng Edge. Ca còn lại cần `QA_FIXTURE_JSON` và API/DB test cô lập cho đơn thủ công/Excel, chưa chạy trên DB nhóm. Các ca trình duyệt có API fixture không thay thế nghiệm thu nhà cung cấp thật.
- Build FE/BE, typecheck seeder và lint các file mới/chỉnh sửa đều qua. Smoke API thật: health UP, DB CONNECTED, đọc được hồ sơ/kênh tham khảo, hai placement và hồ sơ đổi trả.
- Audit nhóm: lịch sử migration sạch; lệch ví/Shop/chat/pin bằng 0; thiếu package 0, kênh placeholder 0, hai Shop tài trợ đang hiệu lực. **Live thực tế đang hiệu lực vẫn 0**; chưa chứng nhận phát video, vận chuyển vật lý hoặc thanh toán ngân hàng/PayOS.

Đã bật riêng mô phỏng chiều đi và lấy hàng trả về trên máy phát triển cho TEST/Staging; production/LIVE vẫn bị chặn. Sửa thêm cache ví/payout, tải chứng từ qua API, bỏ fallback dữ liệu tài chính khi API lỗi và cho phép sửa chính sách hàng mẫu của sản phẩm cũ khi số đo chưa biết. Các ghi nhận test ít hơn/bỏ qua browser phía dưới là **lịch sử trước đợt bổ sung này**.

## Phạm vi đã triển khai

Giữ NestJS module → controller → service → Prisma và React service → component/page; dùng lại JWT/roles, React Query, Card/Button và màu vàng be SCANMS. Không tạo stack hoặc cơ chế đăng nhập thứ hai.

1. Barcode EAN-13 có kiểm tra checksum; lưu khối lượng gram và kích thước cm ở cột riêng. Form Shop không tự gán số đo hoặc nhét số đo mới vào mô tả. Sản phẩm cũ chưa biết thông số giữ NULL.
2. Báo cước checkout lấy sản phẩm/phân loại từ DB theo đúng Shop, không nhận giá trị hàng hóa hoặc khối lượng do Customer tự khai làm căn cứ. Kiện gộp cộng khối lượng, cộng chiều cao xếp chồng và lấy chiều dài/rộng lớn nhất. Luồng hiện dùng dịch vụ GHN `2`, chỉ hỗ trợ kiện dưới 20 kg và từng chiều tối đa 150 cm; chặn kiện nặng trước khi gọi hãng. Không giả hỗ trợ hàng nặng: dịch vụ `5` cần triển khai tính phí theo từng kiện riêng. Tham chiếu [tính phí GHN](https://developer.ghn.vn/vi/docs/order/calculate-fee), [tạo đơn GHN](https://developer.ghn.vn/vi/docs/order/create).
3. Đơn mới lưu snapshot kiện hàng cùng báo giá. Transaction khóa sản phẩm, kiểm tra lại snapshot trước khi trừ kho; nếu số đo vừa đổi thì yêu cầu báo giá lại. Khi gửi GHN dùng snapshot đã chốt, không lấy số đo catalogue mới. Đơn trước phiên bản này giữ giả định của báo giá lịch sử, không tự tính lại phí đã chốt.
4. Đăng ký/duyệt/hủy booking Shop tài trợ, lịch sử lưu DB. Giới hạn sáu vị trí đồng thời, chống trùng lịch Shop, gửi lặp và duyệt đồng thời; ghi audit/notification trong cùng transaction. Shop không tự duyệt hoặc thao tác booking Shop khác.
5. Gói miễn phí ghi rõ `PLATFORM_GRANT`, số tiền 0; gói `PAID` cần quản trị xác minh số tiền, mã đối soát duy nhất và URL chứng từ HTTPS. Đây là ghi nhận đối soát thủ công, **không tích hợp thu/hoàn phí quảng cáo tự động**. Hủy gói không đồng nghĩa đã hoàn phí.
6. Public chỉ đọc booking APPROVED còn hạn và Shop còn hoạt động/đã xác minh. Không trả chứng từ cho khách; bảng booking bật RLS để tránh truy cập trực tiếp qua vai trò REST ẩn danh Supabase. Cache FE gắn với ID người đăng nhập.
7. QR PNG được raster hóa từ ma trận QR bằng PNG encoder đồng bộ, có giới hạn kích thước; giữ URL, màu thương hiệu, SVG, quyền và cache sẵn có. Không tăng timeout hoặc thay ảnh giả để làm test qua.
8. Bỏ thông tin pháp lý/liên hệ Sora/Bitexco mẫu tự điền khi DB trống; nhãn GHN sandbox không còn hứa tự chạy mô phỏng. Các chế độ mô phỏng vẫn mặc định tắt.

## Database và an toàn dữ liệu

Đã backup mới schema public, phục hồi vào DB local riêng rồi chạy thử hai migration; số bản ghi trước/sau giữ nguyên. Hai migration đã deploy vào **DB phát triển nhóm từ `backend/.env`**, nâng 61 → 63 migration. Không seed/reset/restore DB nhóm trong đợt này.

Đối chiếu trước/sau deploy: 67 user, 15 Shop, 30 sản phẩm, 60 đơn, 212 ledger và 100 tin nhắn; tài khoản tester mới tạo được giữ. Các con số là thời điểm triển khai, không phải hạn mức hoặc dữ liệu cố định trong UI. Backup/biên bản riêng nằm dưới `.dev-runtime/private-backups`, con trỏ `.dev-runtime/acceptance-migration-receipt.json`; không đưa lên Git vì chứa dữ liệu riêng.

Seeder tương lai đã có các cột mới; chạy lại seed hiện tại không ghi đè tiến độ hoặc tự backfill số đo giả vào sản phẩm cũ. Không cần reset lại để thử giao diện.

## Cách nghiệm thu trên web

Mở `http://localhost:5173`, dùng tài khoản/role thật đã đăng ký. Reload sau mỗi bước lưu để kiểm tra dữ liệu bền trong DB.

### 1. Sản phẩm và báo cước

- Shop vào `/merchant/products`, tạo hoặc sửa sản phẩm: nhập EAN-13 đúng trên bao bì, khối lượng sau đóng gói và dài/rộng/cao đo thực tế. Không dùng số fixture để giả làm kết quả đo.
- Thử barcode sai checksum, khối lượng 0 và kích thước thập phân: phải báo lỗi, không lưu sai.
- Đổi barcode/nội dung sản phẩm đã duyệt có thể đưa sản phẩm về hàng đợi kiểm duyệt theo quy trình sẵn có; Admin duyệt trước khi Customer mua. Thay riêng số đo đóng gói không thay nội dung quảng cáo.
- Customer mở đúng sản phẩm/phân loại đã cập nhật, thêm giỏ, chọn địa chỉ đủ ba cấp và checkout. Tổng cước phải lấy từ API; lỗi thiếu thông số/kho/địa chỉ/GHN phải hiện rõ, không tự dùng 0 hoặc phí giả.
- Sau khi đặt đơn, Shop mở form vận đơn: muốn kiểm thử chọn **GHN sandbox**, không bấm GHN LIVE nếu chưa chủ động đồng ý giao hàng thật. Sandbox không tự có tài xế, giao hàng vật lý hoặc thanh toán thật.

### 1b. Kiểm thử giao vận không gửi kiện thật (chỉ phát triển / GHN TEST)

- Theo yêu cầu nghiệm thu ngày 18/10/2026, máy phát triển bật `SHIPPING_SIMULATION_ENABLED=true` trong `.env` riêng. File `.env.example` vẫn mặc định false; môi trường `NODE_ENV=production` luôn chặn mô phỏng. Không thay DB URL, reset hoặc seed lại.
- Shop chọn **GHN sandbox**, không chọn LIVE. Trong hành trình TEST, nếu chưa có đồng hồ mô phỏng thì bấm **Bắt đầu mô phỏng giao hàng**. Mỗi mốc cách nhau một phút; tải lại trang không khởi động lại đồng hồ. Đơn TEST mới có thể bắt đầu đồng hồ ngay khi tạo vận đơn nếu cờ đang bật.
- Sau khi timeline hoàn tất (bốn phút), Shop bấm **Đồng bộ kết quả giao thử**. API `POST /api/shipping/ghn/simulation/:orderId/complete` khóa đơn trong transaction, kiểm tra quyền Shop/Admin, môi trường TEST, đồng hồ đã xong và trạng thái SHIPPING. Gọi lặp không tạo thêm thông báo hoặc lùi trạng thái. Customer không có quyền gọi API này.
- Customer tải lại Đơn mua: đơn chuyển DELIVERED để kiểm thử xác nhận nhận hàng, đánh giá sau COMPLETED hoặc mở yêu cầu đổi trả theo điều kiện hiện có. Đồng bộ giao thử **không** xác nhận đã thanh toán, giải ngân escrow, hoàn tiền hoặc đánh dấu COMPLETED.
- Đây là mô phỏng giao vận có nhãn TEST, không phải bằng chứng GHN đã vận chuyển. Không có nút mô phỏng cho LIVE hoặc khi backend tắt cờ. Đợt bổ sung sau đó đã bật riêng `RETURN_PICKUP_SIMULATION_ENABLED=true` ở máy phát triển: sau khi Customer đặt lấy hàng Staging, Shop có thể mô phỏng shipper lấy hàng rồi hàng về Shop. Không hỗ trợ provider Production, không chuyển tiền thật.
- Ghi nhận lịch sử trước đợt bổ sung KOL: 88 test backend liên quan qua, frontend 55 test qua nhưng 20 ca browser chưa được cấu hình. Kết quả mới nhất ở đầu tài liệu đã thay thế ghi nhận này; không tự gọi thao tác giao thử trên đơn của người dùng.

### 2. Hai Shop tài trợ

Đã bổ sung hai booking miễn phí `[TEST]` cho hai Shop seed đầu tiên. Đây là dữ liệu kiểm thử lưu DB, không phải chứng từ thu tiền quảng cáo. Để nghiệm thu quyền và quy trình, vẫn cần gửi/duyệt/hủy một yêu cầu mới theo các bước dưới đây.

- Mỗi Shop vào `/merchant/settings`, mục **Gian hàng tài trợ trên SCANMS**, gửi tiêu đề và lịch 1 giờ–31 ngày.
- Admin vào `/admin/affiliate-oversight?tab=sponsorship`, xét duyệt. Để kiểm thử không thu tiền, chọn **Sàn cấp miễn phí**, ghi rõ căn cứ. Không bịa mã chuyển khoản hoặc chứng từ PAID.
- Đăng xuất và xem trang chủ: chỉ các booking đã duyệt, đang trong khoảng hiệu lực mới xuất hiện. Thử từ chối, hủy, lịch tương lai/hết hạn và đổi tài khoản Shop: không được thấy hoặc sửa booking riêng của Shop khác.
- Nhấn Đóng trong form chỉ đóng, không gửi duyệt/hủy. Khi hủy gói đã thu phí, cần xử lý đối soát riêng.

### 3. Dữ liệu thật và luồng liên kết còn phải tự nghiệm thu

- KOL cập nhật kênh/ảnh/thông tin thực tế của người đồng ý tham gia; không coi URL `.invalid`, follower hoặc giấy tờ fixture là dữ liệu thật.
- KOL bắt đầu phát video qua luồng Live hiện có; không chỉ sửa enum sang LIVE hoặc tự gia hạn fixture hết hạn để gọi là đã phát.
- Kiểm tra mua hàng → voucher không chồng hai mã tiền hàng cùng Shop → nhận hàng → escrow 14 ngày → hoàn tất/đổi trả; tin nhắn Shop → chuông Customer; quyền đánh giá chỉ đơn COMPLETED.
- GHN/PayOS, hoàn tiền và payout cần bằng chứng từ môi trường tương ứng. `available=true`, số dư seed hoặc trạng thái tự nhập không chứng minh thanh toán/giao hàng thành công. Agent chưa tạo shipment hoặc gọi giao dịch chuyển tiền thật.

## API

Mọi đường dẫn dưới prefix `/api`:

| Method | Route | Quyền / nội dung |
| --- | --- | --- |
| GET | `/sponsored-placements?page=1&status=REQUESTED` | Shop: chỉ của mình; Admin/Manager: toàn sàn; phân trang 20 |
| POST | `/sponsored-placements` | Shop đã xác minh; `requestKey` UUID, headline, startsAt/endsAt ISO |
| PATCH | `/sponsored-placements/:id/review` | Admin/Manager; APPROVE/REJECT, căn cứ và thông tin cấp gói |
| PATCH | `/sponsored-placements/:id/cancel` | Chủ Shop hoặc Admin/Manager; lý do hủy |
| GET | `/stores/public/placements` | Route cũ, nay đọc thêm booking đã duyệt trong DB |
| POST/PUT | `/products` / `/products/:id` | Route cũ, nhận barcode và bốn trường package |
| POST | `/shipping/ghn/quote-address` | Route cũ, thêm items productId/variantId/quantity để BE tính kiện hàng |

Các route mới dùng JWT/roles và UUID/DTO validation; không nhận ownerId/customerId từ FE làm căn cứ phân quyền.

## File chính và cách chạy

- `backend/prisma/schema.prisma`, hai migration `20261018040000_*` và `20261018041000_*`.
- `backend/src/modules/products/product-package.ts`, DTO/service sản phẩm.
- `backend/src/modules/shipping/shipping-package.ts`, DTO/controller/GhnService và `orders.service.ts`.
- `backend/src/modules/stores/sponsorship/*`, StoresModule/StoresService.
- `backend/src/modules/referral-links/utils/qr-png.renderer.ts` và service/test QR.
- `backend/prisma/seeds/catalog.seed.ts`, `seed.audit.ts` và test audit.
- `frontend/src/components/stores/SponsoredPlacementsPanel.tsx`, `services/sponsorship.service.ts`, trang Shop Settings/Admin Oversight.
- Trang ProductManagement, GuestCheckoutModal, OrdersManagement; kiểu Product và tiện ích EAN.

Máy khác sau khi nhận code (không dùng lệnh reset):

```powershell
cd backend
npm.cmd ci
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run build
npm.cmd run start:prod
# Terminal khác, trong frontend
npm.cmd ci
npm.cmd run dev
```

Cấu hình DB/dịch vụ lấy từ file riêng do nhóm cung cấp, không commit `.env`. Giữ `SHIPPING_SIMULATION_ENABLED=false`, `RETURN_PICKUP_SIMULATION_ENABLED=false`, `MARKETPLACE_SPONSORED_PLACEMENTS=[]`; pickup dùng staging khi nghiệm thu GHN TEST.

## Kiểm thử tự động

- Regression unit BE: **1.071/1.071**, 89 suite; gồm test QR PNG thật.
- Sau khi đối chiếu giới hạn dịch vụ GHN, đã chạy lại **68/68 ca trọng tâm** shipping/checkout/pickup với kiểm tra chặn kiện từ 20 kg, rồi build BE lại thành công. Không sửa hai migration đã deploy.
- Seeder: **52/52** gồm kiểm thử PostgreSQL độc lập và vòng CLI; không áp fixture vào DB nhóm.
- HTTP tích hợp: **8/8**, JWT → DTO → controller/service → Prisma → PostgreSQL local; có lưu bao bì vào cột, chống cập nhật chéo Shop, booking lặp/phân quyền/ràng buộc chứng từ/công khai/hủy. Ranh giới báo cước hãng được stub trong ca tính kiện hàng, không gọi nhà vận chuyển thật. Metadata DB nhóm xác nhận RLS của bảng booking đã bật.
- FE: **51 test đạt, 20 browser test bỏ qua**, không được tính là 71 test chạy thành công. TypeScript và build FE/BE đạt.
- Smoke sau restart: FE 200, health UP/DB CONNECTED, public placements 200/rỗng khi chưa duyệt gói thực tế, API quản lý chưa đăng nhập trả 401.
- Công cụ trình duyệt hiện không có phiên kết nối; chưa chứng nhận kiểm tra trực quan desktop/mobile hoặc toàn bộ E2E nhà cung cấp. Checklist trên là bước nghiệm thu thủ công còn lại.

Audit chỉ đọc sau deploy: lịch sử 63 migration sạch; không lệch ví/ledger, ví từng Shop, liên kết đọc chat hoặc ghim Live. Còn **30 sản phẩm chưa có bao bì, 20 kênh `.invalid`, 0 Live đang hiệu lực, 0 Shop tài trợ đang hiệu lực, 0 phản hồi vận đơn sandbox/LIVE được lưu**. Đây là các bước nhập/thực hiện trên web của người nghiệm thu, không được lấp bằng chứng từ hoặc số liệu giả. Một lần chạy CLI timeout khi nhiều compiler chạy đồng thời; đã chạy lại đủ 52/52 thành công, không tăng timeout hay bỏ kiểm tra.

Code chưa được commit/push trong đợt này.
