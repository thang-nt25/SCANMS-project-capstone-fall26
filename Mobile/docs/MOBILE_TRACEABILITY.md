> Cập nhật triển khai: xem [nghiệp vụ đã bổ sung và kịch bản test 5 role](ROLE_WORKFLOWS_2026-11-03.md). Phần bên dưới lưu snapshot nền tảng trước đợt bổ sung, không phải trạng thái mới nhất.

# Truy vết chức năng và phạm vi

> Rà soát lại ngày 03/11/2026: mobile **chưa đủ nghiệp vụ của 5 role** và chưa tương đương web. Xem [bảng thiếu theo từng role và thứ tự bổ sung](ROLE_GAP_AUDIT_2026-11-03.md). Các mục “tiếp tục dùng web / còn mở” bên dưới là việc còn thiếu trên Android, không phải đã nghiệm thu; livestream và thanh toán mobile được để giai đoạn sau.

Ngày khảo sát: 02/11/2026, nhánh `thinh`, base Git `0230e53`. Bảng này mô tả source hiện tại; không phải biên bản nghiệm thu Android. Người dùng đã chốt Android Studio/Emulator, đủ 5 role, sản phẩm/đơn, hợp tác/chat/VIP và màn duyệt; livestream/thanh toán mobile làm sau.

## Ma trận 5 role

| Role | Bằng chứng web/BE | Android đã viết code | Tiếp tục dùng web / còn mở | Quyền tài nguyên |
| --- | --- | --- | --- | --- |
| CUSTOMER | `frontend/src/pages/customer/CustomerPortalPage.tsx`, modules `customer`, `orders`, `cart`, `returns`, `chat` | Catalog/detail; orders/detail; xác nhận đã nhận; hành trình GHN; chat Shop | Cart, địa chỉ, checkout/payment, review, đổi trả/dispute, voucher, ví, notification và cập nhật hồ sơ | Đơn của khách; conversation có khách tham gia; role lấy từ JWT strategy hiện hành |
| COLLABORATOR | pages `collaborator/`, modules `affiliate-deals`, `referral-links`, `sample-requests`, `wallets`, `payouts`, `store-collaborator`, `chat` | Catalog; yêu cầu/phản hồi hợp tác; chat; tạo/phản hồi VIP theo doanh thu, nhóm SP/toàn Shop, copy link VIP được cấp | Bộ tạo smart link/QR thường, xin mẫu/upload review, dashboard/KPI chi tiết, ví/rút tiền, social/KYC, livestream | Hợp tác/deal/conversation của chính KOC; không tự ký cả hai phía |
| SHOP_MANAGER | pages `merchant/`, modules `products`, `orders`, `stores`, `ai`, `affiliate-deals`, `chat` | Chọn Shop được phân công; catalog; tạo SP 6 khối/upload; orders; nhập vận đơn/GHN TEST; theo dõi GHN; hợp tác; AI Matching; chat; VIP | Edit/delete SP, MAP/promotions, Excel/manual order, review/return/sample approval, quản trị kho/Shop, ví/payout, live | `managedStoreWhere`: chủ Shop hoặc staff Shop Manager active và còn phân công |
| SYSTEM_MANAGER | pages `admin/`, controllers KYC/products/returns/sample | Hàng đợi sản phẩm; hồ sơ/chứng từ; duyệt/từ chối; orders toàn hệ thống theo policy hiện hành | KYC, trọng tài mẫu/đổi trả, MAP, moderation review, audit/fraud | Maker–checker do service bảo vệ; không có Users và ngoại lệ VIP của Admin |
| SYSTEM_ADMIN | `users.controller.ts`, `affiliate-deals.controller.ts`, pages `admin/` | Manager screens; ngoại lệ VIP; danh sách user chỉ đọc | Tạo/khóa/phân quyền/phân công tài khoản; dashboard executive; các màn vận hành còn lại | Chỉ Admin gọi `/users` và `/affiliate-deals/exceptions`; không coi ẩn menu là quyền BE |

Phần native ghi ở cột 3 đã có implementation, chưa phải toàn bộ chức năng web đã port. Các mục ở cột 4 được nêu rõ để lên giai đoạn tiếp theo; không báo hoàn tất KYC, payout, đổi trả hay mọi màn duyệt chỉ vì đã có đăng nhập role đó.

## Màn hình → contract thật → entity

Tất cả endpoint dưới đây có prefix `/api`. Chi tiết request/response được validate ở `Mobile/src/services/scanms.ts`, `types/contracts.ts` và form schema theo feature.

