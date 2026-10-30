# SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM04
## Review 2 Commitment

### 1. Project Information
| Field | Details |
| :--- | :--- |
| **Project code** | **FA26SE032** |
| **Project name** | **Sales Collaborator and Affiliate Network Management System (SCANMS)** |
| **Team members** | **Nguyễn Thành Thắng** (Leader - SE184251)<br>**Nguyễn Đình Tuấn** (SE182540)<br>**Nguyễn Phú Quý** (SE180104)<br>**Phan Xuân Thịnh** (SE184527) |
| **Supervisor** | **ThS. Tôn Thất Hoàng Minh** |
| **Reviewer 1** | **longt5** |
| **Reviewer 2** | **ThinhDP2** |
| **Review 2 date** | **29/10/2026** |
| **Version / Date** | Version 2.0 · 29/10/2026 |

---

### 2. Final Registration Form
| Field | Details |
| :--- | :--- |
| **Final version** | Version 2.0 (Post-Review 2 Scope Realignment) |
| **Date confirmed** | 29/10/2026 |
| **Record of Changes (BM03)** | Form BM03 attached with 6 accepted architectural changes. |

---

### 3. Mandatory Features (19 Features, Exact Full Roles)
| ID | Feature | Actor | Acceptance criteria | Workflow | Owner |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **F-01** | User Authentication & RBAC Guard | Customer, Collaborator, Shop Manager, System Manager, System Administrator | Argon2id hashing, JWT Access/Refresh tokens, strict RBAC guard for 5 roles. | WF-01 | Nguyễn Thành Thắng |
| **F-02** | Identity Verification & KYC Multi-Tier Approval | Collaborator, Shop Manager, System Manager | CCCD / Business license upload, multi-status verification (PENDING/APPROVED/REJECTED) by System Manager. | WF-01 | Nguyễn Thành Thắng |
| **F-03** | Collaborator Social Portfolio Linking | Collaborator | Link TikTok, Facebook, YouTube channels with follower counts and content category tags. | WF-01 | Nguyễn Thành Thắng |
| **F-04** | Digital Media Asset Hub | Shop Manager, Collaborator | Centralized promotional asset library with tags, resolution filtering, and one-click download. | WF-01 | Nguyễn Thành Thắng |
| **F-05** | Real-time Security Audit Logging | System Administrator, System Manager | Immutable recording of sensitive financial, KYC, payout, and dispute actions with actor ID & IP. | WF-01, WF-05 | Nguyễn Thành Thắng |
| **F-06** | Additive Multi-Rule Commission Engine | Shop Manager, Collaborator, System Manager | Calculates min(25%, Base(10%) + Tier(1-3%) + max(Deal, Campaign) + Live(2-3%)) + MonthlyBonus. | WF-02, WF-03, WF-05 | Phan Xuân Thịnh & Nguyễn Đình Tuấn |
| **F-07** | Smart Shortened Link & QR Generator | Collaborator | Generates `/r/:code` links and SVG dynamic QR codes with Redis rate limit protection. | WF-03 | Nguyễn Đình Tuấn |
| **F-08** | Last-Click Cookie Attribution & Tracking | Customer, Collaborator | 30-day cookie window, first/last touch attribution, referrer preservation across sessions. | WF-03 | Nguyễn Đình Tuấn |
| **F-09** | 3-Tier Multi-Store Voucher Stacking | Customer, Shop Manager | Stack Global + Store (`couponsByStore`) + Product vouchers with pre-checkout margin check. | WF-03 | Nguyễn Đình Tuấn |
| **F-10** | Multi-Store Order Splitting & In-place Quick Login | Customer | Atomic DB order splitting per store, in-place zero-loss Quick Login Modal, transaction rollback on failure. | WF-03 | Nguyễn Đình Tuấn |
| **F-11** | 6-Block Merchant Product Variant Matrix | Shop Manager, System Manager | Shopee-standard 6-block layout: basic info, media, 2-tier variant pricing matrix, logistics, commission, legal & moderation. | WF-04 | Nguyễn Phú Quý |
| **F-12** | Merchant Order Lifecycle & GHN Fulfillment | Shop Manager, Customer | GHN Sandbox parcel creation, dynamic weight/dimension fee calculation, live webhook tracking. | WF-04 | Nguyễn Phú Quý |
| **F-13** | 14-Day Adaptive Escrow Commission Holding Ledger | Shop Manager, Collaborator, System Manager | Holds commission in escrow post-delivery for 14 days (matching customer return SLA); automated release and return clawback. | WF-04 | Nguyễn Phú Quý |
| **F-14** | Return, Refund & Dual-Video Dispute Mediation Center | Customer, Shop Manager, System Manager | Customer return request flow, GHN reverse pickup, 48h shop inspection SLA, System Manager dual-video escrow arbitration. | WF-04 | Nguyễn Phú Quý |
| **F-15** | Collaborator Sample Request & 14-Day Review SLA | Collaborator, Shop Manager, System Manager | Sample product request, quota throttling, delivery tracking, 14-day review content proof SLA with System Manager arbitration. | WF-02 | Phan Xuân Thịnh |
| **F-16** | Real-time Chat & Exclusive Deal Negotiation | Collaborator, Shop Manager | Socket.IO real-time chat, rich proposal card, bi-directional exclusive commission negotiation. | WF-02 | Phan Xuân Thịnh |
| **F-17** | Interactive Livestream Shopping Room | Collaborator, Customer | WebRTC/HLS room, dynamic live deal pinning, real-time live voucher drop, conversion metrics. | WF-02 | Phan Xuân Thịnh |
| **F-18** | Realtime Analytics & Leaderboard with AI Fraud | Collaborator, Shop Manager, System Manager, System Administrator | Real-time GMV/commission dashboards, gamified tier ranking, AI traffic fraud sentinel. | WF-05 | Nguyễn Đình Tuấn |
| **F-19** | Concurrency-Safe Wallet Withdrawal & Payout Management | Collaborator, Shop Manager, System Manager | Automated withdrawal request with DB row-level locking, 10% PIT tax withholding, VietQR batch export, and bank bill verification. | WF-05 | Nguyễn Đình Tuấn & Nguyễn Thành Thắng |

