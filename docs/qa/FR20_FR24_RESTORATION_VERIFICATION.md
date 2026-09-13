# FR-20 / FR-24 restoration verification — 2026-09-13

Restored the functional FR-20 and FR-24 changes from `6fb303c` that were removed in `ad50d4d`. Working branch: `thinh`. No reset/revert of the whole commit, no force push, no push to `dev`.

The restoration preserves the newer routing (`RouteContent` / `AppRoutes`), package scripts, README, CSS and environment files. Removed agent configuration and the historical QA probe were not restored.

## Verified on the restored source

| Check | Result |
| --- | --- |
| Frontend and backend production builds | PASS |
| Backend ESLint: Orders / Payouts | 0 errors; restored files formatted to the existing Windows line-ending convention |
| Frontend lint | 0 errors, 10 existing hook-dependency warnings |
| Backend Orders / Commissions / Wallets / Payouts | 18 suites, 167 tests PASS, including 38 PostgreSQL integration tests |
| Frontend suite | 26 tests PASS, 0 skips; browser tests enabled |
| Docker API / PostgreSQL regression | 11 groups PASS |
| Live browser core API / PostgreSQL scenarios | 6 PASS; ancillary auth/store/product GETs isolated with fixtures |
| Docker migrations | 17 found; restored receipt-approval migration applied only to `scanms_fr24_test`; subsequent deploy reports no pending migrations |

The FR-20 browser test clicks the actual `/app/orders` prototype buttons and verifies modal opening, cascading addresses, phone/stock validation, duplicate-submit protection, shipping totals, template download, row-level Excel errors and duplicate import. The FR-24 browser test verifies the modal, bill validation/preview/removal, multipart POST, one approval submission, export, batch re-download and the `/app/payouts` integration.

Docker QA uses PostgreSQL 15, Redis 7, backend port 5184 and frontend port 5183 via `docker-compose.qa.yml`. It does not mount production `.env` files or use shared Supabase. Financial fixtures remain in the dedicated test database.

## Limits and deployment

- Successful private bill storage is mocked in PostgreSQL integration tests. Live Docker/browser testing verifies a handled failure when storage is unconfigured. No Cloudinary credential or real bank transfer was used.
- Deploy the restored receipt migration through the reviewed team workflow before enabling approval without a bank reference on a shared database.
- The Orders prototype's surrounding reconciliation table/KPIs and manual cron toast remain illustrative. The restored manual/Excel forms call the real backend; this restoration does not implement a new reconciliation listing API or change FR-21.
- The Docker QA database is fixture-based, not a clone of production shop accounts.
- Existing bundle-size and dependency-audit warnings were not fixed by updating unrelated dependencies.

User-facing details: [FR-20 forms](../FR20_MERCHANT_ORDER_FORMS.md) and [FR-24 forms](../FR24_MERCHANT_PAYOUT_FORMS.md).
