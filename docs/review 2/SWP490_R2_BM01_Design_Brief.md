# SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM01
## Design Brief – Review 2

### 0. Header
| Field | Details |
| :--- | :--- |
| **Project code** | **FA26SE032** |
| **Project name** | **Sales Collaborator and Affiliate Network Management System (SCANMS)** |
| **Team members** | **Nguyễn Thành Thắng** (Leader - SE184251)<br>**Nguyễn Đình Tuấn** (SE182540)<br>**Nguyễn Phú Quý** (SE180104)<br>**Phan Xuân Thịnh** (SE184527) |
| **Supervisor** | **ThS. Tôn Thất Hoàng Minh** |
| **Repository link (tag review-2)** | [https://github.com/thang-nt25/SCANMS-project-capstone-fall26 (tag: review-2)](https://github.com/thang-nt25/SCANMS-project-capstone-fall26) |
| **Version / Date** | Version 2.0 · 29/10/2026 |

---

### 1. Scope
#### 1.1 Registration Changes
| Section | Current | Proposed | Reason |
| :--- | :--- | :--- | :--- |
| **Timeline & Team (Section 1-2)** | Duration 09/2026-03/2027; unassigned 5th student row | Duration 07/09/2026-30/12/2026; exactly 4 active members | Align with official university defense calendar; formalize team. |
| **Risks & Security (Section 3.2a, 3.2b)** | Generic manual management risks only | Identified return commission overpayment & bot click farming; added Redis sliding-window limit & AI Fraud | Address real e-commerce fraud and attribution spoofing draining budgets. |
| **Multi-Merchant & Logistics (Section 3.2b, 3.2c)** | Single-merchant flat catalog; external cart sync; no carrier | Multi-Merchant network, 2-tier Color x Size variant matrix, GHN carrier API integration | Industry standard for multi-store order splitting and delivery tracking. |
| **Roles & Authentication (Section 3.2b, 3.2c)** | 3 basic roles; allowed unauthenticated guest checkout | 5 core roles (added System Manager & Customer); strict authenticated checkout with 0-loss cart | Ensure legal auditability, order provenance, and GHN address validity. |
| **Escrow & Reverse Logistics (Section 3.2b, 3.2c)** | Linear payout without quarantine; manual bank export; no returns | Automated 14-day Adaptive Escrow ledger matching customer return warranty; GHN reverse pickup; dual-video dispute center; row-level locks; 10% PIT tax withholding | Prevent merchant deficit and creator wallet overdraft on return disputes. |
| **Collaboration, Live & AI (Section 3.2b, 3.2c)** | Static 1-way media download; no messaging; no sample flow; no AI | Real-time Socket.IO deal chat; 14-day sample SLA; live deal pinning; AI Partner Matching & Anti-Fraud | Expand social commerce capabilities and elevate technical capstone rigor. |

#### 1.2 Out of Scope
| Item | Reason |
| :--- | :--- |
| **Proprietary Delivery Fleet & Physical Couriers** | Delegated to Giao Hàng Nhanh (GHN) Sandbox API with automatic shipping fee calculation and parcel tracking. |
| **Direct Fiat Commercial Banking Gateway** | Delegated to PayOS / VietQR payment gateway sandbox; interbank license is out of university capstone scope. |
| **On-premise Video Transcoding CDN Infrastructure** | Delegated to WebRTC peer streaming and simulated HLS chunk distribution for livestream shopping rooms. |
| **Enterprise ERP / WMS Physical Warehouse System** | Platform manages digital inventory, variant matrices, and logistics orders without proprietary robotics hardware. |

---

### 2. System at a Glance
Direct-to-consumer social commerce in Vietnam faces fragmented creator workflows, click fraud, and creator sample exploitation. SCANMS connects Merchants with Collaborators (KOLs/KOCs) and Customers. The platform automates onboarding, KYC verification, media asset distribution, smart referral links, and 3-tier multi-store voucher checkout. Its core financial engine caps cumulative commissions at 25% to protect merchant margins, platform-funds creator tier bonuses, and enforces a 14-day post-delivery Adaptive Escrow ledger with dual-video dispute arbitration. Real-time Socket.IO livestream shopping, dynamic deal pinning, and AI click-fraud scoring ensure transparent attribution and auditable reconciliation.

---

### 3. Key Design Decisions
| ID | Decision | Options considered | Chosen option and rationale | Owner | Related FR / diagram |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **D1** | Additive Multi-Rule Commission Engine | Uncapped linear sum vs flat single rate | Formula $Rate = \min(25\%, Base + Tier + \max(Deal, Campaign) + Live)$ balances creator incentives with merchant margin safety. | Nguyễn Đình Tuấn | FR-09 / SDD Section 7 |
| **D2** | Strict Authenticated Checkout with Zero-Loss Cart | Anonymous guest checkout vs forced pre-login | Enforced authenticated purchase with local storage cart preservation, guaranteeing KYC auditability and GHN address validity. | Nguyễn Thành Thắng | FR-16 / SDD Section 6 |
| **D3** | 14-Day Adaptive Escrow Commission Holding Ledger | Instant payout upon delivery vs fixed 7-day vs 14-day adaptive ledger | 14-day post-delivery quarantine ledger matching customer 14-day return SLA with automated return clawback, preventing creator wallet overdraft during return window. | Nguyễn Phú Quý | FR-21 / SDD Section 5 |
| **D4** | 3-Tier Multi-Store Voucher Isolation Hierarchy | Single cart-wide voucher vs merchant-only coupon | Platform global + Store (`couponsByStore`) + Product voucher hierarchy with atomic order splitting and pre-checkout margin validation. | Nguyễn Đình Tuấn | FR-12 / SDD Section 4 |
| **D5** | Dual-Channel Real-time Live & Messaging Gateway | HTTP polling vs external commercial live SaaS | Decoupled Socket.IO WebSocket gateways for live deal pinning and chat, with local memory fallback under Redis degradation. | Phan Xuân Thịnh | FR-26 / SDD Section 3 |

---

### 4. Top Risks
| ID | Risk | Impact | How we verify or mitigate | Owner |
| :---: | :--- | :--- | :--- | :---: |
| **R1** | Attribution Spoofing & Click Spamming draining merchant affiliate budgets. | High: Financial distortion and collaborator attribution disputes. | Sliding-window Redis rate limiter (100 req/min/IP), device fingerprinting, and automated AI fraud anomaly detection (FR-31). | Nguyễn Thành Thắng |
| **R2** | Double-Discount Margin Erosion from stacked vouchers and affiliate rates. | High: Merchant losses on subsidized high-commission campaign sales. | Pre-checkout margin protection guard enforcing total discount $\le$ allowed profit margin, plus 25% global commission cap. | Nguyễn Đình Tuấn |
| **R3** | Collaborator Sample Exploitation violating 14-day review content delivery SLA. | Medium: Merchant inventory loss and unfulfilled marketing campaigns. | Automated 14-day SLA deadline tracking, reminder notifications, sample quota throttling, and System Manager dispute blacklisting. | Phan Xuân Thịnh |

---

### 5. Known Gaps
| ID | Gap | Location | Plan | Owner | Due |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **G1** | Automated Fiat Interbank Payout Disbursal vs Sandbox Simulation | SDD Section 6 / `payouts.service.ts` | Implemented PayOS sandbox payment adapter; production bank host-to-host switch ready pending enterprise corporate KYC. | Nguyễn Phú Quý | Review 3 |
| **G2** | In-browser WebRTC Peer Streaming vs Commercial CDN Media Cluster | SDD Section 5 / `live-sessions.service.ts` | Socket.IO signaling and HLS simulation tested up to 50 concurrent viewers; cloud CDN cluster deferred to commercial deployment. | Phan Xuân Thịnh | Council 1.1 |
| **G3** | Distributed Redis SPOF Graceful Degradation | SDD Section 3 / `cache.service.ts` | Implemented in-memory LRU Map fallback with automatic reconnection retry loop and operational degraded alerts (Fixed & verified in CI). | Nguyễn Đình Tuấn | Done |

---

### 6. Proposed Mandatory Features
| ID | Feature | Actor | Acceptance criteria (testable) | Test | Status |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **F-01** | User Authentication & RBAC Guard | Customer, Collaborator, Shop Manager, System Manager, System Administrator | Argon2id password hashing, JWT Access/Refresh tokens, strict RBAC guard for 5 roles. | TC-F01-01..03 | **Done** |
| **F-02** | Identity Verification & KYC Multi-Tier Approval | Collaborator, Shop Manager, System Manager | CCCD / Business license upload, partner upgrade workflow (/customer/upgrade), multi-status verification by System Manager. | TC-F02-01..03 | **Done** |
| **F-03** | Collaborator Social Portfolio Linking | Collaborator | Link TikTok, Facebook, YouTube channels with follower counts and content category tags. | TC-F03-01..03 | **Done** |
| **F-04** | Digital Media Asset Hub | Shop Manager, Collaborator | Centralized promotional asset library with tags, resolution filtering, and one-click download. | TC-F04-01..03 | **Done** |
| **F-05** | Real-time Security Audit Logging | System Administrator, System Manager | Immutable recording of sensitive financial, KYC, payout, and dispute actions with actor ID & IP. | TC-F05-01..03 | **Done** |
| **F-06** | Additive Multi-Rule Commission Engine | Shop Manager, Collaborator, System Manager | Calculates min(25%, Base(10%) + Tier(1-3%) + max(Deal, Campaign) + Live(2-3%)) + MonthlyBonus. | TC-F06-01..03 | **Done** |
| **F-07** | Smart Shortened Link & QR Generator | Collaborator | Generates `/r/:code` links and SVG dynamic QR codes with Redis rate limit protection. | TC-F07-01..03 | **Done** |
| **F-08** | Last-Click Cookie Attribution & Tracking | Customer, Collaborator | 30-day cookie window, first/last touch attribution, referrer preservation across sessions. | TC-F08-01..03 | **Done** |
| **F-09** | 3-Tier Multi-Store Voucher Stacking | Customer, Shop Manager | Stack Global + Store (`couponsByStore`) + Product vouchers with pre-checkout margin check. | TC-F09-01..03 | **Done** |
| **F-10** | Multi-Store Order Splitting & In-place Quick Login | Customer | Atomic DB order splitting per store, in-place zero-loss Quick Login Modal, transaction rollback on failure. | TC-F10-01..03 | **Done** |
| **F-11** | 6-Block Merchant Product Variant Matrix | Shop Manager, System Manager | Shopee-standard 6-block layout: basic info, media, 2-tier variant matrix (Color x Size), logistics, commission, legal. | TC-F11-01..03 | **Done** |
| **F-12** | Merchant Order Lifecycle & GHN Fulfillment | Shop Manager, Customer | GHN Sandbox parcel creation, dynamic weight/dimension fee calculation, live webhook tracking. | TC-F12-01..03 | **Done** |
| **F-13** | 14-Day Adaptive Escrow Commission Holding Ledger | Shop Manager, Collaborator, System Manager | Holds commission in escrow post-delivery for 14 days + Vietnam holidays; automated release and return clawback. | TC-F13-01..03 | **Done** |
| **F-14** | Return, Refund & Dual-Video Dispute Mediation Center | Customer, Shop Manager, System Manager | 14-day return flow, shop warehouse setup, GHN reverse pickup, 48h shop inspection SLA, dual-video arbitration. | TC-F14-01..03 | **Done** |
| **F-15** | Collaborator Sample Request & 14-Day Review SLA | Collaborator, Shop Manager, System Manager | Sample product request, quota throttling, GHN delivery tracking, 14-day review content proof SLA with System Manager arbitration. | TC-F15-01..03 | **Done** |
| **F-16** | Real-time Chat & Exclusive Deal Negotiation | Collaborator, Shop Manager | Socket.IO real-time chat, rich proposal card, bi-directional exclusive commission negotiation. | TC-F16-01..03 | **Done** |
| **F-17** | Interactive Livestream Shopping Room | Collaborator, Customer | WebRTC/HLS room, dynamic live deal pinning, real-time live voucher drop, conversion metrics. | TC-F17-01..03 | **Done** |
| **F-18** | Realtime Analytics & Leaderboard with AI Fraud | Collaborator, Shop Manager, System Manager, System Administrator | Real-time GMV/commission dashboards, gamified tier ranking, AI traffic fraud sentinel. | TC-F18-01..03 | **Done** |
| **F-19** | Concurrency-Safe Wallet Withdrawal & Payout Management | Collaborator, Shop Manager, System Manager | Automated withdrawal request with DB row-level locking, 10% PIT tax withholding, VietQR batch export, and bank bill verification. | TC-F19-01..03 | **Done** |

---

### 7. Non-Functional Requirements
| ID | Quality attribute | Metric | Threshold | Measurement method |
| :---: | :--- | :--- | :--- | :--- |
| **NFR-01** | Performance & Latency | API Response Time (p95) | <= 200 ms for catalog browsing and tracking redirection | Autocannon load test (1,000 req/s) & NestJS duration interceptor |
| **NFR-02** | Security & Password Hashing | Argon2id Hash & JWT Lifespan | Argon2id (>= 64MB memory, 3 iterations); JWT access token 15 min | Automated auth test suites (`auth-otp.spec.ts`) & OWASP ZAP scan |
| **NFR-03** | Availability & Transaction Safety | Uptime & Atomic Rollback Rate | 99.5% service uptime; 100% atomic rollback on stock exhaustion | Jest E2E order rollback simulation & `/health` endpoint monitoring |
| **NFR-04** | Frontend Web Vitals | Bundle Size & First Contentful Paint | Initial bundle <= 500 KB (brotli); FCP <= 1.2s; CLS < 0.1 | Vite build bundle visualizer & Google Lighthouse CI audit |
| **NFR-05** | Concurrency & Rate Limiting | Sliding Window Limit & Failover | 100 req/min/IP with zero crash on Redis outage (RAM fallback) | Jest unit safety tests (`jest-unit-safety.spec.ts`) & Apache Bench |
| **NFR-06** | Financial Data Auditability | Audit Log Completeness | 100% of financial, commission, and dispute movements logged | Prisma audit interceptor verification test (`audit.interceptor.spec.ts`) |

---

### 8. Ownership Map
| Member | Role | Owned parts (2–3) | Main workflow owned | Key decisions / PRs |
| :--- | :--- | :--- | :--- | :--- |
| **Nguyễn Thành Thắng (Leader)** | Fullstack Architect & Security Lead | Auth & RBAC (F-01), KYC Engine (F-02), Social Portfolios (F-03), Media Hub (F-04), Audit Sentinel (F-05) | **WF-01: User Registration, 2FA Authentication & Multi-tier KYC Approval** | PR #1 (Auth & RBAC), PR #5 (KYC Engine), Decision D2 |
| **Phan Xuân Thịnh** | Fullstack Developer & Realtime Lead | Commission Rates (F-06), Sample Request SLA (F-15), Real-time Deal Chat (F-16), Livestream Shopping Room (F-17) | **WF-02: Exclusive Deal Negotiation, In-App Chat & Live Commerce Deal Pinning** | PR #16 (Live Streaming Room), PR #27 (Chat Socket.IO), Decision D5 |
| **Nguyễn Đình Tuấn** | Backend Lead & Financial Engine Specialist | Smart Link & Dynamic QR (F-07), Last-Click Cookie (F-08), Voucher Stacking (F-09), Order Splitting & Checkout (F-10), Analytics & AI Fraud (F-18), Concurrency Payouts (F-19) | **WF-03: Multi-Channel Attribution, Quick Login Modal & VietQR Checkout; WF-05: Multi-Role Wallet Withdrawal & Payouts (Co-owner)** | PR #9 (Commission Engine), PR #12 (Voucher Stacking), Decisions D1 & D4 |
| **Nguyễn Phú Quý** | Fullstack Developer & Logistics Lead | Product Variant Matrix (F-11), Order Lifecycle & GHN (F-12), 14-Day Adaptive Escrow (F-13), Returns & Dispute Mediation (F-14) | **WF-04: GHN Logistics Fulfillment, 14-Day Adaptive Escrow & Dual-Video Return Arbitration** | PR #11 (Product Matrix), PR #14 (Return State Machine), Decision D3 |

---

## Appendix A – Defense 1.1 Targets

### A1. Main Workflows (Aligned 100% with Slide Presentation)
| ID | Workflow | Actors | Trigger | Business outcome | Features | Entity states | Owner |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **WF-01** | User Registration, 2FA Authentication & Multi-tier KYC Approval | Collaborator, Shop Manager, System Manager | Collaborator or Shop Manager registers account, verifies OTP, and submits identity dossier | Verified user account with role-based portal access, KYC verified badge, full affiliate capabilities unlocked | F-01, F-02, F-03, F-04, F-05 | User: PENDING $ightarrow$ ACTIVE; KYC: PENDING_REVIEW $ightarrow$ VERIFIED; Tier: SILVER | Nguyễn Thành Thắng |
| **WF-02** | Exclusive Deal Negotiation, In-App Chat & Live Commerce Deal Pinning | Collaborator, Shop Manager, Customer | Shop Manager publishes 10% base product; Collaborator proposes 13% VIP rate via Chat OR Shop Manager invites Collaborator; Collaborator starts live session | VIP Deal agreed, VIP Voucher Code & Smart Link issued, live session with deal pinning (+3% live bonus, e.g. 16%) | F-06, F-15, F-16, F-17 | Deal: PROPOSED $ightarrow$ AGREED; LiveSession: SCHEDULED $ightarrow$ LIVE $ightarrow$ ENDED; Pin: PINNED $ightarrow$ UNPINNED | Phan Xuân Thịnh |
| **WF-03** | Multi-Channel Attribution, Quick Login Modal & VietQR Checkout | Customer, Collaborator, Shop Manager, Payment Gateway | Customer clicks Collaborator Smart Link / QR / Live Deal, adds multi-store items, and clicks Checkout | 30-day marketing cookie recorded, 100% cart preserved during in-place login modal, instant VietQR payment verification, order PAID | F-06, F-07, F-08, F-09, F-10 | Link: ACTIVE; Cookie: SET (30d); Order: PENDING_PAYMENT $ightarrow$ PROCESSING (PAID); Cart: PRESERVED | Nguyễn Đình Tuấn |
| **WF-04** | GHN Logistics Fulfillment, 14-Day Adaptive Escrow & Dual-Video Return Arbitration | Shop Manager, Customer, GHN Logistics, System Manager | Shop Manager confirms order, creates GHN shipment parcel, delivers to Customer; Customer requests return within 14 days | GHN waybill generated, delivery completed, 14-day adaptive escrow quarantine active; if return disputed: dual-video arbitration, 100% Customer wallet refund | F-11, F-12, F-13, F-14 | Order: PROCESSING $ightarrow$ SHIPPED $ightarrow$ DELIVERED $ightarrow$ COMPLETED; Escrow: LOCKED $ightarrow$ RELEASED/CLAWED_BACK | Nguyễn Phú Quý |
| **WF-05** | Multi-Role Wallet Withdrawal, 10% PIT Tax Withholding & Concurrency Payout Settlement | Collaborator, Shop Manager, System Manager, Banking Gateway | Collaborator or Shop Manager submits withdrawal request, or month-end bonus scan calculates GMV milestone | 10% statutory PIT tax withheld, available balance locked via database row-level locking, VietQR batch exported, bank bill verified, and funds disbursed via Napas 24/7 | F-05, F-06, F-18, F-19 | Wallet: LOCKED $ightarrow$ DEBITED; Withdrawal: PENDING $ightarrow$ PROCESSING $ightarrow$ APPROVED $ightarrow$ DISBURSED; Tax: WITHHELD | Nguyễn Đình Tuấn & Nguyễn Thành Thắng |

### A2. Demo Scenarios (Aligned 100% with UAT Validation Slides)
| ID | Workflow | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **DS-01a** | WF-01 | Main | TC_KYC_01..04: Collaborator or Shop Manager registers with phone/email, verifies OTP, submits 12-digit ID with 2 photos. | 1. Register account with Email & Phone. 2. Submit 6-digit OTP. 3. Upload CCCD & Bank details. 4. System Manager audits & approves. | Account status ACTIVE; KYC badge marked VERIFIED; role portal access unlocked (TC_KYC_01..04). | Nguyễn Thành Thắng |
| **DS-01b** | WF-01 | Exception | TC_KYC_01..04: Duplicate email / weak password / >5 wrong OTP locks 15m OR blurred ID photo. | 1. Submit duplicate email. 2. Input wrong OTP 5 times. 3. System Manager clicks Reject with mandatory feedback note. | Account locked 15 mins against brute-force; KYC transitions to REJECTED; resubmission unlocked (TC_KYC_01..04). | Nguyễn Thành Thắng |
| **DS-02a** | WF-02 | Main | TC_DEAL_01..04: Shop Manager proposes 13% VIP rate via Chat; Collaborator clicks Accept; Collaborator goes LIVE and pins deal. | 1. Shop Manager selects product, proposes 13% rate in Chat. 2. Collaborator clicks Accept Deal. 3. Collaborator goes LIVE. 4. Pins deal (+3% live bonus). | VIP voucher generated; live stream active with +3% live bonus (16% total rate); summary report shown on stream end (TC_DEAL_01..04). | Phan Xuân Thịnh |
| **DS-02b** | WF-02 | Exception | TC_DEAL_01..04: Proposal rate > 25% ceiling blocked; Collaborator rejects deal (retains base 10%); live item out of stock. | 1. Input rate > 25%. 2. Collaborator clicks Reject. 3. Product stock depleted to 0 during live broadcast. | Submission blocked by 25% ceiling cap; deal canceled retaining base 10%; purchase button automatically hidden in live tray (TC_DEAL_01..04). | Phan Xuân Thịnh |
| **DS-03a** | WF-03 | Main | TC_ATTR_01..04: Collaborator generates /r/:slug smart link; Customer clicks (cookie set 30 days); adds multi-store items; checks out. | 1. Collaborator generates smart link & QR. 2. Customer clicks link. 3. Adds items from Shop A & B. 4. Quick login in-place. 5. Scans VietQR. | 30-day marketing cookie recorded; 100% cart preserved during login modal; PayOS webhook marks order PAID (TC_ATTR_01..04). | Nguyễn Đình Tuấn |
| **DS-03b** | WF-03 | Exception | TC_ATTR_01..04: Unverified KYC blocks link creation; Customer visits deleted item (404); VietQR underpaid. | 1. Unverified Collaborator attempts link creation. 2. Customer visits deleted SKU. 3. Customer underpays VietQR invoice. | Link button disabled with KYC prompt; 404 Discontinued page displayed; underpaid order remains in Pending Payment (TC_ATTR_01..04). | Nguyễn Đình Tuấn |
| **DS-04a** | WF-04 | Main | TC_FUL_01..04: Shop Manager creates GHN parcel with valid weight/dimensions; tracking code issued; parcel delivered. | 1. Shop Manager packages order. 2. Confirms weight & dimensions. 3. Calls GHN Sandbox API. 4. Delivery completed. | GHN tracking code generated (e.g., `GHN-TEST-12345`); status In Transit $ightarrow$ Delivered; 14-day adaptive escrow quarantine active (TC_FUL_01..04). | Nguyễn Phú Quý |
| **DS-04b** | WF-04 | Exception | TC_FUL_01..04: Customer submits 14-day return claim with unboxing video; Shop Manager inspection SLA 48h; System Manager arbitrates. | 1. Customer requests return with video. 2. Shop Manager rejects dispute. 3. System Manager reviews unboxing vs packaging videos. | Escrow frozen; System Manager approves Customer claim: 100% wallet refund, commission clawed back (TC_FUL_01..04). | Nguyễn Phú Quý |
| **DS-05a** | WF-05 | Main | TC_PAY_01..04: Collaborator or Shop Manager requests payout; 10% PIT tax withheld; balance locked via DB row-level lock; System Manager audits recipient bank account, uploads bank transfer bill, and dispatches via Napas 24/7. | 1. Collaborator or Shop Manager submits withdrawal request. 2. 10% PIT tax withheld and available balance locked. 3. System Manager reviews bank account details and attaches bank transfer receipt. 4. Dispatches payout via Napas 24/7. | Net amount disbursed to bank; 10% PIT tax withheld; transaction receipt attached; locked balance permanently debited (TC_PAY_01..04). | Nguyễn Đình Tuấn & Nguyễn Thành Thắng |
| **DS-05b** | WF-05 | Exception | TC_PAY_01..04: Insufficient balance (< 100k or > balance); unauthorized access; invalid bank account; bank gateway failure. | 1. Request amount > available balance. 2. Unauthorized role attempts approval. 3. Bank gateway returns transfer failure. | Submission blocked; 403 Forbidden on unauthorized audit; 100% requested funds safely restored to wallet with error logged (TC_PAY_01..04). | Nguyễn Đình Tuấn & Nguyễn Thành Thắng |

### A3. Functional Test Case Target (81 Test Cases)
| Source | Count | Minimum per item | Subtotal |
| :--- | :---: | :---: | :---: |
| **Mandatory features (from Section 6)** | 19 | 3 | 57 |
| **Main workflows (end-to-end, from A1)** | 5 | 1 | 5 |
| **State transitions of main entities (Order, Sample, KYC, Payout)** | 13 | 1 | 13 |
| **Agreed NFRs & Security suites (from Section 7)** | 6 | 1 | 6 |
| **Committed total (minimum)** | **43** | — | **81** |
| *Automated in CI* | **1,514** | — | **> 95%** (Exceeds >= 50% CI threshold) |
