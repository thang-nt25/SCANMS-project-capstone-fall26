import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding."""
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

def create_callout_box(doc, title, text, bg_hex="FBF5EB", border_hex="C59B58"):
    """Creates a stylized callout box."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Border
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
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(11)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(184, 142, 79)
    
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(26, 22, 18)
    
    # Empty paragraph after table
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)

def generate_word_document():
    doc = docx.Document()
    
    # Page setup - Margins 1 inch
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header / Footer
        header = section.header
        p_head = header.paragraphs[0]
        p_head.text = "SCANMS (FA26SE032) — TỔNG HỢP CẢI THIỆN NGHIỆP VỤ & SO SÁNH SHOPEE, TIKTOK SHOP"
        p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_head.style.font.name = "Calibri"
        p_head.style.font.size = Pt(8.5)
        p_head.style.font.color.rgb = RGBColor(125, 113, 94)

    # Palette
    color_navy = RGBColor(27, 54, 93)      # #1B365D
    color_gold = RGBColor(184, 142, 79)    # #B88E4F
    color_ink = RGBColor(26, 22, 18)       # #1A1612
    color_muted = RGBColor(100, 116, 139)  # Slate
    
    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(4)
    run_tag = p_title.add_run("ĐỒ ÁN TỐT NGHIỆP CAPSTONE PROJECT — FA26SE032\n")
    run_tag.font.name = "Calibri"
    run_tag.font.size = Pt(11)
    run_tag.font.bold = True
    run_tag.font.color.rgb = color_gold
    
    run_main_title = p_title.add_run("TỔNG HỢP CÁC CHỨC NĂNG CẦN CẢI THIỆN, ĐỐI CHIẾU SHOPEE & TIKTOK SHOP\nVÀ ĐẶC TẢ LUỒNG VẬN HÀNH KHÉP KÍN CHO SCANMS\n")
    run_main_title.font.name = "Calibri"
    run_main_title.font.size = Pt(16)
    run_main_title.font.bold = True
    run_main_title.font.color.rgb = color_navy

    # Metadata subtitle
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(16)
    run_meta = p_meta.add_run("Trưởng nhóm: Nguyễn Thành Thắng (SE184251) | GVHD: ThS. Tôn Thất Hoàng Minh | Thời gian: Fall 2026")
    run_meta.font.name = "Calibri"
    run_meta.font.size = Pt(10)
    run_meta.font.italic = True
    run_meta.font.color.rgb = color_muted

    # ========================================================
    # SECTION 1: QUYẾT ĐỊNH CỐT LÕI
    # ========================================================
    h1_1 = doc.add_paragraph()
    h1_1.paragraph_format.space_before = Pt(12)
    h1_1.paragraph_format.space_after = Pt(4)
    r_h1_1 = h1_1.add_run("1. QUYẾT ĐỊNH CỐT LÕI: BỎ KHÁCH VÃNG LAI (100% BẮT BUỘC ĐĂNG NHẬP TRƯỚC CHECKOUT)")
    r_h1_1.font.name = "Calibri"
    r_h1_1.font.size = Pt(13)
    r_h1_1.font.bold = True
    r_h1_1.font.color.rgb = color_navy

    create_callout_box(
        doc,
        "KẾT LUẬN CHIẾN LƯỢC CỦA NHÓM",
        "Nhóm quyết định CHÍNH THỨC BỎ LUỒNG KHÁCH VÃNG LAI (Guest Checkout) khi thanh toán. Khách hàng vẫn thoải mái duyệt sản phẩm, xem video review và tìm kiếm; nhưng khi bấm 'Thêm vào giỏ' hoặc 'Đặt mua ngay', hệ thống yêu cầu đăng nhập/đăng ký. Nhờ tích hợp Google SSO 1-Click (chỉ mất 1.5 giây), trải nghiệm người dùng cực kỳ thuận tiện và không gây khó chịu.",
        bg_hex="FFF8ED",
        border_hex="B88E4F"
    )

    doc.add_paragraph("Lý do quyết định này giúp hệ thống SCANMS trở nên hoàn hảo, không kẽ hở:", style='List Bullet')
    reasons = [
        ("Loại bỏ rủi ro mất đơn hàng:", " Khách mua không còn phải lo lưu giữ mã đơn thủ công. Tất cả đơn hàng vĩnh viễn gắn liền với User ID, vào Cổng Khách Hàng (/customer/orders) là tra cứu được ngay."),
        ("Nền tảng bảo đảm cho Đổi trả & Hoàn tiền (Refund):", " Chỉ tài khoản chính chủ mới có quyền mở khiếu nại tranh chấp, gửi video bằng chứng khui hàng và nhận lại tiền hoàn."),
        ("Đồng bộ giỏ hàng đa thiết bị (Cart Synchronization):", " Khách lướt điện thoại thêm hàng vào giỏ, khi mở laptop lên đăng nhập thì giỏ hàng vẫn còn nguyên vẹn nhờ lưu trữ tập trung tại Database thay vì chỉ nằm ở LocalStorage máy khách."),
        ("Ràng buộc đánh giá thật (Verified Buyer Review):", " Ngăn chặn 100% tình trạng spam đánh giá ảo hoặc cạnh tranh bẩn từ đối thủ. Chỉ khách hàng đã mua và đơn hàng hoàn tất mới được chấm 5★ và viết review."),
        ("Minh bạch cho Tiếp thị liên kết (Affiliate Attribution):", " Cookie Last-Click 30 ngày được ghim chặt chẽ vào tài khoản khách, đảm bảo quyền lợi hoa hồng cho KOL không bị thất lạc.")
    ]
    for bold_txt, norm_txt in reasons:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        r_b = p.add_run(bold_txt)
        r_b.font.bold = True
        r_b.font.color.rgb = color_ink
        r_n = p.add_run(norm_txt)
        r_n.font.color.rgb = color_ink

    # ========================================================
    # SECTION 2: BẢNG SO SÁNH SHOPEE VS TIKTOK SHOP VS SCANMS
    # ========================================================
    h1_2 = doc.add_paragraph()
    h1_2.paragraph_format.space_before = Pt(16)
    h1_2.paragraph_format.space_after = Pt(6)
    r_h1_2 = h1_2.add_run("2. BẢNG SO SÁNH ĐỐI CHIẾU THỰC CHIẾN: SCANMS vs SHOPEE vs TIKTOK SHOP")
    r_h1_2.font.name = "Calibri"
    r_h1_2.font.size = Pt(13)
    r_h1_2.font.bold = True
    r_h1_2.font.color.rgb = color_navy

    # Table comparison
    table_comp = doc.add_table(rows=1, cols=4)
    table_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_comp.autofit = False

    comp_headers = ["Tiêu Chí Nghiệp Vụ", "Shopee", "TikTok Shop", "Giải Pháp Đề Xuất Cho SCANMS"]
    widths_comp = [Inches(1.5), Inches(1.6), Inches(1.6), Inches(2.0)]
    
    # Header row
    hdr_cells = table_comp.rows[0].cells
    for i, title in enumerate(comp_headers):
        hdr_cells[i].text = title
        hdr_cells[i].width = widths_comp[i]
        set_cell_background(hdr_cells[i], "1B365D")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    comp_data = [
        (
            "1. Tài khoản khách mua",
            "Bắt buộc 100% đăng nhập trước khi checkout.",
            "Bắt buộc 100% đăng nhập qua TikTok ID.",
            "Bỏ khách vãng lai; Bắt buộc đăng nhập qua Google SSO 1-Click hoặc Email/Password."
        ),
        (
            "2. Kiểm duyệt Gian hàng (Shop Onboarding)",
            "Nộp CCCD, GPKD, đối chiếu tài khoản ngân hàng chính chủ.",
            "Xác minh danh tính nghiêm ngặt, chấm điểm vi phạm vận hành.",
            "Quy trình KYC 2 tầng: Nộp hồ sơ -> System Manager phê duyệt mới được mở bán công khai."
        ),
        (
            "3. Kiểm duyệt Sản phẩm (Product Moderation)",
            "Sản phẩm đăng lên bị quét AI & duyệt nội dung trước khi hiển thị.",
            "Duyệt hình ảnh, từ cấm, giấy phép chuyên ngành trước khi mở bán.",
            "Tách bạch: Shop tạo dạng DRAFT -> Gửi duyệt -> Manager duyệt mới được APPROVED lên sàn."
        ),
        (
            "4. Vận chuyển & Giao hàng",
            "Tích hợp GHN, GHTK, ViettelPost, SPX. Bấm in vận đơn tự động.",
            "Tích hợp J&T, NinjaVan. Webhook cập nhật hành trình thời gian thực.",
            "Xây dựng Shipping Simulator: Tự sinh mã GHN-XXXX, in phiếu giao hàng, giả lập đổi trạng thái demo."
        ),
        (
            "5. Quản lý Tồn kho (Inventory)",
            "Trừ kho tức thời khi đặt đơn, cảnh báo khi tồn kho thấp.",
            "Kho đồng bộ realtime, hết hàng tự động dừng ghim livestream.",
            "Tồn kho trừ ngay khi tạo đơn; Cảnh báo Notification khi tồn <= 5; Hết hàng tự khóa mua và link."
        ),
        (
            "6. Đổi trả & Hoàn tiền (Refund)",
            "Khách gửi yêu cầu -> Shop duyệt/từ chối -> Shopee trọng tài nếu cãi nhau.",
            "Bắt buộc có video mở hộp -> Shop đối soát -> Tự động hoàn tiền ví.",
            "Xây dựng Module Đổi trả 14 ngày: Gắn với Escrow giữ tiền; Khách đính kèm video; Manager phân xử nếu tranh chấp."
        ),
        (
            "7. KOL Tiếp thị & Livestream",
            "Affiliate mở cho sản phẩm Open; Nhãn hàng cấp deal riêng.",
            "Thêm vào Showcase với đồ Open; Deal VIP đàm phán riêng; Voucher live chỉ có hạn trong live.",
            "2 chế độ hoa hồng: Cơ bản (Open tự tạo link) & Độc quyền (thương lượng qua chat); Voucher Live theo phiên."
        ),
        (
            "8. Đánh giá sản phẩm (Rating)",
            "Chỉ đơn hàng đã giao thành công mới được viết đánh giá.",
            "Chỉ người mua thật đã nhận kiện hàng mới được review 5★.",
            "Review Gate: Bắt buộc đơn chuyển trạng thái COMPLETED mới mở quyền đánh giá sản phẩm."
        )
    ]

    for row_idx, data in enumerate(comp_data):
        row = table_comp.add_row()
        cells = row.cells
        bg_color = "FAF8F5" if row_idx % 2 == 0 else "FFFFFF"
        for i, text in enumerate(data):
            cells[i].text = text
            cells[i].width = widths_comp[i]
            set_cell_background(cells[i], bg_color)
            set_cell_margins(cells[i], top=80, bottom=80, left=100, right=100)
            p = cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9)
                r.font.color.rgb = color_ink
                if i == 0:
                    r.font.bold = True
                    r.font.color.rgb = color_navy

    # Empty paragraph
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ========================================================
    # SECTION 3: 8 NỘI DUNG CẢI THIỆN CHI TIẾT
    # ========================================================
    h1_3 = doc.add_paragraph()
    h1_3.paragraph_format.space_before = Pt(14)
    h1_3.paragraph_format.space_after = Pt(4)
    r_h1_3 = h1_3.add_run("3. CHI TIẾT 8 HẠNG MỤC CẦN CẢI THIỆN ĐỂ HỆ THỐNG 'KHÔNG KẼ HỞ'")
    r_h1_3.font.name = "Calibri"
    r_h1_3.font.size = Pt(13)
    r_h1_3.font.bold = True
    r_h1_3.font.color.rgb = color_navy

    items = [
        (
            "1. TÍCH HỢP VẬN CHUYỂN CHUYÊN NGHIỆP (SHIPPING SIMULATOR)",
            [
                ("Vấn đề hiện tại:", " SCANMS chỉ lưu trackingCode dạng text thô, chủ Shop phải tự copy mã bên ngoài."),
                ("Giải pháp Capstone:", " Xây dựng Bộ mô phỏng Đơn vị vận chuyển (Shipping Simulator) chuẩn GHN/GHTK:"),
                ("  • Mã vận đơn tự động:", " Khi Shop bấm 'Xác nhận đơn & Giao hàng', hệ thống tự sinh mã vận đơn chuẩn (VD: GHN-20268492)."),
                ("  • In phiếu giao hàng (Shipping Label):", " Bổ sung nút in phiếu đóng gói gồm mã vạch Barcode, thông tin người nhận, địa chỉ giao hàng và mã đơn."),
                ("  • Điều khiển trạng thái demo:", " Cho phép bấm mô phỏng cập nhật: Đã lấy hàng -> Đang giao -> Giao thành công (để phục vụ giảng viên kiểm thử luồng chuyển giao tức thì).")
            ]
        ),
        (
            "2. QUẢN LÝ KHO & CẢNH BÁO SẮP HẾT HÀNG (INVENTORY ENGINE)",
            [
                ("Vấn đề hiện tại:", " Chỉ có trường stock cố định, không có lịch sử biến động và không có cảnh báo."),
                ("Giải pháp Capstone:", " Bổ sung logic trừ kho tức thời khi đặt hàng thành công và hoàn trả kho nếu hủy đơn."),
                ("  • Cảnh báo tồn kho thấp (Low Stock Alert):", " Khi số lượng tồn kho <= 5 sản phẩm, hệ thống tự động bắn Notification và gửi Email nhắc nhở chủ Shop nhập hàng."),
                ("  • Khóa bán khi hết hàng:", " Khi tồn kho về 0, tự động làm mờ nút 'Thêm vào giỏ', hiển thị nhãn 'Hết hàng', và khóa tính năng tạo link affiliate của KOL.")
            ]
        ),
        (
            "3. XỬ LÝ ĐƠN HỦY CHỦ ĐỘNG TỪ PHÍA SHOP (SHOP CANCELLATION)",
            [
                ("Vấn đề hiện tại:", " Shop không thể chủ động hủy đơn khi phát hiện hết hàng hoặc sai sót thông tin."),
                ("Giải pháp Capstone:", " Bổ sung nút 'Hủy đơn hàng' trên Dashboard Chủ Shop kèm danh sách lý do (Hết hàng đột xuất, Không liên lạc được khách, Khách yêu cầu hủy qua điện thoại)."),
                ("  • Cơ chế hoàn tiền tự động:", " Khi Shop hủy, hệ thống tự động hoàn tiền vào số dư ví của khách (nếu đã thanh toán) và hủy bỏ giao dịch hoa hồng tạm giữ của KOL.")
            ]
        ),
        (
            "4. QUY TRÌNH ĐỔI TRẢ & HOÀN TIỀN 14 NGÀY (RETURN & REFUND ATTACHED TO ESCROW)",
            [
                ("Vấn đề hiện tại:", " SCANMS có cơ chế Escrow giữ tiền 14 ngày nhưng chưa có giao diện cho khách gửi yêu cầu trả hàng."),
                ("Giải pháp Capstone:", " Xây dựng module Đổi trả / Khiếu nại toàn diện:"),
                ("  • Điều kiện hợp lệ:", " Trong vòng 14 ngày kể từ khi đơn chuyển trạng thái 'Đã nhận hàng'; Khách bắt buộc đính kèm ảnh/video mở hộp đồng kiểm."),
                ("  • Luồng 3 bên:", " Khách gửi yêu cầu -> Shop xem xét (Chấp nhận thì hoàn tiền; Từ chối phải ghi rõ lý do). Nếu không thống nhất, System Manager đứng ra làm trọng tài phán quyết.")
            ]
        ),
        (
            "5. KIỂM DUYỆT 2 TẦNG: SHOP KYC & KIỂM DUYỆT SẢN PHẨM",
            [
                ("Vấn đề hiện tại:", " Shop tạo tài khoản xong là đăng sản phẩm bán được ngay, tiềm ẩn rủi ro hàng giả và vi phạm pháp lý."),
                ("Giải pháp Capstone:", " Tách bạch rõ 2 khái niệm 'Đăng sản phẩm' và 'Bán sản phẩm':"),
                ("  • Tầng 1 (Shop Onboarding):", " Shop đăng ký ở trạng thái DRAFT. Nộp CCCD, MST, STK ngân hàng. System Manager duyệt xong mới chuyển sang VERIFIED."),
                ("  • Tầng 2 (Product Moderation):", " Shop tạo sản phẩm ban đầu chỉ là bản nháp (DRAFT). Khi bấm 'Gửi duyệt', System Manager kiểm tra nội dung/ảnh rồi duyệt (APPROVED) mới được hiển thị công khai trên Marketplace và mở cổng Affiliate.")
            ]
        ),
        (
            "6. CƠ CHẾ PHÂN CẤP HOA HỒNG KOL & VOUCHER LIVESTREAM",
            [
                ("Vấn đề hiện tại:", " Mức hoa hồng đang cố định cho tất cả mọi người, chưa hỗ trợ thương lượng riêng."),
                ("Giải pháp Capstone:", " Phân chia 2 cấp độ hoa hồng rõ ràng:"),
                ("  • Cấp độ 1 (Open Offer):", " Mức hoa hồng cơ bản (VD: 15%) áp dụng cho mọi KOL đã KYC thành công, tự động bấm tạo link rút gọn /r/:code."),
                ("  • Cấp độ 2 (Exclusive Deal):", " KOL liên hệ Shop qua Chat -> Shop cấp mức hoa hồng VIP (VD: 25%) kèm Coupon riêng sau khi đàm phán."),
                ("  • Voucher Livestream:", " Voucher phiên live có thời gian hiệu lực khớp với khung giờ phát sóng; hết phiên live voucher tự động đóng.")
            ]
        ),
        (
            "7. RÀNG BUỘC ĐÁNH GIÁ SẢN PHẨM (VERIFIED PURCHASE REVIEW)",
            [
                ("Vấn đề hiện tại:", " Form đánh giá sản phẩm chưa kiểm tra trạng thái đơn hàng của người dùng."),
                ("Giải pháp Capstone:", " Ràng buộc chặt chẽ: Chỉ những tài khoản có đơn hàng chứa sản phẩm đó và đơn đã chuyển sang trạng thái COMPLETED (Đã nhận hàng) mới được mở quyền đánh giá 5★ và tải ảnh feedback.")
            ]
        ),
        (
            "8. PHÂN TÁCH VAI TRÒ SYSTEM_MANAGER vs SYSTEM_ADMIN",
            [
                ("Vấn đề hiện tại:", " Trước đây gộp chung khiến khó phân định trách nhiệm công việc."),
                ("Giải pháp Capstone:", " Đã phân tách hoàn toàn độc lập:"),
                ("  • SYSTEM_MANAGER (Vận Hành & Tuân Thủ):", " Chuyên trách hàng đợi kiểm duyệt: Duyệt Shop KYC, Duyệt Sản phẩm mới, Duyệt KOL nâng cấp, Xử lý khiếu nại tranh chấp đổi trả, Giám sát cảnh báo gian lận traffic."),
                ("  • SYSTEM_ADMIN (Quản Trị Tối Cao):", " Cấu hình hệ thống toàn sàn, Phân quyền người dùng RBAC, Thiết lập tỷ lệ khấu trừ thuế TNCN 10%, Phí dịch vụ sàn, Giám sát an ninh mạng toàn diện.")
            ]
        )
    ]

    for title, points in items:
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(8)
        p_sec.paragraph_format.space_after = Pt(2)
        r_sec = p_sec.add_run(title)
        r_sec.font.name = "Calibri"
        r_sec.font.size = Pt(11)
        r_sec.font.bold = True
        r_sec.font.color.rgb = color_gold

        for bold_p, norm_p in points:
            p_bullet = doc.add_paragraph(style='List Bullet')
            p_bullet.paragraph_format.space_after = Pt(2)
            rb = p_bullet.add_run(bold_p)
            rb.font.bold = True
            rb.font.size = Pt(9.5)
            rb.font.color.rgb = color_ink
            rn = p_bullet.add_run(norm_p)
            rn.font.size = Pt(9.5)
            rn.font.color.rgb = color_ink

    # ========================================================
    # SECTION 4: KẾ HOẠCH HÀNH ĐỘNG (ACTION PLAN)
    # ========================================================
    h1_4 = doc.add_paragraph()
    h1_4.paragraph_format.space_before = Pt(16)
    h1_4.paragraph_format.space_after = Pt(6)
    r_h1_4 = h1_4.add_run("4. KẾ HOẠCH HÀNH ĐỘNG PHÂN KỲ TRIỂN KHAI (ACTION PLAN)")
    r_h1_4.font.name = "Calibri"
    r_h1_4.font.size = Pt(13)
    r_h1_4.font.bold = True
    r_h1_4.font.color.rgb = color_navy

    # Table Action Plan
    tbl_plan = doc.add_table(rows=1, cols=3)
    tbl_plan.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_plan.autofit = False

    plan_headers = ["Giai Đoạn", "Nội Dung Thực Hiện Trọng Tâm", "Mục Tiêu Đạt Được"]
    plan_widths = [Inches(1.5), Inches(3.4), Inches(1.8)]

    for idx, h_text in enumerate(plan_headers):
        c = tbl_plan.rows[0].cells[idx]
        c.text = h_text
        c.width = plan_widths[idx]
        set_cell_background(c, "1B365D")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    plan_rows = [
        (
            "GIAI ĐOẠN 1\n(Ưu tiên số 1 - Bảo vệ Đồ án)",
            "1. Khóa bắt buộc 100% Khách có tài khoản qua Google SSO hoặc Email.\n"
            "2. Hoàn thiện quy trình kiểm duyệt 2 tầng: Duyệt Shop KYC & Duyệt Sản phẩm draft trước khi public.\n"
            "3. Xây dựng Module Đổi trả / Hoàn tiền 14 ngày gắn với Escrow.\n"
            "4. Thêm chức năng trừ kho tức thời và cảnh báo số lượng tồn <= 5.\n"
            "5. Thêm Shipping Simulator (sinh mã GHN và nút in phiếu giao hàng).\n"
            "6. Khóa quyền đánh giá sản phẩm chỉ cho đơn COMPLETED.",
            "Hoàn thiện 100% luồng E2E khép kín, logic, bảo vệ đồ án tự tin trước Hội đồng chấm điểm mà không bị bắt lỗi hổng nghiệp vụ."
        ),
        (
            "GIAI ĐOẠN 2\n(Nâng cao - Về sau)",
            "1. Tích hợp Webhook kết nối API thật với các hãng GHN/GHTK.\n"
            "2. Voucher phiên Livestream có countdown tự hủy khi hết live.\n"
            "3. Hệ thống Loyalty Points tích điểm đổi quà.\n"
            "4. Chat trực tiếp Khách hàng ⇄ Chủ Shop.",
            "Nâng cấp sàn thương mại tiệm cận quy mô sản phẩm thương mại thật tế (Production-ready)."
        )
    ]

    for r_i, (phase, content, goal) in enumerate(plan_rows):
        row = tbl_plan.add_row()
        cells = row.cells
        cells[0].text = phase
        cells[1].text = content
        cells[2].text = goal
        
        bg_c = "FFF8ED" if r_i == 0 else "FAF8F5"
        for i_c in range(3):
            cells[i_c].width = plan_widths[i_c]
            set_cell_background(cells[i_c], bg_c)
            set_cell_margins(cells[i_c], top=80, bottom=80, left=100, right=100)
            p = cells[i_c].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i_c == 0 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9)
                r.font.color.rgb = color_ink
                if i_c == 0:
                    r.font.bold = True
                    r.font.color.rgb = color_navy if r_i == 0 else color_muted

    # Save Document
    output_docx = r"c:\HW\CAPSTONE\docs\SCANMS_Tong_Hop_Cai_Thien_He_Thong_Va_So_Sanh_Shopee_TikTokShop_2026.docx"
    doc.save(output_docx)
    print(f"Document created successfully at: {output_docx}")

if __name__ == "__main__":
    generate_word_document()
