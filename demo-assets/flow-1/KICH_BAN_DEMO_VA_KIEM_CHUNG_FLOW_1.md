# KỊCH BẢN DEMO & KIỂM CHỨNG FLOW 1 (WF-01)
**Chủ sở hữu:** Nguyễn Thành Thắng (`SE184251`)  
**Tên luồng:** Khởi tạo Cửa hàng & Nhân sự Nội bộ Mới, Tuyển mộ Cộng tác viên Mới, Thẩm định eKYC Maker-Checker & Kích hoạt Hạng Đồng (`10%`)

---

## 1. Đối chiếu thay đổi hiện tại so với tài liệu cũ (Review 2)

| Hạng mục | Tài liệu cũ (trước Post-Review 2) | Hiện trạng hệ thống đã kiểm chứng live |
| :--- | :--- | :--- |
| **Mở Cửa hàng & Shop Manager** | Cho phép user tự đăng ký mở Shop kèm Giấy phép ĐKKD / Mã số thuế (`/customer/upgrade/shop`) | **Đã bãi bỏ hoàn toàn.** Chỉ `SYSTEM_ADMIN` tạo Cửa hàng trực thuộc và bổ nhiệm `SHOP_MANAGER` / `SYSTEM_MANAGER` tại `/admin/personnel`. Truy cập `/customer/upgrade/shop` tự động redirect về `/customer/upgrade`. |
| **Ảnh khi tạo Cửa hàng / Shop Manager** | Nhắc chung chung đến giấy phép ĐKKD | Modal **Khởi tạo Cửa hàng / Nhãn hàng mới** yêu cầu tải lên **Ảnh đại diện / Logo nhãn hàng** (PNG/JPG/WEBP ≤ 5MB); Modal **Bổ nhiệm nhân sự mới** (`Giám đốc Shop`) không yêu cầu ảnh avatar, chỉ nhập thông tin nhân sự và gán vào Cửa hàng vừa tạo. |
| **Đăng ký / Nâng cấp KOL** | Đăng ký riêng lẻ hoặc nộp form chung | `CUSTOMER` nâng cấp trực tiếp qua form 2 bước tại `/customer/upgrade/kol` (Bước 1: Hồ sơ sáng tạo + ảnh chứng minh kênh; Bước 2: CCCD 12 số 2 mặt + Tài khoản ngân hàng VietQR). |
| **Thẩm định eKYC** | Duyệt KYC 1 cấp | Quy trình **Maker-Checker** tại `/admin/kyc` (`SYSTEM_MANAGER`): Duyệt (`VERIFIED`) tự động kích hoạt **Hạng Đồng (`10%`)** & mở ví; Từ chối bắt buộc nhập lý do phản hồi, giữ nguyên tài khoản để nộp lại. |

---

## 2. Bộ ảnh & Tài liệu chuẩn bị trong `demo-assets/flow-1/`

