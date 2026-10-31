# SCANMS SYSTEM INSTRUCTIONS & IMMUTABLE MEMORY

> ⚠️ **LƯU Ý QUAN TRỌNG VỀ BỘ NHỚ VĨNH VIỄN:**  
> File này lưu trữ các chỉ thị bất biến của dự án SCANMS (FA26SE032). Mọi tương tác, lập trình Frontend/Backend, cập nhật tài liệu hoặc thiết kế UI **BẮT BUỘC PHẢI TUÂN THỦ 100%**, không được làm trái trong bất kỳ hoàn cảnh nào.

---

## 1. 🎨 HỆ THỐNG MÀU SẮC CHỦ ĐẠO TỐI THƯỢNG: VÀNG BE (WARM SAND & BRAND GOLD)

### ❌ ĐIỀU CẤM TUYỆT ĐỐI:
- **NGHIÊM CẤM:** **KHÔNG BAO GIỜ** được sử dụng màu **XANH LÁ CÂY (Emerald / Teal / Mint `#0F766E`, `#10B981`, `#0D5C52`, `#EDF7F4`,...)** làm màu chủ đạo, màu nền, màu thanh header hay màu nút bấm thương hiệu!
- **Lý do:** Màu xanh lá trong một số file ảnh xuất Figma cũ là bản vẽ nháp chưa sửa xong của nhóm. Màu sắc thương hiệu chính thức đã được Leader Nguyễn Thành Thắng chốt là **VÀNG BE**.
- Màu xanh lá chỉ được dùng duy nhất cho:
  - Icon tick xác minh nhỏ (`CheckCircle` $14\text{px}$)
  - Chỉ số % tăng trưởng tài chính dương nhỏ (`+12.4%`)
  - **TUYỆT ĐỐI KHÔNG DÙNG CHO NỀN, HEADER, SIDEBAR, HOẶC NÚT BẤM (BUTTON/CTA)**.

### ✅ BẢNG MÃ MÀU CHUẨN ĐƯỢC PHÉP SỬ DỤNG (WARM SAND GOLD TOKENS):
| Token CSS / Tailwind | Hex Code | Ý Nghĩa / Vị Trí Bắt Buộc |
| :--- | :--- | :--- |
| `--canvas` | `#FAF8F5` | Nền toàn bộ website (Soft Warm Cream) |
| `--surface-sand` | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ, bộ lọc (Warm Sand) |
| `--surface` | `#FFFFFF` | Nền thẻ Card chính, ô form, modal |
| `--brand` | `#C59B58` | Nút bấm chính ("Đăng nhập an toàn", "Đặt mua ngay", "Thêm vào giỏ"), CTA chính |
| `--brand-strong` | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, trạng thái active, viền nút khi hover |
| `--brand-soft` | `#FBF5EB` | Nền badge ưu đãi, nền pill hoa hồng KOL, box giảm giá |
| `--brand-border` | `#EEDFC6` | Viền badge ưu đãi, viền hộp thông tin |
| `--brand-dark` | `#231D15` | Nút phụ sang trọng (Dark Accent), thanh header tương phản cao |
| `--line` / `--border` | `#EAE4D7` | Đường kẻ phân cách, viền ô nhập liệu (Input), viền thẻ Card |
| `--ink` | `#1A1612` | Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính (Deep Ink) |
| `--muted` | `#7D715E` | Màu chữ phụ, mô tả, chú thích, nhãn phụ (Warm Muted) |
| `--warning` | `#D97706` | Trạng thái Chờ xử lý (Pending) / Cảnh báo |
| `--danger` | `#DC2626` | Trạng thái lỗi, từ chối, cảnh báo vi phạm |

---

## 2. 🏛️ BẢN SẮC NỀN TẢNG DOANH NGHIỆP (ENTERPRISE IN-HOUSE AFFILIATE NETWORK)

> [!IMPORTANT]
> **ĐỊNH VỊ CỐT LÕI TỪ MENTOR & DOANH NGHIỆP:**
> 1. **Bản chất hệ thống:** SCANMS là **Hệ Thống Quản Trị Đội Ngũ Đối Tác Tiếp Thị & Tiếp Thị Liên Kết Nội Bộ Doanh Nghiệp (Enterprise In-House Sales Collaborator & Affiliate Network Management System)**.
> 2. **Mô hình sở hữu:** Thuộc sở hữu của một **Tập đoàn Bán lẻ / Doanh nghiệp D2C Đa Ngành (House of Brands / Multi-Category Retail Conglomerate)** tương tự mô hình *MWG (Thế Giới Di Động, Điện Máy Xanh, An Khang)* hay *Coolmate D2C (Coolmate, 84RISING, CM24)*.
> 3. **Nguyên tắc "Trong - Ngoài" bất biến:**  
>    **"SHOP LÀ CỦA MÌNH (In-House Brands trực thuộc), CỘNG TÁC VIÊN / KOC LÀ BÊN NGOÀI"**.
> 4. **TUYỆT ĐỐI KHÔNG BIẾN THÀNH SÀN CHỢ TMĐT TỰ DO (No Shopee/Lazada Clone):** Không cho phép người lạ ngoài đường tự do mở shop bán hàng lung tung. Toàn bộ Cửa hàng là các đơn vị kinh doanh nội bộ của công ty.

