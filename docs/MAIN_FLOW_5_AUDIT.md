# Kiểm tra Main Flow 5 theo hai tài liệu SCANMS

Ngày kiểm tra: 31/10/2026, Asia/Saigon.

> **Bản audit ban đầu được lưu để truy vết.** Các lỗi bên dưới đã được sửa hoặc có trạng thái mới tại [MAIN_FLOW_5_COMPLETION.md](MAIN_FLOW_5_COMPLETION.md). Đặc biệt, 5 migration đã áp dụng vào database dự án; không dùng nội dung “chưa migration” bên dưới làm mô tả hiện trạng sau sửa.

## Kết luận

**CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU ĐẦY ĐỦ.** Có nền tảng hoạt động và các bài kiểm thử đạt, nhưng còn lỗi phân quyền, định danh ngân hàng, tích hợp hoàn tiền/thưởng, công thức đầu vào, số liệu kế toán và cấu hình triển khai. Không thể xem việc build thành công hoặc 175 unit tests đạt là bằng chứng đáp ứng toàn bộ hai tài liệu.

Phạm vi: các yêu cầu Flow 5 trong Blueprint, các phần tài chính, ma trận role, thù lao, FR-09, roadmap và DoD của Master Plan; đọc các luồng đầu vào thực tế để kiểm tra kết nối. Không nghiệm thu toàn bộ sản phẩm, AI, Media Hub, chat hay onboarding thuộc Flow 1–4.

Trong lần kiểm tra này không sửa mã nghiệp vụ, không migration, không seed, không chuyển tiền, không gửi email. Chỉ thêm báo cáo này và các script tái hiện cục bộ trong artifacts/flow5-audit.

## Bằng chứng kiểm tra

- Build backend và frontend hiện tại: đạt. Frontend còn cảnh báo kích thước bundle.
- Chạy lại 13 suites unit liên quan: **175/175 đạt**.
- Kiểm tra database dự án trong transaction READ ONLY: `to_regclass('public.finance_postings')` trả null; không có bản ghi migration `20261031090000_flow5_finance_postings`.
- Ngưỡng database dự án: Đồng 0, Bạc 5.000.000, Vàng 20.000.000, Kim Cương 50.000.000. Chỉ đọc bảng chính sách; không truy xuất hồ sơ cá nhân.
- Biến môi trường: chưa có đủ PAYOUT_GATEWAY_URL/PAYOUT_GATEWAY_TOKEN; có cấu hình SMTP. Chưa thử gửi email hoặc gọi ngân hàng thật.
- Script `node artifacts/flow5-audit/reproduce.cjs`: tái hiện bảy phát hiện bằng class đã build và các đối tượng giả lập. Không gọi dịch vụ ngoài hay ghi database.
- Năm bài PostgreSQL riêng và browser test đã đạt ở lần triển khai trước. Lần kiểm tra này không chạy lại hai nhóm đó; không dùng chúng làm bằng chứng E2E ngân hàng/hoàn tiền thật.

## Ma trận yêu cầu và hiện trạng

