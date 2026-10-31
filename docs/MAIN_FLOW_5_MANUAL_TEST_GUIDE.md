# Hướng dẫn test Main Flow 5 trên SCANMS

> **Đã có bộ dữ liệu để bấm thử ngay:** xem [FLOW5_WEB_DEMO_DATA.md](FLOW5_WEB_DEMO_DATA.md) để lấy tài khoản TEST, mã đơn 3/8/15 ngày và kỳ thưởng 09/2026. Những mô tả “chưa có dữ liệu đủ tuổi” phía dưới là điều kiện chung, không còn là trở ngại với bộ fixture này.

Hướng dẫn theo mã hiện tại và chuẩn cập nhật ở đầu hai tài liệu Blueprint/Master Plan. Frontend mặc định `http://localhost:5173`, backend `http://localhost:3000/api`. Nếu máy chạy cổng khác, thay địa chỉ tương ứng.

## 1. Chuẩn bị trước khi bấm thử

Mở các profile trình duyệt khác nhau để không ghi đè phiên đăng nhập:

| Profile | Vai trò | Dùng để làm gì |
| --- | --- | --- |
| A | CUSTOMER | Đặt hàng qua link KOC, theo dõi và yêu cầu đổi trả |
| B | COLLABORATOR | Theo dõi ví, cấp bậc, yêu cầu rút và tải bảng kê/chứng từ |
| C | SHOP_MANAGER của Store thử | Xử lý đơn, cấu hình/chốt thưởng, xem P&L |
| D | SYSTEM_MANAGER | Duyệt KYC, xem Escrow, thẩm định rủi ro và duyệt/từ chối payout |
| E | SYSTEM_ADMIN | Xem tài chính toàn hệ thống và AuditLog; có quyền kế thừa duyệt payout |

Bạn dùng tài khoản đã có của dự án. Hướng dẫn này không tạo tài khoản hay công bố mật khẩu. Cần có một KOC **đang hoạt động, KYC VERIFIED, ngân hàng đã được thẩm định**, có hợp tác với Store; một sản phẩm đã duyệt, có tồn kho; người mua khác KOC.

**Điều kiện thời gian rất quan trọng:**

- Commission được tạo khi đơn DELIVERED/COMPLETED; cron đối soát chạy mỗi phút nếu `DISABLE_SCHEDULED_JOBS` không bật.
- Escrow mới chờ **7 ngày lịch từ deliveredAt**. Đơn giao hôm nay không thể rút hoa hồng ngay.
- FR-09 chỉ chốt **tháng đã kết thúc theo giờ Việt Nam**; chính sách đầu tháng áp dụng cả kỳ. Mốc tạo hôm nay không có hiệu lực ngược về tháng trước.
- Scheduler 00:10 có thể đã chốt/duyệt/cộng thưởng kỳ cũ trước lúc bạn mở màn hình. Nếu kết quả đã PAID, kiểm tra không cộng trùng thay vì cố tạo lần hai.
- Nạp Demo ở Ví mua sắm **không tạo thu nhập KOC được rút**. Không dùng số dư Demo mua sắm để thay cho test tiền hoa hồng.

Nếu hiện chưa có đơn đủ tuổi hoặc kỳ cũ có chính sách hợp lệ, bạn test được giao diện, mô phỏng thưởng và các điều kiện từ chối; phần giải tỏa/thưởng toàn luồng cần dữ liệu kiểm thử tách biệt. Không sửa đồng hồ máy, availableAt hay số dư database dự án để giả vờ đã vượt qua điều kiện. Không backdate một mốc vừa tạo rồi coi là chính sách lịch sử đã có từ đầu kỳ.

## 2. Những trang cần mở

