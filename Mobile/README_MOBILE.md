# SCANMS Mobile — Android trước

Ứng dụng React Native + TypeScript, Expo SDK 58, Expo Router và React Query. Giao diện native giữ tông vàng be SCANMS, dùng `StyleSheet` trong TS/TSX, không có file CSS. Android dùng cùng tài khoản, API và database với web.

## Phạm vi hiện tại

**Nguyên tắc đồng bộ:** luồng nghiệp vụ, phân quyền, trạng thái và dữ liệu lấy theo web/backend cùng hệ thống; mobile chỉ tổ chức lại FE thành màn hình, tab, sheet và thao tác dành cho điện thoại. Các tính năng chưa port phải ghi rõ, không tự rút gọn quy tắc nghiệp vụ. Chat dùng nút **+** cạnh ô nhập để chọn ảnh/video hoặc tài liệu, xem trước và gửi qua API/Socket.IO hiện có.

**Luồng mới 04/11:** chỉ dùng mã độc quyền KOL; khách sao chép và tự nhập ở checkout web, không có lưu mã hoặc voucher Shop/Sàn. Đã sửa nút duyệt mã của Shop và bổ sung các thao tác theo trạng thái. Xem [cập nhật mobile và kịch bản test từng role](docs/MOBILE_COMPLETION_2026-11-04.md).

**Ví 04/11:** đã sửa hợp đồng Decimal gây lỗi số dư, bổ sung nạp payOS và nạp thử nghiệm có kiểm soát cho Customer. Xem [luồng và các bước nghiệm thu ví](docs/WALLET_TOPUP_2026-11-04.md).

**Giao diện mới 04/11:** Khách mua hàng dùng Trang chủ / Khám phá / Đơn mua / Tin nhắn / Tôi. Các tiện ích ví, voucher, địa chỉ, hồ sơ và đổi trả ở mục Tôi; giỏ nằm trên thanh đầu trang. Các role đối tác/vận hành dùng tab Công cụ. Xem [thiết kế và kịch bản nghiệm thu mới](docs/MARKETPLACE_UI_2026-11-04.md).

Menu **Nghiệp vụ** tập hợp các màn được phép theo role. Hướng dẫn test chi tiết và giới hạn nghiệm thu: [ROLE_WORKFLOWS_2026-11-03.md](docs/ROLE_WORKFLOWS_2026-11-03.md).

| Role | Các nhóm chức năng native đã tích hợp |
| --- | --- |
| CUSTOMER | Sản phẩm/gian hàng, biến thể, giỏ hàng, địa chỉ GHN, đơn/hủy/nhận/đánh giá/đổi trả/khiếu nại, voucher, ví, hồ sơ, thông báo, chat và tệp |
| COLLABORATOR | Hợp tác/VIP, link/QR, coupon, hàng mẫu/video, KYC/kênh xã hội/tier, ví/rút hoa hồng, chiến dịch/thưởng tháng, dashboard |
| SHOP_MANAGER | Sản phẩm 6 khối/sửa/xóa/SKU giá-tồn, đơn/GHN TEST/manual/XLSX, đổi trả/hàng mẫu, MAP/khuyến mãi, hợp tác/VIP/campaign/bonus, tài chính/payout/bill/XLSX, cấu hình Shop |
| SYSTEM_MANAGER | Duyệt sản phẩm/KYC, trọng tài hàng mẫu/đổi trả, MAP/promotion, review/report, payout, dashboard/audit/fraud/link/coupon |
| SYSTEM_ADMIN | Nghiệp vụ vận hành, ngoại lệ VIP, nhân sự và phân công gian hàng, tổng quan toàn sàn |

Thanh toán/checkout và livestream mobile vẫn ở giai đoạn sau. Chưa port toàn bộ web: còn trình thiết kế ma trận SKU, onboarding/nâng role tự phục vụ, analytics chuyên sâu, App Links và push khi app đóng. Native mới cần nghiệm thu mutation nhiều role; không đánh dấu E2E PASS chỉ từ build/test source.

## Chạy từ Android Studio / Emulator

Máy cần Node 22.14+ và Android Studio/SDK. Đã có JDK 21 trên máy hiện tại. Cài SDK trước theo [ANDROID_APK_GUIDE.md](docs/ANDROID_APK_GUIDE.md).

Backend chỉ chạy **một terminal**:

```powershell
cd D:\ProjectCapstone\backend
npm ci
npm run start:dev
```

Giữ `backend/.env` của dự án đang dùng. Không sao chép database URL, JWT secret, Cloudinary/GHN/Google secret sang mobile. Không chạy reset/migration/seed để mở app.

