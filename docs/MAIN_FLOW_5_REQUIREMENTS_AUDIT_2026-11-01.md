# Kiểm tra Main Flow 5 theo tài liệu người dùng — 01/11/2026

## Kết luận

**Chưa thể nghiệm thu “đúng và đủ 100%”.** Phần lớn nghiệp vụ nội bộ đã được lập trình, nhưng còn khác biệt dữ liệu, thiếu thông tin rủi ro trên màn hình duyệt chi, chưa cấu hình cổng giải ngân và chưa có bằng chứng email/ngân hàng end-to-end.

Lần kiểm tra này không sửa số dư, phiếu rút, ngày đơn, chính sách, hoặc thực hiện chuyển tiền/chi thưởng. Các truy vấn kiểm toán tài chính chạy trong transaction READ ONLY. Kiểm tra HTTP chỉ gọi GET nghiệp vụ sau đăng nhập tài khoản demo; không gọi endpoint giải ngân.

Nguồn yêu cầu: tệp `Pasted text.txt` người dùng gửi trong cuộc trò chuyện, gồm các bước 5.1–5.6. Các con số 64.800đ, 52 triệu, 2.064.800đ và 11,4% là kịch bản cần dựng từ dữ liệu có căn cứ, không phải giá trị để hardcode vào hệ thống.

## Phương pháp và bằng chứng

- Đọc code backend/frontend của escrow, FR-09, tier, wallet, tax, approval, bank adapter, email outbox, executive và audit logs.
- Chạy **32 bộ unit test, 516 tests đều đạt**. Các test dùng gateway/mailer giả lập không chứng minh ngân hàng hoặc email thật đã hoạt động.
- Kiểm tra dữ liệu và cấu hình đang dùng; chỉ báo có/không, không xuất khóa truy cập hoặc mật khẩu.
- Kiểm tra **15 HTTP GET** với SYSTEM_ADMIN, SYSTEM_MANAGER, COLLABORATOR: quyền Executive, gateway, thuế, sổ cái và audit logs đúng 200/403 mong đợi.
- Chưa chạy lại suite PostgreSQL concurrency trên database riêng: `WITHDRAWAL_TEST_DATABASE_URL` chưa cấu hình. Không dùng database dùng chung làm môi trường test phá dữ liệu.
- Chưa nghiệm thu toàn bộ thao tác trình duyệt 8–9 phút hoặc một giao dịch ngân hàng thật. Browser test hiện có dùng request interception với dữ liệu giả lập.

## Ma trận yêu cầu

