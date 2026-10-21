# FR-11 - Tạo mã QR Code động

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. **Bản báo cáo rút gọn hiện tại: 8 lớp/model, 23 thông điệp sequence.** Hai hình dùng đen trắng, class ba ngăn và `+`/`-`, connector có source/target thật và bội số đúng schema; sequence có actor, lifeline, activation và mũi tên, không có khung bao/chia nhánh. Điều kiện ghi trên nhãn. Phong cách theo FR9 và mẫu Word đã tham khảo.

Preview QR tại trình duyệt; tải PNG/SVG qua controller/service thật, kiểm tra quyền, rate limit, cache/render và bộ đếm. Audit hỗ trợ Shop/Admin và Redis counter được mô tả riêng.

Các lớp/model được vẽ: `CollaboratorReferralLinksController`, `ReferralLinksService`, `CacheService`, `PrismaService`, `Store`, `User`, `ReferralLink`, `PrismaClient`. Chỉ chọn thành viên liên quan; model không có phương thức tự khai báo giữ ngăn operation trống. Không dựng Repository/UnitOfWork hoặc service giả. PrismaService kế thừa PrismaClient trong mã và được vẽ bằng tam giác rỗng hướng tới hộp PrismaClient ở phía dưới bên trái, giống FR9.

Hai XML không có đuôi mở rộng: `docs/review 2/FR11 - Class Diagram` và `docs/review 2/FR11 - Sequence Diagram`. Bản `.drawio`, `.scene.json`, PNG có tiền tố `FR11_Generate_Dynamic_QR_Code` trong `docs/diagrams`; XML để dán là `FR11_Class_Paste.xml` và `FR11_Sequence_Paste.xml`. PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Bản chi tiết cũ, gồm tài liệu mô tả hình cũ, được lưu tại `docs/diagrams/archive/FR11_detailed`.

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

Khóa cache `qr_render:{link.id}:{format}:{size}`, TTL 86400 giây. CacheService dùng Redis khi hoạt động và bộ nhớ trong tiến trình khi fallback. Cache hit PNG giải mã base64 sang Buffer, SVG dùng string. Cache miss PNG gọi imported function `renderQrPng(shortUrl, size)` từ `utils/qr-png.renderer.ts`; hàm dùng `QRCode.create` rồi raster hóa qua `pngjs` và `PNG.sync.write`, không dùng `QRCode.toBuffer`. SVG gọi `QRCode.toString` rồi xóa script, event handlers và javascript: trước khi cache. Cả hai dùng size yêu cầu, margin 4, ECC M và màu #1A1612/#FFFFFF. Không gọi dịch vụ QR công cộng.

## 4. Đếm tải và trả response

Chỉ sau khi có ảnh hợp lệ từ render/cache, download=true mới tăng `qrDownloadCount` trong ReferralLink. Nếu Redis client có sẵn, service còn gọi incr `qr_dl_count:{link.id}` và expire 30 ngày; lỗi incr/expire và lỗi cập nhật DB được bỏ qua/log, không ngăn trả ảnh. Các thao tác này không nằm trong một transaction chung; tải QR không phải thao tác hoàn toàn không thay đổi trạng thái.

`CacheService.getRedis()` trả redisClient trực tiếp, không kiểm tra ready giống getRedisClient; nhánh counter tự bắt lỗi. Bộ đếm UI tăng sau khi lời gọi downloadQrCode thành công, không chứng minh file đã được lưu trên đĩa hoặc ảnh đã được quét. Quét QR mới là click QR của FR-13; tải ảnh QR không được tính thành một lượt click tiếp thị trong đường này.

Kết quả service là object inline: buffer (Buffer|string), contentType, filename, shortCode, shortUrl. Controller trả ảnh trực tiếp qua Express Response với Content-Type, Content-Disposition attachment/inline, X-Content-Type-Options nosniff và Cache-Control private,max-age=86400. Tên file `SCANMS-QR-{shortCode}.{format}`.

## 5. Ý nghĩa QR động và quan hệ dữ liệu

