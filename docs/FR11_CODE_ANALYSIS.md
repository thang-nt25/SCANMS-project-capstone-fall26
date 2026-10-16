# FR-11 - Tạo mã QR Code động

Đối chiếu mã nguồn hiện tại ngày 2026-10-16. Đã tạo hai file draw.io riêng: class diagram có bố cục rộng; sequence diagram thể hiện xem trước trên trình duyệt và tải file từ máy chủ. Cả hai dùng trắng đen. Chỉ chọn các thành phần/thuộc tính liên quan FR-11, không sao chép toàn bộ module tracking.

## 1. Hai đường sinh QR khác nhau trên web

`ReferralLinksPage` dùng `useQrDataUrl` để tự dựng preview bằng thư viện `qrcode` trên trình duyệt, không gọi API QR. Target là `shortUrl` thêm `?via=qr` hoặc `&via=qr` nếu đã có query. Hook gọi `QRCode.toDataURL`, width 512, margin 4, errorCorrectionLevel M, màu #1A1612 trên trắng. Hook cung cấp dataUrl, qrLoading, qrError và retry. Hai nơi dùng hook: màn hình tạo link thành công và modal QR của link đã có.

Tải ảnh gọi `referralLinksService.downloadQrCode`. Modal QR hỗ trợ PNG/SVG, size 512/1024/2048 (mặc định 1024); nút tải sau khi tạo link chỉ yêu cầu PNG 1024. API client GET `/api/referral-links/{id}/qr`, params format, size, download=true, responseType blob. Client tạo Object URL, tạo thẻ a với thuộc tính download, click và thu hồi URL sau 1 giây. UI tăng bộ đếm hiển thị khi lời gọi thành công; lỗi hiện ở dialog. Không dùng ảnh preview cục bộ để thay thế file tải lỗi.

## 2. Controller và phân quyền

Chức năng nằm trong `CollaboratorReferralLinksController`, không có QrController riêng. Controller có hai prefix `collaborator/referral-links` và `referral-links`; QR có route `:id/qr` và `by-code/:id/qr`. Controller dùng JwtAuthGuard, RolesGuard; method QR cho COLLABORATOR, SHOP_MANAGER, SYSTEM_ADMIN, SYSTEM_MANAGER.

`getQrCode` lấy user từ xác thực. download=true hoặc 1 được hiểu là tải về; format chuyển chữ thường; size parseInt rồi fallback 1024. Sau đó gọi `ReferralLinksService.generateQrCode` với options là object inline. Không có QR DTO class riêng. Vì parseInt/fallback, một số chuỗi size không thuần số vẫn thành size mặc định hoặc số hợp lệ; sơ đồ mô tả kiểm tra size tại service, không khẳng định có IsEnum/DTO cho query.

Service chấp nhận png/svg và size 512/1024/2048; tìm ReferralLink theo id hoặc shortCode chữ thường, deletedAt null, lấy kèm Product, Store và User cộng tác viên.

- Không tìm thấy link: 404.
- KOL: collaboratorId phải bằng user.id.
- Shop Manager: Store.ownerId phải bằng user.id.
- System Admin/System Manager được phép hỗ trợ toàn hệ thống.
- Không đúng quyền: 403.

Code generateQrCode không từ chối status PAUSED/BLOCKED/expired; nó chỉ loại link bị xóa và kiểm tra ownership. Trạng thái hoạt động/hết hạn được xử lý khi truy cập đường redirect sau khi quét. Không suy diễn từ thông báo UI rằng API QR đã kiểm tra toàn bộ trạng thái.

## 3. Rate limit, cache và render

Sau ownership check, CacheService.checkRateLimit dùng khóa `qr_rl:{user.id}:dl` hoặc `qr_rl:{user.id}:prev`, giới hạn tải 20/phút hoặc backend preview 60/phút. Vượt giới hạn trả 429. Preview thực tế trên React không đi qua limiter API này.