---

### 4. Non-Functional Requirements
| ID | Quality attribute | Metric | Threshold | Measurement method | Owner |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **NFR-01** | Performance & Latency | API Response Time (p95) | <= 200 ms for catalog browsing and tracking redirection | Autocannon load test (1,000 req/s) & NestJS duration interceptor | Nguyễn Thành Thắng |
| **NFR-02** | Security & Password Hashing | Argon2id Hash & JWT Lifespan | Argon2id (>= 64MB memory, 3 iterations); JWT access token 15 min | Automated auth test suites (`auth-otp.spec.ts`) & OWASP ZAP scan | Nguyễn Thành Thắng |
| **NFR-03** | Availability & Transaction Safety | Uptime & Atomic Rollback Rate | 99.5% service uptime; 100% atomic rollback on stock exhaustion | Jest E2E order rollback simulation & `/health` endpoint monitoring | Nguyễn Đình Tuấn |
| **NFR-04** | Frontend Web Vitals | Bundle Size & First Contentful Paint | Initial bundle <= 500 KB (brotli); FCP <= 1.2s; CLS < 0.1 | Vite build bundle visualizer & Google Lighthouse CI audit | Phan Xuân Thịnh |
| **NFR-05** | Concurrency & Rate Limiting | Sliding Window Limit & Failover | 100 req/min/IP with zero crash on Redis outage (RAM fallback) | Jest unit safety tests (`jest-unit-safety.spec.ts`) & Apache Bench | Nguyễn Đình Tuấn |
| **NFR-06** | Financial Data Auditability | Audit Log Completeness | 100% of financial, commission, and dispute movements logged | Prisma audit interceptor verification test (`audit.interceptor.spec.ts`) | Nguyễn Phú Quý |

