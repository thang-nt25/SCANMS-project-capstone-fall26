# FR-22 / FR-23: withdrawals, immutable ledger and tax snapshots

All routes require JWT authentication and the COLLABORATOR role:

- GET /api/wallets/me: balances, minimum withdrawal, tax policy, KYC and masked bank account.
- POST /api/wallets/withdrawals: create a pending request; body `{ "amount": "2000000.00" }`.
- GET /api/wallets/withdrawals?page=1&limit=10: the authenticated user's payout history.
- GET /api/wallets/me/ledger?page=1&limit=10: the authenticated user's ledger history.

Money is a decimal string, not a JavaScript floating-point number. Client-provided owner IDs, bank account overrides and payout statuses are rejected. Verified KYC and a complete bank profile remain required. MIN_PAYOUT_AMOUNT uses the existing ConfigService. Ledger pages allow at most 100 entries.

## Tax: assignment business rule, not legal advice

PayoutTaxService implements the specified rule: gross withdrawals at least 2,000,000 VND have 10% withheld; smaller withdrawals have no withholding. Tax is rounded to two decimals using Decimal ROUND_HALF_UP; net equals gross minus tax.

| Gross | Tax | Net |
| --- | --- | --- |
| 1,999,999.99 | 0.00 | 1,999,999.99 |
| 2,000,000.00 | 200,000.00 | 1,800,000.00 |
| 2,000,000.05 | 200,000.01 | 1,800,000.04 |

The payout stores gross/tax/net snapshots in its existing columns. The wallet is debited once, by gross; tax is not a second wallet movement. API responses return decimal strings and taxCalculated. Historical FR-22 requests with default zero net are marked unknown; neither their snapshots nor old ledger entries are rewritten. The UI displays “Chưa tính thuế” / “Chưa xác định” for them.

A pending payout is not a completed bank transfer. Approval, rejection, bill uploads and payment batches remain FR-24; no new handlers for them are introduced here.

## Transaction and ledger invariants

1. Validate amount, account and bank profile.
2. Ensure the wallet exists and execute parameterized SELECT ... FOR UPDATE before reading its balance.
3. Reject insufficient available balance, including existing FR-21 clawback debt; pending funds cannot be withdrawn.
4. Update the balance/version, append the signed ledger entry referencing the preallocated payout UUID, and create the payout with tax/net snapshots in the same transaction.
5. Any ledger or payout failure rolls back all changes. Concurrent withdrawals wait for the lock and read the committed balance.

WalletsService centralizes every runtime wallet balance change and its ledger write. Entries include wallet, transaction type, balance bucket (PENDING / AVAILABLE), signed amount, before/after balances, reference ID/type and database-generated timestamp. Each new entry satisfies balance_after = balance_before + amount; zero changes do not create entries. Moving approved commission between buckets creates two entries in one transaction. Commission creation, approval, clawback, existing order cancellation, FR-09 bonus credits and pending refund reversals use this shared writer. Their unrelated business rules are unchanged.

FinancialLedgerService exposes only append, never update/delete. Corrections must be new compensating entries, not edits to history. A partial unique index prevents duplicate events per wallet/bucket/reference/transaction type; this is not idempotency for separate withdrawal requests. After a timeout, reload history before retrying.

## Required migration and deployment review

Review prisma/migrations/20260912200000_fr23_immutable_ledger/migration.sql before deploying to the team database. It adds the pending transaction type, bucket/reference columns, event uniqueness, a signed-balance check, mutation triggers and a restrictive wallet foreign key. It replaces the older reference/type-only unique index so paired approval entries are permitted.

Triggers reject UPDATE, DELETE and TRUNCATE. Wallet/user deletion cannot cascade away ledger history. The balance check is NOT VALID: existing records are retained, while new inserts must satisfy it. Legacy records default to AVAILABLE and may have an unknown reference type; this migration does not invent or backfill past financial history.

The migration was tested on a disposable local PostgreSQL database, not applied to shared Supabase. The deployment database must already have the reviewed FR-19/FR-21 schema; do not blindly run db push or replay all migrations against a shared database with an unverified migration history. Check duplicates before creating the new index. A DBA should apply this migration through the team's reviewed migration workflow.

Use a least-privilege production application role without table ownership/superuser privileges or permission to disable triggers. Database administrators can bypass database protections; append-only is an application/database-role guarantee, not protection against a hostile DBA.

## Verification

From backend/, ordinary wallet/payout/commission tests are safe without an external database:

```powershell
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='modules/(wallets|payouts|commissions)/'
```

The PostgreSQL suite is opt-in. Provision a disposable loopback database ending in _test, apply the baseline schema and FR-23 SQL, then run:

```powershell
$env:WITHDRAWAL_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55432/scanms_fr23_test'
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='payouts.postgres.integration'
```

Tests never fall back to DATABASE_URL and reject remote hosts. They test row-lock races, payout/ledger rollback, tax boundaries, paired commission entries, duplicate events, existing bonus/refund writers, immutable SQL operations and owner-only HTTP/JWT access. Random-ID financial fixtures remain in the disposable database; drop that dedicated database externally rather than deleting immutable rows.

Some pre-existing team integration suites connect to the configured shared database and clean up with ledger DELETE. Do not run those against a migrated/shared database. Non-external regression tests can be selected explicitly:

```powershell
node node_modules/jest/bin/jest.js --runInBand --testPathIgnorePatterns='real-db|redis.integration|referral-links.e2e|payouts.postgres.integration'
```

From frontend/, the opt-in browser test uses existing puppeteer-core, local Chrome/Edge and fully mocked APIs. Set WITHDRAWAL_UI_TEST_URL and WITHDRAWAL_UI_BROWSER_PATH, then run node --test tests/wallet.browser.test.mjs. Without them it skips. No CSS file or dependency was added.

Known pre-existing limitation: FR-09 successive partial refunds apply each refund ratio to the remaining commission, potentially under-reversing commission. FR-23 records those existing movements without silently changing that separate formula.
