# Rà soát CSS và chuyển phần bản đồ của Thịnh sang Tailwind

Đối chiếu `origin/dev` tại `67692cf1`, nhánh làm việc `thinh` sau merge `2d5585dc`.

## Nguồn gốc theo Git

| Phạm vi | Bằng chứng |
| --- | --- |
| `frontend/src/index.css` | Thắng (`thang-nt25`) khởi tạo ở `3849f50c`. Các dòng hiện tại do Thắng, Tuấn và Quý chỉnh sửa; lần cập nhật gần nhất là `1f3b7903` của Quý. Đây là entry Tailwind, token và reset dùng chung. |
| `docs/ui-ux/NGUYENDINHTUAN/css/*` | Tuấn thêm ở `09958c92`; một số cập nhật sau đó do Tuấn/Thắng. Đây là tài liệu mẫu. |
| `frontend/public/reference/css/*` | Tuấn đưa vào ở `86ca2fb8`, một số file được cập nhật tại `651334ec`. Đây là trang mẫu tham chiếu. |
| Hai commit Thịnh sửa `index.css` | `6fb303ca` và `ad50d4d4` chỉ đổi cách xuống dòng selector `button, input, select, textarea`; không thêm quy tắc giao diện riêng. |
| Bản đồ địa chỉ | Thịnh thêm component tại `6373646b`. Component từng import CSS thư viện Leaflet và dựng ghim bằng HTML có style tĩnh. Phần này được chuyển sang Tailwind trong đợt rà soát này. |
| CSS in phiếu vận chuyển | Khối `style` của trang in tại `ShippingLabel.tsx` do Quý thêm ở `89af6cb0`; không thuộc phần CSS Thịnh viết. |

Tác giả ở đây là thông tin commit/blame, không suy đoán người viết từ tên thư mục hoặc người merge.

## Thay đổi

- Bỏ `import 'leaflet/dist/leaflet.css'` khỏi `AddressLocationPicker.tsx`.
- Đưa phần trình bày tĩnh của tile/pane, ghim, zoom, attribution và tương tác cảm ứng vào utility Tailwind được scope trong `address-map.presentation.ts`.
- Thay style HTML tĩnh của ghim bằng class Tailwind, giữ màu vàng be. Kích thước container dùng Tailwind.
- Giữ tọa độ và transform do Leaflet tính lúc chạy để bản đồ/ghim đúng vị trí; không sửa cách geocode, lưu địa chỉ hay tính phí giao hàng.
- Đặt `max-w-none!` cho tile để reset ảnh dùng chung không làm co lưới bản đồ.
- Giữ nguyên CSS nền và tài liệu của thành viên khác. Không tạo file CSS mới, không thêm thư viện.

## Kiểm tra

- Build TypeScript + Vite thành công; lint hai file component/presentation qua với chế độ không chấp nhận warning.
- Browser fixture trên Edge: lưới tile 256 px, tọa độ ghim, màu vàng be, controls, GPS bị từ chối/không phản hồi, lỗi/fallback tile, credit nhà cung cấp và chiều rộng mobile.
- Browser checkout: tìm địa chỉ, tính lại cước, lưu tọa độ, bỏ phản hồi geocode/GPS cũ, click và kéo ghim.
- Browser form địa chỉ: cuộn tới toàn bộ bản đồ và nút lưu trên màn hình thấp.
- Browser test dùng dữ liệu và API mock, không gửi đơn hoặc lưu địa chỉ vào DB nhóm.
- Test checkout được đồng bộ nhãn `Đang chọn` đang có trên dev, thay nhãn `Đang dùng` cũ.
- Kết quả cuối: 3/3 browser test chuyên biệt qua; 221 test frontend qua, 106 test browser khác chưa bật cấu hình được bỏ qua.
