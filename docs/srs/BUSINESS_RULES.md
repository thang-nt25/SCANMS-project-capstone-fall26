# ENTERPRISE BUSINESS RULES SPECIFICATION (BRD v1.0.0)
## Project Name: InfluxNet - KOL & Sales Collaborator Management Platform
**Official Registered Code:** FA26SE032  
**Document Classification:** Internal Technical & Business Rule Matrix  
**Author / Standard:** Senior Staff Software Architect & Defense Standards Board  
**Target Jury / Faculty:** Capstone Defense Committee (FPT University)

Tài liệu này quy định chi tiết toàn bộ **Quy tắc Nghiệp vụ Kỹ thuật (Enterprise Technical Business Rules)**, Phương trình Toán học Tài chính, Ràng buộc Giao dịch CSDL và Quy trình Xử lý Ngoại lệ cho hệ thống **InfluxNet**.

---

## 🔒 1. MODULE 1: IDENTITY, SECURITY & ACCESS CONTROL (BR-SEC)

### BR-SEC-001: Mật khẩu & Thuật toán Mã hóa Chống brute-force
- **Mô tả:** Mật khẩu người dùng (`users.password_hash`) bắt buộc phải băm bằng thuật toán `bcrypt` với Salt Factor $\ge 10$.
- **Xác thực:** Nghiêm cấm lưu trữ mật khẩu ở dạng plain-text hoặc mã hóa 1 chiều yếu (`MD5`, `SHA1`).
- **Ngoại lệ:** Trả về HTTP `400 Bad Request` nếu mật khẩu không đủ độ phức tạp (Tối thiểu 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt).

### BR-SEC-002: Ma trận Phân quyền RBAC 5 Roles (Role-Based Access Control)
- **Mô tả:** Mỗi API Endpoint bắt buộc phải gắn Decorator `@Roles(...)` kiểm soát vai trò:
  1. `SYSTEM_ADMIN`: Chỉ có quyền READ trên Executive Dashboards và Audit Logs toàn sàn.
  2. `SYSTEM_MANAGER`: Quản lý SaaS Web, duyệt Store, xem cảnh báo AI Fraud.
  3. `SHOP_MANAGER`: Quản lý toàn bộ dữ liệu thuộc Cửa hàng của mình (`WHERE store_id = req.user.store_id`).
  4. `SHOP_STAFF`: Quản lý đối soát đơn hàng và thông tin rút tiền thuộc Store của mình.
  5. `COLLABORATOR`: Chỉ có quyền READ/WRITE trên dữ liệu của chính cá nhân mình (`WHERE collaborator_id = req.user.id`).
- **Ngoại lệ:** Trả về HTTP `403 Forbidden` nếu người dùng truy cập tài nguyên vượt phân quyền.

### BR-SEC-003: Nguyên tắc Ràng buộc Xóa Mềm Tuyệt Đối (100% Soft Delete Invariant)
- **Mô tả:** Tuyệt đối **KHÔNG SỬ DỤNG câu lệnh SQL `DELETE`** trong toàn bộ hệ thống đối với các bảng nghiệp vụ.
- **Quy trình:** Thao tác xóa chuyển cờ `is_deleted = true` và `deleted_at = CURRENT_TIMESTAMP`.
- **Ràng buộc:** Tất cả câu lệnh SQL Query / TypeORM Entity bắt buộc phải áp dụng Global Scope `WHERE is_deleted = false`.

---

## 🎯 2. MODULE 2: ATTRIBUTION & TRACKING ENGINE (BR-ATTRIB)

### BR-ATTRIB-001: Quy tắc "Last-Click Wins" (Lượt nhấp cuối cùng thắng)
- **Kịch bản:** Khách hàng nhấp vào Link tiếp thị của KOL A vào ngày 1, sau đó nhấp vào Link của KOL B vào ngày 5 và thực hiện mua hàng.
- **Quy tắc:** Hoa hồng đơn hàng thuộc về KOL B (Lượt nhấp hợp lệ CUỐI CÙNG trước khi chốt đơn).

