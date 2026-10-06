# Return fulfillment (NestJS + Prisma + PostgreSQL)

This module extends the existing order-wide return request workflow. Existing
`REQUESTED`, `SHOP_APPROVED`, `SHOP_REJECTED`, `REFUNDED`, and `CLOSED` records
remain valid; the migration is additive and snapshots their order lines.

## Reverse pickup (new customer flow)

Shop configures its return warehouse once on `/merchant/returns/:id`. The
warehouse is stored on the Shop, not entered for every return. Approved
requests receive a seven-day pickup-booking deadline once a warehouse is
available. The customer confirms pickup contact/address and actual parcel
weight/dimensions on `/customer/returns/:id`. The backend creates a new
reverse shipment from the customer to the Shop and stores its tracking code.

Local development uses `RETURN_PICKUP_PROVIDER=mock` and generates an obvious
`SIM...` tracking number; no physical courier is booked. The owning Shop can
simulate `picked` and `delivered` on the return detail page. The existing Shop
inspection, refund instruction, exchange and dispute steps then continue.
Mock mode is disabled when `NODE_ENV=production`.

For GHN Staging, set `RETURN_PICKUP_PROVIDER=staging`,
`GHN_STAGING_TOKEN`, `GHN_STAGING_SHOP_ID`, and a random
`GHN_STAGING_WEBHOOK_SECRET` in the **backend** environment only. Use a GHN
Staging account/token. In the GHN Developer Portal, register a webhook to
`POST /api/returns/webhooks/ghn-staging` with custom header
`x-scanms-ghn-secret` equal to the configured secret. A public HTTPS URL is
needed to receive callbacks while developing locally. Shop can also press
"Đồng bộ trạng thái từ GHN" to fetch a missed callback. Set
`RETURN_PICKUP_SIMULATION_ENABLED=true` only for non-production demos if GHN
Staging does not emit physical pickup events.

GHN's `/switch-status/return` endpoint is for an undelivered parcel still in
the GHN network. A customer's post-delivery return uses a **new**
`/shipping-order/create` order with customer as sender and Shop warehouse as
recipient. The Staging adapter uses stable `client_order_code = SC-R-<UUID>`
so retries do not create multiple GHN orders. Verify with the actual GHN
Staging account that it accepts the customer's address as a pickup point.

New routes (all under `/api`):

- `PATCH /returns/:id/warehouse` — owning Shop saves its return warehouse.
- `POST /returns/:id/pickup` — customer books the reverse pickup; customer ID
  comes from the authenticated session.
- `PATCH /returns/:id/pickup/simulate` — owning Shop/Admin advances demo status,
  disabled in production.
- `POST /returns/:id/pickup/sync` — owning Shop/Admin refreshes GHN Staging status.
- `POST /returns/webhooks/ghn-staging` — accepts Staging events only with the
  configured custom secret and matching GHN ShopId.

`PICKUP_BOOKED → RETURN_SHIPPED → RETURN_RECEIVED` means courier booked,
parcel collected, and parcel delivered to Shop. Staging/mock events do not
prove a physical courier visited the customer.

## Migration

Review `prisma/migrations/20261003120000_return_fulfillment/migration.sql`, back up
the target database, and verify `DIRECT_URL` points at the intended database.
From `backend/`:

```powershell
.\node_modules\.bin\prisma.cmd validate
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm.cmd run build
```

Do **not** use `prisma db push` on production. The migration is not applied
automatically by this code change.

The reverse-pickup extension also adds `20261003153000_return_pickup`.
Deploy it after `20261003120000_return_fulfillment` and only after reconciling
the shared database's migration history. The configured Supabase database
currently has migration records missing from this branch. Do not deploy new
migrations to that shared database until those files are restored.

## HTTP routes (all prefixed with `/api`)

