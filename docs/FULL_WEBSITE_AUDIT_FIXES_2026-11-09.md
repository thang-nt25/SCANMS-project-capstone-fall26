# Kết quả khắc phục 12 vấn đề audit — 09/11/2026

Phạm vi: sửa theo danh sách audit đã thống nhất. Không thêm thư viện, không sửa file CSS nguồn, không sửa schema/migration hoặc nạp lại database trong đợt này. Các thay đổi có sẵn trước đợt sửa được giữ lại. Chưa commit/push.

## Trạng thái từng vấn đề

`Fixed` nghĩa là đã có thay đổi code và căn cứ kiểm tra được nêu dưới đây; không đồng nghĩa đã kiểm thử thanh toán/giao nhận thật. `Partially Fixed` nghĩa là đã sửa code, nhưng còn bước kiểm tra trực quan hoặc tương tác trình duyệt chưa thực hiện được.

| # | Vấn đề | Trạng thái | Thay đổi và căn cứ |
| --- | --- | --- | --- |
| 1 | Quyền truy cập đơn qua số điện thoại/email người nhận | Fixed | Hồ sơ thống kê, danh sách và chi tiết chỉ đọc đơn theo customerId. Test chặn đơn thuộc tài khoản khác và đơn vãng lai dù trùng liên hệ. API thật đọc đơn tài khoản khác trả 403. |
| 2 | Hủy đơn thiếu hoàn tiền/tồn kho/ưu đãi | Fixed | Khách dùng quy trình hủy chung; khóa dòng đơn, kiểm tra chủ sở hữu, trạng thái, hoàn tiền đã trả vào Ví SCANMS, trả tồn kho và ưu đãi, lưu lý do. Gọi lại không hoàn hai lần. Có test tiền ví, tồn kho, quyền và trạng thái; chưa thực hiện giao dịch ghi trên DB demo. |
| 3 | KOL bị 403 khi mở hồ sơ đổi trả của mình | Fixed | Quyền người mua hỗ trợ KOL và các vai trò mua sắm; thao tác Shop vẫn cần sở hữu/bổ nhiệm tại cửa hàng. Test quyền và API thật: KOL mở hồ sơ của mình trả 200, không nhận phần thu nhập nội bộ. |
| 4 | Clawback theo tỷ lệ toàn đơn khi trả từng món | Fixed | Tính theo dòng hàng, số lượng và snapshot còn lại; giữ nguyên món không trả, tách thù lao cơ sở/phần KPI. Khi ghi nhận thu nhập sau một lần hoàn, cũng dùng snapshot còn lại. Có test 10%/16%, nhiều đối tác, trả nhiều lần và tích hợp handler hoàn tiền trong transaction giả lập. |
| 5 | Cache riêng tư dùng chung giữa tài khoản | Fixed | Cache địa chỉ gắn userId, bỏ dữ liệu cũ không có chủ sở hữu, xử lý danh sách rỗng, xóa khi đăng xuất. Các snapshot module được xóa khi đổi tài khoản, vai trò, token hoặc Store. Test storage và phiên đăng nhập đạt. |
| 6 | Thiếu trang Điều khoản/Chính sách/404 | Fixed | Thêm trang thông tin dựa trên cơ chế hiện có, route tương ứng và trang 404. Link đăng ký mở tab mới để giữ form. Kiểm tra render nội dung/đường quay lại đạt. Nội dung chính sách cần chủ dự án rà soát trước khi công bố chính thức. |
| 7 | Lỗi tải deal/ưu đãi bị hiển thị như danh sách rỗng | Fixed | Thêm error, thử lại và thông báo dữ liệu cũ; phân biệt lỗi với empty. Kiểm tra render khi mất kết nối đạt. |
| 8 | Danh sách deal bị cắt tại 100/200 bản ghi | Fixed | API có phân trang, tổng và thứ tự ổn định; hub tải tiếp đủ trang và không nhận kết quả thiếu khi trang sau lỗi. Ngoại lệ VIP có nút phân trang. Test 231/251 bản ghi và API thật đạt. API cũ vẫn giữ dạng mảng. |
| 9 | Focus/modal/dropdown chưa dùng bàn phím đầy đủ | Partially Fixed | Modal dùng chung quản lý focus, Tab/Shift+Tab, Escape của modal trên cùng, trả focus và khóa cuộn khi lồng nhau. Select liên kết label đúng nút, có phím điều hướng, Escape và focus rõ ràng. Test mô hình DOM cho modal đạt; còn kiểm tra bàn phím trên trình duyệt thật. |
| 10 | Toolbar sản phẩm chật trên màn nhỏ | Partially Fixed | Dưới 480px xếp tìm kiếm/lọc thành một cột; bỏ chiều rộng cố định xung đột, cho input co đúng và tăng vùng bấm. Typecheck/build đạt; chưa có ảnh xác minh responsive. |
| 11 | Vùng chạm nhỏ; nút Thay đổi email không thực hiện thao tác | Partially Fixed | Tăng các vùng chạm liên quan lên 44px, đổi email thành thông tin đăng nhập cố định thay cho nút gây hiểu nhầm. Còn kiểm tra cảm ứng/bố cục trực quan. |
| 12 | Thuật ngữ hoa hồng chưa thống nhất | Fixed | Ví và tìm kiếm sử dụng thù lao; giữ nguyên tên trường kỹ thuật/API. |