### 🏪 4 Khối Cửa Hàng Trực Thuộc Chuyên Sâu & Logistics Kho Vệ Tinh (Multi-Warehouse):
| Nhãn hàng / Đơn vị (`Store`) | Ngành hàng Cố định (`primaryCategory`) | Kho Xuất Hàng GHN Vệ Tinh (Fulfillment Warehouse) | Tệp KOC / CTV Mục tiêu |
| :--- | :--- | :--- | :--- |
| **Store 1: Sora Skincare & Cosmetics** | Mỹ phẩm & Chăm sóc da chuyên sâu | Kho Mát Dược Mỹ phẩm GMP, Khu Công Nghệ Cao, TP.Thủ Đức (`from_district_id: 1442`, `from_ward_code: 20109`) | KOC Beauty, Skincare Reviewers, Dược mỹ phẩm Bloggers |
| **Store 2: Aura Activewear & Apparel** | Thời trang & May mặc thể thao năng động | Kho May Mặc Thời Trang, 128/4 Hoàng Hoa Thám, P.12, Tân Bình, TP.HCM (`from_district_id: 1444`, `from_ward_code: 20708`) | Fashion TikTokers, Gymer, Lifestyle Influencers |
| **Store 3: GreenBio Health & Nutrition** | Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên | Kho Dược Liệu & Thực Phẩm Sức Khỏe, Tân Phú, TP.HCM (`from_district_id: 1452`, `from_ward_code: 21011`) | KOC Dinh dưỡng Eat-clean, Huấn luyện viên Yoga, Dược sĩ |
| **Store 4: Lumière Smart Living** | Thiết bị gia dụng & Đồ bếp thông minh | Kho Tổng Thiết Bị & Đồ Bếp, Lô B4 KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM (`from_district_id: 1452`, `from_ward_code: 21011`) | KOC Gia đình, Review đồ bếp thông minh, Food Bloggers |

### 🚫 Quy Tắc Chống Trùng Hàng Hóa Giữa Các Nhãn Hàng:
- **Tuyệt đối không được trùng hàng giữa các Store:** Tránh hiện tượng nội bộ tự triệt tiêu nhau (*Cannibalization*).
- **Cơ chế 3 lớp kiểm soát:**  
  1. *Lớp 1:* Kiểm tra trùng mã vạch vật lý Barcode EAN-13 / Model SKU cứng.  
  2. *Lớp 2:* AI Fuzzy Semantic Matching cảnh báo tên sản phẩm tương đồng ngữ nghĩa $> 80\%$.  
  3. *Lớp 3:* Thẩm định kiểm duyệt trung ương Maker - Checker của `SYSTEM_MANAGER`.

---

## 3. 👤 THÔNG TIN VAI TRÒ & PHÂN CÔNG THÀNH VIÊN (TEAM FA26SE032)

- **User:** **Nguyễn Thành Thắng** - Team Leader dự án SCANMS (FA26SE032).
- **Phạm vi chức năng cốt lõi của Thắng (FR-01 đến FR-08):**
  - `FR-01`: Đăng ký tài khoản đa vai trò + mã hóa mật khẩu Argon2.
  - `FR-02`: Đăng nhập an toàn + JWT Access/Refresh tokens + Rate Limiting.
  - `FR-03`: Xác thực 2 bước (2FA OTP) + Khôi phục mật khẩu qua Email.
  - `FR-04`: Phân quyền người dùng theo vai trò (RBAC Guard).
  - `FR-05`: Nộp hồ sơ định danh điện tử eKYC (CCCD, STK Ngân hàng, Kênh Mạng xã hội).
  - `FR-06`: Xét duyệt hồ sơ eKYC đa cấp (System Manager thẩm định Maker-Checker).
  - `FR-07`: Quản lý danh mục & liên kết tài khoản Mạng xã hội của KOC (TikTok, FB, YouTube...).
  - `FR-08`: Kho nội dung số tập trung (Media Hub) chia sẻ tài nguyên quảng bá HD.