- `GET /returns/:id` — customer, owning Shop, or admin.
- `GET /returns/shop?status=&page=` — owning Shop's queue.
- `PATCH /returns/:id/instructions` — legacy manual-shipping instructions.
- `POST /returns/:id/return-shipment` — legacy customer self-shipping with receipt; hidden from the new UI.
- `PATCH /returns/:id/return-shipment` — legacy tracking correction; automated carrier codes cannot be changed manually.
- `PATCH /returns/:id/receipt` — Shop confirms receipt.
- `PATCH /returns/:id/inspection/start` — Shop starts inspection.
- `PATCH /returns/:id/inspection/result` — Shop records `REFUND`, `EXCHANGE`, or `REJECT` with notes.
- `POST /returns/:id/exchange-shipment` — Shop sends a replacement.
- `POST /returns/:id/confirmation` — customer confirms the result.
- `POST /returns/:id/disputes` — customer opens a dispute after rejection, expiry, or refund failure.
- `GET /admin/return-disputes` and `PATCH /admin/return-disputes/:id/resolve` — admin arbitration.
- `GET /admin/return-disputes/overdue-inspections` — admin queue for cases not inspected within 48 hours of Shop receipt.

The existing `PATCH /orders/:orderId/return-request/respond` still approves or
rejects the initial request. After approval, a Shop with configured warehouse
lets the customer book pickup immediately; otherwise the Shop configures its
warehouse once. Customer and Shop order views link to
`/customer/returns/:id` and `/merchant/returns/:id`; Admin arbitration is at
`/admin/return-disputes`. Notifications deep-link to these screens.

## Local verification

From `backend/`, run:

```powershell
npm.cmd test -- --runInBand --testPathPatterns=src/modules/returns
npm.cmd run test:e2e -- --runTestsByPath test/return-shipment.e2e-spec.ts
npm.cmd run build
```

From `frontend/`, run `npm.cmd run build`. The HTTP test uses a mocked service
and does not prove persistence against a real PostgreSQL instance. To test the
full workflow, first deploy the migration to a disposable database, then create
a customer return request and use the role-specific screens.

For an isolated local PostgreSQL instance only, set `TEST_DATABASE_URL` to a
`localhost` or `127.0.0.1` URL and run:

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55432/postgres?schema=public'
npm.cmd test -- --runTestsByPath src/modules/returns/return.postgres.integration.spec.ts
npm.cmd test -- --runTestsByPath src/modules/returns/return-pickup.postgres.integration.spec.ts
```

Both tests refuse non-local URLs, create their own fixtures, and remove those
fixtures. The pickup test verifies one persisted booking, customer/shop isolation,
and the picked/delivered state transitions. The fulfillment test verifies the
refund remains `PENDING`. Do not point them at a shared local development
database unless it is intended for integration tests.

The currently configured remote database has migration records absent from
this branch's `prisma/migrations` directory. Reconcile the branch and migration
history, verify the target and backup, then run `migrate status` before any
remote `migrate deploy`. Do not use `db push` to work around this divergence.

The scheduler checks stalled inspections every ten minutes. It atomically sets
`inspectionEscalatedAt` and alerts the customer, owning Shop, and active admins
once. A customer may file a dispute from the 48-hour threshold even if the
scheduler has not run yet. This is an escalation, not an automatic refund.
Admins can inspect these cases at `/admin/return-disputes` and open the
read-only case detail. Arbitration cannot simply close a dispute when the Shop
is still holding the customer's returned item.

## Financial boundary

`Refund` is a **payment instruction**, not a successful transfer. Inspection or
admin arbitration creates `PENDING` only. This repository currently contains
PayOS checkout verification, but no verified outbound refund integration.
Consequently this module does not claim a refund succeeded, write `OrderRefund`,
or mark the order `RETURNED` until an authorized settlement adapter is added.
The adapter must verify provider evidence, enforce an idempotency key, and call
the existing commission/bonus adjustment path atomically with the ledger write.

The deadline job closes only the *return request* when the pickup booking
deadline (`shipByAt`) is exceeded;
it never cancels or deletes the original purchase order.