| Yêu cầu từ hai tài liệu | Hiện trạng | Đánh giá |
|---|---|---|
| Ví KOC: pending, available, lịch sử và nguồn tiền | Có API/UI, Decimal, khóa ví, ledger | Có nền tảng; chưa tách rõ tiền khách/nạp/hoàn và thu nhập KOC |
| Giải tỏa Escrow cho đơn sạch, không tranh chấp | Có scheduler, availableAt, kiểm tra return khi duyệt | Có; chính sách 14 ngày/Lễ-Tết khác đoạn 7 ngày trong Master Plan |
| Đổi hàng giữ hoa hồng, hoàn tiền thu hồi | Có reversal khi order RETURNED; có API refund-adjustment riêng | Chưa nối đầy đủ luồng hoàn tiền thực tế, xem F05 |
| Mốc thưởng FR-09 theo KOC/Store/tháng | Có CRUD, preview, settlement, snapshot, unique key | Có nhưng guard có thể bị vượt quyền, xem F02 |
| Chỉ thưởng trên doanh số sạch sau hoàn trả | Có tính tiền hàng net và trừ refundedAmount; order đang RETURN_REQUESTED bị loại theo status | Chưa có bằng chứng liên thông Fraud Sentinel; ngày đủ điều kiện giữa các engine chưa đồng nhất |
| Quyết toán tháng độc lập, không cộng vào đơn lẻ | Có, tính → duyệt → cộng ví | Đạt phần độc lập; scheduler chưa xử lý toàn bộ kỳ bị bỏ lỡ |
| Thăng hạng Đồng/Bạc/Vàng/Kim Cương | Có service dựa tích lũy đến kỳ đã đóng | Ngưỡng seed/database sai Blueprint |
| Rút tối thiểu 200.000đ, không vượt khả dụng | Có policy, lock và debit gross cùng transaction | Đạt cơ chế đã kiểm thử; database dự án thiếu migration nên chưa vận hành bản mới |
| Ngân hàng chính chủ đã xác minh | Có kiểm tra KYC=VERIFIED và đủ trường | Chưa bảo đảm sau khi sửa tài khoản, xem F03 |
| Thuế từ 2 triệu: 10%, snapshot gross/tax/net | Có, test ngưỡng và làm tròn | Đạt đặc tả dự án; không phải kiểm chứng pháp luật hiện hành |
| SYSTEM_MANAGER duyệt, ADMIN giám sát/kế thừa | Có RolesGuard cho payout/report | Có; duyệt chứng từ không kiểm tra lại đầy đủ điều kiện đối tác |
| Chuyển khoản thật, lỗi không tạo mã giả | Có adapter và đối soát; không sinh MBB giả | Chưa có gateway thực; có race cần sửa |
| FinancialLedger, sổ đối ứng và AuditLog | Có ledger ví, reserve/bank/tax/bonus và audit | Chưa hoàn chỉnh sổ đối ứng cho hoa hồng đơn/clawback |
| Thông báo và email sao kê | Có notification và email scheduler | Có mã; chưa xác minh gửi thực tế, một đường chi trả thiếu notification |
| PDF chứng từ khấu trừ thuế điện tử | Có bảng kê nội bộ in/lưu PDF | Chưa đáp ứng chứng từ thuế điện tử được yêu cầu |
| Executive Dashboard, thuế, Escrow, chi phí tiếp thị | Có số liệu database | Thiếu báo cáo thuế theo kỳ và đối soát với sổ; chi phí chưa đầy đủ |
| Store P&L, COGS, chi phí mẫu và lợi nhuận | Có doanh thu/hoa hồng/thưởng/cước mẫu | COGS/giá vốn mẫu/lợi nhuận còn null; chưa đủ báo cáo P&L |
| Warm Sand & Gold, dữ liệu thật | Phần UI mới dùng vàng be, Escrow mẫu đã bỏ | Còn trạng thái xanh ở UI cũ; cần kiểm tra toàn màn hình theo brand rule |
| E2E các vai trò, đồng bộ BM01/BM02/slide/diagrams | Có một số test thành phần | Chưa có bằng chứng nghiệm thu đầy đủ |

## Phát hiện cần xử lý

### F01 — Chặn triển khai: database dự án chưa có migration Flow 5

Các lệnh tạo payout, cộng thưởng và duyệt chi gọi `tx.financePosting.create`. Database được kiểm tra chưa có bảng này, nên bản mã mới không thể hoàn tất các giao dịch đó: transaction sẽ rollback và trả lỗi.

Nguồn: [payouts.service.ts](../backend/src/modules/payouts/payouts.service.ts:153), [finance-posting.ts](../backend/src/modules/payouts/finance-posting.ts:24), [migration](../backend/prisma/migrations/20261031090000_flow5_finance_postings/migration.sql:1).

Cần kiểm tra các migration đang chờ, triển khai đúng migration và xác minh schema trước khi bật bản mới. Không dùng seed/reset để sửa vấn đề này.

### F02 — Nghiêm trọng: có thể vượt quyền sửa/chốt thưởng qua query chứa /preview

StoreOwnerGuard dùng `request.url.includes('/preview')` rồi return true trước khi kiểm tra role và Store ownership. Vì request.url bao gồm query string, một request POST tới endpoint quản lý thưởng có query `?audit=/preview` được nhận như preview, dù người gọi là CUSTOMER.

Tái hiện trực tiếp class hiện tại: CUSTOMER + POST commission-rules + query trên → `canActivate` trả true. Controller chỉ dùng StoreOwnerGuard; các service ghi thưởng không tự xác minh caller sở hữu Store.

