# Tái kiểm tra Main Flow 5 — 31/10/2026

> Đây là báo cáo **trước đợt sửa tiếp theo trong ngày 31/10/2026**. Không dùng danh sách lỗi bên dưới làm trạng thái hiện tại sau sửa. Xem [kết quả sửa và kiểm thử](MAIN_FLOW_5_FIX_RESULTS_2026-10-31.md); phần ngân hàng/chứng từ thật vẫn cần dịch vụ bên ngoài.

## Kết luận

**Chưa đủ điều kiện xác nhận Main Flow 5 hoàn thành và chính xác theo cả hai tài liệu.** Nền tảng tài chính đã có phần lớn chức năng và nhiều lỗi trong báo cáo cũ đã được sửa. Tuy nhiên, còn lỗi tính thưởng lịch sử, nguy cơ bỏ sót hàng đợi hoa hồng, phân quyền Store chưa đồng nhất, trạng thái Escrow trả về sai, khác biệt chính sách và phần tích hợp chưa nghiệm thu.

Đây là báo cáo hiện trạng mã nguồn và database được kiểm tra ngày 31/10/2026. Không coi các tuyên bố trong `MAIN_FLOW_5_COMPLETION.md` là bằng chứng tự thân. Lần này không sửa mã nghiệp vụ, chạy migration, seed, tạo payout, chuyển tiền hay gửi email. Truy vấn database dùng transaction `REPEATABLE READ READ ONLY` và kết thúc bằng rollback.

## 1. Căn cứ và phạm vi

- `SCANMS_REALIGNMENT_BLUEPRINT.md`: định hướng doanh nghiệp đa nhãn hàng; mục 1.9–1.12 về dòng tiền/ví/P&L; mục 2 về hoa hồng, cấp bậc và FR-09; toàn bộ Main Flow 5, bước 5.1–5.6; các điều kiện đầu vào từ Flow 1, 3, 4; lộ trình nghiệm thu.
- `SCANMS_MASTER_REFACTORING_PLAN.md`: mục 3.5 về nhiều quản lý cùng Store; mục 4 về tài chính, ngân hàng và phân tách trách nhiệm; mục 5.1 về đổi hàng/hoàn tiền; ma trận vai trò, đặc biệt K-10; mục 8 về hoa hồng/thưởng tháng; mục 9 về triển khai và E2E.
- `AGENTS.md`: giữ 5 vai trò, màu Warm Sand & Gold. Có khác biệt về mô hình đa gian hàng với định hướng doanh nghiệp đa nhãn hàng trong hai tài liệu; không tự ý giải quyết mâu thuẫn này bằng sửa code trong lần audit.

Main Flow 5 gồm **Escrow → FR-09 và cấp bậc → yêu cầu rút → giữ tiền/thuế → duyệt và giải ngân → sổ cái, email, báo cáo và kiểm toán**. Ngân hàng là yêu cầu trực tiếp của bước 5.5. Chứng từ thuế điện tử là yêu cầu liên quan trong Master Plan mục 4.3/K-10; không phải chức năng tự phát sinh thêm ngoài hai tài liệu.

Nghiệp vụ mua hàng nhà xưởng, PO, công nợ nhà cung cấp và định giá tồn kho ERP nằm ngoài phạm vi. Nhập chi phí thực tế phục vụ báo cáo P&L vẫn nằm trong phạm vi báo cáo.

## 2. Ma trận chức năng phải có

