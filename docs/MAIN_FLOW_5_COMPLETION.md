# Main Flow 5 — cập nhật triển khai ngày 31/10/2026

Đối chiếu Main Flow 5 trong `SCANMS_REALIGNMENT_BLUEPRINT.md`, phần 4, FR-09, K-10 và giai đoạn 4–5 của `SCANMS_MASTER_REFACTORING_PLAN.md`. Đây là trạng thái sau sửa lỗi; báo cáo audit ban đầu được giữ lại để truy vết.

## Kết quả xử lý

| Audit | Thay đổi |
|---|---|
| F01 | Đã áp dụng 5 migration Flow 5 vào database dự án bằng `migrate deploy`; không reset hoặc chạy lại seed. Đã kiểm tra trước trên PostgreSQL riêng, cả trường hợp có số dư cũ. |
| F02 | Preview nhận diện theo handler được router chọn, không theo chuỗi URL/query. Nhân sự vận hành được xử lý quyết toán; cấu hình chính sách thuộc quản lý nhãn hàng. |
| F03 | Cập nhật/ngắt ngân hàng hoặc nộp lại hồ sơ hủy trạng thái VERIFIED. Trước chuyển tiền/xuất lô, kiểm tra lại role, KYC, tài khoản snapshot và khoản nợ thu hồi. |
| F04 | Tạo đơn và xác thực referral dùng `min(25, max(10, Tier, Deal, Campaign) + Live)`. Deal 16% được giữ nguyên; chiến dịch chỉ giữ ngân sách cho phần tăng thực tế. |
| F05 | Hoàn tiền ví thực tế gọi điều chỉnh hoa hồng/FR-09 trong cùng transaction. Thu hồi ngay khi hoàn tiền thành công, không đợi khách xác nhận. `sourceKey` chống xử lý lại. Thưởng đã trả bị thu hồi ngay; khoản chưa trả được điều chỉnh trước cộng ví, có lịch sử riêng. |
| F06 | Lease lưu trong database ngăn hai tiến trình cùng hỏi ngân hàng. Phản hồi cũ không được ghi đè phiên mới. Timeout giữ PROCESSING, đối soát bằng GET; FAILED được đối chiếu trả PENDING. |
| F07 | Seed và database: Đồng 0, Bạc 20 triệu, Vàng 50 triệu, Kim Cương 100 triệu. Doanh số sạch tích lũy tới hết tháng đã đóng; 52 triệu đủ Vàng. |
| F08 | Sổ đối ứng bao phủ ghi nhận hoa hồng, giải tỏa, clawback, thưởng, giữ tiền, hoàn giữ tiền, ngân hàng và thuế. Có số dư mở đầu tại cutover và API đối chiếu 4 nguồn số dư; chống UPDATE/DELETE/TRUNCATE. |
| F09 | Scheduler quét các kỳ đóng từ tháng có đơn đầu tiên và tiếp tục settlement chưa hoàn tất. Có KOC được ghi nhận qua đơn dù không có StoreCollaborator. Lỗi từng thành viên được trả về; không âm thầm bỏ qua. Snapshot lưu chính sách phục vụ hoàn tiền; khóa dùng chung khi trả thưởng và điều chỉnh. |
| F10 | `shoppingBalance`/bucket SHOPPING dành cho nạp, mua và hoàn tiền. AVAILABLE/PENDING là thu nhập. Migration phân loại số dư cũ, giữ nguyên tổng tiền và lịch sử bất biến; trường hợp không phân loại chắc chắn bị giữ để đối soát. |
| F11 | Không sinh bank reference giả. Có adapter HTTPS, đối soát và xác nhận chuyển khoản thực tế bằng UNC. Mọi đường hoàn tất payout có notification cho email outbox. Có upload/tải PDF chứng từ do đơn vị phát hành cung cấp, phân quyền theo chủ khoản chi. Chưa có cấu hình gateway giải ngân thật hoặc tích hợp tự phát hành chứng từ thuế. |
| F12 | Có nhập giá vốn đơn/mẫu theo chứng từ thực tế, P&L, báo cáo thuế theo tháng Việt Nam và xuất CSV. Thiếu chi phí thì hiển thị chưa đủ dữ liệu; không suy diễn giá vốn. |

Đơn tự mua được loại bằng định danh, email, số điện thoại Việt Nam chuẩn hóa và cờ tự mua đã lưu. Dùng cùng điều kiện ở đơn hàng, hoa hồng, FR-09 và cấp bậc. Điểm rủi ro AI riêng lẻ không được dùng làm bằng chứng tịch thu thu nhập.

## Điểm cần phân biệt khi nghiệm thu