### BR-ATTRIB-002: Thứ tự Ưu tiên Ghi nhận (Attribution Priority Hierarchy)
Khi Webhook nhận đơn hàng (`POST /api/v1/orders/webhook`), hệ thống phân bổ theo thứ tự ưu tiên tuyệt đối:
1. **P1 (Custom Promo Coupon Code):** Nếu đơn hàng chứa Mã giảm giá riêng (VD: `KOLTHANG10`), gán đơn cho KOL sở hữu mã.
2. **P2 (Encrypted Cookie `influx_ref`):** Kiểm tra Cookie trình duyệt chưa hết hạn (`attribution_window_days`).
3. **P3 (Device Fingerprint):** Khớp trùng địa chỉ IP + UserAgent trong 24 giờ.

### BR-ATTRIB-003: Thời hạn Cookie Tùy chỉnh (Attribution Window)
- **Công thức tính thời gian sống Cookie:**
  $$\text{Expired\_At} = \text{Click\_Time} + (\text{stores.attribution\_window\_days} \times 86400 \text{ giây})$$
- Mặc định = 30 ngày. Shop Manager có thể cài đặt từ 1 đến 365 ngày.

### BR-ATTRIB-004: Chống Click Spam qua Redis Rate Limiting
- **Mô tả:** Áp dụng thuật toán Sliding Window Log trên Redis: Tối đa 10 Clicks / giây / IP.
- **Xử lý:** Các lượt click vượt ngưỡng vẫn chuyển hướng khách đến trang sản phẩm nhưng **KHÔNG** lưu vào `click_traffic_logs` và **KHÔNG** ghi Cookie.

---

## 🛒 3. MODULE 3: CATALOG & SAMPLE PRODUCT WORKFLOWS (BR-CATALOG)

### BR-CATALOG-001: Ràng buộc Giá bán & Hoa hồng Sản phẩm
- `products.price` $\ge 0$. Trả về `400 Bad Request` nếu nhập giá âm.
- `products.custom_commission_rate`: Nếu null, hệ thống tự động sử dụng `stores.default_commission_rate`.

### BR-CATALOG-002: Luồng Yêu cầu Sản phẩm Mẫu Dùng thử (Sample Request Lifecycle)
- **Quy tắc:** Mỗi KOL chỉ được xin tối đa 1 sản phẩm mẫu / 1 SKU sản phẩm.
- **Chuyển trạng thái:** `PENDING` $\xrightarrow{\text{Shop duyệt}}$ `APPROVED` $\xrightarrow{\text{Gửi bưu điện}}$ `SHIPPED`.
- **Bắt buộc:** Shop Manager khi đổi trạng thái sang `SHIPPED` phải cập nhật Mã vận đơn (`tracking_number`).

---

## 💵 4. MODULE 4: MULTI-ITEM COMMISSION ENGINE (BR-COMM)

### BR-COMM-001: Phương trình Tính Hoa hồng Chi tiết Từng Món (Per-Item Billing Equation)
Hoa hồng cho mỗi sản phẩm $i$ trong đơn hàng được tính chính xác theo công thức:

$$C_i = Q_i \times P_i \times R_i$$

Trong đó:
- $Q_i$: Số lượng mua sản phẩm $i$ (`order_items.quantity`).
- $P_i$: Đơn giá sản phẩm $i$ (`order_items.unit_price`).
- $R_i$: % Hoa hồng tổng hợp sản phẩm $i$:
$$R_i = R_{\text{base}} + R_{\text{tier}} + R_{\text{campaign}}$$
  - $R_{\text{base}}$: Tỷ lệ hoa hồng sản phẩm hoặc Shop (`custom_commission_rate` || `default_commission_rate`).
  - $R_{\text{tier}}$: % Thưởng cấp bậc CTV (Đồng: 0%, Bạc: 1%, Vàng: 3%, Kim Cương: 5%).
  - $R_{\text{campaign}}$: % Thưởng chiến dịch độc quyền (nếu có).