---

### 5. Out of Scope
| Item | Reason |
| :--- | :--- |
| **Proprietary Delivery Fleet & Physical Couriers** | Delegated to Giao Hàng Nhanh (GHN) Sandbox API with automatic shipping fee calculation and parcel tracking. |
| **Direct Fiat Commercial Banking Gateway** | Delegated to PayOS / VietQR payment gateway sandbox; interbank license is out of university capstone scope. |
| **On-premise Video Transcoding CDN Infrastructure** | Delegated to WebRTC peer streaming and simulated HLS chunk distribution for livestream shopping rooms. |
| **Enterprise ERP / WMS Physical Warehouse System** | Platform manages digital inventory, variant matrices, and logistics orders without proprietary robotics hardware. |

---

### 6. Workflow Commitments

#### 6.1 Workflow WF-01: User Registration, 2FA Authentication & Multi-tier KYC Approval
- **Owner**: Nguyễn Thành Thắng
- **Supporting members**: Nguyễn Đình Tuấn, Phan Xuân Thịnh
- **Actors**: Collaborator, Shop Manager, System Manager
- **Trigger**: Collaborator or Shop Manager registers account, verifies OTP, and submits identity dossier
- **Business outcome**: Verified user account with role-based portal access, KYC verified badge, full affiliate capabilities unlocked
- **Main entity state path**: `User: PENDING -> ACTIVE; KYC: PENDING_REVIEW -> VERIFIED; Tier: SILVER`
- **Activity diagram**: Report 4 Section 3.1 (Activity Diagram AD-WF01)

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---: | :--- | :--- | :---: |
| **F-01** | User Authentication & RBAC Guard | Argon2id hashing, JWT Access/Refresh tokens, RBAC guard for 5 roles. | TC-F01-01..03 |
| **F-02** | Identity Verification & KYC Multi-Tier Approval | CCCD / Business license upload, multi-status verification (PENDING/APPROVED/REJECTED) by System Manager. | TC-F02-01..03 |
| **F-03** | Collaborator Social Portfolio Linking | Link TikTok, Facebook, YouTube channels with follower counts and content category tags. | TC-F03-01..03 |
| **F-04** | Digital Media Asset Hub | Centralized promotional asset library with tags, resolution filtering, and one-click download. | TC-F04-01..03 |
| **F-05** | Real-time Security Audit Logging | Immutable recording of sensitive financial, KYC, payout, and dispute actions with actor ID & IP. | TC-F05-01..03 |

**Demo Scenarios:**
- **DS-01a (Main)**: TC_KYC_01..04: Collaborator or Shop Manager registers with phone/email, verifies OTP, submits 12-digit ID with 2 photos $ightarrow$ System Manager approves $ightarrow$ Account status ACTIVE, KYC VERIFIED. (Presenter: Nguyễn Thành Thắng)
- **DS-01b (Exception)**: TC_KYC_01..04: Duplicate email / weak password / >5 wrong OTP locks 15m OR blurred ID photo rejected with note $ightarrow$ Account locked / KYC REJECTED. (Presenter: Nguyễn Thành Thắng)

**Committed Test Counts**: Feature tests: 15; Workflow test: 1; State transitions: 3; Total: **19 test cases (100% automated in CI)**.

---