| Người dùng | Địa chỉ hiện tại |
| --- | --- |
| Customer đặt mua | `/marketplace`, sau đó dùng Smart Link hoặc coupon KOC |
| Đơn Customer | `/customer/orders` |
| Ví Customer | `/customer/wallet` |
| Ví KOC | `/collaborator/wallet` |
| Hạng KOC | `/collaborator/profile?tab=tiers` (đường `/collaborator/tiers` cũng chuyển tới đây) |
| Shop đơn hàng | `/merchant/orders` |
| Shop thưởng tháng | **`/merchant/promotions?tab=commission-rules`** |
| Shop báo cáo tài chính | `/merchant/wallet` |
| Shop đổi trả | `/merchant/returns` |
| Manager/Admin chi trả | `/admin/finance/payouts` |
| Admin tài chính điều hành | `/admin/analytics`, chọn tab tài chính |
| Admin audit | `/admin/audit-logs` |

Ví dụ mở `http://localhost:5173/merchant/promotions?tab=commission-rules`. Đường `/merchant/commissions` được nhắc trong kịch bản cũ không phải route đang đăng ký; tránh dùng đường đó để kết luận tính năng mất.

## 3. Test tiền đầu vào trước Flow 5

### TC01 — Đặt đơn có hoa hồng đúng

1. KOC tạo/lấy link hoặc coupon đã được cấp cho sản phẩm Store đang hợp tác.
2. CUSTOMER khác KOC mở link, thêm sản phẩm và thanh toán qua hình thức dự án đang hỗ trợ. Nếu chỉ muốn kiểm tra luồng đơn mà không chuyển tiền thật, dùng COD theo quy trình hiện có; không coi đơn COD đã đặt là tiền ngân hàng đã thu.
3. Shop xử lý đơn và giao hàng qua luồng GHN hiện có. Trạng thái phải thực sự đến DELIVERED, không chỉ có mã vận đơn.
4. Chờ cron khoảng 1–2 phút, KOC mở ví; Manager vào tab Escrow ở trang chi trả.
5. Kiểm tra đơn gắn đúng KOC/Store và tiền pending đúng chính sách đã snapshot.

Ví dụ đối chiếu, nếu có đúng dữ liệu này:

| Dữ liệu | Kết quả |
| --- | --- |
| Giá hàng 450.000đ, coupon 10%, Deal 16%, không Live | Giá hàng sau giảm 405.000đ; hoa hồng **64.800đ** |
| Campaign 14%, tier Đồng 10%, không Deal/Live | Lấy 14%, không cộng thành 24% |
| Deal 16%, Campaign 14%, tier 12%, Live +2% | Lấy max là 16%, cộng Live thành 18% |
| Deal 25%, Live +3% | Trần cuối 25% |

Phí vận chuyển không nằm trong cơ sở tính hoa hồng. Nếu ví có các đơn khác, so sánh **chênh lệch trước/sau hoặc bút toán của riêng đơn**, không đòi toàn ví bằng 64.800đ.

### TC02 — Tự mua và đơn nghi trùng danh tính

- KOC tự mua bằng chính tài khoản/link của mình: phần hoa hồng phải 0; không tạo thêm tiền rút.
- Nếu trùng địa chỉ đầy đủ hoặc ngân hàng đã xác minh nhưng chưa có căn cứ chắc chắn: đơn bị gắn cần thẩm định, tiền vẫn pending, không tự kết luận gian lận.
- Manager vào `/admin/finance/payouts` → tab Escrow: tìm đơn có form **Tạm giữ để thẩm định tự mua**, nhập lý do ít nhất 10 ký tự.
- Chọn **Xác nhận hợp lệ**: gỡ điều kiện review, nhưng vẫn phải đủ 7 ngày và không còn claim mới giải tỏa.
- Dùng **một đơn thử khác**, chọn **Xác nhận tự mua**: thu hồi pending về 0 cho đơn đó, có AuditLog. Gửi lại kết luận không được thu hồi lần nữa.
- SHOP_MANAGER/CUSTOMER/KOC không được tự kết luận thay chuyên viên. Không tạo rủi ro giả trên một đơn thật chỉ để thấy form.

