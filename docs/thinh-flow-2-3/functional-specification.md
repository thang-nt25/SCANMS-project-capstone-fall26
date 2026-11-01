# Đặc tả triển khai Flow 2 và nửa đầu Flow 3

Phiên bản 01/11/2026 theo quyết định “Áp dụng đầy đủ theo hai MD”. Giữ bản sắc SCANMS nhiều gian hàng và màu vàng be theo AGENTS.md. Các API dưới đây là đường dẫn thực tế của repository.

## Kiến trúc và quyền

Backend NestJS module → controller → service/domain policy, DTO validation, JWT, RolesGuard. Prisma giữ giao dịch nghiệp vụ; Socket.IO phát sau commit. FE React/TypeScript tái sử dụng Modal, form VIP và layout sẵn có.

managedStoreWhere kiểm tra chủ Store hoặc SHOP_MANAGER đang được phân công và còn hoạt động. Kiểm tra quyền trước cache với AI, Media Hub và báo cáo riêng. Thu hồi quyền phải chặn request và sự kiện websocket tiếp theo, dù trước đó đã join room.

## Hồ sơ sản phẩm và semantic matching

Giữ form sáu khối, ngành hàng cố định theo Store, biến thể, ảnh, chứng từ và workflow DRAFT → APPROVED/REJECTED có lý do/audit/thông báo. SKU không phân biệt hoa thường trong Store; barcode không trùng danh mục chưa xóa. Guard chạy trong transaction với advisory lock, độc lập với preflight FE.

GET /api/products/identity-check dùng sentence embedding đa ngôn ngữ Xenova/paraphrase-multilingual-MiniLM-L12-v2, revision cố định 2c4055b12046f11709e9df2c122e59ffbdc2f900, ONNX q8 CPU local. Chuẩn bị bằng npm.cmd run semantic:prepare. Cosine >80/100 cảnh báo tối đa năm ứng viên; đây không phải xác suất trùng hàng. Người dùng xác nhận là dòng khác để tiếp tục; mã định danh trùng vẫn bị chặn. Model lỗi/chưa tải trả 503 rõ ràng, không dùng token overlap giả làm semantic AI. Tên sản phẩm không gửi sang dịch vụ AI ngoài.