| Tên file | Dùng ở bước nào khi demo |
| :--- | :--- |
| [00_logo_cua_hang_vela_botanicals.png](file:///c:/HW/CAPSTONE/demo-assets/flow-1/00_logo_cua_hang_vela_botanicals.png) | **Tạo Cửa hàng mới (`+ Thêm Cửa Hàng`):** Tải lên ô *Ảnh đại diện / Logo nhãn hàng* cho **Vela Botanicals** |
| [01_avatar_kol_quynhne.jpg](file:///c:/HW/CAPSTONE/demo-assets/flow-1/01_avatar_kol_quynhne.jpg) | Ảnh đại diện mẫu khi chỉnh sửa hồ sơ KOL mới (`@quynhne6288`) |
| [02_tiktok_profile_50k_proof_desktop.png](file:///c:/HW/CAPSTONE/demo-assets/flow-1/02_tiktok_profile_50k_proof_desktop.png) | **Form eKYC KOL (Bước 1):** Tải lên ô *Ảnh chụp trang quản trị kênh* (`52.8K` followers) |
| [03_tiktok_profile_50k_proof_compact.png](file:///c:/HW/CAPSTONE/demo-assets/flow-1/03_tiktok_profile_50k_proof_compact.png) | Ảnh dự phòng trang quản trị kênh |
| [04_cccd_mat_truoc_demo.png](file:///c:/HW/CAPSTONE/demo-assets/flow-1/04_cccd_mat_truoc_demo.png) | **Form eKYC KOL (Bước 2):** Tải lên *Ảnh CCCD mặt trước* (`079302015849`) |
| [05_cccd_mat_sau_demo.png](file:///c:/HW/CAPSTONE/demo-assets/flow-1/05_cccd_mat_sau_demo.png) | **Form eKYC KOL (Bước 2):** Tải lên *Ảnh CCCD mặt sau* |
| [HUONG_DAN_NHAP_LIEU_EKYC_COLLABORATOR.md](file:///c:/HW/CAPSTONE/demo-assets/flow-1/HUONG_DAN_NHAP_LIEU_EKYC_COLLABORATOR.md) | Bảng copy-paste nhanh toàn bộ thông tin nhập liệu form eKYC KOL |

---

## 3. Kịch bản thao tác Live từng bước (Tạo Cửa hàng mới + Shop Manager mới + KOL mới)

### Phần A — Tạo Cửa hàng mới & Bổ nhiệm Shop Manager mới (`SYSTEM_ADMIN`)
1. Đăng nhập tại `/login` bằng vai trò **`Quản trị`** (`admin@scanms.vn`) → Vào `/admin/personnel`.
2. Bấm **`+ Thêm Cửa Hàng`** và nhập nhanh:
   - **Ảnh đại diện / Logo nhãn hàng:** Tải lên `00_logo_cua_hang_vela_botanicals.png`
   - **Tên Cửa hàng / Nhãn hàng:** `Vela Botanicals`
   - **Ngành hàng kinh doanh cố định:** Giữ mặc định lựa chọn đầu tiên **`Mỹ phẩm & Chăm sóc da chuyên sâu`**
   - **Mô tả định vị nhãn hàng:** `Thương hiệu dược mỹ phẩm thuần chay phục hồi hàng rào da khoa học.`
   - **Kho xuất hàng GHN:**
     - Tên kho: `Kho Dược Mỹ Phẩm Vela Thủ Đức`
     - Chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã (ví dụ `TP. Hồ Chí Minh` → `TP. Thủ Đức` → `Phường Linh Trung`), Số nhà: `18 Đường số 6`
   - Bấm **Xác nhận tạo cửa hàng**.
3. Bấm **`+ Bổ nhiệm Nhân sự`** để tạo Shop Manager cho cửa hàng vừa tạo:
   - **Vai trò quản trị:** Chọn `Giám đốc Shop` (`SHOP_MANAGER`)
   - **Cửa hàng phụ trách:** Chọn **`Vela Botanicals`**
   - **Họ và tên nhân sự:** `Trần Minh Anh`
   - **Email công ty:** `manager.vela@scanms.vn`
   - **Số điện thoại:** `0908881122`
   - **Mật khẩu khởi tạo:** `Scanms@2026`
   - Bấm **Xác nhận bổ nhiệm**.

### Phần B — Tạo / Đăng ký KOL mới & Nộp hồ sơ eKYC (`CUSTOMER`)
1. Đăng ký tài khoản Khách hàng mới tại `/register` (hoặc dùng `customer.an@scanms.vn`), sau đó vào `/customer/upgrade/kol`.
   *(Lưu ý: Nếu thử truy cập `/customer/upgrade/shop` sẽ bị chặn và redirect về `/customer/upgrade` vì hệ thống không cho tự mở Shop ngoài).*
2. Điền **Bước 1 (`Hồ sơ sáng tạo`)** và **Bước 2 (`Định danh & Thanh toán`)** theo bảng copy-paste tại [HUONG_DAN_NHAP_LIEU_EKYC_COLLABORATOR.md](file:///c:/HW/CAPSTONE/demo-assets/flow-1/HUONG_DAN_NHAP_LIEU_EKYC_COLLABORATOR.md), nhớ chọn **Ngành hàng thế mạnh** là **`Mỹ phẩm & Chăm sóc da chuyên sâu`** (mục đầu tiên, khớp với cửa hàng **Vela Botanicals**).
3. Bấm **Gửi hồ sơ** → Hồ sơ chuyển sang `PENDING_REVIEW`.

### Phần C — Thẩm định eKYC Maker-Checker (`SYSTEM_MANAGER`)
1. Đăng nhập vai trò **`Vận hành`** (`manager@scanms.vn`) → Vào `/admin/kyc`.
2. Mở hồ sơ vừa nộp trong tab **Chờ thẩm định**, bấm **Thẩm định** → Kiểm tra CCCD 2 mặt, ảnh proof `52.8K` followers, tài khoản Vietcombank.
3. Bấm **Phê duyệt (`Approve`)** → Tài khoản chuyển sang `VERIFIED`, tự động kích hoạt **Hạng Đồng (`10%`)** và mở khóa công cụ tiếp thị + ví thu nhập để dùng tiếp cho Flow 2.

---

## 4. Bộ dữ liệu & Ảnh cho 3 Lần Demo (không trùng lặp)

| Lần | Cửa hàng mới (Ngành đầu tiên: Mỹ phẩm) | Shop Manager mới | KOL mới + eKYC (TikTok + CCCD) |
| :--- | :--- | :--- | :--- |
| **Lần 1** | **Vela Botanicals** (`00_logo_cua_hang_vela_botanicals.png`) | `Trần Minh Anh` / `manager.vela@scanms.vn` | **Nguyễn Như Quỳnh** (`@quynhne6288`, `52800`, CCCD `079302015849`) — `01_avatar...`, `02_tiktok...`, `04_cccd...`, `05_cccd...` |
| **Lần 2** | **Kora Derma Lab** (`06_lan2_logo_cua_hang_kora_derma.png`) | `Lê Hoàng Bảo` / `manager.kora@scanms.vn` | **Trần Khánh Linh** (`@linhskinlab`, `68400`, CCCD `079301028491`) — `07_lan2_avatar...`, `08_lan2_tiktok...`, `09_lan2_cccd...`, `10_lan2_cccd...` |
| **Lần 3** | **Mira Pure Skincare** (`11_lan3_logo_cua_hang_mira_pure.png`) | `Ngô Hải Yến` / `manager.mira@scanms.vn` | **Phạm Mai Anh** (`@maianh.glow`, `41200`, CCCD `079303049182`) — `12_lan3_avatar...`, `13_lan3_tiktok...`, `14_lan3_cccd...`, `15_lan3_cccd...` |
