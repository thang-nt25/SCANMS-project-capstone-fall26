# Rà soát stylesheet của phần Thịnh — 02/11/2026

Quy ước: giao diện nghiệp vụ dùng Tailwind trong `className` của TSX; không tạo stylesheet riêng cho từng trang/component. Giữ màu vàng be và cấu trúc component hiện tại.

## Kết quả rà soát

Đã phân tích 340 file TS/TSX/JS trong `frontend/src`, gồm import tĩnh, chuỗi đường dẫn cho import động, JSX `<style>` và `createElement('style')`.

Chỉ có hai tham chiếu stylesheet trong mã ứng dụng:

| File | Stylesheet | Vai trò |
|---|---|---|
| `frontend/src/main.tsx` | `./index.css` | Điểm khởi tạo Tailwind v4, theme và quy tắc toàn cục đã có của nhóm |
| `frontend/src/components/customer/AddressLocationPicker.tsx` | `leaflet/dist/leaflet.css` | Stylesheet do thư viện bản đồ cung cấp |

Không có JSX `<style>` hay lời gọi `createElement('style')`. Không có import CSS/SCSS/SASS/LESS riêng trong các màn Thịnh: quản lý/kiểm duyệt sản phẩm, AI gợi ý KOC, KOL Hub, hợp tác, VIP, MAP/khuyến mãi, tạo link, gian hàng, đơn hàng, ví và chi trả.

Các file `frontend/public/reference/css/*` thuộc bộ giao diện HTML tham khảo cũ, không được mã React hiện tại import hoặc nạp bằng đường dẫn `reference/css`. Không xóa tài nguyên tham khảo của nhóm trong lượt rà soát này.

## Điều chỉnh

- Thay ba chỗ dùng `no-scrollbar` từ CSS toàn cục bằng `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` trong TSX: hai chỗ ở `ShopCollaborationPage.tsx`, một chỗ ở `ProductManagementPage.tsx`.
- Modal tạo link và kiểm duyệt đã dùng Tailwind trực tiếp; không còn `referral-link-dialog.css` hoặc `product-moderation.css`.
- Không chuyển CSS trang sang thẻ `<style>` hoặc chuỗi CSS nhúng để né quy ước.

## Giới hạn phạm vi

Đây là quy ước không viết CSS riêng cho phần nghiệp vụ, không phải kết luận toàn bộ repository không có CSS. `index.css` vẫn chứa CSS chung của nhóm ngoài phần Tailwind/theme. Font/icon CDN trong `index.html`, stylesheet Leaflet và định dạng in phiếu vận chuyển hiện có không được viết lại trong lượt này. CSS do Vite/Tailwind sinh trong `dist/assets` là đầu ra build, không phải stylesheet nghiệp vụ viết tay.

Minh chứng phân tích mã cục bộ: `.dev-runtime/thinh-style-audit.json` (không commit). Kiểm tra hiển thị dùng browser fixture, không tạo/sửa dữ liệu trên DB nhóm.

## Kiểm tra sau điều chỉnh

- `npm run build`: PASS (TypeScript và Vite); còn cảnh báo kích thước bundle đã có.
- `gap-completion.browser.test.mjs`: 8/8 PASS, không có ca bỏ qua.
- Oxlint hai file TSX điều chỉnh: không có lỗi; còn cảnh báo dependency của React Hook đã có trong code trước lượt này.
- `git diff --check` hai file TSX điều chỉnh: PASS.