## 4. Bước 5.1 — Escrow

### TC03 — Chưa đến hạn

1. KOC mở ví; Manager mở tab Escrow.
2. Với đơn mới giao không có claim, kiểm tra tiền nằm pending, ngày dự kiến giải tỏa tính theo 7 ngày lịch.
3. Tiền này chưa làm tăng available và chưa thể rút.

Hiện nhãn tab quản trị còn có chữ **“14 ngày SLA”** cũ trong `AdminFinancePayoutsPage.tsx`. Đó là nhãn UI chưa đồng bộ; đối chiếu giá trị 7 ngày từ báo cáo/API và availableAt của bản ghi mới. Bản ghi tạo trước đợt đổi chính sách vẫn giữ availableAt cũ, không bị tự rút ngắn. Ghi nhãn cũ thành phát hiện UI, không coi toàn bộ Escrow đang tính 14 ngày.

### TC04 — Đến hạn và không bị giữ

1. Dùng đơn kiểm thử đã giao đủ 7 ngày, không claim/dispute/review và chưa được giải tỏa.
2. Ghi lại pending/available; chờ cron khoảng 1–2 phút, tải lại.
3. Pending giảm X, available tăng X; commission sang APPROVED. AVAILABLE là bucket ví, không nhất thiết là tên trạng thái commission.
4. Tải lại nhiều lần: không được cộng thêm lần nữa; lịch sử ghi chuyển bucket có reference đúng.

### TC05 — Đổi trả/tranh chấp

- Với đơn chưa hết Escrow, Customer gửi yêu cầu đổi trả hợp lệ. Khi đang mở claim/dispute, tiền không được giải tỏa dù availableAt đã qua.
- Chọn nhánh **đổi hàng** trên một đơn thử: sau đổi hàng hoàn tất và đóng claim, hoa hồng được bảo lưu; nếu đủ tuổi thì được giải tỏa.
- Chọn nhánh **hoàn tiền** trên đơn khác: sau hoàn tiền được xác nhận qua quy trình thực tế, hoa hồng bị thu hồi; ví Customer nhận khoản hoàn tương ứng hình thức xử lý. Không xem nút tạo yêu cầu hoàn là đã hoàn thành hoàn tiền.
- Đơn đã giải tỏa rồi hoàn tiền: available earnings bị điều chỉnh; nếu dẫn đến nghĩa vụ thu hồi/âm số dư thì không được rút thêm. Đã có payout pending cần được đối soát, không được bỏ qua nghĩa vụ thu hồi để duyệt.

## 5. Bước 5.2 — FR-09 và cấp bậc

### TC06 — Mô phỏng chính sách

1. Shop vào `/merchant/promotions?tab=commission-rules`.
2. Chọn **Thêm bậc thưởng**, nhập tên, ngưỡng 50.000.000đ.
3. Cách thưởng **Số tiền cố định**, nhập 2.000.000đ rồi lưu. Chỉ thực hiện nếu Store thử chưa có cùng ngưỡng; không xóa mốc đang dùng của Store thật để tạo lại.
4. Trong khu vực mô phỏng nhập doanh số 49.999.999đ → 0; 50.000.000đ và 52.000.000đ → 2.000.000đ.
5. Với chính sách thử phần trăm (nên dùng Store thử riêng), ngưỡng 50 triệu, cố định 0, tỷ lệ 2%: 52 triệu → **1.040.000đ**; không phải 40.000đ.
6. Đảm bảo mô phỏng không cộng số dư ví. Preview phản ánh chính sách đang cấu hình; quyết toán kỳ thật dùng chính sách đầu kỳ nên có thể khác preview sau khi sửa giữa tháng.

### TC07 — Chốt, duyệt và cộng ví