| Nhóm | Yêu cầu | Hiện trạng kiểm tra | Đánh giá |
| --- | --- | --- | --- |
| 5.1 | Hoa hồng giao thành công vào PENDING; đủ thời gian, không khiếu nại mới giải tỏa | Có cron đối soát, khóa đơn/hoa hồng, chuyển pending sang available; chặn return/dispute đang mở | Có nền tảng; còn vấn đề hàng đợi, thời hạn và API trạng thái |
| Đầu vào | `min(25%, max(Deal, Campaign, Tier, Base) + Live)`; chống tự mua | Đường tạo đơn thực tế đã dùng `precedenceCommissionRate`, snapshot tiền theo giá hàng sau giảm; helper kiểm tra ID/email/SĐT | Công thức cũ không còn được dùng ở đường tạo đơn đã kiểm tra; tín hiệu chống tự mua chưa đủ đặc tả |
| Đổi trả | Đổi hàng giữ hoa hồng; hoàn tiền thu hồi hoa hồng và điều chỉnh FR-09 | Đường hoàn tiền trong ReturnService đã gọi engine trong transaction, có source key chống trùng; thu hồi pending/available; thưởng đã trả có điều chỉnh riêng | Đã nối nghiệp vụ và có unit tests; còn cần E2E dữ liệu thật |
| 5.2 FR-09 | Tổng doanh số sạch theo KOC/Store/tháng, thưởng riêng, không cộng vào từng đơn | Có settlement, snapshot, chống chốt trùng, approve/pay, ledger, cron bù kỳ cũ | Còn lỗi chính sách lịch sử và cách tính phần trăm |
| 5.2 Tier | Đồng/Bạc/Vàng/Kim Cương = 10/11/12/13%; ngưỡng 0/20/50/100 triệu | Database đúng ngưỡng; tính doanh số tích lũy các tháng đã đóng, đồng bộ hằng ngày | Khớp bảng chính sách; ví dụ 52 triệu lên Bạc trong Flow 5 sai bảng |
| 5.3 | Chỉ KOC hoạt động, KYC verified, ngân hàng đã duyệt mới rút; tối thiểu 200.000đ | Có kiểm tra, snapshot thông tin nhận tiền; thay đổi ngân hàng làm mất VERIFIED | Có xử lý; chưa chứng minh xác minh chính chủ qua ngân hàng thật |
| 5.4 | Decimal, khóa số dư, không rút âm/trùng tiền; thuế gross ≥2 triệu là 10% | Có giữ gross, ledger, số tiền tax/net bằng Decimal; reserve và reject reversal | Có xử lý và kiểm thử; thuế được đánh giá theo đặc tả dự án |
| 5.5 | SYSTEM_MANAGER duyệt hằng ngày, Admin kế thừa; Shop không rút doanh thu | Controller đang đăng ký giới hạn duyệt cho Manager/Admin; Shop có P&L | Đường duyệt đã bảo vệ; một số API đọc theo Store còn chỉ kiểm tra ownerId |
| 5.5 | Giải ngân thật, bank reference thật, không báo thành công giả, retry/đối soát an toàn | Có HTTPS gateway contract, idempotency, lease, reconcile và UNC thủ công | **Chưa cấu hình gateway; chưa nghiệm thu MB/Napas thật** |
| 5.5 | Sổ kép, AuditLog, thông báo, email sao kê | Có finance postings, ledger, notification và outbox email retry | Sổ hiện tại cân; chưa có payout thật để kiểm tra email toàn luồng |
| K-10 | Tải chứng từ khấu trừ thuế điện tử | Có upload/lưu/tải PDF chứng từ từ bên ngoài; bảng kê nội bộ ghi rõ không phải chứng từ pháp lý | Chưa có tự phát hành chứng từ điện tử; chưa có chứng từ thực tế trong DB |
| 5.6 | Executive GMV, tỷ lệ chi phí hoa hồng/doanh thu, thuế, audit | Có báo cáo từ DB, báo cáo thuế theo tháng, CSV và đối chiếu sổ; P&L có nhập chi phí | Có chức năng; thiếu dữ liệu tài chính thực tế và nghiệm thu đầy đủ |
| Lộ trình | E2E từ đầu vào các Flow đến hoàn tiền/Escrow/thưởng/payout | Unit tests và browser fixture có; chưa có bằng chứng toàn luồng thực tế trong lần kiểm tra này | Chưa đạt cửa nghiệm thu cuối |

