# FR-08 — Kho Media và 1-Click Copy

Phân tích code workspace ngày 18/10/2026. Tài liệu phân biệt chức năng đã nối trên web với API backend có sẵn; không thay đổi nghiệp vụ hoặc dữ liệu.

## Hai sơ đồ

1. [Class diagram](diagrams/FR08_Media_Hub_One_Click_Copy_Class_Diagram.drawio)
2. [Sequence diagram](diagrams/FR08_Media_Hub_One_Click_Copy_Sequence_Diagram.drawio)

Mỗi file một trang, trắng đen, class tạo trước sequence. Sequence mô tả các luồng độc lập: Shop/admin tạo asset qua API; KOL upload/nộp video; KOL đọc thư viện và copy/tải. Điều kiện được đặt trên message thay cho khung ngang ref/alt/loop. UploadController/CloudinaryService được gộp một lifeline có ghi rõ; hai component frontend cũng gộp vào một lifeline cho vừa trang.

## Kết luận so với yêu cầu

| Nội dung | Hiện trạng |
| --- | --- |
| Banner, video, kịch bản SEO | MediaAsset hỗ trợ IMAGE, VIDEO, COPYWRITE_TEXT. Shop/system có POST /media lưu URL hoặc nội dung text. |
| Form Shop upload banner/kịch bản vào kho | Có mediaService.createMediaAsset() và API, nhưng không tìm thấy nơi gọi createMediaAsset trong web hiện tại. Không vẽ thêm form chưa có. |
| KOL nộp video review | Có SubmitKolVideoModal: upload file hoặc nhập URL, gửi /media/kol-submission, lưu PENDING. |
| 1-Click Copy | Copy kịch bản lưu trong asset hoặc copy caption dựng ở frontend qua navigator.clipboard.writeText. Không có API copy riêng. |
| Tải ảnh/video đơn lẻ | window.open(url, '_blank'); phụ thuộc cách nguồn phục vụ tệp, không bảo đảm download attachment. |
| Tải cả gói | Có buildMediaPack/saveMediaPack tạo ZIP trong browser, kèm scripts TXT và source links khi cần. |
| Banner HD | Code đã đọc không có ngưỡng pixel tối thiểu, kiểm tra chất lượng HD hoặc cơ chế nâng độ phân giải. |

## Nguồn đã đọc

- `frontend/src/pages/collaborator/MarketingToolkitPage.tsx`: tab kho nội dung, modal nộp video, event refresh.
- `frontend/src/pages/collaborator/MediaHubBrowserPage.tsx`: fetchMedia, filter, preview, copy, download, ZIP, xóa bài nộp.
- `frontend/src/components/media/SubmitKolVideoModal.tsx`: upload file, URL, submit, campaign/sample alternatives.
- `frontend/src/services/media.service.ts`, `frontend/src/services/upload.service.ts`, `frontend/src/services/api.ts`: adapter và HTTP/cache.
- `frontend/src/utils/media-pack.utils.ts`: tạo ZIP tại client.
- `backend/src/modules/media/media.controller.ts`, `media.service.ts` và DTO: quyền, thư viện, tạo/nộp/duyệt/xóa.
- `backend/src/core/cloudinary/upload.controller.ts`, `cloudinary.service.ts`: stream file lên Cloudinary.
- `backend/prisma/schema.prisma`: MediaAsset, Store, Product, User, StoreCollaborator và các quan hệ liên quan.
- `backend/src/modules/media/tests/media.moderation.spec.ts`: test hiện có về URL, quyền nộp/duyệt, featured, sample review và DTO campaign.

## Giao diện hiện tại

Kho nội dung nằm ở `/collaborator/marketing?tab=media`; route cũ `/collaborator/media-hub` chuyển hướng về tab này. MarketingToolkitPage có nút nộp video; MediaHubBrowserPage cũng có modal riêng và xử lý callback thành công.

