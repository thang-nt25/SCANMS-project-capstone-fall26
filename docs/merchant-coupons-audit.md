# Kiểm tra Mã giảm giá của gian hàng

Ngày kiểm tra: 27/10/2026. Phạm vi: `/merchant/promotions?tab=coupons`, dịch vụ coupon, API Shop và phần tạo chiến dịch dùng chung.

## Kết luận

Chưa thể coi phần này là đúng hoàn toàn. Các nút chính gọi đúng tuyến API, nhưng bộ lọc, thống kê, trạng thái và cấu hình khi duyệt có sai lệch. Đây là báo cáo kiểm tra; chưa thay đổi nghiệp vụ hoặc dữ liệu thật.

## Lỗi cần sửa

| Ưu tiên | Phát hiện | Bằng chứng / ảnh hưởng | Hướng sửa |
| --- | --- | --- | --- |
| Cao | Chỉ lấy trang đầu nhưng trình bày như toàn bộ danh sách | `ShopCouponsPage.tsx:336` gọi GET không truyền trang; backend `coupons.service.ts:1148` mặc định 20. Frontend bỏ qua `meta`, không có phân trang. Tìm kiếm, nguồn, lịch sử và bốn chỉ số chỉ tính trong 20 mã đầu. | Phân trang và tìm/lọc phía API; thống kê toàn gian hàng bằng truy vấn riêng. Không chỉ tăng limit lên 100. |
| Cao | Duyệt đề xuất làm thay đổi thời hạn và điều kiện ngoài ý muốn | `handleOpenApproveModal` không đưa `startsAt`/`expiresAt` vào form. Backend duyệt dùng mặc định bắt đầu ngay và hết hạn `null`. Mock xác nhận payload không có hai ngày; đơn tối thiểu bằng 0 bị đổi thành 200.000đ, trần bằng 0 thành 50.000đ do điều kiện truthy. | Giữ giá trị bằng `??`, hiển thị và bảo toàn toàn bộ điều kiện/ngày/phạm vi trước xác nhận. |
| Cao | Sai nguồn phát hành | Hai đoạn `isShopIssued` suy nguồn theo tên chứa “Gian Hàng” hoặc thiếu hạng KOL. Trình duyệt xác nhận KOL có hồ sơ nhưng `tier:null` bị gắn “Voucher Gian Hàng” và biến mất khỏi bộ lọc KOL. Voucher Sàn cũng rơi vào nhánh KOL vì chỉ có hai nhánh. | API trả nguồn/role người phát hành rõ ràng; phân biệt Shop, KOL đề xuất, Sàn. Không suy quyền từ tên hoặc hạng. |
| Cao | Trạng thái hiển thị không phải trạng thái có thể dùng | Chỉ nhìn `status === ACTIVE`. Mock có mã hết hạn từ năm 2000 và mã bắt đầu năm 2099 vẫn hiện “Đang chạy”, có nút sao chép, được cộng vào chỉ số hoạt động. Backend áp dụng mã có kiểm tra ngày nên giao diện và kết quả checkout khác nhau. Hết ngân sách/hết lượt cũng chưa được phân biệt trên thẻ. | Tính trạng thái hiệu lực từ ngày, lượt, ngân sách và chiến dịch; tách chờ bắt đầu, đang áp dụng, tạm ngưng, hết hạn/hết lượt. |
| Cao | Chọn phạm vi sản phẩm nhưng không bắt chọn sản phẩm | Form tạo cho chọn `PRODUCTS` và gửi khi `productIds:[]`; submit không chặn. Backend `createStoreCoupon` chỉ thêm quan hệ nếu mảng có phần tử, không từ chối phạm vi rỗng. Mã ACTIVE có thể được tạo nhưng không khớp sản phẩm nào khi sử dụng. Đây là phát hiện từ mã nguồn, chưa tạo trên DB thật. | Kiểm tra không rỗng cả frontend/backend; xác minh các ID thuộc chính gian hàng trước ghi. |
| Vừa | Ngày tạo voucher lệch cách hiểu của người dùng | Form gửi chuỗi ngày `YYYY-MM-DD`; backend dùng `new Date(...)`, được hiểu 00:00 UTC, tức 07:00 Việt Nam. Ngày hết hạn kết thúc vào 07:00 của chính ngày chọn, không phải hết ngày. Ngày mặc định frontend cũng lấy theo UTC. | Quy định múi giờ Việt Nam; ngày bắt đầu từ đầu ngày, ngày cuối đến hết ngày; giữ nguyên timestamp chính xác khi dùng lịch chiến dịch. |
| Vừa | Lỗi tải bị trình bày như không có mã | Mock trả GET 500: toast báo lỗi nhưng danh sách vẫn ghi “Không có mã giảm giá nào” và mời phát hành mã đầu tiên. Không có trạng thái lỗi/thử lại riêng. Không tìm được store cũng vẫn để khu phát hành trên màn hình. | Tách loading/error/empty, có thử lại và vô hiệu hóa phát hành khi chưa xác định được store. |
| Vừa | Sao chép báo thành công giả | `copyToClipboard` không `await`/`catch`. Mock Clipboard từ chối: toast vẫn “Đã sao chép mã: SHOPTEST”, có promise rejection. | Chỉ báo thành công sau khi ghi clipboard thành công; xử lý từ chối/quyền truy cập. |
| Vừa | Mã tạm ngưng lại ghi hết hạn | Mock PAUSED: nhãn đầu “Tạm ngưng”, cuối thẻ “Mã đã hết hạn sử dụng”. Các trạng thái lịch sử còn lại gom “Đã đóng”, không rõ đã khóa/từ chối/hết hạn. | Map nhãn/lý do riêng theo từng trạng thái. Quyền tạm dừng/tiếp tục của KOL không đồng nghĩa Shop có quyền mở khóa. |
| Vừa | Form duyệt thiếu thông tin quan trọng | Chỉ sửa hình thức, mức giảm, trần, đơn tối thiểu, ngân sách, tổng lượt. Không xem/sửa ngày, số lượt mỗi khách, chi tiết sản phẩm/danh mục, cộng dồn. Payload giữ scope nhưng không gửi productIds/categoryNames; backend giữ quan hệ cũ khi không có danh sách, nên không nên kết luận tự xóa sản phẩm. | Cho xem đầy đủ cấu hình gốc, giữ những trường không chỉnh; xác nhận rõ điều kiện sẽ kích hoạt. |
| Vừa | Tạo chiến dịch không gắn đúng store đang chọn khi tài khoản nhiều store | `CreateCampaignModal` POST `/campaigns` không có storeId; `CampaignsService.createCampaign/getShopCampaigns` lấy `findFirst` store của owner. Coupon page lại có bộ chọn nhiều store. | Truyền storeId và kiểm tra quyền; giữ nguyên tab khi cập nhật query storeId (hiện `setSearchParams({storeId})` bỏ tham số khác). |
| Vừa | Voucher ship có thể chọn phạm vi không hợp lệ | Mẫu ship đặt benefit SHIPPING, nhưng hàng chọn STORE_WIDE/PRODUCTS vẫn hiển thị. Backend từ chối SHIPPING + PRODUCTS. Thẻ danh sách không có nhãn tiền hàng/vận chuyển rõ ràng. | Với ship chỉ cho toàn gian hàng; thêm nhãn loại ưu đãi; gọi “Hỗ trợ phí ship tối đa 25.000đ” thay “Freeship 25K”. |
| Thấp | Validation lý do không đồng bộ | Nút từ chối/khóa chỉ kiểm tra không rỗng; mock nhập 1 ký tự vẫn bật nút. DTO yêu cầu 5–255 ký tự. | Đồng bộ min/max và thông báo ngay tại trường. |
| Thấp | Bộ chọn sản phẩm không đầy đủ | GET products chỉ lấy limit100, không có tải trang tiếp; lỗi tải sản phẩm chỉ console.warn, có thể giữ danh sách cũ khi đổi store. | Tìm sản phẩm theo API có phân trang, xóa dữ liệu cũ theo store và hiển thị lỗi. |