Nguồn: [store-owner.guard.ts](../backend/src/modules/commission-rules/guards/store-owner.guard.ts:107), [commission-rules.controller.ts](../backend/src/modules/commission-rules/commission-rules.controller.ts:42).

Cần xác định quyền theo handler/metadata hoặc route chính xác, không theo substring của URL. Bổ sung bài test HTTP cho CUSTOMER, KOC và manager của Store khác trên các API create/update/settle/approve/payout.

### F03 — Nghiêm trọng: đổi tài khoản ngân hàng nhưng giữ VERIFIED

`updateBankAccount` cập nhật ngân hàng, STK và tên người nhận trực tiếp, không reset KYC, không kiểm tra khớp định danh và không lưu trạng thái xác minh riêng của tài khoản nhận. Sau đó `createWithdrawal` chỉ kiểm tra KYC=VERIFIED và ba trường không rỗng rồi snapshot tài khoản đó.

Tái hiện: đổi từ tài khoản cũ sang tên người khác → kycStatus vẫn VERIFIED. Vì vậy chưa đáp ứng yêu cầu tài khoản chính chủ đã eKYC. Đường duyệt chứng từ Admin còn không truy vấn lại KYC/trạng thái người nhận, khác với đường gateway.

Nguồn: [wallet-summary.service.ts](../backend/src/modules/wallets/wallet-summary.service.ts:230), [payouts.service.ts](../backend/src/modules/payouts/payouts.service.ts:110), [admin-payouts.controller.ts](../backend/src/modules/payouts/admin-payouts.controller.ts:244).

Cần xác minh lại khi thay ngân hàng/thông tin nhận, snapshot danh tính đã xác minh, và có quy tắc thống nhất ở mọi đường duyệt chi.

### F04 — Cao: đầu vào hoa hồng vẫn dùng cơ chế cộng cũ

`precedenceCommissionRate` đã được định nghĩa nhưng chưa được các caller thực tế sử dụng. `OrdersService` và `ReferralLinksService` vẫn gọi `additiveCommissionRate`. Deal 16% bị chuyển thành bonus tối đa 3% trước khi cộng Base/Tier.

Ví dụ KOC Đồng, Deal 16%, không Live/Campaign: luồng hiện tại ra 13%, trong khi tài liệu yêu cầu 16%. Tiền đưa sang Flow 5 vì vậy sai ngay từ nguồn. Các test payout nhận một amount được chuẩn bị sẵn không kiểm tra được lỗi này.

Nguồn: [orders.service.ts](../backend/src/modules/orders/orders.service.ts:1714), [exclusive-deal-bonus.ts](../backend/src/modules/orders/exclusive-deal-bonus.ts:12), [referral-links.service.ts](../backend/src/modules/referral-links/referral-links.service.ts:2483), [commission-policy.ts](../backend/src/modules/commissions/commission-policy.ts:37).

Cần dùng chung policy đúng Best-Benefit cho mọi đường tạo đơn/attribution và giữ nguyên snapshot đơn lịch sử.

### F05 — Cao: hoàn tiền thực tế chưa điều chỉnh FR-09 và thu hồi chưa đồng thời

`ReturnService.inspect`/`resolveDispute` hoàn tiền vào ví khách và tăng refundedAmount nhưng không gọi logic clawback/điều chỉnh thưởng tháng. `handleRefundAdjustment` chỉ được gọi qua một endpoint riêng của commission-rules, chưa nối từ return service.

Reversal scheduler chỉ chọn order CANCELLED/RETURNED. Luồng đổi trả chỉ chuyển order thành RETURNED sau khi khách `confirmCompletion`. Nếu đã hoàn tiền nhưng khách chưa xác nhận, hoa hồng có thể vẫn tồn tại ở PENDING/APPROVED; thưởng FR-09 đã trả không được tạo adjustment tự động. Khoản đã giữ cho payout cũng không được liên kết/hủy khi phát sinh clawback; đường ngân hàng chỉ kiểm tra ledger giữ tiền cũ.

Nguồn: [return.service.ts](../backend/src/modules/returns/return.service.ts:935), [return.service.ts](../backend/src/modules/returns/return.service.ts:1072), [commissions.service.ts](../backend/src/modules/commissions/commissions.service.ts:52), [commission-rules.controller.ts](../backend/src/modules/commission-rules/commission-rules.controller.ts:511), [payout-funding.ts](../backend/src/modules/payouts/payout-funding.ts:29).

