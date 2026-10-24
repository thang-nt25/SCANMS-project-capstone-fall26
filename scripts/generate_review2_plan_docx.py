import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_review2_doc():
    doc = docx.Document()
    
    # Page setup - Margins (Top/Bottom 2cm, Left 2.5cm, Right 2cm)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(0.8)
        
        # Header & Footer setup
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("SCANMS (FA26SE032) | KẾ HOẠCH CHUẨN BỊ REVIEW 2 & HỘI ĐỒNG 1.1")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(0x7D, 0x71, 0x5E) # Warm Muted
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Trường Đại học FPT TP.HCM — Khóa luận Tốt nghiệp Kỹ thuật Phần mềm (Fall 2026)")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(0x7D, 0x71, 0x5E)

    # Color Tokens
    C_BRAND = RGBColor(0xB8, 0x8E, 0x4F)      # Brand Gold Strong
    C_DARK = RGBColor(0x23, 0x1D, 0x15)       # Brand Dark
    C_INK = RGBColor(0x1A, 0x16, 0x12)        # Deep Ink
    C_MUTED = RGBColor(0x7D, 0x71, 0x5E)      # Warm Muted
    HEX_GOLD_DARK = "B88E4F"
    HEX_DARK = "231D15"
    HEX_SAND = "F3EFE6"
    HEX_WARM_BG = "FBF5EB"
    HEX_BORDER = "EAE4D7"
    HEX_WHITE = "FFFFFF"

    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'''
            <w:tcMar {nsdecls("w")}>
                <w:top w:w="{top}" w:type="dxa"/>
                <w:bottom w:w="{bottom}" w:type="dxa"/>
                <w:left w:w="{left}" w:type="dxa"/>
                <w:right w:w="{right}" w:type="dxa"/>
            </w:tcMar>
        ''')
        tcPr.append(tcMar)

    def set_table_borders(table, hex_color=HEX_BORDER):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="{hex_color}"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{hex_color}"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr.append(borders)

    def add_callout(text_list, title="LƯU Ý QUAN TRỌNG", hex_bg=HEX_WARM_BG, hex_border=HEX_GOLD_DARK):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.7)
        set_cell_background(cell, hex_bg)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="none"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="{hex_border}"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        
        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(3)
        trun = cp.add_run(f"📌 {title}")
        trun.font.name = "Calibri"
        trun.font.bold = True
        trun.font.size = Pt(11)
        trun.font.color.rgb = C_BRAND
        
        for item in text_list:
            ip = cell.add_paragraph()
            ip.paragraph_format.space_before = Pt(0)
            ip.paragraph_format.space_after = Pt(2)
            irun = ip.add_run(item)
            irun.font.name = "Calibri"
            irun.font.size = Pt(10)
            irun.font.color.rgb = C_INK
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ------------------ COVER / HEADER BLOCK ------------------
    p_uni = doc.add_paragraph()
    p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_uni.paragraph_format.space_after = Pt(2)
    run_uni = p_uni.add_run("TRƯỜNG ĐẠI HỌC FPT TP. HỒ CHÍ MINH\nKHOA CÔNG NGHỆ THÔNG TIN — BỘ MÔN KỸ THUẬT PHẦN MỀM")
    run_uni.font.name = "Calibri"
    run_uni.font.bold = True
    run_uni.font.size = Pt(11)
    run_uni.font.color.rgb = C_DARK

    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(14)
    run_div = p_div.add_run("——— ★ ———")
    run_div.font.color.rgb = C_BRAND

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("KẾ HOẠCH TOÀN DIỆN CHUẨN BỊ REVIEW 2\n& THẨM ĐỊNH ĐIỀU KIỆN RA HỘI ĐỒNG 1.1")
    run_title.font.name = "Calibri"
    run_title.font.bold = True
    run_title.font.size = Pt(19)
    run_title.font.color.rgb = C_BRAND

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("DỰ ÁN: SCANMS (FA26SE032)\nSales Collaborator & Affiliate Network Management System")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(12)
    run_sub.font.bold = True
    run_sub.font.color.rgb = C_DARK

    # Metadata Table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table, HEX_BORDER)
    
    meta_data = [
        ("Mã đề tài & Lớp Capstone:", "FA26SE032 (Fall 2026) — Bộ môn Kỹ thuật Phần mềm Đại học FPT"),
        ("Tên đề tài chính thức:", "SCANMS - Hệ thống Quản lý Mạng lưới Tiếp thị liên kết & Cộng tác viên Đa Gian Hàng"),
        ("Giảng viên Hướng dẫn (Supervisor):", "ThS. Tôn Thất Hoàng Minh (MinhTTH5@fe.edu.vn)"),
        ("Đội ngũ thực hiện (4 thành viên):", "1. Nguyễn Thành Thắng (Leader - SE184251)\n2. Nguyễn Đình Tuấn (SE180104)\n3. Nguyễn Phú Quý (SE180104)\n4. Phan Xuân Thịnh (SE184527)"),
        ("Mục tiêu thẩm định Review 2:", "Thẩm định chất lượng sản phẩm thực tế, năng lực làm chủ code của từng cá nhân, xác nhận điều kiện PASS bảo vệ trước Hội đồng 1.1")
    ]
    
    for idx, (label, val) in enumerate(meta_data):
        row = meta_table.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.3)
        cell_val.width = Inches(4.4)
        set_cell_background(cell_lbl, HEX_SAND)
        set_cell_margins(cell_lbl, top=70, bottom=70, left=100, right=100)
        set_cell_margins(cell_val, top=70, bottom=70, left=100, right=100)
        
        p_l = cell_lbl.paragraphs[0]
        p_l.paragraph_format.space_after = Pt(0)
        r_l = p_l.add_run(label)
        r_l.font.name = "Calibri"
        r_l.font.bold = True
        r_l.font.size = Pt(10)
        r_l.font.color.rgb = C_DARK
        
        p_v = cell_val.paragraphs[0]
        p_v.paragraph_format.space_after = Pt(0)
        r_v = p_v.add_run(val)
        r_v.font.name = "Calibri"
        r_v.font.size = Pt(10)
        r_v.font.color.rgb = C_INK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ PHẦN 1 ------------------
    h1 = doc.add_heading("PHẦN 1: BỐI CẢNH AI MỚI & SỰ CHUYỂN DỊCH TRONG PHIẾU ĐÁNH GIÁ (RUBRIC)", level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    for r in h1.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_p1 = doc.add_paragraph()
    p_p1.paragraph_format.line_spacing = 1.15
    p_p1.paragraph_format.space_after = Pt(6)
    p_p1.add_run(
        "Trong bối cảnh công nghệ mới với sự bùng nổ mạnh mẽ của Trí tuệ Nhân tạo (GenAI, LLMs, AI Agent), "
        "quy trình thẩm định và nghiệm thu đồ án tốt nghiệp của Nhà trường đã có sự điều chỉnh mang tính bước ngoặt. "
        "Trước đây, các nhóm sinh viên có thể dựa vào tài liệu lý thuyết dày cộp hoặc giao diện mockup để vượt qua vòng đánh giá ban đầu. "
        "Tuy nhiên, hiện nay việc sinh mã hay soạn thảo tài liệu đã trở nên quá dễ dàng, do đó "
    )
    r_bold = p_p1.add_run("Giảng viên Review 2 sẽ không thẩm định 'lời hứa' mà thẩm định 'SỰ THẬT CHỨNG' (Proof of Working Product).")
    r_bold.font.bold = True

    add_callout([
        "• Review 2 đóng vai trò là 'Người gác cổng tối thượng' (Gatekeeper) quyết định danh sách sinh viên đủ điều kiện ra Hội đồng 1.1.",
        "• Quy chế thẩm định cá nhân nghiêm ngặt: Giảng viên có quyền đánh 'FAIL' từng cá nhân nếu không chứng minh được đóng góp thực tế, hoặc đánh 'FAIL cả nhóm' nếu hệ thống không thông suốt luồng dữ liệu E2E.",
        "• Chuyển từ 'Trình chiếu slide' sang 'Live Product Execution & Deep Code Defense'."
    ], title="THÔNG ĐIỆP ĐIỀU CHỈNH QUY TRÌNH REVIEW TỪ GIẢNG VIÊN REVIEW 2")

    p_p1_2 = doc.add_paragraph()
    p_p1_2.paragraph_format.space_after = Pt(4)
    r_sub1 = p_p1_2.add_run("4 Trụ cột Thẩm định mới trong Phiếu Đánh Giá của GV Review 2:")
    r_sub1.font.bold = True
    r_sub1.font.color.rgb = C_DARK

    rubric_tbl = doc.add_table(rows=5, cols=3)
    rubric_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    rubric_tbl.autofit = False
    set_table_borders(rubric_tbl, HEX_BORDER)

    rubric_headers = ["Trụ Cột Đánh Giá", "Tiêu Chuẩn Thẩm Định Của GV", "Hành Động Chuẩn Bị Của SCANMS"]
    for c_idx, h_text in enumerate(rubric_headers):
        cell = rubric_tbl.rows[0].cells[c_idx]
        set_cell_background(cell, HEX_GOLD_DARK)
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h_text)
        r.font.name = "Calibri"
        r.font.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    rubric_content = [
        ("1. Real Working Software\n(Sản phẩm vận hành thật)", 
         "Hệ thống phải kết nối Database thật, API chạy thật 100%. Nghiêm cấm hoàn toàn mock data, hardcoded dữ liệu hoặc nuốt lỗi.",
         "Toàn bộ dữ liệu chạy trên PostgreSQL (41 bảng 3NF) và Redis In-Memory; sẵn sàng Master Seed trong 10s."),
        ("2. Individual Code Ownership\n(Làm chủ mã nguồn cá nhân)",
         "Hỏi sâu từng dòng code, truy vấn SQL, cấu trúc Entity, cơ chế giải quyết xung đột (concurrency, transaction isolation).",
         "Mỗi thành viên sở hữu độc lập module, endpoint và bảng CSDL riêng; tự tin mở đúng dòng code giải trình trong 15s."),
        ("3. End-to-End Synergy\n(Khớp nối luồng đa vai trò)",
         "Chứng minh luồng dữ liệu thông suốt giữa 4 vai trò: Shop tạo hàng -> KOL xin mẫu & lấy link -> Khách mua -> Hoa hồng nhảy ví.",
         "Xây dựng kịch bản liên hoàn 5 Mainflows liền mạch, kiểm thử tương thích đa màn hình, không bị đứt gãy luồng nghiệp vụ."),
        ("4. Test Coverage & Edge Defense\n(Độ bao phủ kiểm thử & Lỗi)",
         "Nhóm phải chứng minh hệ thống xử lý được các tình huống biên: Race condition ví, Click spam, Hoàn đơn thu hồi hoa hồng.",
         "Xây dựng ma trận Test Cases bao phủ đầy đủ Happy Path, Edge Case, Security Case kèm bằng chứng thực thi thành công.")
    ]

    widths = [Inches(1.8), Inches(2.5), Inches(2.4)]
    for r_idx, (c1, c2, c3) in enumerate(rubric_content, start=1):
        row = rubric_tbl.rows[r_idx]
        bg = HEX_SAND if r_idx % 2 == 1 else HEX_WHITE
        for c_idx, text in enumerate([c1, c2, c3]):
            cell = row.cells[c_idx]
            cell.width = widths[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.color.rgb = C_INK
            if c_idx == 0:
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ PHẦN 2 ------------------
    h2 = doc.add_heading("PHẦN 2: KẾ HOẠCH DEMO CHI TIẾT (5 MAINFLOWS CHỦ ĐẠO)", level=1)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    for r in h2.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_p2_intro = doc.add_paragraph()
    p_p2_intro.paragraph_format.line_spacing = 1.15
    p_p2_intro.paragraph_format.space_after = Pt(6)
    p_p2_intro.add_run(
        "Kế hoạch Demo được thiết kế theo mô hình luân chuyển liên hoàn (Continuous Pipeline). "
        "Tổng thời lượng demo trực tiếp là 18 – 20 phút (trung bình 4 phút/thành viên), sau đó là 10 – 15 phút Q&A phản biện với GV Review 2. "
        "Mỗi Mainflow đại diện cho một mắt xích kinh doanh cốt lõi của sàn TMĐT Tiếp thị liên kết SCANMS:"
    )

    mainflows = [
        ("MAINFLOW 1: QUẢN TRỊ SÀN, PHÂN QUYỀN RBAC & ĐỊNH DANH KYC ĐA CẤP",
         "Phan Xuân Thịnh & Nguyễn Thành Thắng", "4.0 phút",
         "admin@scanms.vn, manager@scanms.vn, shop@techstore.vn, kol1@scanms.vn",
         [
             "1. Đăng nhập an toàn & RBAC Guard: Đăng nhập Google 1-Click hoặc email; chứng minh Customer không thể vào trang /merchant hay /admin (bị chặn 403 Forbidden).",
             "2. Nộp hồ sơ KYC cá nhân & pháp nhân (Nghị định 85/2021/NĐ-CP): KOL nộp CCCD 2 mặt + MST TNCN + STK; Shop nộp GPKD + MST doanh nghiệp + Kho lấy hàng.",
             "3. Thẩm duyệt hồ sơ KYC: Tài khoản manager@scanms.vn (Vận hành) kiểm tra tính hợp lệ và duyệt hồ sơ, kích hoạt quyền hạn nhận hoa hồng và mở bán ngay lập tức."
         ]),
        ("MAINFLOW 2: QUẢN LÝ SẢN PHẨM 6 KHỐI, CẤP MẪU THỬ 4 BƯỚC & ĐÀM PHÁN HOA HỒNG",
         "Nguyễn Phú Quý & Nguyễn Đình Tuấn", "4.5 phút",
         "shop@techstore.vn, kol1@scanms.vn",
         [
             "1. Shop đăng sản phẩm chuẩn 6 khối TMĐT: Nhập thông tin, ảnh 1:1, ma trận biến thể (Size/Dung tích), quy cách đóng gói, chính sách hoa hồng 2 chiều (% hoặc VNĐ).",
             "2. Quy trình xin mẫu thử 4 bước: KOL nộp đơn xin hàng mẫu dùng thử, cam kết trả video review trong vòng 14 ngày.",
             "3. Duyệt cấp mẫu & Shipping Simulator: Shop duyệt yêu cầu mẫu, hệ thống sinh mã vận đơn GHN-SMP-XXXXX và in phiếu giao hàng A6 có Barcode Code-128.",
             "4. Đàm phán hoa hồng 2 tầng: Mức cơ bản 10% công khai; Shop mở Chat realtime gửi thẻ mời VIP Exclusive Deal 18% hoa hồng riêng cho Top KOL."
         ]),
        ("MAINFLOW 3: CHIẾN DỊCH TIẾP THỊ AFFILIATE, SMART TRACKING & MUA HÀNG TRỰC TUYẾN",
         "Nguyễn Đình Tuấn & Phan Xuân Thịnh", "4.0 phút",
         "kol1@scanms.vn, customer@gmail.com",
         [
             "1. Bộ công cụ tiếp thị (Creator Toolkit): KOL sinh link rút gọn HMAC (scanms.vn/r/thangvip), tải Dynamic QR Code canvas và kích hoạt mã giảm giá riêng (THANGVIP10).",
             "2. Tracking Last-Click & Redis Rate Limit: Khách click link, hệ thống ghi nhận Cookie 30 ngày. Mô phỏng spam click 15 req/s -> Redis chặn đứng request thứ 11.",
             "3. Mua sắm & Giỏ hàng đồng bộ Database (PostgreSQL): Khách đăng nhập, thêm biến thể vào giỏ (đồng bộ đa thiết bị), checkout tự áp mã giảm giá KOL (-10%), trừ kho tức thời."
         ]),
        ("MAINFLOW 4: VẬN CHUYỂN, BẢO CHỨNG ESCROW 14 NGÀY & ĐỔI TRẢ THU HỒI CLAWBACK",
         "Nguyễn Phú Quý & Phan Xuân Thịnh", "4.0 phút",
         "shop@techstore.vn, customer@gmail.com, admin@scanms.vn",
         [
             "1. Đóng gói & Tra cứu vận đơn: Shop in phiếu A6 bàn giao bưu cục -> Khách dùng trang /tracking tra cứu tiến độ vận chuyển bằng Số điện thoại thời gian thực.",
             "2. Giao thành công & Quỹ Escrow 14 ngày: Bưu cục cập nhật DELIVERED -> Hoa hồng KOL tạm giữ ở Ví Chờ (PENDING) 14 ngày; Khách mở quyền đánh giá Verified Review.",
             "3. Đổi trả & Thu hồi hoa hồng (Clawback): Khách khiếu nại kèm video mở hộp; Shop duyệt hoàn tiền -> Hệ thống tự động kích hoạt Clawback hủy hoa hồng về 0đ."
         ]),
        ("MAINFLOW 5: VÍ TIỀN ĐỐI TÁC, PESSIMISTIC LOCK, THUẾ TNCN & BATCH PAYOUT VIETQR",
         "Nguyễn Thành Thắng", "4.5 phút",
         "kol1@scanms.vn, shop@techstore.vn, admin@scanms.vn",
         [
             "1. Tự duyệt hoa hồng sau 14 ngày: Cronjob quét đơn hàng hoàn tất an toàn quá 14 ngày, tự động chuyển tiền từ Ví Chờ sang Ví Khả Dụng (AVAILABLE).",
             "2. Rút tiền & Khóa dòng CSDL (SELECT FOR UPDATE): KOL bấm rút tiền; chứng minh CSDL khóa dòng chống âm ví khi có 2 request rút đồng thời (Double-spending).",
             "3. Khấu trừ 10% thuế TNCN: Tự động trích 10% thuế cho lệnh rút >= 2 triệu VNĐ, ghi nhận Sổ cái tài chính bất biến (Append-Only Financial Ledger).",
             "4. Quyết toán lô VietQR Napas 24/7: Shop/Admin kiểm tra KYC, bấm xuất file Excel VietQR Napas247 chuyển tiền hàng loạt; Cập nhật Leaderboard Top 10."
         ])
    ]

    for title, presenters, duration, accounts, steps in mainflows:
        h3 = doc.add_heading(f"⭐ {title}", level=2)
        h3.paragraph_format.space_before = Pt(10)
        h3.paragraph_format.space_after = Pt(3)
        for r in h3.runs:
            r.font.name = "Calibri"
            r.font.color.rgb = C_DARK

        p_info = doc.add_paragraph()
        p_info.paragraph_format.space_after = Pt(3)
        r_pres = p_info.add_run(f"• Người phụ trách chính: {presenters} | Thời lượng: {duration}\n")
        r_pres.font.bold = True
        r_pres.font.color.rgb = C_BRAND
        r_acc = p_info.add_run(f"• Tài khoản sử dụng: {accounts}")
        r_acc.font.italic = True
        r_acc.font.color.rgb = C_MUTED

        for s in steps:
            p_s = doc.add_paragraph()
            p_s.paragraph_format.space_before = Pt(1)
            p_s.paragraph_format.space_after = Pt(2)
            p_s.paragraph_format.line_spacing = 1.15
            p_s.add_run(s)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ PHẦN 3 ------------------
    h3_sec = doc.add_heading("PHẦN 3: MA TRẬN PHÂN CÔNG TRÁCH NHIỆM & CODE DEFENSE CÁ NHÂN", level=1)
    h3_sec.paragraph_format.space_before = Pt(14)
    h3_sec.paragraph_format.space_after = Pt(6)
    for r in h3_sec.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_p3 = doc.add_paragraph()
    p_p3.paragraph_format.line_spacing = 1.15
    p_p3.paragraph_format.space_after = Pt(6)
    p_p3.add_run(
        "Nhằm xóa bỏ hoàn toàn hiện tượng 'làm hộ / mượn bóng' và bảo đảm mỗi thành viên đều có thể tự tin bảo vệ mã nguồn, "
        "toàn bộ hệ thống SCANMS được phân định thành 4 khối chức năng độc lập (Workstreams), cân bằng 25% tỷ trọng đóng góp cho từng sinh viên:"
    )

    members = [
        ("1. NGUYỄN THÀNH THẮNG (Leader - SE184251) — Tỷ trọng: 25%",
         "Kiến trúc hệ thống SAD, Cơ chế Escrow 14 ngày, Ví tiền & Pessimistic Lock (SELECT FOR UPDATE), Quyết toán Payout VietQR, Khấu trừ thuế TNCN 10%, Chuỗi Sổ cái tài chính bất biến SHA-256, Đồng bộ Design System Vàng Be.",
         "WalletPage.tsx, PayoutApprovalPage.tsx, LoginPage.tsx, MarketplacePage.tsx, PublicHeader.tsx",
         "backend/src/modules/wallets/, modules/commissions/, modules/payouts/, modules/auth/",
         "wallets, wallet_transactions, financial_ledgers, payout_requests, commission_rules",
         "Chứng minh cú pháp SELECT FOR UPDATE trong TypeORM/Prisma chống race condition ví tiền khi nhiều luồng truy cập đồng thời; Giải thuật Escrow 14 ngày thích ứng kỳ nghỉ lễ Tết."),
        
        ("2. NGUYỄN ĐÌNH TUẤN (Thành viên - SE180104) — Tỷ trọng: 25%",
         "Phân hệ Tiếp thị liên kết (Affiliate Tracking), Động cơ sinh link rút gọn HMAC, Dynamic QR Code canvas 512x512, Cookie lưu trữ 30 ngày Last-Click, Redis Sliding Window Rate Limit chống spam click, Phân cấp hoa hồng 2 tầng.",
         "ReferralLinksPage.tsx, KolCouponsPage.tsx, SearchPage.tsx, PublicHeader.tsx",
         "backend/src/modules/referral-links/, modules/tracking/, modules/coupons/",
         "referral_links, click_traffic_logs, coupons, user_coupons",
         "Thuật toán mã hóa short_code HMAC; Cơ chế ghi nhận cookie attribution 30 ngày theo quy tắc Last-Click Wins; Cấu hình Redis In-Memory chặn ddos và click tặc bảo vệ CSDL."),
        
        ("3. NGUYỄN PHÚ QUÝ (Thành viên - SE180104) — Tỷ trọng: 25%",
         "Phân hệ Chủ Gian Hàng (Merchant Operations), CRUD Sản phẩm chuẩn 6 khối TMĐT, Quản lý tồn kho tức thời (Stock Deduction), Shipping Simulator in phiếu giao hàng A6 Barcode Code-128, Quy trình cấp hàng mẫu 4 bước.",
         "ProductManagementPage.tsx, ShopSampleManagementTab.tsx, ShippingLabel.tsx",
         "backend/src/modules/products/, modules/samples/, modules/orders/ (Shipping Logic)",
         "products, product_variants, sample_requests, stores, categories",
         "Thuật toán trừ kho tức thời chống over-selling; Chuẩn hóa phiếu in A6 Barcode Code-128 tương thích máy in nhiệt bưu cục; Trạng thái vòng đời hàng mẫu 14 ngày."),
        
        ("4. PHAN XUÂN THỊNH (Thành viên - SE184527) — Tỷ trọng: 25%",
         "Cổng Khách Hàng (Customer Portal), Giỏ hàng đồng bộ Database PostgreSQL (Omnichannel Cart), Quy trình khiếu nại đổi trả 14 ngày bắt buộc video mở hộp, Đánh giá thật Verified Review Gate, Quy trình thẩm định KYC đa cấp.",
         "CustomerPortalPage.tsx, CartDrawer.tsx, ReturnDisputeModal.tsx, KycApprovalPage.tsx",
         "backend/src/modules/customer/, modules/returns/, modules/reviews/, modules/kyc/",
         "cart_items, return_requests, product_reviews, kyc_profiles, customer_addresses",
         "Cơ chế đồng bộ giỏ hàng qua Database PostgreSQL đa thiết bị; Quy trình kiểm soát video mở hộp chống tráo hàng hoàn; Điều kiện chỉ đơn DELIVERED mới được mở quyền review 5 sao.")
    ]

    for m_title, m_scope, m_ui, m_api, m_db, m_defense in members:
        tbl_m = doc.add_table(rows=5, cols=2)
        tbl_m.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_m.autofit = False
        set_table_borders(tbl_m, HEX_BORDER)
        
        # Header row
        hdr_cell = tbl_m.rows[0].cells[0]
        hdr_cell.merge(tbl_m.rows[0].cells[1])
        set_cell_background(hdr_cell, HEX_DARK)
        set_cell_margins(hdr_cell, top=90, bottom=90, left=120, right=120)
        p_hdr = hdr_cell.paragraphs[0]
        r_hdr = p_hdr.add_run(m_title)
        r_hdr.font.name = "Calibri"
        r_hdr.font.bold = True
        r_hdr.font.size = Pt(10.5)
        r_hdr.font.color.rgb = RGBColor(0xC5, 0x9B, 0x58) # Brand Gold
        
        rows_data = [
            ("Phạm vi chức năng:", m_scope),
            ("Màn hình UI & Component:", m_ui),
            ("Backend Modules & API:", m_api),
            ("Bảng CSDL & Điểm phản biện:", f"• Bảng CSDL: {m_db}\n• Điểm phản biện kỹ thuật: {m_defense}")
        ]
        
        for r_i, (lbl, val) in enumerate(rows_data, start=1):
            row = tbl_m.rows[r_i]
            c_lbl, c_val = row.cells[0], row.cells[1]
            c_lbl.width = Inches(2.2)
            c_val.width = Inches(4.5)
            set_cell_background(c_lbl, HEX_SAND)
            set_cell_margins(c_lbl, top=70, bottom=70, left=100, right=100)
            set_cell_margins(c_val, top=70, bottom=70, left=100, right=100)
            
            p_l = c_lbl.paragraphs[0]
            p_l.paragraph_format.space_after = Pt(0)
            r_l = p_l.add_run(lbl)
            r_l.font.name = "Calibri"
            r_l.font.bold = True
            r_l.font.size = Pt(9.5)
            r_l.font.color.rgb = C_DARK
            
            p_v = c_val.paragraphs[0]
            p_v.paragraph_format.space_after = Pt(0)
            p_v.paragraph_format.line_spacing = 1.15
            r_v = p_v.add_run(val)
            r_v.font.name = "Calibri"
            r_v.font.size = Pt(9.5)
            r_v.font.color.rgb = C_INK
            
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ PHẦN 4 ------------------
    h4 = doc.add_heading("PHẦN 4: BỘ TEST CASES TOÀN DIỆN CHO CÁC MAINFLOWS DEMO", level=1)
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(6)
    for r in h4.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_p4 = doc.add_paragraph()
    p_p4.paragraph_format.line_spacing = 1.15
    p_p4.paragraph_format.space_after = Pt(6)
    p_p4.add_run(
        "Bộ Test Cases được biên soạn chặt chẽ theo chuẩn QA/QC, tập trung vào các trường hợp kiểm thử ranh giới (Boundary), "
        "xử lý lỗi (Exception handling), an toàn giao dịch và bảo mật để sẵn sàng chạy trực tiếp trước sự chứng kiến của Giảng viên Review 2:"
    )

    tc_list = [
        ("TC-MF1-01", "Chặn quyền truy cập trái phép (RBAC Guard)", "Security Case", "Phan Xuân Thịnh",
         "Tài khoản đã đăng nhập role CUSTOMER", "Truy cập trực tiếp URL /merchant/products hoặc /admin/analytics",
         "1. Đăng nhập khách hàng\n2. Gõ thủ công URL quản trị", "Bị chặn tức thời, chuyển hướng về / hoặc trả về mã 403 Forbidden"),
        
        ("TC-MF1-02", "Thẩm duyệt hồ sơ KYC cá nhân của KOL", "Happy Path", "Phan Xuân Thịnh",
         "KOL đã nộp CCCD 2 mặt, MST, STK ngân hàng", "Tài khoản manager@scanms.vn thẩm duyệt",
         "1. Mở hàng đợi KYC\n2. Đối soát chứng từ\n3. Bấm Phê duyệt", "Trạng thái chuyển sang VERIFIED, kích hoạt quyền nhận hoa hồng và tạo lệnh rút tiền"),
        
        ("TC-MF2-01", "Trừ tồn kho tức thời khi đặt hàng (Stock Deduction)", "Edge Case", "Nguyễn Phú Quý",
         "Sản phẩm mẫu có tồn kho stock = 5", "Khách mua đặt số lượng = 2",
         "1. Thêm 2 sp vào giỏ\n2. Xác nhận thanh toán thành công", "Tồn kho trong PostgreSQL giảm chính xác còn 3. Nếu khách cố tình đặt 6 sp, hệ thống chặn báo hết hàng"),
        
        ("TC-MF2-02", "Quy trình cấp mẫu thử & In phiếu vận đơn A6", "Happy Path", "Nguyễn Phú Quý",
         "KOL đã gửi yêu cầu xin sản phẩm mẫu dùng thử", "Shop duyệt và chọn đơn vị GHN",
         "1. Bấm Duyệt cấp mẫu\n2. Bấm In phiếu vận chuyển", "Hệ thống sinh mã GHN-SMP-XXXXX, mở modal in phiếu A6 có Barcode Code-128; Kích hoạt hạn nộp video 14 ngày"),
        
        ("TC-MF3-01", "Chống click tặc spam qua Redis Rate Limit", "Security / Edge", "Nguyễn Đình Tuấn",
         "Link rút gọn scanms.vn/r/thangvip đang hoạt động", "15 lượt click liên tiếp trong 1 giây từ cùng 1 địa chỉ IP",
         "Thực thi request dồn dập vào link tiếp thị", "10 click đầu được ghi nhận bình thường; từ click thứ 11 trả về mã lỗi 429 Too Many Requests, bảo vệ server"),
        
        ("TC-MF3-02", "Ghi nhận Cookie 30 ngày & Áp mã giảm giá tự động", "Happy Path", "Nguyễn Đình Tuấn",
         "Khách click link tiếp thị của KOL vào sàn", "Khách chọn sản phẩm và bấm Checkout",
         "1. Mở modal Đặt hàng nhanh\n2. Kiểm tra ô giảm giá", "Hệ thống tự động đọc Cookie attribution và điền sẵn mã ưu đãi THANGVIP10, giảm trừ 10% tổng đơn hàng"),
        
        ("TC-MF4-01", "Ràng buộc đánh giá thật (Verified Review Gate)", "Boundary Case", "Phan Xuân Thịnh",
         "Khách hàng có đơn hàng trạng thái PROCESSING/SHIPPED", "Khách bấm viết đánh giá 5 sao cho sản phẩm",
         "Truy cập vào mục đánh giá sản phẩm", "Nút đánh giá bị khóa kèm thông báo: Chỉ đơn hàng đã giao thành công (DELIVERED) mới được quyền đánh giá"),
        
        ("TC-MF4-02", "Thu hồi hoa hồng (Clawback) khi khách hoàn trả hàng", "Critical Business", "Nguyễn Thành Thắng",
         "Đơn hàng có hoa hồng 50.000đ ở trạng thái PENDING (Escrow)", "Khách nộp video mở hộp, Shop duyệt trả hàng",
         "1. Shop bấm Chấp thuận trả hàng\n2. Cập nhật trạng thái đơn", "Hệ thống tự động kích hoạt Clawback hủy hoa hồng về 0đ (CANCELLED), hoàn trả 100% tiền về ví khách hàng"),
        
        ("TC-MF5-01", "Chống âm ví khi rút tiền đồng thời (Pessimistic Lock)", "High Security", "Nguyễn Thành Thắng",
         "Ví KOL có số dư khả dụng 1.000.000 VNĐ", "Gửi cùng lúc 2 request rút 1.000.000đ (cách nhau 5ms)",
         "Thực thi 2 request đồng thời qua kịch bản test", "Request 1 thành công (khóa dòng SELECT FOR UPDATE), ví còn 0đ. Request 2 bị từ chối với thông báo Số dư không đủ"),
        
        ("TC-MF5-02", "Tự động trích 10% thuế TNCN cho lệnh rút >= 2 triệu", "Regulatory Case", "Nguyễn Thành Thắng",
         "Ví KOL có 3.000.000 VNĐ", "KOL tạo lệnh rút 2.500.000 VNĐ",
         "1. Nhập số tiền rút 2.500.000đ\n2. Bấm Xác nhận rút tiền", "Hệ thống tự động tách: Thực nhận 2.250.000đ, Thuế TNCN giữ lại 250.000đ (10%), ghi nhận Sổ cái tài chính"),
        
        ("TC-MF5-03", "Xuất file quyết toán theo định dạng VietQR Napas247", "Integration Case", "Nguyễn Thành Thắng",
         "Có 3 yêu cầu rút tiền hợp lệ đang chờ duyệt", "Shop/Admin bấm Xuất file VietQR Napas247",
         "Bấm nút xuất file và mở kiểm tra", "File XLSX chứa đầy đủ: Số TK, Mã ngân hàng BIN, Tên người nhận, Số tiền thực chuyển và Nội dung chuẩn Napas")
    ]

    tc_tbl = doc.add_table(rows=len(tc_list)+1, cols=6)
    tc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tc_tbl.autofit = False
    set_table_borders(tc_tbl, HEX_BORDER)

    tc_headers = ["Mã TC", "Tên Ca Kiểm Thử", "Phân Loại", "Người Phụ Trách", "Tiền Điều Kiện & Dữ Liệu", "Thao Tác & Kết Quả Mong Đợi"]
    for c_i, h_t in enumerate(tc_headers):
        cell = tc_tbl.rows[0].cells[c_i]
        set_cell_background(cell, HEX_GOLD_DARK)
        set_cell_margins(cell, top=90, bottom=90, left=80, right=80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h_t)
        r.font.name = "Calibri"
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    tc_col_widths = [Inches(0.9), Inches(1.3), Inches(0.9), Inches(1.0), Inches(1.3), Inches(1.3)]
    for r_i, (code, name, cat, owner, pre_cond, input_data, steps, expected) in enumerate(tc_list, start=1):
        row = tc_tbl.rows[r_i]
        bg = HEX_SAND if r_i % 2 == 1 else HEX_WHITE
        c4_val = f"• ĐK: {pre_cond}\n• Input: {input_data}"
        c5_val = f"• Thao tác:\n{steps}\n• Mong đợi:\n{expected}"
        row_vals = [code, name, cat, owner, c4_val, c5_val]
        for c_i, val in enumerate(row_vals):
            cell = row.cells[c_i]
            cell.width = tc_col_widths[c_i]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=70, bottom=70, left=70, right=70)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            r.font.color.rgb = C_INK
            if c_i == 0:
                r.font.bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif c_i == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ PHẦN 5 ------------------
    h5 = doc.add_heading("PHẦN 5: CHECKLIST CHUẨN BỊ KỸ THUẬT & QUẢN TRỊ RỦI RO", level=1)
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(6)
    for r in h5.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_p5 = doc.add_paragraph()
    p_p5.paragraph_format.line_spacing = 1.15
    p_p5.paragraph_format.space_after = Pt(6)
    p_p5.add_run(
        "Để đảm bảo buổi thẩm định diễn ra hoàn hảo 100% không gặp bất kỳ sự cố kỹ thuật nào, "
        "nhóm thiết lập quy trình kiểm tra trước giờ G và phương án dự phòng chi tiết:"
    )

    checklists = [
        ("1. Reset Dữ liệu Mẫu (Clean Master Seed):",
         "Chuẩn bị sẵn lệnh `npm run seed` trong terminal backend. Script tự động xóa và tái tạo toàn bộ dữ liệu sạch (Users, Store, Products, Orders, Wallets) chỉ trong vòng 10 giây nếu cần làm mới giữa các phần demo."),
        ("2. Bố trí 4 Cửa sổ Trình duyệt độc lập (Multi-Profile Setup):",
         "• Cửa sổ 1: Đăng nhập shop@techstore.vn (Chủ Gian hàng Sora Skin).\n"
         "• Cửa sổ 2: Đăng nhập kol1@scanms.vn (KOL Nguyễn Thành Thắng).\n"
         "• Cửa sổ 3: Đăng nhập manager@scanms.vn (Chuyên viên Vận hành & Tuân thủ KYC).\n"
         "• Cửa sổ 4: Đăng nhập customer@gmail.com (Khách mua sắm trực tuyến)."),
        ("3. Kiểm tra Console Log & Network Tab F12:",
         "Đảm bảo F12 không có bất kỳ dòng chữ đỏ console.error nào; ẩn toàn bộ log debug thừa thãi; kiểm tra các response API đạt HTTP 200/201 chuẩn mực."),
        ("4. Phương án Dự phòng khi mất Internet hoặc API bên ngoài bị lỗi:",
         "• Hệ thống chạy 100% trên Localhost (Port 5173 và 3000) cùng Docker PostgreSQL + Redis, độc lập hoàn toàn với Internet bên ngoài.\n"
         "• Các nghiệp vụ giao vận (GHN) và thanh toán ngân hàng (VietQR) đều tích hợp cơ chế Simulator doanh nghiệp, bảo đảm luồng nghiệp vụ thông suốt không bị nghẽn.")
    ]

    for c_title, c_desc in checklists:
        p_c = doc.add_paragraph()
        p_c.paragraph_format.space_before = Pt(2)
        p_c.paragraph_format.space_after = Pt(3)
        p_c.paragraph_format.line_spacing = 1.15
        r_ct = p_c.add_run(f"✅ {c_title} ")
        r_ct.font.name = "Calibri"
        r_ct.font.bold = True
        r_ct.font.color.rgb = C_DARK
        r_cd = p_c.add_run(c_desc)
        r_cd.font.name = "Calibri"
        r_cd.font.color.rgb = C_INK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ------------------ KẾT LUẬN & CHỮ KÝ ------------------
    h_end = doc.add_heading("CAM KẾT CỦA NHÓM ĐỒ ÁN SCANMS (FA26SE032)", level=2)
    h_end.paragraph_format.space_before = Pt(12)
    h_end.paragraph_format.space_after = Pt(6)
    for r in h_end.runs:
        r.font.name = "Calibri"
        r.font.color.rgb = C_BRAND

    p_end = doc.add_paragraph()
    p_end.paragraph_format.line_spacing = 1.15
    p_end.paragraph_format.space_after = Pt(14)
    p_end.add_run(
        "Tập thể 4 thành viên nhóm SCANMS cam kết nghiêm túc thực hiện đúng kế hoạch nêu trên. "
        "Mỗi thành viên tự chịu trách nhiệm 100% đối với phần mã nguồn và chức năng mình đảm nhiệm, "
        "quyết tâm bảo vệ thành công trước Giảng viên Review 2 để đạt điều kiện chính thức bước vào Hội đồng 1.1 với kết quả xuất sắc nhất!"
    )

    # Signature Table
    sig_table = doc.add_table(rows=3, cols=4)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.autofit = False
    set_table_borders(sig_table, HEX_BORDER)

    sigs = [
        ("Trưởng nhóm (Leader)", "Nguyễn Thành Thắng"),
        ("Thành viên", "Nguyễn Đình Tuấn"),
        ("Thành viên", "Nguyễn Phú Quý"),
        ("Thành viên", "Phan Xuân Thịnh")
    ]

    for idx, (role, name) in enumerate(sigs):
        cell_top = sig_table.rows[0].cells[idx]
        cell_mid = sig_table.rows[1].cells[idx]
        cell_bot = sig_table.rows[2].cells[idx]
        
        for c in [cell_top, cell_mid, cell_bot]:
            c.width = Inches(1.68)
            set_cell_background(c, HEX_SAND)
            set_cell_margins(c, top=60, bottom=60, left=50, right=50)
            
        p_r = cell_top.paragraphs[0]
        p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_r = p_r.add_run(role)
        r_r.font.name = "Calibri"
        r_r.font.bold = True
        r_r.font.size = Pt(9.5)
        r_r.font.color.rgb = C_DARK
        
        p_m = cell_mid.paragraphs[0]
        p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_m = p_m.add_run("(Ký & ghi rõ họ tên)\n\n\n")
        r_m.font.italic = True
        r_m.font.size = Pt(8.5)
        r_m.font.color.rgb = C_MUTED
        
        p_n = cell_bot.paragraphs[0]
        p_n.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_n = p_n.add_run(name)
        r_n.font.name = "Calibri"
        r_n.font.bold = True
        r_n.font.size = Pt(10)
        r_n.font.color.rgb = C_BRAND

    # Save files
    out_dir = os.path.join(os.getcwd(), "docs", "review 2")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "FA26SE032_SCANMS_Ke_Hoach_Chuan_Bi_Review_2_Va_Hoi_Dong_1.1.docx")
    doc.save(out_path)
    print(f"Generated successfully: {out_path}")

if __name__ == "__main__":
    create_review2_doc()
