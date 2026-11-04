# Kịch bản nghiệm thu Android

Đây là kịch bản **cần chạy sau khi có Emulator**, không phải log chứng minh đã chạy. Dùng dữ liệu test được nhóm cho phép, backend/DB chung, không reset DB. Chưa thực hiện mutation mobile vào DB nhóm trong kiểm thử tự động của đợt này.

## Chuẩn bị

- Backend chỉ một instance, health/API hoạt động; Metro cho bản debug hoặc APK demo đã cài.
- Có Customer, KOC, Shop có phân công, System Manager và Admin. Nhập mật khẩu thật trên login theo README, không quay phim/chụp mật khẩu/token.
- Hai client để chat: Android + web hoặc hai Emulator. Không dùng một tài khoản cho hai phía của lời mời.
- Shop có ngành hàng, kho GHN hợp lệ; KOC đã đáp ứng KYC/ngân hàng/social theo luật BE để nhận VIP. Nếu thiếu phải hoàn thiện trên web, không bỏ validation.
- Đơn mua được tạo/hoàn tất thanh toán trên web. Mobile checkout/payment chưa nằm trong bản này.

## 1. Đăng nhập và xác minh 5 role

1. Customer đăng nhập bằng email; sai mật khẩu phải báo lỗi, không vào workspace.
2. Đúng mật khẩu → Sản phẩm / Đơn hàng / Tin nhắn / Cá nhân.
3. Đóng app, mở lại với mạng hoạt động: khôi phục bằng secure token, dữ liệu từ API.
4. Đăng xuất rồi lần lượt đăng nhập KOC, Shop, Manager, Admin; mỗi role có menu như bảng traceability. Manager không thấy Users/ngoại lệ VIP. Không còn hội thoại/đơn/cache của Customer sau đổi tài khoản.
5. Tắt BE khi restore: có lỗi và Thử lại, không giả đăng nhập thành công. Bật lại BE rồi thử lại.

## 2. Shop → tạo SP → Manager duyệt → Customer/KOC thấy

1. Shop → Cá nhân → chọn gian hàng đang được phân công → Sản phẩm → Thêm sản phẩm.
2. Điền đủ 6 khối: tên/SKU/mô tả, cover vuông ≥800px và ≤5MB, giá/phân loại theo ba thuộc tính BE trả về, barcode EAN-13 hợp lệ, cân nặng/kích thước, thành phần/xuất xứ/nhãn/chứng từ URL, chính sách affiliate/sample.
3. Test thiếu trường, barcode sai, ảnh nhỏ và SKU phân loại trùng: lỗi rõ ràng; không báo thành công hoặc tạo bản ghi giả.
4. Gửi duyệt → quay danh sách, trạng thái chờ kiểm duyệt. Nếu backend báo semantic duplicate/compliance/GHN thì sửa dữ liệu theo thông báo; chưa có UI xác nhận semantic duplicate đặc biệt trên native.
5. Manager độc lập → Kiểm duyệt → Chờ kiểm duyệt → mở sản phẩm → xem ảnh/thông tin/chứng từ. Chứng từ mở bằng trình duyệt hệ thống.
6. Từ chối phải có lý do; hồ sơ không được tự duyệt nếu cùng người tạo/gửi. Duyệt bằng reviewer hợp lệ rồi refresh catalog Customer/KOC để kiểm tra công khai.

## 3. Hợp tác hai chiều và chat Android ↔ web