### 📋 Bảng Phân Công 5 Main Flows Bảo Vệ Trước Hội Đồng:
| Thành viên | Main Flow Phụ trách Trình bày & Demo | Trọng tâm Bảo vệ Kỹ thuật & Code (Defense Focus) |
| :--- | :--- | :--- |
| **1. Nguyễn Thành Thắng** *(Leader)* | **Main Flow 1** *(Onboarding Nhân Sự, eKYC Đối Tác & Kênh MXH FR-07)* + **Nửa sau Main Flow 5** *(Executive Dashboard, Phân tách SoD, Thuế TNCN 10% & Sổ cái)* | RBAC 5 Roles, Cấp tài khoản nội bộ vs Đăng ký ngoài, Thẩm định eKYC & Kênh MXH, Phân tách trách nhiệm (SoD), Khóa dòng `SELECT ... FOR UPDATE` chống race-condition rút tiền, Thuật toán tính Thuế TNCN 10% & Sổ cái tài chính bất biến. |
| **2. Phan Xuân Thịnh** | **Main Flow 2** *(Khóa Ngành Hàng, Hợp Tác 2 Chiều & AI Matchmaker)* + **Nửa đầu Main Flow 3** *(Chat Realtime & Thỏa thuận VIP)* | Thuật toán AI Radar 4 Trục trong `ai-recommendation.service.ts`, Thị trường hợp tác 2 chiều (Shop mời KOC & KOC xin hợp tác), Kiến trúc WebSocket Socket.IO đàm phán gửi Thẻ mời chiến dịch VIP realtime. |
| **3. Nguyễn Đình Tuấn** | **Nửa sau Main Flow 3** *(Tài Trợ Hàng Mẫu SLA 14 Ngày)* + **Nửa đầu Main Flow 4** *(Attribution, Link/QR, Coupon Định Danh & Chống Tự Mua)* | Quản trị hàng mẫu và đồng hồ SLA 14 ngày `deal-kpi.policy.ts`, Bộ sinh Smart Link / Dynamic QR, Coupon Attribution `THAONHI16`, Động cơ AI Fraud Sentinel phát hiện gian lận tự mua (Self-referral). |
| **4. Nguyễn Phú Quý** | **Nửa sau Main Flow 4** *(Giao Nhận GHN & Xử Lý Đổi Trả / Bù Hàng Mới / Clawback)* + **Nửa đầu Main Flow 5** *(Bảo Chứng Escrow & Thưởng Mốc Doanh Số FR-09)* | Tích hợp vận đơn GHN, Xử lý đổi trả: Bù hàng mới 1-1 giữ nguyên hoa hồng vs Hoàn tiền kích hoạt Clawback Engine, Cơ chế Tạm giữ Bảo chứng Escrow 7-14 ngày, Thuật toán quyết toán thưởng mốc tháng FR-09 & thăng hạng KOC. |

---

## 4. 👥 HỆ THỐNG 5 ROLES & MA TRẬN PHÂN QUYỀN RBAC CHUẨN MỰC

Hệ thống chuẩn hóa duy nhất **5 User Roles** (khớp 1:1 với `enum UserRole` trong `schema.prisma` và `auth.service.ts`). **Tuyệt đối không sinh thêm role phụ**:

1. **`CUSTOMER` (Khách Mua Hàng):**
   - Duyệt xem sản phẩm, xem livestream bổ trợ, quét Dynamic QR hoặc bấm Smart Link tiếp thị.
   - Nhập mã ưu đãi độc quyền của KOC (`THAONHI16`), thanh toán VietQR / PayOS / COD.
   - Theo dõi vận đơn GHN, gửi yêu cầu đổi hàng / hoàn tiền khi sản phẩm có sự cố.
   - Nâng cấp nộp hồ sơ trở thành Đối tác Tiếp thị (`/customer/portal`).

2. **`COLLABORATOR` (Đối tác Tiếp thị / KOC / Affiliate Partner):**
   - Nộp eKYC cá nhân (CCCD, STK ngân hàng thụ hưởng, liên kết kênh MXH TikTok/FB/YouTube - FR-07).
   - Khởi điểm tại **Hạng ĐỒNG (Bronze - 10% cơ sở)**; tự động thăng hạng Bạc (11%), Vàng (12%), Kim Cương (13%) theo doanh số sạch tích lũy.
   - Khai thác Kho tài nguyên số (`Media Hub` - FR-08) tải ảnh/video HD về làm nội dung quảng bá.
   - Sinh Smart Link, Dynamic QR và sở hữu Coupon độc quyền định danh cá nhân (ví dụ: `THAONHI16`).
   - Mượn sản phẩm mẫu trải nghiệm với cam kết trả bài review trong thời hạn 14 ngày SLA.
   - Nhận thù lao đơn hàng thành công sau 7 ngày bảo chứng Escrow và rút tiền Napas 24/7 (khấu trừ 10% thuế TNCN tại nguồn).

