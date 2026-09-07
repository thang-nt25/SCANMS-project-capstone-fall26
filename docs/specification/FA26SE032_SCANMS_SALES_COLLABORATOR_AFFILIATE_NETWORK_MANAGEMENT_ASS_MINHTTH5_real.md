

**CAPSTONE PROJECT REGISTER**


**Class:            Duration time:  from 01/01/2026 To 30/04/2026**

**(*) Profession:** <Software Engineer>                   **Specialty**: <ES>    <IS>     <JS>

**(*) Kinds of person make registers:  **            	Lecturer                	Students


**1. Register information for supervisor (if have)**

| No. | Fullname | Phone | E-Mail | Title |
| --- | --- | --- | --- | --- |
| Supervisor | Tôn Thất Hoàng Minh | 0936668995 | MinhTTH5@fe.edu.vn |  |
| Supervisor |  |  |  |  |

**2. Register information for students (if have)**

|  | Full name | Student code | Phone | E-mail | Role in Group |
| --- | --- | --- | --- | --- | --- |
|  | Nguyễn Thành Thắng | SE184251 | 0966823637 | Thangntse184251@fpt.edu.vn | Leader |
|  | Nguyễn Đình Tuấn | SE180104 | 0787664860 | tuanndse182540@fpt.edu.vn | Member |
|  | Nguyễn Phú Quý | SE180104 | 0766824448 | Quynpse180104@fpt.edu.vn | Member |
|  | Phan Xuân Thịnh | SE184527 | 0945645753 | thinhpxse184527@fpt.edu.vn | Member |
|  | Trần Văn Nhật | SE172768 | 0949997692 | NhatTVSE172768@fpt.efu.vn | Member |


**3. Register content of Capstone Project**

**(*) 3.1. Capstone Project name:**

English: Sales Collaborator and Affiliate Network Management System

Vietnamese: Hệ thống quản lý đội ngũ cộng tác viên bán hàng và tiếp thị liên kết

Abbreviation: FA26SE032

**Context:**

Direct-to-consumer (D2C) and social commerce models are experiencing exponential growth in Vietnam. E-commerce platforms and online brands increasingly rely on a distributed network of sales collaborators (KOLs, KOCs, and affiliates) for product distribution. However, managing these networks manually introduces critical operational and business risks:
●	Financial discrepancies: Manual calculation of multi-tiered commission schemes (per-product, volume-based, or multi-level referral rates) leads to errors, settlement delays, and collaborator trust issues.
●	Performance bottlenecks: Collaborators lack real-time visual dashboards (tracking clicks, conversion rates, order statuses) to optimize their marketing campaigns, while shop managers lack data to identify high-performing partners.
●	Resource fragmentation & data leakage: Promotional materials, image assets, and product descriptions are scattered across various chat groups (Zalo, Telegram), leading to inconsistent brand messaging. Customer lists linked to collaborators are prone to duplication or leakage.
●	Inventory misalignment: Collaborators sell out-of-stock items due to the lack of real-time inventory synchronization.
Therefore, a unified digital platform that automates the entire collaborator lifecycle—from onboarding, marketing asset distribution, referral tracking, to automated commission reconciliation and secure payouts—is vital for business scaling.

**Proposed Solutions**

The proposed system is an enterprise-grade Web Portal solution designed to streamline revenue-sharing models and optimize the performance of online sales collaborator networks.

Core Features:
1.	User Identity & Access Management (IAM):
○	Strict role-based access control (RBAC) with three main roles: System Administrator, Shop Manager, and Collaborator.
○	Structured onboarding flows for verifying identity documents, tax information, and banking credentials for legal payout processing.
2.	Attribution & Tracking Engine:
○	Automated generation of encrypted affiliate links, custom promo coupon codes, and dynamic QR codes.
○	Implementation of browser cookie tracking and device fingerprinting to guarantee accurate sales attribution, persisting across a configurable attribution window.
3.	Automated Commission Configuration & Billing Engine:
○	Flexible commission rules: flat rates per product, percentage-based commissions, or performance-tiered commission rates based on monthly sales targets.
○	A financial transaction ledger tracking commission states: Pending, Approved (upon order completion and refund period expiration), and Reversed (due to returns or cancellations).
4.	Collaborator Portal (Responsive Web Interface):
○	Real-time analytics dashboard presenting clicks, successful orders, conversion rates (CR), pending commissions, and withdrawable balance.
○	Centralized digital media library for collaborators to download product photos, videos, and SEO-optimized copy for marketing.
5.	Payout & Settlement Module:
○	Automated payout requests once the balance exceeds a minimum threshold.
○	Manager-side audit workflows, automated invoice generation, and bank transfer reconciliation to prevent cashflow leakages.
6.	Enterprise Management Dashboard (Admin & Manager Portal):
○	Real-time leaderboard ranking collaborators by revenue contribution.
○	Analytics reports showing store sales performance, commission expenses, and return rates.