Cần một sự kiện hoàn tiền tài chính duy nhất, xử lý commission và FR-09 idempotent trong luồng thực, không tạo thêm refund thứ hai. Quy tắc payout đang chờ/đang chuyển/đã chi sau clawback phải rõ ràng.

### F06 — Cao: hai kết quả đối soát đồng thời có thể bỏ sót thành công ngân hàng

Chuyển PROCESSING → PENDING khi nhận FAILED diễn ra sau request mạng và không phân biệt attempt/version. Hai GET đối soát có thể cùng chạy (cron và thao tác người dùng). Nếu FAILED cũ về trước, payout về PENDING; SUCCEEDED về sau lại bị từ chối do yêu cầu không còn PROCESSING. Cron sau đó không chọn payout PENDING nữa. Có nguy cơ hoàn reserve/tái xử lý trong khi ngân hàng đã chi.

Tái hiện bằng service hiện tại: hai reconciliation, một FAILED rồi một SUCCEEDED hợp lệ → payout PENDING, bên thành công báo `Yêu cầu đã đổi trạng thái, cần đối soát`.

Nguồn: [payout-transfer.service.ts](../backend/src/modules/payouts/payout-transfer.service.ts:173), [payout-transfer.service.ts](../backend/src/modules/payouts/payout-transfer.service.ts:195).

Cần version/attempt và quy tắc trạng thái kết quả có thứ tự, đảm bảo kết quả thành công được ghi nhận ngay cả khi một kết quả cũ đã về trước; không tự hoàn tiền cho trạng thái chưa được đối soát chắc chắn.

### F07 — Cao: ngưỡng cấp bậc seed và database không khớp Blueprint

| Hạng | Blueprint | Seed và database đang kiểm tra |
|---|---:|---:|
| Bạc | 20 triệu | 5 triệu |
| Vàng | 50 triệu | 20 triệu |
| Kim Cương | 100 triệu | 50 triệu |

Ví dụ 52 triệu thực tế sẽ lên Kim Cương với dữ liệu này, không phải Vàng theo bảng chính sách hoặc Bạc như kịch bản demo. Test integration trước tạo riêng ngưỡng chuẩn nên đã không phát hiện seed/database sai.

Nguồn: [Blueprint](SCANMS_REALIGNMENT_BLUEPRINT.md:277), [people.data.ts](../backend/prisma/seeds/data/people.data.ts:57), [tiers.service.ts](../backend/src/modules/tiers/tiers.service.ts:134).

Cần chuyển đổi chính sách cấp bậc có kiểm soát và đồng bộ seed, UI, test dữ liệu thực, tài liệu demo. Không chỉ sửa giá trị trong test.

### F08 — Cao: sổ đối ứng thiếu ghi nhận hoa hồng đơn và clawback

FinancePosting được ghi cho thưởng tháng, reserve payout, chi ngân hàng, thuế và hoàn reserve; chưa có bút toán ghi nhận hoa hồng từ đơn hoặc đảo hoa hồng/thu hồi thưởng. FinancialLedger ví có ghi nhận nhưng hai sổ chưa có đủ sự kiện để đối chiếu.

Ví dụ mới phát sinh sau triển khai: hoa hồng đơn 72.000đ + thưởng tháng 2 triệu, rút toàn bộ 2.072.000đ. Sổ đối ứng chỉ credit PARTNER_EARNINGS_PAYABLE 2 triệu từ thưởng, sau đó debit 2.072.000đ khi giữ tiền. Sau chi hết, tài khoản phải trả còn âm 72.000đ thay vì 0. Không phải chỉ là vấn đề backfill lịch sử.

Nguồn: [finance-posting.ts](../backend/src/modules/payouts/finance-posting.ts:24), [commissions.service.ts](../backend/src/modules/commissions/commissions.service.ts:131), [commission-rules.service.ts](../backend/src/modules/commission-rules/commission-rules.service.ts:1682).

Cần hoàn thiện accrual/release/reversal/adjustment, số dư mở đầu và phép đối soát giữa ví, ledger và sổ đối ứng trước khi gọi đây là sổ cái đầy đủ.

### F09 — Trung bình: khôi phục quyết toán và doanh số sạch chưa đầy đủ

