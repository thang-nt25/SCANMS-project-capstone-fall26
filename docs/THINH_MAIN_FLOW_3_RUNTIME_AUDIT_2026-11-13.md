# Đối chiếu Main Flow 3 với code chạy hiện tại — 13/11/2026

Phạm vi theo leader: hai nhánh Deal ≤16%/>16%, coupon độc quyền KOL, hàng mẫu tới video review, quá hạn/link giả và bàn giao Smart Link cho Flow Customer. Chỉ đọc source và chạy kiểm tra cô lập trong lượt này; chưa tạo/duyệt Deal, vận đơn, mẫu hoặc video trên DB nhóm, chưa nghiệm thu toàn bộ UI bằng tài khoản thật.

## Kết luận

Kịch bản nghiệp vụ đúng hướng; code có các thành phần chính nhưng chưa thể kết luận demo mới hoàn toàn từ đầu qua sandbox rồi tới nghiệm thu nghiệp vụ chạy trọn vẹn. Các kết quả dưới đây là kiểm chứng source/contract/unit test, không phải mọi bước UI đã PASS.

> Cập nhật 14/11: đã bổ sung nghiệm thu **trong sandbox**. Shop có thể yêu cầu sửa, KOL nộp lại và Shop nghiệm thu; bộ lọc hai role theo trạng thái thử. Phần phát hiện bên dưới ghi lại ranh giới TEST/LIVE; nghiệm thu sandbox vẫn không chuyển hồ sơ hoặc media thật. Xem mục cập nhật cuối tài liệu.

## Các phát hiện cần lưu ý theo mức ảnh hưởng

1. **Lỗi contract nộp video mẫu có ảnh bìa.** `SubmitKolVideoModal.tsx:369` thêm `posterUrl` vào payload khi người dùng có ảnh bìa. `/sample-requests/:id/video` dùng `SubmitSampleVideoDto` tại `sample-request.dto.ts:128`, chỉ nhận title/videoUrl/caption; ValidationPipe toàn cục `forbidNonWhitelisted: true` từ chối trường thừa. Tái hiện trực tiếp cùng ValidationPipe/DTO đã build: payload chỉ video được chấp nhận; thêm posterUrl nhận 400 `property posterUrl should not exist`. Cần đồng bộ contract trước khi khẳng định form nộp video đầy đủ hoạt động.
2. **Sandbox mẫu không phải đường đi tới nghiệm thu thật.** `GhnService.sandboxSampleState` lưu sự kiện `SANDBOX_SAMPLE_STATE`; modal có sandboxOrderCode gửi video vào `/shipping/ghn/sandbox-sample/:code/video`. Không tạo media PENDING và không chuyển hồ sơ mẫu thật sang VIDEO_SUBMITTED; Shop không có video nghiệp vụ tương ứng để nghiệm thu. Đây là chế độ thử được tách riêng, không tự xóa ranh giới TEST/LIVE. Demo nhận mới qua sandbox rồi duyệt chính hồ sơ thật hiện chưa khép kín.
3. **Chưa tự xác thực link video tồn tại/chủ kênh/nội dung.** `SamplesService.submitVideo` chặn chưa nhận mẫu, URL không HTTPS, nguồn ngoài allowlist và sai nền tảng cam kết. URL đúng TikTok nhưng ID giả, clip người khác hoặc nội dung sai vẫn cần Shop mở xem/đối chiếu và yêu cầu sửa. Không có gọi xác minh TikTok tồn tại/ownership trong nhánh này.
4. **Smart Link trong clip là việc KOL chuẩn bị, chưa được máy kiểm tra.** Submit DTO nhận title/videoUrl/caption, không có trường xác nhận clip chứa đúng referralLink và không đọc mô tả TikTok để đối chiếu. Shop có thể kiểm tra thủ công trước nghiệm thu; không trình bày rằng SCANMS tự chèn hoặc tự xác minh link trong clip.
5. **KPI ở hai điểm vào Deal chưa đồng nhất.** `ExclusiveOfferModal` dùng targetRevenue; `CreateExclusiveDealModal` cũ trong KOL Hub dùng targetOrders. Để demo KPI doanh thu, dùng KOL đề xuất trực tiếp trong chat hoặc Shop mở Đề nghị VIP từ drawer sản phẩm. Không gọi form KPI số đơn là KPI doanh thu.

## Đường đi đúng theo source

