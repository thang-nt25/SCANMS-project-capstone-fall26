# Marketplace homepage overhaul

## Components and ownership

- `MarketplacePage.tsx`: catalogue queries, wishlist state and purchase intent.
- `MarketplaceHero.tsx`: campaign/store links, keyboard arrows, pause and reduced motion.
- `FeaturedStores.tsx`: partner rail, verified status, real ratings and product counts.
- `SponsoredStores.tsx`: only confirmed and active paid placements.
- `CategoryQuickNav.tsx`: category groups and genuine price reductions.
- `LiveNowSection.tsx`: KOC avatar, live heartbeat counts and server-persisted product pin.
- `MarketplaceProductCard.tsx`: product links, explicit SKU choice and purchase actions.
- `QuickCustomerAuth.tsx`: Google/email sign-in and email-OTP customer registration.
- `MarketplaceShortcuts.tsx`: homepage navigation alongside the shared PublicHeader.
- `OrderTrackingShortcut.tsx`: forwards the selected order code/phone to the existing tracking page.

All brand surfaces use warm sand/gold. Red is reserved for LIVE and errors.
The homepage no longer maintains a second account header, a dead checkout modal,
invented tracking orders, fixed partner ratings or automatic first-shop sponsorship.

## Public API

- `GET /api/stores/marketplace` returns real approved-product counts, weighted
  approved-review ratings, actual categories and an active campaign per store.
  A store without reviews returns `rating: null`.
- `GET /api/stores/public/placements` returns confirmed, unexpired bookings
  for active and verified stores only.
- `GET /api/live-sessions/public/list` includes `viewerCount` and `pinnedProduct`.
  External streams have `viewerCount: null`.
- `POST /api/live-sessions/:id/pinned-product` accepts `{ productId }`.
  Only the assigned creator or session owner can pin a product belonging to
  an ongoing session. Existing governance data is preserved.

## Sponsored placement configuration

Operations can publish a booking after confirming payment by setting
`MARKETPLACE_SPONSORED_PLACEMENTS` in the backend environment to a JSON array:

```json
[
  {
    "storeId": "<verified store UUID>",
    "startsAt": "2026-10-17T00:00:00Z",
    "endsAt": "2026-10-24T00:00:00Z",
    "headline": "Khám phá bộ sưu tập mới",
    "paymentStatus": "CONFIRMED"
  }
]
```

This configuration records an operations-confirmed placement; it is not a payment
gateway or self-service ad purchase flow. Invalid/unpaid/future/expired bookings
are omitted. Empty configuration hides the section. Never mark an arbitrary
store as sponsored to fill an empty slot.

## Cart and authentication behavior

Guest purchase actions stage the selected SKU in the guest basket and open
a native modal dialog without route changes. Closing authentication keeps the
item. After sign-in, Add to cart opens the basket; Buy now resumes checkout for
that product without adding it a second time.

The account transition captures guest items and selection before changing
ownership. Guest and account quantities are combined once, subject to current
stock. Recovery data remains local if remote synchronization fails. Stale async
responses from a different account are ignored. An already open checkout is not
replaced when authentication changes.

OTP is used for **new customer registration** through the existing registration
API. Existing accounts sign in with Google or email/password; passwordless OTP
sign-in has not been introduced.

## Validation and manual checks

Automated:
- Frontend production build and lint.
- Backend build.
- `node --test tests/cart-merge.test.mjs` (frontend).
- Backend Jest: `sponsored-placement.config.spec.ts` and `live-product-pin.spec.ts`.

Manual checks to complete in a browser:
1. Check desktop and 320/390px layouts, keyboard banner arrows and pause.
2. Open a store card; confirm its shop ID and counts match the shop page.
3. Exercise empty/failed catalogue, partner, placement and Live responses.
4. Follow each category and clear its filter on the search page.
5. Pin a product as the host of an actual Live; confirm the homepage pin/count.
6. Stage products from two shops, cancel authentication, then sign in and verify
   quantities, SKU choices and the checkout form. Repeat with OTP registration.
