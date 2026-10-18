# Bàn giao bổ sung KOL, seed và kiểm thử — 18/10/2026

## Đã hoàn thành

### KOL công khai, không mạo nhận tài khoản thật

- 20 tên hoạt động và URL YouTube được ghi nguồn hồ sơ METUB tại [KOL_PUBLIC_REFERENCES.md](KOL_PUBLIC_REFERENCES.md). Mức kiểm chứng là `AGENCY_LISTED`, không phải xác minh quyền sở hữu kênh.
- Tài khoản seed có hậu tố `· TEST`, kênh ghi “tham khảo”, dùng avatar trung tính; giao diện hiển thị cảnh báo dữ liệu kiểm thử. Không sao chép địa chỉ, điện thoại, giấy tờ, tài khoản ngân hàng hoặc ảnh chân dung của KOL.
- Follower, tier, KYC và nghiệp vụ tài chính vẫn là fixture, **không phải số liệu của người nổi tiếng**. Không thể coi 20 tài khoản này là 20 đối tác thật đã đồng ý hợp tác.

### DB nhóm và seeder

- Đã áp dụng enrichment bằng Prisma transaction lên DB phát triển nhóm: 20 hồ sơ/kênh tham khảo, metadata cho 30 sản phẩm seed, hai placement tài trợ TEST miễn phí.
- Chỉ điền trường package đang NULL trên fixture nhận diện được; giữ giá trị đã sửa. Fixture 500 g / 20×15×10 cm và EAN nội bộ chỉ phục vụ test, không phải số đo hoặc GS1 thật của hãng.
- Hai placement dùng `PLATFORM_GRANT`, amount 0, có nhãn TEST và thời hạn; không ghi chứng từ thanh toán giả.
- Có khóa transaction, kiểm tra thay đổi đồng thời, kiểm tra target, chặn production, marker chạy lặp và audit snapshot trước thay đổi. Hồ sơ người dùng đã chỉnh tên/kênh được bỏ qua, không ghi đè.
- **Không reset/restore/seed lại DB nhóm trong đợt bổ sung này. Không đổi mật khẩu, tồn kho, đơn, số dư, ledger hay payout.**

### Sửa các lỗi FE/BE phát hiện khi kiểm thử

- Bỏ kho/điện thoại giả khi Shop chưa cấu hình địa chỉ nhận trả; UI yêu cầu Shop bổ sung trước khi đặt lấy hàng.
- Mô phỏng lấy hàng trả về chỉ chấp nhận MOCK/GHN_STAGING, không nhận LIVE hoặc provider không rõ. Bổ sung alias Shop ID của callback sandbox.
- Bật hai cờ mô phỏng chiều đi/chiều trả trên máy phát triển để người nghiệm thu test không gửi kiện thật; production vẫn chặn. Không bật đăng nhập demo hoặc đổi DB URL.
- Sửa chính sách hàng mẫu của sản phẩm cũ không bị bắt nhập số đo chưa biết; tạo sản phẩm mới vẫn phải cung cấp thông số hợp lệ.
- Không cache API ví/payout; sau đồng bộ giao thử phải làm mới danh sách đơn. Sau gửi yêu cầu rút tiền, mở phần lịch sử để thấy kết quả.
- Trang payout không tự chèn dữ liệu tài chính mẫu khi API lỗi/rỗng. Duyệt, xuất lệnh và xem chứng từ sử dụng API thật; không hiển thị chứng từ ngân hàng giả. Fixture chỉ bật rõ trong development và có cảnh báo TEST.
- Giữ cấu trúc NestJS/Prisma và React sẵn có, tái sử dụng màu vàng be và CTA của dự án.

## Bằng chứng kiểm thử

| Phạm vi | Kết quả thực chạy |
| --- | --- |
| Backend unit | 91 suite, **1.098/1.098** |
| Seeder | 7 suite, **58/58**, gồm 10 integration test PostgreSQL local cô lập |
| Frontend | **80 đạt, 0 lỗi, 1 bỏ qua**; gồm 19 ca browser chạy bằng Edge |
| Build/typecheck | Build FE/BE và typecheck seeder đạt |
| Lint | Các file mới/chỉnh sửa kiểm tra đạt |
| API với DB nhóm | Health UP/DB CONNECTED; đọc được hồ sơ/kênh tham khảo, hai placement, đơn và hồ sơ trả hàng |
| Audit DB nhóm | Lịch sử migration sạch; lệch ví/Shop/chat/pin đều 0; thiếu package 0, URL placeholder 0, hai Shop tài trợ đang hiệu lực |

Integration test dùng schema mới trên PostgreSQL local, không chạy reset/fixture trên DB nhóm. Browser test có API intercept/fixture, không chứng minh GHN/PayOS thật. Một ca browser đơn thủ công/Excel cần `QA_FIXTURE_JSON` và API/DB test riêng vẫn bỏ qua; không được tính là đã chạy thành công. Chưa chứng nhận kiểm tra trực quan đầy đủ desktop/mobile.

## Người nghiệm thu làm tiếp

1. Mở `http://localhost:5173`, Ctrl+F5 và đăng nhập lại để đọc tên mới. Email và mật khẩu đang dùng không đổi. Kiểm tra nguồn kênh, cảnh báo TEST và hai gian hàng tài trợ trên trang chủ.
2. Tạo dữ liệu mới bằng tài khoản tester trên web và reload để kiểm tra lưu DB. Khi dùng hàng thật, nhập số đo/mã trên bao bì thật, không dùng số fixture làm chứng cứ.
3. Với trả hàng: Shop duyệt → Customer chọn địa chỉ lấy hàng và đặt lấy hàng Staging → Shop bấm **Mô phỏng shipper đã lấy hàng**, rồi **Mô phỏng hàng đã đến Shop** → bắt đầu kiểm tra → ghi kết quả hoàn tiền/đổi hàng/từ chối. Không dùng LIVE khi chỉ thử phần mềm. Tạo record hoàn tiền không đồng nghĩa tiền đã chuyển.
4. Live đang hiệu lực hiện là **0**. Cần người vận hành bắt đầu phát qua quy trình Live, không sửa enum để giả hoàn thành yêu cầu hai phiên Live.
5. Tách nghiệm thu GHN sandbox, callback, PayOS/ngân hàng và payout thực tế; chỉ thao tác tài chính/giao vận thật khi được người phụ trách chấp thuận. Bổ sung fixture cô lập cho ca đơn thủ công/Excel còn lại.

Hướng dẫn chi tiết: [THINH_ACCEPTANCE_WEB.md](THINH_ACCEPTANCE_WEB.md). Code đợt này **chưa commit/push**.

## File triển khai chính

- Seeder: `backend/prisma/enrich-seed.ts`, `seeds/enrich-existing.seed.ts`, `seeds/data/creator-references.data.ts`, `identity.seed.ts`, `marketplace.seed.ts`, writer/validator và test seed.
- Backend: `modules/returns/return.service.ts`, test pickup và helper `modules/stores/sponsorship/sponsorship-capacity.ts`.
- Frontend: `SeedDataNotice.tsx`, `MainLayout.tsx`, tiện ích package/cache, trang ProductManagement/Wallet/PayoutApproval và test tương ứng.

Không commit `.env`, `.dev-runtime`, backup hoặc file thông tin đăng nhập. File `frontend.zip` của người dùng được giữ nguyên.
