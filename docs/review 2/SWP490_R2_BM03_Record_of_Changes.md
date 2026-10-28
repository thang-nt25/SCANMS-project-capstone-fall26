# SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM03
## Registration Form – Record of Changes

### 1. Project Information
| Field | Details |
| :--- | :--- |
| **Project code** | **FA26SE032** |
| **Project name** | **Sales Collaborator and Affiliate Network Management System (SCANMS)** |
| **Team members** | **Nguyễn Thành Thắng** (Leader - SE184251)<br>**Nguyễn Đình Tuấn** (SE182540)<br>**Nguyễn Phú Quý** (SE180104)<br>**Phan Xuân Thịnh** (SE184527) |
| **Supervisor** | **ThS. Tôn Thất Hoàng Minh** |
| **Current registration version** | Version 1.0 (Review 1 Approved Scope) |
| **Proposed version** | Version 2.0 (Review 2 Scope Realignment) |
| **Version / Date** | Version 2.0 · 29/10/2026 |

---

### 2. Changes
**Status:** ☑ **Changes to the current registration form (6 architectural realignments detailed below)**

| No. | Section | Current content | Proposed content | Reason | Proposed by |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Cover & Table 1 (Duration & Team Finalization) | Duration listed as 'from 09/2026 To 03/2027'; Table 1 contained an unassigned 5th student row. | Duration updated to 'from 07/09/2026 To 30/12/2026' (official Capstone Fall 2026 semester schedule); Table 1 finalized with exactly 4 active members (Thắng, Tuấn, Quý, Thịnh). | Realigns project timeline with the official university semester defense schedule; formalizes 4-member team structure. | Nguyễn Thành Thắng (Leader) |
| **2** | Section 3.2.a Context & Section 3.2.b Core Features #3, #6 (E-Commerce Risks & Anti-Fraud) | Generic manual risks only (manual calculation errors, scattered chat assets, inventory misalignment). | Identified critical real-world e-commerce risks: Reverse logistics commission overpayment (unprotected payouts on returned/refunded orders) and Attribution vulnerabilities / traffic fraud (cookie hijacking, bot click farming). Added Last-Click attribution with Redis sliding-window rate-limiting and AI Anti-Fraud detection. | Review 1 feedback to address real e-commerce fraud and attribution spoofing draining merchant budgets. | Nguyễn Thành Thắng & Nguyễn Đình Tuấn |
| **3** | Section 3.2.b Core Feature #2 & Section 3.2.c Product & Order (Multi-Merchant & Logistics) | Single-merchant portal with flat product catalog and synchronized external carts; no physical shipping integration. | Multi-Merchant network architecture supporting multi-tier variant matrices (Color x Size), sub-SKU inventory tracking, physical parcel dimensions/weight, and direct integration with carrier logistics APIs (Giao Hàng Nhanh - GHN Sandbox) for automated shipping fee calculation and live tracking. | Industry benchmark requirement (Shopee/TikTok Shop); necessary for realistic multi-store order splitting and delivery tracking for Council 1.1. | Nguyễn Phú Quý & Nguyễn Đình Tuấn |
| **4** | Section 3.2.b Core Feature #1 & Section 3.2.c User & Customer (5-Role RBAC & Authenticated Checkout) | 3 basic roles (System Administrator, Shop Manager, Collaborator); allowed unauthenticated guest checkout. | Expanded to 5 core roles: System Administrator, System Manager (Platform Moderator & Dispute Arbitrator), Shop Manager, Collaborator (KOL/KOC), and Customer. Enforced Strict Customer Authentication (eliminating anonymous guest checkout) with 0-loss cart preservation during login. | Required for legal auditability, order provenance, GHN recipient address verification, and customer return/refund dispute eligibility. | Nguyễn Thành Thắng |
| **5** | Section 3.2.b Core Features #4, #7 & Section 3.2.c Commission & Order (14-Day Escrow, Reverse Logistics & Tax Withholding) | Linear commission payout without quarantine (Pending -> Approved -> Reversed); manual bank file export; no return/dispute flow. | Automated 14-day Adaptive Escrow holding period matching customer return warranty window (with official Vietnam holiday offsets); automated commission clawback on returns; customer return/refund request workflow with GHN reverse pickup and System Manager dual-video escrow arbitration; database row-level locking on withdrawals; statutory 10% Personal Income Tax (PIT) withholding. | Review 1 feedback on escrow security; prevents merchant cashflow deficit and creator negative wallet overdrafts upon customer disputes. | Nguyễn Phú Quý & Nguyễn Thành Thắng |
| **6** | Section 3.2.b Core Features #5, #6 & Section 3.2.c Collaboration & AI (In-App Chat, Sample SLA, Live & AI) | Static 1-way media download; no messaging; no sample workflow; no live commerce; no AI engines. | Integrated real-time Socket.IO chat with exclusive campaign proposal cards; structured Sample Request workflow with shipping tracking and 14-day review video proof SLA; Live Commerce session deal pinning; Dual AI engines (AI Smart Matching for KOL-product synergy and AI Anti-Fraud traffic sentinel). | Expands social commerce capabilities to modern affiliate standards; fulfills advanced interactive real-time requirements for SE capstone. | Phan Xuân Thịnh & Nguyễn Phú Quý |

---

### 3. Decision at Review 2 (completed by reviewers)
| No. | Decision (Accepted / Adjusted / Rejected) | Reviewer note |
| :---: | :---: | :--- |
| **1** | *(Reviewers complete during session)* | |
| **2** | *(Reviewers complete during session)* | |
| **3** | *(Reviewers complete during session)* | |
| **4** | *(Reviewers complete during session)* | |
| **5** | *(Reviewers complete during session)* | |
| **6** | *(Reviewers complete during session)* | |