## Kiểm tra đã thực hiện

- Backend full unit suite: **192 suite đạt, 1.905 test đạt; 3 suite / 59 test bỏ qua**. Các suite database/Redis/e2e riêng không được tính là đã chạy.
- Sau những điều chỉnh cuối, chạy lại 7 suite liên quan: **40 test đạt**; ca hủy đơn và cache cũng được chạy lại sau thay đổi cuối.
- Frontend: **239 test đạt, 106 bỏ qua**, không có test thất bại. Phần lớn test trình duyệt cần môi trường riêng nên bị bỏ qua.
- Typecheck và build backend/frontend đạt. Frontend build còn cảnh báo bundle lớn hơn 500 kB.
- ESLint các file backend thuộc đợt sửa đạt; frontend lint không có error, còn **78 warning**. Không chạy lint toàn backend với chế độ tự sửa trên các file ngoài phạm vi.
- `git diff --check` đạt; không có thay đổi file `.css`, `.scss`, `.sass` nguồn.
- API thật: đăng nhập đủ 5 vai trò, đọc đơn/ví/hồ sơ, API deal phân trang; kiểm tra phân quyền Manager/Admin và KOL/người mua. Không tạo đơn, hủy đơn thật, hoàn tiền thật hoặc đổi quyền trên database để thử.

## Giới hạn và kiểm tra thủ công còn lại

Browser automation báo `The browser access host is unavailable`. Vì vậy không khẳng định đã nhìn hoặc thao tác giao diện thực tại 320–1920px.

1. Tại 320, 375, 390, 430, 768, 1024, 1280, 1920px: kiểm tra toolbar sản phẩm, menu, form, modal, dropdown và không có cuộn ngang ngoài ý muốn.
2. Dùng Tab/Shift+Tab trong modal xác nhận; Escape chỉ đóng modal trên cùng; kiểm tra focus quay về nút mở. Trong Select thử mũi tên, Home/End, Enter, Escape và Tab.
3. Trên DB demo: mua bằng Ví SCANMS rồi hủy khi còn PENDING; đối chiếu số dư, tồn kho, mã và lý do hủy. Thử bấm lại; không được hoàn hai lần.
4. Tạo đơn hai món có mức thù lao khác nhau; hoàn một món, đối chiếu ví, snapshot dòng hàng và phần KPI. Thử hoàn một phần số lượng trước khi thu nhập được ghi nhận.
5. Đăng nhập A rồi B trên cùng trình duyệt; B không có địa chỉ hoặc API địa chỉ lỗi thì không được thấy dữ liệu A.
6. KOL mua hàng và đi tiếp các bước lấy hàng trả/xác nhận trong hồ sơ của mình. Shop mua từ cửa hàng khác không được dùng quyền Shop để xử lý hồ sơ bên bán.

