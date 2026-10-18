**CAPSTONE PROJECT REGISTER**

**Class:            Duration time:  from 07/09/2026 To 30/12/2026**

**(*) Profession:** <Software Engineer>                   **Specialty**: <ES>    <IS>     <JS>

**(*) Kinds of person make registers:  **            	Lecturer                	Students

**1. Register information for supervisor (if have)**

| No. | Fullname | Phone | E-Mail | Title |
| --- | --- | --- | --- | --- |
| Supervisor | Tôn Thất Hoàng Minh | 0936668995 | MinhTTH5@fe.edu.vn | Giảng viên |
| Supervisor |  |  |  |  |

**2. Register information for students (if have)**

|  | Full name | Student code | Phone | E-mail | Role in Group |
| --- | --- | --- | --- | --- | --- |
| 1 | Nguyễn Thành Thắng | SE184251 | 0966823637 | Thangntse184251@fpt.edu.vn | Leader |
| 2 | Nguyễn Đình Tuấn | SE182540 | 0787664860 | tuanndse182540@fpt.edu.vn | Member |
| 3 | Nguyễn Phú Quý | SE180104 | 0766824448 | Quynpse180104@fpt.edu.vn | Member |
| 4 | Phan Xuân Thịnh | SE184527 | 0945645753 | thinhpxse184527@fpt.edu.vn | Member |

**3. Register content of Capstone Project**

**(*) 3.1. Capstone Project name:**

English: Sales Collaborator and Affiliate Network Management System

Vietnamese: Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết

Abbreviation: FA26SE032

**Context:**

Direct-to-consumer (D2C) and social commerce models are experiencing exponential growth in Vietnam, driven by platforms like TikTok Shop and Shopee. Brands and retail merchants increasingly depend on distributed creator networks (KOLs, KOCs, and publishers) to drive product discovery and sales conversion. However, managing multi-merchant affiliate networks manually introduces critical operational, business, and security risks:
●	Financial discrepancies & settlement delays: Manual calculation of multi-tiered commission schemes across disparate product categories leads to calculation errors, settlement delays, and collaborator trust erosion.
●	Attribution vulnerabilities & traffic fraud: Lack of robust tracking mechanisms leads to attribution disputes, cookie hijacking, and bot-driven click farming that drains merchant marketing budgets without yielding genuine sales.
●	Reverse logistics & commission overpayment: Without an integrated escrow holding mechanism, merchants routinely pay out commissions for orders that are subsequently cancelled, returned, or refunded by buyers.
●	Operational fragmentation & sample mismanagement: Promotional materials, image assets, and review scripts are scattered across personal messaging groups (Zalo, Telegram). Furthermore, distributing physical sample products to creators lacks structured accountability, delivery tracking, and content proof verification.
●	Absence of unified marketplace multi-tenancy: Traditional affiliate plugins cater only to single stores rather than an enterprise multi-merchant marketplace that balances the interests of Merchants, Content Creators, Customers, and Platform Regulators.
Therefore, building a unified digital platform that automates the entire collaborator lifecycle—from onboarding, marketing asset distribution, referral tracking, to automated escrow reconciliation, creator sample fulfillment, and secure payouts—is vital for business scaling.

**Proposed Solutions**

The proposed system is an enterprise-grade Web Portal solution designed to streamline revenue-sharing models and optimize the performance of online sales collaborator networks across a multi-merchant architecture.