QR chứa short URL ổn định trỏ tới hệ thống. Khi quét, RedirectHandlerPage/RedirectController chuyển xử lý về backend; via=qr được nhận diện thành accessMethod QR. Luồng trạng thái link, tracking và attribution chạy khi truy cập, không chạy lúc sinh hoặc tải ảnh. Không có bản ghi QR độc lập, không sinh lại shortCode và không tạo ReferralLink mới khi tải.

ReferralLink liên kết User (collaborator), Store, Product; Store có ownerId tới User. AuditLog liên kết User; referralLinkId trong details chỉ là dữ liệu JSON, không phải FK tới ReferralLink. qrCodeUrl được gán endpoint nội bộ từ lúc tạo link FR-10, không phải đường dẫn file ảnh đã upload.

## 6. Nguồn mã

- `frontend/src/pages/collaborator/ReferralLinksPage.tsx`: useQrDataUrl, createdQrTargetUrl, selectedQrTargetUrl, handleDownloadQr, handleDownloadSuccessQr và các nút QR.
- `frontend/src/services/referral-links.service.ts`: downloadQrCode, getQrDownloadUrl, ReferralLinkItem.
- `backend/src/modules/referral-links/referral-links.controller.ts`: CollaboratorReferralLinksController.getQrCode.
- `backend/src/modules/referral-links/referral-links.service.ts`: generateQrCode, getPublicAppUrl, createReferralLink, handleRedirect.
- `backend/src/modules/referral-links/utils/qr-png.renderer.ts`: renderQrPng, QRCode.create và PNG.sync.write.
- `backend/src/core/cache/cache.service.ts`: get, set, checkRateLimit, getRedis.
- `backend/src/modules/referral-links/redirect.controller.ts`: nhận via=qr và truyền accessMethod QR.
- `backend/prisma/schema.prisma`: ReferralLink, Store, Product, User, AuditLog.

Tái tạo sơ đồ: `node docs/diagrams/build-fr11-diagrams.cjs`.

Entry point gọi `build-report-diagrams.cjs` với đặc tả `fr11-report-spec.json`, dùng helper UML của FR9. Render preview bằng `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR11_Generate_Dynamic_QR_Code` (thay Class bằng Sequence cho hình còn lại).

Đã chạy test hiện có `backend/src/modules/referral-links/tests/referral-links-qr.spec.ts`: **15/15 passed** ngày 2026-10-19, gồm decode payload, PNG/SVG, ownership, cache, rate limit và bộ đếm. Test nghiệp vụ không chứng minh độ chính xác/đầy đủ của sơ đồ. Đã parse XML, kiểm tra một diagram mỗi file, ID/terminal hợp lệ, ba ngăn class, sequence không có khung điều kiện, bản review trùng nội dung và xem PNG render. PNG là preview từ geometry, không phải export trực tiếp diagrams.net. Không đổi code nghiệp vụ hay .env, không tạo link hay tải qua tài khoản web thật.

## Kiểm tra bản báo cáo rút gọn

Tái tạo: `node docs/diagrams/build-fr11-diagrams.cjs` hoặc `node docs/diagrams/build-report-diagrams.cjs 11`. Đặc tả nằm trong `fr11-report-spec.json`; bộ bố cục dùng `report-uml-layout.cjs` và helper UML của FR9.

Kiểm tra 8 cặp ngăn class, 23 thông điệp, một trang mỗi file, ID/tham chiếu, giới hạn canvas, đường nối không xuyên lớp hoặc chồng đoạn thẳng cùng hướng; render/xem hai PNG và kiểm tra tràn chữ. Review và XML paste phải khớp bản gốc. Chỉ thay sơ đồ/tài liệu, không thay logic ứng dụng. Kết quả unit test bên trên thuộc lượt đối chiếu trước; không chạy lại test nghiệp vụ cho lần rút gọn này.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR11_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR11_before_word_class_alignment`, `FR11_before_fr09_sequence_layout` và `FR11_compact_before_fr09_layout`.
