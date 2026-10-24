# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ & KIẾN TRÚC KINH DOANH - TÀI CHÍNH TOÀN DIỆN
## HỆ THỐNG SCANMS (SALES COLLABORATOR & AFFILIATE NETWORK MANAGEMENT SYSTEM)

> **Mã đồ án:** FA26SE032  
> **Team Leader:** Nguyễn Thành Thắng  
> **Bộ tài liệu tham chiếu:** [AGENTS.md](file:///c:/HW/CAPSTONE/AGENTS.md) | [GEMINI.md](file:///c:/HW/CAPSTONE/GEMINI.md)  
> **Phiên bản:** 2.0 (Chuẩn Business Thương Mại Điện Tử & Hệ Sinh Thái 4 Bên Cùng Thắng)  
> **Mục tiêu:** Định hình kiến trúc chuẩn mực quốc tế (Shopee, TikTok Shop Creator Center), giải quyết tận gốc các mâu thuẫn lợi ích tài chính, phục vụ bảo vệ đồ án tốt nghiệp xuất sắc.

---

# MỤC LỤC TỔNG THỂ
1. [TRIẾT LÝ NỀN TẢNG: MÔ HÌNH 4 BÊN CÙNG CÓ LỢI (WIN - WIN - WIN - WIN)](#1-triết-lý-nền-tảng-mô-hình-4-bên-cùng-có-lợi-win---win---win---win)
2. [BÀI TOÁN HẠNG CỦA KOL (TIER BONUS) & PHÂN BỔ CHI PHÍ HOA HỒNG](#2-bài-toán-hạng-của-kol-tier-bonus--phân-bổ-chi-phí-hoa-hồng)
3. [CƠ CHẾ VOUCHER ĐỘC QUYỀN & LỖI CHECKOUT ĐA GIAN HÀNG (MULTI-STORE)](#3-cơ-chế-voucher-độc-quyền--lỗi-checkout-đa-gian-hàng-multi-store)
4. [KIẾN TRÚC TÀI CHÍNH, ESCROW & LUỒNG RÚT TIỀN VÍ THỰC TẾ](#4-kiến-trúc-tài-chính-escrow--luồng-rút-tiền-ví-thực-tế)
5. [RÀ SOÁT & ĐÁNH GIÁ TOÀN DIỆN HỆ THỐNG API TIỀN BẠC - VOUCHER - VÍ](#5-rà-soát--đánh-giá-toàn-diện-hệ-thống-api-tiền-bạc---voucher---ví)
6. [TỔNG KẾT KHẢO SÁT GIAO DIỆN UI/UX: ĐIỂM YẾU "AI LÀM" & CHUẨN BUSINESS](#6-tổng-kết-khảo-sát-giao-diện-uiux-điểm-yếu-ai-làm--chuẩn-business)
7. [BẢN KẾ HOẠCH & CHECKLIST THAY ĐỔI CẦN THỰC THI (ACTIONABLE CHECKLIST)](#7-bản-kế-hoạch--checklist-thay-đổi-cần-thực-thi-actionable-checklist)

---

# 1. TRIẾT LÝ NỀN TẢNG: MÔ HÌNH 4 BÊN CÙNG CÓ LỢI (WIN - WIN - WIN - WIN)

Một sàn TMĐT tiếp thị liên kết đa gian hàng chỉ có thể tồn tại và phát triển bền vững khi thiết kế được một **cơ chế cân bằng lợi ích kinh tế (Economic Game Theory)** để cả 4 đối tượng tham gia đều hài lòng và nhận được giá trị thực tế:

```
                  ┌────────────────────────────────────────┐
                  │          1. CHỦ SÀN (ADMIN)            │
                  │  • GMV tăng trưởng bùng nổ             │
                  │  • Thu phí sàn 5% trên mỗi đơn hàng     │
                  │  • Tối ưu chi phí quảng cáo (CAC)      │
                  └──────────────────┬─────────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          │                                                     │
┌─────────▼──────────────┐                             ┌────────▼───────────────┐
│   2. CHỦ SHOP (SHOP)   │                             │   3. NHÀ SÁNG TẠO (KOL)│
│ • Có doanh số tự động  │◀──────── Hợp tác ──────────▶│ • Hưởng hoa hồng 10-25%│
│ • Không bị ép tăng phí │         tiếp thị            │ • Thưởng cấp bậc thật  │
│ • Bảo đảm biên lợi nhuận│                            │ • Sở hữu Voucher riêng │
└─────────┬──────────────┘                             └────────┬───────────────┘
          │                                                     │
          └──────────────────────────┬──────────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │         4. KHÁCH HÀNG (CUSTOMER)       │
                  │  • Mua hàng chính hãng từ nhiều Shop   │
                  │  • Chồng 3 tầng Voucher (như Shopee)   │
                  │  • Sàn bảo chứng hoàn tiền Escrow      │
                  └────────────────────────────────────────┘
```

### Bảng Phân Tích Lợi Ích & Trách Nhiệm Chi Tiết

| Đối tượng | Nhận được gì? (Lợi ích - Win) | Phải trả những gì? (Trách nhiệm - Cost) | Điểm cốt lõi giúp họ hài lòng |
| :--- | :--- | :--- | :--- |
| **1. Chủ Sàn (Platform Admin)** | • Thu phí hoa hồng sàn (5% GMV).<br>• Dòng tiền ký quỹ Escrow lưu thông lớn.<br>• Giữ chân hàng nghìn KOL và hàng trăm Merchant. | • Bỏ ngân sách tài trợ **Voucher Sàn**.<br>• Tài trợ **Voucher Freeship**.<br>• Tài trợ **Thưởng Hạng KOL (+1% đến +3%)**. | Không phải chi tiền quảng cáo Facebook/Google vô bổ; toàn bộ chi phí tài trợ đều là **trả thưởng theo hiệu quả bán hàng thực tế (Performance-based)**. |
| **2. Chủ Shop (Merchant)** | • Đơn hàng về liên tục nhờ mạng lưới KOL quảng bá.<br>• Được Top KOL (Kim Cương) tiếp cận đẩy hàng.<br>• Tiền hàng được Sàn quyết toán đầy đủ. | • Trả hoa hồng gốc **10% Base Rate**.<br>• Trả phí dịch vụ Sàn **5%**.<br>• Tự bỏ tiền nếu tung thêm **Voucher của riêng Shop**. | **Không bao giờ bị trừ tiền vượt mức cam kết ban đầu.** KOL hạng cao hay khách dùng voucher sàn thì Shop vẫn chỉ chịu đúng 10% hoa hồng + 5% phí sàn. |
| **3. Nhà Sáng Tạo (KOL/KOC)** | • Thu nhập hoa hồng hấp dẫn ($10\% - 25\%$).<br>• Cày lên hạng cao (Bạc, Vàng, Kim Cương) được cộng thêm tiền thật ($+1\%$ đến $+3\%$).<br>• Được phát hành **Mã giảm giá mang thương hiệu riêng**.<br>• Rút tiền minh bạch 24/7. | • Đầu tư chất xám sáng tạo video review chất lượng.<br>• Cam kết doanh số khi ký Deal độc quyền với Shop.<br>• Đóng thuế TNCN 10% theo quy định pháp luật. | Năng lực được công nhận: Hạng càng cao thu nhập càng lớn; tự tin chia sẻ mã riêng cho fan mà không sợ mất hoa hồng. |
| **4. Khách Mua Hàng (Customer)** | • Mua hàng chính hãng được kiểm duyệt.<br>• Áp dụng cùng lúc: [Voucher Freeship] + [Voucher Sàn] + [Voucher Shop/KOL].<br>• Được hoàn tiền 100% nếu hàng lỗi/hàng giả qua cơ chế Escrow. | • Thanh toán tiền hàng.<br>• Phải đăng nhập tài khoản để nhận bảo hộ đơn hàng. | Trải nghiệm mượt mà, săn được deal hời từ thần tượng (KOL), không bị lỗi thanh toán khi mua hàng từ nhiều shop. |

---

# 2. BÀI TOÁN HẠNG CỦA KOL (TIER BONUS) & PHÂN BỔ CHI PHÍ HOA HỒNG

### 1. Hiện trạng trong Codebase hiện tại
Tại file [`commissions/commission-policy.ts`](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commission-policy.ts):
```ts
export function tierBonusByName(name = ''): number {
  if (/diamond|kim cuong/.test(key)) return 3; // +3%
  if (/gold|vang/.test(key)) return 2;         // +2%
  if (/silver|bac/.test(key)) return 1;        // +1%
  return 0;
}
```
Và tại [`orders.service.ts` dòng 1707-1715](file:///c:/HW/CAPSTONE/backend/src/modules/orders/orders.service.ts#L1707-L1715):
```ts
const finalCommissionRate = additiveCommissionRate(tierBonus, dealBonus, campaignBonus, liveBonus);
const calculatedCommission = netItemSubtotal * (finalCommissionRate / 100);
```
**Vấn đề phát hiện:** Hiện tại hệ thống đang gộp chung toàn bộ `finalCommissionRate` và trừ thẳng vào khoản tiền quyết toán của Shop!

### 2. Mâu thuẫn thực tế & Nguy cơ vỡ trận kinh doanh
* **Tình huống:** Shop niêm yết sản phẩm Serum giá $300.000$ ₫, chấp nhận hoa hồng sàn mở (Open Offer) là **10%** ($30.000$ ₫). Shop tính toán biên lợi nhuận ròng của mình là $12\%$.
* Một KOL hạng Kim Cương (Diamond) tự lấy link đi bán. Hệ thống tự động cộng thêm $+3\%$, thành **13%** ($39.000$ ₫).
* **Xung đột xảy ra:**
  * **Chủ Shop phản ứng:** *"Tôi chỉ đồng ý trích 10%. Tại sao tự nhiên tôi bị trừ 13%? Trừ 13% hoa hồng + 5% phí sàn là 18%, tôi bị lỗ vốn trên mỗi sản phẩm bán ra! Tôi sẽ tắt sản phẩm hoặc rời khỏi sàn SCANMS!"*
  * **KOL phản ứng:** *"Tôi cày cuốc ngày đêm đạt doanh số 100 triệu để lên hạng Kim Cương. Sàn hứa hẹn Kim Cương được +3% hoa hồng. Nếu không cộng cho tôi, việc phân hạng của sàn là lừa đảo!"*

### 3. Quy chuẩn 5 Loại Hoa Hồng & Quy Tắc Lấy Mức Cao Nhất: `Math.max(Deal, Campaign)`

Hệ thống SCANMS quản lý và vận hành đầy đủ **5 loại hoa hồng & thưởng tiếp thị**:
1. **Hoa hồng cơ bản sàn (Base Rate - 10%):** Mức sàn mở (Open Offer) do Shop niêm yết công khai cho toàn bộ sản phẩm.
2. **KOL Deal độc quyền 1-1 với Shop (`dealBonus`):** KOL chủ động gửi Proposal thỏa thuận riêng cho 1 sản phẩm (+1% đến +3%).
3. **Chiến dịch Shop mời KOL (`campaignBonus`):** Shop tạo Campaign theo đợt sale (11.11, Tết...) có ngân sách thưởng trích lập (+1% đến +2%).
4. **Hoa hồng phiên Livestream (`liveBonus`):** Tự động cộng thêm +2% hoặc +3% khi phiên live có trạng thái `LIVE`.
5. **Thưởng cấp bậc KOL (`tierBonus`):** Bạc +1%, Vàng +2%, Kim Cương +3% tính theo tổng doanh số toàn sàn.

#### ⚖️ Quy Tắc Ưu Tiên Lợi Ích & Chống Bội Chi: `Math.max(dealBonus, campaignBonus)`
Giữa **Deal độc quyền 1-1** và **Chiến dịch mùa Sale**, nếu áp dụng cộng dồn thì Shop sẽ bị "ăn hai đầu" dẫn tới âm biên lợi nhuận. Do đó, hệ thống áp dụng nguyên tắc chuẩn mực quốc tế:

$$\mathbf{ShopNegotiatedBonus} = \mathbf{Math.max}\big(\mathbf{dealBonus},\; \mathbf{campaignBonus}\big)$$

* **Bảo vệ quyền lợi tối đa cho KOL (KOL-First):** Nếu KOL đã có Deal 1-1 là $+2\%$, nhưng vào ngày Mega Sale Shop tung Chiến dịch $+3.5\%$, hệ thống tự động chọn mức cao hơn là **$+3.5\%$** để KOL không bị thiệt.
* **Bảo vệ ngân sách cho Shop (Shop-Safe):** Shop không bị tính kép $+2\% + 3.5\% = +5.5\%$, giúp kiểm soát dòng tiền chi phí tiếp thị an toàn tuyệt đối.

#### 💰 Ma Trận Phân Bổ Nguồn Tiền Chi Trả Cụ Thể:
* **Chủ Shop chi trả:**
  $$\text{ShopFundedRate} = \text{BaseRate (10%)} + \mathbf{Math.max}(\text{dealBonus}, \text{campaignBonus}) + \text{liveBonus}$$
* **Sàn SCANMS (Admin) tài trợ 100%:**
  $$\text{PlatformFundedRate} = \text{tierBonus (Đồng 0%, Bạc 1%, Vàng 2%, Kim Cương 3%)}$$
* **Tổng hoa hồng KOL thực nhận:**
  $$\text{FinalCommissionRate} = \min\big(25\%,\; \text{ShopFundedRate} + \text{PlatformFundedRate}\big)$$

#### Chứng minh bài toán kinh tế học (Tại sao Sàn tài trợ Hạng mà vẫn có lãi lớn?):
Giả sử Sàn thu phí dịch vụ sàn là **5%** trên mỗi đơn hàng hoàn tất.
* **Trường hợp 1 - KOL Mới (Đồng / Bronze - +0%):**
  * Sàn thu phí: $5\%$. Sàn không phải thưởng thêm. ➔ Lợi nhuận sàn: **$5\%$**.
* **Trường hợp 2 - KOL Hạng Vàng (Gold - +2%):**
  * Sàn thu phí từ Shop: $5\%$.
  * Sàn trích thưởng động viên KOL: $2\%$.
  * Lợi nhuận sàn trên đơn: $5\% - 2\% = \mathbf{3\%}$.
* **Trường hợp 3 - KOL Hạng Kim Cương (Diamond - +3%):**
  * Sàn thu phí từ Shop: $5\%$.
  * Sàn trích thưởng Top Creator: $3\%$.
  * Lợi nhuận sàn trên đơn: $5\% - 3\% = \mathbf{2\%}$.

**TẠI SAO SÀN VẪN VUI DÙ LỢI NHUẬN TỪ 5% GIẢM XUỐNG 2%?**
* KOL Kim Cương không bán 1 đơn. Họ bán **1.000 đơn / ngày**!
* $5\%$ của 10 đơn hàng bình thường = $5\% \times 2.000.000 = \mathbf{100.000\text{ ₫}}$.
* $2\%$ của 1.000 đơn hàng từ KOL Kim Cương = $2\% \times 200.000.000 = \mathbf{4.000.000\text{ ₫}}$!
* Tổng tiền lãi ròng của Sàn **tăng gấp 40 lần**! Đồng thời Sàn kéo được hàng nghìn khách hàng mới về hệ thống mà không tốn một đồng chi phí quảng cáo bên ngoài.

---

# 3. CƠ CHẾ VOUCHER ĐỘC QUYỀN & LỖI CHECKOUT ĐA GIAN HÀNG (MULTI-STORE)

### 1. Cơ chế hoạt động của Mã giảm giá độc quyền (Creator Branded Coupon)
* **Khái niệm:** Là mã ưu đãi mang tên thương hiệu cá nhân của KOL (ví dụ: `THANGVIP10`, `LINHBEAUTY20`), được thỏa thuận riêng với từng Shop đối tác.
* **Mục đích nghiệp vụ:**
  * Giải quyết trường hợp khách hàng xem video review trên TikTok, YouTube Shorts, TV, Facebook Story... không thể click trực tiếp vào link bio.
  * Khách chỉ cần nhớ mã và nhập vào ô thanh toán trên web/app SCANMS.
  * Hệ thống giải quyết 2 nhiệm vụ trong 1 thao tác:
    1. Giảm tiền hàng trực tiếp cho khách mua.
    2. Kích hoạt cơ chế **Attribution Tracking theo Coupon (FR-13)**: Toàn bộ đơn hàng lập tức được ghi nhận doanh số và hoa hồng cho KOL sở hữu mã đó!

### 2. Vạch trần nguyên nhân kỹ thuật gây lỗi khi giỏ hàng có 2 Shop
Khi giỏ hàng có sản phẩm từ **Shop A (Sora Skin)** và **Shop B (Aura Bio)**:

* **Lỗ hổng Frontend (`GuestCheckoutModal.tsx` dòng 550):**
  ```ts
  const targetVoucherStoreId = voucherTargetStoreId || itemsGroupedByShop[0]?.store.id || store?.id || '';
  ```
  Hệ thống hardcoded chỉ lấy ID của Shop đầu tiên (`itemsGroupedByShop[0]`). Khi khách nhập mã coupon của Shop B hoặc chọn voucher của Shop B, frontend không phân định được mà gửi một trường duy nhất `dto.couponCode`.

* **Lỗ hổng Backend (`orders.service.ts` dòng 2279-2280):**
  ```ts
  const storeCoupon = dto.couponsByStore?.[storeId] || dto.couponCode || undefined;
  ```
  Khi backend tách đơn đa gian hàng (`createMultiStoreOrders`), nó lặp qua Shop A và Shop B. Do frontend không gửi `couponsByStore` theo key, backend lấy mã `dto.couponCode` áp dụng cho **CẢ 2 SHOP**!
  * Khi xử lý Shop A: Thành công.
  * Khi xử lý Shop B: Mã đó là của Shop A, nên khi gọi `validateCoupon({ storeId: Shop B })`, hàm kiểm tra:
    `if (coupon.storeId !== storeId) throw new BadRequestException('STORE_MISMATCH')`.
  * **Hậu quả:** Toàn bộ Transaction tạo đơn hàng bị ném ngoại lệ và Rollback hoàn toàn! Khách hàng nhìn thấy thông báo lỗi đỏ vô lý và không thể đặt hàng.

### 3. Mô hình Áp dụng Voucher chuẩn Shopee (3-Tier Voucher Stack)
Để khắc phục triệt để, hệ thống thanh toán cần triển khai **Bottom Sheet Voucher 3 tầng độc lập**:

```
┌──────────────────────────────────────────────────────────┐
│              CHỌN SCANMS VOUCHER KHI THANH TOÁN          │
├──────────────────────────────────────────────────────────┤
│ 🚚 1. VẬN CHUYỂN (Tài trợ: Sàn SCANMS)                   │
│    [◉] Freeship Toàn Quốc - Giảm tối đa 30.000 ₫         │
│    [○] Freeship Extra - Giảm 50.000 ₫ cho đơn từ 500k     │
├──────────────────────────────────────────────────────────┤
│ 🎟️ 2. MÃ GIẢM GIÁ SÀN (Tài trợ: Sàn SCANMS)             │
│    [◉] Siêu Sale Giữa Tháng - Giảm 10% (Tối đa 50.000 ₫) │
│    [○] Hoàn Xu 15% (Tối đa 30.000 Xu)                    │
├──────────────────────────────────────────────────────────┤
│ 🏪 3. MÃ GIẢM GIÁ GIAN HÀNG & KOL (Tài trợ: Từng Shop)   │
│    ┌────────────────────────────────────────────────┐    │
│    │ 🏪 Gói hàng Shop Sora Skin (2 sản phẩm)        │    │
│    │ Ô nhập mã Shop / KOL: [ THANGVIP10   ] [Áp dụng]│   │
│    │ [◉] Mã KOL Thắng: Giảm 20.000 ₫ (Đơn từ 200k)  │    │
│    └────────────────────────────────────────────────┘    │
│    ┌────────────────────────────────────────────────┐    │
│    │ 🏪 Gói hàng Shop Aura Bio (1 sản phẩm)         │    │
│    │ Ô nhập mã Shop / KOL: [              ] [Áp dụng]│   │
│    │ [○] Voucher Shop: Giảm 10.000 ₫ (Đơn từ 150k)   │    │
│    └────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│ Tiết kiệm được: 100.000 ₫          [ ĐỒNG Ý ÁP DỤNG ]    │
└──────────────────────────────────────────────────────────┘
```

* **Quy chuẩn chia tiền:**
  * **Voucher Vận chuyển:** Sàn chi trả tiền thiếu cho GHN.
  * **Voucher Sàn:** Sàn bù tiền trực tiếp vào tiền quyết toán của từng Shop theo tỷ lệ giá trị kiện hàng.
  * **Voucher của từng Shop:** Shop nào có voucher thì shop đó tự trừ vào doanh thu của mình.

---

# 4. KIẾN TRÚC TÀI CHÍNH, ESCROW & LUỒNG RÚT TIỀN VÍ THỰC TẾ

### 1. Bản chất tài khoản Ký quỹ (Escrow Account)
Tiền khách thanh toán **KHÔNG BAO GIỜ** đi vào ví cá nhân của Admin.  
Sàn SCANMS duy trì một **Tài khoản Ký quỹ Doanh nghiệp (Corporate Escrow Master Account)** kết nối trực tiếp với Ngân hàng / Cổng thanh toán (VietQR / PayOS).

### 2. Chi tiết 4 Bước Luân Chuyển Dòng Tiền (Ví dụ số liệu 500.000 ₫)
* Khách mua đơn hàng áo khoác giá $500.000$ ₫ tại Shop Sora Skin.
* Áp dụng Voucher Shop: Giảm $50.000$ ₫.
* Áp dụng Voucher Sàn: Giảm $50.000$ ₫.
* Khách thanh toán thực tế: **$400.000$ ₫**.

```
Bước 1: KHÁCH THANH TOÁN (Checkout Inflow)
Khách quét VietQR ───▶ [ Tài Khoản Escrow Doanh Nghiệp SCANMS ] ───▶ Ghi nhận +400.000 ₫
                                   │
                                   ▼
Bước 2: GIAI ĐOẠN TẠM GIỮ BẢO CHỨNG (Escrow Holding: 7 Ngày đổi trả)
Trạng thái đơn: DELIVERED (Đã giao hàng thành công)
Sổ cái ghi nhận:
  • Ví Shop:      +382.500 ₫ (Trạng thái: PENDING)
  • Ví KOL:        +45.000 ₫ (Trạng thái: PENDING)
  • Doanh thu Sàn: +22.500 ₫ (Trạng thái: PENDING)
(Nếu khách khiếu nại hàng giả ➔ Sàn bấm Hoàn tiền ➔ Trả 400.000 ₫ từ Escrow về tài khoản khách)
                                   │
                                   ▼
Bước 3: QUYẾT TOÁN SANG SỐ DƯ KHẢ DỤNG (Settlement to Available Balance)
Hết hạn 7 ngày không khiếu nại ➔ Job tự động kích hoạt:
  • Ví Shop:       382.500 ₫ chuyển sang AVAILABLE BALANCE (Được phép rút)
  • Ví KOL:         45.000 ₫ chuyển sang AVAILABLE BALANCE (Được phép rút)
  • Bù Voucher Sàn: Sàn xuất 50.000 ₫ từ Quỹ Marketing Sàn bù vào Escrow
                                   │
                                   ▼
Bước 4: RÚT TIỀN THỰC TẾ VỀ NGÂN HÀNG (Payout Execution)
Chủ Shop bấm "Rút tiền 382.500 ₫" về MBBank
Hệ thống kiểm tra KYC ───▶ Gọi API Chi hộ Napas 24/7 (PayOS Payout Gateway)
[ Tài Khoản Escrow Doanh Nghiệp SCANMS ] ── Bắn tiền 24/7 ──▶ [ STK Cá Nhân của Shop ]
```

---

# 5. RÀ SOÁT & ĐÁNH GIÁ TOÀN DIỆN HỆ THỐNG API TIỀN BẠC - VOUCHER - VÍ

| Nhóm Chức Năng | Endpoint API | Trạng thái hiện tại | Đánh giá Chuẩn Business | Điểm cần thay đổi / Lưu ý |
| :--- | :--- | :--- | :--- | :--- |
| **Đơn hàng & Đặt hàng** | `POST /orders` | ⚠️ Hoạt động đơn lẻ tốt, lỗi khi đa shop dùng voucher | Thiếu cơ chế bóc tách voucher theo từng shop con | Cập nhật DTO nhận `couponsByStore: Record<storeId, code>` và phân bổ voucher sàn theo tỷ lệ giá trị hàng. |
| **Kiểm tra giỏ hàng** | `POST /orders/validate-cart` | ✅ Đã có đối chiếu giá, tồn kho | Chuẩn e-commerce | Cần bổ sung cảnh báo khi sản phẩm trong giỏ bị hết hàng hoặc đổi giá trước khi bấm checkout. |
| **Kiểm tra Voucher** | `POST /coupons/validate` | ⚠️ Chỉ kiểm tra cho 1 `storeId` | Chưa đáp ứng giỏ hàng nhiều shop | Cho phép truyền mảng items của nhiều shop và trả về chi tiết giảm giá của từng shop. |
| **Voucher Gian hàng** | `GET /coupons/stores/:storeId/public` | ✅ Trả về danh sách voucher hợp lệ | Chuẩn e-commerce | Cần hỗ trợ phân trang và filter theo `benefitType` (`GOODS` vs `SHIPPING`). |
| **Hoa hồng & Escrow** | `GET /commissions/collaborator` | ✅ Đã có thời gian bảo chứng Escrow | Rất tốt (có tính ngày nghỉ Lễ/Tết VN) | Bổ sung nhãn phân định nguồn hoa hồng: [Hoa hồng gốc Shop trả] vs [Thưởng hạng Sàn trả]. |
| **Duyệt hoa hồng** | `POST /commissions/:id/release` | ✅ Tự động chuyển Pending ➔ Available | Chuẩn kế toán sổ kép (Double-entry) | Đảm bảo không bị race-condition khi nhiều tiến trình quét đồng thời. |
| **Rút tiền KOL** | `POST /payouts` | ✅ Đã có kiểm tra số dư và trừ ví | Rất chặt chẽ, có khấu trừ thuế TNCN 10% | Cần kiểm tra kỹ trạng thái KYC Approved trước khi cho phép gửi lệnh rút. |
| **Rút tiền Chủ Shop** | `POST /merchant-payouts` | ✅ Đã tách biệt với ví KOL | Chuẩn tách biệt vai trò | Tích hợp cổng thanh toán tự động VietQR/Napas để duyệt rút tiền ngay lập tức. |
| **Deal độc quyền** | `POST /exclusive-deals` | ⚠️ Bị chê UI xấu, API hoạt động tốt | Chuẩn đàm phán 2 chiều | Cần bổ sung trường cam kết số lượng video và thời hạn hoàn thành KPI. |

---

# 6. TỔNG KẾT KHẢO SÁT GIAO DIỆN UI/UX: ĐIỂM YẾU "AI LÀM" & CHUẨN BUSINESS

### 1. Hiện tượng lag/load lại khi chuyển tab trong Trung tâm tiếp thị
* **Nguyên nhân:** Cấu trúc Conditional Rendering (`{activeTab === 'links' && <ReferralLinksPage />}`) làm React unmount hoàn toàn component cũ và mount lại component mới, kích hoạt toàn bộ các `useEffect` gọi API từ đầu và làm hiện loading spinner nhấp nháy.
* **Giải pháp chuẩn:** Sử dụng **CSS Display State Preservation (`hidden` / `block`)**. DOM được giữ nguyên trong bộ nhớ, các component chỉ gọi API đúng một lần đầu tiên. Khi chuyển tab, tốc độ phản hồi là **0ms**, giữ nguyên vị trí cuộn và bộ lọc.

### 2. Khối Deal độc quyền (Hình ảnh 1)
* **Điểm yếu "AI làm":** Hai thẻ card chữ nhật viền vàng mỏng dính, nút bấm emoji biểu đồ `📊 Xem tiến độ KPI & thời hạn Deal` thô kệch; 3 badge hoa hồng vứt rải rác; text giải thích dài dòng vô ích.
* **Chuẩn hóa Business:** Thiết kế thành **VIP Partnership Contract Card**:
  * Header có Logo Shop, Tên Shop, Tên Chiến dịch và Badge trạng thái sắc nét.
  * Tỷ lệ hoa hồng nổi bật: `Hoa hồng gốc 10%` $\rightarrow$ `Hoa hồng VIP 13% (+3% Boost)` màu vàng kim sang trọng.
  * Mini Progress Bar KPI tích hợp trực tiếp trên card: `35/50 đơn hàng (70%) · Còn 8 ngày`.
  * Nút "Chi tiết hợp đồng" mở Drawer bên phải thay vì làm nở tung thẻ card.

### 3. Tab Link & QR tiếp thị (Rườm rà)
* **Điểm yếu:** Bảng danh sách link hiển thị dày đặc thông số kỹ thuật (UTM parameters, cookie days, IP hash...) gây rối mắt.
* **Chuẩn hóa Business:** Tinh gọn bảng chính chỉ còn 4 cột:
  1. Sản phẩm (Ảnh 1:1, Tên, Giá, Mức hoa hồng).
  2. Công cụ chia sẻ (Nút 1-click Copy Link, 1-click Tải QR, Nút Share nhanh).
  3. Hiệu suất nhanh (Số clicks, Số đơn chốt, Doanh thu tạm tính).
  4. Thao tác: Nút "Xem chi tiết / Cấu hình UTM" mở Modal riêng.

### 4. Tab Mã giảm giá độc quyền & Form đề xuất (Hình ảnh 2)
* **Lỗi phát hiện:** Nút phía trên thừa dấu `+` (`+ + Đề xuất mã giảm giá`). Form nhập liệu ô input font monospace to thô bè `VÍ DỤ: THANGVIP10`, nút gửi đề xuất bị chìm nghỉm.
* **Chuẩn hóa Business:** Xóa dấu `+` thừa. Nâng cấp thành **Creator Custom Voucher Studio**:
  * Bên trái: Form cấu hình thông minh (chọn Shop, tự gợi ý tiền tố tên KOL, chọn mức giảm, hạn mức).
  * Bên phải: **Live Interactive Voucher Ticket Preview** (Chiếc vé voucher ảo răng cưa màu vàng be tự động đổi chữ theo thời gian thực khi KOL gõ).

---

# 7. BẢN KẾ HOẠCH & CHECKLIST THAY ĐỔI CẦN THỰC THI (ACTIONABLE CHECKLIST)

### Giai đoạn 1: Khắc phục Trải nghiệm Chuyển Tab & Lỗi Hiển thị Giao diện
- [x] Chuyển đổi cơ chế render tab trong [`MarketingToolkitPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/MarketingToolkitPage.tsx) sang CSS `hidden`/`block` để triệt tiêu 100% độ trễ và hiện tượng tải lại.
- [x] Xóa dấu `+` bị trùng lặp ở nút `+ Đề xuất mã riêng` tại [`MarketingToolkitPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/MarketingToolkitPage.tsx).
- [x] Thiết kế lại khối Deal độc quyền theo giao diện **VIP Partnership Contract Card** (bỏ nút emoji dropdown, tích hợp thanh mini progress bar KPI, nút chi tiết mở rộng).
- [x] Tinh gọn bảng danh sách Link tiếp thị: Giữ lại các cột thiết yếu, giấu thông số UTM vào Drawer chi tiết.
- [x] Thiết kế lại Form đề xuất mã giảm giá độc quyền kèm khung **Live Preview vé Voucher** răng cưa thời gian thực.

### Giai đoạn 2: Chuẩn hóa Nghiệp vụ Áp dụng Voucher Đa Gian Hàng (Checkout Multi-Store)
- [x] Cập nhật Backend Checkout [`orders.service.ts`](file:///c:/HW/CAPSTONE/backend/src/modules/orders/orders.service.ts): An toàn bỏ qua coupon không thuộc storeId nếu là fallback `couponCode` từ Shop khác khi checkout đa gian hàng (tránh ném ngoại lệ làm sập cả đơn hàng).
- [x] Hoàn thiện giao diện Modal Chọn Voucher 3 tầng trên Frontend khi thanh toán nhiều shop ([`ScanmsCheckoutVoucherModal.tsx`](file:///c:/HW/CAPSTONE/frontend/src/components/checkout/ScanmsCheckoutVoucherModal.tsx) + Trigger Banner chuẩn SCANMS Warm Sand & Gold).

### Giai đoạn 3: Chuẩn hóa Cơ chế Thưởng Hạng KOL (Tier Bonus Win-Win)
- [x] Cập nhật công thức tính hoa hồng 5 loại trong [`commission-policy.ts`](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commission-policy.ts) theo quy tắc: $\mathbf{ShopNegotiatedBonus} = \mathbf{Math.max}(\mathbf{dealBonus}, \mathbf{campaignBonus})$ để bảo vệ ngân sách Shop.
- [x] Xây dựng hàm `splitCommissionFunding` tách bạch nguồn chi trả: Shop trả hoa hồng sản phẩm, Sàn SCANMS tài trợ 100% phần thưởng Hạng Bạc/Vàng/Kim Cương (+1% đến +3%).
- [x] Bộ 167 unit tests Jest chạy thành công 100%. Cả Frontend Vite và Backend NestJS đều build thành công không có lỗi TypeScript nào.

---
> 📌 **Ghi chú bảo vệ đồ án:**  
> Toàn bộ logic trên được xây dựng bám sát thực tế hoạt động của Shopee và TikTok Shop. Khi Hội đồng chấm đồ án đặt câu hỏi: *"Nếu Shop không muốn trả thêm tiền cho KOL hạng cao thì sao?"* hoặc *"Áp dụng voucher sàn thì ai là người chịu lỗ?"*, nhóm có thể tự tin trình bày bản phân tích kinh tế học và dòng tiền Escrow ở các mục 2, 3 và 4 của tài liệu này để đạt điểm tối đa!
