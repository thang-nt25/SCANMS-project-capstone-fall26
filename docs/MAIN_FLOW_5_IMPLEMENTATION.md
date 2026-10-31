# Main Flow 5 — Triển khai và vận hành

Trạng thái sau sửa audit: [MAIN_FLOW_5_COMPLETION.md](MAIN_FLOW_5_COMPLETION.md). Database dự án đã áp dụng đủ 5 migration Flow 5 ngày 31/10/2026; sổ đối ứng khớp cả 4 nguồn số dư khi kiểm tra chỉ đọc sau migration.

## Phạm vi đã triển khai

- Escrow theo chính sách hiện có của repo: cơ sở 14 ngày và lịch Lễ/Tết. Chặn giải tỏa khi yêu cầu đổi trả còn mở; đổi hàng hoàn tất được bảo lưu hoa hồng. Tiếp tục dùng engine reversal/clawback hiện có.
- FR-09 giữ công thức lũy tiến đã cấu hình: thưởng đạt mốc cao nhất cộng thưởng theo từng khoảng doanh số. Không cộng FR-09 vào từng đơn hàng.
- Doanh số thưởng là tiền hàng sau giảm giá, loại phí vận chuyển, trừ hoàn trả theo tỷ lệ khi chưa có tách phần tiền hàng/phí ship. Loại đơn tự mua cùng tài khoản. Kỳ tháng theo Asia/Ho_Chi_Minh, dựa trên completedAt.
- Chỉ quyết toán kỳ đã kết thúc. Quyết toán thủ công giữ ba bước tính → duyệt → cộng ví; tác vụ 00:10 hằng ngày quét các kỳ đã đóng từ tháng có đơn đầu tiên và tiếp tục các kết quả chưa cộng ví. Unique key kỳ/Store/KOC và khóa giao dịch chống cộng trùng. Hoàn tiền và cộng thưởng dùng chung khóa; điều chỉnh dựa trên snapshot chính sách gốc.
- Cấp bậc dựa trên doanh số sạch tích lũy đến hết tháng đã đóng. Đối soát hằng ngày và khi xem trạng thái; bảng ngưỡng lấy từ database, không hardcode ví dụ 52 triệu lên Bạc. Theo bảng chuẩn, 52 triệu đủ hạng Vàng nếu ngưỡng Vàng là 50 triệu.
- Payout tối thiểu mặc định 200.000đ, cấu hình MIN_PAYOUT_AMOUNT. Giữ tiền gross tại thời điểm tạo yêu cầu; thuế theo đặc tả: 0 dưới 2 triệu, 10% từ 2 triệu, làm tròn 2 chữ số. Snapshot lịch sử không bị tính lại.
- Rút tổng hợp nhiều Store phân bổ ledger về từng nguồn thu nhập. Từ chối yêu cầu phục hồi chính xác từng nguồn, dưới khóa payout và khóa ví.
- Duyệt chi thuộc SYSTEM_MANAGER/SYSTEM_ADMIN. Shop chỉ xem các khoản chi thuộc Store, không duyệt/từ chối/xuất lô. Bỏ đường duyệt Shop cũ; /merchant/payouts chuyển về báo cáo.
- Chuyển khoản qua adapter HTTPS có idempotency key, đối chiếu số tiền/mã yêu cầu/tiền tệ; timeout giữ PROCESSING và tiền đã giữ, không tự gửi lại POST. Đối soát tự động mỗi 2 phút và nút đối soát GET.
- Xác nhận chuyển khoản thủ công yêu cầu ảnh chứng từ hợp lệ và mã ngân hàng thật. Không phát sinh mã ngân hàng giả. Đường xác nhận này là nhân viên đối soát chứng từ, không tự gọi ngân hàng.
- Sổ đối ứng finance_postings: hoa hồng, giải tỏa Escrow, clawback, reserve, bank payout, thuế phải nộp, hoàn reserve, thưởng tháng và tiền mua hàng. Mỗi dòng có debit/credit bằng nhau và eventKey duy nhất. Trigger cấm UPDATE/DELETE/TRUNCATE; sửa sai bằng bút toán đối ứng. FinancialLedger ghi từng biến động ví. Có số dư mở đầu tại cutover và API đối chiếu ví/sổ đối ứng.
- Thông báo trong ứng dụng ở giao dịch hoàn tất. Email sao kê dùng notification làm durable outbox, gửi mỗi 5 phút, retry sau 1 giờ nếu thất bại. Có thể lặp email nếu SMTP đã nhận nhưng tiến trình chết trước commit; không lặp chuyển khoản.
- Executive Dashboard, báo cáo Store, tab Escrow và bảng kê KOC dùng database. Không còn số tiền/đơn mẫu trong tab Escrow.
- Bảng kê chi trả có thể in/lưu PDF từ trình duyệt, escape nội dung bằng textContent. Đây là bảng kê nội bộ, không tự nhận là chứng từ thuế điện tử có giá trị pháp lý.
- Nạp tiền demo mặc định bị khóa; chỉ bật ALLOW_DEMO_WALLET_TOPUP=true ở môi trường không phải production.

## Đường dẫn giao diện

| Vai trò | Đường dẫn |
|---|---|
| KOC | /collaborator/wallet — số dư, yêu cầu rút, ledger và bảng kê |
| Shop Manager | /merchant/promotions?tab=commission-rules — FR-09; /merchant/wallet — báo cáo |
| Kế toán vận hành | /admin/finance/payouts hoặc /admin/payouts — chi trả, Escrow |
| System Admin | /admin/analytics?tab=finance — Executive Finance; /admin/audit-logs |

## Migration bắt buộc trước khi chạy bản mới

