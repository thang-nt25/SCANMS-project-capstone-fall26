# TÀI LIỆU 02: KIỂM TOÁN TOÁN HỌC CƠ CHẾ TÍNH TIỀN, LỖ HỔNG SỔ CÁI BACKEND & THIẾT KẾ MINH BẠCH GIAO DIỆN ĐA VAI TRÒ (ZERO-VARIANCE LEDGER AUDIT)

> **Mã dự án:** `FA26SE032` (`SCANMS`)  
> **Tên đề tài tiếng Việt (Bất biến):** **Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết**  
> **Tên đề tài tiếng Anh (Bất biến):** **Sales Collaborator and Affiliate Network Management System**  
> **Mục tiêu tài liệu:** Kiểm toán độc lập đến từng dòng mã nguồn Backend và từng màn hình Frontend dưới góc nhìn của **một Cộng tác viên (KOL) kỹ tính soi từng đồng thu nhập**, một **Quản lý cửa hàng nội bộ**, một **Kế toán đối soát (`SYSTEM_MANAGER`)** và một **Tổng giám đốc (`SYSTEM_ADMIN`)**; chỉ rõ toàn bộ các lỗ hổng có thể gây sai số, kẹt tiền hoặc lệch sổ cái hiện tại và lập đặc tả sửa chữa triệt để đạt độ chính xác kế toán 100%.

---

## 1. HỆ TIÊN ĐỀ TOÁN HỌC & PHƯƠNG TRÌNH CÂN BẰNG KẾ TOÁN CHUẨN MỰC (CHỐNG SAI SỐ TUYỆT ĐỐI)

Để đồ án không tồn tại bất kỳ sai số nào dù chỉ $1₫$, toàn bộ công thức tính tiền trên mọi phân hệ (`Orders`, `Commissions`, `AffiliateDeals`, `Returns`, `Wallets`, `Payouts`, `FinanceReports`) bắt buộc phải dùng chung **một hệ tiên đề toán học duy nhất** dưới đây:

### 1.1. Giá trị Cơ sở Tính Thù lao Ròng trên Từng Dòng Sản phẩm (`Line Net Commissionable Base`)
Với mỗi dòng biến thể `OrderItem` $i$ trong đơn hàng `SalesOrder`:
- $P_i$: Đơn giá bán niêm yết của biến thể `ProductVariant` tại thời điểm đặt đơn ($P_i \ge F_i$, với $F_i$ là **Giá sàn thấp nhất `floorPrice`**).
- $Q_i$: Số lượng đặt mua.
- $D_i$: Phần giảm giá phân bổ của **Voucher Thỏa thuận Độc quyền KOL** trên dòng $i$, thỏa mãn điều kiện bảo vệ giá sàn bắt buộc:
  $$\frac{P_i \times Q_i - D_i}{Q_i} \ge F_i \iff P_i \times Q_i - D_i \ge F_i \times Q_i$$
- **Giá trị ròng tính thù lao ($V_i$):** Không bao giờ tính thù lao trên phí vận chuyển GHN và không bao giờ tính trên phần giá đã giảm:
  $$V_i = P_i \times Q_i - D_i$$

---

### 1.2. Công thức Tách Bạch Từng Nguồn Thù lao trên Đơn hàng (Snapshot Cứng Lúc Đặt Đơn)
Tại đúng thời điểm đơn hàng được tạo (`Order Creation`), hệ thống **chụp cứng (`Snapshot`)** cấp bậc hiện tại của KOL là $T_0 \in \{\text{BRONZE}, \text{SILVER}, \text{GOLD}, \text{DIAMOND}\}$ tương ứng tỷ lệ bậc $R_{\text{tier}} \in \{0\%, 1\%, 2\%, 3\%\}$ theo bản ghi `CommissionRule` đang hiệu lực:

1. **Tỷ lệ Gốc cố định (`Base Rate`):** $R_{\text{base}} = 10\%$.
2. **Tỷ lệ Tiêu chuẩn Chắc chắn Hưởng (`Standard Rate`):**
   $$R_{\text{standard}} = R_{\text{base}} + R_{\text{tier}} = 10\% + R_{\text{tier}} \in \{10\%, 11\%, 12\%, 13\%\}$$
3. **Tỷ lệ Thỏa thuận Độc quyền (`Deal Target Rate` — Nếu có thỏa thuận `ACTIVE`):**
   - Do `SHOP_MANAGER` tự duyệt nếu $R_{\text{standard}} < R_{\text{deal}} \le 16\%$.
   - Do `SYSTEM_ADMIN` phê duyệt bắt buộc nếu $16\% < R_{\text{deal}} \le 25\%$.
4. **Tỷ lệ Chênh lệch Giữ lại Chờ Đạt KPI (`KPI Differential Rate` — ĐÃ TRỪ CẢ 10% GỐC LẪN BẬC KOL):**
   $$R_{\text{kpi\_diff}} = \begin{cases} \max\Big(0,\; R_{\text{deal}} - (10\% + R_{\text{tier}})\Big) & \text{nếu có Exclusive Deal đang hiệu lực} \\ 0\% & \text{nếu không có Exclusive Deal} \end{cases}$$
5. **Tỷ lệ Phụ trợ Livestream (`Auxiliary Live Rate` — Nếu đơn chốt trong phiên Live):**
   - Tối đa $+2\%$, nhưng bị chặn bởi trần cứng toàn hệ thống $25\%$:
     $$R_{\text{live\_eff}} = \min\Big(R_{\text{live}},\; \max\big(0,\; 25\% - \max(R_{\text{standard}}, R_{\text{deal}})\big)\Big)$$
     *(Lưu ý cực kỳ quan trọng: Tiền phụ trợ Livestream $R_{\text{live\_eff}}$ là thưởng phát sóng tức thời, đi theo giỏ chờ 14 ngày trả hàng, **tuyệt đối không nhốt chung vào giỏ chờ KPI của Deal**).*

