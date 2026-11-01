# Kịch bản nghiệm thu Flow 2 và nửa đầu Flow 3

Trạng thái mặc định: **CHƯA NGHIỆM THU THỦ CÔNG TRÊN DB NHÓM**. Đã có browser tests với API fixture và integration tests với PostgreSQL/Socket.IO thật trên DB test riêng; hai loại này không thay thế chữ ký nghiệm thu của người dùng.

## Chuẩn bị

- Store A được cấu hình ngành hàng, chủ Shop A và nhân viên A có `User.storeId = Store A`.
- Store B và người quản lý B dùng để kiểm tra cách ly dữ liệu.
- KOC X đã KYC, KOC Y chưa có lịch sử đơn; System Manager kiểm duyệt sản phẩm.
- Mỗi vai trò dùng profile trình duyệt riêng. Dữ liệu mới phải lưu vào DB test của nhóm; không bật dữ liệu demo để giả lập kết quả.
- Chụp màn hình kết quả, ghi ID dữ liệu và thời điểm; không chụp token, mật khẩu hoặc `.env`.

| ID | Thao tác | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| WEB-01 | Shop A tạo sản phẩm đầy đủ hồ sơ | Ngành hàng theo Store A; bản ghi ở trạng thái chờ kiểm duyệt, chưa xuất hiện như hàng đã duyệt | Chưa chạy |
| WEB-02 | Gửi category khác qua request chỉnh sửa | Backend từ chối; dữ liệu không thay đổi | Chưa chạy |
| WEB-03 | System Manager duyệt/từ chối có lý do | Shop thấy đúng trạng thái và lý do; sản phẩm được duyệt mới có thể dùng cho matching | Chưa chạy |
| WEB-04 | Nhân viên A bấm “Tìm KOC bằng AI” tại sản phẩm A | Mở đúng productId, gọi API thật, không bị chặn chỉ vì không phải owner | Chưa chạy |
| WEB-05 | Shop B dùng productId A, kể cả sau khi A vừa quét | API 403; không trả kết quả của A từ cache | Chưa chạy |
| WEB-06 | Đổi khoảng giá / CR tối thiểu / cấp bậc | Kết quả theo bộ lọc mới, có loading/error, không giữ nhầm cache cũ | Chưa chạy |
| WEB-07 | Xem KOC chưa có đơn | Thể hiện thiếu dữ liệu, không tự sinh CR/doanh thu/lịch sử bán hàng | Chưa chạy |
| WEB-08 | KOC gửi đề nghị hợp tác; Shop duyệt/từ chối | Chỉ đúng Shop được xử lý; KOC không tự duyệt yêu cầu của mình | Chưa chạy |
| WEB-09 | Shop mời KOC; KOC chấp nhận/từ chối | Chỉ KOC được mời được phản hồi; phản hồi lặp không ghi đè trạng thái đã xử lý | Chưa chạy |
| WEB-10 | KOC tải ảnh/video từ Media Hub | Chỉ dữ liệu được phép; file tải được, khớp sản phẩm/gian hàng | Chưa chạy |
| WEB-11 | KOC proposes VIP 10-16%, revenue KPI and time window; Shop responds | Chat, status and scoped resources agree after final approval | Pending manual UAT |
| WEB-12 | Hai profile đang mở chat; gửi/duyệt đề nghị | Bên nhận thấy cập nhật không cần F5, không nhân đôi thẻ hay hành động | Chưa chạy |
| WEB-13 | Gỡ nhân viên A khỏi Store A rồi gửi lại request | Không tiếp tục xem/quản lý dữ liệu riêng từ cache cũ | Chưa chạy |
| WEB-14 | Thao tác trên điện thoại hoặc khung 390px | Form/card đọc được, không tràn ngang; màu vàng be theo hệ thống | Chưa chạy |
| WEB-15 | Shop chủ động gửi hợp đồng VIP cùng loại KOC dùng | Shop gửi từ drawer/KOL Hub → KOC nhận thẻ, chấp nhận/từ chối → link/coupon cấp đúng một lần | Đã triển khai và có test tự động; chờ người dùng nghiệm thu |
| WEB-16 | Xem tier và doanh số KOC có hoạt động nhiều Store | Tier theo hồ sơ, doanh số theo Store; không nhân hoa hồng ×8, không tự nâng/hạ tier ở FE | Chờ nghiệm thu |
| WEB-17 | KOC gửi kế hoạch hợp tác rồi Shop duyệt; KOC từ chối lời mời chiều ngược | Nội dung lưu tối đa 255 ký tự; đúng chiều xử lý; bấm lặp không ghi đè trạng thái | Chờ nghiệm thu |
| WEB-18 | Shop mở chat → Đề nghị VIP, kể cả socket tạm offline | Form đúng KOC/Store; gửi offer sản phẩm, không gửi nhầm campaign; header ghi đúng phạm vi VIP | Chờ nghiệm thu |
| WEB-19 | Mở hiệu suất → đổi 7 ngày/30 ngày/tháng/toàn thời gian → trang 2 | API nhận đúng kỳ/trang; tổng đủ mọi trang; không gọi hoa hồng ghi nhận là tiền đã payout | Chờ nghiệm thu |
| WEB-20 | Tạo SKU/mã vạch trùng hoặc tên gần giống; đóng cảnh báo bằng Escape | Mã định danh trùng bị từ chối; tên tương tự yêu cầu kiểm tra; đóng cảnh báo giữ nguyên hồ sơ đang nhập | Chờ nghiệm thu |

