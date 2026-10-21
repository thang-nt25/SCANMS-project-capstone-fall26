# FR10–FR16 — Sơ đồ báo cáo theo bố cục FR9

FR01 mới: [Class](<../review 2/FR01 - Class Diagram>) · [Sequence](<../review 2/FR01 - Sequence Diagram>) · [Đối chiếu mã nguồn và tình trạng 2FA](../FR01_CODE_ANALYSIS.md). Hai hình dùng cùng renderer và phong cách FR9; mô tả OTP đăng ký + đăng nhập JWT đang có, ghi rõ login OTP 2FA chưa triển khai.

FR02 mới: [Class](<../review 2/FR02 - Class Diagram>) · [Sequence](<../review 2/FR02 - Sequence Diagram>) · [Đối chiếu RBAC trong mã nguồn](../FR02_CODE_ANALYSIS.md). Cùng kiểu vẽ FR9; thể hiện JWT → RolesGuard → endpoint, method override và chặn sai vai trò bằng 403. Ví dụ duyệt coupon chỉ dành cho SHOP_MANAGER; Admin không tự động được bỏ qua guard.

FR03 mới: [Class](<../review 2/FR03 - Class Diagram>) · [Sequence](<../review 2/FR03 - Sequence Diagram>) · [Đối chiếu tài chính KYC](../FR03_CODE_ANALYSIS.md). Cùng kiểu vẽ FR9; nộp CCCD/MST/ngân hàng, lưu Profile, Admin duyệt và tạo Notification. API cũ cho Shop duyệt, nhưng trang Shop dùng chung hiện gọi API Admin-only và bị 403; đã ghi rõ trên hình/tài liệu.

FR04 mới: [Class](<../review 2/FR04 - Class Diagram>) · [Sequence](<../review 2/FR04 - Sequence Diagram>) · [Đối chiếu quản lý đa kênh MXH](../FR04_CODE_ANALYSIS.md). Cùng kiểu vẽ FR9; thêm kênh TikTok/FB/YouTube/Threads với followers, tùy chọn primary, tính lại tổng và tải lại danh sách. Không có trần số kênh trong logic hiện tại; followers do người dùng nhập.

Cập nhật ngày 2026-10-20: cả class và sequence diagram FR10–FR16 dùng chung quy cách trình bày theo FR9, qua `report-uml-layout.cjs`.

Class FR11–FR16 hiện theo cách phân nhóm của FR9: lớp hỗ trợ bên trái, Controller → Service → PrismaService tại x=850 ở giữa, toàn bộ model bên phải tại x=1930 và PrismaClient dưới trái. Giữ nguyên toàn bộ lớp, thành viên và quan hệ. Cùng font Arial 20/18, kiểu ba ngăn và mũi tên; hộp trục xử lý rộng 830, cột hỗ trợ 560, model 620, PrismaClient 650. Canvas rộng 2800; FR11–FR14 cao 2240, FR15 cao 2531, FR16 cao 2809 để đủ chỗ cho model mà không thu nhỏ chữ. FR9 và FR10 giữ nguyên trong lượt này. Xem [bố cục từng FR và đối chiếu chi tiết](FR09_WORD_CLASS_COMPARISON.md).