3. **`SHOP_MANAGER` (Giám đốc Nhãn hàng / Brand Manager Nội bộ):**
   - **Là nhân sự nội bộ công ty:** Do `SYSTEM_ADMIN` trực tiếp bổ nhiệm tại `/admin/personnel` và gán `storeId`. **Tuyệt đối không có form tự đăng ký Shop ngoài**.
   - **Không rút tiền doanh thu:** Toàn bộ tiền bán hàng thuộc về doanh nghiệp; Shop Manager theo dõi Báo Cáo Doanh Thu & Chi Phí Tiếp Thị (Store P&L & Commission Expenses).
   - Quản lý sản phẩm tuân thủ **Khóa Ngành Hàng (Category Lock)** và quy trình 6 khối logic TMĐT.
   - Sử dụng AI Matchmaker tìm kiếm Top KOC phù hợp; chủ động mời KOC hoặc tiếp nhận đề xuất từ KOC.
   - Đàm phán và chốt Deal VIP độc quyền qua Chat Socket.IO trong khung tự trị cho phép ($\le 16\%$).
   - Thẩm duyệt và phê duyệt xuất kho hàng mẫu 0đ cho KOC phục vụ sáng tạo nội dung.

4. **`SYSTEM_MANAGER` (Chuyên viên Kế toán & Vận hành Sàn - Operations & Finance Lead):**
   - Trực tiếp xử lý tác vụ kế toán và vận hành hàng ngày:
     - Thẩm định và phê duyệt hồ sơ eKYC cá nhân của KOC (Maker-Checker).
     - Kiểm duyệt sản phẩm nhãn hàng mới đăng (`Product Moderation`) về pháp lý, công bố y tế và chống trùng mã vạch.
     - **Phê duyệt lệnh rút tiền hàng ngày (Daily Payout Approvals):** Đối soát số dư khả dụng, tự động khấu trừ $10\%$ Thuế TNCN tại nguồn và giải ngân Napas 24/7.
     - Xử lý khiếu nại tranh chấp đổi trả: Duyệt hoàn tiền vào Ví khách và kích hoạt **Clawback Engine** thu hồi thù lao KOC về $0₫$.
     - Trọng tài xử lý KOC vi phạm cam kết review hàng mẫu SLA 14 ngày (đưa vào Blacklist).

5. **`SYSTEM_ADMIN` (Quản trị viên Tối cao / Tổng Giám Đốc - CEO & Executive Board):**
   - **Kế thừa 100% quyền hạn của `SYSTEM_MANAGER`** (Master Fallback khi cần thiết).
   - **Nắm giữ 5 Trụ Cột Quyền Lực Chiến Lược Cấp Cao:**
     1. **Độc quyền Quản trị Nhân sự & Khởi tạo Cửa hàng (`/admin/personnel`):** Bổ nhiệm/miễn nhiệm `SHOP_MANAGER` và `SYSTEM_MANAGER`; tạo Store mới, gán ngành hàng độc quyền và cấu hình kho xuất GHN.
     2. **Executive Financial Dashboard (`/admin/analytics`):** Báo cáo GMV toàn hệ thống, Doanh thu tập trung doanh nghiệp, Tỷ trọng chi phí tiếp thị, Dòng tiền Escrow và Quyết toán Thuế TNCN nộp ngân sách nhà nước.
     3. **Thẩm định Ngoại lệ Ngân sách:** Phê duyệt Deal VIP vượt trần ($> 16\%$) và phê duyệt Chiến dịch Giảm giá dưới Giá sàn (`floorPrice`).
     4. **Giám sát An ninh AI Fraud Sentinel:** Phát hiện gian lận tự mua (Self-referral), Cookie Stuffing và Click Flooding.
     5. **Soi xét Nhật ký Kiểm toán Bất biến (`AuditLog`):** Giám sát tính liêm chính của các quyết định chi trả và điều chỉnh hệ thống.

---

## 5. 💰 CƠ CHẾ THÙ LAO MỚI CHUẨN DOANH NGHIỆP: QUY TẮC MỨC ƯU ĐÃI TỐT NHẤT (BEST-BENEFIT PRECEDENCE RULE)

