# FR-07 — Danh mục sản phẩm, tồn kho và xóa mềm

Đối chiếu code workspace ngày 18/10/2026. Tác vụ tạo tài liệu, không thay đổi logic sản phẩm hoặc dữ liệu đang chạy.

## Hai file sơ đồ

1. [Class diagram](diagrams/FR07_Product_Catalog_Soft_Delete_Class_Diagram.drawio)
2. [Sequence diagram](diagrams/FR07_Product_Catalog_Soft_Delete_Sequence_Diagram.drawio)

Class được sinh trước sequence. Mỗi file một trang, trắng đen; sequence gồm đọc danh mục, tạo, sửa/tồn kho SKU, xóa mềm. Điều kiện và thao tác lặp nằm trên thông điệp, không dùng các khung ref/alt/loop ngang. Các lần tải lại sau thao tác dùng lại luồng GET đầu trang.

## Kết luận so với mô tả FR-07

| Hạng mục | Code thực tế |
| --- | --- |
| CRUD sản phẩm | Có danh sách, chi tiết, tạo, cập nhật và DELETE chuyển thành xóa mềm. |
| Tồn kho | Có tồn kho Product và từng ProductVariant; tạo/sync SKU tính tổng tồn kho sản phẩm khi có variants được lưu. |
| % hoa hồng riêng | Có field customCommissionRate nhưng create/update luôn ghi 10; DTO và bulk API chỉ cho 10, không cho Shop tùy chỉnh tỷ lệ qua luồng này. |
| Soft delete | Ghi isDeleted=true, deletedAt=now, isActive=false; không xóa row Product. |
| Hiển thị sản phẩm mới | Tạo mới là DRAFT và inactive, cần kiểm duyệt; không tự lên sàn ngay. |
| Danh mục | categoryName là chuỗi trên Product, không có entity Category trong mô hình này. |

## Nguồn chính

- `frontend/src/pages/merchant/ProductManagementPage.tsx`: loadProducts(), openEditModal(), handleSave(), modal xác nhận xóa.
- `frontend/src/services/product.service.ts`: Product interface và adapter CRUD/variants/sample policy/bulk commission.
- `frontend/src/services/api.ts`, `frontend/src/utils/api-cache.utils.ts`: JWT, client GET cache, invalidation khi ghi.
- `backend/src/modules/products/products.controller.ts`: route và role guard.
- `backend/src/modules/products/products.service.ts`: CRUD, kiểm duyệt lại khi sửa, evidence, tồn kho và variant sync.
- DTO trong `backend/src/modules/products/dto/`: create-product, update-product, query-products, sync-product-variants, update-variant-sample-policy.
- `backend/prisma/schema.prisma`: Product, ProductVariant, Store, MediaAsset, OrderItem.
- `backend/src/modules/products/tests/products.variants.spec.ts`, `products.moderation.spec.ts`: test có sẵn cho tạo/sync variants và duyệt sản phẩm.

## Các lớp và quan hệ

Class diagram dùng các component/function/object frontend đúng tên code, không biến React function thành class nghiệp vụ. Backend gồm ProductsController → ProductsService → PrismaService; ProductsService còn phụ thuộc ConfigService/CacheService. CacheService.delPrefix được dùng để xóa cache landing khi cập nhật, sync variants hoặc xóa mềm.

Domain:

- Store có nhiều Product; Product thuộc một Store, quyền Shop xét qua Store.ownerId.
- Product có nhiều ProductVariant; variant.sku có unique toàn database. Product.sku không có unique constraint trong schema đã đọc; create có kiểm tra ở service theo Store.
- Product có nhiều MediaAsset; productId của asset nullable. Chứng minh nguồn gốc/nhãn dùng COPYWRITE_TEXT, caption marker `SCANMS_PRODUCT_EVIDENCE:*`, trạng thái PENDING. Ảnh phụ dùng IMAGE.
- Product có nhiều OrderItem. OrderItem lưu unitPrice, appliedCommissionRate, calculatedCommissionAmount và commissionSnapshotAt để giữ thông tin giao dịch. Xóa mềm không kích hoạt cascade của hard delete.

## API và quyền

| API | Xử lý |
| --- | --- |
| GET /api/products | findAll(query, viewer), danh sách có phân trang/lọc |
| GET /api/products/:id | findOne(id, viewer), chi tiết và media |
| POST /api/products | create(userId, role, CreateProductDto) |
| PUT /api/products/:id | update(userId, role, id, UpdateProductDto) |
| PUT /api/products/:id/variants | syncProductVariants(userId, role, id, SyncProductVariantsDto) |
| PATCH /api/products/:id/variants/:variantId/sample-policy | Lưu policy mẫu riêng của SKU hoặc kế thừa Product |
| DELETE /api/products/:id | softDelete(userId, role, id) |
| PATCH /api/products/bulk-commission | bulkUpdateCommission(userId, role, productIds, commissionRate) |

CRUD ghi yêu cầu JWT + RolesGuard với SHOP_MANAGER, SYSTEM_MANAGER hoặc SYSTEM_ADMIN. GET quản lý còn cho COLLABORATOR với bộ lọc tương ứng; không phải API catalog public. API landing/public thuộc phạm vi khác.

