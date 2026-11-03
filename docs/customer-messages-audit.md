# Rà soát Tin nhắn khách hàng — 24/10/2026

Phạm vi: trang Shop `/merchant/customer-messages`, bao gồm danh sách hội thoại, thanh công cụ, nội dung chat, soạn tin, tệp đính kèm và các cửa sổ liên quan. Không phải toàn bộ website hay Kho nội dung tiếp thị của KOL.

## Kết quả và thay đổi

| Chức năng | Vấn đề trước khi rà soát | Kết quả |
| --- | --- | --- |
| Nút `+` | Mở tìm KOL/CTV và gửi `collaboratorId` ngay trên trang CSKH. | Dùng `/chat/search-customers`, gửi `customerId`, mở đúng hội thoại khách. Backend chỉ cho Shop tìm/liên hệ khách đã mua hàng hoặc đã liên hệ chính gian hàng; không tạo quan hệ KOL. |
| Tìm hội thoại | Tên gian hàng được dùng để so khớp nên tìm tên Shop có thể trả về mọi khách. | So khớp đúng người nhận, hỗ trợ tìm tên tiếng Việt không dấu. |
| Tách dữ liệu Shop/KOL | Bộ nhớ hội thoại dùng chung có thể mang hội thoại KOL vào trang khách trước khi tải lại; bộ nhớ chưa phân biệt tài khoản. | Lọc dữ liệu ban đầu theo trang CSKH và xóa bộ nhớ khi đổi tài khoản. |
| Trạng thái khách | Hiển thị khách “Đang hoạt động” dựa vào socket của Shop. | Hiển thị “Hội thoại khách hàng”; khi mất kết nối ghi rõ chat mất kết nối, không suy đoán khách online. |
| Gửi tin | Khi thử lại có thể tạo mã tin mới; lỗi mạng khó phân biệt với không có dữ liệu. | Giữ bản nháp khi thất bại, dùng lại mã gửi để tránh trùng; khóa gửi khi mất kết nối. Enter gửi, Shift+Enter xuống dòng. |
| Tin mới và lịch sử | Tin realtime có thể bị ghi đè khi lịch sử trả về muộn; thông báo trùng có thể tăng số chưa đọc lặp; tải lịch sử có thể gọi chồng nhau. | Hợp nhất lịch sử với tin mới theo ID, bỏ sự kiện lặp, khóa yêu cầu tải cũ và thêm thông báo lỗi/thử lại. |
| Gợi ý sản phẩm | Có thể liệt kê hàng đang ẩn/chưa duyệt; chỉ có trang đầu; đóng cửa sổ trước khi biết kết quả gửi. | Backend lọc `scope=chat-share` theo trạng thái đang bán/đã duyệt và quyền Shop. Có phân trang; chỉ đóng khi gửi thành công; lỗi có thể thử lại. |
| Xem chi tiết sản phẩm | Mã SKU được chèn thẳng vào URL. | Mã hóa SKU/ID trước khi mở `/products/:slug`, giữ đúng mã khi có ký tự đặc biệt. |
| Voucher | Nhãn “Tặng Voucher” dễ bị hiểu là tạo/cấp voucher riêng, trong khi thao tác chỉ chia sẻ mã công khai hiện có. Lỗi tải được hiển thị như không có mã. | Đổi thành “Chia sẻ mã giảm giá”, lấy dữ liệu mới, báo lỗi/thử lại riêng; gửi đúng `couponId`, sao chép đúng mã. |
| Nút dư | Voucher và gợi ý sản phẩm xuất hiện cả ở header và ô soạn tin. | Giữ một bộ nút ở header trên trang khách; vẫn có trên điện thoại. |
| Tra cứu đơn khách | Chỉ hiện 10 đơn đầu, không thể đến đơn cũ hơn. | Phân trang, giữ đồng thời `storeId` và `customerId`; lỗi có thể thử lại. “Soạn tin nhắn trạng thái” chỉ điền bản nháp để Shop xem trước. |
| Tin mẫu CSKH | Đóng bằng bàn phím và quản lý tiêu điểm chưa đồng nhất. | Chọn mẫu điền bản nháp; hỗ trợ Escape, giữ tiêu điểm trong cửa sổ và trả tiêu điểm khi đóng. |
| Gửi tệp | Công thức chiều rộng dialog thiếu khoảng trắng trong `calc`. | Sửa kích thước dialog, thêm giới hạn chiều cao/cuộn. Kiểm thử giới hạn dung lượng và thử gửi lại dùng tệp đã tải cùng mã tin. |
| Đổi hội thoại | Cửa sổ công cụ hoặc bộ lọc có thể tiếp tục gắn với hội thoại trước. | Đóng công cụ khi đổi khách, gắn vòng đời cửa sổ với ID hội thoại, giữ bản nháp riêng từng khách. |
| Hồ sơ khách | Khách hàng không có trang hồ sơ KOL. | Xác nhận avatar khách không điều hướng sang quản lý KOL; nút hồ sơ khách hiện bị vô hiệu hóa. |
| Kho nội dung hội thoại | Thẻ sản phẩm/voucher bị rút thành chữ, thiếu thao tác; nút mở ảnh bị lặp; Escape từ lịch có thể đóng cả cửa sổ. | Hiển thị lại thẻ với đường dẫn/sao chép, mở link trong tin nhắn, kiểm tra URL tệp, bỏ hành động ảnh trùng và sửa lỗi lịch/bộ lọc. |
| Menu và điện thoại | Cần kiểm chứng menu mở đúng công cụ, thu/mở cột và quay lại danh sách. | Đã kiểm thử các đường đi; bổ sung thông tin trạng thái menu và xử lý Escape. |