> [!IMPORTANT]
> **LOẠI BỎ TOÀN BỘ CƠ CHẾ CỘNG DỒN DỄ LÀM THỦNG NGÂN SÁCH!**
> Cơ chế cũ cộng dồn vô lý ($10\% \text{ Base} + 3\% \text{ Tier} + 5\% \text{ Deal} + 3\% \text{ Live} = 21\%$) làm mất kiểm soát chi phí bán hàng.
> SCANMS áp dụng **Quy Tắc Mức Ưu Đãi Tốt Nhất (Best-Benefit Precedence / Override Hierarchy)**:

### 📐 Công thức Tính Thù Lao Đơn Hàng:
$$\text{Tỷ Lệ Thù Lao Đơn Hàng} = \max\Big(\text{Deal Độc Quyền VIP},\; \text{Ưu Đãi Chiến Dịch},\; \text{Mức Theo Cấp Bậc},\; \text{Mức Cơ Bản 10\%}\Big) + \text{Thưởng Phiên Live (Nếu có)}$$

1. **Mức 1: Chiết khấu Cơ sở (Standard Base Rate - Cố định 10%):** Dành cho KOC mới tham gia (Hạng Đồng).
2. **Mức 2: Chiết khấu Theo Cấp bậc Năng lực (Performance Tier Rates):**
   - **Hạng Đồng (Bronze):** Khởi điểm khi vừa duyệt eKYC $\rightarrow$ **10%** (0% bonus).
   - **Hạng Bạc (Silver):** Doanh số tích lũy $\ge 20$ triệu $\rightarrow$ **11%** (+1%).
   - **Hạng Vàng (Gold):** Doanh số tích lũy $\ge 50$ triệu $\rightarrow$ **12%** (+2%).
   - **Hạng Kim Cương (Diamond):** Doanh số tích lũy $\ge 100$ triệu $\rightarrow$ **13%** (+3%).
3. **Mức 3: Mức Ưu Đãi Chiến Dịch (Campaign Promotion Rate - Ví dụ: 14%):** Tự động áp dụng khi sản phẩm nằm trong Chiến dịch khuyến mại của nhãn hàng.
4. **Mức 4: Thỏa thuận Hợp đồng Độc quyền (Exclusive Deal Override - Ví dụ: 16% - Ưu tiên cao nhất):** Khi đã ký hợp đồng KPI riêng giữa Giám đốc Nhãn hàng và KOC qua Chat Socket.IO $\rightarrow$ **Mức Deal VIP ghi đè toàn bộ các mức trên**.
5. **Khoản Thưởng Phiên Live Bổ Trợ (Live Accelerator Bonus - +2%):** Đơn hàng phát sinh trong phiên Live giờ vàng được cộng thêm **+2%** thúc đẩy chốt đơn tức thời.
6. **Khoản Thưởng Cán Mốc Doanh Số Tháng (Monthly Milestone Bonus - FR-09):** **Không tính vào % từng đơn hàng**. Đây là khoản thưởng định kỳ độc lập (Kickback Incentive) quét và kết chuyển vào Ví KOC vào ngày cuối tháng nếu đạt mốc doanh số sạch (Ví dụ: Đạt 50tr thưởng thêm 1.000.000₫ hoặc 2% kickback).

### 🛡️ Ma Trận Giới Hạn Thù Lao 3 Tầng:
- **Trần thù lao cứng toàn hệ thống:** Cố định tối đa **25%** cho mọi loại hình tiếp thị.
- **Khung đàm phán tự trị của Shop Manager:** Từ mức cơ sở **10%** đến tối đa **16%**.
- **Cơ chế leo thang phê duyệt (Escalation to Admin):** Nếu Shop muốn ký Deal VIP đặc biệt với Siêu KOC $> 16\%$ (từ $17\%$ đến $25\%$), hợp đồng chuyển sang trạng thái `PENDING_ADMIN_APPROVAL` và bắt buộc phải có `SYSTEM_ADMIN` phê duyệt ngân sách.

---

## 6. 📐 BỘ QUY TẮC NGHIỆP VỤ & QUẢN TRỊ DOANH NGHIỆP THỰC TẾ (REAL-WORLD MARTECH GOVERNANCE)

### 6.1. Khóa Ngành Hàng Sản Phẩm (Category Lock Enforcement):
- Mỗi Store chỉ được phép kinh doanh trong đúng ngành hàng được ủy quyền (`primaryCategory`).
- Trên form tạo/sửa sản phẩm (`ProductManagementPage.tsx`), ô Danh mục tự động điền và bị **KHÓA CỨNG (Readonly / Disabled)**.
- Backend (`products.service.ts`) tự động ép `categoryName = store.category`. Nếu gửi payload danh mục khác, lập tức ném lỗi `400 Bad Request`.