| Chặng | Hành vi code hiện tại |
|---|---|
| Tạo Deal | Shop offer hoặc KOL proposal tạo đề nghị PENDING và thẻ chat |
| Bên nhận đồng ý ≤16% | Kích hoạt APPROVED, tạo link/coupon KOL và kỳ KPI trong transaction khi đủ điều kiện |
| Bên nhận đồng ý >16% | PENDING_ADMIN_APPROVAL, chưa cấp link/coupon/kỳ KPI của đề nghị này |
| Admin duyệt ngoại lệ | Chỉ SYSTEM_ADMIN, có lý do và không tự duyệt đề nghị mình tham gia; sau quyết định cuối mới kích hoạt tài nguyên |
| Xin mẫu | KOL chủ động tạo yêu cầu riêng; kiểm KYC/kênh, địa chỉ GHN, quota và yêu cầu trùng. Không tự sinh đơn mẫu khi Deal được duyệt; `createRequest` không bắt buộc một Deal APPROVED làm điều kiện cứng |
| Duyệt mẫu | Shop duyệt, cấp quota; chưa tạo thời điểm nhận/hạn video chỉ vì đã duyệt |
| Giao và nhận mẫu nghiệp vụ | GHN được xác minh đã giao mới chuyển RECEIVED và đặt hạn 14 ngày; API confirmReceived hiện chặn KOL tự xác nhận thủ công |
| Nộp video nghiệp vụ | Chỉ RECEIVED/OVERDUE/REVISION_REQUIRED; tạo media PENDING + sample VIDEO_SUBMITTED trong transaction |
| Shop review | `/media/:id/review` APPROVED → mẫu COMPLETED; REJECTED → REVISION_REQUIRED có lý do/hạn sửa và thông báo |
| Không đăng/sửa đúng hạn | Job mỗi giờ nhắc hạn, đánh dấu OVERDUE; không tự khóa toàn bộ tài khoản |
| Báo cáo và quyết định | Shop báo cáo; Admin/Manager vận hành xem xét khóa quyền xin mẫu, gia hạn, miễn nghĩa vụ hoặc bác đề nghị; có lịch sử/thông báo. KOL bị khóa vẫn được khắc phục video cũ |
| Chuyển sang Flow Quý | Bàn giao link/video/mã KOL đúng sản phẩm; Customer mở Smart Link trên phiên độc lập và tự nhập mã nếu sử dụng. Đây mới là đầu vào cho attribution/đặt hàng, chưa phải doanh số đã ghi nhận |

## Bằng chứng kiểm tra

- Bốn suite affiliate-deals, samples, sample-delivery-SLA và sandbox-sample: **83 test đạt**. Các suite dùng fixture/mock, không gọi GHN thật hoặc ghi DB nhóm.
- Hai suite media moderation/library: **20 test đạt**; tổng lượt rà soát là **6 suite / 103 test đạt**. Không suy ra từ số test này rằng hệ thống đã xác minh video TikTok tồn tại hoặc thuộc đúng KOL.
- Tái hiện contract ảnh bìa bằng ValidationPipe thật/DTO đã build; không gọi endpoint viết dữ liệu.
- Các ca UI cần chạy lại sau khi sửa contract: nộp video có/không ảnh bìa, nhận video phía Shop, yêu cầu sửa, nộp lại và nghiệm thu.
- Cần chuẩn bị hồ sơ mẫu nghiệp vụ đã nhận hợp lệ nếu demo nghiệm thu; không đổi ngày hoặc giả trạng thái DB nhóm để che việc sandbox tách biệt.

## Cập nhật sửa lỗi màn duyệt mẫu — 14/11/2026

- Triệu chứng thực tế: DB đã APPROVED nhưng thẻ/bộ lọc vẫn PENDING; bấm lại báo không thể duyệt trạng thái APPROVED.
- Nguyên nhân: cache danh sách xử lý 30 giây ở backend và cache API phía web có thể trả snapshot cũ. Màn Hub còn có request tải trước quyết định và snapshot dùng lại giữa lần mở trang.
- Backend đọc trực tiếp danh sách xử lý theo quyền Store hiện tại; gọi duyệt lại bản ghi đã APPROVED trả lại bản ghi, không cấp quota/thông báo lần hai.
- Web không cache API sample-requests; vô hiệu hóa kết quả tải trước quyết định, làm mới sau duyệt, khóa nút khi xử lý và dùng cùng trạng thái hiển thị cho số đếm/bộ lọc. Sửa ref vòng đời để chạy đúng trong React StrictMode.
- 52 test backend sample/access và 11 test API cache đạt. Browser Edge với API mock đạt: bấm hai lần chỉ gửi một PATCH; duyệt xong rời tab PENDING, số đếm về 0, tab ALL hiện APPROVED và nút tạo vận đơn; làm mới/reload không quay lại PENDING.
- Không reset/seed/migrate, không duyệt lại hồ sơ của người dùng bằng script, không thêm CSS hay thư viện. Các vấn đề video/ảnh bìa và ranh giới sandbox nêu trên chưa được sửa bởi bản vá hiển thị này.

