import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_capstone_report():
    target_files = [
        r"c:\HW\CAPSTONE\FA26SE032_GFA96_MinhTTH5.xlsx",
        r"c:\HW\CAPSTONE\docs\FA26SE032_GFA96_MinhTTH5.xlsx"
    ]

    font_family_s1 = "Calibri"
    font_family_s2 = "Times New Roman"

    border_thin = Border(
        left=Side(style='thin', color='D0D5DD'),
        right=Side(style='thin', color='D0D5DD'),
        top=Side(style='thin', color='D0D5DD'),
        bottom=Side(style='thin', color='D0D5DD')
    )

    fill_done = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    fill_current = PatternFill(start_color="FFF8ED", end_color="FFF8ED", fill_type="solid")
    fill_plan = PatternFill(start_color="FAFAFA", end_color="FAFAFA", fill_type="solid")

    # ==========================================
    # SHEET 1 TEXTS
    # ==========================================
    s1_weeks = {
        "D6": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Phê duyệt KH chi tiết thực hiện khóa luận, supervisor phê duyệt.\n"
            "• Thiết kế kiến trúc tổng thể phần mềm SAD, đặc tả yêu cầu chức năng SRS.\n"
            "• Thiết kế CSDL Master 41 bảng chuẩn 3NF (PostgreSQL) & kịch bản gieo mầm dữ liệu mẫu.\n"
            "• Khởi tạo Base Monorepo NestJS + React Vite + Docker Multi-Container."
        ),
        "E6": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Phân hệ Quản trị & Xác thực tài khoản: Đăng ký/đăng nhập đa vai trò, bảo mật mật khẩu Argon2id, mã JWT, xác thực 2 bước (2FA OTP), Quản lý Gian hàng đối tác, Danh mục Sản phẩm & Kho nội dung số quảng bá.\n"
            "• Phân hệ Tiếp thị liên kết (Affiliate Tracking): Tự động tạo Link tiếp thị rút gọn, tạo mã QR Code động canvas 512x512, cơ chế lưu Cookie người mua 30 ngày, thuật toán chặn click ảo/spam bằng Redis.\n"
            "• Khởi tạo Cổng Khách Hàng (Customer Portal) & Sổ địa chỉ giao nhận.\n"
            "• Thiết lập chuỗi an ninh kiểm toán Audit Logs bất biến SHA-256 (16/16 kịch bản kiểm thử đạt chuẩn)."
        ),
        "F6": (
            "✅ [HOÀN THÀNH 100%]\n"
            "1. Phân hệ Tài chính, Đơn hàng & Quyết toán hoa hồng:\n"
            "   - Xử lý đơn hàng đa trạng thái; nền tảng Quỹ bảo chứng Escrow 14 ngày bảo đảm quyền lợi đổi trả.\n"
            "   - Tự động quyết toán hoa hồng vào ví CTV nội bộ (0đ phí ngân hàng nhờ hạch toán sổ cái kép).\n"
            "   - Khấu trừ thuế TNCN 10% theo luật với lệnh thanh toán >= 2 triệu VNĐ.\n"
            "   - Tạo quy trình giải ngân hàng loạt Batch Payout theo file VietQR Napas247 XLSX.\n"
            "2. Phân tách chuẩn hóa vai trò hệ thống:\n"
            "   - Tách biệt rõ ràng SYSTEM_MANAGER (vận hành thẩm định KYC CCCD/MST, kiểm duyệt sản phẩm) và SYSTEM_ADMIN (quản trị tối cao, phân quyền RBAC, an ninh sàn).\n"
            "3. Chuẩn hóa Design System Vàng Be (Warm Sand Gold):\n"
            "   - Tái thiết kế trang Login (/login) sang trọng, tích hợp bộ chuyển đổi 5 vai trò mượt mà.\n"
            "   - Đồng bộ Public Header, Search Zoom Modal và Marketplace Shopee-style; Sơ đồ Use Case Bill OTP (PR #50, #51).\n"
            "4. Tái cấu trúc phân công 4 thành viên độc lập, chuẩn hóa luồng nghiệp vụ E-commerce thực tế."
        ),
        "G6": (
            "⭐ [ĐANG BÁO CÁO - HOÀN THÀNH 100%]\n"
            "1. Phân hệ Bảo Mật, Escrow & IAM:\n"
            "   - Khóa 100% bắt buộc đăng nhập (Google 1-Click 1.5s), Quên mật khẩu OTP Email 5 phút, mã hóa Argon2id.\n"
            "   - Quỹ Escrow 14 ngày thích ứng nghỉ Lễ/Tết VN, Cổng Trọng tài phân xử tranh chấp đổi trả (Split-View).\n"
            "   - Trung tâm thông báo toàn sàn thời gian thực đa vai trò & Động cơ AI Fraud Sentinel chống tự mua.\n"
            "2. Phân hệ Quản Trị Gian Hàng & Vận Chuyển:\n"
            "   - Quản lý tồn kho tức thời (cảnh báo <= 5 sp), Shop chủ động hủy đơn có lý do kèm tự hoàn tiền ví khách.\n"
            "   - Shipping Simulator in phiếu giao hàng A6 có mã vạch Barcode, Thẩm định video đổi trả 14 ngày & Voucher riêng.\n"
            "3. Phân hệ Mạng Lưới KOL/KOC & Quản Trị Sàn:\n"
            "   - Phân cấp hoa hồng 2 tầng (công khai & deal riêng), Quy trình xin mẫu thử 4 bước (cam kết trả video 14 ngày).\n"
            "   - Voucher Livestream phiên live có đồng hồ đếm ngược tự hủy, Hàng đợi duyệt hồ sơ Shop & Duyệt sản phẩm.\n"
            "4. Phân hệ Cổng Khách Hàng:\n"
            "   - Giỏ hàng đồng bộ Database PostgreSQL đa thiết bị, Quy trình gửi khiếu nại đổi trả 14 ngày (bắt buộc video mở hộp).\n"
            "   - Ràng buộc đánh giá thật Verified Review Gate (chỉ đơn COMPLETED), Minh bạch chính sách bảo hành & Chat Khách ⇄ Shop.\n"
            "5. Công tác Chuẩn bị Báo cáo & Review Tiến Độ với GVHD:\n"
            "   - Đóng gói kịch bản Demo hoàn chỉnh luồng nghiệp vụ E2E: Mua hàng -> Giao vận -> Escrow bảo chứng -> Đổi trả/Hoàn tất.\n"
            "   - Hoàn thiện Slide báo cáo tiến độ, cập nhật tài liệu kiến trúc SAD, sơ đồ Use Case và rà soát hệ thống sẵn sàng phản biện."
        ),
        "H6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện Socket.io In-App Chat Realtime đa kênh: Khách hàng ⇄ Chủ Shop (tư vấn sản phẩm) và KOL ⇄ Chủ Shop (đàm phán deal hoa hồng độc quyền Exclusive Deal).\n"
            "• Tích hợp Voucher Livestream có đếm ngược thời gian thực vào giao diện phiên phát sóng; tối ưu cơ chế tự hủy voucher khi hết phiên."
        ),
        "I6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Xây dựng Bảng vinh danh Top KOL (Leaderboard Gamification) thúc đẩy cạnh tranh doanh số tiếp thị.\n"
            "• Báo cáo tài chính & Biểu đồ doanh số Realtime qua Recharts; Phân tích phễu chuyển đổi (Traffic -> Click -> Lead -> Order -> Paid)."
        ),
        "J6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tích hợp hệ thống toàn diện E2E (End-to-End Testing) bao phủ toàn bộ các quy trình nghiệp vụ và luồng dữ liệu của hệ thống.\n"
            "• Kiểm tra ma trận kết nối luồng dữ liệu 4 thành viên (Khách hàng ↔ Shop ↔ KOL ↔ Admin) qua Postman/Newman automation test."
        ),
        "K6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử an toàn thông tin & bảo mật (Pentest, OWASP Top 10, SQLi, XSS, CSRF, Rate Limiting & Brute Force Prevention).\n"
            "• Rà soát an ninh chuỗi mã băm SHA-256 Audit Logs, cơ chế mã hóa Argon2id và xác thực 2 lớp OTP Email."
        ),
        "L6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Triển khai thử nghiệm UAT (User Acceptance Testing) với người dùng thật (KOL và Chủ shop đối tác D2C Sora Skin).\n"
            "• Thu thập ý kiến đánh giá trải nghiệm thực tế về luồng mua hàng, thẩm định đổi trả và xin mẫu thử."
        ),
        "M6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tải trọng và hiệu năng cao (Load Testing k6 / Artillery đạt 1.000 req/s).\n"
            "• Tối ưu hóa Database Indexing các bảng Orders, Commissions; tinh chỉnh cơ chế đệm Redis Caching."
        ),
        "N6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện các điều chỉnh phản hồi sau UAT; khắc phục triệt để các lỗi giao diện và trải nghiệm.\n"
            "• Soạn thảo tài liệu Hướng dẫn sử dụng chi tiết (User Manual) chuẩn hóa cho 4 vai trò (Admin, Shop, KOL, Khách hàng)."
        ),
        "O6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện toàn văn Báo cáo Đồ án Khóa luận Tốt nghiệp (Final Capstone Thesis Report) theo quy chuẩn FPT University.\n"
            "• Hoàn thiện phụ lục kỹ thuật, tài liệu thiết kế kiến trúc và nhật ký đóng góp mã nguồn của từng thành viên."
        ),
        "P6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Quay video demo kịch bản nghiệp vụ E2E hoàn chỉnh; đóng gói Docker Compose và triển khai thử nghiệm trên Production Cloud (Render/AWS).\n"
            "• Phê duyệt bảo vệ khóa luận: Supervisor đề nghị, Chủ nhiệm Bộ môn (CNBM) xem xét và phê duyệt danh sách bảo vệ."
        ),
        "Q6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Chuẩn bị Slide thuyết trình bảo vệ trước Hội đồng chấm thi Capstone.\n"
            "• Diễn tập bảo vệ khóa luận (Mock Defense), tiếp thu góp ý của GVHD & Bảo vệ chính thức trước Hội đồng chấm thi."
        ),
    }

    # ==========================================
    # SHEET 2 MEMBERS DATA
    # ==========================================
    members_data = [
        {
            "mssv": "SE184251",
            "name": "Nguyễn Thành Thắng (Leader)",
            "tasks": [
                "Kiến trúc hệ thống SAD, Monorepo NestJS+React, CSDL 41 bảng 3NF; Khóa bắt buộc 100% Đăng nhập (loại bỏ hoàn toàn khách vãng lai, Google 1-Click 1.5s)",
                "Phân hệ IAM an ninh cao: Quên mật khẩu qua mã OTP Email 5 phút, mã hóa Argon2id & JWT, xác minh mật khẩu khi đổi SĐT/Email giao hàng",
                "Quỹ bảo chứng Escrow 14 ngày thích ứng nghỉ Lễ/Tết Việt Nam (Adaptive Holiday-Aware Escrow Engine), quyết toán ví CTV 0đ phí ngân hàng (Sổ cái kép)",
                "Cổng phân xử Trọng tài Khiếu nại Đổi trả độc lập (Admin Split-View), Trung tâm Thông báo toàn sàn thời gian thực & AI Fraud Sentinel chống tự mua"
            ],
            "w1": "✅ Hoàn thành 100% đề cương, kiến trúc CSDL 41 bảng 3NF, Base monorepo NestJS + React Vite, cấu hình Docker Compose multi-container.",
            "w2": "✅ Hoàn thành phân hệ Xác thực & Phân quyền đa vai trò, bảo mật mật khẩu Argon2id, mã JWT, mã 2FA OTP, Quản trị Store & Sản phẩm, Kho tài nguyên Media Hub.",
            "w3": "✅ Hoàn thành nền tảng Escrow 14 ngày, quyết toán ví CTV 0đ phí ngân hàng, phân tách vai trò SYSTEM_MANAGER vs SYSTEM_ADMIN, Design System Vàng Be.",
            "w4": "⭐ Hoàn thành 100%: Khóa 100% login (Google 1-Click); Quên MK OTP Email + Argon2id; Quỹ Escrow 14 ngày thích ứng Lễ/Tết; Cổng Trọng tài phân xử khiếu nại (Split-View); Chuông báo realtime; AI Fraud Sentinel; Chuẩn bị kịch bản demo và slide báo cáo Review.",
            "w5_14": {
                "w5": "⏳ Tích hợp thông báo đẩy Socket.io cho trung tâm thông báo; Hỗ trợ các thành viên kết nối cổng Chat realtime Khách ⇄ Shop và KOL ⇄ Shop.",
                "w6": "⏳ Xây dựng API và giao diện biểu đồ doanh số tài chính Recharts realtime; Kết nối bảng vinh danh Top KOL Leaderboard.",
                "w7": "⏳ Xây dựng bộ kịch bản kiểm thử tích hợp E2E tự động qua Newman/Postman; Kiểm tra ma trận luồng dữ liệu 4 thành viên.",
                "w8": "⏳ Thực hiện Pentest an toàn thông tin hệ thống (OWASP Top 10, SQLi, CSRF, Rate Limiting, Brute Force); Rà soát mã hóa Argon2id và Audit Logs.",
                "w9": "⏳ Tổ chức buổi thử nghiệm UAT với người dùng thật (KOL và Chủ shop Sora Skin thực tế); Thu thập phản hồi về luồng Escrow và phân xử.",
                "w10": "⏳ Thiết lập kịch bản Load Testing k6 1.000 req/s; Tinh chỉnh hiệu năng truy vấn PostgreSQL và Redis Caching.",
                "w11": "⏳ Xử lý các vấn đề phát sinh sau UAT; Soạn thảo User Manual phân hệ System Admin & Bảo mật tài chính.",
                "w12": "⏳ Tổng hợp toàn văn Báo cáo Đồ án Tốt nghiệp (Final Capstone Thesis Report) và hoàn thiện các sơ đồ kiến trúc chuẩn.",
                "w13": "⏳ Đóng gói Docker Compose Production (Render/AWS); Quay video demo hoàn chỉnh; Hoàn thiện hồ sơ đề nghị bảo vệ khóa luận.",
                "w14": "⏳ Soạn thảo Slide thuyết trình bảo vệ; Diễn tập Mock Defense cùng GVHD & Trình bày chính thức trước Hội đồng chấm thi."
            }
        },
        {
            "mssv": "SE180104",
            "name": "Nguyễn Phú Quý",
            "tasks": [
                "Quản lý tồn kho tức thời (Stock Deduction khi chốt đơn), cảnh báo tồn kho thấp (<= 5 sản phẩm), tự khóa nút mua khi hết hàng",
                "Nút cho phép Shop chủ động hủy đơn có chọn lý do -> Tự động hoàn tiền vào ví khách & hủy hoa hồng tạm giữ",
                "Shipping Simulator: Tự sinh mã vận đơn chuẩn TMĐT (GHN-XXXXX), in phiếu giao hàng A6 chuẩn có mã vạch Barcode",
                "Màn hình Shop tiếp nhận và thẩm định video mở hộp đổi trả 14 ngày của khách; Quản lý & phát hành Voucher riêng của từng gian hàng"
            ],
            "w1": "✅ Nghiên cứu quy trình quản lý kho hàng và cơ chế trừ tồn kho chống bán vượt (Over-selling) trên các sàn TMĐT lớn.",
            "w2": "✅ Xây dựng màn hình danh sách đơn hàng phía Shop và cấu hình các trường trạng thái đơn hàng (PENDING, PROCESSING, SHIPPED).",
            "w3": "✅ Hoàn thiện giao diện hiển thị doanh số Shop phân tách: Doanh thu đang bảo chứng Escrow vs Doanh thu khả dụng.",
            "w4": "⭐ Hoàn thành: Trừ kho tức thời & cảnh báo tồn kho <= 5; Nút Shop hủy đơn kèm hoàn tiền tự động; Shipping Simulator in phiếu A6 Barcode; Thẩm định video đổi trả 14 ngày; Voucher riêng của shop; Sẵn sàng kịch bản demo Review.",
            "w5_14": {
                "w5": "⏳ Tối ưu giao diện in phiếu vận đơn A6 tương thích nhiều khổ máy in nhiệt; Kết nối module Chat Shop ⇄ Khách từ chi tiết đơn hàng.",
                "w6": "⏳ Biểu đồ phân tích doanh thu và số lượng đơn hàng theo từng sản phẩm của Shop trên Dashboard.",
                "w7": "⏳ Kiểm thử E2E luồng: Khách đặt hàng -> Trừ kho -> Shop in phiếu giao -> Shipping Simulator -> Hoàn tất đơn.",
                "w8": "⏳ Kiểm thử an ninh luồng hủy đơn hàng và hoàn tiền, đảm bảo không bị lỗi race-condition hoặc âm tiền quỹ.",
                "w9": "⏳ Hỗ trợ Chủ shop Sora Skin chạy thử tính năng quản lý kho, in vận đơn A6 và tiếp nhận thẩm định đổi trả trong đợt UAT.",
                "w10": "⏳ Tối ưu hóa truy vấn Database danh sách đơn hàng và tồn kho sản phẩm khi lượng đơn phát sinh lớn.",
                "w11": "⏳ Soạn thảo tài liệu hướng dẫn sử dụng (User Manual) dành riêng cho vai trò Merchant (Chủ gian hàng).",
                "w12": "⏳ Viết phần Báo cáo Đồ án về Phân hệ Quản Trị Gian Hàng, Vận Chuyển và Xử Lý Đơn Hàng.",
                "w13": "⏳ Chuẩn bị kịch bản demo tính năng Quản lý kho, In phiếu A6 Barcode và Thẩm định video đổi trả.",
                "w14": "⏳ Trình bày slide phần Quản Trị Gian Hàng & Vận Chuyển trước Hội đồng chấm thi."
            }
        },
        {
            "mssv": "SE180104",
            "name": "Nguyễn Đình Tuấn",
            "tasks": [
                "Cơ chế phân cấp hoa hồng tiếp thị 2 tầng: Mức cơ bản (Open Offer) tự lấy link vs Mức độc quyền (Exclusive Deal) đàm phán qua Chat",
                "Quy trình yêu cầu cấp sản phẩm mẫu 4 bước (Sample Request Flow) có cam kết trả video review trong vòng 14 ngày",
                "Hệ thống Voucher Livestream theo phiên phát sóng với đồng hồ đếm ngược (Countdown Timer) tự hủy khi hết live",
                "Hàng đợi Admin kiểm duyệt hồ sơ Shop mới (KYC CCCD, MST, ĐKKD, STK) & Kiểm duyệt nội dung sản phẩm mới (DRAFT -> APPROVED)"
            ],
            "w1": "✅ Nghiên cứu quy chế kiểm duyệt thông tin nhãn hàng và thuật toán phân bổ hoa hồng đa tầng của TikTok Shop Creator.",
            "w2": "✅ Hoàn thành động cơ tạo link tiếp thị rút gọn, Dynamic QR Code canvas 512x512, cookie lưu trữ 30 ngày và thuật toán ngăn chặn click ảo.",
            "w3": "✅ Hoàn thành tích hợp sơ đồ Use Case Bill OTP (drawio), Search Zoom modal và Header công khai (PR #50, #51).",
            "w4": "⭐ Hoàn thành: Hoa hồng 2 tầng (Open Offer vs Deal riêng); Quy trình xin mẫu thử 4 bước; Voucher Live đếm ngược tự hủy; Hàng đợi duyệt Shop & Sản phẩm mới; Sẵn sàng dữ liệu demo Review.",
            "w5_14": {
                "w5": "⏳ Tích hợp đồng hồ đếm ngược Voucher Live vào phòng Livestream; Xây dựng màn hình đàm phán Exclusive Deal trực tiếp qua Chat.",
                "w6": "⏳ Biểu đồ theo dõi tỷ lệ chuyển đổi đơn hàng và hiệu quả doanh số của từng mã tracking link KOL.",
                "w7": "⏳ Kiểm thử E2E luồng: KOL xin mẫu thử -> Shop duyệt gửi -> KOL nhận mẫu nộp video -> Lấy link tiếp thị bán hàng.",
                "w8": "⏳ Kiểm thử an toàn luồng duyệt hồ sơ KYC và cơ chế tự khóa tài khoản KOL khi quá hạn 14 ngày không nộp video review.",
                "w9": "⏳ Hỗ trợ các bạn KOL chạy thử tính năng xin hàng mẫu, lấy link tiếp thị và áp voucher phiên livestream trong đợt UAT.",
                "w10": "⏳ Tối ưu hóa hiệu năng hàng đợi kiểm duyệt KYC và tốc độ truy vấn kho hàng tiếp thị của KOL.",
                "w11": "⏳ Soạn thảo tài liệu hướng dẫn sử dụng (User Manual) dành cho KOL/KOC và Quản trị viên kiểm duyệt.",
                "w12": "⏳ Viết phần Báo cáo Đồ án về Phân hệ Tiếp Thị Liên Kết KOL/KOC và Quy Trình Kiểm Duyệt Sàn.",
                "w13": "⏳ Chuẩn bị kịch bản demo luồng Xin mẫu thử 4 bước, Hoa hồng 2 tầng và Voucher phiên live đếm ngược.",
                "w14": "⏳ Trình bày slide phần Mạng Lưới KOL & Kiểm Duyệt Sàn trước Hội đồng chấm thi."
            }
        },
        {
            "mssv": "SE184527",
            "name": "Phan Xuân Thịnh",
            "tasks": [
                "Giỏ hàng đồng bộ Database PostgreSQL, lưu trữ tập trung, đồng bộ tức thời đa thiết bị (Omnichannel Cart Persistence)",
                "Quy trình gửi yêu cầu Đổi trả / Hoàn tiền 14 ngày (bắt buộc đính kèm ảnh và video mở hộp chống tráo hàng)",
                "Ràng buộc đánh giá thật (Verified Review Gate: Chỉ đơn hàng COMPLETED mới được mở quyền review 5 sao)",
                "Minh bạch chính sách bảo hành gian hàng trước checkout & Kênh chat tư vấn trực tiếp Khách hàng ⇄ Chủ Shop (Live In-App Chat)"
            ],
            "w1": "✅ Nghiên cứu cơ chế đồng bộ giỏ hàng qua Database PostgreSQL và Luật Bảo vệ quyền lợi người tiêu dùng trong mua sắm online.",
            "w2": "✅ Hoàn thành cấu hình Cổng Khách Hàng (Customer Portal), quản lý thông tin tài khoản và sổ địa chỉ giao hàng.",
            "w3": "✅ Hoàn thành tích hợp giao diện hiển thị trạng thái đơn hàng phía Khách và liên kết xem hành trình giao nhận.",
            "w4": "⭐ Hoàn thành: Giỏ hàng đồng bộ Database PostgreSQL; Khiếu nại đổi trả 14 ngày bắt buộc video mở hộp; Ràng buộc đánh giá thật Verified Review Gate; Chat tư vấn Khách ⇄ Shop; Sẵn sàng kịch bản demo Review.",
            "w5_14": {
                "w5": "⏳ Hoàn thiện giao diện Chat trực tiếp Khách hàng ⇄ Chủ Shop thời gian thực; Hiển thị danh thiếp sản phẩm ngay trong khung chat.",
                "w6": "⏳ Tối ưu hóa trang 'Đơn mua của tôi' với thanh tiến trình trực quan (Timeline: Đặt hàng -> Đang giao -> Đã giao -> Hoàn tất).",
                "w7": "⏳ Kiểm thử tích hợp E2E luồng: Thêm giỏ hàng -> Đặt hàng -> Nhận hàng -> Gửi yêu cầu đổi trả có video mở hộp.",
                "w8": "⏳ Kiểm thử an toàn thông tin dữ liệu khách hàng, chống tấn công thao túng giỏ hàng hoặc gửi đánh giá giả mạo.",
                "w9": "⏳ Theo dõi người dùng thật thử nghiệm trải nghiệm mua sắm, thêm giỏ hàng đa thiết bị và viết đánh giá trong đợt UAT.",
                "w10": "⏳ Tối ưu hóa câu truy vấn Database giỏ hàng và danh sách lịch sử đơn mua của khách hàng.",
                "w11": "⏳ Soạn thảo tài liệu hướng dẫn mua sắm và quy trình khiếu nại đổi trả (User Guide) cho Khách mua hàng.",
                "w12": "⏳ Viết phần Báo cáo Đồ án về Phân hệ Khách Mua Hàng & Trải Nghiệm Mua Sắm E-Commerce.",
                "w13": "⏳ Chuẩn bị kịch bản demo hành trình khách mua hàng: Giỏ hàng đồng bộ, Đổi trả video mở hộp và Đánh giá Verified Buyer.",
                "w14": "⏳ Trình bày slide phần Cổng Khách Hàng & Trải Nghiệm Mua Sắm trước Hội đồng chấm thi."
            }
        }
    ]

    for file_path in target_files:
        if not os.path.exists(file_path):
            print(f"File not found, skipping: {file_path}")
            continue

        print(f"\nProcessing file: {file_path}")
        wb = openpyxl.load_workbook(file_path)

        # ----------------------------------------------------
        # 1. SHEET 1: BÁO CÁO TỔNG HỢP TIẾN ĐỘ
        # ----------------------------------------------------
        ws1 = wb['Sheet1']
        
        ws1['B2'] = "ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn - 0936.668.995)"
        ws1['B2'].font = Font(name=font_family_s1, size=11, bold=True, color="1B365D")
        
        ws1['B3'] = "Kỹ thuật phần mềm (Software Engineering - SE)"
        ws1['B3'].font = Font(name=font_family_s1, size=11, bold=True, color="1B365D")

        ws1['A6'] = "FA26SE032"
        ws1['A6'].font = Font(name=font_family_s1, size=11, bold=True, color="1B365D")
        ws1['A6'].alignment = Alignment(horizontal="center", vertical="top")
        ws1['A6'].border = border_thin

        ws1['B6'] = (
            "SCANMS (Sales Collaborator and Affiliate Network Management System)\n\n"
            "Hệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng và Mạng lưới Tiếp thị Liên kết Đa Gian Hàng"
        )
        ws1['B6'].font = Font(name=font_family_s1, size=10, bold=True, color="1A1612")
        ws1['B6'].alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        ws1['B6'].border = border_thin

        ws1['C6'] = "09:00 - Thứ 4 hàng tuần\n(Trực tuyến Google Meet / Phòng Lab SE)"
        ws1['C6'].font = Font(name=font_family_s1, size=9.5, color="1A1612")
        ws1['C6'].alignment = Alignment(horizontal="center", vertical="top", wrap_text=True)
        ws1['C6'].border = border_thin

        for cell_id, text in s1_weeks.items():
            cell = ws1[cell_id]
            cell.value = text
            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            cell.border = border_thin
            
            if cell_id == "G6":
                # Tuần 4 - Current Reporting Week (Warm Sand Gold highlight)
                cell.font = Font(name=font_family_s1, size=9.5, bold=True, color="92400E")
                cell.fill = fill_current
            elif cell_id in ["D6", "E6", "F6"]:
                # Tuần 1, 2, 3 - Completed Weeks (Soft Green)
                cell.font = Font(name=font_family_s1, size=9.5, color="065F46")
                cell.fill = fill_done
            else:
                # Tuần 5 - 14 - Planned Weeks (Soft Slate)
                cell.font = Font(name=font_family_s1, size=9.5, color="475467")
                cell.fill = fill_plan

        ws1.row_dimensions[6].height = 360
        ws1.column_dimensions['A'].width = 14
        ws1.column_dimensions['B'].width = 44
        ws1.column_dimensions['C'].width = 24
        ws1.column_dimensions['D'].width = 38
        ws1.column_dimensions['E'].width = 40
        ws1.column_dimensions['F'].width = 44
        ws1.column_dimensions['G'].width = 46
        for c_idx in range(8, 18):
            ws1.column_dimensions[get_column_letter(c_idx)].width = 34

        # ----------------------------------------------------
        # 2. SHEET 2: BÁO CÁO CHI TIẾT 4 THÀNH VIÊN
        # ----------------------------------------------------
        ws2 = wb['Sheet2']
        
        ws2['B2'] = "FA26SE032"
        ws2['B2'].font = Font(name=font_family_s2, size=12, bold=True, color="1B365D")
        
        ws2['B3'] = "SCANMS (Sales Collaborator and Affiliate Network Management System) - Hệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng và Mạng lưới Tiếp thị Liên kết Đa Gian Hàng"
        ws2['B3'].font = Font(name=font_family_s2, size=11, bold=True, color="1A1612")

        # Clear row 10 in Sheet 2 to avoid ghost rows
        for c in range(1, 28):
            cell_10 = ws2.cell(row=10, column=c)
            cell_10.value = None
            cell_10.fill = PatternFill(fill_type=None)
            cell_10.border = Border()

        for idx, m in enumerate(members_data):
            row = 6 + idx
            ws2.row_dimensions[row].height = 190

            # Col 1: MSSV
            c_mssv = ws2.cell(row=row, column=1, value=m["mssv"])
            c_mssv.alignment = Alignment(horizontal="center", vertical="top")
            c_mssv.font = Font(name=font_family_s2, size=10, bold=True, color="1B365D")
            c_mssv.border = border_thin

            # Col 2: Member Name
            c_name = ws2.cell(row=row, column=2, value=m["name"])
            c_name.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_name.font = Font(name=font_family_s2, size=10, bold=True, color="1A1612")
            c_name.border = border_thin

            # Tasks 1 to 4 (Cols 3 to 6 / C to F)
            for t_idx in range(4):
                c_task = ws2.cell(row=row, column=3 + t_idx, value=m["tasks"][t_idx])
                c_task.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                c_task.font = Font(name=font_family_s2, size=9.5, color="1A1612")
                c_task.border = border_thin

            # Tuần 1 (Col 7 / G) - DONE
            c_w1 = ws2.cell(row=row, column=7, value=m["w1"])
            c_w1.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_w1.font = Font(name=font_family_s2, size=9, color="065F46")
            c_w1.fill = fill_done
            c_w1.border = border_thin

            # Tuần 2 (Col 8 / H) - DONE
            c_w2 = ws2.cell(row=row, column=8, value=m["w2"])
            c_w2.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_w2.font = Font(name=font_family_s2, size=9, color="065F46")
            c_w2.fill = fill_done
            c_w2.border = border_thin

            # Tuần 3 (Col 9 / I) - DONE
            c_w3 = ws2.cell(row=row, column=9, value=m["w3"])
            c_w3.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_w3.font = Font(name=font_family_s2, size=9, color="065F46")
            c_w3.fill = fill_done
            c_w3.border = border_thin

            # Tuần 4 (Col 10 / J) - CURRENT REPORTING WEEK (WARM SAND GOLD HIGHLIGHT)
            c_w4 = ws2.cell(row=row, column=10, value=m["w4"])
            c_w4.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_w4.font = Font(name=font_family_s2, size=9, bold=True, color="92400E")
            c_w4.fill = fill_current
            c_w4.border = border_thin

            # Tuần 5 to 14 (Cols 11 to 20 / K to T) - PLANNED
            for w_num in range(5, 15):
                col = 6 + w_num
                plan_text = m["w5_14"][f"w{w_num}"]
                c_plan = ws2.cell(row=row, column=col, value=plan_text)
                c_plan.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                c_plan.font = Font(name=font_family_s2, size=9, color="475467")
                c_plan.fill = fill_plan
                c_plan.border = border_thin

        # Column widths for Sheet 2
        ws2.column_dimensions['A'].width = 15
        ws2.column_dimensions['B'].width = 25
        ws2.column_dimensions['C'].width = 30
        ws2.column_dimensions['D'].width = 30
        ws2.column_dimensions['E'].width = 30
        ws2.column_dimensions['F'].width = 30
        ws2.column_dimensions['G'].width = 32
        ws2.column_dimensions['H'].width = 32
        ws2.column_dimensions['I'].width = 36
        ws2.column_dimensions['J'].width = 44
        for col_i in range(11, 21):
            ws2.column_dimensions[get_column_letter(col_i)].width = 30

        wb.save(file_path)
        print(f"Successfully populated and saved: {file_path}")

if __name__ == "__main__":
    build_capstone_report()