Shop phải sở hữu sản phẩm/Store khi ghi; SYSTEM_ADMIN và SYSTEM_MANAGER có quyền hỗ trợ không qua owner check đó. Tạo/cập nhật/sync SKU cho SHOP_MANAGER còn yêu cầu Store.isVerified và onboardingStatus=VERIFIED. softDelete không có thêm điều kiện onboarding như ba hàm kia.

Tạo với admin/system manager bắt buộc storeId; Shop tìm Store theo ownerId và storeId nếu được gửi. userId/role lấy từ CurrentUser, không từ form. ValidationPipe toàn cục kiểm tra DTO trước khi controller gọi service.

## Đọc danh mục và màn hình web

Trang lấy current_store_id trong localStorage và gửi search/storeId qua productService.getProducts(). Trang dùng res.items; displayProducts=products. Có biến demoProducts trong file nhưng bị `void demoProducts`, không được dùng làm fallback bảng hiển thị hiện tại.

Service luôn lọc Product.isDeleted=false. Với Shop, ràng buộc Store.ownerId và Store.isDeleted=false được áp dụng, dù client có gửi storeId. Tìm title/SKU không phân biệt hoa thường, lọc categoryName theo contains; sắp createdAt DESC.

page mặc định 1, limit 20; clamp page tối thiểu 1, limit 1–100. count/findMany chạy song song. List include Store, ảnh chưa xóa và **variants đang active**; Shop/admin được gắn thêm evidence. Kết quả bình thường gồm items và pagination. Trường hợp storeId không đúng dạng UUID trả cấu trúc rỗng đặc biệt (`data:[]`, total/page/limit...), frontend vẫn fallback res.items || [].

loadProducts() không gửi page/limit nên dùng mặc định backend; các filter trạng thái trên web còn lọc từ danh sách đã tải. Cache client có thể đáp ứng GET; sequence minh họa cache miss. Mở modal sửa dùng object Product trong danh sách, không mặc định gọi getProduct() lần nữa. Lỗi tải hiện console.error.

## Tạo sản phẩm

Frontend kiểm tra thông tin bắt buộc: category, SKU, title, ảnh chính, giá >0, tồn kho nguyên không âm, nội dung, xuất xứ, nhãn và minh chứng. Cần ít nhất một SKU phân loại với tên/ảnh/SKU và thuộc tính theo danh mục. Các tổ hợp thuộc tính không được trùng; URL minh chứng cần http/https. UI đóng gói thêm thông số kỹ thuật/kích thước/khối lượng vào description khi thích hợp.

CreateProductDto có variants tuy khai báo `?` trong TypeScript nhưng **không có IsOptional**, và có IsArray + ArrayMinSize(1) + nested validation. Mỗi variant có stockQuantity nguyên >=0; create product stock cũng có IsInt. Tỷ lệ hoa hồng nếu gửi phải bằng 10.

Service tìm Store, assertProductSubmissionComplete(), yêu cầu verified Shop, kiểm tra SKU Product đang chưa xóa trong Store và SKU variant toàn database. SKU variant được trim/uppercase, kiểm tra trùng, thuộc tính tối đa bốn key, key theo regex, value chuỗi tối đa 80 ký tự và tổ hợp khác nhau.

Một transaction tạo Product + nested variants + evidence + tối đa bốn ảnh phụ. Product luôn customCommissionRate=10, moderationStatus=DRAFT, isActive=false; stockQuantity bằng tổng stock các variants. Response là `{ message, product }`, HTTP 201. Tạo mới không gọi invalidateLandingCache() trong hàm create đã đọc.

Web kiểm tra nhận được ID, báo thành công, đóng modal và loadProducts(); bản ghi chưa duyệt vẫn hiển thị trong danh mục Shop. Duyệt để bán là luồng riêng, không phải bước luôn tự chạy trong Create.

## Cập nhật sản phẩm và tồn kho SKU

Web thực hiện tuần tự:

1. PUT Product với field form, customCommissionRate=10 và stockQuantity.
2. PUT variants với formVariants.
3. Nếu có policy đã cấu hình, PATCH sample-policy cho từng variant cũ còn trong form.
4. Thành công thì đóng modal, tải lại danh sách; thông báo nếu một response yêu cầu kiểm duyệt lại.

Các request này **không chung một transaction**. Lỗi ở sync hoặc sample-policy không tự undo Product đã lưu. Web giữ saveError và toast; finally bỏ savingProduct.

update() đọc Product/Store/ảnh/evidence, từ chối bản ghi đã xóa hoặc trái quyền. Với Shop, hồ sơ Store phải verified. Nếu đang REJECTED thì gửi lại thành DRAFT; nếu APPROVED và đổi nội dung/giá/ảnh/evidence thì reset DRAFT, xóa thông tin duyệt và isActive=false. Chỉ đổi stock không tự làm approvedShopContentChanged. customCommissionRate vẫn luôn bị ghi 10. isActive chỉ được áp dụng nếu Product đã APPROVED và nội dung không đổi theo điều kiện trong hàm.

