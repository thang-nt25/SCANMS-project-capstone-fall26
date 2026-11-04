# Đối soát toàn bộ tài khoản KOL — 01/11/2026

## Phạm vi và quyết định của chủ dự án

Kiểm tra 16 tài khoản COLLABORATOR, 706 đơn cùng 706 commission, 918 bút toán ví cũ và 7 phiếu rút tiền đang lưu.

Người dùng yêu cầu sửa dữ liệu các KOL cho khớp. Khi gặp dữ liệu không thể suy ra chính xác, người dùng xác nhận:

- Giữ nguyên 249 đơn COMPLETED thiếu ngày hoàn tất; đánh dấu chưa đủ dữ liệu xét kỳ, không dựng ngày mô phỏng.
- Giữ phiếu rút 2.000.000đ của Vũ Thanh Huyền tại Sora; tạm khóa rút tiền để đối soát vì các đơn hiện có của tài khoản này thuộc Aura.

## Nguyên tắc tính lại ví

- Giữ nguyên số tiền commission đã chốt trên từng đơn, không áp tỷ lệ cấp bậc mới ngược vào đơn cũ. Toàn bộ 706 commission khớp tổng snapshot tiền hoa hồng của các dòng hàng.
- Khả dụng = commission APPROVED/PAID + thưởng tháng đã PAID − số tiền gộp của phiếu rút chưa bị từ chối − khoản chi có chứng từ được giữ lại.
- Chờ duyệt hoa hồng = commission PENDING. Tiền đã giữ cho phiếu rút không cộng trở lại bucket chờ duyệt hoa hồng.
- Chỉ phân bổ thu nhập vào Shop của đơn gốc; không chuyển phiếu rút sang Shop khác để ép số dư khớp.
- Thưởng tháng dự kiến/chờ chốt/chờ duyệt chưa phải tiền khả dụng.
- Đây là dựng lại số dư demo theo các chứng từ hiện có được chủ dự án yêu cầu, không phải xác nhận mọi số dư đầu kỳ hoặc lịch sử ngân hàng cũ đều có chứng từ đầy đủ.

## Kết quả từng tài khoản

Đơn vị tiền: VND. “Chờ đối soát hạng” nghĩa là giữ hạng đang lưu, không xác nhận hạng đó đúng từ doanh số chưa đầy đủ.

| KOL | Email | Khả dụng sau đối soát | Chờ hoa hồng | Cấp bậc / căn cứ |
| --- | --- | ---: | ---: | --- |
| Phan Bảo Ngọc | kol.baongoc@scanms.vn | 6.959.999 | 0 | Giữ Vàng; 24 đơn thiếu ngày, chờ đối soát hạng |
| Lê Hoàng Yến Nhi | kol.bronze@scanms.vn | 2.828.003 | 84.000 | Đồng; doanh số xét hạng 12.887.956 |
| Dương Tuấn Anh | kol.diamond@scanms.vn | 14.000.001 | 0 | Giữ Kim Cương; 47 đơn thiếu ngày |
| Trần Mai Anh | kol.flow5@scanms.test | 14.750.001 | 0 | Giữ Kim Cương; 46 đơn thiếu ngày |
| Bùi Minh Anh | kol.gold@scanms.vn | 11.500.004 | 0 | Giữ Kim Cương; 40 đơn thiếu ngày |
| Đỗ Hoàng Long | kol.hoanglong@scanms.vn | 2.750.002 | 0 | Giữ Bạc; 14 đơn thiếu ngày |
| Võ Thị Kim Oanh | kol.kimoanh@scanms.vn | 0 | 0 | Đồng; chưa có đơn đủ điều kiện |
| Nguyễn Lan Hương | kol.lanhuong@scanms.vn | 8.879.998 | 0 | Bạc; doanh số xét hạng 35.269.449 |
| Nguyễn Quốc Huy | kol.quochuy@scanms.vn | 6.659.999 | 0 | Giữ Vàng; 27 đơn thiếu ngày |
| Phạm Quốc Nam | kol.quocnam@scanms.vn | 0 | 0 | Đồng; chưa có đơn đủ điều kiện |
| Ngô Quỳnh Anh | kol.quynhanh@scanms.vn | 0 | 0 | Đồng; chưa có đơn đủ điều kiện |
| Vũ Thanh Huyền | kol.silver@scanms.vn | 1.640.000 đang lưu, **chưa xác nhận** | 0 đang lưu | **Khóa rút tiền**, giữ phiếu Sora; 13 đơn thiếu ngày xét hạng |
| Trần Thảo My | kol.thaomy@scanms.vn | 5.940.001 | 0 | Giữ Vàng; 26 đơn thiếu ngày |
| Hoàng Thảo Nhi | kol.thaonhi@scanms.vn | 21.540.000 | 0 | Vàng; doanh số xét hạng tích lũy 70.114.573 |
| Đặng Thùy Dung | kol.thuydung@scanms.vn | 0 | 0 | Đồng; gỡ phân bổ ví cũ không còn đơn/commission bằng bút toán đối soát |
| Lê Tiến Đạt | kol.tiendat@scanms.vn | 2.420.000 | 0 | Giữ Bạc; 12 đơn thiếu ngày |

