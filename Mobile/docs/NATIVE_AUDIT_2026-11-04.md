# Rà soát SCANMS native Android — 04/11/2026

## Kết luận

App native dùng chung API với web, nhưng chưa tương đương toàn bộ web. Không thể kết luận mọi màn vừa điện thoại, mọi chức năng hoạt động hoặc APK đã sẵn sàng phát hành chỉ từ việc TypeScript/build chạy thành công.

## Đối chiếu bổ sung sau khi sửa banner web

Banner thuộc `frontend`, không phải màn native trong `Mobile`. Web mở bằng Chrome tại `10.0.2.2:5180` vẫn là web, dù chạy trong máy ảo Android Studio. APK native dùng màn React Native riêng; sửa banner web không tự thay đổi APK.

- Web: build TypeScript/Vite PASS sau thay đổi cuối. Kiểm thử trình duyệt ở 320, 344, 390, 412 và 1440px PASS; không tràn ngang trang chủ, các nút banner cùng hàng trên điện thoại, vuốt cảm ứng cuộn được. Dữ liệu API trong bài kiểm thử là fixture; không xác nhận giao dịch hay giao diện các role đã đăng nhập.
- Native: chạy lại TypeScript và lint PASS, 50/50 unit/contract test PASS. Lần chạy test trong sandbox lỗi môi trường Node `uv_os_get_passwd`; chạy lại ngoài sandbox thành công. Không sửa tính năng để bỏ qua lỗi test.

| Bằng chứng source | Kết luận đối chiếu với web |
| --- | --- |
| `src/features/cart/CartScreen.tsx` chỉ lưu giỏ, tăng/giảm/xóa và tổng tiền; cuối màn ghi thanh toán thuộc giai đoạn tiếp theo | Chưa có checkout native, chưa thể hoàn tất mua hàng như web |
| `src/app/login.tsx` và `features/auth/LoginScreen.tsx` | Có đăng nhập mật khẩu; chưa có màn đăng ký/quên mật khẩu/Google login tương đương web trong bộ route hiện tại |
| `app.json`: CAMERA và RECORD_AUDIO bị chặn; không có route phát live | Chưa có phát livestream/chụp trực tiếp; chọn ảnh từ thư viện là luồng riêng |
| `app.json` chỉ có scheme `scanms`, chưa có Android intentFilters cho domain web | Chưa hoàn thiện Android App Links giữ attribution khi mở link web vào app |
| `package.json` chưa có tích hợp Expo Notifications/FCM; thông báo hiện tại qua API/socket | Chưa có bằng chứng push khi app bị đóng |
| `features/operations/OperationsScreens.tsx`: Dashboard dùng overview 7/30/90 ngày | Chưa tương đương báo cáo tài chính tháng, biểu đồ và bảng vinh danh trên web |
| `features/payouts/FinanceReportsScreen.tsx`: đọc thuế, sổ cái theo kỳ, Escrow | Đã có phần đọc; chưa có đủ xuất CSV, phát hành/đính kèm chứng từ thuế và nhập giá vốn như web |
| `navigation/router.tsx`: payload chi tiết giữ trong bộ nhớ; mất payload hướng dẫn mở lại danh sách | Có trạng thái phục hồi an toàn, nhưng chưa hỗ trợ mở thẳng mọi chi tiết bằng URL như web |

**Ưu tiên hoàn thiện:** checkout/thanh toán và attribution trước; tiếp đến tài khoản/onboarding, chứng từ/báo cáo, livestream/push. Mỗi luồng cần chạy trên Android với dữ liệu test và kiểm tra phân quyền. Không dùng số lượng màn hoặc build thành công để đánh dấu toàn bộ chức năng đã đạt.

Đợt này kiểm tra source, quyền mở nghiệp vụ, hợp đồng API, lỗi mạng/phiên và xuất bundle Android. Không tự đăng nhập bằng mật khẩu người dùng, không tạo/duyệt giao dịch tài chính và không sửa database. Chưa nghiệm thu thao tác đủ 5 role trên điện thoại thật hoặc giao diện mọi màn ở nhiều kích thước.

## Chức năng đã có màn native

“Có màn/API” dưới đây là bằng chứng triển khai, không phải chứng nhận E2E.