Tổng hoa hồng đơn hàng:
$$\text{Total\_Commission} = \sum_{i=1}^{n} C_i$$

### BR-COMM-002: Vòng đời Trạng thái Hoa hồng (Commission Lifecycle)
```
[Đơn Hàng Mới] ---> PENDING (Cộng vào Ví Chờ Pending Balance)
                        │
         ┌──────────────┴──────────────┐
         │ (Sau 14 ngày không đổi trả) │ (Khách trả hàng / Hủy đơn)
         ▼                             ▼
     APPROVED                       REVERSED
 (Cộng vào Ví Khả Dụng)        (Trừ Ví Chờ về lại 0)
```

---

## ↩️ 5. MODULE 5: REFUND & COMMISSION REVERSAL CLAWBACK (BR-REFUND)

### BR-REFUND-001: Quy trình Thu hồi Hoa hồng khi Trả hàng (Clawback Protocol)
- **Sự kiện kích hoạt:** Shop Manager bấm đánh dấu đơn hàng bị trả (`RETURNED`) hoặc Hủy đơn (`CANCELLED`).
- **Giao dịch CSDL Atomic (ACID Transaction):**
  1. `UPDATE orders SET status = 'RETURNED' WHERE id = $order_id;`
  2. `UPDATE commissions SET status = 'REVERSED' WHERE order_id = $order_id;`
  3. `UPDATE wallets SET pending_balance = pending_balance - $commission_amount WHERE collaborator_id = $collab_id;`
  4. `INSERT INTO financial_ledgers (wallet_id, transaction_type, amount, balance_before, balance_after, reference_id)`  
     với `transaction_type = 'REVERSAL'` và `amount = -$commission_amount`.
- **Ngoại lệ:** Trả về `400 Bad Request` nếu hoa hồng của đơn hàng này đã chuyển sang trạng thái `APPROVED`.

---

## 💳 6. MODULE 6: WALLET & DOUBLE-ENTRY LEDGER INTEGRITY (BR-FIN)

### BR-FIN-001: Ràng buộc Số dư Không Âm (Non-Negative Balance Constraint)
- Ràng buộc CSDL: `CHECK (available_balance >= 0 AND pending_balance >= 0)`.
- **Bảo vệ:** Nếu câu lệnh SQL `UPDATE` làm số dư ví $< 0$, PostgreSQL sẽ tự động Abort Transaction và rollback lập tức.

### BR-FIN-002: Bảo vệ Chống Lặp Tiền bằng Pessimistic Row Locking (`SELECT ... FOR UPDATE`)
Khi xử lý Rút tiền hoặc Duyệt Payout, câu lệnh SQL bắt buộc phải khóa dòng ví:
```sql
BEGIN;
SELECT available_balance, pending_balance, version 
FROM wallets 
WHERE collaborator_id = $1 
FOR UPDATE;

-- Kiểm tra số dư & Thực thi trừ tiền
UPDATE wallets 
SET available_balance = available_balance - $amount, 
    version = version + 1 
WHERE collaborator_id = $1 AND version = $current_version;
COMMIT;
```
- **Tác dụng:** Loại bỏ 100% rủi ro Race Condition khi KOL cố tình bấm rút tiền nhiều lần liên tiếp.

### BR-FIN-003: Nguyên tắc Sổ Cái Tài Chính Bất Biến (Immutable Ledger Invariant)
- Tất cả sự biến động số dư ví **BẮT BUỘC** phải ghi lại 1 dòng trong `financial_ledgers`.
- Bản ghi sổ cái là **Append-Only** (Nghiêm cấm mọi hành vi `UPDATE` hoặc `DELETE` trên bảng `financial_ledgers`).
- Phương trình bất biến:
$$\text{balance\_after} = \text{balance\_before} + \text{amount}$$

---

## 💸 7. MODULE 7: SETTLEMENT, PAYOUT & TAX DEDUCTION (BR-PAYOUT)