Điều kiện: có tháng đã đóng, chính sách có từ đầu kỳ, KOC có hợp tác, đơn COMPLETED của kỳ đó, không vướng review, doanh thu sạch đủ mốc.

1. Shop chọn đúng tháng/năm; chọn KOC trong bảng đội ngũ.
2. Kiểm tra **Doanh số hợp lệ**, **Bậc KPI đạt**, **Tổng thưởng đối soát**. Doanh thu đã loại vận chuyển, hoàn tiền và self-referral.
3. Bấm **Chốt đối soát đối tác này**. Kết quả xuất hiện trong lịch sử, trạng thái PENDING/Chờ duyệt; ví chưa nhất thiết tăng ở bước tính.
4. Trong lịch sử bấm duyệt rồi chi trả/cộng ví theo nút của trạng thái. Kỳ đi PENDING → APPROVED → PAID.
5. KOC tải lại ví: available tăng đúng thưởng và có giao dịch MONTHLY_BONUS. Sổ đối ứng có event MONTHLY_BONUS_REWARD; tên hiển thị ví có thể khác tên event nội bộ.
6. Chốt/duyệt/chi cùng kỳ lại hoặc tải lại trang: chỉ có một settlement và một lần cộng tiền.
7. Chọn tháng hiện tại/chưa kết thúc: nút **Chờ kết thúc kỳ tháng** bị khóa, API cũng phải từ chối.

Nếu cron đã xử lý kỳ thành PAID, không thể dùng kỳ đó để quay lại diễn từng trạng thái. Dùng kỳ/KOC fixture khác trong môi trường thử nghiệm.

### TC08 — Chính sách lịch sử

1. Trong database test, chuẩn bị kỳ cũ có mốc 50 triệu thưởng 2 triệu và doanh thu sạch 52 triệu, chưa quyết toán.
2. Sang kỳ sau sửa khoản thưởng còn 1 triệu, hoặc xóa mốc.
3. Chốt kỳ cũ: vẫn nhận đúng 2 triệu theo chính sách đầu kỳ; kỳ mới theo thay đổi mới.
4. Nếu lịch sử thiếu audit pre-image cần thiết, hệ thống phải báo cần đối soát; không im lặng trả 0.

Ca này đã có unit/integration tự động. Không có nút UI để tạo lịch sử trong quá khứ; muốn demo tức thì phải dùng fixture test tách biệt.

### TC09 — Cấp bậc

KOC vào `/collaborator/profile?tab=tiers`, kiểm tra doanh số tích lũy các tháng đã đóng:

| Doanh số | Hạng / tỷ lệ |
| --- | --- |
| Dưới 20 triệu | Đồng / 10% |
| Từ 20 đến dưới 50 triệu | Bạc / 11% |
| Từ 50 đến dưới 100 triệu | Vàng / 12% |
| Từ 100 triệu | Kim Cương / 13% |

52 triệu của tháng đang mở chưa tự lên Vàng ngay. Khi được đánh giá vào tháng sau thì đủ Vàng; không phải Bạc như ví dụ cũ. Thay đổi hạng không tính lại hoa hồng đơn đã có snapshot.

## 6. Bước 5.3–5.4 — Rút tiền và thuế

### TC10 — Tạo yêu cầu hợp lệ

1. KOC mở `/collaborator/wallet`, kiểm tra KYC và ngân hàng thụ hưởng.
2. Ví phải có **available earnings**, không phải shopping balance. Tối thiểu rút theo policy hiện tại; mức mặc định trong đặc tả là 200.000đ.
3. Nhập số tiền; kiểm tra UI hiển thị gross, tax, net trước khi gửi.
4. Bấm **Gửi yêu cầu rút tiền** một lần.
5. Available giảm đúng **gross**, lệnh PENDING xuất hiện; chưa được thông báo ngân hàng đã nhận tiền. Lịch sử có bút toán giữ tiền.

Ví dụ test theo đặc tả thuế dự án (không phải hướng dẫn pháp luật hiện hành):

