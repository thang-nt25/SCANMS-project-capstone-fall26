# FR-20 — Merchant manual orders & Excel import

## Entry points

- `/app/orders`: the two buttons in the prototype open the real React forms through an origin/source-checked message bridge.
- `/merchant/orders`: the same forms are available directly in the Merchant portal.
- The surrounding prototype's commission figures and reconciliation rows remain demo data; this change does not replace FR-21's screen or implement its business logic.

## Manual orders

The native dialog supports customer name, Vietnamese phone, optional email, street address, dependent province/district/ward selectors, payment method, shipping fee, optional coupon and note. Product search filters the shop's active products, including all catalog pages. Selecting a product fills SKU and price; each row shows its calculated amount. Quantities are checked in aggregate when the same product appears on multiple rows.

The form starts with a pending order. Payment method is recorded, not confirmation of payment. Shipping is entered from an actual carrier quote; no invented shipping formula is used. Submission is locked during the request, and the same request UUID is retained on retry. Validation/API errors preserve the draft. Backend calculates the authoritative total with Prisma Decimal; frontend uses integer cents. For the example of two products at 150,000, shipping 30,000 and discount 15,000, the total is **315,000**, not 295,000.

API: `POST /api/orders/manual`. The nested `customer`, `paymentMethod`, `shippingFee`, `discountCode`, `note` and `totalAmount` fields are supported alongside the existing flat FR-20 payload used by Excel/import clients. Real product IDs must be UUIDs, not `product_123`.

Structured customer details, email, payment method and note are saved in `orders.raw_payload`; the formatted full address is saved in `shipping_address`. Shipping uses the existing `shipping_fee` column. No migration or new dependency is needed.

The backend checks current aggregate stock under product row locks in the order/items transaction. It **does not reserve/decrement inventory**: FR-20 also imports reconciliation records, and inventory reservation is a separate workflow. It does not create commissions or modify wallets, ledgers or payouts.

## Coupons

`POST /api/orders/manual/discount` verifies shop permissions and calls the existing coupon validator. Changing items, price, phone or coupon invalidates the preview and requires applying the code again. Because that validator calculates discounts against catalog prices, manual orders using a coupon must retain catalog prices; overridden prices remain allowed without a coupon.

On creation, backend validates again, locks the coupon and checks that its version/quota/budget has not changed, then writes the coupon usage, redemption and order atomically. Expired or concurrently changed coupons require a refresh. This integrates existing coupon rules; it does not implement commission attribution/calculation for manual orders.

## Shipping address catalog

The required province → district → ward hierarchy uses the explicitly versioned [Vietnam Provinces API v1](https://provinces.open-api.vn/api/v1/redoc), the legacy three-level shipping hierarchy. It is labelled as such in the form; it must not be presented as the current two-level administrative hierarchy. A deployment can override `VITE_MANUAL_ORDER_ADDRESS_API_URL` with an absolute URL returning the same structure. No customer data is sent to this provider. Network failure shows a retry action rather than a fake fallback list. Browser QA stubs only this external catalog for repeatability.

## Excel import

- `GET /api/orders/import-excel/template`: authenticated download of a real `.xlsx` template with text-formatted phone, order-code and SKU columns.
- `POST /api/orders/import-excel`: existing multipart API (`file`, optional `storeId`).
- First worksheet; `.xlsx` only; maximum 5 MB and 10,000 data rows.
- Required headers: `order_code, customer_name, customer_phone, shipping_address, sku, quantity`.
- Optional headers: `status, unit_price, discount_amount`. Shipping/payment/coupon-code fields of the manual form are not part of this existing Excel format.
- Repeat order-level details on each item row of a multi-item order. Invalid or inconsistent rows skip the entire affected order; other valid orders still import in separate transactions.
- Importing an existing order code reports duplicate row errors, without creating orders/items again. Missing/invalid products, quantities and prices produce row-specific messages. Internal database errors are sanitized, not returned as SQL details.
- UI supports file selection/drop, immediate extension/size checks, loading/submit lock, summary counts, error table with worksheet row numbers and the successfully imported order list.

## Verification

Verified on the local QA stack: backend 164 tests passed (including 37 PostgreSQL integration tests), frontend 24 tests passed with all four opt-in browser tests enabled, 11 Docker API/PostgreSQL regression groups passed, and the six existing real frontend/backend QA scenarios passed. FE/BE builds and Orders ESLint passed. Frontend lint has no errors and 10 pre-existing hook warnings outside this change; its existing large-bundle warning remains.

Run Orders unit tests and eslint in the QA backend, build both apps, run `frontend/tests/manual-order-validation.test.mjs`, and run `backend/test/fr17-fr24.docker-regression.cjs` with `QA_DOCKER=1` in the local Docker QA project. This regression explicitly rejects remote/non-test databases.

`frontend/tests/manual-orders.browser.test.mjs` is opt-in with `WITHDRAWAL_UI_TEST_URL=http://127.0.0.1:5183`, `WITHDRAWAL_UI_BROWSER_PATH` and `QA_FIXTURE_JSON` from the regression summary. It tests the prototype buttons with real local API, auth, store, catalog and PostgreSQL persistence; only external shipping addresses are stubbed. It covers required phone validation, address cascade, price auto-fill, double submission, shipping total, template download, partial import and duplicate import.

No `.css` or `.env` changes belong to this task. Do not push to `dev`; leader reviews and merges the PR from `thinh`.
