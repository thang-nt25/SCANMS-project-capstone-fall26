# Đối chiếu class diagram FR10–FR16 với Word và FR9

Ngày đối chiếu: 2026-10-20. Đã mở chỉ đọc `C:/Users/tuann/Downloads/3681_FA24SE007_GFA76_FA24SE007_VANVTT_FinalReport.docx` và trích đúng Figure 13–14 trong mục 3. Detailed Design: rId136 → `word/media/image128.png` (class), rId137 → `word/media/image129.png` (sequence). Ảnh đối chiếu được giữ trong `reference-word/`; file Word không được chỉnh sửa.

Theo yêu cầu mới nhất, class FR11–FR16 dùng cách phân nhóm giống FR9: hỗ trợ bên trái, Controller → Service → PrismaService ở giữa, model bên phải và PrismaClient dưới trái. Lượt này chỉ đổi bố cục và khổ hình, giữ nguyên toàn bộ lớp, thành viên và mảng quan hệ. FR9 và FR10 không thay đổi; FR10 vẫn giữ bố cục cân đối từ lượt trước.

| Thành phần | FR9 | Bản trước | Bản hiện tại FR10–FR16 |
| --- | --- | --- | --- |
| Controller, Service, PrismaService | x=850, rộng 830 | x=1150, rộng 1020 | x=850, rộng 830 |
| Hỗ trợ bên trái | x=60, rộng 560 | x=60, rộng 800 | x=60, rộng 560 |
| PrismaClient | x=60, y=1700, rộng 650 | x=60, y=1700, rộng 800 | x=60, y=1700, rộng 650 |
| Model nghiệp vụ chính | x=1930, rộng 620 | x=2550, rộng 1000 | x=1930, rộng 620 |
| Vùng model | Các model bên phải | Một số model chuyển sang trái | FR11–FR16: toàn bộ model x=1930, rộng 620; FR10 giữ nguyên |
| Tên lớp, thành viên | Arial 20, 18 | Arial 20, 18 | Arial 20, 18 |
| Chữ ký phương thức dài | Hộp theo cột | Mở rộng toàn cột | Tăng chiều cao dòng, giữ độ rộng cột |
| Nhãn quan hệ | Bên cạnh dây | Khung chữ nền trắng rộng 200 | Nhãn không nền, đặt tránh dây và bội số |

FR10–FR14 hiện có canvas 2800 × 2240, FR15 là 2800 × 2531, FR16 là 2800 × 2809. FR9 gốc là 2640 × 2160; bộ mới thêm lề cho association và chiều cao cho nhiều model hơn. Cỡ chữ và kích thước trục xử lý giữ nguyên; không ép hình nhiều model về cùng chiều cao bằng cách thu nhỏ chữ. Cần xem ở cùng mức zoom để so cỡ chữ, vì Fit page phụ thuộc kích thước hình.

| FR | Cột hỗ trợ bên trái | Cột nghiệp vụ bên phải |
| --- | --- | --- |
| FR10 | User, CollaboratorProfile | Store, Product, ReferralLink |
| FR11 | Giữ CacheService | Store, User, ReferralLink |
| FR12 | StoreCouponsController | Store, User, StoreCollaborator, Coupon |
| FR13 | Giữ OrdersController và OrdersService | Store, ReferralLink, AttributionSession, Order |
| FR14 | Giữ CacheService, Redis, ClickQueueService | ReferralLink, ClickTrafficLog |
| FR15 | CacheService | Store, Product, ProductVariant, MediaAsset, ProductReview |
| FR16 | CouponsService | Product, ProductVariant, Order, OrderItem, Coupon, CouponRedemption |

Trục Controller → Service → PrismaService và PrismaClient ở dưới trái không thay đổi. Không thêm guard, không thêm hoặc xóa bất kỳ lớp/thành viên/quan hệ nào trong lượt này. Chỉ thay tọa độ, độ rộng theo cột và điểm gấp/nhãn của đường nối để phù hợp bố cục mới.

Figure 13 trong Word có interface, repository và UnitOfWork thuộc kiến trúc dự án .NET của mẫu. SCANMS dùng controller/service NestJS và Prisma, nên giữ tên lớp thật, ngăn phương thức model trống, property model public và `PrismaService extends PrismaClient`. Không thêm IService, Repository, Implements, get/set hoặc service không tồn tại để làm giống hình mẫu.

Các nét liền có mũi tên mở thể hiện tham chiếu giữ qua constructor; nét đứt «use» thể hiện dependency ORM; tam giác rỗng thể hiện kế thừa; nét liền có bội số thể hiện association thật trong Prisma schema. Model được tải qua include/select cũng có dependency ORM; điều đó không tạo thêm FK. Danh sách lớp, thành viên và các association/reference/inheritance đều khớp mốc trước lượt này.

Ví dụ FR10: `getEligibleProducts` và `createReferralLink` đọc `prisma.user` kèm CollaboratorProfile và `prisma.product` kèm Store, đồng thời đọc/tạo ReferralLink. Hình vì thế thể hiện dependency ORM tới cả năm model đã chọn. Đối chiếu tại `backend/src/modules/referral-links/referral-links.service.ts` và `backend/prisma/schema.prisma`. Các FR còn lại giữ phạm vi đã mô tả trong tài liệu `FRxx_CODE_ANALYSIS.md` tương ứng.

Đã render và xem sáu PNG class FR11–FR16, kiểm tra tràn chữ, hộp/nhãn/dây và parse XML. Canonical `.drawio`, XML paste và file không đuôi trong `docs/review 2` khớp nhau. PNG là preview từ geometry, không phải export trực tiếp diagrams.net. Validator đối chiếu nguyên vẹn `classes` và `relations` với bản lưu `FRxx_before_balanced_class_layout`; bản ngay trước lượt mới cũng được giữ tại `FRxx_before_fr09_model_columns`. Trong lượt class này, sequence và sơ đồ FR9–FR10 được giữ nguyên byte. Lượt đồng bộ sequence kế tiếp được ghi riêng tại `FR10_15_REPORT_INDEX.md` và không thay đổi các file class; không sửa logic ứng dụng.