Core Features:
1.	User Identity & Access Management (IAM):
○	Strict role-based access control (RBAC) with five core roles: System Administrator, System Manager (Platform Moderator & Dispute Arbitrator), Shop Manager, Collaborator (KOL/KOC), and Customer.
○	Structured onboarding flows for verifying identity documents (e-KYC), tax information, and banking credentials for legal payout processing and merchant verification.
2.	Multi-Tier Product Catalog & Logistics Integration:
○	Standard e-commerce catalog supporting a multi-tier variant matrix (Color x Size), sub-SKU inventory, and physical shipping dimensions integrated with carrier logistics APIs.
○	Strict Customer Authentication (eliminating anonymous guest checkout) to ensure order provenance, address book persistence, and warranty/dispute tracking.
3.	Attribution, Dynamic Referral & Anti-Fraud Engine:
○	Automated generation of encrypted affiliate links, custom promo coupon codes, and dynamic QR codes associated with collaborator IDs.
○	Last-Click attribution engine combining encrypted cookies with Redis-backed in-memory rate limiting to thwart click-spam and bot traffic.
4.	Automated Commission Configuration, Escrow & Reverse Logistics:
○	Flexible commission rules: flat rates per product, percentage-based commissions, or performance-tiered commission rates based on monthly sales targets.
○	A financial transaction ledger with an automated escrow holding period matching customer return windows (Pending -> Approved upon return window expiration, or Reversed/Clawback due to returns/cancellations).
5.	Interactive Collaboration, Sample Fulfillment & Live Commerce:
○	Integrated real-time messaging enabling direct Merchant–KOL communication and exclusive campaign deal negotiations.
○	Structured Sample Request workflow (Request -> Approval -> Waybill Tracking -> Video Review Proof -> Completion) and Live Commerce session deal pinning.
6.	Dual AI Engines & Enterprise Management Dashboard:
○	AI Smart Matching recommending optimal KOL partners to merchants based on product category synergy and historical performance; AI Anti-Fraud detecting suspicious traffic patterns.
○	Real-time analytics dashboard presenting clicks, successful orders, conversion rates (CR), pending commissions, withdrawable balance, and collaborator leaderboards.
7.	Concurrency-Safe Payout & Tax Compliance:
○	Automated payout requests with database row-level locking to eliminate double-spending race conditions.
○	Automated statutory Personal Income Tax (PIT) withholding on qualifying withdrawals, manager audit trails, and automated batch disbursement export.

**Functional requirement**

User Management & Authentication:
●	Register, authenticate, and manage multi-role accounts (Admin, System Manager, Shop Manager, Collaborator, Customer) with secure password hashing.
●	Secure login using JSON Web Tokens (JWT Access/Refresh token rotation), 2-Factor Authentication (OTP), and multi-level e-KYC submission/audit workflows.
Attribution & Tracking System:
●	Generate encrypted referral links, custom collaborator coupon codes, and dynamic QR codes.
●	Log click traffic and tracking parameters from various marketing channels with rate-limiting (anti-click spam) and cookie-based Last-Click attribution.
Order, Reverse Logistics & Customer Management:
●	Authenticated customer checkout, address management, and shopping cart order processing.
●	Manage order lifecycles: Pending -> Shipping -> Delivered -> Completed (or Cancelled/Returned).
●	Customer return/refund request workflow, evidence upload, carrier return pickup booking, and platform manager dispute arbitration with automated wallet refund.
Commission, Escrow & Payout Management:
●	Configure commission rules (standard platform rates or custom negotiated rates) and tiered performance thresholds.
●	Escrow maturation engine holding pending commissions during return warranty windows, with automated commission clawback on returns.
●	Process payout requests with database concurrency locking, statutory tax withholding, and batch payment export.
Product, Variant & Inventory Management:
●	Manage product variant matrices, sub-SKUs, pricing, and synchronize real-time stock levels.
●	Upload, manage, and share promotional media assets in a centralized Media Hub with 1-click copy.
Creator Collaboration, Samples & Live Commerce:
●	In-app real-time chat between Shop and KOL with exclusive campaign invitation cards.
●	Structured sample product request workflow with shipping tracking numbers and review video verification.
●	Live streaming session coordination with real-time deal pinning and ended-stream state handling.
AI Engines, Reports & Analytics:
●	AI-driven KOL product matching and AI traffic fraud detection flagging suspicious conversions.
●	Provide interactive charts on sales trends, conversion rates, and revenue.
●	Generate commission payout reports, collaborator leaderboards, and immutable system Audit Logs.

**   Non-functional requirement: **