## Kiểm chứng

- 68 kiểm thử backend: chat service, dữ liệu gửi qua socket, tra cứu nội dung, tệp đính kèm, thông báo, giới hạn khách hàng theo gian hàng và bộ lọc sản phẩm.
- 7 kiểm thử frontend: 2 kịch bản trình duyệt tổng hợp cho trang CSKH và Kho nội dung; 5 kiểm thử logic URL/nội dung/voucher.
- Trình duyệt kiểm tra tạo hội thoại, lỗi API, bản nháp từng khách, gửi lại cùng ID, đúng người nhận, phân trang sản phẩm/đơn, sao chép voucher, tệp quá lớn, tái sử dụng tệp đã tải, mất kết nối, tải lịch sử, sự kiện realtime trùng, màn hình 1440px và 390px.
- TypeScript frontend và backend mã chạy (`tsconfig.build.json`) đạt.
- `git diff --check` đạt. Oxlint không có lỗi; còn cảnh báo dependency có sẵn ở effect đồng bộ sản phẩm ghim trong `ChatBoxPage.tsx` và cảnh báo cleanup ref của `ConversationExplorer.tsx`.
- Kiểm tra TypeScript toàn bộ test backend còn 2 lỗi ngoài phần chat: `product-editor-validation.spec.ts` gán `undefined` cho kiểu số, `products.variants.spec.ts` đọc `variants` từ kiểu trả về không khai báo trường này. Không sửa các test ngoài phạm vi.

Lệnh kiểm thử:

```powershell
# backend/
npm.cmd test -- --runTestsByPath src/modules/chat/tests/customer-chat-audit.spec.ts src/modules/chat/tests/chat.service.spec.ts src/modules/chat/tests/chat-gateway-input.spec.ts src/modules/chat/tests/chat-explorer.spec.ts src/modules/chat/tests/chat-attachment.utils.spec.ts src/modules/chat/tests/chat-notifications.spec.ts
npx.cmd --no-install tsc --project tsconfig.build.json --noEmit --pretty false

# frontend/ — cần Vite đang chạy
$env:GHN_UI_TEST_URL='http://localhost:5173'
node --test tests/customer-messages.browser.test.mjs tests/chat-explorer.browser.test.mjs tests/chat-explorer.test.mjs tests/chat-voucher.test.mjs
npx.cmd --no-install tsc -b --pretty false
```

## Giới hạn

Các kịch bản trình duyệt dùng dữ liệu/API/socket giả lập và component trang thật; không gửi tin, cấp mã hoặc tải tệp vào tài khoản khách thật. Kiểm thử backend dùng mock cơ sở dữ liệu để kiểm chứng điều kiện truy cập và dữ liệu truy vấn. Khả năng gửi nhận giữa hai tài khoản thật, Cloudinary thật và dữ liệu PostgreSQL đang triển khai cần một lượt kiểm tra tích hợp riêng. Chưa khẳng định mọi URL media bên ngoài trong dữ liệu thật còn truy cập được.

Ảnh kiểm tra component: `artifacts/customer-messages-audit/desktop.png`, `artifacts/customer-messages-audit/mobile.png`; ảnh Kho nội dung: `artifacts/chat-content-audit/desktop.png`, `artifacts/chat-content-audit/mobile.png`.