#### Quy tắc Làm tròn Đồng nhất theo Tiền Việt Nam Đồng (`ROUND_HALF_UP` về số nguyên `0` chữ số thập phân hoặc `Decimal(15,2)` cố định):
- **Tiền Gốc 10% (`baseAmount`):** $A_{\text{base}, i} = \text{round}(V_i \times 10\%)$
- **Tiền Thưởng Bậc KOL (`tierBonusAmount`):** $A_{\text{tier}, i} = \text{round}\big(V_i \times (10\% + R_{\text{tier}})\big) - A_{\text{base}, i}$
- **Tổng Tiền Tiêu chuẩn `10% + Bậc` (`standardHoldAmount`):** $A_{\text{standard}, i} = A_{\text{base}, i} + A_{\text{tier}, i}$
- **Tiền Chênh lệch KPI Deal (`kpiEscrowAmount`):**
  $$A_{\text{kpi}, i} = \begin{cases} \text{round}(V_i \times R_{\text{deal}}) - A_{\text{standard}, i} & \text{khi } R_{\text{deal}} > (10\% + R_{\text{tier}}) \\ 0 & \text{ngược lại} \end{cases}$$
- **Tiền Phụ trợ Livestream (`liveBonusAmount`):** $A_{\text{live}, i} = \text{round}(V_i \times R_{\text{live\_eff}})$

> **Kiểm chứng bất biến (Zero Rounding Drift):**
> $$A_{\text{base}, i} + A_{\text{tier}, i} + A_{\text{kpi}, i} = A_{\text{standard}, i} + \big(\text{round}(V_i \times R_{\text{deal}}) - A_{\text{standard}, i}\big) \equiv \text{round}(V_i \times R_{\text{deal}})$$
> Dù chia làm 2 đợt giải ngân cách nhau hàng tuần, tổng số tiền KOL nhận được khi đạt KPI **luôn khớp chính xác tuyệt đối đến từng đồng** với $\text{round}(V_i \times R_{\text{deal}})$, không bao giờ lệch $1₫$ do làm tròn hai lần và không bao giờ cộng trùng Bậc KOL!

---

### 1.3. Bảng Mô phỏng Số học Kiểm chứng Qua 6 Kịch bản Thực tế (Đơn hàng $V = 1.000.000₫$, KOL Bậc Vàng `+2%` $\rightarrow$ `12%`, Deal VIP `18%`)

| Kịch bản Nghiệp vụ | Giỏ 1: Chờ 14 Ngày Trả hàng (`10% + Bậc` = `12%`) | Giỏ 2: Giữ Chờ Đạt KPI Deal (`18% - 12%` = `6%`) | Giỏ 3: Khả dụng Rút được (`availableBalance`) | Giỏ 4: Đang Khóa Chờ Chi (`lockedPayout`) | Đã Giải Ngân Ròng (`90%`) + Thuế TNCN (`10%`) | Ghi chú Đối soát |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Bước 1: Đơn vừa giao (`DELIVERED` Ngày 0)** | **`+120.000₫`**<br/>*(100k Gốc + 20k Bậc Vàng)* | **`+60.000₫`**<br/>*(Chờ đạt KPI Deal)* | `0₫` | `0₫` | `0₫` | KOL thấy rõ $180.000₫$ đang nằm ở 2 giỏ chờ khác nhau. |
| **Bước 2A: Qua 14 ngày không trả hàng, Deal CHƯA đủ KPI (Ngày 15)** | `0₫` | **`60.000₫`**<br/>*(Vẫn giữ chờ KPI)* | **`+120.000₫`** | `0₫` | `0₫` | Giải ngân đúng phần `10% + Bậc Vàng` ($120.000₫$). |
| **Bước 3A: Ngày 22, Deal ĐẠT 100% KPI sạch** | `0₫` | `0₫` | **`+180.000₫`**<br/>*(120k + 60k)* | `0₫` | `0₫` | Cộng thêm $60.000₫$, tổng đúng $180.000₫$ (`18%`). |
| **Bước 3B (Nhánh rẽ): Hết hạn Deal mà KHÔNG đạt KPI** | `0₫` | `0₫`<br/>*(`FORFEITED` 60k)* | **`+120.000₫`** | `0₫` | `0₫` | Hủy $60.000₫$ về ngân sách cửa hàng; KOL giữ đúng $120.000₫$ (`12%`). |
| **Bước 2B (Nhánh rẽ): Khách trả hàng hoàn tiền ở Ngày 6** | `0₫`<br/>*(`CLAWBACK` -120k)* | `0₫`<br/>*(`CLAWBACK` -60k)* | `0₫` | `0₫` | `0₫` | Thu hồi đồng thời từ cả 2 giỏ về đúng `0₫`. |
| **Bước 4: KOL tạo lệnh rút `180.000₫` (Chờ Kế toán duyệt)** | `0₫` | `0₫` | `0₫` | **`+180.000₫`** | `0₫` | Tiền không "biến mất" mà hiện rõ ở Giỏ `Đang khóa chờ chi`. |
| **Bước 5: `SYSTEM_MANAGER` duyệt chi Ngân hàng** | `0₫` | `0₫` | `0₫` | `0₫` | **Thực nhận `162.000₫`**<br/>**+ Thuế TNCN `18.000₫`** | Tổng thực nhận + thuế nộp nhà nước = đúng `180.000₫`. |

