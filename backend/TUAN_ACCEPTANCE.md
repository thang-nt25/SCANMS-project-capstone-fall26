# Nghiệm thu phần TUẤN — 15/10/2026

## Cập nhật kiểm tra 16/10/2026

Frontend, Swagger và API sản phẩm (gồm lọc Shop từng lỗi) hiện trả HTTP 200. Chạy lại 116 kiểm thử: tất cả qua. Chưa xác nhận toàn bộ schema hoặc nghiệm thu luồng GHN thực tế.

Phát hiện còn thiếu lối vào `ShopCampaignsPage`: route campaign chuyển sang tin nhắn, component chưa được mount. API `/api/tiers` trả Vàng +3/Kim Cương +5 trong khi Word và cách quy đổi khi tính đơn là +2/+3; cần đồng bộ danh mục.

Hướng dẫn thao tác, đường dẫn và từng ca nghiệm thu nằm ở `../HUONG_DAN_TEST_TUAN.md`. Phần lỗi EACCES bên dưới là ghi nhận lịch sử tại ngày soạn, không phải kết quả endpoint hiện tại.

## Trạng thái

Đã sửa cộng VIP theo deal APPROVED của đúng KOL/sản phẩm/Shop, độc lập loại link. Link chiến dịch vẫn giữ kiểm tra tham gia chiến dịch; VIP được cộng thêm khi chốt đơn. Không cần tạo link có đồng thời hai loại nguồn.

Hạn mẫu ưu tiên timestamp sự kiện GHN delivered, sau đó finish_date nếu không có sự kiện hợp lệ. Không dùng updated_date của đơn. Thiếu thời gian đáng tin cậy thì giữ SHIPPED và chờ đồng bộ sau.

116 kiểm thử tự động liên quan đã qua; backend build và frontend TypeScript đã qua. Các kiểm thử dùng mock không thay thế nghiệm thu DB/GHN.

## Điều kiện nghiệm thu thực tế

- Database thử nghiệm có các migration địa chỉ mẫu, kho voucher, ngân sách campaign, voucher stacking, đối soát. Chưa triển khai migration lên database trong lượt sửa này.
- Có tài khoản Shop, KOL, Customer, Admin và cấu hình GHN thử nghiệm hoạt động. Không dùng giao dịch thật để thay cho dữ liệu nghiệm thu.
- Backend phải truy cập được database. Lỗi EACCES ở phiên trước chưa được chứng minh đã hết.

## Các tình huống phải chạy

1. KOL xin mẫu bằng địa chỉ 3 cấp và SĐT; Shop thấy đúng dữ liệu vừa nhập. SHIPPED chỉ có tracking; chưa mở nộp video. Delivered ngày D thì hạn là D + 14 ngày, kể cả webhook tới muộn hoặc cập nhật đơn sau D. Gửi webhook trùng không tạo lại hạn/thông báo.
2. Hai Shop khác kho, đơn một và nhiều sản phẩm: đối chiếu phí báo giá, trọng lượng, bảo hiểm và phí khi tạo vận đơn. Mẫu có COD 0, Shop chịu phí.
3. Tracking và chi tiết đơn khách hiển thị hành trình thật, tên/SĐT shipper khi GHN trả dữ liệu.
4. KOL Kim Cương có VIP +3, chiến dịch +2 còn ngân sách, live +3 đang LIVE: đơn qua link chiến dịch, sản phẩm có trong live, phải đạt 21%. Tiền hàng 500.000, Shop giảm 50.000, sàn giảm 20.000, ship 30.000 giảm ship 10.000: net hàng 430.000, thanh toán 450.000, hoa hồng 90.300. Không cộng phí ship vào cơ sở hoa hồng.
5. Thay KOL/sản phẩm/Shop không có deal: không nhận VIP. Deal bị hủy không có hiệu lực cho đơn mới. Campaign ngoài thời gian hoặc hết ngân sách không được ghi vượt ngân sách; live đã kết thúc không có thưởng live.
6. Chỉ một mã tiền hàng Shop/KOL mỗi Shop; cho phép thêm một mã sàn và một mã ship. Mã ship không giảm tiền hàng. Hai khách tranh lượt cuối hoặc ngân sách cuối phải không vượt giới hạn.
7. KOL đề xuất mã ở PENDING_APPROVAL; Shop khác không duyệt được; KOL không tự kích hoạt; Shop duyệt thì mới dùng được. Admin khóa thì đơn mới không dùng được.
8. Lưu mã ngoài 100 kết quả công khai: vẫn thấy trong tab Đã lưu sau tải lại; bỏ lưu cập nhật đúng.
9. Hủy/hoàn đơn: kiểm tra ngân sách voucher, campaign và khoản hoa hồng theo chính sách; không hoàn lặp khi gọi lại. Kiểm tra cả hoàn một phần.
10. Đối soát sàn bù Shop: ghi nhận chuyển khoản bên ngoài có mã giao dịch; không ghi trùng hoặc quá khoản còn thiếu. Không coi thao tác ghi nhận là tự chuyển tiền.

Chỉ đánh dấu hoàn thành vận hành sau khi lưu kết quả từng tình huống cùng mã đơn thử nghiệm. OTP SMS không thuộc phạm vi này.