fetchMedia() gọi getMediaAssets({limit:100}), không đi qua toàn bộ các trang backend. UI lọc search title/product/Store, productId, assetType và MY_SUBMISSIONS ngay trên mảng đã tải. Có loading, lỗi tải và thao tác thử lại. Event `scanms_media_updated` gây refresh và chuyển sang MY_SUBMISSIONS; callback trực tiếp của modal trong library cũng làm tương tự.

Danh sách coupon ACTIVE của KOL được tải riêng để chèn vào caption template. Lỗi coupon trả mảng rỗng; đó không phải đầu vào bắt buộc để copy script đã lưu. Không vẽ coupon lookup như một bước server-side của MediaService.

## Class diagram và model

Frontend chính gồm MediaHubBrowserPage, SubmitKolVideoModal và object mediaService. Modal dùng shared api **trực tiếp** cho upload file, không gọi uploadService.uploadVideo(). Backend MediaController phụ thuộc MediaService, còn file upload đi qua UploadController → CloudinaryService → Cloudinary SDK. Upload không tự tạo MediaAsset.

MediaAsset chứa id, storeId, productId?, collaboratorId?, sampleRequestId?, title, assetType, urlOrContent, posterUrl?, caption?, status, isFeatured, reviewedBy?, reviewedAt?, rejectionReason?, isDeleted, deletedAt?, timestamps.

Quan hệ thực:

- Mỗi asset thuộc một Store; một Store có nhiều asset.
- Asset có thể gắn một Product; một Product có nhiều asset. Product không bắt buộc với Shop/API create.
- Asset có thể thuộc một User KOL; reviewedBy là quan hệ User riêng, nullable.
- Asset có thể liên kết SampleProductRequest, dùng trong luồng video mẫu.
- StoreCollaborator APPROVED là điều kiện quyền thư viện/nộp của KOL; không phải field boolean giả trên asset.

Không có entity CopyEvent hay bộ đếm copy trong module đã đọc. Clipboard và ZIP là browser/local functions trong sơ đồ.

## API và quyền

| Route | Quyền và hành vi |
| --- | --- |
| GET /api/media | JWT + COLLABORATOR / SHOP_MANAGER / SYSTEM_MANAGER / SYSTEM_ADMIN; lọc theo viewer |
| POST /api/media | JWT + SHOP_MANAGER / SYSTEM_MANAGER / SYSTEM_ADMIN; tạo asset APPROVED |
| POST /api/media/kol-submission | JWT + COLLABORATOR / SYSTEM_ADMIN; vẫn kiểm tra quan hệ KOL trong service; tạo VIDEO/PENDING |
| PATCH /api/media/:id/review | JWT + SHOP_MANAGER / SYSTEM_MANAGER / SYSTEM_ADMIN; kiểm tra chủ Shop nếu không phải system role |
| DELETE /api/media/:id | JWT + KOL/Shop/system; service kiểm tra quyền sở hữu và ràng buộc video nhận mẫu |
| POST /api/upload/image hoặc /video | FileInterceptor('file'); không có decorator UseGuards tại UploadController đã đọc |

Không suy diễn upload route có cùng role guard với MediaController. Shared API frontend có thể gửi JWT, nhưng đó khác việc route backend có guard.

## Đọc thư viện

MediaService.findAll() luôn lọc isDeleted=false. page >=1, limit 1–100; count và findMany chạy song song; sort createdAt DESC; include tên Store, Product và KOL.

- SHOP_MANAGER: Store.ownerId phải trùng user, Store chưa xóa.
- COLLABORATOR: Store chưa xóa, đang active và có StoreCollaborator APPROVED của KOL. Trong phạm vi đó, asset phải APPROVED **hoặc** collaboratorId là KOL hiện tại.
- System roles: không có thêm các hạn chế Store/status dành cho KOL trong nhánh service này.

Vì vậy KOL có thể thấy chính bài mình PENDING/REJECTED/HIDDEN, nhưng không vượt điều kiện Store/membership. Không mô tả toàn bộ thư viện KOL là APPROVED-only. Bộ lọc query storeId/productId/assetType được áp dụng cùng điều kiện quyền, không thay thế nó. Hàm này không có thêm điều kiện Product chưa xóa/active như API landing.

