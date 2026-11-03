# Đối chiếu phần còn thiếu của Thịnh trong hai MD

Ngày đối chiếu: 01/11/2026. Mốc code local: `858266e`, nhánh `thinh`.
Nguồn: `SCANMS_REALIGNMENT_BLUEPRINT.md` và `SCANMS_MASTER_REFACTORING_PLAN.md` trong Downloads của người dùng.

Phạm vi phân công ở Blueprint phần 8: Main Flow 2 và nửa đầu Main Flow 3. Các yêu cầu mẫu thử/SLA, eKYC, GHN, escrow, thuế và payout có thành viên khác phụ trách; việc tích hợp vẫn cần nghiệm thu chung. Bản sắc và bảng màu giữ theo AGENTS.md người dùng cung cấp, không tự đổi mô hình nền tảng theo đoạn mâu thuẫn trong MD.

Đây là bản rà soát ban đầu tại `858266e`, trước đợt triển khai bổ sung. Các GAP dưới đây ghi trạng thái tại mốc đó; kết quả sửa và kiểm thử mới xem [báo cáo bổ sung](gap-completion-2026-11-01.md), không đọc bảng cũ như trạng thái hiện tại.

## Các thiếu hụt xác nhận từ code

| ID | Ưu tiên | Yêu cầu / bằng chứng | Phần cần hoàn thiện |
|---|---|---|---|
| GAP-01 | Cao | Blueprint 4.2 yêu cầu tổng điểm bốn trục 35/25/20/20. `matching-score.policy.ts` nhận số đơn, follower, ngành, CR, giá; không nhận điểm tier. `ai-recommendation.service.ts` vẫn tính và trả `tierAndSocialScore` cho Radar. | Điểm tier trên Radar hiện không trực tiếp tham gia điểm tổng. Phải thống nhất công thức, thành phần trả API, Radar, test và thuyết minh. Chỉ sửa tài liệu chưa đủ nếu chọn đúng công thức 4.2. |
| GAP-02 | Cao | Blueprint 4.3 mô tả cosine giữa Bio/Tags và ngành hàng. Code AI KOC gọi `textMatchesCategory`, dùng danh sách nhóm từ khóa trong `category-match.utils.ts`. Model embedding thật hiện nằm ở luồng kiểm tra tên sản phẩm. | Bổ sung đối sánh ngữ nghĩa hồ sơ KOC nếu bám đúng 4.3, hoặc ghi nhận rõ thay đổi thiết kế. Không được dùng bằng chứng model tên sản phẩm để khẳng định đã có model Bio/ngành hàng. |
| GAP-03 | Trung bình | Blueprint 4.3 nói mọi KOC được chấm tương đối dù khác ngành. Service hiện `continue` ngay nếu không có bằng chứng cùng ngành, trước bước tính điểm. | Hiện đã có lọc đúng ngành, chưa có chế độ so sánh đủ mọi KOC như ví dụ tài liệu. Cần tách chế độ lọc phù hợp và chế độ so sánh nếu giữ cả hai hành vi. |
| GAP-04 | Cao | Blueprint bước 2.4 yêu cầu KOC gửi đề xuất trực tiếp từ Marketplace. `MarketplacePage.tsx` và `ShopPage.tsx` chưa tích hợp modal hợp tác. `StoreCooperationPanel` chỉ dùng ở khu vực hợp tác KOC/Shop. | Thêm điểm vào từ Marketplace/trang Shop cho đúng KOC, mang đúng Store ID, hiển thị trạng thái đề nghị và dùng form kế hoạch hiện có. Không phải viết lại API hợp tác. |
| GAP-05 | Trung bình | Master Plan 3.2 yêu cầu ảnh bìa vuông, tối thiểu 800×800. Handler ảnh sản phẩm và Cloudinary hiện kiểm kiểu file/dung lượng nhưng không ép kích thước tối thiểu hoặc ảnh vuông. | Bổ sung kiểm tra/cắt ảnh bìa theo chuẩn này; kiểm tra ở server dành riêng cho ảnh bìa sản phẩm, không áp quy tắc đó cho avatar/bill/chứng từ. |
| GAP-06 | Cao | `ProductManagementPage.tsx` ghi “Không giới hạn số lượng”, handler vẫn thêm ảnh phụ. `CreateProductDto` có `@ArrayMaxSize(4)`; service còn cắt `.slice(0, 4)`. | Đồng bộ giới hạn FE/BE và thông báo rõ trước khi upload. Hiện thêm ảnh thứ năm có thể dẫn đến API từ chối khi tạo hoặc ảnh bị cắt khi cập nhật. |
| GAP-07 | Cao | Maker-checker sản phẩm đã có role guard và trạng thái DRAFT. Tuy nhiên `moderateProduct` chưa kiểm người tạo khác người duyệt; đọc trạng thái trước transaction rồi update chỉ theo ID. Nhánh tạo hàng cho phép cả System Manager/Admin, model Product chưa giữ maker riêng. | Nếu áp dụng người tạo/người duyệt độc lập, cần giữ maker và chặn tự duyệt. Cần CAS hoặc khóa/đọc lại trạng thái trong transaction để hai quyết định duyệt/từ chối không ghi đè. Đây là thiếu bảo đảm trong source, chưa phải kết quả tái hiện race trên DB nhóm. |

