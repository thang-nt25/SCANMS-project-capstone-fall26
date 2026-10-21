# FR-10 - Create Short Affiliate Link

Cập nhật theo lựa chọn của người dùng ngày 2026-10-20: **giữ nguyên toàn bộ lớp, thành viên và quan hệ; chỉ đổi cách dàn hình và tỷ lệ hiển thị**. Class FR10–FR16 cùng khổ 2800 × 2240, font Arial 20/18 và trục Controller → Service → PrismaService tại x=850 như FR9. Các model liên quan được phân nhóm sang cột trái khi phù hợp, tránh dồn tất cả vào một cột bên phải. Hộp trục xử lý rộng 830, cột trái 560, model bên phải 620, PrismaClient 650. Không bổ sung guard hoặc lớp mới. Xem [bố cục và đối chiếu FR9](diagrams/FR09_WORD_CLASS_COMPARISON.md).

Sequence dùng chung generator `report-uml-layout.cjs`: actor bên trái, Browser kế tiếp rồi các đối tượng thực tế; hộp Browser rộng 250, các hộp đối tượng rộng 430, cùng cao 58; tiêu đề 28, tên đối tượng 20, thông điệp 18. Khoảng cách và thanh thực thi, lời gọi nội bộ, mũi tên gọi/trả về, số thứ tự và ba chú thích cuối hình được đồng bộ. Giữ nhịp 64 px của FR9, thêm 8 px sau lời gọi nội bộ để không che vòng trả về. Giữ nguyên thành phần, nội dung và thứ tự thông điệp của bản rút gọn; số cột tùy chức năng. Không thêm khung bao hoặc khung chia nhánh.


Đối chiếu mã nguồn ngày 2026-10-19. **Bản báo cáo rút gọn hiện tại: 9 lớp/model, 22 thông điệp sequence.** Hai hình dùng đen trắng, class ba ngăn và `+`/`-`, connector có source/target thật và bội số đúng schema; sequence có actor, lifeline, activation và mũi tên, không có khung bao/chia nhánh. Điều kiện ghi trên nhãn. Phong cách theo FR9 và mẫu Word đã tham khảo.

Chọn sản phẩm đủ điều kiện, kiểm tra KOL/KYC/quota, tạo ReferralLink và AuditLog trong transaction, trả short URL. Campaign/deal, DTO và chi tiết retry được giải thích trong văn bản.

Các lớp/model được vẽ: `CollaboratorReferralLinksController`, `ReferralLinksService`, `PrismaService`, `User`, `CollaboratorProfile`, `Store`, `ReferralLink`, `Product`, `PrismaClient`. Chỉ chọn thành viên liên quan; model không có phương thức tự khai báo giữ ngăn operation trống. Không dựng Repository/UnitOfWork hoặc service giả. PrismaService kế thừa PrismaClient trong mã và được vẽ bằng tam giác rỗng hướng tới hộp PrismaClient ở phía dưới bên trái, giống FR9.

Hai XML không có đuôi mở rộng: `docs/review 2/FR10 - Class Diagram` và `docs/review 2/FR10 - Sequence Diagram`. Bản `.drawio`, `.scene.json`, PNG có tiền tố `FR10_Create_Short_Affiliate_Link` trong `docs/diagrams`; XML để dán là `FR10_Class_Paste.xml` và `FR10_Sequence_Paste.xml`. PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Bản chi tiết cũ, gồm tài liệu mô tả hình cũ, được lưu tại `docs/diagrams/archive/FR10_detailed`.

## 1. Luồng trên web

`ReferralLinksPage` là React function component. Khi mở modal, trang tải song song sản phẩm hợp lệ và lời mời chiến dịch. Modal có hai bước: chọn sản phẩm, sau đó thiết lập link. Chọn sản phẩm có thể tự điền nhãn gợi nhớ.