- Scheduler chỉ xét đúng tháng trước; kỳ cũ bị bỏ lỡ khi server nghỉ qua nhiều tháng không được tự khôi phục. Tái hiện ngày 01/12 chỉ xử lý 11, không xử lý kỳ 9 còn thiếu.
- Tập thành viên tự động lấy từ StoreCollaborator, trong khi service đơn lẻ chấp nhận KOC có đơn hàng/campaign/link dù chưa có dòng StoreCollaborator. Có thể bỏ sót KOC đã mang doanh số hợp lệ.
- Tổng hợp FR-09 chỉ đối chiếu trực tiếp customerId khi loại tự mua; chưa thấy dùng kết quả Fraud Sentinel hoặc dấu hiệu số điện thoại/địa chỉ/tài khoản khác tại engine xét thưởng. Đây là khoảng trống tích hợp cần kiểm thử thêm, không kết luận mọi đơn gian lận đều lọt. Tiers dùng DELIVERED/COMPLETED còn FR-09 chỉ COMPLETED nên hai bộ doanh số chưa đồng nhất. Đơn đang RETURN_REQUESTED/DISPUTED đã bị loại bởi điều kiện status, không coi thiếu filter returnRequest là bằng chứng tự nó gây lỗi.
- Recalculation thưởng sau refund lấy commissionRule hiện tại thay vì toàn bộ policy snapshot của kỳ cũ; thay/xóa/vô hiệu hóa mốc có thể làm tính khoản thu hồi sai.

Nguồn: [monthly-bonus.scheduler.ts](../backend/src/modules/commission-rules/monthly-bonus.scheduler.ts:16), [commission-rules.service.ts](../backend/src/modules/commission-rules/commission-rules.service.ts:1081), [commission-rules.service.ts](../backend/src/modules/commission-rules/commission-rules.service.ts:2141), [commission-rules.service.ts](../backend/src/modules/commission-rules/commission-rules.service.ts:2576).

### F10 — Trung bình: chưa tách ví mua hàng và thu nhập KOC

Một Wallet theo userId được dùng cho refund khách, top-up/PayOS, thanh toán đơn và thu nhập KOC. Rút tổng hợp cho phép dùng phần available chưa gắn Store như nguồn rút, không chứng minh đó là thu nhập tiếp thị. Debit thanh toán đơn chỉ giảm ví tổng, không giảm phân bổ StoreWallet của thu nhập đã sử dụng. Chưa đáp ứng ranh giới ví khách và ví thu nhập trong phân tích yêu cầu.

Nguồn: [wallets.service.ts](../backend/src/modules/wallets/wallets.service.ts:62), [wallets.service.ts](../backend/src/modules/wallets/wallets.service.ts:494), [wallets.service.ts](../backend/src/modules/wallets/wallets.service.ts:528).

Cần quyết định ví riêng hoặc tách balance/source có quy tắc rõ; payout chỉ dùng nguồn thu nhập đủ điều kiện và thuế chỉ tính đúng bản chất khoản chi.

### F11 — Chưa hoàn thành tích hợp: ngân hàng thật và chứng từ thuế điện tử

- Chưa cấu hình gateway; code hiện là hợp đồng adapter tự định nghĩa, chưa nối/xác minh endpoint giải ngân MB/Napas thực tế. Không có bằng chứng chuyển tiền thật.
- `/wallets/tax-invoices` trả danh sách JSON và bảng kê HTML in bằng trình duyệt; `legalTaxCertificate` trả false. Điều này minh bạch nhưng chưa đáp ứng chức năng chứng từ khấu trừ thuế điện tử PDF theo Master Plan.
- Có SMTP config không đồng nghĩa email đã gửi thành công; chưa kiểm thử email thật. Đường approvePayout trong MerchantPayoutsService hiện ghi audit/postings nhưng không tạo notification như đường Admin/gateway nên outbox email không được kích hoạt trên đường đó.

Nguồn: [finance-report.service.ts](../backend/src/modules/payouts/finance-report.service.ts:194), [FinanceReports.tsx](../frontend/src/components/wallet/FinanceReports.tsx:88), [merchant-payouts.service.ts](../backend/src/modules/payouts/merchant-payouts.service.ts:140).

### F12 — Chưa đủ báo cáo: P&L và quyết toán thuế theo kỳ