## 3. Các lỗi và chênh lệch còn lại

### R01 — Cao: kỳ chưa quyết toán có thể mất chính sách thưởng lịch sử

`commission-rules.service.ts:1280` truy vấn các rule hiện tại `isDeleted: false` khi chốt kỳ cũ. Hàm update sửa trực tiếp cùng bản ghi và tăng version (`:685`); remove đặt `isDeleted=true`, `isActive=false` (`:860`). Audit có oldValues nhưng luồng chốt không dựng lại bộ rule theo lịch sử. Snapshot chỉ được tạo khi kỳ đã chốt lần đầu.

Tái hiện với method `settleMonthlyBonus()` thật và Prisma giả lập: kỳ **2026-09**, doanh số sạch **52 triệu**, mốc 50 triệu thưởng **2 triệu**. Trước lần chốt đầu, nếu rule bị sửa còn **1 triệu**, kết quả kỳ tháng 9 là **1 triệu**; nếu rule bị xóa, kết quả **0**. Đây là lỗi với những kỳ bị bỏ lỡ mà scheduler phải khôi phục. Các kỳ đã có settlement/snapshot không thuộc tình huống này.

Ngoài ra, nhánh chia doanh số trước/sau lần sửa giữa tháng vẫn truyền cùng bộ `rules` hiện tại cho cả hai phép tính (`:1297`, `:1303`); không khôi phục oldValues cho nửa kỳ trước.

**Cần làm:** lưu phiên bản chính sách bất biến có thời gian hiệu lực, chọn chính sách lịch sử cho kỳ cần chốt và từng đoạn kỳ; giữ được rule đã ngừng/xóa cho lịch sử; kiểm thử sửa nhiều lần, xóa, khôi phục và bù kỳ cũ.

### R02 — Cao: 100 đơn bị loại có thể chặn đơn hợp lệ phía sau

`commissions.service.ts:70` lấy tối đa 100 đơn chưa có commission, sắp theo updatedAt. `:168` trả `false` ngay cho self-referral, không ghi nhận đã loại và không phân trang tới phần tiếp theo.

Tái hiện scheduler với hàng đợi giả lập có 100 đơn tự mua cũ + 1 đơn hợp lệ mới: chạy hai lượt, **created=0, failed=0**, đơn thứ 101 vẫn chưa được xử lý. Đây là tái hiện thuật toán bằng mock, không phải khẳng định database hiện tại có 100 đơn như vậy.

**Cần làm:** phân trang/cursor hoặc lưu trạng thái loại có kiểm soát để đơn không đủ điều kiện không chiếm mãi lô đầu. Bảo đảm không cập nhật mốc thời gian giao hàng chỉ để đẩy hàng đợi.

### R03 — Sai khác nghiệp vụ: FR-09 phần trăm hiện tính phần vượt mốc

Master Plan mục 8.2 mô tả ví dụ “+2% trên tổng doanh thu tháng đó”. `calculateProgressiveBonus()` (`commission-rules.service.ts:232–275`) lại tính theo các khoảng doanh số vượt mốc, đồng thời có thể cộng thêm thưởng cố định.

Ví dụ doanh số **52 triệu**, mốc **50 triệu**, tỷ lệ **2%**, thưởng cố định 0:

- Code hiện tại: `(52 - 50) triệu × 2% = 40.000đ`.
- Nếu theo “2% trên tổng doanh thu”: `52 triệu × 2% = 1.040.000đ`.

Đã gọi trực tiếp hàm tính thưởng để xác nhận **40.000đ**. Tài liệu và AGENTS cũng dùng chữ “lũy tiến”, nên cần chốt rõ chế độ tính, không tự đổi tất cả thành phần trăm toàn doanh thu. Có thể biểu diễn rõ `FIXED` / `TOTAL_REVENUE_PERCENT` / `PROGRESSIVE_EXCESS` và quy định có được phối hợp hay không.