#### 6.2 Workflow WF-02: Exclusive Deal Negotiation, In-App Chat & Live Commerce Deal Pinning
- **Owner**: Phan Xuân Thịnh
- **Supporting members**: Nguyễn Thành Thắng, Nguyễn Phú Quý
- **Actors**: Collaborator, Shop Manager, Customer
- **Trigger**: Shop Manager publishes 10% base product; Collaborator proposes 13% VIP rate via Chat OR Shop Manager invites Collaborator; Collaborator starts live session
- **Business outcome**: VIP Deal agreed, VIP Voucher Code & Smart Link issued, live session with deal pinning (+3% live bonus, e.g. 16%)
- **Main entity state path**: `Deal: PROPOSED -> AGREED; LiveSession: SCHEDULED -> LIVE -> ENDED; Pin: PINNED -> UNPINNED`
- **Activity diagram**: Report 4 Section 3.2 (Activity Diagram AD-WF02)

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---: | :--- | :--- | :---: |
| **F-06** | Additive Multi-Rule Commission Engine | Calculates min(25%, Base(10%) + Tier(1-3%) + max(Deal, Campaign) + Live(2-3%)) + MonthlyBonus. | TC-F06-01..03 |
| **F-15** | Collaborator Sample Request & 14-Day Review SLA | Sample product request, quota throttling, delivery tracking, 14-day review content proof SLA with System Manager arbitration. | TC-F15-01..03 |
| **F-16** | Real-time Chat & Exclusive Deal Negotiation | Socket.IO real-time chat, rich proposal card, bi-directional exclusive commission negotiation. | TC-F16-01..03 |
| **F-17** | Interactive Livestream Shopping Room | WebRTC/HLS room, dynamic live deal pinning, real-time live voucher drop, conversion metrics. | TC-F17-01..03 |

**Demo Scenarios:**
- **DS-02a (Main)**: TC_DEAL_01..04: Shop Manager proposes 13% VIP rate via Chat; Collaborator clicks Accept; Collaborator goes LIVE and pins deal $ightarrow$ VIP voucher generated; live stream active with +3% live bonus (16% total). (Presenter: Phan Xuân Thịnh)
- **DS-02b (Exception)**: TC_DEAL_01..04: Proposal rate > 25% ceiling blocked; Collaborator rejects deal (retains base 10%); live item out of stock $ightarrow$ Deal canceled retaining base 10%; purchase button hidden. (Presenter: Phan Xuân Thịnh)

**Committed Test Counts**: Feature tests: 12; Workflow test: 1; State transitions: 3; Total: **16 test cases (100% automated in CI)**.

---

#### 6.3 Workflow WF-03: Multi-Channel Attribution, Quick Login Modal & VietQR Checkout
- **Owner**: Nguyễn Đình Tuấn
- **Supporting members**: Nguyễn Thành Thắng, Nguyễn Phú Quý
- **Actors**: Customer, Collaborator, Shop Manager, Payment Gateway
- **Trigger**: Customer clicks Collaborator Smart Link / QR / Live Deal, adds multi-store items, and clicks Checkout
- **Business outcome**: 30-day marketing cookie recorded, 100% cart preserved during in-place login modal, instant VietQR payment verification, order PAID
- **Main entity state path**: `Link: ACTIVE; Cookie: SET (30d); Order: PENDING_PAYMENT -> PROCESSING (PAID); Cart: PRESERVED`
- **Activity diagram**: Report 4 Section 3.3 (Activity Diagram AD-WF03)

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---: | :--- | :--- | :---: |
| **F-06** | Additive Multi-Rule Commission Engine | Calculates min(25%, Base(10%) + Tier(1-3%) + max(Deal, Campaign) + Live(2-3%)) + MonthlyBonus. | TC-F06-01..03 |
| **F-07** | Smart Shortened Link & QR Generator | Generates `/r/:code` links and SVG dynamic QR codes with Redis rate limit protection. | TC-F07-01..03 |
| **F-08** | Last-Click Cookie Attribution & Tracking | 30-day cookie window, first/last touch attribution, referrer preservation across sessions. | TC-F08-01..03 |
| **F-09** | 3-Tier Multi-Store Voucher Stacking | Stack Global + Store (`couponsByStore`) + Product vouchers with pre-checkout margin check. | TC-F09-01..03 |
| **F-10** | Multi-Store Order Splitting & In-place Quick Login | Atomic DB order splitting per store, in-place zero-loss Quick Login Modal, transaction rollback on failure. | TC-F10-01..03 |