### 6.2. Quản Trị Giá Sàn (Floor Price / MAP) & Đề Xuất Giảm Giá (Maker-Checker):
- Khi tạo sản phẩm, Shop Manager chỉ được nhập **Giá niêm yết (List Price / MSRP)** và **Giá tham chiếu (`originalPrice`)**. Tuyệt đối không cho phép tự gõ đè giá giảm tùy tiện làm bán dưới giá vốn.
- Hệ thống thiết lập **Giá Sàn Bảo Vệ Biên Lợi Nhuận (`floorPrice` / MAP)**:
  $$\text{Floor Price} = \text{Giá vốn (COGS)} + \text{Chi phí vận hành} + \text{Trần thù lao KOC (16\%)} + \text{Biên lãi an toàn}$$
- Mọi chương trình giảm giá/Flash Sale bắt buộc phải tạo **"Đề Xuất Chiến Dịch Khuyến Mãi" (Promotion Campaign Request)**, đảm bảo mức giá $\ge \text{floorPrice}$ và được `SYSTEM_ADMIN` / `SYSTEM_MANAGER` phê duyệt mới có hiệu lực.

### 6.3. Tinh Giản Voucher Rác & Tôn Vinh Coupon Độc Quyền Định Danh KOC (`THAONHI16`):
- **Xóa bỏ 100% voucher rác bán lẻ TMĐT:** Bỏ voucher freeship toàn sàn, voucher hoàn xu tích lũy, voucher chớp nhoáng (ngăn ngừa lỗi cộng dồn làm âm giá đơn).
- **Duy trì duy nhất "Coupon Độc Quyền Định Danh KOC" (`KOL-Exclusive Attribution Coupon`):**
  - Cấu trúc chuẩn hóa: `[TÊN_KOC][MỨC_GIẢM]` (Ví dụ: `THAONHI16`, `LANHUONG10`, `QUANGTRAN12`).
  - **Vai trò kép:**
    1. Giảm giá độc quyền $5\% - 10\%$ cho người theo dõi của KOC.
    2. **Vũ khí Bắt dấu vết Đơn hàng số 1 (Primary Attribution Engine):** Dù khách hàng tắt Cookie, đổi máy hay duyệt web ẩn danh, chỉ cần nhập mã `THAONHI16` tại giỏ hàng là hệ thống ghi nhận chính xác $100\%$ doanh số cho KOC Thảo Nhi.

### 6.4. Cơ Chế Đổi Trả / Hoàn Tiền & Phân Định Trách Nhiệm:
- **Trường hợp 1 - Lỗi do vận chuyển GHN vỡ móp hoặc lỗi xưởng:** Thực hiện **Bù hàng mới 1-1 (Replacement)** $\rightarrow$ Đơn hàng vẫn hoàn thành, **BẢO LƯU 100% THÙ LAO CHO KOC** vì KOC đã hoàn thành xuất sắc nhiệm vụ truyền thông bán hàng.
- **Trường hợp 2 - Khách hàng trả hàng hoàn tiền (Return & Refund):** Tiền hoàn về Ví Khách $\rightarrow$ Hệ thống kích hoạt **Clawback Engine** tự động thu hồi thù lao KOC trên đơn đó về **0₫** (tránh rủi ro KOC thông đồng khách để rút ruột ngân sách hoa hồng).

### 6.5. Ranh Giới Kho Vận & Dòng Vốn: Mua Hàng Xưởng (Procurement) Hoàn Toàn Out of Scope:
- Việc sản xuất OEM, nhập hàng xưởng, thanh toán công nợ nhà máy (AP) và giá vốn (COGS) thuộc hệ thống ERP/SCM nội bộ của doanh nghiệp, **HOÀN TOÀN NGOÀI QUY MÔ (OUT OF SCOPE) của SCANMS**.
- SCANMS chỉ quản lý **Hạn mức tồn kho mở bán cho kênh tiếp thị (`stockQuantity`)**.
- Toàn bộ dòng tiền là **tiền thật $100\%$ do khách thanh toán** (VietQR/PayOS/COD) chảy thẳng về **Tài Khoản Doanh Nghiệp Tập Trung (Corporate Master Account)**.

