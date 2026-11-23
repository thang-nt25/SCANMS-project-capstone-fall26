# KIỂM TOÁN HIỆU NĂNG API, REDIS CACHE & CHỐNG RELOAD KHI CHUYỂN TAB (SCANMS)

- **Mục tiêu:** Đảm bảo hệ thống chạy **mượt mà ngay cả trên mạng Wi-Fi trường học chập chờn**, giảm tối đa thời gian chờ Supabase ở xa, và **chuyển qua lại giữa các tab/trang đã tải trước đó là hiển thị tức thì (0ms reload)**.
- **Trạng thái:** **CHỈ ĐO ĐẠC, PHÂN TÍCH & LẬP PLAN — CHƯA CHỈNH SỬA CODE.**

---

## PHẦN A: KẾT QUẢ ĐO TỐC ĐỘ API THỰC TẾ (COLD vs WARM)

> Đo trực tiếp trên `http://localhost:3000/api` (kết nối Supabase Singapore + Redis `127.0.0.1:6379`). Lưu ý: trên mạng Wi-Fi trường không ổn định, mỗi lần gọi xuyên mạng tới Supabase không qua Redis cache sẽ chậm gấp **3–5 lần** con số bên dưới (tức `200ms` có thể thành `800ms–1.500ms`).

### 1. Nhóm API ĐÃ CÓ Redis Cache tốt (Mượt — `< 50ms` khi Warm)
| API Endpoint | Cold (Lần 1) | Warm (Lần 2) | Đánh giá |
| :--- | :---: | :---: | :--- |
| `GET /api/public/products?limit=48` | `193ms` | **`5ms`** | Xuất sắc (Redis hit) |
| `GET /api/affiliate-deals/shop` | `211ms` | **`3ms`** | Xuất sắc (Redis hit) |
| `GET /api/sample-requests/shop` | `171ms` | **`8ms`** | Xuất sắc (Redis hit) |
| `GET /api/notifications/unread-count` | `48ms` | **`12ms`** | Tốt |
| `GET /api/stores/my-store` | `150ms` | **`17ms`** | Tốt (vừa thêm cache) |
| `GET /api/dashboard/shop` | **`551ms`** | `40ms` | Cold hơi nặng (nên giữ TTL dài hơn + warm) |
| `GET /api/orders/my-store` | `285ms` | `46ms` | Tốt (nhưng FE hay bỏ qua bằng `x-skip-cache`) |

### 2. Nhóm API BÁO ĐỘNG — KHÔNG CÓ REDIS CACHE (Warm vẫn chậm `70ms – 402ms`)
| Mức độ | API Endpoint | Cold | Warm | Nguyên nhân chậm |
| :--- | :--- | :---: | :---: | :--- |
| 🔴 **RẤT CHẬM** | `GET /api/admin/payouts` | **`518ms`** | **`402ms`** | Chạy tuần tự `payoutRequest` → `financialLedger` → `monthlySummaries`, không có Redis cache |
| 🔴 **CHẬM** | `GET /api/customer/orders` | **`339ms`** | **`246ms`** | Tải kèm items/returns/shipping mỗi lần mở trang, không có Redis cache |
| 🔴 **CHẬM** | `GET /api/chat/conversations` | **`372ms`** | **`209ms`** | Join nhiều bảng user/store/lastMessage, không có Redis cache |
| 🟠 **TRUNG BÌNH** | `GET /api/dashboard/collaborator/top-products` | `251ms` | `228ms` | Tính tổng hợp trực tiếp từ DB mỗi lần gọi |
| 🟠 **TRUNG BÌNH** | `GET /api/collaborator/referral-links/products` | `236ms` | `226ms` | Không có Redis cache |
| 🟠 **TRUNG BÌNH** | `GET /api/collaborator/referral-links` | `212ms` | `209ms` | Không có Redis cache + FE ép `x-skip-cache` |
| 🟠 **TRUNG BÌNH** | `GET /api/collaborator/coupons` | `231ms` | `206ms` | Query kèm doanh số & hoa hồng mỗi lần gọi, không cache |
| 🟠 **TRUNG BÌNH** | `GET /api/affiliate-deals/mine` | `209ms` | `174ms` | Không có Redis cache + FE ép `x-skip-cache` |
| 🟠 **TRUNG BÌNH** | `GET /api/stores/:storeId/coupons` | `172ms` | `173ms` | Không có Redis cache |
| 🟠 **TRUNG BÌNH** | `GET /api/products?storeId=...` | `141ms` | `141ms` | Không có Redis cache (`public` có cache nhưng `merchant` chưa có) |
| 🟠 **TRUNG BÌNH** | `GET /api/sample-requests/admin` | `176ms` | `133ms` | Đã có cache cho `shop` nhưng `admin` chưa cache |
| 🟡 **NHẸ** | `GET /api/kyc/admin/pending` | `114ms` | `108ms` | Không có Redis cache |
| 🟡 **NHẸ** | `GET /api/customer/cart` | `115ms` | `107ms` | Không có Redis cache |
| 🟡 **NHẸ** | `GET /api/admin/referral-links` | `96ms` | `89ms` | Không có Redis cache |
| 🟡 **NHẸ** | `GET /api/admin/coupons` | `117ms` | `70ms` | Không có Redis cache |

