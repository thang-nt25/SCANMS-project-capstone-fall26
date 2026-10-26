# BÁO CÁO PHÂN TÍCH TOÀN DIỆN: ĐÁNH GIÁ UI/UX, NGHIỆP VỤ THƯƠNG MẠI ĐIỆN TỬ & MA TRẬN PHÂN QUYỀN SÀN SCANMS
*(Đối chiếu thực tế với Shopee Seller Centre, TikTok Shop Seller Center & Đề xuất chuẩn hóa)*

> **Tài liệu tham chiếu:** Dành riêng cho Team Leader Nguyễn Thành Thắng & Ban Quản trị Dự án SCANMS (FA26SE032).  
> **Nguyên tắc thực thi:** Đánh giá chuyên sâu, phân tích logic kinh doanh, kiến trúc UI thực tế, **KHÔNG VIẾT CODE**.

---

## 📑 MỤC LỤC TỔNG QUAN
1. [Phân tích Kiến trúc Sidebar: Có nên gộp "Sản phẩm" & "Đơn hàng" vào 1 mục hay giữ riêng?](#1-kiến-trúc-sidebar-sản-phẩm-vs-đơn-hàng)
2. [Đánh giá & Tinh gọn Giao diện "Danh mục Sản phẩm" (Hình 1)](#2-đánh-giá-giao-diện-danh-mục-sản-phẩm)
3. [Đánh giá "Quản lý Đơn hàng" (Hình 2) & Chuẩn Xử lý Đơn hàng Hàng loạt (Bulk Actions)](#3-quản-lý-đơn-hàng--xử-lý-hàng-loạt)
4. [Đánh giá "Hàng mẫu cho KOL" (Hình 3) & Bỏ rác số liệu, tinh gọn luồng duyệt](#4-hàng-mẫu-cho-kol--tinh-gọn-luồng-duyệt)
5. [Làm rõ Tab "Khuyến mãi & Hoa hồng": Tab "Hoa hồng & Thưởng" thực chất là gì?](#5-khuyến-mãi--hoa-hồng-và-tab-hoa-hồng--thưởng)
6. [Đánh giá Tab "Mã giảm giá độc quyền" của KOL (Hình 4)](#6-mã-giảm-giá-độc-quyền-của-kol)
7. [Phân định Rạch ròi Vai trò Ngoài đời: System Admin vs System Manager](#7-phân-định-system-admin-vs-system-manager)
8. [Bộ Quy tắc Thiết kế Giao diện Tối giản (Minimalist B2B Standards)](#8-bộ-quy-tắc-giao-diện-tối-giản-b2b)

---

## 1. KIẾN TRÚC SIDEBAR: SẢN PHẨM VS ĐƠN HÀNG

### ❓ Câu hỏi của User:
> *"Bạn thấy ghép danh mục sản phẩm với quản lý đơn hàng lại 1 sidebar thì sao, rồi có nút chuyển trên tab thì thế nào?"*

### 🏪 Đối chiếu Thực tế ngoài đời:
| Tiêu chí | Shopee Seller Centre | TikTok Shop Seller Center | SCANMS Hiện tại |
| :--- | :--- | :--- | :--- |
| **Vị trí Đơn hàng** | Mục menu cha riêng: **"Quản lý Đơn hàng"** | Mục menu cha riêng: **"Đơn hàng" (Orders)** | Đang là 1 mục riêng (`/merchant/orders`) |
| **Vị trí Sản phẩm** | Mục menu cha riêng: **"Quản lý Sản phẩm"** | Mục menu cha riêng: **"Sản phẩm" (Products)** | Đang là 1 mục riêng (`/merchant/products`) |
| **Có gộp chung vào 1 tab không?** | ❌ **Tuyệt đối KHÔNG gộp** | ❌ **Tuyệt đối KHÔNG gộp** | Đang cân nhắc |

### 💡 Đánh giá Chuyên môn & Khuyến nghị:
**KHUYẾN NGHỊ: GIỮ RIÊNG 2 MỤC ĐỘC LẬP TRÊN SIDEBAR, TUYỆT ĐỐI KHÔNG GỘP CHUNG BẰNG TAB VÀO 1 TRANG.**

#### Lý do cốt lõi:
1. **Chu kỳ & Tần suất nghiệp vụ hoàn toàn khác nhau (Business Cadence):**
   - **Đơn hàng (Fulfillment):** Là tác vụ vận hành thời gian thực diễn ra hàng giờ, hàng ngày. Nhân viên kho của shop phải liên tục F5, lọc đơn mới, in phiếu giao, đóng gói, đẩy sang bưu cục GHN.
   - **Sản phẩm (Catalog):** Là tác vụ thiết lập danh mục định kỳ (tuần/tháng). Shop chỉ vào khi đăng sản phẩm mới, cập nhật giá, điều chỉnh số tồn kho hoặc sửa mô tả.
2. **Xung đột Trạng thái Bộ lọc & Bộ nhớ Trang (UI State & Grid Fragmentation):**
   - Cả hai màn hình đều là **Data Grid khổng lồ** với hàng tá bộ lọc (trạng thái, ngày tạo, tìm kiếm từ khóa, phân trang, modal in ấn).
   - Nếu nhét chung vào 1 trang bằng Tab: Khi nhân viên kho đang lọc 20 đơn "Chờ lấy hàng" mà lỡ bấm sang tab "Sản phẩm" để kiểm tra tồn kho, hệ thống sẽ làm mất toàn bộ trạng thái lọc đơn hàng, gây ức chế lớn cho người dùng.
3. **Độ nặng hiển thị (DOM Overhead):**
   - Việc gom cả bảng Sản phẩm và bảng Đơn hàng vào cùng một cấu trúc trang sẽ khiến trang web tải rất nặng và chậm chạp.
4. **Cách bố trí Sidebar tối ưu cho Shop Manager:**
   - Đặt 2 mục này ngay dưới Dashboard ở vị trí ưu tiên cao nhất, đổi tên ngắn gọn:
     - 🏪 `Tổng quan Gian hàng`
     - 📦 `Đơn hàng` *(Không cần chữ "Quản lý")*
     - 🏷️ `Sản phẩm` *(Không cần chữ "Danh mục")*

---

## 2. ĐÁNH GIÁ GIAO DIỆN "DANH MỤC SẢN PHẨM" (HÌNH 1)

### 🔍 Các hạt sạn cụ thể trên Hình 1:
1. **Dòng mô tả thừa thãi:**
   - Dòng chữ: *"Quản lý kho SKU, biến thể đa tầng và chính sách hoa hồng tiếp thị liên kết"* là văn phong giải thích lý thuyết. Người bán hàng mở trang "Sản phẩm" lên là tự khắc biết đây là trang quản lý sản phẩm, không cần hệ thống phải đọc định nghĩa.
2. **Xuất hiện tới 2 nút "+ Thêm sản phẩm":**
   - Nút 1: Nằm ở góc trên cùng bên phải (`+ Thêm sản phẩm` màu be).
   - Nút 2: Nằm ngay cạnh ô tìm kiếm và dropdown bộ lọc bên dưới (`+ Thêm sản phẩm`).
   - *Hậu quả:* Gây phân mảnh thị giác, vi phạm nguyên tắc "Single Primary CTA" của UI chuyên nghiệp.
3. **Lỗi co cụm & Rớt dòng tiêu đề bảng (Table Header Wrapping):**
   - Cột **"HOA HỒNG NỀN"** và **"TỒN KHO"** bị co hẹp đến mức chữ bị bẻ xuống 2-3 hàng (`HOA \n HỒNG \n NỀN`). Nhìn rất bí bách và thiếu cân đối.

### 🛠️ Giải pháp Chuẩn hóa:
- **Xóa vĩnh viễn** dòng mô tả phụ bên dưới tiêu đề.
- **Xóa bỏ nút "+ Thêm sản phẩm" thứ 2** ở khay tìm kiếm, chỉ giữ 1 nút duy nhất ở góc trên bên phải header trang.
- **Căn chỉnh độ rộng cột bảng:**
  - Cột `SẢN PHẨM`: Chiếm 40% (Ảnh thumbnail + Tên sạch + SKU con mờ).
  - Cột `GIÁ BÁN`: `min-w-[110px]`, căn phải hoặc căn trái thẳng hàng.
  - Cột `HOA HỒNG NỀN`: `min-w-[110px]`, `whitespace-nowrap`, giữ nguyên trên 1 dòng.
  - Cột `TỒN KHO`: `min-w-[90px]`, `whitespace-nowrap`.
  - Cột `TRẠNG THÁI`: `min-w-[130px]`.
  - Cột `THAO TÁC`: Đặt ở cuối với các icon có tooltip gọn (`Chỉnh sửa`, `Xem trước`, `Xóa`).

---

## 3. QUẢN LÝ ĐƠN HÀNG & XỬ LÝ HÀNG LOẠT (BULK ACTIONS)

### ❓ Câu hỏi của User:
> *"Quản lý đơn hàng nhiều chi tiết quá nên nó không hiện hết phải kéo qua kéo lại, chỉ nên hiện những thứ cần thiết thôi còn lại bỏ vào nút gì đó để xem chi tiết. Với lại nếu nhiều đơn hàng quá cùng 1 lúc thì sao, chẳng lẽ shop ngồi bấm từng đơn? Ngoài đời chuẩn business như thế nào?"*

### 🏪 Chuẩn Shopee / TikTok Shop ngoài đời khi xử lý đơn hàng:
Trên các sàn TMĐT lớn, quy trình xử lý đơn hàng của Merchant được chuẩn hóa qua 2 tầng:

```
[Tầng 1: Data Grid Tinh Gọn] 
   └── Chỉ hiển thị thông tin phục vụ ĐIỀU PHỐI & PHÂN LOẠI
       (Mã đơn, Tóm tắt sản phẩm, Tổng tiền, Trạng thái, Vận đơn)

[Tầng 2: Drawer / Modal Chi Tiết Đơn Hàng]
   └── Nơi xem toàn bộ: Địa chỉ đầy đủ, SĐT, Log hoa hồng CTV, Chi tiết hoàn trả tiền
```

Và đặc biệt: **KHÔNG AI BẤM TỪNG ĐƠN KHI CÓ HÀNG CHỤC/HÀNG TRĂM ĐƠN HÀNG!**

### 📦 Quy trình Xử lý Hàng loạt (Bulk Fulfillment):
1. **Thanh Thao tác Hàng loạt (Batch Action Bar):**
   - Khi Shop Manager tích vào Checkbox đầu bảng ("Chọn tất cả đơn chờ giao"):
   - Một thanh công cụ màu vàng be nổi lên hiển thị: `Đã chọn: X đơn hàng`.
   - Cung cấp 3 nút hành động tập trung:
     1. 🚚 **"Chuẩn bị hàng loạt":** Tự động phát hành mã vận đơn GHN cho toàn bộ các đơn được chọn trong 1 cú click.
     2. 🖨️ **"In phiếu giao hàng loạt":** Gom toàn bộ mã vận đơn đã tạo thành 1 file in nhiệt (khổ A6 100x150 mm) để nhân viên dán lên kiện hàng.
     3. 📑 **"Xuất danh sách Excel":** Xuất file kiểm kho cho tài xế GHN ký nhận.

### 📋 Cắt giảm Cột trên Bảng Danh sách Đơn hàng:
| Cột Cũ (Rườm rà) | Vấn đề | Đề xuất Chuẩn hóa |
| :--- | :--- | :--- |
| **KHÁCH HÀNG (Tên + SĐT)** | Chiếm nhiều diện tích, rủi ro bảo mật thông tin khách | Gộp thành tên khách ngắn gọn. SĐT và địa chỉ chỉ hiện khi bấm vào "Chi tiết đơn". |
| **HOA HỒNG CTV (`Nguyễn Mai Anh -37.500 đ`)** | Đây là thông tin tài chính đối soát nội bộ, nhân viên kho đóng gói không cần nhìn thấy thường trực | **ẨN KHỎI BẢNG TỔNG.** Đưa vào mục "Phân bổ Tiếp thị & Hoa hồng" trong Modal Chi tiết đơn. |
| **SẢN PHẨM** | Tên dài, ảnh lớn làm bảng bị kéo ngang | Ảnh thumbnail 36x36 px + Tên tóm tắt + Huy hiệu `x1`, `x2`. |
| **THAO TÁC** | Chỉ có 1 icon xe tải nhỏ | Nút hành động theo ngữ cảnh trạng thái: Nếu đơn `Chờ lấy hàng` -> hiện nút `Chuẩn bị hàng`; nếu đã có vận đơn -> hiện nút `In phiếu` + nút `Chi tiết`. |

---

## 4. HÀNG MẪU CHO KOL & TINH GỌN LUỒNG DUYỆT (HÌNH 3)

### 🔍 Bóc tách Vấn đề trên Hình 3:
1. **Dòng thông báo gây rối não:**
   > *(Phí vận chuyển hàng mẫu · Shop chi trả 100% KOL nhận mẫu với COD 0 đ. Cước bên dưới do GHN báo khi tạo vận đơn, chưa phải xác nhận thanh toán. 0 đ đã ghi nhận 0 vận đơn chưa xác nhận cước)*
   - **User hỏi:** *"0 đ ở đây là gì, có cần thiết để ko?"*
   - **Trả lời:** **HOÀN TOÀN KHÔNG CẦN THIẾT VÀ NÊN XÓA BỎ NGAY.**
   - *Bản chất:* Đây là tàn tích của một module tính cước tạm tính sandbox GHN cũ. Thực tế khi gửi mẫu, shop đã biết trước là shop chịu phí ship; việc nhồi nhét dòng chữ "0 đ đã ghi nhận 0 vận đơn chưa xác nhận cước" chỉ làm chủ shop hoang mang tưởng hệ thống bị lỗi tính tiền!
2. **4 Thẻ Thống kê Trạng thái Hàng mẫu:**
   - Hiện tại có các dòng mô tả dài bên dưới số:
     - `Mẫu chờ duyệt` -> bên dưới chú thích: *"Cần shop duyệt cấp mẫu"* (Thừa).
     - `Mẫu chờ gửi (Đóng gói)` -> chú thích: *"Chờ tạo mã vận đơn GHN"* (Thừa).
     - `Video chờ nghiệm thu` -> chú thích: *"KOL đã gửi video review"* (Thừa).
     - `Quá hạn 14 ngày` -> chú thích: *"Đã khóa xin mẫu toàn sàn"* (Thừa).
3. **Vị trí của Tab Hàng Mẫu:**
   - Hiện tại Hàng mẫu đang bị nhét vào bên trong `/merchant/orders?tab=samples`.
   - *Hạn chế:* Hàng mẫu KOL là nghiệp vụ **Marketing & Hợp tác Creator**, không phải là đơn bán hàng thương mại cho người tiêu dùng.
   - *Đề xuất:* Đưa chức năng Duyệt hàng mẫu về đúng phân hệ: **"Mạng lưới KOL & Hợp tác" (`/merchant/kol-hub?tab=samples`)**.

---

## 5. KHUYẾN MÃI & HOA HỒNG VÀ TAB "HOA HỒNG & THƯỞNG"

### ❓ Câu hỏi của User:
> *"Phần khuyến mãi hoa hồng shop hình như tab hoa hồng và thưởng không còn dùng hoặc là nó ở sai nơi ấy, tìm hiểu thêm về cái này hoặc xóa?"*

### 🔍 Bản chất Kỹ thuật & Nghiệp vụ của Tab này:
1. **Nó là gì trong hệ thống?**
   - Tab `commission-rules` (`CommissionRulesPage.tsx`) chính là màn hình cấu hình cho **FR-09: Thưởng mốc doanh số tháng (Monthly Revenue Bonus Milestones)**.
   - Cơ chế: Shop tạo các bậc thang doanh số cho KOL (Ví dụ: Đạt 50 triệu/tháng -> Thưởng thêm 1 triệu; Đạt 100 triệu/tháng -> Thưởng thêm 3.5%).
2. **Tại sao gây hoang mang cho User?**
   - Do đặt tên là **"Hoa hồng & thưởng"** nằm chung với tab "Mã giảm giá", Chủ shop sẽ tưởng rằng đây là nơi chỉnh % hoa hồng sản phẩm (nhưng thực tế hoa hồng gốc 10% đã nằm ở từng sản phẩm).
3. **Khuyến nghị Tái cơ cấu:**
   - **Phương án 1 (Khuyên dùng):** Đổi tên tab thành **"Thưởng mốc doanh số (KPI)"** thay vì ghi chung chung "Hoa hồng & thưởng".
   - **Phương án 2 (Đúng chuẩn Shopee Marketing Centre):**
     - Menu **"Khuyến mãi" (`/merchant/promotions`)** chỉ chứa các công cụ giảm giá cho khách hàng: `Mã giảm giá (Coupons)`, `Chiến dịch sàn (Campaigns)`.
     - Chuyển toàn bộ các công cụ đãi ngộ KOL (`Thỏa thuận độc quyền`, `Thưởng mốc doanh số KPI`, `Link tiếp thị`) sang menu **"Mạng lưới KOL & Hợp tác" (`/merchant/kol-hub`)**.

---

## 6. MÃ GIẢM GIÁ ĐỘC QUYỀN CỦA KOL (HÌNH 4)

### 🔍 Các lỗi giao diện cụ thể trên Hình 4:
1. **Lặp nút 2 lần:**
   - Góc trên bên phải có nút: `+ Đề xuất mã riêng`.
   - Dưới thanh bộ lọc trạng thái lại có thêm nút: `+ Đề xuất mã mới`.
   - *Khắc phục:* Xóa nút ở dưới, chỉ giữ duy nhất 1 nút chính trên Header.
2. **Mã Voucher dài làm vỡ bố cục Card:**
   - Mã voucher `NGUYENMA5BAEDECO...` do hệ thống tự sinh chuỗi UUID ngẫu nhiên quá dài, khiến chữ bị tràn, nút `Chép mã` bị ép sát mép card.
   - *Khắc phục chuẩn TMĐT:*
     - Mã coupon chỉ nên giới hạn từ 6 đến 12 ký tự viết hoa dễ nhớ (Ví dụ: `SORA10K`, `NHATXINH`, `MAIANH15`).
     - Tự động hiển thị `copy button` gọn gàng, có hiệu ứng `Copied!` tinh tế.
3. **Thẻ Card Coupon thiếu chất lượng thị giác:**
   - Cần bổ sung Logo gian hàng nhỏ bên cạnh tên shop để tăng tính nhận diện đối tác.

---

## 7. PHÂN ĐỊNH SYSTEM ADMIN VS SYSTEM MANAGER

### ❓ Ý kiến của User:
> *"Phân tích ngoài đời thì Admin với Manager System nên chia các công việc như thế nào, theo tôi thì Admin sẽ quản lý tiền và tài khoản của các System Manager như tạo tài khoản cho họ, theo bạn chia công việc hiện tại trên UI của Admin vận hành ra sao, có cần thay đổi nhiều không?"*

### 🏛️ Chuẩn mực Vận hành Sàn TMĐT Ngoài đời Thực (Shopee / TikTok Shop):
Ý kiến của bạn là **HOÀN TOÀN CHÍNH XÁC VÀ RẤT CHUẨN DOANH NGHIỆP!** Ngoài đời thực, sự phân cấp giữa Cấp Vận hành (Operations) và Cấp Quản trị tối cao (Executive Admin) rất nghiêm ngặt:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SYSTEM_ADMIN (Quản trị Tối cao / C-Level)             │
│  - Quản trị Tiền & Rút vốn Sàn (Treasury & Financial Governance)       │
│  - Quản trị Tài khoản Nhân viên Vận hành & Phân quyền (/admin/users)   │
│  - Cấu hình Tham số Cốt lõi Sàn (Trần hoa hồng, Phí sàn, Escrow SLA)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Giám sát & Trao quyền
┌───────────────────────────────────▼────────────────────────────────────┐
│              SYSTEM_MANAGER (Chuyên viên Vận hành / Operations)        │
│  - Xử lý Sự vụ Hàng ngày (Daily Ops):                                   │
│    + Thẩm định hồ sơ KYC (CCCD, GPKD)                                  │
│    + Kiểm duyệt sản phẩm Shop mới đăng (Product Moderation)            │
│    + Trọng tài hàng mẫu KOL vi phạm cam kết 14 ngày (Sample Disputes)  │
│    + Xử lý Khiếu nại đổi trả / Tranh chấp hoàn tiền (Refunds)          │
│    + Giám sát gian lận lưu lượng link (Traffic Fraud Sentinel)         │
│  - TUYỆT ĐỐI KHÔNG ĐƯỢC: Sửa số dư sàn, duyệt rút tiền lớn, tạo user   │
└────────────────────────────────────────────────────────────────────────┘
```

### 📊 So sánh Ma trận Phân quyền & UI Đề xuất:

| Phân hệ / Chức năng | SYSTEM_MANAGER (Vận hành) | SYSTEM_ADMIN (Quản trị Tối cao) | Hiện trạng UI & Đề xuất Sửa |
| :--- | :---: | :---: | :--- |
| **Báo cáo Doanh số & Vận hành** | Chỉ xem số liệu vận hành ngày (Đơn hàng, số KYC chờ duyệt, số khiếu nại) | Xem báo cáo GMV toàn sàn, tổng hoa hồng sàn thu về, dòng tiền Escrow | Cần phân tách 2 dashboard: Dashboard Tác nghiệp vs Dashboard Tài chính |
| **Quản trị Chi trả & Dòng tiền (`/admin/payouts`)** | ❌ **KHÔNG CÓ QUYỀN** *(Chỉ xem trạng thái đối soát nếu được giao)* | ✅ **TOÀN QUYỀN PHÊ DUYỆT RÚT TIỀN TỶ & DÒNG TIỀN VÍ SÀN** | Hiện tại cả 2 role đang thấy menu này -> **Bỏ menu Payouts khỏi System Manager!** |
| **Quản lý Tài khoản & Phân quyền (`/admin/users`)** | ❌ Không được cấp quyền hay tạo tài khoản nhân sự | ✅ **ĐỘC QUYỀN:** Tạo tài khoản System Manager, khóa/mở tài khoản, phân vai trò | Đổi tên menu của Admin thành `Nhân sự & Phân quyền` |
| **Thẩm định & Duyệt KYC** | ✅ **Trực tiếp thẩm định:** So khớp CCCD, duyệt GPKD doanh nghiệp | ✅ Có quyền xem hoặc can thiệp cấp cao | Manager là người làm chính |
| **Kiểm duyệt Sản phẩm mới** | ✅ **Trực tiếp kiểm duyệt:** Check ảnh, giấy phép, công bố mỹ phẩm | ✅ Kế thừa toàn quyền | Manager xử lý hàng đợi duyệt |
| **Trọng tài Hàng mẫu KOL** | ✅ **Xử lý vi phạm:** Phạt khóa tài khoản KOL nhận mẫu không nộp video | ✅ Kế thừa toàn quyền | Manager xử lý hàng đợi tranh chấp |
| **Khiếu nại Đổi trả & Hoàn tiền** | ✅ **Trọng tài tranh chấp:** Phán quyết hoàn tiền cho khách hay trả hàng cho shop | ✅ Kế thừa toàn quyền | Manager làm trung gian Escrow |
| **AI Giám sát Gian lận Sàn** | ✅ Tra cứu và khóa tạm link vi phạm traffic bẩn | ✅ Xem phân tích rủi ro hệ thống | Cả 2 cùng sử dụng theo cấp độ |

---

## 8. BỘ QUY TẮC GIAO DIỆN TỐI GIẢN (MINIMALIST B2B STANDARDS)

Để toàn bộ website SCANMS đạt đẳng cấp chuyên nghiệp như một sản phẩm SaaS thương mại thực thụ, toàn bộ giao diện cần tuân thủ 4 nguyên tắc vàng:

### 1. "No Instructional Lecturing" (Xóa bỏ văn phong dạy việc)
- Không dùng các câu dài dòng như: *"Quản lý kho SKU, biến thể đa tầng và chính sách hoa hồng..."*, *"Cần shop duyệt cấp mẫu để KOL nhận hàng..."*, *"Phí vận chuyển do GHN báo chưa phải xác nhận..."*.
- Thay bằng **Nhãn trực quan 2-3 từ**: `Sản phẩm`, `Đơn hàng`, `Chờ duyệt`, `Đang giao`, `Quá hạn`.

### 2. "Single Primary CTA" (Một màn hình - Một hành động chính)
- Không bao giờ đặt 2 nút có cùng tính năng trên cùng 1 viewport (như 2 nút "+ Thêm sản phẩm", 2 nút "+ Đề xuất mã").
- CTA chính luôn đặt ở góc trên bên phải header với màu thương hiệu `Brand Gold (#C59B58)`.

### 3. "Progressive Disclosure" (Hiển thị lũy tiến)
- Bảng danh sách chỉ hiển thị 5-6 cột sống còn để quét nhanh bằng mắt.
- Toàn bộ thông tin chi tiết (SĐT khách, địa chỉ ngõ ngách, chi tiết phân bổ hoa hồng, log lịch sử) đưa vào **Drawer (ngăn kéo bên phải)** hoặc **Modal Chi tiết**.

### 4. "Consistent Atomic Tokens & Professional Icons"
- Icon 100% sử dụng thư viện `Lucide React` chuẩn mực, kích thước đồng nhất `16px - 18px`.
- Tuyệt đối không dùng emoji hoạt hình (`📦`, `🧴`, `💄`, `💊`) trong các bảng nghiệp vụ chuyên nghiệp.
- Màu sắc tuân thủ nghiêm ngặt bảng màu Vàng Be: Canvas `#FAF8F5`, Sand Surface `#F3EFE6`, Brand Gold `#C59B58`, Ink `#1A1612`, Muted `#7D715E`.

---

## 📌 BẢNG TỔNG HỢP KIẾN NGHỊ THỰC THI (ACTIONABLE ROADMAP)

| Hạng mục | Vấn đề hiện tại | Hành động tinh gọn |
| :--- | :--- | :--- |
| **Sidebar Shop** | Cân nhắc gộp Sản phẩm & Đơn hàng | **Giữ nguyên 2 menu riêng biệt**, đổi tên thành `Đơn hàng` & `Sản phẩm` |
| **Trang Sản phẩm (Hình 1)** | Thừa mô tả dài dòng, 2 nút "+ Thêm sản phẩm", tiêu đề cột rớt hàng | Xóa mô tả, xóa nút phụ ở khay lọc, set `min-width` chống rớt dòng cột |
| **Trang Đơn hàng (Hình 2)** | Bảng quá nhiều cột phải scroll ngang, chưa có thao tác hàng loạt | Bỏ bớt cột phụ (Hoa hồng CTV, SĐT); Thêm cụm **"Xử lý hàng loạt" (Chuẩn bị hàng loạt, In vận đơn hàng loạt)** |
| **Trang Hàng mẫu (Hình 3)** | Dòng banner "0 đ cước GHN" vô nghĩa, KPI thừa chữ giải thích | **Xóa bỏ hoàn toàn banner 0 đ**, xóa chú thích phụ của 4 thẻ KPI |
| **Khuyến mãi Shop** | Tab "Hoa hồng & thưởng" gây hiểu lầm | Đổi tên thành **"Thưởng mốc doanh số (KPI)"** để phản ánh đúng FR-09 |
| **Mã giảm giá KOL (Hình 4)**| Trùng lặp nút Đề xuất mã, mã voucher dài vỡ layout | Bỏ nút lặp, chuẩn hóa độ dài mã coupon, căn chỉnh khoảng cách card |
| **Phân quyền Admin** | Manager bị lẫn quyền rút tiền Payout của Admin | **Ẩn menu Payouts khỏi Manager**, dành riêng cho Admin quản lý tài chính & phân quyền |
