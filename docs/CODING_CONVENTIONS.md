# 📘 BỘ QUY CHUẨN MÃ NGUỒN VÀ LẬP TRÌNH CHUẨN (SCANMS CODING CONVENTIONS & DEVELOPMENT GUIDELINES)

> **Mã số Đề tài:** FA26SE032  
> **Dự án:** Sales Collaborator and Affiliate Network Management System (SCANMS)  
> **Áp dụng cho:** Toàn bộ 5 thành viên trong nhóm phát triển (Nguyễn Thành Thắng, Nguyễn Đình Tuấn, Nguyễn Phú Quý, Phan Xuân Thịnh, Trần Văn Nhật).  
> **Phạm vi:** Backend (NestJS), Frontend (Next.js/React), CSDL (PostgreSQL/Prisma), Redis (Cache & Event Stream), Mobile App và Quy trình Git Workflow.

---

## 1. 🎯 MỤC ĐÍCH & NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Thống nhất 100% (Consistency):** Mọi thành viên viết code theo một phong cách duy nhất. Code đọc như do một người viết.
2. **KISS (Keep It Simple, Stupid):** Ưu tiên tính rõ ràng, mạch lạc và dễ bảo trì hơn là viết code quá phức tạp hoặc lạm dụng thủ thuật.
3. **DRY (Don't Repeat Yourself):** Đóng gói helper, utility và custom hooks dùng chung vào thư mục `common/` hoặc `shared/`. Không lặp lại logic nghiệp vụ.
4. **Clean Code & Type Safety:** Bắt buộc sử dụng TypeScript ngặt nghèo (`noImplicitAny: true`). Nghiêm cấm dùng kiểu `any` tùy tiện (dùng `unknown` hoặc định nghĩa Interface rõ ràng).
5. **Security & Performance First:** Validate tất cả input dữ liệu ở DTO, áp dụng Index CSDL cho khóa ngoại, sử dụng Pessimistic Locking cho giao dịch tài chính và bật TTL cho Cache.

---

## 2. 🏗️ QUY CHUẨN BACKEND (NEJS / TYPESCRIPT)

### 2.1 Cấu trúc Thư mục & Đặt tên File
Tất cả các file và thư mục Backend phải sử dụng định dạng **`kebab-case`** kèm suffix loại file.

| Loại File / Component | Quy chuẩn Đặt tên File | Ví dụ |
| :--- | :--- | :--- |
| **Thư mục Module** | `kebab-case` | `src/modules/collaborator-profiles/` |
| **Module File** | `<name>.module.ts` | `auth.module.ts`, `billing.module.ts` |
| **Controller File** | `<name>.controller.ts` | `auth.controller.ts`, `payout.controller.ts` |
| **Service File** | `<name>.service.ts` | `billing.service.ts`, `tracking.service.ts` |
| **DTO (Data Transfer Object)** | `<action>-<entity>.dto.ts` | `create-user.dto.ts`, `withdraw-wallet.dto.ts` |
| **Entity / Model File** | `<name>.entity.ts` | `user.entity.ts`, `referral-link.entity.ts` |
| **Guard / Strategy File** | `<name>.guard.ts`, `<name>.strategy.ts` | `jwt-auth.guard.ts`, `jwt.strategy.ts`, `roles.guard.ts` |
| **Interceptor / Filter File** | `<name>.interceptor.ts`, `<name>.filter.ts` | `transform.interceptor.ts`, `http-exception.filter.ts` |

---

### 2.2 Quy chuẩn Code TypeScript Backend

#### A. Class Name -> **`PascalCase`**
Tên Class phải là danh từ, kết hợp Suffix rõ ràng:
```typescript
// ❌ KHÔNG NÊN:
class authService {}
class user_controller {}

// ✅ CHUẨN KỸ THUẬT:
export class AuthController {}
export class BillingService {}
export class CreatePayoutRequestDto {}
export class RolesGuard implements CanActivate {}
```

#### B. Method / Function Name -> **`camelCase`**
Tên hàm phải bắt đầu bằng **Động từ + Danh từ** mô tả rõ hành động:
```typescript
// ❌ KHÔNG NÊN:
calculate_commission()
GetBalance()
data()

// ✅ CHUẨN KỸ THUẬT:
async calculateItemCommission(orderItem: OrderItemDto): Promise<number> {}
async getAvailableBalance(collaboratorId: string): Promise<number> {}
async processWithdrawalWithLock(collabId: string, amount: number): Promise<PayoutRequest> {}
```

#### C. Variable Name -> **`camelCase`**
```typescript
// ❌ KHÔNG NÊN:
const d = new Date();
const total_amt = 100;

// ✅ CHUẨN KỸ THUẬT:
const attributionWindowDays = 30;
const totalCommissionAmount = 150000.00;
const currentCollaborator = await this.usersService.findById(id);
```

#### D. Constant Name -> **`UPPER_SNAKE_CASE`**
```typescript
// ✅ CHUẨN KỸ THUẬT:
export const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;
export const MIN_PAYOUT_AMOUNT_VND = 200000.00;
export const MAX_IP_CLICK_RATE_PER_SECOND = 10;
```

---

### 2.3 Quy chuẩn DTO & Validation (`class-validator`)
Tất cả DTO nhận input từ Client **bắt buộc** phải được validate bằng decorators:

```typescript
import { IsNotEmpty, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayoutRequestDto {
  @ApiProperty({
    example: 500000,
    description: 'Số tiền yêu cầu rút (VNĐ), tối thiểu 200,000 VNĐ',
  })
  @IsNotEmpty({ message: 'Số tiền rút không được để trống.' })
  @IsNumber({}, { message: 'Số tiền rút phải là kiểu số.' })
  @Min(200000, { message: 'Số tiền rút tối thiểu là 200,000 VNĐ.' })
  amount: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID người dùng cộng tác viên',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Collaborator ID phải đúng định dạng UUID v4.' })
  collaboratorId: string;
}
```

---

## 3. 🗄️ QUY CHUẨN CƠ SỞ DỮ LIỆU (POSTGRESQL & PRISMA ORM)

### 3.1 Tên Bảng (Table Names) -> **`snake_case` (Số nhiều)**
Tất cả các bảng trong CSDL PostgreSQL phải viết chữ thường, nối bằng dấu gạch dưới `_` và ở dạng **Số nhiều**.

**Danh sách 21 Bảng Master SCANMS:**
```sql
users                         stores
collaborator_tiers            collaborator_profiles
collaborator_social_channels  products
media_assets                  commission_rules
campaigns                     sample_product_requests
referral_links                click_traffic_logs
orders                        order_items
commissions                   wallets
financial_ledgers             payout_requests
conversations                 chat_messages
audit_logs
```

---

### 3.2 Tên Cột (Column Names) & Soft Delete
- **Primary Key (Khóa chính):** Luôn đặt tên là `id` (Kiểu dữ liệu UUID v4).
- **Foreign Key (Khóa ngoại):** Định dạng `{tên_bảng_số_ít}_id` (VD: `store_id`, `collaborator_id`).
- **Trường Boolean:** Bắt đầu bằng `is_` hoặc `has_` (VD: `is_active`, `is_deleted`).
- **Trường Thời gian:** Kết thúc bằng `_at` (VD: `created_at`, `updated_at`, `deleted_at`, `approved_at`).
- **Quy chuẩn Soft Delete:** Bắt buộc các bảng chính phải có `is_deleted` (Boolean, default `false`) và `deleted_at` (TIMESTAMPTZ, default `null`).

---

### 3.3 Ánh xạ Prisma Schema
Tên Model trong Prisma dùng `PascalCase` số ít, kết hợp `@@map` để khớp tên bảng `snake_case` trong PostgreSQL:

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         UserRole
  isDeleted    Boolean  @default(false) @map("is_deleted")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

---

### 3.4 Quy chuẩn Indexing & Locking (Tối ưu CSDL từ Supabase/Postgres Best Practices)
1. **Indexing Foreign Keys (Bắt buộc):** Mọi cột Khóa ngoại (FK) bắt buộc phải tạo Index để tránh Full Table Scan khi thực hiện truy vấn JOIN:
   ```sql
   CREATE INDEX idx_orders_store_id ON orders(store_id);
   CREATE INDEX idx_commissions_collaborator_id ON commissions(collaborator_id);
   ```
2. **Pessimistic Locking (`SELECT FOR UPDATE`):** Với các thao tác liên quan đến biến động số dư Ví (`wallets`) và Duyệt rút tiền (`payout_requests`), **bắt buộc** dùng Lock cấp hàng để chống Race Condition / Double Spending:
   ```typescript
   // Trong Prisma Raw SQL Transaction:
   await tx.$queryRaw`SELECT * FROM wallets WHERE collaborator_id = ${collabId}::uuid FOR UPDATE`;
   ```

---

## 4. ⚡ QUY CHUẨN REDIS CACHING & EVENT BUFFER

Để hệ thống xử lý hàng ngàn lượt click tiếp thị và phân luồng dữ liệu thời gian thực không làm quá tải PostgreSQL:

### 4.1 Redis Key Naming Convention
Cấu trúc Key Redis chuẩn: `scanms:<module>:<entity>:<id/key>`

| Mục đích Cache / Buffer | Quy chuẩn Key Redis | TTL Mặc định |
| :--- | :--- | :--- |
| **Session / User Auth** | `scanms:auth:session:<user_id>` | 7 ngày |
| **Click Traffic Buffer** | `scanms:attribution:click:<click_uuid>` | 24 giờ |
| **Short Code Resolution** | `scanms:referral:shortcode:<short_code>` | 1 giờ |
| **Collaborator Balance Cache** | `scanms:wallet:balance:<collab_id>` | 15 phút |
| **Redis Cluster Hash Tag** | `scanms:{store_<store_id>}:click:<click_id>` | 24 giờ |

> **Lưu ý:** 
> - **TTL bắt buộc:** Tất cả key Cache/Buffer phải thiết lập TTL (Expire time) để bảo vệ bộ nhớ RAM.
> - **Avoid Dangerous Commands:** Nghiêm cấm chạy `KEYS *` hoặc `HGETALL` trên môi trường Production. Phải sử dụng `SCAN` hoặc `HSCAN`.

---

## 5. 🎨 QUY CHUẨN FRONTEND (NEXT.JS / REACT)

### 5.1 Cấu trúc Thư mục & Đặt tên File Frontend
| Loại Component / File | Quy chuẩn Đặt tên | Ví dụ |
| :--- | :--- | :--- |
| **React Component File** | `PascalCase.tsx` | `Button.tsx`, `Sidebar.tsx`, `WalletCard.tsx` |
| **Custom React Hooks** | `useCamelCase.ts` | `useAuth.ts`, `useSocketChat.ts` |
| **Next.js App Router Page** | `page.tsx`, `layout.tsx` | `src/app/(dashboard)/payout-requests/page.tsx` |
| **Utility / Helper File** | `camelCase.ts` | `formatCurrency.ts`, `apiClient.ts` |
| **Type / Interface File** | `camelCase.types.ts` hoặc `<name>.ts` | `user.types.ts`, `order.ts` |

---

### 5.2 Quy chuẩn Next.js App Router & Performance (Tối ưu theo Vercel Best Practices)

1. **Ranh giới Server & Client Components (`'use client'` Boundary):**
   - Mặc định mọi component trong App Router là **Server Component** (`RSC`).
   - Chỉ thêm directive `'use client'` ở mức nguyên tử nhỏ nhất (ví dụ: các nút bấm có sự kiện `onClick`, Form inputs, Modal điều khiển state client). Không đặt `'use client'` ở top-level `page.tsx`.

2. **Tối ưu Hóa Hình ảnh & Font:**
   - Bắt buộc dùng `next/image` thay cho thẻ `<img>` tiêu chuẩn để tự động nén WebP/AVIF và Lazy load.
   - Bắt buộc dùng `next/font` (Google Font: Inter/Outfit) để chống biến động bố cục (CLS - Cumulative Layout Shift).

3. **Form Validation & State Management:**
   - Sử dụng `React Hook Form` kết hợp `Zod` schema validation cho các Form phức tạp (Đăng ký KYC, Yêu cầu rút tiền).
   - Quản lý State toàn cục bằng `Zustand` (với dữ liệu UI đơn giản) hoặc `TanStack Query` (React Query - cho dữ liệu server fetching & auto-refetch).

```tsx
// ✅ CHUẨN KỸ THUẬT COMPONENT:
interface WalletCardProps {
  availableBalance: number;
  pendingBalance: number;
  onWithdraw: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  availableBalance,
  pendingBalance,
  onWithdraw,
}) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100">
      <h3 className="text-sm font-medium text-gray-500">Số dư khả dụng</h3>
      <p className="text-2xl font-bold text-green-600">{formatVND(availableBalance)}</p>
      <button 
        onClick={onWithdraw}
        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
      >
        Yêu cầu Rút tiền
      </button>
    </div>
  );
};
```

---

## 6. 🌐 QUY CHUẨN RESTFUL API ENDPOINTS & ENVELOPE

### 6.1 Quy tắc URL Endpoint
- Tiền tố phiên bản: `/api/v1/`
- Danh từ số nhiều, sử dụng `kebab-case`.

| HTTP Verb | API Endpoint URL | Mô tả Nghiệp vụ | Status Code |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/login` | Đăng nhập & Cấp JWT Token | `200 OK` |
| **GET** | `/api/v1/referral-links` | Lấy danh sách Link tiếp thị của CTV | `200 OK` |
| **POST** | `/api/v1/referral-links` | Sinh Short Code & QR Code | `201 Created` |
| **POST** | `/api/v1/orders/webhook` | Nhận đơn hàng & tính hoa hồng | `200 OK` |
| **GET** | `/api/v1/wallets/me` | Lấy số dư Ví cộng tác viên | `200 OK` |
| **POST** | `/api/v1/payout-requests` | Khởi tạo lệnh rút tiền (với Lock) | `201 Created` |
| **PATCH** | `/api/v1/payout-requests/:id/approve` | Merchant duyệt rút tiền | `200 OK` |

---

### 6.2 Định dạng Standard Response Envelope
Tất cả API (trừ Stream / File Download) **bắt buộc** bọc qua Interceptor để trả về cấu trúc JSON chuẩn:

**Thành công (`TransformInterceptor`):**
```json
{
  "statusCode": 200,
  "message": "Duyệt yêu cầu rút tiền thành công.",
  "data": {
    "requestId": "payout-uuid-123",
    "amount": 500000,
    "status": "APPROVED",
    "processedAt": "2026-07-24T00:12:00.000Z"
  },
  "timestamp": "2026-07-24T00:12:00.000Z"
}
```

**Thất bại (`HttpExceptionFilter`):**
```json
{
  "statusCode": 400,
  "message": "Số dư khả dụng không đủ để thực hiện rút tiền.",
  "error": "Bad Request",
  "timestamp": "2026-07-24T00:12:00.000Z"
}
```

---

## 7. 🔀 QUY CHUẨN GIT COMMIT & BRANCHING (GIT WORKFLOW)

### 7.1 Quy tắc Phân nhánh Git (Branching Strategy)
- **`main`**: Mã nguồn Production ổn định. Chỉ merge thông qua Pull Request có review.
- **`develop`**: Nhánh tích hợp chính của cả 5 thành viên.
- **Nhánh Feature:** `feature/<tên-tính-năng>` (VD: `feature/iam-kyc-verification`, `feature/redis-click-buffer`)
- **Nhánh Bugfix:** `bugfix/<tên-lỗi>` (VD: `bugfix/fix-wallet-pessimistic-lock`)
- **Nhánh Refactor:** `refactor/<tên-module>` (VD: `refactor/jwt-guard-rbac`)

---

### 7.2 Quy tắc Message Commit (Conventional Commits)
Cấu trúc Commit: `<type>(<scope>): <tóm tắt ngắn gọn thay đổi bằng Tiếng Việt hoặc Tiếng Anh>`

- **`feat`**: Tính năng mới (VD: `feat(auth): bổ sung API đăng ký và mã hóa mật khẩu bcrypt`)
- **`fix`**: Sửa lỗi bug (VD: `fix(wallet): áp dụng khóa FOR UPDATE chống race condition khi rút tiền`)
- **`docs`**: Cập nhật tài liệu (VD: `docs(convention): hợp nhất tài liệu quy chuẩn lập trình SCANMS`)
- **`refactor`**: Cấu trúc lại code nhưng không thay đổi tính năng
- **`style`**: Định dạng code, sửa ESLint/Prettier
- **`test`**: Thêm hoặc sửa Unit/Integration Test cases
- **`chore`**: Cài thêm package, sửa build script, cấu hình môi trường

---

## 8. 📋 BẢNG TÓM TẮT CHEAT SHEET QUY CHUẨN SCANMS

| Hạng mục | Quy tắc Syntax | Ví dụ minh họa |
| :--- | :--- | :--- |
| **Backend Folders / Files** | `kebab-case` | `collaborator-profiles.service.ts` |
| **Frontend Components** | `PascalCase.tsx` | `WithdrawalFormModal.tsx` |
| **Frontend Custom Hooks** | `camelCase.ts` (`use...`) | `useWalletBalance.ts` |
| **Database Tables** | `snake_case` (Số nhiều) | `collaborator_profiles`, `payout_requests` |
| **Database Columns** | `snake_case` (Số ít) | `user_id`, `available_balance`, `is_deleted` |
| **Database Enums** | `UPPER_SNAKE_CASE` | `SHOP_MANAGER`, `COMMISSION_APPROVED` |
| **Redis Keys** | `scanms:<module>:<entity>:<id>` | `scanms:attribution:click:uuid-123` |
| **NestJS Service Methods** | `camelCase` (Động từ + DT) | `calculateItemCommission()` |
| **NestJS DTO Classes** | `PascalCase` + `Dto` | `CreatePayoutRequestDto` |
| **RESTful API Endpoints** | `kebab-case` (Danh từ số nhiều) | `POST /api/v1/payout-requests/:id/approve` |
| **Git Commit Message** | Conventional Commits | `feat(billing): add per-item commission logic` |

---

> *Tài liệu này là quy chuẩn bắt buộc tuân thủ đối với toàn bộ 5 thành viên nhóm Đồ án FA26SE032 (SCANMS).*
