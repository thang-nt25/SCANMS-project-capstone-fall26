# FR-18 — Modal đánh giá sản phẩm

## Giao diện và luồng

Nút đánh giá trong `/app/customer-reviews` (prototype của ảnh chụp) mở modal React ở cửa sổ cha qua bridge kiểm tra origin/source. Trang `/tracking` dùng cùng `ProductReviewModal`, `RatingStars` và `ReviewMediaUpload`. Không dùng prompt cho review, không tự tạo voucher hay phản hồi shop.

Modal dùng native dialog/portal: focus trap, Escape và backdrop để đóng khi chưa gửi, trả focus và khôi phục scroll khi đóng. Trong lúc upload/submit, khóa chỉnh sửa/đóng để tránh kết quả gửi không xác định; khi lỗi, giữ nội dung và preview để retry. Bắt đầu chưa chọn sao; hỗ trợ hover/click và Arrow/Home/End. Chỉ chọn 1–5 sao nguyên vì API không nhận nửa sao.

Nhận xét trim 10–1000 ký tự, có counter/auto-resize và rule spam/offensive đơn giản ở client/server. Rule này không thay thế moderation thật. Ảnh JPG/PNG/WEBP tối đa 5 ảnh, 5MB/ảnh, click/kéo thả/xóa preview. Video MP4/MOV tối đa 1, 50MB, preview/xóa; MOV có thể không phát được trên một số trình duyệt. Không thêm chức năng xoay ảnh hoặc thư viện xử lý ảnh.

Xác minh cả mã đơn thực và SĐT trước khi upload/gửi; token không bị thay bằng JWT demo auto-login. Đơn prototype không có UUID thật: người dùng nhập mã đơn thật và chọn sản phẩm đã mua trong đơn xác minh. Không âm thầm gửi đơn mẫu hoặc báo thành công giả. Token được làm mới khi retry và sau upload, tránh dùng proof đã hết hạn.

## API và dữ liệu

- `GET /api/orders/track?orderSn=...&phone=...`: lấy UUID đơn, sản phẩm và review token; chỉ DELIVERED/COMPLETED được đánh giá.
- `POST /api/orders/:orderId/review/media`: multipart `file`, `productId`, `reviewToken`. Kiểm tra proof, sản phẩm thuộc đơn, chưa review, MIME/extension/signature và size trước gọi Cloudinary hiện có. Giới hạn parser 50MB/file. Storage cũng phải decode/xác nhận media; kiểm tra header không đủ chứng minh toàn bộ file hợp lệ.
- `POST /api/orders/:orderId/review`: JSON `productId`, `reviewToken`, `rating`, `comment`, `images` (HTTPS, tối đa 5), `video` (HTTPS, optional). Gửi URL trả về sau upload, không gửi blob URL/file/base64.
- Giữ transaction/lock và unique order-product chống review trùng. Review trả về có gallery/video và trang tra cứu hiển thị media sau khi gửi/reload.

Migration `20260913040000_add_review_media` thêm `images TEXT[]` và `video_url TEXT`, backfill ảnh cũ từ `review_image_url`, không xóa cột/dữ liệu cũ. Cần leader review và migrate database dùng chung trước deploy. Chỉ đã áp tự động vào PostgreSQL Docker QA, không Supabase.

Cloudinary dùng config sẵn có (`CLOUDINARY_URL` hoặc bộ cloud name/key/secret). Không thêm secret, không thay `.env`, không thêm dependency/CSS. QA không chứa credential thực; upload provider thành công được test bằng fake storage. URL/file đã upload nhưng người dùng bỏ form có thể thành orphan; không tự delete tài nguyên provider hay đặt lifecycle ngoài task.

## Kiểm chứng

Đã chạy build FE/BE; 161 backend tests FR17–24 trong Docker/PostgreSQL QA (37 PostgreSQL integration tests), 20 frontend tests gồm 3 browser opt-in, 9 check API Docker thật và 6 kịch bản browser FE→BE→PostgreSQL thật đều PASS. Orders lint cuối 0 errors; frontend lint 0 errors, còn 10 warning hook có sẵn. Browser mock upload/review chỉ chứng minh UI/API contract, không upload Cloudinary thật. Docker API regression kiểm multipart 400/403/503 và ghi gallery/video vào PostgreSQL thật.

Chạy QA: `docker compose -p scanms-qa -f docker-compose.qa.yml up -d`; địa chỉ FE `http://127.0.0.1:5183/app/customer-reviews`. Dữ liệu prototype không được coi là tài khoản/đơn DB đã seed.

Chạy browser opt-in trong PowerShell tại `frontend`:

```powershell
$env:WITHDRAWAL_UI_TEST_URL = 'http://127.0.0.1:5183'
$env:WITHDRAWAL_UI_BROWSER_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm test
```

Thay đổi có sẵn trong `frontend/src/index.css` và probe QA lịch sử được giữ nguyên. Task này không tự push `dev` hoặc tạo/merge PR.