### 6.6. Phân Tách Trách Nhiệm Chuẩn Kiểm Toán (Segregation of Duties - SoD):
- `SYSTEM_MANAGER` (Kế toán Vận hành) chịu trách nhiệm thẩm định eKYC, duyệt sản phẩm và **phê duyệt lệnh Payout hàng ngày (khấu trừ 10% thuế TNCN)**, giải quyết khiếu nại hoàn tiền & Clawback.
- `SYSTEM_ADMIN` (Tổng Giám Đốc) không duyệt lệnh rút tiền lẻ tẻ, mà tập trung quản trị nhân sự cấp cao (`/admin/personnel`), giám sát Executive Financial Dashboard (`/admin/analytics`), duyệt ngoại lệ ngân sách (> 16%) và giám sát AI Fraud Sentinel cùng Nhật ký Kiểm toán `AuditLog`.

### 6.7. Vị Trí Phân Hệ Livestream Bổ Trợ (Value-Added Feature):
- Livestream là **tính năng bổ trợ / giá trị gia tăng (Bonus Feature)** cho các phiên bán hàng giờ vàng (Mega Live), không bắt buộc đưa vào 5 Main Flows chấm thi chính để tránh loãng thời lượng demo B2B.
- Giữ nguyên vẹn mã nguồn WebRTC/Socket.IO hiện tại (`LiveShoppingRoom.tsx`, `liveBonusRate +2%`, màn hình Ended Stream Overlay chuyên nghiệp).

### 6.8. Tiêu Chuẩn Giao Diện UI/UX Enterprise B2B SaaS Tinh Gọn:
- **Phong cách thiết kế:** Nghiêm túc, thanh lịch, chuẩn mực phần mềm quản trị doanh nghiệp B2B SaaS.
- **Loại bỏ chi tiết thừa thãi:**
  - Tuyệt đối không dùng icon màu mè trẻ con, icon đồ chơi thiếu chuyên nghiệp.
  - Xóa bỏ các dòng chú thích thừa thãi kiểu "cầm tay chỉ việc con nít" (ví dụ: phía trên đã có tên chức năng, phía dưới không chêm thêm 2 dòng giải thích hiển nhiên).
  - Tối ưu khoảng trắng, canh lề quang học chuẩn, typography phân cấp rõ ràng (Deep Ink `#1A1612`, Muted `#7D715E`).
- **Tuân thủ bảng màu Vàng Be (Warm Sand Gold):** Chỉ dùng các token chuẩn `--canvas` `#FAF8F5`, `--surface-sand` `#F3EFE6`, `--brand` `#C59B58`, `--brand-strong` `#B88E4F`.

---

## 7. 📚 BẢNG TỪ ĐIỂN CHUYỂN ĐỔI THUẬT NGỮ CHUẨN DOANH NGHIỆP (ENTERPRISE VOCABULARY MAPPING)

> [!TIP]
> **BẮT BUỘC ÁP DỤNG TRONG GIAO DIỆN UI, TÀI LIỆU, SLIDE VÀ BÁO CÁO HỘI ĐỒNG:**

| Thuật ngữ Cũ (Dễ gây hiểu lầm là Chợ TMĐT) | Thuật ngữ Mới CHUẨN DOANH NGHIỆP SCANMS |
| :--- | :--- |
| **Cửa hàng / Shop bán lẻ** | **Nhãn hàng Trực thuộc / Khối Ngành hàng Nội bộ (Brand / In-House Division)** |
| **Chủ Shop (Shop Owner / Seller)** | **Giám đốc Nhãn hàng / Quản lý Ngành hàng (Brand Manager / Division Head)** |
| **Sàn TMĐT (E-commerce Marketplace)** | **Hệ Thống Quản Trị Tiếp Thị Liên Kết Doanh Nghiệp (Affiliate Network Management System)** |
| **Cộng tác viên bán dạo / Cò mồi** | **Nhà Sáng Tạo Nội Dung / Đối Tác Tiếp Thị (Creator / KOC / Affiliate Partner)** |
| **Tiền hoa hồng (Commission)** | • Giao diện UI & Ví tiền: **Thu Nhập Đối Tác / Thu Nhập Tiếp Thị** *(Partner Earnings)*<br>• Thuật toán & Hợp đồng Deal: **Tỷ Lệ Thù Lao Đối Tác** *(Partner Remuneration Rate)*<br>• Báo cáo & Thuyết trình: **Cơ Chế Thù Lao & Đãi Ngộ Đối Tác** *(Remuneration & Performance Rewards)* |
| **Chợ hoa hồng** | **Kho Tiếp Thị Sản Phẩm & Chiến Dịch Nhãn Hàng (Campaign & Product Hub)** |
| **Voucher sàn / Mã Freeship** | **Coupon Độc Quyền Định Danh KOC (`KOL-Exclusive Attribution Coupon` - ví dụ `THAONHI16`)** |
| **Tự gõ giá giảm khi tạo hàng** | **Giá Niêm Yết (List Price / MSRP) & Khóa Giá Sàn Bảo Vệ (Floor Price / MAP)** |
| **Xin hàng mẫu miễn phí** | **Thẩm Duyệt & Tài Trợ Hàng Mẫu Trải Nghiệm SLA 14 Ngày (Sample Sponsorship)** |
| **Phạt bùng hàng mẫu** | **Chế Tài Vi Phạm Cam Kết Truyền Thông SLA 14 Ngày (SLA Violation Blacklist)** |
| **Rút tiền hoa hồng** | **Quyết Toán Thu Nhập & Rút Tiền Đối Tác (Partner Earnings Payout Settlement)** |
| **Sàn xử kiện hoàn tiền** | **Bảo Chứng Tạm Giữ Escrow & Động Cơ Thu Hồi Chiết Khấu (Clawback Engine)** |
| **Admin duyệt mọi lệnh tiền** | **Phân Tách SoD: System Manager Duyệt Payout Hằng Ngày (-10% PIT) vs Admin Giám Sát Executive Dashboard** |

