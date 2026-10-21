# FR-04 — Quản lý đa kênh mạng xã hội

Đối chiếu mã nguồn SCANMS ngày 2026-10-20. Hai hình dùng chung renderer và quy cách FR9/FR01–FR03: Arial, trắng đen, class ba ngăn, Controller → Service → PrismaService ở giữa, lớp hỗ trợ trái, model phải, PrismaClient dưới trái. Sequence có actor, Browser, lifeline đứt, thanh thực thi và nhãn trong suốt; giữ kiểu trình bày đã đối chiếu với hình Word.

## File sử dụng

- [Class — XML review](<review 2/FR04 - Class Diagram>) · [Drawio](diagrams/FR04_Multi_Social_Channel_Management_Class_Diagram.drawio) · [PNG](diagrams/FR04_Multi_Social_Channel_Management_Class_Diagram.png)
- [Sequence — XML review](<review 2/FR04 - Sequence Diagram>) · [Drawio](diagrams/FR04_Multi_Social_Channel_Management_Sequence_Diagram.drawio) · [PNG](diagrams/FR04_Multi_Social_Channel_Management_Sequence_Diagram.png)
- Bản chỉ có `mxGraphModel`: [Class paste](diagrams/FR04_Class_Paste.xml), [Sequence paste](diagrams/FR04_Sequence_Paste.xml).
- [Đặc tả](diagrams/fr04-report-spec.json), [script tạo hình](diagrams/build-fr04-diagrams.cjs), [validator](diagrams/validate-fr04-diagrams.ps1).
- PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net.

## Chức năng hiện có

**Đã có thêm nhiều kênh TikTok, Facebook, YouTube, Threads và lưu followers.** Màn hình `SocialChannelsPage` nằm trong `/collaborator/profile?tab=social`, đồng thời được dùng ở tab social của WalletPage. Route cũ `/collaborator/social-channels` chuyển sang trang hồ sơ. Form gồm nền tảng, tên, URL, số followers và checkbox kênh chính.

Không có kiểm tra số lượng tối đa, quota theo nền tảng hoặc ràng buộc unique URL/platform trong DTO/service/schema của chức năng này. Một User có thể lưu nhiều kênh cùng nền tảng, kể cả các dòng trùng URL. “Không giới hạn” ở đây là **không đặt trần số kênh trong logic nghiệp vụ**, không phải cam kết tài nguyên vô hạn. API danh sách trả tất cả kênh của User, không có phân trang.

| Phạm vi | Nền tảng |
| --- | --- |
| Dropdown thêm kênh hiện tại | TIKTOK, FACEBOOK, YOUTUBE, INSTAGRAM, THREADS, ZALO |
| Enum backend `SocialPlatform` | Các giá trị trên và TELEGRAM, SHOPEE_VIDEO, LEMON8, OTHER |

Followers do người dùng nhập; không có OAuth, truy vấn API nền tảng, đồng bộ followers tự động hoặc xác minh chủ tài khoản MXH trong module. Không vẽ các dịch vụ TikTok/Facebook/YouTube/Threads thành lifeline gọi mạng khi source không có các lời gọi đó.

## API và kiểm tra dữ liệu

| API (prefix `/api`) | Controller → Service | Hành vi |
| --- | --- | --- |
| `GET /social-channels` | `getMyChannels(userId)` → `getMyChannels(collaboratorId)` | Chỉ lấy kênh của User từ JWT; primary trước, sau đó thời điểm tạo mới nhất |
| `POST /social-channels` | `addChannel(userId, dto)` → `addChannel(collaboratorId, dto)` | Thêm kênh, tùy chọn primary, tính lại tổng followers; trả 201 |
| `DELETE /social-channels/:id` | `deleteChannel(userId, channelId)` | Kiểm tra tồn tại và chủ sở hữu; xóa vĩnh viễn, tính lại tổng; trả 200 |
| `PATCH /social-channels/:id/primary` | `setPrimary(userId, channelId)` | Kiểm tra tồn tại/chủ sở hữu; bỏ primary cũ rồi đặt kênh được chọn; trả 200 |