Sequence FR10–FR16 dùng preset `fr09-sequence-v3`: actor bên trái → Browser → Controller → Service → PrismaService, các đối tượng hỗ trợ đặt sau chuỗi chính. FR12 có hai actor/hai controller, FR13 có hai chuỗi redirect/checkout nên giữ các nhóm thực tế đó. Tiêu đề 28, tên đối tượng 20, thông điệp 18, font Arial. Hộp Browser rộng 250; đối tượng rộng 430, cao 58; thanh thực thi rộng 10. Nhãn thông điệp trong suốt như FR9, không có hình chữ nhật trắng che lưới/lifeline. Nhãn mũi tên dài nằm trong một khoảng giữa hai cột, tránh lifeline trung gian. Khổ cơ sở 2840 × 2835 như FR9; FR10 đúng khổ này, các FR nhiều cột chỉ tăng chiều rộng. Vùng thông điệp cùng từ y=245 đến y=2485, giãn các hàng từ nhịp tối thiểu 64 px (thêm 16 px sau lời gọi nội bộ), không thu nhỏ chữ. Lifeline kết thúc tại y=2555, chú thích bắt đầu y=2595. Browser dùng thanh thực thi xuyên suốt nếu đặc tả không chia tương tác riêng. Không có khung bao hoặc khung chia nhánh. Đối tượng, nội dung, thứ tự và số bước được giữ nguyên; số cột và mật độ thông điệp vẫn khác nhau theo chức năng.

| FR | Lớp/model cũ → mới | Thông điệp cũ → mới | File class | File sequence |
| --- | --- | --- | --- | --- |
| FR10 | 11 → 9 | 56 → 22 | [Class](<../review 2/FR10 - Class Diagram>) | [Sequence](<../review 2/FR10 - Sequence Diagram>) |
| FR11 | 9 → 8 | 40 → 23 | [Class](<../review 2/FR11 - Class Diagram>) | [Sequence](<../review 2/FR11 - Sequence Diagram>) |
| FR12 | 16 → 9 | 55 → 26 | [Class](<../review 2/FR12 - Class Diagram>) | [Sequence](<../review 2/FR12 - Sequence Diagram>) |
| FR13 | 14 → 10 | 58 → 25 | [Class](<../review 2/FR13 - Class Diagram>) | [Sequence](<../review 2/FR13 - Sequence Diagram>) |
| FR14 | 11 → 9 | 50 → 23 | [Class](<../review 2/FR14 - Class Diagram>) | [Sequence](<../review 2/FR14 - Sequence Diagram>) |
| FR15 | 15 → 10 | 47 → 24 | [Class](<../review 2/FR15 - Class Diagram>) | [Sequence](<../review 2/FR15 - Sequence Diagram>) |
| FR16 | 16 → 11 | 57 → 24 | [Class](<../review 2/FR16 - Class Diagram>) | [Sequence](<../review 2/FR16 - Sequence Diagram>) |

Phạm vi từng cặp hình:

- FR10: chọn sản phẩm hợp lệ, tạo link và audit trong transaction, trả short URL.
- FR11: preview QR trên Browser, kiểm tra quyền, cache/render và tải PNG/SVG.
- FR12: KOL đề xuất mã, Shop sở hữu duyệt chính sách, mã chuyển PENDING_APPROVAL → ACTIVE. Validation/redemption khi mua được mô tả trong tài liệu FR12 và luồng FR16.
- FR13: click hợp lệ B thay phiên A trong cùng Shop; cookie mang định danh visitor; đặt đơn lấy KOL hiện tại và lưu snapshot. Không vẽ khóa ngoại giả từ Order tới session/click log.
- FR14: Redis Lua kiểm tra hai cửa sổ trượt; fallback RAM; click bị giới hạn không được cấp attribution mới nhưng vẫn có thể chuyển đến đích an toàn; log chạy độc lập.
- FR15: landing sản phẩm/Shop, video KOL, đánh giá khách, HTML video và mở form mua. Bấm Buy now chưa tạo Order; tạo đơn thuộc FR16.
- FR16: kiểm tra checkout, coupon, tạo Order/OrderItems và trừ tồn trong transaction; xác nhận đơn.

Các chi tiết kỹ thuật còn lại nằm trong `docs/FR10_CODE_ANALYSIS.md` đến `FR16_CODE_ANALYSIS.md`. Bản chi tiết cũ, ảnh và tài liệu cũ được giữ tại `archive/FR10_detailed` đến `archive/FR16_detailed`.

