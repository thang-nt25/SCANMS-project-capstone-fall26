# FR-22 / FR-23 / FR-24: shop-scoped payouts, immutable ledger and VietQR batches

All routes require JWT authentication and the COLLABORATOR role:

- GET /api/wallets/me: balances, minimum withdrawal, tax policy, KYC and masked bank account.
- POST /api/wallets/withdrawals: create a pending request; body `{ "amount": "2000000.00", "storeId": "<shop UUID>" }`.
- GET /api/wallets/withdrawals?page=1&limit=10: the authenticated user's payout history.
- GET /api/wallets/me/ledger?page=1&limit=10: the authenticated user's ledger history.

Money is a decimal string, not a JavaScript floating-point number. Client-provided owner IDs, bank account overrides and payout statuses are rejected. Verified KYC and a complete bank profile remain required. MIN_PAYOUT_AMOUNT uses the existing ConfigService. Ledger pages allow at most 100 entries.

## Tax: assignment business rule, not legal advice

PayoutTaxService implements the specified rule: gross withdrawals at least 2,000,000 VND have 10% withheld; smaller withdrawals have no withholding. Tax is rounded to two decimals using Decimal ROUND_HALF_UP; net equals gross minus tax.

| Gross        | Tax        | Net          |
| ------------ | ---------- | ------------ |
| 1,999,999.99 | 0.00       | 1,999,999.99 |
| 2,000,000.00 | 200,000.00 | 1,800,000.00 |
| 2,000,000.05 | 200,000.01 | 1,800,000.04 |

The payout stores gross/tax/net snapshots in its existing columns. The wallet is debited once, by gross; tax is not a second wallet movement. API responses return decimal strings and taxCalculated. Historical FR-22 requests with default zero net are marked unknown; neither their snapshots nor old ledger entries are rewritten. The UI displays “Chưa tính thuế” / “Chưa xác định” for them.