Terminal mobile:

```powershell
cd D:\ProjectCapstone\Mobile
npm ci
Copy-Item .env.example .env  # Chỉ lần đầu, khi chưa có .env riêng
npm run android:prebuild
```

Mở **`D:\ProjectCapstone\Mobile\android`** bằng Android Studio → chờ Gradle Sync → Device Manager → mở Emulator → chọn variant **debug** → Run. Chạy Metro ở terminal riêng:

```powershell
cd D:\ProjectCapstone\Mobile
npm start
```

Hoặc khi Emulator đang chạy: `npm run android` để CLI build/cài debug. Debug cần Metro. Bản **demo** được cấu hình để đóng gói JS/assets, xem lệnh xuất APK trong hướng dẫn Android.

## Mạng và môi trường

| Môi trường | EXPO_PUBLIC_API_URL | EXPO_PUBLIC_ALLOW_LOCAL_HTTP |
| --- | --- | --- |
| Android Emulator đã chọn | `http://10.0.2.2:3000/api` | `true` |
| Điện thoại cùng LAN | `http://<IPv4-máy-chạy-BE>:3000/api` | `true` |
| Server test | `https://<host-test>/api` | `false` |

Đổi `.env` rồi khởi động lại Metro; bản APK đóng gói phải build lại. Đổi IP LAN cần prebuild lại để sinh đúng ngoại lệ HTTP. Không dùng `localhost` làm địa chỉ backend trên điện thoại. HTTP chỉ được phép theo host local cụ thể trong debug/demo; release không có ngoại lệ HTTP. Socket tự lấy cùng origin với API và namespace `/chat`.

Có thể mở `http://10.0.2.2:3000/api/docs` bằng Chrome trong Emulator để kiểm tra đường tới backend. Nếu LAN không vào được, kiểm tra BE bind, mạng cùng subnet và Windows Firewall cho cổng 3000; không tắt Firewall toàn bộ. URL ảnh backend trả về cũng phải truy cập được từ thiết bị.

## Đăng nhập và dữ liệu

Tự nhập email/SĐT và mật khẩu hiện có. Role lấy từ backend, không chọn role để nâng quyền. Không có tài khoản/mật khẩu hardcode, demo bypass hoặc database riêng.

| Role | Định danh test hiện có để người nghiệm thu tự nhập |
| --- | --- |
| CUSTOMER | `customer.an@scanms.vn` |
| COLLABORATOR | `kol.bronze@scanms.vn` |
| SHOP_MANAGER | `manager.sora@scanms.vn` hoặc Shop được nhóm phân công |
| SYSTEM_MANAGER | `manager@scanms.vn` |
| SYSTEM_ADMIN | `admin@scanms.vn` |

Mật khẩu lấy từ nhóm và nhập trên màn đăng nhập; không đưa vào source, tài liệu hay APK. Riêng Sora không suy ra mật khẩu từ biến autofill web và không tự reset DB. Các định danh trên có thể thay đổi khi nhóm seed lại; backend là nguồn xác thực.

JWT lưu bằng SecureStore; không lưu mật khẩu. Khi token hết hạn, app yêu cầu đăng nhập lại vì BE hiện không có refresh endpoint. Mất mạng khi khôi phục phiên giữ nguyên token và cho thử lại. Đăng xuất xóa cache riêng, ngắt socket và xóa token thiết bị; đây không phải thu hồi JWT phía server.

## Kiểm tra source

```powershell
npm run typecheck
npm run lint
npm test
npm run bundle:android
```

`bundle:android` xuất Hermes bundle vào `dist/`, **không phải APK**. Kiểm tra backend mới không kết nối DB nhóm:

```powershell
cd ..\backend
npm test -- --runTestsByPath src/modules/mobile/mobile.service.spec.ts src/modules/products/tests/products.variants.spec.ts src/modules/products/tests/products.moderation.spec.ts
```

## Tài liệu bàn giao

- [Kiến trúc và quyết định kỹ thuật](docs/MOBILE_ARCHITECTURE.md)
- [Truy vết role, API, web và phần còn lại](docs/MOBILE_TRACEABILITY.md)
- [Bằng chứng kiểm thử và giới hạn hiện tại](docs/MOBILE_TEST_REPORT.md)
- [Cài SDK, chạy Android Studio và xuất APK](docs/ANDROID_APK_GUIDE.md)
- [Kịch bản demo từng role](docs/MOBILE_DEMO_SCRIPT.md)
