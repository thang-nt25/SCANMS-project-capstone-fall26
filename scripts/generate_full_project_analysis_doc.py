# -*- coding: utf-8 -*-
"""
Script sinh file tài liệu Word: TỔNG QUAN, ĐÁNH GIÁ VÀ ĐẶC TẢ CHI TIẾT TẤT CẢ CHỨC NĂNG & LUỒNG VẬN HÀNH HỆ THỐNG SCANMS
Bản cập nhật mới nhất đồng bộ với mã nguồn Git nhánh main (Commit f4fd564 — Tích hợp Module Reverse Logistics & Return Pickup Workflow)
Đồ án Tốt nghiệp Kỹ sư Kỹ thuật Phần mềm — FA26SE032
Tác giả / Leader: Nguyễn Thành Thắng (SE184251)
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = docx.Document()
    
    # Thiết lập Margin chuẩn: Top 2cm, Bottom 2cm, Left 2.5cm, Right 2cm
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.79)     # ~2.0 cm
        section.bottom_margin = Inches(0.79)  # ~2.0 cm
        section.left_margin = Inches(0.98)    # ~2.5 cm
        section.right_margin = Inches(0.79)   # ~2.0 cm
        
        # Header & Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("SCANMS Platform (FA26SE032) — Báo Cáo Phân Tích Hệ Thống & Luồng Nghiệp Vụ (Bản Cập Nhật Mới Nhất)")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(125, 113, 94) # Muted
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Hệ Thống Sàn Thương Mại Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác — Cập Nhật Tháng 10/2026")
        frun.font.name = "Arial"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(125, 113, 94)
        
    # Màu sắc định danh thương hiệu Vàng Be (Warm Sand Gold)
    COLOR_BRAND = RGBColor(197, 155, 88)       # #C59B58 - Nâu Vàng Ánh Kim
    COLOR_BRAND_STRONG = RGBColor(184, 142, 79)# #B88E4F - Nâu Vàng Đậm
    COLOR_DARK = RGBColor(26, 22, 18)          # #1A1612 - Deep Ink
    COLOR_MUTED = RGBColor(125, 113, 94)       # #7D715E - Warm Muted
    COLOR_SLATE = RGBColor(30, 41, 59)         # #1E293B - Dark Slate
    
    HEX_BRAND = "C59B58"
    HEX_BRAND_STRONG = "B88E4F"
    HEX_BRAND_SOFT = "FBF5EB"
    HEX_SURFACE_SAND = "F3EFE6"
    HEX_BORDER = "EAE4D7"
    HEX_DARK = "1E293B"
    HEX_WHITE = "FFFFFF"
    
    # Helper: Set background color for a cell
    def set_cell_background(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)
        
    # Helper: Set cell margins (padding)
    def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # Helper: Callout Box (Hộp điểm nhấn)
    def add_callout_box(text, title=None, border_color="C59B58", bg_color="FBF5EB"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        cell = table.cell(0, 0)
        cell.width = Inches(6.7)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=180)
        
        # Border left
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        tcPr.append(borders)
        
        cp = cell.paragraphs[0]
        cp.paragraph_format.line_spacing = 1.2
        cp.paragraph_format.space_before = Pt(2)
        cp.paragraph_format.space_after = Pt(2)
        
        if title:
            trun = cp.add_run(f"📌 {title}\n")
            trun.bold = True
            trun.font.name = "Arial"
            trun.font.size = Pt(10.5)
            trun.font.color.rgb = COLOR_BRAND_STRONG
            
        mrun = cp.add_run(text)
        mrun.font.name = "Arial"
        mrun.font.size = Pt(9.5)
        mrun.font.color.rgb = COLOR_DARK
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # Helper: Add Custom Heading
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(15)
        run.font.color.rgb = COLOR_BRAND_STRONG
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(12.5)
        run.font.color.rgb = COLOR_SLATE
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_BRAND
        return p

    def add_body_paragraph(text, bold_prefix=None, space_after=5):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.25
        p.paragraph_format.space_after = Pt(space_after)
        if bold_prefix:
            br = p.add_run(bold_prefix)
            br.bold = True
            br.font.name = "Arial"
            br.font.size = Pt(10.5)
            br.font.color.rgb = COLOR_DARK
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(10.5)
        run.font.color.rgb = COLOR_DARK
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_after = Pt(3)
        if bold_prefix:
            br = p.add_run(bold_prefix)
            br.bold = True
            br.font.name = "Arial"
            br.font.size = Pt(10)
            br.font.color.rgb = COLOR_DARK
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(10)
        run.font.color.rgb = COLOR_DARK
        return p

    # Helper: Styled Table
    def create_styled_table(headers, rows_data, col_widths=None, header_bg="C59B58"):
        table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        
        # Header Row
        hdr_cells = table.rows[0].cells
        for idx, header_text in enumerate(headers):
            cell = hdr_cells[idx]
            if col_widths and idx < len(col_widths):
                cell.width = col_widths[idx]
            set_cell_background(cell, header_bg)
            set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            run = p.add_run(header_text)
            run.bold = True
            run.font.name = "Arial"
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)
            
        # Data Rows
        for r_idx, row_values in enumerate(rows_data):
            row_cells = table.rows[r_idx + 1].cells
            bg_color = HEX_BRAND_SOFT if r_idx % 2 == 1 else HEX_WHITE
            for c_idx, val in enumerate(row_values):
                cell = row_cells[c_idx]
                if col_widths and c_idx < len(col_widths):
                    cell.width = col_widths[c_idx]
                set_cell_background(cell, bg_color)
                set_cell_margins(cell, top=100, bottom=100, left=130, right=130)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                
                # Viền mỏng
                tcPr = cell._tc.get_or_add_tcPr()
                borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/></w:tcBorders>')
                tcPr.append(borders)
                
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                
                # Căn lề thông minh
                if c_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif any(kw in headers[c_idx].lower() for kw in ["tỉ lệ", "trạng thái", "role", "loại"]):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    
                run = p.add_run(str(val))
                run.font.name = "Arial"
                run.font.size = Pt(9.0)
                run.font.color.rgb = COLOR_DARK
                
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        return table

    # =========================================================================
    # TRANG BÌA & TIÊU ĐỀ
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("TRƯỜNG ĐẠI HỌC FPT TP. HỒ CHÍ MINH\nKHOA CÔNG NGHỆ THÔNG TIN — BỘ MÔN KỸ THUẬT PHẦN MỀM\n")
    r_inst.bold = True
    r_inst.font.name = "Arial"
    r_inst.font.size = Pt(10)
    r_inst.font.color.rgb = COLOR_MUTED
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(24)
    p_title.paragraph_format.space_after = Pt(8)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BÁO CÁO PHÂN TÍCH TOÀN DIỆN KIẾN TRÚC HỆ THỐNG,\nĐỐI CHIẾU CHỨC NĂNG VÀ ĐẶC TẢ CHI TIẾT CÁC LUỒNG VẬN HÀNH\nNỀN TẢNG SCANMS (FA26SE032)")
    r_title.bold = True
    r_title.font.name = "Arial"
    r_title.font.size = Pt(17)
    r_title.font.color.rgb = COLOR_BRAND_STRONG
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(20)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Sales Collaborator & Affiliate Network Management System\nNghiên Cứu Chuyên Sâu Về Bản Sắc Đa Gian Hàng, Cơ Chế Quỹ Escrow, Quy Trình Thu Hồi Hàng Đổi Trả (Reverse Logistics), Ma Trận Luân Chuyển Nghiệp Vụ & Định Hướng Tương Lai\n(Cập nhật đồng bộ nhánh main mới nhất — Tháng 10/2026)")
    r_sub.italic = True
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10.5)
    r_sub.font.color.rgb = COLOR_MUTED
    
    # Metadata Block
    add_callout_box(
        "• Đề tài: SCANMS — Sàn Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác (Mã số: FA26SE032)\n"
        "• Giảng viên hướng dẫn: ThS. Tôn Thất Hoàng Minh\n"
        "• Trưởng nhóm thực hiện: Nguyễn Thành Thắng (MSSV: SE184251) — Chịu trách nhiệm kiến trúc & an ninh\n"
        "• Thành viên nhóm: Nguyễn Đình Tuấn (Frontend/Security), Phan Xuân Thịnh (Orders/Returns/Escrow), Nguyễn Phú Quý (AI/Audit)\n"
        "• Thời gian hoàn thành: Học kỳ Fall 2026 | Công nghệ: NestJS 11, PostgreSQL, Redis, React 19, Vite, PayOS, GHN Reverse Logistics\n"
        "• Phiên bản tài liệu: v2.1.0 — Đồng bộ toàn diện sau khi tích hợp Module Return Fulfillment & Reverse Logistics (Commit f4fd564)",
        title="THÔNG TIN HỒ SƠ DỰ ÁN & BẢN QUYỀN HỆ THỐNG",
        border_color=HEX_BRAND,
        bg_color=HEX_BRAND_SOFT
    )

    # =========================================================================
    # PHẦN 1: TỔNG QUAN DỰ ÁN SCANMS
    # =========================================================================
    add_heading_1("PHẦN 1: TỔNG QUAN DỰ ÁN SCANMS — BẢN SẮC & KIẾN TRÚC NỀN TẢNG")
    
    add_body_paragraph(
        "Trong bối cảnh thị trường thương mại điện tử và tiếp thị số tại Việt Nam đang bùng nổ mạnh mẽ với làn sóng Social Commerce, việc kết nối trực tiếp giữa các nhãn hàng sản xuất và mạng lưới nhà sáng tạo nội dung (KOL/KOC) vẫn đang đối mặt với những rào cản nghiêm trọng: rò rỉ đơn hàng, gian lận click ảo, thiếu minh bạch trong tỷ lệ hoa hồng, và đặc biệt là rủi ro thanh toán khi khách hàng bùng hàng hoặc khiếu nại đổi trả. SCANMS (Sales Collaborator and Affiliate Network Management System - FA26SE032) ra đời như một giải pháp công nghệ toàn diện, giải quyết triệt để các bài toán hóc búa này dưới mô hình một Sàn Thương Mại Tiếp Thị Liên Kết Đa Gian Hàng (Multi-Merchant & Affiliate Network)."
    )
    
    add_heading_2("1.1. Bản Sắc Cốt Lõi: Sàn Đa Gian Hàng (Multi-Merchant Marketplace)")
    add_body_paragraph(
        "Một trong những nguyên tắc kiến trúc tối thượng được xác lập ngay từ ngày đầu thiết kế dự án là: ",
        bold_prefix="Quy tắc Bản sắc: "
    )
    add_bullet("SCANMS không bao giờ là trang bán hàng đơn lẻ của một nhãn hiệu cụ thể nào (như Sora Skin hay Aura Bio). 'Sora Skin Official' chỉ là một trong nhiều đối tác doanh nghiệp kinh doanh trên sàn.", bold_prefix="Tính độc lập: ");
    add_bullet("Hệ thống đóng vai trò sàn giao dịch trung gian, bảo chứng pháp lý, điều phối dòng tiền thanh toán và trọng tài độc lập đứng giữa 4 nhóm tác nhân chính: Khách Hàng (Customer), Nhà Sáng Tạo (KOL/KOC), Chủ Gian Hàng (Merchant/Shop), và Ban Quản Trị Sàn (System Manager/Admin).", bold_prefix="Cơ cấu đa bên: ");
    add_bullet("Mỗi sản phẩm xuất hiện trên sàn đều hiển thị minh bạch 2 yếu tố trọng tâm: Tên gian hàng cung cấp chính hãng và Mức hoa hồng thực tế dành cho đối tác quảng bá (Ví dụ: 'Hoa hồng CTV: 22% ~91.000 ₫').", bold_prefix="Minh bạch tài chính: ");

    add_heading_2("1.2. Hệ Thống Nhận Diện Thương Hiệu: Vàng Be (Warm Sand & Brand Gold)")
    add_body_paragraph(
        "Khác biệt với xu hướng sử dụng màu sắc công nghiệp thông thường, SCANMS xây dựng một ngôn ngữ thiết kế độc quyền mang phong cách Vàng Be Sang Trọng (Warm Sand & Brand Gold). Toàn bộ hệ thống giao diện loại bỏ triệt để các gam màu xanh lá cây lỗi thời từ các bản nháp sơ khai, đồng bộ hoá 100% theo các atomic tokens nghiêm ngặt:"
    )
    
    brand_table_headers = ["Token CSS", "Mã Màu Hex", "Ý Nghĩa & Vị Trí Bắt Buộc Áp Dụng"]
    brand_table_data = [
        ["--canvas", "#FAF8F5", "Nền toàn bộ trang web (Soft Warm Cream), giảm mỏi mắt, sang trọng"],
        ["--surface-sand", "#F3EFE6", "Nền Sidebar, khay tab chọn vai trò, thẻ card phụ, bộ lọc (Warm Sand)"],
        ["--surface", "#FFFFFF", "Nền thẻ Card chính, bảng biểu, modal đối thoại, form nhập liệu"],
        ["--brand", "#C59B58", "Nút bấm chính ('Đăng nhập an toàn', 'Đặt mua ngay', 'Xác nhận'), CTA chính"],
        ["--brand-strong", "#B88E4F", "Điểm nhấn chữ, icon thương hiệu, trạng thái active, viền hover"],
        ["--brand-soft", "#FBF5EB", "Nền badge ưu đãi, nền pill hoa hồng KOL, callout thông báo"],
        ["--border / --line", "#EAE4D7", "Đường kẻ phân cách, viền ô nhập liệu, viền thẻ sản phẩm"],
        ["--ink", "#1A1612", "Màu chữ chính, tiêu đề H1-H6, giá tiền, số liệu tài chính"],
        ["--muted", "#7D715E", "Màu chữ phụ, mô tả phụ trợ, nhãn chú thích"],
        ["Logo chữ S", "Vector Quốc Gia", "Tích hợp biểu tượng bản đồ Việt Nam, khẳng định chủ quyền Hoàng Sa & Trường Sa"]
    ]
    create_styled_table(brand_table_headers, brand_table_data, [Inches(1.5), Inches(1.3), Inches(3.9)])

    add_heading_2("1.3. Ngăn Xếp Công Nghệ (Technology Stack) Hiện Đại")
    add_bullet("NestJS 11 với TypeScript nghiêm ngặt, áp dụng kiến trúc Module hóa (Modular Architecture), Dependency Injection, Data Transfer Objects (DTO) với class-validator & Zod schemas, Exception Filters toàn cục, Interceptors ghi nhật ký.", bold_prefix="Backend Enterprise: ");
    add_bullet("PostgreSQL kết hợp Prisma ORM thế hệ mới (v7.10.0), thiết kế chuẩn hóa 3NF gồm 34 bảng dữ liệu quan hệ, hỗ trợ khóa dòng SELECT FOR UPDATE bảo đảm tính toàn vẹn giao dịch tài chính.", bold_prefix="Cơ Sở Dữ Liệu: ");
    add_bullet("Hệ thống bộ nhớ đệm Redis vận hành độc lập, xử lý Sliding Window Rate Limiting (chống spam click referral), In-memory Cache giảm tải truy vấn DB và Quản lý phân tán.", bold_prefix="Bộ Nhớ Đệm Tốc Độ Cao: ");
    add_bullet("React 19 kết hợp Vite, kiến trúc Component hoá sạch, Tailwind CSS v4, Lucide Icons, thư viện Recharts vẽ biểu đồ động, Leaflet bản đồ và Socket.io-client.", bold_prefix="Frontend Hiện Đại: ");
    add_bullet("Tích hợp thư viện chuẩn doanh nghiệp @tanstack/react-query v5 giúp caching dữ liệu client theo chiến lược Stale-While-Revalidate, mang lại tốc độ chuyển trang tức thì (0ms).", bold_prefix="Quản Lý State & Cache: ");
    add_bullet("Cổng thanh toán tự động PayOS chuẩn ngân hàng Việt Nam, cho phép quét mã VietQR Napas 24/7 và xác nhận đơn hàng thành công qua Webhook an toàn.", bold_prefix="Cổng Thanh Toán: ");
    add_bullet("Tích hợp module Reverse Logistics chuyên biệt: Bộ điều phối lấy hàng hoàn tận nhà (GHN Staging & Mock Courier), Máy trạng thái hữu hạn (State Machine) quản lý vòng đời kiện hàng đổi trả và SLA kiểm định 48h.", bold_prefix="Hậu Cần Thu Hồi (Reverse Logistics): ");

    # =========================================================================
    # PHẦN 2: ĐỐI CHIẾU CHỨC NĂNG BAN ĐẦU VÀ CÁC CẢI TIẾN BỔ SUNG
    # =========================================================================
    add_heading_1("PHẦN 2: BẢNG TỔNG HỢP VÀ ĐỐI CHIẾU CHỨC NĂNG (BAN ĐẦU vs BỔ SUNG)")
    
    add_body_paragraph(
        "Trong quá trình triển khai thực tế từ tài liệu yêu cầu ban đầu (SRS) đến phiên bản vận hành hiện tại, nhóm phát triển đã không chỉ hoàn thành xuất sắc 32 chức năng nghiệp vụ ban đầu (FR-01 → FR-32) mà còn nghiên cứu thực chiến từ các sàn lớn (Shopee, TikTok Shop) để phát triển thêm hơn 16 tính năng bổ sung mang tính đột phá, biến SCANMS thành một hệ sinh thái khép kín 'không kẽ hở'."
    )
    
    add_heading_2("2.1. Ma Trận 32 Chức Năng Cốt Lõi Ban Đầu (FR-01 → FR-32)")
    
    fr_table_headers = ["Mã FR", "Tên Chức Năng", "Thành Viên", "Hiện Trạng Hoàn Thành", "Mô Tả Kỹ Thuật & CSDL"]
    fr_table_data = [
        ["FR-01", "Đăng ký tài khoản đa vai trò", "Thắng", "Hoàn thành 100%", "Argon2id hashing, Google OAuth, phân quyền Users/UserRoles"],
        ["FR-02", "Đăng nhập an toàn & JWT", "Thắng", "Hoàn thành 100%", "Access Token (15m), Refresh Token (7d), Rate Limiting"],
        ["FR-03", "Xác thực 2 bước & Khôi phục MK", "Thắng", "Hoàn thành 100%", "OTP Email 6 số thời hạn 5 phút, Argon2id reset password"],
        ["FR-04", "Phân quyền người dùng RBAC", "Thắng", "Hoàn thành 100%", "RolesGuard, 5 vai trò độc lập, phân tách Workspace dynamic"],
        ["FR-05", "Nộp hồ sơ định danh KYC", "Thắng", "Hoàn thành 100%", "KYC cá nhân (CCCD 2 mặt) & KYC Doanh nghiệp (GPKD, MST)"],
        ["FR-06", "Xét duyệt hồ sơ KYC đa cấp", "Thắng", "Hoàn thành 100%", "Admin/Manager duyệt hồ sơ, tra cứu lịch sử, Audit log"],
        ["FR-07", "Quản lý kênh MXH của KOL", "Thắng", "Hoàn thành 100%", "Liên kết TikTok, FB, YouTube, phân tích Followers, chống mock"],
        ["FR-08", "Kho nội dung số Media Hub", "Thắng/Tuấn", "Hoàn thành 100%", "Banner HD, Video review gốc, 1-Click Copy kịch bản SEO"],
        ["FR-09", "Cấu hình hoa hồng sản phẩm", "Tuấn", "Hoàn thành 100%", "Hỗ trợ 2 chiều: Tỷ lệ % hoặc Số tiền cố định (VNĐ)"],
        ["FR-10", "Tạo link tiếp thị định danh", "Tuấn", "Hoàn thành 100%", "Sinh link rút gọn /r/:shortCode có chữ ký HMAC bảo mật"],
        ["FR-11", "Tạo mã QR Canvas tương tác", "Tuấn", "Hoàn thành 100%", "HTML5 Canvas 512x512, bộ kiểm định độ tương phản WCAG"],
        ["FR-12", "Mã giảm giá độc quyền KOL", "Tuấn", "Hoàn thành 100%", "Kiểm tra cú pháp, hạn dùng, ngân sách, tự gán vào link/QR"],
        ["FR-13", "Động cơ Tracking Last-Click", "Tuấn", "Hoàn thành 100%", "Cookie 30 ngày signed HMAC, ghi nhận AttributionSession"],
        ["FR-14", "Chống click ảo spam Redis", "Tuấn", "Hoàn thành 100%", "Sliding Window Rate Limit trên Redis, chặn IP cùng dải"],
        ["FR-15", "Landing Page Video Review", "Tuấn", "Hoàn thành 100%", "Ưu tiên video KOL giới thiệu, che tên khách, schema SEO"],
        ["FR-16", "Đặt hàng nhanh 1-chạm", "Tuấn", "Hoàn thành 100%", "Tự động áp cookie tiếp thị, tính chiết khấu coupon, trừ kho"],
        ["FR-17", "Ghi nhận đơn hàng & Trừ kho", "Thịnh", "Hoàn thành 100%", "Trừ tồn kho atomic, lưu Order, OrderItems, trạng thái đơn"],
        ["FR-18", "Đánh giá chất lượng sản phẩm", "Thịnh", "Hoàn thành 100%", "Verified Review Gate chỉ cho đơn DELIVERED, chấm 1-5 sao"],
        ["FR-19", "Đồng bộ đơn ngoài Shopee/TikTok", "Thịnh", "Hoàn thành 100%", "Tiếp nhận Webhook ngoài, Import file lô Excel đối soát"],
        ["FR-20", "Quản lý tiến độ đơn hàng Shop", "Thịnh", "Hoàn thành 100%", "Chuyển trạng thái PENDING -> SHIPPING -> DELIVERED"],
        ["FR-21", "Cơ chế tính hoa hồng đa tầng", "Thịnh", "Hoàn thành 100%", "Tách hoa hồng gốc + thưởng cấp bậc Tier, ghi nhận bảng Commission"],
        ["FR-22", "Quỹ bảo chứng Escrow 14 ngày", "Thịnh/Thắng", "Hoàn thành 100%", "Giam hoa hồng ở trạng thái PENDING, tự động duyệt sang AVAILABLE"],
        ["FR-23", "Thu hồi hoa hồng (Clawback)", "Thịnh", "Hoàn thành 100%", "Tự động hủy hoa hồng về 0 khi đơn bị CANCELLED hoặc RETURNED"],
        ["FR-24", "Rút tiền & Khấu trừ thuế 10%", "Thịnh", "Hoàn thành 100%", "SELECT FOR UPDATE chống âm ví, trích 10% thuế TNCN, xuất VietQR"],
        ["FR-25", "Quy trình xin hàng mẫu 4 bước", "Quý", "Hoàn thành 100%", "Gửi yêu cầu -> Shop duyệt cấp vận đơn -> Nhận hàng -> Nộp video"],
        ["FR-26", "Nhắn tin trao đổi Shop ⇄ KOL", "Quý", "Hoàn thành 100%", "Socket.io Gateway realtime, lọc từ ngữ thô tục Profanity"],
        ["FR-27", "Mời chiến dịch VIP qua Chat", "Quý", "Hoàn thành 100%", "Gửi thẻ chiến dịch độc quyền hoa hồng thưởng vào khung chat"],
        ["FR-28", "Dashboard doanh số Realtime", "Quý", "Hoàn thành 100%", "Thống kê GMV, số đơn, hoa hồng, biểu đồ tăng trưởng doanh số"],
        ["FR-29", "Bảng xếp hạng Top KOL", "Quý", "Hoàn thành 100%", "Bục vinh danh Podium Top 3, danh sách Top 10 kèm huy hiệu cấp bậc"],
        ["FR-30", "AI Smart Matching gợi ý KOL", "Quý", "Hoàn thành 100%", "Tính điểm tương thích ngành hàng (Affinity Score), gợi ý nhãn hàng"],
        ["FR-31", "AI Fraud Sentinel chống gian lận", "Quý", "Hoàn thành 100%", "Phát hiện tự mua (Self-Referral), traffic đột biến, khóa quyền"],
        ["FR-32", "Nhật ký an ninh Audit Trail", "Quý", "Hoàn thành 100%", "Ghi vết mọi biến động tài chính và kiểm duyệt, hash SHA-256"]
    ]
    create_styled_table(fr_table_headers, fr_table_data, [Inches(0.7), Inches(1.8), Inches(0.8), Inches(1.1), Inches(2.3)])

    add_heading_2("2.2. Danh Mục Các Chức Năng Cải Tiến Bổ Sung Đột Phá (Beyond SRS)")
    add_body_paragraph(
        "Nhận thấy các khoảng trống thực tế khi vận hành một sàn thương mại điện tử chuyên nghiệp, Leader Nguyễn Thành Thắng và nhóm đã tiên phong xây dựng thêm các module trọng yếu sau:"
    )
    
    add_bullet("Shopee và TikTok Shop bắt buộc 100% người mua phải có định danh. SCANMS đã loại bỏ luồng mua hàng nặc danh; mọi đơn hàng đều gắn chặt chẽ với User ID, bảo đảm cơ sở pháp lý để mở khiếu nại đổi trả và tra cứu lịch sử mua sắm.", bold_prefix="1. Bắt Buộc Đăng Nhập 100% (Loại bỏ Khách vãng lai): ");
    add_bullet("Xây dựng cổng riêng biệt cho người mua hàng (/customer/orders, /customer/addresses, /customer/wishlist) quản lý đơn hàng theo 6 trạng thái, sổ địa chỉ 3 cấp Tỉnh/Quận/Phường, danh sách yêu thích và bảo mật tài khoản.", bold_prefix="2. Hệ Sinh Thái Cổng Khách Hàng (Customer Portal): ");
    add_bullet("Bổ sung quy trình hoàn trả hàng toàn diện: Shop thiết lập Kho hoàn hàng một lần duy nhất; Khách đặt lịch bưu tá qua nhà lấy hàng (Reverse Pickup Booking) với hạn chót 7 ngày; Tích hợp GHN Staging & Mock tracking (SC-R-...); Máy trạng thái Finite State Machine 12 bước nghiêm ngặt.", bold_prefix="3. Quy Trình Thu Hồi Hàng Đổi Trả (Reverse Logistics & Return Fulfillment): ");
    add_bullet("Sau khi Shop nhận kiện hàng hoàn, hệ thống kích hoạt bộ đếm thời gian SLA 48 giờ. Cronjob ReturnDeadlineJob chạy mỗi 10 phút: nếu Shop chậm trễ kiểm định, hệ thống tự động leo thang (inspectionEscalatedAt) báo động cho Admin và cho phép Khách mở tranh chấp tức thì.", bold_prefix="4. Giám Sát SLA Kiểm Định Hàng Hoàn 48h (Inspection SLA Escalation): ");
    add_bullet("Màn hình chia đôi dành riêng cho Admin/Manager (/admin/disputes & /admin/return-disputes): Xem video mở hộp, chứng từ đóng gói, hàng đợi các ca quá hạn kiểm định; Admin có 3 nút phán quyết: [Ép Shop hoàn tiền], [Yêu cầu đổi hàng mới], hoặc [Bác bỏ khiếu nại].", bold_prefix="5. Cổng Trọng Tài Khiếu Nại Độc Lập (Dispute Resolution Portal): ");
    add_bullet("Tích hợp màn hình LiveStreamRoomPage.tsx cho phép KOL phát sóng trực tiếp, ghim túi đồ sản phẩm ưu đãi góc màn hình, khách mua hàng trực tiếp trong phiên live không gián đoạn tương tác.", bold_prefix="6. Phòng Mua Sắm Trực Tiếp (Interactive Live Shopping): ");
    add_bullet("Triển khai quy trình nâng cấp tài khoản tuân thủ Nghị định 85/2021/NĐ-CP: Tài khoản Customer có thể nộp hồ sơ xin nâng cấp thành Creator KOL (kèm kênh MXH, CCCD, STK) hoặc Đối Tác Gian Hàng (kèm GPKD, MST).", bold_prefix="7. Quy Trình Nâng Cấp Đối Tác 2 Tầng (Two-Tier Compliance KYC): ");
    add_bullet("Cho phép người dùng chuyển đổi tức thì giữa Khách Mua ⇄ Creator KOL ⇄ Chủ Shop trên cùng một tài khoản mà không làm mất lịch sử đơn hàng hay sổ địa chỉ.", bold_prefix="8. Bộ Chuyển Đổi Không Gian Làm Việc (Workspace Switcher): ");
    add_bullet("Xây dựng thuật toán phân loại biến thể sản phẩm (Size S/M/L, Dung tích 30ml/50ml, Đường kính), tự động cập nhật đơn giá, tồn kho và SKU theo thời gian thực.", bold_prefix="9. Hệ Thống Biến Thể Sản Phẩm Đa Chiều (Product Variants): ");
    add_bullet("Tự động sinh mã vận đơn chuẩn (GHN-2026xxxx), hỗ trợ in phiếu đóng gói A6 Barcode và nút bấm mô phỏng cập nhật trạng thái lấy hàng / giao hàng phục vụ kiểm thử nhanh.", bold_prefix="10. Bộ Mô Phỏng Vận Chuyển & In Phiếu A6 (Shipping Simulator): ");
    add_bullet("Tích hợp nút chat nổi ở góc phải màn hình toàn sàn, cho phép khách hàng đang xem bất kỳ sản phẩm nào cũng có thể mở khung chat realtime tư vấn trực tiếp với Chủ shop.", bold_prefix="11. Kênh Nhắn Tin Khách Hàng ⇄ Shop Nổi (Floating Live Chat): ");
    add_bullet("Giỏ hàng của khách hàng được lưu trữ và đồng bộ hóa trực tiếp vào cơ sở dữ liệu PostgreSQL, giúp khách lướt điện thoại thêm hàng thì khi mở máy tính đăng nhập giỏ hàng vẫn nguyên vẹn.", bold_prefix="12. Giỏ Hàng Tập Trung (Cart Persistence): ");

    # =========================================================================
    # PHẦN 3: PHÂN TÍCH WEB & NHẬN XÉT ĐÁNH GIÁ TỔNG QUAN
    # =========================================================================
    add_heading_1("PHẦN 3: PHÂN TÍCH WEB & ĐÁNH GIÁ TỔNG QUAN HỆ THỐNG")
    
    add_body_paragraph(
        "Trải qua quá trình rà soát, kiểm thử mã nguồn và đo lường hiệu năng thực tế, hệ sinh thái SCANMS thể hiện sự vượt trội về mặt kỹ thuật so với các bài tập lớn đại học thông thường, tiệm cận tiêu chuẩn của một sản phẩm thương mại sẵn sàng gọi vốn (Production-Ready SaaS)."
    )
    
    add_heading_2("3.1. Đánh Giá Kiến Trúc Kỹ Thuật & Tính Toàn Vẹn Dữ Liệu")
    add_bullet("Backend áp dụng kiến trúc phân tầng sạch (Clean Architecture) với 27 Modules độc lập. Việc sử dụng Guards, Interceptors và Pipes giúp toàn bộ các request đầu vào đều được khử khuẩn dữ liệu (Sanitization) và xác thực chặt chẽ.", bold_prefix="Tính Module Hóa: ");
    add_bullet("Phân hệ ví tiền và rút tiền áp dụng cơ chế khóa bi quan (Pessimistic Locking) qua câu lệnh SQL 'SELECT ... FOR UPDATE'. Điều này loại bỏ 100% rủi ro Race Condition khi người dùng cố tình nhấn liên tục nhiều lệnh rút tiền đồng thời để trục lợi âm ví.", bold_prefix="An Toàn Tài Chính Tuyệt Đối: ");
    add_bullet("Mọi biến động số dư ví (Hoa hồng phát sinh, duyệt sang khả dụng, trích thuế, hoàn tiền, rút tiền) đều được ghi nhận vào bảng Sổ cái tài chính bất biến (Append-Only Ledger), nghiêm cấm hành vi UPDATE số dư thô.", bold_prefix="Sổ Cái Kế Toán Kép (Ledger): ");
    add_bullet("Module Returns áp dụng Finite State Machine với 12 trạng thái rõ ràng, ngăn chặn hoàn toàn việc nhảy cóc trạng thái hoặc gian lận hoàn tiền khi chưa nhận lại hàng vật lý.", bold_prefix="Máy Trạng Thái Hữu Hạn (State Machine): ");
    add_bullet("Sự kết hợp giữa Cookie HMAC Opaque Token (thời hạn 30 ngày) và Thuật toán trượt thời gian (Sliding Window) trên Redis đảm bảo quyền lợi hoa hồng Last-Click Wins được bảo vệ trọn vẹn, đồng thời dập tắt mọi đợt tấn công Botnet click ảo.", bold_prefix="Động Cơ Tiếp Thị Bền Vững: ");

    add_heading_2("3.2. Đánh Giá Trải Nghiệm Người Dùng (UI/UX) & Hiệu Năng Frontend")
    add_bullet("Hệ thống đồng bộ 100% theo tông màu Vàng Be (Warm Sand & Brand Gold). Độ tương phản văn bản đạt chuẩn WCAG 2.1 AA (tỷ lệ >= 4.5:1), tạo cảm giác ấm cúng, sang trọng và nâng tầm giá trị các nhãn hàng đối tác.", bold_prefix="Tính Thẩm Mỹ & Sang Trọng: ");
    add_bullet("Việc tích hợp thư viện @tanstack/react-query kết hợp bộ nhớ đệm an toàn giúp loại bỏ hoàn toàn các màn hình nháy trắng hoặc loading spinner khó chịu khi chuyển tab.", bold_prefix="Tốc Độ Phản Hồi Tức Thì: ");
    add_bullet("Toàn bộ các trang từ Marketplace, Giỏ hàng, Danh mục sản phẩm đến Quản trị đơn hàng và Chi tiết đổi trả đều hỗ trợ Responsive hoàn hảo trên điện thoại di động và máy tính bảng.", bold_prefix="Trải Nghiệm Đa Nền Tảng: ");

    add_heading_2("3.3. So Sánh Đối Chiếu Thực Chiến: SCANMS vs Shopee vs TikTok Shop")
    
    cmp_headers = ["Tiêu Chí So Sánh", "Shopee / TikTok Shop", "Hệ Thống SCANMS (FA26SE032)"]
    cmp_data = [
        ["Định vị nền tảng", "Sàn TMĐT bán lẻ B2C khổng lồ, cạnh tranh giá khốc liệt", "Sàn chuyên biệt Tiếp thị liên kết & Mạng lưới KOC chất lượng cao"],
        ["Cơ chế hoa hồng", "Phức tạp, phí sàn cắt phế rất cao (12% - 18% GMV)", "Minh bạch 2 tầng (Open vs Exclusive Deal), phí sàn chỉ 3%"],
        ["Quy trình hàng mẫu", "KOL xin mẫu thụ động, Shop khó theo dõi nghĩa vụ review", "Quy trình chuẩn 4 bước: Cam kết nộp video trong 14 ngày, tracking bưu cục"],
        ["Cơ chế Escrow & Đổi trả", "Tự động hoàn tiền máy móc, Shop dễ bị thiệt thòi", "Quỹ Escrow 14 ngày + Reverse Logistics bưu tá lấy hàng + Trọng Tài độc lập"],
        ["Giám sát kiểm định hàng hoàn", "Shop ngâm hàng lâu khách không biết kêu ai", "SLA 48h tự động leo thang (Escalation Job), thông báo đỏ toàn hệ thống"],
        ["Tài nguyên truyền thông", "Shop tự tải banner ngoài, không có kho kịch bản tập trung", "Kho Media Hub: 1-Click Copy kịch bản SEO, tải banner HD, video gốc"],
        ["Hỗ trợ đối tác nhỏ", "Thuật toán ưu tiên các Shop lớn chi nhiều tiền quảng cáo", "AI Smart Matching tự động ghép nối Shop mới với KOC phù hợp thế mạnh"]
    ]
    create_styled_table(cmp_headers, cmp_data, [Inches(1.8), Inches(2.5), Inches(2.4)])

    # =========================================================================
    # PHẦN 4: MA TRẬN ÁNH XẠ CHỨC NĂNG VÀO CÁC LUỒNG NGHIỆP VỤ (FLOWS)
    # =========================================================================
    add_heading_1("PHẦN 4: ĐẶC TẢ CHI TIẾT TẤT CẢ CÁC LUỒNG NGHIỆP VỤ (END-TO-END FLOWS)")
    
    add_body_paragraph(
        "Một hệ thống phần mềm lớn không vận hành bằng các chức năng đơn lẻ tách rời mà là sự phối hợp nhịp nhàng của các chức năng trong các chuỗi luồng nghiệp vụ (Business Flows). Dưới đây là đặc tả chi tiết 16 luồng vận hành khép kín của SCANMS, làm rõ một chức năng có thể phục vụ nhiều luồng khác nhau như thế nào:"
    )

    # -------------------------------------------------------------------------
    # FLOW 1
    # -------------------------------------------------------------------------
    add_heading_2("Flow 1: Luồng Đăng Ký, Đăng Nhập, Xác Thực & Đa Không Gian Làm Việc (IAM & Workspace Flow)")
    add_bullet("Khách hàng (Customer), Nhà sáng tạo (KOL/KOC), Chủ gian hàng (Merchant), Quản trị viên (Admin/Manager).", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-01 (Đăng ký tài khoản), FR-02 (Đăng nhập JWT), FR-03 (OTP Email 2FA & Quên mật khẩu), FR-04 (Phân quyền RBAC), Bộ chuyển đổi không gian (Workspace Switcher).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Cung cấp cánh cổng định danh pháp lý an toàn, hỗ trợ khách hàng đăng nhập nhanh, bảo mật mật khẩu cấp ngân hàng và chuyển đổi vai trò linh hoạt mà không làm phân mảnh dữ liệu.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Người dùng truy cập /register -> Mặc định đăng ký tài khoản Khách hàng (Customer-First) bằng Email, Họ tên, SĐT và Mật khẩu (hoặc bấm Đăng nhập nhanh Google 1-Click qua OAuth2).");
    add_bullet("Bước 2: Hệ thống kiểm tra trùng lặp Email/SĐT -> Băm mật khẩu bằng thuật toán Argon2id (đạt giải Password Hashing Competition) -> Lưu bản ghi vào bảng users với role mặc định là CUSTOMER.");
    add_bullet("Bước 3: Tại màn hình Đăng nhập (/login), người dùng nhập thông tin -> Hệ thống kiểm tra trạng thái tài khoản isActive -> Nếu hợp lệ, sinh cặp mã khóa JWT: Access Token (thời hạn 15 phút) và Refresh Token (lưu bảo mật vào DB thời hạn 7 ngày).");
    add_bullet("Bước 4: Nếu người dùng quên mật khẩu -> Bấm 'Quên mật khẩu?' -> Hệ thống sinh mã OTP 6 số ngẫu nhiên thời hạn 5 phút gửi qua MailService -> Người dùng nhập đúng OTP mới được phép đổi mật khẩu mới.");
    add_bullet("Bước 5: Sau khi đăng nhập, nếu người dùng đã được duyệt quyền làm KOL hoặc Chủ Shop -> Header hiển thị nút 'Workspace Switcher' cho phép chuyển đổi 1-chạm giữa Giao diện Mua sắm Khách hàng, Không gian Nhà sáng tạo KOL và Bàn làm việc Chủ Shop.");

    # -------------------------------------------------------------------------
    # FLOW 2
    # -------------------------------------------------------------------------
    add_heading_2("Flow 2: Luồng Định Danh Điện Tử & Nâng Cấp Tuân Thủ Pháp Lý (Two-Tier Compliance KYC Flow)")
    add_bullet("Khách hàng có nhu cầu nâng cấp, Ban Quản Trị Sàn (System Manager/Admin).", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-05 (Nộp hồ sơ định danh), FR-06 (Xét duyệt KYC đa cấp), Nâng cấp đối tác 2 tầng (PartnerUpgradeTab), FR-32 (Audit Logs).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Bảo đảm 100% đối tác nhận tiền hoa hồng và đối tác mở gian hàng trên sàn đều có đầy đủ thông tin định danh hợp pháp theo Nghị định 85/2021/NĐ-CP về TMĐT và Luật Thuế Việt Nam.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Người dùng có tài khoản Customer truy cập Cổng Khách Hàng -> Chọn tab 'Nâng cấp đối tác' (/customer/upgrade).");
    add_bullet("Bước 2A (Nâng cấp KOL): Người dùng điền liên kết các kênh MXH (TikTok, Facebook), khai báo số CCCD, upload ảnh CCCD 2 mặt, khai báo Mã số thuế cá nhân và Số tài khoản ngân hàng thụ hưởng.");
    add_bullet("Bước 2B (Nâng cấp Chủ Shop): Người dùng khai báo Tên doanh nghiệp/Hộ kinh doanh, upload Giấy phép đăng ký kinh doanh (GPKD), Mã số thuế công ty, địa chỉ kho xuất hàng và cam kết chính sách bảo hành.");
    add_bullet("Bước 3: Dữ liệu được gửi tới API POST /api/kyc/upgrade/kol hoặc /shop -> Lưu hồ sơ ở trạng thái PENDING.");
    add_bullet("Bước 4: Quản lý sàn (System Manager) truy cập màn hình /admin/users -> Kiểm tra chứng từ đối chiếu trực quan -> Bấm [Chấp thuận] hoặc [Từ chối kèm lý do].");
    add_bullet("Bước 5: Khi được duyệt: Hệ thống tự động cập nhật trường role của người dùng thành COLLABORATOR hoặc MERCHANT, kích hoạt Ví tài chính tương ứng và ghi vết kiểm toán vào bảng audit_logs.");

    # -------------------------------------------------------------------------
    # FLOW 3
    # -------------------------------------------------------------------------
    add_heading_2("Flow 3: Luồng Khởi Tạo & Thẩm Định Hàng Hóa Lên Sàn (Merchant Onboarding & Product Moderation Flow)")
    add_bullet("Chủ gian hàng (Merchant), Ban Kiểm Soát Sàn (Admin/Manager), Khách hàng mua sắm.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-09 (Cấu hình hoa hồng 2 chiều), Quản lý biến thể (Product Variants), Thẩm định kiểm duyệt sản phẩm (Product Moderation), FR-32 (Audit Logs).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Ngăn chặn hàng giả, hàng nhái và thực phẩm chức năng kém chất lượng; chuẩn hóa danh mục sản phẩm trước khi xuất hiện công khai trên sàn.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Chủ gian hàng truy cập /merchant/products -> Bấm 'Thêm sản phẩm mới'.");
    add_bullet("Bước 2: Khai báo thông tin sản phẩm: Tên hàng, ngành hàng, mô tả chi tiết, upload ảnh sản phẩm HD (kiểm tra an toàn URL chống SSRF), thiết lập giá gốc và giá khuyến mãi.");
    add_bullet("Bước 3: Thiết lập Biến thể (Variants): Tạo các tùy chọn phân loại (Size S/M/L, Dung tích 30ml/50ml, Đường kính chảo), gắn SKU riêng và tồn kho ban đầu cho từng biến thể.");
    add_bullet("Bước 4: Thiết lập Hoa hồng tiếp thị linh hoạt 2 chiều: Chọn trả theo Tỷ lệ % (VD: 15%) hoặc Số tiền cố định (VD: 50.000 ₫/sản phẩm) -> Công cụ tự động tính mức chi trả tương đương.");
    add_bullet("Bước 5: Upload chứng nhận nguồn gốc xuất xứ / Phiếu kiểm nghiệm chất lượng -> Bấm 'Gửi phê duyệt' -> Sản phẩm lưu ở trạng thái DRAFT / PENDING_APPROVAL.");
    add_bullet("Bước 6: Ban kiểm soát sàn vào /admin/product-moderation -> Kiểm tra tính hợp lệ của hồ sơ -> Bấm [Phê duyệt mở bán] -> Trạng thái chuyển sang ACTIVE -> Sản phẩm chính thức xuất hiện trên Marketplace.");

    # -------------------------------------------------------------------------
    # FLOW 4
    # -------------------------------------------------------------------------
    add_heading_2("Flow 4: Luồng Kết Nối Đối Tác, Thỏa Thuận Deal & Hàng Mẫu 4 Bước (Partner Collaboration & Sample Flow)")
    add_bullet("Nhà sáng tạo (KOL/KOC), Chủ gian hàng (Merchant).", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-25 (Xin hàng mẫu 4 bước), FR-26 (Chat Realtime Socket.io), FR-27 (Mời chiến dịch VIP), FR-30 (AI Smart Matching).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Tạo sợi dây liên kết mật thiết giữa nhãn hàng và người sáng tạo nội dung, bảo đảm trải nghiệm thực tế với hàng mẫu trước khi quảng bá sản phẩm ra cộng đồng.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Chủ Shop truy cập /merchant/kol-hub -> Sử dụng AI Smart Matching (FR-30) tính điểm tương thích ngành hàng (Affinity Score) để tìm danh sách KOL tiềm năng.");
    add_bullet("Bước 2: Shop mở khung Chat Realtime Socket.io (FR-26) với KOL -> Trao đổi brief kịch bản -> Bấm nút 'Gửi thiệp mời VIP' (FR-27) trao mức hoa hồng độc quyền 25% trực tiếp vào hộp thoại chat.");
    add_bullet("Bước 3 (Xin mẫu 4 bước - Bước 1): KOL vào tab 'Hàng Mẫu' -> Chọn sản phẩm muốn trải nghiệm -> Điền địa chỉ nhận hàng, chọn kênh phát sóng cam kết (TikTok/Reels) và định dạng video review -> Bấm 'Gửi yêu cầu'.");
    add_bullet("Bước 4 (Xin mẫu 4 bước - Bước 2): Shop nhận thông báo -> Vào /merchant/kol-hub duyệt yêu cầu -> Xuất kho hàng mẫu và nhập mã vận đơn bưu cục (VD: GHN-SAMPLE-202688).");
    add_bullet("Bước 5 (Xin mẫu 4 bước - Bước 3): Bưu tá giao kiện hàng đến tận nơi -> KOL kiểm tra gói hàng và bấm nút 'Tôi đã nhận được hàng' trên giao diện.");
    add_bullet("Bước 6 (Xin mẫu 4 bước - Bước 4): Hệ thống kích hoạt đồng hồ đếm ngược 14 ngày (336 giờ) cam kết -> KOL đăng video review thực tế lên mạng xã hội và dán link bài đăng vào hệ thống để hoàn tất chu trình.");

    # -------------------------------------------------------------------------
    # FLOW 5
    # -------------------------------------------------------------------------
    add_heading_2("Flow 5: Luồng Tiếp Thị Số Đa Kênh, Media Hub & QR Thông Minh (Affiliate Marketing & Toolkit Flow)")
    add_bullet("Nhà sáng tạo (KOL/KOC), Khách hàng tiềm năng trên mạng xã hội.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-08 (Media Hub), FR-10 (Tạo link rút gọn HMAC), FR-11 (QR Code Canvas tương tác), FR-12 (Coupon riêng KOL).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Trang bị cho KOL bộ vũ khí truyền thông toàn diện để quảng bá sản phẩm trên đa nền tảng (TikTok, Facebook, Instagram, YouTube) một cách chuyên nghiệp nhất.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: KOL truy cập Kho nội dung Media Hub (/collaborator/marketing?tab=media) -> Tải banner HD chuẩn kích thước Feed vuông hoặc Story 9:16; tải video review gốc của nhãn hàng.");
    add_bullet("Bước 2: KOL sử dụng công cụ '1-Click Copy Kịch Bản SEO' -> Lựa chọn 1 trong 4 phong cách (Hook giật tít, Review chuyên sâu, Flash deal FOMO, Kịch bản Livestream) đã được cá nhân hóa tự động theo tên và mã của KOL.");
    add_bullet("Bước 3: KOL vào tab 'Tạo Link & QR' -> Chọn sản phẩm mục tiêu và kênh quảng bá -> Hệ thống sinh liên kết rút gọn định danh duy nhất /r/:shortCode có gắn chữ ký số HMAC bảo mật.");
    add_bullet("Bước 4: Hệ thống tự động vẽ mã QR trên HTML5 Canvas độ phân giải cao 512x512 -> KOL có thể chỉnh màu theo nhận diện kênh và kiểm tra thước đo độ tương phản WCAG 2.1 trước khi tải file PNG.");
    add_bullet("Bước 5: KOL tạo hoặc áp mã giảm giá cá nhân (VD: THANG10 giảm 10%) vào link và mã QR -> Đăng bài viết/video lên mạng xã hội kêu gọi người theo dõi bấm link mua hàng.");

    # -------------------------------------------------------------------------
    # FLOW 6
    # -------------------------------------------------------------------------
    add_heading_2("Flow 6: Luồng Phòng Mua Sắm Livestream Trực Tiếp Tương Tác (LiveStream Shopping Room Flow)")
    add_bullet("KOL chủ trì phiên Live, Khách hàng theo dõi Livestream, Chủ gian hàng.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("LiveStreamRoomPage (Phòng Live tương tác), FR-12 (Voucher Livestream đếm ngược), FR-16 (Checkout 1-chạm), Socket.io Realtime Chat.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Tạo trải nghiệm mua sắm sống động như TikTok Live: Vừa xem livestream giới thiệu sản phẩm vừa bấm mua trực tiếp trong túi đồ ưu đãi mà không bị gián đoạn video.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: KOL thiết lập phiên phát sóng tại /collaborator/live-sessions -> Đặt tên phiên live (VD: 'Đại tiệc Mỹ phẩm Siêu Sale'), chọn danh sách sản phẩm ghim và phát sóng webcam trực tiếp.");
    add_bullet("Bước 2: Khách hàng truy cập đường link /live/:slug -> Xem luồng video mượt mà kèm khung bình luận tương tác thời gian thực qua WebSockets.");
    add_bullet("Bước 3: KOL bấm nút 'Ghim sản phẩm số 1' -> Hộp thẻ sản phẩm lập tức nổi bật ở góc dưới màn hình của toàn bộ người xem kèm giá chớp nhoáng (Flash Deal).");
    add_bullet("Bước 4: KOL tung mã giảm giá phiên live (có đồng hồ đếm ngược FOMO 10 phút) -> Khách hàng bấm nút 'Mua ngay' trên túi đồ ghim.");
    add_bullet("Bước 5: Modal thanh toán 1-chạm mở ra đè nhẹ lên màn hình -> Khách xác nhận địa chỉ và thanh toán tức thì mà âm thanh và hình ảnh livestream vẫn tiếp tục chạy ngầm phía sau.");

    # -------------------------------------------------------------------------
    # FLOW 7
    # -------------------------------------------------------------------------
    add_heading_2("Flow 7: Luồng Điều Hướng, Ghi Nhận Dấu Vết & Chống Gian Lận (Attribution & Anti-Fraud Flow)")
    add_bullet("Khách hàng bấm link tiếp thị, Động cơ Redis, Thuật toán AI Fraud Sentinel.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-10 (Redirect Handler), FR-13 (Tracking Cookie 30 ngày), FR-14 (Redis Rate Limit chống spam), FR-31 (AI Fraud Sentinel).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Ghi nhận chuẩn xác 100% công sức giới thiệu của KOL theo quy tắc Last-Click Wins, đồng thời ngăn chặn mọi thủ thuật gian lận traffic và tự mua hàng qua link của chính mình.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Khách hàng click vào đường link tiếp thị /r/:shortCode.");
    add_bullet("Bước 2 (Chống Click Spam): Backend chuyển hướng request qua Redis Sliding Window. Nếu cùng 1 địa chỉ IP gửi quá 10 click trong vòng 60 giây -> Chặn đứng request, không tính view ảo.");
    add_bullet("Bước 3 (Ghi nhận Attribution): Giải mã shortCode -> Ghi nhận lượt click hợp lệ vào bảng attribution_sessions -> Thiết lập Cookie scanms_attr thời hạn 30 ngày được ký số HMAC SHA-256 trên trình duyệt khách hàng.");
    add_bullet("Bước 4: Điều hướng khách hàng mượt mà sang trang chi tiết sản phẩm (/products/:slug) với các ưu đãi của đúng KOL đó.");
    add_bullet("Bước 5 (AI Fraud Sentinel giám sát): Khi khách tiến hành đặt hàng, thuật toán AI rà soát: Trùng IP giữa KOL và Khách? Trùng số điện thoại? Trùng địa chỉ giao hàng? -> Nếu phát hiện gian lận tự mua (Self-Referral), hệ thống tự động gán cờ FRAUD_SUSPECT, đình chỉ hoa hồng của đơn và gửi cảnh báo vào Dashboard của Shop.");

    # -------------------------------------------------------------------------
    # FLOW 8
    # -------------------------------------------------------------------------
    add_heading_2("Flow 8: Luồng Giỏ Hàng Tập Trung, Đặt Hàng & Thanh Toán Trực Tuyến (Persistent Cart & PayOS Flow)")
    add_bullet("Khách hàng mua sắm, Cổng thanh toán PayOS, Hệ thống ngân hàng Napas 24/7.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("Cart Persistence (Giỏ hàng PostgreSQL), FR-16 (Checkout Modal), Cổng PayOS (PayosReturnPage), Trừ kho tức thời (FR-17).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Tối ưu hóa tỷ lệ chuyển đổi đơn sắm (Conversion Rate), hỗ trợ thanh toán không tiền mặt chuẩn QR ngân hàng và đồng bộ dữ liệu giỏ hàng xuyên suốt mọi thiết bị.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Khách hàng lướt xem sản phẩm, chọn biến thể (Size/Dung tích) -> Bấm 'Thêm vào giỏ hàng' -> Dữ liệu giỏ được lưu lập tức vào PostgreSQL bảng cart_items gắn với User ID.");
    add_bullet("Bước 2: Mở Cart Drawer -> Hệ thống tự động kiểm tra tồn kho thời gian thực -> Tự động điền mã ưu đãi từ Cookie tiếp thị (hoặc khách gõ mã voucher mới).");
    add_bullet("Bước 3: Bấm 'Thanh toán' -> Modal Checkout mở ra -> Chọn địa chỉ nhận hàng từ Sổ địa chỉ cá nhân -> Chọn phương thức thanh toán: COD (Thanh toán khi nhận hàng) hoặc PayOS (Chuyển khoản VietQR tự động).");
    add_bullet("Bước 4 (Nếu chọn PayOS): Backend tạo liên kết thanh toán với PayOS SDK -> Trả về mã VietQR có số tiền và nội dung chuyển khoản mã hóa -> Khách quét mã trên app ngân hàng.");
    add_bullet("Bước 5: Ngân hàng xử lý thành công trong 2 giây -> PayOS bắn Webhook an toàn về backend -> Đơn hàng tự động đổi trạng thái sang PAID, trừ tồn kho tức thời và gửi thông báo chuông cho khách và chủ shop.");

    # -------------------------------------------------------------------------
    # FLOW 9
    # -------------------------------------------------------------------------
    add_heading_2("Flow 9: Luồng Xử Lý Đơn Hàng, Vận Chuyển & In Phiếu Giao Bưu Kiện (Fulfillment & Shipping Flow)")
    add_bullet("Chủ gian hàng (Merchant), Đơn vị vận chuyển (GHN/GHTK), Khách hàng.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-20 (Quản lý đơn hàng), Shipping Simulator, In phiếu bưu kiện A6 Barcode, Tra cứu vận đơn (/tracking).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Chuẩn hóa toàn bộ khâu hậu cần (Logistics) từ lúc nhận đơn đến khi giao bưu kiện thành công, cho phép tra cứu dòng thời gian minh bạch.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Chủ Shop truy cập /merchant/orders -> Đơn hàng mới nằm ở tab 'Chờ đóng gói' (PENDING).");
    add_bullet("Bước 2: Shop bấm 'Xác nhận & Giao hàng' -> Bộ mô phỏng vận chuyển (Shipping Simulator) tự động sinh mã vận đơn chính thức (VD: GHN-20268492) và chuyển trạng thái đơn sang SHIPPING.");
    add_bullet("Bước 3: Shop bấm 'In phiếu giao hàng' -> Hệ thống xuất bản mẫu in chuẩn A6 chuyên nghiệp gồm: Mã vạch Barcode, thông tin người gửi/người nhận, địa chỉ giao hàng, danh sách sản phẩm và số tiền thu hộ COD.");
    add_bullet("Bước 4: Khách hàng có thể truy cập /tracking -> Nhập Mã đơn hàng hoặc Số điện thoại để theo dõi dòng thời gian bưu kiện di chuyển qua các kho bưu cục thời gian thực.");
    add_bullet("Bước 5: Khi bưu tá phát kiện thành công -> Hệ thống cập nhật trạng thái đơn thành DELIVERED -> Kích hoạt cơ chế giam tiền bảo chứng Escrow 14 ngày.");

    # -------------------------------------------------------------------------
    # FLOW 10
    # -------------------------------------------------------------------------
    add_heading_2("Flow 10: Luồng Quỹ Bảo Chứng Escrow 14 Ngày & Quyết Toán Sổ Cái (Escrow & Double-Entry Ledger Flow)")
    add_bullet("Hệ thống tự động (Cronjob Engine), Khách hàng, Chủ gian hàng, KOL.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-21 (Tính hoa hồng), FR-22 (Quỹ Escrow 14 ngày), Double-Entry Financial Ledger, Thông báo Realtime.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Đây là 'Trái tim tài chính' của sàn SCANMS, triệt tiêu hoàn toàn rủi ro bùng hàng và đảm bảo tiền bán hàng chỉ được giải ngân khi hết thời hạn khiếu nại đổi trả.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Khi đơn hàng chuyển sang DELIVERED -> Backend tự động tính hoa hồng chính xác theo công thức: (Đơn giá x Số lượng - Giảm giá) x Tỷ lệ hoa hồng.");
    add_bullet("Bước 2: Khoản tiền hoa hồng này chưa thể rút mà được đưa vào Ví Chờ (PENDING) của KOL, doanh thu đơn hàng nằm trong trạng thái 'Bảo chứng (Escrow)' của Shop.");
    add_bullet("Bước 3: Hệ thống thiết lập đồng hồ đếm ngược bảo chứng đúng 14 ngày (336 giờ) tương ứng với chính sách đổi trả của sàn.");
    add_bullet("Bước 4: Dịch vụ định kỳ CommissionSchedulerService quét cơ sở dữ liệu hàng ngày. Nếu đơn hàng DELIVERED đủ 14 ngày mà không phát sinh khiếu nại đổi trả:");
    add_bullet("Bước 5: Kích hoạt thủ tục quyết toán tự động: Chuyển tiền từ Ví Chờ sang Ví Khả Dụng (AVAILABLE) của KOL, giải ngân doanh thu cho Shop, đồng thời ghi nhận 2 bút toán Nợ/Có bất biến vào bảng financial_ledgers.");

    # -------------------------------------------------------------------------
    # FLOW 11: NÂNG CẤP ĐỘT PHÁ TOÀN DIỆN (MODULE RETURNS & REVERSE LOGISTICS)
    # -------------------------------------------------------------------------
    add_heading_2("Flow 11: Luồng Khiếu Nại Đổi Trả, Thu Hồi Hàng Tận Nơi & Trọng Tài Sàn (Reverse Logistics, Return Inspection SLA & Dispute Arbitration Flow)")
    add_bullet("Khách hàng khiếu nại, Chủ gian hàng, Bưu tá thu hồi hàng (GHN/Mock), Ban Quản Trị Trọng Tài Sàn (System Manager/Admin).", bold_prefix="Tác nhân tham gia: ");
    add_bullet("Quy trình Đổi trả 14 ngày, Cấu hình Kho Hoàn Hàng (/merchant/returns/:id/warehouse), Thu hồi hàng tận nơi (Reverse Pickup Booking Form), Máy trạng thái ReturnStateMachine 12 bước, SLA Kiểm định kho 48h (ReturnDeadlineJob), Cổng Trọng Tài Phán Quyết (/admin/return-disputes), FR-23 (Clawback hoa hồng).", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Xây dựng quy trình xử lý đổi trả hàng hóa khép kín đạt chuẩn Shopee/TikTok Shop: Khách không phải tự vất vả mang hàng ra bưu điện mà có bưu tá đến tận nhà lấy hàng; Shop có kho chuyên biệt thẩm định trong vòng 48h; Sàn có Cổng trọng tài bảo vệ quyền lợi cho cả hai bên.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết (Bản cập nhật mã nguồn mới nhất):", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1 (Khách gửi yêu cầu đổi trả): Trong vòng 14 ngày kể từ khi đơn chuyển DELIVERED, khách hàng truy cập Cổng Khách Hàng (/customer/orders) -> Bấm 'Yêu cầu đổi trả / hoàn tiền' -> Chọn lý do (Hàng lỗi, bể vỡ, sai mẫu), tải video mở kiện hàng (Unboxing Video) -> Bản ghi ReturnRequest được tạo ở trạng thái REQUESTED. Đồng hồ Escrow 14 ngày của đơn hàng lập tức bị ĐÓNG BĂNG tạm thời.");
    add_bullet("Bước 2 (Shop cấu hình Kho Hoàn Hàng & Duyệt yêu cầu): Chủ Shop vào /merchant/returns/:id để tiếp nhận. Shop cấu hình thông tin Kho nhận hàng hoàn (Tên kho, địa chỉ nhận hàng, số điện thoại thủ kho qua API PATCH /returns/:id/warehouse - chỉ cần cấu hình 1 lần duy nhất). Sau đó, Shop bấm [Chấp thuận đổi trả] -> Trạng thái chuyển sang SHOP_APPROVED.");
    add_bullet("Bước 3 (Khách đặt lịch Thu hồi hàng tận nơi - Reverse Pickup Booking): Hệ thống cấp thời hạn đúng 7 ngày (168 giờ - trường shipByAt) để khách gửi hàng. Khách hàng truy cập /customer/returns/:id -> Mở form PickupBookingForm.tsx: Khách xác nhận địa chỉ nhà mình, số điện thoại liên hệ, trọng lượng gói hàng (gram) và kích thước đóng gói (Dài x Rộng x Cao cm) -> Bấm 'Đặt lịch bưu tá lấy hàng'.");
    add_bullet("Bước 4 (Khởi tạo Vận đơn Vận chuyển Ngược): Backend gọi qua PickupGateway khởi tạo đơn vận chuyển ngược từ Khách hàng đến Kho Shop (tích hợp GHN Staging hoặc Mock Adapter với mã đơn định danh SC-R-<UUID> chống gửi trùng). Trạng thái chuyển sang PICKUP_BOOKED. Nếu quá 7 ngày khách không đặt lịch lấy hàng, ReturnDeadlineJob sẽ tự động đóng yêu cầu (CLOSED) và giải phóng đơn hàng tiếp tục chu trình Escrow.");
    add_bullet("Bước 5 (Bưu tá thu hồi và giao đến kho Shop): Bưu tá bưu cục đến nhà khách thu gom kiện hàng -> Cập nhật trạng thái sang RETURN_SHIPPED. Khi kiện hàng được phát thành công tại kho của Shop -> Trạng thái chuyển sang RETURN_RECEIVED.");
    add_bullet("Bước 6 (Bắt đầu kiểm định kho & Kích hoạt bộ đếm SLA 48 Giờ): Thủ kho của Shop mở kiện hàng và bấm nút 'Bắt đầu kiểm định' (PATCH /returns/:id/inspection/start) -> Trạng thái chuyển sang INSPECTING. Hệ thống kích hoạt bộ giám sát SLA 48 giờ. Cronjob ReturnDeadlineJob quét mỗi 10 phút: Nếu quá 48 giờ kể từ lúc nhận hàng mà Shop chưa đưa ra kết quả kiểm định, hệ thống tự động gán cờ inspectionEscalatedAt và phát cảnh báo đỏ tới Khách, Shop và Admin. Khách hàng được quyền mở tranh chấp tức thì.");
    add_bullet("Bước 7 (Shop công bố kết quả kiểm định): Shop kiểm tra thực tế sản phẩm và chọn 1 trong 3 kết luận (PATCH /returns/:id/inspection/result):\n"
               "  • Hướng A (Đồng ý hoàn tiền - REFUND): Chuyển trạng thái REFUND_PENDING. Hệ thống chuẩn bị lệnh trích tiền từ quỹ Escrow hoàn lại cho khách, đồng thời kích hoạt cơ chế Clawback (FR-23) hủy sạch hoa hồng của KOL về 0.\n"
               "  • Hướng B (Đổi hàng mới - EXCHANGE): Chuyển trạng thái EXCHANGE_PENDING. Shop gửi kiện hàng thay thế mới với mã vận đơn chiều đi thứ 2 (SHOP_TO_CUSTOMER qua POST /returns/:id/exchange-shipment) -> Trạng thái chuyển EXCHANGE_SHIPPED -> Khách nhận hàng mới và xác nhận hoàn tất COMPLETED.\n"
               "  • Hướng C (Từ chối đổi trả - REJECT): Chuyển trạng thái INSPECTION_REJECTED. Shop tải ảnh chụp biên bản kiểm định chứng minh sản phẩm bị hư hại do người dùng sử dụng sai cách.");
    add_bullet("Bước 8 (Mở Khiếu Nại Tranh Chấp lên Trọng Tài Sàn): Nếu Shop từ chối ban đầu (SHOP_REJECTED), hoặc từ chối sau kiểm định (INSPECTION_REJECTED), hoặc quá hạn 48h kiểm định, hoặc lệnh hoàn tiền gặp trục trặc -> Khách hàng bấm nút 'Mở tranh chấp sàn' (DisputeModal.tsx -> POST /returns/:id/disputes). Trạng thái hồ sơ chuyển sang DISPUTED.");
    add_bullet("Bước 9 (Cổng Trọng Tài Sàn Phán Quyết): Ban Quản Trị truy cập Cổng Trọng Tài (/admin/return-disputes & DisputeResolutionPage.tsx). Màn hình chia đôi đối chiếu toàn bộ: Video mở hộp ban đầu, lịch sử vận chuyển ngược, ảnh kiểm định tại kho Shop, và biên bản tranh chấp. Admin có 3 phán quyết dứt điểm:\n"
               "  • Phán quyết 1 [Ép hoàn tiền cho Khách]: Buộc Shop hoàn tiền từ quỹ bảo chứng Escrow, hủy hoa hồng KOL, giải phóng khiếu nại.\n"
               "  • Phán quyết 2 [Yêu cầu Đổi hàng mới]: Buộc Shop gửi sản phẩm mới đạt chuẩn cho Khách.\n"
               "  • Phán quyết 3 [Bác bỏ khiếu nại (CLOSED)]: Công nhận giải trình của Shop là chính đáng, trả tiền bán hàng cho Shop và giải ngân hoa hồng cho KOL.");

    # -------------------------------------------------------------------------
    # FLOW 12
    # -------------------------------------------------------------------------
    add_heading_2("Flow 12: Luồng Rút Tiền, Khấu Trừ Thuế TNCN 10% & Chi Trả VietQR (Tax Withholding & Payout Flow)")
    add_bullet("Nhà sáng tạo (KOL/KOC), Chủ gian hàng / Admin duyệt chi, Ngân hàng Napas.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-24 (Rút tiền & Khấu trừ thuế), Khóa dòng SELECT FOR UPDATE, Xuất file lô VietQR Napas 24/7, Financial Ledgers.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Đạt chuẩn mực quản lý tài chính doanh nghiệp: Ngăn chặn âm ví tuyệt đối, khấu trừ thuế thu nhập cá nhân tự động theo đúng luật thuế hiện hành và xuất lệnh chi ngân hàng chuẩn mực.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: KOL truy cập Ví Tiền (/collaborator/wallet) -> Xem số dư khả dụng (Available Balance) -> Bấm 'Yêu cầu rút tiền'.");
    add_bullet("Bước 2 (Kiểm tra pháp lý): Hệ thống kiểm tra điều kiện tiên quyết: Tài khoản bắt buộc phải có trạng thái KYC 'VERIFIED' và đã đăng ký Số tài khoản ngân hàng chính chủ.");
    add_bullet("Bước 3 (Khóa dòng chống âm ví): Khi bấm xác nhận, backend thực thi câu lệnh SQL 'SELECT balance FROM wallets WHERE id = ... FOR UPDATE' -> Khóa chặt dòng dữ liệu, ngăn chặn race condition kể cả khi spam click.");
    add_bullet("Bước 4 (Khấu trừ thuế TNCN 10% tự động): Theo quy định pháp luật thuế Việt Nam đối với thu nhập vãng lai từ 2.000.000 ₫ trở lên: Nếu số tiền rút >= 2.000.000 ₫, hệ thống tự động trích 10% nộp thuế TNCN, hiển thị rõ số tiền thực nhận là 90%.");
    add_bullet("Bước 5: Lệnh rút lưu ở trạng thái PENDING -> Ban Quản Trị / Shop vào /merchant/payouts kiểm tra -> Bấm 'Xuất file lô VietQR' định dạng Excel chuẩn Napas 24/7 để tải lên Internet Banking chi trả tức thì.");
    add_bullet("Bước 6: Quản trị viên tải ảnh Ủy nhiệm chi ngân hàng đính kèm lên hệ thống -> Bấm 'Đã chi trả' -> Trạng thái hoàn tất, trừ số dư ví và lưu sổ cái kiểm toán.");

    # -------------------------------------------------------------------------
    # FLOW 13
    # -------------------------------------------------------------------------
    add_heading_2("Flow 13: Luồng Đánh Giá Chất Lượng Hàng Thật & Kiểm Duyệt Review (Verified Buyer Review Flow)")
    add_bullet("Khách hàng đã nhận hàng, Chủ gian hàng, Ban Quản Trị Sàn.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-18 (Verified Review Gate), ProductReviewModal, Đánh giá trung bình sao & Phân bố, Cảnh báo sản phẩm kém chất lượng.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Xóa bỏ 100% tình trạng 'review ảo' hoặc đối thủ chơi xấu; chỉ cho phép người đã thực sự mua và nhận hàng thành công được quyền đánh giá sản phẩm.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Khách hàng sau khi nhận hàng thành công (DELIVERED) truy cập Cổng Khách Hàng -> Nút 'Đánh giá sản phẩm' được mở khóa.");
    add_bullet("Bước 2: Mở modal đánh giá -> Chấm điểm từ 1 đến 5 sao, viết cảm nhận chi tiết về chất lượng và độ ưng ý, upload ảnh chụp sản phẩm thực tế.");
    add_bullet("Bước 3: Đánh giá được gửi lên backend -> Lưu vào bảng product_reviews kèm cờ verifiedPurchase = true.");
    add_bullet("Bước 4: Thuật toán tự động tính toán lại Điểm sao trung bình (Average Rating) và Phân bố sao của sản phẩm -> Hiển thị công khai trên Landing Page với huy hiệu xanh '✓ Đã mua hàng'.");
    add_bullet("Bước 5 (Cơ chế bảo vệ chất lượng sàn): Nếu một sản phẩm liên tục nhận 3 đánh giá 1-2 sao hoặc điểm trung bình tụt dưới 3.0 sao -> Hệ thống tự động gửi cảnh báo đỏ cho Shop và đề xuất Admin tạm ẩn sản phẩm để rà soát chất lượng.");

    # -------------------------------------------------------------------------
    # FLOW 14
    # -------------------------------------------------------------------------
    add_heading_2("Flow 14: Luồng Chăm Sóc Khách Hàng Trực Tiếp Realtime & Kênh Hỗ Trợ Đa Bên (Live In-App Chat Flow)")
    add_bullet("Khách hàng đang mua sắm, Chủ gian hàng, Hệ thống thông báo.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("Kênh chat nổi (ScanmsFloatingChatWidget), ChatBoxPage, WebSockets Gateway, Profanity Filter, Multi-Role Notification Center.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Giải đáp thắc mắc chuyên sâu về sản phẩm ngay lập tức để thúc đẩy quyết định mua hàng, mang lại trải nghiệm chăm sóc khách hàng chuyên nghiệp như Shopee Chat.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Khách hàng đang xem sản phẩm tại /products/:slug -> Bấm vào nút 'Chat ngay với Shop' nổi ở góc màn hình.");
    add_bullet("Bước 2: Cửa sổ Chat bật lên tức thì -> Hệ thống tự động gửi kèm Thẻ tóm tắt sản phẩm (Hình ảnh, tên, giá bán) vào luồng tin nhắn để Shop nắm rõ ngữ cảnh.");
    add_bullet("Bước 3 (Lọc ngôn từ thô tục): Tin nhắn được truyền qua WebSockets Gateway. Bộ lọc Profanity Filter tự động nhận diện và che các từ ngữ phản cảm bằng ký tự '***'.");
    add_bullet("Bước 4: Chủ Shop nhận âm thanh thông báo và chuông báo đỏ trên thanh Header -> Mở hộp chat phản hồi và tư vấn cách dùng cho khách.");
    add_bullet("Bước 5: Sau khi giải đáp hài lòng, Shop có thể gửi kèm mã giảm giá riêng ngay trong khung chat để kích thích khách bấm 'Mua ngay'.");

    # -------------------------------------------------------------------------
    # FLOW 15
    # -------------------------------------------------------------------------
    add_heading_2("Flow 15: Luồng Thăng Cấp Bậc Gamification, Thưởng Doanh Số & Bảng Vinh Danh (Tier Progression Flow)")
    add_bullet("Nhà sáng tạo (KOL/KOC), Hệ thống xếp hạng tự động, Cộng đồng người dùng.", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-21 (Thưởng cấp bậc Tier), FR-28 (Analytics Dashboard), FR-29 (Leaderboard Top 10), Bục vinh danh Podium.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Tạo động lực thi đua mạnh mẽ (Gamification) cho mạng lưới KOC; bán càng nhiều hàng thì cấp bậc càng cao và tỷ lệ hoa hồng thưởng thêm càng lớn.", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Toàn bộ doanh số phát sinh hợp lệ của KOL trong tháng được hệ thống cộng dồn theo thời gian thực.");
    add_bullet("Bước 2: Căn cứ vào doanh số tích lũy, hệ thống phân định 4 cấp bậc rõ rệt: Đồng (Doanh số < 10tr: +0% thưởng), Bạc (10tr - 50tr: +1% hoa hồng thưởng), Vàng (50tr - 200tr: +3% hoa hồng thưởng), Kim Cương (> 200tr: +5% hoa hồng thưởng nóng).");
    add_bullet("Bước 3: Mọi đơn hàng mới phát sinh của KOL sẽ tự động được cộng thêm % thưởng theo cấp bậc hiện tại vào số tiền hoa hồng.");
    add_bullet("Bước 4: KOL có thể truy cập /collaborator/profile?tab=tiers để theo dõi thanh tiến trình doanh số (Progress Bar) và số triệu đồng còn thiếu để lên hạng tiếp theo.");
    add_bullet("Bước 5: Vào ngày cuối cùng của tháng, Bảng xếp hạng Leaderboard (/leaderboard) vinh danh Top 3 KOC xuất sắc nhất trên Bục Podium (Huy chương Vàng, Bạc, Đồng) và danh sách Top 10 toàn sàn, nhận các phần thưởng tài chính từ Ban Quản Trị.");

    # -------------------------------------------------------------------------
    # FLOW 16
    # -------------------------------------------------------------------------
    add_heading_2("Flow 16: Luồng Giám Sát An Ninh, Kiểm Toán Dữ Liệu & Thống Kê Sàn (Audit Trail & Platform Oversight)")
    add_bullet("Ban Quản Trị Tối Cao (System Admin), Nhân sự Vận hành (System Manager).", bold_prefix="Tác nhân tham gia: ");
    add_bullet("FR-32 (Audit Logs SHA-256), AdminOversightHubPage, AdminAnalyticsHubPage, Giám sát pool thanh khoản.", bold_prefix="Các chức năng tích hợp: ");
    add_bullet("Đảm bảo mọi hành vi thay đổi cấu hình, duyệt tiền, phán quyết tranh chấp và can thiệp hệ thống đều được ghi vết vĩnh viễn, không thể chối bỏ (Non-repudiation).", bold_prefix="Mục tiêu nghiệp vụ: ");
    
    add_body_paragraph("Trình tự các bước thực thi chi tiết:", bold_prefix="Hành trình nghiệp vụ: ");
    add_bullet("Bước 1: Mọi hành động nhạy cảm trong hệ thống (Đăng nhập sai nhiều lần, duyệt KYC, duyệt chi tiền Payout, can thiệp trọng tài, sửa hoa hồng) đều kích hoạt AuditInterceptor.");
    add_bullet("Bước 2: Bản ghi kiểm toán được tạo lập với đầy đủ: User ID, Địa chỉ IP, User-Agent, Hành động (Action), Dữ liệu trước (PreviousState), Dữ liệu sau (NewState) và Mã băm chuỗi an toàn.");
    add_bullet("Bước 3: Admin truy cập /admin/audit-logs để tra cứu lịch sử an ninh với bộ lọc nâng cao theo thời gian, theo đối tượng và loại hành vi.");
    add_bullet("Bước 4: Admin truy cập /admin/analytics để giám sát sức khỏe toàn sàn: Tổng giá trị hàng hóa (GMV), Tổng doanh thu phí sàn SaaS (3%), Tỷ lệ đơn giao thành công, Biểu đồ tăng trưởng người dùng mới.");
    add_bullet("Bước 5: Nếu phát hiện dấu hiệu gian lận nghiêm trọng, Admin có quyền khóa tài khoản vi phạm chỉ với 1-click, đóng băng toàn bộ số dư ví liên quan để tiến hành điều tra.");

    # =========================================================================
    # PHẦN 5: MA TRẬN QUAN HỆ 2 CHIỀU: CHỨC NĂNG ↔ CÁC LUỒNG LIÊN KẾT
    # =========================================================================
    add_heading_1("PHẦN 5: MA TRẬN QUAN HỆ 2 CHIỀU (CHỨC NĂNG ↔ CÁC LUỒNG NGHIỆP VỤ)")
    
    add_body_paragraph(
        "Bảng ma trận dưới đây chứng minh tính liên kết sâu sắc của hệ thống SCANMS: Mỗi chức năng không nằm cô lập mà có thể đóng vai trò mắt xích trong nhiều luồng vận hành khác nhau, tạo nên sức mạnh tổng thể vững chắc:"
    )
    
    matrix_headers = ["Chức Năng & Mã Hiệu", "Vai Trò Cốt Lõi", "Các Luồng Nghiệp Vụ Liên Kết (Flows)"]
    matrix_data = [
        ["FR-01, FR-02 (IAM & JWT)", "Định danh và xác thực truy cập", "Flow 1 (Chính), Flow 2, Flow 8, Flow 11, Flow 12, Flow 16"],
        ["FR-03 (OTP & Reset Pass)", "Bảo mật tài khoản 2 lớp", "Flow 1 (Chính), Flow 12 (Xác nhận rút tiền lớn)"],
        ["FR-04 (Phân quyền RBAC)", "Kiểm soát truy cập theo vai trò", "Flow 1, Flow 2, Flow 3, Flow 11, Flow 16"],
        ["FR-05, FR-06 (KYC 2 Tầng)", "Định danh pháp nhân & cá nhân", "Flow 2 (Chính), Flow 3, Flow 12 (Điều kiện rút tiền)"],
        ["FR-07 (Quản lý kênh MXH)", "Khai báo kênh phát sóng KOC", "Flow 2, Flow 4, Flow 5, Flow 15"],
        ["FR-08 (Kho Media Hub)", "Tài nguyên truyền thông & kịch bản", "Flow 4, Flow 5 (Chính), Flow 6"],
        ["FR-09 (Cấu hình hoa hồng)", "Thiết lập tỷ lệ % hoặc VNĐ", "Flow 3 (Chính), Flow 4, Flow 7, Flow 10"],
        ["FR-10, FR-11 (Link & Smart QR)", "Công cụ tiếp thị định danh", "Flow 5 (Chính), Flow 6, Flow 7"],
        ["FR-12 (Coupon độc quyền)", "Mã giảm giá cá nhân hóa", "Flow 5, Flow 6, Flow 8 (Chính)"],
        ["FR-13 (Tracking Cookie 30d)", "Ghi nhận Last-Click Attribution", "Flow 7 (Chính), Flow 8, Flow 10"],
        ["FR-14 (Redis Rate Limit)", "Chặn đứng spam click ảo cùng IP", "Flow 7 (Chính), Flow 16"],
        ["FR-15 (Landing Page Review)", "Trang đích sản phẩm kèm video", "Flow 5, Flow 7, Flow 8, Flow 13"],
        ["FR-16 (Checkout 1-Chạm)", "Đặt hàng nhanh kèm mã ưu đãi", "Flow 6, Flow 7, Flow 8 (Chính)"],
        ["FR-17 (Đơn hàng & Trừ kho)", "Tạo đơn atomic và giảm tồn kho", "Flow 8 (Chính), Flow 9, Flow 10, Flow 11"],
        ["FR-18 (Verified Reviews)", "Đánh giá chất lượng hàng thật", "Flow 9, Flow 13 (Chính)"],
        ["FR-20 (Quản lý đơn hàng)", "Chuyển giao bưu cục Logistics", "Flow 9 (Chính), Flow 10, Flow 11"],
        ["FR-21, FR-22 (Escrow 14 Ngày)", "Giam giữ hoa hồng bảo chứng", "Flow 9, Flow 10 (Chính), Flow 11, Flow 12"],
        ["FR-23 (Clawback hoa hồng)", "Hủy hoa hồng khi đơn bị trả", "Flow 10, Flow 11 (Chính)"],
        ["FR-24 (Rút tiền & Thuế TNCN)", "Khóa dòng SQL và trích 10% thuế", "Flow 10, Flow 12 (Chính), Flow 16"],
        ["FR-25 (Hàng mẫu 4 bước)", "Xin và cấp mẫu dùng thử", "Flow 4 (Chính), Flow 5"],
        ["FR-26, FR-27 (Chat & Deal VIP)", "Trao đổi brief và gửi ưu đãi", "Flow 4 (Chính), Flow 6, Flow 14"],
        ["FR-28, FR-29 (Leaderboard)", "Thăng hạng và vinh danh Top 10", "Flow 10, Flow 15 (Chính)"],
        ["FR-30 (AI Smart Matching)", "Ghép đôi Shop ↔ KOC tương thích", "Flow 4 (Chính), Flow 15"],
        ["FR-31 (AI Fraud Sentinel)", "Phát hiện gian lận tự mua", "Flow 7 (Chính), Flow 8, Flow 16"],
        ["FR-32 (Audit Logs SHA-256)", "Nhật ký kiểm toán an ninh", "Flow 2, Flow 3, Flow 11, Flow 12, Flow 16 (Chính)"],
        ["LiveStreamRoomPage", "Phòng mua sắm trực tiếp tương tác", "Flow 5, Flow 6 (Chính), Flow 8"],
        ["DisputeResolutionPage", "Cổng Trọng tài phân xử khiếu nại", "Flow 10, Flow 11 (Chính)"],
        ["Reverse Pickup Booking", "Thu hồi hàng hoàn bưu tá tận nhà", "Flow 11 (Chính), Flow 9"],
        ["Inspection SLA Engine 48h", "Giám sát thời gian kiểm định kho", "Flow 11 (Chính), Flow 16"],
        ["Warehouse Return Config", "Cấu hình địa chỉ kho nhận hàng hoàn", "Flow 3, Flow 11 (Chính)"],
        ["CustomerPortalPage", "Cổng Khách hàng & Sổ địa chỉ", "Flow 1, Flow 2, Flow 8, Flow 11, Flow 13 (Chính)"],
        ["Shipping Simulator A6", "Mô phỏng vận đơn và in tem A6", "Flow 9 (Chính)"],
        ["PayOS VietQR Gateway", "Thanh toán QR tự động ngân hàng", "Flow 8 (Chính), Flow 9"]
    ]
    create_styled_table(matrix_headers, matrix_data, [Inches(1.8), Inches(2.2), Inches(2.7)])

    # =========================================================================
    # PHẦN 6: KẾT LUẬN & ĐỊNH HƯỚNG TƯƠNG LAI
    # =========================================================================
    add_heading_1("PHẦN 6: ĐÁNH GIÁ CHUNG & TẦM NHÌN ĐỊNH HƯỚNG TƯƠNG LAI")
    
    add_body_paragraph(
        "Dự án SCANMS (FA26SE032) đã hoàn thành trọn vẹn 100% mục tiêu nghiên cứu và phát triển đặt ra cho Đồ án Tốt nghiệp Kỹ sư Kỹ thuật Phần mềm. Việc tích hợp thành công Module Hậu Cần Thu Hồi (Reverse Logistics & Return Fulfillment) vào nhánh main đã giải quyết triệt để mắt xích khó khăn nhất của một sàn thương mại điện tử: Xử lý hàng hoàn, thu hồi bưu kiện tận nhà, kiểm định kho và bảo chứng quyền lợi công bằng cho cả người mua lẫn người bán."
    )
    
    add_heading_2("6.1. Những Giá Trị Cốt Lõi Đạt Được")
    add_bullet("Giải quyết triệt để bài toán rò rỉ đơn hàng và mất dấu vết tiếp thị nhờ cơ chế Signed Cookie 30 ngày kết hợp Redis Rate Limiting.", bold_prefix="Minh Bạch Tuyệt Đối: ");
    add_bullet("Bảo vệ quyền lợi của cả người mua và người bán thông qua Quỹ bảo chứng Escrow 14 ngày, Quy trình Reverse Pickup thu hồi hàng và Cổng Trọng Tài độc lập, loại bỏ hoàn toàn rủi ro bùng hàng.", bold_prefix="An Toàn Dòng Tiền & Hậu Cần: ");
    add_bullet("Khóa dòng SELECT FOR UPDATE và Sổ cái tài chính bất biến ngăn chặn hoàn toàn các cuộc tấn công gian lận tiền tệ hoặc âm ví.", bold_prefix="Bảo Mật Cấp Ngân Hàng: ");
    add_bullet("Trải nghiệm mua sắm hiện đại, hỗ trợ Livestream tương tác ghim giỏ hàng, thanh toán PayOS VietQR tự động và giao diện Vàng Be sang trọng.", bold_prefix="Trải Nghiệm Đột Phá: ");

    add_heading_2("6.2. Lộ Trình Phát Triển Giai Đoạn Tiếp Theo (Roadmap 2026 - 2027)")
    add_bullet("Xây dựng phiên bản ứng dụng di động nguyên bản (Native Mobile App) sử dụng React Native hoặc Flutter dành riêng cho KOC để quản lý hoa hồng và mở phiên LiveStream bằng camera điện thoại tiện lợi.", bold_prefix="Giai đoạn 1 (Mobile First): ");
    add_bullet("Chuyển từ GHN Staging sang đấu nối trực tiếp Production API chính thức của các đơn vị bưu chính lớn (Giao Hàng Nhanh - GHN, Giao Hàng Tiết Kiệm - GHTK, Viettel Post) để tự động bắn đơn sang bưu tá và in vận đơn nhiệt tức thời.", bold_prefix="Giai đoạn 2 (Open Logistics API): ");
    add_bullet("Nghiên cứu ứng dụng Hợp đồng thông minh (Smart Contract) trên nền tảng Blockchain để tự động hóa hoàn toàn quỹ Escrow bảo chứng, tiến tới giải ngân Payout phi tập trung không cần con người can thiệp.", bold_prefix="Giai đoạn 3 (Web3 Smart Escrow): ");
    add_bullet("Nâng cấp động cơ AI Smart Matching sử dụng mạng nơ-ron học sâu (Deep Learning) để phân tích hành vi của tệp khán giả người theo dõi (Audience Persona), dự đoán chính xác doanh thu tiềm năng trước khi nhãn hàng ký hợp đồng với KOC.", bold_prefix="Giai đoạn 4 (Deep AI Recommendation): ");

    # Lời kết
    add_callout_box(
        "Báo cáo này được biên soạn bởi Trưởng nhóm Nguyễn Thành Thắng (SE184251) làm tài liệu kỹ thuật nền tảng phục vụ cho buổi bảo vệ Đồ án Tốt nghiệp chính thức trước Hội đồng Chấm thi, đồng thời làm kim chỉ nam vận hành, mở rộng hệ thống SCANMS trong tương lai.",
        title="LỜI KẾT & CAM KẾT HỆ THỐNG",
        border_color=HEX_BRAND,
        bg_color=HEX_BRAND_SOFT
    )

    # Lưu tài liệu
    output_filename = "SCANMS_Tong_Quan_Kien_Truc_Chuc_Nang_Va_Luan_Chuyen_Nghiep_Vu_2026.docx"
    doc.save(output_filename)
    print(f"Document successfully created: {output_filename}")
    print(f"File size: {os.path.getsize(output_filename)} bytes")

if __name__ == "__main__":
    create_document()
