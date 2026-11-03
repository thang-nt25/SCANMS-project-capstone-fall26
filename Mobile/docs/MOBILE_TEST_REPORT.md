# Cập nhật nghiệp vụ ngày 03/11/2026

Xem [phạm vi, kết quả mới và kịch bản test đủ 5 role](ROLE_WORKFLOWS_2026-11-03.md). Bản bổ sung có 46 test mobile và 71 test backend liên quan PASS, native debug APK build/cài thành công. Các kết quả bên dưới là lịch sử của bản nền tảng, không thay thế nghiệm thu các mutation mới.

---

# Báo cáo kiểm thử mobile — 02/11/2026

**Cập nhật 03/11/2026:** đã build/cài APK debug trên Emulator và kiểm tra startup native. Xem [báo cáo Android mới](ANDROID_STARTUP_2026-11-03.md) và [metadata](verification-2026-11-03.json). Các trạng thái BLOCKED SDK/CHƯA CÀI APK ở bảng ngày 02/11 bên dưới là kết quả lịch sử; bản demo độc lập Metro và các luồng nghiệp vụ native vẫn chưa nghiệm thu.

## Kết quả đã chạy

Môi trường: Windows, Node 22.14.0, JDK 21 có sẵn; Expo SDK 58/React Native 0.88.1. Source mobile chưa push. Không reset/seed/đổi mật khẩu/ghi nghiệp vụ vào DB nhóm trong đợt mobile này.

| Kiểm tra | Kết quả thực tế | Bằng chứng tái chạy |
| --- | --- | --- |
| Mobile strict TypeScript | PASS | `npm run typecheck` |
| Mobile lint | PASS, không warning | `npm run lint` |
| Mobile unit/contract tests | PASS 26/26 | `npm test`, 6 file trong `Mobile/tests/` |
| Bootstrap HTTP + hồi quy product | PASS 29 tests / 3 suites | Backend Jest: mobile.service.spec.ts, products.variants.spec.ts, products.moderation.spec.ts |
| Chat service/gateway/attachment regression | PASS 51 tests / 4 suites | Backend Jest: chat.service, chat-gateway-input, chat-explorer, chat-attachment.utils specs |
| Backend build | PASS | `cd backend; npm run build` |
| Đối chiếu dependency Expo | PASS, Dependencies are up to date | `npx expo install --check` |
| Expo Doctor | PASS 20/20 checks, No issues detected | `npx expo-doctor` |
| API read-only trên backend đang chạy | PASS 23/23 request/schema | Public products; bootstrap + auth/me đủ 5 role; conversations Customer/KOC/Shop; Shop products/deals/cooperation; KOC invitations/deals; moderation 2 role; Admin exceptions/users |
| Prebuild Android | PASS, sinh `Mobile/android` | `npm run android:prebuild` |
| Export Hermes Android bundle | PASS | `npm run bundle:android`; output `Mobile/dist`, không phải APK |
| APK demo | BLOCKED tại preflight | `npm run build:demo`: Android SDK not configured |
| Cài APK / Emulator / thiết bị | CHƯA KIỂM THỬ | Chưa có SDK/adb/Emulator cấu hình |

Các request read-only dùng identity hiện hữu từ DB với JWT ngắn hạn trong harness cục bộ; không gọi login để tránh phát email cảnh báo, không ghi token/email/dữ liệu riêng vào report. Đây là kiểm tra contract, **không thay cho kiểm thử nhập mật khẩu trên Android**. Endpoint đơn hàng không nằm trong 23 request này vì một số GET của hệ thống có đồng bộ trạng thái vận chuyển; luồng ghi chỉ test với dependency mock trong các suite có sẵn.

Test bootstrap HTTP dùng Passport/JWT strategy thật trong Nest testing app, Prisma được thay bằng port mock; không import AppModule/khởi động cron/đụng DB nhóm. Kiểm tra thiếu token, expiry, role stale, account khóa/xóa, shop assignment thu hồi, trường an toàn và khác biệt Manager/Admin.

Bundle cuối cùng và SHA-256 được ghi trong [verification-2026-11-02.json](verification-2026-11-02.json). Đây là metadata bundle, không phải metadata APK.

## Ma trận ca quan trọng