Store P&L trả cogs/contributionProfit null, thiếu giá vốn hàng mẫu và ROI chiến dịch. Executive chỉ có tổng thuế lũy kế từ PayoutRequest APPROVED; chưa có kỳ báo cáo thuế, bảng kê theo đối tác/định danh, dữ liệu nộp thuế hoặc xuất hồ sơ quyết toán. Executive affiliateExpense cũng không gồm đầy đủ chi phí mẫu như công thức chi phí tiếp thị trong Master Plan.

COGS thuộc nguồn ERP bên ngoài không có nghĩa được tạo số liệu giả; cần chốt giao diện dữ liệu hoặc thu hẹp tiêu chí báo cáo được nghiệm thu.

Nguồn: [finance-report.service.ts](../backend/src/modules/payouts/finance-report.service.ts:29), [finance-report.service.ts](../backend/src/modules/payouts/finance-report.service.ts:72), [Master Plan](SCANMS_MASTER_REFACTORING_PLAN.md:395).

## Các khác biệt cần chốt trong tài liệu

1. Escrow: Master Plan ghi 7 ngày; Blueprint ghi 7–14 ngày; code dùng 14 ngày và điều chỉnh Lễ/Tết.
2. Hạng: bảng Blueprint 52 triệu đủ Vàng, demo lại ghi Bạc; database thực tế hiện đủ Kim Cương vì ngưỡng seed khác.
3. Thưởng 50 triệu: có ví dụ 1 triệu, ví dụ khác 2 triệu; có đoạn thưởng phần trăm trên tổng doanh số, code dùng phần vượt lũy tiến và thưởng cố định mốc cao nhất.
4. Công thức max và sơ đồ Deal ưu tiên tuyệt đối chưa thống nhất; code thực tế còn additive nên cần sửa cả caller.
5. Kỳ thưởng: tài liệu 23:59:59 cuối tháng/nút chốt cuối tháng; code chỉ cho kỳ đã đóng và cron 00:10 ngày sau. Đây là quyết định triển khai hợp lý cần đồng bộ đặc tả, không được coi là đã khớp từng bước.
6. Payout APPROVED/COMPLETED/PENDING_ADMIN_APPROVAL: enum hiện chỉ PENDING/PROCESSING/APPROVED/REJECTED; APPROVED đang mang nghĩa đã chi. Cần bảng ánh xạ chính thức.
7. API tài liệu `/api/v1/commission-rules/settle-monthly`, `/api/v1/wallets/withdraw`; mã hiện `/api/stores/:storeId/commission-rules/settle`, `/api/wallets/withdrawals`. Cần cập nhật contract hoặc alias có kiểm thử.
8. AGENTS.md mô hình gian hàng đối tác và hai tài liệu mô hình nhãn hàng doanh nghiệp chưa được đồng bộ chính thức.
9. Ví dụ 72.000đ chưa trừ coupon; dữ liệu demo phải theo cơ sở net đã chốt, không mặc định dùng số minh họa này.

## Thứ tự khắc phục và tiêu chí kiểm tra lại

1. Sửa guard bypass, xác minh ngân hàng và race payout; thêm test từ endpoint thật, không chỉ gọi class.
2. Nối hoàn tiền → clawback/bonus adjustment → xử lý payout còn chờ, trong transaction/idempotency đúng; kiểm thử hoàn tiền trước/sau Escrow và trước/sau payout.
3. Sửa policy Best-Benefit ở caller thực, dữ liệu ngưỡng cấp bậc và snapshot thù lao. Kiểm tra ví dụ KOC Đồng Deal 16% từ checkout đến ví.
4. Hoàn thiện sổ đối ứng, nguồn tiền ví và tính doanh số sạch. Đối soát số dư ví, tổng ledger, công nợ đối tác, ngân hàng và thuế phải nộp sau từng tình huống.
5. Chuẩn bị migration, gateway thật, chứng từ thuế và nguồn P&L; triển khai có kiểm soát sau khi các lỗi logic được xử lý.
6. Chạy E2E các role theo Main Flow 5, gồm cả trạng thái thất bại, webhook lặp, thu hồi sau chi và khôi phục sau downtime. Đồng bộ tài liệu/diagrams/BM01/BM02/slide.

Chưa đánh dấu bất kỳ mục chưa đáp ứng nào thành hoàn tất. Việc sửa các phát hiện và nghiệm thu lại là công việc tiếp theo; báo cáo này không thay đổi các yêu cầu gốc.
