# Rà soát ảnh sản phẩm SCANMS

**Ngày cập nhật:** 29-09-2026  
**Phạm vi:** 18 sản phẩm đang có trong cơ sở dữ liệu, 2 ảnh thư viện sản phẩm, giỏ hàng đã lưu, dữ liệu mẫu trong các trang mua hàng/tiếp thị/quản lý và bản UI tham khảo.

Ảnh của sản phẩm `BODY-2RGHI` (“serum”) trước đây là ảnh ghép nhiều chai serum. Ảnh đó đã được thay bằng một packshot serum đơn. Các ảnh thiếu, sai loại sản phẩm, chất lượng thấp hoặc minh họa kiểu AI trong danh mục demo được thay bằng ảnh chụp sản phẩm cùng nhóm hàng. Ảnh được lưu nội bộ dưới `frontend/public/assets/products/real/`; danh sách và nguồn từng ảnh nằm trong [README ảnh sản phẩm](../../frontend/public/assets/products/real/README.md).

Trang chi tiết lấy ảnh chính từ `products.image_url` và ảnh bổ sung từ `media_assets.url_or_content`. Bộ sửa dữ liệu cập nhật 18 ảnh chính và 2 ảnh thư viện. Giỏ hàng cũ lưu ảnh chụp tại thời điểm thêm hàng; `CartContext` nay tự tải ảnh sản phẩm mới nhất từ API cho những mục còn giữ đường dẫn ảnh cũ.

Ảnh AI cũ do lượt sửa trước thêm vào `frontend/public/assets/products/` đã được đưa ra khỏi thư mục public và lưu tại `artifacts/product-image-audit/retired-generated-assets/`. Các ảnh tên cũ trong thư mục tham khảo được thay nội dung bằng ảnh chụp thật để không còn lộ khi mở các luồng UI cũ.

Một số tên shop/sản phẩm trong bộ dữ liệu đồ án là tên demo. Với các mặt hàng không có bao bì thương hiệu thật tương ứng, ảnh được chọn theo đúng loại sản phẩm/thành phần; chữ thương hiệu trên bao bì thật có thể khác tên demo.

Bản dữ liệu gốc trước lần cập nhật đầu tiên được giữ tại `artifacts/product-image-audit/products-before-apply.json`; ảnh minh họa tĩnh gốc được giữ trong `artifacts/product-image-audit/original-static-ai/`. Không chạy rollback trừ khi cần khôi phục dữ liệu ban đầu; lệnh rollback dùng bản lưu gốc này:

```powershell
cd backend
node scripts/repair-product-image-data.js --rollback
```

Để áp dụng lại các ảnh mới sau khi khôi phục, xác nhận các ảnh trong `frontend/public/assets/products/real/` còn tồn tại rồi chạy:

```powershell
cd backend
node scripts/repair-product-image-data.js --apply
```
