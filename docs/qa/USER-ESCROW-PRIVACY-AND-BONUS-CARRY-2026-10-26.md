# Account privacy, escrow authorization and bonus carry-forward

## Approved fixes

1. Account enumeration and arbitrary user details are no longer public.
   - `GET /users` and `GET /users/:id` require a valid JWT and `SYSTEM_ADMIN`.
   - This follows the project role matrix: account administration is exclusive to the system admin. System managers retain their separate KYC application endpoints.
   - All authenticated roles retain `/users/me`. The authenticated ID is used, never a query-supplied user ID.
2. An unpaid bonus deduction is not silently marked fully recovered.
   - Only the amount supported by gross bonus plus positive adjustments is applied.
   - For a partial recovery, the pending row is split into its actual applied amount and a new pending remainder, keeping shop/KOL/original settlement/refund identity.
   - For zero recovery, the entire amount stays pending without duplicating the row.
   - Remaining deductions move to the next unsettled month. Overdue pending deductions are also considered when an intermediate month is skipped.
   - The total signed amount across split rows is preserved, so the previous incremental-refund fix continues to count queued plus applied deductions correctly.
   - Settlements and refunds now share one advisory transaction lock per shop/KOL, across months, before checking or mutating the ledger.
   - Settlement snapshots and audit records expose requested, applied and carried adjustment amounts and carry record IDs.
3. Per-order escrow details are private.
   - Requires a valid JWT and UUID (including seeded v5 IDs).
   - KOL: only their own commission. Shop: only orders belonging to their non-deleted shop. System admin and system manager: platform access.
   - Customers cannot read internal affiliate commission amounts. Foreign owners receive 404 without private detail.
   - The non-sensitive public escrow policy endpoint remains available.

## Verified scenarios

- Real JWT strategy and real role guards in an isolated Nest HTTP application, mocked database only: anonymous access, invalid JWT, inactive user, every account role, self-profile query spoofing, shop/KOL ownership, malformed and v5 order IDs, public policy availability.
- Actual settlement service with an isolated transaction fixture: 30,000 deduction / 10,000 current bonus carries 20,000; next month's 50,000 bonus pays 30,000.
- Zero bonus across months, exact/full recovery, multiple debts with cents, mixed positive/negative adjustments, skipping closed months, overdue debt, unrelated shop/KOL/cancelled/future debt, idempotent retry, concurrent month settlement lock simulation, no open carry month.
- Existing incremental refund and KYC authorization regression suites remain included in targeted checks.
- Concurrency tests simulate transaction locks; they do not constitute a live PostgreSQL load test.

## Operational boundaries

- No schema migration needed. No shared database identity, wallet or refund record was changed during verification.
- Already-settled historical deductions are not rewritten. Previously lost balances require separately authorized reconciliation.
- The previously deferred demo top-up endpoint remains unchanged.

## Test results

- 35 new regression tests (HTTP privacy/ownership and deduction carry-forward).
- Targeted checks including prior KYC/refund/commission regressions: 103 tests passed across 6 suites.
- Full backend unit run: 133 suites passed, 2 skipped; 1,514 tests passed, 56 skipped.
- Backend production build passed. `git diff --check` passed.
