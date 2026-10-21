# FR-06 — Cấu hình cửa hàng theo code hiện tại

Đối chiếu workspace ngày 18/10/2026. Tác vụ chỉ tạo tài liệu và sơ đồ, không thay đổi nghiệp vụ hay đọc giá trị bí mật trong `.env`.

## File kết quả

1. [Class diagram](diagrams/FR06_Store_Settings_Class_Diagram.drawio)
2. [Sequence diagram](diagrams/FR06_Store_Settings_Sequence_Diagram.drawio)

Mỗi file một trang, trắng đen; class được tạo trước sequence. Sequence sử dụng actor, lifeline, activation và mũi tên, không dùng khung ref/alt/opt ngang. Các bước có điều kiện được ghi ngay trên thông điệp.

## Kết luận về ba nội dung FR-06

| Nội dung yêu cầu | Thực tế web/backend |
| --- | --- |
| Hạn mức rút tối thiểu do Shop cấu hình | Chưa có editor trên trang Shop Settings hoặc trường trong UpdateStoreDto. Payout KOL dùng WithdrawalPolicyService đọc MIN_PAYOUT_AMOUNT toàn hệ thống, fallback 200.000,00 đ. |
| Thời hạn cookie 30 ngày | Là giá trị mặc định. Web cho chọn 7, 14, 30, 60 ngày. Backend kiểm tra khoảng 1–365; lưu vào Store.attributionWindowDays. |
| % hoa hồng mặc định | UI khóa 10%; DTO nếu gửi chỉ chấp nhận 10; service luôn ghi defaultCommissionRate = 10 trong mỗi lần cập nhật. Không phải ô cho Shop tự chọn phần trăm. |

Schema **có** `Store.minPayoutAmount Decimal(15,2) @default(200000.00)`, nhưng không có đường cập nhật nó qua form/DTO/service settings đang xét. Không tìm thấy consumer `minPayoutAmount` trong backend/src hoặc frontend/src. Không mô tả một chức năng chỉnh hạn mức theo Shop chưa được nối vào ứng dụng.

## Code nguồn

- `frontend/src/pages/merchant/ShopSettingsPage.tsx`: form, tải dữ liệu, lưu cấu hình, lưu riêng thông tin chủ Shop, upload logo, thông báo.
- `frontend/src/services/store.service.ts`: StoreSettings, getMyStore(), updateMyStore().
- `frontend/src/services/api.ts`, `frontend/src/utils/api-cache.utils.ts`: JWT, cache GET, bỏ qua cache khi yêu cầu, invalidation sau PUT.
- `frontend/src/routes/AppRoutes.tsx`: `/merchant/settings`.
- `backend/src/modules/stores/stores.controller.ts`: route và quyền GET/PUT.
- `backend/src/modules/stores/stores.service.ts`: tìm Shop theo ownerId, tự tạo khi GET chưa có, cập nhật cấu hình.
- `backend/src/modules/stores/dto/update-store.dto.ts`: schema validation.
- `backend/src/main.ts`, `backend/src/common/interceptors/transform.interceptor.ts`: ValidationPipe và response envelope.
- `backend/prisma/schema.prisma`: Store và quan hệ owner User.
- `backend/src/modules/referral-links/referral-links.service.ts`, `redirect.controller.ts`: consumer thời hạn ghi nhận đơn/cookie.
- `backend/src/modules/wallets/withdrawal-policy.service.ts`, `wallet-summary.service.ts`, `backend/src/modules/payouts/payouts.service.ts`: hạn mức rút thực tế.
- `backend/src/modules/commissions/commission-calculator.service.ts`: hoa hồng nền cho phép tính mới.

## Class diagram

Nhóm web gồm `ShopSettingsPage`, object `storeService`, interface `StoreSettings`. Nhóm cập nhật gồm `StoresController`, `UpdateStoreDto`, `StoresService`, `PrismaService`. Mô hình domain có `User` và `Store`: một User có thể sở hữu nhiều Store theo schema, mỗi Store có một owner; service hiện lấy `findFirst`, không nhận Store ID tùy ý từ form.

Nhóm consumer gồm `ReferralLinksService` và `RedirectController` cho thời hạn attribution, `WithdrawalPolicyService`, `ConfigService`, `WalletSummaryService`, `PayoutsService` cho hạn mức rút. Các nhóm này có thể đọc cấu hình ở thời điểm khác; chúng không phải các bước tự động được gọi trong thao tác lưu Shop Settings. Chỉ liệt kê những phương thức/thuộc tính cần cho FR-06, không toàn bộ module.

