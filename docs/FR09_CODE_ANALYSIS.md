# FR-09 — Cấu hình mốc thưởng doanh số tháng

Đối chiếu lại code ngày 19/10/2026 và vẽ lại theo bố cục class/sequence của Figure 13–14 trong mục 3. Detailed Design ở file Word tham khảo. Bộ sơ đồ hiện tại gồm hai file riêng:

- `diagrams/FR09_Configure_Monthly_Revenue_Bonus_Milestones_Class_Diagram.drawio`
- `diagrams/FR09_Configure_Monthly_Revenue_Bonus_Milestones_Sequence_Diagram.drawio`

Tạo class trước, sequence sau bằng `node docs/diagrams/build-fr09-diagrams.cjs`. Hai file trên được thay trực tiếp bằng bản mới, mỗi file một trang, tiếng Anh, trắng đen. Sequence tập trung use case tạo mốc cấu hình, dùng actor Shop Manager → Browser → CommissionRulesController → CommissionRulesService → PrismaService → Database. Không có khung ref/alt/break ngang hoặc dấu hủy đối tượng. Các thao tác sửa/bật-tắt/xóa và mô phỏng được đối chiếu trong phân tích dưới đây, không ghép thành một phiên làm việc quá dài trong hình. Chốt tháng/chi trả là phạm vi khác và đã bỏ khỏi class diagram.

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

Page lấy auth/me để chọn Store và có fallback Store demo khi auth lỗi hoặc không xác định được Store. Fallback frontend không vượt qua phân quyền backend. API trả lỗi thì trang hiển thị toast.error; sau thành công đóng modal/reset form và gọi loadRules. Danh sách lấy mọi mốc **chưa xóa**, gồm cả inactive, sắp minMonthlyRevenue tăng dần.

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

Frontend hiện debounce mô phỏng **400ms**, dependency là **simRevenue và storeId**. Không có rules trong dependency của effect hiện tại; lưu mốc rồi chỉ tải lại rules không tự bảo đảm chạy mô phỏng lại. Preview mặc định dùng ngày hiện tại, không tạo MonthlyBonusResult, AuditLog chốt tháng hoặc giao dịch ví. Không tự động tính theo doanh số thật khi người dùng nhập số mô phỏng.

## 6. Phần chốt tháng trên cùng màn hình

Trang còn có chọn tháng/KOL, xem lịch sử, chốt, duyệt và chi trả. Bộ hình mới không đưa MonthlyBonusResult/Order/OrderRefund/WalletsService vào phạm vi cấu hình. Sequence chỉ thể hiện tạo mốc; không nối việc tạo mốc với tự động trả thưởng. Các đoạn sau là thông tin ngữ cảnh của module, không phải những bước xuất hiện trong sequence mới.

`calculateValidMonthlyRevenue` dùng đơn của Store+KOL có status COMPLETED, completedAt trong tháng theo UTC+7. Doanh số hiện tính từ **finalAmount có gồm shipping**, trừ refund COMPLETED; nếu không có tổng refund dương thì fallback refundedAmount, chặn không trừ vượt giá trị đơn.

`settleMonthlyBonus` mặc định chặn kỳ tương lai/chưa kết thúc; có allowUnfinishedMonth ở backend nhưng trang hiện không gửi. Transaction kiểm tra kết quả theo unique(Store, KOL, yearMonth); đã chốt thì trả snapshot cũ. Kỳ mới tính thưởng/adjustments, lưu MonthlyBonusResult PENDING và audit. Duyệt chuyển APPROVED; payout riêng mới gọi WalletsService.creditAvailableBalance với cùng transaction, ghi ledger và chuyển PAID.

MonthlyBonusResult.appliedRuleId là FK tùy chọn tới CommissionRule; ruleSnapshot lưu dữ liệu JSON. walletTransactionId là scalar trong model hiện tại. Tạo/sửa mốc không tự sửa payout đã chốt.

Phần xử lý sửa giữa tháng cần phân biệt với lịch sử version đầy đủ: code chia doanh số theo cutoff rồi tính trên danh sách rule hiện tại; không dựng lại mọi phiên bản từ audit. Truy vấn UPDATE_COMMISSION_RULE audit để tìm cutoff hiện chưa lọc Store trong where, nên không mô tả đây là cơ chế phân kỳ lịch sử hoàn chỉnh. Chi tiết rộng hơn cần xem cùng source trước khi thay đổi nghiệp vụ.

## 7. Kiểm tra