## Nút và chức năng đã đối chiếu

| Chức năng | Kết quả |
| --- | --- |
| Mã giảm giá / Hoa hồng & thưởng / Link tiếp thị | Chuyển đúng `?tab=coupons`, `commission-rules`, `referral-links` trên trình duyệt giả lập. |
| Phát hành voucher mới | Mở đúng form; gửi POST `/stores/:storeId/coupons`, có thông báo và tải lại. Payload đúng tuyến nhưng các vấn đề phạm vi/ngày phía trên còn tồn tại. |
| Mẫu nhanh | Điền cấu hình, chưa tự phát hành; không phải bốn nút tạo mã ngay. Có nhánh preset `VIP_100K` không được render trong danh sách mẫu hiện tại: mã chết có thể dọn, không phải chức năng người dùng cần thêm. |
| Tạo chiến dịch | Mở đúng modal tạo chiến dịch có thưởng hoa hồng thêm 1–2%; là chương trình khác với voucher, không bắt buộc cho mã toàn gian hàng. Kiểm tra mở/đóng, chưa gọi tạo chiến dịch thật. |
| Tìm mã | Lọc phản hồi được trên dữ liệu đã tải. Chưa đúng toàn bộ dữ liệu do mất phân trang. |
| Shop tự tạo / KOL đề xuất | Nút hoạt động nhưng phân loại sai nguồn như trên. |
| Đang áp dụng / KOL chờ duyệt / Lịch sử | Chuyển danh sách được; logic hiệu lực và nhãn cần sửa. |
| Duyệt & Cấu hình | PATCH `/stores/:storeId/coupons/:id/approve` đúng, tải lại sau thành công; payload mất ngày và đổi giá trị 0 đã được ghi nhận. |
| Từ chối | PATCH đúng `/reject` kèm reason, tải lại; backend có gửi thông báo KOL. Browser chỉ mock, chưa kiểm tra thông báo trên hai tài khoản thật. |
| Khóa mã | PATCH đúng `/block`, chuyển mã vào lịch sử sau tải lại. Không có chức năng mở khóa Shop; API mở khóa hiện dành Admin, không nên gắn nhầm vào API KOL pause. |
| Sao chép icon và Sao chép mã | Cùng một handler; có thể giữ một nút để tránh lặp. Lỗi clipboard đã tái hiện. |
| Chờ hoàn/đối soát / Lịch sử tài trợ | Hai tab chia dữ liệu chưa hoàn và hoàn tất đúng trong mock. API xác minh owner trước trả dữ liệu; backend chỉ tính tài trợ đơn DELIVERED/COMPLETED, giữ khoản hoàn vượt để đối soát. |
| Thẻ tài trợ theo đơn | Hiện là thông tin, không phải nút đi chi tiết đơn hay nút yêu cầu hoàn tiền. Chưa có đường truy cập chi tiết từ thẻ; có thể thêm liên kết đơn để đối chiếu. Không giả lập chuyển hoàn ngân hàng. |

