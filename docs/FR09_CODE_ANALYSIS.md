# FR-09 — Cấu hình mốc thưởng doanh số tháng

Đối chiếu code ngày 2026-10-16. Bộ sơ đồ hiện tại gồm hai file riêng:

- `diagrams/FR09_Configure_Monthly_Revenue_Bonus_Milestones_Class_Diagram.drawio`
- `diagrams/FR09_Configure_Monthly_Revenue_Bonus_Milestones_Sequence_Diagram.drawio`

Tạo class trước, sequence sau bằng `node docs/diagrams/build-fr09-diagrams.cjs`. Sequence một trang, tiếng Anh, trắng đen; không dùng khung ref/alt ngang. Luồng chính là tải mốc → tạo mốc → tải lại → mô phỏng. Sửa/trạng thái/xóa dùng cùng chuỗi thành phần, mô tả endpoint và transaction ở cuối trang. Các bản Compact/EN cũ được giữ nguyên; tên hai file trên là bộ vừa đối chiếu lại. Phân tích rộng hơn của module có trong `FR09_CLASS_SEQUENCE_DIAGRAMS.md`.

## 1. Giao diện và API thực tế

`frontend/src/pages/merchant/CommissionRulesPage.tsx` quản lý Store được chọn, danh sách mốc, modal tạo/sửa/xóa, form, mô phỏng và lịch sử chốt tháng. Form hiện gửi name, description, minMonthlyRevenue, achievementBonus, bonusPercentage, isActive. effectiveFrom/effectiveTo có trong backend DTO nhưng không được form hiện tại gửi.

Giao diện gọi object `commissionRulesService` trong `frontend/src/services/commission-rules.service.ts`, sau đó API `/api/stores/:storeId/commission-rules`:

| Thao tác | Method và đường dẫn tương đối |
|---|---|
| Danh sách / chi tiết | GET `/` / GET `/:ruleId` |
| Tạo | POST `/` |
| Sửa | PATCH `/:ruleId` |
| Bật/tắt | PATCH `/:ruleId/status` |
| Xóa mềm | DELETE `/:ruleId` |
| Mô phỏng | POST `/preview` với monthlyRevenue |
| Khôi phục | POST `/:ruleId/restore` — có backend, chưa có nút restore trên trang này |

Page lấy auth/me để chọn Store và có fallback Store demo nếu auth lỗi/thiếu token. Fallback frontend không vượt qua phân quyền backend. API trả lỗi thì trang hiển thị errorMsg; sau thành công đóng modal/reset form và gọi loadRules. Danh sách lấy mọi mốc **chưa xóa**, gồm cả inactive, sắp minMonthlyRevenue tăng dần.

## 2. Phân quyền

`CommissionRulesController` áp dụng `StoreOwnerGuard` toàn controller. Guard xác thực JWT Bearer nếu request chưa có user, kiểm tra user active/chưa xóa và Store tồn tại/chưa xóa.

- SHOP_MANAGER chỉ quản lý Shop mình sở hữu. Code có ngoại lệ cho hai ID demo cụ thể; không diễn giải ngoại lệ đó thành quyền của mọi Shop Manager.
- SYSTEM_ADMIN được GET, bị chặn thao tác ghi. Frontend hiển thị chế độ chỉ xem cho vai trò này.
- Preview là ngoại lệ read-only: user đã xác thực, active được mô phỏng sau khi kiểm tra Store, không bắt buộc là chủ Shop.
- SYSTEM_MANAGER không được tự động coi như SYSTEM_ADMIN; guard không cấp quyền cấu hình chung cho vai trò này.

DTO validation thuộc request pipeline, không phải method bên trong StoreOwnerGuard.

## 3. Điều kiện cấu hình

Nguồn: `backend/src/modules/commission-rules/dto/*commission-rule.dto.ts` và `commission-rules.service.ts`.

Tên trim không rỗng, tối đa 150 ký tự; description tối đa 500. minMonthlyRevenue là chuỗi số nguyên dương VND; achievementBonus chuỗi số nguyên không âm, mặc định 0. bonusPercentage 0–100, tối đa hai chữ số thập phân. Các trường tiền/tỷ lệ lưu Prisma.Decimal, response chuyển thành chuỗi.

Nếu cả hai ngày hiệu lực có giá trị, effectiveTo phải sau effectiveFrom. Khi tạo mà không truyền effectiveFrom, backend dùng thời điểm hiện tại; effectiveTo mặc định null.

Không được trùng minMonthlyRevenue trong cùng Store với bất kỳ mốc chưa xóa, **kể cả mốc inactive**. Tỷ lệ phần vượt phải không giảm khi ngưỡng tăng. Kiểm tra hierarchy cũng đọc toàn bộ mốc chưa xóa, không chỉ mốc active dù tên biến là allActiveRules. Không có yêu cầu achievementBonus phải tăng theo ngưỡng trong vòng kiểm tra này.

## 4. Transaction, version và audit

`CommissionRulesService.create` kiểm tra Store/range/ngày/tên, rồi mở transaction. Trong transaction:

1. Lấy PostgreSQL advisory transaction lock từ hash Store.
2. Đọc mốc trùng ngưỡng và các mốc cùng Store để kiểm tra hierarchy.
3. Tạo CommissionRule version=1.
4. Ghi AuditLog action CREATE_COMMISSION_RULE trong cùng transaction.

Audit lỗi cũng làm rollback tạo mốc. Service không có Redis cache riêng cho đường cấu hình này.