11 ví được sửa; 4 ví đã khớp được giữ nguyên; 1 ví giữ nguyên số tiền và khóa rút theo quyết định của người dùng. 15 ví đã xác nhận bằng tổng các StoreWallet; tài khoản Huyền là ngoại lệ còn chờ đối soát nguồn tiền.

### Riêng Hoàng Thảo Nhi

- 105 commission đã duyệt: 23.040.000đ; toàn bộ thuộc Sora.
- Giữ phiếu rút PENDING 1.500.000đ, không duyệt hoặc chuyển khoản.
- Khả dụng Sora = 23.040.000 − 1.500.000 = **21.540.000đ**, bằng ví tổng. Phân bổ Aura cũ được điều chỉnh về 0, không xóa lịch sử.
- Thưởng tháng 10: doanh số sạch **51.871.862đ**, dự kiến **2.000.000đ**, trạng thái **PENDING_SETTLEMENT**.
- Khoản 2 triệu chưa được cộng vào ví. Nếu sau này chi trả đúng quy trình và không có biến động khác, khả dụng sẽ thành 23.540.000đ.
- Doanh số xét hạng 70.114.573đ là tích lũy các kỳ đã đóng, khác doanh số riêng tháng 10. Hạng Vàng là 10% gốc + 2% cấp bậc; tiền thưởng tháng không cộng vào doanh số xét hạng.

## Lưu vết và an toàn

- Chạy thử từng transaction rồi rollback trước khi áp dụng.
- Sao lưu riêng từng ví trước khi thay đổi; không xuất mật khẩu hoặc thông tin tài khoản ngân hàng.
- Ghi 697 bút toán mới, giữ nguyên toàn bộ 918 bút toán cũ. Điều chỉnh số dư và bút toán kế toán đối ứng; AuditLog ghi các tham chiếu cũ đã được thay thế trong lần dựng lại.
- Ghi nhận nguồn ví Shop cho 641 commission hiện có để refund/clawback sau này cập nhật đồng thời ví tổng và ví Shop.
- Mỗi tài khoản có event ID xác định; chạy lại trả `alreadyApplied`, không cộng thêm commission hoặc trừ thêm phiếu rút.
- Không sửa trạng thái/tiền/ngày của 706 đơn; không thay đổi Store, số tiền hoặc trạng thái của 7 phiếu rút. Không tạo phiếu rút mới, không chi thưởng tháng, không chuyển tiền ngân hàng.
- 9 tài khoản có tổng 249 đơn thiếu ngày được trả `assessmentIncomplete=true`; API xem hạng và tiến trình đánh giá không tự hạ hạng vì bỏ sót các đơn đó. Trang cấp bậc và tổng quan hiển thị cảnh báo, không đưa tiến độ thăng hạng chưa đủ căn cứ.

## Xác minh

- 111 unit tests liên quan ví, cấp bậc, thưởng tháng, điều chỉnh và phân quyền lịch sử: đạt.
- Build backend và frontend: đạt; Vite còn cảnh báo kích thước chunk, không phải lỗi build.
- Kiểm tra service thực tế cho cả 16 tài khoản: 15 ví khớp phân bổ; Huyền bị chặn rút theo yêu cầu.
- 22 phép thử giữ tiền rút theo ví tổng/Shop chạy trong transaction rồi rollback; 2 phép thử của Huyền bị chặn. Số dư cuối không đổi sau phép thử.
- Backend đang chạy được khởi động lại với code mới. Kiểm tra HTTP có xác thực cho Thảo Nhi, Lan Hương, Thanh Huyền: số dư/hạng/cờ đối soát đúng; API thưởng Thảo Nhi trả 2 triệu chờ chốt.
- Service từ chối quyết toán kỳ 11/2026 chưa kết thúc. Không thực hiện quyết toán hoặc chi trả tháng 10 để kiểm thử trên số dư thật.
- Chưa nghiệm thu trực quan toàn bộ màn hình hoặc xác minh giải ngân ngân hàng. Các ngày hoàn tất thiếu và nguồn tiền phiếu Huyền vẫn cần chứng từ, không được coi là đã giải quyết.

## Hồ sơ cục bộ

Các tệp sau nằm trong `artifacts/flow5-audit/`, được Git ignore:

- `all-kol-finance-audit-20261101.json`: snapshot trước sửa.
- `kol-reconciliation-before-<userId>-20261101.json`: bản sao từng ví được sửa.
- `kol-review-before-<userId>-20261101.json`: số liệu Huyền trước khi bật khóa đối soát.
- `all-kol-reconciliation-preview-20261101.json`: kết quả chạy thử đã rollback.
- `all-kol-reconciliation-result-20261101.json`: kết quả áp dụng.
- `all-kol-reconciliation-repeat-20261101.json`: xác minh chạy lại không cộng/trừ trùng.
- `all-kol-finance-verified-20261101.json`: số dư, Shop, cấp bậc, kiểm tra rollback và chặn kỳ mở.

Script `reconcile-all-kol-wallets.cjs` chỉ dành cho snapshot này, kiểm tra fingerprint và từ chối nếu chứng từ thay đổi. Không chạy seed/reset hoặc lấy script này làm cơ chế tự sửa số dư sản xuất.