**Functional requirement**

User Management & Authentication:
●	Register, verify identity, and manage payout banking details.
●	Secure login using JSON Web Tokens (JWT) and role assignment.
Attribution & Tracking System:
●	Generate referral links, custom coupon codes, and QR codes associated with collaborator IDs.
●	Log click traffic and tracking parameters from various marketing channels.
Order & Sales Management:
●	Synchronize orders from online shopping carts.
●	Attribute orders to collaborators based on the Last-Click Attribution model.
●	Manage order lifecycles: Pending -> Shipping -> Delivered -> Completed (or Cancelled/Returned).
Commission & Payout Management:
●	Configure commission rules and tiered thresholds.
●	Automatically credit or debit collaborator commission balances based on real-time order updates.
●	Process payout requests and export bank transfer transaction files.
Product & Inventory Management:
●	Manage product catalogs and synchronize real-time stock levels.
●	Upload, manage, and share promotional media assets.
Reports & Analytics:
●	Provide interactive charts on sales trends, conversion rates, and revenue.
●	Generate commission payout reports and financial summaries for store managers.

**   Non-functional requirement:**

●	Security: Encrypt personal and financial details at rest and in transit. Adhere to OWASP Top 10 security standards.
●	Data Integrity: Enforce ACID transaction compliance in the database to prevent race conditions during concurrent financial balance updates.
●	Performance: Core API response times under 200ms, frontend page load times under 1.5 seconds. Implement Redis caching for product catalog queries and link click tracking.
●	Scalability: Design a modular monolithic architecture, optimized to handle thousands of concurrent collaborators and high daily order volumes.

(*) 3.2. Main proposal content (including result and product)

**Theory and practice (document):**

Students will apply comprehensive software development methodologies (Agile/Scrum). The project demonstrates advanced understanding of:
●	Backend Web Development (Node.js): Designing and developing a scalable, event-driven API service using NestJS or Express frameworks for asynchronous request handling.
●	Relational Database Management (PostgreSQL): Designing normal form relational schemas, implementing indexing strategies, and utilizing database transactions to guarantee data consistency for financial ledgers. Leveraging JSONB fields for dynamic product attribute storage.
●	Security & Financial Auditing: Implementing robust logging (audit logs), role-based middleware guards, and cryptographic security to protect financial balances.

**Products:**

1.	Management Web Portal (ReactJS/Next.js): Dashboard for store managers and system administrators to oversee affiliates, configure rules, and audit payouts.
2.	Collaborator Web Application (ReactJS/Next.js): Responsive portal optimized for mobile browsers for collaborators to register, retrieve assets, and track commissions.
3.	Backend API Service (Node.js with NestJS/Express): Powering core business logic, attribution, and database operations.
4.	Database System (PostgreSQL & Redis Cache): Secure transactional storage with caching for high-speed read operations.
5.	Detailed Project Documentation: Software Requirement Specification (SRS) and System Architecture Design (SAD) including ERD, Sequence, and Component diagrams.

**Proposed Tasks:**

●	User Requirement Specification (URS): Analyze affiliate marketing workflows, commission payouts, and user personas.
●	Software Requirement Specification (SRS): Detail functional requirements, security policies, and performance constraints.
●	System Architecture Design (SAD): Design relational database schemas (PostgreSQL ERD), system components, and sequence diagrams for commission attribution.
●	Database & API Implementation: Set up PostgreSQL database migrations, implement Node.js API services, and run automated unit tests.


4. Other comments (propose all relative things if have).


| Supervisor (If have)   (Sign and full name)  Tôn Thất Hoàng Minh | HCM, date 12/12/2025 On behalf of Registers   (Sign and full name) |
| --- | --- |