## Thành phần cần giữ hoặc có thể gọn lại

- Giữ: tạo mã, duyệt/từ chối KOL, khóa, phạm vi, thời hạn, ngân sách, giới hạn lượt/khách, tìm/lọc và đối soát tài trợ. Không thấy chức năng bắt buộc nào nên xóa.
- Tạo chiến dịch là tùy chọn: đưa vào nhóm “Chiến dịch” hoặc bên trong lựa chọn voucher chiến dịch để tránh hiểu nhầm phải tạo trước mọi mã.
- Khối tài trợ thuộc đối soát tài chính, không sai nghiệp vụ nhưng có thể thu gọn/đưa xuống dưới danh sách mã.
- Hai chỗ sao chép trên một thẻ là trùng thao tác. Bốn mẫu nhanh là tiện ích, giữ nếu dùng thường xuyên.
- `usageCount`/`budgetUsed` được ghi khi tạo đơn và hoàn lại khi hủy; không đồng nghĩa số đơn đã giao. Nên gọi “Lượt đã áp dụng” và “Ngân sách đã sử dụng”, hoặc tính chỉ số đơn hoàn tất riêng nếu muốn ghi “thành công”.

## Kiểm chứng và giới hạn

- Chạy toàn bộ `backend/src/modules/coupons/tests`: 97/99 bài đạt, 8/9 suite đạt. Hai bài trong `public-coupon-uuid.spec.ts` lỗi `Unknown authentication strategy jwt`: test dựng riêng controller/service nhưng không đăng ký/override OptionalJwtAuthGuard. AuthModule thật có JwtStrategy. Đây chưa là bằng chứng web thật lỗi JWT.
- Bốn suite chính quản lý coupon/quyền/chiến dịch/cộng dồn: 58/58 bài đạt. Bài đạt không bao phủ hết lỗi trình bày và payload frontend kể trên.
- Browser audit `frontend/tests/merchant-coupons-audit.browser.test.mjs` đạt: truy cập React app thật, chặn toàn bộ API/socket và nguồn ngoài, các thao tác ghi chỉ sửa dữ liệu trong bộ giả lập. Thử tạo, duyệt, từ chối, khóa, tìm kiếm, đổi tab, đối soát, clipboard thất bại và GET 500.
- Quan sát/payload: `artifacts/coupons-audit/observations.json`; ảnh `artifacts/coupons-audit/history.png`. Test audit ghi nhận hành vi hiện tại để tái hiện, không có nghĩa mọi hành vi đó đúng.
- Không đọc `.env`, không phát hành/duyệt/khóa/xóa mã thật, không chuyển tiền, không dùng tài khoản khách để đặt đơn. Thanh toán thực tế và thông báo hai tài khoản chưa kiểm chứng end-to-end.

Lệnh chạy browser (PowerShell, từ frontend):

```powershell
$env:COUPONS_AUDIT_URL='http://127.0.0.1:5173'
$env:COUPONS_AUDIT_BROWSER='C:\Program Files\Google\Chrome\Application\chrome.exe'
node --test tests/merchant-coupons-audit.browser.test.mjs
```
