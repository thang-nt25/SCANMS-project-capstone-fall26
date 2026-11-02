# Kiểm tra BIDV sandbox

Chạy trong thư mục `backend`:

```powershell
npm run bidv:check
```

Lệnh đọc `backend/.env`, tự lấy token OAuth mới rồi gọi duy nhất API
`POST /bidv/sandbox/open-banking/paygate/pobo/get-list-bank/v1`.
Nó không khởi động server, truy cập cơ sở dữ liệu hay gọi API chuyển tiền.

Cấu hình theo `backend/.env.example`:

- `BIDV_API_BASE_URL`: URL POBO sandbox của BIDV.
- `BIDV_CLIENT_ID`, `BIDV_CLIENT_SECRET`: thông tin cùng một ứng dụng đã đăng ký.
- `BIDV_CHANNEL`: Channel trong cURL Try It của ứng dụng.
- `BIDV_SANDBOX_KEY_DIR`: thư mục tuyệt đối ngoài repository, chứa
  `privateKey.key`, `certificate.crt`, `application-symmetric-key.txt`.

Khóa đối xứng gồm 64 ký tự hex (32 byte). Private key phải khớp certificate;
certificate và khóa đối xứng phải tương ứng với cấu hình ứng dụng trên BIDV.
Không đưa khóa vào mã nguồn hoặc lưu token thủ công trong `.env`.

Request dùng JWE `A256KW` / `A128GCM`; chữ ký detached JWS `RS256` ký đúng
chuỗi JSON đã mã hóa được gửi đi. `X-Client-Certificate` chứa certificate DER
mã hóa Base64. Không gửi private key ra mạng. TLS được xác minh, không theo redirect.

Dữ liệu MOMO và `kid=test-bidv-private-key` là dữ liệu mẫu từ Try It đã thử
thành công cho API danh sách ngân hàng này; không phải mã merchant chi trả của SCANMS.
Tên `kid` không quyết định khóa ký: script luôn đọc private key SCANMS từ file.

Kiểm tra ngày 02/11/2026: OAuth HTTP 200; bank list HTTP 200,
`errorCode=000`, một ngân hàng mẫu. Kết quả này xác nhận khả năng gọi API sandbox,
không xác nhận quyền chi hộ hoặc kết nối production. Chi trả thật vẫn sử dụng
hợp đồng gateway riêng. Adapter chi hộ/vấn tin BIDV Sandbox được mô tả dưới đây.

## Duyệt yêu cầu rút tiền KOL bằng BIDV Sandbox — Main Flow 5

Đặt `PAYOUT_PROVIDER=BIDV_SANDBOX` và `BIDV_SANDBOX_ENABLED=true` trong
`backend/.env`, cùng cấu hình khóa BIDV ở trên. Áp dụng migration
`20261102110000_payout_transfer_provider`, build và khởi động lại backend.
Chế độ này chỉ chạy khi `NODE_ENV` khác `production`.

1. KOL tạo yêu cầu rút tiền trong ví. Hệ thống giữ/trừ số tiền gross một lần.
2. Manager mở `/admin/finance/payouts`, chọn yêu cầu → **Duyệt chi trả** →
   **Qua API ngân hàng** → **Duyệt qua BIDV Sandbox**. Không cần bill/mã nhập trước.
3. Adapter lấy tài khoản, tên người nhận, BIN ngân hàng và số tiền net từ chính
   yêu cầu đó. Merchant/service dùng cấu hình mẫu Try It đã cung cấp. Lưu snapshot
   và payout UUID làm `X-Idempotency-Key` trước khi gửi; yêu cầu thành `PROCESSING`.
4. Quy ước kiểm thử của SCANMS: phản hồi trực tiếp HTTP 2xx, `errorCode=000`
   hoàn tất yêu cầu nội bộ (`APPROVED`). Ghi hai bút toán `FinancePosting` từ
   `PAYOUT_RESERVED` sang `BIDV_SANDBOX_BANK`/`SANDBOX_PIT_PAYABLE`, ghi `AuditLog`
   và thông báo cho KOL. Không trừ/cộng lại số dư ví. `FinancialLedger` giữ nguyên
   bút toán rút gross đã tạo. Mã `SBX-<payout UUID>` là mã nội bộ, không phải BIDVID.
5. KOL xem **Hoàn tất · Sandbox** trong lịch sử rút tiền và bảng kê.
   Email sao kê được đưa vào outbox, có nhãn Sandbox; gửi khi SMTP và scheduler
   đang hoạt động. Khi `DISABLE_SCHEDULED_JOBS=true`, email và đối soát tự động tạm
   dừng; manager vẫn dùng **Đối soát chi trả**.

