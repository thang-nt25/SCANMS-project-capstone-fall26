# BÁO CÁO PHÂN TÍCH & ĐÁNH GIÁ TOÀN DIỆN: LUỒNG TẠO/SỬA CỬA HÀNG (STORE) & SẢN PHẨM (PRODUCT)

> **Ngày lập báo cáo:** 12/11/2026  
> **Nhánh kiểm tra:** `thang` (`f185724`, `98ce59b`, `409891d`)  
> **Trạng thái thực thi:** **CHỈ PHÂN TÍCH & GHI TÀI LIỆU — CHƯA CHỈNH SỬA CODE (`frontend/` & `backend/`)**

---

## MỤC LỤC
1. [Giải phẫu chuyên sâu: `basePrice` vs `floorPrice` vs `price` vs `originalPrice` vs `listPrice`](#1-giải-phẫu-chuyên-sâu-baseprice-vs-floorprice-vs-price-vs-originalprice-vs-listprice)
2. [Phân tích xóa hoàn toàn `barcode` (Mã vạch EAN-13) trên toàn hệ thống](#2-phân-tích-xóa-hoàn-toàn-barcode-mã-vạch-ean-13-trên-toàn-hệ-thống)
3. [Kiểm toán toàn bộ các trường trong Form Tạo Sản Phẩm: Cái nào phục vụ tính năng thật vs Cái nào dư thừa](#3-kiểm-toán-toàn-bộ-các-trường-trong-form-tạo-sản-phẩm-cái-nào-phục-vụ-tính-năng-thật-vs-cái-nào-dư-thừa)
4. [Kiểm toán Form Tạo & Sửa Cửa Hàng Nội Bộ (`Store`) và Gán `SHOP_MANAGER`](#4-kiểm-toán-form-tạo--sửa-cửa-hàng-nội-bộ-store-và-gán-shop_manager)
5. [Danh sách 9 Lỗi Blocker Ngầm & Lỗi Nuốt Cảnh Báo UX Khi Tạo/Sửa](#5-danh-sách-9-lỗi-blocker-ngầm--lỗi-nuốt-cảnh-báo-ux-khi-tạosửa)
6. [Kế hoạch hành động đề xuất (Checklist khi bắt đầu code)](#6-kế-hoạch-hành-động-đề-xuất-checklist-khi-bắt-đầu-code)

---

## 1. GIẢI PHẪU CHUYÊN SÂU: `basePrice` vs `floorPrice` vs `price` vs `originalPrice` vs `listPrice`

### 1.1. Câu trả lời trực tiếp cho câu hỏi: *"Cái `basePrice` là gì, có còn cần thiết nữa không?"*
Đúng như bạn nhớ:
- Trước Review 2, hệ thống từng có khái niệm giá gốc / giá cơ sở (`basePrice` / `originalPrice`) để tính % giảm giá cho **cơ chế gom đợt khuyến mãi đại trà cũ** (nay đã **bãi bỏ 100%** theo quy tắc bất biến sau Review 2).
- Sau Review 2, theo chuẩn nghiệp vụ SCANMS (**WF-02: Quản trị Sản phẩm Biến thể 2 Cấp & Bảo vệ Giá sàn `floorPrice`**), mỗi sản phẩm / biến thể **CHỈ CẦN ĐÚNG 2 MỨC GIÁ DUY NHẤT**:
  1. **Giá sàn thấp nhất (`floorPrice`):** Mức giá bảo vệ biên lợi nhuận tối thiểu của nhãn hàng. Dùng để:
     - Chặn `SHOP_MANAGER` hạ giá bán thấp hơn giá sàn (trừ khi gửi yêu cầu ngoại lệ lên `SYSTEM_ADMIN` trong `pricing.service.ts`).
     - Chặn `Exclusive Deal` / `Voucher Deal Độc Quyền KOL` giảm giá làm giá thực thu rớt xuống dưới `floorPrice` (`exclusive-deal-activation.ts` dòng 208, `coupons.service.ts` dòng 2719).
  2. **Giá bán niêm yết (`price` — đồng bộ tự động với `listPrice` ở Backend):** Giá bán thực tế hiển thị cho khách hàng.

### 1.2. Thực trạng hỗn loạn giữa 5 tên biến giá trong Code hiện tại

| Tên trường | Nơi xuất hiện | Bản chất hiện tại trong Code | Vấn đề / Lỗi nghiêm trọng đang xảy ra |
| :--- | :--- | :--- | :--- |
| **`basePrice`** | Chỉ có ở Frontend (`ProductManagementPage.tsx`, `product.service.ts`) — **KHÔNG TỒN TẠI trong Database Prisma!** | Trên giao diện Bảng Biến Thể (Bước 2, dòng 3541), cột này đang hiển thị nhãn là **`Giá sàn (₫) *`**, nhưng biến code bên dưới lại đặt tên là `variant.basePrice` và `formBasePrice`. | **3 lỗi chí mạng:**<br>1. **Gửi `basePrice` trong `variants[]` lên Backend bị chặn `400 Bad Request`:** `ProductVariantInputDto` (`sync-product-variants.dto.ts`) không khai báo `basePrice`, bị `ValidationPipe (forbidNonWhitelisted: true)` từ chối thẳng.<br>2. **Mất sạch Giá sàn khi bấm "Sửa sản phẩm":** Ở `openEditModal` (dòng 1688), code đọc `variant.basePrice ?? p.basePrice ?? Math.round(price * 0.6)`. Vì Backend trả về `floorPrice` chứ không có `basePrice`, mỗi lần mở modal Sửa là hệ thống tự bịa lại giá sàn = `60%` giá bán!<br>3. **Khi lưu Sửa sản phẩm (`handleSave` dòng 2215):** Code lại gán `originalPrice: Number(formBasePrice)` — tức lấy Giá sàn ghi đè vào Giá gạch ngang (`originalPrice`), còn `floorPrice` thật trong DB thì **không bao giờ được lưu**! |
| **`floorPrice`** | Database (`Product.floorPrice`, `ProductVariant.floorPrice`), Backend (`pricing.service.ts`, `coupons.service.ts`, `exclusive-deal-activation.ts`), Frontend (`ProposePromotionModal.tsx`, `ExclusiveDealsWorkspace.tsx`) | Đây mới là **Giá sàn bảo vệ biên lợi nhuận thật sự** trong Database (`schema.prisma` dòng 414 & 454) và được dùng ở toàn bộ các phân hệ Deal KOL, Voucher KOL và Quản trị Giá. | Trớ trêu là `CreateProductDto` (`create-product.dto.ts`), `ProductVariantInputDto` (`sync-product-variants.dto.ts`) và `products.service.ts` (`create`, `update`, `syncProductVariants`) **chưa hề nhận và lưu `floorPrice` từ form Tạo/Sửa sản phẩm!** Do đó mọi sản phẩm tạo mới đều có `floorPrice = null` trong DB! |
| **`price`** | Database (`Product.price`, `ProductVariant.price`), toàn bộ FE & BE | Giá bán thực tế của sản phẩm / biến thể (`> 0` và bắt buộc `>= floorPrice`). | Hoạt động đúng, cần giữ nguyên. |
| **`listPrice`** | Database (`Product.listPrice`, `ProductVariant.listPrice`), Backend (`products.service.ts`, `pricing.service.ts`) | Giá niêm yết chuẩn ở tầng Backend. Khi tạo/sửa sản phẩm, Backend tự động gán `listPrice = price` (`products.service.ts` dòng 1283, 1317). | Người dùng **không cần nhập** `listPrice` trên Form; Backend tự động đồng bộ `listPrice = price`. |
| **`originalPrice`** | Database (`Product.originalPrice`, `ProductVariant.originalPrice`), `ProductManagementPage.tsx` (`formOriginalPrice`, `variant.originalPrice`) | Tàn dư của cơ chế hiển thị "giá gốc gạch ngang ảo" hoặc giá trước khuyến mãi cũ. | Trên UI `ProductManagementPage.tsx` hiện đã ẩn ô nhập `originalPrice`, nhưng trong state (`formOriginalPrice`, `variant.originalPrice`) và payload gửi đi vẫn còn giữ và bị trộn lẫn với `basePrice`. |

### 1.3. Kết luận & Hướng xử lý chuẩn hóa Giá
1. **Xóa bỏ hoàn toàn biến `basePrice` và `formOriginalPrice` / `variant.originalPrice` trong `ProductManagementPage.tsx`.**
2. **Thống nhất 1 tên gọi duy nhất từ Giao diện $\rightarrow$ DTO $\rightarrow$ Database là `floorPrice` (Giá sàn) và `price` (Giá bán):**
   - Trên bảng Biến thể ở Bước 2: Chỉ có **Giá sàn (`floorPrice`)** và **Giá bán (`price`)**, với quy tắc rõ ràng: `0 < floorPrice <= price`.
   - Bổ sung `floorPrice` vào `CreateProductDto`, `UpdateProductDto` và `ProductVariantInputDto` ở Backend, đồng thời lưu trực tiếp vào `Product.floorPrice` và `ProductVariant.floorPrice` trong `products.service.ts`.
   - Nhờ vậy, khi qua phân hệ **Đàm phán Deal Độc Quyền KOL (`Exclusive Deal`)** hoặc **Đề xuất điều chỉnh giá (`ProposePromotionModal`)**, hệ thống có ngay `floorPrice` chuẩn xác mà Shop Manager đã thiết lập lúc tạo sản phẩm!

---

## 2. PHÂN TÍCH XÓA HOÀN TOÀN `barcode` (MÃ VẠCH EAN-13) TRÊN TOÀN HỆ THỐNG

### 2.1. Đánh giá tác động nghiệp vụ khi xóa `barcode`
- **Các luồng nghiệp vụ cốt lõi của SCANMS có dùng `barcode` không?**
  - **WF-01 (Store & KOL Onboarding):** Không dùng.
  - **WF-02 (Product Variant 2-Tier & Exclusive Deal):** Định danh biến thể bằng `ProductVariant.id` và `sku`. Không dùng `barcode`.
  - **WF-03 (Sample SLA 14 ngày, Smart Link, Dynamic QR, Voucher KOL & Order Attribution):** Định danh hoàn toàn bằng `productId`, `variantId`, `sku`, `referralCode`. Không dùng `barcode`.
  - **WF-04 (Giao vận GHN & Đổi trả 14 ngày):** GHN API chỉ dùng `sku`, `name`, `quantity`, `packageWeight`, `packageLength`, `packageWidth`, `packageHeight`. Ngay trong `backend/src/modules/shipping/shipping-package.ts` (dòng 39) cũng đã ghi chú: *"Legacy catalog barcodes must not block shipping"*.
  - **WF-05 (Quyết toán thù lao 2 giai đoạn & Rút tiền):** Không dùng `barcode`.
- **Tại sao `barcode` đang gây phiền toái và lỗi?**
  - Trên bảng biến thể Bước 2 (`ProductManagementPage.tsx`), người dùng phải nhìn thêm cột `"Mã vạch EAN-13"`.
  - Dù commit `f185724` đã nới lỏng ở Frontend, nhưng hàm `isStep2Complete` (dòng 779) vẫn kiểm tra `/^\d{8,14}$/`, và đặc biệt ở Backend (`backend/src/modules/products/product-package.ts` dòng 28), hàm `validateProductPackage()` **vẫn ép chuẩn thuật toán checksum EAN-13 (`isValidEan13`)** khiến bất kỳ ai lỡ gõ mã vạch nội bộ hoặc mã không đủ 13 số chuẩn quốc tế đều bị chặn `400 Bad Request`!
  - Ngoài ra `product-identity.policy.ts` còn khóa advisory lock và quét trùng `barcode` trong DB không cần thiết.

### 2.2. Bản đồ toàn bộ các vị trí cần gỡ bỏ `barcode`

| Tầng | File cần xử lý | Chi tiết thay đổi khi thực thi |
| :--- | :--- | :--- |
| **1. Frontend UI & State** | [ProductManagementPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ProductManagementPage.tsx) | - Xóa `barcode` khỏi `VariantDraft` interface (dòng 75), xóa state `formBarcode` (dòng 925, 1610, 1980).<br>- Xóa cột **"Mã vạch EAN-13"** trên bảng ma trận biến thể Bước 2 (dòng 3541, 3551, 3665–3680).<br>- Xóa kiểm tra regex `/^\d{8,14}$/` trong `isStep2Complete` (dòng 779) và kiểm tra trùng mã vạch trong `validateStep2` (dòng 831, 857–860).<br>- Xóa truyền `barcode` trong `normalizedVariants` và `productData` (dòng 2020, 2049). |
| **2. Frontend Detail & Service** | [ProductDetailPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/public/ProductDetailPage.tsx)<br>[product.service.ts](file:///c:/HW/CAPSTONE/frontend/src/services/product.service.ts)<br>[product-package.utils.ts](file:///c:/HW/CAPSTONE/frontend/src/utils/product-package.utils.ts) | - Ẩn/xóa dòng hiển thị Barcode trên trang chi tiết sản phẩm (`ProductDetailPage.tsx` dòng 2205–2212).<br>- Gỡ `barcode` khỏi `product-package.utils.ts` và `product.service.ts`. |
| **3. Backend Validation & Policy** | [product-package.ts](file:///c:/HW/CAPSTONE/backend/src/modules/products/product-package.ts)<br>[product-package.dto.ts](file:///c:/HW/CAPSTONE/backend/src/modules/products/dto/product-package.dto.ts)<br>[sync-product-variants.dto.ts](file:///c:/HW/CAPSTONE/backend/src/modules/products/dto/sync-product-variants.dto.ts)<br>[product-identity.policy.ts](file:///c:/HW/CAPSTONE/backend/src/modules/products/product-identity.policy.ts)<br>[products.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/products/products.service.ts) | - Xóa kiểm tra `isValidEan13(input.barcode)` trong `product-package.ts` (dòng 28).<br>- Trong `product-identity.policy.ts`, chỉ kiểm tra trùng `sku` theo `storeId`, bỏ kiểm tra `barcode`.<br>- Trong `products.service.ts`, ngừng yêu cầu/xử lý `barcode` khi tạo, sửa và đồng bộ biến thể. |
| **4. Database (`schema.prisma`)** | [schema.prisma](file:///c:/HW/CAPSTONE/backend/prisma/schema.prisma) | Trường `barcode String? @db.VarChar(13)` ở bảng `Product` (dòng 404) và `ProductVariant` (dòng 448) hiện đã là **nullable (`String?`)**. Có thể giữ nguyên cột nullable trong schema (luôn lưu `null`) để không phải chạy migration xóa cột gây ảnh hưởng dữ liệu seed cũ, hoặc xóa hẳn nếu muốn dọn DB. |

---

## 3. KIỂM TOÁN TOÀN BỘ CÁC TRƯỜNG TRONG FORM TẠO SẢN PHẨM: CÁI NÀO PHỤC VỤ TÍNH NĂNG THẬT VS CÁI NÀO DƯ THỪA

Để tránh việc xóa nhầm các trường đang nuôi tính năng phía sau (như tính phí ship GHN, AI Matching, Hàng mẫu 14 ngày, Kiểm duyệt sản phẩm của `SYSTEM_MANAGER`), bảng dưới đây phân loại **từng trường một** trong `ProductManagementPage.tsx`:

### 3.1. Nhóm 1 — CÁC TRƯỜNG BẮT BUỘC PHẢI GIỮ (Vì phục vụ tính năng cốt lõi phía sau)

| Bước | Tên trường trên Form | Biến trong Code / DB | Phục vụ tính năng nào trong hệ thống? |
| :--- | :--- | :--- | :--- |
| **Bước 1** | **Tên sản phẩm** | `name` | Hiển thị toàn hệ thống, tìm kiếm, tạo embedding вектор cho **AI Matching** (`semantic-embedding.service.ts`) và kiểm duyệt trùng lặp. |
| **Bước 1** | **Ngành hàng** (Tự động khóa theo Store) | `category` (`store.primaryCategory`) | Quy tắc bất biến **Category Lock**: Mỗi In-House Store chỉ được đăng sản phẩm thuộc đúng ngành hàng của Store đó (`products.service.ts` dòng 1255). |
| **Bước 1** | **Thương hiệu / Nhãn hiệu** | `brand` | Hiển thị trên trang sản phẩm, phục vụ bộ lọc và đối soát nguồn gốc thương hiệu khi `SYSTEM_MANAGER` duyệt sản phẩm. |
| **Bước 1** | **Ảnh sản phẩm** (Tối thiểu 3 ảnh) | `images[]`, `imageUrl` | Bắt buộc cho hiển thị Storefront, gửi qua Chat cho KOL, và được kiểm tra trực tiếp bởi `assertProductSubmissionComplete` (`products.service.ts` dòng 258: `images.length < 3` sẽ chặn gửi duyệt). |
| **Bước 1** | **Mô tả chi tiết sản phẩm** | `description` | Cung cấp thông tin cho khách hàng, KOL lấy ý tưởng review, và nuôi model **AI Matching** ghép đôi sản phẩm với KOL phù hợp. |
| **Bước 1** | **Tags / Từ khóa tiếp thị** | `tags[]` | Phục vụ tìm kiếm sản phẩm và thuật toán **AI Matching** khớp hồ sơ nội dung của KOL với sản phẩm. |
| **Bước 2** | **Nhóm phân loại Cấp 1 & Cấp 2 + Bảng Biến Thể (`SKU`, `Giá sàn floorPrice`, `Giá bán price`, `Tồn kho stock`)** | `variants[]` (`sku`, `floorPrice`, `price`, `stock`, `attributes`) | Cốt lõi của **WF-02**: Quản trị biến thể 2 cấp, kiểm soát tồn kho theo từng SKU, và bảo vệ **Giá sàn (`floorPrice`)** khi đàm phán Deal / Voucher KOL. |
| **Bước 2** | **Kích thước & Khối lượng đóng gói** (`Khối lượng (g)`, `Dài (cm)`, `Rộng (cm)`, `Cao (cm)`) | `packageWeight`, `packageLength`, `packageWidth`, `packageHeight` | **CỰC KỲ QUAN TRỌNG — PHỤC VỤ WF-04 (GIAO VẬN GHN):** Module `shipping-package.ts` và `shipping.service.ts` dùng 4 thông số này để gọi API GHN tính phí vận chuyển thực tế. Nếu thiếu 1 trong 4 số này, khách hàng sẽ không thể lấy báo giá ship GHN khi đặt hàng! |
| **Bước 2** | **3 trường Thông tin Minh bạch Bắt buộc:**<br>1. `Xuất xứ / Nguồn gốc`<br>2. `Thành phần / Chất liệu / Cấu tạo`<br>3. `Nhãn phụ & Hướng dẫn sử dụng` | `origin`<br>`ingredients` *(không bắt buộc với Đồ gia dụng)*<br>`labelInfo` | **CỰC KỲ QUAN TRỌNG — PHỤC VỤ KIỂM DUYỆT SẢN PHẨM (`SYSTEM_MANAGER`):**<br>Hàm `assertProductSubmissionComplete` ở Backend (`products.service.ts` dòng 261–268) kiểm tra cứng 3 trường này trước khi cho phép gửi duyệt (`PENDING`). Trang `ProductDetailPage.tsx` cũng hiển thị 3 trường này ở tab Thông tin chi tiết. |
| **Bước 3** | **Bật Tiếp thị Liên kết (`isAffiliateEnabled`)** *(Tỷ lệ thù lao cố định 10% Gốc + Bậc KOL)* | `isAffiliateEnabled`, `commissionRate = 10` | Quyết định sản phẩm có xuất hiện trên Sàn Tiếp Thị của KOL để lấy Smart Link / Dynamic QR hay không (**WF-03**). |
| **Bước 3** | **Chương trình Hàng mẫu Trải nghiệm (`sampleEnabled`, `sampleQuota`)** | `sampleEnabled`, `sampleQuota` | **PHỤC VỤ WF-03 (CẤP PHÁT HÀNG MẪU TRẢI NGHIỆM SLA 14 NGÀY):** Cho phép KOL gửi yêu cầu xin mẫu thử 0đ và giới hạn số lượng mẫu tối đa. |
| **Bước 3** | **Hồ sơ Minh chứng Kiểm duyệt** (`Ảnh/Link chứng từ xuất xứ`, `Ảnh/Link nhãn sản phẩm`, `Link chứng nhận đại lý`) | `originProofImages`, `originProofLinks`, `labelProofImages`, `labelProofLinks`, `agencyCertLinks` | **PHỤC VỤ KIỂM DUYỆT SẢN PHẨM (`SYSTEM_MANAGER`):** Hàm `assertProductSubmissionComplete` (`products.service.ts` dòng 269–290) bắt buộc phải có ít nhất 1 ảnh hoặc link minh chứng xuất xứ và nhãn sản phẩm thì mới cho gửi duyệt! |

---

### 3.2. Nhóm 2 — CÁC TRƯỜNG DƯ THỪA, GÂY RỐI HOẶC GÂY LỖI NGẦM (Nên xóa hoặc thu gọn)

| Vị trí | Trường / Khu vực dư thừa | Tại sao không cần thiết và đang gây lỗi? | Đề xuất xử lý |
| :--- | :--- | :--- | :--- |
| **Bước 2 (Bảng biến thể)** | **Cột `Mã vạch EAN-13` (`barcode`)** | Không dùng trong bất kỳ workflow nào, lại bị chặn bởi thuật toán checksum 13 số EAN-13 ở Backend. | **Xóa hoàn toàn** (như đã phân tích ở Mục 2). |
| **Bước 2 (Bảng biến thể)** | **Biến `basePrice` / `originalPrice`** | Trộn lẫn giữa giá gốc khuyến mãi cũ và giá sàn, gây mất giá sàn khi sửa và lỗi DTO. | **Chuẩn hóa thành `floorPrice` (Giá sàn)**, xóa `basePrice` và `originalPrice`. |
| **Bước 2 (Khối mở rộng dòng 3996–4079)** | **Khối "Thông số bổ sung & Nâng cao":**<br>- `Hạn mở nắp (PAO)` (`formPao`)<br>- `Đơn vị chịu trách nhiệm` (`formResponsibleEntity`)<br>- `Bảng 4 ô thông số tùy chỉnh` (`formSpecifications`)<br>- `Hoạt chất chính` (`formKeyActives`)<br>- `Hạn sử dụng` (`formShelfLife`) | 1. **Trong Database `Product` KHÔNG HỀ CÓ các cột này!**<br>2. Khi bấm Lưu, code Frontend (`ProductManagementPage.tsx` dòng 1991–2013) tự động nối chuỗi văn bản (`📌 THÔNG SỐ KỸ THUẬT SẢN PHẨM:...`) rồi **nhét 강제로 vào đuôi `description`**, khiến mỗi lần mở Sửa sản phẩm là `description` bị dính thêm các đoạn text tự sinh!<br>3. Nghiêm trọng hơn, code (dòng 2025–2042) còn **nhồi toàn bộ các trường này vào `variant.attributes`**, làm số lượng key trong `variant.attributes` vọt lên 10–15 keys $\rightarrow$ **bị Backend chặn cứng `400 Bad Request` vì `variant.attributes` chỉ cho phép tối đa 4 keys!** | **Xóa bỏ khối "Thông số bổ sung & Nâng cao" này.** Chỉ giữ đúng 3 ô chuẩn mà DB hỗ trợ trực tiếp là `origin` (Xuất xứ), `ingredients` (Thành phần/Chất liệu) và `labelInfo` (Nhãn phụ & HDSD). |
| **Bước 3 (Dòng 4240)** | **Ô `Số phiếu công bố / Mã hồ sơ pháp lý` (`formNotificationNumber`)** | Cũng không có cột trong Database! Code đang tự nối chuỗi `📌 QUY CHUẨN & PHÁP LÝ SẢN PHẨM` vào `description` và nhồi `notificationNumber` vào `variant.attributes` (gây lỗi vượt quá 4 keys của biến thể). | **Xóa bỏ ô này** (hoặc nếu người dùng muốn ghi số công bố thì ghi trực tiếp trong ô `Nhãn phụ & HDSD` hoặc `Link minh chứng`). |
| **Khi mở Modal Tạo mới (`openCreateModal`)** | **Tự động bật Phân loại Cấp 2 và sinh sẵn 4 dòng biến thể giá `0₫` (`2 × 2 = 4`)** | Nhiều sản phẩm chỉ có 1 phân loại (ví dụ: chỉ chia Dung tích `30ml`, `50ml` hoặc chỉ có 1 phiên bản), nhưng form tự bật cả Cấp 1 lẫn Cấp 2 tạo ra 4 dòng `0₫`. Nếu người dùng chỉ nhập giá dòng đầu mà quên xóa 3 dòng dưới thì bị báo lỗi không qua được Bước 2. | Khi mở modal **Tạo sản phẩm mới**, chỉ mặc định **1 cấp phân loại với 1 giá trị mặc định (sinh 1 dòng biến thể duy nhất)**. Khi nào Shop Manager cần thêm giá trị hoặc bật Cấp 2 thì mới bấm thêm. |

---

## 4. KIỂM TOÁN FORM TẠO & SỬA CỬA HÀNG NỘI BỘ (`STORE`) VÀ GÁN `SHOP_MANAGER`

Qua đối chiếu commit `409891d` trên nhánh `thang` với [AdminPersonnelPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminPersonnelPage.tsx), [stores.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/stores/stores.service.ts) và [users.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/users/users.service.ts):

### 4.1. Những điểm nhánh `thang` đã làm tốt
- Đã bỏ trường `contactEmail` dư thừa trong `CreateStoreDto` và giao diện tạo Store.
- Đã tự động đồng bộ `contactName` và `contactPhone` của Store theo thông tin của `SHOP_MANAGER` được gán (`stores.service.ts` dòng 838–841).
- Các trường còn lại trên Form Tạo Cửa Hàng Nội Bộ hiện **rất gọn và đều phục vụ tính năng thật**:
  1. `name` (Tên cửa hàng nội bộ) + `slug` (Tự động sinh): Định danh Store.
  2. `primaryCategory` (Ngành hàng khóa cứng): Phục vụ **Category Lock** khi đăng sản phẩm.
  3. `description` (Mô tả cửa hàng): Hiển thị trên hồ sơ Store.
  4. `DiaChiGetter` (`Tỉnh/Thành`, `Quận/Huyện`, `Phường/Xã`, `Địa chỉ kho`) + `ghnDistrictId`, `ghnWardCode`: **Bắt buộc để tính phí vận chuyển GHN từ kho xuất hàng của Store (`WF-04`)**.

### 4.2. Các điểm chưa đồng bộ / lỗi còn sót ở luồng Store & Nhân sự
1. **Modal "Chỉnh sửa cửa hàng" (`EditStore` trong `AdminPersonnelPage.tsx` dòng 1759–1787) chưa đồng bộ với Modal "Tạo cửa hàng":**
   - Trong khi Modal Tạo mới đã bỏ 2 ô nhập tay `"Người phụ trách kho"` (`contactName`) và `"SĐT liên hệ"` (`contactPhone`) để tự lấy theo `SHOP_MANAGER`, thì Modal Chỉnh sửa vẫn còn hiện 2 ô này bắt nhập tay.
2. **Modal "Tạo cửa hàng" chưa có ô chọn nhanh `SHOP_MANAGER` phụ trách (`ownerId`):**
   - Dù Backend `CreateStoreDto` đã hỗ trợ `ownerId?: string`, trên UI khi tạo Store mới chưa có dropdown chọn `SHOP_MANAGER` (tùy chọn), khiến Admin phải tạo Store xong rồi mới bấm Sửa lần nữa để gán người quản lý.
3. **Lỗi không cập nhật `store.ownerId` khi tạo tài khoản `SHOP_MANAGER` mới vào Store đã có người quản lý (`users.service.ts` dòng 181):**
   - Trong `createInternalStaff`, điều kiện `if (dto.role === UserRole.SHOP_MANAGER && !store.ownerId)` chỉ gán `ownerId` nếu Store chưa có chủ. Nếu Admin tạo một `SHOP_MANAGER` mới để tiếp quản Store đã có `ownerId` cũ, `store.ownerId` không được cập nhật.
4. **Thiếu `role: true` trong `updateStoreByAdmin` (`stores.service.ts` dòng 877):**
   - Khi cập nhật Store, câu `select` cho `owner` thiếu `role: true`, làm hàm `serializeAdminStore` cảnh báo sai nếu đối chiếu role.

---

## 5. DANH SÁCH 9 LỖI BLOCKER NGẦM & LỖI NUỐT CẢNH BÁO UX KHI TẠO/SỬA

Dưới đây là tổng hợp **9 nguyên nhân kỹ thuật** khiến người dùng tạo/sửa sản phẩm bị báo lỗi hoặc không biết mình đang thiếu trường nào:

| # | Mức độ | Mô tả lỗi | Vị trí trong Code | Hậu quả thực tế |
| :---: | :---: | :--- | :--- | :--- |
| **1** | 🔴 **Blocker** | **Gán `id: "var-..."` (không phải UUID) cho biến thể mới** | `ProductManagementPage.tsx` (dòng 1348, 1371, 1399, 2017) | Khi đổi tên/giá trị phân loại, hàm `generateCartesianVariants` sinh `id: "var-173..."`. Backend (`ProductVariantInputDto` `@IsUUID()` và `products.service.ts` dòng 1246) **chặn cứng `400 Bad Request`** vì sản phẩm tạo mới không được có `id` hoặc `id` không phải UUID! |
| **2** | 🔴 **Blocker** | **Nhồi 8–15 thông số chung vào `variant.attributes`** | `ProductManagementPage.tsx` (dòng 2025–2042) vs `products.service.ts` (dòng 1268, 1857) | Frontend nhét `origin`, `ingredients`, `labelInfo`, `packageWeight`, `brand`, `tags`... vào `variant.attributes`. Backend chỉ cho phép `variant.attributes` có **tối đa 4 keys**, key phải là `snake_case` chữ thường (cấm `camelCase` như `packageWeight`, `labelInfo`) và giá trị `<= 80` ký tự $\rightarrow$ **Chặn `400 Bad Request`!** |
| **3** | 🔴 **Blocker** | **Gửi `basePrice` trong `variants[]` không có trong DTO & không lưu `floorPrice`** | `ProductManagementPage.tsx` (dòng 2023, 1688, 2215) vs `sync-product-variants.dto.ts` | `ValidationPipe (forbidNonWhitelisted: true)` từ chối thuộc tính lạ `basePrice`; còn `floorPrice` thật trong DB thì không được lưu khi tạo/sửa. |
| **4** | 🔴 **Blocker** | **Lệch tên 4 Ngành hàng khóa cứng và lệch key thuộc tính biến thể giữa FE & BE** | `ProductManagementPage.tsx` (dòng 189–238, 1307, 2141) vs `product-variant-fields.ts` & `products.service.ts` (dòng 254) | - Store dùng tên chuẩn mới (`"Mỹ phẩm & Chăm sóc da chuyên sâu"`, `"Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên"`...), nhưng `product-variant-fields.ts` ở Backend so khớp chính xác (`===`) với tên cũ nên rơi về nhánh mặc định.<br>- Bấm nút `+ Thêm dòng biến thể` (`addVariant` dòng 1307) tạo `attributes: {}` rỗng, đến dòng 2141 bị chính FE chặn lỗi thiếu thuộc tính. |
| **5** | 🔴 **Blocker** | **Gọi `/products/identity-check` không bọc `try/catch` trước khi lưu** | `ProductManagementPage.tsx` (dòng 2196) vs `semantic-embedding.service.ts` (dòng 82) | Nếu máy local chưa tải xong model HuggingFace ONNX (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`), API trả về `503 ServiceUnavailableException` làm văng toàn bộ hàm `handleSave()`, không cho lưu sản phẩm! |
| **6** | 🔴 **Blocker** | **Kiểm tra `barcode` EAN-13 ở Backend `validateProductPackage`** | `backend/src/modules/products/product-package.ts` (dòng 28) | Nhập bất kỳ mã vạch nào không đúng chuẩn checksum 13 số EAN-13 đều bị chặn `400 Bad Request`. (Sẽ được giải quyết triệt để khi xóa `barcode`). |
| **7** | 🟠 **High** | **Upload ảnh bằng `<input type="file">` chỉ tạo `blob:http://...` tạm thời** | `ProductManagementPage.tsx` (dòng 1426, 1468, 1495) | Các hàm chọn file từ máy tính đang dùng `URL.createObjectURL(file)` thay vì gọi API `POST /api/upload/image`. Khi reload trang hoặc mở sang trình duyệt khác, ảnh `blob:` sẽ bị hỏng hoàn toàn. |
| **8** | 🟠 **High (UX)** | **Nuốt sạch danh sách lỗi chi tiết khi bấm "Tiếp theo" hoặc "Lưu"** | `ProductManagementPage.tsx` (dòng 898–913, 2067–2076, 2812) | Các hàm `validateStep1()`, `validateStep2()`, `validateStep3()` đã tính ra mảng `errors[]` rất chi tiết (ví dụ: *"Thiếu xuất xứ"*, *"Biến thể #2 có giá bán thấp hơn giá sàn"*), nhưng `goToNextStep()` và `handleSave()` lại **bỏ qua mảng `errors[]`** mà chỉ báo câu chung chung: *"Vui lòng hoàn thiện các trường bắt buộc ở Bước 2"*. Đồng thời thanh báo lỗi trên Header dùng `saveError.split('\n')[0]` cắt mất các dòng lỗi phía sau! |
| **9** | 🟡 **Medium (UX)** | **Nút "Tiếp theo" bị `disabled` cứng mà không nói lý do** | `ProductManagementPage.tsx` (dòng 4555, 4569) | Khi người dùng thiếu 1 trường nhỏ ở dưới trang, nút `"Tiếp theo"` bị mờ (`disabled={!isStep1Complete}`) nhưng không hiển thị dòng nhắc cụ thể đang thiếu trường nào ngay cạnh nút, khiến người dùng tưởng trang web bị đơ. |

---

## 6. KẾ HOẠCH HÀNH ĐỘNG ĐỀ XUẤT (CHECKLIST KHI BẮT ĐẦU CODE)

Khi bạn xác nhận cho phép triển khai, chúng ta sẽ thực hiện gọn gàng theo 4 hạng mục sau:

1. **Hạng mục 1 — Xóa hoàn toàn `barcode` (Mã vạch):**
   - Xóa cột `barcode` trên bảng biến thể Bước 2, xóa state/validation `barcode` ở `ProductManagementPage.tsx`, `ProductDetailPage.tsx`, `product-package.utils.ts`, `product.service.ts`.
   - Gỡ bỏ kiểm tra EAN-13 và kiểm tra trùng `barcode` trong `product-package.ts`, `product-identity.policy.ts` và `products.service.ts`.
2. **Hạng mục 2 — Chuẩn hóa Giá (`floorPrice` & `price`) và dọn dẹp trường dư thừa:**
   - Thay thế hoàn toàn `basePrice` / `originalPrice` bằng `floorPrice` (Giá sàn bảo vệ biên lợi nhuận) + `price` (Giá bán niêm yết).
   - Cập nhật Backend DTO (`CreateProductDto`, `UpdateProductDto`, `ProductVariantInputDto`) và `products.service.ts` để lưu và đọc chuẩn xác `floorPrice` cho cả `Product` và `ProductVariant`.
   - Loại bỏ khối "Thông số bổ sung & Nâng cao" (`PAO`, `Đơn vị chịu trách nhiệm`, `4 thông số tùy chỉnh`, `Số phiếu công bố`) để không còn nối rác vào `description` và không còn nhồi quá 4 keys vào `variant.attributes`.
   - Mặc định khi mở modal Tạo sản phẩm mới chỉ tạo **1 dòng biến thể duy nhất** (thay vì 4 dòng `0₫`).
3. **Hạng mục 3 — Sửa triệt để các lỗi Blocker ngầm khi Tạo/Sửa sản phẩm:**
   - Không gửi `id: "var-..."` cho biến thể mới tạo; chỉ giữ trong `variant.attributes` đúng 1–2 thuộc tính phân loại (ví dụ `Dung tích`, `Màu sắc`).
   - Đồng bộ tên 4 ngành hàng chuẩn trong `product-variant-fields.ts` và `products.service.ts`.
   - Bọc `try/catch` an toàn cho `/products/identity-check` (fallback gracefully nếu model AI local chưa sẵn sàng) và kết nối `<input type="file">` với API upload ảnh thật (`POST /api/upload/image`).
4. **Hạng mục 4 — Nâng cấp Gợi ý Trực quan (UX Feedback) & Đồng bộ Form Store:**
   - Hiển thị rõ ràng **danh sách từng trường còn thiếu / chưa hợp lệ (`errors[]`)** ngay trên hộp cảnh báo và cạnh nút `"Tiếp theo"` / `"Lưu"`; tự động cuộn tới trường bị lỗi.
   - Đồng bộ Modal Sửa Store với Modal Tạo Store (bỏ 2 ô nhập tay người liên hệ kho) và thêm dropdown chọn nhanh `SHOP_MANAGER` ngay khi Tạo Store mới.
