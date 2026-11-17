# KỊCH BẢN DEMO & KIỂM CHỨNG FLOW 2 (WF-02)
**Chủ sở hữu:** Phan Xuân Thịnh (`SE184527`)  
**Tên luồng:** Quản trị Sản phẩm Biến thể 2 Cấp cho Cửa hàng Mới (**Vela Botanicals**), Bảo vệ Giá sàn `floorPrice`, Kiểm duyệt 2 Tầng Giá & Đàm phán Deal Độc quyền 2 Chiều qua Chat Đính kèm File

---

## 1. Đối chiếu thay đổi hiện tại so với tài liệu cũ (Review 2)

| Hạng mục | Tài liệu cũ (trước Post-Review 2) | Hiện trạng hệ thống đã kiểm chứng live |
| :--- | :--- | :--- |
| **Giá niêm yết & Giá sàn (`floorPrice`)** | Kiểm tra giá sàn đơn giản | Ép cứng công thức `minSafePrice = ceil(floorPrice / 0.65)` (trừ trần `25%` Deal + `10%` Coupon KOL). Form sản phẩm có nút tính nhanh **`+0%`**, **`+20%`**, **`+30%`** và tooltip **`?` / `!`**. |
| **Phân quyền duyệt Giảm giá / Xả hàng** | Chỉ 1 cấp duyệt | **2 tầng rõ ràng:** Giá sau giảm `>= minSafePrice` → `SYSTEM_MANAGER` duyệt; Giá xả hàng `< minSafePrice` → Tự gắn nhãn `Xả hàng dưới sàn · Chuyển SYSTEM_ADMIN`, khóa nút duyệt của `SYSTEM_MANAGER`, bắt buộc `SYSTEM_ADMIN` phê duyệt (kèm `Lỗ tối đa ước tính: ... / sản phẩm`). |
| **Đàm phán Deal Độc quyền (`Exclusive Deal`)** | Shop/KOL gửi deal, tự sinh VIP Voucher Code | **2 tầng duyệt Deal:** `<= 16%` do `SHOP_MANAGER` tự duyệt; **`> 16%` đến trần `25%`** bắt buộc leo thang lên `SYSTEM_ADMIN` duyệt tại `/admin/vip-exceptions`. **Không tự sinh Coupon khi kích hoạt Deal** (`vipVoucherCode: null`) và **không cộng dồn Deal với Bậc KOL**. |
| **Gửi tài liệu cho KOL** | Kho Media Hub riêng | **Bãi bỏ Media Hub**, gửi trực tiếp ảnh/tài liệu sản phẩm qua khung **Chat Socket.IO** (`Mạng lưới Đối tác`). |
| **Phụ trợ Livestream** | +3% Live Bonus (mức cũ) | Phụ trợ **+2% Live Bonus**, tổng mọi khoản không vượt trần **25%**. |

---

## 2. Bộ ảnh & Dữ liệu sản phẩm chuẩn bị trong `demo-assets/flow-2/`
*(Đồng bộ ngành hàng đầu tiên: **`Mỹ phẩm & Chăm sóc da chuyên sâu`** của cửa hàng mới **Vela Botanicals**, không chứa tên thương hiệu cũ)*