| Vai trò | Phạm vi có màn/API | Giới hạn cần lưu ý |
| --- | --- | --- |
| Customer | Catalog, gian hàng, SKU, giỏ, địa chỉ GHN, đơn, hủy/nhận hàng, tracking, đánh giá, đổi trả/khiếu nại, voucher, ví, hồ sơ, chat/tệp/thông báo | Chưa có checkout và thanh toán native; giỏ không tạo thành đơn ngay trong app |
| KOL/KOC | Hợp tác, VIP, link/QR, coupon, mẫu/video, KYC, kênh/tier, ví/rút tiền, lịch sử, campaign, thưởng tháng | Chưa hoàn thiện attribution từ link web vào app, livestream và onboarding tự đăng ký |
| Shop | Sản phẩm, giá/tồn SKU có sẵn, đơn/GHN/manual/XLSX, hậu mãi, hợp tác/VIP/campaign/bonus, tài chính, payout/bill/lô, cấu hình Shop | Chưa tương đương trình thiết kế ma trận SKU và toàn bộ analytics web |
| System Manager | KYC/sản phẩm, trọng tài mẫu/đổi trả, MAP/promotion, review/report, payout, audit/fraud/link/coupon; thêm báo cáo thuế, sổ cái và Escrow | Các luồng ghi dữ liệu nhiều vai trò, bank gateway và tệp vẫn cần test thiết bị/API thật |
| System Admin | Quyền vận hành, ngoại lệ VIP, nhân sự/phân công gian hàng, dashboard | Chưa port toàn bộ Executive Dashboard/biểu đồ/bộ lọc như web |

## Những thay đổi đã thực hiện

1. **Thành phần giao diện dùng chung:** bỏ lề ngang thẻ bị cộng hai lần bên trong trang cuộn; chữ nút có thể xuống dòng/căn giữa; badge co theo chiều rộng; nút tối thiểu 48; input nhiều dòng dùng chiều cao tối thiểu. Giữ vàng be theo thiết kế SCANMS. Chưa xác nhận bằng screenshot mọi màn.
2. **Duyệt rút tiền:** đọc cấu hình `/admin/payouts/gateway`; Manager/Admin có nút duyệt API cho PENDING và đối soát cho PROCESSING có cùng provider. Không gửi lại lệnh PROCESSING như một giao dịch mới; không chuyển lệnh xuất thủ công sang gateway âm thầm. Có xác nhận đúng người nhận và net trước thao tác.
3. **Timeout:** API client không retry thao tác ghi; sau thao tác ngân hàng luôn tải lại danh sách kể cả lỗi để phản ánh trạng thái đã nhận ở server. Trạng thái chưa rõ không được diễn giải thành thành công.
4. **Sandbox:** lịch sử Manager và ví KOL giữ provider/reference, hiển thị “Hoàn tất · Sandbox”, không yêu cầu tải bill chuyển tiền thật của Sandbox. Không cộng ngược khoản đã rút vào khả dụng.
5. **Thuế & đối soát:** trong Nghiệp vụ của Manager/Admin, mở “Thuế, Escrow & đối soát”. Báo cáo thuế tách ngoài Sandbox và Sandbox theo kỳ hoàn tất payout. Sổ cái dùng `yearMonth`, ghi rõ biến động tháng, không gọi là số dư cuối kỳ. Escrow dùng dữ liệu và holdDays từ backend; ngày giờ theo Việt Nam; có phân trang và trạng thái đổi trả/thẩm định. Đây là màn đọc, không có nút ép giải tỏa.
6. **Chuẩn bị phân phối:** thêm `eas.json` profile preview APK và production AAB; kiểm tra trước build chặn URL local/HTTP, thiếu `/api`, URL chứa credentials và các biến public có tên secret. Không thay backend/.env, không nhúng secret ngân hàng vào app.

## Bằng chứng kiểm tra ngày 04/11

| Kiểm tra | Kết quả |
| --- | --- |
| Mobile TypeScript | PASS |
| Mobile oxlint, deny warnings | PASS |
| Mobile unit/contract | 50/50 PASS; gồm quyền module, gateway, phiên, timeout, Sandbox và release environment |
| Expo export Android | PASS; Hermes bundle 1.458 modules, không phải APK |
| Git diff whitespace | PASS |
| Emulator qua adb | Nhận thiết bị emulator-5554; chưa chứng minh app mới đã cài hoặc UI đã đạt |
| Duyệt payout/đối soát với ngân hàng thật hoặc Sandbox | CHƯA CHẠY giao dịch trong đợt này |
| Giao diện toàn bộ màn, cỡ chữ lớn, bàn phím trên thiết bị | CHƯA NGHIỆM THU |
| APK release/ARM cài điện thoại thật | CHƯA BUILD/CÀI trong đợt này |

## Các phần chưa đủ để thay thế web

