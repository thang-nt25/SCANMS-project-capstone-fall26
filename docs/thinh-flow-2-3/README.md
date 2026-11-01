# Thịnh — Flow 2 và nửa đầu Flow 3

Cập nhật 01/11/2026. Người dùng đã chọn **“Áp dụng đầy đủ theo hai MD”**, thay quyết định giữ baseline cũ. Nhánh triển khai: thinh; nền dev tại f1b4ff0. Trạng thái nghiệm thu được ghi riêng trong acceptance-tests.md.

Đã bổ sung phần trước đây còn thiếu: MAP, duyệt khuyến mãi có lịch/ngân sách, semantic matching bằng mô hình local, ba phạm vi VIP, KPI doanh thu và Admin duyệt mức trên 16%. Giữ cấu trúc NestJS module/controller/service, Prisma transaction, React và màu vàng be.

| Vai trò | Đường dẫn | Thao tác |
|---|---|---|
| Shop | /merchant/products | Tạo hồ sơ; kiểm tra trùng; mở AI drawer |
| Vận hành/Admin | /admin/product-moderation | Duyệt sản phẩm |
| Vận hành/Admin | /admin/pricing | Cấu hình MAP từng SKU; duyệt khuyến mãi |
| Shop | /merchant/pricing | Đề xuất giá giảm, lịch và ngân sách |
| Shop | /merchant/kol-hub | Tin nhắn, xếp hạng, thỏa thuận, AI Radar |
| KOC | /collaborator/collaboration | Hợp tác, đề xuất VIP, tiến độ |
| Shop/KOC | /chat | Gửi và phản hồi VIP hai chiều |
| Admin | /admin/vip-exceptions | Duyệt ngoại lệ trên 16%, có lý do |
| KOC | /collaborator/marketing?tab=media | Tải tài nguyên được phép |

VIP mới 10–25%; đến 16% đối tác chấp thuận, trên 16% chờ Admin độc lập. Chỉ cấp link/coupon và bắt đầu KPI sau quyết định cuối. Có phạm vi một sản phẩm, nhóm đã chọn, toàn gian hàng gồm sản phẩm mới. Đơn mới dùng min(25, max(VIP, Campaign, Tier, 10) + Live); giữ snapshot đơn cũ.

Tài liệu báo cáo:
- [Đặc tả và API thực tế](functional-specification.md)
- [Đối chiếu nhiệm vụ hai MD](task-audit.md)
- [Checklist nghiệm thu](acceptance-tests.md)
- [Bằng chứng kiểm thử](verification.md)
- [Kịch bản bảo vệ](defense-walkthrough.md)
- [Class Diagram](diagrams/Class-Diagram.drawio) và [Sequence Diagram](diagrams/Sequence-Diagram.drawio): tiếng Anh, nền trắng; SVG cùng thư mục.

Chạy máy khác: tại backend lần lượt npm.cmd ci → npx.cmd prisma generate → npm.cmd run semantic:prepare → npx.cmd prisma migrate deploy → npm.cmd run build → npm.cmd run start:prod. Tại frontend: npm.cmd ci → npm.cmd run dev.

Mô hình semantic tải một lần, chạy CPU local, không cần API key AI. Có thể cấu hình SEMANTIC_MODEL_CACHE_DIR bằng đường dẫn tuyệt đối. Không commit model cache hoặc .env. Hướng dẫn tài khoản: [login-setup.md](login-setup.md); giữ nguyên mật khẩu Shop.

Không reset/seed để thử chức năng. UAT dùng dữ liệu mới nhập trên web và lưu DB nhóm; kiểm thử tự động bằng fixture/DB cô lập ghi riêng.