---

## 2. KIỂM TOÁN MÃ NGUỒN BACKEND HIỆN TẠI: 12 LỖ HỔNG TÍNH TIỀN & SỔ CÁI CẦN KHẮC PHỤC TRIỆT ĐỂ

Qua đọc kiểm toán từng dòng mã nguồn hiện tại trong `backend/src/modules/`, mặc dù khung khóa dòng rút tiền (`SELECT ... FOR UPDATE`) và tính thuế 10% đã có nền tảng tốt, **vẫn đang tồn tại 12 lỗ hổng nghiêm trọng (trong đó có 5 lỗi mức P0 gây crash hoặc kẹt cứng tiền của KOL)**. Nếu không nắm rõ để sửa dứt điểm khi triển khai code, khi Hội đồng test chéo sẽ xảy ra sai số ngay lập tức:

### Lỗ hổng `C-01` [P0 - CRASH 100%]: Quyết toán KPI Deal bị sập lỗi PostgreSQL Enum `'RELEASED'`
- **Vị trí chính xác:** [affiliate-deals.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/affiliate-deals.service.ts#L1370) đối chiếu với [schema.prisma](file:///c:/HW/CAPSTONE/backend/prisma/schema.prisma#L243-L249).
- **Cơ chế gây lỗi:** Trong `schema.prisma`, `enum DealBonusStatus` chỉ định nghĩa 5 giá trị: `NONE | PENDING_KPI | QUALIFIED | FORFEITED | CLAWED_BACK`. Thế nhưng hàm `settleSuccessfulDeal()` tại dòng `1370` lại ghi cứng `dealBonusStatus: 'RELEASED' as any`. Ngay khi KOL đạt đủ 100% KPI và bấm giải ngân thưởng Deal, PostgreSQL ném lỗi `invalid input value for enum "DealBonusStatus": "RELEASED"` làm giao dịch rollback 100%!
- **Hướng khắc phục chuẩn:** Bổ sung giá trị `RELEASED` chính thức vào `enum DealBonusStatus` (tách rõ trạng thái `QUALIFIED_WAITING_14D` khi đủ KPI nhưng còn đơn chưa qua 14 ngày trả hàng, và `RELEASED` khi tiền thực sự đã chuyển sang `availableBalance`).

---

### Lỗ hổng `C-02` [P0 - CRASH HOÀN TIỀN / TRỪ SAI GIỎ TIỀN]: Khi khách trả hàng hoàn tiền, Backend lấy tổng `16%` trừ thẳng vào giỏ `10% + Bậc`!
- **Vị trí chính xác:** [commission-rules.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commission-rules/commission-rules.service.ts#L2147-L2211) (được gọi trực tiếp từ [return.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/returns/return.service.ts#L1153)).
- **Cơ chế gây lỗi:**
  - Khi đơn hàng $1.000.000₫$ (KOL Bậc Đồng `10%`, Deal `16%`) giao thành công: hệ thống bỏ `100.000₫` vào `Wallet.pendingBalance` và bỏ `60.000₫` vào `Wallet.conditionalDealEscrowBalance`.
  - Khi khách trả hàng hoàn tiền, hàm `handleRefundAdjustment()` tại dòng `2152` lại lấy `reverseAmount = comm.commissionAmount` (**tức toàn bộ `160.000₫`!**) rồi gọi `reversePendingBalance(160.000₫)`!
  - **Hậu quả kép cực nặng:**
    1. Nếu KOL chỉ có đúng đơn hàng đó trong ví (`pendingBalance = 100.000₫ < 160.000₫`), hàm `wallets.service.ts:215` ném lỗi `WalletBalanceInvariantError (409 Conflict)` làm **sập luôn chức năng duyệt hoàn tiền cho khách hàng**!
    2. Nếu KOL đang có tiền chờ của các đơn hàng khác trong `pendingBalance`, hệ thống **ăn lẹm mất `60.000₫` của đơn hàng khác**, trong khi **`60.000₫` trong `conditionalDealEscrowBalance` vẫn nằm nguyên ở trạng thái `PENDING_KPI`** và KOL vẫn được nhận thưởng KPI cho một đơn hàng đã trả lại!
- **Hướng khắc phục chuẩn:** Hợp nhất toàn bộ logic thu hồi thù lao về một hàm nguyên tử duy nhất trong `CommissionsService`: tách riêng việc thu hồi `standardHoldAmount` (từ `pendingBalance` nếu `<14 ngày`, hoặc `availableBalance` nếu `>=14 ngày`) và thu hồi `kpiEscrowAmount` (từ `conditionalDealEscrowBalance` nếu chưa giải ngân KPI, hoặc từ `availableBalance` nếu đã giải ngân KPI, đồng thời tái kiểm tra ngưỡng đạt KPI của Deal).

---

### Lỗ hổng `C-03` [P0 - KHÓA CỨNG VÍ KOL & LỆCH SỔ CÁI KẾ TOÁN]: Giải ngân KPI Deal bỏ quên `FinancialLedger`, `FinancePosting` và phân bổ Cửa hàng
- **Vị trí chính xác:** [affiliate-deals.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/affiliate-deals.service.ts#L1085-L1098) & [affiliate-deals.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/affiliate-deals.service.ts#L1346-L1372) đối chiếu với [wallet-summary.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/wallets/wallet-summary.service.ts#L121-L130) & dòng `272`.
- **Cơ chế gây lỗi:**
  - Khi cộng tiền vào `conditionalDealEscrowBalance`, khi giải ngân sang `availableBalance` hoặc khi hủy `FORFEITED`, code hiện tại chỉ chạy câu lệnh `wallet.update()` trần trụi mà **không ghi bất kỳ dòng lịch sử nào vào `FinancialLedger`** và **không ghi bút toán kép vào `FinancePosting`** cũng như **không cập nhật số dư đối ứng theo cửa hàng**.
  - Ngay lập tức, bộ kiểm tra an toàn ví tại `wallet-balance-consistency.ts:15` phát hiện `Wallet.availableBalance` lớn hơn tổng phân bổ cửa hàng (`unallocatedAvailableBalance > 0`), bật cờ `earningsReviewRequired = true` và **KHÓA CỨNG NÚT RÚT TIỀN CỦA KOL** trên giao diện ví! Đồng thời màn hình đối soát của Kế toán (`reconcileLedger()`) báo lệch cân bằng tài khoản (`balanced: false`)!
- **Hướng khắc phục chuẩn:** Mọi biến động của giỏ KPI Deal bắt buộc đi qua `WalletsService` kèm đầy đủ `LedgerType` mới (`DEAL_KPI_ESCROW_IN`, `DEAL_KPI_RELEASED_TO_AVAILABLE`, `DEAL_KPI_FORFEITED`, `DEAL_KPI_CLAWBACK`) và bút toán kép `FinancePosting` tương ứng.

---

### Lỗ hổng `C-04` [P0 - RỦI RO RÚT RUỘT TIỀN TRƯỚC 14 NGÀY]: Cho phép giải ngân thưởng KPI Deal ngay Ngày 1 khi đơn hàng chưa hết 14 ngày trả hàng
- **Vị trí chính xác:** [affiliate-deals.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/affiliate-deals.service.ts#L1319) & dòng `1346–1365`.
- **Cơ chế gây lỗi:** Nếu thỏa thuận yêu cầu KPI 5 đơn hàng và KOL bán đủ 5 đơn giao trong Ngày 1, `progress.percent >= 100` lập tức đúng. KOL gọi giải ngân KPI và tiền chênh lệch `6%` nhảy thẳng vào `availableBalance` rút ra ngân hàng ngay lập tức trong khi cả 5 đơn hàng vẫn còn 13 ngày được phép trả hàng hoàn tiền!
- **Hướng khắc phục chuẩn:** Một khoản `kpiEscrowAmount` chỉ được phép chuyển sang `availableBalance` khi thỏa mãn **đồng thời 2 điều kiện (AND)**:
  1. Thỏa thuận `ExclusiveDeal` đạt $\ge 100\%$ KPI tính trên **tập đơn hàng sạch (không có khiếu nại đổi trả đang mở)**; **VÀ**
  2. Bản thân đơn hàng sinh ra khoản `kpiEscrowAmount` đó đã vượt qua mốc **14 ngày kể từ `deliveredAt`** (`Commission.standardHoldStatus === RELEASED`). Nếu Deal đã đủ KPI nhưng đơn hàng thứ 5 mới ở ngày thứ 8, khoản KPI của đơn thứ 5 chuyển sang trạng thái trung gian `KPI_QUALIFIED_WAITING_14D` (hiển thị rõ ngày mở khóa cho KOL yên tâm) và tự động chảy vào `availableBalance` đúng ngày thứ 14!

---

### Lỗ hổng `C-05` [P0 - KẸT VĨNH VIỄN TIỀN PHỤ TRỢ LIVESTREAM]: Cộng phụ trợ `+2%` Livestream bị ném nhầm vào Giỏ KPI Deal không bao giờ rút được
- **Vị trí chính xác:** [commissions.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commissions.service.ts#L242-L264) & [commission-policy.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commission-policy.ts#L30).
- **Cơ chế gây lỗi:** Khi giao hàng, `commissions.service.ts` lấy mọi phần trăm vượt trên `(10% + currentTierBonus)` nhét hết vào `dealBonusAmount` (`conditionalDealEscrowBalance`). Nếu KOL Bậc Đồng (`10%`) không có Deal nào mà bán hàng trong phiên Livestream (`+2%` $\rightarrow$ tổng `12%`), phần `+2%` bị nhét vào `conditionalDealEscrowBalance` với `dealProposalId = null` — **bị nhốt vĩnh viễn không có hàm nào giải ngân ra được**! Ngoài ra `commission-policy.ts:30` vẫn cho phép mức `+3%` thay vì chuẩn hóa `+2%`.
- **Hướng khắc phục chuẩn:** Tách riêng cột `liveBonusRate` và `liveBonusAmount` trên bảng `Commission`; khoản phụ trợ Livestream `+2%` được giữ chung chu kỳ đối soát trả hàng **14 ngày** và mở khóa thẳng ra `availableBalance` sau 14 ngày.

---

### Lỗ hổng `C-06` [P1 - SAI LỆCH CẤP BẬC & HIỂN THỊ CỘNG DỒN SAI QUY TẮC]: Không lưu Snapshot Bậc lúc đặt đơn, hàm KPI Doanh số luôn trả `0₫` & Bảng sản phẩm cộng dồn `Tier + Deal`
- **Vị trí chính xác:**
  1. [orders.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/orders/orders.service.ts#L1692-L1741) vs [commissions.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commissions.service.ts#L191-L196): Lúc đặt đơn không lưu `tierBonusRateSnapshot`, đến lúc giao hàng lại đọc `collaboratorProfile.tier` hiện hành $\rightarrow$ Nếu KOL vừa thăng bậc hoặc tụt bậc giữa ngày đặt đơn và ngày giao hàng sẽ bị lệch tỷ lệ chia giữa 2 giỏ hoặc kẹt `1%` trong giỏ KPI.
  2. [deal-kpi.policy.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/deal-kpi.policy.ts#L169): Hàm `evaluateRevenueKpi()` gọi `evaluateDealKpi(targetOrders, completedOrders, deal, now)` **quên truyền tham số thứ 5 là `validSales`** (mặc định bằng `0` ở dòng `185`), dẫn tới **100% các Deal đặt KPI theo Doanh số đều hiển thị số tiền thưởng KPI tạm giữ bằng `0 ₫`** trên giao diện!
  3. [dashboard.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/dashboard/dashboard.service.ts#L1424-L1428): Hàm `getCollaboratorTopProducts()` tính `dealBonus = dealRate - 10` rồi cộng `10 + tierBonus + dealBonus` (**cộng dồn Bậc Vàng `+2%` với Deal `16%` thành `18%`!**), làm bảng sản phẩm của KOL hiển thị sai hoàn toàn quy tắc không cộng dồn!

---

### Lỗ hổng `C-07` [P1 - LỖI CÔNG THỨC TỶ LỆ & GIÁ TÍNH THÙ LAO]: Chia nhầm mẫu số `dealBonusRate` ra `37.50%` và tính thù lao trên giá chưa trừ giảm giá Coupon
- **Vị trí chính xác:** [commissions.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commissions.service.ts#L301-L304) & [commission-calculator.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commissions/commission-calculator.service.ts#L31).
- **Cơ chế gây lỗi:**
  1. Tại dòng `302` của `commissions.service.ts`: `totalDealCommission.div(totalCommission).mul(100)` lấy $60.000₫$ chia cho tổng hoa hồng $160.000₫$ thay vì chia cho doanh số đơn hàng $1.000.000₫$, ghi vào CSDL `dealBonusRate = 37.50%` thay vì `6.00%`!
  2. Tại `orders.service.ts:1721` và `commissions.service.ts:256`, tiền thù lao đang nhân trên `unitPrice * quantity` (**chưa trừ tiền giảm giá Voucher Deal của KOL**), trong khi doanh số KPI, doanh số xét Bậc, doanh số Thưởng mốc và Doanh thu ròng của công ty đều tính trên giá **đã trừ giảm giá**. Cần thống nhất 100% tính trên **Giá trị hàng hóa thực thu ròng (`subtotalAmount - kolCouponDiscountAmount`)**.

---

### Lỗ hổng `C-08` đến `C-12` [P1 - ĐỐI SOÁT, GIÁ SÀN & PHÂN QUYỀN KẾ TOÁN]:
- **`C-08` (Thưởng mốc phụ trợ giải ngân sớm trước hạn 14 ngày):** [monthly-bonus.scheduler.ts](file:///c:/HW/CAPSTONE/backend/src/modules/commission-rules/monthly-bonus.scheduler.ts#L15) chạy lúc `00:10` sáng mùng 1 hàng tháng dựa trên `Order.completedAt` (vốn được gán ngay lúc giao hàng tại `orders.service.ts:4305`), trả thẳng tiền thưởng mốc vào `availableBalance` cho cả những đơn giao ngày 30–31 cuối tháng còn nguyên 14 ngày rủi ro trả hàng. *Khắc phục:* Chỉ chốt thưởng mốc tháng vào ngày 15 của tháng kế tiếp (hoặc chỉ tính các đơn đã qua hạn đổi trả 14 ngày).
- **`C-09` (Vi phạm Phân tách Trách nhiệm SoD):** [payout-approval.controller.ts](file:///c:/HW/CAPSTONE/backend/src/modules/wallets/payout-approval.controller.ts#L28-L29) và các màn hình [PayoutApprovalPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/PayoutApprovalPage.tsx), [ShopRevenueWalletPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopRevenueWalletPage.tsx) vẫn cho phép `SHOP_MANAGER` cài tài khoản ngân hàng riêng của Shop và bấm duyệt/từ chối lệnh rút tiền của KOL. *Khắc phục:* Thu hồi quyền duyệt chi về duy nhất `SYSTEM_MANAGER` (và fallback `SYSTEM_ADMIN`); đổi trang tài chính của `SHOP_MANAGER` thành trang **Báo cáo Hiệu quả Tiếp thị & Chi phí Thù lao Cửa hàng** thuần túy (chỉ đọc, không rút doanh thu, không duyệt chi).
- **`C-10` (Lỗ hổng kiểm tra `floorPrice` lúc duyệt/preview Voucher KOL):** [exclusive-deal-activation.ts](file:///c:/HW/CAPSTONE/backend/src/modules/affiliate-deals/exclusive-deal-activation.ts#L340-L445) và [coupons.service.ts](file:///c:/HW/CAPSTONE/backend/src/modules/coupons/coupons.service.ts#L1404) chưa kiểm tra `sellingPrice * (1 - discount%) >= floorPrice` ngay lúc kích hoạt Deal / tạo mã và lúc khách bấm kiểm tra mã ở giỏ hàng (`validateCoupon` dòng `2012`), dẫn đến mã vi phạm giá sàn vẫn tạo được rồi mới báo lỗi `400` ở bước đặt đơn cuối cùng.
- **`C-11` & `C-12` (Lỗ hổng hiển thị giao diện KOL & lệch công thức Báo cáo CEO/Kế toán):** Phân tích chi tiết và thiết kế lại toàn diện tại Mục 3 ngay dưới đây.

---

## 3. KIỂM TOÁN & THIẾT KẾ LẠI GIAO DIỆN MINH BẠCH TÀI CHÍNH ĐA VAI TRÒ (END-USER TRANSPARENCY BLUEPRINT)

### 3.1. Góc nhìn 1: Cộng tác viên / KOL Kỹ tính (`COLLABORATOR` — Kiểm tra Không Thắc Mắc Dù Chỉ 1 Đồng)

Đặt mình vào vị trí một KOL cẩn thận mở trang Ví thu nhập ([WalletPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/WalletPage.tsx), [WalletFinancialBreakdown.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/wallet/WalletFinancialBreakdown.tsx)) và trang Tổng quan ([KolDashboardPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolDashboardPage.tsx)), KOL sẽ đặt ra **8 câu hỏi kiểm chứng tiền bạc**. Bảng dưới đây cho thấy hiện trạng UI đang mắc lỗi ở đâu và thiết kế mới giải quyết triệt để như thế nào:

| Câu hỏi thực tế của KOL kỹ tính | Hiện trạng trên UI hiện tại (`Đạt / Chưa đạt` & Vị trí lỗi cụ thể) | Thiết kế Chuẩn hóa Minh bạch 100% trên UI Mới |
| :--- | :--- | :--- |
| **1. Bao nhiêu tiền tôi được rút ngay lúc này?** | **Chưa trọn vẹn:** Có thẻ `Số dư khả dụng` (`WalletPage.tsx:504`), nhưng bị khóa oan khi giải ngân KPI Deal (`C-03`). | Thẻ 1 **`SỐ DƯ KHẢ DỤNG ĐƯỢC RÚT`** (nền trắng viền vàng thương hiệu `#C59B58`, số lớn `tabular-nums`), hiển thị rõ: *"Tổng tiền đã qua 14 ngày trả hàng & đã chốt KPI, sẵn sàng rút 24/7"*. |
| **2. Bao nhiêu tiền đang chờ hết hạn 14 ngày trả hàng? Trong đó bao nhiêu là 10% gốc, bao nhiêu là thưởng Bậc của tôi?** | **CHƯA ĐẠT:** Dòng `557` của `WalletPage.tsx` ghi cứng chữ `"Thù lao 10% cơ sở"`, che giấu hoàn toàn phần `+1%..+3%` Bậc của KOL! Không có danh sách từng đơn đang đếm ngược 14 ngày. | Thẻ 2 **`CHỜ HẾT HẠN 14 NGÀY TRẢ HÀNG (GỐC + BẬC)`**, ghi tách rõ dòng phụ: `Gốc 10%: X ₫  •  Thưởng Bậc Vàng (+2%): Y ₫` (kèm phụ trợ Live `+2%` nếu có). Bấm vào mở bảng chi tiết từng mã đơn hàng kèm cột **`Ngày mở khóa dự kiến (dd/MM/yyyy HH:mm)`** đếm ngược chính xác. |
| **3. Bao nhiêu tiền thuộc về KPI Deal đang treo? Tại sao Deal 18% mà không treo 8% lại chỉ treo 6%?** | **SAI NGHIÊM TRỌNG:**<br/>• `WalletPage.tsx:624–627` gán cứng thanh tiến độ giả **`"Đạt 68% (Mốc Bạc 20M)"`** cho mọi tài khoản!<br/>• `WalletFinancialBreakdown.tsx:297` hiển thị công thức sai `Cơ sở 10% + Thưởng Deal {dealRate - 10}%` (**quên trừ Bậc KOL!**).<br/>• Deal tính theo doanh số luôn hiện `0 ₫` (`deal-kpi.policy.ts:169`). | Thẻ 3 **`TIỀN THƯỞNG CHÊNH LỆCH CHỜ ĐẠT KPI DEAL`**, xóa sạch dữ liệu giả `68%`, hiển thị thanh tiến độ thật từng thỏa thuận và ghi rõ công thức khấu trừ bậc ngay trên thẻ:<br/>`Mức Deal 18% − Đã tính ở giỏ 14 ngày 12% (10% Gốc + 2% Bậc Vàng) = Giữ chờ KPI 6%`. |
| **4. Tiền tôi gửi lệnh rút đang chờ Kế toán duyệt nằm ở đâu?** | **THIẾU HOÀN TOÀN:** Khi KOL bấm rút `2.000.000₫`, `availableBalance` tụt ngay `2.000.000₫` và **khoản tiền này biến mất khỏi cả 3 thẻ đầu trang**! KOL nhìn tổng 3 thẻ thấy hụt mất 2 triệu rất dễ hoảng hốt. | Bổ sung Thẻ 4 **`ĐANG KHÓA CHỜ GIẢI NGÂN RÚT TIỀN`** (`lockedPayoutBalance`), hiển thị bên dưới: `Tổng lệnh chờ: 2.000.000₫ (Dự kiến thực nhận 90%: 1.800.000₫ • Thuế TNCN 10%: 200.000₫)`. |
| **5. Tổng thu nhập từ đầu tháng / từ đầu năm của tôi đến từ những nguồn nào (Gốc 10%, Bậc, KPI Deal đã đạt, Thưởng mốc phụ trợ, Live phụ trợ)?** | **CHƯA ĐẠT:** Không có bảng bóc tách lũy kế theo 5 nguồn; lịch sử giao dịch thiếu hẳn các bút toán vào/ra của KPI Deal. | Khu vực **`BẢNG CÂN ĐỐI NGUỒN THU NHẬP LŨY KẾ`** gồm 5 cột rành mạch:<br/>1. `Thù lao Gốc (10%)`<br/>2. `Thưởng Cấp bậc (+1%..+3%)`<br/>3. `Thưởng Vượt KPI Deal (Đã giải ngân)`<br/>4. `Thưởng Mốc Tháng (Phụ trợ)`<br/>5. `Phụ trợ Livestream (+2%)`. |
| **6. Những đơn nào bị khách trả hàng thu hồi tiền (`Clawback`) hoặc Deal nào hết hạn không đạt KPI bị hủy thưởng?** | **SAI TRÊN DASHBOARD:** Tại `KolDashboardPage.tsx:665`, đơn có trạng thái `RETURNED` bị lọt xuống nhánh `else` và vẫn hiện chữ **`"Hoa hồng tạm tính"` màu dương**! Lịch sử ví cũng thiếu lý do thu hồi cụ thể. | Sửa dứt điểm trạng thái đơn `RETURNED` thành nhãn đỏ **`Đã hoàn trả — Thu hồi thù lao (0₫)`**; mọi dòng âm tiền trong Sổ cái Ví đều gắn mã đơn `DH-...`, loại giỏ bị trừ và lý do rõ ràng (`Khách trả hàng hoàn tiền trong hạn 14 ngày` hoặc `Hết hạn thỏa thuận chưa đạt KPI`). |

#### Sơ đồ Bố cục Chuẩn cho Trang Ví & Sổ cái Cộng tác viên (`WalletPage` — Warm Sand & Brand Gold):
```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ VÍ THU NHẬP & SỔ CÁI ĐỐI TÁC  •  Cấp bậc hiện tại: HẠNG VÀNG (10% Gốc + 2% Bậc = 12%)       │
├────────────────────┬────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. KHẢ DỤNG RÚT    │ 2. CHỜ 14 NGÀY     │ 3. GIỮ CHỜ KPI DEAL│ 4. ĐANG CHỜ CHI TRẢ RÚT TIỀN │
│    4.320.000 ₫     │    1.440.000 ₫     │      720.000 ₫     │         2.000.000 ₫          │
│ [Nút: Rút thu nhập]│ Gốc 10%: 1.200.000₫│ Deal 18% - 12% Bậc │ Thực nhận 90%: 1.800.000 ₫   │
│ Đã qua đối soát    │ Bậc +2%:   240.000₫│ = 6% (2 Deal chạy) │ Khấu trừ PIT 10%: 200.000 ₫  │
├────────────────────┴────────────────────┴────────────────────┴──────────────────────────────┤
│ BÓC TÁCH NGUỒN THU NHẬP ĐÃ QUYẾT TOÁN:                                                      │
│ • Gốc 10%: 5.000.000₫ | • Bậc (+2%): 1.000.000₫ | • KPI Deal: 1.800.000₫ | • Phụ trợ: 520.000₫ │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ TABS TRA CỨU SỔ CÁI CHI TIẾT ĐẾN TỪNG ĐƠN HÀNG:                                             │
│ [Tất cả biến động] [Đơn đang đếm ngược 14 ngày] [Tiến độ KPI Deal] [Đơn hoàn/Thu hồi] [Lịch sử Rút & Chứng từ Thuế 10%] │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2. Góc nhìn 2: Quản lý Cửa hàng Nội bộ (`SHOP_MANAGER` — Quản trị Hiệu quả & Chi phí Tiếp thị)
Cần chấn chỉnh ngay 4 điểm trên giao diện của `SHOP_MANAGER` để đúng chuẩn nhân sự quản lý nhãn hàng nội bộ:
1. **Xóa bỏ hoàn toàn tab `"Chi trả KOL"` và cấu hình tài khoản ngân hàng rút tiền của Shop** trên [ShopRevenueWalletPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/merchant/ShopRevenueWalletPage.tsx) và gỡ route `/merchant/payouts`.
2. **Đổi thành Bảng Báo cáo Doanh thu Kênh CTV & Chi phí Thù lao Nhãn hàng (`Store Affiliate P&L View`):**
   - `Doanh số hàng hóa ròng qua kênh CTV (Net Attributed GMV)`
   - `Chi phí thù lao tiêu chuẩn (10% Gốc + Bậc KOL)`
   - `Chi phí thưởng KPI Deal đang dự phòng (KPI Escrow Liability)` vs `Chi phí KPI Deal đã tiết kiệm được do KOL không đạt KPI (Forfeited Savings)`
   - `Tỷ trọng chi phí tiếp thị / Doanh thu ròng (% CIR - Cost to Income Ratio)`.
3. **Trên màn hình Quản lý Thỏa thuận ([ShopActiveDealsTab.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/affiliate/ShopActiveDealsTab.tsx)):**
   - Mở rộng bộ lọc tỷ lệ đầy đủ từ `11%–16%` (Tự chủ cửa hàng) và `17%–25%` (Đã qua Admin duyệt) thay vì chỉ có `11%, 12%, 13%` như hiện tại.
   - Hiển thị tab/nhãn rõ ràng cho các thỏa thuận đang ở trạng thái **`Chờ SYSTEM_ADMIN phê duyệt (>16%)`** thay vì lọc sót làm biến mất khỏi màn hình của `SHOP_MANAGER`.
   - Ngay trên hộp thoại đàm phán Deal & cấu hình mã giảm giá KOL, hiển thị trực tiếp **`Giá niêm yết`**, **`Giá sàn thấp nhất (floorPrice)`**, **`Biên giảm giá tối đa cho phép`** và **`Bậc hiện tại của KOL`** để Quản lý cửa hàng biết chính xác phần chênh lệch KPI thực tế là bao nhiêu phần trăm.

---

### 3.3. Góc nhìn 3 & 4: Chuyên viên Kế toán (`SYSTEM_MANAGER`) & Tổng Giám đốc (`SYSTEM_ADMIN`) — Đối soát Tiền Vào Khớp Tuyệt Đối với Tiền Ra & Công Nợ

Dưới góc nhìn Kế toán trưởng và Tổng giám đốc kiểm tra dòng tiền doanh nghiệp trên [AdminFinancePayoutsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/AdminFinancePayoutsPage.tsx), [FinanceReports.tsx](file:///c:/HW/CAPSTONE/frontend/src/components/wallet/FinanceReports.tsx), [RealtimeAnalyticsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/RealtimeAnalyticsPage.tsx) và [VipExceptionsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/VipExceptionsPage.tsx), hệ thống cần bổ sung & chuẩn hóa **5 hạng mục đối soát bắt buộc**:

1. **Thiết lập Bảng Cân đối Dòng tiền Tổng thể (`Master Corporate Cash-In & Liability Reconciliation`) cho CEO & Kế toán:**
   Khắc phục triệt để việc `ExecutiveFinanceReport` hiện đang bỏ sót tiền thu từ các đơn đang giao, bỏ sót giỏ `conditionalDealEscrowBalance`, bỏ sót tiền đang khóa chờ rút (`PAYOUT_RESERVED`) và bỏ sót số dư hoàn tiền khách hàng:
   - **Khối A — Dòng Tiền Thu Vào (`Cash Inflow`):**
     - `Tổng tiền khách đã thanh toán (PayOS / VietQR đã thu + COD GHN đã đối soát)`
     - Trừ: `Phí vận chuyển thu hộ chuyển trả đối tác GHN`
     - Trừ: `Tổng tiền đã hoàn trả cho khách hàng (Customer Refunds / Ví mua sắm hoàn tiền)`
     - Bằng: **`Doanh thu Hàng hóa Thực thu Ròng Toàn Doanh nghiệp (Net Collected Goods Revenue)`**.
   - **Khối B — Phân bổ Nghĩa vụ Chi trả Thù lao CTV (`Partner Remuneration Allocations`):**
     1. `Công nợ Tạm giữ 14 ngày chờ hết hạn trả hàng (10% Gốc + Bậc + Live phụ trợ)`
     2. `Công nợ Dự phòng Thưởng KPI Deal đang chạy (Deal% - (10% + Bậc%))` *(Tách riêng khỏi chi phí thực tế cho tới khi KOL đạt KPI; nếu trượt KPI thì hoàn nhập giảm chi phí dự phòng, khắc phục lỗi tính khống chi phí `FORFEITED` hiện tại!)*
     3. `Số dư Khả dụng trong Ví KOL chưa rút (Available Payable)`
     4. `Số tiền Đang khóa trong Lệnh chờ Kế toán giải ngân (Locked Pending Payouts)`
     5. `Tổng Tiền mặt Đã chuyển khoản cho KOL (90% Net Disbursed)`
     6. `Tổng Thuế TNCN 10% Đã khấu trừ tại nguồn (Chờ kê khai / Đã nộp Kho bạc Nhà nước)`.
   - **Khối C — Biên Doanh thu Giữ lại Ròng cho Doanh nghiệp (`Corporate Net Retained Revenue`):**
     $$\text{Doanh thu Giữ lại Ròng} = \text{Doanh thu Hàng hóa Thực thu Ròng} - \text{Tổng Chi phí Thù lao Thực tế Phát sinh}$$
2. **Đồng nhất 100% Công thức Doanh thu giữa mọi Tab của `/admin/analytics`:** Xóa bỏ tình trạng Tab `Tổng quan hệ thống` cộng cả phí ship GHN vào doanh thu còn Tab `Tài chính doanh nghiệp` không cộng phí ship gây lệch số khi Tổng giám đốc chuyển tab.
3. **Sửa nhãn sai `"Bảo chứng Escrow · 7 ngày"` tại `AdminFinancePayoutsPage.tsx:249` thành `"Bảo chứng Đối soát Đổi trả · 14 ngày"`** kèm bộ lọc tách biệt hai danh sách: `Danh sách chờ mở khóa 14 ngày` và `Danh sách dự phòng chờ đạt KPI Deal`.
4. **Nâng cấp Màn hình Duyệt Ngoại lệ Deal `> 16%` của `SYSTEM_ADMIN` ([VipExceptionsPage.tsx](file:///c:/HW/CAPSTONE/frontend/src/pages/admin/VipExceptionsPage.tsx)):**
   Khi Tổng giám đốc xem xét một đề xuất Deal `20%` (vượt ngưỡng `16%`), màn hình phải hiển thị bảng thẩm định biên an toàn tài chính ngay trên thẻ duyệt:
   - `Giá bán sản phẩm` vs `Giá sàn bảo vệ (floorPrice)` vs `Mức giảm Voucher KOL đi kèm`
   - `Bậc hiện tại của KOL` (ví dụ Bậc Vàng `12%`) $\rightarrow$ `Phần trả chắc chắn sau 14 ngày: 12%` | `Phần thưởng vượt trội chỉ trả nếu đạt KPI: +8%`
   - `Mục tiêu KPI cam kết` (`Doanh số sạch tối thiểu` & `Lợi nhuận gộp ước tính mang về sau khi trừ 20% thù lao`).
5. **Bút toán Kiểm toán Bất biến (`Double-Entry FinancePosting Reconciliation`):** Đảm bảo hàm `reconcileLedger()` của Kế toán kiểm tra đủ 7 tài khoản chữ T (bổ sung tài khoản `DEAL_KPI_ESCROW_RESERVE`) luôn trả về **`Chênh lệch = 0 ₫ (BALANCED)`** sau mọi nghiệp vụ đặt hàng, giao hàng, hết 14 ngày, chốt KPI, trượt KPI, hoàn hàng và rút tiền khấu trừ 10% thuế TNCN.