Shop/Admin thao tác thay KOL tạo AuditLog action QR_DOWNLOAD_AUDIT hoặc QR_VIEW_AUDIT trước khi đọc cache. Lỗi ghi audit được log và bỏ qua. KOL xem/tải link của chính mình không tạo audit hỗ trợ này.

Backend dựng payload `{publicAppUrl}/r/{shortCode}?via=qr`. getPublicAppUrl chọn PUBLIC_APP_URL, FRONTEND_URL, cuối cùng http://localhost:5173 và bỏ dấu / cuối. Code không bắt buộc HTTPS tại hàm này, mặc dù comment nghiệp vụ mô tả URL HTTPS.

Khóa cache `qr_render:{link.id}:{format}:{size}`, TTL 86400 giây. CacheService dùng Redis khi hoạt động và bộ nhớ trong tiến trình khi fallback. Cache hit PNG giải mã base64 sang Buffer, SVG dùng string. Cache miss PNG gọi QRCode.toBuffer, SVG gọi QRCode.toString rồi xóa script, event handlers và javascript: trước khi cache. Cả hai dùng width size, margin 4, ECC M và màu #1A1612/#FFFFFF. Không gọi dịch vụ QR công cộng.

## 4. Đếm tải và trả response

Chỉ sau khi có ảnh hợp lệ từ render/cache, download=true mới tăng `qrDownloadCount` trong ReferralLink. Nếu Redis client có sẵn, service còn gọi incr `qr_dl_count:{link.id}` và expire 30 ngày; lỗi incr/expire và lỗi cập nhật DB được bỏ qua/log, không ngăn trả ảnh. Các thao tác này không nằm trong một transaction chung; tải QR không phải thao tác hoàn toàn không thay đổi trạng thái.

Kết quả service là object inline: buffer (Buffer|string), contentType, filename, shortCode, shortUrl. Controller trả ảnh trực tiếp qua Express Response với Content-Type, Content-Disposition attachment/inline, X-Content-Type-Options nosniff và Cache-Control private,max-age=86400. Tên file `SCANMS-QR-{shortCode}.{format}`.

## 5. Ý nghĩa QR động và quan hệ dữ liệu

QR chứa short URL ổn định trỏ tới hệ thống. Khi quét, RedirectHandlerPage/RedirectController chuyển xử lý về backend; via=qr được nhận diện thành accessMethod QR. Luồng trạng thái link, tracking và attribution chạy khi truy cập, không chạy lúc sinh hoặc tải ảnh. Không có bản ghi QR độc lập, không sinh lại shortCode và không tạo ReferralLink mới khi tải.

ReferralLink liên kết User (collaborator), Store, Product; Store có ownerId tới User. AuditLog liên kết User; referralLinkId trong details chỉ là dữ liệu JSON, không phải FK tới ReferralLink. qrCodeUrl được gán endpoint nội bộ từ lúc tạo link FR-10, không phải đường dẫn file ảnh đã upload.

## 6. Nguồn mã

- `frontend/src/pages/collaborator/ReferralLinksPage.tsx`: useQrDataUrl, createdQrTargetUrl, selectedQrTargetUrl, handleDownloadQr, handleDownloadSuccessQr và các nút QR.
- `frontend/src/services/referral-links.service.ts`: downloadQrCode, getQrDownloadUrl, ReferralLinkItem.
- `backend/src/modules/referral-links/referral-links.controller.ts`: CollaboratorReferralLinksController.getQrCode.
- `backend/src/modules/referral-links/referral-links.service.ts`: generateQrCode, getPublicAppUrl, createReferralLink, handleRedirect.
- `backend/src/core/cache/cache.service.ts`: get, set, checkRateLimit, getRedis.
- `backend/src/modules/referral-links/redirect.controller.ts`: nhận via=qr và truyền accessMethod QR.
- `backend/prisma/schema.prisma`: ReferralLink, Store, Product, User, AuditLog.

Tái tạo sơ đồ: `node docs/diagrams/build-fr11-diagrams.cjs`.
