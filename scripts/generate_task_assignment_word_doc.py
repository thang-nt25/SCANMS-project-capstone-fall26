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

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
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
        p_head.text = "SCANMS (FA26SE032) — KẾ HOẠCH PHÂN CÔNG NHIỆM VỤ NHÓM"
        p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_head.style.font.name = "Calibri"
        p_head.style.font.size = Pt(8.5)
        p_head.style.font.color.rgb = RGBColor(125, 113, 94)

    color_navy = RGBColor(27, 54, 93)      # #1B365D
    color_gold = RGBColor(184, 142, 79)    # #B88E4F
    color_ink = RGBColor(26, 22, 18)       # #1A1612
    color_muted = RGBColor(100, 116, 139)  # Slate
    
    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(4)
    run_tag = p_title.add_run("ĐỒ ÁN TỐT NGHIỆP CAPSTONE PROJECT — HỌC KỲ FALL 2026\n")
    run_tag.font.name = "Calibri"
    run_tag.font.size = Pt(11)
    run_tag.font.bold = True
    run_tag.font.color.rgb = color_gold
    
    run_main_title = p_title.add_run("BẢN PHÂN CÔNG NHIỆM VỤ CẢI THIỆN HỆ THỐNG SCANMS\nTHEO CHUYÊN MÔN VÀ VAI TRÒ (ROLES) ĐÃ TÌM HIỂU\n")
    run_main_title.font.name = "Calibri"
    run_main_title.font.size = Pt(16)
    run_main_title.font.bold = True
    run_main_title.font.color.rgb = color_navy

    # Subtitle
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(16)
    run_meta = p_meta.add_run("Mã đề tài: FA26SE032 | Trưởng nhóm: Nguyễn Thành Thắng | GVHD: ThS. Tôn Thất Hoàng Minh")
    run_meta.font.name = "Calibri"
    run_meta.font.size = Pt(10)
    run_meta.font.italic = True
    run_meta.font.color.rgb = color_muted

    # Callout overview
    create_callout_box(
        doc,
        "NGUYÊN TẮC PHÂN CÔNG CỦA NHÓM",
        "Bản phân công này được xây dựng dựa trên nguyên tắc: 'ĐÚNG NGƯỜI - ĐÚNG VIỆC ĐÃ TÌM HIỂU - KHỐI LƯỢNG ĐỒNG ĐỀU'. Quý phụ trách phân hệ Chủ Shop; Tuấn phụ trách phân hệ KOL & Admin; Thịnh phụ trách phân hệ Khách hàng; Thắng (Leader) chia sẻ công việc cùng Thịnh và đảm nhiệm phần Core Bảo mật & Thanh toán; Nhật phụ trách kết nối Realtime Chat & Notification Center. Mỗi thành viên đều nắm trọn vẹn từ Giao diện UI, Logic Backend API đến Bảng CSDL tương ứng.",
        bg_hex="FFF8ED",
        border_hex="B88E4F"
    )

    # 1. BẢNG TỔNG HỢP MA TRẬN
    h1_1 = doc.add_paragraph()
    h1_1.paragraph_format.space_before = Pt(12)
    h1_1.paragraph_format.space_after = Pt(6)
    r_h1_1 = h1_1.add_run("1. BẢNG TỔNG HỢP MA TRẬN PHÂN CÔNG 5 THÀNH VIÊN")
    r_h1_1.font.name = "Calibri"
    r_h1_1.font.size = Pt(13)
    r_h1_1.font.bold = True
    r_h1_1.font.color.rgb = color_navy

    tbl_matrix = doc.add_table(rows=1, cols=5)
    tbl_matrix.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_matrix.autofit = False

    matrix_headers = ["STT", "Thành Viên", "Role Chuyên Trách", "Phân Hệ Nghiệp Vụ Phụ Trách", "Nhiệm Vụ Trọng Tâm"]
    matrix_widths = [Inches(0.6), Inches(1.5), Inches(1.4), Inches(1.6), Inches(2.1)]

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
            "1", "Nguyễn Phú Quý\n(SE180104)", "MERCHANT\n(Chủ Gian Hàng)", 
            "Quản Lý Kho, Vận Chuyển, Shop Hủy Đơn & Voucher",
            "• Quản lý tồn kho real-time, cảnh báo tồn <= 5.\n• Shop chủ động hủy đơn & hoàn tiền.\n• Shipping Simulator (in phiếu giao hàng).\n• Tiếp nhận yêu cầu đổi trả phía Shop.\n• Quản lý mã voucher riêng của Shop."
        ),
        (
            "2", "Nguyễn Đình Tuấn\n(SE180104)", "KOL / KOC &\nSYSTEM_MANAGER", 
            "Tiếp Thị Liên Kết KOL & Ban Quản Trị Kiểm Duyệt",
            "• Phân cấp hoa hồng KOL (Open vs Deal VIP).\n• Quy trình gửi hàng mẫu 4 bước (Sample Request).\n• Voucher Livestream theo phiên phát sóng.\n• Admin duyệt hồ sơ Shop mới (KYC).\n• Admin duyệt Sản phẩm mới (Draft -> Approved)."
        ),
        (
            "3", "Phan Xuân Thịnh\n(SE184527)", "CUSTOMER\n(Khách Mua Hàng)", 
            "Trải Nghiệm Mua Sắm, Giỏ Hàng, Đổi Trả & Review",
            "• Giỏ hàng lưu Database đồng bộ đa thiết bị.\n• Giao diện gửi yêu cầu Đổi trả 14 ngày (có video).\n• Ràng buộc đánh giá thật (chỉ đơn COMPLETED).\n• Trang Chính sách đổi trả gian hàng trước checkout."
        ),
        (
            "4", "Nguyễn Thành Thắng\n(SE184251 - Leader)", "CHIA VIỆC VỚI THỊNH &\nCORE IAM / SECURITY", 
            "Khóa Bắt Buộc Login, Quên MK OTP, SĐT & Escrow",
            "• Khóa bắt buộc đăng ký/login (bỏ khách vãng lai).\n• Quên mật khẩu qua mã OTP Email an toàn.\n• Xác minh OTP khi đổi Email/SĐT nhận hàng.\n• Cơ chế Escrow 14 ngày & quyết toán ví CTV.\n• Thuật toán chống gian lận tự mua (Self-referral)."
        ),
        (
            "5", "Trần Văn Nhật\n(SE172768)", "REALTIME &\nNOTIFICATIONS", 
            "Giao Tiếp Thời Gian Thực & Trung Tâm Thông Báo",
            "• Chat Socket.io Khách hàng ⇄ Chủ Shop.\n• Chat Socket.io KOL ⇄ Chủ Shop (thương lượng deal).\n• Notification Center chuông báo đa vai trò.\n• Đẩy thông báo biến động đơn và duyệt hoa hồng."
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
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9)
                r.font.color.rgb = color_ink
                if c_idx == 1:
                    r.font.bold = True
                    r.font.color.rgb = color_navy

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. CHI TIẾT NHIỆM VỤ TỪNG THÀNH VIÊN
    h1_2 = doc.add_paragraph()
    h1_2.paragraph_format.space_before = Pt(14)
    h1_2.paragraph_format.space_after = Pt(4)
    r_h1_2 = h1_2.add_run("2. ĐẶC TẢ CHI TIẾT NHIỆM VỤ CỦA TỪNG THÀNH VIÊN")
    r_h1_2.font.name = "Calibri"
    r_h1_2.font.size = Pt(13)
    r_h1_2.font.bold = True
    r_h1_2.font.color.rgb = color_navy

    member_sections = [
        (
            "2.1. NGUYỄN PHÚ QUÝ — ROLE: CHỦ GIAN HÀNG (MERCHANT MANAGEMENT)",
            "Quý đã tìm hiểu sâu về vận hành của gian hàng, sẽ chịu trách nhiệm toàn bộ bảng điều khiển và kho bãi của Shop:",
            [
                ("1. Quản lý Tồn kho & Cảnh báo Sắp hết hàng:", 
                 "Trừ kho tức thời khi có đơn hàng mới; hoàn lại kho khi đơn bị hủy. Khi số lượng tồn kho <= 5 sản phẩm, hệ thống tự động gửi thông báo/email cảnh báo chủ Shop nhập thêm hàng. Khi tồn kho = 0, tự động làm mờ nút mua, hiện nhãn 'Hết hàng' và ngắt link tạo affiliate của KOL."),
                ("2. Shop chủ động Hủy đơn hàng:", 
                 "Bổ sung nút 'Hủy đơn hàng' trên trang quản lý đơn của Shop kèm danh sách lý do (Hết hàng đột xuất, sai giá sản phẩm, không liên lạc được khách). Tự động kích hoạt hoàn tiền cho khách và hủy hoa hồng tạm giữ của KOL."),
                ("3. Bộ Mô phỏng Vận chuyển & In phiếu giao hàng (Shipping Simulator):", 
                 "Tự sinh mã vận đơn chuẩn TMĐT (GHN-XXXXX, GHTK-XXXXX). Bổ sung nút 'In phiếu giao hàng (Shipping Label Print)' có mã vạch barcode, thông tin người gửi/nhận để dán lên gói hàng. Bổ sung nút mô phỏng đổi trạng thái giao hàng phục vụ demo giảng viên (Đã lấy hàng -> Đang giao -> Đã giao thành công)."),
                ("4. Xử lý Đổi trả / Hoàn tiền (Phía Shop):", 
                 "Màn hình Shop tiếp nhận yêu cầu trả hàng của khách: Xem video khui hàng -> Chấp nhận hoàn tiền hoặc Từ chối kèm lý do phản bác."),
                ("5. Quản lý Voucher riêng của từng Shop:", 
                 "Cho phép Shop tự tạo mã giảm giá riêng (VD: Giảm 20k cho đơn từ 200k, giảm 10% cho khách mới)."),
                ("Màn hình UI phụ trách:", "ShopDashboardPage.tsx, ProductManagementPage.tsx, OrdersManagementPage.tsx, ShopPromotionsHubPage.tsx."),
                ("API Backend phụ trách:", "POST /api/products/inventory, POST /api/orders/:id/cancel, POST /api/shipping/simulate-label, POST /api/refunds/merchant-review."),
                ("Bảng CSDL phụ trách:", "products, product_variants, orders, coupons, store_shipping_labels.")
            ]
        ),
        (
            "2.2. NGUYỄN ĐÌNH TUẤN — ROLE: KOL / KOC & BAN QUẢN TRỊ (ADMIN SYSTEM MANAGER)",
            "Tuấn đã tìm hiểu sâu về luồng làm việc của KOL và quy trình kiểm duyệt của Admin, sẽ phụ trách 2 đầu mút quan trọng này:",
            [
                ("1. KOL Lấy Link Affiliate & Phân Cấp Hoa Hồng:", 
                 "Phân chia 2 cấp độ hoa hồng rõ ràng: Hoa hồng cơ bản (Open Offer) áp dụng đại trà cho KOL đã KYC tự bấm tạo link rút gọn /r/:code; Hoa hồng độc quyền (Exclusive Deal) ghi nhận mức hoa hồng VIP do Shop cấp riêng cho KOL sau khi đàm phán qua Chat."),
                ("2. Quy trình Yêu cầu Hàng mẫu 4 bước (Sample Request):", 
                 "Tách riêng quyền lấy link và quyền nhận mẫu miễn phí. KOL gửi đơn xin mẫu -> Shop kiểm tra tồn kho & duyệt gửi -> Vận chuyển mẫu -> KOL nhận hàng và làm video review."),
                ("3. Voucher Livestream theo Phiên của KOL:", 
                 "Tạo mã voucher phiên live: Có thời gian đếm ngược (countdown); hết giờ phát sóng phiên live thì voucher tự động hết hạn, link quay về giá và hoa hồng gốc."),
                ("4. Admin — Duyệt Hồ Sơ Shop Onboarding (KYC):", 
                 "Hàng đợi duyệt Shop mới: Kiểm tra CCCD người đại diện, Mã số thuế, Giấy phép kinh doanh và STK ngân hàng chính chủ. Duyệt thành công thì Shop mới được chuyển từ DRAFT sang VERIFIED để mở bán."),
                ("5. Admin — Duyệt Sản Phẩm Mới (Product Moderation):", 
                 "Khi Shop đăng sản phẩm mới, sản phẩm ở dạng DRAFT (chưa hiện lên sàn). Admin kiểm tra hình ảnh, ngôn ngữ, giấy tờ chuyên ngành -> Bấm 'Duyệt (APPROVED)' thì sản phẩm mới xuất hiện trên sàn và kho Affiliate."),
                ("Màn hình UI phụ trách:", "CreatorProfilePage.tsx, MarketingToolkitPage.tsx, KycApprovalPage.tsx, AdminOversightHubPage.tsx, ProductManagementPage.tsx (Admin mode)."),
                ("API Backend phụ trách:", "POST /api/referral-links/create, POST /api/samples/request, POST /api/kyc/review-store, POST /api/products/:id/moderate."),
                ("Bảng CSDL phụ trách:", "referral_links, sample_requests, live_sessions, kyc_profiles, products, stores.")
            ]
        ),
        (
            "2.3. PHAN XUÂN THỊNH — ROLE: KHÁCH HÀNG (CUSTOMER PORTAL & SHOPPING)",
            "Thịnh đã tìm hiểu role Khách hàng, sẽ phụ trách toàn bộ trải nghiệm mua sắm mượt mà của người mua:",
            [
                ("1. Giỏ Hàng Đồng Bộ Đa Thiết Bị (Cart Synchronization):", 
                 "Chuyển giỏ hàng từ localStorage sang lưu tập trung trong Database PostgreSQL gắn với User ID. Khách thêm hàng trên điện thoại, đăng nhập máy tính giỏ hàng vẫn đồng bộ nguyên vẹn."),
                ("2. Quy trình Yêu cầu Đổi trả / Hoàn tiền 14 ngày (Phía Khách):", 
                 "Tại trang CustomerPortalPage.tsx, khi đơn hàng là DELIVERED, hiển thị nút 'Yêu cầu trả hàng / hoàn tiền' trong thời hạn 14 ngày. Form gửi yêu cầu: Nhập lý do, bắt buộc đính kèm ảnh và video mở hộp đồng kiểm."),
                ("3. Ràng buộc Đánh giá Sản phẩm Thật (Verified Review Gate):", 
                 "Bắt buộc: Chỉ đơn hàng ở trạng thái COMPLETED (Đã nhận hàng thành công) mới được mở form đánh giá 5★ và tải ảnh feedback, ngăn chặn 100% đánh giá rác."),
                ("4. Trang Chính sách Gian hàng trước khi Checkout:", 
                 "Hiển thị tab/modal 'Chính sách gian hàng & đổi trả 14 ngày' rõ ràng tại trang chi tiết sản phẩm và ngay trước nút bấm Đặt hàng."),
                ("Màn hình UI phụ trách:", "CustomerPortalPage.tsx, ProductDetailPage.tsx, MarketplacePage.tsx, ProductReviewModal.tsx."),
                ("API Backend phụ trách:", "GET/POST /api/cart, POST /api/orders/:id/return-request, POST /api/reviews/submit."),
                ("Bảng CSDL phụ trách:", "cart_items, order_returns, product_reviews, customer_addresses.")
            ]
        ),
        (
            "2.4. NGUYỄN THÀNH THẮNG (LEADER) — CHIA VIỆC CÙNG THỊNH & BẢO MẬT HỆ THỐNG",
            "Thắng sẽ chia sẻ công việc cùng Thịnh ở phân hệ Khách hàng, đồng thời làm nốt các phần bảo mật tài khoản & thanh toán cốt lõi:",
            [
                ("1. Cùng Thịnh — Khóa 100% Khách Bắt Buộc Đăng Ký / Đăng Nhập:", 
                 "Bỏ hoàn toàn flow khách vãng lai khi checkout. Khi bấm mua hàng, tự động bắt buộc đăng nhập (Google 1-Click 1.5s hoặc Email/Mật khẩu), đơn hàng tự động gắn chặt vào User ID của khách."),
                ("2. Cùng Thịnh — Quên Mật Khẩu qua Mã OTP Email:", 
                 "Xây dựng API gửi OTP 6 số qua email xác thực và form đặt lại mật khẩu mới mã hóa an toàn bằng Argon2id."),
                ("3. Cùng Thịnh — Xác minh khi Đổi Email / SĐT Nhận Hàng:", 
                 "Khi khách thay đổi thông tin nhạy cảm (SĐT nhận hàng, Email) trong trang Profile, yêu cầu nhập mật khẩu hoặc mã OTP xác minh."),
                ("4. Thắng làm Core — Cơ chế Bảo chứng Escrow 14 ngày & Chống gian lận:", 
                 "Giữ tiền đơn hàng 14 ngày an toàn. Hết 14 ngày không có đổi trả -> Tự động tất toán hoa hồng vào ví CTV (0đ phí ngân hàng). Thuật toán chống gian lận tự mua (Self-referral fraud): Phát hiện KOL tự bấm link của mình để trục lợi."),
                ("Màn hình UI phụ trách:", "LoginPage.tsx, RegisterPage.tsx, Sidebar.tsx, Navigation, PartnerUpgradeTab.tsx."),
                ("API Backend phụ trách:", "POST /api/auth/forgot-password, POST /api/auth/reset-password, POST /api/orders/checkout-member, POST /api/orders/:id/escrow-release."),
                ("Bảng CSDL phụ trách:", "users, user_roles, password_resets, wallets, escrow_ledgers, audit_logs.")
            ]
        ),
        (
            "2.5. TRẦN VĂN NHẬT — GIAO TIẾP THỜI GIAN THỰC & TRUNG TÂM THÔNG BÁO (SOCKET.IO)",
            "Nhật sẽ chịu trách nhiệm kết nối realtime cho toàn bộ hệ thống giữa Khách hàng, Shop, KOL và Admin:",
            [
                ("1. Hệ thống Chat Socket.io Khách hàng ⇄ Chủ Shop:", 
                 "Hộp chat realtime hỗ trợ khách hàng hỏi tư vấn về sản phẩm, hướng dẫn chọn size, giải đáp thắc mắc trước khi bấm mua hàng."),
                ("2. Hệ thống Chat Socket.io KOL ⇄ Chủ Shop:", 
                 "Luồng chat đàm phán deal hoa hồng độc quyền, thỏa thuận gửi mẫu thử sản phẩm (đính kèm trực tiếp thẻ sản phẩm vào trong tin nhắn)."),
                ("3. Trung Tâm Thông Báo Đa Vai Trò (Notification Center):", 
                 "Xây dựng component chuông thông báo real-time trên thanh Header cho cả 4 vai trò: Khách (đơn đang giao, đã giao, hoàn tiền); Shop (có đơn mới, cảnh báo kho <= 5, có yêu cầu trả hàng); KOL (hoa hồng duyệt vào ví, shop đồng ý cấp mẫu); Admin (có Shop nộp KYC, có sản phẩm mới chờ duyệt)."),
                ("Màn hình UI phụ trách:", "ChatBoxPage.tsx, ShopCollaborationPage.tsx, NotificationDropdown.tsx, PublicHeader.tsx."),
                ("API Backend phụ trách:", "Socket.io Gateway (/chat), GET /api/chat/messages, GET/POST /api/notifications."),
                ("Bảng CSDL phụ trách:", "chat_conversations, chat_messages, notifications.")
            ]
        )
    ]

    for title, desc, points in member_sections:
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(10)
        p_sec.paragraph_format.space_after = Pt(2)
        r_sec = p_sec.add_run(title)
        r_sec.font.name = "Calibri"
        r_sec.font.size = Pt(11.5)
        r_sec.font.bold = True
        r_sec.font.color.rgb = color_navy

        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_after = Pt(3)
        r_desc = p_desc.add_run(desc)
        r_desc.font.name = "Calibri"
        r_desc.font.size = Pt(9.5)
        r_desc.font.italic = True
        r_desc.font.color.rgb = color_muted

        for bold_p, norm_p in points:
            p_bullet = doc.add_paragraph(style='List Bullet')
            p_bullet.paragraph_format.space_after = Pt(2)
            rb = p_bullet.add_run(bold_p)
            rb.font.bold = True
            rb.font.size = Pt(9.5)
            rb.font.color.rgb = color_ink
            rn = p_bullet.add_run(" " + norm_p)
            rn.font.size = Pt(9.5)
            rn.font.color.rgb = color_ink

    # 3. KẾ HOẠCH TRIỂN KHAI VÀ PHỐI HỢP
    h1_3 = doc.add_paragraph()
    h1_3.paragraph_format.space_before = Pt(14)
    h1_3.paragraph_format.space_after = Pt(4)
    r_h1_3 = h1_3.add_run("3. MA TRẬN PHỐI HỢP CẶP ĐÔI VÀ LỘ TRÌNH 2 TUẦN")
    r_h1_3.font.name = "Calibri"
    r_h1_3.font.size = Pt(13)
    r_h1_3.font.bold = True
    r_h1_3.font.color.rgb = color_navy

    pairs = [
        ("Cặp đôi 1: Thịnh & Thắng", "Phối hợp hoàn thiện trải nghiệm Khách hàng: Giỏ hàng đồng bộ Database, Khóa bắt buộc đăng nhập, Quên mật khẩu OTP, và Bảo chứng thanh toán Escrow 14 ngày."),
        ("Cặp đôi 2: Quý & Tuấn", "Phối hợp hoàn thiện luồng Shop <-> Admin: Quý tạo sản phẩm Draft & nộp KYC, Tuấn duyệt KYC & duyệt Sản phẩm; Quý quản lý tồn kho & voucher, Tuấn lấy link KOL & tạo voucher phiên live."),
        ("Mắt xích liên kết: Nhật", "Kết nối toàn bộ hệ thống bằng Socket.io Realtime Chat và Notification Center chuông báo thông minh.")
    ]
    for b_p, n_p in pairs:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        rb = p.add_run(b_p + " — ")
        rb.font.bold = True
        rb.font.size = Pt(9.5)
        rb.font.color.rgb = color_gold
        rn = p.add_run(n_p)
        rn.font.size = Pt(9.5)
        rn.font.color.rgb = color_ink

    # Save
    out_docx_docs = r"c:\HW\CAPSTONE\docs\SCANMS_Ke_Hoach_Phan_Cong_Cong_Viec_Thanh_Vien_2026.docx"
    out_docx_root = r"c:\HW\CAPSTONE\SCANMS_Ke_Hoach_Phan_Cong_Cong_Viec_Thanh_Vien_2026.docx"
    doc.save(out_docx_docs)
    doc.save(out_docx_root)
    print("Files created successfully:\n", out_docx_docs, "\n", out_docx_root)

if __name__ == "__main__":
    generate_assignment_document()