## Đối chiếu bằng chứng tự động

| Nhóm ca | Bằng chứng hiện có |
|---|---|
| WEB-01–03 | Unit workflow kiểm duyệt, product/variant validation; thêm ca category thiếu/sai |
| WEB-04–07 | Unit/HTTP cache và quyền; browser drawer mobile, số 0, 403/empty state không có fallback giả |
| WEB-08–09 | Unit hợp tác đúng chiều và compare-and-set; query quyền nhân viên |
| WEB-10 | PostgreSQL kiểm tra partnership hiện hành; browser tải ZIP chứa kịch bản; unit kiểm tra bytes ảnh/video, pagination và manifest |
| WEB-11–12,15 | PostgreSQL/HTTP/JWT/Socket.IO thật: hai chiều VIP, chặn tự duyệt, retry đồng thời, rollback cấp coupon; browser thẻ chấp nhận và form gửi |
| WEB-13 | Kiểm tra mất quyền qua HTTP/cache và thành viên socket bị gỡ sau khi đã join |
| WEB-14 | Browser drawer 390px không tràn ngang; form/modal dùng màu vàng be |

Ảnh/số liệu kiểm thử API fixture không được dùng như ảnh giao dịch thật của DB nhóm. Các file UML đã render kiểm tra hình thức riêng, không phải minh chứng nghiệm thu nghiệp vụ.

## Mẫu ghi bằng chứng

```text
Test ID:
Commit / phiên bản local:
Vai trò, Store ID, Product ID (không ghi mật khẩu):
Thời điểm:
Kết quả thực tế:
PASS / FAIL:
Ảnh / log đã che dữ liệu nhạy cảm:
Issue cần sửa:
```

## Additional enterprise acceptance

| ID | Action | Expected result | Status |
|---|---|---|---|
| WEB-21 | Reviewer configures product and SKU MAP | Shop cannot set MAP; floor cannot exceed MSRP/current price | Pending manual UAT |
| WEB-22 | Shop proposes below MAP; then a valid price with dates/budget | Below-floor rejected; valid request remains PENDING | Pending manual UAT |
| WEB-23 | Reviewer approves a promotion; observe start/end | Scheduled price activates and restores MSRP; old orders unchanged | Pending manual UAT |
| WEB-24 | Two orders compete for last promotion budget | At most one succeeds; no partial order/stock loss | Pending manual UAT |
| WEB-25 | Cancel a pending order twice | Budget released once | Pending manual UAT |
| WEB-26 | Accept a 20% VIP offer | PENDING_ADMIN_APPROVAL; no link/coupon/KPI clock | Pending manual UAT |
| WEB-27 | System Manager tries exception; then independent Admin decides | Manager forbidden; Admin reason required; resources issued once on approval | Pending manual UAT |
| WEB-28 | Use selected-product and Store-wide scopes | Selected excludes others; Store-wide covers newly approved products | Pending manual UAT |
| WEB-29 | Inspect revenue progress and checkout rate | Net goods only; exclude shipping/refunds; max rate plus Live capped25 | Pending manual UAT |
| WEB-30 | Compare names with synonyms; stop local model | Real semantic warning >80; model unavailable is explicit503 | Pending manual UAT |

These manual rows require evidence from the group test database. Automated results are recorded separately in verification.md.
