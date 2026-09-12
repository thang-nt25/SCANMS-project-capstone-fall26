# FR-22: withdrawal requests

Authenticated collaborators can use:

- `GET /api/wallets/me`: available/pending balance, minimum withdrawal, KYC status and masked bank account.
- `POST /api/wallets/withdrawals`: create a `PENDING` payout request.
- `GET /api/wallets/withdrawals?page=1&limit=10`: paginated history belonging to the authenticated user.

All routes require `Authorization: Bearer <access-token>` and the `COLLABORATOR` role. The request body contains only the amount:

```json
{ "amount": "500000.00" }
```

Money is a decimal string (up to 13 integer digits and 2 fractional digits) to avoid floating-point rounding. Client-supplied collaborator IDs, bank account overrides and payout statuses are rejected. Verified KYC and a complete bank account in the collaborator profile are required.

`MIN_PAYOUT_AMOUNT` is read through the existing ConfigService; the default is `200000.00`. Malformed or non-positive configuration fails explicitly. The wallet is global, so requests do not accept a merchant ID.

## Transaction and row lock

1. Validate amount, account and bank profile.
2. Ensure the wallet exists, then execute a parameterized `SELECT id FROM wallets WHERE collaborator_id = ...::uuid FOR UPDATE`.
3. Read the locked balance and reject insufficient funds, including FR-21 clawback debt. Pending money cannot be withdrawn.
4. Subtract the amount using `Prisma.Decimal`, increment the wallet version, and create the payout request with a bank account snapshot in the same transaction.
5. Any persistence failure rolls back both changes. Competing withdrawals wait for the wallet lock and read the updated balance.

There is no new schema migration: `PayoutRequest`, its statuses and indexes already exist. The database must already have the project's schema, including the separately reviewed FR-19/FR-21 migrations.

FR-22 does not implement taxes, financial ledgers, approval/rejection, bank transfers or proof uploads. Existing tax/net columns retain their defaults and are intentionally excluded from FR-22 responses; FR-23 will populate them. FR-24 will process requests. A `PENDING` request is not a completed bank transfer.

The UI disables repeated submission while a request is running. The endpoint is not idempotent across separate requests: after a timeout, reload history before retrying, since the original transaction may have committed.

## Tests

```powershell
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='modules/(wallets|payouts)/'
```

PostgreSQL tests are skipped by default. To run concurrency, rollback and HTTP/JWT tests, provision a disposable local database whose name ends in `_test`, apply the schema to that database, and set `WITHDRAWAL_TEST_DATABASE_URL` explicitly. The tests refuse remote hosts and never fall back to `DATABASE_URL`. They create random-ID fixtures and clean up only those fixtures.

```powershell
$env:WITHDRAWAL_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55432/scanms_fr22_test'
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='modules/(wallets|payouts)/'
```