**Demo Scenarios:**
- **DS-03a (Main)**: TC_ATTR_01..04: Collaborator generates /r/:slug smart link; Customer clicks (cookie set 30 days); adds multi-store items; in-place login; scans VietQR $ightarrow$ PayOS webhook marks order PAID. (Presenter: Nguyễn Đình Tuấn)
- **DS-03b (Exception)**: TC_ATTR_01..04: Unverified KYC blocks link creation; Customer visits deleted item (404); VietQR underpaid $ightarrow$ 404 Discontinued page; order remains in Pending Payment. (Presenter: Nguyễn Đình Tuấn)

**Committed Test Counts**: Feature tests: 15; Workflow test: 1; State transitions: 2; Total: **18 test cases (100% automated in CI)**.

---

#### 6.4 Workflow WF-04: GHN Logistics Fulfillment, 14-Day Adaptive Escrow & Dual-Video Return Arbitration
- **Owner**: Nguyễn Phú Quý
- **Supporting members**: Nguyễn Đình Tuấn, Phan Xuân Thịnh
- **Actors**: Shop Manager, Customer, GHN Logistics, System Manager
- **Trigger**: Shop Manager confirms order, creates GHN shipment parcel, delivers to Customer; Customer requests return within 14 days
- **Business outcome**: GHN waybill generated, delivery completed, 14-day adaptive escrow quarantine active; if return disputed: dual-video arbitration, 100% Customer wallet refund
- **Main entity state path**: `Order: PROCESSING -> SHIPPED -> DELIVERED -> COMPLETED; Escrow: LOCKED -> RELEASED/CLAWED_BACK`
- **Activity diagram**: Report 4 Section 3.4 (Activity Diagram AD-WF04)

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---: | :--- | :--- | :---: |
| **F-11** | 6-Block Merchant Product Variant Matrix | Shopee-standard 6-block layout: basic info, media, 2-tier variant pricing matrix, logistics, commission, legal & moderation. | TC-F11-01..03 |
| **F-12** | Merchant Order Lifecycle & GHN Fulfillment | GHN Sandbox parcel creation, dynamic weight/dimension fee calculation, live webhook tracking. | TC-F12-01..03 |
| **F-13** | 14-Day Adaptive Escrow Commission Holding Ledger | Holds commission in escrow post-delivery for 14 days (matching customer return SLA); automated release and return clawback. | TC-F13-01..03 |
| **F-14** | Return, Refund & Dual-Video Dispute Mediation Center | Customer return request flow, GHN reverse pickup, 48h shop inspection SLA, System Manager dual-video escrow arbitration. | TC-F14-01..03 |

**Demo Scenarios:**
- **DS-04a (Main)**: TC_FUL_01..04: Shop Manager packages order with valid weight/dimensions, creates GHN parcel, Customer receives order $ightarrow$ GHN tracking code generated; status In Transit $ightarrow$ Delivered; 14-day adaptive escrow quarantine active. (Presenter: Nguyễn Phú Quý)
- **DS-04b (Exception)**: TC_FUL_01..04: Customer submits 14-day return claim with unboxing video; Shop Manager inspection SLA 48h; System Manager arbitrates $ightarrow$ Escrow frozen; System Manager approves Customer claim: 100% wallet refund, commission clawed back. (Presenter: Nguyễn Phú Quý)

**Committed Test Counts**: Feature tests: 12; Workflow test: 1; State transitions: 3; Total: **16 test cases (100% automated in CI)**.

---

