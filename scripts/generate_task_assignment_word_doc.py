import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_callout_box(doc, title, text, bg_hex="FFFBF2", border_hex="B88E4F"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(11)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(184, 142, 79)
    
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(26, 22, 18)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)

def generate_assignment_document():
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        header = section.header
        p_head = header.paragraphs[0]
        p_head.text = "SCANMS (FA26SE032) — KẾ HOẠCH & ĐẶC TẢ PHÂN CÔNG NHIỆM VỤ 4 THÀNH VIÊN"
        p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_head.style.font.name = "Calibri"
        p_head.style.font.size = Pt(8.5)
        p_head.style.font.color.rgb = RGBColor(125, 113, 94)

    color_navy = RGBColor(27, 54, 93)      # #1B365D - Dark Navy
    color_gold = RGBColor(184, 142, 79)    # #B88E4F - Brand Strong Gold
    color_ink = RGBColor(26, 22, 18)       # #1A1612 - Deep Ink Text
    color_muted = RGBColor(100, 116, 139)  # Slate Muted
    
    # ----------------------------------------------------
    # HEADER / TITLE
    # ----------------------------------------------------
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(3)
    run_tag = p_title.add_run("TRƯỜNG ĐẠI HỌC FPT — KHOA CÔNG NGHỆ THÔNG TIN\nĐỒ ÁN TỐT NGHIỆP KỸ SƯ PHẦN MỀM (CAPSTONE PROJECT - FALL 2026)\n")
    run_tag.font.name = "Calibri"
    run_tag.font.size = Pt(10.5)
    run_tag.font.bold = True
    run_tag.font.color.rgb = color_gold
    
    run_main_title = p_title.add_run("BẢN KẾ HOẠCH & ĐẶC TẢ PHÂN CÔNG NHIỆM VỤ NÂNG CẤP HỆ THỐNG SCANMS\nTHEO VAI TRÒ CHUYÊN TRÁCH VÀ NGHIỆP VỤ THƯƠNG MẠI ĐIỆN TỬ THỰC TẾ\n")
    run_main_title.font.name = "Calibri"
    run_main_title.font.size = Pt(15)
    run_main_title.font.bold = True
    run_main_title.font.color.rgb = color_navy

    # Subtitle Metadata
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(14)
    run_meta = p_meta.add_run(
        "Mã đề tài: FA26SE032 | Hệ thống: SCANMS (Sales Collaborator & Affiliate Network Management System)\n"
        "Nhóm 4 thành viên chính thức: Nguyễn Thành Thắng (Leader), Nguyễn Đình Tuấn, Nguyễn Phú Quý, Phan Xuân Thịnh\n"
        "Giảng viên Hướng dẫn: ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn)"
    )
    run_meta.font.name = "Calibri"
    run_meta.font.size = Pt(9.5)
    run_meta.font.italic = True
    run_meta.font.color.rgb = color_muted

    # Callout overview
    create_callout_box(
        doc,
        "ĐỊNH HƯỚNG CHIẾN LƯỢC & NGUYÊN TẮC PHÂN CÔNG ĐỘC LẬP - CÔNG BẰNG (4 THÀNH VIÊN)",
        "1. Bản chất hệ thống SCANMS: Đây là Sàn Thương Mại Điện Tử Tiếp Thị Liên Kết Đa Gian Hàng (Multi-Merchant & Affiliate Network). Khác với một website bán hàng của shop đơn lẻ, SCANMS kết nối hàng trăm Chủ Gian Hàng (Merchants), hàng ngàn Nhà Sáng Tạo (KOL/KOC) và hàng vạn Khách Mua Hàng trên một nền tảng quản trị an toàn, minh bạch.\n"
        "2. Nguyên tắc phân công nhiệm vụ: Nhóm chính thức gồm 4 thành viên. Mỗi thành viên chịu trách nhiệm độc lập 100% đối với một vai trò (Role) cốt lõi của hệ thống mà mình đã nghiên cứu sâu. Tuyệt đối không phân công chồng chéo, không giao việc chung chung hay ghép cặp phụ thuộc.\n"
        "3. Ngôn ngữ trình bày: Văn bản này được viết dưới góc độ Phân tích Nghiệp vụ Sản phẩm (Business Analysis & System Architecture) và Hành trình Người dùng (User Journey), diễn giải cặn kẽ 'Tại sao cần làm?', 'Giao diện tương tác ra sao?', 'Logic xử lý ngầm như thế nào?' và 'Giá trị bảo vệ đồ án ra sao?', giúp người đọc có chuyên môn hiểu thấu suốt bản chất hệ thống mà không cần đọc mã lệnh hay endpoint API thô ráp.",
        bg_hex="FFFBF2",
        border_hex="B88E4F"
    )

    # ----------------------------------------------------
    # PHẦN 1: BẢNG TỔNG HỢP MA TRẬN PHÂN CÔNG 4 THÀNH VIÊN
    # ----------------------------------------------------
    h1_1 = doc.add_paragraph()
    h1_1.paragraph_format.space_before = Pt(12)
    h1_1.paragraph_format.space_after = Pt(6)
    r_h1_1 = h1_1.add_run("1. BẢNG TỔNG HỢP MA TRẬN PHÂN CÔNG 4 THÀNH VIÊN ĐỘC LẬP")
    r_h1_1.font.name = "Calibri"
    r_h1_1.font.size = Pt(12.5)
    r_h1_1.font.bold = True
    r_h1_1.font.color.rgb = color_navy

    tbl_matrix = doc.add_table(rows=1, cols=5)
    tbl_matrix.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_matrix.autofit = False

    matrix_headers = ["STT", "Thành Viên Đảm Nhiệm", "Vai Trò Chuyên Trách", "Phân Hệ Nghiệp Vụ Sở Hữu", "Tóm Tắt Mục Tiêu & Trách Nhiệm Cốt Lõi"]
    matrix_widths = [Inches(0.5), Inches(1.5), Inches(1.4), Inches(1.6), Inches(2.2)]

    for idx, text in enumerate(matrix_headers):
        c = tbl_matrix.rows[0].cells[idx]
        c.text = text
        c.width = matrix_widths[idx]
        set_cell_background(c, "1B365D")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    matrix_data = [
        (
            "1", "Nguyễn Phú Quý\nMSSV: SE180104", "MERCHANT\n(Chủ Gian Hàng)", 
            "Quản Lý Kho Hàng, Vận Chuyển, Shop Hủy Đơn & Voucher Riêng",
            "• Quản lý tồn kho tức thời (Stock Deduction), tự động cảnh báo khi tồn kho chạm đáy (<= 5 sản phẩm), tự khóa nút mua khi hết hàng.\n"
            "• Cho phép Shop chủ động hủy đơn có chọn lý do -> Tự động hoàn tiền vào ví khách và hủy hoa hồng tạm giữ.\n"
            "• Xây dựng Shipping Simulator tự sinh mã vận đơn chuẩn TMĐT (GHN-XXXXX), in phiếu giao hàng A6 có mã vạch Barcode để đóng gói.\n"
            "• Màn hình Shop tiếp nhận và thẩm định yêu cầu đổi trả 14 ngày kèm video mở hộp của khách.\n"
            "• Hệ thống phát hành mã giảm giá (Voucher) riêng của từng Shop để kích cầu."
        ),
        (
            "2", "Nguyễn Đình Tuấn\nMSSV: SE180104", "KOL / KOC &\nSYSTEM_MANAGER", 
            "Mạng Lưới Tiếp Thị KOL & Kiểm Duyệt Sàn (Onboarding / Sản Phẩm)",
            "• Phân cấp hoa hồng tiếp thị 2 tầng: Mức cơ bản (Open Offer) tự lấy link vs Mức độc quyền (Exclusive Deal) đàm phán riêng với Shop qua Chat.\n"
            "• Quy trình xin cấp hàng mẫu 4 bước (Sample Request) có cam kết trả video review.\n"
            "• Phát hành mã giảm giá Livestream theo phiên với đồng hồ đếm ngược (Countdown Timer) tự hủy khi hết live.\n"
            "• Hàng đợi Admin kiểm duyệt hồ sơ Shop mới (KYC CCCD, MST, ĐKKD, STK ngân hàng).\n"
            "• Kiểm duyệt nội dung sản phẩm mới đăng tải (DRAFT -> APPROVED) trước khi mở bán."
        ),
        (
            "3", "Phan Xuân Thịnh\nMSSV: SE184527", "CUSTOMER\n(Khách Mua Hàng)", 
            "Cổng Khách Hàng, Giỏ Hàng Đồng Bộ, Quy Trình Đổi Trả & Đánh Giá",
            "• Giỏ hàng lưu trữ tập trung tại Cơ sở dữ liệu PostgreSQL, đồng bộ tức thời đa thiết bị (điện thoại, laptop không bị mất giỏ).\n"
            "• Quy trình gửi yêu cầu Đổi trả / Hoàn tiền 14 ngày (bắt buộc đính kèm ảnh và video mở hộp chống tráo hàng).\n"
            "• Ràng buộc đánh giá thật (Review Gate: Chỉ đơn hàng đã bấm 'Đã nhận hàng - COMPLETED' mới được mở quyền review 5 sao).\n"
            "• Hiển thị minh bạch chính sách bảo hành của Shop ngay tại trang chi tiết và trước checkout.\n"
            "• Kênh nhắn tin tư vấn trực tiếp Khách hàng ⇄ Chủ Shop (Live In-App Chat)."
        ),
        (
            "4", "Nguyễn Thành Thắng\nMSSV: SE184251\n(Trưởng Nhóm / Leader)", "SYSTEM_ADMIN &\nCORE SECURITY / IAM", 
            "Bảo Mật Bắt Buộc Login, Quên MK OTP, Quỹ Escrow & Cổng Trọng Tài",
            "• Khóa chặt 100% người mua phải đăng nhập tài khoản (xóa bỏ hoàn toàn khách vãng lai, tích hợp Google 1-Click 1.5s) để bảo vệ quyền lợi đổi trả.\n"
            "• Cơ chế Quên mật khẩu qua mã OTP Email và bảo mật xác minh khi đổi SĐT/Email giao hàng.\n"
            "• Cơ chế Quỹ bảo chứng Escrow 14 ngày & Tự động quyết toán hoa hồng vào ví CTV nội bộ (0đ phí ngân hàng nhờ hạch toán sổ cái).\n"
            "• Cổng phân xử Trọng tài Khiếu nại Đổi trả độc lập (Admin phán quyết khi Khách và Shop mâu thuẫn).\n"
            "• Trung tâm Thông báo toàn sàn thời gian thực (Notification Center chuông báo đa vai trò).\n"
            "• Động cơ AI Fraud Sentinel tự động phát hiện gian lận tự mua qua link của chính mình."
        )
    ]

    for r_idx, row_vals in enumerate(matrix_data):
        row = tbl_matrix.add_row()
        bg_c = "FAF8F5" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.width = matrix_widths[c_idx]
            set_cell_background(cell, bg_c)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 2] else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.line_spacing = 1.15
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9)
                r.font.color.rgb = color_ink
                if c_idx == 1:
                    r.font.bold = True
                    r.font.color.rgb = color_navy

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ----------------------------------------------------
    # PHẦN 2: CHI TIẾT ĐẶC TẢ TỪNG THÀNH VIÊN
    # ----------------------------------------------------
    h1_2 = doc.add_paragraph()
    h1_2.paragraph_format.space_before = Pt(14)
    h1_2.paragraph_format.space_after = Pt(4)
    r_h1_2 = h1_2.add_run("2. ĐẶC TẢ CHI TIẾT NHIỆM VỤ DƯỚI GÓC NHÌN NGHIỆP VỤ & SẢN PHẨM THỰC TẾ")
    r_h1_2.font.name = "Calibri"
    r_h1_2.font.size = Pt(12.5)
    r_h1_2.font.bold = True
    r_h1_2.font.color.rgb = color_navy

    intro_p2 = doc.add_paragraph()
    intro_p2.paragraph_format.space_after = Pt(10)
    r_intro_p2 = intro_p2.add_run(
        "Mỗi nhiệm vụ dưới đây được phân tích toàn diện theo 4 góc độ chuẩn kỹ thuật phần mềm:\n"
        "(1) Bối cảnh thực tế & Điểm đau nhức nhối (Pain Point) so sánh với Shopee / TikTok Shop;\n"
        "(2) Hành trình người dùng trên giao diện (UI/UX Journey & Steps);\n"
        "(3) Logic xử lý nghiệp vụ ngầm của hệ thống (Business & System Logic);\n"
        "(4) Giá trị học thuật và điểm nhấn bảo vệ đồ án trước Hội đồng chấm thi."
    )
    r_intro_p2.font.name = "Calibri"
    r_intro_p2.font.size = Pt(9.5)
    r_intro_p2.font.italic = True
    r_intro_p2.font.color.rgb = color_muted

    member_sections = [
        # ------------------- 2.1 QUÝ -------------------
        {
            "header": "2.1. NGUYỄN PHÚ QUÝ — PHÂN HỆ: CHỦ GIAN HÀNG (MERCHANT OPERATIONS)",
            "sub": "Quý chịu trách nhiệm toàn diện về phân hệ Người Bán (Shop Operations), bảo đảm việc quản lý kho bãi, xử lý đơn hàng, xuất phiếu vận chuyển và kiểm soát đổi trả diễn ra chính xác theo tiêu chuẩn Shopee Seller Center:",
            "tasks": [
                {
                    "title": "Nhiệm vụ 1: Quản Lý Tồn Kho Tức Thời & Cảnh Báo Sắp Hết Hàng (Stock Threshold <= 5)",
                    "why": "Trên sàn TMĐT, nếu không đồng bộ kho bãi, khách vẫn đặt mua sản phẩm dù trong kho đã hết hàng. Điều này dẫn đến tỷ lệ hủy đơn cao, khách hàng bức xúc và Shop bị đánh tụt điểm uy tín. Shopee Seller Center luôn giám sát số lượng tồn kho theo từng biến thể (màu sắc, dung tích).",
                    "ui": "Trên bảng quản lý sản phẩm của Shop, mỗi sản phẩm hiển thị thanh tiến độ tồn kho trực quan. Nếu tồn kho > 10 hiển thị badge Xanh lá ('Còn hàng'). Khi tồn kho giảm xuống <= 5, hệ thống tự động đổi sang badge Vàng Cảnh Báo ('Sắp hết hàng') và gửi chuông thông báo cho chủ Shop. Khi tồn kho = 0, badge chuyển sang Đỏ ('Hết hàng'). Tại trang mua sắm của khách, nút 'Thêm vào giỏ' và 'Mua ngay' tự động bị mờ (disabled) và gắn nhãn 'Tạm hết hàng'.",
                    "logic": "Khi khách thanh toán thành công, hệ thống thực hiện thao tác khóa dòng dữ liệu (Row-level Lock) và trừ số lượng tồn kho ngay lập tức. Nếu đơn hàng bị hủy hoặc hoàn tiền, số lượng tồn kho tự động được cộng trả lại. Khi tồn kho chạm 0, hệ thống tự động vô hiệu hóa tính năng lấy link tiếp thị của KOL đối với sản phẩm đó.",
                    "defense": "Chứng minh nhóm hiểu sâu bài toán tranh chấp tài nguyên (Concurrency & Inventory Race Condition) trong hệ thống thương mại điện tử phân tán."
                },
                {
                    "title": "Nhiệm vụ 2: Cơ Chế Cho Phép Shop Chủ Động Hủy Đơn Hàng & Hoàn Tiền Tự Động",
                    "why": "Thực tế kinh doanh có nhiều sự cố bất khả kháng: hàng trong kho bị bể vỡ khi đóng gói, lỗi niêm yết sai giá, hoặc thiên tai không thể giao hàng. Hệ thống cũ thiếu nút cho Shop tự hủy, buộc Shop phải liên hệ thủ công rất phiền hà.",
                    "ui": "Tại màn hình Quản lý đơn hàng của Shop, bên cạnh nút 'Xác nhận đơn', bổ sung nút 'Hủy đơn hàng'. Khi bấm, một hộp thoại Modal xuất hiện yêu cầu Shop chọn lý do hủy (Hết hàng đột xuất, Hàng hóa lỗi hư hỏng, Địa chỉ người nhận không hợp lệ, Lý do khác).",
                    "logic": "Khi Shop bấm xác nhận hủy, hệ thống cập nhật trạng thái đơn hàng sang 'CANCELLED_BY_SHOP'. Nếu khách hàng đã thanh toán trước qua chuyển khoản ngân hàng, hệ thống tự động hoàn 100% số tiền vào Số dư ví của khách. Đồng thời, toàn bộ hoa hồng tiếp thị đang tạm giữ của KOL liên quan đến đơn hàng này bị hủy bỏ ngay lập tức.",
                    "defense": "Khẳng định hệ sinh thái hoàn thiện, giải quyết trọn vẹn vòng đời đơn hàng (Order State Machine) cả chiều thuận lẫn chiều đảo ngược (Rollback)."
                },
                {
                    "title": "Nhiệm vụ 3: Bộ Mô Phỏng Vận Chuyển (Shipping Simulator) & In Phiếu Giao Hàng Chuẩn A6 Barcode",
                    "why": "Shopee kết nối sâu với Giao Hàng Nhanh (GHN), Viettel Post để Shop in phiếu giao hàng dán lên thùng carton. SCANMS hiện tại chỉ lưu chuỗi mã vận đơn thuần túy, chưa có công cụ mô phỏng quy trình giao vận thực tế để demo trước Hội đồng.",
                    "ui": "Khi Shop bấm 'Xác nhận gửi hàng', hệ thống tự động cấp một mã vận đơn chuẩn định dạng TMĐT (ví dụ: GHN-2026-8891). Bổ sung nút 'In phiếu giao hàng' (Shipping Label) mở ra bản in chuẩn khổ A6 có đầy đủ: Mã vạch Barcode quét kiện hàng, thông tin Shop gửi, thông tin người nhận, số tiền thu hộ COD và danh sách sản phẩm. Cung cấp cụm nút mô phỏng tiến độ: 'Đang lấy hàng' -> 'Đang vận chuyển' -> 'Giao thành công'.",
                    "logic": "Mỗi lần chuyển trạng thái vận chuyển, hệ thống cập nhật nhật ký hành trình đơn hàng (Tracking Milestones) và tự động kích hoạt thông báo tương ứng cho người mua để tiện theo dõi.",
                    "defense": "Gây ấn tượng thị giác mạnh mẽ với Hội đồng chấm thi nhờ phiếu in giao hàng thực tế có Barcode, chứng minh sản phẩm sẵn sàng triển khai ngoài đời thực."
                },
                {
                    "title": "Nhiệm vụ 4: Màn Hình Shop Tiếp Nhận & Thẩm Định Yêu Cầu Đổi Trả / Hoàn Tiền 14 Ngày",
                    "why": "Trước khi chuyển lên cấp Trọng tài Admin can thiệp, Shop phải là người đầu tiên tiếp nhận khiếu nại của khách để thương lượng bồi thường hoặc đổi mới sản phẩm, giảm tải cho sàn.",
                    "ui": "Bổ sung tab 'Yêu cầu đổi trả' trên Dashboard của Shop. Shop được xem: Tên khách hàng, lý do khiếu nại, bộ ảnh chụp lỗi sản phẩm và video mở hộp (Unboxing Video) do khách tải lên. Shop có 2 nút hành động: 'Chấp thuận hoàn tiền' hoặc 'Từ chối khiếu nại' (bắt buộc nhập lý do giải trình rõ ràng).",
                    "logic": "Nếu Shop chấp thuận: Tiền tự động hoàn trả vào ví khách, tồn kho được cộng lại. Nếu Shop từ chối: Đơn hàng tự động chuyển trạng thái sang Tranh Chấp (DISPUTED) và được đẩy lên Cổng trọng tài của Admin để phân xử.",
                    "defense": "Thể hiện tư duy thiết kế quy trình giải quyết khiếu nại 2 cấp chuẩn xác theo Luật Bảo vệ Quyền lợi Người tiêu dùng trong TMĐT."
                },
                {
                    "title": "Nhiệm vụ 5: Quản Lý & Phát Hành Mã Giảm Giá (Voucher) Riêng Của Từng Gian Hàng",
                    "why": "Mỗi Shop có biên lợi nhuận và chiến lược marketing khác nhau. Cho phép Shop tự tạo voucher giúp Shop chủ động xả hàng tồn hoặc tri ân khách hàng thân thiết mà không phụ thuộc vào chương trình chung của sàn.",
                    "ui": "Màn hình 'Khuyến mãi của Shop' cho phép chủ Shop bấm 'Tạo voucher mới' với các thiết lập: Tên mã, loại giảm giá (giảm theo % hoặc giảm số tiền cố định), giá trị đơn hàng tối thiểu, mức giảm tối đa, số lượt sử dụng tối đa và thời gian hiệu lực.",
                    "logic": "Khi khách mua hàng áp mã voucher của Shop tại bước thanh toán, hệ thống kiểm tra tính hợp lệ: Mã có thuộc đúng Shop đó không? Đơn hàng có đạt giá trị tối thiểu không? Số lượt dùng còn lại > 0 không? Số tiền giảm giá được trừ trực tiếp vào doanh thu của Shop mà không làm giảm hoa hồng cam kết của KOL.",
                    "defense": "Chứng minh sự hiểu biết về mô hình tài chính đa gian hàng, phân định rành mạch chi phí khuyến mãi của Shop và quyền lợi tiếp thị của KOL."
                }
            ]
        },

        # ------------------- 2.2 TUẤN -------------------
        {
            "header": "2.2. NGUYỄN ĐÌNH TUẤN — PHÂN HỆ: NHÀ SÁNG TẠO (KOL/KOC) & KIỂM DUYỆT SÀN (SYSTEM MANAGER)",
            "sub": "Tuấn chịu trách nhiệm xây dựng các công cụ tiếp thị đắc lực giúp KOL bùng nổ hoa hồng, đồng thời thiết lập cơ chế kiểm soát chất lượng đầu vào của sàn cho Ban Quản Trị:",
            "tasks": [
                {
                    "title": "Nhiệm vụ 1: Cơ Chế Phân Cấp Hoa Hồng Tiếp Thị 2 Tầng (Open Offer vs Exclusive Deal)",
                    "why": "Một sàn tiếp thị liên kết chuyên nghiệp không thể áp dụng một mức hoa hồng cào bằng cho tất cả mọi người. Micro-KOL mới vào nghề hưởng mức tiêu chuẩn, trong khi các Top KOL có hàng triệu follower đòi hỏi mức hoa hồng cao hơn kèm deal độc quyền.",
                    "ui": "Tại kho hàng tiếp thị, mỗi sản phẩm hiển thị 2 mức hoa hồng: (a) 'Hoa hồng công khai' (Open Offer - ví dụ 15%): Mọi KOL đã xác thực đều có thể bấm 'Lấy link ngay'. (b) 'Đàm phán Deal độc quyền' (Exclusive Deal): Nút bấm mở hộp thoại gửi đề xuất hoa hồng VIP (ví dụ 25%) kèm cam kết doanh số đến chủ Shop qua hệ thống Chat nội bộ.",
                    "logic": "Khi Shop chấp thuận mức hoa hồng riêng cho KOL, hệ thống tạo một liên kết tiếp thị đặc quyền gắn với User ID của KOL đó. Khi người mua click vào link này, hệ thống tự động ghi nhận tỷ lệ hoa hồng VIP thay vì tỷ lệ công khai.",
                    "defense": "Nâng tầm đồ án từ một bài tập lớn đơn giản thành một nền tảng Affiliate Network thương mại hóa thực thụ theo mô hình TikTok Shop Creator Affiliate."
                },
                {
                    "title": "Nhiệm vụ 2: Quy Trình Yêu Cầu Cấp Sản Phẩm Mẫu 4 Bước (Sample Request Flow)",
                    "why": "Tránh tình trạng các tài khoản KOL ảo lợi dụng quyền tạo link để 'xin đồ miễn phí' từ các nhãn hàng rồi biến mất mà không làm video quảng bá, gây thiệt hại nặng nề cho các Shop đối tác.",
                    "ui": "Tại trang chi tiết sản phẩm, bổ sung nút 'Đăng ký nhận sản phẩm mẫu'. KOL điền form cam kết: Kênh mạng xã hội sẽ đăng bài (TikTok, YouTube, Facebook), ngày dự kiến trả video review. Shop nhận thông báo, xem hồ sơ tương tác của KOL và bấm 'Đồng ý gửi mẫu' hoặc 'Từ chối'.",
                    "logic": "Quy trình chuyển trạng thái 4 bước nghiêm ngặt: (1) Đăng ký gửi mẫu -> (2) Shop phê duyệt & xuất kho mẫu -> (3) Đang giao kiện hàng mẫu -> (4) KOL xác nhận nhận mẫu & nộp link video review trong vòng 14 ngày. Nếu quá hạn không trả video, tài khoản KOL bị khóa quyền xin hàng mẫu toàn sàn.",
                    "defense": "Đưa ra giải pháp quản trị rủi ro kinh doanh chặt chẽ giữa Creator và Nhãn hàng, giải quyết dứt điểm bài toán thất thoát hàng mẫu."
                },
                {
                    "title": "Nhiệm vụ 3: Hệ Thống Voucher Livestream Theo Phiên Phát Sóng (Countdown Timer)",
                    "why": "Livestream bán hàng là xu hướng chủ đạo của thương mại điện tử hiện đại. Điểm mấu chốt để kích thích người xem 'chốt đơn tức thì' là các mã giảm giá chớp nhoáng chỉ tồn tại trong suốt buổi live.",
                    "ui": "KOL phối hợp với Shop tạo phiên live trên hệ thống. Trong khung giờ live, sản phẩm được gắn nhãn 'Deal Phiên Live' kèm đồng hồ đếm ngược thời gian thực (Countdown Timer màu vàng thương hiệu). Khách mua hàng trong thời gian này được áp voucher độc quyền của buổi live.",
                    "logic": "Đúng thời điểm kết thúc phiên live, mã voucher tự động hết hạn trên toàn hệ thống. Mọi đơn hàng chưa thanh toán sẽ tự động quay trở về mức giá gốc và mức hoa hồng thông thường. Hệ thống tự động tổng kết doanh số và hoa hồng mang lại từ phiên live cho KOL.",
                    "defense": "Bắt kịp xu hướng Live Commerce tiên tiến của thế giới, chứng minh khả năng thiết kế hệ thống xử lý thời gian thực (Real-time Session Management)."
                },
                {
                    "title": "Nhiệm vụ 4: Hàng Đợi Kiểm Duyệt Hồ Sơ Gian Hàng Mới (Shop Onboarding KYC)",
                    "why": "Để bảo vệ uy tín của sàn SCANMS, không thể để một cá nhân vừa đăng ký tài khoản là lập tức được mở gian hàng bán sản phẩm giả mạo, kém chất lượng.",
                    "ui": "Khi Shop đăng ký mới, gian hàng ở trạng thái 'Bản nháp / Chờ duyệt (PENDING_APPROVAL)'. Chủ Shop phải tải lên: Ảnh CCCD người đại diện, Giấy phép đăng ký kinh doanh, Mã số thuế và Số tài khoản ngân hàng. Ban Quản Trị (System Manager) có màn hình hàng đợi duyệt hồ sơ: So sánh ảnh CCCD, bấm 'Duyệt hồ sơ' hoặc 'Yêu cầu bổ sung'.",
                    "logic": "Chỉ khi Admin phê duyệt, tài khoản Shop mới được kích hoạt trạng thái 'VERIFIED', cho phép nhập kho sản phẩm và hiển thị gian hàng trên trang chủ sàn.",
                    "defense": "Đáp ứng đầy đủ quy chuẩn pháp lý của Nghị định 52/2013/NĐ-CP và Nghị định 85/2021/NĐ-CP về Quản lý hoạt động sàn giao dịch thương mại điện tử tại Việt Nam."
                },
                {
                    "title": "Nhiệm vụ 5: Kiểm Duyệt Sản Phẩm Đăng Tải Mới (Product Moderation: Draft -> Approved)",
                    "why": "Dù Shop đã được xác minh danh tính, từng sản phẩm mới đăng tải vẫn phải được rà soát để ngăn chặn hàng cấm, mỹ phẩm chứa chất độc hại, hoặc hình ảnh mô tả phản cảm vi phạm tiêu chuẩn cộng đồng.",
                    "ui": "Khi Shop thêm sản phẩm mới, sản phẩm lưu ở trạng thái 'DRAFT'. Trên cổng Quản Trị Sàn, System Manager xem trước trang chi tiết sản phẩm, kiểm tra thành phần, xuất xứ, nhãn mác -> Bấm 'Phê duyệt (APPROVED)' hoặc 'Từ chối' kèm lý do cụ thể gửi về cho Shop.",
                    "logic": "Sản phẩm ở trạng thái DRAFT hoàn toàn ẩn đối với khách hàng và KOL. Chỉ sản phẩm APPROVED mới được lập chỉ mục (indexing) vào công cụ tìm kiếm và xuất hiện trong kho hàng tiếp thị.",
                    "defense": "Khẳng định cơ chế kiểm soát chất lượng nhiều lớp (Defense in Depth) bảo vệ tối đa người tiêu dùng trên sàn."
                }
            ]
        },

        # ------------------- 2.3 THỊNH -------------------
        {
            "header": "2.3. PHAN XUÂN THỊNH — PHÂN HỆ: KHÁCH HÀNG & TRẢI NGHIỆM MUA SẮM (CUSTOMER PORTAL)",
            "sub": "Thịnh chịu trách nhiệm trọn vẹn về Cổng Khách Hàng (Customer Portal), từ trải nghiệm tìm kiếm, giỏ hàng đồng bộ đa thiết bị, đến quyền lợi đổi trả 14 ngày và tương tác trực tiếp với Shop:",
            "tasks": [
                {
                    "title": "Nhiệm vụ 1: Giỏ Hàng Đồng Bộ Tập Trung Tại Cơ Sở Dữ Liệu PostgreSQL (Cart Persistence)",
                    "why": "Hệ thống cũ lưu giỏ hàng tạm ở trình duyệt (localStorage). Hậu quả: Khách lướt điện thoại thêm sản phẩm vào giỏ, khi về nhà mở laptop đăng nhập tài khoản thì giỏ hàng trống trơn, làm gián đoạn hành vi mua sắm và rớt tỷ lệ chuyển đổi.",
                    "ui": "Biểu tượng giỏ hàng trên thanh Header hiển thị số lượng tức thời. Khi khách đăng nhập trên bất kỳ máy tính, điện thoại hay trình duyệt nào, toàn bộ sản phẩm đã thêm, phân loại biến thể (màu sắc, kích cỡ) và số lượng đã chọn đều được nạp lại nguyên vẹn.",
                    "logic": "Mỗi thao tác thêm, bớt số lượng hoặc đổi biến thể đều được đồng bộ trực tiếp vào bảng Cart trong cơ sở dữ liệu PostgreSQL gắn với User ID của khách hàng. Khi sản phẩm trong giỏ bị Shop đổi giá hoặc hết hàng, giỏ hàng tự động cập nhật cảnh báo trực quan cho người mua.",
                    "defense": "Nâng cấp trải nghiệm người dùng liền mạch (Omnichannel Experience), giải quyết triệt để vấn đề mất mát dữ liệu giỏ hàng phía Client."
                },
                {
                    "title": "Nhiệm vụ 2: Quy Trình Gửi Yêu Cầu Đổi Trả / Hoàn Tiền 14 Ngày (Bắt Buộc Video Mở Hộp)",
                    "why": "Chính sách đổi trả minh bạch là yếu tố số 1 giúp khách hàng an tâm mua sắm online. Tuy nhiên, nếu không có bằng chứng rõ ràng, sàn sẽ phải đối mặt với tình trạng khách gian lận tráo hàng giả vào gói hàng.",
                    "ui": "Tại trang 'Đơn mua của tôi', với những đơn hàng đã chuyển trạng thái 'Giao thành công', hệ thống hiển thị nút 'Yêu cầu Trả hàng / Hoàn tiền' kèm đồng hồ đếm ngược hạn 14 ngày. Bấm vào nút sẽ mở form khiếu nại: Chọn lý do (Hàng bể vỡ, Giao sai mẫu, Hết hạn sử dụng), tải lên ảnh chụp lỗi và BẮT BUỘC tải lên video mở hộp (Unboxing Video). Khách theo dõi tiến độ xử lý trực tiếp trên giao diện.",
                    "logic": "Hệ thống kiểm tra: Đơn hàng phải trong hạn <= 14 ngày kể từ lúc nhận hàng. Nếu form thiếu video mở hộp, hệ thống sẽ cảnh báo không cho gửi yêu cầu. Khi gửi thành công, đơn hàng tự động chuyển sang trạng thái 'RETURN_REQUESTED' và đẩy thông báo khẩn cấp đến Shop.",
                    "defense": "Bảo vệ song phương quyền lợi chính đáng của cả Người mua và Chủ shop, chuẩn hóa thủ tục khiếu nại thương mại điện tử hiện đại."
                },
                {
                    "title": "Nhiệm vụ 3: Ràng Buộc Đánh Giá Sản Phẩm Thật (Verified Review Gate - Chỉ Đơn COMPLETED)",
                    "why": "Nhiều trang web cho phép bất kỳ ai cũng có thể viết review dẫn đến tình trạng đối thủ vào spam 1 sao dìm hàng, hoặc Shop tự tạo tài khoản ảo vào tâng bốc sản phẩm. Shopee giải quyết việc này bằng cách chỉ cho phép người đã nhận hàng thật được đánh giá.",
                    "ui": "Tại trang chi tiết sản phẩm, danh sách đánh giá hiển thị huy hiệu 'Người mua đã xác minh' (Verified Buyer). Form viết đánh giá (chấm điểm từ 1 đến 5 sao, viết nhận xét và đăng ảnh thực tế) chỉ mở ra khi người dùng bấm nút 'Đã nhận hàng - Hoàn tất' tại trang đơn mua.",
                    "logic": "Hệ thống kiểm tra logic chặt chẽ: Tài khoản phải có ít nhất 1 đơn hàng chứa sản phẩm đó với trạng thái đơn là 'COMPLETED' (Đã nhận hàng thành công và không có khiếu nại). Mỗi đơn hàng chỉ được quyền đánh giá sản phẩm đúng 1 lần duy nhất để chống spam.",
                    "defense": "Đảm bảo tính chân thực và độ tin cậy tuyệt đối của hệ thống dữ liệu đánh giá sản phẩm, ngăn chặn 100% đánh giá giả mạo."
                },
                {
                    "title": "Nhiệm vụ 4: Minh Bạch Chính Sách Gian Hàng & Điều Kiện Đổi Trả Trước Khi Thanh Toán",
                    "why": "Khách hàng thường bỏ qua việc đọc điều khoản dịch vụ nếu viết dài dòng ở trang riêng. Việc hiển thị rõ điều kiện đổi trả ngay trước khi thanh toán giúp giảm thiểu tối đa các tranh chấp do hiểu lầm sau này.",
                    "ui": "Tại trang Chi tiết sản phẩm và bước Xác nhận giỏ hàng (Checkout Review), bổ sung khung 'Cam kết chính sách gian hàng': (1) Hàng chính hãng 100% nguyên tem mác; (2) Đổi trả miễn phí trong 14 ngày nếu có video đồng kiểm; (3) Thời gian hoàn tiền tự động trong 24 giờ làm việc.",
                    "logic": "Hộp thông tin chính sách được nhúng đồng bộ vào luồng đặt hàng. Khách hàng bắt buộc phải tích chọn xác nhận 'Tôi đã đọc và đồng ý với chính sách đổi trả của Shop' thì nút 'Đặt mua ngay' mới được kích hoạt.",
                    "defense": "Hoàn thiện khía cạnh minh bạch thông tin pháp lý và tính công khai trong giao dịch điện tử theo tiêu chuẩn Thương mại điện tử Việt Nam."
                },
                {
                    "title": "Nhiệm vụ 5: Kênh Nhắn Tin Trao Đổi Trực Tiếp Khách Hàng ⇄ Chủ Shop (Live In-App Chat)",
                    "why": "Mỹ phẩm và thực phẩm chăm sóc sức khỏe là những sản phẩm đòi hỏi tư vấn kỹ lưỡng về thành phần, loại da và hạn sử dụng trước khi mua. Nếu không được giải đáp kịp thời, khách hàng sẽ rời bỏ trang web.",
                    "ui": "Tích hợp nút 'Chat ngay với Shop' nổi bật tại trang chi tiết sản phẩm. Bấm vào sẽ mở ra khung chat thời gian thực tiện lợi, tự động gửi kèm thông tin và hình ảnh sản phẩm khách đang xem để Shop dễ dàng tư vấn.",
                    "logic": "Hệ thống định tuyến tin nhắn chuẩn xác giữa Khách hàng và Chủ Shop. Khi Shop phản hồi, chuông thông báo trên Header của khách lập tức sáng lên kèm âm báo tin nhắn mới.",
                    "defense": "Gia tăng mạnh mẽ tỷ lệ chuyển đổi đơn sắm (Conversion Rate), mang lại trải nghiệm chăm sóc khách hàng chuyên nghiệp như trên sàn Shopee."
                }
            ]
        },

        # ------------------- 2.4 THẮNG -------------------
        {
            "header": "2.4. NGUYỄN THÀNH THẮNG (LEADER) — BẢO MẬT HỆ THỐNG, QUỸ ESCROW & TRỌNG TÀI SÀN",
            "sub": "Thắng là Trưởng nhóm, phụ trách việc thiết lập kỷ luật kỹ thuật, an ninh danh tính tài khoản, bảo chứng dòng tiền thanh toán và cổng phán quyết trọng tài tối cao:",
            "tasks": [
                {
                    "title": "Nhiệm vụ 1: Khóa Bắt Buộc 100% Đăng Nhập Tài Khoản (Xóa Bỏ Hoàn Toàn Khách Vãng Lai)",
                    "why": "Trước đây cho phép khách vãng lai (Guest Checkout) mua hàng không cần tài khoản dẫn đến hậu quả nghiêm trọng: Khách làm mất mã đơn không thể tra cứu hành trình, không có tài khoản để mở khiếu nại đổi trả, và sàn không thể xác thực hành vi để đối soát hoa hồng cho KOL. Shopee và TikTok Shop bắt buộc 100% người mua phải có tài khoản.",
                    "ui": "Xóa bỏ hoàn toàn luồng checkout nặc danh. Khi khách bấm 'Mua ngay' hoặc 'Thanh toán', hệ thống tự động hiển thị màn hình đăng nhập trang trọng theo tông Vàng Be. Tích hợp nút 'Đăng nhập Google 1-Click' cực nhanh (chỉ mất 1.5 giây, tự động lấy tên, email và avatar từ Google) hoặc Đăng ký bằng Email/Mật khẩu.",
                    "logic": "Mọi đơn hàng trong cơ sở dữ liệu bắt buộc phải có khóa ngoại User ID hợp lệ. Thông tin địa chỉ nhận hàng được tự động lưu vào Sổ địa chỉ cá nhân của khách để tái sử dụng cho các lần mua sau mà không cần nhập lại từ đầu.",
                    "defense": "Chuẩn hóa kiến trúc dữ liệu sạch, đảm bảo mọi thực thể giao dịch trên sàn đều có định danh pháp lý rõ ràng."
                },
                {
                    "title": "Nhiệm vụ 2: Luồng Quên Mật Khẩu Qua Mã OTP Email & Bảo Mật Xác Minh Khi Đổi SĐT/Email",
                    "why": "Bảo vệ tài khoản người dùng khỏi các cuộc tấn công chiếm đoạt và hỗ trợ khách hàng khôi phục tài khoản thuận tiện, an toàn khi lỡ quên mật khẩu.",
                    "ui": "Tại trang đăng nhập, có liên kết 'Quên mật khẩu?'. Người dùng nhập email -> Hệ thống gửi mã OTP xác thực 6 chữ số về hộp thư -> Người dùng nhập đúng mã OTP trên giao diện thì mới xuất hiện form đặt lại mật khẩu mới. Đồng thời, tại trang Hồ sơ cá nhân, khi người dùng đổi SĐT nhận hàng hoặc email, hệ thống bắt buộc nhập lại mật khẩu hiện tại hoặc mã OTP xác nhận.",
                    "logic": "Mã OTP 6 số được sinh ngẫu nhiên an toàn, có thời hạn hiệu lực chính xác 5 phút và tự động hủy sau khi sử dụng một lần. Mật khẩu mới được băm và mã hóa bằng thuật toán Argon2id (tiêu chuẩn mật mã an toàn nhất hiện nay đạt giải thưởng Password Hashing Competition).",
                    "defense": "Đạt chuẩn an toàn thông tin theo khuyến nghị của OWASP Authentication Cheat Sheet, chống hoàn toàn tấn công Brute-force và giả mạo danh tính."
                },
                {
                    "title": "Nhiệm vụ 3: Cơ Chế Quỹ Bảo Chứng Escrow 14 Ngày & Tự Động Quyết Toán Ví CTV (0đ Phí Ngân Hàng)",
                    "why": "Đây là 'trái tim tài chính' của toàn bộ sàn SCANMS. Nếu Shop giao hàng xong mà sàn thả tiền ngay lập tức, khi khách khiếu nại hàng giả thì Shop và KOL đã rút tiền tẩu thoát. Do đó, tiền bán hàng phải được giữ trong Quỹ bảo chứng (Escrow) đúng 14 ngày để bảo đảm chính sách đổi trả của khách.",
                    "ui": "Trên Dashboard của Shop, doanh thu hiển thị ở trạng thái 'Đang bảo chứng (Escrow Pending)'. Trên Dashboard của KOL, hoa hồng hiển thị ở trạng thái 'Tạm giữ 14 ngày'. Mỗi đơn hàng đều có đồng hồ đếm ngược ngày bảo chứng minh bạch.",
                    "logic": "Khi đơn hàng chuyển sang trạng thái 'Giao thành công', hệ thống kích hoạt bộ đếm thời gian 14 ngày. Hết 14 ngày mà không có khiếu nại đổi trả, hệ thống tự động kích hoạt dịch vụ quyết toán: Chuyển doanh thu vào ví Shop và chuyển hoa hồng vào số dư ví khả dụng của KOL thông qua cơ chế hạch toán sổ cái nội bộ (Double-entry Ledger), hoàn toàn miễn phí 0 đồng phí ngân hàng. Nếu đơn bị đổi trả thành công, hoa hồng tự động bị thu hồi theo điều khoản.",
                    "defense": "Minh chứng năng lực thiết kế nghiệp vụ Fintech phức tạp, bảo đảm an toàn thanh toán tuyệt đối cho toàn bộ hệ sinh thái."
                },
                {
                    "title": "Nhiệm vụ 4: Cổng Phân Xử Trọng Tài Khiếu Nại Đổi Trả Độc Lập (Dispute Resolution Portal)",
                    "why": "Khi Khách hàng yêu cầu hoàn tiền nhưng Shop từ chối với lý do khách tự làm hư hỏng, hai bên sẽ rơi vào mâu thuẫn tranh chấp. Hệ thống cần một cổng trọng tài dành cho Ban Quản Trị sàn đưa ra phán quyết công bằng cuối cùng.",
                    "ui": "Màn hình 'Phân xử tranh chấp' dành riêng cho Admin/System Manager. Admin mở hồ sơ khiếu nại: Màn hình chia đôi trực quan: Bên trái xem ảnh chụp và video mở hộp của Khách hàng, bên phải xem văn bản giải trình và bằng chứng đóng gói của Shop. Admin có 2 nút phán quyết: 'Chấp thuận hoàn tiền cho Khách' hoặc 'Bác bỏ khiếu nại, thanh toán cho Shop'.",
                    "logic": "Khi Admin ra phán quyết: Nếu Khách thắng -> Hệ thống tự động trích tiền từ quỹ Escrow hoàn trả vào ví khách, hủy hoa hồng KOL. Nếu Shop thắng -> Đơn hàng tiếp tục chu trình Escrow để thanh toán cho Shop và KOL. Quyết định của Trọng tài là phán quyết cuối cùng và được lưu vĩnh viễn vào nhật ký kiểm toán Audit Log.",
                    "defense": "Hoàn thiện cơ chế trọng tài trung gian (Dispute Settlement Mechanism) bắt buộc phải có của mọi sàn thương mại điện tử chuyên nghiệp."
                },
                {
                    "title": "Nhiệm vụ 5: Trung Tâm Thông Báo Đa Vai Trò Thời Gian Thực (Multi-Role Notification Center)",
                    "why": "Một hệ thống có 4 vai trò (Khách, Shop, KOL, Admin) không thể để người dùng phải tải lại trang F5 liên tục để xem có đơn mới hay không. Mọi biến động trạng thái phải được thông báo tức thời.",
                    "ui": "Biểu tượng chuông thông báo trang nhã trên thanh Header cho tất cả người dùng. Khi có tin mới, chuông hiển thị badge đỏ số lượng và âm báo tinh tế. Bấm vào chuông hiển thị danh sách thông báo phân loại theo tab (Tất cả, Đơn hàng, Tài chính, Hệ thống). Bấm vào từng thông báo sẽ dẫn trực tiếp đến trang chi tiết của sự kiện đó.",
                    "logic": "Hệ thống phát thông báo tự động theo kịch bản: Khách nhận tin đơn đang giao / đã giao; Shop nhận tin có đơn mới / cảnh báo tồn kho <= 5; KOL nhận tin hoa hồng về ví / được duyệt hàng mẫu; Admin nhận tin có Shop mới nộp hồ sơ Onboarding.",
                    "defense": "Tối ưu hóa khả năng gắn kết người dùng (User Engagement) và tính trực quan phản hồi thời gian thực của ứng dụng web hiện đại."
                },
                {
                    "title": "Nhiệm vụ 6: Thuật Toán AI Fraud Sentinel Chống Gian Lận Tự Mua (Self-Referral Fraud)",
                    "why": "Trong tiếp thị liên kết, gian lận nguy hiểm nhất là 'tự mua qua link của chính mình' (KOL tạo link rồi tự lập tài khoản phụ mua hàng để trục lợi tiền hoa hồng) và gian lận bùng nổ click ảo từ botnet.",
                    "ui": "Màn hình AI Fraud Sentinel trên bảng điều khiển Admin hiển thị biểu đồ cảnh báo rủi ro gian lận thời gian thực, danh sách các tài khoản KOL và các đơn hàng bị gắn cờ nghi vấn vi phạm kèm điểm số bất thường (Risk Score từ 0 - 100).",
                    "logic": "Thuật toán tự động đối soát: Nếu phát hiện tài khoản người mua trùng địa chỉ IP, trùng vân tay thiết bị (Device Fingerprint) hoặc trùng thẻ thanh toán với tài khoản KOL tạo link tiếp thị, hệ thống lập tức gắn nhãn vi phạm 'SELF_REFERRAL_DETECTED', tự động đóng băng lệnh chi trả hoa hồng và báo cáo cho Admin xử lý.",
                    "defense": "Điểm cộng học thuật xuất sắc chứng minh khả năng áp dụng thuật toán thông minh bảo vệ ngân sách của nhãn hàng và sự trong sạch của sàn."
                }
            ]
        }
    ]

    for sec in member_sections:
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(14)
        p_sec.paragraph_format.space_after = Pt(2)
        r_sec = p_sec.add_run(sec["header"])
        r_sec.font.name = "Calibri"
        r_sec.font.size = Pt(11.5)
        r_sec.font.bold = True
        r_sec.font.color.rgb = color_navy

        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_after = Pt(6)
        r_sub = p_sub.add_run(sec["sub"])
        r_sub.font.name = "Calibri"
        r_sub.font.size = Pt(9.5)
        r_sub.font.italic = True
        r_sub.font.color.rgb = color_muted

        for t in sec["tasks"]:
            p_task = doc.add_paragraph()
            p_task.paragraph_format.space_before = Pt(6)
            p_task.paragraph_format.space_after = Pt(3)
            r_task = p_task.add_run("🔹 " + t["title"])
            r_task.font.name = "Calibri"
            r_task.font.size = Pt(10)
            r_task.font.bold = True
            r_task.font.color.rgb = color_gold

            points = [
                ("• Bối cảnh thực tế & Điểm đau (Pain Point):", t["why"]),
                ("• Trải nghiệm trên giao diện (UI/UX Journey):", t["ui"]),
                ("• Logic xử lý nghiệp vụ ngầm (System & Business Logic):", t["logic"]),
                ("• Giá trị bảo vệ trước Hội đồng chấm thi:", t["defense"])
            ]

            for lbl, val in points:
                p_item = doc.add_paragraph(style='List Bullet')
                p_item.paragraph_format.space_after = Pt(2)
                p_item.paragraph_format.line_spacing = 1.15
                rl = p_item.add_run(lbl + " ")
                rl.font.name = "Calibri"
                rl.font.size = Pt(9.5)
                rl.font.bold = True
                rl.font.color.rgb = color_navy if "Giá trị" not in lbl else color_gold
                rv = p_item.add_run(val)
                rv.font.name = "Calibri"
                rv.font.size = Pt(9.5)
                rv.font.color.rgb = color_ink

    # ----------------------------------------------------
    # PHẦN 3: MA TRẬN KẾT NỐI LUỒNG DỮ LIỆU KHÉP KÍN GIỮA 4 THÀNH VIÊN
    # ----------------------------------------------------
    h1_3 = doc.add_paragraph()
    h1_3.paragraph_format.space_before = Pt(16)
    h1_3.paragraph_format.space_after = Pt(4)
    r_h1_3 = h1_3.add_run("3. MA TRẬN KẾT NỐI LUỒNG DỮ LIỆU KHÉP KÍN (CLOSED-LOOP DATA MATRIX) GIỮA 4 THÀNH VIÊN")
    r_h1_3.font.name = "Calibri"
    r_h1_3.font.size = Pt(12.5)
    r_h1_3.font.bold = True
    r_h1_3.font.color.rgb = color_navy

    p_intro_p3 = doc.add_paragraph()
    p_intro_p3.paragraph_format.space_after = Pt(8)
    r_p3 = p_intro_p3.add_run(
        "Điểm khác biệt vượt trội của bản phân công này là 4 thành viên không hoạt động như 4 ốc đảo riêng rẽ. "
        "Dữ liệu đầu ra của thành viên này chính là dữ liệu đầu vào bắt buộc của thành viên khác, tạo thành một chuỗi giá trị thương mại điện tử khép kín hoàn hảo:"
    )
    r_p3.font.name = "Calibri"
    r_p3.font.size = Pt(9.5)
    r_p3.font.color.rgb = color_ink

    flow_items = [
        ("Mối nối 1: Quý (Shop) ⇄ Tuấn (Admin & KOL)",
         "Quý tạo gian hàng và đăng sản phẩm ở dạng DRAFT -> Tuấn (Admin) tiếp nhận hồ sơ Onboarding và kiểm duyệt sản phẩm sang APPROVED -> Quý thiết lập tồn kho và kích hoạt kho affiliate -> Tuấn (KOL) xin sản phẩm mẫu 4 bước, lấy link tiếp thị và tạo voucher Livestream đếm ngược."),
        
        ("Mối nối 2: Tuấn (KOL) ⇄ Thịnh (Khách Mua Hàng)",
         "Tuấn (KOL) gắn link tiếp thị và phát hành voucher live -> Thịnh (Khách) nhấp vào link, hệ thống ghi nhận cookie tiếp thị -> Thịnh xem tư vấn sản phẩm, thêm vào giỏ hàng đồng bộ Database PostgreSQL và áp voucher giảm giá để tiến hành thanh toán."),
        
        ("Mối nối 3: Thịnh (Khách) ⇄ Thắng (Leader Bảo Mật & Escrow)",
         "Khi Thịnh bấm 'Thanh toán', hệ thống của Thắng khóa chặt bắt buộc đăng nhập (Google 1-Click hoặc Email) -> Đơn hàng tạo thành công được gắn vĩnh viễn với User ID của Thịnh -> Thắng kích hoạt Quỹ bảo chứng Escrow tạm giữ toàn bộ tiền bán hàng và hoa hồng tiếp thị đúng 14 ngày."),
        
        ("Mối nối 4: Thắng (Escrow) ⇄ Quý (Shop Vận Chuyển)",
         "Đơn hàng vào trạng thái chờ giao -> Quý (Shop) bấm xác nhận, hệ thống tự trừ tồn kho -> Quý in phiếu giao hàng A6 có mã vạch Barcode và dùng Shipping Simulator mô phỏng quá trình giao hàng thành công -> Thịnh (Khách) nhận hàng và bấm nút xác nhận 'Đã nhận hàng - COMPLETED'."),
        
        ("Mối nối 5: Thịnh (Khách) ⇄ Quý (Shop) ⇄ Thắng (Trọng Tài Phán Quyết)",
         "Nếu sản phẩm bị lỗi, Thịnh (Khách) gửi yêu cầu Đổi trả 14 ngày bắt buộc kèm video mở hộp -> Quý (Shop) vào màn hình tiếp nhận thẩm định video để chấp thuận hoặc từ chối -> Nếu Shop từ chối dẫn đến tranh chấp, Thắng (Trọng tài Admin) mở hồ sơ phân xử độc lập và ra phán quyết cuối cùng."),
        
        ("Mối nối 6: Thắng (Quyết Toán & AI Fraud) ⇄ Toàn bộ Hệ Thống",
         "Sau 14 ngày không có khiếu nại, hệ thống tài chính của Thắng tự động giải phóng tiền từ Quỹ Escrow: chuyển doanh thu cho Quý (Shop) và chuyển hoa hồng vào số dư ví của Tuấn (KOL) 0đ phí ngân hàng. Đồng thời, thuật toán AI Fraud Sentinel của Thắng liên tục quét đơn hàng để bảo vệ ngân sách của Quý khỏi hành vi tự mua trục lợi.")
    ]

    for title, desc in flow_items:
        p_fl = doc.add_paragraph(style='List Bullet')
        p_fl.paragraph_format.space_after = Pt(4)
        p_fl.paragraph_format.line_spacing = 1.15
        rt = p_fl.add_run(title + "\n")
        rt.font.name = "Calibri"
        rt.font.size = Pt(9.5)
        rt.font.bold = True
        rt.font.color.rgb = color_gold
        rd = p_fl.add_run(desc)
        rd.font.name = "Calibri"
        rd.font.size = Pt(9.5)
        rd.font.color.rgb = color_ink

    # ----------------------------------------------------
    # PHẦN 4: TIÊU CHUẨN NGHIỆM THU TRƯỚC HỘI ĐỒNG
    # ----------------------------------------------------
    h1_4 = doc.add_paragraph()
    h1_4.paragraph_format.space_before = Pt(16)
    h1_4.paragraph_format.space_after = Pt(4)
    r_h1_4 = h1_4.add_run("4. BỘ TIÊU CHÍ NGHIỆM THU VÀ BẢO VỆ XUẤT SẮC TRƯỚC HỘI ĐỒNG CAPSTONE")
    r_h1_4.font.name = "Calibri"
    r_h1_4.font.size = Pt(12.5)
    r_h1_4.font.bold = True
    r_h1_4.font.color.rgb = color_navy

    tbl_criteria = doc.add_table(rows=1, cols=4)
    tbl_criteria.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_criteria.autofit = False

    crit_headers = ["STT", "Hạng Mục Đánh Giá", "Tiêu Chuẩn Đạt Chuẩn Của Đồ Án", "Ý Nghĩa Khẳng Định Năng Lực Nhóm"]
    crit_widths = [Inches(0.5), Inches(1.8), Inches(2.6), Inches(2.3)]

    for idx, text in enumerate(crit_headers):
        c = tbl_criteria.rows[0].cells[idx]
        c.text = text
        c.width = crit_widths[idx]
        set_cell_background(c, "1B365D")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    crit_data = [
        ("1", "Tính Thực Tiễn & Cạnh Tranh Nghiệp Vụ", 
         "Có đầy đủ các tính năng then chốt của Shopee & TikTok Shop: Quản lý kho, Shipping Simulator in phiếu A6 có Barcode, Hàng mẫu 4 bước, Voucher Live đếm ngược và Đổi trả 14 ngày có video mở hộp.",
         "Chứng minh nhóm không sao chép lý thuyết sách vở mà nghiên cứu thực tế sâu sắc các nền tảng TMĐT hàng đầu."),
        ("2", "An Toàn Tài Chính & Pháp Lý Thương Mại", 
         "Cơ chế Quỹ bảo chứng Escrow 14 ngày, Phân xử tranh chấp 2 cấp, Khóa 100% người mua có tài khoản, Mã hóa mật khẩu Argon2id và OTP Email.",
         "Bảo đảm an toàn giao dịch tuyệt đối, tuân thủ nghiêm ngặt Luật Thương mại điện tử và Luật Bảo vệ người tiêu dùng."),
        ("3", "Độ Bền Vững Kiến Trúc & Toàn Vẹn Dữ Liệu", 
         "Giỏ hàng đồng bộ Database PostgreSQL, Trừ kho tức thời chống bán vượt (Over-selling), Đánh giá thật Verified Review Gate và AI Fraud Sentinel chống tự mua.",
         "Khẳng định trình độ kỹ sư phần mềm vững vàng, xử lý chuẩn xác các bài toán hóc búa về đồng bộ dữ liệu phân tán."),
        ("4", "Tính Thẩm Mỹ & Trải Nghiệm Người Dùng (UI/UX)", 
         "Đồng bộ 100% hệ màu thương hiệu Vàng Be (Warm Sand & Brand Gold), không lỗi font, không cắt chữ, tương tác mượt mà trên mọi kích thước màn hình.",
         "Mang lại ấn tượng thị giác chuyên nghiệp, sang trọng, đẳng cấp một sản phẩm sẵn sàng gọi vốn khởi nghiệp.")
    ]

    for r_idx, row_vals in enumerate(crit_data):
        row = tbl_criteria.add_row()
        bg_c = "FAF8F5" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.width = crit_widths[c_idx]
            set_cell_background(cell, bg_c)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.line_spacing = 1.15
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9)
                r.font.color.rgb = color_ink
                if c_idx == 1:
                    r.font.bold = True
                    r.font.color.rgb = color_navy

    # Save
    out_docx_docs = r"c:\HW\CAPSTONE\docs\SCANMS_Ke_Hoach_Phan_Cong_Cong_Viec_Thanh_Vien_2026.docx"
    out_docx_root = r"c:\HW\CAPSTONE\SCANMS_Ke_Hoach_Phan_Cong_Cong_Viec_Thanh_Vien_2026.docx"
    doc.save(out_docx_docs)
    doc.save(out_docx_root)
    print("Professional task assignment Word documents generated successfully:\n", out_docx_docs, "\n", out_docx_root)

if __name__ == "__main__":
    generate_assignment_document()