- Chạy được nghiệp vụ và kiểm thử ngân hàng giả lập không chứng minh giải ngân thật. Hiện `PAYOUT_GATEWAY_URL`/`PAYOUT_GATEWAY_TOKEN` chưa được cấu hình. Không gửi tiền thật trong phiên làm việc này.
- PDF do kế toán đính kèm là tài liệu từ đơn vị phát hành; ứng dụng không tự xác minh chữ ký số và không tự phát hành chứng từ thuế. Bảng kê in từ trình duyệt luôn ghi rõ là bảng kê nội bộ.
- Thuế 10% từ 2 triệu được triển khai theo đặc tả dự án, không phải kết luận về pháp luật hiện hành.
- Chọn Escrow cơ sở 14 ngày để đồng bộ cửa sổ đổi trả đang chạy, cộng quy tắc ngày nghỉ hiện có. Hai tài liệu có đoạn 7 ngày và 7–14 ngày; cần thống nhất văn bản nếu muốn đổi chính sách. Không tính lại snapshot đơn cũ.
- Quy tắc tiền hoa hồng áp dụng trên giá trị hàng sau giảm giá, không gồm cước. FR-09 quyết toán riêng theo tháng; không cộng trực tiếp vào phần trăm đơn.
- Lịch sử settlement cũ thiếu snapshot không được tính lại bằng chính sách hiện tại; phải đối soát chính sách gốc. Database dự án chưa có settlement cũ tại thời điểm migration.
- Đây là hoàn thiện Flow 5 và các đầu vào ảnh hưởng số tiền; không thay cho nghiệm thu toàn bộ 5 flows, GHN thật, AI Matching hay onboarding.

## Customer và Google đăng nhập

Customer không bị xóa khỏi router. Đã xác nhận lỗi tài khoản Google bị tạo mới với vai trò lấy từ tab đăng nhập KOC. Mã mới luôn tạo tài khoản Google lần đầu là CUSTOMER; người đã có tài khoản giữ role database, việc đăng ký đối tác đi qua quy trình KYC riêng. Không tạo địa chỉ giao hàng giả cho tài khoản Google mới.

Đã khôi phục tài khoản chủ yêu cầu và 3 tài khoản bổ sung về CUSTOMER sau khi người dùng xác nhận. Mỗi thay đổi có AuditLog, giữ nguyên hồ sơ và dữ liệu khác. Điều kiện kiểm tra lại gồm chưa có hồ sơ KYC, ngân hàng, MXH, link tiếp thị, mẫu thử, hoa hồng, payout hoặc cửa hàng. Bốn KOC mẫu có hồ sơ xác minh được giữ nguyên. Không dùng KYC UNVERIFIED đơn lẻ làm tiêu chí đổi role hàng loạt. Tài khoản Google mới có nhật ký nguồn đăng ký để đối chiếu về sau.

Đã chặn gọi `/chat/capabilities` khi chưa có token; trang Customer giữ đường quay lại sau đăng nhập. Tài khoản demo tự điền `customer01@seed.scanms.test` chưa tồn tại trong database, không phải tài khoản Google của người dùng.

Kiểm tra sau khôi phục: 6 CUSTOMER, 4 COLLABORATOR có KYC VERIFIED; không còn tài khoản COLLABORATOR thuộc nhóm nghi gán nhầm nói trên. Backend localhost:3000 đã khởi động lại bằng build mới, health trả 200 và endpoint đối chiếu sổ cái trả 401 khi chưa đăng nhập đúng như phân quyền.

## Kiểm thử và triển khai

- Backend/frontend build đạt sau thay đổi; frontend còn cảnh báo bundle lớn.
- Toàn bộ unit suite: 146 suites đạt, 1.638 tests đạt; 56 tests thuộc 2 suites được skip. Các suite tích hợp có database được chạy riêng. Bài mới về P&L và đăng nhập Google được chạy riêng đạt sau thay đổi cuối.
- Bộ kiểm thử liên quan bao phủ phân quyền, thuế, số dư, best-benefit, KYC/bank snapshot, lease đồng thời, FR-09, hoàn tiền, referral và đăng nhập Google.
- PostgreSQL riêng: 7 bài tích hợp, gồm Escrow → thưởng → giữ payout → hoàn tiền thực tế → thu hồi trước xác nhận khách; tách tiền nạp khỏi thu nhập. Không gọi ngân hàng hoặc email thật.
- Migration có kiểm thử dữ liệu cũ: Customer, KOC có tiền nạp lẫn thu nhập, và số dư chưa chắc nguồn; tổng tiền bảo toàn.
- Browser: Customer order lookup và Flow 5 desktop/mobile, Escrow, lỗi/rỗng, duyệt chi và in bảng kê. API fixture được giả lập.

Xem `MAIN_FLOW_5_IMPLEMENTATION.md` để chạy và cấu hình. Không đặt khóa bí mật trong frontend hoặc tài liệu.