### R04 — Trung bình: API Escrow báo sẵn sàng trong khi đơn đang tranh chấp

`commissions.service.ts:468` chỉ đặt `isFrozen=true` khi order là `RETURNED`. Không đọc returnRequest/dispute; bỏ qua `RETURN_REQUESTED`, `DISPUTED`. `:488` mô tả “Sẵn sàng giải ngân” chỉ dựa thời gian đáo hạn.

Tái hiện đơn **DISPUTED**, hoa hồng PENDING đã qua availableAt: API trả **isFrozen=false, isMatured=true, “Đã đáo hạn (Sẵn sàng giải ngân)”**.

**Đây là lỗi dữ liệu trạng thái API**, không phải đã chứng minh tiền bị giải tỏa sai. Method chuyển tiền thật `approveMatureCommission()` vẫn kiểm tra trạng thái đơn, yêu cầu đổi trả và dispute đang mở. Báo cáo Escrow Admin mới có returnRequest riêng nên không đánh đồng tất cả UI với API này.

**Cần làm:** dùng chung quy tắc xác định đủ điều kiện giải tỏa; phân biệt đáo hạn, đang bị giữ, đã giải tỏa, đã thu hồi.

### R05 — Trung bình: quyền của quản lý được gán storeId chưa đồng nhất

Hai tài liệu quy định quản lý hợp lệ nếu `store.ownerId === user.id || user.storeId === store.id`.

- `commissions.service.ts:430` chỉ lọc `store.ownerId=viewer.id` cho API chi tiết Escrow.
- `merchant-payouts.service.ts:37–79` chỉ lấy role của user rồi kiểm tra ownerId cho Shop Manager, không kiểm tra storeId.

Quản lý thứ hai được Admin bổ nhiệm vào Store có thể bị trả 404/không thấy dữ liệu tại các API này dù được phân công đúng. P&L mới đã có nhánh storeId; không kết luận mọi báo cáo đều lỗi. Đây là thiếu quyền cho người hợp lệ, chưa có bằng chứng vượt quyền đọc Store khác.

**Cần làm:** tái sử dụng policy truy cập Store chung; kiểm thử owner, manager được gán, manager Store khác, Manager/Admin trung ương.

### R06 — Điều kiện đầu vào: chống tự mua chưa đủ các tín hiệu nêu trong tài liệu

Flow 4/Blueprint mục 1.9 và Master mục 5.4 nhắc ID, SĐT, địa chỉ, ngân hàng. Helper `commissions/self-referral.ts` kiểm tra raw flag, ID, email, SĐT. Lời gọi tạo đơn tại `orders.service.ts:1627` chỉ truyền ID/email/SĐT; không thực hiện đối chiếu địa chỉ hoặc ngân hàng tại đây. Đường tạo commission cũng gọi cùng helper.

**Cần làm:** xác định dữ liệu nào thực sự có và quy tắc đối chiếu; bổ sung kiểm tra/risk review cho các tín hiệu còn thiếu. Không nên tự tịch thu hoa hồng chỉ vì nhiều người dùng chung địa chỉ. Đây là phụ thuộc Flow 4 ảnh hưởng chất lượng tiền đầu vào Flow 5, không yêu cầu viết lại toàn bộ Flow 4 trong audit này.

### R07 — Chưa nghiệm thu ngân hàng thật

`payout-transfer.service.ts` đã có adapter HTTP tổng quát, idempotency, lease và xác nhận kết quả. Cấu hình dự án hiện có **payoutGateway=false**: thiếu cặp cấu hình gateway cần thiết. Một HTTP contract tổng quát chưa chứng minh tương thích API MB/Napas thực tế.

Luồng UNC thủ công có chứng từ và bank reference hỗ trợ đối soát, nhưng không tương đương tự động giải ngân Napas 24/7 theo bước 5.5. Trạng thái PROCESSING khi kết quả ngân hàng chưa rõ giúp tránh chuyển tiền trùng; không nên ép về PENDING chỉ để giống mô tả lỗi chung trong tài liệu.