#### 6.5 Workflow WF-05: Multi-Role Wallet Withdrawal, 10% PIT Tax Withholding & Concurrency Payout Settlement
- **Owner**: Nguyễn Đình Tuấn & Nguyễn Thành Thắng
- **Supporting members**: Nguyễn Phú Quý, Phan Xuân Thịnh
- **Actors**: Collaborator, Shop Manager, System Manager, Banking Gateway
- **Trigger**: Collaborator or Shop Manager submits withdrawal request, or month-end bonus scan calculates GMV milestone
- **Business outcome**: 10% statutory PIT tax withheld, available balance locked via database row-level locking, VietQR batch exported, bank bill verified, and funds disbursed via Napas 24/7
- **Main entity state path**: `Wallet: LOCKED -> DEBITED; Withdrawal: PENDING -> PROCESSING -> APPROVED -> DISBURSED; Tax: WITHHELD`
- **Activity diagram**: Report 4 Section 3.5 (Activity Diagram AD-WF05)

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---: | :--- | :--- | :---: |
| **F-05** | Real-time Security Audit Logging | Immutable recording of sensitive financial, KYC, payout, and dispute actions with actor ID & IP. | TC-F05-01..03 |
| **F-06** | Additive Multi-Rule Commission Engine | Calculates min(25%, Base(10%) + Tier(1-3%) + max(Deal, Campaign) + Live(2-3%)) + MonthlyBonus. | TC-F06-01..03 |
| **F-18** | Realtime Analytics & Leaderboard with AI Fraud | Real-time GMV/commission dashboards, gamified tier ranking, AI traffic fraud sentinel. | TC-F18-01..03 |
| **F-19** | Concurrency-Safe Wallet Withdrawal & Payout Management | Automated withdrawal request with DB row-level locking, 10% PIT tax withholding, VietQR batch export, and bank bill verification. | TC-F19-01..03 |

**Demo Scenarios:**
- **DS-05a (Main)**: TC_PAY_01..04: Collaborator or Shop Manager requests payout; 10% PIT tax withheld; balance locked via DB row-level lock; System Manager audits recipient bank account, uploads bank transfer bill, and dispatches via Napas 24/7 $ightarrow$ Net amount disbursed; 10% tax withheld; locked balance permanently debited. (Presenter: Nguyễn Đình Tuấn & Nguyễn Thành Thắng)
- **DS-05b (Exception)**: TC_PAY_01..04: Insufficient balance (< 100k or > balance); unauthorized access; invalid bank account; bank gateway failure $ightarrow$ Submission blocked; 403 Forbidden; 100% requested funds safely restored to wallet. (Presenter: Nguyễn Đình Tuấn & Nguyễn Thành Thắng)

**Committed Test Counts**: Feature tests: 12; Workflow test: 1; State transitions: 3; Total: **16 test cases (100% automated in CI)**.

---

### 7. Individual Commitments

#### 7.1 Member 1: Nguyễn Thành Thắng (Leader)
- **Student ID**: SE184251
- **Role in team**: Team Leader & Fullstack Architect
- **Main workflow(s) owned**: WF-01: User Registration, 2FA Authentication & Multi-tier KYC Approval; WF-05: Multi-Role Wallet Withdrawal & Payouts (Co-owner)
- **Mandatory features owned**: F-01 (Auth & RBAC), F-02 (KYC Multi-Tier), F-03 (Social Portfolio), F-04 (Media Hub), F-05 (Audit Logging)
- **Modules / entities owned**: AuthModule, KycModule, MediaModule, AuditModule, UserModule
- **Design decisions owned**: D2: Strict Authenticated Checkout with Zero-Loss Cart; PR #1, PR #5
- **NFRs responsible**: NFR-01 (API Latency <= 200ms), NFR-02 (Argon2id Hash & JWT Lifespan)
- **Committed functional test cases**: 22 functional test cases (100% automated in CI)
- **Demo scenarios presented**: DS-01a, DS-01b, DS-05a (TC_KYC_01..04, TC_PAY_01..04)
- **Review 2 verification**: Verified (0 critical/high defects, ready for Defense 1.1)

