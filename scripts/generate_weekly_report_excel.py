import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_progress_report():
    wb = openpyxl.Workbook()
    
    # Define color palette (Professional Corporate Warm Gold & Navy)
    navy_dark = "1B365D"
    gold_brand = "C59B58"
    gold_soft = "FBF5EB"
    gold_border = "EEDFC6"
    sand_bg = "FAF8F5"
    gray_header = "F2F4F7"
    text_dark = "1A1612"
    
    border_thin = Border(
        left=Side(style='thin', color='D0D5DD'),
        right=Side(style='thin', color='D0D5DD'),
        top=Side(style='thin', color='D0D5DD'),
        bottom=Side(style='thin', color='D0D5DD')
    )
    
    border_header = Border(
        left=Side(style='thin', color='FFFFFF'),
        right=Side(style='thin', color='FFFFFF'),
        top=Side(style='medium', color='1B365D'),
        bottom=Side(style='medium', color='1B365D')
    )

    # ==========================================
    # SHEET 1: BÁO CÁO TIẾN ĐỘ CHUẨN FORM GIẢNG VIÊN
    # ==========================================
    ws1 = wb.active
    ws1.title = "Tien_Do_Khoa_Luan_Tuan_3"
    ws1.views.sheetView[0].showGridLines = True

    # Title & Metadata
    ws1['A1'] = "Giảng viên:"
    ws1['A1'].font = Font(name="Calibri", size=11, bold=True, color=text_dark)
    ws1['B1'] = "ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn)"
    ws1['B1'].font = Font(name="Calibri", size=11, bold=False, color=navy_dark)

    ws1['A2'] = "Bộ môn:"
    ws1['A2'].font = Font(name="Calibri", size=11, bold=True, color=text_dark)
    ws1['B2'] = "Kỹ thuật phần mềm (Software Engineering - SE)"
    ws1['B2'].font = Font(name="Calibri", size=11, bold=False, color=navy_dark)

    ws1['A3'] = "Thời điểm báo cáo:"
    ws1['A3'].font = Font(name="Calibri", size=11, bold=True, color=text_dark)
    ws1['B3'] = "Tuần 3 / 14 (Học kỳ Spring 2026 - Dự án SCANMS)"
    ws1['B3'].font = Font(name="Calibri", size=11, italic=True, color="475467")

    # Table Header at Row 5 and 6
    # Headers: Code | Topic | Lịch hẹn SV (giờ-ngày trong tuần) | Tiến độ thực hiện (Tuần 1 -> Tuần 14)
    ws1.merge_cells("A5:A6")
    ws1['A5'] = "Code"
    ws1.merge_cells("B5:B6")
    ws1['B5'] = "Topic"
    ws1.merge_cells("C5:C6")
    ws1['C5'] = "Lịch hẹn SV\n(giờ-ngày trong tuần)"
    
    ws1.merge_cells("D5:Q5")
    ws1['D5'] = "Tiến độ thực hiện (14 Tuần Khóa Luận)"

    week_labels = [f"Tuần {i}" for i in range(1, 15)]
    for idx, w_name in enumerate(week_labels):
        col_letter = get_column_letter(4 + idx)
        cell = ws1[f"{col_letter}6"]
        cell.value = w_name

    # Header styling
    header_fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    header_fill_weeks = PatternFill(start_color="24406B", end_color="24406B", fill_type="solid")
    
    for row in range(5, 7):
        for col in range(1, 18):
            cell = ws1.cell(row=row, column=col)
            cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border_header
            if col <= 3 or row == 5:
                cell.fill = header_fill
            else:
                cell.fill = header_fill_weeks

    # Data Row (Row 7)
    ws1['A7'] = "FA26SE032"
    ws1['B7'] = "SCANMS\n(Sales Collaborator and Affiliate Network Management System)\n\nHệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng và Mạng lưới Tiếp thị Liên kết Đa Gian Hàng"
    ws1['C7'] = "09:00 - Thứ 4 hàng tuần\n(Trực tuyến Google Meet / Trực tiếp tại Phòng Lab)"

    # Weekly Progress Details
    weeks_content = {
        "Tuần 1": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Phê duyệt KH chi tiết thực hiện khóa luận, supervisor phê duyệt.\n"
            "• Thiết kế kiến trúc SAD, đặc tả SRS, tài liệu bảo mật Gitignore.\n"
            "• Thiết kế CSDL Master 21 bảng 3NF (PostgreSQL) & kịch bản gieo mầm seed data.\n"
            "• Khởi tạo Base Monorepo NestJS + React Vite + Docker Multi-Container."
        ),
        "Tuần 2": (
            "✅ [HOÀN THÀNH 100%]\n"
            "• Hoàn thiện FR-01 → FR-08 (IAM, Bảo mật Argon2id/JWT/Bcrypt/OTP, Quản lý Gian hàng, Sản phẩm & Media Hub).\n"
            "• Hoàn thiện FR-09 → FR-16 (Dynamic Smart Link, Dynamic QR Code canvas 512x512, Last-Click Cookie 30 ngày, Redis Sliding Window chống click tặc, Đặt hàng khách vãng lai).\n"
            "• Hoàn thiện FR-31 & FR-32 (AI Fraud Sentinel phát hiện gian lận traffic, Hệ thống Audit Logs an ninh bất biến 16/16 test suites pass)."
        ),
        "Tuần 3": (
            "⭐ [ĐANG BÁO CÁO - HOÀN THÀNH XUẤT SẮC 100%]\n"
            "1. Phân hệ Tài chính, Đơn hàng & Hoa hồng (FR-17 → FR-24):\n"
            "   - Xử lý đơn hàng đa trạng thái, giữ tiền Escrow 14 ngày bảo đảm chính sách đổi trả.\n"
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
        "Tuần 4": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện FR-25 → FR-30:\n"
            "  - Socket.io Chat realtime đa kênh giữa KOL và Chủ Gian hàng.\n"
            "  - Quy trình gửi & duyệt mẫu thử sản phẩm (Sample Request).\n"
            "  - Động cơ AI Gợi ý KOL phù hợp với từng danh mục sản phẩm của Shop."
        ),
        "Tuần 5": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện Bảng vinh danh Top KOL (Leaderboard Gamification).\n"
            "• Báo cáo tài chính & Biểu đồ Doanh số Realtime qua Recharts.\n"
            "• Phân tích phễu chuyển đổi (Traffic -> Click -> Lead -> Order -> Paid)."
        ),
        "Tuần 6": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tích hợp hệ thống toàn diện E2E (End-to-End Testing) bao phủ toàn bộ 32 yêu cầu chức năng (FR-01 → FR-32).\n"
            "• Tối ưu hóa phản hồi API qua Postman/Newman automation test."
        ),
        "Tuần 7": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử an toàn thông tin & bảo mật (Pentest, OWASP Top 10, SQLi, XSS, CSRF, Rate Limiting & Brute Force Prevention).\n"
            "• Rà soát các tiêu chuẩn mã hóa mật khẩu và token."
        ),
        "Tuần 8": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Triển khai thử nghiệm UAT (User Acceptance Testing) với người dùng thật (KOL và Chủ gian hàng đối tác D2C Sora Skin).\n"
            "• Ghi nhận phản hồi trải nghiệm thực tế."
        ),
        "Tuần 9": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Kiểm thử tải trọng và hiệu năng (Load Testing k6/Artillery 1.000 req/s).\n"
            "• Tối ưu hóa Database Indexing và cơ chế đệm Redis Caching."
        ),
        "Tuần 10": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện các điều chỉnh phản hồi sau UAT.\n"
            "• Soạn thảo Hướng dẫn sử dụng chi tiết (User Manual) cho 5 vai trò."
        ),
        "Tuần 11": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Hoàn thiện toàn văn Báo cáo Đồ án Khóa luận Tốt nghiệp (Final Capstone Thesis Report) theo quy chuẩn FPT University."
        ),
        "Tuần 12": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Quay video demo kịch bản nghiệp vụ E2E hoàn chỉnh.\n"
            "• Đóng gói Docker Compose và triển khai thử nghiệm trên Production Cloud (Render/AWS)."
        ),
        "Tuần 13": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Phê duyệt bảo vệ khóa luận: supervisor đề nghị, CNBM xem xét và phê duyệt.\n"
            "• Thẩm định danh sách thành viên đủ điều kiện bảo vệ."
        ),
        "Tuần 14": (
            "⏳ [KẾ HOẠCH DỰ KIẾN]\n"
            "• Chuẩn bị Slide thuyết trình bảo vệ trước Hội đồng.\n"
            "• Diễn tập bảo vệ khóa luận (Mock Defense) & Tiếp thu góp ý của GVHD."
        ),
    }

    for idx, (w_key, w_val) in enumerate(weeks_content.items()):
        col_letter = get_column_letter(4 + idx)
        cell = ws1[f"{col_letter}7"]
        cell.value = w_val
        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        cell.font = Font(name="Calibri", size=9.5, color=text_dark)
        cell.border = border_thin
        
        # Highlight week 3
        if w_key == "Tuần 3":
            cell.fill = PatternFill(start_color="FFF8ED", end_color="FFF8ED", fill_type="solid")
            cell.font = Font(name="Calibri", size=9.5, bold=True, color="92400E")
        elif w_key in ["Tuần 1", "Tuần 2"]:
            cell.fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
        else:
            cell.fill = PatternFill(start_color="FCFCFD", end_color="FCFCFD", fill_type="solid")

    # Format Code, Topic, Schedule cells
    for col_let in ["A", "B", "C"]:
        c = ws1[f"{col_let}7"]
        c.font = Font(name="Calibri", size=10, bold=(col_let == "A"), color=text_dark)
        c.alignment = Alignment(horizontal="center" if col_let != "B" else "left", vertical="top", wrap_text=True)
        c.border = border_thin
        c.fill = PatternFill(start_color="FAFAFA", end_color="FAFAFA", fill_type="solid")

    ws1.row_dimensions[7].height = 240

    # Notes section at bottom (matching user's template note)
    row_note_start = 9
    ws1[f"A{row_note_start}"] = "Ghi chú theo quy định của Khoa & Bộ môn:"
    ws1[f"A{row_note_start}"].font = Font(name="Calibri", size=10, bold=True, color=navy_dark)
    
    notes = [
        ("Tuần 1:", "Phê duyệt KH chi tiết thực hiện khóa luận, supervisor phê duyệt (Đã hoàn thành đề cương & kiến trúc CSDL)."),
        ("Tuần 3:", "Báo cáo tiến độ hoàn thiện Core IAM, Tracking Tiếp thị, Cơ chế Đơn hàng Escrow 14 ngày & Hệ thống UI Vàng Be."),
        ("Tuần 13:", "Phê duyệt bảo vệ khóa luận: supervisor đề nghị, CNBM xem xét và phê duyệt:"),
        ("", "  - Fail: toàn bộ nhóm"),
        ("", "  - OK: với danh sách SV (có thể có SV không được bảo vệ)")
    ]

    for offset, (lbl, desc) in enumerate(notes):
        curr_row = row_note_start + 1 + offset
        ws1[f"A{curr_row}"] = lbl
        ws1[f"A{curr_row}"].font = Font(name="Calibri", size=9.5, bold=True, color="B88E4F" if lbl else text_dark)
        ws1[f"B{curr_row}"] = desc
        ws1[f"B{curr_row}"].font = Font(name="Calibri", size=9.5, color=text_dark)

    # Column widths
    ws1.column_dimensions['A'].width = 14
    ws1.column_dimensions['B'].width = 34
    ws1.column_dimensions['C'].width = 24
    for idx in range(1, 15):
        col_letter = get_column_letter(3 + idx)
        # Give more width to week 1, 2, 3
        if idx in [1, 2, 3]:
            ws1.column_dimensions[col_letter].width = 38
        else:
            ws1.column_dimensions[col_letter].width = 30

    # ==========================================
    # SHEET 2: CHI TIẾT TUẦN 3 VÀ LỊCH SỬ GIT COMMIT
    # ==========================================
    ws2 = wb.create_sheet(title="Chi_Tiet_Tuan_3_Git_Log")
    ws2.views.sheetView[0].showGridLines = True

    ws2['A1'] = "BẢNG ĐỐI SOÁT CHI TIẾT TIẾN ĐỘ TUẦN 3 & ÁNH XẠ GIT COMMIT TRÊN GITHUB"
    ws2['A1'].font = Font(name="Calibri", size=14, bold=True, color=navy_dark)
    ws2['A2'] = "Dự án: SCANMS (FA26SE032) | Trưởng nhóm: Nguyễn Thành Thắng | Repository: thang-nt25/SCANMS-project-capstone-fall26"
    ws2['A2'].font = Font(name="Calibri", size=10, italic=True, color="475467")

    headers_s2 = [
        "STT", "Thành viên", "Nhánh Git", "Mã FR", "Chức năng thực hiện", 
        "Màn hình UI / Component", "API Endpoint", "Code Backend / Method", "Bảng CSDL", "Trạng thái", "Commit Hash / PR"
    ]
    
    ws2.row_dimensions[4].height = 28
    for col_idx, h_text in enumerate(headers_s2, start=1):
        cell = ws2.cell(row=4, column=col_idx, value=h_text)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border_header

    tuan3_data = [
        (
            1, "Nguyễn Thành Thắng (Leader)", "thang", "FR-02, FR-04", 
            "Phân tách vai trò SYSTEM_MANAGER vs SYSTEM_ADMIN",
            "frontend/src/components/layout/Sidebar.tsx\nfrontend/src/config/navigation.config.ts",
            "POST /api/v1/auth/login\nGET /api/v1/users/me",
            "backend/src/modules/auth/auth.service.ts -> autoCreateManagerUser()",
            "users, user_roles", "COMPLETED 100%", "f9c2bba"
        ),
        (
            2, "Nguyễn Thành Thắng (Leader)", "thang", "UI-UX, FR-01, FR-02", 
            "Tái thiết kế trang Đăng nhập Vàng Be cao cấp, tích hợp 5 role test nhanh không cắt chữ",
            "frontend/src/pages/auth/LoginPage.tsx",
            "POST /api/v1/auth/login\nPOST /api/v1/auth/google",
            "frontend/src/services/auth.service.ts -> login()",
            "users", "COMPLETED 100%", "f9c2bba"
        ),
        (
            3, "Nguyễn Thành Thắng (Leader)", "thang", "FR-17, FR-18, FR-20", 
            "Cơ chế Escrow bảo chứng 14 ngày & giải phóng hoa hồng vào ví CTV nội bộ (0đ phí NH)",
            "frontend/src/pages/orders/OrdersManagementPage.tsx",
            "POST /api/v1/orders/:id/escrow-release",
            "backend/src/modules/orders/orders.service.ts\nbackend/src/modules/commissions/",
            "orders, commissions, wallets, transactions", "COMPLETED 100%", "PR #48, #49"
        ),
        (
            4, "Nguyễn Thành Thắng (Leader)", "thang", "FR-23, FR-24", 
            "Quy trình Batch Payout xuất file VietQR Napas247 XLSX & Khấu trừ thuế TNCN 10%",
            "frontend/src/pages/admin/PayoutApprovalPage.tsx",
            "POST /api/v1/payouts/batch-export\nGET /api/v1/payouts/pending",
            "backend/src/modules/payouts/payout-batches.service.ts -> exportVietQrExcel()",
            "payout_requests, tax_deductions", "COMPLETED 100%", "PR #46, #47"
        ),
        (
            5, "Nguyễn Đình Tuấn", "tuan", "FR-10, FR-11, FR-16", 
            "Tích hợp Sơ đồ Use Case Bill OTP, cập nhật Search Zoom Modal và Header công khai",
            "frontend/src/pages/public/SearchPage.tsx\nfrontend/src/components/layout/PublicHeader.tsx\ndocs/*.drawio",
            "GET /api/v1/products/search\nPOST /api/v1/orders/guest-checkout",
            "frontend/src/services/product.service.ts",
            "products, orders", "COMPLETED 100%", "70228ff, 7c42039\nPR #50, #51"
        ),
        (
            6, "Nguyễn Phú Quý", "quy", "FR-31, FR-32", 
            "Kiểm thử bảo mật AI Fraud Sentinel & Chuỗi Audit Log bất biến (16/16 E2E Tests)",
            "frontend/src/pages/admin/AiFraudSentinelPage.tsx\nfrontend/src/pages/admin/AuditLogsPage.tsx",
            "GET /api/v1/admin/fraud-alerts\nGET /api/v1/admin/audit-logs",
            "backend/src/modules/fraud-sentinel/\nbackend/src/modules/audit-logs/",
            "fraud_logs, audit_logs", "COMPLETED 100%", "PR #41 (quy)"
        ),
        (
            7, "Phan Xuân Thịnh", "thinh", "FR-21, FR-22", 
            "Ví tiền CTV, Lịch sử biến động số dư và Khấu trừ hoàn trả khi đơn hủy",
            "frontend/src/pages/collaborator/WalletPage.tsx",
            "GET /api/v1/wallets/my-balance\nGET /api/v1/wallets/transactions",
            "backend/src/modules/wallets/wallets.service.ts",
            "wallets, balance_histories", "COMPLETED 100%", "PR #44, #45"
        )
    ]

    for row_idx, item in enumerate(tuan3_data, start=5):
        ws2.row_dimensions[row_idx].height = 42
        for col_idx, val in enumerate(item, start=1):
            cell = ws2.cell(row=row_idx, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=9.5, color=text_dark)
            cell.border = border_thin
            cell.alignment = Alignment(
                horizontal="center" if col_idx in [1, 3, 10, 11] else "left",
                vertical="center",
                wrap_text=True
            )
            if col_idx == 10:
                cell.fill = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")
                cell.font = Font(name="Calibri", size=9.5, bold=True, color="047857")

    widths_s2 = [6, 22, 12, 16, 32, 34, 28, 35, 20, 16, 18]
    for col_idx, w in enumerate(widths_s2, start=1):
        ws2.column_dimensions[get_column_letter(col_idx)].width = w

    # ==========================================
    # SHEET 3: THÔNG TIN THÀNH VIÊN VÀ ĐỀ TÀI
    # ==========================================
    ws3 = wb.create_sheet(title="Thong_Tin_Nhom_FA26SE032")
    ws3.views.sheetView[0].showGridLines = True

    ws3['A1'] = "THÔNG TIN HỘI ĐỒNG, ĐỀ TÀI VÀ THÀNH VIÊN DỰ ÁN CAPSTONE"
    ws3['A1'].font = Font(name="Calibri", size=14, bold=True, color=navy_dark)

    ws3['A3'] = "1. THÔNG TIN ĐỀ TÀI & GIẢNG VIÊN"
    ws3['A3'].font = Font(name="Calibri", size=11, bold=True, color=gold_brand)
    
    meta_info = [
        ("Mã đề tài:", "FA26SE032"),
        ("Tên đề tài tiếng Anh:", "Sales Collaborator and Affiliate Network Management System (SCANMS)"),
        ("Tên đề tài tiếng Việt:", "Hệ thống Quản lý Đội ngũ Cộng tác viên Bán hàng và Mạng lưới Tiếp thị Liên kết"),
        ("Bộ môn / Ngành:", "Kỹ thuật phần mềm (Software Engineering - SE) | Khóa Fall 2026"),
        ("Giảng viên Hướng dẫn (Supervisor):", "ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn - 0936.668.995)"),
        ("Lịch báo cáo & Hướng dẫn:", "09:00 Thứ 4 hàng tuần (Google Meet / Văn phòng Bộ môn SE)"),
        ("Môi trường mã nguồn:", "GitHub: https://github.com/thang-nt25/SCANMS-project-capstone-fall26.git (Nhánh: main, dev, thang)"),
    ]

    for offset, (lbl, val) in enumerate(meta_info):
        r = 4 + offset
        ws3[f"A{r}"] = lbl
        ws3[f"A{r}"].font = Font(name="Calibri", size=10, bold=True, color=text_dark)
        ws3[f"B{r}"] = val
        ws3[f"B{r}"].font = Font(name="Calibri", size=10, color=navy_dark if offset in [0, 4] else text_dark)

    ws3['A12'] = "2. DANH SÁCH SINH VIÊN THỰC HIỆN ĐỒ ÁN (NHÓM 4 THÀNH VIÊN CHÍNH THỨC)"
    ws3['A12'].font = Font(name="Calibri", size=11, bold=True, color=gold_brand)

    members_header = ["STT", "Họ và Tên", "MSSV", "Điện thoại", "Email FPT", "Vai trò trong Đồ án", "Phạm vi phân công chuyên trách"]
    ws3.row_dimensions[13].height = 26
    for c_idx, h_text in enumerate(members_header, start=1):
        cell = ws3.cell(row=13, column=c_idx, value=h_text)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_header

    members_data = [
        (1, "Nguyễn Thành Thắng", "SE184251", "0966823637", "Thangntse184251@fpt.edu.vn", "Trưởng nhóm (Leader)", "Kiến trúc hệ thống, Core IAM đa vai trò, Bảo mật Argon2id/JWT/OTP, Cơ chế Escrow 14 ngày, Cổng trọng tài phân xử tranh chấp & Thiết kế Design System Vàng Be."),
        (2, "Nguyễn Đình Tuấn", "SE180104", "0787664860", "tuanndse182540@fpt.edu.vn", "Thành viên (Member)", "Tiếp thị liên kết KOL/KOC, Phân cấp hoa hồng 2 tầng (Open vs Exclusive), Quy trình cấp hàng mẫu 4 bước, Voucher phiên Livestream & Phê duyệt Shop Onboarding (KYC) / Sản phẩm."),
        (3, "Nguyễn Phú Quý", "SE180104", "0766824448", "Quynpse180104@fpt.edu.vn", "Thành viên (Member)", "Phân hệ Chủ Gian Hàng (Merchant Operations), Quản lý tồn kho real-time & cảnh báo tồn <= 5, Shop chủ động hủy đơn & hoàn tiền, Bộ mô phỏng vận chuyển Shipping Simulator in phiếu A6 barcode, Tiếp nhận đổi trả phía Shop."),
        (4, "Phan Xuân Thịnh", "SE184527", "0945645753", "thinhpxse184527@fpt.edu.vn", "Thành viên (Member)", "Cổng Khách Hàng (Customer Portal), Giỏ hàng đồng bộ Database PostgreSQL, Quy trình gửi yêu cầu Đổi trả 14 ngày kèm video mở hộp, Ràng buộc đánh giá thật Review Gate (đơn COMPLETED), Kênh chat tư vấn Khách ⇄ Shop.")
    ]

    for r_idx, m in enumerate(members_data, start=14):
        ws3.row_dimensions[r_idx].height = 36
        for c_idx, val in enumerate(m, start=1):
            cell = ws3.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Calibri", size=9.5, color=text_dark)
            cell.border = border_thin
            cell.alignment = Alignment(
                horizontal="center" if c_idx in [1, 3, 4] else "left",
                vertical="center",
                wrap_text=True
            )
            if c_idx == 6 and "Leader" in str(val):
                cell.font = Font(name="Calibri", size=9.5, bold=True, color="B88E4F")

    widths_s3 = [6, 22, 12, 14, 28, 22, 50]
    for c_idx, w in enumerate(widths_s3, start=1):
        ws3.column_dimensions[get_column_letter(c_idx)].width = w

    # Save to Excel files
    output_path_docs = r"c:\HW\CAPSTONE\docs\BAO_CAO_TIEN_DO_TUAN_3_FA26SE032.xlsx"
    output_path_root = r"c:\HW\CAPSTONE\BAO_CAO_TIEN_DO_TUAN_3_FA26SE032.xlsx"
    
    wb.save(output_path_docs)
    wb.save(output_path_root)
    print(f"Generated successfully:\n- {output_path_docs}\n- {output_path_root}")

if __name__ == "__main__":
    create_progress_report()
