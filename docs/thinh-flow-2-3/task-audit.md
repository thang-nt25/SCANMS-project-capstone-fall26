# Đối chiếu nhiệm vụ Thịnh — hai MD
Cập nhật 01/11/2026 theo lựa chọn mới “Áp dụng đầy đủ theo hai MD”. Thay toàn bộ kết luận giữ baseline 11/12/13%, KPI số đơn và không làm MAP/semantic trong các bản trước.

Nguồn: Blueprint phần 8 phân công Flow 2 + nửa đầu Flow 3; chi tiết ở Blueprint mục 1.4, 1.13, 2.3, Main Flow 2–3 và phần 4; Master Plan mục 3.8, 5.3 và 8.3. Màu sắc/bản sắc nhiều Shop tuân AGENTS.md người dùng cung cấp.

| # | Nhiệm vụ | Triển khai hiện tại |
|---|---|---|
| 1 | Ngành hàng Shop cố định | FE readonly, BE chặn khác ngành/Store thiếu ngành |
| 2 | Nhiều Manager/Store | Policy owner/staff đang được phân công; dùng chung các module liên quan |
| 3 | SKU/barcode không trùng | Guard transaction + advisory lock, không tự xóa dữ liệu trùng cũ |
| 4 | Tên gần nghĩa >80 | Embedding đa ngôn ngữ ONNX local thực, cosine >80, xác nhận dòng khác |
| 5 | Form sản phẩm sáu khối | Tái sử dụng cấu trúc, ảnh và hồ sơ sẵn có |
| 6 | Maker-checker sản phẩm | Workflow kiểm duyệt với lý do/audit/thông báo |
| 7 | AI drawer theo productId | Top 5, radar, giải thích, mobile/error/empty |
| 8 | Cold start 70/30 | Dưới 5 đơn dùng ngành/kênh; từ 5 đơn dùng hiệu suất/hồ sơ |
| 9 | KOL Hub | Tin nhắn, xếp hạng, thỏa thuận, AI Radar |
| 10 | Số liệu thực và tier | Bỏ GMV nhân 8/suy số đơn/suy tier FE; tổng theo Store/kỳ |
| 11 | KOC xin hợp tác | Kế hoạch giới hạn đúng cột DB, Shop phản hồi |
| 12 | Shop mời KOC | KOC chấp thuận hoặc từ chối |
| 13 | Không ghi ngược trạng thái | CAS và kiểm quyền hiện tại |
| 14 | Media Hub | Route/tab, quyền trước cache, tải ZIP có manifest/nguồn |
| 15 | Shop chủ động VIP | Từ drawer/Hub/chat, tách nút campaign |
| 16 | VIP hai chiều realtime | Chặn tự ký/khác KOC; GET trạng thái, socket sau commit |
| 17 | VIP 10–25 / ngưỡng 16 | Trên 16 chờ Admin độc lập; role guard và audit |
| 18 | Ba phạm vi VIP | Một sản phẩm, nhóm chọn, toàn Store gồm sản phẩm mới |
| 19 | KPI doanh thu | Net-goods đúng attribution/phạm vi; chờ 14 ngày; tương thích KPI cũ |
| 20 | Cấp tài nguyên nguyên tử | Link/coupon/binding/audit/chat cùng transaction; retry không nhân đôi |
| 21 | Campaign 2–4% | Mới có budget bắt buộc; hỗ trợ đọc contract 1% cũ |
| 22 | MAP từng SKU | Reviewer cấu hình; Shop không tự hạ sàn; checkout kiểm sau voucher |
| 23 | Duyệt giảm giá | Giá/lịch/budget/lý do, chống lịch trùng; scheduler khôi phục giá |
| 24 | Best-Benefit đơn mới | max(VIP, Campaign, Tier, Base)+Live, trần25; giữ snapshot đơn cũ |
| 25 | Kiểm thử và tài liệu | Unit, PG/HTTP/JWT/Socket.IO, browser fixture, inference; đặc tả, checklist, UML |

“Đã triển khai” ở bảng mô tả code; kết quả chạy và số lượng mới nhất xem [verification](verification.md). Người nghiệm thu chạy [checklist](acceptance-tests.md) bằng dữ liệu tự tạo trên DB nhóm và ký riêng; không đánh đồng browser fixture với giao dịch thật trên DB nhóm.

Mẫu thử/SLA, eKYC, GHN, đổi trả, escrow/clawback và chi trả là phần phối hợp theo phân công thành viên, không tự viết lại trong đợt Flow 2–3. Migration bổ sung không reset/seed DB hoặc đổi mật khẩu Shop.