sampleQuota có kiểm tra không thấp hơn sampleGrantedCount và một updateMany có điều kiện chống thay đổi đồng thời. Sau đó cập nhật Product, rồi các thao tác media. Evidence loại thay thế được xóa mềm rồi tạo lại; ảnh phụ IMAGE cũ được deleteMany vật lý rồi tạo lại tối đa bốn ảnh. Đây là xóa ảnh, không phải xóa Product; không vẽ toàn bộ update/media thành một transaction vì code không có transaction bao trọn.

UpdateProductDto.stockQuantity có IsNumber + Min(0) nhưng **không có IsInt**, trong khi schema là Int. Không khẳng định DTO cập nhật đã chặn số lẻ. Giá update cho phép 0 ở DTO, khác create cần >0. Một số yêu cầu đầy đủ chỉ áp dụng lúc create.

syncProductVariants() kiểm tra Product chưa xóa, owner/verified Store, chuẩn hóa thuộc tính/SKU, từ chối ID không thuộc Product, ID lặp, tổ hợp trùng và SKU xung đột. Thay đổi số lượng không nằm trong so sánh variantsChanged về nội dung; thay SKU/name/attributes/price/image hoặc số lượng loại SKU có thể đưa Product đã duyệt về DRAFT với Shop.

Sync có transaction riêng: update/create từng SKU, gọi updateMany tắt active theo điều kiện trong code; nếu saved không rỗng thì cập nhật Product.stockQuantity bằng tổng stock saved. Nếu mảng rỗng, code không đặt tổng stock về 0 mà giữ số tồn Product hiện có. Sau commit xóa landing cache.

### Điểm cần chú ý đọc trực tiếp từ code sync

Danh sách `submittedIds` chỉ có ID variant đã tồn tại trong payload. Sau khi tạo row mới, query `productVariant.updateMany` vẫn tắt các row active của Product có id **không thuộc submittedIds**; code không thêm ID vừa tạo vào tập loại trừ. Khi payload có variant mới, query này có thể tắt cả row vừa tạo. Response `savedVariants` là object lấy trước query đó, và tổng tồn được cộng từ saved; vì vậy có thể lệch với các row active sau transaction.

Đây là suy luận từ query thực thi, chưa xác nhận trên database thật trong tác vụ này. Test variants hiện tại mock updateMany nên việc test passed không chứng minh các row mới vẫn active. Sơ đồ ghi rõ điều kiện thực tế, không âm thầm mô tả rằng chỉ SKU bị bỏ khỏi form mới bị tắt. Không sửa bug trong tác vụ vẽ sơ đồ.

## Xóa mềm

Frontend hiện modal xác nhận; xác nhận đóng modal trước, gọi productService.softDeleteProduct(id) → DELETE /api/products/:id. Service tìm Product include Store, không có/đã xóa thì 404; Shop khác owner thì 403; system roles có thể hỗ trợ.

Thao tác dữ liệu duy nhất trên Product là update:

```text
isDeleted = true
deletedAt = new Date()
isActive = false
```

Không gọi product.delete(), không xóa variants/media/OrderItem, không trừ tồn kho, không tính lại commission. Xóa landing prefix theo Product, trả message giữ lịch sử đơn hàng. Web reload list nên Product không xuất hiện vì GET lọc isDeleted=false. Toast web còn ghi “tạm dừng” nhưng API thực sự xóa mềm, không chỉ đổi isActive. Không thấy API restore trong controller này.

## Hoa hồng, cache và giới hạn khác

Create/update DTO chỉ cho customCommissionRate=10, service cưỡng chế 10. bulkUpdateCommission từ chối giá trị khác 10, cập nhật các ID chưa xóa được phép và trả updatedCount; không vẽ tính năng chọn tỷ lệ tự do hoặc lời hứa mọi ID đều được cập nhật. Adapter có bulk method nhưng không thấy lời gọi trong ProductManagementPage hiện tại.

Shared API invalidate client cache `/products` sau POST/PUT/PATCH/DELETE thành công. Backend invalidate `landing:v2:{productId}:` sau update/sync/softDelete; không đồng nghĩa mọi cache referral-link bị xóa. Không khẳng định xóa mềm đã purge mọi cache trong hệ thống.

Ảnh/media upload, kiểm duyệt sản phẩm, đánh giá khách hàng, xử lý đơn giảm tồn và hoa hồng chi trả là các luồng liên quan ngoài sequence CRUD chính. Sequence biểu diễn sample-policy bằng một bước gộp có điều kiện; mỗi PATCH thực tế vẫn đi qua controller/service với guard và validation.

## Mở trong Draw.io

Mở/import toàn bộ `.drawio`. Nếu dùng Extras → Edit Diagram, dán toàn bộ [FR07_Class_Paste.xml](diagrams/FR07_Class_Paste.xml) hoặc [FR07_Sequence_Paste.xml](diagrams/FR07_Sequence_Paste.xml), không dán đoạn XML chọn dở trong IDE. PNG đi kèm là preview bằng renderer nội bộ; file Draw.io vẫn chỉnh sửa được.