Đã đối chiếu lại frontend, HTTP adapter, controller, guard, DTO, service, PrismaService và Prisma schema. Bộ test `commission-rules.service.spec.ts` và `store-owner.guard.spec.ts` hiện có chạy đạt 38/38. Thay đổi chỉ là sơ đồ/tài liệu, không chạy mutation cấu hình thật, không thay đổi code nghiệp vụ hay .env.

Mỗi file có một mxGraphModel, ID duy nhất, các cạnh quan hệ được gắn source/target thật vào class. Mỗi class là một nhóm có ba ngăn tên/thuộc tính/phương thức; di chuyển khối trong Draw.io sẽ kéo theo nội dung. Không dùng các đoạn thẳng rời làm quan hệ giữa lớp. Builder kiểm tra điểm neo nằm trên biên, dây không xuyên vào khối và không có đoạn quan hệ chồng nhau. PNG preview phân biệt nét liền/nét đứt, mũi tên gọi/trả về và tam giác rỗng; đây vẫn là renderer geometry, không phải export native của diagrams.net.

## 8. Cách đọc bộ UML mới và mẫu Word

Đã đọc và trích trực tiếp hình rId136/rId137 tương ứng Figure 13/14 từ mục 3. Detailed Design trong `3681_FA24SE007_GFA76_FA24SE007_VANVTT_FinalReport.docx`. File Word được mở chỉ đọc và không bị chỉnh sửa. Nội dung dự án khác trong tài liệu chỉ là mẫu bố cục, không được dùng làm yêu cầu nghiệp vụ của SCANMS.

- Tên hai hình cùng dùng “FR-09 Configure Monthly Revenue Bonus Milestones”; hậu tố Class Diagram / Sequence Diagram phân biệt loại hình. Không thêm chữ service trước tên lớp.
- Giữ tên code thật: CommissionRulesController, CommissionRulesService, StoreOwnerGuard, PrismaService, PrismaClient, Store, CommissionRule, AuditLog. Browser trong sequence gồm CommissionRulesPage và object commissionRulesService bên frontend; không đổi tên object frontend thành service backend.
- `-` là thuộc tính/phương thức private có thật, ví dụ prisma và verifyStoreExists. `+` là public; các property trên model dữ liệu Prisma là public, nên không gán private giả cho chúng.
- Các model Prisma không tự có get()/set() hoặc phương thức CRUD. Ngăn phương thức để trống thay vì bịa thêm hàm. Lớp trong hình chỉ liệt kê thành viên thuộc phạm vi cấu hình, không toàn bộ module.
- Nét liền có mũi tên mở: tham chiếu được giữ qua constructor, như Controller → CommissionRulesService và Service → PrismaService. Nét liền không mũi tên + bội số: Store 1 → 0..* CommissionRule.
- Nét đứt có mũi tên mở: dependency «use», như controller dùng StoreOwnerGuard qua decorator hoặc Prisma truy vấn/lưu model. Không nối trực tiếp AuditLog với CommissionRule như một FK vì ruleId nằm trong details JSON.
- Nét liền + tam giác rỗng: kế thừa thật `PrismaService extends PrismaClient`. Không thêm mũi tên Implements vì dự án không có IService/Repository/UnitOfWork tương ứng với kiến trúc .NET của mẫu.
- Sequence có actor Shop Manager, header Browser và instance `:CommissionRulesController`, `:CommissionRulesService`, `:PrismaService`, Database. Mũi tên gọi là nét liền đầu tam giác đặc; trả về là nét đứt đầu mở. NestJS guard/pipe nằm trước controller, không bị vẽ sai thành controller tự gọi guard.
- Callback của `$transaction` được thể hiện bằng lời gọi PrismaService → CommissionRulesService, activation lồng và kết quả callback trả lại trước COMMIT. Advisory lock và audit nằm trong transaction tạo mốc.
- Không sao chép dấu X cuối lifeline trong mẫu: những singleton NestJS này không bị hủy khi kết thúc request. Không sao chép khung alt ngang vì người dùng yêu cầu bỏ các khung đó.

Quy ước quan hệ đối chiếu [OMG UML 2.5.1, phần Dependency/Generalization/Association](https://www.omg.org/spec/UML/2.5.1/PDF).

Mở trực tiếp hai file Draw.io ở đầu tài liệu. Nếu dùng Extras → Edit Diagram, dán toàn bộ [FR09_Class_Paste.xml](diagrams/FR09_Class_Paste.xml) hoặc [FR09_Sequence_Paste.xml](diagrams/FR09_Sequence_Paste.xml), mỗi file có root mxGraphModel.