Nguồn kỹ thuật: [model card](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2), [Transformers.js dtypes](https://huggingface.co/docs/transformers.js/guides/dtypes).

## Giá sàn và duyệt khuyến mãi

Product/ProductVariant bổ sung listPrice và floorPrice. Migration backfill listPrice bằng giá hiện có; không tự bịa MAP cho dữ liệu cũ. Reviewer cấu hình MAP theo căn cứ kinh doanh.

ProductPricePromotion gồm sản phẩm/SKU, giá giảm, lịch, ngân sách, lý do và dấu vết duyệt. Trạng thái: PENDING → APPROVED → ACTIVE → EXPIRED; nhánh REJECTED hoặc CANCELLED. SYSTEM_MANAGER/SYSTEM_ADMIN duyệt, người gửi không tự duyệt. Không duyệt lịch chồng cùng SKU; toàn sản phẩm xung đột mọi SKU trong khoảng đó. Scheduler 30 giây kích hoạt/kết thúc và khôi phục giá niêm yết từng SKU.

Checkout giữ khóa dòng sản phẩm, kiểm giá hiện tại, MAP trên tiền hàng sau voucher (không tính ship), rồi giữ ngân sách bằng conditional UPDATE và ghi ProductPromotionUsage trong cùng transaction tạo đơn. Giá cũ, MAP hoặc ngân sách lỗi làm rollback toàn bộ. Hủy đơn hoàn ngân sách đúng một lần. Chặn sửa giá/cấu trúc SKU khi có khuyến mãi đã duyệt; sửa giá luôn kiểm MAP. Đơn cũ giữ snapshot.

| API | Quyền |
|---|---|
| GET /api/pricing/catalog; /promotions | Shop trong phạm vi; reviewer toàn hệ thống |
| PUT /api/pricing/products/:id/floor | SYSTEM_MANAGER / SYSTEM_ADMIN |
| POST /api/pricing/promotions | SHOP_MANAGER |
| PATCH /api/pricing/promotions/:id/review | SYSTEM_MANAGER / SYSTEM_ADMIN |
| PATCH /api/pricing/promotions/:id/cancel | Shop trong phạm vi / reviewer |

## AI matching và báo cáo KOC

Drawer giữ productId, Top 5, radar bốn chỉ số, giải thích và độ đủ dữ liệu. Số đơn/GMV/CR từ DB; tier từ hồ sơ lưu, không suy từ doanh thu hay tự sinh dữ liệu.

Dưới 5 đơn: 70% ngành hàng + 30% quy mô kênh. Từ 5 đơn: 70% hiệu suất + 30% hồ sơ. Hiệu suất = 60% điểm CR + 40% phù hợp giá; hồ sơ = 70% ngành hàng + 30% quy mô kênh. Điểm kênh = min(100, round(log10(1+followers)/6*100)). Trả scoringMode, dữ liệu thực và độ tin cậy riêng. Điểm xếp hạng không phải xác suất chốt đơn.

Quyền được kiểm trước cache; key gồm actor, role, sản phẩm và mọi bộ lọc. Không dùng đội mẫu khi 403/rỗng/lỗi. Báo cáo Shop/KOC lấy tổng theo Store/kỳ trên tất cả các trang, phân biệt hoa hồng phát sinh và tiền đã trả.

## Hợp tác và Media Hub

Hợp tác thường và VIP tách riêng. KOC gửi kế hoạch; Shop mời theo email; bên nhận chấp thuận/từ chối. CAS ngăn request/lời mời ghi ngược trạng thái vừa duyệt.

Media Hub kiểm partnership hiện tại trước cache, chỉ trả tài nguyên có quyền. ZIP gồm file, kịch bản, manifest và đường dẫn nguồn streaming. File lỗi/nguồn streaming không bị giả thành video tải thành công.

## VIP hai chiều và ba phạm vi

ExclusiveDealProposal giữ sender, điều kiện coupon, scopeKey, targetRevenue, kỳ cam kết và dấu vết hai bước duyệt. ExclusiveDealProduct giữ danh sách chọn và link đã cấp; productId gốc vẫn là sản phẩm đại diện để tương thích dữ liệu cũ.

Phạm vi: SINGLE_PRODUCT; SELECTED_PRODUCTS (2–100 sản phẩm cùng Store); STORE_WIDE gồm sản phẩm đủ điều kiện thêm về sau. Không thay phạm vi/điều kiện bằng payload lúc ký. Resolver chọn mức tốt nhất trên các phạm vi giao nhau.

10–16%: PENDING → APPROVED/REJECTED. Trên 16%: bên nhận chấp thuận → PENDING_ADMIN_APPROVAL → APPROVED/REJECTED bởi SYSTEM_ADMIN độc lập. SYSTEM_MANAGER không được duyệt ngoại lệ; người đề xuất/chấp thuận không tự duyệt. Trần 25%.

Chờ Admin chưa cấp link/coupon/chưa bắt đầu KPI. Kích hoạt khóa Store/KOC, tra lại quyền/trạng thái; link, coupon đúng phạm vi, binding, đóng phiên bản cùng phạm vi cũ, audit và thẻ chat commit/rollback cùng nhau. Request lặp không cấp hai lần. Socket phát sau commit và kiểm lại người nhận.

| API | Mục đích |
|---|---|
| POST /api/affiliate-deals/proposals | KOC đề xuất |
| POST /api/affiliate-deals/offers | Shop gửi offer |
| PATCH /api/affiliate-deals/:id/accept; /decline | KOC nhận offer phản hồi |
| PATCH /api/affiliate-deals/:id/approve; /reject | Shop xử lý đề xuất KOC |
| GET /api/affiliate-deals/exceptions | Admin xem hàng đợi |
| PATCH /api/affiliate-deals/:id/exception-review | Admin quyết định với lý do |
| GET /api/affiliate-deals/:id | Trạng thái hiện tại |
| GET /api/affiliate-deals/:id/progress | Tiến độ KPI |
| POST /api/affiliate-deals/:id/terminate | Xử lý thiếu KPI sau đối soát |

## Doanh thu KPI và Best-Benefit

Chỉ tính dòng thuộc phạm vi và attribution đúng KOC; link dòng ưu tiên attribution đầu đơn. Đơn COMPLETED, chưa hoàn tiền, tạo trong kỳ và hoàn tất trước hạn đối soát mới tính hợp lệ. Dùng goodsPricing.netGoods; đơn cũ thiếu snapshot phân bổ giảm tiền hàng theo tỷ lệ. Loại ship. Đơn đang giao/đổi trả/tranh chấp hiển thị doanh thu chờ riêng.

Sau kỳ cam kết có 14 ngày đối soát. Chưa hết hạn không chế tài; thiếu KPI sau hạn mới REVIEW_REQUIRED. Deal cũ targetRevenue null vẫn đọc KPI số đơn cũ, không viết lại lịch sử.

Đơn mới = min(25, max(VIP, 10+campaignBonus, 10+tierBonus, 10) + liveBonus). Campaign mới thưởng 2–4% có ngân sách; dữ liệu cũ 1% vẫn được đọc. Chỉ giữ ngân sách campaign khi campaign thắng. Snapshot trước Live giữ đúng rate trước Live kể cả khi mức cuối chạm 25%. Thưởng tháng độc lập.

## Migration và bằng chứng

Migration thêm: 20261101000000_exclusive_deal_shop_offers; 20261101010000_enterprise_pricing_and_vip. Không reset/seed/đổi mật khẩu. Kết quả cuối trong verification. PostgreSQL/HTTP/JWT/Socket.IO dùng DB test riêng; browser tests dùng fixture; semantic có inference smoke thực.

Phân công Thịnh: Flow 2 + nửa đầu Flow 3. eKYC, mẫu/SLA, GHN/đổi trả, escrow và tài chính thành viên khác giữ contract đang có. Kiểm thử phần này không thay chữ ký UAT của người dùng hoặc nghiệm thu cả hệ thống.
