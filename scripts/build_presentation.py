import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ==========================================
# SCANMS BRAND DESIGN SYSTEM MEMORY TOKENS
# VÀNG BE (WARM SAND & BRAND GOLD)
# ==========================================
COLOR_CANVAS        = RGBColor(0xFA, 0xF8, 0xF5) # Soft warm cream background
COLOR_SURFACE_SAND  = RGBColor(0xF3, 0xEF, 0xE6) # Warm sand cards
COLOR_SURFACE_WHITE = RGBColor(0xFF, 0xFF, 0xFF) # Pure white card
COLOR_BRAND         = RGBColor(0xC5, 0x9B, 0x58) # Brand gold CTA / accent
COLOR_BRAND_STRONG  = RGBColor(0xB8, 0x8E, 0x4F) # Deep brand gold
COLOR_BRAND_SOFT    = RGBColor(0xFB, 0xF5, 0xEB) # Pale gold pill background
COLOR_BRAND_BORDER  = RGBColor(0xEE, 0xDF, 0xC6) # Border gold
COLOR_BRAND_DARK    = RGBColor(0x23, 0x1D, 0x15) # Dark luxury accent
COLOR_LINE          = RGBColor(0xEA, 0xE4, 0xD7) # Divider line
COLOR_INK           = RGBColor(0x1A, 0x16, 0x12) # Primary deep ink text
COLOR_MUTED         = RGBColor(0x7D, 0x71, 0x5E) # Secondary muted text
COLOR_SUCCESS       = RGBColor(0x05, 0x96, 0x69) # Emerald check
COLOR_DANGER        = RGBColor(0xDC, 0x26, 0x26) # Crimson reject
COLOR_WARNING       = RGBColor(0xD9, 0x77, 0x06) # Amber warning