Các migration mới: `20261031090000_flow5_finance_postings`, `20261031100000_flow5_integrity`, `20261031101000_flow5_shopping_bucket`, `20261031102000_flow5_opening_balances`, `20261031103000_flow5_finance_documents`.

Trong backend, sau khi kiểm tra đúng DATABASE_URL:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run build
```

Đã kiểm thử trên PostgreSQL riêng rồi áp dụng đủ 5 migration vào database dự án. Với Supabase, lệnh migrate dùng DIRECT_URL/session connection đã cấu hình; không dùng transaction pool 6543 cho migration. Không chạy db push/seed/reset trên database dự án.

Không sửa lịch sử tiền/thuế cũ. Cutover thêm các bút toán phân loại số dư và số dư mở đầu, không giả lập lại lịch sử doanh thu. SHOPPING dành cho nạp/mua/hoàn tiền; AVAILABLE/PENDING dành cho thu nhập. `earningsReviewRequired` giữ các số dư cũ chưa chắc nguồn để đối soát, không cho rút.

## Cổng chi trả ngân hàng

Repo không có SDK/hợp đồng giải ngân trực tiếp MB/Napas. Adapter cần một cổng chi trả doanh nghiệp thực sự triển khai hợp đồng dưới đây; không thể chỉ nhập endpoint PayOS thu tiền rồi coi là giải ngân.

```dotenv
PAYOUT_GATEWAY_URL=https://your-corporate-payout-gateway.example
PAYOUT_GATEWAY_TOKEN=server-side-secret
```

POST {base}/transfers, Authorization: Bearer TOKEN, Idempotency-Key: payout UUID.

```json
{"payoutId":"UUID","amount":"1864800.00","currency":"VND","bankName":"MB","accountNumber":"001234","accountName":"NGUYEN VAN A","description":"SCANMS UUID"}
```

GET {base}/transfers/{payoutId} dùng cùng xác thực để đối soát, không gửi lại lệnh chi.

Phản hồi cả hai phương thức:

```json
{"payoutId":"UUID","amount":"1864800.00","currency":"VND","status":"SUCCEEDED","bankRefCode":"FT123456"}
```

status: SUCCEEDED / PROCESSING / FAILED. Chỉ FAILED rõ ràng mới quay về PENDING; mọi lỗi HTTP/timeout/receipt sai giữ PROCESSING. Gateway bắt buộc chống chi trùng theo payoutId, kể cả POST lại sau một FAILED; nếu muốn retry giao dịch thất bại phải xác nhận chính sách idempotency của provider. Không cấu hình gateway thì UI dùng xác nhận chứng từ chuyển khoản thủ công.

SMTP dùng GMAIL_USER/GMAIL_PASS hoặc SMTP_USER/SMTP_PASS theo MailService hiện có. Không gửi email thật trong kiểm thử.

## Giới hạn dữ liệu và tích hợp ngoài

- Có nguồn nhập COGS và giá vốn mẫu theo chứng từ thực tế qua `finance-costs` và giao diện kế toán. Báo cáo chỉ tính lợi nhuận khi đủ nguồn chi phí; phần thiếu trả null. Đây không phải phân hệ procurement/ERP.
- Thuế 10%/ngưỡng 2 triệu là chính sách tài liệu dự án; chưa xác minh luật hiện hành hoặc tích hợp nhà phát hành chứng từ thuế điện tử.
- Tích hợp ngân hàng được kiểm thử bằng gateway giả lập; chưa chuyển tiền thật. Chưa có thông tin gateway production để xác minh hoạt động thực tế.
- Các chỉ số Executive là lũy kế, theo đơn COMPLETED; doanh thu hàng hóa loại cước và trừ hoàn trả. Chi phí tiếp thị gồm hoa hồng chưa đảo và thưởng đã cộng sau điều chỉnh. Có báo cáo thuế theo tháng Việt Nam và CSV. Đây không phải số dư tài khoản ngân hàng.
- Không refactor các Main Flow khác hoặc thay đổi toàn bộ nhận diện doanh nghiệp trong AGENTS.md.

## Kiểm thử

Kết quả xác minh sau audit được cập nhật trong MAIN_FLOW_5_COMPLETION.md. PostgreSQL local riêng có 7 bài tích hợp; browser Customer và Flow 5 desktop/mobile, bảng kê đã chạy đạt. API browser được giả lập. Ảnh QA nằm trong artifacts/flow5 (không đưa vào Git). Không dùng kết quả kiểm thử để khẳng định tích hợp ngân hàng thật đã hoạt động.

- Unit: thuế ở hai phía ngưỡng, Decimal, snapshot, giữ tiền, bank timeout, phản hồi sai, idempotency, phân quyền, scheduler, cấp bậc và Escrow.
- PostgreSQL riêng: rút đồng thời, rollback khi bút toán lỗi, từ chối đồng thời, nguồn nhiều Store, chi ngân hàng đồng thời, trigger sổ bất biến, FR-09 cộng một lần và hạng Vàng tại 52 triệu.
- Browser: desktop/mobile, số liệu thật từ hợp đồng API, trạng thái lỗi/rỗng, phân trang Escrow, modal duyệt chi và bảng kê in có chống chèn HTML. API trong bài browser được mock, không gửi tiền thật.

```powershell
# Trong backend, chỉ dùng database local riêng có tên kết thúc _test:
$env:WITHDRAWAL_TEST_DATABASE_URL='postgresql://USER@127.0.0.1:PORT/scanms_flow5_test'
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/payouts/flow5.postgres.integration.spec.ts

# Trong frontend, chạy Vite local trước:
$env:FLOW5_UI_TEST_URL='http://127.0.0.1:5179'
node --test tests/flow5-finance.browser.test.mjs
```
