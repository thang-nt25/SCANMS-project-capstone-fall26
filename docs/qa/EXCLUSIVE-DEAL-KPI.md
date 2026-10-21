# Exclusive Deal KPI and isolated demo

## Real contract

- New proposals must include integer `targetOrders` (1–1,000,000) and
  `commitmentDays` (1–366), plus the existing explicit video commitment.
- The Shop collaboration form converts each month to 30 days. Multi-product
  submission creates independent per-product deals, each with the displayed target;
  it does not claim to create a shared aggregate bundle.
- The clock starts when Shop approval successfully provisions the link and voucher.
  The collection period is followed by 14 calendar days of settlement.
- Count distinct orders created in `[start, end)`, scoped to shop, product and KOL.
  Item referral attribution takes precedence; legacy item rows without a referral
  use order-level attribution. Count only COMPLETED orders with zero refunded amount
  and completion time on/before the settlement cutoff.
- Pending, shipping, delivered and unresolved returns/disputes appear separately.
  They do not count as success. This deliberately conservative policy excludes
  partially refunded orders rather than guessing retained per-product quantities.
- The period concerns order KPI evaluation, not automatic expiry of VIP commission.
  No automatic sanction occurs. After settlement, Shop can review an unmet target,
  provide a reason and confirm termination. Old orders keep commission snapshots.
- Termination serializes changes to the KOL profile, claims closure once, pauses
  the voucher, blocks the VIP link and records chat/audit evidence in one transaction.
- A replacement Deal closes the previous commission version without a sanction.
  Closed Deals are excluded from new-order entitlement queries.
- Approved/closed contracts cannot be deleted. Legacy free-text contracts are not
  assigned fabricated targets and cannot be sanctioned through the KPI flow.
  Pending legacy proposals must be rejected and recreated with explicit KPI.

## Demo (development builds only)

In either creator proposal form expand “Thử quy trình Deal — mô phỏng riêng”.
Choose 30 seconds, 5 minutes (default), or 10 minutes and an integer order target.
The timer does not start until “Shop duyệt mô phỏng”.
Add pending orders, mark them completed or cancelled, advance to expiry and then
finish settlement. Test both ACHIEVED and REVIEW_REQUIRED.
The demo never calls a backend mutation or creates payments, commissions or penalties.
Closing the panel does not pause elapsed wall time. “Làm lại” clears its local state.

## Database rollout

Migration: `20261020150000_exclusive_deal_kpi`.
Adds six nullable columns and bounds/date constraints; preserves legacy rows.
Apply the migration before restarting the new backend.
Do not reset the shared database or deploy unrelated pending migrations.
Read-only verification: from `backend`, run `node scripts/verify-deal-kpi.cjs`.

## Verification

- Backend: policy boundaries, scopes, progress authorization, proposal/approval flow,
  sanctions gating and existing order/referral bonus tests.
- Frontend: demo clock and review transitions; production build excludes the demo UI.
- Manual: submit new KPI, switch to Shop, approve, open progress in Shop inbox and
  creator referral dashboard. Confirm pending starts only after approval and an
  early termination attempt is rejected server-side.
- Real-order and sanction scenarios must use isolated test accounts/data. The
  development demo is not an integration test of payment or fulfillment services.
