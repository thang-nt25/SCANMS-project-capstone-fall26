# Customer authentication and identity storage

## Changes

- Login and customer password changes share `AuthService.hashPassword/verifyPassword` (Argon2id and legacy bcrypt). OTP password changes use the same hashing policy.
- Login/Passport validation no longer creates `customer@scanms.vn` or `manager@scanms.vn`. Existing accounts remain unchanged. Use the explicit Capstone seeder to create demo accounts.
- Registration/reset require an issued, matching, unexpired OTP in every environment. No fixed-code bypass or `debugOtp` in API responses. Codes use `crypto.randomInt`; five wrong guesses invalidate a code. Reset claims the code before asynchronous work to stop concurrent reuse. If saving fails, request a new OTP.
- Public registration accepts only CUSTOMER/COLLABORATOR/SHOP_MANAGER, never system roles.
- `CustomerIdentity` replaces runtime JSON storage. Saving the declaration and the account name is one transaction. Failures are not reported as success. The JWT account ID determines ownership, not request body fields.
- A buyer declaration does not edit a reviewed collaborator KYC profile. The legacy `isVerified` response means a declaration was saved; `verificationMethod=SELF_DECLARED` is not identity-provider verification or permission to become a KOL/Shop.

## Safe rollout (operator action required)

No shared database migration/import/reset is performed by this change.

1. Back up the development database and `backend/data/customer-identities.json` securely, outside Git.
2. Confirm the runtime `DATABASE_URL` and CLI `DIRECT_URL` resolve to the intended database/schema. Do not paste credentials into tickets or terminal screenshots.
3. Review `prisma migrate status` and missing migration history with the team. Do not use reset or mark migrations applied blindly.
4. After approval, deploy reviewed migrations, including `20261016140000_customer_identity_storage`, before starting the new backend code. `migrate deploy` applies ALL pending migrations, not just this one.
5. Run the legacy import dry run from `backend/`:

```powershell
node -r ts-node/register scripts/import-customer-identities.ts --file data/customer-identities.json
```

This validates records and prints only the sanitized target/count. It does not connect to the database. If records are invalid, review them locally; do not upload CCCD values into logs/issues.

6. Only after target approval, import using the exact target string printed above:

```powershell
node -r ts-node/register scripts/import-customer-identities.ts --file data/customer-identities.json --apply --confirm-target '<host:port/database?schema=public>'
```

Import is transactional, refuses records without an active account, and never overwrites existing DB declarations, names or KYC profiles. Repeating it is safe. It does not delete or edit the original JSON. This development tool refuses production writes; production requires a separately reviewed PII migration/retention process.

7. Check login/old bcrypt account/password change/OTP reset and `GET/POST /api/customer/identity` using two accounts. The application no longer falls back to JSON if migration/import was missed.

The old JSON is not automatically deleted. After verifying import and agreeing on a retention policy, remove/archive it through the team's approved procedure. Do not commit it, its backups, or real identity records.

The existing `backend/data/customer-identities.json` is already tracked by Git. The new ignore rule prevents new untracked copies from being added, but cannot remove a previously tracked file/history. Coordinate its removal from version control while preserving a secure local backup; this change does not rewrite team Git history or delete that file.

## Tests

From `backend/` (use `node.exe`, `npm.cmd` or `npx.cmd` if PowerShell blocks shims):

```powershell
node node_modules/jest/bin/jest.js --runInBand src/modules/auth/tests/auth.service.spec.ts src/modules/auth/tests/auth-otp.spec.ts src/modules/customer/customer-password.spec.ts src/modules/customer/customer-identity.service.spec.ts
node node_modules/@nestjs/cli/bin/nest.js build
```

Real PostgreSQL/HTTP tests are opt-in and reject any target except the dedicated loopback test database on port 55433. They create a new schema, run actual migrations and never reset/drop existing schemas. Do not substitute the shared team's database:

```powershell
$env:IDENTITY_TEST_DATABASE_URL = 'postgresql://<test-user>:<test-password>@127.0.0.1:55433/scanms_seed_test'
node node_modules/jest/bin/jest.js --runInBand src/modules/customer/customer-identity.postgres.integration.spec.ts
```