●	Security: Enforce OWASP Top 10 compliance, secure password hashing, HTTP-only SameSite cookies, JWT validation with RBAC guards, role-isolated endpoints, and encrypted storage of PII and banking data.
●	Data Integrity & Concurrency: Enforce strict ACID compliance across all transactions. Apply database row-level locking to eliminate race conditions and negative wallet balances during concurrent payout requests. Maintain an append-only immutable financial audit ledger.
●	Performance: Core REST API response latency under 200ms, frontend page load times under 1.5 seconds. Implement In-Memory caching for active product catalog queries, click tracking redirection, and distributed rate limiting.
●	Scalability: Design a modular monolithic architecture powered by NestJS, strictly decoupling domain boundaries, utilizing database connection pooling, and optimized to handle high volumes of concurrent collaborators and daily orders.

**(*) 3.2. Main proposal content (including result and product)   **

**Theory and practice (document):**

Students will apply comprehensive software development methodologies (Agile/Scrum). The project demonstrates advanced understanding of:
●	Scalable Enterprise Backend (Node.js & NestJS): Architecting a domain-driven Modular Monolith with NestJS controllers, services, guards, interceptors, custom decorators, and asynchronous WebSocket gateways for real-time communication.
●	Relational Database Design & Concurrency (PostgreSQL & Prisma ORM): Designing a normalized 3NF relational schema, leveraging indexed foreign keys, database transactions, row-level locking for financial integrity, and JSONB fields for dynamic product attribute storage.
●	In-Memory Caching & Distributed Controls (Redis): Implementing high-throughput click tracking, token management, and distributed rate limiting to neutralize DDoS and click-farming attacks.
●	Security Engineering & Financial Auditing: Implementing dual-token authentication (JWT + 2FA), cryptographic signature verification, role-based authorization guards, immutable audit trails, and automated tax withholding workflows.
●	Intelligent Analytics & Heuristics: Implementing recommendation algorithms for creator-product matchmaking and rule-based anomaly detection engines for traffic fraud mitigation.

**Products:**

1.	Administrative & Merchant Web Portal (React + Vite): Modern responsive web application for System Administrators, Platform Managers, and Merchants to supervise KYC, manage product variant matrices, arbitrate return disputes, review performance analytics, and audit batch payouts.
2.	Collaborator / Creator Workspace (React + Vite): Mobile-optimized portal for KOLs/KOCs to manage social channels, generate referral links/coupons/QRs, request sample products, chat with brands, and track escrow and withdrawable commissions.
3.	Authenticated Customer E-Commerce Experience (React + Vite): Storefront featuring dynamic product catalogs, rich video reviews, authenticated checkout, live carrier order tracking, return/refund disputes, and product reviews.
4.	Backend API Service (NestJS & Prisma): Comprehensive RESTful API service powering core business modules, WebSocket real-time gateways, escrow cron schedulers, and payment/logistics integrations.
5.	High-Performance Database & Cache Infrastructure: PostgreSQL relational database paired with Redis In-Memory cache.
6.	Complete Engineering Documentation Suite: Software Requirement Specification (SRS), System Architecture Design (SAD), Entity Relationship Diagrams (ERD), UML Component & Sequence Diagrams, API Specifications, and Test Execution Runbooks.

**Proposed Tasks:**

●	User & Business Requirement Engineering (URS/SRS): Specify detailed user personas across 5 roles, detail functional requirements, and establish business logic for escrow hold, commission clawback, and tax withholding.
●	System Architecture & Database Modeling (SAD): Construct normalized relational schemas in PostgreSQL, define finite state machines for orders, returns, sample requests, and commission states, and document API contracts.
●	Backend Core & Module Implementation: Set up NestJS modular architecture, implement database migrations and seed scripts, integrate Redis rate-limiting, build WebSocket chat gateways, and develop automated escrow cron workers.
●	Frontend Development & Design System Implementation: Build responsive interfaces using React and Vite, implementing interactive analytics dashboards and unified design tokens.
●	Integration, Security Hardening & Concurrency Verification: Integrate payment and carrier logistics sandbox environments; execute automated concurrency tests verifying row-level locks on wallet withdrawals; conduct end-to-end testing across operational business flows.

 

**4. Other comments (propose all relative things if have). **

 

 

             **Supervisor (If have) **

  **(Sign and full name) **

**Tôn Thất Hoàng Minh**

**HCM, date 12/12/2025**

**On behalf of Registers  **

**(Sign and full name) **