| Bước | Yêu cầu | Code hiện tại | Kết luận |
| --- | --- | --- | --- |
| 5.1 | Giữ hoa hồng 7 ngày từ giao thành công | `COMMISSION_HOLD_DAYS = 7`; mốc ưu tiên deliveredAt, rồi completedAt; cron quét mỗi phút | Có, nhưng 1 commission PENDING hiện lưu thời hạn 14 ngày |
| 5.1 | Chỉ giải tỏa khi không có đổi trả/tranh chấp/thẩm định | Kiểm tra trạng thái đơn, hạn availableAt, return request, dispute và referral review trước khi chuyển PENDING → AVAILABLE | Có; unit tests đạt, chưa nghiệm thu toàn bộ dữ liệu cũ |
| 5.2 | Chốt → duyệt → cộng ví FR-09 | Ba API được triển khai; kiểm tra kỳ đã đóng theo giờ Việt Nam, nguồn doanh số, khóa giao dịch và chống trùng | Có; thiếu ngày hoàn tất vẫn bị chặn đúng thiết kế |
| 5.2 | 52 triệu, chính sách 50 triệu → thưởng cố định 2 triệu | Chọn mốc theo policy lịch sử; chỉ PAID mới cộng khả dụng; có posting MONTHLY_BONUS_REWARD | Có; dữ liệu Thảo Nhi tháng 10 là 51.871.862đ, 2 triệu đang chờ chốt |
| 5.2 | Cron 00:10 bù kỳ đóng bỏ lỡ | Scheduler duyệt các kỳ đóng và tiếp tục tính/duyệt/cộng ví chưa xong | Có; cron thực hiện cả approve/payout, không chỉ tính nháp |
| 5.2 | Xét tier từ doanh số tích lũy kỳ đóng, không tính lại snapshot đơn | Tier service dùng các kỳ đã đóng; Vàng +2% trên base 10%; commission giữ snapshot đã có | Có; 9 KOL thiếu ngày nên chưa xác nhận được hạng chính xác |
| 5.3 | KOC rút về ngân hàng đã KYC | Kiểm tra role, active, KYC VERIFIED, ngân hàng, số dư tổng và Shop, mức tối thiểu | Có; không cố định MB Bank, dùng ngân hàng trong hồ sơ thật |
| 5.4 | Row lock chống chi vượt số dư | Khóa wallet/StoreWallet bằng SELECT FOR UPDATE; trừ gross và tạo payout/ledger trong cùng transaction | Có; unit tests đạt, lần kiểm tra này chưa chạy lại concurrent PostgreSQL test |
| 5.4 | Gross ≥2 triệu thì khấu trừ 10% | PayoutTaxService tính Decimal, snapshot gross/tax/net khi tạo lệnh | Đúng cho lệnh mới; 3 phiếu PENDING cũ dưới 2 triệu vẫn đang ghi thuế 10% |
| 5.4 | Trạng thái chờ duyệt | PENDING; sau gửi gateway có PROCESSING; chỉ xác nhận thành công mới APPROVED | Có, không cần enum PENDING_ADMIN_APPROVAL riêng |
| 5.5 | SYSTEM_MANAGER/SYSTEM_ADMIN xem gross, tax, net và duyệt | Có bảng quản trị, chứng từ UNC, ghi nhận chuyển khoản thủ công, nhánh chuyển qua gateway | Có phần nội bộ; nhánh ngân hàng chưa sẵn sàng vì thiếu cấu hình |
| 5.5 | “100% an toàn” / chỉ số rủi ro theo lệnh | Có các chốt kiểm tra KYC, chủ tài khoản, nguồn tiền; bảng payout không có trường/cột score rủi ro | **Thiếu so với mô tả**; không nên thay bằng số 100% hardcode |
| 5.5 | Napas 24/7 tự giải ngân | Có adapter HTTPS /transfers, Idempotency-Key, lease, đối soát timeout và kiểm tra receipt | **Chưa cấu hình/kết nối nhà cung cấp**; không có bằng chứng Napas thật |
| 5.5 | Thông báo, email sao kê sau chi | Có PAYOUT_COMPLETED và scheduler email mỗi 5 phút | Có code; SMTP có credential nhưng chưa có bằng chứng gửi email payout thành công |
| 5.5–5.6 | Sổ bất biến, kế toán kép, AuditLog | FinancialLedger append-only; FinancePosting debit/credit; trigger DB chặn sửa/xóa/truncate các sổ | Có cơ chế, **nhưng tổng sổ hiện không khớp số dư ví** |
| 5.6 | Executive chỉ cho SYSTEM_ADMIN | Backend chặn SYSTEM_MANAGER/KOC bằng 403; frontend có tab tài chính riêng | Đã xác minh HTTP thật |
| 5.6 | GMV, tỷ lệ chi phí/doanh thu, thuế | API đọc dữ liệu thật, có màn hình và báo cáo tháng | Có; tỷ lệ hiện 28,04%, không đáp ứng trạng thái demo dưới 15%; phạm vi tử/mẫu cần chuẩn hóa |
| 5.6 | Audit logs giám sát hành động | Có GET/filter/pagination; ADMIN và MANAGER đọc được, KOC bị từ chối | Có, đã xác minh HTTP |

## Các vấn đề cần xử lý trước khi nghiệm thu

### 1. Sổ kế toán toàn hệ thống chưa khớp ví — ưu tiên cao

API đối soát trả `balanced=false`:

| Tài khoản | Số dư ví / nguồn đối chiếu | Số dư sổ | Chênh lệch sổ − ví |
| --- | ---: | ---: | ---: |
| PARTNER_EARNINGS_PAYABLE | 101.368.008 | 132.228.008 | **30.860.000** |
| AFFILIATE_ESCROW | 84.000 | 4.856.000 | **4.772.000** |
| CUSTOMER_FUNDS | 209.698.999 | 209.698.999 | 0 |
| PAYOUT_RESERVED | 4.500.000 | 4.500.000 | 0 |

Việc 15 ví KOL đã khớp các Shop trong lần đối soát trước **không đồng nghĩa** số dư kế toán toàn sàn đã khớp. Cần truy nguồn số dư đầu kỳ, posting cũ và các bút toán điều chỉnh. Không được xóa posting hoặc thêm số bù tùy ý chỉ để chỉ báo chuyển thành “khớp”.

Nguồn: `backend/src/modules/payouts/finance-report.service.ts:315`; bản chụp dữ liệu READ ONLY.

### 2. Một dữ liệu escrow còn dùng 14 ngày — khác chính sách 7 ngày

- Đơn `DH-2026-2E3E2079`, commission `91d2849d-6e01-463f-a5e4-80315a07c629`, KOL Yến Nhi, 28.000đ.
- eligibleAt: 01/11/2026 13:33:00 giờ Việt Nam.
- availableAt: 15/11/2026 13:33:00 giờ Việt Nam.
- Chênh lệch **336 giờ = 14 ngày**, không phải 168 giờ. Không có return request hoặc cờ referral review tại thời điểm đọc.
- Hai commission PENDING còn lại có đúng 168 giờ. Đây là bất nhất của bản ghi đang lưu, không phải hằng số hiện tại: code đã đặt 7 ngày.