Đây là thao tác cập nhật yêu cầu KOL và sổ cái trong SCANMS bằng môi trường ngân hàng
thử nghiệm. Không chuyển tiền ngoài đời; `000` không được coi là bằng chứng hạch toán
Production. Sandbox bị chặn trong `NODE_ENV=production`; provider được lưu trên từng
payout để không chuyển lẫn giữa Sandbox và gateway thật.

Timeout hoặc mã khác/không rõ giữ `PROCESSING`, không tạo bút toán hoàn tất/thông báo
nhận tiền. Vấn tin sử dụng ngày gốc đã lưu, `rootRequestId` là payout UUID, và
`type`/`terminalId=19980710` theo mẫu Try It. Mapping này là quy ước thử nghiệm.
Chỉ kết thúc qua vấn tin khi mã yêu cầu, số tiền và mã chi tiết `000` đều khớp.
Phản hồi mẫu cố định cho giao dịch khác không được duyệt. Phản hồi thành công đã lưu
có thể khôi phục bước hoàn tất khi lỗi commit, không gửi lệnh chuyển lần hai.

## Mô phỏng giao diện cục bộ

Khi chạy frontend bằng `npm run dev`, mở `/admin/finance/payouts` bằng tài khoản
System Manager/Admin, chọn **Thử quy trình chi trả → Duyệt thử**. Có ba tình huống:
thành công, chờ xử lý rồi đối soát, và thất bại. Kết quả tải xuống là JSON ghi rõ
`simulated: true`, mã bắt đầu `SIM-`; đây không phải chứng từ ngân hàng.

Mô phỏng chỉ chạy trong bộ nhớ trình duyệt, dùng giao dịch mẫu riêng, không gọi
API thanh toán, không gửi thông báo và không cập nhật payout, số dư hoặc sổ cái.
Đóng cửa sổ sẽ bỏ phiên thử. Nút mô phỏng không có trong bản build production.
Đây là kiểm tra tương tác giao diện, không phải kiểm thử chi hộ tại BIDV.

Với yêu cầu chi trả thực, nút **Duyệt chi trả** có hai cách xử lý:

- **Qua API ngân hàng**: không yêu cầu bill/mã nhập trước. Khả dụng với BIDV Sandbox
  tích hợp như trên hoặc gateway chi trả đã cấu hình đúng hợp đồng. Khi timeout, tải lại trạng thái và đối soát lệnh
  cũ; không tự gửi lại. Mã ngân hàng được hiển thị sau khi xác nhận thành công.
- **Đã chuyển khoản thủ công**: giữ yêu cầu chứng từ hợp lệ và mã tham chiếu; chỉ
  ghi nhận chuyển khoản đã thực hiện bên ngoài.

Không đặt URL BIDV trực tiếp vào `PAYOUT_GATEWAY_URL` vì hai hợp đồng API khác nhau.

## Gửi lệnh chi hộ mẫu tới BIDV Sandbox từ màn manager

Đặt `BIDV_SANDBOX_ENABLED=true` trong `backend/.env`, giữ các cấu hình BIDV ở trên,
khởi động lại backend; frontend chạy `npm run dev`. Chế độ này bị chặn khi
`NODE_ENV=production`; nút Sandbox không xuất hiện trong frontend production.

Tại `/admin/finance/payouts`, chọn **BIDV Sandbox · lịch sử thử nghiệm → Gửi giao dịch mẫu**.
Đây là công cụ chẩn đoán riêng với hộp **Duyệt chi trả**. Nếu muốn cập nhật yêu cầu
KOL, dùng luồng tích hợp ở đầu tài liệu, không dùng nút **Gửi giao dịch mẫu**.
Không yêu cầu bill hoặc mã chuyển khoản. Đây là HTTP request thật tới môi trường
Sandbox BIDV, khác nút mô phỏng cục bộ.

- Chi hộ: `POST /bidv/sandbox/open-banking/paygate/pobo/transfer-247/v1`.
- Vấn tin: `POST /bidv/sandbox/open-banking/paygate/common/inquiry/v1`.
- Người nhận/merchant dùng mẫu **Chi hộ liên ngân 247** do người dùng cung cấp.
  Số thực chi mẫu là `1864800` VND theo Flow 5 (gross `2072000`, thuế `207200`).
  Không lấy người nhận hay số tài khoản từ payout thật. Ngày gốc tự tạo theo
  `YYMMDD`, múi giờ `Asia/Ho_Chi_Minh`, được lưu và dùng lại khi vấn tin.