| Use case / màn native | Role | Endpoint thực tế | Bằng chứng BE | Entity / kiểm soát |
| --- | --- | --- | --- | --- |
| Login / restore / bootstrap | 5 role | POST `/auth/login`; GET `/auth/me`; GET `/mobile/bootstrap` | `auth/auth.controller.ts`, `common/strategies/jwt.strategy.ts`, `mobile/mobile.controller.ts` | User, Store/staff; không có refresh endpoint |
| Catalog/search/page | Customer/KOC | GET `/public/products?page&limit&search&storeId` | `products/public-products.controller.ts` | Product đã được phép công khai; KOC có ngữ cảnh affiliate |
| Shop catalog | Shop | GET `/products?page&limit&search&storeId` | `products/products.controller.ts` | Product thuộc Shop được phân công |
| Product detail | Customer/KOC/Shop | GET `/public/products/:id/landing` | `products/public-products.controller.ts` | LandingProduct/Store; Shop draft dùng snapshot danh sách |
| Tạo sản phẩm 6 khối | Shop | POST `/products`; POST `/upload/product-cover`; POST `/upload/image` | `products/dto/create-product.dto.ts`, ProductsService, upload controller | Product/Variant/MediaAsset; validate ngành hàng, ảnh, compliance, barcode, semantic checks và state draft tại BE |
| Duyệt sản phẩm | Manager/Admin | GET `/products/moderation?status`; PATCH `/products/:id/moderation` | ProductsController/Service + `dto/moderate-product.dto.ts` | Product; maker–checker; không tự duyệt |
| Customer orders/detail/receipt | Customer | GET `/customer/orders`; GET `/customer/orders/:id`; POST `/customer/orders/:id/confirm-receipt` | `customer/customer.controller.ts`, customer service | Order/OrderItem; sở hữu và transition do BE kiểm tra |
| Shop/system orders | Shop/Manager/Admin | GET `/orders/my-store?page&limit&search&storeId` | OrdersController/Service, `dto/fulfillment-order.dto.ts` | Order/Store; scope và page server |
| Bàn giao đơn | Shop | PATCH `/orders/:id/fulfillment`; POST `/shipping/ghn/create-order/:id` với `environment=TEST` | OrdersController, ShippingController | Order; transition và vận đơn thực do BE/GHN cấp; không có nút tạo GHN LIVE trên mobile |
| Tracking | Customer/Shop/Manager/Admin | GET `/shipping/ghn/track/:code?environment=...` | ShippingController/GhnService | Đọc hành trình; không tự coi mốc chưa xác nhận là hoàn tất |
| Hợp tác hai chiều | KOC/Shop | GET `/store-collaborators/my-invitations`; GET `/store-collaborators/shop?storeId`; POST `/request`, `/invite`; PATCH `/:id/accept`, `/reject`, `/shop-approve`, `/shop-reject` | `commission-rules/store-collaborators.controller.ts` và service | StoreCollaborator; status/direction/server membership |
| AI Matchmaker | Shop | GET `/ai/recommend-kols/:productId` | `ai/ai.controller.ts`, `ai/ai.service.ts` | Product/KOC, `recommendedKols`, matchScore/scoreBreakdown/aiReasoning của BE |
| Tạo VIP | KOC/Shop | POST `/affiliate-deals/proposals`, `/offers` | AffiliateDealsController; DTO `create-exclusive-deal`, `invite-exclusive-deal` | ExclusiveDealProposal/ScopeProduct; 10–25%, KPI doanh thu |
| VIP list/state/response | KOC/Shop | GET `/affiliate-deals/mine`, `/shop`, `/:id`; PATCH `/:id/approve`, `/:id/reject` | AffiliateDealsService + decision policy | Counterparty; valid transition; rate/coupon/budget do BE quyết định |
| Ngoại lệ VIP | Admin | GET `/affiliate-deals/exceptions`; PATCH `/:id/exception-review` | AffiliateDealsController/Service | Sau counterparty chấp thuận, trên 16%; độc lập; giới hạn 25% |
| Conversations/history/read | Customer/KOC/Shop | GET/POST `/chat/conversations`; GET `/:id/messages?take&cursor`; PATCH `/:id/read` | `chat/chat.controller.ts`, `chat/chat.service.ts` | Conversation, ChatMessage; membership, cursor và unread |
| Realtime chat | Customer/KOC/Shop | Socket.IO `/chat`: connected, join/leave_conversation, send_message, new_message, chat_warning | `chat/chat.gateway.ts`, `chat/dto/send-message.dto.ts` | JWT handshake, participant room, UUID chống trùng |
| User directory | Admin | GET `/users` | `users/users.controller.ts`, users service | User projection; UI chỉ đọc |

## Phụ thuộc trình duyệt và phần tiếp theo

| Web đang có | Android hiện tại / quyết định |
| --- | --- |
| localStorage/token + Vite env | SecureStore, EXPO_PUBLIC_API_URL; không copy mật khẩu autofill |
| BrowserRouter | Expo Router native/protected screens |
| input file / DOM modal | Native image picker, FormData URI, RN Modal |
| navigator.clipboard | Expo Clipboard cho link VIP |
| window/document visibility | AppState và cleanup Socket.IO |
| PayOS redirect / VietQR | Mobile payment chưa làm, không suy ra đã thanh toán từ redirect |
| WebRTC/live session | Chưa làm trên Android; cần signaling/media/native camera-mic và test thiết bị thật |
| `/r/:shortCode`, attribution cookie | Chưa tích hợp Android App Links/attribution; copy link trả bởi backend, không sửa URL hay token |
| Notification panel / sockets | Chưa có notification center/push mobile; unread chat vẫn đọc từ backend |
| Charts, Excel export/import, KYC, returns, samples, wallets | Tiếp tục màn web hiện tại; cần bổ sung native theo backlog nếu yêu cầu nghiệm thu bao gồm |

Không có thay đổi Prisma schema hoặc dữ liệu nhóm trong phần mobile. API bootstrap mới tương thích bổ sung; backend web tiếp tục sử dụng route cũ. Những trạng thái lỗi từ eligibility, semantic duplicate, cấu hình GHN hoặc thiếu dữ liệu tài khoản được hiển thị nguyên nhân từ server, không tạo dữ liệu demo để che lỗi.