#### 7.2 Member 2: Phan Xuân Thịnh
- **Student ID**: SE184527
- **Role in team**: Fullstack Developer & Realtime Lead
- **Main workflow(s) owned**: WF-02: Exclusive Deal Negotiation, In-App Chat & Live Commerce Deal Pinning
- **Mandatory features owned**: F-06 (Commission Engine), F-15 (Sample Request & 14-Day Review SLA), F-16 (Deal Chat Socket.IO), F-17 (Livestream Shopping Room)
- **Modules / entities owned**: SamplesModule, ChatModule, LiveSessionsModule, CommissionRulesModule
- **Design decisions owned**: D5: Dual-Channel Real-time Live & Messaging Gateway; PR #16, PR #27
- **NFRs responsible**: NFR-04 (Frontend Bundle <= 500KB, FCP <= 1.2s)
- **Committed functional test cases**: 18 functional test cases (100% automated in CI)
- **Demo scenarios presented**: DS-02a, DS-02b (TC_DEAL_01..04)
- **Review 2 verification**: Verified (0 critical/high defects, ready for Defense 1.1)

#### 7.3 Member 3: Nguyễn Đình Tuấn
- **Student ID**: SE182540
- **Role in team**: Backend Lead & Financial Engine Specialist
- **Main workflow(s) owned**: WF-03: Multi-Channel Attribution, Quick Login Modal & VietQR Checkout; WF-05: Multi-Role Wallet Withdrawal & Payouts (Co-owner)
- **Mandatory features owned**: F-07 (Smart Link & QR), F-08 (Last-Click Attribution), F-09 (Voucher Stacking), F-10 (Order Splitting & Checkout), F-18 (Analytics & AI Fraud), F-19 (Concurrency-Safe Payouts)
- **Modules / entities owned**: ReferralLinksModule, CouponsModule, CheckoutModule, DashboardModule, AiModule, PayoutsModule
- **Design decisions owned**: D1: Additive Commission Engine; D4: 3-Tier Multi-Store Voucher Hierarchy; PR #9, PR #12
- **NFRs responsible**: NFR-03 (99.5% Uptime & Atomic Rollback), NFR-05 (100 req/min Rate Limiting)
- **Committed functional test cases**: 23 functional test cases (100% automated in CI)
- **Demo scenarios presented**: DS-03a, DS-03b, DS-05a, DS-05b (TC_ATTR_01..04, TC_PAY_01..04)
- **Review 2 verification**: Verified (0 critical/high defects, ready for Defense 1.1)

#### 7.4 Member 4: Nguyễn Phú Quý
- **Student ID**: SE180104
- **Role in team**: Fullstack Developer & Logistics Lead
- **Main workflow(s) owned**: WF-04: GHN Logistics Fulfillment, 14-Day Adaptive Escrow & Dual-Video Return Arbitration
- **Mandatory features owned**: F-11 (Product Variant Matrix), F-12 (Order Lifecycle & GHN), F-13 (14-Day Adaptive Escrow Ledger), F-14 (Dual-Video Return Mediation)
- **Modules / entities owned**: ProductsModule, OrdersModule, ShippingModule, ReturnsModule, WalletsModule
- **Design decisions owned**: D3: 14-Day Adaptive Escrow Commission Quarantine & Dual-Video Dispute Arbitration; PR #11, PR #14
- **NFRs responsible**: NFR-06 (100% Financial Ledger Auditability)
- **Committed functional test cases**: 18 functional test cases (100% automated in CI)
- **Demo scenarios presented**: DS-04a, DS-04b (TC_FUL_01..04)
- **Review 2 verification**: Verified (0 critical/high defects, ready for Defense 1.1)

---

### 8. Summary and Cross-check

#### 8.1 By Workflow
| Workflow | Owner | Features | Demo scenarios (main / exception) | Test cases | Automated in CI |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **WF-01** | Nguyễn Thành Thắng | F-01, F-02, F-03, F-04, F-05 | DS-01a (Main), DS-01b (Exception) | 19 | **Yes (100%)** |
| **WF-02** | Phan Xuân Thịnh | F-06, F-15, F-16, F-17 | DS-02a (Main), DS-02b (Exception) | 16 | **Yes (100%)** |
| **WF-03** | Nguyễn Đình Tuấn | F-06, F-07, F-08, F-09, F-10 | DS-03a (Main), DS-03b (Exception) | 18 | **Yes (100%)** |
| **WF-04** | Nguyễn Phú Quý | F-11, F-12, F-13, F-14 | DS-04a (Main), DS-04b (Exception) | 16 | **Yes (100%)** |
| **WF-05** | Nguyễn Đình Tuấn & Nguyễn Thành Thắng | F-05, F-06, F-18, F-19 | DS-05a (Main), DS-05b (Exception) | 16 | **Yes (100%)** |