Controller chỉ gắn **JwtAuthGuard**, không gắn RolesGuard hoặc yêu cầu KYC đã duyệt. Dù UI hướng tới KOL, không diễn giải thành backend đã hạn chế chỉ COLLABORATOR. User đang hoạt động được xác thực bởi JWT strategy; `collaboratorId` lấy từ User đó, không cho chọn chủ kênh trong payload. Xóa/đặt primary kênh không tồn tại trả 404; kênh của User khác trả 403.

`CreateChannelDto` kiểm tra platform thuộc enum, URL là chuỗi không rỗng, followers nếu có là số nguyên >= 0, primary nếu có là boolean. Followers mặc định 0, primary mặc định false, tên kênh optional. Global ValidationPipe bật whitelist/transform/forbidNonWhitelisted. Không có `@IsUrl`, kiểm tra domain khớp nền tảng hoặc trim trước validation trên DTO. Form dùng input URL và yêu cầu tên/followers; không suy rộng các kiểm tra HTML này thành validation server. Service trim tên/URL, tên trống thành null.

Không có API sửa tên/URL/followers tổng quát trong module. Không đưa `updateChannel()` giả vào class. API đặt primary riêng có trong backend/adapter, còn thao tác chọn primary trong form thêm kênh là nhánh sequence đang mở rộng.

## Dữ liệu và quan hệ

Class có **10 lớp/model/enum**: SocialChannelsController, SocialChannelsService, PrismaService, PrismaClient, JwtAuthGuard, CreateChannelDto, User, CollaboratorSocialChannel, CollaboratorProfile, SocialPlatform. Chỉ vẽ thành viên liên quan.

- `CollaboratorSocialChannel.collaboratorId` là khóa ngoại tới **User.id**, không phải Profile.id. User có `0..*` kênh; mỗi kênh thuộc đúng một User.
- User có tối đa một CollaboratorProfile qua `userId` unique: `1` — `0..1`.
- `SocialPlatform` là enum, không phải bảng hoặc Prisma delegate riêng.
- `CollaboratorProfile.totalFollowers` là tổng lưu trên profile; không có khóa ngoại trực tiếp từ Profile tới kênh.
- Schema kênh có index owner, không có unique(owner, platform) hay unique(owner, URL). Dữ liệu trùng có thể được cộng followers nhiều lần.

`recalculateTotalFollowers(collaboratorId)` gọi aggregate `_sum.followerCount` trên toàn bộ kênh của User rồi `collaboratorProfile.updateMany({ where: { userId }, data: { totalFollowers: sum || 0 } })`. Không có profile thì count = 0, không tự tạo profile và không chặn việc thêm kênh. Tổng được cập nhật khi thêm/xóa **qua SocialChannelsService**; không khẳng định mọi đường ghi kênh khác trong hệ thống đều gọi helper này. Luồng KYC cũng có thao tác kênh riêng.

## Sequence đang mở rộng

Hình có **5 participant, 24 thông điệp**, mô tả thêm một kênh nữa với `isPrimary=true` rồi tải lại danh sách:

1. KOL nhập nền tảng, tên, URL, followers và chọn kênh chính. Browser kiểm tra form, chuyển followers thành Number rồi gửi POST.
2. Sau guard/DTO validation, controller gọi service bằng User ID từ JWT.
3. Service bỏ primary cũ của chính User, tạo kênh mới, tính SUM và cập nhật profile. Các lời gọi Prisma trên hình dùng nhãn rút gọn để dễ đọc, không phải đoạn code đầy đủ để copy chạy.
4. Service trả `{ message, channel }` sau khi tổng followers cập nhật xong; controller trả 201 trong response envelope.
5. Browser hiện thành công, đóng/reset form và gọi `loadChannels(true)`. GET có header `x-skip-cache: true` để bỏ qua cache frontend; header này được interceptor Axios xử lý trước khi gửi mạng.
6. Service lấy danh sách owner, sort primary/newest. Browser thay danh sách, cộng tổng cho phần hiển thị và áp dụng search/filter theo nền tảng ở client.