| Gross | Thuế | Net |
| --- | --- | --- |
| 200.000đ | 0đ | 200.000đ |
| 1.999.999đ | 0đ | 1.999.999đ |
| 2.000.000đ | 200.000đ | 1.800.000đ |
| 2.064.800đ | 206.480đ | 1.858.320đ |

Ví dụ 2.064.800đ = 64.800đ hoa hồng + 2 triệu FR-09 chỉ đúng nếu tài khoản thử không có khoản khác và thưởng đủ điều kiện.

### TC11 — Các trường hợp phải bị chặn

- Rút thấp hơn mức tối thiểu hoặc cao hơn available.
- Rút pending commission hoặc số dư mua sắm/nạp Demo.
- KYC chưa VERIFIED, bị khóa tài khoản, thiếu ngân hàng.
- Sửa ngân hàng sau khi VERIFIED: phải thẩm định lại; không được tiếp tục rút bằng xác minh cũ.
- Thay ngân hàng sau khi đã tạo payout: không âm thầm đổi người nhận snapshot; cần xử lý yêu cầu theo quy trình hợp lệ.
- KOC có nghĩa vụ thu hồi/âm earnings sau refund: không cho rút thêm hoặc duyệt bỏ qua kiểm tra.

### TC12 — Bấm đồng thời/chống rút trùng tiền

Dùng **môi trường test**, ví chỉ có 2.500.000đ. Hai yêu cầu đồng thời mỗi yêu cầu 2.072.000đ: chỉ một được giữ tiền, yêu cầu còn lại thiếu số dư; available còn 428.000đ, không âm. Nếu ví đủ tiền cho hai yêu cầu khác nhau, việc tạo hai lệnh không tự chứng minh lỗi double-spend. Ca khóa DB đã có integration tests; không dùng frontend khóa nút làm bằng chứng duy nhất.

## 7. Bước 5.5 — Duyệt/từ chối/đối soát

### TC13 — Từ chối

1. Manager mở `/admin/finance/payouts`, tìm đúng payout PENDING.
2. Kiểm tra KOC, gross-tax-net rồi bấm **Từ chối**, nhập lý do.
3. Lệnh REJECTED; KOC được hoàn đúng gross về available một lần; có audit và notification.
4. Bấm lại hoặc Manager thứ hai xử lý đồng thời: không hoàn tiền hai lần. Ca đồng thời nên dùng test tự động.

### TC14 — Duyệt bằng API ngân hàng (chờ sandbox)

Hiện chưa có provider/gateway thật được cấp. Không điền URL bất kỳ hoặc dùng API key nhận thanh toán làm khóa chi hộ.

Khi đã tích hợp sandbox đúng provider:

1. Manager bấm **Duyệt & Tải UNC** để mở form, kiểm tra số tiền/người nhận.
2. Khi gateway có cấu hình hợp lệ, form có nút **Duyệt chuyển khoản qua ngân hàng**.
3. Gửi lệnh: tiền đã reserve, không trừ lần hai. Ngân hàng chưa rõ kết quả → PROCESSING, tiếp tục giữ tiền, không báo thành công.
4. Ngân hàng xác nhận thành công → APPROVED, bank reference thật từ môi trường tương ứng, processedAt, sổ đối ứng completion, thông báo.
5. Timeout/retry/đối soát: dùng cùng idempotency key, không chuyển tiền thêm lần hai. Không ép PROCESSING thành PENDING để tạo lệnh mới.
6. Bank thất bại đã xác định → có thể xử lý lại theo trạng thái hợp lệ; không đánh dấu APPROVED.

### TC15 — Đối soát UNC thủ công

Trong **môi trường test**, có thể dùng chứng từ TEST với mã TEST để kiểm tra thao tác upload. Đây không phải bằng chứng chuyển tiền thật. Trong môi trường dự án vận hành, chỉ xác nhận khi đã có chứng từ và giao dịch thực tế; không upload bill giả để làm trạng thái đẹp.

