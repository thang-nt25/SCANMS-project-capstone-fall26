# TÀI LIỆU NGHIỆM THU: CƠ CHẾ MÃ KOC TOÀN SHOP (VANITY CODE) & TỰ ĐỘNG THU HỒI MÃ CŨ

**Mã đề tài:** `FA26SE032` (**SCANMS**)  
**Tên đề tài:** Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết  
**Nhóm thực hiện:** 4 thành viên (Lead: Nguyễn Thành Thắng `SE184251`)  
**Ngày nghiệm thu:** 07/11/2026  

---

## 1. NGUYÊN TẮC THIẾT KẾ (.AGENTS DESIGN PRINCIPLES)

1. **Xóa bỏ 100% icon AI (`<Sparkles />` ✨):**
   - Không lạm dụng icon sparkle tạo cảm giác AI giả tạo. Sử dụng biểu tượng nghiệp vụ chuẩn: `<Ticket>` cho mã ưu đãi, `<Tag>` cho thẻ phân loại, `<Clock>` cho thời hạn.
2. **Triệt tiêu câu chữ "mô tả chỉ việc" (No lecturing copy):**
   - Loại bỏ hoàn toàn các khối chữ giảng giải cách bấm nút ("Khi bạn bấm phê duyệt thì...", "Mã đề xuất sẽ được gửi tới...", "Ghi nhận Attribution tự động 100%...").
   - Giao diện doanh nghiệp chỉ hiển thị đúng nhãn cần thiết (labels), số liệu thực tế, và động từ hành động ngắn gọn (`Gửi đề xuất`, `Xét duyệt`, `Phê duyệt`, `Từ chối`, `Hủy`).
3. **Bản sắc hệ thống nội bộ (Không phải sàn TMĐT mở):**
   - Xóa sạch các trường rác của sàn thương mại: giá trị giảm cố định VNĐ, trần giảm tối đa (Max Discount), đơn tối thiểu (Min Order), phạm vi từng sản phẩm lẻ (Product Scope), hạn dùng vụn vặt.
   - Mã của KOL là **Mã ưu đãi toàn shop (Store-wide Vanity Code)**. KOL đề xuất tên mã mang dấu ấn cá nhân, Shop Manager là người duy nhất phê duyệt và gán mức chiết khấu: **Giảm 5%** hoặc **Giảm 10%**.
   - **Quy tắc bất biến: 1 KOL = 1 Mã duy nhất trên một gian hàng:** Khi duyệt mã mới, backend tự động chuyển mã cũ sang `EXPIRED` (`Đã thay thế / Hết hạn`).

---

## 2. GIAO DIỆN & WORKFLOW NGHIỆM THU

### 2.1. Phía KOL ([`KolCouponsPage.tsx`](file:///c:/HW/CAPSTONE/frontend/src/pages/collaborator/KolCouponsPage.tsx))
- Tiêu đề gọn gàng: `Đề xuất mã ưu đãi`.
- Chọn Gian hàng đối tác liên kết.
- Nhập mã mong muốn với bộ đếm ký tự thực thời.
- Thẻ xem trước trực quan `MÃ ƯU ĐÃI (TOÀN SHOP)`.
- Checklist điều kiện ngắn gọn: 4–20 ký tự, chữ & số, có ít nhất 1 chữ cái, không từ cấm.
- Nút hành động: `Hủy bỏ` và `Gửi đề xuất`.

### 2.2. Phía Shop Manager ([`ShopCreatorIncentivesTab.tsx`](file:///c:/HW/CAPSTONE/frontend/src/components/promotions/ShopCreatorIncentivesTab.tsx))
- Khối `Đề xuất mã từ KOC`: Hiển thị danh sách đề xuất chờ duyệt sạch sẽ.
- Modal `Xét duyệt mã KOC`: Tóm tắt thông tin mã và KOC đề xuất, 2 nút chọn nhanh `Giảm 5%` và `Giảm 10%`.
- Nút hành động: `Hủy` và `Phê duyệt`. Không còn hộp cảnh báo thu hồi gây rối mắt.

---

## 3. BẰNG CHỨNG THỰC TẾ (LIVE TEST PROOF)

1. **Proof 1 - KOL Propose:** `docs/live_test_proof/proof_vanity_code_kol_clean_propose.png`
2. **Proof 2 - Shop Review:** `docs/live_test_proof/proof_vanity_code_shop_clean_review.png`
3. **Proof 3 - Shop Approved Table:** `docs/live_test_proof/proof_vanity_code_shop_approved.png`
4. **Proof 4 - KOL Active List:** `docs/live_test_proof/proof_vanity_code_kol_active.png`

---

## 4. CHẤT LƯỢNG MÃ NGUỒN
- TypeScript compilation: 0 lỗi.
- Vite build: thành công 100% trong 2.52s.
- Toàn bộ backend xử lý atomic transaction thu hồi mã cũ khi kích hoạt mã mới.