Shared API có cache GET `/media`. Sequence minh họa cache miss; cache hit không gọi backend. Các lần ghi thành công làm invalidate cache client liên quan. Backend CacheService được dùng để xóa prefix landing khi asset gắn Product, không phải một kho copy text riêng.

## Shop/admin tạo asset qua API

CreateMediaDto nhận storeId?, productId?, title, assetType, urlOrContent. Title/content là string không rỗng, assetType là enum. Service trim trước lưu. Với Shop, chọn Store đầu tiên theo ownerId/isDeleted=false; không dùng storeId gửi lên để đổi quyền sang Shop khác. System roles cần storeId hoặc productId để suy ra Store.

Nếu gắn productId thì Product phải thuộc Store đã chọn và chưa xóa. Với IMAGE/VIDEO, validateAllowedUrl() kiểm tra URL; COPYWRITE_TEXT giữ nội dung văn bản, không qua kiểm tra host ảnh/video. Tạo MediaAsset trạng thái APPROVED, trả `{message,asset}`, HTTP 201; nếu có Product thì xóa cache `landing:v2:{productId}:`.

Đây là tạo metadata/URL, không phải multipart upload. Nếu cần file Cloudinary, upload phải thực hiện riêng trước khi gọi create. API này không có transaction bao cả file upload và database; không có cleanup file khi bước lưu asset sau upload thất bại.

mediaService.createMediaAsset() còn khai báo optional posterUrl/caption trong frontend nhưng CreateMediaDto không có hai field đó; với whitelist + forbidNonWhitelisted, không nên khẳng định API create nhận được mọi field trong type frontend. Chưa có caller web hiện tại để mô tả đây là form Shop hoàn chỉnh.

## KOL upload và nộp review

Modal có thể nhập URL hoặc chọn file. Video client kiểm tra MIME/extension MP4/MOV/WEBM/AVI và tối đa 100 MB; poster JPG/PNG/WEBP/GIF tối đa 5 MB. Modal tạo blob preview, gửi FormData qua shared api tới `/upload/video?folder=scanms/kol-reviews` hoặc `/upload/image?...`.

UploadController nhận file, gọi CloudinaryService. Service kiểm tra file có tồn tại và MIME bắt đầu bằng image/ hoặc video/, stream buffer qua cloudinary.uploader.upload_stream; video có chunk_size=6000000. Trả publicId, url, secureUrl, bytes, format, resourceType, width/height và duration với video. Không có kiểm tra HD/pixel tối thiểu trong các hàm này. Giới hạn kích thước client không đồng nghĩa đã được enforcement y hệt ở backend upload service.

Modal dùng shared API mặc định timeout 10 giây; khác uploadService.uploadVideo() có timeout 180 giây nhưng không được gọi ở đây. Lỗi upload video hiện gán local blob URL để kiểm thử. Frontend isDomainAllowed chấp nhận blob/relative và localhost, nhưng backend submission không chấp nhận blob hoặc localhost: upload fail không tạo một video lưu bền hợp lệ để nộp như bình thường. Poster lỗi hiển thị lỗi upload, không tự biến local preview thành URL lưu bền.

Submit thông thường yêu cầu chọn Product, title và video URL; payload có productId/title/videoUrl và poster/caption/campaign nếu có. Service kiểm tra:

1. validateAllowedUrl cho video/poster.
2. Product chưa xóa, moderationStatus=APPROVED; Store chưa xóa và active. Query này không lọc Product.isActive.
3. StoreCollaborator của KOL phải APPROVED.
4. Chỉ khi requiresCampaignParticipation hoặc campaignId có giá trị mới kiểm tra CampaignProduct với campaign active, trong thời gian và participant ACCEPTED.
5. Tạo VIDEO/PENDING, collaboratorId hiện tại, isFeatured=false; không tự công khai.

Thành công callback refresh thư viện, hoặc MarketingToolkit phát scanms_media_updated. Modal đóng/reset sau 1,8 giây. Các nhánh sampleRequestId và sandboxOrderCode dùng endpoint sample/shipping riêng; sequence này mô tả submission bình thường, không trộn việc nghiệm thu video mẫu vào mọi lần nộp.