## Luồng tải cấu hình

`ShopSettingsPage` kiểm tra role hiện tại. Chỉ `SHOP_MANAGER` chạy loadStore(); role khác thấy màn hình chỉ dành cho chủ gian hàng. Admin được dẫn về quản trị; vai trò còn lại về tổng quan KOL.

`storeService.getMyStore(fresh=false)` gọi `GET /api/stores/my-store`. Shared Axios gắn Bearer token. Cache client có thể trả GET ngay; sequence minh họa cache miss. Tham số `fresh=true` gửi `x-skip-cache`, nhưng loadStore() hiện không truyền true.

Controller cho GET với JWT và role `SHOP_MANAGER` hoặc `SYSTEM_ADMIN`. Service tìm Store bằng `{ ownerId, isDeleted:false }`, include owner contact và `_count` products/orders/campaigns. Products count loại isDeleted, orders/campaigns không có bộ lọc riêng trong truy vấn này.

**Nếu chưa có Store**, GET đọc User để tạo tên, tạo slug bằng tên lowercase thay ký tự ngoài a-z0-9 rồi thêm bốn ký tự cuối của Date.now(), và `store.create` với rate 10, window 30. Các field khác dùng default schema. Vì vậy GET này có thể tạo dữ liệu; không vẽ nó như thao tác chỉ đọc trong mọi trường hợp. Không có vòng retry slug hoặc transaction chống tạo trùng trong hàm này.

Trang đưa dữ liệu lên form, dùng fallback cho logo/liên hệ/địa chỉ nếu thiếu. Lỗi tải hiện chỉ console.error; không có toast lỗi tải riêng trong loadStore().

## Luồng lưu cấu hình chính

1. Người dùng đổi thông tin Shop hoặc cửa sổ attribution rồi nhấn Save.
2. `handleSave()` chặn submit mặc định, tính địa chỉ kho hoàn từ sameReturnAddress. Nếu đang sửa owner draft, kiểm tra trường bắt buộc, định dạng điện thoại/email, địa chỉ kho có ít nhất bốn thành phần phân tách bằng dấu phẩy. Logo phải có giá trị.
3. Đặt saving=true; gửi `storeService.updateMyStore()` gồm tên, mô tả, URL logo đã trim, websiteUrl **chuỗi rỗng**, ba policy, rate **10**, window dạng Number; kèm thông tin chủ Shop/kho khi có địa chỉ kho.
4. `PUT /api/stores/my-store` yêu cầu JWT và role **SHOP_MANAGER**. Admin không có quyền PUT qua route này. ownerId lấy từ CurrentUser, không tin ownerId gửi trong body.
5. ValidationPipe toàn cục dùng whitelist=true, transform=true, forbidNonWhitelisted=true. Trường lạ, chẳng hạn minPayoutAmount, không được âm thầm cập nhật.
6. Service tìm Store theo ownerId/isDeleted=false. Không có thì NotFoundException; PUT không tự tạo Store. Nếu gửi logo trắng thì BadRequestException; địa chỉ kho gửi lên phải đủ bốn phần.
7. Trim các field gửi lên, policy trống trở thành null; merge thông tin chủ Shop/tài khoản chi trả vào onboardingData JSON cũ. Nếu gửi kho nhận hoàn hoặc kho xuất thì cập nhật returnWarehouse JSON. name chỉ cập nhật khi dto.name truthy; các field optional khác theo kiểm tra undefined.
8. Thực hiện một `store.update({ where:{id:store.id}, data })`; **luôn ghi defaultCommissionRate=10**, chỉ ghi attributionWindowDays khi được gửi. Không có log audit hoặc transaction nhiều bước trong updateMyStore().
9. Trả `{ message, store: updated }`, bọc bởi TransformInterceptor thành `{ success, statusCode, data }`. Shared Axios trả body; storeService lấy `res?.data || res`. PUT thành công làm invalidate cache client thuộc `/stores`.
10. Trang không refetch Store hoặc áp dụng store trả về cho mọi state. Nếu đang sửa owner draft thì commit draft và thoát chế độ sửa; hiển thị toast lưu thành công. Lỗi hiển thị toast, finally đặt saving=false. Toast tự tắt sau ba giây.