Manager mở **Duyệt & Tải UNC**, nhập bank reference và chọn chứng từ đúng yêu cầu form, kiểm tra gross-tax-net rồi xác nhận. Lệnh được hoàn tất theo đối soát thủ công; không được gọi đây là API Napas tự động. Kiểm tra bank reference không được dùng cho hai payout khác nhau.

### TC16 — Email và quyền duyệt

- KOC có notification sau hoàn tất; email outbox gửi sao kê khi SMTP được cấu hình. Chờ chu kỳ scheduler khoảng 5 phút, kiểm tra inbox/spam và thông tin gross-tax-net/reference. Notification có không đồng nghĩa email đã đến.
- KOC và Shop không được duyệt payout; Manager được duyệt hằng ngày; Admin có quyền kế thừa.
- Quản lý thứ hai có storeId đúng được xem dữ liệu Store phụ trách; quản lý Store khác không được xem.
- KOC B không tải được bảng kê/chứng từ của payout KOC A, kể cả tự thay ID trong URL/API.

## 8. Thuế, P&L và bước 5.6

### TC17 — Bảng kê và chứng từ thuế

1. KOC vào ví, tìm khu vực bảng kê chi trả; chỉ payout APPROVED mới xuất hiện.
2. **In / Lưu PDF**: đúng người nhận, gross-tax-net, ngày và bank reference; đây là bảng kê nội bộ.
3. Manager ở trang chi trả, khu vực **Đối soát thuế và chi phí thực tế**: chọn tháng, **Xem báo cáo thuế**, chọn khoản chi, nhập nhà phát hành/số/ngày và upload PDF chứng từ **đã phát hành** qua hệ thống ngoài.
4. KOC bấm **Tải chứng từ thuế**: tải đúng PDF của mình. Chưa có file thì phải báo thiếu, không tự tạo chứng từ pháp lý giả.
5. Chứng từ sandbox chỉ dùng môi trường test, không dùng như chứng từ thuế thật.

### TC18 — Báo cáo thuế và sổ cái

- Manager chọn đúng tháng payout hoàn tất, kiểm tra tổng gross-tax-net và **Tải CSV**.
- Payout PENDING/REJECTED không được tính là thuế đã thực chi.
- Bấm **Đối chiếu sổ cái**: bốn nhóm CUSTOMER_FUNDS, AFFILIATE_ESCROW, PARTNER_EARNINGS_PAYABLE, PAYOUT_RESERVED có difference=0.
- Tài khoản có số dư 0 vẫn cân không chứng minh mọi giao dịch đúng; phải đối chiếu thêm các ca có phát sinh trong fixture.

### TC19 — Store P&L

Shop vào `/merchant/wallet`, kiểm tra doanh thu sạch, hoa hồng, thưởng tháng, vận chuyển mẫu và chi phí thực tế. Shop không có chức năng rút doanh thu về cá nhân.

Nếu thiếu giá vốn/chi phí mẫu, lợi nhuận chưa đầy đủ phải để thiếu/null, không coi bằng 0. Manager nhập chi phí có bằng chứng cho đúng đơn/mẫu ở khu vực chi phí thực tế của trang chi trả; tải lại P&L và đối chiếu `netRevenue - COGS - marketing expenses`. Không tạo chi phí giả trong DB dự án.

### TC20 — Executive và AuditLog

