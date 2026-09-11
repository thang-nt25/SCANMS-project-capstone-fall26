# INFLUXNET / SCANMS — UI/UX DESIGN SYSTEM & SCREEN SPECIFICATIONS
## Enterprise E-Commerce Affiliate & Collaborator Management Platform
> **Document Version:** 2.0.0 (Dual-Platform: Desktop PC + Mobile-First Hybrid)  
> **Target Audience:** UI/UX Designers (Figma, Sketch, Adobe XD, Stitch, v0.dev) & Frontend Engineers  
> **Official Project Code:** FA26SE032  

---

# TABLE OF CONTENTS
1. [EXECUTIVE DESIGN PHILOSOPHY & DUAL-PLATFORM STRATEGY](#1-executive-design-philosophy--dual-platform-strategy)
2. [DESIGN SYSTEM & ATOMIC TOKENS](#2-design-system--atomic-tokens)
   - [2.1 Color Palette](#21-color-palette)
   - [2.2 Typography Scale](#22-typography-scale)
   - [2.3 Elevation, Shadows & Glassmorphism](#23-elevation-shadows--glassmorphism)
   - [2.4 Border Radius & Spacing Scale (4pt Grid)](#24-border-radius--spacing-scale-4pt-grid)
3. [RESPONSIVE LAYOUT & NAVIGATION ARCHITECTURE](#3-responsive-layout--navigation-architecture)
4. [COMPLETE SCREEN-BY-SCREEN SPECIFICATIONS (19 MASTER SCREENS)](#4-complete-screen-by-screen-specifications-19-master-screens)
   - [MODULE A: Authentication & Security (Screens 01-03)](#module-a-authentication--security-screens-01-03)
   - [MODULE B: Collaborator & KOL Mobile-First Workspace (Screens 04-09)](#module-b-collaborator--kol-mobile-first-workspace-screens-04-09)
   - [MODULE C: Shop Manager & Merchant Desktop Portal (Screens 10-15)](#module-c-shop-manager--merchant-desktop-portal-screens-10-15)
   - [MODULE D: Public Buyer & End-User Experience (Screens 16-17)](#module-d-public-buyer--end-user-experience-screens-16-17)
   - [MODULE E: System Admin & Platform Governance (Screens 18-19)](#module-e-system-admin--platform-governance-screens-18-19)
5. [MICRO-INTERACTIONS & USER FEEDBACK PROTOCOLS](#5-micro-interactions--user-feedback-protocols)
6. [FIGMA DESIGN COMPONENT MATRIX & READY-TO-USE PROMPTS](#6-figma-design-component-matrix--ready-to-use-prompts)

---

# 1. EXECUTIVE DESIGN PHILOSOPHY & DUAL-PLATFORM STRATEGY

### 🎯 The Dual-Platform Paradigm
InfluxNet serves two fundamentally distinct user behaviors on the same platform:
1. **Shop Managers & Admins (Desktop-First — 1440px Grid):** Heavy data density, multi-column analytics, batch processing, ledger audits, and side-by-side transaction reconciliation.
2. **Collaborators / KOLs & Public Buyers (Mobile-First — 390px Viewport):** Fast thumb-reach navigation, 1-click link/QR generation, live income counters, mobile social sharing, and instant checkout.

```
 ┌────────────────────────────────────────┬──────────────────────────────────────────┐
 │ DESKTOP PC WORKSPACE (>= 1024px)       │ MOBILE / HYBRID APP (360px - 430px)      │
 ├────────────────────────────────────────┼──────────────────────────────────────────┤
 │ • Primary Users: Shop Manager, Admin   │ • Primary Users: KOLs, Influencers, Buyers│
 │ • Navigation: Collapsible Left Sidebar │ • Navigation: Bottom Navigation Bar + Fab │
 │ • Layout: 12-Column Fluid Grid         │ • Layout: Single-Column Stack, Snap Cards │
 │ • Focus: Data Tables, Modals, Filters  │ • Focus: Large Touch Targets, Gestures    │
 └────────────────────────────────────────┴──────────────────────────────────────────┘
```

### 🚫 Anti-AI Design Mandates (Human-Crafted Elegance)
* **NO generic purple/indigo AI gradients:** Use the authentic, refined **Vàng Be (Warm Sand & Brand Gold) identity** paired with **Warm Cream & Deep Ink**.
* **NO washed-out muddy box shadows:** Use crisp, multi-layered ambient occlusions (`rgba(26, 22, 18, 0.06)`).
* **NO over-rounded bubbly shapes:** Strict structural hierarchy with `12px` and `16px` radii for cards, `10px` for controls.
* **NO vague filler copy:** Concrete financial language (*"Available Balance"*, *"14-Day Hold"*, *"Net Commission (10% PIT Deducted)"*).

---

# 2. DESIGN SYSTEM & ATOMIC TOKENS

## 2.1 Color Palette: Vàng Be (Warm Sand, Cream & Brand Gold)

```
   WARM SAND / CREAM (Canvas)      BRAND GOLD (Primary Accent)       DEEP INK (Typography)
 ┌─────────┬─────────┬─────────┐ ┌─────────┬─────────┬─────────┐ ┌─────────┬─────────┬─────────┐
 │ #FAF8F5 │ #F3EFE6 │ #FBF5EB │ │ #C59B58 │ #B88E4F │ #EEDFC6 │ │ #1A1612 │ #231D15 │ #7D715E │
 │ Canvas  │ Sand BG │ Soft Gold│ │ Brand   │ Strong  │ Border  │ │ Ink     │ Dark CTA│ Muted   │
 └─────────┴─────────┴─────────┘ └─────────┴─────────┴─────────┘ └─────────┴─────────┴─────────┘
```

| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `color-canvas` | `#FAF8F5` | Nền chính toàn bộ trang web (Warm Cream) |
| `color-surface-sand` | `#F3EFE6` | Nền Sidebar, khay tab chọn vai trò, thẻ card phụ (Warm Sand) |
| `color-surface-white` | `#FFFFFF` | Thẻ Card chính, ô form, modal |
| `color-brand` | `#C59B58` | Nút hành động chính ("Đăng nhập an toàn", "Đặt mua ngay"), CTA chính |
| `color-brand-strong` | `#B88E4F` | Điểm nhấn chữ, icon thương hiệu, viền active, hover của nút |
| `color-brand-soft` | `#FBF5EB` | Nền badge ưu đãi, box giảm giá, nền tin nhắn nổi bật |
| `color-brand-border` | `#EEDFC6` | Viền badge ưu đãi, viền hộp giảm giá |
| `color-brand-dark` | `#231D15` | Nút tối màu sang trọng, nút cổng đối tác |
| `color-border-line` | `#EAE4D7` | Viền ô nhập liệu (Input), viền thẻ Card, đường kẻ phân cách |
| `color-text-ink` | `#1A1612` | Tiêu đề chính H1-H6, giá tiền, số liệu tài chính (Deep Ink) |
| `color-text-muted` | `#7D715E` | Chữ phụ, mô tả, chú thích, nhãn phụ (Warm Muted) |
| `color-danger` | `#DC2626` | Trạng thái lỗi, cảnh báo vi phạm |
| `color-success` | `#059669` | Chỉ dùng cho icon tick xanh xác minh hoặc % tăng trưởng nhỏ |

---

## 2.2 Typography Scale

* **Headings & KPI Counters:** `Plus Jakarta Sans` (Geometric, sharp numbers, high authority).
* **Body, Tables & UI Controls:** `Inter` (Optimized for dense financial readability and legibility).
* **Monospace Codes (SKU, Tracking, Coupons):** `JetBrains Mono` or `Geist Mono`.

| Style Level | Font Family | Weight | Desktop Size / Line-height | Mobile Size / Line-height |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title / Display** | Plus Jakarta Sans | 800 (Bold) | `36px` / `44px` | `28px` / `34px` |
| **H1 (Page Header)** | Plus Jakarta Sans | 700 (Bold) | `28px` / `36px` | `24px` / `30px` |
| **H2 (Section Header)**| Plus Jakarta Sans | 600 (SemiBold)| `20px` / `28px` | `18px` / `24px` |
| **H3 (Card Title)** | Plus Jakarta Sans | 600 (SemiBold)| `16px` / `24px` | `15px` / `22px` |
| **Financial Big Numbers**| Plus Jakarta Sans| 700 (Bold) | `32px` / `40px` | `26px` / `32px` |
| **Body Default** | Inter | 400 (Regular) | `14px` / `20px` | `14px` / `20px` |
| **Body Medium / Bold** | Inter | 500 / 600 | `14px` / `20px` | `14px` / `20px` |
| **Caption / Meta Data** | Inter | 400 (Regular) | `12px` / `16px` | `12px` / `16px` |
| **Code / Shortlink Tag**| JetBrains Mono | 500 (Medium) | `13px` / `18px` | `12px` / `16px` |

---

## 2.3 Elevation, Shadows & Glassmorphism

```css
/* Card Elevation Subtle */
--shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
--shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
--shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);

/* Modal & Floating Action Shadow */
--shadow-modal: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);

/* Subtle Glass Surface for Fixed Navbars */
--glass-nav: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(226, 232, 240, 0.8);
```

---

## 2.4 Border Radius & Spacing Scale (4pt Grid)

* **Spacing Units:** `4px (xs)`, `8px (sm)`, `12px (md)`, `16px (lg)`, `24px (xl)`, `32px (2xl)`, `48px (3xl)`.
* **Border Radii:**
  - `4px (rounded-xs)`: Status badges, small tags, tooltips.
  - `8px (rounded-md)`: Form input fields, standard action buttons, table rows.
  - `12px (rounded-lg)`: Dashboard KPI cards, product items, modals.
  - `20px (rounded-2xl)`: Mobile bottom sheets, floating pill menus.
  - `9999px (rounded-full)`: User avatars, pill badges, icon buttons.

---

# 3. RESPONSIVE LAYOUT & NAVIGATION ARCHITECTURE

### 🖥️ Desktop PC Layout Structure (Viewport $\ge 1024\text{px}$)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] InfluxNet    [Global Search Store/KOL...]    [Store: Vintage Hub v] (🔔) [👤]│  <- Top Bar (64px)
├───────────────┬──────────────────────────────────────────────────────────────────┤
│ 📊 Dashboard  │  BREADCRUMB: Home > Payout Settlements                           │
│ 📦 Catalog    │ ┌──────────────────────────────────────────────────────────────┐ │
│ 🔗 Attribution│ │ PAGE HEADER: Payout Requests Management         [Export CSV] │ │
│ 💰 Wallets    │ ├─────────────────┬─────────────────┬──────────────────────────┤ │
│ 💬 Messages(3)│ │ [KPI 1: 15.2M]  │ [KPI 2: 24 Req] │ [KPI 3: 0 Rejected]      │ │
│ 🏆 Leaderboard│ ├─────────────────┴─────────────────┴──────────────────────────┤ │
│ ⚙️ Settings   │ │ 📑 DATA TABLE (Sortable, Multi-filter, Bulk Select, Pagination)│ │
│               │ └──────────────────────────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────────────────────┘
  Left Sidebar (240px)                      Main Content Container (Max-Width: 1440px)
```

### 📱 Mobile Web & Capacitor App Layout (Viewport $375\text{px} - 430\text{px}$)
```
┌──────────────────────────────────────┐
│ [Logo] InfluxNet          (🔔 2) [👤]│  <- Top Mobile Header (56px sticky)
├──────────────────────────────────────┤
│ 💳 WALLET CARD (Hero Element)        │
│ Available: 12.450.000 ₫  [Rút Tiền]  │
│ Pending (14d hold): 1.850.000 ₫      │
├──────────────────────────────────────┤
│ ⚡ QUICK ACTIONS (Horizontal Scroll) │
│ [🔗 Tạo Link] [📷 Quét QR] [🎁 Xin Mẫu]│
├──────────────────────────────────────┤
│ 📈 PERFORMANCE RECHARTS SNAPSHOT     │
│ 7-Day Clicks: 1,420 | Orders: 38 (CR 2.7%)
├──────────────────────────────────────┤
│ 📦 TOP PERFORMING PRODUCTS (Card Feed│
│ ┌──────────────────────────────────┐ │
│ │ Áo Khoác Bomber HD      [Copy Link]│
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [🏠 Home]  [📦 Kho]  [💬 Chat]  [👤 KYC]│  <- Bottom Navigation Bar (64px Fixed)
└──────────────────────────────────────┘
```

---

# 4. COMPLETE SCREEN-BY-SCREEN SPECIFICATIONS (19 MASTER SCREENS)

---

## MODULE A: AUTHENTICATION & SECURITY (Screens 01-03)

### Screen 01: Multi-Role Authentication (Login & Register)
* **Goal:** Allow users to securely log in or register under specific roles (`COLLABORATOR`, `SHOP_MANAGER`, `SYSTEM_ADMIN`).
* **Desktop Layout:** Split screen — Left side: Editorial brand graphic with creator quote & live dynamic stat pill; Right side: Clean auth form.
* **Mobile Layout:** Full-screen focused card with logo header, segmented role picker tab (`KOL/CTV` vs `Chủ Shop`), social login, and email/password fields.
* **Key Components:**
  - Segmented Control: `[Tôi là KOL / CTV]` | `[Tôi là Chủ Shop]`
  - Floating label Inputs: Email, Password (with eye toggle).
  - Primary CTA: *"Đăng Nhập"* (Full-width, Brand Gold `#C59B58` / Dark Accent `#231D15`).
  - Secondary Link: *"Chưa có tài khoản? Đăng ký ngay"*.

### Screen 02: OTP 2-Factor Authentication & Password Recovery
* **Goal:** 6-digit numeric OTP input for high-value financial actions and password reset.
* **Layout:** Centered card with 6 auto-focusing numeric input boxes, 60s countdown timer, and *"Gửi lại mã OTP"* action.

### Screen 03: Security & Session Management
* **Goal:** Active session list, device fingerprints, and password reset form.

---

## MODULE B: COLLABORATOR & KOL WORKSPACE (Mobile-First — Screens 04-09)

### Screen 04: Collaborator Real-Time Income Dashboard (Hero Screen)
* **Goal:** The home base for KOLs to see earnings, rank status, and performance metrics.
* **Desktop View:** 4 KPI Cards across top, 7-Day Performance Chart (Clicks vs Orders) on left, Recent Commissions feed on right.
* **Mobile View:**
  - **Hero Financial Card:** Nền Dark Accent `#231D15` hoặc Warm Sand, Hiển thị `Available Balance` với Brand Gold `#C59B58` (`32px` bold), `Pending Balance` với Amber tag, và nút bấm `[Yêu Cầu Rút Tiền]` màu Brand Gold `#C59B58`.
  - **Tier Badge Widget:** Current Tier (`GOLD` - $+3\%$ bonus) with interactive progress bar to `PLATINUM` (e.g., *"Còn 12.500.000 ₫ để lên Platinum"*).
  - **Performance Carousel:** Swipeable cards for Clicks, Converted Orders, and Conversion Rate (CR%).

### Screen 05: Encrypted Link & Dynamic QR Generator
* **Goal:** Generate customized referral links, dynamic QR images, and custom coupon codes.
* **Components:**
  - Product Selector Dropdown / Search.
  - Generated Link Field: Readonly field displaying `https://influxnet.vn/r/ref_a9k2` with trailing `[Sao Chép Link]` button.
  - Dynamic QR Card: Live rendered QR code with brand logo overlay, download button (`[Tải QR PNG]`), and color customizer.
  - Custom Promo Coupon Input: Text box allowing custom code registration (e.g., `KOLTHANG10`).
  - 1-Click Social Share Row: Quick share buttons to Facebook, TikTok, Threads, Telegram, and Zalo.

### Screen 06: Multi-Platform Social Channels Management
* **Goal:** Connect and manage unlimited social media accounts.
* **Components:**
  - Connected Channel Cards: Platform icon (TikTok, YouTube, Facebook, Threads, Lemon8), Channel Handle (`@kol_thang`), Follower count pill (`150K Followers`), and `[Primary]` badge.
  - Action: Floating button `[+ Thêm Kênh MXH Mới]`.
  - Add Channel Modal: Platform dropdown, URL input, and follower count.

### Screen 07: Media Asset Hub & 1-Click SEO Copywrite
* **Goal:** Provide KOLs with marketing ammunition (HD images, banners, video clips, and pre-written SEO captions).
* **Components:**
  - Grid of downloadable assets with image previews, aspect ratio tags (`9:16 Story`, `1:1 Post`).
  - Pre-written SEO Captions Box with dedicated `[1-Click Copy Caption]` button that gives instant visual checkmark feedback.

### Screen 08: Sample Product Request & Tracking
* **Goal:** KOLs request free sample products to create review videos.
* **Components:**
  - Request Form: Shipping address, phone number, and brief proposal note.
  - Request Status Timeline: `[Đã Gửi]` $\rightarrow$ `[Shop Đã Duyệt]` $\rightarrow$ `[Đang Giao GHTK: #88992211]` $\rightarrow$ `[Đã Nhận Hàng]`.

### Screen 09: Collaborator Wallet & Financial History
* **Goal:** Full visibility of wallet funds, pending hold timers, and payout history.
* **Components:**
  - Double-Entry Ledger History List: Green rows (`+ 150.000 ₫` Commission Approved), Amber rows (`+ 85.000 ₫` Order Pending), Red rows (`- 2.000.000 ₫` Withdraw Bank Transfer).
  - Payout Modal: Amount input with auto-calculated 10% PIT tax deduction display and net payout preview.

---

## MODULE C: SHOP MANAGER & MERCHANT PORTAL (Desktop-First — Screens 10-15)

### Screen 10: Merchant Executive Command Center
* **Goal:** Overview of store sales, active KOL count, total commission liability, and top products.
* **Layout (12-Column Desktop Grid):**
  - Columns 1-12: 4 Metric Cards (Gross Sales, Net Commission Paid, Active KOLs, Refund Rate).
  - Columns 1-8: Interactive Recharts Line Graph (Gross Revenue vs Commission Over Time).
  - Columns 9-12: Real-time Live Feed of new referred orders and click traffic.

### Screen 11: Product Catalog & Multi-Tier Commission Setup
* **Goal:** Manage product catalog, custom commission rates, inventory, and soft delete.
* **Components:**
  - Search & Filter Toolbar: Category, Stock Status, Commission Filter.
  - Data Table: Image thumbnail, SKU, Title, Price, Custom Commission Rate input inline, Stock count, Active toggle, Actions menu (Edit, Soft Delete).
  - Bulk Action Bar: Appear when rows are selected (`[Cài Đặt % Hoa Hồng Hàng Loạt]`, `[Tạm Dừng Bán]`).

### Screen 12: Media Asset Management (Upload Hub)
* **Goal:** Shop upload HD banners, review videos, and campaign copywriting templates for KOLs.
* **Components:** Drag & drop media upload zone, product tagging selector, and preview card grid.

### Screen 13: Order Attribution & Commission Reconciliation Center
* **Goal:** Audit every incoming order, verify attribution method (Coupon/Cookie/Fingerprint), and handle refunds.
* **Components:**
  - Orders Table: Order SN, Customer Info, Attributed KOL, Attribution Tag (`COUPON: KOLTHANG10` or `COOKIE (12d)`), Final Amount, Commission Amount, Order Status (`COMPLETED`, `SHIPPING`, `RETURNED`).
  - Refund Clawback Trigger: Button `[Xác Nhận Hoàn Trả & Thu Hồi Hoa Hồng]` with confirmation dialog explaining the automatic wallet reversal.

### Screen 14: Payout Approvals & Bank Proof Upload
* **Goal:** Review withdrawal requests, verify bank details, upload transaction receipts, and export batch transfers.
* **Components:**
  - Pending Payouts List: KOL Name, KYC Status (`VERIFIED`), Bank Name, Account Number, Gross Amount, 10% Tax Withheld, Net Transfer Amount.
  - Approval Modal: File upload input for Bank Transfer Screenshot (`proof_image_url`) and Bank Reference Code (`bank_ref_code`).
  - Batch Action: Button `[Xuất File Chuyển Khoản Lô VietQR / Napas247]`.

### Screen 15: In-App Direct Chat (Shop <-> KOL 1-1)
* **Goal:** Real-time messaging and campaign invitations between Shop and KOLs.
* **Layout:** Two-pane desktop chat interface — Left pane: Conversation search & list with unread badges; Right pane: Chat message thread, media preview, and embedded *"Mời Tham Gia Campaign"* card.

---

## MODULE D: PUBLIC BUYER EXPERIENCE (Screens 16-17)

### Screen 16: Public Product Landing & Instant Guest Checkout
* **Goal:** Frictionless buying experience when clicking a KOL's referral link.
* **Layout:** Mobile-optimized D2C product page with image gallery, KOL video review carousel, price breakdown with auto-applied coupon tag (`Đã áp dụng mã giảm giá của KOL Thắng`), and a floating bottom bar with `[Đặt Mua Ngay]`.
* **Guest Checkout Drawer / Modal:** Inputs for Name, Phone, Delivery Address, Payment method (COD / Bank Transfer QR).

### Screen 17: Public Order Tracking & Post-Purchase Review
* **Goal:** Let customers track shipment by phone number and submit a 5-star product review.
* **Components:**
  - Simple Search Box: *"Nhập Số Điện Thoại hoặc Mã Đơn Hàng"*.
  - Order Timeline Visualizer: `[Đã Đặt]` $\rightarrow$ `[Đóng Gói]` $\rightarrow$ `[Đang Vận Chuyển]` $\rightarrow$ `[Đã Giao Thành Công]`.
  - Star Rating & Review Form: 1-5 star selector, comment textarea, and photo upload.

---

## MODULE E: SYSTEM ADMIN & SAAS PLATFORM (Screens 18-19)

### Screen 18: SaaS Platform Governance & Store Onboarding
* **Goal:** System Admin approves new merchants, manages supported bank lists, and tracks platform GMV.

### Screen 19: AI Anti-Fraud Sentinel & Audit Log Trail
* **Goal:** Monitor suspicious click spikes, review AI fraud flags, and inspect immutable system audit logs.
* **Components:** Audit Log Table with JSON payload viewer, IP address lookup, and action tags (`AI_FRAUD_FLAG`, `PAYOUT_APPROVED`, `STORE_ONBOARDED`).

---

# 5. MICRO-INTERACTIONS & USER FEEDBACK PROTOCOLS

1. **Instant 1-Click Copy Animation:**
   - Default State: Icon `📋 Copy Link`
   - Active State: Transforms into `✅ Đã Sao Chép!` with Emerald background pulse for 2000ms.
2. **Pessimistic Wallet Lock Loading Feedback:**
   - When KOL clicks `[Rút Tiền]`, the button transitions to a spinner state with text `[Đang Khóa Giao Dịch An Toàn...]` to assure the user of bank-grade concurrency protection.
3. **Empty State Philosophy:**
   - Every empty table contains a custom SVG illustration, an encouraging headline, and an immediate primary CTA button guiding the user on their next step.
4. **Real-time Live Toast Notifications:**
   - Socket.io push events trigger sleek top-right floating toasts: *"🎉 Đơn hàng mới #ORD-9988 vừa được ghi nhận! +75.000 ₫ hoa hồng chờ duyệt"*.

---

# 6. FIGMA DESIGN COMPONENT MATRIX & READY-TO-USE PROMPTS

### 🎨 Component Set to Build in Figma:
1. `Button` (Primary Gold `#C59B58`, Dark Accent `#231D15`, Secondary Sand `#F3EFE6`, Danger Reversal, Ghost, Icon Only)
2. `Badge / Pill` (Tier Bronze/Silver/Gold/Platinum, Status Pending/Approved/Reversed, Primary Channel)
3. `StatCard` (Metric Title, Big Counter, Trend Indicator % +/-, Icon Container)
4. `DataTable` (Sortable Header, Checkbox Column, Inline Action Menu, Sticky Pagination)
5. `WalletHeroCard` (Dark Accent `#231D15` / Warm Sand `#F3EFE6`, Available vs Pending Display, Withdraw CTA Gold `#C59B58`)
6. `ReferralLinkBox` (Shortcode field, Dynamic QR preview, Copy trigger, Social share icons)
7. `ChatThreadItem` (Sender Bubble, Receiver Bubble, Campaign Card Attachment, Image Thumbnail)
8. `TimelineTracker` (Horizontal desktop step-indicator, Vertical mobile step-indicator)

---

### 💬 Ready-to-Paste Prompt for Figma AI / Stitch / v0.dev:

```text
Design a modern, high-end Multi-Merchant E-Commerce Affiliate & Creator Network Web Portal named "SCANMS" (Sales Collaborator & Affiliate Network Management System).

Design Requirements:
- Aesthetic: Clean, human-crafted, luxurious warm aesthetic (Warm Sand, Cream & Solid Gold).
- Primary Colors (VÀNG BE): Brand Gold (#C59B58, #B88E4F) for primary actions and accents, Soft Warm Cream Canvas (#FAF8F5), Warm Sand (#F3EFE6) for sidebars and secondary surfaces, Dark Accent (#231D15) for high-contrast secondary buttons, Deep Ink (#1A1612) for headings and financial typography, Warm Amber (#F59E0B) for pending status. TUYỆT ĐỐI KHÔNG DÙNG MÀU XANH LÁ/EMERALD LÀM MÀU CHỦ ĐẠO.
- Typography: Plus Jakarta Sans for big KPI numbers and headings, Inter for data tables and body text, JetBrains Mono for referral shortlinks and coupon codes.
- Layouts:
  1. Desktop View (1440px): 12-column grid with a 256px warm sand left sidebar, header with multi-store switcher and search, multi-metric KPI cards, interactive revenue vs commission line charts, and rich data tables with status badges.
  2. Mobile View (390px): Single-column stack, sleek Dark Accent / Sand Hero Wallet Card showing Available Balance vs 14-Day Pending Balance, quick action pills, swipeable performance carousels, and fixed 64px bottom navigation bar.
- Key Screen to Render: Collaborator Mobile Dashboard, Multi-Merchant Public Storefront & Shop Manager Reconciliation Portal with 1-click copy link widgets, dynamic QR codes, and refund clawback status indicators.
```
