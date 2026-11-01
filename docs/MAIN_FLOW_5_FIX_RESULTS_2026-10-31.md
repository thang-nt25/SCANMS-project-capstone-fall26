# Main Flow 5 — kết quả sửa ngày 31/10/2026

Đã xử lý các lỗi mã nguồn độc lập trong báo cáo tái kiểm tra. **Chưa đánh dấu nghiệm thu ngân hàng và chứng từ thuế thật**, do người dùng xác nhận chưa có nhà cung cấp. Hướng dẫn đăng ký tại [FLOW5_EXTERNAL_SERVICES_SETUP.md](FLOW5_EXTERNAL_SERVICES_SETUP.md).

## Quy tắc được áp dụng

- Escrow mới: **7 ngày lịch từ deliveredAt**, theo Master Plan 4.3 và phù hợp khoảng 7–14 ngày của Blueprint 5.1. Không cộng ngày lễ; bản ghi cũ giữ nguyên availableAt đã chốt. Claim/dispute/risk review tiếp tục chặn giải tỏa dù đã đáo hạn.
- Hoa hồng đơn: `min(25%, max(Deal, Campaign, Tier, 10%) + Live)`, tính trên tiền hàng sau giảm, không tính vận chuyển. Campaign hỗ trợ tổng 11–16% (bonus 1–6 điểm) để biểu diễn Campaign 14%; giữ kiểm tra ngân sách và phạm vi Store. Live vẫn hỗ trợ 2–3% theo AGENTS và cấu hình phiên.
- FR-09 mới: **mốc cao nhất**, thưởng cố định hoặc % **tổng** doanh thu sạch. Khi bản ghi cũ đồng thời có cả fixed và percentage, policy mới chỉ dùng fixed nếu fixed > 0; không tự cộng cả hai. UI đã có lựa chọn cách thưởng và chỉ gửi loại được chọn.
- Chính sách có hiệu lực tại **đầu tháng Việt Nam** áp dụng suốt kỳ. Việc sửa/xóa/kích hoạt trong tháng áp dụng từ kỳ sau. Đây là quy ước triển khai cho tình huống tài liệu cũ chưa quy định rõ, đã được ghi ở đầu hai tài liệu gốc. Policy preview là bản đang cấu hình; tiến độ và quyết toán dùng bản đầu kỳ.
- Kỳ đã quyết toán giữ snapshot bất biến. Refund của policy cũ vẫn dùng engine lũy tiến cũ, không đổi số tiền đã chốt; policyVersion 3 dùng engine mới.
- Chốt kỳ sau 00:00; cron 00:10 hằng ngày bù các tháng đã đóng. Tính/duyệt/cộng ví là các bước riêng. Tier dựa doanh số tích lũy tháng đã đóng: 20/50/100 triệu, vì vậy 52 triệu lên Vàng 12%.

## Đối chiếu phát hiện

| Mã | Xử lý | Bằng chứng / giới hạn |
| --- | --- | --- |
| R01 | Phục dựng policy đầu kỳ từ audit pre-image; bao gồm rule đã xóa; thêm pre-image delete/restore, khóa phiên bản khi sửa, khóa policy Store khi đọc/ghi; migration ngăn sửa/xóa audit policy và truncate audit | Unit lịch sử + PostgreSQL: sửa rồi xóa mốc hiện tại, kỳ tháng 9 vẫn thưởng 2 triệu; sửa/xóa audit bị từ chối. Lịch sử legacy không đủ pre-image bị chặn để đối soát, không tự trả 0 |
| R02 | Keyset pagination theo ID, quét tiếp khi gặp đơn bị loại, không sửa timestamp đơn để dịch hàng đợi | Unit: 200 đơn bị loại phía trước không chặn đơn hợp lệ thứ 201 |
| R03 | Engine mới fixed hoặc % toàn doanh thu, UI chọn loại; engine cũ chỉ phục vụ replay snapshot cũ | 52 triệu, mốc 50 triệu, 2% và fixed=0 → 1.040.000đ; fixed=2 triệu → đúng 2 triệu, không cộng thêm |
| R04 | API Escrow phân biệt HOLDING/FROZEN/READY/RELEASED/REVERSED, có canRelease; đọc claim/dispute/risk | DISPUTED/RETURN_REQUESTED không báo sẵn sàng. Method chuyển tiền vẫn kiểm tra độc lập trong transaction |
| R05 | Policy Store chung nhận owner hoặc staffMembers được gán Store, yêu cầu nhân sự hoạt động | PostgreSQL: quản lý thứ hai đọc được Escrow Store phụ trách; quản lý ngoài Store nhận null. Merchant payout access dùng cùng helper |
| R06 | Đối chiếu địa chỉ đầy đủ và tài khoản ngân hàng đã xác minh từ DB; tín hiệu trùng đưa vào review, không tự tịch thu. ID/email/SĐT chắc chắn vẫn về 0% | Hoa hồng được giữ; chỉ SYSTEM_MANAGER/ADMIN kết luận với lý do và audit. Monthly settlement bị chặn khi chưa review; Tier tạm loại đơn chưa review. UI Escrow có form kết luận. PostgreSQL kiểm tra clear và xác nhận tự mua/thu hồi một lần |
| R07 | Giữ idempotency/lease/reconcile/UNC thực tế, không thêm bank reference giả | **Chờ nhà cung cấp** và tài liệu API để mapping adapter rồi nghiệm thu sandbox/production. Gateway tổng quát chưa phải MB/Napas adapter được xác nhận |
| R08 | Giữ luồng tải chứng từ đã phát hành từ ngoài, phân biệt bảng kê nội bộ | **Chờ nhà cung cấp/quy trình kế toán**; không tự coi PDF/hash là chứng từ đã phát hành hợp lệ |
| R09 | Dựng database PostgreSQL mới chỉ nghe localhost, dùng dữ liệu thử nghiệm tách biệt; chạy liên hoàn Escrow → thưởng → giữ tiền → refund/clawback và các ca payout song song | 8 PostgreSQL integration tests đạt. Ngân hàng trong bài đối soát được giả lập, chưa phải E2E dịch vụ thật hay toàn bộ checkout/GHN thật |
| R10 | Campaign bonus 1–6 điểm, tổng mức 11–16%; đồng bộ DTO/service/helper/form và ngân sách ở lời mời chat | Unit chấp nhận +4 tương ứng 14%, từ chối ngoài giới hạn/ngân sách không hợp lệ. Không bỏ trần 25% hoặc trần ngân sách |