**Cần làm:** kết nối nhà cung cấp/gateway đã chọn, mapping response, nghiệm thu thành công/thất bại/timeout/reconcile/duplicate. Không cần người dùng gửi khóa bí mật vào chat.

### R08 — Chứng từ thuế: có lưu/tải PDF, chưa phải hệ thống tự phát hành

`finance-report.controller.ts:76` nhận PDF và thông tin chứng từ; endpoint `:139` cho chủ sở hữu tải về. Kiểm tra đầu PDF/hash không tự chứng minh tài liệu đã được nhà cung cấp hợp lệ phát hành/ký. `finance-report.service.ts` phân biệt bảng kê nội bộ bằng `legalTaxCertificate:false`.

Database hiện có **0 chứng từ thuế**. Chưa có bằng chứng phát hành điện tử hoặc nhận chứng từ đã phát hành từ hệ thống ngoài. Nếu phạm vi chốt là tải chứng từ do kế toán phát hành bên ngoài, cần ghi rõ tiêu chí tiếp nhận/xác minh và có chứng từ mẫu hợp lệ để nghiệm thu; không bắt buộc suy diễn rằng đồ án phải tự xây một nhà cung cấp thuế điện tử.

### R09 — Dữ liệu và E2E chưa chứng minh được kịch bản bảo vệ

Database đang kết nối có **0 commission, 0 monthly bonus result, 0 payout request**, **0 finance cost entry** tại thời điểm đọc. Có 15 finance postings; bốn nhóm số dư đối chiếu đều khớp. Cân số dư hiện tại không thay thế kiểm tra phát sinh thật.

Chưa có cơ sở thực tế để khẳng định đã demo 72.000đ → cộng 2 triệu → rút 2.072.000đ → thuế 207.200đ → ngân hàng nhận 1.864.800đ → email/chứng từ/báo cáo. P&L có công thức và nhập chi phí, nhưng chưa thể nghiệm thu lợi nhuận đủ chi phí với dữ liệu hiện tại. Không được điền giá vốn giả để che dữ liệu thiếu.

### R10 — Điều kiện đầu vào: mức Campaign 14% trong tài liệu chưa biểu diễn được theo policy hiện tại

Blueprint mục 2.2 có ví dụ mức Campaign phẳng **14%**. `commission-policy.ts:11–20` chỉ chấp nhận campaign bonus **từ +1 đến +2%**; đường tạo đơn đổi thành `10 + bonus`, tức mức Campaign **từ 11% đến 12%**. Policy tạo Campaign cũng giới hạn khoản cộng thêm. Nếu đưa +4 để biểu diễn 14% vào helper hiện tại, helper trả 0; nếu đưa 14 như tỷ lệ tổng cũng trả 0.

Phép chọn max đã đúng về cấu trúc nhưng miền giá trị đầu vào Campaign chưa khớp ví dụ đặc tả. Cần chốt Campaign là tỷ lệ phẳng hay bonus, giới hạn nào áp dụng và nơi phê duyệt ngân sách; bổ sung kiểm thử một đơn không có Deal với Campaign 14%. Đây là phụ thuộc Flow 3/4 dẫn tới tiền đầu vào Flow 5, không phải lỗi rút tiền.

## 4. Những lỗi cũ đã được khắc phục hoặc không còn đúng