Đơn vãng lai chưa gắn tài khoản không được tự nhận quyền qua liên hệ người nhận. Đơn đã thanh toán nhưng chưa có tài khoản nhận hoàn phải chuyển vận hành đối soát; không tự gán chủ hoặc tự chuyển tiền về một tài khoản khác. Tiền hoàn hiện vào Ví SCANMS; chưa bổ sung hoàn ngược PayOS/ngân hàng hay tự động xác nhận bồi hoàn GHN.

## Các file của đợt sửa này

### Backend source

- `backend/src/modules/customer/customer.service.ts`
- `backend/src/modules/customer/customer.module.ts`
- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/returns/return.service.ts`
- `backend/src/modules/commissions/commissions.service.ts`
- `backend/src/modules/commission-rules/commission-rules.service.ts`
- `backend/src/modules/commission-rules/item-clawback.ts` (mới)
- `backend/src/modules/affiliate-deals/affiliate-deals.controller.ts`
- `backend/src/modules/affiliate-deals/affiliate-deals.service.ts`

### Frontend source

- `frontend/src/components/checkout/GuestCheckoutModal.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/promotions/ShopCreatorIncentivesTab.tsx`
- `frontend/src/components/promotions/ShopPricePromotionsTab.tsx`
- `frontend/src/components/affiliate/ShopActiveDealsTab.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/ConfirmModal.tsx`
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/hooks/useDialogFocus.ts` (mới)
- `frontend/src/pages/admin/AdminFinancePayoutsPage.tsx`
- `frontend/src/pages/admin/AdminPersonnelPage.tsx`
- `frontend/src/pages/admin/VipExceptionsPage.tsx`
- `frontend/src/pages/collaborator/ShopCollaborationPage.tsx`
- `frontend/src/pages/collaborator/WalletPage.tsx`
- `frontend/src/pages/customer/CustomerPortalPage.tsx`
- `frontend/src/pages/merchant/OrdersManagementPage.tsx`
- `frontend/src/pages/merchant/ShopDashboardPage.tsx`
- `frontend/src/pages/merchant/ShopKolHubPage.tsx`
- `frontend/src/pages/merchant/ProductManagementPage.tsx`
- `frontend/src/pages/public/SearchPage.tsx`
- `frontend/src/pages/public/PlatformInfoPage.tsx` (mới)
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/services/auth.service.ts`
- `frontend/src/services/referral-links.service.ts`
- `frontend/src/utils/private-cache-session.ts` (mới)
- `frontend/src/utils/checkout-address-cache.ts` (mới)
- `frontend/src/utils/paged-deals.ts` (mới)

### Tests

- `backend/src/modules/customer/order-ownership.spec.ts` (mới)
- `backend/src/modules/orders/customer-cancellation.spec.ts` (mới)
- `backend/src/modules/returns/return-buyer-roles.spec.ts` (mới)
- `backend/src/modules/returns/flow4-exchange-liability.spec.ts`
- `backend/src/modules/commissions/commissions.service.spec.ts`
- `backend/src/modules/commission-rules/tests/item-clawback.spec.ts` (mới)
- `backend/src/modules/commission-rules/tests/selected-return-settlement.spec.ts` (mới)
- `backend/src/modules/affiliate-deals/deal-pagination.spec.ts` (mới)
- `frontend/tests/auth-profile-refresh.test.mjs`
- `frontend/tests/auth-store-context.test.mjs`
- `frontend/tests/login-identifier.test.mjs`
- `frontend/tests/private-session-state.test.mjs` (mới)
- `frontend/tests/paged-deals.test.mjs` (mới)
- `frontend/tests/dialog-focus.test.mjs` (mới)
- `frontend/tests/platform-info-render.test.mjs` (mới)
- `frontend/tests/deal-load-errors.test.mjs` (mới)

Một số file backend liên quan được chuẩn hóa định dạng theo ESLint/Prettier của dự án. Những thay đổi định dạng không thay đổi hành vi nghiệp vụ.