## Database và runtime

- Migration `20261031110000_flow5_policy_history_guard` đã được kiểm tra trên PostgreSQL thử nghiệm và áp dụng thành công vào database dự án.
- Sau migration, kiểm tra READ ONLY xác nhận cả 6 migration Flow 5 finished, bốn bucket vẫn cân; không phát sinh commission/bonus/payout mới trong database dự án.
- Backend đã được khởi động lại bằng bản build mới. `GET /api/commissions/escrow-info` thực tế trả HTTP 200, `baseHoldDays=7`, `holidayDaysAdded=0`. PostgreSQL thử nghiệm mới đã được dừng sau kiểm tra.
- Migration chỉ thêm trigger/index bảo vệ lịch sử chính sách; không seed, tạo payout, chuyển tiền, đổi số dư hoặc thêm chi phí giả trong database dự án.
- Demo top-up phát triển do người dùng yêu cầu vẫn được giữ; tiền nằm ở shopping bucket, không biến thành thu nhập KOC được rút.
- Không sửa lại availableAt, commission snapshot, settlement hoặc payout đã có để ép theo ví dụ mới.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Unit tests: payouts, commissions, commission-rules, tiers, wallets, returns, campaigns, exclusive-deal-bonus | **39 suites / 565 tests đạt** |
| PostgreSQL integration tách biệt | **8 tests đạt**: đồng thời, rollback, reserve/reject, bank reconcile giả lập, snapshot lịch sử, bất biến audit, phân quyền Store, refund/clawback, review tự mua, tách top-up |
| Browser finance fixture trên localhost | **1 test đạt**: báo cáo, lỗi/rỗng, phân trang, form review bắt buộc lý do, refresh sau review, duyệt UNC, bảng kê và mobile |
| Backend / frontend build | Đạt |

Kết quả JSON tại `artifacts/flow5-audit/fix-tests.json` và `fix-postgres-tests.json`. Integration dùng database `scanms_flow5_repair_test` tại localhost, không dùng DATABASE_URL dự án làm nơi tạo/xóa fixture. Một lần chạy rộng các unit orders/referral đã dừng vì gặp phụ thuộc Redis; không tính lần đó vào kết quả đạt ở trên.

Lệnh lặp lại kiểm tra tài chính:

```powershell
# Từ backend, unit tests không cần DB ngoài:
node node_modules/jest/bin/jest.js --config test/jest-unit.config.cjs --runInBand --testPathPatterns '(payouts|commissions|commission-rules|tiers|wallets|returns|campaigns|exclusive-deal-bonus)'

# Chỉ khi đã dựng schema và migration history guard trong DB localhost *_test:
$env:WITHDRAWAL_TEST_DATABASE_URL='postgresql://TEST_USER@127.0.0.1:TEST_PORT/scanms_flow5_repair_test'
node node_modules/jest/bin/jest.js --config test/jest-flow5.integration.config.cjs --runInBand
```

## Việc còn cần người dùng cung cấp

Tên và tài liệu API sandbox của ngân hàng/gateway chi hộ, nhà cung cấp chứng từ hoặc quy trình tiếp nhận chứng từ đã phát hành bên ngoài. Nếu không có pháp nhân, trước tiên hỏi nhà cung cấp có sandbox cho đồ án cá nhân hay không. Không cần gửi khóa bí mật trong chat. Sau khi nhận tài liệu mới có thể làm adapter theo đúng provider, kiểm thử giao dịch/chứng từ và email thực tế rồi đánh dấu phần tích hợp thật hoàn thành.