Tái tạo tất cả: `node docs/diagrams/build-report-diagrams.cjs`. Chỉ tạo class FR11–FR16: `node docs/diagrams/build-report-diagrams.cjs --class-only 11 12 13 14 15 16`. Chỉ tạo sequence FR10–FR16: `node docs/diagrams/build-report-diagrams.cjs --sequence-only 10 11 12 13 14 15 16`. Từng entry point `build-fr10-diagrams.cjs` đến `build-fr16-diagrams.cjs` cũng tạo bản báo cáo hiện tại. Kiểm tra cấu trúc bằng `powershell -NoProfile -ExecutionPolicy Bypass -File docs/diagrams/validate-report-diagrams.ps1`.

PNG là preview từ cùng geometry, không phải export trực tiếp diagrams.net. Đã kiểm tra hình và tràn chữ; XML review/paste khớp `.drawio`. Lần rút gọn chỉ đổi sơ đồ/tài liệu, không đổi logic ứng dụng hoặc chạy giao dịch thật.

Mỗi hình tăng một hộp PrismaClient so với bản rút gọn trước để thể hiện kế thừa giống FR9. Bản trước khi đồng bộ bố cục nằm trong `archive/FR10_compact_before_fr09_layout` đến `archive/FR16_compact_before_fr09_layout`. Không thay FR9 gốc.

Bản trước khi đồng bộ sequence nằm trong `archive/FR10_before_fr09_sequence_layout` đến `archive/FR16_before_fr09_sequence_layout`. FR16 cũng dùng chung renderer, không còn mẫu sequence riêng.

Bản trước lượt đối chiếu Word/class mới nhất nằm trong `archive/FR10_before_word_class_alignment` đến `archive/FR16_before_word_class_alignment`. Đã render và xem cả bảy class, không tràn chữ. Validator xác nhận danh sách lớp/thành viên và các association/reference/inheritance được giữ nguyên; các file sequence không đổi so với mốc này.

Bản trước lượt **chỉ dàn lại hình** nằm trong `archive/FR10_before_balanced_class_layout` đến `archive/FR16_before_balanced_class_layout`. Validator đối chiếu toàn bộ lớp/thành viên và mảng quan hệ với mốc này; không thêm guard hoặc lớp mới. Lượt tiếp theo đưa model FR11–FR16 về cột phải theo FR9; bản trước lượt này nằm tại `archive/FR11_before_fr09_model_columns` đến `archive/FR16_before_fr09_model_columns`. File review, XML paste, drawio và PNG class đã đồng bộ; sequence cùng FR9–FR10 được giữ nguyên.

Lượt sequence tiếp theo lưu mốc tại `archive/FR10_before_fr09_sequence_v2` đến `archive/FR16_before_fr09_sequence_v2`. Đã tạo lại và xem bảy PNG, kiểm tra tràn chữ, khớp XML review/paste, đầu mũi tên theo vị trí cột mới và thanh thực thi. Validator đối chiếu nguyên vẹn participant, message, activation, subtitle và note với mốc trước lượt này. Class FR10–FR16 và toàn bộ sơ đồ FR9 giữ nguyên byte; manifest đối chiếu nằm tại `archive/fr09-sequence-v2-preserved-hashes.json`.

Lượt sửa theo ảnh đối chiếu lưu mốc tại `archive/FR10_before_fr09_sequence_visual_match` đến `archive/FR16_before_fr09_sequence_visual_match`. Đã bỏ nền trắng nhãn, thống nhất khổ cơ sở và vùng tương tác, kiểm tra nhãn không bị lifeline hoặc mũi tên khác xuyên qua. Xem [FR10 trên lưới để đối chiếu hình thức](FR10_Create_Short_Affiliate_Link_Sequence_Diagram_grid-preview.png). Có thể tạo preview lưới bằng tham số `-Grid` của `render-fr09-uml.ps1`; file `_grid-preview.png` là ảnh kiểm tra từ geometry, không phải export diagrams.net. File XML review/paste và PNG chính đều cập nhật; nội dung luồng, class và FR9 giữ nguyên.