Cần xác định nguồn tạo bản ghi/migration chính sách trước khi hiệu chỉnh deadline có audit; chưa thay đổi trong lần kiểm tra này.

Nguồn code: `backend/src/modules/commissions/commission.constants.ts:3`, `backend/src/modules/commissions/commissions.service.ts:232` và `:275`.

### 3. Ba phiếu rút cũ không theo ngưỡng thuế của tài liệu

Cả ba phiếu PENDING sau đang có gross **1.500.000đ**, tax **150.000đ**, net **1.350.000đ**:

- `49ccbe8d-b932-4329-89db-c4f5b62336de`.
- `e51b2538-957f-4ac6-a29d-5f4cf6b06bc2`.
- `19db97ce-524a-4895-95a8-4c6c01246f80`.

Theo chính sách trong tài liệu, dưới 2 triệu phải là tax 0/net bằng gross. Code tạo yêu cầu mới tính đúng; các phiếu lịch sử giữ snapshot cũ và nhánh duyệt không tự chuyển snapshot sang quy tắc mới. Cần quy trình rà soát/điều chỉnh phiếu demo trước khi dùng chúng chứng minh chính sách mới, không âm thầm sửa phiếu cũ.

Đã gọi hàm tính thuế hiện tại với đúng ví dụ: **2.064.800 → thuế 206.480 → thực nhận 1.858.320**. Đây là kiểm tra theo quy tắc đặc tả, không phải thẩm định hiệu lực pháp luật thuế.

Nguồn: `backend/src/modules/payouts/payout-tax.service.ts:5`, `backend/src/modules/payouts/payouts.service.ts:46`.

### 4. Chưa có cổng chuyển tiền để chạy bước Napas thật

- `GET /api/admin/payouts/gateway` trả `configured=false` cho cả ADMIN và MANAGER.
- Chưa có đủ PAYOUT_GATEWAY_URL/PAYOUT_GATEWAY_TOKEN trong môi trường đang dùng.
- PayoutTransferService là hợp đồng kết nối gateway tổng quát, không tự nó là tích hợp Napas đã được cấp quyền/kiểm thử.
- Giao diện chỉ hiện nút chuyển qua ngân hàng khi cấu hình có sẵn. Quy trình tải UNC/xác nhận đã chuyển thủ công không phải tự giải ngân Napas.
- Có 4 payout APPROVED kèm bank reference đang lưu, nhưng **0 BANK_PAYOUT_COMPLETED audit**. Không lấy dữ liệu demo APPROVED làm bằng chứng tiền đã vào tài khoản ngân hàng.

Cần nhà cung cấp sandbox, credential, kiểm thử SUCCEEDED/FAILED/timeout/reconcile/idempotency và bằng chứng nhận tiền. Không gọi chuyển tiền thật trong lần audit này.

Nguồn: `backend/src/modules/payouts/payout-transfer.service.ts:23`, `:58`, `:154`, `:204`; `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx:465`.

### 5. Chưa có chỉ số rủi ro payout như mô tả; email chưa nghiệm thu

- Bảng admin có KOL, ngân hàng, gross/tax/net và trạng thái, nhưng không có trường/ô rủi ro gian lận theo từng lệnh như “100% an toàn”. Các validation KYC/nguồn tiền có thật, nhưng không tương đương một score có căn cứ.
- Cần xác định tiêu chí rủi ro, nguồn dữ liệu và cách hiển thị. Không thêm nhãn 100% an toàn tĩnh để làm giống kịch bản.
- Mailer và outbox payout đã có, credential email có cấu hình. DB hiện có **0 PAYOUT_COMPLETED notification**, **0 bản ghi emailSentAt** cho payout; chưa chứng minh chuỗi chi thành công → thông báo → email được gửi/nhận.
- Không kết luận mailer hỏng chỉ vì chưa có sự kiện payout mới. Cần test với hộp thư kiểm thử được phép sau một payout sandbox thành công.

Nguồn: `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx:325`, `backend/src/modules/payouts/payout-email.scheduler.ts:13`, `:48`; `backend/src/modules/auth/mail.service.ts:52`.

### 6. Tỷ lệ tài chính chưa cùng phạm vi doanh thu/chi phí

Executive hiện trả GMV/doanh thu **444.854.147đ**, chi phí KOC **124.732.008đ**, tỷ lệ **28,04%** — không phải 11,4% và không dưới 15%.

