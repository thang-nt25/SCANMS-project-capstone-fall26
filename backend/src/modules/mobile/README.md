# Mobile integration

`GET /api/mobile/bootstrap` dùng `JwtAuthGuard` và JWT strategy hiện hành của hệ thống. Response được global TransformInterceptor bọc như API web.

- `contractVersion: 1`
- `actor`: id, email, fullName, role lấy từ identity hiện hành; không trả password/secret.
- `managedStores`: chỉ Shop Manager, theo owner hoặc staff còn active; không tin storeId trong JWT/client.
- `variantFields`: cấu hình phân loại dùng cùng helper với ProductsService.
- `capabilities`: affordance giao diện của bản native hiện tại, không thay guards/policies ở API nghiệp vụ.
- `sessionPolicy: REAUTHENTICATE_ON_EXPIRY`: chưa có refresh-token API.
- `integrations`: payment và livestream native còn deferred.

Module không ghi DB, không thêm schema/migration và không tạo tài khoản. Mobile tiếp tục dùng controller/service/transaction hiện có cho mọi mutation.

Test HTTP với Passport/JWT thật và Prisma mock (không AppModule/cron/DB nhóm):

```powershell
npm test -- --runTestsByPath src/modules/mobile/mobile.service.spec.ts
```

Giao diện và hướng dẫn Android: `../../../../Mobile/README_MOBILE.md` tính từ thư mục module này.