## Duyệt và xóa media

Review không cho chuyển PENDING. REJECTED/HIDDEN cần lý do. Shop chỉ duyệt asset thuộc Store mình; system roles được hỗ trợ. Transaction reset featured của các video khác cùng Product khi yêu cầu featured, cập nhật trạng thái/người duyệt/thời điểm/lý do, tạo AuditLog MEDIA_REVIEWED. Nếu gắn sampleRequest phù hợp, còn cập nhật nghĩa vụ video mẫu/event/notification trong transaction. Sau commit xóa cache landing khi có Product. Đây là luồng riêng, không có chuyện upload xong KOL tự APPROVED.

softDelete cho system roles, Store owner hoặc chính KOL sở hữu asset. KOL không được tự xóa video gắn sampleRequest nếu không đồng thời là Store owner/system. Xóa bằng isDeleted=true/deletedAt=now, không gọi Cloudinary destroy. Xóa landing cache nếu có Product; web loại asset khỏi state sau thành công. Không tạo endpoint copy qua delete/create.

## 1-Click Copy và download

Có **hai nguồn văn bản**:

- COPYWRITE_TEXT từ database: thẻ hoặc modal preview gọi `navigator.clipboard.writeText(asset.urlOrContent)`.
- Caption template trong frontend: short/review/offer/livestream, dùng product title, Store, tên KOL, coupon ACTIVE được chọn. handleCopyCaption() gọi writeText(template).

Các lời gọi writeText hiện không await/catch. UI hiển thị toast ngay, copiedCaption đổi trạng thái và reset sau hai giây; toast chung tắt sau ba giây. Vì vậy sơ đồ không vẽ backend ghi nhận copy thành công, không có response xác nhận copy, và không khẳng định trình duyệt luôn cho phép Clipboard API.

Template dùng URL hardcode `https://scanms.vn/products/{product.sku || productId || fallback}`. Không gọi FR-10 để sinh `/r/{shortCode}`, không tự chèn referral link đã ký. Copy text không upload binary ảnh/video vào clipboard, không tự đăng lên mạng xã hội.

IMAGE/VIDEO đơn lẻ dùng window.open(sourceUrl,'_blank'), rồi toast tải xuống. Đây có thể là mở trang YouTube/TikTok hoặc xem file, không phải backend proxy tải ảnh/video.

Gói ZIP dùng danh sách đã lọc trong browser. buildMediaPack lazy-load JSZip, lưu script TXT, fetch media nếu được, giới hạn 250 MB tổng byte media đã đọc; với nguồn streaming hoặc tệp không fetch được thì thêm .url liên kết nguồn. Có manifest DANH-SACH.txt và HUONG-DAN-SU-DUNG.txt, progress và AbortController. saveMediaPack dùng Object URL + thẻ a download; revoke URL sau 60 giây. Không có API ZIP hoặc endpoint tăng lượt copy/download trong module này.

## Giới hạn kiểm tra URL

Backend chặn script/data/vbscript, yêu cầu http/https cho URL absolute, chặn một số host loopback/private và host không thuộc allowlist; có thêm ALLOWED_MEDIA_DOMAINS từ cấu hình. Hàm cũng chấp nhận đường dẫn bắt đầu `/` ngay trước khi parse host. Đây là hành vi code đã đọc, không khẳng định đầy đủ mọi trường hợp URL hoặc DNS đều được bảo vệ. Không đọc giá trị cấu hình nhạy cảm để viết tài liệu.

## Mở trong Draw.io

Mở/import toàn bộ hai file `.drawio`. Nếu dùng Extras → Edit Diagram, dán toàn bộ [FR08_Class_Paste.xml](diagrams/FR08_Class_Paste.xml) hoặc [FR08_Sequence_Paste.xml](diagrams/FR08_Sequence_Paste.xml), không copy đoạn XML chọn dở. PNG là preview từ renderer nội bộ; `.drawio` chứa các phần tử chỉnh sửa được.
