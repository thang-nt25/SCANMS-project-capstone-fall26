import os
import math
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.util import Inches

OUTPUT_DIR = "scratch/generated_slides"
os.makedirs(OUTPUT_DIR, exist_ok=True)

W, H = 3000, 1688 # 16:9 300 DPI master resolution

# Load Fonts
try:
    font_hero = ImageFont.truetype("arialbd.ttf", 100)
    font_title = ImageFont.truetype("arialbd.ttf", 76)
    font_sub = ImageFont.truetype("arialbd.ttf", 44)
    font_actor = ImageFont.truetype("arialbd.ttf", 32)
    font_label = ImageFont.truetype("arialbd.ttf", 24)
    font_small = ImageFont.truetype("arial.ttf", 22)
    font_content_num = ImageFont.truetype("arialbd.ttf", 52)
    font_content_txt = ImageFont.truetype("arialbd.ttf", 38)
    font_card_title = ImageFont.truetype("arialbd.ttf", 24)
    font_card_sub = ImageFont.truetype("arialbd.ttf", 20)
    font_card_desc = ImageFont.truetype("arial.ttf", 18)
    font_badge = ImageFont.truetype("arialbd.ttf", 18)
except Exception:
    font_hero = font_title = font_sub = font_actor = font_label = font_small = font_content_num = font_content_txt = font_card_title = font_card_sub = font_card_desc = font_badge = ImageFont.load_default()