1. Admin vào `/admin/analytics`, chọn tab tài chính, bấm làm mới.
2. Đối chiếu GMV/doanh thu, chi phí hoa hồng và thưởng, tỷ lệ thù lao, Escrow/available, số tiền chi và thuế theo dữ liệu thử.
3. Ví dụ 11,4% trong Blueprint là minh họa, không bắt buộc dashboard luôn đúng 11,4% hoặc luôn dưới 15%. Phải phản ánh số liệu thật.
4. Vào `/admin/audit-logs`, tìm các sự kiện thay đổi rule, chốt thưởng, approve/pay, payout/reject/completion, refund và review tự mua. Đối chiếu người thực hiện, ID đối tượng, thời điểm, số tiền.
5. Không sửa/xóa audit policy trong DB dự án để thử. Bất biến đã được kiểm tra trên PostgreSQL test.

## 9. Các ca kỹ thuật cần chạy bằng test tự động

Các ca đòi hỏi ngày quá khứ, đồng thời, timeout ngân hàng và kiểm tra bất biến nên chạy trên database thử nghiệm. Không có nút UI an toàn để giả lập tất cả những ca này trên DB dự án.

Unit tests từ thư mục backend:

```powershell
node node_modules/jest/bin/jest.js --config test/jest-unit.config.cjs --runInBand --testPathPatterns '(payouts|commissions|commission-rules|tiers|wallets|returns|campaigns|exclusive-deal-bonus)'
```

Kết quả đợt sửa: 39 suites, 565 tests đạt. Unit không gửi tiền hoặc email thật.

Integration: dùng database localhost tên kết thúc `_test`, dựng schema và migration history guard trước, đặt `WITHDRAWAL_TEST_DATABASE_URL` đúng DB test, sau đó:

```powershell
node node_modules/jest/bin/jest.js --config test/jest-flow5.integration.config.cjs --runInBand
```

Đã có 8 tests đạt trên PostgreSQL thật tách biệt: double spend, reject hoàn một lần, đối soát ngân hàng giả lập, thưởng cũ sau sửa/xóa rule, audit bất biến, quyền Store, Escrow/refund/FR-09, review tự mua, shopping tách earnings. Cụm test được dừng sau đợt kiểm tra; không trỏ lệnh này sang DATABASE_URL dự án và không kỳ vọng lệnh tự khởi động DB.

Browser fixture từ thư mục frontend (cần frontend dev server và Chrome đúng đường dẫn):

```powershell
$env:FLOW5_UI_TEST_URL='http://localhost:5173'
node --test tests/flow5-finance.browser.test.mjs
```

Bài này dùng API giả lập: kiểm tra UI và không phải bằng chứng dịch vụ ngân hàng/thuế/GHN đã tích hợp thật.

## 10. Ghi kết quả và điều kiện nghiệm thu

Với mỗi TC ghi: tài khoản/vai trò, Store/KOC ID, mã đơn/payout/settlement, số dư trước/sau, thời điểm, kết quả thực tế, ảnh chụp và PASS/FAIL/BLOCKED. Không ghi mật khẩu/token/OTP vào báo cáo.

Mẫu:

| TC | Đối tượng | Kết quả mong đợi | Thực tế | Trạng thái / ảnh |
| --- | --- | --- | --- | --- |
| TC04 | Đơn … | Pending -64.800, available +64.800 một lần | … | … |
| TC07 | KOC/Store/tháng … | Thưởng fixed 2 triệu, PAID một lần | … | … |
| TC10 | Payout … | Gross 2.064.800, tax 206.480, net 1.858.320 | … | … |

Chỉ kết luận hoàn thành khi cả luồng chính và nhánh từ chối/refund/concurrency/quyền đều đạt. **Chưa có sandbox provider, chứng từ đã phát hành hoặc email thực tế thì ghi BLOCKED/CHƯA NGHIỆM THU**, không đánh PASS dựa vào mock. Hướng dẫn đăng ký dịch vụ: [FLOW5_EXTERNAL_SERVICES_SETUP.md](FLOW5_EXTERNAL_SERVICES_SETUP.md). Kết quả sửa hiện có: [MAIN_FLOW_5_FIX_RESULTS_2026-10-31.md](MAIN_FLOW_5_FIX_RESULTS_2026-10-31.md).