Update đọc currentRule theo ruleId+storeId+isDeleted=false, kiểm tra payload không rỗng, range/ngày, rồi transaction kiểm tra duplicate/hierarchy, update và audit oldValues/newValues. **Update không lấy advisory lock như create**; không vẽ cả hai dùng chung khóa. Update dùng currentRule.version + 1, không có bảng RuleVersion riêng hoặc optimistic compare-and-swap theo version trong đoạn này.

updateStatus có transaction update trạng thái + version + audit. remove cập nhật isDeleted=true, isActive=false, deletedAt và audit; không xóa vật lý, không tăng version ở nhánh remove. restore kiểm tra trùng ngưỡng rồi khôi phục, tăng version và audit; không khẳng định restore kiểm tra lại toàn bộ hierarchy vì code không làm vậy.

CommissionRule.createdBy/updatedBy là scalar UUID trong schema, không khai báo relation tới User. AuditLog.ruleId nằm trong details JSON, không phải FK tới CommissionRule.

## 5. Công thức thưởng đúng với code

`previewBonus` kiểm tra Store, doanh số không âm, đọc các mốc chưa xóa rồi gọi `calculateProgressiveBonus`. Engine lọc isActive và hiệu lực theo ngày tham chiếu, sắp ngưỡng tăng dần, lấy các mốc revenue >= minMonthlyRevenue.

**Tổng thưởng = thưởng cố định của mốc cao nhất đạt được + tổng thưởng phần vượt từng khoảng.** Không cộng dồn thưởng cố định của mọi mốc; không nhân tỷ lệ mốc cao nhất với toàn doanh số.

Ví dụ chỉ có mốc 50.000.000đ, fixed bonus 0, rate 2%:

- Doanh số 40.000.000đ: 0đ.
- Doanh số 50.000.000đ: đạt mốc nhưng phần vượt bằng 0, thưởng 0đ.
- Doanh số 60.000.000đ: (60.000.000 − 50.000.000) × 2% = 200.000đ.
- Nếu fixed bonus là 500.000đ, ví dụ cuối có tổng 700.000đ.

Với thêm mốc 100 triệu rate 3%, doanh số 120 triệu: khoảng 50→100 triệu dùng 2%, khoảng 100→120 triệu dùng 3%, cộng fixed bonus của mốc 100 triệu. Engine dùng Decimal và ROUND_HALF_UP đến hai chữ số thập phân.

Frontend debounce mô phỏng **400ms**, chạy khi simRevenue hoặc rules thay đổi, nên sau tạo/sửa có thể tự mô phỏng lại mà không cần nút riêng. Preview mặc định dùng ngày hiện tại, không tạo MonthlyBonusResult, AuditLog chốt tháng hoặc giao dịch ví. Không tự động tính theo doanh số thật khi người dùng nhập số mô phỏng.

## 6. Phần chốt tháng trên cùng màn hình

Trang còn có chọn tháng/KOL, xem lịch sử, chốt, duyệt và chi trả. Class diagram có MonthlyBonusResult/Order/OrderRefund để giải thích nguồn dữ liệu và snapshot; sequence tập trung phần **cấu hình + mô phỏng** theo yêu cầu FR-09, không nối việc tạo mốc với tự động trả thưởng.

`calculateValidMonthlyRevenue` dùng đơn của Store+KOL có status COMPLETED, completedAt trong tháng theo UTC+7. Doanh số hiện tính từ **finalAmount có gồm shipping**, trừ refund COMPLETED; nếu không có tổng refund dương thì fallback refundedAmount, chặn không trừ vượt giá trị đơn.

`settleMonthlyBonus` mặc định chặn kỳ tương lai/chưa kết thúc; có allowUnfinishedMonth ở backend nhưng trang hiện không gửi. Transaction kiểm tra kết quả theo unique(Store, KOL, yearMonth); đã chốt thì trả snapshot cũ. Kỳ mới tính thưởng/adjustments, lưu MonthlyBonusResult PENDING và audit. Duyệt chuyển APPROVED; payout riêng mới gọi WalletsService.creditAvailableBalance với cùng transaction, ghi ledger và chuyển PAID.

MonthlyBonusResult.appliedRuleId là FK tùy chọn tới CommissionRule; ruleSnapshot lưu dữ liệu JSON. walletTransactionId là scalar trong model hiện tại. Tạo/sửa mốc không tự sửa payout đã chốt.

Phần xử lý sửa giữa tháng cần phân biệt với lịch sử version đầy đủ: code chia doanh số theo cutoff rồi tính trên danh sách rule hiện tại; không dựng lại mọi phiên bản từ audit. Truy vấn UPDATE_COMMISSION_RULE audit để tìm cutoff hiện chưa lọc Store trong where, nên không mô tả đây là cơ chế phân kỳ lịch sử hoàn chỉnh. Chi tiết rộng hơn cần xem cùng source trước khi thay đổi nghiệp vụ.

## 7. Kiểm tra

Đã đối chiếu frontend, frontend service, controller, guard, DTO, service và Prisma schema; đọc các test có sẵn trong `backend/src/modules/commission-rules/tests/commission-rules.service.spec.ts`. Thay đổi chỉ là sơ đồ/tài liệu, không chạy mutation cấu hình thật, không thay đổi code nghiệp vụ hay .env. Xác minh hai file bằng parse XML, mỗi file một diagram, ID không trùng và xem ảnh render. PNG là bản preview từ geometry, không phải export trực tiếp diagrams.net.