LOGO_TRANSPARENT = "frontend/public/scanms-logo-transparent.png"
LOGO_FULL = "frontend/public/scanms-logo-full.png"
ARCH_IMAGE = "docs/review 2/SCANMS_OVERVIEW_ARCHITECTURE.png"
CONCEPTUAL_IMAGE = "docs/review 2/SCANMS_ERD_01_Conceptual.png"

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide, color=COLOR_CANVAS):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, category_text, title_text, subtitle_text, slide_num=None):
        # Header background strip
        header_box = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(1.36))
        header_box.fill.solid()
        header_box.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        header_box.line.color.rgb = COLOR_LINE
        header_box.line.width = Pt(1)

        # Category Pill
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.16), Inches(3.6), Inches(0.26))
        pill.fill.solid()
        pill.fill.fore_color.rgb = COLOR_BRAND_SOFT
        pill.line.color.rgb = COLOR_BRAND_BORDER
        pill.line.width = Pt(1)
        tf_pill = pill.text_frame
        tf_pill.word_wrap = False
        tf_pill.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_pill = tf_pill.paragraphs[0]
        p_pill.text = category_text.upper()
        p_pill.font.size = Pt(9.5)
        p_pill.font.bold = True
        p_pill.font.color.rgb = COLOR_BRAND_STRONG
        p_pill.font.name = "Segoe UI"
        p_pill.alignment = PP_ALIGN.CENTER

        # Main Title (Fit on 1 line cleanly)
        title_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.44), Inches(10.2), Inches(0.42))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(18)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_INK
        p_title.font.name = "Segoe UI"

        # Subtitle (Safe vertical distance from title)
        sub_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.92), Inches(10.2), Inches(0.36))
        tf_sub = sub_box.text_frame
        tf_sub.word_wrap = True
        p_sub = tf_sub.paragraphs[0]
        p_sub.text = subtitle_text
        p_sub.font.size = Pt(10.5)
        p_sub.font.color.rgb = COLOR_MUTED
        p_sub.font.name = "Segoe UI"

        # Brand Logo on Top Right inside luxury dark pill
        logo_container = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(11.1), Inches(0.2), Inches(1.5), Inches(0.46))
        logo_container.fill.solid()
        logo_container.fill.fore_color.rgb = COLOR_BRAND_DARK
        logo_container.line.color.rgb = COLOR_BRAND
        logo_container.line.width = Pt(1)

        if os.path.exists(LOGO_TRANSPARENT):
            slide.shapes.add_picture(LOGO_TRANSPARENT, Inches(11.15), Inches(0.22), width=Inches(1.4))

        # Footer strip
        footer_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.02))
        footer_line.fill.solid()
        footer_line.fill.fore_color.rgb = COLOR_LINE
        footer_line.line.fill.background()

        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.08), Inches(11.733), Inches(0.35))
        tf_foot = footer_box.text_frame
        p_foot = tf_foot.paragraphs[0]
        p_foot.text = "SCANMS (FA26SE032) • Sales Collaborator and Affiliate Network Management System • Hội Đồng Đánh Giá 1.1"
        p_foot.font.size = Pt(9.5)
        p_foot.font.color.rgb = COLOR_MUTED
        p_foot.font.name = "Segoe UI"

        if slide_num:
            num_box = slide.shapes.add_textbox(Inches(11.5), Inches(7.08), Inches(1.0), Inches(0.35))
            tf_num = num_box.text_frame
            p_num = tf_num.paragraphs[0]
            p_num.text = f"{slide_num:02d}"
            p_num.font.size = Pt(10)
            p_num.font.bold = True
            p_num.font.color.rgb = COLOR_BRAND_STRONG
            p_num.font.name = "Segoe UI"
            p_num.alignment = PP_ALIGN.RIGHT

    # ==========================================
    # SLIDE 1: TITLE SLIDE (BÌA SANG TRỌNG)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, COLOR_CANVAS)

    # Decorative hero backdrop shape
    hero_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9))
    hero_card.fill.solid()
    hero_card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    hero_card.line.color.rgb = COLOR_BRAND_BORDER
    hero_card.line.width = Pt(1.5)

    # Top Brand Ribbon
    ribbon = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(0.12))
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = COLOR_BRAND
    ribbon.line.fill.background()

    # Logo Container
    logo_bg = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.35), Inches(1.2), Inches(3.2), Inches(0.88))
    logo_bg.fill.solid()
    logo_bg.fill.fore_color.rgb = COLOR_BRAND_DARK
    logo_bg.line.color.rgb = COLOR_BRAND
    logo_bg.line.width = Pt(1)

    if os.path.exists(LOGO_TRANSPARENT):
        s1.shapes.add_picture(LOGO_TRANSPARENT, Inches(1.45), Inches(1.25), width=Inches(3.0))

    # Topic badge
    topic_badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.35), Inches(2.28), Inches(3.8), Inches(0.32))
    topic_badge.fill.solid()
    topic_badge.fill.fore_color.rgb = COLOR_BRAND_SOFT
    topic_badge.line.color.rgb = COLOR_BRAND_BORDER
    p_tb = topic_badge.text_frame.paragraphs[0]
    p_tb.text = "ĐỒ ÁN TỐT NGHIỆP KỸ THUẬT PHẦN MỀM • FA26SE032"
    p_tb.font.size = Pt(9.5)
    p_tb.font.bold = True
    p_tb.font.color.rgb = COLOR_BRAND_STRONG
    p_tb.font.name = "Segoe UI"
    p_tb.alignment = PP_ALIGN.CENTER

    # Project Title
    p_title_box = s1.shapes.add_textbox(Inches(1.35), Inches(2.7), Inches(10.5), Inches(1.4))
    tf_pt = p_title_box.text_frame
    tf_pt.word_wrap = True
    p1 = tf_pt.paragraphs[0]
    p1.text = "SCANMS"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_BRAND_DARK
    p1.font.name = "Segoe UI"

    p2 = tf_pt.add_paragraph()
    p2.text = "Sales Collaborator & Affiliate Network Management System"
    p2.font.size = Pt(19)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_BRAND_STRONG
    p2.font.name = "Segoe UI"

    p3 = tf_pt.add_paragraph()
    p3.text = "Sàn Tiếp Thị Liên Kết & Mạng Lưới Gian Hàng Đối Tác Đa Nền Tảng (Multi-Merchant & Multi-KOL Network)"
    p3.font.size = Pt(12)
    p3.font.color.rgb = COLOR_MUTED
    p3.font.name = "Segoe UI"

    # Divider
    div = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.35), Inches(4.35), Inches(10.5), Inches(0.02))
    div.fill.solid()
    div.fill.fore_color.rgb = COLOR_LINE
    div.line.fill.background()

    # Supervisor & Team details
    left_meta = s1.shapes.add_textbox(Inches(1.35), Inches(4.5), Inches(5.0), Inches(1.8))
    tf_lm = left_meta.text_frame
    p_lm1 = tf_lm.paragraphs[0]
    p_lm1.text = "GIẢNG VIÊN HƯỚNG DẪN"
    p_lm1.font.size = Pt(10)
    p_lm1.font.bold = True
    p_lm1.font.color.rgb = COLOR_BRAND_STRONG
    p_lm1.font.name = "Segoe UI"

    p_lm2 = tf_lm.add_paragraph()
    p_lm2.text = "ThS. Tôn Thất Hoàng Minh (MinhTTH5)"
    p_lm2.font.size = Pt(13)
    p_lm2.font.bold = True
    p_lm2.font.color.rgb = COLOR_INK
    p_lm2.font.name = "Segoe UI"

    p_lm3 = tf_lm.add_paragraph()
    p_lm3.text = "Khoa Kỹ thuật Phần mềm (SE) - Đại học FPT TP.HCM"
    p_lm3.font.size = Pt(11)
    p_lm3.font.color.rgb = COLOR_MUTED
    p_lm3.font.name = "Segoe UI"

    right_meta = s1.shapes.add_textbox(Inches(6.6), Inches(4.5), Inches(5.3), Inches(1.8))
    tf_rm = right_meta.text_frame
    p_rm1 = tf_rm.paragraphs[0]
    p_rm1.text = "NHÓM SINH VIÊN THỰC HIỆN (FA26SE032)"
    p_rm1.font.size = Pt(10)
    p_rm1.font.bold = True
    p_rm1.font.color.rgb = COLOR_BRAND_STRONG
    p_rm1.font.name = "Segoe UI"

    members = [
        "1. Nguyễn Thành Thắng (Leader) - MSSV: SE184251",
        "2. Nguyễn Đình Tuấn - MSSV: SE180104",
        "3. Nguyễn Phú Quý - MSSV: SE180104",
        "4. Phan Xuân Thịnh - MSSV: SE184527"
    ]
    for m in members:
        pm = tf_rm.add_paragraph()
        pm.text = m
        pm.font.size = Pt(11)
        pm.font.color.rgb = COLOR_INK
        pm.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 2: AGENDA / TABLE OF CONTENTS
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "MỤC LỤC BÁO CÁO", "Nội Dung Thuyết Trình Review 2 & Hội Đồng 1.1", "Cấu trúc báo cáo toàn diện bám sát chuẩn thẩm định đồ án tốt nghiệp Capstone FPT University", 2)

    agenda_items = [
        ("01", "Kiến Trúc Hệ Thống Tổng Quan (System Architecture Overview)", "Kiến trúc 5 tầng Modular Monolith: Client Web, Security Gateway, Business Logic, Realtime Socket và Data Persistence."),
        ("02", "Công Nghệ Xây Dựng Hệ Thống (Technology Stack)", "React 19, TypeScript, NestJS 11, Prisma ORM 7, PostgreSQL 16 (Pessimistic Locking), Redis 7 và hệ sinh thái tích hợp PayOS / GHN."),
        ("03", "Sơ Đồ Dữ Liệu Khái Niệm (Conceptual Data Model)", "16 thực thể hạt nhân chia 5 cụm: Danh tính & KYC, Danh mục hàng hóa, Chiến dịch Affiliate, Hậu cần vận chuyển và Ví tiền Escrow."),
        ("04", "5 Luồng Nghiệp Vụ Cốt Lõi (5 Core Business Mainflows)", "5 quy trình nghiệp vụ xương sống: Đăng ký & KYC ➔ Hàng mẫu & Deal VIP ➔ Smart Tracking & Mua hàng ➔ Escrow 14 ngày & Đổi trả ➔ Ví tiền & Napas 24/7."),
        ("05", "Hệ Thống Tác Vụ Tự Động (Recurring & On-Demand Jobs)", "Cơ chế Cronjob giải phóng Escrow 14 ngày, đếm ngược nghiệm thu video mẫu, làm sạch Cookie 30 ngày và hàng đợi gửi hóa đơn BullMQ.")
    ]

    for idx, (num, title, desc) in enumerate(agenda_items):
        y_pos = Inches(1.6 + idx * 1.02)
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), y_pos, Inches(11.733), Inches(0.88))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        card.line.color.rgb = COLOR_BRAND_BORDER if idx == 3 else COLOR_LINE
        card.line.width = Pt(1.5 if idx == 3 else 1)

        # Number pill
        np = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.05), y_pos + Inches(0.18), Inches(0.65), Inches(0.52))
        np.fill.solid()
        np.fill.fore_color.rgb = COLOR_BRAND if idx == 3 else COLOR_SURFACE_SAND
        np.line.fill.background()
        p_np = np.text_frame.paragraphs[0]
        p_np.text = num
        p_np.font.size = Pt(14)
        p_np.font.bold = True
        p_np.font.color.rgb = COLOR_SURFACE_WHITE if idx == 3 else COLOR_BRAND_DARK
        p_np.font.name = "Segoe UI"
        p_np.alignment = PP_ALIGN.CENTER

        # Content text
        tb = s2.shapes.add_textbox(Inches(1.9), y_pos + Inches(0.1), Inches(10.3), Inches(0.68))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.font.name = "Segoe UI"

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = COLOR_MUTED
        p_d.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 3: SYSTEM ARCHITECTURAL OVERVIEW
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "PHẦN 1 • KIẾN TRÚC HỆ THỐNG", "Kiến Trúc Tổng Quan SCANMS (System Architecture)", "Thiết kế kiến trúc 5 tầng chuẩn công nghiệp: Client Layer, Gateway & Guard, Modular Monolith, Realtime Socket và Data Storage", 3)

    # Left: High-res Architecture Diagram
    left_card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(6.8), Inches(5.35))
    left_card.fill.solid()
    left_card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    left_card.line.color.rgb = COLOR_LINE
    left_card.line.width = Pt(1)

    if os.path.exists(ARCH_IMAGE):
        s3.shapes.add_picture(ARCH_IMAGE, Inches(0.9), Inches(1.6), width=Inches(6.6), height=Inches(5.15))

    # Right: 4 Architecture Pillars
    tiers = [
        ("TẦNG 1: MULTI-ACTOR CLIENT LAYER", "Giao diện React 19 + TypeScript phân quyền 4 cổng riêng biệt: Buyer Portal (Khách mua), KOL Portal (Nhà sáng tạo), Merchant Portal (Chủ Shop) và Admin Portal (Ban quản trị sàn)."),
        ("TẦNG 2: SECURITY GATEWAY & RATE LIMIT", "Reverse Proxy NGINX kết hợp Cloudflare SSL/TLS, xác thực đa nhân tố JWT (Argon2id), RBAC Guard và Redis Sliding Window Rate Limit chặn đứng spam click tiếp thị."),
        ("TẦNG 3: APPLICATION SERVICES (MODULAR MONOLITH)", "NestJS 11 cấu trúc module độc lập cao: Auth & Identity (FR01-08), Products & Catalog (FR09-16), Collaboration & Deals (FR17-24), Orders, Escrow & Wallets (FR25-32)."),
        ("TẦNG 4 & 5: REALTIME SOCKET & DATA PERSISTENCE", "PostgreSQL 16 bảo toàn tính toàn vẹn ACID, Prisma ORM 7, Redis 7 In-memory Cache & BullMQ Queue, WebSockets Socket.IO (Livestream/Chat), tích hợp VietQR PayOS & GHN API.")
    ]

    for idx, (title, desc) in enumerate(tiers):
        y_pos = Inches(1.5 + idx * 1.35)
        c = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.8), y_pos, Inches(4.733), Inches(1.22))
        c.fill.solid()
        c.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        c.line.color.rgb = COLOR_BRAND_BORDER if idx == 2 else COLOR_LINE
        c.line.width = Pt(1.5 if idx == 2 else 1)

        tb = s3.shapes.add_textbox(Inches(7.95), y_pos + Inches(0.08), Inches(4.45), Inches(1.05))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = COLOR_BRAND_STRONG
        pt.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = COLOR_INK
        pd.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 4: TECHNOLOGY STACK
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "PHẦN 2 • CÔNG NGHỆ XÂY DỰNG", "Công Nghệ Xây Dựng Hệ Thống (Technology Stack)", "Lựa chọn công nghệ hiện đại, tối ưu hiệu năng cao, an toàn giao dịch tài chính và mở rộng linh hoạt", 4)

    tech_groups = [
        ("FRONTEND & CLIENT", "Giao Diện & Trải Nghiệm", [
            ("React 19 & TypeScript", "Xây dựng SPA hiệu năng cao, kiểm soát kiểu dữ liệu tĩnh 100%."),
            ("TailwindCSS v4 (Warm Sand)", "Hệ thống Atomic Design Tokens chuẩn Vàng Be sang trọng."),
            ("Vite Build Engine", "Tối ưu bundling siêu nhanh, chia chunk tải trang tức thời."),
            ("Lucide Icons & Three.js", "Hệ thống icon ngữ cảnh chuẩn TMĐT và 3D Shopping Scene."),
            ("Zod & React Hook Form", "Kiểm thực dữ liệu form 2 lớp chặt chẽ trước khi gửi API.")
        ]),
        ("BACKEND & SERVICES", "Xử Lý Nghiệp Vụ & API", [
            ("NestJS 11 & TypeScript", "Kiến trúc Modular Monolith hướng đối tượng, DI container mạnh mẽ."),
            ("Argon2id Password Hashing", "Thuật toán băm mật khẩu bảo mật cao nhất theo OWASP."),
            ("JWT (Access & Refresh)", "Cơ chế cấp lại phiên không gián đoạn, bảo mật Stateless."),
            ("Socket.IO WebSockets", "Kênh tương tác Realtime: Livestream chat, chốt đơn, tin nhắn."),
            ("BullMQ & Redis Streams", "Quản lý hàng đợi tác vụ nền bất đồng bộ (Background Jobs).")
        ]),
        ("DATABASE & CACHE", "Cơ Sở Dữ Liệu & Khóa Dòng", [
            ("PostgreSQL 16 (ACID)", "Hệ quản trị CSDL quan hệ chuẩn mực, bảo vệ giao dịch tiền tệ."),
            ("Prisma ORM 7", "Type-safe Database Client, tự động đồng bộ Migration schema."),
            ("Pessimistic Locking", "Lệnh SELECT FOR UPDATE chống gian lận rút tiền đồng thời."),
            ("Redis 7 In-Memory", "Sliding window rate limit, Session cache & Leaderboard rankings."),
            ("Financial Ledger (Append-Only)", "Sổ cái tài chính bất biến, không cho phép sửa/xóa lịch sử.")
        ]),
        ("INTEGRATION & DEVOPS", "Tích Hợp & Triển Khai", [
            ("PayOS / VietQR Napas 24/7", "Cổng thanh toán tự động và chi trả hoa hồng hàng loạt."),
            ("GHN Express API", "Đồng bộ mã vận đơn bưu cục, tính phí ship và Webhook tracking."),
            ("Cloudinary CDN", "Lưu trữ hình ảnh sản phẩm 1:1, video nghiệm thu hàng mẫu."),
            ("Docker & Docker Compose", "Đóng gói đồng nhất môi trường phát triển và máy chủ vận hành."),
            ("Jest & Playwright", "Hơn 50 bộ test case kiểm thử tự động Backend & End-to-End.")
        ])
    ]

    for idx, (badge, title, items) in enumerate(tech_groups):
        x_pos = Inches(0.8 + idx * 2.98)
        card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos, Inches(1.5), Inches(2.82), Inches(5.35))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        card.line.color.rgb = COLOR_BRAND_BORDER if idx == 1 or idx == 2 else COLOR_LINE
        card.line.width = Pt(1.5 if idx == 1 or idx == 2 else 1)

        # Header badge
        hb = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos + Inches(0.15), Inches(1.65), Inches(2.52), Inches(0.3))
        hb.fill.solid()
        hb.fill.fore_color.rgb = COLOR_BRAND_SOFT
        hb.line.color.rgb = COLOR_BRAND_BORDER
        p_hb = hb.text_frame.paragraphs[0]
        p_hb.text = badge
        p_hb.font.size = Pt(9)
        p_hb.font.bold = True
        p_hb.font.color.rgb = COLOR_BRAND_STRONG
        p_hb.font.name = "Segoe UI"
        p_hb.alignment = PP_ALIGN.CENTER

        # Title
        t_box = s4.shapes.add_textbox(x_pos + Inches(0.12), Inches(2.0), Inches(2.58), Inches(0.35))
        p_t = t_box.text_frame.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.font.name = "Segoe UI"
        p_t.alignment = PP_ALIGN.CENTER

        # Tech list
        y_item = 2.45
        for t_name, t_desc in items:
            ibox = s4.shapes.add_textbox(x_pos + Inches(0.12), Inches(y_item), Inches(2.58), Inches(0.55))
            tf_i = ibox.text_frame
            tf_i.word_wrap = True
            pi1 = tf_i.paragraphs[0]
            pi1.text = f"• {t_name}"
            pi1.font.size = Pt(10)
            pi1.font.bold = True
            pi1.font.color.rgb = COLOR_BRAND_DARK
            pi1.font.name = "Segoe UI"

            pi2 = tf_i.add_paragraph()
            pi2.text = t_desc
            pi2.font.size = Pt(8.5)
            pi2.font.color.rgb = COLOR_MUTED
            pi2.font.name = "Segoe UI"
            y_item += 0.58

    # ==========================================
    # SLIDE 5: CONCEPTUAL DATA MODEL
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "PHẦN 3 • SƠ ĐỒ DỮ LIỆU", "Sơ Đồ Dữ Liệu Khái Niệm (Conceptual Data Model)", "Thiết kế thực thể CSDL phân định 5 cụm cốt lõi, bảo toàn tính liên kết dữ liệu và tuân thủ chuẩn ACID", 5)

    # Left: Conceptual ERD Image
    left_card = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(6.8), Inches(5.35))
    left_card.fill.solid()
    left_card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    left_card.line.color.rgb = COLOR_LINE
    left_card.line.width = Pt(1)

    if os.path.exists(CONCEPTUAL_IMAGE):
        s5.shapes.add_picture(CONCEPTUAL_IMAGE, Inches(0.9), Inches(1.6), width=Inches(6.6), height=Inches(5.15))

    # Right: 5 Core Entity Clusters
    clusters = [
        ("CỤM 1: TÀI KHOẢN, PHÂN QUYỀN & KYC", "User, Role, KycVerification, Store", "Quản lý tài khoản đa vai trò (KOL, Shop, Admin, Customer) và lưu vết hồ sơ định danh điện tử CCCD/GPKD."),
        ("CỤM 2: SẢN PHẨM & BIẾN THỂ 2 TẦNG", "Product, ProductVariant, Category, Brand", "Ma trận phân loại hàng hóa (Màu, Size), SKU con, trọng lượng đóng gói và tồn kho riêng biệt."),
        ("CỤM 3: TIẾP THỊ & DEAL ĐỘC QUYỀN", "AffiliateCampaign, ExclusiveDeal, ReferralLink", "Hoa hồng mở 10% sàn, thỏa thuận độc quyền VIP kèm chỉ tiêu KPI doanh số và link rút gọn /r/:code."),
        ("CỤM 4: ĐƠN HÀNG, VẬN CHUYỂN & REVIEW", "Order, OrderItem, ShippingDispatch, Review", "Quản lý đơn hàng, khấu trừ tồn kho nguyên tử, mã vận đơn GHN bưu cục và đánh giá khách mua xác thực."),
        ("CỤM 5: TÀI CHÍNH, ESCROW & SỔ CÁI VÍ", "Wallet, EscrowHolding, FinancialLedger, PayoutBatch", "Quỹ bảo chứng Escrow 14 ngày, khóa dòng SELECT FOR UPDATE và sổ cái bất biến Append-Only.")
    ]

    for idx, (title, sub, desc) in enumerate(clusters):
        y_pos = Inches(1.5 + idx * 1.08)
        c = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.8), y_pos, Inches(4.733), Inches(0.98))
        c.fill.solid()
        c.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        c.line.color.rgb = COLOR_BRAND_BORDER if idx == 4 else COLOR_LINE
        c.line.width = Pt(1.5 if idx == 4 else 1)

        tb = s5.shapes.add_textbox(Inches(7.95), y_pos + Inches(0.06), Inches(4.45), Inches(0.88))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.size = Pt(10.5)
        pt.font.bold = True
        pt.font.color.rgb = COLOR_BRAND_STRONG
        pt.font.name = "Segoe UI"

        ps = tf.add_paragraph()
        ps.text = f"Entities: {sub}"
        ps.font.size = Pt(9)
        ps.font.bold = True
        ps.font.color.rgb = COLOR_BRAND_DARK
        ps.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.size = Pt(8.5)
        pd.font.color.rgb = COLOR_MUTED
        pd.font.name = "Segoe UI"

    # ==========================================
    # HELPER FUNCTION FOR 5 MAIN FLOW SLIDES
    # ==========================================
    def add_flow_slide(slide_num, flow_num, flow_title, category_badge, subtitle, actors, steps, decision_info, tech_highlights):
        s = prs.slides.add_slide(blank_layout)
        set_slide_background(s)
        add_header(s, f"PHẦN 4 • MAIN FLOW {flow_num}/5", f"FLOW {flow_num}: {flow_title.upper()}", subtitle, slide_num)

        # Actors Bar (Top of flow)
        actors_card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.48), Inches(11.733), Inches(0.50))
        actors_card.fill.solid()
        actors_card.fill.fore_color.rgb = COLOR_SURFACE_SAND
        actors_card.line.color.rgb = COLOR_BRAND_BORDER
        actors_card.line.width = Pt(1)

        tf_act = actors_card.text_frame
        p_act = tf_act.paragraphs[0]
        p_act.text = "  CÁC TÁC NHÂN (ACTORS):   "
        p_act.font.size = Pt(9.5)
        p_act.font.bold = True
        p_act.font.color.rgb = COLOR_BRAND_DARK
        p_act.font.name = "Segoe UI"

        for idx, act in enumerate(actors):
            run = p_act.add_run()
            run.text = f"[{act['role']}: {act['name']}]" + ("   ➔   " if idx < len(actors) - 1 else "")
            run.font.bold = True
            run.font.color.rgb = COLOR_BRAND_STRONG

        # 4 Main Sequential Flow Cards
        card_w = Inches(2.78)
        card_gap = Inches(0.2)
        y_card = Inches(2.10)
        h_card = Inches(3.68)

        for idx, step in enumerate(steps):
            x_pos = Inches(0.8 + idx * (2.78 + 0.2))
            scard = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos, y_card, card_w, h_card)
            scard.fill.solid()
            scard.fill.fore_color.rgb = COLOR_SURFACE_WHITE
            scard.line.color.rgb = COLOR_BRAND_BORDER if idx == 1 or idx == 2 else COLOR_LINE
            scard.line.width = Pt(1.5 if idx == 1 or idx == 2 else 1)

            # Step Badge
            sbadge = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos + Inches(0.12), y_card + Inches(0.12), Inches(2.54), Inches(0.28))
            sbadge.fill.solid()
            sbadge.fill.fore_color.rgb = COLOR_BRAND_SOFT
            sbadge.line.color.rgb = COLOR_BRAND_BORDER
            p_sb = sbadge.text_frame.paragraphs[0]
            p_sb.text = f"BƯỚC {step['num']} • {step['actor'].upper()}"
            p_sb.font.size = Pt(8.5)
            p_sb.font.bold = True
            p_sb.font.color.rgb = COLOR_BRAND_STRONG
            p_sb.font.name = "Segoe UI"
            p_sb.alignment = PP_ALIGN.CENTER

            # Step Title
            tbox = s.shapes.add_textbox(x_pos + Inches(0.1), y_card + Inches(0.45), Inches(2.58), Inches(0.65))
            tf_t = tbox.text_frame
            tf_t.word_wrap = True
            p_st = tf_t.paragraphs[0]
            p_st.text = step['title']
            p_st.font.size = Pt(11)
            p_st.font.bold = True
            p_st.font.color.rgb = COLOR_INK
            p_st.font.name = "Segoe UI"

            # Step Description bullets
            dbox = s.shapes.add_textbox(x_pos + Inches(0.1), y_card + Inches(1.1), Inches(2.58), Inches(2.45))
            tf_d = dbox.text_frame
            tf_d.word_wrap = True
            for b_idx, bullet in enumerate(step['bullets']):
                pb = tf_d.paragraphs[0] if b_idx == 0 else tf_d.add_paragraph()
                pb.text = f"• {bullet}"
                pb.font.size = Pt(9)
                pb.font.color.rgb = COLOR_MUTED
                pb.font.name = "Segoe UI"

            # Arrow connector between cards
            if idx < 3:
                arr = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x_pos + card_w + Inches(0.04), y_card + Inches(1.7), Inches(0.12), Inches(0.2))
                arr.fill.solid()
                arr.fill.fore_color.rgb = COLOR_BRAND
                arr.line.fill.background()

        # Decision & Outcome Box (Refined layout, no text clipping)
        dec_card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.90), Inches(11.733), Inches(1.02))
        dec_card.fill.solid()
        dec_card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
        dec_card.line.color.rgb = COLOR_LINE
        dec_card.line.width = Pt(1)

        # Left label of decision
        dec_lbl = s.shapes.add_textbox(Inches(0.9), Inches(5.96), Inches(2.35), Inches(0.90))
        tf_dl = dec_lbl.text_frame
        p_dl1 = tf_dl.paragraphs[0]
        p_dl1.text = "ĐIỂM RẼ NHÁNH"
        p_dl1.font.size = Pt(9)
        p_dl1.font.bold = True
        p_dl1.font.color.rgb = COLOR_BRAND_STRONG
        p_dl1.font.name = "Segoe UI"
        p_dl2 = tf_dl.add_paragraph()
        p_dl2.text = decision_info['label']
        p_dl2.font.size = Pt(8.5)
        p_dl2.font.color.rgb = COLOR_MUTED
        p_dl2.font.name = "Segoe UI"

        # Approve branch box
        app_box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.35), Inches(6.00), Inches(4.45), Inches(0.80))
        app_box.fill.solid()
        app_box.fill.fore_color.rgb = RGBColor(0xEC, 0xFD, 0xF5) # soft green
        app_box.line.color.rgb = RGBColor(0xA7, 0xF3, 0xD0)
        tf_app = app_box.text_frame
        tf_app.word_wrap = True
        p_a1 = tf_app.paragraphs[0]
        p_a1.text = f"✔ {decision_info['approve_title']}"
        p_a1.font.size = Pt(9.5)
        p_a1.font.bold = True
        p_a1.font.color.rgb = COLOR_SUCCESS
        p_a1.font.name = "Segoe UI"
        p_a2 = tf_app.add_paragraph()
        p_a2.text = decision_info['approve_desc']
        p_a2.font.size = Pt(8.2)
        p_a2.font.color.rgb = COLOR_INK
        p_a2.font.name = "Segoe UI"

        # Reject branch box
        rej_box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.95), Inches(6.00), Inches(4.45), Inches(0.80))
        rej_box.fill.solid()
        rej_box.fill.fore_color.rgb = RGBColor(0xFE, 0xF2, 0xF2) # soft red
        rej_box.line.color.rgb = RGBColor(0xFE, 0xCD, 0xCD)
        tf_rej = rej_box.text_frame
        tf_rej.word_wrap = True
        p_r1 = tf_rej.paragraphs[0]
        p_r1.text = f"✖ {decision_info['reject_title']}"
        p_r1.font.size = Pt(9.5)
        p_r1.font.bold = True
        p_r1.font.color.rgb = COLOR_DANGER
        p_r1.font.name = "Segoe UI"
        p_r2 = tf_rej.add_paragraph()
        p_r2.text = decision_info['reject_desc']
        p_r2.font.size = Pt(8.2)
        p_r2.font.color.rgb = COLOR_INK
        p_r2.font.name = "Segoe UI"

        return s

    # ==========================================
    # SLIDE 6: FLOW 1 - USER REGISTER, RBAC & KYC
    # ==========================================
    add_flow_slide(
        slide_num=6,
        flow_num=1,
        flow_title="Quản Trị Sàn, Phân Quyền RBAC & Định Danh KYC",
        category_badge="BẢO MẬT & ĐỊNH DANH",
        subtitle="Quy trình đăng ký đa vai trò, băm mật khẩu Argon2, phân quyền RBAC Guard và xét duyệt hồ sơ định danh điện tử theo Nghị định 85/2021/NĐ-CP",
        actors=[
            {"role": "User", "name": "KOL / Shop Đối Tác"},
            {"role": "System", "name": "SCANMS Auth & Guard Engine"},
            {"role": "Compliance", "name": "Admin / Manager Sàn"}
        ],
        steps=[
            {
                "num": 1,
                "actor": "User (KOL / Shop)",
                "title": "Đăng Ký & Nhập Liệu",
                "bullets": [
                    "Chọn vai trò tham gia (KOL / Shop / Khách hàng).",
                    "Nhập Email, SĐT và Mật khẩu an toàn.",
                    "Frontend validate Zod Schema ngăn chặn ký tự độc hại.",
                    "Bấm 'Đăng ký tài khoản đối tác'."
                ]
            },
            {
                "num": 2,
                "actor": "System (Backend)",
                "title": "Băm Argon2 & Kích Hoạt OTP",
                "bullets": [
                    "Băm mật khẩu bằng Argon2id (Salt + Memory-hard).",
                    "Gửi OTP xác thực 6 số qua Email (Resend/SMTP).",
                    "Xác thực OTP thành công ➔ Cấp JWT Access/Refresh tokens.",
                    "RBAC Guard khóa quyền tài chính tới khi hoàn tất KYC."
                ]
            },
            {
                "num": 3,
                "actor": "User (KOL / Shop)",
                "title": "Nộp Hồ Sơ Định Danh KYC",
                "bullets": [
                    "KOL cá nhân: Tải ảnh CCCD 2 mặt, Mã số thuế TNCN, Số tài khoản ngân hàng thụ hưởng.",
                    "Shop doanh nghiệp: Tải Giấy phép ĐKKD, Mã số thuế DN, Địa chỉ kho hàng lấy/trả.",
                    "Trạng thái hồ sơ chuyển sang PENDING_REVIEW."
                ]
            },
            {
                "num": 4,
                "actor": "Compliance / Admin",
                "title": "Thẩm Định & Cấp Quyền",
                "bullets": [
                    "Cán bộ tuân thủ mở hàng đợi KycApprovalPage.",
                    "Đối soát tính nguyên vẹn ảnh giấy tờ và thông tin thuế.",
                    "Đưa ra quyết định: Phê duyệt (Approve) hoặc Từ chối (Reject).",
                    "Ghi vết thẩm định vào Audit Log hệ thống."
                ]
            }
        ],
        decision_info={
            "label": "Thẩm định hồ sơ KYC đối tác sàn",
            "approve_title": "PHÊ DUYỆT (APPROVE): KÍCH HOẠT QUYỀN HẠN ĐỐI TÁC",
            "approve_desc": "Hồ sơ hợp lệ ➔ Kích hoạt trạng thái VERIFIED, mở khóa 100% quyền hạn nhận hoa hồng, mở gian hàng, xuất kho hàng và rút tiền.",
            "reject_title": "TỪ CHỐI (REJECT): YÊU CẦU BỔ SUNG MINH CHỨNG",
            "reject_desc": "Ảnh CCCD mờ, sai lệch mã số thuế ➔ Chuyển trạng thái REJECTED kèm lý do chi tiết. Người dùng nhận thông báo nộp lại hồ sơ bổ sung."
        },
        tech_highlights=[
            "Mã hóa Argon2id chuẩn OWASP",
            "RBAC Middleware Guard bảo vệ endpoint",
            "Tuân thủ Nghị định 85/2021/NĐ-CP"
        ]
    )

    # ==========================================
    # SLIDE 7: FLOW 2 - PRODUCT PUBLISHING & SAMPLE REQUEST
    # ==========================================
    add_flow_slide(
        slide_num=7,
        flow_num=2,
        flow_title="Đăng Tải Sản Phẩm, Cấp Mẫu Thử & Deal Độc Quyền",
        category_badge="HÀNG HÓA & HỢP TÁC ĐỐI TÁC",
        subtitle="Quy trình chuẩn hóa sản phẩm TMĐT 6 khối logic, cấp phát hàng mẫu thử 14 ngày có cam kết nghiệm thu và cơ chế đàm phán deal độc quyền",
        actors=[
            {"role": "Shop", "name": "Chủ Gian Hàng Đối Tác"},
            {"role": "System", "name": "Catalog & Shipping Engine"},
            {"role": "Creator", "name": "KOL / KOC Bán Hàng"}
        ],
        steps=[
            {
                "num": 1,
                "actor": "Shop Manager",
                "title": "Tạo Sản Phẩm 6 Khối Logic",
                "bullets": [
                    "Nhập thông tin, danh mục, thương hiệu, mô tả Rich Text.",
                    "Tải thư viện ảnh 1:1, ảnh bìa và video sản phẩm.",
                    "Thiết lập ma trận biến thể 2 chiều (Màu/Size/SKU/Giá).",
                    "Khai báo cân nặng đóng gói GHN và hoa hồng mở 10% sàn."
                ]
            },
            {
                "num": 2,
                "actor": "System / Marketplace",
                "title": "Kiểm Duyệt & Xuất Bản",
                "bullets": [
                    "Lưu CSDL với cơ chế Soft-delete (is_deleted = false).",
                    "Kiểm duyệt nội dung tự động chống từ khóa cấm.",
                    "Xuất bản sản phẩm lên Sàn TMĐT và Kho Hàng Mẫu.",
                    "Tính toán tổng tồn kho thực tế từ các SKU con."
                ]
            },
            {
                "num": 3,
                "actor": "KOL / KOC",
                "title": "Gửi Yêu Cầu Xin Hàng Mẫu",
                "bullets": [
                    "KOL duyệt kho mẫu thử, chọn sản phẩm phù hợp tệp fan.",
                    "Bấm 'Xin sản phẩm mẫu' (Sample Request).",
                    "Nhập địa chỉ nhận hàng và cam kết trả video nghiệm thu.",
                    "Hệ thống kiểm tra hạn mức cấp mẫu theo Tier của KOL."
                ]
            },
            {
                "num": 4,
                "actor": "Shop & KOL",
                "title": "Duyệt Mẫu & Đàm Phán Deal VIP",
                "bullets": [
                    "Shop duyệt hồ sơ KOL ➔ Sinh vận đơn GHN chuyển mẫu thử.",
                    "KOL nhận hàng ➔ Kích hoạt đồng hồ đếm ngược 14 ngày trả video.",
                    "Shop mở Live Chat ➔ Gửi đề xuất Exclusive Deal (18%-25%).",
                    "KOL chấp thuận deal độc quyền kèm KPI doanh số cam kết."
                ]
            }
        ],
        decision_info={
            "label": "Xét duyệt hồ sơ xin hàng mẫu thử của KOL",
            "approve_title": "DUYỆT CẤP MẪU: SINH VẬN ĐƠN GHN & GẮN DEADLINE 14 NGÀY",
            "approve_desc": "Shop chấp thuận ➔ Shipping Simulator tự động sinh mã vận đơn GHN-SMP-XXXXX, in phiếu đóng gói A6. Bắt đầu tính chu kỳ 14 ngày trả video.",
            "reject_title": "TỪ CHỐI CẤP MẪU: BẢO VỆ NGÂN SÁCH GIAN HÀNG",
            "reject_desc": "KOL không đúng tệp khách hoặc tỷ lệ hoàn thành video dưới 70% ➔ Từ chối cấp mẫu, giữ nguyên suất mẫu cho đối tác tiềm năng khác."
        },
        tech_highlights=[
            "Ma trận biến thể 2 tầng tự động tính tồn kho",
            "Shipping Simulator sinh mã GHN & Barcode A6",
            "Đồng hồ đếm ngược 14 ngày nghiệm thu video"
        ]
    )

    # ==========================================
    # SLIDE 8: FLOW 3 - AFFILIATE TRACKING & BUYER CHECKOUT
    # ==========================================
    add_flow_slide(
        slide_num=8,
        flow_num=3,
        flow_title="Tiếp Thị Affiliate, Smart Tracking & Mua Hàng",
        category_badge="TIẾP THỊ & BÁN HÀNG",
        subtitle="Cơ chế tạo link rút gọn, động cơ phân bổ hoa hồng Last-Click 30 ngày chống gian lận click và quy trình mua sắm đồng bộ CSDL",
        actors=[
            {"role": "Creator", "name": "KOL Tiếp Thị"},
            {"role": "Buyer", "name": "Khách Hàng Mua Sắm"},
            {"role": "System", "name": "Redis Rate Limit & PostgreSQL"}
        ],
        steps=[
            {
                "num": 1,
                "actor": "KOL / Creator",
                "title": "Tạo Công Cụ Tiếp Thị",
                "bullets": [
                    "KOL tạo link rút gọn cá nhân hóa (scanms.vn/r/:code).",
                    "Tải ảnh Dynamic QR Code phục vụ livestream và video ngắn.",
                    "Kích hoạt mã Voucher độc quyền dành riêng cho fan.",
                    "Theo dõi thông số chiến dịch qua Dashboard thời gian thực."
                ]
            },
            {
                "num": 2,
                "actor": "System (Tracking)",
                "title": "Smart Tracking & Chống Click Tặc",
                "bullets": [
                    "Khách bấm link ➔ Endpoint /api/r/:code ghi nhận Click log.",
                    "Redis Sliding Window chặn đứng spam click (>10 clicks/giây).",
                    "Gán Cookie theo dõi 30 ngày theo quy tắc Last-Click Attribution.",
                    "Bảo vệ tính khách quan: KOL cuối cùng dẫn đơn sẽ nhận hoa hồng."
                ]
            },
            {
                "num": 3,
                "actor": "Customer (Buyer)",
                "title": "Chọn Biến Thể & Giỏ Hàng CSDL",
                "bullets": [
                    "Khách hàng đăng nhập an toàn (Google 1-Click / OTP).",
                    "Chọn biến thể phân loại (Màu sắc, Dung tích, Số lượng).",
                    "Thêm vào giỏ hàng ➔ Đồng bộ tức thời trên PostgreSQL.",
                    "Đổi thiết bị hoặc tab trình duyệt vẫn giữ nguyên 100% giỏ hàng."
                ]
            },
            {
                "num": 4,
                "actor": "Customer & System",
                "title": "Thanh Toán & Khấu Trừ Tồn Kho",
                "bullets": [
                    "Tiến hành Checkout: Chọn địa chỉ giao hàng chuẩn xã/huyện/tỉnh.",
                    "Hệ thống tự động áp dụng Voucher sàn và Shop Voucher đủ điều kiện.",
                    "Chọn thanh toán: VietQR PayOS tự động hoặc COD nhận hàng.",
                    "Khấu trừ tồn kho nguyên tử ➔ Gắn mã Attribution ID của KOL."
                ]
            }
        ],
        decision_info={
            "label": "Ghi nhận giao dịch mua hàng & Phân bổ Attribution",
            "approve_title": "ĐẶT HÀNG THÀNH CÔNG: KHẤU TRỪ TỒN KHO & GHI NHẬN ATTRIBUTION",
            "approve_desc": "Đơn hàng tạo thành công (PENDING_CONFIRMATION), trừ kho tức thời, gắn chặt mã KOL Attribution. Hàng đợi BullMQ gửi email xác nhận hóa đơn.",
            "reject_title": "CHẶN SPAM CLICK & HỦY ĐƠN QUÁ HẠN THANH TOÁN",
            "reject_desc": "Redis chặn click tặc gian lận; Đơn VietQR không thanh toán sau 15 phút sẽ tự động giải phóng tồn kho về lại cho sàn."
        },
        tech_highlights=[
            "Thuật toán Last-Click 30 ngày chuẩn quốc tế",
            "Redis Sliding Window Rate Limit chống click tặc",
            "Giỏ hàng đồng bộ Database (Không lưu LocalStorage)"
        ]
    )

    # ==========================================
    # SLIDE 9: FLOW 4 - LOGISTICS, ESCROW 14D & CLAWBACK
    # ==========================================
    add_flow_slide(
        slide_num=9,
        flow_num=4,
        flow_title="Đóng Gói Vận Chuyển, Bảo Chứng Escrow 14D & Đổi Trả",
        category_badge="HẬU CẦN & BẢO CHỨNG TÀI CHÍNH",
        subtitle="Quy trình điều phối vận chuyển liên kết GHN, cơ chế giam hoa hồng tại Quỹ Escrow 14 ngày và giải thuật Clawback thu hồi tiền khi có tranh chấp",
        actors=[
            {"role": "Shop", "name": "Chủ Shop Xuất Kho"},
            {"role": "Logistics", "name": "Đơn Vị Giao Hàng (GHN)"},
            {"role": "Customer", "name": "Người Nhận Bưu Kiện"},
            {"role": "System", "name": "Quỹ Bảo Chứng Escrow"}
        ],
        steps=[
            {
                "num": 1,
                "actor": "Shop & GHN",
                "title": "Xác Nhận & Xuất Kho Bưu Kiện",
                "bullets": [
                    "Shop xác nhận đơn, in phiếu giao hàng A6 chuẩn Barcode Code-128.",
                    "Bàn giao kiện hàng cho bưu tá Giao Hàng Nhanh (GHN).",
                    "Đơn hàng cập nhật sang trạng thái SHIPPED.",
                    "Hệ thống gửi mã vận đơn theo dõi tới khách hàng."
                ]
            },
            {
                "num": 2,
                "actor": "Customer & System",
                "title": "Tra Cứu Lộ Trình Thời Gian Thực",
                "bullets": [
                    "Khách hàng truy cập /tracking bằng SĐT hoặc mã đơn hàng.",
                    "Hệ thống nhận Webhook GHN cập nhật timeline chi tiết từng bưu cục.",
                    "Bưu tá giao hàng thành công ➔ Trạng thái chuyển sang DELIVERED.",
                    "Khách hàng mở quyền viết Đánh giá sản phẩm xác thực."
                ]
            },
            {
                "num": 3,
                "actor": "System (Escrow)",
                "title": "Kích Hoạt Quỹ Bảo Chứng Escrow",
                "bullets": [
                    "Hoa hồng của KOL được tính toán tự động theo tỷ lệ cam kết.",
                    "Hệ thống tạm giữ hoa hồng tại Ví Chờ (Pending Escrow) 14 ngày.",
                    "Mục đích: Đảm bảo dòng tiền sàn nếu người mua khiếu nại đổi trả.",
                    "Bảo vệ uy tín cho cả Shop và KOL đối tác."
                ]
            },
            {
                "num": 4,
                "actor": "Customer & Shop",
                "title": "Xử Lý Đổi Trả & Phân Xử Khiếu Nại",
                "bullets": [
                    "Khách hàng gửi yêu cầu Trả hàng / Hoàn tiền (Return Request).",
                    "Bắt buộc tải lên Video mở hộp bóc bưu kiện làm minh chứng.",
                    "Shop thẩm định bằng chứng qua giao diện đối soát Split-View.",
                    "Admin can thiệp phân xử nếu hai bên xảy ra tranh chấp kéo dài."
                ]
            }
        ],
        decision_info={
            "label": "Đối soát khiếu nại đổi trả hàng của khách",
            "approve_title": "CHẤP THUẬN HOÀN TRẢ: KÍCH HOẠT CLAWBACK THU HỒI HOA HỒNG",
            "approve_desc": "Minh chứng hợp lệ ➔ Hoàn tiền 100% cho khách, Clawback Engine tự động thu hồi hoa hồng tạm giữ về 0đ. Sàn không bị thất thoát tiền tệ.",
            "reject_title": "HẾT 14 NGÀY AN TOÀN: ESCROW TỰ ĐỘNG GIẢI PHÓNG TIỀN VỀ VÍ",
            "reject_desc": "Không có khiếu nại sau 14 ngày ➔ Quỹ bảo chứng tự động giải phóng hoa hồng từ Ví Chờ sang Ví Khả Dụng để đối tác có thể rút tiền."
        },
        tech_highlights=[
            "Tích hợp Webhook đồng bộ lộ trình GHN Express",
            "Cơ chế Quỹ bảo chứng Escrow 14 ngày an toàn",
            "Giải thuật Clawback tự động thu hồi hoa hồng"
        ]
    )

    # ==========================================
    # SLIDE 10: FLOW 5 - WALLET, PESSIMISTIC LOCK, TAX & PAYOUT
    # ==========================================
    add_flow_slide(
        slide_num=10,
        flow_num=5,
        flow_title="Ví Tiền Đối Tác, Pessimistic Lock, Thuế & Payout",
        category_badge="TÀI CHÍNH & ĐỐI SOÁT",
        subtitle="Tự động mở khóa số dư sau 14 ngày, thuật toán khóa dòng CSDL ngăn chặn rút tiền đồng thời, khấu trừ 10% thuế TNCN và chi trả lô VietQR Napas 24/7",
        actors=[
            {"role": "Cronjob", "name": "Tác Vụ Tự Động Quét Lô"},
            {"role": "Partner", "name": "KOL / Shop Rút Tiền"},
            {"role": "Ledger", "name": "Sổ Cái Tài Chính Bất Biến"},
            {"role": "Bank", "name": "VietQR Napas 24/7"}
        ],
        steps=[
            {
                "num": 1,
                "actor": "System (Cronjob)",
                "title": "Tự Động Mở Khóa Số Dư Sau 14D",
                "bullets": [
                    "Cronjob chạy định kỳ quét các đơn hàng hoàn tất quá 14 ngày.",
                    "Tự động giải phóng hoa hồng từ Ví Chờ sang Ví Khả Dụng.",
                    "Gửi thông báo biến động số dư tức thời qua WebSocket và Email.",
                    "Đối tác tích lũy số dư sẵn sàng tạo lệnh rút tiền."
                ]
            },
            {
                "num": 2,
                "actor": "KOL / Partner",
                "title": "Tạo Yêu Cầu Rút Tiền (Payout)",
                "bullets": [
                    "KOL mở màn hình Ví tiền đối tác (/collaborator/wallet).",
                    "Nhập số tiền muốn rút về tài khoản ngân hàng chính chủ đã KYC.",
                    "Kiểm tra hạn mức rút tối thiểu (từ 100.000 VNĐ).",
                    "Bấm 'Gửi yêu cầu rút tiền an toàn'."
                ]
            },
            {
                "num": 3,
                "actor": "System (DB Lock)",
                "title": "Khóa Bi Quan (SELECT FOR UPDATE)",
                "bullets": [
                    "Kích hoạt khóa hàng CSDL Pessimistic Locking trong Transaction.",
                    "Ngăn chặn triệt để tấn công Double-spending (rút tiền đồng thời đa tab).",
                    "Đảm bảo số dư ví không bao giờ bị âm dưới mọi trường hợp tải cao.",
                    "Ghi nhận giao dịch vào Sổ cái bất biến (Financial Ledger)."
                ]
            },
            {
                "num": 4,
                "actor": "Admin & Napas 24/7",
                "title": "Khấu Trừ Thuế & Chi Trả Lô VietQR",
                "bullets": [
                    "Lệnh rút >= 2.000.000 VNĐ: Tự động trích lập 10% thuế TNCN theo luật.",
                    "Admin duyệt lệnh đối soát trên giao diện PayoutApprovalPage.",
                    "Bấm 'Xuất file VietQR Napas247': Xuất file lô chuyển tiền ngân hàng.",
                    "Tải ủy nhiệm chi hoàn tất ➔ Cập nhật Bảng Vinh Danh Leaderboard."
                ]
            }
        ],
        decision_info={
            "label": "Kiểm tra số dư, điều kiện KYC và trích lập thuế TNCN",
            "approve_title": "DUYỆT CHI TRẢ: BẮN TIỀN LIÊN NGÂN HÀNG NAPAS 24/7",
            "approve_desc": "Hồ sơ KYC chuẩn xác, số dư hợp lệ ➔ Xuất file VietQR Napas chuyển tiền tức thời về STK ngân hàng. Trích lập 10% thuế TNCN vào ngân sách nhà nước.",
            "reject_title": "TỪ CHỐI & HOÀN TIỀN VÍ: BẢO VỆ TÍNH TOÀN VẸN TÀI CHÍNH",
            "reject_desc": "STK ngân hàng không khớp tên KYC hoặc phát hiện dấu hiệu bất thường ➔ Từ chối lệnh, tự động hoàn trả số dư về ví và yêu cầu đối tác xác minh lại."
        },
        tech_highlights=[
            "Khóa bi quan SELECT FOR UPDATE chống Double-spending",
            "Tự động trích 10% thuế TNCN theo Luật Thuế Việt Nam",
            "Sổ cái tài chính Append-Only kiểm toán minh bạch"
        ]
    )

    # ==========================================
    # SLIDE 11: RECURRING & ON-DEMAND BACKGROUND JOBS
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "PHẦN 5 • TÁC VỤ NGẦM TỰ ĐỘNG", "Hệ Thống Tác Vụ Nền Tự Động (Background Jobs)", "Đảm bảo tính tự động hóa và ổn định vận hành không gián đoạn: Định kỳ (Cronjobs) và Theo sự kiện (Event-driven Queues)", 11)

    # 2 Big Cards: Recurring vs On-demand (Matching slide 17 & 18 of sample)
    # Left Card: Recurring Jobs
    rcard = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.75), Inches(5.35))
    rcard.fill.solid()
    rcard.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    rcard.line.color.rgb = COLOR_BRAND_BORDER
    rcard.line.width = Pt(1.5)

    r_badge = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.05), Inches(1.7), Inches(5.25), Inches(0.35))
    r_badge.fill.solid()
    r_badge.fill.fore_color.rgb = COLOR_BRAND_SOFT
    r_badge.line.color.rgb = COLOR_BRAND_BORDER
    p_rb = r_badge.text_frame.paragraphs[0]
    p_rb.text = "⏰ RECURRING BACKGROUND JOBS (ĐỊNH KỲ CRONJOB)"
    p_rb.font.size = Pt(10)
    p_rb.font.bold = True
    p_rb.font.color.rgb = COLOR_BRAND_STRONG
    p_rb.font.name = "Segoe UI"
    p_rb.alignment = PP_ALIGN.CENTER

    recurring_jobs = [
        ("1. ESCROW SETTLEMENT AUTO-UNLOCK JOB", "Tần suất: Quét mỗi giờ (0 * * * *)", "Tự động kiểm tra các đơn hàng đã giao thành công vượt mốc 14 ngày bảo chứng Escrow; tự động chuyển tiền từ Ví Chờ (Pending) sang Ví Khả Dụng (Available) để KOL có thể rút tiền."),
        ("2. SAMPLE REVIEW 14-DAY DEADLINE TRACKER", "Tần suất: Quét mỗi ngày lúc 08:00 (0 8 * * *)", "Đếm ngược chu kỳ 14 ngày nghiệm thu hàng mẫu; gửi thông báo nhắc nhở KOL nộp link video review vào ngày thứ 7, ngày thứ 12 và cảnh báo giới hạn cấp mẫu vào ngày thứ 14."),
        ("3. AFFILIATE COOKIE & TRAFFIC CLEANUP", "Tần suất: Quét định kỳ lúc 02:00 sáng hàng tuần", "Dọn dẹp các bản ghi Click Traffic quá hạn 30 ngày trong Redis và PostgreSQL nhằm giải phóng tài nguyên bộ nhớ đệm, duy trì tốc độ truy vấn tối ưu cho sàn."),
        ("4. FLASH SALE & COUPON EXPIRATION SWEEPER", "Tần suất: Quét mỗi 15 phút (*/15 * * * *)", "Tự động tắt các mã giảm giá và đợt khuyến mãi khi hết ngân sách sàn hoặc vượt quá ngày hết hạn hiệu lực, ngăn chặn việc sử dụng mã voucher hết hạn.")
    ]

    y_rj = 2.2
    for j_title, j_freq, j_desc in recurring_jobs:
        tb = s11.shapes.add_textbox(Inches(1.05), Inches(y_rj), Inches(5.25), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = j_title
        pt.font.size = Pt(10.5)
        pt.font.bold = True
        pt.font.color.rgb = COLOR_INK
        pt.font.name = "Segoe UI"

        pf = tf.add_paragraph()
        pf.text = j_freq
        pf.font.size = Pt(9)
        pf.font.bold = True
        pf.font.color.rgb = COLOR_BRAND_STRONG
        pf.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = j_desc
        pd.font.size = Pt(8.5)
        pd.font.color.rgb = COLOR_MUTED
        pd.font.name = "Segoe UI"
        y_rj += 1.15

    # Right Card: On-Demand Jobs
    ocard = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.78), Inches(1.5), Inches(5.75), Inches(5.35))
    ocard.fill.solid()
    ocard.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    ocard.line.color.rgb = COLOR_BRAND_BORDER
    ocard.line.width = Pt(1.5)

    o_badge = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.03), Inches(1.7), Inches(5.25), Inches(0.35))
    o_badge.fill.solid()
    o_badge.fill.fore_color.rgb = COLOR_SURFACE_SAND
    o_badge.line.color.rgb = COLOR_LINE
    p_ob = o_badge.text_frame.paragraphs[0]
    p_ob.text = "⚡ ON-DEMAND BACKGROUND JOBS (HÀNG ĐỢI SỰ KIỆN)"
    p_ob.font.size = Pt(10)
    p_ob.font.bold = True
    p_ob.font.color.rgb = COLOR_BRAND_DARK
    p_ob.font.name = "Segoe UI"
    p_ob.alignment = PP_ALIGN.CENTER

    ondemand_jobs = [
        ("1. ORDER CONFIRMATION EMAIL WORKER (BULLMQ)", "Kích hoạt: Ngay khi khách đặt hàng thành công", "Đẩy tác vụ vào hàng đợi BullMQ để gửi email hóa đơn điện tử kèm thông tin bưu kiện idempotent; đảm bảo không block luồng xử lý Checkout chính của người mua."),
        ("2. STOCK RESERVATION AUTO-REVERT (15 MINS)", "Kích hoạt: Khi đơn hàng ở trạng thái Chờ thanh toán VietQR", "Đặt đồng hồ đếm ngược 15 phút qua Redis Delayed Queue; nếu khách hàng không chuyển khoản, hệ thống tự động hoàn lại số lượng tồn kho cho sàn."),
        ("3. REALTIME LIVESTREAM DEAL PIN BROADCASTER", "Kích hoạt: Khi KOL ghim sản phẩm ưu đãi trong phiên Live", "Phát tán WebSocket Event đồng loạt tới hàng ngàn người xem trong phòng livestream dưới 50ms, đồng bộ deal ưu đãi chớp nhoáng trên màn hình khán giả."),
        ("4. FINANCIAL LEDGER AUDIT INTEGRITY CHECK", "Kích hoạt: Sau mỗi giao dịch nạp, rút hoặc đối soát đơn", "Tự động tính checksum toàn vẹn chuỗi dữ liệu trong Sổ cái bất biến (Append-Only Ledger), phát cảnh báo đỏ ngay lập tức nếu có bất kỳ sai lệch đối soát nào.")
    ]

    y_oj = 2.2
    for j_title, j_freq, j_desc in ondemand_jobs:
        tb = s11.shapes.add_textbox(Inches(7.03), Inches(y_oj), Inches(5.25), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = j_title
        pt.font.size = Pt(10.5)
        pt.font.bold = True
        pt.font.color.rgb = COLOR_INK
        pt.font.name = "Segoe UI"

        pf = tf.add_paragraph()
        pf.text = j_freq
        pf.font.size = Pt(9)
        pf.font.bold = True
        pf.font.color.rgb = COLOR_BRAND_STRONG
        pf.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = j_desc
        pd.font.size = Pt(8.5)
        pd.font.color.rgb = COLOR_MUTED
        pd.font.name = "Segoe UI"
        y_oj += 1.15

    # ==========================================
    # SLIDE 12: CONCLUSION & Q&A
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, COLOR_CANVAS)

    qa_card = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9))
    qa_card.fill.solid()
    qa_card.fill.fore_color.rgb = COLOR_SURFACE_WHITE
    qa_card.line.color.rgb = COLOR_BRAND_BORDER
    qa_card.line.width = Pt(1.5)

    ribbon12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(0.12))
    ribbon12.fill.solid()
    ribbon12.fill.fore_color.rgb = COLOR_BRAND
    ribbon12.line.fill.background()

    # Core Accomplishments Summary
    tbox_qa = s12.shapes.add_textbox(Inches(1.35), Inches(1.15), Inches(10.5), Inches(0.95))
    tf_qa = tbox_qa.text_frame
    p_qa1 = tf_qa.paragraphs[0]
    p_qa1.text = "TỔNG KẾT NỀN TẢNG SCANMS (REVIEW 2 READY)"
    p_qa1.font.size = Pt(18)
    p_qa1.font.bold = True
    p_qa1.font.color.rgb = COLOR_BRAND_STRONG
    p_qa1.font.name = "Segoe UI"

    p_qa2 = tf_qa.add_paragraph()
    p_qa2.text = "Hệ thống vận hành thực tế 100%, bảo toàn tài chính nghiêm ngặt và sẵn sàng ra Hội Đồng 1.1"
    p_qa2.font.size = Pt(12)
    p_qa2.font.color.rgb = COLOR_INK
    p_qa2.font.name = "Segoe UI"

    # 4 Highlights Boxes (Enhanced content & balanced layout)
    h_items = [
        ("100% WORKING SOFTWARE", [
            "Hệ sinh thái chạy thật 100% CSDL PostgreSQL, Redis, NestJS 11 & React 19.",
            "Tuyệt đối không sử dụng mock data, không nuốt lỗi API trong mọi controller.",
            "Độ bao phủ hơn 50+ bộ test suite thực tế (Real-DB Integration & Playwright)."
        ]),
        ("TOÀN VẸN TÀI CHÍNH", [
            "Khóa bi quan SELECT FOR UPDATE chặn đứng gian lận rút tiền đa luồng.",
            "Quỹ Escrow 14 ngày bảo chứng hoa hồng, giải thuật Clawback tự động hoàn tiền.",
            "Tự động khấu trừ 10% thuế TNCN theo quy định Luật Thuế Việt Nam."
        ]),
        ("KIẾN TRÚC MỞ RỘNG CAO", [
            "Kiến trúc Modular Monolith chuẩn hướng đối tượng chia tách ranh giới rõ ràng.",
            "Redis Sliding Window Rate Limit bảo vệ hệ thống chống DDoS & click tặc.",
            "BullMQ & Redis Streams xử lý hàng đợi tác vụ ngầm bất đồng bộ tin cậy."
        ]),
        ("TRẢI NGHIỆM ĐA ĐỐI TÁC", [
            "4 Cổng Portal phân quyền RBAC Guard: Khách mua, KOL, Chủ Shop và Admin.",
            "Quy trình hàng mẫu 14 ngày & đàm phán deal độc quyền realtime trong live chat.",
            "Tra cứu hành trình vận đơn GHN Express thời gian thực qua Webhook."
        ])
    ]

    for idx, (title, bullets) in enumerate(h_items):
        x_pos = Inches(1.35 + idx * 2.65)
        hc = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos, Inches(2.22), Inches(2.45), Inches(2.40))
        hc.fill.solid()
        hc.fill.fore_color.rgb = COLOR_SURFACE_SAND
        hc.line.color.rgb = COLOR_BRAND_BORDER if idx == 0 or idx == 1 else COLOR_LINE
        hc.line.width = Pt(1.5 if idx == 0 or idx == 1 else 1)

        tb = s12.shapes.add_textbox(x_pos + Inches(0.1), Inches(2.32), Inches(2.25), Inches(2.20))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.size = Pt(9.5)
        pt.font.bold = True
        pt.font.color.rgb = COLOR_BRAND_STRONG
        pt.font.name = "Segoe UI"
        pt.alignment = PP_ALIGN.CENTER

        for b in bullets:
            pd = tf.add_paragraph()
            pd.text = f"• {b}"
            pd.font.size = Pt(8.2)
            pd.font.color.rgb = COLOR_INK
            pd.font.name = "Segoe UI"

    # Thank you & Q&A Callout
    qa_banner = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.35), Inches(4.82), Inches(10.5), Inches(1.50))
    qa_banner.fill.solid()
    qa_banner.fill.fore_color.rgb = COLOR_BRAND_SOFT
    qa_banner.line.color.rgb = COLOR_BRAND_BORDER
    qa_banner.line.width = Pt(1.5)

    tb_bot = s12.shapes.add_textbox(Inches(1.5), Inches(4.92), Inches(10.2), Inches(1.30))
    tf_b = tb_bot.text_frame
    pb1 = tf_b.paragraphs[0]
    pb1.text = "CẢM ƠN THẦY CÔ HỘI ĐỒNG & GIẢNG VIÊN HƯỚNG DẪN ĐÃ LẮNG NGHE"
    pb1.font.size = Pt(15.5)
    pb1.font.bold = True
    pb1.font.color.rgb = COLOR_BRAND_DARK
    pb1.font.name = "Segoe UI"
    pb1.alignment = PP_ALIGN.CENTER

    pb2 = tf_b.add_paragraph()
    pb2.text = "NHÓM FA26SE032 SẴN SÀNG BƯỚC VÀO PHẦN DEMO TRỰC TIẾP & VẤN ĐÁP PHẢN BIỆN (Q&A)"
    pb2.font.size = Pt(11.5)
    pb2.font.bold = True
    pb2.font.color.rgb = COLOR_BRAND_STRONG
    pb2.font.name = "Segoe UI"
    pb2.alignment = PP_ALIGN.CENTER

    pb3 = tf_b.add_paragraph()
    pb3.text = "Supervisor: ThS. Tôn Thất Hoàng Minh (MinhTTH5) • Team Leader: Nguyễn Thành Thắng (SE184251)"
    pb3.font.size = Pt(9.5)
    pb3.font.color.rgb = COLOR_MUTED
    pb3.font.name = "Segoe UI"
    pb3.alignment = PP_ALIGN.CENTER

    # Save output
    output_dir = "docs/review 2"
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "SCANMS_Thuyet_Trinh_Review_2_Va_Hoi_Dong_1.1.pptx")
    prs.save(out_path)
    print(f"Presentation saved successfully to: {out_path}")
    return out_path

if __name__ == "__main__":
    create_presentation()