---

## 8. 🎯 MA TRẬN 5 MAIN FLOWS DEMO THỰC CHIẾN BẢO VỆ HỘI ĐỒNG

Hệ thống được thiết kế hoàn thiện xoay quanh kịch bản Demo 5 giai đoạn liên hoàn (4 Profile Trình duyệt song song - 5 Roles phối hợp nhịp nhàng):

- 🔹 **MAIN FLOW 1: Khởi Tạo Nhãn Hàng, Tuyển Mộ Đối Tác, Thẩm Định eKYC & Kênh Mạng Xã Hội (FR-07)**
  *(Admin bổ nhiệm Shop Manager nội bộ $\rightarrow$ KOC đăng ký eKYC CCCD/STK/Kênh TikTok $\rightarrow$ System Manager thẩm định Maker-Checker $\rightarrow$ KOC kích hoạt Hạng Đồng 10% & mở khóa Media Hub).*
- 🔹 **MAIN FLOW 2: Khóa Ngành Hàng Sản Phẩm, Thị Trường Hợp Tác 2 Chiều & Khai Thác Media Hub**
  *(Shop tạo sản phẩm bị khóa cứng Category theo Store $\rightarrow$ System Manager duyệt pháp lý $\rightarrow$ AI Matchmaker radar 4 trục gợi ý Top KOC $\rightarrow$ KOC lướt kho chiến dịch và tải Media HD về dựng nội dung).*
- 🔹 **MAIN FLOW 3: Đàm Phán Hợp Đồng VIP, Ký Hợp Đồng KPI & Tài Trợ Hàng Mẫu SLA 14 Ngày**
  *(Chat Socket.IO realtime gửi Thẻ mời chiến dịch VIP $\le 16\%$ $\rightarrow$ Ký hợp đồng KPI $\rightarrow$ Shop duyệt xuất kho mẫu 0đ GHN $\rightarrow$ KOC nhận mẫu, đồng hồ SLA 14 ngày đếm ngược $\rightarrow$ KOC nộp link video nghiệm thu).*
- 🔹 **MAIN FLOW 4: Công Cụ Tiếp Thị (Link/QR/Coupon), Mua Hàng Ghép Đơn GHN & Xử Lý Đổi Trả / Bù Hàng Mới / Clawback**
  *(KOC sinh Dynamic QR / Smart Link / Coupon `THAONHI16` $\rightarrow$ Khách đặt hàng PayOS/VietQR $\rightarrow$ Shipper GHN giao hàng $\rightarrow$ Phân định đổi trả: GHN vỡ móp bù hàng 1-1 bảo lưu thù lao KOC vs Hoàn hàng kích hoạt Clawback thu hồi thù lao về 0₫).*
- 🔹 **MAIN FLOW 5: Tạm Giữ Bảo Chứng Escrow, Quyết Toán Payout SoD (-10% Thuế TNCN), Thưởng Tháng FR-09 & Báo Cáo Cấp Cao**
  *(Escrow 7 ngày bảo vệ tài chính $\rightarrow$ KOC tạo lệnh rút tiền $\rightarrow$ System Manager đối soát và bấm duyệt Payout (-10% thuế TNCN tại nguồn) $\rightarrow$ Động cơ quét thưởng tháng FR-09 $\rightarrow$ System Admin theo dõi Executive Financial Dashboard).*