#### 8.2 By Member
| Member | Workflows owned | Features | Test cases | Automated in CI | Demo scenarios | Review 2 verification |
| :--- | :---: | :--- | :---: | :---: | :--- | :---: |
| **Nguyễn Thành Thắng (Leader)** | WF-01, WF-05 | F-01, F-02, F-03, F-04, F-05 | 22 | **Yes (100%)** | DS-01a, DS-01b, DS-05a | **Verified** |
| **Phan Xuân Thịnh** | WF-02 | F-06, F-15, F-16, F-17 | 18 | **Yes (100%)** | DS-02a, DS-02b | **Verified** |
| **Nguyễn Đình Tuấn** | WF-03, WF-05 | F-07, F-08, F-09, F-10, F-18, F-19 | 23 | **Yes (100%)** | DS-03a, DS-03b, DS-05a, DS-05b | **Verified** |
| **Nguyễn Phú Quý** | WF-04 | F-11, F-12, F-13, F-14 | 18 | **Yes (100%)** | DS-04a, DS-04b | **Verified** |
| **Total** | — | — | **81** | **Yes (100%)** | — | **100% Passing** |

#### 8.3 Committed Numbers
- **Number of main workflows**: **5**
- **Number of demo scenarios (main / exception)**: **10 (5 main / 5 exception)**
- **Committed functional test cases**: **81 (1,514 automated tests in CI)**
- **Percentage automated in CI**: **> 95%** (Minimum requirement $\ge 50\%$)

#### 8.4 Eligibility Thresholds for the Viva
| Criterion | Minimum threshold | Agreed status |
| :--- | :---: | :--- |
| **Main workflows** | 100% run end-to-end | 100% verified on staging with seeded master data |
| **Demo scenarios** | 100% main; $\ge 80\%$ exception | 100% main (5/5); 100% exception (5/5) verified |
| **Committed test cases pass rate** | $\ge 90\%$ at Defense 1.1 | **100% currently passing in CI (1,514/1,514 passed)** |
| **Automated in CI** | $\ge 50\%$ of committed total | **> 95% automated in GitHub Actions CI** |
| **Known Gaps closed or planned** | All High findings addressed | 100% High findings from BM02 closed (7/7 Fixed) |
| **Code quality & build integrity** | Zero compiler errors | **0 TypeScript errors (`tsc --noEmit`); 0 Vite build errors** |
| **Brand & Design tokens** | Warm Sand & Brand Gold | 100% compliant (`#FAF8F5`, `#F3EFE6`, `#C59B58`, `#B88E4F`) |

---

### 9. Required Fixes
| ID | Item | Related workflow | Owner | Due |
| :---: | :--- | :---: | :---: | :---: |
| **G1** | Automated Fiat Interbank Payout Disbursal vs Sandbox Simulation | WF-05 | Nguyễn Phú Quý | Review 3 |
| **G2** | In-browser WebRTC Peer Streaming vs Commercial CDN Media Cluster | WF-02 | Phan Xuân Thịnh | Council 1.1 |
| **G3** | Distributed Redis SPOF Graceful Degradation (LRU in-memory fallback) | WF-03 | Nguyễn Đình Tuấn | Done |

---

### 10. Review 2 Conclusion
- ☑ **Pass**     ☐ Conditional pass     ☐ Re-review

---

### 11. Confirmation
- **Reviewer 1**: **longt5** · Date: 29/10/2026
- **Reviewer 2**: **ThinhDP2** · Date: 29/10/2026
- **Supervisor**: **ThS. Tôn Thất Hoàng Minh** · Date: 29/10/2026
- **Team Leader**: **Nguyễn Thành Thắng** · Date: 29/10/2026
