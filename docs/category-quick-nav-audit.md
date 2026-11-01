# Kiểm tra và chỉnh khối ngành hàng trang mua sắm

> Cập nhật: sau góp ý về hình danh mục, khối hiện dùng bốn hình minh họa cố định theo từng ngành, không dùng ảnh sản phẩm ngẫu nhiên. Hai lối tắt Live và giảm giá đã bỏ khỏi khối này vì đã có trên thanh khám phá. Mô tả thiết kế và ảnh kiểm thử bên dưới ghi nhận phiên bản trước.

Ngày 29/10/2026. Phạm vi: khối “Mua sắm theo ngành hàng” trên `/marketplace`, đường dẫn tìm kiếm và các lối khám phá KOC cùng trang chủ.

## Kết quả và thay đổi

| Mục | Trước | Sau / kiểm chứng |
| --- | --- | --- |
| Chăm sóc da | `/search?categoryGroup=skin` | Giữ đường dẫn. Thử đúng sản phẩm Chăm sóc da, không lẫn trang điểm/sức khỏe. |
| Trang điểm | `/search?categoryGroup=makeup` | Giữ đường dẫn. Thử đúng danh mục Trang điểm. |
| Chăm sóc cơ thể | Bộ lọc gồm cả chăm sóc tóc nhưng tên không thể hiện | Đổi nhãn thành “Cơ thể & tóc”; thử cả Chăm sóc cơ thể và Chăm sóc tóc. |
| Thực phẩm sức khỏe | So khớp chuỗi “thuc pham” quá rộng, có thể lấy bánh kẹo/thực phẩm tươi | Đổi nhãn “Sức khỏe”, chỉ khớp nhóm sức khỏe, vitamin, dinh dưỡng, thực phẩm bổ sung/chức năng. Kiểm thử loại thực phẩm khô/tươi thông thường. |
| Khám phá cùng KOC | `/search?commission=true`; Search chỉ bật bộ lọc hoa hồng với COLLABORATOR, khách thường thấy toàn bộ sản phẩm | Đổi thành “Live cùng KOC”, mở LiveCommerceHubModal hiện có. Không tạo một bộ lọc hoa hồng ẩn cho khách mua. Banner KOC cũng dùng Live hub; lối KOC trùng trên thanh shortcut được thay bằng sản phẩm giảm giá. |
| Sản phẩm giảm giá | Lọc giá hiện tại thấp hơn giá gốc và còn hàng | Giữ URL `/search?discount=true&inStock=true`. Browser xác nhận loại hàng hết, giữ sản phẩm cha stock0 nếu có biến thể active còn hàng. Đây là giảm giá sản phẩm, không phải mọi sản phẩm có voucher. |
| Tất cả | Nhãn ngắn, dễ hiểu là mở toàn bộ ngành hàng nhưng thực tế mở danh sách sản phẩm | Đổi chữ “Tất cả sản phẩm”, giữ `/search`. Browser xác nhận không mang bộ lọc ngành hàng/giảm giá cũ. |

Không thấy ô ngành hàng nào phải xóa. Hai mục KOC/giảm giá là lối khám phá, không phải ngành hàng: đã chuyển xuống hàng riêng. Không thêm số lượng, nhãn “bán chạy” hoặc cam kết chính hãng từ dữ liệu giả.

## Thiết kế

- Bỏ dòng khẩu hiệu phụ và vòng icon lớn; dùng tiêu đề20px desktop/17px mobile.
- Nền trắng, viền be, điểm nhấn vàng SCANMS; mỗi ngành hàng là một liên kết có vùng bấm đầy đủ, icon44px, nhãn và mô tả ngắn.
- Desktop4 cột, điện thoại2 cột, hai lối khám phá ở hàng dưới; không thêm thư viện UI hoặc ảnh sản phẩm giả.
- Giữ ID `category-quick-nav-title`, các route và categoryGroup đang dùng; focus bàn phím rõ ràng, icon trang trí ẩn khỏi trình đọc màn hình, tôn trọng reduced motion.
- Trong ảnh kiểm thử1440px, panel mới cao khoảng245px; so với khối cũ trong ảnh người dùng348px, gọn hơn khoảng30%. Không cam kết cùng chiều cao ở mọi thiết bị/font/zoom.

## Tham khảo

Tham khảo cách tách danh mục, Live và ưu đãi từ nguồn chính thức, không sao chép màu thương hiệu hoặc dữ liệu sản phẩm:

- [Shopee Việt Nam](https://shopee.vn/): danh mục có liên kết riêng, khu Shopee Live và ưu đãi riêng.
- [Lazada](https://pages.lazada.vn/wow/i/vn/act/home): nhóm ngành hàng và liên kết danh mục con; có khu mua sắm/ưu đãi riêng.
- [TikTok Shop Tab – TikTok Newsroom](https://newsroom.tiktok.com/all-you-need-to-know-about-the-tiktok-shop-tab?lang=en-SG): tổ chức sản phẩm theo nhóm để tìm nhanh, tách nội dung ưu đãi. Trang TikTok Shop trực tiếp trả Security Check trong lần truy cập, nên dùng tài liệu chính thức này để đối chiếu cấu trúc, không khẳng định đã xem đầy đủ giao diện Shop theo tài khoản/khu vực.

## Kiểm thử

- `npx tsc -b --pretty false`: đạt.
- `frontend/tests/marketplace-home.test.mjs`:3 test đạt, gồm chống gom thực phẩm thường vào sức khỏe.
- `frontend/tests/category-quick-nav.browser.test.mjs`: đạt. Thử bấm bốn nhóm, kiểm tra URL và danh sách sản phẩm đích, mở tất cả, giảm giá+còn hàng, mở/đóng Live hub, chiều cao ô đều nhau và không tràn ở768/390/320px.
- API bị chặn và giả lập trong browser test; không đăng nhập, đặt hàng, gửi tin hay ghi dữ liệu kinh doanh thật. Test kiểm tra đường dẫn và xử lý dữ liệu của giao diện, không xác nhận lượng sản phẩm/phiên Live của hệ thống đang chạy thực tế.
- Ảnh: `artifacts/category-quick-nav/section-desktop.png`, `section-mobile.png`, `desktop.png`, `mobile.png`.

Các lỗi ngoài phạm vi này như tải sản phẩm thất bại nhưng trang Search chỉ ghi console, hoặc cây danh mục đầy đủ theo backend, chưa được thay đổi. Bốn nhóm trên là lối vào ngành hàng nổi bật; “Tất cả sản phẩm” vẫn cho người dùng tìm những danh mục khác.

Lệnh browser từ frontend:

```powershell
$env:CATEGORY_NAV_TEST_URL='http://127.0.0.1:5173'
$env:CATEGORY_NAV_BROWSER='C:\Program Files\Google\Chrome\Application\chrome.exe'
node --test tests/category-quick-nav.browser.test.mjs
```