| Phát hiện trong báo cáo trước | Kết quả tái kiểm tra |
| --- | --- |
| Thiếu migration và finance_postings | Cả 5 migration Flow 5 đã finished, không rollback; bảng tồn tại |
| Guard vượt quyền do URL chứa preview | Guard hiện nhận diện đúng handler `previewBonus`, kiểm tra Store cho handler còn lại |
| Sửa ngân hàng vẫn VERIFIED | Hồ sơ cập nhật bị đưa về UNVERIFIED; payout có snapshot và so khớp người nhận |
| Tạo đơn dùng công thức cộng dồn cũ | Lời gọi tạo đơn hiện dùng max + Live, trần 25%; VIP bonus được đổi sang rate đúng |
| Hoàn tiền không nối FR-09 | ReturnService đã nối adjustment engine trong transaction; có snapshot, source key và chống trừ lặp |
| Đối soát song song ghi lùi trạng thái | Có row lock, transfer lease, đối chiếu lease, bank reference uniqueness; unit regressions đạt |
| Tier vẫn 5/20/50 triệu | DB hiện đúng 20/50/100 triệu; bonus 1/2/3 |
| Thiếu sổ đối ứng commission/clawback | Đã có các event và finance postings; số dư DB hiện khớp bốn bucket |
| Không bù kỳ thưởng bị bỏ lỡ | Có scheduler duyệt các kỳ đã đóng; nhưng R01 khiến bù kỳ chưa chắc đúng chính sách lịch sử |
| Tiền mua hàng và hoa hồng chung một số dư rút | Có SHOPPING bucket riêng; nạp/chi mua hàng tách khỏi available earnings |

Demo top-up đang bật trong môi trường phát triển theo yêu cầu trước của người dùng, vẫn có chặn production. Không tự coi lựa chọn demo đã được yêu cầu là lỗi cần xóa. Dữ liệu tiền demo phải được phân biệt với bằng chứng thanh toán/giải ngân thật khi bảo vệ.

## 5. Các điểm tài liệu cần thống nhất

1. **Escrow:** Master mục 4.3 và nhiều đoạn Blueprint ghi 7 ngày; bước 5.1 ghi 7–14 ngày. Code là 14 ngày **cộng ngày lễ**: tái hiện nhận ngày 20/04/2026 có tổng giữ **19 ngày**. Phần cộng ngày lễ chưa có quy tắc thống nhất trong hai tài liệu.
2. **Cấp bậc:** bảng Blueprint mục 2.2 ghi 50 triệu lên Vàng 12%; bước 5.2 lại cho 52 triệu lên Bạc 11%. Code đang theo bảng ngưỡng tích lũy, không theo ví dụ sai này.
3. **Best-benefit:** công thức max khác sơ đồ Deal luôn ghi đè Campaign. Code hiện theo max. Ví dụ Campaign 20%, Deal 16% cần một đáp án thống nhất.
4. **Coupon và 72.000đ:** ví dụ khách áp mã giảm 10% nhưng hoa hồng vẫn tính 450.000 ×16%. Code tính trên net goods: nếu giảm 10% toàn bộ món hàng thì **405.000 ×16% =64.800đ**; tổng rút và thuế trong demo phải thay đổi tương ứng hoặc bỏ coupon khỏi ví dụ.
5. **FR-09:** cần chốt phần trăm toàn doanh thu hay lũy tiến phần vượt (R03), khoản cố định có cộng kèm phần trăm không, có giới hạn ngân sách riêng không. Không tự áp trần 25% của đơn hàng cho khoản thưởng tháng độc lập nếu chưa được quy định.
6. **Thời điểm chốt:** Master ghi 23:59:59 cuối tháng; code không chốt tháng đang mở, cron 00:10 hằng ngày bù các tháng đã đóng. Nên ghi rõ chốt sau 00:00 để không bỏ giây cuối và phân biệt tính/duyệt/cộng ví. Nút settle hiện chỉ tạo kết quả, còn approve/pay là các bước riêng; không phải một nút settle lập tức cộng ví như demo.
7. **Live:** hai tài liệu mô tả +2%; AGENTS/code cho phép +2 hoặc +3%. Cần chọn giới hạn thống nhất.
8. **Tên trạng thái/API:** tài liệu dùng `/api/v1`, `settle-monthly`, `PENDING_ADMIN_APPROVAL`, có đoạn COMPLETED; code dùng route Store cụ thể, `/settle`, `/approve`, `/payout`, payout `PENDING/PROCESSING/APPROVED/REJECTED`. Cần bảng mapping và cập nhật kịch bản; khác tên không tự đồng nghĩa sai dòng tiền.
9. **Bản sắc:** AGENTS nói mạng lưới nhiều Shop đối tác, hai tài liệu mô tả nhãn hàng thuộc một doanh nghiệp. Cần chốt tài liệu gốc; phần Flow 5 đang được đối chiếu theo mô hình doanh nghiệp trong hai file người dùng yêu cầu.