Trong code, doanh thu chỉ lấy đơn COMPLETED, nhưng commission lấy mọi trạng thái khác REVERSED, gồm cả các đơn DELIVERED. Dữ liệu hiện có **62.652.845đ commission của 356 đơn DELIVERED** trong tử số mà doanh thu các đơn đó không nằm trong mẫu số. Cần thống nhất thời điểm ghi nhận hoặc tách rõ chi phí phát sinh/chưa ghi nhận doanh thu trước khi dùng tỷ lệ này để kết luận “an toàn dưới 15%”. Không ép dữ liệu hoặc hardcode tỷ lệ 11,4%.

Nguồn: `backend/src/modules/payouts/finance-report.service.ts:135`, `:140`, `:187`; `frontend/src/components/wallet/FinanceReports.tsx:180`.

### 7. Giới hạn dữ liệu và hồ sơ thuế vẫn còn

- 249 đơn COMPLETED của 9 KOL thiếu completedAt: giữ nguyên theo lựa chọn người dùng trước đó, hiện được đánh dấu chưa đủ dữ liệu xác nhận kỳ/hạng.
- Ví Thanh Huyền vẫn khóa để đối soát phiếu Sora và nguồn tiền Aura theo lựa chọn của người dùng; không được xem đây là tài khoản đã sẵn sàng giải ngân.
- Báo cáo thuế các payout đã duyệt tháng 10 có **1 đối tác thiếu mã số thuế**. Số tiền tổng hợp có, nhưng hồ sơ phục vụ quyết toán còn cần hoàn thiện.
- Thảo Nhi có doanh số tích lũy kỳ đóng 70.114.573đ → Vàng; riêng tháng 10 có 51.871.862đ → dự kiến thưởng 2 triệu. DB chưa có MonthlyBonusResult tại thời điểm kiểm tra, nên chưa có bằng chứng giao dịch PAID của khoản này.

## Những chỗ đặc tả cần sửa cho nhất quán

1. Sơ đồ ASCII ghi “nhận 2 triệu + thăng HẠNG BẠC”, trong khi bước 5.2/bảng chính sách ghi 52 triệu → **Vàng 12%**. Bạc là 20 đến dưới 50 triệu.
2. API giải ngân hiện là **POST /api/payouts/:id/approve**, không phải `/api/v1/payouts/:id/approve`.
3. Tạo lệnh rút gửi **gross 2.064.800đ**. **1.858.320đ** là net ngân hàng trả, không phải số nhập vào ô yêu cầu rút; sơ đồ đang dễ gây hiểu nhầm.
4. “Tự cộng thưởng” cần ghi rõ sau bước payout hoặc cron xử lý, không phải vừa bấm tính thưởng là đã cộng ví. Thưởng và xét tier độc lập; không cộng tiền thưởng vào GMV để xét hạng.
5. `FinancialLedger` lưu biến động ví; **FinancePosting** mới lưu debit/credit kế toán kép. Nên phân biệt hai lớp này trong phần thuyết trình.
6. “100% an toàn”, “11,4%”, “ting ting tiền về” chỉ được nói khi có dữ liệu/bằng chứng tương ứng, không dùng làm nhãn bảo đảm mặc định.

## Thứ tự hoàn thiện đề xuất

1. Đối soát phần chênh sổ kế toán; xử lý có kiểm soát một deadline 14 ngày và ba snapshot thuế cũ.
2. Chuẩn hóa phạm vi tỷ lệ chi phí/doanh thu và làm rõ trạng thái rủi ro payout.
3. Hoàn thiện hồ sơ thiếu ngày/MST bằng chứng từ; giữ khóa trường hợp chưa đủ căn cứ.
4. Kết nối gateway sandbox; chạy một luồng thật từ giữ tiền → giải ngân → receipt → notification/email → tax/audit/reconciliation.
5. Chạy PostgreSQL concurrency test trên DB riêng và nghiệm thu giao diện theo từng vai trò. Dùng tài khoản/kỳ demo riêng nếu cần đúng bộ số 64.800 + 2.000.000, không sửa số dư KOL đang dùng để ép khớp ví dụ.

## Bằng chứng cục bộ

Trong `artifacts/flow5-audit/` (Git ignored):

- `main-flow5-requirements-unit-20261101.json`: 32 suites, 516 tests đạt.
- `main-flow5-requirements-readonly-20261101.json`: cấu hình đã ẩn giá trị nhạy cảm, số liệu tài chính, chênh lệch sổ, trigger và thống kê dữ liệu.
- `main-flow5-http-roles-20261101.json`: 15 HTTP permission checks.
- `all-kol-finance-verified-20261101.json`: bằng chứng đối soát ví và cấp bậc từ lần sửa trước; không thay thế đối soát sổ kế toán toàn hệ thống ở lần này.
