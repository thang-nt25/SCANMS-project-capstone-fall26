# Sửa lỗi kết nối lặp lại — 01/11/2026

## Nguyên nhân xác nhận

Log người dùng có ERR_CONNECTION_REFUSED đồng thời tại socket.io, notifications/unread-count, chat/capabilities, wallets/me, wallets/withdrawals, wallets/me/ledger và kyc/profile. Kiểm tra trực tiếp lúc xử lý: không có backend lắng nghe cổng 3000; các tiến trình Node còn lại thuộc công cụ, không có server SCANMS. Vì vậy đổi KOC vẫn gặp lỗi. Log server cũ không có stack crash cuối cùng; chưa xác định được tiến trình bị dừng bởi nguyên nhân nào, không kết luận lỗi ngân hàng hoặc tài khoản.

## Xử lý

- Khởi động lại backend và frontend, xác nhận startup thành công.
- START_SCANMS.ps1 tại thư mục gốc khởi chạy nền, kiểm tra cổng tránh chạy trùng, ghi log artifacts/local-runtime. Không cài dịch vụ/tự khởi động Windows. Sau khi khởi động lại máy cần chạy lại script.
- backend/scripts/run-local-server.cjs giám sát compiled backend, retry tối đa 5 lần liên tiếp với backoff, dừng khi nhận tín hiệu tắt; không áp dụng cho production. Không gửi lại HTTP mutation.
- Ví hiển thị trạng thái chờ đồng bộ khi đọc lỗi hoặc lưu ngân hàng gặp lỗi mạng. Không tiếp tục khẳng định đủ điều kiện rút dựa trên dữ liệu cũ; chặn nút và handler rút cho tới khi đồng bộ thành công.
- Wallet refresh khi trở lại online, focus và polling đọc định kỳ; giữ nội dung đang nhập, không tự retry lưu ngân hàng hoặc rút tiền.
- API lỗi kết nối có thông báo tiếng Việt thay Network Error.
- Chat tiếp tục reconnect với backoff tối đa 30 giây, giảm console warning trùng; tự kết nối khi backend hoạt động lại. Trình duyệt vẫn có thể ghi lỗi transport khi server thực sự dừng.

## Kiểm tra

- API trực tiếp với hai KOC kol.bronze@scanms.vn và kol.thaonhi@scanms.vn: 12/12 request GET ví/lịch sử/sổ ví/KYC/thông báo/chat capabilities trả 200. Không thay tài khoản ngân hàng của người dùng.
- 8 suites / 82 unit tests wallets đạt.
- Frontend TypeScript đạt.
- Browser regression wallet-connection-recovery.browser.test.mjs đạt: mô phỏng mất kết nối, giữ số dư cũ có cảnh báo, khóa nút rút, phục hồi dữ liệu mới qua online event, giữ số tiền đang nhập và không phát sinh POST/PATCH. API được giả lập; không phải bằng chứng giải ngân ngân hàng thật.
- Backend startup có Redis fallback in-memory được hỗ trợ sẵn; không phải lỗi làm cổng 3000 mất kết nối trong log này.

Chưa gửi lệnh rút, lưu thay ngân hàng, chuyển tiền hoặc thay số dư trong lần xử lý này. Khi backend dừng do máy tắt hoặc người dùng kết thúc tiến trình giám sát, frontend không thể tự khởi động backend từ trình duyệt.
