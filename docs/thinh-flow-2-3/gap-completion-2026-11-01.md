# Bổ sung sau rà soát hai MD — Thịnh

Ngày 01/11/2026, tiếp nối bản rà soát tại `858266e`. Phạm vi: Flow 2 và nửa đầu Flow 3 được phân công cho Thịnh. Giữ kiến trúc NestJS/Prisma/React và màu vàng be hiện có. Không đổi mô hình nhiều Shop của SCANMS.

## Kết quả triển khai

| GAP | Bổ sung | Nguồn code chính |
|---|---|---|
| 01 | Cold-start dưới năm đơn: 70% ngành +30% kênh. Đủ năm đơn: 35% ngành +25% CR +20% tier/kênh +20% phù hợp giá. Trả trọng số, radar và tổng điểm nhất quán | `matching-score.policy.ts`, AI service, `ProductAiMatchDrawer.tsx` |
| 02 | Bio/tags/tên kênh công khai được embedding bằng model local dùng chung; không serialize toàn bộ hồ sơ riêng | `core/semantic/`, `creator-profile.policy.ts` |
| 03 | Mặc định xếp hạng tương đối mọi ngành, không loại chỉ vì khác ngành sản phẩm. Chỉ lọc ngành khi người dùng chọn rõ | `ai-recommendation.service.ts` |
| 04 | KOC mở form kế hoạch ngay trên card Marketplace/gian hàng và header Shop; đúng Store; trạng thái hợp tác dùng chung query; Customer không thấy CTA | `StoreCooperationAction.tsx` và các điểm tích hợp |
| 05 | Cover vuông tối thiểu 800×800, tối đa 5MB, JPG/PNG/WEBP tĩnh; FE kiểm trước upload, server đọc bytes thật qua endpoint riêng | `product-cover.policy.ts`, `upload.controller.ts`, `product-image.policy.ts` |
| 06 | Tối đa bốn ảnh phụ ở form/DTO tạo/DTO cập nhật/service; chặn ảnh thứ năm trước upload, không âm thầm cắt khi cập nhật | `product-media.policy.ts`, DTO, `ProductManagementPage.tsx` |
| 07 | Lưu creator/submitter; cấm tự duyệt; khóa và đọc lại trạng thái trong transaction; hai reviewer chỉ một quyết định commit. Nội dung, quota, evidence và gallery cập nhật cùng transaction | Prisma migration, `products.service.ts`, hai trang reviewer |

Chọn công thức warm 35/25/20/20 của Blueprint 4.2 để bốn trục giải thích đúng điểm tổng. Mục 4.3 ghi warm 70/30 khác công thức này; đây là quyết định triển khai được công khai trong đặc tả, không tuyên bố hai đoạn MD hoàn toàn đồng nhất. Ngưỡng cosine 60 khi lọc category là ngưỡng chính sách; không phải xác suất tương thích. Ngưỡng cảnh báo tên sản phẩm vẫn >80.

## Database và tương thích

- Migration `20261101020000_product_moderation_makers` đã kiểm thử local và deploy lên DB phát triển nhóm. Chỉ thêm hai cột nullable, FK và index; không reset, seed hoặc thay mật khẩu.
- Maker của dữ liệu cũ chưa biết giữ NULL. Không suy ngược người tạo từ owner/reviewer; không khẳng định có dấu vết maker đầy đủ cho lịch sử cũ.
- SKU nội bộ vẫn duy nhất theo Store, barcode vẫn kiểm xuyên danh mục. Không đổi constraint để giả định SKU nội bộ là model hàng hóa toàn hệ thống.
- Endpoint cover bảo vệ luồng upload mới. Không tự tải lại/ghi lại toàn bộ ảnh cũ; URL do client khác trực tiếp gửi vào API sản phẩm không được coi là đã tái xác minh kích thước.
- Bảy migration gốc đã có trong lịch sử DB nhưng chưa có file trong repo/lịch sử Git đã kiểm tra vẫn là phụ thuộc nhóm. Không tạo SQL giả hoặc reset/resolve để che lịch sử thiếu.

## Bằng chứng và nghiệm thu

Số test cuối, lệnh tái lập và giới hạn tại [verification.md](verification.md). Kiểm thử tích hợp dùng PostgreSQL local cô lập, không DB nhóm. Browser fixture kiểm component thật với API fixture; đọc API/trang Shop thực dùng DB nhóm được ghi riêng. Không sử dụng những ca này để ký thay toàn bộ UAT.

Kiểm tra trực tiếp API mới trên DB nhóm: Admin/KOC đăng nhập thành công; AI trả 16/16 KOC với cả hai chế độ, tổng điểm khớp radar và trọng số; đọc trạng thái hợp tác thành công. Trang Shop thật hiển thị đúng trạng thái hợp tác hiện có ở 1440px và 390px, không tràn ngang/không lỗi JavaScript trong lượt chạy. Không gửi đề nghị hợp tác, upload cover hoặc thay sản phẩm thật chỉ để lấy minh chứng này.

Người nghiệm thu tiếp tục [WEB-01–WEB-34](acceptance-tests.md), lưu ID/ảnh/kết quả từ thao tác mới trên DB nhóm. Các module eKYC, mẫu/SLA, GHN, escrow và tài chính của thành viên khác cần nghiệm thu chung. Chưa tuyên bố hoàn tất toàn bộ đồ án hay đã kiểm tra BM01/BM02/slide bên ngoài hai MD.