1. KOC mở sản phẩm Shop → điền lời đề nghị hợp tác → Gửi yêu cầu.
2. Shop → Hợp tác → refresh → lời đề nghị đúng KOC → Chấp nhận. KOC refresh thấy APPROVED.
3. Làm chiều ngược: Shop nhập email KOC khác, lời mời → Gửi. KOC thứ hai đăng nhập đúng tài khoản → Hợp tác → phản hồi lời mời. Không nhầm lời mời hợp tác với card đề nghị VIP.
4. Mở Trao đổi → gửi một tin từ Android; web cùng conversation phải nhận. Web trả lời → Android nhận.
5. Tắt mạng rồi bật lại: reconnect và tải lại lịch sử; không nhân đôi message ID. Bấm gửi liên tục chỉ có một request đang chờ; timeout không tự retry. Kéo lên xem trang tin cũ.
6. Đăng xuất Android sang tài khoản khác: không nhận tin/room cũ. Chưa có push notification khi app đã đóng, không ghi PASS cho push.

## 4. VIP và Admin exception

1. KOC từ chi tiết sản phẩm → Đề xuất VIP; hoặc Shop từ KOC đã hợp tác/AI Matching → Đề nghị VIP.
2. Chọn một sản phẩm, rate 14%, KPI doanh thu và kỳ cam kết, viết kế hoạch, bật cam kết video. Shop nhập coupon budget theo policy.
3. Gửi → danh sách VIP; bên khởi tạo không có nút tự chấp thuận. Bên nhận mở chi tiết, API state tải thành công rồi mới có Chấp nhận/Từ chối.
4. Chấp thuận mức ≤16 theo điều kiện BE → theo dõi trạng thái; link/coupon chỉ hiển thị khi BE thực sự cấp. KOC copy link rồi paste vào browser máy phù hợp. Smart link/App Links native chưa tích hợp, không coi copy là attribution mobile hoàn chỉnh.
5. Tạo đề nghị 20%, bên nhận đồng ý → PENDING_ADMIN_APPROVAL. Admin → Ngoại lệ VIP → lý do ≥10 ký tự → quyết định. Manager không có màn này; BE vẫn phải từ chối API sai role.
6. Test 26% hoặc doanh thu 0: bị chặn. Test phạm vi nhóm: ít nhất hai sản phẩm cùng Shop; thử toàn Shop. Không tự tính hoa hồng ở app để xác minh quyết toán; đối chiếu trạng thái BE/web.

## 5. Đơn hàng và GHN

1. Dùng đơn test có thật do Customer tạo trên web. Customer → Đơn hàng → tìm mã → Chi tiết; tiền/sản phẩm/địa chỉ khớp web.
2. Shop → Đơn hàng → cùng đơn PENDING. Chọn **một** cách: nhập mã vận đơn thật do carrier cấp hoặc Tạo vận đơn GHN TEST. Không bấm lại khi timeout trước khi refresh kiểm tra kết quả.
3. Nếu GHN TEST báo sai Token/Shop ID/kho/địa chỉ: kiểm tra cấu hình sandbox phía BE, không thay bằng mã giả và không đổi sang LIVE để lách lỗi.
4. Sau tạo vận đơn, Tracking hiển thị nguồn TEST. Bản native chưa có nút bật mô phỏng; có thể dùng control GHN TEST hiện có trên web để demo. Timeline mobile đọc các mốc backend trả về, không tự đánh dấu đã giao.
5. Khi backend xác nhận DELIVERED → Customer tải lại chi tiết → Xác nhận đã nhận hàng → trạng thái cập nhật. Bấm nhanh nhiều lần không gửi trùng. Việc này có thể kích hoạt nghiệp vụ backend thực, chỉ dùng đơn test được cho phép.

## 6. Kết thúc và các mục chưa nghiệm thu

Admin xem User directory, tìm email test; đây là màn chỉ đọc. KYC/return/sample adjudication, MAP, ví/rút tiền và phân quyền user tiếp tục dùng web. Thanh toán/livestream native chưa làm theo quyết định phạm vi; không demo bằng video mẫu hoặc redirect giả.

Với APK demo: tắt Metro, force stop, mở lạnh, thử Back/keyboard, ảnh picker bị từ chối quyền, offline/retry, logout/relogin. Ghi thiết bị/API level, thời điểm, kết quả và evidence thật vào báo cáo; chỉ sau đó mới ký nghiệm thu UI Android.
