# Chuyển stylesheet frontend sang Tailwind — 01/11/2026

## Phạm vi và cách thực hiện

Chuyển khai báo kiểu trong toàn bộ 56 stylesheet dưới `frontend/src` sang Tailwind v4 `@apply`. Không chuyển toàn bộ thành chuỗi `className` trong JSX: các file `.css` vẫn tồn tại để giữ selector, thứ tự cascade và quy tắc responsive hiện có. Các trang đã dùng utility trực tiếp tiếp tục giữ cách dùng đó.

- 13.379 khai báo được chuyển, gồm utility chuẩn và arbitrary property khi cần giữ chính xác giá trị thiết kế.
- Giữ nguyên selector, media query, pseudo-class/pseudo-element và `!important`.
- Giữ font, theme, custom property, keyframe và các khai báo không được xác nhận tương đương bằng CSS gốc. Không xóa hiệu ứng để ép mọi dòng thành utility.
- `@reference` liên kết từng stylesheet với cấu hình Tailwind trong `index.css`, không nhập lại toàn bộ preflight.
- Không thay logic React, API, số dư, giao dịch hoặc database trong đợt chuyển kiểu này.
- `frontend/public/reference` là bản HTML tham khảo tĩnh, giữ nguyên CSS riêng; không thuộc giao diện React đang chuyển.
- Import `ShopKolHubPage.css` được bổ sung từ lần rà soát trước, giữ lại trong thay đổi.

## Kiểm tra tương đương

`frontend/scripts/verify-tailwind-styles.mjs` biên dịch bản trước chuyển và bản hiện tại bằng cùng Tailwind compiler, so sánh cây CSS: selector, thuộc tính, giá trị, important, thứ tự rule, media query. Bỏ qua comment/khoảng trắng định dạng.

Kết quả: **56/56 stylesheet có cây CSS sau biên dịch tương đương**. Baseline Git được lưu trong `frontend/scripts/tailwind-style-manifest.json`; script không dựa vào HEAD thay đổi sau commit.

Chạy từ `frontend`:

```powershell
node scripts/verify-tailwind-styles.mjs
npm.cmd run build
```

## Kiểm tra trình duyệt và giới hạn

API của các ca browser được giả lập, không chuyển tiền/gửi giao dịch thực.

- Chat trả lời: đạt.
- Ví mất kết nối, khóa rút trên dữ liệu cũ và khôi phục dữ liệu mới: đạt.
- Giỏ hàng: chưa đạt do test chờ selector `.cart-page__item` không có trong trang hiện tại.
- Flow 5 tài chính: chưa đạt do test tìm nút `Hủy` trên bước đầu hộp duyệt, trong khi giao diện hiện tại dùng `Tiếp tục` và nút đóng.
- Chat hợp tác: chưa đạt do test đòi dòng `Đã tải 10 tin nhắn` đã được bỏ khỏi chat nhúng ở đợt chỉnh trước.
- Thông báo: chưa đạt ở kiểm tra bộ đếm chưa đọc (mong 19, thực tế 20).

Không đánh dấu các ca chưa đạt thành PASS; chưa xác nhận nguyên nhân đầy đủ của ca bộ đếm thông báo. So sánh CSS tương đương không thay thế nghiệm thu nghiệp vụ/E2E. Không sửa các kỳ vọng test hoặc chức năng ngoài phạm vi chỉ để làm xanh báo cáo.

## Lưu ý bảo trì

Các rule cũ chưa được trang import được giữ nguyên trạng thái sử dụng, không tự bật hoặc xóa hàng loạt. Script chuyển đổi chỉ thay các khai báo mà compiler chứng minh cùng thuộc tính và giá trị; phần native giữ lại có chủ đích. Khi thêm kiểu mới, ưu tiên Tailwind utility trong JSX; dùng `@apply` cho selector dùng chung cần bảo toàn cấu trúc.