Payload thực tế gồm `productId`, `label`, `channel`, và tùy chọn `campaignId`, `customCouponCode`, `expiresAt`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`. Giao diện kiểm tra sản phẩm, nhãn không rỗng, định dạng coupon nếu nhập và hạn mức sản phẩm. Khi chọn chiến dịch, UI không gửi expiry; backend lấy ngày kết thúc chiến dịch.

API client gọi `POST /api/collaborator/referral-links`. Controller lấy collaboratorId từ người dùng đã xác thực, không nhận KOL ID từ form. JwtAuthGuard, RolesGuard với vai trò COLLABORATOR và ValidationPipe chạy trước phương thức controller. Kết quả thành công là HTTP 201. Trang giữ modal ở màn hình thành công, hiển thị URL, cho sao chép và gọi `fetchLinks()` để cập nhật danh sách; không tự đóng modal ngay sau khi tạo.

## 2. Điều kiện phía backend

- Label và channel bắt buộc; KOL tồn tại, chưa bị xóa, đang hoạt động, đúng vai trò và có KYC VERIFIED.
- Product tồn tại, chưa xóa, active, đã được kiểm duyệt APPROVED và bật affiliate. Store phải còn hoạt động và chưa xóa.
- Open Offer không cần Shop duyệt quan hệ KOL-Store. Expiry nếu có phải ở tương lai.
- Campaign phải cùng Store, active, đã bắt đầu và chưa hết hạn. KOL phải có CampaignParticipant ACCEPTED. Nếu CampaignProduct có giới hạn sản phẩm, sản phẩm chọn phải nằm trong đó. Expiry không vượt ngày kết thúc campaign; mặc định là campaign.endDate.
- DTO backend còn nhận exclusiveDealId: deal phải APPROVED, thuộc đúng KOL/Store/Product, có approvedCommissionRate và chưa có link chưa xóa. Không được đồng thời truyền campaignId và exclusiveDealId. Form tạo link hiện tại không gửi exclusiveDealId; đây là khả năng backend, không phải bước của modal thông thường.
- Hạn mức: 10 link được tạo trong phút gần nhất; 500 link có status ACTIVE và deletedAt null/KOL; 20 link deletedAt null cho cùng sản phẩm/KOL. Các count này được đọc trước transaction, không phải quota lock nguyên tử.

## 3. Sinh và lưu link

`generateShortCode(8)` dùng crypto.randomBytes và bảng chữ thường a-z, số 0-9. Database có unique constraint cho shortCode. Service tạo UUID cho link, destinationPath `/products/{productId}`, qrCodeUrl nội bộ `/api/referral-links/{id}/qr`, sanitize nhãn/UTM, chuẩn hóa coupon thành chữ hoa và đặt status ACTIVE.

`prisma.$transaction` ghi ReferralLink và AuditLog với action `REFERRAL_LINK_CREATED` cùng nhau. Write/audit lỗi thì rollback. Vòng lặp thử tối đa 5 lần khi bắt Prisma error P2002; code bắt P2002 nói chung, không kiểm tra tên constraint. Hết 5 lần trả 409. Lỗi khác được ném ra ngoài.

URL trả về là `{publicAppUrl}/r/{shortCode}`, trong đó publicAppUrl lấy theo thứ tự PUBLIC_APP_URL, FRONTEND_URL, rồi http://localhost:5173 và bỏ dấu / cuối. Vì vậy `scanms.vn` trong yêu cầu là ví dụ tên miền triển khai; không phải chuỗi cố định trong service. shortUrl là trường tính khi trả response, không phải cột của ReferralLink.

## 4. Quan hệ dữ liệu liên quan

ReferralLink liên kết đến User (collaborator), Store, Product; Campaign tùy chọn; ExclusiveDealProposal tùy chọn và unique. User có CollaboratorProfile tùy chọn. CampaignParticipant nối User-Campaign, CampaignProduct nối Campaign-Product. AuditLog liên kết User; referralLinkId chỉ nằm trong JSON details, không phải FK giữa AuditLog và ReferralLink.

## 5. Chi tiết cần phân biệt với mô tả nghiệp vụ

- Bộ lọc danh sách sản phẩm sử dụng customCommissionRate hoặc defaultCommissionRate > 0, nhưng estimatedCommissionRate của danh sách hiện gán cứng 10; createReferralLink cũng gán commissionRate = 10 cho phần kiểm tra. Không thể suy ra create kiểm tra lại tỷ lệ cấu hình thực tế từ tên biến.
- Danh sách sản phẩm yêu cầu KYC VERIFIED; tài khoản không đạt điều kiện trả danh sách rỗng. Phân trang backend tối đa 100 sản phẩm/trang; UI tải thêm các trang và gộp theo ID. Campaign invitations tải qua API riêng `/campaigns/my-invitations` bằng Promise.allSettled, không phải method của CollaboratorReferralLinksController.
- Hạn mức 10/phút đếm các link được tạo trong phút vừa qua; 500 đếm status ACTIVE và chưa xóa; 20/sản phẩm đếm mọi link chưa xóa của KOL, không chỉ ACTIVE. Không vẽ Redis rate limiter FR-14 vào luồng này: hạn mức tạo link đang dùng count từ DB trước transaction.
- Quota trên frontend chỉ là gợi ý: được tính từ links hiện có trên trang và loại BLOCKED; backend không loại BLOCKED khi đếm 20 link/sản phẩm chưa xóa. Backend là nơi quyết định cuối cùng.
- Coupon trong create được chuẩn hóa rồi lưu chuỗi; luồng này không truy vấn Coupon để xác thực hiệu lực mã. Không có FK Coupon trong ReferralLink.
- Tạo link chỉ lưu đường dẫn endpoint QR; chưa sinh ảnh QR và chưa ghi click/attribution. Các thao tác mở link, tracking, QR, duyệt deal và thanh toán nằm ngoài interaction tạo link.
- Mã 8 ký tự lấy crypto.randomBytes rồi ánh xạ từng byte bằng modulo 36; sơ đồ mô tả đúng cách sinh này, không khẳng định phân phối đều tuyệt đối. Unique shortCode ở database và retry xử lý va chạm. P2002 được bắt nói chung, có thể xuất phát từ constraint khác, không chỉ shortCode.
- isSubmitting chặn gửi lặp trên form; backend không có idempotencyKey cho create link. Gửi lại một request hợp lệ có thể tạo thêm link mới nếu chưa vượt quota, vì mô hình cho phép nhiều link trên cùng sản phẩm.

## 6. Nguồn đối chiếu

- `frontend/src/pages/collaborator/ReferralLinksPage.tsx`: loadEligibleProductsAndCampaigns, handleOpenCreateModal, handleSelectProduct, handleSelectCampaign, handleCreateSubmit, handleCopyLink.
- `frontend/src/services/referral-links.service.ts`: EligibleProduct, ReferralLinkItem, CreateReferralLinkPayload, referralLinksService.getEligibleProducts/createLink/getMyLinks.
- `backend/src/modules/referral-links/referral-links.controller.ts`: CollaboratorReferralLinksController, getEligibleProducts, createLink.
- `backend/src/modules/referral-links/referral-links.service.ts`: getEligibleProducts, createReferralLink, getPublicAppUrl.
- `backend/src/modules/referral-links/dto/create-referral-link.dto.ts`.
- `backend/src/modules/referral-links/utils/short-code.generator.ts`: generateShortCode, sanitizeUtmString.
- `backend/prisma/schema.prisma`: ReferralLink, User, CollaboratorProfile, Store, Product, Campaign, CampaignParticipant, CampaignProduct, ExclusiveDealProposal, AuditLog.
- `backend/src/main.ts`: global prefix và ValidationPipe.

Tái tạo hai file draw.io: `node docs/diagrams/build-fr10-diagrams.cjs`.

Generator bản báo cáo dùng `fr10-report-spec.json` và `report-uml-layout.cjs`, entry point `build-fr10-diagrams.cjs` gọi qua `build-report-diagrams.cjs`; dùng cùng helper UML của FR9. Render PNG: `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR10_Create_Short_Affiliate_Link` (thay Class bằng Sequence cho hình còn lại).

Đã chạy test hiện có `backend/src/modules/referral-links/tests/referral-links.service.spec.ts`: 30/30 passed ngày 2026-10-19. Test gồm eligibility, Open Offer, campaign, quota và P2002 retry; kết quả test không thay thế việc kiểm tra hình UML. Thay đổi chỉ liên quan sơ đồ/tài liệu: không chạy request tạo link thật, không đổi nghiệp vụ hay .env. Đã parse XML, kiểm tra mỗi file một diagram/ID không trùng, connector class có terminal hợp lệ, kiểm tra bản review trùng nội dung và xem ảnh render.

## Kiểm tra bản báo cáo rút gọn

Tái tạo: `node docs/diagrams/build-fr10-diagrams.cjs` hoặc `node docs/diagrams/build-report-diagrams.cjs 10`. Đặc tả nằm trong `fr10-report-spec.json`; bộ bố cục dùng `report-uml-layout.cjs` và helper UML của FR9.

Kiểm tra 9 cặp ngăn class, 22 thông điệp, một trang mỗi file, ID/tham chiếu, giới hạn canvas, đường nối không xuyên lớp hoặc chồng đoạn thẳng cùng hướng; render/xem hai PNG và kiểm tra tràn chữ. Review và XML paste phải khớp bản gốc. Chỉ thay sơ đồ/tài liệu, không thay logic ứng dụng. Kết quả unit test bên trên thuộc lượt đối chiếu trước; không chạy lại test nghiệp vụ cho lần rút gọn này.

Kiểm tra bằng `docs/diagrams/validate-report-diagrams.ps1`: XML một trang, ID/tham chiếu, review/paste, khổ hình và vị trí các khối, bội số và kiểu mũi tên. So với mốc `docs/diagrams/archive/FR10_before_balanced_class_layout`, danh sách lớp/thành viên và toàn bộ mảng quan hệ khớp nguyên vẹn; sequence/drawio/scene/PNG/paste khớp hash. Đã render và xem PNG class, không tràn chữ; nhãn không che dây. Bản mốc trước còn được giữ trong các thư mục `FR10_before_word_class_alignment`, `FR10_before_fr09_sequence_layout` và `FR10_compact_before_fr09_layout`.
