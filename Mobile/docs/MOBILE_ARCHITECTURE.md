# Kiến trúc SCANMS Mobile

## Khảo sát và lựa chọn

Source khảo sát: `backend/package.json`, `frontend/package.json`, `backend/src/main.ts`, `frontend/src/routes/AppRoutes.tsx`, controller/DTO/service trong `auth`, `products`, `orders`, `customer`, `chat`, `affiliate-deals`, `ai`, `users`, `stores`; Prisma schema và API/service tương ứng ở web.

Web dùng React 19 + TypeScript, Vite, React Router, Tailwind và React Query. Backend NestJS 11, PostgreSQL/Prisma 7, JWT/Passport, Socket.IO. Mobile chọn TypeScript/React Native để chia sẻ cách tổ chức feature và contract; không mang DOM/CSS hoặc cơ chế lưu token trình duyệt sang Android.

Phiên bản khóa trong `package-lock.json`: Expo 58.0.22, React Native 0.88.1, React 19.3.0, Expo Router 58.0.29, React Query 5.103.2, Socket.IO Client 4.8.1, Zod 4.6.7. Node chạy kiểm thử: 22.14.0. Kiểm tra phiên bản theo [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) và [cài Expo Router](https://docs.expo.dev/router/installation/).

## Tổ chức source

```text
Mobile/
  src/app/                Expo Router, protected stacks và tabs
  src/features/           auth, catalog, orders, cooperation, chat, deals, moderation, admin
  src/components/         thành phần native chung, loading/error/empty/disabled
  src/services/api/       bearer, timeout, envelope, hủy request, phân biệt 401/403
  src/services/auth/      hàng đợi ghi/xóa token trong secure storage
  src/services/realtime/  lifecycle Socket.IO, cache và dedupe tin nhắn
  src/types/              schema response, 5 enum role và nhãn trạng thái
  src/theme/              token vàng be
  tests/                  test thuần Node/TypeScript, không truy cập DB nhóm
  plugins/                sinh cấu hình Gradle/network security từ app.json
  scripts/                build demo và ghi metadata APK khi build thành công
  android/                project native sinh bởi prebuild, không sửa tay/không commit
backend/src/modules/mobile/
  mobile.controller.ts    GET /api/mobile/bootstrap, JwtAuthGuard
  mobile.service.ts       role hiện hành + scope gian hàng + cấu hình phân loại
  mobile.module.ts        tích hợp vào AppModule hiện hữu
```

Không có backend/database thứ hai trong `Mobile`. Module NestJS mới chỉ đọc, không migration, không transaction/record mới. Các thao tác ghi tiếp tục dùng service nghiệp vụ hiện hữu và transaction của service đó.

`backend/src/modules/products/product-variant-fields.ts` được tách từ phần validate đang có. Cả ProductsService và bootstrap gọi cùng bảng thuộc tính ngành hàng; app không tự đoán cấu hình ngành hàng.

## Authentication và quyền tài nguyên

```mermaid
sequenceDiagram
  actor User
  participant App as Android native
  participant API as NestJS /api
  participant DB as PostgreSQL
  participant Vault as SecureStore
  User->>App: Email/SĐT và mật khẩu hiện hữu
  App->>API: POST /auth/login
  API->>DB: Kiểm tra mật khẩu và tài khoản
  API-->>App: accessToken
  App->>API: GET /auth/me + /mobile/bootstrap (Bearer)
  API->>DB: Đọc role, trạng thái và phân công hiện hành
  API-->>App: Identity + managedStores + capabilities
  App->>Vault: Lưu accessToken
  App-->>User: Màn hình theo role
  Note over App,API: Không có refresh endpoint; 401 cần đăng nhập lại
```

Nguồn role tin cậy là `backend/src/common/strategies/jwt.strategy.ts`: luôn đọc user hiện hành từ DB, không lấy role/storeId cũ trong JWT làm quyền tài nguyên. `managedStoreWhere` kiểm tra chủ Shop hoặc nhân sự Shop Manager còn active, không deleted. Shop chọn một trong danh sách phân công; các endpoint vẫn kiểm tra lại membership. Capabilities chỉ phục vụ UX.

Expo Router dùng protected stacks và protected tabs. Manager không có màn Users/Exceptions của Admin. `RoutePayloadProvider` giữ snapshot màn chi tiết trong bộ nhớ theo phiên, URL chỉ có khóa tạm. Không serialize đơn/chat vào deep link. Khi mất snapshot/cold deep link, màn yêu cầu mở lại từ danh sách; chưa có app links cho smart link hoặc callback thanh toán. Xem [protected routes](https://docs.expo.dev/router/advanced/protected/).

SecureStore chỉ giữ access token, theo [tài liệu SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/). Hàng đợi ghi và generation guard xử lý login/logout đan xen. Logout chặn UI ngay, hủy HTTP, xóa query cache và unmount socket; không tự phát minh API revoke/refresh.

## REST và trạng thái lỗi

- Prefix thực tế `/api`, success `{ success: true, statusCode, data }`; lỗi Nest có `message` string hoặc array. Không bỏ qua lỗi 4xx/5xx để hiển thị thành công.
- Query key có userId và store/page/filter khi cần. Customer orders API trả toàn bộ collection, client chỉ chia trang hiển thị; Shop products/orders dùng phân trang server. Điều này được ghi rõ thay vì gọi đó là server pagination.
- Không tự retry mutation. Timeout ghi dữ liệu báo **kết quả chưa xác định**, cần tải lại trước khi gửi lại. Mỗi form có khóa đồng bộ bằng ref để chặn double tap trước lần render tiếp theo.
- 401 xóa phiên hiện hành; response 401 thuộc token cũ không logout tài khoản mới. 403 giữ phiên, báo thiếu quyền. Response sai schema là lỗi contract, input sai là lỗi field riêng.
- Tiền và trạng thái lấy từ BE. Mobile chỉ định dạng VND; không tính lại phí, thuế, rate quyết toán, Escrow hay tổng thanh toán.
- Mất mạng khi restore không giả phiên đăng nhập thành công. Người dùng có nút thử lại hoặc logout.

## Chat và VIP

Socket.IO namespace `/chat`, handshake `auth.token`. Đợi server `connected { userId }`, rồi join room bằng `join_conversation { conversationId }`; rời màn phát `leave_conversation`. App background ngắt kết nối, foreground nối lại và tải lại lịch sử/cache. Cleanup tháo listeners và disconnect khi đổi phiên.

Lịch sử `GET /chat/conversations/:id/messages?take=30&cursor=...` trả mảng tăng dần theo thời gian; UI chat đảo để hiển thị kiểu messenger. Ghép trang theo ID, lọc đúng conversationId, không nhân đôi khi nhận lại `new_message`. Preview danh sách là schema riêng vì backend không select ID của preview.

`send_message` dùng UUID `messageId`, backend sẵn hỗ trợ chống trùng. Timeout không tự gửi lại; cùng draft gửi lại giữ UUID. Card VIP trong văn bản chat chỉ dẫn tới entity `/affiliate-deals/:id`/danh sách nghiệp vụ; không coi JSON/văn bản là bằng chứng phê duyệt.

VIP dùng DTO doanh thu/phạm vi hiện tại: rate 10–25%, single/selected/store-wide, targetRevenue, commitmentDays, salesCommitment và cam kết video. Counterparty phản hồi; trên 16% theo hàng đợi ngoại lệ Admin. Backend vẫn kiểm tra năng lực KOC, self-approval, ngân sách voucher và state transition. App không tự cộng/tính quyết toán hoa hồng.

Chat giai đoạn này gửi text, hiển thị ảnh đã có và mở file HTTPS bằng app hệ thống. Upload attachment mới, video player riêng, push notification, read receipt realtime chi tiết chưa triển khai. Trạng thái gửi/timeout phải được nghiệm thu trên hai client thật.

## Mạng, media và Android

Emulator dùng `10.0.2.2:3000/api`; LAN dùng IP máy BE; test server dùng HTTPS. Image picker → FormData URI → endpoint Cloudinary hiện tại, không có secret Cloudinary trong app. Chọn ảnh bìa kiểm tra vuông ≥800px, tối đa 5MB, gallery tối đa 4; server vẫn validate lại.

Config plugin sinh network security với main/release cấm HTTP, debug/demo chỉ cho host local cụ thể. Không chấp nhận mọi chứng chỉ TLS. Chặn permission camera/micro/overlay không cần cho phạm vi hiện tại. Bản demo dùng variant non-debuggable để Gradle đóng gói JS, ID riêng `.demo`, ký debug chỉ cho nghiệm thu; release cần khóa ký riêng.

Android source được sinh từ `app.json`/plugin theo [config plugins](https://docs.expo.dev/config-plugins/plugins/), không sửa thư mục sinh tự động. Không gọi EAS/cloud build hoặc upload source vì môi trường người dùng chọn là Android Studio local.
