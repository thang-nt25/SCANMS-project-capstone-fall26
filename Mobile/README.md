# SCANMS Android

Bắt đầu tại [README_MOBILE.md](README_MOBILE.md). Mã giao diện nằm trong `src/`; phần bổ sung backend nằm tại `../backend/src/modules/mobile/` và dùng chung NestJS/Prisma của web.

**04/11/2026:** đã thiết kế lại trải nghiệm mua sắm mobile: Trang chủ, lưới sản phẩm, chi tiết/SKU, gian hàng, giỏ, đơn mua, Tôi và menu Công cụ theo role. Xem [giao diện mới và các bước nghiệm thu](docs/MARKETPLACE_UI_2026-11-04.md). Bộ test mobile hiện 50/50 PASS; bản debug có bộ icon mới đã build/cài trên emulator.

Đã bổ sung menu **Nghiệp vụ** và các màn native theo 5 role: địa chỉ/giỏ hàng/đổi trả, link/QR/hàng mẫu/ví, giá sàn/KYC/duyệt chi trả và quản trị. Xem [phạm vi triển khai và các bước test từng role](docs/ROLE_WORKFLOWS_2026-11-03.md).

APK **debug x86_64** mới đã build/cài, cần Metro. Mobile có 46 test PASS, backend liên quan 71 test PASS; đã kiểm tra workspace, dashboard và KYC qua API thật trên emulator. Các mutation E2E đủ 5 role và APK standalone ARM vẫn cần nghiệm thu. Báo cáo startup trước đó tại [ANDROID_STARTUP_2026-11-03.md](docs/ANDROID_STARTUP_2026-11-03.md).
