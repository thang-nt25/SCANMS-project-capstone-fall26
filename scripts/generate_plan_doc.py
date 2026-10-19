# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()

    # Page Margins: 0.8 inch
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # Styles
    COLOR_BRAND_GOLD = RGBColor(197, 155, 88)       # #C59B58
    COLOR_BRAND_DARK = RGBColor(35, 29, 21)         # #231D15
    COLOR_BRAND_STRONG = RGBColor(184, 142, 79)     # #B88E4F
    COLOR_INK = RGBColor(26, 22, 18)                # #1A1612
    COLOR_MUTED = RGBColor(125, 113, 94)            # #7D715E
    HEX_GOLD_LIGHT = "FBF5EB"
    HEX_SAND = "F3EFE6"
    HEX_GOLD_BORDER = "EEDFC6"
    HEX_LINE = "EAE4D7"

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(4)
    run_pre = p_title.add_run("HỆ THỐNG SÀN THƯƠNG MẠI TIẾP THỊ LIÊN KẾT ĐA GIAN HÀNG SCANMS\n")
    run_pre.font.name = "Calibri"
    run_pre.font.size = Pt(11)
    run_pre.font.bold = True
    run_pre.font.color.rgb = COLOR_BRAND_STRONG

    run_title = p_title.add_run("KẾ HOẠCH NÂNG CẤP TOÀN DIỆN & PHÂN CÔNG NHIỆM VỤ THÀNH VIÊN")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_BRAND_DARK

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(18)
    run_sub = p_sub.add_run("Chuẩn Hóa Nghiệp Vụ TMĐT: Đại Tu Giao Vận GHN & Hàng Mẫu, Hoa Hồng Cộng Dồn & Voucher Không Lỗ,\nNâng Cấp Giao Diện Trang Chủ Mua Sắm, Tái Thiết DB Seeder (15 Shop - 20 KOL - 30 Khách)")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_MUTED

    # Meta Table (KHÔNG CÓ DEADLINE)
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Dự án / Mã đề tài:", "SCANMS — Sales Collaborator & Affiliate Network Management System (FA26SE032)"),
        ("Người chủ trì (Team Leader):", "Nguyễn Thành Thắng (Phụ trách Kiến trúc & Phân rã nghiệp vụ FR-01 -> FR-08)"),
        ("Quy trình bàn giao kỹ thuật:", "Tuấn (Giao vận GHN, Hoa hồng & Voucher) -> Quý (Trang chủ Mua sắm & Gian hàng Sàn) -> Thịnh (Đồng bộ DB Seed toàn hệ thống)"),
        ("Mục tiêu nghiệm thu:", "Đạt chuẩn nghiệp vụ TMĐT thực chiến (Shopee/TikTok Shop), bảo vệ xuất sắc trước Hội đồng Capstone 2026")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.5)
        set_cell_background(c0, HEX_SAND)
        set_cell_background(c1, "FAF8F5")
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = COLOR_INK

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_INK

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Helper function for adding headings
    def add_custom_heading(text, level=1):
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        if level == 1:
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = COLOR_BRAND_DARK
        elif level == 2:
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = COLOR_BRAND_STRONG
        elif level == 3:
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(10.5)
            r.font.bold = True
            r.font.color.rgb = COLOR_INK
        return p

    def add_body_paragraph(text, bold_prefix=None, bullet=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bullet:
            p.style = 'List Bullet'
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.font.name = "Calibri"
            r_b.font.size = Pt(10)
            r_b.font.bold = True
            r_b.font.color.rgb = COLOR_INK
        r_t = p.add_run(text)
        r_t.font.name = "Calibri"
        r_t.font.size = Pt(10)
        r_t.font.color.rgb = COLOR_INK
        return p

    def add_callout(text, title="LƯU Ý NGHIỆP VỤ BẮT BUỘC:"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        cell.width = Inches(6.8)
        set_cell_background(cell, HEX_GOLD_LIGHT)
        set_cell_margins(cell, 100, 100, 140, 140)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r_title = p.add_run(f"⚠️ {title}\n")
        r_title.font.bold = True
        r_title.font.size = Pt(10)
        r_title.font.color.rgb = COLOR_BRAND_STRONG
        r_txt = p.add_run(text)
        r_txt.font.size = Pt(9.5)
        r_txt.font.italic = True
        r_txt.font.color.rgb = COLOR_INK
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # =========================================================================
    # PHẦN 1: BỐI CẢNH & PHƯƠNG PHÁP LUẬN TRẢ LỜI HỘI ĐỒNG REVIEW
    # =========================================================================
    add_custom_heading("PHẦN 1: BỐI CẢNH & PHƯƠNG PHÁP LUẬN TRẢ LỜI HỘI ĐỒNG REVIEW", 1)
    add_body_paragraph("Trong đợt rà soát nghiệp vụ và chuẩn bị cho buổi đánh giá Review đồ án Capstone, một trong những câu hỏi trọng tâm thường được Giảng viên và Hội đồng thẩm định đặt ra là: ")
    
    add_callout(
        "\"Dữ liệu ban đầu của nhóm (Seed Data) được thu thập và tạo lập bằng cách nào? Có đảm bảo tính pháp lý, tính toàn vẹn nghiệp vụ và tính chân thực hay không?\"",
        "CÂU HỎI THẨM ĐỊNH CỦA HỘI ĐỒNG:"
    )

    add_custom_heading("1. Ý nghĩa sâu xa của câu hỏi từ Hội đồng:", 2)
    add_body_paragraph("Thầy cô kiểm tra xem nhóm có vi phạm bản quyền khi crawl trộm dữ liệu dính thông tin cá nhân (PII như SĐT, CCCD thật) hay không, và cấu trúc dữ liệu có được sinh bài bản qua Seeding Script hay chỉ là nhập tay vài ba bản ghi rác đối phó.", "• Mục đích 1: Kiểm tra tính pháp lý & an toàn dữ liệu (Data Privacy & Compliance): ", True)
    add_body_paragraph("Đơn hàng, hoa hồng, doanh số, tồn kho, bưu kiện có khớp với các ràng buộc khóa ngoại (Foreign Keys) và quy tắc toán học hay không. Không thể có chuyện đơn 100k mà hoa hồng lại 50k, hoặc đơn chưa giao mà ví đã cho rút tiền.", "• Mục đích 2: Tính toàn vẹn nghiệp vụ (Business Integrity): ", True)

    add_custom_heading("2. Phương pháp luận trả lời chuẩn mực giúp nhóm đạt điểm tuyệt đối:", 2)
    add_body_paragraph("Nhóm khẳng định hệ thống dữ liệu SCANMS được thiết kế theo Mô hình 3 Tầng Dữ Liệu Công Nghiệp:")
    add_body_paragraph("Dữ liệu về sản phẩm, danh mục, quy cách đóng gói và kiểm nghiệm được chuẩn hóa từ danh mục của các thương hiệu Dược mỹ phẩm và Chăm sóc sức khỏe chính hãng đối tác (như Sora Skin, Aura Bio, Cocoon, Cỏ Mềm...) với mã Barcode EAN-13, SKU chuẩn.", "1. Tầng 1 - Danh mục Sản Phẩm Chuẩn (Product Catalog): ", True)
    add_body_paragraph("Hệ thống 15 Shop, 20 KOL và 30 Khách hàng được khởi tạo hoàn toàn tự động thông qua Prisma Database Seeder với thông tin định danh giả lập chuẩn quy cách (Synthetic Mock Data tuân thủ nghị định bảo vệ dữ liệu cá nhân), kết nối đa kênh TikTok/YouTube có lượt follower thực tế.", "2. Tầng 2 - Hồ sơ Định danh & Phân vai (Identity & RBAC Seeding): ", True)
    add_body_paragraph("Toàn bộ lịch sử mua hàng, mã vận đơn GHN Express, dòng tiền ví điện tử và sổ cái tài chính được sinh ra từ các ca kiểm thử E2E (End-to-End Test Flows) chạy qua môi trường Sandbox của các đối tác thực tế: Cổng thanh toán PayOS và Bưu cục Giao Hàng Nhanh (GHN Sandbox).", "3. Tầng 3 - Dữ liệu Vận Hành & Giao Dịch Thực (Transaction Integrity): ", True)

    # =========================================================================
    # PHẦN 2: NHIỆM VỤ 1 (GIAO CHO TUẤN) — ĐẠI TU GIAO VẬN GHN, HOA HỒNG CỘNG DỒN & VOUCHER KHÔNG LỖ
    # =========================================================================
    add_custom_heading("PHẦN 2: NHIỆM VỤ 1 (GIAO CHO TUẤN) — ĐẠI TU GIAO VẬN GHN, HOA HỒNG CỘNG DỒN & VOUCHER", 1)
    add_body_paragraph("Tuấn chịu trách nhiệm sửa đổi toàn diện các lỗi nghiệp vụ giao vận bưu cục GHN, quy trình hàng mẫu, động cơ tính hoa hồng cộng dồn và cơ chế kiểm soát voucher giảm giá không lỗ:")

    add_custom_heading("1. Chuẩn hóa Form Địa Chỉ khi KOL xin mẫu (Fix lỗi địa chỉ sơ sài):", 2)
    add_body_paragraph("Xóa bỏ hoàn toàn ô textarea thô sơ và chuỗi địa chỉ hardcode 'Chung cư Sunrise City' trong SampleRequestsPage.tsx và ShopCollaborationPage.tsx.", "• Bỏ địa chỉ tĩnh hardcode: ", True)
    add_body_paragraph("Xây dựng bộ chọn địa chỉ 3 cấp đồng bộ: Tỉnh / Thành phố -> Quận / Huyện -> Phường / Xã -> Số nhà / Tên đường chi tiết kèm SĐT người nhận chính chủ.", "• Bộ chọn địa chỉ 3 cấp chuẩn GHN: ", True)
    add_body_paragraph("Đảm bảo bên giao diện Shop (ShopSampleManagementTab.tsx và ShopKolHubPage.tsx) hiển thị đúng 100% địa chỉ mà KOL vừa nhập trên form, không lấy đè dữ liệu cũ.", "• Khắc phục lỗi hiển thị phía Shop: ", True)

    add_custom_heading("2. Tái cấu trúc Luồng Trạng Thái Hàng Mẫu (Bỏ lỗi ép nộp video khi chưa nhận hàng):", 2)
    add_body_paragraph("Khi Shop chuyển đơn sang SHIPPED (Đang giao), TUYỆT ĐỐI KHÔNG hiển thị nút 'Đã nhận được hàng'. Thay vào đó, hiển thị Mã vận đơn GHN và nút 'Theo dõi hành trình bưu kiện'.", "• Xóa nút 'Đã nhận được hàng' sớm: ", True)
    add_body_paragraph("Chỉ khi bưu tá GHN phát hàng thành công (bắn webhook delivered) hoặc sau thời gian kiểm tra an toàn, hệ thống mới tự động chuyển sang RECEIVED (Đã nhận hàng).", "• Cập nhật trạng thái khách quan qua GHN: ", True)
    add_body_paragraph("CHỈ KHI đơn mẫu đã ở trạng thái RECEIVED, hệ thống mới bắt đầu đếm ngược 14 ngày sáng tạo nội dung và mở nút 'Nộp Link Video Review' cho KOL.", "• Kích hoạt SLA 14 ngày đúng thời điểm: ", True)

    add_custom_heading("3. Hiển thị Tiến độ Shipper GHN chi tiết cho Khách Hàng (Customer Live Tracking):", 2)
    add_body_paragraph("Tích hợp API có sẵn GET /api/shipping/ghn/track/:orderCode vào màn hình Tra cứu đơn (/tracking) và Chi tiết đơn trong Customer Portal (/customer/orders).", "• Tích hợp API Hành trình bưu tá: ", True)
    add_body_paragraph("Hiển thị chi tiết từng mốc: Bưu tá đã lấy hàng tại kho Shop -> Nhập kho trung chuyển -> Shipper đang đi giao kèm tên shipper và SĐT liên hệ -> Giao hàng thành công.", "• Dòng thời gian trực quan (Timeline): ", True)

    add_custom_heading("4. Bật tính năng Tính Phí Vận Chuyển Động (Dynamic Shipping Fee):", 2)
    add_body_paragraph("Xóa bỏ dòng gán cứng shippingFee = 0 tại orders.service.ts dòng 1691.", "• Bỏ gán cứng Freeship 0 đ: ", True)
    add_body_paragraph("Cắm API tính cước của GHN Express (POST /api/shipping/ghn/fee) vào Modal thanh toán (GuestCheckoutModal.tsx). Khi khách chọn xong Tỉnh/Huyện, tự động tính cước GHN thật (Nội thành ~20k, Liên tỉnh ~35k) và cộng vào tổng thanh toán của đơn hàng.", "• Kết nối API tính cước GHN tự động: ", True)
    add_body_paragraph("Khách hàng trả tiền ship đơn mua; Shop trả 100% tiền ship đơn hàng mẫu (COD = 0 đ cho KOL).", "• Phân định trách nhiệm phí ship: ", True)

    add_custom_heading("5. Mô hình Hoa Hồng Bậc Thang Cộng Dồn (Additive Micro-Rate Matrix):", 2)
    add_body_paragraph("Thay vì để các mức hoa hồng ghi đè nhau một cách mất kiểm soát (lên tới 30% - 35% làm vỡ quỹ của Shop), hệ thống chuyển đổi triệt để sang cơ chế: Nền tảng cố định 10% và cộng dồn từng khoản thưởng % nhỏ (+1% đến +3%) dựa trên hành động tạo ra giá trị của KOL.")

    # Table of Commission Stacking
    t_comm = doc.add_table(rows=6, cols=4)
    t_comm.alignment = WD_TABLE_ALIGNMENT.CENTER
    comm_headers = ["Tầng Hoa Hồng", "Mức % Cộng Dồn", "Điều Kiện Kích Hoạt", "Cơ Chế Quyết Định"]
    for j, h in enumerate(comm_headers):
        cell = t_comm.rows[0].cells[j]
        set_cell_background(cell, HEX_SAND)
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_INK

    comm_data = [
        ("1. CƠ BẢN SÀN (Base)", "10.0% Cố định", "Mọi sản phẩm, mọi KOL trên toàn sàn SCANMS", "Khóa cứng quy chuẩn hệ thống, Shop không tự sửa tùy tiện"),
        ("2. DEAL ĐỘC QUYỀN (VIP Deal)", "+1% đến +3%", "KOL đề xuất riêng cho SP, kèm cam kết làm video review", "KOL chọn nấc đề xuất (+1%, +2%, +3%) -> Shop duyệt mới có hiệu lực"),
        ("3. CHIẾN DỊCH SALE (Campaign)", "+1% đến +2%", "Trong thời gian đợt Sale kích cầu (Mega Sale 11.11, Lễ hội hè)", "Shop cài đặt ngày bắt đầu/kết thúc & ngân sách trần tối đa"),
        ("4. LIVESTREAM (Flash Live)", "+2% đến +3%", "Chỉ áp dụng trong thời lượng phiên Livestream đang phát sóng", "Hệ thống tự động kích hoạt khi phòng Live đang ở trạng thái LIVE"),
        ("5. CẤP BẬC KOL (Tier Bonus)", "+0% đến +3%", "Đồng (+0%), Bạc (+1%), Vàng (+2%), Kim Cương (+3%)", "Hệ thống tự động đánh giá và cộng thưởng theo GMV tháng trước")
    ]

    for i, row_data in enumerate(comm_data):
        row = t_comm.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            set_cell_background(cell, "FFFFFF" if i % 2 == 0 else "FAF8F5")
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(9)
            if j == 0:
                r.font.bold = True
                cell.width = Inches(1.8)
            elif j == 1:
                r.font.bold = True
                cell.width = Inches(1.2)
            elif j == 2:
                cell.width = Inches(2.2)
            else:
                cell.width = Inches(1.6)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_callout(
        "Công thức tính hoa hồng tổng quát trong Backend (orders.service.ts):\n"
        "TotalRate = 10% (Base) + Tier (+0-3%) + Deal (+1-3%) + Campaign (+1-2%) + Live (+2-3%)\n"
        "Chặn trần an toàn tuyệt đối: FinalCommissionRate = Math.min(TotalRate, 25.0%)\n"
        "Mức tối đa khi 'All-in' chỉ đạt 21% - 25%, bảo vệ trọn vẹn biên lợi nhuận gộp của Shop.",
        "CÔNG THỨC TOÁN HỌC & TRẦN AN TOÀN:"
    )

    add_custom_heading("6. Cơ Chế Voucher Tương Ứng & Chống Lỗ Kép Cho Shop (Margin Protection):", 2)
    add_body_paragraph("Nếu chỉ tăng hoa hồng cho KOL mà khách mua không có lợi ích gì thì khách sẽ không mua qua link. Do đó, các nấc tương tác phải gắn kèm Voucher ưu đãi:")
    add_body_paragraph("Shop cấp cho KOL 1 mã giảm giá mang thương hiệu KOL (Ví dụ: MAIANH5 giảm 5% cho đơn từ 200k) để KOL mang đi quảng bá cho người theo dõi.", "• Gói Đôi Deal Độc Quyền: ", True)
    add_body_paragraph("Shop phát hành mã giảm giá chung cho đợt Sale (Ví dụ: MEGASALE20 giảm 20k cho đơn từ 250k).", "• Voucher Chiến Dịch: ", True)
    add_body_paragraph("Tung voucher chốt đơn tức thì trong phòng Live (Ví dụ: LIVEHOT15 giảm 15k chỉ có hiệu lực khi live).", "• Voucher Livestream: ", True)
    add_body_paragraph("Khách hàng CHỈ ĐƯỢC CHỌN 1 VOUCHER TIỀN HÀNG TỐT NHẤT của Shop (hoặc Voucher Shop, hoặc Voucher KOL). TUYỆT ĐỐI CẤM CHỒNG 2 VOUCHER TIỀN HÀNG CÙNG SHOP để chống Shop bị lỗ kép.", "• Quy Tắc Cấm Chồng Voucher Tiền Hàng: ", True)
    add_body_paragraph("Voucher Freeship chỉ được trừ vào tiền cước bưu cục GHN, tuyệt đối không cấn trừ vào tiền hàng sản phẩm. Khách được áp dụng: 1 Voucher Tiền Hàng + 1 Voucher Sàn + 1 Voucher Freeship.", "• Tách Riêng Voucher Giảm Phí Vận Chuyển: ", True)
    add_body_paragraph("Tiền hoa hồng cộng dồn của KOL luôn được nhân với Doanh thu THỰC THU (Net GMV) sau khi đã trừ Voucher tiền hàng, không nhân trên giá niêm yết ban đầu.", "• Tính Hoa Hồng Trên Net GMV: ", True)

    add_custom_heading("7. Phân Quyền Quản Lý & Nơi Tạo Voucher Trên Hệ Thống:", 2)
    add_body_paragraph("Shop tạo và duyệt mã tại ShopCouponsPage.tsx (API POST /stores/:storeId/coupons). Tự chi trả 100% ngân sách giảm giá (SHOP_FUNDED). Có các công cụ kiểm soát: Đơn tối thiểu, trần giảm giá tối đa, tổng ngân sách tối đa và giới hạn số lượt dùng.", "• Chủ Gian Hàng (Shop Manager): ", True)
    add_body_paragraph("KOL tạo đề xuất mã tại KolCouponsPage.tsx (API POST /collaborator/coupons). Trạng thái ban đầu bắt buộc là PENDING_APPROVAL. KOL không có quyền tự kích hoạt giảm giá. CHỈ KHI CHỦ SHOP DUYỆT thì mã mới ACTIVE.", "• Nhà Sáng Tạo (KOL/Collaborator): ", True)
    add_body_paragraph("Admin giám sát toàn sàn tại AdminCouponsPage.tsx. Có quyền Khóa khẩn cấp mã lỗi/trục lợi và phát hành Voucher Sàn (PLATFORM_FUNDED - Sàn tự bù tiền cho Shop).", "• Quản Trị Viên (System Admin): ", True)
    add_body_paragraph("Khách hàng xem các mã đã lưu tại CustomerPortalPage.tsx -> Tab Kho Voucher (CustomerVouchersTab.tsx). Tuấn cần kết nối API thật thay vì để 4 mã tĩnh hardcode.", "• Khách Mua Hàng (Customer): ", True)

    add_custom_heading("8. Bảng Đối Soát Mã Nguồn & Checklist File Code Tuấn Cần Sửa:", 2)
    add_body_paragraph("Tuấn kiểm tra và sửa đổi đúng các file code sau:")
    add_body_paragraph("Đổi phép gán đè (=) thành phép cộng dồn (+=) cho 5 tầng hoa hồng; bổ sung Math.min(finalCommissionRate, 25.0); đảm bảo tính hoa hồng trên netItemSubtotal sau voucher.", "1. backend/src/modules/orders/orders.service.ts (Dòng 1620 - 1688): ", True)
    add_body_paragraph("Khóa ô nhập hoa hồng tự do thành dạng Read-only hiển thị cố định '10% (Chuẩn sàn SCANMS)'.", "2. frontend/src/pages/merchant/ProductManagementPage.tsx & ShopSettingsPage.tsx: ", True)
    add_body_paragraph("Chuyển ô nhập Deal từ nhập % tùy tiện sang chọn nấc cộng thêm (+1%, +2%, +3%) kèm cam kết nội dung.", "3. frontend/src/pages/merchant/ShopKolHubPage.tsx & affiliate-deals.service.ts: ", True)
    add_body_paragraph("Ngăn chặn việc áp dụng cùng lúc 2 voucher tiền hàng của Shop; hiển thị tách biệt ô nhập Voucher Ship.", "4. frontend/src/components/checkout/GuestCheckoutModal.tsx: ", True)
    add_body_paragraph("Xóa mảng 4 voucher tĩnh hardcode (SCANMS15, FREESHIP50K...), gọi API GET /coupons/stores/:storeId/available để hiển thị voucher thật của Shop.", "5. frontend/src/pages/customer/CustomerVouchersTab.tsx: ", True)

    # =========================================================================
    # PHẦN 3: NHIỆM VỤ 2 (GIAO CHO QUÝ) — ĐẠI TU GIAO DIỆN MUA HÀNG TRANG CHỦ & MULTI-MERCHANT
    # =========================================================================
    add_custom_heading("PHẦN 3: NHIỆM VỤ 2 (GIAO CHO QUÝ) — ĐẠI TU GIAO DIỆN MUA HÀNG TRANG CHỦ & MULTI-MERCHANT", 1)
    add_body_paragraph("Quý chịu trách nhiệm nâng cấp giao diện Trang mua sắm chính (MarketplacePage.tsx) để phản ánh đúng bản sắc Sàn Đa Gian Hàng và kích thích tỷ lệ chuyển đổi:")

    add_custom_heading("1. Chi tiết 6 khối giao diện Quý phải triển khai trên Trang Chủ:", 2)
    add_body_paragraph("Thay thế 3 banner tĩnh bằng Carousel banner có thể click dẫn thẳng vào trang chiến dịch hoặc gian hàng đang có chương trình khuyến mãi.", "1. Carousel Banner Động & Clickable: ", True)
    add_body_paragraph("Bổ sung 1 hàng carousel hiển thị các thương hiệu đối tác chính hãng: Logo Shop, Tên Shop, Đánh giá sao, Số lượng sản phẩm và nút 'Ghé thăm gian hàng' dẫn vào /shops/:shopId.", "2. Khối 'Gian Hàng Đối Tác Tiêu Biểu' (Featured Brand Stores): ", True)
    add_body_paragraph("Xây dựng vị trí dành riêng cho các Shop trả tiền tài trợ quảng cáo. Bắt buộc gắn huy hiệu 'Được tài trợ' (màu Vàng Be #C59B58) chuẩn quy định pháp lý TMĐT.", "3. Tính Năng Gian Hàng Tài Trợ Nổi Bật (Sponsored Placement): ", True)
    add_body_paragraph("Thiết kế hàng icon bo tròn trang nhã: Chăm sóc da, Trang điểm, Chăm sóc cơ thể, Thực phẩm sức khỏe, Deal KOC độc quyền... giúp khách lọc nhanh.", "4. Hàng Danh Mục Ngành Hàng Trực Quan (Category Quick Nav): ", True)
    add_body_paragraph("Hiển thị các phiên Live đang diễn ra trên sàn với chấm đỏ nhấp nháy LIVE, ảnh streamer, deal đang ghim và số người đang xem trực tiếp.", "5. Widget 'Phiên Live KOC Đang Diễn Ra': ", True)
    add_body_paragraph("Khách chưa đăng nhập bấm 'Mua ngay' hoặc 'Thêm vào giỏ' -> Hiện popup đăng nhập/OTP nhanh tại chỗ -> Đăng nhập xong giữ nguyên 100% giỏ hàng để thanh toán tiếp, không bị redirect làm mất form.", "6. Tối Ưu Giỏ Hàng & Đăng Nhập Không Mất Dữ Liệu: ", True)

    # =========================================================================
    # PHẦN 4: NHIỆM VỤ 3 (GIAO CHO THỊNH) — TÁI THIẾT DATABASE SEED ĐỒNG BỘ TOÀN HỆ THỐNG
    # (ĐẶT SAU KHI ĐÃ XEM XÉT VÀ THỐNG NHẤT CÁC THAY ĐỔI CỦA TUẤN VÀ QUÝ)
    # =========================================================================
    add_custom_heading("PHẦN 4: NHIỆM VỤ 3 (GIAO CHO THỊNH) — TÁI THIẾT DATABASE SEED ĐỒNG BỘ TOÀN HỆ THỐNG", 1)
    add_body_paragraph("Sau khi Tuấn đã chuẩn hóa xong cấu trúc Giao vận GHN, Hoa hồng cộng dồn, Voucher không lỗ, và Quý đã hoàn thiện cấu trúc Banner, Gian hàng tài trợ trên Trang chủ, Thịnh tiến hành xóa sạch DB cũ bị rác và viết mới hoàn toàn kịch bản Prisma Database Seeder (backend/prisma/seed.ts) đồng bộ 100%:")

    add_custom_heading("1. Định lượng quy mô Seed bắt buộc:", 2)
    
    t_ent = doc.add_table(rows=5, cols=3)
    t_ent.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Thực Thể", "Số Lượng", "Quy Chuẩn Dữ Liệu Bắt Buộc (Đồng bộ theo Tuấn & Quý)"]
    for j, h in enumerate(headers):
        cell = t_ent.rows[0].cells[j]
        set_cell_background(cell, HEX_SAND)
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_INK

    rows_data = [
        ("Gian Hàng (Stores/Shops)", "15 Gian Hàng", "Tên thương hiệu thật (Sora Skin, Aura Bio, GreenBio, Lumière Lab, Oribe, Cỏ Mềm, Cocoon, Nature Queen, Sao Thái Dương, Bách Hóa Sống Xanh, Dermedic VN, BioCosmetics, An An, Medimix, Herbal Spa). Đầy đủ Logo sắc nét, địa chỉ kho xuất hàng (Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ), Hotline, STK Ngân hàng MB/Vietcombank, KYC Doanh nghiệp Approved. 2 Shop có gắn gói Shop Tài Trợ Nổi Bật của Quý."),
        ("Nhà Sáng Tạo (KOL/KOC)", "20 Creator", "Tên thật, Avatar thật, Cấp bậc Tier (5 Đồng, 7 Bạc, 5 Vàng, 3 Kim Cương). Mỗi KOL có 1-2 kênh mạng xã hội thật (TikTok, YouTube, Facebook với lượt Follower từ 15k đến 450k). Có Sổ địa chỉ nhận mẫu 3 cấp hoàn chỉnh (chuẩn GHN của Tuấn) và STK ngân hàng nhận hoa hồng."),
        ("Khách Mua Sắm (Customers)", "30 Khách Hàng", "Họ tên người Việt thật (Nguyễn Văn An, Trần Thị Mai, Lê Hoàng Nam...). Số điện thoại đúng đầu số 09/03/07/08. Mỗi khách có Sổ địa chỉ nhận hàng 3 cấp (Tỉnh/Thành -> Quận/Huyện -> Phường/Xã -> Số nhà chi tiết)."),
        ("Sản Phẩm Thương Mại", "30 Sản Phẩm\n(1-2 SP/Shop)", "Tên thương phẩm đầy đủ, mã SKU, Barcode EAN-13, mô tả rich text, ảnh sản phẩm 1:1 rõ nét. Phân loại biến thể 2 tầng (Dung tích 30ml/50ml hoặc Màu sắc). Tồn kho thực tế (50 - 500 cái). Mức hoa hồng cơ bản 10% cố định theo quy chuẩn của Tuấn. Suất hàng mẫu (Sample Quota: 5 - 20 suất).")
    ]

    for i, row_data in enumerate(rows_data):
        row = t_ent.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            set_cell_background(cell, "FFFFFF" if i % 2 == 0 else "FAF8F5")
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(9)
            if j == 0:
                r.font.bold = True
                cell.width = Inches(1.8)
            elif j == 1:
                cell.width = Inches(1.2)
            else:
                cell.width = Inches(3.8)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_custom_heading("2. Dữ liệu Nghiệp vụ Liên Kết Chéo (Chỉ seed cho chức năng CÓ THẬT sau nâng cấp):", 2)
    add_body_paragraph("Mỗi khách hàng có 1-2 đơn hàng thực tế trải dài các trạng thái: PENDING (Chờ thanh toán), SHIPPING (Đang giao hàng gắn mã GHN thật kèm cước vận chuyển động của Tuấn), DELIVERED (Đã nhận hàng kích hoạt Escrow 14 ngày), COMPLETED (Hoàn tất), và RETURN_REQUESTED (Đang khiếu nại đổi trả).", "• Đơn Hàng Thương Mại (Orders): ", True)
    add_body_paragraph("Seed các mã giảm giá của từng Shop (ví dụ: SORAS10, AURABIO20) và Coupon độc quyền gắn với từng KOL (ví dụ: MAIANH5). Tuân thủ đúng luật không chồng 2 voucher tiền hàng cùng Shop của Tuấn.", "• Khuyến Mãi & Voucher (Coupons): ", True)
    add_body_paragraph("Tạo các đơn xin mẫu của KOL ở 4 trạng thái: Chờ Shop duyệt, Đang giao bưu cục, Đã nhận mẫu đang dùng thử (kèm đếm ngược hạn nộp bài), và Đã nghiệm thu video review. Địa chỉ giao nhận chuẩn 3 cấp.", "• Yêu Cầu Hàng Mẫu (Sample Requests): ", True)
    add_body_paragraph("Tạo 2 phiên Live đang phát (LIVE) có ghim danh mục Deal túi đồ giảm giá sâu và 3 phiên Live đã kết thúc (ENDED) kèm thống kê người xem.", "• Phòng Livestream KOC (Live Sessions): ", True)
    add_body_paragraph("Lịch sử tin nhắn hỏi đáp sản phẩm giữa Khách và Shop, tin nhắn trao đổi gửi thẻ mời đề xuất Deal cộng dồn (+2%) giữa Shop và KOL.", "• Tin Nhắn Trao Đổi (Chat Messages): ", True)
    add_body_paragraph("Số dư ví khách hàng, ví hoa hồng KOL (phân định rõ ràng số dư khả dụng và số dư tạm giữ Escrow 14 ngày). Biến động tài chính ghi vào sổ cái bất biến financial_ledgers. Seed 2 lệnh rút tiền đã duyệt có trích 10% thuế TNCN.", "• Dòng Tiền, Ví & Thuế TNCN (Wallets & Payouts): ", True)
    add_body_paragraph("Mỗi sản phẩm có 2-4 đánh giá 5 sao và nhận xét thực tế kèm ảnh phản hồi từ khách hàng.", "• Đánh Giá & Phản Hồi (Reviews): ", True)

    # =========================================================================
    # PHẦN 5: BẢNG TỔNG HỢP PHÂN CÔNG & TIÊU CHÍ NGHIỆM THU (KHÔNG DEADLINE)
    # =========================================================================
    add_custom_heading("PHẦN 5: BẢNG TỔNG HỢP PHÂN CÔNG & TIÊU CHÍ NGHIỆM THU", 1)
    
    t_sum = doc.add_table(rows=4, cols=3)
    t_sum.alignment = WD_TABLE_ALIGNMENT.CENTER
    sum_headers = ["Thành Viên", "Phạm Vi Trách Nhiệm Chính", "Tiêu Chí Nghiệm Thu (Do Leader Thắng Duyệt)"]
    for j, h in enumerate(sum_headers):
        cell = t_sum.rows[0].cells[j]
        set_cell_background(cell, HEX_SAND)
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_INK

    sum_data = [
        ("Tuấn", "1. Chuẩn hóa địa chỉ KOL 3 cấp, sửa luồng hàng mẫu, timeline GHN cho khách, bật cước GHN động.\n2. Chuẩn hóa hoa hồng cộng dồn (orders.service.ts), khóa trần 25%, chống lỗ voucher, kết nối kho voucher khách.", "Giao hàng GHN tính cước thật; KOL nhận hàng xong mới nộp video. Hoa hồng cộng dồn chuẩn xác từng nấc; voucher không bị chồng chéo lỗ."),
        ("Quý", "Đại tu Trang Chủ MarketplacePage.tsx (Banner động, Gian hàng tiêu biểu, Shop tài trợ #C59B58, Danh mục trực quan, Live widget, Giữ giỏ hàng)", "Trang chủ mang bản sắc Sàn Đa Gian Hàng rõ nét, màu Vàng Be chuẩn Brand, banner click được, popup đăng nhập không mất giỏ hàng."),
        ("Thịnh", "Sau khi xem xét các thay đổi của Tuấn & Quý -> Tiến hành Reset DB & Viết mới kịch bản Prisma Seeder (15 Shop, 20 KOL, 30 Khách, 30 SP, Đơn hàng cước động, Voucher, Live, Ví, Chat, Đánh giá)", "Chạy lệnh 'npx prisma db seed' thành công 100% không lỗi foreign key. Toàn bộ dữ liệu hiển thị mượt mà trên UI theo đúng các tính năng mới.")
    ]

    for i, row_data in enumerate(sum_data):
        row = t_sum.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            set_cell_background(cell, "FFFFFF" if i % 2 == 0 else "FAF8F5")
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(9)
            if j == 0:
                r.font.bold = True
                cell.width = Inches(1.2)
            elif j == 1:
                cell.width = Inches(3.2)
            else:
                cell.width = Inches(2.6)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)
    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_sign = p_sign.add_run("TP. Hồ Chí Minh, Năm 2026\nNGƯỜI LẬP KẾ HOẠCH\n\n\n\nNguyễn Thành Thắng (Team Leader)")
    r_sign.font.bold = True
    r_sign.font.size = Pt(10.5)
    r_sign.font.color.rgb = COLOR_BRAND_DARK

    # Save to docs and root
    docs_path = os.path.join("docs", "SCANMS_Ke_Hoach_Nang_Cap_He_Thong_Va_Phan_Cong_Thanh_Vien_2026.docx")
    root_path = "SCANMS_Ke_Hoach_Nang_Cap_He_Thong_Va_Phan_Cong_Thanh_Vien_2026.docx"
    doc.save(docs_path)
    doc.save(root_path)
    print(f"Document successfully created at {docs_path} and {root_path}")

if __name__ == "__main__":
    create_document()