def draw_arrow(draw, start, end, label=None, label_pos=None, label_anchor="mm", width=4, head_len=18):
    x0, y0 = start
    x1, y1 = end
    draw.line([start, end], fill=(0, 0, 0), width=width)
    angle = math.atan2(y1 - y0, x1 - x0)
    tip = (x1, y1)
    p1 = (x1 - head_len * math.cos(angle - math.pi / 6), y1 - head_len * math.sin(angle - math.pi / 6))
    p2 = (x1 - head_len * math.cos(angle + math.pi / 6), y1 - head_len * math.sin(angle + math.pi / 6))
    draw.polygon([tip, p1, p2], fill=(0, 0, 0))
    if label:
        if label_pos is None:
            label_pos = ((x0 + x1) // 2, (y0 + y1) // 2 - 25)
        draw.text(label_pos, label, fill=(0, 0, 0), font=font_label, anchor=label_anchor)

def paste_icon(canvas, icon_path, center, size):
    im = Image.open(icon_path)
    im = im.resize(size, Image.Resampling.LANCZOS)
    cx, cy = center
    px = cx - size[0] // 2
    py = cy - size[1] // 2
    if im.mode == "RGBA":
        canvas.paste(im, (px, py), im)
    else:
        canvas.paste(im, (px, py))

# ==============================================================================
# SLIDE 1: TITLE SLIDE
# ==============================================================================
def make_slide_01():
    bg = Image.open("scratch/slide_assets/bg_title.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    # Title
    d.text((320, 520), "SCANMS", fill=(0, 0, 0), font=font_hero, anchor="lm")
    
    # Subtitle
    d.text((320, 660), "SALES COLLABORATOR & AFFILIATE\nNETWORK MANAGEMENT SYSTEM", fill=(30, 41, 59), font=font_sub, anchor="lm")
    
    # Metadata Block
    meta_y = 960
    d.line([(320, 880), (1200, 880)], fill=(203, 213, 225), width=3)
    
    d.text((320, meta_y), "CAPSTONE PROJECT DEFENSE  |  REVIEW 2", fill=(184, 142, 79), font=font_actor, anchor="lm")
    d.text((320, meta_y + 70), "Team: FA26SE032", fill=(100, 116, 139), font=font_actor, anchor="lm")
    d.text((320, meta_y + 130), "Team Leader: NGUYỄN THÀNH THẮNG", fill=(30, 41, 59), font=font_actor, anchor="lm")
    d.text((320, meta_y + 190), "Major: Software Engineering  |  FPT University", fill=(100, 116, 139), font=font_actor, anchor="lm")
    
    bg.save(f"{OUTPUT_DIR}/slide_01.png")
    print("Slide 01 generated.")

# ==============================================================================
# SLIDE 2: CONTENT SLIDE
# ==============================================================================
def make_slide_02():
    bg = Image.open("scratch/slide_assets/bg_content.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    items = [
        ("01", "OVERVIEW ARCHITECTURE"),
        ("02", "CORE TECHNOLOGIES & APPARATUS"),
        ("03", "CONCEPTUAL DATA MODEL"),
        ("04", "5 MAIN BUSINESS FLOWS"),
        ("05", "QUESTIONS & ANSWERS (Q & A)")
    ]
    
    start_y = 520
    spacing = 180
    
    for i, (num, text) in enumerate(items):
        y = start_y + i * spacing
        # Number in bold purple/blue
        d.text((320, y), num, fill=(79, 70, 229), font=font_content_num, anchor="lm")
        # Line divider
        d.line([(420, y - 25), (420, y + 25)], fill=(203, 213, 225), width=3)
        # Content title
        d.text((460, y), text, fill=(30, 41, 59), font=font_content_txt, anchor="lm")
        
    bg.save(f"{OUTPUT_DIR}/slide_02.png")
    print("Slide 02 generated.")

# ==============================================================================
# SLIDE 3: TECHNOLOGIES & APPS (Slide 6 PCDACO style)
# ==============================================================================
def make_slide_03():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    # Left brand title
    d.text((450, 840), "SCANMS", fill=(0, 0, 0), font=font_hero, anchor="mm")
    d.text((450, 930), "MULTI-PORTAL PLATFORM", fill=(100, 116, 139), font=font_actor, anchor="mm")
    
    # 4 App Cards on the right
    apps = [
        ("CUSTOMER WEB APP", "Storefront Marketplace, Live Shopping, Strict Buyer Auth & VietQR", "scratch/flow_icons/icon_cart.png"),
        ("COLLABORATOR PORTAL", "Affiliate Smart Links, Media Hub, Performance & Exclusive Deals", "scratch/flow_icons/icon_link.png"),
        ("SHOP MANAGER PORTAL", "6-Block Product Matrix, Deal Negotiation, Order & GHN Delivery", "scratch/flow_icons/icon_product_box.png"),
        ("SYSTEM ADMIN & MANAGER CONSOLE", "Platform Moderation, Multi-Tier KYC, User RBAC & Napas Payouts", "scratch/flow_icons/avatar_pristine.png")
    ]
    
    card_x = 1050
    start_y = 360
    card_w = 1750
    card_h = 240
    spacing = 290
    
    for i, (title, desc, icon_path) in enumerate(apps):
        cy = start_y + i * spacing
        top_y = cy - card_h // 2
        bottom_y = cy + card_h // 2
        
        # Soft shadow box
        d.rounded_rectangle([(card_x + 6, top_y + 6), (card_x + card_w + 6, bottom_y + 6)], radius=24, fill=(241, 245, 249))
        # White card
        d.rounded_rectangle([(card_x, top_y), (card_x + card_w, bottom_y)], radius=24, fill=(255, 255, 255), outline=(226, 232, 240), width=3)
        
        # Icon
        paste_icon(bg, icon_path, (card_x + 130, cy), (150, 150))
        
        # Text
        d.text((card_x + 250, cy - 30), title, fill=(0, 0, 0), font=font_sub, anchor="lm")
        d.text((card_x + 250, cy + 30), desc, fill=(100, 116, 139), font=font_label, anchor="lm")
        
    bg.save(f"{OUTPUT_DIR}/slide_03.png")
    print("Slide 03 generated.")

# ==============================================================================
# SLIDE 4: SYSTEM ARCHITECTURAL OVERVIEW
# ==============================================================================
def make_slide_04():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 170), "SYSTEM ARCHITECTURAL OVERVIEW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((W // 2, 240), "MULTI-TIER ARCHITECTURE WITH DISTRIBUTED SERVICES & INTEGRATIONS", fill=(100, 116, 139), font=font_actor, anchor="mm")
    
    # Embed Architecture Image
    arch_im = Image.open("docs/review 2/SCANMS_OVERVIEW_ARCHITECTURE.png")
    # Resize to fit area max width 2700, max height 1300
    arch_im.thumbnail((2750, 1340), Image.Resampling.LANCZOS)
    paste_x = (W - arch_im.width) // 2
    paste_y = 290 + (1340 - arch_im.height) // 2
    bg.paste(arch_im, (paste_x, paste_y))
    
    bg.save(f"{OUTPUT_DIR}/slide_04.png")
    print("Slide 04 generated.")

# ==============================================================================
# SLIDE 5: CONCEPTUAL DATA MODEL
# ==============================================================================
def make_slide_05():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 170), "CONCEPTUAL DATA MODEL", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((W // 2, 240), "CORE BUSINESS DOMAINS & CHEN NOTATION CARDINALITIES", fill=(100, 116, 139), font=font_actor, anchor="mm")
    
    erd_im = Image.open("docs/review 2/SCANMS_ERD_01_Conceptual.png")
    erd_im.thumbnail((2750, 1340), Image.Resampling.LANCZOS)
    paste_x = (W - erd_im.width) // 2
    paste_y = 290 + (1340 - erd_im.height) // 2
    bg.paste(erd_im, (paste_x, paste_y))
    
    bg.save(f"{OUTPUT_DIR}/slide_05.png")
    print("Slide 05 generated.")

# ==============================================================================
# SLIDE 6: ACTORS & ROLES (Slide 10 PCDACO style)
# ==============================================================================
def make_slide_06():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 260), "SCANMS ACTORS & ROLES", fill=(0, 0, 0), font=font_hero, anchor="mm")
    d.text((W // 2, 360), "5 STANDARDIZED ROLES IN MULTI-MERCHANT & AFFILIATE NETWORK", fill=(100, 116, 139), font=font_sub, anchor="mm")
    
    actors = [
        ("CUSTOMER", "Shopper & End Buyer"),
        ("COLLABORATOR", "KOL / KOC Affiliate"),
        ("SHOP MANAGER", "Merchant & Store Owner"),
        ("SYSTEM MANAGER", "Operations & Moderator"),
        ("SYSTEM ADMIN", "Super Admin Governance")
    ]
    
    spacing = 500
    start_x = (W - (len(actors) - 1) * spacing) // 2
    cy = 760
    
    for i, (name, role) in enumerate(actors):
        cx = start_x + i * spacing
        paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (cx, cy), (240, 240))
        d.text((cx, cy + 160), name, fill=(0, 0, 0), font=font_actor, anchor="mm")
        d.text((cx, cy + 210), role, fill=(100, 116, 139), font=font_small, anchor="mm")
        
    # RBAC Architecture Card below
    card_x0, card_y0 = 360, 1070
    card_x1, card_y1 = 2640, 1460
    # Soft shadow
    d.rounded_rectangle([(card_x0 + 4, card_y0 + 4), (card_x1 + 4, card_y1 + 4)], radius=20, fill=(241, 245, 249))
    # Card surface
    d.rounded_rectangle([(card_x0, card_y0), (card_x1, card_y1)], radius=20, fill=(255, 255, 255), outline=(226, 232, 240), width=3)
    
    # Title badge
    d.text((W // 2, card_y0 + 45), "ROLE-BASED ACCESS CONTROL (RBAC) & OPERATIONAL DELEGATION", fill=(79, 70, 229), font=font_card_title, anchor="mm")
    d.line([(card_x0 + 60, card_y0 + 85), (card_x1 - 60, card_y0 + 85)], fill=(226, 232, 240), width=2)
    
    # Left column: SYSTEM MANAGER
    d.text((card_x0 + 80, card_y0 + 125), "• SYSTEM MANAGER (Operational Specialist):", fill=(0, 0, 0), font=font_card_title, anchor="lm")
    d.text((card_x0 + 80, card_y0 + 175), "   Handles daily KYC reviews, product catalog moderation, return disputes & commission payout audits.", fill=(100, 116, 139), font=font_small, anchor="lm")
    
    # Right column: SYSTEM ADMIN
    d.text((card_x0 + 80, card_y0 + 245), "• SYSTEM ADMIN (Super Administrator):", fill=(0, 0, 0), font=font_card_title, anchor="lm")
    d.text((card_x0 + 80, card_y0 + 295), "   Inherits 100% of System Manager powers + EXCLUSIVE User RBAC (/admin/users) & GMV Analytics (/admin/analytics).", fill=(184, 142, 79), font=font_small, anchor="lm")
    
    bg.save(f"{OUTPUT_DIR}/slide_06.png")
    print("Slide 06 generated.")

# ==============================================================================
# SLIDE 7: FLOW 1: USER REGISTER & KYC VERIFICATION
# ==============================================================================
def make_slide_07():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 210), "MAIN FLOW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((250, 390), "FLOW 1: USER REGISTER & KYC VERIFICATION", fill=(0, 0, 0), font=font_sub, anchor="lm")
    
    # Left Actor: COLLABORATOR / SHOP
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (320, 800), (240, 240))
    d.text((320, 960), "COLLABORATOR / SHOP", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # Arrow 1: ENTER INFORMATION
    draw_arrow(d, (480, 800), (840, 800), "ENTER INFORMATION", (660, 760))
    
    # Icon 1: Form checklist
    paste_icon(bg, "scratch/flow_icons/form_checklist_clean.png", (960, 785), (220, 220))
    
    # Arrow 2: VERIFY 2FA / OTP
    draw_arrow(d, (1080, 800), (1360, 800), "VERIFY 2FA / OTP", (1220, 760))
    
    # Icon 2: Phone OTP
    paste_icon(bg, "scratch/flow_icons/phone_otp_clean.png", (1460, 785), (170, 190))
    
    # Arrow 3: UPLOAD DOSSIER
    draw_arrow(d, (1560, 800), (1910, 800), "UPLOAD DOSSIER", (1735, 760))
    
    # Icon 3: Citizen ID Card / Business License
    paste_icon(bg, "scratch/flow_icons/id_card_clean.png", (2040, 790), (220, 140))
    d.text((2040, 900), "CCCD + STK / MST + LICENSE", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # Arrow 4: SUBMIT KYC
    draw_arrow(d, (2170, 800), (2430, 800), "SUBMIT KYC", (2300, 760))
    
    # Icon 4: Folder Upload
    paste_icon(bg, "scratch/flow_icons/folder_clean.png", (2520, 800), (160, 180))
    
    # Actor: SYSTEM MANAGER (Top Right)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (2520, 340), (240, 240))
    d.text((2240, 340), "SYSTEM MANAGER", fill=(0, 0, 0), font=font_actor, anchor="rm")
    
    # Arrow down from SYSTEM MANAGER to Folder
    draw_arrow(d, (2520, 480), (2520, 700), "AUDIT KYC DOSSIER", (2660, 590), label_anchor="lm")
    
    # Branch 1: APPROVE (Right and Down)
    d.line([(2620, 800), (2750, 800), (2750, 1240)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2750, 1230), (2750, 1260), head_len=18)
    d.text((2770, 880), "APPROVE", fill=(0, 0, 0), font=font_label, anchor="lm")
    paste_icon(bg, "scratch/extracted_elements/icon_approve_check.png", (2750, 1370), (200, 200))
    d.text((2750, 1500), "ACTIVE ROLE ACCOUNT", fill=(5, 150, 105), font=font_actor, anchor="mm")
    
    # Branch 2: REJECT (Down and Left)
    d.line([(2480, 890), (2480, 1220), (2160, 1220)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2170, 1220), (2140, 1220), head_len=18)
    d.text((2320, 1180), "REJECT", fill=(0, 0, 0), font=font_label, anchor="mm")
    paste_icon(bg, "scratch/extracted_elements/icon_reject_x.png", (2040, 1220), (190, 190))
    
    # Arrow up from Red X to Citizen ID Card
    draw_arrow(d, (2040, 1120), (2040, 940), "RE-SUBMIT WITH REASON", (1880, 1020), label_anchor="rm")
    
    bg.save(f"{OUTPUT_DIR}/slide_07.png")
    print("Slide 07 generated.")

# ==============================================================================
# SLIDE 8: FLOW 2: 2-WAY COMMISSION NEGOTIATION & MULTI-RULE ENGINE
# ==============================================================================
def make_slide_08():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 140), "MAIN FLOW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((W // 2, 220), "FLOW 2: 2-WAY COMMISSION DEAL NEGOTIATION & MULTI-RULE ENGINE", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # -------------------------------------------------------------------------
    # ACTORS (Left Column)
    # -------------------------------------------------------------------------
    # Actor 1: COLLABORATOR (Top Left)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (300, 500), (220, 220))
    d.text((300, 630), "COLLABORATOR", fill=(0, 0, 0), font=font_actor, anchor="mm")
    d.text((300, 670), "(KOL / KOC Affiliate)", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Actor 2: SHOP MANAGER (Bottom Left)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (300, 1100), (220, 220))
    d.text((300, 1230), "SHOP MANAGER", fill=(0, 0, 0), font=font_actor, anchor="mm")
    d.text((300, 1270), "(Merchant Store Owner)", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 1: BASELINE FLOOR OFFER (Shop Manager -> Product)
    # -------------------------------------------------------------------------
    draw_arrow(d, (430, 1100), (690, 1100), "PUBLISH PRODUCT", (560, 1060))
    paste_icon(bg, "scratch/flow_icons/icon_product_box.png", (790, 1100), (170, 170))
    d.text((790, 1205), "BASE 10% FLOOR RATE", fill=(184, 142, 79), font=font_badge, anchor="mm")
    d.text((790, 1235), "(Standard Open Offer)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # Clean orthogonal line from Product up to Collaborator: DISCOVER PRODUCT (Clear of avatar)
    d.line([(790, 1000), (790, 740), (510, 740), (510, 640)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (510, 650), (510, 630), "DISCOVER PRODUCT", (650, 705), label_anchor="mm", head_len=18)
    
    # -------------------------------------------------------------------------
    # STEP 2: KOL DEAL PROPOSAL (KOL -> Proposal Handshake)
    # -------------------------------------------------------------------------
    draw_arrow(d, (430, 500), (860, 500), "PROPOSE 18% VIP RATE", (645, 460))
    paste_icon(bg, "scratch/flow_icons/icon_handshake.png", (960, 500), (160, 160))
    d.text((960, 605), "PROPOSAL & COMMITMENT", fill=(0, 0, 0), font=font_badge, anchor="mm")
    d.text((960, 635), "(Video Quota & GMV Target)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 3: 2-WAY NEGOTIATION & CONTRACT (Center Node)
    # Route vertical wires at x = 1210 so they NEVER intersect the Contract Title
    # -------------------------------------------------------------------------
    # Arrow from Handshake into Contract from upper-left
    d.line([(1040, 500), (1210, 500), (1210, 770)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (1210, 770), (1310, 770), head_len=18)
    d.text((1125, 460), "DEAL AGREED", fill=(0, 0, 0), font=font_label, anchor="mm")
    
    # Arrow from Shop into Contract from lower-left
    d.line([(890, 1100), (1210, 1100), (1210, 830)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (1210, 830), (1310, 830), head_len=18)
    d.text((1050, 1060), "SHOP DEAL INVITE", fill=(0, 0, 0), font=font_label, anchor="mm")
    
    # Contract Icon (Center)
    paste_icon(bg, "scratch/flow_icons/icon_deal_contract.png", (1420, 800), (190, 200))
    d.text((1420, 650), "EXCLUSIVE DEAL CONTRACT", fill=(0, 0, 0), font=font_card_title, anchor="mm")
    d.text((1420, 685), "(FR-27 2-WAY NEGOTIATION)", fill=(184, 142, 79), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 4: DECISION BRANCHES (Reject / Approve)
    # -------------------------------------------------------------------------
    # Branch 1: REJECT (Route vertical wire at 1620, label at 1750 with 60px margin)
    d.line([(1530, 840), (1620, 840), (1620, 1140), (1860, 1140)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (1850, 1140), (1880, 1140), "REJECT DEAL", (1750, 1100), label_anchor="mm", head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_reject_x.png", (1970, 1140), (160, 160))
    d.text((1970, 1250), "FALLBACK TO FLOOR RATE", fill=(220, 38, 38), font=font_actor, anchor="mm")
    d.text((1970, 1290), "Maintains 10% Base Open Offer", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Branch 2: APPROVE (Straight Right to Green Check)
    draw_arrow(d, (1530, 780), (1870, 780), "APPROVE VIP DEAL", (1700, 740), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_approve_check.png", (1970, 780), (170, 170))
    d.text((1970, 670), "DEAL ACCEPTED (18% VIP)", fill=(5, 150, 105), font=font_actor, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 5: AUTOMATED TIER MULTIPLIER (System Engine Auto-Stack)
    # -------------------------------------------------------------------------
    draw_arrow(d, (2080, 780), (2260, 780), "AUTO-STACK", (2170, 740), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_tier_stack.png", (2360, 780), (170, 170))
    d.text((2360, 895), "TIER RANK BOOST", fill=(184, 142, 79), font=font_badge, anchor="mm")
    d.text((2360, 925), "(Silver +1% | Gold +2% | Diamond +3%)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 6: ASSETS ISSUED & SAMPLE DISPATCH
    # -------------------------------------------------------------------------
    draw_arrow(d, (2460, 780), (2630, 780), "ACTIVATE", (2545, 740), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_link.png", (2730, 780), (160, 160))
    d.text((2730, 895), "EXCLUSIVE ASSETS ISSUED", fill=(0, 0, 0), font=font_badge, anchor="mm")
    d.text((2730, 925), "• Custom Voucher Code (FR-12)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    d.text((2730, 955), "• Free Sample Dispatched (FR-14)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # BOTTOM FORMULA BANNER
    # -------------------------------------------------------------------------
    bx0, by0, bx1, by1 = 250, 1420, 2750, 1530
    d.rounded_rectangle([(bx0 + 4, by0 + 4), (bx1 + 4, by1 + 4)], radius=18, fill=(241, 245, 249))
    d.rounded_rectangle([(bx0, by0), (bx1, by1)], radius=18, fill=(251, 245, 235), outline=(238, 223, 198), width=2)
    
    d.text((W // 2, by0 + 40), "FORMULA: Final Commission = min(25%, Base Rate 10% + Deal Rate + Tier Rank Bonus + Live Session Bonus)", fill=(184, 142, 79), font=font_card_title, anchor="mm")
    d.text((W // 2, by0 + 80), "Additive Commission Engine strictly enforces 25% Platform Ceiling  |  Monthly Volume Targets (FR-09) Awarded Separately", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    bg.save(f"{OUTPUT_DIR}/slide_08.png")
    print("Slide 08 generated.")

# ==============================================================================
# SLIDE 9: FLOW 3: MULTI-CHANNEL AFFILIATE PROMOTION & CHECKOUT
# ==============================================================================
def make_slide_09():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 140), "MAIN FLOW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((W // 2, 220), "FLOW 3: MULTI-CHANNEL AFFILIATE PROMOTION & BUYER CHECKOUT", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # -------------------------------------------------------------------------
    # ACTORS (Left Column)
    # -------------------------------------------------------------------------
    # Actor 1: COLLABORATOR (Top Left)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (300, 480), (220, 220))
    d.text((300, 610), "COLLABORATOR", fill=(0, 0, 0), font=font_actor, anchor="mm")
    d.text((300, 650), "(KOL / KOC Affiliate)", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Actor 2: CUSTOMER (Bottom Left)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (300, 1120), (220, 220))
    d.text((300, 1250), "CUSTOMER", fill=(0, 0, 0), font=font_actor, anchor="mm")
    d.text((300, 1290), "(Marketplace Shopper)", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # -------------------------------------------------------------------------
    # CHANNEL 1: STATIC CONTENT & BIO LINK (Upper Lane, y = 480)
    # -------------------------------------------------------------------------
    draw_arrow(d, (430, 480), (620, 480), "CREATE ATTRIBUTION", (525, 440))
    paste_icon(bg, "scratch/flow_icons/icon_link.png", (710, 480), (160, 160))
    d.text((710, 580), "SMART LINK & QR (FR-10, 11)", fill=(0, 0, 0), font=font_badge, anchor="mm")
    d.text((710, 610), "Bio Link | Video Review | Coupon", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # CHANNEL 2: INTERACTIVE LIVESTREAM SHOPPING (Middle Lane, y = 780)
    # Originates from right edge of Collaborator at (430, 520) - ZERO OVERLAP with avatar text!
    # -------------------------------------------------------------------------
    d.line([(430, 520), (450, 520), (450, 780), (610, 780)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (600, 780), (625, 780), "HOST LIVE (FR-15)", (535, 740), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_livestream.png", (710, 780), (170, 170))
    d.text((710, 880), "LIVESTREAM SHOPPING", fill=(220, 38, 38), font=font_badge, anchor="mm")
    d.text((710, 910), "Real-time Deal Pin (+3% Live Bonus)", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # CUSTOMER TRAFFIC CONVERGENCE AT JUNCTION (x = 1060)
    # -------------------------------------------------------------------------
    # From Channel 1 -> Junction (Length 260px, label 200px, 30px margins):
    d.line([(800, 480), (1060, 480), (1060, 880)], fill=(0, 0, 0), width=4)
    d.text((930, 440), "CLICK SMART LINK", fill=(0, 0, 0), font=font_label, anchor="mm")
    
    # From Channel 2 -> Junction (Length 260px, label 190px, 35px margins):
    d.line([(800, 780), (1060, 780), (1060, 880)], fill=(0, 0, 0), width=4)
    d.text((930, 740), "PIN LIVE DEALS", fill=(0, 0, 0), font=font_label, anchor="mm")
    
    # From Customer -> Junction:
    d.line([(430, 1120), (1060, 1120), (1060, 880)], fill=(0, 0, 0), width=4)
    d.text((745, 1080), "DISCOVER & BROWSE", fill=(0, 0, 0), font=font_label, anchor="mm")
    
    # Single unified Arrow into Cart (Plenty of length, zero vertical line overlap):
    draw_arrow(d, (1060, 880), (1265, 880), "ADD TO CART", (1160, 840), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_cart.png", (1360, 880), (170, 170))
    d.text((1360, 985), "MARKETPLACE CART", fill=(0, 0, 0), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 3: STRICT AUTHENTICATION (No Guest Checkout, Cart Preserved)
    # -------------------------------------------------------------------------
    draw_arrow(d, (1455, 880), (1630, 880), "SECURE CHECKOUT", (1545, 840), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_lock_auth.png", (1720, 880), (160, 160))
    d.text((1720, 985), "STRICT BUYER AUTH", fill=(184, 142, 79), font=font_badge, anchor="mm")
    d.text((1720, 1015), "Popup Login / 100% Cart Preserved", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 4: VIETQR / PAYOS PAYMENT
    # -------------------------------------------------------------------------
    draw_arrow(d, (1810, 880), (1960, 880), "PAY VIETQR", (1885, 840), head_len=18)
    paste_icon(bg, "scratch/flow_icons/icon_qr_payment.png", (2040, 880), (150, 160))
    d.text((2040, 985), "VIETQR / PAYOS", fill=(0, 0, 0), font=font_badge, anchor="mm")
    d.text((2040, 1015), "Instant Napas 24/7 Gateway", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 5: PAYMENT GATEWAY WEBHOOK (Monitor at 2430, Label ABOVE at 770)
    # -------------------------------------------------------------------------
    draw_arrow(d, (2125, 880), (2340, 880), "WEBHOOK VERIFY", (2230, 840), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_system_monitor.png", (2430, 880), (160, 160))
    d.text((2430, 770), "PAYMENT GATEWAY", fill=(100, 116, 139), font=font_badge, anchor="mm")
    
    # -------------------------------------------------------------------------
    # STEP 6: BRANCHES (Failed / Success)
    # Branch 1: FAILED / EXPIRED (Originates below monitor at 2430, 960 with NO text overlap!)
    # -------------------------------------------------------------------------
    d.line([(2430, 960), (2430, 1220), (2180, 1220)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2180, 1220), (2150, 1220), "PAYMENT FAILED", (2290, 1180), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_reject_x.png", (2050, 1220), (150, 150))
    d.text((2050, 1320), "CANCEL ORDER", fill=(220, 38, 38), font=font_actor, anchor="mm")
    d.text((2050, 1360), "Restore Product Stock", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Branch 2: SUCCESS (Right & Down to Green Check with generous clearance)
    d.line([(2510, 880), (2740, 880)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2510, 880), (2740, 880), "PAID CONFIRMED", (2625, 840), head_len=18)
    d.line([(2740, 880), (2740, 1130)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2740, 1120), (2740, 1140), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_approve_check.png", (2740, 1220), (160, 160))
    d.text((2740, 1320), "CREATE ORDER & ATTRIBUTE", fill=(5, 150, 105), font=font_actor, anchor="mm")
    d.text((2740, 1360), "Escrow Held in KOL Wallet & Shop Dispatched", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # -------------------------------------------------------------------------
    # BOTTOM ATTRIBUTION BANNER
    # -------------------------------------------------------------------------
    bx0, by0, bx1, by1 = 250, 1450, 2750, 1540
    d.rounded_rectangle([(bx0 + 4, by0 + 4), (bx1 + 4, by1 + 4)], radius=18, fill=(241, 245, 249))
    d.rounded_rectangle([(bx0, by0), (bx1, by1)], radius=18, fill=(251, 245, 235), outline=(238, 223, 198), width=2)
    
    d.text((W // 2, by0 + 45), "ATTRIBUTION GOVERNANCE: Cookie 30-Day Window  |  Live Session Priority Attribution  |  Strict Fraud Sentinel Tracking", fill=(184, 142, 79), font=font_card_title, anchor="mm")
    
    bg.save(f"{OUTPUT_DIR}/slide_09.png")
    print("Slide 09 generated.")

# ==============================================================================
# SLIDE 10: FLOW 4: FULFILLMENT, ESCROW & REFUND DISPUTE
# ==============================================================================
def make_slide_10():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 210), "MAIN FLOW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((250, 390), "FLOW 4: FULFILLMENT, 14-DAY ESCROW & DISPUTE RESOLUTION", fill=(0, 0, 0), font=font_sub, anchor="lm")
    
    # Left Actor: SHOP MANAGER
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (320, 800), (240, 240))
    d.text((320, 960), "SHOP MANAGER", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # Arrow 1: CREATE GHN SHIPMENT
    draw_arrow(d, (460, 800), (840, 800), "CREATE GHN SHIPMENT", (650, 760))
    
    # Icon 1: Delivery Truck
    paste_icon(bg, "scratch/flow_icons/icon_truck.png", (960, 800), (220, 200))
    
    # Arrow 2: DELIVER TO CUSTOMER
    draw_arrow(d, (1080, 800), (1400, 800), "DELIVER PARCEL", (1240, 760))
    
    # Middle Actor: CUSTOMER
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (1520, 800), (240, 240))
    d.text((1520, 960), "CUSTOMER", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # --- Top Branch: HAPPY PATH (Escrow 14-day hold, wire turns at 1720 with zero overlap) ---
    d.line([(1650, 750), (1720, 750), (1720, 560), (2020, 560)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2000, 560), (2030, 560), "HOLD 14-DAY ESCROW", (1875, 520), label_anchor="mm", head_len=18)
    
    # Icon: Timer Escrow 14D
    paste_icon(bg, "scratch/flow_icons/icon_timer_escrow.png", (2140, 560), (180, 180))
    
    # Arrow to Complete
    draw_arrow(d, (2240, 560), (2550, 560), "14-DAY MATURED", (2395, 520))
    paste_icon(bg, "scratch/extracted_elements/icon_approve_check.png", (2660, 560), (190, 190))
    d.text((2660, 680), "ORDER COMPLETED & RELEASE FUNDS", fill=(5, 150, 105), font=font_actor, anchor="mm")
    
    # --- Bottom Branch: DISPUTE PATH (wire turns at 1720 with zero overlap) ---
    d.line([(1650, 850), (1720, 850), (1720, 1140), (1970, 1140)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (1960, 1140), (1990, 1140), "OPEN DISPUTE", (1855, 1100), label_anchor="mm", head_len=18)
    
    # Icon: Video Proof
    paste_icon(bg, "scratch/flow_icons/icon_video_dispute.png", (2080, 1140), (180, 180))
    
    # Arrow to System Manager Mediation
    draw_arrow(d, (2180, 1140), (2550, 1140), "SYSTEM MANAGER MEDIATION", (2365, 1100))
    paste_icon(bg, "scratch/extracted_elements/icon_reject_x.png", (2660, 1140), (180, 180))
    d.text((2660, 1260), "REFUND BUYER & CLAWBACK", fill=(220, 38, 38), font=font_actor, anchor="mm")
    
    bg.save(f"{OUTPUT_DIR}/slide_10.png")
    print("Slide 10 generated.")

# ==============================================================================
# SLIDE 11: FLOW 5: COMMISSION PAYOUT & NAPAS 24/7 TRANSFER
# ==============================================================================
def make_slide_11():
    bg = Image.open("scratch/slide_assets/bg_master.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 210), "MAIN FLOW", fill=(0, 0, 0), font=font_title, anchor="mm")
    d.text((250, 390), "FLOW 5: COMMISSION SETTLEMENT & NAPAS 24/7 TRANSFER", fill=(0, 0, 0), font=font_sub, anchor="lm")
    
    # Left Trigger: Cronjob & Escrow Wallet
    paste_icon(bg, "scratch/extracted_elements/icon_system_monitor.png", (320, 560), (200, 200))
    d.text((320, 680), "AUTOMATED CRONJOB", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Arrow down: MATURE FUNDS
    draw_arrow(d, (320, 710), (320, 830), "MATURE ESCROW FUNDS", (480, 770), label_anchor="lm")
    
    # Actor: COLLABORATOR
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (320, 960), (220, 220))
    d.text((320, 1100), "COLLABORATOR", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # Arrow: REQUEST WITHDRAWAL
    draw_arrow(d, (450, 960), (840, 960), "REQUEST WITHDRAWAL", (645, 920))
    
    # Icon: Clipboard Payout
    paste_icon(bg, "scratch/extracted_elements/icon_clipboard.png", (950, 960), (190, 200))
    
    # Actor: SYSTEM MANAGER (Bottom)
    paste_icon(bg, "scratch/flow_icons/avatar_pristine.png", (950, 1340), (200, 200))
    d.text((950, 1460), "SYSTEM MANAGER", fill=(0, 0, 0), font=font_actor, anchor="mm")
    
    # Arrow up from System Manager to Clipboard: VERIFY & DEDUCT 10% PIT
    draw_arrow(d, (950, 1220), (950, 1080), "AUDIT & DEDUCT 10% PIT TAX", (1160, 1150), label_anchor="lm")
    
    # Arrow from Clipboard: DISPATCH NAPAS 24/7
    draw_arrow(d, (1060, 960), (1450, 960), "DISPATCH NAPAS 24/7", (1255, 920))
    
    # Icon: Money Cash & Coins
    paste_icon(bg, "scratch/flow_icons/icon_cash_clean.png", (1580, 960), (220, 220))
    d.text((1580, 1090), "NAPAS 24/7 GATEWAY", fill=(100, 116, 139), font=font_small, anchor="mm")
    
    # Branches from Cash Transfer:
    # 1. SUCCESS
    d.line([(1700, 960), (2050, 960), (2050, 800), (2300, 800)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2290, 800), (2320, 800), "SUCCESS", (2150, 760), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_approve_check.png", (2440, 800), (190, 190))
    d.text((2440, 920), "BANK ACCOUNT CREDITED", fill=(5, 150, 105), font=font_actor, anchor="mm")
    
    # 2. FAILED
    d.line([(1700, 960), (2050, 960), (2050, 1180), (2300, 1180)], fill=(0, 0, 0), width=4)
    draw_arrow(d, (2290, 1180), (2320, 1180), "FAILED", (2150, 1140), head_len=18)
    paste_icon(bg, "scratch/extracted_elements/icon_reject_x.png", (2440, 1180), (180, 180))
    d.text((2440, 1300), "RESTORE WALLET (PESSIMISTIC LOCK)", fill=(220, 38, 38), font=font_actor, anchor="mm")
    
    bg.save(f"{OUTPUT_DIR}/slide_11.png")
    print("Slide 11 generated.")

# ==============================================================================
# SLIDE 12: THANK YOU & Q&A
# ==============================================================================
def make_slide_12():
    bg = Image.open("scratch/slide_assets/bg_thanks.png").convert("RGB")
    d = ImageDraw.Draw(bg)
    
    d.text((W // 2, 700), "THANK YOU FOR LISTENING", fill=(0, 0, 0), font=font_hero, anchor="mm")
    d.text((W // 2, 850), "Q & A", fill=(79, 70, 229), font=font_hero, anchor="mm")
    d.text((W // 2, 980), "Sales Collaborator & Affiliate Network Management System (SCANMS)", fill=(100, 116, 139), font=font_actor, anchor="mm")
    
    bg.save(f"{OUTPUT_DIR}/slide_12.png")
    print("Slide 12 generated.")

# ==============================================================================
# ASSEMBLE POWERPOINT PRESENTATION
# ==============================================================================
def assemble_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]
    
    slide_files = [f"{OUTPUT_DIR}/slide_{i:02d}.png" for i in range(1, 13)]
    
    for sf in slide_files:
        slide = prs.slides.add_slide(blank_layout)
        slide.shapes.add_picture(sf, 0, 0, width=prs.slide_width, height=prs.slide_height)
        
    out_path = "docs/review 2/SCANMS_Thuyet_Trinh_Review_2_Va_Hoi_Dong.pptx"
    prs.save(out_path)
    print(f"Presentation saved to: {out_path}")

if __name__ == "__main__":
    make_slide_01()
    make_slide_02()
    make_slide_03()
    make_slide_04()
    make_slide_05()
    make_slide_06()
    make_slide_07()
    make_slide_08()
    make_slide_09()
    make_slide_10()
    make_slide_11()
    make_slide_12()
    assemble_pptx()