### Hiển thị video sandbox sau khi nộp

Mã LYU7K3 đã được kiểm tra read-only: có video trong sự kiện sandbox, hồ sơ mẫu nghiệp vụ vẫn APPROVED, chưa có media PENDING. Nút mở video trước đây bị ẩn trong phần hành trình thu gọn. Bản sửa UI đưa **Xem video đã nộp** ra ngoài phần thu gọn cho cả KOL và Shop, đổi nhãn thành **Đã nộp video kiểm thử**, ghi rõ chưa gửi nghiệm thu. Không chuyển trạng thái hoặc cấp quyền duyệt thật từ dữ liệu thử. Browser Edge 390px với API mock kiểm tra nút/link đúng ở hai role khi timeline đóng/mở đều đạt, không phát sinh mutation.

### Rà soát mở và nghiệm thu video phía Shop — 14/11/2026

- Video nghiệp vụ hiện tại hiển thị trực tiếp trên thẻ yêu cầu mẫu: tiêu đề, thời gian nộp và nút **Xem video đã nộp**, không cần mở lịch sử hoặc hành trình. Link mở tab mới; URL sai định dạng, không HTTPS hoặc chứa thông tin đăng nhập bị vô hiệu hóa.
- Trước đây thao tác nghiệm thu chọn media PENDING đầu tiên, có thể khác video hiện tại nếu còn bản cũ chờ duyệt. Nay chọn đúng asset có URL khớp video của hồ sơ và trạng thái PENDING; không có asset tương ứng thì khóa thao tác và yêu cầu làm mới. Khóa bấm lặp trong khi chờ API, đọc lại danh sách sau quyết định thành công.
- Kiểm chứng: 3 unit test chọn đúng bản/không chọn nhầm bản cũ/URL không hợp lệ đạt; browser Edge kiểm tra đúng URL và media ID được duyệt, bấm đúp một PATCH, cập nhật COMPLETED và giữ kết quả sau reload đạt. Browser sandbox và duyệt mẫu trước đó cũng đạt; frontend build thành công, oxlint không lỗi (4 cảnh báo cũ trong Hub).
- Kiểm tra read-only LYU7K3 vẫn cho thấy có video sandbox, không có media PENDING; không cập nhật DB nhóm, không gọi TikTok hay GHN thật trong browser test. Các giới hạn contract ảnh bìa, xác minh TikTok và ranh giới TEST/LIVE phía trên vẫn còn.

### Nối đủ vòng nghiệm thu sandbox — 14/11/2026

- API mới `POST /api/shipping/ghn/sandbox-sample/:orderCode/review-video`: Shop quản lý hiện tại xem và quyết định đúng URL/phiên bản; lý do yêu cầu sửa từ 5–2000 ký tự. Quyết định lưu trong transaction có advisory lock trên sự kiện sandbox. Gọi duyệt lặp trả lại kết quả đã lưu; quyết định khác trên bản đã xử lý hoặc trên phiên bản cũ bị chặn.
- KOL nhận `REVISION_REQUIRED`, đọc lý do và nộp lại; số phiên bản tăng kể cả khi KOL sửa bài tại cùng URL. Sau Shop chấp thuận, trạng thái thử là `COMPLETED`; không nộp đè hoặc bắt đầu lại hành trình để xóa kết quả. Video sandbox cũ không có metadata phiên bản được xem là phiên bản 1.
- Shop và KOL đăng ký theo dõi trạng thái trước khi lọc danh sách: video sandbox xuất hiện trong tab chờ duyệt; yêu cầu sửa hoặc hoàn tất rời tab tương ứng ngay sau response. Nút quyết định có loading/error và chặn bấm lặp; giao diện vàng be/Tailwind, không thêm CSS.
- Không cập nhật trạng thái mẫu thật, media công khai, ví, hoa hồng hoặc cước thật từ quyết định thử; simulation phải được bật và không chạy trong production. API thật `/media/:id/review` giữ luồng nghiệm thu nghiệp vụ hiện có. Thống kê đầu trang được ghi rõ là hồ sơ thật của toàn gian hàng.
- Kiểm chứng: 37 test backend (service và HTTP), 9 test utility frontend đạt; browser với API mock kiểm tra video hiện tại, mẫu thật, bộ lọc sandbox, lỗi API/khôi phục, yêu cầu sửa, kết quả phía KOL, bấm đúp và reload. Build backend/frontend thành công. Không thực hiện quyết định nghiệm thu thay người dùng trên DB nhóm.
