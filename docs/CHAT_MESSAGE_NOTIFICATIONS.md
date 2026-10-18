# Thông báo tin nhắn Shop ↔ Khách hàng

## Nguyên nhân và cách sửa

Socket.IO đã phát `new_message`, nhưng luồng lưu tin không tạo `Notification`.
`NotificationDropdown` trên Header chỉ đọc `/notifications`; `ChatBell` riêng chưa
được sử dụng. Vì vậy chat hoạt động nhưng chuông không có tin nhắn mới.

- `ChatService.saveMessage`: xác minh thành viên, suy ra người nhận từ hội thoại;
  lưu tin, cập nhật hội thoại và tạo `CHAT_MESSAGE` trong cùng transaction.
- Thông báo dùng cùng UUID với tin nhắn (khác bảng), nên retry cùng `messageId`
  không tạo thêm bản ghi. Không thay schema hay chạy migration.
- Preview thẻ sản phẩm/voucher/ảnh/video là văn bản dễ đọc, không hiện JSON.
- Header đăng ký socket khi có phiên đăng nhập, tải lại số chưa đọc/danh sách
  ngay khi có tin mới, khi reconnect và khi đọc ở tab khác. Vẫn có polling dự phòng.
- Hook `useChatNotifications` chịu trách nhiệm subscription, cleanup và âm báo.
  Mỗi UUID chỉ phát âm một lần trong phiên; tin của chính mình, tải lịch sử và
  sự kiện đã đọc không phát âm. Có nút tắt/bật; nếu autoplay bị chặn, hiện nút
  yêu cầu thao tác người dùng để bật âm thanh.
- Đọc hội thoại cập nhật cả tin và thông báo trong transaction, phát
  `messages_read` đến user room để Header không cần tham gia conversation room.
- Mở hội thoại từ thông báo lấy danh sách/lịch sử mới từ BE, tránh cache cũ.

Thông báo áp dụng cho tin gửi sau bản sửa; không tự backfill tin cũ vào DB nhóm.
Đánh dấu thông báo đã đọc không đồng nghĩa đọc nội dung hội thoại; thao tác mở
hội thoại mới cập nhật read receipt của tin nhắn.

## Kiểm tra trên web

1. Mở Customer trên cửa sổ thường, Shop trên cửa sổ ẩn danh hoặc trình duyệt khác.
   Không dùng chung localStorage cho hai tài khoản.
2. Customer mở một trang có Header, đóng khung chat. Nhấn vào trang một lần để
   trình duyệt cho phép âm thanh.
3. Shop gửi **tin mới** vào đúng hội thoại Customer đó.
4. Customer thấy số trên chuông tăng; mở chuông ở tab **Tất cả** thấy thông báo
   có tên Shop, nội dung và thời gian; nghe một âm nếu đã bật và trình duyệt cho phép.
5. Bấm thông báo: mở `/chat?conversationId=...` đúng Shop. Tin được đánh dấu đọc,
   số trên chuông giảm. Mở chat thu nhỏ cũng đồng bộ trạng thái đọc.
6. Tắt âm trên chuông rồi Shop gửi thêm tin: vẫn cập nhật thông báo nhưng không kêu.
7. Reload Customer: thông báo còn trong lịch sử. Thử thêm tài khoản khác để chắc
   chắn không thấy thông báo/hội thoại của Customer đầu tiên.

## Kiểm tra tự động

```powershell
cd backend
node node_modules/jest/bin/jest.js --runInBand src/modules/chat/tests src/modules/notifications/notifications.service.spec.ts
```

Bộ PostgreSQL + HTTP + Socket.IO là opt-in qua `CHAT_TEST_DATABASE_URL`, chỉ nhận
DB kiểm thử riêng `127.0.0.1:55433/scanms_seed_test`; tạo schema ngẫu nhiên mới,
không reset/drop DB có sẵn. Cần cài dependencies cả FE và BE (dùng client Socket.IO
đã cài ở FE). Không đặt biến này bằng URL database nhóm.

```powershell
$env:CHAT_TEST_DATABASE_URL='postgresql://seed_test@127.0.0.1:55433/scanms_seed_test'
node node_modules/jest/bin/jest.js --runInBand src/modules/chat/tests/chat-notifications.postgres.integration.spec.ts
cd ../frontend
node --test tests/chat-notifications.test.mjs
npm.cmd run build
```

Đã chạy: 48 test BE hiện có + mới, 6 integration test PostgreSQL/HTTP/socket,
4 test FE subscription/dedup/read/reconnect/cleanup. TypeScript FE/BE và build FE
đã được kiểm tra; âm thanh nghe thực tế cần kiểm tra trên trình duyệt theo mục trên.
