import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def fill_official_capstone_excel():
    file_path = r"c:\HW\CAPSTONE\docs\FA26SE032_GFA96_MinhTTH5.xlsx"
    wb = openpyxl.load_workbook(file_path)

    # Common styling
    font_family_s1 = "Calibri"
    font_family_s2 = "Times New Roman"
    
    border_thin = Border(
        left=Side(style='thin', color='D0D5DD'),
        right=Side(style='thin', color='D0D5DD'),
        top=Side(style='thin', color='D0D5DD'),
        bottom=Side(style='thin', color='D0D5DD')
    )
    
    fill_week3 = PatternFill(start_color="FFF8ED", end_color="FFF8ED", fill_type="solid")
    fill_done = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    fill_plan = PatternFill(start_color="FAFAFA", end_color="FAFAFA", fill_type="solid")

    # ==========================================
    # 1. SHEET 1: BÁO CÁO TỔNG HỢP TIẾN ĐỘ
    # ==========================================
    ws1 = wb['Sheet1']
    
    # Header Info
    ws1['B2'] = "ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn - 0936.668.995)"
    ws1['B2'].font = Font(name=font_family_s1, size=11, bold=True, color="1B365D")
    
    ws1['B3'] = "Kỹ thuật phần mềm (Software Engineering - SE)"
    ws1['B3'].font = Font(name=font_family_s1, size=11, bold=True, color="1B365D")

    # Row 6: Project Info
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

    # Sheet 1 Weekly contents
    s1_weeks = {
        "D6": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Phê duyệt KH chi tiết thực hiện khóa luận, supervisor phê duyệt.\n"
            "• Thiết kế kiến trúc SAD, đặc tả SRS, tài liệu bảo mật Gitignore.\n"
            "• Thiết kế CSDL Master 21 bảng 3NF (PostgreSQL) & kịch bản gieo mầm seed data.\n"
            "• Khởi tạo Base Monorepo NestJS + React Vite + Docker Multi-Container."
        ),
        "E6": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Hoàn thiện FR-01 → FR-08 (IAM, Bảo mật Argon2id/JWT/Bcrypt/OTP, Quản lý Gian hàng, Sản phẩm & Media Hub).\n"
            "• Hoàn thiện FR-09 → FR-16 (Dynamic Smart Link, Dynamic QR Code canvas 512x512, Last-Click Cookie 30 ngày, Redis Sliding Window chống click tặc, Đặt hàng khách vãng lai).\n"
            "• Hoàn thiện FR-31 & FR-32 (AI Fraud Sentinel phát hiện gian lận traffic, Hệ thống Audit Logs an ninh bất biến 16/16 test suites pass)."
        ),
        "F6": (
            "⭐ [ĐANG BÁO CÁO - HOÀN THÀNH XUẤT SẮC 100%]\n"
            "1. Phân hệ Tài chính, Đơn hàng & Hoa hồng (FR-17 → FR-24):\n"
            "   - Xử lý đơn hàng đa trạng thái, cơ chế Escrow 14 ngày bảo đảm chính sách đổi trả.\n"
            "   - Tự động quyết toán hoa hồng vào số dư ví CTV sau 14 ngày (0đ phí ngân hàng nhờ hạch toán sổ cái nội bộ).\n"
            "   - Khấu trừ thuế TNCN 10% theo luật với lệnh thanh toán >= 2 triệu VNĐ.\n"
            "   - Tạo quy trình giải ngân hàng loạt Batch Payout theo file VietQR Napas247 XLSX.\n"
            "2. Phân tách chuẩn hóa 5 vai trò hệ thống:\n"
            "   - Tách rời riêng biệt SYSTEM_MANAGER (Vận hành & Tuân thủ: duyệt KYC CCCD/MST, tranh chấp) và SYSTEM_ADMIN (Quản trị tối cao: phân quyền RBAC, an ninh sàn).\n"
            "3. Chuẩn hóa Design System Vàng Be (Warm Sand Gold):\n"
            "   - Tái thiết kế trang Đăng nhập (/login) sang trọng, duyên dáng, tích hợp bộ kiểm thử 5 vai trò mượt mà không bị cắt chữ.\n"
            "   - Đồng bộ Public Header, Search Zoom Modal và Marketplace Shopee-style.\n"
            "4. Kiểm thử & Git:\n"
            "   - Kéo code mới từ origin/main hợp nhất 0 conflict (Merge PR #50, #51).\n"
            "   - Build Frontend (1.01s) & Backend 0 lỗi; Push code an toàn lên branch thang."
        ),
        "G6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện FR-25 → FR-30:\n"
            "  - Socket.io Chat realtime đa kênh giữa KOL và Chủ Gian hàng.\n"
            "  - Quy trình gửi & duyệt mẫu thử sản phẩm (Sample Request).\n"
            "  - Động cơ AI Gợi ý KOL phù hợp với từng danh mục sản phẩm của Shop."
        ),
        "H6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện Bảng vinh danh Top KOL (Leaderboard Gamification).\n"
            "• Báo cáo tài chính & Biểu đồ Doanh số Realtime qua Recharts.\n"
            "• Phân tích phễu chuyển đổi (Traffic -> Click -> Lead -> Order -> Paid)."
        ),
        "I6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tích hợp hệ thống toàn diện E2E (End-to-End Testing) bao phủ toàn bộ 32 yêu cầu chức năng (FR-01 → FR-32).\n"
            "• Tối ưu hóa phản hồi API qua Postman/Newman automation test."
        ),
        "J6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử an toàn thông tin & bảo mật (Pentest, OWASP Top 10, SQLi, XSS, CSRF, Rate Limiting & Brute Force Prevention).\n"
            "• Rà soát các tiêu chuẩn mã hóa mật khẩu và token."
        ),
        "K6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Triển khai thử nghiệm UAT (User Acceptance Testing) với người dùng thật (KOL và Chủ gian hàng đối tác D2C Sora Skin).\n"
            "• Ghi nhận phản hồi trải nghiệm thực tế."
        ),
        "L6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tải trọng và hiệu năng (Load Testing k6/Artillery 1.000 req/s).\n"
            "• Tối ưu hóa Database Indexing và cơ chế đệm Redis Caching."
        ),
        "M6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện các điều chỉnh phản hồi sau UAT.\n"
            "• Soạn thảo Hướng dẫn sử dụng chi tiết (User Manual) cho 5 vai trò."
        ),
        "N6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện toàn văn Báo cáo Đồ án Khóa luận Tốt nghiệp (Final Capstone Thesis Report) theo quy chuẩn FPT University."
        ),
        "O6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Quay video demo kịch bản nghiệp vụ E2E hoàn chỉnh.\n"
            "• Đóng gói Docker Compose và triển khai thử nghiệm trên Production Cloud (Render/AWS)."
        ),
        "P6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Phê duyệt bảo vệ khóa luận: supervisor đề nghị, CNBM xem xét và phê duyệt.\n"
            "• Thẩm định danh sách thành viên đủ điều kiện bảo vệ."
        ),
        "Q6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Chuẩn bị Slide thuyết trình bảo vệ trước Hội đồng.\n"
            "• Diễn tập bảo vệ khóa luận (Mock Defense) & Tiếp thu góp ý của GVHD."
        ),
    }

    for cell_id, text in s1_weeks.items():
        cell = ws1[cell_id]
        cell.value = text
        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        cell.border = border_thin
        
        if cell_id == "F6":
            cell.font = Font(name=font_family_s1, size=9.5, bold=True, color="92400E")
            cell.fill = fill_week3
        elif cell_id in ["D6", "E6"]:
            cell.font = Font(name=font_family_s1, size=9.5, color="065F46")
            cell.fill = fill_done
        else:
            cell.font = Font(name=font_family_s1, size=9.5, color="475467")
            cell.fill = fill_plan

    ws1.row_dimensions[6].height = 290
    ws1.column_dimensions['A'].width = 14
    ws1.column_dimensions['B'].width = 42
    ws1.column_dimensions['C'].width = 24
    ws1.column_dimensions['D'].width = 38
    ws1.column_dimensions['E'].width = 38
    ws1.column_dimensions['F'].width = 42
    for c_idx in range(7, 18):
        ws1.column_dimensions[get_column_letter(c_idx)].width = 32

    # ==========================================
    # 2. SHEET 2: BÁO CÁO CHI TIẾT 5 THÀNH VIÊN
    # ==========================================
    ws2 = wb['Sheet2']
    
    ws2['B2'] = "FA26SE032"
    ws2['B2'].font = Font(name=font_family_s2, size=12, bold=True, color="1B365D")
    
    ws2['B3'] = "SCANMS (Sales Collaborator and Affiliate Network Management System) - Hệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng và Mạng lưới Tiếp thị Liên kết Đa Gian Hàng"
    ws2['B3'].font = Font(name=font_family_s2, size=11, bold=True, color="1A1612")

    members = [
        {
            "mssv": "SE184251",
            "name": "Nguyễn Thành Thắng (Leader)",
            "tasks": [
                "Kiến trúc SAD, CSDL 21 bảng 3NF, Base Monorepo NestJS + React Vite",
                "Phân hệ IAM đa vai trò (Argon2id, JWT, 2FA OTP, Google Auth, RBAC)",
                "Quản lý Gian hàng, Sản phẩm, Biến thể & Phân tách SYSTEM_MANAGER vs ADMIN",
                "Nghiệp vụ Escrow 14 ngày, Quyết toán ví CTV 0đ phí NH, Tái thiết kế UI Vàng Be"
            ],
            "w1": "✅ Hoàn thành 100% đề cương, kiến trúc CSDL 21 bảng, Base monorepo, Docker Compose.",
            "w2": "✅ Hoàn thành 100% FR-01 → FR-08 (IAM, Quản trị Store, Danh mục Sản phẩm & Media Hub).",
            "w3": "⭐ Hoàn thành 100% phân tách SYSTEM_MANAGER vs ADMIN, Tái thiết kế LoginPage Vàng Be, Escrow 14 ngày & Quyết toán ví CTV, Merge origin/main 0 conflict, Build FE (1.01s) & BE 100% không lỗi.",
            "w4_14": {
                "w4": "⏳ Socket.io Chat realtime đa kênh KOL ⇄ Shop & Động cơ AI Gợi ý KOL.",
                "w5": "⏳ Bảng vinh danh Leaderboard Gamification & Doanh số Realtime qua Recharts.",
                "w6": "⏳ Kiểm thử tích hợp E2E toàn diện 32 FRs qua Postman/Newman.",
                "w7": "⏳ Kiểm thử bảo mật Pentest, OWASP Top 10, SQLi, XSS, CSRF, Rate Limiting.",
                "w8": "⏳ Triển khai UAT với KOL và Shop đối tác Sora Skin thực tế.",
                "w9": "⏳ Kiểm thử tải trọng k6 1.000 req/s, tối ưu Indexing DB & Redis Caching.",
                "w10": "⏳ Hoàn thiện phản hồi UAT & Soạn thảo User Manual 5 vai trò.",
                "w11": "⏳ Viết toàn văn Báo cáo Đồ án Khóa luận Tốt nghiệp.",
                "w12": "⏳ Quay video demo E2E hoàn chỉnh & Đóng gói Docker Production.",
                "w13": "⏳ Supervisor đề nghị & Phê duyệt bảo vệ khóa luận.",
                "w14": "⏳ Diễn tập Mock Defense & Bảo vệ chính thức trước Hội đồng."
            }
        },
        {
            "mssv": "SE180104",
            "name": "Nguyễn Đình Tuấn",
            "tasks": [
                "Động cơ Tracking Smart Link & Dynamic QR Code canvas 512x512",
                "Cơ chế phân bổ Last-Click Attribution & Lưu cookie tiếp thị 30 ngày",
                "Thuật toán Redis Sliding Window Rate Limit chống gian lận click spam/bot",
                "Giao diện Sàn Shopee-style, Search Zoom Modal & Sơ đồ Use Case Bill OTP"
            ],
            "w1": "✅ Nghiên cứu thuật toán Last-Click 30 ngày và thư viện tạo mã QR Canvas.",
            "w2": "✅ Hoàn thành FR-09 → FR-14 (Tracking link, QR Code PNG, Coupon engine, Redis Rate Limit).",
            "w3": "⭐ Hoàn thành tích hợp sơ đồ Use Case Bill OTP (drawio), Search Zoom modal và Header công khai (PR #50, #51).",
            "w4_14": {
                "w4": "⏳ Tối ưu giao diện tạo link tiếp thị nhanh từ extension/bookmarklet.",
                "w5": "⏳ Biểu đồ phân tích lượt click và tỷ lệ chuyển đổi theo kênh MXH.",
                "w6": "⏳ Kiểm thử E2E luồng quét QR -> Ghi nhận cookie -> Tạo đơn hàng.",
                "w7": "⏳ Thử nghiệm tấn công brute-force click traffic để kiểm tra Redis Rate Limit.",
                "w8": "⏳ Hỗ trợ người dùng UAT thử nghiệm tính năng tạo link và quét mã QR.",
                "w9": "⏳ Tối ưu hóa tốc độ redirect link rút gọn qua Redis cache < 50ms.",
                "w10": "⏳ Soạn thảo tài liệu hướng dẫn tạo link và QR cho KOL.",
                "w11": "⏳ Viết phần Báo cáo Đồ án về Phân hệ Tracking Tiếp thị.",
                "w12": "⏳ Chuẩn bị kịch bản demo tính năng quét QR và tracking chuyển đổi.",
                "w13": "⏳ Hoàn thiện hồ sơ nghiệm thu kỹ thuật phân hệ Tracking.",
                "w14": "⏳ Trình bày slide phần Tracking & QR Code trước Hội đồng."
            }
        },
        {
            "mssv": "SE180104",
            "name": "Nguyễn Phú Quý",
            "tasks": [
                "Động cơ AI Fraud Sentinel phát hiện gian lận traffic bất thường",
                "Chuỗi an ninh kiểm toán Audit Logs bất biến (mã băm SHA-256)",
                "Trợ lý AI Gợi ý KOL phù hợp với danh mục sản phẩm (Recommendation)",
                "Xây dựng và kiểm thử 16/16 Integration & E2E Test suites an ninh mạng"
            ],
            "w1": "✅ Nghiên cứu mô hình phát hiện gian lận traffic (IP spoofing, bot traffic).",
            "w2": "✅ Hoàn thành FR-31 (AI Fraud Sentinel) & FR-32 (Audit Logs) kèm 16/16 E2E test suites (PR #41).",
            "w3": "⭐ Duy trì kiểm thử bảo mật cho luồng phân tách SYSTEM_MANAGER, rà soát nhật ký audit log cho luồng phê duyệt KYC.",
            "w4_14": {
                "w4": "⏳ Huấn luyện thuật toán AI Recommendation gợi ý KOL theo độ tương đồng sản phẩm.",
                "w5": "⏳ Bảng cảnh báo rủi ro gian lận Realtime trên Dashboard Admin.",
                "w6": "⏳ Viết kịch bản kiểm thử tự động cho động cơ AI Fraud Sentinel.",
                "w7": "⏳ Rà soát an ninh chuỗi khối hash SHA-256 chống giả mạo nhật ký giao dịch.",
                "w8": "⏳ Thu thập đánh giá từ Admin và Shop về độ chính xác của AI Recommendation.",
                "w9": "⏳ Tối ưu hóa thời gian phản hồi của mô hình AI < 200ms.",
                "w10": "⏳ Hoàn thiện tài liệu kiến trúc AI Sentinel và Audit Logs.",
                "w11": "⏳ Viết phần Báo cáo Đồ án về Ứng dụng Trí tuệ Nhân tạo & Bảo mật Audit Trail.",
                "w12": "⏳ Demo kịch bản phát hiện và ngăn chặn gian lận traffic thời gian thực.",
                "w13": "⏳ Đóng gói mô hình AI và tài liệu nghiệm thu bảo mật.",
                "w14": "⏳ Trình bày slide giải pháp AI và Bảo mật trước Hội đồng."
            }
        },
        {
            "mssv": "SE184527",
            "name": "Phan Xuân Thịnh",
            "tasks": [
                "Phân hệ Ví điện tử CTV, quản lý số dư khả dụng, tạm giữ và đóng băng",
                "Lịch sử giao dịch tài chính, biến động số dư và khấu trừ hoàn trả",
                "Quy trình giải ngân hàng loạt Batch Payout xuất file VietQR Napas247 XLSX",
                "Khấu trừ thuế TNCN 10% tự động theo quy định cho lệnh >= 2 triệu VNĐ"
            ],
            "w1": "✅ Thiết kế sơ đồ luồng tài chính và cấu trúc bảng ví tiền, giao dịch.",
            "w2": "✅ Hoàn thành cấu hình API ví tiền, nạp rút và xem lịch sử giao dịch (FR-21, FR-22).",
            "w3": "⭐ Hoàn thành cơ chế quyết toán hoa hồng sau 14 ngày Escrow, module khấu trừ thuế TNCN 10% và xuất file Batch Payout VietQR XLSX (FR-23, FR-24).",
            "w4_14": {
                "w4": "⏳ Tích hợp cổng tra cứu mã giao dịch ngân hàng VietQR tự động.",
                "w5": "⏳ Báo cáo tổng hợp số liệu thuế TNCN định kỳ gửi cơ quan thuế.",
                "w6": "⏳ Kiểm thử tích hợp luồng rút tiền -> Duyệt lệnh -> Xuất file Batch Payout.",
                "w7": "⏳ Kiểm thử an toàn số dư ví (chống race-condition, double spending).",
                "w8": "⏳ Kiểm thử UAT tính năng rút tiền và kiểm tra sao kê tài chính.",
                "w9": "⏳ Tối ưu hóa truy vấn bảng giao dịch và lịch sử biến động số dư.",
                "w10": "⏳ Soạn thảo tài liệu quy trình đối soát và chi trả hoa hồng.",
                "w11": "⏳ Viết phần Báo cáo Đồ án về Phân hệ Quản trị Tài chính & Chi trả.",
                "w12": "⏳ Quay video demo quy trình đối soát và xuất file VietQR thanh toán.",
                "w13": "⏳ Kiểm tra tính chính xác của sổ cái tài chính trước bảo vệ.",
                "w14": "⏳ Trình bày slide phần Quản trị Tài chính & Đối soát hoa hồng trước Hội đồng."
            }
        },
        {
            "mssv": "SE172768",
            "name": "Trần Văn Nhật",
            "tasks": [
                "Kho tài nguyên số tập trung Media Hub (banner, video review, copywriting)",
                "Quản lý liên kết tài khoản Mạng xã hội KOL (TikTok, Facebook, YouTube, IG)",
                "Hệ thống Chat trao đổi trực tiếp giữa KOL và Shop qua Socket.io realtime",
                "Quy trình 4 bước gửi và phê duyệt sản phẩm dùng thử (Sample Request)"
            ],
            "w1": "✅ Thiết kế cấu trúc lưu trữ Media Hub và phân loại tài nguyên quảng bá.",
            "w2": "✅ Hoàn thành FR-07 (Media Hub) và FR-08 (Kênh mạng xã hội KOL).",
            "w3": "⭐ Hoàn thiện luồng liên hệ trực tiếp Shop trên Marketplace và chuẩn bị hạ tầng Socket.io cho đàm phán deal hoa hồng độc quyền.",
            "w4_14": {
                "w4": "⏳ Hoàn thiện UI/UX hộp chat realtime và tính năng đính kèm link sản phẩm.",
                "w5": "⏳ Quy trình quản lý gửi hàng mẫu (Sample Product) và xác nhận đã nhận hàng.",
                "w6": "⏳ Kiểm thử kết nối WebSocket đồng thời 500 người dùng chat realtime.",
                "w7": "⏳ Kiểm tra phân quyền truy cập file Media Hub và bảo vệ bản quyền ảnh/video.",
                "w8": "⏳ Kiểm thử UAT tính năng chat thương lượng giữa Shop và KOL.",
                "w9": "⏳ Tối ưu hóa CDN tải ảnh/video trên Media Hub.",
                "w10": "⏳ Soạn thảo hướng dẫn sử dụng Media Hub và Chat cho Shop & KOL.",
                "w11": "⏳ Viết phần Báo cáo Đồ án về Kho Nội Dung Số & Hệ thống Giao tiếp.",
                "w12": "⏳ Chuẩn bị kịch bản demo luồng chat đàm phán và gửi hàng mẫu.",
                "w13": "⏳ Hoàn thiện toàn bộ tài liệu kiểm thử phân hệ Media & Chat.",
                "w14": "⏳ Trình bày slide phần Media Hub & Chat Realtime trước Hội đồng."
            }
        }
    ]

    for idx, m in enumerate(members):
        row = 6 + idx
        ws2.row_dimensions[row].height = 140

        ws2.cell(row=row, column=1, value=m["mssv"]).alignment = Alignment(horizontal="center", vertical="top")
        ws2.cell(row=row, column=1).font = Font(name=font_family_s2, size=10, bold=True, color="1B365D")
        ws2.cell(row=row, column=1).border = border_thin

        ws2.cell(row=row, column=2, value=m["name"]).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        ws2.cell(row=row, column=2).font = Font(name=font_family_s2, size=10, bold=True, color="1A1612")
        ws2.cell(row=row, column=2).border = border_thin

        # Tasks 1 to 4
        for t_idx in range(4):
            c_task = ws2.cell(row=row, column=3 + t_idx, value=m["tasks"][t_idx])
            c_task.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_task.font = Font(name=font_family_s2, size=9.5, color="1A1612")
            c_task.border = border_thin

        # Tuần 1 (Col 7 / G)
        c_w1 = ws2.cell(row=row, column=7, value=m["w1"])
        c_w1.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        c_w1.font = Font(name=font_family_s2, size=9, color="065F46")
        c_w1.fill = fill_done
        c_w1.border = border_thin

        # Tuần 2 (Col 8 / H)
        c_w2 = ws2.cell(row=row, column=8, value=m["w2"])
        c_w2.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        c_w2.font = Font(name=font_family_s2, size=9, color="065F46")
        c_w2.fill = fill_done
        c_w2.border = border_thin

        # Tuần 3 (Col 9 / I) - HIGHLIGHT CURRENT WEEK
        c_w3 = ws2.cell(row=row, column=9, value=m["w3"])
        c_w3.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        c_w3.font = Font(name=font_family_s2, size=9, bold=True, color="92400E")
        c_w3.fill = fill_week3
        c_w3.border = border_thin

        # Tuần 4 to 14 (Col 10 to 20 / J to T)
        for w_num in range(4, 15):
            col = 6 + w_num
            c_plan = ws2.cell(row=row, column=col, value=m["w4_14"][f"w{w_num}"])
            c_plan.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            c_plan.font = Font(name=font_family_s2, size=9, color="475467")
            c_plan.fill = fill_plan
            c_plan.border = border_thin

    # Adjust widths for Sheet2
    ws2.column_dimensions['A'].width = 15
    ws2.column_dimensions['B'].width = 24
    ws2.column_dimensions['C'].width = 28
    ws2.column_dimensions['D'].width = 28
    ws2.column_dimensions['E'].width = 28
    ws2.column_dimensions['F'].width = 28
    ws2.column_dimensions['G'].width = 32
    ws2.column_dimensions['H'].width = 32
    ws2.column_dimensions['I'].width = 38
    for col_i in range(10, 21):
        ws2.column_dimensions[get_column_letter(col_i)].width = 28

    wb.save(file_path)
    print(f"Successfully updated official template: {file_path}")

if __name__ == "__main__":
    fill_official_capstone_excel()