## Verification on 16/10/2026

- 53 focused authentication/customer unit and regression cases passed.
- 11 real PostgreSQL/HTTP integration cases passed, including JWT ownership, forged user ID rejection, transaction rollback, concurrent writes, idempotent legacy import, KYC isolation and bcrypt login → Argon2 upgrade → change-password → login.
- Seeder regression re-run passed: 20 unit + 5 PostgreSQL integration cases against the new schema.
- Backend build, TypeScript no-emit check, scoped ESLint, Prisma schema validation and Git whitespace checks passed.
- Legacy import CLI dry run validated the existing file (one record), without connecting to the team's DB. No apply/import/migrate/reset/seed was run on the shared DB. At this verification checkpoint, the changes had not yet been committed/pushed.

## Remaining operational limits

- OTP caches are still process-local, as in the existing app: a restart invalidates issued codes; multiple instances need a shared Redis OTP store with atomic consume/attempt limits and request throttling. Five attempts per code is not an endpoint/IP rate limiter.
- Configure working SMTP for email verification. Development mail may use the existing console fallback; this is not proof of email delivery. API responses no longer reveal OTPs for UI auto-fill.
- Identity fields are sensitive personal data. Use restricted DB access, encrypted transport/storage/backups and a retention/deletion policy. This migration does not add field-level encryption, OCR or government identity verification.
- This is a scoped hardening change, not a complete application security audit. No existing account/session is automatically removed or revoked; review previously created demo/system accounts separately before production.

## Shared development DB rollout preflight — 16/10/2026

The user requested step 1 (backup, migration review, legacy identity import and app startup). Read-only checks used the existing project `.env`; it was not changed. CLI/runtime target the same configured Supabase endpoint/database/schema. The backup tool additionally requires the same DB username to prevent mixing tenants on a shared pooler.

Completed:

- Read-only baseline: 46 users, 65 orders, 34 financial ledger entries, 59 public tables and 57 successful migration records; no failed migrations. `customer_identities` does not exist yet.
- Created an ACL-restricted backup of the application **public schema** and the legacy identity JSON in `.dev-runtime/private-backups/2026-10-16T14-21-55-175Z/` (ignored by Git). The custom-format dump is 422,878 bytes, SHA-256 `6cc97196ddbcebb1adb2d149fa2b12da692af3b3dbd59fd250813c2226f8fb64`. `pg_restore --list` verified its archive and expected user/ledger data sections. This is archive verification, not a successful restore rehearsal. Supabase auth/storage schemas and hosted media are not included.
- Fetched `origin/dev`; its tip remains `58fc479`. No merge or source overwrite was performed.

**Blocked before migration/import/startup:** the shared DB's migration history does not match the source available on dev. Do not reset, change applied checksums, fabricate historical SQL, or mark migrations resolved just to bypass this check.

Nine applied migrations are absent locally and from the fetched dev tree:

```text
20260913020000_fr15_media_review_moderation
20260913030000_add_order_source_platform
20260913040000_secure_landing_analytics
20260913050000_add_commission_lifecycle_timestamps
20260913060000_add_review_moderation_status
20261014213000_sample_ghn_address
20261014214500_customer_saved_coupons
20261014220000_campaign_bonus_budget
20261014221500_voucher_stacking
```

There are 28 raw checksum differences; 24 match after CRLF→LF normalization. Four still differ in SQL content:

```text
20260911110000_fr10_referral_links
20260912100000_fr12_coupons_and_attribution
20260912170000_fr13_tracking_attribution_engine
20260912180000_fix_tracking_constraints_and_audit_history
```

Required handoff: the team member/lead who deployed these migrations must supply the original SQL and identify/reconcile any modified historical files, preferably on dev. Review any schema drift as well. Once source/history is reconciled, recheck pending migrations (currently only seed schema alignment and customer identity storage), rehearse restore/migration against the protected backup, then deploy the additive changes and import legacy identity data with explicit target confirmation.

No migration, identity import, seed, reset, data deletion or shared DB write was performed during this preflight. The application was not started against an unmigrated identity schema. Backup files and credentials were not added to Git.
