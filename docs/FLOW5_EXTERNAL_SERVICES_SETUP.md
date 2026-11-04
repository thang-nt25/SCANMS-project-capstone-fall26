# Main Flow 5 — đăng ký dịch vụ bên ngoài

Ngày hướng dẫn: 31/10/2026. Các lỗi mã nguồn độc lập đã được xử lý mà không yêu cầu mua dịch vụ. Hai phần dưới cần tài khoản/hợp đồng hoặc sandbox do nhà cung cấp cấp; không thể tự tạo khóa API hợp lệ từ code.

## 1. Giải ngân cho KOC

Liên hệ [MB qua kênh chính thức](https://www.mbbank.com.vn/lien-he), yêu cầu tư vấn **chi hộ/chuyển tiền qua API cho doanh nghiệp**, đồng thời hỏi có sandbox dành cho đồ án/sinh viên không. Không mặc định tài khoản ngân hàng cá nhân có quyền gọi API chi tiền.

[NAPAS mô tả dịch vụ 247](https://napas.com.vn/dich-vu-chuyen-tien-nhanh) cung cấp cho ngân hàng thành viên, tổ chức trung gian thanh toán và tổ chức cung ứng dịch vụ chuyển tiền. Hướng đăng ký là làm việc với ngân hàng hoặc đơn vị cung cấp phù hợp; không giả định có một khóa NAPAS cá nhân đăng ký tức thì.

Nội dung có thể gửi:

> Tôi đang triển khai đồ án SCANMS, cần API chi hoa hồng từ tài khoản doanh nghiệp đến tài khoản KOC. Xin xác nhận điều kiện đăng ký, có sandbox cho sinh viên không, phí nếu có và bộ tài liệu kỹ thuật. Chúng tôi cần tạo lệnh chi, xác minh người nhận, tra cứu trạng thái, xử lý timeout và chống gửi trùng. Trước mắt chỉ dùng môi trường thử nghiệm.

Đề nghị họ cung cấp:

- Tài liệu API và base URL sandbox/production; quy trình cấp và luân chuyển thông tin xác thực.
- API kiểm tra tên tài khoản thụ hưởng, tạo lệnh chi, tra cứu lệnh và callback nếu có.
- Quy tắc idempotency, chữ ký/xác thực callback, danh sách trạng thái, mã lỗi, giới hạn và cách đối soát khi timeout.
- Tài khoản ngân hàng thử, thông tin mẫu, đầu mối hỗ trợ và yêu cầu IP/domain/certificate nếu có.
- Xác nhận có cần pháp nhân, tài khoản doanh nghiệp và ký hợp đồng. Không tự mua gói trước khi biết có hỗ trợ đúng nghiệp vụ.

**Phân biệt:** API nhận tiền mua hàng/PayOS/VietQR đang dùng không tự chứng minh quyền API chi hộ. Cần nhà cung cấp xác nhận tính năng chi tiền cụ thể của gói được cấp.

Trong code hiện tại `PAYOUT_GATEWAY_URL` và `PAYOUT_GATEWAY_TOKEN` dành cho **gateway theo contract của dự án** (`payout-transfer.service.ts`), không phải hai thông số có thể lấy từ MB rồi mặc nhiên chạy ngay. Sau khi có tài liệu ngân hàng, cần mapping/xây adapter đúng xác thực và payload của họ, kiểm thử sandbox rồi mới cấu hình production.

Khi chưa có API chi hộ, hệ thống có luồng đối soát chuyển khoản thực tế bằng UNC và bank reference. Đây là đối soát thủ công, không được mô tả thành giải ngân Napas tự động đã nghiệm thu.

## 2. Chứng từ khấu trừ thuế TNCN

Có thể hỏi tư vấn/dùng thử tại [trang chứng từ khấu trừ thuế M-Invoice](https://minvoice.vn/chung-tu-khau-tru-thue-tncn/). Đây là một nơi để bắt đầu tìm hiểu, không khẳng định mọi gói đều có API hoặc cấp sandbox miễn phí. Hỏi đúng **chứng từ khấu trừ thuế TNCN**, không chỉ hóa đơn VAT.

Nội dung có thể gửi:

> Tôi làm đồ án SCANMS, cần tích hợp lập, ký/phát hành và tải chứng từ khấu trừ thuế TNCN qua API. Xin cho biết có sandbox/dùng thử cho sinh viên không, điều kiện pháp nhân/chữ ký số, tài liệu API, mẫu XML/PDF và cách kiểm tra trạng thái phát hành. Trước mắt không phát hành chứng từ thật.

Đề nghị cung cấp tài liệu xác thực, môi trường thử, mẫu dữ liệu tổ chức chi trả/người nhận/thu nhập/thuế, quy trình ký, số chứng từ và mã tra cứu, xử lý phát hành trùng/sai/hủy/điều chỉnh, tải PDF/XML và xác nhận trạng thái.

Nếu doanh nghiệp phát hành chứng từ ở phần mềm kế toán khác, có thể dùng luồng nhập chứng từ đã phát hành và cho KOC tải về. Cần người phụ trách kế toán đối chiếu nhà phát hành, người nhận, kỳ, số tiền và tình trạng ký/phát hành. Kiểm tra định dạng PDF/hash trong SCANMS chỉ kiểm tra file và tính toàn vẹn, không thay thế xác nhận phát hành hợp lệ.

## 3. Bạn cần cung cấp cho người triển khai

1. Tên ngân hàng/gateway và nhà cung cấp chứng từ đã chọn.
2. Tài liệu API hoặc vị trí file trong dự án, xác nhận môi trường sandbox.
3. Các điều kiện kỹ thuật nhà cung cấp yêu cầu, mẫu request/response đã xóa bí mật.
4. Nếu chưa có pháp nhân, phản hồi của nhà cung cấp về khả năng cấp môi trường thử nghiệm cho đồ án.

Không gửi mật khẩu Internet Banking, OTP, khóa ký, access token hoặc API secret trong chat. Các khóa được cấu hình ở backend theo hướng dẫn riêng sau khi xác định đúng adapter.

## 4. Điều kiện để đánh dấu tích hợp thật hoàn tất

Sandbox ngân hàng đạt các ca thành công/thất bại/timeout/retry/trùng và đối chiếu đúng gross-tax-net; môi trường thật cần một đợt nghiệm thu được người dùng cho phép riêng. Chứng từ cần có kết quả phát hành/tra cứu từ nhà cung cấp hoặc quy trình nhập chứng từ đã phát hành được xác nhận. Email cần kiểm tra đến hộp thư thực tế. Không đánh dấu các mục này hoàn thành chỉ vì unit tests hoặc file PDF nội bộ đã chạy.

## 5. Nếu không xin được sandbox MB

Một lựa chọn phù hợp để hỏi tiếp là **Zalopay Disbursement**, có tài liệu chi hộ và endpoint sandbox chính thức. [Quy trình tích hợp](https://docs.zalopay.vn/docs/developer-tools/integration-guide/) hướng dẫn cung cấp số điện thoại/email cho bộ phận BD để được cấp tài khoản sandbox, AppId và keys. Khi liên hệ phải ghi rõ muốn **Disbursement/chi hộ đến ngân hàng**, không chỉ cổng nhận thanh toán; việc cấp tài khoản thanh toán không tự bảo đảm đã được bật quyền chi hộ. [Tài liệu chi hộ](https://docs.zalopay.vn/docs/specs/disbursement-topup/) có endpoint thử `https://sb-openapi.zalopay.vn/v2/disbursement/transfer-fund`.

Các bước: mở trang quy trình → liên hệ đội ngũ Zalopay theo kênh chính thức trên trang → nêu đồ án và nghiệp vụ chi hoa hồng → xin quyền Disbursement sandbox cùng tài liệu xác thực, kiểm tra tài khoản, chuyển và tra cứu → lưu keys ở backend → làm adapter đúng Zalopay → chạy ca thành công/thất bại/timeout/trùng. Chưa xác nhận họ chấp nhận tài khoản sinh viên hoặc cấp miễn phí.

**payOS không phải phương án sandbox riêng:** [tài liệu chính thức](https://payos.vn/docs/moi-truong-test/) hiện nói không có sandbox/staging; thử nghiệm chạy production. payOS có [API lệnh chi](https://payos.vn/docs/api/), nhưng phải xác nhận quyền dịch vụ chi hộ của tài khoản; không sử dụng nó như ngân hàng giả và không tự chạy chuyển tiền thật.

Nếu các nhà cung cấp đều không cấp tài khoản, có thể xây **sandbox nội bộ tách database** theo contract gateway SCANMS: tiền và mã tham chiếu có nhãn TEST, mô phỏng SUCCEEDED/FAILED/PROCESSING, timeout và đối soát, giữ idempotency. Phương án này không cần API key ngân hàng, giúp demo và kiểm thử đầy đủ luồng phần mềm nhưng phải ghi rõ là mô phỏng, chưa đáp ứng nghiệm thu MB/Napas thật. Hiện dự án có các integration tests dùng phản hồi ngân hàng giả lập; **chưa có một dịch vụ sandbox nội bộ chạy độc lập dành cho thao tác demo UI**. Không điền URL giả vào `.env` rồi coi như đã kết nối.