Không xác nhận hiệu lực pháp luật thuế hiện hành từ nội dung tài liệu. Các phép tính 2 triệu/10% trong báo cáo chỉ kiểm tra mức phù hợp với đặc tả dự án.

## 6. Kiểm tra đã thực hiện và giới hạn

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `npm.cmd run build` | Đạt |
| Frontend `npm.cmd run build` | Đạt |
| Jest unit filter payout/commissions/commission-rules/tiers/wallets/returns | **33 suites, 515 tests đạt** |
| `frontend/tests/flow5-finance.browser.test.mjs` | **1 test đạt** khi Chrome được phép khởi chạy ngoài sandbox; lần chạy trong sandbox timeout |
| `artifacts/flow5-audit/reaudit-reproduce.cjs` | Tái hiện R01, R02, R03, R04, bộ lọc R05 và Escrow vượt 14 ngày bằng code compiled + mock; không ghi DB |
| `artifacts/flow5-audit/reaudit-readonly.cjs` | 5 migration finished; tiers đúng; bốn bucket cân; gateway chưa cấu hình; số lượng chứng từ/giao dịch như trên |
| PostgreSQL integration suite | Không chạy lại trong lần này; không dùng DB dự án để làm test ghi/xóa |
| E2E đơn thật → đổi trả → Escrow → FR-09 → ngân hàng → email/chứng từ | Chưa chạy/đạt trong lần tái kiểm tra này |

Browser test sử dụng trang fixture và chặn/mô phỏng API. Nó kiểm tra hiển thị báo cáo, lỗi/rỗng, phân trang, form duyệt và in bảng kê; **không phải E2E ngân hàng thật**. Các ca tái hiện dùng mock chứng minh nhánh logic, không chứng minh lỗi đã phát sinh với một tài khoản thật.

## 7. Thứ tự hoàn thiện để nghiệm thu

1. Sửa R01/R02; kiểm thử phiên bản chính sách, kỳ cũ, phân trang và đơn bị loại.
2. Chốt R03 và các điểm tài liệu mâu thuẫn; đồng bộ tài liệu, công thức UI và demo. Sửa trạng thái Escrow và quyền Store theo R04/R05.
3. Hoàn thiện tín hiệu chống tự mua đầu vào; kiểm thử refund trước/sau giải tỏa, đổi hàng giữ hoa hồng, refund sau thưởng/payout và chặn rút khi có nghĩa vụ thu hồi.
4. Chuẩn bị dữ liệu kiểm thử tách biệt, chi phí có bằng chứng; kết nối/đối soát ngân hàng và quy trình chứng từ đã chọn. Xác minh email đến thực tế, không chỉ ghi notification.
5. Chạy E2E nhiều vai trò: tạo đơn với Deal/Campaign/Tier/Live; giao hàng; claim; hết Escrow; chốt/duyệt/trả thưởng; tier tháng sau; tạo payout đồng thời; duyệt/reject/timeout/reconcile; thuế/chứng từ/email; kiểm tra báo cáo và audit. KOC khác và Shop khác phải bị từ chối truy cập.
6. Chỉ đánh dấu hoàn tất giai đoạn tài chính/nghiệm thu cuối khi các lỗi chặn đã xử lý và có bằng chứng các ca trên. Không dùng build/unit tests đạt để thay thế nghiệm thu nghiệp vụ.
