# FR-10 - Create Short Affiliate Link

Phạm vi đối chiếu: mã nguồn hiện tại ngày 2026-10-16. Hai sơ đồ dùng tiếng Anh, trắng đen; class diagram thể hiện các thành phần và model liên quan, sequence diagram thể hiện luồng tạo link của giao diện KOL.

Đã đối chiếu lại và cập nhật bộ file `FR10_Create_Short_Affiliate_Link_Class_Diagram.drawio` / `FR10_Create_Short_Affiliate_Link_Sequence_Diagram.drawio` theo kiểu các FR gần đây: sequence một trang, không có khung ngang ref/break/loop; nhãn chữ nền trong suốt. Class được tạo trước sequence. PNG cùng tên là preview từ geometry, không phải export trực tiếp diagrams.net.

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

## 4. Quan hệ trong class diagram

ReferralLink liên kết đến User (collaborator), Store, Product; Campaign tùy chọn; ExclusiveDealProposal tùy chọn và unique. User có CollaboratorProfile tùy chọn. CampaignParticipant nối User-Campaign, CampaignProduct nối Campaign-Product. AuditLog liên kết User; referralLinkId chỉ nằm trong JSON details, không phải FK giữa AuditLog và ReferralLink.

Sơ đồ phân biệt React function, service object, DTO, NestJS class, imported functions và Prisma model. Không có lớp Repository riêng trong luồng này. Các trường/method không liên quan trực tiếp đến tạo link được lược trong sơ đồ; đây không phải toàn bộ class/module quản lý tracking.

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

Sequence renderer nằm trong `diagrams/fr10-single-page-sequence.cjs`, được generator chính gọi sau khi lưu class. Đã đọc test hiện có `backend/src/modules/referral-links/tests/referral-links.service.spec.ts` cho eligibility, Open Offer, campaign, quota và P2002 retry. Thay đổi chỉ liên quan sơ đồ/tài liệu: không chạy request tạo link thật, không đổi nghiệp vụ hay .env. Đã parse XML, kiểm tra mỗi file có một diagram/ID không trùng và xem ảnh render.