A pending payout is not a completed bank transfer. FR-24 introduces the reviewed merchant flow below without changing the FR-23 tax formula.

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
node node_modules/jest/bin/jest.js --runInBand --testPathIgnorePatterns='real-db|redis.integration|click-rate-limit.spec|referral-links.e2e|payouts.postgres.integration'
```

From frontend/, opt-in browser tests use existing puppeteer-core, local Chrome/Edge and fully mocked APIs. Set WITHDRAWAL_UI_TEST_URL and WITHDRAWAL_UI_BROWSER_PATH, then run `node --test tests/wallet.browser.test.mjs tests/payout.browser.test.mjs`. Without them they skip. No CSS file or dependency was added.

Known pre-existing limitation: FR-09 successive partial refunds apply each refund ratio to the remaining commission, potentially under-reversing commission. FR-23 records those existing movements without silently changing that separate formula.

## FR-24: approved multi-merchant flow

Each shop pays only its own commissions. `store_wallets` holds pending/available balances per global wallet and shop; the global wallet remains the aggregate. Every new scoped movement updates both wallets and appends one ledger entry containing both global and shop before/after balances in the same transaction. Lock order is always global wallet then shop wallet. Withdrawals require enough available balance in both; another shop's earnings cannot fund a payout.

New commissions set `storeWalletTracked=true` and keep their existing 14-day approval/clawback rules. Existing order cancellation and bonus/refund writers only receive the required shop scope; unrelated formulas are not rewritten. Clawback may record an available-balance debt, as before, but withdrawal must never create one.

Legacy commission flags default to false: their approval/reversal remains in the unallocated global balance. Existing balances, ledger rows and payouts are NOT silently assigned/backfilled to a shop. The wallet UI explicitly shows unallocated amounts. Payouts with no shop or no matching scoped withdrawal ledger cannot be approved, rejected or exported. Reconcile them through a separately reviewed process, not by editing immutable history.

| Current state         | Action                                                 | Next state | Money movement                               |
| --------------------- | ------------------------------------------------------ | ---------- | -------------------------------------------- |
| PENDING, not batched  | Export Excel                                           | PROCESSING | None; gross already debited                  |
| PENDING or PROCESSING | Successful bank transfer + individual bill + reference | APPROVED   | None; never debit again                      |
| PENDING, not batched  | Reject with reason                                     | REJECTED   | Refund gross to both wallets + append ledger |

PROCESSING cannot be automatically rejected/refunded: a bank transfer might already have succeeded. No batch cancellation/retry/payment-provider integration is implemented. Bank failures require reconciliation. Separate user withdrawal requests remain separate payouts; after a timeout, refresh history before retrying.

### Merchant endpoints

All routes require JWT, SHOP_MANAGER and ownership of the active shop. Prefix: `/api/stores/:storeId/payouts`.

- `GET /?page=1&limit=10&status=PENDING`: paginated own-shop payouts and configured bill size limit.
- `PATCH /:payoutId/approve`: multipart fields `bill` and `bankRefCode`; confirmation only after a successful bank transfer.
- `PATCH /:payoutId/reject`: JSON `{ "reason": "..." }`, 1–500 characters.
- `GET /:payoutId/bill`: owner-authorized signed private download link, expires after 120 seconds, no-store.
- `POST /export-vietqr`: JSON `{ "payoutIds": ["<UUID>"] }`, 1–200 distinct IDs; returns XLSX, not a JSON envelope.
- `GET /batches?page=1&limit=10`: own-shop batch history, no workbook data included.
- `GET /batches/:batchId/download`: download the exact stored XLSX again without creating a new batch.

Payout mutations lock their row and re-check ownership/state inside the transaction. Batch exports lock selected rows in sorted UUID order, validate their funding ledger/bank/net snapshots, generate the workbook, persist its bytes, assign the batch and write audit history atomically. Concurrent exports cannot put the same payout into two batches. On interrupted downloads, reload batch history and download the existing file. The original file can contain payouts approved after export: NEVER pay the same batch again.

### Bill upload and privacy

PNG/JPEG/WebP only. MIME, extension, size and image signatures must agree; Cloudinary also decodes/validates images on upload. Uploads are authenticated/private assets, not publicly served bill URLs. Existing Cloudinary configuration/SDK is reused. A unique SHA-256 prevents reusing the identical bill for another payout; a unique `(storeId, bankRefCode)` prevents duplicate bank references. This is not proof that the bank really transferred money or protection against modified duplicate images; the shop remains responsible for reconciliation. Each payout requires its own bill/reference, not one aggregate image reused for an entire batch.

Upload happens before the locked approval transaction. Failed transactions remove only an asset confirmed by the database to be unlinked; an ambiguous commit/network result preserves the asset for reconciliation. Logs do not include tokens, raw bill data, complete account numbers or Cloudinary secrets. Avoid leaking signed links or downloaded Excel files.

### Excel contents and configuration

The workbook contains sequence, batch ID, payout ID, KOL ID, bank name/code/BIN, beneficiary account/name, gross, withheld tax, **net transfer amount**, VND currency, stable payment description and VietQR QuickLink. Account numbers remain text (including leading zeros); user-controlled values are string cells, never Excel formulas. Export rejects unknown banks, incomplete account information and non-integer/non-positive or more-than-13-digit VND net amounts instead of silently rounding money.

This is a generic payment/reconciliation workbook, NOT a universal bank-specific import template and NOT an automatic bank transfer. QuickLinks follow the [official VietQR format](https://www.vietqr.io/en/danh-sach-api/link-tao-ma-nhanh/). Opening a link sends its beneficiary details to VietQR; generating the Excel does not contact that service. Confirm bank-specific payment-file requirements before using it for real transfers.

Public examples are in `backend/.env.example`:

- `PAYOUT_MAX_BILL_BYTES`: default 5242880 (5 MiB), allowed 1024–20971520.
- `PAYOUT_BILL_FOLDER`: private asset folder, default `scanms/payouts/bills`.
- `PAYOUT_VIETQR_BASE_URL`: HTTPS image base, default `https://img.vietqr.io/image/`.
- `PAYOUT_VIETQR_TEMPLATE`: default `compact2`.
- `PAYOUT_VIETQR_BANKS`: JSON array of `{ "bin": "970436", "code": "VCB", "name": "Vietcombank", "aliases": [] }`.

The bank catalog defaults to empty: exports fail with a clear error until supported banks are configured. Review BINs/aliases against the [official bank list API](https://vietqr.io/danh-sach-api/api-danh-sach-ma-ngan-hang/); no hard-coded runtime bank list or external lookup is used. Private download links use [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media). Actual `.env` files are ignored and were not committed.

### FR-24 migration and verification

Review `prisma/migrations/20260913010000_fr24_store_payouts/migration.sql` after the FR-23 schema migration. It adds shop wallet/batch tables, scoped ledger columns, commission tracking, PROCESSING, bill/approver metadata, restrictive foreign keys and proof/state/ledger checks. Existing rows are retained with NOT VALID checks; new writes must satisfy them. Check existing `(store_id, bank_ref_code)` duplicates before deploying the unique index. All application instances must use the new scoped writers together; do not mix old/new wallet code in a rolling financial deployment.

This SQL was applied only to a disposable local PostgreSQL database. Shared Supabase was not migrated. A leader/DBA must review the deployment database's migration history and existing balances before applying it through the agreed workflow. Do not use `db push` on the shared database. Never resolve a legacy balance by rewriting a ledger.

For local integration tests, apply FR-23 and FR-24 schema to a loopback `_test` database and set `WITHDRAWAL_TEST_DATABASE_URL`; run the wallet/payout/commission command above. The merchant suite mocks private storage only; PostgreSQL transactions, row locks, rollback, JWT/ownership checks, real multipart uploads and XLSX serialization are exercised. It also covers legacy/unfunded payouts, scoped 14-day commissions/clawback, duplicate bills/references, simultaneous approvals/rejections/exports, gross refunds, immutable history and repeated byte-identical downloads. No test uses a shared database fallback.
