# KYC authorization and incremental refund bonus recovery

Scope: approved issues 2 and 3 only. Issue 1 (demo wallet top-up) is deferred at the user's explicit request and remains unchanged.

## KYC access

- Removed `SHOP_MANAGER` from the legacy pending-list and review endpoint roles.
- All five administrative KYC endpoints now require `SYSTEM_ADMIN` or `SYSTEM_MANAGER`.
- Customers, collaborators and shop managers cannot read the global KYC list or review another user's identity/upgrade application.
- Self-service profile access continues to use the authenticated user ID, not a query parameter.
- HTTP regression tests use the real Nest `RolesGuard` with only authentication simulated. Forbidden requests must return 403 without invoking the service.

## Refund bonus recovery

- Sum existing `PENDING` and `APPLIED` adjustments for the exact original settlement, shop and collaborator.
- New deduction = max(0, original bonus - recalculated bonus + previous signed adjustments).
- Example: original bonus 100,000; correct bonus becomes 80,000 then 70,000. New deductions are 20,000 then 10,000, totaling 30,000 rather than 50,000.
- Cancelled adjustments do not count as recovered amounts. Monetary arithmetic retains Decimal precision.
- Acquire a parameterized PostgreSQL transaction advisory lock by shop/collaborator/original month before changing the order. Different refund orders affecting the same monthly bonus share the same lock.
- Existing order row locks and refund-limit checks remain intact.
- Previously settled snapshots and adjustment records are not rewritten. Historical over-deductions require a separate reconciliation; this fix does not silently issue compensation.

## Verification

- 35 new regression tests passed across two suites.
- Full backend unit run: 131 suites passed, 2 skipped; 1,479 tests passed, 56 skipped.
- Targeted KYC and commission-rule suites: 69 tests passed across four suites after final formatting and SQL result-type review.
- Backend production build passed.
- Refund service tests cover sequential refunds, pending/applied/cancelled adjustments, exact cents, historical over-recovery, absent settlement, excess refund rejection, shared lock keys, and concurrent calls with a simulated transaction lock.
- Concurrency coverage is a mock simulation, not a live PostgreSQL contention test.
- No production identity records, refunds or wallet balances were changed. No schema migration is needed.

Commands:

```text
npm.cmd test -- --runTestsByPath src/modules/kyc/tests/kyc-authorization.spec.ts src/modules/commission-rules/tests/refund-bonus-adjustment.spec.ts
npm.cmd run build
```
