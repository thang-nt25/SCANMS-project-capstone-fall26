# Main Flow 5 — kết quả sửa ngày 01/11/2026

## Đã sửa và xác minh

- Escrow `DH-2026-2E3E2079`: dùng thời điểm deliveredAt đã ghi nhận để chuyển hạn 14 ngày về đúng 7 ngày. Đến hạn 08/11/2026 13:32:59 giờ Việt Nam; chưa giải tỏa sớm, không đổi số tiền.
- Ba payout PENDING 1.500.000đ được sửa snapshot thuế từ 150.000đ về 0đ, net từ 1.350.000đ về 1.500.000đ. Giữ gross, nguồn Shop, trạng thái, khoản đã giữ trong ví. Không sửa payout APPROVED/PROCESSING hoặc chuyển tiền.
- Backend chặn duyệt/export lô đối với payout PENDING có snapshot thuế khác quy tắc hiện tại; không tự tính lại giao dịch ngân hàng đã đang xử lý.
- Sổ kế toán: ghi bút toán đối ứng để loại 25.500.000đ khả dụng và 3.600.000đ escrow đầu kỳ đã bị thay thế bởi ba lần dựng lại ví trước. Khôi phục đúng một posting escrow 28.000đ còn thiếu, dựa trên FinancialLedger thật. Không xóa hoặc cập nhật posting gốc, không thêm khoản bù vô căn cứ.
- Executive và P&L dùng commission của đơn COMPLETED cùng phạm vi doanh thu. Commission của đơn chưa hoàn tất được theo dõi riêng, không giấu khỏi báo cáo. Tỷ lệ hiện **13,95%**, không hardcode 11,4% hoặc ép về dưới 15%.
- Admin payout có 7 kiểm tra: tài khoản hoạt động, KYC, tài khoản nhận tiền, nhất quán ví, bút toán giữ tiền, snapshot thuế, mã số thuế khi có khấu trừ. Hiển thị CLEAR/REVIEW/BLOCKED và chi tiết số điều kiện đạt; không tuyên bố xác suất “100% an toàn”.
- Duyệt chi kiểm tra lại nhất quán ví ở backend. Giao diện trình bày rõ gateway chưa cấu hình; tải UNC không phải tự chuyển tiền.
- Email outbox chỉ ghi `emailSentAt` nếu mailer xác nhận đã nhận gửi; trả false/lỗi không bị ghi là gửi thành công. Có test thất bại/retry/không gửi trùng.

## Chưa thể tự hoàn tất

1. **Sổ vẫn còn chờ đối soát:** khả dụng lệch ròng 5.360.000đ, escrow lệch 1.200.000đ. Đã truy được về Huyền (số dư đầu kỳ 8.500.000/1.200.000 khác ví đang lưu 1.640.000/0) và tài khoản khách `customer.an@scanms.vn` có 1.500.000đ tại AVAILABLE chưa có posting nguồn tương ứng. Giữ nguyên theo quyết định không tự khôi phục nguồn tiền chưa có chứng từ; không tuyên bố toàn sổ đã cân.
2. **Ngày hoàn tất:** giữ nguyên 249 đơn của 9 KOL và trạng thái cần đối soát hạng; không tự dựng ngày theo yêu cầu của người dùng.
3. **Huyền:** giữ nguyên phiếu Sora, khóa rút tiền; không đổi sang Aura hoặc mở khóa.
4. **MST:** tài khoản `kol.flow5@scanms.test` (Trần Mai Anh) thiếu mã số thuế. Không tự dùng CCCD, mã ngẫu nhiên hoặc MST người khác.
5. **Ngân hàng:** chưa có credential sandbox chi hộ được cấp. Không gắn nhãn giao dịch giả lập là Napas thật.
6. **Email thật:** chưa được cung cấp hộp thư nhận mẫu/cho phép gửi test; đã kiểm thử bằng mock, chưa gửi email ra ngoài.
7. **Phiếu cũ và hồ sơ ngân hàng:** kiểm tra rủi ro mới phát hiện snapshot ngân hàng trong 7 phiếu hiện có không khớp hồ sơ KYC hiện tại. Không tự thay người thụ hưởng hoặc hồi tố giao dịch đã APPROVED. Các phiếu PENDING cần đối soát đúng tài khoản thụ hưởng trước khi duyệt. Đây là chốt kiểm tra backend đã có, nay được hiển thị rõ hơn.

## Kiểm thử

- 35 suites / **535 tests đạt**.
- Backend build và frontend build đạt; Vite chỉ cảnh báo kích thước chunk.
- Chạy thử dữ liệu trong transaction rollback trước khi áp dụng; có backup trước sửa.
- Chạy lại script sửa trả `alreadyApplied=true`, không nhân đôi bút toán.
- Xác minh HTTP backend đang chạy: bảng payout có 7 kiểm tra mỗi phiếu; Huyền BLOCKED; ba phiếu chờ có thuế 0; Executive 13,95%; gateway vẫn NOT CONFIGURED một cách trung thực.
- Không chạy ngân hàng thật, không tạo phiếu rút/chi thưởng mới, không sửa số dư các ví.

## Bằng chứng cục bộ

Các file trong `artifacts/flow5-audit/` được Git ignore:

- `accounting-ownership-before-20261101.json`: ánh xạ posting về nguồn ví.
- `flow5-proven-repair-before-20261101.json`: backup trước sửa dữ liệu.
- `flow5-proven-repair-preview-20261101.json`, `flow5-proven-repair-result-20261101.json`, `flow5-proven-repair-repeat-20261101.json`: chạy thử, áp dụng, chống lặp.
- `main-flow5-fixes-unit-20261101.json`: 535 tests.
- `main-flow5-fixes-readonly-20261101.json`, `flow5-fixes-live-http-20261101.json`: đối chiếu DB/API sau sửa.
- Audit event `f20e8bc9-e211-55d3-89c5-ce96c9ae0f9a`, action `FLOW5_PROVEN_DATA_CORRECTION`.

## Sandbox không có MST doanh nghiệp

VietinBank portal trong ảnh người dùng yêu cầu MST doanh nghiệp; không điền MST giả. Không đồng nhất “sandbox miễn phí” với “cá nhân đăng ký không cần hồ sơ”.

- [bunq Getting started](https://doc.bunq.com/basics/getting-started): tài liệu chính thức nêu sandbox miễn phí và không cần tài khoản bunq thật. Có thể tạo người dùng giả lập/API key theo [hướng dẫn chính thức](https://doc.bunq.com/basics/authentication/api-keys). Đây là ngân hàng quốc tế, không phải API VND/Napas tới MB Bank.
- [PayPal sandbox](https://developer.paypal.com/sandbox-testing/overview/): tài khoản ảo để kiểm thử, không phải sandbox ngân hàng Việt Nam.
- Mock gateway cục bộ là lựa chọn không cần MST để kiểm thử VND, nhưng phải ghi rõ mô phỏng. Chưa xây hoặc bật chế độ này khi người dùng chưa chọn.

Chọn provider không làm cho SCANMS kết nối ngay: phải triển khai adapter đúng giao thức xác thực, chữ ký, tiền tệ và định danh giao dịch của provider. Không dán trực tiếp URL portal hoặc API key của provider vào hợp đồng gateway `/transfers` rồi coi là đã tích hợp.
