# Test Flow 4: Shop khiếu nại lỗi GHN và đối soát bồi hoàn

## Dữ liệu demo hiện tại

Ngày 02/11/2026, DB demo có đơn `DH-2026-1B58B512` của **Sora Skincare & Cosmetics**, hồ sơ đổi trả `b21cb9e7-0c86-4a63-8661-a71f097e5aad` ở trạng thái `SHOP_REJECTED`, vận đơn GHN gốc `LYL8G9`. Đây là mã demo; không trình bày như xác nhận trách nhiệm thật của GHN. Trạng thái có thể thay đổi khi thành viên khác thao tác.

## Kịch bản từ Shop đến Manager

1. Đăng nhập Shop sở hữu đơn. Vào **Quản lý đơn hàng**, tìm `DH-2026-1B58B512`, mở chi tiết rồi chọn **Gửi bằng chứng và chuyển Manager xem xét**. Có thể mở trực tiếp `/merchant/returns/b21cb9e7-0c86-4a63-8661-a71f097e5aad` sau khi đã vào Shop.
   Với yêu cầu đổi trả **mới** còn `REQUESTED`, Shop tải ảnh/video ngay trong form phản hồi rồi bấm **Từ chối & chuyển Manager**. Việc từ chối, lưu bằng chứng và mở tranh chấp được ghi trong cùng giao dịch; khách không phải tự khiếu nại lần nữa.
2. Ghi diễn giải ít nhất 20 ký tự: tình trạng đóng gói, niêm phong, lúc bàn giao, lý do nghi ngờ vỡ trong vận chuyển. Tải 1–5 ảnh/video có nhãn **TEST**. Gửi. Hồ sơ chuyển `DISPUTED`; Shop không tự gán lỗi GHN. Khách và Manager nhận thông báo.
3. Đăng nhập System Manager, vào **Khiếu nại đổi trả** (`/admin/return-disputes`). Mở đúng đơn; so sánh ảnh/video khách, bằng chứng Shop, vận đơn gốc và lịch sử GHN. Chọn **GHN / vận chuyển** chỉ khi chứng cứ đủ; chọn hoàn tiền hoặc đổi hàng, ghi căn cứ tối thiểu 20 ký tự. Nếu chứng cứ chưa đủ thì chưa kết luận.
4. Sau quyết định, khu **Đối soát bồi hoàn GHN** xuất hiện ở trang Manager và danh sách riêng trên trang Khiếu nại đổi trả. Trạng thái đầu `DRAFT`; có vận đơn gốc và bộ chứng cứ.
5. Manager điền mã yêu cầu GHN và số tiền đòi bồi hoàn, lưu bước **Đã gửi GHN**. Trạng thái `SUBMITTED`.
6. Có ba nhánh phản hồi GHN (dùng tệp chứng từ TEST để diễn tập):
   - **Yêu cầu bổ sung:** tải phản hồi GHN, lưu `NEEDS_MORE_EVIDENCE`, thêm bằng chứng mới và gửi lại.
   - **Chấp thuận:** nhập số tiền GHN đồng ý (không vượt số đã yêu cầu), tải chứng từ, lưu `ACCEPTED`; khi có chứng từ chuyển khoản, lưu `PAID`.
   - **Từ chối:** tải văn bản, lưu `REJECTED`; nếu có căn cứ mới, dùng **Kháng nghị** với mã yêu cầu mới và chứng từ mới.
7. Shop mở lại hồ sơ để xem trạng thái bồi hoàn. Không có nút Shop tự đánh dấu GHN đã trả tiền.

## Kiểm tra tiền và hàng cho khách

- Quyết định **hoàn tiền**: kiểm tra ví khách và trạng thái refund. Chỉ khi refund `SUCCEEDED` mới khẳng định tiền đã về ví và thu nhập KOL đã bị thu hồi. Nếu `PENDING`, Manager dùng nút thử hoàn lại. Bồi hoàn GHN đi riêng, không chặn quyền lợi khách.
- Quyết định **đổi hàng**: Shop ghi vận đơn thay thế và trừ tồn kho; thu nhập KOL giữ nguyên. Hồ sơ GHN có thêm mã vận đơn thay thế.
- Trạng thái `PAID` của bồi hoàn GHN là **ghi nhận thủ công kèm chứng từ**, không tự chuyển tiền vào ví hay xác minh sao kê ngân hàng bằng API. Không tuyên bố GHN thật đã bồi thường khi chỉ sử dụng dữ liệu TEST.

## Trường hợp lỗi cần thấy

- Không có vận đơn GHN gốc: Manager không chọn được `LOGISTICS_FAULT`.
- Không có ảnh/video Shop: không chuyển hồ sơ đã từ chối cho Manager.
- Không có mã GHN hoặc số tiền yêu cầu: không gửi hồ sơ GHN.
- Không có chứng từ phản hồi: không đánh dấu GHN chấp thuận, từ chối hay đã thanh toán.
- Ghi nhận `PAID` hai lần hoặc số GHN chấp thuận lớn hơn số yêu cầu: backend từ chối.