| Phần thiếu/chưa nghiệm thu | Ảnh hưởng |
| --- | --- |
| Checkout/PayOS/luồng quay lại sau thanh toán | Chưa mua hàng trọn luồng bằng native |
| Livestream, camera/microphone | Không phát live native; camera/mic đang bị chặn trong app.json. Gallery/tải tệp là luồng riêng |
| Android App Links và attribution affiliate | Scheme `scanms` chưa chứng minh link sản phẩm web mở app và giữ attribution |
| Push FCM khi app đóng | Center/foreground polling không tương đương thông báo nền |
| Onboarding/nâng role tự phục vụ | Chưa đủ như web |
| Analytics/Executive Dashboard, biểu đồ chuyên sâu | Màn báo cáo thuế/sổ cái mới không thay thế toàn bộ dashboard |
| Chứng từ thuế PDF, xuất CSV, ghi giá vốn trong màn báo cáo native mới | Chưa port đủ thao tác của màn web |
| Thiết kế ma trận SKU | Chỉnh giá/tồn SKU hiện có không thay thế tạo ma trận |
| APK ARM đã ký, cài trên máy thật không Metro | Chưa có bằng chứng phát hành trong đợt này |

## Cách kiểm thử thay đổi mới

1. Manager/Admin đăng nhập → Nghiệp vụ → Duyệt yêu cầu rút tiền. Đối chiếu mã, gross/tax/net, người nhận với web. Chỉ bấm duyệt trên payout test được phân công. Đối chiếu trạng thái sau khi mở lại app; Sandbox không phải chuyển tiền thật.
2. Nếu PROCESSING thuộc gateway đang cấu hình, dùng “Đối soát kết quả ngân hàng”. Không tạo thêm yêu cầu chuyển tiền để thử lại lệnh cũ. Lệnh sai provider hoặc chưa cấu hình gateway không có nút duyệt API.
3. KOL → Ví → lịch sử rút: kiểm tra đúng payout và nhãn Sandbox/reference. Khả dụng đã giảm khi tạo lệnh; duyệt không giảm lần nữa và không cộng lại.
4. Manager/Admin → Nghiệp vụ → Thuế, Escrow & đối soát. Chọn báo cáo thuế và nhập kỳ `2026-11`, bấm xem. So sánh riêng gross/tax/net ngoài Sandbox và Sandbox với cùng kỳ trên web.
5. Đổi sang Sổ cái, kiểm tra các nhóm biến động tháng/chênh lệch; không ép bằng 0. Đổi sang Escrow, kiểm tra KOL, Store, ngày giao, dự kiến giải tỏa và trạng thái đổi trả.
6. Customer/KOL/Shop không được thấy hoặc mở module báo cáo vận hành này; backend vẫn kiểm tra quyền độc lập.

## Ma trận nghiệm thu giao diện còn phải chạy trên thiết bị

- Điện thoại rộng 320/360/412dp, cỡ chữ hệ thống 100% và 130%; nhãn dài, tiền lớn, mã/reference dài.
- Mỗi role: menu, danh sách, chi tiết, modal/form, dropdown, upload, pagination, Android Back, SafeArea và bàn phím.
- Chat: chuyển hội thoại, gửi tệp, bàn phím không che ô nhập, mất mạng/kết nối lại, lịch sử không trùng.
- Upload: thư viện ảnh/PDF, quyền bị từ chối, tệp lớn/sai loại; tải và chia sẻ chứng từ trên Android.
- Mạng: máy thật dùng API HTTPS đã deploy; ảnh/tệp/socket cũng truy cập được, không dùng localhost của máy phát triển.
- Phiên: đổi tài khoản/role, token hết hạn, tắt/mở app; không hiện dữ liệu tài khoản trước.
- APK: khởi động khi tắt Metro/Android Studio, ký đúng bản, hỗ trợ ARM64, cập nhật bản cũ, không có màn trắng khi API không tới được.

## Chuẩn bị APK cài điện thoại

APK native không tự deploy frontend/backend. Backend, database, media, socket và callback thanh toán phải có môi trường hoạt động riêng. Trong môi trường EAS preview/production đặt `EXPO_PUBLIC_API_URL` tới HTTPS API thật kết thúc `/api`; không sao chép backend/.env vào Mobile.

Sau khi liên kết tài khoản/dự án Expo của nhóm và cấu hình URL:

```powershell
cd Mobile
npm run release:check
npx eas-cli@latest build -p android --profile preview
```

Preview tạo APK cài trực tiếp; production dùng AAB. Không có project ID/signing key hoặc URL deploy được tự bịa. Bản demo/debug trước đây không phải bằng chứng APK release ARM hiện tại đã chạy.

Tài liệu cấu hình: [Expo APK](https://docs.expo.dev/build-reference/apk/) và [build hooks](https://docs.expo.dev/build-reference/npm-hooks/).