- `AuditLog.eventId` duy nhất giữ mã lượt gửi trước khi gọi mạng. Cùng runId chỉ
  gửi một lần, kể cả bấm đôi, timeout, khởi động lại hoặc lỗi lưu kết quả.
  Client lưu mã đang thử trong sessionStorage, tải lại kết quả thay vì tự gửi lại.
- Lịch sử giữ hai header tương quan, HTTP status, mã/mô tả BIDV đã lọc, mã chi tiết
  và BIDVID. Không lưu/hiển thị Authorization, khóa, chữ ký, JWE hay lỗi thô.
- Công cụ giao dịch mẫu này không sửa `PayoutRequest`, `FinancialLedger`, số dư, email hay thông báo
  nhận tiền của KOC. Lịch sử thử được lưu trong các action `BIDV_SANDBOX_*` riêng.

Màn Sandbox ưu tiên số tiền, người nhận mẫu và kết quả. Mở **Lịch sử xử lý** để xem
từng lần gửi/phản hồi, được gom theo mã thao tác. **Nhật ký chi tiết** giữ các sự kiện
và thời điểm gốc; mở **Các lượt thử gần đây** để chọn lượt đã lưu. Nút
**Tải lại kết quả** chỉ đọc lượt hiện tại, không gửi lại lệnh chi hộ.

Để thử vấn tin, mở **Thông tin kỹ thuật & vấn tin**, chọn rõ **X-Idempotency-Key** hoặc **X-API-Interaction-ID** làm
rootRequestId. Đây là kiểm tra giả thuyết trong Sandbox, chưa phải mapping đã
được BIDV xác nhận. `type` và `terminalId` tạm dùng nguyên mẫu `19980710` đã cung
cấp. Giao diện nói rõ điều này. Không tự đoán mapping để quyết định giải ngân.

Trạng thái lượt thử độc lập: `SENDING` (đã ghi nhận, chưa có kết quả), `NOT_SENT` (lỗi
cấu hình/OAuth trước lệnh nghiệp vụ), `UNKNOWN` (không xác định kết quả),
`VERIFY_REQUIRED` (có phản hồi, cần xác minh). HTTP 200 hoặc `errorCode=000` không
được tự chuyển thành `APPROVED`. Kết quả vấn tin chỉ ghi nhận khớp khi cả mã gốc và
số tiền khớp, và vẫn chưa xác nhận hạch toán. Còn cần phụ lục mã lỗi và xác nhận
mapping rootRequestId, type/terminalId để hoàn thiện đối soát tự động.

Các route SCANMS, chỉ SYSTEM_MANAGER/SYSTEM_ADMIN:

- `GET /api/admin/payouts/bidv-sandbox/configuration`
- `GET /api/admin/payouts/bidv-sandbox/runs` (20 lượt gần nhất)
- `GET /api/admin/payouts/bidv-sandbox/runs/:id`
- `POST /api/admin/payouts/bidv-sandbox/runs` với `{ "runId": "UUID-v4" }`
- `POST /api/admin/payouts/bidv-sandbox/runs/:id/inquiry` với
  `{ "operationId": "UUID-v4", "rootSource": "IDEMPOTENCY_KEY" }`
  (hoặc `INTERACTION_ID`). Các field tài khoản/payout từ client bị từ chối.

### Kết quả gọi trực tiếp ngày 02/11/2026

Lượt mẫu `40deea66-009b-47e3-ad48-b6c2036cfb6d` được lưu trong lịch sử Sandbox:

- Chi hộ `1864800` VND: HTTP 200, `errorCode=000`, `errorDesc=Giao dịch thành công`.
- Vấn tin thử với X-Idempotency-Key: HTTP 200, `errorCode=000`, nhưng bản ghi trả
  về có rootRequestId `REQ123456789`, amount `1000000`, BIDVID `BIDVID98765`,
  ngày hạch toán `20260429`. Mã gốc và số tiền không khớp lượt vừa gửi.
- Hệ thống giữ `VERIFY_REQUIRED`, `correlationMatched=false`, không đánh dấu
  đã giải ngân. Phản hồi này có dấu hiệu là dữ liệu mẫu; chưa chứng minh được
  trạng thái thực tế của lệnh vừa gửi hoặc mapping rootRequestId.

Backend local được khởi động lại với `DISABLE_SCHEDULED_JOBS=true` trong môi trường
tiến trình để phiên thử không chạy các tác vụ định kỳ. Giá trị này không sửa
cấu hình cron trong `.env`.

Chạy kiểm thử độc lập, không gọi mạng:

```powershell
npm run test:bidv
```