---

## PHẦN B: 3 LỖ HỔNG BÁO ĐỘNG GÂY RELOAD KHI CHUYỂN TAB & KHỰNG MẠNG

### 🚨 Lỗ hổng 1: Chuyển qua lại giữa 2 tab đã load bị mất trắng state & tải lại từ đầu
- **Hiện trạng:** `queryClient` (`frontend/src/config/query-client.config.ts`) đã cấu hình rất chuẩn (`staleTime: 3 phút`, `gcTime: 30 phút`, `refetchOnWindowFocus: false`), **NHƯNG phần lớn các trang Hub & Workspace lại KHÔNG dùng `useQuery` mà dùng `useEffect + useState`**.
- **Hệ quả:**
  - Trên `AdminAnalyticsHubPage.tsx` (dòng 65): Dùng `{activeTab === 'realtime' ? ... : activeTab === 'finance' ? ... : ...}` nên cứ bấm qua lại giữa **Tổng quan / Tài chính / Bảng vinh danh** là component cũ bị **unmount** (mất sạch dữ liệu trong RAM) → quay lại là hiện spinner tải lại từ đầu!
  - Trên `ShopKolHubPage.tsx` (dòng 2246, 2462, 2729): Các tab `samples`, `performance`, `profile` bị unmount khi đổi tab.
  - Trên `ShopPromotionsHubPage.tsx` & `MarketingToolkitPage.tsx`: Các tab con tự fetch trong `useEffect`, nên chuyển tab hoặc chuyển mục Sidebar qua lại là gọi lại API!

### 🚨 Lỗ hổng 2: Lạm dụng `headers: { 'x-skip-cache': '1' / 'true' }` vô hiệu hóa cả Client Cache lẫn Redis Cache
- **Hiện trạng:** Nhiều hàm GET đọc danh sách (không phải nút "Làm mới" thủ công) lại gắn cứng `x-skip-cache`, phá hỏng lớp cache của `api.ts` và Redis:
  - `referralLinksService.getMyReferralLinks()` (`/collaborator/referral-links`)
  - `referralLinksService.getMyDeals()` (`/affiliate-deals/mine`)
  - `referralLinksService.getShopDeals()` (`/affiliate-deals/shop`)
  - `DealProductPicker.tsx` (`/products`)
  - `ShopPartnerDataTabs.tsx` (`/store-collaborators/shop`)
  - `StoreCooperationPanel.tsx`, `PartnerRemunerationSummary.tsx`, `ReviewManagementPanel.tsx`, `ProductSearchBox.tsx`.

### 🚨 Lỗ hổng 3: Một số endpoint trả `400` / `404` ngầm hoặc có đường dẫn không tối ưu
- `GET /api/affiliate-deals/:id` trong `ShopCollaborationPage` từng bắn 404 khi ID deal không tồn tại.
- `GET /api/affiliate-deals/collaborator-products` trả `400` nếu thiếu `storeId` bắt buộc.

---

## PHẦN C: PLAN TỐI ƯU CHI TIẾT (3 PHASES — MƯỢT TRÊN MẠNG CHẬP CHỜN)