Nguồn code chính:

- [Công thức AI](../../backend/src/modules/ai/matching-score.policy.ts)
- [AI recommendation](../../backend/src/modules/ai/ai-recommendation.service.ts)
- [Đối sánh từ khóa ngành hàng](../../backend/src/modules/ai/category-match.utils.ts)
- [Form hợp tác đã có](../../frontend/src/components/affiliate/CooperationRequestModal.tsx)
- [Form sản phẩm](../../frontend/src/pages/merchant/ProductManagementPage.tsx)
- [DTO tạo sản phẩm](../../backend/src/modules/products/dto/create-product.dto.ts)
- [Upload ảnh](../../backend/src/core/cloudinary/cloudinary.service.ts)
- [Service sản phẩm và duyệt](../../backend/src/modules/products/products.service.ts)

## Điểm cần thống nhất thiết kế, không tự kết luận là thiếu code

1. **Công thức AI:** Blueprint 4.2 ghi 35/25/20/20, 4.3 lại ghi 70% hiệu suất + 30% hồ sơ sau năm đơn. Code đã chọn cơ chế thứ hai, nhưng bốn trục không giải thích đầy đủ cách ra điểm tổng. Cần một công thức chính thức và test có ví dụ tính tay.
2. **SKU/Model toàn hệ thống:** Barcode đã được chặn xuyên Shop; SKU hiện duy nhất trong từng Shop. Blueprint 1.4 nói Barcode/Model SKU trùng phải chặn. Cần phân biệt model của cùng hàng hóa với mã SKU nội bộ từng Shop trước khi đổi constraint hoặc dữ liệu cũ.
3. **Tên trạng thái/API:** Dự án dùng DRAFT/APPROVED và các route thực tế khác ví dụ `/api/v1` trong MD. Khác tên không tự đồng nghĩa sai nghiệp vụ; đặc tả và UML phải dùng contract thực tế và có bảng đối chiếu.

## Đã có code, không tính là chưa triển khai

- Khóa ngành hàng FE/BE; form biến thể và tổng tồn; pháp lý/minh chứng và kiểm duyệt theo vai trò.
- Chặn trùng barcode; advisory lock trong ghi dữ liệu; embedding thật cảnh báo tên sản phẩm gần nghĩa.
- Drawer Top 5, Radar; KOL Hub và số liệu theo Store/kỳ; hợp tác thường hai chiều qua API/UI khu vực hợp tác.
- VIP hai chiều qua Socket.IO, phạm vi một/nhóm/toàn Shop, KPI doanh thu, ngưỡng 16% và Admin duyệt ngoại lệ, trần 25%.
- Link/coupon được cấp trong transaction; kiểm thử retry/rollback; MAP từng SKU, đề xuất và duyệt khuyến mãi theo lịch/ngân sách.
- Media Hub có kiểm quyền và tải bộ tài nguyên; đã có kiểm thử tự động, đặc tả, Class/Sequence Diagram và checklist.

“Đã có code” không thay thế UAT. Xem phạm vi và số liệu chạy trong [verification.md](verification.md).

## Phần còn thiếu để nghiệm thu và đưa vào báo cáo

- [Checklist WEB-01–WEB-30](acceptance-tests.md) chưa có đầy đủ ID giao dịch, ảnh và kết quả PASS/FAIL trên DB nhóm. Browser fixture, test PostgreSQL cô lập và đọc hai trang Admin thật chưa chứng minh toàn bộ luồng đa vai trò.
- Cần kiểm thử bổ sung cho các GAP trước khi đánh dấu hoàn tất; đặc biệt tier/điểm AI, quyền tự duyệt, duyệt đồng thời và ảnh phụ thứ năm.
- Lịch sử local vẫn thiếu bảy migration gốc đã nêu trong verification. Đây là phụ thuộc của nhóm khi dựng DB mới; lượt rà soát này chưa truy vấn lại lịch sử DB, không tự dựng SQL thay thế hoặc reset DB.
- Tài liệu đang mô tả phần đã triển khai; phải bổ sung các GAP, thống nhất công thức và lưu minh chứng trước khi chốt báo cáo/BM01/BM02/slide. Lượt này chưa đối chiếu các bản BM01/BM02/slide bên ngoài hai MD.
- Commit code `4896158` và `858266e` đã push lên `thinh` ở các lượt trước. Không còn coi việc push hai commit này là hạng mục chưa làm. Báo cáo rà soát mới này chưa commit/push.

## Yêu cầu ngoài hai MD

Nhóm sản phẩm tự đặt trong Shop như “Bàn phím / Tai nghe / Nồi chiên” hiện chưa có. Hai MD yêu cầu khóa ngành hàng và biến thể, không mô tả đầy đủ chức năng Shop tự quản lý nhóm đó. Đây là yêu cầu bổ sung của người dùng; nên thiết kế nhóm riêng, không thay ngành hàng đã khóa.