| Mã | Use case | Actor | Tiền điều kiện | Bước | Mong đợi | Thực tế | Môi trường / bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Auth header/envelope | 5 role | transport test | Gọi protected API | Bearer đúng, unwrap đúng | Đúng | api-client.test.ts | PASS |
| A02 | Login request | 5 role | token cũ trong RAM | Gọi anonymous login | Không đính token cũ | Đúng | api-client.test.ts | PASS |
| A03 | 401/403 | 5 role | token hiện hành | Nhận lỗi | 401 hết phiên, 403 giữ phiên | Đúng | api-client.test.ts | PASS |
| A04 | Race account | 5 role | request cũ đang chạy | Đổi token rồi nhận 401/body cũ | Không xóa phiên mới/không nhận dữ liệu cũ | Đúng | api-client.test.ts | PASS |
| A05 | Timeout write | Shop/KOC | transport bị ngắt | POST timeout | Không auto retry; kết quả chưa xác định | Đúng | api-client.test.ts | PASS |
| A06 | Storage race/failure | 5 role | write SecureStore chậm/lỗi | Login/logout đan xen | Token cũ bị xóa, token mới không bị xóa nhầm | Đúng | session.test.ts | PASS |
| A07 | Role và route menu | Manager/Admin | role enum thật | So quyền Users/exception | Không gộp Manager/Admin | Đúng ở policy test | policy-and-contract.test.ts + bootstrap HTTP | PASS tự động; UI còn chờ |
| A08 | Assignment live | Shop | owner/staff mock | Bootstrap rồi thu hồi assignment | Query live đúng scope, không trust JWT store | Đúng | mobile.service.spec.ts HTTP | PASS |
| A09 | VIP validation | KOC/Shop | input test | 20/26%, doanh thu 0, nhóm SP | 20 cho BE duyệt, 26/0/nhóm thiếu bị chặn | Đúng | policy-and-contract.test.ts | PASS |
| A10 | Reconnect duplicate | Customer/KOC/Shop | hai page + tin trùng | Ghép theo ID/conversation | Không trùng, không lẫn conversation | Đúng ở hàm merge | policy-and-contract.test.ts | PASS; mạng native còn chờ |
| A11 | Response projections | Shop/Admin | preview/exception fixtures | Parse schema | Nhận projection hợp lệ, history vẫn cần ID | Đúng | conversation-contract.test.ts | PASS |
| A12 | HTTP local/signing | 5 role | Gradle/XML source | Chạy plugin nhiều lần | Một demo block, cleartext chỉ local, main cấm HTTP | Đúng ở source test | android-config.test.ts | PASS; Gradle chưa compile |
| A13 | Mạng emulator/LAN | 5 role | URL input | HTTP opt-in, prefix, credentials | Chặn URL không an toàn | Đúng | environment.test.ts | PASS |
| N01 | Mật khẩu thật / SĐT | 5 role | tài khoản nhóm | Login đúng/sai trên Emulator | Backend xác thực; sai bị chặn | Chưa chạy | Android SDK còn thiếu | CHƯA KIỂM THỬ |
| N02 | Kill/reopen/expiry | 5 role | phiên native | Đóng/mở, expiry, retry offline | SecureStore restore, relogin đúng | Chưa chạy | Emulator | CHƯA KIỂM THỬ |
| N03 | Create/moderate product | Shop → Manager | Shop có ngành hàng | Điền 6 khối, upload, duyệt độc lập | BE lưu, web/native đồng bộ | Chưa ghi DB | MOBILE_DEMO_SCRIPT mục 2 | CHƯA KIỂM THỬ |
| N04 | Hợp tác / VIP exception | KOC → Shop → Admin | KOC đủ điều kiện | Hai chiều, ≤16 và >16 | Quyết định thật, link/coupon do BE cấp | Chưa ghi DB | MOBILE_DEMO_SCRIPT mục 3–4 | CHƯA KIỂM THỬ |
| N05 | Hai client chat | Customer/KOC/Shop | Android + web | Gửi/nhận/reconnect/logout | Không duplicate, không room cũ | Chưa chạy native | Socket protocol đã đối chiếu source | CHƯA KIỂM THỬ |
| N06 | Fulfillment / tracking | Shop → Customer | đơn test trên web | GHN TEST, timeline, confirm receipt | Status/tiền đúng BE | Chưa gọi mutation | MOBILE_DEMO_SCRIPT mục 5 | CHƯA KIỂM THỬ |
| N07 | APK độc lập Metro | 5 role | APK demo đã build | Tắt Metro, cài, mở lạnh, Back/keyboard | App mở và thao tác được | Chưa có APK | ANDROID_APK_GUIDE | BLOCKED SDK |

## Lỗi phát hiện và xử lý

- Danh sách chat Shop chỉ select preview không có `id`/`conversationId`: tách schema preview khỏi schema history, kiểm tra API lại thành công.
- Exception queue Admin chỉ select tên Shop/sản phẩm: schema nhận projection tối thiểu, không bịa ID.
- Race đọc response/401 sau đổi account: kiểm tra token trước và sau đọc body, không logout nhầm phiên mới.
- Logout trong khi SecureStore đang ghi: serialize writes với generation guard; không cho cleanup cũ xóa token mới.
- Zod dependency ban đầu có advisory mức high: mobile nâng lên 4.6.7, cập nhật record schema và test lại. Audit hiện còn chuỗi 11 mức moderate ở Expo tooling (`glob`/`minimatch` và phụ thuộc). Không chạy `npm audit fix --force` vì npm đề nghị downgrade major Expo. Cần theo dõi patch SDK tương thích trước phát hành production.
- npm peer react-dom tự chọn bản khác React: pin `react-dom=19.3.0`, install/check tương thích đã qua.
- Node/tsx trong sandbox báo `uv_os_get_passwd ENOMEM`; test cục bộ chạy ngoài sandbox đã qua. Đây không phải lỗi nghiệp vụ app.

## Giới hạn nghiệm thu

Chưa xác minh UI native, safe area/keyboard trên thiết bị, picker/permission native, SecureStore thật, Gradle demo bundling/signature, runtime hai client hay cold start APK. Không có screenshot Android giả hoặc PASS thay cho các mục này. Không thay đổi mật khẩu Sora để làm test thành công. Xem traceability cho các chức năng web chưa port; không coi 5 role đăng nhập được là toàn hệ thống mobile đã hoàn tất.

Bước tiếp theo: cài/cấu hình Android SDK → chạy native theo guide → thực hiện N01–N07 với dữ liệu test được cho phép → sửa lỗi quan sát được → build/cài APK và ghi SHA-256/bằng chứng thật.