### BR-PAYOUT-001: Điều kiện Đủ để Rút Tiền
Một yêu cầu rút tiền chỉ hợp lệ khi:
1. `collaborator_profiles.kyc_status = 'VERIFIED'`.
2. $\text{amount} \le \text{wallets.available\_balance}$.
3. $\text{amount} \ge \text{stores.min\_payout_amount}$ (Mặc định $\ge 200.000\text{ VNĐ}$).

### BR-PAYOUT-002: Khấu trừ Thuế Thu Nhập Cá Nhân (PIT 10% Tax Deduction)
- Đối với mỗi lệnh rút tiền có $\text{amount} \ge 2.000.000\text{ VNĐ}$, tự động tính toán:
  $$\text{Tax\_Deduction} = \text{amount} \times 10\%$$
  $$\text{Actual\_Payout\_Amount} = \text{amount} \times 90\%$$

### BR-PAYOUT-003: Bắt buộc Minh chứng Chuyển khoản (Proof of Payment Image Upload)
- Khi Shop Manager phê duyệt Payout, API yêu cầu bắt buộc 2 trường:
  - `proof_image_url`: Link ảnh chụp màn hình bill chuyển khoản ngân hàng.
  - `bank_ref_code`: Mã giao dịch ngân hàng đối soát.

---

## 💬 8. MODULE 8: IN-APP CHAT REALTIME PROTOCOLS (BR-CHAT)

### BR-CHAT-001: Quyền Khởi tạo Cuộc Trò Chuyện
- Cuộc trò chuyện (`conversations`) chỉ được khởi tạo giữa 1 `SHOP_MANAGER` và 1 `COLLABORATOR`.
- Không cho phép chat giữa 2 COLLABORATOR với nhau.

### BR-CHAT-002: Đồng bộ Thời gian thực qua Socket.io
- Khi gửi tin nhắn qua `POST /chat/messages`, hệ thống đồng thời phát sự kiện `emit('new_message')` đến Room `conversation_$id`.

---

## 🏆 9. MODULE 9: COLLABORATOR TIERING SYSTEM (BR-TIER)

Hệ thống tự động chạy Cron Job tính tổng doanh số tích lũy vào 00:00 ngày 1 hàng tháng:

| Cấp bậc (Tier) | Doanh số tích lũy $S$ (VNĐ) | % Hoa hồng thưởng thêm ($R_{\text{tier}}$) |
| :--- | :--- | :--- |
| **BRONZE** | $0 \le S < 10.000.000$ | $+0.0\%$ |
| **SILVER** | $10.000.000 \le S < 50.000.000$ | $+1.0\%$ |
| **GOLD** | $50.000.000 \le S < 200.000.000$ | $+3.0\%$ |
| **PLATINUM**| $S \ge 200.000.000$ | $+5.0\%$ |

---

## 🤖 10. MODULE 10: AI MATCHING & ANTI-FRAUD DETECTION (BR-AI)

### BR-AI-001: Thuật toán AI Smart KOL Matching
- Phân tích lịch sử bán hàng và tính chỉ số phù hợp (Affinity Score):
  $$\text{Affinity\_Score} = 0.6 \times \text{Conversion\_Rate} + 0.4 \times \text{Category\_Experience\_Weight}$$
- Gợi ý Top 5 KOLs phù hợp nhất cho Shop Manager trong danh mục sản phẩm tương ứng.

### BR-AI-002: Phát hiện Gian lận Click Spam (AI Fraud Detection Alert)
- Cảnh báo tự động nếu 1 Link tiếp thị có tỷ lệ nhấp/đơn bất thường ($\text{Clicks} > 5000$ nhưng $\text{Orders} = 0$).
- Ghi vết vào `audit_logs(action = 'AI_FRAUD_FLAG')` để System Manager xem xét khóa tài khoản gian lận.

---
*Tài liệu Quy tắc Nghiệp vụ Doanh nghiệp v1.0.0 thuộc dự án InfluxNet.*
