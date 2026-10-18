# Nâng cấp khu vực Quý: FR-25 đến FR-32

Ngày kiểm tra: 18/10/2026. Nhánh: `quy`. Đã đồng bộ `origin/dev` trước khi chỉnh sửa, giữ lại lịch sử của nhóm.

## Các thay đổi có thể kiểm chứng

| Mã | Thay đổi chính | Điểm kiểm tra |
| --- | --- | --- |
| FR-25 | Gửi ảnh/video/tài liệu thật, xem trước, thử lại cùng message ID; bản nháp theo người dùng/cuộc hội thoại; đồng bộ khi reconnect | Chat Shop/KOL, chọn tệp và kiểm tra ACK Socket.io |
| FR-26 | Màn tiến độ mẫu riêng: tìm sản phẩm/Shop/vận đơn, ưu tiên hạn sửa video, báo sự cố, hủy yêu cầu chờ duyệt, nộp video | `/collaborator/samples` và `/collaborator/sample-requests` |
| FR-27 | API trạng thái thẻ VIP có kiểm tra hai bên hợp tác; chat đọc trạng thái khi mở và quay lại tab; tìm lời mời, chặn phản hồi chiến dịch hết hạn | `GET /campaigns/invitations/:id/state`; danh sách lời mời trong trung tâm hợp tác |
| FR-28 | Không nuốt lỗi thành số 0, bỏ kết quả request cũ; khoảng ngày đầy đủ theo UTC+7; CSV an toàn; thống nhất phạm vi Admin/Manager/Shop/KOL | `/merchant/analytics`, `/collaborator/analytics`, tab báo cáo Admin |
| FR-29 | Top 10, thống kê Top 10, xuất CSV, tìm vị trí 4–10; hồ sơ có trạng thái lỗi/thử lại, tránh response cũ và hỗ trợ bàn phím | Trang leaderboard và tab bảng xếp hạng Admin |
| FR-30 | Gợi ý mặc định 5 KOL, báo số hồ sơ thực sự phân tích; so sánh tối đa 3 KOL bằng điểm thành phần và lịch sử, xuất CSV | AI Matching trong không gian Shop/Admin |
| FR-31 | Đếm đầy đủ click/đơn trong kỳ, lấy tối đa 100 click và 50 đơn làm bằng chứng; lưu trạng thái xử lý trong DB, gắn `AI_FRAUD_FLAG`; cô lập gian hàng | `/admin/fraud-sentinel` |
| FR-32 | Interceptor HTTP cho POST/PUT/PATCH/DELETE sau guards, ghi thành công/thất bại; che dữ liệu nhạy cảm; thống nhất lọc/xuất và thống kê toàn bộ thay vì lấy mẫu 1.000 dòng | `/admin/audit-logs` |

Giao diện mới dùng Warm Sand / Brand Gold của SCANMS, không biến nền tảng thành cửa hàng đơn thương hiệu.

## Quy tắc nghiệp vụ được giữ nguyên

- Không có nút để KOL tự đánh dấu nhận mẫu; hệ thống phải xác minh giao thành công.
- Tạo yêu cầu mẫu mới vẫn mở form đã có trong trung tâm hợp tác, không tạo form rút gọn bỏ kiểm tra địa chỉ/kênh cam kết.
- AI Matching là đối sánh theo quy tắc, không trình bày điểm như xác suất thành công.
- Điểm Anti-Fraud là cảnh báo phục vụ đối soát, không kết luận người dùng gian lận hoặc traffic chắc chắn sạch.
- Tổng click/đơn lấy bằng `_count` theo kỳ, không dùng số lượng bản ghi bằng chứng giới hạn làm tổng.
- Xử lý gian lận bắt buộc lý do 10–1.000 ký tự và xác nhận trên giao diện. Tạm giữ hoa hồng chỉ áp dụng PENDING của đối tác tại gian hàng liên quan, theo chính sách giữ 90 ngày đã có. Bác bỏ cảnh báo không tự đảo các khoản giữ hoa hồng trước đó.
- Thay đổi trạng thái xử lý và ghi audit phải cùng commit hoặc cùng rollback. Cờ AI tự động không tự khóa tài khoản hay thực hiện chi tiền.
- Nhật ký toàn sàn chỉ dành cho SYSTEM_ADMIN/SYSTEM_MANAGER. Shop không được đọc log của sàn.
- Audit HTTP bổ sung dấu vết kỹ thuật cho log nghiệp vụ, không thay thế log tài chính chuyên biệt. Interceptor không ghi WebSocket và không bắt được request bị guards từ chối trước khi vào interceptor; chat tiếp tục dùng log nghiệp vụ hiện có.
- CSV audit giới hạn 2.000 bản ghi mới nhất mỗi lần xuất. Cần thu hẹp khoảng ngày để xuất theo đợt khi dữ liệu lớn.
- Không thêm migration, seed hay sửa dữ liệu thật trong quá trình kiểm tra.

## Kiểm tra tự động

Backend: build NestJS và các bộ Jest của chat, samples, campaigns, dashboard, leaderboard, AI Matching, Anti-Fraud, audit. Các bài mới bao gồm phân quyền hai phía, phạm vi gian hàng, mốc ngày Việt Nam, trạng thái lưu bền, quy tắc >5.000 click/0 đơn, dữ liệu bí mật và CSV injection.

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
node --test tests/sample-workspace.test.mjs tests/report-export.test.mjs tests/cart-merge.test.mjs tests/chat-notifications.test.mjs
```

Lệnh test frontend toàn dự án hiện còn 6 lỗi từ nguồn đã đồng bộ trước đợt FR-25–32:

- 3 file test tham chiếu `manual-order.validation.ts`, `payout-bill.validation.ts`, `review.validation.ts` không tồn tại trong cây nguồn `da44661`.
- 3 kiểm tra source/regex trong `marketplace.test.mjs` kỳ vọng WorkspaceSwitcher và class Sidebar cũ. Topbar/Sidebar không được chỉnh sửa trong đợt này.
- 20 bài browser được runner bỏ qua khi chưa cấu hình môi trường trình duyệt kiểm thử. Không tính các bài bị bỏ qua là đã kiểm thử end-to-end.

## Giới hạn xác minh môi trường

Frontend dev có thể chạy tại `http://127.0.0.1:5173/`. Backend `.env` đang trỏ cơ sở dữ liệu Supabase dùng chung, Redis local chưa chạy và Docker daemon chưa sẵn sàng. Không tự chạy cron trên dữ liệu dùng chung để thay cho môi trường QA. Cần môi trường kiểm thử riêng cùng PostgreSQL/Redis, tài khoản Shop/KOL/Admin và cấu hình upload/vận chuyển để kiểm tra end-to-end việc gửi tệp, Socket.io, GHN/GHTK và đối soát mẫu.