`handleSaveOwnerDetails()` là nút lưu riêng thông tin chủ Shop, dùng cùng PUT với payload thông tin chủ Shop/kho; vì service luôn đặt rate 10, cả lần lưu riêng này cũng có hiệu ứng đó. Upload logo dùng uploadService để lấy URL trước khi lưu cấu hình; media upload không nằm trong sequence chính.

## Validation và giới hạn

- `defaultCommissionRate`: optional IsNumber + Min(10) + Max(10).
- `attributionWindowDays`: optional IsNumber + Min(1) + Max(365). Thông báo nói số nguyên nhưng **không có IsInt**; schema Store là Int. Không khẳng định DTO đã chặn số thập phân; đây là điểm cần chú ý của implementation hiện tại.
- policyReturn/Warranty/Shipping: optional string tối đa 500 ký tự.
- businessType thuộc INDIVIDUAL, HOUSEHOLD, ENTERPRISE; contactEmail qua IsEmail; phone qua regex; các trường pháp lý/kho có giới hạn độ dài riêng.
- Logo là string, service chặn rỗng khi field được gửi; DTO không kiểm tra đó là URL hợp lệ.
- Cấu hình ngân hàng chi trả cho KOL có trong DTO/service, nhưng không đồng nghĩa với cấu hình hạn mức rút tối thiểu.

## Thời điểm cấu hình có hiệu lực

`ReferralLinksService.handleRedirect()` đọc Store.attributionWindowDays cùng ReferralLink, chấp nhận 1–365, ngoài khoảng hoặc thiếu thì fallback 30. Nó tính expiresAt từ thời điểm click và upsert AttributionSession theo Store + visitor khi click đủ điều kiện. `RedirectController` dùng số ngày trả về để đặt maxAge cho scanms_attr, scanms_attribution, scanms_vid nếu có session hợp lệ và không opt-out; cookie attribution chứa visitor ID được ký, không chứa trực tiếp thông tin Shop/KOL.

ReferralLink kèm Store được cache dưới `ref_link:{normalizedCode}` trong **300 giây**. StoresService không invalidate cache backend này khi lưu. Vì vậy một link đang cache có thể tiếp tục dùng cửa sổ cũ tới khi cache hết hạn; không khẳng định cấu hình mới lập tức áp dụng cho mọi click.

Việc lưu cấu hình không sửa lại expiresAt của các session đã có hoặc cookie trong trình duyệt. Click hợp lệ sau đó có thể refresh session theo cấu hình được đọc tại thời điểm ấy.

## Hạn mức rút và hoa hồng

`WithdrawalPolicyService` đọc `MIN_PAYOUT_AMOUNT` qua ConfigService khi khởi tạo, fallback `'200000.00'`; kiểm tra định dạng tiền tối đa hai chữ số thập phân và phải lớn hơn 0, lưu Prisma.Decimal. Không xác minh giá trị môi trường đang chạy trong tác vụ tài liệu này.

`WalletSummaryService.getMyWallet()` trả `minimumWithdrawalAmount` từ policy; `PayoutsService.createWithdrawal()` từ chối tiền rút thấp hơn policy, trước luồng transaction nghiệp vụ. Các điều kiện KYC, ngân hàng, số dư và Store còn hoạt động thuộc luồng rút tiền, không phải thao tác lưu settings.

Hoa hồng nền UI cố định 10%, DTO chặn tỷ lệ khác 10 và StoresService cưỡng chế ghi 10. `CommissionCalculatorService.calculateOrderCommission()` dùng nền 10 cho phép tính mới, có thưởng tier và giới hạn, đồng thời giữ snapshot đơn cũ đã có. Không vẽ việc sửa Shop Settings sẽ tính lại hoa hồng đơn đã chốt.

## Mở Draw.io

Mở/import toàn bộ `.drawio`. Nếu dùng Extras → Edit Diagram, dán toàn bộ [FR06_Class_Paste.xml](diagrams/FR06_Class_Paste.xml) hoặc [FR06_Sequence_Paste.xml](diagrams/FR06_Sequence_Paste.xml); mỗi file bắt đầu bằng mxGraphModel. Không copy một đoạn XML đang chọn dở trong IDE.

PNG đi kèm là preview từ renderer nội bộ, không phải bản export native của diagrams.net. File Draw.io là bản chỉnh sửa được.