Nếu không chọn primary thì bỏ qua bước reset primary; kênh đầu tiên không mặc định được lưu là primary. UI dùng `find(isPrimary) || channels[0]` cho thẻ đại diện, đây là fallback hiển thị. Xóa kênh primary không chọn tự động một kênh thay thế. `setPrimary()` cũng không tính lại followers vì không thay số liệu.

Module dùng các ghi tuần tự, **không có `$transaction`** quanh bỏ primary, tạo/xóa kênh và cập nhật tổng. Không vẽ BEGIN/COMMIT/ROLLBACK hoặc khẳng định luôn có duy nhất một primary khi nhiều request đồng thời. Nếu create/aggregate/profile update lỗi thì các ghi trước đó có thể đã lưu. Xóa là `delete()`, không phải soft delete hay thao tác thu hồi OAuth token. Không có AuditLog hoặc Notification trong những method này.

## Nguồn đối chiếu

| Nội dung | Mã nguồn |
| --- | --- |
| API và guard | [social-channels.controller.ts](../backend/src/modules/social-channels/social-channels.controller.ts) |
| Thêm/xóa/primary và SUM followers | [social-channels.service.ts](../backend/src/modules/social-channels/social-channels.service.ts) |
| Payload và validation | [create-channel.dto.ts](../backend/src/modules/social-channels/dto/create-channel.dto.ts) |
| Schema, enum và cardinality | [schema.prisma](../backend/prisma/schema.prisma) |
| Giao diện thêm kênh, filter và tổng followers | [SocialChannelsPage.tsx](../frontend/src/pages/collaborator/SocialChannelsPage.tsx) |
| Tab hồ sơ và tái sử dụng | [CreatorProfilePage.tsx](../frontend/src/pages/collaborator/CreatorProfilePage.tsx), [WalletPage.tsx](../frontend/src/pages/collaborator/WalletPage.tsx) |
| Route chuyển hướng | [AppRoutes.tsx](../frontend/src/routes/AppRoutes.tsx) |
| Adapter và cache request | [social.service.ts](../frontend/src/services/social.service.ts), [api.ts](../frontend/src/services/api.ts) |
| Yêu cầu FR04 | [4_PERSON_TEAM_EXECUTION_GUIDE.md](4_PERSON_TEAM_EXECUTION_GUIDE.md) |

## Tạo lại và kiểm tra

```powershell
node docs/diagrams/build-fr04-diagrams.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Class -FeatureStem FR04_Multi_Social_Channel_Management
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/render-fr09-uml.ps1 -Kind Sequence -FeatureStem FR04_Multi_Social_Channel_Management
powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/validate-fr04-diagrams.ps1
```

Đã kiểm tra **23 điều kiện** bằng DTO, service và metadata controller thật với Prisma giả lập trong bộ nhớ: bốn nền tảng yêu cầu; từ chối followers âm/thập phân/chuỗi và platform sai; thêm 60 dòng cùng nền tảng/URL không bị quota; SUM chỉ của đúng owner; reset primary không ảnh hưởng owner khác; sort/trim; 403/404 của delete/primary; tổng sau xóa; không tự chọn primary thay thế; đặt primary; thêm khi chưa có profile; controller chỉ dùng JWT. Đây là kiểm tra trực tiếp bằng script tạm, không phải suite test sẵn có hay HTTP/database integration test.

Đã render và xem hai PNG, kiểm tra tràn chữ, XML/review/paste khớp nhau, đường nối và nhãn không bị lifeline cắt. Không sửa logic ứng dụng, gọi API MXH hay kết nối database. Các sơ đồ trước được giữ nguyên.