| Tên file | Mục đích sử dụng khi demo |
| :--- | :--- |
| [01_sp1_serum_vitamin_c_b5_30ml.jpg](file:///c:/HW/CAPSTONE/demo-assets/flow-2/01_sp1_serum_vitamin_c_b5_30ml.jpg) | **Ảnh bìa Sản phẩm 1 & Biến thể 30ml:** *Serum Vitamin C 15% & Phục Hồi B5 (30ml)* |
| [02_sp1_mat_na_rau_ma_phuc_hoi.jpg](file:///c:/HW/CAPSTONE/demo-assets/flow-2/02_sp1_mat_na_rau_ma_phuc_hoi.jpg) | **Ảnh đính kèm Chat Brief cho KOL** (hoặc ảnh bổ sung bộ phục hồi rau má đi kèm) |
| [03_sp2_sua_rua_mat_ph55_150ml.jpg](file:///c:/HW/CAPSTONE/demo-assets/flow-2/03_sp2_sua_rua_mat_ph55_150ml.jpg) | **Ảnh Sản phẩm 2:** *Sữa Rửa Mặt Dịu Nhẹ Amino Acid pH 5.5 (150ml)* |

### Bảng nhập nhanh Sản phẩm mới cho Shop **Vela Botanicals**
- **Đăng nhập Shop Manager mới vừa tạo ở Flow 1:** `manager.vela@scanms.vn` / `Scanms@2026`
- **Sản phẩm 1:**
  - **Tên sản phẩm:** `Serum Vitamin C 15% & Phục Hồi B5 Vela`
  - **Ngành hàng:** Tự động khóa cứng là **`Mỹ phẩm & Chăm sóc da chuyên sâu`** (ngành hàng đầu tiên)
  - **Mã SKU:** `VELA-VITC-B5`
  - **Ảnh sản phẩm:** Tải lên `01_sp1_serum_vitamin_c_b5_30ml.jpg`
  - **Biến thể 2 cấp (Dung tích):**
    - `30ml` — Giá sàn `floorPrice`: **`100000`** → Bấm nút **`+30%`** để tự tính Giá niêm yết an toàn **`211.641 ₫`** | Tồn kho: `100`
    - `50ml` — Giá sàn `floorPrice`: **`150000`** → Bấm nút **`+30%`** để tự tính Giá niêm yết an toàn **`317.461 ₫`** | Tồn kho: `80`
  - **Thông số GHN:** Cân nặng `250g`, Kích thước `12 x 6 x 6 cm`
- **Sản phẩm 2 (tùy chọn tạo thêm hoặc dùng test xả hàng):**
  - **Tên sản phẩm:** `Sữa Rửa Mặt Dịu Nhẹ Amino Acid pH 5.5`
  - **Ảnh sản phẩm:** `03_sp2_sua_rua_mat_ph55_150ml.jpg`
  - **Giá sàn `floorPrice`:** `120000` → Bấm **`+20%`** → Giá niêm yết `233.619 ₫`

---

## 3. Kịch bản thao tác Live từng bước (2 phút 15 giây)

1. **Bước 1 — Shop Manager mới tạo Sản phẩm & Kiểm tra Giá sàn (`/merchant/products`):**
   - Đăng nhập bằng tài khoản **`manager.vela@scanms.vn`** (tạo ở Flow 1).
   - Bấm **Thêm sản phẩm**, tải `01_sp1_serum_vitamin_c_b5_30ml.jpg`, chỉ ra hệ thống **khóa cứng ngành hàng `Mỹ phẩm & Chăm sóc da chuyên sâu`**.
   - Sang Bước 2 (`Phân loại & Thông số`): nhập Giá sàn `100.000 ₫`, bấm nút **`+30%`** → giá niêm yết nhảy **`211.641 ₫`**, di chuột vào **`?`** và **`!`** để giải thích công thức `minSafePrice`.
2. **Bước 2 — Kiểm duyệt Sản phẩm & 2 Tầng Khuyến mãi:**
   - `SYSTEM_MANAGER` (`manager@scanms.vn`) vào `/admin/products-pricing?tab=moderation` bấm duyệt sản phẩm của **Vela Botanicals**.
   - Quay lại `SHOP_MANAGER` vào `/merchant/promotions` → bấm **Đề xuất giảm giá** (`ProposePromotionModal`), thử nhập giá xả dưới `minSafePrice` → UI hiện rõ `Xả hàng dưới sàn · Chuyển SYSTEM_ADMIN` và `Lỗ tối đa ước tính: ... / sản phẩm`.
   - Cho thấy ở `/admin/products-pricing?tab=pricing`, `SYSTEM_MANAGER` bị **khóa nút duyệt** với kèo xả dưới sàn, chỉ `SYSTEM_ADMIN` (`admin@scanms.vn`) mới được phê duyệt.
3. **Bước 3 — AI Matching & Đàm phán Deal Độc quyền qua Chat (`SHOP_MANAGER` ↔ `COLLABORATOR` mới):**
   - `SHOP_MANAGER` (`manager.vela@scanms.vn`) vào `/merchant/kol-hub`, mở **`Gợi ý KOC (AI Radar)`** / **`Tìm với AI`** để tìm KOL ngành *Mỹ phẩm & Chăm sóc da chuyên sâu* (thấy KOL mới vừa duyệt ở Flow 1!).
   - Trong khung **Tin nhắn & Hợp tác**, đính kèm ảnh `02_sp1_mat_na_rau_ma_phuc_hoi.jpg` (gửi trực tiếp qua Chat Socket.IO) kèm brief và bấm **`Đề xuất Thỏa thuận Độc quyền`** mức **`18%`** (`> 16%`).
   - KOL mới đăng nhập vào `/collaborator/collaboration`, nhận thẻ Deal realtime và bấm Chấp thuận.
   - `SYSTEM_ADMIN` (`admin@scanms.vn`) vào `/admin/vip-exceptions` (**Phê duyệt Thỏa thuận Đặc cách `> 16% (Trần 25%)`**) phê duyệt Deal `18%`.

---

## 4. Bộ sản phẩm & Ảnh cho 3 Lần Demo (khớp 3 Shop ở Flow 1)

| Lần | Shop Manager | Sản phẩm 1 & Giá sàn (`+30%`) | Sản phẩm 2 / Ảnh gửi Chat |
| :--- | :--- | :--- | :--- |
| **Lần 1** | `manager.vela@scanms.vn` (**Vela Botanicals**) | **Serum Vitamin C 15% & Phục Hồi B5 Vela** (`VELA-VITC-B5`, sàn `100.000` → `211.641 ₫`) — `01_sp1_serum_vitamin_c_b5_30ml.jpg` | `02_sp1_mat_na_rau_ma_phuc_hoi.jpg` (Chat) & `03_sp2_sua_rua_mat_ph55_150ml.jpg` |
| **Lần 2** | `manager.kora@scanms.vn` (**Kora Derma Lab**) | **Toner Tẩy Tế Bào Chết BHA Kora** (`KORA-BHA-100`, sàn `120.000` → `253.969 ₫`) — `04_lan2_sp1_kora_toner_bha.jpg` | `05_lan2_sp2_kora_kem_chong_nang.jpg` (**Kem Chống Nắng Kiềm Dầu SPF50+ Kora**) |
| **Lần 3** | `manager.mira@scanms.vn` (**Mira Pure Skincare**) | **Mặt Nạ Rau Má Phục Hồi Mira** (`MIRA-CICA-MASK`, sàn `110.000` → `232.805 ₫`) — `06_lan3_sp1_mira_mat_na_rau_ma.jpg` | `07_lan3_sp2_mira_sua_rua_mat_ph55.jpg` (**Sữa Rửa Mặt Amino Acid pH 5.5 Mira**) |

---

## 5. Ảnh Minh Chứng Xuất Xứ & Giấy Phép (Kiểu Cartoon Demo — Bước 3 Tạo Sản Phẩm)

| Lần | Minh chứng xuất xứ & Hóa đơn (`originProofImages`) | Minh chứng nhãn mác & Giấy phép (`labelProofImages`) | Số công bố gợi ý |
| :--- | :--- | :--- | :--- |
| **Lần 1 (Vela)** | `08_lan1_vela_chung_tu_xuat_xu_cartoon.png` | `09_lan1_vela_giay_phep_nhan_mac_cartoon.png` | `1842/26/CBMP-HCM` |
| **Lần 2 (Kora)** | `10_lan2_kora_chung_tu_xuat_xu_cartoon.png` | `11_lan2_kora_giay_phep_nhan_mac_cartoon.png` | `2195/26/CBMP-HCM` |
| **Lần 3 (Mira)** | `12_lan3_mira_chung_tu_xuat_xu_cartoon.png` | `13_lan3_mira_giay_phep_nhan_mac_cartoon.png` | `3048/26/CBMP-HCM` |

> **Checklist nhanh các trường bắt buộc khi tạo sản phẩm (3 bước):**
> - **Bước 1:** Tên SP, SKU, Danh mục (`Mỹ phẩm & Chăm sóc da chuyên sâu`), **Ảnh bìa chính**, Mô tả chi tiết.
> - **Bước 2:** Phân loại hàng (Tên, SKU, Giá sàn `floorPrice`, Giá bán `>= minSafePrice`, Tồn kho), **Nguồn gốc xuất xứ** (VD: `Việt Nam - Lab TP. Thủ Đức`), Thành phần / Hoạt chất, Quy cách đóng gói GHN (Cân nặng gram, Dài × Rộng × Cao cm).
> - **Bước 3:** Tối thiểu 1 ảnh/link trong **Minh chứng xuất xứ & Hóa đơn** hoặc **Minh chứng nhãn mác & Giấy phép** (nên upload cả 2 ảnh cartoon ở bảng trên cho đủ bộ), tùy chọn bật cấp sản phẩm mẫu (> 0 suất).