### PHASE 1: Bổ sung Redis Cache (TTL 30s–120s + Invalidate khi Mutation) cho các API Chậm (Backend)
- **Mục tiêu:** Đưa toàn bộ API đang `100ms–518ms` xuống **`< 15ms` khi Warm**, giảm 80% số lần chọc thẳng ra Supabase khi mạng trường yếu.
- **Danh sách triển khai:**
  1. **`admin-payouts.controller.ts` (`518ms → <15ms`):** Cache `admin:payouts:list:${queryHash}` (TTL `30s`) + chạy `Promise.all` các query con; xóa prefix `admin:payouts:` khi duyệt/từ chối/hoàn tiền payout.
  2. **`customer.service.ts` (`339ms → <15ms`):** Cache `customer:orders:${userId}:${page}` (TTL `30s`); xóa prefix khi đặt hàng/hủy đơn/tạo đổi trả.
  3. **`chat.service.ts` (`372ms → <15ms`):** Cache `chat:conversations:${userId}` (TTL `20s`); xóa khi gửi tin nhắn mới (Socket.IO vẫn đẩy realtime trực tiếp).
  4. **`coupons.service.ts` (`173ms–231ms → <15ms`):** Cache `coupons:kol:${collaboratorId}`, `coupons:store:${storeId}`, `coupons:admin:${queryHash}` (TTL `45s`); xóa prefix khi đề xuất/duyệt/sửa/dùng mã.
  5. **`referral-links.service.ts` & `affiliate-deals.service.ts` (`209ms–236ms → <15ms`):** Cache `/collaborator/referral-links`, `/collaborator/referral-links/products`, `/affiliate-deals/mine` (TTL `45s`); xóa prefix khi tạo link/tạo deal/duyệt deal.
  6. **`samples.service.ts` & `kyc.service.ts` & `products.service.ts` (`114ms–176ms → <15ms`):** Cache `samples:admin:${queryHash}`, `kyc:admin:pending`, `products:store:${storeId}:${queryHash}` (TTL `30s–60s`), xóa prefix khi có mutation tương ứng.
  7. **`dashboard.service.ts` (`551ms cold → <150ms cold`):** Chạy song song toàn bộ sub-queries trong `getShopDashboard()` bằng `Promise.all` thay vì nối tiếp.

### PHASE 2: Chống Reload Khi Chuyển Tab & Chuyển Trang Sidebar (Frontend — 0ms Tab Switch)
- **Mục tiêu:** Bấm qua lại giữa 2 tab đã mở trước đó **hiển thị tức thì từ RAM, không hiện spinner, không gọi lại API**.
- **Công việc cụ thể:**
  1. **Giữ mount các tab bằng CSS `hidden` / `display: none` (lazy-mount lần đầu + giữ sống khi đã mở):**
     - Sửa `AdminAnalyticsHubPage.tsx`, `ShopPromotionsHubPage.tsx`, `MarketingToolkitPage.tsx`, `ShopKolHubPage.tsx` bằng helper `visitedTabs` (`Set<string>`): chỉ render tab khi người dùng bấm vào lần đầu, sau đó **giữ nguyên trong DOM với `hidden` khi chuyển sang tab khác** → quay lại tab cũ là **0ms, giữ nguyên cả vị trí cuộn & bộ lọc**.
  2. **Chuẩn hóa Client Cache trong `api.ts` & Gỡ `x-skip-cache` thừa:**
     - Gỡ `x-skip-cache` khỏi các lệnh tải danh sách mặc định (`referralLinksService.getMyReferralLinks`, `getMyDeals`, `getShopExclusiveDeals`, `DealProductPicker`, `ShopPartnerDataTabs`, `StoreCooperationPanel`, `ReviewManagementPanel`, `ProductSearchBox`). Chỉ giữ `x-skip-cache` khi người dùng bấm nút **"Làm mới"** thủ công hoặc ngay sau khi mutate.
     - Bảo đảm `api.ts` giữ **In-flight Deduplication + TTL Cache (30s–60s)** và **tự xóa cache tương ứng khi có `POST / PUT / PATCH / DELETE`** để không bao giờ bị dữ liệu cũ sau khi thao tác!

### PHASE 3: Kiểm thử Đo Lại & Giả lập Mạng Yếu (Verification)
- Chạy lại script benchmark Cold vs Warm trên toàn bộ 25+ endpoint, xác nhận nhóm API chính đều đạt **`< 20ms` Warm** (giảm `> 85%` latency).
- Test trực tiếp trên trình duyệt (`http://localhost:5173`) với Network Throttling (**Slow 3G / Fast 3G**): chuyển qua lại giữa các tab trong Admin Analytics, Shop Promotions, KOL Marketing Toolkit, Shop KOL Hub để xác nhận **0 request thừa và 0 spinner reload** khi quay lại tab đã mở.
